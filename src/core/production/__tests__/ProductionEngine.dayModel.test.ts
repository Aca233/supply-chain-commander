import { beforeEach, describe, expect, it } from 'vitest';

import { LEGACY_HOURS_PER_DAY, MAX_INPUTS, MAX_SLOTS } from '@/core/constants';
import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import {
  calculateDailyConsumption,
  calculateTheoreticalOutput,
  initProductionCache,
  updateAllProduction,
} from '../ProductionEngine';

describe('ProductionEngine day-model normalization', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('preserves the legacy daily output for a one-day tick', () => {
    const building = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const expected =
      building.production.outputs[0].amount /
      (building.production.ticksRequired / LEGACY_HOURS_PER_DAY);

    const [output] = calculateTheoreticalOutput(BuildingId.IRON_MINE, 1);

    expect(output.amount).toBeCloseTo(expected);
  });

  it('preserves the legacy daily input consumption for a one-day tick', () => {
    const building = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL)!;
    const expected =
      building.production.inputs[0].amount /
      (building.production.ticksRequired / LEGACY_HOURS_PER_DAY);

    const [input] = calculateDailyConsumption(BuildingId.STEEL_MILL);

    expect(input.amount).toBeCloseTo(expected);
  });

  it('produces one full legacy day of output in a single simulation tick', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 1_000_000;

    addBuilding(world, 0, BuildingId.IRON_MINE, 0);

    const building = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const expected =
      building.production.outputs[0].amount /
      (building.production.ticksRequired / LEGACY_HOURS_PER_DAY);

    updateAllProduction(world);

    expect(world.goods.supplies[building.production.outputs[0].goodsId]).toBeCloseTo(expected);
  });

  it('consumes one full legacy day of inputs in a single simulation tick', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 1_000_000;

    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL, 0);
    const building = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL)!;
    const expected =
      building.production.inputs[0].amount /
      (building.production.ticksRequired / LEGACY_HOURS_PER_DAY);

    for (let slotIndex = 0; slotIndex < MAX_SLOTS; slotIndex++) {
      world.buildings.slotMethods[buildingId * MAX_SLOTS + slotIndex] = 0;
    }

    for (const [index, input] of building.production.inputs.entries()) {
      const dailyInput = input.amount / (building.production.ticksRequired / LEGACY_HOURS_PER_DAY);
      world.buildings.inputBuffers[buildingId * MAX_INPUTS + index] = dailyInput * 2;
    }

    updateAllProduction(world);

    expect(world.buildings.inputBuffers[buildingId * MAX_INPUTS]).toBeCloseTo(expected);
  });
});
