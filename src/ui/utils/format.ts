/**
 * 格式化工具函数
 */

import { TICKS_PER_MONTH, TICKS_PER_YEAR } from '@/core/constants';

/**
 * 格式化数字，添加千分位和可选的小数位
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  
  // 对于非常大的数字使用缩写
  if (Math.abs(value) >= 1e12) {
    return (value / 1e12).toFixed(2) + '万亿';
  }
  if (Math.abs(value) >= 1e8) {
    return (value / 1e8).toFixed(2) + '亿';
  }
  if (Math.abs(value) >= 1e4) {
    return (value / 1e4).toFixed(2) + '万';
  }
  
  // 常规格式化
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化货币
 */
export function formatCurrency(value: number, decimals: number = 0): string {
  return '¥' + formatNumber(value, decimals);
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * 格式化时间（tick转换为可读时间）
 */
export function formatTick(tick: number): string {
  const dayIndex = Math.floor(tick);
  const year = Math.floor(dayIndex / TICKS_PER_YEAR) + 1;
  const month = Math.floor((dayIndex % TICKS_PER_YEAR) / TICKS_PER_MONTH) + 1;
  const dayOfMonth = (dayIndex % TICKS_PER_MONTH) + 1;

  return `第${year}年 ${month}月${dayOfMonth}日`;
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(ticks: number): string {
  if (ticks < TICKS_PER_MONTH) {
    return `${ticks}天`;
  }

  const months = Math.floor(ticks / TICKS_PER_MONTH);
  if (months < 12) {
    return `${months}个月`;
  }

  const years = Math.floor(ticks / TICKS_PER_YEAR);
  return `${years}年`;
}

/**
 * 格式化变化率（带箭头）
 */
export function formatChange(value: number, decimals: number = 1): string {
  if (value === 0) {
    return '→ 0%';
  }
  const sign = value > 0 ? '↑' : '↓';
  const color = value > 0 ? 'text-green-500' : 'text-red-500';
  return `${sign} ${Math.abs(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化库存状态
 */
export function formatStockStatus(current: number, capacity: number): {
  text: string;
  color: string;
  percent: number;
} {
  const percent = capacity > 0 ? current / capacity : 0;
  
  if (current <= 0) {
    return { text: '缺货', color: 'text-red-500', percent: 0 };
  }
  if (percent < 0.2) {
    return { text: '库存告急', color: 'text-orange-500', percent };
  }
  if (percent < 0.5) {
    return { text: '库存偏低', color: 'text-yellow-500', percent };
  }
  if (percent < 0.8) {
    return { text: '库存正常', color: 'text-green-500', percent };
  }
  return { text: '库存充足', color: 'text-blue-500', percent };
}
