import { hasControlRight } from '@/core/finance/OwnershipControl';

import type { GameWorld } from '@/core/world/GameWorld';

export const PRODUCTION_CONTROL_MODE_AUTO = 0;
export const PRODUCTION_CONTROL_MODE_MANUAL = 1;

export type ProductionControlMode =
  | typeof PRODUCTION_CONTROL_MODE_AUTO
  | typeof PRODUCTION_CONTROL_MODE_MANUAL;

export const PRODUCTION_EFFICIENCY_MIN = 0.3;
export const PRODUCTION_EFFICIENCY_MAX = 1.5;
export const DEFAULT_MANUAL_EFFICIENCY_TARGET = 1.0;

type MutableBuildingsProductionControl = {
  productionControlModes?: Uint8Array;
  manualEfficiencyTargets?: Float32Array;
  count: number;
  maxCount: number;
  owners: Uint16Array;
  efficiencies: Float32Array;
};

function isValidProductionControlMode(mode: number): mode is ProductionControlMode {
  return mode === PRODUCTION_CONTROL_MODE_AUTO || mode === PRODUCTION_CONTROL_MODE_MANUAL;
}

function getMutableBuildings(world: GameWorld): MutableBuildingsProductionControl {
  return world.buildings as MutableBuildingsProductionControl;
}

function ensureCapacityArrayLength(length: number): number {
  return Number.isFinite(length) && length > 0 ? length : 0;
}

function ensureProductionControlStorage(buildings: MutableBuildingsProductionControl): void {
  const capacity = ensureCapacityArrayLength(buildings.maxCount);

  if (!buildings.productionControlModes || buildings.productionControlModes.length !== capacity) {
    const nextModes = new Uint8Array(capacity);
    if (buildings.productionControlModes) {
      nextModes.set(buildings.productionControlModes.subarray(0, Math.min(buildings.productionControlModes.length, capacity)));
    }
    buildings.productionControlModes = nextModes;
  }

  if (!buildings.manualEfficiencyTargets || buildings.manualEfficiencyTargets.length !== capacity) {
    const nextTargets = new Float32Array(capacity);
    nextTargets.fill(DEFAULT_MANUAL_EFFICIENCY_TARGET);
    if (buildings.manualEfficiencyTargets) {
      nextTargets.set(
        buildings.manualEfficiencyTargets.subarray(0, Math.min(buildings.manualEfficiencyTargets.length, capacity))
      );
    }
    buildings.manualEfficiencyTargets = nextTargets;
  }
}

export function clampManualEfficiencyTarget(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MANUAL_EFFICIENCY_TARGET;
  }
  return Math.max(PRODUCTION_EFFICIENCY_MIN, Math.min(PRODUCTION_EFFICIENCY_MAX, value));
}

export function hydrateProductionControlState(world: GameWorld): void {
  const buildings = getMutableBuildings(world);
  ensureProductionControlStorage(buildings);

  for (let i = 0; i < buildings.count; i++) {
    if (!isValidProductionControlMode(buildings.productionControlModes![i])) {
      buildings.productionControlModes![i] = PRODUCTION_CONTROL_MODE_AUTO;
    }

    const clampedTarget = clampManualEfficiencyTarget(buildings.manualEfficiencyTargets![i]);
    buildings.manualEfficiencyTargets![i] = clampedTarget;

    if (buildings.productionControlModes![i] === PRODUCTION_CONTROL_MODE_MANUAL) {
      buildings.efficiencies[i] = clampedTarget;
    }
  }
}

export function backfillManualTargetsFromCurrentEfficiency(world: GameWorld): void {
  const buildings = getMutableBuildings(world);
  ensureProductionControlStorage(buildings);

  for (let i = 0; i < buildings.count; i++) {
    if (!isValidProductionControlMode(buildings.productionControlModes![i])) {
      buildings.productionControlModes![i] = PRODUCTION_CONTROL_MODE_AUTO;
    }
    buildings.manualEfficiencyTargets![i] = clampManualEfficiencyTarget(buildings.efficiencies[i]);
  }
}

