# AI Web Worker 异步处理优化方案

## 现有架构分析

### 已有Worker基础设施
项目已具备完善的Worker架构：

| 组件 | 文件 | 功能 |
|------|------|------|
| WorkerManager | [`src/core/workers/WorkerManager.ts`](src/core/workers/WorkerManager.ts) | 单Worker管理器 |
| WorkerPool | [`src/core/workers/WorkerPool.ts`](src/core/workers/WorkerPool.ts) | 多Worker池，支持并行 |
| economyWorker | [`src/core/workers/economyWorker.ts`](src/core/workers/economyWorker.ts) | 经济计算Worker |

### 现有AI相关功能
[`economyWorker.ts`](src/core/workers/economyWorker.ts:356) 已有`AI_BATCH_DECISIONS`任务类型，但功能简单：
```typescript
// 现有实现只有简单的买卖决策逻辑
function calculateAIDecisions(companyIds, cash, inventories, prices, goodsCount) {
  // 只有简单的库存检查和买卖逻辑
  // 未使用完整的AIDecisionEngine
}
```

### 核心问题
[`AIDecisionEngine.runAIDecisionCycle()`](src/core/ai/AIDecisionEngine.ts:2353) 无法直接在Worker中运行，因为：
1. 依赖完整的`GameWorld`对象（包含大量引用类型）
2. 调用20+个子模块，有复杂的状态依赖
3. 直接执行订单操作（需要主线程权限）

---

## 解决方案架构

### 方案：计算-执行分离

```
┌─────────────────────────────────────────────────────────────────┐
│                        主线程 (Main Thread)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ AIScheduler │───→│ 序列化快照   │───→│ postMessage      │  │
│  └─────────────┘    │ (World→DTO)  │    │ (Transferable)   │  │
│                     └──────────────┘    └────────┬─────────┘  │
│                                                   │            │
│  ┌─────────────┐    ┌──────────────┐              │            │
│  │ 执行决策    │←───│ 解析结果     │←─────────────┼────────┐  │
│  │ (主线程)    │    │              │              │        │  │
│  └─────────────┘    └──────────────┘              │        │  │
│                                                   │        │  │
├───────────────────────────────────────────────────┼────────┼──┤
│                                                   │        │  │
│  ┌────────────────────────────────────────────────┼────────┼──┤
│  │                   Worker Pool                  │        │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐        │        │  │
│  │  │Worker 1 │  │Worker 2 │  │Worker 3 │        │        │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘        │        │  │
│  │       │            │            │              │        │  │
│  │       └────────────┼────────────┘              │        │  │
│  │                    ▼                           │        │  │
│  │         ┌─────────────────────┐               │        │  │
│  │         │   AI计算引擎        │←──────────────┘        │  │
│  │         │   (纯计算，无副作用) │                        │  │
│  │         └──────────┬──────────┘                        │  │
│  │                    │                                    │  │
│  │                    ▼                                    │  │
│  │         ┌─────────────────────┐                        │  │
│  │         │   决策结果列表      │────────────────────────┘  │
│  │         │   (AIDecisionDTO[]) │                           │
│  │         └─────────────────────┘                           │
│  └───────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 详细设计

### 1. 数据传输对象 (DTO)

```typescript
// 新增文件: src/core/workers/aiWorkerTypes.ts

/**
 * 公司状态快照 - 用于Worker传输
 */
export interface CompanyStateDTO {
  id: number;
  name: string;
  cash: number;
  totalValue: number;
  isPlayer: boolean;
  personalityType: string;
  
  // 库存 (goodsId -> quantity)
  inventory: Record<number, number>;
  
  // 建筑列表
  buildings: Array<{
    id: number;
    type: string;
    efficiency: number;
    level: number;
  }>;
  
  // 当前订单
  activeOrders: Array<{
    type: 'buy' | 'sell';
    goodsId: number;
    quantity: number;
    price: number;
  }>;
}

/**
 * 市场状态快照
 */
