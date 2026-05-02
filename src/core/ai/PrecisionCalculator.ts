/**
 * AI精确计算模块
 *
 * 替换AIDecisionEngine中的硬编码值，实现真实的利润率和市场份额计算
 *
 * Vic3 更新：使用当前建筑实例 recipe 替代旧 RECIPES / outputMode 体系
 *
 * 设计目标：
 * 1. 精确计算每种商品的真实利润率（成本、收入、边际利润）
 * 2. 精确计算公司在每种商品市场的份额
 * 3. 分析生产效率和瓶颈
 * 4. 提供决策所需的精确数据支持
 */

import { GameWorld, getPriceHistory } from '@/core/world/GameWorld';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, HISTORY_SIZE, TICKS_PER_DAY } from '@/core/constants';
import { ALL_GOODS, GoodsDefinition } from '@/data/goods';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import type { ComputedRecipe, RecipeDelta } from '@/core/production/ProductionMethods';

// ==================== 类型定义 ====================

/**
 * 单个商品的利润分析
 */
export interface GoodsProfitAnalysis {
  goodsId: number;
  goodsName: string;
  
  // 成本结构
  rawMaterialCost: number;        // 原材料成本（每单位）
  laborCost: number;              // 人工成本（每单位）
  energyCost: number;             // 能源成本（每单位）
  totalUnitCost: number;          // 单位总成本
  
  // 收入结构
  currentPrice: number;           // 当前市场价
  averageSellPrice: number;       // 平均售价（基于历史成交）
  
  // 利润指标
  grossProfit: number;            // 毛利润（单位）
  grossMargin: number;            // 毛利率 (0-1)
  
  // 生产状态
  dailyOutput: number;            // 日产量
  inventoryDays: number;          // 库存天数
  productionEfficiency: number;   // 生产效率 (0-1.5)
  
  // 是否盈利
  isProfitable: boolean;
}

/**
 * 公司整体利润分析
 */
export interface CompanyProfitAnalysis {
  companyId: number;
  companyName: string;
  
  // 整体财务
  totalRevenue: number;           // 总收入
  totalCost: number;              // 总成本
  netProfit: number;              // 净利润
  overallProfitMargin: number;    // 整体利润率
  
  // 现金流
  cashOnHand: number;             // 现金
  inventoryValue: number;         // 库存价值
  operatingCashFlow: number;      // 经营现金流（估算）
  
  // 各商品分析
  goodsAnalysis: Map<number, GoodsProfitAnalysis>;
  
  // 最赚钱/最亏损的商品
  mostProfitableGoods: number[];
  leastProfitableGoods: number[];
}

/**
 * 市场份额分析
 */
export interface MarketShareAnalysis {
  goodsId: number;
  
  // 公司数据
  companySales: number;           // 公司销量
  companyRevenue: number;         // 公司销售额
  
  // 市场数据
  totalMarketSales: number;       // 市场总销量
  totalMarketRevenue: number;     // 市场总销售额
  
  // 份额
  volumeShare: number;            // 销量份额 (0-1)
  revenueShare: number;           // 销售额份额 (0-1)
  
  // 竞争态势
  competitorCount: number;        // 竞争者数量
  marketConcentration: number;    // 市场集中度 (HHI)
  companyRank: number;            // 公司排名
}

/**
 * 公司整体市场地位
 */
export interface CompanyMarketPosition {
  companyId: number;
  
  // 各商品份额
  goodsShares: Map<number, MarketShareAnalysis>;
  
  // 加权平均市场份额
  averageMarketShare: number;
  
  // 优势/劣势领域
  dominantGoods: number[];        // 份额>20%的商品
  weakGoods: number[];            // 份额<5%的商品
}

/**
 * 价格趋势指标
 */
export interface PriceTrendIndicators {
  goodsId: number;
  
  // 移动平均
  ma5: number;                    // 5期移动平均
  ma20: number;                   // 20期移动平均
  ma60: number;                   // 60期移动平均
  
  // 动量指标
  momentum: number;               // 价格动量 (-1 to 1)
  volatility: number;             // 波动率
  trendStrength: number;          // 趋势强度 (0-1)
  
  // 趋势方向
  trend: 'up' | 'down' | 'sideways';
  
  // 相对价格位置
  pricePosition: number;          // 当前价格在历史范围中的位置 (0-1)
}

// ==================== 精确利润计算 ====================

