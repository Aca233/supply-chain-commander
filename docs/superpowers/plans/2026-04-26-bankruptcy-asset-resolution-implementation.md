# Bankruptcy Asset Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old silent bankruptcy liquidation path with a dedicated, day-based bankruptcy resolution feature that freezes the company, runs public asset auctions, settles debts, delists stock, and supports player strategy plus manual confirmation.

**Architecture:** Add a dedicated `BankruptcyResolution` domain module that owns bankruptcy event state, auction lots, bids, settlement, and restructuring snapshots. `GameLoop` should only detect insolvency and hand the company off to this module; persistence, store actions, and UI will consume the module’s serialized snapshot instead of re-implementing bankruptcy logic in multiple places.

**Tech Stack:** TypeScript, React 18, Zustand, Vitest, Vite

---

## Scope Note

Keep this as one plan. The bankruptcy feature spans one coherent lifecycle: detect -> freeze -> unwind orders/contracts -> auction -> settle -> delist -> restructure -> persist -> render. Splitting these into separate plans would create interface churn and make it too easy to reintroduce the old silent liquidation path.

## File Map

- Create: `src/core/finance/BankruptcyResolution.ts` — single source of truth for bankruptcy events, auction assets, bids, settlement, restructure cooldown, and save snapshots.
- Create: `src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts` — event creation, freeze, debt settlement, stock delist, and cooldown coverage.
- Create: `src/core/finance/__tests__/BankruptcyResolution.auction.test.ts` — manual bids, strategy bids, pending confirmation, fallback, and unsold asset handling.
- Modify: `src/core/loop/GameLoop.ts` — remove direct liquidation and hand off to `BankruptcyResolution`.
- Modify: `src/core/loop/__tests__/GameLoop.bankruptcyLiquidation.test.ts` — regression test for “no silent player takeover”.
- Modify: `src/core/market/OrderBook.ts` — company-wide order cancellation helper for bankruptcy freeze.
- Modify: `src/core/economy/SupplyContracts.ts` — company-wide breach helper for bankruptcy defaults.
- Modify: `src/core/finance/StockMarket.ts` — halt/delist helpers and shareholder residual settlement.
- Modify: `src/core/save/SaveManager.ts` — persist bankruptcy snapshot and strategy settings.
- Create: `src/core/save/__tests__/SaveManager.bankruptcyResolution.test.ts` — save/load round-trip for active bankruptcy events.
- Modify: `src/stores/gameStore.ts` — expose bankruptcy selectors/actions and player notifications.
- Modify: `src/ui/pages/Settings.tsx` — persistent bankruptcy strategy controls.
- Create: `src/ui/components/Finance/BankruptcyResolutionPanel.tsx` — finance-page event panel for auctions, risk summary, and confirmations.
- Create: `src/ui/components/Finance/__tests__/BankruptcyResolutionPanel.test.tsx` — UI coverage for day-based countdowns and pending confirmation actions.
- Modify: `src/ui/components/Finance/index.ts` — export the new bankruptcy panel.
- Modify: `src/ui/pages/Finance.tsx` — mount the panel in the finance surface.
- Modify: `src/ui/components/Finance/StockMarketPanel.tsx` — surface halted/delisted stock states and disable trading buttons when appropriate.

### Task 1: Scaffold Bankruptcy State And Strategy Defaults

**Files:**
- Create: `src/core/finance/BankruptcyResolution.ts`
- Create: `src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts
import { beforeEach, describe, expect, it } from 'vitest';

import { GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import {
  bankruptcyResolution,
  resetBankruptcyResolution,
} from '../BankruptcyResolution';

describe('BankruptcyResolution lifecycle', () => {
  beforeEach(() => {
    resetBankruptcyResolution();
  });

  it('creates a frozen bankruptcy event with building and inventory auction lots', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '破产AI';
    world.companies.cash[1] = -50_000;
    world.companies.totalLiabilities[1] = 600_000;

    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    world.companies.inventories[1 * GOODS_COUNT + 0] = 120;

    const event = bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 240);
    const assets = bankruptcyResolution.getEventAssets(event.id);

    expect(event.status).toBe('bankruptcy_frozen');
    expect(event.expiresTick).toBe(240 + 14 * TICKS_PER_DAY);
    expect(assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assetType: 'building', buildingId }),
        expect.objectContaining({ assetType: 'inventory', goodsId: 0, quantity: 120 }),
      ]),
    );
    expect(world.buildings.isActive[buildingId]).toBe(0);
  });

  it('returns notify-only as the default player strategy', () => {
    expect(bankruptcyResolution.getStrategy(0)).toEqual({
      mode: 'notify_only',
      eventBudgetCap: 0,
      assetBudgetCap: 0,
      autoTrackSameIndustry: false,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

Expected: FAIL because `BankruptcyResolution.ts` does not exist, there is no bankruptcy event model yet, and player strategy defaults are not defined anywhere.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/finance/BankruptcyResolution.ts
import { TICKS_PER_DAY } from '@/core/constants';
import { GameWorld } from '@/core/world/GameWorld';

export type BankruptcyEventStatus =
  | 'bankruptcy_frozen'
  | 'auction_open'
  | 'settlement_in_progress'
  | 'delisted'
  | 'restructure_cooldown'
  | 'restructured';

export type BankruptcyStrategyMode =
  | 'auto_participate'
  | 'notify_only'
  | 'never_participate';

export interface BankruptcyStrategySettings {
  mode: BankruptcyStrategyMode;
  eventBudgetCap: number;
  assetBudgetCap: number;
  autoTrackSameIndustry: boolean;
}

export interface BankruptcyAuctionAsset {
  id: string;
  eventId: string;
  assetType: 'building' | 'inventory';
  buildingId?: number;
  goodsId?: number;
  quantity: number;
  reservePrice: number;
  state: 'queued' | 'open' | 'pending_confirmation' | 'sold' | 'unsold' | 'destroyed';
  currentHighestBid: number;
  currentHighestBidderId: number | null;
  discountedRound: number;
  auctionEndTick: number | null;
  bids: Array<{
    bidderId: number;
    amount: number;
    source: 'manual' | 'strategy';
    createdTick: number;
  }>;
  pendingWinnerId?: number;
  pendingConfirmUntilTick?: number;
}

export interface BankruptcyEvent {
  id: string;
  companyId: number;
  status: BankruptcyEventStatus;
  createdTick: number;
  expiresTick: number;
  reason: string;
  debtSnapshot: number;
  estateCash: number;
  settlementCosts: number;
  assetIds: string[];
  delisted: boolean;
  restructureAvailableTick?: number;
}

export interface BankruptcyResolutionSnapshot {
  events: BankruptcyEvent[];
  assets: BankruptcyAuctionAsset[];
  strategies: Record<string, BankruptcyStrategySettings>;
  nextEventId: number;
  nextAssetId: number;
}

const DEFAULT_STRATEGY: BankruptcyStrategySettings = {
  mode: 'notify_only',
  eventBudgetCap: 0,
  assetBudgetCap: 0,
  autoTrackSameIndustry: false,
};

class BankruptcyResolutionManager {
  private events = new Map<string, BankruptcyEvent>();
  private assets = new Map<string, BankruptcyAuctionAsset>();
  private strategies = new Map<number, BankruptcyStrategySettings>();
  private nextEventId = 1;
  private nextAssetId = 1;

  reset(): void {
    this.events.clear();
    this.assets.clear();
    this.strategies.clear();
    this.nextEventId = 1;
    this.nextAssetId = 1;
  }

  getStrategy(companyId: number): BankruptcyStrategySettings {
    return this.strategies.get(companyId) ?? { ...DEFAULT_STRATEGY };
  }

  setStrategy(companyId: number, patch: Partial<BankruptcyStrategySettings>): BankruptcyStrategySettings {
    const next = { ...this.getStrategy(companyId), ...patch };
    this.strategies.set(companyId, next);
    return next;
  }

  openEvent(world: GameWorld, companyId: number, reason: string, currentTick: number): BankruptcyEvent {
    const id = `bk-${this.nextEventId++}`;
    const assetIds: string[] = [];

    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] !== companyId) continue;
      world.buildings.isActive[i] = 0;
      const assetId = `bk-asset-${this.nextAssetId++}`;
      this.assets.set(assetId, {
        id: assetId,
        eventId: id,
        assetType: 'building',
        buildingId: i,
        quantity: 1,
        reservePrice: 200_000,
        state: 'queued',
        currentHighestBid: 0,
        currentHighestBidderId: null,
        discountedRound: 0,
        auctionEndTick: null,
        bids: [],
      });
      assetIds.push(assetId);
    }

    for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
      const quantity = world.companies.inventories[companyId * world.goods.count + goodsId];
      if (quantity <= 0) continue;
      const assetId = `bk-asset-${this.nextAssetId++}`;
      this.assets.set(assetId, {
        id: assetId,
        eventId: id,
        assetType: 'inventory',
        goodsId,
        quantity,
        reservePrice: world.goods.prices[goodsId] * quantity * 0.6,
        state: 'queued',
        currentHighestBid: 0,
        currentHighestBidderId: null,
        discountedRound: 0,
        auctionEndTick: null,
        bids: [],
      });
      assetIds.push(assetId);
    }

    const event: BankruptcyEvent = {
      id,
      companyId,
      status: 'bankruptcy_frozen',
      createdTick: currentTick,
      expiresTick: currentTick + 14 * TICKS_PER_DAY,
      reason,
      debtSnapshot: world.companies.totalLiabilities[companyId],
      estateCash: Math.max(0, world.companies.cash[companyId]),
      settlementCosts: 0,
      assetIds,
      delisted: false,
    };

    this.events.set(id, event);
    return event;
  }

  getEvent(eventId: string): BankruptcyEvent | undefined {
    return this.events.get(eventId);
  }

  getEventAssets(eventId: string): BankruptcyAuctionAsset[] {
    return [...this.assets.values()].filter(asset => asset.eventId === eventId);
  }

  getCompanyEvents(companyId: number): BankruptcyEvent[] {
    return [...this.events.values()].filter(event => event.companyId === companyId);
  }

  getAsset(assetId: string): BankruptcyAuctionAsset | undefined {
    return this.assets.get(assetId);
  }
}

export const bankruptcyResolution = new BankruptcyResolutionManager();

export function resetBankruptcyResolution(): void {
  bankruptcyResolution.reset();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

Expected: PASS and the new module now exposes a concrete event model plus player strategy defaults.

- [ ] **Step 5: Commit**

```bash
git add src/core/finance/BankruptcyResolution.ts src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts
git commit -m "feat: scaffold bankruptcy resolution state"
```

### Task 2: Replace Silent Liquidation In GameLoop

**Files:**
- Modify: `src/core/loop/GameLoop.ts`
- Modify: `src/core/loop/__tests__/GameLoop.bankruptcyLiquidation.test.ts`
- Modify: `src/core/finance/BankruptcyResolution.ts`

- [ ] **Step 1: Write the failing regression test**

```ts
// src/core/loop/__tests__/GameLoop.bankruptcyLiquidation.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
});

describe('GameLoop bankruptcy liquidation', () => {
  it('freezes bankrupt AI companies instead of auto-selling their assets to the player or another AI', async () => {
    vi.resetModules();

    const { createGameWorld } = await import('../../world/GameWorld');
    const { addBuilding } = await import('../../world/WorldInitializer');
    const { BuildingId } = await import('@/data/buildings');
    const { createGameLoop } = await import('../GameLoop');
    const { bankruptcyResolution, resetBankruptcyResolution } = await import('../../finance/BankruptcyResolution');

    resetBankruptcyResolution();

    const world = createGameWorld();
    world.companies.count = 3;
    world.companies.names[0] = '玩家公司';
    world.companies.names[1] = '破产AI';
    world.companies.names[2] = '健康AI';
    world.companies.isAI[0] = false;
    world.companies.isAI[1] = true;
    world.companies.isAI[2] = true;
    world.companies.cash[0] = 1_000_000;
    world.companies.cash[1] = -50_000;
    world.companies.cash[2] = 2_000_000;
    world.companies.totalLiabilities[1] = 900_000;

    const bankruptBuildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    const loop = createGameLoop(world);

    try {
      (loop as unknown as { handleBankruptcy(companyId: number): void }).handleBankruptcy(1);
    } finally {
      loop.destroy();
    }

    const [event] = bankruptcyResolution.getCompanyEvents(1);
    expect(event.status).toBe('bankruptcy_frozen');
    expect(world.buildings.owners[bankruptBuildingId]).toBe(1);
    expect(world.buildings.isActive[bankruptBuildingId]).toBe(0);
    expect(world.companies.cash[0]).toBe(1_000_000);
    expect(world.companies.cash[2]).toBe(2_000_000);
  });
});
```

- [ ] **Step 2: Run the regression test to verify it fails**

Run: `npm test -- src/core/loop/__tests__/GameLoop.bankruptcyLiquidation.test.ts`

Expected: FAIL because `GameLoop.handleBankruptcy()` still sells buildings immediately, mutates owners, repays debt on the spot, and may restructure the company in the same method.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/finance/BankruptcyResolution.ts
// add to BankruptcyResolutionManager
hasActiveEvent(companyId: number): boolean {
  return [...this.events.values()].some(event =>
    event.companyId === companyId &&
    event.status !== 'restructured',
  );
}

advance(world: GameWorld, currentTick: number): void {
  for (const event of this.events.values()) {
    if (event.status === 'bankruptcy_frozen') {
      event.status = 'auction_open';
      event.expiresTick = currentTick + 7 * TICKS_PER_DAY;

      for (const asset of this.getEventAssets(event.id)) {
        asset.state = 'open';
        asset.auctionEndTick = currentTick + 3 * TICKS_PER_DAY;
      }
    }
  }
}
```

```ts
// src/core/loop/GameLoop.ts
import { bankruptcyResolution } from '../finance/BankruptcyResolution';

// inside processTick()
if (currentTick % 100 === 0) {
  this.checkAIBankruptcy();
}
bankruptcyResolution.advance(this.world, currentTick);

// inside checkAIBankruptcy()
if (bankruptcyResolution.hasActiveEvent(i)) {
  continue;
}

// replace handleBankruptcy()
private handleBankruptcy(companyId: number): void {
  if (bankruptcyResolution.hasActiveEvent(companyId)) {
    return;
  }

  const companyName = this.world.companies.names[companyId];
  console.log(`[破产] 公司 ${companyName} 已进入破产处置`);

  trackCompanyBankrupt(this.world.tick, companyId, companyName);
  bankruptcyResolution.openEvent(this.world, companyId, 'insolvent', this.world.tick);
}
```

- [ ] **Step 4: Run the regression test to verify it passes**

Run: `npm test -- src/core/loop/__tests__/GameLoop.bankruptcyLiquidation.test.ts src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

Expected: PASS and `GameLoop` no longer transfers buildings, repays debt, or restructures inline.

- [ ] **Step 5: Commit**

```bash
git add src/core/loop/GameLoop.ts src/core/loop/__tests__/GameLoop.bankruptcyLiquidation.test.ts src/core/finance/BankruptcyResolution.ts
git commit -m "refactor: route bankruptcies through bankruptcy resolution"
```

### Task 3: Cancel Market Orders And Breach Contracts On Freeze

**Files:**
- Modify: `src/core/market/OrderBook.ts`
- Modify: `src/core/economy/SupplyContracts.ts`
- Modify: `src/core/finance/BankruptcyResolution.ts`
- Modify: `src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

- [ ] **Step 1: Extend the failing lifecycle test**

```ts
// append to src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts
import { createBuyOrder, createSellOrderWithReason } from '@/core/market/OrderBook';
import {
  ContractRole,
  ContractStatus,
  supplyContractManager,
} from '@/core/economy/SupplyContracts';

it('cancels open market orders and breaches long-term contracts when the event opens', () => {
  const world = createGameWorld();
  world.companies.count = 2;
  world.companies.names[0] = '玩家公司';
  world.companies.names[1] = '破产AI';
  world.companies.cash[1] = 300_000;
  world.companies.totalLiabilities[1] = 400_000;
  world.companies.inventories[1 * GOODS_COUNT + 0] = 200;

  createBuyOrder(world, 1, 18, 50, 120);
  createSellOrderWithReason(world, 1, 0, 100, 80);

  const proposal = supplyContractManager.createProposal(
    1,
    0,
    ContractRole.SUPPLIER,
    0,
    40,
    7,
    3,
    90,
    120,
  );
  const contract = supplyContractManager.acceptProposal(proposal.id, 120)!;

  bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 120);

  expect(world.orders.activeCount).toBe(0);
  expect(world.companies.inventoryReserved[1 * GOODS_COUNT + 0]).toBe(0);
  expect(
    supplyContractManager.getCompanyContracts(1).find(entry => entry.id === contract.id)?.status,
  ).toBe(ContractStatus.BREACHED);
  expect(bankruptcyResolution.getCompanyEvents(1)[0].settlementCosts).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the lifecycle test to verify it fails**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

Expected: FAIL because bankruptcy open still leaves market orders active, reserved inventory uncleared, and contracts untouched.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/market/OrderBook.ts
export function cancelCompanyOrders(
  world: GameWorld,
  companyId: number,
): {
  orderIndices: number[];
  refundedCash: number;
  returnedInventory: number;
} {
  const orderIndices = [...activeOrderIndices].filter(
    orderIdx => world.orders.companyIds[orderIdx] === companyId,
  );

  let refundedCash = 0;
  let returnedInventory = 0;

  for (const orderIdx of orderIndices) {
    const remaining = world.orders.remainings[orderIdx];
    const price = world.orders.prices[orderIdx];
    const type = world.orders.types[orderIdx];
    if (type === 0) {
      refundedCash += remaining * price;
    } else {
      returnedInventory += remaining;
    }
    cancelOrder(world, orderIdx);
  }

  return { orderIndices, refundedCash, returnedInventory };
}
```

```ts
// src/core/economy/SupplyContracts.ts
export class SupplyContractManager {
  terminateCompanyContractsForBankruptcy(
    companyId: number,
    currentTick: number,
  ): Array<{ contractId: number; penalty: number }> {
    const impacted: Array<{ contractId: number; penalty: number }> = [];

    for (const contract of this.getCompanyContracts(companyId, true)) {
      if (contract.status !== ContractStatus.ACTIVE) {
        continue;
      }

      const result = this.terminateContract(contract.id, 'breach', currentTick);
      impacted.push({
        contractId: contract.id,
        penalty: result.penalty,
      });
    }

    return impacted;
  }
}
```

```ts
// src/core/finance/BankruptcyResolution.ts
import { supplyContractManager } from '@/core/economy/SupplyContracts';
import { cancelCompanyOrders } from '@/core/market/OrderBook';

export interface BankruptcyEvent {
  id: string;
  companyId: number;
  status: BankruptcyEventStatus;
  createdTick: number;
  expiresTick: number;
  reason: string;
  debtSnapshot: number;
  estateCash: number;
  settlementCosts: number;
  assetIds: string[];
  delisted: boolean;
  restructureAvailableTick?: number;
  cancelledOrderIndices: number[];
  breachedContractIds: number[];
}

openEvent(world: GameWorld, companyId: number, reason: string, currentTick: number): BankruptcyEvent {
  const id = `bk-${this.nextEventId++}`;
  const assetIds: string[] = [];

  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    world.buildings.isActive[i] = 0;

    const assetId = `bk-asset-${this.nextAssetId++}`;
    this.assets.set(assetId, {
      id: assetId,
      eventId: id,
      assetType: 'building',
      buildingId: i,
      quantity: 1,
      reservePrice: 200_000,
      state: 'queued',
      currentHighestBid: 0,
      currentHighestBidderId: null,
      discountedRound: 0,
      auctionEndTick: null,
      bids: [],
    });
    assetIds.push(assetId);
  }

  for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
    const quantity = world.companies.inventories[companyId * world.goods.count + goodsId];
    if (quantity <= 0) continue;

    const assetId = `bk-asset-${this.nextAssetId++}`;
    this.assets.set(assetId, {
      id: assetId,
      eventId: id,
      assetType: 'inventory',
      goodsId,
      quantity,
      reservePrice: world.goods.prices[goodsId] * quantity * 0.6,
      state: 'queued',
      currentHighestBid: 0,
      currentHighestBidderId: null,
      discountedRound: 0,
      auctionEndTick: null,
      bids: [],
    });
    assetIds.push(assetId);
  }

  const cancelledOrders = cancelCompanyOrders(world, companyId);
  const breachedContracts = supplyContractManager.terminateCompanyContractsForBankruptcy(
    companyId,
    currentTick,
  );

  const event: BankruptcyEvent = {
    id,
    companyId,
    status: 'bankruptcy_frozen',
    createdTick: currentTick,
    expiresTick: currentTick + 14 * TICKS_PER_DAY,
    reason,
    debtSnapshot: world.companies.totalLiabilities[companyId],
    estateCash: Math.max(0, world.companies.cash[companyId]),
    settlementCosts: breachedContracts.reduce((sum, item) => sum + item.penalty, 0),
    assetIds,
    delisted: false,
    cancelledOrderIndices: cancelledOrders.orderIndices,
    breachedContractIds: breachedContracts.map(item => item.contractId),
  };

  this.events.set(id, event);
  return event;
}
```

- [ ] **Step 4: Run the lifecycle test to verify it passes**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

Expected: PASS and the bankruptcy frozen phase now cleans up orders/contracts before any auction can start.

- [ ] **Step 5: Commit**

```bash
git add src/core/market/OrderBook.ts src/core/economy/SupplyContracts.ts src/core/finance/BankruptcyResolution.ts src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts
git commit -m "feat: unwind orders and contracts during bankruptcy freeze"
```

### Task 4: Implement Public Auctions, Strategy Bids, And Pending Confirmation

**Files:**
- Modify: `src/core/finance/BankruptcyResolution.ts`
- Create: `src/core/finance/__tests__/BankruptcyResolution.auction.test.ts`

- [ ] **Step 1: Write the failing auction tests**

```ts
// src/core/finance/__tests__/BankruptcyResolution.auction.test.ts
import { beforeEach, describe, expect, it } from 'vitest';

import { TICKS_PER_DAY } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import {
  bankruptcyResolution,
  resetBankruptcyResolution,
} from '../BankruptcyResolution';

describe('BankruptcyResolution auction flow', () => {
  beforeEach(() => {
    resetBankruptcyResolution();
  });

  it('sells a building lot to the highest confirmed bidder without transferring old debt', () => {
    const world = createGameWorld();
    world.companies.count = 3;
    world.companies.names[0] = '玩家公司';
    world.companies.names[1] = '破产AI';
    world.companies.names[2] = '健康AI';
    world.companies.isAI[2] = true;
    world.companies.cash[0] = 2_000_000;
    world.companies.cash[2] = 1_500_000;
    world.companies.totalLiabilities[0] = 0;
    world.companies.totalLiabilities[1] = 900_000;

    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    const event = bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 300);
    bankruptcyResolution.startAuction(event.id, 300, 3 * TICKS_PER_DAY);

    const buildingAsset = bankruptcyResolution
      .getEventAssets(event.id)
      .find(asset => asset.assetType === 'building')!;

    bankruptcyResolution.placeBid(world, event.id, buildingAsset.id, 0, 420_000, 'manual');
    bankruptcyResolution.placeBid(world, event.id, buildingAsset.id, 2, 400_000, 'manual');
    bankruptcyResolution.advance(world, 303);

    expect(world.buildings.owners[buildingId]).toBe(0);
    expect(world.buildings.isActive[buildingId]).toBe(1);
    expect(world.companies.cash[0]).toBe(1_580_000);
    expect(world.companies.totalLiabilities[0]).toBe(0);
    expect(bankruptcyResolution.getAsset(buildingAsset.id)?.state).toBe('sold');
  });

  it('requires manual confirmation when an automatic player bid wins and falls back on timeout', () => {
    const world = createGameWorld();
    world.companies.count = 3;
    world.companies.names[0] = '玩家公司';
    world.companies.names[1] = '破产AI';
    world.companies.names[2] = '健康AI';
    world.companies.isAI[2] = true;
    world.companies.cash[0] = 1_000_000;
    world.companies.cash[2] = 1_000_000;
    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);

    bankruptcyResolution.setStrategy(0, {
      mode: 'auto_participate',
      eventBudgetCap: 600_000,
      assetBudgetCap: 300_000,
      autoTrackSameIndustry: true,
    });

    const event = bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 400);
    bankruptcyResolution.startAuction(event.id, 400, 2 * TICKS_PER_DAY);

    const buildingAsset = bankruptcyResolution
      .getEventAssets(event.id)
      .find(asset => asset.assetType === 'building')!;

    bankruptcyResolution.placeBid(world, event.id, buildingAsset.id, 2, 220_000, 'manual');
    bankruptcyResolution.placeBid(world, event.id, buildingAsset.id, 0, 250_000, 'strategy');
    bankruptcyResolution.advance(world, 402);

    expect(bankruptcyResolution.getAsset(buildingAsset.id)).toMatchObject({
      state: 'pending_confirmation',
      pendingWinnerId: 0,
    });

    bankruptcyResolution.advance(world, 404);

    expect(world.buildings.owners[buildingId]).toBe(2);
    expect(bankruptcyResolution.getAsset(buildingAsset.id)?.state).toBe('sold');
  });
});
```

- [ ] **Step 2: Run the auction tests to verify they fail**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.auction.test.ts`

Expected: FAIL because there is no auction start, no bid placement, no pending-confirmation state, and no asset transfer logic yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/finance/BankruptcyResolution.ts
function estimateResidualValue(asset: BankruptcyAuctionAsset): number {
  return asset.assetType === 'inventory'
    ? asset.reservePrice * 0.5
    : asset.reservePrice * 0.35;
}

// add to BankruptcyResolutionManager
  startAuction(eventId: string, currentTick: number, durationTicks: number): void {
    const event = this.events.get(eventId);
    if (!event) return;

    event.status = 'auction_open';
    for (const asset of this.getEventAssets(eventId)) {
      asset.state = 'open';
      asset.auctionEndTick = currentTick + durationTicks;
    }
  }

  placeBid(
    world: GameWorld,
    eventId: string,
    assetId: string,
    bidderId: number,
    amount: number,
    source: 'manual' | 'strategy',
  ): boolean {
    const asset = this.assets.get(assetId);
    if (!asset || asset.eventId !== eventId || asset.state !== 'open') {
      return false;
    }

    const strategy = this.getStrategy(bidderId);
    if (bidderId === 0 && strategy.mode === 'never_participate') {
      return false;
    }
    if (bidderId === 0 && amount > strategy.assetBudgetCap && strategy.assetBudgetCap > 0) {
      return false;
    }
    if (world.companies.cash[bidderId] < amount) {
      return false;
    }
    if (amount <= asset.currentHighestBid || amount < asset.reservePrice) {
      return false;
    }

    asset.bids.push({ bidderId, amount, source, createdTick: world.tick });
    asset.currentHighestBid = amount;
    asset.currentHighestBidderId = bidderId;
    return true;
  }

  confirmPendingPurchase(
    world: GameWorld,
    eventId: string,
    assetId: string,
    bidderId: number,
  ): boolean {
    const asset = this.assets.get(assetId);
    const event = this.events.get(eventId);
    if (!asset || !event || asset.pendingWinnerId !== bidderId || asset.state !== 'pending_confirmation') {
      return false;
    }

    return this.transferAssetToWinner(world, event, asset, bidderId, asset.currentHighestBid);
  }

  advance(world: GameWorld, currentTick: number): void {
    for (const event of this.events.values()) {
      if (event.status === 'bankruptcy_frozen') {
        event.status = 'auction_open';
        for (const asset of this.getEventAssets(event.id)) {
          asset.state = 'open';
          asset.auctionEndTick = currentTick + 3 * TICKS_PER_DAY;
        }
      }

      for (const asset of this.getEventAssets(event.id)) {
        if (asset.state === 'open' && asset.auctionEndTick !== null && currentTick >= asset.auctionEndTick) {
          this.finalizeAssetAuction(world, event, asset, currentTick);
        }

        if (
          asset.state === 'pending_confirmation' &&
          asset.pendingConfirmUntilTick !== undefined &&
          currentTick >= asset.pendingConfirmUntilTick
        ) {
          this.expirePendingConfirmation(world, event, asset, currentTick);
        }
      }
    }
  }

  private finalizeAssetAuction(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    currentTick: number,
  ): void {
    const ranked = [...asset.bids].sort((a, b) => b.amount - a.amount || a.createdTick - b.createdTick);
    const winner = ranked[0];

    if (!winner) {
      this.resolveUnsoldAsset(world, event, asset, currentTick);
      return;
    }

    if (winner.bidderId === 0 && winner.source === 'strategy') {
      asset.state = 'pending_confirmation';
      asset.pendingWinnerId = 0;
      asset.pendingConfirmUntilTick = currentTick + TICKS_PER_DAY;
      return;
    }

    this.transferAssetToWinner(world, event, asset, winner.bidderId, winner.amount);
  }

  private expirePendingConfirmation(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    currentTick: number,
  ): void {
    const fallback = [...asset.bids]
      .filter(bid => !(bid.bidderId === 0 && bid.source === 'strategy'))
      .sort((a, b) => b.amount - a.amount || a.createdTick - b.createdTick)[0];

    if (!fallback) {
      this.resolveUnsoldAsset(world, event, asset, currentTick);
      return;
    }

    this.transferAssetToWinner(world, event, asset, fallback.bidderId, fallback.amount);
  }

  private transferAssetToWinner(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    bidderId: number,
    amount: number,
  ): boolean {
    world.companies.cash[bidderId] -= amount;
    event.estateCash += amount;

    if (asset.assetType === 'building' && asset.buildingId !== undefined) {
      world.buildings.owners[asset.buildingId] = bidderId;
      world.buildings.isActive[asset.buildingId] = 1;
    }

    if (asset.assetType === 'inventory' && asset.goodsId !== undefined) {
      const sellerIndex = event.companyId * world.goods.count + asset.goodsId;
      const buyerIndex = bidderId * world.goods.count + asset.goodsId;
      world.companies.inventories[sellerIndex] = Math.max(
        0,
        world.companies.inventories[sellerIndex] - asset.quantity,
      );
      world.companies.inventories[buyerIndex] += asset.quantity;
    }

    asset.currentHighestBid = amount;
    asset.currentHighestBidderId = bidderId;
    asset.state = 'sold';
    return true;
  }

  private resolveUnsoldAsset(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    currentTick: number,
  ): void {
    if (asset.assetType === 'building' && asset.discountedRound === 0) {
      asset.discountedRound = 1;
      asset.reservePrice *= 0.7;
      asset.state = 'open';
      asset.auctionEndTick = currentTick + TICKS_PER_DAY;
      return;
    }

    if (asset.assetType === 'inventory') {
      event.estateCash += estimateResidualValue(asset);
      asset.state = 'unsold';
      return;
    }

    asset.state = 'destroyed';
  }
```

- [ ] **Step 4: Run the auction tests to verify they pass**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.auction.test.ts src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

Expected: PASS and the module now distinguishes manual bids from strategy bids, requires manual confirmation for auto-player wins, and handles unsold assets explicitly.

- [ ] **Step 5: Commit**

```bash
git add src/core/finance/BankruptcyResolution.ts src/core/finance/__tests__/BankruptcyResolution.auction.test.ts src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts
git commit -m "feat: add bankruptcy auctions and player confirmation flow"
```

### Task 5: Settle Debt, Halt And Delist Stock, Then Restructure After Cooldown

**Files:**
- Modify: `src/core/finance/BankruptcyResolution.ts`
- Modify: `src/core/finance/StockMarket.ts`
- Modify: `src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`
- Modify: `src/ui/components/Finance/StockMarketPanel.tsx`

- [ ] **Step 1: Extend the failing lifecycle test**

```ts
// append to src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts
import { initializeStockMarket, getStock } from '@/core/finance/StockMarket';

it('settles the estate, delists the stock, and restores the company only after cooldown', () => {
  const world = createGameWorld();
  world.companies.count = 3;
  world.companies.names[1] = '待重组AI';
  world.companies.names[2] = '健康AI';
  world.companies.isAI[1] = true;
  world.companies.isAI[2] = true;
  world.companies.cash[1] = 800_000;
  world.companies.cash[2] = 2_000_000;
  world.companies.totalLiabilities[1] = 500_000;

  const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
  initializeStockMarket(world);

  const event = bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 720);
  bankruptcyResolution.startAuction(event.id, 720, 2 * TICKS_PER_DAY);
  const buildingAsset = bankruptcyResolution
    .getEventAssets(event.id)
    .find(asset => asset.assetType === 'building')!;

  bankruptcyResolution.placeBid(world, event.id, buildingAsset.id, 2, 700_000, 'manual');
  bankruptcyResolution.advance(world, 722);

  const stock = getStock(1)!;
  expect(stock.isTradable).toBe(false);
  expect(stock.isListed).toBe(false);
  expect(bankruptcyResolution.getCompanyEvents(1)[0].status).toBe('restructure_cooldown');

  const cooldownTick = bankruptcyResolution.getCompanyEvents(1)[0].restructureAvailableTick!;
  bankruptcyResolution.advance(world, cooldownTick);

  expect(world.companies.cash[1]).toBeGreaterThan(0);
  expect(world.companies.totalLiabilities[1]).toBe(0);
  expect(world.buildings.owners[buildingId]).toBe(2);
  expect(bankruptcyResolution.getCompanyEvents(1)[0].status).toBe('restructured');
});
```

- [ ] **Step 2: Run the lifecycle test to verify it fails**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

Expected: FAIL because the bankruptcy module never transitions into settlement, stock market has no halt/delist helper, and restructuring is still missing or immediate.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/finance/StockMarket.ts
export function haltStock(companyId: number): boolean {
  const stock = stockMarket.stocks.get(companyId);
  if (!stock) return false;
  stock.isTradable = false;
  return true;
}

export function delistStock(
  world: GameWorld,
  companyId: number,
  residualCash: number,
): { distributedCash: number } {
  const stock = stockMarket.stocks.get(companyId);
  if (!stock) {
    return { distributedCash: 0 };
  }

  stock.isTradable = false;
  stock.isListed = false;

  let distributedCash = 0;
  for (const [key, holding] of stockMarket.holdings) {
    if (holding.stockCompanyId !== companyId || holding.ownerCompanyId === companyId) {
      continue;
    }

    const payout = stock.outstandingShares > 0
      ? residualCash * (holding.shares / stock.outstandingShares)
      : 0;
    world.companies.cash[holding.ownerCompanyId] += payout;
    distributedCash += payout;
    stockMarket.holdings.delete(key);
  }

  stockMarket.orders = stockMarket.orders.filter(order => order.stockCompanyId !== companyId);
  return { distributedCash };
}
```

```ts
// src/core/finance/BankruptcyResolution.ts
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { haltStock, delistStock } from './StockMarket';

advance(world: GameWorld, currentTick: number): void {
  for (const event of this.events.values()) {
    if (event.status === 'bankruptcy_frozen') {
      event.status = 'auction_open';
      event.expiresTick = currentTick + 7 * TICKS_PER_DAY;

      for (const asset of this.getEventAssets(event.id)) {
        asset.state = 'open';
        asset.auctionEndTick = currentTick + 3 * TICKS_PER_DAY;
      }
    }

    for (const asset of this.getEventAssets(event.id)) {
      if (asset.state === 'open' && asset.auctionEndTick !== null && currentTick >= asset.auctionEndTick) {
        this.finalizeAssetAuction(world, event, asset, currentTick);
      }

      if (
        asset.state === 'pending_confirmation' &&
        asset.pendingConfirmUntilTick !== undefined &&
        currentTick >= asset.pendingConfirmUntilTick
      ) {
        this.expirePendingConfirmation(world, event, asset, currentTick);
      }
    }

    if (
      event.status === 'auction_open' &&
      this.getEventAssets(event.id).every(asset =>
        asset.state === 'sold' || asset.state === 'unsold' || asset.state === 'destroyed',
      )
    ) {
      this.settleEvent(world, event, currentTick);
    }

    if (
      event.status === 'restructure_cooldown' &&
      event.restructureAvailableTick !== undefined &&
      currentTick >= event.restructureAvailableTick
    ) {
      this.restructureCompany(world, event, currentTick);
    }
  }
}

private settleEvent(world: GameWorld, event: BankruptcyEvent, currentTick: number): void {
  event.status = 'settlement_in_progress';

  const payableDebt = Math.min(
    Math.max(0, event.estateCash - event.settlementCosts),
    world.companies.totalLiabilities[event.companyId],
  );

  world.companies.totalLiabilities[event.companyId] -= payableDebt;
  const residualCash = Math.max(0, event.estateCash - event.settlementCosts - payableDebt);

  haltStock(event.companyId);
  delistStock(world, event.companyId, residualCash);

  event.delisted = true;
  event.status = 'restructure_cooldown';
  event.restructureAvailableTick = currentTick + 30 * TICKS_PER_DAY;
}

private restructureCompany(world: GameWorld, event: BankruptcyEvent, currentTick: number): void {
  const companyId = event.companyId;
  const restartCash = 3_000_000;

  world.companies.cash[companyId] = restartCash;
  world.companies.totalAssets[companyId] = restartCash;
  world.companies.totalLiabilities[companyId] = 0;

  addBuilding(world, companyId, BuildingId.IRON_MINE, 0);

  event.status = 'restructured';
  event.expiresTick = currentTick;
}
```

```tsx
// src/ui/components/Finance/StockMarketPanel.tsx
const tradable = stock.isListed && stock.isTradable;

<Badge variant={tradable ? 'success' : 'warning'} size="sm">
  {tradable ? '交易中' : stock.isListed ? '停牌' : '已退市'}
</Badge>

<Button
  variant="primary"
  className="flex-1 bg-[var(--success)] hover:bg-[#16a34a]"
  onClick={() => onTrade('buy')}
  disabled={!tradable}
>
  📈 买入
</Button>
```

- [ ] **Step 4: Run the lifecycle test to verify it passes**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts`

Expected: PASS and bankruptcy now settles debt first, halts/delists equity, and only respawns the company after a cooldown window.

- [ ] **Step 5: Commit**

```bash
git add src/core/finance/BankruptcyResolution.ts src/core/finance/StockMarket.ts src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts src/ui/components/Finance/StockMarketPanel.tsx
git commit -m "feat: settle bankrupt estates and delist stock before restructure"
```

### Task 6: Persist Bankruptcy State And Expose Store Actions

**Files:**
- Modify: `src/core/save/SaveManager.ts`
- Create: `src/core/save/__tests__/SaveManager.bankruptcyResolution.test.ts`
- Modify: `src/stores/gameStore.ts`
- Modify: `src/core/finance/BankruptcyResolution.ts`

- [ ] **Step 1: Write the failing persistence test**

