import { describe, expect, it } from 'vitest';

import { calculateBuildingFinancialEstimate } from '../BuildingFinancialEstimate';

describe('BuildingFinancialEstimate', () => {
  it('subtracts daily workforce payroll from building profit', () => {
    const estimate = calculateBuildingFinancialEstimate({
      isActive: true,
      dailyCost: 100,
      laborCost: 300,
      outputs: [{ dailyAmount: 10, price: 100 }],
    });

    expect(estimate.dailyRevenue).toBe(1_000);
    expect(estimate.dailyCost).toBe(400);
    expect(estimate.dailyProfit).toBe(600);
  });
});
