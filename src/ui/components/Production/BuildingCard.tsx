import React, { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { RECIPES } from '@/data/recipes';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { CompactResourceBar } from './ResourceBar';
import { ProductionMethodsPanel } from './ProductionMethodsPanel';

interface BuildingCardProps {
  buildingIndex: number;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

type BuildingStatus = 'active' | 'warning' | 'error' | 'idle';

const statusStyles: Record<BuildingStatus, { border: string; glow: string; badge: string; text: string }> = {
  active: {
    border: 'border-l-green-500',
    glow: 'shadow-green-500/20',
    badge: 'bg-green-500/20 text-green-400',
    text: '生产中',
  },
  warning: {
    border: 'border-l-yellow-500',
    glow: 'shadow-yellow-500/20',
    badge: 'bg-yellow-500/20 text-yellow-400',
    text: '效率降低',
  },
  error: {
    border: 'border-l-red-500',
    glow: 'shadow-red-500/20',
    badge: 'bg-red-500/20 text-red-400',
    text: '资源不足',
  },
  idle: {
    border: 'border-l-gray-500',
    glow: '',
    badge: 'bg-gray-500/20 text-gray-400',
    text: '已暂停',
  },
};

export const BuildingCard: React.FC<BuildingCardProps> = ({
  buildingIndex,
  isSelected = false,
  onClick,
  compact = false,
}) => {
  const { getWorld, playerCash, upgradeBuilding, tick } = useGameStore();
  const world = getWorld();

  const buildingData = useMemo(() => {
    if (!world) return null;

    const typeId = world.buildings.types[buildingIndex];
    const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
    const recipeId = world.buildings.recipeIds[buildingIndex];
    const recipe = RECIPES.find(r => r.id === recipeId);
    const level = world.buildings.levels[buildingIndex];
    const efficiency = world.buildings.efficiencies[buildingIndex];
    const isActive = world.buildings.isActive[buildingIndex];
    const isRetail = isRetailBuilding(typeId);

    // 计算输入资源状态
    const inputs: Array<{
      goodsId: number;
      name: string;
      percentage: number;
      current: number;
      required: number;
    }> = [];
    
    let hasBottleneck = false;
    if (recipe && !isRetail) {
      for (let j = 0; j < recipe.inputs.length; j++) {
        const input = recipe.inputs[j];
        const current = world.buildings.inputBuffers[buildingIndex * 8 + j];
        const required = input.amount;
        const percentage = Math.min(1, current / required);
        const goods = ALL_GOODS.find(g => g.id === input.goodsId);
        
        inputs.push({
          goodsId: input.goodsId,
          name: goods?.name || `#${input.goodsId}`,
          percentage,
          current,
          required,
        });
        
        if (percentage < 1) hasBottleneck = true;
      }
    }

    // 计算产出
    const outputs: Array<{
      goodsId: number;
      name: string;
      dailyAmount: number;
      price: number;
    }> = [];
    
    let dailyRevenue = 0;
    if (recipe) {
      for (const output of recipe.outputs) {
        const goods = ALL_GOODS.find(g => g.id === output.goodsId);
        const dailyAmount = (output.amount / recipe.ticksRequired) * 24 * efficiency;
        const price = world.goods.prices[output.goodsId] || (goods?.basePrice || 0);
        dailyRevenue += dailyAmount * price;
        
        outputs.push({
          goodsId: output.goodsId,
          name: goods?.name || `#${output.goodsId}`,
          dailyAmount,
          price,
        });
      }
    }

    // 计算日成本
    const dailyCost = buildingDef 
      ? buildingDef.maintenanceCost + buildingDef.laborCost + buildingDef.energyCost
      : 0;

    // 确定状态
    let status: BuildingStatus = 'active';
    if (!isActive) {
      status = 'idle';
    } else if (hasBottleneck) {
      status = 'error';
    } else if (efficiency < 0.8) {
      status = 'warning';
    }

    // 升级信息
    const maxLevel = buildingDef?.maxLevel || 5;
    const upgradeCost = buildingDef?.upgradeCosts[level] || 0;
    const canUpgrade = level < maxLevel && playerCash >= upgradeCost;

    return {
      typeId,
      name: buildingDef?.name || `建筑#${typeId}`,
      description: buildingDef?.description || '',
      level,
      maxLevel,
      efficiency,
      isActive,
      isRetail,
      recipeId,
      recipeName: recipe?.name || (isRetail ? '零售' : '无配方'),
      inputs,
      outputs,
      dailyRevenue,
      dailyCost,
      dailyProfit: dailyRevenue - dailyCost,
      status,
      upgradeCost,
      canUpgrade,
    };
  }, [world, buildingIndex, playerCash, tick]);

  if (!buildingData) return null;

  const style = statusStyles[buildingData.status];

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `¥${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `¥${(value / 1000).toFixed(0)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  const handleUpgrade = (e: React.MouseEvent) => {
    e.stopPropagation();
    upgradeBuilding(buildingIndex);
  };

  if (compact) {
    // 紧凑模式 - 用于列表视图
    return (
      <div
        onClick={onClick}
        className={`
          flex items-center gap-3 p-3 rounded-lg cursor-pointer
          bg-gradient-to-r from-slate-800/80 to-slate-900/80
          border border-l-4 ${style.border} border-white/5
          hover:border-white/10 hover:bg-slate-800/90
          transition-all duration-200
          ${isSelected ? 'ring-2 ring-blue-500/50 bg-slate-800/90' : ''}
        `}
      >
        <BuildingIcon buildingId={buildingData.typeId} size={32} autoColor />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{buildingData.name}</span>
            <span className="text-xs text-text-tertiary">Lv.{buildingData.level}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${style.badge}`}>
              {style.text}
            </span>
          </div>
          <div className="text-xs text-text-tertiary truncate">{buildingData.recipeName}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-green-400 tabular-nums">
            {formatMoney(buildingData.dailyProfit)}/日
          </div>
          <div className="text-xs text-text-tertiary tabular-nums">
            效率 {(buildingData.efficiency * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    );
  }

  // 标准卡片模式
  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl cursor-pointer overflow-hidden
        bg-gradient-to-br from-slate-800/90 to-slate-900/95
        border border-l-4 ${style.border} border-white/10
        hover:border-white/20 hover:shadow-lg ${style.glow}
        transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500/50 scale-[1.02]' : ''}
      `}
    >
      {/* 头部 */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            <BuildingIcon buildingId={buildingData.typeId} size={32} autoColor />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm truncate">{buildingData.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-text-secondary">
                Lv.{buildingData.level}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${style.badge}`}>
                {style.text}
              </span>
              <span className="text-xs text-text-tertiary truncate">{buildingData.recipeName}</span>
            </div>
          </div>
        </div>
        
        {/* 效率进度条 */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-text-tertiary">效率</span>
            <span className="text-xs text-text-secondary tabular-nums">
              {(buildingData.efficiency * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                buildingData.efficiency >= 0.8
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : buildingData.efficiency >= 0.5
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                  : 'bg-gradient-to-r from-red-500 to-red-400'
              }`}
              style={{ width: `${buildingData.efficiency * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* 输入/输出区域 */}
      {!buildingData.isRetail && (
        <div className="px-4 py-3 border-t border-white/5 bg-black/20">
          <div className="grid grid-cols-2 gap-4">
            {/* 输入 */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[10px] text-text-tertiary">📥 输入</span>
              </div>
              <div className="space-y-1.5">
                {buildingData.inputs.length === 0 ? (
                  <span className="text-[10px] text-green-400">无需原料</span>
                ) : (
                  buildingData.inputs.slice(0, 3).map((input) => (
                    <CompactResourceBar
                      key={input.goodsId}
                      value={input.percentage}
                      label={input.name.slice(0, 4)}
                    />
                  ))
                )}
              </div>
            </div>
            
            {/* 输出 */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[10px] text-text-tertiary">📤 输出</span>
              </div>
              <div className="space-y-1">
                {buildingData.outputs.slice(0, 3).map((output) => (
                  <div key={output.goodsId} className="flex items-center gap-1">
                    <GoodsIcon goodsId={output.goodsId} size={12} />
                    <span className="text-xs text-green-400 tabular-nums">
                      +{output.dailyAmount.toFixed(0)}/日
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 生产方式槽位 */}
      <div className="px-4 py-2 border-t border-white/5">
        <ProductionMethodsPanel
          buildingId={buildingIndex}
          buildingTypeId={buildingData.typeId}
          buildingLevel={buildingData.level}
        />
      </div>
      
      {/* 底部操作栏 */}
      <div className="px-4 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">💰</span>
          <span className={`text-sm font-medium tabular-nums ${
            buildingData.dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {formatMoney(buildingData.dailyProfit)}/日
          </span>
        </div>
        
        <button
          onClick={handleUpgrade}
          disabled={!buildingData.canUpgrade}
          className={`
            px-3 py-1.5 text-xs rounded-lg font-medium transition-all
            ${buildingData.canUpgrade
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
              : buildingData.level >= buildingData.maxLevel
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {buildingData.level >= buildingData.maxLevel
            ? '满级'
            : `升级 ${formatMoney(buildingData.upgradeCost)}`
          }
        </button>
      </div>
    </div>
  );
};

export default BuildingCard;