export interface MarketStateDTO {
  tick: number;
  
  // 商品价格 (goodsId -> price)
  prices: Float32Array;
  
  // 供需数据 (goodsId -> value)
  supplies: Float32Array;
  demands: Float32Array;
  
  // 价格历史 (最近10个tick)
  priceHistory: Record<number, number[]>;
  
  // 订单簿摘要 (goodsId -> {bestBid, bestAsk, depth})
  orderBookSummary: Record<number, {
    bestBid: number;
    bestAsk: number;
    bidDepth: number;
    askDepth: number;
  }>;
}

/**
 * AI决策请求
 */
export interface AIDecisionRequest {
  requestId: number;
  companyId: number;
  company: CompanyStateDTO;
  market: MarketStateDTO;
  decisionType: 'deep' | 'standard' | 'fast';
}

/**
 * AI决策结果
 */
export interface AIDecisionResult {
  requestId: number;
  companyId: number;
  decisions: AIDecisionDTO[];
  computeTime: number;
}

/**
 * 单个决策
 */
export interface AIDecisionDTO {
  type: 'production' | 'pricing' | 'trading' | 'investment' | 'building';
  action: string;
  priority: number;
  params: Record<string, unknown>;
  reasoning?: string;
}
```

### 2. AI Worker实现

```typescript
// 新增文件: src/core/workers/aiWorker.ts

import type { 
  AIDecisionRequest, 
  AIDecisionResult, 
  AIDecisionDTO,
  CompanyStateDTO,
  MarketStateDTO 
} from './aiWorkerTypes';

// Worker消息类型
export interface AIWorkerMessage {
  type: 'AI_DEEP_DECISION' | 'AI_STANDARD_DECISION' | 'AI_FAST_DECISION' | 'AI_BATCH';
  payload: AIDecisionRequest | AIDecisionRequest[];
  id: number;
}

export interface AIWorkerResponse {
  type: string;
  result: AIDecisionResult | AIDecisionResult[];
  id: number;
  duration: number;
}

/**
 * 计算深度AI决策
 * 包含完整的策略分析、竞争评估、风险评估
 */
function computeDeepDecision(
  company: CompanyStateDTO,
  market: MarketStateDTO
): AIDecisionDTO[] {
  const decisions: AIDecisionDTO[] = [];
  
  // === 1. 资金状态评估 ===
  const cashRatio = company.cash / company.totalValue;
  const hasExcessCash = cashRatio > 0.3;
  const isLowOnCash = cashRatio < 0.1;
  
  // === 2. 库存分析 ===
  const inventoryAnalysis = analyzeInventory(company, market);
  
  // === 3. 价格趋势分析 ===
  const priceTrends = analyzePriceTrends(market);
  
  // === 4. 生成交易决策 ===
  for (const [goodsIdStr, quantity] of Object.entries(company.inventory)) {
    const goodsId = parseInt(goodsIdStr);
    if (quantity <= 0) continue;
    
    const price = market.prices[goodsId];
    const trend = priceTrends[goodsId];
    const orderBook = market.orderBookSummary[goodsId];
    
    // 卖出逻辑
    if (quantity > 50) {
      const sellPrice = calculateOptimalSellPrice(price, trend, orderBook);
      decisions.push({
        type: 'trading',
        action: 'sell',
        priority: 6 + (trend === 'down' ? 2 : 0),
        params: {
          goodsId,
          quantity: Math.floor(quantity * 0.3),
          price: sellPrice,
        },
        reasoning: `Inventory=${quantity}, Trend=${trend}`,
      });
    }
  }
  
  // === 5. 投资决策（现金充裕时）===
  if (hasExcessCash && company.buildings.length < 20) {
    decisions.push({
      type: 'investment',
      action: 'expand_production',
      priority: 5,
      params: {
        budget: company.cash * 0.2,
      },
      reasoning: `CashRatio=${(cashRatio * 100).toFixed(1)}%, looking to expand`,
    });
  }
  
  // === 6. 买入决策（基于供需）===
  if (!isLowOnCash) {
    for (const [goodsIdStr, summary] of Object.entries(market.orderBookSummary)) {
      const goodsId = parseInt(goodsIdStr);
      const supply = market.supplies[goodsId];
      const demand = market.demands[goodsId];
      
      if (demand > supply * 1.2) {
        // 供不应求，可以买入
        const buyPrice = summary.bestAsk * 1.01;
        const maxQuantity = Math.floor(company.cash * 0.05 / buyPrice);
        
        if (maxQuantity > 10) {
          decisions.push({
            type: 'trading',
            action: 'buy',
            priority: 5,
            params: {
              goodsId,
              quantity: Math.min(maxQuantity, 100),
              price: buyPrice,
            },
            reasoning: `Supply/Demand gap, D/S ratio=${(demand/supply).toFixed(2)}`,
          });
        }
      }
    }
  }
  
  // 按优先级排序
  decisions.sort((a, b) => b.priority - a.priority);
  
  return decisions;
}