/** 生产配置类型（用于计算） */
interface ProductionConfig {
  inputs: RecipeDelta[];
  outputs: RecipeDelta[];
  ticksRequired: number;
  laborRequired: number;
  energyRequired: number;
}

/**
 * 计算生产配置的原材料成本
 * v4.0更新：使用ProductionConfig替代RecipeDefinition
 */
export function calculateProductionMaterialCost(
  world: GameWorld,
  production: ProductionConfig
): number {
  let totalCost = 0;
  
  for (const input of production.inputs) {
    const inputPrice = world.goods.prices[input.goodsId];
    totalCost += inputPrice * input.amount;
  }
  
  return totalCost;
}

/**
 * 计算生产配置的单位产出成本
 * v4.0更新：使用ProductionConfig替代RecipeDefinition
 */
export function calculateProductionUnitCost(
  world: GameWorld,
  production: ProductionConfig
): number {
  // 原材料成本
  const materialCost = calculateProductionMaterialCost(world, production);
  
  // 人工成本（假设人工时薪50元）
  const laborCost = production.laborRequired * 50 / production.ticksRequired;
  
  // 能源成本（假设电价0.5元/度）
  const energyCost = production.energyRequired * 0.5 / production.ticksRequired;
  
  // 总成本
  const totalCost = materialCost + laborCost + energyCost;
  
  // 计算单位产出成本
  const totalOutput = production.outputs.reduce((sum, o) => sum + o.amount, 0);
  
  return totalOutput > 0 ? totalCost / totalOutput : totalCost;
}

// 保留旧函数名以兼容（委托到新函数）
export const calculateRecipeMaterialCost = calculateProductionMaterialCost;
export const calculateRecipeUnitCost = calculateProductionUnitCost;

/**
 * 计算公司对某商品的日产量
 * Vic3 更新：使用当前建筑实例 recipe 替代旧 RECIPES / outputMode 体系
 */
export function calculateDailyOutput(
  world: GameWorld,
  companyId: number,
  goodsId: number
): number {
  const b = world.buildings;
  let dailyOutput = 0;
  
  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (!b.isActive[i]) continue;

    const production = getBuildingRecipeFromInstance(world, i);

    for (const output of production.outputs) {
      if (output.goodsId === goodsId) {
        const efficiency = b.efficiencies[i] || 1;
        const outputPerCycle = output.amount;
        const cyclesPerDay = TICKS_PER_DAY / Math.max(1, production.ticksRequired);
        dailyOutput += outputPerCycle * cyclesPerDay * efficiency;
      }
    }
  }
  
  return dailyOutput;
}

/**
 * 获取公司某商品的历史销售数据
 */
export function getCompanySalesData(
  world: GameWorld,
  companyId: number,
  goodsId: number
): { quantity: number; revenue: number; averagePrice: number } {
  const idx = companyId * GOODS_COUNT + goodsId;
  const quantity = world.trades.cumulativeSalesQuantity[idx];
  const revenue = world.trades.cumulativeSalesRevenue[idx];
  const averagePrice = quantity > 0 ? revenue / quantity : world.goods.prices[goodsId];
  
  return { quantity, revenue, averagePrice };
}

/**
 * 计算公司对某商品的完整利润分析
 * Vic3 更新：使用当前建筑实例 recipe 替代旧 RECIPES / outputMode 体系
 */
export function analyzeGoodsProfit(
  world: GameWorld,
  companyId: number,
  goodsId: number
): GoodsProfitAnalysis {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const goodsName = goods?.name ?? `商品${goodsId}`;
  
  // 找到生产该商品的生产配置（如果有）
  const producingConfig = findProducingConfig(world, companyId, goodsId);
  
  // 成本计算
  let rawMaterialCost = 0;
  let laborCost = 0;
  let energyCost = 0;
  
  if (producingConfig) {
    rawMaterialCost = calculateProductionMaterialCost(world, producingConfig);
    laborCost = producingConfig.laborRequired * 50 / producingConfig.ticksRequired;
    energyCost = producingConfig.energyRequired * 0.5 / producingConfig.ticksRequired;
    
    // 转换为单位成本
    const outputPerCycle = producingConfig.outputs.find(o => o.goodsId === goodsId)?.amount || 1;
    rawMaterialCost /= outputPerCycle;
    laborCost /= outputPerCycle;
    energyCost /= outputPerCycle;
  }
  
  const totalUnitCost = rawMaterialCost + laborCost + energyCost;
  
  // 收入数据
  const currentPrice = world.goods.prices[goodsId];
  const salesData = getCompanySalesData(world, companyId, goodsId);
  const averageSellPrice = salesData.averagePrice;
  
  // 利润计算
  const grossProfit = averageSellPrice - totalUnitCost;
  const grossMargin = averageSellPrice > 0 ? grossProfit / averageSellPrice : 0;
  
  // 生产状态
  const dailyOutput = calculateDailyOutput(world, companyId, goodsId);
  const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
  const inventoryDays = dailyOutput > 0 ? inventory / dailyOutput : (inventory > 0 ? 999 : 0);
  
  // 生产效率（基于建筑效率的平均值）
  const productionEfficiency = calculateAverageEfficiency(world, companyId, goodsId);
  
  return {
    goodsId,
    goodsName,
    rawMaterialCost,
    laborCost,
    energyCost,
    totalUnitCost,
    currentPrice,
    averageSellPrice,
    grossProfit,
    grossMargin,
    dailyOutput,
    inventoryDays,
    productionEfficiency,
    isProfitable: grossMargin > 0,
  };
}

/**
 * 查找公司生产某商品的生产配置
 * v4.0更新：返回ProductionConfig替代RecipeDefinition
 */
function findProducingConfig(
  world: GameWorld,
  companyId: number,
  goodsId: number
): ProductionConfig | null {
  const b = world.buildings;
  
  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (!b.isActive[i]) continue;

    const production = getBuildingRecipeFromInstance(world, i);

    if (production.outputs.some(o => o.goodsId === goodsId)) {
      return production;
    }
  }
  
  return null;
}

// 保留旧函数名以兼容
const findProducingRecipe = findProducingConfig;

/**
 * 计算公司某商品生产的平均效率
 * Vic3 更新：使用当前建筑实例 recipe 替代旧 RECIPES / outputMode 体系
 */
function calculateAverageEfficiency(
  world: GameWorld,
  companyId: number,
  goodsId: number
): number {
  const b = world.buildings;
  let totalEfficiency = 0;
  let count = 0;
  
  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (!b.isActive[i]) continue;

    const production = getBuildingRecipeFromInstance(world, i);

    if (production.outputs.some(o => o.goodsId === goodsId)) {
      totalEfficiency += b.efficiencies[i] || 1;
      count++;
    }
  }
  
  return count > 0 ? totalEfficiency / count : 1;
}

/**
 * 计算公司整体利润分析
 */
export function analyzeCompanyProfit(
  world: GameWorld,
  companyId: number
): CompanyProfitAnalysis {
  const companyName = world.companies.names[companyId] || `公司${companyId}`;
  
  // 分析每种商品
  const goodsAnalysis = new Map<number, GoodsProfitAnalysis>();
  let totalRevenue = 0;
  let totalCost = 0;
  
  // 跟踪利润率排序
  const profitRankings: { goodsId: number; margin: number }[] = [];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const dailyOutput = calculateDailyOutput(world, companyId, goodsId);
    const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
    
    // 只分析有生产或库存的商品
    if (dailyOutput > 0 || inventory > 10) {
      const analysis = analyzeGoodsProfit(world, companyId, goodsId);
      goodsAnalysis.set(goodsId, analysis);
      
      // 累计收入成本
      const salesData = getCompanySalesData(world, companyId, goodsId);
      totalRevenue += salesData.revenue;
      totalCost += analysis.totalUnitCost * salesData.quantity;
      
      if (dailyOutput > 0) {
        profitRankings.push({ goodsId, margin: analysis.grossMargin });
      }
    }
  }
  
  // 计算净利润和整体利润率
  const netProfit = totalRevenue - totalCost;
  const overallProfitMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0;
  
  // 现金和库存
  const cashOnHand = world.companies.cash[companyId];
  let inventoryValue = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    const qty = world.companies.inventories[companyId * GOODS_COUNT + i];
    inventoryValue += qty * world.goods.prices[i];
  }
  
  // 经营现金流估算（简化：过去一天的净收入 - 采购支出）
  // 这里使用近似值
  const operatingCashFlow = netProfit / 365; // 年化后的日均值
  
  // 排序找出最赚钱和最亏损的商品
  profitRankings.sort((a, b) => b.margin - a.margin);
  const mostProfitableGoods = profitRankings.slice(0, 5).map(r => r.goodsId);
  const leastProfitableGoods = profitRankings
    .filter(r => r.margin < 0)
    .slice(-5)
    .map(r => r.goodsId);
  
  return {
    companyId,
    companyName,
    totalRevenue,
    totalCost,
    netProfit,
    overallProfitMargin,
    cashOnHand,
    inventoryValue,
    operatingCashFlow,
    goodsAnalysis,
    mostProfitableGoods,
    leastProfitableGoods,
  };
}

// ==================== 精确市场份额计算 ====================

/**
 * 计算某商品的市场总销量（所有公司）
 */
export function calculateTotalMarketSales(
  world: GameWorld,
  goodsId: number
): { totalQuantity: number; totalRevenue: number } {
  let totalQuantity = 0;
  let totalRevenue = 0;
  
  for (let companyId = 0; companyId < world.companies.count; companyId++) {
    const idx = companyId * GOODS_COUNT + goodsId;
    totalQuantity += world.trades.cumulativeSalesQuantity[idx];
    totalRevenue += world.trades.cumulativeSalesRevenue[idx];
  }
  
  return { totalQuantity, totalRevenue };
}

/**
 * 计算公司在某商品市场的份额
 */
export function analyzeMarketShare(
  world: GameWorld,
  companyId: number,
  goodsId: number
): MarketShareAnalysis {
  // 公司数据
  const companyData = getCompanySalesData(world, companyId, goodsId);
  const companySales = companyData.quantity;
  const companyRevenue = companyData.revenue;
  
  // 市场数据
  const marketData = calculateTotalMarketSales(world, goodsId);
  const totalMarketSales = marketData.totalQuantity;
  const totalMarketRevenue = marketData.totalRevenue;
  
  // 份额计算
  const volumeShare = totalMarketSales > 0 ? companySales / totalMarketSales : 0;
  const revenueShare = totalMarketRevenue > 0 ? companyRevenue / totalMarketRevenue : 0;
  
  // 竞争分析
  const competitorAnalysis = analyzeCompetitors(world, goodsId, companyId);
  
  return {
    goodsId,
    companySales,
    companyRevenue,
    totalMarketSales,
    totalMarketRevenue,
    volumeShare,
    revenueShare,
    competitorCount: competitorAnalysis.count,
    marketConcentration: competitorAnalysis.hhi,
    companyRank: competitorAnalysis.rank,
  };
}

/**
 * 分析竞争者情况
 */
function analyzeCompetitors(
  world: GameWorld,
  goodsId: number,
  targetCompanyId: number
): { count: number; hhi: number; rank: number } {
  const shares: { companyId: number; share: number }[] = [];
  const marketData = calculateTotalMarketSales(world, goodsId);
  
  if (marketData.totalQuantity === 0) {
    return { count: 0, hhi: 0, rank: 1 };
  }
  
  // 收集所有公司的市场份额
  for (let companyId = 0; companyId < world.companies.count; companyId++) {
    const idx = companyId * GOODS_COUNT + goodsId;
    const sales = world.trades.cumulativeSalesQuantity[idx];
    if (sales > 0) {
      shares.push({
        companyId,
        share: sales / marketData.totalQuantity,
      });
    }
  }
  
  // 计算HHI（赫芬达尔指数）
  const hhi = shares.reduce((sum, s) => sum + Math.pow(s.share * 100, 2), 0);
  
  // 排序确定排名
  shares.sort((a, b) => b.share - a.share);
  const rank = shares.findIndex(s => s.companyId === targetCompanyId) + 1;
  
  return {
    count: shares.length,
    hhi,
    rank: rank || shares.length + 1,
  };
}

/**
 * 计算公司整体市场地位
 */
export function analyzeCompanyMarketPosition(
  world: GameWorld,
  companyId: number
): CompanyMarketPosition {
  const goodsShares = new Map<number, MarketShareAnalysis>();
  const dominantGoods: number[] = [];
  const weakGoods: number[] = [];
  
  let totalWeightedShare = 0;
  let totalWeight = 0;
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    // 检查公司是否参与该商品市场
    const salesData = getCompanySalesData(world, companyId, goodsId);
    const dailyOutput = calculateDailyOutput(world, companyId, goodsId);
    
    if (salesData.quantity > 0 || dailyOutput > 0) {
      const shareAnalysis = analyzeMarketShare(world, companyId, goodsId);
      goodsShares.set(goodsId, shareAnalysis);
      
      // 加权平均（按销售额加权）
      const weight = shareAnalysis.companyRevenue;
      totalWeightedShare += shareAnalysis.revenueShare * weight;
      totalWeight += weight;
      
      // 分类
      if (shareAnalysis.volumeShare >= 0.20) {
        dominantGoods.push(goodsId);
      } else if (shareAnalysis.volumeShare < 0.05 && salesData.quantity > 0) {
        weakGoods.push(goodsId);
      }
    }
  }
  
  const averageMarketShare = totalWeight > 0 ? totalWeightedShare / totalWeight : 0;
  
  return {
    companyId,
    goodsShares,
    averageMarketShare,
    dominantGoods,
    weakGoods,
  };
}

// ==================== 价格趋势分析 ====================

/**
 * 计算移动平均
 */
function calculateMovingAverage(
  world: GameWorld,
  goodsId: number,
  periods: number
): number {
  if (periods > HISTORY_SIZE) periods = HISTORY_SIZE;
  
  let sum = 0;
  let count = 0;
  
  for (let i = 0; i < periods; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) {
      sum += price;
      count++;
    }
  }
  
  return count > 0 ? sum / count : world.goods.prices[goodsId];
}

/**
 * 计算价格动量（当前价格 vs N期前价格的变化率）
 */
function calculateMomentum(
  world: GameWorld,
  goodsId: number,
  periods: number = 10
): number {
  const currentPrice = world.goods.prices[goodsId];
  const pastPrice = getPriceHistory(world, goodsId, periods);
  
  if (pastPrice <= 0) return 0;
  
  const change = (currentPrice - pastPrice) / pastPrice;
  // 归一化到 -1 到 1
  return Math.max(-1, Math.min(1, change * 5));
}

/**
 * 计算价格波动率
 */
function calculateVolatility(
  world: GameWorld,
  goodsId: number,
  periods: number = 20
): number {
  const prices: number[] = [];
  
  for (let i = 0; i < periods; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) prices.push(price);
  }
  
  if (prices.length < 2) return 0;
  
  // 计算收益率的标准差
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i - 1] - prices[i]) / prices[i]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

/**
 * 分析价格趋势
 */
export function analyzePriceTrend(
  world: GameWorld,
  goodsId: number
): PriceTrendIndicators {
  const currentPrice = world.goods.prices[goodsId];
  
  // 移动平均
  const ma5 = calculateMovingAverage(world, goodsId, 5);
  const ma20 = calculateMovingAverage(world, goodsId, 20);
  const ma60 = calculateMovingAverage(world, goodsId, 60);
  
  // 动量和波动率
  const momentum = calculateMomentum(world, goodsId, 10);
  const volatility = calculateVolatility(world, goodsId, 20);
  
  // 趋势强度（MA5和MA20的差距）
  const trendStrength = Math.abs(ma5 - ma20) / ma20;
  
  // 判断趋势方向
  let trend: 'up' | 'down' | 'sideways' = 'sideways';
  if (ma5 > ma20 * 1.02) {
    trend = 'up';
  } else if (ma5 < ma20 * 0.98) {
    trend = 'down';
  }
  
  // 计算价格在历史范围中的位置
  let minPrice = currentPrice;
  let maxPrice = currentPrice;
  for (let i = 0; i < 60; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) {
      minPrice = Math.min(minPrice, price);
      maxPrice = Math.max(maxPrice, price);
    }
  }
  const priceRange = maxPrice - minPrice;
  const pricePosition = priceRange > 0 ? (currentPrice - minPrice) / priceRange : 0.5;
  
  return {
    goodsId,
    ma5,
    ma20,
    ma60,
    momentum,
    volatility,
    trendStrength,
    trend,
    pricePosition,
  };
}

// ==================== 综合决策支持 ====================

/**
 * 综合分析结果
 */
export interface ComprehensiveAnalysis {
  profit: CompanyProfitAnalysis;
  marketPosition: CompanyMarketPosition;
  priceTrends: Map<number, PriceTrendIndicators>;
  
  // 综合指标
  overallScore: number;           // 综合评分 (0-100)
  
  // 关键洞察
  insights: {
    type: 'opportunity' | 'risk' | 'recommendation';
    goodsId?: number;
    message: string;
    priority: number;
  }[];
}

/**
 * 执行全面分析
 */
