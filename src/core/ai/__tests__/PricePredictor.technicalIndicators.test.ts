import { beforeEach, describe, expect, it } from 'vitest';

import { calculateTechnicalIndicators, resetPricePredictorState } from '../PricePredictor';
import { createGameWorld } from '../../world/GameWorld';

describe('PricePredictor technical indicators', () => {
  beforeEach(() => {
    resetPricePredictorState();
  });

  it('tracks supply and demand trends across successive observations', () => {
    const world = createGameWorld();
    const goodsId = 0;

    world.tick = 1;
    world.goods.supplies[goodsId] = 120;
    world.goods.demands[goodsId] = 80;

    const baseline = calculateTechnicalIndicators(world, goodsId);
    expect(baseline.supplyTrend).toBe(0);
    expect(baseline.demandTrend).toBe(0);

    world.tick = 2;
    world.goods.supplies[goodsId] = 60;
    world.goods.demands[goodsId] = 160;

    const shifted = calculateTechnicalIndicators(world, goodsId);

    expect(shifted.supplyTrend).toBeLessThan(0);
    expect(shifted.demandTrend).toBeGreaterThan(0);
  });
});
