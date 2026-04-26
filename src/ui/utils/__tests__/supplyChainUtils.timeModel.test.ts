import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/goods', () => {
  const goods = [
    {
      id: 1,
      key: 'ore',
      name: '矿石',
      tier: 0,
      category: 'raw',
      basePrice: 5,
      isConsumerGood: false,
      description: '原料',
    },
    {
      id: 2,
      key: 'steel',
      name: '钢材',
      tier: 1,
      category: 'material',
      basePrice: 100,
      isConsumerGood: false,
      description: '成品',
    },
  ];

  return {
    ALL_GOODS: goods,
    GOODS_BY_ID: new Map(goods.map((goodsItem) => [goodsItem.id, goodsItem])),
    GOODS_BY_INDUSTRY: {},
  };
});

vi.mock('@/data/buildings', () => {
  const building = {
    id: 10,
    name: '炼钢厂',
    buildCost: 1_000,
    maintenanceCost: 100,
    laborCost: 100,
    energyCost: 100,
    production: {
      inputs: [{ goodsId: 1, amount: 1 }],
      outputs: [{ goodsId: 2, amount: 10 }],
    },
  };

  return {
    ALL_BUILDINGS: [building],
    BUILDINGS_BY_ID: new Map([[building.id, building]]),
    getBuildingProduction: () => building.production,
  };
});

import { calculateProductionPlan } from '../supplyChainUtils';

describe('calculateProductionPlan time model', () => {
  it('sizes required buildings with the current ticks-per-day value', () => {
    const plan = calculateProductionPlan(2, 20);

    expect(plan.buildings).toHaveLength(1);
    expect(plan.buildings[0]?.count).toBe(2);
  });
});
