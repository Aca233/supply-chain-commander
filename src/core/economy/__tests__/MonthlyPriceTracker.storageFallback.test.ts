import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMonthlyPriceTracker, resetMonthlyPriceTracker } from '../MonthlyPriceTracker';
import { GoodsId } from '@/data/goods';
import { resetPriceCache } from '../../market/PriceCache';
import { recordTrade } from '../../market/TradeLedger';
import { createGameWorld } from '../../world/GameWorld';

describe('MonthlyPriceTracker storage fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetMonthlyPriceTracker();
    resetPriceCache();
  });

  it('initializes and resets without warning when localStorage is unavailable', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const tracker = getMonthlyPriceTracker();
    tracker.reset();

    expect(tracker.getAllReports()).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('reports monthly value from same-window trades instead of mixing hourly volume with 24h VWAP', () => {
    resetPriceCache();
    resetMonthlyPriceTracker();

    const world = createGameWorld();
    const goodsId = GoodsId.IRON_ORE;
    world.goods.prices[goodsId] = 12;
    world.goods.baseValues[goodsId] = 10;

    const tracker = getMonthlyPriceTracker();
    tracker.update(world);

    world.tick = 1;
    recordTrade(world, {
      buyOrderId: 1,
      sellOrderId: 2,
      buyCompanyId: 1,
      sellCompanyId: 2,
      goodsId,
      quantity: 100,
      price: 10,
      tick: world.tick,
    });
    tracker.update(world);

    world.tick = 26;
    world.goods.prices[goodsId] = 20;
    recordTrade(world, {
      buyOrderId: 3,
      sellOrderId: 4,
      buyCompanyId: 1,
      sellCompanyId: 2,
      goodsId,
      quantity: 10,
      price: 20,
      tick: world.tick,
    });
    tracker.update(world);

    const report = tracker.getCurrentMonthData(world);
    const stat = report?.goods.find(goods => goods.goodsId === goodsId);

    expect(stat?.totalVolume).toBeCloseTo(110);
    expect(stat?.totalValue).toBeCloseTo(1200);
    expect(stat?.avgPrice).toBeCloseTo(1200 / 110);
    expect(stat?.avgPrice).toBeGreaterThanOrEqual(stat?.lowPrice ?? 0);
    expect(stat?.avgPrice).toBeLessThanOrEqual(stat?.highPrice ?? Number.POSITIVE_INFINITY);
    expect(stat?.tradeCount).toBe(2);
  });

  it('keeps supply-demand ratio non-zero when actual trades occurred', () => {
    resetPriceCache();
    resetMonthlyPriceTracker();

    const world = createGameWorld();
    const goodsId = GoodsId.IRON_ORE;
    world.goods.prices[goodsId] = 10;
    world.goods.baseValues[goodsId] = 10;
    world.goods.supplies[goodsId] = 0;
    world.goods.demands[goodsId] = 0;

    const tracker = getMonthlyPriceTracker();
    tracker.update(world);

    world.tick = 1;
    recordTrade(world, {
      buyOrderId: 1,
      sellOrderId: 2,
      buyCompanyId: 1,
      sellCompanyId: 2,
      goodsId,
      quantity: 25,
      price: 10,
      tick: world.tick,
    });
    tracker.update(world);

    const report = tracker.getCurrentMonthData(world);
    const stat = report?.goods.find(goods => goods.goodsId === goodsId);

    expect(stat?.totalVolume).toBeCloseTo(25);
    expect(stat?.avgSupplyDemandRatio).toBeGreaterThan(0);
  });
});
