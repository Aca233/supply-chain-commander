/**
 * 公司详情组件
 * 展示选中公司的完整信息，包括股票交易和收购分析
 */

import React, { useMemo, useState } from 'react';
import { CompanyProfile } from '@/core/finance/CompanyProfile';
import { useGameStore } from '@/stores/gameStore';
import { ShareholderChart } from './ShareholderChart';
import { TradePanel } from './TradePanel';
import { ControlLevel } from '@/core/finance/CompanyProfile';
import { CONTROL_LEVEL_NAMES, calculateAcquisitionCost } from '@/core/finance/OwnershipControl';

interface CompanyDetailProps {
  profile: CompanyProfile;
  onClose: () => void;
  onAcquire: () => void;
}

/**
 * 确保数值有效
 */
function safeNumber(value: number, defaultValue: number = 0): number {
  return isFinite(value) ? value : defaultValue;
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
 * 安全格式化价格
 */
function formatPrice(value: number): string {
  const safeValue = safeNumber(value, 0);
  return `¥${safeValue.toFixed(2)}`;
}

// 人格类型颜色
const personalityColors: Record<string, string> = {
  aggressive: 'bg-red-500/20 text-red-400',
  conservative: 'bg-blue-500/20 text-blue-400',
  opportunist: 'bg-yellow-500/20 text-yellow-400',
  specialist: 'bg-purple-500/20 text-purple-400',
  diversified: 'bg-green-500/20 text-green-400',
  innovator: 'bg-cyan-500/20 text-cyan-400',
  cost_leader: 'bg-orange-500/20 text-orange-400',
  premium: 'bg-pink-500/20 text-pink-400',
};

export const CompanyDetail: React.FC<CompanyDetailProps> = ({
  profile,
  onClose,
  onAcquire,
}) => {
  const { playerCash, analyzeAcquisition } = useGameStore();
  const [activeTab, setActiveTab] = useState<'trade' | 'analysis' | 'acquisition'>('trade');
  
  const stock = profile.stock;
  const playerHolding = profile.ownership.playerHolding;
  
  // 收购分析
  const acquisitionAnalysis = useMemo(() => {
    return analyzeAcquisition(profile.id);
  }, [profile.id, analyzeAcquisition]);
  
  // 计算达到不同控制权等级的成本
  const controlCosts = useMemo(() => {
    const costs: Array<{ level: ControlLevel; name: string; cost: number | null }> = [];
    
    for (const level of [ControlLevel.Significant, ControlLevel.Major, ControlLevel.Strategic, ControlLevel.Absolute]) {
      const result = calculateAcquisitionCost(profile.id, level);
      costs.push({
        level,
        name: CONTROL_LEVEL_NAMES[level],
        cost: result?.estimatedCost || null,
      });
    }
    
    return costs;
  }, [profile.id]);
  
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-xl">
            {profile.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{profile.name}</span>
              <span className="font-mono text-slate-400">{stock?.ticker || ''}</span>
              {profile.controlStatus.isPlayerControlled && (
                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                  已控股
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded ${personalityColors[profile.personality]}`}>
                {profile.personalityName}
              </span>
              <span className="text-sm text-slate-400">
                {profile.competition.specialization}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-2"
        >
          ✕
        </button>
      </div>
      
      {/* 标签页 */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('trade')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'trade'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          股票交易
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'analysis'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          公司分析
        </button>
        <button
          onClick={() => setActiveTab('acquisition')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'acquisition'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          收购分析
        </button>
      </div>
      
      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'trade' && (
          <div className="grid grid-cols-2 gap-6">
            {/* 左侧：股票信息 */}
            <div className="space-y-4">
              {/* 股价信息 */}
              {stock ? (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-3xl font-bold text-white tabular-nums">
                        {formatPrice(stock.currentPrice)}
                      </div>
                      <div className={`text-sm tabular-nums ${
                        safeNumber(stock.priceChange) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {safeNumber(stock.priceChange) >= 0 ? '+' : ''}
                        {safeNumber(stock.priceChange).toFixed(2)} ({safeNumber(stock.priceChangePercent) >= 0 ? '+' : ''}
                        {safeNumber(stock.priceChangePercent).toFixed(2)}%)
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-slate-400">市值</div>
                      <div className="text-white font-medium tabular-nums">
                        {formatMoney(stock.marketCap)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-slate-400">今开</div>
                      <div className="text-white tabular-nums">{formatPrice(stock.openPrice)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">最高</div>
                      <div className="text-green-400 tabular-nums">{formatPrice(stock.highPrice)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">最低</div>
                      <div className="text-red-400 tabular-nums">{formatPrice(stock.lowPrice)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">昨收</div>
                      <div className="text-white tabular-nums">{formatPrice(stock.previousClose)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">成交量</div>
                      <div className="text-white tabular-nums">{safeNumber(stock.volume).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">累计成交</div>
                      <div className="text-white tabular-nums">{safeNumber(stock.totalVolume).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">换手率</div>
                      <div className="text-white tabular-nums">{(safeNumber(stock.turnoverRate) * 100).toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400">市盈率</div>
                      <div className="text-white tabular-nums">{safeNumber(stock.pe) > 0 ? safeNumber(stock.pe).toFixed(1) : '--'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">市净率</div>
                      <div className="text-white tabular-nums">{safeNumber(stock.pb).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-700/50 rounded-lg p-4 text-center text-slate-400">
                  该公司未上市
                </div>
              )}
              
              {/* 我的持股 */}
              {playerHolding && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">我的持股</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-400">持有数量</div>
                      <div className="text-white tabular-nums">
                        {playerHolding.shares.toLocaleString()} 股
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">持股比例</div>
                      <div className="text-white tabular-nums">
                        {playerHolding.percentage.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">成本价</div>
                      <div className="text-white tabular-nums">
                        ¥{playerHolding.avgCost.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">市值</div>
                      <div className="text-white tabular-nums">
                        {formatMoney(playerHolding.marketValue)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-400">盈亏</div>
                      <div className={`tabular-nums ${
                        playerHolding.unrealizedGain >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {playerHolding.unrealizedGain >= 0 ? '+' : ''}
                        {formatMoney(playerHolding.unrealizedGain)}
                        ({playerHolding.unrealizedGainPercent >= 0 ? '+' : ''}
                        {playerHolding.unrealizedGainPercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 股东结构 */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">股东结构</h4>
                <ShareholderChart ownership={profile.ownership} />
              </div>
            </div>
            
            {/* 右侧：交易面板 */}
            <div>
              {stock && stock.isTradable ? (
                <TradePanel
                  companyId={profile.id}
                  currentPrice={stock.currentPrice}
                  playerShares={playerHolding?.shares || 0}
                />
              ) : (
                <div className="bg-slate-700/50 rounded-lg p-8 text-center text-slate-400">
                  <p className="text-lg mb-2">该股票暂不可交易</p>
                  <p className="text-sm">公司尚未上市或已停牌</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-2 gap-6">
            {/* 公司概况 */}
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">公司概况</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">经营风格</span>
                    <span className={`px-2 py-0.5 rounded ${personalityColors[profile.personality]}`}>
                      {profile.personalityName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">主营业务</span>
                    <span className="text-white">{profile.competition.specialization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">建筑数量</span>
                    <span className="text-white tabular-nums">{profile.buildingCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">现金储备</span>
                    <span className="text-white tabular-nums">{formatMoney(profile.cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">总资产</span>
                    <span className="text-white tabular-nums">{formatMoney(profile.totalAssets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">库存价值</span>
                    <span className="text-white tabular-nums">{formatMoney(profile.inventoryValue)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">市场地位</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">市场份额</span>
                    <span className="text-white tabular-nums">{profile.marketShare.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">发展趋势</span>
                    <span className={
                      profile.competition.trend === 'up' ? 'text-green-400' :
                      profile.competition.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                    }>
                      {profile.competition.trend === 'up' ? '↑ 上升' :
                       profile.competition.trend === 'down' ? '↓ 下降' : '→ 稳定'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">竞争威胁</span>
                    <span className={
                      profile.competition.threatLevel === 'high' ? 'text-red-400' :
                      profile.competition.threatLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
                    }>
                      {profile.competition.threatLevel === 'high' ? '⚠️ 高' :
                       profile.competition.threatLevel === 'medium' ? '● 中' : '● 低'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 股东与控制 */}
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">股东结构</h4>
                <ShareholderChart ownership={profile.ownership} />
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">控制权状态</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">控股方</span>
                    <span className="text-white">
                      {profile.ownership.controllingShareholderName || '无'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">控股比例</span>
                    <span className="text-white tabular-nums">
                      {profile.ownership.controllingPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">我的控制权</span>
                    <span className="text-white">
                      {CONTROL_LEVEL_NAMES[profile.controlStatus.playerControlLevel]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'acquisition' && (
          <div className="space-y-4">
            {/* 收购可行性 */}
            {acquisitionAnalysis && (
              <div className={`rounded-lg p-4 ${
                acquisitionAnalysis.feasible
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-lg ${
                    acquisitionAnalysis.feasible ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {acquisitionAnalysis.feasible ? '✓ 可行性评估通过' : '✗ 可行性评估未通过'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    acquisitionAnalysis.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                    acquisitionAnalysis.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    风险: {acquisitionAnalysis.riskLevel === 'low' ? '低' :
                           acquisitionAnalysis.riskLevel === 'medium' ? '中' : '高'}
                  </span>
                </div>
                {!acquisitionAnalysis.feasible && acquisitionAnalysis.reason && (
                  <p className="text-sm text-red-300 mb-3">{acquisitionAnalysis.reason}</p>
                )}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">建议溢价:</span>
                    <span className="text-white ml-2">
                      {(acquisitionAnalysis.suggestedPremium * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">预估成本:</span>
                    <span className="text-white ml-2">
                      {formatMoney(acquisitionAnalysis.estimatedCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">协同效应:</span>
                    <span className="text-white ml-2">
                      {formatMoney(acquisitionAnalysis.synergies)}/年
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 控制权成本 */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3">达到不同控制权等级的成本</h4>
              <div className="space-y-2">
                {controlCosts.map(({ level, name, cost }) => (
                  <div key={level} className="flex justify-between items-center py-2 border-b border-slate-600 last:border-0">
                    <div>
                      <span className="text-white">{name}</span>
                      <span className="text-slate-400 text-xs ml-2">
                        ({level === ControlLevel.Significant ? '≥5%' :
                          level === ControlLevel.Major ? '≥10%' :
                          level === ControlLevel.Strategic ? '≥20%' : '≥50%'})
                      </span>
                    </div>
                    <div className="text-right">
                      {cost !== null ? (
                        <span className={`tabular-nums ${
                          cost > playerCash ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {formatMoney(cost)}
                        </span>
                      ) : (
                        <span className="text-slate-500">无法计算</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                * 预估成本包含20%溢价，实际成本可能因市场波动而变化
              </p>
            </div>
            
            {/* 收购按钮 */}
            <div className="flex gap-4">
              <button
                onClick={onAcquire}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                发起收购要约
              </button>
              {stock && stock.isTradable && (
                <button
                  onClick={() => setActiveTab('trade')}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  通过股票市场增持
                </button>
              )}
            </div>
            
            <p className="text-xs text-slate-400 text-center">
              提示：您可以通过股票市场逐步增持股份，当持股超过50%时将获得公司控制权
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDetail;