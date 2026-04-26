import { describe, expect, it } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import { GoodsId } from '@/data/goods';

import { generatePricingDecisions } from '../AIDecisionEngine';

describe('AIDecisionEngine pricing day model', () => {
  it('does not trigger a clearance sale when inventory covers only 20 current-model days', () => {
    const world = createGameWorld();
    const companyId = 1;
    const goodsId = GoodsId.FOOD;

    world.companies.count = 2;
    world.companies.cash[companyId] = 100_000;
    world.companies.inventories[companyId * GOODS_COUNT + goodsId] = 10;

    world.goods.supplies[goodsId] = 0.5;
    world.goods.demands[goodsId] = 0.5;
    world.goods.prices[goodsId] = 120;

    const assessment = {
      cash: world.companies.cash[companyId],
      cashRatio: 1,
      inventoryValue: 0,
      buildingCount: 0,
      profitMargin: 0,
      marketShare: 0,
      productionCapacity: 0,
      bottlenecks: [],
      opportunities: [],
    } as Parameters<typeof generatePricingDecisions>[2];

    const decisions = generatePricingDecisions(world, companyId, assessment);

    expect(decisions).toHaveLength(0);
  });
});
