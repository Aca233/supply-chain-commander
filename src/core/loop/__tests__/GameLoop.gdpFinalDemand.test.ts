import { describe, expect, it, vi } from 'vitest';

interface GDPHarness {
  recentDirectMarketFinalDemand: Float64Array;
  recentRetailRevenue: Float64Array;
  recentServiceRevenue: Float64Array;
  updateGDP(): void;
  destroy(): void;
}

describe('GameLoop GDP final-demand accounting', () => {
  it('annualizes only final-demand buffers and ignores general trade turnover', async () => {
    vi.resetModules();

    const { TICKS_PER_YEAR } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    world.tick = 1;
    world.trades.count = 1;
    world.trades.quantities[0] = 999;
    world.trades.prices[0] = 777;
    world.trades.ticks[0] = 1;

    const loop = createGameLoop(world) as unknown as GDPHarness;

    try {
      loop.recentDirectMarketFinalDemand[0] = 120;
      loop.recentRetailRevenue[0] = 80;
      loop.recentServiceRevenue[0] = 40;

      loop.updateGDP();

      expect(world.economyStats.gdp).toBeCloseTo((120 + 80 + 40) * TICKS_PER_YEAR, 5);
    } finally {
      loop.destroy();
    }
  });

  it('keeps the rolling average based on final-demand window entries only', async () => {
    vi.resetModules();

    const { TICKS_PER_YEAR } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    world.tick = 2;

    const loop = createGameLoop(world) as unknown as GDPHarness;

    try {
      loop.recentDirectMarketFinalDemand[0] = 100;
      loop.recentRetailRevenue[0] = 50;
      loop.recentServiceRevenue[0] = 25;
      loop.recentDirectMarketFinalDemand[1] = 80;
      loop.recentRetailRevenue[1] = 40;
      loop.recentServiceRevenue[1] = 20;

      loop.updateGDP();

      expect(world.economyStats.gdp).toBeCloseTo(
        (((100 + 50 + 25) + (80 + 40 + 20)) / 2) * TICKS_PER_YEAR,
        5,
      );
    } finally {
      loop.destroy();
    }
  });
});
