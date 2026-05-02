import { describe, expect, it } from 'vitest';

import { MAX_SLOTS } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import { BuildingId } from '@/data/buildings';
import { SaveManager, SerializedWorld } from '../SaveManager';

describe('SaveManager day-model migration', () => {
  it('serializes new saves with explicit day-based metadata', () => {
    const manager = new SaveManager();
    const world = createGameWorld();
    world.companies.count = 1;

    const serialized = manager.serializeWorld(world, 42);

    expect(serialized.timeModel).toBe('day');
    expect(serialized.currentTick).toBe(42);
  });

  it('converts legacy hour ticks to day ticks when loading old saves', () => {
    const manager = new SaveManager();
    const world = createGameWorld();

    const legacyPayload = {
      goods: { count: 0, prices: [], supplies: [], demands: [] },
      buildings: {
        count: 1,
        types: [BuildingId.IRON_MINE],
        owners: [0],
        levels: [1],
        efficiencies: [1],
        slotMethods: new Array(MAX_SLOTS).fill(0),
        isActive: [1],
      },
      companies: {
        count: 1,
        cash: [1000],
        isAI: [false],
        inventories: [[]],
      },
      timeModel: 'hour' as const,
      currentTick: 72,
    } satisfies SerializedWorld;

    manager.deserializeWorld(legacyPayload, world);

    expect(world.tick).toBe(3);
  });
});
