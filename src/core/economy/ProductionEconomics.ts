import { LABOR_ROLE_COUNT, TICKS_PER_DAY } from '@/core/constants';
import type { WorkforceDemand } from '@/core/labor/LaborSystem';
import type { ComputedRecipe } from '@/core/production/ProductionMethods';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import type { GameWorld } from '@/core/world/GameWorld';
import type { BuildingTypeDefinition } from '@/data/buildings';
import { BUILDINGS_BY_ID } from '@/data/buildings';

export interface ProductionEconomicsInput {
  buildingDef: BuildingTypeDefinition;
  recipe: ComputedRecipe;
  prices: ArrayLike<number>;
  marketWages: ArrayLike<number>;
  wageMultipliers?: ArrayLike<number>;
}

export interface ProductionEconomicsBreakdown {
  revenue: number;
  inputCost: number;
  maintenanceCost: number;
  energyCost: number;
  wageCost: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

export interface OutputUnitEconomics extends ProductionEconomicsBreakdown {
  goodsId: number;
  outputAmount: number;
  outputRevenue: number;
  byproductRevenue: number;
  breakEvenPrice: number;
}

const DEFAULT_WAGE_MULTIPLIERS = [1, 1, 1] as const;

function getSafePrice(prices: ArrayLike<number>, goodsId: number): number {
  const price = prices[goodsId];
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function flowValue(
  flows: Array<{ goodsId: number; amount: number }>,
  prices: ArrayLike<number>,
  ticksRequired: number,
): number {
  const ticks = Math.max(1, ticksRequired || TICKS_PER_DAY);
  return flows.reduce(
    (sum, flow) => sum + getSafePrice(prices, flow.goodsId) * Math.max(0, flow.amount) / ticks,
    0,
  );
}

function roleDemand(workforce: WorkforceDemand, role: number): number {
  if (role === 0) return workforce.basic || 0;
  if (role === 1) return workforce.technical || 0;
  return workforce.management || 0;
}

export function calculateWorkforceDailyCost(
  workforce: WorkforceDemand,
  marketWages: ArrayLike<number>,
  wageMultipliers: ArrayLike<number> = DEFAULT_WAGE_MULTIPLIERS,
): number {
  let total = 0;
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const demand = Math.max(0, roleDemand(workforce, role));
    if (demand <= 0) continue;
    const wage = Number.isFinite(marketWages[role]) ? Math.max(0, marketWages[role]) : 0;
    const multiplier = Number.isFinite(wageMultipliers[role])
      ? Math.max(0, wageMultipliers[role])
      : 1;
    total += demand * wage * multiplier;
  }
  return total;
}

export function calculateRecipeEconomics(input: ProductionEconomicsInput): ProductionEconomicsBreakdown {
  const ticksRequired = Math.max(1, input.recipe.ticksRequired || TICKS_PER_DAY);
  const revenue = flowValue(input.recipe.outputs, input.prices, ticksRequired);
  const inputCost = flowValue(input.recipe.inputs, input.prices, ticksRequired);
  const maintenanceCost = Math.max(0, input.buildingDef.maintenanceCost || 0);
  // Energy demand is represented as electricity goods in recipe inputs.
  const energyCost = 0;
  const wageCost = calculateWorkforceDailyCost(
    input.recipe.workforceRequired,
    input.marketWages,
    input.wageMultipliers ?? DEFAULT_WAGE_MULTIPLIERS,
  );
  const totalCost = inputCost + maintenanceCost + energyCost + wageCost;
  const profit = revenue - totalCost;

  return {
    revenue,
    inputCost,
    maintenanceCost,
    energyCost,
    wageCost,
    totalCost,
    profit,
    profitMargin: revenue > 0 ? profit / revenue : 0,
  };
}

function getBuildingWageMultipliers(world: GameWorld, buildingId: number): number[] {
  const base = buildingId * LABOR_ROLE_COUNT;
  const multipliers: number[] = [];
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const value = world.buildings.wageMultipliers[base + role];
    multipliers.push(Number.isFinite(value) && value > 0 ? value : 1);
  }
  return multipliers;
}

export function calculateBuildingProductionEconomics(
  world: GameWorld,
  buildingId: number,
): ProductionEconomicsBreakdown {
  const buildingTypeId = world.buildings.types[buildingId];
  const buildingDef = BUILDINGS_BY_ID.get(buildingTypeId);
  const recipe = getBuildingRecipeFromInstance(world, buildingId);

  if (!buildingDef) {
    return {
      revenue: 0,
      inputCost: 0,
      maintenanceCost: 0,
      energyCost: 0,
      wageCost: 0,
      totalCost: 0,
      profit: 0,
      profitMargin: 0,
    };
  }

  return calculateRecipeEconomics({
    buildingDef,
    recipe,
    prices: world.goods.prices,
    marketWages: world.labor.marketWages,
    wageMultipliers: getBuildingWageMultipliers(world, buildingId),
  });
}

export function calculateBuildingOutputUnitEconomics(
  world: GameWorld,
  buildingId: number,
  outputGoodsId: number,
): OutputUnitEconomics {
  const recipe = getBuildingRecipeFromInstance(world, buildingId);
  const output = recipe.outputs.find((entry) => entry.goodsId === outputGoodsId);
  const economics = calculateBuildingProductionEconomics(world, buildingId);
  const ticksRequired = Math.max(1, recipe.ticksRequired || TICKS_PER_DAY);
  const outputAmount = output ? Math.max(0, output.amount) / ticksRequired : 0;
  const outputRevenue = outputAmount * getSafePrice(world.goods.prices, outputGoodsId);
  const byproductRevenue = Math.max(0, economics.revenue - outputRevenue);
  const netCost = Math.max(0, economics.totalCost - byproductRevenue);
  const breakEvenPrice = outputAmount > 0 ? netCost / outputAmount : Number.POSITIVE_INFINITY;

  return {
    ...economics,
    goodsId: outputGoodsId,
    outputAmount,
    outputRevenue,
    byproductRevenue,
    breakEvenPrice,
  };
}
