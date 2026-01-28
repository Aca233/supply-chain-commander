# Tick性能深度优化计划

## 目标
将平均tick时间从当前的 **59ms** 降低到 **20ms以内**（提升67%）

## 当前性能分析

### 性能数据（来自监控JSON）
```
总快照数: 100
健康状态: 100% Critical（全部超时）
平均Tick时间: 174.66ms → 优化后约59ms
最大Tick时间: 518.2ms
最小Tick时间: 140.9ms
```

### 系统耗时分布
| 系统 | 平均耗时 | 占比 | 状态 |
|------|----------|------|------|
| AI | 80-130ms | 50-60% | 🔴 需优化 |
| Consumer | 50-90ms | 30-40% | 🔴 需优化 |
| Matching | 0.1-0.3ms | <1% | ✅ 已优化 |
| Pricing | 0-0.3ms | <1% | ✅ 良好 |
| Retail | 0-5ms | 2-5% | 🟡 可优化 |
| Finance | 0-14ms | 0-8% | 🟡 周期性峰值 |
| Other | 2-10ms | 5-10% | 🟡 可优化 |

---

## 优化策略

### 第一优先级：AI系统优化（预期收益40-50ms）

#### 1.1 AI决策批量分散处理
**问题**：当前每tick处理所有AI公司，导致AI耗时集中在单个tick

**解决方案**：
```typescript
// 在 FastDecision.ts 中
const AI_BATCH_SIZE = 20;  // 每tick处理20个公司
let aiBatchOffset = 0;

export function processAIBatch(world: GameWorld): number {
  const activeCompanies = getActiveAICompanies(world);
  const totalCompanies = activeCompanies.length;
  
  // 轮转批次
  const startIdx = aiBatchOffset;
  const endIdx = Math.min(startIdx + AI_BATCH_SIZE, totalCompanies);
  
  let decisions = 0;
  for (let i = startIdx; i < endIdx; i++) {
    decisions += fastDecision(world, activeCompanies[i]);
  }
  
  aiBatchOffset = (aiBatchOffset + AI_BATCH_SIZE) % totalCompanies;
  return decisions;
}
```

**预期收益**：AI耗时从100ms分散到5-6个tick，每tick约17ms

#### 1.2 主营商品缓存优化
**问题**：`updateMainGoods()`遍历ACTUAL_GOODS_COUNT(~100)个商品计算评分

**解决方案**：
```typescript
// 使用增量更新而非全量重算
const MAIN_GOODS_UPDATE_INTERVAL = 240;  // 从120增加到240tick
const SALES_CACHE_INTERVAL = 48;  // 每48tick更新销售缓存

// 预计算商品活跃度排名（全局，每240tick更新一次）
let globalActiveGoods: number[] = [];
let globalActiveGoodsLastUpdate = -1000;

function getActiveGoodsGlobal(world: GameWorld): number[] {
  if (world.tick - globalActiveGoodsLastUpdate < SALES_CACHE_INTERVAL) {
    return globalActiveGoods;
  }
  // 使用交易历史快速筛选活跃商品
  const recentTrades = tradeHistory.getRecent(100);
  const goodsActivity = new Map<number, number>();
  for (const trade of recentTrades) {
    goodsActivity.set(trade.goodsId, 
      (goodsActivity.get(trade.goodsId) || 0) + trade.quantity);
  }
  globalActiveGoods = Array.from(goodsActivity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)  // 只关注前30个活跃商品
    .map(e => e[0]);
  globalActiveGoodsLastUpdate = world.tick;
  return globalActiveGoods;
}
```

**预期收益**：减少90%的商品遍历，节省约10-15ms

#### 1.3 跳过低价值AI公司
**问题**：资金少的公司仍然执行完整决策流程

**解决方案**：
```typescript
// FastDecision.ts 中已有但可增强
if (cash < 10000) return 0;  // 当前阈值

// 增强版：按资产规模动态调整处理频率
const companyAssets = world.companies.totalAssets[companyId];
const processingPriority = companyAssets < 100000 ? 4 :  // 小公司每4tick处理
                          companyAssets < 500000 ? 2 :   // 中等公司每2tick
                          1;                              // 大公司每tick
                          
if (world.tick % processingPriority !== companyId % processingPriority) {
  return 0;  // 不是本tick的处理时机
}
```

**预期收益**：减少约40%的AI处理量，节省约15-20ms

---