```ts
// src/core/save/__tests__/SaveManager.bankruptcyResolution.test.ts
import { beforeEach, describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import {
  bankruptcyResolution,
  resetBankruptcyResolution,
} from '@/core/finance/BankruptcyResolution';
import { SaveManager } from '../SaveManager';

describe('SaveManager bankruptcy snapshot', () => {
  beforeEach(() => {
    resetBankruptcyResolution();
  });

  it('round-trips active bankruptcy events and player strategy settings through save data', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '破产AI';
    addBuilding(world, 1, BuildingId.IRON_MINE, 0);

    bankruptcyResolution.setStrategy(0, {
      mode: 'auto_participate',
      eventBudgetCap: 800_000,
      assetBudgetCap: 200_000,
      autoTrackSameIndustry: true,
    });
    bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 360);

    const manager = new SaveManager();
    const serialized = manager.serializeWorld(world, 360);

    expect(serialized.bankruptcy?.events).toHaveLength(1);
    expect(serialized.bankruptcy?.strategies['0']?.mode).toBe('auto_participate');

    const hydratedWorld = createGameWorld();
    manager.deserializeWorld(serialized, hydratedWorld);

    expect(bankruptcyResolution.getCompanyEvents(1)).toHaveLength(1);
    expect(bankruptcyResolution.getStrategy(0).mode).toBe('auto_participate');
  });
});
```

- [ ] **Step 2: Run the persistence test to verify it fails**

Run: `npm test -- src/core/save/__tests__/SaveManager.bankruptcyResolution.test.ts`

Expected: FAIL because `SerializedWorld` has no bankruptcy snapshot field, `SaveManager` never serializes the new module state, and load does not rehydrate the manager.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/finance/BankruptcyResolution.ts
// add to BankruptcyResolutionManager
getOpenEvents(): BankruptcyEvent[] {
  return [...this.events.values()].filter(event => event.status !== 'restructured');
}

getSnapshot(): BankruptcyResolutionSnapshot {
  return {
    events: [...this.events.values()],
    assets: [...this.assets.values()],
    strategies: Object.fromEntries(
      [...this.strategies.entries()].map(([companyId, settings]) => [String(companyId), settings]),
    ),
    nextEventId: this.nextEventId,
    nextAssetId: this.nextAssetId,
  };
}

hydrate(snapshot?: BankruptcyResolutionSnapshot): void {
  this.reset();
  if (!snapshot) return;

  this.nextEventId = snapshot.nextEventId;
  this.nextAssetId = snapshot.nextAssetId;

  for (const event of snapshot.events) {
    this.events.set(event.id, event);
  }
  for (const asset of snapshot.assets) {
    this.assets.set(asset.id, asset);
  }
  for (const [companyId, settings] of Object.entries(snapshot.strategies)) {
    this.strategies.set(Number(companyId), settings);
  }
}
```

```ts
// src/core/save/SaveManager.ts
import {
  bankruptcyResolution,
  BankruptcyResolutionSnapshot,
} from '@/core/finance/BankruptcyResolution';

export interface GameSettings {
  gameSpeed: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  maxAutoSaves: number;
  language: string;
  bankruptcyStrategy?: {
    mode: 'auto_participate' | 'notify_only' | 'never_participate';
    eventBudgetCap: number;
    assetBudgetCap: number;
    autoTrackSameIndustry: boolean;
  };
}

export interface SerializedWorld {
  goods: {
    count: number;
    prices: number[];
    supplies: number[];
    demands: number[];
  };
  buildings: {
    count: number;
    types: number[];
    owners: number[];
    levels: number[];
    efficiencies: number[];
    productionControlModes?: number[];
    manualEfficiencyTargets?: number[];
    outputModeIds: number[];
    isActive: number[];
    recipeIds?: number[];
  };
  companies: {
    count: number;
    cash: number[];
    isAI: boolean[];
    inventories: number[][];
  };
  currentTick: number;
  bankruptcy?: BankruptcyResolutionSnapshot;
}

serializeWorld(world: GameWorld, currentTick: number): SerializedWorld {
  return {
    goods: {
      count: world.goods.count,
      prices: Array.from(world.goods.prices),
      supplies: Array.from(world.goods.supplies),
      demands: Array.from(world.goods.demands),
    },
    buildings: {
      count: world.buildings.count,
      types: Array.from(world.buildings.types),
      owners: Array.from(world.buildings.owners),
      levels: Array.from(world.buildings.levels),
      efficiencies: Array.from(world.buildings.efficiencies),
      productionControlModes: Array.from(world.buildings.productionControlModes),
      manualEfficiencyTargets: Array.from(world.buildings.manualEfficiencyTargets),
      outputModeIds: Array.from(world.buildings.outputModeIds),
      isActive: Array.from(world.buildings.isActive),
    },
    companies: {
      count: world.companies.count,
      cash: Array.from(world.companies.cash),
      isAI: [...world.companies.isAI],
      inventories: this.serializeInventories(world),
    },
    bankruptcy: bankruptcyResolution.getSnapshot(),
    currentTick,
  };
}

deserializeWorld(data: SerializedWorld, world: GameWorld): void {
  world.tick = data.currentTick;

  world.goods.count = data.goods.count;
  world.goods.prices.set(data.goods.prices);
  world.goods.supplies.set(data.goods.supplies);
  world.goods.demands.set(data.goods.demands);

  world.buildings.count = data.buildings.count;
  world.buildings.types.set(data.buildings.types);
  world.buildings.owners.set(data.buildings.owners);
  world.buildings.levels.set(data.buildings.levels);
  world.buildings.efficiencies.set(data.buildings.efficiencies);

  if (data.buildings.productionControlModes) {
    world.buildings.productionControlModes.set(data.buildings.productionControlModes);
  }
  if (data.buildings.manualEfficiencyTargets) {
    world.buildings.manualEfficiencyTargets.set(data.buildings.manualEfficiencyTargets);
  }
  if (data.buildings.outputModeIds) {
    world.buildings.outputModeIds.set(data.buildings.outputModeIds);
  } else if (data.buildings.recipeIds) {
    this.migrateRecipeIdsToOutputModeIds(data.buildings.recipeIds, data.buildings.types, world);
  }
  if (data.buildings.isActive) {
    world.buildings.isActive.set(data.buildings.isActive);
  }

  if (data.buildings.manualEfficiencyTargets) {
    hydrateProductionControlState(world);
  } else {
    backfillManualTargetsFromCurrentEfficiency(world);
    hydrateProductionControlState(world);
  }

  world.companies.count = data.companies.count;
  world.companies.cash.set(data.companies.cash);
  world.companies.isAI = [...data.companies.isAI];

  for (let i = 0; i < data.companies.inventories.length; i++) {
    const inv = data.companies.inventories[i];
    for (let j = 0; j < inv.length; j++) {
      world.companies.inventories[i * GOODS_COUNT + j] = inv[j];
    }
  }

  bankruptcyResolution.hydrate(data.bankruptcy);
}

loadSettings(): GameSettings {
  return {
    gameSpeed: 1,
    soundEnabled: true,
    musicEnabled: true,
    autoSave: true,
    autoSaveInterval: 60000,
    maxAutoSaves: 5,
    language: 'zh-CN',
    bankruptcyStrategy: bankruptcyResolution.getStrategy(0),
    ...saved,
  };
}
```

```ts
// src/stores/gameStore.ts
import {
  bankruptcyResolution,
  BankruptcyStrategySettings,
  resetBankruptcyResolution,
} from '@/core/finance/BankruptcyResolution';

interface GameActions {
  getBankruptcyEvents: () => ReturnType<typeof bankruptcyResolution.getOpenEvents>;
  getBankruptcyStrategy: () => BankruptcyStrategySettings;
  updateBankruptcyStrategy: (patch: Partial<BankruptcyStrategySettings>) => void;
  placeBankruptcyBid: (eventId: string, assetId: string, amount: number, source?: 'manual' | 'strategy') => boolean;
  confirmBankruptcyPurchase: (eventId: string, assetId: string) => boolean;
}

// inside initGame()
resetBankruptcyResolution();
const savedSettings = saveManager.loadSettings();
if (savedSettings.bankruptcyStrategy) {
  bankruptcyResolution.setStrategy(0, savedSettings.bankruptcyStrategy);
}

// store actions
getBankruptcyEvents: () => {
  return bankruptcyResolution.getOpenEvents();
},

getBankruptcyStrategy: () => bankruptcyResolution.getStrategy(0),

