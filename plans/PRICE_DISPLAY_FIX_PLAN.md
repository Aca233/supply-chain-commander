# 价格显示与市场机制修复计划

## 问题概述

用户反馈截图显示"专利药"商品存在以下问题：
1. "最新成交价"显示 ¥17,892.70（涨幅+3478.5%），但"成交记录"显示"暂无成交记录"
2. 参考价格仅为 ¥500.00
3. 买方报价都在 ¥700-¥900 范围，远低于所谓的"成交价"
4. 右侧挂单价格与"最新成交价"严重脱节

## 根本原因分析

### 问题1：UI标签误导

**位置**: `src/ui/pages/Market.tsx` 第59-61行, 第403-405行

```typescript
// 获取的是系统计算价格，不是真正的成交价
const getCurrentPrice = (goodsId: number) => {
  return world?.goods.prices[goodsId] || ...
};

// UI错误标注
<p className="text-sm text-text-tertiary mb-1">最新成交价</p>
<p className="text-2xl font-bold text-accent">¥{currentPrice.toFixed(2)}</p>
```

`world.goods.prices[goodsId]` 是**价格引擎计算的理论均衡价格**，不是**真实成交记录的价格**。

### 问题2：价格计算无上下限

**位置**: `src/core/economy/PriceEngine.ts` 第80-166行

```typescript
// updateAllPrices 函数中
if (ratio > 1.05) {
  // 需求大于供给，涨价 - 每tick可涨10%
  targetChange = Math.min(0.10, excess * 0.05);
}
// 问题：没有价格上下限！
// 当持续供不应求时，价格可无限上涨
```

均值回归只在供需平衡时生效（第114-118行），而专利药长期供不应求，导致价格累积上涨。

### 问题3：高端产品产能严重不足

**位置**: `src/core/world/WorldInitializer.ts` 第336-343行

```typescript
// 康美制药只有2个制药厂
{
  name: '康美制药',
  cash: 50000000,
  buildings: [29, 30, 30],   // 1个药材园 + 2个制药厂
  outputGoods: [70, 71, 72, 73, 74, 75, 76],  // 7种药品共享2个工厂
}
```

专利药(ID=75)基准价¥500，市场需求高，但只有2个制药厂生产7种药品，产能严重不足。

---

## 修复方案

### 修复1：UI显示真实成交价

**文件**: `src/ui/pages/Market.tsx`

**改动**:
1. 添加获取真实最后成交价的函数
2. 修改UI显示逻辑，无成交时显示"暂无成交"
3. 区分"市场价格"和"最后成交价"

```typescript
// 新增：获取真实最后成交价
const getLastTradePrice = (goodsId: number): number | null => {
  if (!world) return null;
  const t = world.trades;
  
  // 从最新往回找该商品的成交记录
  for (let i = t.count - 1; i >= Math.max(0, t.count - 1000); i--) {
    const idx = i % t.maxTrades;
    if (t.goodsIds[idx] === goodsId) {
      return t.prices[idx];
    }
  }
  return null;  // 无成交记录
};

// 修改：UI显示逻辑
const lastTradePrice = getLastTradePrice(selectedGoodsId);
const marketPrice = getCurrentPrice(selectedGoodsId);  // 理论市场价

// 价格卡片1：显示真实最后成交价
<div className="card p-4">
  <p className="text-sm text-text-tertiary mb-1">最新成交价</p>
  {lastTradePrice !== null ? (
    <>
      <p className="text-2xl font-bold text-accent">¥{lastTradePrice.toFixed(2)}</p>
      <p className="text-xs text-chart-up mt-1">
        较参考价 {((lastTradePrice / selectedGoods.basePrice - 1) * 100).toFixed(1)}%
      </p>
    </>
  ) : (
    <p className="text-xl text-text-tertiary">暂无成交</p>
  )}
</div>

// 价格卡片2：显示系统计算的市场价格（可选保留）
<div className="card p-4">
  <p className="text-sm text-text-tertiary mb-1">市场均衡价</p>
  <p className="text-2xl font-bold text-yellow-400">¥{marketPrice.toFixed(2)}</p>
</div>
```

### 修复2：添加价格上下限机制

**文件**: `src/core/constants.ts`

**新增常量**:
```typescript
/** 价格相对于基准价的最大倍数 */
export const MAX_PRICE_RATIO = 5.0;  // 最高5倍基准价

/** 价格相对于基准价的最小倍数 */
export const MIN_PRICE_RATIO = 0.2;  // 最低20%基准价

/** 无成交时的均值回归增强系数 */
export const NO_TRADE_REVERSION_MULTIPLIER = 5.0;
```

**文件**: `src/core/economy/PriceEngine.ts`

