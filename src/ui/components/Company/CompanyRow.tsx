/**
 * 公司列表行组件
 * 在统一的公司列表中显示单个公司信息
 * 支持移动端响应式布局
 */

import React from 'react';
import { CompanyProfile } from '@/core/finance/CompanyProfile';
import { CONTROL_LEVEL_NAMES, CONTROL_LEVEL_COLORS } from '@/core/finance/OwnershipControl';
import { useMobile } from '@/ui/hooks/useMobile';
import { Button, Badge } from '@/ui/design-system';

interface CompanyRowProps {
  profile: CompanyProfile;
  isSelected: boolean;
  onSelect: () => void;
  onQuickBuy: () => void;
  onQuickSell: () => void;
  onAcquire: () => void;
}

// 人格类型配置
const personalityConfig: Record<string, { label: string; color: string }> = {
  aggressive: { label: '激进', color: 'error' },
  conservative: { label: '保守', color: 'info' },
  opportunist: { label: '机会', color: 'warning' },
  specialist: { label: '专注', color: 'subtle' },
  diversified: { label: '多元', color: 'success' },
  innovator: { label: '创新', color: 'primary' },
  cost_leader: { label: '低成本', color: 'warning' },
  premium: { label: '高端', color: 'gold' },
};

// 威胁等级图标
const threatIcons: Record<string, { icon: string; color: string }> = {
  low: { icon: '●', color: 'text-green-400' },
  medium: { icon: '●', color: 'text-yellow-400' },
  high: { icon: '●', color: 'text-red-400' },
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
  if (Math.abs(safeValue) >= 1000000) return `¥${(safeValue / 1000000).toFixed(1)}M`;
  if (Math.abs(safeValue) >= 1000) return `¥${(safeValue / 1000).toFixed(0)}K`;
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
  const { isMobile } = useMobile();
  const stock = profile.stock;
  const isUp = stock && safeNumber(stock.priceChange) >= 0;
  const personality = personalityConfig[profile.personality] || { label: '未知', color: 'outline' };
  const threatInfo = threatIcons[profile.competition.threatLevel];
  const playerHolding = profile.ownership.playerHolding;
  const controlLevel = profile.controlStatus.playerControlLevel;
  
  // 移动端布局
  if (isMobile) {
    return (
      <div 
        className={`border-b border-[var(--border-muted)] transition-colors ${
          isSelected ? 'bg-[var(--bg-muted)]' : ''
        }`}
      >
        {/* 主卡片 */}
        <div className="p-3" onClick={onSelect}>
          {/* 第一行：公司名称和股价 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-sm flex-shrink-0">
                {profile.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-[var(--text-primary)] truncate">{profile.name}</span>
                  {profile.controlStatus.isPlayerControlled && (
                    <Badge variant="primary" size="sm">控股</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="font-mono">{stock?.ticker || '--'}</span>
                  <Badge variant={personality.color as any} size="sm">{personality.label}</Badge>
                </div>
              </div>
            </div>
            
            {/* 股价信息 */}
            <div className="text-right flex-shrink-0">
              <div className={`font-medium tabular-nums ${
                stock ? (isUp ? 'text-[var(--success)]' : 'text-[var(--error)]') : 'text-[var(--text-muted)]'
              }`}>
                {formatPrice(stock?.currentPrice)}
              </div>
              <div className={`text-xs tabular-nums ${
                stock ? (isUp ? 'text-[var(--success)]' : 'text-[var(--error)]') : 'text-[var(--text-muted)]'
              }`}>
                {formatPercent(stock?.priceChangePercent, true)}
              </div>
            </div>
          </div>
          
          {/* 第二行：关键指标 */}
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-3">
              <span className="text-[var(--text-muted)]">
                市值 <span className="text-[var(--text-primary)] tabular-nums">{stock ? formatMoney(stock.marketCap) : '--'}</span>
              </span>
              <span className="text-[var(--text-muted)]">
                份额 <span className="text-[var(--text-primary)] tabular-nums">{profile.marketShare.toFixed(1)}%</span>
              </span>
              <span className={threatInfo.color} title={`威胁: ${profile.competition.threatLevel}`}>
                {threatInfo.icon}
              </span>
            </div>
            {playerHolding && (
              <span className="text-[var(--text-muted)]">
                持有 <span className="text-[var(--accent)] tabular-nums">{playerHolding.percentage.toFixed(1)}%</span>
              </span>
            )}
          </div>
          
          {/* 第三行：操作按钮 */}
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              className="flex-1"
              onClick={(e) => { e.stopPropagation(); onQuickBuy(); }}
            >
              买入
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              disabled={!playerHolding}
              onClick={(e) => { e.stopPropagation(); onQuickSell(); }}
            >
              卖出
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAcquire(); }}
            >
              收购
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
            >
              {isSelected ? '▲' : '▼'}
            </Button>
          </div>
        </div>
        
        {/* 展开的详情 */}
        {isSelected && (
          <div className="px-3 pb-3">
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[var(--text-muted)]">主营:</span>
                  <span className="text-[var(--text-primary)] ml-1">{profile.competition.specialization}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">现金:</span>
                  <span className="text-[var(--text-primary)] ml-1 tabular-nums">{formatMoney(profile.cash)}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">建筑:</span>
                  <span className="text-[var(--text-primary)] ml-1 tabular-nums">{profile.buildingCount}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">控制权:</span>
                  <span className={`ml-1 ${CONTROL_LEVEL_COLORS[controlLevel]}`}>
                    {CONTROL_LEVEL_NAMES[controlLevel]}
                  </span>
                </div>
              </div>
              
              {playerHolding && (
                <div className="border-t border-[var(--border-muted)] pt-2 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[var(--text-muted)]">持有:</span>
                    <span className="text-[var(--text-primary)] ml-1 tabular-nums">
                      {playerHolding.shares.toLocaleString()}股
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">盈亏:</span>
                    <span className={`ml-1 tabular-nums ${
                      safeNumber(playerHolding.unrealizedGain) >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                    }`}>
                      {formatMoney(safeNumber(playerHolding.unrealizedGain))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // 桌面端布局
  return (
    <div 
      className={`border-b border-[var(--border-muted)] transition-colors ${
        isSelected ? 'bg-[var(--bg-muted)]' : 'hover:bg-[var(--bg-muted)]/50'
      }`}
    >
      {/* 主行 */}
      <div 
        className="grid grid-cols-12 gap-2 p-3 cursor-pointer items-center"
        onClick={onSelect}
      >
        {/* 股票代码 */}
        <div className="col-span-1">
          <span className="font-mono text-[var(--text-primary)] font-medium">
            {stock?.ticker || '--'}
          </span>
        </div>
        
        {/* 公司名称 */}
        <div className="col-span-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-sm flex-shrink-0">
            {profile.name.charAt(0)}
          </div>
          <div className="truncate">
            <span className="text-[var(--text-primary)] font-medium">{profile.name}</span>
            {profile.controlStatus.isPlayerControlled && (
              <span className="ml-1 text-xs text-purple-400">★控股</span>
            )}
          </div>
        </div>
        
        {/* 股价 */}
        <div className="col-span-1 text-right">
          <span className={`font-medium tabular-nums ${
            stock ? (isUp ? 'text-[var(--success)]' : 'text-[var(--error)]') : 'text-[var(--text-muted)]'
          }`}>
            {formatPrice(stock?.currentPrice)}
          </span>
        </div>
        
        {/* 涨跌幅 */}
        <div className="col-span-1 text-right">
          <span className={`tabular-nums ${
            stock ? (isUp ? 'text-[var(--success)]' : 'text-[var(--error)]') : 'text-[var(--text-muted)]'
          }`}>
            {formatPercent(stock?.priceChangePercent, true)}
          </span>
        </div>
        
        {/* 经营风格 */}
        <div className="col-span-1 text-center">
          <Badge variant={personality.color as any} size="sm">
            {personality.label}
          </Badge>
        </div>
        
        {/* 市值 */}
        <div className="col-span-1 text-right text-[var(--text-secondary)] tabular-nums">
          {stock ? formatMoney(stock.marketCap) : '--'}
        </div>
        
        {/* 市场份额 */}
        <div className="col-span-1 text-right text-[var(--text-secondary)] tabular-nums">
          {profile.marketShare.toFixed(1)}%
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
              <span className="text-[var(--text-secondary)] tabular-nums text-sm">
                {playerHolding.percentage.toFixed(1)}%
              </span>
            </div>
          ) : (
            <span className="text-[var(--text-muted)]">--</span>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="col-span-2 flex justify-end gap-1">
          <Button
            variant="success"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onQuickBuy(); }}
          >
            买入
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!playerHolding}
            onClick={(e) => { e.stopPropagation(); onQuickSell(); }}
          >
            卖出
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onAcquire(); }}
          >
            收购
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            {isSelected ? '▲' : '▼'}
          </Button>
        </div>
      </div>
      
      {/* 展开的子行 */}
      {isSelected && (
        <div className="px-3 pb-3 pt-0 text-sm">
          <div className="bg-[var(--bg-elevated)] rounded-lg p-3 grid grid-cols-6 gap-4">
            <div>
              <span className="text-[var(--text-muted)]">主营业务:</span>
              <span className="text-[var(--text-primary)] ml-1">{profile.competition.specialization}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">现金:</span>
              <span className="text-[var(--text-primary)] ml-1 tabular-nums">{formatMoney(profile.cash)}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">建筑:</span>
              <span className="text-[var(--text-primary)] ml-1 tabular-nums">{profile.buildingCount}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">成交量:</span>
              <span className="text-[var(--text-primary)] ml-1 tabular-nums">
                {stock?.volume?.toLocaleString() || '--'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">市盈率:</span>
              <span className="text-[var(--text-primary)] ml-1 tabular-nums">
                {stock?.pe ? stock.pe.toFixed(1) : '--'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">控制权:</span>
              <span className={`ml-1 ${CONTROL_LEVEL_COLORS[controlLevel]}`}>
                {CONTROL_LEVEL_NAMES[controlLevel]}
              </span>
            </div>
            
            {/* 玩家持股详情 */}
            {playerHolding && (
              <div className="col-span-6 border-t border-[var(--border-muted)] pt-2 mt-1 grid grid-cols-4 gap-4">
                <div>
                  <span className="text-[var(--text-muted)]">持有:</span>
                  <span className="text-[var(--text-primary)] ml-1 tabular-nums">
                    {playerHolding.shares.toLocaleString()}股 ({playerHolding.percentage.toFixed(2)}%)
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">成本:</span>
                  <span className="text-[var(--text-primary)] ml-1 tabular-nums">
                    ¥{safeNumber(playerHolding.avgCost).toFixed(2)}/股
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">市值:</span>
                  <span className="text-[var(--text-primary)] ml-1 tabular-nums">
                    {formatMoney(safeNumber(playerHolding.marketValue))}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">盈亏:</span>
                  <span className={`ml-1 tabular-nums ${
                    safeNumber(playerHolding.unrealizedGain) >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
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
