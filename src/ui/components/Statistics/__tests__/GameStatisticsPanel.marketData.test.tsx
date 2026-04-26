import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockState = {
  tick: 12,
  playerBuildings: 1,
  playerFinancialSnapshot: {
    cash: 1_000,
    inventoryValue: 0,
    buildingValue: 500,
    operatingAssets: 500,
    totalAssets: 1_500,
    liabilities: 100,
    netWorth: 1_400,
    dailyRevenue: 0,
    dailyCost: 0,
    dailyProfit: 0,
    cumulativeRevenue: 0,
    cumulativeCost: 0,
    cumulativeProfit: 0,
  },
  getWorld: () => ({
    buildings: {
      count: 1,
      owners: new Uint16Array([0]),
    },
    companies: {
      count: 2,
      inventories: new Float32Array([0]),
    },
    goods: {
      count: 1,
      prices: new Float32Array([10]),
    },
    orders: {
      activeCount: 0,
    },
    trades: {
      count: 2,
      maxTrades: 8,
      quantities: new Float32Array([120, 230]),
    },
  }),
  getAllCompanyProfiles: () => [{ id: 1, name: 'AI 1' }],
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

describe('GameStatisticsPanel market data', () => {
  it('shows actual trade volume from world data instead of a random estimate', () => {
    const html = renderToStaticMarkup(React.createElement(GameStatisticsPanel));

    expect(html).toContain('350');
    expect(html).not.toContain('22.0K');
  });
});
