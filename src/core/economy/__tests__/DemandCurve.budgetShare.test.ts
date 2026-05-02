import { describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';

import { calculateMarketDemand } from '../DemandCurve';
import { initializeWorld } from '../../world/WorldInitializer';

describe('DemandCurve budget share', () => {
  it('derives budget share from consumer tier budgets instead of a fixed fallback', () => {
    const world = initializeWorld();

    const foodDemand = calculateMarketDemand(world, GoodsId.FOOD);
    const steelDemand = calculateMarketDemand(world, GoodsId.STEEL);

    expect(foodDemand.budgetShare).toBeGreaterThan(0.5);
    expect(steelDemand.budgetShare).toBeLessThan(foodDemand.budgetShare);
  });
});
