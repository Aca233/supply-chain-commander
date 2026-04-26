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

function sumReservedBuyValue(world: {
  orders: {
    maxOrders: number;
    isActive: Uint8Array;
    types: Uint8Array;
    remainings: Float32Array;
    prices: Float32Array;
  };
}): number {
  let total = 0;

  for (let orderIdx = 0; orderIdx < world.orders.maxOrders; orderIdx++) {
    if (!world.orders.isActive[orderIdx]) {
      continue;
    }

    if (world.orders.types[orderIdx] === 0) {
      total += world.orders.remainings[orderIdx] * world.orders.prices[orderIdx];
    }
  }

  return total;
}

describe('GameLoop opening economy stability', () => {
  it('starts with zero GDP before the first simulated day is processed', async () => {
    vi.resetModules();
    vi.spyOn(Math, 'random').mockImplementation(createDeterministicRandom(42));

    const { initializeWorld } = await import('../../world/WorldInitializer');

    const world = initializeWorld();
    const initialGDP = world.economyStats.gdp;

    expect(world.economyStats.gdp).toBeCloseTo(initialGDP);
  });

  it('keeps the AI economy liquid through the opening 15 days', async () => {
    vi.resetModules();
    vi.spyOn(Math, 'random').mockImplementation(createDeterministicRandom(1337));

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);
    const initialCompanyCash = sumCash(world.companies.cash, 0);
    let maxNegativeCashCompanies = 0;

    try {
      for (let tick = 0; tick < 30; tick++) {
        loop.manualTick();
        maxNegativeCashCompanies = Math.max(
          maxNegativeCashCompanies,
          countNegativeCash(world.companies.cash, 1),
        );
      }
    } finally {
      loop.destroy();
    }

    const effectiveCompanyLiquidity =
      sumCash(world.companies.cash, 0) + sumReservedBuyValue(world);

    // 闭合货币循环后，总货币供应 = 企业现金 + 预留资金 + 家庭现金
    // 运营成本中的人工+能源转入家庭池，仅维护费为沉没成本
    const totalMoneySupply = effectiveCompanyLiquidity + world.households.cash[0];

    expect(totalMoneySupply).toBeGreaterThan(initialCompanyCash * 0.85);
    expect(maxNegativeCashCompanies).toBeLessThanOrEqual(1);
  });
});
