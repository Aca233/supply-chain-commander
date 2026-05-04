/**
 * 建筑卡片统一配置
 * 状态映射、颜色、文案集中管理，消除各卡片变体中的重复定义
 */

import type { BuildingStatus } from '@/ui/hooks/useBuildingData';

// ==================== 状态配置 ====================

export interface BuildingStatusStyle {
  /** Badge variant */
  badge: 'success' | 'warning' | 'error' | 'outline';
  /** 中文标签 */
  label: string;
  /** 状态点颜色 (用于行视图) */
  dotColor: string;
  /** Card status prop */
  cardStatus: 'success' | 'warning' | 'error' | 'none';
  /** 左边框 CSS 变量色 (用于网格视图) */
  borderColor: string;
}

export const STATUS_STYLES: Record<BuildingStatus, BuildingStatusStyle> = {
  active: {
    badge: 'success',
    label: '生产中',
    dotColor: 'bg-[var(--success)]',
    cardStatus: 'success',
    borderColor: 'border-l-[var(--success)]',
  },
  warning: {
    badge: 'warning',
    label: '低效',
    dotColor: 'bg-[var(--warning)]',
    cardStatus: 'warning',
    borderColor: 'border-l-[var(--warning)]',
  },
  error: {
    badge: 'error',
    label: '缺料',
    dotColor: 'bg-[var(--error)]',
    cardStatus: 'error',
    borderColor: 'border-l-[var(--error)]',
  },
  idle: {
    badge: 'outline',
    label: '暂停',
    dotColor: 'bg-[var(--text-muted)]',
    cardStatus: 'none',
    borderColor: 'border-l-[var(--text-muted)]',
  },
};

// ==================== 利润颜色 ====================

/** 根据利润值返回文本色 class */
export function profitColorClass(profit: number): string {
  return profit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]';
}

/** 根据效率百分比 (0-100) 返回 ProgressBar color */
export function efficiencyColor(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'warning';
  return 'error';
}

/** 根据覆盖率 (0-1) 返回颜色名 */
export function coverageColor(rate: number): 'success' | 'warning' | 'error' {
  if (rate >= 1) return 'success';
  if (rate >= 0.7) return 'warning';
  return 'error';
}

/** 根据输入充足率 (0-1) 返回文本色 class */
export function inputPercentColor(pct: number): string {
  if (pct >= 0.8) return 'text-[var(--success)]';
  if (pct >= 0.5) return 'text-[var(--warning)]';
  return 'text-[var(--error)]';
}
