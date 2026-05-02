import { describe, expect, it, vi } from 'vitest';

describe('GameLoop labor market order', () => {
  it('runs wage updates and building labor market before production', async () => {
    vi.resetModules();
    const calls: string[] = [];

    vi.doMock('../../labor/LaborSystem', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../labor/LaborSystem')>();

      return {
        ...actual,
        updateMarketWages: vi.fn(() => {
          calls.push('updateMarketWages');
        }),
        adjustAIWageMultipliers: vi.fn(() => {
          calls.push('adjustAIWageMultipliers');
        }),
        processBuildingLaborMarket: vi.fn(() => {
          calls.push('processBuildingLaborMarket');
        }),
        accrueDailyPayroll: vi.fn(() => 0),
        payMonthlyPayroll: vi.fn(() => []),
        addMonthlyLaborGrowth: vi.fn(),
      };
    });

    vi.doMock('../../production/ProductionEngine', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../production/ProductionEngine')>();

      return {
        ...actual,
        initRecipeCache: vi.fn(),
        autoFeedBuildings: vi.fn(() => {
          calls.push('autoFeedBuildings');
        }),
        updateAllProduction: vi.fn(() => {
          calls.push('updateAllProduction');
          return {
            processedCount: 0,
            producedCount: 0,
            blockedCount: 0,
          };
        }),
      };
    });

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    try {
      loop.manualTick();
    } finally {
      loop.destroy();
    }

    expect(calls).toContain('autoFeedBuildings');
    expect(calls).toContain('updateMarketWages');
    expect(calls).toContain('adjustAIWageMultipliers');
    expect(calls).toContain('processBuildingLaborMarket');
    expect(calls).toContain('updateAllProduction');

    expect(calls.indexOf('adjustAIWageMultipliers')).toBeLessThan(
      calls.indexOf('processBuildingLaborMarket'),
    );
    expect(calls.indexOf('processBuildingLaborMarket')).toBeLessThan(
      calls.indexOf('updateMarketWages'),
    );
    expect(calls.indexOf('updateMarketWages')).toBeLessThan(
      calls.indexOf('updateAllProduction'),
    );
  });
});
