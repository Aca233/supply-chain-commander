import { TICKS_PER_DAY } from '@/core/constants';

export interface BuildingOutputEstimate {
  dailyAmount: number;
  price: number;
}

export interface BuildingFinancialEstimateInput {
  isActive: boolean;
  dailyCost: number;
  outputs: BuildingOutputEstimate[];
}

export interface BuildingFinancialEstimate {
  dailyRevenue: number;
  dailyCost: number;
  dailyProfit: number;
}

export function calculateBuildingDailyAmount(
  amountPerCycle: number,
  ticksRequired: number,
  efficiency: number,
): number {
  return (amountPerCycle / Math.max(1, ticksRequired)) * TICKS_PER_DAY * efficiency;
}

export function calculateBuildingFinancialEstimate(
  input: BuildingFinancialEstimateInput,
): BuildingFinancialEstimate {
  const dailyRevenue = input.isActive
    ? input.outputs.reduce((sum, output) => sum + output.dailyAmount * output.price, 0)
    : 0;

  return {
    dailyRevenue,
    dailyCost: input.dailyCost,
    dailyProfit: dailyRevenue - input.dailyCost,
  };
}
