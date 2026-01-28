# 水泥后期无人生产问题修复

## 问题描述

游戏后期出现水泥无人生产的情况：
- 订单簿显示有大量买单（约16,000+单位，价格¥80 = 2倍基准价）
- 但卖单数量为0，完全没有供应
- 价格稳定在¥40（基准价），说明没有任何交易发生
- 这导致整个建造系统停滞（因为所有建筑都需要水泥）

## 根本原因

1. **水泥的需求是"隐性"的**
   - `isConsumerGood: false` → 不参与消费者需求计算
   - 水泥需求来自两个渠道：
     - 建筑建造需求（派生需求）
     - 生产配方需求（建筑材料生产）
   - 这两种需求都不会体现在 `world.goods.demands[21]` 中

2. **AI决策盲区**
   - `findShortageGoods()` 只检查 `goods.demands`
   - 当 `demands[21] < 10` 时，水泥被跳过
   - AI认为"水泥没需求"→ 不建造水泥厂

3. **恶性循环**
   ```
   AI不建水泥厂 → 水泥供应归零 → 无法建造任何建筑 → 经济停滞
   ```

## 修复方案

### 1. 订单簿需求检测 (AIDecisionEngine.ts)

修改 `findShortageGoods()` 函数：

```typescript
// 检测订单簿中的买单总量
const orderBookView = getOrderBookView(world, goodsId);
const orderBookBuyDemand = orderBookView.totalBuyVolume;
const orderBookSellSupply = orderBookView.totalSellVolume;

// 订单簿信号检测
// 如果有大量买单但没有卖单，这是强烈的供应短缺信号
const hasOrderBookShortage = orderBookBuyDemand > 100 && orderBookSellSupply === 0;
```

### 2. 提高订单簿短缺商品的建造优先级

修改 `generateShortageProductionDecisions()`：

```typescript
// 当订单簿显示有大量买单但无供应时，优先级+3
const orderBookBonus = hasOrderBookShortage ? 3 : 0;
const basePriority = 8 + priorityBonus + orderBookBonus; // 8-15
```

### 3. 战略物资监控系统

新增函数 `runStrategicMaterialCheck()`：

```typescript
const STRATEGIC_BUILDING_MATERIALS = [
  // === 建筑材料 ===
  { goodsId: 14, name: '钢材', minSupply: 500, buildingTypeId: 8 },
  { goodsId: 21, name: '水泥', minSupply: 500, buildingTypeId: 14 },
  { goodsId: 17, name: '玻璃', minSupply: 300, buildingTypeId: 11 },
  { goodsId: 36, name: '建筑材料', minSupply: 200, buildingTypeId: 14 },
  { goodsId: 6, name: '木材', minSupply: 400, buildingTypeId: 5 },
  
  // === 关键中间材料 ===
  { goodsId: 11, name: '天然橡胶', minSupply: 300, buildingTypeId: 32 },
  { goodsId: 19, name: '橡胶制品', minSupply: 200, buildingTypeId: 10 },
  { goodsId: 20, name: '化学品', minSupply: 300, buildingTypeId: 10 },
  { goodsId: 18, name: '塑料', minSupply: 300, buildingTypeId: 10 },
  { goodsId: 15, name: '铜材', minSupply: 200, buildingTypeId: 8 },
  { goodsId: 16, name: '铝材', minSupply: 200, buildingTypeId: 15 },
  
  // === 原材料 ===
  { goodsId: 0, name: '铁矿石', minSupply: 500, buildingTypeId: 0 },
  { goodsId: 3, name: '煤炭', minSupply: 500, buildingTypeId: 2 },
  { goodsId: 9, name: '硅石', minSupply: 300, buildingTypeId: 7 },
  { goodsId: 12, name: '化工原料', minSupply: 300, buildingTypeId: 9 },
];
```

当检测到关键物资短缺时，生成优先级为15的紧急建造决策。

### 4. GameLoop集成

在GameLoop.ts中每100tick调用 `runStrategicMaterialCheck()`。

## 修改的文件

1. **src/core/ai/AIDecisionEngine.ts**
   - `findShortageGoods()` - 增加订单簿需求检测
   - `generateShortageProductionDecisions()` - 提高订单簿短缺商品优先级
   - 新增 `generateStrategicMaterialDecisions()` - 战略建材决策
   - 新增 `runStrategicMaterialCheck()` - 战略建材检查

2. **src/core/loop/GameLoop.ts**
   - 导入 `runStrategicMaterialCheck`
   - 添加战略建材检查调用

## 预期效果

1. AI能够检测到订单簿中的"隐性需求"（大量买单但无供应）
2. 水泥、钢材等建材短缺时，AI会优先建造相关工厂
3. 建造系统不会因建材断供而停滞
4. 经济循环能够持续运转

## 调试日志

修复后会输出以下日志：
- `[AI商机检测 T{tick}] 公司{id}发现{商品名}订单簿短缺...`
- `[战略建材紧急 T{tick}] 公司{id}检测到{商品名}紧急短缺...`
- `[战略建材 T{tick}] 触发了{n}个紧急建造决策`
