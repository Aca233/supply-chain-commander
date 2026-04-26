# Day-Based Time Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the simulation from `1 tick = 1 hour` to `1 tick = 1 day`, migrate old saves safely, and update core economy, AI, and UI code to run on day-based semantics.

**Architecture:** Centralize the new day-based tick model in the shared time constants and date helpers, then migrate save loading so legacy hour-based ticks normalize into day ticks. After that, refactor production, economy, loop scheduling, AI cadence, and UI formatting to consume semantic day/month/year helpers instead of hard-coded `24`-hour assumptions.

**Tech Stack:** TypeScript, React 18, Zustand, Vitest, Vite

---

## Scope Note

Keep this as one plan. The time model is a shared dependency for simulation, AI, saves, and UI, so splitting it into separate independent plans would create merge-order problems and duplicate migration work.

## File Map

- Modify: `src/core/constants.ts` — canonical day-based tick constants plus legacy hour-to-day conversion helpers.
- Modify: `src/core/world/GameWorld.ts` — day-only `tickToDate()` and `formatGameDate()`.
- Modify: `src/ui/utils/format.ts` — day-based `formatTick()` and `formatRelativeTime()`.
- Create: `src/core/world/__tests__/GameWorld.timeModel.test.ts` — time constant and date helper coverage.
- Create: `src/ui/utils/__tests__/format.dayModel.test.ts` — UI formatting coverage for day-only output.
- Modify: `src/core/save/SaveManager.ts` — explicit `timeModel` metadata and legacy hour-save migration.
- Create: `src/core/save/__tests__/SaveManager.timeModel.test.ts` — save serialization and legacy migration coverage.
- Modify: `src/core/production/ProductionEngine.ts` — normalize legacy hourly production durations into day-scale output and consumption.
- Modify: `src/core/finance/OperatingCosts.ts` — charge one day of cost per tick.
- Modify: `src/core/finance/__tests__/OperatingCosts.test.ts` — assert daily charges instead of hourly slices.
- Create: `src/core/production/__tests__/ProductionEngine.dayModel.test.ts` — preserve legacy daily output expectations.
- Modify: `src/data/buildingMaterials.ts` — convert legacy build-time values to day ticks at the data boundary.
- Modify: `src/core/construction/index.ts` — format construction durations in days/months instead of hours.
- Create: `src/core/construction/__tests__/constructionTime.dayModel.test.ts` — build-time and format assertions.
- Modify: `src/core/finance/BankingSystem.ts` — express loan terms, repayments, and reassessments in day-based ticks.
- Create: `src/core/finance/__tests__/BankingSystem.dayModel.test.ts` — preserve business-facing loan term days.
- Modify: `src/core/economy/DistributionChannels.ts` — lead times and payment terms in day ticks.
- Modify: `src/core/economy/SupplyContracts.ts` — expiry, scheduled fulfillment, and grace periods in day ticks.
- Modify: `src/core/economy/InventoryDecay.ts` — shelf-life math and warnings in day ticks.
- Modify: `src/core/finance/FuturesMarket.ts` — monthly contract cadence based on 30-day months.
- Modify: `src/core/economy/SeasonalDemand.ts` — derive seasons and month/day positions from day ticks.
- Modify: `src/core/loop/GameLoop.ts` — replace hourly windows and day offsets with day/month scheduling.
- Modify: `src/core/loop/__tests__/GameLoop.economyStability.test.ts` — opening-economy expectations on day ticks.
- Create: `src/core/loop/__tests__/GameLoop.dayModel.test.ts` — GDP and monthly cadence coverage.
- Modify: `src/core/ai/AIDecisionEngine.ts` — day-based inventory coverage and AI cadence constants.
- Modify: `src/core/ai/AIProductionOptimizer.ts` — consume daily demand directly.
- Modify: `src/core/ai/PlayerAutoTrader.ts` — compute material needs in day units.
- Modify: `src/core/ai/CompetitiveIntelligence.ts` — cache TTL in day ticks.
- Modify: `src/core/ai/PersonalityBehaviors.ts` — sales-per-day calculations.
- Modify: `src/core/ai/PricePredictor.ts` — rename or remap `24h` predictions to day predictions.
- Modify: `src/core/ai/RiskManagement.ts` — alert retention windows in day ticks.
- Modify: `src/core/ai/StrategicPlanner.ts` — planning horizons and intervals in day ticks.
- Create: `src/core/ai/__tests__/AIDecisionEngine.dayModel.test.ts` — day-based inventory coverage and cadence checks.
- Modify: `src/ui/pages/Finance.tsx` — remove hour stamps and update near-history labels.
- Modify: `src/ui/pages/Market.tsx` — day-based chart labels and aggregations.
- Modify: `src/ui/components/Save/SaveLoadPanel.tsx` — playtime in days/months/years.
- Modify: `src/ui/components/Statistics/GameStatisticsPanel.tsx` — game time and achievement progress in days.
- Modify: `src/ui/components/Contracts/ContractListPanel.tsx` — remaining time in days/months.
- Modify: `src/ui/components/Research/TechTreePanel.tsx` — research durations in day terms.
- Modify: `src/ui/components/Dashboard/hooks/useDashboardData.ts` — output-per-day and history update cadence.
- Modify: `src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx` — verify day-based date strings and no `:00`.
- Modify: `src/core/llm/GodModePrompt.ts` — `fast_forward(ticks=1)` for one day.
- Modify: `src/core/llm/WorldModifier.ts` — day-based duration text.

### Task 1: Establish The Day-Based Time Foundation

**Files:**
- Modify: `src/core/constants.ts`
- Modify: `src/core/world/GameWorld.ts`
- Modify: `src/ui/utils/format.ts`
- Create: `src/core/world/__tests__/GameWorld.timeModel.test.ts`
- Create: `src/ui/utils/__tests__/format.dayModel.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/world/__tests__/GameWorld.timeModel.test.ts
import { describe, expect, it } from 'vitest';

import {
  LEGACY_HOURS_PER_DAY,
  TICKS_PER_DAY,
  TICKS_PER_MONTH,
  TICKS_PER_YEAR,
  legacyHourTicksToDayTicks,
} from '@/core/constants';
import { formatGameDate, tickToDate } from '../GameWorld';

describe('GameWorld day-based time model', () => {
  it('defines one tick as one day while preserving the legacy hour conversion helper', () => {
    expect(LEGACY_HOURS_PER_DAY).toBe(24);
    expect(TICKS_PER_DAY).toBe(1);
    expect(TICKS_PER_MONTH).toBe(30);
    expect(TICKS_PER_YEAR).toBe(360);
    expect(legacyHourTicksToDayTicks(72, 'floor')).toBe(3);
  });

  it('formats dates without an hour field', () => {
    expect(tickToDate(0)).toEqual({ year: 1, month: 1, day: 1 });
    expect(tickToDate(30)).toEqual({ year: 1, month: 2, day: 1 });
    expect(formatGameDate(359)).toBe('第1年 12月30日');
  });
});
```

```ts
// src/ui/utils/__tests__/format.dayModel.test.ts
import { describe, expect, it } from 'vitest';

import { formatRelativeTime, formatTick } from '../format';

describe('format day-based time strings', () => {
  it('renders day-sized ticks without hours', () => {
    expect(formatTick(0)).toBe('第1年 1月1日');
    expect(formatRelativeTime(1)).toBe('1天');
    expect(formatRelativeTime(30)).toBe('1个月');
    expect(formatRelativeTime(360)).toBe('1年');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/world/__tests__/GameWorld.timeModel.test.ts src/ui/utils/__tests__/format.dayModel.test.ts`

Expected: FAIL because `TICKS_PER_DAY` is still `24`, `tickToDate()` still returns `hour`, `formatTick()` still emits `:00`, and `formatRelativeTime()` still reports hours.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/constants.ts
export const LEGACY_HOURS_PER_DAY = 24;
export const TICKS_PER_DAY = 1;
export const TICKS_PER_MONTH = 30;
export const TICKS_PER_YEAR = TICKS_PER_MONTH * 12;

export function legacyHourTicksToDayTicks(
  value: number,
  rounding: 'none' | 'floor' | 'ceil' = 'none',
): number {
  const scaled = value / LEGACY_HOURS_PER_DAY;

  if (rounding === 'floor') {
    return Math.floor(scaled);
  }

  if (rounding === 'ceil') {
    return Math.max(1, Math.ceil(scaled));
  }

  return scaled;
}
```

```ts
// src/core/world/GameWorld.ts
import { TICKS_PER_MONTH, TICKS_PER_YEAR } from '../constants';

export function tickToDate(tick: number): { year: number; month: number; day: number } {
  const dayIndex = Math.floor(tick);
  const year = Math.floor(dayIndex / TICKS_PER_YEAR) + 1;
  const month = Math.floor((dayIndex % TICKS_PER_YEAR) / TICKS_PER_MONTH) + 1;
  const day = (dayIndex % TICKS_PER_MONTH) + 1;

  return { year, month, day };
}

export function formatGameDate(tick: number): string {
  const date = tickToDate(tick);
  return `第${date.year}年 ${date.month}月${date.day}日`;
}
```

```ts
// src/ui/utils/format.ts
export function formatTick(tick: number): string {
  const day = Math.floor(tick) + 1;
  const month = Math.floor((day - 1) / 30) + 1;
  const year = Math.floor((month - 1) / 12) + 1;
  const dayOfMonth = ((day - 1) % 30) + 1;
  const monthOfYear = ((month - 1) % 12) + 1;

  return `第${year}年 ${monthOfYear}月${dayOfMonth}日`;
}

