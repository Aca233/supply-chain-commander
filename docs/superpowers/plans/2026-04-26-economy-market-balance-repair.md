# Economy Market Balance Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the most misleading economy signals by switching GDP to final-demand accounting, making retail inventory/pricing reflect real supply, and turning forced AI market support into a guarded fallback instead of a routine stabilizer.

**Architecture:** Keep the existing day-based simulation loop, but replace GDP’s raw trade-ledger dependency with rolling final-demand buffers inside `GameLoop`. Make `RetailSystem` default to empty runtime inventory and compute prices from purchase cost first, while leaving an explicit seeding hook for controlled warm starts. Add a small guard module for shortage persistence/cooldown tracking and let `AIDecisionEngine` consult it before issuing zero-supply or cold-goods build interventions.

**Tech Stack:** TypeScript, Vitest, Vite, existing SoA `GameWorld` simulation core

---

## File Structure And Responsibilities

- `src/core/loop/GameLoop.ts`
  Own the rolling final-demand buffers and update GDP from `direct market final demand + retail revenue + service revenue`.

- `src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts`
  Lock the GDP source-of-truth behavior so general trade turnover no longer inflates GDP.

- `src/core/economy/RetailSystem.ts`
  Make store registration default to empty stock, add explicit bootstrap seeding via options, and anchor automatic retail prices to `purchaseCost` before falling back to live market/base price.

- `src/core/economy/__tests__/RetailSystem.marketRealism.test.ts`
  Lock zero default stock, explicit seeding, cost-based pricing, and fallback pricing.

- `src/core/world/WorldInitializer.ts`
  Update the player retail registration call to the new explicit registration API without reintroducing magical stock.

- `src/core/ai/MarketSupportGuard.ts`
  Isolate the persistence/cooldown logic for market support so `AIDecisionEngine` stays readable.

- `src/core/ai/__tests__/MarketSupportGuard.test.ts`
  Prove the guard requires repeated shortages and enforces cooldowns/reset-on-recovery behavior.

- `src/core/ai/AIDecisionEngine.ts`
  Use the guard, detect in-flight capacity before forcing support, and soften intervention batch size/priority.

- `src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts`
  Add a deterministic 720-tick regression so long-run zero-supply and negative-cash drift must improve materially.

### Task 1: Rewire GDP To Final-Demand Activity

**Files:**
- Create: `src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts`
- Modify: `src/core/loop/GameLoop.ts`

- [ ] **Step 1: Write the failing GDP regression tests**

Create `src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';

interface GDPHarness {
  recentDirectMarketFinalDemand: Float64Array;
  recentRetailRevenue: Float64Array;
  recentServiceRevenue: Float64Array;
  updateGDP(): void;
  destroy(): void;
}

describe('GameLoop GDP final-demand accounting', () => {
  it('annualizes only final-demand buffers and ignores general trade turnover', async () => {
    vi.resetModules();

    const { TICKS_PER_YEAR } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    world.tick = 1;
    world.trades.count = 1;
    world.trades.quantities[0] = 999;
    world.trades.prices[0] = 777;
    world.trades.ticks[0] = 1;

    const loop = createGameLoop(world) as unknown as GDPHarness;

    try {
      loop.recentDirectMarketFinalDemand[0] = 120;
      loop.recentRetailRevenue[0] = 80;
      loop.recentServiceRevenue[0] = 40;

      loop.updateGDP();

      expect(world.economyStats.gdp).toBeCloseTo((120 + 80 + 40) * TICKS_PER_YEAR, 5);
    } finally {
      loop.destroy();
    }
  });

  it('keeps the rolling average based on final-demand window entries only', async () => {
    vi.resetModules();

    const { TICKS_PER_YEAR } = await import('../../constants');
    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    world.tick = 2;

    const loop = createGameLoop(world) as unknown as GDPHarness;

    try {
      loop.recentDirectMarketFinalDemand[0] = 100;
      loop.recentRetailRevenue[0] = 50;
      loop.recentServiceRevenue[0] = 25;
      loop.recentDirectMarketFinalDemand[1] = 80;
      loop.recentRetailRevenue[1] = 40;
      loop.recentServiceRevenue[1] = 20;

      loop.updateGDP();

      expect(world.economyStats.gdp).toBeCloseTo((((100 + 50 + 25) + (80 + 40 + 20)) / 2) * TICKS_PER_YEAR, 5);
    } finally {
      loop.destroy();
    }
  });
});
```

