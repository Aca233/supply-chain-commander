# News Generation Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted `newsGenerationEnabled` setting that fully disables automatic 商业周刊 generation, and auto-close only auto-opened news dialogs after 5 seconds.

**Architecture:** Extend the shared `GameSettings` model with a single persisted news-generation flag, gate the existing monthly-news scheduling path with that flag, then thread a lightweight dialog-open source marker through the store so `NewsDialog` can auto-close only when the panel was opened by a newly generated report.

**Tech Stack:** TypeScript, React 18, Zustand, Vitest, Vite

---

## File Map

- Modify: `src/core/save/SaveManager.ts` — add `newsGenerationEnabled` to `GameSettings` defaults and persistence merge.
- Create: `src/core/save/__tests__/SaveManager.newsSettings.test.ts` — cover default and persisted `newsGenerationEnabled`.
- Modify: `src/core/news/NewsGenerator.ts` — let the scheduling helper short-circuit when news generation is disabled.
- Create: `src/core/news/__tests__/NewsGenerator.settings.test.ts` — cover enabled/disabled scheduling behavior.
- Modify: `src/stores/gameStore.ts` — track whether the current news dialog was auto-opened or manually opened.
- Modify: `src/ui/components/News/NewsDialog.tsx` — add a 5 second auto-close path only for auto-opened dialogs.
- Create: `src/ui/components/News/NewsDialog.test.tsx` — cover the auto-close delay selection helper.
- Modify: `src/core/loop/GameLoop.ts` — pass the persisted setting into the news-generation scheduling check.
- Modify: `src/ui/pages/Settings.tsx` — expose the new toggle in the in-game settings page.
- Modify: `src/ui/pages/MainMenu/components/SettingsDialog.tsx` — expose the same toggle in the main-menu settings dialog.

### Task 1: Persist The News Generation Setting

**Files:**
- Modify: `src/core/save/SaveManager.ts`
- Create: `src/core/save/__tests__/SaveManager.newsSettings.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import { SaveManager } from '@/core/save/SaveManager';

describe('SaveManager news-generation settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults newsGenerationEnabled to true for fresh settings', () => {
    const manager = new SaveManager();

    expect(manager.loadSettings().newsGenerationEnabled).toBe(true);
  });

  it('preserves an explicitly disabled newsGenerationEnabled setting', () => {
    const manager = new SaveManager();

    manager.saveSettings({
      ...manager.loadSettings(),
      newsGenerationEnabled: false,
    });

    expect(manager.loadSettings().newsGenerationEnabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/save/__tests__/SaveManager.newsSettings.test.ts`

Expected: FAIL because `GameSettings` does not include `newsGenerationEnabled` yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export interface GameSettings {
  gameSpeed: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  maxAutoSaves: number;
  language: string;
  newsGenerationEnabled: boolean;
  bankruptcyStrategy?: BankruptcyStrategySettings;
}

return {
  gameSpeed: 1,
  soundEnabled: true,
  musicEnabled: true,
  autoSave: true,
  autoSaveInterval: 60000,
  maxAutoSaves: 5,
  language: 'zh-CN',
  newsGenerationEnabled: true,
  bankruptcyStrategy: bankruptcyResolution.getStrategy(0),
  ...saved,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/save/__tests__/SaveManager.newsSettings.test.ts`

Expected: PASS

### Task 2: Gate Automatic News Generation

**Files:**
- Modify: `src/core/news/NewsGenerator.ts`
- Create: `src/core/news/__tests__/NewsGenerator.settings.test.ts`
- Modify: `src/core/loop/GameLoop.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { shouldGenerateNews } from '../NewsGenerator';

describe('shouldGenerateNews with settings gate', () => {
  it('skips automatic news generation when the setting is disabled', () => {
    expect(shouldGenerateNews(60, false)).toBe(false);
  });

  it('keeps the existing odd-month first-day schedule when enabled', () => {
    expect(shouldGenerateNews(60, true)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/news/__tests__/NewsGenerator.settings.test.ts`

Expected: FAIL because `shouldGenerateNews()` does not accept a settings flag yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function shouldGenerateNews(
  tick: number,
  newsGenerationEnabled: boolean = true,
): boolean {
  if (!newsGenerationEnabled) {
    return false;
  }

  const date = tickToDate(tick);
  if (date.day === 1 && date.month % 2 === 1) {
    if (date.year !== lastGeneratedYear || date.month !== lastGeneratedMonth) {
      return true;
    }
  }

  return false;
}
```

```ts
const settings = saveManager.loadSettings();
if (shouldGenerateNews(currentTick, settings.newsGenerationEnabled)) {
  generateMonthlyNews(this.world)
    .then((report) => {
      if (report) {
        console.log(`[GameLoop] 月度新闻已生成: ${report.headline.title}`);
      }
    })
    .catch((error) => {
      console.error('[GameLoop] 新闻生成失败:', error);
    });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/news/__tests__/NewsGenerator.settings.test.ts`

Expected: PASS

### Task 3: Auto-Close Only Auto-Opened News Dialogs

**Files:**
- Modify: `src/stores/gameStore.ts`
- Modify: `src/ui/components/News/NewsDialog.tsx`
- Create: `src/ui/components/News/NewsDialog.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { getNewsDialogAutoCloseDelay } from './NewsDialog';

describe('getNewsDialogAutoCloseDelay', () => {
  it('uses a 5 second delay for auto-opened reports', () => {
    expect(getNewsDialogAutoCloseDelay('auto-generated')).toBe(5000);
  });

  it('does not auto-close manually opened reports', () => {
    expect(getNewsDialogAutoCloseDelay('manual')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/ui/components/News/NewsDialog.test.tsx`

Expected: FAIL because `getNewsDialogAutoCloseDelay()` and the dialog-open source model do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export type NewsDialogOpenSource = 'auto-generated' | 'manual';

export function getNewsDialogAutoCloseDelay(
  source: NewsDialogOpenSource,
): number | null {
  return source === 'auto-generated' ? 5000 : null;
}
```

```ts
const autoCloseDelay = getNewsDialogAutoCloseDelay(openSource);

useEffect(() => {
  if (!open || !news || autoCloseDelay == null) return;

  const timer = window.setTimeout(() => {
    markCurrentNewsRead();
    onOpenChange(false);
  }, autoCloseDelay);

  return () => window.clearTimeout(timer);
}, [autoCloseDelay, news, onOpenChange, open, markCurrentNewsRead]);
```

```ts
showNewsPopup: (news, source = 'manual') => {
  set((state) => {
    state.ui.pendingNews = news;
    state.ui.showNewsDialog = true;
    state.ui.newsDialogOpenSource = source;
  });
},
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/ui/components/News/NewsDialog.test.tsx`

Expected: PASS

### Task 4: Expose The Toggle In Both Settings Surfaces

**Files:**
- Modify: `src/ui/pages/Settings.tsx`
- Modify: `src/ui/pages/MainMenu/components/SettingsDialog.tsx`

- [ ] **Step 1: Write the failing test expectation in the implementation notes**

Use the persisted setting from Task 1 as the source of truth:

- In-game settings should bind `checked={settings.newsGenerationEnabled}`
- Main-menu settings should bind `checked={settings.newsGenerationEnabled}`
- Both toggles should call `handleSettingChange('newsGenerationEnabled', checked)`

- [ ] **Step 2: Implement the minimal UI**

```tsx
<div className={settingsRowClassName}>
  <div>
    <div className="text-[var(--text-primary)] font-medium">商业周刊自动生成</div>
    <div className="text-sm text-[var(--text-muted)]">关闭后将不再自动生成新的商业周刊</div>
  </div>
  <Switch
    checked={settings.newsGenerationEnabled}
    onCheckedChange={(checked) => handleSettingChange('newsGenerationEnabled', checked)}
    variant="game"
  />
</div>
```

```tsx
<div className="flex items-center justify-between">
  <div>
    <div className="font-medium" style={{ color: isLight ? '#1e293b' : 'white' }}>商业周刊自动生成</div>
    <div className="text-sm" style={{ color: isLight ? '#64748b' : '#71717a' }}>关闭后将不再自动生成新的商业周刊</div>
  </div>
  <button
    className="w-12 h-7 rounded-full transition-all relative"
    style={{
      backgroundColor: settings.newsGenerationEnabled
        ? (isLight ? '#2563eb' : '#3b82f6')
        : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
    }}
    onClick={() => {
      handleSettingChange('newsGenerationEnabled', !settings.newsGenerationEnabled);
      soundManager.playClick();
    }}
  >
    <div
      className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform"
      style={{
        transform: settings.newsGenerationEnabled ? 'translateX(24px)' : 'translateX(4px)',
      }}
    />
  </button>
</div>
```

- [ ] **Step 3: Run focused verification**

Run: `npm test -- src/core/save/__tests__/SaveManager.newsSettings.test.ts src/core/news/__tests__/NewsGenerator.settings.test.ts src/ui/components/News/NewsDialog.test.tsx`

Expected: PASS

### Task 5: Full Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run the targeted test suite**

Run: `npm test -- src/core/save/__tests__/SaveManager.newsSettings.test.ts src/core/news/__tests__/NewsGenerator.settings.test.ts src/ui/components/News/NewsDialog.test.tsx`

Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 3: Review the dirty worktree carefully**

Run: `git diff -- src/core/save/SaveManager.ts src/core/news/NewsGenerator.ts src/core/loop/GameLoop.ts src/stores/gameStore.ts src/ui/components/News/NewsDialog.tsx src/ui/pages/Settings.tsx src/ui/pages/MainMenu/components/SettingsDialog.tsx src/core/save/__tests__/SaveManager.newsSettings.test.ts src/core/news/__tests__/NewsGenerator.settings.test.ts src/ui/components/News/NewsDialog.test.tsx`

Expected: Only the intended news-setting and dialog auto-close changes appear.
