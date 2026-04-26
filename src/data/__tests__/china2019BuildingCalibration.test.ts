import { describe, expect, it } from 'vitest';

import {
  BUILDINGS_BY_ID,
  BuildingId,
  getBuildingOutputMode,
  type OutputMode,
} from '@/data/buildings';
import { getBuildingConstructionConfig } from '@/data/buildingMaterials';
import { GoodsId } from '@/data/goods';

function getInputAmount(config: { inputs: { goodsId: number; amount: number }[] }, goodsId: number): number {
  return config.inputs.find((input) => input.goodsId === goodsId)?.amount ?? 0;
}

function getOutputAmount(config: { outputs: { goodsId: number; amount: number }[] }, goodsId: number): number {
  return config.outputs.find((output) => output.goodsId === goodsId)?.amount ?? 0;
}

function getRequiredMode(buildingId: number, modeId: number): OutputMode {
  const mode = getBuildingOutputMode(buildingId, modeId);
  expect(mode).toBeDefined();
  return mode!;
}

function getBaseMaterialAmount(buildingId: number, goodsId: number): number {
  const config = getBuildingConstructionConfig(buildingId);
  expect(config).toBeDefined();
  return config!.baseMaterials.find((material) => material.goodsId === goodsId)?.amount ?? 0;
}

describe('china 2019 building calibration baseline', () => {
  it('keeps the coal-power-infrastructure chain on a high-throughput footing', () => {
    const coalMine = BUILDINGS_BY_ID.get(BuildingId.COAL_MINE);
    const oilField = BUILDINGS_BY_ID.get(BuildingId.OIL_FIELD);
    const gasField = BUILDINGS_BY_ID.get(BuildingId.GAS_FIELD);
    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL);
    const refinery = BUILDINGS_BY_ID.get(BuildingId.REFINERY);
    const chemicalPlant = BUILDINGS_BY_ID.get(BuildingId.CHEMICAL_PLANT);
    const glassFactory = BUILDINGS_BY_ID.get(BuildingId.GLASS_FACTORY);
    const cementFactory = BUILDINGS_BY_ID.get(BuildingId.CEMENT_FACTORY);
    const buildingMaterialsFactory = BUILDINGS_BY_ID.get(BuildingId.BUILDING_MATERIALS_FACTORY);
    const powerPlant = BUILDINGS_BY_ID.get(BuildingId.POWER_PLANT);
    const coalPowerMode = getRequiredMode(BuildingId.POWER_PLANT, 0);
    const gasPowerMode = getRequiredMode(BuildingId.POWER_PLANT, 1);

    expect(coalMine).toBeDefined();
    expect(oilField).toBeDefined();
    expect(gasField).toBeDefined();
    expect(steelMill).toBeDefined();
    expect(refinery).toBeDefined();
    expect(chemicalPlant).toBeDefined();
    expect(glassFactory).toBeDefined();
    expect(cementFactory).toBeDefined();
    expect(buildingMaterialsFactory).toBeDefined();
    expect(powerPlant).toBeDefined();

    expect(coalMine!.buildCost).toBe(650_000);
    expect(coalMine!.buildTime).toBe(42);
    expect(coalMine!.powerConsumption).toBe(18);
    expect(getOutputAmount(coalMine!.production, GoodsId.COAL)).toBe(240);
    expect(coalMine!.production.laborRequired).toBe(55);
    expect(coalMine!.production.energyRequired).toBe(220);

    expect(oilField!.buildCost).toBe(3_500_000);
    expect(getOutputAmount(oilField!.production, GoodsId.CRUDE_OIL)).toBe(130);
    expect(gasField!.buildCost).toBe(3_000_000);
    expect(getOutputAmount(gasField!.production, GoodsId.NATURAL_GAS)).toBe(180);

    expect(steelMill!.buildCost).toBe(6_500_000);
    expect(steelMill!.buildTime).toBe(132);
    expect(steelMill!.powerConsumption).toBe(150);
    expect(getInputAmount(steelMill!.production, GoodsId.IRON_ORE)).toBe(220);
    expect(getInputAmount(steelMill!.production, GoodsId.COAL)).toBe(110);
    expect(getOutputAmount(steelMill!.production, GoodsId.STEEL)).toBe(240);
    expect(steelMill!.production.ticksRequired).toBe(2);

    expect(refinery!.buildCost).toBe(9_000_000);
    expect(refinery!.buildTime).toBe(168);
    expect(getInputAmount(refinery!.production, GoodsId.CRUDE_OIL)).toBe(180);
    expect(getOutputAmount(refinery!.production, GoodsId.FUEL)).toBe(120);
    expect(getOutputAmount(refinery!.production, GoodsId.PLASTIC)).toBe(70);

    expect(chemicalPlant!.buildCost).toBe(5_500_000);
    expect(getInputAmount(chemicalPlant!.production, GoodsId.CRUDE_OIL)).toBe(90);
    expect(getInputAmount(chemicalPlant!.production, GoodsId.NATURAL_GAS)).toBe(40);
    expect(getOutputAmount(chemicalPlant!.production, GoodsId.CHEMICALS)).toBe(110);

    expect(glassFactory!.buildCost).toBe(2_200_000);
    expect(getInputAmount(glassFactory!.production, GoodsId.SILICON)).toBe(140);
    expect(getOutputAmount(glassFactory!.production, GoodsId.GLASS)).toBe(130);

    expect(cementFactory!.buildCost).toBe(2_800_000);
    expect(getInputAmount(cementFactory!.production, GoodsId.SILICON)).toBe(70);
    expect(getInputAmount(cementFactory!.production, GoodsId.COAL)).toBe(45);
    expect(getOutputAmount(cementFactory!.production, GoodsId.CEMENT)).toBe(260);

    expect(buildingMaterialsFactory!.buildCost).toBe(2_100_000);
    expect(getInputAmount(buildingMaterialsFactory!.production, GoodsId.CEMENT)).toBe(120);
    expect(getInputAmount(buildingMaterialsFactory!.production, GoodsId.STEEL)).toBe(55);
    expect(getInputAmount(buildingMaterialsFactory!.production, GoodsId.GLASS)).toBe(20);
    expect(getOutputAmount(buildingMaterialsFactory!.production, GoodsId.BUILDING_MATERIALS)).toBe(140);

    expect(powerPlant!.buildCost).toBe(12_000_000);
    expect(powerPlant!.buildTime).toBe(192);
    expect(getInputAmount(coalPowerMode, GoodsId.COAL)).toBe(180);
    expect(getOutputAmount(coalPowerMode, GoodsId.ELECTRICITY)).toBe(1_200);
    expect(getInputAmount(gasPowerMode, GoodsId.NATURAL_GAS)).toBe(120);
    expect(getOutputAmount(gasPowerMode, GoodsId.ELECTRICITY)).toBe(1_000);
  });

  it('keeps manufacturing stronger than luxury while preserving a 2019 export mix', () => {
    const electronicsFactory = BUILDINGS_BY_ID.get(BuildingId.ELECTRONICS_FACTORY);
    const semiconductorFab = BUILDINGS_BY_ID.get(BuildingId.SEMICONDUCTOR_FAB);
    const partsFactory = BUILDINGS_BY_ID.get(BuildingId.PARTS_FACTORY);
    const carFactory = BUILDINGS_BY_ID.get(BuildingId.CAR_FACTORY);
    const applianceFactory = BUILDINGS_BY_ID.get(BuildingId.APPLIANCE_FACTORY);
    const furnitureFactory = BUILDINGS_BY_ID.get(BuildingId.FURNITURE_FACTORY);
    const foodFactory = BUILDINGS_BY_ID.get(BuildingId.FOOD_FACTORY);
    const pharmaFactory = BUILDINGS_BY_ID.get(BuildingId.PHARMA_FACTORY);
    const luxuryWorkshop = BUILDINGS_BY_ID.get(BuildingId.LUXURY_WORKSHOP);

    const smartphoneMode = getRequiredMode(BuildingId.ELECTRONICS_FACTORY, 1);
    const computerMode = getRequiredMode(BuildingId.ELECTRONICS_FACTORY, 2);
    const carPartsMode = getRequiredMode(BuildingId.PARTS_FACTORY, 2);
    const fuelCarMode = getRequiredMode(BuildingId.CAR_FACTORY, 0);
    const electricCarMode = getRequiredMode(BuildingId.CAR_FACTORY, 1);
    const clothingMode = getRequiredMode(BuildingId.FURNITURE_FACTORY, 1);
    const beverageMode = getRequiredMode(BuildingId.FOOD_FACTORY, 1);
    const genericDrugMode = getRequiredMode(BuildingId.PHARMA_FACTORY, 3);
    const otcDrugMode = getRequiredMode(BuildingId.PHARMA_FACTORY, 5);
    const jewelryMode = getRequiredMode(BuildingId.LUXURY_WORKSHOP, 0);

    expect(electronicsFactory).toBeDefined();
    expect(semiconductorFab).toBeDefined();
    expect(partsFactory).toBeDefined();
    expect(carFactory).toBeDefined();
    expect(applianceFactory).toBeDefined();
    expect(furnitureFactory).toBeDefined();
    expect(foodFactory).toBeDefined();
    expect(pharmaFactory).toBeDefined();
    expect(luxuryWorkshop).toBeDefined();

    expect(electronicsFactory!.buildCost).toBe(6_500_000);
    expect(getOutputAmount(electronicsFactory!.production, GoodsId.ELECTRONICS)).toBe(40);
    expect(electronicsFactory!.production.ticksRequired).toBe(2);
    expect(getOutputAmount(smartphoneMode, GoodsId.SMARTPHONE)).toBe(14);
    expect(smartphoneMode.ticksRequired).toBe(2);
    expect(getOutputAmount(computerMode, GoodsId.COMPUTER)).toBe(6);
    expect(computerMode.ticksRequired).toBe(3);

    expect(semiconductorFab!.buildCost).toBe(35_000_000);
    expect(semiconductorFab!.buildTime).toBe(300);
    expect(getOutputAmount(semiconductorFab!.production, GoodsId.CHIPS)).toBe(12);
    expect(semiconductorFab!.production.ticksRequired).toBe(4);

    expect(partsFactory!.buildCost).toBe(4_500_000);
    expect(getOutputAmount(partsFactory!.production, GoodsId.MOTOR)).toBe(30);
    expect(getOutputAmount(carPartsMode, GoodsId.CAR_PARTS)).toBe(72);
    expect(carPartsMode.ticksRequired).toBe(3);

    expect(carFactory!.buildCost).toBe(15_000_000);
    expect(fuelCarMode.ticksRequired).toBe(4);
    expect(getOutputAmount(fuelCarMode, GoodsId.CAR)).toBe(1);
    expect(electricCarMode.ticksRequired).toBe(7);
    expect(getOutputAmount(electricCarMode, GoodsId.ELECTRIC_CAR)).toBe(1);

    expect(applianceFactory!.buildCost).toBe(5_500_000);
    expect(getOutputAmount(applianceFactory!.production, GoodsId.APPLIANCES)).toBe(12);
    expect(applianceFactory!.production.ticksRequired).toBe(4);

    expect(getOutputAmount(foodFactory!.production, GoodsId.PROCESSED_FOOD)).toBe(120);
    expect(getOutputAmount(beverageMode, GoodsId.BEVERAGES)).toBe(160);
    expect(getOutputAmount(clothingMode, GoodsId.CLOTHING)).toBe(60);
    expect(getOutputAmount(genericDrugMode, GoodsId.GENERIC_DRUG)).toBe(240);
    expect(getOutputAmount(otcDrugMode, GoodsId.OTC_DRUG)).toBe(140);

    expect(getInputAmount(jewelryMode, GoodsId.GOLD)).toBe(0.35);
    expect(getInputAmount(jewelryMode, GoodsId.DIAMOND)).toBe(0.3);
    expect(getOutputAmount(jewelryMode, GoodsId.JEWELRY)).toBe(2);
    expect(jewelryMode.ticksRequired).toBe(6);
  });

  it('keeps heavy-industry construction gates well above retail and trims new-energy bias from power builds', () => {
    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL);
    const powerPlant = BUILDINGS_BY_ID.get(BuildingId.POWER_PLANT);
    const convenienceStore = BUILDINGS_BY_ID.get(BuildingId.CONVENIENCE_STORE);

    const steelConstruction = getBuildingConstructionConfig(BuildingId.STEEL_MILL);
    const semiconductorConstruction = getBuildingConstructionConfig(BuildingId.SEMICONDUCTOR_FAB);
    const powerConstruction = getBuildingConstructionConfig(BuildingId.POWER_PLANT);
    const convenienceConstruction = getBuildingConstructionConfig(BuildingId.CONVENIENCE_STORE);

    expect(steelMill).toBeDefined();
    expect(powerPlant).toBeDefined();
    expect(convenienceStore).toBeDefined();
    expect(steelConstruction).toBeDefined();
    expect(semiconductorConstruction).toBeDefined();
    expect(powerConstruction).toBeDefined();
    expect(convenienceConstruction).toBeDefined();

    expect(steelMill!.buildTime).toBe(132);
    expect(powerPlant!.buildTime).toBe(192);
    expect(convenienceStore!.buildTime).toBe(36);

    expect(getBaseMaterialAmount(BuildingId.STEEL_MILL, GoodsId.STEEL)).toBe(8_000);
    expect(getBaseMaterialAmount(BuildingId.STEEL_MILL, GoodsId.CEMENT)).toBe(5_000);
    expect(getBaseMaterialAmount(BuildingId.SEMICONDUCTOR_FAB, GoodsId.ELECTRONICS)).toBe(2_800);
    expect(getBaseMaterialAmount(BuildingId.SEMICONDUCTOR_FAB, GoodsId.INDUSTRIAL_ROBOT)).toBe(80);

    expect(getBaseMaterialAmount(BuildingId.POWER_PLANT, GoodsId.STEEL)).toBe(12_000);
    expect(getBaseMaterialAmount(BuildingId.POWER_PLANT, GoodsId.CEMENT)).toBe(8_000);
    expect(getBaseMaterialAmount(BuildingId.POWER_PLANT, GoodsId.SOLAR_SYSTEM)).toBe(0);
    expect(getBaseMaterialAmount(BuildingId.POWER_PLANT, GoodsId.ENERGY_STORAGE)).toBe(0);

    expect(getBaseMaterialAmount(BuildingId.CONVENIENCE_STORE, GoodsId.STEEL)).toBe(220);
    expect(getBaseMaterialAmount(BuildingId.CONVENIENCE_STORE, GoodsId.ELECTRONICS)).toBe(20);
    expect(getBaseMaterialAmount(BuildingId.CONVENIENCE_STORE, GoodsId.APPLIANCES)).toBe(0);

    expect(steelConstruction!.workers).toBe(260);
    expect(semiconductorConstruction!.workers).toBe(620);
    expect(powerConstruction!.workers).toBe(280);
    expect(convenienceConstruction!.workers).toBe(25);
  });
});
