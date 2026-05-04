import { afterEach, describe, expect, it, vi } from 'vitest';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
});

describe('AIDecisionEngine market support capacity backfill', () => {
  it('does not conjure cold-goods capacity when required construction materials are absent', async () => {
    vi.resetModules();

    const { GoodsId } = await import('@/data/goods');
    const { GOODS_COUNT } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { setInventory } = await import('../../world/GameWorld');
    const { getBuildingRecipeFromInstance } = await import('../../production/ProductionEngine');
    const { cancelOrder, createBuyOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { buildForColdGoods } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.SMARTPHONE;

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      cancelOrder(world, orderIdx);
    }

    for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
      world.goods.supplies[goodsId] = 10_000;
      world.goods.demands[goodsId] = 0;
    }

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      world.companies.cash[companyId] = 50_000_000;
      for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
        setInventory(world, companyId, goodsId, 0);
        world.companies.inventoryReserved[companyId * GOODS_COUNT + goodsId] = 0;
      }
    }

    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        world.buildings.isActive[buildingId] = 0;
      }
    }

    world.companies.cash[0] = 50_000_000;
    createBuyOrder(world, 0, targetGoodsId, 300, world.goods.baseValues[targetGoodsId] * 2);

    world.goods.supplies[targetGoodsId] = 0;
    world.goods.demands[targetGoodsId] = 300;
    world.tick = 30;

    expect(buildForColdGoods(world)).toBeGreaterThan(0);
    expect(world.goods.supplies[targetGoodsId]).toBe(0);

    let activeProducerCount = 0;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (!world.buildings.isActive[buildingId]) continue;

      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        activeProducerCount++;
      }
    }

    expect(activeProducerCount).toBe(0);
  });

  it('builds level-gated cold-goods capacity with the matching production method when materials exist', async () => {
    vi.resetModules();

    const { BuildingId } = await import('@/data/buildings');
    const { GoodsId } = await import('@/data/goods');
    const { getBaseMaterials } = await import('@/data/buildingMaterials');
    const { GOODS_COUNT } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { setInventory } = await import('../../world/GameWorld');
    const { getBuildingRecipeFromInstance } = await import('../../production/ProductionEngine');
    const { getBuildingProductionVariants } = await import('../../production/ProductionMethods');
    const { cancelOrder, createBuyOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { buildForColdGoods } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.SMARTPHONE;
    const smartphoneVariant = getBuildingProductionVariants(BuildingId.ELECTRONICS_FACTORY)
      .find(variant => variant.recipe.outputs.some(output => output.goodsId === targetGoodsId));

    expect(smartphoneVariant).toBeDefined();

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      cancelOrder(world, orderIdx);
    }

    for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
      world.goods.supplies[goodsId] = 10_000;
      world.goods.demands[goodsId] = 0;
    }

    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        world.buildings.isActive[buildingId] = 0;
      }
    }

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      world.companies.cash[companyId] = 50_000_000;
      for (const mat of getBaseMaterials(BuildingId.ELECTRONICS_FACTORY)) {
        setInventory(world, companyId, mat.goodsId, mat.amount + 100);
        world.companies.inventoryReserved[companyId * GOODS_COUNT + mat.goodsId] = 0;
      }
    }

    world.companies.cash[0] = 50_000_000;
    createBuyOrder(world, 0, targetGoodsId, 300, world.goods.baseValues[targetGoodsId] * 2);

    world.goods.supplies[targetGoodsId] = 0;
    world.goods.demands[targetGoodsId] = 300;
    world.tick = 30;

    expect(buildForColdGoods(world)).toBeGreaterThan(0);

    let matchingProducerId = -1;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (!world.buildings.isActive[buildingId]) continue;

      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        matchingProducerId = buildingId;
        break;
      }
    }

    expect(matchingProducerId).toBeGreaterThanOrEqual(0);
    expect(world.buildings.levels[matchingProducerId]).toBeGreaterThanOrEqual(smartphoneVariant!.requiredLevel);
  });

  it('adds capacity when many existing producers still cover too little demand', async () => {
    vi.resetModules();

    const { BuildingId } = await import('@/data/buildings');
    const { GoodsId } = await import('@/data/goods');
    const { getBaseMaterials } = await import('@/data/buildingMaterials');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { getBuildingRecipeFromInstance } = await import('../../production/ProductionEngine');
    const { cancelOrder, createBuyOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { buildForColdGoods } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.GRAIN;

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      cancelOrder(world, orderIdx);
    }

    for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
      world.goods.supplies[goodsId] = 10_000;
      world.goods.demands[goodsId] = 0;
    }

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      world.companies.cash[companyId] = 50_000_000;
    }

    let producerCountBefore = 0;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        world.buildings.isActive[buildingId] = 1;
        producerCountBefore++;
      }
    }

    createBuyOrder(world, 1, targetGoodsId, 5_000, world.goods.baseValues[targetGoodsId] * 2);

    world.goods.supplies[targetGoodsId] = 50;
    world.goods.demands[targetGoodsId] = 50_000;
    world.tick = 30;

    expect(buildForColdGoods(world)).toBeGreaterThan(0);

    let producerCountAfter = 0;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (!world.buildings.isActive[buildingId]) continue;

      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        producerCountAfter++;
      }
    }

    expect(producerCountAfter).toBeGreaterThan(producerCountBefore);
  });

  it('runs strategic material support on the scheduler window and builds plastic-capable capacity', async () => {
    vi.resetModules();

    const { BuildingId } = await import('@/data/buildings');
    const { GoodsId } = await import('@/data/goods');
    const { getBaseMaterials } = await import('@/data/buildingMaterials');
    const { GOODS_COUNT } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { setInventory } = await import('../../world/GameWorld');
    const { getBuildingRecipeFromInstance } = await import('../../production/ProductionEngine');
    const { cancelOrder, createBuyOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { runStrategicMaterialCheck } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.PLASTIC;

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      cancelOrder(world, orderIdx);
    }

    for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
      world.goods.supplies[goodsId] = 10_000;
      world.goods.demands[goodsId] = 0;
    }

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      world.companies.cash[companyId] = 50_000_000;
      for (const mat of getBaseMaterials(BuildingId.REFINERY)) {
        setInventory(world, companyId, mat.goodsId, mat.amount + 100);
        world.companies.inventoryReserved[companyId * GOODS_COUNT + mat.goodsId] = 0;
      }
    }

    let plasticProducerCountBefore = 0;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        plasticProducerCountBefore++;
      }
    }

    createBuyOrder(world, 1, targetGoodsId, 500, world.goods.baseValues[targetGoodsId] * 2);

    world.goods.supplies[targetGoodsId] = 0;
    world.goods.demands[targetGoodsId] = 20_000;
    world.tick = 15;

    expect(runStrategicMaterialCheck(world)).toBeGreaterThan(0);

    let plasticProducerCountAfter = 0;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        plasticProducerCountAfter++;
      }
    }

    expect(plasticProducerCountAfter).toBeGreaterThan(plasticProducerCountBefore);
  });

  it('does not report goods with available sell orders as zero supply', async () => {
    vi.resetModules();

    const { GoodsId } = await import('@/data/goods');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { setInventory } = await import('../../world/GameWorld');
    const { cancelOrder, createSellOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { getZeroSupplyGoodsReport } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.NATURAL_GAS;

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      if (world.orders.goodsIds[orderIdx] === targetGoodsId) {
        cancelOrder(world, orderIdx);
      }
    }

    setInventory(world, 1, targetGoodsId, 250);
    createSellOrder(world, 1, targetGoodsId, 100, world.goods.baseValues[targetGoodsId]);

    world.goods.supplies[targetGoodsId] = 0;
    world.goods.demands[targetGoodsId] = 100;

    expect(getZeroSupplyGoodsReport(world).some(goods => goods.goodsId === targetGoodsId)).toBe(false);
  });

  it('lets zero-supply support trigger on the game-loop support cadence', async () => {
    vi.resetModules();

    const { GoodsId } = await import('@/data/goods');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { cancelOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { forceBuildzeroSupplyGoods } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.NATURAL_GAS;

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      cancelOrder(world, orderIdx);
    }

    for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
      world.goods.supplies[goodsId] = 10_000;
      world.goods.demands[goodsId] = 0;
    }

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      world.companies.cash[companyId] = 50_000_000;
    }

    world.goods.supplies[targetGoodsId] = 0;
    world.goods.demands[targetGoodsId] = 500;

    world.tick = 100;
    expect(forceBuildzeroSupplyGoods(world)).toBe(0);

    world.tick = 200;
    expect(forceBuildzeroSupplyGoods(world)).toBeGreaterThan(0);
  });

  it('allows solvent mid-sized AI companies to backfill cold-goods capacity', async () => {
    vi.resetModules();

    const { BuildingId } = await import('@/data/buildings');
    const { GoodsId } = await import('@/data/goods');
    const { getBaseMaterials } = await import('@/data/buildingMaterials');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { getBuildingRecipeFromInstance } = await import('../../production/ProductionEngine');
    const { cancelOrder, createBuyOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { buildForColdGoods } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.PLASTIC;

    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        world.buildings.isActive[buildingId] = 0;
      }
    }

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      world.companies.cash[companyId] = 50_000_000;
    }

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      if (world.orders.goodsIds[orderIdx] === targetGoodsId) {
        cancelOrder(world, orderIdx);
      }
    }

    createBuyOrder(world, 1, targetGoodsId, 250, world.goods.baseValues[targetGoodsId] * 1.5);

    world.goods.supplies[targetGoodsId] = 0;
    world.goods.demands[targetGoodsId] = 250;
    expect(buildForColdGoods(world)).toBeGreaterThan(0);
    expect(world.goods.supplies[targetGoodsId]).toBe(0);

    let activeProducerCount = 0;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (!world.buildings.isActive[buildingId]) continue;

      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        activeProducerCount++;
      }
    }

    const refineryMaterialIds = new Set(getBaseMaterials(BuildingId.REFINERY).map(mat => mat.goodsId));
    const hasConstructionMaterialBuyOrder = Array.from(getActiveOrderIndices()).some(orderIdx =>
      world.orders.types[orderIdx] === 0 &&
      world.orders.companyIds[orderIdx] > 0 &&
      refineryMaterialIds.has(world.orders.goodsIds[orderIdx])
    );

    expect(activeProducerCount > 0 || hasConstructionMaterialBuyOrder).toBe(true);
  });

  it('adds backup capacity when a single active producer cannot satisfy cold-goods demand', async () => {
    vi.resetModules();

    const { BuildingId } = await import('@/data/buildings');
    const { GoodsId } = await import('@/data/goods');
    const { getBaseMaterials } = await import('@/data/buildingMaterials');
    const { GOODS_COUNT } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { setInventory } = await import('../../world/GameWorld');
    const { getBuildingRecipeFromInstance } = await import('../../production/ProductionEngine');
    const { cancelOrder, createBuyOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { buildForColdGoods } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.GENERIC_DRUG;
    let keptProducer = false;

    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        if (keptProducer) {
          world.buildings.isActive[buildingId] = 0;
        } else {
          world.buildings.isActive[buildingId] = 1;
          keptProducer = true;
        }
      }
    }

    expect(keptProducer).toBe(true);

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      world.companies.cash[companyId] = 50_000_000;
      for (const mat of getBaseMaterials(BuildingId.PHARMA_FACTORY)) {
        setInventory(world, companyId, mat.goodsId, mat.amount + 100);
        world.companies.inventoryReserved[companyId * GOODS_COUNT + mat.goodsId] = 0;
      }
    }

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      if (world.orders.goodsIds[orderIdx] === targetGoodsId) {
        cancelOrder(world, orderIdx);
      }
    }

    createBuyOrder(world, 1, targetGoodsId, 275, world.goods.baseValues[targetGoodsId] * 1.5);

    world.goods.supplies[targetGoodsId] = 0;
    world.goods.demands[targetGoodsId] = 275;
    world.tick = 30;
    expect(buildForColdGoods(world)).toBe(0);

    world.tick = 60;
    expect(buildForColdGoods(world)).toBeGreaterThan(0);

    let activeProducerCount = 0;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (!world.buildings.isActive[buildingId]) continue;

      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        activeProducerCount++;
      }
    }

    expect(activeProducerCount).toBeGreaterThan(1);
  });

  it('does not treat already satisfied gross demand as cold-goods shortage pressure', async () => {
    vi.resetModules();

    const { GoodsId } = await import('@/data/goods');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { getBuildingRecipeFromInstance } = await import('../../production/ProductionEngine');
    const { cancelOrder, getActiveOrderIndices } = await import('../../market/OrderBook');
    const { setDemandPressure } = await import('../../economy/MarketStats');
    const { buildForColdGoods } = await import('../AIDecisionEngine');

    const world = initializeWorld();
    const targetGoodsId = GoodsId.PLASTIC;

    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        world.buildings.isActive[buildingId] = 0;
      }
    }

    for (let companyId = 1; companyId < world.companies.count; companyId++) {
      world.companies.cash[companyId] = 50_000_000;
    }

    for (const orderIdx of Array.from(getActiveOrderIndices())) {
      if (world.orders.goodsIds[orderIdx] === targetGoodsId) {
        cancelOrder(world, orderIdx);
      }
    }

    world.goods.supplies[targetGoodsId] = 0;
    world.goods.demands[targetGoodsId] = 250;
    world.tick = 30;
    setDemandPressure(world, targetGoodsId, 0);

    expect(buildForColdGoods(world)).toBe(0);
    expect(world.goods.supplies[targetGoodsId]).toBe(0);
  });
});
