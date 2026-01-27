/**
 * 控股公司管理组件
 * 显示和管理玩家控股的公司
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

interface ControlledCompaniesProps {
  controlledProfiles: CompanyProfile[];
  onSelectCompany: (companyId: number) => void;
}

/**
 * 格式化金额
 */
function formatMoney(value: number): string {
  if (value >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-[600px] border border-slate-700 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">{profile.name}</h3>
            <p className="text-sm text-purple-400">
              您持有 {holdingPercent.toFixed(1)}% 股份（绝对控股）
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {/* 财务概况 */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">财务概况</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-400">现金:</span>
              <span className="text-white ml-2 tabular-nums">{formatMoney(profile.cash)}</span>
            </div>
            <div>
              <span className="text-slate-400">总资产:</span>
              <span className="text-white ml-2 tabular-nums">{formatMoney(profile.totalAssets)}</span>
            </div>
            <div>
              <span className="text-slate-400">建筑数:</span>
              <span className="text-white ml-2 tabular-nums">{profile.buildingCount}</span>
            </div>
            <div>
              <span className="text-slate-400">库存价值:</span>
              <span className="text-white ml-2 tabular-nums">{formatMoney(profile.inventoryValue)}</span>
            </div>
            <div>
              <span className="text-slate-400">市场份额:</span>
              <span className="text-white ml-2 tabular-nums">{profile.marketShare.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-slate-400">股票市值:</span>
              <span className="text-white ml-2 tabular-nums">
                {profile.stock ? formatMoney(profile.stock.marketCap) : '--'}
              </span>
            </div>
          </div>
        </div>
        
        {/* 经营策略 */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">经营策略</h4>
          <p className="text-xs text-slate-400 mb-3">
            设置公司的经营方向，影响AI的决策行为
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleStrategyChange('aggressive')}
              className={`flex-1 py-3 rounded-lg transition-colors ${
                strategy === 'aggressive'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              <div className="font-medium">激进</div>
              <div className="text-xs mt-1 opacity-80">快速扩张，高风险高回报</div>
            </button>
            <button
              onClick={() => handleStrategyChange('balanced')}
              className={`flex-1 py-3 rounded-lg transition-colors ${
                strategy === 'balanced'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              <div className="font-medium">均衡</div>
              <div className="text-xs mt-1 opacity-80">平衡发展，稳健增长</div>
            </button>
            <button
              onClick={() => handleStrategyChange('conservative')}
              className={`flex-1 py-3 rounded-lg transition-colors ${
                strategy === 'conservative'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              <div className="font-medium">保守</div>
              <div className="text-xs mt-1 opacity-80">保持现金，降低风险</div>
            </button>
          </div>
        </div>
        
        {/* 分红设置 */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">申请分红</h4>
          <p className="text-xs text-slate-400 mb-3">
            从公司现金中提取分红，按持股比例分配
          </p>
          
          <div className="mb-3">
            <label className="text-sm text-slate-400 mb-1 block">分红总额</label>
            <input
              type="range"
              min="0"
              max={profile.cash}
              step={10000}
              value={dividendAmount}
              onChange={(e) => setDividendAmount(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-400">¥0</span>
              <span className="text-white font-medium tabular-nums">{formatMoney(dividendAmount)}</span>
              <span className="text-slate-400">{formatMoney(profile.cash)}</span>
            </div>
          </div>
          
          <div className="bg-slate-600/50 rounded-lg p-3 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">分红总额:</span>
              <span className="text-white tabular-nums">{formatMoney(dividendAmount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-400">您的持股比例:</span>
              <span className="text-white tabular-nums">{holdingPercent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm mt-1 pt-2 border-t border-slate-500">
              <span className="text-slate-300">您将获得:</span>
              <span className="text-green-400 font-medium tabular-nums">{formatMoney(estimatedDividend)}</span>
            </div>
          </div>
          
          <button
            onClick={handleRequestDividend}
            disabled={dividendAmount <= 0 || dividendAmount > profile.cash}
            className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            申请分红
          </button>
        </div>
        
        {/* 资产重组提示 */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-300 mb-2">💡 资产重组</h4>
          <p className="text-xs text-purple-200/80">
            作为控股股东，您可以将该公司的建筑或库存转移到您的主公司。
            在"收购分析"标签页中可以发起资产重组。
          </p>
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
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-2">我的控股公司</h3>
        <div className="text-center py-6 text-slate-400">
          <div className="text-4xl mb-2">🏢</div>
          <p>暂无控股公司</p>
          <p className="text-xs mt-1">持股超过50%可获得公司控制权</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">
          我的控股公司 
          <span className="text-sm font-normal text-purple-400 ml-2">
            {controlledProfiles.length} 家
          </span>
        </h3>
        
        <div className="space-y-2">
          {controlledProfiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-slate-700/50 rounded-lg p-3 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-400 font-bold">
                  {profile.name.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-medium">{profile.name}</div>
                  <div className="text-xs text-slate-400">
                    持股 {profile.ownership.playerHolding?.percentage.toFixed(1)}% | 
                    现金 {formatMoney(profile.cash)} | 
                    建筑 {profile.buildingCount}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setManagingCompanyId(profile.id)}
                  className="px-3 py-1 text-sm bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
                >
                  管理
                </button>
                <button
                  onClick={() => onSelectCompany(profile.id)}
                  className="px-3 py-1 text-sm bg-slate-600/50 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                >
                  详情
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
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