/**
 * AI历史学习系统
 * 
 * 基于历史数据学习和改进决策
 * 
 * 设计目标：
 * 1. 记录决策和结果
 * 2. 识别成功和失败模式
 * 3. 动态调整决策参数
 * 4. 提供经验驱动的建议
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import { AIDecision } from './AIDecisionEngine';
import { AIPersonality } from './AIPersonality';
import { ALL_GOODS } from '@/data/goods';

// ==================== 类型定义 ====================

/**
 * 决策记录
 */
export interface DecisionRecord {
  id: number;
  tick: number;
  companyId: number;
  
  // 决策内容
  decision: AIDecision;
  
  // 执行时的状态
  preState: {
    cash: number;
    inventoryValue: number;
    goodsPrice?: number;
    marketShare?: number;
  };
  
  // 结果（执行后一段时间评估）
  outcome?: {
    evaluatedTick: number;
    profitChange: number;
    cashChange: number;
    priceChange?: number;
    success: boolean;
    score: number;           // -100 to 100
  };
  
  // 是否已评估
  evaluated: boolean;
}

/**
 * 学习模式
 */
export interface LearnedPattern {
  id: string;
  type: 'success' | 'failure' | 'neutral';
  
  // 模式特征
  conditions: {
    priceAboveBase?: boolean;      // 价格高于基准
    priceTrend?: 'up' | 'down' | 'sideways';
    supplyDemandRatio?: 'high' | 'low' | 'balanced';
    inventoryLevel?: 'high' | 'medium' | 'low';
    cashLevel?: 'rich' | 'normal' | 'poor';
    marketPosition?: 'dominant' | 'competitive' | 'weak';
  };
  
  // 决策类型
  decisionType: AIDecision['type'];
  action: string;
  
  // 统计
  occurrences: number;
  successRate: number;
  averageScore: number;
  
  // 置信度
  confidence: number;
  
  // 最后更新时间
  lastUpdated: number;
}

/**
 * 学习参数
 */
export interface LearningParameters {
  // 价格相关
  optimalBuyPriceRatio: number;      // 最优买入价格/基准价
  optimalSellPriceRatio: number;     // 最优卖出价格/基准价
  
  // 数量相关
  optimalBuyQuantityRatio: number;   // 最优买入量/日需求
  optimalSellQuantityRatio: number;  // 最优卖出量/库存
  
  // 时机相关
  buyOnPriceDrop: number;            // 价格下跌多少触发买入
  sellOnPriceRise: number;           // 价格上涨多少触发卖出
  
  // 库存相关
  targetInventoryDays: number;       // 目标库存天数
  
  // 扩张相关
  expansionCashThreshold: number;    // 扩张现金阈值
}

/**
 * 公司学习存储
 */
export interface CompanyLearningStore {
  companyId: number;
  
  // 决策记录
  decisionHistory: DecisionRecord[];
  maxHistorySize: number;
  
  // 学习到的模式
  patterns: LearnedPattern[];
  
  // 学习参数
  parameters: LearningParameters;
  
  // 性能统计
  performance: {
    totalDecisions: number;
    successfulDecisions: number;
    averageScore: number;
    recentTrend: number;           // 近期趋势
  };
  
  // 上次学习时间
  lastLearningTick: number;
}

// ==================== 存储管理 ====================

// 公司学习存储
const learningStores = new Map<number, CompanyLearningStore>();

// 决策ID计数器
let decisionIdCounter = 0;

/**
 * 获取公司学习存储
 */
export function getLearningStore(companyId: number): CompanyLearningStore | null {
  return learningStores.get(companyId) || null;
}

/**
 * 初始化公司学习存储
 */
export function initializeLearningStore(
  companyId: number,
  personality: AIPersonality
): CompanyLearningStore {
  const store: CompanyLearningStore = {
    companyId,
    decisionHistory: [],
    maxHistorySize: 1000,
    patterns: [],
    parameters: initializeParameters(personality),
    performance: {
      totalDecisions: 0,
      successfulDecisions: 0,
      averageScore: 0,
      recentTrend: 0,
    },
    lastLearningTick: 0,
  };
  
  learningStores.set(companyId, store);
  return store;
}