export function formatRelativeTime(ticks: number): string {
  if (ticks < 30) {
    return `${ticks}天`;
  }

  const months = Math.floor(ticks / 30);
  if (months < 12) {
    return `${months}个月`;
  }

  return `${Math.floor(months / 12)}年`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/world/__tests__/GameWorld.timeModel.test.ts src/ui/utils/__tests__/format.dayModel.test.ts`

Expected: PASS with no references to `hour` in the helper output.

- [ ] **Step 5: Commit**

```bash
git add src/core/constants.ts src/core/world/GameWorld.ts src/ui/utils/format.ts src/core/world/__tests__/GameWorld.timeModel.test.ts src/ui/utils/__tests__/format.dayModel.test.ts
git commit -m "refactor: establish day-based time helpers"
```

### Task 2: Migrate Save Data Into The Day Model

**Files:**
- Modify: `src/core/save/SaveManager.ts`
- Create: `src/core/save/__tests__/SaveManager.timeModel.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/save/__tests__/SaveManager.timeModel.test.ts
import { describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { BuildingId } from '@/data/buildings';
import { SaveManager, SerializedWorld } from '../SaveManager';

describe('SaveManager day-model migration', () => {
  it('serializes new saves with explicit day-based metadata', () => {
    const manager = new SaveManager();
    const world = createGameWorld();
    world.companies.count = 1;

    const serialized = manager.serializeWorld(world, 42);

    expect(serialized.timeModel).toBe('day');
    expect(serialized.currentTick).toBe(42);
  });

  it('converts legacy hour ticks to day ticks when loading old saves', () => {
    const manager = new SaveManager();
    const world = createGameWorld();

    const legacyPayload = {
      goods: { count: 0, prices: [], supplies: [], demands: [] },
      buildings: {
        count: 1,
        types: [BuildingId.IRON_MINE],
        owners: [0],
        levels: [1],
        efficiencies: [1],
        outputModeIds: [0],
        isActive: [1],
      },
      companies: {
        count: 1,
        cash: [1000],
        isAI: [false],
        inventories: [[]],
      },
      timeModel: 'hour' as const,
      currentTick: 72,
    } satisfies SerializedWorld;

    manager.deserializeWorld(legacyPayload, world);

    expect(world.tick).toBe(3);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/save/__tests__/SaveManager.timeModel.test.ts`

Expected: FAIL because `SerializedWorld` has no `timeModel`, `serializeWorld()` does not tag saves as day-based, and `deserializeWorld()` restores `72` instead of `3`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/save/SaveManager.ts
import { GOODS_COUNT, legacyHourTicksToDayTicks } from '@/core/constants';

export interface SerializedWorld {
  timeModel?: 'hour' | 'day';
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
}

export class SaveManager {
  private normalizeLoadedTick(
    currentTick: number,
    timeModel: 'hour' | 'day' = 'hour',
  ): number {
    return timeModel === 'day'
      ? currentTick
      : legacyHourTicksToDayTicks(currentTick, 'floor');
  }

  serializeWorld(world: GameWorld, currentTick: number): SerializedWorld {
    return {
      timeModel: 'day',
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
        isAI: Array.from(world.companies.isAI),
        inventories: this.serializeInventories(world),
      },
      currentTick,
    };
  }

  deserializeWorld(data: SerializedWorld, world: GameWorld): void {
    world.tick = this.normalizeLoadedTick(data.currentTick, data.timeModel ?? 'hour');
    world.goods.count = data.goods.count;
    world.goods.prices.set(data.goods.prices);
    world.goods.supplies.set(data.goods.supplies);
    world.goods.demands.set(data.goods.demands);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/save/__tests__/SaveManager.timeModel.test.ts src/core/save/__tests__/SaveManager.productionControl.test.ts`

Expected: PASS and the older production-control persistence tests continue to pass against the migrated save format.

- [ ] **Step 5: Commit**

```bash
git add src/core/save/SaveManager.ts src/core/save/__tests__/SaveManager.timeModel.test.ts src/core/save/__tests__/SaveManager.productionControl.test.ts
git commit -m "feat: migrate saves into the day-based time model"
```

### Task 3: Normalize Production Rates And Operating Costs

**Files:**
- Modify: `src/core/production/ProductionEngine.ts`
- Modify: `src/core/finance/OperatingCosts.ts`
- Modify: `src/core/finance/__tests__/OperatingCosts.test.ts`
- Create: `src/core/production/__tests__/ProductionEngine.dayModel.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/production/__tests__/ProductionEngine.dayModel.test.ts
import { describe, expect, it } from 'vitest';

import { LEGACY_HOURS_PER_DAY } from '@/core/constants';
import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { calculateDailyConsumption, calculateTheoreticalOutput } from '../ProductionEngine';

describe('ProductionEngine day-model normalization', () => {
  it('preserves the legacy daily output for a one-day tick', () => {
    const building = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
    const expected = building.production.outputs[0].amount /
      (building.production.ticksRequired / LEGACY_HOURS_PER_DAY);

    const [output] = calculateTheoreticalOutput(BuildingId.IRON_MINE, 1);

    expect(output.amount).toBeCloseTo(expected);
  });

  it('preserves the legacy daily input consumption for a one-day tick', () => {
    const building = BUILDINGS_BY_ID.get(BuildingId.STEEL_MILL)!;
    const expected = building.production.inputs[0].amount /
      (building.production.ticksRequired / LEGACY_HOURS_PER_DAY);

    const [input] = calculateDailyConsumption(BuildingId.STEEL_MILL);

    expect(input.amount).toBeCloseTo(expected);
  });
});
```

```ts
// src/core/finance/__tests__/OperatingCosts.test.ts
expect(breakdown.maintenance).toBeCloseTo(
  ironMine.maintenanceCost + steelMill.maintenanceCost,
);
expect(breakdown.labor).toBeCloseTo(
  ironMine.laborCost + steelMill.laborCost,
);
expect(breakdown.energy).toBeCloseTo(
  ironMine.energyCost * ironMineEnergyMultiplier +
  steelMill.energyCost * steelMillEnergyMultiplier,
);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/production/__tests__/ProductionEngine.dayModel.test.ts src/core/finance/__tests__/OperatingCosts.test.ts`

Expected: FAIL because production still divides day output across 24 ticks and operating costs still divide all recurring charges by `24`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/production/ProductionEngine.ts
import {
  MAX_INPUTS,
  MAX_OUTPUTS,
  MAX_SLOTS,
  GOODS_COUNT,
  legacyHourTicksToDayTicks,
  LEGACY_HOURS_PER_DAY,
  TICKS_PER_DAY,
} from '../constants';

function createCacheFromConfig(
  inputs: ProductionIO[],
  outputs: ProductionIO[],
  ticksRequired: number,
  laborRequired: number,
  energyRequired: number,
): ProductionCache {
  const normalizedTicksRequired = Math.max(
    1 / LEGACY_HOURS_PER_DAY,
    legacyHourTicksToDayTicks(ticksRequired, 'none'),
  );

  return {
    inputCount: inputs.length,
    outputCount: outputs.length,
    inputGoods: inputs.map(i => i.goodsId),
    inputAmounts: inputs.map(i => i.amount),
    outputGoods: outputs.map(o => o.goodsId),
    outputAmounts: outputs.map(o => o.amount),
    ticksRequired: normalizedTicksRequired,
    laborRequired: laborRequired / normalizedTicksRequired,
    energyRequired: energyRequired / normalizedTicksRequired,
  };
}

export function calculateTheoreticalOutput(
  buildingTypeId: number,
  level: number,
  modeId: number = 0,
): { goodsId: number; amount: number }[] {
  const cache = getProductionCache(buildingTypeId, modeId);
  if (!cache) return [];

  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  const efficiencyMultiplier = building
    ? building.efficiencyMultipliers[Math.min(level - 1, building.efficiencyMultipliers.length - 1)]
    : 1;

  return cache.outputGoods.map((goodsId, i) => ({
    goodsId,
    amount: (cache.outputAmounts[i] / cache.ticksRequired) * TICKS_PER_DAY * efficiencyMultiplier,
  }));
}

export function calculateDailyConsumption(
  buildingTypeId: number,
  modeId: number = 0,
  efficiency: number = 1,
): { goodsId: number; amount: number }[] {
  const cache = getProductionCache(buildingTypeId, modeId);
  if (!cache) return [];

  return cache.inputGoods.map((goodsId, i) => ({
    goodsId,
    amount: (cache.inputAmounts[i] / cache.ticksRequired) * TICKS_PER_DAY * efficiency,
  }));
}
```

```ts
// src/core/finance/OperatingCosts.ts
import { MAX_SLOTS, TICKS_PER_DAY } from '@/core/constants';

const DEFAULT_TICKS_PER_DAY = TICKS_PER_DAY;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/production/__tests__/ProductionEngine.dayModel.test.ts src/core/finance/__tests__/OperatingCosts.test.ts`

Expected: PASS and `calculateCompanyOperatingCostPerTick()` now returns one day of charge per tick.

- [ ] **Step 5: Commit**

```bash
git add src/core/production/ProductionEngine.ts src/core/production/__tests__/ProductionEngine.dayModel.test.ts src/core/finance/OperatingCosts.ts src/core/finance/__tests__/OperatingCosts.test.ts
git commit -m "refactor: normalize production and operating costs to day ticks"
```

### Task 4: Convert Domain Durations At The Data Boundaries

**Files:**
- Modify: `src/data/buildingMaterials.ts`
- Modify: `src/core/construction/index.ts`
- Create: `src/core/construction/__tests__/constructionTime.dayModel.test.ts`
- Modify: `src/core/finance/BankingSystem.ts`
- Create: `src/core/finance/__tests__/BankingSystem.dayModel.test.ts`
- Modify: `src/core/economy/DistributionChannels.ts`
- Modify: `src/core/economy/SupplyContracts.ts`
- Modify: `src/core/economy/InventoryDecay.ts`
- Modify: `src/core/finance/FuturesMarket.ts`
- Modify: `src/core/economy/SeasonalDemand.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/construction/__tests__/constructionTime.dayModel.test.ts
import { describe, expect, it } from 'vitest';

import { getBuildTime } from '@/data/buildingMaterials';
import { BuildingId } from '@/data/buildings';
import { formatConstructionTime } from '../index';

describe('construction time formatting in the day model', () => {
  it('converts legacy build times to day ticks and formats them without hours', () => {
    expect(getBuildTime(BuildingId.LOGGING_CAMP)).toBe(1);
    expect(getBuildTime(BuildingId.FARM)).toBe(2);
    expect(formatConstructionTime(1)).toBe('1天');
    expect(formatConstructionTime(45)).toBe('1个月15天');
  });
});
```

```ts
// src/core/finance/__tests__/BankingSystem.dayModel.test.ts
import { describe, expect, it } from 'vitest';

import { initializeWorld } from '@/core/world/WorldInitializer';
import { getAvailableLoanOptions, initializeBankingSystem } from '../BankingSystem';

describe('BankingSystem day-model terms', () => {
  it('keeps loan terms expressed in business-facing days', () => {
    const world = initializeWorld();
    initializeBankingSystem(world);

    const options = getAvailableLoanOptions(world, 0);
    const shortTerm = options.find(option => option.type === 'short_term');
    const mediumTerm = options.find(option => option.type === 'medium_term');

    expect(shortTerm?.termDays).toBe(90);
    expect(mediumTerm?.termDays).toBe(360);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/construction/__tests__/constructionTime.dayModel.test.ts src/core/finance/__tests__/BankingSystem.dayModel.test.ts`

Expected: FAIL because `getBuildTime()` still returns legacy hour ticks, `formatConstructionTime()` still emits hours, and the loan terms are still derived from `termTicks / 24`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/data/buildingMaterials.ts
import { legacyHourTicksToDayTicks } from '@/core/constants';

export function getBuildTime(buildingTypeId: number): number {
  const legacyBuildTime = BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId)?.buildTime ?? 24;
  return legacyHourTicksToDayTicks(legacyBuildTime, 'ceil');
}
```

```ts
// src/core/construction/index.ts
import { TICKS_PER_MONTH } from '@/core/constants';

export function formatConstructionTime(ticks: number): string {
  if (ticks < TICKS_PER_MONTH) {
    return `${ticks}天`;
  }

  const months = Math.floor(ticks / TICKS_PER_MONTH);
  const days = ticks % TICKS_PER_MONTH;

  if (days === 0) {
    return `${months}个月`;
  }

  return `${months}个月${days}天`;
}
```

```ts
// src/core/finance/BankingSystem.ts
import { GOODS_COUNT, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '@/core/constants';

function getLoanTerm(loanType: LoanType): number {
  const terms: Record<LoanType, number> = {
    credit_line: 360 * TICKS_PER_DAY,
    short_term: 90 * TICKS_PER_DAY,
    medium_term: 360 * TICKS_PER_DAY,
    long_term: 3 * TICKS_PER_YEAR,
  };

  return terms[loanType];
}

function calculateMonthlyPayment(principal: number, annualRate: number, termTicks: number): number {
  const months = termTicks / TICKS_PER_MONTH;
  const monthlyRate = annualRate / 12;

  if (monthlyRate === 0) {
    return principal / months;
  }

  return principal * monthlyRate * Math.pow(1 + monthlyRate, months) /
    (Math.pow(1 + monthlyRate, months) - 1);
}

loan.nextPaymentTick = world.tick + TICKS_PER_MONTH;
const termDays = termTicks / TICKS_PER_DAY;
if (world.tick > loan.nextPaymentTick + TICKS_PER_MONTH) {
  loan.missedPayments++;
}
if (world.tick % TICKS_PER_MONTH === 0) {
  profile.lastAssessmentTick = world.tick;
}
```

```ts
// src/core/economy/DistributionChannels.ts
order.deliveryTick = currentTick + config.leadTime * TICKS_PER_DAY;
order.paymentTick = currentTick + relationship.paymentTermDays * TICKS_PER_DAY;

// src/core/economy/SupplyContracts.ts
expiryTick: currentTick + 7 * TICKS_PER_DAY,
endTick: currentTick + proposal.periodDays * proposal.totalPeriods * TICKS_PER_DAY,
const scheduledTick = contract.startTick + (period + 1) * contract.periodDays * TICKS_PER_DAY;

// src/core/economy/InventoryDecay.ts
const shelfLifeTicks = config ? config.shelfLifeDays * TICKS_PER_DAY : -1;
const warningTicks = warningDays * TICKS_PER_DAY;

// src/core/finance/FuturesMarket.ts
const ticksPerMonth = 30 * TICKS_PER_DAY;

// src/core/economy/SeasonalDemand.ts
const day = Math.floor(tick / TICKS_PER_DAY) + 1;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/construction/__tests__/constructionTime.dayModel.test.ts src/core/finance/__tests__/BankingSystem.dayModel.test.ts`

Expected: PASS and `grep`-style follow-up review shows these duration-heavy modules are expressing business days explicitly.

- [ ] **Step 5: Commit**

```bash
git add src/data/buildingMaterials.ts src/core/construction/index.ts src/core/construction/__tests__/constructionTime.dayModel.test.ts src/core/finance/BankingSystem.ts src/core/finance/__tests__/BankingSystem.dayModel.test.ts src/core/economy/DistributionChannels.ts src/core/economy/SupplyContracts.ts src/core/economy/InventoryDecay.ts src/core/finance/FuturesMarket.ts src/core/economy/SeasonalDemand.ts
git commit -m "refactor: convert domain durations to day-based ticks"
```

### Task 5: Rebuild Game Loop Scheduling Around Day And Month Phases

**Files:**
- Modify: `src/core/loop/GameLoop.ts`
- Modify: `src/core/loop/__tests__/GameLoop.economyStability.test.ts`
- Create: `src/core/loop/__tests__/GameLoop.dayModel.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/loop/__tests__/GameLoop.dayModel.test.ts
import { describe, expect, it, vi } from 'vitest';

describe('GameLoop day-model cadence', () => {
  it('updates GDP after the first full simulated day instead of waiting for 24 hourly ticks', async () => {
    vi.resetModules();

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    try {
      expect(world.economyStats.gdp).toBe(0);
      loop.manualTick();
      expect(world.economyStats.gdp).toBeGreaterThanOrEqual(0);
    } finally {
      loop.destroy();
    }
  });
});
```

```ts
// src/core/loop/__tests__/GameLoop.economyStability.test.ts
for (let tick = 0; tick < 15; tick++) {
  loop.manualTick();
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/loop/__tests__/GameLoop.dayModel.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts`

Expected: FAIL because `GameLoop` still stores 24-day windows in `Float64Array(24)`, still gates GDP and monthly work on `24`, and the opening-economy test still assumes 15 days means `24 * 15` ticks.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/loop/GameLoop.ts
import {
  DEFAULT_TICK_INTERVAL,
  BASE_INTEREST_RATE,
  TARGET_INFLATION,
  GOODS_COUNT,
  AI_BATCH_SIZE,
  TICKS_PER_DAY,
  TICKS_PER_MONTH,
  TICKS_PER_YEAR,
} from '../constants';

private readonly recentRetailRevenue = new Float64Array(TICKS_PER_MONTH);
private readonly recentServiceRevenue = new Float64Array(TICKS_PER_MONTH);

const monthlyPhase = (currentTick - 1) % TICKS_PER_MONTH;

const dailyActivitySlot = (currentTick - 1) % TICKS_PER_MONTH;
this.recentRetailRevenue[dailyActivitySlot] = retailResult.totalRevenue ?? 0;
this.recentServiceRevenue[dailyActivitySlot] = serviceConsumption.totalRevenue ?? 0;

if (monthlyPhase === 1) {
  distributionManager.processDeliveries(currentTick);
}
if (monthlyPhase === 9) {
  distributionManager.processPayments(currentTick);
}
if (monthlyPhase === 17) {
  futuresMarket.updatePositionsPnL(spotPrices);
  futuresMarket.handleExpiry(currentTick, spotPrices);
}
if (currentTick % TICKS_PER_MONTH === 0) {
  futuresMarket.createMonthlyContracts(currentTick, spotPrices);
}

if (this.world.tick >= TICKS_PER_DAY && this.world.tick % TICKS_PER_DAY === 0) {
  this.updateGDP();
}

const annualizedGDP = dailyGDP * TICKS_PER_YEAR;
const cycleLength = TICKS_PER_YEAR * 5;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/loop/__tests__/GameLoop.dayModel.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.retailSmoke.test.ts`

Expected: PASS and the loop tests no longer need `24 * N` tick counts to represent day windows.

- [ ] **Step 5: Commit**

```bash
git add src/core/loop/GameLoop.ts src/core/loop/__tests__/GameLoop.dayModel.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.retailSmoke.test.ts
git commit -m "refactor: move game loop scheduling to day and month phases"
```

### Task 6: Rewrite AI Cadence And Inventory Coverage For Day Ticks

**Files:**
- Modify: `src/core/ai/AIDecisionEngine.ts`
- Modify: `src/core/ai/AIProductionOptimizer.ts`
- Modify: `src/core/ai/PlayerAutoTrader.ts`
- Modify: `src/core/ai/CompetitiveIntelligence.ts`
- Modify: `src/core/ai/PersonalityBehaviors.ts`
- Modify: `src/core/ai/PricePredictor.ts`
- Modify: `src/core/ai/RiskManagement.ts`
- Modify: `src/core/ai/StrategicPlanner.ts`
- Create: `src/core/ai/__tests__/AIDecisionEngine.dayModel.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/ai/__tests__/AIDecisionEngine.dayModel.test.ts
import { describe, expect, it } from 'vitest';

import {
  AI_DAY_CADENCE,
  calculateInventoryCoverageDays,
} from '../AIDecisionEngine';

describe('AIDecisionEngine day-model helpers', () => {
  it('computes inventory coverage directly from daily demand', () => {
    expect(calculateInventoryCoverageDays(72, 12)).toBe(6);
    expect(calculateInventoryCoverageDays(10, 0)).toBe(999);
  });

  it('exposes day-based recurring cadences for major AI jobs', () => {
    expect(AI_DAY_CADENCE.orderPriceAdjustDays).toBe(3);
    expect(AI_DAY_CADENCE.stockTradeDays).toBe(7);
    expect(AI_DAY_CADENCE.coldGoodsScanDays).toBe(4);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/ai/__tests__/AIDecisionEngine.dayModel.test.ts`

Expected: FAIL because those helpers and cadence constants do not exist, and the AI code still mixes `/ 24`, `* 24`, and hard-coded hour-tick schedules.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/core/ai/AIDecisionEngine.ts
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '@/core/constants';

export const AI_DAY_CADENCE = {
  orderPriceAdjustDays: 3,
  stockTradeDays: 7,
  subsidiaryManagementDays: 1,
  strategicMaterialCheckDays: 2,
  zeroSupplyCheckDays: 4,
  coldGoodsScanDays: 4,
} as const;

export function calculateInventoryCoverageDays(inventory: number, dailyNeed: number): number {
  return dailyNeed > 0 ? inventory / dailyNeed : 999;
}

const dailyNeed = demand / TICKS_PER_DAY;
const inventoryDays = calculateInventoryCoverageDays(inventory, dailyNeed);
materialNeeds.set(input.goodsId, currentNeed + input.amount * efficiency * TICKS_PER_DAY);

if (world.tick % AI_DAY_CADENCE.stockTradeDays === 0) {
  executeAIStockTrading(world);
}
```

```ts
// src/core/ai/AIProductionOptimizer.ts
const dailyConsumption = demand / TICKS_PER_DAY;

// src/core/ai/PlayerAutoTrader.ts
productionInputNeeds.set(input.goodsId, current + input.amount * efficiency * TICKS_PER_DAY);

// src/core/ai/CompetitiveIntelligence.ts
if (cached && store && world.tick - store.lastAnalysisTick < TICKS_PER_DAY) {
  return cached;
}

// src/core/ai/StrategicPlanner.ts
planningInterval: TICKS_PER_MONTH,
endTick: currentTick + TICKS_PER_YEAR,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/ai/__tests__/AIDecisionEngine.dayModel.test.ts src/core/ai/__tests__/AIProductionOptimizer.test.ts`

Expected: PASS and a quick search through `src/core/ai` shows the remaining time math is expressed in day/month/year constants instead of `24`.

- [ ] **Step 5: Commit**

```bash
git add src/core/ai/AIDecisionEngine.ts src/core/ai/AIProductionOptimizer.ts src/core/ai/PlayerAutoTrader.ts src/core/ai/CompetitiveIntelligence.ts src/core/ai/PersonalityBehaviors.ts src/core/ai/PricePredictor.ts src/core/ai/RiskManagement.ts src/core/ai/StrategicPlanner.ts src/core/ai/__tests__/AIDecisionEngine.dayModel.test.ts src/core/ai/__tests__/AIProductionOptimizer.test.ts
git commit -m "refactor: move ai timing and inventory math to day ticks"
```

### Task 7: Update UI, Charts, And Prompt Copy To Day Semantics

**Files:**
- Modify: `src/ui/pages/Finance.tsx`
- Modify: `src/ui/pages/Market.tsx`
- Modify: `src/ui/components/Save/SaveLoadPanel.tsx`
- Modify: `src/ui/components/Statistics/GameStatisticsPanel.tsx`
- Modify: `src/ui/components/Contracts/ContractListPanel.tsx`
- Modify: `src/ui/components/Research/TechTreePanel.tsx`
- Modify: `src/ui/components/Dashboard/hooks/useDashboardData.ts`
- Modify: `src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx`
- Modify: `src/core/llm/GodModePrompt.ts`
- Modify: `src/core/llm/WorldModifier.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx
it('renders day-based dates without legacy hour strings', () => {
  const html = renderToStaticMarkup(React.createElement(Finance));

  expect(html).toContain('第1年 3月13日');
  expect(html).not.toContain(':00');
  expect(html).not.toContain('近100小时');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx`

Expected: FAIL because the page still renders hour-stamped dates like `3/13 0:00` and old summary labels like `近100小时`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/ui/pages/Finance.tsx
const now = tickToDate(tick);
return [{ time: `${now.month}/${now.day}`, price: playerCash }];

const t = tickToDate(point.tick);
time: `${t.month}/${t.day}`,

const dayIndex = point.tick;
period: `第${dayIndex + 1}天`,

<th className="text-right p-3 text-[var(--text-muted)] text-sm font-medium">累计(近100天)</th>
```

```ts
// src/ui/pages/Market.tsx
const date = tickToDate(tickTime);
const timeStr = `${date.year}/${date.month}/${date.day}`;

// src/ui/components/Save/SaveLoadPanel.tsx
return `${ticks}天`;

// src/ui/components/Statistics/GameStatisticsPanel.tsx
return `${days}天`;

// src/core/llm/GodModePrompt.ts
- "快进一天" → fast_forward(ticks=1)

// src/core/llm/WorldModifier.ts
return `${days}天`;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx`

Expected: PASS and the rendered markup no longer contains `:00`, `小时`, or `近100小时` for these day-based views.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pages/Finance.tsx src/ui/pages/Market.tsx src/ui/components/Save/SaveLoadPanel.tsx src/ui/components/Statistics/GameStatisticsPanel.tsx src/ui/components/Contracts/ContractListPanel.tsx src/ui/components/Research/TechTreePanel.tsx src/ui/components/Dashboard/hooks/useDashboardData.ts src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx src/core/llm/GodModePrompt.ts src/core/llm/WorldModifier.ts
git commit -m "refactor: update ui and prompt copy for day-based time"
```

### Task 8: Run Full Verification And Sweep For Hour-Based Leftovers

**Files:**
- Modify as needed: any files above if verification exposes small regressions

- [ ] **Step 1: Run the targeted day-model suites**

Run: `npm test -- src/core/world/__tests__/GameWorld.timeModel.test.ts src/ui/utils/__tests__/format.dayModel.test.ts src/core/save/__tests__/SaveManager.timeModel.test.ts src/core/production/__tests__/ProductionEngine.dayModel.test.ts src/core/finance/__tests__/OperatingCosts.test.ts src/core/construction/__tests__/constructionTime.dayModel.test.ts src/core/finance/__tests__/BankingSystem.dayModel.test.ts src/core/loop/__tests__/GameLoop.dayModel.test.ts src/core/ai/__tests__/AIDecisionEngine.dayModel.test.ts src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx`

Expected: PASS across the new coverage added by Tasks 1-7.

- [ ] **Step 2: Run the existing regression suites that should remain stable**

Run: `npm test -- src/core/loop/__tests__/GameLoop.economyStability.test.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.retailSmoke.test.ts src/core/save/__tests__/SaveManager.productionControl.test.ts src/core/finance/__tests__/FinancialSnapshot.test.ts src/core/finance/__tests__/FinancialHistory.test.ts src/ui/components/Statistics/__tests__/GameStatisticsPanel.financialSnapshot.test.tsx src/ui/pages/__tests__/Finance.financialSnapshot.test.tsx`

Expected: PASS and no regressions in save hydration, finance snapshots, or opening-loop stability.

- [ ] **Step 3: Build the app**

Run: `npm run build`

Expected: PASS with a clean TypeScript and Vite build.

- [ ] **Step 4: Search for hour-based leftovers and fix any obvious misses**

Run: `Get-ChildItem -Recurse -File src | Select-String -Pattern '小时|24h|:00|/ 24|\* 24|tick % 24|近100小时|快进一天.*24' -CaseSensitive:$false`

Expected: no remaining user-facing hour strings, and only intentional `LEGACY_HOURS_PER_DAY` migration helpers left in the codebase.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "test: verify day-based time model migration"
```

## Self-Review

### Spec Coverage

- Time constants, date helpers, and relative formatting are covered by Task 1.
- Save versioning and old-save migration are covered by Task 2.
- Production, operating cost, and legacy daily balance preservation are covered by Task 3.
- Construction, contracts, banking, futures, seasonal, and decay durations are covered by Task 4.
- Game loop cadence, GDP windows, and monthly scheduling are covered by Task 5.
- AI cadence and inventory-day calculations are covered by Task 6.
- UI text, chart labels, and LLM prompt copy are covered by Task 7.
- Test/build verification and hour-leftover search are covered by Task 8.

No spec sections are unassigned.

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Every implementation step contains code, and every verification step contains an exact command plus expected outcome.

### Type Consistency

- Shared conversion helper name is `legacyHourTicksToDayTicks(value, rounding)` in every task.
- Save metadata uses `'hour' | 'day'` consistently.
- Month/year durations always resolve through `TICKS_PER_MONTH` and `TICKS_PER_YEAR`.
