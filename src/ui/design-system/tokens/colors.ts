/**
 * 🎨 颜色系统
 * 设计理念：现代毛玻璃风格，半透明层次感
 */

export const colors = {
  // 品牌色 - 赛博蓝
  brand: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // 主色
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },
  
  // 强调色 - 霓虹紫
  accent: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',  // 主色
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
  },
  
  // 灰度色 - Zinc系（游戏风格）
  gray: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },
  
  // 语义色
  semantic: {
    success: {
      light: '#4ADE80',
      DEFAULT: '#22C55E',
      dark: '#16A34A',
      muted: 'rgba(34, 197, 94, 0.15)',
      glow: 'rgba(34, 197, 94, 0.4)',
    },
    warning: {
      light: '#FBBF24',
      DEFAULT: '#F59E0B',
      dark: '#D97706',
      muted: 'rgba(245, 158, 11, 0.15)',
      glow: 'rgba(245, 158, 11, 0.4)',
    },
    error: {
      light: '#F87171',
      DEFAULT: '#EF4444',
      dark: '#DC2626',
      muted: 'rgba(239, 68, 68, 0.15)',
      glow: 'rgba(239, 68, 68, 0.4)',
    },
    info: {
      light: '#60A5FA',
      DEFAULT: '#3B82F6',
      dark: '#2563EB',
      muted: 'rgba(59, 130, 246, 0.15)',
      glow: 'rgba(59, 130, 246, 0.4)',
    },
  },
  
  // 游戏专用色 - 资源类型
  game: {
    gold: { DEFAULT: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)' },
    copper: { DEFAULT: '#CD7F32', glow: 'rgba(205, 127, 50, 0.4)' },
    steel: { DEFAULT: '#71797E', glow: 'rgba(113, 121, 126, 0.4)' },
    energy: { DEFAULT: '#00BFFF', glow: 'rgba(0, 191, 255, 0.5)' },
    food: { DEFAULT: '#90EE90', glow: 'rgba(144, 238, 144, 0.4)' },
    luxury: { DEFAULT: '#E6E6FA', glow: 'rgba(230, 230, 250, 0.4)' },
    oil: { DEFAULT: '#2F4F4F', glow: 'rgba(47, 79, 79, 0.4)' },
    crystal: { DEFAULT: '#E0FFFF', glow: 'rgba(224, 255, 255, 0.5)' },
  },
  
  // 图表色板
  chart: {
    primary: ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#22C55E', '#06B6D4'],
    gradient: {
      blue: ['#3B82F6', '#06B6D4'],
      purple: ['#8B5CF6', '#EC4899'],
      green: ['#22C55E', '#10B981'],
      orange: ['#F97316', '#FBBF24'],
      red: ['#EF4444', '#F87171'],
    },
    positive: '#22C55E',
    negative: '#EF4444',
    neutral: '#71717A',
  },
  
  // 霓虹发光效果色
  neon: {
    blue: '#00D4FF',
    purple: '#BF00FF',
    pink: '#FF00A0',
    green: '#00FF88',
    orange: '#FF6600',
    yellow: '#FFE600',
  },
  // 毛玻璃效果专用色
  glass: {
    bg: {
      light: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.08)',
      strong: 'rgba(255, 255, 255, 0.12)',
      hover: 'rgba(255, 255, 255, 0.15)',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      default: 'rgba(255, 255, 255, 0.12)',
      strong: 'rgba(255, 255, 255, 0.2)',
      hover: 'rgba(255, 255, 255, 0.25)',
    },
    highlight: 'rgba(255, 255, 255, 0.15)',
    shadow: {
      default: '0 8px 32px rgba(0, 0, 0, 0.3)',
      hover: '0 12px 40px rgba(0, 0, 0, 0.4)',
      elevated: '0 16px 48px rgba(0, 0, 0, 0.5)',
    },
  },
} as const;

// 深色主题 CSS 变量 - 毛玻璃风格
export const darkTheme = {
  // 背景层级 - 稍微提亮以支持毛玻璃层次
  '--bg-base': '#0c0c0e',           // 最底层（从#050505提亮）
  '--bg-surface': '#12121a',        // 表面层
  '--bg-elevated': '#1c1c24',       // 浮起层
  '--bg-overlay': '#262632',        // 覆盖层
  '--bg-muted': '#363644',          // 静音层
  '--bg-subtle': '#464656',         // 微妙层
  
  // 背景渐变
  '--bg-gradient-dark': 'linear-gradient(135deg, #0c0c0e 0%, #141420 50%, #0c0c0e 100%)',
  '--bg-gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
  '--bg-gradient-glow': 'radial-gradient(ellipse at top, rgba(59,130,246,0.12) 0%, transparent 50%)',
  
  // 毛玻璃效果
  '--glass-blur-sm': '8px',
  '--glass-blur-md': '16px',
  '--glass-blur-lg': '24px',
  '--glass-bg-light': 'rgba(255, 255, 255, 0.05)',
  '--glass-bg-medium': 'rgba(255, 255, 255, 0.08)',
  '--glass-bg-strong': 'rgba(255, 255, 255, 0.12)',
  '--glass-border-subtle': 'rgba(255, 255, 255, 0.08)',
  '--glass-border-default': 'rgba(255, 255, 255, 0.12)',
  '--glass-border-strong': 'rgba(255, 255, 255, 0.2)',
  '--glass-highlight': 'rgba(255, 255, 255, 0.15)',
  '--glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.3)',
  '--glass-shadow-hover': '0 12px 40px rgba(0, 0, 0, 0.4)',
  
  // 文字色
  '--text-primary': '#FAFAFA',
  '--text-secondary': '#A1A1AA',
  '--text-muted': '#71717A',
  '--text-subtle': '#52525B',
  '--text-inverse': '#09090B',
  
  // 边框色
  '--border-default': '#27272A',
  '--border-muted': '#1F1F23',
  '--border-strong': '#3F3F46',
  '--border-focus': '#3B82F6',
  
  // 品牌色
  '--accent': '#3B82F6',
  '--accent-hover': '#60A5FA',
  '--accent-active': '#2563EB',
  '--accent-muted': 'rgba(59, 130, 246, 0.15)',
  '--accent-glow': 'rgba(59, 130, 246, 0.4)',
  
  // 渐变色
  '--gradient-primary': 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
  '--gradient-success': 'linear-gradient(90deg, #22C55E 0%, #4ADE80 100%)',
  '--gradient-warning': 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)',
  '--gradient-error': 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)',
  
  // 语义色
  '--success': '#22C55E',
  '--success-muted': 'rgba(34, 197, 94, 0.15)',
  '--success-glow': 'rgba(34, 197, 94, 0.3)',
  '--warning': '#F59E0B',
  '--warning-muted': 'rgba(245, 158, 11, 0.15)',
  '--warning-glow': 'rgba(245, 158, 11, 0.3)',
  '--error': '#EF4444',
  '--error-muted': 'rgba(239, 68, 68, 0.15)',
  '--error-glow': 'rgba(239, 68, 68, 0.3)',
  '--info': '#3B82F6',
  '--info-muted': 'rgba(59, 130, 246, 0.15)',
  '--info-glow': 'rgba(59, 130, 246, 0.3)',
} as const;

// 浅色主题 CSS 变量（备用）
export const lightTheme = {
  '--bg-base': '#FFFFFF',
  '--bg-surface': '#FAFAFA',
  '--bg-elevated': '#FFFFFF',
  '--bg-overlay': '#F4F4F5',
  '--bg-muted': '#E4E4E7',
  '--bg-subtle': '#D4D4D8',
  
  '--bg-gradient-dark': 'linear-gradient(135deg, #FAFAFA 0%, #F4F4F5 50%, #FAFAFA 100%)',
  '--bg-gradient-card': 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 100%)',
  '--bg-gradient-glow': 'radial-gradient(ellipse at top, rgba(59,130,246,0.08) 0%, transparent 50%)',
  
  '--text-primary': '#18181B',
  '--text-secondary': '#52525B',
  '--text-muted': '#71717A',
  '--text-subtle': '#A1A1AA',
  '--text-inverse': '#FAFAFA',
  
  '--border-default': '#E4E4E7',
  '--border-muted': '#F4F4F5',
  '--border-strong': '#D4D4D8',
  '--border-focus': '#3B82F6',
  
  '--accent': '#3B82F6',
  '--accent-hover': '#2563EB',
  '--accent-active': '#1D4ED8',
  '--accent-muted': 'rgba(59, 130, 246, 0.1)',
  '--accent-glow': 'rgba(59, 130, 246, 0.25)',
  
  '--success': '#16A34A',
  '--success-muted': 'rgba(22, 163, 74, 0.1)',
  '--warning': '#D97706',
  '--warning-muted': 'rgba(217, 119, 6, 0.1)',
  '--error': '#DC2626',
  '--error-muted': 'rgba(220, 38, 38, 0.1)',
  '--info': '#2563EB',
  '--info-muted': 'rgba(37, 99, 235, 0.1)',
} as const;

export type ThemeColors = typeof darkTheme;
