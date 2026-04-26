import { describe, expect, it } from 'vitest';

import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { GOODS_BY_ID, GoodsId } from '@/data/goods';
import { getBuildingConstructionConfig } from '@/data/buildingMaterials';

describe('china 2019 calibration catalogue guards', () => {
  it('keeps core relative goods pricing and elasticity relationships', () => {
    const coal = GOODS_BY_ID.get(GoodsId.COAL);
    const cement = GOODS_BY_ID.get(GoodsId.CEMENT);
    const steel = GOODS_BY_ID.get(GoodsId.STEEL);
    const electricity = GOODS_BY_ID.get(GoodsId.ELECTRICITY);
    const food = GOODS_BY_ID.get(GoodsId.FOOD);
    const smartphone = GOODS_BY_ID.get(GoodsId.SMARTPHONE);
    const car = GOODS_BY_ID.get(GoodsId.CAR);
    const electricCar = GOODS_BY_ID.get(GoodsId.ELECTRIC_CAR);
    const jewelry = GOODS_BY_ID.get(GoodsId.JEWELRY);

    expect(coal).toBeDefined();
    expect(cement).toBeDefined();
    expect(steel).toBeDefined();
    expect(electricity).toBeDefined();
    expect(food).toBeDefined();
    expect(smartphone).toBeDefined();
    expect(car).toBeDefined();
    expect(electricCar).toBeDefined();
    expect(jewelry).toBeDefined();

    expect(coal!.basePrice).toBeLessThan(steel!.basePrice);
    expect(cement!.basePrice).toBeLessThan(steel!.basePrice);
    expect(electricity!.basePrice).toBeLessThan(food!.basePrice);
    expect(steel!.basePrice).toBeLessThan(smartphone!.basePrice);
    expect(car!.basePrice).toBeLessThan(electricCar!.basePrice);
    expect(food!.incomeElasticity).toBeLessThan(jewelry!.incomeElasticity);
  });

  it('keeps industrial throughput and construction intensity hierarchy', () => {
    const steelMill = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL);
    const semiconductorFab = BUILDINGS_BY_ID.get(BuildingId.SEMICONDUCTOR_FAB);
    const powerPlant = BUILDINGS_BY_ID.get(BuildingId.POWER_PLANT);
    const convenienceStore = BUILDINGS_BY_ID.get(BuildingId.CONVENIENCE_STORE);

    expect(steelMill).toBeDefined();
    expect(semiconductorFab).toBeDefined();
    expect(powerPlant).toBeDefined();
    expect(convenienceStore).toBeDefined();

    const steelOutputPerTick =
      steelMill!.production.outputs.find((output) => output.goodsId === GoodsId.STEEL)?.amount ?? 0;
    const chipsOutputPerTick =
      semiconductorFab!.production.outputs.find((output) => output.goodsId === GoodsId.CHIPS)?.amount ?? 0;

    const steelDailyThroughput = steelOutputPerTick / steelMill!.production.ticksRequired;
    const chipDailyThroughput = chipsOutputPerTick / semiconductorFab!.production.ticksRequired;

    expect(steelDailyThroughput).toBeGreaterThan(chipDailyThroughput * 20);
    expect(semiconductorFab!.buildCost).toBeGreaterThan(steelMill!.buildCost);
    expect(powerPlant!.buildTime).toBeGreaterThan(convenienceStore!.buildTime);

    const powerPlantConstruction = getBuildingConstructionConfig(BuildingId.POWER_PLANT);
    const convenienceStoreConstruction = getBuildingConstructionConfig(BuildingId.CONVENIENCE_STORE);

    expect(powerPlantConstruction).toBeDefined();
    expect(convenienceStoreConstruction).toBeDefined();
    expect(powerPlantConstruction!.baseMaterials.length).toBeGreaterThan(
      convenienceStoreConstruction!.baseMaterials.length
    );
  });
});
