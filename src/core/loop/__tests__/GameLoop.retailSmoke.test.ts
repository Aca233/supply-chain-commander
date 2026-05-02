import { afterEach, describe, expect, it, vi } from 'vitest';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
});

describe('GameLoop retail smoke', () => {
  it('produces market trades and retail sales within 100 ticks', async () => {
    vi.resetModules();

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    let totalRetailSales = 0;
    let totalRetailRevenue = 0;
    let totalRetailCustomers = 0;
    let totalMatchedVolume = 0;
    let ticksWithTrades = 0;
    let ticksWithRetailSales = 0;

    try {
      for (let tick = 0; tick < 100; tick++) {
        const result = loop.manualTick();

        totalMatchedVolume += result.matching.matchedVolume;
        totalRetailSales += result.retailResult.totalSales;
        totalRetailRevenue += result.retailResult.totalRevenue;
        totalRetailCustomers += result.retailResult.totalCustomers;

        if (result.matching.trades.length > 0) {
          ticksWithTrades++;
        }

        if (result.retailResult.totalSales > 0) {
          ticksWithRetailSales++;
        }
      }
    } finally {
      loop.destroy();
    }

    expect(totalMatchedVolume).toBeGreaterThan(0);
    expect(ticksWithTrades).toBeGreaterThan(0);
    expect(totalRetailSales).toBeGreaterThan(0);
    expect(totalRetailRevenue).toBeGreaterThan(0);
    expect(totalRetailCustomers).toBeGreaterThan(0);
    expect(ticksWithRetailSales).toBeGreaterThan(0);
  });

  it('publishes per-tick retail sales and revenue into economy stats', async () => {
    vi.resetModules();

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    try {
      for (let tick = 0; tick < 100; tick++) {
        const result = loop.manualTick();
        if (result.retailResult.totalRevenue > 0) {
          expect(world.economyStats.retailRevenue).toBeCloseTo(result.retailResult.totalRevenue);
          expect(world.economyStats.retailSales).toBeCloseTo(result.retailResult.totalSales);
          return;
        }
      }
    } finally {
      loop.destroy();
    }

    throw new Error('Expected at least one retail sale within 100 ticks');
  });
});
