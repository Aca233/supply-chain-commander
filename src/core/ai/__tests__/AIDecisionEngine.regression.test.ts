import { describe, expect, it } from 'vitest';

import { GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import { getOrderBookView, resetOrderPool } from '@/core/market/OrderBook';
import { getBuildingRecipeFromInstance, initProductionCache } from '@/core/production/ProductionEngine';
import { getBuildingProductionVariants, initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { getBaseMaterials } from '@/data/buildingMaterials';
import { ALL_GOODS, GoodsId } from '@/data/goods';
import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';

import { autoPostBuyOrders, autoPostSellOrders, executeDecision } from '../AIDecisionEngine';
import { addBuilding } from '../../world/WorldInitializer';

describe('AIDecisionEngine regressions', () => {
  it('allows mildly negative-cash AI to post self-rescue sell orders', () => {
    resetOrderPool();

    const world = createGameWorld();
    const companyId = 1;
    const goodsId = GoodsId.FOOD;

    world.companies.count = 2;
    world.companies.isAI[companyId] = true;
    world.companies.cash[companyId] = -5_000;
    world.companies.inventories[companyId * GOODS_COUNT + goodsId] = 200;
    world.goods.prices[goodsId] = 18;

    const created = autoPostSellOrders(world);
    const sellOrders = getOrderBookView(world, goodsId).sellOrders.filter(order => order.companyId === companyId);

    expect(created).toBeGreaterThan(0);
    expect(sellOrders.length).toBeGreaterThan(0);
    expect(sellOrders[0].remaining).toBeGreaterThanOrEqual(50);
    expect(sellOrders[0].price).toBeLessThanOrEqual(world.goods.prices[goodsId]);
    expect(sellOrders[0].price).toBeGreaterThanOrEqual(ALL_GOODS[goodsId].basePrice * 0.5);
  });

  it('lets producer sell orders scale with available inventory instead of a fixed per-order cap', () => {
    resetOrderPool();
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createGameWorld();
    const basePrice = ALL_GOODS[GoodsId.STEEL].basePrice;
    const companyId = 1;
    const goodsId = GoodsId.STEEL;
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    world.companies.isAI[companyId] = true;
    world.companies.cash[companyId] = 5_000_000;
    world.goods.prices[goodsId] = basePrice;
    world.goods.baseValues[goodsId] = basePrice;

    addBuilding(world, companyId, BuildingId.STEEL_MILL);

    const inventoryIdx = companyId * GOODS_COUNT + goodsId;
    world.companies.inventories[inventoryIdx] = 2_500_000;

    const created = autoPostSellOrders(world);
    const sellOrders = getOrderBookView(world, goodsId).sellOrders.filter(order => order.companyId === companyId);

    expect(created).toBeGreaterThan(0);
    expect(sellOrders.length).toBeGreaterThan(0);
    expect(sellOrders[0].remaining).toBeGreaterThan(100_000);
  });

  it('does not keep buying steel when a parts factory already has a full steel buffer but is blocked by plastic', () => {
    resetOrderPool();
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createGameWorld();
    const companyId = 1;
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    world.companies.isAI[companyId] = true;
    world.companies.cash[companyId] = 10_000_000;
    world.goods.prices[GoodsId.STEEL] = ALL_GOODS[GoodsId.STEEL].basePrice;
    world.goods.baseValues[GoodsId.STEEL] = ALL_GOODS[GoodsId.STEEL].basePrice;
    world.goods.prices[GoodsId.PLASTIC] = ALL_GOODS[GoodsId.PLASTIC].basePrice;
    world.goods.baseValues[GoodsId.PLASTIC] = ALL_GOODS[GoodsId.PLASTIC].basePrice;
    world.goods.supplies[GoodsId.STEEL] = 10_000;
    world.goods.supplies[GoodsId.PLASTIC] = 10_000;

    const partsVariant = getBuildingProductionVariants(BuildingId.PARTS_FACTORY)
      .find(variant => variant.recipe.inputs.some(input => input.goodsId === GoodsId.PLASTIC));
    expect(partsVariant).toBeDefined();

    const buildingId = addBuilding(world, companyId, BuildingId.PARTS_FACTORY, {
      slotMethods: partsVariant!.slotMethods,
    });
    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const steelInputIndex = recipe.inputs.findIndex(input => input.goodsId === GoodsId.STEEL);
    const plasticInputIndex = recipe.inputs.findIndex(input => input.goodsId === GoodsId.PLASTIC);
    expect(steelInputIndex).toBeGreaterThanOrEqual(0);
    expect(plasticInputIndex).toBeGreaterThanOrEqual(0);

    const inputOffset = buildingId * 8;
    world.buildings.inputBuffers[inputOffset + steelInputIndex] = recipe.inputs[steelInputIndex].amount * 7;
    world.buildings.inputBuffers[inputOffset + plasticInputIndex] = 0;

    const created = autoPostBuyOrders(world);
    const steelBuyOrders = getOrderBookView(world, GoodsId.STEEL).buyOrders
      .filter(order => order.companyId === companyId);
    const plasticBuyOrders = getOrderBookView(world, GoodsId.PLASTIC).buyOrders
      .filter(order => order.companyId === companyId);

    expect(created).toBeGreaterThan(0);
    expect(steelBuyOrders).toHaveLength(0);
    expect(plasticBuyOrders.length).toBeGreaterThan(0);
  });

  it('lets electricity buy orders scale with industrial daily demand', () => {
    resetOrderPool();
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createGameWorld();
    const companyId = 1;
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    world.companies.isAI[companyId] = true;
    world.companies.cash[companyId] = 10_000_000;
    world.goods.prices[GoodsId.ELECTRICITY] = ALL_GOODS[GoodsId.ELECTRICITY].basePrice;
    world.goods.baseValues[GoodsId.ELECTRICITY] = ALL_GOODS[GoodsId.ELECTRICITY].basePrice;
    world.goods.supplies[GoodsId.ELECTRICITY] = 100_000;

    const buildingId = addBuilding(world, companyId, BuildingId.STEEL_MILL);
    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const electricityInput = recipe.inputs.find(input => input.goodsId === GoodsId.ELECTRICITY);
    expect(electricityInput).toBeDefined();

    const created = autoPostBuyOrders(world);
    const electricityBuyOrders = getOrderBookView(world, GoodsId.ELECTRICITY).buyOrders
      .filter(order => order.companyId === companyId);
    const expectedTenDayNeed = (electricityInput!.amount * TICKS_PER_DAY / recipe.ticksRequired) * 10;

    expect(created).toBeGreaterThan(0);
    expect(electricityBuyOrders.length).toBeGreaterThan(0);
    expect(electricityBuyOrders[0].remaining).toBeCloseTo(expectedTenDayNeed);
  });

  it('lets non-energy input buy orders scale with industrial daily demand', () => {
    resetOrderPool();
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createGameWorld();
    const companyId = 1;
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    world.companies.isAI[companyId] = true;
    world.companies.cash[companyId] = 10_000_000;

    const buildingId = addBuilding(world, companyId, BuildingId.STEEL_MILL);
    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const materialInput = recipe.inputs.find(input => input.goodsId !== GoodsId.ELECTRICITY);
    expect(materialInput).toBeDefined();

    world.goods.prices[materialInput!.goodsId] = ALL_GOODS[materialInput!.goodsId].basePrice;
    world.goods.baseValues[materialInput!.goodsId] = ALL_GOODS[materialInput!.goodsId].basePrice;
    world.goods.supplies[materialInput!.goodsId] = 100_000;

    const created = autoPostBuyOrders(world);
    const materialBuyOrders = getOrderBookView(world, materialInput!.goodsId).buyOrders
      .filter(order => order.companyId === companyId);
    const expectedTenDayNeed = (materialInput!.amount * TICKS_PER_DAY / recipe.ticksRequired) * 10;

    expect(expectedTenDayNeed).toBeGreaterThan(500);
    expect(created).toBeGreaterThan(0);
    expect(materialBuyOrders.length).toBeGreaterThan(0);
    expect(materialBuyOrders[0].remaining).toBeCloseTo(expectedTenDayNeed);
  });

  it('does not subtract building valuation again when AI completes a material-backed build', () => {
    resetOrderPool();
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createGameWorld();
    const companyId = 1;
    const building = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    world.companies.isAI[companyId] = true;
    world.companies.cash[companyId] = building.buildCost + 1_000;

    for (const mat of getBaseMaterials(BuildingId.IRON_MINE)) {
      world.companies.inventories[companyId * GOODS_COUNT + mat.goodsId] = mat.amount;
    }

    const cashBefore = world.companies.cash[companyId];
    const success = executeDecision(world, {
      type: 'investment',
      companyId,
      action: 'build',
      params: {
        buildingTypeId: BuildingId.IRON_MINE,
        cost: building.buildCost,
      },
      priority: 1,
      expectedProfit: 0,
      confidence: 1,
    });

    let frozenBuyOrderCash = 0;
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i] && world.orders.companyIds[i] === companyId && world.orders.types[i] === 0) {
        frozenBuyOrderCash += world.orders.remainings[i] * world.orders.prices[i];
      }
    }
    const cashSpent = cashBefore - world.companies.cash[companyId];

    expect(success).toBe(true);
    expect(cashSpent).toBeCloseTo(frozenBuyOrderCash, 2);
    expect(cashSpent).toBeLessThan(building.buildCost);
    expect(world.buildings.count).toBe(1);
    expect(world.buildings.owners[0]).toBe(companyId);
  });
});
