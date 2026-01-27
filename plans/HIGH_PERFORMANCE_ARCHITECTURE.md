# 高性能经济模拟引擎架构方案

> **目标**: 在单机环境下实现60+商品、100+建筑、1000+订单/tick的实时模拟，tick时间<10ms

---

## 一、核心设计原则

1. **数据局部性优先** - 相关数据紧密存储，减少缓存未命中
2. **批量处理** - 避免逐个处理，一次性批量计算
3. **预计算缓存** - 能缓存的结果绝不重复计算
4. **零分配热路径** - 核心循环中避免内存分配
5. **并行化** - 可并行的计算绝不串行

---

## 二、数据结构设计：结构体数组（SoA）

### 2.1 传统OOP vs SoA

**传统OOP（慢）：**
```typescript
// 对象数组 - 缓存不友好
class Building {
  id: string;
  ownerId: string;
  efficiency: number;
  inputRates: number[];
  outputRates: number[];
  // ... 更多属性
}
buildings: Building[] // 每个对象属性分散在内存中
```

**SoA结构（快）：**
```typescript
// 结构体数组 - 缓存友好
interface BuildingArrays {
  count: number;
  // 连续内存存储，同类数据相邻
  ids: Uint32Array;           // 4字节 × N
  ownerIds: Uint16Array;      // 2字节 × N（最多65536公司）
  efficiencies: Float32Array; // 4字节 × N
  inputRates: Float32Array;   // 固定大小矩阵 [N × MAX_INPUTS]
  outputRates: Float32Array;  // 固定大小矩阵 [N × MAX_OUTPUTS]
  // ...
}
```

### 2.2 核心数据结构

```typescript
// ==================== 全局状态 ====================

interface GameWorld {
  tick: number;
  
  // 商品系统（固定大小，编译时确定）
  goods: {
    count: number;                    // 商品种类数（~60）
    prices: Float32Array;             // 当前价格
    baseValues: Float32Array;         // 基准价值
    supplies: Float32Array;           // 当tick总供给
    demands: Float32Array;            // 当tick总需求
    // 价格历史用环形缓冲区
    priceHistory: Float32Array;       // [GOODS_COUNT × HISTORY_SIZE]
    historyIndex: number;
  };
  
  // 建筑系统
  buildings: {
    count: number;
    maxCount: number;                 // 预分配上限
    
    // 基础属性（紧凑数组）
    types: Uint8Array;                // 建筑类型ID（最多256种）
    owners: Uint16Array;              // 所属公司ID
    levels: Uint8Array;               // 等级1-5
    efficiencies: Float32Array;       // 效率0-1.5
    
    // 生产状态（固定槽位）
    slotMethods: Uint8Array;          // [N × MAX_SLOTS] 每槽位当前方法
    productionProgress: Float32Array; // 生产进度0-1
    
    // 输入输出缓冲区
    inputBuffers: Float32Array;       // [N × MAX_INPUTS]
    outputBuffers: Float32Array;      // [N × MAX_OUTPUTS]
  };
  
  // 公司系统
  companies: {
    count: number;
    cash: Float64Array;               // 现金（用64位避免精度问题）
    // 库存用稀疏矩阵或压缩格式
    inventories: Float32Array;        // [COMPANY_COUNT × GOODS_COUNT]
    inventoryReserved: Float32Array;  // 预留的库存
  };
  
  // 订单系统（预分配池）
  orders: {
    maxOrders: number;                // 预分配上限（如10000）
    activeCount: number;
    
    // 订单数据
    companyIds: Uint16Array;
    goodsIds: Uint8Array;
    types: Uint8Array;                // 0=buy, 1=sell
    quantities: Float32Array;
    prices: Float32Array;
    remainings: Float32Array;
    expiries: Uint32Array;
    
    // 状态标记
    isActive: Uint8Array;             // 位图：0=空闲, 1=活跃
    
    // 快速索引（按商品分组）
    buyOrdersByGoods: Uint16Array[];  // 每商品的买单索引列表
    sellOrdersByGoods: Uint16Array[]; // 每商品的卖单索引列表
  };
}
```

---

## 三、计算引擎：SIMD + 批量处理

### 3.1 生产计算（向量化）

```typescript
// ==================== 生产批量计算 ====================

function updateAllProduction(world: GameWorld): void {
  const b = world.buildings;
  const c = world.companies;
  const g = world.goods;
  
  // 预获取常量
  const buildingCount = b.count;
  
  // 一次循环处理所有建筑
  for (let i = 0; i < buildingCount; i++) {
    const type = b.types[i];
    const owner = b.owners[i];
    const efficiency = b.efficiencies[i];
    const progress = b.productionProgress[i];
    
    // 获取配方（预编译的查找表）
    const recipe = RECIPE_TABLE[type];
    
    // 计算本tick产出
    const tickOutput = efficiency * recipe.baseOutput / recipe.ticksRequired;
    
    // 检查输入是否足够（向量化比较）
    let canProduce = true;
    const inputOffset = i * MAX_INPUTS;
    for (let j = 0; j < recipe.inputCount; j++) {
      if (b.inputBuffers[inputOffset + j] < recipe.inputAmounts[j] * tickOutput) {
        canProduce = false;
        break;
      }
    }
    
    if (canProduce) {
      // 消耗输入
      for (let j = 0; j < recipe.inputCount; j++) {
        b.inputBuffers[inputOffset + j] -= recipe.inputAmounts[j] * tickOutput;
      }
      
      // 产出到输出缓冲区
      const outputOffset = i * MAX_OUTPUTS;
      for (let j = 0; j < recipe.outputCount; j++) {
        const goodsId = recipe.outputGoods[j];
        const amount = recipe.outputAmounts[j] * tickOutput;
        b.outputBuffers[outputOffset + j] += amount;
        
        // 直接更新公司库存
        const inventoryIdx = owner * GOODS_COUNT + goodsId;
        c.inventories[inventoryIdx] += amount;
        
        // 记录供给
        g.supplies[goodsId] += amount;
      }
    }
  }
}
```

### 3.2 订单撮合（批量处理）

```typescript
// ==================== 高效订单撮合 ====================

function matchAllOrders(world: GameWorld): void {
  const o = world.orders;
  const g = world.goods;
  const c = world.companies;
  
  // 按商品并行处理（可分配到多个Worker）
  for (let goodsId = 0; goodsId < g.count; goodsId++) {
    matchOrdersForGoods(world, goodsId);
  }
}

function matchOrdersForGoods(world: GameWorld, goodsId: number): void {
  const o = world.orders;
  const c = world.companies;
  
  // 获取该商品的买卖单索引
  const buyIndices = o.buyOrdersByGoods[goodsId];
  const sellIndices = o.sellOrdersByGoods[goodsId];
  
  if (buyIndices.length === 0 || sellIndices.length === 0) return;
  
  // 买单按价格降序（愿意付高价的优先）
  // 卖单按价格升序（愿意低卖的优先）
  // 注意：索引已在插入时维护有序
  
  let buyPtr = 0;
  let sellPtr = 0;
  
  while (buyPtr < buyIndices.length && sellPtr < sellIndices.length) {
    const buyIdx = buyIndices[buyPtr];
    const sellIdx = sellIndices[sellPtr];
    
    // 跳过已完成的订单
    if (!o.isActive[buyIdx]) { buyPtr++; continue; }
    if (!o.isActive[sellIdx]) { sellPtr++; continue; }
    
    const buyPrice = o.prices[buyIdx];
    const sellPrice = o.prices[sellIdx];
    
    // 价格不匹配，终止
    if (buyPrice < sellPrice) break;
    
    // 可成交
    const buyRemaining = o.remainings[buyIdx];
    const sellRemaining = o.remainings[sellIdx];
    const matchQty = Math.min(buyRemaining, sellRemaining);
    const matchPrice = sellPrice; // 使用卖价
    
    // 执行成交
    const buyCompany = o.companyIds[buyIdx];
    const sellCompany = o.companyIds[sellIdx];
    const totalValue = matchQty * matchPrice;
    
    // 更新公司资金
    c.cash[buyCompany] -= totalValue;
    c.cash[sellCompany] += totalValue;
    
    // 更新库存
    const buyInvIdx = buyCompany * GOODS_COUNT + goodsId;
    const sellInvIdx = sellCompany * GOODS_COUNT + goodsId;
    c.inventories[buyInvIdx] += matchQty;
    c.inventoryReserved[sellInvIdx] -= matchQty;
    
    // 更新订单剩余
    o.remainings[buyIdx] -= matchQty;
    o.remainings[sellIdx] -= matchQty;
    
    // 标记完成的订单
    if (o.remainings[buyIdx] <= 0) {
      o.isActive[buyIdx] = 0;
      buyPtr++;
    }
    if (o.remainings[sellIdx] <= 0) {
      o.isActive[sellIdx] = 0;
      sellPtr++;
    }
    
    // 记录成交用于价格发现（延迟批量处理）
    recordTrade(goodsId, matchQty, matchPrice);
  }
}
```

