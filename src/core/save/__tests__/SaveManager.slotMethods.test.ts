import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_SLOTS } from '@/core/constants';
import { SaveManager } from '@/core/save/SaveManager';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  };
}

describe('SaveManager slotMethods round-trip', () => {
  it('preserves per-slot method IDs across serialize/deserialize', () => {
    const sourceWorld = createGameWorld();
    sourceWorld.companies.count = 1;

    const buildingId = addBuilding(sourceWorld, 0, BuildingId.IRON_MINE, 0);
    const base = buildingId * MAX_SLOTS;
    sourceWorld.buildings.slotMethods[base + 0] = 10001;
    sourceWorld.buildings.slotMethods[base + 1] = 10042;
    sourceWorld.buildings.slotMethods[base + 2] = 10003;

    const manager = new SaveManager();
    const serialized = manager.serializeWorld(sourceWorld, 100);

    expect(serialized.buildings.slotMethods).toHaveLength(
      sourceWorld.buildings.count * MAX_SLOTS,
    );
    expect(serialized.buildings.slotMethods[base + 0]).toBe(10001);
    expect(serialized.buildings.slotMethods[base + 1]).toBe(10042);
    expect(serialized.buildings.slotMethods[base + 2]).toBe(10003);

    const loadedWorld = createGameWorld();
    manager.deserializeWorld(serialized, loadedWorld);

    expect(loadedWorld.buildings.slotMethods[base + 0]).toBe(10001);
    expect(loadedWorld.buildings.slotMethods[base + 1]).toBe(10042);
    expect(loadedWorld.buildings.slotMethods[base + 2]).toBe(10003);
  });
});

describe('SaveManager version gate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects saves with unsupported version metadata', () => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const manager = new SaveManager();
    const world = createGameWorld();
    world.companies.count = 1;

    const legacyPayload = {
      metadata: {
        id: 'legacy',
        name: '旧版存档',
        timestamp: Date.now(),
        playTime: 0,
        realTime: 0,
        version: '1.0.0',
        playerCash: 1000,
        companiesCount: 1,
        buildingsCount: 0,
      },
      world: manager.serializeWorld(world, 0),
      settings: manager.loadSettings(),
    };

    localStorage.setItem('supply_chain_save_legacy', JSON.stringify(legacyPayload));

    const result = manager.load('legacy', world);
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('accepts saves with the current version', () => {
    vi.stubGlobal('localStorage', createMemoryStorage());

    const manager = new SaveManager();
    const sourceWorld = createGameWorld();
    sourceWorld.companies.count = 1;

    const metadata = manager.save(sourceWorld, 50, 0, 'test-version-gate');

    const targetWorld = createGameWorld();
    const result = manager.load(metadata.id, targetWorld);
    expect(result).not.toBeNull();
    expect(result?.metadata.version).toBe('3.0.0');
  });
});
