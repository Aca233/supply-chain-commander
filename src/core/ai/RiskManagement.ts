/**
 * AI风险管理系统
 * 
 * 评估和控制各类业务风险
 * 
 * 设计目标：
 * 1. 识别和量化风险
 * 2. 设置风险限额
 * 3. 动态调整风险敞口
 * 4. 预警和应急响应
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import { AIPersonality } from './AIPersonality';
import { 
  getCompanyProfitMargin, 
  getCompanyMarketShare,
  analyzeCompanyProfit,
  analyzePriceTrend
} from './PrecisionCalculator';
import { predictPrice, calculateTechnicalIndicators } from './PricePredictor';
import { ALL_GOODS } from '@/data/goods';

// ==================== 类型定义 ====================

/**
 * 风险类型
 */
export type RiskType = 
  | 'market'          // 市场风险（价格波动）
  | 'liquidity'       // 流动性风险（现金不足）
  | 'concentration'   // 集中度风险（过度依赖单一商品）
  | 'inventory'       // 库存风险（积压或短缺）
  | 'credit'          // 信用风险（对手方）
  | 'operational';    // 运营风险（生产中断）

/**
 * 风险评估结果
 */
export interface RiskAssessment {
  type: RiskType;
  level: 'critical' | 'high' | 'medium' | 'low';
  score: number;                    // 0-100
  description: string;
  affectedGoods?: number[];
  potentialLoss: number;
  probability: number;              // 0-1
  mitigationActions: string[];
}

/**
 * 风险限额配置
 */
export interface RiskLimits {
  // 现金相关
  minCashRatio: number;             // 最低现金比例
  maxCashBurn: number;              // 最大现金消耗/天
  
  // 库存相关
  maxInventoryDays: number;         // 最大库存天数
  minInventoryDays: number;         // 最小库存天数
  maxSingleGoodsRatio: number;      // 单一商品最大占比
  
  // 交易相关
  maxOrderValue: number;            // 单笔订单最大金额
  maxDailyTradeVolume: number;      // 日交易量上限
  maxPriceDeviation: number;        // 最大价格偏离
  
  // 市场相关
  maxMarketExposure: number;        // 最大市场敞口
  maxLossPerTrade: number;          // 单笔最大损失
  
  // 扩张相关
  maxBuildingsPerPeriod: number;    // 周期内最大建筑数
  maxExpansionBudget: number;       // 最大扩张预算
}

/**
 * 风险敞口
 */
export interface RiskExposure {
  goodsId: number;
  exposureType: 'long' | 'short';   // 多头/空头
  value: number;                    // 敞口价值
  percentOfAssets: number;          // 占资产比例
  volatility: number;               // 价格波动率
  var95: number;                    // 95% VaR
}

/**
 * 风险预警
 */
export interface RiskAlert {
  id: string;
  timestamp: number;
  type: RiskType;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestedAction: string;
  acknowledged: boolean;
}

/**
 * 风险管理存储
 */
export interface RiskManagementStore {
  companyId: number;
  
  // 风险限额
  limits: RiskLimits;
  
  // 当前风险评估
  assessments: RiskAssessment[];
  
  // 风险敞口
  exposures: Map<number, RiskExposure>;
  
  // 活跃预警
  alerts: RiskAlert[];
  
  // 风险指标历史
  riskHistory: {
    tick: number;
    overallRisk: number;
    marketRisk: number;
    liquidityRisk: number;
  }[];
  
  // 上次评估时间
  lastAssessmentTick: number;
}

// ==================== 存储管理 ====================

const riskStores = new Map<number, RiskManagementStore>();
let alertIdCounter = 0;

/**
 * 获取风险管理存储
 */
export function getRiskStore(companyId: number): RiskManagementStore | null {
  return riskStores.get(companyId) || null;
}

/**
 * 初始化风险管理存储
 */
