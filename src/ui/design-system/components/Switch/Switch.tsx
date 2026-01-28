/**
 * 🔘 Switch 开关组件
 * 基于 Radix UI 的开关
 */

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../utils/cn';

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 变体 */
  variant?: 'default' | 'game';
  /** 标签 */
  label?: string;
  /** 描述 */
  description?: string;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, size = 'md', variant = 'default', label, description, ...props }, ref) => {
  const sizeClasses = {
    sm: {
      root: 'h-4 w-7',
      thumb: 'h-3 w-3 data-[state=checked]:translate-x-3',
    },
    md: {
      root: 'h-5 w-9',
      thumb: 'h-4 w-4 data-[state=checked]:translate-x-4',
    },
    lg: {
      root: 'h-6 w-11',
      thumb: 'h-5 w-5 data-[state=checked]:translate-x-5',
    },
  };

  const switchElement = (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center',
        'rounded-full border-2 border-transparent',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizeClasses[size].root,
        // 变体
        variant === 'default' && [
          'bg-[var(--bg-subtle)]',
          'data-[state=checked]:bg-[var(--accent)]',
        ],
        variant === 'game' && [
          'bg-[var(--bg-subtle)]',
          'data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[var(--accent)] data-[state=checked]:to-[var(--accent-hover)]',
          'data-[state=checked]:shadow-md data-[state=checked]:shadow-[var(--accent-glow)]',
        ],
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block rounded-full',
          'bg-white shadow-lg',
          'ring-0 transition-transform duration-200',
          sizeClasses[size].thumb
        )}
      />
    </SwitchPrimitive.Root>
  );

  if (!label && !description) {
    return switchElement;
  }

  return (
    <label className="flex items-start gap-3 cursor-pointer">
      {switchElement}
      <div className="flex-1">
        {label && (
          <span className="block text-sm font-medium text-[var(--text-primary)]">
            {label}
          </span>
        )}
        {description && (
          <span className="block text-xs text-[var(--text-muted)] mt-0.5">
            {description}
          </span>
        )}
      </div>
    </label>
  );
});

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
export default Switch;
