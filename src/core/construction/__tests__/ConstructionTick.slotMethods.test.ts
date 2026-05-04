import { beforeEach, describe, expect, it } from 'vitest';

import { getBaseMaterials, getBuildTime } from '@/data/buildingMaterials';
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import {
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { getProductionVariantByLegacyOutputMode } from '@/core/production/legacyOutputModeBridge';

import { processConstructionAndDemolitionTick, startConstruction } from '../ConstructionTick';

describe('construction queue production selection', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('applies the queued legacy output mode when the new building completes', () => {
    const world = createGameWorld();
    world.companies.count = 1;

    for (const material of getBaseMaterials(BuildingId.FARM)) {
      world.companies.inventories[material.goodsId] = material.amount;
    }

    const cottonVariant = getProductionVariantByLegacyOutputMode(
      BuildingId.FARM,
      1,
    );

    expect(cottonVariant).not.toBeNull();

    const queued = startConstruction(world, 0, BuildingId.FARM, 1);
    expect(queued.success).toBe(true);

    processConstructionAndDemolitionTick(world);
    world.tick += getBuildTime(BuildingId.FARM);
    processConstructionAndDemolitionTick(world);

    expect(world.buildings.count).toBe(1);

    const slotMethods = Array.from(
      world.buildings.slotMethods.slice(0, cottonVariant!.slotMethods.length),
    );
    expect(slotMethods).toEqual(cottonVariant!.slotMethods);
  });

  it('does not reuse a recipe cached before the new building exists', () => {
    const world = createGameWorld();
    world.companies.count = 1;

    getBuildingRecipeFromInstance(world, 0);

    for (const material of getBaseMaterials(BuildingId.COPPER_MINE)) {
      world.companies.inventories[material.goodsId] = material.amount;
    }

    const queued = startConstruction(world, 0, BuildingId.COPPER_MINE);
    expect(queued.success).toBe(true);

    processConstructionAndDemolitionTick(world);
    world.tick += getBuildTime(BuildingId.COPPER_MINE);
    processConstructionAndDemolitionTick(world);

    expect(world.buildings.count).toBe(1);

    const recipe = getBuildingRecipeFromInstance(world, 0);
    expect(recipe.outputs.some((output) => output.goodsId === GoodsId.COPPER_ORE)).toBe(true);
    expect(recipe.outputs.some((output) => output.goodsId === GoodsId.IRON_ORE)).toBe(false);
  });
});
