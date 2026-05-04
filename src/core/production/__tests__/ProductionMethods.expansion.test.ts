import { beforeEach, describe, expect, it } from 'vitest';

import {
  getBuildingConfig,
  getBuildingProductionVariants,
  getDefaultSlotMethods,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { ALL_BUILDINGS, BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

const ALL_NON_RETAIL_TARGETS = ALL_BUILDINGS
  .filter((building) => building.category !== 'retail' && building.category !== 'warehouse')
  .map((building) => building.id);

const RETAIL_TARGETS = ALL_BUILDINGS
  .filter((building) => building.category === 'retail')
  .map((building) => building.id);

const EQUIPMENT_METHOD_INPUT_REQUIREMENTS = [
  {
    buildingTypeId: BuildingId.IRON_MINE,
    key: 'open_pit_blasting',
    requiredInputs: [GoodsId.CHEMICALS],
  },
  {
    buildingTypeId: BuildingId.IRON_MINE,
    key: 'electric_drills',
    requiredInputs: [GoodsId.MOTOR, GoodsId.MECHANICAL_PARTS],
  },
  {
    buildingTypeId: BuildingId.LITHIUM_MINE,
    key: 'brine_pumping',
    requiredInputs: [GoodsId.MOTOR],
  },
  {
    buildingTypeId: BuildingId.STEEL_MILL,
    key: 'continuous_casting',
    requiredInputs: [GoodsId.MECHANICAL_PARTS],
  },
  {
    buildingTypeId: BuildingId.FARM,
    key: 'mechanized_cultivation',
    requiredInputs: [GoodsId.FUEL, GoodsId.MECHANICAL_PARTS],
  },
  {
    buildingTypeId: BuildingId.FARM,
    key: 'silo_packing',
    requiredInputs: [GoodsId.PACKAGING, GoodsId.MECHANICAL_PARTS],
  },
  {
    buildingTypeId: BuildingId.FISHERY,
    key: 'aquaculture_pens',
    requiredInputs: [GoodsId.GRAIN, GoodsId.PLASTIC],
  },
  {
    buildingTypeId: BuildingId.STEEL_MILL,
    key: 'oxygen_furnace',
    requiredInputs: [GoodsId.COAL, GoodsId.CHEMICALS],
  },
  {
    buildingTypeId: BuildingId.CHEMICAL_PLANT,
    key: 'catalytic_cracking',
    requiredInputs: [GoodsId.NATURAL_GAS, GoodsId.CHEMICALS],
  },
  {
    buildingTypeId: BuildingId.FOOD_FACTORY,
    key: 'cold_chain_processing',
    requiredInputs: [GoodsId.PACKAGING, GoodsId.MECHANICAL_PARTS],
  },
  {
    buildingTypeId: BuildingId.FOOD_FACTORY,
    key: 'automatic_packaging',
    requiredInputs: [GoodsId.PACKAGING, GoodsId.MECHANICAL_PARTS, GoodsId.ELECTRONICS],
  },
  {
    buildingTypeId: BuildingId.MEAT_PROCESSING,
    key: 'refrigerated_cutting',
    requiredInputs: [GoodsId.PACKAGING, GoodsId.MECHANICAL_PARTS],
  },
  {
    buildingTypeId: BuildingId.PARTS_FACTORY,
    key: 'cnc_precision',
    requiredInputs: [GoodsId.ELECTRONICS, GoodsId.MOTOR],
  },
  {
    buildingTypeId: BuildingId.PARTS_FACTORY,
    key: 'stamping_casting',
    requiredInputs: [GoodsId.CHEMICALS, GoodsId.MECHANICAL_PARTS],
  },
  {
    buildingTypeId: BuildingId.POWER_PLANT,
    key: 'smart_grid',
    requiredInputs: [GoodsId.ELECTRONICS, GoodsId.MECHANICAL_PARTS],
  },
] as const;

beforeEach(() => {
  initializeBuildingProductionMethods();
  initProductionCache();
});

describe('Victoria 3 style production method expansion', () => {
  it('gives every non-retail building production plus at least one Victoria-style method slot', () => {
    const missing = ALL_NON_RETAIL_TARGETS
      .map((buildingTypeId) => {
        const config = getBuildingConfig(buildingTypeId);
        return {
          buildingTypeId,
          slots: config?.slots.map((slot) => slot.id) ?? [],
        };
      })
      .filter((entry) => entry.slots.length < 2 || !entry.slots.includes('production'));

    expect(missing).toEqual([]);
  });

  it('keeps retail buildings out of the production-method system', () => {
    const productionRetail = RETAIL_TARGETS.flatMap((buildingTypeId) => {
      const config = getBuildingConfig(buildingTypeId);
      if (!config) return [];
      return config.slots.length > 0 || config.methods.length > 0 ? [`${buildingTypeId}: has production config`] : [];
    });

    expect(productionRetail).toEqual([]);
  });

  it('keeps legacy production choices available through the production slot', () => {
    const farmVariants = getBuildingProductionVariants(BuildingId.FARM);

    expect(farmVariants.map((variant) => variant.legacyOutputModeId)).toContain(0);
    expect(farmVariants.map((variant) => variant.name)).toContain('粮食种植');
    expect(farmVariants.map((variant) => variant.name)).toContain('棉花种植');
    expect(farmVariants.every((variant) => variant.slotId === 'production')).toBe(true);
  });

  it('composes non-production method slots into the final recipe', () => {
    const config = getBuildingConfig(BuildingId.STEEL_MILL);
    expect(config).not.toBeNull();

    const baseRecipe = getRecipeForBuilding(
      BuildingId.STEEL_MILL,
      getDefaultSlotMethods(BuildingId.STEEL_MILL),
    );
    const productionMethod = config!.methods.find(
      (method) => method.slotId === 'production' && method.name === '炼钢',
    );
    const oxygenFurnace = config!.methods.find(
      (method) => method.slotId === 'refining' && method.key.includes('oxygen_furnace'),
    );

    expect(productionMethod).toBeDefined();
    expect(oxygenFurnace).toBeDefined();

    const modifiedRecipe = getRecipeForBuilding(BuildingId.STEEL_MILL, {
      ...config!.defaultMethods,
      production: productionMethod!.id,
      refining: oxygenFurnace!.id,
    });
    const baseSteel = baseRecipe.outputs.find((entry) => entry.goodsId === GoodsId.STEEL)?.amount ?? 0;
    const modifiedSteel = modifiedRecipe.outputs.find((entry) => entry.goodsId === GoodsId.STEEL)?.amount ?? 0;

    expect(modifiedSteel).toBeGreaterThan(baseSteel);
    expect(modifiedRecipe.energyRequired).toBeGreaterThan(baseRecipe.energyRequired);
  });

  it('uses electricity goods as the recipe input for positive energy demand', () => {
    const recipe = getRecipeForBuilding(
      BuildingId.STEEL_MILL,
      getDefaultSlotMethods(BuildingId.STEEL_MILL),
    );
    const electricityInput = recipe.inputs.find((entry) => entry.goodsId === GoodsId.ELECTRICITY);

    expect(recipe.energyRequired).toBeGreaterThan(0);
    expect(electricityInput?.amount).toBe(recipe.energyRequired);
  });

  it('does not make power plants consume electricity to produce electricity', () => {
    const recipe = getRecipeForBuilding(
      BuildingId.POWER_PLANT,
      getDefaultSlotMethods(BuildingId.POWER_PLANT),
    );

    expect(recipe.outputs.some((entry) => entry.goodsId === GoodsId.ELECTRICITY)).toBe(true);
    expect(recipe.inputs.some((entry) => entry.goodsId === GoodsId.ELECTRICITY)).toBe(false);
  });

  it('uses unlock levels for advanced Victoria-style methods', () => {
    const unlockedTooEarly = ALL_NON_RETAIL_TARGETS.flatMap((buildingTypeId) => {
      const config = getBuildingConfig(buildingTypeId);
      if (!config) return [`${buildingTypeId}: missing config`];
      const advanced = config.methods.filter(
        (method) => method.slotId !== 'production' && method.requiredLevel > 1,
      );
      return advanced.length === 0 ? [`${buildingTypeId}: missing advanced methods`] : [];
    });

    expect(unlockedTooEarly).toEqual([]);
  });

  it('does not let shared process slots emit mutually exclusive production goods', () => {
    const multiProductTargets = ALL_NON_RETAIL_TARGETS.filter((buildingTypeId) => {
      const config = getBuildingConfig(buildingTypeId);
      if (!config) return false;
      const productionMethods = config.methods.filter((method) => method.slotId === 'production');
      const productionGoods = new Set(
        productionMethods.flatMap((method) => method.outputDelta.map((output) => output.goodsId)),
      );
      return productionMethods.length > 1 && productionGoods.size > 1;
    });

    const mixedProducts = multiProductTargets.flatMap((buildingTypeId) => {
      const config = getBuildingConfig(buildingTypeId);
      if (!config) return [`${buildingTypeId}: missing config`];

      const productionGoods = new Set(
        config.methods
          .filter((method) => method.slotId === 'production')
          .flatMap((method) => method.outputDelta.map((output) => output.goodsId)),
      );

      return config.methods
        .filter((method) => method.slotId !== 'production')
        .flatMap((method) =>
          method.outputDelta
            .filter((output) => productionGoods.has(output.goodsId))
            .map((output) => `${buildingTypeId}:${method.name}->${output.goodsId}`),
        );
    });

    expect(mixedProducts).toEqual([]);
  });

  it('models factory automation as workforce/process changes instead of extra finished goods', () => {
    const automationIssues = ALL_NON_RETAIL_TARGETS.flatMap((buildingTypeId) => {
      const building = ALL_BUILDINGS.find((candidate) => candidate.id === buildingTypeId);
      if (!building || building.category === 'extraction' || building.category === 'service') return [];

      const config = getBuildingConfig(buildingTypeId);
      if (!config) return [`${buildingTypeId}: missing config`];

      const productionGoods = new Set(
        config.methods
          .filter((method) => method.slotId === 'production')
          .flatMap((method) => method.outputDelta.map((output) => output.goodsId)),
      );

      return config.methods
        .filter((method) => method.slotId === 'automation' && !method.key.endsWith('_standard'))
        .flatMap((method) => {
          const issues: string[] = [];
          if (method.workforceDelta.basic >= 0) {
            issues.push(`${buildingTypeId}:${method.name}:basic`);
          }
          if (method.outputDelta.some((output) => productionGoods.has(output.goodsId))) {
            issues.push(`${buildingTypeId}:${method.name}:output`);
          }
          return issues;
        });
    });

    expect(automationIssues).toEqual([]);
  });

  it('requires real inputs for every non-standard non-production method', () => {
    const missingInputs = ALL_NON_RETAIL_TARGETS.flatMap((buildingTypeId) => {
      const config = getBuildingConfig(buildingTypeId);
      if (!config) return [`${buildingTypeId}: missing config`];

      return config.methods
        .filter((method) => method.slotId !== 'production' && !method.key.endsWith('_standard'))
        .filter((method) => !method.inputDelta.some((input) => input.amount > 0))
        .map((method) => `${buildingTypeId}:${method.name}:missing input`);
    });

    expect(missingInputs).toEqual([]);
  });

  it('keeps logistics and grid methods from creating material goods directly', () => {
    const carConfig = getBuildingConfig(BuildingId.CAR_FACTORY);
    const jitLogistics = carConfig!.methods.find((method) => method.key.includes('just_in_time_logistics'));
    expect(jitLogistics).toBeDefined();
    expect(jitLogistics!.outputDelta.some((output) => output.goodsId === GoodsId.CAR_PARTS)).toBe(false);
    expect(jitLogistics!.inputDelta.find((input) => input.goodsId === GoodsId.CAR_PARTS)?.amount).toBeLessThan(0);

    const powerConfig = getBuildingConfig(BuildingId.POWER_PLANT);
    const smartGrid = powerConfig!.methods.find((method) => method.key.includes('smart_grid'));
    expect(smartGrid).toBeDefined();
    expect(smartGrid!.outputDelta.some((output) => output.goodsId === GoodsId.ELECTRICITY)).toBe(false);
  });

  it('requires equipment or consumables for named equipment-heavy methods', () => {
    const missingInputs = EQUIPMENT_METHOD_INPUT_REQUIREMENTS.flatMap(({ buildingTypeId, key, requiredInputs }) => {
      const config = getBuildingConfig(buildingTypeId);
      if (!config) return [`${buildingTypeId}:${key}:missing config`];
      const method = config.methods.find((candidate) => candidate.key.includes(key));
      if (!method) return [`${buildingTypeId}:${key}:missing method`];

      return requiredInputs
        .filter((goodsId) => !method.inputDelta.some((input) => input.goodsId === goodsId && input.amount > 0))
        .map((goodsId) => `${buildingTypeId}:${method.name}:missing ${goodsId}`);
    });

    expect(missingInputs).toEqual([]);
  });
});
