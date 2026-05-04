import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MockAudio {
  preload = '';
  src = '';
  volume = 1;
  loop = false;
  currentTime = 0;
  oncanplaythrough: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url?: string) {
    if (url) {
      this.src = url;
    }
  }

  load(): void {
    queueMicrotask(() => {
      this.oncanplaythrough?.();
    });
  }

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}

  addEventListener(): void {}

  removeEventListener(): void {}
}

function createDocumentStub() {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createLocalStorageStub() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
  };
}

describe('gameStore save loading regressions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('document', createDocumentStub());
    vi.stubGlobal('localStorage', createLocalStorageStub());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hydrates the initial player building count during initGame', async () => {
    const { useGameStore } = await import('../gameStore');

    useGameStore.getState().initGame();

    expect(useGameStore.getState().playerBuildings).toBeGreaterThan(0);
  });

  it('restores persisted world state through loadGame', async () => {
    const { useGameStore } = await import('../gameStore');
    const { saveManager } = await import('@/core/save/SaveManager');

    useGameStore.getState().initGame();

    const world = useGameStore.getState().getWorld();
    expect(world).not.toBeNull();

    world!.companies.cash[0] = 432_100;
    const metadata = saveManager.save(world!, world!.tick, 0, 'load-regression');

    world!.companies.cash[0] = 1;

    expect(useGameStore.getState().loadGame(metadata.id)).toBe(true);
    expect(useGameStore.getState().playerCash).toBe(432_100);
  });

  it('updates a building labor wage multiplier through the store', async () => {
    const { useGameStore } = await import('../gameStore');

    const store = useGameStore.getState();
    store.initGame();
    const world = store.getWorld()!;
    const buildingId = 0;

    const updated = store.setBuildingLaborWageMultiplier(buildingId, 'basic', 1.35);
    const laborView = store.getBuildingLaborView(buildingId)!;

    expect(updated).toBe(true);
    expect(laborView.roles.basic.wageMultiplier).toBeCloseTo(1.35);
    expect(world.buildings.wageMultipliers[buildingId * 3]).toBeCloseTo(1.35);
  });

  it('does not charge the building asset value again when auto-buying construction materials', async () => {
    const { useGameStore } = await import('../gameStore');
    const { BuildingId, BUILDINGS_BY_ID } = await import('@/data/buildings');
    const { getBaseMaterials } = await import('@/data/buildingMaterials');
    const { GOODS_COUNT } = await import('@/core/constants');
    const { createOrdersSystem } = await import('@/core/world/GameWorld');
    const { resetOrderPool } = await import('@/core/market/OrderBook');

    const store = useGameStore.getState();
    store.initGame();
    const world = store.getWorld()!;
    const building = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const materials = getBaseMaterials(BuildingId.IRON_MINE);

    resetOrderPool();
    world.orders = createOrdersSystem();
    world.companies.cash[0] = 1_000_000_000;
    for (const material of materials) {
      const idx = material.goodsId;
      world.goods.prices[idx] = world.goods.prices[idx] || 100;
      world.companies.inventories[material.goodsId] = 0;
      world.companies.inventories[0 * GOODS_COUNT + material.goodsId] = 0;
      world.companies.inventoryReserved[0 * GOODS_COUNT + material.goodsId] = 0;
    }

    const cashBefore = world.companies.cash[0];
    const result = store.buildBuilding(BuildingId.IRON_MINE);

    expect(result).not.toBeNull();

    let frozenBuyOrderCash = 0;
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i] && world.orders.companyIds[i] === 0 && world.orders.types[i] === 0) {
        frozenBuyOrderCash += world.orders.remainings[i] * world.orders.prices[i];
      }
    }

    const cashSpent = cashBefore - world.companies.cash[0];
    expect(frozenBuyOrderCash).toBeGreaterThan(0);
    // 容差 1（允许 ±0.05），Float32Array 价格累积可能产生小偏差
    expect(cashSpent).toBeCloseTo(frozenBuyOrderCash, 1);
    expect(cashSpent).toBeLessThan(frozenBuyOrderCash + building.buildCost);
  });

  it('does not mint cash refunds for construction value that was not prepaid', async () => {
    const { useGameStore } = await import('../gameStore');
    const { BuildingId } = await import('@/data/buildings');
    const { getBaseMaterials } = await import('@/data/buildingMaterials');
    const { GOODS_COUNT } = await import('@/core/constants');
    const { ConstructionStatus } = await import('@/core/world/GameWorld');

    const store = useGameStore.getState();
    store.initGame();
    const world = store.getWorld()!;

    for (const material of getBaseMaterials(BuildingId.IRON_MINE)) {
      const idx = 0 * GOODS_COUNT + material.goodsId;
      world.companies.inventories[idx] = material.amount;
      world.companies.inventoryReserved[idx] = 0;
    }
    world.companies.cash[0] = 1_000_000_000;

    const cashBeforeBuild = world.companies.cash[0];
    const queueIdx = store.buildBuilding(BuildingId.IRON_MINE);
    expect(queueIdx).not.toBeNull();
    expect(world.companies.cash[0]).toBe(cashBeforeBuild);

    world.construction.statuses[queueIdx!] = ConstructionStatus.IN_PROGRESS;
    world.construction.progress[queueIdx!] = 0.5;

    const cashBeforeCancel = world.companies.cash[0];
    expect(store.cancelPlayerConstruction(queueIdx!)).toBe(true);
    expect(world.companies.cash[0]).toBe(cashBeforeCancel);
  });
});
