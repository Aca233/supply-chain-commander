import { beforeEach, describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { getOrderBookIndex } from '@/core/market/OrderBookIndex';
import { createBuyOrder, resetOrderPool } from '@/core/market/OrderBook';

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
});
