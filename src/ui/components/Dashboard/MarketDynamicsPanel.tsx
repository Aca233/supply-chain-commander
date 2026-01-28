/**
 * 市场动态面板组件
 * 显示价格涨跌、交易机会、挂单统计
 */

import React from 'react';
import { MarketStats, PriceChangeItem, MarketOpportunity } from './hooks/useDashboardData';
import { GoodsIcon } from '@/ui/components/Icons';

interface MarketDynamicsPanelProps {
  stats: MarketStats;
  onNavigate?: (view: string) => void;
  onTrade?: (goodsId: number, type: 'buy' | 'sell') => void;
}

export const MarketDynamicsPanel: React.FC<MarketDynamicsPanelProps> = ({ 
  stats, 
  onNavigate,
  onTrade 
}) => {
  const formatPrice = (value: number): string => {
    return `¥${value.toFixed(2)}`;
  };

  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
  };

  const formatMoney = (value: number): string => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(1)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  // 渲染价格变化项
  const renderPriceItem = (item: PriceChangeItem, isGainer: boolean) => (
    <div
      key={item.goodsId}
      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-background-secondary cursor-pointer transition-colors"
      onClick={() => onTrade?.(item.goodsId, isGainer ? 'buy' : 'sell')}
      title={`点击${isGainer ? '买入' : '卖出'} ${item.name}`}
    >
      <GoodsIcon goodsId={item.goodsId} size={16} autoColor />
      <span className="text-xs text-text-secondary flex-1 truncate">{item.name}</span>
      <span className={`text-xs font-medium tabular-nums ${isGainer ? 'text-chart-up' : 'text-chart-down'}`}>
        {formatPercent(item.change)}
      </span>
    </div>
  );

  // 渲染机会项
  const renderOpportunity = (opp: MarketOpportunity) => (
    <div
      key={`${opp.type}-${opp.goodsId}`}
      className="flex items-center gap-2 py-1.5 px-2 rounded bg-background-secondary hover:bg-background-tertiary cursor-pointer transition-colors"
      onClick={() => onTrade?.(opp.goodsId, opp.type)}
    >
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
        opp.type === 'buy' ? 'bg-chart-up/20 text-chart-up' : 'bg-chart-down/20 text-chart-down'
      }`}>
        {opp.type === 'buy' ? '买' : '卖'}
      </span>
      <GoodsIcon goodsId={opp.goodsId} size={14} autoColor />
      <span className="text-xs text-text-secondary flex-1 truncate">{opp.name}</span>
      <span className={`text-[10px] tabular-nums ${
        opp.priceDiff < 0 ? 'text-chart-up' : 'text-chart-down'
      }`}>
        {formatPercent(opp.priceDiff)}
      </span>
    </div>
  );

  return (
    <div className="card p-4 h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          📊 市场动态
        </h3>
        <button
          onClick={() => onNavigate?.('market')}
          className="text-xs text-primary hover:text-primary-hover transition-colors"
        >
          查看详情 →
        </button>
      </div>

      {/* 市场概览 */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 bg-chart-up/10 rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-chart-up tabular-nums">{stats.risingCount}</p>
          <p className="text-[10px] text-text-tertiary">上涨</p>
        </div>
        <div className="flex-1 bg-gray-500/10 rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-text-secondary tabular-nums">{stats.stableCount}</p>
          <p className="text-[10px] text-text-tertiary">持平</p>
        </div>
        <div className="flex-1 bg-chart-down/10 rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-chart-down tabular-nums">{stats.fallingCount}</p>
          <p className="text-[10px] text-text-tertiary">下跌</p>
        </div>
      </div>

      {/* 涨跌榜 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* 涨幅榜 */}
        <div>
          <p className="text-xs text-text-tertiary mb-1 flex items-center gap-1">
            📈 涨幅榜
          </p>
          <div className="space-y-0.5">
            {stats.topGainers.length > 0 ? (
              stats.topGainers.map(item => renderPriceItem(item, true))
            ) : (
              <p className="text-xs text-text-tertiary py-2 text-center">暂无数据</p>
            )}
          </div>
        </div>

        {/* 跌幅榜 */}
        <div>
          <p className="text-xs text-text-tertiary mb-1 flex items-center gap-1">
            📉 跌幅榜
          </p>
          <div className="space-y-0.5">
            {stats.topLosers.length > 0 ? (
              stats.topLosers.map(item => renderPriceItem(item, false))
            ) : (
              <p className="text-xs text-text-tertiary py-2 text-center">暂无数据</p>
            )}
          </div>
        </div>
      </div>

      {/* 交易机会 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <p className="text-xs text-text-tertiary mb-1 flex items-center gap-1">
          💡 交易机会
        </p>
        {stats.opportunities.length > 0 ? (
          <div className="space-y-1 flex-1 overflow-y-auto">
            {stats.opportunities.map(renderOpportunity)}
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 text-text-tertiary">
            <p className="text-xs">当前无明显机会</p>
          </div>
        )}
      </div>

      {/* 挂单统计 */}
      <div className="mt-3 pt-3 border-t border-border-primary">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-tertiary">我的挂单</span>
          <div className="flex items-center gap-3">
            <span>
              <span className="text-chart-up">买 {stats.playerBuyOrders}</span>
              <span className="text-text-tertiary mx-1">/</span>
              <span className="text-chart-down">卖 {stats.playerSellOrders}</span>
            </span>
            <span className="text-text-secondary tabular-nums">
              {formatMoney(stats.pendingOrderValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDynamicsPanel;