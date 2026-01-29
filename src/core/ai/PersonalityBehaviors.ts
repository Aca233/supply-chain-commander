/**
 * AI人格行为模式模块
 * 
 * 为每种人格类型定义具体的行为模式和决策规则
 * 使AI的行为更加多样化和可预测
 * 
 * 设计目标：
 * 1. 定义每种人格在不同场景下的具体行为
 * 2. 提供决策权重和阈值配置
 * 3. 实现人格驱动的策略选择
 */

import { GameWorld } from '@/core/world/GameWorld';
import { PersonalityType, AIPersonality, AI_PERSONALITIES, getCategoryWeight } from './AIPersonality';
import { CompanyAssessment, AIDecision } from './AIDecisionEngine';
import { 
  GoodsProfitAnalysis, 
  MarketShareAnalysis,
  getCompanyProfitMargin,
  getCompanyMarketShare,
  getGoodsProfitMargin,
  analyzeGoodsProfit
} from './PrecisionCalculator';
import { 
  PricePrediction, 
  predictPrice, 
  calculateOptimalTradingTime 
} from './PricePredictor';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT } from '@/core/constants';

// ==================== 类型定义 ====================

/**
 * 行为场景
 */
export type BehaviorScenario = 
  | 'high_cash'           // 现金充裕
  | 'low_cash'            // 现金紧张
  | 'inventory_surplus'   // 库存过剩
  | 'inventory_shortage'  // 库存不足
  | 'market_opportunity'  // 市场机会
  | 'market_threat'       // 市场威胁
  | 'high_profit'         // 高利润期
  | 'low_profit'          // 低利润期
  | 'price_rising'        // 价格上涨
  | 'price_falling'       // 价格下跌
  | 'competitor_weak'     // 竞争者弱势
  | 'competitor_strong';  // 竞争者强势

/**
 * 行为动作
 */
export type BehaviorAction = 
  | 'aggressive_buy'      // 激进买入
  | 'conservative_buy'    // 保守买入
  | 'aggressive_sell'     // 激进卖出
  | 'conservative_sell'   // 保守卖出
  | 'hold'                // 持有观望
  | 'expand'              // 扩张投资
  | 'contract'            // 收缩规模
  | 'price_war'           // 价格战
  | 'premium_pricing'     // 溢价定价
  | 'market_making'       // 做市提供流动性
  | 'arbitrage'           // 套利交易
  | 'diversify'           // 分散化
  | 'concentrate';        // 集中化

/**
 * 行为模式定义
 */
export interface BehaviorPattern {
  personality: PersonalityType;
  
  // 场景-动作映射
  scenarioActions: Map<BehaviorScenario, BehaviorAction[]>;
  
  // 决策权重
  weights: {
    profitImportance: number;      // 利润重要性 (0-1)
    marketShareImportance: number; // 市场份额重要性 (0-1)
    cashFlowImportance: number;    // 现金流重要性 (0-1)
    riskAvoidance: number;         // 风险规避 (0-1)
    opportunitySeizing: number;    // 机会把握 (0-1)
    longTermPlanning: number;      // 长期规划 (0-1)
  };
  
  // 阈值配置
  thresholds: {
    buySignalStrength: number;     // 买入信号强度阈值 (-100 to 100)
    sellSignalStrength: number;    // 卖出信号强度阈值 (-100 to 100)
    profitMarginMin: number;       // 最低利润率阈值
    inventoryDaysMax: number;      // 最大库存天数
    cashRatioMin: number;          // 最低现金比例
    marketShareTarget: number;     // 目标市场份额
    priceDeviationMax: number;     // 最大价格偏离（相对基准价）
  };
  
  // 交易策略
  tradingStrategy: {
    buyAggressiveness: number;     // 买入激进度 (0-1)
    sellAggressiveness: number;    // 卖出激进度 (0-1)
    spreadPreference: number;      // 买卖价差偏好 (0-1, 高=宽价差)
    volumePreference: number;      // 交易量偏好 (0-1, 高=大单)
    timingPatience: number;        // 时机等待耐心 (0-1)
  };
  
  // 扩张策略
  expansionStrategy: {
    buildingPriority: number[];    // 优先建造的建筑类型ID
    maxBuildingsPerTick: number;   // 每tick最多建造数
    expansionCondition: (assessment: CompanyAssessment) => boolean;
  };
}

// ==================== 行为模式定义 ====================

/**
 * 激进型行为模式
 */
const AGGRESSIVE_BEHAVIOR: BehaviorPattern = {
  personality: 'aggressive',
  
  scenarioActions: new Map([
    ['high_cash', ['aggressive_buy', 'expand']],
    ['low_cash', ['aggressive_sell', 'price_war']],
    ['inventory_surplus', ['aggressive_sell', 'price_war']],
    ['inventory_shortage', ['aggressive_buy']],
    ['market_opportunity', ['aggressive_buy', 'expand']],
    ['market_threat', ['price_war', 'aggressive_sell']],
    ['high_profit', ['expand', 'aggressive_buy']],
    ['low_profit', ['price_war', 'contract']],
    ['price_rising', ['aggressive_sell', 'hold']],
    ['price_falling', ['aggressive_buy']],
    ['competitor_weak', ['expand', 'aggressive_buy']],
    ['competitor_strong', ['price_war']],
  ]),
  
  weights: {
    profitImportance: 0.3,
    marketShareImportance: 0.8,
    cashFlowImportance: 0.2,
    riskAvoidance: 0.1,
    opportunitySeizing: 0.9,
    longTermPlanning: 0.2,
  },
  
  thresholds: {
    buySignalStrength: -30,        // 较低阈值，更容易买入
    sellSignalStrength: 20,        // 中等阈值
    profitMarginMin: -0.1,         // 接受轻微亏损
    inventoryDaysMax: 15,
    cashRatioMin: 0.1,
    marketShareTarget: 0.3,
    priceDeviationMax: 0.5,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.9,
    sellAggressiveness: 0.85,
    spreadPreference: 0.2,
    volumePreference: 0.9,
    timingPatience: 0.2,
  },
  
  expansionStrategy: {
    buildingPriority: [16, 18, 17], // 电子厂、汽车厂、半导体厂
    maxBuildingsPerTick: 2,
    expansionCondition: (a) => a.cashRatio > 0.15 && a.cash > 1000000,
  },
};

/**
 * 保守型行为模式
 */
const CONSERVATIVE_BEHAVIOR: BehaviorPattern = {
  personality: 'conservative',
  
  scenarioActions: new Map([
    ['high_cash', ['conservative_buy', 'hold']],
    ['low_cash', ['hold', 'conservative_sell']],
    ['inventory_surplus', ['conservative_sell']],
    ['inventory_shortage', ['conservative_buy']],
    ['market_opportunity', ['hold', 'conservative_buy']],
    ['market_threat', ['hold', 'contract']],
    ['high_profit', ['hold']],
    ['low_profit', ['contract', 'hold']],
    ['price_rising', ['hold', 'conservative_sell']],
    ['price_falling', ['hold']],
    ['competitor_weak', ['hold']],
    ['competitor_strong', ['hold', 'contract']],
  ]),
  
  weights: {
    profitImportance: 0.7,
    marketShareImportance: 0.3,
    cashFlowImportance: 0.8,
    riskAvoidance: 0.9,
    opportunitySeizing: 0.2,
    longTermPlanning: 0.8,
  },
  
  thresholds: {
    buySignalStrength: 30,         // 高阈值，谨慎买入
    sellSignalStrength: -10,       // 较低阈值，更早卖出止损
    profitMarginMin: 0.1,          // 要求10%利润
    inventoryDaysMax: 45,
    cashRatioMin: 0.4,
    marketShareTarget: 0.1,
    priceDeviationMax: 0.3,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.3,
    sellAggressiveness: 0.4,
    spreadPreference: 0.7,
    volumePreference: 0.4,
    timingPatience: 0.8,
  },
  
  expansionStrategy: {
    buildingPriority: [0, 2, 5],   // 铁矿场、煤矿、伐木场
    maxBuildingsPerTick: 1,
    expansionCondition: (a) => a.cashRatio > 0.5 && a.profitMargin > 0.15,
  },
};

/**
 * 机会型行为模式
 */
