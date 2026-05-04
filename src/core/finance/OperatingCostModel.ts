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

/**
 * 基于建筑定义的运营成本估算（用于建造决策 UI 等静态场景）。
 * 注意：此函数使用建筑定义的 laborCost 作为参考估算值，
 * 实际运行时劳动力成本由 LaborSystem 的 payroll 路径处理。
 */
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
