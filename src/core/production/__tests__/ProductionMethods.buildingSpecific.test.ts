import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBuildingDefaultMethods,
  getBuildingProductionVariants,
  getDefaultSlotMethods,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { getProductionVariantByLegacyOutputMode } from '@/core/production/legacyOutputModeBridge';
import { BuildingId } from '@/data/buildings';
import { computeRecipe, createMethod } from '@/core/production/methods/registry';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Vic3 method recipe', () => {
  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('default method recipe sums slot deltas (Vic3 风格)', () => {
    const recipe = getRecipeForBuilding(BuildingId.IRON_MINE, getBuildingDefaultMethods(BuildingId.IRON_MINE));

    // 默认 method 至少应给出 1 个产出（铁矿）+ 非负 workforce/energy
    expect(recipe.outputs.length).toBeGreaterThan(0);
    expect(recipe.workforceRequired.basic).toBeGreaterThanOrEqual(0);
    expect(recipe.workforceRequired.technical).toBeGreaterThanOrEqual(0);
    expect(recipe.workforceRequired.management).toBeGreaterThanOrEqual(0);
    expect(recipe.energyRequired).toBeGreaterThanOrEqual(0);
    expect(recipe.ticksRequired).toBeGreaterThan(0);
  });

  it('every registered building has a default method', () => {
    const defaults = getBuildingDefaultMethods(BuildingId.STEEL_MILL);
    expect(Object.keys(defaults).length).toBeGreaterThan(0);
  });

  it('resolves a legacy output mode through the registered production variants', () => {
    const variant = getProductionVariantByLegacyOutputMode(
      BuildingId.FOOD_FACTORY,
      0,
    );

    expect(variant).not.toBeNull();
    expect(variant?.legacyOutputModeId).toBe(0);
    expect(variant?.name).toBe('食品加工');
    expect(variant?.slotMethods.length).toBeGreaterThan(0);
    expect(variant?.recipe.outputs.length).toBeGreaterThan(0);
  });

  it('preserves legacy production cadence when auto-generated methods become variants', () => {
    const herbFarmVariant = getBuildingProductionVariants(BuildingId.HERB_FARM)[0];
    const silkVariant = getProductionVariantByLegacyOutputMode(
      BuildingId.TEXTILE_MILL,
      1,
    );

    expect(herbFarmVariant).toBeDefined();
    expect(herbFarmVariant.recipe.ticksRequired).toBeGreaterThanOrEqual(1);
    expect(silkVariant).not.toBeNull();
    expect(silkVariant?.recipe.ticksRequired).toBeGreaterThanOrEqual(1);
  });
});

describe('production method workforce demand', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('returns role workforce demand instead of a single labor total', () => {
    const recipe = getRecipeForBuilding(
      BuildingId.IRON_MINE,
      getDefaultSlotMethods(BuildingId.IRON_MINE),
    );

    expect(recipe.workforceRequired.basic).toBeGreaterThan(0);
    expect(recipe.workforceRequired.technical).toBeGreaterThanOrEqual(0);
    expect(recipe.workforceRequired.management).toBeGreaterThanOrEqual(1);
    expect('laborRequired' in recipe).toBe(false);
  });

  it('gives high-tech buildings more technical labor share than farms', () => {
    const farmRecipe = getRecipeForBuilding(
      BuildingId.FARM,
      getDefaultSlotMethods(BuildingId.FARM),
    );
    const semiconductorRecipe = getRecipeForBuilding(
      BuildingId.SEMICONDUCTOR_FAB,
      getDefaultSlotMethods(BuildingId.SEMICONDUCTOR_FAB),
    );

    const farmTechnicalShare =
      farmRecipe.workforceRequired.technical /
      Math.max(
        1,
        farmRecipe.workforceRequired.basic +
          farmRecipe.workforceRequired.technical +
          farmRecipe.workforceRequired.management,
      );
    const semiconductorTechnicalShare =
      semiconductorRecipe.workforceRequired.technical /
      Math.max(
        1,
        semiconductorRecipe.workforceRequired.basic +
          semiconductorRecipe.workforceRequired.technical +
          semiconductorRecipe.workforceRequired.management,
      );

    expect(semiconductorTechnicalShare).toBeGreaterThan(farmTechnicalShare);
  });

  it('does not share mutable workforce objects between methods or empty recipes', () => {
    const workforce = { basic: 10, technical: 2, management: 1 };
    const method = createMethod(999, 1, 'production', 'test', 'Test Method', {
      workforceDelta: workforce,
    });

    workforce.basic = 99;
    method.workforceDelta.technical = 50;

    expect(method.workforceDelta.basic).toBe(10);
    expect(workforce.technical).toBe(2);

    const firstRecipe = computeRecipe(123456, {});
    const secondRecipe = computeRecipe(123456, {});
    firstRecipe.workforceRequired.basic = 42;

    expect(secondRecipe.workforceRequired.basic).toBe(0);
  });
});
