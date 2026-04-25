# Economy And Market Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a truthful, inventory-backed economy bootstrap, re-enable retail without breaking demand, and make every trade path leave the order book and trade history in a consistent state.

**Architecture:** Keep the current SoA `GameWorld` layout and the existing `world -> market -> economy` module split. First add small regression tests around retail bootstrap and trade settlement, then repair retail metadata/bootstrap, extract startup order seeding into a dedicated helper that can be tested in isolation, and finally centralize trade recording plus order finalization so matching, consumer, and retail flows all use the same bookkeeping rules.

**Tech Stack:** TypeScript, Vite, Vitest, React, typed-array `GameWorld` state

---

## File Map

- `src/data/buildings.ts`: canonical building catalogue; add real retail building definitions, include retail in category exports, and remove the hardcoded retail type assumption.
- `src/data/buildingMaterials.ts`: construction requirements for the retail building(s) introduced in `buildings.ts`.
- `src/core/world/WorldInitializer.ts`: world bootstrap, startup retail registration, and startup market seeding orchestration.
- `src/core/world/MarketBootstrap.ts`: new helper module for inventory-backed startup buy/sell order seeding.
- `src/core/economy/ConsumerMarket.ts`: decide when direct consumer purchases should run and share settlement helpers with the rest of the market code.
- `src/core/economy/RetailSystem.ts`: retail store registration, retail delivery, direct retail purchase bookkeeping, and wholesale direct-sales bookkeeping.
- `src/core/market/OrderBook.ts`: active-order bookkeeping and a shared helper for closing filled orders.
- `src/core/market/TradeLedger.ts`: shared trade writer plus explicit negative provenance constants.
- `src/core/market/MatchingEngine.ts`: swap duplicated trade-writing and order-closing code for shared helpers.
- `src/core/world/GameWorld.ts`: signed typed arrays for trade references that intentionally use negative sentinel values.
- `src/core/world/__tests__/WorldInitializer.market.test.ts`: regression coverage for retail bootstrap and retail fallback eligibility.
- `src/core/world/__tests__/MarketBootstrap.test.ts`: regression coverage for truthful startup sell-order seeding.
- `src/core/market/__tests__/TradeLedger.test.ts`: regression coverage for signed trade provenance and order finalization.
- `src/core/economy/__tests__/RetailDelivery.test.ts`: regression coverage for reserved inventory staying out of retail stock transfers.

### Task 1: Restore Retail Bootstrap

**Files:**
- Modify: `src/data/buildings.ts`
- Modify: `src/data/buildingMaterials.ts`
- Modify: `src/core/world/WorldInitializer.ts`
- Modify: `src/core/economy/RetailSystem.ts`
- Modify: `src/core/economy/ConsumerMarket.ts`
- Test: `src/core/world/__tests__/WorldInitializer.market.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { initializeWorld } from '../WorldInitializer';
import { BuildingId, RETAIL_BUILDINGS, isRetailBuilding } from '../../../data/buildings';
import { canRetailServeConsumers } from '../../economy/ConsumerMarket';

describe('initializeWorld retail bootstrap', () => {
  it('registers a real retail building without minting opening stock', () => {
    const world = initializeWorld();

    expect(RETAIL_BUILDINGS.length).toBeGreaterThan(0);
    expect(world.retail.count).toBe(1);

    const retailBuildingId = world.retail.buildingIds[0];
    const retailBuildingType = world.buildings.types[retailBuildingId];

    expect(retailBuildingType).toBe(BuildingId.CONVENIENCE_STORE);
    expect(isRetailBuilding(retailBuildingType)).toBe(true);

    const retailConfig = RETAIL_BUILDINGS[0].retailConfig!;
    const stockBase = 0 * world.goods.count;
    const openingStock = retailConfig.allowedGoodsIds.reduce((sum, goodsId) => {
      return sum + world.retail.inventories[stockBase + goodsId];
    }, 0);

    expect(openingStock).toBe(0);
    expect(canRetailServeConsumers(world)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/world/__tests__/WorldInitializer.market.test.ts`