- [ ] **Step 2: Run the GDP regression tests and verify they fail for the right reason**

Run:

```bash
npx vitest run src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts
```

Expected:

```text
FAIL  src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts
Property 'recentDirectMarketFinalDemand' does not exist on type 'GameLoop'
```

- [ ] **Step 3: Add the minimal final-demand GDP implementation**

Modify `src/core/loop/GameLoop.ts`:

```typescript
import {
  executeConsumerPurchases,
  CONSUMER_MARKET_CONFIG,
} from '../economy/ConsumerMarket';

export class GameLoop {
  private readonly recentDirectMarketFinalDemand = new Float64Array(TICKS_PER_MONTH);
  private readonly recentRetailRevenue = new Float64Array(TICKS_PER_MONTH);
  private readonly recentServiceRevenue = new Float64Array(TICKS_PER_MONTH);

  private updateGDP(): void {
    const windowLength = Math.max(TICKS_PER_DAY, Math.min(TICKS_PER_MONTH, this.world.tick));
    const currentTick = this.world.tick;
    let windowRevenue = 0;

    for (let offset = 0; offset < windowLength; offset++) {
      const slot = (currentTick - 1 - offset + TICKS_PER_MONTH) % TICKS_PER_MONTH;
      windowRevenue += this.recentDirectMarketFinalDemand[slot];
      windowRevenue += this.recentRetailRevenue[slot];
      windowRevenue += this.recentServiceRevenue[slot];
    }

    const averageDailyGDP = windowRevenue / windowLength;
    const annualizedGDP = averageDailyGDP * TICKS_PER_YEAR;

    if (this.world.economyStats.gdp <= 0) {
      this.world.economyStats.gdp = annualizedGDP;
      return;
    }

    this.world.economyStats.gdp =
      this.world.economyStats.gdp * 0.9 + annualizedGDP * 0.1;
  }
}
```

Also update the per-tick activity buffering in the main tick path:

```typescript
const consumerPurchases = executeConsumerPurchases(this.world, CONSUMER_MARKET_CONFIG);
const retailResult = updateRetailSystem(this.world);
const serviceConsumption = processServiceConsumption(this.world);

const dailyActivitySlot = (currentTick - 1) % TICKS_PER_MONTH;
this.recentDirectMarketFinalDemand[dailyActivitySlot] = consumerPurchases.totalSpent ?? 0;
this.recentRetailRevenue[dailyActivitySlot] = retailResult.totalRevenue ?? 0;
this.recentServiceRevenue[dailyActivitySlot] = serviceConsumption.totalRevenue ?? 0;
```

Remove the unused trade-ledger GDP scan imports after this change.

- [ ] **Step 4: Run the focused GDP tests plus the macro guard tests**

Run:

```bash
npx vitest run src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts src/core/economy/__tests__/China2019MacroBaseline.test.ts src/core/loop/__tests__/GameLoop.dayModel.test.ts
```

Expected:

```text
PASS  src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts
PASS  src/core/economy/__tests__/China2019MacroBaseline.test.ts
PASS  src/core/loop/__tests__/GameLoop.dayModel.test.ts
```

- [ ] **Step 5: Commit the GDP task**

```bash
git add src/core/loop/GameLoop.ts src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts
git commit -m "fix: base gdp on final demand activity"
```

### Task 2: Make Retail Inventory And Pricing Reflect Real Supply

**Files:**
- Create: `src/core/economy/__tests__/RetailSystem.marketRealism.test.ts`
- Modify: `src/core/economy/RetailSystem.ts`
- Modify: `src/core/world/WorldInitializer.ts`

- [ ] **Step 1: Write the failing retail realism regression tests**

Create `src/core/economy/__tests__/RetailSystem.marketRealism.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

import { GOODS_COUNT, MAX_SLOTS, RETAIL_PRICE_ADJUST_INTERVAL } from '../../constants';
import { GameWorld } from '../../world/GameWorld';
import { initializeWorld } from '../../world/WorldInitializer';
import { registerRetailStore, updateRetailSystem } from '../RetailSystem';

function appendRetailBuilding(world: GameWorld, ownerId = 0): number {
  const buildingId = world.buildings.count++;
  world.buildings.types[buildingId] = BuildingId.CONVENIENCE_STORE;
  world.buildings.owners[buildingId] = ownerId;
  world.buildings.levels[buildingId] = 1;
  world.buildings.efficiencies[buildingId] = 1;
  world.buildings.outputModeIds[buildingId] = 0;
  world.buildings.isActive[buildingId] = 1;

  const slotOffset = buildingId * MAX_SLOTS;
  for (let i = 0; i < MAX_SLOTS; i++) {
    world.buildings.slotMethods[slotOffset + i] = 0;
  }

  return buildingId;
}

describe('RetailSystem market realism', () => {
  it('registers runtime retail stores with zero stock by default', () => {
    const world = initializeWorld();
    const retailId = registerRetailStore(world, appendRetailBuilding(world));
    const foodIdx = retailId * GOODS_COUNT + GoodsId.FOOD;

    expect(world.retail.inventories[foodIdx]).toBe(0);
  });

  it('only seeds startup inventory when an explicit bootstrap ratio is provided', () => {
    const world = initializeWorld();
    const retailId = registerRetailStore(world, appendRetailBuilding(world), {
      initialInventoryRatio: 0.25,
    });
    const foodIdx = retailId * GOODS_COUNT + GoodsId.FOOD;

    expect(world.retail.inventories[foodIdx]).toBeCloseTo(
      world.retail.inventoryCapacities[foodIdx] * 0.25,
    );
  });

  it('anchors automatic retail pricing to purchase cost before base price', () => {
    const world = initializeWorld();
    const retailId = 0;
    const goodsId = GoodsId.FOOD;
    const idx = retailId * GOODS_COUNT + goodsId;

    world.retail.inventoryCapacities[idx] = 10;
    world.retail.inventories[idx] = 1;
    world.retail.markups[idx] = 0.3;
    world.retail.purchaseCosts[idx] = 250;
    world.goods.prices[goodsId] = 90;

    world.tick = RETAIL_PRICE_ADJUST_INTERVAL;
    updateRetailSystem(world);

    expect(world.retail.retailPrices[idx]).toBeCloseTo(
      world.retail.purchaseCosts[idx] * (1 + world.retail.markups[idx]),
      5,
    );
  });

  it('falls back to live market price when purchase cost is unavailable', () => {
    const world = initializeWorld();
    const retailId = 0;
    const goodsId = GoodsId.FOOD;
    const idx = retailId * GOODS_COUNT + goodsId;

    world.retail.inventoryCapacities[idx] = 10;
    world.retail.inventories[idx] = 1;
    world.retail.markups[idx] = 0.25;
    world.retail.purchaseCosts[idx] = 0;
    world.goods.prices[goodsId] = 88;

    world.tick = RETAIL_PRICE_ADJUST_INTERVAL;
    updateRetailSystem(world);

    expect(world.retail.retailPrices[idx]).toBeCloseTo(
      world.goods.prices[goodsId] * (1 + world.retail.markups[idx]),
      5,
    );
  });
});
```

- [ ] **Step 2: Run the retail realism tests and verify they fail for the right reasons**

Run:

```bash
npx vitest run src/core/economy/__tests__/RetailSystem.marketRealism.test.ts
```

Expected:

```text
FAIL  src/core/economy/__tests__/RetailSystem.marketRealism.test.ts
Expected inventory to be 0, received full capacity
```

- [ ] **Step 3: Implement explicit startup seeding and cost-based retail pricing**

Modify `src/core/economy/RetailSystem.ts`:

```typescript
export interface RegisterRetailStoreOptions {
  initialInventoryRatio?: number;
}

function getRetailPriceAnchor(world: GameWorld, goodsId: number, purchaseCost: number): number {
  if (purchaseCost > 0) {
    return purchaseCost;
  }

  const marketPrice = world.goods.prices[goodsId];
  if (marketPrice > 0) {
    return marketPrice;
  }

  const goods = ALL_GOODS.find(g => g.id === goodsId);
  return goods?.basePrice || 100;
}

export function registerRetailStore(
  world: GameWorld,
  buildingId: number,
  options: RegisterRetailStoreOptions = {},
): number {
  const { initialInventoryRatio = 0 } = options;
  const normalizedRatio = Math.max(0, Math.min(1, initialInventoryRatio));

  // existing validation and retailId setup stay unchanged

  for (const goodsId of retailConfig.allowedGoodsIds) {
    const idx = retailId * GOODS_COUNT + goodsId;
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    const basePrice = goods?.basePrice || 100;

    retail.inventoryCapacities[idx] = retailConfig.inventoryCapacity * capacityMultiplier;
    retail.markups[idx] =
      (retailConfig.markupRange[0] + retailConfig.markupRange[1]) / 2;
    retail.retailPrices[idx] = basePrice * (1 + retail.markups[idx]);
    retail.purchaseCosts[idx] = basePrice;
    retail.inventories[idx] = retail.inventoryCapacities[idx] * normalizedRatio;
  }

  console.log(
    `[RetailSystem] 注册零售店 #${retailId} (建筑${buildingId}, 所有者${ownerId}, 初始库存比例=${normalizedRatio})`,
  );

  return retailId;
}

function adjustRetailPrices(world: GameWorld): number {
  const retail = world.retail;
  let adjustments = 0;

  for (let retailId = 0; retailId < retail.count; retailId++) {
    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId];
    const retailConfig = getRetailConfig(buildingType);
    if (!retailConfig) continue;

    for (const goodsId of retailConfig.allowedGoodsIds) {
      const idx = retailId * GOODS_COUNT + goodsId;
      const stock = retail.inventories[idx];
      const capacity = retail.inventoryCapacities[idx];
      const dailySales = retail.dailySales[idx];
      const stockRatio = stock / Math.max(1, capacity);
      const salesRate = dailySales > 0 ? dailySales : 0.1;
      const turnoverDays = stock / salesRate;

      let newMarkup = retail.markups[idx];
      const [minMarkup, maxMarkup] = retailConfig.markupRange;

      if (stockRatio > 0.8 || turnoverDays > RETAIL_MAX_TURNOVER_DAYS) {
        newMarkup *= 0.95;
        adjustments++;
      } else if (stockRatio < 0.2 && dailySales > 0) {
        newMarkup *= 1.05;
        adjustments++;
      }

      newMarkup = Math.max(minMarkup, Math.min(maxMarkup, newMarkup));
      retail.markups[idx] = newMarkup;

      const priceAnchor = getRetailPriceAnchor(world, goodsId, retail.purchaseCosts[idx]);
      retail.retailPrices[idx] = priceAnchor * (1 + newMarkup);
    }
  }

  return adjustments;
}
```

Modify `src/core/world/WorldInitializer.ts` to use the explicit registration API:

```typescript
const playerRetailBuildingId = addRetailBuilding(world, 0, BuildingId.CONVENIENCE_STORE);
if (playerRetailBuildingId >= 0) {
  registerRetailStore(world, playerRetailBuildingId, { initialInventoryRatio: 0 });
}
```

- [ ] **Step 4: Run the new retail tests and the existing retail regressions**

Run:

```bash
npx vitest run src/core/economy/__tests__/RetailSystem.marketRealism.test.ts src/core/economy/__tests__/RetailSystem.dayModel.test.ts src/core/economy/__tests__/RetailSalesActivation.test.ts src/core/economy/__tests__/ConsumerMarket.retailFallback.test.ts
```

Expected:

```text
PASS  src/core/economy/__tests__/RetailSystem.marketRealism.test.ts
PASS  src/core/economy/__tests__/RetailSystem.dayModel.test.ts
PASS  src/core/economy/__tests__/RetailSalesActivation.test.ts
PASS  src/core/economy/__tests__/ConsumerMarket.retailFallback.test.ts
```

- [ ] **Step 5: Commit the retail task**

```bash
git add src/core/economy/RetailSystem.ts src/core/world/WorldInitializer.ts src/core/economy/__tests__/RetailSystem.marketRealism.test.ts
git commit -m "fix: make retail stock and pricing reflect real supply"
```

### Task 3: Turn Forced Market Support Into A Guarded Fallback

**Files:**
- Create: `src/core/ai/MarketSupportGuard.ts`
- Create: `src/core/ai/__tests__/MarketSupportGuard.test.ts`
- Create: `src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts`
- Modify: `src/core/ai/AIDecisionEngine.ts`

- [ ] **Step 1: Write the failing persistence/cooldown guard tests**

Create `src/core/ai/__tests__/MarketSupportGuard.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import {
  createMarketSupportGuardState,
  markMarketSupportTriggered,
  shouldTriggerMarketSupport,
} from '../MarketSupportGuard';

