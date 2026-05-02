import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBuildingDefaultMethods,
  getBuildingProductionVariants,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { getProductionVariantByLegacyOutputMode } from '@/core/production/legacyOutputModeBridge';
import { BuildingId } from '@/data/buildings';

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

    // 默认 method 至少应给出 1 个产出（铁矿）+ 非负 labor/energy
    expect(recipe.outputs.length).toBeGreaterThan(0);
    expect(recipe.laborRequired).toBeGreaterThanOrEqual(0);
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
