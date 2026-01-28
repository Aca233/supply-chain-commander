/**
 * 🏷️ Badge 组件
 * 用于状态标签、计数器等
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1',
    'font-medium whitespace-nowrap',
    'transition-colors duration-150',
  ],
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-muted)] text-[var(--text-secondary)]',
        primary: 'bg-[var(--accent-muted)] text-[var(--accent)]',
        success: 'bg-[var(--success-muted)] text-[var(--success)]',
        warning: 'bg-[var(--warning-muted)] text-[var(--warning)]',
        error: 'bg-[var(--error-muted)] text-[var(--error)]',
        info: 'bg-[var(--info-muted)] text-[var(--info)]',
        outline: 'bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)]',
        // 毛玻璃风格
        glass: 'bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] text-white/90',
        subtle: 'bg-white/[0.05] text-white/60 border border-white/[0.08]',
        // 游戏风格
        gold: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
        legendary: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30',
        epic: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
        rare: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        common: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
      },
      size: {
        xs: 'text-[9px] px-1 py-0.5 rounded',
        sm: 'text-[10px] px-1.5 py-0.5 rounded',
        md: 'text-xs px-2 py-0.5 rounded-md',
        lg: 'text-sm px-2.5 py-1 rounded-md',
      },
      glow: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'success',
        glow: true,
        className: 'shadow-[0_0_8px_var(--success-muted)]',
      },
      {
        variant: 'error',
        glow: true,
        className: 'shadow-[0_0_8px_var(--error-muted)]',
      },
      {
        variant: 'warning',
        glow: true,
        className: 'shadow-[0_0_8px_var(--warning-muted)]',
      },
      {
        variant: 'primary',
        glow: true,
        className: 'shadow-[0_0_8px_var(--accent-muted)]',
      },
      {
        variant: 'gold',
        glow: true,
        className: 'shadow-[0_0_10px_rgba(255,215,0,0.3)]',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
      glow: false,
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** 显示圆点指示器 */
  dot?: boolean;
  /** 圆点颜色（默认继承variant颜色） */
  dotColor?: string;
  /** 可移除 */
  removable?: boolean;
  /** 移除回调 */
  onRemove?: () => void;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      glow,
      dot,
      dotColor,
      removable,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    const getDotColorClass = () => {
      if (dotColor) return '';
      switch (variant) {
        case 'success': return 'bg-[var(--success)]';
        case 'warning': return 'bg-[var(--warning)]';
        case 'error': return 'bg-[var(--error)]';
        case 'info': return 'bg-[var(--info)]';
        case 'primary': return 'bg-[var(--accent)]';
        case 'gold': return 'bg-yellow-400';
        default: return 'bg-[var(--text-muted)]';
      }
    };

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, glow }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full animate-pulse',
              getDotColorClass()
            )}
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
        )}
        {children}
        {removable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="ml-0.5 hover:bg-white/10 rounded p-0.5 transition-colors"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { badgeVariants };
export default Badge;
