import { afterEach, describe, expect, it, vi } from 'vitest';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
});

describe('RetailSystem player revenue tracking', () => {
  it('reports player retail revenue for each retail tick', async () => {
    vi.resetModules();

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../../loop/GameLoop');
    const { GOODS_COUNT } = await import('../../constants');
    const { GoodsId } = await import('../../../data/goods');

    const world = initializeWorld();
    // 玩家便利店初始未激活（关店开局），手动开店以验证收入路径
    world.buildings.isActive[world.retail.buildingIds[0]] = 1;
    const playerRetailOffset = 0 * GOODS_COUNT;
    world.retail.inventories[playerRetailOffset + GoodsId.FOOD] = 200;
    world.retail.retailPrices[playerRetailOffset + GoodsId.FOOD] = world.goods.prices[GoodsId.FOOD] * 1.2;
    world.retail.purchaseCosts[playerRetailOffset + GoodsId.FOOD] = world.goods.prices[GoodsId.FOOD];
    const loop = createGameLoop(world);

    let observedRevenue = false;

    try {
      for (let tick = 0; tick < 96; tick++) {
        const result = loop.manualTick();

        if (result.retailResult.totalRevenue > 0 && result.retailResult.playerRevenue > 0) {
          observedRevenue = true;
          // 现在世界含 AI 零售店：玩家收入是总收入的一部分
          expect(result.retailResult.playerRevenue).toBeGreaterThan(0);
          expect(result.retailResult.playerRevenue).toBeLessThanOrEqual(result.retailResult.totalRevenue + 0.001);
        }
      }
    } finally {
      loop.destroy();
    }

    expect(observedRevenue).toBe(true);
  });
});
