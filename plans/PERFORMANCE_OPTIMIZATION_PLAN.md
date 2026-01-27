# 大规模性能优化计划

> **目标**: 将tick处理时间从当前水平优化到<10ms，支持1000+订单/tick的实时模拟

---

## 一、性能现状分析

### 1.1 当前架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                     GameLoop.processTick()                   │
├─────────────────────────────────────────────────────────────┤
│  1. autoFeedBuildings()          - 建筑输入补充              │
│  2. updateAllProduction()        - 生产计算                  │
│  3. inventoryDecayManager        - 库存衰减                  │
│  4. logisticsManager             - 物流处理                  │
│  5. simulateEnhancedDemand()     - 需求模拟                  │
│  6. runAIDecisionCycle() × N     - AI决策（分批）            │
│  7. autoPostSellOrders()         - AI自动挂单                │
│  8. executePlayerAutoTrade()     - 玩家自动交易              │
│  9. executeConsumerPurchases()   - 消费者购买                │
│ 10. updateRetailSystem()         - 零售系统                  │
│ 11. matchAllOrders()             - 订单撮合                  │
│ 12. updateAllPrices()            - 价格更新                  │
│ 13. 其他周期性任务...                                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 已有性能优化基础

| 组件 | 状态 | 说明 |
|------|------|------|
| SoA数据结构 | ✅ 已实现 | GameWorld使用TypedArray存储 |
| 对象池 | ✅ 已实现 | ObjectPool.ts实现了订单/交易/事件池 |
| Web Worker | ⚠️ 部分实现 | WorkerManager存在但未充分利用 |
| 虚拟列表 | ✅ 已实现 | VirtualList.tsx用于大量数据渲染 |
| AI分批处理 | ✅ 已实现 | AI_BATCH_SIZE=10，分批决策 |

### 1.3 识别的关键性能瓶颈

#### 🔴 高优先级问题

**1. 订单撮合效率 O(n²)**
```typescript
// MatchingEngine.ts - 当前实现
function matchOrdersForGoods(world, goodsId) {
  const buyIndices: number[] = [];
  const sellIndices: number[] = [];
  
  // 🔴 问题1：遍历所有20000个订单槽位
  for (let i = 0; i < MAX_ORDERS; i++) {
    if (!o.isActive[i] || o.goodsIds[i] !== goodsId) continue;
    // ...
  }
  
  // 🔴 问题2：每次都重新排序
  buyIndices.sort((a, b) => o.prices[b] - o.prices[a]);
  sellIndices.sort((a, b) => o.prices[a] - o.prices[b]);
}
```

**2. AI决策系统臃肿**
```typescript
// AIDecisionEngine.ts - 1600+行代码
export function runAIDecisionCycle(world, companyId) {
  // 🔴 每个AI公司每次决策执行完整流程：
  ensureAISystemsInitialized(world, companyId);       // 初始化检查
  assessCompanyState(world, companyId);               // 状态评估
  performRiskAssessment(world, companyId);            // 风险评估
  updateCompetitorProfiles(world, companyId);         // 竞争分析
  updateStrategicPlan(world, companyId, ...);         // 战略规划
  detectScenarios(world, companyId, ...);             // 场景检测
  generateProductionDecisions(...);                    // 生产决策
  generatePricingDecisions(...);                       // 定价决策
  generateTradingDecisions(...);                       // 交易决策
  generateInvestmentDecisions(...);                    // 投资决策
  // ... 还有更多
}
```

**3. 价格引擎遍历开销**
```typescript
// PriceEngine.ts
export function updateAllPrices(world) {
  for (let i = 0; i < g.count; i++) {
    // 🔴 每个商品单独调用：
    const volume24h = get24hVolume(world, i);  // 遍历交易历史
    const vwap = getVWAP(world, i, 24);        // 再次遍历交易历史
  }
}
```

#### 🟡 中优先级问题

**4. Worker未充分利用**
- `WorkerManager`只用于简单的价格计算
- 主循环仍在主线程串行执行

**5. 生产引擎重复计算**
- `calculateCompanyResources`每tick对每个建筑重新计算
- 可以缓存公司资源状态

**6. 内存分配热点**
- `matchOrdersForGoods`每次创建新数组
- 交易记录对象频繁创建

---

## 二、优化策略详解

### Phase 1: 核心热路径优化

#### 1.1 订单簿索引重构

**当前问题**: 每次撮合都遍历全部订单槽位

**优化方案**: 预维护每商品的活跃订单索引

