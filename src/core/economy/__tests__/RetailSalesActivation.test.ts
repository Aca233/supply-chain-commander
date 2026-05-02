import { describe, expect, it, vi } from 'vitest';

describe('updateRetailSystem retail sales activation', () => {
  it('keeps the starter player store dormant until the building is reactivated', async () => {
    vi.resetModules();

    const { GoodsId } = await import('@/data/goods');
    const { GOODS_COUNT } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { updateRetailSystem } = await import('../RetailSystem');

    const world = initializeWorld();
    const retailId = 0;
    const retailBuildingId = world.retail.buildingIds[retailId];
    const goodsId = GoodsId.FOOD;
    const companyInvIdx = goodsId;
    const retailInvIdx = retailId * GOODS_COUNT + goodsId;

    world.companies.inventories[companyInvIdx] = 100;
    world.goods.demands[goodsId] = 100;
    world.buildings.isActive[retailBuildingId] = 0;

    let dormantSales = 0;
    for (let tick = 1; tick <= 3; tick++) {
      world.tick = tick;
      dormantSales += updateRetailSystem(world).playerRevenue;
    }

    expect(dormantSales).toBe(0);
    expect(world.retail.inventories[retailInvIdx]).toBe(0);

    world.buildings.isActive[retailBuildingId] = 1;

    let activatedSales = 0;
    for (let tick = 4; tick <= 8; tick++) {
      world.tick = tick;
      activatedSales += updateRetailSystem(world).playerRevenue;
    }

    expect(activatedSales).toBeGreaterThan(0);
  });

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
    // 玩家库存为 0 → 玩家便利店初始销售为 0（其他 AI 零售店可能已有销售，这里只验证玩家）
    const firstTick = updateRetailSystem(world);
    const playerFoodIdxBefore = retailId * GOODS_COUNT + GoodsId.FOOD;
    expect(world.retail.inventories[playerFoodIdxBefore]).toBe(0);
    void firstTick;

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
