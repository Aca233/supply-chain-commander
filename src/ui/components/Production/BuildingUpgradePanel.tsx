/**
 * 建筑升级面板组件
 * 显示详细的升级信息、材料需求和升级后属性变化
 */

import React, { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_BUILDINGS } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { getBaseMaterials } from '@/data/buildingMaterials';
import { GoodsIcon, BuildingIcon } from '@/ui/components/Icons';
import { GOODS_COUNT } from '@/core/constants';
import {
  Button,
  Card,
  Badge,
  ProgressBar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/ui/design-system';

interface BuildingUpgradePanelProps {
  buildingIndex: number;
  onUpgradeComplete?: () => void;
}

interface MaterialStatus {
  goodsId: number;
  name: string;
  required: number;
  available: number;
  missing: number;
  marketPrice: number;
  estimatedCost: number;
}

interface UpgradePreview {
  currentLevel: number;
  targetLevel: number;
  upgradeCost: number;
  materialCost: number;
  totalCost: number;
  materials: MaterialStatus[];
  allMaterialsAvailable: boolean;
  capacityChange: { before: number; after: number; delta: number };
  efficiencyChange: { before: number; after: number; delta: number };
  buildTime: number;
  canAfford: boolean;
}

export const BuildingUpgradePanel: React.FC<BuildingUpgradePanelProps> = ({
  buildingIndex,
  onUpgradeComplete,
}) => {
  const { getWorld, playerCash, upgradeBuilding } = useGameStore();
  const world = getWorld();

  const upgradePreview = useMemo((): UpgradePreview | null => {
    if (!world) return null;

    const typeId = world.buildings.types[buildingIndex];
    const currentLevel = world.buildings.levels[buildingIndex];
    const buildingDef = ALL_BUILDINGS.find((b) => b.id === typeId);

    if (!buildingDef) return null;
    if (currentLevel >= buildingDef.maxLevel) return null;

    const targetLevel = currentLevel + 1;
    const upgradeCost = buildingDef.upgradeCosts[currentLevel] || buildingDef.buildCost * 0.5;

    // 获取升级材料需求（建造材料的50%）
    const baseMaterials = getBaseMaterials(typeId);
    const upgradeMaterials = baseMaterials.map((mat) => ({
      goodsId: mat.goodsId,
      amount: Math.ceil(mat.amount * 0.5),
    }));

    // 计算材料状态
    const playerCompanyId = 0;
    let totalMaterialCost = 0;
    const materials: MaterialStatus[] = [];

    for (const mat of upgradeMaterials) {
      const inventoryIdx = playerCompanyId * GOODS_COUNT + mat.goodsId;
      const available = world.companies.inventories[inventoryIdx] || 0;
      const missing = Math.max(0, mat.amount - available);
      const marketPrice = world.goods.prices[mat.goodsId] || 100;
      const estimatedCost = missing * marketPrice * 1.1; // 10%溢价
      totalMaterialCost += estimatedCost;

      const goods = ALL_GOODS.find((g) => g.id === mat.goodsId);
      materials.push({
        goodsId: mat.goodsId,
        name: goods?.name || `商品#${mat.goodsId}`,
        required: mat.amount,
        available,
        missing,
        marketPrice,
        estimatedCost,
      });
    }

    const totalCost = upgradeCost + totalMaterialCost;
    const allMaterialsAvailable = materials.every((m) => m.missing === 0);

    // 计算属性变化
    const currentCapacityIdx = Math.min(currentLevel - 1, buildingDef.capacityMultipliers.length - 1);
    const targetCapacityIdx = Math.min(targetLevel - 1, buildingDef.capacityMultipliers.length - 1);
    const currentEfficiencyIdx = Math.min(currentLevel - 1, buildingDef.efficiencyMultipliers.length - 1);
    const targetEfficiencyIdx = Math.min(targetLevel - 1, buildingDef.efficiencyMultipliers.length - 1);

    const capacityBefore = buildingDef.capacityMultipliers[currentCapacityIdx];
    const capacityAfter = buildingDef.capacityMultipliers[targetCapacityIdx];
    const efficiencyBefore = buildingDef.efficiencyMultipliers[currentEfficiencyIdx];
    const efficiencyAfter = buildingDef.efficiencyMultipliers[targetEfficiencyIdx];

    // 估算建造时间（升级时间为建造时间的50%）
    const buildTime = Math.ceil(buildingDef.buildTime * 0.5);

    return {
      currentLevel,
      targetLevel,
      upgradeCost,
      materialCost: totalMaterialCost,
      totalCost,
      materials,
      allMaterialsAvailable,
      capacityChange: {
        before: capacityBefore,
        after: capacityAfter,
        delta: capacityAfter - capacityBefore,
      },
      efficiencyChange: {
        before: efficiencyBefore,
        after: efficiencyAfter,
        delta: efficiencyAfter - efficiencyBefore,
      },
      buildTime,
      canAfford: playerCash >= totalCost,
    };
  }, [world, buildingIndex, playerCash]);

  if (!upgradePreview) {
    return (
      <Card variant="default" status="warning" padding="md" className="text-center">
        <span className="text-[var(--warning)] text-sm">⭐ 已达最高等级</span>
      </Card>
    );
  }

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  const formatPercent = (value: number) => `${((value - 1) * 100).toFixed(0)}%`;

  const handleUpgrade = () => {
    const success = upgradeBuilding(buildingIndex);
    if (success && onUpgradeComplete) {
      onUpgradeComplete();
    }
  };

  return (
    <div className="space-y-4">
      {/* 升级概览 */}
      <Card variant="game" padding="md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="lg">
              Lv.{upgradePreview.currentLevel}
            </Badge>
            <span className="text-[var(--text-muted)]">→</span>
            <Badge variant="success" size="lg">
              Lv.{upgradePreview.targetLevel}
            </Badge>
          </div>
          <Badge variant={upgradePreview.canAfford ? 'success' : 'error'} size="sm">
            {upgradePreview.canAfford ? '资金充足' : '资金不足'}
          </Badge>
        </div>

        {/* 属性变化 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-[var(--bg-muted)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">产能加成</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">
                +{formatPercent(upgradePreview.capacityChange.before)}
              </span>
              <span className="text-[var(--text-muted)]">→</span>
              <span className="text-sm text-[var(--success)] font-medium">
                +{formatPercent(upgradePreview.capacityChange.after)}
              </span>
            </div>
            <div className="text-xs text-[var(--success)] mt-1">
              ▲ +{((upgradePreview.capacityChange.delta) * 100).toFixed(0)}%
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-[var(--bg-muted)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">效率加成</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">
                +{formatPercent(upgradePreview.efficiencyChange.before)}
              </span>
              <span className="text-[var(--text-muted)]">→</span>
              <span className="text-sm text-[var(--success)] font-medium">
                +{formatPercent(upgradePreview.efficiencyChange.after)}
              </span>
            </div>
            <div className="text-xs text-[var(--success)] mt-1">
              ▲ +{((upgradePreview.efficiencyChange.delta) * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* 预计时间 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">⏱️ 预计工期</span>
          <span className="text-[var(--text-primary)] tabular-nums">
            {upgradePreview.buildTime} 小时
          </span>
        </div>
      </Card>

      {/* 费用明细 */}
      <Card variant="elevated" padding="md">
        <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
          💰 费用明细
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">升级工程费</span>
            <span className="text-[var(--text-primary)] tabular-nums">
              {formatMoney(upgradePreview.upgradeCost)}
            </span>
          </div>
          {upgradePreview.materialCost > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">材料采购费（预估）</span>
              <span className="text-[var(--warning)] tabular-nums">
                {formatMoney(upgradePreview.materialCost)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-[var(--border-muted)]">
            <span className="text-[var(--text-secondary)] font-medium">总计</span>
            <span className={`font-medium tabular-nums ${upgradePreview.canAfford ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
              {formatMoney(upgradePreview.totalCost)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">当前余额</span>
            <span className="text-[var(--text-muted)] tabular-nums">
              {formatMoney(playerCash)}
            </span>
          </div>
        </div>
      </Card>

      {/* 材料需求 */}
      {upgradePreview.materials.length > 0 && (
        <Card variant="elevated" padding="md">
          <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
            📦 材料需求
          </h4>
          <div className="space-y-3">
            {upgradePreview.materials.map((mat) => {
              const percentage = Math.min(1, mat.available / mat.required);
              const isComplete = mat.missing === 0;
              
              return (
                <div key={mat.goodsId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GoodsIcon goodsId={mat.goodsId} size={14} />
                      <span className="text-xs text-[var(--text-primary)]">{mat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs tabular-nums ${isComplete ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                        {mat.available.toFixed(0)} / {mat.required.toFixed(0)}
                      </span>
                      {isComplete ? (
                        <Badge variant="success" size="sm">✓</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          缺{mat.missing.toFixed(0)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ProgressBar
                    value={percentage * 100}
                    max={100}
                    size="sm"
                    color={isComplete ? 'success' : 'warning'}
                  />
                  {!isComplete && (
                    <div className="text-[10px] text-[var(--text-muted)]">
                      市价 ¥{mat.marketPrice.toFixed(0)}/单位 · 预计采购费 {formatMoney(mat.estimatedCost)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {!upgradePreview.allMaterialsAvailable && (
            <div className="mt-3 p-2 rounded bg-[var(--bg-muted)] text-xs text-[var(--text-muted)]">
              💡 缺少的材料将自动挂单采购
            </div>
          )}
        </Card>
      )}

      {/* 升级按钮 */}
      <Button
        variant="gradient"
        size="lg"
        fullWidth
        onClick={handleUpgrade}
        disabled={!upgradePreview.canAfford}
      >
        <div className="text-center">
          <div className="font-medium">
            {upgradePreview.canAfford ? '🚀 开始升级' : '💰 资金不足'}
          </div>
          <div className="text-xs opacity-80">
            {formatMoney(upgradePreview.totalCost)} · {upgradePreview.buildTime}小时
          </div>
        </div>
      </Button>

      {/* 升级队列提示 */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        升级任务将加入建造队列，可在队列面板查看进度
      </div>
    </div>
  );
};

/**
 * 升级确认弹窗组件
 */
interface UpgradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingIndex: number;
  onConfirm: () => void;
}

export const UpgradeConfirmDialog: React.FC<UpgradeConfirmDialogProps> = ({
  open,
  onOpenChange,
  buildingIndex,
  onConfirm,
}) => {
  const { getWorld } = useGameStore();
  const world = getWorld();

  const buildingInfo = useMemo(() => {
    if (!world) return null;
    
    const typeId = world.buildings.types[buildingIndex];
    const buildingDef = ALL_BUILDINGS.find((b) => b.id === typeId);
    const level = world.buildings.levels[buildingIndex];
    
    return {
      name: buildingDef?.name || `建筑#${typeId}`,
      level,
      maxLevel: buildingDef?.maxLevel || 5,
      typeId,
    };
  }, [world, buildingIndex]);

  if (!buildingInfo) return null;

  const handleConfirmUpgrade = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" variant="game">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BuildingIcon buildingId={buildingInfo.typeId} size={24} autoColor />
            升级 {buildingInfo.name}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <BuildingUpgradePanel
            buildingIndex={buildingIndex}
            onUpgradeComplete={() => onOpenChange(false)}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default BuildingUpgradePanel;