updateBankruptcyStrategy: (patch) => {
  const next = bankruptcyResolution.setStrategy(0, patch);
  saveManager.saveSettings({
    ...saveManager.loadSettings(),
    bankruptcyStrategy: next,
  });
  get().addNotification('success', '破产参与策略已更新');
},

placeBankruptcyBid: (eventId, assetId, amount, source = 'manual') => {
  if (!worldRef) return false;
  const success = bankruptcyResolution.placeBid(worldRef, eventId, assetId, 0, amount, source);
  if (success) {
    get().addNotification('success', `破产竞拍出价已提交：¥${amount.toLocaleString()}`);
  }
  return success;
},

confirmBankruptcyPurchase: (eventId, assetId) => {
  if (!worldRef) return false;
  const success = bankruptcyResolution.confirmPendingPurchase(worldRef, eventId, assetId, 0);
  if (success) {
    get().addNotification('success', '破产资产成交已确认');
  }
  return success;
},
```

- [ ] **Step 4: Run the persistence test to verify it passes**

Run: `npm test -- src/core/save/__tests__/SaveManager.bankruptcyResolution.test.ts src/core/save/__tests__/SaveManager.timeModel.test.ts`

Expected: PASS and bankruptcy state now survives save/load alongside the day-based save model changes already in flight.

- [ ] **Step 5: Commit**

```bash
git add src/core/save/SaveManager.ts src/core/save/__tests__/SaveManager.bankruptcyResolution.test.ts src/stores/gameStore.ts src/core/finance/BankruptcyResolution.ts
git commit -m "feat: persist bankruptcy resolution state and store actions"
```

### Task 7: Add Settings Controls And Finance Event UI

**Files:**
- Create: `src/ui/components/Finance/BankruptcyResolutionPanel.tsx`
- Create: `src/ui/components/Finance/__tests__/BankruptcyResolutionPanel.test.tsx`
- Modify: `src/ui/components/Finance/index.ts`
- Modify: `src/ui/pages/Finance.tsx`
- Modify: `src/ui/pages/Settings.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
// src/ui/components/Finance/__tests__/BankruptcyResolutionPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BankruptcyResolutionPanel } from '../BankruptcyResolutionPanel';

