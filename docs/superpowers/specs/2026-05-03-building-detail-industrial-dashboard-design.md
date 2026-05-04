# Building Detail Industrial Dashboard Design

## Goal

Rebuild the expanded building detail that appears after clicking a building card.
The new panel should read like an industrial operations dashboard: dense,
realistic, and built around production decisions.

## Confirmed Decisions

- Interaction model: keep the current in-place expanded panel inserted below the
  selected card row.
- Visual tone: industrial operations dashboard.
- Priority: balanced sections with clear hierarchy.
- Labor footprint: compact; show coverage, shortage, payroll, and wage controls
  without letting labor dominate the panel.

## Current Surface

The active surface is `src/ui/components/Production/BuildingCardExpanded.tsx`.
`src/ui/pages/Production.tsx` inserts it below the selected grid/table row.

The current panel has useful data, but it overuses rounded glowing containers,
emoji labels, and equal three-column weight. That makes labor feel as important
as the production chain while hiding the real operating story: inputs, outputs,
method choices, costs, and bottlenecks.

## Proposed Layout

### 1. Header: Status And Command Bar

One compact header row:
- building icon, name, level, status, and production route
- daily profit as the strongest number
- efficiency, margin, revenue, and cost as secondary KPIs
- close, pause/resume, upgrade, and demolish actions grouped on the right

The header should be shallow and table-like, with a status-colored left border
instead of a large decorative title area.

### 2. Main Grid: Operations First

Desktop layout uses a responsive 12-column grid:
- Production chain: 5 columns
- Production method/control: 4 columns
- Financial breakdown: 3 columns

Mobile stacks the same sections in this order:
production chain, production method/control, financial breakdown, labor strip.

### 3. Production Chain

Inputs and outputs should be shown as compact goods rows:
- goods icon and name
- current/required buffer for inputs
- daily need for inputs
- daily amount, buffer, and price for outputs
- bottleneck rows get warning/error styling
- rows remain clickable to open the market page

No-input buildings may show a short empty state, but method-heavy buildings
should not imply that machinery or automation is free. The production method
system now owns those material requirements.

### 4. Production Methods And Output Control

Keep `ProductionMethodsPanel`, but place it in a more operational section:
- show methods first
- production control directly below methods
- auto/manual state should be readable at a glance
- manual target slider only appears when auto mode is off

### 5. Financial Breakdown

Show the building as an operating account:
- revenue
- operating cost
- profit
- margin
- estimated payroll when labor data exists

This section should make the wage system visible as a major cost without
duplicating the entire labor UI.

### 6. Compact Labor Strip

Labor appears as a bottom strip or compact final section:
- total coverage percentage
- bottleneck role if any
- estimated monthly payroll and accrued payroll
- three role chips: basic, technical, management
- each role shows hired/demand and wage multiplier
- wage sliders are compact and grouped under their role rows

This keeps wages adjustable while preventing labor from taking a full third of
the detail panel.

## Visual Rules

- Prefer square or 8px-radius industrial panels over large pill/card styling.
- Use existing CSS variables, `BuildingIcon`, `GoodsIcon`, `Badge`, `Button`,
  `ProgressBar`, `Switch`, and `Slider`.
- Remove emoji labels from this panel.
- Avoid nested cards. Use sections, dividers, and compact rows instead.
- Keep text sizes stable and small enough for dashboard use.
- Avoid one-color neon treatment; use graphite base, muted steel borders, and
  focused status colors.

## Acceptance Criteria

- Clicking a building still opens the expanded detail in place.
- Existing market navigation from input/output rows still works.
- Existing controls still work: close, pause/resume, upgrade modal, demolish
  confirmation, auto/manual production target, wage multipliers.
- Labor uses less vertical/visual space than the current right-column design.
- The high-building-id output-buffer regression remains covered.
- The rendered markup includes clear sections for production chain, production
  methods, financial breakdown, and labor.
- `npm run test -- --run src/ui/components/Production/__tests__/BuildingCardExpanded.test.tsx`
  passes.
- `npm run build` passes.

## Out Of Scope

- Reworking `ProductionMethodsPanel` dropdown behavior.
- Changing economic calculations.
- Changing building selection behavior in `Production.tsx`.
- Adding a new design-system package or icon dependency.
