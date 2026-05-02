import { describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';

import { evaluateCompanyValue } from '../AcquisitionSystem';
import { createGameWorld } from '../../world/GameWorld';

describe('AcquisitionSystem valuation', () => {
  it('includes net debt in enterprise value instead of assuming zero debt', () => {
    const world = createGameWorld();
    world.goods.count = GoodsId.STEEL + 1;
    world.companies.cash[0] = 100_000;
    world.companies.totalLiabilities[0] = 160_000;
    world.companies.inventories[GoodsId.STEEL] = 10;
    world.goods.prices[GoodsId.STEEL] = 500;

    const valuation = evaluateCompanyValue(world, 0);

    expect(valuation.bookValue).toBe(105_000);
    expect(valuation.marketValue).toBe(157_500);
    expect(valuation.enterpriseValue).toBe(217_500);
  });
});
