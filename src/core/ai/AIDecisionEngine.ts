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
import { ALL_BUILDINGS, getBuildingProduction, hasMultipleOutputModes } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import {
  GOODS_COUNT,
  AI_DECISION_INTERVAL,
  ACTUAL_GOODS_COUNT,
  MAX_SUBSIDIARIES,
  AI_BUY_ORDER_EXPIRY,
  AI_SELL_ORDER_EXPIRY,
  BUILDING_MATERIAL_ORDER_EXPIRY,
} from '@/core/constants';
import { getOrderBookView, cancelOrder, hasExistingOrderForCompanyGoods, getActiveOrderIndices } from '@/core/market/OrderBook';
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
  evaluatePersonalityGoalGap,
  getBuildingTypeWeight
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
import { applyAutomaticEfficiencySafely } from '@/core/production/ProductionControl';

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

// ==================== AI建造意向队列系统 ====================

/**
 * 建造意向 - 跟踪AI公司待建造的建筑
 */
interface BuildingIntent {
  companyId: number;
  buildingTypeId: number;
  outputModeId: number;
  cost: number;
  createdTick: number;
  attempts: number; // 尝试次数
  materialsOrdered: boolean; // 是否已下达材料采购单
}

/**
 * 建造意向队列 - 每个公司最多保存3个待建意向
 */
const buildingIntents = new Map<number, BuildingIntent[]>();

/**
 * 获取公司的建造意向
 */
function getBuildingIntents(companyId: number): BuildingIntent[] {
  return buildingIntents.get(companyId) || [];
}

/**
 * 添加建造意向
 */
function addBuildingIntent(intent: BuildingIntent): void {
  const intents = buildingIntents.get(intent.companyId) || [];
  
  // 检查是否已有相同类型的建造意向
  const exists = intents.some(i =>
    i.buildingTypeId === intent.buildingTypeId &&
    i.outputModeId === intent.outputModeId
  );
  
  if (!exists && intents.length < 3) { // 每个公司最多3个待建意向
    intents.push(intent);
    buildingIntents.set(intent.companyId, intents);
  }
}

/**
 * 移除建造意向
 */
function removeBuildingIntent(companyId: number, buildingTypeId: number, outputModeId: number): void {
  const intents = buildingIntents.get(companyId) || [];
  const newIntents = intents.filter(i =>
    !(i.buildingTypeId === buildingTypeId && i.outputModeId === outputModeId)
  );
  buildingIntents.set(companyId, newIntents);
}

/**
 * 处理公司的待建意向
 * 检查材料是否已到位，如果是则执行建造
 *
 * 【关键改进】
 * 1. 延长过期时间到2000tick（约83游戏天）
 * 2. 每次检查时主动追加采购单
 * 3. 使用"吃单"策略直接以卖单价格买入
 */
function processBuildingIntents(world: GameWorld, companyId: number): number {
  const intents = getBuildingIntents(companyId);
  if (intents.length === 0) return 0;
  
  let built = 0;
  const remainingIntents: BuildingIntent[] = [];
  
  for (const intent of intents) {
    // 【改进1】延长过期时间到2000tick（约83游戏天）
    if (world.tick - intent.createdTick > 2000) {
      console.log(`[AI建造意向] 公司${companyId}的${intent.buildingTypeId}建造意向过期`);
      continue; // 放弃这个意向
    }
    
    // 【改进2】每10tick主动检查并追加采购单
    if (intent.attempts % 10 === 0) {
      ensureAllMaterialsOrdered(world, intent);
    }
    
    // 尝试执行建造
    const success = tryExecuteBuild(world, intent);
    
    if (success) {
      built++;
      console.log(`[AI建造成功] 公司${companyId}完成了待建项目 buildingType=${intent.buildingTypeId}`);
    } else {
      // 更新尝试次数
      intent.attempts++;
      
      // 【改进3】放宽尝试次数限制到200次
      if (intent.attempts > 200) {
        console.log(`[AI建造意向] 公司${companyId}的${intent.buildingTypeId}建造意向因尝试次数过多放弃`);
        continue;
      }
      
      remainingIntents.push(intent);
    }
  }
  
  buildingIntents.set(companyId, remainingIntents);
  return built;
}

/**
 * 确保所有建造材料都有采购单
 * 使用"吃单"策略 - 直接以卖单价格买入
 */
function ensureAllMaterialsOrdered(world: GameWorld, intent: BuildingIntent): void {
  const { companyId, buildingTypeId } = intent;
  const materials = getBaseMaterials(buildingTypeId);
  
  for (const mat of materials) {
    const idx = companyId * GOODS_COUNT + mat.goodsId;
    const available = world.companies.inventories[idx] - world.companies.inventoryReserved[idx];
    
    if (available < mat.amount) {
      const needed = mat.amount - available;
      
      // 使用吃单策略采购
      tryTakeSellOrderForMaterial(world, companyId, mat.goodsId, needed);
    }
  }
}

/**
 * 吃单采购建材 - 直接以卖单价格买入，确保能够成交
 */
function tryTakeSellOrderForMaterial(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  neededAmount: number
): boolean {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return false;
  
  // 获取订单簿，找最低价的卖单
  const orderBook = getOrderBookView(world, goodsId);
  if (orderBook.sellOrders.length === 0) {
    // 没有卖单，下一个高价买单等待
    const basePrice = goods.basePrice;
    const buyPrice = basePrice * 2.0; // 愿意支付200%基准价
    const buyQty = Math.min(neededAmount + 20, 300);
    
    const availableCash = world.companies.cash[companyId] * 0.3;
    if (buyQty * buyPrice <= availableCash) {
      createBuyOrder(world, companyId, goodsId, buyQty, buyPrice, BUILDING_MATERIAL_ORDER_EXPIRY);
    }
    return false;
  }
  
  // 有卖单，直接以卖单价格买入（吃单）
  for (const sellOrder of orderBook.sellOrders) {
    if (sellOrder.companyId === companyId) continue; // 不买自己的
    
    const buyQty = Math.min(neededAmount, sellOrder.remaining, 500);
    if (buyQty < 1) continue;
    
    const buyPrice = sellOrder.price; // 直接匹配卖单价格
    const cost = buyQty * buyPrice;
    
    // 检查资金
    if (cost > world.companies.cash[companyId] * 0.4) continue;
    
    // 下买单以吃掉卖单
    createBuyOrder(world, companyId, goodsId, buyQty, buyPrice, BUILDING_MATERIAL_ORDER_EXPIRY);
    
    if (world.tick % 50 === 0) {
      console.log(`[AI建材吃单] 公司${companyId}以¥${buyPrice.toFixed(2)}购买${goods.name}×${buyQty}`);
    }
    return true;
  }
  
  return false;
}

/**
 * 尝试执行建造（从意向队列调用）
 */
function tryExecuteBuild(world: GameWorld, intent: BuildingIntent): boolean {
  const { companyId, buildingTypeId, outputModeId, cost } = intent;
  
  // 检查资金
  const currentCash = world.companies.cash[companyId];
  if (currentCash < cost) {
    return false;
  }
  
  // 获取建筑定义
  const buildingDef = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
  if (!buildingDef) {
    return false;
  }
  
  // 检查建筑数量限制
  if (world.buildings.count >= world.buildings.maxCount) {
    return false;
  }
  
  // 获取建造所需材料
  const materials = getBaseMaterials(buildingTypeId);
  
  // 检查材料是否充足
  let canBuild = true;
  for (const mat of materials) {
    const idx = companyId * GOODS_COUNT + mat.goodsId;
    const available = world.companies.inventories[idx] - world.companies.inventoryReserved[idx];
    if (available < mat.amount) {
      canBuild = false;
      
      // 确保有采购单
      ensureMaterialPurchaseOrder(world, companyId, mat.goodsId, mat.amount - available);
      break;
    }
  }
  
  if (!canBuild) {
    return false;
  }
  
  // 材料充足，执行建造
  try {
    // 1. 扣除建造费用
    world.companies.cash[companyId] -= cost;
    
    // 2. 消耗建造材料
    for (const mat of materials) {
      const idx = companyId * GOODS_COUNT + mat.goodsId;
      world.companies.inventories[idx] -= mat.amount;
    }
    
    // 3. 创建建筑（使用outputModeId替代recipeId）
    const buildingId = addBuilding(world, companyId, buildingTypeId, outputModeId);
    
    // 4. 更新公司资产
    const priceGetter = (goodsId: number) => world.goods.prices[goodsId];
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
    console.error('[AI建造] 异常:', e);
    return false;
  }
}

/**
 * 确保有材料采购单
 */
function ensureMaterialPurchaseOrder(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  neededAmount: number
): void {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return;
  
  // 检查是否已有足够买单
  let existingBuyQty = 0;
  const activeIndices = getActiveOrderIndices();
  for (const j of activeIndices) {
    if (world.orders.companyIds[j] === companyId &&
        world.orders.goodsIds[j] === goodsId &&
        world.orders.types[j] === 0) {
      existingBuyQty += world.orders.remainings[j];
    }
  }
  
  // 如果已有足够买单，跳过
  if (existingBuyQty >= neededAmount) return;
  
  // 计算购买数量和价格
  const buyQty = Math.min(neededAmount - existingBuyQty + 50, 500); // 多买一点余量
  const basePrice = goods.basePrice;
  const marketPrice = world.goods.prices[goodsId];
  const buyPrice = Math.max(basePrice, marketPrice) * 1.5; // 愿意支付1.5倍价格
  
  // 检查资金
  const availableCash = world.companies.cash[companyId] * 0.5;
  if (buyQty * buyPrice <= availableCash) {
    createBuyOrder(world, companyId, goodsId, buyQty, buyPrice, BUILDING_MATERIAL_ORDER_EXPIRY);
  }
}

/**
 * 清除公司的建造意向（用于游戏重置）
 */
