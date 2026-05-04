/**
 * 供给曲线与边际成本系统
 * 实现企业的成本结构和利润最大化产量决策
 *
 * v4.0更新：使用getBuildingProduction替代RECIPES
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT } from '@/core/constants';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import {
  calculateBuildingOutputUnitEconomics,
  calculateBuildingProductionEconomics,
} from './ProductionEconomics';

/**
 * 成本结构
 */
export interface CostStructure {
  fixedCost: number;           // 固定成本（建筑维护、管理费用）
  variableCost: number;        // 可变成本（原材料、能源）
  totalCost: number;           // 总成本
  averageCost: number;         // 平均成本
  marginalCost: number;        // 边际成本
  laborCost: number;           // 劳动力成本
  materialCost: number;        // 原材料成本
  energyCost: number;          // 能源成本
}

/**
 * 供给决策结果
 */
export interface SupplyDecision {
  optimalQuantity: number;     // 最优产量
  expectedProfit: number;      // 预期利润
  breakEvenPrice: number;      // 盈亏平衡价格
  marginalCostAtOptimal: number; // 最优产量处的边际成本
  profitMargin: number;        // 利润率
}

/**
 * 边际成本曲线参数
 * MC = a + b*Q + c*Q^2
 * 这是一个典型的U形边际成本曲线
 */
export interface MarginalCostParams {
  a: number;  // 常数项（最低边际成本的基础）
  b: number;  // 线性项系数（通常为负，表示初始规模经济）
  c: number;  // 二次项系数（正数，表示边际成本递增）
  minQuantity: number;  // 最低有效产量
  maxQuantity: number;  // 最大产能
}

/**
 * 计算建筑的成本结构
 * v4.0更新：使用getBuildingProduction替代RECIPES
 */
export function calculateCostStructure(
  world: GameWorld,
  buildingId: number,
  quantity: number
): CostStructure {
  const economics = calculateBuildingProductionEconomics(world, buildingId);
  const production = getBuildingRecipeFromInstance(world, buildingId);
  const safeQuantity = Math.max(0, Number.isFinite(quantity) ? quantity : 0);

  if (!production) {
    return {
      fixedCost: 0,
      variableCost: 0,
      totalCost: 0,
      averageCost: 0,
      marginalCost: 0,
      laborCost: 0,
      materialCost: 0,
      energyCost: 0,
    };
  }

  // 这里的 quantity 表示“配方日批次数”的倍率。维护与工资按日固定成本处理；
  // 原料和能耗随批次数变化，避免重复使用旧的 sqrt(quantity) 工资估算。
  const fixedCost = economics.maintenanceCost + economics.wageCost;
  const materialCost = economics.inputCost * safeQuantity;
  const energyCost = economics.energyCost * safeQuantity;
  const laborCost = economics.wageCost;
  const variableCost = materialCost + energyCost;
  const totalCost = fixedCost + variableCost;
  const averageCost = safeQuantity > 0 ? totalCost / safeQuantity : 0;
  const marginalCost = economics.inputCost + economics.energyCost;

  return {
    fixedCost,
    variableCost,
    totalCost,
    averageCost,
    marginalCost,
    laborCost,
    materialCost,
    energyCost,
  };
}

/**
 * 获取边际成本曲线参数
 *
 * v4.0更新：使用getBuildingProduction替代RECIPES
 *
 * 修复说明：
 * 1. 提高最大产能（从50提升到200）
 * 2. 调整边际成本曲线使其更加平缓
 * 3. 根据建筑类型和生产配置调整参数
 * 4. 添加规模经济效应
 */
export function getMarginalCostParams(
  world: GameWorld,
  buildingId: number
): MarginalCostParams {
  const production = getBuildingRecipeFromInstance(world, buildingId);

  if (production.outputs.length === 0) {
    return { a: 10, b: -0.05, c: 0.0005, minQuantity: 0, maxQuantity: 200 };
  }

  const primaryOutput = production.outputs[0];
  const unitEconomics = calculateBuildingOutputUnitEconomics(world, buildingId, primaryOutput.goodsId);
  const efficiency = world.buildings.efficiencies[buildingId] || 1.0;
  const level = Math.max(1, world.buildings.levels[buildingId] || 1);
  const levelCapacityMultiplier = 1 + (level - 1) * 0.25;
  const maxQuantity = Math.max(0, unitEconomics.outputAmount * efficiency * levelCapacityMultiplier);
  const breakEven = Number.isFinite(unitEconomics.breakEvenPrice)
    ? Math.max(0.01, unitEconomics.breakEvenPrice)
    : 10;
  const capacity = Math.max(1, maxQuantity);
  const a = breakEven * 0.95;
  const b = -(breakEven * 0.05) / capacity;
  const c = (breakEven * 0.10) / (capacity * capacity);

  return {
    a,
    b,
    c,
    minQuantity: 0,
    maxQuantity,
  };
}

/**
 * 计算给定产量下的边际成本
 */
export function calculateMarginalCost(
  params: MarginalCostParams,
  quantity: number
): number {
  const { a, b, c } = params;
  return Math.max(0, a + b * quantity + c * quantity * quantity);
}

/**
 * 计算利润最大化的最优产量
 * 在完全竞争市场中，最优产量满足 MC = P（边际成本等于价格）
 */
export function calculateOptimalQuantity(
  world: GameWorld,
  buildingId: number,
  outputGoodsId: number
): SupplyDecision {
  const unitEconomics = calculateBuildingOutputUnitEconomics(world, buildingId, outputGoodsId);
  if (unitEconomics.outputAmount <= 0 || !Number.isFinite(unitEconomics.breakEvenPrice)) {
    return {
      optimalQuantity: 0,
      expectedProfit: 0,
      breakEvenPrice: Number.POSITIVE_INFINITY,
      marginalCostAtOptimal: Number.POSITIVE_INFINITY,
      profitMargin: 0,
    };
  }

  const marketPrice = world.goods.prices[outputGoodsId];
  const mcParams = getMarginalCostParams(world, buildingId);
  const breakEvenPrice = unitEconomics.breakEvenPrice;
  const maxQuantity = mcParams.maxQuantity;

  let optimalQuantity = 0;
  if (marketPrice > breakEvenPrice * 0.65) {
    const profitSignal = (marketPrice - breakEvenPrice) / Math.max(1, breakEvenPrice);
    const utilization = Math.max(0, Math.min(1, 0.55 + profitSignal * 0.75));
    optimalQuantity = maxQuantity * utilization;
  }

  const marginalCostAtOptimal = calculateMarginalCost(mcParams, optimalQuantity);
  const expectedProfit = (marketPrice - breakEvenPrice) * optimalQuantity;
  const revenue = marketPrice * optimalQuantity;
  const profitMargin = revenue > 0 ? expectedProfit / revenue : 0;

  return {
    optimalQuantity,
    expectedProfit,
    breakEvenPrice,
    marginalCostAtOptimal,
    profitMargin,
  };
}

/**
 * 计算市场总供给曲线
 * 返回给定价格下的市场总供给量
 * v4.0更新：使用getBuildingProduction替代RECIPES
 */
export function calculateMarketSupply(
  world: GameWorld,
  goodsId: number,
  price: number
): number {
  let totalSupply = 0;
  
  // 遍历所有生产该商品的建筑
  for (let i = 0; i < world.buildings.count; i++) {
    const production = getBuildingRecipeFromInstance(world, i);

    if (production.outputs.length === 0) continue;

    // 检查是否生产目标商品
    const outputs = production.outputs;
    const producesGoods = outputs.some(o => o.goodsId === goodsId);
    if (!producesGoods) continue;
    
    // 临时设置价格来计算供给
    const originalPrice = world.goods.prices[goodsId];
    world.goods.prices[goodsId] = price;
    
    const decision = calculateOptimalQuantity(world, i, goodsId);
    totalSupply += decision.optimalQuantity;
    
    // 恢复原价格
    world.goods.prices[goodsId] = originalPrice;
  }
  
  return totalSupply;
}

/**
 * 生成供给曲线数据点（用于图表显示）
 */
export function generateSupplyCurve(
  world: GameWorld,
  goodsId: number,
  priceRange: { min: number; max: number },
  points: number = 20
): Array<{ price: number; quantity: number }> {
  const curve: Array<{ price: number; quantity: number }> = [];
  const step = (priceRange.max - priceRange.min) / (points - 1);
  
  for (let i = 0; i < points; i++) {
    const price = priceRange.min + step * i;
    const quantity = calculateMarketSupply(world, goodsId, price);
    curve.push({ price, quantity });
  }
  
  return curve;
}

/**
 * 计算企业的成本曲线数据
 */
export function generateCostCurves(
  world: GameWorld,
  buildingId: number,
  maxQuantity: number = 100
): {
  quantities: number[];
  totalCosts: number[];
  averageCosts: number[];
  marginalCosts: number[];
} {
  const quantities: number[] = [];
  const totalCosts: number[] = [];
  const averageCosts: number[] = [];
  const marginalCosts: number[] = [];
  
  for (let q = 1; q <= maxQuantity; q += 5) {
    const cost = calculateCostStructure(world, buildingId, q);
    quantities.push(q);
    totalCosts.push(cost.totalCost);
    averageCosts.push(cost.averageCost);
    marginalCosts.push(cost.marginalCost);
  }
  
  return { quantities, totalCosts, averageCosts, marginalCosts };
}
