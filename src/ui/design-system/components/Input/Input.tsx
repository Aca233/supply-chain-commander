/**
 * 📝 Input 组件
 * 文本输入框，支持图标、前后缀
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const inputVariants = cva(
  [
    'w-full',
    'bg-[var(--bg-surface)] text-[var(--text-primary)]',
    'border border-[var(--border-default)] rounded-lg',
    'placeholder:text-[var(--text-muted)]',
    'transition-all duration-200',
    'focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--bg-muted)]',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-sm',
        xl: 'h-11 px-4 text-base',
      },
      status: {
        default: '',
        error: 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/20',
        success: 'border-[var(--success)] focus:border-[var(--success)] focus:ring-[var(--success)]/20',
        warning: 'border-[var(--warning)] focus:border-[var(--warning)] focus:ring-[var(--warning)]/20',
      },
      variant: {
        default: '',
        filled: 'bg-[var(--bg-muted)] border-transparent hover:bg-[var(--bg-subtle)]',
        ghost: 'bg-transparent border-transparent hover:bg-[var(--bg-muted)]',
      },
    },
    defaultVariants: {
      size: 'md',
      status: 'default',
      variant: 'default',
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** 左侧图标 */
  leftIcon?: ReactNode;
  /** 右侧图标 */
  rightIcon?: ReactNode;
  /** 左侧附加内容 */
  leftAddon?: ReactNode;
  /** 右侧附加内容 */
  rightAddon?: ReactNode;
  /** 错误信息 */
  error?: string;
  /** 帮助信息 */
  helperText?: string;
  /** 标签 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 容器类名 */
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size,
      status,
      variant,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      error,
      helperText,
      label,
      required,
      wrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const actualStatus = error ? 'error' : status;
    const hasLeftContent = leftIcon || leftAddon;
    const hasRightContent = rightIcon || rightAddon;

    const inputElement = (
      <div className="relative flex">
        {leftAddon && (
          <div className="flex items-center px-3 bg-[var(--bg-muted)] border border-r-0 border-[var(--border-default)] rounded-l-lg text-[var(--text-muted)] text-sm">
            {leftAddon}
          </div>
        )}
        <div className="relative flex-1">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              inputVariants({ size, status: actualStatus, variant }),
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              leftAddon && 'rounded-l-none',
              rightAddon && 'rounded-r-none',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
        {rightAddon && (
          <div className="flex items-center px-3 bg-[var(--bg-muted)] border border-l-0 border-[var(--border-default)] rounded-r-lg text-[var(--text-muted)] text-sm">
            {rightAddon}
          </div>
        )}
      </div>
    );

    if (!label && !error && !helperText) {
      return inputElement;
    }

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            {label}
            {required && <span className="text-[var(--error)] ml-1">*</span>}
          </label>
        )}
        {inputElement}
        {(error || helperText) && (
          <p
            className={cn(
              'text-xs',
              error ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { inputVariants };
export default Input;