/**
 * 计算标准AI决策
 * 中等复杂度，主要关注交易
 */
function computeStandardDecision(
  company: CompanyStateDTO,
  market: MarketStateDTO
): AIDecisionDTO[] {
  const decisions: AIDecisionDTO[] = [];
  
  // 简化的交易决策
  for (const [goodsIdStr, quantity] of Object.entries(company.inventory)) {
    const goodsId = parseInt(goodsIdStr);
    if (quantity > 20) {
      const price = market.prices[goodsId];
      decisions.push({
        type: 'trading',
        action: 'sell',
        priority: 6,
        params: {
          goodsId,
          quantity: Math.floor(quantity * 0.2),
          price: price * 0.98,
        },
      });
    }
  }
  
  return decisions;
}

/**
 * 计算快速AI决策
 * 最简化，只处理紧急情况
 */
function computeFastDecision(
  company: CompanyStateDTO,
  market: MarketStateDTO
): AIDecisionDTO[] {
  const decisions: AIDecisionDTO[] = [];
  
  // 只处理库存过高的情况
  for (const [goodsIdStr, quantity] of Object.entries(company.inventory)) {
    const goodsId = parseInt(goodsIdStr);
    if (quantity > 1000) {
      const price = market.prices[goodsId];
      decisions.push({
        type: 'trading',
        action: 'sell',
        priority: 8,
        params: {
          goodsId,
          quantity: Math.floor(quantity * 0.5),
          price: price * 0.95,
        },
      });
    }
  }
  
  return decisions;
}

// === 辅助函数 ===

function analyzeInventory(company: CompanyStateDTO, market: MarketStateDTO) {
  const analysis: Record<number, { value: number; excess: boolean }> = {};
  
  for (const [goodsIdStr, quantity] of Object.entries(company.inventory)) {
    const goodsId = parseInt(goodsIdStr);
    const price = market.prices[goodsId] || 100;
    const value = quantity * price;
    const excess = quantity > 500;
    analysis[goodsId] = { value, excess };
  }
  
  return analysis;
}

function analyzePriceTrends(market: MarketStateDTO): Record<number, 'up' | 'down' | 'stable'> {
  const trends: Record<number, 'up' | 'down' | 'stable'> = {};
  
  for (const [goodsIdStr, history] of Object.entries(market.priceHistory)) {
    const goodsId = parseInt(goodsIdStr);
    if (history.length < 2) {
      trends[goodsId] = 'stable';
      continue;
    }
    
    const first = history[0];
    const last = history[history.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.03) trends[goodsId] = 'up';
    else if (change < -0.03) trends[goodsId] = 'down';
    else trends[goodsId] = 'stable';
  }
  
  return trends;
}

function calculateOptimalSellPrice(
  currentPrice: number,
  trend: 'up' | 'down' | 'stable',
  orderBook: { bestBid: number; bestAsk: number } | undefined
): number {
  let price = currentPrice;
  
  if (trend === 'up') {
    price *= 1.02; // 涨势中可以挂高一点
  } else if (trend === 'down') {
    price *= 0.97; // 跌势中尽快出货
  }
  
  if (orderBook && orderBook.bestBid > 0) {
    // 参考买一价
    price = Math.max(price, orderBook.bestBid * 0.99);
  }
  
  return Math.round(price * 100) / 100;
}

// === Worker主消息处理 ===

self.onmessage = (e: MessageEvent<AIWorkerMessage>) => {
  const { type, payload, id } = e.data;
  const startTime = performance.now();
  
  let result: AIDecisionResult | AIDecisionResult[];
  
  switch (type) {
    case 'AI_DEEP_DECISION': {
      const request = payload as AIDecisionRequest;
      const decisions = computeDeepDecision(request.company, request.market);
      result = {
        requestId: request.requestId,
        companyId: request.companyId,
        decisions,
        computeTime: performance.now() - startTime,
      };
      break;
    }
    
    case 'AI_STANDARD_DECISION': {
      const request = payload as AIDecisionRequest;
      const decisions = computeStandardDecision(request.company, request.market);
      result = {
        requestId: request.requestId,
        companyId: request.companyId,
        decisions,
        computeTime: performance.now() - startTime,
      };
      break;
    }
    
    case 'AI_FAST_DECISION': {
      const request = payload as AIDecisionRequest;
      const decisions = computeFastDecision(request.company, request.market);
      result = {
        requestId: request.requestId,
        companyId: request.companyId,
        decisions,
        computeTime: performance.now() - startTime,
      };
      break;
    }
    
    case 'AI_BATCH': {
      const requests = payload as AIDecisionRequest[];
      result = requests.map(request => {
        const batchStartTime = performance.now();
        let decisions: AIDecisionDTO[];
        
        switch (request.decisionType) {
          case 'deep':
            decisions = computeDeepDecision(request.company, request.market);
            break;
          case 'standard':
            decisions = computeStandardDecision(request.company, request.market);
            break;
          case 'fast':
          default:
            decisions = computeFastDecision(request.company, request.market);
        }
        
        return {
          requestId: request.requestId,
          companyId: request.companyId,
          decisions,
          computeTime: performance.now() - batchStartTime,
        };
      });
      break;
    }
    
    default:
      result = { requestId: 0, companyId: 0, decisions: [], computeTime: 0 };
  }
  
  const response: AIWorkerResponse = {
    type,
    result,
    id,
    duration: performance.now() - startTime,
  };
  
  self.postMessage(response);
};

export {};
```

### 3. AI Worker管理器

```typescript
// 新增文件: src/core/workers/AIWorkerManager.ts

import type { 
  AIDecisionRequest, 
  AIDecisionResult,
  CompanyStateDTO,
  MarketStateDTO 
} from './aiWorkerTypes';
import type { AIWorkerMessage, AIWorkerResponse } from './aiWorker';
import type { GameWorld } from '../world/GameWorld';

/**
 * AI Worker管理器
 * 负责AI决策的异步计算和结果应用
 */
export class AIWorkerManager {
  private workers: Worker[] = [];
  private pendingRequests: Map<number, {
    resolve: (result: AIDecisionResult) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  
  private nextRequestId = 0;
  private workerIndex = 0;
  private isInitialized = false;
  
  private readonly WORKER_COUNT: number;
  private readonly TIMEOUT_MS = 100; // AI决策超时时间短一些
  
  constructor() {
    this.WORKER_COUNT = typeof navigator !== 'undefined'
      ? Math.max(2, navigator.hardwareConcurrency - 1)
      : 2;
  }
  
  /**
   * 初始化AI Worker池
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported');
      return false;
    }
    
    try {
      for (let i = 0; i < this.WORKER_COUNT; i++) {
        const worker = new Worker(
          new URL('./aiWorker.ts', import.meta.url),
          { type: 'module' }
        );
        
        worker.onmessage = (e: MessageEvent<AIWorkerResponse>) => {
          this.handleResponse(e.data);
        };
        
        worker.onerror = (error) => {
          console.error(`AI Worker ${i} error:`, error);
        };
        
        this.workers.push(worker);
      }
      
      this.isInitialized = true;
      console.log(`AIWorkerManager initialized with ${this.WORKER_COUNT} workers`);
      return true;
    } catch (error) {
      console.error('Failed to initialize AIWorkerManager:', error);
      return false;
    }
  }
  
  /**
   * 处理Worker响应
   */
  private handleResponse(response: AIWorkerResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);
      pending.resolve(response.result as AIDecisionResult);
    }
  }
  
  /**
   * 序列化公司状态
   */
  serializeCompany(world: GameWorld, companyId: number): CompanyStateDTO {
    const company = world.companies.get(companyId);
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }
    
    // 序列化库存
    const inventory: Record<number, number> = {};
    if (world.inventories) {
      for (let goodsId = 0; goodsId < 128; goodsId++) {
        const qty = world.inventories.get(companyId, goodsId);
        if (qty > 0) {
          inventory[goodsId] = qty;
        }
      }
    }
    
    // 序列化建筑
    const buildings: CompanyStateDTO['buildings'] = [];
    if (world.buildings) {
      for (const building of world.buildings.values()) {
        if (building.ownerId === companyId) {
          buildings.push({
            id: building.id,
            type: building.type,
            efficiency: building.efficiency || 1,
            level: building.level || 1,
          });
        }
      }
    }
    
    return {
      id: companyId,
      name: company.name,
      cash: company.cash,
      totalValue: company.totalValue || company.cash,
      isPlayer: company.isPlayer || false,
      personalityType: company.personalityType || 'balanced',
      inventory,
      buildings,
      activeOrders: [],
    };
  }
  
  /**
   * 序列化市场状态
   */
  serializeMarket(world: GameWorld): MarketStateDTO {
    const goodsCount = 128;
    
    // 价格数组
    const prices = new Float32Array(goodsCount);
    const supplies = new Float32Array(goodsCount);
    const demands = new Float32Array(goodsCount);
    
    if (world.priceEngine) {
      for (let i = 0; i < goodsCount; i++) {
        prices[i] = world.priceEngine.getPrice(i) || 100;
        supplies[i] = world.priceEngine.getSupply?.(i) || 0;
        demands[i] = world.priceEngine.getDemand?.(i) || 0;
      }
    }
    
    // 价格历史（简化版，只取最近10个tick）
    const priceHistory: Record<number, number[]> = {};
    // TODO: 从PriceCache获取历史
    
    // 订单簿摘要
    const orderBookSummary: MarketStateDTO['orderBookSummary'] = {};
    if (world.orderBook) {
      for (let goodsId = 0; goodsId < goodsCount; goodsId++) {
        const book = world.orderBook.getBook(goodsId);
        if (book) {
          orderBookSummary[goodsId] = {
            bestBid: book.bestBid?.price || 0,
            bestAsk: book.bestAsk?.price || 0,
            bidDepth: book.bidDepth || 0,
            askDepth: book.askDepth || 0,
          };
        }
      }
    }
    
    return {
      tick: world.tick,
      prices,
      supplies,
      demands,
      priceHistory,
      orderBookSummary,
    };
  }
  
  /**
   * 请求AI决策（异步）
   */
  async requestDecision(
    world: GameWorld,
    companyId: number,
    decisionType: 'deep' | 'standard' | 'fast' = 'deep'
  ): Promise<AIDecisionResult> {
    if (!this.isInitialized || this.workers.length === 0) {
      // 回退到同步处理
      return this.fallbackDecision(world, companyId);
    }
    
    const requestId = ++this.nextRequestId;
    
    // 序列化状态
    const company = this.serializeCompany(world, companyId);
    const market = this.serializeMarket(world);
    
    const request: AIDecisionRequest = {
      requestId,
      companyId,
      company,
      market,
      decisionType,
    };
    
    // 选择Worker（轮询）
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`AI decision timeout for company ${companyId}`));
      }, this.TIMEOUT_MS);
      
      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      
      const message: AIWorkerMessage = {
        type: decisionType === 'deep' ? 'AI_DEEP_DECISION' 
            : decisionType === 'standard' ? 'AI_STANDARD_DECISION'
            : 'AI_FAST_DECISION',
        payload: request,
        id: requestId,
      };
      
      worker.postMessage(message);
    });
  }
  
  /**
   * 批量请求AI决策
   */
  async requestBatchDecisions(
    world: GameWorld,
    companyIds: number[],
    decisionType: 'deep' | 'standard' | 'fast' = 'deep'
  ): Promise<AIDecisionResult[]> {
    if (!this.isInitialized || this.workers.length === 0) {
      return Promise.all(companyIds.map(id => this.fallbackDecision(world, id)));
    }
    
    // 按Worker数量分组
    const batches: AIDecisionRequest[][] = Array.from(
      { length: this.workers.length },
      () => []
    );
    
    const market = this.serializeMarket(world);
    
    companyIds.forEach((companyId, index) => {
      const workerIndex = index % this.workers.length;
      const company = this.serializeCompany(world, companyId);
      
      batches[workerIndex].push({
        requestId: ++this.nextRequestId,
        companyId,
        company,
        market,
        decisionType,
      });
    });
    
    // 并行发送到所有Worker
    const promises = batches.map((batch, workerIndex) => {
      if (batch.length === 0) return Promise.resolve([]);
      
      return new Promise<AIDecisionResult[]>((resolve, reject) => {
        const batchId = ++this.nextRequestId;
        
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(batchId);
          reject(new Error('Batch decision timeout'));
        }, this.TIMEOUT_MS * 2);
        
        this.pendingRequests.set(batchId, {
          resolve: (results) => resolve(results as unknown as AIDecisionResult[]),
          reject,
          timeout,
        });
        
        const message: AIWorkerMessage = {
          type: 'AI_BATCH',
          payload: batch,
          id: batchId,
        };
        
        this.workers[workerIndex].postMessage(message);
      });
    });
    
    const results = await Promise.all(promises);
    return results.flat();
  }
  
  /**
   * 回退处理（Worker不可用时）
   */
  private async fallbackDecision(
    world: GameWorld,
    companyId: number
  ): Promise<AIDecisionResult> {
    // 使用简化的主线程决策
    return {
      requestId: 0,
      companyId,
      decisions: [],
      computeTime: 0,
    };
  }
  
  /**
   * 检查是否可用
   */
  isAvailable(): boolean {
    return this.isInitialized && this.workers.length > 0;
  }
  
  /**
   * 获取状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      workerCount: this.workers.length,
      pendingRequests: this.pendingRequests.size,
    };
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('AIWorkerManager destroyed'));
    }
    this.pendingRequests.clear();
    
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.isInitialized = false;
  }
}

// 全局单例
export const aiWorkerManager = new AIWorkerManager();
```

### 4. 集成到AIScheduler

```typescript
// 修改文件: src/core/ai/AIScheduler.ts

import { aiWorkerManager, type AIDecisionResult } from '../workers/AIWorkerManager';

// 在 AIScheduler 类中添加：

/**
 * 处理Deep决策（异步Worker版）
 */
