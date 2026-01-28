/**
 * 建筑卡片组件
 * 使用设计系统组件重构
 */

import React, { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { RECIPES } from '@/data/recipes';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { CompactResourceBar } from './ResourceBar';
import { ProductionMethodsPanel } from './ProductionMethodsPanel';

// 设计系统组件
import { Card, Badge, Button, ProgressBar } from '@/ui/design-system';

interface BuildingCardProps {
  buildingIndex: number;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

type BuildingStatus = 'active' | 'warning' | 'error' | 'idle';

const statusConfig: Record<BuildingStatus, { variant: 'success' | 'warning' | 'error' | 'outline'; text: string; glow: string }> = {
  active: { variant: 'success', text: '生产中', glow: 'shadow-green-500/20' },
  warning: { variant: 'warning', text: '效率降低', glow: 'shadow-yellow-500/20' },
  error: { variant: 'error', text: '资源不足', glow: 'shadow-red-500/20' },
  idle: { variant: 'outline', text: '已暂停', glow: '' },
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
    // 紧凑模式 - 用于列表视图
    return (
      <Card
        variant="game"
        padding="sm"
        status={buildingData.status === 'active' ? 'success' : buildingData.status === 'warning' ? 'warning' : buildingData.status === 'error' ? 'error' : undefined}
        interactive
        selected={isSelected}
        onClick={onClick}
        className="flex items-center gap-3"
      >
        <BuildingIcon buildingId={buildingData.typeId} size={32} autoColor />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate text-[var(--text-primary)]">{buildingData.name}</span>
            <Badge variant="outline" size="sm">Lv.{buildingData.level}</Badge>
            <Badge variant={config.variant} size="sm">{config.text}</Badge>
          </div>
          <div className="text-xs text-[var(--text-muted)] truncate">{buildingData.recipeName}</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium tabular-nums ${buildingData.dailyProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {formatMoney(buildingData.dailyProfit)}/日
          </div>
          <div className="text-xs text-[var(--text-muted)] tabular-nums">
            效率 {(buildingData.efficiency * 100).toFixed(0)}%
          </div>
        </div>
      </Card>
    );
  }

  // 标准卡片模式
  return (
    <Card
      variant="game"
      padding="none"
      status={buildingData.status === 'active' ? 'success' : buildingData.status === 'warning' ? 'warning' : buildingData.status === 'error' ? 'error' : undefined}
      interactive
      selected={isSelected}
      onClick={onClick}
      className={`overflow-hidden ${config.glow}`}
    >
      {/* 头部 */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center flex-shrink-0">
            <BuildingIcon buildingId={buildingData.typeId} size={32} autoColor />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm truncate text-[var(--text-primary)]">{buildingData.name}</span>
              <Badge variant="outline" size="sm">Lv.{buildingData.level}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config.variant} size="sm">{config.text}</Badge>
              <span className="text-xs text-[var(--text-muted)] truncate">{buildingData.recipeName}</span>
            </div>
          </div>
        </div>
        
        {/* 效率进度条 */}
        <div className="mt-3">
          <ProgressBar
            value={buildingData.efficiency * 100}
            max={100}
            showValue
            label="效率"
            size="sm"
            color={buildingData.efficiency >= 0.8 ? 'success' : buildingData.efficiency >= 0.5 ? 'warning' : 'error'}
          />
        </div>
      </div>
      
      {/* 输入/输出区域 */}
      {!buildingData.isRetail && (
        <div className="px-4 py-3 border-t border-[var(--border-muted)] bg-[var(--bg-subtle)]">
          <div className="grid grid-cols-2 gap-4">
            {/* 输入 */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[10px] text-[var(--text-muted)]">📥 输入</span>
              </div>
              <div className="space-y-1.5">
                {buildingData.inputs.length === 0 ? (
                  <span className="text-[10px] text-[var(--success)]">无需原料</span>
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
                <span className="text-[10px] text-[var(--text-muted)]">📤 输出</span>
              </div>
              <div className="space-y-1">
                {buildingData.outputs.slice(0, 3).map((output) => (
                  <div key={output.goodsId} className="flex items-center gap-1">
                    <GoodsIcon goodsId={output.goodsId} size={12} />
                    <span className="text-xs text-[var(--success)] tabular-nums">
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
      <div className="px-4 py-2 border-t border-[var(--border-muted)]">
        <ProductionMethodsPanel
          buildingId={buildingIndex}
          buildingTypeId={buildingData.typeId}
          buildingLevel={buildingData.level}
        />
      </div>
      
      {/* 底部操作栏 */}
      <div className="px-4 py-3 border-t border-[var(--border-muted)] bg-[var(--bg-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">💰</span>
          <span className={`text-sm font-medium tabular-nums ${
            buildingData.dailyProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
          }`}>
            {formatMoney(buildingData.dailyProfit)}/日
          </span>
        </div>
        
        <Button
          size="xs"
          variant={buildingData.canUpgrade ? 'primary' : 'secondary'}
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
