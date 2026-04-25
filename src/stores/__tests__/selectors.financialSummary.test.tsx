import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockState = {
  playerCash: 99,
  playerAssets: 88,
  playerBuildings: 3,
  playerFinancialSnapshot: {
    cash: 4_000,
    inventoryValue: 300,
    buildingValue: 600,
    operatingAssets: 900,
    totalAssets: 4_900,
    liabilities: 1_200,
    netWorth: 3_700,
    dailyRevenue: 600,
    dailyCost: 450,
    dailyProfit: 150,
    cumulativeRevenue: 2_000,
    cumulativeCost: 1_500,
    cumulativeProfit: 500,
  },
};

vi.mock('../gameStore', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

import { usePlayerFinancialSummary } from '../selectors';

function Harness() {
  const summary = usePlayerFinancialSummary();
  return React.createElement('pre', null, JSON.stringify(summary));
}

describe('usePlayerFinancialSummary', () => {
  it('returns total assets and liabilities from the shared financial snapshot', () => {
    const html = renderToStaticMarkup(React.createElement(Harness));
    const summary = JSON.parse(
      html
        .replace('<pre>', '')
        .replace('</pre>', '')
        .replace(/&quot;/g, '"'),
    );

    expect(summary).toMatchObject({
      cash: 4_000,
      assets: 900,
      totalAssets: 4_900,
      liabilities: 1_200,
      netWorth: 3_700,
    });
  });
});
