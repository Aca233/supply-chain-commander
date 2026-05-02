import { beforeEach, describe, expect, it } from 'vitest';

import { MAX_SLOTS } from '@/core/constants';
import {
  PRODUCTION_CONTROL_MODE_AUTO,
  PRODUCTION_CONTROL_MODE_MANUAL,
  getBuildingManualEfficiencyTarget,
  getBuildingProductionControlMode,
  setBuildingManualEfficiencyTarget,
  setBuildingProductionControlMode,
} from '@/core/production/ProductionControl';
import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { SaveManager, SerializedWorld } from '@/core/save/SaveManager';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

describe('SaveManager production-control persistence', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('round-trips production-control mode and manual target fields', () => {
    const sourceWorld = createGameWorld();
    sourceWorld.companies.count = 1;

    const buildingId = addBuilding(sourceWorld, 0, BuildingId.IRON_MINE, 0);
    setBuildingManualEfficiencyTarget(sourceWorld, buildingId, 1.35);
    setBuildingProductionControlMode(sourceWorld, buildingId, PRODUCTION_CONTROL_MODE_MANUAL);
    sourceWorld.buildings.efficiencies[buildingId] = 0.6;

    const manager = new SaveManager();
    const serialized = manager.serializeWorld(sourceWorld, 123);

    const loadedWorld = createGameWorld();
    manager.deserializeWorld(serialized, loadedWorld);

    expect(getBuildingProductionControlMode(loadedWorld, buildingId)).toBe(PRODUCTION_CONTROL_MODE_MANUAL);
    expect(getBuildingManualEfficiencyTarget(loadedWorld, buildingId)).toBeCloseTo(1.35, 5);
    expect(loadedWorld.buildings.efficiencies[buildingId]).toBeCloseTo(1.35, 5);
  });

  it('legacy payloads backfill manual targets from current efficiency and default to auto mode', () => {
    const manager = new SaveManager();
    const world = createGameWorld();

    const legacyPayload: SerializedWorld = {
      goods: {
        count: 0,
        prices: [],
        supplies: [],
        demands: [],
      },
      buildings: {
        count: 1,
        types: [BuildingId.IRON_MINE],
        owners: [0],
        levels: [1],
        efficiencies: [0.1],
        slotMethods: new Array(MAX_SLOTS).fill(0),
        isActive: [1],
      },
      companies: {
        count: 1,
        cash: [1000],
        isAI: [false],
        inventories: [[]],
      },
      currentTick: 777,
    };

    manager.deserializeWorld(legacyPayload, world);

    expect(getBuildingProductionControlMode(world, 0)).toBe(PRODUCTION_CONTROL_MODE_AUTO);
    expect(getBuildingManualEfficiencyTarget(world, 0)).toBeCloseTo(0.3, 5);
  });

  it('partial-legacy payload preserves manual live efficiency when backfilling missing manual targets', () => {
    const manager = new SaveManager();
    const world = createGameWorld();

    const partialLegacyPayload: SerializedWorld = {
      goods: {
        count: 0,
        prices: [],
        supplies: [],
        demands: [],
      },
      buildings: {
        count: 1,
        types: [BuildingId.IRON_MINE],
        owners: [0],
        levels: [1],
        efficiencies: [1.9],
        productionControlModes: [PRODUCTION_CONTROL_MODE_MANUAL],
        slotMethods: new Array(MAX_SLOTS).fill(0),
        isActive: [1],
      },
      companies: {
        count: 1,
        cash: [1000],
        isAI: [false],
        inventories: [[]],
      },
      currentTick: 888,
    };

    manager.deserializeWorld(partialLegacyPayload, world);

    expect(getBuildingProductionControlMode(world, 0)).toBe(PRODUCTION_CONTROL_MODE_MANUAL);
    expect(getBuildingManualEfficiencyTarget(world, 0)).toBeCloseTo(1.5, 5);
    expect(world.buildings.efficiencies[0]).toBeCloseTo(1.5, 5);
  });

  it('round-trips oversupply auto-suspension state', () => {
    const sourceWorld = createGameWorld();
    sourceWorld.companies.count = 1;

    const buildingId = addBuilding(sourceWorld, 0, BuildingId.IRON_MINE, 0);
    sourceWorld.buildings.isActive[buildingId] = 0;
    sourceWorld.buildings.oversupplySuspendedGoods[buildingId] = GoodsId.IRON_ORE;
    sourceWorld.buildings.oversupplySuspendedUntilTick[buildingId] = 321;

    const manager = new SaveManager();
    const serialized = manager.serializeWorld(sourceWorld, 123);

    const loadedWorld = createGameWorld();
    manager.deserializeWorld(serialized, loadedWorld);

    expect(loadedWorld.buildings.isActive[buildingId]).toBe(0);
    expect(loadedWorld.buildings.oversupplySuspendedGoods[buildingId]).toBe(GoodsId.IRON_ORE);
    expect(loadedWorld.buildings.oversupplySuspendedUntilTick[buildingId]).toBe(321);
  });
});
