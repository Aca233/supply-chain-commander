import { describe, expect, it } from 'vitest';

import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

import { GOODS_COUNT, MAX_SLOTS, RETAIL_PRICE_ADJUST_INTERVAL } from '../../constants';
import { GameWorld } from '../../world/GameWorld';
import { initializeWorld } from '../../world/WorldInitializer';
import { registerRetailStore, updateRetailSystem } from '../RetailSystem';

function appendRetailBuilding(world: GameWorld, ownerId = 0): number {
  const buildingId = world.buildings.count++;
  world.buildings.types[buildingId] = BuildingId.CONVENIENCE_STORE;
  world.buildings.owners[buildingId] = ownerId;
  world.buildings.levels[buildingId] = 1;
  world.buildings.efficiencies[buildingId] = 1;
  world.buildings.outputModeIds[buildingId] = 0;
  world.buildings.isActive[buildingId] = 1;

  const slotOffset = buildingId * MAX_SLOTS;
  for (let i = 0; i < MAX_SLOTS; i++) {
    world.buildings.slotMethods[slotOffset + i] = 0;
  }

  return buildingId;
}

describe('RetailSystem market realism', () => {
  it('registers runtime retail stores with zero stock by default', () => {
    const world = initializeWorld();
    const retailId = registerRetailStore(world, appendRetailBuilding(world));
    const foodIdx = retailId * GOODS_COUNT + GoodsId.FOOD;

    expect(world.retail.inventories[foodIdx]).toBe(0);
  });

  it('only seeds startup inventory when an explicit bootstrap ratio is provided', () => {
    const world = initializeWorld();
    const retailId = registerRetailStore(world, appendRetailBuilding(world), {
      initialInventoryRatio: 0.25,
    });
    const foodIdx = retailId * GOODS_COUNT + GoodsId.FOOD;

    expect(world.retail.inventories[foodIdx]).toBeCloseTo(
      world.retail.inventoryCapacities[foodIdx] * 0.25,
    );
  });

  it('anchors automatic retail pricing to purchase cost before base price', () => {
    const world = initializeWorld();
    const retailId = 0;
    const goodsId = GoodsId.FOOD;
    const idx = retailId * GOODS_COUNT + goodsId;

    world.retail.inventoryCapacities[idx] = 10;
    world.retail.inventories[idx] = 1;
    world.retail.markups[idx] = 0.3;
    world.retail.purchaseCosts[idx] = 250;
    world.goods.prices[goodsId] = 90;

    world.tick = RETAIL_PRICE_ADJUST_INTERVAL;
    updateRetailSystem(world);

    expect(world.retail.retailPrices[idx]).toBeCloseTo(
      world.retail.purchaseCosts[idx] * (1 + world.retail.markups[idx]),
      5,
    );
  });

  it('falls back to live market price when purchase cost is unavailable', () => {
    const world = initializeWorld();
    const retailId = 0;
    const goodsId = GoodsId.FOOD;
    const idx = retailId * GOODS_COUNT + goodsId;

    world.retail.inventoryCapacities[idx] = 10;
    world.retail.inventories[idx] = 1;
    world.retail.markups[idx] = 0.25;
    world.retail.purchaseCosts[idx] = 0;
    world.goods.prices[goodsId] = 88;

    world.tick = RETAIL_PRICE_ADJUST_INTERVAL;
    updateRetailSystem(world);

    expect(world.retail.retailPrices[idx]).toBeCloseTo(
      world.goods.prices[goodsId] * (1 + world.retail.markups[idx]),
      5,
    );
  });
});