```typescript
// 新增: OrderBookIndex.ts

/**
 * 按商品维护的活跃订单索引
 * 使用优先队列保持价格排序
 */
interface GoodsOrderIndex {
  buyOrders: SortedArray<number>;   // 按价格降序
  sellOrders: SortedArray<number>;  // 按价格升序
}

class OrderBookIndex {
  private indices: Map<number, GoodsOrderIndex> = new Map();
  
  // 预分配数组避免运行时分配
  private tempBuyBuffer: Uint16Array;
  private tempSellBuffer: Uint16Array;
  
  constructor(maxOrders: number, goodsCount: number) {
    this.tempBuyBuffer = new Uint16Array(maxOrders);
    this.tempSellBuffer = new Uint16Array(maxOrders);
    
    for (let i = 0; i < goodsCount; i++) {
      this.indices.set(i, {
        buyOrders: new SortedArray((a, b) => b - a),  // 降序
        sellOrders: new SortedArray((a, b) => a - b), // 升序
      });
    }
  }
  
  // O(log n) 插入
  addOrder(orderIdx: number, goodsId: number, type: 0 | 1, price: number) {
    const idx = this.indices.get(goodsId)!;
    if (type === 0) {
      idx.buyOrders.insert(orderIdx, price);
    } else {
      idx.sellOrders.insert(orderIdx, price);
    }
  }
  
  // O(log n) 删除
  removeOrder(orderIdx: number, goodsId: number, type: 0 | 1) {
    const idx = this.indices.get(goodsId)!;
    if (type === 0) {
      idx.buyOrders.remove(orderIdx);
    } else {
      idx.sellOrders.remove(orderIdx);
    }
  }
  
  // O(1) 获取最优订单
  getBestBuy(goodsId: number): number | null {
    return this.indices.get(goodsId)?.buyOrders.peek() ?? null;
  }
  
  getBestSell(goodsId: number): number | null {
    return this.indices.get(goodsId)?.sellOrders.peek() ?? null;
  }
}

// 优化后的撮合函数
function matchOrdersForGoodsOptimized(world: GameWorld, goodsId: number): Trade[] {
  const trades: Trade[] = [];
  const index = world.orderBookIndex;
  
  // 使用索引直接获取已排序的订单
  while (true) {
    const bestBuyIdx = index.getBestBuy(goodsId);
    const bestSellIdx = index.getBestSell(goodsId);
    
    if (bestBuyIdx === null || bestSellIdx === null) break;
    
    const buyPrice = world.orders.prices[bestBuyIdx];
    const sellPrice = world.orders.prices[bestSellIdx];
    
    if (buyPrice < sellPrice) break;
    
    // 执行撮合...
    // 撮合后更新索引
  }
  
  return trades;
}
```

**预期收益**: 撮合时间从O(n×m)降至O(k log n)，其中k为实际成交数

#### 1.2 批量成交价格缓存

**当前问题**: 每个商品单独遍历交易历史

**优化方案**: 批量预计算所有商品的VWAP和Volume

```typescript
// 新增: PriceCache.ts

class PriceCache {
  // 预分配的缓存数组
  private vwap24h: Float32Array;
  private volume24h: Float32Array;
  private lastTradePrice: Float32Array;
  private lastUpdateTick: number = -1;
  
  constructor(goodsCount: number) {
    this.vwap24h = new Float32Array(goodsCount);
    this.volume24h = new Float32Array(goodsCount);
    this.lastTradePrice = new Float32Array(goodsCount);
  }
  
  /**
   * 批量更新所有商品的价格缓存
   * 只遍历一次交易历史
   */
  update(world: GameWorld): void {
    if (this.lastUpdateTick === world.tick) return;
    
    const t = world.trades;
    const g = world.goods;
    const startTick = world.tick - 24;
    
    // 重置累加器
    const totalValue = new Float32Array(g.count);
    const totalVolume = new Float32Array(g.count);
    
    // 单次遍历计算所有商品
    for (let i = t.count - 1; i >= 0; i--) {
      const idx = i % t.maxTrades;
      if (t.ticks[idx] < startTick) break;
      
      const goodsId = t.goodsIds[idx];
      totalValue[goodsId] += t.quantities[idx] * t.prices[idx];
      totalVolume[goodsId] += t.quantities[idx];
      
      // 记录最新成交价
      if (this.lastTradePrice[goodsId] === 0) {
        this.lastTradePrice[goodsId] = t.prices[idx];
      }
    }
    
    // 计算VWAP
    for (let i = 0; i < g.count; i++) {
      this.volume24h[i] = totalVolume[i];
      this.vwap24h[i] = totalVolume[i] > 0 
        ? totalValue[i] / totalVolume[i] 
        : 0;
    }
    
    this.lastUpdateTick = world.tick;
  }
  
  getVWAP(goodsId: number): number | null {
    return this.volume24h[goodsId] > 0 ? this.vwap24h[goodsId] : null;
  }
  
  getVolume24h(goodsId: number): number {
    return this.volume24h[goodsId];
  }
}
```

**预期收益**: 价格更新时间减少60-80%

#### 1.3 生产计算优化

**优化方案**: 缓存公司资源和配方查找

