/**
 * 附属建筑管理面板
 * 显示和管理建筑的附属设施
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import {
  SubsidiaryBuildingDef,
  SubsidiaryCategory,
  getCategoryName,
  getCategoryIcon,
  getCategoryColor,
  formatEffectDescription,
  getEffectTags,
} from '@/core/production/SubsidiaryBuildings';

interface SubsidiaryPanelProps {
  buildingId: number;
}

/**
 * 附属建筑卡片组件
 */
const SubsidiaryCard: React.FC<{
  subsidiary: SubsidiaryBuildingDef;
  onInstall: () => void;
  canInstall: boolean;
  installReason?: string;
  playerCash: number;
}> = ({ subsidiary, onInstall, canInstall, installReason, playerCash }) => {
  const canAfford = playerCash >= subsidiary.buildCost;
  const effectDescriptions = formatEffectDescription(subsidiary.effects);
  const tags = getEffectTags(subsidiary.effects);
  
  return (
    <div className={`
      bg-gray-800/50 rounded-lg p-3 border transition-all
      ${canInstall && canAfford 
        ? 'border-gray-600 hover:border-blue-500 cursor-pointer' 
        : 'border-gray-700 opacity-60'}
    `}>
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="text-3xl">{subsidiary.icon}</div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white truncate">{subsidiary.name}</h4>
            <span className={`text-xs ${getCategoryColor(subsidiary.category)}`}>
              {getCategoryIcon(subsidiary.category)} {getCategoryName(subsidiary.category)}
            </span>
          </div>
          
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{subsidiary.description}</p>
          
          {/* 效果标签 */}
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag, i) => (
              <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${tag.color}`}>
                {tag.text}
              </span>
            ))}
          </div>
          
          {/* 效果列表 */}
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-300">
            {effectDescriptions.slice(0, 3).map((desc, i) => (
              <span key={i} className="bg-gray-700/50 px-1.5 py-0.5 rounded">
                {desc}
              </span>
            ))}
            {effectDescriptions.length > 3 && (
              <span className="text-gray-500">+{effectDescriptions.length - 3}项</span>
            )}
          </div>
          
          {/* 成本和操作 */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs">
              <span className={canAfford ? 'text-green-400' : 'text-red-400'}>
                ¥{subsidiary.buildCost.toLocaleString()}
              </span>
              <span className="text-gray-500 ml-2">
                维护 ¥{subsidiary.dailyMaintenance}/天
              </span>
              <span className="text-gray-500 ml-2">
                槽位 {subsidiary.slots}
              </span>
            </div>
            
            <button
              onClick={onInstall}
              disabled={!canInstall || !canAfford}
              className={`
                px-3 py-1 rounded text-xs font-medium transition-colors
                ${canInstall && canAfford
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              `}
            >
              安装
            </button>
          </div>
          
          {/* 不可安装原因 */}
          {!canInstall && installReason && (
            <p className="text-xs text-red-400 mt-1">{installReason}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 已安装的附属建筑项
 */
const InstalledSubsidiaryItem: React.FC<{
  slotIndex: number;
  subsidiaryId: number;
  condition: number;
  def: SubsidiaryBuildingDef | undefined;
  onUninstall: () => void;
  onRepair: () => void;
}> = ({ slotIndex, subsidiaryId, condition, def, onUninstall, onRepair }) => {
  if (!def) return null;
  
  const conditionPercent = Math.round(condition * 100);
  const conditionColor = condition > 0.8 ? 'text-green-400' : condition > 0.6 ? 'text-yellow-400' : 'text-red-400';
  const needsRepair = condition < 0.9;
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center gap-3">
        {/* 图标 */}
        <div className="text-2xl">{def.icon}</div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white truncate">{def.name}</h4>
            <span className={`text-xs ${getCategoryColor(def.category)}`}>
              {getCategoryIcon(def.category)}
            </span>
          </div>
          
          {/* 状态条 */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  condition > 0.8 ? 'bg-green-500' : condition > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${conditionPercent}%` }}
              />
            </div>
            <span className={`text-xs ${conditionColor}`}>{conditionPercent}%</span>
          </div>
          
          {/* 效果预览 */}
          <div className="flex flex-wrap gap-1 mt-1 text-xs text-gray-400">
            {formatEffectDescription(def.effects).slice(0, 2).map((desc, i) => (
              <span key={i}>{desc}</span>
            ))}
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex flex-col gap-1">
          {needsRepair && (
            <button
              onClick={onRepair}
              className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded text-xs"
            >
              维修
            </button>
          )}
          <button
            onClick={onUninstall}
            className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs"
          >
            拆除
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 附属建筑管理面板主组件
 */
export const SubsidiaryPanel: React.FC<SubsidiaryPanelProps> = ({ buildingId }) => {
  const [selectedCategory, setSelectedCategory] = useState<SubsidiaryCategory | 'all'>('all');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const playerCash = useGameStore(state => state.playerCash);
  const tick = useGameStore(state => state.tick);
  const getAvailableSubsidiaries = useGameStore(state => state.getAvailableSubsidiaries);
  const getInstalledSubsidiaries = useGameStore(state => state.getInstalledSubsidiaries);
  const getBuildingSubsidiarySlots = useGameStore(state => state.getBuildingSubsidiarySlots);
  const getBuildingSubsidiaryEffects = useGameStore(state => state.getBuildingSubsidiaryEffects);
  const installBuildingSubsidiary = useGameStore(state => state.installBuildingSubsidiary);
  const uninstallBuildingSubsidiary = useGameStore(state => state.uninstallBuildingSubsidiary);
  const repairBuildingSubsidiary = useGameStore(state => state.repairBuildingSubsidiary);
  const getSubsidiaryMaintenanceCost = useGameStore(state => state.getSubsidiaryMaintenanceCost);
  
  // 获取数据 - 添加 refreshKey 和 playerCash 作为依赖项以触发刷新
  const availableSubsidiaries = useMemo(() => getAvailableSubsidiaries(buildingId), [buildingId, getAvailableSubsidiaries, refreshKey]);
  const installedSubsidiaries = useMemo(() => getInstalledSubsidiaries(buildingId), [buildingId, getInstalledSubsidiaries, refreshKey, playerCash]);
  const slots = useMemo(() => getBuildingSubsidiarySlots(buildingId), [buildingId, getBuildingSubsidiarySlots, refreshKey, playerCash]);
  const effects = useMemo(() => getBuildingSubsidiaryEffects(buildingId), [buildingId, getBuildingSubsidiaryEffects, refreshKey, playerCash]);
  const maintenanceCost = useMemo(() => getSubsidiaryMaintenanceCost(buildingId), [buildingId, getSubsidiaryMaintenanceCost, refreshKey, playerCash]);
  
  // 按类别筛选
  const filteredSubsidiaries = useMemo(() => {
    if (selectedCategory === 'all') return availableSubsidiaries;
    return availableSubsidiaries.filter(s => s.category === selectedCategory);
  }, [availableSubsidiaries, selectedCategory]);
  
  // 类别统计
  const categoryStats = useMemo(() => {
    const stats: Record<SubsidiaryCategory, number> = {
      production: 0,
      efficiency: 0,
      quality: 0,
      capacity: 0,
      specialized: 0,
    };
    for (const sub of availableSubsidiaries) {
      stats[sub.category]++;
    }
    return stats;
  }, [availableSubsidiaries]);
  
  const handleInstall = (subsidiaryId: number) => {
    const result = installBuildingSubsidiary(buildingId, subsidiaryId);
    console.log('[SubsidiaryPanel] Install result:', result);
    if (result.success) {
      // 强制刷新数据
      setRefreshKey(prev => prev + 1);
    }
  };
  
  const handleUninstall = (slotIndex: number) => {
    if (confirm('确定要拆除这个附属设施吗？')) {
      const result = uninstallBuildingSubsidiary(buildingId, slotIndex);
      if (result.success) {
        setRefreshKey(prev => prev + 1);
      }
    }
  };
  
  const handleRepair = (slotIndex: number) => {
    const result = repairBuildingSubsidiary(buildingId, slotIndex);
    if (result.success) {
      setRefreshKey(prev => prev + 1);
    }
  };
  
  const categories: Array<SubsidiaryCategory | 'all'> = ['all', 'production', 'efficiency', 'quality', 'capacity', 'specialized'];
  
  return (
    <div className="space-y-4">
      {/* 标题和槽位信息 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🏗️ 附属设施
          <span className="text-sm font-normal text-gray-400">
            ({installedSubsidiaries.length} 已安装)
          </span>
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            槽位: <span className="text-white">{slots.used}/{slots.total}</span>
          </span>
          <span className="text-gray-400">
            维护: <span className="text-yellow-400">¥{maintenanceCost}/天</span>
          </span>
        </div>
      </div>
      
      {/* 综合效果预览 */}
      {effects && installedSubsidiaries.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-3 border border-blue-700/30">
          <h4 className="text-sm font-medium text-blue-300 mb-2">📊 综合效果</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {effects.outputMultiplier !== 1 && (
              <div className="bg-gray-800/50 rounded px-2 py-1">
                <span className="text-gray-400">产出</span>
                <span className={`ml-1 ${effects.outputMultiplier > 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {effects.outputMultiplier > 1 ? '+' : ''}{((effects.outputMultiplier - 1) * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {effects.speedMultiplier !== 1 && (
              <div className="bg-gray-800/50 rounded px-2 py-1">
                <span className="text-gray-400">速度</span>
                <span className={`ml-1 ${effects.speedMultiplier > 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {effects.speedMultiplier > 1 ? '+' : ''}{((effects.speedMultiplier - 1) * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {effects.qualityBonus > 0 && (
              <div className="bg-gray-800/50 rounded px-2 py-1">
                <span className="text-gray-400">品质</span>
                <span className="ml-1 text-purple-400">+{effects.qualityBonus.toFixed(2)}</span>
              </div>
            )}
            {effects.laborReduction > 0 && (
              <div className="bg-gray-800/50 rounded px-2 py-1">
                <span className="text-gray-400">人工</span>
                <span className="ml-1 text-green-400">-{(effects.laborReduction * 100).toFixed(0)}%</span>
              </div>
            )}
            {effects.energyReduction > 0 && (
              <div className="bg-gray-800/50 rounded px-2 py-1">
                <span className="text-gray-400">能耗</span>
                <span className="ml-1 text-green-400">-{(effects.energyReduction * 100).toFixed(0)}%</span>
              </div>
            )}
            {effects.inputReduction > 0 && (
              <div className="bg-gray-800/50 rounded px-2 py-1">
                <span className="text-gray-400">消耗</span>
                <span className="ml-1 text-green-400">-{(effects.inputReduction * 100).toFixed(0)}%</span>
              </div>
            )}
            {effects.storageCapacity > 0 && (
              <div className="bg-gray-800/50 rounded px-2 py-1">
                <span className="text-gray-400">存储</span>
                <span className="ml-1 text-blue-400">+{effects.storageCapacity}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 已安装的附属建筑 */}
      {installedSubsidiaries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">已安装</h4>
          <div className="grid gap-2">
            {installedSubsidiaries.map((sub) => (
              <InstalledSubsidiaryItem
                key={sub.slotIndex}
                slotIndex={sub.slotIndex}
                subsidiaryId={sub.subsidiaryId}
                condition={sub.condition}
                def={sub.def}
                onUninstall={() => handleUninstall(sub.slotIndex)}
                onRepair={() => handleRepair(sub.slotIndex)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 可安装的附属建筑 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">可安装</h4>
          
          {/* 类别筛选 */}
          <div className="flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`
                  px-2 py-1 rounded text-xs transition-colors
                  ${selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}
                `}
              >
                {cat === 'all' ? '全部' : getCategoryIcon(cat)}
                {cat !== 'all' && categoryStats[cat] > 0 && (
                  <span className="ml-1">{categoryStats[cat]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {filteredSubsidiaries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无可安装的附属设施</p>
            <p className="text-xs mt-1">升级建筑等级可解锁更多选项</p>
          </div>
        ) : (
          <div className="grid gap-2 max-h-96 overflow-y-auto pr-1">
            {filteredSubsidiaries.map(sub => {
              // 检查是否已安装
              const isInstalled = installedSubsidiaries.some(i => i.subsidiaryId === sub.id);
              const canInstall = !isInstalled && slots.available >= sub.slots;
              const reason = isInstalled 
                ? '已安装' 
                : slots.available < sub.slots 
                  ? '槽位不足' 
                  : undefined;
              
              return (
                <SubsidiaryCard
                  key={sub.id}
                  subsidiary={sub}
                  onInstall={() => handleInstall(sub.id)}
                  canInstall={canInstall}
                  installReason={reason}
                  playerCash={playerCash}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubsidiaryPanel;