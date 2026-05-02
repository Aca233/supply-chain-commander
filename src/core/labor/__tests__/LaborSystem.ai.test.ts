import { beforeEach, describe, expect, it } from 'vitest';

import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { getBuildingRecipeFromInstance, initProductionCache } from '@/core/production/ProductionEngine';
import { createGameWorld, type GameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import {
  LABOR_ROLE_BASIC,
  adjustAIWageMultipliers,
  getBuildingLaborIndex,
  processBuildingLaborMarket,
  scaleWorkforceDemand,
} from '../LaborSystem';

function configureCompany(
  world: GameWorld,
  companyId: number,
  isAI: boolean,
  cash = 10_000_000,
  useTypedAIFlags = false,
): void {
  world.companies.count = Math.max(world.companies.count, companyId + 1);
  world.companies.cash[companyId] = cash;
  world.companies.isPlayer = new Array(world.companies.count).fill(false);

  if (useTypedAIFlags) {
    const flags = new Uint8Array(world.companies.count);
    flags[companyId] = isAI ? 1 : 0;
    world.companies.isAI = flags as unknown as boolean[];
  } else {
    world.companies.isAI = new Array(world.companies.count).fill(false);
    world.companies.isAI[companyId] = isAI;
  }
}

function addActiveBuilding(world: GameWorld, companyId: number): number {
  const buildingId = addBuilding(world, companyId, BuildingId.IRON_MINE, 0);
  world.buildings.isActive[buildingId] = 1;
  world.buildings.efficiencies[buildingId] = 1;
  return buildingId;
}

describe('LaborSystem AI and building labor market', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('hires active buildings against current recipe demand and records openings first', () => {
    const world = createGameWorld();
    configureCompany(world, 0, false);
    const buildingId = addActiveBuilding(world, 0);
    world.buildings.efficiencies[buildingId] = 0.5;
    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const activeDemand = scaleWorkforceDemand(recipe.workforceRequired, 0.5);
    const hiredIdx = getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC);

    processBuildingLaborMarket(world);

    expect(world.labor.demandOpenings[LABOR_ROLE_BASIC]).toBe(activeDemand.basic);
    expect(world.buildings.workforceHired[hiredIdx]).toBeGreaterThan(0);
    expect(world.buildings.workforceHired[hiredIdx]).toBeLessThanOrEqual(activeDemand.basic);
  });

  it('raises AI wage multipliers when a building is short staffed', () => {
    const world = createGameWorld();
    const aggressiveCompanyId = 29;
    configureCompany(world, aggressiveCompanyId, true, 10_000_000, true);
    const buildingId = addActiveBuilding(world, aggressiveCompanyId);
    const wageIdx = getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC);

    adjustAIWageMultipliers(world);

    expect(world.buildings.wageMultipliers[wageIdx]).toBeCloseTo(1.04);
  });

  it('does not automatically adjust player or non-AI wage multipliers', () => {
    const world = createGameWorld();
    configureCompany(world, 0, false);
    const buildingId = addActiveBuilding(world, 0);
    const wageIdx = getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC);

    adjustAIWageMultipliers(world);

    expect(world.buildings.wageMultipliers[wageIdx]).toBe(1);
  });

  it('lowers full AI building wage multipliers', () => {
    const world = createGameWorld();
    configureCompany(world, 1, true);
    const buildingId = addActiveBuilding(world, 1);
    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const activeDemand = scaleWorkforceDemand(recipe.workforceRequired, 1);
    const wageIdx = getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC);
    world.buildings.workforceHired[wageIdx] = activeDemand.basic;

    adjustAIWageMultipliers(world);

    expect(world.buildings.wageMultipliers[wageIdx]).toBeLessThan(1);
  });

  it('lowers cash-pressured AI wages without dropping below 0.8', () => {
    const world = createGameWorld();
    configureCompany(world, 1, true, 0);
    const buildingId = addActiveBuilding(world, 1);
    const wageIdx = getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC);
    world.buildings.wageMultipliers[wageIdx] = 0.81;

    adjustAIWageMultipliers(world);

    expect(world.buildings.wageMultipliers[wageIdx]).toBeCloseTo(0.8);
  });

  it('does not recruit for inactive buildings', () => {
    const world = createGameWorld();
    configureCompany(world, 0, false);
    const buildingId = addActiveBuilding(world, 0);
    world.buildings.isActive[buildingId] = 0;
    const hiredIdx = getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC);

    processBuildingLaborMarket(world);

    expect(world.labor.demandOpenings[LABOR_ROLE_BASIC]).toBe(0);
    expect(world.buildings.workforceHired[hiredIdx]).toBe(0);
  });
});
