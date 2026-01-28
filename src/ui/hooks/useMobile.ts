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
  
  // 具体断点
  isSm: boolean;          // < 640px
  isMd: boolean;          // >= 640px && < 768px
  isLg: boolean;          // >= 768px && < 1024px
  isXl: boolean;          // >= 1024px && < 1280px
  is2xl: boolean;         // >= 1280px
  
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
 * 获取当前屏幕状态
 */
const getScreenState = (): MobileState => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isSm: false,
      isMd: false,
      isLg: false,
      isXl: true,
      is2xl: false,
      width: 1280,
      height: 720,
      isLandscape: true,
      isPortrait: false,
      isTouchDevice: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    // 设备类型
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    
    // 具体断点
    isSm: width < BREAKPOINTS.sm,
    isMd: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isLg: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isXl: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    is2xl: width >= BREAKPOINTS.xl,
    
    // 屏幕尺寸
    width,
    height,
    
    // 方向
    isLandscape: width > height,
    isPortrait: width <= height,
    
    // 触摸设备
    isTouchDevice: detectTouchDevice(),
  };
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