Expected: FAIL because `RETAIL_BUILDINGS` is empty, `initializeWorld()` leaves `world.retail.count === 0`, and `canRetailServeConsumers` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/data/buildings.ts
export const RETAIL_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 40,
    key: 'convenience_store',
    name: '便利店',
    category: 'retail',
    buildCost: 350000,
    buildTime: 24,
    maintenanceCost: 600,
    laborCost: 2500,
    energyCost: 500,
    powerConsumption: 6,
    maxLevel: 5,
    upgradeCosts: [0, 120000, 240000, 480000, 960000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.05, 1.1, 1.15, 1.2],
    production: {
      inputs: [],
      outputs: [],
      ticksRequired: 1,
      laborRequired: 0,
      energyRequired: 0,
    },
    retailConfig: {
      maxInventorySlots: 8,
      inventoryCapacity: 300,
      customerCapacity: 120,
      markupRange: [0.08, 0.22],
      allowedGoodsIds: [
        GoodsId.FOOD,
        GoodsId.BEVERAGES,
        GoodsId.SNACKS,
        GoodsId.CANNED_FOOD,
        GoodsId.FROZEN_FOOD,
        GoodsId.GENERIC_DRUG,
        GoodsId.OTC_DRUG,
        GoodsId.PET_FOOD,
      ],
    },
    description: '提供日常快消品与基础药品的基础零售网点',
  },
];

export const ALL_BUILDINGS: BuildingTypeDefinition[] = [
  ...EXTRACTION_BUILDINGS,
  ...PROCESSING_BUILDINGS,
  ...MANUFACTURING_BUILDINGS,
  ...LUXURY_BUILDINGS,
  ...SERVICE_BUILDINGS,
  ...RETAIL_BUILDINGS,
];

export const BUILDINGS_BY_CATEGORY = {
  extraction: ALL_BUILDINGS.filter(b => b.category === 'extraction'),
  processing: ALL_BUILDINGS.filter(b => b.category === 'processing'),
  manufacturing: ALL_BUILDINGS.filter(b => b.category === 'manufacturing'),
  luxury: ALL_BUILDINGS.filter(b => b.category === 'luxury'),
  service: ALL_BUILDINGS.filter(b => b.category === 'service'),
  retail: RETAIL_BUILDINGS,
};

export function getRetailTypeIndex(buildingTypeId: number): number {
  return RETAIL_BUILDINGS.findIndex(building => building.id === buildingTypeId);
}

export const BuildingId = {
  MEDICAL_DEVICE_FACTORY: 36,
  GOLD_REFINERY: 37,
  LUXURY_WORKSHOP: 38,
  POWER_PLANT: 39,
  CONVENIENCE_STORE: 40,
} as const;

// src/data/buildingMaterials.ts
const RETAIL_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: BuildingId.CONVENIENCE_STORE,
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 120 },
      { goodsId: GoodsId.CEMENT, amount: 180 },
      { goodsId: GoodsId.GLASS, amount: 120 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 80 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 40 },
      { goodsId: GoodsId.APPLIANCES, amount: 8 },
      { goodsId: GoodsId.FURNITURE, amount: 12 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 40 }, { goodsId: GoodsId.APPLIANCES, amount: 2 }],
      [{ goodsId: GoodsId.STEEL, amount: 80 }, { goodsId: GoodsId.GLASS, amount: 30 }],
      [{ goodsId: GoodsId.STEEL, amount: 120 }, { goodsId: GoodsId.ELECTRONICS, amount: 20 }],
      [{ goodsId: GoodsId.STEEL, amount: 180 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }],
    ],
    buildTime: 24,
    workers: 20,
  },
];