export function initializeRiskStore(
  companyId: number,
  personality: AIPersonality
): RiskManagementStore {
  const limits = calculateRiskLimits(personality);
  
  const store: RiskManagementStore = {
    companyId,
    limits,
    assessments: [],
    exposures: new Map(),
    alerts: [],
    riskHistory: [],
    lastAssessmentTick: 0,
  };
  
  riskStores.set(companyId, store);
  return store;
}

/**
 * 根据人格计算风险限额
 */
function calculateRiskLimits(personality: AIPersonality): RiskLimits {
  const riskMultiplier = personality.riskTolerance;
  
  return {
    minCashRatio: 0.15 + (1 - riskMultiplier) * 0.25,
    maxCashBurn: 100000 * (1 + riskMultiplier),
    maxInventoryDays: 20 + (1 - riskMultiplier) * 20,
    minInventoryDays: 3 + (1 - riskMultiplier) * 5,
    maxSingleGoodsRatio: 0.3 + riskMultiplier * 0.2,
    maxOrderValue: 500000 * (1 + riskMultiplier),
    maxDailyTradeVolume: 2000000 * (1 + riskMultiplier),
    maxPriceDeviation: 0.15 + riskMultiplier * 0.1,
    maxMarketExposure: 0.5 + riskMultiplier * 0.3,
    maxLossPerTrade: 50000 * (1 + riskMultiplier),
    maxBuildingsPerPeriod: Math.round(2 + riskMultiplier * 3),
    maxExpansionBudget: 1000000 * (1 + riskMultiplier),
  };
}

// ==================== 风险评估 ====================

/**
 * 执行全面风险评估
 */
export function performRiskAssessment(
  world: GameWorld,
  companyId: number
): RiskAssessment[] {
  let store = riskStores.get(companyId);
  if (!store) {
    store = initializeRiskStore(companyId, {
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
  
  const assessments: RiskAssessment[] = [];
  
  // 1. 流动性风险
  assessments.push(assessLiquidityRisk(world, companyId, store.limits));
  
  // 2. 市场风险
  assessments.push(assessMarketRisk(world, companyId, store.limits));
  
  // 3. 集中度风险
  assessments.push(assessConcentrationRisk(world, companyId, store.limits));
  
  // 4. 库存风险
  assessments.push(assessInventoryRisk(world, companyId, store.limits));
  
  // 5. 运营风险
  assessments.push(assessOperationalRisk(world, companyId, store.limits));
  
  // 更新存储
  store.assessments = assessments;
  store.lastAssessmentTick = world.tick;
  
  // 更新风险历史
  const overallRisk = assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length;
  const marketRisk = assessments.find(a => a.type === 'market')?.score || 0;
  const liquidityRisk = assessments.find(a => a.type === 'liquidity')?.score || 0;
  
  store.riskHistory.push({
    tick: world.tick,
    overallRisk,
    marketRisk,
    liquidityRisk,
  });
  
  // 限制历史长度
  if (store.riskHistory.length > 365) {
    store.riskHistory = store.riskHistory.slice(-365);
  }
  
  // 生成预警
  generateRiskAlerts(store, assessments, world.tick);
  
  return assessments;
}

/**
 * 评估流动性风险
 */
function assessLiquidityRisk(
  world: GameWorld,
  companyId: number,
  limits: RiskLimits
): RiskAssessment {
  const cash = world.companies.cash[companyId];
  
  // 计算总资产
  let inventoryValue = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    const qty = world.companies.inventories[companyId * GOODS_COUNT + i];
    inventoryValue += qty * world.goods.prices[i];
  }
  const totalAssets = cash + inventoryValue;
  const cashRatio = totalAssets > 0 ? cash / totalAssets : 0;
  
  // 计算分数
  let score: number;
  if (cashRatio < limits.minCashRatio * 0.5) {
    score = 90;
  } else if (cashRatio < limits.minCashRatio) {
    score = 60 + (limits.minCashRatio - cashRatio) / limits.minCashRatio * 30;
  } else if (cashRatio < limits.minCashRatio * 1.5) {
    score = 30 + (limits.minCashRatio * 1.5 - cashRatio) / (limits.minCashRatio * 0.5) * 30;
  } else {
    score = 10;
  }
  
  // 确定等级
  let level: RiskAssessment['level'];
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';
  else level = 'low';
  
  const mitigationActions: string[] = [];
  if (score >= 60) {
    mitigationActions.push('减少新投资');
    mitigationActions.push('加速库存出清');
  }
  if (score >= 80) {
    mitigationActions.push('暂停所有扩张');
    mitigationActions.push('考虑紧急融资');
  }
  
  return {
    type: 'liquidity',
    level,
    score,
    description: `现金比例${(cashRatio * 100).toFixed(1)}%，${level === 'critical' ? '严重不足' : level === 'high' ? '偏低' : '正常'}`,
    potentialLoss: Math.max(0, (limits.minCashRatio - cashRatio) * totalAssets),
    probability: score / 100,
    mitigationActions,
  };
}

/**
 * 评估市场风险
 */
function assessMarketRisk(
  world: GameWorld,
  companyId: number,
  limits: RiskLimits
): RiskAssessment {
  // 计算加权平均波动率
  let totalExposure = 0;
  let weightedVolatility = 0;
  const affectedGoods: number[] = [];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    if (inventory <= 0) continue;
    
    const value = inventory * world.goods.prices[goodsId];
    const indicators = calculateTechnicalIndicators(world, goodsId);
    const volatility = indicators.atr / world.goods.prices[goodsId];
    
    totalExposure += value;
    weightedVolatility += value * volatility;
    
    if (volatility > 0.1) {
      affectedGoods.push(goodsId);
    }
  }
  
  const avgVolatility = totalExposure > 0 ? weightedVolatility / totalExposure : 0;
  
  // 计算VaR
  const var95 = totalExposure * avgVolatility * 1.65; // 95% VaR
  
  // 计算分数
  let score: number;
  if (avgVolatility > 0.15) {
    score = 80;
  } else if (avgVolatility > 0.1) {
    score = 50 + avgVolatility * 200;
  } else if (avgVolatility > 0.05) {
    score = 20 + avgVolatility * 300;
  } else {
    score = avgVolatility * 400;
  }
  
  score = Math.min(100, Math.max(0, score));
  
  let level: RiskAssessment['level'];
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';
  else level = 'low';
  
  const mitigationActions: string[] = [];
  if (score >= 50) {
    mitigationActions.push('减少高波动商品持仓');
    mitigationActions.push('增加对冲操作');
  }
  if (score >= 70) {
    mitigationActions.push('设置止损订单');
    mitigationActions.push('分散投资组合');
  }
  
  return {
    type: 'market',
    level,
    score,
    description: `市场波动率${(avgVolatility * 100).toFixed(1)}%，VaR95=¥${var95.toFixed(0)}`,
    affectedGoods,
    potentialLoss: var95,
    probability: 0.05,
    mitigationActions,
  };
}

/**
 * 评估集中度风险
 */
function assessConcentrationRisk(
  world: GameWorld,
  companyId: number,
  limits: RiskLimits
): RiskAssessment {
  // 计算各商品持仓占比
  const holdings: { goodsId: number; value: number; ratio: number }[] = [];
  let totalValue = 0;
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    if (inventory > 0) {
      const value = inventory * world.goods.prices[goodsId];
      holdings.push({ goodsId, value, ratio: 0 });
      totalValue += value;
    }
  }
  
  // 计算占比
  holdings.forEach(h => h.ratio = totalValue > 0 ? h.value / totalValue : 0);
  holdings.sort((a, b) => b.ratio - a.ratio);
  
  // 找出超过限额的
  const overConcentrated = holdings.filter(h => h.ratio > limits.maxSingleGoodsRatio);
  const maxConcentration = holdings[0]?.ratio || 0;
  
  // 计算HHI
  const hhi = holdings.reduce((sum, h) => sum + Math.pow(h.ratio * 100, 2), 0);
  
  // 计算分数
  let score: number;
  if (maxConcentration > limits.maxSingleGoodsRatio * 1.5) {
    score = 80;
  } else if (maxConcentration > limits.maxSingleGoodsRatio) {
    score = 50 + (maxConcentration - limits.maxSingleGoodsRatio) / limits.maxSingleGoodsRatio * 30;
  } else if (hhi > 2500) {
    score = 40 + (hhi - 2500) / 5000 * 30;
  } else {
    score = hhi / 2500 * 40;
  }
  
  score = Math.min(100, Math.max(0, score));
  
  let level: RiskAssessment['level'];
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';
  else level = 'low';
  
  const mitigationActions: string[] = [];
  if (overConcentrated.length > 0) {
    mitigationActions.push(`减少${ALL_GOODS.find(g => g.id === overConcentrated[0].goodsId)?.name}持仓`);
    mitigationActions.push('增加投资组合多样性');
  }
  
  return {
    type: 'concentration',
    level,
    score,
    description: `最大单一持仓${(maxConcentration * 100).toFixed(1)}%，HHI=${hhi.toFixed(0)}`,
    affectedGoods: overConcentrated.map(h => h.goodsId),
    potentialLoss: overConcentrated.reduce((sum, h) => sum + h.value * 0.2, 0),
    probability: 0.1,
    mitigationActions,
  };
}

/**
 * 评估库存风险
 */
function assessInventoryRisk(
  world: GameWorld,
  companyId: number,
  limits: RiskLimits
): RiskAssessment {
  const profitAnalysis = analyzeCompanyProfit(world, companyId);
  
  let overStockCount = 0;
  let underStockCount = 0;
  let totalOverStockValue = 0;
  const affectedGoods: number[] = [];
  
  for (const [goodsId, analysis] of profitAnalysis.goodsAnalysis) {
    if (analysis.dailyOutput > 0) {
      if (analysis.inventoryDays > limits.maxInventoryDays) {
        overStockCount++;
        totalOverStockValue += world.companies.inventories[companyId * GOODS_COUNT + goodsId] * world.goods.prices[goodsId];
        affectedGoods.push(goodsId);
      } else if (analysis.inventoryDays < limits.minInventoryDays && analysis.inventoryDays > 0) {
        underStockCount++;
        affectedGoods.push(goodsId);
      }
    }
  }
  
  // 计算分数
  const totalProducts = profitAnalysis.goodsAnalysis.size;
  const problemRatio = totalProducts > 0 ? (overStockCount + underStockCount) / totalProducts : 0;
  
  let score = problemRatio * 80 + (overStockCount > 5 ? 20 : 0);
  score = Math.min(100, Math.max(0, score));
  
  let level: RiskAssessment['level'];
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';
  else level = 'low';
  
  const mitigationActions: string[] = [];
  if (overStockCount > 0) {
    mitigationActions.push('降价促销积压商品');
    mitigationActions.push('减少相关产品生产');
  }
  if (underStockCount > 0) {
    mitigationActions.push('增加短缺商品采购');
    mitigationActions.push('提高生产效率');
  }
  
  return {
    type: 'inventory',
    level,
    score,
    description: `${overStockCount}种商品积压，${underStockCount}种商品短缺`,
    affectedGoods,
    potentialLoss: totalOverStockValue * 0.3, // 假设30%跌价损失
    probability: 0.3,
    mitigationActions,
  };
}

/**
 * 评估运营风险
 */
