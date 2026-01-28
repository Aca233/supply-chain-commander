/**
 * 🔘 Button 组件
 * 支持多种变体、尺寸和状态
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
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
    'select-none',
  ],
  {
    variants: {
      variant: {
        // 主要按钮 - 霓虹蓝
        primary: [
          'bg-[var(--accent)] text-white',
          'hover:bg-[var(--accent-hover)]',
          'focus-visible:ring-[var(--accent)]',
          'shadow-md shadow-[var(--accent)]/20',
          'hover:shadow-lg hover:shadow-[var(--accent)]/30',
        ],
        // 次要按钮
        secondary: [
          'bg-[var(--bg-muted)] text-[var(--text-primary)]',
          'border border-[var(--border-default)]',
          'hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]',
          'focus-visible:ring-[var(--border-strong)]',
        ],
        // 幽灵按钮
        ghost: [
          'text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]',
          'focus-visible:ring-[var(--border-default)]',
        ],
        // 链接按钮
        link: [
          'text-[var(--accent)]',
          'underline-offset-4 hover:underline',
          'focus-visible:ring-[var(--accent)]',
        ],
        // 危险按钮
        danger: [
          'bg-[var(--error)] text-white',
          'hover:bg-red-600',
          'focus-visible:ring-[var(--error)]',
          'shadow-md shadow-[var(--error)]/20',
        ],
        // 成功按钮
        success: [
          'bg-[var(--success)] text-white',
          'hover:bg-green-600',
          'focus-visible:ring-[var(--success)]',
          'shadow-md shadow-[var(--success)]/20',
        ],
        // 霓虹按钮 - 游戏风格
        neon: [
          'bg-transparent text-[var(--accent)]',
          'border-2 border-[var(--accent)]',
          'hover:bg-[var(--accent)]/10',
          'shadow-[0_0_10px_var(--accent-glow)]',
          'hover:shadow-[0_0_20px_var(--accent-glow)]',
          'focus-visible:ring-[var(--accent)]',
        ],
        // 渐变按钮
        gradient: [
          'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
          'text-white',
          'hover:from-blue-600 hover:via-purple-600 hover:to-pink-600',
          'shadow-lg shadow-purple-500/30',
          'focus-visible:ring-purple-500',
        ],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded',
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-9 px-4 text-sm rounded-lg',
        lg: 'h-10 px-5 text-sm rounded-lg',
        xl: 'h-11 px-6 text-base rounded-xl',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
        'icon-xs': 'h-7 w-7 rounded',
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
