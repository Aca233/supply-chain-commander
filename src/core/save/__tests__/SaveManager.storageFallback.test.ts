import { afterEach, describe, expect, it, vi } from 'vitest';

import { LABOR_ROLE_COUNT, MAX_SLOTS } from '@/core/constants';
import {
  LABOR_ROLE_BASIC,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  getBuildingLaborIndex,
  getWorkforceDemandValue,
  scaleWorkforceDemand,
  type LaborRole,
} from '@/core/labor/LaborSystem';
import {
  getDefaultSlotMethods,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { SaveManager } from '@/core/save/SaveManager';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

type SerializedWorldWithLabor = ReturnType<SaveManager['serializeWorld']> & {
  labor?: {
    totalSupply?: number[];
    employed?: number[];
    unemployed?: number[];
    marketWages?: number[];
    monthlyGrowth?: number[];
    demandOpenings?: number[];
    lastPayrollTick?: number;
  };
  buildings: ReturnType<SaveManager['serializeWorld']>['buildings'] & {
    workforceHired?: number[];
    wageMultipliers?: number[];
    accruedPayroll?: number[];
  };
};

function createLegacyLaborPayload(
  overrides: Partial<SerializedWorldWithLabor> = {},
): SerializedWorldWithLabor {
  initializeBuildingProductionMethods();

  const slotMethods = new Array(MAX_SLOTS).fill(0);
  getDefaultSlotMethods(BuildingId.IRON_MINE).forEach((methodId, index) => {
    slotMethods[index] = methodId;
  });

  const base: SerializedWorldWithLabor = {
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
      efficiencies: [1],
      slotMethods,
      isActive: [1],
    },
    companies: {
      count: 1,
      cash: [1_000_000],
      isAI: [false],
      inventories: [[]],
    },
    currentTick: 30,
  };

  return {
    ...base,
    ...overrides,
    buildings: {
      ...base.buildings,
      ...overrides.buildings,
    },
    companies: {
      ...base.companies,
      ...overrides.companies,
    },
  };
}

function getIronMineActiveDemand() {
  initializeBuildingProductionMethods();
  const slotMethods = getDefaultSlotMethods(BuildingId.IRON_MINE);
  return scaleWorkforceDemand(
    getRecipeForBuilding(BuildingId.IRON_MINE, slotMethods).workforceRequired,
    1,
  );
}

function expectedLegacyHire(role: LaborRole): number {
  return Math.ceil(getWorkforceDemandValue(getIronMineActiveDemand(), role) * 0.6);
}

describe('SaveManager storage fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and saves settings without logging storage errors when localStorage is unavailable', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const manager = new SaveManager();

    const settings = manager.loadSettings();
    manager.saveSettings(settings);

    expect(settings.newsGenerationEnabled).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports zero storage usage when localStorage is unavailable', () => {
    const manager = new SaveManager();

    expect(manager.getStorageUsage()).toEqual({ used: 0, total: 5 * 1024 * 1024, percent: 0 });
  });

  it('serializes labor market and building labor arrays within active building ranges', () => {
    initializeBuildingProductionMethods();
    const manager = new SaveManager();
    const world = createGameWorld();
    world.companies.count = 1;
    const buildingId = addBuilding(world, 0, BuildingId.IRON_MINE, {
      slotMethods: getDefaultSlotMethods(BuildingId.IRON_MINE),
    });

    world.labor.totalSupply[LABOR_ROLE_BASIC] = 12_345;
    world.labor.employed[LABOR_ROLE_BASIC] = 234;
    world.labor.unemployed[LABOR_ROLE_BASIC] = 12_111;
    world.labor.marketWages[LABOR_ROLE_BASIC] = 144;
    world.labor.monthlyGrowth[LABOR_ROLE_BASIC] = 321;
    world.labor.demandOpenings[LABOR_ROLE_BASIC] = 88;
    world.labor.lastPayrollTick = 27;

    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)] = 10;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_TECHNICAL)] = 4;
    world.buildings.wageMultipliers[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)] = 1.25;
    world.buildings.accruedPayroll[buildingId] = 9_876.5;

    const outsideLaborRange = world.buildings.count * LABOR_ROLE_COUNT;
    world.buildings.workforceHired[outsideLaborRange] = 999;
    world.buildings.wageMultipliers[outsideLaborRange] = 1.75;
    world.buildings.accruedPayroll[world.buildings.count] = 777;

    const serialized = manager.serializeWorld(world, 99) as SerializedWorldWithLabor;

    expect(serialized.labor?.totalSupply?.[LABOR_ROLE_BASIC]).toBe(12_345);
    expect(serialized.labor?.employed?.[LABOR_ROLE_BASIC]).toBe(234);
    expect(serialized.labor?.unemployed?.[LABOR_ROLE_BASIC]).toBe(12_111);
    expect(serialized.labor?.marketWages?.[LABOR_ROLE_BASIC]).toBe(144);
    expect(serialized.labor?.monthlyGrowth?.[LABOR_ROLE_BASIC]).toBe(321);
    expect(serialized.labor?.demandOpenings?.[LABOR_ROLE_BASIC]).toBe(88);
    expect(serialized.labor?.lastPayrollTick).toBe(27);
    expect(serialized.buildings.workforceHired).toHaveLength(world.buildings.count * LABOR_ROLE_COUNT);
    expect(serialized.buildings.wageMultipliers).toHaveLength(world.buildings.count * LABOR_ROLE_COUNT);
    expect(serialized.buildings.accruedPayroll).toHaveLength(world.buildings.count);
    expect(serialized.buildings.workforceHired).not.toContain(999);
    expect(serialized.buildings.wageMultipliers).not.toContain(1.75);
    expect(serialized.buildings.accruedPayroll).not.toContain(777);

    const loadedWorld = createGameWorld();
    manager.deserializeWorld(serialized, loadedWorld);

    expect(loadedWorld.labor.totalSupply[LABOR_ROLE_BASIC]).toBe(12_345);
    expect(loadedWorld.labor.lastPayrollTick).toBe(27);
    expect(loadedWorld.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)]).toBe(10);
    expect(loadedWorld.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_TECHNICAL)]).toBe(4);
    expect(loadedWorld.buildings.wageMultipliers[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)]).toBeCloseTo(1.25);
    expect(loadedWorld.buildings.accruedPayroll[buildingId]).toBe(9_876.5);
  });

  it('hydrates default labor state for old saves that omit labor fields', () => {
    const manager = new SaveManager();
    const world = createGameWorld();
    const payload = createLegacyLaborPayload({
      buildings: {
        count: 1,
        types: [BuildingId.IRON_MINE],
        owners: [0],
        levels: [1],
        efficiencies: [1],
        slotMethods: new Array(MAX_SLOTS).fill(0),
        isActive: [0],
      },
    });

    manager.deserializeWorld(payload, world);

    expect(world.labor.totalSupply[LABOR_ROLE_BASIC]).toBeGreaterThan(0);
    expect(world.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(1);
  });

  it('migrates old active buildings without labor data to roughly sixty percent workforce coverage', () => {
    const manager = new SaveManager();
    const world = createGameWorld();
    const payload = createLegacyLaborPayload();
    const basicDemand = getWorkforceDemandValue(getIronMineActiveDemand(), LABOR_ROLE_BASIC);

    manager.deserializeWorld(payload, world);

    expect(basicDemand).toBeGreaterThan(0);
    expect(world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(
      expectedLegacyHire(LABOR_ROLE_BASIC),
    );
    expect(world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_TECHNICAL)]).toBe(
      expectedLegacyHire(LABOR_ROLE_TECHNICAL),
    );
    expect(world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_MANAGEMENT)]).toBe(
      expectedLegacyHire(LABOR_ROLE_MANAGEMENT),
    );
    expect(world.labor.employed[LABOR_ROLE_BASIC]).toBe(expectedLegacyHire(LABOR_ROLE_BASIC));
    expect(world.labor.unemployed[LABOR_ROLE_BASIC]).toBe(120_000 - expectedLegacyHire(LABOR_ROLE_BASIC));
  });

  it('does not run legacy workforce backfill for new saves that already include labor state', () => {
    const manager = new SaveManager();
    const world = createGameWorld();
    const existingBasicWorkers = 1;
    const payload = createLegacyLaborPayload({
      labor: {
        totalSupply: [120_000, 32_000, 8_000],
        employed: [existingBasicWorkers, 0, 0],
        unemployed: [120_000 - existingBasicWorkers, 32_000, 8_000],
        marketWages: [120, 260, 520],
        monthlyGrowth: [600, 120, 30],
        demandOpenings: [0, 0, 0],
        lastPayrollTick: 12,
      },
      buildings: {
        count: 1,
        types: [BuildingId.IRON_MINE],
        owners: [0],
        levels: [1],
        efficiencies: [1],
        slotMethods: createLegacyLaborPayload().buildings.slotMethods,
        isActive: [1],
        workforceHired: [existingBasicWorkers, 0, 0],
        wageMultipliers: [1.4, 1, 1],
        accruedPayroll: [345],
      },
    });

    manager.deserializeWorld(payload, world);

    expect(expectedLegacyHire(LABOR_ROLE_BASIC)).toBeGreaterThan(existingBasicWorkers);
    expect(world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(existingBasicWorkers);
    expect(world.labor.employed[LABOR_ROLE_BASIC]).toBe(existingBasicWorkers);
    expect(world.labor.lastPayrollTick).toBe(12);
    expect(world.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBeCloseTo(1.4);
    expect(world.buildings.accruedPayroll[0]).toBe(345);
  });
});
