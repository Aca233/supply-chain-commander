# Economy 80 Goods Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the runtime economy operate on the real 80-goods catalog, then repair startup seeding, AI market support, substitution demand, and liquidity flow so the cold-chain and cash-circulation regressions pass.

**Architecture:** Keep storage arrays compatible with existing capacity, but move all business logic onto a single active-goods domain derived from the current goods catalog. Fix the three code paths that still encode the retired goods table: startup inventory/bootstrap supply, AI strategic support, and substitution relations; then rebalance household liquidity just enough to restore cash circulation under the day model.

**Tech Stack:** TypeScript, Vitest, SoA game state in `src/core/world`, economy loop in `src/core/loop`, market/AI systems in `src/core/economy` and `src/core/ai`

---

### Task 1: Lock the 80-goods runtime contract with failing tests

**Files:**
- Create: `src/core/economy/__tests__/SubstitutionSystem.goodsDomain.test.ts`
- Modify: `src/core/world/__tests__/WorldInitializer.market.test.ts`
- Test: `src/core/loop/__tests__/GameLoop.marketCoverage.test.ts`
- Test: `src/core/loop/__tests__/GameLoop.retailLiquidityRegression.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('seeds bootstrap retail and building-material goods from the current GoodsId table', () => {
  const world = initializeWorld();
  expect(world.goods.count).toBe(ALL_GOODS.length);
  expect(world.goods.count).toBe(80);
  expect(world.companies.inventories[18]).toBeGreaterThanOrEqual(0);
});

it('only defines substitution relations inside the active goods domain', () => {
  const invalidRelations = getAllSubstitutionRelations().filter(
    relation => relation.goodsA >= ALL_GOODS.length || relation.goodsB >= ALL_GOODS.length,
  );
  expect(invalidRelations).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/world/__tests__/WorldInitializer.market.test.ts src/core/economy/__tests__/SubstitutionSystem.goodsDomain.test.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.retailLiquidityRegression.test.ts`

Expected: FAIL because the bootstrap mappings still use stale numeric IDs, substitution still references legacy goods, and the two long-running loop regressions still fail.

- [ ] **Step 3: Write the minimal test hooks needed by production code**

```ts
export function getAllSubstitutionRelations(): readonly SubstitutionRelation[] {
  return SUBSTITUTION_RELATIONS;
}
```

- [ ] **Step 4: Run tests to confirm the failures are now behavioral, not missing-export errors**

Run: `npx vitest run src/core/economy/__tests__/SubstitutionSystem.goodsDomain.test.ts`

Expected: FAIL with invalid relation IDs or mismatched semantics, not import/runtime errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/world/__tests__/WorldInitializer.market.test.ts src/core/economy/__tests__/SubstitutionSystem.goodsDomain.test.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.retailLiquidityRegression.test.ts src/core/economy/SubstitutionSystem.ts
git commit -m "test: lock 80-goods economy regressions"
```

### Task 2: Unify active goods iteration and replace legacy bootstrap IDs

**Files:**
- Modify: `src/core/constants.ts`
- Modify: `src/data/goods.ts`
- Modify: `src/core/world/GameWorld.ts`
- Modify: `src/core/world/WorldInitializer.ts`
- Test: `src/core/world/__tests__/WorldInitializer.market.test.ts`

- [ ] **Step 1: Write the failing bootstrap test assertions**

```ts
expect(world.goods.count).toBe(ALL_GOODS.length);
expect(world.companies.inventories[1 * GOODS_COUNT + GoodsId.STEEL]).toBeGreaterThan(0);
expect(world.companies.inventories[1 * GOODS_COUNT + GoodsId.CEMENT]).toBeGreaterThan(0);
expect(world.companies.inventories[1 * GOODS_COUNT + GoodsId.MEDICAL_SUPPLIES]).toBeGreaterThanOrEqual(0);
```

- [ ] **Step 2: Run the bootstrap tests to verify they fail**

Run: `npx vitest run src/core/world/__tests__/WorldInitializer.market.test.ts`

Expected: FAIL because at least one seeded goods slot still points at the retired goods table.

- [ ] **Step 3: Replace semantic goods-count usage and legacy startup goods IDs**

```ts
export const GOODS_CAPACITY = 128;
export const GOODS_COUNT = ALL_GOODS.length;

