import { afterEach, describe, expect, it, vi } from 'vitest';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  vi.restoreAllMocks();
});

describe('RetailSystem consumer cadence', () => {
  it('sells all in-stock consumer goods with same-day demand on the same tick', async () => {
    vi.resetModules();

    const { getRetailConfig } = await import('@/data/buildings');
    const { GoodsId } = await import('@/data/goods');
    const { GOODS_COUNT } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { updateRetailSystem } = await import('../RetailSystem');

    const world = initializeWorld();
    const goodsA = GoodsId.PROCESSED_FOOD;
    const goodsB = GoodsId.SMARTPHONE;

    const retailId = Array.from({ length: world.retail.count }, (_, id) => id).find(id => {
      const buildingType = world.buildings.types[world.retail.buildingIds[id]];
      const config = getRetailConfig(buildingType);
      return !!config
        && config.allowedGoodsIds.includes(goodsA)
        && config.allowedGoodsIds.includes(goodsB);
    });

    expect(retailId).toBeDefined();

    for (let id = 0; id < world.retail.count; id++) {
      world.buildings.isActive[world.retail.buildingIds[id]] = id === retailId ? 1 : 0;
    }

    const idxA = retailId! * GOODS_COUNT + goodsA;
    const idxB = retailId! * GOODS_COUNT + goodsB;
    world.retail.inventoryCapacities[idxA] = 500;
    world.retail.inventoryCapacities[idxB] = 500;
    world.retail.inventories[idxA] = 500;
    world.retail.inventories[idxB] = 100;
    world.retail.retailPrices[idxA] = 13;
    world.retail.retailPrices[idxB] = 1800;
    world.retail.purchaseCosts[idxA] = 10;
    world.retail.purchaseCosts[idxB] = 1500;
    world.retail.markups[idxA] = 0.3;
    world.retail.markups[idxB] = 0.2;

    world.goods.demands[goodsA] = 200;
    world.goods.demands[goodsB] = 20;
    world.households.cash[0] = 10_000_000;
    world.tick = 1;

    updateRetailSystem(world);

    expect(world.retail.dailySales[idxA]).toBeGreaterThan(0);
    expect(world.retail.dailySales[idxB]).toBeGreaterThan(0);
  });
});
