# 游戏平衡性调优计划

## 文档版本
- **版本**: 1.0
- **创建日期**: 2024-01-29
- **优先级**: 高

---

## 一、当前数据分析

### 1.1 商品系统分析 (84种商品)

#### 按层级分布
| 层级 | 类别 | 数量 | 价格范围 |
|------|------|------|----------|
| Tier 0 | 原材料 (raw) | 20 | ¥8 - ¥10,000 |
| Tier 1 | 基础材料 (basic) | 15 | ¥20 - ¥100,000 |
| Tier 2 | 中间产品 (intermediate) | 15 | ¥40 - ¥2,000 |
| Tier 3 | 最终产品 (final) | 34 | ¥0.5 - ¥500,000 |

#### 价格弹性分析
| 类别 | 价格弹性范围 | 问题 |
|------|--------------|------|
| 必需品 (食品/电力) | -0.2 ~ -0.4 | ✅ 合理 |
| 工业品 | -0.4 ~ -0.6 | ✅ 合理 |
| 消费电子 | -0.9 ~ -1.2 | ✅ 合理 |
| 奢侈品 | -1.8 ~ -3.0 | ⚠️ 可能过高 |

#### 收入弹性分析
| 类别 | 收入弹性范围 | 问题 |
|------|--------------|------|
| 必需品 | 0.3 ~ 0.5 | ✅ 合理 |
| 普通消费品 | 0.6 ~ 1.0 | ✅ 合理 |
| 奢侈品 | 2.0 ~ 4.0 | ⚠️ 珠宝(4.0)可能过高 |

### 1.2 建筑系统分析 (47种建筑)

#### 建造成本分布
| 类别 | 数量 | 成本范围 | 建造时间 |
|------|------|----------|----------|
| 采掘类 | 14 | ¥200K - ¥10M | 24-120 tick |
| 加工类 | 9 | ¥500K - ¥3M | 48-120 tick |
| 制造类 | 9 | ¥3M - ¥20M | 84-240 tick |
| 服务类 | 3 | ¥800K - ¥5M | 48-144 tick |
| 零售类 | 10 | ¥100K - ¥5M | 12-96 tick |

#### 投资回报分析
| 建筑 | 建造成本 | 日运营成本 | 预估日收入 | ROI天数 |
|------|----------|------------|------------|---------|
| 铁矿场 | ¥500K | ¥8K | ¥15K* | ~71天 |
| 钢铁厂 | ¥2M | ¥40K | ¥80K* | ~40天 |
| 半导体厂 | ¥20M | ¥230K | ¥500K* | ~53天 |
| 便利店 | ¥100K | ¥4.3K | ¥8K* | ~20天 |

*预估收入，需实际测试验证

### 1.3 核心常量分析

```typescript
// src/core/constants.ts 关键参数
PLAYER_INITIAL_CASH: 5,000,000      // 初始资金
AI_DECISION_INTERVAL: 6             // AI决策间隔(tick)
MAX_TICK_PRICE_CHANGE: 0.10         // 每tick最大价格变动10%
MEAN_REVERSION_RATE: 0.002          // 均值回归速率
SUPPLY_DEMAND_SMOOTHING: 0.3        // 供需平滑系数
MAX_PRICE_RATIO: 5.0                // 最大价格倍数
MIN_PRICE_RATIO: 0.2                // 最小价格倍数
```

---

## 二、平衡性问题识别

### 2.1 经济系统问题

#### 问题1: 价格波动可能过大
- **现状**: `MAX_TICK_PRICE_CHANGE = 0.10` (10%/tick)
- **影响**: 24 tick = 1天，理论上价格可波动 10^24 倍
- **建议**: 降低到 0.03-0.05 (3-5%/tick)

#### 问题2: 均值回归过慢
- **现状**: `MEAN_REVERSION_RATE = 0.002` (0.2%/tick)
- **影响**: 价格偏离后恢复太慢
- **建议**: 提高到 0.005-0.01 (0.5-1%/tick)

#### 问题3: 初始资金设定
- **现状**: ¥5,000,000
- **分析**: 
  - 可建1个钢铁厂 (¥2M)
  - 可建10个铁矿场 (¥5M)
  - 可建50个便利店 (¥5M)
- **评估**: ⚠️ 相对于高端建筑成本偏低

### 2.2 生产链问题

#### 问题1: 生产周期差异过大
| 配方 | 周期 | 问题 |
|------|------|------|
| 铁矿开采 | 1 tick | 基准 |
| 粮食种植 | 24 tick | 农业周期合理 |
| 牲畜养殖 | 48 tick | ⚠️ 等待时间过长 |
| 药材种植 | 48 tick | ⚠️ 等待时间过长 |

