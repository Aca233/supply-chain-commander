export interface DashboardLayoutFlags {
  isMobile: boolean;
  isTablet: boolean;
  isNarrowDesktop: boolean;
}

export type DashboardLayoutMode =
  | 'mobile'
  | 'tablet'
  | 'narrow-desktop'
  | 'wide-desktop';

export function getDashboardLayoutMode({
  isMobile,
  isTablet,
  isNarrowDesktop,
}: DashboardLayoutFlags): DashboardLayoutMode {
  if (isMobile) {
    return 'mobile';
  }

  if (isTablet) {
    return 'tablet';
  }

  if (isNarrowDesktop) {
    return 'narrow-desktop';
  }

  return 'wide-desktop';
}