const ALL_CONSTRUCTION_CONFIGS: BuildingConstructionConfig[] = [
  ...EXTRACTION_CONFIGS,
  ...PROCESSING_CONFIGS,
  ...MANUFACTURING_CONFIGS,
  ...LUXURY_CONFIGS,
  ...SERVICE_CONFIGS,
  ...RETAIL_CONFIGS,
];

// src/core/economy/RetailSystem.ts
import { getRetailConfig, getRetailTypeIndex } from '@/data/buildings';

const retailTypeIndex = getRetailTypeIndex(buildingType);
if (retailTypeIndex < 0) {
  console.warn(`[RetailSystem] 建筑类型 ${buildingType} 缺少零售映射`);
  return -1;
}
retail.types[retailId] = retailTypeIndex;

// src/core/economy/ConsumerMarket.ts
export function canRetailServeConsumers(world: GameWorld): boolean {
  if (!world.retail || world.retail.count === 0) return false;

  for (let retailId = 0; retailId < world.retail.count; retailId++) {
    const stockBase = retailId * GOODS_COUNT;
    for (const goods of CONSUMER_GOODS) {
      if (world.retail.inventories[stockBase + goods.id] > 0.01) {
        return true;
      }
    }
  }

  return false;
}

if (world.retail && canRetailServeConsumers(world)) {
  // 零售系统在 GameLoop 中处理
} else {
  // 保留直接市场购买回退
}