### 第二优先级：Consumer/Retail系统优化（预期收益20-30ms）

#### 2.1 零售店商品索引优化
**问题**：`retailGoodsCache`每50tick更新，遍历所有店铺

**解决方案**：
```typescript
// 使用增量更新代替全量重建
interface IncrementalRetailCache {
  storesByGoods: Map<number, Set<number>>;  // 使用Set加速增删
  lastUpdate: number;
  dirtyGoods: Set<number>;  // 标记需要更新的商品
}

// 当库存变化时标记为dirty
function markRetailCacheDirty(goodsId: number): void {
  incrementalCache.dirtyGoods.add(goodsId);
}

// 只更新dirty的商品
function updateDirtyRetailCache(world: GameWorld): void {
  for (const goodsId of incrementalCache.dirtyGoods) {
    updateSingleGoodsCache(world, goodsId);
  }
  incrementalCache.dirtyGoods.clear();
}
```

**预期收益**：减少80%的缓存更新开销，节省约5ms

#### 2.2 消费批次优化
**问题**：`CONSUMPTION_BATCH_SIZE = 10`可能仍然过大

**解决方案**：
```typescript
// 动态批次大小，根据剩余时间预算调整
const TARGET_CONSUMER_TIME = 10;  // 目标10ms
let lastConsumerTime = 0;

const CONSUMPTION_BATCH_SIZE = Math.max(5, Math.min(15,
  Math.floor(10 * (TARGET_CONSUMER_TIME / Math.max(1, lastConsumerTime)))
));
```

**预期收益**：平滑消费处理时间，避免峰值，节省约10ms

#### 2.3 库存分配快速路径
**问题**：按库存比例分配需要遍历两次店铺列表

**解决方案**：
```typescript
// 单次遍历完成库存统计和分配
function processConsumptionFast(
  world: GameWorld, 
  goodsId: number, 
  demand: number
): number {
  const retail = world.retail;
  const storeIds = retailGoodsCache.storesByGoods.get(goodsId);
  if (!storeIds) return 0;
  
  // 单次遍历：计算总库存并预分配
  let totalStock = 0;
  const allocations: Array<{retailId: number, stock: number, idx: number}> = [];
  
  for (const retailId of storeIds) {
    const idx = retailId * GOODS_COUNT + goodsId;
    const stock = retail.inventories[idx];
    if (stock > 0) {
      totalStock += stock;
      allocations.push({retailId, stock, idx});
    }
  }
  
  if (totalStock === 0) return 0;
  
  // 快速按比例分配（避免第二次遍历）
  const ratio = Math.min(1, demand / totalStock);
  let satisfied = 0;
  
  for (const alloc of allocations) {
    const qty = alloc.stock * ratio;
    // 直接扣减和记账...
    satisfied += qty;
  }
  
  return satisfied;
}
```

**预期收益**：减少一半的店铺遍历，节省约8ms

---

### 第三优先级：状态管理优化（预期收益5-10ms）

#### 3.1 降低UI更新频率
**问题**：`UI_UPDATE_INTERVAL = 2`仍然较高

**解决方案**：
```typescript
// gameStore.ts
const UI_UPDATE_INTERVAL = 4;  // 从2增加到4（60fps下约66ms）
const HISTORY_UPDATE_INTERVAL = 12;  // 从4增加到12

// 使用requestIdleCallback进行非关键更新
if (shouldUpdateUI) {
  requestIdleCallback(() => {
    set((state) => {
      state.gameDate = formatGameDate(currentTick);
      // ...其他UI状态
    });
  }, { timeout: 50 });
}
```

**预期收益**：减少50%的状态更新开销，节省约3-5ms

#### 3.2 建筑计数缓存
**问题**：每10tick遍历所有建筑统计玩家建筑数

**解决方案**：
```typescript
// 在世界数据中维护计数
interface CompanyStats {
  buildingCount: Uint16Array;  // [MAX_COMPANIES]
  lastBuildingTick: Uint32Array;
}

// 建筑添加/删除时增量更新
function addBuilding(world: GameWorld, ownerId: number): void {
  // ...原有逻辑
  world.companyStats.buildingCount[ownerId]++;
}
```

**预期收益**：消除建筑遍历，节省约1-2ms

---

### 第四优先级：GC压力优化（预期收益3-5ms）

#### 4.1 对象池扩展
**问题**：每tick创建新的Map和数组对象

