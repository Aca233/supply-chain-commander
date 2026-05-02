import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeWorld } from '../WorldInitializer';
import { ALL_GOODS, GoodsId } from '@/data/goods';
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
import { getActiveOrderIndices } from '@/core/market/OrderBook';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WorldInitializer retail bootstrap', () => {
  it('registers one valid convenience store with zero startup stock', () => {
    const world = initializeWorld();

    expect(RETAIL_BUILDINGS.length).toBeGreaterThan(0);
    // 玩家 1 家便利店 + 28 家 AI 零售门店（含第二供应商）
    expect(world.retail.count).toBe(29);

    const retailId = 0;
    const retailBuildingId = world.retail.buildingIds[retailId];
    const retailBuildingType = world.buildings.types[retailBuildingId];

    // 玩家始终是 retailId=0 的便利店；开局即营业，等待进货上架
    expect(retailBuildingType).toBe(BuildingId.CONVENIENCE_STORE);
    expect(isRetailBuilding(retailBuildingType)).toBe(true);
    expect(world.buildings.isActive[retailBuildingId]).toBe(1);

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
  });

  it('seeds AI building-material inventories from the current 80-goods catalog', () => {
    const world = initializeWorld();
    const firstAiCompanyId = 1;

    expect(world.goods.count).toBe(ALL_GOODS.length);
    expect(world.goods.count).toBe(80);
    expect(world.companies.inventories[firstAiCompanyId * GOODS_COUNT + GoodsId.STEEL]).toBeGreaterThan(0);
    expect(world.companies.inventories[firstAiCompanyId * GOODS_COUNT + GoodsId.CEMENT]).toBeGreaterThan(0);
    expect(world.companies.inventories[firstAiCompanyId * GOODS_COUNT + GoodsId.GLASS]).toBeGreaterThan(0);
    expect(world.companies.inventories[firstAiCompanyId * GOODS_COUNT + GoodsId.BUILDING_MATERIALS]).toBeGreaterThan(0);
    expect(world.companies.inventories[firstAiCompanyId * GOODS_COUNT + GoodsId.BUILDING_PRODUCTS]).toBeGreaterThan(0);
  });

  it('does not seed more than a one-week steel buy backlog for any AI company at startup', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const world = initializeWorld();
    let worstPendingDays = 0;

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      let dailySteelNeed = 0;
      for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
        if (world.buildings.owners[buildingId] !== companyId) continue;
        if (!world.buildings.isActive[buildingId]) continue;

        const recipe = getBuildingRecipeFromInstance(world, buildingId);
        const steelInput = recipe.inputs.find(input => input.goodsId === GoodsId.STEEL);
        if (!steelInput) continue;

        dailySteelNeed += steelInput.amount / Math.max(1, recipe.ticksRequired || 1);
      }

      if (dailySteelNeed <= 0) continue;

      let pendingSteelBuy = 0;
      for (const orderIdx of getActiveOrderIndices()) {
        if (world.orders.companyIds[orderIdx] !== companyId) continue;
        if (world.orders.goodsIds[orderIdx] !== GoodsId.STEEL) continue;
        if (world.orders.types[orderIdx] !== 0) continue;
        pendingSteelBuy += world.orders.remainings[orderIdx];
      }

      worstPendingDays = Math.max(worstPendingDays, pendingSteelBuy / dailySteelNeed);
    }

    expect(worstPendingDays).toBeLessThanOrEqual(7);
  });
});
