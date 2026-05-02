# Labor System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a building-level labor system where each production method defines basic, technical, and management workforce demand; buildings hire by wage multiplier; shortages reduce output; payroll is accrued daily and paid monthly.

**Architecture:** Add `GameWorld.labor` plus building-level labor arrays that follow the existing SoA style. Add a focused `src/core/labor/LaborSystem.ts` module for role constants, workforce math, hiring, attrition, wage-market updates, payroll accrual, and save hydration. Production methods expose `workforceDelta`, production consumes `workforceRequired`, finance pays accrued payroll monthly, and UI/store expose wage sliders in the building detail panel.

**Tech Stack:** TypeScript, React 18, Zustand, Vitest, existing Vite aliases and SoA world model.

---

## File Structure

- Create: `src/core/labor/LaborSystem.ts`
  - Role constants, array indexing helpers, market defaults, workforce math, hiring/attrition, wage updates, payroll accrual, monthly payment, save hydration.
- Create: `src/core/labor/__tests__/LaborSystem.test.ts`
  - Unit coverage for initialization, workforce demand scaling, hiring limits, attrition, wage bounds, payroll.
- Modify: `src/core/constants.ts`
  - Add `LABOR_ROLE_COUNT = 3`.
- Modify: `src/core/world/GameWorld.ts`
  - Add `LaborSystemData`, `GameWorld.labor`, building arrays `workforceHired`, `wageMultipliers`, `accruedPayroll`, and creation defaults.
- Modify: `src/core/production/methods/types.ts`
  - Replace runtime labor totals with `WorkforceDemand`, `workforceDelta`, and `workforceRequired`.
- Modify: `src/core/production/methods/registry.ts`
  - Sum workforce deltas and return `ComputedRecipe.workforceRequired`.
- Modify: `src/core/production/methods/defaultConfigs.ts`
  - Convert existing `laborRequired` variant data into role-specific workforce values at method creation.
- Modify: `src/core/production/ProductionMethods.ts`
  - Update empty recipe defaults and exports.
- Modify: `src/core/production/ProductionEngine.ts`
  - Replace company-level labor estimate with building-level role coverage and output scaling.
- Modify: `src/core/finance/OperatingCosts.ts`
  - Remove old `buildingDef.laborCost` from recurring operating costs and leave wage flow to labor payroll.
- Modify: `src/core/finance/OperatingCostModel.ts`
  - Stop including old `laborCost` in definition-level estimates.
- Modify: `src/core/loop/GameLoop.ts`
  - Run labor market updates before production and payroll accrual/payment in the finance stage.
- Modify: `src/core/world/WorldInitializer.ts`
  - Initialize labor state for new production and retail buildings.
- Modify: `src/core/save/SaveManager.ts`
  - Serialize and hydrate world/building labor data; migrate old saves.
- Modify: `src/core/ai/AIPersonality.ts`
  - Export personality type lookup already exists; use it for labor wage behavior.
- Modify: `src/stores/gameStore.ts`
  - Add building labor view and wage multiplier action.
- Modify: `src/ui/components/Production/BuildingDetailPanel.tsx`
  - Render labor panel with role rows and wage sliders.
- Modify tests in:
  - `src/core/production/__tests__/ProductionEngine.dayModel.test.ts`
  - `src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`
  - `src/core/finance/__tests__/OperatingCosts.test.ts`
  - `src/core/save/__tests__/SaveManager.storageFallback.test.ts`
  - `src/stores/__tests__/gameStore.loadGame.test.ts`

---

### Task 1: Add Labor Data Model And Core Helpers

**Files:**
- Create: `src/core/labor/LaborSystem.ts`
- Create: `src/core/labor/__tests__/LaborSystem.test.ts`
- Modify: `src/core/constants.ts`
- Modify: `src/core/world/GameWorld.ts`

- [ ] **Step 1: Write failing initialization and helper tests**

Create `src/core/labor/__tests__/LaborSystem.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { TICKS_PER_MONTH } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import {
  LABOR_ROLE_BASIC,
  LABOR_ROLE_COUNT,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  clampWageMultiplier,
  getBuildingLaborIndex,
  getRoleName,
  hydrateLaborState,
  scaleWorkforceDemand,
} from '../LaborSystem';

describe('LaborSystem', () => {
  it('creates world and building labor arrays with stable defaults', () => {
    const world = createGameWorld();

    expect(world.labor.totalSupply.length).toBe(LABOR_ROLE_COUNT);
    expect(world.labor.marketWages[LABOR_ROLE_BASIC]).toBe(120);
    expect(world.labor.marketWages[LABOR_ROLE_TECHNICAL]).toBe(260);
    expect(world.labor.marketWages[LABOR_ROLE_MANAGEMENT]).toBe(520);
    expect(world.labor.unemployed[LABOR_ROLE_BASIC]).toBe(world.labor.totalSupply[LABOR_ROLE_BASIC]);
    expect(world.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(1);
    expect(world.buildings.accruedPayroll[0]).toBe(0);
  });

  it('hydrates missing labor arrays for old world objects', () => {
    const world = createGameWorld();
    const legacy = world as unknown as {
      labor?: unknown;
      buildings: {
        workforceHired?: unknown;
        wageMultipliers?: unknown;
        accruedPayroll?: unknown;
      };
    };

    delete legacy.labor;
    delete legacy.buildings.workforceHired;
    delete legacy.buildings.wageMultipliers;
    delete legacy.buildings.accruedPayroll;

    hydrateLaborState(world);

    expect(world.labor.totalSupply[LABOR_ROLE_BASIC]).toBeGreaterThan(0);
    expect(world.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(1);
  });

  it('scales workforce demand and rounds management demand up when utilization is positive', () => {
    const demand = { basic: 100, technical: 20, management: 5 };

    expect(scaleWorkforceDemand(demand, 0.5)).toEqual({
      basic: 50,
      technical: 10,
      management: 3,
    });
    expect(scaleWorkforceDemand(demand, 0)).toEqual({
      basic: 0,
      technical: 0,
      management: 0,
    });
  });

  it('clamps wage multipliers and exposes display names', () => {
    expect(clampWageMultiplier(0.1)).toBe(0.5);
    expect(clampWageMultiplier(1.25)).toBe(1.25);
    expect(clampWageMultiplier(4)).toBe(2);
    expect(getRoleName(LABOR_ROLE_BASIC)).toBe('普通工人');
    expect(getRoleName(LABOR_ROLE_TECHNICAL)).toBe('技术工人');
    expect(getRoleName(LABOR_ROLE_MANAGEMENT)).toBe('管理人员');
  });

  it('uses monthly time constant for payroll cadence expectations', () => {
    expect(TICKS_PER_MONTH).toBe(30);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test -- src/core/labor/__tests__/LaborSystem.test.ts --run
```

Expected: FAIL because `src/core/labor/LaborSystem.ts` and labor fields do not exist.

- [ ] **Step 3: Add labor constants**

Modify `src/core/constants.ts` near the data scale constants:

```ts
/** 劳动力岗位数量：普通工人、技术工人、管理人员 */
export const LABOR_ROLE_COUNT = 3;
```

- [ ] **Step 4: Add labor data to GameWorld**

Modify `src/core/world/GameWorld.ts`.

Add import:

```ts
  LABOR_ROLE_COUNT,
```

Add interfaces:

```ts
/** 劳动力市场系统数据 */
export interface LaborSystemData {
  totalSupply: Float32Array;
  employed: Float32Array;
  unemployed: Float32Array;
  marketWages: Float32Array;
  monthlyGrowth: Float32Array;
  demandOpenings: Float32Array;
  lastPayrollTick: number;
}
```

Add fields to `BuildingsSystem`:

```ts
  // 劳动力状态
  workforceHired: Float32Array;    // [N × LABOR_ROLE_COUNT]
  wageMultipliers: Float32Array;   // [N × LABOR_ROLE_COUNT]
  accruedPayroll: Float64Array;    // [N] 本月已计提工资
```

Add `labor` to `GameWorld`:

```ts
  // 劳动力市场
  labor: LaborSystemData;
```

Update `createBuildingsSystem()`:

```ts
  const laborSize = MAX_BUILDINGS * LABOR_ROLE_COUNT;
  const wageMultipliers = new Float32Array(laborSize);
  wageMultipliers.fill(1.0);
```

Return these fields:

```ts
    workforceHired: new Float32Array(laborSize),
    wageMultipliers,
    accruedPayroll: new Float64Array(MAX_BUILDINGS),
```

Add factory:

```ts
export function createLaborSystem(): LaborSystemData {
  const totalSupply = new Float32Array(LABOR_ROLE_COUNT);
  totalSupply[0] = 120_000;
  totalSupply[1] = 32_000;
  totalSupply[2] = 8_000;

  const employed = new Float32Array(LABOR_ROLE_COUNT);
  const unemployed = new Float32Array(totalSupply);

  const marketWages = new Float32Array(LABOR_ROLE_COUNT);
  marketWages[0] = 120;
  marketWages[1] = 260;
  marketWages[2] = 520;

  const monthlyGrowth = new Float32Array(LABOR_ROLE_COUNT);
  monthlyGrowth[0] = 600;
  monthlyGrowth[1] = 120;
  monthlyGrowth[2] = 30;

  return {
    totalSupply,
    employed,
    unemployed,
    marketWages,
    monthlyGrowth,
    demandOpenings: new Float32Array(LABOR_ROLE_COUNT),
    lastPayrollTick: 0,
  };
}
```

Update `createGameWorld()`:

```ts
    labor: createLaborSystem(),
```

- [ ] **Step 5: Implement core helper module**

Create `src/core/labor/LaborSystem.ts`:

```ts
import { LABOR_ROLE_COUNT, MAX_BUILDINGS } from '@/core/constants';
import type { GameWorld, LaborSystemData } from '@/core/world/GameWorld';

export { LABOR_ROLE_COUNT };

export const LABOR_ROLE_BASIC = 0;
export const LABOR_ROLE_TECHNICAL = 1;
export const LABOR_ROLE_MANAGEMENT = 2;

export type LaborRole =
  | typeof LABOR_ROLE_BASIC
  | typeof LABOR_ROLE_TECHNICAL
  | typeof LABOR_ROLE_MANAGEMENT;

export interface WorkforceDemand {
  basic: number;
  technical: number;
  management: number;
}

export const EMPTY_WORKFORCE_DEMAND: WorkforceDemand = {
  basic: 0,
  technical: 0,
  management: 0,
};

const ROLE_NAMES = ['普通工人', '技术工人', '管理人员'] as const;
const DEFAULT_TOTAL_SUPPLY = [120_000, 32_000, 8_000] as const;
const DEFAULT_MARKET_WAGES = [120, 260, 520] as const;
const DEFAULT_MONTHLY_GROWTH = [600, 120, 30] as const;

export const WAGE_MULTIPLIER_MIN = 0.5;
export const WAGE_MULTIPLIER_MAX = 2.0;

export function getRoleName(role: LaborRole): string {
  return ROLE_NAMES[role];
}

export function getBuildingLaborIndex(buildingId: number, role: LaborRole): number {
  return buildingId * LABOR_ROLE_COUNT + role;
}

export function clampWageMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1.0;
  return Math.max(WAGE_MULTIPLIER_MIN, Math.min(WAGE_MULTIPLIER_MAX, value));
}

export function getWorkforceDemandValue(demand: WorkforceDemand, role: LaborRole): number {
  if (role === LABOR_ROLE_BASIC) return demand.basic;
  if (role === LABOR_ROLE_TECHNICAL) return demand.technical;
  return demand.management;
}

export function setWorkforceDemandValue(
  demand: WorkforceDemand,
  role: LaborRole,
  value: number,
): void {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
  if (role === LABOR_ROLE_BASIC) demand.basic = safeValue;
  else if (role === LABOR_ROLE_TECHNICAL) demand.technical = safeValue;
  else demand.management = safeValue;
}

export function addWorkforceDemand(a: WorkforceDemand, b: WorkforceDemand): WorkforceDemand {
  return {
    basic: Math.max(0, a.basic + b.basic),
    technical: Math.max(0, a.technical + b.technical),
    management: Math.max(0, a.management + b.management),
  };
}

export function scaleWorkforceDemand(demand: WorkforceDemand, utilization: number): WorkforceDemand {
  const factor = Math.max(0, Number.isFinite(utilization) ? utilization : 0);
  if (factor <= 0) return { ...EMPTY_WORKFORCE_DEMAND };

  return {
    basic: Math.ceil(demand.basic * factor),
    technical: Math.ceil(demand.technical * factor),
    management: Math.ceil(demand.management * factor),
  };
}

export function createDefaultLaborSystem(): LaborSystemData {
  const totalSupply = new Float32Array(LABOR_ROLE_COUNT);
  const employed = new Float32Array(LABOR_ROLE_COUNT);
  const unemployed = new Float32Array(LABOR_ROLE_COUNT);
  const marketWages = new Float32Array(LABOR_ROLE_COUNT);
  const monthlyGrowth = new Float32Array(LABOR_ROLE_COUNT);

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    totalSupply[role] = DEFAULT_TOTAL_SUPPLY[role];
    unemployed[role] = DEFAULT_TOTAL_SUPPLY[role];
    marketWages[role] = DEFAULT_MARKET_WAGES[role];
    monthlyGrowth[role] = DEFAULT_MONTHLY_GROWTH[role];
  }

  return {
    totalSupply,
    employed,
    unemployed,
    marketWages,
    monthlyGrowth,
    demandOpenings: new Float32Array(LABOR_ROLE_COUNT),
    lastPayrollTick: 0,
  };
}

function ensureLaborArray(current: Float32Array | undefined, defaults: readonly number[]): Float32Array {
  const next = new Float32Array(LABOR_ROLE_COUNT);
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    next[role] = current?.[role] ?? defaults[role] ?? 0;
  }
  return next;
}

export function hydrateLaborState(world: GameWorld): void {
  const mutableWorld = world as GameWorld & { labor?: LaborSystemData };
  const existing = mutableWorld.labor;
  mutableWorld.labor = {
    totalSupply: ensureLaborArray(existing?.totalSupply, DEFAULT_TOTAL_SUPPLY),
    employed: ensureLaborArray(existing?.employed, [0, 0, 0]),
    unemployed: ensureLaborArray(existing?.unemployed, DEFAULT_TOTAL_SUPPLY),
    marketWages: ensureLaborArray(existing?.marketWages, DEFAULT_MARKET_WAGES),
    monthlyGrowth: ensureLaborArray(existing?.monthlyGrowth, DEFAULT_MONTHLY_GROWTH),
    demandOpenings: ensureLaborArray(existing?.demandOpenings, [0, 0, 0]),
    lastPayrollTick: existing?.lastPayrollTick ?? 0,
  };

  const laborSize = MAX_BUILDINGS * LABOR_ROLE_COUNT;
  const buildings = world.buildings as typeof world.buildings & {
    workforceHired?: Float32Array;
    wageMultipliers?: Float32Array;
    accruedPayroll?: Float64Array;
  };

  if (!buildings.workforceHired || buildings.workforceHired.length !== laborSize) {
    const next = new Float32Array(laborSize);
    if (buildings.workforceHired) {
      next.set(buildings.workforceHired.subarray(0, Math.min(buildings.workforceHired.length, laborSize)));
    }
    buildings.workforceHired = next;
  }

  if (!buildings.wageMultipliers || buildings.wageMultipliers.length !== laborSize) {
    const next = new Float32Array(laborSize);
    next.fill(1.0);
    if (buildings.wageMultipliers) {
      next.set(buildings.wageMultipliers.subarray(0, Math.min(buildings.wageMultipliers.length, laborSize)));
    }
    buildings.wageMultipliers = next;
  }

  if (!buildings.accruedPayroll || buildings.accruedPayroll.length !== MAX_BUILDINGS) {
    const next = new Float64Array(MAX_BUILDINGS);
    if (buildings.accruedPayroll) {
      next.set(buildings.accruedPayroll.subarray(0, Math.min(buildings.accruedPayroll.length, MAX_BUILDINGS)));
    }
    buildings.accruedPayroll = next;
  }

  for (let buildingId = 0; buildingId < world.buildings.maxCount; buildingId++) {
    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      const idx = getBuildingLaborIndex(buildingId, role as LaborRole);
      buildings.wageMultipliers[idx] = clampWageMultiplier(buildings.wageMultipliers[idx] || 1);
    }
  }
}
```

- [ ] **Step 6: Run the initialization test**

Run:

```bash
npm run test -- src/core/labor/__tests__/LaborSystem.test.ts --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/constants.ts src/core/world/GameWorld.ts src/core/labor/LaborSystem.ts src/core/labor/__tests__/LaborSystem.test.ts
git commit -m "feat: add labor system data model"
```

---

### Task 2: Move Production Methods From Labor Totals To Workforce Demand

**Files:**
- Modify: `src/core/production/methods/types.ts`
- Modify: `src/core/production/methods/registry.ts`
- Modify: `src/core/production/methods/defaultConfigs.ts`
- Modify: `src/core/production/ProductionMethods.ts`
- Modify: `src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`

- [ ] **Step 1: Write failing method workforce tests**

Append to `src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`:

```ts
import { BuildingId } from '@/data/buildings';
import {
  getDefaultSlotMethods,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '../ProductionMethods';

describe('production method workforce demand', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('returns role workforce demand instead of a single labor total', () => {
    const recipe = getRecipeForBuilding(
      BuildingId.IRON_MINE,
      getDefaultSlotMethods(BuildingId.IRON_MINE),
    );

    expect(recipe.workforceRequired.basic).toBeGreaterThan(0);
    expect(recipe.workforceRequired.technical).toBeGreaterThanOrEqual(0);
    expect(recipe.workforceRequired.management).toBeGreaterThanOrEqual(1);
    expect('laborRequired' in recipe).toBe(false);
  });

  it('gives high-tech buildings more technical labor share than farms', () => {
    const farmRecipe = getRecipeForBuilding(
      BuildingId.FARM,
      getDefaultSlotMethods(BuildingId.FARM),
    );
    const semiconductorRecipe = getRecipeForBuilding(
      BuildingId.SEMICONDUCTOR_FAB,
      getDefaultSlotMethods(BuildingId.SEMICONDUCTOR_FAB),
    );

    const farmTechnicalShare =
      farmRecipe.workforceRequired.technical /
      Math.max(1, farmRecipe.workforceRequired.basic + farmRecipe.workforceRequired.technical + farmRecipe.workforceRequired.management);
    const semiconductorTechnicalShare =
      semiconductorRecipe.workforceRequired.technical /
      Math.max(1, semiconductorRecipe.workforceRequired.basic + semiconductorRecipe.workforceRequired.technical + semiconductorRecipe.workforceRequired.management);

    expect(semiconductorTechnicalShare).toBeGreaterThan(farmTechnicalShare);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test -- src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts --run
```

Expected: FAIL because recipes still expose `laborRequired`.

- [ ] **Step 3: Update production method types**

Modify `src/core/production/methods/types.ts`.

Add import:

```ts
import type { WorkforceDemand } from '@/core/labor/LaborSystem';
```

Replace labor fields:

```ts
  workforceDelta: WorkforceDemand;
```

and:

```ts
  workforceRequired: WorkforceDemand;
```

Remove these runtime fields from the type definitions:

```ts
  laborDelta: number;
  laborRequired: number;
```

- [ ] **Step 4: Update registry computation**

Modify `src/core/production/methods/registry.ts`.

Add imports:

```ts
import {
  EMPTY_WORKFORCE_DEMAND,
  addWorkforceDemand,
  type WorkforceDemand,
} from '@/core/labor/LaborSystem';
```

Update `EMPTY_RECIPE`:

```ts
const EMPTY_RECIPE: ComputedRecipe = {
  inputs: [],
  outputs: [],
  workforceRequired: { ...EMPTY_WORKFORCE_DEMAND },
  energyRequired: 0,
  ticksRequired: TICKS_PER_DAY,
};
```

Inside `computeRecipe`, replace `let labor = 0;` with:

```ts
  let workforce: WorkforceDemand = { ...EMPTY_WORKFORCE_DEMAND };
```

Replace:

```ts
    labor += method.laborDelta;
```

with:

```ts
    workforce = addWorkforceDemand(workforce, method.workforceDelta);
```

Return:

```ts
    workforceRequired: workforce,
```

Update `CreateMethodOptions`:

```ts
  workforceDelta?: WorkforceDemand;
```

Update `createMethod`:

```ts
    workforceDelta: options.workforceDelta ?? { ...EMPTY_WORKFORCE_DEMAND },
```

- [ ] **Step 5: Update facade empty recipes**

Modify `src/core/production/ProductionMethods.ts`.

Add import:

```ts
import { EMPTY_WORKFORCE_DEMAND } from '@/core/labor/LaborSystem';
```

Update `EMPTY_RECIPE_BUILDER`:

```ts
const EMPTY_RECIPE_BUILDER = (): ComputedRecipe => ({
  inputs: [],
  outputs: [],
  workforceRequired: { ...EMPTY_WORKFORCE_DEMAND },
  energyRequired: 0,
  ticksRequired: 1,
});
```

- [ ] **Step 6: Convert default configs to method workforce data**

Modify `src/core/production/methods/defaultConfigs.ts`.

Add imports:

```ts
import { isRetailBuilding } from '@/data/buildings';
import type { WorkforceDemand } from '@/core/labor/LaborSystem';
```

Replace `laborRequired` in `BuildingProductionVariantDefinition`:

```ts
  workforceRequired: WorkforceDemand;
```

Add helper above `DEFAULT_BUILDING_PRODUCTION_BY_ID`:

```ts
function workforceFor(buildingTypeId: number, total: number): WorkforceDemand {
  if (isRetailBuilding(buildingTypeId)) {
    return {
      basic: Math.max(0, Math.round(total * 0.75)),
      technical: Math.max(0, Math.round(total * 0.05)),
      management: Math.max(1, Math.ceil(total * 0.20)),
    };
  }

  if ([28, 34, 35, 36].includes(buildingTypeId)) {
    return {
      basic: Math.max(0, Math.round(total * 0.45)),
      technical: Math.max(0, Math.round(total * 0.45)),
      management: Math.max(1, Math.ceil(total * 0.10)),
    };
  }

  if ([17, 18, 27, 29, 30, 31, 32, 39].includes(buildingTypeId)) {
    return {
      basic: Math.max(0, Math.round(total * 0.60)),
      technical: Math.max(0, Math.round(total * 0.30)),
      management: Math.max(1, Math.ceil(total * 0.10)),
    };
  }

  if ([38].includes(buildingTypeId)) {
    return {
      basic: Math.max(0, Math.round(total * 0.55)),
      technical: Math.max(0, Math.round(total * 0.25)),
      management: Math.max(1, Math.ceil(total * 0.20)),
    };
  }

  return {
    basic: Math.max(0, Math.round(total * 0.82)),
    technical: Math.max(0, Math.round(total * 0.10)),
    management: Math.max(1, Math.ceil(total * 0.08)),
  };
}
```

Run this codemod to replace existing numeric `laborRequired` entries with explicit method-level workforce entries:

```powershell
@'
const fs = require('fs');
const path = 'src/core/production/methods/defaultConfigs.ts';
let text = fs.readFileSync(path, 'utf8');
text = text.replace(/laborRequired: ([0-9]+),/g, 'workforceRequired: workforceFor(buildingTypeId, $1),');
text = text.replace(/laborDelta: variant\.laborRequired \?\? 0,/g, 'workforceDelta: variant.workforceRequired,');
fs.writeFileSync(path, text);
'@ | node
```

After the codemod, inspect the file and confirm entries look like:

```ts
      workforceRequired: workforceFor(buildingTypeId, 50),
```

and `createMethod` receives:

```ts
        workforceDelta: variant.workforceRequired,
```

- [ ] **Step 7: Remove lingering runtime labor references from production method files**

Run:

```bash
npm run test -- src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts --run
```

Expected: PASS.

Then run:

```powershell
Get-ChildItem -Recurse -File src\core\production,src\core\ai,src\core\economy |
  Select-String -Pattern 'laborRequired|laborDelta' -CaseSensitive:$false |
  Select-Object Path,LineNumber,Line
```

Expected: references remain only in tests or AI/economy cost-estimation code that will be migrated in later tasks.

- [ ] **Step 8: Commit**

```bash
git add src/core/production/methods/types.ts src/core/production/methods/registry.ts src/core/production/methods/defaultConfigs.ts src/core/production/ProductionMethods.ts src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts
git commit -m "feat: define workforce demand on production methods"
```

---

### Task 3: Implement Hiring, Attrition, Wage Market, And Payroll

**Files:**
- Modify: `src/core/labor/LaborSystem.ts`
- Modify: `src/core/labor/__tests__/LaborSystem.test.ts`

- [ ] **Step 1: Add failing labor lifecycle tests**

Append to `src/core/labor/__tests__/LaborSystem.test.ts`:

```ts
import {
  accrueDailyPayrollForBuilding,
  hireForBuildingRole,
  payMonthlyPayroll,
  processRoleAttrition,
  updateMarketWages,
} from '../LaborSystem';

describe('labor hiring, attrition, market wages, and payroll', () => {
  it('hires only up to the building gap and unemployed pool', () => {
    const world = createGameWorld();
    world.buildings.count = 1;
    world.labor.unemployed[LABOR_ROLE_BASIC] = 3;

    const hired = hireForBuildingRole(world, 0, LABOR_ROLE_BASIC, 10, 1.0);

    expect(hired).toBe(2);
    expect(world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(2);
    expect(world.labor.unemployed[LABOR_ROLE_BASIC]).toBe(1);
    expect(world.labor.employed[LABOR_ROLE_BASIC]).toBe(2);
  });

  it('returns low-paid workers to unemployment through attrition', () => {
    const world = createGameWorld();
    const idx = getBuildingLaborIndex(0, LABOR_ROLE_BASIC);
    world.buildings.workforceHired[idx] = 100;
    world.labor.employed[LABOR_ROLE_BASIC] = 100;
    world.labor.unemployed[LABOR_ROLE_BASIC] = 0;

    const quit = processRoleAttrition(world, 0, LABOR_ROLE_BASIC, 0.5);

    expect(quit).toBeGreaterThan(0);
    expect(world.buildings.workforceHired[idx]).toBe(100 - quit);
    expect(world.labor.unemployed[LABOR_ROLE_BASIC]).toBe(quit);
  });

  it('does not attrit workers at or above market wage', () => {
    const world = createGameWorld();
    const idx = getBuildingLaborIndex(0, LABOR_ROLE_BASIC);
    world.buildings.workforceHired[idx] = 100;

    expect(processRoleAttrition(world, 0, LABOR_ROLE_BASIC, 1.0)).toBe(0);
    expect(processRoleAttrition(world, 0, LABOR_ROLE_BASIC, 1.3)).toBe(0);
  });

  it('updates market wages with a one percent daily cap', () => {
    const world = createGameWorld();
    world.labor.demandOpenings[LABOR_ROLE_TECHNICAL] = 20_000;
    world.labor.unemployed[LABOR_ROLE_TECHNICAL] = 0;
    const before = world.labor.marketWages[LABOR_ROLE_TECHNICAL];

    updateMarketWages(world);

    expect(world.labor.marketWages[LABOR_ROLE_TECHNICAL]).toBeCloseTo(before * 1.01);
  });

  it('accrues daily payroll and pays monthly into households', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 100_000;
    world.buildings.count = 1;
    world.buildings.owners[0] = 0;
    world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)] = 10;

    const accrued = accrueDailyPayrollForBuilding(world, 0);
    expect(accrued).toBe(10 * 120);
    expect(world.buildings.accruedPayroll[0]).toBe(accrued);

    const paid = payMonthlyPayroll(world);
    expect(paid[0]).toBe(accrued);
    expect(world.companies.cash[0]).toBe(100_000 - accrued);
    expect(world.households.cash[0]).toBe(accrued);
    expect(world.households.totalWagesReceived).toBe(accrued);
    expect(world.buildings.accruedPayroll[0]).toBe(0);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test -- src/core/labor/__tests__/LaborSystem.test.ts --run
```

Expected: FAIL because lifecycle functions are missing.

- [ ] **Step 3: Add hiring, attrition, wage, and payroll functions**

Append these exports to `src/core/labor/LaborSystem.ts`:

```ts
const BASE_HIRE_RATES = [0.12, 0.07, 0.04] as const;
const BASE_QUIT_RATES = [0.025, 0.018, 0.012] as const;

function getBuildingRoleHired(world: GameWorld, buildingId: number, role: LaborRole): number {
  return world.buildings.workforceHired[getBuildingLaborIndex(buildingId, role)] || 0;
}

export function hireForBuildingRole(
  world: GameWorld,
  buildingId: number,
  role: LaborRole,
  target: number,
  wageMultiplier: number,
): number {
  hydrateLaborState(world);
  const idx = getBuildingLaborIndex(buildingId, role);
  const hired = getBuildingRoleHired(world, buildingId, role);
  const gap = Math.max(0, target - hired);
  if (gap <= 0) return 0;

  const rate = BASE_HIRE_RATES[role] * clampWageMultiplier(wageMultiplier);
  const desiredHire = Math.ceil(gap * rate);
  const actualHire = Math.min(gap, world.labor.unemployed[role], desiredHire);

  world.buildings.workforceHired[idx] += actualHire;
  world.labor.unemployed[role] -= actualHire;
  world.labor.employed[role] += actualHire;

  return actualHire;
}

export function processRoleAttrition(
  world: GameWorld,
  buildingId: number,
  role: LaborRole,
  wageMultiplier: number,
): number {
  hydrateLaborState(world);
  const multiplier = clampWageMultiplier(wageMultiplier);
  if (multiplier >= 1) return 0;

  const idx = getBuildingLaborIndex(buildingId, role);
  const hired = world.buildings.workforceHired[idx] || 0;
  if (hired <= 0) return 0;

  const quitRate = BASE_QUIT_RATES[role] * (1 - multiplier);
  const quit = Math.min(hired, Math.floor(hired * quitRate));
  if (quit <= 0) return 0;

  world.buildings.workforceHired[idx] -= quit;
  world.labor.employed[role] = Math.max(0, world.labor.employed[role] - quit);
  world.labor.unemployed[role] += quit;
  return quit;
}

export function updateMarketWages(world: GameWorld): void {
  hydrateLaborState(world);

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const totalSupply = Math.max(1, world.labor.totalSupply[role]);
    const targetPressure = world.labor.demandOpenings[role] / totalSupply;
    const unemploymentRate = world.labor.unemployed[role] / totalSupply;
    const wageDelta = targetPressure * 0.015 - unemploymentRate * 0.008;
    const dailyChange = Math.max(-0.01, Math.min(0.01, wageDelta));
    world.labor.marketWages[role] = Math.max(1, world.labor.marketWages[role] * (1 + dailyChange));
  }
}

export function addMonthlyLaborGrowth(world: GameWorld): void {
  hydrateLaborState(world);

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const growth = world.labor.monthlyGrowth[role] || 0;
    world.labor.totalSupply[role] += growth;
    world.labor.unemployed[role] += growth;
  }
}

export function getActualDailyWage(world: GameWorld, buildingId: number, role: LaborRole): number {
  hydrateLaborState(world);
  const multiplier = world.buildings.wageMultipliers[getBuildingLaborIndex(buildingId, role)] || 1;
  return world.labor.marketWages[role] * clampWageMultiplier(multiplier);
}

export function accrueDailyPayrollForBuilding(world: GameWorld, buildingId: number): number {
  hydrateLaborState(world);
  let total = 0;

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const typedRole = role as LaborRole;
    const hired = getBuildingRoleHired(world, buildingId, typedRole);
    total += hired * getActualDailyWage(world, buildingId, typedRole);
  }

  world.buildings.accruedPayroll[buildingId] += total;
  return total;
}

export function accrueDailyPayroll(world: GameWorld): number {
  hydrateLaborState(world);
  let total = 0;

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    if (!world.buildings.isActive[buildingId]) continue;
    total += accrueDailyPayrollForBuilding(world, buildingId);
  }

  return total;
}

export function payMonthlyPayroll(world: GameWorld): number[] {
  hydrateLaborState(world);
  const paidByCompany = new Array(world.companies.count).fill(0);

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    const accrued = world.buildings.accruedPayroll[buildingId] || 0;
    if (accrued <= 0) continue;

    const owner = world.buildings.owners[buildingId];
    if (owner >= 0 && owner < world.companies.count) {
      world.companies.cash[owner] -= accrued;
      paidByCompany[owner] += accrued;
      world.households.cash[0] += accrued;
      world.households.totalWagesReceived += accrued;
    }

    world.buildings.accruedPayroll[buildingId] = 0;
  }

  world.labor.lastPayrollTick = world.tick;
  return paidByCompany;
}
```

- [ ] **Step 4: Run labor lifecycle tests**

Run:

```bash
npm run test -- src/core/labor/__tests__/LaborSystem.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/labor/LaborSystem.ts src/core/labor/__tests__/LaborSystem.test.ts
git commit -m "feat: add labor hiring and payroll lifecycle"
```

---

### Task 4: Apply Workforce Coverage In Production

**Files:**
- Modify: `src/core/labor/LaborSystem.ts`
- Modify: `src/core/production/ProductionEngine.ts`
- Modify: `src/core/production/__tests__/ProductionEngine.dayModel.test.ts`

- [ ] **Step 1: Add failing production shortage tests**

Append to `src/core/production/__tests__/ProductionEngine.dayModel.test.ts`:

```ts
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';
import { LABOR_ROLE_BASIC, LABOR_ROLE_MANAGEMENT, LABOR_ROLE_TECHNICAL, getBuildingLaborIndex } from '@/core/labor/LaborSystem';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { initializeBuildingProductionMethods } from '../ProductionMethods';
import { updateAllProduction } from '../ProductionEngine';

describe('ProductionEngine workforce coverage', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('reduces output by the lowest role coverage', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    const buildingId = addBuilding(world, 0, BuildingId.IRON_MINE);

    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)] = 999;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_TECHNICAL)] = 999;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_MANAGEMENT)] = 0;

    const result = updateAllProduction(world);

    expect(result.producedCount).toBe(0);
    expect(world.companies.inventories[GoodsId.IRON_ORE]).toBe(0);
    expect(result.laborShortage).toBe(1);
  });

  it('lets active utilization reduce workforce demand before shortage coverage', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    const buildingId = addBuilding(world, 0, BuildingId.IRON_MINE);
    world.buildings.efficiencies[buildingId] = 0.5;

    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)] = 25;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_TECHNICAL)] = 4;
    world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_MANAGEMENT)] = 2;

    const result = updateAllProduction(world);

    expect(result.producedCount).toBe(1);
    expect(world.companies.inventories[GoodsId.IRON_ORE]).toBeGreaterThan(0);
    expect(result.laborShortage).toBe(0);
  });
});
```

- [ ] **Step 2: Run failing production test**

Run:

```bash
npm run test -- src/core/production/__tests__/ProductionEngine.dayModel.test.ts --run
```

Expected: FAIL because production still uses company-level labor totals.

- [ ] **Step 3: Add coverage helpers**

Append to `src/core/labor/LaborSystem.ts`:

```ts
export interface WorkforceCoverageResult {
  coverage: number;
  activeDemand: WorkforceDemand;
  roleCoverage: WorkforceDemand;
  bottleneckRole: LaborRole | null;
}

export function calculateWorkforceCoverage(
  world: GameWorld,
  buildingId: number,
  fullDemand: WorkforceDemand,
  utilization: number,
): WorkforceCoverageResult {
  hydrateLaborState(world);
  const activeDemand = scaleWorkforceDemand(fullDemand, utilization);
  let coverage = 1;
  let bottleneckRole: LaborRole | null = null;
  const roleCoverage: WorkforceDemand = { basic: 1, technical: 1, management: 1 };

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const typedRole = role as LaborRole;
    const demand = getWorkforceDemandValue(activeDemand, typedRole);
    const hired = world.buildings.workforceHired[getBuildingLaborIndex(buildingId, typedRole)] || 0;
    const currentCoverage = demand <= 0 ? 1 : Math.min(1, hired / demand);
    setWorkforceDemandValue(roleCoverage, typedRole, currentCoverage);

    if (currentCoverage < coverage) {
      coverage = currentCoverage;
      bottleneckRole = typedRole;
    }
  }

  return { coverage, activeDemand, roleCoverage, bottleneckRole };
}
```

- [ ] **Step 4: Replace company-level labor in production**

Modify `src/core/production/ProductionEngine.ts`.

Remove `CompanyResources`, `companyResources`, `calculateCompanyResources`, and `getCompanyResourceUsage` usage.

Add import:

```ts
import { calculateWorkforceCoverage } from '@/core/labor/LaborSystem';
```

Change `processBuildingProduction` signature:

```ts
function processBuildingProduction(
  world: GameWorld,
  buildingId: number,
): { produced: boolean; laborCoverage: number; qualityBonus: number } {
```

Replace labor check block with:

```ts
  const workforceCoverage = calculateWorkforceCoverage(
    world,
    buildingId,
    recipe.workforceRequired,
    efficiency,
  );
  let actualOutput = tickOutput * workforceCoverage.coverage;

  if (workforceCoverage.coverage <= 0) {
    return {
      produced: false,
      laborCoverage: 0,
      qualityBonus: 0,
    };
  }
```

Update returned result:

```ts
  result.laborCoverage = workforceCoverage.coverage;
```

Update `ProductionResult`:

```ts
  laborShortage: number;
  totalLaborCoverage: number;
```

Update `updateAllProduction` loop:

```ts
    const prodResult = processBuildingProduction(world, i);
    if (prodResult.produced) {
      result.producedCount++;
      result.totalLaborCoverage += prodResult.laborCoverage;
      result.totalQualityBonus += prodResult.qualityBonus;
      if (prodResult.laborCoverage < 1) {
        result.laborShortage++;
      }
    } else if (b.isActive[i]) {
      result.blockedCount++;
      const recipe = getBuildingRecipe(world, i);
      const workforceCoverage = calculateWorkforceCoverage(world, i, recipe.workforceRequired, b.efficiencies[i]);
      if (workforceCoverage.coverage < 1) {
        result.laborShortage++;
      }
    }
```

Keep the existing input buffer checks after labor coverage so a building with labor but missing inputs remains blocked for input reasons.

- [ ] **Step 5: Update public resource usage function**

Replace `getCompanyResourceUsage` export in `ProductionEngine.ts` with:

```ts
export function getBuildingWorkforceCoverage(world: GameWorld, buildingId: number) {
  const recipe = getBuildingRecipe(world, buildingId);
  const efficiency = world.buildings.efficiencies[buildingId] || 0;
  return calculateWorkforceCoverage(world, buildingId, recipe.workforceRequired, efficiency);
}
```

- [ ] **Step 6: Run production tests**

Run:

```bash
npm run test -- src/core/production/__tests__/ProductionEngine.dayModel.test.ts src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/labor/LaborSystem.ts src/core/production/ProductionEngine.ts src/core/production/__tests__/ProductionEngine.dayModel.test.ts
git commit -m "feat: apply workforce coverage to production"
```

---

### Task 5: Remove Old Labor Cost From Operating Costs And Wire Payroll Into GameLoop

**Files:**
- Modify: `src/core/finance/OperatingCosts.ts`
- Modify: `src/core/finance/OperatingCostModel.ts`
- Modify: `src/core/finance/__tests__/OperatingCosts.test.ts`
- Modify: `src/core/loop/GameLoop.ts`

- [ ] **Step 1: Update failing operating cost tests**

Modify `src/core/finance/__tests__/OperatingCosts.test.ts`.

Change test name:

```ts
it('calculates per-tick maintenance and energy from building base costs + recipe energy delta, excluding payroll', () => {
```

Replace labor expectation:

```ts
    expect(breakdown.labor).toBeCloseTo(0);
```

In the recurring cost test, replace household wage expectations:

```ts
    expect(world.households.cash[0]).toBeCloseTo(0);
    expect(world.households.totalWagesReceived).toBeCloseTo(0);
```

Add a new test:

```ts
it('does not deduct old building laborCost as operating cost', () => {
  const world = createGameWorld();
  world.companies.count = 1;
  world.companies.cash[0] = 1_000_000;
  addOwnedBuilding(world, 0, BuildingId.IRON_MINE);

  const ironMine = BUILDINGS_BY_ID.get(BuildingId.IRON_MINE)!;
  const breakdown = applyOperatingCosts(world)[0];

  expect(breakdown.labor).toBe(0);
  expect(breakdown.total).toBeLessThan(
    (ironMine.maintenanceCost + ironMine.laborCost + ironMine.energyCost) / TICKS_PER_DAY,
  );
});
```

- [ ] **Step 2: Run failing finance test**

Run:

```bash
npm run test -- src/core/finance/__tests__/OperatingCosts.test.ts --run
```

Expected: FAIL because labor cost is still included.

- [ ] **Step 3: Remove old labor cost from finance calculation**

Modify `src/core/finance/OperatingCosts.ts`.

In `calculateCompanyOperatingCostPerTick`, replace:

```ts
    labor += buildingDef.laborCost / ticksPerDay;
```

with:

```ts
    labor += 0;
```

In `applyOperatingCosts`, remove the wage-to-households block:

```ts
    const wagesToHouseholds = breakdown.labor;
    if (wagesToHouseholds > 0) {
      world.households.cash[0] += wagesToHouseholds;
      world.households.totalWagesReceived += wagesToHouseholds;
    }
```

- [ ] **Step 4: Remove old labor from UI definition cost helper**

Modify `src/core/finance/OperatingCostModel.ts`:

```ts
  const labor = 0;
```

Keep `OperatingCostBreakdown.labor` for display compatibility, but it now means payroll is handled outside definition-level operating costs.

- [ ] **Step 5: Wire labor lifecycle into GameLoop**

Modify `src/core/loop/GameLoop.ts`.

Add import:

```ts
import {
  accrueDailyPayroll,
  addMonthlyLaborGrowth,
  payMonthlyPayroll,
  updateMarketWages,
} from '../labor/LaborSystem';
```

Before production, after `autoFeedBuildings(this.world);`, add:

```ts
    updateMarketWages(this.world);
```

In the finance stage, immediately before `applyOperatingCosts(this.world);`, add:

```ts
    accrueDailyPayroll(this.world);
    if (currentTick % TICKS_PER_MONTH === 0) {
      payMonthlyPayroll(this.world);
      addMonthlyLaborGrowth(this.world);
    }
```

- [ ] **Step 6: Run finance and game loop tests**

Run:

```bash
npm run test -- src/core/finance/__tests__/OperatingCosts.test.ts src/core/loop/__tests__/GameLoop.dayModel.test.ts --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/finance/OperatingCosts.ts src/core/finance/OperatingCostModel.ts src/core/finance/__tests__/OperatingCosts.test.ts src/core/loop/GameLoop.ts
git commit -m "feat: replace fixed labor cost with payroll flow"
```

---

### Task 6: Add Daily Building Hiring And AI Wage Adjustment

**Files:**
- Modify: `src/core/labor/LaborSystem.ts`
- Create: `src/core/labor/__tests__/LaborSystem.ai.test.ts`
- Modify: `src/core/loop/GameLoop.ts`

- [ ] **Step 1: Add failing hiring orchestration and AI tests**

Create `src/core/labor/__tests__/LaborSystem.ai.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';

import { BuildingId } from '@/data/buildings';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import {
  LABOR_ROLE_BASIC,
  getBuildingLaborIndex,
  processBuildingLaborMarket,
  adjustAIWageMultipliers,
} from '../LaborSystem';

describe('LaborSystem AI and building market orchestration', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('hires workers for active buildings according to current recipe demand', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    const buildingId = addBuilding(world, 0, BuildingId.IRON_MINE);

    processBuildingLaborMarket(world);

    expect(world.buildings.workforceHired[getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC)]).toBeGreaterThan(0);
    expect(world.labor.demandOpenings[LABOR_ROLE_BASIC]).toBeGreaterThan(0);
  });

  it('raises AI wage multiplier when a role is short-staffed', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.isAI = [false, true];
    world.companies.cash[1] = 10_000_000;
    const buildingId = addBuilding(world, 1, BuildingId.SEMICONDUCTOR_FAB);
    const idx = getBuildingLaborIndex(buildingId, LABOR_ROLE_BASIC);
    world.buildings.wageMultipliers[idx] = 1.0;

    adjustAIWageMultipliers(world);

    expect(world.buildings.wageMultipliers[idx]).toBeGreaterThan(1.0);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/core/labor/__tests__/LaborSystem.ai.test.ts --run
```

Expected: FAIL because orchestration functions are missing.

- [ ] **Step 3: Implement daily building labor orchestration**

Append to `src/core/labor/LaborSystem.ts`:

```ts
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import { getCompanyPersonality } from '@/core/ai/AIPersonality';

export function processBuildingLaborMarket(world: GameWorld): void {
  hydrateLaborState(world);
  world.labor.demandOpenings.fill(0);

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    if (!world.buildings.isActive[buildingId]) continue;

    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const utilization = world.buildings.efficiencies[buildingId] || 0;
    const activeDemand = scaleWorkforceDemand(recipe.workforceRequired, utilization);

    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      const typedRole = role as LaborRole;
      const target = getWorkforceDemandValue(activeDemand, typedRole);
      const idx = getBuildingLaborIndex(buildingId, typedRole);
      const multiplier = clampWageMultiplier(world.buildings.wageMultipliers[idx] || 1);
      const hired = world.buildings.workforceHired[idx] || 0;
      world.labor.demandOpenings[role] += Math.max(0, target - hired);
      processRoleAttrition(world, buildingId, typedRole, multiplier);
      hireForBuildingRole(world, buildingId, typedRole, target, multiplier);
    }
  }
}

function getAIWageAdjustmentRate(world: GameWorld, companyId: number): { up: number; down: number; max: number } {
  const personality = getCompanyPersonality(world, companyId);
  if (!personality) return { up: 0.02, down: 0.01, max: 1.5 };

  if (personality.type === 'aggressive' || personality.type === 'pioneer') {
    return { up: 0.04, down: 0.008, max: 1.8 };
  }
  if (personality.type === 'conservative' || personality.type === 'cost_leader') {
    return { up: 0.015, down: 0.02, max: 1.35 };
  }
  return { up: 0.025, down: 0.012, max: 1.55 };
}

export function adjustAIWageMultipliers(world: GameWorld): void {
  hydrateLaborState(world);

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    const owner = world.buildings.owners[buildingId];
    if (!world.companies.isAI[owner]) continue;
    if (!world.buildings.isActive[buildingId]) continue;

    const recipe = getBuildingRecipeFromInstance(world, buildingId);
    const activeDemand = scaleWorkforceDemand(recipe.workforceRequired, world.buildings.efficiencies[buildingId] || 0);
    const config = getAIWageAdjustmentRate(world, owner);
    const cash = world.companies.cash[owner] || 0;
    const cashPressure = cash < 0;

    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      const typedRole = role as LaborRole;
      const idx = getBuildingLaborIndex(buildingId, typedRole);
      const target = getWorkforceDemandValue(activeDemand, typedRole);
      const hired = world.buildings.workforceHired[idx] || 0;
      const current = clampWageMultiplier(world.buildings.wageMultipliers[idx] || 1);

      if (target > 0 && hired / target < 0.9) {
        world.buildings.wageMultipliers[idx] = Math.min(config.max, current + config.up);
      } else if (cashPressure || (target > 0 && hired >= target)) {
        world.buildings.wageMultipliers[idx] = Math.max(0.8, current - config.down);
      }
    }
  }
}
```

- [ ] **Step 4: Wire orchestration before production**

Modify `src/core/loop/GameLoop.ts` import:

```ts
  adjustAIWageMultipliers,
  processBuildingLaborMarket,
```

After `updateMarketWages(this.world);`, add:

```ts
    adjustAIWageMultipliers(this.world);
    processBuildingLaborMarket(this.world);
```

- [ ] **Step 5: Run labor AI tests**

Run:

```bash
npm run test -- src/core/labor/__tests__/LaborSystem.ai.test.ts src/core/labor/__tests__/LaborSystem.test.ts --run
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/labor/LaborSystem.ts src/core/labor/__tests__/LaborSystem.ai.test.ts src/core/loop/GameLoop.ts
git commit -m "feat: run building labor market and ai wages"
```

---

### Task 7: Serialize And Migrate Labor State

**Files:**
- Modify: `src/core/save/SaveManager.ts`
- Modify: `src/core/save/__tests__/SaveManager.storageFallback.test.ts`

- [ ] **Step 1: Add failing save tests**

Append to `src/core/save/__tests__/SaveManager.storageFallback.test.ts`:

```ts
import { createGameWorld } from '@/core/world/GameWorld';
import { LABOR_ROLE_BASIC, getBuildingLaborIndex } from '@/core/labor/LaborSystem';
import { SaveManager, SerializedWorld } from '../SaveManager';

describe('SaveManager labor serialization', () => {
  it('serializes labor market and building labor arrays', () => {
    const world = createGameWorld();
    world.buildings.count = 1;
    world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)] = 12;
    world.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)] = 1.25;
    world.buildings.accruedPayroll[0] = 1440;

    const serialized = new SaveManager().serializeWorld(world, 5);

    expect(serialized.labor?.marketWages[LABOR_ROLE_BASIC]).toBe(120);
    expect(serialized.buildings.workforceHired?.[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(12);
    expect(serialized.buildings.wageMultipliers?.[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(1.25);
    expect(serialized.buildings.accruedPayroll?.[0]).toBe(1440);
  });

  it('hydrates missing labor fields from old saves', () => {
    const source = createGameWorld();
    source.buildings.count = 1;
    source.buildings.isActive[0] = 1;
    const serialized = new SaveManager().serializeWorld(source, 5) as SerializedWorld;
    delete serialized.labor;
    delete serialized.buildings.workforceHired;
    delete serialized.buildings.wageMultipliers;
    delete serialized.buildings.accruedPayroll;

    const target = createGameWorld();
    new SaveManager().deserializeWorld(serialized, target);

    expect(target.labor.totalSupply[LABOR_ROLE_BASIC]).toBeGreaterThan(0);
    expect(target.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(1);
  });
});
```

- [ ] **Step 2: Run failing save tests**

Run:

```bash
npm run test -- src/core/save/__tests__/SaveManager.storageFallback.test.ts --run
```

Expected: FAIL because serialized labor fields do not exist.

- [ ] **Step 3: Extend serialized world type**

Modify `src/core/save/SaveManager.ts`.

Add import:

```ts
  LABOR_ROLE_COUNT,
```

and:

```ts
import { hydrateLaborState } from '@/core/labor/LaborSystem';
```

Add `labor` to `SerializedWorld`:

```ts
  labor?: {
    totalSupply: number[];
    employed: number[];
    unemployed: number[];
    marketWages: number[];
    monthlyGrowth: number[];
    demandOpenings: number[];
    lastPayrollTick: number;
  };
```

Add building fields:

```ts
    workforceHired?: number[];
    wageMultipliers?: number[];
    accruedPayroll?: number[];
```

- [ ] **Step 4: Serialize labor**

In `serializeWorld`, add:

```ts
      labor: {
        totalSupply: Array.from(world.labor.totalSupply),
        employed: Array.from(world.labor.employed),
        unemployed: Array.from(world.labor.unemployed),
        marketWages: Array.from(world.labor.marketWages),
        monthlyGrowth: Array.from(world.labor.monthlyGrowth),
        demandOpenings: Array.from(world.labor.demandOpenings),
        lastPayrollTick: world.labor.lastPayrollTick,
      },
```

Inside `buildings`, add:

```ts
        workforceHired: this.serializeBuildingLaborSlots(world, world.buildings.workforceHired),
        wageMultipliers: this.serializeBuildingLaborSlots(world, world.buildings.wageMultipliers),
        accruedPayroll: Array.from(world.buildings.accruedPayroll.slice(0, world.buildings.count)),
```

Add helper:

```ts
  private serializeBuildingLaborSlots(world: GameWorld, source: Float32Array): number[] {
    const length = world.buildings.count * LABOR_ROLE_COUNT;
    const arr: number[] = new Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = source[i] ?? 0;
    }
    return arr;
  }
```

- [ ] **Step 5: Hydrate labor**

In `deserializeWorld`, after building arrays are initialized and before production control hydration:

```ts
    hydrateLaborState(world);
    if (data.labor) {
      world.labor.totalSupply.set(data.labor.totalSupply);
      world.labor.employed.set(data.labor.employed);
      world.labor.unemployed.set(data.labor.unemployed);
      world.labor.marketWages.set(data.labor.marketWages);
      world.labor.monthlyGrowth.set(data.labor.monthlyGrowth);
      world.labor.demandOpenings.set(data.labor.demandOpenings);
      world.labor.lastPayrollTick = data.labor.lastPayrollTick ?? 0;
    }
    if (data.buildings.workforceHired) {
      world.buildings.workforceHired.set(data.buildings.workforceHired);
    }
    if (data.buildings.wageMultipliers) {
      world.buildings.wageMultipliers.set(data.buildings.wageMultipliers);
    }
    if (data.buildings.accruedPayroll) {
      world.buildings.accruedPayroll.set(data.buildings.accruedPayroll);
    }
    hydrateLaborState(world);
```

- [ ] **Step 6: Add 60% active-building migration for old saves**

Extend the `src/core/save/SaveManager.ts` imports:

```ts
import {
  LABOR_ROLE_BASIC,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  getBuildingLaborIndex,
  getWorkforceDemandValue,
  hydrateLaborState,
  scaleWorkforceDemand,
  type LaborRole,
} from '@/core/labor/LaborSystem';
import {
  getBuildingSlotCount,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
```

Add a private helper to `SaveManager`:

```ts
  private backfillLegacyLaborCoverage(world: GameWorld, hadSerializedLabor: boolean): void {
    if (hadSerializedLabor) return;

    initializeBuildingProductionMethods();
    const roles: LaborRole[] = [
      LABOR_ROLE_BASIC,
      LABOR_ROLE_TECHNICAL,
      LABOR_ROLE_MANAGEMENT,
    ];

    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (!world.buildings.isActive[buildingId]) continue;

      const buildingTypeId = world.buildings.types[buildingId];
      const slotCount = getBuildingSlotCount(buildingTypeId);
      const slotOffset = buildingId * MAX_SLOTS;
      const slotMethods: number[] = [];
      for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
        slotMethods.push(world.buildings.slotMethods[slotOffset + slotIndex] ?? 0);
      }

      const recipe = getRecipeForBuilding(buildingTypeId, slotMethods);
      const utilization = world.buildings.efficiencies[buildingId] || 1;
      const activeDemand = scaleWorkforceDemand(recipe.workforceRequired, utilization);

      for (const role of roles) {
        const idx = getBuildingLaborIndex(buildingId, role);
        if (world.buildings.workforceHired[idx] > 0) continue;

        const desired = Math.ceil(getWorkforceDemandValue(activeDemand, role) * 0.6);
        const hired = Math.min(desired, world.labor.unemployed[role]);
        world.buildings.workforceHired[idx] = hired;
        world.labor.unemployed[role] -= hired;
        world.labor.employed[role] += hired;
      }
    }
  }
```

Call it at the end of `deserializeWorld`, after the second `hydrateLaborState(world);`:

```ts
    this.backfillLegacyLaborCoverage(world, Boolean(data.labor));
```

- [ ] **Step 6: Run save tests**

Run:

```bash
npm run test -- src/core/save/__tests__/SaveManager.storageFallback.test.ts --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/save/SaveManager.ts src/core/save/__tests__/SaveManager.storageFallback.test.ts
git commit -m "feat: persist labor market state"
```

---

### Task 8: Add Store API And Building Detail Labor UI

**Files:**
- Modify: `src/stores/gameStore.ts`
- Modify: `src/ui/components/Production/BuildingDetailPanel.tsx`
- Modify: `src/stores/__tests__/gameStore.loadGame.test.ts`

- [ ] **Step 1: Add store view types and failing store test**

Append a focused test to `src/stores/__tests__/gameStore.loadGame.test.ts`:

```ts
it('updates a building labor wage multiplier through the store', () => {
  const store = useGameStore.getState();
  store.initGame();
  const world = store.getWorld()!;
  const buildingId = 0;

  const updated = store.setBuildingLaborWageMultiplier(buildingId, 'basic', 1.35);
  const laborView = store.getBuildingLaborView(buildingId)!;

  expect(updated).toBe(true);
  expect(laborView.roles.basic.wageMultiplier).toBe(1.35);
  expect(world.buildings.wageMultipliers[buildingId * 3]).toBe(1.35);
});
```

- [ ] **Step 2: Run failing store test**

Run:

```bash
npm run test -- src/stores/__tests__/gameStore.loadGame.test.ts --run
```

Expected: FAIL because store actions are missing.

- [ ] **Step 3: Add store interfaces**

Modify `src/stores/gameStore.ts`.

Add imports:

```ts
import {
  LABOR_ROLE_BASIC,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  WAGE_MULTIPLIER_MAX,
  WAGE_MULTIPLIER_MIN,
  calculateWorkforceCoverage,
  clampWageMultiplier,
  getActualDailyWage,
  getBuildingLaborIndex,
  getRoleName,
  type LaborRole,
} from '@/core/labor/LaborSystem';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
```

Add types:

```ts
export type LaborRoleKey = 'basic' | 'technical' | 'management';

export interface BuildingLaborRoleView {
  role: LaborRoleKey;
  name: string;
  fullDemand: number;
  activeDemand: number;
  hired: number;
  shortage: number;
  coverage: number;
  marketWage: number;
  wageMultiplier: number;
  actualDailyWage: number;
}

export interface BuildingLaborView {
  buildingId: number;
  coverage: number;
  bottleneckRole: LaborRoleKey | null;
  estimatedMonthlyPayroll: number;
  accruedPayroll: number;
  roles: Record<LaborRoleKey, BuildingLaborRoleView>;
}
```

Add actions:

```ts
  getBuildingLaborView: (buildingId: number) => BuildingLaborView | null;
  setBuildingLaborWageMultiplier: (buildingId: number, role: LaborRoleKey, multiplier: number) => boolean;
```

- [ ] **Step 4: Implement store helpers**

Add helper functions near other store helper functions:

```ts
const ROLE_KEY_TO_INDEX: Record<LaborRoleKey, LaborRole> = {
  basic: LABOR_ROLE_BASIC,
  technical: LABOR_ROLE_TECHNICAL,
  management: LABOR_ROLE_MANAGEMENT,
};

const ROLE_INDEX_TO_KEY: Record<number, LaborRoleKey> = {
  [LABOR_ROLE_BASIC]: 'basic',
  [LABOR_ROLE_TECHNICAL]: 'technical',
  [LABOR_ROLE_MANAGEMENT]: 'management',
};
```

Implement actions in the store object:

