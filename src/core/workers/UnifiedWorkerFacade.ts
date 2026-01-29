/**
 * 统一Worker门面 (Unified Worker Facade)
 * 
 * 协调所有Worker子系统，提供统一的API接口
 * 
 * 功能:
 * 1. 自动初始化所有Worker系统
 * 2. 智能任务路由（根据任务类型分发到合适的Worker）
 * 3. 负载均衡（在多个Worker间分配任务）
 * 4. 性能监控与统计
 * 5. 优雅降级（Worker不可用时回退到主线程）
 */

import { WorkerPool, getWorkerPool, initializeWorkerPool, destroyWorkerPool } from './WorkerPool';
import { WorkerManager, workerManager } from './WorkerManager';
import { AIWorkerManager, aiWorkerManager } from './AIWorkerManager';
import { GameWorld } from '@/core/world/GameWorld';

// ==================== 类型定义 ====================

/**
 * Worker系统状态
 */
export interface WorkerSystemStatus {
  initialized: boolean;
  economyWorker: {
    available: boolean;
    busyCount: number;
    avgTaskTime: number;
  };
  aiWorker: {
    available: boolean;
    requestsSent: number;
    requestsCompleted: number;
    avgComputeTime: number;
  };
  workerPool: {
    available: boolean;
    workerCount: number;
    busyWorkers: number;
    queueLength: number;
    completedTasks: number;
    failedTasks: number;
    avgTime: number;
  };
  performance: {
    totalTasksProcessed: number;
    tasksInLastSecond: number;
    avgResponseTime: number;
    peakResponseTime: number;
    mainThreadFallbacks: number;
  };
}

/**
 * 任务优先级
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * 任务类型
 */
export type TaskType = 
  | 'price_calculation'
  | 'production_calculation'
  | 'demand_calculation'
  | 'order_matching'
  | 'ai_fast_decision'
  | 'ai_standard_decision'
  | 'ai_deep_decision'
  | 'ai_batch_decision'
  | 'price_analysis'
  | 'inventory_update';

/**
 * 任务结果
 */
export interface TaskResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
  workerType: 'pool' | 'economy' | 'ai' | 'main_thread';
}

/**
 * 性能样本
 */
interface PerformanceSample {
  timestamp: number;
  taskType: TaskType;
  executionTime: number;
  workerType: string;
  success: boolean;
}

// ==================== 统一Worker门面类 ====================

export class UnifiedWorkerFacade {
  private workerPool: WorkerPool;
  private economyWorker: WorkerManager;
  private aiWorker: AIWorkerManager;
  
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;
  
  // 性能统计
  private performanceSamples: PerformanceSample[] = [];
  private readonly MAX_SAMPLES = 1000;
  private mainThreadFallbacks = 0;
  private peakResponseTime = 0;
  
  // 任务计数
  private taskCounts = new Map<TaskType, number>();
  private lastSecondTasks = 0;
  private lastSecondTimestamp = 0;
  
  constructor() {
    this.workerPool = getWorkerPool();
    this.economyWorker = workerManager;
    this.aiWorker = aiWorkerManager;
  }
  
  /**
   * 初始化所有Worker系统
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    // 防止重复初始化
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }
  
  private async _doInitialize(): Promise<boolean> {
    const startTime = performance.now();
    let success = true;
    
    console.log('[UnifiedWorkerFacade] 开始初始化Worker系统...');
    
    try {
      // 并行初始化所有Worker系统
      const results = await Promise.allSettled([
        initializeWorkerPool(),
        this.economyWorker.initialize(),
        this.aiWorker.initialize(),
      ]);
      
      const [poolResult, economyResult, aiResult] = results;
      
      // 检查结果
      const poolSuccess = poolResult.status === 'fulfilled' && poolResult.value;
      const economySuccess = economyResult.status === 'fulfilled' && economyResult.value;
      const aiSuccess = aiResult.status === 'fulfilled' && aiResult.value;
      
      console.log(`[UnifiedWorkerFacade] 初始化结果:
        - WorkerPool: ${poolSuccess ? '✓' : '✗'}
        - EconomyWorker: ${economySuccess ? '✓' : '✗'}
        - AIWorker: ${aiSuccess ? '✓' : '✗'}
      `);
      
      // 只要有一个Worker可用，就算初始化成功
      success = poolSuccess || economySuccess || aiSuccess;
      this.initialized = success;
      
      const duration = performance.now() - startTime;
      console.log(`[UnifiedWorkerFacade] 初始化完成，耗时 ${duration.toFixed(2)}ms`);
      
      return success;
    } catch (error) {
      console.error('[UnifiedWorkerFacade] 初始化失败:', error);
      this.initialized = false;
      return false;
    }
  }
  
  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * 获取系统状态
   */
  getStatus(): WorkerSystemStatus {
    const poolStatus = this.workerPool.getStatus();
    const aiStats = this.aiWorker.getStats();
    
    // 计算最近一秒的任务数
    const now = Date.now();
    if (now - this.lastSecondTimestamp >= 1000) {
      this.lastSecondTasks = this.performanceSamples.filter(
        s => s.timestamp >= now - 1000
      ).length;
      this.lastSecondTimestamp = now;
    }
    
    // 计算平均响应时间
    const recentSamples = this.performanceSamples.slice(-100);
    const avgResponseTime = recentSamples.length > 0
      ? recentSamples.reduce((sum, s) => sum + s.executionTime, 0) / recentSamples.length
      : 0;
    
    return {
      initialized: this.initialized,
      economyWorker: {
        available: this.economyWorker.isAvailable(),
        busyCount: 0, // WorkerManager不提供此信息
        avgTaskTime: avgResponseTime,
      },
      aiWorker: {
        available: this.aiWorker.isAvailable(),
        requestsSent: aiStats.requestsSent,
        requestsCompleted: aiStats.requestsCompleted,
        avgComputeTime: aiStats.avgComputeTime,
      },
      workerPool: {
        available: poolStatus.initialized,
        workerCount: poolStatus.workerCount,
        busyWorkers: poolStatus.busyWorkers,
        queueLength: poolStatus.queueLength,
        completedTasks: poolStatus.stats.completedTasks,
        failedTasks: poolStatus.stats.failedTasks,
        avgTime: poolStatus.stats.avgTime,
      },
      performance: {
        totalTasksProcessed: this.performanceSamples.length,
        tasksInLastSecond: this.lastSecondTasks,
        avgResponseTime,
        peakResponseTime: this.peakResponseTime,
        mainThreadFallbacks: this.mainThreadFallbacks,
      },
    };
  }
  
  /**
   * 记录性能样本
   */
  private recordSample(
    taskType: TaskType,
    executionTime: number,
    workerType: string,
    success: boolean
  ): void {
    const sample: PerformanceSample = {
      timestamp: Date.now(),
      taskType,
      executionTime,
      workerType,
      success,
    };
    
    this.performanceSamples.push(sample);
    
    // 限制样本数量
    if (this.performanceSamples.length > this.MAX_SAMPLES) {
      this.performanceSamples = this.performanceSamples.slice(-this.MAX_SAMPLES);
    }
    
    // 更新峰值
    if (executionTime > this.peakResponseTime) {
      this.peakResponseTime = executionTime;
    }
    
    // 更新任务计数
    const count = this.taskCounts.get(taskType) || 0;
    this.taskCounts.set(taskType, count + 1);
  }
  
  // ==================== 价格计算 ====================
  
  /**
   * 计算价格均衡
   */
  async calculatePrices(
    supplies: Float32Array,
    demands: Float32Array,
    currentPrices: Float32Array,
    basePrices: Float32Array,
    count: number
  ): Promise<TaskResult<Float32Array>> {
    const startTime = performance.now();
    
    try {
      // 优先使用WorkerPool（支持并行）
      if (this.workerPool.isAvailable()) {
        const result = await this.workerPool.sendTask<Float32Array>('CALCULATE_PRICES', {
          supplies: new Float32Array(supplies),
          demands: new Float32Array(demands),
          currentPrices: new Float32Array(currentPrices),
          basePrices: new Float32Array(basePrices),
          count,
        });
        
        const executionTime = performance.now() - startTime;
        this.recordSample('price_calculation', executionTime, 'pool', true);
        
        return {
          success: true,
          data: result,
          executionTime,
          workerType: 'pool',
        };
      }
      
      // 回退到EconomyWorker
      if (this.economyWorker.isAvailable()) {
        const result = await this.economyWorker.calculatePrices(
          supplies, demands, currentPrices, basePrices, count
        );
        
        const executionTime = performance.now() - startTime;
        this.recordSample('price_calculation', executionTime, 'economy', true);
        
        return {
          success: true,
          data: result,
          executionTime,
          workerType: 'economy',
        };
      }
      
      // 主线程回退
      this.mainThreadFallbacks++;
      const result = this.calculatePricesMainThread(supplies, demands, currentPrices, basePrices, count);
      const executionTime = performance.now() - startTime;
      this.recordSample('price_calculation', executionTime, 'main_thread', true);
      
      return {
        success: true,
        data: result,
        executionTime,
        workerType: 'main_thread',
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordSample('price_calculation', executionTime, 'error', false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        workerType: 'main_thread',
      };
    }
  }
  
  /**
   * 主线程价格计算（回退）
   */
  private calculatePricesMainThread(
    supplies: Float32Array,
    demands: Float32Array,
    currentPrices: Float32Array,
    basePrices: Float32Array,
    count: number
  ): Float32Array {
    const newPrices = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const supply = supplies[i] || 1;
      const demand = demands[i] || 1;
      const basePrice = basePrices[i] || 100;
      const currentPrice = currentPrices[i] || basePrice;
      
      const ratio = demand / supply;
      let adjustment = 0;
      
      if (ratio > 1.05) {
        adjustment = Math.min(0.05, (ratio - 1) * 0.1);
      } else if (ratio < 0.95) {
        adjustment = Math.max(-0.05, (ratio - 1) * 0.1);
      }
      
      const priceRatio = currentPrice / basePrice;
      const meanReversion = (1 - priceRatio) * 0.002;
      
      let newPrice = currentPrice * (1 + adjustment + meanReversion);
      newPrice = Math.max(basePrice * 0.2, Math.min(basePrice * 5, newPrice));
      
      newPrices[i] = newPrice;
    }
    
    return newPrices;
  }
  
  // ==================== AI决策 ====================
  
  /**
   * 请求AI决策（自动选择合适的决策层级）
   */
  async requestAIDecision(
    world: GameWorld,
    companyId: number,
    tier: 'fast' | 'standard' | 'deep' = 'standard'
  ): Promise<TaskResult<import('./aiWorkerTypes').AIDecisionResult>> {
    const startTime = performance.now();
    const taskType: TaskType = `ai_${tier}_decision` as TaskType;
    
    try {
      if (this.aiWorker.isAvailable()) {
        const result = await this.aiWorker.requestDecision(world, companyId, tier);
        
        const executionTime = performance.now() - startTime;
        this.recordSample(taskType, executionTime, 'ai', true);
        
        return {
          success: true,
          data: result,
          executionTime,
          workerType: 'ai',
        };
      }
      
      // AI Worker不可用，无法回退
      this.mainThreadFallbacks++;
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        error: 'AI Worker不可用',
        executionTime,
        workerType: 'main_thread',
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordSample(taskType, executionTime, 'error', false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        workerType: 'main_thread',
      };
    }
  }
  
  /**
   * 批量AI决策
   */
  async requestBatchAIDecisions(
    world: GameWorld,
    companyIds: number[],
    tier: 'fast' | 'standard' | 'deep' = 'standard'
  ): Promise<TaskResult<import('./aiWorkerTypes').AIDecisionResult[]>> {
    const startTime = performance.now();
    
    try {
      if (this.aiWorker.isAvailable()) {
        const results = await this.aiWorker.requestBatchDecisions(world, companyIds, tier);
        
        const executionTime = performance.now() - startTime;
        this.recordSample('ai_batch_decision', executionTime, 'ai', true);
        
        return {
          success: true,
          data: results,
          executionTime,
          workerType: 'ai',
        };
      }
      
      this.mainThreadFallbacks++;
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        error: 'AI Worker不可用',
        executionTime,
        workerType: 'main_thread',
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordSample('ai_batch_decision', executionTime, 'error', false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        workerType: 'main_thread',
      };
    }
  }
  
  // ==================== 订单撮合 ====================
  
  /**
   * 订单撮合（范围分割并行处理）
   */
  async matchOrders(params: {
    buyPrices: Float32Array;
    buyQuantities: Float32Array;
    buyCompanies: Uint16Array;
    buyActive: Uint8Array;
    sellPrices: Float32Array;
    sellQuantities: Float32Array;
    sellCompanies: Uint16Array;
    sellActive: Uint8Array;
    goodsCount: number;
    orderGoodsIds: Uint8Array;
  }): Promise<TaskResult<any[]>> {
    const startTime = performance.now();
    
    try {
      if (this.workerPool.isAvailable()) {
        // 使用范围分割并行处理
        const result = await this.workerPool.executeRanged<any>(
          'MATCH_ORDERS',
          params.goodsCount,
          (start, end) => ({
            ...params,
            goodsStart: start,
            goodsEnd: end,
          })
        );
        
        const executionTime = performance.now() - startTime;
        this.recordSample('order_matching', executionTime, 'pool', true);
        
        // 合并所有Worker的结果
        const allMatches = result.results.flat();
        
        return {
          success: true,
          data: allMatches,
          executionTime,
          workerType: 'pool',
        };
      }
      
      // 回退到单Worker
      this.mainThreadFallbacks++;
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        error: 'Worker Pool不可用',
        executionTime,
        workerType: 'main_thread',
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordSample('order_matching', executionTime, 'error', false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        workerType: 'main_thread',
      };
    }
  }
  
  // ==================== 批量更新 ====================
  
  /**
   * 批量更新（价格+生产）
   */
  async batchUpdate(params: {
    supplies: Float32Array;
    demands: Float32Array;
    currentPrices: Float32Array;
    basePrices: Float32Array;
    goodsCount: number;
    buildingCount: number;
    efficiencies: Float32Array;
    recipeOutputs: Uint8Array;
    recipeAmounts: Float32Array;
  }): Promise<TaskResult<{ prices: Float32Array; production: Float32Array }>> {
    const startTime = performance.now();
    
    try {
      if (this.economyWorker.isAvailable()) {
        const result = await this.economyWorker.batchUpdate(params);
        
        const executionTime = performance.now() - startTime;
        this.recordSample('production_calculation', executionTime, 'economy', true);
        
        return {
          success: true,
          data: result,
          executionTime,
          workerType: 'economy',
        };
      }
      
      if (this.workerPool.isAvailable()) {
        const result = await this.workerPool.sendTask<{ prices: Float32Array; production: Float32Array }>(
          'BATCH_UPDATE',
          params
        );
        
        const executionTime = performance.now() - startTime;
        this.recordSample('production_calculation', executionTime, 'pool', true);
        
        return {
          success: true,
          data: result,
          executionTime,
          workerType: 'pool',
        };
      }
      
      this.mainThreadFallbacks++;
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        error: 'Worker不可用',
        executionTime,
        workerType: 'main_thread',
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordSample('production_calculation', executionTime, 'error', false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        workerType: 'main_thread',
      };
    }
  }
  
  // ==================== 工具方法 ====================
  
  /**
   * 获取任务统计
   */
  getTaskStats(): Map<TaskType, number> {
    return new Map(this.taskCounts);
  }
  
  /**
   * 获取最近的性能样本
   */
  getRecentSamples(count: number = 50): PerformanceSample[] {
    return this.performanceSamples.slice(-count);
  }
  
  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.performanceSamples = [];
    this.taskCounts.clear();
    this.mainThreadFallbacks = 0;
    this.peakResponseTime = 0;
    this.lastSecondTasks = 0;
  }
  
  /**
   * 销毁所有Worker
   */
  destroy(): void {
    destroyWorkerPool();
    this.economyWorker.destroy();
    this.aiWorker.destroy();
    
    this.initialized = false;
    this.initPromise = null;
    
    console.log('[UnifiedWorkerFacade] 所有Worker已销毁');
  }
}

// ==================== 单例导出 ====================

let unifiedWorkerFacade: UnifiedWorkerFacade | null = null;

/**
 * 获取统一Worker门面实例
 */
export function getUnifiedWorkerFacade(): UnifiedWorkerFacade {
  if (!unifiedWorkerFacade) {
    unifiedWorkerFacade = new UnifiedWorkerFacade();
  }
  return unifiedWorkerFacade;
}

/**
 * 初始化统一Worker门面
 */
export async function initializeUnifiedWorkerFacade(): Promise<boolean> {
  const facade = getUnifiedWorkerFacade();
  return facade.initialize();
}

/**
 * 销毁统一Worker门面
 */
export function destroyUnifiedWorkerFacade(): void {
  if (unifiedWorkerFacade) {
    unifiedWorkerFacade.destroy();
    unifiedWorkerFacade = null;
  }
}

export default UnifiedWorkerFacade;