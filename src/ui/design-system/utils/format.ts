/**
 * 📊 格式化工具函数
 * 用于数字、货币、百分比等格式化
 */

/**
 * 格式化数字（带千分位）
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('zh-CN', options).format(value);
}

/**
 * 格式化货币
 * @param compact - 是否使用紧凑模式 (1.2M, 3.4K)
 */
export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1e12) return `${sign}¥${(abs / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `${sign}¥${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}¥${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}¥${(abs / 1e3).toFixed(1)}K`;
    return `${sign}¥${abs.toFixed(0)}`;
  }
  return `¥${formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化变化率（带正负号）
 */
export function formatChange(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化大数字（紧凑模式）
 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

/**
 * 格式化持续时间
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}时${mins}分`;
}

/**
 * 格式化速率（每单位时间）
 */
export function formatRate(
  value: number,
  unit: 'tick' | 'second' | 'minute' | 'hour' | 'day' = 'day',
  decimals = 1
): string {
  const unitLabels = {
    tick: '/tick',
    second: '/秒',
    minute: '/分',
    hour: '/时',
    day: '/日',
  };
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}${unitLabels[unit]}`;
}
