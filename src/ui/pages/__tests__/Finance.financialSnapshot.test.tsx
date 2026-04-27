import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';

const prices = new Float32Array(GOODS_COUNT);
prices[0] = 100;

const inventories = new Float32Array(GOODS_COUNT);
inventories[0] = 20;

const mockState = {
  getWorld: () => ({
    tick: 72,
    goods: {
      names: ['钢铁'],
      prices,
    },
    companies: {
      cash: new Float32Array([7_000]),
      totalAssets: new Float32Array([8_000]),
      totalLiabilities: new Float32Array([1_000]),
      inventories,
    },
    trades: {
      count: 1,
      maxTrades: 16,
      ticks: new Int32Array([72]),
      buyCompanyIds: new Uint16Array([1]),
      sellCompanyIds: new Uint16Array([0]),
      goodsIds: new Uint16Array([0]),
      quantities: new Float32Array([90]),
      prices: new Float32Array([100]),
    },
  }),
  lastTickResult: null,
  tick: 72,
  playerFinancialSnapshot: {
    cash: 10_000,
    inventoryValue: 2_000,
    buildingValue: 8_000,
    operatingAssets: 10_000,
    totalAssets: 20_000,
    liabilities: 3_000,
    netWorth: 17_000,
    dailyRevenue: 1_200,
    dailyCost: 1_500,
    dailyProfit: -300,
    cumulativeRevenue: 8_000,
    cumulativeCost: 8_700,
    cumulativeProfit: -700,
  },
  financialHistory: [],
  getPlayerLoans: () => [],
  getPlayerCreditProfile: () => null,
  getPlayerLoanOptions: () => [],
  applyLoan: () => ({ approved: false }),
  prepayPlayerLoan: () => ({ success: false }),
};

vi.mock('@/stores/gameStore', () => ({
  useGameStore: (selector?: (state: typeof mockState) => unknown) => (
    selector ? selector(mockState) : mockState
  ),
}));

vi.mock('@/ui/hooks/useMobile', () => ({
  useMobile: () => ({ isMobile: false, isTablet: false, isNarrowDesktop: false }),
}));

vi.mock('../responsivePageLayout', () => ({
  shouldUseCompactFinanceLayout: () => false,
}));

vi.mock('@/ui/components/Charts/PriceChart', () => ({
  PriceChart: () => React.createElement('div', null, 'PriceChart'),
}));

vi.mock('@/ui/components/Charts/MarketShareChart', () => ({
  MarketShareChart: () => React.createElement('div', null, 'MarketShareChart'),
}));

vi.mock('@/ui/components/Charts/FinancialReportChart', () => ({
  FinancialReportChart: () => React.createElement('div', null, 'FinancialReportChart'),
}));

vi.mock('@/ui/components/Finance', () => ({
  BankruptcyResolutionPanel: () => React.createElement('div', null, 'BankruptcyResolutionPanel'),
}));

vi.mock('@/ui/design-system', () => ({
  Button: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('section', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('header', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  DataTable: () => React.createElement('div', null, 'DataTable'),
  StatWidget: ({ title, value }: { title: string; value: string }) => React.createElement('div', null, `${title}:${value}`),
  Dialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogBody: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Slider: () => React.createElement('div', null, 'Slider'),
}));

import Finance from '../Finance';

describe('Finance', () => {
  it('renders income statement numbers from the shared financial snapshot instead of raw trades', () => {
    const html = renderToStaticMarkup(React.createElement(Finance));

    expect(html).toContain('现金余额:¥10.0K');
    expect(html).toContain('总资产:¥20.0K');
    expect(html).toContain('净资产:¥17.0K');
    expect(html).toContain('¥1.2K');
    expect(html).toContain('¥-1.5K');
    expect(html).toContain('¥-300');
    expect(html).not.toContain('¥9,000');
  });
});
