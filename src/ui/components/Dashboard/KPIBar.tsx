/**
 * KPI指标栏组件
 * 显示6个核心关键指标
 */

import React from 'react';
import { KPIData, KPIChanges } from './hooks/useDashboardData';

interface KPIBarProps {
  kpi: KPIData;
  changes: KPIChanges;
}

interface KPIItemProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const KPIItem: React.FC<KPIItemProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  color = 'default',
}) => {
  const colorClasses = {
    default: 'text-text-primary',
    success: 'text-chart-up',
    warning: 'text-warning',
    danger: 'text-chart-down',
    info: 'text-accent',
  };

  const formatChange = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${(val * 100).toFixed(1)}%`;
  };

  return (
    <div className="flex-1 min-w-[140px] bg-background-secondary rounded-lg p-3 border border-border hover:border-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-tertiary truncate">{title}</p>
          <p className={`text-lg font-bold tabular-nums mt-0.5 ${colorClasses[color]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-text-tertiary mt-0.5 truncate">{subtitle}</p>
          )}
          {change !== undefined && change !== 0 && (
            <p className={`text-xs mt-0.5 tabular-nums ${change >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
              {formatChange(change)}
            </p>
          )}
        </div>
        <div className="text-xl ml-2 flex-shrink-0">{icon}</div>
      </div>
    </div>
  );
};

const formatMoney = (value: number): string => {
  if (Math.abs(value) >= 1000000000) {
    return `¥${(value / 1000000000).toFixed(2)}B`;
  } else if (Math.abs(value) >= 1000000) {
    return `¥${(value / 1000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `¥${(value / 1000).toFixed(1)}K`;
  }
  return `¥${value.toFixed(0)}`;
};

export const KPIBar: React.FC<KPIBarProps> = ({ kpi, changes }) => {
  // 判断利润状态
  const profitColor = kpi.dailyProfit >= 0 ? 'success' : 'danger';
  
  // 判断建筑状态
  const buildingIssues = kpi.buildingCount.paused + kpi.buildingCount.starved;
  const buildingColor = buildingIssues > 0 ? 'warning' : 'default';
  const buildingSubtitle = buildingIssues > 0 
    ? `${kpi.buildingCount.active}运行/${buildingIssues}异常`
    : `${kpi.buildingCount.active}座运行中`;

  // 判断信用评级颜色
  const ratingColor = (): 'success' | 'warning' | 'danger' | 'info' => {
    const rating = kpi.creditRating;
    if (rating.startsWith('A')) return 'success';
    if (rating.startsWith('B')) return 'info';
    if (rating.startsWith('C')) return 'warning';
    return 'danger';
  };

  return (
    <div className="flex gap-3 flex-wrap">
      <KPIItem
        title="净资产"
        value={formatMoney(kpi.netWorth)}
        icon="💎"
        change={changes.netWorth}
        color={kpi.netWorth >= 0 ? 'default' : 'danger'}
      />
      
      <KPIItem
        title="现金"
        value={formatMoney(kpi.cash)}
        icon="💰"
        change={changes.cash}
        color="default"
      />
      
      <KPIItem
        title="日利润"
        value={formatMoney(kpi.dailyProfit)}
        icon={kpi.dailyProfit >= 0 ? '📈' : '📉'}
        color={profitColor}
      />
      
      <KPIItem
        title="建筑数量"
        value={`${kpi.buildingCount.total}座`}
        subtitle={buildingSubtitle}
        icon="🏭"
        color={buildingColor}
      />
      
      <KPIItem
        title="投资市值"
        value={formatMoney(kpi.portfolioValue)}
        icon="📊"
        change={changes.portfolioValue}
        color="info"
      />
      
      <KPIItem
        title="信用评级"
        value={kpi.creditRating}
        subtitle={`信用分: ${kpi.creditScore}`}
        icon="⭐"
        color={ratingColor()}
      />
    </div>
  );
};

export default KPIBar;