# Production Methods Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the current single-slot production-mode catalog into richer multi-slot production methods for the existing non-retail building system.

**Architecture:** Keep the current registry model: every method contributes absolute input/output/workforce/energy deltas, and `computeRecipe()` sums selected slot deltas. Add expanded per-building configs in focused catalog files, route `getDefaultBuildingMethodConfig()` through those overrides, and preserve legacy production variants through the existing `production` slot and `mode_<buildingId>_<modeId>` keys.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Zustand, existing production registry under `src/core/production/methods`.

---

## Current State

- `src/core/production/methods/defaultConfigs.ts` is the active production-method catalog.
- The active industry directories (`extraction`, `processing`, `manufacturing`, `luxury`, `service`) all call `getDefaultBuildingMethodConfig()`.
- The old orphan method directories mentioned by `docs/refactor/production-methods-migration-plan.md` are already gone.
- `src/core/save/SaveManager.ts` already serializes `buildings.slotMethods` and only supports save version `3.0.0`.
- The UI already supports multiple method slots in `src/ui/components/Production/ProductionMethodsPanel.tsx`; the catalog is the main limiting factor because most buildings currently expose only one `production` slot.

## Expansion Rule

Every expanded non-retail building should have:

- A `production` slot that preserves existing variants and `legacyOutputModeId` behavior.
- One or two modifier slots such as `automation`, `energy`, `quality`, `environment`, `feed`, `mining_method`, or `process`.
- Default selections that reproduce current baseline behavior within a small tolerance.
- Unlock levels on advanced methods so early-game behavior remains stable.

Do not add retail production methods in this plan. Retail buildings remain driven by `retailConfig`.

## Files

- Modify: `src/core/production/methods/defaultConfigs.ts`
  - Keep existing baseline variants.
  - Export reusable helpers needed by focused catalog files.
  - Route `getDefaultBuildingMethodConfig()` to expanded overrides first.
- Create: `src/core/production/methods/expanded/common.ts`
  - Shared helper functions for expanded configs.
- Create: `src/core/production/methods/expanded/extraction.ts`
  - Expanded configs for `FARM`, `LIVESTOCK_FARM`, `FISHERY`, `IRON_MINE`, `LITHIUM_MINE`, `RARE_EARTH_MINE`.
- Create: `src/core/production/methods/expanded/processing.ts`
  - Expanded configs for `STEEL_MILL`, `CHEMICAL_PLANT`, `FOOD_FACTORY`, `MEAT_PROCESSING`.
- Create: `src/core/production/methods/expanded/manufacturing.ts`
  - Expanded configs for `ELECTRONICS_FACTORY`, `BATTERY_FACTORY`, `PARTS_FACTORY`, `CAR_FACTORY`, `PHARMA_FACTORY`.
- Create: `src/core/production/methods/expanded/service.ts`
  - Expanded config for `POWER_PLANT`.
- Create: `src/core/production/methods/expanded/index.ts`
  - Export `getExpandedBuildingMethodConfig()`.
- Create: `src/core/production/__tests__/ProductionMethods.expansion.test.ts`
  - Registry, default, legacy variant, and delta-composition tests.
- Modify: `src/data/__tests__/supplyChainBalance.test.ts`
  - Add expanded method guardrails while preserving existing balance tests.
- Modify: `src/ui/components/Production/__tests__/ProductionMethodsPanel.test.tsx`
  - Add a regression for multi-slot final recipe rendering and locked methods.
- Modify: `docs/refactor/production-methods-migration-plan.md`
  - Mark the old migration plan as superseded by this expansion plan.

---

### Task 1: Lock The Target Behavior With Tests

**Files:**
- Create: `src/core/production/__tests__/ProductionMethods.expansion.test.ts`

- [ ] **Step 1: Write the failing expansion coverage tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getBuildingConfig,
  getBuildingProductionVariants,
  getDefaultSlotMethods,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

const EXPANSION_TARGETS = [
  BuildingId.FARM,
  BuildingId.LIVESTOCK_FARM,
  BuildingId.FISHERY,
  BuildingId.IRON_MINE,
  BuildingId.LITHIUM_MINE,
  BuildingId.RARE_EARTH_MINE,
  BuildingId.STEEL_MILL,
  BuildingId.CHEMICAL_PLANT,
  BuildingId.FOOD_FACTORY,
  BuildingId.MEAT_PROCESSING,
  BuildingId.ELECTRONICS_FACTORY,
  BuildingId.BATTERY_FACTORY,
  BuildingId.PARTS_FACTORY,
  BuildingId.CAR_FACTORY,
  BuildingId.PHARMA_FACTORY,
  BuildingId.POWER_PLANT,
];

beforeEach(() => {
  initializeBuildingProductionMethods();
  initProductionCache();
});

describe('expanded production methods', () => {
  it('gives each first-wave target at least two selectable slots', () => {
    const missing = EXPANSION_TARGETS
      .map((buildingTypeId) => ({
        buildingTypeId,
        slotCount: getBuildingConfig(buildingTypeId)?.slots.length ?? 0,
      }))
      .filter((entry) => entry.slotCount < 2);

    expect(missing).toEqual([]);
  });

  it('keeps production variants available through the production slot', () => {
    const farmVariants = getBuildingProductionVariants(BuildingId.FARM);
    expect(farmVariants.map((variant) => variant.legacyOutputModeId)).toContain(0);
    expect(farmVariants.map((variant) => variant.name)).toContain('粮食种植');
    expect(farmVariants.map((variant) => variant.name)).toContain('棉花种植');
  });

  it('combines non-production slots into the final recipe', () => {
    const config = getBuildingConfig(BuildingId.STEEL_MILL);
    expect(config).not.toBeNull();

    const productionMethod = config!.methods.find(
      (method) => method.slotId === 'production' && method.name === '炼钢',
    );
    const oxygenFurnace = config!.methods.find(
      (method) => method.slotId === 'process' && method.key.includes('oxygen_furnace'),
    );

    expect(productionMethod).toBeDefined();
    expect(oxygenFurnace).toBeDefined();

    const baseRecipe = getRecipeForBuilding(
      BuildingId.STEEL_MILL,
      getDefaultSlotMethods(BuildingId.STEEL_MILL),
    );
    const modifiedRecipe = getRecipeForBuilding(BuildingId.STEEL_MILL, [
      productionMethod!.id,
      oxygenFurnace!.id,
    ]);

    const baseSteel = baseRecipe.outputs.find((entry) => entry.goodsId === GoodsId.STEEL)?.amount ?? 0;
    const modifiedSteel = modifiedRecipe.outputs.find((entry) => entry.goodsId === GoodsId.STEEL)?.amount ?? 0;

    expect(modifiedSteel).toBeGreaterThan(baseSteel);
    expect(modifiedRecipe.energyRequired).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/core/production/__tests__/ProductionMethods.expansion.test.ts`

Expected: FAIL because first-wave buildings still expose only one slot and `oxygen_furnace` does not exist.

- [ ] **Step 3: Commit**

```bash
git add src/core/production/__tests__/ProductionMethods.expansion.test.ts
git commit -m "test: lock expanded production method behavior"
```

---

### Task 2: Extract Reusable Catalog Helpers

**Files:**
- Modify: `src/core/production/methods/defaultConfigs.ts`
- Create: `src/core/production/methods/expanded/common.ts`

- [ ] **Step 1: Export baseline helpers from `defaultConfigs.ts`**

Change `workforceFor` from a private function to an exported function:

```ts
export function workforceFor(buildingTypeId: number, total: number): WorkforceDemand {
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

- [ ] **Step 2: Add common expanded-catalog helpers**

Create `src/core/production/methods/expanded/common.ts`:

```ts
import { BUILDINGS_BY_ID } from '@/data/buildings';
import {
  createBuildingConfig,
  createMethod,
  createSlot,
} from '../registry';
import type {
  BuildingMethodConfig,
  BuildingProductionMethod,
  BuildingSlotType,
  RecipeDelta,
} from '../types';
import type { BuildingProductionVariantDefinition } from '../defaultConfigs';

export interface ExpandedSlotDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ExpandedMethodDefinition {
  slotId: string;
  localId: number;
  key: string;
  name: string;
  inputDelta?: RecipeDelta[];
  outputDelta?: RecipeDelta[];
  workforceTotalDelta?: number;
  energyDelta?: number;
  requiredLevel?: number;
  switchCost?: number;
  switchCooldown?: number;
  description: string;
}

export function createProductionSlot(buildingTypeId: number): BuildingSlotType {
  return createSlot(buildingTypeId, 'production', '生产方式', '⚙️', '主要产出路线', 0);
}

export function createExpandedSlot(
  buildingTypeId: number,
  definition: ExpandedSlotDefinition,
  order: number,
): BuildingSlotType {
  return createSlot(
    buildingTypeId,
    definition.id,
    definition.name,
    definition.icon,
    definition.description,
    order,
  );
}

export function createProductionMethodsFromVariants(
  buildingTypeId: number,
  variants: BuildingProductionVariantDefinition[],
): BuildingProductionMethod[] {
  const buildingName = BUILDINGS_BY_ID.get(buildingTypeId)?.name ?? `建筑${buildingTypeId}`;
  return variants.map((variant) =>
    createMethod(
      buildingTypeId,
      variant.modeId,
      'production',
      `mode_${buildingTypeId}_${variant.modeId}`,
      variant.name,
      {
        inputDelta: variant.inputs,
        outputDelta: variant.outputs,
        workforceDelta: variant.workforceRequired,
        energyDelta: variant.energyRequired,
        ticksRequired: variant.ticksRequired,
        requiredLevel: variant.unlockLevel ?? 1,
        description: `${buildingName} ${variant.name}`,
      },
    ),
  );
}

export function createExpandedMethod(
  buildingTypeId: number,
  definition: ExpandedMethodDefinition,
): BuildingProductionMethod {
  return createMethod(
    buildingTypeId,
    definition.localId,
    definition.slotId,
    definition.key,
    definition.name,
    {
      inputDelta: definition.inputDelta ?? [],
      outputDelta: definition.outputDelta ?? [],
      workforceDelta: definition.workforceTotalDelta
        ? {
            basic: Math.round(definition.workforceTotalDelta * 0.65),
            technical: Math.round(definition.workforceTotalDelta * 0.25),
            management: Math.round(definition.workforceTotalDelta * 0.10),
          }
        : undefined,
      energyDelta: definition.energyDelta ?? 0,
      requiredLevel: definition.requiredLevel ?? 1,
      switchCost: definition.switchCost ?? 50000,
      switchCooldown: definition.switchCooldown ?? 24,
      description: definition.description,
    },
  );
}

export function createExpandedBuildingConfig(
  buildingTypeId: number,
  variants: BuildingProductionVariantDefinition[],
  slots: ExpandedSlotDefinition[],
  methods: ExpandedMethodDefinition[],
): BuildingMethodConfig {
  const productionMethods = createProductionMethodsFromVariants(buildingTypeId, variants);
  const expandedSlots = slots.map((slot, index) =>
    createExpandedSlot(buildingTypeId, slot, index + 1),
  );
  const expandedMethods = methods.map((method) => createExpandedMethod(buildingTypeId, method));
  const allSlots = [createProductionSlot(buildingTypeId), ...expandedSlots];
  const allMethods = [...productionMethods, ...expandedMethods];
  const defaultMethods: Record<string, number> = {
    production: productionMethods[0]?.id ?? 0,
  };

  for (const slot of expandedSlots) {
    const firstMethod = expandedMethods.find((method) => method.slotId === slot.id);
    if (firstMethod) {
      defaultMethods[slot.id] = firstMethod.id;
    }
  }

  return createBuildingConfig(buildingTypeId, allSlots, allMethods, defaultMethods);
}
```

- [ ] **Step 3: Run focused tests**

Run: `npm run test -- --run src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/production/methods/defaultConfigs.ts src/core/production/methods/expanded/common.ts
git commit -m "refactor: prepare expanded production method catalog"
```

---

### Task 3: Add First-Wave Expanded Configs

**Files:**
- Create: `src/core/production/methods/expanded/extraction.ts`
- Create: `src/core/production/methods/expanded/processing.ts`
- Create: `src/core/production/methods/expanded/manufacturing.ts`
- Create: `src/core/production/methods/expanded/service.ts`
- Create: `src/core/production/methods/expanded/index.ts`
- Modify: `src/core/production/methods/defaultConfigs.ts`

- [ ] **Step 1: Expose baseline variant lookup**

In `src/core/production/methods/defaultConfigs.ts`, add:

```ts
export function getDefaultBuildingProductionDefinition(
  buildingTypeId: number,
): DefaultBuildingProductionDefinition | undefined {
  return DEFAULT_BUILDING_PRODUCTION_BY_ID[buildingTypeId];
}
```

- [ ] **Step 2: Add extraction expanded configs**

Create `src/core/production/methods/expanded/extraction.ts`:

```ts
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';
import {
  getDefaultBuildingProductionDefinition,
} from '../defaultConfigs';
import type { BuildingMethodConfig } from '../types';
import { createExpandedBuildingConfig } from './common';

export function getExpandedExtractionConfig(buildingTypeId: number): BuildingMethodConfig | null {
  const production = getDefaultBuildingProductionDefinition(buildingTypeId);
  if (!production) return null;

  if (buildingTypeId === BuildingId.FARM) {
    return createExpandedBuildingConfig(
      buildingTypeId,
      production.variants,
      [
        { id: 'cultivation', name: '耕作方式', icon: '🌾', description: '影响农场产量与投入' },
        { id: 'irrigation', name: '水肥管理', icon: '💧', description: '影响能耗、化学品和产出' },
      ],
      [
        {
          slotId: 'cultivation',
          localId: 20,
          key: 'manual_cultivation',
          name: '传统耕作',
          description: '低能耗、低资本的基础农法',
        },
        {
          slotId: 'cultivation',
          localId: 21,
          key: 'mechanized_cultivation',
          name: '机械化耕作',
          outputDelta: [{ goodsId: GoodsId.GRAIN, amount: 60 }],
          energyDelta: 35,
          workforceTotalDelta: -10,
          requiredLevel: 2,
          description: '用能源和设备维护换取更高粮食产量',
        },
        {
          slotId: 'irrigation',
          localId: 30,
          key: 'rainfed',
          name: '雨养农业',
          description: '无额外投入的默认水肥管理',
        },
        {
          slotId: 'irrigation',
          localId: 31,
          key: 'precision_irrigation',
          name: '精准灌溉',
          inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 10 }],
          outputDelta: [{ goodsId: GoodsId.GRAIN, amount: 45 }],
          energyDelta: 20,
          requiredLevel: 3,
          description: '用化学品和电力稳定提高农场产出',
        },
      ],
    );
  }

  if (buildingTypeId === BuildingId.LIVESTOCK_FARM) {
    return createExpandedBuildingConfig(
      buildingTypeId,
      production.variants,
      [
        { id: 'feed', name: '饲养体系', icon: '🌽', description: '调整饲料投入和牲畜产出' },
        { id: 'health', name: '兽医管理', icon: '🧪', description: '通过药品和管理提升稳定性' },
      ],
      [
        { slotId: 'feed', localId: 20, key: 'pasture_feed', name: '牧场饲养', description: '基础畜牧饲养体系' },
        {
          slotId: 'feed',
          localId: 21,
          key: 'grain_fattening',
          name: '谷物育肥',
          inputDelta: [{ goodsId: GoodsId.GRAIN, amount: 40 }],
          outputDelta: [{ goodsId: GoodsId.LIVESTOCK, amount: 14 }],
          workforceTotalDelta: 8,
          requiredLevel: 2,
          description: '提高谷物消耗，换取更多牲畜出栏',
        },
        { slotId: 'health', localId: 30, key: 'basic_vet', name: '基础防疫', description: '基础兽医管理' },
        {
          slotId: 'health',
          localId: 31,
          key: 'pharma_vet',
          name: '药物防疫',
          inputDelta: [{ goodsId: GoodsId.GENERIC_DRUG, amount: 20 }],
          outputDelta: [{ goodsId: GoodsId.LIVESTOCK, amount: 8 }],
          requiredLevel: 3,
          description: '以药品消耗换取更高畜牧产量',
        },
      ],
    );
  }

  return null;
}
```

- [ ] **Step 3: Add processing expanded configs**

Create `src/core/production/methods/expanded/processing.ts` with the same pattern. Include:

```ts
import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';
import { getDefaultBuildingProductionDefinition } from '../defaultConfigs';
import type { BuildingMethodConfig } from '../types';
import { createExpandedBuildingConfig } from './common';

export function getExpandedProcessingConfig(buildingTypeId: number): BuildingMethodConfig | null {
  const production = getDefaultBuildingProductionDefinition(buildingTypeId);
  if (!production) return null;

  if (buildingTypeId === BuildingId.STEEL_MILL) {
    return createExpandedBuildingConfig(
      buildingTypeId,
      production.variants,
      [
        { id: 'process', name: '冶炼工艺', icon: '🔥', description: '影响钢材产出与能耗' },
      ],
      [
        { slotId: 'process', localId: 20, key: 'blast_furnace', name: '高炉流程', description: '当前基线炼钢流程' },
        {
          slotId: 'process',
          localId: 21,
          key: 'oxygen_furnace',
          name: '氧气转炉',
          outputDelta: [{ goodsId: GoodsId.STEEL, amount: 45 }],
          inputDelta: [{ goodsId: GoodsId.COAL, amount: 20 }],
          energyDelta: 80,
          requiredLevel: 2,
          description: '更高钢材产出，但提高煤炭与能耗',
        },
        {
          slotId: 'process',
          localId: 22,
          key: 'electric_arc',
          name: '电弧炉',
          outputDelta: [{ goodsId: GoodsId.STEEL, amount: 25 }],
          inputDelta: [{ goodsId: GoodsId.ELECTRICITY, amount: 8000 }],
          energyDelta: -80,
          requiredLevel: 3,
          description: '减少厂内能耗，转为直接消耗电力服务品',
        },
      ],
    );
  }

  return null;
}
```

- [ ] **Step 4: Add manufacturing and service configs**

Use the same helper shape:

```ts
// manufacturing.ts minimum first wave:
// - ELECTRONICS_FACTORY: assembly_quality slot with standard, precision, high_yield
// - BATTERY_FACTORY: chemistry slot with lfp, high_density, storage_grade
// - PARTS_FACTORY: automation slot with manual_line, cnc_line, robot_line
// - CAR_FACTORY: assembly slot with line_assembly, lean_assembly, premium_cell
// - PHARMA_FACTORY: compliance slot with standard_gmp, sterile_gmp, continuous_bioreactor

// service.ts minimum first wave:
// - POWER_PLANT: grid slot with base_load, demand_following, storage_coupled
```

Each non-default method must include at least one measurable delta and a `requiredLevel` greater than `1`.

- [ ] **Step 5: Route expanded configs**

Create `src/core/production/methods/expanded/index.ts`:

```ts
import type { BuildingMethodConfig } from '../types';
import { getExpandedExtractionConfig } from './extraction';
import { getExpandedProcessingConfig } from './processing';
import { getExpandedManufacturingConfig } from './manufacturing';
import { getExpandedServiceConfig } from './service';

const RESOLVERS = [
  getExpandedExtractionConfig,
  getExpandedProcessingConfig,
  getExpandedManufacturingConfig,
  getExpandedServiceConfig,
];

export function getExpandedBuildingMethodConfig(buildingTypeId: number): BuildingMethodConfig | null {
  for (const resolve of RESOLVERS) {
    const config = resolve(buildingTypeId);
    if (config) return config;
  }
  return null;
}
```

Then at the top of `defaultConfigs.ts`:

```ts
import { getExpandedBuildingMethodConfig } from './expanded';
```

At the start of `getDefaultBuildingMethodConfig()`:

```ts
const expanded = getExpandedBuildingMethodConfig(buildingTypeId);
if (expanded) {
  return expanded;
}
```

- [ ] **Step 6: Run focused expansion tests**

Run: `npm run test -- --run src/core/production/__tests__/ProductionMethods.expansion.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/production/methods/defaultConfigs.ts src/core/production/methods/expanded src/core/production/__tests__/ProductionMethods.expansion.test.ts
git commit -m "feat: add first-wave expanded production methods"
```

---

### Task 4: Add Balance Guardrails

**Files:**
- Modify: `src/data/__tests__/supplyChainBalance.test.ts`

- [ ] **Step 1: Add a default-recipe non-negative guard**

Append this test to `supplyChainBalance.test.ts`:

```ts
it('expanded default recipes do not create negative final flows', () => {
  const invalid: string[] = [];

  for (const building of ALL_BUILDINGS) {
    const variants = getBuildingProductionVariants(building.id);
    if (variants.length === 0) continue;

    for (const variant of variants) {
      for (const input of variant.recipe.inputs) {
        if (!Number.isFinite(input.amount) || input.amount <= 0) {
          invalid.push(`${building.name} input ${input.goodsId}=${input.amount}`);
        }
      }
      for (const output of variant.recipe.outputs) {
        if (!Number.isFinite(output.amount) || output.amount <= 0) {
          invalid.push(`${building.name} output ${output.goodsId}=${output.amount}`);
        }
      }
      if (!Number.isFinite(variant.recipe.energyRequired) || variant.recipe.energyRequired < 0) {
        invalid.push(`${building.name} energy=${variant.recipe.energyRequired}`);
      }
    }
  }

  expect(invalid).toEqual([]);
});
```

- [ ] **Step 2: Add first-wave extreme ratio guard**

Append:

```ts
it('first-wave expanded defaults keep deployed goods below a 500:1 supply-demand ratio', () => {
  const { supply, productionDemand } = aggregateDeployedFlows();
  const extreme: string[] = [];

  for (const def of ALL_GOODS) {
    if (def.isService) continue;
    const s = supply.get(def.id) ?? 0;
    const d = productionDemand.get(def.id) ?? 0;
    if (s <= 0 || d <= 0) continue;
    const ratio = s / d;
    if (ratio > 500 || ratio < 0.002) {
      extreme.push(`${def.name}#${def.id}: supply=${s.toFixed(2)}, demand=${d.toFixed(2)}, ratio=${ratio.toExponential(2)}`);
    }
  }

  expect(extreme).toEqual([]);
});
```

- [ ] **Step 3: Run balance tests**

Run: `npm run test -- --run src/data/__tests__/supplyChainBalance.test.ts`

Expected: PASS. If FAIL, tune only the newly introduced deltas, not unrelated economy constants.

- [ ] **Step 4: Commit**

```bash
git add src/data/__tests__/supplyChainBalance.test.ts
git commit -m "test: guard expanded production method balance"
```

---

### Task 5: Verify UI Handles Expanded Slots

**Files:**
- Modify: `src/ui/components/Production/__tests__/ProductionMethodsPanel.test.tsx`

- [ ] **Step 1: Add locked-method rendering test**

Append:

```tsx
it('renders locked expanded slot methods without dropping final recipe totals', () => {
  getSlotAvailableMethodsMock.mockImplementation((_buildingTypeId: number, slotId: string) => {
    if (slotId !== 'workforce') return [];
    return [
      {
        id: 10002,
        key: 'workers_1',
        name: '熟练工人',
        buildingTypeId: 1,
        slotId: 'workforce',
        inputDelta: [{ goodsId: 3, amount: 5 }],
        outputDelta: [{ goodsId: 1, amount: 24 }],
        workforceDelta: { basic: 1, technical: 0, management: 0 },
        energyDelta: 0,
        ticksRequired: 1,
        requiredLevel: 2,
        switchCost: 0,
        switchCooldown: 0,
        description: '提升品质但增加辅料',
      },
    ];
  });

  const html = renderToStaticMarkup(
    React.createElement(ProductionMethodsPanel, {
      buildingId: 0,
      buildingTypeId: 1,
      buildingLevel: 1,
    }),
  );

  expect(html).toContain('最终投入产出');
  expect(html).toContain('41');
  expect(html).toContain('煤炭');
  expect(html).toContain('石灰');
});
```

- [ ] **Step 2: Run UI test**

Run: `npm run test -- --run src/ui/components/Production/__tests__/ProductionMethodsPanel.test.tsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/Production/__tests__/ProductionMethodsPanel.test.tsx
git commit -m "test: cover expanded production method UI"
```

---

### Task 6: Retire The Superseded Migration Plan

**Files:**
- Modify: `docs/refactor/production-methods-migration-plan.md`

- [ ] **Step 1: Add superseded banner**

At the top of `docs/refactor/production-methods-migration-plan.md`, add:

```md
> Superseded on 2026-05-03 by `docs/superpowers/plans/2026-05-03-production-methods-expansion.md`.
> The orphan directory migration described here has already been completed in the current codebase.
> Use the expansion plan for future production-method work.
```

- [ ] **Step 2: Commit**

```bash
git add docs/refactor/production-methods-migration-plan.md docs/superpowers/plans/2026-05-03-production-methods-expansion.md
git commit -m "docs: plan expanded production methods"
```

---

### Task 7: Full Verification

**Files:**
- No source edits.

- [ ] **Step 1: Run all production-related tests**

Run:

```bash
npm run test -- --run src/core/production src/core/construction src/core/save src/data/__tests__/supplyChainBalance.test.ts src/ui/components/Production
```

Expected: PASS.

- [ ] **Step 2: Run typecheck and build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS. If existing unrelated lint errors appear, record them separately and do not hide them with broad disable comments.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

Open the production page and verify:

- Farm shows at least `生产方式`, `耕作方式`, and `水肥管理`.
- Steel mill shows `生产方式` and `冶炼工艺`.
- Switching a method changes `最终投入产出`.
- Locked methods show their level requirement and cannot be selected below the required building level.

---

## Follow-Up Waves

After the first wave passes, expand the remaining non-retail buildings in batches:

- Wave 2: all remaining extraction buildings.
- Wave 3: all remaining processing buildings.
- Wave 4: all remaining manufacturing buildings.
- Wave 5: luxury and service tuning.

Each wave should add coverage entries to `EXPANSION_TARGETS`, run the same tests, and keep production variants backward-compatible through the `production` slot.

## Self-Review

- Spec coverage: The plan covers registry, data catalog, UI rendering, legacy variants, save compatibility by avoiding schema changes, balance tests, docs, and verification.
- Placeholder scan: The only intentionally deferred section is `Follow-Up Waves`, which is out of scope for the first implementation wave and has a concrete process.
- Type consistency: All new helpers use existing `BuildingMethodConfig`, `BuildingProductionMethod`, `RecipeDelta`, `BuildingProductionVariantDefinition`, and registry APIs.
- Risk: Circular imports are possible because `defaultConfigs.ts` imports `expanded/index.ts` while expanded files import baseline definitions from `defaultConfigs.ts`. If this causes runtime initialization issues, move `DEFAULT_BUILDING_PRODUCTION_BY_ID`, `workforceFor`, and related interfaces into `src/core/production/methods/baselineCatalog.ts`, then import that module from both `defaultConfigs.ts` and `expanded/*`.
