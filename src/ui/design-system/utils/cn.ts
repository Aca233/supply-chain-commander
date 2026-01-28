/**
 * 🔧 类名合并工具
 * 结合 clsx 和 tailwind-merge 实现智能类名合并
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并类名，自动处理 Tailwind 类冲突
 * @example
 * cn('px-4 py-2', 'px-6') // => 'py-2 px-6'
 * cn('text-red-500', isActive && 'text-blue-500') // => 条件类名
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