const buildingMaterialsInit = [
  { goodsId: GoodsId.STEEL, amount: 2000 + Math.random() * 3000 },
  { goodsId: GoodsId.CEMENT, amount: 1500 + Math.random() * 2000 },
  { goodsId: GoodsId.TIMBER, amount: 800 + Math.random() * 1200 },
  { goodsId: GoodsId.GLASS, amount: 600 + Math.random() * 800 },
  { goodsId: GoodsId.BUILDING_MATERIALS, amount: 800 + Math.random() * 1200 },
  { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 300 + Math.random() * 400 },
];
```

- [ ] **Step 4: Run the bootstrap tests to verify they pass**

Run: `npx vitest run src/core/world/__tests__/WorldInitializer.market.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/constants.ts src/data/goods.ts src/core/world/GameWorld.ts src/core/world/WorldInitializer.ts src/core/world/__tests__/WorldInitializer.market.test.ts
git commit -m "fix: align bootstrap economy to 80 active goods"
```

### Task 3: Repair AI strategic support and substitution semantics

**Files:**
- Modify: `src/core/ai/AIDecisionEngine.ts`
- Modify: `src/core/economy/SubstitutionSystem.ts`
- Modify: `src/core/economy/PriceEngine.ts`
- Modify: `src/core/loop/GameLoop.ts`
- Create: `src/core/economy/__tests__/SubstitutionSystem.goodsDomain.test.ts`
- Test: `src/core/ai/__tests__/AIDecisionEngine.marketSupport.test.ts`

- [ ] **Step 1: Write the failing relation-domain assertions**

```ts
for (const relation of getAllSubstitutionRelations()) {
  expect(relation.goodsA).toBeLessThan(ALL_GOODS.length);
  expect(relation.goodsB).toBeLessThan(ALL_GOODS.length);
}
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run src/core/economy/__tests__/SubstitutionSystem.goodsDomain.test.ts src/core/ai/__tests__/AIDecisionEngine.marketSupport.test.ts`

Expected: FAIL because substitution still contains retired IDs and strategic support still monitors wrong goods.

- [ ] **Step 3: Rewrite strategic materials and substitution relations against `GoodsId.*`, then remove duplicate substitution application**

```ts
const STRATEGIC_BUILDING_MATERIALS = [
  { goodsId: GoodsId.STEEL, buildingTypeId: BuildingId.STEEL_MILL, minSupply: 500 },
  { goodsId: GoodsId.CEMENT, buildingTypeId: BuildingId.CEMENT_PLANT, minSupply: 500 },
  { goodsId: GoodsId.GLASS, buildingTypeId: BuildingId.GLASS_FACTORY, minSupply: 300 },
];

simulateConsumerDemand(this.world, seasonalMultipliers, categoryMultipliers);
// remove the extra applyMarketSubstitution() call from GameLoop.processTick()
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npx vitest run src/core/economy/__tests__/SubstitutionSystem.goodsDomain.test.ts src/core/ai/__tests__/AIDecisionEngine.marketSupport.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/ai/AIDecisionEngine.ts src/core/economy/SubstitutionSystem.ts src/core/economy/PriceEngine.ts src/core/loop/GameLoop.ts src/core/economy/__tests__/SubstitutionSystem.goodsDomain.test.ts src/core/ai/__tests__/AIDecisionEngine.marketSupport.test.ts
git commit -m "fix: repair strategic support and substitution on 80-goods domain"
```

### Task 4: Restore cold-chain activation and firm liquidity under the day model

**Files:**
- Modify: `src/core/world/WorldInitializer.ts`
- Modify: `src/core/loop/GameLoop.ts`
- Test: `src/core/loop/__tests__/GameLoop.marketCoverage.test.ts`
- Test: `src/core/loop/__tests__/GameLoop.retailLiquidityRegression.test.ts`

- [ ] **Step 1: Keep the existing long-running regressions as the red tests**

```ts
expect(tradeCounts.get(GoodsId.MEDICAL_SUPPLIES) ?? 0).toBeGreaterThan(0);
expect(householdCash).toBeLessThanOrEqual(companyCash * 2);
```

- [ ] **Step 2: Run the long-running regressions to verify they fail**

Run: `npx vitest run src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.retailLiquidityRegression.test.ts`

Expected: FAIL because the medical-supplies chain still goes cold and household cash still hoards.

- [ ] **Step 3: Make the minimal liquidity and activation fixes**

```ts
world.households.cash[0] = INITIAL_MONEY_SUPPLY * 0.55;

const remainingLiquidity = INITIAL_MONEY_SUPPLY - world.households.cash[0];
for (let companyId = 1; companyId < world.companies.count; companyId++) {
  world.companies.cash[companyId] += remainingLiquidity / Math.max(1, world.companies.count - 1);
}
```

- [ ] **Step 4: Run the long-running regressions to verify they pass**

Run: `npx vitest run src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.retailLiquidityRegression.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/world/WorldInitializer.ts src/core/loop/GameLoop.ts src/core/loop/__tests__/GameLoop.marketCoverage.test.ts src/core/loop/__tests__/GameLoop.retailLiquidityRegression.test.ts
git commit -m "fix: restore 80-goods market coverage and liquidity flow"
```

### Task 5: Run the final regression sweep

**Files:**
- Test: `src/core/economy/__tests__`
- Test: `src/core/finance/__tests__`
- Test: `src/core/loop/__tests__`
- Test: `src/core/world/__tests__`

- [ ] **Step 1: Run the focused economy regression suite**

Run: `npx vitest run src/core/economy/__tests__ src/core/finance/__tests__ src/core/loop/__tests__ src/core/world/__tests__`

Expected: PASS

- [ ] **Step 2: Inspect failures and fix only regression fallout**

```ts
if (failure.isUnrelated) {
  throw new Error('stop and reassess before broadening scope');
}
```

- [ ] **Step 3: Re-run the full focused suite after fallout fixes**

Run: `npx vitest run src/core/economy/__tests__ src/core/finance/__tests__ src/core/loop/__tests__ src/core/world/__tests__`

Expected: PASS

- [ ] **Step 4: Record the verification evidence in the final summary**

```md
- market coverage regression: pass
- retail liquidity regression: pass
- focused economy/finance/loop/world suite: pass
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-04-30-economy-80-goods-unification.md
git commit -m "docs: add economy 80-goods implementation plan"
```
