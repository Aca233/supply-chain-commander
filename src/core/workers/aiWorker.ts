/**
 * AI决策Worker
 * 
 * 运行在独立线程，负责计算AI公司的决策
 * 完全避免主线程阻塞
 */

import type {
  AIWorkerMessage,
  AIWorkerResponse,
  AIDecisionRequest,
  AIDecisionResult,
  AIDecisionDTO,
  CompanyStateDTO,
  MarketStateDTO,
  PriceTrendAnalysis,
  TradeSignal,
  FinancialAnalysis,
  InvestmentOpportunity,
  AIBatchRequest,
} from './aiWorkerTypes';

// ==================== 缓存 ====================

// 市场数据缓存（减少重复计算）
let cachedMarket: MarketStateDTO | null = null;
let cachedPriceTrends: Map<number, PriceTrendAnalysis> = new Map();
let lastMarketUpdateTick = -1;

// ==================== 消息处理 ====================

self.onmessage = async (e: MessageEvent<AIWorkerMessage>) => {
  const { type, payload, id } = e.data;
  const startTime = performance.now();
  
  try {
    let result: any;
    
    switch (type) {
      case 'AI_INIT':
        result = handleInit(payload);
        break;
        
      case 'AI_FAST_DECISION':
        result = handleFastDecision(payload);
        break;
        
      case 'AI_STANDARD_DECISION':
        result = handleStandardDecision(payload);
        break;
        
      case 'AI_DEEP_DECISION':
        result = handleDeepDecision(payload);
        break;
        
      case 'AI_BATCH':
        result = handleBatch(payload);
        break;
        
      case 'AI_UPDATE_MARKET':
        result = handleUpdateMarket(payload);
        break;
        
      case 'AI_PING':
        result = 'pong';
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    const duration = performance.now() - startTime;
    
    const response: AIWorkerResponse = {
      type,
      id,
      result,
      duration,
      success: true,
    };
    
    self.postMessage(response);
  } catch (error) {
    const duration = performance.now() - startTime;
    
    const response: AIWorkerResponse = {
      type,
      id,
      result: null,
      duration,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    
    self.postMessage(response);
  }
};

// ==================== 初始化 ====================

function handleInit(_payload: any): boolean {
  // 清空缓存
  cachedMarket = null;
  cachedPriceTrends.clear();
  lastMarketUpdateTick = -1;
  
  console.log('[AIWorker] 初始化完成');
  return true;
}

// ==================== 市场数据更新 ====================

function handleUpdateMarket(market: MarketStateDTO): boolean {
  cachedMarket = market;
  lastMarketUpdateTick = market.tick;
  
  // 重新计算价格趋势
  cachedPriceTrends.clear();
  for (const goods of market.goods) {
    const trends = market.priceTrends.get(goods.id) || [];
    const analysis = analyzePriceTrend(goods.id, goods.price, trends);
    cachedPriceTrends.set(goods.id, analysis);
  }
  
  return true;
}

// ==================== Fast决策 ====================

function handleFastDecision(request: AIDecisionRequest): AIDecisionResult {
  const startTime = performance.now();
  const decisions: AIDecisionDTO[] = [];
  
  const { company, market } = request;
  
  // 使用缓存的市场数据
  const marketData = cachedMarket || market;
  
  // Fast决策：只处理紧急交易
  const urgentTrades = computeUrgentTrades(company, marketData);
  decisions.push(...urgentTrades);
  
  return {
    requestId: request.requestId,
    companyId: request.companyId,
    tier: 'fast',
    decisions,
    computeTimeMs: performance.now() - startTime,
    success: true,
  };
}

// ==================== Standard决策 ====================

function handleStandardDecision(request: AIDecisionRequest): AIDecisionResult {
  const startTime = performance.now();
  const decisions: AIDecisionDTO[] = [];
  
  const { company, market } = request;
  const marketData = cachedMarket || market;
  
  // 分析财务状况
  const financial = analyzeFinancials(company);
  
  // 分析交易信号
  const signals = computeTradeSignals(company, marketData, financial);
  
  // 生成交易决策
  for (const signal of signals) {
    if (signal.action === 'buy' && signal.strength > 0.5) {
      const affordableQty = Math.floor(company.cash * 0.1 / signal.targetPrice);
      if (affordableQty > 0) {
        decisions.push({
          type: 'buy',
          goodsId: signal.goodsId,
          quantity: Math.min(affordableQty, 100),
          price: signal.targetPrice,
          priority: signal.strength,
          confidence: signal.strength,
          reason: `交易信号: ${signal.action} 强度${(signal.strength * 100).toFixed(0)}%`,
        });
      }
    } else if (signal.action === 'sell' && signal.strength > 0.5) {
      const inventory = company.inventories.get(signal.goodsId) || 0;
      if (inventory > 10) {
        decisions.push({
          type: 'sell',
          goodsId: signal.goodsId,
          quantity: Math.floor(inventory * 0.3),
          price: signal.targetPrice,
          priority: signal.strength,
          confidence: signal.strength,
          reason: `交易信号: ${signal.action} 强度${(signal.strength * 100).toFixed(0)}%`,
        });
      }
    }
  }
  
  return {
    requestId: request.requestId,
    companyId: request.companyId,
    tier: 'standard',
    decisions,
    computeTimeMs: performance.now() - startTime,
    success: true,
  };
}

// ==================== Deep决策 ====================

function handleDeepDecision(request: AIDecisionRequest): AIDecisionResult {
  const startTime = performance.now();
  const decisions: AIDecisionDTO[] = [];
  
  const { company, market } = request;
  const marketData = cachedMarket || market;
  
  // 完整财务分析
  const financial = analyzeFinancials(company);
  
  // 1. 生产优化决策
  const productionDecisions = optimizeProduction(company, marketData, financial);
  decisions.push(...productionDecisions);
  
  // 2. 交易决策
  const tradeDecisions = computeOptimalTrades(company, marketData, financial);
  decisions.push(...tradeDecisions);
  
  // 3. 投资决策（建造新建筑）
  if (financial.healthScore > 0.4 && company.cash > 500000) {
    const investments = findInvestmentOpportunities(company, marketData, financial);
    for (const investment of investments) {
      if (investment.expectedROI > 0.1 && investment.capitalRequired < company.cash * 0.5) {
        decisions.push({
          type: 'build',
          buildingTypeId: investment.buildingTypeId,
          recipeId: investment.recipeId,
          priority: investment.expectedROI,
          confidence: 1 - investment.riskScore,
          reason: `投资机会: 预期ROI ${(investment.expectedROI * 100).toFixed(1)}%, 回收期${investment.paybackPeriod}天`,
        });
      }
    }
  }
  
  // 4. 价格调整决策
  const priceAdjustments = optimizePricing(company, marketData);
  decisions.push(...priceAdjustments);
  
  return {
    requestId: request.requestId,
    companyId: request.companyId,
    tier: 'deep',
    decisions,
    computeTimeMs: performance.now() - startTime,
    success: true,
  };
}

// ==================== 批量处理 ====================

function handleBatch(batchRequest: AIBatchRequest): AIDecisionResult[] {
  const results: AIDecisionResult[] = [];
  
  // 更新市场缓存
  if (batchRequest.market) {
    handleUpdateMarket(batchRequest.market);
  }
  
  // 处理每个请求
  for (const request of batchRequest.requests) {
    let result: AIDecisionResult;
    
    switch (request.tier) {
      case 'fast':
        result = handleFastDecision(request);
        break;
      case 'standard':
        result = handleStandardDecision(request);
        break;
      case 'deep':
        result = handleDeepDecision(request);
        break;
      default:
        result = handleFastDecision(request);
    }
    
    results.push(result);
  }
  
  return results;
}

// ==================== 分析函数 ====================

/**
 * 分析价格趋势
 */
function analyzePriceTrend(
  goodsId: number,
  currentPrice: number,
  priceHistory: number[]
): PriceTrendAnalysis {
  if (priceHistory.length < 3) {
    return {
      goodsId,
      trend: 'stable',
      momentum: 0,
      volatility: 0,
      predictedPrice: currentPrice,
      confidence: 0.5,
    };
  }
  
  // 计算动量 (简单移动平均)
  const recent = priceHistory.slice(-5);
  const older = priceHistory.slice(-10, -5);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
  
  const momentum = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  
  // 计算波动率
  const mean = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
  const variance = priceHistory.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / priceHistory.length;
  const volatility = Math.sqrt(variance) / mean;
  
  // 趋势判断
  let trend: 'rising' | 'falling' | 'stable';
  if (momentum > 0.02) {
    trend = 'rising';
  } else if (momentum < -0.02) {
    trend = 'falling';
  } else {
    trend = 'stable';
  }
  
  // 简单预测
  const predictedPrice = currentPrice * (1 + momentum * 0.5);
  
  // 置信度基于波动率（波动越大置信度越低）
  const confidence = Math.max(0.2, Math.min(0.9, 1 - volatility * 2));
  
  return {
    goodsId,
    trend,
    momentum,
    volatility,
    predictedPrice,
    confidence,
  };
}

/**
 * 分析公司财务状况
 */
function analyzeFinancials(company: CompanyStateDTO): FinancialAnalysis {
  const { cash, totalAssets, totalLiabilities } = company;
  
  // 流动性比率
  const liquidityRatio = totalAssets > 0 ? cash / totalAssets : 0;
  
  // 负债比率
  const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
  
  // 利润率估算（基于现金和资产变化）
  const profitMargin = 0.1; // 简化处理
  
  // 增长潜力（基于现金充裕度和负债水平）
  const growthPotential = Math.max(0, Math.min(1, liquidityRatio * 2 - debtRatio));
  
  // 风险等级
  let riskLevel: 'low' | 'medium' | 'high';
  if (debtRatio > 0.7 || liquidityRatio < 0.1) {
    riskLevel = 'high';
  } else if (debtRatio > 0.4 || liquidityRatio < 0.2) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // 综合健康分数
  const healthScore = 
    liquidityRatio * 0.3 +
    (1 - debtRatio) * 0.3 +
    Math.min(1, totalAssets / 10000000) * 0.2 +
    growthPotential * 0.2;
  
  return {
    healthScore: Math.max(0, Math.min(1, healthScore)),
    liquidityRatio,
    debtRatio,
    profitMargin,
    growthPotential,
    riskLevel,
  };
}

/**
 * 计算紧急交易（Fast决策用）
 */
function computeUrgentTrades(
  company: CompanyStateDTO,
  market: MarketStateDTO
): AIDecisionDTO[] {
  const decisions: AIDecisionDTO[] = [];
  
  // 紧急卖出：价格暴跌中的商品
  for (const [goodsId, quantity] of company.inventories) {
    if (quantity < 10) continue;
    
    const goods = market.goods.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const trend = cachedPriceTrends.get(goodsId);
    
    // 价格快速下跌，紧急抛售
    if (trend && trend.momentum < -0.1 && trend.confidence > 0.6) {
      decisions.push({
        type: 'sell',
        goodsId,
        quantity: Math.floor(quantity * 0.5),
        price: goods.price * 0.95, // 略低于市场价快速成交
        priority: 1,
        confidence: trend.confidence,
        reason: `紧急卖出: 价格下跌${(trend.momentum * 100).toFixed(1)}%`,
      });
    }
  }
  
  // 紧急买入：生产必需品短缺
  // (这里简化处理，实际需要分析生产链)
  
  return decisions;
}

/**
 * 计算交易信号
 */
function computeTradeSignals(
  company: CompanyStateDTO,
  market: MarketStateDTO,
  financial: FinancialAnalysis
): TradeSignal[] {
  const signals: TradeSignal[] = [];
  
  for (const goods of market.goods) {
    const trend = cachedPriceTrends.get(goods.id);
    if (!trend) continue;
    
    const inventory = company.inventories.get(goods.id) || 0;
    const inventoryValue = inventory * goods.price;
    const inventoryRatio = company.totalAssets > 0 ? inventoryValue / company.totalAssets : 0;
    
    // 买入信号
    if (trend.trend === 'rising' && trend.momentum > 0.03 && inventoryRatio < 0.1) {
      signals.push({
        goodsId: goods.id,
        action: 'buy',
        strength: Math.min(1, trend.momentum * 10 + trend.confidence * 0.5),
        targetPrice: goods.price * 1.02,
        stopLoss: goods.price * 0.9,
        takeProfit: trend.predictedPrice,
      });
    }
    
    // 卖出信号
    if (trend.trend === 'falling' && inventory > 0 && inventoryRatio > 0.05) {
      signals.push({
        goodsId: goods.id,
        action: 'sell',
        strength: Math.min(1, -trend.momentum * 10 + trend.confidence * 0.5),
        targetPrice: goods.price * 0.98,
      });
    }
    
    // 持有信号（不添加到列表）
  }
  
  // 按强度排序
  signals.sort((a, b) => b.strength - a.strength);
  
  return signals.slice(0, 5); // 最多返回5个信号
}

/**
 * 计算最优交易（Deep决策用）
 */
function computeOptimalTrades(
  company: CompanyStateDTO,
  market: MarketStateDTO,
  financial: FinancialAnalysis
): AIDecisionDTO[] {
  const decisions: AIDecisionDTO[] = [];
  
  // 先获取信号
  const signals = computeTradeSignals(company, market, financial);
  
  // 可用于交易的现金（保留20%作为安全边际）
  const availableCash = company.cash * (financial.riskLevel === 'high' ? 0.5 : 0.8);
  
  let usedCash = 0;
  
  for (const signal of signals) {
    if (signal.action === 'buy' && signal.strength > 0.4) {
      const maxSpend = (availableCash - usedCash) * (signal.strength * 0.3);
      const quantity = Math.floor(maxSpend / signal.targetPrice);
      
      if (quantity > 0) {
        decisions.push({
          type: 'buy',
          goodsId: signal.goodsId,
          quantity,
          price: signal.targetPrice,
          priority: signal.strength,
          confidence: signal.strength,
          reason: `最优买入策略`,
        });
        usedCash += quantity * signal.targetPrice;
      }
    } else if (signal.action === 'sell' && signal.strength > 0.3) {
      const inventory = company.inventories.get(signal.goodsId) || 0;
      const sellQty = Math.floor(inventory * signal.strength * 0.5);
      
      if (sellQty > 0) {
        decisions.push({
          type: 'sell',
          goodsId: signal.goodsId,
          quantity: sellQty,
          price: signal.targetPrice,
          priority: signal.strength,
          confidence: signal.strength,
          reason: `最优卖出策略`,
        });
      }
    }
  }
  
  return decisions;
}

/**
 * 优化生产
 */
function optimizeProduction(
  company: CompanyStateDTO,
  market: MarketStateDTO,
  financial: FinancialAnalysis
): AIDecisionDTO[] {
  const decisions: AIDecisionDTO[] = [];
  
  // 分析每个建筑的生产效率
  for (const building of company.buildings) {
    if (!building.isActive) continue;
    
    // 检查是否需要升级
    if (building.efficiency < 0.7 && financial.healthScore > 0.5) {
      decisions.push({
        type: 'upgrade',
        buildingTypeId: building.typeId,
        priority: 0.6,
        confidence: 0.7,
        reason: `建筑效率低(${(building.efficiency * 100).toFixed(0)}%)，建议升级`,
      });
    }
  }
  
  return decisions;
}

/**
 * 寻找投资机会
 */
function findInvestmentOpportunities(
  company: CompanyStateDTO,
  market: MarketStateDTO,
  financial: FinancialAnalysis
): InvestmentOpportunity[] {
  const opportunities: InvestmentOpportunity[] = [];
  
  // 分析市场需求
  const highDemandGoods = market.goods
    .filter(g => g.demand > g.supply * 1.5)
    .sort((a, b) => (b.demand / b.supply) - (a.demand / a.supply));
  
  // 为高需求商品寻找生产机会
  for (const goods of highDemandGoods.slice(0, 3)) {
    // 简化：假设建筑类型ID = 商品ID / 10 (实际需要根据配方映射)
    const buildingTypeId = Math.floor(goods.id / 10) % 10;
    
    // 估算投资回报
    const buildCost = 500000; // 简化估算
    const monthlyRevenue = goods.price * 100 * 30; // 假设每天生产100个
    const expectedROI = monthlyRevenue / buildCost;
    const paybackPeriod = buildCost / (monthlyRevenue / 30);
    
    // 风险评估
    const trend = cachedPriceTrends.get(goods.id);
    const riskScore = trend ? (1 - trend.confidence) * 0.5 + (trend.volatility * 0.5) : 0.5;
    
    opportunities.push({
      type: 'build',
      buildingTypeId,
      recipeId: goods.id % 100, // 简化
      expectedROI,
      paybackPeriod,
      riskScore,
      capitalRequired: buildCost,
    });
  }
  
  // 按ROI排序
  opportunities.sort((a, b) => b.expectedROI - a.expectedROI);
  
  return opportunities.slice(0, 3);
}

/**
 * 优化定价
 */
function optimizePricing(
  company: CompanyStateDTO,
  market: MarketStateDTO
): AIDecisionDTO[] {
  const decisions: AIDecisionDTO[] = [];
  
  // 检查现有订单，调整价格
  for (const order of company.activeOrders) {
    if (order.remainingQuantity === 0) continue;
    
    const goods = market.goods.find(g => g.id === order.goodsId);
    if (!goods) continue;
    
    const trend = cachedPriceTrends.get(order.goodsId);
    
    // 卖单：如果价格太高导致难以成交
    if (!order.isBuy && order.price > goods.price * 1.1) {
      decisions.push({
        type: 'adjust_price',
        orderId: order.id,
        goodsId: order.goodsId,
        newPrice: goods.price * 1.02,
        priority: 0.5,
        confidence: 0.8,
        reason: `卖单价格过高，调整至市场价附近`,
      });
    }
    
    // 买单：如果价格太低导致无法买到
    if (order.isBuy && order.price < goods.price * 0.9 && trend?.trend === 'rising') {
      decisions.push({
        type: 'adjust_price',
        orderId: order.id,
        goodsId: order.goodsId,
        newPrice: goods.price * 0.98,
        priority: 0.5,
        confidence: 0.8,
        reason: `买单价格过低，市场上涨中，调整价格`,
      });
    }
  }
  
  return decisions;
}

// Worker入口
console.log('[AIWorker] 启动完成');