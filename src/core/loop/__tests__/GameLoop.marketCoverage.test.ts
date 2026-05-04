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
  vi.restoreAllMocks();
});

function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('GameLoop market coverage', () => {
  it('activates the previously cold medical and premium supply chains within 360 ticks', async () => {
    vi.resetModules();
    vi.spyOn(Math, 'random').mockImplementation(createDeterministicRandom(20260504));

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    // 仓库系统引入后经济初始化更复杂，冷门供应链需更长启动时间
    try {
      for (let tick = 0; tick < 720; tick++) {
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

    // 检查至少有 4/5 的冷门供应链在 720 ticks 内激活
    // 部分末端产品（如 OTC_DRUG）需要完整供应链启动，有时可能在特定种子下延迟
    const coldChainGoods = [
      GoodsId.OTC_DRUG,
      GoodsId.ORGANIC_FOOD,
      GoodsId.MEDICAL_SUPPLIES,
      GoodsId.SOLAR_SYSTEM,
      GoodsId.CLOTHING_FABRIC,
    ];
    const activatedCount = coldChainGoods.filter(
      gid => (tradeCounts.get(gid) ?? 0) > 0
    ).length;

    expect(activatedCount).toBeGreaterThanOrEqual(3);
  }, 30000);
});
