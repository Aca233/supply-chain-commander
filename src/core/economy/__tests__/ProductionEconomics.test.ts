import { beforeEach, describe, expect, it } from 'vitest';

import { LABOR_ROLE_COUNT } from '@/core/constants';
import { getBuildingRecipeFromInstance, initProductionCache } from '@/core/production/ProductionEngine';
import {
  getBuildingProductionVariants,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { ALL_BUILDINGS, BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';

import {
  calculateBuildingProductionEconomics,
  calculateBuildingOutputUnitEconomics,
  calculateRecipeEconomics,
} from '../ProductionEconomics';

function createBaseWorld() {
  const world = createGameWorld();
  for (const goods of ALL_GOODS) {
    world.goods.prices[goods.id] = goods.basePrice;
    world.goods.baseValues[goods.id] = goods.basePrice;
  }
  world.companies.count = 1;
  return world;
}

describe('ProductionEconomics', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('includes market wages and building wage multipliers in daily production cost', () => {
    const world = createBaseWorld();
    const buildingId = addBuilding(world, 0, BuildingId.IRON_MINE);
    const recipe = getBuildingRecipeFromInstance(world, buildingId);

    world.labor.marketWages[0] = 100;
    world.labor.marketWages[1] = 200;
    world.labor.marketWages[2] = 400;
    world.buildings.wageMultipliers[buildingId * LABOR_ROLE_COUNT + 0] = 1.25;
    world.buildings.wageMultipliers[buildingId * LABOR_ROLE_COUNT + 1] = 1.5;
    world.buildings.wageMultipliers[buildingId * LABOR_ROLE_COUNT + 2] = 2;

    const economics = calculateBuildingProductionEconomics(world, buildingId);

    const expectedWage =
      recipe.workforceRequired.basic * 100 * 1.25 +
      recipe.workforceRequired.technical * 200 * 1.5 +
      recipe.workforceRequired.management * 400 * 2;

    expect(economics.wageCost).toBeCloseTo(expectedWage);
    expect(economics.totalCost).toBeCloseTo(
      economics.inputCost +
        economics.maintenanceCost +
        economics.energyCost +
        economics.wageCost,
    );
  });

  it('raises output break-even cost when wages increase', () => {
    const world = createBaseWorld();
    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL);

    const normal = calculateBuildingOutputUnitEconomics(world, buildingId, GoodsId.STEEL);

    world.labor.marketWages[0] *= 2;
    world.labor.marketWages[1] *= 2;
    world.labor.marketWages[2] *= 2;

    const highWage = calculateBuildingOutputUnitEconomics(world, buildingId, GoodsId.STEEL);

    expect(highWage.breakEvenPrice).toBeGreaterThan(normal.breakEvenPrice);
  });

  it('prices energy demand through electricity inputs instead of abstract energy cost', () => {
    const world = createBaseWorld();
    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL);
    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const electricityInput = recipe.inputs.find((entry) => entry.goodsId === GoodsId.ELECTRICITY);

    world.goods.prices.fill(0);
    world.goods.prices[GoodsId.ELECTRICITY] = 2;

    const economics = calculateBuildingProductionEconomics(world, buildingId);

    expect(electricityInput).toBeDefined();
    expect(economics.inputCost).toBeCloseTo((electricityInput!.amount / recipe.ticksRequired) * 2);
    expect(economics.energyCost).toBe(0);
  });

  it('keeps every non-retail baseline production variant viable after payroll costs', () => {
    const world = createBaseWorld();
    const failures: string[] = [];

    for (const building of ALL_BUILDINGS) {
      if (building.category === 'retail') continue;
      const buildingDef = BUILDINGS_BY_ID.get(building.id);
      if (!buildingDef) continue;

      for (const variant of getBuildingProductionVariants(building.id)) {
        if (variant.recipe.outputs.length === 0) continue;

        const economics = calculateRecipeEconomics({
          buildingDef,
          recipe: variant.recipe,
          prices: world.goods.prices,
          marketWages: world.labor.marketWages,
          wageMultipliers: [1, 1, 1],
        });

        if (economics.profitMargin < 0.08) {
          failures.push(
            `${building.name}/${variant.name}: margin=${(economics.profitMargin * 100).toFixed(1)}%, ` +
              `revenue=${economics.revenue.toFixed(0)}, cost=${economics.totalCost.toFixed(0)}`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
