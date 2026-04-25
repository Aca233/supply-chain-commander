import { describe, expect, it } from 'vitest';

import {
  calculateCumulativeDelta,
  sumProfitWithinTickWindow,
} from '../FinancialHistory';

describe('FinancialHistory helpers', () => {
  it('sums profit by tick window instead of raw history entry count', () => {
    const history = [
      { tick: 4, profit: 40 },
      { tick: 8, profit: 80 },
      { tick: 12, profit: 120 },
      { tick: 16, profit: 160 },
      { tick: 20, profit: 200 },
      { tick: 24, profit: 240 },
      { tick: 28, profit: 280 },
    ];

    expect(sumProfitWithinTickWindow(history, 28, 24)).toBe(1080);
  });

  it('calculates deltas from cumulative values and handles daily resets', () => {
    expect(calculateCumulativeDelta(250, 100)).toEqual({
      currentTotal: 250,
      delta: 150,
    });

    expect(calculateCumulativeDelta(30, 250)).toEqual({
      currentTotal: 30,
      delta: 30,
    });
  });
});
