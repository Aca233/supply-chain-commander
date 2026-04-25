# Financial Data Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify player-visible financial data so Dashboard, Finance, and Statistics all read the same real financial snapshot while building-level profit stays a clearly labeled estimate.

**Architecture:** Add a shared finance snapshot module that derives assets and profit from `world + financialHistory + currentTick`, store the latest snapshot in Zustand, and migrate Dashboard/Finance/Statistics plus `CompanyProfile` to that source. Keep building estimate helpers separate so “预估利润” never masquerades as actual cash-flow.

**Tech Stack:** TypeScript, React 18, Zustand, Vitest, Vite

---

### Task 1: Add A Shared Financial Snapshot Core

**Files:**
- Create: `src/core/finance/FinancialSnapshot.ts`
- Test: `src/core/finance/__tests__/FinancialSnapshot.test.ts`

- [ ] **Step 1: Write the failing core snapshot tests**

Create `src/core/finance/__tests__/FinancialSnapshot.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { GameWorld } from '@/core/world/GameWorld';

import {
  calculateCompanyAssetBreakdown,
  calculatePlayerFinancialSnapshot,
  createEmptyPlayerFinancialSnapshot,
} from '../FinancialSnapshot';

function createWorld(): GameWorld {
  const inventories = new Float32Array(GOODS_COUNT);
  inventories[0] = 4;
  inventories[1] = 2;

  return {
    tick: 28,
    goods: {
      count: 2,
      prices: new Float32Array([100, 250]),
    },
    companies: {
      count: 1,
      cash: new Float32Array([5_000]),
      totalLiabilities: new Float32Array([800]),
      inventories,
    },
    buildings: {
      count: 2,
      owners: new Uint16Array([0, 0]),
    },
  } as unknown as GameWorld;
}

describe('FinancialSnapshot', () => {
  it('builds a single asset breakdown shared by player UI and company profile', () => {
    const breakdown = calculateCompanyAssetBreakdown(createWorld(), 0);

    expect(breakdown).toEqual({
      cash: 5_000,
      inventoryValue: 900,
      buildingValue: 1_000_000,
      operatingAssets: 1_000_900,
      totalAssets: 1_005_900,
      liabilities: 800,
      netWorth: 1_005_100,
    });
  });

  it('derives daily and cumulative financial values from financial history instead of raw trades', () => {
    const snapshot = calculatePlayerFinancialSnapshot({
      world: createWorld(),
      currentTick: 28,
      financialHistory: [
        { tick: 8, revenue: 100, cost: 80, profit: 20, cash: 4_920 },
        { tick: 16, revenue: 300, cost: 150, profit: 150, cash: 5_070 },
        { tick: 28, revenue: 90, cost: 140, profit: -50, cash: 5_020 },
      ],
    });

    expect(snapshot.dailyRevenue).toBe(490);
    expect(snapshot.dailyCost).toBe(370);
    expect(snapshot.dailyProfit).toBe(120);
    expect(snapshot.cumulativeRevenue).toBe(490);
    expect(snapshot.cumulativeCost).toBe(370);
    expect(snapshot.cumulativeProfit).toBe(120);
    expect(snapshot.totalAssets).toBe(1_005_900);
    expect(snapshot.netWorth).toBe(1_005_100);
  });

  it('returns an all-zero snapshot when world data is unavailable', () => {
    expect(createEmptyPlayerFinancialSnapshot()).toEqual(
      calculatePlayerFinancialSnapshot({
        world: null,
        currentTick: 24,
        financialHistory: [],
      }),
    );
  });
});
```

- [ ] **Step 2: Run the new test file and verify it fails for the right reason**

Run:

```bash
npx vitest run src/core/finance/__tests__/FinancialSnapshot.test.ts
```

Expected:

```text
FAIL  src/core/finance/__tests__/FinancialSnapshot.test.ts
Error: Failed to resolve import "../FinancialSnapshot"
```

- [ ] **Step 3: Write the minimal shared snapshot implementation**

Create `src/core/finance/FinancialSnapshot.ts`:

```typescript
import { GOODS_COUNT } from '@/core/constants';
import { GameWorld } from '@/core/world/GameWorld';

const BUILDING_BOOK_VALUE = 500_000;

export interface FinancialHistoryPointLike {
  tick: number;
  revenue: number;
  cost: number;
  profit: number;
  cash: number;
}

export interface CompanyAssetBreakdown {
  cash: number;
  inventoryValue: number;
  buildingValue: number;
  operatingAssets: number;
  totalAssets: number;
  liabilities: number;
  netWorth: number;
}

export interface PlayerFinancialSnapshot extends CompanyAssetBreakdown {
  dailyRevenue: number;
  dailyCost: number;
  dailyProfit: number;
  cumulativeRevenue: number;
  cumulativeCost: number;
  cumulativeProfit: number;
}

export function createEmptyPlayerFinancialSnapshot(): PlayerFinancialSnapshot {
  return {
    cash: 0,
    inventoryValue: 0,
    buildingValue: 0,
    operatingAssets: 0,
    totalAssets: 0,
    liabilities: 0,
    netWorth: 0,
    dailyRevenue: 0,
    dailyCost: 0,
    dailyProfit: 0,
    cumulativeRevenue: 0,
    cumulativeCost: 0,
    cumulativeProfit: 0,
  };
}

function safeNumber(value: number | undefined): number {
  return Number.isFinite(value) ? value : 0;
}

function sumHistoryWindow<T extends FinancialHistoryPointLike>(
  history: T[],
  currentTick: number,
  windowTicks: number,
  field: 'revenue' | 'cost' | 'profit',
): number {
  const minTickExclusive = currentTick - windowTicks;

  return history.reduce((total, point) => {
    if (point.tick > minTickExclusive && point.tick <= currentTick) {
      return total + safeNumber(point[field]);
    }

    return total;
  }, 0);
}

export function calculateCompanyAssetBreakdown(
  world: GameWorld | null | undefined,
  companyId: number,
): CompanyAssetBreakdown {
  if (!world) {
    return {
      cash: 0,
      inventoryValue: 0,
      buildingValue: 0,
      operatingAssets: 0,
      totalAssets: 0,
      liabilities: 0,
      netWorth: 0,
    };
  }

  const cash = safeNumber(world.companies.cash[companyId]);
  const liabilities = safeNumber(world.companies.totalLiabilities[companyId]);

  let inventoryValue = 0;
  for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
    const inventoryIndex = companyId * GOODS_COUNT + goodsId;
    inventoryValue +=
      safeNumber(world.companies.inventories[inventoryIndex]) *
      safeNumber(world.goods.prices[goodsId]);
  }

  let buildingValue = 0;
  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    if (world.buildings.owners[buildingId] === companyId) {
      buildingValue += BUILDING_BOOK_VALUE;
    }
  }

  const operatingAssets = inventoryValue + buildingValue;
  const totalAssets = cash + operatingAssets;

  return {
    cash,
    inventoryValue,
    buildingValue,
    operatingAssets,
    totalAssets,
    liabilities,
    netWorth: totalAssets - liabilities,
  };
}

export function calculatePlayerFinancialSnapshot({
  world,
  currentTick,
  financialHistory,
  companyId = 0,
}: {
  world: GameWorld | null | undefined;
  currentTick: number;
  financialHistory: FinancialHistoryPointLike[];
  companyId?: number;
}): PlayerFinancialSnapshot {
  if (!world) {
    return createEmptyPlayerFinancialSnapshot();
  }

  const assets = calculateCompanyAssetBreakdown(world, companyId);
  const cumulativeRevenue = financialHistory.reduce((total, point) => total + safeNumber(point.revenue), 0);
  const cumulativeCost = financialHistory.reduce((total, point) => total + safeNumber(point.cost), 0);

  return {
    ...assets,
    dailyRevenue: sumHistoryWindow(financialHistory, currentTick, 24, 'revenue'),
    dailyCost: sumHistoryWindow(financialHistory, currentTick, 24, 'cost'),
    dailyProfit: sumHistoryWindow(financialHistory, currentTick, 24, 'profit'),
    cumulativeRevenue,
    cumulativeCost,
    cumulativeProfit: cumulativeRevenue - cumulativeCost,
  };
}
```

- [ ] **Step 4: Run the snapshot tests again and verify they pass**

Run:

```bash
npx vitest run src/core/finance/__tests__/FinancialSnapshot.test.ts
```

Expected:

```text
PASS  src/core/finance/__tests__/FinancialSnapshot.test.ts
Tests  3 passed
```

- [ ] **Step 5: Commit the shared snapshot foundation**

Run:

```bash
git add src/core/finance/FinancialSnapshot.ts src/core/finance/__tests__/FinancialSnapshot.test.ts
git commit -m "feat: add shared financial snapshot"
```

### Task 2: Align Store, Selectors, And Company Profile With The Shared Snapshot

**Files:**
- Modify: `src/stores/gameStore.ts`
- Modify: `src/stores/selectors.ts`
- Modify: `src/core/finance/CompanyProfile.ts`
- Create: `src/stores/__tests__/selectors.financialSummary.test.tsx`
- Create: `src/core/finance/__tests__/CompanyProfile.test.ts`

- [ ] **Step 1: Write the failing store-selector and company-profile tests**

Create `src/stores/__tests__/selectors.financialSummary.test.tsx`:

```typescript
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockState = {
  playerBuildings: 3,
  playerFinancialSnapshot: {
    cash: 4_000,
    inventoryValue: 300,
    buildingValue: 600,
    operatingAssets: 900,
    totalAssets: 4_900,
    liabilities: 1_200,
    netWorth: 3_700,
    dailyRevenue: 600,
    dailyCost: 450,
    dailyProfit: 150,
    cumulativeRevenue: 2_000,
    cumulativeCost: 1_500,
    cumulativeProfit: 500,
  },
};

vi.mock('../gameStore', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

import { usePlayerFinancialSummary } from '../selectors';

function Harness() {
  const summary = usePlayerFinancialSummary();
  return React.createElement('pre', null, JSON.stringify(summary));
}

describe('usePlayerFinancialSummary', () => {
  it('returns total assets and net worth from the shared financial snapshot', () => {
    const html = renderToStaticMarkup(React.createElement(Harness));

    expect(html).toContain('"assets":900');
    expect(html).toContain('"totalAssets":4900');
    expect(html).toContain('"liabilities":1200');
    expect(html).toContain('"netWorth":3700');
  });
});
```

Create `src/core/finance/__tests__/CompanyProfile.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { GameWorld } from '@/core/world/GameWorld';

vi.mock('../StockMarket', () => ({
  getStock: () => null,
  getHoldings: () => [],
  getMarketState: () => ({
    holdings: new Map(),
    stocks: new Map(),
    totalMarketCap: 0,
  }),
}));

import { calculateCompanyAssetBreakdown } from '../FinancialSnapshot';
import { getCompanyProfile } from '../CompanyProfile';

function createWorld(): GameWorld {
  const inventories = new Float32Array(GOODS_COUNT);
  inventories[0] = 2;
  inventories[1] = 1;

  return {
    goods: {
      count: 2,
      prices: new Float32Array([200, 400]),
      names: ['钢铁', '工具'],
    },
    companies: {
      count: 1,
      cash: new Float32Array([8_000]),
      totalLiabilities: new Float32Array([500]),
      inventories,
      names: ['玩家公司'],
      isAI: new Uint8Array([0]),
    },
    buildings: {
      count: 1,
      owners: new Uint16Array([0]),
    },
  } as unknown as GameWorld;
}

describe('getCompanyProfile', () => {
  it('reuses the shared asset breakdown instead of recalculating its own version', () => {
    const world = createWorld();
    const profile = getCompanyProfile(world, 0);
    const breakdown = calculateCompanyAssetBreakdown(world, 0);

    expect(profile?.cash).toBe(breakdown.cash);
    expect(profile?.inventoryValue).toBe(breakdown.inventoryValue);
    expect(profile?.buildingValue).toBe(breakdown.buildingValue);
    expect(profile?.totalAssets).toBe(breakdown.totalAssets);
  });
});
```

- [ ] **Step 2: Run the new tests and verify they fail before changing production code**

Run:

```bash
npx vitest run src/stores/__tests__/selectors.financialSummary.test.tsx src/core/finance/__tests__/CompanyProfile.test.ts
```

Expected:

```text
FAIL  src/stores/__tests__/selectors.financialSummary.test.tsx
Expected substring: "totalAssets":4900

FAIL  src/core/finance/__tests__/CompanyProfile.test.ts
Expected profile.totalAssets to equal the shared breakdown totalAssets
```

- [ ] **Step 3: Update Zustand, selectors, and company profile to use the shared snapshot**

Modify `src/stores/gameStore.ts`:

```typescript
import {
  PlayerFinancialSnapshot,
  calculatePlayerFinancialSnapshot,
  createEmptyPlayerFinancialSnapshot,
} from '@/core/finance/FinancialSnapshot';

interface GameState {
  playerCash: number;
  playerAssets: number;
  playerBuildings: number;
  playerFinancialSnapshot: PlayerFinancialSnapshot;
  financialHistory: HistoryDataPoint[];
}

playerFinancialSnapshot: createEmptyPlayerFinancialSnapshot(),

const initialSnapshot = calculatePlayerFinancialSnapshot({
  world,
  currentTick: world.tick,
  financialHistory: [],
});

set((state) => {
  state.playerCash = initialSnapshot.cash;
  state.playerAssets = initialSnapshot.operatingAssets;
  state.playerFinancialSnapshot = initialSnapshot;
});

const snapshot = calculatePlayerFinancialSnapshot({
  world: worldRef,
  currentTick,
  financialHistory: state.financialHistory,
});

state.playerCash = snapshot.cash;
state.playerAssets = snapshot.operatingAssets;
state.playerFinancialSnapshot = snapshot;
```

Modify `src/stores/selectors.ts`:

```typescript
export function usePlayerFinancialSnapshot() {
  return useGameStore((state) => state.playerFinancialSnapshot);
}

export function usePlayerFinancialSummary() {
  const snapshot = usePlayerFinancialSnapshot();
  const buildings = usePlayerBuildingCount();

  return useMemo(() => ({
    cash: snapshot.cash,
    assets: snapshot.operatingAssets,
    totalAssets: snapshot.totalAssets,
    liabilities: snapshot.liabilities,
    buildings,
    netWorth: snapshot.netWorth,
  }), [snapshot, buildings]);
}
```

Modify `src/core/finance/CompanyProfile.ts`:

```typescript
import { calculateCompanyAssetBreakdown } from './FinancialSnapshot';

export function getCompanyProfile(world: GameWorld, companyId: number): CompanyProfile | null {
  if (companyId >= world.companies.count) return null;

  const assets = calculateCompanyAssetBreakdown(world, companyId);
  const cash = assets.cash;
  const inventoryValue = assets.inventoryValue;
  const buildingValue = assets.buildingValue;
  const totalAssets = assets.totalAssets;

  return {
    id: companyId,
    name,
    personality,
    personalityName: personalityLabels[personality],
    cash,
    totalAssets,
    inventoryValue,
    buildingValue,
    buildingCount,
    marketShare,
    stock,
    ownership,
    competition,
    controlStatus,
    isAI,
    isPlayer,
  };
}
```

- [ ] **Step 4: Run the selector and company profile tests again**

Run:

```bash
npx vitest run src/stores/__tests__/selectors.financialSummary.test.tsx src/core/finance/__tests__/CompanyProfile.test.ts
```

Expected:

```text
PASS  src/stores/__tests__/selectors.financialSummary.test.tsx
PASS  src/core/finance/__tests__/CompanyProfile.test.ts
Tests  2 passed
```

- [ ] **Step 5: Commit the shared-state alignment**

Run:

```bash
git add src/stores/gameStore.ts src/stores/selectors.ts src/stores/__tests__/selectors.financialSummary.test.tsx src/core/finance/CompanyProfile.ts src/core/finance/__tests__/CompanyProfile.test.ts
git commit -m "refactor: align store financial state with snapshot"
```

### Task 3: Migrate Dashboard, Finance, And Statistics To The Shared Snapshot

**Files:**
- Modify: `src/ui/components/Dashboard/hooks/useDashboardData.ts`
- Modify: `src/ui/pages/Finance.tsx`
- Modify: `src/ui/components/Statistics/GameStatisticsPanel.tsx`
- Create: `src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx`
- Create: `src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx`
- Create: `src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx`

- [ ] **Step 1: Write the failing Dashboard, Finance, and Statistics regression tests**

Create `src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx`:

```typescript
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockState = {
  getWorld: () => null,
  playerCash: 999,
  playerAssets: 111,
  playerBuildings: 2,
  tick: 48,
  financialHistory: [],
  playerFinancialSnapshot: {
    cash: 5_000,
    inventoryValue: 200,
    buildingValue: 800,
    operatingAssets: 1_000,
    totalAssets: 6_000,
    liabilities: 900,
    netWorth: 5_100,
    dailyRevenue: 900,
    dailyCost: 1_300,
    dailyProfit: -400,
    cumulativeRevenue: 4_000,
    cumulativeCost: 4_500,
    cumulativeProfit: -500,
  },
  getPlayerLoans: () => [{ remainingPrincipal: 50_000 }],
  getPlayerCreditProfile: () => ({ rating: 'A', score: 720 }),
  getPlayerPortfolio: () => ({ totalValue: 0, totalCost: 0, totalGain: 0, gainPercent: 0, holdingCount: 0 }),
  getPlayerHoldings: () => [],
  getPlayerControlledProfiles: () => [],
  getPlayerBuildings: () => [],
  getInventoryQuality: () => ({ name: '标准', priceMultiplier: 1, color: '#fff' }),
  lastTickResult: null,
};

vi.mock('@/stores/gameStore', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('@/core/market/OrderBook', () => ({
  getActiveOrderIndices: () => new Set(),
}));

import { useDashboardData } from '../useDashboardData';

function Harness() {
  const data = useDashboardData();
  return React.createElement('pre', null, JSON.stringify(data.kpi));
}

describe('useDashboardData', () => {
  it('uses the shared snapshot for net worth and daily profit', () => {
    const html = renderToStaticMarkup(React.createElement(Harness));

    expect(html).toContain('"netWorth":5100');
    expect(html).toContain('"dailyProfit":-400');
    expect(html).not.toContain('"netWorth":-48890');
  });
});
```

Create `src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx`:

```typescript
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockState = {
  getWorld: () => ({
    tick: 72,
    goods: {
      names: ['钢铁'],
      prices: new Float32Array([100]),
    },
    trades: {
      count: 1,
      maxTrades: 16,
      ticks: new Int32Array([72]),
      buyCompanyIds: new Uint16Array([1]),
      sellCompanyIds: new Uint16Array([0]),
      goodsIds: new Uint16Array([0]),
      quantities: new Float32Array([90]),
      prices: new Float32Array([100]),
    },
  }),
  lastTickResult: null,
  tick: 72,
  playerFinancialSnapshot: {
    cash: 10_000,
    inventoryValue: 2_000,
    buildingValue: 8_000,
    operatingAssets: 10_000,
    totalAssets: 20_000,
    liabilities: 3_000,
    netWorth: 17_000,
    dailyRevenue: 1_200,
    dailyCost: 1_500,
    dailyProfit: -300,
    cumulativeRevenue: 8_000,
    cumulativeCost: 8_700,
    cumulativeProfit: -700,
  },
  financialHistory: [],
  getPlayerLoans: () => [],
  getPlayerCreditProfile: () => null,
  getPlayerLoanOptions: () => [],
  applyLoan: () => ({ approved: false }),
  prepayPlayerLoan: () => ({ success: false }),
};

vi.mock('@/stores/gameStore', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('@/ui/hooks/useMobile', () => ({
  useMobile: () => ({ isMobile: false, isTablet: false, isNarrowDesktop: false }),
}));

vi.mock('../responsivePageLayout', () => ({
  shouldUseCompactFinanceLayout: () => false,
}));

vi.mock('@/ui/components/Charts/PriceChart', () => ({
  PriceChart: () => React.createElement('div', null, 'PriceChart'),
}));

vi.mock('@/ui/components/Charts/MarketShareChart', () => ({
  MarketShareChart: () => React.createElement('div', null, 'MarketShareChart'),
}));

vi.mock('@/ui/components/Charts/FinancialReportChart', () => ({
  FinancialReportChart: () => React.createElement('div', null, 'FinancialReportChart'),
}));

vi.mock('@/ui/design-system', () => ({
  Button: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('section', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('header', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  DataTable: () => React.createElement('div', null, 'DataTable'),
  StatWidget: ({ title, value }: { title: string; value: string }) => React.createElement('div', null, `${title}:${value}`),
  Dialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogBody: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Slider: () => React.createElement('div', null, 'Slider'),
}));

import Finance from '../Finance';

describe('Finance', () => {
  it('renders income statement numbers from the shared financial snapshot instead of raw trades', () => {
    const html = renderToStaticMarkup(React.createElement(Finance));

    expect(html).toContain('现金余额:¥10.00K');
    expect(html).toContain('总资产:¥20.00K');
    expect(html).toContain('净资产:¥17.00K');
    expect(html).toContain('¥1,200');
    expect(html).toContain('-¥1,500');
    expect(html).toContain('-¥300');
    expect(html).not.toContain('¥9,000');
  });
});
```

Create `src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx`:

```typescript
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockState = {
  tick: 120,
  playerCash: 1_000,
  playerAssets: 700,
  playerBuildings: 2,
  playerFinancialSnapshot: {
    cash: 1_000,
    inventoryValue: 300,
    buildingValue: 400,
    operatingAssets: 700,
    totalAssets: 1_700,
    liabilities: 200,
    netWorth: 1_500,
    dailyRevenue: 0,
    dailyCost: 0,
    dailyProfit: 0,
    cumulativeRevenue: 0,
    cumulativeCost: 0,
    cumulativeProfit: 0,
  },
  getWorld: () => ({
    buildings: {
      count: 2,
      owners: new Uint16Array([0, 0]),
    },
    goods: {
      count: 1,
      prices: new Float32Array([300]),
    },
    companies: {
      count: 1,
      inventories: new Float32Array([1]),
    },
    orders: {
      activeCount: 0,
    },
  }),
  getAllCompanyProfiles: () => [],
};

vi.mock('@/stores/gameStore', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('@/data/goods', () => ({
  GOODS_BY_ID: new Map([[0, { id: 0, name: '钢铁' }]]),
}));

vi.mock('@/data/buildings', () => ({
  BUILDINGS_BY_ID: new Map([[0, { id: 0, name: '炼钢厂' }]]),
}));

vi.mock('@/ui/design-system', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('section', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('header', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  ProgressBar: () => React.createElement('div', null, 'ProgressBar'),
}));

import GameStatisticsPanel from '../GameStatisticsPanel';

describe('GameStatisticsPanel', () => {
  it('shows net worth and assets from the shared snapshot without double-counting inventory', () => {
    const html = renderToStaticMarkup(React.createElement(GameStatisticsPanel));

    expect(html).toContain('¥1.5K');
    expect(html).toContain('¥700');
    expect(html).not.toContain('¥2.0K');
  });
});
```

- [ ] **Step 2: Run the three regression tests and verify they fail**

Run:

```bash
npx vitest run src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx
```

Expected:

```text
FAIL  src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx
Expected substring: "netWorth":5100

FAIL  src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx
Expected substring: 总资产:¥20.00K

FAIL  src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx
Expected not to contain: ¥2.0K
```

