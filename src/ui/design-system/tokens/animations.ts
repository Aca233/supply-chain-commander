/**
 * ✨ 动画系统
 * 流畅的游戏风格动画
 */

// 缓动函数
export const easings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // 游戏风格缓动
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

// 持续时间
export const durations = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
} as const;

// 关键帧动画定义
export const keyframes = {
  // 淡入淡出
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  fadeOut: {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },
  
  // 滑动
  slideInUp: {
    from: { opacity: '0', transform: 'translateY(10px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  slideInDown: {
    from: { opacity: '0', transform: 'translateY(-10px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  slideInLeft: {
    from: { opacity: '0', transform: 'translateX(-10px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  slideInRight: {
    from: { opacity: '0', transform: 'translateX(10px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  
  // 缩放
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  scaleOut: {
    from: { opacity: '1', transform: 'scale(1)' },
    to: { opacity: '0', transform: 'scale(0.95)' },
  },
  
  // 弹跳
  bounceIn: {
    '0%': { opacity: '0', transform: 'scale(0.3)' },
    '50%': { opacity: '1', transform: 'scale(1.05)' },
    '70%': { transform: 'scale(0.9)' },
    '100%': { transform: 'scale(1)' },
  },
  
  // 脉冲
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  
  // 发光脉冲
  glowPulse: {
    '0%, 100%': { boxShadow: '0 0 5px currentColor' },
    '50%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
  },
  
  // 旋转
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  
  // 闪烁
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  
  // 浮动
  float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-5px)' },
  },
  
  // 抖动（错误反馈）
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
  },
  
  // 进度条流动
  progress: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
} as const;

// 动画预设
export const animations = {
  fadeIn: 'fadeIn 200ms ease-out',
  fadeOut: 'fadeOut 200ms ease-out',
  slideInUp: 'slideInUp 200ms ease-out',
  slideInDown: 'slideInDown 200ms ease-out',
  slideInLeft: 'slideInLeft 200ms ease-out',
  slideInRight: 'slideInRight 200ms ease-out',
  scaleIn: 'scaleIn 200ms ease-out',
  scaleOut: 'scaleOut 150ms ease-in',
  bounceIn: 'bounceIn 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  pulse: 'pulse 2s ease-in-out infinite',
  glowPulse: 'glowPulse 2s ease-in-out infinite',
  spin: 'spin 1s linear infinite',
  shimmer: 'shimmer 2s linear infinite',
  float: 'float 3s ease-in-out infinite',
  shake: 'shake 500ms ease-in-out',
} as const;
