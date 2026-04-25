import { BUILDINGS_BY_ID } from '@/data/buildings';
import { MAX_SLOTS } from '@/core/constants';
import { getBuildingSlotCount, getProductionModifiersForBuilding } from '@/core/production/ProductionMethods';

import { GameWorld } from '../world/GameWorld';

export interface OperatingCostBreakdown {
  maintenance: number;
  labor: number;
  energy: number;
  total: number;
  cashExpense: number;
  nonCashExpense: number;
}

const DEFAULT_TICKS_PER_DAY = 24;

function getBuildingEnergyMultiplier(world: GameWorld, buildingId: number): number {
  const buildingTypeId = world.buildings.types[buildingId];
  const slotCount = getBuildingSlotCount(buildingTypeId);
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];

  for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
    slotMethods.push(world.buildings.slotMethods[slotOffset + slotIndex] ?? 0);
  }

  return getProductionModifiersForBuilding(buildingTypeId, slotMethods).energyMultiplier;
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
    if (world.buildings.owners[buildingId] !== companyId) {
      continue;
    }

    const buildingDef = BUILDINGS_BY_ID.get(world.buildings.types[buildingId]);
    if (!buildingDef) {
      continue;
    }

    maintenance += buildingDef.maintenanceCost / ticksPerDay;
    labor += buildingDef.laborCost / ticksPerDay;
    energy += (buildingDef.energyCost * getBuildingEnergyMultiplier(world, buildingId)) / ticksPerDay;
  }

  const cashExpense = maintenance;
  const nonCashExpense = labor + energy;

  return {
    maintenance,
    labor,
    energy,
    total: cashExpense + nonCashExpense,
    cashExpense,
    nonCashExpense,
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

    // Maintenance is modeled as the direct cash sink.
    // Labor and energy are retained as operating burden metrics, but they are
    // treated as economy-wide circulation costs instead of deleting cash from
    // the company pool every tick.
    if (breakdown.cashExpense !== 0) {
      world.companies.cash[companyId] -= breakdown.cashExpense;
    }
  }

  return breakdowns;
}
