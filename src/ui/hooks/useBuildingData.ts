/**
 * 统一建筑数据 hook
 * 消除 BuildingCard / BuildingDetailPanel / ProductionOverview 中的重复计算
 */

import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import { MAX_INPUTS, MAX_OUTPUTS } from '@/core/constants';
import {
  calculateBuildingDailyAmount,
  calculateBuildingFinancialEstimate,
} from '@/ui/components/Production/BuildingFinancialEstimate';
import { calculateBuildingDefinitionOperatingCostPerTick } from '@/core/finance/OperatingCostModel';
import { calculateBuildingDailyPayrollCost } from '@/core/labor/LaborSystem';

// 输入资源视图
export interface InputResourceView {
  goodsId: number;
  name: string;
  current: number;
  required: number;
  percentage: number;
  dailyNeed: number;
}

// 输出产品视图
export interface OutputResourceView {
  goodsId: number;
  name: string;
  dailyAmount: number;
  buffer: number;
  price: number;
}

export type BuildingStatus = 'active' | 'warning' | 'error' | 'idle';

// 建筑视图模型
export interface BuildingViewModel {
  typeId: number;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  efficiency: number;
  isActive: boolean;
  isRetail: boolean;
  productionName: string;
  inputs: InputResourceView[];
  outputs: OutputResourceView[];
  hasBottleneck: boolean;
  dailyRevenue: number;
  dailyCost: number;
  dailyProfit: number;
  profitMargin: number;
  status: BuildingStatus;
  upgradeCost: number;
  canUpgrade: boolean;
  nextCapacity: number;
  nextEfficiency: number;
  buildingDef: ReturnType<typeof ALL_BUILDINGS.find>;
}

/**
 * 获取建筑的完整视图模型
 */
export function useBuildingData(buildingIndex: number): BuildingViewModel | null {
  const { getWorld, playerCash, tick } = useGameStore();

  return useMemo(() => {
    const world = getWorld();
    if (!world) return null;

    const typeId = world.buildings.types[buildingIndex];
    const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
    const production = getBuildingRecipeFromInstance(world, buildingIndex);
    const level = world.buildings.levels[buildingIndex];
    const efficiency = world.buildings.efficiencies[buildingIndex];
    const isActive = world.buildings.isActive[buildingIndex];
    const isRetail = isRetailBuilding(typeId);
    const ticksRequired = production?.ticksRequired || 1;

    // 计算输入资源
    const inputs: InputResourceView[] = [];
    let hasBottleneck = false;

    if (production?.inputs && !isRetail) {
      for (let j = 0; j < production.inputs.length; j++) {
        const input = production.inputs[j];
        const current = world.buildings.inputBuffers[buildingIndex * MAX_INPUTS + j];
        const required = input.amount;
        const percentage = Math.min(1, current / required);
        const goods = ALL_GOODS.find(g => g.id === input.goodsId);
        const dailyNeed = calculateBuildingDailyAmount(input.amount, ticksRequired, efficiency);

        inputs.push({
          goodsId: input.goodsId,
          name: goods?.name || `#${input.goodsId}`,
          current, required, percentage, dailyNeed,
        });
        if (percentage < 1) hasBottleneck = true;
      }
    }

    // 计算输出产品
    const outputs: OutputResourceView[] = [];
    if (production?.outputs) {
      for (let j = 0; j < production.outputs.length; j++) {
        const output = production.outputs[j];
        const goods = ALL_GOODS.find(g => g.id === output.goodsId);
        const dailyAmount = calculateBuildingDailyAmount(output.amount, ticksRequired, efficiency);
        const buffer = world.buildings.outputBuffers[buildingIndex * MAX_OUTPUTS + j];
        const price = world.goods.prices[output.goodsId] || (goods?.basePrice || 0);

        outputs.push({
          goodsId: output.goodsId,
          name: goods?.name || `#${output.goodsId}`,
          dailyAmount, buffer, price,
        });
      }
    }

    // 财务估算
    const operatingCost = buildingDef
      ? calculateBuildingDefinitionOperatingCostPerTick(buildingDef)
      : null;
    const dailyCostValue = operatingCost
      ? operatingCost.cashExpense - operatingCost.labor
      : 0;
    const laborCost = isActive ? calculateBuildingDailyPayrollCost(world, buildingIndex) : 0;
    const financial = calculateBuildingFinancialEstimate({
      isActive: Boolean(isActive),
      dailyCost: dailyCostValue,
      laborCost,
      outputs,
    });

    // 确定状态
    let status: BuildingStatus = 'active';
    if (!isActive) status = 'idle';
    else if (hasBottleneck) status = 'error';
    else if (efficiency < 0.8) status = 'warning';

    // 升级信息
    const maxLevel = buildingDef?.maxLevel || 5;
    const upgradeCost = buildingDef?.upgradeCosts[level] || 0;

    // 生产配置名
    let productionName = isRetail ? '零售' : '无配方';
    if (production.outputs.length > 0) {
      const outputGoods = ALL_GOODS.find(g => g.id === production.outputs[0].goodsId);
      productionName = `生产${outputGoods?.name || '商品'}`;
    } else if (buildingDef) {
      productionName = buildingDef.name;
    }

    return {
      typeId, name: buildingDef?.name || `建筑#${typeId}`,
      description: buildingDef?.description || '',
      level, maxLevel, efficiency,
      isActive: Boolean(isActive), isRetail, productionName,
      inputs, outputs, hasBottleneck,
      dailyRevenue: financial.dailyRevenue,
      dailyCost: financial.dailyCost,
      dailyProfit: financial.dailyProfit,
      profitMargin: financial.dailyRevenue > 0
        ? (financial.dailyProfit / financial.dailyRevenue) * 100
        : 0,
      status, upgradeCost,
      canUpgrade: level < maxLevel && playerCash >= upgradeCost,
      nextCapacity: buildingDef?.capacityMultipliers[level] || 1,
      nextEfficiency: buildingDef?.efficiencyMultipliers[level] || 1,
      buildingDef,
    };
  }, [getWorld, buildingIndex, playerCash, tick]);
}