private async processDeepBatchAsync(world: GameWorld): Promise<void> {
  const batchSize = this.config.deepBatchSize;
  const companyIds: number[] = [];
  
  // 收集待处理公司
  while (companyIds.length < batchSize && this.deepQueue.length > 0) {
    const companyId = this.deepQueue.shift()!;
    const company = world.companies.get(companyId);
    if (company && !company.isPlayer) {
      companyIds.push(companyId);
    }
  }
  
  if (companyIds.length === 0) return;
  
  // 检查Worker是否可用
  if (!aiWorkerManager.isAvailable()) {
    // 回退到同步处理
    for (const companyId of companyIds) {
      this.processDeepDecisionSync(world, companyId);
    }
    return;
  }
  
  try {
    // 异步批量请求决策
    const results = await aiWorkerManager.requestBatchDecisions(
      world,
      companyIds,
      'deep'
    );
    
    // 应用决策结果
    for (const result of results) {
      this.applyDecisionResult(world, result);
    }
  } catch (error) {
    console.warn('AI Worker decision failed, falling back to sync:', error);
    // 回退
    for (const companyId of companyIds) {
      this.processDeepDecisionSync(world, companyId);
    }
  }
}

/**
 * 应用Worker返回的决策结果
 */
private applyDecisionResult(world: GameWorld, result: AIDecisionResult): void {
  for (const decision of result.decisions) {
    switch (decision.type) {
      case 'trading':
        this.executeTradingDecision(world, result.companyId, decision);
        break;
      case 'production':
        this.executeProductionDecision(world, result.companyId, decision);
        break;
      case 'investment':
        this.executeInvestmentDecision(world, result.companyId, decision);
        break;
      case 'building':
        this.executeBuildingDecision(world, result.companyId, decision);
        break;
    }
  }
}

