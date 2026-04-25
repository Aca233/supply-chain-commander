import { beforeEach, describe, expect, it } from 'vitest';

import { ALL_GOODS, GoodsId } from '@/data/goods';

import { createGameWorld, setInventory } from '../../world/GameWorld';
import {
  createSellOrder,
  finalizeFilledOrder,
  getActiveOrderIndices,
  getOrderBookView,
  resetOrderPool,
} from '../OrderBook';
import { get24hHighLow, get24hVolume, getVWAP } from '../MatchingEngine';
import { TradeOrderRef, TradePartyRef, recordTrade } from '../TradeLedger';

describe('trade ledger and order finalization', () => {
  beforeEach(() => {
    resetOrderPool();
  });

  it('preserves negative provenance ids in trade history', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;

    recordTrade(world, {
      buyOrderId: TradeOrderRef.CONSUMER_DIRECT,
      sellOrderId: 12,
      buyCompanyId: TradePartyRef.CONSUMER_MARKET,
      sellCompanyId: 4,
      goodsId: GoodsId.FOOD,
      quantity: 10,
      price: 20,
      tick: 0,
    });

    expect(world.trades.buyOrderIds[0]).toBe(TradeOrderRef.CONSUMER_DIRECT);
    expect(world.trades.buyCompanyIds[0]).toBe(TradePartyRef.CONSUMER_MARKET);
  });

  it('removes filled orders from active views and active-order indices', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;

    setInventory(world, 1, GoodsId.FOOD, 50);
    createSellOrder(world, 1, GoodsId.FOOD, 50, 20);

    const orderIdx = [...getActiveOrderIndices()][0];
    world.orders.remainings[orderIdx] = 0;

    finalizeFilledOrder(world, orderIdx);

    expect(getActiveOrderIndices().has(orderIdx)).toBe(false);
    expect(getOrderBookView(world, GoodsId.FOOD).sellOrders).toHaveLength(0);
  });

  it('does not double count wrapped ring-buffer trades in market stats', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.tick = 100;
    world.trades.maxTrades = 3;
    world.trades.count = 5;

    world.trades.goodsIds[0] = GoodsId.FOOD;
    world.trades.quantities[0] = 1;
    world.trades.prices[0] = 20;
    world.trades.ticks[0] = 98;

    world.trades.goodsIds[1] = GoodsId.FOOD;
    world.trades.quantities[1] = 1;
    world.trades.prices[1] = 30;
    world.trades.ticks[1] = 99;

    world.trades.goodsIds[2] = GoodsId.FOOD;
    world.trades.quantities[2] = 1;
    world.trades.prices[2] = 10;
    world.trades.ticks[2] = 97;

    expect(getVWAP(world, GoodsId.FOOD, 24)).toBe(20);
    expect(get24hVolume(world, GoodsId.FOOD)).toBe(3);
    expect(get24hHighLow(world, GoodsId.FOOD)).toEqual({ high: 30, low: 10 });
  });
});
