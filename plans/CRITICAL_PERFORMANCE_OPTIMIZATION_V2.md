# 关键性能优化计划 V2

## 问题诊断

### 性能数据摘要
- **健康状态**：100% Critical（全部100个快照都是critical）
- **平均Tick时间**：52.57ms（目标应<16ms）
- **最大Tick时间**：71.3ms
- **最小Tick时间**：43.6ms
- **FPS**：60（渲染正常，但游戏逻辑严重超时）

### 各系统耗时分析（基于breakdown数据）

| 系统 | 平均耗时 | 占比 | 问题严重度 |
|------|---------|------|-----------|
| **AI** | 22-32ms | ~50% | 🔴 极高 |
| **Consumer** | 22-28ms | ~45% | 🔴 极高 |
| Production | <0.2ms | <0.5% | ✅ 正常 |
| Matching | <0.5ms | <1% | ✅ 正常 |
| Pricing | <0.2ms | <0.5% | ✅ 正常 |
| Retail | <0.3ms | <0.5% | ✅ 正常 |
| Other | 0.5-2ms | ~3% | ⚠️ 略高 |

### 关键发现

1. **AI系统是头号瓶颈**：平均消耗25ms+，占整个tick的50%
2. **Consumer系统是第二大瓶颈**：平均消耗25ms+，占整个tick的45%
3. **这两个系统加起来就已经超过了16ms的60FPS预算**
4. **其他系统都很高效**（production, matching, pricing等都在1ms以下）

---

## 根本原因分析

### 1. AI系统问题 (`AIDecisionEngine.ts`)

```
问题：文件有3451行，包含极其复杂的决策逻辑
```

- **runAIDecisionCycle** 函数调用了大量模块：
  - PrecisionCalculator（精确计算）
  - PricePredictor（价格预测）
  - PersonalityBehaviors（人格行为）
  - StrategicPlanner（战略规划）
  - HistoricalLearning（历史学习）
  - AdvancedTrading（高级交易）
  - CompetitiveIntelligence（竞争情报）
  - RiskManagement（风险管理）
  
- 每个AI公司每次决策都要执行所有这些模块
- 虽然有AIScheduler分批，但单个公司的决策仍然很重

### 2. Consumer系统问题 (`ConsumerMarket.ts`)

```
问题：每tick遍历所有消费品和订单
```

- **executeConsumerPurchases** 每tick执行：
  - 遍历所有CONSUMER_GOODS
  - 对每个商品获取订单簿视图
  - 遍历所有卖单进行匹配
  
- **executeB2BPurchases** 每tick执行：
  - 遍历所有建筑
  - 遍历每个配方的输入
  - 检查库存并创建采购

---

## 优化方案

### 方案1：AI系统优化（预期节省15-20ms）

#### 1.1 模块化决策缓存
```typescript
// 为每个AI模块添加结果缓存
interface AIModuleCache {
  riskAssessment: { result: any; tick: number; ttl: number };
  competitiveAnalysis: { result: any; tick: number; ttl: number };
  strategicPlan: { result: any; tick: number; ttl: number };
  // ...
}

// 根据TTL决定是否重新计算
function getCachedOrCompute(cache, key, computeFn, currentTick, defaultTTL) {
  const cached = cache[key];
  if (cached && currentTick - cached.tick < cached.ttl) {
    return cached.result;
  }
  const result = computeFn();
  cache[key] = { result, tick: currentTick, ttl: defaultTTL };
  return result;
}
```

**各模块建议TTL**：
- 风险评估：60 ticks（2.5天）
- 竞争分析：120 ticks（5天）
- 战略规划：240 ticks（10天）
- 价格预测：24 ticks（1天）
- 快速决策：4 ticks

#### 1.2 简化runAIDecisionCycle
```typescript
// 将完整决策周期拆分为多个轻量级阶段
function runAIDecisionCycle(world, companyId) {
  const tier = getDecisionTier(world.tick, companyId);
  
  switch(tier) {
    case 'micro':  // 每tick，<0.5ms
      return microDecisions(world, companyId);
    case 'fast':   // 每4tick，<2ms
      return fastDecisions(world, companyId);
    case 'normal': // 每48tick，<5ms
      return normalDecisions(world, companyId);
    case 'deep':   // 每180tick，<15ms
      return deepDecisions(world, companyId);
  }
}
```

#### 1.3 减少AIScheduler批次
```typescript
// 当前配置
const CURRENT_CONFIG = {
  fastBatchSize: 3,      // 每tick处理3家
  standardBatchSize: 1,
  deepBatchSize: 1,
};

// 优化配置
const OPTIMIZED_CONFIG = {
  fastBatchSize: 1,      // 减少到1家
  standardBatchSize: 1,
  deepBatchSize: 1,
  fastInterval: 6,       // 从4改为6
  standardInterval: 72,  // 从48改为72
  deepInterval: 240,     // 从180改为240
};
```

