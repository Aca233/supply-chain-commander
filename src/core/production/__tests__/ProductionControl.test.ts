import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processConstructionAndDemolitionTick } from '@/core/construction/ConstructionTick';
import { getBuildingConstructionConfig } from '@/data/buildingMaterials';
import { createGameWorld } from '@/core/world/GameWorld';
import { ConstructionStatus } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

import {
  PRODUCTION_CONTROL_MODE_AUTO,
  PRODUCTION_CONTROL_MODE_MANUAL,
  applyAutomaticEfficiencySafely,
  canPlayerManageBuildingProduction,
  getBuildingManualEfficiencyTarget,
  getBuildingProductionControlMode,
  setBuildingManualEfficiencyTarget,
  setBuildingProductionControlMode,
} from '../ProductionControl';

const { hasControlRightMock } = vi.hoisted(() => ({
  hasControlRightMock: vi.fn(),
}));

vi.mock('@/core/finance/OwnershipControl', () => ({
  hasControlRight: hasControlRightMock,
}));

describe('ProductionControl', () => {
  beforeEach(() => {
    hasControlRightMock.mockReset();
  });

  it('newly added buildings start in auto mode with 1.0 manual target', () => {
    const world = createGameWorld();
    const buildingId = addBuilding(world, 0, BuildingId.IRON_MINE, 0);

    expect(getBuildingProductionControlMode(world, buildingId)).toBe(PRODUCTION_CONTROL_MODE_AUTO);
    expect(getBuildingManualEfficiencyTarget(world, buildingId)).toBe(1.0);
  });

  it('switching to manual clamps target and syncs live efficiency', () => {
    const world = createGameWorld();
    const buildingId = addBuilding(world, 0, BuildingId.IRON_MINE, 0);

    setBuildingManualEfficiencyTarget(world, buildingId, 5.0);
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_MANUAL);

    expect(getBuildingManualEfficiencyTarget(world, buildingId)).toBe(1.5);
    expect(world.buildings.efficiencies[buildingId]).toBe(1.5);

    setBuildingManualEfficiencyTarget(world, buildingId, 0.1);
    expect(getBuildingManualEfficiencyTarget(world, buildingId)).toBeCloseTo(0.3, 5);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(0.3, 5);
  });

  it('allows controlled-company management only with influence_strategy right', () => {
    const world = createGameWorld();
    const buildingId = addBuilding(world, 2, BuildingId.IRON_MINE, 0);

    hasControlRightMock.mockReturnValue(true);
    expect(canPlayerManageBuildingProduction(world, 0, buildingId)).toBe(true);

    hasControlRightMock.mockReturnValue(false);
    expect(canPlayerManageBuildingProduction(world, 0, buildingId)).toBe(false);
  });

  it('automatic efficiency helper refuses manual-mode buildings and allows auto-mode buildings', () => {
    const world = createGameWorld();
    const buildingId = addBuilding(world, 0, BuildingId.IRON_MINE, 0);

    setBuildingManualEfficiencyTarget(world, buildingId, 1.25);
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_MANUAL);
    const manualBefore = world.buildings.efficiencies[buildingId];

    expect(applyAutomaticEfficiencySafely(world, buildingId, 0.4)).toBe(false);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(manualBefore, 5);

    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_AUTO);
    expect(applyAutomaticEfficiencySafely(world, buildingId, 0.4)).toBe(true);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(0.4, 5);
  });

  it('construction completion initializes new building production-control defaults', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.tick = 500;

    const queueIdx = 0;
    const buildingTypeId = BuildingId.IRON_MINE;
    const buildTime = getBuildingConstructionConfig(buildingTypeId)?.buildTime ?? 24;

    world.construction.isActive[queueIdx] = 1;
    world.construction.companyIds[queueIdx] = 1;
    world.construction.buildingTypeIds[queueIdx] = buildingTypeId;
    world.construction.targetLevels[queueIdx] = 1;
    world.construction.existingBuildingIds[queueIdx] = -1;
    world.construction.statuses[queueIdx] = ConstructionStatus.IN_PROGRESS;
    world.construction.startTicks[queueIdx] = world.tick - buildTime;

    const result = processConstructionAndDemolitionTick(world);
    expect(result.newBuildings.length).toBe(1);

    const newBuildingId = result.newBuildings[0];
    expect(getBuildingProductionControlMode(world, newBuildingId)).toBe(PRODUCTION_CONTROL_MODE_AUTO);
    expect(getBuildingManualEfficiencyTarget(world, newBuildingId)).toBeCloseTo(1.0, 5);
  });
});
