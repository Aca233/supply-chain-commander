import { beforeEach, describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';
import { createGameWorld, setInventory } from '../../world/GameWorld';
import { createBuyOrder, createSellOrder, resetOrderPool } from '../OrderBook';
import { resetOrderBookIndex } from '../OrderBookIndex';
import { matchAllOrders } from '../MatchingEngine';

describe('MatchingEngine price formation', () => {
  beforeEach(() => {
    resetOrderPool();
    resetOrderBookIndex();
  });

  it('fills a new sell order at the resting buy price', () => {
    const world = createGameWorld();
    world.goods.count = 80;
    world.goods.prices[GoodsId.FOOD] = 100;
    world.goods.baseValues[GoodsId.FOOD] = 100;
    world.companies.count = 2;
    world.companies.cash[0] = 10_000;
    world.companies.cash[1] = 10_000;
    setInventory(world, 1, GoodsId.FOOD, 10);

    createBuyOrder(world, 0, GoodsId.FOOD, 10, 120);
    world.tick = 10;
    createSellOrder(world, 1, GoodsId.FOOD, 10, 80);

    const result = matchAllOrders(world);

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].price).toBe(120);
    expect(result.matchedValue).toBe(1200);
  });

  it('fills a new buy order at the resting sell price', () => {
    const world = createGameWorld();
    world.goods.count = 80;
    world.goods.prices[GoodsId.FOOD] = 100;
    world.goods.baseValues[GoodsId.FOOD] = 100;
    world.companies.count = 2;
    world.companies.cash[0] = 10_000;
    world.companies.cash[1] = 10_000;
    setInventory(world, 1, GoodsId.FOOD, 10);

    createSellOrder(world, 1, GoodsId.FOOD, 10, 80);
    world.tick = 10;
    createBuyOrder(world, 0, GoodsId.FOOD, 10, 120);

    const result = matchAllOrders(world);

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].price).toBe(80);
    expect(result.matchedValue).toBe(800);
  });
});
