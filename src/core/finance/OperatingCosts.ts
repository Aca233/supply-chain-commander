import { BUILDINGS_BY_ID } from '@/data/buildings';
import { MAX_SLOTS, TICKS_PER_DAY } from '@/core/constants';
import { getBuildingSlotCount, getRecipeForBuilding } from '@/core/production/ProductionMethods';

import { GameWorld } from '../world/GameWorld';

export interface OperatingCostBreakdown {
  maintenance: number;
  labor: number;
  energy: number;
  total: number;
  cashExpense: number;
  nonCashExpense: number;
}

const DEFAULT_TICKS_PER_DAY = TICKS_PER_DAY;

/**
 * 读取建筑当前 method 配方的 energyRequired（绝对值，每天）
 * 若建筑未注册则返回 0
 */
function getBuildingRecipeEnergy(world: GameWorld, buildingId: number): number {
  const buildingTypeId = world.buildings.types[buildingId];
  const slotCount = getBuildingSlotCount(buildingTypeId);
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    slotMethods.push(world.buildings.slotMethods[slotOffset + i] ?? 0);
  }
  return getRecipeForBuilding(buildingTypeId, slotMethods).energyRequired;
}

export function calculateCompanyOperatingCostPerTick(
  world: GameWorld,
  companyId: number,
  ticksPerDay: number = DEFAULT_TICKS_PER_DAY,
): OperatingCostBreakdown {
  let maintenance = 0;
  let labor = 0;
  let energy = 0;

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    if (world.buildings.owners[buildingId] !== companyId) continue;
    if (world.buildings.isActive[buildingId] !== 1) continue;

    const buildingDef = BUILDINGS_BY_ID.get(world.buildings.types[buildingId]);
    if (!buildingDef) continue;

    maintenance += buildingDef.maintenanceCost / ticksPerDay;
    labor += buildingDef.laborCost / ticksPerDay;

    // 能耗：基础能耗 + method 配方提供的额外能耗
    const recipeEnergy = getBuildingRecipeEnergy(world, buildingId);
    energy += (buildingDef.energyCost + recipeEnergy) / ticksPerDay;
  }

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

export function applyOperatingCosts(
  world: GameWorld,
  ticksPerDay: number = DEFAULT_TICKS_PER_DAY,
): OperatingCostBreakdown[] {
  const breakdowns: OperatingCostBreakdown[] = [];

  for (let companyId = 0; companyId < world.companies.count; companyId++) {
    const breakdown = calculateCompanyOperatingCostPerTick(world, companyId, ticksPerDay);
    breakdowns.push(breakdown);

    if (breakdown.cashExpense !== 0) {
      world.companies.cash[companyId] -= breakdown.cashExpense;
    }

    const wagesToHouseholds = breakdown.labor;
    if (wagesToHouseholds > 0) {
      world.households.cash[0] += wagesToHouseholds;
      world.households.totalWagesReceived += wagesToHouseholds;
    }
  }

  return breakdowns;
}
