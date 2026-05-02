import { describe, expect, it } from 'vitest';

import { getRetailConfig } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

import { GOODS_COUNT } from '../../constants';
import { createSellOrderWithReason } from '../../market/OrderBook';
import { initializeWorld } from '../../world/WorldInitializer';
import {
  CONSUMER_MARKET_CONFIG,
  canRetailServeConsumers,
  executeConsumerPurchases,
} from '../ConsumerMarket';
import { getDemandPressure } from '../MarketStats';

describe('executeConsumerPurchases retail fallback', () => {
  it('still buys uncovered consumer goods from the market when retail is active', () => {
    const world = initializeWorld();
    const coveredRetailGoodsId = GoodsId.FOOD;
    const uncoveredGoodsId = GoodsId.PET_FOOD;
    const retailId = 0;
    const sellerId = 1;

    const retailBuildingType = world.buildings.types[world.retail.buildingIds[retailId]];
    expect(getRetailConfig(retailBuildingType)?.allowedGoodsIds).not.toContain(uncoveredGoodsId);

    const coveredRetailInventoryIdx = retailId * GOODS_COUNT + coveredRetailGoodsId;
    world.retail.inventories[coveredRetailInventoryIdx] = 20;
    world.buildings.isActive[world.retail.buildingIds[retailId]] = 1;
    expect(canRetailServeConsumers(world)).toBe(true);

    world.goods.demands[uncoveredGoodsId] = 100;
    world.companies.inventories[sellerId * GOODS_COUNT + uncoveredGoodsId] = 100;
    world.companies.inventoryReserved[sellerId * GOODS_COUNT + uncoveredGoodsId] = 0;

    const sellOrder = createSellOrderWithReason(world, sellerId, uncoveredGoodsId, 100, 40);
    expect(sellOrder.success, sellOrder.reason).toBe(true);

    world.tick = 1;
    const summary = executeConsumerPurchases(world, {
      ...CONSUMER_MARKET_CONFIG,
      executionInterval: 1,
      b2bExecutionInterval: 999,
      goodsBatchGroups: 1,
      b2bBuildingBatchGroups: 1,
    });

    expect(summary.purchasesByGoods.get(uncoveredGoodsId)?.quantity ?? 0).toBeGreaterThan(0);
  });

  it('treats final consumer purchases as demand satisfaction, not new supply', () => {
    const world = initializeWorld();
    const goodsId = GoodsId.PET_FOOD;
    const sellerId = 1;
    const startingSupply = 25;
    const startingDemand = 100;

    world.goods.supplies[goodsId] = startingSupply;
    world.goods.demands[goodsId] = startingDemand;
    world.companies.inventories[sellerId * GOODS_COUNT + goodsId] = 100;
    world.companies.inventoryReserved[sellerId * GOODS_COUNT + goodsId] = 0;

    const sellOrder = createSellOrderWithReason(world, sellerId, goodsId, 100, 40);
    expect(sellOrder.success, sellOrder.reason).toBe(true);

    world.tick = 1;
    const summary = executeConsumerPurchases(world, {
      ...CONSUMER_MARKET_CONFIG,
      executionInterval: 1,
      b2bExecutionInterval: 999,
      goodsBatchGroups: 1,
      b2bBuildingBatchGroups: 1,
    });

    const purchasedQuantity = summary.purchasesByGoods.get(goodsId)?.quantity ?? 0;
    expect(purchasedQuantity).toBeGreaterThan(0);
    expect(world.goods.supplies[goodsId]).toBeCloseTo(
      Math.max(0, startingSupply - purchasedQuantity),
      5,
    );
    expect(world.goods.demands[goodsId]).toBe(startingDemand);
    expect(getDemandPressure(world, goodsId)).toBeCloseTo(startingDemand - purchasedQuantity, 5);
  });
});
