import { LEGACY_HOURS_PER_DAY, TICKS_PER_DAY } from '@/core/constants';

export interface OperatingCostBreakdown {
  maintenance: number;
  labor: number;
  energy: number;
  total: number;
  cashExpense: number;
  nonCashExpense: number;
}

type BuildingOperatingCostDefinition = {
  maintenanceCost: number;
  laborCost: number;
  energyCost: number;
};

export function scaleOperatingCostAmount(
  amount: number,
  ticksPerDay: number = TICKS_PER_DAY,
): number {
  return amount / (LEGACY_HOURS_PER_DAY * ticksPerDay);
}

export function calculateBuildingDefinitionOperatingCostPerTick(
  buildingDef: BuildingOperatingCostDefinition,
  energyMultiplier = 1,
  ticksPerDay: number = TICKS_PER_DAY,
): OperatingCostBreakdown {
  const maintenance = scaleOperatingCostAmount(buildingDef.maintenanceCost, ticksPerDay);
  const labor = scaleOperatingCostAmount(buildingDef.laborCost, ticksPerDay);
  const energy = scaleOperatingCostAmount(buildingDef.energyCost * energyMultiplier, ticksPerDay);
  const cashExpense = maintenance + labor + energy;

  return {
    maintenance,
    labor,
    energy,
    total: cashExpense,
    cashExpense,
    nonCashExpense: 0,
  };
}
