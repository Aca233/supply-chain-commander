import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRetailConfig } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

import { GOODS_COUNT } from '../../constants';
import { initializeWorld } from '../../world/WorldInitializer';
import { getRetailStoreDetails, updateRetailSystem } from '../RetailSystem';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
});

describe('RetailSystem day-based cadence', () => {
  it('keeps current-day counters visible after a retail sales tick', () => {
    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    const goodsId = getRetailConfig(retailBuildingType)!.allowedGoodsIds[0];
    const salesIdx = retailId * GOODS_COUNT + goodsId;

    world.goods.demands[goodsId] = 200;
    world.retail.inventoryCapacities[salesIdx] = 500;
    world.retail.inventories[salesIdx] = 500;
    world.retail.retailPrices[salesIdx] = 10;
    world.retail.purchaseCosts[salesIdx] = 6;
    // 显式设置更高 markup，保证测试里的 dailyProfit 明显为正
    world.retail.markups[salesIdx] = 0.6;
    world.buildings.isActive[world.retail.buildingIds[retailId]] = 1;
    world.households.cash[0] = 1_000_000;

    let result = updateRetailSystem(world);
    let details = getRetailStoreDetails(world, retailId)!;
    // 等到玩家这家店真正卖出为止（dailySales[玩家FOOD] > 0）
    for (let tick = 2; tick <= 24 && world.retail.dailySales[salesIdx] === 0; tick++) {
      world.tick = tick;
      result = updateRetailSystem(world);
      details = getRetailStoreDetails(world, retailId)!;
    }

    expect(result.totalRevenue).toBeGreaterThan(0);
    expect(world.retail.dailySales[salesIdx]).toBeGreaterThan(0);
    // 现在 world 内含 AI 零售店；玩家这家店的收入应 > 0 但不再等于全局 totalRevenue
    expect(details.dailyRevenue).toBeGreaterThan(0);
    expect(details.dailyRevenue).toBeLessThanOrEqual(result.totalRevenue + 0.001);
    expect(details.dailyProfit).toBeGreaterThan(0);
  });

  it('adjusts retail prices on each simulated day tick', () => {
    const world = initializeWorld();
    const retailId = 0;
    const priceIdx = retailId * GOODS_COUNT + GoodsId.FOOD;
    // 显式给一个固定 markup，稳定触发降价分支
    world.retail.markups[priceIdx] = 0.2;
    const startingMarkup = world.retail.markups[priceIdx];

    world.retail.inventoryCapacities[priceIdx] = 100;
    world.retail.inventories[priceIdx] = 100;
    world.retail.dailySales[priceIdx] = 0;
    world.goods.demands[GoodsId.FOOD] = 0;
    world.households.cash[0] = 0;

    world.tick = 1;
    const result = updateRetailSystem(world);

    expect(result.priceAdjustments).toBeGreaterThan(0);
    expect(world.retail.markups[priceIdx]).toBeLessThan(startingMarkup);
  });
});
