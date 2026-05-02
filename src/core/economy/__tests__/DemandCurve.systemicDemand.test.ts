import { describe, expect, it } from 'vitest';

import { getDefaultSlotMethods, initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';

import { updateWorldDemands } from '../DemandCurve';

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

  it('adds operational electricity demand for active industrial buildings', () => {
    initializeBuildingProductionMethods();

    const world = createInitializedWorld();
    addBuilding(world, 1, BuildingId.STEEL_MILL, {
      slotMethods: getDefaultSlotMethods(BuildingId.STEEL_MILL),
    });

    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL);
    expect(steelMill).toBeDefined();

    updateWorldDemands(world);

    expect(world.goods.demands[GoodsId.ELECTRICITY]).toBeGreaterThanOrEqual(
      steelMill!.powerConsumption * 1000,
    );
  });
});
