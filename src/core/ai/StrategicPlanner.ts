/**
 * AI战略规划系统
 * 
 * 提供长期规划能力，让AI做出具有前瞻性的决策
 * 
 * 设计目标：
 * 1. 制定5-10年长期战略目标
 * 2. 分解为季度可执行计划
 * 3. 动态调整策略应对市场变化
 * 4. 资源分配优化
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, TICKS_PER_DAY, TICKS_PER_YEAR } from '@/core/constants';
import { AIPersonality, PersonalityType, AI_PERSONALITIES } from './AIPersonality';
import { CompanyAssessment } from './AIDecisionEngine';
import { 
  getCompanyProfitMargin, 
  getCompanyMarketShare,
  analyzeCompanyProfit,
  analyzeCompanyMarketPosition,
  CompanyProfitAnalysis,
  CompanyMarketPosition
} from './PrecisionCalculator';
import { 
  predictPrice, 
  PricePrediction,
  calculateTechnicalIndicators
} from './PricePredictor';
import { BEHAVIOR_PATTERNS } from './PersonalityBehaviors';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';
import { RECIPES, RECIPES_BY_BUILDING } from '@/data/recipes';

// ==================== 类型定义 ====================

/**
 * 战略时间范围
 */
export type StrategicHorizon = 'short' | 'medium' | 'long';

/**
 * 战略类型
 */
export type StrategyType = 
  | 'market_expansion'     // 市场扩张
  | 'vertical_integration' // 垂直整合
  | 'horizontal_expansion' // 横向扩张
  | 'cost_reduction'       // 成本削减
  | 'premium_positioning'  // 高端定位
  | 'diversification'      // 多元化
  | 'focus_niche'          // 聚焦细分
  | 'innovation_leadership' // 创新领先
  | 'survival';            // 生存模式

/**
 * 战略目标
 */
export interface StrategicGoal {
  id: string;
  type: StrategyType;
  horizon: StrategicHorizon;
  
  // 目标指标
  targetMetrics: {
    marketShare?: number;           // 目标市场份额
    profitMargin?: number;          // 目标利润率
    revenue?: number;               // 目标收入
    productionCapacity?: number;    // 目标产能
    cashReserve?: number;           // 目标现金储备
    buildingCount?: number;         // 目标建筑数
  };
  
  // 当前进度
  progress: number;                 // 0-1
  
  // 时间限制
  startTick: number;
  endTick: number;
  
  // 优先级
  priority: number;
  
  // 相关商品/建筑
  targetGoods: number[];
  targetBuildings: number[];
  
  // 依赖的其他目标
  dependencies: string[];
  
  // 状态
  status: 'pending' | 'active' | 'completed' | 'failed' | 'abandoned';
}

/**
 * 季度计划
 */
export interface QuarterlyPlan {
  quarter: number;                  // 第几季度
  year: number;
  startTick: number;
  endTick: number;
  
  // 计划内容
  actions: PlanAction[];
  
  // 预算分配
  budget: {
    expansion: number;              // 扩张预算
    operations: number;             // 运营预算
    trading: number;                // 交易预算
    reserve: number;                // 储备
  };
  
  // 预期结果
  expectedOutcomes: {
    revenue: number;
    profit: number;
    marketShareChange: number;
  };
}

/**
 * 计划动作
 */
export interface PlanAction {
  type: 'build' | 'expand' | 'trade' | 'price' | 'research' | 'divest';
  priority: number;
  
  // 动作详情
  params: {
    buildingTypeId?: number;
    goodsId?: number;
    quantity?: number;
    targetPrice?: number;
    budget?: number;
  };
  
  // 执行条件
  conditions: {
    minCash?: number;
    minMarketShare?: number;
    maxInventoryDays?: number;
    priceAbove?: number;
    priceBelow?: number;
  };
  
  // 执行状态
  executed: boolean;
  executedTick?: number;
}

/**
 * 战略计划存储
 */
export interface StrategicPlanStore {
  companyId: number;
  
  // 长期目标
  goals: StrategicGoal[];
  
  // 季度计划
  quarterlyPlans: QuarterlyPlan[];
  
  // 当前战略重心
  currentStrategy: StrategyType;
  
  // 上次规划时间
  lastPlanningTick: number;
  
  // 规划周期（ticks）
  planningInterval: number;
}

/**
 * 市场机会评估
 */
export interface MarketOpportunity {
  goodsId: number;
  opportunityScore: number;         // 0-100
  
  // 机会因素
  demandGrowth: number;             // 需求增长率
  supplyGap: number;                // 供需缺口
  profitPotential: number;          // 利润潜力
  competitionLevel: number;         // 竞争程度 (0-1, 低=机会)
  entryBarrier: number;             // 进入壁垒 (0-1, 低=机会)
  
  // 建议
  recommendedAction: 'enter' | 'expand' | 'maintain' | 'exit';
  requiredInvestment: number;
}

/**
 * 资源分配建议
 */
export interface ResourceAllocation {
  totalBudget: number;
  
  // 分配比例
  allocations: {
    category: 'expansion' | 'production' | 'trading' | 'research' | 'reserve';
    amount: number;
    percentage: number;
    targetGoods: number[];
    targetBuildings: number[];
  }[];
}

// ==================== 战略规划存储 ====================

// 公司战略计划缓存
const strategicPlans = new Map<number, StrategicPlanStore>();

/**
 * 获取公司战略计划
 */
export function getStrategicPlan(companyId: number): StrategicPlanStore | null {
  return strategicPlans.get(companyId) || null;
}

/**
 * 初始化公司战略计划
 */
export function initializeStrategicPlan(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality
): StrategicPlanStore {
  const strategy = determineInitialStrategy(personality);
  
  const plan: StrategicPlanStore = {
    companyId,
    goals: [],
    quarterlyPlans: [],
    currentStrategy: strategy,
    lastPlanningTick: world.tick,
    planningInterval: TICKS_PER_DAY * 30, // 每月重新规划
  };
  
  strategicPlans.set(companyId, plan);
  return plan;
}

/**
 * 根据人格确定初始战略
 */
function determineInitialStrategy(personality: AIPersonality): StrategyType {
  switch (personality.type) {
    case 'aggressive':
      return 'market_expansion';
    case 'conservative':
      return 'cost_reduction';
    case 'opportunist':
      return 'diversification';
    case 'specialist':
      return 'focus_niche';
    case 'diversified':
      return 'horizontal_expansion';
    case 'innovator':
      return 'innovation_leadership';
    case 'cost_leader':
      return 'cost_reduction';
    case 'premium':
      return 'premium_positioning';
    default:
      return 'market_expansion';
  }
}

// ==================== 战略制定 ====================

/**
 * 更新战略规划
 */
export function updateStrategicPlan(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality,
  assessment: CompanyAssessment
): void {
  let plan = strategicPlans.get(companyId);
  
  if (!plan) {
    plan = initializeStrategicPlan(world, companyId, personality);
  }
  
  // 检查是否需要重新规划
  if (world.tick - plan.lastPlanningTick < plan.planningInterval) {
    return;
  }
  
  // 评估当前战略有效性
  const strategyEffectiveness = evaluateStrategyEffectiveness(world, companyId, plan);
  
  // 如果战略效果不佳，考虑调整
  if (strategyEffectiveness < 0.4) {
    plan.currentStrategy = selectBetterStrategy(world, companyId, personality, assessment);
  }
  
  // 更新目标
  updateStrategicGoals(world, companyId, plan, personality, assessment);
  
  // 生成季度计划
  generateQuarterlyPlan(world, companyId, plan, personality, assessment);
  
  plan.lastPlanningTick = world.tick;
}

/**
 * 评估当前战略效果
 */
function evaluateStrategyEffectiveness(
  world: GameWorld,
  companyId: number,
  plan: StrategicPlanStore
): number {
  let score = 0.5; // 基础分
  
  // 检查目标完成情况
  const activeGoals = plan.goals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    const avgProgress = activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length;
    score = score * 0.5 + avgProgress * 0.5;
  }
  
  // 检查财务状况
  const profitMargin = getCompanyProfitMargin(world, companyId);
  if (profitMargin > 0.1) score += 0.2;
  else if (profitMargin < 0) score -= 0.2;
  
  // 检查市场份额
  const marketShare = getCompanyMarketShare(world, companyId);
  if (marketShare > 0.1) score += 0.1;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * 选择更好的战略
 */
function selectBetterStrategy(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality,
  assessment: CompanyAssessment
): StrategyType {
  // 危机情况
  if (assessment.cash < 100000 || assessment.cashRatio < 0.1) {
    return 'survival';
  }
  
  // 评估各战略的适用性
  const strategies: { type: StrategyType; score: number }[] = [];
  
  // 市场扩张
  if (assessment.opportunities.length > 3 && assessment.cashRatio > 0.3) {
    strategies.push({ type: 'market_expansion', score: 0.8 * personality.expansionBias });
  }
  
  // 成本削减
  if (assessment.profitMargin < 0.05) {
    strategies.push({ type: 'cost_reduction', score: 0.7 });
  }
  
  // 高端定位
  if (personality.pricingBias > 0.3 && assessment.profitMargin > 0) {
    strategies.push({ type: 'premium_positioning', score: 0.6 + personality.pricingBias * 0.3 });
  }
  
  // 多元化
  if (personality.specializationDegree < 0.5) {
    strategies.push({ type: 'diversification', score: 0.5 });
  }
  
  // 聚焦细分
  if (personality.specializationDegree > 0.7) {
    strategies.push({ type: 'focus_niche', score: 0.6 + personality.specializationDegree * 0.3 });
  }
  
  // 创新领先
  if (personality.innovationInvestment > 0.08) {
    strategies.push({ type: 'innovation_leadership', score: 0.5 + personality.innovationInvestment * 3 });
  }
  
  // 排序选择最高分
  strategies.sort((a, b) => b.score - a.score);
  return strategies[0]?.type || 'market_expansion';
}

/**
 * 更新战略目标
 */
function updateStrategicGoals(
  world: GameWorld,
  companyId: number,
  plan: StrategicPlanStore,
  personality: AIPersonality,
  assessment: CompanyAssessment
): void {
  // 更新现有目标进度
  for (const goal of plan.goals) {
    if (goal.status === 'active') {
      goal.progress = calculateGoalProgress(world, companyId, goal);
      
      // 检查是否完成或失败
      if (goal.progress >= 1) {
        goal.status = 'completed';
      } else if (world.tick > goal.endTick) {
        goal.status = goal.progress > 0.5 ? 'completed' : 'failed';
      }
    }
  }
  
  // 添加新目标
  const activeGoals = plan.goals.filter(g => g.status === 'active');
  if (activeGoals.length < 3) {
    const newGoals = generateStrategicGoals(world, companyId, plan.currentStrategy, personality, assessment);
    plan.goals.push(...newGoals);
  }
}

/**
 * 计算目标进度
 */
function calculateGoalProgress(
  world: GameWorld,
  companyId: number,
  goal: StrategicGoal
): number {
  let progress = 0;
  let metricCount = 0;
  
  if (goal.targetMetrics.marketShare !== undefined) {
    const current = getCompanyMarketShare(world, companyId);
    progress += Math.min(1, current / goal.targetMetrics.marketShare);
    metricCount++;
  }
  
  if (goal.targetMetrics.profitMargin !== undefined) {
    const current = getCompanyProfitMargin(world, companyId);
    progress += Math.min(1, current / goal.targetMetrics.profitMargin);
    metricCount++;
  }
  
  if (goal.targetMetrics.cashReserve !== undefined) {
    const current = world.companies.cash[companyId];
    progress += Math.min(1, current / goal.targetMetrics.cashReserve);
    metricCount++;
  }
  
  if (goal.targetMetrics.buildingCount !== undefined) {
    let current = 0;
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === companyId) current++;
    }
    progress += Math.min(1, current / goal.targetMetrics.buildingCount);
    metricCount++;
  }
  
  return metricCount > 0 ? progress / metricCount : 0;
}

/**
 * 生成战略目标
 */
function generateStrategicGoals(
  world: GameWorld,
  companyId: number,
  strategy: StrategyType,
  personality: AIPersonality,
  assessment: CompanyAssessment
): StrategicGoal[] {
  const goals: StrategicGoal[] = [];
  const currentTick = world.tick;
  
  switch (strategy) {
    case 'market_expansion':
      goals.push({
        id: `expansion-${currentTick}`,
        type: 'market_expansion',
        horizon: 'medium',
        targetMetrics: {
          marketShare: Math.min(0.3, assessment.marketShare * 2 + 0.05),
          buildingCount: assessment.buildingCount + 3,
        },
        progress: 0,
        startTick: currentTick,
        endTick: currentTick + TICKS_PER_YEAR,
        priority: 8,
        targetGoods: assessment.opportunities.slice(0, 5),
        targetBuildings: [],
        dependencies: [],
        status: 'active',
      });
      break;
      
    case 'cost_reduction':
      goals.push({
        id: `cost-${currentTick}`,
        type: 'cost_reduction',
        horizon: 'short',
        targetMetrics: {
          profitMargin: Math.max(0.1, assessment.profitMargin + 0.05),
          cashReserve: assessment.cash * 1.5,
        },
        progress: 0,
        startTick: currentTick,
        endTick: currentTick + TICKS_PER_YEAR * 0.5,
        priority: 9,
        targetGoods: [],
        targetBuildings: [],
        dependencies: [],
        status: 'active',
      });
      break;
      
    case 'premium_positioning':
      goals.push({
        id: `premium-${currentTick}`,
        type: 'premium_positioning',
        horizon: 'long',
        targetMetrics: {
          profitMargin: 0.25,
        },
        progress: 0,
        startTick: currentTick,
        endTick: currentTick + TICKS_PER_YEAR * 2,
        priority: 7,
        targetGoods: [53, 54, 55, 93, 94, 95], // 奢侈品类
        targetBuildings: [36], // 奢侈品工坊
        dependencies: [],
        status: 'active',
      });
      break;
      
    case 'focus_niche':
      const focusGoods = assessment.opportunities.slice(0, 3);
      goals.push({
        id: `niche-${currentTick}`,
        type: 'focus_niche',
        horizon: 'medium',
        targetMetrics: {
          marketShare: 0.25, // 细分市场高份额
        },
        progress: 0,
        startTick: currentTick,
        endTick: currentTick + TICKS_PER_YEAR,
        priority: 8,
        targetGoods: focusGoods,
        targetBuildings: [],
        dependencies: [],
        status: 'active',
      });
      break;
      
    case 'innovation_leadership':
      goals.push({
        id: `innovation-${currentTick}`,
        type: 'innovation_leadership',
        horizon: 'long',
        targetMetrics: {
          buildingCount: assessment.buildingCount + 2,
        },
        progress: 0,
        startTick: currentTick,
        endTick: currentTick + TICKS_PER_YEAR * 2,
        priority: 7,
        targetGoods: [96, 97, 99, 100, 101, 102, 103], // 高科技产品
        targetBuildings: [37, 38, 39], // AI芯片厂、量子实验室、生物实验室
        dependencies: [],
        status: 'active',
      });
      break;
      
    case 'survival':
      goals.push({
        id: `survival-${currentTick}`,
        type: 'survival',
        horizon: 'short',
        targetMetrics: {
          cashReserve: 500000,
          profitMargin: 0.05,
        },
        progress: 0,
        startTick: currentTick,
        endTick: currentTick + TICKS_PER_YEAR * 0.25,
        priority: 10,
        targetGoods: [],
        targetBuildings: [],
        dependencies: [],
        status: 'active',
      });
      break;
      
    default:
      // 默认目标
      goals.push({
        id: `default-${currentTick}`,
        type: 'market_expansion',
        horizon: 'medium',
        targetMetrics: {
          profitMargin: 0.1,
          marketShare: 0.1,
        },
        progress: 0,
        startTick: currentTick,
        endTick: currentTick + TICKS_PER_YEAR,
        priority: 5,
        targetGoods: [],
        targetBuildings: [],
        dependencies: [],
        status: 'active',
      });
  }
  
  return goals;
}

// ==================== 季度计划 ====================

/**
 * 生成季度计划
 */
function generateQuarterlyPlan(
  world: GameWorld,
  companyId: number,
  plan: StrategicPlanStore,
  personality: AIPersonality,
  assessment: CompanyAssessment
): void {
  const currentYear = Math.floor(world.tick / TICKS_PER_YEAR) + 1;
  const currentQuarter = Math.floor((world.tick % TICKS_PER_YEAR) / (TICKS_PER_YEAR / 4)) + 1;
  
  // 检查是否已有当季计划
  const existingPlan = plan.quarterlyPlans.find(
    p => p.year === currentYear && p.quarter === currentQuarter
  );
  
  if (existingPlan) return;
  
  // 计算预算
  const totalBudget = assessment.cash * 0.6; // 使用60%现金做预算
  const allocation = allocateResources(world, companyId, plan, personality, assessment, totalBudget);
  
  // 生成动作列表
  const actions = generatePlanActions(world, companyId, plan, personality, assessment, allocation);
  
  // 创建季度计划
  const quarterlyPlan: QuarterlyPlan = {
    quarter: currentQuarter,
    year: currentYear,
    startTick: world.tick,
    endTick: world.tick + TICKS_PER_YEAR / 4,
    actions,
    budget: {
      expansion: allocation.allocations.find(a => a.category === 'expansion')?.amount || 0,
      operations: allocation.allocations.find(a => a.category === 'production')?.amount || 0,
      trading: allocation.allocations.find(a => a.category === 'trading')?.amount || 0,
      reserve: allocation.allocations.find(a => a.category === 'reserve')?.amount || 0,
    },
    expectedOutcomes: {
      revenue: totalBudget * 1.2,
      profit: totalBudget * 0.15,
      marketShareChange: 0.02,
    },
  };
  
  plan.quarterlyPlans.push(quarterlyPlan);
  
  // 只保留最近4个季度的计划
  if (plan.quarterlyPlans.length > 4) {
    plan.quarterlyPlans = plan.quarterlyPlans.slice(-4);
  }
}

/**
 * 资源分配
 */
function allocateResources(
  world: GameWorld,
  companyId: number,
  plan: StrategicPlanStore,
  personality: AIPersonality,
  assessment: CompanyAssessment,
  totalBudget: number
): ResourceAllocation {
  const pattern = BEHAVIOR_PATTERNS[personality.type];
  const allocations: ResourceAllocation['allocations'] = [];
  
  // 根据战略分配比例
  let expansionRatio = 0.2;
  let productionRatio = 0.3;
  let tradingRatio = 0.3;
  let researchRatio = 0.05;
  let reserveRatio = 0.15;
  
  switch (plan.currentStrategy) {
    case 'market_expansion':
      expansionRatio = 0.4;
      productionRatio = 0.25;
      tradingRatio = 0.2;
      reserveRatio = 0.1;
      break;
      
    case 'cost_reduction':
      expansionRatio = 0.1;
      productionRatio = 0.35;
      tradingRatio = 0.25;
      reserveRatio = 0.25;
      break;
      
    case 'innovation_leadership':
      expansionRatio = 0.25;
      researchRatio = 0.25;
      productionRatio = 0.2;
      tradingRatio = 0.15;
      reserveRatio = 0.15;
      break;
      
    case 'survival':
      expansionRatio = 0;
      productionRatio = 0.3;
      tradingRatio = 0.3;
      reserveRatio = 0.4;
      break;
  }
  
  // 根据人格微调
  expansionRatio *= (0.5 + personality.expansionBias);
  reserveRatio *= (0.5 + (1 - personality.riskTolerance));
  
  // 归一化
  const total = expansionRatio + productionRatio + tradingRatio + researchRatio + reserveRatio;
  expansionRatio /= total;
  productionRatio /= total;
  tradingRatio /= total;
  researchRatio /= total;
  reserveRatio /= total;
  
  // 创建分配
  allocations.push({
    category: 'expansion',
    amount: totalBudget * expansionRatio,
    percentage: expansionRatio,
    targetGoods: plan.goals.flatMap(g => g.targetGoods).slice(0, 5),
    targetBuildings: plan.goals.flatMap(g => g.targetBuildings).slice(0, 3),
  });
  
  allocations.push({
    category: 'production',
    amount: totalBudget * productionRatio,
    percentage: productionRatio,
    targetGoods: [],
    targetBuildings: [],
  });
  
  allocations.push({
    category: 'trading',
    amount: totalBudget * tradingRatio,
    percentage: tradingRatio,
    targetGoods: assessment.opportunities.slice(0, 5),
    targetBuildings: [],
  });
  
  allocations.push({
    category: 'research',
    amount: totalBudget * researchRatio,
    percentage: researchRatio,
    targetGoods: [],
    targetBuildings: [],
  });
  
  allocations.push({
    category: 'reserve',
    amount: totalBudget * reserveRatio,
    percentage: reserveRatio,
    targetGoods: [],
    targetBuildings: [],
  });
  
  return { totalBudget, allocations };
}

/**
 * 生成计划动作
 */
function generatePlanActions(
  world: GameWorld,
  companyId: number,
  plan: StrategicPlanStore,
  personality: AIPersonality,
  assessment: CompanyAssessment,
  allocation: ResourceAllocation
): PlanAction[] {
  const actions: PlanAction[] = [];
  
  // 扩张动作
  const expansionBudget = allocation.allocations.find(a => a.category === 'expansion');
  if (expansionBudget && expansionBudget.amount > 100000) {
    // 找最优建筑投资
    const targetBuildings = expansionBudget.targetBuildings.length > 0 
      ? expansionBudget.targetBuildings 
      : findBestBuildingInvestments(world, companyId, plan.currentStrategy);
    
    for (const buildingTypeId of targetBuildings.slice(0, 2)) {
      const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
      if (building && expansionBudget.amount >= building.buildCost) {
        actions.push({
          type: 'build',
          priority: 8,
          params: {
            buildingTypeId,
            budget: building.buildCost,
          },
          conditions: {
            minCash: building.buildCost * 1.5,
          },
          executed: false,
        });
      }
    }
  }
  
  // 交易动作
  const tradingBudget = allocation.allocations.find(a => a.category === 'trading');
  if (tradingBudget && tradingBudget.amount > 10000) {
    for (const goodsId of tradingBudget.targetGoods.slice(0, 3)) {
      const prediction = predictPrice(world, goodsId);
      
      if (prediction.signal === 'buy' || prediction.signal === 'strong_buy') {
        actions.push({
          type: 'trade',
          priority: 6,
          params: {
            goodsId,
            quantity: Math.floor(tradingBudget.amount * 0.2 / prediction.currentPrice),
            targetPrice: prediction.predictedPrice6h,
          },
          conditions: {
            minCash: tradingBudget.amount * 0.3,
          },
          executed: false,
        });
      }
    }
  }
  
  // 排序
  actions.sort((a, b) => b.priority - a.priority);
  
  return actions;
}

