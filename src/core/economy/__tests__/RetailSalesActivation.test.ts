import { describe, expect, it, vi } from 'vitest';

describe('updateRetailSystem retail sales activation', () => {
  it('starts consumer sales soon after a store receives stock', async () => {
    vi.resetModules();

    const { GoodsId } = await import('@/data/goods');
    const { GOODS_COUNT } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { updateRetailSystem } = await import('../RetailSystem');

    const world = initializeWorld();
    const retailId = 0;
    const allowedGoodsIds = [
      GoodsId.FOOD,
      GoodsId.BEVERAGES,
      GoodsId.SNACKS,
      GoodsId.GENERIC_DRUG,
      GoodsId.OTC_DRUG,
    ];

    for (const goodsId of allowedGoodsIds) {
      world.goods.demands[goodsId] = 100;
    }

    world.tick = 1;
    const firstTick = updateRetailSystem(world);
    expect(firstTick.totalSales).toBe(0);

    for (const goodsId of allowedGoodsIds) {
      const companyInvIdx = 0 * GOODS_COUNT + goodsId;
      world.companies.inventories[companyInvIdx] = 100;
    }

    let totalSalesAfterDelivery = 0;

    for (let tick = 2; tick <= 6; tick++) {
      world.tick = tick;
      totalSalesAfterDelivery += updateRetailSystem(world).totalSales;
    }

    expect(totalSalesAfterDelivery).toBeGreaterThan(0);

    const retailFoodIdx = retailId * GOODS_COUNT + GoodsId.FOOD;
    expect(world.retail.inventories[retailFoodIdx]).toBeLessThan(100);
  });
});
