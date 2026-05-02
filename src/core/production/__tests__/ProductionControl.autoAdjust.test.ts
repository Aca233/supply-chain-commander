import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeDecision } from '@/core/ai/AIDecisionEngine';
import { GOODS_COUNT } from '@/core/constants';
import { executeSimpleDecisionForTest } from '@/core/ai/AIOptimizer';
import { adjustOversupplyProduction, initProductionCache } from '@/core/production/ProductionEngine';
import {
  getBuildingProductionVariants,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import {
  PRODUCTION_CONTROL_MODE_AUTO,
  PRODUCTION_CONTROL_MODE_MANUAL,
  setBuildingManualEfficiencyTarget,
  setBuildingProductionControlMode,
} from '@/core/production/ProductionControl';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// IRON_MINE 默认 method 在 F4 之后会产出 IRON_ORE；过渡阶段直接使用 goods id 作为基准
function getPrimaryOutputGoodsId(_world: ReturnType<typeof createGameWorld>, _buildingId: number): number {
  return GoodsId.IRON_ORE;
}

describe('ProductionControl automatic adjustments respect manual mode', () => {
  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    initializeBuildingProductionMethods();
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
    // efficiencyMultipliers 已统一归一，升级后 efficiency 不再放大
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(1.0, 5);
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

  it('treats zero-demand goods with a large real inventory backlog as oversupplied', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const reducedBuildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, 0);
    const recoveryBuildingId = addBuilding(world, 1, BuildingId.COAL_MINE, 0);
    world.buildings.efficiencies[reducedBuildingId] = 1.0;
    world.buildings.efficiencies[recoveryBuildingId] = 0.8;
    setBuildingProductionControlMode(world, reducedBuildingId, PRODUCTION_CONTROL_MODE_AUTO);
    setBuildingProductionControlMode(world, recoveryBuildingId, PRODUCTION_CONTROL_MODE_AUTO);

    world.goods.supplies[GoodsId.STEEL] = 60_000;
    world.goods.demands[GoodsId.STEEL] = 0;
    world.companies.inventories[1 * GOODS_COUNT + GoodsId.STEEL] = 500_000;

    const adjustment = adjustOversupplyProduction(world);

    expect(adjustment.oversuppliedGoodsCount).toBeGreaterThan(0);
    expect(adjustment.reducedBuildingsCount).toBeGreaterThan(0);
    expect(world.buildings.efficiencies[reducedBuildingId]).toBeCloseTo(0.8, 5);
    expect(world.buildings.efficiencies[recoveryBuildingId]).toBeCloseTo(0.84, 5);
  });

  it('treats positive-demand goods with extreme inventory coverage as oversupplied', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const reducedBuildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, 0);
    world.buildings.efficiencies[reducedBuildingId] = 1.0;
    setBuildingProductionControlMode(world, reducedBuildingId, PRODUCTION_CONTROL_MODE_AUTO);

    world.goods.supplies[GoodsId.STEEL] = 150;
    world.goods.demands[GoodsId.STEEL] = 120;
    world.companies.inventories[1 * GOODS_COUNT + GoodsId.STEEL] = 50_000;

    const adjustment = adjustOversupplyProduction(world);

    expect(adjustment.oversuppliedGoodsCount).toBeGreaterThan(0);
    expect(adjustment.reducedBuildingsCount).toBeGreaterThan(0);
    expect(world.buildings.efficiencies[reducedBuildingId]).toBeLessThan(1.0);
  });

  it('lets automatic oversupply control idle buildings below the manual 0.3 floor when glut persists', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const reducedBuildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, 0);
    world.buildings.efficiencies[reducedBuildingId] = 1.0;
    setBuildingProductionControlMode(world, reducedBuildingId, PRODUCTION_CONTROL_MODE_AUTO);

    world.goods.supplies[GoodsId.STEEL] = 60_000;
    world.goods.demands[GoodsId.STEEL] = 10;
    world.companies.inventories[1 * GOODS_COUNT + GoodsId.STEEL] = 500_000;

    for (let i = 0; i < 20; i++) {
      adjustOversupplyProduction(world);
    }

    expect(world.buildings.efficiencies[reducedBuildingId]).toBeLessThan(0.3);
  });

  it('automatically suspends minimum-efficiency producers when severe structural oversupply persists', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const buildingIds = Array.from({ length: 4 }, () => addBuilding(world, 1, BuildingId.IRON_MINE, 0));
    for (const buildingId of buildingIds) {
      world.buildings.efficiencies[buildingId] = 0.05;
      setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_AUTO);
    }

    const oversuppliedGoodsId = getPrimaryOutputGoodsId(world, buildingIds[0]);
    world.goods.supplies[oversuppliedGoodsId] = 400;
    world.goods.demands[oversuppliedGoodsId] = 10;
    world.companies.inventories[1 * GOODS_COUNT + oversuppliedGoodsId] = 50_000;

    const adjustment = adjustOversupplyProduction(world);
    const suspended = buildingIds.filter((buildingId) => world.buildings.isActive[buildingId] === 0);

    expect(adjustment.suspendedBuildingsCount).toBeGreaterThan(0);
    expect(suspended.length).toBe(adjustment.suspendedBuildingsCount);
    expect(suspended.every(
      (buildingId) => world.buildings.oversupplySuspendedGoods[buildingId] === oversuppliedGoodsId,
    )).toBe(true);
  });

  it('reactivates only oversupply-suspended buildings when shortage returns', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.tick = 120;

    const autoSuspendedBuildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    const manuallyInactiveBuildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    world.buildings.efficiencies[autoSuspendedBuildingId] = 0.05;
    world.buildings.efficiencies[manuallyInactiveBuildingId] = 0.05;
    setBuildingProductionControlMode(world, autoSuspendedBuildingId, PRODUCTION_CONTROL_MODE_AUTO);
    setBuildingProductionControlMode(world, manuallyInactiveBuildingId, PRODUCTION_CONTROL_MODE_AUTO);

    const goodsId = getPrimaryOutputGoodsId(world, autoSuspendedBuildingId);
    world.buildings.isActive[autoSuspendedBuildingId] = 0;
    world.buildings.oversupplySuspendedGoods[autoSuspendedBuildingId] = goodsId;
    world.buildings.oversupplySuspendedUntilTick[autoSuspendedBuildingId] = world.tick;

    world.buildings.isActive[manuallyInactiveBuildingId] = 0;
    world.goods.supplies[goodsId] = 5;
    world.goods.demands[goodsId] = 120;
    world.goods.demandPressure[goodsId] = 160;
    world.goods.demandPressureTick = world.tick;
    world.companies.inventories[1 * GOODS_COUNT + goodsId] = 0;

    const adjustment = adjustOversupplyProduction(world);

    expect(adjustment.reactivatedBuildingsCount).toBe(1);
    expect(world.buildings.isActive[autoSuspendedBuildingId]).toBe(1);
    expect(world.buildings.oversupplySuspendedGoods[autoSuspendedBuildingId]).toBe(-1);
    expect(world.buildings.isActive[manuallyInactiveBuildingId]).toBe(0);
  });

  it('can fully suspend the last low-efficiency producer when inventory already covers demand for months', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const antibioticVariant = getBuildingProductionVariants(BuildingId.PHARMA_FACTORY)
      .find((variant) => variant.recipe.outputs.some((output) => output.goodsId === GoodsId.ANTIBIOTICS));
    expect(antibioticVariant).toBeDefined();

    const buildingId = addBuilding(world, 1, BuildingId.PHARMA_FACTORY, {
      slotMethods: antibioticVariant!.slotMethods,
    });
    world.buildings.efficiencies[buildingId] = 0.1;
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE_AUTO);

    world.goods.supplies[GoodsId.ANTIBIOTICS] = 200;
    world.goods.demands[GoodsId.ANTIBIOTICS] = 60;
    world.companies.inventories[1 * GOODS_COUNT + GoodsId.ANTIBIOTICS] = 50_000;

    const adjustment = adjustOversupplyProduction(world);

    expect(adjustment.suspendedBuildingsCount).toBeGreaterThan(0);
    expect(world.buildings.isActive[buildingId]).toBe(0);
    expect(world.buildings.oversupplySuspendedGoods[buildingId]).toBe(GoodsId.ANTIBIOTICS);
  });
});