export function initializeBuildingProductionControl(world: GameWorld, buildingId: number): void {
  hydrateProductionControlState(world);
  const buildings = getMutableBuildings(world);

  if (buildingId < 0 || buildingId >= buildings.maxCount) {
    return;
  }

  buildings.productionControlModes![buildingId] = PRODUCTION_CONTROL_MODE_AUTO;
  buildings.manualEfficiencyTargets![buildingId] = DEFAULT_MANUAL_EFFICIENCY_TARGET;
}

export function getBuildingProductionControlMode(world: GameWorld, buildingId: number): ProductionControlMode {
  hydrateProductionControlState(world);
  const buildings = getMutableBuildings(world);
  if (buildingId < 0 || buildingId >= buildings.maxCount) {
    return PRODUCTION_CONTROL_MODE_AUTO;
  }

  const mode = buildings.productionControlModes![buildingId];
  return isValidProductionControlMode(mode) ? mode : PRODUCTION_CONTROL_MODE_AUTO;
}

export function setBuildingProductionControlMode(
  world: GameWorld,
  buildingId: number,
  mode: ProductionControlMode
): void {
  hydrateProductionControlState(world);
  const buildings = getMutableBuildings(world);
  if (buildingId < 0 || buildingId >= buildings.maxCount) {
    return;
  }

  buildings.productionControlModes![buildingId] = mode;
  if (mode === PRODUCTION_CONTROL_MODE_MANUAL) {
    buildings.efficiencies[buildingId] = clampManualEfficiencyTarget(buildings.manualEfficiencyTargets![buildingId]);
  }
}

export function getBuildingManualEfficiencyTarget(world: GameWorld, buildingId: number): number {
  hydrateProductionControlState(world);
  const buildings = getMutableBuildings(world);
  if (buildingId < 0 || buildingId >= buildings.maxCount) {
    return DEFAULT_MANUAL_EFFICIENCY_TARGET;
  }

  return clampManualEfficiencyTarget(buildings.manualEfficiencyTargets![buildingId]);
}

export function setBuildingManualEfficiencyTarget(world: GameWorld, buildingId: number, target: number): void {
  hydrateProductionControlState(world);
  const buildings = getMutableBuildings(world);
  if (buildingId < 0 || buildingId >= buildings.maxCount) {
    return;
  }

  const clampedTarget = clampManualEfficiencyTarget(target);
  buildings.manualEfficiencyTargets![buildingId] = clampedTarget;

  if (buildings.productionControlModes![buildingId] === PRODUCTION_CONTROL_MODE_MANUAL) {
    buildings.efficiencies[buildingId] = clampedTarget;
  }
}

export function canAutomaticSystemsAdjustEfficiency(world: GameWorld, buildingId: number): boolean {
  return getBuildingProductionControlMode(world, buildingId) === PRODUCTION_CONTROL_MODE_AUTO;
}

export function applyAutomaticEfficiencySafely(world: GameWorld, buildingId: number, targetEfficiency: number): boolean {
  if (!canAutomaticSystemsAdjustEfficiency(world, buildingId)) {
    return false;
  }

  if (buildingId < 0 || buildingId >= world.buildings.maxCount) {
    return false;
  }

  world.buildings.efficiencies[buildingId] = clampManualEfficiencyTarget(targetEfficiency);
  return true;
}

export function canPlayerManageBuildingProduction(
  world: GameWorld,
  playerCompanyId: number,
  buildingId: number
): boolean {
  if (buildingId < 0 || buildingId >= world.buildings.count) {
    return false;
  }

  const ownerCompanyId = world.buildings.owners[buildingId];
  if (ownerCompanyId === playerCompanyId) {
    return true;
  }

  return hasControlRight(playerCompanyId, ownerCompanyId, 'influence_strategy');
}