**解决方案**：
```typescript
// 复用消费结果对象
const REUSABLE_CONSUMPTION_RESULT: PopConsumptionResult = {
  totalQuantity: 0,
  totalSpent: 0,
  customerCount: 0,
  satisfiedDemand: 0,
  purchasesByGoods: new Map(),
  purchasesByRetail: new Map(),
};

function processPopConsumption(world: GameWorld): PopConsumptionResult {
  // 重置而非重建
  REUSABLE_CONSUMPTION_RESULT.totalQuantity = 0;
  REUSABLE_CONSUMPTION_RESULT.totalSpent = 0;
  REUSABLE_CONSUMPTION_RESULT.customerCount = 0;
  REUSABLE_CONSUMPTION_RESULT.satisfiedDemand = 0;
  REUSABLE_CONSUMPTION_RESULT.purchasesByGoods.clear();
  REUSABLE_CONSUMPTION_RESULT.purchasesByRetail.clear();
  
  // ...处理逻辑
  return REUSABLE_CONSUMPTION_RESULT;
}
```

#### 4.2 TypedArray替代普通数组
**问题**：部分临时计算使用普通数组

**解决方案**：
```typescript
// 预分配TypedArray用于临时计算
const TEMP_FLOAT_BUFFER = new Float32Array(256);
const TEMP_INT_BUFFER = new Int32Array(256);

// 使用预分配缓冲区
function calculateAllocation(): void {
  // 使用 TEMP_FLOAT_BUFFER 而非 new Array()
}
```

---

### 第五优先级：可选的Web Worker并行化

#### 5.1 AI决策Worker化
**问题**：AI计算阻塞主线程

**解决方案**：
```typescript
// 在WorkerManager中添加AI决策worker
const aiWorker = new Worker('./aiDecisionWorker.ts');

// 主线程
function scheduleAIDecisions(world: GameWorld): void {
  const companyData = serializeCompanyData(world);
  aiWorker.postMessage({ type: 'process', data: companyData });
}

// Worker线程
self.onmessage = (e) => {
  const decisions = processAIDecisions(e.data);
  self.postMessage(decisions);
};
```

**注意**：需要评估序列化开销，可能只在大量公司时有收益

---

## 实施路线图

### Phase 1: 快速见效优化（预期1-2小时）
1. ✅ AI批量分散处理
2. ✅ 降低UI更新频率
3. ✅ 按资产规模调整AI处理频率

**预期效果**：59ms → 35-40ms

### Phase 2: 缓存和索引优化（预期2-3小时）
1. 主营商品全局缓存
2. 零售店增量缓存
3. 建筑计数缓存

**预期效果**：35-40ms → 25-30ms

### Phase 3: 内存和GC优化（预期1-2小时）
1. 消费结果对象池
2. TypedArray临时缓冲区
3. 减少临时对象创建

**预期效果**：25-30ms → 20-25ms

### Phase 4: 可选进阶优化
1. Web Worker并行化
2. WASM关键路径
3. 增量式撮合引擎

---

## 监控指标

优化后应达到的目标：
- [ ] 平均Tick时间 < 20ms
- [ ] 最大Tick时间 < 50ms
- [ ] AI系统耗时 < 10ms
- [ ] Consumer系统耗时 < 8ms
- [ ] 健康状态 > 90% Healthy

## 风险评估

| 优化项 | 风险等级 | 潜在问题 | 缓解措施 |
|--------|----------|----------|----------|
| AI批量分散 | 低 | AI响应延迟 | 确保关键公司优先 |
| 缓存增量更新 | 中 | 数据不一致 | 添加校验逻辑 |
| 对象池复用 | 低 | 状态泄漏 | 严格重置流程 |
| Web Worker | 高 | 序列化开销 | 性能对比测试 |

---

## 代码修改清单

### 需要修改的文件
1. `src/core/ai/FastDecision.ts` - AI批量处理
2. `src/core/ai/AIScheduler.ts` - 调度优化
3. `src/core/economy/RetailSystem.ts` - 缓存优化
4. `src/core/economy/ConsumerMarket.ts` - 消费优化
5. `src/stores/gameStore.ts` - UI更新频率
6. `src/core/loop/GameLoop.ts` - 性能监控增强

### 新增文件（可选）
1. `src/core/performance/ObjectPools.ts` - 通用对象池
2. `src/core/workers/aiDecisionWorker.ts` - AI决策Worker