import { describe, expect, it } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { GameWorld } from '@/core/world/GameWorld';

import {
  calculateCompanyAssetBreakdown,
  calculatePlayerFinancialSnapshot,
  createEmptyPlayerFinancialSnapshot,
} from '../FinancialSnapshot';

function createWorld(): GameWorld {
  const inventories = new Float32Array(GOODS_COUNT);
  inventories[0] = 4;
  inventories[1] = 2;

  return {
    tick: 28,
    goods: {
      count: 2,
      prices: new Float32Array([100, 250]),
    },
    companies: {
      count: 1,
      cash: new Float32Array([5_000]),
      totalLiabilities: new Float32Array([800]),
      inventories,
    },
    buildings: {
      count: 2,
      owners: new Uint16Array([0, 0]),
    },
  } as unknown as GameWorld;
}

describe('FinancialSnapshot', () => {
  it('builds a single asset breakdown shared by player UI and company profile', () => {
    const breakdown = calculateCompanyAssetBreakdown(createWorld(), 0);

    expect(breakdown).toEqual({
      cash: 5_000,
      inventoryValue: 900,
      buildingValue: 1_000_000,
      operatingAssets: 1_000_900,
      totalAssets: 1_005_900,
      liabilities: 800,
      netWorth: 1_005_100,
    });
  });

  it('derives daily and cumulative financial values from financial history instead of raw trades', () => {
    const snapshot = calculatePlayerFinancialSnapshot({
      world: createWorld(),
      currentTick: 28,
      financialHistory: [
        { tick: 8, revenue: 100, cost: 80, profit: 20, cash: 4_920 },
        { tick: 16, revenue: 300, cost: 150, profit: 150, cash: 5_070 },
        { tick: 28, revenue: 90, cost: 140, profit: -50, cash: 5_020 },
      ],
    });

    expect(snapshot.dailyRevenue).toBe(490);
    expect(snapshot.dailyCost).toBe(370);
    expect(snapshot.dailyProfit).toBe(120);
    expect(snapshot.cumulativeRevenue).toBe(490);
    expect(snapshot.cumulativeCost).toBe(370);
    expect(snapshot.cumulativeProfit).toBe(120);
    expect(snapshot.totalAssets).toBe(1_005_900);
    expect(snapshot.netWorth).toBe(1_005_100);
  });

  it('returns an all-zero snapshot when world data is unavailable', () => {
    expect(createEmptyPlayerFinancialSnapshot()).toEqual(
      calculatePlayerFinancialSnapshot({
        world: null,
        currentTick: 24,
        financialHistory: [],
      }),
    );
  });
});