const OPPORTUNIST_BEHAVIOR: BehaviorPattern = {
  personality: 'opportunist',
  
  scenarioActions: new Map([
    ['high_cash', ['aggressive_buy', 'arbitrage']],
    ['low_cash', ['aggressive_sell', 'arbitrage']],
    ['inventory_surplus', ['aggressive_sell', 'arbitrage']],
    ['inventory_shortage', ['aggressive_buy']],
    ['market_opportunity', ['aggressive_buy', 'arbitrage', 'expand']],
    ['market_threat', ['conservative_sell', 'arbitrage']],
    ['high_profit', ['expand', 'diversify']],
    ['low_profit', ['arbitrage', 'contract']],
    ['price_rising', ['aggressive_sell', 'arbitrage']],
    ['price_falling', ['aggressive_buy', 'arbitrage']],
    ['competitor_weak', ['aggressive_buy', 'expand']],
    ['competitor_strong', ['arbitrage', 'diversify']],
  ]),
  
  weights: {
    profitImportance: 0.6,
    marketShareImportance: 0.4,
    cashFlowImportance: 0.5,
    riskAvoidance: 0.3,
    opportunitySeizing: 1.0,
    longTermPlanning: 0.3,
  },
  
  thresholds: {
    buySignalStrength: -10,
    sellSignalStrength: 10,
    profitMarginMin: 0.02,
    inventoryDaysMax: 20,
    cashRatioMin: 0.25,
    marketShareTarget: 0.15,
    priceDeviationMax: 0.4,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.7,
    sellAggressiveness: 0.7,
    spreadPreference: 0.3,
    volumePreference: 0.6,
    timingPatience: 0.3,
  },
  
  expansionStrategy: {
    buildingPriority: [23],        // 仓储中心（灵活交易）
    maxBuildingsPerTick: 2,
    expansionCondition: (a) => a.cashRatio > 0.3 && a.opportunities.length > 2,
  },
};

/**
 * 专精型行为模式
 */
const SPECIALIST_BEHAVIOR: BehaviorPattern = {
  personality: 'specialist',
  
  scenarioActions: new Map([
    ['high_cash', ['concentrate', 'expand']],
    ['low_cash', ['conservative_sell']],
    ['inventory_surplus', ['conservative_sell']],
    ['inventory_shortage', ['aggressive_buy']],
    ['market_opportunity', ['concentrate', 'expand']],
    ['market_threat', ['hold', 'premium_pricing']],
    ['high_profit', ['expand', 'concentrate']],
    ['low_profit', ['hold', 'premium_pricing']],
    ['price_rising', ['hold', 'premium_pricing']],
    ['price_falling', ['aggressive_buy', 'concentrate']],
    ['competitor_weak', ['expand', 'concentrate']],
    ['competitor_strong', ['premium_pricing', 'hold']],
  ]),
  
  weights: {
    profitImportance: 0.6,
    marketShareImportance: 0.7,
    cashFlowImportance: 0.5,
    riskAvoidance: 0.5,
    opportunitySeizing: 0.4,
    longTermPlanning: 0.7,
  },
  
  thresholds: {
    buySignalStrength: 0,
    sellSignalStrength: 0,
    profitMarginMin: 0.08,
    inventoryDaysMax: 25,
    cashRatioMin: 0.25,
    marketShareTarget: 0.25,
    priceDeviationMax: 0.35,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.6,
    sellAggressiveness: 0.5,
    spreadPreference: 0.5,
    volumePreference: 0.7,
    timingPatience: 0.6,
  },
  
  expansionStrategy: {
    buildingPriority: [21, 20, 19], // 零部件厂、电池厂、家电厂
    maxBuildingsPerTick: 1,
    expansionCondition: (a) => a.cashRatio > 0.3 && a.marketShare > 0.1,
  },
};

/**
 * 多元型行为模式
 */
const DIVERSIFIED_BEHAVIOR: BehaviorPattern = {
  personality: 'diversified',
  
  scenarioActions: new Map([
    ['high_cash', ['diversify', 'expand']],
    ['low_cash', ['conservative_sell', 'hold']],
    ['inventory_surplus', ['conservative_sell']],
    ['inventory_shortage', ['conservative_buy']],
    ['market_opportunity', ['diversify', 'conservative_buy']],
    ['market_threat', ['diversify', 'hold']],
    ['high_profit', ['diversify', 'expand']],
    ['low_profit', ['diversify', 'hold']],
    ['price_rising', ['hold', 'conservative_sell']],
    ['price_falling', ['diversify', 'conservative_buy']],
    ['competitor_weak', ['diversify', 'expand']],
    ['competitor_strong', ['diversify', 'hold']],
  ]),
  
  weights: {
    profitImportance: 0.5,
    marketShareImportance: 0.4,
    cashFlowImportance: 0.6,
    riskAvoidance: 0.6,
    opportunitySeizing: 0.5,
    longTermPlanning: 0.6,
  },
  
  thresholds: {
    buySignalStrength: 10,
    sellSignalStrength: -5,
    profitMarginMin: 0.05,
    inventoryDaysMax: 30,
    cashRatioMin: 0.3,
    marketShareTarget: 0.1,
    priceDeviationMax: 0.4,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.5,
    sellAggressiveness: 0.5,
    spreadPreference: 0.5,
    volumePreference: 0.5,
    timingPatience: 0.5,
  },
  
  expansionStrategy: {
    buildingPriority: [6, 12, 13, 16], // 农场、纺织厂、食品厂、电子厂
    maxBuildingsPerTick: 1,
    expansionCondition: (a) => a.cashRatio > 0.35,
  },
};

/**
 * 创新型行为模式
 */
const INNOVATOR_BEHAVIOR: BehaviorPattern = {
  personality: 'innovator',
  
  scenarioActions: new Map([
    ['high_cash', ['expand', 'premium_pricing']],
    ['low_cash', ['premium_pricing', 'conservative_sell']],
    ['inventory_surplus', ['premium_pricing', 'conservative_sell']],
    ['inventory_shortage', ['aggressive_buy']],
    ['market_opportunity', ['expand', 'aggressive_buy']],
    ['market_threat', ['premium_pricing', 'hold']],
    ['high_profit', ['expand', 'concentrate']],
    ['low_profit', ['premium_pricing', 'hold']],
    ['price_rising', ['premium_pricing', 'hold']],
    ['price_falling', ['aggressive_buy', 'expand']],
    ['competitor_weak', ['expand', 'premium_pricing']],
    ['competitor_strong', ['premium_pricing', 'concentrate']],
  ]),
  
  weights: {
    profitImportance: 0.5,
    marketShareImportance: 0.5,
    cashFlowImportance: 0.4,
    riskAvoidance: 0.35,
    opportunitySeizing: 0.7,
    longTermPlanning: 0.85,
  },
  
  thresholds: {
    buySignalStrength: 5,
    sellSignalStrength: -5,
    profitMarginMin: 0.12,
    inventoryDaysMax: 20,
    cashRatioMin: 0.2,
    marketShareTarget: 0.2,
    priceDeviationMax: 0.5,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.6,
    sellAggressiveness: 0.4,
    spreadPreference: 0.6,
    volumePreference: 0.5,
    timingPatience: 0.6,
  },
  
  expansionStrategy: {
    buildingPriority: [17, 37, 38], // 半导体厂、AI芯片厂、量子实验室
    maxBuildingsPerTick: 1,
    expansionCondition: (a) => a.cashRatio > 0.2 && a.profitMargin > 0.1,
  },
};

/**
 * 成本领先型行为模式
 */
const COST_LEADER_BEHAVIOR: BehaviorPattern = {
  personality: 'cost_leader',
  
  scenarioActions: new Map([
    ['high_cash', ['expand', 'aggressive_buy']],
    ['low_cash', ['price_war', 'aggressive_sell']],
    ['inventory_surplus', ['price_war', 'aggressive_sell']],
    ['inventory_shortage', ['aggressive_buy']],
    ['market_opportunity', ['expand', 'price_war']],
    ['market_threat', ['price_war']],
    ['high_profit', ['expand', 'price_war']],
    ['low_profit', ['price_war', 'contract']],
    ['price_rising', ['aggressive_sell']],
    ['price_falling', ['price_war', 'aggressive_buy']],
    ['competitor_weak', ['price_war', 'expand']],
    ['competitor_strong', ['price_war']],
  ]),
  
  weights: {
    profitImportance: 0.4,
    marketShareImportance: 0.8,
    cashFlowImportance: 0.5,
    riskAvoidance: 0.4,
    opportunitySeizing: 0.6,
    longTermPlanning: 0.5,
  },
  
  thresholds: {
    buySignalStrength: -20,
    sellSignalStrength: 30,
    profitMarginMin: 0.02,        // 接受低利润
    inventoryDaysMax: 25,
    cashRatioMin: 0.25,
    marketShareTarget: 0.25,
    priceDeviationMax: 0.6,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.8,
    sellAggressiveness: 0.9,
    spreadPreference: 0.1,        // 窄价差
    volumePreference: 0.9,        // 大量交易
    timingPatience: 0.3,
  },
  
  expansionStrategy: {
    buildingPriority: [13, 6, 12], // 食品厂、农场、纺织厂
    maxBuildingsPerTick: 2,
    expansionCondition: (a) => a.cashRatio > 0.25,
  },
};

