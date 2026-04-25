import { GOODS_COUNT } from '../constants';
import { GameWorld } from '../world/GameWorld';

export const TradeOrderRef = {
  CONSUMER_DIRECT: -1,
  RETAIL_DIRECT: -2,
  WHOLESALE_DIRECT: -3,
} as const;

export const TradePartyRef = {
  CONSUMER_MARKET: -1,
} as const;

export interface TradeWrite {
  buyOrderId: number;
  sellOrderId: number;
  buyCompanyId: number;
  sellCompanyId: number;
  goodsId: number;
  quantity: number;
  price: number;
  tick: number;
}

export type TradeIterationCallback = (tradeIdx: number, logicalIndex: number) => boolean | void;

export function getRetainedTradeCount(world: GameWorld): number {
  return Math.min(world.trades.count, world.trades.maxTrades);
}

export function forEachRetainedTradeNewestFirst(
  world: GameWorld,
  callback: TradeIterationCallback,
): void {
  const retainedCount = getRetainedTradeCount(world);
  const startLogicalIndex = world.trades.count - retainedCount;

  for (let logicalIndex = world.trades.count - 1; logicalIndex >= startLogicalIndex; logicalIndex--) {
    const tradeIdx = logicalIndex % world.trades.maxTrades;
    if (callback(tradeIdx, logicalIndex) === false) {
      break;
    }
  }
}

export function forEachRetainedTradeOldestFirst(
  world: GameWorld,
  callback: TradeIterationCallback,
): void {
  const retainedCount = getRetainedTradeCount(world);
  const startLogicalIndex = world.trades.count - retainedCount;

  for (let logicalIndex = startLogicalIndex; logicalIndex < world.trades.count; logicalIndex++) {
    const tradeIdx = logicalIndex % world.trades.maxTrades;
    if (callback(tradeIdx, logicalIndex) === false) {
      break;
    }
  }
}

export function recordTrade(world: GameWorld, trade: TradeWrite): number {
  const t = world.trades;
  const tradeId = t.nextTradeId++;
  const tradeIdx = t.count % t.maxTrades;

  t.buyOrderIds[tradeIdx] = trade.buyOrderId;
  t.sellOrderIds[tradeIdx] = trade.sellOrderId;
  t.buyCompanyIds[tradeIdx] = trade.buyCompanyId;
  t.sellCompanyIds[tradeIdx] = trade.sellCompanyId;
  t.goodsIds[tradeIdx] = trade.goodsId;
  t.quantities[tradeIdx] = trade.quantity;
  t.prices[tradeIdx] = trade.price;
  t.ticks[tradeIdx] = trade.tick;
  t.count++;

  if (trade.sellCompanyId >= 0) {
    const sellStatsIdx = trade.sellCompanyId * GOODS_COUNT + trade.goodsId;
    t.cumulativeSalesQuantity[sellStatsIdx] += trade.quantity;
    t.cumulativeSalesRevenue[sellStatsIdx] += trade.quantity * trade.price;
  }

  return tradeId;
}
