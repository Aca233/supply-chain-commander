/**
 * 🔤 字体系统
 * 优化阅读体验和数字显示
 */

export const fontFamily = {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(', '),
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'Consolas',
    'Monaco',
    '"Courier New"',
    'monospace',
  ].join(', '),
  display: [
    '"Space Grotesk"',
    'Inter',
    'sans-serif',
  ].join(', '),
};

export const fontSize = {
  '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
  xs: ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
  sm: ['12px', { lineHeight: '18px', letterSpacing: '0' }],
  base: ['13px', { lineHeight: '20px', letterSpacing: '0' }],
  md: ['14px', { lineHeight: '22px', letterSpacing: '0' }],
  lg: ['16px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
  xl: ['18px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
  '2xl': ['22px', { lineHeight: '30px', letterSpacing: '-0.02em' }],
  '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
  '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
  '5xl': ['48px', { lineHeight: '52px', letterSpacing: '-0.02em' }],
} as const;

export const fontWeight = {
  thin: '100',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;