```typescript
// 优化: ProductionEngine.ts

// 配方查找优化 - 使用数组替代Map
const recipeCache: RecipeCache[] = new Array(RECIPE_COUNT);

// 公司资源缓存 - 每tick只计算一次
const resourceCache: CompanyResources[] = new Array(MAX_COMPANIES);
let resourceCacheTick = -1;

export function updateAllProduction(world: GameWorld): ProductionResult {
  // 批量计算公司资源（仅首次）
  if (resourceCacheTick !== world.tick) {
    batchCalculateCompanyResources(world);
    resourceCacheTick = world.tick;
  }
  
  // 按公司分组处理建筑，提高缓存命中
  const buildingsByCompany = groupBuildingsByCompany(world);
  
  // 使用SIMD友好的循环结构
  for (const [companyId, buildingIds] of buildingsByCompany) {
    const resources = resourceCache[companyId];
    
    for (const buildingId of buildingIds) {
      processBuildingProductionOptimized(world, buildingId, resources);
    }
  }
}

// 预分配建筑分组数组
const buildingGroups: number[][] = new Array(MAX_COMPANIES);
for (let i = 0; i < MAX_COMPANIES; i++) {
  buildingGroups[i] = [];
}

function groupBuildingsByCompany(world: GameWorld): Map<number, number[]> {
  // 复用预分配数组
  for (let i = 0; i < MAX_COMPANIES; i++) {
    buildingGroups[i].length = 0;
  }
  
  for (let i = 0; i < world.buildings.count; i++) {
    const owner = world.buildings.owners[i];
    buildingGroups[owner].push(i);
  }
  
  // 返回有建筑的公司
  const result = new Map<number, number[]>();
  for (let i = 0; i < MAX_COMPANIES; i++) {
    if (buildingGroups[i].length > 0) {
      result.set(i, buildingGroups[i]);
    }
  }
  return result;
}
```

### Phase 2: 并行化与Web Worker增强

#### 2.1 Worker任务扩展

**当前状态**: Worker仅用于简单价格计算

**优化方案**: 将更多计算密集型任务迁移到Worker

```typescript
// 增强: economyWorker.ts

// 新增消息类型
export interface WorkerMessage {
  type: 
    | 'CALCULATE_PRICES'
    | 'CALCULATE_PRODUCTION'
    | 'CALCULATE_DEMAND'
    | 'BATCH_UPDATE'
    | 'MATCH_ORDERS'      // 新增
    | 'AI_DECISIONS'      // 新增
    | 'PRICE_ANALYSIS';   // 新增
  payload: any;
  id: number;
}

// 订单撮合在Worker中执行
function matchOrdersInWorker(
  orderData: SharedArrayBuffer,
  goodsRange: { start: number; end: number }
): MatchResult[] {
  const orders = new Uint16Array(orderData);
  const results: MatchResult[] = [];
  
  for (let goodsId = goodsRange.start; goodsId < goodsRange.end; goodsId++) {
    const trades = matchSingleGoods(orders, goodsId);
    results.push({ goodsId, trades });
  }
  
  return results;
}

// AI决策批量计算
function runAIDecisionsBatch(
  worldData: SharedArrayBuffer,
  companyIds: number[]
): AIDecision[][] {
  const results: AIDecision[][] = [];
  
  for (const companyId of companyIds) {
    const decisions = runSimplifiedAIDecision(worldData, companyId);
    results.push(decisions);
  }
  
  return results;
}
```

#### 2.2 SharedArrayBuffer实现

```typescript
// 新增: SharedGameState.ts

/**
 * 共享内存游戏状态
 * 主线程和Worker共享的数据结构
 */
export class SharedGameState {
  private buffer: SharedArrayBuffer;
  private views: GameStateViews;
  
  constructor() {
    const TOTAL_SIZE = this.calculateBufferSize();
    this.buffer = new SharedArrayBuffer(TOTAL_SIZE);
    this.views = this.createViews();
  }
  
  private calculateBufferSize(): number {
    return (
      4 +                                    // tick
      GOODS_COUNT * 4 * 3 +                  // prices, supplies, demands
      MAX_BUILDINGS * 4 * 3 +                // efficiencies, progress, active
      MAX_COMPANIES * 8 +                    // cash
      MAX_COMPANIES * GOODS_COUNT * 4 * 2 +  // inventories, reserved
      MAX_ORDERS * 20                        // order data
    );
  }
  
  private createViews(): GameStateViews {
    let offset = 0;
    
    const tick = new Uint32Array(this.buffer, offset, 1);
    offset += 4;
    
    const prices = new Float32Array(this.buffer, offset, GOODS_COUNT);
    offset += GOODS_COUNT * 4;
    
    // ... 更多视图
    
    return { tick, prices, /* ... */ };
  }
  
  // 从GameWorld同步到共享内存
  syncToShared(world: GameWorld): void {
    this.views.tick[0] = world.tick;
    this.views.prices.set(world.goods.prices);
    // ...
  }
  
  // 从共享内存同步回GameWorld
  syncFromShared(world: GameWorld): void {
    world.goods.prices.set(this.views.prices);
    // ...
  }
  
  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }
}
```

#### 2.3 多Worker并行架构

```typescript
// 增强: WorkerPool.ts

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];
  private activeTasksCount = 0;
  
  constructor(private workerCount: number = navigator.hardwareConcurrency - 1) {
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        new URL('./economyWorker.ts', import.meta.url),
        { type: 'module' }
      );
      worker.onmessage = this.handleMessage.bind(this, i);
      this.workers.push(worker);
    }
  }
  
  /**
   * 按商品范围分配撮合任务
   */
  async matchOrdersParallel(sharedBuffer: SharedArrayBuffer): Promise<MatchResult[]> {
    const goodsPerWorker = Math.ceil(GOODS_COUNT / this.workerCount);
    const promises: Promise<MatchResult[]>[] = [];
    
    for (let i = 0; i < this.workerCount; i++) {
      const startGoods = i * goodsPerWorker;
      const endGoods = Math.min((i + 1) * goodsPerWorker, GOODS_COUNT);
      
      promises.push(this.sendTask(this.workers[i], {
        type: 'MATCH_ORDERS',
        buffer: sharedBuffer,
        range: { start: startGoods, end: endGoods }
      }));
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }
  
  /**
   * 分配AI决策任务
   */
  async runAIDecisionsParallel(
    sharedBuffer: SharedArrayBuffer,
    companyIds: number[]
  ): Promise<AIDecision[][]> {
    const companiesPerWorker = Math.ceil(companyIds.length / this.workerCount);
    const promises: Promise<AIDecision[][]>[] = [];
    
    for (let i = 0; i < this.workerCount; i++) {
      const startIdx = i * companiesPerWorker;
      const endIdx = Math.min((i + 1) * companiesPerWorker, companyIds.length);
      const batch = companyIds.slice(startIdx, endIdx);
      
      if (batch.length > 0) {
        promises.push(this.sendTask(this.workers[i], {
          type: 'AI_DECISIONS',
          buffer: sharedBuffer,
          companyIds: batch
        }));
      }
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }
}
```

### Phase 3: 内存管理和GC优化

#### 3.1 消除热路径内存分配

```typescript
// 优化: 预分配临时缓冲区

// MatchingEngine.ts
const TEMP_BUY_INDICES = new Uint16Array(MAX_ORDERS);
const TEMP_SELL_INDICES = new Uint16Array(MAX_ORDERS);
let tempBuyCount = 0;
let tempSellCount = 0;

function matchOrdersForGoodsZeroAlloc(world: GameWorld, goodsId: number): number {
  const o = world.orders;
  tempBuyCount = 0;
  tempSellCount = 0;
  
  // 收集订单到预分配数组
  for (let i = 0; i < MAX_ORDERS; i++) {
    if (!o.isActive[i] || o.goodsIds[i] !== goodsId) continue;
    
    if (o.types[i] === 0) {
      TEMP_BUY_INDICES[tempBuyCount++] = i;
    } else {
      TEMP_SELL_INDICES[tempSellCount++] = i;
    }
  }
  
  // 就地排序（避免创建新数组）
  quickSortInPlace(TEMP_BUY_INDICES, 0, tempBuyCount - 1, 
    (a, b) => o.prices[b] - o.prices[a]);
  quickSortInPlace(TEMP_SELL_INDICES, 0, tempSellCount - 1,
    (a, b) => o.prices[a] - o.prices[b]);
  
  // 返回成交数而非Trade对象数组
  return matchFromSortedArrays(world, goodsId);
}

// 快速排序就地实现
function quickSortInPlace(
  arr: Uint16Array, 
  low: number, 
  high: number,
  compare: (a: number, b: number) => number
): void {
  if (low < high) {
    const pivotIdx = partition(arr, low, high, compare);
    quickSortInPlace(arr, low, pivotIdx - 1, compare);
    quickSortInPlace(arr, pivotIdx + 1, high, compare);
  }
}
```

#### 3.2 对象池增强

```typescript
// 增强: ObjectPool.ts

/**
 * 环形缓冲区对象池
 * 适用于需要保留最近N个对象的场景
 */
export class RingBufferPool<T extends Poolable> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private size: number;
  
  constructor(createFn: () => T, capacity: number) {
    this.size = capacity;
    this.buffer = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.buffer[i] = createFn();
    }
  }
  
  // O(1) 获取下一个槽位
  getNext(): T {
    const item = this.buffer[this.head];
    item.reset();
    this.head = (this.head + 1) % this.size;
    return item;
  }
  
  // 获取最近N个项
  getRecent(count: number): T[] {
    const result: T[] = [];
    let idx = (this.head - 1 + this.size) % this.size;
    for (let i = 0; i < Math.min(count, this.size); i++) {
      result.push(this.buffer[idx]);
      idx = (idx - 1 + this.size) % this.size;
    }
    return result;
  }
}

/**
 * 复合对象池
 * 管理多种类型对象的统一池
 */
export class CompositePool {
  private pools: Map<string, ObjectPool<Poolable>> = new Map();
  
  register<T extends Poolable>(
    type: string, 
    createFn: () => T, 
    initialSize: number
  ): void {
    this.pools.set(type, new ObjectPool(createFn, initialSize));
  }
  
  acquire<T extends Poolable>(type: string): T {
    return this.pools.get(type)!.acquire() as T;
  }
  
  release<T extends Poolable>(type: string, obj: T): void {
    this.pools.get(type)!.release(obj);
  }
}
```

#### 3.3 TypedArray工具函数

```typescript
// 新增: ArrayUtils.ts

/**
 * 高效的TypedArray操作工具
 */
export const ArrayUtils = {
  /**
   * 批量复制（比循环快5-10倍）
   */
  batchCopy(
    src: Float32Array, 
    dest: Float32Array, 
    srcOffset: number, 
    destOffset: number, 
    length: number
  ): void {
    dest.set(src.subarray(srcOffset, srcOffset + length), destOffset);
  },
  
  /**
   * 批量填充
   */
  batchFill(
    arr: Float32Array, 
    value: number, 
    start: number, 
    end: number
  ): void {
    arr.fill(value, start, end);
  },
  
  /**
   * 向量化加法
   */
  vectorAdd(
    a: Float32Array, 
    b: Float32Array, 
    result: Float32Array
  ): void {
    const len = a.length;
    for (let i = 0; i < len; i += 4) {
      result[i] = a[i] + b[i];
      result[i + 1] = a[i + 1] + b[i + 1];
      result[i + 2] = a[i + 2] + b[i + 2];
      result[i + 3] = a[i + 3] + b[i + 3];
    }
  },
  
  /**
   * 查找最大值索引
   */
  argmax(arr: Float32Array, start: number, end: number): number {
    let maxIdx = start;
    let maxVal = arr[start];
    for (let i = start + 1; i < end; i++) {
      if (arr[i] > maxVal) {
        maxVal = arr[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  },
  
  /**
   * 条件求和
   */
  sumWhere(
    arr: Float32Array, 
    condition: Uint8Array, 
    start: number, 
    end: number
  ): number {
    let sum = 0;
    for (let i = start; i < end; i++) {
      if (condition[i]) {
        sum += arr[i];
      }
    }
    return sum;
  }
};
```

### Phase 4: AI决策系统优化

#### 4.1 分层决策架构

**当前问题**: 每个AI公司每tick运行完整决策流程

**优化方案**: 分层决策 + 缓存 + 延迟计算

```typescript
// 重构: AIDecisionEngine.ts

/**
 * 决策层级
 */
enum DecisionLevel {
  CRITICAL,    // 每tick执行（现金<0，库存耗尽等）
  HIGH,        // 每6tick执行（交易决策）
  MEDIUM,      // 每24tick执行（生产调整）
  LOW,         // 每100tick执行（投资规划）
  STRATEGIC    // 每1000tick执行（战略规划）
}

/**
 * AI决策调度器
 */
class AIDecisionScheduler {
  // 缓存各公司的评估结果
  private assessmentCache: Map<number, { tick: number; data: CompanyAssessment }>;
  private strategyCache: Map<number, { tick: number; data: StrategySummary }>;
  
  constructor() {
    this.assessmentCache = new Map();
    this.strategyCache = new Map();
  }
  
  /**
   * 获取缓存的评估（如果有效）
   */
  getCachedAssessment(companyId: number, currentTick: number): CompanyAssessment | null {
    const cached = this.assessmentCache.get(companyId);
    if (cached && currentTick - cached.tick < 6) {
      return cached.data;
    }
    return null;
  }
  
  /**
   * 运行分层决策
   */
  runLayeredDecision(
    world: GameWorld, 
    companyId: number
  ): AIDecision[] {
    const tick = world.tick;
    const decisions: AIDecision[] = [];
    
    // 1. 检查是否有紧急情况（每tick）
    const criticalState = this.checkCriticalState(world, companyId);
    if (criticalState) {
      return this.handleCriticalSituation(world, companyId, criticalState);
    }
    
    // 2. 高频交易决策（每6tick）
    if (tick % 6 === companyId % 6) {
      const assessment = this.getOrUpdateAssessment(world, companyId);
      decisions.push(...this.generateQuickTradingDecisions(world, companyId, assessment));
    }
    
    // 3. 生产调整（每24tick）
    if (tick % 24 === 0) {
      decisions.push(...this.generateProductionDecisions(world, companyId));
    }
    
    // 4. 投资规划（每100tick）
    if (tick % 100 === 0) {
      decisions.push(...this.generateInvestmentDecisions(world, companyId));
    }
    
    // 5. 战略规划（每1000tick）
    if (tick % 1000 === 0) {
      this.updateStrategicPlan(world, companyId);
    }
    
    return decisions;
  }
  
  /**
   * 快速检查紧急状态（极简计算）
   */
  private checkCriticalState(world: GameWorld, companyId: number): string | null {
    const cash = world.companies.cash[companyId];
    
    // 现金为负 - 紧急
    if (cash < 0) return 'NEGATIVE_CASH';
    
    // 现金极低 - 紧急
    if (cash < 10000) return 'LOW_CASH';
    
    return null;
  }
  
  /**
   * 快速交易决策（简化版）
   */
  private generateQuickTradingDecisions(
    world: GameWorld,
    companyId: number,
    assessment: CompanyAssessment
  ): AIDecision[] {
    const decisions: AIDecision[] = [];
    
    // 只处理有库存的商品
    for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
      const invIdx = companyId * GOODS_COUNT + goodsId;
      const inventory = world.companies.inventories[invIdx];
      const reserved = world.companies.inventoryReserved[invIdx];
      const available = inventory - reserved;
      
      if (available > 5) {
        // 简化的卖出决策
        const price = world.goods.prices[goodsId] * 0.98;
        decisions.push({
          type: 'trading',
          companyId,
          action: 'sell',
          params: { goodsId, quantity: available * 0.5, price },
          priority: 6,
          expectedProfit: available * 0.5 * price,
          confidence: 0.7
        });
      }
    }
    
    return decisions;
  }
}

// 单例调度器
export const aiScheduler = new AIDecisionScheduler();
```

