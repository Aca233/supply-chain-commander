/**
 * 公司列表行组件
 * 在统一的公司列表中显示单个公司信息
 */

import React from 'react';
import { CompanyProfile } from '@/core/finance/CompanyProfile';
import { ControlLevel } from '@/core/finance/CompanyProfile';
import { CONTROL_LEVEL_NAMES, CONTROL_LEVEL_COLORS } from '@/core/finance/OwnershipControl';

interface CompanyRowProps {
  profile: CompanyProfile;
  isSelected: boolean;
  onSelect: () => void;
  onQuickBuy: () => void;
  onQuickSell: () => void;
  onAcquire: () => void;
}

// 人格类型颜色
const personalityColors: Record<string, string> = {
  aggressive: 'text-red-400',
  conservative: 'text-blue-400',
  opportunist: 'text-yellow-400',
  specialist: 'text-purple-400',
  diversified: 'text-green-400',
  innovator: 'text-cyan-400',
  cost_leader: 'text-orange-400',
  premium: 'text-pink-400',
};

// 威胁等级图标
const threatIcons: Record<string, { icon: string; color: string }> = {
  low: { icon: '●', color: 'text-green-400' },
  medium: { icon: '●', color: 'text-yellow-400' },
  high: { icon: '●', color: 'text-red-400' },
};

// 趋势图标
const trendIcons: Record<string, { icon: string; color: string }> = {
  up: { icon: '↑', color: 'text-green-400' },
  down: { icon: '↓', color: 'text-red-400' },
  stable: { icon: '→', color: 'text-slate-400' },
};

/**
 * 确保数值有效
 */
function safeNumber(value: number | undefined, defaultValue: number = 0): number {
  if (value === undefined || value === null || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * 格式化金额
 */
function formatMoney(value: number): string {
  const safeValue = safeNumber(value, 0);
  if (safeValue >= 1000000) return `¥${(safeValue / 1000000).toFixed(2)}M`;
  if (safeValue >= 1000) return `¥${(safeValue / 1000).toFixed(1)}K`;
  return `¥${safeValue.toFixed(0)}`;
}

/**
 * 格式化价格
 */
function formatPrice(value: number | undefined): string {
  if (value === undefined || value === null || !isFinite(value)) return '--';
  return `¥${value.toFixed(2)}`;
}

/**
 * 格式化百分比
 */
function formatPercent(value: number | undefined, showSign: boolean = false): string {
  if (value === undefined || value === null || !isFinite(value)) return '--';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export const CompanyRow: React.FC<CompanyRowProps> = ({
  profile,
  isSelected,
  onSelect,
  onQuickBuy,
  onQuickSell,
  onAcquire,
}) => {
  const stock = profile.stock;
  const isUp = stock && safeNumber(stock.priceChange) >= 0;
  const personalityColor = personalityColors[profile.personality] || 'text-slate-300';
  const threatInfo = threatIcons[profile.competition.threatLevel];
  const trendInfo = trendIcons[profile.competition.trend];
  const playerHolding = profile.ownership.playerHolding;
  const controlLevel = profile.controlStatus.playerControlLevel;
  
  return (
    <div 
      className={`border-b border-slate-700 transition-colors ${
        isSelected ? 'bg-slate-700/50' : 'hover:bg-slate-700/30'
      }`}
    >
      {/* 主行 */}
      <div 
        className="grid grid-cols-12 gap-2 p-3 cursor-pointer items-center"
        onClick={onSelect}
      >
        {/* 股票代码 */}
        <div className="col-span-1">
          <span className="font-mono text-white font-medium">
            {stock?.ticker || '--'}
          </span>
        </div>
        
        {/* 公司名称 */}
        <div className="col-span-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {profile.name.charAt(0)}
          </div>
          <div className="truncate">
            <span className="text-white font-medium">{profile.name}</span>
            {profile.controlStatus.isPlayerControlled && (
              <span className="ml-1 text-xs text-purple-400">★控股</span>
            )}
          </div>
        </div>
        
        {/* 股价 */}
        <div className="col-span-1 text-right">
          <span className={`font-medium tabular-nums ${
            stock ? (isUp ? 'text-green-400' : 'text-red-400') : 'text-slate-400'
          }`}>
            {formatPrice(stock?.currentPrice)}
          </span>
        </div>
        
        {/* 涨跌幅 */}
        <div className="col-span-1 text-right">
          <span className={`tabular-nums ${
            stock ? (isUp ? 'text-green-400' : 'text-red-400') : 'text-slate-400'
          }`}>
            {formatPercent(stock?.priceChangePercent, true)}
          </span>
        </div>
        
        {/* 经营风格 */}
        <div className="col-span-1 text-center">
          <span className={`text-sm ${personalityColor}`}>
            {profile.personalityName}
          </span>
        </div>
        
        {/* 市值 */}
        <div className="col-span-1 text-right text-slate-300 tabular-nums">
          {stock ? formatMoney(stock.marketCap) : '--'}
        </div>
        
        {/* 市场份额 */}
        <div className="col-span-1 text-right">
          <div className="flex items-center justify-end gap-1">
            <span className="text-slate-300 tabular-nums">
              {profile.marketShare.toFixed(1)}%
            </span>
            <span className={trendInfo.color}>{trendInfo.icon}</span>
          </div>
        </div>
        
        {/* 威胁等级 */}
        <div className="col-span-1 text-center">
          <span className={`${threatInfo.color}`} title={`威胁: ${profile.competition.threatLevel}`}>
            {threatInfo.icon}
          </span>
        </div>
        
        {/* 持股数 */}
        <div className="col-span-1 text-right">
          {playerHolding ? (
            <div className="flex flex-col items-end">
              <span className="text-slate-300 tabular-nums text-sm">
                {playerHolding.shares.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">
                {playerHolding.percentage.toFixed(1)}%
              </span>
            </div>
          ) : (
            <span className="text-slate-500">--</span>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="col-span-2 flex justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onQuickBuy(); }}
            className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
          >
            买入
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onQuickSell(); }}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              playerHolding 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'bg-slate-600/50 text-slate-500 cursor-not-allowed'
            }`}
            disabled={!playerHolding}
          >
            卖出
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAcquire(); }}
            className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
          >
            收购
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="px-2 py-1 text-xs bg-slate-600/50 text-slate-300 rounded hover:bg-slate-600 transition-colors"
          >
            {isSelected ? '▲' : '▼'}
          </button>
        </div>
      </div>
      
      {/* 展开的子行 - 附加信息 */}
      {isSelected && (
        <div className="px-3 pb-3 pt-0 text-sm">
          <div className="bg-slate-800/50 rounded-lg p-3 grid grid-cols-6 gap-4">
            <div>
              <span className="text-slate-400">主营业务:</span>
              <span className="text-slate-200 ml-1">{profile.competition.specialization}</span>
            </div>
            <div>
              <span className="text-slate-400">现金:</span>
              <span className="text-slate-200 ml-1 tabular-nums">{formatMoney(profile.cash)}</span>
            </div>
            <div>
              <span className="text-slate-400">建筑:</span>
              <span className="text-slate-200 ml-1 tabular-nums">{profile.buildingCount}</span>
            </div>
            <div>
              <span className="text-slate-400">成交量:</span>
              <span className="text-slate-200 ml-1 tabular-nums">
                {stock?.volume?.toLocaleString() || '--'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">市盈率:</span>
              <span className="text-slate-200 ml-1 tabular-nums">
                {stock?.pe ? stock.pe.toFixed(1) : '--'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">控制权:</span>
              <span className={`ml-1 ${CONTROL_LEVEL_COLORS[controlLevel]}`}>
                {CONTROL_LEVEL_NAMES[controlLevel]}
              </span>
            </div>
            
            {/* 玩家持股详情 */}
            {playerHolding && (
              <div className="col-span-6 border-t border-slate-700 pt-2 mt-1 grid grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-400">持有:</span>
                  <span className="text-slate-200 ml-1 tabular-nums">
                    {playerHolding.shares.toLocaleString()}股 ({playerHolding.percentage.toFixed(2)}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">成本:</span>
                  <span className="text-slate-200 ml-1 tabular-nums">
                    ¥{safeNumber(playerHolding.avgCost).toFixed(2)}/股
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">市值:</span>
                  <span className="text-slate-200 ml-1 tabular-nums">
                    {formatMoney(safeNumber(playerHolding.marketValue))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">盈亏:</span>
                  <span className={`ml-1 tabular-nums ${
                    safeNumber(playerHolding.unrealizedGain) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {safeNumber(playerHolding.unrealizedGain) >= 0 ? '+' : ''}
                    {formatMoney(safeNumber(playerHolding.unrealizedGain))}
                    ({safeNumber(playerHolding.unrealizedGainPercent) >= 0 ? '+' : ''}
                    {safeNumber(playerHolding.unrealizedGainPercent).toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyRow;