/**
 * 供给曲线与边际成本系统
 * 实现企业的成本结构和利润最大化产量决策
 *
 * v4.0更新：使用getBuildingProduction替代RECIPES
 */

import { GameWorld } from '@/core/world/GameWorld';
import { getBuildingProduction, BUILDINGS_BY_ID } from '@/data/buildings';
import { GOODS_COUNT } from '@/core/constants';

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
  const buildingTypeId = world.buildings.types[buildingId];
  const outputModeId = world.buildings.outputModeIds[buildingId];
  const production = getBuildingProduction(buildingTypeId, outputModeId);
  const buildingDef = BUILDINGS_BY_ID.get(buildingTypeId);
  
  if (!production || !buildingDef) {
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
  
  // 固定成本：建筑维护费（不随产量变化）
  const fixedCost = 100; // 基础固定成本
  
  // 劳动力成本（半固定，随产量有一定变化）
  const laborRequired = production.laborRequired || 10;
  const laborCost = laborRequired * 0.1 * Math.sqrt(quantity);
  
  // 原材料成本（完全可变）
  let materialCost = 0;
  const inputs = production.inputs || [];
  for (const input of inputs) {
    const price = world.goods.prices[input.goodsId];
    materialCost += price * input.amount * quantity;
  }
  
  // 能源成本（可变）
  const energyPrice = world.goods.prices[57] || 0.5; // 电力价格
  const energyRequired = buildingDef.powerConsumption || 10;
  const energyCost = energyRequired * energyPrice * 0.001 * quantity;
  
  // 可变成本 = 原材料 + 能源 + 劳动力可变部分
  const variableCost = materialCost + energyCost + laborCost;
  
  // 总成本
  const totalCost = fixedCost + variableCost;
  
  // 平均成本（当产量大于0时）
  const averageCost = quantity > 0 ? totalCost / quantity : 0;
  
  // 边际成本计算（基于成本函数的导数）
  // 使用简化的边际成本模型：MC = 材料单位成本 * (1 + 0.1 * Q / capacity)
  // 这模拟了产能接近上限时边际成本上升
  const capacity = 100; // 标准产能
  const baseMaterialCostPerUnit = inputs.reduce((sum, input) => {
    return sum + world.goods.prices[input.goodsId] * input.amount;
  }, 0);
  
  const marginalCost = baseMaterialCostPerUnit * (1 + 0.1 * quantity / capacity)
    + energyRequired * energyPrice * 0.001
    + laborRequired * 0.05 / Math.max(1, Math.sqrt(quantity));
  
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
  const buildingTypeId = world.buildings.types[buildingId];
  const outputModeId = world.buildings.outputModeIds[buildingId];
  const production = getBuildingProduction(buildingTypeId, outputModeId);
  
  if (!production) {
    return { a: 10, b: -0.05, c: 0.0005, minQuantity: 0, maxQuantity: 200 };
  }
  
  // 计算基础材料成本
  const inputs = production.inputs || [];
  const baseMaterialCost = inputs.reduce((sum, input) => {
    return sum + world.goods.prices[input.goodsId] * input.amount;
  }, 0);
  
  // 获取建筑效率
  const efficiency = world.buildings.efficiencies[buildingId] || 1.0;
  const level = world.buildings.levels[buildingId];
  
  // 边际成本曲线：MC = a + b*Q + c*Q^2
  // a: 基础边际成本（考虑效率）
  // b: 初始规模经济系数（负值，效率高时规模经济更明显）
  // c: 边际成本递增系数（效率高时上升更慢）
  
  // 基础边际成本 = 材料成本 + 固定边际成本（人工、能源等）
  const fixedMarginalCost = Math.max(1, baseMaterialCost * 0.1);
  const a = (baseMaterialCost + fixedMarginalCost) / efficiency;
  
  // 规模经济系数：等级和效率越高，规模经济效应越强
  const scaleEconomyFactor = 0.02 + level * 0.01 + (efficiency - 1) * 0.02;
  const b = -scaleEconomyFactor * a;
  
  // 边际成本递增率：效率越高，产能瓶颈越不明显
  const congestionFactor = 0.0002 / efficiency;
  const c = congestionFactor * a;
  
  // 产能限制：大幅提升基础产能
  // 基础产能200，每级+50%，效率也影响产能
  const baseCapacity = 200;
  const maxQuantity = Math.floor(baseCapacity * (1 + 0.5 * level) * efficiency);
  
  // 最低产量：低于此产量不经济
  const minQuantity = Math.max(1, Math.floor(maxQuantity * 0.05));
  
  return {
    a: Math.max(0.1, a),
    b,
    c: Math.max(0.00001, c),
    minQuantity,
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
  const mcParams = getMarginalCostParams(world, buildingId);
  const marketPrice = world.goods.prices[outputGoodsId];
  
  // 求解 MC = P
  // a + b*Q + c*Q^2 = P
  // c*Q^2 + b*Q + (a - P) = 0
  // 使用求根公式
  
  const { a, b, c, minQuantity, maxQuantity } = mcParams;
  
  let optimalQuantity: number;
  
  if (Math.abs(c) < 0.0001) {
    // 线性边际成本：Q = (P - a) / b
    optimalQuantity = b !== 0 ? (marketPrice - a) / b : maxQuantity;
  } else {
    // 二次边际成本：使用求根公式
    const discriminant = b * b - 4 * c * (a - marketPrice);
    
    if (discriminant < 0) {
      // 无实数解，市场价格低于最低边际成本
      optimalQuantity = 0;
    } else {
      // 取较大的正根
      const q1 = (-b + Math.sqrt(discriminant)) / (2 * c);
      const q2 = (-b - Math.sqrt(discriminant)) / (2 * c);
      optimalQuantity = Math.max(q1, q2, 0);
    }
  }
  
  // 限制在产能范围内
  optimalQuantity = Math.max(minQuantity, Math.min(maxQuantity, optimalQuantity));
  
  // 如果价格低于平均可变成本，停止生产
  const marginalCostAtOptimal = calculateMarginalCost(mcParams, optimalQuantity);
  if (marketPrice < marginalCostAtOptimal * 0.5) {
    optimalQuantity = 0;
  }
  
  // 计算预期利润
  const costStructure = calculateCostStructure(world, buildingId, optimalQuantity);
  const revenue = marketPrice * optimalQuantity;
  const expectedProfit = revenue - costStructure.totalCost;
  
  // 盈亏平衡价格（平均成本）
  const breakEvenPrice = costStructure.averageCost;
  
  // 利润率
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
    const buildingTypeId = world.buildings.types[i];
    const outputModeId = world.buildings.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    
    if (!production) continue;
    
    // 检查是否生产目标商品
    const outputs = production.outputs || [];
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