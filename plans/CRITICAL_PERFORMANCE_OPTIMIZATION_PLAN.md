# 关键性能优化计划

## 📊 性能问题诊断报告

### 执行摘要

**当前状态：❌ 严重性能问题**

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 平均tick时间 | 60.4ms | <16.67ms | ❌ 超标3.6倍 |
| 最大tick时间 | 85.3ms | <33ms | ❌ 超标2.6倍 |
| 健康状态 | 100% critical | >90% healthy | ❌ 完全异常 |
| 目标FPS | 60 | 60 | ⚠️ 勉强维持 |

### 系统耗时分解

```
┌─────────────────────────────────────────────────────────────────┐
│                    平均 Tick 耗时分布 (60.4ms)                    │
├─────────────────────────────────────────────────────────────────┤
│ ██████████████████████████████████████████████████ other (50%)  │
│ █████████████████████████████████████ retail (38%)              │
│ ████████ ai (10%)                                               │
│ █ production+matching+pricing (<2%)                             │
└─────────────────────────────────────────────────────────────────┘
```

| 系统 | 平均耗时 | 占比 | 优先级 |
|------|----------|------|--------|
| **other** | 28-53ms | ~50% | 🔴 P0 |
| **retail** | 21-24ms | ~38% | 🔴 P0 |
| ai | 5.8-8.8ms | ~10% | 🟡 P1 |
| production | ~0.1ms | <1% | ✅ 正常 |
| matching | ~0.1ms | <1% | ✅ 正常 |
| pricing | ~0ms | 0% | ✅ 正常 |

---

## 🔍 根因分析

### 1. 零售系统瓶颈 (21-24ms)

**问题代码：`src/core/economy/RetailSystem.ts`**

#### 问题点 A：订单遍历 O(n)

```typescript
// processRestocking() 中的 purchaseFromSellOrders()
for (let i = 0; i < 10000; i++) {  // MAX_ORDERS
  if (!o.isActive[i]) continue;
  if (o.goodsIds[i] !== goodsId) continue;
  // ... 遍历所有订单
}
```

**影响：** 每个商品每次进货都要遍历10000个订单槽位

#### 问题点 B：重复计算

```typescript
// countExistingBuyOrders() 每次进货检查都调用
for (let i = 0; i < MAX_ORDERS; i++) {
  // ... 再次遍历所有订单
}
```

**影响：** 每个零售店每个商品都重复计算

#### 问题点 C：排序开销

```typescript
eligibleSellOrders.sort((a, b) => a.price - b.price);
```

**影响：** O(n log n) 排序在热路径中

### 2. "Other"类别未追踪系统 (28-53ms)

以下系统没有性能监控，但每tick都执行：

| 系统 | 文件 | 预估影响 |
|------|------|----------|
| autoFeedBuildings | ProductionEngine.ts | 🟡 中等 |
| inventoryDecayManager | InventoryDecay.ts | 🟢 低 |
| logisticsManager | LogisticsSystem.ts | 🟡 中等 |
| supplyContractManager | SupplyContracts.ts | 🟡 中等 |
| advancedOrderManager | AdvancedOrders.ts | 🟢 低 |
| distributionManager | DistributionChannels.ts | 🟡 中等 |
| bankingSystem | BankingSystem.ts | 🟢 低 |
| stockMarket | StockMarket.ts | 🟡 中等 |
| acquisitionSystem | AcquisitionSystem.ts | 🟢 低 |
| constructionTick | ConstructionTick.ts | 🟢 低 |
| **Zustand回调** | gameStore.ts | 🔴 高 |

**特别注意：** 峰值时"other"达到53ms，与GC或状态同步有关。

### 3. AI系统峰值 (8.8ms)

虽然已经有调度器优化，但某些tick会有峰值：
- 每30tick: standard决策批次
- 每120tick: deep决策批次

### 4. 对象池未生效

```json
"pools": {
  "orders": { "hitRate": 0 },
  "events": { "hitRate": 0 },
  "trades": { "hitRate": 0 },
  "pricePoints": { "hitRate": 0 }
}
```

对象池的`hitRate`全部为0，说明没有正确使用对象复用。

---

## 🛠️ 优化方案

### Phase 1：零售系统优化 (预期减少20ms)

#### 1.1 添加商品→卖单索引

```typescript
// 新增：OrderBookIndex 按商品ID索引卖单
interface SellOrderIndex {
  byGoodsId: Map<number, Set<number>>; // goodsId → orderIds
  lastUpdate: number;
}

// 使用索引后的查询
const orderIds = sellOrderIndex.byGoodsId.get(goodsId);
for (const orderId of orderIds) {
  // 只遍历相关订单，O(k) k << n
}
```

#### 1.2 批量进货处理

```typescript
// 当前：每个零售店每个商品独立进货
// 优化后：合并同商品需求，统一处理

interface RestockBatch {
  goodsId: number;
  requests: Array<{retailId: number; quantity: number}>;
}

function processRestockingBatched(world: GameWorld): number {
  // 1. 收集所有进货需求
  const batches = collectRestockRequests(world);
  
  // 2. 按商品批量处理
  for (const batch of batches) {
    batchPurchaseFromMarket(world, batch);
  }
}
```

#### 1.3 缓存现有订单统计

```typescript
// 新增：公司订单缓存
interface CompanyOrderCache {
  buyOrdersByGoods: Map<number, number>; // goodsId → totalQuantity
  lastUpdate: number;
  dirty: boolean;
}

// 订单创建/删除时标记dirty
// 只在dirty时重新计算
```

#### 1.4 降低进货频率

```typescript
// 当前：RESTOCK_INTERVAL = 12 (每12tick检查)
// 优化：RESTOCK_INTERVAL = 24 (每天检查)
// 并且分散到不同的tick避免集中处理
const shouldRestock = (retailId + world.tick) % 24 === 0;
```

### Phase 2：添加"Other"系统监控 (定位问题)

#### 2.1 细化性能追踪

```typescript
// GameLoop.ts 中添加更多监控点
const endAutoFeed = perfMonitor.startMeasure('autoFeed');
autoFeedBuildings(this.world);
endAutoFeed();

const endDecay = perfMonitor.startMeasure('inventoryDecay');
const decayEvents = inventoryDecayManager.processDailyDecay(currentTick);
endDecay();

const endLogistics = perfMonitor.startMeasure('logistics');
const deliveredShipments = logisticsManager.updateShipments(currentTick);
endLogistics();

// ... 为每个系统添加监控
```

#### 2.2 状态更新批处理

```typescript
// 当前：每tick直接修改world并触发Zustand更新
// 优化：使用batch update减少渲染触发

import { unstable_batchedUpdates } from 'react-dom';

unstable_batchedUpdates(() => {
  // 所有状态更新在这里完成
  // 只触发一次重渲染
});
```

### Phase 3：AI系统优化 (预期减少3ms峰值)

#### 3.1 更均匀的负载分散

```typescript
// 当前：某些tick会集中执行多种决策
// 优化：使用错位调度

const config = {
  fastInterval: 3,
  standardInterval: 30,
  deepInterval: 120,
  
  // 新增：错位偏移
  standardOffset: 15,  // 错开fast的高峰
  deepOffset: 60,      // 错开standard的高峰
};

// 执行时检查
if ((world.tick + config.standardOffset) % config.standardInterval === 0) {
  this.processStandardBatch(world, startTime);
}
```

#### 3.2 时间预算严格执行

```typescript
private processFastBatch(world: GameWorld, startTime: number): void {
  // 当前：只检查0.5倍时间预算
  // 优化：动态调整，如果前面用了太多就提前停止
  
  const elapsedSoFar = performance.now() - this.tickStartTime;
  const remainingBudget = this.config.maxTimePerTick - elapsedSoFar;
  
  if (remainingBudget < 1) return; // 严格不超时
  // ...
}
```

### Phase 4：对象池优化 (预期减少GC压力)

#### 4.1 正确使用对象池

```typescript
// 当前：直接创建对象
const trade = {
  buyOrderId: ...,
  sellOrderId: ...,
  // ...
};

// 优化：从池中获取
const trade = tradePool.acquire();
trade.buyOrderId = ...;
trade.sellOrderId = ...;
// 使用完后
tradePool.release(trade);
```

#### 4.2 预热对象池

```typescript
// 游戏启动时预创建对象
function warmupPools() {
  for (let i = 0; i < 1000; i++) {
    const obj = orderPool.acquire();
    orderPool.release(obj);
  }
}
```

---

## 📋 实施计划

### 阶段 1：紧急修复 (1-2天)

| 任务 | 预期收益 | 复杂度 |
|------|----------|--------|
| 添加商品→订单索引 | -10ms | 中 |
| 批量进货处理 | -5ms | 中 |
| 降低进货频率到24tick | -3ms | 低 |
| 缓存订单统计 | -2ms | 低 |

**预期结果：** tick时间从60ms降到40ms

### 阶段 2：系统监控 (1天)

| 任务 | 预期收益 | 复杂度 |
|------|----------|--------|
| 细化other系统监控 | 定位问题 | 低 |
| 添加GC监控 | 定位问题 | 低 |
| 状态更新批处理 | -10ms | 中 |

**预期结果：** 定位"other"瓶颈，tick时间降到30ms

### 阶段 3：深度优化 (2-3天)

| 任务 | 预期收益 | 复杂度 |
|------|----------|--------|
| AI负载错位调度 | 峰值-3ms | 低 |
| 对象池正确使用 | 减少GC | 中 |
| Web Worker分离计算 | -10ms | 高 |

**预期结果：** tick时间降到15ms以下，达到健康状态

---

## 🎯 验收标准

| 指标 | 当前 | 阶段1后 | 阶段2后 | 最终目标 |
|------|------|---------|---------|----------|
| 平均tick时间 | 60ms | <40ms | <30ms | <15ms |
| 最大tick时间 | 85ms | <60ms | <45ms | <30ms |
| 健康比例 | 0% | >50% | >80% | >95% |

---

## 📁 相关文件

需要修改的核心文件：

1. `src/core/economy/RetailSystem.ts` - 零售系统优化
2. `src/core/market/OrderBookIndex.ts` - 添加商品索引
3. `src/core/loop/GameLoop.ts` - 添加监控点
4. `src/core/ai/AIScheduler.ts` - 负载均衡优化
5. `src/core/performance/ObjectPool.ts` - 对象池修复
6. `src/stores/gameStore.ts` - 状态更新批处理

---

## 🔄 下一步行动

1. **立即**：审查并确认此优化计划
2. **Phase 1**：实施零售系统优化
3. **验证**：运行性能测试，验证改善效果
4. **迭代**：根据新的性能数据调整优化策略

---

*创建时间：2026-01-27*
*基于：performance-2026-01-27T18-52-39-928Z.json 分析*