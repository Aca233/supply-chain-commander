import { afterEach, describe, expect, it, vi } from 'vitest';

import { SaveManager } from '@/core/save/SaveManager';

describe('SaveManager storage fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and saves settings without logging storage errors when localStorage is unavailable', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const manager = new SaveManager();

    const settings = manager.loadSettings();
    manager.saveSettings(settings);

    expect(settings.newsGenerationEnabled).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports zero storage usage when localStorage is unavailable', () => {
    const manager = new SaveManager();

    expect(manager.getStorageUsage()).toEqual({ used: 0, total: 5 * 1024 * 1024, percent: 0 });
  });
});
