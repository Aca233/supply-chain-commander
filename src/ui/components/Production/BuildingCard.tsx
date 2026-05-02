/**
 * 建筑卡片组件
 * 现代毛玻璃风格设计
 */

import React, { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { CompactResourceBar } from './ResourceBar';
import { ProductionMethodsPanel } from './ProductionMethodsPanel';
import { BuildingProductionControlInline } from './BuildingProductionControlInline';
import {
  calculateBuildingDailyAmount,
  calculateBuildingFinancialEstimate,
} from './BuildingFinancialEstimate';
import { calculateBuildingDefinitionOperatingCostPerTick } from '@/core/finance/OperatingCostModel';

// 设计系统组件
import { Card, Badge, Button, ProgressBar } from '@/ui/design-system';

interface BuildingCardProps {
  buildingIndex: number;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

type BuildingStatus = 'active' | 'warning' | 'error' | 'idle';

// 毛玻璃风格状态配置
const statusConfig: Record<BuildingStatus, {
  variant: 'success' | 'warning' | 'error' | 'outline';
  text: string;
  badgeClass: string;
  cardStatus: 'success' | 'warning' | 'error' | 'none';
}> = {
  active: {
    variant: 'success',
    text: '生产中',
    badgeClass: 'bg-green-500/20 text-green-400 border border-green-500/30',
    cardStatus: 'success'
  },
  warning: {
    variant: 'warning',
    text: '效率降低',
    badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    cardStatus: 'warning'
  },
  error: {
    variant: 'error',
    text: '资源不足',
    badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
    cardStatus: 'error'
  },
  idle: {
    variant: 'outline',
    text: '已暂停',
    badgeClass: 'bg-white/10 text-white/50 border border-white/20',
    cardStatus: 'none'
  },
};

export const BuildingCard: React.FC<BuildingCardProps> = ({
  buildingIndex,
  isSelected = false,
  onClick,
  compact = false,
}) => {
  const { getWorld, playerCash, upgradeBuilding, tick } = useGameStore();

  // 每次渲染时获取最新的world引用（tick变化会触发重新渲染）
  const buildingData = useMemo(() => {
    const world = getWorld();
    if (!world) return null;

    const typeId = world.buildings.types[buildingIndex];
    const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
    const production = getBuildingRecipeFromInstance(world, buildingIndex);
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
    if (production && production.inputs && !isRetail) {
      for (let j = 0; j < production.inputs.length; j++) {
        const input = production.inputs[j];
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
    
    const ticksRequired = production?.ticksRequired || 1;
    if (production && production.outputs) {
      for (const output of production.outputs) {
        const goods = ALL_GOODS.find(g => g.id === output.goodsId);
        const dailyAmount = calculateBuildingDailyAmount(output.amount, ticksRequired, efficiency);
        const price = world.goods.prices[output.goodsId] || (goods?.basePrice || 0);
        
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
      ? calculateBuildingDefinitionOperatingCostPerTick(buildingDef).cashExpense
      : 0;
    const financialEstimate = calculateBuildingFinancialEstimate({
      isActive: Boolean(isActive),
      dailyCost,
      outputs,
    });

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

    // 获取生产配置名称
    let productionName = isRetail ? '零售' : '无配方';
    if (production.outputs.length > 0) {
      const outputGoods = ALL_GOODS.find(g => g.id === production.outputs[0].goodsId);
      productionName = `生产${outputGoods?.name || '商品'}`;
    } else if (buildingDef) {
      productionName = buildingDef.name;
    }

    return {
      typeId,
      name: buildingDef?.name || `建筑#${typeId}`,
      description: buildingDef?.description || '',
      level,
      maxLevel,
      efficiency,
      isActive,
      isRetail,
      productionName,
      inputs,
      outputs,
      dailyRevenue: financialEstimate.dailyRevenue,
      dailyCost: financialEstimate.dailyCost,
      dailyProfit: financialEstimate.dailyProfit,
      status,
      upgradeCost,
      canUpgrade,
    };
  }, [getWorld, buildingIndex, playerCash, tick]);

  if (!buildingData) return null;

  const config = statusConfig[buildingData.status];

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(0)}K`;
    return `¥${value.toFixed(0)}`;
  };

  const handleUpgrade = (e: React.MouseEvent) => {
    e.stopPropagation();
    upgradeBuilding(buildingIndex);
  };

  if (compact) {
    // 紧凑模式 - 毛玻璃风格
    return (
      <Card
        variant="glass"
        padding="sm"
        status={config.cardStatus}
        interactive
        selected={isSelected}
        onClick={onClick}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          {/* 图标容器 - 毛玻璃效果 */}
          <div className="w-10 h-10 rounded-xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] flex items-center justify-center flex-shrink-0">
            <BuildingIcon buildingId={buildingData.typeId} size={24} autoColor />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate text-white">{buildingData.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
                Lv.{buildingData.level}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.badgeClass}`}>
                {config.text}
              </span>
            </div>
            <div className="text-xs text-white/50 truncate">{buildingData.productionName}</div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium tabular-nums ${buildingData.dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatMoney(buildingData.dailyProfit)}/日
            </div>
            <div className="text-xs text-white/40 tabular-nums">
              效率 {(buildingData.efficiency * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        <BuildingProductionControlInline buildingId={buildingIndex} compact />
      </Card>
    );
  }

  // 标准卡片模式 - 完整毛玻璃设计
  return (
    <Card
      variant="glass"
      padding="none"
      status={config.cardStatus}
      interactive
      selected={isSelected}
      onClick={onClick}
      className="overflow-hidden"
    >
      {/* 头部 - 建筑信息 */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* 图标容器 - 毛玻璃圆角方形 */}
          <div className="w-12 h-12 rounded-xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <BuildingIcon buildingId={buildingData.typeId} size={28} autoColor />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm truncate text-white">{buildingData.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/70 border border-white/10 font-medium">
                Lv.{buildingData.level}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-md ${config.badgeClass} font-medium`}>
                {config.text}
              </span>
              <span className="text-xs text-white/50 truncate">{buildingData.productionName}</span>
            </div>
          </div>
        </div>
        
        {/* 效率进度条 - 发光效果 */}
        <div className="mt-3">
          <ProgressBar
            value={buildingData.efficiency * 100}
            max={100}
            showValue
            label="效率"
            size="sm"
            variant="ghost"
            glow
            color={buildingData.efficiency >= 0.8 ? 'success' : buildingData.efficiency >= 0.5 ? 'warning' : 'error'}
          />
        </div>
      </div>
      
      {/* 输入/输出区域 - 半透明分隔 */}
      {!buildingData.isRetail && (
        <div className="px-4 py-3 border-t border-white/[0.06] bg-black/20">
          <div className="grid grid-cols-2 gap-4">
            {/* 输入 */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[10px] text-white/40">📥 输入</span>
              </div>
              <div className="space-y-1.5">
                {buildingData.inputs.length === 0 ? (
                  <span className="text-[10px] text-green-400/80">无需原料</span>
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
                <span className="text-[10px] text-white/40">📤 输出</span>
              </div>
              <div className="space-y-1">
                {buildingData.outputs.slice(0, 3).map((output) => (
                  <div key={output.goodsId} className="flex items-center gap-1">
                    <GoodsIcon goodsId={output.goodsId} size={12} />
                    <span className="text-xs text-green-400 tabular-nums font-medium">
                      +{output.dailyAmount.toFixed(0)}/日
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-white/[0.06] bg-black/10">
        <BuildingProductionControlInline buildingId={buildingIndex} />
      </div>
      
      {/* 生产方式槽位 */}
      <div className="px-4 py-2 border-t border-white/[0.06]">
        <ProductionMethodsPanel
          buildingId={buildingIndex}
          buildingTypeId={buildingData.typeId}
          buildingLevel={buildingData.level}
        />
      </div>
      
      {/* 底部操作栏 - 毛玻璃渐变 */}
      <div className="px-4 py-3 border-t border-white/[0.06] bg-gradient-to-r from-black/30 to-black/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">💰</span>
          <span className={`text-sm font-semibold tabular-nums ${
            buildingData.dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {formatMoney(buildingData.dailyProfit)}/日
          </span>
        </div>
        
        <Button
          size="xs"
          variant={buildingData.canUpgrade ? 'primary' : 'glass'}
          disabled={!buildingData.canUpgrade}
          onClick={handleUpgrade}
        >
          {buildingData.level >= buildingData.maxLevel
            ? '满级'
            : `升级 ${formatMoney(buildingData.upgradeCost)}`
          }
        </Button>
      </div>
    </Card>
  );
};

export default BuildingCard;
