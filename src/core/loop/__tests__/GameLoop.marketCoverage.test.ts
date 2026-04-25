import { afterEach, describe, expect, it, vi } from 'vitest';

import { GoodsId } from '@/data/goods';

import { forEachRetainedTradeOldestFirst } from '@/core/market/TradeLedger';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
});

describe('GameLoop market coverage', () => {
  it('activates the previously cold medical and premium supply chains within 360 ticks', async () => {
    vi.resetModules();

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    try {
      for (let tick = 0; tick < 360; tick++) {
        loop.manualTick();
      }
    } finally {
      loop.destroy();
    }

    const tradeCounts = new Map<number, number>();
    forEachRetainedTradeOldestFirst(world, tradeIdx => {
      const goodsId = world.trades.goodsIds[tradeIdx];
      tradeCounts.set(goodsId, (tradeCounts.get(goodsId) ?? 0) + 1);
    });

    expect(tradeCounts.get(GoodsId.OTC_DRUG) ?? 0).toBeGreaterThan(0);
    expect(tradeCounts.get(GoodsId.ORGANIC_FOOD) ?? 0).toBeGreaterThan(0);
    expect(tradeCounts.get(GoodsId.MEDICAL_SUPPLIES) ?? 0).toBeGreaterThan(0);
    expect(tradeCounts.get(GoodsId.SOLAR_SYSTEM) ?? 0).toBeGreaterThan(0);
    expect(tradeCounts.get(GoodsId.CLOTHING_FABRIC) ?? 0).toBeGreaterThan(0);
  }, 15000);
});
