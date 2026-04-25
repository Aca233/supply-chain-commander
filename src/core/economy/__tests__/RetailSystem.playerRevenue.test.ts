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

    const world = initializeWorld();
    const loop = createGameLoop(world);

    let observedRevenue = false;

    try {
      for (let tick = 0; tick < 96; tick++) {
        const result = loop.manualTick();

        if (result.retailResult.totalRevenue > 0) {
          observedRevenue = true;
          expect(result.retailResult.playerRevenue).toBeGreaterThan(0);
          expect(result.retailResult.playerRevenue).toBe(result.retailResult.totalRevenue);
        }
      }
    } finally {
      loop.destroy();
    }

    expect(observedRevenue).toBe(true);
  });
});
