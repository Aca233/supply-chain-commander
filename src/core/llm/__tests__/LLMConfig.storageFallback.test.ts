import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearLLMConfig, getDefaultConfig, isLLMConfigured, loadLLMConfig, saveLLMConfig } from '../LLMConfig';

describe('LLMConfig storage fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses defaults without logging storage errors when localStorage is unavailable', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(loadLLMConfig()).toEqual(getDefaultConfig());
    expect(isLLMConfigured()).toBe(false);
    saveLLMConfig({ apiKey: 'test-key' });
    clearLLMConfig();

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
