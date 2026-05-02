import { beforeEach, describe, expect, it } from 'vitest';

import { getBaseMaterials, getBuildTime } from '@/data/buildingMaterials';
import { BuildingId } from '@/data/buildings';
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
});
