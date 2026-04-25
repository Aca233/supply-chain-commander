# Responsive UI Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the main in-game UI stay visible and operable in narrow desktop windows, tablets, and phones by reflowing fixed sidebars, detail panes, charts, tables, and toolbars instead of letting them squeeze or clip the main content.

**Architecture:** Extend the existing `useMobile` breakpoint hook with an explicit narrow-desktop signal and a pure classification helper we can unit test. Reuse that signal in the app shell and the three complex pages (`Production`, `Market`, `SupplyChain`) so fixed side panels become overlay sheets below `xl`, then apply lighter grid/table/toolbar fixes to the remaining main pages without introducing a brand-new global layout system.

**Tech Stack:** TypeScript, React 18, Zustand, Tailwind CSS, Vitest, Vite

---

## File Structure

### Create

- `src/ui/hooks/__tests__/useMobile.test.ts`
  Pure breakpoint classification tests for `mobile`, `tablet`, `narrow desktop`, and `wide desktop`.
- `src/ui/components/Layout/ResponsiveOverlayPanel.tsx`
  Reusable overlay sheet for left/right/bottom panels on narrow desktop, tablet, and mobile.

### Modify

- `src/ui/hooks/useMobile.ts`
  Add a pure responsive-state helper and expose `isNarrowDesktop` / `isWideDesktop`.
- `src/App.tsx`
  Switch the narrow-desktop shell to overlay navigation instead of permanent left margin.
- `src/ui/components/Layout/Header.tsx`
  Add an optional navigation toggle and make the desktop header wrap/compress cleanly.
- `src/ui/components/Layout/Sidebar.tsx`
  Support both fixed and overlay display modes.
- `src/ui/pages/Production.tsx`
  Convert catalog/detail/queue to overlay sheets below `xl`, remove clipping, and wrap the toolbar.
- `src/ui/pages/Market.tsx`
  Add a narrow-desktop branch where goods selection and trading panels become overlays and the central analysis stack stays visible.
- `src/ui/pages/SupplyChain.tsx`
  Preserve the graph as the priority area and move left/right panels into toggled overlays on narrow desktop.
- `src/ui/pages/Dashboard.tsx`
  Add a narrow-desktop two-column branch and stop desktop-only clipping.
- `src/ui/pages/Finance.tsx`
  Reflow headers, grids, tables, and loan sections so they remain readable without hiding controls.
- `src/ui/pages/Retail.tsx`
  Reflow store cards and inventory management sections for narrow widths without losing per-store controls.
- `src/ui/pages/News.tsx`
  Wrap the top controls and collapse the monthly stats layout cleanly.
- `src/ui/pages/Settings.tsx`
  Rework the tab strip and wide form/table sections so they remain reachable in smaller windows.
- `src/ui/pages/CompetitorsAndInvestment.tsx`
  Reflow the page-level controls and make company detail open as an overlay below `xl`.
- `src/ui/components/Company/CompanyDetail.tsx`
  Make the detail content collapse from a 2-column desktop panel to a stacked layout in overlay mode.
- `src/ui/components/Finance/StockMarketPanel.tsx`
  Reflow search/sort controls, list/detail split, and holdings sections for narrow desktop and tablet.

## Execution Notes

- This workspace does not currently contain a `.git` directory, so replace commit steps with checkpoint notes that record changed files and exact commands that passed.
- Keep the current breakpoint vocabulary and only add the missing narrow-desktop concept; do not rename existing `isMobile` / `isTablet` consumers out from under the app.
- Use `npx vitest run` for deterministic one-shot verification.
- Use `npm run dev` for manual viewport validation at three widths after each major page cluster:

```text
1. 1180px wide (narrow desktop)
2. 900px wide (tablet)
3. 390px wide (phone)
```

- No gameplay, production, market, or save logic changes belong in this plan except responsive state classification and view-only layout behavior.

### Task 1: Add Shared Breakpoint Logic And Narrow-Desktop App Shell

**Files:**
- Create: `src/ui/hooks/__tests__/useMobile.test.ts`
- Create: `src/ui/components/Layout/ResponsiveOverlayPanel.tsx`
- Modify: `src/ui/hooks/useMobile.ts`
- Modify: `src/App.tsx`
- Modify: `src/ui/components/Layout/Header.tsx`
- Modify: `src/ui/components/Layout/Sidebar.tsx`

- [ ] **Step 1: Write the failing breakpoint-classification test**

```ts
import { describe, expect, it } from 'vitest';

import { BREAKPOINTS, getResponsiveState } from '../useMobile';

describe('getResponsiveState', () => {
  it('classifies narrow desktop separately from tablet and wide desktop', () => {
    const narrow = getResponsiveState(1180, 800, false);

    expect(narrow.isDesktop).toBe(true);
    expect(narrow.isTablet).toBe(false);
    expect(narrow.isNarrowDesktop).toBe(true);
    expect(narrow.isWideDesktop).toBe(false);
    expect(narrow.isXl).toBe(true);
    expect(narrow.is2xl).toBe(false);
  });

  it('keeps tablet widths out of desktop mode', () => {
    const tablet = getResponsiveState(BREAKPOINTS.md + 40, 1024, true);

    expect(tablet.isMobile).toBe(false);
    expect(tablet.isTablet).toBe(true);
    expect(tablet.isDesktop).toBe(false);
    expect(tablet.isNarrowDesktop).toBe(false);
  });

  it('marks xl and above as wide desktop', () => {
    const wide = getResponsiveState(1366, 768, false);

    expect(wide.isDesktop).toBe(true);
    expect(wide.isNarrowDesktop).toBe(false);
    expect(wide.isWideDesktop).toBe(true);
    expect(wide.is2xl).toBe(true);
  });
});
```

- [ ] **Step 2: Run the new test file and confirm it fails**

Run:

```bash
npx vitest run src/ui/hooks/__tests__/useMobile.test.ts
```

Expected: FAIL because `getResponsiveState`, `isNarrowDesktop`, and `isWideDesktop` do not exist yet.

- [ ] **Step 3: Implement the shared responsive helper, overlay panel, and shell behavior**

`src/ui/hooks/useMobile.ts`

```ts
export interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isNarrowDesktop: boolean;
  isWideDesktop: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2xl: boolean;
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isTouchDevice: boolean;
}

export function getResponsiveState(
  width: number,
  height: number,
  isTouchDevice = false
): MobileState {
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isNarrowDesktop = width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
  const isWideDesktop = width >= BREAKPOINTS.xl;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isNarrowDesktop,
    isWideDesktop,
    isSm: width < BREAKPOINTS.sm,
    isMd: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isLg: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isXl: isNarrowDesktop,
    is2xl: isWideDesktop,
    width,
    height,
    isLandscape: width > height,
    isPortrait: width <= height,
    isTouchDevice,
  };
}
```

`src/ui/components/Layout/ResponsiveOverlayPanel.tsx`

```tsx
import React from 'react';

import { cn } from '@/ui/design-system/utils/cn';

type Position = 'left' | 'right' | 'bottom';

interface ResponsiveOverlayPanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  position?: Position;
  widthClassName?: string;
}
```

Continue the component and shell changes:

```tsx
export const ResponsiveOverlayPanel: React.FC<ResponsiveOverlayPanelProps> = ({
  open,
  title,
  onClose,
  children,
  position = 'right',
  widthClassName = 'max-w-md',
}) => {
  if (!open) return null;

  const panelClassName =
    position === 'bottom'
      ? 'absolute bottom-0 left-0 right-0 max-h-[82vh] rounded-t-2xl'
      : cn(
          'absolute top-0 bottom-0 w-full bg-background-elevated shadow-2xl',
          widthClassName,
          position === 'left' ? 'left-0 border-r border-border' : 'right-0 border-l border-border'
        );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={panelClassName} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-background-muted text-foreground-secondary"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
```

`src/App.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();
const showMobileLayout = isMobile || isTablet;
const showOverlaySidebar = isNarrowDesktop;
const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);

<Sidebar
  mode={showOverlaySidebar ? 'overlay' : 'fixed'}
  isOpen={showOverlaySidebar ? desktopSidebarOpen : true}
  onClose={() => setDesktopSidebarOpen(false)}
/>

<div className={`flex-1 flex flex-col transition-all duration-300 ${
  showOverlaySidebar ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-60'
}`}>
  <Header
    showNavigationToggle={showOverlaySidebar}
    onNavigationToggle={() => setDesktopSidebarOpen((open) => !open)}
  />
  <main className={`flex-1 overflow-y-auto mt-14 ${showOverlaySidebar ? 'p-4' : 'p-6'}`}>
    {renderPage()}
  </main>
</div>
```

`src/ui/components/Layout/Header.tsx`

```tsx
interface HeaderProps {
  showNavigationToggle?: boolean;
  onNavigationToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  showNavigationToggle = false,
  onNavigationToggle,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-background-elevated border-b border-border">
      <div className="h-full flex items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          {showNavigationToggle && (
            <button
              type="button"
              onClick={onNavigationToggle}
              className="w-10 h-10 rounded-lg bg-background-muted flex items-center justify-center"
            >
              ☰
            </button>
          )}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">SC</span>
            </div>
            <h1 className="text-lg font-semibold text-text-primary truncate">
              供应链指挥官
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};
```

`src/ui/components/Layout/Sidebar.tsx`

```tsx
interface SidebarProps {
  mode?: 'fixed' | 'overlay';
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode = 'fixed',
  isOpen = true,
  onClose,
}) => {
  const isOverlay = mode === 'overlay';

  return (
    <>
      {isOverlay && isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      )}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 z-50 pt-14 bg-background-elevated border-r border-border
          transition-all duration-300
          ${sidebarCollapsed ? 'w-16' : 'w-60'}
          ${isOverlay ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
```

- [ ] **Step 4: Re-run the breakpoint test and then run a build**

Run:

```bash
npx vitest run src/ui/hooks/__tests__/useMobile.test.ts
npm run build
```

Expected: PASS for the new test file and PASS for the TypeScript/Vite build.

- [ ] **Step 5: Manually validate the shell at narrow-desktop width**

Run:

```bash
npm run dev
```

Manual checklist:

```text
1. Resize the game window to about 1180px wide.
2. Confirm the desktop shell no longer reserves a permanent left margin for the sidebar.
3. Confirm the header shows a navigation toggle.
4. Open and close the sidebar overlay and verify it covers content instead of squeezing it.
5. Confirm full-width pages can scroll vertically and no top content is hidden behind the fixed header.
```

- [ ] **Step 6: Checkpoint the shared shell work**

Record this checkpoint:

```text
Changed: useMobile.ts, useMobile.test.ts, ResponsiveOverlayPanel.tsx, App.tsx, Header.tsx, Sidebar.tsx
Passed: npx vitest run src/ui/hooks/__tests__/useMobile.test.ts
Passed: npm run build
Manual: completed the 5-step narrow-desktop shell checklist
```

### Task 2: Adapt Production For Overlay Panels Instead Of Fixed Sidebars

**Files:**
- Modify: `src/ui/pages/Production.tsx`
- Reuse: `src/ui/components/Layout/ResponsiveOverlayPanel.tsx`

- [ ] **Step 1: Refactor the page state so below `xl` it uses overlay panels instead of persistent side columns**

`src/ui/pages/Production.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();
const useOverlayPanels = isMobile || isTablet || isNarrowDesktop;

const [showCatalog, setShowCatalog] = useState(!useOverlayPanels);
const [showConstructionQueue, setShowConstructionQueue] = useState(false);

useEffect(() => {
  setShowCatalog(!useOverlayPanels);
  if (!useOverlayPanels) {
    setShowConstructionQueue(true);
  }
}, [useOverlayPanels]);

const showPersistentCatalog = showCatalog && !useOverlayPanels;
const showPersistentDetail = selectedBuilding !== null && !useOverlayPanels;
const showPersistentQueue = showConstructionQueue && !useOverlayPanels;
```

- [ ] **Step 2: Replace the fixed left catalog, right detail, and queue float with overlay sheets below `xl`**

```tsx
return (
  <div className="h-full min-h-0 flex">
    {showPersistentCatalog && (
      <div className="w-64 flex-shrink-0 h-full">
        <BuildingCatalog onSelectBuilding={handleOpenBuildModal} />
      </div>
    )}

    <div className="flex-1 flex flex-col min-w-0 h-full">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 lg:px-6 py-4 border-b border-[var(--border-muted)] bg-[var(--bg-surface)]">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant={showCatalog ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowCatalog((open) => !open)}
          >
            {showCatalog ? '隐藏目录' : '建筑目录'}
          </Button>
          <Button
            variant={selectedBuilding !== null ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => selectedBuilding !== null && setSelectedBuilding(null)}
            disabled={selectedBuilding === null}
          >
            建筑详情
          </Button>
          <Button
            variant={showConstructionQueue ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowConstructionQueue((open) => !open)}
          >
            🏗️ 建造队列
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
```

And add the responsive overlays:

```tsx
<ResponsiveOverlayPanel
  open={useOverlayPanels && showCatalog}
  title="建筑目录"
  position="left"
  widthClassName="max-w-sm"
  onClose={() => setShowCatalog(false)}
>
  <BuildingCatalog onSelectBuilding={handleOpenBuildModal} />
</ResponsiveOverlayPanel>

<ResponsiveOverlayPanel
  open={useOverlayPanels && selectedBuilding !== null}
  title="建筑详情"
  position="right"
  widthClassName="max-w-lg"
  onClose={() => setSelectedBuilding(null)}
>
  {selectedBuilding !== null && (
    <BuildingDetailPanel
      buildingIndex={selectedBuilding}
      onClose={() => setSelectedBuilding(null)}
    />
  )}
</ResponsiveOverlayPanel>

<ResponsiveOverlayPanel
  open={useOverlayPanels && showConstructionQueue}
  title="建造队列"
  position="bottom"
  onClose={() => setShowConstructionQueue(false)}
>
  <ConstructionQueuePanel
    collapsed={false}
    onToggleCollapse={() => setShowConstructionQueue(false)}
  />
</ResponsiveOverlayPanel>
```

- [ ] **Step 3: Run a build after the Production page refactor**

Run:

```bash
npm run build
```

Expected: PASS with no JSX or type errors.

- [ ] **Step 4: Manually validate Production at all three viewport widths**

Run:

```bash
npm run dev
```

Manual checklist:

```text
1. At 1180px wide, confirm the building grid remains the main area and the left catalog no longer consumes permanent width.
2. Open a building card and confirm details appear in a right overlay instead of shrinking the grid.
3. Open the construction queue and confirm it appears as an overlay panel, not a floating box covering important buttons.
4. At 900px and 390px wide, confirm the header controls wrap and remain tappable.
5. Confirm empty-state actions still open the catalog correctly.
```

- [ ] **Step 5: Checkpoint the Production work**

Record this checkpoint:

```text
Changed: Production.tsx
Passed: npm run build
Manual: completed the 5-step Production responsive checklist
```

### Task 3: Adapt Market To Keep Analysis Visible And Move Secondary Panels Into Overlays

**Files:**
- Modify: `src/ui/pages/Market.tsx`
- Reuse: `src/ui/components/Layout/ResponsiveOverlayPanel.tsx`

- [ ] **Step 1: Add a dedicated narrow-desktop branch between the current tablet and wide-desktop layouts**

`src/ui/pages/Market.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();

if (isNarrowDesktop) {
  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setShowGoodsSelector(true)}>
          {selectedGoods?.name || '选择商品'}
        </Button>
        <Button variant="primary" onClick={() => setShowTradePanel(true)}>
          挂单与交易
        </Button>
        <div className="min-w-[220px] flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索商品..."
            leftIcon="🔍"
            size="sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-w-0">
```

- [ ] **Step 2: Collapse fixed side columns into left/right overlays and make main grids responsive**

Use the existing selector and trade content in reusable overlays:

```tsx
<ResponsiveOverlayPanel
  open={showGoodsSelector}
  title="商品选择"
  position="left"
  widthClassName="max-w-sm"
  onClose={() => setShowGoodsSelector(false)}
>
  <div className="p-4 space-y-4">
    <Input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="搜索商品..."
      leftIcon="🔍"
    />
    <GoodsCategoryTree
      filteredGoods={filteredGoods}
      expandedCategories={expandedCategories}
      selectedGoodsId={selectedGoodsId}
      playerStockMap={playerStockMap}
      goodsWithOrdersSet={goodsWithOrdersSet}
      onToggleCategory={toggleCategory}
      onSelectGoods={setSelectedGoodsId}
      classifyMode={classifyMode}
    />
  </div>
</ResponsiveOverlayPanel>

<ResponsiveOverlayPanel
  open={showTradePanel}
  title="挂单与交易"
  position="right"
  widthClassName="max-w-md"
  onClose={() => setShowTradePanel(false)}
>
  <div className="p-4 space-y-4">
    <Card variant="game" padding="md" className="space-y-3">
      <CardTitle className="text-sm">📋 市场挂单</CardTitle>
      <div className="space-y-2">
        {playerOrders.map((order) => (
          <div key={order.index} className="flex items-center justify-between rounded-lg bg-background-muted p-2 text-xs">
            <Badge variant={order.type === 'buy' ? 'success' : 'error'} size="sm">
              {order.type === 'buy' ? '买' : '卖'}
            </Badge>
            <span className="tabular-nums">¥{order.price.toFixed(2)}</span>
            <span className="tabular-nums">{order.quantity.toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-error/5 p-2">
          <p className="mb-1 text-xs font-medium text-error">卖方报价</p>
          {orderBook.sellOrders.slice(0, 5).map((order, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="tabular-nums">¥{order.price.toFixed(2)}</span>
              <span className="tabular-nums">{order.quantity.toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-success/5 p-2">
          <p className="mb-1 text-xs font-medium text-success">买方报价</p>
          {orderBook.buyOrders.slice(0, 5).map((order, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="tabular-nums">¥{order.price.toFixed(2)}</span>
              <span className="tabular-nums">{order.quantity.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
    <Card variant="glow" padding="md">
      <TradePanel
        selectedGoodsId={selectedGoodsId}
        selectedGoods={selectedGoods}
        currentPrice={currentPrice}
        playerCash={playerCash}
        playerStock={playerStock}
        tradeType={tradeType}
        tradeQuantity={tradeQuantity}
        tradePrice={tradePrice}
        onTradeTypeChange={setTradeType}
        onQuantityChange={setTradeQuantity}
        onPriceChange={setTradePrice}
        onSubmit={handleSubmitOrder}
      />
    </Card>
  </div>
</ResponsiveOverlayPanel>
```

Update the wide-desktop-only grids so they do not overflow:

```tsx
<div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
```

And add `min-w-0` to cards/rows that contain long titles and dense values:

```tsx
<div className="flex items-center justify-between gap-3 min-w-0">
  <span className="truncate">{companyName}</span>
</div>
```

- [ ] **Step 3: Run a build after the Market page refactor**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manually validate Market at narrow desktop, tablet, and mobile widths**

Run:

```bash
npm run dev
```

Manual checklist:

```text
1. At 1180px wide, confirm the main analysis stack is visible without a permanent goods rail and trade rail squeezing it.
2. Open the goods selector and confirm the category tree appears in an overlay and still updates the selected goods.
3. Open the trade panel and confirm order book + custom order UI are accessible in the overlay.
4. Confirm chart cards, upstream/downstream cards, and price-stat cards reflow instead of overflowing horizontally.
5. At 900px and 390px wide, confirm the existing tablet/mobile flows still work and no regressions were introduced.
```

- [ ] **Step 5: Checkpoint the Market work**

Record this checkpoint:

```text
Changed: Market.tsx
Passed: npm run build
Manual: completed the 5-step Market responsive checklist
```

### Task 4: Adapt Supply Chain So The Graph Stays Primary On Narrow Desktop

**Files:**
- Modify: `src/ui/pages/SupplyChain.tsx`
- Reuse: `src/ui/components/Layout/ResponsiveOverlayPanel.tsx`

- [ ] **Step 1: Introduce narrow-desktop overlay behavior without disturbing the existing mobile and tablet branches**

`src/ui/pages/SupplyChain.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();
const useOverlayDesktopPanels = isNarrowDesktop;

useEffect(() => {
  if (useOverlayDesktopPanels) {
    setLeftPanelCollapsed(true);
  }
}, [useOverlayDesktopPanels]);
```

- [ ] **Step 2: Update the desktop toolbar and left/right panels so the graph remains fully visible below `xl`**

