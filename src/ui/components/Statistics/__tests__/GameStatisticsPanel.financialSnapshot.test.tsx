import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockState = {
  tick: 120,
  playerCash: 1_000,
  playerAssets: 700,
  playerBuildings: 2,
  playerFinancialSnapshot: {
    cash: 1_000,
    inventoryValue: 300,
    buildingValue: 400,
    operatingAssets: 700,
    totalAssets: 1_700,
    liabilities: 200,
    netWorth: 1_500,
    dailyRevenue: 0,
    dailyCost: 0,
    dailyProfit: 0,
    cumulativeRevenue: 0,
    cumulativeCost: 0,
    cumulativeProfit: 0,
  },
  getWorld: () => ({
    buildings: {
      count: 2,
      owners: new Uint16Array([0, 0]),
    },
    goods: {
      count: 1,
      prices: new Float32Array([300]),
    },
    companies: {
      count: 1,
      inventories: new Float32Array([1]),
    },
    orders: {
      activeCount: 0,
    },
  }),
  getAllCompanyProfiles: () => [],
};

vi.mock('@/stores/gameStore', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('@/data/goods', () => ({
  GOODS_BY_ID: new Map([[0, { id: 0, name: '钢铁' }]]),
}));

vi.mock('@/data/buildings', () => ({
  BUILDINGS_BY_ID: new Map([[0, { id: 0, name: '炼钢厂' }]]),
}));

vi.mock('@/ui/design-system', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('section', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('header', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  ProgressBar: () => React.createElement('div', null, 'ProgressBar'),
}));

import GameStatisticsPanel from '../GameStatisticsPanel';

describe('GameStatisticsPanel', () => {
  it('shows net worth and assets from the shared snapshot without double-counting inventory', () => {
    const html = renderToStaticMarkup(React.createElement(GameStatisticsPanel));

    expect(html).toContain('¥1.5K');
    expect(html).toContain('¥700');
    expect(html).not.toContain('¥2.0K');
  });
});
