# Victoria 3 Style Production Methods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Victoria 3 style production method slots to the first wave of 16 key non-retail buildings while preserving existing product variants and wage-aware supply balance.

**Architecture:** Keep the current registry and `computeRecipe()` model: each selected method contributes absolute input/output/workforce/energy deltas. Route selected first-wave buildings from `getDefaultBuildingMethodConfig()` to expanded catalog builders that generate the existing `production` slot plus `secondary`, `refining`, `automation`, or `utility` slots. Default selections are zero-effect methods so existing baseline recipes remain stable.

**Tech Stack:** TypeScript, Vite, Vitest, existing production registry under `src/core/production/methods`.

---

## Files

- Create: `src/core/production/__tests__/ProductionMethods.expansion.test.ts`
  - Locks first-wave slot count, legacy production variants, non-production composition, and unlock levels.
- Modify: `src/core/production/methods/defaultConfigs.ts`
  - Export baseline variant helpers and route expanded configs before default single-slot configs.
- Create: `src/core/production/methods/expanded/common.ts`
  - Shared helpers for turning baseline variants into `production` methods and adding extra slot methods.
- Create: `src/core/production/methods/expanded/index.ts`
  - First-wave expanded catalog definitions and `getExpandedBuildingMethodConfig()`.
- Existing validation:
  - `src/core/economy/__tests__/ProductionEconomics.test.ts`
  - `src/data/__tests__/supplyChainBalance.test.ts`

## Task 1: Red Tests

- [ ] Add `ProductionMethods.expansion.test.ts`.
- [ ] Run `npm run test -- --run src/core/production/__tests__/ProductionMethods.expansion.test.ts`.
- [ ] Expected result: fail because first-wave buildings still expose only one slot and expanded methods do not exist.

## Task 2: Catalog Helpers

- [ ] Export `workforceFor`, `toDelta`, and `DEFAULT_BUILDING_PRODUCTION_BY_ID` from `defaultConfigs.ts`.
- [ ] Add `expanded/common.ts` with:
  - `ExtraSlotDefinition`
  - `ExtraMethodDefinition`
  - `createExpandedConfig()`
  - `workforceDelta()`
- [ ] Run the red expansion test again.
- [ ] Expected result: still fail because no expanded configs are routed yet.

## Task 3: First-Wave Expanded Catalog

- [ ] Add `expanded/index.ts`.
- [ ] Implement expanded configs for:
  - `FARM`, `LIVESTOCK_FARM`, `FISHERY`, `IRON_MINE`, `LITHIUM_MINE`, `RARE_EARTH_MINE`
  - `STEEL_MILL`, `CHEMICAL_PLANT`, `FOOD_FACTORY`, `MEAT_PROCESSING`
  - `ELECTRONICS_FACTORY`, `BATTERY_FACTORY`, `PARTS_FACTORY`, `CAR_FACTORY`, `PHARMA_FACTORY`
  - `POWER_PLANT`
- [ ] Include Victoria 3 style slots:
  - `secondary`
  - `refining`
  - `automation`
  - `utility`
- [ ] Default method in every non-production slot must have zero deltas.

## Task 4: Route Expanded Configs

- [ ] Import `getExpandedBuildingMethodConfig()` in `defaultConfigs.ts`.
- [ ] Return expanded config first in `getDefaultBuildingMethodConfig()`.
- [ ] Run `npm run test -- --run src/core/production/__tests__/ProductionMethods.expansion.test.ts`.
- [ ] Expected result: pass.

## Task 5: Balance Verification

- [ ] Run `npm run test -- --run src/core/economy/__tests__/ProductionEconomics.test.ts src/data/__tests__/supplyChainBalance.test.ts`.
- [ ] Run `npm run test -- --run src/core/production`.
- [ ] Run `npm run build`.
- [ ] Expected result: all commands pass.

## Self-Review

- Spec coverage: the plan covers first-wave buildings, Vic3-style slot categories, default stability, ownership exclusion, and balance tests.
- Placeholder scan: no placeholder implementation steps remain.
- Type consistency: helper names match existing registry types and `defaultConfigs.ts` exports.
