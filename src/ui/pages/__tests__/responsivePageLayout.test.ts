import { describe, expect, it } from 'vitest';

import {
  shouldUseCompactFinanceLayout,
  shouldUseCompactNewsLayout,
  shouldUseCompactRetailLayout,
  shouldUseCompactSettingsLayout,
  shouldUseCompactStockMarketLayout,
  shouldUseOverlayCompanyDetail,
} from '../responsivePageLayout';

describe('shouldUseCompactFinanceLayout', () => {
  it('enables compact finance layout for tablet and narrow desktop only', () => {
    expect(
      shouldUseCompactFinanceLayout({
        isTablet: true,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseCompactFinanceLayout({
        isTablet: false,
        isNarrowDesktop: true,
      })
    ).toBe(true);

    expect(
      shouldUseCompactFinanceLayout({
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe(false);
  });
});

describe('shouldUseCompactRetailLayout', () => {
  it('keeps retail compact on mobile, tablet, and narrow desktop', () => {
    expect(
      shouldUseCompactRetailLayout({
        isMobile: true,
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseCompactRetailLayout({
        isMobile: false,
        isTablet: true,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseCompactRetailLayout({
        isMobile: false,
        isTablet: false,
        isNarrowDesktop: true,
      })
    ).toBe(true);

    expect(
      shouldUseCompactRetailLayout({
        isMobile: false,
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe(false);
  });
});

describe('shouldUseCompactNewsLayout', () => {
  it('keeps news controls compact on mobile and narrow desktop', () => {
    expect(
      shouldUseCompactNewsLayout({
        isMobile: true,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseCompactNewsLayout({
        isMobile: false,
        isNarrowDesktop: true,
      })
    ).toBe(true);

    expect(
      shouldUseCompactNewsLayout({
        isMobile: false,
        isNarrowDesktop: false,
      })
    ).toBe(false);
  });
});

describe('shouldUseCompactSettingsLayout', () => {
  it('treats mobile, tablet, and narrow desktop as compact settings layouts', () => {
    expect(
      shouldUseCompactSettingsLayout({
        isMobile: true,
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseCompactSettingsLayout({
        isMobile: false,
        isTablet: true,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseCompactSettingsLayout({
        isMobile: false,
        isTablet: false,
        isNarrowDesktop: true,
      })
    ).toBe(true);

    expect(
      shouldUseCompactSettingsLayout({
        isMobile: false,
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe(false);
  });
});

describe('shouldUseOverlayCompanyDetail', () => {
  it('opens company detail as an overlay on mobile, tablet, and narrow desktop', () => {
    expect(
      shouldUseOverlayCompanyDetail({
        isMobile: true,
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseOverlayCompanyDetail({
        isMobile: false,
        isTablet: true,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseOverlayCompanyDetail({
        isMobile: false,
        isTablet: false,
        isNarrowDesktop: true,
      })
    ).toBe(true);

    expect(
      shouldUseOverlayCompanyDetail({
        isMobile: false,
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe(false);
  });
});

describe('shouldUseCompactStockMarketLayout', () => {
  it('keeps the stock market compact on tablet and narrow desktop', () => {
    expect(
      shouldUseCompactStockMarketLayout({
        isTablet: true,
        isNarrowDesktop: false,
      })
    ).toBe(true);

    expect(
      shouldUseCompactStockMarketLayout({
        isTablet: false,
        isNarrowDesktop: true,
      })
    ).toBe(true);

    expect(
      shouldUseCompactStockMarketLayout({
        isTablet: false,
        isNarrowDesktop: false,
      })
    ).toBe(false);
  });
});
