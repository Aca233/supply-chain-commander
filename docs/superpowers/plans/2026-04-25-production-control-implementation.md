# Production Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-building `auto` / `manual` production control system that works for player buildings and controlled-company buildings, persists through saves, and prevents AI or oversupply logic from overwriting manual efficiency targets.

**Architecture:** Add a focused production-control helper module that owns clamping, mode switching, default hydration, and automatic-write guards. Use that helper from world initialization, save/load, AI decision paths, the oversupply adjustment path, and the store/UI layer so the behavior stays consistent across runtime, saves, and controlled-company permissions.

**Tech Stack:** TypeScript, React 18, Zustand, Vitest, Vite

---

## File Structure

### Create

- `src/core/production/ProductionControl.ts`
  Central constants and helpers for control mode, target clamping, state hydration, permission checks, and guarded automatic efficiency writes.
- `src/core/production/__tests__/ProductionControl.test.ts`
  Unit tests for defaults, clamping, mode switching, and controlled-company permission checks.
- `src/core/production/__tests__/ProductionControl.autoAdjust.test.ts`
  Integration tests for AI production decisions and oversupply adjustments respecting manual mode.
- `src/core/save/__tests__/SaveManager.productionControl.test.ts`
  Save/load round-trip and legacy-save fallback coverage for production control fields.

### Modify

- `src/core/world/GameWorld.ts`
  Add persistent per-building arrays for control mode and manual efficiency target.
- `src/core/world/WorldInitializer.ts`
  Initialize production control state for starter, AI, and direct-build buildings.
- `src/core/construction/ConstructionTick.ts`
  Initialize production control state for buildings completed through the construction queue.
- `src/core/save/SaveManager.ts`
  Serialize and deserialize the new fields with legacy fallback.
- `src/core/ai/AIDecisionEngine.ts`
  Route production and upgrade efficiency writes through the new guard helper.
- `src/core/ai/AIOptimizer.ts`
  Route optimized AI production efficiency writes through the same helper.
- `src/core/production/ProductionEngine.ts`
  Skip oversupply reduction/recovery for manual-mode buildings.
- `src/stores/gameStore.ts`
  Add production-control getters/setters with ownership and `influence_strategy` permission checks.
- `src/ui/components/Production/BuildingDetailPanel.tsx`
  Add the permission-aware switch and slider UI using the existing design-system components.

## Execution Notes

- This workspace does not currently contain a `.git` directory, so replace normal commit steps with a checkpoint step that records changed files plus the exact test/build commands that passed.
- Use `npx vitest run ...` for deterministic one-shot verification rather than interactive watch mode.
- Reuse the existing design-system `Switch` and `Slider` components exported from `@/ui/design-system`.

### Task 1: Add Core Production-Control State And Helper

**Files:**
- Create: `src/core/production/ProductionControl.ts`
- Create: `src/core/production/__tests__/ProductionControl.test.ts`
- Modify: `src/core/world/GameWorld.ts`
- Modify: `src/core/world/WorldInitializer.ts`
- Modify: `src/core/construction/ConstructionTick.ts`

- [ ] **Step 1: Write the failing helper/default tests**

```ts
import { describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

import {
  PRODUCTION_CONTROL_MODE,
  canPlayerManageBuildingProduction,
  getBuildingManualEfficiencyTarget,
  getBuildingProductionControlMode,
  setBuildingManualEfficiencyTarget,
  setBuildingProductionControlMode,
} from '../ProductionControl';

describe('ProductionControl', () => {
  it('initializes newly added buildings in auto mode with a 1.0 manual target', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[0] = '玩家公司';
    world.companies.names[1] = '受控公司';

    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL, 0);

    expect(getBuildingProductionControlMode(world, buildingId)).toBe(PRODUCTION_CONTROL_MODE.AUTO);
    expect(getBuildingManualEfficiencyTarget(world, buildingId)).toBeCloseTo(1.0);
  });

  it('switches to manual mode, clamps the target, and syncs the live efficiency', () => {
    const world = createGameWorld();
    world.companies.count = 1;

    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL, 0);

    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE.MANUAL);
    const applied = setBuildingManualEfficiencyTarget(world, buildingId, 9);

    expect(applied).toBeCloseTo(1.5);
    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(1.5);
    expect(getBuildingManualEfficiencyTarget(world, buildingId)).toBeCloseTo(1.5);
  });

  it('allows controlled-company buildings when influence_strategy is granted', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[0] = '玩家公司';
    world.companies.names[1] = '受控公司';

    const buildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, 0);

    expect(
      canPlayerManageBuildingProduction(
        world,
        buildingId,
        0,
        (_holderId, companyId, right) => companyId === 1 && right === 'influence_strategy'
      )
    ).toBe(true);

    expect(
      canPlayerManageBuildingProduction(
        world,
        buildingId,
        0,
        () => false
      )
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the new test file and confirm it fails**

Run:

```bash
npx vitest run src/core/production/__tests__/ProductionControl.test.ts
```

Expected: FAIL with missing exports from `ProductionControl.ts` and missing `productionControlModes` / `manualEfficiencyTargets` fields on `BuildingsSystem`.

- [ ] **Step 3: Implement the core helper and wire default state into world/building creation**

`src/core/world/GameWorld.ts`

```ts
export interface BuildingsSystem {
  count: number;
  maxCount: number;
  types: Uint8Array;
  owners: Uint16Array;
  levels: Uint8Array;
  efficiencies: Float32Array;
  productionControlModes: Uint8Array;
  manualEfficiencyTargets: Float32Array;
  slotMethods: Uint32Array;
  progress: Float32Array;
  inputBuffers: Float32Array;
  outputBuffers: Float32Array;
  outputModeIds: Uint8Array;
  isActive: Uint8Array;
  subsidiaryIds: Uint16Array;
  subsidiaryConditions: Float32Array;
  subsidiaryInstalledTicks: Uint32Array;
  subsidiaryCount: Uint8Array;
}

export function createBuildingsSystem(): BuildingsSystem {
  return {
    count: 0,
    maxCount: MAX_BUILDINGS,
    types: new Uint8Array(MAX_BUILDINGS),
    owners: new Uint16Array(MAX_BUILDINGS),
    levels: new Uint8Array(MAX_BUILDINGS),
    efficiencies: new Float32Array(MAX_BUILDINGS),
    productionControlModes: new Uint8Array(MAX_BUILDINGS),
    manualEfficiencyTargets: new Float32Array(MAX_BUILDINGS),
    slotMethods: new Uint32Array(MAX_BUILDINGS * MAX_SLOTS),
    progress: new Float32Array(MAX_BUILDINGS),
    inputBuffers: new Float32Array(MAX_BUILDINGS * MAX_INPUTS),
    outputBuffers: new Float32Array(MAX_BUILDINGS * MAX_OUTPUTS),
    outputModeIds: new Uint8Array(MAX_BUILDINGS),
    isActive: new Uint8Array(MAX_BUILDINGS),
    subsidiaryIds: new Uint16Array(MAX_BUILDINGS * MAX_SUBSIDIARIES),
    subsidiaryConditions: new Float32Array(MAX_BUILDINGS * MAX_SUBSIDIARIES),
    subsidiaryInstalledTicks: new Uint32Array(MAX_BUILDINGS * MAX_SUBSIDIARIES),
    subsidiaryCount: new Uint8Array(MAX_BUILDINGS),
  };
}
```

`src/core/production/ProductionControl.ts`

```ts
import { hasControlRight, type ControlRight } from '@/core/finance/OwnershipControl';
import type { GameWorld } from '@/core/world/GameWorld';

export const PRODUCTION_CONTROL_MODE = {
  AUTO: 0,
  MANUAL: 1,
} as const;

export type ProductionControlMode =
  (typeof PRODUCTION_CONTROL_MODE)[keyof typeof PRODUCTION_CONTROL_MODE];

export const MIN_PRODUCTION_EFFICIENCY = 0.3;
export const MAX_PRODUCTION_EFFICIENCY = 1.5;
export const DEFAULT_PRODUCTION_EFFICIENCY = 1.0;

export function clampProductionEfficiencyTarget(target: number): number {
  return Math.max(MIN_PRODUCTION_EFFICIENCY, Math.min(MAX_PRODUCTION_EFFICIENCY, target));
}

export function initializeBuildingProductionControl(
  world: GameWorld,
  buildingId: number,
  initialEfficiency = DEFAULT_PRODUCTION_EFFICIENCY
): void {
  world.buildings.productionControlModes[buildingId] = PRODUCTION_CONTROL_MODE.AUTO;
  world.buildings.manualEfficiencyTargets[buildingId] =
    clampProductionEfficiencyTarget(initialEfficiency);
}

export function hydrateProductionControlState(world: GameWorld): void {
  for (let i = 0; i < world.buildings.count; i++) {
    const liveEfficiency = world.buildings.efficiencies[i] || DEFAULT_PRODUCTION_EFFICIENCY;
    if (world.buildings.manualEfficiencyTargets[i] <= 0) {
      world.buildings.manualEfficiencyTargets[i] = clampProductionEfficiencyTarget(liveEfficiency);
    }
  }
}

export function getBuildingProductionControlMode(
  world: GameWorld,
  buildingId: number
): ProductionControlMode {
  return world.buildings.productionControlModes[buildingId] === PRODUCTION_CONTROL_MODE.MANUAL
    ? PRODUCTION_CONTROL_MODE.MANUAL
    : PRODUCTION_CONTROL_MODE.AUTO;
}

export function getBuildingManualEfficiencyTarget(world: GameWorld, buildingId: number): number {
  return clampProductionEfficiencyTarget(
    world.buildings.manualEfficiencyTargets[buildingId] || world.buildings.efficiencies[buildingId] || DEFAULT_PRODUCTION_EFFICIENCY
  );
}

export function setBuildingProductionControlMode(
  world: GameWorld,
  buildingId: number,
  mode: ProductionControlMode
): void {
  world.buildings.productionControlModes[buildingId] = mode;
  if (mode === PRODUCTION_CONTROL_MODE.MANUAL) {
    const target = getBuildingManualEfficiencyTarget(world, buildingId);
    world.buildings.manualEfficiencyTargets[buildingId] = target;
    world.buildings.efficiencies[buildingId] = target;
  }
}

export function setBuildingManualEfficiencyTarget(
  world: GameWorld,
  buildingId: number,
  target: number
): number {
  const clamped = clampProductionEfficiencyTarget(target);
  world.buildings.manualEfficiencyTargets[buildingId] = clamped;
  if (getBuildingProductionControlMode(world, buildingId) === PRODUCTION_CONTROL_MODE.MANUAL) {
    world.buildings.efficiencies[buildingId] = clamped;
  }
  return clamped;
}

export function canAutoAdjustBuildingEfficiency(world: GameWorld, buildingId: number): boolean {
  return getBuildingProductionControlMode(world, buildingId) !== PRODUCTION_CONTROL_MODE.MANUAL;
}

export function applyAutomaticEfficiency(
  world: GameWorld,
  buildingId: number,
  nextEfficiency: number
): boolean {
  if (!canAutoAdjustBuildingEfficiency(world, buildingId)) return false;
  world.buildings.efficiencies[buildingId] = clampProductionEfficiencyTarget(nextEfficiency);
  return true;
}

export function canPlayerManageBuildingProduction(
  world: GameWorld,
  buildingId: number,
  playerCompanyId = 0,
  rightChecker: (holderId: number, companyId: number, right: ControlRight) => boolean = hasControlRight
): boolean {
  const ownerCompanyId = world.buildings.owners[buildingId];
  if (ownerCompanyId === playerCompanyId) return true;
  return rightChecker(playerCompanyId, ownerCompanyId, 'influence_strategy');
}
```

`src/core/world/WorldInitializer.ts`

```ts
import { initializeBuildingProductionControl } from '@/core/production/ProductionControl';

export function addBuilding(
  world: GameWorld,
  companyId: number,
  buildingTypeId: number,
  outputModeId: number
): number {
  const b = world.buildings;
  const buildingId = b.count;
  b.count++;
  b.efficiencies[buildingId] = 1.0;
  initializeBuildingProductionControl(world, buildingId, 1.0);
  b.progress[buildingId] = 0;
  b.outputModeIds[buildingId] = outputModeId;
  b.isActive[buildingId] = 1;
  return buildingId;
}
```

`src/core/construction/ConstructionTick.ts`

```ts
import { initializeBuildingProductionControl } from '@/core/production/ProductionControl';

