/**
 * 🌑 阴影系统
 * 游戏风格：霓虹发光 + 深度阴影
 */

export const shadows = {
  // 基础阴影
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.4)',
  DEFAULT: '0 4px 8px rgba(0, 0, 0, 0.4)',
  md: '0 6px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  xl: '0 12px 40px rgba(0, 0, 0, 0.5)',
  '2xl': '0 20px 60px rgba(0, 0, 0, 0.6)',
  
  // 内阴影
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
  'inner-lg': 'inset 0 4px 8px rgba(0, 0, 0, 0.4)',
  
  // 发光效果
  glow: {
    sm: '0 0 10px',
    DEFAULT: '0 0 20px',
    lg: '0 0 30px',
    xl: '0 0 40px',
  },
  
  // 预设发光阴影
  'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
  'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4)',
  'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',
  'glow-red': '0 0 20px rgba(239, 68, 68, 0.4)',
  'glow-orange': '0 0 20px rgba(249, 115, 22, 0.4)',
  'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
  
  // 卡片阴影
  card: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  'card-hover': '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  'card-elevated': '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  
  // 弹窗阴影
  modal: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  dropdown: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
} as const;

// 模糊效果
export const blur = {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
} as const;

// 背景模糊（毛玻璃效果）
export const backdropBlur = {
  none: 'blur(0)',
  sm: 'blur(4px)',
  DEFAULT: 'blur(8px)',
  md: 'blur(12px)',
  lg: 'blur(16px)',
  xl: 'blur(24px)',
} as const;
