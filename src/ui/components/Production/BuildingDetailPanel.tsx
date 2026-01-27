import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { RECIPES } from '@/data/recipes';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { ResourceBar } from './ResourceBar';
import { ProductionMethodsPanel } from './ProductionMethodsPanel';
import { SubsidiaryPanel } from './SubsidiaryPanel';
import { ALL_FACILITIES, FACILITIES_BY_TYPE, getFacilityTypeName, getFacilityTypeIcon } from '@/core/production/Facilities';
import {
  getBuildingConstructionConfig,
  isHazardousBuilding,
  MaterialRequirement
} from '@/data/buildingMaterials';

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

    // 输入资源
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

    // 输出产品
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

    // 日成本
    const dailyCost = buildingDef
      ? buildingDef.maintenanceCost + buildingDef.laborCost + buildingDef.energyCost
      : 0;

    // 升级信息
    const maxLevel = buildingDef?.maxLevel || 5;
    const upgradeCost = buildingDef?.upgradeCosts[level] || 0;
    const canUpgrade = level < maxLevel && playerCash >= upgradeCost;
    const nextCapacity = buildingDef?.capacityMultipliers[level] || 1;
    const nextEfficiency = buildingDef?.efficiencyMultipliers[level] || 1;

    // 状态判断
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

  // 计算拆除预估
  const demolitionEstimate = useMemo(() => {
    if (!buildingData) return null;

    const config = getBuildingConstructionConfig(buildingData.typeId);
    const buildingDef = buildingData.buildingDef;
    if (!buildingDef) return null;

    const buildCost = buildingDef.buildCost;
    // 简化：假设建筑年龄基于等级估算（每级约1000 ticks）
    const buildingAge = buildingData.level * 1000;
    
    // 拆除时间 = 建造时间的一半
    const demolitionTime = config ? Math.floor(config.buildTime / 2) : 12;
    
    // 拆除成本
    const laborCost = buildCost * 0.3;
    const equipmentCost = buildCost * 0.1;
    const isHazardous = isHazardousBuilding(buildingData.typeId);
    const hazardousPenalty = isHazardous ? 0.2 : 0;
    const totalCost = Math.floor((laborCost + equipmentCost) * (1 + hazardousPenalty));

    // 折旧计算
    const levelDepreciation = (buildingData.level - 1) * 0.05;
    const ageDepreciation = buildingAge * 0.00001;
    const depreciationRate = Math.min(levelDepreciation + ageDepreciation, 0.8);
    const recoveryMultiplier = 1 - depreciationRate;

    // 材料回收 (50%)
    const recoveredMaterials: MaterialRequirement[] = [];
    if (config) {
      for (const mat of config.baseMaterials) {
        const recoveredAmount = Math.floor(mat.amount * 0.5 * recoveryMultiplier);
        if (recoveredAmount > 0) {
          recoveredMaterials.push({
            goodsId: mat.goodsId,
            amount: recoveredAmount,
          });
        }
      }
    }

    // 现金回收 (30%)
    const cashRecovery = Math.floor(buildCost * 0.3 * recoveryMultiplier);

    // 材料估值
    let materialValue = 0;
    if (world) {
      for (const mat of recoveredMaterials) {
        const price = world.goods.prices[mat.goodsId] || 100;
        materialValue += mat.amount * price * 0.8; // 80%市价出售
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

  // 获取该建筑类型可用的配方列表
  const availableRecipes = useMemo(() => {
    if (!buildingData) return [];
    const buildingDef = ALL_BUILDINGS.find(b => b.id === buildingData.typeId);
    if (!buildingDef) return [];
    
    return RECIPES.filter(recipe =>
      buildingDef.availableRecipes.includes(recipe.id)
    );
  }, [buildingData]);

  if (!buildingData) return null;

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `¥${(value / 1000).toFixed(1)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  const handleUpgrade = () => {
    upgradeBuilding(buildingIndex);
  };

  const handleToggleActive = () => {
    toggleBuildingActive(buildingIndex);
  };

  const handleChangeRecipe = (newRecipeId: number) => {
    setBuildingRecipe(buildingIndex, newRecipeId);
    setShowRecipeModal(false);
  };

  const statusConfig = {
    active: { color: 'text-green-400', bg: 'bg-green-500/20', text: '🟢 正常生产' },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', text: '🟡 效率降低' },
    error: { color: 'text-red-400', bg: 'bg-red-500/20', text: '🔴 资源不足' },
    idle: { color: 'text-gray-400', bg: 'bg-gray-500/20', text: '⚪ 已暂停' },
  };

  const status = statusConfig[buildingData.status];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-800/50 to-slate-900/80 border-l border-white/10">
      {/* 头部 */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <BuildingIcon buildingId={buildingData.typeId} size={24} autoColor />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{buildingData.name}</h3>
              <span className="text-xs text-text-tertiary">#{buildingIndex}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center 
                       text-text-tertiary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 状态和效率 */}
        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg ${status.bg} mb-3`}>
          <span className={`text-xs ${status.color}`}>{status.text}</span>
        </div>

        <ResourceBar
          value={buildingData.efficiency}
          label="效率"
          showPercentage
          size="lg"
        />
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {/* 生产数据 */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <h4 className="text-xs font-medium text-text-primary mb-3 flex items-center gap-2">
            📊 生产数据
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">日产量</span>
              <span className="text-text-primary tabular-nums">
                {buildingData.outputs.reduce((sum, o) => sum + o.dailyAmount, 0).toFixed(0)} 单位
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">日成本</span>
              <span className="text-red-400 tabular-nums">{formatMoney(buildingData.dailyCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">日收益</span>
              <span className="text-green-400 tabular-nums">{formatMoney(buildingData.dailyRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/5">
              <span className="text-text-secondary font-medium">日利润</span>
              <span className={`font-medium tabular-nums ${
                buildingData.dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatMoney(buildingData.dailyProfit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">利润率</span>
              <span className="text-text-primary tabular-nums">{buildingData.profitMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 输入资源 */}
        {!buildingData.isRetail && buildingData.inputs.length > 0 && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <h4 className="text-xs font-medium text-text-primary mb-3 flex items-center gap-2">
              📥 输入资源
            </h4>
            <div className="space-y-3">
              {buildingData.inputs.map((input) => (
                <div
                  key={input.goodsId}
                  className="p-2 -mx-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setSelectedGoods(input.goodsId);
                    setCurrentPage('market');
                  }}
                  title="点击查看市场交易"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <GoodsIcon goodsId={input.goodsId} size={14} />
                      <span className="text-xs text-text-primary">{input.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary tabular-nums">
                        {input.current.toFixed(0)} / {input.required.toFixed(0)}
                      </span>
                      <span className="text-xs text-text-tertiary">→</span>
                    </div>
                  </div>
                  <ResourceBar value={input.percentage} size="sm" />
                  <div className="text-[10px] text-text-tertiary mt-1">
                    需求: {input.dailyNeed.toFixed(0)}/日
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 输出产品 */}
        {buildingData.outputs.length > 0 && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <h4 className="text-xs font-medium text-text-primary mb-3 flex items-center gap-2">
              📤 输出产品
            </h4>
            <div className="space-y-3">
              {buildingData.outputs.map((output) => (
                <div
                  key={output.goodsId}
                  className="flex items-center justify-between p-2 -m-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setSelectedGoods(output.goodsId);
                    setCurrentPage('market');
                  }}
                  title="点击查看市场交易"
                >
                  <div className="flex items-center gap-2">
                    <GoodsIcon goodsId={output.goodsId} size={16} />
                    <div>
                      <span className="text-xs text-text-primary">{output.name}</span>
                      <div className="text-[10px] text-text-tertiary">
                        库存: {output.buffer.toFixed(0)} | 市价: {formatMoney(output.price)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-400 font-medium tabular-nums">
                      +{output.dailyAmount.toFixed(0)}/日
                    </span>
                    <span className="text-xs text-text-tertiary">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 生产方式 */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <h4 className="text-xs font-medium text-text-primary mb-3 flex items-center gap-2">
            ⚙️ 生产方式
          </h4>
          <ProductionMethodsPanel
            buildingId={buildingIndex}
            buildingTypeId={buildingData.typeId}
            buildingLevel={buildingData.level}
          />
        </div>

        {/* 附属设施 */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <SubsidiaryPanel buildingId={buildingIndex} />
        </div>
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-white/10 space-y-3">
        {/* 升级按钮 */}
        {buildingData.level < buildingData.maxLevel && (
          <button
            onClick={handleUpgrade}
            disabled={!buildingData.canUpgrade}
            className={`w-full p-3 rounded-xl transition-all ${
              buildingData.canUpgrade
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/30'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="text-sm font-medium mb-1">
              升级到 Lv.{buildingData.level + 1}
            </div>
            <div className="text-xs opacity-80">
              费用: {formatMoney(buildingData.upgradeCost)} | 
              产能: +{((buildingData.nextCapacity - 1) * 100).toFixed(0)}% | 
              效率: +{((buildingData.nextEfficiency - 1) * 100).toFixed(0)}%
            </div>
          </button>
        )}

        {buildingData.level >= buildingData.maxLevel && (
          <div className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-600/20 to-transparent 
                         border border-amber-500/30 text-center">
            <span className="text-amber-400 text-sm">⭐ 已达最高等级</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleToggleActive}
            className={`flex-1 py-2 text-xs rounded-lg transition-colors ${
              buildingData.isActive
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30'
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
            }`}
          >
            {buildingData.isActive ? '⏸ 暂停生产' : '▶ 恢复生产'}
          </button>
          <button
            onClick={() => setShowRecipeModal(true)}
            disabled={buildingData.isRetail || availableRecipes.length <= 1}
            className={`flex-1 py-2 text-xs rounded-lg transition-colors ${
              buildingData.isRetail || availableRecipes.length <= 1
                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30'
            }`}
          >
            🔄 更换配方
          </button>
        </div>

        {/* 拆除按钮 */}
        <button
          onClick={() => setShowDemolishModal(true)}
          className="w-full py-2 text-xs rounded-lg transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40"
        >
          🗑️ 拆除建筑
        </button>
      </div>

      {/* 配方选择弹窗 */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] max-h-[500px] bg-slate-800 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">选择配方</h3>
              <button
                onClick={() => setShowRecipeModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center
                           text-text-tertiary hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto scrollbar-thin">
              {availableRecipes.map((recipe) => {
                const isCurrentRecipe = recipe.id === buildingData.recipeId;
                return (
                  <button
                    key={recipe.id}
                    onClick={() => handleChangeRecipe(recipe.id)}
                    disabled={isCurrentRecipe}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      isCurrentRecipe
                        ? 'bg-blue-600/30 border-2 border-blue-500 cursor-default'
                        : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-primary">{recipe.name}</span>
                      {isCurrentRecipe && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/30 text-blue-400 rounded">
                          当前使用
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      {/* 输入 */}
                      <div className="flex items-center gap-1">
                        {recipe.inputs.map((input, idx) => {
                          const goods = ALL_GOODS.find(g => g.id === input.goodsId);
                          return (
                            <span key={idx} className="flex items-center gap-0.5">
                              <GoodsIcon goodsId={input.goodsId} size={12} />
                              <span>{input.amount}</span>
                              {idx < recipe.inputs.length - 1 && <span>+</span>}
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-text-tertiary">→</span>
                      {/* 输出 */}
                      <div className="flex items-center gap-1">
                        {recipe.outputs.map((output, idx) => {
                          const goods = ALL_GOODS.find(g => g.id === output.goodsId);
                          return (
                            <span key={idx} className="flex items-center gap-0.5 text-green-400">
                              <GoodsIcon goodsId={output.goodsId} size={12} />
                              <span>{output.amount}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-text-tertiary">
                      生产周期: {recipe.ticksRequired} tick
                    </div>
                  </button>
                );
              })}
              {availableRecipes.length === 0 && (
                <div className="text-center text-text-tertiary py-8">
                  暂无可用配方
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 拆除确认弹窗 */}
      {showDemolishModal && demolitionEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[480px] bg-slate-800 rounded-xl border border-red-500/30 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-red-500/30 bg-gradient-to-r from-red-600/20 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🗑️</span>
                  <div>
                    <h3 className="text-sm font-semibold text-red-400">确认拆除建筑</h3>
                    <p className="text-xs text-text-tertiary">{buildingData.name} #{buildingIndex}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDemolishModal(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center
                             text-text-tertiary hover:text-text-primary transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* 危险提示 */}
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">
                  ⚠️ 拆除操作不可逆！建筑将被永久移除。
                </p>
              </div>

              {/* 拆除信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-[10px] text-text-tertiary mb-1">拆除时间</p>
                  <p className="text-sm font-medium text-text-primary tabular-nums">
                    {demolitionEstimate.demolitionTime} 小时
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-[10px] text-text-tertiary mb-1">折旧率</p>
                  <p className="text-sm font-medium text-amber-400 tabular-nums">
                    {(demolitionEstimate.depreciationRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* 成本与回收 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-xs font-medium text-text-primary mb-3">💰 费用明细</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">人工费用</span>
                    <span className="text-red-400 tabular-nums">
                      -¥{demolitionEstimate.laborCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">设备费用</span>
                    <span className="text-red-400 tabular-nums">
                      -¥{demolitionEstimate.equipmentCost.toLocaleString()}
                    </span>
                  </div>
                  {demolitionEstimate.isHazardous && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">危险处理附加</span>
                      <span className="text-red-400 tabular-nums">+20%</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-text-secondary font-medium">拆除总成本</span>
                    <span className="text-red-400 font-medium tabular-nums">
                      -¥{demolitionEstimate.totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 回收预估 */}
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <h4 className="text-xs font-medium text-green-400 mb-3">♻️ 回收预估</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">现金回收</span>
                    <span className="text-green-400 tabular-nums">
                      +¥{demolitionEstimate.cashRecovery.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">材料估值 (可出售)</span>
                    <span className="text-green-400 tabular-nums">
                      +¥{demolitionEstimate.materialValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-500/20">
                    <span className="text-text-secondary font-medium">预计回收</span>
                    <span className="text-green-400 font-medium tabular-nums">
                      +¥{demolitionEstimate.totalRecovery.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 回收材料列表 */}
              {demolitionEstimate.recoveredMaterials.length > 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <h4 className="text-xs font-medium text-text-primary mb-3">📦 可回收材料</h4>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto scrollbar-thin">
                    {demolitionEstimate.recoveredMaterials.slice(0, 9).map((mat) => {
                      const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
                      return (
                        <div key={mat.goodsId} className="flex items-center gap-1.5 p-1.5 rounded bg-white/5">
                          <GoodsIcon goodsId={mat.goodsId} size={14} />
                          <span className="text-xs text-text-secondary truncate">
                            {mat.amount} {goods?.name?.slice(0, 4) || `#${mat.goodsId}`}
                          </span>
                        </div>
                      );
                    })}
                    {demolitionEstimate.recoveredMaterials.length > 9 && (
                      <div className="flex items-center justify-center p-1.5 rounded bg-white/5">
                        <span className="text-xs text-text-tertiary">
                          +{demolitionEstimate.recoveredMaterials.length - 9} 更多
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 净成本 */}
              <div className={`p-4 rounded-xl border ${
                demolitionEstimate.netCost > 0
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-green-500/10 border-green-500/30'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text-primary">净成本</span>
                  <span className={`text-xl font-bold tabular-nums ${
                    demolitionEstimate.netCost > 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {demolitionEstimate.netCost > 0 ? '-' : '+'}¥{Math.abs(demolitionEstimate.netCost).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {demolitionEstimate.netCost > 0
                    ? '拆除此建筑将花费您的资金'
                    : '拆除此建筑可获得净收益'}
                </p>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
              <div className="text-sm">
                {demolitionEstimate.canAfford ? (
                  <span className="text-green-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    资金充足
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    资金不足 (需要 ¥{demolitionEstimate.totalCost.toLocaleString()})
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDemolishModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                            text-text-secondary hover:text-text-primary transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    demolishBuilding(buildingIndex);
                    setShowDemolishModal(false);
                    onClose();
                  }}
                  disabled={!demolitionEstimate.canAfford}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    demolitionEstimate.canAfford
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  确认拆除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingDetailPanel;