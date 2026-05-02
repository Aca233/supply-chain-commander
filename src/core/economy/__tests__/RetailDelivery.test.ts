import { describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';

import { GOODS_COUNT } from '../../constants';
import { processRetailDelivery } from '../RetailSystem';
import { initializeWorld } from '../../world/WorldInitializer';

describe('processRetailDelivery', () => {
  it('moves only unreserved company inventory into retail stock', () => {
    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingId = world.retail.buildingIds[retailId];
    const goodsId = GoodsId.FOOD;
    const companyInvIdx = 0 * GOODS_COUNT + goodsId;
    const retailInvIdx = retailId * GOODS_COUNT + goodsId;

    world.companies.inventories[companyInvIdx] = 100;
    world.companies.inventoryReserved[companyInvIdx] = 80;
    world.retail.inventories[retailInvIdx] = 0;
    world.retail.inventoryCapacities[retailInvIdx] = 100;
    world.buildings.isActive[retailBuildingId] = 1;

    const deliveredCount = processRetailDelivery(world);

    // 至少包含玩家这一次投递（其他 AI 零售店也会同 tick 投递，故只验证 >= 1）
    expect(deliveredCount).toBeGreaterThanOrEqual(1);
    expect(world.retail.inventories[retailInvIdx]).toBe(20);
    expect(world.companies.inventories[companyInvIdx]).toBe(80);
  });

  it('does not deliver into an inactive retail store until reactivated', () => {
    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingId = world.retail.buildingIds[retailId];
    const goodsId = GoodsId.FOOD;
    const companyInvIdx = 0 * GOODS_COUNT + goodsId;
    const retailInvIdx = retailId * GOODS_COUNT + goodsId;

    world.companies.inventories[companyInvIdx] = 100;
    world.companies.inventoryReserved[companyInvIdx] = 0;
    world.retail.inventories[retailInvIdx] = 0;
    world.retail.inventoryCapacities[retailInvIdx] = 100;
    world.buildings.isActive[retailBuildingId] = 0;
    const companyInventoryBefore = world.companies.inventories[companyInvIdx];

    processRetailDelivery(world);
    expect(world.retail.inventories[retailInvIdx]).toBe(0);
    expect(world.companies.inventories[companyInvIdx]).toBe(companyInventoryBefore);

    world.buildings.isActive[retailBuildingId] = 1;

    expect(processRetailDelivery(world)).toBeGreaterThanOrEqual(1);
    expect(world.retail.inventories[retailInvIdx]).toBeGreaterThan(0);
  });
});
