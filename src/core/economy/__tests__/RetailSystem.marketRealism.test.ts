import { describe, expect, it } from 'vitest';

import { BuildingId, getRetailConfig } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

import { GOODS_COUNT, MAX_SLOTS, RETAIL_PRICE_ADJUST_INTERVAL } from '../../constants';
import { createSellOrder } from '../../market/OrderBook';
import { GameWorld } from '../../world/GameWorld';
import { initializeWorld } from '../../world/WorldInitializer';
import { getDemandPressure } from '../MarketStats';
import { registerRetailStore, updateRetailSystem } from '../RetailSystem';

function appendRetailBuilding(world: GameWorld, ownerId = 0): number {
  const buildingId = world.buildings.count++;
  world.buildings.types[buildingId] = BuildingId.CONVENIENCE_STORE;
  world.buildings.owners[buildingId] = ownerId;
  world.buildings.levels[buildingId] = 1;
  world.buildings.efficiencies[buildingId] = 1;
  world.buildings.isActive[buildingId] = 1;

  const slotOffset = buildingId * MAX_SLOTS;
  for (let i = 0; i < MAX_SLOTS; i++) {
    world.buildings.slotMethods[slotOffset + i] = 0;
  }

  return buildingId;
}

describe('RetailSystem market realism', () => {
  it('seeds allowed retail goods with a positive startup markup', () => {
    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    const retailConfig = getRetailConfig(retailBuildingType)!;

    for (const goodsId of retailConfig.allowedGoodsIds) {
      const idx = retailId * GOODS_COUNT + goodsId;

      expect(world.retail.markups[idx]).toBeGreaterThan(0);
      expect(world.retail.markups[idx]).toBeCloseTo(
        (retailConfig.markupRange[0] + retailConfig.markupRange[1]) / 2,
      );
    }
  });

  it('restores zeroed retail markup from the configured midpoint on the next price tick', () => {
    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    const retailConfig = getRetailConfig(retailBuildingType)!;
    const goodsId = retailConfig.allowedGoodsIds[0];
    const idx = retailId * GOODS_COUNT + goodsId;
    const expectedMarkup = (retailConfig.markupRange[0] + retailConfig.markupRange[1]) / 2;

    world.retail.markups[idx] = 0;
    world.retail.inventoryCapacities[idx] = 100;
    world.retail.inventories[idx] = 50;
    world.retail.dailySales[idx] = 5;
    world.goods.demands[goodsId] = 0;
    world.households.cash[0] = 0;
    world.tick = RETAIL_PRICE_ADJUST_INTERVAL;

    updateRetailSystem(world);

    expect(world.retail.markups[idx]).toBeCloseTo(expectedMarkup);
  });

  it('keeps automatic markdowns at or above the configured minimum markup', () => {
    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    const retailConfig = getRetailConfig(retailBuildingType)!;
    const goodsId = retailConfig.allowedGoodsIds[0];
    const idx = retailId * GOODS_COUNT + goodsId;
    const minimumMarkup = retailConfig.markupRange[0];

    world.retail.markups[idx] = minimumMarkup;
    world.retail.inventoryCapacities[idx] = 100;
    world.retail.inventories[idx] = 100;
    world.retail.dailySales[idx] = 0;
    world.goods.demands[goodsId] = 0;
    world.households.cash[0] = 0;
    world.tick = RETAIL_PRICE_ADJUST_INTERVAL;

    updateRetailSystem(world);

    expect(world.retail.markups[idx]).toBeCloseTo(minimumMarkup);
  });

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
    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    const goodsId = getRetailConfig(retailBuildingType)!.allowedGoodsIds[0];
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

  it('does not rewrite wholesale market price during direct retail restocking', () => {
    const world = initializeWorld();
    const retailId = 0;
    const ownerId = world.retail.owners[retailId];
    const sellerId = 1;
    const goodsId = GoodsId.FOOD;
    const idx = retailId * GOODS_COUNT + goodsId;
    const marketPrice = 100;

    // 让所有其他 AI 零售店此商品库存已满，避免它们抢卖单
    for (let r = 1; r < world.retail.count; r++) {
      const otherIdx = r * GOODS_COUNT + goodsId;
      world.retail.inventoryCapacities[otherIdx] = 500;
      world.retail.inventories[otherIdx] = 500; // 满库存 → 跳过补货
    }

    world.tick = 10;
    world.goods.prices[goodsId] = marketPrice;
    world.retail.inventoryCapacities[idx] = 500;
    world.retail.inventories[idx] = 0;
    world.buildings.isActive[world.retail.buildingIds[retailId]] = 1;
    world.companies.cash[ownerId] = 1_000_000;
    world.companies.inventories[ownerId * GOODS_COUNT + goodsId] = 0;
    world.companies.cash[sellerId] = 1_000_000;
    world.companies.inventories[sellerId * GOODS_COUNT + goodsId] = 1_000;
    world.companies.inventoryReserved[sellerId * GOODS_COUNT + goodsId] = 0;

    createSellOrder(world, sellerId, goodsId, 500, 80, 10);

    updateRetailSystem(world);

    expect(world.companies.inventories[ownerId * GOODS_COUNT + goodsId]).toBeGreaterThan(0);
    expect(world.retail.purchaseCosts[idx]).toBeGreaterThan(0);
    expect(world.goods.prices[goodsId]).toBe(marketPrice);
  });

  it('records retail sales as final consumption instead of new market supply', () => {
    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    const goodsId = getRetailConfig(retailBuildingType)!.allowedGoodsIds[0];
    const idx = retailId * GOODS_COUNT + goodsId;
    const startingSupply = 40;
    const startingDemand = 200;
    const startingInventory = 500;

    for (let otherRetailId = 0; otherRetailId < world.retail.count; otherRetailId++) {
      if (otherRetailId === retailId) continue;
      world.buildings.isActive[world.retail.buildingIds[otherRetailId]] = 0;
    }

    world.goods.supplies[goodsId] = startingSupply;
    world.goods.demands[goodsId] = startingDemand;
    world.retail.inventoryCapacities[idx] = 500;
    world.retail.inventories[idx] = startingInventory;
    world.retail.retailPrices[idx] = 10;
    world.retail.purchaseCosts[idx] = 6;
    world.buildings.isActive[world.retail.buildingIds[retailId]] = 1;
    world.households.cash[0] = 1_000_000;

    world.tick = 1;
    updateRetailSystem(world);

    const soldQuantity = startingInventory - world.retail.inventories[idx];
    expect(world.retail.inventories[idx]).toBeLessThan(startingInventory);
    expect(world.goods.supplies[goodsId]).toBeCloseTo(
      Math.max(0, startingSupply - soldQuantity),
      5,
    );
    expect(world.goods.demands[goodsId]).toBe(startingDemand);
    expect(getDemandPressure(world, goodsId)).toBeCloseTo(startingDemand - soldQuantity, 5);
  });

  it('does not consume retail inventory or record sales when households cannot pay', () => {
    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    const goodsId = getRetailConfig(retailBuildingType)!.allowedGoodsIds[0];
    const idx = retailId * GOODS_COUNT + goodsId;
    const startingInventory = 500;
    const startingCash = world.companies.cash[world.retail.owners[retailId]];

    world.goods.demands[goodsId] = 200;
    world.retail.inventoryCapacities[idx] = 500;
    world.retail.inventories[idx] = startingInventory;
    world.retail.retailPrices[idx] = 10;
    world.retail.purchaseCosts[idx] = 6;
    world.households.cash[0] = 0;
    world.tick = 1;

    const result = updateRetailSystem(world);

    expect(result.totalRevenue).toBe(0);
    expect(world.retail.inventories[idx]).toBe(startingInventory);
    expect(world.retail.dailySales[idx]).toBe(0);
    expect(world.retail.dailyRevenue[retailId]).toBe(0);
    expect(world.retail.dailyCost[retailId]).toBe(0);
    expect(world.companies.cash[world.retail.owners[retailId]]).toBe(startingCash);
  });

  it('does not route same-day demand to an extremely overpriced store when cheaper stock is available', () => {
    const world = initializeWorld();
    const goodsId = GoodsId.FOOD;

    for (let retailId = 0; retailId < world.retail.count; retailId++) {
      world.buildings.isActive[world.retail.buildingIds[retailId]] = 0;
    }

    const cheapRetailId = registerRetailStore(world, appendRetailBuilding(world));
    const expensiveRetailId = registerRetailStore(world, appendRetailBuilding(world, 1));
    const cheapIdx = cheapRetailId * GOODS_COUNT + goodsId;
    const expensiveIdx = expensiveRetailId * GOODS_COUNT + goodsId;

    world.buildings.isActive[world.retail.buildingIds[cheapRetailId]] = 1;
    world.buildings.isActive[world.retail.buildingIds[expensiveRetailId]] = 1;
    world.retail.inventoryCapacities[cheapIdx] = 1000;
    world.retail.inventoryCapacities[expensiveIdx] = 1000;
    world.retail.inventories[cheapIdx] = 1000;
    world.retail.inventories[expensiveIdx] = 1000;
    world.retail.retailPrices[cheapIdx] = 18;
    world.retail.retailPrices[expensiveIdx] = 60;
    world.retail.purchaseCosts[cheapIdx] = 12;
    world.retail.purchaseCosts[expensiveIdx] = 12;
    world.retail.reputation[cheapRetailId] = 50;
    world.retail.reputation[expensiveRetailId] = 50;

    world.goods.demands[goodsId] = 120;
    world.households.cash[0] = 1_000_000;
    world.tick = 100;

    updateRetailSystem(world);

    expect(world.retail.dailySales[cheapIdx]).toBeGreaterThan(0);
    expect(world.retail.dailySales[expensiveIdx]).toBe(0);
  });

  it('does not refill zero-sales retail stock close to full capacity', () => {
    const world = initializeWorld();
    const retailId = 0;
    const ownerId = world.retail.owners[retailId];
    const sellerId = 1;
    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    const goodsId = getRetailConfig(retailBuildingType)!.allowedGoodsIds[0];
    const idx = retailId * GOODS_COUNT + goodsId;

    for (let otherRetailId = 1; otherRetailId < world.retail.count; otherRetailId++) {
      world.buildings.isActive[world.retail.buildingIds[otherRetailId]] = 0;
    }

    world.tick = 10;
    world.households.cash[0] = 0;
    world.goods.demands[goodsId] = 0;
    world.retail.inventoryCapacities[idx] = 500;
    world.retail.inventories[idx] = 0;
    world.retail.dailySales[idx] = 0;
    world.buildings.isActive[world.retail.buildingIds[retailId]] = 1;
    world.companies.cash[ownerId] = 1_000_000;
    world.companies.inventories[ownerId * GOODS_COUNT + goodsId] = 0;
    world.companies.cash[sellerId] = 1_000_000;
    world.companies.inventories[sellerId * GOODS_COUNT + goodsId] = 1_000;
    world.companies.inventoryReserved[sellerId * GOODS_COUNT + goodsId] = 0;

    createSellOrder(world, sellerId, goodsId, 500, 80, 10);

    updateRetailSystem(world);

    const ownerInventory = world.companies.inventories[ownerId * GOODS_COUNT + goodsId];
    const totalRetailStock = ownerInventory + world.retail.inventories[idx];

    expect(totalRetailStock).toBeLessThanOrEqual(60);
  });
});