#### 问题2: 产业链深度不均衡
- **采掘→基础**: 1-2步 ✅
- **基础→中间**: 1-2步 ✅
- **中间→最终**: 1-3步 ⚠️ 部分链条过长

#### 问题3: 资源瓶颈
| 资源 | 生产途径 | 消费途径 | 问题 |
|------|----------|----------|------|
| 稀土 | 1 (硅矿场) | 5+ | ⚠️ 严重短缺 |
| 锂矿 | 1 (锂矿场) | 3+ | ⚠️ 可能短缺 |
| 铜材 | 1 (钢铁厂) | 4+ | ⚠️ 可能短缺 |

### 2.3 AI行为问题

#### 问题1: 决策间隔
- **现状**: `AI_DECISION_INTERVAL = 6` tick
- **影响**: AI反应速度可能过快/过慢

#### 问题2: 投资阈值
- **现状**: `minCash=80000, minCashRatio=8%`
- **影响**: AI建设决策激进程度

#### 问题3: 性格差异化
- 8种性格: aggressive, opportunist, cost_leader, diversified, specialist, innovator, conservative, premium
- **问题**: 性格行为差异可能不够明显

---

## 三、调优方案

### 3.1 阶段一: 核心参数调优 (Week 1)

#### 3.1.1 价格系统调优
```typescript
// 建议修改 src/core/constants.ts
export const PRICE_CONSTANTS = {
  MAX_TICK_PRICE_CHANGE: 0.05,    // 降低: 10% → 5%
  MEAN_REVERSION_RATE: 0.005,     // 提高: 0.2% → 0.5%
  SUPPLY_DEMAND_SMOOTHING: 0.4,   // 提高: 0.3 → 0.4
  MAX_PRICE_RATIO: 3.0,           // 降低: 5.0 → 3.0
  MIN_PRICE_RATIO: 0.33,          // 提高: 0.2 → 0.33
}
```

#### 3.1.2 初始资金调优
```typescript
// 新增难度等级
export const DIFFICULTY_LEVELS = {
  easy: {
    playerInitialCash: 10_000_000,
    aiStartDelay: 48,  // AI延迟启动
  },
  normal: {
    playerInitialCash: 5_000_000,
    aiStartDelay: 24,
  },
  hard: {
    playerInitialCash: 3_000_000,
    aiStartDelay: 12,
  },
  expert: {
    playerInitialCash: 2_000_000,
    aiStartDelay: 0,
  }
}
```

#### 3.1.3 建筑成本重新平衡
```typescript
// 调整建议 (相对于当前值的比例)
const BUILDING_COST_ADJUSTMENTS = {
  // 降低高端建筑门槛
  'semiconductor-fab': 0.8,   // 20M → 16M
  'medical-device-factory': 0.85, // 12M → 10.2M
  
  // 提高低端建筑成本
  'convenience-store': 1.5,   // 100K → 150K
  'vegetable-farm': 1.2,      // 250K → 300K
}
```

### 3.2 阶段二: 生产链调优 (Week 2)

#### 3.2.1 长周期配方优化
```typescript
// 建议缩短过长的生产周期
const RECIPE_TICK_ADJUSTMENTS = {
  'livestock-breeding': { from: 48, to: 36 },
  'herb-cultivation': { from: 48, to: 36 },
  'fruit-farming': { from: 24, to: 18 },
}
```

#### 3.2.2 瓶颈资源产量提升
```typescript
// 提高稀缺资源产量
const OUTPUT_ADJUSTMENTS = {
  'rare-earth-mining': { from: 20, to: 30 },  // 稀土产量+50%
  'lithium-mining': { from: 40, to: 50 },     // 锂矿产量+25%
  'copper-smelting': { from: 60, to: 75 },    // 铜材产量+25%
}
```

#### 3.2.3 产业链平衡指标
```typescript
// 目标: 保证各产业链的收益率相近
const TARGET_PROFIT_MARGINS = {
  extraction: 0.25,      // 采掘业 25% 利润率
  processing: 0.30,      // 加工业 30% 利润率
  manufacturing: 0.35,   // 制造业 35% 利润率
  retail: 0.20,          // 零售业 20% 利润率
}
```

### 3.3 阶段三: AI行为调优 (Week 3)