### 方案2：Consumer系统优化（预期节省15-20ms）

#### 2.1 降低消费频率
```typescript
// 当前：每tick都执行
// 优化：每4tick执行一次，但一次处理4x的量

function executeConsumerPurchases(world, config) {
  // 只在特定tick执行
  if (world.tick % 4 !== 0) {
    return EMPTY_RESULT;
  }
  
  // 处理4x的消费量
  const adjustedConfig = {
    ...config,
    consumptionRatePerTick: config.consumptionRatePerTick * 4,
  };
  
  return doExecuteConsumerPurchases(world, adjustedConfig);
}
```

#### 2.2 商品批次处理
```typescript
// 将商品分成4组，每tick只处理1组
const GOODS_GROUPS = 4;

function executeConsumerPurchases(world, config) {
  const groupIndex = world.tick % GOODS_GROUPS;
  const goodsToProcess = CONSUMER_GOODS.filter(
    (_, idx) => idx % GOODS_GROUPS === groupIndex
  );
  
  // 只处理当前组的商品
  for (const goods of goodsToProcess) {
    // ...
  }
}
```

#### 2.3 B2B采购优化
```typescript
// 当前：每tick检查所有建筑
// 优化：建筑分批 + 需求缓存

const BUILDING_BATCH_SIZE = 10;

function executeB2BPurchases(world, config) {
  const startIdx = (world.tick * BUILDING_BATCH_SIZE) % world.buildings.count;
  const endIdx = Math.min(startIdx + BUILDING_BATCH_SIZE, world.buildings.count);
  
  // 只处理当前批次的建筑
  for (let i = startIdx; i < endIdx; i++) {
    // ...
  }
}
```

### 方案3：错峰执行（预期节省5-10ms）

```typescript
// GameLoop中的系统错峰执行
function processTick() {
  const phase = world.tick % 4;
  
  switch(phase) {
    case 0:
      // 生产 + AI决策（重）
      updateProduction();
      processAIDecisions();
      break;
    case 1:
      // 消费者市场（重）
      executeConsumerPurchases();
      break;
    case 2:
      // 匹配 + 价格更新
      matchOrders();
      updatePrices();
      break;
    case 3:
      // 金融 + 状态更新
      updateFinance();
      updateState();
      break;
  }
}
```

---

## 实施优先级

### 第一阶段：立即优化（预期效果：tick时间从52ms降到25ms）

1. **降低Consumer频率** [ConsumerMarket.ts]
   - 改为每4tick执行一次
   - 预期节省：20ms

2. **减少AI批次** [AIScheduler.ts]
   - fastBatchSize: 3→1
   - fastInterval: 4→6
   - 预期节省：10ms

### 第二阶段：结构优化（预期效果：tick时间从25ms降到12ms）

1. **AI模块缓存** [AIDecisionEngine.ts]
   - 为各AI模块添加TTL缓存
   - 预期节省：8ms

2. **商品批次处理** [ConsumerMarket.ts]
   - 商品分4组处理
   - 预期节省：5ms

### 第三阶段：架构优化（预期效果：tick时间稳定在8-10ms）

1. **系统错峰执行** [GameLoop.ts]
   - 重系统分散到不同tick
   - 预期节省：3ms，峰值降低10ms

---

## 风险评估

| 优化项 | 风险 | 缓解措施 |
|--------|------|----------|
| 降低Consumer频率 | 市场反应变慢 | 增加单次处理量补偿 |
| 减少AI批次 | AI决策延迟 | 保持快速决策的实时性 |
| AI模块缓存 | 决策过时 | 根据市场波动动态调整TTL |
| 错峰执行 | 系统间同步问题 | 保持关键依赖在同一phase |

---

## 成功指标

| 指标 | 当前值 | 目标值 | 验收标准 |
|------|--------|--------|----------|
| 平均Tick时间 | 52.57ms | <12ms | 必须 |
| 最大Tick时间 | 71.3ms | <25ms | 必须 |
| 健康状态 | 100% Critical | 90%+ Healthy | 必须 |
| AI决策质量 | 基准 | 无明显下降 | 期望 |
| 市场活跃度 | 基准 | 无明显下降 | 期望 |

---

## 实施文件清单

1. `src/core/economy/ConsumerMarket.ts` - Consumer系统优化
2. `src/core/ai/AIScheduler.ts` - AI调度优化
3. `src/core/ai/AIDecisionEngine.ts` - AI决策缓存
4. `src/core/loop/GameLoop.ts` - 错峰执行
5. `src/core/ai/ModuleCache.ts` - 新增模块缓存系统