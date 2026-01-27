/**
 * 撮合引擎
 * 处理买卖订单的匹配和成交
 *
 * 性能优化版：
 * - 使用OrderBookIndex维护有序订单列表
 * - 使用预分配数组避免GC压力
 * - 批量处理成交记录
 * - 使用TradeHistory记录交易历史
 */

import { GameWorld } from '../world/GameWorld';
import { GOODS_COUNT, MAX_ORDERS, ACTUAL_GOODS_COUNT } from '../constants';
import { Trade, getOrderBookView } from './OrderBook';
import { getOrderBookIndex } from './OrderBookIndex';
import { updatePriceCache } from './PriceCache';
import { perfMonitor } from '../performance/PerformanceMonitor';
import { tradeHistory, TradeRecord } from '../performance/DataStructures';

/**
 * 撮合结果
 */
export interface MatchingResult {
  trades: Trade[];
  matchedVolume: number;
  matchedValue: number;
  processedOrders: number;
}

// 预分配的临时数组，避免每次撮合都创建新数组
const TEMP_BUY_INDICES = new Uint32Array(MAX_ORDERS);
const TEMP_SELL_INDICES = new Uint32Array(MAX_ORDERS);
let tempBuyCount = 0;
let tempSellCount = 0;

// 预分配的成交记录缓冲区
const MAX_TRADES_PER_TICK = 5000;
const tradeBuffer: Trade[] = new Array(MAX_TRADES_PER_TICK);
let tradeBufferCount = 0;

// 初始化成交缓冲区
for (let i = 0; i < MAX_TRADES_PER_TICK; i++) {
  tradeBuffer[i] = {
    id: 0,
    buyOrderId: 0,
    sellOrderId: 0,
    buyCompanyId: 0,
    sellCompanyId: 0,
    goodsId: 0,
    quantity: 0,
    price: 0,
    value: 0,
    tick: 0,
  };
}

/**
 * 处理单个商品的订单撮合（优化版）
 * 使用预分配数组和OrderBookIndex
 */
