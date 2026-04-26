import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SaveManager } from '@/core/save/SaveManager';

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    get length() {
      return store.size;
    },
  };
}

vi.stubGlobal('localStorage', createLocalStorageMock());

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
