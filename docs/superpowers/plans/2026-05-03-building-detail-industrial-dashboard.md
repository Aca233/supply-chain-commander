# Building Detail Industrial Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the clicked building detail panel into a compact industrial operations dashboard.

**Architecture:** Keep `BuildingCardExpanded` as the entry component used by `Production.tsx`, but split repeated row/KPI/labor rendering into local helpers inside the same file first. This minimizes churn while giving the panel a new information architecture.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, existing project design-system controls, Vitest with React server rendering tests.

---

## File Structure

- Modify: `src/ui/components/Production/BuildingCardExpanded.tsx`
  - Replace the current three-equal-column glowing card layout with a dashboard shell.
  - Add local helpers for section titles, KPI cells, resource rows, financial rows, and labor role rows.
  - Preserve all existing store actions and callbacks.
- Modify: `src/ui/components/Production/__tests__/BuildingCardExpanded.test.tsx`
  - Keep the high-building-id output buffer regression.
  - Add assertions for the new dashboard sections and compact labor summary.
- Read only: `src/ui/hooks/useBuildingData.ts`
  - Use the existing view model; do not change economics here.
- Read only: `src/ui/pages/Production.tsx`
  - Confirm the panel remains in-place; no change expected.

## Tasks

### Task 1: Add Dashboard Structure Test