/**
 * 初始化学习参数
 */
function initializeParameters(personality: AIPersonality): LearningParameters {
  return {
    optimalBuyPriceRatio: 0.95 - personality.pricingBias * 0.1,
    optimalSellPriceRatio: 1.05 + personality.pricingBias * 0.1,
    optimalBuyQuantityRatio: 0.5 + personality.riskTolerance * 0.3,
    optimalSellQuantityRatio: 0.3 + personality.riskTolerance * 0.2,
    buyOnPriceDrop: 0.05 + (1 - personality.riskTolerance) * 0.05,
    sellOnPriceRise: 0.05 + (1 - personality.riskTolerance) * 0.05,
    targetInventoryDays: personality.targetInventoryDays,
    expansionCashThreshold: 0.3 + (1 - personality.expansionBias) * 0.2,
  };
}

// ==================== 决策记录 ====================

/**
 * 记录决策
 */
export function recordDecision(
  world: GameWorld,
  companyId: number,
  decision: AIDecision
): number {
  let store = learningStores.get(companyId);
  if (!store) {
    // 创建默认存储
    store = initializeLearningStore(companyId, {
      type: 'diversified',
      name: '',
      description: '',
      riskTolerance: 0.5,
      expansionBias: 0.5,
      pricingBias: 0,
      targetInventoryDays: 20,
      targetCashRatio: 0.3,
      marketAwareness: 0.5,
      competitiveSensitivity: 0.5,
      longTermFocus: 0.5,
      specializationDegree: 0.5,
      innovationInvestment: 0.05,
      decisionFrequency: 1,
      preferredCategories: [],
      avoidedCategories: [],
    });
  }
  
  // 创建记录
  const record: DecisionRecord = {
    id: ++decisionIdCounter,
    tick: world.tick,
    companyId,
    decision: { ...decision },
    preState: {
      cash: world.companies.cash[companyId],
      inventoryValue: calculateInventoryValue(world, companyId),
    },
    evaluated: false,
  };
  
  // 添加商品相关状态
  if (decision.params.goodsId !== undefined) {
    const goodsId = decision.params.goodsId as number;
    record.preState.goodsPrice = world.goods.prices[goodsId];
  }
  
  // 添加到历史
  store.decisionHistory.push(record);
  
  // 限制历史大小
  if (store.decisionHistory.length > store.maxHistorySize) {
    store.decisionHistory = store.decisionHistory.slice(-store.maxHistorySize);
  }
  
  store.performance.totalDecisions++;
  
  return record.id;
}

/**
 * 计算库存价值
 */
function calculateInventoryValue(world: GameWorld, companyId: number): number {
  let value = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    const qty = world.companies.inventories[companyId * GOODS_COUNT + i];
    value += qty * world.goods.prices[i];
  }
  return value;
}

// ==================== 结果评估 ====================

/**
 * 评估待评估的决策
 */
export function evaluatePendingDecisions(
  world: GameWorld,
  companyId: number
): void {
  const store = learningStores.get(companyId);
  if (!store) return;
  
  const evaluationDelay = TICKS_PER_DAY * 3; // 3天后评估
  
  for (const record of store.decisionHistory) {
    if (record.evaluated) continue;
    if (world.tick - record.tick < evaluationDelay) continue;
    
    // 评估结果
    const outcome = evaluateDecisionOutcome(world, companyId, record);
    record.outcome = outcome;
    record.evaluated = true;
    
    // 更新性能统计
    if (outcome && outcome.success) {
      store.performance.successfulDecisions++;
    }
    
    // 更新平均分
    const totalEvaluated = store.decisionHistory.filter(d => d.evaluated).length;
    const totalScore = store.decisionHistory
      .filter(d => d.evaluated && d.outcome)
      .reduce((sum, d) => sum + (d.outcome?.score || 0), 0);
    store.performance.averageScore = totalScore / totalEvaluated;
    
    // 更新近期趋势
    const recentDecisions = store.decisionHistory
      .filter(d => d.evaluated && d.outcome && d.tick > world.tick - TICKS_PER_DAY * 30)
      .slice(-50);
    
    if (recentDecisions.length >= 10) {
      const recentAvg = recentDecisions.reduce((sum, d) => sum + (d.outcome?.score || 0), 0) / recentDecisions.length;
      store.performance.recentTrend = recentAvg - store.performance.averageScore;
    }
  }
}