#### 3.3.1 AI决策参数
```typescript
// src/core/ai/AIDecisionEngine.ts 调优
export const AI_BALANCE_PARAMS = {
  decisionInterval: {
    aggressive: 4,     // 快速决策
    conservative: 8,   // 谨慎决策
    default: 6,
  },
  investmentThreshold: {
    aggressive: { minCash: 50000, minCashRatio: 0.05 },
    conservative: { minCash: 200000, minCashRatio: 0.15 },
    default: { minCash: 80000, minCashRatio: 0.08 },
  },
  tradingAggression: {
    aggressive: 1.5,   // 交易量放大
    conservative: 0.6, // 交易量缩小
    default: 1.0,
  },
}
```

#### 3.3.2 性格行为强化
```typescript
// 增强性格特征差异
const PERSONALITY_MULTIPLIERS = {
  aggressive: {
    expansionRate: 1.5,
    riskTolerance: 0.8,
    priceFlexibility: 0.9,
  },
  conservative: {
    expansionRate: 0.6,
    riskTolerance: 1.5,
    priceFlexibility: 1.2,
  },
  // ... 其他性格
}
```

### 3.4 阶段四: 难度曲线设计 (Week 4)

#### 3.4.1 新手保护机制
```typescript
// 前期保护
const NEWBIE_PROTECTION = {
  durationTicks: 240,  // 10天保护期
  effects: {
    aiAggressionMultiplier: 0.5,  // AI竞争减半
    marketVolatilityMultiplier: 0.7, // 市场波动降低
    maintenanceCostMultiplier: 0.8, // 维护成本降低
  }
}
```

#### 3.4.2 动态难度调整
```typescript
// 根据玩家表现动态调整
const DYNAMIC_DIFFICULTY = {
  indicators: {
    playerNetWorth: 'primary',
    playerMarketShare: 'secondary',
    playerProfitMargin: 'secondary',
  },
  adjustments: {
    // 玩家领先时
    playerLeading: {
      aiIntelligence: 1.2,
      marketDemand: 0.9,
    },
    // 玩家落后时
    playerLagging: {
      aiIntelligence: 0.8,
      marketDemand: 1.1,
    },
  }
}
```

---

## 四、测试工具需求

### 4.1 数值沙盒工具
- 实时调整游戏参数
- 参数变化即时生效
- 支持导出/导入配置

### 4.2 平衡性分析面板
- 各产业链利润率实时显示
- 资源供需比例图表
- AI行为统计

### 4.3 自动化测试
- 无人模拟运行
- 关键指标记录
- 异常检测报警

---

## 五、验收标准

### 5.1 经济平衡
- [ ] 价格波动控制在 ±50%/天 以内
- [ ] 无商品长期断供
- [ ] 各产业链利润率差距 < 20%

### 5.2 游戏体验
- [ ] 新手可在30分钟内盈利
- [ ] 中期(1小时)可扩展到10+建筑
- [ ] 无明显的"最优策略"

### 5.3 AI表现
- [ ] AI能维持正向现金流
- [ ] AI性格差异可感知
- [ ] AI不会过快/过慢发展

---

## 六、实施时间表

| 阶段 | 任务 | 工期 | 负责模块 |
|------|------|------|----------|
| Week 1 | 核心参数调优 | 5天 | constants.ts, PriceEngine.ts |
| Week 2 | 生产链调优 | 5天 | recipes.ts, ProductionEngine.ts |
| Week 3 | AI行为调优 | 5天 | AIDecisionEngine.ts |
| Week 4 | 难度系统 | 5天 | 新增DifficultyManager.ts |
| Week 5 | 测试与迭代 | 5天 | 全模块 |

---

## 七、风险评估

### 高风险
1. **连锁反应**: 修改一个参数可能影响整个经济系统
   - 缓解: 小幅调整，充分测试

2. **AI行为异常**: 参数改变可能导致AI策略失效
   - 缓解: 保留回滚机制

### 中风险
1. **游戏节奏变化**: 玩家需要重新适应
   - 缓解: 渐进式更新，提供教程

2. **性能影响**: 更复杂的计算可能影响性能
   - 缓解: 性能监控，按需优化

---

## 附录: 关键文件清单

| 文件 | 用途 | 修改优先级 |
|------|------|------------|
| `src/core/constants.ts` | 全局常量 | ⭐⭐⭐ |
| `src/core/economy/PriceEngine.ts` | 价格计算 | ⭐⭐⭐ |
| `src/core/production/ProductionEngine.ts` | 生产逻辑 | ⭐⭐ |
| `src/core/ai/AIDecisionEngine.ts` | AI决策 | ⭐⭐ |
| `src/data/goods.ts` | 商品数据 | ⭐⭐ |
| `src/data/buildings.ts` | 建筑数据 | ⭐⭐ |
| `src/data/recipes.ts` | 配方数据 | ⭐⭐ |