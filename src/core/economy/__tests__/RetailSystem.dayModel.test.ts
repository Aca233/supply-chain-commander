import { afterEach, describe, expect, it, vi } from 'vitest';

import { GoodsId } from '@/data/goods';

import { GOODS_COUNT } from '../../constants';
import { initializeWorld } from '../../world/WorldInitializer';
import { updateRetailSystem } from '../RetailSystem';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
});

describe('RetailSystem day-based cadence', () => {
  it('resets daily counters after each simulated day tick', () => {
    const world = initializeWorld();
    const retailId = 0;
    const salesIdx = retailId * GOODS_COUNT + GoodsId.FOOD;

    world.retail.dailySales[salesIdx] = 25;
    world.retail.dailyRevenue[retailId] = 5000;
    world.retail.dailyCost[retailId] = 1200;
    world.retail.totalCustomers[retailId] = 42;

    world.tick = 1;
    updateRetailSystem(world);

    expect(world.retail.dailySales[salesIdx]).toBe(0);
    expect(world.retail.dailyRevenue[retailId]).toBe(0);
    expect(world.retail.dailyCost[retailId]).toBe(0);
    expect(world.retail.totalCustomers[retailId]).toBe(0);
  });

  it('adjusts retail prices on each simulated day tick', () => {
    const world = initializeWorld();
    const retailId = 0;
    const priceIdx = retailId * GOODS_COUNT + GoodsId.FOOD;
    const startingMarkup = world.retail.markups[priceIdx];

    world.retail.inventoryCapacities[priceIdx] = 100;
    world.retail.inventories[priceIdx] = 100;
    world.retail.dailySales[priceIdx] = 0;

    world.tick = 1;
    const result = updateRetailSystem(world);

    expect(result.priceAdjustments).toBeGreaterThan(0);
    expect(world.retail.markups[priceIdx]).toBeLessThan(startingMarkup);
  });
});
