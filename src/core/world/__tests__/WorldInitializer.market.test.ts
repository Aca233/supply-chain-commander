import { describe, expect, it } from 'vitest';
import { initializeWorld } from '../WorldInitializer';
import {
  BuildingId,
  RETAIL_BUILDINGS,
  getRetailConfig,
  isRetailBuilding,
} from '@/data/buildings';
import {
  GOODS_COUNT,
  RETAIL_BUILDING_COUNT,
  RETAIL_BUILDING_START_ID,
} from '@/core/constants';
import { canRetailServeConsumers } from '@/core/economy/ConsumerMarket';
import { SLOT_CONFIGS_BY_BUILDING, getBuildingSlotCount } from '@/core/production/ProductionMethods';
import { CONVENIENCE_SUBSIDIARIES } from '@/core/production/subsidiaries/retail';

describe('WorldInitializer retail bootstrap', () => {
  it('registers one valid convenience store with zero startup stock', () => {
    const world = initializeWorld();

    expect(RETAIL_BUILDINGS.length).toBeGreaterThan(0);
    expect(world.retail.count).toBe(1);

    const retailId = 0;
    const retailBuildingId = world.retail.buildingIds[retailId];
    const retailBuildingType = world.buildings.types[retailBuildingId];

    expect(retailBuildingType).toBe(BuildingId.CONVENIENCE_STORE);
    expect(isRetailBuilding(retailBuildingType)).toBe(true);

    const retailConfig = getRetailConfig(retailBuildingType);
    expect(retailConfig).toBeDefined();

    const startupStock = retailConfig!.allowedGoodsIds.reduce((total, goodsId) => {
      const inventoryIndex = retailId * GOODS_COUNT + goodsId;
      return total + world.retail.inventories[inventoryIndex];
    }, 0);

    expect(startupStock).toBe(0);
    expect(canRetailServeConsumers(world)).toBe(false);

    expect(RETAIL_BUILDING_START_ID).toBe(BuildingId.CONVENIENCE_STORE);
    expect(RETAIL_BUILDING_COUNT).toBe(RETAIL_BUILDINGS.length);
    expect(getBuildingSlotCount(BuildingId.CONVENIENCE_STORE)).toBe(1);
    expect(SLOT_CONFIGS_BY_BUILDING.has(BuildingId.CONVENIENCE_STORE)).toBe(true);
    expect(SLOT_CONFIGS_BY_BUILDING.has(49)).toBe(false);
    expect(
      CONVENIENCE_SUBSIDIARIES.every(sub =>
        sub.applicableBuildingTypes.includes(BuildingId.CONVENIENCE_STORE)
      )
    ).toBe(true);
  });
});
