import { describe, expect, it } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { getOrderBookView, resetOrderPool } from '@/core/market/OrderBook';
import { getBuildingRecipeFromInstance, initProductionCache } from '@/core/production/ProductionEngine';
import { getBuildingProductionVariants, initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS, GoodsId } from '@/data/goods';
import { BuildingId } from '@/data/buildings';

import { autoPostBuyOrders, autoPostSellOrders } from '../AIDecisionEngine';
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

  it('caps producer sell orders so one AI listing cannot dump millions of tons at once', () => {
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
    expect(sellOrders[0].remaining).toBeLessThanOrEqual(100_000);
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
});