describe('BankruptcyResolutionPanel', () => {
  it('renders day-based event cards and exposes confirmation actions', () => {
    render(
      <BankruptcyResolutionPanel
        strategy={{
          mode: 'auto_participate',
          eventBudgetCap: 800_000,
          assetBudgetCap: 200_000,
          autoTrackSameIndustry: true,
        }}
        events={[
          {
            id: 'bk-1',
            companyName: '破产AI',
            reasonLabel: '现金流断裂',
            statusLabel: '公开竞拍中',
            remainingDays: 3,
            debtSnapshot: 600_000,
            stockStateLabel: '停牌中',
            assets: [
              {
                id: 'asset-1',
                label: '铁矿场 #1',
                assetType: 'building',
                reservePrice: 300_000,
                currentHighestBid: 250_000,
                playerBid: 250_000,
                state: 'pending_confirmation',
                pendingConfirmDays: 1,
              },
            ],
          },
        ]}
        onStrategyChange={vi.fn()}
        onPlaceBid={vi.fn()}
        onConfirmPendingPurchase={vi.fn()}
      />,
    );

    expect(screen.getByText('破产AI')).toBeInTheDocument();
    expect(screen.getByText('剩余 3天')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认成交' })).toBeInTheDocument();
    expect(screen.queryByText(/小时/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `npm test -- src/ui/components/Finance/__tests__/BankruptcyResolutionPanel.test.tsx`

Expected: FAIL because there is no bankruptcy finance panel component yet and neither `Finance.tsx` nor `Settings.tsx` exposes this workflow.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// src/ui/components/Finance/BankruptcyResolutionPanel.tsx
import React, { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/ui/design-system';

export interface BankruptcyResolutionPanelProps {
  strategy: {
    mode: 'auto_participate' | 'notify_only' | 'never_participate';
    eventBudgetCap: number;
    assetBudgetCap: number;
    autoTrackSameIndustry: boolean;
  };
  events: Array<{
    id: string;
    companyName: string;
    reasonLabel: string;
    statusLabel: string;
    remainingDays: number;
    debtSnapshot: number;
    stockStateLabel: string;
    assets: Array<{
      id: string;
      label: string;
      assetType: 'building' | 'inventory';
      reservePrice: number;
      currentHighestBid: number;
      playerBid: number;
      state: 'open' | 'pending_confirmation' | 'sold' | 'unsold' | 'destroyed';
      pendingConfirmDays?: number;
    }>;
  }>;
  onStrategyChange: (patch: Partial<BankruptcyResolutionPanelProps['strategy']>) => void;
  onPlaceBid: (eventId: string, assetId: string, amount: number) => void;
  onConfirmPendingPurchase: (eventId: string, assetId: string) => void;
}

export const BankruptcyResolutionPanel: React.FC<BankruptcyResolutionPanelProps> = ({
  strategy,
  events,
  onStrategyChange,
  onPlaceBid,
  onConfirmPendingPurchase,
}) => {
  const [draftBids, setDraftBids] = useState<Record<string, number>>({});

  return (
    <div className="space-y-4">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>⚖️ 破产资产处置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-2">默认参与模式</div>
              <Select value={strategy.mode} onValueChange={(value) => onStrategyChange({ mode: value as typeof strategy.mode })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_participate">自动参与</SelectItem>
                  <SelectItem value="notify_only">只提示</SelectItem>
                  <SelectItem value="never_participate">永不参与</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--border-muted)] px-4 py-3">
              <div>
                <div className="text-sm text-[var(--text-primary)]">自动关注同行业资产</div>
                <div className="text-xs text-[var(--text-muted)]">仅影响预出价建议，不会跳过手动确认</div>
              </div>
              <Switch
                checked={strategy.autoTrackSameIndustry}
                onCheckedChange={(checked) => onStrategyChange({ autoTrackSameIndustry: checked })}
                variant="game"
              />
            </div>
          </div>

          {events.map((event) => (
            <Card key={event.id} variant="game">
              <CardHeader>
                <div className="flex items-center justify-between gap-3 w-full">
                  <CardTitle>{event.companyName}</CardTitle>
                  <Badge variant="warning">剩余 {event.remainingDays}天</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>原因：{event.reasonLabel}</div>
                  <div>阶段：{event.statusLabel}</div>
                  <div>债务：¥{event.debtSnapshot.toLocaleString()}</div>
                  <div>股票：{event.stockStateLabel}</div>
                </div>

                {event.assets.map((asset) => (
                  <div key={asset.id} className="rounded-lg border border-[var(--border-muted)] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{asset.label}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          保留价 ¥{asset.reservePrice.toLocaleString()} | 当前最高价 ¥{asset.currentHighestBid.toLocaleString()}
                        </div>
                      </div>
                      {asset.state === 'pending_confirmation' ? (
                        <Button onClick={() => onConfirmPendingPurchase(event.id, asset.id)}>确认成交</Button>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={draftBids[asset.id] ?? asset.reservePrice}
                            onChange={(e) => setDraftBids(prev => ({ ...prev, [asset.id]: Number(e.target.value) }))}
                            className="w-36"
                          />
                          <Button onClick={() => onPlaceBid(event.id, asset.id, draftBids[asset.id] ?? asset.reservePrice)}>
                            出价
                          </Button>
                        </div>
                      )}
                    </div>

                    {asset.state === 'pending_confirmation' && (
                      <div className="text-xs text-[var(--warning)]">
                        自动参与获胜，需在 {asset.pendingConfirmDays} 天内手动确认，否则顺延给下一位竞拍者。
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankruptcyResolutionPanel;
```

```ts
// src/ui/components/Finance/index.ts
export { StockMarketPanel } from './StockMarketPanel';
export { BankruptcyResolutionPanel } from './BankruptcyResolutionPanel';
```

```tsx
// src/ui/pages/Finance.tsx
import { BankruptcyResolutionPanel } from '@/ui/components/Finance';
import { TICKS_PER_DAY } from '@/core/constants';
import { bankruptcyResolution } from '@/core/finance/BankruptcyResolution';

const {
  getBankruptcyEvents,
  getBankruptcyStrategy,
  updateBankruptcyStrategy,
  placeBankruptcyBid,
  confirmBankruptcyPurchase,
} = useGameStore();

const bankruptcyEvents = getBankruptcyEvents();
const bankruptcyStrategy = getBankruptcyStrategy();

<BankruptcyResolutionPanel
  strategy={bankruptcyStrategy}
  events={bankruptcyEvents.map(event => ({
    id: event.id,
    companyName: world?.companies.names[event.companyId] || `公司#${event.companyId}`,
    reasonLabel: event.reason,
    statusLabel: event.status,
    remainingDays: Math.max(0, Math.ceil((event.expiresTick - tick) / TICKS_PER_DAY)),
    debtSnapshot: event.debtSnapshot,
    stockStateLabel: event.delisted ? '已退市' : '停牌中',
    assets: bankruptcyResolution.getEventAssets(event.id).map(asset => ({
      id: asset.id,
      label: asset.assetType === 'building' ? `建筑 #${asset.buildingId}` : `商品 #${asset.goodsId}`,
      assetType: asset.assetType,
      reservePrice: asset.reservePrice,
      currentHighestBid: asset.currentHighestBid,
      playerBid: asset.bids.find(bid => bid.bidderId === 0)?.amount ?? 0,
      state: asset.state,
      pendingConfirmDays: asset.pendingConfirmUntilTick
        ? Math.max(0, Math.ceil((asset.pendingConfirmUntilTick - tick) / TICKS_PER_DAY))
        : undefined,
    })),
  }))}
  onStrategyChange={updateBankruptcyStrategy}
  onPlaceBid={(eventId, assetId, amount) => placeBankruptcyBid(eventId, assetId, amount, 'manual')}
  onConfirmPendingPurchase={confirmBankruptcyPurchase}
/>
```

```tsx
// src/ui/pages/Settings.tsx
const { getBankruptcyStrategy, updateBankruptcyStrategy } = useGameStore();
const bankruptcyStrategy = getBankruptcyStrategy();

<Card variant="elevated">
  <CardHeader>
    <CardTitle>⚖️ 破产资产处理</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className={settingsRowClassName}>
      <div>
        <div className="text-[var(--text-primary)] font-medium">默认参与模式</div>
        <div className="text-sm text-[var(--text-muted)]">自动参与只会生成预出价，成交前仍要确认</div>
      </div>
      <Select
        value={bankruptcyStrategy.mode}
        onValueChange={(value) => updateBankruptcyStrategy({ mode: value as typeof bankruptcyStrategy.mode })}
      >
        <SelectTrigger className={defaultSelectTriggerClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto_participate">自动参与</SelectItem>
          <SelectItem value="notify_only">只提示</SelectItem>
          <SelectItem value="never_participate">永不参与</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className={settingsRowClassName}>
      <div>
        <div className="text-[var(--text-primary)] font-medium">单次事件预算</div>
        <div className="text-sm text-[var(--text-muted)]">超出后不再自动生成预出价</div>
      </div>
      <Input
        type="number"
        value={bankruptcyStrategy.eventBudgetCap}
        onChange={(e) => updateBankruptcyStrategy({ eventBudgetCap: Number(e.target.value) || 0 })}
        className={defaultSelectTriggerClassName}
      />
    </div>

    <div className={settingsRowClassName}>
      <div>
        <div className="text-[var(--text-primary)] font-medium">单个资产预算</div>
        <div className="text-sm text-[var(--text-muted)]">超过该金额时，自动参与不会为单个标的出价</div>
      </div>
      <Input
        type="number"
        value={bankruptcyStrategy.assetBudgetCap}
        onChange={(e) => updateBankruptcyStrategy({ assetBudgetCap: Number(e.target.value) || 0 })}
        className={defaultSelectTriggerClassName}
      />
    </div>

    <div className={settingsRowClassName}>
      <div>
        <div className="text-[var(--text-primary)] font-medium">自动关注同行业资产</div>
        <div className="text-sm text-[var(--text-muted)]">只影响预出价候选，不会跳过人工确认</div>
      </div>
      <Switch
        checked={bankruptcyStrategy.autoTrackSameIndustry}
        onCheckedChange={(checked) => updateBankruptcyStrategy({ autoTrackSameIndustry: checked })}
        variant="game"
      />
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 4: Run the UI test to verify it passes**

Run: `npm test -- src/ui/components/Finance/__tests__/BankruptcyResolutionPanel.test.tsx src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx`

Expected: PASS and the new panel plus settings controls render day-based bankruptcy information without any hour-based wording.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/Finance/BankruptcyResolutionPanel.tsx src/ui/components/Finance/__tests__/BankruptcyResolutionPanel.test.tsx src/ui/components/Finance/index.ts src/ui/pages/Finance.tsx src/ui/pages/Settings.tsx
git commit -m "feat: add bankruptcy strategy controls and finance event panel"
```

### Task 8: Verify End-To-End And Sweep For Old Silent Bankruptcy Paths

**Files:**
- Modify as needed: any files above if verification exposes small regressions

- [ ] **Step 1: Run the targeted bankruptcy suites**

Run: `npm test -- src/core/finance/__tests__/BankruptcyResolution.lifecycle.test.ts src/core/finance/__tests__/BankruptcyResolution.auction.test.ts src/core/loop/__tests__/GameLoop.bankruptcyLiquidation.test.ts src/core/save/__tests__/SaveManager.bankruptcyResolution.test.ts src/ui/components/Finance/__tests__/BankruptcyResolutionPanel.test.tsx`

Expected: PASS across the new bankruptcy lifecycle, auction, save, and UI coverage.

- [ ] **Step 2: Run adjacent regression suites that must remain stable**

Run: `npm test -- src/core/loop/__tests__/GameLoop.dayModel.test.ts src/core/save/__tests__/SaveManager.timeModel.test.ts src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx src/ui/utils/__tests__/format.dayModel.test.ts`

Expected: PASS so the new bankruptcy feature does not regress the already-approved day-based time model work.

- [ ] **Step 3: Build the app**

Run: `npm run build`

Expected: PASS with a clean TypeScript and Vite build.

- [ ] **Step 4: Search for leftover silent-liquidation paths and fix any obvious misses**

Run: `Get-ChildItem -Recurse -File src | Select-String -Pattern '收购了建筑|auto-acquire|silent liquidation|restructureCompany\\(|handleBankruptcy\\(' -CaseSensitive:$false`

Expected: no remaining direct-liquidation body in `GameLoop`, and any remaining `handleBankruptcy(` references should only be the new event handoff plus tests.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "test: verify bankruptcy asset resolution flow"
```

## Self-Review

### Spec Coverage

- 独立模块、`GameLoop` 只做检测与事件创建: Task 1, Task 2.
- 建筑/库存公开竞拍、玩家与 AI 共同出价、禁止静默接盘: Task 4.
- 自动参与策略 + 手动确认 + 超时顺延: Task 4, Task 6, Task 7.
- 挂单立即取消、合同单独按违约处理: Task 3.
- 债务清偿、停牌退市、股东残值、重组冷却: Task 5.
- 存档恢复、玩家策略持久化、Finance/Settings UI: Task 6, Task 7.
- 天制时间展示与确认窗口按天推进: Task 1, Task 4, Task 7, Task 8.

No spec sections are unassigned.

### Placeholder Scan

- No placeholder markers remain.
- Every task contains exact file paths, code blocks, run commands, expected outcomes, and commit messages.

### Type Consistency

- Bankruptcy strategy mode is always `auto_participate | notify_only | never_participate`.
- The core manager export is always `bankruptcyResolution`, with `resetBankruptcyResolution()` for tests.
- Auction asset confirmation always uses `pending_confirmation`, `pendingWinnerId`, and `pendingConfirmUntilTick`.
- Save serialization consistently uses `SerializedWorld.bankruptcy` and `BankruptcyResolutionSnapshot`.
