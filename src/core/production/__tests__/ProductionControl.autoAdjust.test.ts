import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeDecision } from '@/core/ai/AIDecisionEngine';
import { executeSimpleDecisionForTest } from '@/core/ai/AIOptimizer';
import { adjustOversupplyProduction, initProductionCache } from '@/core/production/ProductionEngine';
import {
  PRODUCTION_CONTROL_MODE_AUTO,
  PRODUCTION_CONTROL_MODE_MANUAL,
  setBuildingManualEfficiencyTarget,
  setBuildingProductionControlMode,
} from '@/core/production/ProductionControl';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId, getBuildingProduction } from '@/data/buildings';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

function getPrimaryOutputGoodsId(world: ReturnType<typeof createGameWorld>, buildingId: number): number {
  const production = getBuildingProduction(world.buildings.types[buildingId], world.buildings.outputModeIds[buildingId]);
  if (!production?.outputs?.length) {
    throw new Error(`Building ${buildingId} has no production outputs in test setup`);
  }
  return production.outputs[0].goodsId;
}

describe('ProductionControl automatic adjustments respect manual mode', () => {
  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    initProductionCache();
  });

  it('manual mode blocks AI production decision efficiency writes from AIDecisionEngine', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    world.buildings.efficiencies[buildingId] = 1.0;
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_MANUAL);

    const changed = executeDecision(world, {
      type: 'production',
      companyId: 1,
      action: 'reduce_production',
      params: { buildingId, targetQuantity: 1 },
      priority: 1,
      expectedProfit: 0,
      confidence: 1,
    });

    expect(changed).toBe(false);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(1.0, 5);
  });

  it('auto mode still allows AI production decision efficiency writes from AIDecisionEngine', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    world.buildings.efficiencies[buildingId] = 1.0;
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_AUTO);

    const changed = executeDecision(world, {
      type: 'production',
      companyId: 1,
      action: 'reduce_production',
      params: { buildingId, targetQuantity: 1 },
      priority: 1,
      expectedProfit: 0,
      confidence: 1,
    });

    expect(changed).toBe(true);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(0.9, 5);
  });

  it('manual mode keeps manual efficiency when AIDecisionEngine executes upgrade', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.cash[1] = 1_000_000;

    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_MANUAL);
    setBuildingManualEfficiencyTarget(world, buildingId, 0.76);

    const changed = executeDecision(world, {
      type: 'investment',
      companyId: 1,
      action: 'upgrade',
      params: {
        buildingId,
        targetLevel: 2,
        cost: 1000,
      },
      priority: 1,
      expectedProfit: 0,
      confidence: 1,
    });

    expect(changed).toBe(true);
    expect(world.buildings.levels[buildingId]).toBe(2);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(0.76, 5);
  });

  it('auto mode applies upgrade efficiency when AIDecisionEngine executes upgrade', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.cash[1] = 1_000_000;

    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_AUTO);
    world.buildings.efficiencies[buildingId] = 0.76;

    const changed = executeDecision(world, {
      type: 'investment',
      companyId: 1,
      action: 'upgrade',
      params: {
        buildingId,
        targetLevel: 2,
        cost: 1000,
      },
      priority: 1,
      expectedProfit: 0,
      confidence: 1,
    });

    expect(changed).toBe(true);
    expect(world.buildings.levels[buildingId]).toBe(2);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(1.1, 5);
  });

  it('manual mode blocks AIOptimizer production efficiency writes', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    world.buildings.efficiencies[buildingId] = 1.0;
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_MANUAL);

    const changed = executeSimpleDecisionForTest(world, {
      type: 'production',
      companyId: 1,
      action: 'reduce_production',
      params: { buildingId, targetEfficiency: 0.9 },
      priority: 1,
      expectedProfit: 0,
      confidence: 1,
    });

    expect(changed).toBe(false);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(1.0, 5);
  });

  it('auto mode still allows AIOptimizer production efficiency writes', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    world.buildings.efficiencies[buildingId] = 1.0;
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_AUTO);

    const changed = executeSimpleDecisionForTest(world, {
      type: 'production',
      companyId: 1,
      action: 'reduce_production',
      params: { buildingId, targetEfficiency: 0.9 },
      priority: 1,
      expectedProfit: 0,
      confidence: 1,
    });

    expect(changed).toBe(true);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(0.9, 5);
  });

  it('manual mode blocks oversupply reduction and recovery efficiency writes', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const reducedBuildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    const recoveryBuildingId = addBuilding(world, 1, BuildingId.COAL_MINE, 0);
    world.buildings.efficiencies[reducedBuildingId] = 1.0;
    world.buildings.efficiencies[recoveryBuildingId] = 0.8;
    setBuildingProductionControlMode(world, reducedBuildingId, PRODUCTION_CONTROL_MODE_MANUAL);
    setBuildingProductionControlMode(world, recoveryBuildingId, PRODUCTION_CONTROL_MODE_MANUAL);
    setBuildingManualEfficiencyTarget(world, recoveryBuildingId, 0.8);

    const oversuppliedGoodsId = getPrimaryOutputGoodsId(world, reducedBuildingId);
    world.goods.supplies[oversuppliedGoodsId] = 300;
    world.goods.demands[oversuppliedGoodsId] = 100;

    const adjustment = adjustOversupplyProduction(world);

    expect(adjustment.oversuppliedGoodsCount).toBeGreaterThan(0);
    expect(world.buildings.efficiencies[reducedBuildingId]).toBeCloseTo(1.0, 5);
    expect(world.buildings.efficiencies[recoveryBuildingId]).toBeCloseTo(0.8, 5);
  });

  it('auto mode still allows oversupply reduction and recovery efficiency writes', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const reducedBuildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    const recoveryBuildingId = addBuilding(world, 1, BuildingId.COAL_MINE, 0);
    world.buildings.efficiencies[reducedBuildingId] = 1.0;
    world.buildings.efficiencies[recoveryBuildingId] = 0.8;
    setBuildingProductionControlMode(world, reducedBuildingId, PRODUCTION_CONTROL_MODE_AUTO);
    setBuildingProductionControlMode(world, recoveryBuildingId, PRODUCTION_CONTROL_MODE_AUTO);

    const oversuppliedGoodsId = getPrimaryOutputGoodsId(world, reducedBuildingId);
    world.goods.supplies[oversuppliedGoodsId] = 300;
    world.goods.demands[oversuppliedGoodsId] = 100;

    const adjustment = adjustOversupplyProduction(world);

    expect(adjustment.reducedBuildingsCount).toBeGreaterThan(0);
    expect(adjustment.recoveredBuildingsCount).toBeGreaterThan(0);
    expect(world.buildings.efficiencies[reducedBuildingId]).toBeCloseTo(0.9, 5);
    expect(world.buildings.efficiencies[recoveryBuildingId]).toBeCloseTo(0.84, 5);
  });
});