#### 4.2 简化AI人格系统

```typescript
// 简化: AIPersonality.ts

/**
 * 简化的人格参数（减少运行时计算）
 */
interface SimplifiedPersonality {
  // 预计算的行为参数
  sellPriceMultiplier: number;   // 卖价乘数（0.85-1.15）
  buyPriceMultiplier: number;    // 买价乘数（0.9-1.2）
  inventoryThreshold: number;    // 库存阈值
  cashReserveRatio: number;      // 现金储备比例
  expansionThreshold: number;    // 扩张阈值
  riskTolerance: number;         // 风险容忍度
}

// 预计算所有人格的简化参数
const SIMPLIFIED_PERSONALITIES: SimplifiedPersonality[] = [
  // aggressive
  { sellPriceMultiplier: 0.92, buyPriceMultiplier: 1.15, inventoryThreshold: 30, 
    cashReserveRatio: 0.2, expansionThreshold: 0.4, riskTolerance: 0.8 },
  // conservative
  { sellPriceMultiplier: 1.05, buyPriceMultiplier: 0.95, inventoryThreshold: 60,
    cashReserveRatio: 0.4, expansionThreshold: 0.6, riskTolerance: 0.3 },
  // ... 其他类型
];

// 快速获取人格参数（O(1)查找）
function getSimplifiedPersonality(companyId: number): SimplifiedPersonality {
  const typeIndex = (companyId - 1) % SIMPLIFIED_PERSONALITIES.length;
  return SIMPLIFIED_PERSONALITIES[typeIndex];
}
```

### Phase 5: 渲染和状态管理优化

#### 5.1 增量状态更新

```typescript
// 优化: gameStore.ts

/**
 * 脏标记系统
 * 只更新变化的数据
 */
class DirtyTracker {
  private dirtyGoods: Set<number> = new Set();
  private dirtyBuildings: Set<number> = new Set();
  private dirtyCompanies: Set<number> = new Set();
  private fullUpdate = false;
  
  markGoodsDirty(goodsId: number) {
    this.dirtyGoods.add(goodsId);
  }
  
  markBuildingDirty(buildingId: number) {
    this.dirtyBuildings.add(buildingId);
  }
  
  markCompanyDirty(companyId: number) {
    this.dirtyCompanies.add(companyId);
  }
  
  markFullUpdate() {
    this.fullUpdate = true;
  }
  
  getDirtyState(): DirtyState {
    return {
      goods: Array.from(this.dirtyGoods),
      buildings: Array.from(this.dirtyBuildings),
      companies: Array.from(this.dirtyCompanies),
      fullUpdate: this.fullUpdate
    };
  }
  
  clear() {
    this.dirtyGoods.clear();
    this.dirtyBuildings.clear();
    this.dirtyCompanies.clear();
    this.fullUpdate = false;
  }
}

// 在GameLoop中使用
gameLoop.onTick((result) => {
  // 只标记变化的数据
  for (const trade of result.matching.trades) {
    dirtyTracker.markGoodsDirty(trade.goodsId);
    dirtyTracker.markCompanyDirty(trade.buyCompanyId);
    dirtyTracker.markCompanyDirty(trade.sellCompanyId);
  }
  
  // 增量更新store
  set((state) => {
    const dirty = dirtyTracker.getDirtyState();
    
    if (dirty.fullUpdate) {
      // 完整更新
      state.playerCash = worldRef.companies.cash[0];
      // ...
    } else {
      // 增量更新
      if (dirty.companies.includes(0)) {
        state.playerCash = worldRef.companies.cash[0];
      }
    }
    
    dirtyTracker.clear();
  });
});
```

#### 5.2 React渲染优化

