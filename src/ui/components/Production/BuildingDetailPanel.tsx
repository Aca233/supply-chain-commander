/**
 * 建筑详情面板组件
 * 使用设计系统组件重构
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { RECIPES } from '@/data/recipes';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { ResourceBar } from './ResourceBar';
import { ProductionMethodsPanel } from './ProductionMethodsPanel';
import { SubsidiaryPanel } from './SubsidiaryPanel';
import { UpgradeConfirmDialog } from './BuildingUpgradePanel';
import { getBuildingConstructionConfig, isHazardousBuilding, MaterialRequirement } from '@/data/buildingMaterials';

// 设计系统组件
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

interface BuildingDetailPanelProps {
  buildingIndex: number;
  onClose: () => void;
}

export const BuildingDetailPanel: React.FC<BuildingDetailPanelProps> = ({
  buildingIndex,
  onClose,
}) => {
  const { getWorld, playerCash, upgradeBuilding, toggleBuildingActive, setBuildingRecipe, demolishBuilding, tick, setSelectedGoods, setCurrentPage } = useGameStore();
  const world = getWorld();
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showDemolishModal, setShowDemolishModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const buildingData = useMemo(() => {
    if (!world) return null;

    const typeId = world.buildings.types[buildingIndex];
    const buildingDef = ALL_BUILDINGS.find((b) => b.id === typeId);
    const recipeId = world.buildings.recipeIds[buildingIndex];
    const recipe = RECIPES.find((r) => r.id === recipeId);
    const level = world.buildings.levels[buildingIndex];
    const efficiency = world.buildings.efficiencies[buildingIndex];
    const isActive = world.buildings.isActive[buildingIndex];
    const isRetail = isRetailBuilding(typeId);

    const inputs: Array<{
      goodsId: number;
      name: string;
      current: number;
      required: number;
      percentage: number;
      dailyNeed: number;
    }> = [];

    if (recipe && !isRetail) {
      for (let j = 0; j < recipe.inputs.length; j++) {
        const input = recipe.inputs[j];
        const current = world.buildings.inputBuffers[buildingIndex * 8 + j];
        const required = input.amount;
        const percentage = Math.min(1, current / required);
        const goods = ALL_GOODS.find((g) => g.id === input.goodsId);
        const dailyNeed = (input.amount / recipe.ticksRequired) * 24 * efficiency;

        inputs.push({
          goodsId: input.goodsId,
          name: goods?.name || `#${input.goodsId}`,
          current,
          required,
          percentage,
          dailyNeed,
        });
      }
    }

    const outputs: Array<{
      goodsId: number;
      name: string;
      dailyAmount: number;
      buffer: number;
      price: number;
    }> = [];

    let dailyRevenue = 0;
    if (recipe) {
      for (let j = 0; j < recipe.outputs.length; j++) {
        const output = recipe.outputs[j];
        const goods = ALL_GOODS.find((g) => g.id === output.goodsId);
        const dailyAmount = (output.amount / recipe.ticksRequired) * 24 * efficiency;
        const buffer = world.buildings.outputBuffers[buildingIndex * 8 + j];
        const price = world.goods.prices[output.goodsId] || (goods?.basePrice || 0);
        dailyRevenue += dailyAmount * price;

        outputs.push({
          goodsId: output.goodsId,
          name: goods?.name || `#${output.goodsId}`,
          dailyAmount,
          buffer,
          price,
        });
      }
    }

    const dailyCost = buildingDef
      ? buildingDef.maintenanceCost + buildingDef.laborCost + buildingDef.energyCost
      : 0;

    const maxLevel = buildingDef?.maxLevel || 5;
    const upgradeCost = buildingDef?.upgradeCosts[level] || 0;
    const canUpgrade = level < maxLevel && playerCash >= upgradeCost;
    const nextCapacity = buildingDef?.capacityMultipliers[level] || 1;
    const nextEfficiency = buildingDef?.efficiencyMultipliers[level] || 1;

    let status: 'active' | 'warning' | 'error' | 'idle' = 'active';
    let hasBottleneck = false;
    inputs.forEach((input) => {
      if (input.percentage < 1) hasBottleneck = true;
    });
    if (!isActive) status = 'idle';
    else if (hasBottleneck) status = 'error';
    else if (efficiency < 0.8) status = 'warning';

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
      profitMargin: dailyRevenue > 0 ? ((dailyRevenue - dailyCost) / dailyRevenue) * 100 : 0,
      status,
      upgradeCost,
      canUpgrade,
      nextCapacity,
      nextEfficiency,
      buildingDef,
    };
  }, [world, buildingIndex, playerCash, tick]);

  const demolitionEstimate = useMemo(() => {
    if (!buildingData) return null;

    const config = getBuildingConstructionConfig(buildingData.typeId);
    const buildingDef = buildingData.buildingDef;
    if (!buildingDef) return null;

    const buildCost = buildingDef.buildCost;
    const buildingAge = buildingData.level * 1000;
    const demolitionTime = config ? Math.floor(config.buildTime / 2) : 12;
    const laborCost = buildCost * 0.3;
    const equipmentCost = buildCost * 0.1;
    const isHazardous = isHazardousBuilding(buildingData.typeId);
    const hazardousPenalty = isHazardous ? 0.2 : 0;
    const totalCost = Math.floor((laborCost + equipmentCost) * (1 + hazardousPenalty));
    const levelDepreciation = (buildingData.level - 1) * 0.05;
    const ageDepreciation = buildingAge * 0.00001;
    const depreciationRate = Math.min(levelDepreciation + ageDepreciation, 0.8);
    const recoveryMultiplier = 1 - depreciationRate;

    const recoveredMaterials: MaterialRequirement[] = [];
    if (config) {
      for (const mat of config.baseMaterials) {
        const recoveredAmount = Math.floor(mat.amount * 0.5 * recoveryMultiplier);
        if (recoveredAmount > 0) {
          recoveredMaterials.push({ goodsId: mat.goodsId, amount: recoveredAmount });
        }
      }
    }

    const cashRecovery = Math.floor(buildCost * 0.3 * recoveryMultiplier);
    let materialValue = 0;
    if (world) {
      for (const mat of recoveredMaterials) {
        const price = world.goods.prices[mat.goodsId] || 100;
        materialValue += mat.amount * price * 0.8;
      }
    }
    materialValue = Math.floor(materialValue);

    const totalRecovery = cashRecovery + materialValue;
    const netCost = totalCost - totalRecovery;

    return {
      demolitionTime,
      laborCost: Math.floor(laborCost),
      equipmentCost: Math.floor(equipmentCost),
      totalCost,
      recoveredMaterials,
      cashRecovery,
      materialValue,
      totalRecovery,
      netCost,
      depreciationRate,
      isHazardous,
      canAfford: playerCash >= totalCost,
    };
  }, [buildingData, world, buildingIndex, playerCash]);

  const availableRecipes = useMemo(() => {
    if (!buildingData) return [];
    const buildingDef = ALL_BUILDINGS.find(b => b.id === buildingData.typeId);
    if (!buildingDef) return [];
    return RECIPES.filter(recipe => buildingDef.availableRecipes.includes(recipe.id));
  }, [buildingData]);

  if (!buildingData) return null;

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  const handleUpgrade = () => upgradeBuilding(buildingIndex);
  const handleToggleActive = () => toggleBuildingActive(buildingIndex);
  const handleChangeRecipe = (newRecipeId: number) => {
    setBuildingRecipe(buildingIndex, newRecipeId);
    setShowRecipeModal(false);
  };

  const statusConfig = {
    active: { variant: 'success' as const, text: '🟢 正常生产' },
    warning: { variant: 'warning' as const, text: '🟡 效率降低' },
    error: { variant: 'error' as const, text: '🔴 资源不足' },
    idle: { variant: 'outline' as const, text: '⚪ 已暂停' },
  };

  const status = statusConfig[buildingData.status];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)] border-l border-[var(--border-muted)]">
      {/* 头部 */}
      <div className="p-4 border-b border-[var(--border-muted)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
              <BuildingIcon buildingId={buildingData.typeId} size={24} autoColor />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{buildingData.name}</h3>
              <span className="text-xs text-[var(--text-muted)]">#{buildingIndex}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <Badge variant={status.variant} className="mb-3">{status.text}</Badge>

        <ProgressBar
          value={buildingData.efficiency * 100}
          max={100}
          label="效率"
          showValue
          size="md"
          color={buildingData.efficiency >= 0.8 ? 'success' : buildingData.efficiency >= 0.5 ? 'warning' : 'error'}
        />
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 生产数据 */}
        <Card variant="elevated" padding="md">
          <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
            📊 生产数据
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">日产量</span>
              <span className="text-[var(--text-primary)] tabular-nums">
                {buildingData.outputs.reduce((sum, o) => sum + o.dailyAmount, 0).toFixed(0)} 单位
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">日成本</span>
              <span className="text-[var(--error)] tabular-nums">{formatMoney(buildingData.dailyCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">日收益</span>
              <span className="text-[var(--success)] tabular-nums">{formatMoney(buildingData.dailyRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-[var(--border-muted)]">
              <span className="text-[var(--text-secondary)] font-medium">日利润</span>
              <span className={`font-medium tabular-nums ${buildingData.dailyProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                {formatMoney(buildingData.dailyProfit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">利润率</span>
              <span className="text-[var(--text-primary)] tabular-nums">{buildingData.profitMargin.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        {/* 输入资源 */}
        {!buildingData.isRetail && buildingData.inputs.length > 0 && (
          <Card variant="elevated" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
              📥 输入资源
            </h4>
            <div className="space-y-3">
              {buildingData.inputs.map((input) => (
                <div
                  key={input.goodsId}
                  className="p-2 -mx-2 rounded-lg cursor-pointer hover:bg-[var(--bg-muted)] transition-colors"
                  onClick={() => { setSelectedGoods(input.goodsId); setCurrentPage('market'); }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <GoodsIcon goodsId={input.goodsId} size={14} />
                      <span className="text-xs text-[var(--text-primary)]">{input.name}</span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] tabular-nums">
                      {input.current.toFixed(0)} / {input.required.toFixed(0)}
                    </span>
                  </div>
                  <ResourceBar value={input.percentage} size="sm" />
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">
                    需求: {input.dailyNeed.toFixed(0)}/日
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 输出产品 */}
        {buildingData.outputs.length > 0 && (
          <Card variant="elevated" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
              📤 输出产品
            </h4>
            <div className="space-y-3">
              {buildingData.outputs.map((output) => (
                <div
                  key={output.goodsId}
                  className="flex items-center justify-between p-2 -m-2 rounded-lg cursor-pointer hover:bg-[var(--bg-muted)] transition-colors"
                  onClick={() => { setSelectedGoods(output.goodsId); setCurrentPage('market'); }}
                >
                  <div className="flex items-center gap-2">
                    <GoodsIcon goodsId={output.goodsId} size={16} />
                    <div>
                      <span className="text-xs text-[var(--text-primary)]">{output.name}</span>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        库存: {output.buffer.toFixed(0)} | 市价: {formatMoney(output.price)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="success" size="sm" className="tabular-nums">
                    +{output.dailyAmount.toFixed(0)}/日
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 生产方式 */}
        <Card variant="elevated" padding="md">
          <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
            ⚙️ 生产方式
          </h4>
          <ProductionMethodsPanel
            buildingId={buildingIndex}
            buildingTypeId={buildingData.typeId}
            buildingLevel={buildingData.level}
          />
        </Card>

        {/* 附属设施 */}
        <Card variant="elevated" padding="md">
          <SubsidiaryPanel buildingId={buildingIndex} />
        </Card>
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-[var(--border-muted)] space-y-3">
        {buildingData.level < buildingData.maxLevel && (
          <Button
            variant="gradient"
            size="lg"
            fullWidth
            onClick={() => setShowUpgradeModal(true)}
          >
            <div>
              <div className="font-medium">🚀 升级到 Lv.{buildingData.level + 1}</div>
              <div className="text-xs opacity-80">
                产能: +{((buildingData.nextCapacity - 1) * 100).toFixed(0)}% |
                效率: +{((buildingData.nextEfficiency - 1) * 100).toFixed(0)}%
              </div>
            </div>
          </Button>
        )}

        {buildingData.level >= buildingData.maxLevel && (
          <Card variant="default" status="warning" padding="sm" className="text-center">
            <span className="text-[var(--warning)] text-sm">⭐ 已达最高等级</span>
          </Card>
        )}

        <div className="flex gap-2">
          <Button
            variant={buildingData.isActive ? 'secondary' : 'primary'}
            size="sm"
            className="flex-1"
            onClick={handleToggleActive}
          >
            {buildingData.isActive ? '⏸ 暂停生产' : '▶ 恢复生产'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => setShowRecipeModal(true)}
            disabled={buildingData.isRetail || availableRecipes.length <= 1}
          >
            🔄 更换配方
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => setShowDemolishModal(true)}
          className="text-[var(--error)] hover:bg-red-500/10"
        >
          🗑️ 拆除建筑
        </Button>
      </div>

      {/* 配方选择弹窗 */}
      <Dialog open={showRecipeModal} onOpenChange={setShowRecipeModal}>
        <DialogContent size="md" variant="game">
          <DialogHeader>
            <DialogTitle>选择配方</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            {availableRecipes.map((recipe) => {
              const isCurrentRecipe = recipe.id === buildingData.recipeId;
              return (
                <Card
                  key={recipe.id}
                  variant={isCurrentRecipe ? 'game' : 'elevated'}
                  padding="sm"
                  interactive={!isCurrentRecipe}
                  selected={isCurrentRecipe}
                  onClick={() => !isCurrentRecipe && handleChangeRecipe(recipe.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{recipe.name}</span>
                    {isCurrentRecipe && <Badge variant="primary" size="sm">当前使用</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                      {recipe.inputs.map((input, idx) => (
                        <span key={idx} className="flex items-center gap-0.5">
                          <GoodsIcon goodsId={input.goodsId} size={12} />
                          <span>{input.amount}</span>
                          {idx < recipe.inputs.length - 1 && <span>+</span>}
                        </span>
                      ))}
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                      {recipe.outputs.map((output, idx) => (
                        <span key={idx} className="flex items-center gap-0.5 text-[var(--success)]">
                          <GoodsIcon goodsId={output.goodsId} size={12} />
                          <span>{output.amount}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                    生产周期: {recipe.ticksRequired} tick
                  </div>
                </Card>
              );
            })}
            {availableRecipes.length === 0 && (
              <div className="text-center text-[var(--text-muted)] py-8">暂无可用配方</div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* 拆除确认弹窗 */}
      <Dialog open={showDemolishModal} onOpenChange={setShowDemolishModal}>
        <DialogContent size="lg" variant="game">
          <DialogHeader>
            <DialogTitle className="text-[var(--error)]">🗑️ 确认拆除建筑</DialogTitle>
          </DialogHeader>
          {demolitionEstimate && (
            <DialogBody className="space-y-4">
              <Card variant="default" status="error" padding="sm">
                <p className="text-xs text-[var(--error)]">
                  ⚠️ 拆除操作不可逆！建筑将被永久移除。
                </p>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card variant="elevated" padding="sm">
                  <p className="text-[10px] text-[var(--text-muted)] mb-1">拆除时间</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                    {demolitionEstimate.demolitionTime} 小时
                  </p>
                </Card>
                <Card variant="elevated" padding="sm">
                  <p className="text-[10px] text-[var(--text-muted)] mb-1">折旧率</p>
                  <p className="text-sm font-medium text-[var(--warning)] tabular-nums">
                    {(demolitionEstimate.depreciationRate * 100).toFixed(1)}%
                  </p>
                </Card>
              </div>

              <Card variant="elevated" padding="md">
                <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3">💰 费用明细</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">人工费用</span>
                    <span className="text-[var(--error)] tabular-nums">-¥{demolitionEstimate.laborCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">设备费用</span>
                    <span className="text-[var(--error)] tabular-nums">-¥{demolitionEstimate.equipmentCost.toLocaleString()}</span>
                  </div>
                  {demolitionEstimate.isHazardous && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">危险处理附加</span>
                      <span className="text-[var(--error)] tabular-nums">+20%</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-[var(--border-muted)]">
                    <span className="text-[var(--text-secondary)] font-medium">拆除总成本</span>
                    <span className="text-[var(--error)] font-medium tabular-nums">-¥{demolitionEstimate.totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <Card variant="default" status="success" padding="md">
                <h4 className="text-xs font-medium text-[var(--success)] mb-3">♻️ 回收预估</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">现金回收</span>
                    <span className="text-[var(--success)] tabular-nums">+¥{demolitionEstimate.cashRecovery.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">材料估值</span>
                    <span className="text-[var(--success)] tabular-nums">+¥{demolitionEstimate.materialValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[var(--border-success)]">
                    <span className="text-[var(--text-secondary)] font-medium">预计回收</span>
                    <span className="text-[var(--success)] font-medium tabular-nums">+¥{demolitionEstimate.totalRecovery.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <Card
                variant="default"
                status={demolitionEstimate.netCost > 0 ? 'error' : 'success'}
                padding="md"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[var(--text-primary)]">净成本</span>
                  <span className={`text-xl font-bold tabular-nums ${demolitionEstimate.netCost > 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                    {demolitionEstimate.netCost > 0 ? '-' : '+'}¥{Math.abs(demolitionEstimate.netCost).toLocaleString()}
                  </span>
                </div>
              </Card>
            </DialogBody>
          )}
          <DialogFooter>
            <div className="flex items-center gap-2">
              {demolitionEstimate && (
                <Badge variant={demolitionEstimate.canAfford ? 'success' : 'error'}>
                  {demolitionEstimate.canAfford ? '资金充足' : `需要 ¥${demolitionEstimate.totalCost.toLocaleString()}`}
                </Badge>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowDemolishModal(false)}>取消</Button>
              <Button
                variant="primary"
                onClick={() => { demolishBuilding(buildingIndex); setShowDemolishModal(false); onClose(); }}
                disabled={!demolitionEstimate?.canAfford}
                className="bg-[var(--error)] hover:bg-red-600"
              >
                确认拆除
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 升级确认弹窗 */}
      <UpgradeConfirmDialog
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        buildingIndex={buildingIndex}
        onConfirm={handleUpgrade}
      />
    </div>
  );
};

export default BuildingDetailPanel;
