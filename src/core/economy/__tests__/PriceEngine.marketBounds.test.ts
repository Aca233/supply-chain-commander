import { describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';
import { MAX_TICK_PRICE_CHANGE, TICKS_PER_DAY } from '@/core/constants';

import { updateAllPrices } from '../PriceEngine';
import { initializeWorld } from '../../world/WorldInitializer';
import { resetPriceCache } from '../../market/PriceCache';

describe('PriceEngine market-responsive bounds', () => {
  it('raises prices from shortage pressure even when there are no trades', () => {
    resetPriceCache();

    const world = initializeWorld();
    const goodsId = GoodsId.IRON_ORE;
    const basePrice = world.goods.baseValues[goodsId];

    world.goods.prices[goodsId] = basePrice;
    world.goods.supplies[goodsId] = 1;
    world.goods.demands[goodsId] = 1000;
    world.trades.count = 0;

    updateAllPrices(world);

    expect(world.goods.prices[goodsId]).toBeGreaterThan(basePrice);
  });

  it('ignores stale trade VWAP but still responds to current shortage pressure', () => {
    resetPriceCache();

    const world = initializeWorld();
    const goodsId = GoodsId.IRON_ORE;
    const basePrice = world.goods.baseValues[goodsId];

    world.tick = TICKS_PER_DAY + 1;
    world.goods.prices[goodsId] = basePrice;
    world.goods.supplies[goodsId] = 1;
    world.goods.demands[goodsId] = 1000;
    world.trades.count = 1;
    world.trades.goodsIds[0] = goodsId;
    world.trades.quantities[0] = 10;
    world.trades.prices[0] = basePrice * 2;
    world.trades.ticks[0] = 0;

    updateAllPrices(world);

    expect(world.goods.prices[goodsId]).toBeGreaterThan(basePrice);
    expect(world.goods.prices[goodsId]).toBeLessThan(basePrice * 1.01);
  });

  it('allows severe shortages to price above the old 3x hard cap', () => {
    resetPriceCache();

    const world = initializeWorld();
    const goodsId = GoodsId.PATENT_DRUG;
    const basePrice = world.goods.baseValues[goodsId];

    world.goods.prices[goodsId] = basePrice * 3;
    world.goods.supplies[goodsId] = 1;
    world.goods.demands[goodsId] = 100;
    world.trades.count = 1;
    world.trades.goodsIds[0] = goodsId;
    world.trades.quantities[0] = 10;
    world.trades.prices[0] = basePrice * 4;
    world.trades.ticks[0] = world.tick;

    updateAllPrices(world);

    expect(world.goods.prices[goodsId]).toBeGreaterThan(basePrice * 3);
    expect(world.goods.prices[goodsId]).toBeLessThanOrEqual(basePrice * 5);
  });

  it('allows severe surpluses to price below the old 0.5x hard floor', () => {
    resetPriceCache();

    const world = initializeWorld();
    const goodsId = GoodsId.IRON_ORE;
    const basePrice = world.goods.baseValues[goodsId];

    world.goods.prices[goodsId] = basePrice * 0.5;
    world.goods.supplies[goodsId] = 1000;
    world.goods.demands[goodsId] = 1;
    world.trades.count = 1;
    world.trades.goodsIds[0] = goodsId;
    world.trades.quantities[0] = 10;
    world.trades.prices[0] = basePrice * 0.4;
    world.trades.ticks[0] = world.tick;

    updateAllPrices(world);

    expect(world.goods.prices[goodsId]).toBeLessThan(basePrice * 0.5);
    expect(world.goods.prices[goodsId]).toBeGreaterThanOrEqual(basePrice * 0.3);
  });

  it('does not let changing dynamic bounds bypass the per-tick price change limit', () => {
    resetPriceCache();

    const world = initializeWorld();
    const goodsId = GoodsId.GLASS;
    const currentPrice = 40;

    world.goods.baseValues[goodsId] = 180;
    world.goods.prices[goodsId] = currentPrice;
    world.goods.supplies[goodsId] = 100;
    world.goods.demands[goodsId] = 100;
    world.trades.count = 1;
    world.trades.goodsIds[0] = goodsId;
    world.trades.quantities[0] = 10;
    world.trades.prices[0] = currentPrice;
    world.trades.ticks[0] = world.tick;

    updateAllPrices(world);

    expect(world.goods.prices[goodsId]).toBeLessThanOrEqual(currentPrice * (1 + MAX_TICK_PRICE_CHANGE));
  });
});
