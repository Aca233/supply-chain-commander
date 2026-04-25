import { describe, expect, it } from 'vitest';

import { BREAKPOINTS, getResponsiveState } from '../useMobile';

describe('getResponsiveState', () => {
  it('classifies narrow desktop separately from tablet and wide desktop', () => {
    const narrow = getResponsiveState(1180, 800, false);

    expect(narrow.isDesktop).toBe(true);
    expect(narrow.isTablet).toBe(false);
    expect(narrow.isNarrowDesktop).toBe(true);
    expect(narrow.isWideDesktop).toBe(false);
    expect(narrow.isXl).toBe(false);
    expect(narrow.is2xl).toBe(false);
  });

  it('keeps tablet widths out of desktop mode', () => {
    const tablet = getResponsiveState(BREAKPOINTS.md + 40, 1024, true);

    expect(tablet.isMobile).toBe(false);
    expect(tablet.isTablet).toBe(true);
    expect(tablet.isDesktop).toBe(false);
    expect(tablet.isNarrowDesktop).toBe(false);
  });

  it('marks xl and 2xl ranges using declared breakpoints', () => {
    const wide = getResponsiveState(1366, 768, false);
    const veryWide = getResponsiveState(1600, 900, false);

    expect(wide.isDesktop).toBe(true);
    expect(wide.isNarrowDesktop).toBe(false);
    expect(wide.isWideDesktop).toBe(true);
    expect(wide.isXl).toBe(true);
    expect(wide.is2xl).toBe(false);
    expect(veryWide.is2xl).toBe(true);
  });
});