function assessOperationalRisk(
  world: GameWorld,
  companyId: number,
  limits: RiskLimits
): RiskAssessment {
  // 检查生产设施状态
  let activeBuildings = 0;
  let inactiveBuildings = 0;
  let lowEfficiencyBuildings = 0;
  
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] !== companyId) continue;
    
    if (world.buildings.isActive[i]) {
      activeBuildings++;
      if (world.buildings.efficiencies[i] < 0.5) {
        lowEfficiencyBuildings++;
      }
    } else {
      inactiveBuildings++;
    }
  }
  
  const totalBuildings = activeBuildings + inactiveBuildings;
  
  // 计算分数
  let score = 0;
  if (totalBuildings > 0) {
    const inactiveRatio = inactiveBuildings / totalBuildings;
    const lowEffRatio = lowEfficiencyBuildings / (activeBuildings || 1);
    
    score = inactiveRatio * 50 + lowEffRatio * 30;
    
    // 如果没有建筑，风险较低（新公司）
    if (totalBuildings < 3) {
      score = Math.max(score, 20);
    }
  }
  
  score = Math.min(100, Math.max(0, score));
  
  let level: RiskAssessment['level'];
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';
  else level = 'low';
  
  const mitigationActions: string[] = [];
  if (inactiveBuildings > 0) {
    mitigationActions.push('重新激活闲置设施');
    mitigationActions.push('检查原材料供应');
  }
  if (lowEfficiencyBuildings > 0) {
    mitigationActions.push('升级低效设施');
    mitigationActions.push('优化生产配方');
  }
  
  return {
    type: 'operational',
    level,
    score,
    description: `${activeBuildings}个活跃设施，${inactiveBuildings}个闲置，${lowEfficiencyBuildings}个低效`,
    potentialLoss: inactiveBuildings * 100000, // 估算闲置成本
    probability: 0.2,
    mitigationActions,
  };
}

// ==================== 风险预警 ====================

/**
 * 生成风险预警
 */
function generateRiskAlerts(
  store: RiskManagementStore,
  assessments: RiskAssessment[],
  tick: number
): void {
  for (const assessment of assessments) {
    if (assessment.level === 'critical' || assessment.level === 'high') {
      const existingAlert = store.alerts.find(
        a => a.type === assessment.type && !a.acknowledged
      );
      
      if (!existingAlert) {
        store.alerts.push({
          id: `alert-${++alertIdCounter}`,
          timestamp: tick,
          type: assessment.type,
          severity: assessment.level === 'critical' ? 'critical' : 'warning',
          message: assessment.description,
          suggestedAction: assessment.mitigationActions[0] || '请关注此风险',
          acknowledged: false,
        });
      }
    }
  }
  
  // 清理已确认的旧预警
  store.alerts = store.alerts.filter(
    a => !a.acknowledged || tick - a.timestamp < TICKS_PER_DAY * 7
  );
}

/**
 * 确认预警
 */
export function acknowledgeAlert(companyId: number, alertId: string): void {
  const store = riskStores.get(companyId);
  if (!store) return;
  
  const alert = store.alerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
  }
}

// ==================== 风险敞口管理 ====================

/**
 * 更新风险敞口
 */
export function updateRiskExposures(
  world: GameWorld,
  companyId: number
): void {
  const store = riskStores.get(companyId);
  if (!store) return;
  
  store.exposures.clear();
  
  // 计算总资产
  let totalAssets = world.companies.cash[companyId];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    if (inventory <= 0) continue;
    
    const price = world.goods.prices[goodsId];
    const value = inventory * price;
    totalAssets += value;
    
    const indicators = calculateTechnicalIndicators(world, goodsId);
    const volatility = indicators.atr / price;
    const var95 = value * volatility * 1.65;
    
    store.exposures.set(goodsId, {
      goodsId,
      exposureType: 'long',
      value,
      percentOfAssets: 0, // 稍后计算
      volatility,
      var95,
    });
  }
  
  // 更新资产占比
  for (const exposure of store.exposures.values()) {
    exposure.percentOfAssets = totalAssets > 0 ? exposure.value / totalAssets : 0;
  }
}

/**
 * 获取高风险敞口
 */
