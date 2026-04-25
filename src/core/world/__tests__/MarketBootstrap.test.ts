import { beforeEach, describe, expect, it } from 'vitest';

import { ALL_BUILDINGS, getBuildingProduction } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';
import { GOODS_COUNT } from '@/core/constants';
import { getOrderBookView, resetOrderPool } from '@/core/market/OrderBook';

import {
  getBootstrapBuyerCompanyIds,
  seedInventoryBackedSellOrders,
} from '../MarketBootstrap';
import { createGameWorld, setInventory } from '../GameWorld';

describe('seedInventoryBackedSellOrders', () => {
  beforeEach(() => {
    resetOrderPool();
  });

  it('skips sellers that do not have enough real inventory', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;

    setInventory(world, 1, GoodsId.STEEL, 20);

    seedInventoryBackedSellOrders(world, GoodsId.STEEL, [1], () => 0.5);

    expect(world.orders.activeCount).toBe(0);
    expect(world.companies.inventories[1 * GOODS_COUNT + GoodsId.STEEL]).toBe(20);
  });

  it('creates sell orders only from already-held inventory', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;

    setInventory(world, 1, GoodsId.STEEL, 200);

    seedInventoryBackedSellOrders(world, GoodsId.STEEL, [1], () => 0.5);

    const book = getOrderBookView(world, GoodsId.STEEL);

    expect(book.sellOrders).toHaveLength(1);
    expect(book.sellOrders[0].remaining).toBe(110);
    expect(world.companies.inventories[1 * GOODS_COUNT + GoodsId.STEEL]).toBe(200);
  });

  it('finds bootstrap buyers only for AI companies that actually consume the goods', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    world.companies.isPlayer.push(true, false);
    world.companies.isAI.push(false, true);

    const consumerBuilding = ALL_BUILDINGS.find(building => {
      const production = getBuildingProduction(building.id, 0);
      return production && production.inputs.length > 0;
    });

    expect(consumerBuilding).toBeDefined();

    const production = getBuildingProduction(consumerBuilding!.id, 0)!;
    const requiredGoodsId = production.inputs[0].goodsId;
    const unrelatedGoodsId = ALL_GOODS.find(
      goods => !production.inputs.some(input => input.goodsId === goods.id)
    )!.id;

    world.buildings.count = 2;
    world.buildings.types[0] = consumerBuilding!.id;
    world.buildings.owners[0] = 0;
    world.buildings.outputModeIds[0] = 0;
    world.buildings.types[1] = consumerBuilding!.id;
    world.buildings.owners[1] = 1;
    world.buildings.outputModeIds[1] = 0;

    expect(getBootstrapBuyerCompanyIds(world, requiredGoodsId)).toEqual([1]);
    expect(getBootstrapBuyerCompanyIds(world, unrelatedGoodsId)).toEqual([]);
  });
});
