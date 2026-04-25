import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBuildingDefaultMethods,
  getProductionModifiersForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import {
  getBuildingProductionStatus,
  initProductionCache,
  setBuildingMethod,
} from '@/core/production/ProductionEngine';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('building-specific production methods', () => {
  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('maps building-specific all-output modifiers into generic production multipliers', () => {
    const modifiers = getProductionModifiersForBuilding(BuildingId.IRON_MINE, {
      mining_method: 10002,
      ore_processing: 10010,
      safety: 10020,
    });

    expect(modifiers.outputMultipliers.get(0)).toBeCloseTo(1.3, 5);
    expect(modifiers.laborMultiplier).toBeCloseTo(0.54, 5);
    expect(modifiers.energyMultiplier).toBeCloseTo(1.12, 5);
  });

  it('applies stored building-specific slot methods when production status is computed', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    const defaults = getBuildingDefaultMethods(BuildingId.IRON_MINE);

    expect(setBuildingMethod(world, buildingId, 0, 10002)).toBe(true);

    const modifiers = getBuildingProductionStatus(world, buildingId).productionModifiers;

    expect(modifiers).not.toBeNull();
    expect(modifiers!.outputMultipliers.get(0)).toBeCloseTo(1.3, 5);
    expect(modifiers!.laborMultiplier).toBeCloseTo(0.54, 5);
    expect(modifiers!.energyMultiplier).toBeCloseTo(1.12, 5);
    expect(defaults.ore_processing).toBe(10010);
    expect(defaults.safety).toBe(10020);
  });
});
