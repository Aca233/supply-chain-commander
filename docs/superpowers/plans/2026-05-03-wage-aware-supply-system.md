# Wage-Aware Supply System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild supply economics so wages, maintenance, energy, input costs, production recipes, AI supply decisions, and supply-chain balance tests use one consistent wage-aware model.

**Architecture:** Add a focused `ProductionEconomics` module that calculates daily recipe economics from current prices, real market wages, wage multipliers, recipe inputs/outputs, maintenance, and energy. Refactor `SupplyCurve` to consume that module instead of its hard-coded fixed-cost and square-root wage model. Recalibrate the production catalog so baseline production methods remain viable after payroll became a major cash flow.

**Tech Stack:** TypeScript, Vitest, existing React/Vite game core, existing production registry and labor system.

---

## Files

- Create: `src/core/economy/ProductionEconomics.ts`
  - Shared wage-aware unit economics and break-even helpers.
- Create: `src/core/economy/__tests__/ProductionEconomics.test.ts`
  - Tests for wage inclusion, wage multipliers, break-even price, and baseline viability.
- Modify: `src/core/economy/SupplyCurve.ts`
  - Replace hard-coded fixed cost and `sqrt(quantity)` wage estimate with `ProductionEconomics`.
- Create: `src/core/economy/__tests__/SupplyCurve.wageAware.test.ts`
  - Tests that supply decisions respond to wages and use recipe output units.
- Modify: `src/core/production/methods/defaultConfigs.ts`
  - Recalibrate baseline production quantities for wage-aware viability.
- Modify: `src/data/__tests__/supplyChainBalance.test.ts`
  - Tighten guardrails now that the model can prove wage-aware viability.

---

## Tasks

### Task 1: Add Failing Wage-Aware Economics Tests

- [ ] Create `ProductionEconomics.test.ts` with tests that import `calculateProductionEconomicsForRecipe` and `calculateBuildingOutputUnitEconomics`.
- [ ] Verify RED with `npm run test -- --run src/core/economy/__tests__/ProductionEconomics.test.ts`; expected failure is missing module/export.

### Task 2: Implement `ProductionEconomics`

- [ ] Create `ProductionEconomics.ts`.
- [ ] Compute daily revenue from recipe outputs at current world prices.
- [ ] Compute daily input cost from recipe inputs at current world prices.
- [ ] Compute daily maintenance from `BuildingTypeDefinition.maintenanceCost`.
- [ ] Compute daily energy cost as `building.energyCost + recipe.energyRequired`.
- [ ] Compute daily wage cost from `recipe.workforceRequired × world.labor.marketWages × building wage multipliers`.
- [ ] Expose output-unit break-even cost with byproduct revenue credit.
- [ ] Verify GREEN with `npm run test -- --run src/core/economy/__tests__/ProductionEconomics.test.ts`.

### Task 3: Refactor Supply Curve Onto Shared Economics

- [ ] Add `SupplyCurve.wageAware.test.ts`.
- [ ] Verify RED; expected failure is that existing supply decisions do not respond consistently to wage multipliers or output unit quantities.
- [ ] Update `SupplyCurve.ts` so `calculateCostStructure`, `getMarginalCostParams`, and `calculateOptimalQuantity` use `ProductionEconomics`.
- [ ] Verify GREEN with both economy test files.

### Task 4: Recalibrate Production Catalog

- [ ] Add a wage-aware baseline viability test covering every non-retail production variant.
- [ ] Verify RED; current catalog has known negative-margin variants after payroll.
- [ ] Adjust only production quantities in `defaultConfigs.ts` unless a base price is clearly wrong for the whole economy.
- [ ] Target baseline profit bands: raw/agriculture 8%-25%, processing 10%-35%, manufacturing 12%-45%, luxury/high-tech can be wider but must not be negative at base prices.
- [ ] Verify GREEN with `ProductionEconomics.test.ts` and `supplyChainBalance.test.ts`.

### Task 5: Tighten Supply-Chain Guardrails

- [ ] Remove now-healthy goods from broad imbalance exceptions where tests prove they are stable.
- [ ] Keep institutional goods explicit rather than hiding them as generic imbalance.
- [ ] Add regression coverage for plastic and diamond shortages.
- [ ] Verify with `npm run test -- --run src/data/__tests__/supplyChainBalance.test.ts`.

### Task 6: Full Verification

- [ ] Run `npm run test -- --run src/core/economy src/core/production src/data/__tests__/supplyChainBalance.test.ts src/core/ai/__tests__/AIProductionOptimizer.test.ts`.
- [ ] Run `npm run build`.
- [ ] Report any existing unrelated failures separately.

---

## Notes

- Do not reintroduce `building.laborCost` as an operating-cost deduction; payroll is already handled by `LaborSystem`.
- The point is not to make every method equally profitable. The point is to make baseline supply decisions, AI expansion, and production data speak the same cost language.
- The current dirty worktree contains many unrelated edits. Keep this change scoped to files listed above.
