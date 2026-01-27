/**
 * AI公司决策引擎
 * 实现AI公司的生产、定价、投资决策
 *
 * 完全增强版：集成6大AI智能模块
 * - 精确计算系统 (PrecisionCalculator)
 * - 价格预测系统 (PricePredictor)
 * - 人格行为系统 (PersonalityBehaviors)
 * - 战略规划系统 (StrategicPlanner)
 * - 历史学习系统 (HistoricalLearning)
 * - 高级交易系统 (AdvancedTrading)
 * - 竞争情报系统 (CompetitiveIntelligence)
 * - 风险管理系统 (RiskManagement)
 * - 建造系统集成 (ConstructionManager)
 */

import { GameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import {
  constructionManager,
  ConstructionStatus,
  ConstructionType,
} from '@/core/construction/ConstructionManager';
import { getBaseMaterials, calculateMaterialsValue } from '@/data/buildingMaterials';
import { ALL_BUILDINGS } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { RECIPES, RecipeDefinition } from '@/data/recipes';
import { GOODS_COUNT, AI_DECISION_INTERVAL, ACTUAL_GOODS_COUNT, MAX_SUBSIDIARIES, MAX_ORDERS } from '@/core/constants';
import { getOrderBookView, cancelOrder } from '@/core/market/OrderBook';
import { calculateOptimalQuantity, calculateCostStructure } from '@/core/economy/SupplyCurve';
import { createBuyOrder, createSellOrder } from '@/core/market/OrderBook';

// AI订单价格调整配置
const AI_ORDER_PRICE_ADJUST_CONFIG = {
  // 订单存在多少tick后开始调整价格
  adjustAfterTicks: 15,
  // 每次调整的价格比例
  adjustPercent: 0.05,  // 5%
  // 最大调整次数（防止价格无限调整）
  maxAdjustments: 10,
  // 卖单最低价格（相对于基础价）
  minSellPriceRatio: 0.3,  // 30%
  // 买单最高价格（相对于基础价）
  maxBuyPriceRatio: 2.0,   // 200%
};
import {
  getMarketState,
  getStock,
  getHoldings,
  buyStock,
  sellStock,
  calculateValuation,
  Stock,
  Holding,
  StockMarketState
} from '@/core/finance/StockMarket';
import {
  AI_PERSONALITIES,
  AI_COMPANIES,
  AIPersonality,
  adjustDecisionByPersonality,
  filterDecisionsByPersonality,
  evaluatePersonalityGoalGap
} from './AIPersonality';

// ==================== 导入6大AI智能模块 ====================

// Phase 0: 精确计算模块
import {
  getCompanyProfitMargin,
  getCompanyMarketShare,
  analyzeGoodsProfit,
  analyzeCompanyProfit,
  performComprehensiveAnalysis,
  ComprehensiveAnalysis,
  GoodsProfitAnalysis
} from './PrecisionCalculator';

// Phase 0: 价格预测模块
import {
  predictPrice,
  predictAllPrices,
  calculateOptimalTradingTime,
  getBestBuyOpportunities,
  getBestSellOpportunities,
  PricePrediction
} from './PricePredictor';

// Phase 0: 人格行为模块
import {
  BEHAVIOR_PATTERNS,
  detectScenarios,
  getRecommendedActions,
  applyBehaviorToDecision,
  calculateDecisionScore,
  optimizeTradingWithPrediction,
  getPersonalityTargetGoods,
  BehaviorScenario,
  BehaviorAction
} from './PersonalityBehaviors';

// Phase 1: 战略规划模块
import {
  getStrategicPlan,
  updateStrategicPlan,
  getCurrentPlanActions,
  getStrategySummary,
  StrategicGoal,
  QuarterlyPlan,
  StrategyType
} from './StrategicPlanner';

// Phase 2: 历史学习模块
import {
  recordDecision,
  runLearningCycle,
  getLearningAdvice,
  DecisionRecord,
  LearningParameters
} from './HistoricalLearning';

// Phase 3: 高级交易模块
import {
  getTradingSession,
  initializeTradingSession,
  generateTradingSignals,
  runAdvancedTradingCycle,
  TradingStrategyType,
  TradingSignal
} from './AdvancedTrading';

// Phase 4: 竞争情报模块
import {
  getIntelStore,
  updateCompetitorProfiles,
  analyzeMarketCompetition,
  generateCompetitiveResponses,
  getCompetitiveSummary,
  CompetitorProfile,
  MarketCompetitionAnalysis
} from './CompetitiveIntelligence';

// Phase 5: 风险管理模块
import {
  getRiskStore,
  initializeRiskStore,
  performRiskAssessment,
  getRiskSummary,
  checkTradeRiskLimits,
  getRiskAdjustedRecommendation,
  getActiveAlerts,
  RiskAssessment,
  RiskAlert,
  RiskLimits
} from './RiskManagement';

// Phase 6: 生产方式优化模块
import {
  runProductionOptimization,
  optimizeCompanyProduction,
  BuildingOptimization,
} from './AIProductionOptimizer';

// Phase 7: 附属建筑系统
import {
  SubsidiaryBuildingDef,
  SubsidiaryCategory,
  getAvailableSubsidiaries,
  getSubsidiaryDef,
  getInstalledSubsidiaries,
  canInstallSubsidiary,
  installSubsidiary,
  repairSubsidiary,
  calculateRepairCost,
  calculateCombinedEffects,
  getTotalSubsidiarySlots,
  getUsedSubsidiarySlots,
  getAvailableSubsidiarySlots,
  calculateDailySubsidiaryMaintenance,
  SUBSIDIARIES_BY_BUILDING_TYPE,
} from '@/core/production/SubsidiaryBuildings';

/**
 * 决策类型
 */
export type DecisionType = 'production' | 'pricing' | 'trading' | 'investment' | 'expansion' | 'stock' | 'subsidiary';

/**
 * AI决策结果
 */
export interface AIDecision {
  type: DecisionType;
  companyId: number;
  action: string;
  params: Record<string, number | string>;
  priority: number;
  expectedProfit: number;
  confidence: number;
}

// ==================== AI智能系统初始化 ====================

/**
 * 确保公司的AI系统已初始化
 */
function ensureAISystemsInitialized(world: GameWorld, companyId: number): void {
  const personality = getCompanyPersonality(companyId);
  
  // 初始化各模块存储（如果尚未初始化）
  if (!getRiskStore(companyId)) {
    initializeRiskStore(companyId, personality);
  }
  
  if (!getTradingSession(companyId)) {
    initializeTradingSession(companyId, personality);
  }
  
  // 其他模块会在首次调用时自动初始化
}

/**
 * 清理公司的AI系统（用于游戏重置）
 */
export function clearCompanyAISystems(): void {
  // 各模块有自己的存储，需要分别清理
  // 这里只是一个占位符，实际清理在各模块中实现
}

/**
 * 公司状态评估
 */
export interface CompanyAssessment {
  cash: number;
  cashRatio: number;              // 现金占总资产比例
  inventoryValue: number;
  buildingCount: number;
  profitMargin: number;           // 利润率
  marketShare: number;            // 市场份额
  productionCapacity: number;     // 生产能力
  bottlenecks: number[];          // 瓶颈商品ID
  opportunities: number[];        // 机会商品ID
}

/**
 * 评估公司当前状态（增强版 - 使用精确计算）
 */
export function assessCompanyState(world: GameWorld, companyId: number): CompanyAssessment {
  const cash = world.companies.cash[companyId];
  
  // 计算库存价值
  let inventoryValue = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    const qty = world.companies.inventories[companyId * GOODS_COUNT + i];
    inventoryValue += qty * world.goods.prices[i];
  }
  
  // 统计建筑数量
  let buildingCount = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      buildingCount++;
    }
  }
  
  // 计算总资产
  const totalAssets = cash + inventoryValue;
  const cashRatio = totalAssets > 0 ? cash / totalAssets : 0;
  
  // 计算生产能力（简化）
  let productionCapacity = buildingCount * 100;
  
  // 识别瓶颈和机会
  const bottlenecks: number[] = [];
  const opportunities: number[] = [];
  
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const supply = world.goods.supplies[i];
    const demand = world.goods.demands[i];
    
    if (supply > 0 && demand / supply > 1.5) {
      // 供不应求 - 机会
      opportunities.push(i);
    } else if (supply > 0 && demand / supply < 0.5) {
      // 供过于求 - 可能是瓶颈
      bottlenecks.push(i);
    }
  }
  
  // 【关键修改】使用精确计算替换硬编码值
  const profitMargin = getCompanyProfitMargin(world, companyId);
  const marketShare = getCompanyMarketShare(world, companyId);
  
  return {
    cash,
    cashRatio,
    inventoryValue,
    buildingCount,
    profitMargin,    // 真实利润率
    marketShare,     // 真实市场份额
    productionCapacity,
    bottlenecks,
    opportunities,
  };
}

/**
 * 生成生产决策
 */
export function generateProductionDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 遍历公司的所有建筑
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    if (!world.buildings.isActive[i]) continue;
    
    const recipeId = world.buildings.recipeIds[i];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    // 获取产出商品
    const outputGoodsId = recipe.outputs[0]?.goodsId;
    if (outputGoodsId === undefined) continue;
    
    // 计算最优产量
    const supplyDecision = calculateOptimalQuantity(world, i, outputGoodsId);
    
    if (supplyDecision.expectedProfit > 0) {
      decisions.push({
        type: 'production',
        companyId,
        action: 'maintain_production',
        params: {
          buildingId: i,
          targetQuantity: supplyDecision.optimalQuantity,
          expectedProfit: supplyDecision.expectedProfit,
        },
        priority: supplyDecision.profitMargin > 0.2 ? 8 : 5,
        expectedProfit: supplyDecision.expectedProfit,
        confidence: 0.8,
      });
    } else {
      // 亏损时考虑减产或转换配方
      decisions.push({
        type: 'production',
        companyId,
        action: 'reduce_production',
        params: {
          buildingId: i,
          targetQuantity: supplyDecision.optimalQuantity * 0.5,
          loss: -supplyDecision.expectedProfit,
        },
        priority: 7,
        expectedProfit: supplyDecision.expectedProfit,
        confidence: 0.7,
      });
    }
  }
  
  return decisions;
}

/**
 * 生成定价决策
 */
export function generatePricingDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 检查库存积压商品
  for (let i = 0; i < GOODS_COUNT; i++) {
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + i];
    if (inventory <= 0) continue;
    
    const goods = ALL_GOODS.find(g => g.id === i);
    if (!goods) continue;
    
    const currentPrice = world.goods.prices[i];
    const basePrice = goods.basePrice;
    const supply = world.goods.supplies[i];
    const demand = world.goods.demands[i];
    
    // 供需比分析
    const supplyDemandRatio = demand > 0 ? supply / demand : 2;
    
    let suggestedPrice = currentPrice;
    let action = 'maintain_price';
    
    if (supplyDemandRatio > 1.3) {
      // 供过于求，建议降价
      suggestedPrice = currentPrice * 0.95;
      action = 'lower_price';
    } else if (supplyDemandRatio < 0.7) {
      // 供不应求，可以提价
      suggestedPrice = currentPrice * 1.05;
      action = 'raise_price';
    }
    
    // 库存积压时优先降价
    const inventoryDays = inventory / (demand / 24 || 1);
    if (inventoryDays > 30) {
      suggestedPrice = Math.min(suggestedPrice, currentPrice * 0.9);
      action = 'clearance_sale';
    }
    
    if (action !== 'maintain_price') {
      decisions.push({
        type: 'pricing',
        companyId,
        action,
        params: {
          goodsId: i,
          currentPrice,
          suggestedPrice,
          inventoryDays,
        },
        priority: action === 'clearance_sale' ? 8 : 5,
        expectedProfit: inventory * (suggestedPrice - currentPrice),
        confidence: 0.65,
      });
    }
  }
  
  return decisions;
}

// ==================== AI吃单功能 ====================

/**
 * 生成吃卖单决策（以对方卖价买入）
 *
 * AI检查订单簿中的卖单，如果价格合适就直接以卖方价格下买单，实现即时成交
 */
function generateTakeSellOrderDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 现金不足时不吃单
  if (assessment.cash < 10000) {
    return decisions;
  }
  
  // 遍历公司的建筑，找出需要的原材料
  const materialNeeds = new Map<number, number>(); // goodsId -> dailyNeed
  
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    if (!world.buildings.isActive[i]) continue;
    
    const recipeId = world.buildings.recipeIds[i];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    for (const input of recipe.inputs) {
      const currentNeed = materialNeeds.get(input.goodsId) || 0;
      const efficiency = world.buildings.efficiencies[i] || 1;
      materialNeeds.set(input.goodsId, currentNeed + input.amount * efficiency * 24);
    }
  }
  
  // 检查每种原材料的订单簿
  for (const [goodsId, dailyNeed] of materialNeeds) {
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    const inventoryDays = dailyNeed > 0 ? inventory / dailyNeed : 999;
    
    // 只有库存不足7天才考虑吃单
    if (inventoryDays >= 7) continue;
    
    // 获取订单簿视图
    const orderBook = getOrderBookView(world, goodsId);
    
    // 检查是否有卖单可以吃
    if (orderBook.sellOrders.length === 0) continue;
    
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    const currentPrice = world.goods.prices[goodsId];
    
    // 计算可接受的最高价格（根据紧急程度）
    let maxAcceptablePrice: number;
    if (inventoryDays < 1) {
      // 极度紧急：接受高达200%基准价
      maxAcceptablePrice = basePrice * 2.0;
    } else if (inventoryDays < 3) {
      // 紧急：接受高达150%基准价
      maxAcceptablePrice = basePrice * 1.5;
    } else {
      // 正常：接受高达120%基准价或当前市价的110%
      maxAcceptablePrice = Math.max(basePrice * 1.2, currentPrice * 1.1);
    }
    
    // 遍历卖单，找出可吃的订单
    for (const sellOrder of orderBook.sellOrders) {
      // 不吃自己公司的订单
      if (sellOrder.companyId === companyId) continue;
      
      // 价格超过可接受范围就跳过
      if (sellOrder.price > maxAcceptablePrice) continue;
      
      // 计算要买的数量（不超过3天需求量，也不超过现金允许的量）
      const maxBuyByNeed = dailyNeed * 3;
      const maxBuyByCash = Math.floor(assessment.cash * 0.2 / sellOrder.price); // 最多用20%现金
      const buyQuantity = Math.min(sellOrder.remaining, maxBuyByNeed, maxBuyByCash, 500);
      
      if (buyQuantity < 1) continue;
      
      const totalCost = buyQuantity * sellOrder.price;
      if (totalCost > assessment.cash * 0.3) continue; // 单笔不超过30%现金
      
      // 创建吃单决策（以卖方价格下买单）
      decisions.push({
        type: 'trading',
        companyId,
        action: 'buy',
        params: {
          goodsId,
          quantity: buyQuantity,
          price: sellOrder.price, // 使用卖方价格，确保立即成交
          isTaker: 1, // 标记为吃单 (1=true)
        },
        priority: inventoryDays < 1 ? 10 : inventoryDays < 3 ? 9 : 8, // 紧急程度决定优先级
        expectedProfit: 0,
        confidence: 0.9, // 高置信度因为会立即成交
      });
      
      // 每种商品最多吃一个订单，避免一次买太多
      break;
    }
  }
  
  return decisions;
}

/**
 * 生成吃买单决策（以对方买价卖出）
 *
 * AI检查订单簿中的买单，如果价格合适就直接以买方价格下卖单，实现即时成交
 */
function generateTakeBuyOrderDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 遍历库存，找出可以卖的商品
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    const reserved = world.companies.inventoryReserved[companyId * GOODS_COUNT + goodsId];
    const available = inventory - reserved;
    
    // 只有可用库存大于5才考虑吃单卖出
    if (available <= 5) continue;
    
    // 获取订单簿视图
    const orderBook = getOrderBookView(world, goodsId);
    
    // 检查是否有买单可以吃
    if (orderBook.buyOrders.length === 0) continue;
    
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    const currentPrice = world.goods.prices[goodsId];
    
    // 计算库存天数（用于决定卖出积极程度）
    const demand = world.goods.demands[goodsId];
    const inventoryDays = demand > 0 ? inventory / (demand / 24) : 999;
    
    // 计算可接受的最低价格（根据库存积压程度）
    let minAcceptablePrice: number;
    if (inventoryDays > 60) {
      // 严重积压：接受低至40%基准价
      minAcceptablePrice = basePrice * 0.4;
    } else if (inventoryDays > 30) {
      // 中度积压：接受低至60%基准价
      minAcceptablePrice = basePrice * 0.6;
    } else if (inventoryDays > 14) {
      // 轻度积压：接受低至75%基准价
      minAcceptablePrice = basePrice * 0.75;
    } else {
      // 正常：接受低至85%基准价或当前市价的90%
      minAcceptablePrice = Math.max(basePrice * 0.85, currentPrice * 0.9);
    }
    
    // 遍历买单（已按价格降序排列），找出可吃的订单
    for (const buyOrder of orderBook.buyOrders) {
      // 不吃自己公司的订单
      if (buyOrder.companyId === companyId) continue;
      
      // 价格低于可接受范围就跳过（因为买单是降序的，后面的更低）
      if (buyOrder.price < minAcceptablePrice) break;
      
      // 计算要卖的数量
      let sellRatio = 0.5; // 默认卖50%
      if (inventoryDays > 60) {
        sellRatio = 0.9; // 严重积压卖90%
      } else if (inventoryDays > 30) {
        sellRatio = 0.7;
      }
      
      const maxSell = Math.floor(available * sellRatio);
      const sellQuantity = Math.min(buyOrder.remaining, maxSell, 1000);
      
      if (sellQuantity < 1) continue;
      
      // 创建吃单决策（以买方价格下卖单）
      decisions.push({
        type: 'trading',
        companyId,
        action: 'sell',
        params: {
          goodsId,
          quantity: sellQuantity,
          price: buyOrder.price, // 使用买方价格，确保立即成交
          isTaker: 1, // 标记为吃单 (1=true)
        },
        priority: inventoryDays > 60 ? 9 : inventoryDays > 30 ? 8 : 7,
        expectedProfit: sellQuantity * buyOrder.price,
        confidence: 0.9, // 高置信度因为会立即成交
      });
      
      // 每种商品最多吃一个订单
      break;
    }
  }
  
  return decisions;
}

/**
 * 生成交易决策
 *
 * 修复说明：
 * 1. 降低最低库存阈值（从10降到3）
 * 2. 放宽价格接受范围（接受低于基准价60%的价格）
 * 3. 增加卖出数量（从30%提高到50%）
 * 4. 库存积压时更积极出售
 */
export function generateTradingDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // ==================== 吃单逻辑 ====================
  // AI主动检查订单簿，如果有有利的挂单就直接以对方价格成交
  
  // 1. 吃卖单（买入）- 检查是否有便宜的卖单可以直接买入
  const takeSellDecisions = generateTakeSellOrderDecisions(world, companyId, assessment);
  decisions.push(...takeSellDecisions);
  
  // 2. 吃买单（卖出）- 检查是否有高价的买单可以直接卖给他们
  const takeBuyDecisions = generateTakeBuyOrderDecisions(world, companyId, assessment);
  decisions.push(...takeBuyDecisions);
  
  // ==================== 原有挂单逻辑 ====================
  
  // 卖出决策 - 更积极地出售库存，弥补做市商缺失
  for (let i = 0; i < GOODS_COUNT; i++) {
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + i];
    const reserved = world.companies.inventoryReserved[companyId * GOODS_COUNT + i];
    const available = inventory - reserved;
    
    // 只要有任何可用库存就考虑卖出
    if (available <= 0.5) continue;
    
    const goods = ALL_GOODS.find(g => g.id === i);
    if (!goods) continue;
    
    const currentPrice = world.goods.prices[i];
    const basePrice = goods.basePrice;
    const demand = world.goods.demands[i];
    
    // 计算库存天数
    const inventoryDays = demand > 0 ? inventory / (demand / 24) : 999;
    
    // 更宽松的价格接受条件（因为需要提供市场流动性）
    // 1. 正常情况下接受市场价>=基准价50%
    // 2. 任何库存都应该尝试出售
    let priceFloor = basePrice * 0.5;
    if (inventoryDays > 30) {
      priceFloor = basePrice * 0.35; // 严重积压
    } else if (inventoryDays > 14) {
      priceFloor = basePrice * 0.4;
    }
    
    // 几乎总是尝试出售（除非价格极低）
    if (currentPrice >= priceFloor || available > 10) {
      // 更激进的卖出比例
      let sellRatio = 0.7; // 默认卖出70%
      if (inventoryDays > 30) {
        sellRatio = 0.95; // 积压时出售95%
      } else if (inventoryDays > 14) {
        sellRatio = 0.85;
      } else if (inventoryDays > 7) {
        sellRatio = 0.75;
      } else if (available > 100) {
        sellRatio = 0.6; // 库存充足时也积极出售
      }
      
      // 大幅提高单次卖出上限
      const sellQuantity = Math.min(available * sellRatio, 2000);
      
      // 优化卖出定价：更激进的定价策略
      const sellPrice = calculateSmartSellPrice(world, i, currentPrice, inventoryDays);
      
      if (sellQuantity >= 1) {
        decisions.push({
          type: 'trading',
          companyId,
          action: 'sell',
          params: {
            goodsId: i,
            quantity: sellQuantity,
            price: sellPrice,
          },
          // 优先级调整：有库存就应该卖
          priority: inventoryDays > 30 ? 9 : inventoryDays > 14 ? 8 : available > 50 ? 7 : 6,
          expectedProfit: sellQuantity * sellPrice,
          confidence: 0.8,
        });
      }
    }
  }
  
  // 买入决策 - 更积极地采购原材料
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    if (!world.buildings.isActive[i]) continue;
    
    const recipeId = world.buildings.recipeIds[i];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    // 检查每种原材料
    for (const input of recipe.inputs) {
      const currentStock = world.companies.inventories[companyId * GOODS_COUNT + input.goodsId];
      const neededPerCycle = input.amount;
      
      // 大幅放宽采购条件：库存不足10个周期就采购
      if (currentStock < neededPerCycle * 10) {
        const currentPrice = world.goods.prices[input.goodsId];
        const goods = ALL_GOODS.find(g => g.id === input.goodsId);
        const basePrice = goods?.basePrice || currentPrice;
        
        // 【新增】检查该商品是否有供应（有卖单可买）
        // 如果完全没有供应，减少购买频率避免订单堆积
        const supply = world.goods.supplies[input.goodsId];
        const hasSupply = supply > 0;
        
        // 检查现有买单数量，避免重复下单
        let existingBuyQuantity = 0;
        for (let j = 0; j < world.orders.maxOrders; j++) {
          if (world.orders.isActive[j] &&
              world.orders.companyIds[j] === companyId &&
              world.orders.goodsIds[j] === input.goodsId &&
              world.orders.types[j] === 0) { // 买单
            existingBuyQuantity += world.orders.remainings[j];
          }
        }
        
        // 如果已有足够的买单在排队，跳过
        if (existingBuyQuantity >= neededPerCycle * 5) {
          continue;
        }
        
        // 采购更多以确保生产不中断，但限制最大量
        const buyQuantity = Math.min(neededPerCycle * 15, 500, hasSupply ? 500 : 100);
        // 接受更高溢价（最高150%基准价）
        const maxPrice = Math.max(currentPrice * 1.2, basePrice * 1.5);
        
        // 检查资金是否充足，但降低资金门槛
        if (assessment.cash >= buyQuantity * maxPrice * 0.5) {
          // 根据紧急程度调整实际采购量
          const adjustedQuantity = assessment.cash >= buyQuantity * maxPrice
            ? buyQuantity
            : Math.floor(assessment.cash / maxPrice * 0.8);
          
          if (adjustedQuantity > 0) {
            decisions.push({
              type: 'trading',
              companyId,
              action: 'buy',
              params: {
                goodsId: input.goodsId,
                quantity: adjustedQuantity,
                price: maxPrice,
              },
              priority: hasSupply ? 7 : 4, // 无供应时降低优先级
              expectedProfit: 0,
              confidence: hasSupply ? 0.8 : 0.5,
            });
          }
        }
      }
    }
  }
  
  return decisions;
}

/**
 * 生成投资决策
 *
 * 【优化说明】大幅提高AI建造工厂的意愿：
 * 1. 降低现金门槛：从50万降到20万，现金比例从40%降到20%
 * 2. 提高投资优先级：从4-5提高到6-8
 * 3. 增加多种投资触发条件：
 *    - 市场机会驱动（供不应求的商品）
 *    - 产业链补全驱动（缺少上游原材料供应）
 *    - 规模扩张驱动（现有建筑产能不足）
 *    - 多元化驱动（分散风险）
 * 4. 根据公司人格调整投资策略
 */
export function generateInvestmentDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 获取公司人格（用于调整投资策略）
  const personality = getCompanyPersonalityForInvestment(companyId);
  
  // 【优化1】大幅降低投资门槛（进一步优化）
  // 基础条件：现金比例>8%且现金>8万（原来是15%和15万）
  const minCashRatio = 0.08;
  const minCash = 80000;
  
  // 激进型公司门槛更低（最低可到5%和5万）
  const adjustedMinCashRatio = minCashRatio * (1.2 - personality.expansionBias * 0.5);
  const adjustedMinCash = minCash * (1.2 - personality.expansionBias * 0.5);
  
  const canInvest = assessment.cashRatio > adjustedMinCashRatio && assessment.cash > adjustedMinCash;
  
  // 【新增】供需缺口驱动建造 - 优先建造紧缺商品的生产建筑
  const shortageDecisions = generateShortageProductionDecisions(world, companyId, assessment, personality);
  decisions.push(...shortageDecisions);
  
  if (canInvest) {
    // 【策略1】市场机会驱动 - 供不应求的商品
    for (const opportunity of assessment.opportunities.slice(0, 5)) {
      const goods = ALL_GOODS.find(g => g.id === opportunity);
      if (!goods) continue;
      
      // 计算供需缺口程度
      const supply = world.goods.supplies[opportunity];
      const demand = world.goods.demands[opportunity];
      const gapRatio = demand > 0 ? (demand - supply) / demand : 0;
      
      // 找能生产该商品的建筑
      for (const building of ALL_BUILDINGS) {
        const recipe = RECIPES.find(r =>
          r.buildingTypeId === building.id &&
          r.outputs.some(o => o.goodsId === opportunity)
        );
        
        if (recipe && assessment.cash >= building.buildCost * 1.1) {  // 降低资金要求从1.2到1.1
          // 【优化2】提高优先级，根据供需缺口调整（优先级范围提高）
          const basePriority = 7 + Math.min(gapRatio * 4, 3); // 7-10
          
          decisions.push({
            type: 'investment',
            companyId,
            action: 'build',
            params: {
              buildingTypeId: building.id,
              recipeId: recipe.id,
              cost: building.buildCost,
              targetGoodsId: opportunity,
              reason: 'market_opportunity',
            },
            priority: basePriority,
            expectedProfit: building.buildCost * 0.2 * (1 + gapRatio),  // 提高预期利润
            confidence: 0.65 + gapRatio * 0.2,  // 提高置信度
          });
          break;
        }
      }
    }
    
    // 【策略2】产业链补全驱动 - 缺少原材料供应时建造上游工厂
    const materialShortages = findMaterialShortages(world, companyId);
    for (const shortage of materialShortages.slice(0, 3)) {
      const { goodsId, shortageRatio } = shortage;
      
      // 找能生产该原材料的建筑
      for (const building of ALL_BUILDINGS) {
        const recipe = RECIPES.find(r =>
          r.buildingTypeId === building.id &&
          r.outputs.some(o => o.goodsId === goodsId)
        );
        
        if (recipe && assessment.cash >= building.buildCost * 1.2) {  // 降低资金要求从1.5到1.2
          decisions.push({
            type: 'investment',
            companyId,
            action: 'build',
            params: {
              buildingTypeId: building.id,
              recipeId: recipe.id,
              cost: building.buildCost,
              targetGoodsId: goodsId,
              reason: 'supply_chain',
            },
            priority: 8 + Math.min(shortageRatio, 2), // 8-10 (提高)
            expectedProfit: building.buildCost * 0.25,  // 提高预期利润
            confidence: 0.75,  // 提高置信度
          });
          break;
        }
      }
    }
    
    // 【策略3】规模扩张驱动 - 现有盈利建筑产能不足
    const profitableBuildings = findProfitableBuildings(world, companyId);
    for (const { buildingId, profitMargin } of profitableBuildings.slice(0, 3)) {
      const typeId = world.buildings.types[buildingId];
      const recipeId = world.buildings.recipeIds[buildingId];
      const building = ALL_BUILDINGS.find(b => b.id === typeId);
      
      if (building && assessment.cash >= building.buildCost * 1.1) {  // 降低资金要求从1.3到1.1
        decisions.push({
          type: 'investment',
          companyId,
          action: 'build',
          params: {
            buildingTypeId: typeId,
            recipeId: recipeId,
            cost: building.buildCost,
            reason: 'scale_expansion',
          },
          priority: 7 + Math.min(profitMargin * 10, 3), // 7-10 (提高)
          expectedProfit: building.buildCost * profitMargin * 1.2,  // 提高预期利润
          confidence: 0.7,  // 提高置信度
        });
      }
    }
    
    // 【策略4】多元化驱动 - 分散投资到新领域
    if (personality.specializationDegree < 0.6 && assessment.buildingCount < 15) {  // 放宽条件
      const newOpportunities = findDiversificationOpportunities(world, companyId);
      for (const opp of newOpportunities.slice(0, 3)) {  // 增加候选数量
        const building = ALL_BUILDINGS.find(b => b.id === opp.buildingTypeId);
        if (building && assessment.cash >= building.buildCost * 1.2) {  // 降低资金要求
          decisions.push({
            type: 'investment',
            companyId,
            action: 'build',
            params: {
              buildingTypeId: opp.buildingTypeId,
              recipeId: opp.recipeId,
              cost: building.buildCost,
              reason: 'diversification',
            },
            priority: 6 + opp.attractiveness, // 6-9 (提高)
            expectedProfit: building.buildCost * 0.15,  // 提高预期利润
            confidence: 0.55,  // 提高置信度
          });
        }
      }
    }
  }
  
  // 【优化3】升级现有建筑 - 降低门槛，提高优先级
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    
    const level = world.buildings.levels[i];
    const typeId = world.buildings.types[i];
    const building = ALL_BUILDINGS.find(b => b.id === typeId);
    
    if (building && level < building.maxLevel) {
      const upgradeCost = building.upgradeCosts[level] || building.buildCost * 0.5;
      
      // 降低升级门槛：从2倍降到1.3倍
      if (assessment.cash >= upgradeCost * 1.3) {
        // 提高升级优先级
        decisions.push({
          type: 'investment',
          companyId,
          action: 'upgrade',
          params: {
            buildingId: i,
            currentLevel: level,
            targetLevel: level + 1,
            cost: upgradeCost,
          },
          priority: 5 + level, // 等级越高优先级越高
          expectedProfit: upgradeCost * 0.2,
          confidence: 0.7,
        });
      }
    }
  }
  
  // 【新增】即使现金不太充足，也考虑低成本投资
  if (!canInvest && assessment.cash > 100000) {
    // 寻找低成本建筑（建造成本<现金的60%）
    const affordableBuildings = ALL_BUILDINGS.filter(b =>
      b.buildCost < assessment.cash * 0.6 &&
      b.category !== 'retail' && // 排除零售建筑
      b.category !== 'service'   // 排除服务建筑
    );
    
    for (const building of affordableBuildings.slice(0, 3)) {
      const recipe = RECIPES.find(r => r.buildingTypeId === building.id);
      if (recipe) {
        const outputGoodsId = recipe.outputs[0]?.goodsId;
        if (outputGoodsId !== undefined) {
          const demand = world.goods.demands[outputGoodsId];
          const supply = world.goods.supplies[outputGoodsId];
          
          // 只有供不应求时才考虑
          if (demand > supply * 1.2) {
            decisions.push({
              type: 'investment',
              companyId,
              action: 'build',
              params: {
                buildingTypeId: building.id,
                recipeId: recipe.id,
                cost: building.buildCost,
                reason: 'affordable_opportunity',
              },
              priority: 5,
              expectedProfit: building.buildCost * 0.1,
              confidence: 0.4,
            });
          }
        }
      }
    }
  }
  
  return decisions;
}

/**
 * 获取公司人格（用于投资决策）
 */
function getCompanyPersonalityForInvestment(companyId: number): AIPersonality {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  if (config) {
    return AI_PERSONALITIES[config.personality];
  }
  
  // 动态分配人格
  const personalityTypes: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive', 'opportunist', 'cost_leader', 'diversified',
    'specialist', 'innovator', 'conservative', 'premium',
  ];
  const typeIndex = (companyId - 1) % personalityTypes.length;
  return AI_PERSONALITIES[personalityTypes[typeIndex]];
}

/**
 * 查找原材料短缺情况
 */
function findMaterialShortages(
  world: GameWorld,
  companyId: number
): Array<{ goodsId: number; shortageRatio: number }> {
  const shortages: Array<{ goodsId: number; shortageRatio: number }> = [];
  const materialNeeds = new Map<number, number>();
  
  // 统计公司所有建筑的原材料需求
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    if (!world.buildings.isActive[i]) continue;
    
    const recipeId = world.buildings.recipeIds[i];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    for (const input of recipe.inputs) {
      const current = materialNeeds.get(input.goodsId) || 0;
      materialNeeds.set(input.goodsId, current + input.amount * 24);
    }
  }
  
  // 检查每种原材料的库存是否充足
  for (const [goodsId, dailyNeed] of materialNeeds) {
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    const inventoryDays = dailyNeed > 0 ? inventory / dailyNeed : 999;
    
    // 库存不足5天视为短缺
    if (inventoryDays < 5) {
      const shortageRatio = (5 - inventoryDays) / 5;
      shortages.push({ goodsId, shortageRatio });
    }
  }
  
  // 按短缺程度排序
  shortages.sort((a, b) => b.shortageRatio - a.shortageRatio);
  return shortages;
}

/**
 * 查找盈利的建筑
 */
function findProfitableBuildings(
  world: GameWorld,
  companyId: number
): Array<{ buildingId: number; profitMargin: number }> {
  const profitable: Array<{ buildingId: number; profitMargin: number }> = [];
  
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    if (!world.buildings.isActive[i]) continue;
    
    const recipeId = world.buildings.recipeIds[i];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    // 计算利润率
    let inputCost = 0;
    let outputValue = 0;
    
    for (const input of recipe.inputs) {
      inputCost += input.amount * world.goods.prices[input.goodsId];
    }
    
    for (const output of recipe.outputs) {
      outputValue += output.amount * world.goods.prices[output.goodsId];
    }
    
    if (inputCost > 0) {
      const profitMargin = (outputValue - inputCost) / inputCost;
      if (profitMargin > 0.1) { // 利润率>10%
        profitable.push({ buildingId: i, profitMargin });
      }
    }
  }
  
  // 按利润率排序
  profitable.sort((a, b) => b.profitMargin - a.profitMargin);
  return profitable;
}

/**
 * 查找多元化投资机会
 */
function findDiversificationOpportunities(
  world: GameWorld,
  companyId: number
): Array<{ buildingTypeId: number; recipeId: number; attractiveness: number }> {
  const opportunities: Array<{ buildingTypeId: number; recipeId: number; attractiveness: number }> = [];
  
  // 获取公司现有的建筑类型
  const existingTypes = new Set<number>();
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      existingTypes.add(world.buildings.types[i]);
    }
  }
  
  // 寻找公司尚未涉足的建筑类型
  for (const building of ALL_BUILDINGS) {
    if (existingTypes.has(building.id)) continue;
    if (building.category === 'retail' || building.category === 'service') continue;
    
    const recipe = RECIPES.find(r => r.buildingTypeId === building.id);
    if (!recipe) continue;
    
    // 计算吸引力
    let attractiveness = 1;
    
    // 检查产出商品的市场情况
    for (const output of recipe.outputs) {
      const demand = world.goods.demands[output.goodsId];
      const supply = world.goods.supplies[output.goodsId];
      if (demand > supply) {
        attractiveness += Math.min((demand - supply) / demand * 2, 2);
      }
    }
    
    opportunities.push({
      buildingTypeId: building.id,
      recipeId: recipe.id,
      attractiveness,
    });
  }
  
  // 按吸引力排序
  opportunities.sort((a, b) => b.attractiveness - a.attractiveness);
  return opportunities;
}

/**
 * 【新增】供需缺口驱动建造决策
 *
 * 核心逻辑：找出需求/供给比>2的商品，优先建造能生产这些商品的建筑
 * 这是用户特别要求的功能："ai加上若某商品多人买没什么公司生产则优先建造这类"
 */
function generateShortageProductionDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment,
  personality: AIPersonality
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 1. 找出严重短缺的商品（需求/供给 > 2）
  const shortageGoods = findShortageGoods(world);
  
  if (shortageGoods.length === 0) {
    return decisions;
  }
  
  // 2. 根据现金状况决定可投资金额
  const maxInvestment = assessment.cash * 0.4; // 最多使用40%现金
  const minCashAfter = 50000; // 保留至少5万现金
  
  if (assessment.cash - minCashAfter < 100000) {
    return decisions; // 资金太紧张
  }
  
  // 3. 为每个短缺商品寻找可建造的建筑
  for (const shortage of shortageGoods.slice(0, 5)) {
    const { goodsId, shortageRatio, demand, supply } = shortage;
    
    // 找能生产该商品的建筑
    const buildingInfo = findBuildingForGoods(goodsId);
    if (!buildingInfo) continue;
    
    const { building, recipe } = buildingInfo;
    
    // 检查是否负担得起（需要至少1.1倍建造成本）
    if (building.buildCost * 1.1 > maxInvestment) continue;
    if (assessment.cash - building.buildCost < minCashAfter) continue;
    
    // 计算优先级（短缺比例越高，优先级越高）
    // 短缺比例2-5: 优先级8-10
    // 短缺比例5+: 优先级10
    const priorityBonus = Math.min((shortageRatio - 2) * 2, 4);
    const basePriority = 8 + priorityBonus; // 8-12
    
    // 检查公司是否已经有该类型建筑（避免过度集中）
    let existingCount = 0;
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === companyId &&
          world.buildings.types[i] === building.id) {
        existingCount++;
      }
    }
    
    // 如果已经有3个以上同类建筑，降低优先级
    const diversityPenalty = existingCount >= 3 ? 3 : existingCount >= 2 ? 1 : 0;
    
    // 根据人格调整
    const personalityBonus = personality.expansionBias * 2; // 激进型最多+2
    
    const finalPriority = Math.max(6, basePriority + personalityBonus - diversityPenalty);
    
    decisions.push({
      type: 'investment',
      companyId,
      action: 'build',
      params: {
        buildingTypeId: building.id,
        recipeId: recipe.id,
        cost: building.buildCost,
        targetGoodsId: goodsId,
        reason: 'shortage_driven', // 新的原因类型
        shortageRatio,
        demand,
        supply,
      },
      priority: finalPriority,
      expectedProfit: building.buildCost * 0.3 * shortageRatio, // 短缺越严重预期利润越高
      confidence: 0.7 + Math.min(shortageRatio / 20, 0.2), // 最高0.9
    });
  }
  
  // 按优先级排序
  decisions.sort((a, b) => b.priority - a.priority);
  
  // 只返回前3个最优决策
  return decisions.slice(0, 3);
}

/**
 * 找出市场上严重短缺的商品
 * 返回需求/供给比 > 2 的商品列表
 */
function findShortageGoods(world: GameWorld): Array<{
  goodsId: number;
  shortageRatio: number;
  demand: number;
  supply: number;
}> {
  const shortages: Array<{
    goodsId: number;
    shortageRatio: number;
    demand: number;
    supply: number;
  }> = [];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const demand = world.goods.demands[goodsId];
    const supply = world.goods.supplies[goodsId];
    
    // 跳过没有需求的商品
    if (demand < 10) continue;
    
    // 计算短缺比例
    const shortageRatio = supply > 0 ? demand / supply : (demand > 100 ? 10 : 5);
    
    // 只关注短缺比例 > 2 的商品
    if (shortageRatio > 2) {
      shortages.push({
        goodsId,
        shortageRatio,
        demand,
        supply,
      });
    }
  }
  
  // 按短缺程度排序
  shortages.sort((a, b) => b.shortageRatio - a.shortageRatio);
  
  return shortages;
}

/**
 * 找到能生产指定商品的建筑和配方
 */
