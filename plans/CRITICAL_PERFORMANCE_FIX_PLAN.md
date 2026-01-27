# 关键性能问题修复计划

## 1. 性能数据分析摘要

### 1.1 当前性能状态（来自100个tick的采样）

| 指标 | 数值 | 目标 | 状态 |
|------|------|------|------|
| 平均Tick时间 | **74.58ms** | <16ms | 🔴 严重超标 |
| 最大Tick时间 | 77.10ms | <33ms | 🔴 严重超标 |
| 最小Tick时间 | 72.70ms | - | - |
| 健康状态分布 | 100% Critical | - | 🔴 全部异常 |
| 内存使用 | 1.5-2.3% | <50% | 🟢 正常 |

### 1.2 时间分解（Breakdown）

```
┌─────────────────────────────────────────────────────────────┐
│ Tick时间分解（平均值）                                         │
├─────────────────────────────────────────────────────────────┤
│ AI决策系统      ████████████████████████████████  48.8ms (65.4%) │
│ 零售系统        ███████                          10.5ms (14.1%) │
│ 其他系统        ██████████                       15.1ms (20.2%) │
│ 生产系统        ▌                                 0.1ms (0.1%)  │
│ 撮合系统        ▌                                 0.1ms (0.1%)  │
│ 定价系统        ▌                                 0.0ms (0.0%)  │
├─────────────────────────────────────────────────────────────┤
│ 总计                                              74.6ms        │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 对象池使用情况（异常！）

所有对象池的 **hitRate = 0**，表示对象池完全没有被使用：

- orders: poolSize=10, activeCount=0, hitRate=0
- events: poolSize=10, activeCount=0, hitRate=0  
- trades: poolSize=10, activeCount=0, hitRate=0
- pricePoints: poolSize=10, activeCount=0, hitRate=0
- typedArrays: pooledBytes=0, hitRate=0

---

## 2. 问题根因分析

### 2.1 AI决策系统（48.8ms/tick - 主要瓶颈）

**问题1: 每tick处理过多AI公司**

当前代码路径：
```
GameLoop.processTick()
  → processAITick() [AIScheduler.ts]
    → processFastBatch() - 每tick处理30个公司
    → processStandardBatch() - 每10tick处理5个公司
    → processDeepBatch() - 每60tick处理2个公司
```

问题：
- `fastBatchSize: 30` 意味着每tick要处理30个公司的快速决策
- 每个公司的`fastDecision()`虽然设计简单，但实际调用了`getCachedPrediction()`
- `getCachedPrediction()`触发`indicatorCache.ensureCache()`，每tick重建一次完整缓存

**问题2: 指标缓存重建开销过大**

`IndicatorCache.rebuildCache()`在每个tick被调用时：
- 遍历所有`ACTUAL_GOODS_COUNT`个商品
- 每个商品计算：SMA(5,10,20), EMA(5,10,20), RSI, MACD, ATR, 布林带
- 生成价格预测、拐点分析、交易时机

这个设计假设每tick只调用一次，但实际上：
```
AI调度器调用processAITick()
  → 第一次getCachedPrediction() → rebuildCache() [构建缓存]
  → 后续调用使用缓存 ✓
  
但问题是：
- autoPostSellOrders()和autoPostBuyOrders()也在GameLoop中被调用
- 这些函数也可能触发重建
```

**问题3: AIDecisionEngine过于复杂**

`runAIDecisionCycle()`函数调用链：
```
runAIDecisionCycle()
  → ensureAISystemsInitialized()
  → assessCompanyState() - 计算公司状态
  → evaluatePersonalityGoalGap()
  → performRiskAssessment() - 风险评估
  → updateCompetitorProfiles() - 竞争情报
  → getCompetitiveSummary()
  → generateCompetitiveResponses()
  → updateStrategicPlan() - 战略规划
  → getStrategySummary()
  → getCurrentPlanActions()
  → detectScenarios()
  → getRecommendedActions()
  → generateProductionDecisions()
  → generatePricingDecisions()
  → generateTradingDecisions()
  → generateInvestmentDecisions()
  → generateTradingSignals()
  → generateAdvancedTradeDecisionsFromSignals()
  → generatePredictiveTradeDecisions()
  → adjustDecisionByPersonality()
  → applyBehaviorToDecision()
  → filterDecisionsByPersonality()
  → applyRiskFiltersToDecisions()
  → applyCompetitiveResponseToDecisions()
  → alignDecisionsWithStrategy()
  → calculateDecisionScore()
  → executeDecision() × N次
  → recordDecision() × N次
```

即使是"快速决策"模式，完整调用链仍然很重。

### 2.2 零售系统（10.5ms/tick）

**问题: Pop消费循环嵌套过深**

```typescript
processPopConsumption()
  → for each CONSUMER_TIER (5个层级)
    → calculateTierDemands() - 遍历所有消费品
    → for each goodsId in demands
      → findStoresWithGoods() - 遍历所有零售店
        → for each retailId
          → getRetailConfig()
          → 检查库存、计算吸引力
      → allocateDemandToStores()
      → for each allocation
        → executeRetailPurchase()
```

复杂度: O(消费者层级 × 商品数 × 零售店数)

### 2.3 对象池未使用

对象池存在但未被正确集成到订单/交易创建流程中。当前`createBuyOrder()`和`createSellOrder()`直接操作`world.orders`数组，没有通过对象池。

---

## 3. 优化方案

### 3.1 AI系统优化（目标：从48ms降到5ms）

#### 3.1.1 降低处理频率和批次大小

```typescript
// AIScheduler.ts 配置修改
const OPTIMIZED_CONFIG: AISchedulerConfig = {
  fastBatchSize: 5,        // 从30降到5
  standardBatchSize: 2,    // 从5降到2
  deepBatchSize: 1,        // 从2降到1
  
  fastInterval: 3,         // 从1改为每3tick执行
  standardInterval: 30,    // 从10改为每30tick执行
  deepInterval: 120,       // 从60改为每120tick执行
  
  maxTimePerTick: 5,       // 从10ms降到5ms
  // ...
};
```

#### 3.1.2 指标缓存优化

```typescript
// IndicatorCache.ts 优化
class IndicatorCacheManager {
  private cache: GlobalIndicatorCache | null = null;
  private rebuildInterval = 6; // 每6tick重建一次，而不是每tick
  
  private ensureCache(world: GameWorld): GlobalIndicatorCache {
    // 每N tick重建一次，其他时间复用
    if (!this.cache || (world.tick - this.cache.tick >= this.rebuildInterval)) {
      this.rebuildCache(world);
    }
    return this.cache!;
  }
  
  // 增量更新：只更新变化的商品
  private incrementalUpdate(world: GameWorld): void {
    if (!this.cache) return;
    
    // 只更新有交易活动的商品
    for (const goodsId of this.getActivelyTradedGoods(world)) {
      // 更新单个商品的指标
      const indicators = calculateAllIndicators(world, goodsId);
      this.cache.indicators.set(goodsId, indicators);
      // ... 更新其他缓存
    }
  }
}
```

#### 3.1.3 简化快速决策路径

```typescript
// FastDecision.ts 进一步简化
export function fastDecision(world: GameWorld, companyId: number): number {
  // 跳过低活跃度公司
  const cash = world.companies.cash[companyId];
  if (cash < 10000) return 0; // 资金太少，跳过
  
  // 使用更简单的规则，完全跳过价格预测
  const mainGoods = getMainGoods(world, companyId);
  if (mainGoods.length === 0) return 0;
  
  // 只处理1-2个最重要的商品
  const topGoods = mainGoods.slice(0, 2);
  
  let decisions = 0;
  for (const goodsId of topGoods) {
    decisions += ultraFastGoodsDecision(world, companyId, goodsId);
  }
  
  return decisions;
}

// 超简化的单商品决策
function ultraFastGoodsDecision(
  world: GameWorld,
  companyId: number,
  goodsId: number
): number {
  const idx = companyId * GOODS_COUNT + goodsId;
  const inventory = world.companies.inventories[idx];
  const price = world.goods.prices[goodsId];
  
  // 极简规则：库存>200就卖，库存<20就买
  if (inventory > 200) {
    const sellQty = Math.floor(inventory * 0.3);
    const sellPrice = price * 0.98;
    createSellOrder(world, companyId, goodsId, sellQty, sellPrice);
    return 1;
  }
  
  if (inventory < 20 && world.companies.cash[companyId] > price * 100) {
    createBuyOrder(world, companyId, goodsId, 50, price * 1.02);
    return 1;
  }
  
  return 0;
}
```

#### 3.1.4 分离复杂决策到后台

```typescript
// 使用Web Worker处理复杂AI决策
// AIWorker.ts
self.onmessage = (e) => {
  const { type, companyId, worldSnapshot } = e.data;
  
  if (type === 'DEEP_DECISION') {
    // 在Worker中执行复杂决策
    const decisions = runComplexAIDecision(worldSnapshot, companyId);
    self.postMessage({ companyId, decisions });
  }
};
```

### 3.2 零售系统优化（目标：从10.5ms降到2ms）

#### 3.2.1 预计算和缓存

```typescript
// RetailSystem.ts 优化
class RetailCache {
  private storesByGoods: Map<number, number[]> = new Map();
  private lastUpdateTick = -1;
  private updateInterval = 24; // 每24tick更新一次
  
  ensureCache(world: GameWorld): void {
    if (world.tick - this.lastUpdateTick >= this.updateInterval) {
      this.rebuildStoreIndex(world);
      this.lastUpdateTick = world.tick;
    }
  }
  
  // 预建商品→零售店索引
  private rebuildStoreIndex(world: GameWorld): void {
    this.storesByGoods.clear();
    const retail = world.retail;
    
    for (let retailId = 0; retailId < retail.count; retailId++) {
      const buildingId = retail.buildingIds[retailId];
      const buildingType = world.buildings.types[buildingId];
      const config = getRetailConfig(buildingType);
      
      if (config) {
        for (const goodsId of config.allowedGoodsIds) {
          if (!this.storesByGoods.has(goodsId)) {
            this.storesByGoods.set(goodsId, []);
          }
          this.storesByGoods.get(goodsId)!.push(retailId);
        }
      }
    }
  }
  
  getStoresForGoods(goodsId: number): number[] {
    return this.storesByGoods.get(goodsId) || [];
  }
}

const retailCache = new RetailCache();
```

#### 3.2.2 简化消费分配

```typescript
// 简化版Pop消费
function processPopConsumptionOptimized(world: GameWorld): PopConsumptionResult {
  retailCache.ensureCache(world);
  
  const result: PopConsumptionResult = { /*...*/ };
  
  // 合并所有层级的需求
  const totalDemands = aggregateTierDemands(world);
  
  // 按商品批量处理
  for (const [goodsId, demand] of totalDemands) {
    if (demand < 0.1) continue;
    
    // 快速查找有货的商店
    const stores = retailCache.getStoresForGoods(goodsId);
    if (stores.length === 0) continue;
    
    // 简单均分或按库存比例分配
    processGoodsDemand(world, goodsId, demand, stores, result);
  }
  
  return result;
}
```

### 3.3 对象池集成

```typescript
// OrderBook.ts 修改
import { orderPool, OrderPoolItem } from '../performance/ObjectPool';

export function createBuyOrder(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  quantity: number,
  price: number
): number | null {
  // 从对象池获取订单对象
  const orderItem = orderPool.acquire();
  
  // 填充订单数据
  orderItem.companyId = companyId;
  orderItem.goodsId = goodsId;
  orderItem.type = 0; // buy
  orderItem.quantity = quantity;
  orderItem.price = price;
  orderItem.createdTick = world.tick;
  
  // 找到空闲槽位
  const orderId = findFreeOrderSlot(world);
  if (orderId === null) {
    orderPool.release(orderItem);
    return null;
  }
  
  // 写入world.orders
  writeOrderToWorld(world, orderId, orderItem);
  orderPool.release(orderItem);
  
  return orderId;
}
```

### 3.4 增量更新策略

```typescript
// GameLoop.ts 优化
private processTick(): TickResult {
  const tick = ++this.world.tick;
  
  // 每tick都执行
  const essentialResult = this.processEssential();
  
  // 每N tick执行的任务
  if (tick % 3 === 0) {
    this.processAIFast();
  }
  
  if (tick % 6 === 0) {
    this.processRetail();
  }
  
  if (tick % 24 === 0) {
    this.processDaily();
  }
  
  if (tick % 30 === 0) {
    this.processAIStandard();
  }
  
  if (tick % 120 === 0) {
    this.processAIDeep();
  }
  
  return result;
}
```

---

## 4. 实施优先级

### 阶段1: 紧急修复（预计效果：从74ms降到30ms）

1. **修改AIScheduler配置**
   - 降低fastBatchSize到5
   - 增加fastInterval到3
   - 实施时间预算强制退出

2. **优化指标缓存**
   - 增加缓存有效期到6tick
   - 跳过不活跃商品的计算

### 阶段2: 核心优化（预计效果：从30ms降到15ms）

1. **简化快速决策**
   - 实现ultraFastGoodsDecision
   - 移除所有复杂分析调用

2. **零售系统优化**
   - 实现RetailCache
   - 简化消费分配逻辑

### 阶段3: 完善（预计效果：从15ms降到10ms以下）

1. **对象池集成**
2. **Web Worker分离复杂AI决策**
3. **增量更新策略全面实施**

---

## 5. 验证方法

### 5.1 性能基准测试

```typescript
// 在优化前后运行相同的100tick测试
function runPerformanceBenchmark(): BenchmarkResult {
  const snapshots = [];
  
  for (let i = 0; i < 100; i++) {
    perfMonitor.startTick();
    gameLoop.manualTick();
    const report = perfMonitor.endTick(i);
    snapshots.push(report);
  }
  
  return {
    avgTickTime: average(snapshots.map(s => s.totalTime)),
    maxTickTime: max(snapshots.map(s => s.totalTime)),
    healthyPercent: snapshots.filter(s => s.totalTime < 16).length,
  };
}
```

### 5.2 成功标准

| 指标 | 当前 | 阶段1目标 | 阶段2目标 | 最终目标 |
|------|------|----------|----------|----------|
| 平均Tick时间 | 74.6ms | <35ms | <18ms | <12ms |
| Critical比例 | 100% | <50% | <10% | 0% |
| AI耗时 | 48.8ms | <20ms | <8ms | <5ms |
| 零售耗时 | 10.5ms | <8ms | <4ms | <2ms |

---

## 6. 架构建议（长期）

### 6.1 计算分离架构

```
┌─────────────────────────────────────────────────────────────┐
│                      主线程（渲染 + 核心游戏逻辑）              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ 渲染UI      │  │ 生产/撮合  │  │ 简单AI决策  │          │
│  │ <16ms      │  │ <1ms       │  │ <3ms        │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└───────────────────────────┬─────────────────────────────────┘
                            │ 消息传递
┌───────────────────────────┼─────────────────────────────────┐
│          Worker线程池（后台计算）                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ AI深度决策  │  │ 技术指标    │  │ 市场分析    │          │
│  │ 无时间限制  │  │ 批量计算    │  │ 竞争情报    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 数据结构优化

考虑使用SharedArrayBuffer在主线程和Worker之间共享游戏状态，避免序列化开销。

---

## 7. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 降低AI决策频率可能影响AI行为智能度 | 中 | 保留关键决策逻辑，只简化非必要计算 |
| 缓存过期数据可能导致决策偏差 | 低 | 6tick的缓存周期对游戏经济影响很小 |
| Worker通信延迟 | 低 | 非关键路径异步处理 |

---

## 8. 结论

当前性能问题的根因是AI决策系统设计过于复杂，每tick执行了过多的分析和计算。通过降低处理频率、简化决策路径、利用缓存和增量更新，预计可以将tick时间从74ms降到10ms以下，满足60FPS的实时游戏要求。

建议立即实施阶段1的紧急修复，然后逐步推进更深层的优化。