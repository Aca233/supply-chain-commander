/**
 * 生产统计数据 hook
 * 从 ProductionOverview 中提取的纯数据计算
 */

import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import { calculateBuildingDailyAmount, calculateBuildingFinancialEstimate } from './BuildingFinancialEstimate';
import { calculateBuildingDefinitionOperatingCostPerTick } from '@/core/finance/OperatingCostModel';
import { calculateBuildingDailyPayrollCost } from '@/core/labor/LaborSystem';

export interface ProductionStats {
  periodOutput: number;
  activeBuildings: number;
  totalBuildings: number;
  bottleneckCount: number;
  periodProfit: number;
  avgEfficiency: number;
}

export function useProductionStats(): ProductionStats {
  const { getWorld, tick } = useGameStore();

  return useMemo(() => {
    const world = getWorld();
    if (!world) {
      return {
        periodOutput: 0, activeBuildings: 0, totalBuildings: 0,
        bottleneckCount: 0, periodProfit: 0, avgEfficiency: 0,
      };
    }

    let totalOutput = 0;
    let activeCount = 0;
    let totalBuildings = 0;
    let bottleneckCount = 0;
    let totalEfficiency = 0;
    let dailyCost = 0;
    let dailyRevenue = 0;

    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] !== 0) continue;
      totalBuildings++;

      const isActive = world.buildings.isActive[i];
      const efficiency = world.buildings.efficiencies[i];
      const typeId = world.buildings.types[i];
      const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
      const outputEstimates: Array<{ dailyAmount: number; price: number }> = [];

      if (isActive) {
        activeCount++;
        totalEfficiency += efficiency;

        const production = getBuildingRecipeFromInstance(world, i);
        const ticksRequired = production.ticksRequired || 1;

        for (const output of production.outputs) {
          const goods = ALL_GOODS.find(g => g.id === output.goodsId);
          if (goods) {
            const dailyAmount = calculateBuildingDailyAmount(output.amount, ticksRequired, efficiency);
            const price = world.goods.prices[output.goodsId] || goods.basePrice;
            totalOutput += dailyAmount * price;
            outputEstimates.push({ dailyAmount, price });
          }
        }

        // 检查瓶颈
        const inputs = production.inputs;
        for (let j = 0; j < inputs.length; j++) {
          if (world.buildings.inputBuffers[i * 8 + j] < inputs[j].amount) {
            bottleneckCount++;
            break;
          }
        }
      }

      if (buildingDef) {
        const operatingCost = calculateBuildingDefinitionOperatingCostPerTick(buildingDef);
        const buildingDailyCost = operatingCost.cashExpense - operatingCost.labor;
        const estimate = calculateBuildingFinancialEstimate({
          isActive: Boolean(isActive),
          dailyCost: buildingDailyCost,
          laborCost: isActive ? calculateBuildingDailyPayrollCost(world, i) : 0,
          outputs: outputEstimates,
        });
        dailyCost += estimate.dailyCost;
        dailyRevenue += estimate.dailyRevenue;
      }
    }

    return {
      periodOutput: totalOutput,
      activeBuildings: activeCount,
      totalBuildings,
      bottleneckCount,
      periodProfit: dailyRevenue - dailyCost,
      avgEfficiency: activeCount > 0 ? totalEfficiency / activeCount : 0,
    };
  }, [getWorld, tick]);
}
