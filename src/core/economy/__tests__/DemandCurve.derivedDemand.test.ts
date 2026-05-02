import { describe, expect, it } from 'vitest';

import { initProductionCache } from '@/core/production/ProductionEngine';
import { getBuildingProductionVariants, initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

import { createGameWorld } from '../../world/GameWorld';
import { calculateDerivedDemand } from '../DemandCurve';

describe('derived demand realism', () => {
  it('does not create upstream factory demand from inactive production templates', () => {
    const world = createGameWorld();

    world.goods.demands[GoodsId.SMARTPHONE] = 10_000;
    world.goods.demands[GoodsId.COMPUTER] = 10_000;

    calculateDerivedDemand(world);

    expect(world.goods.demands[GoodsId.ELECTRONICS]).toBe(0);
    expect(world.goods.demands[GoodsId.CHIPS]).toBe(0);
    expect(world.goods.demands[GoodsId.GLASS]).toBe(0);
  });

  it('does not keep deriving steel demand for a blocked parts line whose steel buffer is already full', () => {
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createGameWorld();
    world.goods.count = 80;
    world.companies.count = 2;

    const partsVariant = getBuildingProductionVariants(BuildingId.PARTS_FACTORY)
      .find(variant => variant.recipe.inputs.some(input => input.goodsId === GoodsId.PLASTIC));
    expect(partsVariant).toBeDefined();

    const buildingId = addBuilding(world, 1, BuildingId.PARTS_FACTORY, {
      slotMethods: partsVariant!.slotMethods,
    });

    const recipe = partsVariant!.recipe;
    const steelInputIndex = recipe.inputs.findIndex(input => input.goodsId === GoodsId.STEEL);
    const plasticInputIndex = recipe.inputs.findIndex(input => input.goodsId === GoodsId.PLASTIC);
    expect(steelInputIndex).toBeGreaterThanOrEqual(0);
    expect(plasticInputIndex).toBeGreaterThanOrEqual(0);

    const inputOffset = buildingId * 8;
    world.buildings.inputBuffers[inputOffset + steelInputIndex] = recipe.inputs[steelInputIndex].amount * 7;
    world.buildings.inputBuffers[inputOffset + plasticInputIndex] = 0;
    world.goods.demands[GoodsId.CAR_PARTS] = 50_000;

    calculateDerivedDemand(world);

    expect(world.goods.demands[GoodsId.STEEL]).toBe(0);
    expect(world.goods.demands[GoodsId.PLASTIC]).toBeGreaterThan(0);
  });

  it('keeps generating replenishment demand for empty active input buffers even when downstream demand is temporarily zero', () => {
    initializeBuildingProductionMethods();
    initProductionCache();

    const world = createGameWorld();
    world.goods.count = 80;
    world.companies.count = 2;

    const buildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, {
      slotMethods: getBuildingProductionVariants(BuildingId.STEEL_MILL)[0].slotMethods,
    });

    const recipe = getBuildingProductionVariants(BuildingId.STEEL_MILL)[0].recipe;
    expect(recipe.inputs.length).toBeGreaterThan(0);

    const replenishmentInput = recipe.inputs[0];
    const inputOffset = buildingId * 8;
    world.buildings.inputBuffers[inputOffset] = 0;
    world.goods.demands[GoodsId.STEEL] = 0;
    world.goods.demands[replenishmentInput.goodsId] = 0;

    calculateDerivedDemand(world);

    expect(world.goods.demands[replenishmentInput.goodsId]).toBeGreaterThan(0);
  });
});
