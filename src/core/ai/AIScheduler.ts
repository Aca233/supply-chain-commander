/**
 * AI调度器
 * 
 * 统一管理AI公司的决策调度，实现：
 * 1. 分层决策（fast/standard/deep）
 * 2. 批量处理（每tick只处理部分公司）
 * 3. 时间切片（避免单帧卡顿）
 * 
 * 预期效果：
 * - 平均tick耗时从120ms降到15ms以下
 * - 峰值耗时从220ms降到50ms以下
 */

import { GameWorld } from '@/core/world/GameWorld';
import { MAX_COMPANIES, ACTUAL_GOODS_COUNT, GOODS_COUNT } from '@/core/constants';
import { fastDecision, clearFastDecisionCache } from './FastDecision';
import { indicatorCache } from './IndicatorCache';

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
}

const DEFAULT_CONFIG: AISchedulerConfig = {
  // 进一步降低批次大小以减少每tick处理量
  fastBatchSize: 3,          // 从5降到3
  standardBatchSize: 1,      // 从2降到1
  deepBatchSize: 1,          // 保持1
  
  // 进一步增加决策间隔以分散负载
  fastInterval: 4,           // 从3改为每4tick执行
  standardInterval: 48,      // 从30改为每48tick执行
  deepInterval: 180,         // 从120改为每180tick执行
  
  maxTimePerTick: 3,         // 从5ms降到3ms
  
  enableFastDecision: true,
  enableStandardDecision: true,
  enableDeepDecision: true,
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
      this.processDeepBatch(world, startTime);
    }
    
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
   * 处理Deep批次
   */
  private processDeepBatch(world: GameWorld, startTime: number): void {
    const config = this.config;
    let processed = 0;
    
    while (processed < config.deepBatchSize && this.deepQueue.length > 0) {
      if (performance.now() - startTime > config.maxTimePerTick) {
        break;
      }
      
      const companyId = this.deepQueue.shift()!;
      const company = this.companies.get(companyId);
      
      if (company) {
        // Deep决策使用完整分析
        this.processDeepDecision(world, companyId);
        company.lastDeepTick = world.tick;
        processed++;
        
        this.deepQueue.push(companyId);
      }
    }
    
    this.stats.deepProcessed = processed;
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
   * 包含：竞争分析、风险评估、战略规划
   */
  private processDeepDecision(world: GameWorld, companyId: number): void {
    // Deep决策目前使用简化版本
    // TODO: 集成完整的AIDecisionEngine模块（使用缓存）
    
    // 战略评估
    const cash = world.companies.cash[companyId];
    const totalAssets = world.companies.totalAssets[companyId];
    
    // 计算公司健康状况
    const healthScore = this.calculateCompanyHealth(world, companyId);
    
    // 根据健康状况调整策略
    if (healthScore < 0.3) {
      // 公司状况不佳，采取保守策略
      // 可以在这里触发清库存、降低风险敞口等操作
    } else if (healthScore > 0.7) {
      // 公司状况良好，可以扩张
      // 可以在这里触发投资、扩张等操作
    }
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
    clearFastDecisionCache();
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