describe('MarketSupportGuard', () => {
  it('requires repeated shortage observations before support is allowed', () => {
    const state = createMarketSupportGuardState();

    expect(
      shouldTriggerMarketSupport(state, {
        kind: 'zeroSupply',
        goodsId: 7,
        tick: 15,
        shortageDetected: true,
        hasDemand: true,
        hasActiveProducer: false,
        hasInFlightCapacity: false,
        requiredStreak: 2,
        cooldownTicks: 90,
      }),
    ).toBe(false);

    expect(
      shouldTriggerMarketSupport(state, {
        kind: 'zeroSupply',
        goodsId: 7,
        tick: 30,
        shortageDetected: true,
        hasDemand: true,
        hasActiveProducer: false,
        hasInFlightCapacity: false,
        requiredStreak: 2,
        cooldownTicks: 90,
      }),
    ).toBe(true);
  });

  it('blocks repeated interventions during cooldown and resets after recovery', () => {
    const state = createMarketSupportGuardState();

    const baseSignal = {
      kind: 'coldGoods' as const,
      goodsId: 11,
      shortageDetected: true,
      hasDemand: true,
      hasActiveProducer: false,
      hasInFlightCapacity: false,
      requiredStreak: 1,
      cooldownTicks: 120,
    };

    expect(shouldTriggerMarketSupport(state, { ...baseSignal, tick: 30 })).toBe(true);
    markMarketSupportTriggered(state, 'coldGoods', 11, 30);

    expect(shouldTriggerMarketSupport(state, { ...baseSignal, tick: 60 })).toBe(false);

    expect(
      shouldTriggerMarketSupport(state, {
        ...baseSignal,
        tick: 90,
        shortageDetected: false,
      }),
    ).toBe(false);

    expect(shouldTriggerMarketSupport(state, { ...baseSignal, tick: 180 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the guard tests and verify they fail because the module does not exist yet**

Run:

```bash
npx vitest run src/core/ai/__tests__/MarketSupportGuard.test.ts
```

Expected:

```text
FAIL  src/core/ai/__tests__/MarketSupportGuard.test.ts
Error: Failed to resolve import "../MarketSupportGuard"
```

- [ ] **Step 3: Implement the minimal support guard module**

Create `src/core/ai/MarketSupportGuard.ts`:

```typescript
export type MarketSupportKind = 'zeroSupply' | 'coldGoods';

export interface MarketSupportSignal {
  kind: MarketSupportKind;
  goodsId: number;
  tick: number;
  shortageDetected: boolean;
  hasDemand: boolean;
  hasActiveProducer: boolean;
  hasInFlightCapacity: boolean;
  requiredStreak: number;
  cooldownTicks: number;
}

export interface MarketSupportGuardState {
  shortageStreaks: Map<string, number>;
  lastTriggeredTick: Map<string, number>;
}

function guardKey(kind: MarketSupportKind, goodsId: number): string {
  return `${kind}:${goodsId}`;
}

export function createMarketSupportGuardState(): MarketSupportGuardState {
  return {
    shortageStreaks: new Map(),
    lastTriggeredTick: new Map(),
  };
}

export function shouldTriggerMarketSupport(
  state: MarketSupportGuardState,
  signal: MarketSupportSignal,
): boolean {
  const key = guardKey(signal.kind, signal.goodsId);

  if (
    !signal.shortageDetected ||
    !signal.hasDemand ||
    signal.hasActiveProducer ||
    signal.hasInFlightCapacity
  ) {
    state.shortageStreaks.delete(key);
    return false;
  }

  const nextStreak = (state.shortageStreaks.get(key) ?? 0) + 1;
  state.shortageStreaks.set(key, nextStreak);

  const lastTriggered = state.lastTriggeredTick.get(key) ?? -Infinity;
  const cooldownReady = signal.tick - lastTriggered >= signal.cooldownTicks;

  return nextStreak >= signal.requiredStreak && cooldownReady;
}

export function markMarketSupportTriggered(
  state: MarketSupportGuardState,
  kind: MarketSupportKind,
  goodsId: number,
  tick: number,
): void {
  const key = guardKey(kind, goodsId);
  state.lastTriggeredTick.set(key, tick);
  state.shortageStreaks.set(key, 0);
}
```

- [ ] **Step 4: Add the failing long-run market-balance regression**

Create `src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
  vi.restoreAllMocks();
});

function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function countNegativeCash(values: Float64Array | Float32Array, start = 0): number {
  let count = 0;

  for (let i = start; i < values.length; i++) {
    if ((values[i] ?? 0) < 0) {
      count++;
    }
  }

  return count;
}

describe('GameLoop long-run market balance', () => {
  it.each([1, 42, 1337])(
    'contains zero-supply and insolvency drift through 720 ticks (seed=%i)',
    async seed => {
      vi.resetModules();
      vi.spyOn(Math, 'random').mockImplementation(createDeterministicRandom(seed));

      const { getZeroSupplyGoodsReport } = await import('../../ai/AIDecisionEngine');
      const { initializeWorld } = await import('../../world/WorldInitializer');
      const { createGameLoop } = await import('../GameLoop');

      const world = initializeWorld();
      const loop = createGameLoop(world);

      let zeroSupplyAt360 = 0;
      let negativeCashAt360 = 0;

      try {
        for (let tick = 0; tick < 720; tick++) {
          loop.manualTick();

          if (tick === 359) {
            zeroSupplyAt360 = getZeroSupplyGoodsReport(world).length;
            negativeCashAt360 = countNegativeCash(world.companies.cash, 1);
          }
        }
      } finally {
        loop.destroy();
      }

      const zeroSupplyAt720 = getZeroSupplyGoodsReport(world).length;
      const negativeCashAt720 = countNegativeCash(world.companies.cash, 1);

      expect(zeroSupplyAt360).toBeLessThanOrEqual(38);
      expect(negativeCashAt360).toBeLessThanOrEqual(8);
      expect(zeroSupplyAt720).toBeLessThanOrEqual(48);
      expect(negativeCashAt720).toBeLessThanOrEqual(15);
    },
    30000,
  );
});
```

- [ ] **Step 5: Run the long-run regression and confirm it fails against the current baseline**

Run:

```bash
npx vitest run src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts
```

Expected:

```text
FAIL  src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts
Expected zeroSupplyAt720 to be less than or equal to 48
Received: 52-61 range depending on seed
```

- [ ] **Step 6: Wire the guard into `AIDecisionEngine` and soften forced support**

Modify `src/core/ai/AIDecisionEngine.ts`:

```typescript
import {
  createMarketSupportGuardState,
  markMarketSupportTriggered,
  shouldTriggerMarketSupport,
  type MarketSupportGuardState,
} from './MarketSupportGuard';

const marketSupportStateByWorld = new WeakMap<GameWorld, MarketSupportGuardState>();

function getMarketSupportState(world: GameWorld): MarketSupportGuardState {
  let state = marketSupportStateByWorld.get(world);
  if (!state) {
    state = createMarketSupportGuardState();
    marketSupportStateByWorld.set(world, state);
  }
  return state;
}

function hasPendingConstructionForGoods(world: GameWorld, goodsId: number): boolean {
  for (let queueId = 0; queueId < world.construction.count; queueId++) {
    if (!world.construction.isActive[queueId]) continue;

    const buildingTypeId = world.construction.buildingTypeIds[queueId];
    const outputModeId = world.construction.outputModeIds[queueId];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (production?.outputs.some(output => output.goodsId === goodsId)) {
      return true;
    }
  }

  return false;
}

export function forceBuildzeroSupplyGoods(world: GameWorld): number {
  if (world.tick % 15 !== 0) {
    return 0;
  }

  const guard = getMarketSupportState(world);
  const zeroSupplyGoods = detectZeroSupplyGoods(world);
  let triggeredBuilds = 0;

  for (const zeroGoods of zeroSupplyGoods.slice(0, 4)) {
    if (
      !shouldTriggerMarketSupport(guard, {
        kind: 'zeroSupply',
        goodsId: zeroGoods.goodsId,
        tick: world.tick,
        shortageDetected: true,
        hasDemand: world.goods.demands[zeroGoods.goodsId] > 0,
        hasActiveProducer: world.goods.supplies[zeroGoods.goodsId] > 0,
        hasInFlightCapacity: hasPendingConstructionForGoods(world, zeroGoods.goodsId),
        requiredStreak: 2,
        cooldownTicks: 90,
      })
    ) {
      continue;
    }

    const decision: AIDecision = {
      type: 'investment',
      companyId: selectedCompanyId,
      action: 'build',
      params: {
        buildingTypeId: zeroGoods.buildingTypeId,
        outputModeId: zeroGoods.outputModeId,
        cost: zeroGoods.buildingCost,
        targetGoodsId: zeroGoods.goodsId,
        reason: 'zero_supply_forced',
        dependencyCount: zeroGoods.dependencyCount,
      },
      priority: 16,
      expectedProfit: zeroGoods.buildingCost * 0.35,
      confidence: 0.8,
    };

    if (executeDecision(world, decision)) {
      markMarketSupportTriggered(guard, 'zeroSupply', zeroGoods.goodsId, world.tick);
      triggeredBuilds++;
    }
  }

  return triggeredBuilds;
}

export function buildForColdGoods(world: GameWorld): number {
  if (world.tick % 30 !== 0) {
    return 0;
  }

  const guard = getMarketSupportState(world);
  const coldGoods = detectColdGoods(world);
  let triggeredDecisions = 0;

  for (const cold of coldGoods.slice(0, 3)) {
    if (
      !shouldTriggerMarketSupport(guard, {
        kind: 'coldGoods',
        goodsId: cold.goodsId,
        tick: world.tick,
        shortageDetected: cold.marketSupply < 100 && cold.producerCount <= 1,
        hasDemand: Math.max(cold.orderBookDemand, world.goods.demands[cold.goodsId]) > 0,
        hasActiveProducer: cold.producerCount > 0,
        hasInFlightCapacity: hasPendingConstructionForGoods(world, cold.goodsId),
        requiredStreak: 2,
        cooldownTicks: 120,
      })
    ) {
      continue;
    }

    const decision: AIDecision = {
      type: 'investment',
      companyId: bestCompanyId,
      action: 'build',
      params: {
        buildingTypeId: building.id,
        outputModeId,
        cost: building.buildCost,
        targetGoodsId: cold.goodsId,
        reason: 'cold_goods_supply',
        orderBookDemand: cold.orderBookDemand,
        producerCount: cold.producerCount,
      },
      priority: 12 + cold.urgencyScore / 25,
      expectedProfit: building.buildCost * 0.25,
      confidence: 0.75,
    };

    if (executeDecision(world, decision)) {
      markMarketSupportTriggered(guard, 'coldGoods', cold.goodsId, world.tick);
      triggeredDecisions++;
    }
  }

  return triggeredDecisions;
}
```

- [ ] **Step 7: Run the support-guard and long-run stability regressions**

Run:

```bash
npx vitest run src/core/ai/__tests__/MarketSupportGuard.test.ts src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts
```

Expected:

```text
PASS  src/core/ai/__tests__/MarketSupportGuard.test.ts
PASS  src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts
PASS  src/core/loop/__tests__/GameLoop.marketCoverage.test.ts
PASS  src/core/loop/__tests__/GameLoop.economyStability.test.ts
```

- [ ] **Step 8: Commit the guarded-support task**

```bash
git add src/core/ai/MarketSupportGuard.ts src/core/ai/__tests__/MarketSupportGuard.test.ts src/core/ai/AIDecisionEngine.ts src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts
git commit -m "fix: guard forced market support interventions"
```

### Task 4: Run The Full Verification Sweep

**Files:**
- Test: `src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts`
- Test: `src/core/economy/__tests__/RetailSystem.marketRealism.test.ts`
- Test: `src/core/ai/__tests__/MarketSupportGuard.test.ts`
- Test: `src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts`
- Test: `src/core/loop/__tests__/GameLoop.marketCoverage.test.ts`
- Test: `src/core/loop/__tests__/GameLoop.economyStability.test.ts`
- Test: `src/core/economy/__tests__/China2019MacroBaseline.test.ts`
- Test: `src/core/economy/__tests__/ConsumerMarket.retailFallback.test.ts`

- [ ] **Step 1: Run the targeted regression suite**

Run:

```bash
npx vitest run src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts src/core/economy/__tests__/RetailSystem.marketRealism.test.ts src/core/ai/__tests__/MarketSupportGuard.test.ts src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts src/core/economy/__tests__/China2019MacroBaseline.test.ts src/core/economy/__tests__/ConsumerMarket.retailFallback.test.ts src/core/economy/__tests__/RetailSystem.dayModel.test.ts
```

Expected:

```text
All listed files PASS with 0 failed tests
```

- [ ] **Step 2: Run the original representative economy suite**

Run:

```bash
npx vitest run src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts src/core/economy/__tests__/China2019MacroBaseline.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.dayModel.test.ts src/core/finance/__tests__/StockMarket.dayModel.test.ts
```

Expected:

```text
All listed files PASS with 0 failed tests
```

- [ ] **Step 3: Record the long-run outcome before claiming completion**

Run:

```bash
npx vitest run src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts
```

Expected:

```text
PASS  src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts
```

- [ ] **Step 4: Commit the final verification snapshot**

```bash
git add src/core/loop/GameLoop.ts src/core/economy/RetailSystem.ts src/core/world/WorldInitializer.ts src/core/ai/MarketSupportGuard.ts src/core/ai/AIDecisionEngine.ts src/core/loop/__tests__/GameLoop.gdpFinalDemand.test.ts src/core/economy/__tests__/RetailSystem.marketRealism.test.ts src/core/ai/__tests__/MarketSupportGuard.test.ts src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts
git commit -m "test: lock economy market balance regressions"
```
