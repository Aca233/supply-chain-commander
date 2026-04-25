import { describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';

import { GOODS_COUNT } from '../../constants';
import { processRetailDelivery } from '../RetailSystem';
import { initializeWorld } from '../../world/WorldInitializer';

describe('processRetailDelivery', () => {
  it('moves only unreserved company inventory into retail stock', () => {
    const world = initializeWorld();
    const retailId = 0;
    const goodsId = GoodsId.FOOD;
    const companyInvIdx = 0 * GOODS_COUNT + goodsId;
    const retailInvIdx = retailId * GOODS_COUNT + goodsId;

    world.companies.inventories[companyInvIdx] = 100;
    world.companies.inventoryReserved[companyInvIdx] = 80;
    world.retail.inventories[retailInvIdx] = 0;
    world.retail.inventoryCapacities[retailInvIdx] = 100;

    const deliveredCount = processRetailDelivery(world);

    expect(deliveredCount).toBe(1);
    expect(world.retail.inventories[retailInvIdx]).toBe(20);
    expect(world.companies.inventories[companyInvIdx]).toBe(80);
  });
});
