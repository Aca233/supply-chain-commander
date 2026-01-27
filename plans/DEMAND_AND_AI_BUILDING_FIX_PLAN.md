# 商品需求量低 & AI建造倾向低 - 综合修复方案

## 问题概述

用户反馈两个问题：
1. 很多商品需求量低
2. AI公司建造建筑倾向太低

## 关键设计原则（必须遵守）

**Pop只能在零售店消费物质商品，服务类商品通过服务设施消费**

消费链路：
```
DemandCurve计算理论需求 → world.goods.demands
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
   物质商品                                    服务类商品
        ↓                                           ↓
RetailSystem.processPopConsumption      ServiceConsumption.processServiceConsumption
        ↓                                           ↓
   零售店库存扣减                              服务设施提供服务
        ↓                                           ↓
   完成消费                                    完成消费
```

---

## 问题一：商品需求量低

### 根因分析

#### 1. DemandCurve.ts - 理论需求计算问题

**位置**: `src/core/economy/DemandCurve.ts`

| 问题 | 代码位置 | 现状 | 影响 |
|------|----------|------|------|
| baseRates偏低 | 296-349行 | 大部分商品0.0001-0.001 | 理论需求被低估 |
| 需求缩放过度 | 279-281行 | 超过1万就对数压缩 | 高需求商品被压制 |
| 预算约束过严 | 413-420行 | 削减80% | 实际需求远低于理论 |

#### 2. RetailSystem.ts - 零售消费问题

**位置**: `src/core/economy/RetailSystem.ts`

| 问题 | 代码位置 | 现状 | 影响 |
|------|----------|------|------|
| 消费比例限制 | constants.ts:172 | RETAIL_MAX_CUSTOMER_RATE=0.15 | 每tick只消费15%需求 |
| 进货现金限制 | 463行 | 只用30%现金进货 | 零售库存经常不足 |
| 最小进货量 | 464行 | affordableQty<10跳过 | 小额进货被跳过 |
| 批量处理 | 636-641行 | 每tick只处理5种商品 | 大部分商品等待 |

#### 3. ServiceConsumption.ts - 服务消费问题

**位置**: `src/core/economy/ServiceConsumption.ts`

| 问题 | 代码位置 | 现状 | 影响 |
|------|----------|------|------|
| 人均消费率极低 | 213行 | perCapitaRate=0.001 | 服务几乎无人消费 |
| 服务类型倍率低 | 223-246行 | 教育0.1,医疗0.05 | 重要服务消费不足 |

#### 4. 零售覆盖问题

**位置**: `src/data/buildings.ts` 零售店 retailConfig.allowedGoodsIds

**未被任何零售店覆盖的消费品**:

| 商品ID | 名称 | 类型 | 问题 |
|--------|------|------|------|
| 160 | 葡萄 | 生鲜 | 超市/大卖场应该卖 |
| 8 | 粮食 | 食品原料 | 只有便利店/超市有 |
| 服务类(196-209) | 各种服务 | 服务 | 通过服务设施消费，正确 |

---

### 修复方案

#### 修复1: DemandCurve.ts

```typescript
// 1. 提高 baseRates（约2-3倍）
const baseRates: Record<string, number> = {
  // 食品类 - 高频消费，大幅提高
  'grain': 0.003,        // 从0.001提高
  'processed-food': 0.005,  // 从0.002提高
  'food': 0.006,         // 从0.0025提高
  'beverages': 0.008,    // 从0.003提高
  'snacks': 0.006,       // 从0.002提高
  
  // 日用品 - 提高
  'clothing': 0.002,     // 从0.0008提高
  'detergent': 0.003,    // 从0.001提高
  'cosmetics': 0.002,    // 从0.0006提高
  
  // 电子产品 - 适度提高
  'smartphone': 0.00015, // 从0.00005提高
  'computer': 0.0001,    // 从0.00003提高
  // ... 其他类推
};

// 2. 放宽需求缩放阈值
// 修改 calculateTierDemand 函数
if (demand > 50000) {  // 从10000提高到50000
  demand = 50000 + Math.sqrt(demand / 50000) * 20000;
}

// 3. 放宽预算约束
const budgetRatio = Math.min(1.0, spendingPower / categoryTotal);
if (budgetRatio < 0.5) {  // 从0.8改为0.5，只在极度不足时削减
  adjustedDemand *= 0.7 + budgetRatio * 0.6;  // 削减更温和
}
```

#### 修复2: RetailSystem.ts

```typescript
// 1. 提高消费比例（在constants.ts）
export const RETAIL_MAX_CUSTOMER_RATE = 0.25;  // 从0.15提高到0.25

// 2. 提高进货现金比例（在processRestocking函数）
const affordableQty = Math.floor(ownerCash * 0.5 / maxBuyPrice);  // 从0.3提高到0.5
if (affordableQty < 5) continue;  // 从10降低到5

// 3. 增加批量处理数量（在processPopConsumption函数）
const CONSUMPTION_BATCH_SIZE = 10;  // 从5提高到10

// 4. 降低库存触发阈值
const restockThreshold = 0.6;  // 从0.5提高到0.6，更早触发进货
```

#### 修复3: ServiceConsumption.ts

```typescript
// 1. 提高服务人均消费率
let perCapitaRate = 0.005;  // 从0.001提高5倍

// 2. 调整服务类型倍率
switch (goods.key) {
  case 'education-service':
    perCapitaRate *= 0.3;   // 从0.1提高到0.3
    break;
  case 'healthcare-service':
    perCapitaRate *= 0.2;   // 从0.05提高到0.2
    break;
  case 'entertainment-service':
    perCapitaRate *= 1.0;   // 从0.5提高到1.0
    break;
  case 'catering-service':
    perCapitaRate *= 2.5;   // 从1.5提高到2.5
    break;
  case 'transport-service':
    perCapitaRate *= 3.0;   // 从2.0提高到3.0
    break;
  case 'financial-service':
    perCapitaRate *= 0.3;   // 从0.1提高到0.3
    break;
  case 'hotel-service':
    perCapitaRate *= 0.08;  // 从0.02提高到0.08
    break;
  default:
    perCapitaRate *= 0.6;   // 从0.3提高到0.6
}
```

#### 修复4: buildings.ts 零售覆盖

```typescript
// 超市 allowedGoodsIds 添加葡萄
{
  id: 50,
  key: 'supermarket',
  // ...
  retailConfig: {
    allowedGoodsIds: [
      // ... 现有商品
      160,  // 添加葡萄
    ],
  },
},

// 大卖场 allowedGoodsIds 添加葡萄
{
  id: 51,
  key: 'hypermarket',
  // ...
  retailConfig: {
    allowedGoodsIds: [
      // ... 现有商品
      160,  // 添加葡萄
    ],
  },
},
```

---

## 问题二：AI建造建筑倾向太低

### 根因分析

**位置**: `src/core/ai/AIDecisionEngine.ts` 和 `src/core/ai/AIPersonality.ts`

| 问题 | 代码位置 | 现状 | 影响 |
|------|----------|------|------|
| 投资现金门槛高 | AIDecisionEngine:596-611 | 需要15%现金比例和15万 | 大部分时间不触发投资 |
| 优先级乘数偏低 | AIPersonality:365-386 | investment: 0.7+0.5*bias | 投资优先级被交易挤掉 |
| 缺少强制扩张 | AIDecisionEngine | 无 | 公司长期不建造 |
| 决策数量限制 | AIDecisionEngine:1707 | 最多3个决策 | 投资被排在后面 |

### 修复方案

#### 修复1: AIDecisionEngine.ts - 降低投资门槛

```typescript
// generateInvestmentDecisions 函数
// 1. 降低投资门槛
const minCashRatio = 0.08;  // 从0.15降低到0.08
const minCash = 80000;       // 从150000降低到80000

// 2. 添加强制扩张机制
if (buildingCount < 3 && cash > 200000) {
  // 公司建筑太少，强制添加扩张决策
  decisions.push({
    type: 'build',
    priority: 90,  // 高优先级
    // ...
  });
}
```

#### 修复2: AIDecisionEngine.ts - 新增供需缺口驱动建造（核心新功能）

**功能说明**: 检测市场上需求高但供给不足的商品，优先建造能生产这些商品的建筑

```typescript
/**
 * 检测供需缺口商品
 * @returns 紧缺商品列表，按缺口程度排序
 */
function findShortageGoods(world: GameWorld): Array<{
  goodsId: number;
  demand: number;
  supply: number;
  shortageRatio: number;  // 需求/供给
}> {
  const shortages: Array<{goodsId: number; demand: number; supply: number; shortageRatio: number}> = [];
  
  for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
    const demand = world.goods.demands[goodsId];
    const supply = world.goods.supplies[goodsId];
    
    // 供给为0或很低时，使用需求作为参考
    const effectiveSupply = Math.max(supply, 1);
    const shortageRatio = demand / effectiveSupply;
    
    // 只关注有明显缺口的商品（需求>供给的2倍且需求>100）
    if (shortageRatio > 2.0 && demand > 100) {
      shortages.push({ goodsId, demand, supply, shortageRatio });
    }
  }
  
  // 按缺口程度排序（最紧缺的在前）
  shortages.sort((a, b) => b.shortageRatio - a.shortageRatio);
  
  return shortages.slice(0, 10);  // 最多返回10种最紧缺商品
}

/**
 * 查找能生产指定商品的建筑类型
 */
function findBuildingForGoods(goodsId: number): {
  buildingTypeId: number;
  recipeId: number;
  buildCost: number;
} | null {
  // 遍历所有配方，找到输出该商品的配方
  for (const recipe of ALL_RECIPES) {
    if (recipe.outputs.some(o => o.goodsId === goodsId)) {
      // 找到能使用这个配方的建筑
      for (const building of ALL_BUILDINGS) {
        if (building.availableRecipes.includes(recipe.id)) {
          return {
            buildingTypeId: building.id,
            recipeId: recipe.id,
            buildCost: building.buildCost
          };
        }
      }
    }
  }
  return null;
}

/**
 * 生成紧缺商品生产决策
 */
function generateShortageProductionDecisions(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality
): AIDecision[] {
  const decisions: AIDecision[] = [];
  const cash = world.companies.cash[companyId];
  
  const shortages = findShortageGoods(world);
  
  for (const shortage of shortages) {
    const building = findBuildingForGoods(shortage.goodsId);
    if (!building) continue;
    
    // 检查是否能负担（需要120%的建造成本留余量）
    const canAfford = cash >= building.buildCost * 1.2;
    
    // 优先级：基础50分 + 缺口加成（最高90分）
    let priority = Math.min(90, 50 + shortage.shortageRatio * 5);
    
    // 负担不起时降低优先级但仍保留
    if (!canAfford) {
      priority *= 0.5;
    }
    
    // 根据人格调整（扩张型AI更积极）
    priority *= (0.8 + personality.expansionBias * 0.4);
    
    decisions.push({
      type: 'build',
      priority,
      targetId: building.buildingTypeId,
      metadata: {
        reason: 'shortage_production',
        goodsId: shortage.goodsId,
        goodsName: getGoodsName(shortage.goodsId),
        shortageRatio: shortage.shortageRatio.toFixed(2),
        recipeId: building.recipeId
      }
    });
  }
  
  return decisions;
}

// 在 generateInvestmentDecisions 中调用
function generateInvestmentDecisions(...) {
  // ... 现有逻辑 ...
  
  // 新增：紧缺商品生产决策
  const shortageDecisions = generateShortageProductionDecisions(world, companyId, personality);
  decisions.push(...shortageDecisions);
  
  return decisions;
}
```

#### 修复2: AIPersonality.ts - 提高投资优先级

```typescript
// adjustDecisionPriority 函数
case 'investment':
case 'build':
  // 提高投资优先级基础值
  adjusted.priority *= (1.0 + personality.expansionBias * 0.4);  // 从0.7+0.5*bias改为1.0+0.4*bias
  
  // 减轻现金不足的惩罚
  if (cashRatio < 0.2) {
    adjusted.priority *= (0.6 + cashRatio * 2);  // 更温和的惩罚
  }
  break;
```

#### 修复3: AIDecisionEngine.ts - 调整决策权重

```typescript
// 在 processAIDecisions 或类似函数中
// 确保每轮决策至少包含一个投资决策
const tradeDecisions = decisions.filter(d => d.type === 'trade');
const investDecisions = decisions.filter(d => d.type === 'build' || d.type === 'investment');

// 如果有投资决策但全部被交易挤掉，强制保留一个
if (investDecisions.length > 0 && selected.every(d => d.type === 'trade')) {
  // 替换最低优先级的交易决策
  const bestInvest = investDecisions.sort((a, b) => b.priority - a.priority)[0];
  selected[selected.length - 1] = bestInvest;
}
```

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/core/economy/DemandCurve.ts` | 提高baseRates、放宽缩放阈值、放宽预算约束 |
| `src/core/economy/RetailSystem.ts` | 提高进货效率、增加批量处理 |
| `src/core/economy/ServiceConsumption.ts` | 提高服务消费率 |
| `src/core/constants.ts` | 提高RETAIL_MAX_CUSTOMER_RATE |
| `src/data/buildings.ts` | 完善零售覆盖 |
| `src/core/ai/AIDecisionEngine.ts` | 降低投资门槛、添加强制扩张 |
| `src/core/ai/AIPersonality.ts` | 提高投资优先级 |

---

## 预期效果

1. **商品需求量**: 提升2-3倍
2. **零售消费**: 提升约50%
3. **服务消费**: 提升约5倍
4. **AI建造频率**: 提升约3倍

---

## 验证方法

1. 运行游戏100个tick
2. 观察 `[零售消费]` 日志中的销售量
3. 观察 `[服务消费]` 日志中的服务量
4. 观察AI公司的建筑数量变化
5. 检查 world.goods.demands 数组的值