```typescript
// 优化: 使用memo和选择器

// 选择器 - 避免不必要的重新计算
const selectPlayerCash = (state: GameState) => state.playerCash;
const selectPlayerBuildings = (state: GameState) => state.playerBuildings;

// 细粒度订阅
function PlayerCashDisplay() {
  // 只订阅playerCash变化
  const cash = useGameStore(selectPlayerCash);
  return <div>¥{cash.toLocaleString()}</div>;
}

// 使用React.memo防止不必要的重渲染
const MarketRow = React.memo(({ goodsId, price, volume }: MarketRowProps) => {
  return (
    <tr>
      <td>{goodsId}</td>
      <td>{price.toFixed(2)}</td>
      <td>{volume}</td>
    </tr>
  );
}, (prev, next) => {
  // 自定义比较函数
  return prev.price === next.price && prev.volume === next.volume;
});

// 虚拟化长列表
function MarketList() {
  const goods = useGameStore(state => state.getWorld()?.goods);
  
  return (
    <VirtualList
      items={goods ? Array.from({ length: goods.count }, (_, i) => i) : []}
      itemHeight={40}
      containerHeight={400}
      renderItem={(goodsId) => (
        <MarketRow 
          key={goodsId}
          goodsId={goodsId}
          price={goods.prices[goodsId]}
          volume={goods.supplies[goodsId]}
        />
      )}
    />
  );
}
```

#### 5.3 图表渲染优化

```typescript
// 优化: PriceChart.tsx

// 数据采样 - 大数据量时降采样
function downsampleData(data: number[], maxPoints: number): number[] {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i += step) {
    // 取区间内的平均值
    let sum = 0;
    let count = 0;
    for (let j = i; j < Math.min(i + step, data.length); j++) {
      sum += data[j];
      count++;
    }
    result.push(sum / count);
  }
  
  return result;
}

// 使用requestAnimationFrame节流更新
class ChartUpdater {
  private pendingUpdate = false;
  private chartInstance: ECharts | null = null;
  
  scheduleUpdate(data: any) {
    if (this.pendingUpdate) return;
    
    this.pendingUpdate = true;
    requestAnimationFrame(() => {
      if (this.chartInstance) {
        this.chartInstance.setOption(data, { lazyUpdate: true });
      }
      this.pendingUpdate = false;
    });
  }
}
```

### Phase 6: 数据结构和索引优化

#### 6.1 建筑索引

```typescript
// 新增: BuildingIndex.ts

/**
 * 建筑快速索引
 */
class BuildingIndex {
  // 按公司分组的建筑ID
  private buildingsByOwner: Uint16Array[];
  private buildingCounts: Uint16Array;
  
  // 按类型分组的建筑ID
  private buildingsByType: Uint16Array[];
  private typeCounts: Uint16Array;
  
  constructor(maxCompanies: number, maxTypes: number, maxBuildings: number) {
    this.buildingsByOwner = new Array(maxCompanies);
    this.buildingCounts = new Uint16Array(maxCompanies);
    
    this.buildingsByType = new Array(maxTypes);
    this.typeCounts = new Uint16Array(maxTypes);
    
    for (let i = 0; i < maxCompanies; i++) {
      this.buildingsByOwner[i] = new Uint16Array(100);  // 每公司最多100建筑
    }
    for (let i = 0; i < maxTypes; i++) {
      this.buildingsByType[i] = new Uint16Array(200);   // 每类型最多200建筑
    }
  }
  
  // 添加建筑到索引
  addBuilding(buildingId: number, ownerId: number, typeId: number): void {
    const ownerCount = this.buildingCounts[ownerId];
    this.buildingsByOwner[ownerId][ownerCount] = buildingId;
    this.buildingCounts[ownerId]++;
    
    const typeCount = this.typeCounts[typeId];
    this.buildingsByType[typeId][typeCount] = buildingId;
    this.typeCounts[typeId]++;
  }
  
  // 获取公司的所有建筑
  getBuildingsByOwner(ownerId: number): Uint16Array {
    const count = this.buildingCounts[ownerId];
    return this.buildingsByOwner[ownerId].subarray(0, count);
  }
  
  // 获取某类型的所有建筑
  getBuildingsByType(typeId: number): Uint16Array {
    const count = this.typeCounts[typeId];
    return this.buildingsByType[typeId].subarray(0, count);
  }
}
```

#### 6.2 交易历史环形缓冲区

