import { beforeEach, describe, expect, it } from 'vitest';

import { createGameWorld } from '../GameWorld';
import { addBuilding, getBuildingSlotMethodsArray } from '../WorldInitializer';
import {
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { getProductionVariantByLegacyOutputMode } from '@/core/production/legacyOutputModeBridge';
import { BuildingId } from '@/data/buildings';

describe('WorldInitializer explicit slot methods', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('applies explicit slot methods when creating a building', () => {
    const world = createGameWorld();
    const variant = getProductionVariantByLegacyOutputMode(
      BuildingId.FOOD_FACTORY,
      2,
    );

    expect(variant).not.toBeNull();

    const buildingId = addBuilding(world, 0, BuildingId.FOOD_FACTORY, {
      slotMethods: variant!.slotMethods,
    });

    const currentMethods = getBuildingSlotMethodsArray(world, buildingId);
    expect(currentMethods).toEqual(variant!.slotMethods);

    const recipe = getRecipeForBuilding(BuildingId.FOOD_FACTORY, currentMethods);
    expect(recipe.outputs).toEqual(variant!.recipe.outputs);
  });
});