/**
 * 找最佳建筑投资
 */
function findBestBuildingInvestments(
  world: GameWorld,
  companyId: number,
  strategy: StrategyType
): number[] {
  const candidates: { buildingId: number; score: number }[] = [];
  
  for (const building of ALL_BUILDINGS) {
    let score = 0;
    
    // 检查该建筑的配方
    const recipes = RECIPES_BY_BUILDING.get(building.id) || [];
    
    for (const recipe of recipes) {
      for (const output of recipe.outputs) {
        const goods = ALL_GOODS.find(g => g.id === output.goodsId);
        if (!goods) continue;
        
        // 供需缺口评分
        const supply = world.goods.supplies[output.goodsId];
        const demand = world.goods.demands[output.goodsId];
        const gap = demand > 0 ? (demand - supply) / demand : 0;
        score += gap * 10;
        
        // 价格利润评分
        const price = world.goods.prices[output.goodsId];
        const basePrice = goods.basePrice;
        if (price > basePrice * 1.2) {
          score += 5;
        }
        
        // 战略匹配评分
        if (strategy === 'premium_positioning' && goods.category === 'final') {
          score += 3;
        }
        if (strategy === 'innovation_leadership' && goods.tier === 3) {
          score += 3;
        }
        if (strategy === 'cost_reduction' && goods.tier <= 1) {
          score += 3;
        }
      }
    }
    
    if (score > 0) {
      candidates.push({ buildingId: building.id, score });
    }
  }
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 5).map(c => c.buildingId);
}

// ==================== 市场机会评估 ====================

/**
 * 评估市场机会
 */
export function evaluateMarketOpportunities(
  world: GameWorld,
  companyId: number
): MarketOpportunity[] {
  const opportunities: MarketOpportunity[] = [];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const opportunity = evaluateSingleOpportunity(world, companyId, goodsId);
    if (opportunity.opportunityScore > 30) {
      opportunities.push(opportunity);
    }
  }
  
  opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
  return opportunities.slice(0, 20);
}

/**
 * 评估单个商品机会
 */
function evaluateSingleOpportunity(
  world: GameWorld,
  companyId: number,
  goodsId: number
): MarketOpportunity {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const supply = world.goods.supplies[goodsId];
  const demand = world.goods.demands[goodsId];
  const price = world.goods.prices[goodsId];
  const basePrice = goods?.basePrice || price;
  
  // 供需缺口
  const supplyGap = demand > 0 ? (demand - supply) / demand : 0;
  
  // 需求增长（简化）
  const demandGrowth = demand > 0 ? 0.05 : 0;
  
  // 利润潜力
  const profitPotential = price > basePrice ? (price - basePrice) / basePrice : 0;
  
  // 竞争程度
  const competitorCount = countCompetitors(world, goodsId);
  const competitionLevel = Math.min(1, competitorCount / 10);
  
  // 进入壁垒（基于建筑成本）
  const entryBarrier = calculateEntryBarrier(goodsId);
  
  // 综合评分
  let opportunityScore = 
    supplyGap * 30 +
    profitPotential * 20 +
    (1 - competitionLevel) * 25 +
    (1 - entryBarrier) * 15 +
    demandGrowth * 10;
  
  opportunityScore = Math.max(0, Math.min(100, opportunityScore));
  
  // 建议行动
  let recommendedAction: MarketOpportunity['recommendedAction'] = 'maintain';
  if (opportunityScore > 70) {
    recommendedAction = 'enter';
  } else if (opportunityScore > 50) {
    recommendedAction = 'expand';
  } else if (opportunityScore < 20) {
    recommendedAction = 'exit';
  }
  
  // 所需投资
  const requiredInvestment = estimateRequiredInvestment(goodsId);
  
  return {
    goodsId,
    opportunityScore,
    demandGrowth,
    supplyGap,
    profitPotential,
    competitionLevel,
    entryBarrier,
    recommendedAction,
    requiredInvestment,
  };
}

/**
 * 统计竞争者数量
 */
function countCompetitors(world: GameWorld, goodsId: number): number {
  let count = 0;
  
  for (let companyId = 0; companyId < world.companies.count; companyId++) {
    const idx = companyId * GOODS_COUNT + goodsId;
    if (world.trades.cumulativeSalesQuantity[idx] > 0) {
      count++;
    }
  }
  
  return count;
}

/**
 * 计算进入壁垒
 */
function calculateEntryBarrier(goodsId: number): number {
  // 找能生产该商品的配方
  for (const recipe of RECIPES) {
    if (recipe.outputs.some(o => o.goodsId === goodsId)) {
      const building = ALL_BUILDINGS.find(b => b.id === recipe.buildingTypeId);
      if (building) {
        // 根据建筑成本计算壁垒
        if (building.buildCost < 500000) return 0.2;
        if (building.buildCost < 1000000) return 0.4;
        if (building.buildCost < 5000000) return 0.6;
        return 0.8;
      }
    }
  }
  
  return 0.5;
}

/**
 * 估算所需投资
 */
function estimateRequiredInvestment(goodsId: number): number {
  for (const recipe of RECIPES) {
    if (recipe.outputs.some(o => o.goodsId === goodsId)) {
      const building = ALL_BUILDINGS.find(b => b.id === recipe.buildingTypeId);
      if (building) {
        return building.buildCost * 2; // 建筑成本 + 运营资金
      }
    }
  }
  
  return 1000000;
}

// ==================== 执行计划 ====================

/**
 * 获取当前应执行的计划动作
 */
export function getCurrentPlanActions(
  world: GameWorld,
  companyId: number
): PlanAction[] {
  const plan = strategicPlans.get(companyId);
  if (!plan) return [];
  
  // 获取当前季度计划
  const currentYear = Math.floor(world.tick / TICKS_PER_YEAR) + 1;
  const currentQuarter = Math.floor((world.tick % TICKS_PER_YEAR) / (TICKS_PER_YEAR / 4)) + 1;
  
  const currentPlan = plan.quarterlyPlans.find(
    p => p.year === currentYear && p.quarter === currentQuarter
  );
  
  if (!currentPlan) return [];
  
  // 返回未执行的动作
  return currentPlan.actions.filter(a => !a.executed);
}

/**
 * 标记动作已执行
 */
export function markActionExecuted(
  world: GameWorld,
  companyId: number,
  actionIndex: number
): void {
  const plan = strategicPlans.get(companyId);
  if (!plan) return;
  
  const currentYear = Math.floor(world.tick / TICKS_PER_YEAR) + 1;
  const currentQuarter = Math.floor((world.tick % TICKS_PER_YEAR) / (TICKS_PER_YEAR / 4)) + 1;
  
  const currentPlan = plan.quarterlyPlans.find(
    p => p.year === currentYear && p.quarter === currentQuarter
  );
  
  if (currentPlan && currentPlan.actions[actionIndex]) {
    currentPlan.actions[actionIndex].executed = true;
    currentPlan.actions[actionIndex].executedTick = world.tick;
  }
}

/**
 * 获取战略摘要
 */
export function getStrategySummary(companyId: number): {
  currentStrategy: StrategyType;
  activeGoals: number;
  completedGoals: number;
  overallProgress: number;
} | null {
  const plan = strategicPlans.get(companyId);
  if (!plan) return null;
  
  const activeGoals = plan.goals.filter(g => g.status === 'active').length;
  const completedGoals = plan.goals.filter(g => g.status === 'completed').length;
  const overallProgress = plan.goals.length > 0
    ? plan.goals.reduce((sum, g) => sum + g.progress, 0) / plan.goals.length
    : 0;
  
  return {
    currentStrategy: plan.currentStrategy,
    activeGoals,
    completedGoals,
    overallProgress,
  };
}