```typescript
// 优化: TradeHistory.ts

/**
 * 高效的交易历史存储
 * 使用环形缓冲区，按时间窗口聚合
 */
class TradeHistoryOptimized {
  // 按商品聚合的统计
  private hourlyStats: Float32Array;  // [GOODS_COUNT × 24 × 3] (volume, value, count)
  private currentHour: number = 0;
  
  constructor(goodsCount: number) {
    // 24小时 × (volume + value + count)
    this.hourlyStats = new Float32Array(goodsCount * 24 * 3);
  }
  
  // 记录成交
  recordTrade(goodsId: number, quantity: number, price: number, tick: number): void {
    const hour = Math.floor(tick / 1) % 24;  // 假设1tick=1小时
    const offset = (goodsId * 24 + hour) * 3;
    
    this.hourlyStats[offset] += quantity;           // volume
    this.hourlyStats[offset + 1] += quantity * price;  // value
    this.hourlyStats[offset + 2]++;                    // count
  }
  
  // 快速获取24小时统计
  get24hStats(goodsId: number): { volume: number; value: number; vwap: number; count: number } {
    let volume = 0, value = 0, count = 0;
    
    for (let h = 0; h < 24; h++) {
      const offset = (goodsId * 24 + h) * 3;
      volume += this.hourlyStats[offset];
      value += this.hourlyStats[offset + 1];
      count += this.hourlyStats[offset + 2];
    }
    
    return {
      volume,
      value,
      vwap: volume > 0 ? value / volume : 0,
      count
    };
  }
  
  // 小时切换时清理旧数据
  advanceHour(): void {
    const oldHour = this.currentHour;
    this.currentHour = (this.currentHour + 1) % 24;
    
    // 清理当前小时的旧数据
    for (let g = 0; g < GOODS_COUNT; g++) {
      const offset = (g * 24 + this.currentHour) * 3;
      this.hourlyStats[offset] = 0;
      this.hourlyStats[offset + 1] = 0;
      this.hourlyStats[offset + 2] = 0;
    }
  }
}
```

---

## 三、实施计划

### 阶段划分

```
Phase 1 (Week 1): 核心热路径优化
├── 1.1 订单簿索引重构
├── 1.2 批量成交价格缓存
└── 1.3 生产计算优化

Phase 2 (Week 2): 并行化增强
├── 2.1 Worker任务扩展
├── 2.2 SharedArrayBuffer实现
└── 2.3 多Worker并行架构

Phase 3 (Week 3): 内存管理优化
├── 3.1 消除热路径内存分配
├── 3.2 对象池增强
└── 3.3 TypedArray工具函数

Phase 4 (Week 4): AI系统优化
├── 4.1 分层决策架构
└── 4.2 简化AI人格系统

Phase 5 (Week 5): 渲染优化
├── 5.1 增量状态更新
├── 5.2 React渲染优化
└── 5.3 图表渲染优化

Phase 6 (Week 6): 数据结构优化
├── 6.1 建筑索引
└── 6.2 交易历史环形缓冲区
```

### 性能目标

| 指标 | 当前估计 | 目标 |
|------|----------|------|
| Tick处理时间 | ~50ms | <10ms |
| 订单撮合时间 | ~20ms | <3ms |
| AI决策时间 | ~15ms | <2ms |
| 生产计算时间 | ~5ms | <1ms |
| 价格更新时间 | ~5ms | <1ms |
| 内存占用 | ~150MB | <100MB |

---

## 四、优先级排序

### 高优先级（立即实施）

1. **订单簿索引重构** - 撮合是最大瓶颈
2. **批量成交价格缓存** - 减少重复遍历
3. **AI分层决策** - 减少每tick计算量

### 中优先级（第二阶段）

4. **Worker并行化** - 充分利用多核
5. **内存分配优化** - 减少GC压力
6. **增量状态更新** - 减少React渲染

### 低优先级（持续改进）

7. **图表渲染优化** - 用户体验改善
8. **数据结构索引** - 边际收益

---

## 五、风险和注意事项

1. **SharedArrayBuffer兼容性**
   - 需要设置COOP/COEP头
   - Safari支持有限

2. **Worker通信开销**
   - 数据传输可能抵消并行收益
   - 需要仔细选择Worker粒度

3. **代码复杂度**
   - 优化可能增加代码复杂度
   - 需要良好的文档和测试

4. **调试难度**
   - 多线程调试困难
   - 需要添加性能监控工具

---

## 六、性能监控

### 内置Profiler

```typescript
// 新增: PerformanceMonitor.ts

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private enabled = true;
  
  startMeasure(name: string): () => void {
    if (!this.enabled) return () => {};
    
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      this.metrics.get(name)!.push(duration);
      
      // 保留最近100个采样
      if (this.metrics.get(name)!.length > 100) {
        this.metrics.get(name)!.shift();
      }
    };
  }
  
  getReport(): PerformanceReport {
    const report: PerformanceReport = {};
    
    for (const [name, samples] of this.metrics) {
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const max = Math.max(...samples);
      const min = Math.min(...samples);
      
      report[name] = { avg, max, min, samples: samples.length };
    }
    
    return report;
  }
}

export const perfMonitor = new PerformanceMonitor();

// 使用示例
function processTick() {
  const endTotal = perfMonitor.startMeasure('tick_total');
  
  const endProduction = perfMonitor.startMeasure('production');
  updateAllProduction(world);
  endProduction();
  
  const endMatching = perfMonitor.startMeasure('matching');
  matchAllOrders(world);
  endMatching();
  
  // ...
  
  endTotal();
}
```

---

*文档版本: 1.0*
*创建日期: 2026-01-26*