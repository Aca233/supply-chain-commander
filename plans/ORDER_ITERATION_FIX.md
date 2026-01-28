# 订单遍历性能问题修复方案

## 问题根源

当 `MAX_ORDERS` 从 50,000 增加到 1,000,000 时，性能从 10-20ms 下降到 175ms。

**根本原因**：代码中存在多个 `for (let i = 0; i < MAX_ORDERS; i++)` 循环，当 MAX_ORDERS=100万时，每次遍历100万个槽位。

## 问题代码位置

### 1. cleanupExpiredOrders (每tick调用！)
```typescript
// OrderBook.ts 第769行
export function cleanupExpiredOrders(world: GameWorld): number {
  const o = world.orders;
  let cleanedCount = 0;
  
  for (let i = 0; i < MAX_ORDERS; i++) {  // ← 遍历100万！
    if (o.isActive[i] && o.expiries[i] <= world.tick) {
      cancelOrder(world, i);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}
```

### 2. getOrderBookView (获取订单簿时调用)
```typescript
// OrderBook.ts 第791行
export function getOrderBookView(world: GameWorld, goodsId: number): OrderBookView {
  const o = world.orders;
  
  for (let i = 0; i < MAX_ORDERS; i++) {  // ← 遍历100万！
    if (!o.isActive[i] || o.goodsIds[i] !== goodsId) continue;
    // ...
  }
}
```

### 3. syncOrderPoolWithWorld (同步时调用)
```typescript
// OrderBook.ts 第229行
for (let i = 0; i < MAX_ORDERS; i++) {  // ← 遍历100万！
  if (o.isActive[i]) {
    activeOrderIndices.push(i);
    // ...
  }
}
```

### 4. countExistingBuyOrders (RetailSystem.ts)
```typescript
// RetailSystem.ts 第455行
for (let i = 0; i < MAX_ORDERS; i++) {  // ← 遍历100万！
  if (!o.isActive[i]) continue;
  if (o.companyIds[i] !== companyId) continue;
  if (o.types[i] !== 0) continue;
  // ...
}
```

## 解决方案

### 方案：维护活跃订单索引集合

在 `OrderBook.ts` 中添加一个 `Set<number>` 来跟踪所有活跃订单的索引：

```typescript
// 全局活跃订单索引集合
const activeOrderIndices: Set<number> = new Set();

// 在 createBuyOrder / createSellOrder 中添加：
activeOrderIndices.add(orderIdx);

// 在 cancelOrder 中移除：
activeOrderIndices.delete(orderIdx);

// cleanupExpiredOrders 优化：
export function cleanupExpiredOrders(world: GameWorld): number {
  const o = world.orders;
  let cleanedCount = 0;
  
  // 只遍历活跃订单（通常只有几千个）
  for (const orderIdx of activeOrderIndices) {
    if (o.expiries[orderIdx] <= world.tick) {
      cancelOrder(world, orderIdx);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}

// getOrderBookView 优化：
export function getOrderBookView(world: GameWorld, goodsId: number): OrderBookView {
  const o = world.orders;
  
  // 只遍历活跃订单
  for (const orderIdx of activeOrderIndices) {
    if (o.goodsIds[orderIdx] !== goodsId) continue;
    // ...
  }
}
```

## 具体修改清单

### OrderBook.ts 修改

1. **新增全局变量**（约第116行附近）：
```typescript
// 活跃订单索引集合（避免遍历全量订单池）
const activeOrderIndices: Set<number> = new Set();

// 导出获取函数供其他模块使用
export function getActiveOrderIndices(): Set<number> {
  return activeOrderIndices;
}
```

2. **修改 `createBuyOrder`**（约第541行）：
```typescript
// 在 o.activeCount++; 之后添加：
activeOrderIndices.add(orderIdx);
```

3. **修改 `createSellOrderWithReason`**（约第698行）：
```typescript
// 在 o.activeCount++; 之后添加：
activeOrderIndices.add(orderIdx);
```

