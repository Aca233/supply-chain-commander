import { beforeEach, describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { MAX_INPUTS } from '@/core/constants';
import {
  LABOR_ROLE_BASIC,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  getBuildingLaborIndex,
} from '@/core/labor/LaborSystem';

import { initProductionCache, updateAllProduction } from '../ProductionEngine';
import {
  getBuildingDefaultMethods,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '../ProductionMethods';

describe('Production energy handling', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('uses supplied electricity inputs instead of blocking on notional energy demand', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 10_000_000;
    const recipe = getRecipeForBuilding(
      BuildingId.OIL_FIELD,
      getBuildingDefaultMethods(BuildingId.OIL_FIELD),
    );

    for (let i = 0; i < 30; i++) {
      const buildingId = addBuilding(world, 0, BuildingId.OIL_FIELD, 0);
      world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)] = 999;
      world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_TECHNICAL)] = 999;
      world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_MANAGEMENT)] = 999;
      const inputOffset = buildingId * MAX_INPUTS;
      recipe.inputs.forEach((input, index) => {
        world.buildings.inputBuffers[inputOffset + index] = input.amount;
      });
    }

    const result = updateAllProduction(world);

    expect(result.processedCount).toBe(30);
    expect(result.producedCount).toBe(30);
    expect(result.blockedCount).toBe(0);
  });
});