export function clearBuildingIntents(): void {
  buildingIntents.clear();
}

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
    
    // 使用新的生产系统：从建筑定义获取生产配置
    const buildingTypeId = world.buildings.types[i];
    const outputModeId = world.buildings.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (!production || !production.outputs || production.outputs.length === 0) continue;
    
    // 获取产出商品
    const outputGoodsId = production.outputs[0]?.goodsId;
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
      // 亏损时考虑减产或转换生产模式
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
    
    // 使用新的生产系统
    const buildingTypeId = world.buildings.types[i];
    const outputModeId = world.buildings.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (!production || !production.inputs) continue;
    
    for (const input of production.inputs) {
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
    
    // 使用新的生产系统
    const buildingTypeId = world.buildings.types[i];
    const outputModeId = world.buildings.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (!production || !production.inputs) continue;
    
    // 检查每种原材料
    for (const input of production.inputs) {
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
        
        // 【性能优化】使用活跃订单索引检查现有买单数量，避免O(n)遍历
        let existingBuyQuantity = 0;
        const activeIndices = getActiveOrderIndices();
        for (const j of activeIndices) {
          if (world.orders.companyIds[j] === companyId &&
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
      
      // 找能生产该商品的建筑（使用新的生产系统）
      for (const building of ALL_BUILDINGS) {
        // 检查建筑是否能生产该商品
        const production = building.production;
        if (!production) continue;
        
        // 检查默认产出或outputModes中是否包含该商品
        let canProduceOpportunity = production.outputs?.some(o => o.goodsId === opportunity);
        let targetOutputModeId = 0;
        
        if (!canProduceOpportunity && production.outputModes) {
          for (const mode of production.outputModes) {
            if (mode.outputs.some(o => o.goodsId === opportunity)) {
              canProduceOpportunity = true;
              targetOutputModeId = mode.modeId;
              break;
            }
          }
        }
        
        if (canProduceOpportunity && assessment.cash >= building.buildCost * 1.1) {
          // 【优化2】提高优先级，根据供需缺口调整（优先级范围提高）
          const basePriority = 7 + Math.min(gapRatio * 4, 3); // 7-10
          
          // 【新增】应用建筑类型偏好权重
          const buildingWeight = getBuildingTypeWeight(personality, building.id);
          const adjustedPriority = basePriority * buildingWeight;
          
          decisions.push({
            type: 'investment',
            companyId,
            action: 'build',
            params: {
              buildingTypeId: building.id,
              outputModeId: targetOutputModeId,
              cost: building.buildCost,
              targetGoodsId: opportunity,
              reason: 'market_opportunity',
            },
            priority: adjustedPriority,
            expectedProfit: building.buildCost * 0.2 * (1 + gapRatio),
            confidence: 0.65 + gapRatio * 0.2,
          });
          break;
        }
      }
    }
    
    // 【策略2】产业链补全驱动 - 缺少原材料供应时建造上游工厂
    const materialShortages = findMaterialShortages(world, companyId);
    for (const shortage of materialShortages.slice(0, 3)) {
      const { goodsId, shortageRatio } = shortage;
      
      // 找能生产该原材料的建筑（使用新的生产系统）
      for (const building of ALL_BUILDINGS) {
        const production = building.production;
        if (!production) continue;
        
        // 检查是否能生产该商品
        let canProduceGoods = production.outputs?.some(o => o.goodsId === goodsId);
        let targetOutputModeId = 0;
        
        if (!canProduceGoods && production.outputModes) {
          for (const mode of production.outputModes) {
            if (mode.outputs.some(o => o.goodsId === goodsId)) {
              canProduceGoods = true;
              targetOutputModeId = mode.modeId;
              break;
            }
          }
        }
        
        if (canProduceGoods && assessment.cash >= building.buildCost * 1.2) {
          // 【新增】应用建筑类型偏好权重
          const buildingWeight = getBuildingTypeWeight(personality, building.id);
          const basePriority = 8 + Math.min(shortageRatio, 2); // 8-10 (提高)
          
          decisions.push({
            type: 'investment',
            companyId,
            action: 'build',
            params: {
              buildingTypeId: building.id,
              outputModeId: targetOutputModeId,
              cost: building.buildCost,
              targetGoodsId: goodsId,
              reason: 'supply_chain',
            },
            priority: basePriority * buildingWeight,
            expectedProfit: building.buildCost * 0.25,
            confidence: 0.75,
          });
          break;
        }
      }
    }
    
    // 【策略3】规模扩张驱动 - 现有盈利建筑产能不足
    const profitableBuildings = findProfitableBuildings(world, companyId);
    for (const { buildingId, profitMargin } of profitableBuildings.slice(0, 3)) {
      const typeId = world.buildings.types[buildingId];
      const outputModeId = world.buildings.outputModeIds[buildingId];
      const building = ALL_BUILDINGS.find(b => b.id === typeId);
      
      if (building && assessment.cash >= building.buildCost * 1.1) {
        // 【新增】应用建筑类型偏好权重
        const buildingWeight = getBuildingTypeWeight(personality, typeId);
        const basePriority = 7 + Math.min(profitMargin * 10, 3); // 7-10 (提高)
        
        decisions.push({
          type: 'investment',
          companyId,
          action: 'build',
          params: {
            buildingTypeId: typeId,
            outputModeId: outputModeId,
            cost: building.buildCost,
            reason: 'scale_expansion',
          },
          priority: basePriority * buildingWeight,
          expectedProfit: building.buildCost * profitMargin * 1.2,
          confidence: 0.7,
        });
      }
    }
    
    // 【策略4】多元化驱动 - 分散投资到新领域
    if (personality.specializationDegree < 0.6 && assessment.buildingCount < 15) {
      const newOpportunities = findDiversificationOpportunities(world, companyId);
      for (const opp of newOpportunities.slice(0, 3)) {
        const building = ALL_BUILDINGS.find(b => b.id === opp.buildingTypeId);
        if (building && assessment.cash >= building.buildCost * 1.2) {
          // 【新增】应用建筑类型偏好权重
          const buildingWeight = getBuildingTypeWeight(personality, opp.buildingTypeId);
          const basePriority = 6 + opp.attractiveness; // 6-9 (提高)
          
          decisions.push({
            type: 'investment',
            companyId,
            action: 'build',
            params: {
              buildingTypeId: opp.buildingTypeId,
              outputModeId: opp.outputModeId,
              cost: building.buildCost,
              reason: 'diversification',
            },
            priority: basePriority * buildingWeight,
            expectedProfit: building.buildCost * 0.15,
            confidence: 0.55,
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
      b.category !== 'retail' &&
      b.category !== 'service'
    );
    
    for (const building of affordableBuildings.slice(0, 3)) {
      const production = building.production;
      if (production && production.outputs && production.outputs.length > 0) {
        const outputGoodsId = production.outputs[0].goodsId;
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
              outputModeId: 0,
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
  // 【P2更新】包含pioneer人格
  const personalityTypes: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive', 'opportunist', 'cost_leader', 'diversified',
    'specialist', 'innovator', 'conservative', 'premium', 'pioneer',
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
  
  // 统计公司所有建筑的原材料需求（使用新的生产系统）
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    if (!world.buildings.isActive[i]) continue;
    
    const buildingTypeId = world.buildings.types[i];
    const outputModeId = world.buildings.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (!production || !production.inputs) continue;
    
    for (const input of production.inputs) {
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
    
    // 使用新的生产系统
    const buildingTypeId = world.buildings.types[i];
    const outputModeId = world.buildings.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (!production) continue;
    
    // 计算利润率
    let inputCost = 0;
    let outputValue = 0;
    
    if (production.inputs) {
      for (const input of production.inputs) {
        inputCost += input.amount * world.goods.prices[input.goodsId];
      }
    }
    
    if (production.outputs) {
      for (const output of production.outputs) {
        outputValue += output.amount * world.goods.prices[output.goodsId];
      }
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
): Array<{ buildingTypeId: number; outputModeId: number; attractiveness: number }> {
  const opportunities: Array<{ buildingTypeId: number; outputModeId: number; attractiveness: number }> = [];
  
  // 获取公司现有的建筑类型
  const existingTypes = new Set<number>();
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      existingTypes.add(world.buildings.types[i]);
    }
  }
  
  // 寻找公司尚未涉足的建筑类型（使用新的生产系统）
  for (const building of ALL_BUILDINGS) {
    if (existingTypes.has(building.id)) continue;
    if (building.category === 'retail' || building.category === 'service') continue;
    
    const production = building.production;
    if (!production || !production.outputs || production.outputs.length === 0) continue;
    
    // 计算吸引力
    let attractiveness = 1;
    
    // 检查产出商品的市场情况
    for (const output of production.outputs) {
      const demand = world.goods.demands[output.goodsId];
      const supply = world.goods.supplies[output.goodsId];
      if (demand > supply) {
        attractiveness += Math.min((demand - supply) / demand * 2, 2);
      }
    }
    
    opportunities.push({
      buildingTypeId: building.id,
      outputModeId: 0,
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
    const { goodsId, shortageRatio, demand, supply, orderBookDemand } = shortage;
    
    // 找能生产该商品的建筑
    const buildingInfo = findBuildingForGoods(goodsId);
    if (!buildingInfo) continue;
    
    const { building, outputModeId: targetOutputModeId } = buildingInfo;
    
    // 检查是否负担得起（需要至少1.1倍建造成本）
    if (building.buildCost * 1.1 > maxInvestment) continue;
    if (assessment.cash - building.buildCost < minCashAfter) continue;
    
    // 【关键修复】订单簿短缺检测
    // 当订单簿显示有大量买单但无供应时，视为"高价值商机"
    const hasOrderBookShortage = (orderBookDemand || 0) > 100 && supply === 0;
    
    // 计算优先级（短缺比例越高，优先级越高）
    // 短缺比例2-5: 优先级8-10
    // 短缺比例5+: 优先级10
    // 订单簿短缺: 优先级+3 (这类商品有真实的市场需求在等待)
    const priorityBonus = Math.min((shortageRatio - 2) * 2, 4);
    const orderBookBonus = hasOrderBookShortage ? 3 : 0;
    const basePriority = 8 + priorityBonus + orderBookBonus; // 8-15
    
    // 检查公司是否已经有该类型建筑（避免过度集中）
    let existingCount = 0;
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === companyId &&
          world.buildings.types[i] === building.id) {
        existingCount++;
      }
    }
    
    // 如果已经有3个以上同类建筑，降低优先级
    // 但如果是订单簿短缺，放宽限制
    const diversityPenalty = hasOrderBookShortage 
      ? (existingCount >= 5 ? 2 : 0)  // 订单簿短缺时允许更多同类建筑
      : (existingCount >= 3 ? 3 : existingCount >= 2 ? 1 : 0);
    
    // 根据人格调整
    const personalityBonus = personality.expansionBias * 2; // 激进型最多+2
    
    const finalPriority = Math.max(6, basePriority + personalityBonus - diversityPenalty);
    
    // 记录日志（方便调试）
    if (hasOrderBookShortage && world.tick % 100 === 0) {
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      console.log(`[AI商机检测 T${world.tick}] 公司${companyId}发现${goods?.name || goodsId}订单簿短缺: 买单${orderBookDemand}单位, 无供应, 优先级${finalPriority}`);
    }
    
    decisions.push({
      type: 'investment',
      companyId,
      action: 'build',
      params: {
        buildingTypeId: building.id,
        outputModeId: targetOutputModeId,
        cost: building.buildCost,
        targetGoodsId: goodsId,
        reason: hasOrderBookShortage ? 'orderbook_shortage' : 'shortage_driven',
        shortageRatio,
        demand,
        supply,
        orderBookDemand: orderBookDemand || 0,
      },
      priority: finalPriority,
      expectedProfit: building.buildCost * 0.3 * shortageRatio * (hasOrderBookShortage ? 1.5 : 1),
      confidence: hasOrderBookShortage ? 0.9 : (0.7 + Math.min(shortageRatio / 20, 0.2)),
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
 * 
 * 【关键修复】增加订单簿需求检测
 * 当订单簿中有大量买单但无供应时，视为"隐性需求短缺"
 * 这对于水泥、钢材等建造材料尤为重要
 */
/**
 * 找出市场上严重短缺的商品
 * 返回需求/供给比 > 2 的商品列表
 *
 * 【v2.1 增强】增加中间品供应链缺口检测
 * - 检测订单簿中的派生需求
 * - 特别关注中间品(intermediate)类别
 * - 检测作为生产原材料但无供应的商品
 */
function findShortageGoods(world: GameWorld): Array<{
  goodsId: number;
  shortageRatio: number;
  demand: number;
  supply: number;
  orderBookDemand?: number; // 订单簿中的买单需求
  isIntermediate?: boolean; // 是否是中间品
  isSupplyChainGap?: boolean; // 是否是供应链缺口
}> {
  const shortages: Array<{
    goodsId: number;
    shortageRatio: number;
    demand: number;
    supply: number;
    orderBookDemand?: number;
    isIntermediate?: boolean;
    isSupplyChainGap?: boolean;
  }> = [];
  
  // 【新增】先计算哪些商品是生产原材料（供应链需求）
  const supplyChainDemand = calculateSupplyChainDemand(world);
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const demand = world.goods.demands[goodsId];
    const supply = world.goods.supplies[goodsId];
    const category = world.goods.categories[goodsId];
    const isIntermediate = category === 'intermediate';
    
    // 【关键修复】检测订单簿中的买单总量
    // 这可以捕获"派生需求"（如建造材料需求）
    const orderBookView = getOrderBookView(world, goodsId);
    const orderBookBuyDemand = orderBookView.totalBuyVolume;
    const orderBookSellSupply = orderBookView.totalSellVolume;
    
    // 【新增】获取供应链需求
    const chainDemand = supplyChainDemand.get(goodsId) || 0;
    
    // 综合需求 = 统计需求 + 订单簿买单需求 + 供应链需求
    const effectiveDemand = Math.max(demand, orderBookBuyDemand, chainDemand);
    
    // 【修改】降低中间品的最低需求阈值
    const minDemandThreshold = isIntermediate ? 5 : 10;
    if (effectiveDemand < minDemandThreshold) continue;
    
    // 【关键逻辑】订单簿信号检测
    // 如果有大量买单但没有卖单，这是强烈的供应短缺信号
    const hasOrderBookShortage = orderBookBuyDemand > 100 && orderBookSellSupply === 0;
    
    // 【新增】供应链缺口检测：有生产需求但无市场供应
    const isSupplyChainGap = chainDemand > 50 && supply < chainDemand * 0.3;
    
    // 计算短缺比例
    let shortageRatio: number;
    
    if (hasOrderBookShortage) {
      // 订单簿显示严重短缺：买单多但无卖单
      // 这类商品应该优先建造
      shortageRatio = Math.max(10, orderBookBuyDemand / 100);
    } else if (isSupplyChainGap) {
      // 供应链缺口：生产需求存在但市场无供应
      shortageRatio = Math.max(8, chainDemand / Math.max(supply, 1));
    } else if (supply > 0) {
      shortageRatio = effectiveDemand / supply;
    } else {
      shortageRatio = effectiveDemand > 100 ? 10 : 5;
    }
    
    // 【修改】中间品更容易被识别为短缺
    // 中间品阈值从2降到1.2（进一步降低）
    const shortageThreshold = isIntermediate ? 1.2 : 2;
    
    // 【P1修复】检测零供应商品：完全没有供应的商品需要最高优先级
    const isZeroSupply = supply === 0 && effectiveDemand > 0;
    
    // 关注短缺比例超过阈值的商品，或者订单簿/供应链显示短缺的商品，或者零供应商品
    if (shortageRatio > shortageThreshold || hasOrderBookShortage || isSupplyChainGap || isZeroSupply) {
      // 【P1修复】中间品额外加权从1.5提高到2.0
      const intermediateBonus = isIntermediate ? 2.0 : 1.0;
      const supplyChainBonus = isSupplyChainGap ? 1.3 : 1.0;
      // 【P1修复】零供应商品获得额外加成
      const zeroSupplyBonus = isZeroSupply ? 1.5 : 1.0;
      
      shortages.push({
        goodsId,
        shortageRatio: shortageRatio * intermediateBonus * supplyChainBonus * zeroSupplyBonus,
        demand: effectiveDemand,
        supply,
        orderBookDemand: orderBookBuyDemand,
        isIntermediate,
        isSupplyChainGap,
      });
    }
  }
  
  // 按短缺程度排序
  shortages.sort((a, b) => b.shortageRatio - a.shortageRatio);
  
  return shortages;
}

/**
 * 【新增】计算供应链需求
 * 遍历所有活跃建筑，统计它们对每种商品的原材料需求
 */
function calculateSupplyChainDemand(world: GameWorld): Map<number, number> {
  const demand = new Map<number, number>();
  
  for (let i = 0; i < world.buildings.count; i++) {
    if (!world.buildings.isActive[i]) continue;
    
    // 使用新的生产系统
    const buildingTypeId = world.buildings.types[i];
    const outputModeId = world.buildings.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (!production || !production.inputs) continue;
    
    const efficiency = world.buildings.efficiencies[i] || 1;
    
    // 累计原材料需求（每日需求 = 每tick需求 × 24）
    for (const input of production.inputs) {
      const current = demand.get(input.goodsId) || 0;
      demand.set(input.goodsId, current + input.amount * efficiency * 24);
    }
  }
  
  return demand;
}

/**
 * 找到能生产指定商品的建筑和生产配置
 */
function findBuildingForGoods(goodsId: number): {
  building: typeof ALL_BUILDINGS[0];
  outputModeId: number;
} | null {
  for (const building of ALL_BUILDINGS) {
    // 跳过零售和服务类建筑
    if (building.category === 'retail' || building.category === 'service') continue;
    
    const production = building.production;
    if (!production) continue;
    
    // 检查默认产出
    if (production.outputs?.some(o => o.goodsId === goodsId)) {
      return { building, outputModeId: 0 };
    }
    
    // 检查outputModes中的产出
    if (production.outputModes) {
      for (const mode of production.outputModes) {
        if (mode.outputs.some(o => o.goodsId === goodsId)) {
          return { building, outputModeId: mode.modeId };
        }
      }
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
 * 5. 【任务5优化】考虑市场价格与基准价的偏离程度
 * 6. 【任务5优化】根据供需比动态调整定价
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
  
  // 【任务5优化】计算供需比，用于调整定价策略
  const supply = world.goods.supplies[goodsId];
  const demand = world.goods.demands[goodsId];
  const supplyDemandRatio = demand > 0 ? supply / demand : 2;
  
  // 【任务5优化】计算市场价格与基准价的偏离程度
  const priceToBaseRatio = currentPrice / basePrice;
  
  // 更激进的基础折扣：优先确保成交
  // 【任务5优化】根据供需比调整折扣
  let baseDiscount: number;
  if (inventoryDays > 60) {
    baseDiscount = 0.70;  // 严重积压：30%折扣（从25%增加）
  } else if (inventoryDays > 30) {
    baseDiscount = 0.80;  // 中度积压：20%折扣（从15%增加）
  } else if (inventoryDays > 14) {
    baseDiscount = 0.88;  // 轻度积压：12%折扣
  } else if (inventoryDays > 7) {
    baseDiscount = 0.92;  // 正常偏多：8%折扣
  } else if (inventoryDays > 3) {
    baseDiscount = 0.96;  // 正常：4%折扣
  } else {
    // 库存紧张时可以提价
    baseDiscount = supplyDemandRatio < 0.7 ? 1.05 : 1.0;
  }
  
  // 【任务5优化】供过于求时增加折扣
  if (supplyDemandRatio > 1.5) {
    baseDiscount *= 0.95;  // 额外5%折扣
  } else if (supplyDemandRatio > 1.2) {
    baseDiscount *= 0.98;  // 额外2%折扣
  }
  
  // 【任务5优化】市场价格过高时，愿意以更低价格成交
  if (priceToBaseRatio > 1.5) {
    // 市场价高于基准价50%以上，可以接受基准价卖出
    baseDiscount = Math.min(baseDiscount, 1.0 / priceToBaseRatio * 1.1);
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
    
    // 【任务5优化】买价较低时，根据积压程度和供需比决定
    if (inventoryDays > 30 || supplyDemandRatio > 1.5) {
      // 积压严重或供过于求时，愿意接受更低价格
      return Math.max(bestBid * 0.98, basePrice * 0.5);
    } else if (inventoryDays > 14 || supplyDemandRatio > 1.2) {
      return Math.max(bestBid * 0.99, basePrice * 0.6);
    }
  }
  
  // 没有买单时，使用更激进的折扣价以吸引买家
  const targetPrice = currentPrice * baseDiscount;
  // 【任务5优化】降低价格下限到40%基准价（从50%降低）
  return Math.max(targetPrice, basePrice * 0.4);
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
    return applyAutomaticEfficiencySafely(world, buildingId, Math.max(0.3, currentEfficiency * 0.9));
  } else {
    return applyAutomaticEfficiencySafely(world, buildingId, Math.min(1.5, currentEfficiency * 1.05));
  }
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
    const outputModeId = (params.outputModeId as number) || 0;
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
    
    // 检查outputModeId是否有效（如果建筑有多个生产模式）
    if (outputModeId > 0 && hasMultipleOutputModes(buildingTypeId)) {
      const production = getBuildingProduction(buildingTypeId, outputModeId);
      if (!production) {
        return false;
      }
    }
    
    // 检查建筑数量限制
    if (world.buildings.count >= world.buildings.maxCount) {
      return false;
    }
    
    // 获取建造所需材料
    const materials = getBaseMaterials(buildingTypeId);
    
    // 检查材料是否充足
    const inventoryGetter = (goodsId: number) => {
      const idx = companyId * GOODS_COUNT + goodsId;
      return world.companies.inventories[idx] - world.companies.inventoryReserved[idx];
    };
    
    const priceGetter = (goodsId: number) => world.goods.prices[goodsId];
    
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
    
    // 如果材料不足，将建造意向加入队列并下买单
    if (!canBuild) {
      // 【关键修复】将建造意向加入队列，等待材料到位后执行
      addBuildingIntent({
        companyId,
        buildingTypeId,
        outputModeId,
        cost,
        createdTick: world.tick,
        attempts: 0,
        materialsOrdered: true,
      });
      
      // 为缺少的材料下买单
      let ordersCreated = 0;
      for (const missing of missingMaterials.slice(0, 5)) {
        const goods = ALL_GOODS.find(g => g.id === missing.goodsId);
        if (!goods) continue;
        
        // 检查是否已有足够买单
        let existingBuyQty = 0;
        const activeIndices = getActiveOrderIndices();
        for (const j of activeIndices) {
          if (world.orders.companyIds[j] === companyId &&
              world.orders.goodsIds[j] === missing.goodsId &&
              world.orders.types[j] === 0) {
            existingBuyQty += world.orders.remainings[j];
          }
        }
        
        // 如果已有足够买单，跳过
        if (existingBuyQty >= missing.amount) continue;
        
        // 计算购买数量和价格（愿意支付高价以获得建材）
        const buyQty = Math.min(missing.amount - existingBuyQty + 50, 500); // 多买一点余量
        const basePrice = goods.basePrice;
        const marketPrice = world.goods.prices[missing.goodsId];
        const buyPrice = Math.max(basePrice, marketPrice) * 1.5;
        
        // 检查资金（保留至少一半现金）
        const availableCash = world.companies.cash[companyId] * 0.5;
        if (buyQty * buyPrice <= availableCash) {
          const orderId = createBuyOrder(world, companyId, missing.goodsId, buyQty, buyPrice, BUILDING_MATERIAL_ORDER_EXPIRY);
          if (orderId !== null) {
            ordersCreated++;
          }
        }
      }
      
      if (ordersCreated > 0 && world.tick % 50 === 0) {
        console.log(`[AI建材采购] 公司${companyId}为建造${buildingDef.name}下了${ordersCreated}个建材采购单，已加入待建队列`);
      }
      
      // 返回true表示决策已被记录（虽然建造尚未完成，但意向已保存）
      return true;
    }
    
    // 材料充足，执行建造
    try {
      // 1. 扣除建造费用
      world.companies.cash[companyId] -= cost;
      
      // 2. 消耗建造材料
      for (const mat of materials) {
        const idx = companyId * GOODS_COUNT + mat.goodsId;
        world.companies.inventories[idx] -= mat.amount;
      }
      
      // 3. 直接创建建筑（使用outputModeId替代recipeId）
      const buildingId = addBuilding(world, companyId, buildingTypeId, outputModeId);
      
      // 4. 从待建队列中移除（如果存在）
      removeBuildingIntent(companyId, buildingTypeId, outputModeId);
      
      // 更新公司资产
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
    
    // 执行升级 - 添加原子性保护，再次检查防止并发降级
    const currentLevelNow = world.buildings.levels[buildingId];
    if (targetLevel <= currentLevelNow) {
      console.log(`[AI升级] 跳过：建筑#${buildingId}等级${currentLevelNow}已>=目标${targetLevel}`);
      return false;
    }
    
    world.companies.cash[companyId] -= cost;
    world.buildings.levels[buildingId] = targetLevel;
    
    // 升级效率加成（遵循生产控制：手动模式不被自动系统覆盖）
    const efficiencyMultiplier = buildingDef.efficiencyMultipliers[targetLevel - 1] || 1;
    applyAutomaticEfficiencySafely(world, buildingId, efficiencyMultiplier);
    
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
  // 【P2更新】包含pioneer人格用于动态分配
  const personalityTypes: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive',     // 激进型 - 大量交易
    'opportunist',    // 机会型 - 灵活交易
    'cost_leader',    // 成本领先 - 低价策略
    'diversified',    // 多元型 - 均衡交易
    'specialist',     // 专精型 - 专注特定商品
    'innovator',      // 创新型 - 高端商品
    'conservative',   // 保守型 - 稳健交易
    'premium',        // 高端型 - 高价策略
    'pioneer',        // 【P2新增】产业链开拓者 - 填补供应链缺口
  ];
  
  // 使用公司ID模9来选择人格类型，确保多样性
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
  
  // 【重要】确保每次都尝试执行至少一个投资决策（如果有的话）
  // 这样可以防止投资决策被交易决策完全挤掉
  const investmentDecisions = allDecisions.filter(d => d.type === 'investment');
  const otherDecisions = allDecisions.filter(d => d.type !== 'investment');
  
  // 先尝试执行1个投资决策
  if (investmentDecisions.length > 0) {
    const investDecision = investmentDecisions[0];
    if (executeDecision(world, investDecision)) {
      executedDecisions.push(investDecision);
      recordDecision(world, companyId, investDecision);
    }
  }
  
  // 再执行其他决策
  for (let i = 0; i < Math.min(maxDecisionsPerTick - 1, otherDecisions.length); i++) {
    const decision = otherDecisions[i];
    if (executeDecision(world, decision)) {
      executedDecisions.push(decision);
      
      // 22. 【Phase 2】记录决策到历史学习系统
      recordDecision(world, companyId, decision);
    }
  }
  
  // 22.5 【关键】处理待建意向队列 - 检查材料是否到位
  const builtFromQueue = processBuildingIntents(world, companyId);
  if (builtFromQueue > 0) {
    console.log(`[AI建造队列 T${world.tick}] 公司${companyId}从待建队列完成了${builtFromQueue}个建筑`);
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
  
  // 使用活跃订单索引，避免遍历全部 MAX_ORDERS
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (o.companyIds[i] !== companyId) continue;
    
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
          AI_BUY_ORDER_EXPIRY
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
 * 统计公司的订单数量（使用活跃订单索引优化）
 */
function countCompanyOrders(world: GameWorld, companyId: number): number {
  const o = world.orders;
  let count = 0;
  // 使用活跃订单索引，避免遍历全部 MAX_ORDERS
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (o.companyIds[i] === companyId) {
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
  // 【P2更新】包含pioneer人格
  const personalityTypes: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive', 'opportunist', 'cost_leader', 'diversified',
    'specialist', 'innovator', 'conservative', 'premium', 'pioneer',
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
    
    // 使用新的生产系统
    const buildingTypeId = b.types[i];
    const outputModeId = b.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (!production || !production.outputs) continue;
    
    // 检查该生产配置是否产出目标商品
    for (const output of production.outputs) {
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
 * 检查是否已有相似价格的挂单（使用O(1)索引查询）
 *
 * 【修复说明】
 * 1. 恢复重复订单检查，防止AI公司对同一商品重复挂单导致订单池溢出
 * 2. 使用OrderBook中的索引进行O(1)查询，避免性能问题
 * 3. 【任务2增强】同时检查买单和卖单
 */
function hasExistingOrder(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  minPrice: number,
  maxPrice: number
): boolean {
  // 使用索引进行O(1)查询，检查该公司是否已有该商品的买单或卖单
  const hasSellOrder = hasExistingOrderForCompanyGoods(companyId, goodsId, 1);  // 1 = sell
  const hasBuyOrder = hasExistingOrderForCompanyGoods(companyId, goodsId, 0);   // 0 = buy
  return hasSellOrder || hasBuyOrder;
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
      
      // 使用新的生产系统
      const buildingTypeId = b.types[i];
      const outputModeId = b.outputModeIds[i];
      const production = getBuildingProduction(buildingTypeId, outputModeId);
      if (!production || !production.inputs) continue;
      
      // 累计原材料需求
      for (const input of production.inputs) {
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
        // 【性能优化】使用活跃订单索引检查现有买单数量，避免O(n)遍历
        let existingBuyQuantity = 0;
        const activeIndices = getActiveOrderIndices();
        for (const j of activeIndices) {
          if (o.companyIds[j] === companyId &&
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
            // 建造材料订单使用较长过期时间
            const orderId = createBuyOrder(world, companyId, goodsId, actualBuyQty, maxBuyPrice, BUILDING_MATERIAL_ORDER_EXPIRY);
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
  
  // 使用新的生产系统获取建筑的生产配置
  const buildingTypeId = b.types[buildingId];
  const outputModeId = b.outputModeIds[buildingId];
  const production = getBuildingProduction(buildingTypeId, outputModeId);
  
  for (const def of subsidiaries) {
    let score = 50; // 基础分
    let expectedBenefit = 0;
    
    const effects = def.effects;
    
    // 1. 产出加成评分
    if (effects.outputMultiplier && effects.outputMultiplier > 1) {
      const bonus = (effects.outputMultiplier - 1) * 100;
      score += bonus * 2; // 每1%产出加成 +2分
      
      // 估算收益
      if (production && production.outputs) {
        for (const output of production.outputs) {
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
  // 【P2更新】包含pioneer人格
  const personalityTypes: Array<keyof typeof AI_PERSONALITIES> = [
    'aggressive', 'opportunist', 'cost_leader', 'diversified',
    'specialist', 'innovator', 'conservative', 'premium', 'pioneer',
  ];
  const typeIndex = (companyId - 1) % personalityTypes.length;
  return AI_PERSONALITIES[personalityTypes[typeIndex]];
}

// ==================== 战略建材监控系统 ====================

/**
 * 战略物资定义
 * 这些商品是其他产业链必需的，如果供应中断会导致经济停滞
 *
 * 包含三类：
 * 1. 建材类：建造建筑所需（钢材、水泥、玻璃、木材等）
 * 2. 中间品类：生产其他商品所需（橡胶、化学品、塑料等）
 * 3. 关键零部件：高端产品必需（电子元件、芯片、电池等）
 */
const STRATEGIC_BUILDING_MATERIALS = [
  // === 建筑材料 ===
  { goodsId: 14, name: '钢材', minSupply: 500, buildingTypeId: 8, outputModeId: 0 },      // 钢铁厂
  { goodsId: 21, name: '水泥', minSupply: 500, buildingTypeId: 14, outputModeId: 0 },     // 水泥厂
  { goodsId: 17, name: '玻璃', minSupply: 300, buildingTypeId: 11, outputModeId: 0 },     // 玻璃厂
  { goodsId: 36, name: '建筑材料', minSupply: 200, buildingTypeId: 14, outputModeId: 0 }, // 水泥厂
  { goodsId: 6, name: '木材', minSupply: 400, buildingTypeId: 5, outputModeId: 0 },       // 伐木场
  
  // === 关键中间材料（多产业链依赖）===
  { goodsId: 11, name: '天然橡胶', minSupply: 300, buildingTypeId: 32, outputModeId: 0 }, // 橡胶园
  { goodsId: 19, name: '橡胶制品', minSupply: 200, buildingTypeId: 10, outputModeId: 0 }, // 化工厂
  { goodsId: 20, name: '化学品', minSupply: 300, buildingTypeId: 10, outputModeId: 0 },   // 化工厂
  { goodsId: 18, name: '塑料', minSupply: 300, buildingTypeId: 10, outputModeId: 0 },     // 化工厂
  { goodsId: 15, name: '铜材', minSupply: 200, buildingTypeId: 8, outputModeId: 0 },      // 钢铁厂
  { goodsId: 16, name: '铝材', minSupply: 200, buildingTypeId: 15, outputModeId: 0 },     // 铝冶炼厂
  
  // === 关键零部件（高端产品必需）===
  { goodsId: 26, name: '电子元件', minSupply: 200, buildingTypeId: 16, outputModeId: 0 }, // 电子厂 - 手机、电脑、汽车、家电等必需
  { goodsId: 27, name: '芯片', minSupply: 100, buildingTypeId: 17, outputModeId: 0 },     // 芯片厂 - 高端电子产品必需
  { goodsId: 28, name: '电池', minSupply: 150, buildingTypeId: 20, outputModeId: 0 },     // 电池厂 - 电动车、手机、储能必需
  { goodsId: 29, name: '电机', minSupply: 100, buildingTypeId: 21, outputModeId: 0 },     // 机械厂 - 电动设备必需
  { goodsId: 30, name: '屏幕', minSupply: 100, buildingTypeId: 21, outputModeId: 0 },     // 机械厂 - 手机、电脑必需
  { goodsId: 31, name: '机械部件', minSupply: 150, buildingTypeId: 21, outputModeId: 0 }, // 机械厂 - 工业机器人等必需
  { goodsId: 32, name: '汽车零部件', minSupply: 100, buildingTypeId: 21, outputModeId: 0 }, // 机械厂 - 汽车生产必需
  
  // === 原材料（上游供应）===
  { goodsId: 0, name: '铁矿石', minSupply: 500, buildingTypeId: 0, outputModeId: 0 },     // 铁矿
  { goodsId: 1, name: '铜矿石', minSupply: 300, buildingTypeId: 1, outputModeId: 0 },     // 铜矿 - 铜材的上游
  { goodsId: 3, name: '煤炭', minSupply: 500, buildingTypeId: 2, outputModeId: 0 },       // 煤矿
  { goodsId: 9, name: '硅石', minSupply: 300, buildingTypeId: 7, outputModeId: 0 },       // 矿场
  { goodsId: 12, name: '化工原料', minSupply: 300, buildingTypeId: 9, outputModeId: 0 },  // 炼油厂（副产品）
  { goodsId: 13, name: '锂矿', minSupply: 200, buildingTypeId: 33, outputModeId: 0 },     // 锂矿 - 电池生产必需
];

/**
 * 检测战略建材短缺并生成紧急建造决策
 * 
 * 功能：
 * 1. 监控关键建材的供应情况
 * 2. 当某种建材供应不足且订单簿有大量买单时，生成高优先级建造决策
 * 3. 防止建材供应链断裂导致经济停滞
 * 
 * @param world 游戏世界
 * @param companyId AI公司ID
 * @param assessment 公司状态评估
 * @returns 紧急建造决策列表
 */
export function generateStrategicMaterialDecisions(
  world: GameWorld,
  companyId: number,
  assessment: CompanyAssessment
): AIDecision[] {
  const decisions: AIDecision[] = [];
  
  // 资金门槛：至少需要20万现金才考虑建造
  if (assessment.cash < 200000) {
    return decisions;
  }
  
  for (const material of STRATEGIC_BUILDING_MATERIALS) {
    const { goodsId, name, minSupply, buildingTypeId } = material;
    
    // 获取当前供应和订单簿情况
    const supply = world.goods.supplies[goodsId];
    const orderBook = getOrderBookView(world, goodsId);
    const buyDemand = orderBook.totalBuyVolume;
    const sellSupply = orderBook.totalSellVolume;
    
    // 检测是否存在紧急短缺：
    // 1. 市场供应低于最低水平
    // 2. 订单簿有大量买单但无卖单
    const isEmergency = supply < minSupply && buyDemand > 100 && sellSupply === 0;
    
    if (!isEmergency) continue;
    
    // 检查该公司是否已经有该类型建筑在建或运营
    let hasExisting = false;
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === companyId &&
          world.buildings.types[i] === buildingTypeId) {
        hasExisting = true;
        break;
      }
    }
    
    // 获取建筑信息
    const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
    if (!building) continue;
    
    // 检查是否负担得起
    if (building.buildCost > assessment.cash * 0.5) continue;
    
    // 获取outputModeId（从战略材料配置中获取，默认为0）
    const targetOutputModeId = material.outputModeId || 0;
    
    // 验证生产配置是否有效
    const production = getBuildingProduction(buildingTypeId, targetOutputModeId);
    if (!production) continue;
    
    // 验证该生产配置是否产出目标商品
    const canProduceTarget = production.outputs?.some(o => o.goodsId === goodsId);
    if (!canProduceTarget) continue;
    
    // 生成紧急建造决策
    // 优先级极高：15+（比普通投资决策的8-12更高）
    const urgencyLevel = hasExisting ? 12 : 15; // 如果已有同类建筑，稍微降低优先级
    
    // 记录日志
    if (world.tick % 50 === 0) {
      console.log(`[战略建材紧急 T${world.tick}] 公司${companyId}检测到${name}紧急短缺: 供应${supply}, 买单${buyDemand}, 卖单${sellSupply}`);
    }
    
    decisions.push({
      type: 'investment',
      companyId,
      action: 'build',
      params: {
        buildingTypeId,
        outputModeId: targetOutputModeId,
        cost: building.buildCost,
        targetGoodsId: goodsId,
        reason: 'strategic_material_emergency',
        buyDemand,
        sellSupply,
        currentSupply: supply,
      },
      priority: urgencyLevel,
      expectedProfit: building.buildCost * 0.5, // 预期利润较高因为市场急需
      confidence: 0.95, // 高置信度
    });
  }
  
  return decisions;
}

/**
 * 全局战略建材检查
 * 在GameLoop中定期调用，确保关键建材供应链不断裂
 *
 * 【P2修复】增强版：
 * 1. 检查频率从100tick提高到50tick
 * 2. 降低触发阈值：供应=0时立即触发
 * 3. 优先分配给pioneer人格公司
 *
 * @param world 游戏世界
 * @returns 触发的紧急决策数量
 */
export function runStrategicMaterialCheck(world: GameWorld): number {
  // 【P2修复】检查频率从100tick提高到50tick（约2游戏小时）
  if (world.tick % 50 !== 0) {
    return 0;
  }
  
  let triggeredDecisions = 0;
  const c = world.companies;
  
  // 【P2修复】优先检查pioneer人格公司，他们更愿意投资
  const pioneerCompanies: number[] = [];
  const otherCompanies: number[] = [];
  
  for (let companyId = 1; companyId < c.count; companyId++) {
    if (!c.isAI[companyId]) continue;
    if (c.cash[companyId] < 150000) continue; // 【P2修复】降低资金门槛到15万
    
    const config = AI_COMPANIES.find(cfg => cfg.id === companyId);
    if (config?.personality === 'pioneer') {
      pioneerCompanies.push(companyId);
    } else {
      otherCompanies.push(companyId);
    }
  }
  
  // 合并：pioneer公司优先
  const sortedCompanies = [...pioneerCompanies, ...otherCompanies];
  
  // 检查每个AI公司
  for (const companyId of sortedCompanies) {
    // 简单评估
    const cash = c.cash[companyId];
    const simpleAssessment: CompanyAssessment = {
      cash,
      cashRatio: 0.3,
      inventoryValue: 0,
      buildingCount: 0,
      profitMargin: 0.1,
      marketShare: 0.05,
      productionCapacity: 100,
      bottlenecks: [],
      opportunities: [],
    };
    
    const decisions = generateStrategicMaterialDecisions(world, companyId, simpleAssessment);
    
    // 执行最高优先级的决策
    if (decisions.length > 0) {
      decisions.sort((a, b) => b.priority - a.priority);
      const topDecision = decisions[0];
      
      if (executeDecision(world, topDecision)) {
        triggeredDecisions++;
        const goods = ALL_GOODS.find(g => g.id === topDecision.params.targetGoodsId);
        console.log(`[战略建材 T${world.tick}] 公司${c.names[companyId]}紧急建造 ${goods?.name || topDecision.params.targetGoodsId}生产设施`);
      }
    }
  }
  
  return triggeredDecisions;
}

// ==================== 零供应商品强制建造机制 ====================

/**
 * 【P2修复】零供应商品检测
 *
 * 功能：找出所有完全没有供应的商品（零交易量）
 * 这些商品是产业链断裂的根源
 */
interface ZeroSupplyGoods {
  goodsId: number;
  name: string;
  category: string;
  basePrice: number;
  hasProduction: boolean;      // 是否有生产配置
  buildingTypeId: number;      // 可生产该商品的建筑类型
  outputModeId: number;        // 生产模式ID
  buildingCost: number;        // 建筑成本
  dependencyCount: number;     // 有多少其他商品依赖此商品
  urgencyScore: number;        // 紧急程度
}

/**
 * 检测所有零供应商品
 */
function detectZeroSupplyGoods(world: GameWorld): ZeroSupplyGoods[] {
  const zeroSupplyGoods: ZeroSupplyGoods[] = [];
  
  // 计算依赖关系：哪些商品作为原材料被其他建筑使用
  const dependencyCount = new Map<number, number>();
  for (const building of ALL_BUILDINGS) {
    const production = building.production;
    if (!production) continue;
    
    // 检查默认inputs
    if (production.inputs) {
      for (const input of production.inputs) {
        const count = dependencyCount.get(input.goodsId) || 0;
        dependencyCount.set(input.goodsId, count + 1);
      }
    }
    
    // 检查outputModes中的inputs
    if (production.outputModes) {
      for (const mode of production.outputModes) {
        if (mode.inputs) {
          for (const input of mode.inputs) {
            const count = dependencyCount.get(input.goodsId) || 0;
            dependencyCount.set(input.goodsId, count + 1);
          }
        }
      }
    }
  }
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const supply = world.goods.supplies[goodsId];
    
    // 只关注零供应商品
    if (supply > 0) continue;
    
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    // 跳过零售类商品（由零售系统处理）
    const category = world.goods.categories[goodsId];
    
    // 找能生产该商品的建筑和生产配置
    let hasProduction = false;
    let buildingTypeId = -1;
    let outputModeId = 0;
    let buildingCost = 0;
    
    const buildingInfo = findBuildingForGoods(goodsId);
    if (buildingInfo) {
      hasProduction = true;
      buildingTypeId = buildingInfo.building.id;
      outputModeId = buildingInfo.outputModeId;
      buildingCost = buildingInfo.building.buildCost;
    }
    
    // 如果没有生产配置，跳过（原材料由采掘类建筑生产）
    if (!hasProduction) continue;
    
    // 计算紧急程度：依赖此商品的建筑越多，越紧急
    const deps = dependencyCount.get(goodsId) || 0;
    let urgencyScore = deps * 10;
    
    // 中间品更紧急
    if (category === 'intermediate') {
      urgencyScore += 30;
    } else if (category === 'basic') {
      urgencyScore += 20;
    }
    
    // 高基准价商品可能是高价值产业链
    if (goods.basePrice > 500) {
      urgencyScore += 10;
    }
    
    zeroSupplyGoods.push({
      goodsId,
      name: goods.name,
      category,
      basePrice: goods.basePrice,
      hasProduction,
      buildingTypeId,
      outputModeId,
      buildingCost,
      dependencyCount: deps,
      urgencyScore,
    });
  }
  
  // 按紧急程度排序
  zeroSupplyGoods.sort((a, b) => b.urgencyScore - a.urgencyScore);
  
  return zeroSupplyGoods;
}

/**
 * 【P2修复】零供应商品强制建造
 *
 * 功能：强制分配AI公司建造零供应商品的生产设施
 * 优先分配给pioneer人格公司
 */
export function forceBuildzeroSupplyGoods(world: GameWorld): number {
  // 每100tick运行一次
  if (world.tick % 100 !== 0) {
    return 0;
  }
  
  const zeroSupplyGoods = detectZeroSupplyGoods(world);
  
  if (zeroSupplyGoods.length === 0) {
    return 0;
  }
  
  // 日志记录
  if (zeroSupplyGoods.length > 0 && world.tick % 200 === 0) {
    console.log(`[零供应检测 T${world.tick}] 发现${zeroSupplyGoods.length}个零供应商品:`,
      zeroSupplyGoods.slice(0, 8).map(g => `${g.name}(依赖${g.dependencyCount})`).join(', ')
    );
  }
  
  const c = world.companies;
  let triggeredBuilds = 0;
  
  // 收集候选公司，优先pioneer人格
  const pioneerCompanies: number[] = [];
  const wealthyCompanies: number[] = [];
  
  for (let companyId = 1; companyId < c.count; companyId++) {
    if (!c.isAI[companyId]) continue;
    
    const config = AI_COMPANIES.find(cfg => cfg.id === companyId);
    if (config?.personality === 'pioneer') {
      if (c.cash[companyId] > 100000) {
        pioneerCompanies.push(companyId);
      }
    } else if (c.cash[companyId] > 500000) {
      wealthyCompanies.push(companyId);
    }
  }
  
  // 为每个零供应商品分配建造任务
  for (const zeroGoods of zeroSupplyGoods.slice(0, 5)) { // 每次最多处理5个
    const { goodsId, buildingTypeId, outputModeId, buildingCost } = zeroGoods;
    
    if (buildingTypeId < 0 || outputModeId < 0) continue;
    
    // 优先选择pioneer公司
    let selectedCompanyId = -1;
    
    for (const companyId of pioneerCompanies) {
      if (c.cash[companyId] >= buildingCost * 1.2) {
        selectedCompanyId = companyId;
        break;
      }
    }
    
    // 如果没有pioneer公司能负担，选择富裕公司
    if (selectedCompanyId < 0) {
      for (const companyId of wealthyCompanies) {
        if (c.cash[companyId] >= buildingCost * 1.5) {
          selectedCompanyId = companyId;
          break;
        }
      }
    }
    
    if (selectedCompanyId < 0) continue;
    
    const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
    if (!building) continue;
    
    // 生成强制建造决策
    const decision: AIDecision = {
      type: 'investment',
      companyId: selectedCompanyId,
      action: 'build',
      params: {
        buildingTypeId,
        outputModeId,
        cost: buildingCost,
        targetGoodsId: goodsId,
        reason: 'zero_supply_forced',
        dependencyCount: zeroGoods.dependencyCount,
      },
      priority: 20, // 极高优先级
      expectedProfit: buildingCost * 0.5,
      confidence: 0.95,
    };
    
    if (executeDecision(world, decision)) {
      triggeredBuilds++;
      console.log(`[零供应强制建造 T${world.tick}] 公司${c.names[selectedCompanyId]}建造${building.name}生产${zeroGoods.name}`);
      
      // 从候选列表中移除该公司（避免一家公司建太多）
      const pioneerIdx = pioneerCompanies.indexOf(selectedCompanyId);
      if (pioneerIdx >= 0) pioneerCompanies.splice(pioneerIdx, 1);
      const wealthyIdx = wealthyCompanies.indexOf(selectedCompanyId);
      if (wealthyIdx >= 0) wealthyCompanies.splice(wealthyIdx, 1);
    }
  }
  
  return triggeredBuilds;
}

/**
 * 获取零供应商品报告（用于UI显示）
 */
export function getZeroSupplyGoodsReport(world: GameWorld): ZeroSupplyGoods[] {
  return detectZeroSupplyGoods(world);
}

// ==================== 冷门商品检测系统 ====================

/**
 * 冷门商品检测与自动补充
 *
 * 功能：检测市场上有需求但无供应的商品，触发AI建造决策
 * 与战略建材检查的区别：
 * 1. 战略建材检查：只检查预定义的关键建材
 * 2. 冷门商品检测：检查所有商品，发现"冷门"后触发建造
 *
 * "冷门商品"定义：
 * - 订单簿有买单需求 > 50 单位
 * - 市场供应为0或极低
 * - 没有任何公司生产该商品（或产能不足）
 */

interface ColdGoodsInfo {
  goodsId: number;
  name: string;
  orderBookDemand: number;  // 订单簿买单总量
  marketSupply: number;     // 市场供应量
  producerCount: number;    // 生产该商品的建筑数量
  urgencyScore: number;     // 紧急程度评分
}

/**
 * 检测所有冷门商品
 */
function detectColdGoods(world: GameWorld): ColdGoodsInfo[] {
  const coldGoods: ColdGoodsInfo[] = [];
  
  // 统计每种商品的生产建筑数量（使用新的生产系统）
  const producerCounts = new Map<number, number>();
  for (let i = 0; i < world.buildings.count; i++) {
    if (!world.buildings.isActive[i]) continue;
    
    const buildingTypeId = world.buildings.types[i];
    const outputModeId = world.buildings.outputModeIds[i];
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    if (!production || !production.outputs) continue;
    
    for (const output of production.outputs) {
      const count = producerCounts.get(output.goodsId) || 0;
      producerCounts.set(output.goodsId, count + 1);
    }
  }
  
  // 遍历所有商品检测冷门
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    // 获取订单簿信息
    const orderBook = getOrderBookView(world, goodsId);
    const buyDemand = orderBook.totalBuyVolume;
    const sellSupply = orderBook.totalSellVolume;
    
    // 获取市场供应
    const marketSupply = world.goods.supplies[goodsId];
    
    // 获取生产者数量
    const producerCount = producerCounts.get(goodsId) || 0;
    
    // 冷门判定条件：
    // 1. 有一定的买单需求（>50单位）
    // 2. 无卖单供应 且 市场供应极低
    // 3. 生产该商品的建筑很少（<=1）
    const isCold = buyDemand > 50 &&
                   sellSupply === 0 &&
                   marketSupply < 100 &&
                   producerCount <= 1;
    
    if (isCold) {
      // 计算紧急程度：买单需求越大、生产者越少，越紧急
      const urgencyScore = Math.min(100, buyDemand / 10) +
                           (producerCount === 0 ? 50 : 0) +
                           (marketSupply === 0 ? 30 : 0);
      
      coldGoods.push({
        goodsId,
        name: goods.name,
        orderBookDemand: buyDemand,
        marketSupply,
        producerCount,
        urgencyScore,
      });
    }
  }
  
  // 按紧急程度排序
  coldGoods.sort((a, b) => b.urgencyScore - a.urgencyScore);
  
  return coldGoods;
}

/**
 * 为冷门商品分配AI建造任务
 *
 * @param world 游戏世界
 * @returns 触发的建造决策数量
 */
export function buildForColdGoods(world: GameWorld): number {
  // 每200tick运行一次（约8游戏小时）
  if (world.tick % 200 !== 0) {
    return 0;
  }
  
  // 检测冷门商品
  const coldGoods = detectColdGoods(world);
  
  if (coldGoods.length === 0) {
    return 0;
  }
  
  // 日志记录发现的冷门商品
  if (coldGoods.length > 0) {
    console.log(`[冷门商品检测 T${world.tick}] 发现${coldGoods.length}个冷门商品:`,
      coldGoods.slice(0, 5).map(g => `${g.name}(需求${g.orderBookDemand},生产者${g.producerCount})`).join(', ')
    );
  }
  
  let triggeredDecisions = 0;
  const c = world.companies;
  
  // 为每个冷门商品找一个合适的AI公司来建造
  for (const cold of coldGoods.slice(0, 3)) { // 每次最多处理3个冷门商品
    // 找能生产该商品的建筑
    const buildingInfo = findBuildingForGoods(cold.goodsId);
    if (!buildingInfo) {
      continue; // 没有可建造的建筑
    }
    
    const { building, outputModeId } = buildingInfo;
    
    // 获取生产配置用于检查原材料
    const production = getBuildingProduction(building.id, outputModeId);
    if (!production) continue;
    
    // 找一个有资金的AI公司来建造
    // 优先选择：
    // 1. 现金充裕（>建造成本×1.5）
    // 2. 已经有相关产业链（降低原材料采购难度）
    // 3. 建筑数量不太多（避免过度集中）
    
    let bestCompanyId = -1;
    let bestScore = 0;
    
    for (let companyId = 1; companyId < c.count; companyId++) {
      if (!c.isAI[companyId]) continue;
      
      const cash = c.cash[companyId];
      if (cash < building.buildCost * 1.5) continue; // 资金不足
      
      // 计算适合程度
      let score = 0;
      
      // 现金越多越好
      score += Math.min(50, cash / 1000000 * 10);
      
      // 检查是否有相关原材料生产能力
      let hasRelatedIndustry = false;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] !== companyId) continue;
        
        const existingBuildingTypeId = world.buildings.types[i];
        const existingOutputModeId = world.buildings.outputModeIds[i];
        const existingProduction = getBuildingProduction(existingBuildingTypeId, existingOutputModeId);
        if (!existingProduction || !existingProduction.outputs) continue;
        
        // 检查是否生产目标商品的原材料
        if (production.inputs) {
          for (const input of production.inputs) {
            if (existingProduction.outputs.some(o => o.goodsId === input.goodsId)) {
              hasRelatedIndustry = true;
              score += 20;
              break;
            }
          }
        }
        if (hasRelatedIndustry) break;
      }
      
      // 建筑数量适中更好（3-8个最佳）
      const buildingCount = c.buildingCounts[companyId];
      if (buildingCount >= 3 && buildingCount <= 8) {
        score += 15;
      } else if (buildingCount < 3) {
        score += 5; // 太少可能是新公司
      }
      
      // 随机因素避免总是同一家公司
      score += Math.random() * 10;
      
      if (score > bestScore) {
        bestScore = score;
        bestCompanyId = companyId;
      }
    }
    
    if (bestCompanyId >= 0) {
      // 生成建造决策
      const decision: AIDecision = {
        type: 'investment',
        companyId: bestCompanyId,
        action: 'build',
        params: {
          buildingTypeId: building.id,
          outputModeId: outputModeId,
          cost: building.buildCost,
          targetGoodsId: cold.goodsId,
          reason: 'cold_goods_supply',
          orderBookDemand: cold.orderBookDemand,
          producerCount: cold.producerCount,
        },
        priority: 14 + cold.urgencyScore / 20, // 14-19 高优先级
        expectedProfit: building.buildCost * 0.4, // 预期利润较高因为市场急需
        confidence: 0.85,
      };
      
      // 执行决策
      if (executeDecision(world, decision)) {
        triggeredDecisions++;
        console.log(`[冷门商品建造 T${world.tick}] 公司${c.names[bestCompanyId]}将建造${building.name}生产${cold.name}`);
      }
    }
  }
  
  return triggeredDecisions;
}

/**
 * 获取冷门商品报告（用于UI显示）
 */
export function getColdGoodsReport(world: GameWorld): ColdGoodsInfo[] {
  return detectColdGoods(world);
}