### 3.3 价格更新（向量化）

```typescript
// ==================== 批量价格更新 ====================

function updateAllPrices(world: GameWorld): void {
  const g = world.goods;
  
  for (let i = 0; i < g.count; i++) {
    const supply = g.supplies[i];
    const demand = g.demands[i];
    const currentPrice = g.prices[i];
    const baseValue = g.baseValues[i];
    
    // 供需比计算
    const ratio = demand / (supply + 0.001); // 避免除零
    
    // 价格调整
    let priceChange: number;
    if (ratio > 1.1) {
      // 需求大于供给，涨价
      priceChange = Math.min(0.05, (ratio - 1) * 0.02);
    } else if (ratio < 0.9) {
      // 供给大于需求，跌价
      priceChange = Math.max(-0.05, (ratio - 1) * 0.02);
    } else {
      // 均值回归
      priceChange = (baseValue - currentPrice) / currentPrice * 0.002;
    }
    
    // 应用变化
    g.prices[i] = currentPrice * (1 + priceChange);
    
    // 记录历史（环形缓冲区）
    const historyIdx = i * HISTORY_SIZE + g.historyIndex;
    g.priceHistory[historyIdx] = g.prices[i];
    
    // 重置供需计数
    g.supplies[i] = 0;
    g.demands[i] = 0;
  }
  
  // 推进历史指针
  g.historyIndex = (g.historyIndex + 1) % HISTORY_SIZE;
}
```

---

## 四、多线程架构

### 4.1 Worker分工

```
┌─────────────────────────────────────────────────────────────┐
│                      主线程 (Coordinator)                     │
│  - 游戏循环调度                                               │
│  - 状态同步                                                   │
│  - 客户端通信                                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │ SharedArrayBuffer
    ┌─────────────┼─────────────┬─────────────┬─────────────┐
    ▼             ▼             ▼             ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Production│ │ Market  │ │ Market  │ │ POPs    │ │  AI     │
│ Worker  │ │Worker #1│ │Worker #2│ │ Worker  │ │ Worker  │
│         │ │商品0-29 │ │商品30-59│ │         │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 4.2 SharedArrayBuffer共享内存

```typescript
// ==================== 共享内存设计 ====================

// 主线程初始化
const TOTAL_SIZE = 
  4 +                                    // tick
  GOODS_COUNT * 4 +                      // prices
  GOODS_COUNT * 4 +                      // supplies
  GOODS_COUNT * 4 +                      // demands
  MAX_BUILDINGS * 4 +                    // efficiencies
  MAX_BUILDINGS * 4 +                    // progress
  MAX_COMPANIES * 8 +                    // cash
  MAX_COMPANIES * GOODS_COUNT * 4 +      // inventories
  MAX_ORDERS * 24;                       // orders

const sharedBuffer = new SharedArrayBuffer(TOTAL_SIZE);

// 创建视图
const worldView = {
  tick: new Uint32Array(sharedBuffer, 0, 1),
  prices: new Float32Array(sharedBuffer, 4, GOODS_COUNT),
  supplies: new Float32Array(sharedBuffer, 4 + GOODS_COUNT * 4, GOODS_COUNT),
  // ...
};

// Worker中使用相同视图，直接读写共享内存
// 使用Atomics确保线程安全
Atomics.add(worldView.supplies, goodsId, amount);
```

### 4.3 无锁并行撮合

```typescript
// ==================== 按商品分片并行 ====================

// 主线程分发任务
async function processMarketTick(world: GameWorld): Promise<void> {
  const GOODS_PER_WORKER = Math.ceil(GOODS_COUNT / MARKET_WORKERS);
  
  const promises = [];
  for (let w = 0; w < MARKET_WORKERS; w++) {
    const startGoods = w * GOODS_PER_WORKER;
    const endGoods = Math.min((w + 1) * GOODS_PER_WORKER, GOODS_COUNT);
    
    // 每个Worker处理一段商品，无需锁
    promises.push(marketWorkers[w].postMessage({
      type: 'MATCH_ORDERS',
      startGoods,
      endGoods,
      tick: world.tick,
    }));
  }
  
  await Promise.all(promises);
}
```

---

## 五、POPs消费优化

### 5.1 采样+缩放策略

```typescript
// ==================== POPs消费采样 ====================

const SAMPLING_RATE = 0.01;  // 只采样1%的人口
const SCALE_FACTOR = 100;    // 结果放大100倍

function calculatePOPsConsumption(world: GameWorld): void {
  const pops = world.pops;
  const g = world.goods;
  
  // 预计算每个群组的代表性样本
  for (let groupId = 0; groupId < POPS_GROUPS; groupId++) {
    const group = pops.groups[groupId];
    const sampleSize = Math.ceil(group.population * SAMPLING_RATE);
    const income = group.averageIncome;
    
    // 计算该群组对每种消费品的需求
    for (let goodsId = 0; goodsId < CONSUMER_GOODS_COUNT; goodsId++) {
      const baseNeed = NEEDS_TABLE[groupId * GOODS_COUNT + goodsId];
      if (baseNeed === 0) continue;
      
      const price = g.prices[goodsId];
      const affordability = income / price;
      const utilityFactor = calculateUtility(goodsId, affordability);
      
      // 计算样本需求并缩放
      const sampleDemand = sampleSize * baseNeed * utilityFactor;
      const scaledDemand = sampleDemand * SCALE_FACTOR;
      
      // 累加到全局需求
      g.demands[goodsId] += scaledDemand;
    }
  }
}
```

### 5.2 预计算需求表

```typescript
// ==================== 编译时预计算 ====================

// 静态需求表（启动时生成）
const NEEDS_TABLE = new Float32Array(POPS_GROUPS * GOODS_COUNT);

function initNeedsTable(): void {
  for (let group = 0; group < POPS_GROUPS; group++) {
    for (let goods = 0; goods < GOODS_COUNT; goods++) {
      NEEDS_TABLE[group * GOODS_COUNT + goods] = 
        calculateBaseNeed(group, goods);
    }
  }
}

// 效用曲线查找表（避免运行时计算）
const UTILITY_TABLE = new Float32Array(1000); // 0.01到10.00的效用值

function initUtilityTable(): void {
  for (let i = 0; i < 1000; i++) {
    const affordability = i / 100;
    UTILITY_TABLE[i] = 1 - Math.exp(-affordability);
  }
}
```

---

## 六、AI决策优化

### 6.1 分时处理

```typescript
// ==================== AI分时调度 ====================

const AI_DECISION_INTERVAL = 24;  // 每24tick决策一次
const AI_BATCH_SIZE = 5;          // 每tick处理5个AI

function updateAICompanies(world: GameWorld): void {
  const tick = world.tick;
  
  // 只在间隔tick处理
  if (tick % AI_DECISION_INTERVAL !== 0) return;
  
  // 分批处理，避免单tick负载过高
  const batchStart = (tick / AI_DECISION_INTERVAL) % Math.ceil(AI_COUNT / AI_BATCH_SIZE);
  const startIdx = batchStart * AI_BATCH_SIZE;
  const endIdx = Math.min(startIdx + AI_BATCH_SIZE, AI_COUNT);
  
  for (let i = startIdx; i < endIdx; i++) {
    processAIDecision(world, i);
  }
}
```

### 6.2 规则引擎（无LLM依赖）

```typescript
// ==================== 快速规则决策 ====================

function processAIDecision(world: GameWorld, aiId: number): void {
  const ai = world.companies[aiId];
  const personality = ai.personality;
  
  // 快速状态评估
  const state = evaluateState(world, aiId);
  
  // 基于规则的快速决策（无LLM）
  if (state.cashRatio < 0.1) {
    // 现金紧张 → 卖出库存
    executeSellExcess(world, aiId);
  } else if (state.inventoryDays < 7) {
    // 库存不足 → 紧急采购
    executeEmergencyPurchase(world, aiId);
  } else if (state.cashRatio > 0.5 && state.marketOpportunity) {
    // 现金充足+机会 → 扩张
    executeExpansion(world, aiId, personality);
  } else {
    // 常规运营
    executeRoutineOperations(world, aiId);
  }
}

function evaluateState(world: GameWorld, aiId: number): AIState {
  const c = world.companies;
  const cash = c.cash[aiId];
  const totalAssets = calculateTotalAssets(world, aiId);
  
  return {
    cashRatio: cash / totalAssets,
    inventoryDays: calculateInventoryDays(world, aiId),
    marketOpportunity: detectOpportunity(world, aiId),
    threatLevel: detectThreat(world, aiId),
  };
}
```

---

## 七、游戏循环优化

### 7.1 高精度定时器

```typescript
// ==================== 精确Tick调度 ====================

class GameLoop {
  private targetTickMs = 50;      // 目标50ms/tick
  private lastTickTime = 0;
  private accumulator = 0;
  
  start(): void {
    this.lastTickTime = performance.now();
    this.scheduleNext();
  }
  
  private scheduleNext(): void {
    const now = performance.now();
    const elapsed = now - this.lastTickTime;
    this.accumulator += elapsed;
    this.lastTickTime = now;
    
    // 处理累积的tick（追赶落后）
    while (this.accumulator >= this.targetTickMs) {
      this.processTick();
      this.accumulator -= this.targetTickMs;
    }
    
    // 计算下一次调度延迟
    const nextDelay = Math.max(1, this.targetTickMs - this.accumulator);
    setTimeout(() => this.scheduleNext(), nextDelay);
  }
  
  private processTick(): void {
    const startTime = performance.now();
    
    // 执行tick逻辑
    updateAllProduction(this.world);
    matchAllOrders(this.world);
    updateAllPrices(this.world);
    calculatePOPsConsumption(this.world);
    updateAICompanies(this.world);
    
    // 性能监控
    const tickTime = performance.now() - startTime;
    if (tickTime > this.targetTickMs * 0.8) {
      console.warn(`Tick ${this.world.tick} took ${tickTime.toFixed(2)}ms`);
    }
  }
}
```

### 7.2 增量状态同步

```typescript
// ==================== 脏标记+增量推送 ====================

class DeltaStateManager {
  private dirtyGoods = new Set<number>();
  private dirtyBuildings = new Set<number>();
  private dirtyCompanies = new Set<number>();
  
  markGoodsDirty(goodsId: number): void {
    this.dirtyGoods.add(goodsId);
  }
  
  getDelta(): DeltaState {
    const delta: DeltaState = {
      tick: this.world.tick,
      goods: [],
      buildings: [],
      companies: [],
    };
    
    // 只收集变化的数据
    for (const id of this.dirtyGoods) {
      delta.goods.push({
        id,
        price: this.world.goods.prices[id],
        supply: this.world.goods.supplies[id],
        demand: this.world.goods.demands[id],
      });
    }
    
    // 清空脏标记
    this.dirtyGoods.clear();
    this.dirtyBuildings.clear();
    this.dirtyCompanies.clear();
    
    return delta;
  }
}
```

---

## 八、内存管理

### 8.1 对象池

```typescript
// ==================== 订单对象池 ====================

class OrderPool {
  private pool: Uint16Array;  // 空闲索引栈
  private poolTop = 0;
  
  constructor(maxOrders: number) {
    this.pool = new Uint16Array(maxOrders);
    // 初始化所有索引为空闲
    for (let i = 0; i < maxOrders; i++) {
      this.pool[i] = i;
    }
    this.poolTop = maxOrders;
  }
  
  acquire(): number {
    if (this.poolTop === 0) throw new Error('Order pool exhausted');
    return this.pool[--this.poolTop];
  }
  
  release(index: number): void {
    this.pool[this.poolTop++] = index;
  }
}
```

### 8.2 避免GC压力

```typescript
// ==================== 复用临时数组 ====================

// 预分配临时缓冲区
const tempBuffer = new Float32Array(GOODS_COUNT);
const tempIndices = new Uint16Array(MAX_ORDERS);

function calculateWithoutAlloc(): void {
  // 使用预分配的缓冲区而非创建新数组
  for (let i = 0; i < GOODS_COUNT; i++) {
    tempBuffer[i] = calculateValue(i);
  }
  
  // 处理结果...
  
  // 不需要释放，下次直接覆盖
}
```

---

## 九、性能指标与监控

### 9.1 目标指标

| 指标 | 目标 | 说明 |
|------|------|------|
| Tick时间 | <10ms | 单tick完整处理时间 |
| 生产计算 | <1ms | 100建筑生产计算 |
| 订单撮合 | <3ms | 1000订单撮合 |
| POPs消费 | <2ms | 100万人口需求计算 |
| AI决策 | <2ms | 20家AI公司决策 |
| 内存占用 | <100MB | 完整游戏状态 |

### 9.2 性能监控

```typescript
// ==================== 内置Profiler ====================

class TickProfiler {
  private metrics = new Float32Array(10);
  private names = ['total', 'production', 'orders', 'prices', 'pops', 'ai'];
  
  profile<T>(name: string, fn: () => T): T {
    const idx = this.names.indexOf(name);
    const start = performance.now();
    const result = fn();
    this.metrics[idx] += performance.now() - start;
    return result;
  }
  
  report(): void {
    console.log('Tick Profile:');
    for (let i = 0; i < this.names.length; i++) {
      console.log(`  ${this.names[i]}: ${this.metrics[i].toFixed(2)}ms`);
    }
    this.metrics.fill(0);
  }
}
```

---

## 十、实施路线

### Phase 1：数据结构重构
1. 设计SoA数据结构
2. 实现TypedArray存储
3. 建立索引系统

### Phase 2：核心算法优化
4. 实现批量生产计算
5. 实现高效订单撮合
6. 实现向量化价格更新

### Phase 3：多线程
7. 设置SharedArrayBuffer
8. 实现Worker分工
9. 无锁并行处理

### Phase 4：辅助系统
10. POPs采样优化
11. AI分时调度
12. 增量状态同步

---

## 总结

通过以上优化，可以实现：

- **10ms/tick** 的高频率模拟
- **60+商品、100+建筑、1000+订单** 的大规模处理
- **零GC** 的热路径执行
- **充分利用多核** 的并行计算

关键技术点：
1. SoA数据结构 + TypedArray
2. SharedArrayBuffer多线程
3. 按商品分片无锁并行
4. 预计算 + 查找表
5. 采样缩放减少计算量
6. 对象池避免分配

---

*文档结束*