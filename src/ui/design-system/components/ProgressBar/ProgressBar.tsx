/**
 * 📊 ProgressBar 进度条组件
 * 用于展示进度、百分比等信息
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressBarProps {
  /** 当前值 (0-100) */
  value: number;
  /** 最大值 */
  max?: number;
  /** 变体 */
  variant?: 'default' | 'game' | 'striped';
  /** 颜色 */
  color?: 'brand' | 'success' | 'warning' | 'error' | 'info';
  /** 尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 显示数值 */
  showValue?: boolean;
  /** 格式化数值 */
  formatValue?: (value: number, max: number) => string;
  /** 标签 */
  label?: string;
  /** 是否有动画 */
  animated?: boolean;
  /** 自定义类名 */
  className?: string;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>((
  {
    value,
    max = 100,
    variant = 'default',
    color = 'brand',
    size = 'md',
    showValue = false,
    formatValue,
    label,
    animated = false,
    className,
  },
  ref
) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    brand: {
      bar: 'bg-[var(--accent)]',
      glow: 'shadow-[0_0_10px_var(--accent-glow)]',
    },
    success: {
      bar: 'bg-[var(--success)]',
      glow: 'shadow-[0_0_10px_var(--success-muted)]',
    },
    warning: {
      bar: 'bg-[var(--warning)]',
      glow: 'shadow-[0_0_10px_var(--warning-muted)]',
    },
    error: {
      bar: 'bg-[var(--error)]',
      glow: 'shadow-[0_0_10px_var(--error-muted)]',
    },
    info: {
      bar: 'bg-[var(--info)]',
      glow: 'shadow-[0_0_10px_var(--info-muted)]',
    },
  };

  const displayValue = formatValue 
    ? formatValue(value, max) 
    : `${Math.round(percentage)}%`;

  return (
    <div ref={ref} className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full',
          'bg-[var(--bg-subtle)]',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            colorClasses[color].bar,
            variant === 'game' && colorClasses[color].glow,
            variant === 'striped' && [
              'bg-gradient-to-r',
              'from-transparent via-white/20 to-transparent',
              'bg-[length:20px_100%]',
            ],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
        {variant === 'striped' && (
          <div
            className={cn(
              'absolute inset-0 rounded-full',
              colorClasses[color].bar,
              'opacity-80'
            )}
            style={{ 
              width: `${percentage}%`,
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
              backgroundSize: '1rem 1rem',
              animation: animated ? 'progress-stripes 1s linear infinite' : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export { ProgressBar };
export default ProgressBar;
