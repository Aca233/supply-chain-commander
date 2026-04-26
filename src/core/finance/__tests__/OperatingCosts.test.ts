import { beforeEach, describe, expect, it } from 'vitest';

import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { initializeBuildingProductionMethods, getProductionModifiersForBuilding } from '@/core/production/ProductionMethods';

import { createGameWorld } from '@/core/world/GameWorld';
import { getBuildingSelectedMethods, setBuildingMethod } from '@/core/production/ProductionEngine';
import { addBuilding } from '@/core/world/WorldInitializer';

import {
  applyOperatingCosts,
  calculateCompanyOperatingCostPerTick,
} from '../OperatingCosts';

function addOwnedBuilding(world: ReturnType<typeof createGameWorld>, ownerId: number, buildingTypeId: number): number {
  return addBuilding(world, ownerId, buildingTypeId, 0);
}

function getEnergyMultiplier(world: ReturnType<typeof createGameWorld>, buildingId: number): number {
  const buildingTypeId = world.buildings.types[buildingId];
  const selectedMethods = getBuildingSelectedMethods(world, buildingId);
  return getProductionModifiersForBuilding(buildingTypeId, selectedMethods).energyMultiplier;
}

describe('OperatingCosts', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('calculates per-tick maintenance, labor, and energy costs for owned buildings', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const ironMineId = addOwnedBuilding(world, 0, BuildingId.IRON_MINE);
    const steelMillId = addOwnedBuilding(world, 0, BuildingId.STEEL_MILL);
    addOwnedBuilding(world, 1, BuildingId.FARM);

    const ironMine = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL)!;
    const ironMineEnergyMultiplier = getEnergyMultiplier(world, ironMineId);
    const steelMillEnergyMultiplier = getEnergyMultiplier(world, steelMillId);

    const breakdown = calculateCompanyOperatingCostPerTick(world, 0);

    expect(breakdown.maintenance).toBeCloseTo(
      (ironMine.maintenanceCost + steelMill.maintenanceCost) / 1 /* TICKS_PER_DAY */,
    );
    expect(breakdown.labor).toBeCloseTo(
      (ironMine.laborCost + steelMill.laborCost) / 1 /* TICKS_PER_DAY */,
    );
    expect(breakdown.energy).toBeCloseTo(
      (
        ironMine.energyCost * ironMineEnergyMultiplier +
        steelMill.energyCost * steelMillEnergyMultiplier
      ) / 1 /* TICKS_PER_DAY */,
    );
    expect(breakdown.total).toBeCloseTo(
      (
        ironMine.maintenanceCost +
        ironMine.laborCost +
        ironMine.energyCost * ironMineEnergyMultiplier +
        steelMill.maintenanceCost +
        steelMill.laborCost +
        steelMill.energyCost * steelMillEnergyMultiplier
      ) / 1 /* TICKS_PER_DAY */,
    );
  });

  it('deducts recurring operating costs from company cash', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.cash[0] = 1_000_000;
    world.companies.cash[1] = 500_000;

    addOwnedBuilding(world, 0, BuildingId.IRON_MINE);

    const expectedTotal = calculateCompanyOperatingCostPerTick(world, 0).total;

    const breakdowns = applyOperatingCosts(world);

    expect(breakdowns[0].total).toBeCloseTo(expectedTotal);
    expect(world.companies.cash[0]).toBeCloseTo(1_000_000 - breakdowns[0].cashExpense);
    expect(breakdowns[0].cashExpense).toBeCloseTo(breakdowns[0].total);
    expect(breakdowns[0].nonCashExpense).toBeCloseTo(0);
    expect(world.companies.cash[1]).toBeCloseTo(500_000);
    // Labor + energy transferred to household pool (闭合货币循环)
    const expectedHouseholdInflow = breakdowns[0].labor + breakdowns[0].energy;
    expect(world.households.cash[0]).toBeCloseTo(expectedHouseholdInflow);
    expect(world.households.totalWagesReceived).toBeCloseTo(expectedHouseholdInflow);
  });

  it('applies production method energy multipliers to energy operating costs', () => {
    const world = createGameWorld();
    world.companies.count = 1;

    const buildingId = addOwnedBuilding(world, 0, BuildingId.IRON_MINE);
    const ironMine = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;

    expect(setBuildingMethod(world, buildingId, 0, 10002)).toBe(true);

    const breakdown = calculateCompanyOperatingCostPerTick(world, 0);

    expect(breakdown.energy).toBeCloseTo((ironMine.energyCost * 1.12) / 1 /* TICKS_PER_DAY */, 5);
  });
});
