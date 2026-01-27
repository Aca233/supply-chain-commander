/**
 * 投资面板组件
 * 显示投资组合、控股公司、收益统计
 */

import React from 'react';
import { InvestmentStats, HoldingInfo, ControlledCompanyInfo } from './hooks/useDashboardData';

interface InvestmentPanelProps {
  stats: InvestmentStats;
  onNavigate?: (view: string) => void;
  onViewCompany?: (companyId: number) => void;
}

export const InvestmentPanel: React.FC<InvestmentPanelProps> = ({ 
  stats, 
  onNavigate,
  onViewCompany 
}) => {
  const formatMoney = (value: number): string => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(1)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
  };

  // 渲染持仓项
  const renderHolding = (holding: HoldingInfo) => (
    <div 
      key={holding.companyId}
      className="flex items-center gap-2 py-1.5 px-2 rounded bg-background-secondary hover:bg-background-tertiary cursor-pointer transition-colors"
      onClick={() => onViewCompany?.(holding.companyId)}
    >
      <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
        {holding.companyName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary truncate">{holding.companyName}</p>
        <p className="text-[10px] text-text-tertiary">
          {holding.sharePercent.toFixed(1)}% · {holding.shares.toLocaleString()}股
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-text-primary tabular-nums">{formatMoney(holding.value)}</p>
        <p className={`text-[10px] tabular-nums ${holding.gain >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
          {formatPercent(holding.gainPercent)}
        </p>
      </div>
    </div>
  );

  // 渲染控股公司项
  const renderControlled = (company: ControlledCompanyInfo) => (
    <div 
      key={company.companyId}
      className="flex items-center gap-2 py-1.5 px-2 rounded bg-background-secondary hover:bg-background-tertiary cursor-pointer transition-colors"
      onClick={() => onViewCompany?.(company.companyId)}
    >
      <div className="w-6 h-6 rounded bg-warning/20 flex items-center justify-center text-xs">
        🏢
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary truncate">{company.companyName}</p>
        <p className="text-[10px] text-warning">{company.controlLevel}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-text-primary tabular-nums">{formatMoney(company.assets)}</p>
        <p className="text-[10px] text-text-tertiary tabular-nums">
          现金: {formatMoney(company.cash)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="card p-4 h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          💼 投资组合
        </h3>
        <button
          onClick={() => onNavigate?.('investment')}
          className="text-xs text-primary hover:text-primary-hover transition-colors"
        >
          查看详情 →
        </button>
      </div>

      {/* 投资概览 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-background-secondary rounded-lg p-2 text-center">
          <p className="text-xs text-text-primary font-medium tabular-nums">
            {formatMoney(stats.totalValue)}
          </p>
          <p className="text-[10px] text-text-tertiary">市值</p>
        </div>
        <div className="bg-background-secondary rounded-lg p-2 text-center">
          <p className={`text-xs font-medium tabular-nums ${stats.totalGain >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
            {stats.totalGain >= 0 ? '+' : ''}{formatMoney(stats.totalGain)}
          </p>
          <p className="text-[10px] text-text-tertiary">盈亏</p>
        </div>
        <div className="bg-background-secondary rounded-lg p-2 text-center">
          <p className={`text-xs font-medium tabular-nums ${stats.gainPercent >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
            {formatPercent(stats.gainPercent)}
          </p>
          <p className="text-[10px] text-text-tertiary">收益率</p>
        </div>
      </div>

      {/* 持仓列表 */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {stats.holdings.length > 0 ? (
          <>
            <p className="text-xs text-text-tertiary mb-1">持仓 ({stats.holdings.length})</p>
            <div className="space-y-1 flex-1 overflow-y-auto">
              {stats.holdings.map(renderHolding)}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-text-tertiary">
            <div className="text-center">
              <p className="text-2xl mb-2">📈</p>
              <p className="text-sm">暂无持仓</p>
              <p className="text-xs">在股票市场购买股票</p>
            </div>
          </div>
        )}
      </div>

      {/* 控股公司 */}
      {stats.controlledCompanies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-primary">
          <p className="text-xs text-text-tertiary mb-1">
            控股公司 ({stats.controlledCompanies.length})
          </p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {stats.controlledCompanies.map(renderControlled)}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentPanel;