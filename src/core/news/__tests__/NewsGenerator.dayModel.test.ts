import { beforeEach, describe, expect, it } from 'vitest';

import { resetNewsSystem, shouldCaptureSnapshot, shouldGenerateNews } from '../NewsGenerator';

describe('NewsGenerator day-based cadence', () => {
  beforeEach(() => {
    resetNewsSystem();
  });

  it('captures snapshots on the first day of odd-numbered months', () => {
    expect(shouldCaptureSnapshot(0)).toBe(true);
    expect(shouldCaptureSnapshot(30)).toBe(false);
    expect(shouldCaptureSnapshot(60)).toBe(true);
  });

  it('generates reports on odd-month openings without relying on hour ticks', () => {
    expect(shouldGenerateNews(0)).toBe(true);
    expect(shouldGenerateNews(1)).toBe(false);
    expect(shouldGenerateNews(30)).toBe(false);
    expect(shouldGenerateNews(60)).toBe(true);
  });
});
