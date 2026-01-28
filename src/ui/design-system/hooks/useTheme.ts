/**
 * 🌙 useTheme Hook
 * 主题管理 Hook
 */

import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface UseThemeReturn {
  /** 当前主题设置 */
  theme: Theme;
  /** 设置主题 */
  setTheme: (theme: Theme) => void;
  /** 实际解析后的主题（light 或 dark） */
  resolvedTheme: 'light' | 'dark';
  /** 是否为深色模式 */
  isDark: boolean;
  /** 切换深浅主题 */
  toggleTheme: () => void;
}

const THEME_KEY = 'scc-theme';

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return 'dark'; // 默认深色主题
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // 计算实际主题
  const getResolvedTheme = useCallback((): 'light' | 'dark' => {
    if (theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark';
    }
    return theme;
  }, [theme]);

  // 应用主题
  useEffect(() => {
    const root = document.documentElement;
    const resolved = getResolvedTheme();
    
    setResolvedTheme(resolved);
    
    // 移除旧类名，添加新类名
    root.classList.remove('light', 'dark');
    if (resolved === 'light') {
      root.classList.add('light');
    }
    // dark 是默认的，不需要添加类名（CSS变量默认就是深色）
    
    // 监听系统主题变化
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        root.classList.remove('light', 'dark');
        if (newResolved === 'light') {
          root.classList.add('light');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, getResolvedTheme]);

  // 设置主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    setTheme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    toggleTheme,
  };
}

export default useTheme;
