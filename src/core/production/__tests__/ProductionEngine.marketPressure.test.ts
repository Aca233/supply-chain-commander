import { describe, expect, it } from 'vitest';

import { initProductionCache } from '@/core/production/ProductionEngine';
import { getBuildingProductionVariants, initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

import { GOODS_COUNT } from '../../constants';
import { autoFeedBuildings } from '../ProductionEngine';

describe('ProductionEngine market pressure accounting', () => {
  it('removes supply pressure when company inventory is moved into building input buffers', () => {
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createGameWorld();
    world.goods.count = 80;
    world.companies.count = 2;

    const variant = getBuildingProductionVariants(BuildingId.STEEL_MILL)[0];
    const buildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, {
      slotMethods: variant.slotMethods,
    });

    const input = variant.recipe.inputs[0];
    const inventoryIdx = 1 * GOODS_COUNT + input.goodsId;
    const inputOffset = buildingId * 8;
    const targetBuffer = input.amount * 7;
    const availableInventory = targetBuffer + 5;

    world.companies.inventories[inventoryIdx] = availableInventory;
    world.goods.supplies[input.goodsId] = availableInventory;
    world.buildings.inputBuffers[inputOffset] = 0;

    autoFeedBuildings(world);

    expect(world.buildings.inputBuffers[inputOffset]).toBe(targetBuffer);
    expect(world.companies.inventories[inventoryIdx]).toBe(5);
    expect(world.goods.supplies[input.goodsId]).toBe(5);
  });
});
