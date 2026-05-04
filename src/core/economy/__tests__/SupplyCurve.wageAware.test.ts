import { beforeEach, describe, expect, it } from 'vitest';

import { getBuildingProductionVariants, initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';

import { calculateBuildingOutputUnitEconomics } from '../ProductionEconomics';
import { calculateCostStructure, calculateOptimalQuantity } from '../SupplyCurve';

function createBaseWorld() {
  const world = createGameWorld();
  for (const goods of ALL_GOODS) {
    world.goods.prices[goods.id] = goods.basePrice;
    world.goods.baseValues[goods.id] = goods.basePrice;
  }
  world.companies.count = 1;
  return world;
}

describe('SupplyCurve wage-aware decisions', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('reports the same break-even price as ProductionEconomics for the target output', () => {
    const world = createBaseWorld();
    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL);

    const unitEconomics = calculateBuildingOutputUnitEconomics(world, buildingId, GoodsId.STEEL);
    const decision = calculateOptimalQuantity(world, buildingId, GoodsId.STEEL);

    expect(decision.breakEvenPrice).toBeCloseTo(unitEconomics.breakEvenPrice);
  });

  it('uses recipe output units as the production capacity scale', () => {
    const world = createBaseWorld();
    const smartphoneVariant = getBuildingProductionVariants(BuildingId.ELECTRONICS_FACTORY)
      .find((variant) => variant.name === '智能手机组装');
    expect(smartphoneVariant).toBeDefined();

    const buildingId = addBuilding(world, 0, BuildingId.ELECTRONICS_FACTORY, {
      slotMethods: smartphoneVariant!.slotMethods,
    });
    world.goods.prices[GoodsId.SMARTPHONE] = 100_000;

    const unitEconomics = calculateBuildingOutputUnitEconomics(world, buildingId, GoodsId.SMARTPHONE);
    const decision = calculateOptimalQuantity(world, buildingId, GoodsId.SMARTPHONE);

    expect(unitEconomics.outputAmount).toBeGreaterThan(0);
    expect(decision.optimalQuantity).toBeLessThanOrEqual(unitEconomics.outputAmount * 1.5);
  });

  it('keeps payroll as a fixed daily cost instead of scaling it with quantity', () => {
    const world = createBaseWorld();
    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL);

    const oneBatch = calculateCostStructure(world, buildingId, 1);
    const twoBatches = calculateCostStructure(world, buildingId, 2);

    expect(twoBatches.laborCost).toBeCloseTo(oneBatch.laborCost);
    expect(twoBatches.fixedCost).toBeCloseTo(oneBatch.fixedCost);
    expect(oneBatch.variableCost).toBeCloseTo(oneBatch.materialCost + oneBatch.energyCost);
  });
});
