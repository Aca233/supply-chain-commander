/**
 * 📊 ProgressBar 组件
 * 进度条，支持游戏风格发光效果
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const progressVariants = cva(
  'w-full rounded-full overflow-hidden',
  {
    variants: {
      size: {
        xs: 'h-1',
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3',
        xl: 'h-4',
      },
      variant: {
        default: 'bg-[var(--bg-muted)]',
        subtle: 'bg-[var(--bg-subtle)]/50',
        ghost: 'bg-white/5',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

const fillVariants = cva(
  'h-full rounded-full transition-all duration-500 ease-out',
  {
    variants: {
      color: {
        brand: 'bg-[var(--accent)]',
        success: 'bg-[var(--success)]',
        warning: 'bg-[var(--warning)]',
        error: 'bg-[var(--error)]',
        info: 'bg-[var(--info)]',
        // 渐变
        'gradient-brand': 'bg-gradient-to-r from-blue-500 to-cyan-400',
        'gradient-success': 'bg-gradient-to-r from-green-500 to-emerald-400',
        'gradient-warning': 'bg-gradient-to-r from-yellow-500 to-orange-400',
        'gradient-error': 'bg-gradient-to-r from-red-500 to-pink-400',
        'gradient-purple': 'bg-gradient-to-r from-purple-500 to-pink-500',
        // 游戏资源色
        gold: 'bg-gradient-to-r from-yellow-500 to-amber-400',
        energy: 'bg-gradient-to-r from-cyan-400 to-blue-500',
        health: 'bg-gradient-to-r from-red-500 to-rose-400',
        mana: 'bg-gradient-to-r from-blue-500 to-indigo-500',
        xp: 'bg-gradient-to-r from-purple-500 to-violet-400',
      },
      animated: {
        true: 'animate-pulse',
        false: '',
      },
      striped: {
        true: [
          'bg-[length:1rem_100%]',
          'animate-[progress_1s_linear_infinite]',
        ],
        false: '',
      },
    },
    defaultVariants: {
      color: 'brand',
      animated: false,
      striped: false,
    },
  }
);

export interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof fillVariants> {
  /** 当前值 (0-100 或 0-max) */
  value: number;
  /** 最大值 */
  max?: number;
  /** 标签文本 */
  label?: string;
  /** 显示数值 */
  showValue?: boolean;
  /** 数值格式化函数 */
  formatValue?: (value: number, max: number) => string;
  /** 发光效果 */
  glow?: boolean;
  /** 发光颜色 */
  glowColor?: string;
  /** 缓冲值（用于显示缓冲进度） */
  bufferValue?: number;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      size,
      variant,
      color,
      animated,
      striped,
      value,
      max = 100,
      label,
      showValue = false,
      formatValue,
      glow = false,
      glowColor,
      bufferValue,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const bufferPercentage = bufferValue
      ? Math.min(100, Math.max(0, (bufferValue / max) * 100))
      : 0;

    const getGlowColor = () => {
      if (glowColor) return glowColor;
      switch (color) {
        case 'success':
        case 'gradient-success':
          return 'rgba(34, 197, 94, 0.4)';
        case 'warning':
        case 'gradient-warning':
          return 'rgba(245, 158, 11, 0.4)';
        case 'error':
        case 'gradient-error':
        case 'health':
          return 'rgba(239, 68, 68, 0.4)';
        case 'gold':
          return 'rgba(255, 215, 0, 0.4)';
        case 'energy':
          return 'rgba(6, 182, 212, 0.4)';
        case 'mana':
          return 'rgba(99, 102, 241, 0.4)';
        case 'xp':
        case 'gradient-purple':
          return 'rgba(139, 92, 246, 0.4)';
        default:
          return 'rgba(59, 130, 246, 0.4)';
      }
    };

    const displayValue = formatValue
      ? formatValue(value, max)
      : `${percentage.toFixed(0)}%`;

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {(label || showValue) && (
          <div className="flex justify-between items-center mb-1">
            {label && (
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {label}
              </span>
            )}
            {showValue && (
              <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                {displayValue}
              </span>
            )}
          </div>
        )}
        <div className={progressVariants({ size, variant })}>
          {/* 缓冲层 */}
          {bufferValue !== undefined && (
            <div
              className="absolute h-full bg-white/10 rounded-full transition-all duration-300"
              style={{ width: `${bufferPercentage}%` }}
            />
          )}
          {/* 进度层 */}
          <div
            className={cn(fillVariants({ color, animated, striped }))}
            style={{
              width: `${percentage}%`,
              boxShadow: glow ? `0 0 10px ${getGlowColor()}` : undefined,
            }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
