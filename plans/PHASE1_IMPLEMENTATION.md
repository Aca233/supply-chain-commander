# 第一阶段：核心循环修复 - 实施计划

> **日期**: 2026-01-26
> **状态**: ✅ 已完成
> **完成时间**: 2026-01-26 20:41 UTC+8
> **注意**: 不使用做市商系统，通过优化AI交易提供流动性

---

## 🎯 阶段目标

1. 提高市场流动性（通过AI交易策略优化，不使用做市商）
2. 修复供需计算（理论需求与实际消费匹配）
3. 打通产业链（移除直供机制）

---

## 📋 任务清单

### 任务1：优化AI交易策略

**目标**: 让40家AI公司更积极地参与市场交易

**文件**: `src/core/ai/AIDecisionEngine.ts`

**修改点**:

1. **增加AI交易频率**
   - 当前: AI每24 tick决策一次
   - 目标: 每6 tick决策一次交易
   - 修改常量: `AI_DECISION_INTERVAL`

2. **增加挂单量**
   - 当前: AI挂单量可能不足
   - 目标: 库存超过7天用量时，挂出50%库存
   - 库存超过14天用量时，挂出80%库存

3. **降低卖出价格门槛**
   - 当前: 卖价可能过高导致无人买
   - 目标: 成本×1.1 ~ 成本×1.3（根据库存周转调整）
   - 库存积压时允许亏本出售（成本×0.9）

4. **增加买入意愿**
   - 当前: AI采购可能不积极
   - 目标: 原材料库存低于3天用量时紧急采购
   - 采购价格可上浮至市场价×1.2

**代码修改示例**:

```typescript
// 优化AI卖出决策
function aiSellDecision(company: AICompany, goodsId: number): number {
  const inventory = getInventory(company, goodsId);
  const dailyProduction = getDailyProduction(company, goodsId);
  const inventoryDays = dailyProduction > 0 ? inventory / dailyProduction : 999;
  
  // 根据库存周转天数决定挂单比例
  let sellRatio: number;
  if (inventoryDays > 14) {
    sellRatio = 0.8;  // 积压严重，挂出80%
  } else if (inventoryDays > 7) {
    sellRatio = 0.5;  // 库存偏高，挂出50%
  } else if (inventoryDays > 3) {
    sellRatio = 0.3;  // 正常水平，挂出30%
  } else {
    sellRatio = 0.1;  // 库存偏低，只挂10%
  }
  
  return Math.floor(inventory * sellRatio);
}

// 优化AI定价策略
function aiPricing(company: AICompany, goodsId: number): number {
  const cost = getProductionCost(company, goodsId);
  const marketPrice = getMarketPrice(goodsId);
  const inventoryDays = getInventoryDays(company, goodsId);
  
  // 库存积压时降价
  let priceMultiplier: number;
  if (inventoryDays > 30) {
    priceMultiplier = 0.9;  // 亏本出清
  } else if (inventoryDays > 14) {
    priceMultiplier = 1.05; // 微利
  } else if (inventoryDays > 7) {
    priceMultiplier = 1.15; // 正常利润
  } else {
    priceMultiplier = 1.25; // 惜售
  }
  
  const costBasedPrice = cost * priceMultiplier;
  
  // 参考市场价，取较低者
  return Math.min(costBasedPrice, marketPrice * 1.1);
}
```

---

### 任务2：修复供需计算

**目标**: 理论需求与实际消费匹配

**文件**: 
- `src/core/economy/DemandCurve.ts`
- `src/core/economy/RetailSystem.ts`
- `src/core/constants.ts`

**修改点**:

1. **调整消费速率**
   - 当前: `RETAIL_MAX_CUSTOMER_RATE = 0.05`（每tick消费需求的5%）
   - 目标: 提高到 `0.15`（每tick消费需求的15%）
   - 或根据零售店数量动态调整

2. **需求数据平滑**
   - 当前: 需求每tick重新计算并累加
   - 目标: 需求计算采用滑动平均
   - 消费后从需求池扣除

3. **每日需求重置**
   - 在每天结束时（tick % 24 === 0）
   - 未满足的需求部分衰减（保留70%）
   - 防止需求无限累积

**代码修改示例**:

```typescript
// constants.ts
export const RETAIL_MAX_CUSTOMER_RATE = 0.15;  // 从0.05提高到0.15

// DemandCurve.ts - 添加需求衰减
export function decayUnmetDemand(world: GameWorld): void {
  if (world.tick % TICKS_PER_DAY === 0) {
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      // 未满足的需求保留70%
      world.goods.demands[i] *= 0.7;
    }
  }
}
```

---

### 任务3：移除直供机制，打通产业链

**目标**: 零售商必须从市场采购，消耗生产商库存

**文件**: `src/core/economy/RetailSystem.ts`

**修改点**:

1. **移除直供逻辑**
   - 当前: 市场无卖单时使用"直供"凭空创建商品
   - 目标: 无卖单时等待，不进货

2. **添加生产商自动挂单**
   - AI生产商库存达到阈值时自动创建卖单
   - 确保市场有充足供应

3. **零售商采购优化**
   - 提高采购频率
   - 接受更高的市场价格
   - 采购量基于预测需求

**代码修改示例**:

```typescript
// RetailSystem.ts - 移除直供
function purchaseFromWholesale(
  world: GameWorld,
  storeIndex: number,
  goodsId: number,
  quantity: number
): number {
  // 获取市场卖单
  const sellOrders = getSellOrders(world, goodsId);
  
  let purchased = 0;
  let totalCost = 0;
  
  for (const order of sellOrders) {
    if (purchased >= quantity) break;
    
    const available = order.remaining;
    const amount = Math.min(available, quantity - purchased);
    
    // 创建交易
    executeTrade(world, order, amount);
    
    purchased += amount;
    totalCost += amount * order.price;
  }
  
  // 不再使用直供！如果市场无货，就不进货
  // 删除原来的直供代码块
  
  if (purchased > 0) {
    // 更新零售店库存
    addToRetailInventory(world, storeIndex, goodsId, purchased);
    // 扣除零售商资金
    deductRetailerCash(world, storeIndex, totalCost);
  }
  
  return purchased;
}
```

---

### 任务4：确保AI生产商库存挂单

**目标**: AI公司的产品能够进入市场

**文件**: 
- `src/core/ai/AIDecisionEngine.ts`
- `src/core/loop/GameLoop.ts`

**修改点**:

1. **每tick检查AI库存**
   - 遍历所有AI公司
   - 检查各商品库存
   - 库存超过阈值则挂卖单

2. **卖单价格策略**
   - 基于生产成本
   - 参考当前市场价
   - 根据库存积压程度调整

**代码修改示例**:

```typescript
// AIDecisionEngine.ts - 添加自动挂单函数
export function autoPostSellOrders(world: GameWorld): void {
  const companies = world.companies;
  
  for (let companyId = 1; companyId < companies.count; companyId++) {
    // 跳过玩家公司(ID=0)和无效公司
    if (!isActiveCompany(world, companyId)) continue;
    
    // 遍历该公司生产的商品
    for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
      const inventory = getCompanyInventory(world, companyId, goodsId);
      const dailyOutput = getCompanyDailyOutput(world, companyId, goodsId);
      
      if (dailyOutput === 0) continue;  // 不生产此商品
      
      const inventoryDays = inventory / dailyOutput;
      
      // 库存超过3天才开始挂单
      if (inventoryDays > 3) {
        const sellQuantity = aiSellDecision(world, companyId, goodsId);
        const sellPrice = aiPricing(world, companyId, goodsId);
        
        if (sellQuantity > 0) {
          createSellOrder(world, companyId, goodsId, sellQuantity, sellPrice);
        }
      }
    }
  }
}

// GameLoop.ts - 在主循环中调用
async processTick(): Promise<void> {
  // ... 其他处理
  
  // 每tick处理AI自动挂单
  autoPostSellOrders(this.world);
  
  // ... 其他处理
}
```

---

## ✅ 已完成的修改

### 1. `src/core/constants.ts`
- `RETAIL_MAX_CUSTOMER_RATE`: 0.05 → 0.15（提高消费速率3倍）
- `AI_DECISION_INTERVAL`: 24 → 6（AI决策频率提高4倍）

### 2. `src/core/economy/DemandCurve.ts`
- 新增 `decayUnmetDemand()` 函数
- 每天结束时未满足的需求衰减30%
- 防止需求无限累积

### 3. `src/core/economy/RetailSystem.ts`
- 移除直供机制：`purchaseFromProducers()` 返回空
- 优化 `purchaseFromWholesale()`：按价格排序购买
- 添加采购不足时的调试日志

### 4. `src/core/ai/AIDecisionEngine.ts`
- 新增 `autoPostSellOrders()` - AI自动挂卖单
- 新增 `autoPostBuyOrders()` - AI自动挂买单
- 新增 `estimateDailyOutput()` - 估算日产量
- 新增 `hasExistingOrder()` - 检查重复挂单

### 5. `src/core/loop/GameLoop.ts`
- 集成 `autoPostSellOrders()` 和 `autoPostBuyOrders()`
- 集成 `decayUnmetDemand()` 每日需求衰减
- 新增 `aiAutoOrders` 统计到 `TickResult`

---

## 🔍 验证标准

完成后需要验证：

1. **市场流动性**
   - [x] AI自动挂单系统已实现
   - [ ] 每种消费品每天至少有10笔成交（待运行时验证）
   - [ ] 订单簿中始终有买卖盘（待运行时验证）

2. **供需平衡**
   - [x] 需求衰减机制已实现
   - [ ] 需求数据不会无限累积（待运行时验证）
   - [ ] 价格在合理范围内波动（待运行时验证）

3. **产业链打通**
   - [x] 直供机制已移除
   - [ ] 零售店从市场采购，不再直供（待运行时验证）
   - [ ] AI生产商库存能够销售出去（待运行时验证）

---

## 📁 涉及文件

| 文件 | 修改内容 |
|------|----------|
| `src/core/constants.ts` | 调整 RETAIL_MAX_CUSTOMER_RATE |
| `src/core/ai/AIDecisionEngine.ts` | 优化交易策略、添加自动挂单 |
| `src/core/economy/DemandCurve.ts` | 添加需求衰减 |
| `src/core/economy/RetailSystem.ts` | 移除直供机制 |
| `src/core/loop/GameLoop.ts` | 集成新的AI挂单逻辑 |

---

## ⚠️ 风险点

1. **市场可能出现供应不足**
   - 解决: 初期调高AI初始库存
   - 解决: 降低消费速率直到供应跟上

2. **价格可能剧烈波动**
   - 解决: 保持价格变化上限（MAX_TICK_PRICE_CHANGE）
   - 解决: 增加价格平滑系数

3. **玩家初期可能难以盈利**
   - 解决: 提供更多初始资金
   - 解决: 给予新手任务奖励

---

*计划完成，等待切换到Code模式实施*