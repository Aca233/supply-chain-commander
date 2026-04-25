import { describe, expect, it } from 'vitest';

import { getDashboardLayoutMode } from '../dashboardLayout';

describe('getDashboardLayoutMode', () => {
  it('prefers the narrow desktop layout when only the narrow desktop flag is set', () => {
    expect(
      getDashboardLayoutMode({
        isMobile: false,
        isTablet: false,
        isNarrowDesktop: true,
      })
    ).toBe('narrow-desktop');
  });

  it('keeps mobile and tablet layouts ahead of desktop variants', () => {
    expect(
      getDashboardLayoutMode({
        isMobile: true,
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe('mobile');

    expect(
      getDashboardLayoutMode({
        isMobile: false,
        isTablet: true,
        isNarrowDesktop: false,
      })
    ).toBe('tablet');
  });

  it('falls back to wide desktop when no compact mode matches', () => {
    expect(
      getDashboardLayoutMode({
        isMobile: false,
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe('wide-desktop');
  });
});
