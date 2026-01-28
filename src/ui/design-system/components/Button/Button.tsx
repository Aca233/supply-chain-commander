/**
 * 🔘 Button 组件
 * 现代毛玻璃风格，支持多种变体、尺寸和状态
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  // 基础样式
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium whitespace-nowrap',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
    'disabled:pointer-events-none',
    'active:scale-[0.98]',
    'select-none',
  ],
  {
    variants: {
      variant: {
        // 主要按钮 - 渐变毛玻璃风格
        primary: [
          'bg-gradient-to-r from-blue-500 to-purple-500',
          'text-white',
          'border border-white/20',
          'hover:from-blue-400 hover:to-purple-400',
          'hover:-translate-y-0.5',
          'focus-visible:ring-blue-500',
          'shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]',
          'hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]',
          'disabled:bg-white/10 disabled:border-white/10 disabled:text-white/40 disabled:shadow-none disabled:from-white/10 disabled:to-white/10',
        ],
        // 次要按钮 - 毛玻璃
        secondary: [
          'bg-white/[0.08] text-[var(--text-primary)]',
          'backdrop-blur-sm',
          'border border-white/[0.12]',
          'hover:bg-white/[0.12] hover:border-white/[0.2]',
          'focus-visible:ring-white/30',
          'disabled:bg-white/[0.05] disabled:text-white/40',
        ],
        // 幽灵按钮 - 透明毛玻璃
        ghost: [
          'text-[var(--text-secondary)]',
          'hover:bg-white/[0.08] hover:text-[var(--text-primary)]',
          'focus-visible:ring-white/20',
        ],
        // 链接按钮
        link: [
          'text-[var(--accent)]',
          'underline-offset-4 hover:underline',
          'focus-visible:ring-[var(--accent)]',
        ],
        // 危险按钮 - 红色渐变
        danger: [
          'bg-gradient-to-r from-red-500 to-rose-500',
          'text-white',
          'border border-white/20',
          'hover:from-red-400 hover:to-rose-400',
          'focus-visible:ring-red-500',
          'shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]',
          'disabled:bg-white/10 disabled:border-white/10 disabled:text-white/40 disabled:shadow-none disabled:from-white/10 disabled:to-white/10',
        ],
        // 成功按钮 - 绿色渐变
        success: [
          'bg-gradient-to-r from-green-500 to-emerald-500',
          'text-white',
          'border border-white/20',
          'hover:from-green-400 hover:to-emerald-400',
          'focus-visible:ring-green-500',
          'shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]',
          'disabled:bg-white/10 disabled:border-white/10 disabled:text-white/40 disabled:shadow-none disabled:from-white/10 disabled:to-white/10',
        ],
        // 警告按钮 - 橙色渐变
        warning: [
          'bg-gradient-to-r from-amber-500 to-orange-500',
          'text-white',
          'border border-white/20',
          'hover:from-amber-400 hover:to-orange-400',
          'focus-visible:ring-amber-500',
          'shadow-[0_4px_15px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]',
          'disabled:bg-white/10 disabled:border-white/10 disabled:text-white/40 disabled:shadow-none disabled:from-white/10 disabled:to-white/10',
        ],
        // 毛玻璃按钮 - 半透明
        glass: [
          'bg-white/[0.08] text-white/90',
          'backdrop-blur-md',
          'border border-white/[0.12]',
          'hover:bg-white/[0.12] hover:border-white/[0.2]',
          'focus-visible:ring-white/30',
        ],
        // 霓虹按钮 - 发光边框
        neon: [
          'bg-transparent text-[var(--accent)]',
          'border-2 border-[var(--accent)]',
          'hover:bg-[var(--accent)]/10',
          'shadow-[0_0_10px_var(--accent-glow)]',
          'hover:shadow-[0_0_20px_var(--accent-glow)]',
          'focus-visible:ring-[var(--accent)]',
        ],
        // 渐变按钮 - 彩虹
        gradient: [
          'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
          'text-white',
          'border border-white/20',
          'hover:from-blue-400 hover:via-purple-400 hover:to-pink-400',
          'shadow-[0_4px_20px_rgba(139,92,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]',
          'focus-visible:ring-purple-500',
        ],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-lg',
        sm: 'h-8 px-3 text-xs rounded-lg',
        md: 'h-9 px-4 text-sm rounded-xl',
        lg: 'h-10 px-5 text-sm rounded-xl',
        xl: 'h-11 px-6 text-base rounded-2xl',
        icon: 'h-9 w-9 rounded-xl',
        'icon-sm': 'h-8 w-8 rounded-lg',
        'icon-xs': 'h-7 w-7 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 加载状态 */
  loading?: boolean;
  /** 左侧图标 */
  leftIcon?: ReactNode;
  /** 右侧图标 */
  rightIcon?: ReactNode;
  /** 图标按钮模式（只显示图标） */
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const actualSize = iconOnly ? (size === 'md' ? 'icon' : size === 'sm' ? 'icon-sm' : 'icon-xs') : size;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size: actualSize, fullWidth }), className)}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {!iconOnly && children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
export default Button;
