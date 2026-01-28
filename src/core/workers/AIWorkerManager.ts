/**
 * AI Worker管理器
 *
 * 管理AI Worker实例，处理主线程与Worker之间的通信
 * 负责序列化GameWorld数据，发送到Worker，并应用返回的决策
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, MAX_COMPANIES } from '@/core/constants';
import { createBuyOrder, createSellOrder, cancelOrder } from '@/core/market/OrderBook';
// 注意：建造系统直接操作 GameWorld.construction，不使用 ConstructionManager
import type {
  AIWorkerMessage,
  AIWorkerResponse,
  AIDecisionRequest,
  AIDecisionResult,
  AIDecisionDTO,
  CompanyStateDTO,
  MarketStateDTO,
  AIBatchRequest,
} from './aiWorkerTypes';

// ==================== 类型定义 ====================

interface PendingRequest {
  resolve: (value: AIDecisionResult | AIDecisionResult[]) => void;
  reject: (reason: any) => void;
  timeout: ReturnType<typeof setTimeout>;
  startTime: number;
}

interface WorkerStats {
  requestsSent: number;
  requestsCompleted: number;
  requestsFailed: number;
  totalComputeTime: number;
  avgComputeTime: number;
  lastError?: string;
}

// ==================== AI Worker管理器类 ====================

export class AIWorkerManager {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  
  private isSupported: boolean;
  private readonly TIMEOUT_MS = 10000; // 10秒超时
  
  private stats: WorkerStats = {
    requestsSent: 0,
    requestsCompleted: 0,
    requestsFailed: 0,
    totalComputeTime: 0,
    avgComputeTime: 0,
  };
  
  // 市场数据缓存（避免重复序列化）
  private lastMarketSerializeTick = -1;
  private cachedMarketDTO: MarketStateDTO | null = null;
  
  constructor() {
    this.isSupported = typeof Worker !== 'undefined';
  }
  
  /**
   * 初始化Worker
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[AIWorkerManager] Web Workers不支持，使用主线程模式');
      return false;
    }
    
    try {
      // 使用Vite的Worker导入方式
      this.worker = new Worker(
        new URL('./aiWorker.ts', import.meta.url),
        { type: 'module' }
      );
      
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
      
      // 发送初始化消息
      const success = await this.sendMessage<boolean>('AI_INIT', {});
      
      if (success) {
        console.log('[AIWorkerManager] AI Worker初始化成功');
      }
      
      return success;
    } catch (error) {
      console.error('[AIWorkerManager] Worker初始化失败:', error);
      this.worker = null;
      return false;
    }
  }
  
  /**
   * 处理Worker响应
   */
  private handleMessage(e: MessageEvent<AIWorkerResponse>): void {
    const { id, result, duration, success, error } = e.data;
    
    const pending = this.pendingRequests.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(id);
      
      if (success) {
        pending.resolve(result as AIDecisionResult | AIDecisionResult[]);
        this.stats.requestsCompleted++;
        this.stats.totalComputeTime += duration;
        this.stats.avgComputeTime = this.stats.totalComputeTime / this.stats.requestsCompleted;
      } else {
        pending.reject(new Error(error || 'Worker请求失败'));
        this.stats.requestsFailed++;
        this.stats.lastError = error;
      }
      
      // 性能监控
      if (duration > 50) {
        console.debug(`[AIWorkerManager] 请求${id}耗时${duration.toFixed(2)}ms`);
      }
    }
  }
  
  /**
   * 处理Worker错误
   */
  private handleError(error: ErrorEvent): void {
    console.error('[AIWorkerManager] Worker错误:', error);
    this.stats.lastError = error.message;
    
    // 拒绝所有待处理的请求
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.stats.requestsFailed++;
    }
    this.pendingRequests.clear();
  }
  
  /**
   * 发送消息到Worker
   */
  private sendMessage<T>(type: AIWorkerMessage['type'], payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker未初始化'));
        return;
      }
      
      const id = ++this.messageId;
      const startTime = performance.now();
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        this.stats.requestsFailed++;
        reject(new Error(`Worker请求超时 (id=${id})`));
      }, this.TIMEOUT_MS);
      
      this.pendingRequests.set(id, {
        resolve: resolve as any,
        reject,
        timeout,
        startTime,
      });
      
      this.stats.requestsSent++;
      
      const message: AIWorkerMessage = { type, payload, id };
      this.worker.postMessage(message);
    });
  }
  
  /**
   * 检查Worker是否可用
   */
  isAvailable(): boolean {
    return this.worker !== null;
  }
  
  /**
   * 获取统计信息
   */
  getStats(): WorkerStats {
    return { ...this.stats };
  }
  
  // ==================== 序列化方法 ====================
  
  /**
   * 序列化公司数据
   */
  serializeCompany(world: GameWorld, companyId: number): CompanyStateDTO {
    const companies = world.companies;
    
    // 收集库存
    const inventories = new Map<number, number>();
    for (let i = 0; i < GOODS_COUNT; i++) {
      const qty = companies.inventories[companyId * GOODS_COUNT + i];
      if (qty > 0) {
        inventories.set(i, qty);
      }
    }
    
    // 收集建筑
    const buildings: CompanyStateDTO['buildings'] = [];
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === companyId) {
        buildings.push({
          id: i,
          typeId: world.buildings.types[i],
          recipeId: world.buildings.recipeIds[i],
          isActive: world.buildings.isActive[i] === 1,
          efficiency: world.buildings.efficiencies[i],
          level: world.buildings.levels[i],
        });
      }
    }
    
    // 收集活跃订单
    const activeOrders: CompanyStateDTO['activeOrders'] = [];
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i] &&
          world.orders.companyIds[i] === companyId &&
          world.orders.remainings[i] > 0) {
        activeOrders.push({
          id: i,
          goodsId: world.orders.goodsIds[i],
          isBuy: world.orders.types[i] === 0,
          price: world.orders.prices[i],
          quantity: world.orders.quantities[i],
          remainingQuantity: world.orders.remainings[i],
        });
      }
    }
    
    return {
      id: companyId,
      name: companies.names[companyId],
      cash: companies.cash[companyId],
      totalAssets: companies.totalAssets[companyId],
      totalLiabilities: companies.totalLiabilities[companyId],
      inventories,
      buildings,
      activeOrders,
    };
  }
  
  /**
   * 序列化市场数据
   */
  serializeMarket(world: GameWorld): MarketStateDTO {
    // 使用缓存避免重复序列化
    if (this.cachedMarketDTO && this.lastMarketSerializeTick === world.tick) {
      return this.cachedMarketDTO;
    }
    
    const goods: MarketStateDTO['goods'] = [];
    for (let i = 0; i < world.goods.count; i++) {
      // 计算简单波动率（基于价格历史）
      const baseValue = world.goods.baseValues[i] || 100;
      const priceRatio = world.goods.prices[i] / baseValue;
      const volatility = Math.abs(priceRatio - 1);
      
      goods.push({
        id: i,
        name: world.goods.names[i],
        price: world.goods.prices[i],
        basePrice: baseValue,
        supply: world.goods.supplies[i],
        demand: world.goods.demands[i],
        volatility,
      });
    }
    
    // 收集价格趋势（最近20个tick）
    const priceTrends = new Map<number, number[]>();
    // 简化处理：这里不收集历史价格，Worker会自行计算
    
    const marketDTO: MarketStateDTO = {
      tick: world.tick,
      goods,
      economy: {
        gdp: world.economyStats.gdp,
        inflation: world.economyStats.inflation,
        interestRate: world.economyStats.interestRate,
        cyclePhase: world.economyStats.cyclePhase,
        cyclePosition: world.economyStats.cyclePosition,
      },
      priceTrends,
    };
    
    // 更新缓存
    this.cachedMarketDTO = marketDTO;
    this.lastMarketSerializeTick = world.tick;
    
    return marketDTO;
  }
  
  // ==================== 决策请求方法 ====================
  
  /**
   * 请求单个公司的决策
   */
  async requestDecision(
    world: GameWorld,
    companyId: number,
    tier: 'fast' | 'standard' | 'deep'
  ): Promise<AIDecisionResult> {
    const request: AIDecisionRequest = {
      requestId: this.messageId + 1,
      companyId,
      tier,
      company: this.serializeCompany(world, companyId),
      market: this.serializeMarket(world),
      timestamp: Date.now(),
    };
    
    const messageType = tier === 'fast' ? 'AI_FAST_DECISION'
                      : tier === 'standard' ? 'AI_STANDARD_DECISION'
                      : 'AI_DEEP_DECISION';
    
    return this.sendMessage<AIDecisionResult>(messageType, request);
  }
  
  /**
   * 批量请求多个公司的决策
   */
  async requestBatchDecisions(
    world: GameWorld,
    companyIds: number[],
    tier: 'fast' | 'standard' | 'deep'
  ): Promise<AIDecisionResult[]> {
    const market = this.serializeMarket(world);
    
    const requests: AIDecisionRequest[] = companyIds.map(companyId => ({
      requestId: ++this.messageId,
      companyId,
      tier,
      company: this.serializeCompany(world, companyId),
      market,
      timestamp: Date.now(),
    }));
    
    const batchRequest: AIBatchRequest = {
      requests,
      market,
    };
    
    return this.sendMessage<AIDecisionResult[]>('AI_BATCH', batchRequest);
  }
  
  // ==================== 决策应用方法 ====================
  
  /**
   * 应用决策结果到GameWorld
   */
  applyDecisions(world: GameWorld, result: AIDecisionResult): number {
    if (!result.success || result.decisions.length === 0) {
      return 0;
    }
    
    let appliedCount = 0;
    
    for (const decision of result.decisions) {
      try {
        const applied = this.applyDecision(world, result.companyId, decision);
        if (applied) appliedCount++;
      } catch (error) {
        console.warn(`[AIWorkerManager] 应用决策失败:`, decision, error);
      }
    }
    
    return appliedCount;
  }
  
  /**
   * 应用单个决策
   */
  private applyDecision(
    world: GameWorld,
    companyId: number,
    decision: AIDecisionDTO
  ): boolean {
    switch (decision.type) {
      case 'buy':
        return this.applyBuyDecision(world, companyId, decision);
        
      case 'sell':
        return this.applySellDecision(world, companyId, decision);
        
      case 'build':
        return this.applyBuildDecision(world, companyId, decision);
        
      case 'cancel_order':
        return this.applyCancelOrderDecision(world, companyId, decision);
        
      case 'adjust_price':
        return this.applyPriceAdjustDecision(world, companyId, decision);
        
      default:
        console.warn(`[AIWorkerManager] 未知决策类型: ${decision.type}`);
        return false;
    }
  }
  
  /**
   * 应用买入决策
   */
  private applyBuyDecision(
    world: GameWorld,
    companyId: number,
    decision: AIDecisionDTO
  ): boolean {
    if (decision.goodsId === undefined || decision.quantity === undefined || decision.price === undefined) {
      return false;
    }
    
    const cash = world.companies.cash[companyId];
    const totalCost = decision.quantity * decision.price;
    
    // 检查现金是否足够
    if (cash < totalCost * 1.1) { // 预留10%缓冲
      return false;
    }
    
    // 发布买单
    const orderId = createBuyOrder(
      world,
      companyId,
      decision.goodsId,
      decision.quantity,  // quantity在price之前
      decision.price,
      48 // 2天过期
    );
    
    return orderId !== null && orderId >= 0;
  }
  
  /**
   * 应用卖出决策
   */
  private applySellDecision(
    world: GameWorld,
    companyId: number,
    decision: AIDecisionDTO
  ): boolean {
    if (decision.goodsId === undefined || decision.quantity === undefined || decision.price === undefined) {
      return false;
    }
    
    const idx = companyId * GOODS_COUNT + decision.goodsId;
    const inventory = world.companies.inventories[idx];
    
    // 检查库存是否足够
    if (inventory < decision.quantity) {
      return false;
    }
    
    // 发布卖单
    const orderId = createSellOrder(
      world,
      companyId,
      decision.goodsId,
      decision.quantity,  // quantity在price之前
      decision.price,
      48 // 2天过期
    );
    
    return orderId !== null && orderId >= 0;
  }
  
  /**
   * 应用建造决策
   */
  private applyBuildDecision(
    world: GameWorld,
    companyId: number,
    decision: AIDecisionDTO
  ): boolean {
    if (decision.buildingTypeId === undefined) {
      return false;
    }
    
    // 注意：建造系统的类型在 GameWorld 和 ConstructionManager 之间有差异
    // GameWorld 使用 construction 和 reservedMaterials
    // ConstructionManager 使用不同的接口定义
    //
    // 为了安全起见，我们使用 GameWorld 中的 construction 系统直接添加任务
    try {
      const queue = world.construction;
      
      // 检查队列容量
      if (queue.count >= queue.maxQueueSize) {
        return false;
      }
      
      // 查找空闲槽位
      let slot = -1;
      for (let i = 0; i < queue.maxQueueSize; i++) {
        if (!queue.isActive[i]) {
          slot = i;
          break;
        }
      }
      
      if (slot < 0) {
        return false;
      }
      
      // 添加建造任务
      queue.companyIds[slot] = companyId;
      queue.buildingTypeIds[slot] = decision.buildingTypeId;
      queue.targetLevels[slot] = 1;  // 新建
      queue.statuses[slot] = 0;  // WAITING
      queue.progress[slot] = 0;
      queue.startTicks[slot] = world.tick;
      queue.estimatedEndTicks[slot] = world.tick + 48;  // 默认2天
      queue.recipeIds[slot] = decision.recipeId || 0;
      queue.existingBuildingIds[slot] = -1;  // 新建
      queue.isActive[slot] = 1;
      queue.count++;
      
      return true;
    } catch (error) {
      console.warn('[AIWorkerManager] 建造决策应用失败:', error);
      return false;
    }
  }
  
  /**
   * 应用取消订单决策
   */
  private applyCancelOrderDecision(
    world: GameWorld,
    companyId: number,
    decision: AIDecisionDTO
  ): boolean {
    if (decision.orderId === undefined) {
      return false;
    }
    
    // 验证订单归属
    if (world.orders.companyIds[decision.orderId] !== companyId) {
      return false;
    }
    
    cancelOrder(world, decision.orderId);
    return true;
  }
  
  /**
   * 应用价格调整决策
   */
  private applyPriceAdjustDecision(
    world: GameWorld,
    companyId: number,
    decision: AIDecisionDTO
  ): boolean {
    if (decision.orderId === undefined || decision.newPrice === undefined) {
      return false;
    }
    
    // 验证订单归属
    if (world.orders.companyIds[decision.orderId] !== companyId) {
      return false;
    }
    
    // 直接修改订单价格
    world.orders.prices[decision.orderId] = decision.newPrice;
    return true;
  }
  
  /**
   * 应用交易决策（快速方法，用于Fast决策）
   */
  applyTradingDecision(world: GameWorld, companyId: number, decision: AIDecisionDTO): boolean {
    if (decision.type === 'buy') {
      return this.applyBuyDecision(world, companyId, decision);
    } else if (decision.type === 'sell') {
      return this.applySellDecision(world, companyId, decision);
    }
    return false;
  }
  
  /**
   * 销毁Worker
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker已销毁'));
    }
    this.pendingRequests.clear();
    
    console.log('[AIWorkerManager] 已销毁');
  }
}

// 单例导出
export const aiWorkerManager = new AIWorkerManager();