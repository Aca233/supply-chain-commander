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
});
