import { describe, expect, it, vi } from 'vitest';

describe('GameLoop day-model cadence', () => {
  it('updates GDP after the first full simulated day instead of waiting for 24 hourly ticks', async () => {
    vi.resetModules();

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    try {
      expect(world.economyStats.gdp).toBe(0);
      loop.manualTick();
      expect(world.economyStats.gdp).toBeGreaterThan(0);
    } finally {
      loop.destroy();
    }
  });
});
