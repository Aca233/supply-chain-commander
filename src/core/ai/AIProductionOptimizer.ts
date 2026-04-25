/**
 * AI生产方式优化器
 * 
 * 让AI根据市场供需自动调整建筑的生产方式
 * 
 * 设计目标：
 * 1. 分析市场供需状况
 * 2. 评估不同生产方式的收益
 * 3. 自动切换到最优生产方式
 * 4. 考虑切换成本和冷却时间
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, MAX_SLOTS, ACTUAL_GOODS_COUNT } from '@/core/constants';
import { ALL_GOODS } from '@/data/goods';
import {
  ALL_BUILDINGS,
  getAvailableOutputModes,
  getBuildingProduction,
  hasMultipleOutputModes,
} from '@/data/buildings';
import { AIPersonality } from './AIPersonality';
import {
  hasBuildingSpecificMethods,
  getBuildingSpecificSlots,
  calculateBuildingModifiers,
} from '@/core/production/ProductionMethods';
import {
  getBuildingConfig,
  getSlotMethods,
  getMethodById,
  BuildingProductionMethod,
  BuildingSlotType,
  ComputedModifiers,
} from '@/core/production/methods';

// ==================== 类型定义 ====================

/**
 * 市场状况分析结果
 */
export interface MarketCondition {
  goodsId: number;
  supplyDemandRatio: number;   // 供需比（>1供过于求，<1供不应求）
  priceDeviation: number;       // 价格偏离基准（>0高于基准，<0低于基准）
  inventoryDays: number;        // 库存天数
  demandTrend: number;          // 需求趋势（-1下降，0稳定，1上升）
  profitMargin: number;         // 当前利润率
  marketScore: number;          // 市场机会综合评分 0-100
}

/**
 * 生产方式评估结果
 */
export interface MethodEvaluation {
  methodId: number;
  slotId: string;
  score: number;                // 综合评分 0-100
  outputBonus: number;          // 产出加成
  inputSaving: number;          // 输入节省
  qualityBonus: number;         // 品质加成
  energyCost: number;           // 能源成本变化
  laborCost: number;            // 劳动力成本变化
  estimatedProfit: number;      // 预估利润变化
  switchCost: number;           // 切换成本
  recommendation: 'switch' | 'keep' | 'consider';
}

export interface OutputModeEvaluation {
  outputModeId: number;
  score: number;
  estimatedProfit: number;
  switchCost: number;
}

/**
 * 建筑优化建议
 */
export interface BuildingOptimization {
  buildingId: number;
  buildingTypeId: number;
  currentOutputModeId: number;
  recommendedOutputModeId: number;
  currentMethods: Record<string, number>;
  recommendedMethods: Record<string, number>;
  expectedProfitChange: number;
  switchCosts: number;
  netBenefit: number;
  priority: number;
  evaluations: MethodEvaluation[];
  outputModeEvaluations: OutputModeEvaluation[];
}

/**
 * 优化器配置
 */
