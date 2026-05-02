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
  it('allows solvent mid-sized AI companies to backfill cold-goods capacity', async () => {
    vi.resetModules();

    const { GoodsId } = await import('@/data/goods');
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
    expect(world.goods.supplies[targetGoodsId]).toBeGreaterThan(0);

    let activeProducerCount = 0;
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (!world.buildings.isActive[buildingId]) continue;

      const production = getBuildingRecipeFromInstance(world, buildingId);
      if (production.outputs.some(output => output.goodsId === targetGoodsId)) {
        activeProducerCount++;
      }
    }

    expect(activeProducerCount).toBeGreaterThan(0);
  });

  it('adds backup capacity when a single active producer cannot satisfy cold-goods demand', async () => {
    vi.resetModules();

    const { GoodsId } = await import('@/data/goods');
    const { initializeWorld } = await import('../../world/WorldInitializer');
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
