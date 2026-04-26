import { describe, expect, it } from 'vitest';

import { BUILDINGS_BY_ID, BuildingId, getBuildingProduction } from '@/data/buildings';
import { getBuildingConstructionConfig } from '@/data/buildingMaterials';
import { GoodsId } from '@/data/goods';

function getDailyOutput(buildingId: number, goodsId: number, outputModeId?: number) {
  const production = getBuildingProduction(buildingId, outputModeId);
  const output = production?.outputs.find((entry) => entry.goodsId === goodsId)?.amount ?? 0;
  const ticksRequired = production?.ticksRequired ?? 1;

  return output / ticksRequired;
}

function getMaterialAmount(buildingId: number, goodsId: number) {
  const config = getBuildingConstructionConfig(buildingId);
  return config?.baseMaterials.find((entry) => entry.goodsId === goodsId)?.amount ?? 0;
}

function hasBaseMaterial(buildingId: number, goodsId: number) {
  return getMaterialAmount(buildingId, goodsId) > 0;
}

describe('china 2019 industrial baseline regression guards', () => {
  it('keeps infrastructure throughput ahead of frontier and luxury output', () => {
    const steelDaily = getDailyOutput(BuildingId.STEEL_MILL, GoodsId.STEEL);
    const chipDaily = getDailyOutput(BuildingId.SEMICONDUCTOR_FAB, GoodsId.CHIPS);
    const smartphoneDaily = getDailyOutput(BuildingId.ELECTRONICS_FACTORY, GoodsId.SMARTPHONE, 1);
    const fuelCarDaily = getDailyOutput(BuildingId.CAR_FACTORY, GoodsId.CAR, 0);
    const electricCarDaily = getDailyOutput(BuildingId.CAR_FACTORY, GoodsId.ELECTRIC_CAR, 1);
    const genericDrugDaily = getDailyOutput(BuildingId.PHARMA_FACTORY, GoodsId.GENERIC_DRUG, 3);
    const jewelryDaily = getDailyOutput(BuildingId.LUXURY_WORKSHOP, GoodsId.JEWELRY, 0);

    expect(steelDaily).toBeGreaterThan(chipDaily * 20);
    // Exact output values are locked in the building baseline suite.
    // Keep this suite focused on broad hierarchy instead of contradicting that baseline.
    expect(smartphoneDaily).toBeGreaterThan(chipDaily * 2);
    expect(fuelCarDaily).toBeGreaterThan(electricCarDaily * 1.5);
    expect(genericDrugDaily).toBeGreaterThan(jewelryDaily * 80);
  });

  it('keeps sector cost structure aligned with industry profiles', () => {
    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL);
    const refinery = BUILDINGS_BY_ID.get(BuildingId.REFINERY);
    const electronicsFactory = BUILDINGS_BY_ID.get(BuildingId.ELECTRONICS_FACTORY);
    const semiconductorFab = BUILDINGS_BY_ID.get(BuildingId.SEMICONDUCTOR_FAB);
    const pharmaFactory = BUILDINGS_BY_ID.get(BuildingId.PHARMA_FACTORY);
    const convenienceStore = BUILDINGS_BY_ID.get(BuildingId.CONVENIENCE_STORE);

    expect(steelMill).toBeDefined();
    expect(refinery).toBeDefined();
    expect(electronicsFactory).toBeDefined();
    expect(semiconductorFab).toBeDefined();
    expect(pharmaFactory).toBeDefined();
    expect(convenienceStore).toBeDefined();

    expect(steelMill!.energyCost).toBeGreaterThan(steelMill!.maintenanceCost);
    expect(refinery!.energyCost).toBeGreaterThan(refinery!.maintenanceCost);
    expect(semiconductorFab!.maintenanceCost).toBeGreaterThan(electronicsFactory!.maintenanceCost * 4);
    expect(pharmaFactory!.maintenanceCost).toBeGreaterThan(electronicsFactory!.maintenanceCost);
    expect(convenienceStore!.laborCost).toBeGreaterThan(convenienceStore!.energyCost);
  });

  it('keeps construction capital density centered on heavy industry and coal power', () => {
    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL);
    const powerPlant = BUILDINGS_BY_ID.get(BuildingId.POWER_PLANT);
    const luxuryWorkshop = BUILDINGS_BY_ID.get(BuildingId.LUXURY_WORKSHOP);
    const convenienceStore = BUILDINGS_BY_ID.get(BuildingId.CONVENIENCE_STORE);
    const buildingMaterialsFactory = BUILDINGS_BY_ID.get(BuildingId.BUILDING_MATERIALS_FACTORY);

    expect(steelMill).toBeDefined();
    expect(powerPlant).toBeDefined();
    expect(luxuryWorkshop).toBeDefined();
    expect(convenienceStore).toBeDefined();
    expect(buildingMaterialsFactory).toBeDefined();

    expect(powerPlant!.buildCost).toBeGreaterThan(convenienceStore!.buildCost * 10);
    expect(steelMill!.buildCost).toBeGreaterThan(buildingMaterialsFactory!.buildCost * 3);
    expect(steelMill!.buildTime).toBeGreaterThan(convenienceStore!.buildTime * 2);
    expect(getMaterialAmount(BuildingId.POWER_PLANT, GoodsId.STEEL)).toBeGreaterThan(
      getMaterialAmount(BuildingId.CONVENIENCE_STORE, GoodsId.STEEL) * 20
    );
    expect(getMaterialAmount(BuildingId.STEEL_MILL, GoodsId.CEMENT)).toBeGreaterThan(
      getMaterialAmount(BuildingId.CONVENIENCE_STORE, GoodsId.CEMENT) * 4
    );
    expect(hasBaseMaterial(BuildingId.POWER_PLANT, GoodsId.SOLAR_SYSTEM)).toBe(false);
    expect(hasBaseMaterial(BuildingId.POWER_PLANT, GoodsId.ENERGY_STORAGE)).toBe(false);
  });
});
