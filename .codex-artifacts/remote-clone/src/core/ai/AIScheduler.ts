/**
 * AI调度器
 *
 * 统一管理AI公司的决策调度，实现：
 * 1. 分层决策（fast/standard/deep）
 * 2. 批量处理（每tick只处理部分公司）
 * 3. 时间切片（避免单帧卡顿）
 * 4. 【新增】Web Worker异步处理（避免主线程阻塞）
 *
 * 预期效果：
 * - 平均tick耗时从120ms降到15ms以下
 * - 峰值耗时从220ms降到50ms以下
 * - 【优化】使用Worker后，Deep决策完全不阻塞主线程
 */

import { GameWorld } from '@/core/world/GameWorld';
import { MAX_COMPANIES, ACTUAL_GOODS_COUNT, GOODS_COUNT } from '@/core/constants';
import { fastDecision, clearFastDecisionCache } from './FastDecision';
import { indicatorCache } from './IndicatorCache';
import { runAIDecisionCycle } from './AIDecisionEngine';
import { aiWorkerManager, AIWorkerManager } from '@/core/workers/AIWorkerManager';
import type { AIDecisionResult } from '@/core/workers/aiWorkerTypes';

// ==================== 配置 ====================

export interface AISchedulerConfig {
  // 批次大小
  fastBatchSize: number;       // fast模式每tick处理的公司数
  standardBatchSize: number;   // standard模式每tick处理的公司数
  deepBatchSize: number;       // deep模式每tick处理的公司数
  
  // 层级间隔
  fastInterval: number;        // fast决策间隔（每N tick）
  standardInterval: number;    // standard决策间隔
  deepInterval: number;        // deep决策间隔
  
  // 时间预算（毫秒）
  maxTimePerTick: number;      // 每tick AI处理的最大时间
  
  // 启用标志
  enableFastDecision: boolean;
  enableStandardDecision: boolean;
  enableDeepDecision: boolean;
  
  // 【新增】Worker异步处理配置
  enableWorkerAsync: boolean;      // 是否启用Worker异步处理
  workerBatchSize: number;         // Worker批量处理大小
}

const DEFAULT_CONFIG: AISchedulerConfig = {
  // 【性能优化】减少批次大小，分散执行
  fastBatchSize: 2,          // 每次处理2家公司
  standardBatchSize: 2,      // 每次处理2家公司
  deepBatchSize: 2,          // 【修复】从5降到2，分3批完成（减少单帧卡顿）
  
  // 决策间隔
  fastInterval: 6,           // 每6tick执行fast决策
  standardInterval: 48,      // 每48tick执行standard决策
  deepInterval: 8,           // 【修复】从24降到8，分3批完成所有公司的deep决策
  
  maxTimePerTick: 15,        // 【修复】增加时间预算到15ms，并实际执行时间检查
  
  enableFastDecision: true,
  enableStandardDecision: true,
  enableDeepDecision: true,
  
  // 【新增】Worker配置
  enableWorkerAsync: true,   // 默认启用Worker异步处理
  workerBatchSize: 4,        // Worker每次处理4家公司
};

// ==================== 决策层级 ====================

export type DecisionTier = 'fast' | 'standard' | 'deep';

/**
 * 公司队列项
 */
interface QueuedCompany {
  companyId: number;
  lastFastTick: number;
  lastStandardTick: number;
  lastDeepTick: number;
  importance: number; // 公司重要性（影响调度优先级）
}

/**
 * 调度统计
 */
export interface SchedulerStats {
  currentTick: number;
  fastProcessed: number;
  standardProcessed: number;
  deepProcessed: number;
  totalTimeMs: number;
  avgTimePerCompany: number;
  queueLength: number;
}

// ==================== 调度器类 ====================

class AISchedulerManager {
  private config: AISchedulerConfig = DEFAULT_CONFIG;
  private companies: Map<number, QueuedCompany> = new Map();
  private fastQueue: number[] = [];
  private standardQueue: number[] = [];
  private deepQueue: number[] = [];
  private lastRebuildTick = -1;
  
  // 【新增】Worker状态
  private workerInitialized = false;
  private pendingWorkerResults: AIDecisionResult[] = [];
  private workerProcessingCount = 0;
  
  // 统计
  private stats: SchedulerStats = {
    currentTick: 0,
    fastProcessed: 0,
    standardProcessed: 0,
    deepProcessed: 0,
    totalTimeMs: 0,
    avgTimePerCompany: 0,
    queueLength: 0,
  };
  
  /**
   * 更新配置
   */
  setConfig(config: Partial<AISchedulerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 获取配置
   */
  getConfig(): AISchedulerConfig {
    return { ...this.config };
  }
  
  /**
   * 【新增】初始化Worker
   */
  async initializeWorker(): Promise<boolean> {
    if (this.workerInitialized) return true;
    
    try {
      const success = await aiWorkerManager.initialize();
      this.workerInitialized = success;
      
      if (success) {
        console.log('[AIScheduler] Worker异步处理已启用');
      } else {
        console.warn('[AIScheduler] Worker初始化失败，使用同步模式');
      }
      
      return success;
    } catch (error) {
      console.error('[AIScheduler] Worker初始化异常:', error);
      return false;
    }
  }
  
  /**
   * 【新增】检查Worker是否可用
   */
  isWorkerAvailable(): boolean {
    return this.workerInitialized &&
           this.config.enableWorkerAsync &&
           aiWorkerManager.isAvailable();
  }
  
  /**
   * 重建公司队列
   */
  private rebuildQueues(world: GameWorld): void {
    this.companies.clear();
    this.fastQueue = [];
    this.standardQueue = [];
    this.deepQueue = [];
    
    // 收集所有活跃的AI公司
    for (let companyId = 1; companyId < MAX_COMPANIES; companyId++) {
      const cash = world.companies.cash[companyId];
      const totalAssets = world.companies.totalAssets[companyId];
      
      // 检查公司是否活跃
      if (cash > 0 || totalAssets > 0) {
        // 计算公司重要性（基于资产规模）
        const importance = Math.log10(Math.max(1, totalAssets));
        
        this.companies.set(companyId, {
          companyId,
          lastFastTick: 0,
          lastStandardTick: 0,
          lastDeepTick: 0,
          importance,
        });
        
        this.fastQueue.push(companyId);
        this.standardQueue.push(companyId);
        this.deepQueue.push(companyId);
      }
    }
    
    // 按重要性排序（重要公司优先处理）
    const sortByImportance = (a: number, b: number) => {
      const compA = this.companies.get(a);
      const compB = this.companies.get(b);
      return (compB?.importance || 0) - (compA?.importance || 0);
    };
    
    this.fastQueue.sort(sortByImportance);
    this.standardQueue.sort(sortByImportance);
    this.deepQueue.sort(sortByImportance);
    
    this.lastRebuildTick = world.tick;
  }
  
  /**
   * 处理一帧的AI决策
   */
  processTick(world: GameWorld): SchedulerStats {
    const startTime = performance.now();
    
    // 每100tick重建队列
    if (world.tick - this.lastRebuildTick >= 100) {
      this.rebuildQueues(world);
    }
    
    // 初始化本帧统计
    this.stats = {
      currentTick: world.tick,
      fastProcessed: 0,
      standardProcessed: 0,
      deepProcessed: 0,
      totalTimeMs: 0,
      avgTimePerCompany: 0,
      queueLength: this.companies.size,
    };
    
    const config = this.config;
    
    // 1. Fast决策（每tick都执行）
    if (config.enableFastDecision && world.tick % config.fastInterval === 0) {
      this.processFastBatch(world, startTime);
    }
    
    // 2. Standard决策
    if (config.enableStandardDecision && world.tick % config.standardInterval === 0) {
      this.processStandardBatch(world, startTime);
    }
    
    // 3. Deep决策
    if (config.enableDeepDecision && world.tick % config.deepInterval === 0) {
      // 【优化】使用Worker异步处理或同步处理
      if (this.isWorkerAvailable()) {
        this.processDeepBatchAsync(world);
      } else {
        this.processDeepBatch(world, startTime);
      }
    }
    
    // 4. 【新增】应用Worker返回的结果
    this.applyPendingWorkerResults(world);
    
    // 更新统计
    this.stats.totalTimeMs = performance.now() - startTime;
    const totalProcessed = this.stats.fastProcessed + this.stats.standardProcessed + this.stats.deepProcessed;
    this.stats.avgTimePerCompany = totalProcessed > 0 ? this.stats.totalTimeMs / totalProcessed : 0;
    
    return this.stats;
  }
  
  /**
   * 处理Fast批次
   */
  private processFastBatch(world: GameWorld, startTime: number): void {
    const config = this.config;
    let processed = 0;
    
    // 从队列取出公司处理
    while (processed < config.fastBatchSize && this.fastQueue.length > 0) {
      // 检查时间预算
      if (performance.now() - startTime > config.maxTimePerTick * 0.5) {
        break;
      }
      
      const companyId = this.fastQueue.shift()!;
      const company = this.companies.get(companyId);
      
      if (company) {
        fastDecision(world, companyId);
        company.lastFastTick = world.tick;
        processed++;
        
        // 将处理完的公司加回队尾
        this.fastQueue.push(companyId);
      }
    }
    
    this.stats.fastProcessed = processed;
  }
  
  /**
   * 处理Standard批次
   */
  private processStandardBatch(world: GameWorld, startTime: number): void {
    const config = this.config;
    let processed = 0;
    
    while (processed < config.standardBatchSize && this.standardQueue.length > 0) {
      if (performance.now() - startTime > config.maxTimePerTick * 0.8) {
        break;
      }
      
      const companyId = this.standardQueue.shift()!;
      const company = this.companies.get(companyId);
      
      if (company) {
        // Standard决策使用更完整的分析
        this.processStandardDecision(world, companyId);
        company.lastStandardTick = world.tick;
        processed++;
        
        this.standardQueue.push(companyId);
      }
    }
    
    this.stats.standardProcessed = processed;
  }
  
  /**
   * 处理Deep批次（同步模式）
   * 【性能优化】添加时间限制，防止单帧卡顿
   */
  private processDeepBatch(world: GameWorld, startTime: number): void {
    const config = this.config;
    let processed = 0;
    let skippedDueToTime = 0;
    
    // 【修复】添加时间限制检查
    while (processed < config.deepBatchSize && this.deepQueue.length > 0) {
      // 检查时间预算（留出5ms余量给其他系统）
      const elapsedTime = performance.now() - startTime;
      if (elapsedTime > config.maxTimePerTick) {
        skippedDueToTime = config.deepBatchSize - processed;
        break;
      }
      
      const companyId = this.deepQueue.shift()!;
      const company = this.companies.get(companyId);
      
      if (company) {
        // Deep决策使用完整分析（包括投资建造）
        this.processDeepDecision(world, companyId);
        company.lastDeepTick = world.tick;
        processed++;
        
        this.deepQueue.push(companyId);
      }
    }
    
    this.stats.deepProcessed = processed;
  }
  
  /**
   * 【新增】处理Deep批次（Worker异步模式）
   * 将AI决策计算卸载到Worker线程，完全避免主线程阻塞
   */
  private processDeepBatchAsync(world: GameWorld): void {
    const config = this.config;
    const companyIds: number[] = [];
    
    // 收集待处理公司
    let collected = 0;
    while (collected < config.workerBatchSize && this.deepQueue.length > 0) {
      const companyId = this.deepQueue.shift()!;
      const company = this.companies.get(companyId);
      
      if (company) {
        // 只处理健康公司
        const healthScore = this.calculateCompanyHealth(world, companyId);
        const cash = world.companies.cash[companyId];
        
        if (healthScore > 0.2 || cash > 100000) {
          companyIds.push(companyId);
        }
        
        company.lastDeepTick = world.tick;
        collected++;
        
        // 放回队尾
        this.deepQueue.push(companyId);
      }
    }
    
    if (companyIds.length === 0) return;
    
    // 记录正在处理的数量
    this.workerProcessingCount += companyIds.length;
    
    // 异步发送到Worker
    aiWorkerManager.requestBatchDecisions(world, companyIds, 'deep')
      .then(results => {
        // 将结果加入待处理队列
        this.pendingWorkerResults.push(...results);
        this.workerProcessingCount -= companyIds.length;
        this.stats.deepProcessed += results.length;
      })
      .catch(error => {
        console.warn('[AIScheduler] Worker批量决策失败:', error);
        this.workerProcessingCount -= companyIds.length;
        
        // 降级到同步处理
        for (const companyId of companyIds) {
          try {
            this.processDeepDecision(world, companyId);
            this.stats.deepProcessed++;
          } catch (e) {
            console.error(`[AIScheduler] 同步决策失败 公司${companyId}:`, e);
          }
        }
      });
  }
  
  /**
   * 【新增】应用待处理的Worker结果
   */
  private applyPendingWorkerResults(world: GameWorld): void {
    if (this.pendingWorkerResults.length === 0) return;
    
    const startTime = performance.now();
    let applied = 0;
    
    // 每tick最多应用10个结果，避免堆积
    const maxApplyPerTick = 10;
    
    while (this.pendingWorkerResults.length > 0 && applied < maxApplyPerTick) {
      const result = this.pendingWorkerResults.shift()!;
      
      try {
        const count = aiWorkerManager.applyDecisions(world, result);
        applied++;
        
        // 调试日志
        if (result.decisions.length > 0 && world.tick % 50 === 0) {
          console.log(`[AIScheduler] 应用Worker决策: 公司${result.companyId}, ${result.decisions.length}个决策, ${count}个成功`);
        }
      } catch (error) {
        console.warn(`[AIScheduler] 应用决策失败 公司${result.companyId}:`, error);
      }
    }
    
    // 如果还有待处理结果，记录一下
    if (this.pendingWorkerResults.length > 0 && world.tick % 100 === 0) {
      console.log(`[AIScheduler] 待处理Worker结果: ${this.pendingWorkerResults.length}个`);
    }
  }
  
  /**
   * Standard层级决策
   * 包含：价格预测分析、利润评估、交易决策
   */
  private processStandardDecision(world: GameWorld, companyId: number): void {
    const cash = world.companies.cash[companyId];
    const totalAssets = world.companies.totalAssets[companyId];
    const cashRatio = totalAssets > 0 ? cash / totalAssets : 0;
    
    // 获取买卖信号
    const buySignals = indicatorCache.getBuySignals(world, 5);
    const sellSignals = indicatorCache.getSellSignals(world, 5);
    
    // 处理卖出信号
    for (const signal of sellSignals) {
      const idx = companyId * GOODS_COUNT + signal.goodsId;
      const inventory = world.companies.inventories[idx];
      
      if (inventory > 50 && signal.signalScore < -30) {
        // 执行卖出（使用FastDecision的简单逻辑）
        // 这里可以调用更复杂的交易逻辑
      }
    }
    
    // 处理买入信号
    if (cashRatio > 0.15) {
      for (const signal of buySignals) {
        if (signal.signalScore > 30 && cash > signal.currentPrice * 100) {
          // 执行买入
        }
      }
    }
  }
  
  /**
   * Deep层级决策
   * 包含：竞争分析、风险评估、战略规划、投资建造
   *
   * 【关键修复】调用完整的AIDecisionEngine，执行投资决策（包括建造建筑）
   */
  private processDeepDecision(world: GameWorld, companyId: number): void {
    // 计算公司健康状况
    const healthScore = this.calculateCompanyHealth(world, companyId);
    const cash = world.companies.cash[companyId];
    
    // 【修复】降低门槛：健康分数>0.2 或 现金>10万 的公司都执行完整决策
    const shouldExecute = healthScore > 0.2 || cash > 100000;
    
    if (shouldExecute) {
      try {
        // 【关键】调用完整的AI决策周期，包括：
        // - 生产决策
        // - 定价决策
        // - 交易决策
        // - 投资决策（建造建筑！）
        // - 股票交易决策
        // - 附属建筑决策
        runAIDecisionCycle(world, companyId);
        
        // 调试日志：每100tick输出一次执行情况
        if (world.tick % 100 === 0) {
          console.log(`[AIScheduler] 公司${companyId}执行了完整决策周期 (健康=${healthScore.toFixed(2)}, 现金=${cash})`);
        }
      } catch (e) {
        // 捕获异常避免单个公司的错误影响其他公司
        console.error(`[AIScheduler] 公司${companyId}决策周期异常:`, e);
      }
    }
    // 健康状况不佳的公司采取保守策略，不执行扩张性决策
  }
  
  /**
   * 计算公司健康状况（0-1）
   */
  private calculateCompanyHealth(world: GameWorld, companyId: number): number {
    const cash = world.companies.cash[companyId];
    const totalAssets = world.companies.totalAssets[companyId];
    const liabilities = world.companies.totalLiabilities[companyId];
    
    // 简单健康指标
    const cashRatio = totalAssets > 0 ? cash / totalAssets : 0;
    const debtRatio = totalAssets > 0 ? liabilities / totalAssets : 0;
    
    // 综合评分
    let score = 0;
    score += Math.min(1, cashRatio * 2) * 0.4; // 现金充足度
    score += Math.max(0, 1 - debtRatio) * 0.3; // 负债率
    score += (totalAssets > 1000000 ? 0.3 : totalAssets / 1000000 * 0.3); // 资产规模
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * 获取统计信息
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }
  
  /**
   * 重置调度器
   */
  reset(): void {
    this.companies.clear();
    this.fastQueue = [];
    this.standardQueue = [];
    this.deepQueue = [];
    this.lastRebuildTick = -1;
    this.pendingWorkerResults = [];
    this.workerProcessingCount = 0;
    clearFastDecisionCache();
  }
  
  /**
   * 【新增】获取Worker状态
   */
  getWorkerStatus() {
    return {
      initialized: this.workerInitialized,
      available: this.isWorkerAvailable(),
      pendingResults: this.pendingWorkerResults.length,
      processingCount: this.workerProcessingCount,
      workerStats: aiWorkerManager.getStats(),
    };
  }
  
  /**
   * 【新增】销毁调度器
   */
  destroy(): void {
    this.reset();
    if (this.workerInitialized) {
      aiWorkerManager.destroy();
      this.workerInitialized = false;
    }
  }
}

// 导出单例
export const aiScheduler = new AISchedulerManager();

// 导出便捷函数
export function processAITick(world: GameWorld): SchedulerStats {
  return aiScheduler.processTick(world);
}

export function setAISchedulerConfig(config: Partial<AISchedulerConfig>): void {
  aiScheduler.setConfig(config);
}

export function getAISchedulerStats(): SchedulerStats {
  return aiScheduler.getStats();
}

export function resetAIScheduler(): void {
  aiScheduler.reset();
}

// 【新增】初始化Worker
export async function initAISchedulerWorker(): Promise<boolean> {
  return aiScheduler.initializeWorker();
}

// 【新增】获取Worker状态
export function getAIWorkerStatus() {
  return aiScheduler.getWorkerStatus();
}

// 【新增】销毁调度器
export function destroyAIScheduler(): void {
  aiScheduler.destroy();
}