4. **修改 `cancelOrder`**（约第749行）：
```typescript
// 在 o.isActive[orderIdx] = 0; 之后添加：
activeOrderIndices.delete(orderIdx);
```

5. **修改 `cleanupExpiredOrders`**（约第765行）：
```typescript
export function cleanupExpiredOrders(world: GameWorld): number {
  const o = world.orders;
  let cleanedCount = 0;
  
  // 收集要删除的订单（避免在遍历中修改集合）
  const toDelete: number[] = [];
  
  for (const orderIdx of activeOrderIndices) {
    if (o.expiries[orderIdx] <= world.tick) {
      toDelete.push(orderIdx);
    }
  }
  
  for (const orderIdx of toDelete) {
    cancelOrder(world, orderIdx);
    cleanedCount++;
  }
  
  return cleanedCount;
}
```

6. **修改 `getOrderBookView`**（约第782行）：
```typescript
export function getOrderBookView(world: GameWorld, goodsId: number): OrderBookView {
  const o = world.orders;
  
  const buyOrders: OrderView[] = [];
  const sellOrders: OrderView[] = [];
  
  // 使用活跃订单索引，避免遍历100万
  for (const orderIdx of activeOrderIndices) {
    if (o.goodsIds[orderIdx] !== goodsId) continue;
    
    const orderView: OrderView = {
      idx: orderIdx,
      companyId: o.companyIds[orderIdx],
      price: o.prices[orderIdx],
      remaining: o.remainings[orderIdx],
      createdTick: o.createdTicks[orderIdx],
    };
    
    if (o.types[orderIdx] === 0) {
      buyOrders.push(orderView);
    } else {
      sellOrders.push(orderView);
    }
  }
  
  // 排序逻辑保持不变...
}
```

7. **修改 `syncOrderPoolWithWorld`**（约第221行）：
```typescript
export function syncOrderPoolWithWorld(world: GameWorld): { fixed: boolean; details: string } {
  const o = world.orders;
  
  // 使用TypedArray的isActive来重建索引（只在同步时遍历一次）
  activeOrderIndices.clear();
  let actualBuyCount = 0;
  let actualSellCount = 0;
  
  for (let i = 0; i < MAX_ORDERS; i++) {
    if (o.isActive[i]) {
      activeOrderIndices.add(i);
      if (o.types[i] === 0) {
        actualBuyCount++;
      } else {
        actualSellCount++;
      }
    }
  }
  
  // ... 其余逻辑
}
```

8. **修改 `resetOrderPool`**（约第211行）：
```typescript
export function resetOrderPool(): void {
  orderPool = new OrderPool(MAX_ORDERS);
  companyGoodsIndex = new CompanyGoodsOrderIndex();
  activeOrderIndices.clear();  // 清空活跃索引
  orderPoolInitialized = true;
}
```

### RetailSystem.ts 修改

在 `countExistingBuyOrders` 中已经有了缓存机制，但初次计算时仍遍历 MAX_ORDERS。可以使用公司商品索引代替：

```typescript
function countExistingBuyOrders(world: GameWorld, companyId: number, goodsId: number): number {
  // 直接使用 hasExistingOrderForCompanyGoods 或导入 CompanyGoodsOrderIndex
  // 这已经是 O(1) 的操作
  return getCompanyGoodsIndex().count(companyId, goodsId, 0);
}
```

但 `getCompanyGoodsIndex()` 是 OrderBook.ts 的私有函数，需要导出。

## 预期效果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| cleanupExpiredOrders | O(1,000,000) | O(活跃订单数 ≈ 1000-10000) |
| getOrderBookView | O(1,000,000) | O(活跃订单数) |
| 总tick时间 | ~175ms | 预计恢复到 15-25ms |

## 实施步骤

1. 在 OrderBook.ts 中添加 `activeOrderIndices` 集合
2. 修改订单创建/取消函数维护集合
3. 修改遍历函数使用集合
4. 测试验证性能恢复

## 快速验证方法

修改后运行游戏，观察：
1. 性能监控面板的 tick 时间是否恢复到 15-25ms
2. 订单功能是否正常（创建、撮合、取消、过期）