export function performComprehensiveAnalysis(
  world: GameWorld,
  companyId: number
): ComprehensiveAnalysis {
  // 利润分析
  const profit = analyzeCompanyProfit(world, companyId);
  
  // 市场地位分析
  const marketPosition = analyzeCompanyMarketPosition(world, companyId);
  
  // 价格趋势（只分析相关商品）
  const priceTrends = new Map<number, PriceTrendIndicators>();
  for (const goodsId of profit.goodsAnalysis.keys()) {
    priceTrends.set(goodsId, analyzePriceTrend(world, goodsId));
  }
  
  // 生成洞察
  const insights: ComprehensiveAnalysis['insights'] = [];
  
  // 1. 高利润机会
  for (const goodsId of profit.mostProfitableGoods) {
    const analysis = profit.goodsAnalysis.get(goodsId);
    if (analysis && analysis.grossMargin > 0.3) {
      insights.push({
        type: 'opportunity',
        goodsId,
        message: `${analysis.goodsName}毛利率${(analysis.grossMargin * 100).toFixed(1)}%，考虑扩大生产`,
        priority: 8,
      });
    }
  }
  
  // 2. 亏损风险
  for (const goodsId of profit.leastProfitableGoods) {
    const analysis = profit.goodsAnalysis.get(goodsId);
    if (analysis && analysis.grossMargin < -0.1) {
      insights.push({
        type: 'risk',
        goodsId,
        message: `${analysis.goodsName}毛利率${(analysis.grossMargin * 100).toFixed(1)}%，需要降低成本或提价`,
        priority: 9,
      });
    }
  }
  
  // 3. 库存积压
  for (const [goodsId, analysis] of profit.goodsAnalysis) {
    if (analysis.inventoryDays > 30 && analysis.dailyOutput > 0) {
      insights.push({
        type: 'risk',
        goodsId,
        message: `${analysis.goodsName}库存${analysis.inventoryDays.toFixed(0)}天，建议降价促销`,
        priority: 7,
      });
    }
  }
  
  // 4. 价格趋势机会
  for (const [goodsId, trend] of priceTrends) {
    if (trend.trend === 'up' && trend.momentum > 0.3) {
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      insights.push({
        type: 'opportunity',
        goodsId,
        message: `${goods?.name || goodsId}价格上涨趋势，可增加库存`,
        priority: 6,
      });
    }
  }
  
  // 5. 市场份额建议
  for (const goodsId of marketPosition.dominantGoods) {
    const share = marketPosition.goodsShares.get(goodsId);
    if (share && share.volumeShare > 0.4) {
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      insights.push({
        type: 'recommendation',
        goodsId,
        message: `${goods?.name || goodsId}市占率${(share.volumeShare * 100).toFixed(1)}%，可考虑提价`,
        priority: 5,
      });
    }
  }
  
  // 按优先级排序
  insights.sort((a, b) => b.priority - a.priority);
  
  // 计算综合评分
  const profitScore = Math.max(0, Math.min(40, profit.overallProfitMargin * 200)); // 0-40分
  const marketScore = marketPosition.averageMarketShare * 300; // 0-30分
  const cashScore = Math.min(30, (profit.cashOnHand / 1000000) * 10); // 0-30分
  const overallScore = profitScore + marketScore + cashScore;
  
  return {
    profit,
    marketPosition,
    priceTrends,
    overallScore: Math.min(100, overallScore),
    insights,
  };
}

/**
 * 快速获取公司真实利润率（替换硬编码0.1）
 */
export function getCompanyProfitMargin(world: GameWorld, companyId: number): number {
  const profit = analyzeCompanyProfit(world, companyId);
  return profit.overallProfitMargin;
}

/**
 * 快速获取公司平均市场份额（替换硬编码0.05）
 */
export function getCompanyMarketShare(world: GameWorld, companyId: number): number {
  const position = analyzeCompanyMarketPosition(world, companyId);
  return position.averageMarketShare;
}

/**
 * 获取特定商品的利润率
 */
export function getGoodsProfitMargin(
  world: GameWorld,
  companyId: number,
  goodsId: number
): number {
  const analysis = analyzeGoodsProfit(world, companyId, goodsId);
  return analysis.grossMargin;
}

/**
 * 获取特定商品的市场份额
 */
export function getGoodsMarketShare(
  world: GameWorld,
  companyId: number,
  goodsId: number
): number {
  const analysis = analyzeMarketShare(world, companyId, goodsId);
  return analysis.volumeShare;
}