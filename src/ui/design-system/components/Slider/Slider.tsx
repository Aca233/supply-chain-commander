/**
 * 🎚️ Slider 滑块组件
 * 基于 Radix UI 的滑块
 */

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../../utils/cn';

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** 变体 */
  variant?: 'default' | 'game';
  /** 颜色 */
  color?: 'brand' | 'success' | 'warning' | 'error' | 'info';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 显示数值 */
  showValue?: boolean;
  /** 格式化数值 */
  formatValue?: (value: number) => string;
  /** 标签 */
  label?: string;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>((
  {
    className,
    variant = 'default',
    color = 'brand',
    size = 'md',
    showValue = false,
    formatValue,
    label,
    value,
    defaultValue,
    ...props
  },
  ref
) => {
  const sizeClasses = {
    sm: {
      track: 'h-1',
      thumb: 'h-3 w-3',
    },
    md: {
      track: 'h-1.5',
      thumb: 'h-4 w-4',
    },
    lg: {
      track: 'h-2',
      thumb: 'h-5 w-5',
    },
  };

  const colorClasses = {
    brand: {
      range: 'bg-[var(--accent)]',
      glow: 'shadow-[0_0_10px_var(--accent-glow)]',
    },
    success: {
      range: 'bg-[var(--success)]',
      glow: 'shadow-[0_0_10px_var(--success-muted)]',
    },
    warning: {
      range: 'bg-[var(--warning)]',
      glow: 'shadow-[0_0_10px_var(--warning-muted)]',
    },
    error: {
      range: 'bg-[var(--error)]',
      glow: 'shadow-[0_0_10px_var(--error-muted)]',
    },
    info: {
      range: 'bg-[var(--info)]',
      glow: 'shadow-[0_0_10px_var(--info-muted)]',
    },
  };

  const currentValue = value?.[0] ?? defaultValue?.[0] ?? 0;
  const displayValue = formatValue ? formatValue(currentValue) : currentValue;

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
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
      <SliderPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          'cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        {...props}
      >
        <SliderPrimitive.Track
          className={cn(
            'relative w-full grow overflow-hidden rounded-full',
            'bg-[var(--bg-subtle)]',
            sizeClasses[size].track
          )}
        >
          <SliderPrimitive.Range
            className={cn(
              'absolute h-full rounded-full',
              colorClasses[color].range,
              variant === 'game' && colorClasses[color].glow
            )}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'block rounded-full',
            'bg-white border-2',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            'disabled:pointer-events-none',
            'hover:scale-110',
            'active:scale-95',
            sizeClasses[size].thumb,
            colorClasses[color].range.replace('bg-', 'border-'),
            variant === 'game' && [
              'shadow-lg',
              colorClasses[color].glow,
            ]
          )}
        />
      </SliderPrimitive.Root>
    </div>
  );
});

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
export default Slider;