```tsx
{useOverlayDesktopPanels ? (
  <div className="flex items-center flex-wrap gap-2">
    <Button variant="ghost" size="sm" onClick={() => setLeftPanelCollapsed(false)}>
      商品列表
    </Button>
    <Button
      variant={selectedGoods ? 'primary' : 'ghost'}
      size="sm"
      disabled={!selectedGoods}
      onClick={() => selectedGoods && setShowDetailPanel(true)}
    >
      商品详情
    </Button>
    <Button variant="secondary" size="sm" onClick={() => openPlanner(selectedGoodsId ?? undefined)}>
      🎯 生产规划
    </Button>
  </div>
) : (
  <ViewModeSelector value={viewMode} onChange={setViewMode} />
)}
```

Replace the left/right desktop panes with overlays when `isNarrowDesktop`:

```tsx
<ResponsiveOverlayPanel
  open={useOverlayDesktopPanels && !leftPanelCollapsed}
  title="商品列表"
  position="left"
  widthClassName="max-w-sm"
  onClose={() => setLeftPanelCollapsed(true)}
>
  <div className="p-3 border-b border-border">
    <SearchAndFilter
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      onFiltersChange={setFilters}
    />
  </div>
  <IndustryList
    selectedGoodsId={selectedGoodsId}
    onGoodsClick={handleGoodsClick}
    searchQuery={searchQuery}
  />
</ResponsiveOverlayPanel>

<ResponsiveOverlayPanel
  open={useOverlayDesktopPanels && showDetailPanel && selectedGoods !== null}
  title={selectedGoods?.name || '商品详情'}
  position="right"
  widthClassName="max-w-lg"
  onClose={() => setShowDetailPanel(false)}
>
  {selectedGoodsId !== null && (
    <GoodsDetailPanel
      goodsId={selectedGoodsId}
      onClose={() => setShowDetailPanel(false)}
      onGoodsClick={handleGoodsClick}
      onTraceProduct={() => setViewMode('trace')}
    />
  )}
</ResponsiveOverlayPanel>
```

Also relax fixed widths on the planner modal:

```tsx
<div className="w-full max-w-3xl max-h-[90vh] bg-background-surface rounded-xl shadow-2xl overflow-hidden flex flex-col">
```

- [ ] **Step 3: Run a build after the Supply Chain refactor**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manually validate Supply Chain at 1180px, 900px, and 390px**

Run:

```bash
npm run dev
```

Manual checklist:

```text
1. At 1180px wide, confirm the graph remains visible as the primary canvas.
2. Open the goods list and confirm it appears as an overlay, not a permanent pane.
3. Open goods details and confirm they appear in an overlay instead of reducing graph width.
4. Open the production planner and confirm it fits within viewport width at 1180px and 900px.
5. Confirm the existing tablet/mobile branches still work after the desktop changes.
```

- [ ] **Step 5: Checkpoint the Supply Chain work**

Record this checkpoint:

```text
Changed: SupplyChain.tsx
Passed: npm run build
Manual: completed the 5-step Supply Chain responsive checklist
```

### Task 5: Apply Lightweight Reflow Fixes To The Remaining Main Pages

**Files:**
- Modify: `src/ui/pages/Dashboard.tsx`
- Modify: `src/ui/pages/Finance.tsx`
- Modify: `src/ui/pages/Retail.tsx`
- Modify: `src/ui/pages/News.tsx`
- Modify: `src/ui/pages/Settings.tsx`
- Modify: `src/ui/pages/CompetitorsAndInvestment.tsx`
- Modify: `src/ui/components/Company/CompanyDetail.tsx`
- Modify: `src/ui/components/Finance/StockMarketPanel.tsx`

- [ ] **Step 1: Add an explicit narrow-desktop branch to Dashboard and reflow its desktop columns**

`src/ui/pages/Dashboard.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();

if (isNarrowDesktop) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">控制台</h2>
        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <span className="tabular-nums">{formatGameDate(tick)}</span>
          <span className="tabular-nums">{performance?.avgTickTime.toFixed(2) || '0.00'}ms/tick</span>
        </div>
      </div>

      <KPIBar kpi={kpi} changes={kpiChanges} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <AlertCenter onNavigate={handleNavigate} maxAlerts={4} />
          <FinancialTrends data={financialTrends} dailyProfit={kpi.dailyProfit} />
          <ProductionOverviewPanel stats={productionStats} onNavigate={handleNavigate} onGoodsClick={handleGoodsClick} />
        </div>
        <div className="space-y-4">
          <MarketDynamicsPanel stats={marketStats} onNavigate={handleNavigate} onTrade={handleTrade} />
          <InventoryOverview stats={inventoryStats} onNavigate={handleNavigate} onSellItem={handleSellItem} />
          <InvestmentPanel stats={investmentStats} onNavigate={handleNavigate} onViewCompany={handleViewCompany} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Reflow Finance and Retail so dense tables and controls remain reachable**

`src/ui/pages/Finance.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();
const useCompactDesktop = isTablet || isNarrowDesktop;

<div className={`space-y-6 ${useCompactDesktop ? 'p-4' : 'p-6'}`}>
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h1 className={`font-bold ${useCompactDesktop ? 'text-xl' : 'text-2xl'}`}>💼 财务报表</h1>
  </div>

  <div className={`grid gap-4 ${useCompactDesktop ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
```

Wrap the wide table/data areas:

```tsx
<CardContent className="p-0 overflow-x-auto">
  <table className="w-full min-w-[720px]">
```

```tsx
<CardContent className="overflow-x-auto">
  <div className="min-w-[680px]">
    <DataTable
      data={activeLoans}
      columns={loanColumns}
      rowKey="id"
      variant="game"
      hoverable
      emptyText="暂无贷款记录"
      emptyIcon="🎉"
    />
  </div>
</CardContent>
```

`src/ui/pages/Retail.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();
const useCompactDesktop = isMobile || isTablet || isNarrowDesktop;

<div className={`grid gap-4 ${useCompactDesktop ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>

<div className={`grid gap-4 ${useCompactDesktop ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-3'}`}>

<CardContent className="space-y-4">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[760px] text-sm">
```

And make store headers wrap:

```tsx
<div className="flex flex-wrap items-start justify-between gap-3 w-full">
```

- [ ] **Step 3: Reflow News and Settings so filter controls, tab strips, and tables stop clipping**

`src/ui/pages/News.tsx`

```tsx
const { isMobile, isNarrowDesktop } = useMobile();
const useCompactDesktop = isMobile || isNarrowDesktop;

<div className="flex items-start justify-between gap-3 flex-wrap flex-shrink-0">
  <div className="flex items-center gap-3 flex-wrap">
  <div className="flex items-center gap-2 flex-wrap">
```

Collapse the monthly stats grid:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
```

`src/ui/pages/Settings.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();
const useCompactDesktop = isMobile || isTablet || isNarrowDesktop;

<TabsList
  variant="game"
  className={useCompactDesktop ? 'w-full flex flex-wrap justify-start gap-2 p-1 h-auto' : ''}
>
```

Normalize fixed-width form controls and save actions:

```tsx
<SelectTrigger className={useCompactDesktop ? 'w-full sm:w-40' : 'w-40'}>

<div className="flex flex-wrap gap-4">
  <Input className="flex-1 min-w-[220px]" />
  <Button>💾 保存游戏</Button>
```

Wrap data tables and two-column advanced settings:

```tsx
<CardContent className="p-0 overflow-x-auto">
  <div className="min-w-[720px]">
    <DataTable
      data={saves}
      columns={saveColumns}
      rowKey="id"
      variant="game"
      hoverable
      emptyText="暂无存档"
      emptyIcon="📭"
    />
  </div>
</CardContent>

<div className={`grid gap-4 ${useCompactDesktop ? 'grid-cols-1' : 'grid-cols-2'}`}>
```

- [ ] **Step 4: Reflow Competitors/Investment and its detail components so detail is overlayed below `xl`**

`src/ui/pages/CompetitorsAndInvestment.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();
const useOverlayCompanyDetail = isMobile || isTablet || isNarrowDesktop;

<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">

<div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
  <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTabType)}>
    <TabsList variant="game" className="flex flex-wrap h-auto">
```

Promote the search to full width on compact desktop:

```tsx
<Input
  placeholder="搜索公司..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  leftIcon="🔍"
  size="sm"
  className={useOverlayCompanyDetail ? 'w-full' : 'w-48'}
/>
```

Move detail into an overlay below `xl`:

```tsx
{selectedProfile && useOverlayCompanyDetail && (
  <ResponsiveOverlayPanel
    open={selectedProfile !== null}
    title={selectedProfile.name}
    position="right"
    widthClassName="max-w-2xl"
    onClose={() => setSelectedCompanyId(null)}
  >
    <CompanyDetail
      profile={selectedProfile}
      onClose={() => setSelectedCompanyId(null)}
      onAcquire={() => handleAcquire(selectedProfile.id)}
    />
  </ResponsiveOverlayPanel>
)}
```

`src/ui/components/Company/CompanyDetail.tsx`

```tsx
<div className="p-4 space-y-4">
  {activeTab === 'trade' && (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
```

Collapse the metric grids:

```tsx
<div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
<div className="grid grid-cols-1 xl:grid-cols-3 gap-4 text-sm">
```

`src/ui/components/Finance/StockMarketPanel.tsx`

```tsx
const { isMobile, isTablet, isNarrowDesktop } = useMobile();
const useCompactDesktop = isTablet || isNarrowDesktop;

<div className={`space-y-6 ${useCompactDesktop ? 'p-4' : 'p-6'}`}>
  <div className="flex flex-wrap justify-between items-center gap-3">
    <h1 className={`font-bold ${useCompactDesktop ? 'text-xl' : 'text-2xl'}`}>📈 股票市场</h1>
    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
      <input
        type="text"
        placeholder="搜索股票..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={`px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] ${
          useCompactDesktop ? 'flex-1 min-w-[220px]' : 'w-48'
        }`}
      />
```

Collapse the list/detail split earlier:

```tsx
<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
```

Wrap holdings data:

```tsx
<CardContent className="p-0 overflow-x-auto">
  <div className="min-w-[760px]">
    <DataTable
      data={holdings}
      columns={columns}
      rowKey="companyId"
      variant="game"
      hoverable
      compact
    />
  </div>
</CardContent>
```

- [ ] **Step 5: Run a build after the remaining-page sweep**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Manually validate the remaining pages at 1180px, 900px, and 390px**

Run:

```bash
npm run dev
```

Manual checklist:

```text
1. Dashboard: confirm narrow desktop uses 2 columns instead of the old fixed 3-column squeeze.
2. Finance: confirm KPI cards reflow, the profit table remains readable through local horizontal scroll, and loan controls stay visible.
3. Retail: confirm store headers and markup controls remain visible, and the inventory section is reachable without page-level clipping.
4. News: confirm filter buttons wrap and expanded monthly stats collapse cleanly.
5. Settings: confirm the tab strip wraps instead of crushing seven tabs into one row, and save/config tables are still reachable.
6. Competitors/Investment: confirm search and tabs wrap, company detail opens as an overlay below `xl`, and stock market list/detail remain usable.
```

- [ ] **Step 7: Checkpoint the remaining-page work**

Record this checkpoint:

```text
Changed: Dashboard.tsx, Finance.tsx, Retail.tsx, News.tsx, Settings.tsx, CompetitorsAndInvestment.tsx, CompanyDetail.tsx, StockMarketPanel.tsx
Passed: npm run build
Manual: completed the 6-step remaining-page responsive checklist
```

### Task 6: Final Regression Sweep

**Files:**
- Modify: none unless verification uncovers issues

- [ ] **Step 1: Run the focused responsive breakpoint test**

Run:

```bash
npx vitest run src/ui/hooks/__tests__/useMobile.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run:

```bash
npx vitest run
```

Expected: PASS with the repository test suite green.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS with no TypeScript or bundling errors.

- [ ] **Step 4: Do one final manual smoke pass across the full page set**

Run:

```bash
npm run dev
```

Manual checklist:

```text
1. Visit Dashboard, Production, Market, Finance, SupplyChain, Retail, News, Settings, and Competitors/Investment at 1180px.
2. Confirm no page has essential controls hidden off-screen by a fixed sidebar, fixed detail panel, or `overflow-hidden`.
3. Repeat a quick pass at 900px and 390px.
4. Confirm overlay panels always have an obvious close action.
5. Confirm no page introduces a full-screen dead-end where the main content cannot scroll.
```

- [ ] **Step 5: Record the final verification checkpoint**

Record this checkpoint:

```text
Passed: npx vitest run src/ui/hooks/__tests__/useMobile.test.ts
Passed: npx vitest run
Passed: npm run build
Manual: completed the 5-step final full-page smoke checklist
```