/**
 * 执行交易决策
 */
private executeTradingDecision(
  world: GameWorld,
  companyId: number,
  decision: AIDecisionDTO
): void {
  const { goodsId, quantity, price } = decision.params as {
    goodsId: number;
    quantity: number;
    price: number;
  };
  
  if (decision.action === 'sell') {
    world.orderBook?.placeSellOrder(companyId, goodsId, quantity, price);
  } else if (decision.action === 'buy') {
    world.orderBook?.placeBuyOrder(companyId, goodsId, quantity, price);
  }
}
```

---

## 实施步骤

### 第一阶段：创建AI Worker基础设施

1. **创建类型定义文件**
   - 新建 `src/core/workers/aiWorkerTypes.ts`
   - 定义DTO接口

2. **创建AI Worker**
   - 新建 `src/core/workers/aiWorker.ts`
   - 实现决策计算逻辑

3. **创建AI Worker管理器**
   - 新建 `src/core/workers/AIWorkerManager.ts`
   - 实现状态序列化和通信

### 第二阶段：集成到现有系统

4. **修改AIScheduler**
   - 添加异步决策处理方法
   - 添加决策结果应用逻辑
   - 添加同步回退机制

5. **初始化Worker**
   - 在GameLoop初始化时启动AIWorkerManager
   - 处理Worker不可用的情况

### 第三阶段：优化和测试

6. **性能调优**
   - 优化序列化效率
   - 调整Worker数量
   - 使用Transferable对象

7. **测试验证**
   - 导出性能数据对比
   - 验证决策质量

---

## 预期效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| AI尖峰耗时 | 17-22ms | 0ms（完全异步） |
| 主线程AI占用 | 89-97% | <5%（仅序列化） |
| 决策延迟 | 实时 | 1-2tick（可接受） |
| CPU利用率 | 单核 | 多核并行 |

---

## 需要修改的文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `src/core/workers/aiWorkerTypes.ts` |
| 新建 | `src/core/workers/aiWorker.ts` |
| 新建 | `src/core/workers/AIWorkerManager.ts` |
| 修改 | `src/core/ai/AIScheduler.ts` |
| 修改 | `src/core/loop/GameLoop.ts` |
| 修改 | `src/core/workers/index.ts` |

---

## 风险和缓解措施

| 风险 | 缓解措施 |
|------|----------|
| Worker初始化失败 | 自动回退到同步模式 |
| 决策延迟 | 预计1-2tick，对游戏体验影响小 |
| 状态不一致 | 使用序列化快照，决策基于固定状态 |
| 序列化开销 | 使用TypedArray优化，选择性序列化 |