import { ALL_GOODS } from '@/data/goods';

import { GOODS_COUNT } from '../constants';
import { createBuyOrder, createSellOrder } from '../market/OrderBook';
import { getBuildingRecipeFromInstance } from '../production/ProductionEngine';
import { GameWorld } from './GameWorld';

export function getBootstrapBuyerCompanyIds(world: GameWorld, goodsId: number): number[] {
  const buyerIds = new Set<number>();

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    const ownerId = world.buildings.owners[buildingId];
    if (!world.companies.isAI[ownerId]) {
      continue;
    }

    const production = getBuildingRecipeFromInstance(world, buildingId);
    if (production.inputs.some(input => input.goodsId === goodsId)) {
      buyerIds.add(ownerId);
    }
  }

  return [...buyerIds];
}

export function seedInventoryBackedSellOrders(
  world: GameWorld,
  goodsId: number,
  sellerIds: number[],
  rng: () => number = Math.random,
): void {
  const goods = ALL_GOODS.find(entry => entry.id === goodsId);
  if (!goods) return;

  for (const companyId of sellerIds) {
    const inventoryIdx = companyId * GOODS_COUNT + goodsId;
    const availableInventory =
      world.companies.inventories[inventoryIdx] - world.companies.inventoryReserved[inventoryIdx];

    if (availableInventory <= 30) continue;

    const sellQuantity = Math.floor(availableInventory * (0.4 + rng() * 0.3));
    if (sellQuantity <= 5) continue;

    const sellPrice = goods.basePrice * (0.88 + rng() * 0.15);
    createSellOrder(
      world,
      companyId,
      goodsId,
      Math.min(sellQuantity, Math.floor(availableInventory)),
      sellPrice,
    );
  }
}

export function seedBootstrapBuyOrders(
  world: GameWorld,
  goodsId: number,
  buyerIds: number[],
  rng: () => number = Math.random,
): void {
  const goods = ALL_GOODS.find(entry => entry.id === goodsId);
  if (!goods) return;

  for (const companyId of buyerIds) {
    const buyPrice = goods.basePrice * (0.9 + rng() * 0.18);
    const buyQuantity = Math.floor(30 + rng() * 150);
    const budget = buyQuantity * buyPrice * 1.2;

    if (buyQuantity <= 5 || world.companies.cash[companyId] < budget) {
      continue;
    }

    createBuyOrder(world, companyId, goodsId, buyQuantity, buyPrice);
  }
}
