/**
 * 💬 Tooltip 组件
 * 基于 Radix UI 的提示框
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn';

const TooltipProvider = TooltipPrimitive.Provider;

const TooltipRoot = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipPortal = TooltipPrimitive.Portal;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: 'default' | 'game';
  }
>(({ className, sideOffset = 4, variant = 'default', ...props }, ref) => (
  <TooltipPortal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[9999] overflow-hidden rounded-lg px-3 py-1.5 text-xs',
        'animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        variant === 'default' && [
          'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
          'border border-[var(--border-default)]',
          'shadow-dropdown',
        ],
        variant === 'game' && [
          'bg-gradient-to-br from-[var(--bg-overlay)] to-[var(--bg-elevated)]',
          'text-[var(--text-primary)]',
          'border border-[var(--accent)]/30',
          'shadow-[0_0_20px_var(--accent-glow)]',
          'backdrop-blur-md',
        ],
        className
      )}
      {...props}
    />
  </TooltipPortal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// 便捷封装组件
export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  variant?: 'default' | 'game';
  className?: string;
}

export const Tooltip = ({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  variant = 'default',
  className,
}: TooltipProps) => {
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} variant={variant} className={className}>
        {content}
      </TooltipContent>
    </TooltipRoot>
  );
};

export {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
};

export default Tooltip;
