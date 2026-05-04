export interface ProductionLayoutFlags {
  isMobile: boolean;
  isTablet: boolean;
  isNarrowDesktop: boolean;
}

export function shouldUseOverlayProductionLayout({
  isMobile,
  isTablet,
  isNarrowDesktop,
}: ProductionLayoutFlags): boolean {
  return isMobile || isTablet || isNarrowDesktop;
}

export interface FinanceLayoutFlags {
  isTablet: boolean;
  isNarrowDesktop: boolean;
}

export interface RetailLayoutFlags {
  isMobile: boolean;
  isTablet: boolean;
  isNarrowDesktop: boolean;
}

export interface NewsLayoutFlags {
  isMobile: boolean;
  isNarrowDesktop: boolean;
}

export interface SettingsLayoutFlags {
  isMobile: boolean;
  isTablet: boolean;
  isNarrowDesktop: boolean;
}

export interface CompanyDetailOverlayFlags {
  isMobile: boolean;
  isTablet: boolean;
  isNarrowDesktop: boolean;
}

export interface StockMarketLayoutFlags {
  isTablet: boolean;
  isNarrowDesktop: boolean;
}

export function shouldUseCompactFinanceLayout({
  isTablet,
  isNarrowDesktop,
}: FinanceLayoutFlags): boolean {
  return isTablet || isNarrowDesktop;
}

export function shouldUseCompactRetailLayout({
  isMobile,
  isTablet,
  isNarrowDesktop,
}: RetailLayoutFlags): boolean {
  return isMobile || isTablet || isNarrowDesktop;
}

export function shouldUseCompactNewsLayout({
  isMobile,
  isNarrowDesktop,
}: NewsLayoutFlags): boolean {
  return isMobile || isNarrowDesktop;
}

export function shouldUseCompactSettingsLayout({
  isMobile,
  isTablet,
  isNarrowDesktop,
}: SettingsLayoutFlags): boolean {
  return isMobile || isTablet || isNarrowDesktop;
}

export function shouldUseOverlayCompanyDetail({
  isMobile,
  isTablet,
  isNarrowDesktop,
}: CompanyDetailOverlayFlags): boolean {
  return isMobile || isTablet || isNarrowDesktop;
}

export function shouldUseCompactStockMarketLayout({
  isTablet,
  isNarrowDesktop,
}: StockMarketLayoutFlags): boolean {
  return isTablet || isNarrowDesktop;
}
