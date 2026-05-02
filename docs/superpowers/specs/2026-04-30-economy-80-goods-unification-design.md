# Economy 80 Goods Unification Design

**Goal:** Repair the economy simulation by making the runtime treat the current `80` defined goods as the only active business goods, then fix the dependent initialization, AI, demand-substitution, and liquidity behavior that still assumes the old goods map.

## Root Causes

- Runtime storage still reserves `128` goods slots, but parts of the simulation iterate or reason against `80`, while other code still hardcodes legacy goods IDs from an older goods table.
- `WorldInitializer.ts` seeds startup inventories and building-material sell orders with stale numeric IDs that no longer map to the intended goods.
- `AIDecisionEngine.ts` strategic material support still monitors legacy IDs, so cold or missing supply gets repaired for the wrong goods.
- `SubstitutionSystem.ts` contains many invalid legacy relationships and is applied twice per tick, which distorts demand and can collapse valid supply chains.
- Household liquidity starts too concentrated in the household pool relative to the daily day-model consumption cadence, so firms cannot reclaim enough money through sales.

## Decisions

- Keep array capacity separate from business goods count.
- Treat `ALL_GOODS.length` / actual goods count as the single source of truth for all market-facing loops, demand logic, and AI decisions.
- Keep low-level storage arrays able to hold existing capacity, but stop using `128` as the semantic goods domain for live economy logic.
- Replace stale hardcoded numeric goods IDs with `GoodsId.*` wherever startup inventories, emergency market support, and substitution logic depend on specific goods.
- Apply substitution exactly once in the tick pipeline.
- Rebalance initial household liquidity only enough to restore money circulation; do not redesign the macro model beyond what is needed to make the existing economy loop stable.

## Scope

- `src/core/constants.ts`
- `src/data/goods.ts`
- `src/core/world/GameWorld.ts`
- `src/core/world/WorldInitializer.ts`
- `src/core/ai/AIDecisionEngine.ts`
- `src/core/economy/SubstitutionSystem.ts`
- `src/core/economy/PriceEngine.ts`
- `src/core/loop/GameLoop.ts`
- Focused regression tests under `src/core/world/__tests__`, `src/core/economy/__tests__`, and `src/core/loop/__tests__`

## Implementation Outline

1. Introduce an explicit distinction between storage capacity and active goods count, then align market and AI iteration logic to active goods count only.
2. Replace legacy startup building-material definitions in `WorldInitializer.ts` with current `GoodsId.*` mappings for steel, cement, glass, timber, electronics, pharma, energy, and retail-facing goods.
3. Replace `STRATEGIC_BUILDING_MATERIALS` legacy IDs in `AIDecisionEngine.ts` with current goods mappings that reflect the real 80-goods chain.
4. Rewrite substitution relations so every referenced goods ID exists in the current goods table and every relation matches the current product taxonomy.
5. Remove duplicate substitution application from the main loop so demand is adjusted once after demand generation.
6. Adjust initial household money distribution or early-cycle cash recirculation constants so multi-year simulations do not strand most cash in households.
7. Add or update regression tests for:
   - startup building-material seeding uses valid current goods IDs
   - substitution graph references only active goods IDs
   - medical supplies and other cold chains activate within 360 ticks
   - household cash remains bounded relative to company cash through year 3

## Verification Target

- No runtime economy logic depends on legacy ghost goods beyond the 80 defined goods.
- Medical supplies, OTC drugs, solar systems, clothing fabric, and organic food all produce retained trades within the existing 360-tick market coverage scenario.
- The retail liquidity regression no longer leaves household cash vastly larger than firm cash by year 3.
- No substitution relation references nonexistent or semantically wrong goods IDs from the retired goods table.
