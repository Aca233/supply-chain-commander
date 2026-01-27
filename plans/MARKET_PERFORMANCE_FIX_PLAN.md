# 市场交易界面掉帧问题分析与优化计划

## 问题概述

在游戏运行时，市场交易界面（Market.tsx）出现明显掉帧，影响用户体验。

## 根本原因分析

### 1. 每次渲染都进行大量计算（最严重）

**位置**: `Market.tsx` 第305-314行

```tsx
// 这些计算在每次渲染时都执行，没有使用 useMemo！
const currentPrice = getCurrentPrice(selectedGoodsId);
const lastTradePrice = getLastTradePrice(selectedGoodsId);
const playerStock = getPlayerStock(selectedGoodsId);
const marketRanking = getMarketShareRanking(selectedGoodsId);  // 遍历所有公司
const orderBook = getOrderBook(selectedGoodsId);              // 遍历所有订单
const recentTrades = getRecentTrades(selectedGoodsId);        // 搜索10000条记录
const playerOrders = getPlayerOrders(selectedGoodsId);
const allPlayerOrders = getAllPlayerOrders();                 // 遍历所有订单
const producerBuildings = getProducerBuildings(selectedGoodsId);
const consumerBuildings = getConsumerBuildings(selectedGoodsId);
```

**问题详情**:
- `getMarketShareRanking()` - 遍历所有公司的累计销售数据 O(companies × goods)
- `getOrderBook()` - 遍历 world.orders.maxOrders 个订单 O(maxOrders)
- `getRecentTrades()` - 搜索最近10000条交易记录 O(10000)
- `getAllPlayerOrders()` - 遍历所有订单 O(maxOrders)

### 2. PriceChart 内的复杂数据处理

**位置**: `Market.tsx` 第545-607行

```tsx
{world && (() => {
  // 这是一个 IIFE (立即执行函数)，每次渲染都执行！
  const priceHistoryData: PriceDataPoint[] = [];
  const historyLength = Math.min(HISTORY_SIZE, 200);
  
  for (let i = 0; i < historyLength; i++) {
    // 200次循环计算价格历史
    // 每个循环内还有成交量计算：最多1000次内循环
  }
  
  return <PriceChart data={priceHistoryData} ... />;
})()}
```

**问题**: 每次渲染执行 200 × 1000 = 200,000 次循环操作！

### 3. 缺少组件记忆化

**问题**:
- 商品列表没有使用 `React.memo`
- 订单簿组件每次都重新渲染
- 成交记录列表没有缓存

### 4. gameStore 状态更新触发全组件重渲染

**问题**:
- `tick` 每秒更新一次（1x速度）或更频繁
- Market 组件订阅了 `getWorld()`，每次 tick 都会触发重渲染
- 没有使用精细化的 selector 来减少不必要的更新

### 5. ECharts 配置对象频繁重建

**位置**: `PriceChart.tsx`

虽然已经设置了：
```tsx
animation: false,
notMerge={true}
lazyUpdate={true}
```

但 `option` 对象每次渲染都是新的，导致 ECharts 仍需比较和更新。

---

## 优化方案

### 阶段1: 紧急修复（高优先级）

#### 1.1 将昂贵计算移入 useMemo

```tsx
// 使用 useMemo 缓存计算结果
const marketRanking = useMemo(() => {
  return getMarketShareRanking(selectedGoodsId);
}, [selectedGoodsId, world?.trades.count]); // 只在选中商品或交易数变化时重算

const orderBook = useMemo(() => {
  return getOrderBook(selectedGoodsId);
}, [selectedGoodsId, world?.orders.activeCount]);

const recentTrades = useMemo(() => {
  return getRecentTrades(selectedGoodsId);
}, [selectedGoodsId, world?.trades.count]);

// ... 其他类似
```

#### 1.2 价格历史数据提取到 useMemo

```tsx
const priceHistoryData = useMemo(() => {
  if (!world) return [];
  
  const data: PriceDataPoint[] = [];
  const historyLength = Math.min(HISTORY_SIZE, 200);
  
  for (let i = 0; i < historyLength; i++) {
    // ... 数据处理
  }
  
  return data;
}, [selectedGoodsId, world?.goods.historyIndex, world?.tick]);
```

#### 1.3 减少成交量计算的循环次数

