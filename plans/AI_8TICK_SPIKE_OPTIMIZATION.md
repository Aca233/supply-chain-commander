# AI 每8-Tick性能尖峰优化计划

## 问题分析

### 性能数据统计
根据导出的性能监控数据（100个tick快照，tick 1679-1778）：

| 指标 | 值 |
|------|-----|
| 平均tick耗时 | 3.73ms |
| 最大tick耗时 | 22.1ms |
| 最小tick耗时 | 0.2ms |
| 健康状态 | 100% healthy |
| 尖峰发生频率 | 每8个tick |

### 尖峰分布
性能尖峰发生在以下tick：
- Tick 1680: 22ms (AI=19.5ms, 88%)
- Tick 1688: 18.2ms (AI=17.6ms, 97%)
- Tick 1696: 18.9ms (AI=18.2ms, 96%)
- Tick 1704: 22.1ms (AI=19.7ms, 89%)
- Tick 1712: 19.3ms (AI=18.7ms, 97%)
- Tick 1720: 17.7ms (AI=17ms, 96%)
- Tick 1728: 20.1ms (AI=17.8ms, 89%)
- Tick 1736: 19.2ms (AI=18.5ms, 96%)
- Tick 1744: 17.9ms (AI=17.2ms, 96%)
- Tick 1752: 20.7ms (AI=18.5ms, 89%)
- Tick 1760: 19ms (AI=18.4ms, 97%)
- Tick 1768: 16.9ms (AI=16.4ms, 97%)
- Tick 1776: 22.1ms (AI=19.7ms, 89%)

**关键发现**：AI系统在尖峰tick中消耗了总耗时的89-97%。

---

## 根本原因分析

### 1. AIScheduler配置问题

```typescript
// src/core/ai/AIScheduler.ts (第42-58行)
const DEFAULT_CONFIG: AISchedulerConfig = {
  deepInterval: 8,           // ← 每8tick执行Deep决策
  deepBatchSize: 2,          // ← 每次处理2家公司
  // ...
};
```

### 2. Deep决策过于沉重

[`processDeepDecision()`](src/core/ai/AIScheduler.ts:356) 调用完整的 [`runAIDecisionCycle()`](src/core/ai/AIDecisionEngine.ts:2353)，该函数包含：

```
runAIDecisionCycle() 调用链:
├── ensureAISystemsInitialized() - 初始化6大AI模块
├── assessCompanyState() - 公司状态评估
├── evaluatePersonalityGoalGap() - 人格目标差距评估
├── performRiskAssessment() - 风险评估（Phase 5）
├── updateCompetitorProfiles() - 竞争情报更新（Phase 4）
├── getCompetitiveSummary() - 竞争分析摘要
├── generateCompetitiveResponses() - 竞争响应
├── updateStrategicPlan() - 战略规划更新（Phase 1）
├── detectScenarios() - 场景检测
├── getRecommendedActions() - 推荐行为
├── generateProductionDecisions() - 生产决策
├── generatePricingDecisions() - 定价决策
├── generateTradingDecisions() - 交易决策
├── generateInvestmentDecisions() - 投资决策
├── generateStockTradingDecisions() - 股票交易决策
├── generateSubsidiaryDecisions() - 附属建筑决策
├── generateTradingSignals() - 高级交易信号（Phase 3）
├── generatePredictiveTradeDecisions() - 预测性交易决策
├── adjustDecisionByPersonality() - 人格调整
├── applyBehaviorToDecision() - 行为模式应用
├── filterDecisionsByPersonality() - 人格过滤
├── applyRiskFiltersToDecisions() - 风险过滤（Phase 5）
├── applyCompetitiveResponseToDecisions() - 竞争响应（Phase 4）
├── alignDecisionsWithStrategy() - 战略对齐（Phase 1）
├── calculateDecisionScore() - 决策评分
├── executeDecision() - 执行决策
├── recordDecision() - 记录到历史学习（Phase 2）
├── processBuildingIntents() - 处理待建意向
├── runLearningCycle() - 学习周期（每100tick）
├── runAdvancedTradingCycle() - 高级交易周期（每6tick）
└── runProductionOptimization() - 生产方式优化（每12tick）
```

**问题**：即使只处理2家公司，每家公司的完整决策周期也需要约8-10ms！

### 3. GameLoop中的任务冲突

```typescript
// src/core/loop/GameLoop.ts
// 多个系统在相近的tick执行，导致负载叠加

tick % 8 === 0  → Deep AI决策（主要尖峰源）
tick % 8 === 1  → AI自动卖单
tick % 8 === 5  → AI自动买单
tick % 12 === 3 → AI订单价格调整
tick % 24 === 2 → 分销渠道处理
tick % 24 === 7 → AI股票交易
tick % 24 === 14 → AI附属建筑管理
```

---

## 优化方案

### 方案一：分散Deep决策执行（推荐 - 立即见效）

**目标**：将每8tick的17-22ms尖峰分散到更多tick

```typescript
// 修改 AIScheduler.ts DEFAULT_CONFIG
const DEFAULT_CONFIG: AISchedulerConfig = {
  // 原配置
  // deepInterval: 8,
  // deepBatchSize: 2,
  
  // 新配置：每tick处理1家，每24tick完成全部公司轮询
  deepInterval: 1,           // 每tick都执行
  deepBatchSize: 1,          // 每次只处理1家公司
  
  // 其他配置保持不变
  fastInterval: 6,
  standardInterval: 48,
  maxTimePerTick: 10,        // 降低时间预算
};
```

**预期效果**：
- 单次Deep决策从17-22ms降到4-6ms
- 消除周期性尖峰
- 平均tick耗时略有上升（从3.7ms到5-6ms），但更平稳

### 方案二：增量式模块执行（中等复杂度）

**目标**：不是每次都运行所有AI模块，而是轮换执行

```typescript
// 新增模块调度器
const MODULE_SCHEDULE = {
  risk: 16,          // 每16tick执行风险评估
  competitive: 24,   // 每24tick执行竞争情报
  strategic: 48,     // 每48tick执行战略规划
  learning: 100,     // 每100tick执行学习周期
  production: 12,    // 每12tick执行生产优化
};

function processDeepDecision(world: GameWorld, companyId: number): void {
  const tick = world.tick;
  
  // 基础决策（每次都执行）
  const assessment = assessCompanyState(world, companyId);
  const personality = getCompanyPersonality(companyId);
  
  // 条件性模块执行
  if (tick % MODULE_SCHEDULE.risk === 0) {
    performRiskAssessment(world, companyId);
  }
  if (tick % MODULE_SCHEDULE.competitive === 0) {
    updateCompetitorProfiles(world, companyId);
  }
  // ... 类推
  
  // 核心交易决策（每次都执行，但简化）
  const tradingDecisions = generateSimpleTradingDecisions(world, companyId, assessment);
  executeTopDecisions(world, tradingDecisions, 3);
}
```

**预期效果**：
- 每次Deep决策从8-10ms降到2-4ms
- 模块功能不丢失，只是延迟执行
- 复杂度适中

### 方案三：Web Worker异步处理（高复杂度 - 长期方案）

**目标**：将AI决策移到独立线程

```
主线程                    Web Worker
   │                         │
   ├─ 发送world快照 ────────→│
   │                         ├─ 执行AI计算
   │  (继续处理其他系统)      │
   │                         │
   │←── 返回决策结果 ─────────┤
   ├─ 应用决策              │
   │                         │
```

**实现要点**：
1. 序列化world状态（只发送必要数据）
2. Worker内执行完整AI决策
3. 返回决策列表由主线程执行
4. 需要处理状态同步问题

**预期效果**：
- AI完全不阻塞主循环
- 可利用多核CPU
- 但实现复杂，需要大量重构

---

## 推荐实施路径

### 第一阶段：快速优化（1-2小时）

1. **修改AIScheduler配置**
   - `deepInterval: 1`
   - `deepBatchSize: 1`
   - 将Deep决策从每8tick处理2家改为每tick处理1家

2. **添加时间预算硬性限制**
   ```typescript
   private processDeepBatch(world: GameWorld, startTime: number): void {
     const MAX_AI_TIME_PER_TICK = 8; // 硬性8ms上限
     
     while (performance.now() - startTime < MAX_AI_TIME_PER_TICK) {
       // 处理一家公司...
       if (this.deepQueue.length === 0) break;
     }
   }
   ```

3. **优化GameLoop任务调度**
   - 调整其他AI相关任务的执行时机，避免与Deep决策重叠

### 第二阶段：模块化优化（2-4小时）

1. **简化Deep决策路径**
   - 创建 `runSimplifiedDecisionCycle()` 替代完整版
   - 只保留核心交易决策逻辑
   - 其他模块按需加载

2. **增量式模块调度**
   - 不同模块在不同tick执行
   - 避免所有模块同时运行

### 第三阶段：异步处理（可选，1-2天）

1. **扩展WorkerManager**
   - 添加AI决策Worker
   - 设计状态序列化方案

2. **重构AIDecisionEngine**
   - 分离计算逻辑和执行逻辑
   - 支持异步决策返回

---

## 具体代码修改清单

### 文件1: `src/core/ai/AIScheduler.ts`

```typescript
// 修改1: 配置调整（第42-58行）
const DEFAULT_CONFIG: AISchedulerConfig = {
  fastBatchSize: 2,
  standardBatchSize: 2,
  deepBatchSize: 1,          // 从2降到1
  
  fastInterval: 6,
  standardInterval: 48,
  deepInterval: 1,           // 从8降到1（每tick执行）
  
  maxTimePerTick: 8,         // 从15降到8
  
  enableFastDecision: true,
  enableStandardDecision: true,
  enableDeepDecision: true,
};

// 修改2: 添加时间硬限制（processDeepBatch函数）
private processDeepBatch(world: GameWorld, startTime: number): void {
  const config = this.config;
  const MAX_AI_TIME = 8; // 硬性8ms限制
  let processed = 0;
  
  while (processed < config.deepBatchSize && this.deepQueue.length > 0) {
    // 严格时间检查
    if (performance.now() - startTime > MAX_AI_TIME) {
      break;
    }
    
    // ... 处理逻辑不变
  }
}
```

### 文件2: `src/core/ai/AIDecisionEngine.ts`

```typescript
// 新增: 简化版决策周期（约2000行后添加）
export function runSimplifiedDecisionCycle(world: GameWorld, companyId: number): AIDecision[] {
  // 1. 基础评估
  const assessment = assessCompanyState(world, companyId);
  const personality = getCompanyPersonality(companyId);
  
  // 2. 只生成核心决策
  const allDecisions: AIDecision[] = [
    ...generateTradingDecisions(world, companyId, assessment),
  ];
  
  // 3. 条件性添加投资决策（只在现金充裕时）
  if (assessment.cash > 500000 && assessment.cashRatio > 0.3) {
    allDecisions.push(...generateInvestmentDecisions(world, companyId, assessment));
  }
  
  // 4. 简化过滤
  allDecisions.sort((a, b) => b.priority - a.priority);
  
  // 5. 执行前3个决策
  const executed: AIDecision[] = [];
  for (let i = 0; i < Math.min(3, allDecisions.length); i++) {
    if (executeDecision(world, allDecisions[i])) {
      executed.push(allDecisions[i]);
    }
  }
  
  return executed;
}
```

### 文件3: `src/core/loop/GameLoop.ts`

```typescript
// 修改: 调整任务调度时机，避免冲突（约340-360行）

// AI自动挂单错峰执行
if (currentTick % 12 === 2) {  // 从 tick%8===1 改为 tick%12===2
  aiSellOrders = autoPostSellOrders(this.world);
}
if (currentTick % 12 === 7) {  // 从 tick%8===5 改为 tick%12===7
  aiBuyOrders = autoPostBuyOrders(this.world);
}

// AI订单调价错峰
if (currentTick % 18 === 5) {  // 从 tick%12===3 改为 tick%18===5
  adjustAllAIOrderPrices(this.world);
}
```

---

## 预期优化效果

| 指标 | 优化前 | 优化后（方案一） |
|------|--------|------------------|
| 最大tick耗时 | 22ms | <10ms |
| 平均tick耗时 | 3.7ms | 5-6ms |
| 尖峰出现频率 | 每8tick | 消除 |
| 性能稳定性 | 高波动 | 平稳 |
| FPS稳定性 | 受尖峰影响 | 稳定60FPS |

---

## 验证方法

1. **性能监控**
   - 使用现有PerformanceMonitor导出优化后的100tick数据
   - 对比优化前后的尖峰情况

2. **用户体验**
   - 游戏运行时无卡顿感
   - UI响应流畅

3. **功能验证**
   - AI公司仍能正常做出决策
   - 建造、交易、投资功能正常

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| AI决策质量下降 | 低 | 中 | 保持核心逻辑不变 |
| 决策延迟增加 | 中 | 低 | 可接受的延迟（2-3秒） |
| 引入新bug | 低 | 中 | 充分测试 |
| 其他系统受影响 | 低 | 低 | 模块化设计隔离 |

---

## 时间线

- **第一阶段**：1-2小时，立即消除尖峰
- **第二阶段**：2-4小时，进一步优化
- **第三阶段**：可选，根据需求决定

建议先实施第一阶段，观察效果后决定是否需要进一步优化。