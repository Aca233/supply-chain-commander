/**
 * 🪟 Dialog 对话框组件
 * 基于 Radix UI 的模态对话框
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// 遮罩层
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50',
      'bg-black/60 backdrop-blur-sm',
      'data-[state=open]:animate-fade-in',
      'data-[state=closed]:animate-fade-out',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// 对话框内容
export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** 变体样式 */
  variant?: 'default' | 'game';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 是否显示关闭按钮 */
  showClose?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, variant = 'default', size = 'md', showClose = true, ...props }, ref) => {
  const sizeClasses = {
    sm: 'w-[400px] max-w-[90vw]',
    md: 'w-[520px] max-w-[90vw]',
    lg: 'w-[680px] max-w-[90vw]',
    xl: 'w-[900px] max-w-[90vw]',
    full: 'w-[90vw] max-h-[90vh]',
  };

  return (
    <DialogPortal>
      <DialogOverlay className="flex items-center justify-center" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50',
          // 使用 inset-0 + margin auto 居中，避免translate被动画覆盖
          'inset-0 m-auto',
          'h-fit',
          'max-h-[85vh]',
          'overflow-hidden',
          sizeClasses[size],
          'rounded-xl',
          'focus:outline-none',
          // 动画 - 使用opacity动画，避免transform冲突
          'data-[state=open]:animate-fade-in',
          'data-[state=closed]:animate-fade-out',
          // 变体样式
          variant === 'default' && [
            'bg-[var(--bg-elevated)]',
            'border border-[var(--border-default)]',
            'shadow-modal',
          ],
          variant === 'game' && [
            'bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-elevated)]',
            'border border-[var(--accent)]/30',
            'shadow-modal',
            'shadow-[0_0_40px_var(--accent-glow)]',
          ],
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className={cn(
              'absolute right-3 top-3',
              'w-8 h-8 rounded-lg',
              'flex items-center justify-center',
              'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--bg-muted)]',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
            )}
          >
            <svg
              className="w-4 h-4"
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
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

// 对话框头部
const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-5 py-4',
      'border-b border-[var(--border-muted)]',
      className
    )}
    {...props}
  />
));
DialogHeader.displayName = 'DialogHeader';

// 对话框标题
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold text-[var(--text-primary)]',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// 对话框描述
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-[var(--text-muted)] mt-1', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// 对话框内容区
const DialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-5', className)}
    {...props}
  />
));
DialogBody.displayName = 'DialogBody';

// 对话框底部
const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-5 py-4',
      'border-t border-[var(--border-muted)]',
      'flex items-center justify-end gap-3',
      'bg-[var(--bg-base)]/50',
      className
    )}
    {...props}
  />
));
DialogFooter.displayName = 'DialogFooter';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogBody,
};
