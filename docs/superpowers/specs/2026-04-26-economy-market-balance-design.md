# Economy And Market Balance Repair Design

## Background

The current economy can keep running, but it relies too heavily on bootstrap inventory, forced supply-chain intervention, and fallback pricing behavior. This causes the UI and macro data to feel unreliable even when the simulation does not immediately collapse.

Recent investigation found three high-impact distortions:

1. GDP is overstated because market trade value is added together with retail revenue and service revenue, even though retail and service activity already represent final demand.
2. Retail stores can begin with artificial full inventory and keep pricing from static base prices instead of real replenishment cost.
3. Zero-supply and cold-goods AI construction interventions fire on fixed cadences, which masks whether the market is actually self-sustaining.

## Goals

1. Make macro indicators better reflect real final-demand activity.
2. Make retail inventory and pricing respond to actual supply conditions.
3. Reduce long-run dependence on forced market correction while preserving opening-game survivability.
4. Keep existing short-run market coverage and opening stability safeguards intact.

## Non-Goals

1. Rebuilding the entire labor, wage, and employment model in this iteration.
2. Removing all bootstrap behavior from world initialization.
3. Turning the system into a fully realistic macroeconomic simulator.

## Problems To Solve

### 1. GDP Double Counting

`GameLoop.updateGDP()` currently sums rolling trade ledger value and then adds rolling retail and service revenue again. This mixes intermediate-goods turnover with final-demand channels and causes GDP to overstate output.

### 2. Retail Unrealism

Retail registration gives non-new stores full starting stock by default. Retail price adjustment also recomputes prices from `basePrice * (1 + markup)` instead of using actual purchase cost as the primary anchor. This weakens scarcity signals and lets stores appear healthy even when the supply chain is not.

### 3. Overactive Forced Supply Support

`zero_supply_forced` and `cold_goods_supply` decisions currently run on fixed schedules and can directly create production expansion before market conditions have had enough time to respond on their own. This makes coverage look better than the underlying profitability and liquidity conditions justify.

## Proposed Design

### A. GDP Should Track Final Demand Once

GDP should be computed from final-demand channels only:

1. Direct consumer purchases from the market.
2. Retail sales revenue.
3. Service consumption revenue.

The trade ledger should no longer be used as a raw GDP input because it contains intermediate goods and would double count downstream sales. The rolling GDP calculation will keep the same smoothing window and annualization behavior, but its source data will change from total trade turnover to total final-demand spending.

Implementation shape:

1. Add a rolling array for direct consumer market spending alongside existing retail and service activity buffers.
2. Store per-tick direct consumer spending from `executeConsumerPurchases()`.
3. Update GDP using direct consumer spending + retail revenue + service revenue over the rolling window.

### B. Retail Should Reflect Real Supply

Retail behavior will be split into two states:

1. Normal runtime registration: zero starting inventory.
2. Explicit bootstrap seeding: optional, limited, and only used during controlled world warm-start flows.

Retail price calculation will change to:

1. Primary anchor: `purchaseCost * (1 + markup)`.
2. Fallback anchor: most recent market price.
3. Final fallback: goods base price.

This keeps pricing responsive to real replenishment cost while remaining safe when the store has not yet received stock.

The consumer path remains:

1. If retail has inventory for a good, consumers buy through retail.
2. If retail is out of stock or cannot serve the good, demand falls back to direct market purchases.

This keeps retail meaningful without letting empty stores block consumption entirely.

### C. Forced Market Support Becomes Last-Resort Support

Forced build logic for zero-supply goods and cold goods will remain available, but only as a guarded fallback. It should trigger only when all of the following are true:

1. The shortage persists for multiple checks, not just one snapshot.
2. There is observable demand for the good.
3. There is no active producer or in-flight capacity already solving it.
4. A cooldown has elapsed since the last forced intervention for that good.

The intervention should also be softened:

1. Reduce the number of goods handled per pass.
2. Lower the decision priority so profitable market behavior can win first.
3. Preserve the logic as a survival valve instead of a routine planner.

## Data Flow Changes

### GDP Path

`executeConsumerPurchases()` -> direct consumer spend buffer  
`updateRetailSystem()` -> retail revenue buffer  
`processServiceConsumption()` -> service revenue buffer  
`updateGDP()` -> rolling sum of the three final-demand buffers only

### Retail Price Path

`processRetailDelivery()` or other replenishment path -> update `purchaseCosts[idx]`  
`adjustRetailPrices()` -> compute retail price from purchase cost first  
UI and stats panels consume the resulting retail price without special-case correction

### Forced Support Path

Market shortage detection -> persistence and cooldown checks -> guarded AI build decision  
If checks fail, no forced build is emitted and the normal market remains responsible

## Testing Strategy

The work will follow test-first changes for each layer.

### 1. GDP Regression Tests

Add tests that prove:

1. Intermediate-goods market trades do not inflate GDP by themselves.
2. Retail and service activity are counted once.
3. GDP still updates smoothly over the rolling day window.

### 2. Retail Regression Tests

Add tests that prove:

1. Runtime retail registration does not spawn magical inventory.
2. Retail pricing prefers purchase cost over static base price.
3. Retail still has a safe fallback price anchor when purchase cost is unavailable.

### 3. Market Stability Regression Tests

Keep current opening and 360-tick coverage protections, then add targeted longer-run checks showing:

1. Zero-supply deterioration is materially lower than the current baseline.
2. Negative-cash company count does not keep compounding at the current rate.
3. Previously covered important goods still activate within the existing short-run window.

## Risks And Mitigations

### Risk: Opening Economy Becomes Too Brittle

Mitigation:

1. Do not remove bootstrap warm-start support in this iteration.
2. Keep forced support as fallback rather than deleting it.

### Risk: Retail Becomes Too Expensive Or Too Volatile

Mitigation:

1. Use purchase cost only as the primary anchor, not the only anchor.
2. Preserve market-price and base-price fallback behavior.

### Risk: GDP Drops Sharply And Breaks Existing Expectations

Mitigation:

1. Treat the drop as a correction in measurement rather than a gameplay regression.
2. Adjust tests to validate consistency and non-duplication, not old inflated values.

## Success Criteria

This design is considered successful when:

1. GDP no longer double counts retail or service activity with general market turnover.
2. Retail stores do not receive default magical stock during ordinary registration.
3. Retail prices visibly follow replenishment cost more closely than static base price.
4. Short-run coverage tests still pass.
5. Longer-run simulations show better zero-supply and insolvency behavior than the current degraded baseline.

## Implementation Order

1. Add GDP regression tests and fix GDP source data.
2. Add retail regression tests and fix retail inventory and price anchoring.
3. Add or tighten long-run stability guards and then reduce forced support aggressiveness.
4. Run targeted short-run and long-run verification.
