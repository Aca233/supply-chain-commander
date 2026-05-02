import { beforeEach, describe, expect, it } from 'vitest';

import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { MAX_SLOTS, TICKS_PER_DAY } from '@/core/constants';
import {
  getBuildingSlotCount,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';

import {
  applyOperatingCosts,
  calculateCompanyOperatingCostPerTick,
} from '../OperatingCosts';

function addOwnedBuilding(world: ReturnType<typeof createGameWorld>, ownerId: number, buildingTypeId: number): number {
  return addBuilding(world, ownerId, buildingTypeId, 0);
}

function recipeEnergyFor(world: ReturnType<typeof createGameWorld>, buildingId: number): number {
  const buildingTypeId = world.buildings.types[buildingId];
  const slotCount = getBuildingSlotCount(buildingTypeId);
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    slotMethods.push(world.buildings.slotMethods[slotOffset + i] ?? 0);
  }
  return getRecipeForBuilding(buildingTypeId, slotMethods).energyRequired;
}

describe('OperatingCosts', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('calculates per-tick maintenance, labor, energy from building base costs + recipe energy delta', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const ironMineId = addOwnedBuilding(world, 0, BuildingId.IRON_MINE);
    const steelMillId = addOwnedBuilding(world, 0, BuildingId.STEEL_MILL);
    addOwnedBuilding(world, 1, BuildingId.FARM);

    const ironMine = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL)!;

    const breakdown = calculateCompanyOperatingCostPerTick(world, 0);

    expect(breakdown.maintenance).toBeCloseTo(
      (ironMine.maintenanceCost + steelMill.maintenanceCost) / TICKS_PER_DAY,
    );
    expect(breakdown.labor).toBeCloseTo(
      (ironMine.laborCost + steelMill.laborCost) / TICKS_PER_DAY,
    );
    // Vic3 风格：energy = base energyCost + 所有 method 的 energyDelta 求和
    const expectedEnergy =
      (ironMine.energyCost + recipeEnergyFor(world, ironMineId) +
        steelMill.energyCost + recipeEnergyFor(world, steelMillId)) / TICKS_PER_DAY;
    expect(breakdown.energy).toBeCloseTo(expectedEnergy);
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
    const expectedHouseholdInflow = breakdowns[0].labor;
    expect(world.households.cash[0]).toBeCloseTo(expectedHouseholdInflow);
    expect(world.households.totalWagesReceived).toBeCloseTo(expectedHouseholdInflow);
  });

  it('ignores inactive buildings when calculating recurring operating costs', () => {
    const world = createGameWorld();
    world.companies.count = 1;

    const activeBuildingId = addOwnedBuilding(world, 0, BuildingId.IRON_MINE);
    const inactiveBuildingId = addOwnedBuilding(world, 0, BuildingId.CONVENIENCE_STORE);
    world.buildings.isActive[activeBuildingId] = 1;
    world.buildings.isActive[inactiveBuildingId] = 0;

    const activeBreakdown = calculateCompanyOperatingCostPerTick(world, 0);
    const ironMine = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const expectedEnergy =
      (ironMine.energyCost + recipeEnergyFor(world, activeBuildingId)) / TICKS_PER_DAY;

    expect(activeBreakdown.maintenance).toBeCloseTo(ironMine.maintenanceCost / TICKS_PER_DAY);
    expect(activeBreakdown.labor).toBeCloseTo(ironMine.laborCost / TICKS_PER_DAY);
    expect(activeBreakdown.energy).toBeCloseTo(expectedEnergy);
  });
});