export function getHighRiskExposures(
  companyId: number,
  threshold: number = 0.1
): RiskExposure[] {
  const store = riskStores.get(companyId);
  if (!store) return [];
  
  return Array.from(store.exposures.values())
    .filter(e => e.percentOfAssets > threshold || e.volatility > 0.1)
    .sort((a, b) => b.var95 - a.var95);
}

// ==================== 风险决策支持 ====================

/**
 * 检查交易是否符合风险限额
 */
export function checkTradeRiskLimits(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  quantity: number,
  price: number,
  isBuy: boolean
): {
  allowed: boolean;
  warnings: string[];
  adjustedQuantity?: number;
} {
  const store = riskStores.get(companyId);
  if (!store) {
    return { allowed: true, warnings: [] };
  }
  
  const warnings: string[] = [];
  const tradeValue = quantity * price;
  const cash = world.companies.cash[companyId];
  
  // 检查单笔订单限额
  if (tradeValue > store.limits.maxOrderValue) {
    warnings.push(`订单金额¥${tradeValue.toFixed(0)}超过限额¥${store.limits.maxOrderValue}`);
  }
  
  // 检查现金限额（买入时）
  if (isBuy) {
    const cashAfter = cash - tradeValue;
    let totalAssets = cash;
    for (let i = 0; i < GOODS_COUNT; i++) {
      totalAssets += world.companies.inventories[companyId * GOODS_COUNT + i] * world.goods.prices[i];
    }
    
    const cashRatioAfter = cashAfter / totalAssets;
    if (cashRatioAfter < store.limits.minCashRatio) {
      warnings.push(`交易后现金比例${(cashRatioAfter * 100).toFixed(1)}%低于限额${(store.limits.minCashRatio * 100).toFixed(0)}%`);
    }
  }
  
  // 检查价格偏离
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (goods) {
    const deviation = Math.abs(price - goods.basePrice) / goods.basePrice;
    if (deviation > store.limits.maxPriceDeviation) {
      warnings.push(`价格偏离基准${(deviation * 100).toFixed(0)}%超过限额`);
    }
  }
  
  // 检查集中度（买入时）
  if (isBuy) {
    const currentInventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    const newInventory = currentInventory + quantity;
    const newValue = newInventory * price;
    
    let totalValue = 0;
    for (let i = 0; i < GOODS_COUNT; i++) {
      const qty = i === goodsId ? newInventory : world.companies.inventories[companyId * GOODS_COUNT + i];
      totalValue += qty * world.goods.prices[i];
    }
    
    const concentration = newValue / totalValue;
    if (concentration > store.limits.maxSingleGoodsRatio) {
      warnings.push(`持仓集中度${(concentration * 100).toFixed(0)}%超过限额`);
    }
  }
  
  // 判断是否允许
  const criticalWarnings = warnings.filter(w => 
    w.includes('现金比例') || w.includes('订单金额')
  );
  
  const allowed = criticalWarnings.length === 0;
  
  // 计算建议调整量
  let adjustedQuantity: number | undefined;
  if (!allowed && isBuy) {
    // 计算可接受的最大数量
    const maxByOrder = store.limits.maxOrderValue / price;
    const maxByCash = (cash - cash * store.limits.minCashRatio) / price;
    adjustedQuantity = Math.min(maxByOrder, maxByCash, quantity);
    if (adjustedQuantity < 1) adjustedQuantity = undefined;
  }
  
  return { allowed, warnings, adjustedQuantity };
}

/**
 * 获取风险调整后的建议
 */