```ts
    getBuildingLaborView: (buildingId) => {
      if (!worldRef || buildingId < 0 || buildingId >= worldRef.buildings.count) return null;

      const recipe = getBuildingRecipeFromInstance(worldRef, buildingId);
      const utilization = worldRef.buildings.efficiencies[buildingId] || 0;
      const coverage = calculateWorkforceCoverage(worldRef, buildingId, recipe.workforceRequired, utilization);
      const roleEntries = (['basic', 'technical', 'management'] as LaborRoleKey[]).map((roleKey) => {
        const role = ROLE_KEY_TO_INDEX[roleKey];
        const idx = getBuildingLaborIndex(buildingId, role);
        const fullDemand = recipe.workforceRequired[roleKey];
        const activeDemand = coverage.activeDemand[roleKey];
        const hired = worldRef!.buildings.workforceHired[idx] || 0;
        const actualDailyWage = getActualDailyWage(worldRef!, buildingId, role);

        return [
          roleKey,
          {
            role: roleKey,
            name: getRoleName(role),
            fullDemand,
            activeDemand,
            hired,
            shortage: Math.max(0, activeDemand - hired),
            coverage: coverage.roleCoverage[roleKey],
            marketWage: worldRef!.labor.marketWages[role],
            wageMultiplier: worldRef!.buildings.wageMultipliers[idx] || 1,
            actualDailyWage,
          },
        ] as const;
      });

      const roles = Object.fromEntries(roleEntries) as BuildingLaborView['roles'];
      const estimatedMonthlyPayroll = Object.values(roles)
        .reduce((sum, role) => sum + role.hired * role.actualDailyWage * TICKS_PER_MONTH, 0);

      return {
        buildingId,
        coverage: coverage.coverage,
        bottleneckRole: coverage.bottleneckRole === null ? null : ROLE_INDEX_TO_KEY[coverage.bottleneckRole],
        estimatedMonthlyPayroll,
        accruedPayroll: worldRef.buildings.accruedPayroll[buildingId] || 0,
        roles,
      };
    },

    setBuildingLaborWageMultiplier: (buildingId, roleKey, multiplier) => {
      if (!worldRef || buildingId < 0 || buildingId >= worldRef.buildings.count) return false;
      const role = ROLE_KEY_TO_INDEX[roleKey];
      const idx = getBuildingLaborIndex(buildingId, role);
      worldRef.buildings.wageMultipliers[idx] = clampWageMultiplier(multiplier);
      set((state) => {
        state.tick = state.tick + 0.001;
      });
      return true;
    },
```

- [ ] **Step 5: Add UI labor panel**

Modify `src/ui/components/Production/BuildingDetailPanel.tsx`.

Add store pulls:

```ts
    getBuildingLaborView,
    setBuildingLaborWageMultiplier,
```

After `productionControl`, add:

```ts
  const laborView = getBuildingLaborView(buildingIndex);
```

Add helper:

```ts
  const handleWageMultiplierChange = (role: 'basic' | 'technical' | 'management') => (values: number[]) => {
    if (!values.length) return;
    setBuildingLaborWageMultiplier(buildingIndex, role, values[0] / 100);
  };
```

Add a labor card after the production control card:

```tsx
        {laborView && (
          <Card variant="elevated" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
              👥 劳动力
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">劳动力覆盖率</span>
                <span className="text-[var(--text-primary)] tabular-nums">
                  {(laborView.coverage * 100).toFixed(0)}%
                </span>
              </div>
              {laborView.bottleneckRole && (
                <Badge variant="warning" size="sm">
                  瓶颈: {laborView.roles[laborView.bottleneckRole].name}
                </Badge>
              )}
              {(['basic', 'technical', 'management'] as const).map((role) => {
                const item = laborView.roles[role];
                return (
                  <div key={role} className="space-y-2 border-t border-[var(--border-muted)] pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">{item.name}</span>
                      <span className="text-xs text-[var(--text-muted)] tabular-nums">
                        {item.hired.toFixed(0)} / {item.activeDemand.toFixed(0)}
                      </span>
                    </div>
                    <ProgressBar
                      value={item.coverage * 100}
                      max={100}
                      size="sm"
                      color={item.coverage >= 1 ? 'success' : item.coverage >= 0.7 ? 'warning' : 'error'}
                    />
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
                      <span>满产需求: {item.fullDemand.toFixed(0)}</span>
                      <span>缺口: {item.shortage.toFixed(0)}</span>
                      <span>市场日薪: {formatMoney(item.marketWage)}</span>
                      <span>实际日薪: {formatMoney(item.actualDailyWage)}</span>
                    </div>
                    <Slider
                      value={[Math.round(item.wageMultiplier * 100)]}
                      min={50}
                      max={200}
                      step={5}
                      onValueChange={handleWageMultiplierChange(role)}
                      label={`${item.name}工资倍率`}
                      showValue
                      formatValue={(v) => `${(v / 100).toFixed(2)}x`}
                      variant="game"
                      color="info"
                    />
                  </div>
                );
              })}
              <div className="flex justify-between text-sm pt-2 border-t border-[var(--border-muted)]">
                <span className="text-[var(--text-muted)]">预计月工资</span>
                <span className="text-[var(--text-primary)] tabular-nums">
                  {formatMoney(laborView.estimatedMonthlyPayroll)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">本月已计提</span>
                <span className="text-[var(--text-primary)] tabular-nums">
                  {formatMoney(laborView.accruedPayroll)}
                </span>
              </div>
            </div>
          </Card>
        )}
```

- [ ] **Step 6: Run store tests and typecheck**

Run:

```bash
npm run test -- src/stores/__tests__/gameStore.loadGame.test.ts --run
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/stores/gameStore.ts src/ui/components/Production/BuildingDetailPanel.tsx src/stores/__tests__/gameStore.loadGame.test.ts
git commit -m "feat: expose building labor controls"
```

---

### Task 9: Final Integration, Regression Sweep, And Balance Checks

**Files:**
- No planned file edits.
- If a command fails, stop and use `superpowers:systematic-debugging` before changing code.

- [ ] **Step 1: Search for stale runtime labor fields**

Run:

```powershell
Get-ChildItem -Recurse -File src |
  Select-String -Pattern 'laborRequired|laborDelta|laborCost' -CaseSensitive:$false |
  Select-Object Path,LineNumber,Line
```

Expected:

- `laborRequired` and `laborDelta` do not appear in production runtime code.
- `laborCost` may remain in `src/data/buildings.ts`, construction/demolition text, comments, and legacy display code, but not in recurring payroll cost calculations.

- [ ] **Step 2: Run focused labor and production tests**

Run:

```bash
npm run test -- src/core/labor src/core/production/__tests__/ProductionEngine.dayModel.test.ts src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts src/core/finance/__tests__/OperatingCosts.test.ts src/core/save/__tests__/SaveManager.storageFallback.test.ts src/stores/__tests__/gameStore.loadGame.test.ts --run
```

Expected: PASS.

- [ ] **Step 3: Run broader core loop tests**

Run:

```bash
npm run test -- src/core/loop/__tests__/GameLoop.dayModel.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts src/core/loop/__tests__/GameLoop.marketBalanceRegression.test.ts --run
```

Expected: PASS.

- [ ] **Step 4: Build**

Run:

```bash
npm run build
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Manual smoke path**

Run the dev server:

```bash
npm run dev
```

Open the local URL in the in-app browser and verify:

- Start a new game.
- Open a production building detail panel.
- Labor card appears under production control.
- Role demand, hired count, shortage, market wage, wage multiplier, estimated monthly payroll, and accrued payroll render without overlap.
- Moving a wage slider changes the multiplier and actual daily wage.
- Advance several ticks and observe hired count increasing.
- Set a wage multiplier below `1.0x`, advance enough ticks, and observe slow attrition.

## Self-Review Checklist

- Spec coverage:
  - Method-level workforce demand: Task 2
  - Global and role labor pools: Task 1 and Task 3
  - Building-level hired workers and wage multipliers: Task 1 and Task 8
  - Automatic hiring and low-wage attrition: Task 3 and Task 6
  - AI wage adjustment with personality: Task 6
  - Shortage reduces output only: Task 4
  - Active utilization scales workforce demand: Task 4
  - Payroll accrued daily and paid monthly: Task 3 and Task 5
  - Old `laborCost` no longer drives payroll: Task 5
  - Save migration: Task 7
  - Building detail UI: Task 8

- Red-flag scan:
  - The plan contains no unspecified implementation steps.

- Type consistency:
  - `WorkforceDemand` keys are `basic`, `technical`, `management`.
  - Runtime recipe field is `workforceRequired`.
  - Method field is `workforceDelta`.
  - Store role keys match UI role keys.
