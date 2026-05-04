/**
 * 建造模态框
 * 使用设计系统组件重构
 */

import React, { useState, useMemo } from 'react';
import { ALL_BUILDINGS, isRetailBuilding, isWarehouseBuilding } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { useGameStore } from '@/stores/gameStore';
import { getBuildingConstructionConfig, getBaseMaterials, getBuildTime } from '@/data/buildingMaterials';
import { calculateBuildingDefinitionOperatingCostPerTick } from '@/core/finance/OperatingCostModel';
import {
  getBuildingProductionVariants,
} from '@/core/production/ProductionMethods';

interface ProductionVariantView {
  methodId: number;
  name: string;
  slotMethods: number[];
  inputs: Array<{ goodsId: number; amount: number }>;
  outputs: Array<{ goodsId: number; amount: number }>;
  ticksRequired: number;
}

// 设计系统组件
import {
  Button,
  Card,
  Badge,
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/ui/design-system';

interface BuildModalProps {
  buildingTypeId: number;
  onClose: () => void;
  onConfirm: (buildingTypeId: number, slotMethods?: number[]) => void;
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

  const variants = useMemo<ProductionVariantView[]>(() => {
    return getBuildingProductionVariants(buildingTypeId)
      .map((variant) => {
        return {
          methodId: variant.methodId,
          name: variant.name,
          slotMethods: variant.slotMethods,
          inputs: variant.recipe.inputs,
          outputs: variant.recipe.outputs,
          ticksRequired: variant.recipe.ticksRequired || 1,
        };
      })
      .filter(
        (variant) => variant.inputs.length > 0 || variant.outputs.length > 0,
      );
  }, [buildingTypeId]);

  const requiredMaterials = useMemo(() => getBaseMaterials(buildingTypeId), [buildingTypeId]);
  const buildTime = useMemo(() => getBuildTime(buildingTypeId), [buildingTypeId]);
  const operatingCost = useMemo(
    () => building ? calculateBuildingDefinitionOperatingCostPerTick(building) : null,
    [building]
  );

  const materialCheck = useMemo(() => {
    if (!world || requiredMaterials.length === 0) {
      return { sufficient: true, details: [], totalPurchaseCost: 0, missingMaterials: [] };
    }

    const details: Array<{
      goodsId: number;
      name: string;
      required: number;
      available: number;
      missing: number;
      sufficient: boolean;
      purchaseCost: number;
    }> = [];

    const missingMaterials: Array<{ goodsId: number; amount: number; price: number }> = [];
    let allSufficient = true;
    let totalPurchaseCost = 0;

    for (const mat of requiredMaterials) {
      const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
      const inventoryIdx = 0 * 256 + mat.goodsId;
      const available = world.companies.inventories[inventoryIdx] || 0;
      const missing = Math.max(0, mat.amount - available);
      const sufficient = available >= mat.amount;
      const marketPrice = world.goods.prices[mat.goodsId] || (goods?.basePrice || 100);
      const purchaseCost = missing * marketPrice * 1.1;
      
      if (!sufficient) {
        allSufficient = false;
        totalPurchaseCost += purchaseCost;
        missingMaterials.push({ goodsId: mat.goodsId, amount: missing, price: marketPrice * 1.1 });
      }

      details.push({
        goodsId: mat.goodsId,
        name: goods?.name || `商品#${mat.goodsId}`,
        required: mat.amount,
        available,
        missing,
        sufficient,
        purchaseCost,
      });
    }

    return { sufficient: allSufficient, details, totalPurchaseCost: Math.floor(totalPurchaseCost), missingMaterials };
  }, [world, requiredMaterials]);

  const isRetail = isRetailBuilding(buildingTypeId);
  const isWarehouse = isWarehouseBuilding(buildingTypeId);
  
  const [selectedMethodId, setSelectedMethodId] = useState<number>(() => {
    if (isRetail) return 0;
    return variants.length > 0 ? variants[0].methodId : 0;
  });

  const [showMaterials, setShowMaterials] = useState(true);
  const [autoPurchase, setAutoPurchase] = useState(true);

  if (!building) return null;

  const canAffordMaterials = materialCheck.sufficient;
  const totalCostWithPurchase = materialCheck.totalPurchaseCost;
  const canAffordWithPurchase = playerCash >= totalCostWithPurchase;
  const canBuild = (canAffordMaterials || (autoPurchase && canAffordWithPurchase)) && (isRetail || isWarehouse || variants.length > 0);

  const handleConfirm = () => {
    if (!canBuild) return;
    const selectedVariant = variants.find((variant) => variant.methodId === selectedMethodId);
    onConfirm(buildingTypeId, selectedVariant ? [...selectedVariant.slotMethods] : undefined);
  };

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  // 获取建筑所属产业链
  const getBuildingIndustry = (buildingId: number): { name: string; variant: 'warning' | 'info' | 'success' | 'primary' | 'outline' | 'error' } => {
    const industries: Record<string, { ids: number[]; name: string; variant: 'warning' | 'info' | 'success' | 'primary' | 'outline' | 'error' }> = {
      mining: { ids: [0, 1, 2, 3, 6, 7, 8], name: '矿业', variant: 'warning' },
      energy: { ids: [4, 5, 17, 39], name: '能源', variant: 'error' },
      agriculture: { ids: [9, 10, 11, 12, 13, 14], name: '农林牧渔', variant: 'success' },
      food: { ids: [23, 24, 25], name: '食品', variant: 'warning' },
      chemical: { ids: [18, 19, 20, 21], name: '化工建材', variant: 'info' },
      metallurgy: { ids: [15, 16, 26], name: '冶金', variant: 'outline' },
      textile: { ids: [22, 33], name: '纺织家具', variant: 'primary' },
      electronics: { ids: [27, 28, 29, 30], name: '电子科技', variant: 'info' },
      automotive: { ids: [31], name: '汽车', variant: 'primary' },
      appliance: { ids: [32], name: '家电', variant: 'info' },
      newEnergy: { ids: [34], name: '新能源', variant: 'success' },
      pharma: { ids: [35, 36], name: '医药', variant: 'primary' },
      luxury: { ids: [37, 38], name: '奢侈品', variant: 'warning' },
      retail: { ids: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49], name: '零售', variant: 'info' },
      warehouse: { ids: [50, 51, 52, 53, 54], name: '仓储物流', variant: 'primary' },
    };
    
    for (const industry of Object.values(industries)) {
      if (industry.ids.includes(buildingId)) {
        return { name: industry.name, variant: industry.variant };
      }
    }
    return { name: '其他', variant: 'outline' };
  };

  const industryConfig = getBuildingIndustry(building.id);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent size="lg" variant="game">
        <DialogHeader className="bg-gradient-to-r from-blue-600/10 to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center shadow-lg">
              <BuildingIcon buildingId={building.id} size={40} autoColor />
            </div>
            <div className="flex-1">
              <DialogTitle>{building.name}</DialogTitle>
              <p className="text-sm text-[var(--text-muted)] mb-2">{building.description}</p>
              <div className="flex gap-2">
                <Badge variant={industryConfig.variant}>{industryConfig.name}</Badge>
                <Badge variant="outline">最高 Lv.{building.maxLevel}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {/* 成本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <Card variant="default" status="success" padding="md">
              <p className="text-xs text-[var(--success)] mb-1">资产估值</p>
              <p className="text-2xl font-bold text-[var(--success)] tabular-nums">
                {formatMoney(building.buildCost)}
              </p>
            </Card>
            <Card variant="default" status="info" padding="md">
              <p className="text-xs text-[var(--info)] mb-1">建造时间</p>
              <p className="text-2xl font-bold text-[var(--info)] tabular-nums">
                {buildTime} <span className="text-sm font-normal">小时</span>
              </p>
            </Card>
          </div>

          {/* 建造材料需求 */}
          {requiredMaterials.length > 0 && (
            <Card variant="default" status="warning" padding="md">
              <button
                onClick={() => setShowMaterials(!showMaterials)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧱</span>
                  <span className="text-sm font-medium text-[var(--warning)]">建造材料需求</span>
                  <Badge
                    variant={materialCheck.sufficient ? 'success' : autoPurchase ? 'info' : 'error'}
                    size="sm"
                  >
                    {materialCheck.sufficient ? '材料充足' : autoPurchase ? '将自动采购' : '材料不足'}
                  </Badge>
                </div>
                <span className="text-[var(--text-muted)] text-sm">{showMaterials ? '▼' : '▶'}</span>
              </button>
              
              {showMaterials && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {materialCheck.details.map((mat) => (
                    <Card
                      key={mat.goodsId}
                      variant="elevated"
                      padding="sm"
                      status={mat.sufficient ? undefined : autoPurchase ? 'info' : 'error'}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <GoodsIcon goodsId={mat.goodsId} size={16} />
                        <span className="text-xs text-[var(--text-primary)] truncate">{mat.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium tabular-nums ${
                          mat.sufficient ? 'text-[var(--text-secondary)]' : autoPurchase ? 'text-[var(--info)]' : 'text-[var(--error)]'
                        }`}>
                          {mat.available.toFixed(0)} / {mat.required.toFixed(0)}
                        </span>
                        {mat.sufficient ? (
                          <Badge variant="success" size="sm">✓</Badge>
                        ) : (
                          <span className={`text-xs ${autoPurchase ? 'text-[var(--info)]' : 'text-[var(--error)]'}`}>
                            {autoPurchase ? `购 ${mat.missing.toFixed(0)}` : `缺 ${mat.missing.toFixed(0)}`}
                          </span>
                        )}
                      </div>
                      {!mat.sufficient && autoPurchase && (
                        <div className="text-[10px] text-[var(--text-muted)] mt-1">≈ {formatMoney(mat.purchaseCost)}</div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              
              {!materialCheck.sufficient && (
                <Card variant="elevated" padding="sm" className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--info)]">🛒</span>
                      <span className="text-sm text-[var(--info)]">自动采购缺少材料</span>
                    </div>
                    <Switch
                      checked={autoPurchase}
                      onCheckedChange={setAutoPurchase}
                      variant="game"
                    />
                  </div>
                  {autoPurchase && (
                    <div className="mt-2 pt-2 border-t border-[var(--border-muted)]">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">采购费用预估</span>
                        <span className="text-[var(--info)] font-medium tabular-nums">
                          {formatMoney(materialCheck.totalPurchaseCost)}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">* 以市价+10%购买</p>
                    </div>
                  )}
                </Card>
              )}
            </Card>
          )}

          {/* 运营成本 */}
          <Card variant="elevated" padding="md">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
              💰 每日运营成本
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded bg-[var(--bg-muted)]">
                <p className="text-[10px] text-[var(--text-muted)] mb-1">维护</p>
                <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                  {formatMoney(operatingCost?.maintenance ?? 0)}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-[var(--bg-muted)]">
                <p className="text-[10px] text-[var(--text-muted)] mb-1">人力</p>
                <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                  {formatMoney(operatingCost?.labor ?? 0)}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-[var(--bg-muted)]">
                <p className="text-[10px] text-[var(--text-muted)] mb-1">能源</p>
                <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                  {formatMoney(operatingCost?.energy ?? 0)}
                </p>
              </div>
            </div>
            <div className="mt-2 text-right">
              <span className="text-xs text-[var(--text-muted)]">
                总计: <span className="text-[var(--text-secondary)] font-medium">
                  {formatMoney(operatingCost?.total ?? 0)}/日
                </span>
              </span>
            </div>
          </Card>

          {/* 配方选择或零售说明 */}
          {isRetail ? (
            <Card variant="default" status="warning" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🏪</span>
                <span className="text-sm font-medium text-[var(--warning)]">零售建筑</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                零售建筑用于向消费者销售商品，不需要选择生产配方。
              </p>
              {building.retailConfig && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-muted)]">
                  <div className="text-xs">
                    <span className="text-[var(--text-muted)]">库存槽位:</span>
                    <span className="text-[var(--text-primary)] ml-1">{building.retailConfig.maxInventorySlots}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-[var(--text-muted)]">每槽容量:</span>
                    <span className="text-[var(--text-primary)] ml-1">{building.retailConfig.inventoryCapacity}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-[var(--text-muted)]">每日客流:</span>
                    <span className="text-[var(--text-primary)] ml-1">{building.retailConfig.customerCapacity}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-[var(--text-muted)]">加价范围:</span>
                    <span className="text-[var(--text-primary)] ml-1">
                      {(building.retailConfig.markupRange[0] * 100).toFixed(0)}%-{(building.retailConfig.markupRange[1] * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </Card>
          ) : variants.length > 1 ? (
            <div>
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
                📋 选择生产模式
              </h4>
              <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin pr-1">
                {variants.map((variant) => {
                  const isSelected = selectedMethodId === variant.methodId;
                  return (
                    <Card
                      key={variant.methodId}
                      variant={isSelected ? 'game' : 'elevated'}
                      padding="md"
                      interactive
                      selected={isSelected}
                      onClick={() => setSelectedMethodId(variant.methodId)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isSelected && <Badge variant="success" size="sm">✓</Badge>}
                          <span className={`font-medium ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                            {variant.name}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{variant.ticksRequired || 1}h/周期</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] mb-2">输入:</p>
                          {(!variant.inputs || variant.inputs.length === 0) ? (
                            <span className="text-xs text-[var(--success)]">无需原料</span>
                          ) : (
                            <div className="space-y-1">
                              {variant.inputs.map((input) => {
                                const goods = ALL_GOODS.find((g) => g.id === input.goodsId);
                                return (
                                  <div key={input.goodsId} className="flex items-center gap-1.5">
                                    <GoodsIcon goodsId={input.goodsId} size={14} />
                                    <span className="text-xs text-[var(--error)]">
                                      -{input.amount} {goods?.name || `#${input.goodsId}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] mb-2">输出:</p>
                          <div className="space-y-1">
                            {variant.outputs.map((output) => {
                              const goods = ALL_GOODS.find((g) => g.id === output.goodsId);
                              return (
                                <div key={output.goodsId} className="flex items-center gap-1.5">
                                  <GoodsIcon goodsId={output.goodsId} size={14} />
                                  <span className="text-xs text-[var(--success)]">
                                    +{output.amount} {goods?.name || `#${output.goodsId}`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : variants.length === 1 ? (
            <Card variant="default" status="info" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚙️</span>
                <span className="text-sm font-medium text-[var(--info)]">生产模式</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                {variants[0].name}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--border-muted)]">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] mb-2">输入:</p>
                  {(!variants[0].inputs || variants[0].inputs.length === 0) ? (
                    <span className="text-xs text-[var(--success)]">无需原料</span>
                  ) : (
                    <div className="space-y-1">
                      {variants[0].inputs.map((input) => {
                        const goods = ALL_GOODS.find((g) => g.id === input.goodsId);
                        return (
                          <div key={input.goodsId} className="flex items-center gap-1.5">
                            <GoodsIcon goodsId={input.goodsId} size={14} />
                            <span className="text-xs text-[var(--error)]">
                              -{input.amount} {goods?.name || `#${input.goodsId}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] mb-2">输出:</p>
                  <div className="space-y-1">
                    {variants[0].outputs.map((output) => {
                      const goods = ALL_GOODS.find((g) => g.id === output.goodsId);
                      return (
                        <div key={output.goodsId} className="flex items-center gap-1.5">
                          <GoodsIcon goodsId={output.goodsId} size={14} />
                          <span className="text-xs text-[var(--success)]">
                            +{output.amount} {goods?.name || `#${output.goodsId}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          ) : isWarehouse && building.warehouseConfig ? (
            <Card variant="default" status="info" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📦</span>
                <span className="text-sm font-medium text-[var(--info)]">仓储功能</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">存储容量</span>
                  <span className="text-[var(--text-primary)] font-medium">{building.warehouseConfig.storageCapacity.toLocaleString()} 单位</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">仓储费率</span>
                  <span className="text-[var(--text-primary)] font-medium">¥{building.warehouseConfig.storageCostPerUnit}/单位/天</span>
                </div>
                {building.warehouseConfig.spoilageReduction > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">损耗降低</span>
                    <span className="text-[var(--success)] font-medium">-{(building.warehouseConfig.spoilageReduction * 100).toFixed(0)}%</span>
                  </div>
                )}
                {building.warehouseConfig.allowedGoodsCategories.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">限定品类</span>
                    <span className="text-[var(--warning)] font-medium">
                      {building.warehouseConfig.allowedGoodsCategories.map(c => {
                        const names: Record<string, string> = { raw: '原料', basic: '基础品', intermediate: '中间品', final: '成品' };
                        return names[c] || c;
                      }).join('、')}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card variant="elevated" padding="lg" className="text-center">
              <span className="text-2xl mb-2 block">📭</span>
              <p className="text-sm text-[var(--text-muted)]">此建筑类型没有可用生产模式</p>
            </Card>
          )}
        </DialogBody>

        <DialogFooter>
          <div className="flex items-center gap-2">
            {materialCheck.sufficient ? (
              <Badge variant="success">无需现金预付</Badge>
            ) : autoPurchase ? (
              <Badge variant={canAffordWithPurchase ? 'success' : 'error'}>
                {canAffordWithPurchase
                  ? `采购预留: ${formatMoney(totalCostWithPurchase)}`
                  : `采购差 ${formatMoney(totalCostWithPurchase - playerCash)}`}
              </Badge>
            ) : (
              <Badge variant="error">缺少建材</Badge>
            )}
            {requiredMaterials.length > 0 && (
              <Badge variant={canAffordMaterials ? 'success' : autoPurchase && canAffordWithPurchase ? 'info' : 'error'}>
                {canAffordMaterials ? '材料充足' : autoPurchase ? `采购${materialCheck.missingMaterials.length}种` : '材料不足'}
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button variant="gradient" onClick={handleConfirm} disabled={!canBuild}>确认建造</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuildModal;