export function getRiskAdjustedRecommendation(
  world: GameWorld,
  companyId: number,
  originalQuantity: number,
  goodsId: number,
  isBuy: boolean
): {
  adjustedQuantity: number;
  riskFactor: number;           // 0-1, 越低风险越高
  adjustmentReason: string;
} {
  const store = riskStores.get(companyId);
  if (!store) {
    return {
      adjustedQuantity: originalQuantity,
      riskFactor: 1,
      adjustmentReason: '无风险数据',
    };
  }
  
  let riskFactor = 1;
  let adjustmentReason = '';
  
  // 获取最新风险评估
  const marketRisk = store.assessments.find(a => a.type === 'market');
  const liquidityRisk = store.assessments.find(a => a.type === 'liquidity');
  const concentrationRisk = store.assessments.find(a => a.type === 'concentration');
  
  // 根据市场风险调整
  if (marketRisk && marketRisk.score > 50) {
    riskFactor *= (1 - marketRisk.score / 200);
    adjustmentReason = '市场波动大';
  }
  
  // 根据流动性风险调整
  if (liquidityRisk && liquidityRisk.score > 50 && isBuy) {
    riskFactor *= (1 - liquidityRisk.score / 150);
    adjustmentReason = adjustmentReason ? adjustmentReason + '；现金紧张' : '现金紧张';
  }
  
  // 根据集中度风险调整
  if (concentrationRisk && isBuy) {
    const exposure = store.exposures.get(goodsId);
    if (exposure && exposure.percentOfAssets > store.limits.maxSingleGoodsRatio * 0.8) {
      riskFactor *= 0.5;
      adjustmentReason = adjustmentReason ? adjustmentReason + '；集中度过高' : '集中度过高';
    }
  }
  
  riskFactor = Math.max(0.1, Math.min(1, riskFactor));
  const adjustedQuantity = Math.max(1, Math.round(originalQuantity * riskFactor));
  
  return {
    adjustedQuantity,
    riskFactor,
    adjustmentReason: adjustmentReason || '风险可控',
  };
}

// ==================== 辅助查询 ====================

/**
 * 获取风险摘要
 */
export function getRiskSummary(companyId: number): {
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  overallScore: number;
  topRisks: RiskAssessment[];
  activeAlerts: number;
  trend: 'increasing' | 'decreasing' | 'stable';
} | null {
  const store = riskStores.get(companyId);
  if (!store) return null;
  
  const overallScore = store.assessments.length > 0
    ? store.assessments.reduce((sum, a) => sum + a.score, 0) / store.assessments.length
    : 0;
  
  let overallRisk: 'critical' | 'high' | 'medium' | 'low';
  if (overallScore >= 70) overallRisk = 'critical';
  else if (overallScore >= 50) overallRisk = 'high';
  else if (overallScore >= 30) overallRisk = 'medium';
  else overallRisk = 'low';
  
  const topRisks = [...store.assessments]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  
  const activeAlerts = store.alerts.filter(a => !a.acknowledged).length;
  
  // 计算趋势
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (store.riskHistory.length >= 7) {
    const recent = store.riskHistory.slice(-7);
    const firstAvg = (recent[0].overallRisk + recent[1].overallRisk + recent[2].overallRisk) / 3;
    const lastAvg = (recent[4].overallRisk + recent[5].overallRisk + recent[6].overallRisk) / 3;
    
    if (lastAvg > firstAvg + 5) trend = 'increasing';
    else if (lastAvg < firstAvg - 5) trend = 'decreasing';
  }
  
  return {
    overallRisk,
    overallScore,
    topRisks,
    activeAlerts,
    trend,
  };
}

/**
 * 获取活跃预警
 */
export function getActiveAlerts(companyId: number): RiskAlert[] {
  const store = riskStores.get(companyId);
  return store?.alerts.filter(a => !a.acknowledged) || [];
}

/**
 * 获取风险限额
 */
export function getRiskLimits(companyId: number): RiskLimits | null {
  const store = riskStores.get(companyId);
  return store?.limits || null;
}

/**
 * 更新风险限额
 */
export function updateRiskLimits(
  companyId: number,
  newLimits: Partial<RiskLimits>
): void {
  const store = riskStores.get(companyId);
  if (store) {
    store.limits = { ...store.limits, ...newLimits };
  }
}