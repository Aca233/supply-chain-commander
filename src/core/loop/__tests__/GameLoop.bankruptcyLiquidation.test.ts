import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let consoleLogSpy: { mockClear: () => void };
let consoleWarnSpy: { mockClear: () => void };
let consoleErrorSpy: { mockClear: () => void };

beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
  vi.restoreAllMocks();
});

describe('GameLoop bankruptcy liquidation', () => {
  it('freezes bankrupt AI companies instead of auto-selling their assets to the player or another AI', async () => {
    vi.resetModules();

    const { createGameWorld } = await import('../../world/GameWorld');
    const { addBuilding } = await import('../../world/WorldInitializer');
    const { BuildingId } = await import('@/data/buildings');
    const { createGameLoop } = await import('../GameLoop');
    const { bankruptcyResolution, resetBankruptcyResolution } = await import('../../finance/BankruptcyResolution');

    resetBankruptcyResolution();

    const world = createGameWorld();
    world.companies.count = 3;
    world.companies.names[0] = '玩家公司';
    world.companies.names[1] = '破产AI';
    world.companies.names[2] = '健康AI';
    world.companies.isAI[0] = false;
    world.companies.isAI[1] = true;
    world.companies.isAI[2] = true;
    world.companies.cash[0] = 1_000_000;
    world.companies.cash[1] = -50_000;
    world.companies.cash[2] = 2_000_000;
    world.companies.totalLiabilities[1] = 900_000;

    const bankruptBuildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    const loop = createGameLoop(world);

    try {
      (loop as unknown as { handleBankruptcy(companyId: number): void }).handleBankruptcy(1);
    } finally {
      loop.destroy();
    }

    const [event] = bankruptcyResolution.getCompanyEvents(1);
    expect(event.status).toBe('bankruptcy_frozen');
    expect(world.buildings.owners[bankruptBuildingId]).toBe(1);
    expect(world.buildings.isActive[bankruptBuildingId]).toBe(0);
    expect(world.companies.cash[0]).toBe(1_000_000);
    expect(world.companies.cash[2]).toBe(2_000_000);
  });

  it('does not create duplicate active bankruptcy events for the same company', async () => {
    vi.resetModules();

    const { createGameWorld } = await import('../../world/GameWorld');
    const { createGameLoop } = await import('../GameLoop');
    const { bankruptcyResolution, resetBankruptcyResolution } = await import('../../finance/BankruptcyResolution');

    resetBankruptcyResolution();

    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '破产AI';
    world.companies.isAI[1] = true;
    world.companies.cash[1] = -20_000;
    world.companies.totalLiabilities[1] = 500_000;
    const loop = createGameLoop(world);

    try {
      const privateLoop = loop as unknown as { handleBankruptcy(companyId: number): void };
      privateLoop.handleBankruptcy(1);
      privateLoop.handleBankruptcy(1);
    } finally {
      loop.destroy();
    }

    expect(bankruptcyResolution.getCompanyEvents(1)).toHaveLength(1);
  });

  it('ignores inactive bankruptcy-frozen buildings in monthly cash insolvency checks', async () => {
    vi.resetModules();

    const { createGameWorld } = await import('../../world/GameWorld');
    const { addBuilding } = await import('../../world/WorldInitializer');
    const { BuildingId } = await import('@/data/buildings');
    const { createGameLoop } = await import('../GameLoop');
    const { bankruptcyResolution, resetBankruptcyResolution } = await import('../../finance/BankruptcyResolution');

    resetBankruptcyResolution();

    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '重组AI';
    world.companies.isAI[1] = true;
    world.companies.cash[1] = 9_000;
    world.companies.totalAssets[1] = 9_000;
    world.companies.totalLiabilities[1] = 0;

    for (let i = 0; i < 20; i++) {
      const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
      world.buildings.isActive[buildingId] = 0;
    }

    const loop = createGameLoop(world);

    try {
      (loop as unknown as { checkAIBankruptcy(): void }).checkAIBankruptcy();
    } finally {
      loop.destroy();
    }

    expect(bankruptcyResolution.getCompanyEvents(1)).toHaveLength(0);
  });

  it('uses live assets instead of stale company totals when checking balance-sheet insolvency', async () => {
    vi.resetModules();

    const { createGameWorld } = await import('../../world/GameWorld');
    const { createGameLoop } = await import('../GameLoop');
    const { bankruptcyResolution, resetBankruptcyResolution } = await import('../../finance/BankruptcyResolution');

    resetBankruptcyResolution();

    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '账面失真AI';
    world.companies.isAI[1] = true;
    world.companies.cash[1] = -1_000;
    world.companies.totalAssets[1] = 5_000_000;
    world.companies.totalLiabilities[1] = 200_000;

    const loop = createGameLoop(world);

    try {
      (loop as unknown as { checkAIBankruptcy(): void }).checkAIBankruptcy();
    } finally {
      loop.destroy();
    }

    expect(bankruptcyResolution.getCompanyEvents(1)).toHaveLength(1);
  });

  it('prevents duplicate events when openEvent is called repeatedly for the same company', async () => {
    vi.resetModules();

    const { createGameWorld } = await import('../../world/GameWorld');
    const { bankruptcyResolution, resetBankruptcyResolution } = await import('../../finance/BankruptcyResolution');

    resetBankruptcyResolution();

    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '破产AI';
    world.companies.cash[1] = -100_000;
    world.companies.totalLiabilities[1] = 700_000;

    bankruptcyResolution.openEvent(world, 1, 'insolvent', world.tick);
    const snapshotBeforeSecondOpen = bankruptcyResolution.getSnapshot();
    const secondResult = bankruptcyResolution.openEvent(world, 1, 'insolvent', world.tick + 1);
    const events = bankruptcyResolution.getCompanyEvents(1);
    const snapshotAfterSecondOpen = bankruptcyResolution.getSnapshot();

    expect(events).toHaveLength(1);
    expect(secondResult.id).toBe(events[0].id);
    expect(snapshotAfterSecondOpen.assets.length).toBe(snapshotBeforeSecondOpen.assets.length);
  });

  it('keeps console spies active for each test run', () => {
    expect(vi.isMockFunction(console.log)).toBe(true);
    expect(vi.isMockFunction(console.warn)).toBe(true);
    expect(vi.isMockFunction(console.error)).toBe(true);
  });

  it('gives players a longer bidding window when bankruptcy auctions open', async () => {
    vi.resetModules();

    const { TICKS_PER_DAY } = await import('@/core/constants');
    const { createGameWorld } = await import('../../world/GameWorld');
    const { addBuilding } = await import('../../world/WorldInitializer');
    const { BuildingId } = await import('@/data/buildings');
    const { createGameLoop } = await import('../GameLoop');
    const { bankruptcyResolution, resetBankruptcyResolution } = await import('../../finance/BankruptcyResolution');

    resetBankruptcyResolution();

    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '破产AI';
    world.companies.isAI[1] = true;
    addBuilding(world, 1, BuildingId.IRON_MINE, 0);

    const event = bankruptcyResolution.openEvent(world, 1, 'insolvent', world.tick);
    const loop = createGameLoop(world);

    try {
      loop.manualTick();
    } finally {
      loop.destroy();
    }

    const advancedEvent = bankruptcyResolution.getEvent(event.id);
    const assets = bankruptcyResolution.getEventAssets(event.id);

    expect(advancedEvent?.status).toBe('auction_open');
    for (const asset of assets) {
      expect(asset.state).toBe('open');
      expect(asset.auctionEndTick).toBe(world.tick + 30 * TICKS_PER_DAY);
    }
  });
});