function findBuildingForGoods(goodsId: number): {
  building: typeof ALL_BUILDINGS[0];
  recipe: RecipeDefinition;
} | null {
  for (const building of ALL_BUILDINGS) {
    // 跳过零售和服务类建筑
    if (building.category === 'retail' || building.category === 'service') continue;
    
    // 查找能产出该商品的配方
    const recipe = RECIPES.find(r =>
      r.buildingTypeId === building.id &&
      r.outputs.some(o => o.goodsId === goodsId)
    );
    
    if (recipe) {
      return { building, recipe };
    }
  }
  
  return null;
}

/**
 * 生成股票交易决策
 *
 * 让AI公司参与股票市场交易，增加市场活跃度
 *
 * 决策逻辑：
 * 1. 现金紧张时卖出持有的股票（不卖自己公司）
 * 2. 现金充裕时买入被低估的股票
 * 3. 主动交易模式：即使条件不满足，也定期进行小额交易增加流动性
 * 4. 根据公司人格调整交易策略
 */
export function generateStockTradingDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment,
  personality: AIPersonality
): AIDecision[] {
  const decisions: AIDecision[] = [];
  const stockMarket = getMarketState();
  
  if (!stockMarket || !stockMarket.stocks) return decisions;
  
  // 获取当前持股
  const holdings = getHoldings(companyId);
  
  // 1. 卖出决策：现金紧张时卖出持股筹集资金
  // 放宽条件：现金比例低于目标的80%，或现金低于30万
  const cashCritical = assessment.cashRatio < personality.targetCashRatio * 0.8 || assessment.cash < 300000;
  
  if (cashCritical) {
    for (const holding of holdings) {
      // 不卖自己公司的股票
      if (holding.stockCompanyId === companyId) continue;
      
      // 降低最小持股要求
      if (holding.shares < 50) continue;
      
      const stock = getStock(holding.stockCompanyId);
      if (!stock || !stock.isTradable) continue;
      
      // 卖出30%-50%的持股
      const sellRatio = assessment.cash < 100000 ? 0.5 : 0.3;
      const sellQuantity = Math.floor(holding.shares * sellRatio);
      
      if (sellQuantity >= 50) {
        // 略低于市价确保成交
        const sellPrice = stock.currentPrice * 0.98;
        
        decisions.push({
          type: 'stock',
          companyId,
          action: 'sell_stock',
          params: {
            stockCompanyId: holding.stockCompanyId,
            quantity: sellQuantity,
            price: sellPrice,
          },
          priority: 9, // 资金紧张时高优先级
          expectedProfit: sellQuantity * sellPrice,
          confidence: 0.8,
        });
      }
    }
  }
  
  // 2. 买入决策：只要有一定现金就考虑投资股票
  // 大幅放宽条件：现金超过20万就可以投资
  const canInvest = assessment.cash > 200000;
  
  if (canInvest) {
    // 根据人格和现金状况决定投资比例
    // 现金越充裕，投资比例越高
    let investRatio = 0.03; // 基础3%
    if (assessment.cash > 1000000) {
      investRatio = 0.08;
    } else if (assessment.cash > 500000) {
      investRatio = 0.05;
    }
    investRatio *= (0.5 + personality.expansionBias * 0.5); // 激进型最多翻倍
    
    const maxInvestment = assessment.cash * investRatio;
    let totalInvested = 0;
    
    // 收集所有可交易股票并评分
    const tradableStocks: Array<{ stock: Stock; score: number }> = [];
    
    for (const [targetId, stock] of stockMarket.stocks) {
      // 不买自己公司的股票
      if (targetId === companyId) continue;
      if (!stock.isTradable) continue;
      
      // 计算吸引力评分（放宽条件，不只看低估）
      let score = 50; // 基础分
      
      // 市净率因素：低市净率加分
      if (stock.priceToBook < 1.0) {
        score += (1.0 - stock.priceToBook) * 50;
      } else if (stock.priceToBook < 1.5) {
        score += (1.5 - stock.priceToBook) * 20;
      } else if (stock.priceToBook < 2.0) {
        score += 5;
      }
      
      // 价格变化因素：下跌的股票可能是买入机会
      const priceChange = (stock.currentPrice - stock.previousClose) / stock.previousClose;
      if (priceChange < -0.02) {
        score += 20; // 下跌超过2%加分
      } else if (priceChange < 0) {
        score += 10;
      }
      
      // 估值因素
      const valuation = calculateValuation(world, targetId);
      if (valuation.intrinsicValue > valuation.marketValue) {
        score += 15;
      }
      
      // 加入随机因素增加多样性
      score += Math.random() * 20;
      
      tradableStocks.push({ stock, score });
    }
    
    // 按分数排序
    tradableStocks.sort((a, b) => b.score - a.score);
    
    // 投资前5个最有吸引力的股票
    for (const { stock } of tradableStocks.slice(0, 5)) {
      if (totalInvested >= maxInvestment) break;
      
      // 计算购买数量（降低最小买入量要求）
      const investAmount = Math.min(maxInvestment * 0.3, assessment.cash * 0.05);
      const quantity = Math.floor(investAmount / stock.currentPrice);
      
      if (quantity >= 50) { // 降低到50股
        // 略高于市价确保买入
        const buyPrice = stock.currentPrice * 1.02;
        const cost = quantity * buyPrice;
        
        if (cost <= assessment.cash - totalInvested) {
          decisions.push({
            type: 'stock',
            companyId,
            action: 'buy_stock',
            params: {
              stockCompanyId: stock.companyId,
              quantity,
              price: buyPrice,
            },
            priority: 5,
            expectedProfit: 0,
            confidence: 0.6,
          });
          
          totalInvested += cost;
        }
      }
    }
  }
  
  // 3. 主动交易模式：定期进行小额交易增加市场流动性
  // 每个AI公司根据companyId轮流交易
  const shouldActiveTrade = (world.tick + companyId) % 12 === 0; // 每12tick有一家AI交易
  
  if (shouldActiveTrade && assessment.cash > 100000) {
    // 随机选择一只股票进行小额买入
    const stockArray = Array.from(stockMarket.stocks.values())
      .filter(s => s.companyId !== companyId && s.isTradable);
    
    if (stockArray.length > 0) {
      const randomStock = stockArray[Math.floor(Math.random() * stockArray.length)];
      const smallBuyQty = Math.floor(50 + Math.random() * 150); // 50-200股
      const buyPrice = randomStock.currentPrice * 1.01;
      
      if (smallBuyQty * buyPrice < assessment.cash * 0.02) {
        decisions.push({
          type: 'stock',
          companyId,
          action: 'buy_stock',
          params: {
            stockCompanyId: randomStock.companyId,
            quantity: smallBuyQty,
            price: buyPrice,
          },
          priority: 3, // 低优先级的流动性交易
          expectedProfit: 0,
          confidence: 0.5,
        });
      }
    }
  }
  
  // 4. 止盈止损决策：根据持仓盈亏决定是否卖出
  for (const holding of holdings) {
    if (holding.stockCompanyId === companyId) continue;
    if (holding.shares < 50) continue;
    
    const stock = getStock(holding.stockCompanyId);
    if (!stock || !stock.isTradable) continue;
    
    // 计算收益率
    const currentValue = stock.currentPrice;
    const gainPercent = holding.avgCost > 0 ? (currentValue - holding.avgCost) / holding.avgCost : 0;
    
    // 止盈：盈利超过20%时卖出部分（降低阈值）
    if (gainPercent > 0.2) {
      const sellQuantity = Math.floor(holding.shares * 0.4);
      if (sellQuantity >= 50) {
        decisions.push({
          type: 'stock',
          companyId,
          action: 'sell_stock',
          params: {
            stockCompanyId: holding.stockCompanyId,
            quantity: sellQuantity,
            price: stock.currentPrice * 0.99,
          },
          priority: 6,
          expectedProfit: sellQuantity * stock.currentPrice,
          confidence: 0.7,
        });
      }
    }
    
    // 止损：亏损超过15%时卖出部分（降低阈值）
    if (gainPercent < -0.15) {
      const sellQuantity = Math.floor(holding.shares * 0.3);
      if (sellQuantity >= 50) {
        decisions.push({
          type: 'stock',
          companyId,
          action: 'sell_stock',
          params: {
            stockCompanyId: holding.stockCompanyId,
            quantity: sellQuantity,
            price: stock.currentPrice * 0.98,
          },
          priority: 7,
          expectedProfit: sellQuantity * stock.currentPrice,
          confidence: 0.65,
        });
      }
    }
  }
  
  return decisions;
}

/**
 * 根据订单簿深度智能计算卖出价格
 *
 * 优化说明（弥补做市商缺失）：
 * 1. 更激进的定价策略以确保成交
 * 2. 检查订单簿中的买单深度
 * 3. 根据库存积压程度调整折扣
 * 4. 优先保证流动性，其次考虑利润
 */
function calculateSmartSellPrice(
  world: GameWorld,
  goodsId: number,
  currentPrice: number,
  inventoryDays: number
): number {
  // 获取订单簿视图
  const orderBook = getOrderBookView(world, goodsId);
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const basePrice = goods?.basePrice || currentPrice;
  
  // 更激进的基础折扣：优先确保成交
  let baseDiscount: number;
  if (inventoryDays > 60) {
    baseDiscount = 0.75;  // 严重积压：25%折扣
  } else if (inventoryDays > 30) {
    baseDiscount = 0.85;  // 中度积压：15%折扣
  } else if (inventoryDays > 14) {
    baseDiscount = 0.90;  // 轻度积压：10%折扣
  } else if (inventoryDays > 7) {
    baseDiscount = 0.93;  // 正常偏多：7%折扣
  } else {
    baseDiscount = 0.96;  // 正常：4%折扣
  }
  
  // 如果有买单，参考最高买价
  if (orderBook.bestBid && orderBook.bestBid > 0) {
    const bestBid = orderBook.bestBid;
    const discountedPrice = currentPrice * baseDiscount;
    
    // 如果最高买价接近或高于我们的折扣价，直接匹配买价以确保成交
    if (bestBid >= discountedPrice * 0.95) {
      // 略低于最高买价确保成交
      return bestBid * 0.99;
    }
    
    // 买价较低时，根据积压程度决定
    if (inventoryDays > 30) {
      // 积压严重时，愿意接受更低价格
      return Math.max(bestBid * 0.98, basePrice * 0.6);
    } else if (inventoryDays > 14) {
      return Math.max(bestBid * 0.99, basePrice * 0.7);
    }
  }
  
  // 没有买单时，使用更激进的折扣价以吸引买家
  const targetPrice = currentPrice * baseDiscount;
  // 确保不低于基准价的50%
  return Math.max(targetPrice, basePrice * 0.5);
}

/**
 * 执行AI决策
 */
export function executeDecision(world: GameWorld, decision: AIDecision): boolean {
  switch (decision.type) {
    case 'trading':
      return executeTradingDecision(world, decision);
    case 'production':
      return executeProductionDecision(world, decision);
    case 'pricing':
      return executePricingDecision(world, decision);
    case 'investment':
      return executeInvestmentDecision(world, decision);
    case 'stock':
      return executeStockTradingDecision(world, decision);
    case 'subsidiary':
      return executeSubsidiaryDecision(world, decision);
    default:
      return false;
  }
}

function executeTradingDecision(world: GameWorld, decision: AIDecision): boolean {
  const { companyId, action, params } = decision;
  const goodsId = params.goodsId as number;
  const quantity = params.quantity as number;
  const price = params.price as number;
  
  if (action === 'buy') {
    const orderId = createBuyOrder(world, companyId, goodsId, quantity, price);
    return orderId !== null;
  } else if (action === 'sell') {
    const orderId = createSellOrder(world, companyId, goodsId, quantity, price);
    return orderId !== null;
  }
  
  return false;
}

/**
 * 执行股票交易决策
 */
function executeStockTradingDecision(world: GameWorld, decision: AIDecision): boolean {
  const { companyId, action, params } = decision;
  const stockCompanyId = params.stockCompanyId as number;
  const quantity = params.quantity as number;
  const price = params.price as number;
  
  if (action === 'buy_stock') {
    const orderId = buyStock(world, companyId, stockCompanyId, quantity, 'limit', price);
    return orderId !== null;
  } else if (action === 'sell_stock') {
    const orderId = sellStock(world, companyId, stockCompanyId, quantity, 'limit', price);
    return orderId !== null;
  }
  
  return false;
}

function executeProductionDecision(world: GameWorld, decision: AIDecision): boolean {
  const { params } = decision;
  const buildingId = params.buildingId as number;
  
  // 生产决策主要影响效率设置
  const targetQuantity = params.targetQuantity as number;
  const currentEfficiency = world.buildings.efficiencies[buildingId];
  
  // 根据目标产量调整效率
  if (decision.action === 'reduce_production') {
    world.buildings.efficiencies[buildingId] = Math.max(0.3, currentEfficiency * 0.9);
  } else {
    world.buildings.efficiencies[buildingId] = Math.min(1.5, currentEfficiency * 1.05);
  }
  
  return true;
}

function executePricingDecision(world: GameWorld, decision: AIDecision): boolean {
  // AI公司的定价决策通过订单价格实现
  // 这里只返回成功，实际定价在交易决策中体现
  return true;
}

