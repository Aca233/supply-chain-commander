import { describe, expect, it } from 'vitest';

import { MAX_INPUTS, TICKS_PER_DAY } from '@/core/constants';
import { getBuildingRecipeFromInstance, initProductionCache } from '@/core/production/ProductionEngine';
import { getDefaultSlotMethods, initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';

import { calculateDerivedDemand, updateWorldDemands } from '../DemandCurve';

function createInitializedWorld() {
  const world = createGameWorld();
  world.goods.count = ALL_GOODS.length;
  world.companies.count = 2;
  world.economyStats.cyclePosition = 0.38;
  world.economyStats.cyclePhase = 'expansion';

  for (const goods of ALL_GOODS) {
    world.goods.prices[goods.id] = goods.basePrice;
    world.goods.baseValues[goods.id] = goods.basePrice;
    world.goods.demands[goods.id] = 0;
    world.goods.supplies[goods.id] = 0;
  }

  return world;
}

describe('DemandCurve systemic demand accounting', () => {
  it('preserves unmet non-consumer demand instead of resetting it to zero each tick', () => {
    const world = createInitializedWorld();
    world.goods.demands[GoodsId.STEEL] = 500;

    updateWorldDemands(world);

    expect(world.goods.demands[GoodsId.STEEL]).toBe(500);
  });

  it('does not add separate powerConsumption electricity demand when recipe electricity buffer is full', () => {
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createInitializedWorld();
    const buildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, {
      slotMethods: getDefaultSlotMethods(BuildingId.STEEL_MILL),
    });

    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const electricityInputIndex = recipe.inputs.findIndex(input => input.goodsId === GoodsId.ELECTRICITY);
    expect(electricityInputIndex).toBeGreaterThanOrEqual(0);

    const electricityInput = recipe.inputs[electricityInputIndex];
    const inputOffset = buildingId * MAX_INPUTS;
    world.buildings.inputBuffers[inputOffset + electricityInputIndex] =
      (electricityInput.amount * 7 * TICKS_PER_DAY) / Math.max(1, recipe.ticksRequired || 1);
    world.goods.demands[GoodsId.ELECTRICITY] = 0;
    world.goods.demands[GoodsId.STEEL] = 0;

    calculateDerivedDemand(world);

    expect(world.goods.demands[GoodsId.ELECTRICITY]).toBe(0);
  });
});
