import { beforeEach, describe, expect, it } from 'vitest';

import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { TICKS_PER_DAY } from '@/core/constants';
import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';

import {
  applyOperatingCosts,
  calculateCompanyOperatingCostPerTick,
} from '../OperatingCosts';

function addOwnedBuilding(world: ReturnType<typeof createGameWorld>, ownerId: number, buildingTypeId: number): number {
  return addBuilding(world, ownerId, buildingTypeId, 0);
}

describe('OperatingCosts', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('calculates per-tick maintenance while excluding payroll and abstract energy charges', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    addOwnedBuilding(world, 0, BuildingId.IRON_MINE);
    addOwnedBuilding(world, 0, BuildingId.STEEL_MILL);
    addOwnedBuilding(world, 1, BuildingId.FARM);

    const ironMine = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL)!;

    const breakdown = calculateCompanyOperatingCostPerTick(world, 0);

    expect(breakdown.maintenance).toBeCloseTo(
      (ironMine.maintenanceCost + steelMill.maintenanceCost) / TICKS_PER_DAY,
    );
    expect(breakdown.labor).toBeCloseTo(0);
    expect(breakdown.energy).toBeCloseTo(0);
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
    expect(world.households.cash[0]).toBeCloseTo(0);
    expect(world.households.totalWagesReceived).toBeCloseTo(0);
  });

  it('ignores inactive buildings when calculating recurring operating costs', () => {
    const world = createGameWorld();
    world.companies.count = 1;

    addOwnedBuilding(world, 0, BuildingId.IRON_MINE);
    const inactiveBuildingId = addOwnedBuilding(world, 0, BuildingId.CONVENIENCE_STORE);
    world.buildings.isActive[0] = 1;
    world.buildings.isActive[inactiveBuildingId] = 0;

    const activeBreakdown = calculateCompanyOperatingCostPerTick(world, 0);
    const ironMine = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;

    expect(activeBreakdown.maintenance).toBeCloseTo(ironMine.maintenanceCost / TICKS_PER_DAY);
    expect(activeBreakdown.labor).toBeCloseTo(0);
    expect(activeBreakdown.energy).toBeCloseTo(0);
  });

  it('does not deduct old building laborCost as operating cost', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 1_000_000;
    addOwnedBuilding(world, 0, BuildingId.IRON_MINE);

    const ironMine = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const breakdown = applyOperatingCosts(world)[0];

    expect(breakdown.labor).toBe(0);
    expect(breakdown.total).toBeLessThan(
      (ironMine.maintenanceCost + ironMine.laborCost + ironMine.energyCost) / TICKS_PER_DAY,
    );
  });

  it('excludes hired workforce payroll because LaborSystem accrues and pays wages separately', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    const buildingId = addOwnedBuilding(world, 0, BuildingId.IRON_MINE);

    world.labor.marketWages[0] = 120;
    world.buildings.workforceHired[buildingId * 3] = 10;
    world.buildings.wageMultipliers[buildingId * 3] = 1;

    const breakdown = calculateCompanyOperatingCostPerTick(world, 0);

    expect(breakdown.labor).toBe(0);
  });
});