```tsx
// 原代码：每个价格点都搜索1000条交易
for (let t = 0; t < world.trades.count && t < 1000; t++) { ... }

// 优化：预先聚合成交量数据，或直接跳过成交量计算（可选显示）
```

### 阶段2: 组件拆分与记忆化

#### 2.1 拆分 Market.tsx 为多个子组件

```
Market.tsx
├── GoodsList.tsx (React.memo)
│   └── GoodsItem.tsx (React.memo)
├── PriceInfoCards.tsx (React.memo)
├── MarketRankingPanel.tsx (React.memo)
├── OrderBookPanel.tsx (React.memo)
├── RecentTradesPanel.tsx (React.memo)
├── TradingPanel.tsx (React.memo)
└── PlayerOrdersPanel.tsx (React.memo)
```

#### 2.2 使用精细化的状态选择器

```tsx
// 在 selectors.ts 中添加
export function useSelectedGoodsPrice(goodsId: number) {
  const getWorld = useGameStore((state) => state.getWorld);
  const tick = useGameTick();
  
  // 使用节流，每5个tick更新一次
  return useTickIntervalValue(() => {
    const world = getWorld();
    return world?.goods.prices[goodsId] ?? 0;
  }, 5);
}
```

### 阶段3: 数据更新优化

#### 3.1 订单簿使用增量更新

```tsx
// 使用 useRef 缓存上一次结果
const prevOrderBookRef = useRef<OrderBookView | null>(null);

const orderBook = useMemo(() => {
  const newBook = getOrderBook(selectedGoodsId);
  
  // 浅比较，避免不必要的重渲染
  if (shallowEqual(newBook, prevOrderBookRef.current)) {
    return prevOrderBookRef.current;
  }
  
  prevOrderBookRef.current = newBook;
  return newBook;
}, [selectedGoodsId, world?.orders.activeCount]);
```

#### 3.2 图表数据使用节流更新

```tsx
// PriceChart 只在数据实际变化时更新
const throttledData = useThrottledValue(
  () => priceHistoryData,
  500 // 最多每500ms更新一次
);
```

### 阶段4: 虚拟化长列表

#### 4.1 商品列表虚拟化

```tsx
// 使用 VirtualList 组件替代直接 map
<VirtualList
  items={goods}
  itemHeight={32}
  containerHeight={400}
  renderItem={(g) => <GoodsItem goods={g} selected={selectedGoodsId === g.id} />}
/>
```

#### 4.2 订单列表虚拟化

如果订单数量很多，也应使用虚拟化。

---

## 实施优先级

| 优先级 | 任务 | 预期效果 | 复杂度 |
|--------|------|----------|--------|
| P0 | 将昂贵计算移入 useMemo | 减少80%的重复计算 | 低 |
| P0 | 价格历史数据使用 useMemo | 消除200k次循环 | 低 |
| P1 | 拆分子组件并使用 React.memo | 减少不必要的渲染 | 中 |
| P1 | 使用精细化的 selector | 减少 store 更新触发 | 中 |
| P2 | 图表数据节流更新 | 减少图表重绘频率 | 低 |
| P2 | 商品列表虚拟化 | 减少 DOM 节点数 | 低 |

---

## 技术实现细节

### 需要修改的文件

1. **`src/ui/pages/Market.tsx`** - 主要优化目标
   - 添加 useMemo 包装昂贵计算
   - 拆分为子组件
   - 使用节流选择器

2. **`src/stores/selectors.ts`** - 添加新的优化选择器
   - useMarketRanking
   - useOrderBook
   - useRecentTrades
   - useThrottledPrice

3. **`src/ui/components/Charts/PriceChart.tsx`** - 优化图表更新
   - 减少 option 重建频率
   - 使用 shouldComponentUpdate 或 React.memo

4. **新建子组件文件**
   - `src/ui/components/Market/OrderBookPanel.tsx`
   - `src/ui/components/Market/RecentTradesPanel.tsx`
   - `src/ui/components/Market/MarketRankingPanel.tsx`

---

## 预期效果

- **FPS**: 从当前的 15-30fps 提升到稳定 60fps
- **Tick Time**: 减少 UI 渲染对游戏循环的影响
- **用户体验**: 界面流畅，无卡顿感

---

## 验证方法

1. 使用 React DevTools Profiler 测量渲染时间
2. 使用 Chrome Performance 面板分析帧率
3. 观察游戏内置的性能监控面板（PerformanceDashboard）