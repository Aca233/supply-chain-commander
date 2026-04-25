import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockState = {
  getWorld: () => null,
  playerCash: 999,
  playerAssets: 111,
  playerBuildings: 2,
  tick: 48,
  financialHistory: [],
  playerFinancialSnapshot: {
    cash: 5_000,
    inventoryValue: 200,
    buildingValue: 800,
    operatingAssets: 1_000,
    totalAssets: 6_000,
    liabilities: 900,
    netWorth: 5_100,
    dailyRevenue: 900,
    dailyCost: 1_300,
    dailyProfit: -400,
    cumulativeRevenue: 4_000,
    cumulativeCost: 4_500,
    cumulativeProfit: -500,
  },
  getPlayerLoans: () => [{ remainingPrincipal: 50_000 }],
  getPlayerCreditProfile: () => ({ rating: 'A', score: 720 }),
  getPlayerPortfolio: () => ({ totalValue: 0, totalCost: 0, totalGain: 0, gainPercent: 0, holdingCount: 0 }),
  getPlayerHoldings: () => [],
  getPlayerControlledProfiles: () => [],
  getPlayerBuildings: () => [],
  getInventoryQuality: () => ({ name: '标准', priceMultiplier: 1, color: '#fff' }),
  lastTickResult: null,
};

vi.mock('@/stores/gameStore', () => ({
  useGameStore: (selector?: (state: typeof mockState) => unknown) => (
    selector ? selector(mockState) : mockState
  ),
}));

vi.mock('@/core/market/OrderBook', () => ({
  getActiveOrderIndices: () => new Set(),
}));

import { useDashboardData } from '../useDashboardData';

function Harness() {
  const data = useDashboardData();
  return React.createElement('pre', null, JSON.stringify(data.kpi));
}

describe('useDashboardData', () => {
  it('uses the shared snapshot for net worth and daily profit', () => {
    const html = renderToStaticMarkup(React.createElement(Harness));
    const kpi = JSON.parse(
      html
        .replace('<pre>', '')
        .replace('</pre>', '')
        .replace(/&quot;/g, '"'),
    );

    expect(kpi.netWorth).toBe(5_100);
    expect(kpi.dailyProfit).toBe(-400);
  });
});