**Files:**
- Modify: `src/ui/components/Production/__tests__/BuildingCardExpanded.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a second test that renders a building with labor data and checks for the new section labels:

```tsx
it('renders the industrial dashboard sections with compact labor summary', () => {
  const buildingId = 4;

  useGameStoreMock.mockReturnValue({
    getWorld: () => createWorld(buildingId),
    playerCash: 1_000_000,
    tick: 1,
    upgradeBuilding: vi.fn(),
    toggleBuildingActive: vi.fn(),
    demolishBuilding: vi.fn(),
    getBuildingProductionControl: () => ({
      ownerCompanyId: 0,
      canManage: true,
      autoAdjustEnabled: true,
      manualTarget: 1,
      manualTargetRange: { min: 0.3, max: 1.5 },
    }),
    setBuildingProductionControlAuto: vi.fn(),
    setBuildingManualProductionTarget: vi.fn(),
    getBuildingLaborView: () => ({
      coverage: 0.82,
      bottleneckRole: 'technical',
      estimatedMonthlyPayroll: 12_500,
      accruedPayroll: 3_200,
      roles: {
        basic: {
          name: '基础工人',
          hired: 18,
          activeDemand: 20,
          shortage: 2,
          coverage: 0.9,
          wageMultiplier: 1,
        },
        technical: {
          name: '技术工人',
          hired: 4,
          activeDemand: 8,
          shortage: 4,
          coverage: 0.5,
          wageMultiplier: 1.2,
        },
        management: {
          name: '管理人员',
          hired: 2,
          activeDemand: 2,
          shortage: 0,
          coverage: 1,
          wageMultiplier: 1.1,
        },
      },
    }),
    setBuildingLaborWageMultiplier: vi.fn(),
    setSelectedGoods: vi.fn(),
    setCurrentPage: vi.fn(),
  });

  const html = renderToStaticMarkup(
    React.createElement(BuildingCardExpanded, {
      buildingIndex: buildingId,
      onClose: vi.fn(),
    }),
  );

  expect(html).toContain('生产链');
  expect(html).toContain('生产方式与产量');
  expect(html).toContain('经营拆账');
  expect(html).toContain('劳动力与工资');
  expect(html).toContain('瓶颈');
  expect(html).toContain('技术工人');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test -- --run src/ui/components/Production/__tests__/BuildingCardExpanded.test.tsx
```

Expected: the new test fails because `BuildingCardExpanded` does not yet render `生产链`, `生产方式与产量`, `经营拆账`, or `劳动力与工资`.

### Task 2: Rebuild The Detail Panel Shell

**Files:**
- Modify: `src/ui/components/Production/BuildingCardExpanded.tsx`

- [ ] **Step 1: Replace the outer shell and header**

Replace the rounded glowing title treatment with a compact dashboard shell:

```tsx
<div ref={panelRef} className="col-span-full">
  <div className="overflow-hidden rounded-lg border border-white/[0.10] bg-[#101419] shadow-[0_18px_48px_rgba(0,0,0,0.38)]">
    <div className={`border-l-4 ${st.borderColor}`}>
      {/* compact header, main grid, labor strip */}
    </div>
  </div>
</div>
```

The header keeps:
- `BuildingIcon`
- `data.name`
- `Lv.{data.level}`
- status `Badge`
- `data.productionName`
- profit/revenue/cost/margin/efficiency KPI cells
- close button
- owned action buttons

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm run test -- --run src/ui/components/Production/__tests__/BuildingCardExpanded.test.tsx
```

Expected: the original high-id regression still passes; the new section-label test may still fail until the body sections are added.

### Task 3: Add Production Chain And Controls Sections

**Files:**
- Modify: `src/ui/components/Production/BuildingCardExpanded.tsx`

- [ ] **Step 1: Add local section/resource helpers**

Add helper render functions in the component file:

```tsx
const sectionHeadingClass = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38';
const sectionShellClass = 'min-w-0 border border-white/[0.08] bg-white/[0.025] p-3';
```

Use compact rows for inputs/outputs. Each row must preserve `onClick={goMarket(goodsId)}`.

- [ ] **Step 2: Add the main dashboard grid**

Use:

```tsx
<div className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-12">
  <section className={`${sectionShellClass} xl:col-span-5`}>
    <h4 className={sectionHeadingClass}>生产链</h4>
    {/* inputs and outputs */}
  </section>

  <section className={`${sectionShellClass} xl:col-span-4`}>
    <h4 className={sectionHeadingClass}>生产方式与产量</h4>
    <ProductionMethodsPanel ... />
    {/* production control */}
  </section>

  <section className={`${sectionShellClass} xl:col-span-3`}>
    <h4 className={sectionHeadingClass}>经营拆账</h4>
    {/* revenue, cost, payroll, profit, margin */}
  </section>
</div>
```

- [ ] **Step 3: Run the focused test**

Run:

```bash
npm run test -- --run src/ui/components/Production/__tests__/BuildingCardExpanded.test.tsx
```

Expected: the section label assertions pass except any labor-specific assertions if the labor strip is not finished.

### Task 4: Add Compact Labor Strip

**Files:**
- Modify: `src/ui/components/Production/BuildingCardExpanded.tsx`

- [ ] **Step 1: Move labor below the main grid**

Render a shallow bottom section after the main grid:

```tsx
{lv ? (
  <section className="border-t border-white/[0.08] bg-black/[0.18] px-3 py-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h4 className={sectionHeadingClass}>劳动力与工资</h4>
      {/* coverage, payroll, bottleneck */}
    </div>
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
      {/* role rows */}
    </div>
  </section>
) : (
  <section className="border-t border-white/[0.08] px-3 py-2 text-xs text-white/35">
    暂无劳动力数据
  </section>
)}
```

Each role row includes:
- role name
- hired/activeDemand
- shortage text when `shortage > 0`
- compact `ProgressBar`
- compact `Slider` for wage multiplier

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm run test -- --run src/ui/components/Production/__tests__/BuildingCardExpanded.test.tsx
```

Expected: all tests in `BuildingCardExpanded.test.tsx` pass.

### Task 5: Verify Build And UI Risk

**Files:**
- No source changes expected unless verification finds issues.

- [ ] **Step 1: Run the focused component test**

Run:

```bash
npm run test -- --run src/ui/components/Production/__tests__/BuildingCardExpanded.test.tsx
```

Expected: test file passes with zero failures.

- [ ] **Step 2: Run TypeScript/Vite build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build complete with exit code 0.

- [ ] **Step 3: Start dev server for manual review**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 4: Browser smoke check**

Open the production page in the app browser, click a building card, and check:
- expanded panel appears in place
- no overlapping text at desktop width
- labor is below the main grid and visually compact
- controls are still visible and reachable

## Self-Review

- Spec coverage: the plan covers the in-place panel, industrial visual tone,
  production chain, method/control section, financial breakdown, compact labor,
  tests, and build verification.
- Placeholder scan: no `TBD`, `TODO`, or unspecified "add tests" items remain.
- Type consistency: the test uses the same `getBuildingLaborView` role shape
  already consumed by `BuildingCardExpanded.tsx`.
