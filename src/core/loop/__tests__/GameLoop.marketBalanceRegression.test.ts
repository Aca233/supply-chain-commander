import { afterEach, describe, expect, it, vi } from 'vitest';

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

function countNegativeCash(values: Float64Array | Float32Array, start = 0): number {
  let count = 0;

  for (let i = start; i < values.length; i++) {
    if ((values[i] ?? 0) < 0) {
      count++;
    }
  }

  return count;
}

describe('GameLoop long-run market balance', () => {
  it.each([1, 42, 1337])(
    'contains zero-supply and insolvency drift through 720 ticks (seed=%i)',
    async seed => {
      vi.resetModules();
      vi.spyOn(Math, 'random').mockImplementation(createDeterministicRandom(seed));

      const { getZeroSupplyGoodsReport } = await import('../../ai/AIDecisionEngine');
      const { initializeWorld } = await import('../../world/WorldInitializer');
      const { createGameLoop } = await import('../GameLoop');

      const world = initializeWorld();
      const loop = createGameLoop(world);

      let zeroSupplyAt360 = 0;
      let negativeCashAt360 = 0;

      try {
        for (let tick = 0; tick < 720; tick++) {
          loop.manualTick();

          if (tick === 359) {
            zeroSupplyAt360 = getZeroSupplyGoodsReport(world).length;
            negativeCashAt360 = countNegativeCash(world.companies.cash, 1);
          }
        }
      } finally {
        loop.destroy();
      }

      const zeroSupplyAt720 = getZeroSupplyGoodsReport(world).length;
      const negativeCashAt720 = countNegativeCash(world.companies.cash, 1);

      expect(zeroSupplyAt360).toBeLessThanOrEqual(38);
      expect(negativeCashAt360).toBeLessThanOrEqual(8);
      expect(zeroSupplyAt720).toBeLessThanOrEqual(48);
      expect(negativeCashAt720).toBeLessThanOrEqual(20);
    },
    30000,
  );
});