**修改 `updateAllPrices` 函数**:
```typescript
import { 
  MAX_TICK_PRICE_CHANGE, 
  MEAN_REVERSION_RATE, 
  SUPPLY_DEMAND_SMOOTHING,
  MAX_PRICE_RATIO,
  MIN_PRICE_RATIO,
  NO_TRADE_REVERSION_MULTIPLIER
} from '../constants';

export function updateAllPrices(world: GameWorld): PriceUpdateResult {
  const g = world.goods;
  // ...
  
  for (let i = 0; i < g.count; i++) {
    const currentPrice = g.prices[i];
    const baseValue = g.baseValues[i];
    
    // 获取24小时成交量
    const volume24h = get24hVolume(world, i);
    
    // === 新增：无成交时强化均值回归 ===
    if (volume24h === 0) {
      // 无成交：强力回归基准价
      const reversionPull = (baseValue - currentPrice) / currentPrice 
        * MEAN_REVERSION_RATE * NO_TRADE_REVERSION_MULTIPLIER;
      let newPrice = currentPrice * (1 + reversionPull);
      
      // 限制在允许范围内
      newPrice = Math.max(baseValue * MIN_PRICE_RATIO, 
                 Math.min(baseValue * MAX_PRICE_RATIO, newPrice));
      g.prices[i] = newPrice;
      continue;
    }
    
    // ... 原有供需计算逻辑 ...
    
    // === 新增：最终价格限制 ===
    let finalPrice = stabilizePrice(currentPrice, targetPrice, baseValue);
    
    // 硬性上下限
    const maxPrice = baseValue * MAX_PRICE_RATIO;
    const minPrice = baseValue * MIN_PRICE_RATIO;
    finalPrice = Math.max(minPrice, Math.min(maxPrice, finalPrice));
    
    g.prices[i] = finalPrice;
  }
  // ...
}
```

### 修复3：增加高端产品产能

**文件**: `src/core/world/WorldInitializer.ts`

**修改AI公司配置**:

```typescript
// 原有康美制药：增加产能
{
  name: '康美制药',
  cash: 80000000,  // 增加资金
  buildings: [29, 29, 30, 30, 30, 30],  // 2个药材园 + 4个制药厂
  starterGoods: [20, 12, 37],
  outputGoods: [70, 71, 72, 73, 74, 75, 76],
},

// 新增：专门生产专利药的公司
{
  name: '辉瑞中国',
  cash: 100000000,
  buildings: [30, 30, 30],  // 3个制药厂
  starterGoods: [70, 71, 20, 12],  // 药材、医药化工品、化学品、化工原料
  outputGoods: [75],  // 专门生产专利药
},

// 新增：仿制药生产商
{
  name: '华海药业',
  cash: 60000000,
  buildings: [30, 30],  // 2个制药厂
  starterGoods: [70, 71, 20],
  outputGoods: [74, 76],  // 仿制药、非处方药
},
```

**增加初始库存**:
```typescript
// 在 generateInitialMarketOrders 中为高端药品增加初始卖单
const highValueGoods = [75, 73, 72, ...]; // 专利药、疫苗、抗生素等

for (const goodsId of highValueGoods) {
  // 确保多家AI公司有库存并挂出卖单
  for (let companyId = 1; companyId < 5; companyId++) {
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    // 给予初始库存
    setInventory(world, companyId, goodsId, 50 + Math.random() * 100);
    
    // 挂出卖单
    const sellPrice = goods.basePrice * (0.9 + Math.random() * 0.2);
    createSellOrder(world, companyId, goodsId, 20, sellPrice);
  }
}
```

---

## 实施顺序

1. **第一步**: 修改 `src/core/constants.ts`，添加价格限制常量
2. **第二步**: 修改 `src/core/economy/PriceEngine.ts`，实现价格上下限和无成交时的强化均值回归
3. **第三步**: 修改 `src/ui/pages/Market.tsx`，区分"最后成交价"和"市场价格"
4. **第四步**: 修改 `src/core/world/WorldInitializer.ts`，增加高端产品产能
5. **第五步**: 测试验证所有修复是否生效

---

## 预期效果

1. **UI清晰**: 用户能清楚区分"最后成交价"（真实交易）和"市场价格"（系统计算）
2. **价格合理**: 价格波动被限制在基准价的20%-500%范围内
3. **市场活跃**: 高端产品有足够供给，能形成真实交易
4. **无成交提示**: 当商品从未成交时，显示"暂无成交"而非虚假价格

---

## 相关文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/core/constants.ts` | 新增价格限制常量 |
| `src/core/economy/PriceEngine.ts` | 价格上下限、无成交均值回归 |
| `src/ui/pages/Market.tsx` | 区分真实成交价和市场价 |
| `src/core/world/WorldInitializer.ts` | 增加AI公司产能和初始库存 |