export interface OptimizerConfig {
  minProfitChangeToSwitch: number;     // 最小利润变化阈值才考虑切换
  switchCostMultiplier: number;        // 切换成本权重
  qualityWeight: number;               // 品质权重
  energyWeight: number;                // 能源成本权重
  laborWeight: number;                 // 劳动力成本权重
  marketConditionWeight: number;       // 市场状况权重
  cooldownTicks: number;               // 切换冷却时间
  maxSwitchesPerTick: number;          // 每tick最大切换数
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: OptimizerConfig = {
  minProfitChangeToSwitch: 0.05,       // 利润变化超过5%才考虑切换
  switchCostMultiplier: 1.0,
  qualityWeight: 0.3,
  energyWeight: 0.2,
  laborWeight: 0.15,
  marketConditionWeight: 0.35,
  cooldownTicks: 24,                   // 1天冷却
  maxSwitchesPerTick: 3,
};

// 切换冷却记录：buildingId -> lastSwitchTick
const switchCooldowns: Map<number, number> = new Map();
const OUTPUT_MODE_SWITCH_COST_RATIO = 0.02;

// ==================== 市场分析 ====================

/**
 * 分析商品的市场状况
 */
export function analyzeMarketCondition(
  world: GameWorld,
  goodsId: number
): MarketCondition {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const supply = world.goods.supplies[goodsId] || 0;
  const demand = world.goods.demands[goodsId] || 1;
  const price = world.goods.prices[goodsId] || 1;
  const basePrice = goods?.basePrice || price;
  
  // 供需比
  const supplyDemandRatio = supply / Math.max(demand, 0.1);
  
  // 价格偏离
  const priceDeviation = (price - basePrice) / basePrice;
  
  // 库存天数（假设日消耗=需求/24）
  const dailyConsumption = demand / 24;
  const inventoryDays = dailyConsumption > 0 ? supply / dailyConsumption : 999;
  
  // 需求趋势（简化：使用价格变化推断）
  // 正常情况下价格上涨说明需求旺盛
  let demandTrend = 0;
  if (priceDeviation > 0.1) demandTrend = 1;
  else if (priceDeviation < -0.1) demandTrend = -1;
  
  // 利润率估算（使用价格偏离作为代理）
  const profitMargin = Math.max(0, priceDeviation + 0.15);
  
  // 市场机会评分
  let marketScore = 50;
  
  // 供不应求加分
  if (supplyDemandRatio < 0.7) marketScore += 20;
  else if (supplyDemandRatio < 0.9) marketScore += 10;
  else if (supplyDemandRatio > 1.3) marketScore -= 15;
  else if (supplyDemandRatio > 1.1) marketScore -= 5;
  
  // 高价加分
  if (priceDeviation > 0.2) marketScore += 15;
  else if (priceDeviation > 0.1) marketScore += 8;
  else if (priceDeviation < -0.2) marketScore -= 15;
  else if (priceDeviation < -0.1) marketScore -= 8;
  
  // 需求趋势影响
  marketScore += demandTrend * 10;
  
  marketScore = Math.max(0, Math.min(100, marketScore));
  
  return {
    goodsId,
    supplyDemandRatio,
    priceDeviation,
    inventoryDays,
    demandTrend,
    profitMargin,
    marketScore,
  };
}

/**
 * 分析建筑相关商品的市场状况
 */
export function analyzeBuildingMarket(
  world: GameWorld,
  buildingId: number
): { inputs: MarketCondition[]; outputs: MarketCondition[] } {
  const buildingTypeId = world.buildings.types[buildingId];
  const outputModeId = world.buildings.outputModeIds[buildingId];
  const production = getBuildingProduction(buildingTypeId, outputModeId);
  
  if (!production) {
    return { inputs: [], outputs: [] };
  }
  
  const inputs = production.inputs.map(i => analyzeMarketCondition(world, i.goodsId));
  const outputs = production.outputs.map(o => analyzeMarketCondition(world, o.goodsId));
  
  return { inputs, outputs };
}

function analyzeProductionMarket(
  world: GameWorld,
  production: NonNullable<ReturnType<typeof getBuildingProduction>>
): { inputs: MarketCondition[]; outputs: MarketCondition[] } {
  return {
    inputs: production.inputs.map(i => analyzeMarketCondition(world, i.goodsId)),
    outputs: production.outputs.map(o => analyzeMarketCondition(world, o.goodsId)),
  };
}

function evaluateOutputMode(
  world: GameWorld,
  buildingId: number,
  outputModeId: number,
  currentOutputModeId: number
): OutputModeEvaluation | null {
  const buildingTypeId = world.buildings.types[buildingId];
  const production = getBuildingProduction(buildingTypeId, outputModeId);
  const building = ALL_BUILDINGS.find(item => item.id === buildingTypeId);

  if (!production || !building) {
    return null;
  }

  const marketConditions = analyzeProductionMarket(world, production);

  const outputRevenue = production.outputs.reduce((sum, output) => {
    const unitPrice = world.goods.prices[output.goodsId]
      || ALL_GOODS.find(goods => goods.id === output.goodsId)?.basePrice
      || 1;
    return sum + output.amount * unitPrice;
  }, 0);

  const inputCost = production.inputs.reduce((sum, input) => {
    const unitPrice = world.goods.prices[input.goodsId]
      || ALL_GOODS.find(goods => goods.id === input.goodsId)?.basePrice
      || 1;
    return sum + input.amount * unitPrice;
  }, 0);

  const grossMargin = (outputRevenue - inputCost) / Math.max(inputCost, 1);
  const avgOutputMarketScore = marketConditions.outputs.reduce((sum, output) => sum + output.marketScore, 0)
    / Math.max(marketConditions.outputs.length, 1);
  const avgInputMarketScore = marketConditions.inputs.reduce((sum, input) => sum + input.marketScore, 0)
    / Math.max(marketConditions.inputs.length, 1);

  const score = grossMargin * 100 + avgOutputMarketScore * 0.8 - avgInputMarketScore * 0.35;
  const estimatedProfit = grossMargin + (avgOutputMarketScore - avgInputMarketScore) / 200;
  const switchCost = outputModeId === currentOutputModeId
    ? 0
    : building.buildCost * OUTPUT_MODE_SWITCH_COST_RATIO;

  return {
    outputModeId,
    score,
    estimatedProfit,
    switchCost,
  };
}

function evaluateBuildingOutputModes(
  world: GameWorld,
  buildingId: number,
  config: OptimizerConfig = DEFAULT_CONFIG
): {
  currentOutputModeId: number;
  recommendedOutputModeId: number;
  expectedProfitChange: number;
  switchCost: number;
  evaluations: OutputModeEvaluation[];
} {
  const buildingTypeId = world.buildings.types[buildingId];
  const currentOutputModeId = world.buildings.outputModeIds[buildingId] ?? 0;
  const buildingLevel = world.buildings.levels[buildingId];

  if (!hasMultipleOutputModes(buildingTypeId)) {
    return {
      currentOutputModeId,
      recommendedOutputModeId: currentOutputModeId,
      expectedProfitChange: 0,
      switchCost: 0,
      evaluations: [],
    };
  }

  const modeIds = getAvailableOutputModes(buildingTypeId, buildingLevel)
    .map(mode => mode.modeId);
  const candidateModeIds = modeIds.includes(currentOutputModeId)
    ? modeIds
    : [currentOutputModeId, ...modeIds];

  const evaluations = candidateModeIds
    .map(outputModeId => evaluateOutputMode(world, buildingId, outputModeId, currentOutputModeId))
    .filter((evaluation): evaluation is OutputModeEvaluation => evaluation !== null);

  if (evaluations.length === 0) {
    return {
      currentOutputModeId,
      recommendedOutputModeId: currentOutputModeId,
      expectedProfitChange: 0,
      switchCost: 0,
      evaluations: [],
    };
  }

  const currentEvaluation = evaluations.find(evaluation => evaluation.outputModeId === currentOutputModeId)
    ?? evaluations[0];
  const bestEvaluation = evaluations.reduce((best, evaluation) => (
    evaluation.score > best.score ? evaluation : best
  ), currentEvaluation);

  const expectedProfitChange = bestEvaluation.estimatedProfit - currentEvaluation.estimatedProfit;
  const switchCost = bestEvaluation.switchCost;
  const netBenefit = expectedProfitChange - switchCost / 100000;

  if (bestEvaluation.outputModeId === currentOutputModeId || netBenefit <= config.minProfitChangeToSwitch) {
    return {
      currentOutputModeId,
      recommendedOutputModeId: currentOutputModeId,
      expectedProfitChange: 0,
      switchCost: 0,
      evaluations,
    };
  }

  return {
    currentOutputModeId,
    recommendedOutputModeId: bestEvaluation.outputModeId,
    expectedProfitChange,
    switchCost,
    evaluations,
  };
}

// ==================== 生产方式评估 ====================

/**
 * 评估生产方式的收益
 */
export function evaluateMethod(
  world: GameWorld,
  buildingId: number,
  slot: BuildingSlotType,
  method: BuildingProductionMethod,
  marketConditions: { inputs: MarketCondition[]; outputs: MarketCondition[] },
  currentMethods: Record<string, number>,
  config: OptimizerConfig = DEFAULT_CONFIG
): MethodEvaluation {
  let score = 50; // 基础分
  
  // 1. 计算产出加成
  let outputBonus = 0;
  for (const mod of method.outputModifiers) {
    if (mod.goodsId === 'all') {
      outputBonus += (mod.multiplier - 1) * 100;
    } else {
      // 检查是否是当前配方的产出
      const outputMarket = marketConditions.outputs.find(o => o.goodsId === mod.goodsId);
      if (outputMarket) {
        // 市场好时产出加成更重要
        const marketBonus = outputMarket.marketScore / 50;
        outputBonus += (mod.multiplier - 1) * 100 * marketBonus;
      }
    }
  }
  
  // 2. 计算输入节省
  let inputSaving = 0;
  for (const mod of method.inputModifiers) {
    if (mod.goodsId === 'all') {
      inputSaving += (1 - mod.multiplier) * 100;
    } else {
      const inputMarket = marketConditions.inputs.find(i => i.goodsId === mod.goodsId);
      if (inputMarket) {
        // 价格高时节省更重要
        const priceBonus = 1 + inputMarket.priceDeviation;
        inputSaving += (1 - mod.multiplier) * 100 * priceBonus;
      }
    }
  }
  
  // 3. 品质加成
  const qualityBonus = method.qualityBonus * 100;
  
  // 4. 能源成本
  const energyCost = (method.energyMultiplier - 1) * 100;
  
  // 5. 劳动力成本
  const laborCost = (method.laborMultiplier - 1) * 100;
  
  // 6. 综合评分
  score += outputBonus * 0.35;
  score += inputSaving * 0.25;
  score += qualityBonus * config.qualityWeight * 10;
  score -= energyCost * config.energyWeight;
  score -= laborCost * config.laborWeight;
  
  // 7. 考虑市场状况
  const avgOutputScore = marketConditions.outputs.reduce((sum, o) => sum + o.marketScore, 0) 
    / Math.max(marketConditions.outputs.length, 1);
  score += (avgOutputScore - 50) * config.marketConditionWeight * 0.5;
  
  // 8. 切换成本
  const switchCost = method.switchCost || 50000;
  
  // 9. 估算利润变化
  const estimatedProfit = (outputBonus + inputSaving - energyCost * 0.5 - laborCost * 0.5) / 100;
  
  // 10. 确定建议
  let recommendation: MethodEvaluation['recommendation'] = 'keep';
  const currentMethodId = currentMethods[slot.id] || 0;
  
  if (method.id === currentMethodId) {
    recommendation = 'keep';
  } else if (estimatedProfit > config.minProfitChangeToSwitch * 2) {
    recommendation = 'switch';
  } else if (estimatedProfit > config.minProfitChangeToSwitch) {
    recommendation = 'consider';
  }
  
  score = Math.max(0, Math.min(100, score));
  
  return {
    methodId: method.id,
    slotId: slot.id,
    score,
    outputBonus,
    inputSaving,
    qualityBonus,
    energyCost,
    laborCost,
    estimatedProfit,
    switchCost,
    recommendation,
  };
}

/**
 * 评估建筑的所有生产方式选项
 */
export function evaluateBuildingMethods(
  world: GameWorld,
  buildingId: number,
  config: OptimizerConfig = DEFAULT_CONFIG
): BuildingOptimization | null {
  const buildingTypeId = world.buildings.types[buildingId];
  
  // 检查是否支持新系统
  if (!hasBuildingSpecificMethods(buildingTypeId)) {
    return null;
  }
  
  const buildingConfig = getBuildingConfig(buildingTypeId);
  if (!buildingConfig) {
    return null;
  }
  
  // 获取当前生产方式
  const slotOffset = buildingId * MAX_SLOTS;
  const currentMethods: Record<string, number> = {};
  buildingConfig.slots.forEach((slot, i) => {
    currentMethods[slot.id] = world.buildings.slotMethods[slotOffset + i] || 0;
  });

  const outputModeRecommendation = evaluateBuildingOutputModes(world, buildingId, config);
  
  // 分析市场状况
  const marketConditions = analyzeBuildingMarket(world, buildingId);
  
  // 评估所有方式
  const evaluations: MethodEvaluation[] = [];
  const recommendedMethods: Record<string, number> = { ...currentMethods };
  
  for (const slot of buildingConfig.slots) {
    const methods = getSlotMethods(buildingTypeId, slot.id);
    const buildingLevel = world.buildings.levels[buildingId];
    
    let bestEval: MethodEvaluation | null = null;
    
    for (const method of methods) {
      // 检查等级要求
      if (method.requiredLevel > buildingLevel) continue;
      
      const evaluation = evaluateMethod(
        world, buildingId, slot, method, marketConditions, currentMethods, config
      );
      evaluations.push(evaluation);
      
      // 找最佳方式
      if (!bestEval || evaluation.score > bestEval.score) {
        bestEval = evaluation;
      }
    }
    
    // 如果最佳方式比当前方式好很多，推荐切换
    if (bestEval && bestEval.recommendation !== 'keep') {
      recommendedMethods[slot.id] = bestEval.methodId;
    }
  }
  
  // 计算预期收益
  let expectedProfitChange = outputModeRecommendation.expectedProfitChange;
  let switchCosts = outputModeRecommendation.switchCost;
  
  for (const eval_ of evaluations) {
    if (recommendedMethods[eval_.slotId] === eval_.methodId && 
        currentMethods[eval_.slotId] !== eval_.methodId) {
      expectedProfitChange += eval_.estimatedProfit;
      switchCosts += eval_.switchCost;
    }
  }
  
  const netBenefit = expectedProfitChange - switchCosts / 100000; // 归一化切换成本
  
  // 计算优先级
  let priority = netBenefit * 10;
  if (marketConditions.outputs.some(o => o.marketScore > 70)) {
    priority *= 1.5; // 市场好时优先优化
  }
  
  return {
    buildingId,
    buildingTypeId,
    currentOutputModeId: outputModeRecommendation.currentOutputModeId,
    recommendedOutputModeId: outputModeRecommendation.recommendedOutputModeId,
    currentMethods,
    recommendedMethods,
    expectedProfitChange,
    switchCosts,
    netBenefit,
    priority,
    evaluations,
    outputModeEvaluations: outputModeRecommendation.evaluations,
  };
}

// ==================== AI决策集成 ====================

/**
 * 根据市场状况优化公司所有建筑的生产方式
 */
export function optimizeCompanyProduction(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality,
  config: OptimizerConfig = DEFAULT_CONFIG
): BuildingOptimization[] {
  const optimizations: BuildingOptimization[] = [];
  
  // 遍历公司的所有建筑
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    if (!world.buildings.isActive[i]) continue;
    
    // 检查冷却时间
    const lastSwitch = switchCooldowns.get(i) || 0;
    if (world.tick - lastSwitch < config.cooldownTicks) continue;
    
    const optimization = evaluateBuildingMethods(world, i, config);
    if (optimization && optimization.netBenefit > config.minProfitChangeToSwitch) {
      optimizations.push(optimization);
    }
  }
  
  // 按优先级排序
  optimizations.sort((a, b) => b.priority - a.priority);
  
  // 根据人格调整
  // 保守型：只选择收益最高的
  // 激进型：尝试更多优化
  const maxOptimizations = personality.riskTolerance > 0.7 
    ? config.maxSwitchesPerTick * 2 
    : config.maxSwitchesPerTick;
  
  return optimizations.slice(0, maxOptimizations);
}

/**
 * 执行生产方式切换
 */
export function executeMethodSwitch(
  world: GameWorld,
  optimization: BuildingOptimization
): boolean {
  const {
    buildingId,
    currentOutputModeId,
    recommendedOutputModeId,
    currentMethods,
    recommendedMethods,
  } = optimization;
  const buildingTypeId = world.buildings.types[buildingId];
  const buildingConfig = getBuildingConfig(buildingTypeId);
  
  if (!buildingConfig) return false;
  
  let switched = false;
  const slotOffset = buildingId * MAX_SLOTS;
  const owner = world.buildings.owners[buildingId];

  if (currentOutputModeId !== recommendedOutputModeId) {
    const building = ALL_BUILDINGS.find(item => item.id === buildingTypeId);
    const switchCost = (building?.buildCost || 0) * OUTPUT_MODE_SWITCH_COST_RATIO;

    if (world.companies.cash[owner] >= switchCost) {
      world.companies.cash[owner] -= switchCost;
      world.buildings.outputModeIds[buildingId] = recommendedOutputModeId;
      switched = true;

      console.log(`[AI生产优化] 建筑#${buildingId} 产品模式: ` +
        `${currentOutputModeId} -> ${recommendedOutputModeId}, 成本¥${switchCost}`);
    }
  }
  
  for (let i = 0; i < buildingConfig.slots.length; i++) {
    const slot = buildingConfig.slots[i];
    const currentMethodId = currentMethods[slot.id] || 0;
    const recommendedMethodId = recommendedMethods[slot.id] || 0;
    
    if (currentMethodId !== recommendedMethodId && recommendedMethodId > 0) {
      // 检查切换成本
      const method = getMethodById(recommendedMethodId);
      const switchCost = method?.switchCost || 50000;
      
      // 检查资金
      if (world.companies.cash[owner] >= switchCost) {
        // 扣除切换成本
        world.companies.cash[owner] -= switchCost;
        
        // 更新生产方式
        world.buildings.slotMethods[slotOffset + i] = recommendedMethodId;
        
        switched = true;
        
        console.log(`[AI生产优化] 建筑#${buildingId} 槽位${slot.name}: ` +
          `${currentMethodId} -> ${recommendedMethodId}, 成本¥${switchCost}`);
      }
    }
  }
  
  if (switched) {
    // 记录冷却时间
    switchCooldowns.set(buildingId, world.tick);
  }
  
  return switched;
}

/**
 * 运行AI生产优化周期
 * 
 * 在AIDecisionEngine中调用
 */
export function runProductionOptimization(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality
): number {
  // 根据人格调整配置
  const config = { ...DEFAULT_CONFIG };
  
  // 激进型更愿意切换
  config.minProfitChangeToSwitch = 0.05 * (1 - personality.riskTolerance * 0.5);
  
  // 保守型冷却时间更长
  config.cooldownTicks = Math.round(24 * (1 + (1 - personality.riskTolerance) * 0.5));
  
  // 专精型更注重品质
  if (personality.specializationDegree > 0.7) {
    config.qualityWeight = 0.5;
  }
  
  // 成本领先者更注重成本
  if (personality.pricingBias < -0.3) {
    config.energyWeight = 0.35;
    config.laborWeight = 0.3;
  }
  
  // 获取优化建议
  const optimizations = optimizeCompanyProduction(world, companyId, personality, config);
  
  // 执行优化
  let executedCount = 0;
  for (const optimization of optimizations) {
    if (executeMethodSwitch(world, optimization)) {
      executedCount++;
    }
  }
  
  return executedCount;
}

// ==================== 市场响应策略 ====================

/**
 * 供不应求时的生产方式策略
 */
export function getHighDemandStrategy(marketScore: number): {
  prioritizeOutput: boolean;
  qualityFocus: boolean;
  costTolerance: number;
} {
  if (marketScore > 80) {
    return {
      prioritizeOutput: true,     // 优先产出
      qualityFocus: false,        // 不需要高品质
      costTolerance: 0.3,         // 可接受30%成本增加
    };
  } else if (marketScore > 60) {
    return {
      prioritizeOutput: true,
      qualityFocus: false,
      costTolerance: 0.15,
    };
  } else {
    return {
      prioritizeOutput: false,
      qualityFocus: false,
      costTolerance: 0,
    };
  }
}

