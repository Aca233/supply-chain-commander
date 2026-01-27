/**
 * AI决策系统优化层
 * 
 * 实现：
 * 1. 分层决策架构（快速/标准/深度）
 * 2. 决策缓存
 * 3. 增量更新
 * 4. 批量处理
 */

import { GameWorld } from '@/core/world/GameWorld';
import { AIDecision, CompanyAssessment, assessCompanyState } from './AIDecisionEngine';
import { AI_PERSONALITIES, AIPersonality } from './AIPersonality';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT } from '@/core/constants';
import { createBuyOrder, createSellOrder } from '@/core/market/OrderBook';
import { ALL_GOODS } from '@/data/goods';

// ==================== 决策层级 ====================

export type DecisionTier = 'fast' | 'standard' | 'deep';

interface TierConfig {
  maxDecisions: number;
  modulesEnabled: string[];
  cacheTime: number; // tick数
}

const TIER_CONFIGS: Record<DecisionTier, TierConfig> = {
  fast: {
    maxDecisions: 3,
    modulesEnabled: ['trading'],
    cacheTime: 10,
  },
  standard: {
    maxDecisions: 6,
    modulesEnabled: ['trading', 'production', 'pricing'],
    cacheTime: 30,
  },
  deep: {
    maxDecisions: 12,
    modulesEnabled: ['trading', 'production', 'pricing', 'investment', 'strategy'],
    cacheTime: 60,
  },
};

// ==================== 决策缓存 ====================

interface CachedAssessment {
  assessment: CompanyAssessment;
  tick: number;
}

interface CachedDecisions {
  decisions: AIDecision[];
  tick: number;
  tier: DecisionTier;
}

interface CompanyState {
  lastCash: number;
  lastInventoryHash: number;
  lastBuildingCount: number;
  significantChange: boolean;
}

class AIDecisionCache {
  private assessmentCache: Map<number, CachedAssessment> = new Map();
  private decisionCache: Map<number, CachedDecisions> = new Map();
  private companyStates: Map<number, CompanyState> = new Map();
  
  /**
   * 获取或计算公司评估
   */
  getAssessment(
    world: GameWorld,
    companyId: number,
    maxAge: number
  ): CompanyAssessment {
    const cached = this.assessmentCache.get(companyId);
    
    if (cached && world.tick - cached.tick < maxAge) {
      return cached.assessment;
    }
    
    const assessment = assessCompanyState(world, companyId);
    this.assessmentCache.set(companyId, {
      assessment,
      tick: world.tick,
    });
    
    return assessment;
  }
  
  /**
   * 获取缓存的决策
   */
  getCachedDecisions(
    companyId: number,
    currentTick: number,
    tier: DecisionTier
  ): AIDecision[] | null {
    const cached = this.decisionCache.get(companyId);
    
    if (!cached) return null;
    
    const config = TIER_CONFIGS[tier];
    if (currentTick - cached.tick > config.cacheTime) return null;
    
    // 如果请求更深层次的决策，缓存无效
    if (getTierDepth(tier) > getTierDepth(cached.tier)) return null;
    
    return cached.decisions;
  }
  
  /**
   * 缓存决策
   */
  cacheDecisions(
    companyId: number,
    decisions: AIDecision[],
    tick: number,
    tier: DecisionTier
  ): void {
    this.decisionCache.set(companyId, {
      decisions,
      tick,
      tier,
    });
  }
  
  /**
   * 检测公司状态是否有显著变化
   */
  hasSignificantChange(world: GameWorld, companyId: number): boolean {
    const currentState = this.getCurrentState(world, companyId);
    const prevState = this.companyStates.get(companyId);
    
    if (!prevState) {
      this.companyStates.set(companyId, currentState);
      return true;
    }
    
    // 检测变化
    const cashChange = Math.abs(currentState.lastCash - prevState.lastCash) / 
      Math.max(prevState.lastCash, 1);
    const inventoryChange = currentState.lastInventoryHash !== prevState.lastInventoryHash;
    const buildingChange = currentState.lastBuildingCount !== prevState.lastBuildingCount;
    
    const significant = cashChange > 0.1 || inventoryChange || buildingChange;
    
    if (significant) {
      this.companyStates.set(companyId, currentState);
    }
    
    return significant;
  }
  
  private getCurrentState(world: GameWorld, companyId: number): CompanyState {
    let inventoryHash = 0;
    for (let i = 0; i < GOODS_COUNT; i++) {
      const qty = world.companies.inventories[companyId * GOODS_COUNT + i];
      if (qty > 0) {
        inventoryHash += i * 1000 + Math.floor(qty);
      }
    }
    
    let buildingCount = 0;
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === companyId) {
        buildingCount++;
      }
    }
    
    return {
      lastCash: world.companies.cash[companyId],
      lastInventoryHash: inventoryHash % 1000000,
      lastBuildingCount: buildingCount,
      significantChange: false,
    };
  }
  
  /**
   * 清理过期缓存
   */
  cleanup(currentTick: number): void {
    for (const [companyId, cached] of this.assessmentCache) {
      if (currentTick - cached.tick > 100) {
        this.assessmentCache.delete(companyId);
      }
    }
    
    for (const [companyId, cached] of this.decisionCache) {
      if (currentTick - cached.tick > 120) {
        this.decisionCache.delete(companyId);
      }
    }
  }
  
  /**
   * 清空所有缓存
   */
  clear(): void {
    this.assessmentCache.clear();
    this.decisionCache.clear();
    this.companyStates.clear();
  }
}

function getTierDepth(tier: DecisionTier): number {
  switch (tier) {
    case 'fast': return 1;
    case 'standard': return 2;
    case 'deep': return 3;
  }
}

// 全局缓存实例
const decisionCache = new AIDecisionCache();

// ==================== 快速决策生成器 ====================

/**
 * 快速交易决策
 * 只基于库存和价格，不调用复杂模块
 */
function generateFastTradingDecisions(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality
): AIDecision[] {
  const decisions: AIDecision[] = [];
  const c = world.companies;
  const g = world.goods;
  
  // 快速卖出决策
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const invIdx = companyId * GOODS_COUNT + goodsId;
    const inventory = c.inventories[invIdx];
    const reserved = c.inventoryReserved[invIdx];
    const available = inventory - reserved;
    
    if (available <= 5) continue;
    
    const goods = ALL_GOODS[goodsId];
    if (!goods) continue;
    
    const price = g.prices[goodsId];
    const basePrice = goods.basePrice;
    
    // 简化的定价策略
    const sellPrice = price * (0.95 + personality.pricingBias * 0.1);
    const sellQty = Math.min(available * 0.5, 200);
    
    if (sellPrice >= basePrice * 0.5 && sellQty >= 1) {
      decisions.push({
        type: 'trading',
        companyId,
        action: 'sell',
        params: { goodsId, quantity: sellQty, price: sellPrice },
        priority: 6,
        expectedProfit: sellQty * sellPrice,
        confidence: 0.7,
      });
    }
  }
  
  return decisions.slice(0, 5);
}

/**
 * 快速买入决策
 */
function generateFastBuyDecisions(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 现金不足时跳过
  if (assessment.cash < 50000) return decisions;
  
  // 根据瓶颈商品采购
  for (const goodsId of assessment.bottlenecks.slice(0, 3)) {
    const goods = ALL_GOODS[goodsId];
    if (!goods) continue;
    
    const price = world.goods.prices[goodsId];
    const maxPrice = price * 1.1;
    const buyQty = Math.min(50, assessment.cash / maxPrice * 0.1);
    
    if (buyQty >= 5) {
      decisions.push({
        type: 'trading',
        companyId,
        action: 'buy',
        params: { goodsId, quantity: buyQty, price: maxPrice },
        priority: 5,
        expectedProfit: 0,
        confidence: 0.6,
      });
    }
  }
  
  return decisions;
}

// ==================== 批量处理器 ====================

interface BatchResult {
  companyId: number;
  decisions: AIDecision[];
  tier: DecisionTier;
  executedCount: number;
}

/**
 * 决定公司应该使用的决策层级
 */
function determineTier(
  world: GameWorld,
  companyId: number,
  baseInterval: number
): DecisionTier {
  // 根据tick周期决定
  const tickMod = world.tick % 60;
  
  // 每60tick进行一次深度决策
  if (tickMod === companyId % 60) {
    return 'deep';
  }
  
  // 检测是否有重大变化
  if (decisionCache.hasSignificantChange(world, companyId)) {
    return 'standard';
  }
  
  // 默认快速决策
  return 'fast';
}

/**
 * 批量处理AI公司决策
 */
export function batchProcessAIDecisions(
  world: GameWorld,
  companyIds: number[]
): BatchResult[] {
  const results: BatchResult[] = [];
  
  // 按层级分组
  const fastGroup: number[] = [];
  const standardGroup: number[] = [];
  const deepGroup: number[] = [];
  
  for (const companyId of companyIds) {
    const tier = determineTier(world, companyId, 20);
    switch (tier) {
      case 'fast':
        fastGroup.push(companyId);
        break;
      case 'standard':
        standardGroup.push(companyId);
        break;
      case 'deep':
        deepGroup.push(companyId);
        break;
    }
  }
  
  // 处理快速组（批量处理）
  for (const companyId of fastGroup) {
    const result = processCompanyFast(world, companyId);
    results.push(result);
  }
  
  // 处理标准组
  for (const companyId of standardGroup) {
    const result = processCompanyStandard(world, companyId);
    results.push(result);
  }
  
  // 处理深度组（限制数量）
  const deepLimit = Math.min(deepGroup.length, 3);
  for (let i = 0; i < deepLimit; i++) {
    const companyId = deepGroup[i];
    const result = processCompanyDeep(world, companyId);
    results.push(result);
  }
  
  // 剩余深度组降级为标准
  for (let i = deepLimit; i < deepGroup.length; i++) {
    const companyId = deepGroup[i];
    const result = processCompanyStandard(world, companyId);
    results.push(result);
  }
  
  // 定期清理缓存
  if (world.tick % 100 === 0) {
    decisionCache.cleanup(world.tick);
  }
  
  return results;
}

/**
 * 快速处理单个公司
 */
function processCompanyFast(world: GameWorld, companyId: number): BatchResult {
  // 尝试使用缓存
  const cached = decisionCache.getCachedDecisions(companyId, world.tick, 'fast');
  if (cached) {
    return {
      companyId,
      decisions: cached,
      tier: 'fast',
      executedCount: 0,
    };
  }
  
  // 获取人格
  const personality = getSimplePersonality(companyId);
  
  // 获取评估（可能来自缓存）
  const assessment = decisionCache.getAssessment(world, companyId, 10);
  
  // 生成快速决策
  const decisions = [
    ...generateFastTradingDecisions(world, companyId, personality),
    ...generateFastBuyDecisions(world, companyId, personality, assessment),
  ];
  
  // 排序并限制
  decisions.sort((a, b) => b.priority - a.priority);
  const limited = decisions.slice(0, TIER_CONFIGS.fast.maxDecisions);
  
  // 执行决策
  let executedCount = 0;
  for (const decision of limited) {
    if (executeSimpleDecision(world, decision)) {
      executedCount++;
    }
  }
  
  // 缓存决策
  decisionCache.cacheDecisions(companyId, limited, world.tick, 'fast');
  
  return {
    companyId,
    decisions: limited,
    tier: 'fast',
    executedCount,
  };
}

/**
 * 标准处理单个公司
 */
function processCompanyStandard(world: GameWorld, companyId: number): BatchResult {
  const cached = decisionCache.getCachedDecisions(companyId, world.tick, 'standard');
  if (cached) {
    return {
      companyId,
      decisions: cached,
      tier: 'standard',
      executedCount: 0,
    };
  }
  
  const personality = getSimplePersonality(companyId);
  const assessment = decisionCache.getAssessment(world, companyId, 20);
  
  // 生成更多决策
  const decisions: AIDecision[] = [
    ...generateFastTradingDecisions(world, companyId, personality),
    ...generateFastBuyDecisions(world, companyId, personality, assessment),
    ...generateProductionAdjustments(world, companyId, assessment),
  ];
  
  decisions.sort((a, b) => b.priority - a.priority);
  const limited = decisions.slice(0, TIER_CONFIGS.standard.maxDecisions);
  
  let executedCount = 0;
  for (const decision of limited) {
    if (executeSimpleDecision(world, decision)) {
      executedCount++;
    }
  }
  
  decisionCache.cacheDecisions(companyId, limited, world.tick, 'standard');
  
  return {
    companyId,
    decisions: limited,
    tier: 'standard',
    executedCount,
  };
}

/**
 * 深度处理单个公司（调用完整决策引擎）
 */
function processCompanyDeep(world: GameWorld, companyId: number): BatchResult {
  // 深度决策使用完整的AI决策引擎
  // 这里只是一个简化实现，实际会调用 runAIDecisionCycle
  
  const personality = getSimplePersonality(companyId);
  const assessment = decisionCache.getAssessment(world, companyId, 5);
  
  const decisions: AIDecision[] = [
    ...generateFastTradingDecisions(world, companyId, personality),
    ...generateFastBuyDecisions(world, companyId, personality, assessment),
    ...generateProductionAdjustments(world, companyId, assessment),
    ...generateInvestmentDecisionsSimple(world, companyId, personality, assessment),
  ];
  
  decisions.sort((a, b) => b.priority - a.priority);
  const limited = decisions.slice(0, TIER_CONFIGS.deep.maxDecisions);
  
  let executedCount = 0;
  for (const decision of limited) {
    if (executeSimpleDecision(world, decision)) {
      executedCount++;
    }
  }
  
  decisionCache.cacheDecisions(companyId, limited, world.tick, 'deep');
  
  return {
    companyId,
    decisions: limited,
    tier: 'deep',
    executedCount,
  };
}

// ==================== 辅助函数 ====================

/**
 * 获取简化人格（避免完整查找）
 */
function getSimplePersonality(companyId: number): AIPersonality {
  const types: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive', 'opportunist', 'cost_leader', 'diversified',
    'specialist', 'innovator', 'conservative', 'premium',
  ];
  const typeIndex = (companyId - 1) % types.length;
  return AI_PERSONALITIES[types[typeIndex]];
}

/**
 * 生成生产调整决策
 */
function generateProductionAdjustments(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 检查建筑效率
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    if (!world.buildings.isActive[i]) continue;
    
    const efficiency = world.buildings.efficiencies[i];
    
    // 利润率低时减产
    if (assessment.profitMargin < 0.05 && efficiency > 0.5) {
      decisions.push({
        type: 'production',
        companyId,
        action: 'reduce_production',
        params: { buildingId: i, targetEfficiency: efficiency * 0.9 },
        priority: 5,
        expectedProfit: 0,
        confidence: 0.6,
      });
    }
    
    // 利润率高时增产
    if (assessment.profitMargin > 0.2 && efficiency < 1.5) {
      decisions.push({
        type: 'production',
        companyId,
        action: 'maintain_production',
        params: { buildingId: i, targetEfficiency: efficiency * 1.1 },
        priority: 4,
        expectedProfit: 0,
        confidence: 0.7,
      });
    }
  }
  
  return decisions;
}

/**
 * 简化的投资决策
 */
function generateInvestmentDecisionsSimple(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 只在现金充裕且利润率足够时考虑投资
  if (assessment.cashRatio < 0.3 || assessment.profitMargin < 0.1) {
    return decisions;
  }
  
  // 扩张型人格更倾向投资
  if (personality.expansionBias > 0.6 && assessment.cash > 1000000) {
    decisions.push({
      type: 'investment',
      companyId,
      action: 'build',
      params: { buildingTypeId: 0, cost: 100000 },
      priority: 3,
      expectedProfit: 0,
      confidence: 0.5,
    });
  }
  
  return decisions;
}

/**
 * 执行简单决策
 */
function executeSimpleDecision(world: GameWorld, decision: AIDecision): boolean {
  if (decision.type === 'trading') {
    const { companyId, action, params } = decision;
    const goodsId = params.goodsId as number;
    const quantity = params.quantity as number;
    const price = params.price as number;
    
    if (action === 'buy') {
      return createBuyOrder(world, companyId, goodsId, quantity, price) !== null;
    } else if (action === 'sell') {
      return createSellOrder(world, companyId, goodsId, quantity, price) !== null;
    }
  } else if (decision.type === 'production') {
    const buildingId = decision.params.buildingId as number;
    const targetEfficiency = decision.params.targetEfficiency as number;
    if (buildingId !== undefined && targetEfficiency !== undefined) {
      world.buildings.efficiencies[buildingId] = Math.max(0.3, Math.min(1.5, targetEfficiency));
      return true;
    }
  }
  
  return false;
}

// ==================== 导出 ====================

export { decisionCache };

/**
 * 优化版更新所有AI公司
 */
export function updateAllAICompaniesOptimized(world: GameWorld): Map<number, AIDecision[]> {
  const results = new Map<number, AIDecision[]>();
  
  // 收集所有AI公司ID
  const aiCompanyIds: number[] = [];
  for (let i = 0; i < world.companies.count; i++) {
    if (world.companies.isAI[i]) {
      aiCompanyIds.push(i);
    }
  }
  
  // 批量处理
  const batchResults = batchProcessAIDecisions(world, aiCompanyIds);
  
  for (const result of batchResults) {
    results.set(result.companyId, result.decisions);
  }
  
  return results;
}

/**
 * 获取优化器统计信息
 */
export function getOptimizerStats() {
  return {
    cacheSize: {
      assessments: (decisionCache as any).assessmentCache?.size || 0,
      decisions: (decisionCache as any).decisionCache?.size || 0,
      states: (decisionCache as any).companyStates?.size || 0,
    },
  };
}