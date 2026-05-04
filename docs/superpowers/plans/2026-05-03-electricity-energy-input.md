# Electricity Energy Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make production method energy demand consume the `电力` goods instead of acting as a separate abstract cash cost.

**Architecture:** Keep `energyRequired` as recipe metadata for UI and AI scoring, but inject it into final recipe inputs as `GoodsId.ELECTRICITY` for non-power-producing recipes. Production, input buffers, shortage behavior, and market pricing then reuse the existing goods input pipeline. Legacy abstract energy cash costs are no longer charged in operating/economics calculations to avoid double counting.

**Tech Stack:** TypeScript, Vitest, existing production method registry and economy modules.

---

### Task 1: Recipe Composition

**Files:**
- Modify: `src/core/production/methods/registry.ts`
- Test: `src/core/production/__tests__/ProductionMethods.expansion.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests proving steel mill energy appears as `GoodsId.ELECTRICITY` input and power plants do not consume electricity.

- [ ] **Step 2: Implement minimal code**

In `computeRecipe`, after summing method inputs/outputs/energy, add `energyRequired` to the electricity input map unless the recipe outputs electricity.

- [ ] **Step 3: Verify**

Run `npm run test -- --run src/core/production/__tests__/ProductionMethods.expansion.test.ts`.

### Task 2: Cost De-Duplication

**Files:**
- Modify: `src/core/economy/ProductionEconomics.ts`
- Modify: `src/core/finance/OperatingCosts.ts`
- Test: `src/core/economy/__tests__/ProductionEconomics.test.ts`
- Test: `src/core/finance/__tests__/OperatingCosts.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests proving electricity contributes through `inputCost`, while legacy abstract `energyCost` is zero in production economics and operating cash costs.

- [ ] **Step 2: Implement minimal code**

Set abstract energy cost to zero in recipe economics and remove recurring operating energy cash deductions.

- [ ] **Step 3: Verify**

Run the production, economy, and operating cost tests, then run `npm run build`.
