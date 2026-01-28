/**
 * 📈 StatWidget 组件
 * 统计数据展示卡片，游戏风格
 */

import { type ReactNode } from 'react';
import { Card, CardContent } from '../../components/Card';
import { cn } from '../../utils/cn';

type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatWidgetProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 变化率 (0-1 表示百分比) */
  change?: number;
  /** 变化描述文本 */
  changeLabel?: string;
  /** 趋势方向（不传则根据change自动判断） */
  trend?: TrendDirection;
  /** 图标 */
  icon?: ReactNode;
  /** 后缀单位 */
  suffix?: string;
  /** 前缀 */
  prefix?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 卡片变体 */
  variant?: 'default' | 'elevated' | 'game' | 'glow';
  /** 状态颜色 */
  status?: 'none' | 'success' | 'warning' | 'error' | 'info';
  /** 发光效果 */
  glow?: boolean;
  /** 迷你模式（更紧凑） */
  compact?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
}

const trendConfig: Record<TrendDirection, { color: string; icon: string; bg: string }> = {
  up: {
    color: 'text-[var(--success)]',
    icon: '↑',
    bg: 'bg-[var(--success)]/10',
  },
  down: {
    color: 'text-[var(--error)]',
    icon: '↓',
    bg: 'bg-[var(--error)]/10',
  },
  neutral: {
    color: 'text-[var(--text-muted)]',
    icon: '→',
    bg: 'bg-[var(--bg-muted)]',
  },
};

const sizeConfig = {
  sm: {
    container: 'p-3',
    title: 'text-[10px]',
    value: 'text-lg',
    change: 'text-[10px]',
    icon: 'w-8 h-8 text-base',
  },
  md: {
    container: 'p-4',
    title: 'text-xs',
    value: 'text-2xl',
    change: 'text-xs',
    icon: 'w-10 h-10 text-xl',
  },
  lg: {
    container: 'p-5',
    title: 'text-sm',
    value: 'text-3xl',
    change: 'text-sm',
    icon: 'w-12 h-12 text-2xl',
  },
};

export const StatWidget = ({
  title,
  value,
  change,
  changeLabel,
  trend,
  icon,
  suffix,
  prefix,
  size = 'md',
  variant = 'elevated',
  status = 'none',
  glow = false,
  compact = false,
  className,
  onClick,
}: StatWidgetProps) => {
  // 自动判断趋势方向
  const actualTrend: TrendDirection =
    trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral');

  const trendInfo = trendConfig[actualTrend];
  const sizeInfo = sizeConfig[size];

  const formatChange = (val: number): string => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${(val * 100).toFixed(1)}%`;
  };

  if (compact) {
    // 紧凑模式
    return (
      <Card
        variant={variant}
        status={status}
        interactive={!!onClick}
        className={cn('group', glow && 'shadow-glow-blue', className)}
       onClick={onClick}
      >
        <div className="flex items-center gap-3 p-3">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] text-lg flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
              {prefix}
              {value}
              {suffix && <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{suffix}</span>}
            </p>
          </div>
          {change !== undefined && (
            <span className={cn('text-xs font-medium tabular-nums', trendInfo.color)}>
              {trendInfo.icon} {formatChange(change)}
            </span>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant={variant}
      status={status}
      interactive={!!onClick}
      className={cn('group', glow && 'shadow-glow-blue', className)}
      onClick={onClick}
    >
      <CardContent className={sizeInfo.container}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* 标题 */}
            <p
              className={cn(
                'font-medium text-[var(--text-muted)] uppercase tracking-wide',
                sizeInfo.title
              )}
            >
              {title}
            </p>

            {/* 数值 */}
            <p
              className={cn(
                'font-bold text-[var(--text-primary)] mt-1 tabular-nums',
                sizeInfo.value
              )}
            >
              {prefix}
              {value}
              {suffix && (
                <span className="text-sm font-normal text-[var(--text-muted)] ml-1">
                  {suffix}
                </span>
              )}
            </p>

            {/* 变化指示器 */}
            {(change !== undefined || changeLabel) && (
              <div className="flex items-center gap-1.5 mt-2">
                {change !== undefined && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium tabular-nums',
                      trendInfo.bg,
                      trendInfo.color,
                      sizeInfo.change
                    )}
                  >
                    {trendInfo.icon} {formatChange(change)}
                  </span>
                )}
                {changeLabel && (
                  <span className={cn('text-[var(--text-muted)]', sizeInfo.change)}>
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 图标 */}
          {icon && (
            <div
              className={cn(
                'rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]',
                'group-hover:scale-110 group-hover:bg-[var(--accent)]/20 transition-all duration-200',
                sizeInfo.icon
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatWidget;
