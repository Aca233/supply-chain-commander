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
import { MAX_SLOTS, TICKS_PER_DAY } from '@/core/constants';
import { ALL_GOODS } from '@/data/goods';
import { AIPersonality } from './AIPersonality';
import { getRecipeForBuilding } from '@/core/production/ProductionMethods';
import { setBuildingMethod } from '@/core/production/ProductionEngine';
import {
  getBuildingConfig,
  getSlotMethods,
  getMethodById,
  BuildingProductionMethod,
  BuildingSlotType,
} from '@/core/production/methods';
import { getTotalWorkforceDemand } from '@/core/labor/LaborSystem';

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

/**
 * 建筑优化建议
 */
export interface BuildingOptimization {
  buildingId: number;
  buildingTypeId: number;
  currentMethods: Record<string, number>;
  recommendedMethods: Record<string, number>;
  expectedProfitChange: number;
  switchCosts: number;
  netBenefit: number;
  priority: number;
  evaluations: MethodEvaluation[];
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
  
  // 库存天数（基于当前时间模型计算日消耗）
  const dailyConsumption = demand / TICKS_PER_DAY;
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
 *
 * Vic3 风格：从当前 slotMethods 计算 ComputedRecipe，再扫描其 inputs/outputs。
 */
export function analyzeBuildingMarket(
  world: GameWorld,
  buildingId: number
): { inputs: MarketCondition[]; outputs: MarketCondition[] } {
  const buildingTypeId = world.buildings.types[buildingId];
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    slotMethods.push(world.buildings.slotMethods[slotOffset + i] ?? 0);
  }
  const recipe = getRecipeForBuilding(buildingTypeId, slotMethods);

  const inputs = recipe.inputs.map(i => analyzeMarketCondition(world, i.goodsId));
  const outputs = recipe.outputs.map(o => analyzeMarketCondition(world, o.goodsId));

  return { inputs, outputs };
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

  // 1. 产出加成：把 outputDelta（绝对值）按市场评分加权
  let outputBonus = 0;
  for (const d of method.outputDelta) {
    const market = marketConditions.outputs.find(o => o.goodsId === d.goodsId);
    const weight = market ? market.marketScore / 50 : 1;
    outputBonus += d.amount * weight;
  }

  // 2. 输入节省：负 inputDelta 视为节省（amount<0 = 减项）
  let inputSaving = 0;
  for (const d of method.inputDelta) {
    const market = marketConditions.inputs.find(i => i.goodsId === d.goodsId);
    const priceBonus = market ? 1 + market.priceDeviation : 1;
    inputSaving += -d.amount * priceBonus;
  }

  // 3. 品质加成（method 不再携带）
  const qualityBonus = 0;

  // 4. 能源成本：energyDelta 正值表示更耗能
  const energyCost = method.energyDelta;

  // 5. 劳动力成本：workforceDelta 总量正值表示更耗工
  const laborCost = getTotalWorkforceDemand(method.workforceDelta);
  
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
  let expectedProfitChange = 0;
  let switchCosts = 0;

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
    currentMethods,
    recommendedMethods,
    expectedProfitChange,
    switchCosts,
    netBenefit,
    priority,
    evaluations,
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
    currentMethods,
    recommendedMethods,
  } = optimization;
  const buildingTypeId = world.buildings.types[buildingId];
  const buildingConfig = getBuildingConfig(buildingTypeId);

  if (!buildingConfig) return false;

  let switched = false;
  const owner = world.buildings.owners[buildingId];

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

        // 更新生产方式（同时失效配方缓存）
        setBuildingMethod(world, buildingId, i, recommendedMethodId);

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
      for (const d of method.outputDelta) score += d.amount * 5;
      score -= method.energyDelta * 0.5 * (1 - strategy.costTolerance);
      score -= getTotalWorkforceDemand(method.workforceDelta) * 0.5 * (1 - strategy.costTolerance);

    } else if (avgMarketScore < 40) {
      // 低需求市场：优先成本和品质
      const strategy = getLowDemandStrategy(avgMarketScore);
      if (strategy.costFocus) {
        score -= method.energyDelta;
        score -= getTotalWorkforceDemand(method.workforceDelta);
        for (const d of method.inputDelta) score += -d.amount;
      }

    } else {
      // 正常市场：平衡策略
      for (const d of method.outputDelta) score += d.amount * 3;
      for (const d of method.inputDelta) score += -d.amount * 2;
      score -= method.energyDelta * 0.3;
      score -= getTotalWorkforceDemand(method.workforceDelta) * 0.2;
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
