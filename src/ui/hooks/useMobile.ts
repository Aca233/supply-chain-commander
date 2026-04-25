/**
 * 移动端检测和响应式断点 Hook
 * 提供统一的设备检测和屏幕尺寸判断
 */

import { useState, useEffect, useCallback } from 'react';

// 响应式断点定义
export const BREAKPOINTS = {
  sm: 640,   // 小屏手机
  md: 768,   // 大屏手机/小平板
  lg: 1024,  // 平板/小桌面
  xl: 1280,  // 桌面
  '2xl': 1536, // 大桌面
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export interface MobileState {
  // 设备类型
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768px - 1024px
  isDesktop: boolean;     // > 1024px
  isNarrowDesktop: boolean; // 1024px - 1279px
  isWideDesktop: boolean; // >= 1280px
  
  // 具体断点
  isSm: boolean;          // < 640px
  isMd: boolean;          // >= 640px && < 768px
  isLg: boolean;          // >= 768px && < 1024px
  isXl: boolean;          // >= 1280px && < 1536px
  is2xl: boolean;         // >= 1536px
  
  // 屏幕尺寸
  width: number;
  height: number;
  
  // 方向
  isLandscape: boolean;
  isPortrait: boolean;
  
  // 触摸设备
  isTouchDevice: boolean;
}

/**
 * 检测是否为触摸设备
 */
const detectTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * 纯函数：根据宽高计算响应式状态
 */
export function getResponsiveState(
  width: number,
  height: number,
  isTouchDevice = false
): MobileState {
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isNarrowDesktop = width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
  const isWideDesktop = width >= BREAKPOINTS.xl;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isNarrowDesktop,
    isWideDesktop,
    isSm: width < BREAKPOINTS.sm,
    isMd: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isLg: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isXl: width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'],
    is2xl: width >= BREAKPOINTS['2xl'],
    width,
    height,
    isLandscape: width > height,
    isPortrait: width <= height,
    isTouchDevice,
  };
}

/**
 * 获取当前屏幕状态
 */
const getScreenState = (): MobileState => {
  if (typeof window === 'undefined') {
    return getResponsiveState(1280, 720, false);
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  return getResponsiveState(width, height, detectTouchDevice());
};

/**
 * 移动端检测 Hook
 * @returns MobileState 当前屏幕状态
 */
export function useMobile(): MobileState {
  const [state, setState] = useState<MobileState>(getScreenState);

  const handleResize = useCallback(() => {
    setState(getScreenState());
  }, []);

  useEffect(() => {
    // 初始化
    handleResize();

    // 监听窗口变化
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  return state;
}

/**
 * 简化版：只检测是否为移动端
 */
export function useIsMobile(): boolean {
  const { isMobile } = useMobile();
  return isMobile;
}

/**
 * 媒体查询 Hook
 * @param query CSS 媒体查询字符串
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export default useMobile;
