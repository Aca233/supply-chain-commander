import { beforeEach, describe, expect, it } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { createBuyOrder, getOrderBookView, resetOrderPool } from '@/core/market/OrderBook';
import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
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
  world.companies.inventories[0 * GOODS_COUNT + GoodsId.GRAIN] = 500;

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
  });

  it('takes an attractive buy order when inventory exceeds one current-model production day', () => {
    const world = createFoodFactoryPlayerWorld();
    world.tick = 200;

    const buyOrderId = createBuyOrder(world, 1, GoodsId.GRAIN, 300, 20, 30);
    expect(buyOrderId).not.toBeNull();

    const result = executePlayerAutoTrade(world);
    const grainSellOrders = getOrderBookView(world, GoodsId.GRAIN).sellOrders.filter(
      (order) => order.companyId === 0 && order.price === 20,
    );

    expect(result.sellOrders).toBeGreaterThan(0);
    expect(grainSellOrders.some((order) => order.remaining === 300)).toBe(true);
  });
});
