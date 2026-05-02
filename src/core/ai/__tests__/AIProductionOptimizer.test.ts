import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS, GoodsId } from '@/data/goods';

import {
  analyzeMarketCondition,
  clearOptimizationCache,
} from '../AIProductionOptimizer';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

function seedStableMarket(world: ReturnType<typeof createGameWorld>): void {
  world.goods.count = ALL_GOODS.length;

  for (const goods of ALL_GOODS) {
    world.goods.baseValues[goods.id] = goods.basePrice;
    world.goods.prices[goods.id] = goods.basePrice;
    world.goods.supplies[goods.id] = 100;
    world.goods.demands[goods.id] = 100;
  }
}

describe('AIProductionOptimizer market analysis', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    clearOptimizationCache();
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  it('calculates inventory days with the current ticks-per-day model', () => {
    const world = createGameWorld();
    seedStableMarket(world);

    world.goods.supplies[GoodsId.FOOD] = 10;
    world.goods.demands[GoodsId.FOOD] = 0.5;
    world.goods.prices[GoodsId.FOOD] = ALL_GOODS.find((goods) => goods.id === GoodsId.FOOD)!.basePrice;

    const market = analyzeMarketCondition(world, GoodsId.FOOD);

    expect(market.inventoryDays).toBeCloseTo(20, 5);
  });
});