/**
 * 供过于求时的生产方式策略
 */
export function getLowDemandStrategy(marketScore: number): {
  reduceOutput: boolean;
  qualityFocus: boolean;
  costFocus: boolean;
} {
  if (marketScore < 30) {
    return {
      reduceOutput: true,         // 减少产出
      qualityFocus: true,         // 提高品质差异化
      costFocus: true,            // 降低成本
    };
  } else if (marketScore < 45) {
    return {
      reduceOutput: false,
      qualityFocus: true,
      costFocus: true,
    };
  } else {
    return {
      reduceOutput: false,
      qualityFocus: false,
      costFocus: false,
    };
  }
}

/**
 * 根据市场状况自动选择最优生产方式
 */
export function selectOptimalMethodForMarket(
  world: GameWorld,
  buildingId: number,
  slotIndex: number
): number | null {
  const buildingTypeId = world.buildings.types[buildingId];
  const buildingConfig = getBuildingConfig(buildingTypeId);
  
  if (!buildingConfig || slotIndex >= buildingConfig.slots.length) {
    return null;
  }
  
  const slot = buildingConfig.slots[slotIndex];
  const methods = getSlotMethods(buildingTypeId, slot.id);
  const buildingLevel = world.buildings.levels[buildingId];
  const marketConditions = analyzeBuildingMarket(world, buildingId);
  
  // 计算平均市场评分
  const avgMarketScore = marketConditions.outputs.reduce((sum, o) => sum + o.marketScore, 0) 
    / Math.max(marketConditions.outputs.length, 1);
  
  // 根据市场状况选择策略
  let bestMethod: BuildingProductionMethod | null = null;
  let bestScore = -Infinity;
  
  for (const method of methods) {
    if (method.requiredLevel > buildingLevel) continue;
    
    let score = 0;
    
    if (avgMarketScore > 60) {
      // 高需求市场：优先产出
      const strategy = getHighDemandStrategy(avgMarketScore);
      
      for (const mod of method.outputModifiers) {
        score += (mod.multiplier - 1) * 100;
      }
      
      // 可以接受一定成本增加
      score -= (method.energyMultiplier - 1) * 50 * (1 - strategy.costTolerance);
      score -= (method.laborMultiplier - 1) * 50 * (1 - strategy.costTolerance);
      
    } else if (avgMarketScore < 40) {
      // 低需求市场：优先成本和品质
      const strategy = getLowDemandStrategy(avgMarketScore);
      
      if (strategy.qualityFocus) {
        score += method.qualityBonus * 200;
      }
      
      if (strategy.costFocus) {
        score -= (method.energyMultiplier - 1) * 100;
        score -= (method.laborMultiplier - 1) * 100;
        
        // 输入节省加分
        for (const mod of method.inputModifiers) {
          score += (1 - mod.multiplier) * 100;
        }
      }
      
    } else {
      // 正常市场：平衡策略
      for (const mod of method.outputModifiers) {
        score += (mod.multiplier - 1) * 60;
      }
      for (const mod of method.inputModifiers) {
        score += (1 - mod.multiplier) * 40;
      }
      score += method.qualityBonus * 50;
      score -= (method.energyMultiplier - 1) * 30;
      score -= (method.laborMultiplier - 1) * 20;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMethod = method;
    }
  }
  
  return bestMethod?.id || null;
}

// ==================== 清理函数 ====================

/**
 * 清理冷却记录
 */
export function clearOptimizationCache(): void {
  switchCooldowns.clear();
}

/**
 * 获取建筑的上次切换时间
 */
export function getLastSwitchTick(buildingId: number): number {
  return switchCooldowns.get(buildingId) || 0;
}

/**
 * 检查建筑是否可以切换生产方式
 */
export function canSwitchMethod(
  world: GameWorld,
  buildingId: number,
  config: OptimizerConfig = DEFAULT_CONFIG
): boolean {
  const lastSwitch = switchCooldowns.get(buildingId) || 0;
  return world.tick - lastSwitch >= config.cooldownTicks;
}
