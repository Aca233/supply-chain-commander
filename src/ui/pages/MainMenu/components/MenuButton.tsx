/**
 * 🔘 主菜单按钮组件
 * 支持多种变体和动画效果
 */

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/ui/design-system/utils/cn';
import '../styles/menu.css';

export type MenuButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface MenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: MenuButtonVariant;
  /** 左侧图标 */
  icon?: ReactNode;
  /** 入场动画延迟 (ms) */
  animationDelay?: number;
  /** 是否启用动画 */
  animate?: boolean;
}

export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>((
  {
    variant = 'ghost',
    icon,
    animationDelay = 0,
    animate = true,
    className,
    children,
    disabled,
    ...props
  },
  ref
) => {
  return (
    <button
      ref={ref}
      className={cn(
        'menu-button',
        `menu-button--${variant}`,
        className
      )}
      style={animate ? {
        animationDelay: `${animationDelay}ms`,
      } : {
        opacity: 1,
        transform: 'translateY(0)',
      }}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="button-icon">{icon}</span>}
      <span>{children}</span>
    </button>
  );
});

MenuButton.displayName = 'MenuButton';

export default MenuButton;