function matchOrdersForGoodsOptimized(
  world: GameWorld,
  goodsId: number,
  tradesOut: Trade[],
  tradesStartIdx: number
): number {
  const o = world.orders;
  const c = world.companies;
  const t = world.trades;
  const orderIndex = getOrderBookIndex();
  
  // 从索引获取已排序的订单列表
  const buyIndices = orderIndex.getAllBuyOrders(goodsId);
  const sellIndices = orderIndex.getAllSellOrders(goodsId);
  
  if (buyIndices.length === 0 || sellIndices.length === 0) {
    return 0;
  }
  
  let tradesCount = 0;
  let buyPtr = 0;
  let sellPtr = 0;
  
  while (buyPtr < buyIndices.length && sellPtr < sellIndices.length) {
    const buyIdx = buyIndices[buyPtr];
    const sellIdx = sellIndices[sellPtr];
    
    // 跳过已完成的订单
    if (o.remainings[buyIdx] <= 0) {
      buyPtr++;
      continue;
    }
    if (o.remainings[sellIdx] <= 0) {
      sellPtr++;
      continue;
    }
    
    const buyPrice = o.prices[buyIdx];
    const sellPrice = o.prices[sellIdx];
    const buyCompanyId = o.companyIds[buyIdx];
    const sellCompanyId = o.companyIds[sellIdx];
    
    // 自成交防护
    if (buyCompanyId === sellCompanyId) {
      if (buyPtr < buyIndices.length - 1) {
        buyPtr++;
      } else {
        sellPtr++;
      }
      continue;
    }
    
    // 价格不匹配则停止
    if (buyPrice < sellPrice) {
      break;
    }
    
    // 计算成交
    const buyRemaining = o.remainings[buyIdx];
    const sellRemaining = o.remainings[sellIdx];
    const matchQty = Math.min(buyRemaining, sellRemaining);
    const matchPrice = sellPrice;
    const totalValue = matchQty * matchPrice;
    
    // 执行成交
    const buyInvIdx = buyCompanyId * GOODS_COUNT + goodsId;
    c.inventories[buyInvIdx] += matchQty;
    c.cash[sellCompanyId] += totalValue;
    
    const sellInvIdx = sellCompanyId * GOODS_COUNT + goodsId;
    c.inventoryReserved[sellInvIdx] -= matchQty;
    c.inventories[sellInvIdx] -= matchQty;
    
    const priceDiff = buyPrice - matchPrice;
    if (priceDiff > 0) {
      c.cash[buyCompanyId] += matchQty * priceDiff;
    }
    
    // 更新订单剩余量
    o.remainings[buyIdx] -= matchQty;
    o.remainings[sellIdx] -= matchQty;
    
    // 记录成交到世界交易历史
    const tradeId = t.nextTradeId++;
    const tradeIdx = t.count % t.maxTrades;
    
    t.buyOrderIds[tradeIdx] = buyIdx;
    t.sellOrderIds[tradeIdx] = sellIdx;
    t.buyCompanyIds[tradeIdx] = buyCompanyId;
    t.sellCompanyIds[tradeIdx] = sellCompanyId;
    t.goodsIds[tradeIdx] = goodsId;
    t.quantities[tradeIdx] = matchQty;
    t.prices[tradeIdx] = matchPrice;
    t.ticks[tradeIdx] = world.tick;
    t.count++;
    
    // 更新累计销售统计
    const sellStatsIdx = sellCompanyId * GOODS_COUNT + goodsId;
    t.cumulativeSalesQuantity[sellStatsIdx] += matchQty;
    t.cumulativeSalesRevenue[sellStatsIdx] += totalValue;
    
    // 复用预分配的Trade对象
    const outIdx = tradesStartIdx + tradesCount;
    if (outIdx < tradesOut.length) {
      const trade = tradesOut[outIdx];
      trade.id = tradeId;
      trade.buyOrderId = buyIdx;
      trade.sellOrderId = sellIdx;
      trade.buyCompanyId = buyCompanyId;
      trade.sellCompanyId = sellCompanyId;
      trade.goodsId = goodsId;
      trade.quantity = matchQty;
      trade.price = matchPrice;
      trade.value = totalValue;
      trade.tick = world.tick;
    }
    tradesCount++;
    
    // 标记已完成的订单
    if (o.remainings[buyIdx] <= 0) {
      o.isActive[buyIdx] = 0;
      o.activeCount--;
      orderIndex.removeOrder(buyIdx);
      buyPtr++;
    }
    if (o.remainings[sellIdx] <= 0) {
      o.isActive[sellIdx] = 0;
      o.activeCount--;
      orderIndex.removeOrder(sellIdx);
      sellPtr++;
    }
  }
  
  return tradesCount;
}

/**
 * 处理单个商品的订单撮合（兼容旧版，使用遍历方式）
 */
function matchOrdersForGoods(
  world: GameWorld,
  goodsId: number
): Trade[] {
  const o = world.orders;
  const c = world.companies;
  const t = world.trades;
  const trades: Trade[] = [];
  
  // 使用预分配数组收集订单
  tempBuyCount = 0;
  tempSellCount = 0;
  
  for (let i = 0; i < MAX_ORDERS; i++) {
    if (!o.isActive[i] || o.goodsIds[i] !== goodsId) continue;
    
    if (o.types[i] === 0) {
      TEMP_BUY_INDICES[tempBuyCount++] = i;
    } else {
      TEMP_SELL_INDICES[tempSellCount++] = i;
    }
  }
  
  if (tempBuyCount === 0 || tempSellCount === 0) {
    return trades;
  }
  
  // 就地排序
  sortIndicesByPriceDesc(TEMP_BUY_INDICES, tempBuyCount, o.prices);
  sortIndicesByPriceAsc(TEMP_SELL_INDICES, tempSellCount, o.prices);
  
  let buyPtr = 0;
  let sellPtr = 0;
  
  while (buyPtr < tempBuyCount && sellPtr < tempSellCount) {
    const buyIdx = TEMP_BUY_INDICES[buyPtr];
    const sellIdx = TEMP_SELL_INDICES[sellPtr];
    
    if (o.remainings[buyIdx] <= 0) {
      buyPtr++;
      continue;
    }
    if (o.remainings[sellIdx] <= 0) {
      sellPtr++;
      continue;
    }
    
    const buyPrice = o.prices[buyIdx];
    const sellPrice = o.prices[sellIdx];
    const buyCompanyId = o.companyIds[buyIdx];
    const sellCompanyId = o.companyIds[sellIdx];
    
    // 自成交防护
    if (buyCompanyId === sellCompanyId) {
      if (buyPtr < tempBuyCount - 1) {
        buyPtr++;
      } else {
        sellPtr++;
      }
      continue;
    }
    
    if (buyPrice < sellPrice) {
      break;
    }
    
    const buyRemaining = o.remainings[buyIdx];
    const sellRemaining = o.remainings[sellIdx];
    const matchQty = Math.min(buyRemaining, sellRemaining);
    const matchPrice = sellPrice;
    const totalValue = matchQty * matchPrice;
    
    const buyInvIdx = buyCompanyId * GOODS_COUNT + goodsId;
    c.inventories[buyInvIdx] += matchQty;
    c.cash[sellCompanyId] += totalValue;
    
    const sellInvIdx = sellCompanyId * GOODS_COUNT + goodsId;
    c.inventoryReserved[sellInvIdx] -= matchQty;
    c.inventories[sellInvIdx] -= matchQty;
    
    const priceDiff = buyPrice - matchPrice;
    if (priceDiff > 0) {
      c.cash[buyCompanyId] += matchQty * priceDiff;
    }
    
    o.remainings[buyIdx] -= matchQty;
    o.remainings[sellIdx] -= matchQty;
    
    const tradeId = t.nextTradeId++;
    const tradeIdx = t.count % t.maxTrades;
    
    t.buyOrderIds[tradeIdx] = buyIdx;
    t.sellOrderIds[tradeIdx] = sellIdx;
    t.buyCompanyIds[tradeIdx] = buyCompanyId;
    t.sellCompanyIds[tradeIdx] = sellCompanyId;
    t.goodsIds[tradeIdx] = goodsId;
    t.quantities[tradeIdx] = matchQty;
    t.prices[tradeIdx] = matchPrice;
    t.ticks[tradeIdx] = world.tick;
    t.count++;
    
    const sellStatsIdx = sellCompanyId * GOODS_COUNT + goodsId;
    t.cumulativeSalesQuantity[sellStatsIdx] += matchQty;
    t.cumulativeSalesRevenue[sellStatsIdx] += totalValue;
    
    trades.push({
      id: tradeId,
      buyOrderId: buyIdx,
      sellOrderId: sellIdx,
      buyCompanyId,
      sellCompanyId,
      goodsId,
      quantity: matchQty,
      price: matchPrice,
      value: totalValue,
      tick: world.tick,
    });
    
    if (o.remainings[buyIdx] <= 0) {
      o.isActive[buyIdx] = 0;
      o.activeCount--;
      buyPtr++;
    }
    if (o.remainings[sellIdx] <= 0) {
      o.isActive[sellIdx] = 0;
      o.activeCount--;
      sellPtr++;
    }
  }
  
  return trades;
}

/**
 * 快速排序 - 按价格降序
 */
function sortIndicesByPriceDesc(arr: Uint32Array, count: number, prices: Float32Array): void {
  if (count <= 1) return;
  quickSortDesc(arr, 0, count - 1, prices);
}

/**
 * 快速排序 - 按价格升序
 */
function sortIndicesByPriceAsc(arr: Uint32Array, count: number, prices: Float32Array): void {
  if (count <= 1) return;
  quickSortAsc(arr, 0, count - 1, prices);
}

function quickSortDesc(arr: Uint32Array, low: number, high: number, prices: Float32Array): void {
  if (low < high) {
    const pivot = partitionDesc(arr, low, high, prices);
    quickSortDesc(arr, low, pivot - 1, prices);
    quickSortDesc(arr, pivot + 1, high, prices);
  }
}

function quickSortAsc(arr: Uint32Array, low: number, high: number, prices: Float32Array): void {
  if (low < high) {
    const pivot = partitionAsc(arr, low, high, prices);
    quickSortAsc(arr, low, pivot - 1, prices);
    quickSortAsc(arr, pivot + 1, high, prices);
  }
}

function partitionDesc(arr: Uint32Array, low: number, high: number, prices: Float32Array): number {
  const pivotPrice = prices[arr[high]];
  let i = low - 1;
  
  for (let j = low; j < high; j++) {
    if (prices[arr[j]] > pivotPrice) {
      i++;
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }
  
  const temp = arr[i + 1];
  arr[i + 1] = arr[high];
  arr[high] = temp;
  
  return i + 1;
}

function partitionAsc(arr: Uint32Array, low: number, high: number, prices: Float32Array): number {
  const pivotPrice = prices[arr[high]];
  let i = low - 1;
  
  for (let j = low; j < high; j++) {
    if (prices[arr[j]] < pivotPrice) {
      i++;
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }
  
  const temp = arr[i + 1];
  arr[i + 1] = arr[high];
  arr[high] = temp;
  
  return i + 1;
}

/**
 * 处理所有商品的订单撮合（优化版）
 */
export function matchAllOrders(world: GameWorld): MatchingResult {
  const endMeasure = perfMonitor.startMeasure('matching');
  
  const g = world.goods;
  let matchedVolume = 0;
  let matchedValue = 0;
  let processedOrders = 0;
  let totalTradesCount = 0;
  
  // 重置成交缓冲区
  tradeBufferCount = 0;
  
  // 按商品顺序处理
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const tradesCount = matchOrdersForGoodsOptimized(
      world,
      goodsId,
      tradeBuffer,
      totalTradesCount
    );
    
    // 累计统计
    for (let i = 0; i < tradesCount; i++) {
      const trade = tradeBuffer[totalTradesCount + i];
      matchedVolume += trade.quantity;
      matchedValue += trade.value;
      processedOrders += 2;
    }
    
    totalTradesCount += tradesCount;
  }
  
  // 收集实际的成交记录并更新交易历史
  const trades: Trade[] = [];
  const tradeRecords: TradeRecord[] = [];
  
  for (let i = 0; i < totalTradesCount; i++) {
    const trade = tradeBuffer[i];
    // 创建副本，因为缓冲区会被复用
    trades.push({ ...trade });
    
    // 添加到交易历史
    tradeRecords.push({
      tick: trade.tick,
      goodsId: trade.goodsId,
      buyCompanyId: trade.buyCompanyId,
      sellCompanyId: trade.sellCompanyId,
      quantity: trade.quantity,
      price: trade.price,
      value: trade.value,
    });
  }
  
  // 批量记录到交易历史
  if (tradeRecords.length > 0) {
    tradeHistory.recordBatch(tradeRecords);
  }
  
  // 更新价格缓存
  updatePriceCache(world);
  
  endMeasure();
  
  return {
    trades,
    matchedVolume,
    matchedValue,
    processedOrders,
  };
}

/**
 * 处理所有商品的订单撮合（兼容旧版）
 */
export function matchAllOrdersLegacy(world: GameWorld): MatchingResult {
  const g = world.goods;
  const allTrades: Trade[] = [];
  let matchedVolume = 0;
  let matchedValue = 0;
  let processedOrders = 0;
  
  for (let goodsId = 0; goodsId < g.count; goodsId++) {
    const trades = matchOrdersForGoods(world, goodsId);
    
    for (const trade of trades) {
      allTrades.push(trade);
      matchedVolume += trade.quantity;
      matchedValue += trade.value;
      processedOrders += 2;
    }
  }
  
  return {
    trades: allTrades,
    matchedVolume,
    matchedValue,
    processedOrders,
  };
}

/**
 * 获取某商品的最近成交记录
 */
export function getRecentTrades(
  world: GameWorld,
  goodsId: number,
  limit: number = 50
): Trade[] {
  const t = world.trades;
  const trades: Trade[] = [];
  
  // 从最新的成交往回找
  const startIdx = Math.max(0, t.count - limit);
  
  for (let i = t.count - 1; i >= startIdx && trades.length < limit; i--) {
    const idx = i % t.maxTrades;
    if (t.goodsIds[idx] === goodsId) {
      trades.push({
        id: i,
        buyOrderId: t.buyOrderIds[idx],
        sellOrderId: t.sellOrderIds[idx],
        buyCompanyId: t.buyCompanyIds[idx],
        sellCompanyId: t.sellCompanyIds[idx],
        goodsId: t.goodsIds[idx],
        quantity: t.quantities[idx],
        price: t.prices[idx],
        value: t.quantities[idx] * t.prices[idx],
        tick: t.ticks[idx],
      });
    }
  }
  
  return trades;
}

/**
 * 获取某商品的成交量加权平均价格（VWAP）
 */
export function getVWAP(
  world: GameWorld,
  goodsId: number,
  ticks: number = 24
): number | null {
  const t = world.trades;
  let totalValue = 0;
  let totalVolume = 0;
  
  const startTick = world.tick - ticks;
  
  for (let i = t.count - 1; i >= 0; i--) {
    const idx = i % t.maxTrades;
    if (t.ticks[idx] < startTick) break;
    
    if (t.goodsIds[idx] === goodsId) {
      totalValue += t.quantities[idx] * t.prices[idx];
      totalVolume += t.quantities[idx];
    }
  }
  
  return totalVolume > 0 ? totalValue / totalVolume : null;
}

/**
 * 获取某商品的24小时成交量
 */
export function get24hVolume(world: GameWorld, goodsId: number): number {
  const t = world.trades;
  let volume = 0;
  const startTick = world.tick - 24;
  
  for (let i = t.count - 1; i >= 0; i--) {
    const idx = i % t.maxTrades;
    if (t.ticks[idx] < startTick) break;
    
    if (t.goodsIds[idx] === goodsId) {
      volume += t.quantities[idx];
    }
  }
  
  return volume;
}

/**
 * 获取某商品的24小时最高/最低价
 */
export function get24hHighLow(
  world: GameWorld,
  goodsId: number
): { high: number; low: number } | null {
  const t = world.trades;
  let high = -Infinity;
  let low = Infinity;
  let found = false;
  const startTick = world.tick - 24;
  
  for (let i = t.count - 1; i >= 0; i--) {
    const idx = i % t.maxTrades;
    if (t.ticks[idx] < startTick) break;
    
    if (t.goodsIds[idx] === goodsId) {
      found = true;
      const price = t.prices[idx];
      if (price > high) high = price;
      if (price < low) low = price;
    }
  }
  
  return found ? { high, low } : null;
}

/**
 * 市场统计数据
 */
export interface MarketStats {
  goodsId: number;
  lastPrice: number | null;
  vwap: number | null;
  volume24h: number;
  high24h: number | null;
  low24h: number | null;
  priceChange24h: number | null;
  tradeCount24h: number;
}

/**
 * 获取某商品的市场统计
 */
export function getMarketStats(world: GameWorld, goodsId: number): MarketStats {
  const trades = getRecentTrades(world, goodsId, 100);
  const lastPrice = trades.length > 0 ? trades[0].price : null;
  const vwap = getVWAP(world, goodsId);
  const volume24h = get24hVolume(world, goodsId);
  const highLow = get24hHighLow(world, goodsId);
  
  // 计算24小时价格变化
  let priceChange24h: number | null = null;
  if (trades.length > 0) {
    const startTick = world.tick - 24;
    const oldTrade = trades.find(t => t.tick <= startTick);
    if (oldTrade && lastPrice) {
      priceChange24h = (lastPrice - oldTrade.price) / oldTrade.price;
    }
  }
  
  // 24小时成交笔数
  const tradeCount24h = trades.filter(t => t.tick >= world.tick - 24).length;
  
  return {
    goodsId,
    lastPrice,
    vwap,
    volume24h,
    high24h: highLow?.high ?? null,
    low24h: highLow?.low ?? null,
    priceChange24h,
    tradeCount24h,
  };
}