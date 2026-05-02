import { describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';

import { initializeWorld } from '../../world/WorldInitializer';
import {
  getDemandPressure,
  recordSatisfiedDemand,
  syncDemandPressureFromDemand,
} from '../MarketStats';

describe('MarketStats demand pressure bookkeeping', () => {
  it('reduces unmet demand pressure without mutating gross demand', () => {
    const world = initializeWorld();
    const goodsId = GoodsId.FOOD;

    world.tick = 1;
    world.goods.demands[goodsId] = 120;
    syncDemandPressureFromDemand(world);

    recordSatisfiedDemand(world, goodsId, 35);

    expect(world.goods.demands[goodsId]).toBe(120);
    expect(getDemandPressure(world, goodsId)).toBe(85);
  });

  it('seeds the current tick pressure from gross demand before the first satisfaction event', () => {
    const world = initializeWorld();
    const goodsId = GoodsId.CLOTHING;

    world.tick = 5;
    world.goods.demands[goodsId] = 90;

    recordSatisfiedDemand(world, goodsId, 20);

    expect(world.goods.demands[goodsId]).toBe(90);
    expect(getDemandPressure(world, goodsId)).toBe(70);
  });
});
