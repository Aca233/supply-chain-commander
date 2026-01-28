/**
 * 📑 Tabs 标签页组件
 * 基于 Radix UI 的标签切换
 */

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../utils/cn';

const Tabs = TabsPrimitive.Root;

// 标签列表
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: 'default' | 'pills' | 'underline' | 'game';
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, variant = 'default', size = 'md', ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-10 text-sm',
  };

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1',
        sizeClasses[size],
        variant === 'default' && [
          'p-1 rounded-lg',
          'bg-[var(--bg-muted)]',
        ],
        variant === 'pills' && [
          'gap-2',
        ],
        variant === 'underline' && [
          'border-b border-[var(--border-default)]',
          'gap-0',
        ],
        variant === 'game' && [
          'p-1 rounded-lg',
          'bg-gradient-to-r from-[var(--bg-muted)] to-[var(--bg-surface)]',
          'border border-[var(--border-muted)]',
        ],
        className
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

// 标签触发器
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: 'default' | 'pills' | 'underline' | 'game';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2',
      'px-3 py-1.5',
      'font-medium whitespace-nowrap',
      'transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
      'disabled:pointer-events-none disabled:opacity-50',
      // 变体样式
      variant === 'default' && [
        'rounded-md',
        'text-[var(--text-muted)]',
        'hover:text-[var(--text-primary)]',
        'data-[state=active]:bg-[var(--bg-surface)]',
        'data-[state=active]:text-[var(--text-primary)]',
        'data-[state=active]:shadow-sm',
      ],
      variant === 'pills' && [
        'rounded-full',
        'text-[var(--text-muted)]',
        'hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]',
        'data-[state=active]:bg-[var(--accent)]',
        'data-[state=active]:text-white',
      ],
      variant === 'underline' && [
        'px-4 pb-2 -mb-px',
        'text-[var(--text-muted)]',
        'border-b-2 border-transparent',
        'hover:text-[var(--text-primary)]',
        'data-[state=active]:text-[var(--accent)]',
        'data-[state=active]:border-[var(--accent)]',
      ],
      variant === 'game' && [
        'rounded-md',
        'text-[var(--text-muted)]',
        'hover:text-[var(--text-primary)]',
        'data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent)] data-[state=active]:to-[var(--accent-hover)]',
        'data-[state=active]:text-white',
        'data-[state=active]:shadow-md data-[state=active]:shadow-[var(--accent-glow)]',
      ],
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// 标签内容
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-3',
      'focus-visible:outline-none',
      'data-[state=inactive]:hidden',
      'data-[state=active]:animate-fade-in',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