function executeInvestmentDecision(world: GameWorld, decision: AIDecision): boolean {
  const { companyId, action, params } = decision;
  
  if (action === 'build') {
    // 新建建筑 - 使用建造系统（需要材料和时间）
    const buildingTypeId = params.buildingTypeId as number;
    const recipeId = params.recipeId as number;
    const cost = params.cost as number;
    
    // 检查资金是否充足
    const currentCash = world.companies.cash[companyId];
    if (currentCash < cost) {
      return false; // 资金不足
    }
    
    // 检查建筑定义是否存在
    const buildingDef = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
    if (!buildingDef) {
      return false;
    }
    
    // 检查配方是否有效（服务类建筑可能没有配方）
    if (recipeId >= 0) {
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!recipe) {
        return false;
      }
    }
    
    // 检查建筑数量限制
    if (world.buildings.count >= world.buildings.maxCount) {
      return false;
    }
    
    // 获取建造所需材料
    const materials = getBaseMaterials(buildingTypeId);
    
    // 检查材料是否充足（AI需要有材料才能建造）
    const inventoryGetter = (goodsId: number) => {
      const idx = companyId * GOODS_COUNT + goodsId;
      return world.companies.inventories[idx] - world.companies.inventoryReserved[idx];
    };
    
    const cashGetter = () => world.companies.cash[companyId];
    
    const priceGetter = (goodsId: number) => world.goods.prices[goodsId];
    
    // 使用建造管理器检查是否可以建造
    // 注意：GameWorld中的construction已经是ConstructionQueueSystem
    // 需要导入ConstructionManager中的createConstructionQueueSystem来创建兼容的队列
    // 这里暂时使用简化检查逻辑
    let canBuild = true;
    const missingMaterials: Array<{ goodsId: number; amount: number }> = [];
    
    for (const mat of materials) {
      const available = inventoryGetter(mat.goodsId);
      if (available < mat.amount) {
        canBuild = false;
        missingMaterials.push({
          goodsId: mat.goodsId,
          amount: mat.amount - available,
        });
      }
    }
    
    const canBuildResult = {
      canBuild,
      missingMaterials,
    };
    
    // 如果材料不足，AI会尝试采购材料（通过交易决策）
    if (!canBuildResult.canBuild) {
      // 记录缺少的材料，用于后续采购决策
      if (canBuildResult.missingMaterials.length > 0) {
        // 为缺少的材料创建采购需求（将在下一个决策周期处理）
        console.log(`[AI建造] 公司${companyId}建造${buildingDef.name}材料不足，需采购:`,
          canBuildResult.missingMaterials.map(m => `商品${m.goodsId}:${m.amount}`).join(', '));
      }
      
      // 暂时回退到直接建造模式（保持向后兼容）
      // TODO: 完全切换到材料建造模式后移除此分支
      try {
        // 扣除建造费用
        world.companies.cash[companyId] -= cost;
        
        // 添加建筑
        const buildingId = addBuilding(world, companyId, buildingTypeId, recipeId);
        
        // 更新公司资产
        world.companies.totalAssets[companyId] += cost * 0.8;
        
        console.log(`[AI] 公司 ${world.companies.names[companyId]} 建造了 ${buildingDef.name}(无材料模式), 花费 ¥${cost}`);
        return true;
      } catch (e) {
        world.companies.cash[companyId] += cost;
        return false;
      }
    }
    
    // 材料充足，使用建造队列系统
    try {
      // 1. 扣除建造费用
      world.companies.cash[companyId] -= cost;
      
      // 2. 消耗建造材料
      for (const mat of materials) {
        const idx = companyId * GOODS_COUNT + mat.goodsId;
        world.companies.inventories[idx] -= mat.amount;
      }
      
      // 3. 直接创建建筑（AI建造不使用建造队列，直接完成）
      // 这样简化逻辑，避免AI需要等待建造时间
      try {
        // 添加建筑
        const buildingId = addBuilding(world, companyId, buildingTypeId, recipeId);
        
        // 更新公司资产（预付材料价值）
        const materialsValue = calculateMaterialsValue(materials, priceGetter);
        world.companies.totalAssets[companyId] += (cost + materialsValue) * 0.8;
        
        console.log(`[AI建造] 公司 ${world.companies.names[companyId]} 建造了 ${buildingDef.name}, 花费 ¥${cost} + 材料`);
        return true;
      } catch (e) {
        // 建造失败，退还资金和材料
        world.companies.cash[companyId] += cost;
        for (const mat of materials) {
          const idx = companyId * GOODS_COUNT + mat.goodsId;
          world.companies.inventories[idx] += mat.amount;
        }
        console.error(`[AI建造] 建造失败:`, e);
        return false;
      }
    } catch (e) {
      // 如果建造失败，退还资金
      world.companies.cash[companyId] += cost;
      console.error('[AI建造] 异常:', e);
      return false;
    }
  } else if (action === 'upgrade') {
    // 升级建筑
    const buildingId = params.buildingId as number;
    const targetLevel = params.targetLevel as number;
    const cost = params.cost as number;
    
    // 检查资金
    const currentCash = world.companies.cash[companyId];
    if (currentCash < cost) {
      return false;
    }
    
    // 检查建筑所有权
    if (world.buildings.owners[buildingId] !== companyId) {
      return false;
    }
    
    // 检查当前等级
    const currentLevel = world.buildings.levels[buildingId];
    if (currentLevel >= targetLevel) {
      return false;
    }
    
    // 获取建筑定义检查最大等级
    const typeId = world.buildings.types[buildingId];
    const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
    if (!buildingDef || targetLevel > buildingDef.maxLevel) {
      return false;
    }
    
    // 执行升级
    world.companies.cash[companyId] -= cost;
    world.buildings.levels[buildingId] = targetLevel;
    
    // 升级效率加成
    const efficiencyMultiplier = buildingDef.efficiencyMultipliers[targetLevel - 1] || 1;
    world.buildings.efficiencies[buildingId] = efficiencyMultiplier;
    
    console.log(`[AI] 公司 ${world.companies.names[companyId]} 升级了建筑 #${buildingId} 到 Lv.${targetLevel}`);
    return true;
  }
  
  return false;
}

/**
 * 获取AI公司的人格配置
 *
 * 修复：为所有40家AI公司动态分配人格
 * - id 1-8：使用预定义配置
 * - id 9+：根据公司特性动态分配
 */
function getCompanyPersonality(companyId: number): AIPersonality {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  if (config) {
    return AI_PERSONALITIES[config.personality];
  }
  
  // 动态分配人格 - 根据公司ID分配不同类型
  // 确保市场中有多样化的交易策略
  const personalityTypes: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive',     // 激进型 - 大量交易
    'opportunist',    // 机会型 - 灵活交易
    'cost_leader',    // 成本领先 - 低价策略
    'diversified',    // 多元型 - 均衡交易
    'specialist',     // 专精型 - 专注特定商品
    'innovator',      // 创新型 - 高端商品
    'conservative',   // 保守型 - 稳健交易
    'premium',        // 高端型 - 高价策略
  ];
  
  // 使用公司ID模8来选择人格类型，确保多样性
  const typeIndex = (companyId - 1) % personalityTypes.length;
  return AI_PERSONALITIES[personalityTypes[typeIndex]];
}

/**
 * AI公司完整决策周期（完全增强版 - 集成所有6大模块）
 */
export function runAIDecisionCycle(world: GameWorld, companyId: number): AIDecision[] {
  // 1. 获取公司人格并确保系统初始化
  const personality = getCompanyPersonality(companyId);
  const pattern = BEHAVIOR_PATTERNS[personality.type];
  ensureAISystemsInitialized(world, companyId);
  
  // 2. 评估公司状态（使用精确计算）
  const assessment = assessCompanyState(world, companyId);
  
  // 3. 评估与人格目标的差距
  const goalGap = evaluatePersonalityGoalGap(personality, assessment);
  
  // 4. 【Phase 5】风险评估 - 在所有决策之前进行
  const riskAssessments = performRiskAssessment(world, companyId);
  const riskAlerts = getActiveAlerts(companyId);
  const riskSummary = getRiskSummary(companyId);
  
  // 5. 【Phase 4】竞争情报分析
  updateCompetitorProfiles(world, companyId);
  const competitiveSummary = getCompetitiveSummary(world, companyId);
  const competitiveResponses = generateCompetitiveResponses(world, companyId, personality);
  
  // 6. 【Phase 1】战略规划更新
  updateStrategicPlan(world, companyId, personality, assessment);
  const strategySummary = getStrategySummary(companyId);
  const planActions = getCurrentPlanActions(world, companyId);
  
  // 7. 检测当前场景
  const scenarios = detectScenarios(world, companyId, assessment, personality);
  
  // 8. 获取推荐行为动作
  const recommendedActions = getRecommendedActions(personality, scenarios);
  
  // 9. 生成各类决策（基于人格调整）
  let allDecisions: AIDecision[] = [
    ...generateProductionDecisions(world, companyId, assessment),
    ...generatePricingDecisions(world, companyId, assessment),
    ...generateTradingDecisions(world, companyId, assessment),
    ...generateInvestmentDecisions(world, companyId, assessment),
    ...generateStockTradingDecisions(world, companyId, assessment, personality),
    ...generateSubsidiaryDecisions(world, companyId, assessment, personality),
  ];
  
  // 10. 【Phase 3】高级交易系统生成信号
  const targetGoods = getPersonalityTargetGoods(world, personality, companyId);
  const tradeSignals = generateTradingSignals(world, companyId, targetGoods.slice(0, 10));
  const advancedTradeDecisions = generateAdvancedTradeDecisionsFromSignals(
    world, companyId, tradeSignals, riskSummary
  );
  allDecisions.push(...advancedTradeDecisions);
  
  // 11. 基于价格预测生成智能交易决策
  const predictiveDecisions = generatePredictiveTradeDecisions(
    world, companyId, personality, pattern
  );
  allDecisions.push(...predictiveDecisions);
  
  // 12. 根据人格调整决策
  allDecisions = allDecisions.map(d => adjustDecisionByPersonality(d, personality, assessment));
  
  // 13. 应用行为模式调整
  allDecisions = allDecisions.map(d => applyBehaviorToDecision(d, recommendedActions, pattern));
  
  // 14. 根据人格过滤决策
  allDecisions = filterDecisionsByPersonality(allDecisions, personality, world);
  
  // 15. 【Phase 5】风险过滤 - 根据风险警报调整决策
  allDecisions = applyRiskFiltersToDecisions(allDecisions, riskAlerts, riskSummary);
  
  // 16. 【Phase 4】竞争响应 - 根据竞争情报调整决策
  allDecisions = applyCompetitiveResponseToDecisions(allDecisions, competitiveSummary, competitiveResponses);
  
  // 17. 【Phase 1】战略对齐 - 优先符合战略目标的决策
  if (strategySummary) {
    allDecisions = alignDecisionsWithStrategy(allDecisions, strategySummary, planActions);
  }
  
  // 18. 人格驱动的额外决策逻辑
  
  // 现金紧张时（低于目标现金比例50%）优先卖出
  if (goalGap.cashGap > 0.15) {
    allDecisions.filter(d => d.type === 'trading' && d.action === 'sell')
      .forEach(d => d.priority *= 1.5);
  }
  
  // 激进型人格在现金充裕时更积极扩张
  if (personality.expansionBias > 0.7 && assessment.cashRatio > personality.targetCashRatio) {
    allDecisions.filter(d => d.type === 'investment')
      .forEach(d => d.priority *= 1.3);
  }
  
  // 成本领先者更频繁地低价卖出
  if (personality.pricingBias < -0.3) {
    allDecisions.filter(d => d.type === 'trading' && d.action === 'sell')
      .forEach(d => {
        if (d.params.price) {
          d.params.price = (d.params.price as number) * 0.95;
        }
        d.priority *= 1.2;
      });
  }
  
  // 高端品牌以更高价格卖出，但减少数量
  if (personality.pricingBias > 0.4) {
    allDecisions.filter(d => d.type === 'trading' && d.action === 'sell')
      .forEach(d => {
        if (d.params.price) {
          d.params.price = (d.params.price as number) * 1.15;
        }
        if (d.params.quantity) {
          d.params.quantity = (d.params.quantity as number) * 0.7;
        }
      });
  }
  
  // 专精型公司专注特定商品
  if (personality.specializationDegree > 0.8) {
    const focusConfig = AI_COMPANIES.find(c => c.id === companyId);
    if (focusConfig && focusConfig.focusGoods.length > 0) {
      allDecisions.filter(d => {
        const goodsId = d.params.goodsId as number;
        return goodsId !== undefined && focusConfig.focusGoods.includes(goodsId);
      }).forEach(d => d.priority *= 1.4);
    }
  }
  
  // 19. 使用行为模式权重计算决策得分
  allDecisions.forEach(d => {
    d.priority = calculateDecisionScore(d, pattern, assessment);
  });
  
  // 20. 按优先级排序
  allDecisions.sort((a, b) => b.priority - a.priority);
  
  // 21. 根据人格决定决策数量（增加基础值以弥补做市商缺失）
  const maxDecisionsPerTick = Math.round(8 * personality.decisionFrequency);
  const executedDecisions: AIDecision[] = [];
  
  for (let i = 0; i < Math.min(maxDecisionsPerTick, allDecisions.length); i++) {
    const decision = allDecisions[i];
    if (executeDecision(world, decision)) {
      executedDecisions.push(decision);
      
      // 22. 【Phase 2】记录决策到历史学习系统
      recordDecision(world, companyId, decision);
    }
  }
  
  // 23. 【Phase 2】定期执行学习周期
  if (world.tick % 100 === 0) {
    runLearningCycle(world, companyId);
  }
  
  // 24. 【Phase 3】运行高级交易系统
  if (world.tick % 6 === 0) { // 每6tick运行一次
    runAdvancedTradingCycle(world, companyId, targetGoods.slice(0, 10));
  }
  
  // 25. 【Phase 6】生产方式优化 - 根据市场供需自动调整
  if (world.tick % 12 === 0) { // 每12tick运行一次（半天）
    const optimizationCount = runProductionOptimization(world, companyId, personality);
    if (optimizationCount > 0) {
      console.log(`[AI生产优化 T${world.tick}] 公司${companyId}优化了${optimizationCount}个生产方式`);
    }
  }
  
  return executedDecisions;
}

// ==================== 新增辅助函数 ====================

/**
 * 【Phase 3】根据高级交易信号生成决策
 */
function generateAdvancedTradeDecisionsFromSignals(
  world: GameWorld,
  companyId: number,
  signals: TradingSignal[],
  riskSummary: ReturnType<typeof getRiskSummary>
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 获取整体风险分数
  const overallRiskScore = riskSummary?.overallScore || 0;
  
  for (const signal of signals) {
    if (signal.action === 'hold') continue;
    
    // 根据风险等级调整信号强度
    let adjustedStrength = signal.strength / 100; // 转换为0-1范围
    if (overallRiskScore > 70) {
      adjustedStrength *= 0.5; // 高风险时降低交易强度
    } else if (overallRiskScore > 50) {
      adjustedStrength *= 0.75;
    }
    
    if (adjustedStrength < 0.3) continue; // 信号太弱，跳过
    
    const quantity = Math.round(signal.suggestedQuantity * adjustedStrength);
    
    if (signal.action === 'buy') {
      const cost = quantity * signal.suggestedPrice;
      if (world.companies.cash[companyId] >= cost) {
        decisions.push({
          type: 'trading',
          companyId,
          action: 'buy',
          params: {
            goodsId: signal.goodsId,
            quantity,
            price: signal.suggestedPrice,
            strategy: signal.strategy,
          },
          priority: 6 + adjustedStrength * 3,
          expectedProfit: 0,
          confidence: adjustedStrength,
        });
      }
    } else if (signal.action === 'sell') {
      const inventory = world.companies.inventories[companyId * GOODS_COUNT + signal.goodsId];
      const reserved = world.companies.inventoryReserved[companyId * GOODS_COUNT + signal.goodsId];
      const available = inventory - reserved;
      
      if (available >= quantity * 0.5) {
        decisions.push({
          type: 'trading',
          companyId,
          action: 'sell',
          params: {
            goodsId: signal.goodsId,
            quantity: Math.min(quantity, available),
            price: signal.suggestedPrice,
            strategy: signal.strategy,
          },
          priority: 6 + adjustedStrength * 3,
          expectedProfit: signal.suggestedPrice * Math.min(quantity, available),
          confidence: adjustedStrength,
        });
      }
    }
  }
  
  return decisions;
}

/**
 * 【Phase 5】应用风险过滤
 */
function applyRiskFiltersToDecisions(
  decisions: AIDecision[],
  alerts: RiskAlert[],
  riskSummary: ReturnType<typeof getRiskSummary>
): AIDecision[] {
  // 根据风险警报调整决策
  for (const alert of alerts) {
    if (alert.severity === 'critical') {
      // 严重风险：大幅削减相关决策优先级
      if (alert.type === 'market') {
        decisions.filter(d => d.type === 'trading')
          .forEach(d => d.priority *= 0.3);
      } else if (alert.type === 'liquidity') {
        decisions.filter(d => d.type === 'investment')
          .forEach(d => d.priority *= 0.2);
        decisions.filter(d => d.type === 'trading' && d.action === 'buy')
          .forEach(d => d.priority *= 0.4);
      } else if (alert.type === 'concentration') {
        // 分散化：减少集中商品的交易
        decisions.filter(d => d.params.goodsId !== undefined)
          .forEach(d => d.priority *= 0.6);
      }
    } else if (alert.severity === 'warning') {
      // 高风险：适度调整
      if (alert.type === 'market') {
        decisions.filter(d => d.type === 'trading')
          .forEach(d => d.priority *= 0.7);
      } else if (alert.type === 'liquidity') {
        decisions.filter(d => d.type === 'trading' && d.action === 'sell')
          .forEach(d => d.priority *= 1.3); // 增加卖出优先级
      }
    }
  }
  
  // 根据整体风险水平调整
  if (riskSummary && riskSummary.overallScore > 80) {
    // 极高风险：只保留卖出和减产决策
    decisions = decisions.filter(d =>
      (d.type === 'trading' && d.action === 'sell') ||
      (d.type === 'production' && d.action === 'reduce_production')
    );
  }
  
  return decisions;
}

/**
 * 【Phase 4】应用竞争响应
 */
function applyCompetitiveResponseToDecisions(
  decisions: AIDecision[],
  competitiveSummary: ReturnType<typeof getCompetitiveSummary>,
  responses: ReturnType<typeof generateCompetitiveResponses>
): AIDecision[] {
  if (!competitiveSummary) return decisions;
  
  // 根据市场地位调整策略
  if (competitiveSummary.marketPosition === 'leader') {
    // 市场领导者：防守策略
    decisions.filter(d => d.type === 'trading' && d.action === 'sell')
      .forEach(d => d.priority *= 1.1);
  } else if (competitiveSummary.marketPosition === 'challenger') {
    // 挑战者：进攻策略
    decisions.filter(d => d.type === 'investment')
      .forEach(d => d.priority *= 1.2);
    decisions.filter(d => d.type === 'trading' && d.action === 'sell')
      .forEach(d => {
        if (d.params.price) {
          d.params.price = (d.params.price as number) * 0.95;
        }
      });
  } else if (competitiveSummary.marketPosition === 'niche') {
    // 利基市场：专注策略
    // 不做特别调整
  }
  
  // 根据推荐焦点调整
  if (competitiveSummary.recommendedFocus === 'defend') {
    decisions.filter(d => d.type === 'trading' && d.action === 'sell')
      .forEach(d => d.priority *= 1.2);
  } else if (competitiveSummary.recommendedFocus === 'attack') {
    decisions.filter(d => d.type === 'investment')
      .forEach(d => d.priority *= 1.3);
  } else if (competitiveSummary.recommendedFocus === 'expand') {
    decisions.filter(d => d.type === 'investment')
      .forEach(d => d.priority *= 1.2);
  }
  
  // 应用具体竞争响应
  for (const response of responses.slice(0, 3)) { // 只处理前3个响应
    if (response.response === 'undercut' && response.targetGoods) {
      decisions.filter(d =>
        d.type === 'trading' &&
        d.action === 'sell' &&
        response.targetGoods!.includes(d.params.goodsId as number)
      ).forEach(d => {
        if (d.params.price) {
          d.params.price = (d.params.price as number) * 0.9;
        }
        d.priority *= 1.3;
      });
    }
  }
  
  return decisions;
}

/**
 * 【Phase 1】战略对齐
 */
function alignDecisionsWithStrategy(
  decisions: AIDecision[],
  strategySummary: NonNullable<ReturnType<typeof getStrategySummary>>,
  planActions: ReturnType<typeof getCurrentPlanActions>
): AIDecision[] {
  // 根据当前战略类型调整决策优先级
  switch (strategySummary.currentStrategy) {
    case 'market_expansion':
      // 市场扩张：优先扩张和低价销售
      decisions.filter(d => d.type === 'investment')
        .forEach(d => d.priority *= 1.3);
      decisions.filter(d => d.type === 'trading' && d.action === 'sell')
        .forEach(d => {
          d.priority *= 1.2;
          if (d.params.price) {
            d.params.price = (d.params.price as number) * 0.95;
          }
        });
      break;
      
    case 'cost_reduction':
      // 成本削减：优先减产和低价采购
      decisions.filter(d => d.type === 'production' && d.action === 'reduce_production')
        .forEach(d => d.priority *= 1.4);
      decisions.filter(d => d.type === 'trading' && d.action === 'buy')
        .forEach(d => {
          if (d.params.price) {
            d.params.price = (d.params.price as number) * 0.9;
          }
        });
      break;
      
    case 'premium_positioning':
      // 高端定位：优先高价销售
      decisions.filter(d => d.type === 'trading' && d.action === 'sell')
        .forEach(d => {
          if (d.params.price) {
            d.params.price = (d.params.price as number) * 1.15;
          }
        });
      break;
      
    case 'diversification':
      // 多元化：分散投资
      const goodsCounts = new Map<number, number>();
      decisions.forEach(d => {
        const goodsId = d.params.goodsId as number;
        if (goodsId !== undefined) {
          goodsCounts.set(goodsId, (goodsCounts.get(goodsId) || 0) + 1);
        }
      });
      decisions.forEach(d => {
        const goodsId = d.params.goodsId as number;
        if (goodsId !== undefined && goodsCounts.get(goodsId)! > 3) {
          d.priority *= 0.7;
        }
      });
      break;
      
    case 'survival':
      // 生存模式：只保留必要决策
      decisions.filter(d => d.type === 'investment')
        .forEach(d => d.priority *= 0.1);
      decisions.filter(d => d.type === 'trading' && d.action === 'sell')
        .forEach(d => d.priority *= 1.5);
      break;
  }
  
  // 根据计划动作调整
  for (const action of planActions.slice(0, 5)) {
    if (action.type === 'build' && action.params.buildingTypeId !== undefined) {
      decisions.filter(d =>
        d.type === 'investment' &&
        d.action === 'build' &&
        d.params.buildingTypeId === action.params.buildingTypeId
      ).forEach(d => d.priority *= 1.5);
    }
    
    if (action.type === 'trade' && action.params.goodsId !== undefined) {
      decisions.filter(d =>
        d.type === 'trading' &&
        d.params.goodsId === action.params.goodsId
      ).forEach(d => d.priority *= 1.3);
    }
  }
  
  return decisions;
}

/**
 * 【新增】基于价格预测生成智能交易决策
 */
function generatePredictiveTradeDecisions(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality,
  pattern: typeof BEHAVIOR_PATTERNS[keyof typeof BEHAVIOR_PATTERNS]
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 获取该人格关注的目标商品
  const targetGoods = getPersonalityTargetGoods(world, personality, companyId);
  
  for (const goodsId of targetGoods.slice(0, 10)) { // 限制处理数量
    const result = optimizeTradingWithPrediction(world, companyId, goodsId, pattern);
    
    if (result.shouldTrade) {
      if (result.action === 'buy') {
        // 检查资金
        const cost = result.quantity * result.price;
        if (world.companies.cash[companyId] >= cost) {
          decisions.push({
            type: 'trading',
            companyId,
            action: 'buy',
            params: {
              goodsId,
              quantity: result.quantity,
              price: result.price,
            },
            priority: 7,
            expectedProfit: 0,
            confidence: 0.75,
          });
        }
      } else if (result.action === 'sell') {
        // 检查库存
        const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
        const reserved = world.companies.inventoryReserved[companyId * GOODS_COUNT + goodsId];
        const available = inventory - reserved;
        
        if (available >= result.quantity * 0.5) {
          decisions.push({
            type: 'trading',
            companyId,
            action: 'sell',
            params: {
              goodsId,
              quantity: Math.min(result.quantity, available),
              price: result.price,
            },
            priority: 7,
            expectedProfit: result.quantity * result.price,
            confidence: 0.75,
          });
        }
      }
    }
  }
  
  return decisions;
}

/**
 * 【新增】获取公司的综合分析报告
 */
export function getCompanyAnalysisReport(
  world: GameWorld,
  companyId: number
): ComprehensiveAnalysis {
  return performComprehensiveAnalysis(world, companyId);
}

/**
 * 【新增】获取AI公司的最佳交易机会
 */
export function getAIBestOpportunities(
  world: GameWorld,
  companyId: number
): { buyOpportunities: PricePrediction[]; sellOpportunities: PricePrediction[] } {
  return {
    buyOpportunities: getBestBuyOpportunities(world, 5),
    sellOpportunities: getBestSellOpportunities(world, 5),
  };
}

/**
 * 更新所有AI公司
 */
export function updateAllAICompanies(world: GameWorld): Map<number, AIDecision[]> {
  const results = new Map<number, AIDecision[]>();
  
  for (let i = 0; i < world.companies.count; i++) {
    if (world.companies.isAI[i]) {
      const decisions = runAIDecisionCycle(world, i);
      results.set(i, decisions);
    }
  }
  
  return results;
}

/**
 * 执行AI股票交易
 *
 * 专门用于在GameLoop中调用，确保AI公司参与股票市场交易
 * 设计目标：
 * 1. 批量处理AI公司的股票交易决策
 * 2. 分散执行避免性能问题
 * 3. 确保市场有足够的流动性
 *
 * @param world 游戏世界
 * @returns 执行的股票交易决策数量
 */
export function executeAIStockTrading(world: GameWorld): number {
  let totalDecisions = 0;
  const c = world.companies;
  
  // 根据tick轮流处理不同的AI公司批次，分散负载
  // 每次处理约1/4的AI公司
  const batchSize = Math.ceil(c.count / 4);
  const batchIndex = (world.tick % 4);
  const startIdx = batchIndex * batchSize;
  const endIdx = Math.min(startIdx + batchSize, c.count);
  
  for (let companyId = Math.max(1, startIdx); companyId < endIdx; companyId++) {
    if (!c.isAI[companyId]) continue;
    if (c.cash[companyId] < 10000) continue; // 资金太少的公司跳过
    
    // 获取公司人格
    const personality = getCompanyPersonalityInternal(companyId);
    
    // 评估公司状态
    const assessment = assessCompanyState(world, companyId);
    
    // 生成股票交易决策
    const stockDecisions = generateStockTradingDecisions(world, companyId, assessment, personality);
    
    // 按优先级排序
    stockDecisions.sort((a, b) => b.priority - a.priority);
    
    // 执行前3个最高优先级的决策
    for (let i = 0; i < Math.min(3, stockDecisions.length); i++) {
      const decision = stockDecisions[i];
      if (executeStockTradingDecision(world, decision)) {
        totalDecisions++;
      }
    }
  }
  
  // 调试日志（每100个tick输出一次）
  if (world.tick % 100 === 0 && totalDecisions > 0) {
    console.log(`[AI股票交易 T${world.tick}] 执行了${totalDecisions}个股票交易决策`);
  }
  
  return totalDecisions;
}

/**
 * AI公司订单价格自动调整
 *
 * 功能：调整长期未成交的AI公司订单价格
 * - 卖单：降价促销
 * - 买单：涨价买入
 *
 * @param world 游戏世界
 * @param companyId AI公司ID
 */
function adjustAIStaleOrderPrices(world: GameWorld, companyId: number): void {
  const o = world.orders;
  const currentTick = world.tick;
  
  // 收集需要调整的订单
  const ordersToAdjust: Array<{
    orderIdx: number;
    goodsId: number;
    orderType: number; // 0=buy, 1=sell
    price: number;
    remaining: number;
    createdTick: number;
  }> = [];
  
  for (let i = 0; i < MAX_ORDERS; i++) {
    if (!o.isActive[i] || o.companyIds[i] !== companyId) continue;
    
    const orderAge = currentTick - o.createdTicks[i];
    
    // 只调整存在超过阈值时间的订单
    if (orderAge >= AI_ORDER_PRICE_ADJUST_CONFIG.adjustAfterTicks) {
      ordersToAdjust.push({
        orderIdx: i,
        goodsId: o.goodsIds[i],
        orderType: o.types[i],
        price: o.prices[i],
        remaining: o.remainings[i],
        createdTick: o.createdTicks[i],
      });
    }
  }
  
  // 调整每个订单
  for (const order of ordersToAdjust) {
    const goods = ALL_GOODS.find(g => g.id === order.goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    let newPrice: number;
    
    if (order.orderType === 1) {
      // 卖单：降价
      newPrice = order.price * (1 - AI_ORDER_PRICE_ADJUST_CONFIG.adjustPercent);
      const minPrice = basePrice * AI_ORDER_PRICE_ADJUST_CONFIG.minSellPriceRatio;
      
      // 检查是否低于最低价
      if (newPrice < minPrice) {
        newPrice = minPrice;
        // 如果已经是最低价，不再调整
        if (order.price <= minPrice) {
          continue;
        }
      }
      
      // 取消旧订单，以新价格重新下单
      if (cancelOrder(world, order.orderIdx)) {
        const orderId = createSellOrder(
          world,
          companyId,
          order.goodsId,
          order.remaining,
          newPrice,
          24 * 5
        );
        // 调试日志（每100tick输出一次）
        if (orderId !== null && world.tick % 100 === 0) {
          // console.log(`[AI价格调整] 公司${companyId} 卖单 商品${order.goodsId} 降价 ${order.price.toFixed(2)} -> ${newPrice.toFixed(2)}`);
        }
      }
    } else {
      // 买单：涨价
      newPrice = order.price * (1 + AI_ORDER_PRICE_ADJUST_CONFIG.adjustPercent);
      const maxPrice = basePrice * AI_ORDER_PRICE_ADJUST_CONFIG.maxBuyPriceRatio;
      
      // 检查是否高于最高价
      if (newPrice > maxPrice) {
        newPrice = maxPrice;
        // 如果已经是最高价，不再调整
        if (order.price >= maxPrice) {
          continue;
        }
      }
      
      // 取消旧订单，以新价格重新下单
      if (cancelOrder(world, order.orderIdx)) {
        const orderId = createBuyOrder(
          world,
          companyId,
          order.goodsId,
          order.remaining,
          newPrice,
          9999999
        );
        // 调试日志
        if (orderId !== null && world.tick % 100 === 0) {
          // console.log(`[AI价格调整] 公司${companyId} 买单 商品${order.goodsId} 涨价 ${order.price.toFixed(2)} -> ${newPrice.toFixed(2)}`);
        }
      }
    }
  }
}

/**
 * 批量调整所有AI公司的订单价格
 *
 * 在GameLoop中定期调用，确保AI公司的订单能够成交
 *
 * @param world 游戏世界
 * @returns 调整的订单数量
 */
export function adjustAllAIOrderPrices(world: GameWorld): number {
  const c = world.companies;
  let totalAdjusted = 0;
  
  // 每6tick运行一次，分批处理不同的AI公司
  // 根据tick轮流处理不同的AI公司批次，分散负载
  const batchSize = Math.ceil(c.count / 6);
  const batchIndex = (world.tick % 6);
  const startIdx = batchIndex * batchSize;
  const endIdx = Math.min(startIdx + batchSize, c.count);
  
  for (let companyId = Math.max(1, startIdx); companyId < endIdx; companyId++) {
    if (!c.isAI[companyId]) continue;
    
    // 记录调整前的订单数
    const beforeCount = countCompanyOrders(world, companyId);
    
    // 调整订单价格
    adjustAIStaleOrderPrices(world, companyId);
    
    // 记录调整后的订单数（用于统计）
    const afterCount = countCompanyOrders(world, companyId);
    
    // 如果有订单被调整（取消+重新下单），计数
    if (beforeCount > 0) {
      totalAdjusted++;
    }
  }
  
  // 调试日志
  if (world.tick % 100 === 0 && totalAdjusted > 0) {
    console.log(`[AI订单调价 T${world.tick}] 调整了${totalAdjusted}家公司的订单价格`);
  }
  
  return totalAdjusted;
}

/**
 * 统计公司的订单数量
 */
function countCompanyOrders(world: GameWorld, companyId: number): number {
  const o = world.orders;
  let count = 0;
  for (let i = 0; i < MAX_ORDERS; i++) {
    if (o.isActive[i] && o.companyIds[i] === companyId) {
      count++;
    }
  }
  return count;
}

/**
 * 内部函数：获取公司人格配置
 */
function getCompanyPersonalityInternal(companyId: number): AIPersonality {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  if (config) {
    return AI_PERSONALITIES[config.personality];
  }
  
  // 动态分配人格
  const personalityTypes: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive', 'opportunist', 'cost_leader', 'diversified',
    'specialist', 'innovator', 'conservative', 'premium',
  ];
  const typeIndex = (companyId - 1) % personalityTypes.length;
  return AI_PERSONALITIES[personalityTypes[typeIndex]];
}

// ==================== 自动挂单系统（弥补做市商缺失）====================

/**
 * AI公司自动挂卖单
 *
 * 设计目标：
 * 1. 确保AI生产商的库存能够进入市场
 * 2. 提供市场流动性，弥补做市商缺失
 * 3. 根据库存积压程度动态调整挂单价格和数量
 *
 * 调用时机：每tick在主循环中调用
 */
export function autoPostSellOrders(world: GameWorld): number {
  const c = world.companies;
  let ordersCreated = 0;
  
  // 遍历所有AI公司（跳过玩家公司 ID=0）
  for (let companyId = 1; companyId < c.count; companyId++) {
    if (!c.isAI[companyId]) continue;
    if (c.cash[companyId] < 0) continue;  // 破产公司跳过
    
    // 遍历该公司的所有商品库存
    for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
      const invIdx = companyId * GOODS_COUNT + goodsId;
      const inventory = c.inventories[invIdx];
      const reserved = c.inventoryReserved[invIdx];
      const available = inventory - reserved;
      
      // 只有可用库存大于5才考虑挂单
      if (available <= 5) continue;
      
      // 获取商品信息
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      if (!goods) continue;
      
      // 计算该公司的日产量（通过遍历建筑估算）
      const dailyOutput = estimateDailyOutput(world, companyId, goodsId);
      
      // 如果不生产此商品，可能是采购的原材料，谨慎挂单
      if (dailyOutput <= 0) {
        // 非生产商品，只在库存极度充裕时才卖
        if (available > 100) {
          const sellQty = Math.min(available * 0.3, 50);
          const sellPrice = goods.basePrice * 0.95;
          const orderId = createSellOrder(world, companyId, goodsId, sellQty, sellPrice);
          if (orderId !== null) ordersCreated++;
        }
        continue;
      }
      
      // 计算库存天数
      const inventoryDays = dailyOutput > 0 ? inventory / dailyOutput : 999;
      
      // 根据库存天数决定挂单策略
      let sellRatio: number;
      let priceMultiplier: number;
      
      if (inventoryDays > 30) {
        // 严重积压：挂出90%，大幅折扣
        sellRatio = 0.9;
        priceMultiplier = 0.75;  // 75%基准价
      } else if (inventoryDays > 14) {
        // 中度积压：挂出70%，适度折扣
        sellRatio = 0.7;
        priceMultiplier = 0.85;
      } else if (inventoryDays > 7) {
        // 轻度积压：挂出50%，微利
        sellRatio = 0.5;
        priceMultiplier = 0.95;
      } else if (inventoryDays > 3) {
        // 正常水平：挂出30%，正常利润
        sellRatio = 0.3;
        priceMultiplier = 1.05;
      } else {
        // 库存偏低：只挂10%，较高利润
        sellRatio = 0.1;
        priceMultiplier = 1.15;
      }
      
      // 计算挂单数量
      const sellQuantity = Math.max(1, Math.floor(available * sellRatio));
      
      // 计算挂单价格
      const basePrice = goods.basePrice;
      const marketPrice = world.goods.prices[goodsId];
      
      // 取基准价和市场价的较低者，再乘以倍率
      const referencePrice = Math.min(basePrice, marketPrice);
      let sellPrice = referencePrice * priceMultiplier;
      
      // 价格下限：不低于基准价的50%
      sellPrice = Math.max(sellPrice, basePrice * 0.5);
      
      // 检查是否已有相似价格的挂单（避免重复挂单）
      if (!hasExistingOrder(world, companyId, goodsId, sellPrice * 0.95, sellPrice * 1.05)) {
        const orderId = createSellOrder(world, companyId, goodsId, sellQuantity, sellPrice);
        if (orderId !== null) {
          ordersCreated++;
        }
      }
    }
  }
  
  // 调试日志
  if (world.tick % 100 === 0 && ordersCreated > 0) {
    console.log(`[AI自动挂单 T${world.tick}] 创建${ordersCreated}个卖单`);
  }
  
  return ordersCreated;
}

/**
 * 估算公司对某商品的日产量
 */
function estimateDailyOutput(world: GameWorld, companyId: number, goodsId: number): number {
  const b = world.buildings;
  let dailyOutput = 0;
  
  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (!b.isActive[i]) continue;
    
    const recipeId = b.recipeIds[i];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    // 检查该配方是否产出目标商品
    for (const output of recipe.outputs) {
      if (output.goodsId === goodsId) {
        // 基础产量 × 效率 × 24tick/天
        const efficiency = b.efficiencies[i] || 1;
        dailyOutput += output.amount * efficiency * 24;
      }
    }
  }
  
  return dailyOutput;
}

/**
 * 检查是否已有相似价格的挂单（优化版：使用订单合并机制替代）
 *
 * 【性能优化说明】
 * 原函数会遍历所有订单（O(n)复杂度），当订单池满时导致严重性能问题。
 * 现在改用订单合并机制：createSellOrder已经实现了订单合并功能，
 * 相似价格的订单会自动合并，无需提前检查。
 *
 * @deprecated 不再需要此检查，订单创建时会自动合并相似订单
 */
function hasExistingOrder(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  minPrice: number,
  maxPrice: number
): boolean {
  // 【优化】直接返回false，让createSellOrder处理合并逻辑
  // 这样可以避免O(n)遍历，且createSellOrder已经实现了更好的合并策略
  return false;
}

/**
 * AI公司自动挂买单（采购原材料）
 *
 * 设计目标：
 * 1. 确保AI生产商能够获取生产所需的原材料
 * 2. 提供市场买方流动性
 * 3. 避免对无供应商品反复下单导致订单堆积
 */
export function autoPostBuyOrders(world: GameWorld): number {
  const c = world.companies;
  const b = world.buildings;
  const o = world.orders;
  let ordersCreated = 0;
  
  // 遍历所有AI公司
  for (let companyId = 1; companyId < c.count; companyId++) {
    if (!c.isAI[companyId]) continue;
    
    // 现金不足时跳过采购
    if (c.cash[companyId] < 50000) continue;
    
    // 遍历该公司的建筑，收集原材料需求
    const materialNeeds = new Map<number, number>();  // goodsId -> dailyNeed
    
    for (let i = 0; i < b.count; i++) {
      if (b.owners[i] !== companyId) continue;
      if (!b.isActive[i]) continue;
      
      const recipeId = b.recipeIds[i];
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!recipe) continue;
      
      // 累计原材料需求
      for (const input of recipe.inputs) {
        const currentNeed = materialNeeds.get(input.goodsId) || 0;
        const efficiency = b.efficiencies[i] || 1;
        materialNeeds.set(input.goodsId, currentNeed + input.amount * efficiency * 24);
      }
    }
    
    // 对每种原材料检查库存并决定是否采购
    for (const [goodsId, dailyNeed] of materialNeeds) {
      const invIdx = companyId * GOODS_COUNT + goodsId;
      const inventory = c.inventories[invIdx];
      const reserved = c.inventoryReserved[invIdx];
      const available = inventory - reserved;
      
      // 计算库存天数
      const inventoryDays = dailyNeed > 0 ? available / dailyNeed : 999;
      
      // 库存不足5天时采购
      if (inventoryDays < 5) {
        // 【新增】检查现有买单数量，避免订单堆积
        let existingBuyQuantity = 0;
        for (let j = 0; j < o.maxOrders; j++) {
          if (o.isActive[j] &&
              o.companyIds[j] === companyId &&
              o.goodsIds[j] === goodsId &&
              o.types[j] === 0) { // 买单
            existingBuyQuantity += o.remainings[j];
          }
        }
        
        // 如果现有买单已经足够覆盖需求，跳过
        const pendingDays = dailyNeed > 0 ? existingBuyQuantity / dailyNeed : 0;
        if (pendingDays >= 3) {
          continue; // 已有3天的买单在排队，不再下单
        }
        
        const goods = ALL_GOODS.find(g => g.id === goodsId);
        if (!goods) continue;
        
        // 【新增】检查市场是否有供应
        const hasSupply = world.goods.supplies[goodsId] > 0;
        
        // 采购量：补充到10天用量，但限制最大值
        // 无供应时更保守，避免订单堆积
        const maxBuyQty = hasSupply ? 500 : 100;
        const buyQuantity = Math.min(
          Math.max(10, (10 - inventoryDays - pendingDays) * dailyNeed),
          maxBuyQty
        );
        
        if (buyQuantity <= 0) continue;
        
        // 采购价格：根据紧急程度调整
        const basePrice = goods.basePrice;
        const marketPrice = world.goods.prices[goodsId];
        let maxBuyPrice: number;
        
        if (inventoryDays < 1) {
          // 紧急：愿意支付高溢价
          maxBuyPrice = Math.max(basePrice, marketPrice) * 1.3;
        } else if (inventoryDays < 3) {
          // 较急：适度溢价
          maxBuyPrice = Math.max(basePrice, marketPrice) * 1.15;
        } else {
          // 一般：正常价格
          maxBuyPrice = Math.max(basePrice, marketPrice) * 1.05;
        }
        
        // 检查资金是否充足
        const totalCost = buyQuantity * maxBuyPrice;
        if (c.cash[companyId] >= totalCost * 0.5) {
          const actualBuyQty = c.cash[companyId] >= totalCost
            ? buyQuantity
            : Math.floor(c.cash[companyId] / maxBuyPrice * 0.5);
          
          if (actualBuyQty > 0) {
            // 建造材料订单永不过期
            const orderId = createBuyOrder(world, companyId, goodsId, actualBuyQty, maxBuyPrice, 9999999);
            if (orderId !== null) {
              ordersCreated++;
            }
          }
        }
      }
    }
  }
  
  return ordersCreated;
}

// ==================== 附属建筑决策系统 ====================

/**
 * 生成附属建筑决策
 *
 * AI公司会根据以下因素决定是否安装附属建筑：
 * 1. 现金充裕程度
 * 2. 建筑的生产效率需求
 * 3. 附属建筑的性价比
 * 4. 公司人格特点
 */
export function generateSubsidiaryDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment,
  personality: AIPersonality
): AIDecision[] {
  const decisions: AIDecision[] = [];
  const b = world.buildings;
  const c = world.companies;
  
  // 现金门槛：至少保留一定现金用于运营
  const minCashReserve = 100000;
  const availableCash = c.cash[companyId] - minCashReserve;
  
  if (availableCash <= 0) {
    return decisions;
  }
  
  // 遍历公司的所有建筑
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== companyId) continue;
    if (!b.isActive[buildingId]) continue;
    
    const buildingTypeId = b.types[buildingId];
    const buildingLevel = b.levels[buildingId];
    
    // 1. 检查是否需要维修现有附属建筑
    const repairDecisions = generateRepairDecisions(world, companyId, buildingId, availableCash);
    decisions.push(...repairDecisions);
    
    // 2. 检查是否可以安装新的附属建筑
    const availableSlots = getAvailableSubsidiarySlots(world, buildingId);
    if (availableSlots <= 0) continue;
    
    // 获取可用的附属建筑
    const availableSubs = getAvailableSubsidiaries(buildingTypeId, buildingLevel);
    if (availableSubs.length === 0) continue;
    
    // 评估每个附属建筑的价值
    const evaluatedSubs = evaluateSubsidiaries(world, companyId, buildingId, availableSubs, personality);
    
    // 选择最有价值的附属建筑
    for (const evalSub of evaluatedSubs.slice(0, 2)) { // 每个建筑最多考虑2个
      if (evalSub.score < 50) continue; // 分数太低不考虑
      if (evalSub.def.buildCost > availableCash * 0.3) continue; // 单个附属建筑不超过可用现金的30%
      
      // 检查是否可以安装
      const check = canInstallSubsidiary(world, buildingId, evalSub.def.id);
      if (!check.canInstall) continue;
      
      decisions.push({
        type: 'subsidiary',
        companyId,
        action: 'install',
        params: {
          buildingId,
          subsidiaryId: evalSub.def.id,
          cost: evalSub.def.buildCost,
          score: evalSub.score,
        },
        priority: 4 + evalSub.score / 25, // 4-8 优先级
        expectedProfit: evalSub.expectedBenefit,
        confidence: 0.6 + evalSub.score / 200,
      });
    }
  }
  
  return decisions;
}

/**
 * 生成维修决策
 */
function generateRepairDecisions(
  world: GameWorld,
  companyId: number,
  buildingId: number,
  availableCash: number
): AIDecision[] {
  const decisions: AIDecision[] = [];
  const b = world.buildings;
  const subsidiaryOffset = buildingId * MAX_SUBSIDIARIES;
  
  for (let slotIndex = 0; slotIndex < MAX_SUBSIDIARIES; slotIndex++) {
    const subId = b.subsidiaryIds[subsidiaryOffset + slotIndex];
    if (subId === 0) continue;
    
    const condition = b.subsidiaryConditions[subsidiaryOffset + slotIndex];
    
    // 状态低于70%时考虑维修
    if (condition < 0.7) {
      const costResult = calculateRepairCost(world, buildingId, slotIndex);
      if (!costResult.canRepair) continue;
      
      // 检查是否有足够资金
      if (costResult.cost > availableCash * 0.1) continue; // 维修费不超过可用现金的10%
      
      const def = getSubsidiaryDef(subId);
      const urgency = 1 - condition; // 状态越差越紧急
      
      decisions.push({
        type: 'subsidiary',
        companyId,
        action: 'repair',
        params: {
          buildingId,
          slotIndex,
          subsidiaryId: subId,
          cost: costResult.cost,
          currentCondition: condition,
        },
        priority: 5 + urgency * 4, // 5-9 优先级
        expectedProfit: 0,
        confidence: 0.8,
      });
    }
  }
  
  return decisions;
}

/**
 * 评估附属建筑的价值
 */
interface SubsidiaryEvaluation {
  def: SubsidiaryBuildingDef;
  score: number;
  expectedBenefit: number;
}

function evaluateSubsidiaries(
  world: GameWorld,
  companyId: number,
  buildingId: number,
  subsidiaries: SubsidiaryBuildingDef[],
  personality: AIPersonality
): SubsidiaryEvaluation[] {
  const evaluations: SubsidiaryEvaluation[] = [];
  const b = world.buildings;
  
  // 获取建筑的配方信息
  const recipeId = b.recipeIds[buildingId];
  const recipe = RECIPES.find(r => r.id === recipeId);
  
  for (const def of subsidiaries) {
    let score = 50; // 基础分
    let expectedBenefit = 0;
    
    const effects = def.effects;
    
    // 1. 产出加成评分
    if (effects.outputMultiplier && effects.outputMultiplier > 1) {
      const bonus = (effects.outputMultiplier - 1) * 100;
      score += bonus * 2; // 每1%产出加成 +2分
      
      // 估算收益
      if (recipe) {
        for (const output of recipe.outputs) {
          const price = world.goods.prices[output.goodsId];
          expectedBenefit += output.amount * price * (effects.outputMultiplier - 1) * 24 * 30; // 月收益
        }
      }
    }
    
    // 2. 品质加成评分
    if (effects.qualityBonus && effects.qualityBonus > 0) {
      score += effects.qualityBonus * 50; // 每0.1品质 +5分
      
      // 高端型人格更看重品质
      if (personality.pricingBias > 0.3) {
        score += effects.qualityBonus * 30;
      }
    }
    
    // 3. 成本节约评分
    if (effects.laborReduction && effects.laborReduction > 0) {
      score += effects.laborReduction * 100; // 每10%人工节约 +10分
      
      // 成本领先型更看重成本节约
      if (personality.pricingBias < -0.2) {
        score += effects.laborReduction * 50;
      }
    }
    
    if (effects.inputReduction && effects.inputReduction > 0) {
      score += effects.inputReduction * 150; // 每10%原料节约 +15分
    }
    
    // 4. 容量扩展评分
    if (effects.storageCapacity && effects.storageCapacity > 0) {
      score += Math.min(effects.storageCapacity / 10, 20); // 最多+20分
    }
    
    // 5. 额外产出评分
    if (effects.bonusOutputChance && effects.bonusOutputChance > 0) {
      score += effects.bonusOutputChance * 100; // 每10%几率 +10分
    }
    
    // 6. 性价比调整
    const costRatio = def.buildCost / 100000; // 以10万为基准
    score = score / Math.max(costRatio, 0.5); // 成本越高分数越低
    
    // 7. 根据公司人格调整
    // 激进型更愿意投资
    if (personality.expansionBias > 0.5) {
      score *= 1.2;
    }
    // 保守型更谨慎
    if (personality.expansionBias < 0.3) {
      score *= 0.8;
    }
    
    // 8. 类别偏好
    switch (def.category) {
      case 'production':
        // 所有人格都喜欢生产增强
        score *= 1.1;
        break;
      case 'quality':
        // 高端型更喜欢品质
        if (personality.pricingBias > 0.3) {
          score *= 1.3;
        }
        break;
      case 'efficiency':
        // 成本领先型更喜欢效率
        if (personality.pricingBias < -0.2) {
          score *= 1.3;
        }
        break;
      case 'specialized':
        // 专精型更喜欢专业化
        if (personality.specializationDegree > 0.6) {
          score *= 1.2;
        }
        break;
    }
    
    evaluations.push({
      def,
      score,
      expectedBenefit,
    });
  }
  
  // 按分数排序
  evaluations.sort((a, b) => b.score - a.score);
  
  return evaluations;
}

/**
 * 执行附属建筑决策
 */
function executeSubsidiaryDecision(world: GameWorld, decision: AIDecision): boolean {
  const { companyId, action, params } = decision;
  const c = world.companies;
  
  if (action === 'install') {
    const buildingId = params.buildingId as number;
    const subsidiaryId = params.subsidiaryId as number;
    const cost = params.cost as number;
    
    // 检查资金
    if (c.cash[companyId] < cost) {
      return false;
    }
    
    // 检查是否可以安装
    const check = canInstallSubsidiary(world, buildingId, subsidiaryId);
    if (!check.canInstall) {
      return false;
    }
    
    // 扣费
    c.cash[companyId] -= cost;
    
    // 安装
    const result = installSubsidiary(world, buildingId, subsidiaryId);
    
    if (result.success) {
      const def = getSubsidiaryDef(subsidiaryId);
      console.log(`[AI附属建筑 T${world.tick}] 公司${companyId}在建筑${buildingId}安装了「${def?.name || '未知'}」，花费¥${cost}`);
      return true;
    } else {
      // 恢复资金
      c.cash[companyId] += cost;
      return false;
    }
  } else if (action === 'repair') {
    const buildingId = params.buildingId as number;
    const slotIndex = params.slotIndex as number;
    const cost = params.cost as number;
    
    // 检查资金
    if (c.cash[companyId] < cost) {
      return false;
    }
    
    // 扣费
    c.cash[companyId] -= cost;
    
    // 维修
    const result = repairSubsidiary(world, buildingId, slotIndex);
    
    if (result.success) {
      const subsidiaryId = params.subsidiaryId as number;
      const def = getSubsidiaryDef(subsidiaryId);
      console.log(`[AI附属建筑 T${world.tick}] 公司${companyId}维修了建筑${buildingId}的「${def?.name || '未知'}」，花费¥${cost.toFixed(0)}`);
      return true;
    } else {
      // 恢复资金
      c.cash[companyId] += cost;
      return false;
    }
  }
  
  return false;
}

/**
 * AI公司自动管理附属建筑
 *
 * 在GameLoop中定期调用，用于：
 * 1. 批量处理AI公司的附属建筑决策
 * 2. 自动维修状态较差的附属建筑
 * 3. 根据市场情况安装新的附属建筑
 */
export function runAISubsidiaryManagement(world: GameWorld): number {
  let totalActions = 0;
  const c = world.companies;
  
  // 每24tick（1天）运行一次
  if (world.tick % 24 !== 0) {
    return 0;
  }
  
  // 遍历所有AI公司
  for (let companyId = 1; companyId < c.count; companyId++) {
    if (!c.isAI[companyId]) continue;
    if (c.cash[companyId] < 50000) continue; // 资金太少跳过
    
    // 获取公司人格
    const personality = getCompanyPersonalityForSubsidiary(companyId);
    
    // 评估公司状态
    const assessment = assessCompanyState(world, companyId);
    
    // 生成附属建筑决策
    const decisions = generateSubsidiaryDecisions(world, companyId, assessment, personality);
    
    // 按优先级排序
    decisions.sort((a, b) => b.priority - a.priority);
    
    // 执行前3个最高优先级的决策
    for (let i = 0; i < Math.min(3, decisions.length); i++) {
      if (executeSubsidiaryDecision(world, decisions[i])) {
        totalActions++;
      }
    }
  }
  
  // 调试日志
  if (totalActions > 0) {
    console.log(`[AI附属建筑管理 T${world.tick}] 执行了${totalActions}个附属建筑操作`);
  }
  
  return totalActions;
}

/**
 * 获取公司人格（用于附属建筑决策）
 */
function getCompanyPersonalityForSubsidiary(companyId: number): AIPersonality {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  if (config) {
    return AI_PERSONALITIES[config.personality];
  }
  
  // 动态分配人格
  const personalityTypes: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive', 'opportunist', 'cost_leader', 'diversified',
    'specialist', 'innovator', 'conservative', 'premium',
  ];
  const typeIndex = (companyId - 1) % personalityTypes.length;
  return AI_PERSONALITIES[personalityTypes[typeIndex]];
}