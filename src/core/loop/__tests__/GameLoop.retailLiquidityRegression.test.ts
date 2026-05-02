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

function sumCash(values: Float64Array | Float32Array, start = 0): number {
  let total = 0;

  for (let i = start; i < values.length; i++) {
    total += values[i] ?? 0;
  }

  return total;
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

describe('GameLoop retail liquidity regression', () => {
  it('keeps household cash from hoarding while firms stay liquid through year 3', async () => {
    vi.resetModules();
    vi.spyOn(Math, 'random').mockImplementation(createDeterministicRandom(42));

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    try {
      for (let tick = 0; tick < 1080; tick++) {
        loop.manualTick();
      }
    } finally {
      loop.destroy();
    }

    const companyCash = sumCash(world.companies.cash, 0);
    const householdCash = world.households.cash[0];
    const negativeCashCompanies = countNegativeCash(world.companies.cash, 1);

    expect(companyCash).toBeGreaterThan(2_000_000_000);
    expect(householdCash).toBeLessThanOrEqual(companyCash * 2);
    expect(negativeCashCompanies).toBeLessThanOrEqual(20);
  }, 30000);
});