- [ ] **Step 3: Update Dashboard, Finance, and Statistics to consume `playerFinancialSnapshot`**

Modify `src/ui/components/Dashboard/hooks/useDashboardData.ts`:

```typescript
const {
  getWorld,
  playerBuildings,
  playerFinancialSnapshot,
  tick,
  getPlayerLoans,
  getPlayerCreditProfile,
  getPlayerPortfolio,
  getPlayerHoldings,
  getPlayerControlledProfiles,
  getPlayerBuildings,
  getInventoryQuality,
  lastTickResult,
} = useGameStore();

const kpi = useMemo((): KPIData => {
  const buildings = getPlayerBuildings();
  const portfolio = getPlayerPortfolio();
  const credit = getPlayerCreditProfile();

  return {
    netWorth: playerFinancialSnapshot.netWorth,
    cash: playerFinancialSnapshot.cash,
    dailyProfit: playerFinancialSnapshot.dailyProfit,
    buildingCount: {
      total: playerBuildings,
      active,
      paused,
      starved,
    },
    portfolioValue: portfolio.totalValue,
    creditRating: credit?.rating || 'N/A',
    creditScore: credit?.score || 0,
  };
}, [playerFinancialSnapshot, playerBuildings, tick]);
```

Modify `src/ui/pages/Finance.tsx`:

```typescript
const playerFinancialSnapshot = useGameStore((state) => state.playerFinancialSnapshot);
const financialHistory = useGameStore((state) => state.financialHistory);

const playerCash = playerFinancialSnapshot.cash;
const playerAssets = playerFinancialSnapshot.operatingAssets;
const playerLiabilities = playerFinancialSnapshot.liabilities;
const inventoryValue = playerFinancialSnapshot.inventoryValue;
const netWorth = playerFinancialSnapshot.netWorth;

const { recentTrades } = useMemo(() => {
  if (!world) {
    return { recentTrades: [] };
  }

  const trades = [];
  for (let i = world.trades.count - 1; i >= Math.max(0, world.trades.count - 1000); i--) {
    const idx = i % world.trades.maxTrades;
    const tradeTick = world.trades.ticks[idx];
    const buyCompanyId = world.trades.buyCompanyIds[idx];
    const sellCompanyId = world.trades.sellCompanyIds[idx];

    if (buyCompanyId !== 0 && sellCompanyId !== 0) continue;

    trades.push({
      id: i,
      buyCompanyId,
      sellCompanyId,
      goodsId: world.trades.goodsIds[idx],
      quantity: world.trades.quantities[idx],
      price: world.trades.prices[idx],
      value: world.trades.quantities[idx] * world.trades.prices[idx],
      tick: tradeTick,
    });

    if (trades.length >= 50) break;
  }

  return { recentTrades: trades };
}, [world, tick]);

const dailyIncomeChange = playerFinancialSnapshot.dailyProfit;
const cumulativeRevenue = playerFinancialSnapshot.cumulativeRevenue;
const cumulativeCost = playerFinancialSnapshot.cumulativeCost;
const cumulativeProfit = playerFinancialSnapshot.cumulativeProfit;
const totalRevenue = playerFinancialSnapshot.dailyRevenue;
const totalCost = playerFinancialSnapshot.dailyCost;
const netProfit = playerFinancialSnapshot.dailyProfit;

const assetDistribution = useMemo(() => [
  { name: '现金', value: playerFinancialSnapshot.cash },
  { name: '库存价值', value: playerFinancialSnapshot.inventoryValue },
  { name: '建筑资产', value: playerFinancialSnapshot.buildingValue },
], [playerFinancialSnapshot]);
```

Modify `src/ui/components/Statistics/GameStatisticsPanel.tsx`:

```typescript
const playerFinancialSnapshot = useGameStore(s => s.playerFinancialSnapshot);

const stats = useMemo(() => {
  if (!world) return null;

  return {
    general: [
      { label: '游戏时间', value: formatTime(tick), icon: '⏱️' },
      { label: '净资产', value: formatMoney(playerFinancialSnapshot.netWorth), icon: '💰' },
      { label: '现金余额', value: formatMoney(playerFinancialSnapshot.cash), icon: '💵' },
      { label: '资产价值', value: formatMoney(playerFinancialSnapshot.operatingAssets), icon: '🏦' },
    ] as StatItem[],
    production: [
      { label: '建筑数量', value: playerBuildingCount, icon: '🏭' },
      { label: '商品种类', value: GOODS_BY_ID.size, icon: '📦' },
      { label: '建筑类型', value: BUILDINGS_BY_ID.size, icon: '🏗️' },
      { label: '库存价值', value: formatMoney(playerFinancialSnapshot.inventoryValue), icon: '📊' },
    ] as StatItem[],
    market: [
      { label: 'AI对手', value: aiCompanies, icon: '🤖' },
      { label: '市场交易量', value: formatNumber(totalVolume), icon: '📈' },
      { label: '活跃订单', value: (world as any).orders?.activeCount || 0, icon: '📝' },
      { label: '总公司数', value: world.companies.count, icon: '🏢' },
    ] as StatItem[],
  };
}, [world, tick, playerFinancialSnapshot, getAllCompanyProfiles]);

const milestones = useMemo((): MilestoneItem[] => {
  const netWorth = playerFinancialSnapshot.netWorth;

  return [
    {
      id: 'first_million',
      title: '百万富翁',
      description: '净资产达到100万',
      icon: '💎',
      progress: netWorth,
      target: 1_000_000,
      achieved: netWorth >= 1_000_000,
    },
  ];
}, [playerFinancialSnapshot, world, tick, playerBuildings]);
```

- [ ] **Step 4: Run the UI regression tests again**

Run:

```bash
npx vitest run src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx
```

Expected:

```text
PASS  src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx
PASS  src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx
PASS  src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx
Tests  3 passed
```

- [ ] **Step 5: Commit the page migration**

Run:

```bash
git add src/ui/components/Dashboard/hooks/useDashboardData.ts src/ui/pages/Finance.tsx src/ui/components/Statistics/GameStatisticsPanel.tsx src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx
git commit -m "fix: unify dashboard and finance data sources"
```

### Task 4: Run The Final Verification Pass

**Files:**
- Modify: `src/core/finance/FinancialSnapshot.ts` (only if a verification failure exposes a bug)
- Modify: `src/stores/gameStore.ts` (only if a verification failure exposes a bug)
- Modify: `src/ui/pages/Finance.tsx` (only if a verification failure exposes a bug)

- [ ] **Step 1: Run all finance-focused tests together**

Run:

```bash
npx vitest run src/core/finance/__tests__/FinancialHistory.test.ts src/core/finance/__tests__/FinancialSnapshot.test.ts src/core/finance/__tests__/CompanyProfile.test.ts src/stores/__tests__/selectors.financialSummary.test.tsx src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx src/ui/components/Production/__tests__/BuildingCard.test.tsx
```

Expected:

```text
PASS  8 test files
Tests  all passed
```

- [ ] **Step 2: Run the production build as the final regression gate**

Run:

```bash
npm run build
```

Expected:

```text
> supply-chain-commander@0.1.0 build
> tsc && vite build

vite v5
✓ built in
```

- [ ] **Step 3: Commit the verified end state**

Run:

```bash
git add src/core/finance/FinancialSnapshot.ts src/core/finance/__tests__/FinancialSnapshot.test.ts src/stores/gameStore.ts src/stores/selectors.ts src/stores/__tests__/selectors.financialSummary.test.tsx src/core/finance/CompanyProfile.ts src/core/finance/__tests__/CompanyProfile.test.ts src/ui/components/Dashboard/hooks/useDashboardData.ts src/ui/pages/Finance.tsx src/ui/components/Statistics/GameStatisticsPanel.tsx src/ui/components/Dashboard/hooks/__tests__/useDashboardData.financialSnapshot.test.tsx src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx
git commit -m "fix: unify player financial data across ui"
```