// src/core/world/WorldInitializer.ts
const playerRetailBuildingId = addRetailBuilding(world, 0, BuildingId.CONVENIENCE_STORE);
if (playerRetailBuildingId >= 0) {
  registerRetailStore(world, playerRetailBuildingId, true);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/world/__tests__/WorldInitializer.market.test.ts`
Expected: PASS with one registered convenience store, zero bootstrap retail inventory, and `canRetailServeConsumers(world) === false`.

- [ ] **Step 5: Commit**

```bash
git add src/data/buildings.ts src/data/buildingMaterials.ts src/core/world/WorldInitializer.ts src/core/economy/RetailSystem.ts src/core/economy/ConsumerMarket.ts src/core/world/__tests__/WorldInitializer.market.test.ts
git commit -m "fix: restore retail bootstrap metadata"
```

### Task 2: Replace Synthetic Startup Supply With Inventory-Backed Seeding

**Files:**
- Create: `src/core/world/MarketBootstrap.ts`
- Modify: `src/core/world/WorldInitializer.ts`
- Test: `src/core/world/__tests__/MarketBootstrap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { createGameWorld, setInventory } from '../GameWorld';
import { seedInventoryBackedSellOrders } from '../MarketBootstrap';
import { getOrderBookView, initOrderPool } from '../../market/OrderBook';
import { GOODS_COUNT } from '../../constants';
import { ALL_GOODS, GoodsId } from '../../../data/goods';

describe('seedInventoryBackedSellOrders', () => {
  it('skips sellers that do not have enough real inventory', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    world.companies.isPlayer.push(true, false);
    world.companies.isAI.push(false, true);
    world.goods.prices[GoodsId.STEEL] = 150;
    initOrderPool();

    setInventory(world, 1, GoodsId.STEEL, 20);

    seedInventoryBackedSellOrders(world, GoodsId.STEEL, [1], () => 0.5);

    expect(world.orders.activeCount).toBe(0);
    expect(world.companies.inventories[1 * GOODS_COUNT + GoodsId.STEEL]).toBe(20);
  });

  it('creates sell orders only from already-held inventory', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    world.companies.isPlayer.push(true, false);
    world.companies.isAI.push(false, true);
    world.goods.prices[GoodsId.STEEL] = 150;
    initOrderPool();

    setInventory(world, 1, GoodsId.STEEL, 200);

    seedInventoryBackedSellOrders(world, GoodsId.STEEL, [1], () => 0.5);

    const book = getOrderBookView(world, GoodsId.STEEL);
    expect(book.sellOrders).toHaveLength(1);
    expect(book.sellOrders[0].remaining).toBeLessThanOrEqual(200);
    expect(world.companies.inventories[1 * GOODS_COUNT + GoodsId.STEEL]).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/world/__tests__/MarketBootstrap.test.ts`
Expected: FAIL because `MarketBootstrap.ts` and `seedInventoryBackedSellOrders` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/world/MarketBootstrap.ts
import { ALL_GOODS } from '@/data/goods';

import { GOODS_COUNT } from '../constants';
import { createBuyOrder, createSellOrder } from '../market/OrderBook';
import { GameWorld } from './GameWorld';

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
    createSellOrder(world, companyId, goodsId, Math.min(sellQuantity, Math.floor(availableInventory)), sellPrice);
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
    const price = goods.basePrice * (0.9 + rng() * 0.18);
    const quantity = Math.floor(30 + rng() * 150);
    const budget = quantity * price * 1.2;
    if (world.companies.cash[companyId] < budget) continue;
    createBuyOrder(world, companyId, goodsId, quantity, price);
  }
}

// src/core/world/WorldInitializer.ts
import { seedBootstrapBuyOrders, seedInventoryBackedSellOrders } from './MarketBootstrap';

for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
  const aiCompanyIds = Array.from({ length: c.count - 1 }, (_, offset) => offset + 1);
  seedBootstrapBuyOrders(world, goodsId, aiCompanyIds);
  seedInventoryBackedSellOrders(world, goodsId, aiCompanyIds);
}

// 删除旧逻辑:
// if (inventory < 50) {
//   setInventory(world, companyId, goodsId, 200 + Math.random() * 400);
// }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/world/__tests__/MarketBootstrap.test.ts`
Expected: PASS with no inventory mutation in either test and one truthful sell order in the second case.

- [ ] **Step 5: Commit**

```bash
git add src/core/world/MarketBootstrap.ts src/core/world/WorldInitializer.ts src/core/world/__tests__/MarketBootstrap.test.ts
git commit -m "fix: seed startup sell orders from real inventory"
```

### Task 3: Centralize Trade Recording And Order Finalization

**Files:**
- Create: `src/core/market/TradeLedger.ts`
- Modify: `src/core/world/GameWorld.ts`
- Modify: `src/core/market/OrderBook.ts`
- Modify: `src/core/market/MatchingEngine.ts`
- Modify: `src/core/economy/ConsumerMarket.ts`
- Modify: `src/core/economy/RetailSystem.ts`
- Test: `src/core/market/__tests__/TradeLedger.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { createGameWorld, setInventory } from '../../world/GameWorld';
import { ALL_GOODS, GoodsId } from '../../../data/goods';
import { finalizeFilledOrder, getActiveOrderIndices, getOrderBookView, initOrderPool, createSellOrder } from '../OrderBook';
import { TradeOrderRef, TradePartyRef, recordTrade } from '../TradeLedger';

describe('trade ledger and order finalization', () => {
  it('preserves negative provenance ids in trade history', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;

    recordTrade(world, {
      buyOrderId: TradeOrderRef.CONSUMER_DIRECT,
      sellOrderId: 12,
      buyCompanyId: TradePartyRef.CONSUMER_MARKET,
      sellCompanyId: 4,
      goodsId: GoodsId.FOOD,
      quantity: 10,
      price: 20,
      tick: 0,
    });

    expect(world.trades.buyOrderIds[0]).toBe(TradeOrderRef.CONSUMER_DIRECT);
    expect(world.trades.buyCompanyIds[0]).toBe(TradePartyRef.CONSUMER_MARKET);
  });

  it('removes filled orders from active views and active-order indices', () => {
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    initOrderPool();

    setInventory(world, 1, GoodsId.FOOD, 50);
    createSellOrder(world, 1, GoodsId.FOOD, 50, 20);

    const orderIdx = [...getActiveOrderIndices()][0];
    world.orders.remainings[orderIdx] = 0;

    finalizeFilledOrder(world, orderIdx);

    expect(getActiveOrderIndices().has(orderIdx)).toBe(false);
    expect(getOrderBookView(world, GoodsId.FOOD).sellOrders).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/market/__tests__/TradeLedger.test.ts`
Expected: FAIL because `TradeLedger.ts` and `finalizeFilledOrder()` do not exist yet, and the trade arrays still coerce negative ids into large unsigned numbers.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/world/GameWorld.ts
export interface TradesSystem {
  maxTrades: number;
  count: number;

  buyOrderIds: Int32Array;
  sellOrderIds: Int32Array;
  buyCompanyIds: Int16Array;
  sellCompanyIds: Int16Array;
  goodsIds: Uint8Array;
  quantities: Float32Array;
  prices: Float32Array;
  ticks: Uint32Array;
  nextTradeId: number;
  cumulativeSalesQuantity: Float32Array;
  cumulativeSalesRevenue: Float64Array;
}

export function createTradesSystem(): TradesSystem {
  return {
    maxTrades: MAX_TRADES,
    count: 0,
    buyOrderIds: new Int32Array(MAX_TRADES),
    sellOrderIds: new Int32Array(MAX_TRADES),
    buyCompanyIds: new Int16Array(MAX_TRADES),
    sellCompanyIds: new Int16Array(MAX_TRADES),
    goodsIds: new Uint8Array(MAX_TRADES),
    quantities: new Float32Array(MAX_TRADES),
    prices: new Float32Array(MAX_TRADES),
    ticks: new Uint32Array(MAX_TRADES),
    nextTradeId: 1,
    cumulativeSalesQuantity: new Float32Array(MAX_COMPANIES * GOODS_COUNT),
    cumulativeSalesRevenue: new Float64Array(MAX_COMPANIES * GOODS_COUNT),
  };
}

// src/core/market/TradeLedger.ts
import { GOODS_COUNT } from '../constants';
import { GameWorld } from '../world/GameWorld';

export const TradeOrderRef = {
  CONSUMER_DIRECT: -1,
  RETAIL_DIRECT: -2,
  WHOLESALE_DIRECT: -3,
} as const;

export const TradePartyRef = {
  CONSUMER_MARKET: -1,
} as const;

export interface TradeWrite {
  buyOrderId: number;
  sellOrderId: number;
  buyCompanyId: number;
  sellCompanyId: number;
  goodsId: number;
  quantity: number;
  price: number;
  tick: number;
}

export function recordTrade(world: GameWorld, trade: TradeWrite): number {
  const t = world.trades;
  const tradeId = t.nextTradeId++;
  const tradeIdx = t.count % t.maxTrades;

  t.buyOrderIds[tradeIdx] = trade.buyOrderId;
  t.sellOrderIds[tradeIdx] = trade.sellOrderId;
  t.buyCompanyIds[tradeIdx] = trade.buyCompanyId;
  t.sellCompanyIds[tradeIdx] = trade.sellCompanyId;
  t.goodsIds[tradeIdx] = trade.goodsId;
  t.quantities[tradeIdx] = trade.quantity;
  t.prices[tradeIdx] = trade.price;
  t.ticks[tradeIdx] = trade.tick;
  t.count++;

  if (trade.sellCompanyId >= 0) {
    const sellStatsIdx = trade.sellCompanyId * GOODS_COUNT + trade.goodsId;
    t.cumulativeSalesQuantity[sellStatsIdx] += trade.quantity;
    t.cumulativeSalesRevenue[sellStatsIdx] += trade.quantity * trade.price;
  }

  return tradeId;
}

// src/core/market/OrderBook.ts
export function finalizeFilledOrder(world: GameWorld, orderIdx: number): void {
  const o = world.orders;
  if (!o.isActive[orderIdx] || o.remainings[orderIdx] > 0) return;

  const companyId = o.companyIds[orderIdx];
  const goodsId = o.goodsIds[orderIdx];
  const orderType = o.types[orderIdx];

  getOrderBookIndex().removeOrder(orderIdx);
  removeFromCompanyGoodsIndex(orderIdx, companyId, goodsId, orderType);
  activeOrderIndices.delete(orderIdx);
  o.isActive[orderIdx] = 0;
  o.activeCount--;
  releaseOrderSlot(orderIdx, orderType);
}

for (const orderIdx of activeOrderIndices) {
  if (!o.isActive[orderIdx] || o.goodsIds[orderIdx] !== goodsId) continue;
  const orderView: OrderView = {
    idx: orderIdx,
    companyId: o.companyIds[orderIdx],
    price: o.prices[orderIdx],
    remaining: o.remainings[orderIdx],
    createdTick: o.createdTicks[orderIdx],
  };
}

// src/core/economy/ConsumerMarket.ts
import { TradeOrderRef, TradePartyRef, recordTrade } from '../market/TradeLedger';
import { finalizeFilledOrder } from '../market/OrderBook';

recordTrade(world, {
  buyOrderId: TradeOrderRef.CONSUMER_DIRECT,
  sellOrderId: orderIdx,
  buyCompanyId: TradePartyRef.CONSUMER_MARKET,
  sellCompanyId,
  goodsId,
  quantity: actualQuantity,
  price,
  tick: world.tick,
});
finalizeFilledOrder(world, orderIdx);

// src/core/economy/RetailSystem.ts
recordTrade(world, {
  buyOrderId: TradeOrderRef.RETAIL_DIRECT,
  sellOrderId: sellOrder.idx,
  buyCompanyId: ownerId,
  sellCompanyId: sellerId,
  goodsId,
  quantity: buyQty,
  price: sellOrder.price,
  tick: world.tick,
});
finalizeFilledOrder(world, sellOrder.idx);

recordTrade(world, {
  buyOrderId: TradeOrderRef.WHOLESALE_DIRECT,
  sellOrderId: TradeOrderRef.WHOLESALE_DIRECT,
  buyCompanyId: retailOwnerId,
  sellCompanyId: producerId,
  goodsId,
  quantity,
  price,
  tick: world.tick,
});

// src/core/market/MatchingEngine.ts
import { finalizeFilledOrder } from './OrderBook';
import { recordTrade } from './TradeLedger';

recordTrade(world, {
  buyOrderId: buyIdx,
  sellOrderId: sellIdx,
  buyCompanyId,
  sellCompanyId,
  goodsId,
  quantity: matchQty,
  price: matchPrice,
  tick: world.tick,
});
finalizeFilledOrder(world, buyIdx);
finalizeFilledOrder(world, sellIdx);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/market/__tests__/TradeLedger.test.ts`
Expected: PASS with preserved negative provenance ids and no stale filled order in either `activeOrderIndices` or `getOrderBookView()`.

- [ ] **Step 5: Commit**

```bash
git add src/core/world/GameWorld.ts src/core/market/TradeLedger.ts src/core/market/OrderBook.ts src/core/market/MatchingEngine.ts src/core/economy/ConsumerMarket.ts src/core/economy/RetailSystem.ts src/core/market/__tests__/TradeLedger.test.ts
git commit -m "fix: unify trade ledger and filled-order cleanup"
```

### Task 4: Prevent Retail Delivery From Consuming Reserved Inventory

**Files:**
- Modify: `src/core/economy/RetailSystem.ts`
- Test: `src/core/economy/__tests__/RetailDelivery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { initializeWorld } from '../../world/WorldInitializer';
import { GOODS_COUNT } from '../../constants';
import { GoodsId } from '../../../data/goods';
import { processRetailDelivery } from '../RetailSystem';

describe('processRetailDelivery', () => {
  it('moves only unreserved company inventory into retail stock', () => {
    const world = initializeWorld();
    const retailId = 0;
    const goodsId = GoodsId.FOOD;
    const companyInvIdx = goodsId;
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/economy/__tests__/RetailDelivery.test.ts`
Expected: FAIL because `processRetailDelivery()` currently transfers the full company inventory instead of `inventory - inventoryReserved`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/economy/RetailSystem.ts
const companyInvIdx = ownerId * GOODS_COUNT + goodsId;
const companyInventory = c.inventories[companyInvIdx];
const reservedInventory = c.inventoryReserved[companyInvIdx] || 0;
const availableCompanyInventory = Math.max(0, companyInventory - reservedInventory);

if (availableCompanyInventory <= 0) {
  continue;
}

const capacity = retail.inventoryCapacities[idx];
const currentStock = retail.inventories[idx];
const spaceAvailable = capacity - currentStock;

if (spaceAvailable <= 0) {
  continue;
}

const transferAmount = Math.min(availableCompanyInventory, spaceAvailable);
c.inventories[companyInvIdx] -= transferAmount;
retail.inventories[idx] += transferAmount;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/economy/__tests__/RetailDelivery.test.ts`
Expected: PASS with only the unreserved 20 units moving into retail stock.

- [ ] **Step 5: Commit**

```bash
git add src/core/economy/RetailSystem.ts src/core/economy/__tests__/RetailDelivery.test.ts
git commit -m "fix: keep reserved inventory out of retail delivery"
```

### Task 5: Full Regression And Build Verification

**Files:**
- Verify: `src/core/world/__tests__/WorldInitializer.market.test.ts`
- Verify: `src/core/world/__tests__/MarketBootstrap.test.ts`
- Verify: `src/core/market/__tests__/TradeLedger.test.ts`
- Verify: `src/core/economy/__tests__/RetailDelivery.test.ts`
- Verify: `src/core/world/WorldInitializer.ts`
- Verify: `src/core/economy/ConsumerMarket.ts`
- Verify: `src/core/economy/RetailSystem.ts`
- Verify: `src/core/market/OrderBook.ts`
- Verify: `src/core/market/MatchingEngine.ts`
- Verify: `src/core/world/GameWorld.ts`

- [ ] **Step 1: Run the focused regression suite**

Run: `npx vitest run src/core/world/__tests__/WorldInitializer.market.test.ts src/core/world/__tests__/MarketBootstrap.test.ts src/core/market/__tests__/TradeLedger.test.ts src/core/economy/__tests__/RetailDelivery.test.ts`
Expected: PASS for all 4 files.

- [ ] **Step 2: Run the project build**

Run: `npm run build`
Expected: `tsc && vite build` completes without TypeScript or bundling errors.

- [ ] **Step 3: Sanity-check the repaired runtime invariants**

Run: `npx vitest run src/core/world/__tests__/WorldInitializer.market.test.ts src/core/market/__tests__/TradeLedger.test.ts --reporter=verbose`
Expected:
- Retail bootstrap test still reports one valid zero-stock convenience store.
- Trade ledger test still reports negative provenance ids preserved and no stale filled orders in the active order set.

- [ ] **Step 4: Final commit**

```bash
git add src/data/buildings.ts src/data/buildingMaterials.ts src/core/world/MarketBootstrap.ts src/core/world/WorldInitializer.ts src/core/economy/ConsumerMarket.ts src/core/economy/RetailSystem.ts src/core/market/OrderBook.ts src/core/market/TradeLedger.ts src/core/market/MatchingEngine.ts src/core/world/GameWorld.ts src/core/world/__tests__/WorldInitializer.market.test.ts src/core/world/__tests__/MarketBootstrap.test.ts src/core/market/__tests__/TradeLedger.test.ts src/core/economy/__tests__/RetailDelivery.test.ts
git commit -m "fix: stabilize economy bootstrap and market settlement"
```