/**
 * 评估单个决策结果
 */
function evaluateDecisionOutcome(
  world: GameWorld,
  companyId: number,
  record: DecisionRecord
): DecisionRecord['outcome'] {
  const currentCash = world.companies.cash[companyId];
  const currentInventoryValue = calculateInventoryValue(world, companyId);
  
  const cashChange = currentCash - record.preState.cash;
  const inventoryChange = currentInventoryValue - record.preState.inventoryValue;
  const profitChange = cashChange + inventoryChange; // 简化的利润变化
  
  let priceChange: number | undefined;
  if (record.preState.goodsPrice !== undefined && record.decision.params.goodsId !== undefined) {
    const goodsId = record.decision.params.goodsId as number;
    priceChange = (world.goods.prices[goodsId] - record.preState.goodsPrice) / record.preState.goodsPrice;
  }
  
  // 计算得分
  let score = 0;
  
  switch (record.decision.type) {
    case 'trading':
      score = evaluateTradingOutcome(record, profitChange, priceChange);
      break;
    case 'production':
      score = evaluateProductionOutcome(record, profitChange);
      break;
    case 'investment':
      score = evaluateInvestmentOutcome(record, profitChange, cashChange);
      break;
    case 'pricing':
      score = evaluatePricingOutcome(record, profitChange, priceChange);
      break;
    default:
      score = profitChange > 0 ? 50 : -50;
  }
  
  // 限制范围
  score = Math.max(-100, Math.min(100, score));
  
  return {
    evaluatedTick: world.tick,
    profitChange,
    cashChange,
    priceChange,
    success: score > 0,
    score,
  };
}

/**
 * 评估交易结果
 */
function evaluateTradingOutcome(
  record: DecisionRecord,
  profitChange: number,
  priceChange?: number
): number {
  let score = 0;
  
  if (record.decision.action === 'buy') {
    // 买入后价格上涨 = 好决策
    if (priceChange !== undefined) {
      score += priceChange * 200; // -1到1 映射到 -200到200
    }
    // 利润增加
    score += Math.min(50, profitChange / 1000);
  } else if (record.decision.action === 'sell') {
    // 卖出后价格下跌 = 好决策
    if (priceChange !== undefined) {
      score -= priceChange * 200;
    }
    // 现金增加
    score += Math.min(50, profitChange / 1000);
  }
  
  return score;
}

/**
 * 评估生产结果
 */
function evaluateProductionOutcome(
  record: DecisionRecord,
  profitChange: number
): number {
  // 生产决策主要看利润变化
  return Math.min(100, Math.max(-100, profitChange / 5000 * 100));
}

/**
 * 评估投资结果
 */
function evaluateInvestmentOutcome(
  record: DecisionRecord,
  profitChange: number,
  cashChange: number
): number {
  // 投资决策需要更长时间评估，这里给予温和评分
  if (profitChange > 0) {
    return Math.min(60, profitChange / 10000 * 60);
  } else if (cashChange < -100000) {
    // 大额投资后现金减少正常
    return 20;
  }
  return -20;
}

/**
 * 评估定价结果
 */
function evaluatePricingOutcome(
  record: DecisionRecord,
  profitChange: number,
  priceChange?: number
): number {
  // 定价后利润变化
  return Math.min(100, Math.max(-100, profitChange / 5000 * 100));
}

// ==================== 模式学习 ====================

/**
 * 执行学习过程
 */
export function runLearningCycle(
  world: GameWorld,
  companyId: number
): void {
  const store = learningStores.get(companyId);
  if (!store) return;
  
  // 每天学习一次
  if (world.tick - store.lastLearningTick < TICKS_PER_DAY) return;
  
  // 评估待评估决策
  evaluatePendingDecisions(world, companyId);
  
  // 更新模式
  updatePatterns(store);
  
  // 调整参数
  adjustParameters(store);
  
  store.lastLearningTick = world.tick;
}

/**
 * 更新学习模式
 */
function updatePatterns(store: CompanyLearningStore): void {
  // 获取已评估的决策
  const evaluatedDecisions = store.decisionHistory.filter(d => d.evaluated && d.outcome);
  
  if (evaluatedDecisions.length < 20) return; // 需要足够样本
  
  // 按决策类型和行动分组
  const groups = new Map<string, DecisionRecord[]>();
  
  for (const record of evaluatedDecisions) {
    const key = `${record.decision.type}-${record.decision.action}`;
    const existing = groups.get(key) || [];
    existing.push(record);
    groups.set(key, existing);
  }
  
  // 为每组生成模式
  for (const [key, records] of groups) {
    if (records.length < 5) continue;
    
    const [type, action] = key.split('-');
    const pattern = analyzePatternFromRecords(records, type as AIDecision['type'], action);
    
    // 更新或添加模式
    const existingIndex = store.patterns.findIndex(
      p => p.decisionType === type && p.action === action
    );
    
    if (existingIndex >= 0) {
      store.patterns[existingIndex] = pattern;
    } else {
      store.patterns.push(pattern);
    }
  }
  
  // 限制模式数量
  if (store.patterns.length > 50) {
    // 保留置信度高的
    store.patterns.sort((a, b) => b.confidence - a.confidence);
    store.patterns = store.patterns.slice(0, 50);
  }
}

/**
 * 从记录分析模式
 */
function analyzePatternFromRecords(
  records: DecisionRecord[],
  decisionType: AIDecision['type'],
  action: string
): LearnedPattern {
  const successRecords = records.filter(r => r.outcome && r.outcome.success);
  const successRate = successRecords.length / records.length;
  const averageScore = records.reduce((sum, r) => sum + (r.outcome?.score || 0), 0) / records.length;
  
  // 分析条件特征
  const conditions: LearnedPattern['conditions'] = {};
  
  // 分析价格条件（只对交易决策）
  if (decisionType === 'trading') {
    const priceAboveBaseCount = records.filter(r => {
      if (r.decision.params.goodsId === undefined || r.preState.goodsPrice === undefined) return false;
      const goods = ALL_GOODS.find(g => g.id === r.decision.params.goodsId);
      return goods && r.preState.goodsPrice > goods.basePrice;
    }).length;
    
    conditions.priceAboveBase = priceAboveBaseCount > records.length / 2;
  }
  
  // 确定类型
  let type: LearnedPattern['type'] = 'neutral';
  if (successRate > 0.6 && averageScore > 20) {
    type = 'success';
  } else if (successRate < 0.4 && averageScore < -20) {
    type = 'failure';
  }
  
  // 置信度基于样本量
  const confidence = Math.min(0.9, 0.3 + records.length * 0.02);
  
  return {
    id: `${decisionType}-${action}-${Date.now()}`,
    type,
    conditions,
    decisionType,
    action,
    occurrences: records.length,
    successRate,
    averageScore,
    confidence,
    lastUpdated: Date.now(),
  };
}

/**
 * 调整学习参数
 */
function adjustParameters(store: CompanyLearningStore): void {
  const recentDecisions = store.decisionHistory
    .filter(d => d.evaluated && d.outcome)
    .slice(-100);
  
  if (recentDecisions.length < 30) return;
  
  // 分析买入决策
  const buyDecisions = recentDecisions.filter(
    d => d.decision.type === 'trading' && d.decision.action === 'buy'
  );
  
  if (buyDecisions.length >= 10) {
    const successfulBuys = buyDecisions.filter(d => d.outcome && d.outcome.success);
    
    // 分析成功买入的价格特征
    const avgSuccessPriceRatio = successfulBuys
      .filter(d => d.decision.params.price && d.decision.params.goodsId !== undefined)
      .map(d => {
        const goods = ALL_GOODS.find(g => g.id === d.decision.params.goodsId);
        return goods ? (d.decision.params.price as number) / goods.basePrice : 1;
      })
      .reduce((sum, r) => sum + r, 0) / (successfulBuys.length || 1);
    
    // 调整最优买入价格比例
    if (avgSuccessPriceRatio > 0) {
      store.parameters.optimalBuyPriceRatio = 
        store.parameters.optimalBuyPriceRatio * 0.9 + avgSuccessPriceRatio * 0.1;
    }
  }
  
  // 分析卖出决策
  const sellDecisions = recentDecisions.filter(
    d => d.decision.type === 'trading' && d.decision.action === 'sell'
  );
  
  if (sellDecisions.length >= 10) {
    const successfulSells = sellDecisions.filter(d => d.outcome && d.outcome.success);
    
    const avgSuccessPriceRatio = successfulSells
      .filter(d => d.decision.params.price && d.decision.params.goodsId !== undefined)
      .map(d => {
        const goods = ALL_GOODS.find(g => g.id === d.decision.params.goodsId);
        return goods ? (d.decision.params.price as number) / goods.basePrice : 1;
      })
      .reduce((sum, r) => sum + r, 0) / (successfulSells.length || 1);
    
    if (avgSuccessPriceRatio > 0) {
      store.parameters.optimalSellPriceRatio = 
        store.parameters.optimalSellPriceRatio * 0.9 + avgSuccessPriceRatio * 0.1;
    }
  }
  
  // 根据整体表现调整风险参数
  if (store.performance.recentTrend > 10) {
    // 近期表现好，可以更激进
    store.parameters.optimalBuyQuantityRatio *= 1.05;
    store.parameters.optimalSellQuantityRatio *= 0.95;
  } else if (store.performance.recentTrend < -10) {
    // 近期表现差，更保守
    store.parameters.optimalBuyQuantityRatio *= 0.95;
    store.parameters.optimalSellQuantityRatio *= 1.05;
  }
  
  // 限制参数范围
  store.parameters.optimalBuyPriceRatio = Math.max(0.5, Math.min(1.2, store.parameters.optimalBuyPriceRatio));
  store.parameters.optimalSellPriceRatio = Math.max(0.8, Math.min(2.0, store.parameters.optimalSellPriceRatio));
  store.parameters.optimalBuyQuantityRatio = Math.max(0.1, Math.min(1.0, store.parameters.optimalBuyQuantityRatio));
  store.parameters.optimalSellQuantityRatio = Math.max(0.1, Math.min(0.9, store.parameters.optimalSellQuantityRatio));
}

// ==================== 决策建议 ====================

/**
 * 获取学习建议
 */
export function getLearningAdvice(
  world: GameWorld,
  companyId: number,
  proposedDecision: AIDecision
): {
  recommendation: 'proceed' | 'caution' | 'avoid';
  adjustedParams: AIDecision['params'];
  reason: string;
  confidence: number;
} {
  const store = learningStores.get(companyId);
  
  if (!store || store.performance.totalDecisions < 50) {
    // 经验不足，默认建议
    return {
      recommendation: 'proceed',
      adjustedParams: proposedDecision.params,
      reason: '经验数据不足',
      confidence: 0.3,
    };
  }
  
  // 查找匹配的模式
  const matchingPattern = store.patterns.find(
    p => p.decisionType === proposedDecision.type && p.action === proposedDecision.action
  );
  
  if (!matchingPattern) {
    return {
      recommendation: 'proceed',
      adjustedParams: proposedDecision.params,
      reason: '无相关经验',
      confidence: 0.4,
    };
  }
  
  // 基于模式给出建议
  let recommendation: 'proceed' | 'caution' | 'avoid';
  let reason: string;
  
  if (matchingPattern.type === 'success') {
    recommendation = 'proceed';
    reason = `历史成功率${(matchingPattern.successRate * 100).toFixed(0)}%`;
  } else if (matchingPattern.type === 'failure') {
    recommendation = 'avoid';
    reason = `历史失败率高，平均得分${matchingPattern.averageScore.toFixed(0)}`;
  } else {
    recommendation = 'caution';
    reason = `历史表现中性`;
  }
  
  // 调整参数
  const adjustedParams = { ...proposedDecision.params };
  
  if (proposedDecision.type === 'trading') {
    // 根据学习参数调整价格和数量
    if (adjustedParams.price && proposedDecision.action === 'buy') {
      const goods = ALL_GOODS.find(g => g.id === adjustedParams.goodsId);
      if (goods) {
        const optimalPrice = goods.basePrice * store.parameters.optimalBuyPriceRatio;
        adjustedParams.price = Math.min(adjustedParams.price as number, optimalPrice);
      }
    }
    
    if (adjustedParams.price && proposedDecision.action === 'sell') {
      const goods = ALL_GOODS.find(g => g.id === adjustedParams.goodsId);
      if (goods) {
        const optimalPrice = goods.basePrice * store.parameters.optimalSellPriceRatio;
        adjustedParams.price = Math.max(adjustedParams.price as number, optimalPrice * 0.9);
      }
    }
    
    if (adjustedParams.quantity) {
      if (proposedDecision.action === 'buy') {
        adjustedParams.quantity = (adjustedParams.quantity as number) * store.parameters.optimalBuyQuantityRatio;
      } else {
        adjustedParams.quantity = (adjustedParams.quantity as number) * store.parameters.optimalSellQuantityRatio;
      }
    }
  }
  
  return {
    recommendation,
    adjustedParams,
    reason,
    confidence: matchingPattern.confidence,
  };
}

/**
 * 获取最佳历史策略
 */
export function getBestHistoricalStrategies(
  companyId: number,
  limit: number = 5
): LearnedPattern[] {
  const store = learningStores.get(companyId);
  if (!store) return [];
  
  return store.patterns
    .filter(p => p.type === 'success')
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, limit);
}

/**
 * 获取应避免的策略
 */
export function getStrategiesToAvoid(
  companyId: number,
  limit: number = 5
): LearnedPattern[] {
  const store = learningStores.get(companyId);
  if (!store) return [];
  
  return store.patterns
    .filter(p => p.type === 'failure')
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, limit);
}

/**
 * 获取学习统计
 */
export function getLearningStats(companyId: number): {
  totalDecisions: number;
  successRate: number;
  averageScore: number;
  recentTrend: number;
  patternsLearned: number;
  topPattern: LearnedPattern | null;
} | null {
  const store = learningStores.get(companyId);
  if (!store) return null;
  
  const successRate = store.performance.totalDecisions > 0
    ? store.performance.successfulDecisions / store.performance.totalDecisions
    : 0;
  
  const topPattern = store.patterns
    .filter(p => p.type === 'success')
    .sort((a, b) => b.averageScore - a.averageScore)[0] || null;
  
  return {
    totalDecisions: store.performance.totalDecisions,
    successRate,
    averageScore: store.performance.averageScore,
    recentTrend: store.performance.recentTrend,
    patternsLearned: store.patterns.length,
    topPattern,
  };
}

/**
 * 获取学习到的最优参数
 */
export function getOptimalParameters(companyId: number): LearningParameters | null {
  const store = learningStores.get(companyId);
  return store?.parameters || null;
}