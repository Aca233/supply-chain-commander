/**
 * 控股公司管理组件
 * 显示和管理玩家控股的公司
 * 使用统一设计系统，支持主题切换
 */

import React, { useState } from 'react';
import { CompanyProfile } from '@/core/finance/CompanyProfile';
import { useGameStore } from '@/stores/gameStore';
import {
  ControlStrategy,
  getControlledCompanyStrategy,
  setControlledCompanyStrategy,
  requestDividend,
} from '@/core/finance/OwnershipControl';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/ui/design-system';

interface ControlledCompaniesProps {
  controlledProfiles: CompanyProfile[];
  onSelectCompany: (companyId: number) => void;
}

/**
 * 格式化金额
 */
function formatMoney(value: number): string {
  if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
  return `¥${value.toFixed(0)}`;
}

/**
 * 控股公司管理模态框
 */
export const ControlledCompanyModal: React.FC<{
  profile: CompanyProfile;
  onClose: () => void;
}> = ({ profile, onClose }) => {
  const { getWorld, addNotification } = useGameStore();
  const world = getWorld();
  
  const [strategy, setStrategy] = useState<ControlStrategy>(
    getControlledCompanyStrategy(profile.id)?.strategy || 'balanced'
  );
  const [dividendAmount, setDividendAmount] = useState(
    Math.floor(profile.cash * 0.1)
  );
  
  const playerHolding = profile.ownership.playerHolding;
  const holdingPercent = playerHolding?.percentage || 0;
  
  // 预计分红收入
  const estimatedDividend = dividendAmount * (holdingPercent / 100);
  
  // 改变策略
  const handleStrategyChange = (newStrategy: ControlStrategy) => {
    if (!world) return;
    
    const success = setControlledCompanyStrategy(world, profile.id, newStrategy);
    if (success) {
      setStrategy(newStrategy);
      addNotification('success', `已将 ${profile.name} 的经营策略改为${
        newStrategy === 'aggressive' ? '激进' :
        newStrategy === 'conservative' ? '保守' : '均衡'
      }`);
    }
  };
  
  // 申请分红
  const handleRequestDividend = () => {
    if (!world) return;
    
    const result = requestDividend(world, profile.id, dividendAmount);
    if (result.success && result.playerReceived) {
      addNotification('success', `分红成功！您获得 ${formatMoney(result.playerReceived)}`);
      onClose();
    } else {
      addNotification('error', result.reason || '分红失败');
    }
  };
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-[600px] max-h-[80vh] overflow-y-auto rounded-xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* 标题栏 */}
        <div 
          className="p-6 flex justify-between items-center"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">{profile.name}</h3>
            <p className="text-sm text-purple-400 mt-1">
              您持有 {holdingPercent.toFixed(1)}% 股份（绝对控股）
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 财务概况 */}
          <div className="bg-[var(--bg-muted)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">📊 财务概况</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">现金:</span>
                <span className="text-[var(--text-primary)] ml-2 tabular-nums">{formatMoney(profile.cash)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">总资产:</span>
                <span className="text-[var(--text-primary)] ml-2 tabular-nums">{formatMoney(profile.totalAssets)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">建筑数:</span>
                <span className="text-[var(--text-primary)] ml-2 tabular-nums">{profile.buildingCount}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">库存价值:</span>
                <span className="text-[var(--text-primary)] ml-2 tabular-nums">{formatMoney(profile.inventoryValue)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">市场份额:</span>
                <span className="text-[var(--text-primary)] ml-2 tabular-nums">{profile.marketShare.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">股票市值:</span>
                <span className="text-[var(--text-primary)] ml-2 tabular-nums">
                  {profile.stock ? formatMoney(profile.stock.marketCap) : '--'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 经营策略 */}
          <div className="bg-[var(--bg-muted)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">🎯 经营策略</h4>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              设置公司的经营方向，影响AI的决策行为
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleStrategyChange('aggressive')}
                className={`flex-1 py-3 rounded-lg transition-colors ${
                  strategy === 'aggressive'
                    ? 'bg-[var(--error)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <div className="font-medium">激进</div>
                <div className="text-xs mt-1 opacity-80">快速扩张，高风险高回报</div>
              </button>
              <button
                onClick={() => handleStrategyChange('balanced')}
                className={`flex-1 py-3 rounded-lg transition-colors ${
                  strategy === 'balanced'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <div className="font-medium">均衡</div>
                <div className="text-xs mt-1 opacity-80">平衡发展，稳健增长</div>
              </button>
              <button
                onClick={() => handleStrategyChange('conservative')}
                className={`flex-1 py-3 rounded-lg transition-colors ${
                  strategy === 'conservative'
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <div className="font-medium">保守</div>
                <div className="text-xs mt-1 opacity-80">保持现金，降低风险</div>
              </button>
            </div>
          </div>
          
          {/* 分红设置 */}
          <div className="bg-[var(--bg-muted)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">💰 申请分红</h4>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              从公司现金中提取分红，按持股比例分配
            </p>
            
            <div className="mb-3">
              <label className="text-sm text-[var(--text-muted)] mb-1 block">分红总额</label>
              <input
                type="range"
                min="0"
                max={profile.cash}
                step={10000}
                value={dividendAmount}
                onChange={(e) => setDividendAmount(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(dividendAmount / profile.cash) * 100}%, var(--bg-subtle) ${(dividendAmount / profile.cash) * 100}%, var(--bg-subtle) 100%)`,
                }}
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-[var(--text-muted)]">¥0</span>
                <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatMoney(dividendAmount)}</span>
                <span className="text-[var(--text-muted)]">{formatMoney(profile.cash)}</span>
              </div>
            </div>
            
            <div className="bg-[var(--bg-subtle)] rounded-lg p-3 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">分红总额:</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatMoney(dividendAmount)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-[var(--text-muted)]">您的持股比例:</span>
                <span className="text-[var(--text-primary)] tabular-nums">{holdingPercent.toFixed(1)}%</span>
              </div>
              <div 
                className="flex justify-between text-sm mt-1 pt-2"
                style={{ borderTop: '1px solid var(--border-default)' }}
              >
                <span className="text-[var(--text-secondary)]">您将获得:</span>
                <span className="text-[var(--success)] font-medium tabular-nums">{formatMoney(estimatedDividend)}</span>
              </div>
            </div>
            
            <Button
              variant="success"
              className="w-full"
              onClick={handleRequestDividend}
              disabled={dividendAmount <= 0 || dividendAmount > profile.cash}
            >
              申请分红
            </Button>
          </div>
          
          {/* 资产重组提示 */}
          <div 
            className="rounded-lg p-4"
            style={{ 
              backgroundColor: 'rgba(168, 85, 247, 0.1)', 
              border: '1px solid rgba(168, 85, 247, 0.3)' 
            }}
          >
            <h4 className="text-sm font-medium text-purple-400 mb-2">💡 资产重组</h4>
            <p className="text-xs text-purple-300">
              作为控股股东，您可以将该公司的建筑或库存转移到您的主公司。
              在"收购分析"标签页中可以发起资产重组。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 控股公司列表面板
 */
export const ControlledCompanies: React.FC<ControlledCompaniesProps> = ({
  controlledProfiles,
  onSelectCompany,
}) => {
  const [managingCompanyId, setManagingCompanyId] = useState<number | null>(null);
  
  const managingProfile = controlledProfiles.find(p => p.id === managingCompanyId);
  
  if (controlledProfiles.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>🏢 我的控股公司</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-[var(--text-muted)]">
            <div className="text-4xl mb-2">🏢</div>
            <p>暂无控股公司</p>
            <p className="text-xs mt-1">持股超过50%可获得公司控制权</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>🏢 我的控股公司</CardTitle>
            <Badge variant="primary">{controlledProfiles.length} 家</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {controlledProfiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-[var(--bg-muted)] rounded-lg p-3 flex justify-between items-center hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-purple-400 font-bold"
                    style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)' }}
                  >
                    {profile.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[var(--text-primary)] font-medium">{profile.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      持股 {profile.ownership.playerHolding?.percentage.toFixed(1)}% | 
                      现金 {formatMoney(profile.cash)} | 
                      建筑 {profile.buildingCount}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    variant="neon"
                    onClick={() => setManagingCompanyId(profile.id)}
                  >
                    管理
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onSelectCompany(profile.id)}
                  >
                    详情
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* 管理模态框 */}
      {managingProfile && (
        <ControlledCompanyModal
          profile={managingProfile}
          onClose={() => setManagingCompanyId(null)}
        />
      )}
    </>
  );
};

export default ControlledCompanies;
