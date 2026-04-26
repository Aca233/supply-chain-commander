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
