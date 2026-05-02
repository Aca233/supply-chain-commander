# Startup Retail Inactive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the starter convenience store while preventing day-one zero-revenue retail losses by starting that store inactive.

**Architecture:** Reuse the existing building activation flag instead of adding a retail-only state. World initialization marks the player starter retail building inactive, then retail servicing and operating-cost code respect inactive buildings consistently.

**Tech Stack:** TypeScript, Vitest, Zustand-adjacent world state, day-based game loop

---

### Task 1: Lock Down Expected Startup Behavior

**Files:**
- Modify: `src/core/world/__tests__/WorldInitializer.market.test.ts`
- Modify: `src/core/finance/__tests__/OperatingCosts.test.ts`
- Modify: `src/core/economy/__tests__/RetailDelivery.test.ts`
- Modify: `src/core/economy/__tests__/RetailSalesActivation.test.ts`

- [ ] **Step 1: Write failing tests**

Add assertions that:

```ts
expect(world.buildings.isActive[retailBuildingId]).toBe(0);
```

```ts
world.buildings.isActive[inactiveBuildingId] = 0;
expect(calculateCompanyOperatingCostPerTick(world, 0).total).toBeCloseTo(activeOnlyCost);
```

```ts
expect(processRetailDelivery(world)).toBe(0);
world.buildings.isActive[retailBuildingId] = 1;
expect(processRetailDelivery(world)).toBeGreaterThanOrEqual(1);
```

```ts
expect(totalSalesWhileInactive).toBe(0);
world.buildings.isActive[playerRetailBuildingId] = 1;
expect(totalSalesAfterActivation).toBeGreaterThan(0);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/core/world/__tests__/WorldInitializer.market.test.ts src/core/finance/__tests__/OperatingCosts.test.ts src/core/economy/__tests__/RetailDelivery.test.ts src/core/economy/__tests__/RetailSalesActivation.test.ts --run
```

Expected: failing assertions because starter retail is active and inactive buildings still participate in cost/delivery/sales paths.

### Task 2: Implement Inactive Starter Retail Behavior

**Files:**
- Modify: `src/core/world/WorldInitializer.ts`
- Modify: `src/core/finance/OperatingCosts.ts`
- Modify: `src/core/economy/ConsumerMarket.ts`
- Modify: `src/core/economy/RetailSystem.ts`

- [ ] **Step 1: Mark starter retail inactive at initialization**

```ts
if (playerRetailBuildingId >= 0) {
  world.buildings.isActive[playerRetailBuildingId] = 0;
  registerRetailStore(world, playerRetailBuildingId, { initialInventoryRatio: 0 });
}
```

- [ ] **Step 2: Exclude inactive buildings from operating costs**

```ts
if (world.buildings.owners[buildingId] !== companyId) continue;
if (!world.buildings.isActive[buildingId]) continue;
```

- [ ] **Step 3: Skip inactive retail stores in retail-serving code**

Apply the same guard anywhere a retail store is considered operational:

```ts
function isRetailStoreOperational(world: GameWorld, retailId: number): boolean {
  const buildingId = world.retail.buildingIds[retailId];
  return world.buildings.isActive[buildingId] === 1;
}
```

Use it before delivery, restocking, cache population, sales availability, wholesale supply, and reputation updates.

### Task 3: Verify and Clean Up

**Files:**
- Test: `src/core/world/__tests__/WorldInitializer.market.test.ts`
- Test: `src/core/finance/__tests__/OperatingCosts.test.ts`
- Test: `src/core/economy/__tests__/RetailDelivery.test.ts`
- Test: `src/core/economy/__tests__/RetailSalesActivation.test.ts`

- [ ] **Step 1: Run focused regression tests**

Run:

```bash
npm test -- src/core/world/__tests__/WorldInitializer.market.test.ts src/core/finance/__tests__/OperatingCosts.test.ts src/core/economy/__tests__/RetailDelivery.test.ts src/core/economy/__tests__/RetailSalesActivation.test.ts --run
```

Expected: PASS

- [ ] **Step 2: Recompute startup cash behavior**

Run:

```bash
node_modules/.bin/vite-node --script <temporary-check-script>
```

Expected: player still owns a starter convenience store, but day-one cost excludes it while inactive.
