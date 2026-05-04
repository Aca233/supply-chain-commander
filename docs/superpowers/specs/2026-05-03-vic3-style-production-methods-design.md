# Victoria 3 Style Production Methods Design

## Goal

Expand the production-method catalog into a Victoria 3 style slot system. Buildings should no longer feel like they only pick a product; they should pick a product plus a small set of industrial method categories that change inputs, outputs, workforce mix, energy use, and unlock timing.

## Scope

The first wave covers 16 key non-retail buildings:

- Extraction and agriculture: iron mine, lithium mine, rare earth mine, farm, livestock farm, fishery.
- Processing: steel mill, chemical plant, food factory, meat processing.
- Manufacturing: electronics factory, battery factory, parts factory, car factory, pharma factory.
- Service: power plant.

Retail buildings stay outside this system.

## Slot Categories

Each expanded building keeps the existing `production` slot. This slot is the base production method and preserves legacy product variants and save compatibility.

Additional slots follow Victoria 3 style categories:

- `secondary`: adds byproducts or supporting processes, such as mineral blasting, cold-chain handling, or packaging.
- `refining`: shifts output toward more specialized or higher value products, usually with more inputs and skilled labor.
- `automation`: reduces basic labor by adding machinery, electricity, motors, chips, or technical workers.
- `utility`: changes power, transport, or infrastructure method, such as electric conveyors, fuel logistics, or grid integration.

Ownership is intentionally excluded. It belongs in company ownership, finance, and labor systems rather than recipe composition.

## Design Rules

- Defaults must reproduce the current baseline recipe within a small tolerance.
- Advanced methods use `requiredLevel` so early-game behavior remains stable.
- Method effects are absolute deltas, matching the existing registry model.
- Workforce changes must respect the wage-aware economy: automation reduces basic workers but can increase technical or management demand.
- Energy-heavy methods must consume more energy or industrial inputs; they should not be free output multipliers.
- No method may create negative final input/output amounts after recipe composition.
- On buildings with multiple mutually exclusive `production` routes, shared process slots must not emit those route-specific main products. They may adjust workforce, energy, logistics, or generic inputs instead. Product-specific outputs belong in the `production` slot.
- Logistics and grid methods should reduce waste, change inputs, or alter workforce. They must not create material goods directly, such as packaging turning into car parts or electronics turning into electricity.
- Named equipment-heavy methods, such as electric drills, pumps, continuous casting, CNC control, and dedicated tooling, must consume equipment goods or consumables. Energy and workforce deltas represent operating cost, not the source of the machinery.

## Example Building Shapes

Steel mill:

- `production`: steelmaking product route.
- `refining`: standard steel, oxygen furnace, alloy-oriented steel.
- `automation`: manual crane work, electric handling, automated continuous casting.

Farm:

- `production`: grain or cotton.
- `secondary`: traditional field work, mechanized cultivation, irrigation.
- `automation`: manual sorting, automated storage and packing.

Electronics factory:

- `production`: electronics, smartphone, computer, drone.
- `refining`: standard assembly, precision SMT, clean-room assembly. These change inputs, energy, and workforce rather than emitting extra electronics on phone/computer/drone routes.
- `automation`: manual line, robotic assembly, AI-assisted QA. These reduce basic labor and add technical labor/equipment inputs.

Power plant:

- `production`: coal, gas, solar.
- `utility`: basic grid connection, peak-load dispatch, smart-grid integration.

## Data Flow

`getDefaultBuildingMethodConfig()` will route first-wave buildings to expanded configs. Existing industry registration files can keep mapping building IDs through that function.

Expanded configs will be built by helper functions that:

- Convert current baseline variants into `production` methods.
- Add extra slots and methods.
- Set default methods so existing recipes remain stable.
- Compose final recipes through the existing `computeRecipe()` path.

## Testing

Add production-method expansion tests:

- First-wave buildings expose at least two slots.
- Existing production variants remain available through `production`.
- A non-production slot changes the final recipe when selected.
- Locked methods carry `requiredLevel > 1`.
- Default recipes stay wage-viable through existing `ProductionEconomics` tests.

Keep the existing supply-chain tests as guardrails. The wage-aware supply balance must remain inside the current healthy band.

## Non-Goals

- Full 40-building expansion in this pass.
- Ownership production methods.
- UI redesign.
- New goods, pollution systems, or quality systems.
