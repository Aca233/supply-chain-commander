import { beforeEach, describe, expect, it } from 'vitest';

import { AI_SELL_ORDER_EXPIRY, GOODS_COUNT } from '@/core/constants';
import { processRetailDelivery } from '@/core/economy/RetailSystem';
import { createBuyOrder, getOrderBookView, resetOrderPool } from '@/core/market/OrderBook';
import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding, initializeWorld } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';

import {
  executePlayerAutoTrade,
  PLAYER_AUTO_TRADE_DEFAULT_CONFIG,
  resetPlayerAutoTradeStats,
  setPlayerAutoTradeConfig,
} from '../PlayerAutoTrader';

function seedStableMarket(world: ReturnType<typeof createGameWorld>): void {
  world.goods.count = ALL_GOODS.length;

  for (const goods of ALL_GOODS) {
    world.goods.baseValues[goods.id] = goods.basePrice;
    world.goods.prices[goods.id] = goods.basePrice;
    world.goods.supplies[goods.id] = 100;
    world.goods.demands[goods.id] = 100;
  }
}

function createFoodFactoryPlayerWorld() {
  const world = createGameWorld();
  seedStableMarket(world);

  world.companies.count = 2;
  world.companies.cash[0] = 1_000_000;
  world.companies.cash[1] = 1_000_000;

  addBuilding(world, 0, BuildingId.FOOD_FACTORY, 0);
  world.companies.inventories[0 * GOODS_COUNT + GoodsId.GRAIN] = 5000;

  return world;
}

describe('PlayerAutoTrader day model', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    resetOrderPool();
    resetPlayerAutoTradeStats();
    setPlayerAutoTradeConfig({
      ...PLAYER_AUTO_TRADE_DEFAULT_CONFIG,
      tradeInterval: 0,
      autoBuy: {
        ...PLAYER_AUTO_TRADE_DEFAULT_CONFIG.autoBuy,
        enabled: false,
      },
      autoSell: {
        ...PLAYER_AUTO_TRADE_DEFAULT_CONFIG.autoSell,
        enabled: true,
      },
    });
  });

  it('posts a sell order for excess production inputs using the current day model', () => {
    const world = createFoodFactoryPlayerWorld();
    world.tick = 100;

    const result = executePlayerAutoTrade(world);
    const grainSellOrders = getOrderBookView(world, GoodsId.GRAIN).sellOrders.filter(
      (order) => order.companyId === 0,
    );

    expect(result.sellOrders).toBeGreaterThan(0);
    expect(grainSellOrders.length).toBeGreaterThan(0);
    expect(world.orders.expiries[grainSellOrders[0].idx]).toBe(world.tick + AI_SELL_ORDER_EXPIRY);
  });

  it('takes an attractive buy order when inventory exceeds one current-model production day', () => {
    const world = createFoodFactoryPlayerWorld();
    world.tick = 200;

    const buyOrderId = createBuyOrder(world, 1, GoodsId.GRAIN, 300, 20, 30);
    expect(buyOrderId).not.toBeNull();

    const result = executePlayerAutoTrade(world);
    const grainSellOrders = getOrderBookView(world, GoodsId.GRAIN).sellOrders.filter(
      (order) => order.companyId === 0,
    );
    const matchedSellOrder = grainSellOrders.find((order) => order.remaining === 300);

    expect(result.sellOrders).toBeGreaterThan(0);
    expect(matchedSellOrder).toBeDefined();
    expect(matchedSellOrder?.price).toBeLessThanOrEqual(ALL_GOODS[GoodsId.GRAIN].basePrice * 1.5);
    expect(world.orders.expiries[matchedSellOrder!.idx]).toBe(world.tick + AI_SELL_ORDER_EXPIRY);
  });

  it('keeps food inventory for owned retail delivery instead of auto-posting a sell order', () => {
    const world = initializeWorld();
    world.tick = 300;

    const retailId = 0;
    const goodsId = GoodsId.FOOD;
    const retailBuildingId = world.retail.buildingIds[retailId];
    const companyInvIdx = goodsId;
    const retailInvIdx = retailId * GOODS_COUNT + goodsId;

    expect(world.retail.owners[retailId]).toBe(0);

    world.buildings.isActive[retailBuildingId] = 1;
    world.retail.inventories[retailInvIdx] = 0;
    world.companies.inventories[companyInvIdx] = 20;
    world.companies.inventoryReserved[companyInvIdx] = 0;

    executePlayerAutoTrade(world);

    const playerFoodSellOrders = getOrderBookView(world, goodsId).sellOrders.filter(
      (order) => order.companyId === 0,
    );

    expect(playerFoodSellOrders).toHaveLength(0);

    processRetailDelivery(world);

    expect(world.retail.inventories[retailInvIdx]).toBe(20);
    expect(world.companies.inventories[companyInvIdx]).toBe(0);
  });

  it('does not take external buy orders with food inventory reserved for owned retail stores', () => {
    const world = initializeWorld();
    world.tick = 400;

    const retailId = 0;
    const goodsId = GoodsId.FOOD;
    const retailBuildingId = world.retail.buildingIds[retailId];
    const companyInvIdx = goodsId;
    const retailInvIdx = retailId * GOODS_COUNT + goodsId;

    expect(world.retail.owners[retailId]).toBe(0);

    world.buildings.isActive[retailBuildingId] = 1;
    world.retail.inventories[retailInvIdx] = 0;
    world.companies.inventories[companyInvIdx] = 20;
    world.companies.inventoryReserved[companyInvIdx] = 0;

    const buyOrderId = createBuyOrder(world, 1, goodsId, 20, 100, 30);
    expect(buyOrderId).not.toBeNull();

    executePlayerAutoTrade(world);

    const playerFoodSellOrders = getOrderBookView(world, goodsId).sellOrders.filter(
      (order) => order.companyId === 0,
    );

    expect(playerFoodSellOrders).toHaveLength(0);

    processRetailDelivery(world);

    expect(world.retail.inventories[retailInvIdx]).toBe(20);
    expect(world.companies.inventories[companyInvIdx]).toBe(0);
  });
});
