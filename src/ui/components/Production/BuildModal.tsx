import React, { useState, useMemo } from 'react';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { RECIPES_BY_BUILDING, RecipeDefinition } from '@/data/recipes';
import { ALL_GOODS } from '@/data/goods';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { useGameStore } from '@/stores/gameStore';
import {
  getBuildingConstructionConfig,
  getBaseMaterials,
  getBuildTime,
  MaterialRequirement
} from '@/data/buildingMaterials';

interface BuildModalProps {
  buildingTypeId: number;
  onClose: () => void;
  onConfirm: (buildingTypeId: number, recipeId: number) => void;
}

export const BuildModal: React.FC<BuildModalProps> = ({
  buildingTypeId,
  onClose,
  onConfirm,
}) => {
  const { playerCash, getWorld } = useGameStore();
  const world = getWorld();
  
  const building = useMemo(
    () => ALL_BUILDINGS.find((b) => b.id === buildingTypeId),
    [buildingTypeId]
  );

  const recipes = useMemo(() => {
    return RECIPES_BY_BUILDING.get(buildingTypeId) || [];
  }, [buildingTypeId]);

  // 获取建造材料需求
  const constructionConfig = useMemo(() => {
    return getBuildingConstructionConfig(buildingTypeId);
  }, [buildingTypeId]);

  const requiredMaterials = useMemo(() => {
    return getBaseMaterials(buildingTypeId);
  }, [buildingTypeId]);

  const buildTime = useMemo(() => {
    return getBuildTime(buildingTypeId);
  }, [buildingTypeId]);

  // 检查材料是否充足，并计算购买成本
  const materialCheck = useMemo(() => {
    if (!world || requiredMaterials.length === 0) {
      return { sufficient: true, details: [], totalPurchaseCost: 0, missingMaterials: [] };
    }

    const playerCompanyId = 0; // 玩家公司ID
    const details: Array<{
      goodsId: number;
      name: string;
      required: number;
      available: number;
      missing: number;
      sufficient: boolean;
      marketPrice: number;
      purchaseCost: number;
    }> = [];

    const missingMaterials: Array<{
      goodsId: number;
      amount: number;
      price: number;
    }> = [];

    let allSufficient = true;
    let totalPurchaseCost = 0;

    for (const mat of requiredMaterials) {
      const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
      const inventoryIdx = playerCompanyId * 256 + mat.goodsId; // GOODS_COUNT = 256
      const available = world.companies.inventories[inventoryIdx] || 0;
      const missing = Math.max(0, mat.amount - available);
      const sufficient = available >= mat.amount;
      
      // 获取市场价格
      const marketPrice = world.goods.prices[mat.goodsId] || (goods?.basePrice || 100);
      const purchaseCost = missing * marketPrice * 1.05; // 5%溢价购买
      
      if (!sufficient) {
        allSufficient = false;
        totalPurchaseCost += purchaseCost;
        missingMaterials.push({
          goodsId: mat.goodsId,
          amount: missing,
          price: marketPrice * 1.05,
        });
      }

      details.push({
        goodsId: mat.goodsId,
        name: goods?.name || `商品#${mat.goodsId}`,
        required: mat.amount,
        available,
        missing,
        sufficient,
        marketPrice,
        purchaseCost,
      });
    }

    return { sufficient: allSufficient, details, totalPurchaseCost: Math.floor(totalPurchaseCost), missingMaterials };
  }, [world, requiredMaterials]);

  const isRetail = isRetailBuilding(buildingTypeId);
  
  const [selectedRecipeId, setSelectedRecipeId] = useState<number>(() => {
    if (isRetail) return -1;
    return recipes.length > 0 ? recipes[0].id : -1;
  });

  const [showMaterials, setShowMaterials] = useState(true);

  const [autoPurchase, setAutoPurchase] = useState(true);

  if (!building) return null;

  const canAffordCash = playerCash >= building.buildCost;
  const canAffordMaterials = materialCheck.sufficient;
  
  // 如果开启自动购买，只需检查总费用是否够
  const totalCostWithPurchase = building.buildCost + materialCheck.totalPurchaseCost;
  const canAffordWithPurchase = playerCash >= totalCostWithPurchase;
  
  const canBuild = canAffordCash && (canAffordMaterials || (autoPurchase && canAffordWithPurchase)) && (isRetail || selectedRecipeId !== -1);

  const handleConfirm = () => {
    if (canBuild) {
      // TODO: 如果需要自动购买材料，调用placeBuyOrders
      // 这里只是传递信息给上层处理
      onConfirm(buildingTypeId, isRetail ? -1 : selectedRecipeId);
    }
  };

  const formatMoney = (value: number) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(1)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'extraction': return '采掘';
      case 'processing': return '加工';
      case 'manufacturing': return '制造';
      case 'service': return '服务';
      case 'retail': return '零售';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'extraction': return 'bg-amber-500';
      case 'processing': return 'bg-blue-500';
      case 'manufacturing': return 'bg-green-500';
      case 'service': return 'bg-purple-500';
      case 'retail': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div 
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 
                   shadow-2xl shadow-black/50 w-[640px] max-h-[85vh] overflow-hidden animate-scale-in"
      >
        {/* 头部 */}
        <div className="relative p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-blue-600/10 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 
                       flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/10 to-white/5 
                           flex items-center justify-center shadow-lg">
              <BuildingIcon buildingId={building.id} size={40} autoColor />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-primary mb-1">{building.name}</h2>
              <p className="text-sm text-text-tertiary mb-2">{building.description}</p>
              <div className="flex gap-2">
                <span className={`px-2 py-0.5 text-xs rounded text-white ${getCategoryColor(building.category)}`}>
                  {getCategoryLabel(building.category)}
                </span>
                <span className="px-2 py-0.5 text-xs rounded bg-white/10 text-text-secondary">
                  最高 Lv.{building.maxLevel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)] scrollbar-thin">
          {/* 成本信息 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
              <p className="text-xs text-green-400/80 mb-1">建造费用</p>
              <p className="text-2xl font-bold text-green-400 tabular-nums">
                {formatMoney(building.buildCost)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
              <p className="text-xs text-blue-400/80 mb-1">建造时间</p>
              <p className="text-2xl font-bold text-blue-400 tabular-nums">
                {buildTime} <span className="text-sm font-normal">小时</span>
              </p>
            </div>
          </div>

          {/* 建造材料需求 */}
          {requiredMaterials.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowMaterials(!showMaterials)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧱</span>
                  <span className="text-sm font-medium text-amber-400">建造材料需求</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    materialCheck.sufficient
                      ? 'bg-green-500/20 text-green-400'
                      : autoPurchase
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}>
                    {materialCheck.sufficient ? '材料充足' : autoPurchase ? '将自动采购' : '材料不足'}
                  </span>
                </div>
                <span className="text-text-tertiary text-sm">
                  {showMaterials ? '▼' : '▶'}
                </span>
              </button>
              
              {showMaterials && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {materialCheck.details.map((mat) => (
                    <div
                      key={mat.goodsId}
                      className={`p-3 rounded-lg border transition-colors ${
                        mat.sufficient
                          ? 'bg-white/5 border-white/10'
                          : autoPurchase
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <GoodsIcon goodsId={mat.goodsId} size={16} />
                        <span className="text-xs text-text-primary truncate">{mat.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium tabular-nums ${
                          mat.sufficient ? 'text-text-secondary' : autoPurchase ? 'text-blue-400' : 'text-red-400'
                        }`}>
                          {mat.available.toFixed(0)} / {mat.required.toFixed(0)}
                        </span>
                        {mat.sufficient ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <span className={`text-xs ${autoPurchase ? 'text-blue-400' : 'text-red-400'}`}>
                            {autoPurchase ? `购 ${mat.missing.toFixed(0)}` : `缺 ${mat.missing.toFixed(0)}`}
                          </span>
                        )}
                      </div>
                      {!mat.sufficient && autoPurchase && (
                        <div className="text-[10px] text-text-tertiary mt-1">
                          ≈ {formatMoney(mat.purchaseCost)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* 自动采购开关 */}
              {!materialCheck.sufficient && (
                <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">🛒</span>
                      <span className="text-sm text-blue-400">自动挂单采购缺少材料</span>
                    </div>
                    <div
                      onClick={() => setAutoPurchase(!autoPurchase)}
                      className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                        autoPurchase ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        autoPurchase ? 'left-7' : 'left-1'
                      }`} />
                    </div>
                  </label>
                  
                  {autoPurchase && (
                    <div className="mt-2 pt-2 border-t border-blue-500/20">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-tertiary">采购费用预估</span>
                        <span className="text-blue-400 font-medium tabular-nums">
                          {formatMoney(materialCheck.totalPurchaseCost)}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-tertiary mt-1">
                        * 系统将自动在市场挂买单，以市价+5%购买缺少材料
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 运营成本 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
              <span>💰</span>
              每日运营成本
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                <p className="text-[10px] text-text-tertiary mb-1">维护</p>
                <p className="text-sm font-medium text-text-primary tabular-nums">
                  {formatMoney(building.maintenanceCost)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                <p className="text-[10px] text-text-tertiary mb-1">人力</p>
                <p className="text-sm font-medium text-text-primary tabular-nums">
                  {formatMoney(building.laborCost)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                <p className="text-[10px] text-text-tertiary mb-1">能源</p>
                <p className="text-sm font-medium text-text-primary tabular-nums">
                  {formatMoney(building.energyCost)}
                </p>
              </div>
            </div>
            <div className="mt-2 text-right">
              <span className="text-xs text-text-tertiary">
                总计: <span className="text-text-secondary font-medium">
                  {formatMoney(building.maintenanceCost + building.laborCost + building.energyCost)}/日
                </span>
              </span>
            </div>
          </div>

          {/* 配方选择或零售说明 */}
          {isRetail ? (
            <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🏪</span>
                <span className="text-sm font-medium text-orange-400">零售建筑</span>
              </div>
              <p className="text-sm text-text-secondary mb-3">
                零售建筑用于向消费者销售商品，不需要选择生产配方。
              </p>
              <p className="text-xs text-text-tertiary">
                建造完成后，零售店会自动从批发市场进货并向消费者销售。
              </p>
              {building.retailConfig && (
                <div className="mt-4 pt-4 border-t border-orange-500/20 grid grid-cols-2 gap-3">
                  <div className="text-xs">
                    <span className="text-text-tertiary">库存槽位:</span>
                    <span className="text-text-primary ml-1">{building.retailConfig.maxInventorySlots}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-text-tertiary">每槽容量:</span>
                    <span className="text-text-primary ml-1">{building.retailConfig.inventoryCapacity}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-text-tertiary">每日客流:</span>
                    <span className="text-text-primary ml-1">{building.retailConfig.customerCapacity}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-text-tertiary">加价范围:</span>
                    <span className="text-text-primary ml-1">
                      {(building.retailConfig.markupRange[0] * 100).toFixed(0)}%-
                      {(building.retailConfig.markupRange[1] * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <span>📋</span>
                选择生产配方
              </h4>
              {recipes.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                  {recipes.map((recipe) => {
                    const isSelected = selectedRecipeId === recipe.id;
                    return (
                      <button
                        key={recipe.id}
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10'
                            : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                ✓
                              </span>
                            )}
                            <span className={`font-medium ${isSelected ? 'text-blue-400' : 'text-text-primary'}`}>
                              {recipe.name}
                            </span>
                          </div>
                          <span className="text-xs text-text-tertiary">
                            {recipe.ticksRequired}小时/周期
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {/* 输入 */}
                          <div>
                            <p className="text-[10px] text-text-tertiary mb-2">输入:</p>
                            {recipe.inputs.length === 0 ? (
                              <span className="text-xs text-green-400">无需原料</span>
                            ) : (
                              <div className="space-y-1">
                                {recipe.inputs.map((input) => {
                                  const goods = ALL_GOODS.find((g) => g.id === input.goodsId);
                                  return (
                                    <div key={input.goodsId} className="flex items-center gap-1.5">
                                      <GoodsIcon goodsId={input.goodsId} size={14} />
                                      <span className="text-xs text-red-400">
                                        -{input.amount} {goods?.name || `#${input.goodsId}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {/* 输出 */}
                          <div>
                            <p className="text-[10px] text-text-tertiary mb-2">输出:</p>
                            <div className="space-y-1">
                              {recipe.outputs.map((output) => {
                                const goods = ALL_GOODS.find((g) => g.id === output.goodsId);
                                return (
                                  <div key={output.goodsId} className="flex items-center gap-1.5">
                                    <GoodsIcon goodsId={output.goodsId} size={14} />
                                    <span className="text-xs text-green-400">
                                      +{output.amount} {goods?.name || `#${output.goodsId}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="text-2xl mb-2 block">📭</span>
                  <p className="text-sm text-text-tertiary">此建筑类型没有可用配方</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <div className="text-sm space-y-1">
            {/* 总费用显示 */}
            {!materialCheck.sufficient && autoPurchase ? (
              <div className="text-text-secondary">
                <span className="text-xs text-text-tertiary">总费用: </span>
                <span className={`font-medium ${canAffordWithPurchase ? 'text-green-400' : 'text-red-400'}`}>
                  {formatMoney(totalCostWithPurchase)}
                </span>
              </div>
            ) : (
              canAffordCash ? (
                <span className="text-green-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  资金充足
                </span>
              ) : (
                <span className="text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  资金不足 (差 {formatMoney(building.buildCost - playerCash)})
                </span>
              )
            )}
            {requiredMaterials.length > 0 && (
              canAffordMaterials ? (
                <span className="text-green-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  材料充足
                </span>
              ) : autoPurchase ? (
                canAffordWithPurchase ? (
                  <span className="text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    将自动采购 ({materialCheck.missingMaterials.length} 种材料)
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    资金不足以采购 (差 {formatMoney(totalCostWithPurchase - playerCash)})
                  </span>
                )
              ) : (
                <span className="text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  材料不足
                </span>
              )
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 
                        text-text-secondary hover:text-text-primary transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canBuild}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                canBuild
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              确认建造
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildModal;