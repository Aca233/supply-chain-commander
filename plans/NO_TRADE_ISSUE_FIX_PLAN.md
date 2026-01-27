# 订单不成交问题修复计划

## 问题概述

从市场页面截图分析，发现"成交记录"显示"暂无成交记录"，尽管买卖价格已经可以匹配。

## 根本原因分析

### 1. 零售系统直接采购绕过交易记录

**位置**: `src/core/economy/RetailSystem.ts:277-357`

零售店的 `purchaseFromSellOrders()` 函数直接修改订单和库存，但**没有创建交易记录**：

```typescript
// 当前代码（问题所在）
c.cash[ownerId] -= cost;
c.cash[sellerId] += cost;
c.inventories[...] += buyQty;
o.remainings[sellOrder.idx] -= buyQty;
// ❌ 缺少: 创建 world.trades 记录
```

### 2. B2B采购不记录交易

**位置**: `src/core/economy/ConsumerMarket.ts:294-373`

同样的问题存在于企业间的B2B采购。

### 3. 消费品通过零售系统分流

消费品（如"加工食品"）的需求通过零售店满足，而不是直接从批发市场：

```typescript
// ConsumerMarket.ts:94-106
if (world.retail && world.retail.count > 0) {
  const retailResult = updateRetailSystem(world);
  // Pop消费被零售系统处理
}
```

## 修复方案

### 方案1: 在零售直购中添加交易记录（推荐）

修改 `RetailSystem.ts` 的 `purchaseFromSellOrders()` 函数：

```typescript
function purchaseFromSellOrders(
  world: GameWorld,
  ownerId: number,
  goodsId: number,
  maxQuantity: number,
  maxPrice: number
): { purchased: number; spent: number } {
  // ... 现有代码 ...
  
  for (const sellOrder of eligibleSellOrders) {
    // ... 执行交易逻辑 ...
    
    // ✅ 添加交易记录
    const t = world.trades;
    const tradeIdx = t.count % t.maxTrades;
    
    t.buyOrderIds[tradeIdx] = -1;  // 直接采购无正式买单
    t.sellOrderIds[tradeIdx] = sellOrder.idx;
    t.buyCompanyIds[tradeIdx] = ownerId;
    t.sellCompanyIds[tradeIdx] = sellerId;
    t.goodsIds[tradeIdx] = goodsId;
    t.quantities[tradeIdx] = buyQty;
    t.prices[tradeIdx] = sellOrder.price;
    t.ticks[tradeIdx] = world.tick;
    t.count++;
    
    // ... 继续现有逻辑 ...
  }
}
```

### 方案2: 在B2B采购中添加交易记录

修改 `ConsumerMarket.ts` 的 `executeCompanyPurchase()` 函数，确保所有B2B交易都记录。

**注意**: 该函数已经包含交易记录逻辑（lines 347-360），需要验证是否正确执行。

### 方案3: 增强撮合引擎的调试输出

在 `MatchingEngine.ts` 中添加详细日志：

```typescript
function matchOrdersForGoods(world: GameWorld, goodsId: number): Trade[] {
  // 添加调试日志
  if (world.tick % 100 === 0 && goodsId === 24) {  // 24=加工食品
    console.log(`[撮合调试 商品${goodsId}]`, {
      买单数: buyIndices.length,
      卖单数: sellIndices.length,
      最高买价: buyIndices.length > 0 ? o.prices[buyIndices[0]] : 'N/A',
      最低卖价: sellIndices.length > 0 ? o.prices[sellIndices[0]] : 'N/A',
    });
  }
  
  // ... 现有逻辑 ...
}
```

## 代码修改清单

### 文件1: `src/core/economy/RetailSystem.ts`

**修改函数**: `purchaseFromSellOrders()`

在第345行后添加交易记录创建逻辑。

### 文件2: `src/core/economy/ConsumerMarket.ts`

**验证函数**: `executeCompanyPurchase()` 和 `executeOrderPurchase()`

确保第347-360行的交易记录代码正确执行。

### 文件3: `src/core/market/MatchingEngine.ts`

**添加调试**: `matchOrdersForGoods()`

在价格匹配前添加日志输出。

## 测试验证步骤

1. 启动游戏，打开浏览器控制台
2. 观察每100tick的日志输出
3. 在市场页面挂一个测试卖单
4. 检查"成交记录"是否更新
5. 验证玩家现金变化是否正确

## 预期结果

修复后：
- ✅ "成交记录"显示所有交易
- ✅ 包括零售直购的交易
- ✅ 包括B2B采购的交易
- ✅ 包括撮合引擎匹配的交易
- ✅ 玩家的低价卖单能够与高价买单成交

## 附加建议

### 1. 自成交防护

在撮合引擎中添加检查，防止同一公司的买卖单自我成交：

```typescript
// MatchingEngine.ts 第84行后添加
if (buyCompanyId === sellCompanyId) {
  sellPtr++;
  continue;  // 跳过自成交
}
```

### 2. 价格显示优化

在Market.tsx中，区分显示：
- 最近成交价（实际交易价格）
- 市场均衡价（系统计算价格）
- 买卖盘口（挂单价格）

当前已实现，但需确保数据源正确。

## 开发优先级

1. **高**: 修复零售直购的交易记录（方案1）
2. **高**: 验证B2B采购的交易记录
3. **中**: 添加撮合引擎调试日志
4. **低**: 自成交防护