import { beforeEach, describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import {
  getBuildingDefaultMethods,
  getBuildingProductionVariants,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { MAX_INPUTS, MAX_OUTPUTS, TICKS_PER_DAY } from '@/core/constants';
import { BuildingId } from '@/data/buildings';
import {
  LABOR_ROLE_BASIC,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  getBuildingLaborIndex,
  getTotalWorkforceDemand,
} from '@/core/labor/LaborSystem';
import {
  calculateDailyConsumption,
  calculateTheoreticalOutput,
  getBuildingWorkforceCoverage,
  initProductionCache,
  updateAllProduction,
} from '../ProductionEngine';

describe('ProductionEngine day-model normalization (Vic3 recipe)', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('default method recipe is available for IRON_MINE', () => {
    const recipe = getRecipeForBuilding(
      BuildingId.IRON_MINE,
      getBuildingDefaultMethods(BuildingId.IRON_MINE),
    );
    expect(recipe.outputs.length).toBeGreaterThan(0);
    expect(getTotalWorkforceDemand(recipe.workforceRequired)).toBeGreaterThanOrEqual(0);
    expect(recipe.energyRequired).toBeGreaterThanOrEqual(0);
  });

  it('calculateTheoreticalOutput returns the default-method output amount', () => {
    const outputs = calculateTheoreticalOutput(BuildingId.IRON_MINE, 1);
    const recipe = getRecipeForBuilding(
      BuildingId.IRON_MINE,
      getBuildingDefaultMethods(BuildingId.IRON_MINE),
    );
    expect(outputs).toHaveLength(recipe.outputs.length);
    expect(outputs[0].goodsId).toBe(recipe.outputs[0].goodsId);
    expect(outputs[0].amount).toBeCloseTo(recipe.outputs[0].amount);
  });

  it('calculateDailyConsumption normalizes default-method inputs to a daily rate', () => {
    const inputs = calculateDailyConsumption(BuildingId.STEEL_MILL);
    const recipe = getRecipeForBuilding(
      BuildingId.STEEL_MILL,
      getBuildingDefaultMethods(BuildingId.STEEL_MILL),
    );
    expect(inputs).toHaveLength(recipe.inputs.length);
    expect(inputs[0].goodsId).toBe(recipe.inputs[0].goodsId);
    expect(inputs[0].amount).toBeCloseTo(
      (recipe.inputs[0].amount / recipe.ticksRequired) * TICKS_PER_DAY,
    );
  });

  it('building production variants expose outputs from method configs', () => {
    const variants = getBuildingProductionVariants(BuildingId.FOOD_FACTORY);
    expect(variants.length).toBeGreaterThan(0);
    // 每个 variant 都应有非空名字（不再有匿名的"默认配方"占位条目）
    expect(variants.every((variant) => variant.name && variant.name.length > 0)).toBe(true);

    for (const variant of variants) {
      const recipe = getRecipeForBuilding(BuildingId.FOOD_FACTORY, variant.slotMethods);
      expect(recipe.outputs.length).toBeGreaterThan(0);
    }
  });
});

describe('ProductionEngine workforce coverage', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  function createSingleBuildingWorld(buildingTypeId: number = BuildingId.IRON_MINE) {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 10_000_000;
    const buildingId = addBuilding(world, 0, buildingTypeId, 0);
    const recipe = getRecipeForBuilding(
      buildingTypeId,
      getBuildingDefaultMethods(buildingTypeId),
    );

    return { world, buildingId, recipe };
  }

  function fillInputBuffers(
    world: ReturnType<typeof createGameWorld>,
    buildingId: number,
    recipe: ReturnType<typeof getRecipeForBuilding>,
  ): void {
    const inputOffset = buildingId * MAX_INPUTS;
    recipe.inputs.forEach((input, index) => {
      world.buildings.inputBuffers[inputOffset + index] = input.amount;
    });
  }

  it('blocks production when an active building has no hired workforce coverage', () => {
    const { world, buildingId } = createSingleBuildingWorld();

    const coverage = getBuildingWorkforceCoverage(world, buildingId);
    const result = updateAllProduction(world);

    expect(coverage.coverage).toBe(0);
    expect(coverage.bottleneckRole).toBe(LABOR_ROLE_BASIC);
    expect(result.producedCount).toBe(0);
    expect(result.blockedCount).toBe(1);
    expect(result.laborShortage).toBe(1);
    expect('totalLaborCoverage' in result).toBe(true);
    expect((result as { totalLaborCoverage?: number }).totalLaborCoverage).toBe(0);
    expect(world.buildings.outputBuffers[buildingId * MAX_OUTPUTS]).toBe(0);
  });

  it('reduces output by the lowest role coverage', () => {
    const { world, buildingId } = createSingleBuildingWorld();

    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)] = 999;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_TECHNICAL)] = 999;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_MANAGEMENT)] = 0;

    const coverage = getBuildingWorkforceCoverage(world, buildingId);
    const result = updateAllProduction(world);

    expect(coverage.coverage).toBe(0);
    expect(coverage.bottleneckRole).toBe(LABOR_ROLE_MANAGEMENT);
    expect(result.producedCount).toBe(0);
    expect(result.laborShortage).toBe(1);
    expect(world.buildings.outputBuffers[buildingId * MAX_OUTPUTS]).toBe(0);
  });

  it('lets active utilization reduce workforce demand before shortage coverage', () => {
    const { world, buildingId, recipe } = createSingleBuildingWorld();
    world.tick = 1;
    world.buildings.efficiencies[buildingId] = 0.5;
    fillInputBuffers(world, buildingId, recipe);

    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)] =
      Math.ceil(recipe.workforceRequired.basic * 0.5);
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_TECHNICAL)] =
      Math.ceil(recipe.workforceRequired.technical * 0.5);
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_MANAGEMENT)] =
      Math.ceil(recipe.workforceRequired.management * 0.5);

    const coverage = getBuildingWorkforceCoverage(world, buildingId);
    const result = updateAllProduction(world);

    expect(coverage.activeDemand.basic).toBe(Math.ceil(recipe.workforceRequired.basic * 0.5));
    expect(coverage.coverage).toBe(1);
    expect(result.producedCount).toBe(1);
    expect(result.laborShortage).toBe(0);
    expect(world.buildings.outputBuffers[buildingId * MAX_OUTPUTS]).toBeGreaterThan(0);
  });

  it('scales production output by the bottleneck role coverage for the building', () => {
    const { world, buildingId, recipe } = createSingleBuildingWorld();
    const outputOffset = buildingId * MAX_OUTPUTS;
    const basicDemand = recipe.workforceRequired.basic;
    fillInputBuffers(world, buildingId, recipe);

    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)] =
      basicDemand / 2;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_TECHNICAL)] =
      recipe.workforceRequired.technical;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_MANAGEMENT)] =
      recipe.workforceRequired.management;

    const result = updateAllProduction(world);

    expect(result.producedCount).toBe(1);
    expect(result.laborShortage).toBe(1);
    expect((result as { totalLaborCoverage?: number }).totalLaborCoverage).toBeCloseTo(0.5, 1);
    expect(world.buildings.outputBuffers[outputOffset]).toBeCloseTo(recipe.outputs[0].amount * 0.5, 1);
  });
});
