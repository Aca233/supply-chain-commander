import { beforeEach, describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { getOrderBookIndex } from '@/core/market/OrderBookIndex';
import { createBuyOrder, createSellOrder, resetOrderPool } from '@/core/market/OrderBook';
import { setInventory } from '@/core/world/GameWorld';

describe('OrderBook reset', () => {
  beforeEach(() => {
    resetOrderPool();
    getOrderBookIndex().clearAll();
  });

  it('clears order book index entries when resetting the order pool', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 1_000_000;

    createBuyOrder(world, 0, 0, 10, 100);

    expect(getOrderBookIndex().getBuyOrderCount(0)).toBe(1);

    resetOrderPool();

    expect(getOrderBookIndex().getBuyOrderCount(0)).toBe(0);
    expect(getOrderBookIndex().getBestBuyOrder(0)).toBeNull();
  });

  it('uses day-model default expiries instead of legacy hourly durations', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.cash[0] = 1_000_000;
    setInventory(world, 1, 0, 10);

    createBuyOrder(world, 0, 0, 10, 100);
    createSellOrder(world, 1, 0, 10, 100);

    const [buyIdx, sellIdx] = [...getOrderBookIndex().getAllBuyOrders(0), ...getOrderBookIndex().getAllSellOrders(0)];

    expect(world.orders.expiries[buyIdx]).toBe(world.tick + 1);
    expect(world.orders.expiries[sellIdx]).toBe(world.tick + 2);
  });

  it('normalizes incoming order prices around current market instead of admitting extreme quotes', () => {
    const world = createGameWorld();
    world.goods.prices[0] = 100;
    world.goods.baseValues[0] = 100;
    world.companies.count = 2;
    world.companies.cash[0] = 1_000_000;
    setInventory(world, 1, 0, 10);

    createBuyOrder(world, 0, 0, 10, 250);
    createSellOrder(world, 1, 0, 10, 20);

    const buyIdx = getOrderBookIndex().getAllBuyOrders(0)[0];
    const sellIdx = getOrderBookIndex().getAllSellOrders(0)[0];

    expect(world.orders.prices[buyIdx]).toBe(150);
    expect(world.orders.prices[sellIdx]).toBe(50);
  });

  it('reserves cash using the normalized book price instead of the rejected extreme quote', () => {
    const world = createGameWorld();
    world.goods.prices[0] = 100;
    world.goods.baseValues[0] = 100;
    world.companies.count = 1;
    world.companies.cash[0] = 1_000;

    createBuyOrder(world, 0, 0, 2, 250);

    expect(world.companies.cash[0]).toBe(700);
  });

  it('does not merge far-away prices into stale orders when per-company order count is high', () => {
    const world = createGameWorld();
    world.goods.prices[0] = 100;
    world.goods.baseValues[0] = 100;
    world.companies.count = 1;
    world.companies.cash[0] = 1_000_000;

    for (let i = 0; i < 5; i++) {
      createBuyOrder(world, 0, 0, 1, 90 + i);
    }

    createBuyOrder(world, 0, 0, 1, 115);

    const prices = getOrderBookIndex().getAllBuyOrders(0)
      .map(orderIdx => world.orders.prices[orderIdx]);

    expect(prices).toContain(115);
  });
});