buildingsData.efficiencies[newBuildingId] = 1.0;
initializeBuildingProductionControl(world, newBuildingId, 1.0);
```

- [ ] **Step 4: Run the helper/default tests again**

Run:

```bash
npx vitest run src/core/production/__tests__/ProductionControl.test.ts
```

Expected: PASS with 3 passing tests.

- [ ] **Step 5: Checkpoint the core state work**

Record this checkpoint:

```text
Changed: GameWorld.ts, WorldInitializer.ts, ConstructionTick.ts, ProductionControl.ts, ProductionControl.test.ts
Passed: npx vitest run src/core/production/__tests__/ProductionControl.test.ts
```

### Task 2: Persist Production Control Through Save/Load

**Files:**
- Create: `src/core/save/__tests__/SaveManager.productionControl.test.ts`
- Modify: `src/core/save/SaveManager.ts`
- Modify: `src/core/production/ProductionControl.ts`

- [ ] **Step 1: Write the failing save/load tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import {
  PRODUCTION_CONTROL_MODE,
  getBuildingManualEfficiencyTarget,
  getBuildingProductionControlMode,
  setBuildingManualEfficiencyTarget,
  setBuildingProductionControlMode,
} from '@/core/production/ProductionControl';

import { SaveManager, type SerializedWorld } from '../SaveManager';

function createLocalStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  };
}

describe('SaveManager production control', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('localStorage', createLocalStorageStub());
  });

  it('round-trips manual production control fields', () => {
    const manager = new SaveManager();
    const source = createGameWorld();
    source.companies.count = 1;

    const buildingId = addBuilding(source, 0, BuildingId.STEEL_MILL, 0);
    setBuildingProductionControlMode(source, buildingId, PRODUCTION_CONTROL_MODE.MANUAL);
    setBuildingManualEfficiencyTarget(source, buildingId, 1.25);

    const serialized = manager.serializeWorld(source, 77);
    const target = createGameWorld();
    manager.deserializeWorld(serialized, target);

    expect(getBuildingProductionControlMode(target, buildingId)).toBe(PRODUCTION_CONTROL_MODE.MANUAL);
    expect(getBuildingManualEfficiencyTarget(target, buildingId)).toBeCloseTo(1.25);
    expect(target.buildings.efficiencies[buildingId]).toBeCloseTo(1.25);
  });

  it('hydrates missing production control fields from a legacy save payload', () => {
    const manager = new SaveManager();
    const world = createGameWorld();

    const legacyData: SerializedWorld = {
      goods: { count: 0, prices: [], supplies: [], demands: [] },
      buildings: {
        count: 1,
        types: [BuildingId.STEEL_MILL],
        owners: [0],
        levels: [1],
        efficiencies: [0.82],
        outputModeIds: [0],
        isActive: [1],
      },
      companies: {
        count: 1,
        cash: [0],
        isAI: [false],
        inventories: [[]],
      },
      currentTick: 12,
    };

    manager.deserializeWorld(legacyData, world);

    expect(getBuildingProductionControlMode(world, 0)).toBe(PRODUCTION_CONTROL_MODE.AUTO);
    expect(getBuildingManualEfficiencyTarget(world, 0)).toBeCloseTo(0.82);
  });
});
```

- [ ] **Step 2: Run the save/load tests and confirm they fail**

Run:

```bash
npx vitest run src/core/save/__tests__/SaveManager.productionControl.test.ts
```

Expected: FAIL because `SerializedWorld.buildings` does not carry production-control fields yet and legacy hydration is missing.

- [ ] **Step 3: Extend save serialization and legacy hydration**

`src/core/save/SaveManager.ts`

```ts
import { hydrateProductionControlState } from '@/core/production/ProductionControl';

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
    outputModeIds: number[];
    isActive: number[];
    productionControlModes?: number[];
    manualEfficiencyTargets?: number[];
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
      outputModeIds: Array.from(world.buildings.outputModeIds),
      isActive: Array.from(world.buildings.isActive),
      productionControlModes: Array.from(world.buildings.productionControlModes),
      manualEfficiencyTargets: Array.from(world.buildings.manualEfficiencyTargets),
    },
    companies: {
      count: world.companies.count,
      cash: Array.from(world.companies.cash),
      isAI: [...world.companies.isAI],
      inventories: this.serializeInventories(world),
    },
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
  hydrateProductionControlState(world);

  if (data.buildings.outputModeIds) {
    world.buildings.outputModeIds.set(data.buildings.outputModeIds);
  } else if (data.buildings.recipeIds) {
    this.migrateRecipeIdsToOutputModeIds(data.buildings.recipeIds, data.buildings.types, world);
  }
  this.validateAndFixBuildingOutputModes(world);

  if (data.buildings.isActive) {
    world.buildings.isActive.set(data.buildings.isActive);
  } else {
    for (let i = 0; i < data.buildings.count; i++) {
      world.buildings.isActive[i] = 1;
    }
  }

  world.companies.count = data.companies.count;
  world.companies.cash.set(data.companies.cash);
  world.companies.isAI = [...data.companies.isAI];
}
```

- [ ] **Step 4: Re-run the state and save tests**

Run:

```bash
npx vitest run src/core/production/__tests__/ProductionControl.test.ts src/core/save/__tests__/SaveManager.productionControl.test.ts
```

Expected: PASS with both files green.

- [ ] **Step 5: Checkpoint the persistence work**

Record this checkpoint:

```text
Changed: SaveManager.ts, SaveManager.productionControl.test.ts
Passed: npx vitest run src/core/production/__tests__/ProductionControl.test.ts src/core/save/__tests__/SaveManager.productionControl.test.ts
```

### Task 3: Make AI And Oversupply Logic Respect Manual Mode

**Files:**
- Create: `src/core/production/__tests__/ProductionControl.autoAdjust.test.ts`
- Modify: `src/core/ai/AIDecisionEngine.ts`
- Modify: `src/core/ai/AIOptimizer.ts`
- Modify: `src/core/production/ProductionEngine.ts`

- [ ] **Step 1: Write the failing automatic-adjustment tests**

```ts
import { describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';
import { executeDecision, type AIDecision } from '@/core/ai/AIDecisionEngine';
import { adjustOversupplyProduction } from '@/core/production/ProductionEngine';
import {
  PRODUCTION_CONTROL_MODE,
  setBuildingManualEfficiencyTarget,
  setBuildingProductionControlMode,
} from '../ProductionControl';

function createProductionDecision(buildingId: number, action: 'reduce_production' | 'increase_production'): AIDecision {
  return {
    type: 'production',
    companyId: 1,
    action,
    params: {
      buildingId,
      targetQuantity: 100,
    },
    priority: 1,
    expectedProfit: 0,
    confidence: 1,
  };
}

describe('ProductionControl automatic adjustments', () => {
  it('prevents AI production decisions from changing manual-mode buildings', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const buildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, 0);
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE.MANUAL);
    setBuildingManualEfficiencyTarget(world, buildingId, 1.2);

    executeDecision(world, createProductionDecision(buildingId, 'reduce_production'));

    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(1.2);
  });

  it('still lets AI production decisions change auto-mode buildings', () => {
    const world = createGameWorld();
    world.companies.count = 2;

    const buildingId = addBuilding(world, 1, BuildingId.STEEL_MILL, 0);
    world.buildings.efficiencies[buildingId] = 1.0;

    executeDecision(world, createProductionDecision(buildingId, 'increase_production'));

    expect(world.buildings.efficiencies[buildingId]).toBeGreaterThan(1.0);
  });

  it('prevents oversupply reduction from changing manual-mode buildings', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.goods.count = 100;

    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL, 0);
    setBuildingProductionControlMode(world, buildingId, PRODUCTION_CONTROL_MODE.MANUAL);
    setBuildingManualEfficiencyTarget(world, buildingId, 0.9);

    world.goods.supplies[GoodsId.STEEL] = 500;
    world.goods.demands[GoodsId.STEEL] = 10;

    adjustOversupplyProduction(world);

    expect(world.buildings.efficiencies[buildingId]).toBeCloseTo(0.9);
  });

  it('still lets oversupply logic reduce auto-mode buildings', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.goods.count = 100;

    const buildingId = addBuilding(world, 0, BuildingId.STEEL_MILL, 0);
    world.buildings.efficiencies[buildingId] = 1.0;

    world.goods.supplies[GoodsId.STEEL] = 500;
    world.goods.demands[GoodsId.STEEL] = 10;

    adjustOversupplyProduction(world);

    expect(world.buildings.efficiencies[buildingId]).toBeLessThan(1.0);
  });
});
```

- [ ] **Step 2: Run the automatic-adjustment test file and confirm it fails**

Run:

```bash
npx vitest run src/core/production/__tests__/ProductionControl.autoAdjust.test.ts
```

Expected: FAIL because AI decisions and oversupply logic still write directly into `world.buildings.efficiencies`.

- [ ] **Step 3: Route automatic writes through the shared guard helper**

`src/core/ai/AIDecisionEngine.ts`

```ts
import {
  applyAutomaticEfficiency,
  canAutoAdjustBuildingEfficiency,
} from '@/core/production/ProductionControl';

function executeProductionDecision(world: GameWorld, decision: AIDecision): boolean {
  const buildingId = decision.params.buildingId as number;
  const currentEfficiency = world.buildings.efficiencies[buildingId];

  if (decision.action === 'reduce_production') {
    return applyAutomaticEfficiency(world, buildingId, currentEfficiency * 0.9);
  }

  return applyAutomaticEfficiency(world, buildingId, currentEfficiency * 1.05);
}

const efficiencyMultiplier = buildingDef.efficiencyMultipliers[targetLevel - 1] || 1;
if (canAutoAdjustBuildingEfficiency(world, buildingId)) {
  applyAutomaticEfficiency(world, buildingId, efficiencyMultiplier);
}
```

`src/core/ai/AIOptimizer.ts`

```ts
import { applyAutomaticEfficiency } from '@/core/production/ProductionControl';

if (buildingId !== undefined && targetEfficiency !== undefined) {
  return applyAutomaticEfficiency(world, buildingId, targetEfficiency);
}
```

`src/core/production/ProductionEngine.ts`

```ts
import { applyAutomaticEfficiency, canAutoAdjustBuildingEfficiency } from '@/core/production/ProductionControl';

if (producesOversupplied) {
  if (currentEfficiency > OVERSUPPLY_CONFIG.minEfficiency && canAutoAdjustBuildingEfficiency(world, i)) {
    const newEfficiency = Math.max(
      OVERSUPPLY_CONFIG.minEfficiency,
      currentEfficiency * (1 - OVERSUPPLY_CONFIG.efficiencyReduction)
    );
    applyAutomaticEfficiency(world, i, newEfficiency);
    result.reducedBuildingsCount++;
  }
} else {
  if (currentEfficiency < baseEfficiency && canAutoAdjustBuildingEfficiency(world, i)) {
    const newEfficiency = Math.min(
      baseEfficiency,
      currentEfficiency * (1 + OVERSUPPLY_CONFIG.recoveryRate)
    );
    applyAutomaticEfficiency(world, i, newEfficiency);
    result.recoveredBuildingsCount++;
  }
}
```

- [ ] **Step 4: Re-run the automatic-adjustment tests**

Run:

```bash
npx vitest run src/core/production/__tests__/ProductionControl.autoAdjust.test.ts
```

Expected: PASS with all 4 tests green.

- [ ] **Step 5: Checkpoint the runtime guard work**

Record this checkpoint:

```text
Changed: AIDecisionEngine.ts, AIOptimizer.ts, ProductionEngine.ts, ProductionControl.autoAdjust.test.ts
Passed: npx vitest run src/core/production/__tests__/ProductionControl.autoAdjust.test.ts
```

### Task 4: Expose Production Control In The Store And Building Panel

**Files:**
- Modify: `src/stores/gameStore.ts`
- Modify: `src/ui/components/Production/BuildingDetailPanel.tsx`

- [ ] **Step 1: Add production-control getters and setters to the store**

`src/stores/gameStore.ts`

```ts
import {
  PRODUCTION_CONTROL_MODE,
  canPlayerManageBuildingProduction,
  getBuildingManualEfficiencyTarget,
  getBuildingProductionControlMode,
  setBuildingManualEfficiencyTarget as setWorldBuildingManualEfficiencyTarget,
  setBuildingProductionControlMode as setWorldBuildingProductionControlMode,
} from '@/core/production/ProductionControl';

type BuildingProductionControlView = {
  mode: 'auto' | 'manual';
  manualEfficiencyTarget: number;
  canManage: boolean;
  ownerCompanyId: number;
  ownerCompanyName: string;
  isControlledCompany: boolean;
};

interface GameActions {
  getBuildingProductionControl: (buildingId: number) => BuildingProductionControlView | null;
  setBuildingProductionControlMode: (buildingId: number, mode: 'auto' | 'manual') => boolean;
  setBuildingManualEfficiencyTarget: (buildingId: number, target: number) => boolean;
}

getBuildingProductionControl: (buildingId) => {
  if (!worldRef || buildingId < 0 || buildingId >= worldRef.buildings.count) return null;

  const ownerCompanyId = worldRef.buildings.owners[buildingId];
  const canManage = canPlayerManageBuildingProduction(worldRef, buildingId);

  return {
    mode: getBuildingProductionControlMode(worldRef, buildingId) === PRODUCTION_CONTROL_MODE.MANUAL ? 'manual' : 'auto',
    manualEfficiencyTarget: getBuildingManualEfficiencyTarget(worldRef, buildingId),
    canManage,
    ownerCompanyId,
    ownerCompanyName: worldRef.companies.names[ownerCompanyId] || `公司#${ownerCompanyId}`,
    isControlledCompany: ownerCompanyId !== 0,
  };
},

setBuildingProductionControlMode: (buildingId, mode) => {
  if (!worldRef) return false;
  if (!canPlayerManageBuildingProduction(worldRef, buildingId)) {
    get().addNotification('error', '你没有该公司的经营控制权');
    return false;
  }

  const nextMode =
    mode === 'manual' ? PRODUCTION_CONTROL_MODE.MANUAL : PRODUCTION_CONTROL_MODE.AUTO;
  setWorldBuildingProductionControlMode(worldRef, buildingId, nextMode);

  get().addNotification('success', mode === 'manual' ? '已切换为手动产量' : '已切换为自动调产');
  set((state) => {
    state.tick = state.tick + 0.001;
  });
  return true;
},

setBuildingManualEfficiencyTarget: (buildingId, target) => {
  if (!worldRef) return false;
  if (!canPlayerManageBuildingProduction(worldRef, buildingId)) {
    get().addNotification('error', '你没有该公司的经营控制权');
    return false;
  }

  const applied = setWorldBuildingManualEfficiencyTarget(worldRef, buildingId, target);
  get().addNotification('info', `手动产量已设置为 ${(applied * 100).toFixed(0)}%`);
  set((state) => {
    state.tick = state.tick + 0.001;
  });
  return true;
},
```

- [ ] **Step 2: Add the production-control card to the building detail panel**

`src/ui/components/Production/BuildingDetailPanel.tsx`

```tsx
import {
  Button,
  Card,
  Badge,
  ProgressBar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Slider,
  Switch,
} from '@/ui/design-system';

const {
  getWorld,
  playerCash,
  upgradeBuilding,
  toggleBuildingActive,
  setOutputMode,
  demolishBuilding,
  tick,
  setSelectedGoods,
  setCurrentPage,
  getBuildingProductionControl,
  setBuildingProductionControlMode,
  setBuildingManualEfficiencyTarget,
} = useGameStore();

const productionControl = useMemo(
  () => getBuildingProductionControl(buildingIndex),
  [buildingIndex, getBuildingProductionControl, tick]
);

const handleToggleProductionMode = (checked: boolean) => {
  setBuildingProductionControlMode(buildingIndex, checked ? 'auto' : 'manual');
};

const handleManualEfficiencyChange = (values: number[]) => {
  const next = values[0] ?? 1;
  setBuildingManualEfficiencyTarget(buildingIndex, next);
};
```

Add the new card below the efficiency progress bar and above the existing production data card:

```tsx
{productionControl && (
  <Card variant="elevated" padding="md">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h4 className="text-xs font-medium text-[var(--text-primary)]">产量控制</h4>
        <div className="text-[11px] text-[var(--text-muted)] mt-1">
          归属公司: {productionControl.ownerCompanyName}
          {productionControl.isControlledCompany ? ' · 受控公司建筑' : ''}
        </div>
      </div>
      <Badge variant={productionControl.mode === 'auto' ? 'info' : 'warning'}>
        {productionControl.mode === 'auto' ? '自动' : '手动'}
      </Badge>
    </div>

    <Switch
      checked={productionControl.mode === 'auto'}
      onCheckedChange={handleToggleProductionMode}
      disabled={!productionControl.canManage}
      label="自动调整产量"
      description={
        productionControl.mode === 'auto'
          ? '当前由系统根据盈利和市场自动调节'
          : '当前效率锁定为手动目标，不再被自动系统覆盖'
      }
      variant="game"
    />

    <div className="mt-4">
      <Slider
        value={[productionControl.manualEfficiencyTarget]}
        onValueChange={handleManualEfficiencyChange}
        min={0.3}
        max={1.5}
        step={0.05}
        disabled={!productionControl.canManage || productionControl.mode === 'auto'}
        label="手动产量"
        showValue
        formatValue={(value) => `${Math.round(value * 100)}%`}
        color={productionControl.mode === 'manual' ? 'warning' : 'info'}
        variant="game"
      />
      <div className="mt-2 text-[11px] text-[var(--text-muted)]">
        当前效率 {Math.round(buildingData.efficiency * 100)}% · 手动目标 {Math.round(productionControl.manualEfficiencyTarget * 100)}%
      </div>
      {!productionControl.canManage && (
        <div className="mt-2 text-[11px] text-[var(--warning)]">
          你没有该公司的经营控制权，当前只能查看不能修改。
        </div>
      )}
    </div>
  </Card>
)}
```

- [ ] **Step 3: Run a build to catch type and UI integration errors**

Run:

```bash
npm run build
```

Expected: PASS with a clean Vite/TypeScript build.

- [ ] **Step 4: Manually validate the UI and permission behavior in the app**

Run:

```bash
npm run dev
```

Manual checklist:

```text
1. Open a player-owned factory and confirm the new 产量控制 card is visible.
2. Switch the building to 手动, drag the slider to 125%, and confirm the efficiency display matches 125%.
3. Advance several ticks and confirm the efficiency stays locked at the manual target.
4. Open a controlled-company building where the player has influence_strategy and confirm the switch/slider are enabled.
5. Open an uncontrolled AI building and confirm the switch/slider are disabled with a permission message.
6. Switch a manual building back to 自动 and confirm the slider disables while live efficiency remains visible.
```

- [ ] **Step 5: Checkpoint the store/UI work**

Record this checkpoint:

```text
Changed: gameStore.ts, BuildingDetailPanel.tsx
Passed: npm run build
Manual: completed the 6-step production-control checklist in the dev server
```

### Task 5: Final Regression Sweep

**Files:**
- Modify: none unless failures are found

- [ ] **Step 1: Run the focused regression tests together**

Run:

```bash
npx vitest run src/core/production/__tests__/ProductionControl.test.ts src/core/production/__tests__/ProductionControl.autoAdjust.test.ts src/core/save/__tests__/SaveManager.productionControl.test.ts
```

Expected: PASS with all focused production-control tests green.

- [ ] **Step 2: Run the existing market-coverage smoke test to guard against regressions**

Run:

```bash
npx vitest run src/core/loop/__tests__/GameLoop.marketCoverage.test.ts
```

Expected: PASS, confirming the broader market simulation still activates previously cold supply chains.

- [ ] **Step 3: Run the full Vitest suite**

Run:

```bash
npx vitest run
```

Expected: PASS with the repository test suite green.

- [ ] **Step 4: Run the production build one more time**

Run:

```bash
npm run build
```

Expected: PASS with no TypeScript or bundling errors.

- [ ] **Step 5: Record the final verification checkpoint**

Record this checkpoint:

```text
Passed: npx vitest run src/core/production/__tests__/ProductionControl.test.ts src/core/production/__tests__/ProductionControl.autoAdjust.test.ts src/core/save/__tests__/SaveManager.productionControl.test.ts
Passed: npx vitest run src/core/loop/__tests__/GameLoop.marketCoverage.test.ts
Passed: npx vitest run
Passed: npm run build
```
