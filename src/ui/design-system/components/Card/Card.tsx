/**
 * 🃏 Card 组件
 * 现代毛玻璃风格卡片，支持发光效果和状态指示
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const cardVariants = cva(
  [
    'rounded-2xl border transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        // 默认卡片
        default: [
          'bg-[var(--bg-surface)]',
          'border-[var(--border-default)]',
        ],
        // 浮起卡片
        elevated: [
          'bg-[var(--bg-elevated)]',
          'border-[var(--border-muted)]',
          'shadow-[var(--glass-shadow)]',
        ],
        // 毛玻璃卡片（新增）
        glass: [
          'bg-gradient-to-br from-white/[0.08] to-white/[0.03]',
          'backdrop-blur-[16px] saturate-[180%]',
          'border-[rgba(255,255,255,0.12)]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
        ],
        // 游戏风格卡片（保留兼容）
        game: [
          'bg-gradient-to-br from-white/[0.08] to-white/[0.03]',
          'backdrop-blur-[16px] saturate-[180%]',
          'border-[rgba(255,255,255,0.12)]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
        ],
        // 透明卡片
        ghost: [
          'bg-transparent',
          'border-transparent',
        ],
        // 发光卡片
        glow: [
          'bg-gradient-to-br from-white/[0.08] to-white/[0.03]',
          'backdrop-blur-[16px]',
          'border-[var(--accent)]/30',
          'shadow-[0_0_20px_var(--accent-glow),0_8px_32px_rgba(0,0,0,0.3)]',
        ],
      },
      interactive: {
        true: [
          'cursor-pointer',
          'hover:bg-gradient-to-br hover:from-white/[0.12] hover:to-white/[0.05]',
          'hover:border-[rgba(255,255,255,0.2)]',
          'hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]',
          'hover:-translate-y-0.5',
          'active:scale-[0.99]',
          'active:translate-y-0',
        ],
        false: [],
      },
      status: {
        none: [],
        // 发光边框状态（替代粗边条）
        success: [
          'border-[rgba(34,197,94,0.3)]',
          'shadow-[0_0_20px_rgba(34,197,94,0.2),0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(34,197,94,0.1)]',
        ],
        warning: [
          'border-[rgba(245,158,11,0.3)]',
          'shadow-[0_0_20px_rgba(245,158,11,0.2),0_8px_32px_rgba(0,0,0,0.3)]',
        ],
        error: [
          'border-[rgba(239,68,68,0.3)]',
          'shadow-[0_0_20px_rgba(239,68,68,0.2),0_8px_32px_rgba(0,0,0,0.3)]',
        ],
        info: [
          'border-[rgba(59,130,246,0.3)]',
          'shadow-[0_0_20px_rgba(59,130,246,0.2),0_8px_32px_rgba(0,0,0,0.3)]',
        ],
        active: [
          'border-[rgba(59,130,246,0.4)]',
          'shadow-[0_0_25px_rgba(59,130,246,0.3),0_8px_32px_rgba(0,0,0,0.3)]',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
        xl: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'glass',
      interactive: false,
      status: 'none',
      padding: 'none',
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** 选中状态 */
  selected?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, status, padding, selected, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, interactive, status, padding }),
          selected && 'ring-2 ring-[var(--accent)]/50 ring-offset-2 ring-offset-[var(--bg-base)] shadow-[0_0_30px_rgba(59,130,246,0.3)]',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// 子组件
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-4 py-3',
        'border-b border-[var(--border-muted)]',
        'flex items-center justify-between gap-3',
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-sm font-semibold text-[var(--text-primary)]',
        'flex items-center gap-2',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs text-[var(--text-muted)]', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-4 py-3',
        'border-t border-[rgba(255,255,255,0.08)]',
        'flex items-center gap-3',
        'bg-black/20',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { cardVariants };
export default Card;