/**
 * 高端型行为模式
 */
const PREMIUM_BEHAVIOR: BehaviorPattern = {
  personality: 'premium',
  
  scenarioActions: new Map([
    ['high_cash', ['premium_pricing', 'expand']],
    ['low_cash', ['premium_pricing', 'hold']],
    ['inventory_surplus', ['premium_pricing', 'hold']],
    ['inventory_shortage', ['conservative_buy']],
    ['market_opportunity', ['premium_pricing', 'expand']],
    ['market_threat', ['premium_pricing', 'hold']],
    ['high_profit', ['premium_pricing', 'expand']],
    ['low_profit', ['premium_pricing', 'contract']],
    ['price_rising', ['premium_pricing']],
    ['price_falling', ['hold', 'premium_pricing']],
    ['competitor_weak', ['premium_pricing', 'expand']],
    ['competitor_strong', ['premium_pricing', 'hold']],
  ]),
  
  weights: {
    profitImportance: 0.8,
    marketShareImportance: 0.3,
    cashFlowImportance: 0.6,
    riskAvoidance: 0.6,
    opportunitySeizing: 0.4,
    longTermPlanning: 0.7,
  },
  
  thresholds: {
    buySignalStrength: 20,
    sellSignalStrength: -30,      // 很少愿意低价卖
    profitMarginMin: 0.2,         // 要求高利润
    inventoryDaysMax: 35,
    cashRatioMin: 0.35,
    marketShareTarget: 0.1,
    priceDeviationMax: 0.3,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.3,
    sellAggressiveness: 0.2,
    spreadPreference: 0.9,        // 宽价差
    volumePreference: 0.3,        // 小量高价
    timingPatience: 0.9,
  },
  
  expansionStrategy: {
    buildingPriority: [36, 16],   // 奢侈品工坊、电子厂
    maxBuildingsPerTick: 1,
    expansionCondition: (a) => a.cashRatio > 0.4 && a.profitMargin > 0.2,
  },
};

/**
 * 产业链开拓者行为模式
 */
const PIONEER_BEHAVIOR: BehaviorPattern = {
  personality: 'pioneer',
  
  scenarioActions: new Map([
    ['high_cash', ['expand', 'aggressive_buy']],
    ['low_cash', ['hold', 'conservative_sell']],
    ['inventory_surplus', ['hold', 'conservative_sell']], // 愿意持有库存
    ['inventory_shortage', ['aggressive_buy', 'expand']], // 缺货时积极扩张
    ['market_opportunity', ['expand', 'aggressive_buy']],
    ['market_threat', ['hold', 'expand']], // 面对威胁仍坚持扩张
    ['high_profit', ['expand', 'aggressive_buy']],
    ['low_profit', ['hold', 'expand']], // 低利润也坚持扩张
    ['price_rising', ['hold', 'expand']],
    ['price_falling', ['aggressive_buy', 'hold']],
    ['competitor_weak', ['expand', 'aggressive_buy']],
    ['competitor_strong', ['expand', 'hold']], // 不怕竞争
  ]),
  
  weights: {
    profitImportance: 0.2,        // 不太看重短期利润
    marketShareImportance: 0.6,   // 看重市场份额
    cashFlowImportance: 0.3,      // 现金流次要
    riskAvoidance: 0.1,           // 极低风险规避
    opportunitySeizing: 0.9,      // 极高机会把握
    longTermPlanning: 1.0,        // 极高长期规划
  },
  
  thresholds: {
    buySignalStrength: -20,
    sellSignalStrength: 40,       // 很难卖出，倾向持有
    profitMarginMin: -0.05,       // 接受亏损
    inventoryDaysMax: 60,         // 容忍高库存
    cashRatioMin: 0.1,            // 容忍低现金
    marketShareTarget: 0.4,       // 追求高份额
    priceDeviationMax: 0.8,
  },
  
  tradingStrategy: {
    buyAggressiveness: 0.9,
    sellAggressiveness: 0.2,
    spreadPreference: 0.2,
    volumePreference: 0.8,
    timingPatience: 0.1,          // 不等待时机，立即行动
  },
  
  expansionStrategy: {
    buildingPriority: [33, 20, 16, 17], // 锂矿、电池厂、电子厂、半导体厂
    maxBuildingsPerTick: 3,       // 快速扩张
    expansionCondition: (a) => a.cashRatio > 0.1, // 只要有钱就扩张
  },
};

/**
 * 所有行为模式映射
 */
export const BEHAVIOR_PATTERNS: Record<PersonalityType, BehaviorPattern> = {
  aggressive: AGGRESSIVE_BEHAVIOR,
  conservative: CONSERVATIVE_BEHAVIOR,
  opportunist: OPPORTUNIST_BEHAVIOR,
  specialist: SPECIALIST_BEHAVIOR,
  diversified: DIVERSIFIED_BEHAVIOR,
  innovator: INNOVATOR_BEHAVIOR,
  cost_leader: COST_LEADER_BEHAVIOR,
  premium: PREMIUM_BEHAVIOR,
  pioneer: PIONEER_BEHAVIOR,
};

// ==================== 场景检测 ====================

/**
 * 检测当前公司面临的场景
 */
export function detectScenarios(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment,
  personality: AIPersonality
): BehaviorScenario[] {
  const scenarios: BehaviorScenario[] = [];
  const pattern = BEHAVIOR_PATTERNS[personality.type];
  
  // 现金状况
  if (assessment.cashRatio > personality.targetCashRatio * 1.5) {
    scenarios.push('high_cash');
  } else if (assessment.cashRatio < personality.targetCashRatio * 0.5) {
    scenarios.push('low_cash');
  }
  
  // 库存状况
  const avgInventoryDays = calculateAverageInventoryDays(world, companyId);
  if (avgInventoryDays > pattern.thresholds.inventoryDaysMax) {
    scenarios.push('inventory_surplus');
  } else if (avgInventoryDays < pattern.thresholds.inventoryDaysMax * 0.3) {
    scenarios.push('inventory_shortage');
  }
  
  // 利润状况
  const profitMargin = getCompanyProfitMargin(world, companyId);
  if (profitMargin > pattern.thresholds.profitMarginMin * 2) {
    scenarios.push('high_profit');
  } else if (profitMargin < pattern.thresholds.profitMarginMin) {
    scenarios.push('low_profit');
  }
  
  // 市场机会/威胁
  if (assessment.opportunities.length > 3) {
    scenarios.push('market_opportunity');
  }
  if (assessment.bottlenecks.length > 5) {
    scenarios.push('market_threat');
  }
  
  // 价格趋势（检查主要商品）
  const priceScenarios = detectPriceScenarios(world, companyId);
  scenarios.push(...priceScenarios);
  
  // 竞争态势
  const marketShare = getCompanyMarketShare(world, companyId);
  if (marketShare > pattern.thresholds.marketShareTarget) {
    scenarios.push('competitor_weak');
  } else if (marketShare < pattern.thresholds.marketShareTarget * 0.3) {
    scenarios.push('competitor_strong');
  }
  
  return scenarios;
}

/**
 * 计算平均库存天数
 */
function calculateAverageInventoryDays(world: GameWorld, companyId: number): number {
  let totalValue = 0;
  let totalDailySales = 0;
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const idx = companyId * GOODS_COUNT + goodsId;
    const inventory = world.companies.inventories[idx];
    const price = world.goods.prices[goodsId];
    const dailySales = world.trades.cumulativeSalesQuantity[idx] / Math.max(1, world.tick / 24);
    
    totalValue += inventory * price;
    totalDailySales += dailySales * price;
  }
  
  return totalDailySales > 0 ? totalValue / totalDailySales : 999;
}

/**
 * 检测价格趋势场景
 */
function detectPriceScenarios(world: GameWorld, companyId: number): BehaviorScenario[] {
  const scenarios: BehaviorScenario[] = [];
  let risingCount = 0;
  let fallingCount = 0;
  let totalCount = 0;
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const idx = companyId * GOODS_COUNT + goodsId;
    const inventory = world.companies.inventories[idx];
    
    if (inventory > 10) {
      const prediction = predictPrice(world, goodsId);
      totalCount++;
      
      if (prediction.direction === 'bullish') {
        risingCount++;
      } else if (prediction.direction === 'bearish') {
        fallingCount++;
      }
    }
  }
  
  if (totalCount > 0) {
    if (risingCount / totalCount > 0.6) {
      scenarios.push('price_rising');
    } else if (fallingCount / totalCount > 0.6) {
      scenarios.push('price_falling');
    }
  }
  
  return scenarios;
}

// ==================== 行为执行 ====================

/**
 * 获取当前场景下推荐的行为动作
 */
export function getRecommendedActions(
  personality: AIPersonality,
  scenarios: BehaviorScenario[]
): BehaviorAction[] {
  const pattern = BEHAVIOR_PATTERNS[personality.type];
  const actions = new Set<BehaviorAction>();
  
  for (const scenario of scenarios) {
    const scenarioActions = pattern.scenarioActions.get(scenario);
    if (scenarioActions) {
      scenarioActions.forEach(a => actions.add(a));
    }
  }
  
  return Array.from(actions);
}

/**
 * 根据行为动作调整决策
 */
export function applyBehaviorToDecision(
  decision: AIDecision,
  actions: BehaviorAction[],
  pattern: BehaviorPattern
): AIDecision {
  const adjusted = { ...decision };
  
  for (const action of actions) {
    switch (action) {
      case 'aggressive_buy':
        if (decision.action === 'buy') {
          adjusted.priority *= 1.5;
          adjusted.params = {
            ...adjusted.params,
            quantity: (adjusted.params.quantity as number) * 1.3,
            price: (adjusted.params.price as number) * 1.1,
          };
        }
        break;
        
      case 'conservative_buy':
        if (decision.action === 'buy') {
          adjusted.priority *= 0.8;
          adjusted.params = {
            ...adjusted.params,
            quantity: (adjusted.params.quantity as number) * 0.7,
            price: (adjusted.params.price as number) * 0.9,
          };
        }
        break;
        
      case 'aggressive_sell':
        if (decision.action === 'sell') {
          adjusted.priority *= 1.5;
          adjusted.params = {
            ...adjusted.params,
            quantity: (adjusted.params.quantity as number) * 1.3,
            price: (adjusted.params.price as number) * 0.9,
          };
        }
        break;
        
      case 'conservative_sell':
        if (decision.action === 'sell') {
          adjusted.priority *= 0.8;
          adjusted.params = {
            ...adjusted.params,
            quantity: (adjusted.params.quantity as number) * 0.7,
          };
        }
        break;
        
      case 'price_war':
        if (decision.action === 'sell') {
          adjusted.params = {
            ...adjusted.params,
            price: (adjusted.params.price as number) * 0.85,
          };
          adjusted.priority *= 1.3;
        }
        break;
        
      case 'premium_pricing':
        if (decision.action === 'sell') {
          adjusted.params = {
            ...adjusted.params,
            price: (adjusted.params.price as number) * 1.15,
            quantity: (adjusted.params.quantity as number) * 0.7,
          };
        }
        break;
        
      case 'expand':
        if (decision.type === 'investment') {
          adjusted.priority *= 1.4;
        }
        break;
        
      case 'contract':
        if (decision.type === 'investment') {
          adjusted.priority *= 0.5;
        }
        break;
        
      case 'hold':
        adjusted.priority *= 0.7;
        break;
    }
  }
  
  // 应用交易策略调整
  if (decision.type === 'trading') {
    if (decision.action === 'buy' && adjusted.params.quantity) {
      adjusted.params.quantity = 
        (adjusted.params.quantity as number) * pattern.tradingStrategy.volumePreference;
    }
    if (decision.action === 'sell' && adjusted.params.quantity) {
      adjusted.params.quantity = 
        (adjusted.params.quantity as number) * pattern.tradingStrategy.volumePreference;
    }
  }
  
  return adjusted;
}

/**
 * 计算决策得分（基于行为模式权重）
 */
export function calculateDecisionScore(
  decision: AIDecision,
  pattern: BehaviorPattern,
  assessment: CompanyAssessment
): number {
  let score = decision.priority * decision.confidence;
  
  // 利润权重
  score += decision.expectedProfit * pattern.weights.profitImportance * 0.001;
  
  // 风险调整
  if (decision.confidence < 0.5) {
    score *= (1 - pattern.weights.riskAvoidance * 0.5);
  }
  
  // 机会把握
  if (decision.type === 'trading' && decision.action === 'buy') {
    score *= (0.5 + pattern.weights.opportunitySeizing * 0.5);
  }
  
  // 长期规划
  if (decision.type === 'investment') {
    score *= (0.5 + pattern.weights.longTermPlanning * 0.5);
  }
  
  return score;
}

/**
 * 基于价格预测优化交易决策
 */
export function optimizeTradingWithPrediction(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  pattern: BehaviorPattern
): { shouldTrade: boolean; action: 'buy' | 'sell' | 'hold'; quantity: number; price: number } {
  const prediction = predictPrice(world, goodsId);
  const timing = calculateOptimalTradingTime(world, goodsId);
  const profitAnalysis = analyzeGoodsProfit(world, companyId, goodsId);
  
  // 根据信号强度和阈值判断
  if (prediction.signalScore > pattern.thresholds.buySignalStrength) {
    // 买入信号
    if (timing.shouldBuyNow || !pattern.tradingStrategy.timingPatience) {
      const quantity = Math.max(10, 100 * pattern.tradingStrategy.volumePreference);
      const price = timing.expectedBuyPrice * (1 + pattern.tradingStrategy.buyAggressiveness * 0.05);
      
      return { shouldTrade: true, action: 'buy', quantity, price };
    }
  }
  
  if (prediction.signalScore < pattern.thresholds.sellSignalStrength) {
    // 卖出信号
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    
    if (inventory > 0 && (timing.shouldSellNow || profitAnalysis.inventoryDays > pattern.thresholds.inventoryDaysMax)) {
      const quantity = inventory * pattern.tradingStrategy.sellAggressiveness;
      const price = timing.expectedSellPrice * (1 - (1 - pattern.tradingStrategy.sellAggressiveness) * 0.05);
      
      return { shouldTrade: true, action: 'sell', quantity, price };
    }
  }
  
  return { shouldTrade: false, action: 'hold', quantity: 0, price: 0 };
}

/**
 * 获取人格的目标商品列表
 *
 * 使用产业偏好权重系统，包含所有商品但按偏好权重和利润率排序
 * 权重高的商品优先级更高，但不会完全排除低权重商品
 */
export function getPersonalityTargetGoods(
  world: GameWorld,
  personality: AIPersonality,
  companyId: number
): number[] {
  const pattern = BEHAVIOR_PATTERNS[personality.type];
  
  // 收集所有商品及其评分
  const goodsWithScores: { goodsId: number; score: number }[] = [];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const category = world.goods.categories[goodsId];
    
    // 获取产业偏好权重 (0.2-2.0)
    const categoryWeight = getCategoryWeight(personality, category);
    
    // 获取利润率
    const profitMargin = getGoodsProfitMargin(world, companyId, goodsId);
    
    // 计算综合评分：产业偏好权重 * 利润率调整
    // 权重范围 0.2-2.0，利润率可能为负
    // 即使利润率为负，高偏好商品仍有较高优先级
    const profitScore = Math.max(0.1, profitMargin + 0.5); // 调整为正数
    const score = categoryWeight * profitScore;
    
    goodsWithScores.push({ goodsId, score });
  }
  
  // 按综合评分排序（高分优先）
  goodsWithScores.sort((a, b) => b.score - a.score);
  
  // 根据专业化程度限制数量
  // 专业化程度高 = 更少商品，专业化程度低 = 更多商品
  const maxGoods = Math.ceil((1 - personality.specializationDegree) * 20 + 5);
  
  return goodsWithScores.slice(0, maxGoods).map(g => g.goodsId);
}