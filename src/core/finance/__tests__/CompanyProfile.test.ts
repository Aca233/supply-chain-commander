import { describe, expect, it, vi } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { GameWorld } from '@/core/world/GameWorld';

const mockedBreakdown = {
  cash: 12_345,
  inventoryValue: 678,
  buildingValue: 910_000,
  operatingAssets: 910_678,
  totalAssets: 923_023,
  liabilities: 321,
  netWorth: 922_702,
};

vi.mock('../StockMarket', () => ({
  getStock: () => null,
  getHoldings: () => [],
  getMarketState: () => ({
    holdings: new Map(),
    stocks: new Map(),
    totalMarketCap: 0,
  }),
}));

vi.mock('../FinancialSnapshot', () => ({
  calculateCompanyAssetBreakdown: () => mockedBreakdown,
}));

import { getCompanyProfile } from '../CompanyProfile';

function createWorld(): GameWorld {
  const inventories = new Float32Array(GOODS_COUNT);
  inventories[0] = 2;
  inventories[1] = 1;

  return {
    goods: {
      count: 2,
      prices: new Float32Array([200, 400]),
      names: ['钢铁', '工具'],
    },
    companies: {
      count: 1,
      cash: new Float32Array([8_000]),
      totalLiabilities: new Float32Array([500]),
      inventories,
      names: ['玩家公司'],
      isAI: new Uint8Array([0]),
    },
    buildings: {
      count: 1,
      owners: new Uint16Array([0]),
    },
  } as unknown as GameWorld;
}

describe('getCompanyProfile', () => {
  it('reuses the shared asset breakdown instead of calculating separate asset values', () => {
    const profile = getCompanyProfile(createWorld(), 0);

    expect(profile?.cash).toBe(mockedBreakdown.cash);
    expect(profile?.inventoryValue).toBe(mockedBreakdown.inventoryValue);
    expect(profile?.buildingValue).toBe(mockedBreakdown.buildingValue);
    expect(profile?.totalAssets).toBe(mockedBreakdown.totalAssets);
  });
});
