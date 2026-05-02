# Startup Retail Inactive Design

**Goal:** Keep the player's starter convenience store, but make it start closed so the opening day stays production-led and does not incur zero-revenue retail operating loss.

## Decision

Use the existing `world.buildings.isActive` flag as the single source of truth.

- The player still starts with one convenience store.
- That starter store is registered in the retail system with zero stock.
- The starter store begins with `isActive = 0`.
- Inactive retail stores do not receive deliveries, do not restock, do not sell, do not affect retail availability, and do not generate operating costs.
- When the player manually re-enables the building through the existing building toggle, the store returns to normal retail behavior without special-case code.

## Files In Scope

- `src/core/world/WorldInitializer.ts`
- `src/core/finance/OperatingCosts.ts`
- `src/core/economy/ConsumerMarket.ts`
- `src/core/economy/RetailSystem.ts`
- `src/core/world/__tests__/WorldInitializer.market.test.ts`
- `src/core/finance/__tests__/OperatingCosts.test.ts`
- `src/core/economy/__tests__/RetailDelivery.test.ts`
- `src/core/economy/__tests__/RetailSalesActivation.test.ts`

## Verification Target

- The player still has a starter convenience store at retail slot `0`.
- That store starts inactive and with zero retail stock.
- Day-one operating cost no longer includes the convenience store while it is inactive.
- Once reactivated, the store can receive stock and produce retail sales again.
