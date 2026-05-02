import { beforeEach, describe, expect, it } from 'vitest';

import {
  getBuildingDefaultMethods,
  getBuildingProductionVariants,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { TICKS_PER_DAY } from '@/core/constants';
import { BuildingId } from '@/data/buildings';
import {
  calculateDailyConsumption,
  calculateTheoreticalOutput,
  initProductionCache,
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
    expect(recipe.laborRequired).toBeGreaterThanOrEqual(0);
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
