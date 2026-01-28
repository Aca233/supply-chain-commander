/**
 * 🃏 Card 组件
 * 游戏风格卡片，支持发光效果和状态指示
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const cardVariants = cva(
  [
    'rounded-xl border transition-all duration-200',
    'backdrop-blur-sm',
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
          'shadow-card',
        ],
        // 游戏风格卡片
        game: [
          'bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-elevated)]',
          'border-[var(--border-muted)]',
          'shadow-card',
          'before:absolute before:inset-0 before:rounded-xl',
          'before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent',
          'before:pointer-events-none',
          'relative',
        ],
        // 透明卡片
        ghost: [
          'bg-transparent',
          'border-transparent',
        ],
        // 发光卡片
        glow: [
          'bg-[var(--bg-surface)]',
          'border-[var(--accent)]/30',
          'shadow-[0_0_20px_var(--accent-glow)]',
        ],
      },
      interactive: {
        true: [
          'cursor-pointer',
          'hover:border-[var(--border-strong)]',
          'hover:shadow-card-hover',
          'active:scale-[0.99]',
        ],
        false: [],
      },
      status: {
        none: [],
        success: ['border-l-4 border-l-[var(--success)]'],
        warning: ['border-l-4 border-l-[var(--warning)]'],
        error: ['border-l-4 border-l-[var(--error)]'],
        info: ['border-l-4 border-l-[var(--info)]'],
        active: ['border-l-4 border-l-[var(--accent)]'],
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
      variant: 'default',
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
          selected && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-base)]',
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
        'border-t border-[var(--border-muted)]',
        'flex items-center gap-3',
        'bg-[var(--bg-base)]/50',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { cardVariants };
export default Card;
