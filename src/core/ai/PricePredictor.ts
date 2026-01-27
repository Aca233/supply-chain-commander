/**
 * AI价格预测模块
 * 
 * 基于历史数据和市场指标预测未来价格走势
 * 
 * 设计目标：
 * 1. 预测短期（1-24tick）价格走势
 * 2. 识别价格拐点和趋势转换
 * 3. 计算最优买入/卖出时机
 * 4. 评估价格风险
 */

import { GameWorld, getPriceHistory } from '@/core/world/GameWorld';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, HISTORY_SIZE } from '@/core/constants';
import { ALL_GOODS } from '@/data/goods';
import { analyzePriceTrend, PriceTrendIndicators } from './PrecisionCalculator';

// ==================== 类型定义 ====================

/**
 * 价格预测结果
 */
export interface PricePrediction {
  goodsId: number;
  currentPrice: number;
  
  // 预测价格
  predictedPrice1h: number;       // 1小时后（1tick）
  predictedPrice6h: number;       // 6小时后（6tick）
  predictedPrice24h: number;      // 24小时后（24tick）
  
  // 置信区间
  confidence1h: number;           // 1h预测置信度 (0-1)
  confidence6h: number;           // 6h预测置信度 (0-1)
  confidence24h: number;          // 24h预测置信度 (0-1)
  
  // 价格区间（95%置信）
  priceRange24h: { low: number; high: number };
  
  // 方向预测
  direction: 'bullish' | 'bearish' | 'neutral';
  directionStrength: number;      // 0-1
  
  // 交易信号
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  signalScore: number;            // -100 to 100
}

/**
 * 技术指标集合
 */
export interface TechnicalIndicators {
  goodsId: number;
  
  // 移动平均
  sma5: number;
  sma10: number;
  sma20: number;
  ema5: number;
  ema10: number;
  ema20: number;
  
  // 动量指标
  rsi: number;                    // 相对强弱指数 (0-100)
  macd: number;                   // MACD
  macdSignal: number;             // MACD信号线
  macdHistogram: number;          // MACD柱状图
  
  // 波动指标
  atr: number;                    // 平均真实波幅
  bollingerUpper: number;         // 布林带上轨
  bollingerMiddle: number;        // 布林带中轨
  bollingerLower: number;         // 布林带下轨
  
  // 成交量指标（使用供需数据模拟）
  volumeTrend: number;            // 成交量趋势 (-1 to 1)
  
  // 供需指标
  supplyDemandRatio: number;      // 供需比
  supplyTrend: number;            // 供给趋势
  demandTrend: number;            // 需求趋势
}

/**
 * 价格拐点检测结果
 */
export interface TurningPointAnalysis {
  goodsId: number;
  
  // 拐点检测
  isNearTop: boolean;
  isNearBottom: boolean;
  turningProbability: number;     // 即将转向的概率 (0-1)
  
  // 支撑/阻力位
  supportLevels: number[];        // 支撑位
  resistanceLevels: number[];     // 阻力位
  nearestSupport: number;
  nearestResistance: number;
  
  // 突破概率
  breakoutUpProbability: number;
  breakoutDownProbability: number;
}

/**
 * 最优交易时机
 */
export interface OptimalTradingTime {
  goodsId: number;
  
  // 买入建议
  shouldBuyNow: boolean;
  buyUrgency: number;             // 0-1
  expectedBuyPrice: number;       // 预期买入价
  waitForBetterPrice: boolean;
  
  // 卖出建议
  shouldSellNow: boolean;
  sellUrgency: number;            // 0-1
  expectedSellPrice: number;      // 预期卖出价
  waitForBetterPrice_sell: boolean;
  
  // 持有建议
  holdReason: string;
}

// ==================== 技术指标计算 ====================

/**
 * 计算简单移动平均
 */
function calculateSMA(world: GameWorld, goodsId: number, periods: number): number {
  let sum = 0;
  let count = 0;
  
  for (let i = 0; i < periods && i < HISTORY_SIZE; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) {
      sum += price;
      count++;
    }
  }
  
  return count > 0 ? sum / count : world.goods.prices[goodsId];
}

/**
 * 计算指数移动平均
 */
function calculateEMA(world: GameWorld, goodsId: number, periods: number): number {
  const multiplier = 2 / (periods + 1);
  let ema = getPriceHistory(world, goodsId, periods - 1);
  
  if (ema <= 0) ema = world.goods.prices[goodsId];
  
  for (let i = periods - 2; i >= 0; i--) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) {
      ema = (price - ema) * multiplier + ema;
    }
  }
  
  return ema;
}

/**
 * 计算RSI（相对强弱指数）
 */
function calculateRSI(world: GameWorld, goodsId: number, periods: number = 14): number {
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < periods && i < HISTORY_SIZE - 1; i++) {
    const current = getPriceHistory(world, goodsId, i);
    const previous = getPriceHistory(world, goodsId, i + 1);
    
    if (current > 0 && previous > 0) {
      const change = current - previous;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
  }
  
  if (losses === 0) return 100;
  if (gains === 0) return 0;
  
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

/**
 * 计算MACD
 */
function calculateMACD(world: GameWorld, goodsId: number): {
  macd: number;
  signal: number;
  histogram: number;
} {
  const ema12 = calculateEMA(world, goodsId, 12);
  const ema26 = calculateEMA(world, goodsId, 26);
  const macd = ema12 - ema26;
  
  // 信号线（MACD的9期EMA）- 简化计算
  const signal = macd * 0.2 + calculateEMA(world, goodsId, 9) * 0.8 - world.goods.prices[goodsId] * 0.8;
  
  return {
    macd,
    signal: signal * 0.1,
    histogram: macd - signal * 0.1,
  };
}

/**
 * 计算ATR（平均真实波幅）
 */
function calculateATR(world: GameWorld, goodsId: number, periods: number = 14): number {
  let sumTR = 0;
  let count = 0;
  
  for (let i = 0; i < periods && i < HISTORY_SIZE - 1; i++) {
    const high = getPriceHistory(world, goodsId, i);
    const low = getPriceHistory(world, goodsId, i + 1);
    
    if (high > 0 && low > 0) {
      const tr = Math.abs(high - low);
      sumTR += tr;
      count++;
    }
  }
  
  return count > 0 ? sumTR / count : world.goods.prices[goodsId] * 0.05;
}

/**
 * 计算布林带
 */
function calculateBollingerBands(world: GameWorld, goodsId: number, periods: number = 20): {
  upper: number;
  middle: number;
  lower: number;
} {
  const sma = calculateSMA(world, goodsId, periods);
  
  // 计算标准差
  let sumSq = 0;
  let count = 0;
  
  for (let i = 0; i < periods && i < HISTORY_SIZE; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) {
      sumSq += Math.pow(price - sma, 2);
      count++;
    }
  }
  
  const stdDev = count > 1 ? Math.sqrt(sumSq / (count - 1)) : sma * 0.05;
  
  return {
    upper: sma + 2 * stdDev,
    middle: sma,
    lower: sma - 2 * stdDev,
  };
}

/**
 * 计算完整技术指标
 */
export function calculateTechnicalIndicators(
  world: GameWorld,
  goodsId: number
): TechnicalIndicators {
  // 移动平均
  const sma5 = calculateSMA(world, goodsId, 5);
  const sma10 = calculateSMA(world, goodsId, 10);
  const sma20 = calculateSMA(world, goodsId, 20);
  const ema5 = calculateEMA(world, goodsId, 5);
  const ema10 = calculateEMA(world, goodsId, 10);
  const ema20 = calculateEMA(world, goodsId, 20);
  
  // 动量指标
  const rsi = calculateRSI(world, goodsId, 14);
  const macdData = calculateMACD(world, goodsId);
  
  // 波动指标
  const atr = calculateATR(world, goodsId, 14);
  const bollinger = calculateBollingerBands(world, goodsId, 20);
  
  // 供需指标
  const supply = world.goods.supplies[goodsId];
  const demand = world.goods.demands[goodsId];
  const supplyDemandRatio = demand > 0 ? supply / demand : 2;
  
  // 成交量趋势（使用供需变化模拟）
  const volumeTrend = Math.max(-1, Math.min(1, (demand - supply) / Math.max(1, demand + supply)));
  
  // 供需趋势（简化）
  const supplyTrend = 0; // TODO: 跟踪历史供给
  const demandTrend = 0; // TODO: 跟踪历史需求
  
  return {
    goodsId,
    sma5,
    sma10,
    sma20,
    ema5,
    ema10,
    ema20,
    rsi,
    macd: macdData.macd,
    macdSignal: macdData.signal,
    macdHistogram: macdData.histogram,
    atr,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    volumeTrend,
    supplyDemandRatio,
    supplyTrend,
    demandTrend,
  };
}

// ==================== 价格预测 ====================

/**
 * 基于技术指标预测价格
 */
export function predictPrice(
  world: GameWorld,
  goodsId: number
): PricePrediction {
  const currentPrice = world.goods.prices[goodsId];
  const indicators = calculateTechnicalIndicators(world, goodsId);
  const trend = analyzePriceTrend(world, goodsId);
  
  // 基于多种方法的预测
  const predictions = {
    ma: predictFromMA(currentPrice, indicators),
    momentum: predictFromMomentum(currentPrice, trend, indicators),
    meanReversion: predictFromMeanReversion(world, goodsId, currentPrice, indicators),
    supplyDemand: predictFromSupplyDemand(currentPrice, indicators),
  };
  
  // 加权平均预测
  const weights = {
    ma: 0.3,
    momentum: 0.25,
    meanReversion: 0.25,
    supplyDemand: 0.2,
  };
  
  const predictedPrice1h = 
    predictions.ma.price1h * weights.ma +
    predictions.momentum.price1h * weights.momentum +
    predictions.meanReversion.price1h * weights.meanReversion +
    predictions.supplyDemand.price1h * weights.supplyDemand;
  
  const predictedPrice6h = 
    predictions.ma.price6h * weights.ma +
    predictions.momentum.price6h * weights.momentum +
    predictions.meanReversion.price6h * weights.meanReversion +
    predictions.supplyDemand.price6h * weights.supplyDemand;
  
  const predictedPrice24h = 
    predictions.ma.price24h * weights.ma +
    predictions.momentum.price24h * weights.momentum +
    predictions.meanReversion.price24h * weights.meanReversion +
    predictions.supplyDemand.price24h * weights.supplyDemand;
  
  // 计算置信度（基于波动率和趋势一致性）
  const volatilityFactor = 1 - Math.min(1, indicators.atr / currentPrice);
  const trendConsistency = calculateTrendConsistency(predictions);
  
  const confidence1h = Math.min(0.95, 0.5 + volatilityFactor * 0.3 + trendConsistency * 0.2);
  const confidence6h = Math.min(0.85, 0.4 + volatilityFactor * 0.25 + trendConsistency * 0.15);
  const confidence24h = Math.min(0.75, 0.3 + volatilityFactor * 0.2 + trendConsistency * 0.1);
  
  // 计算价格区间
  const priceRange24h = {
    low: predictedPrice24h - indicators.atr * 2,
    high: predictedPrice24h + indicators.atr * 2,
  };
  
  // 判断方向
  const priceChange24h = (predictedPrice24h - currentPrice) / currentPrice;
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let directionStrength = 0;
  
  if (priceChange24h > 0.02) {
    direction = 'bullish';
    directionStrength = Math.min(1, priceChange24h * 10);
  } else if (priceChange24h < -0.02) {
    direction = 'bearish';
    directionStrength = Math.min(1, -priceChange24h * 10);
  } else {
    directionStrength = 0;
  }
  
  // 生成交易信号
  const { signal, signalScore } = generateTradingSignal(
    indicators,
    trend,
    priceChange24h,
    direction
  );
  
  return {
    goodsId,
    currentPrice,
    predictedPrice1h,
    predictedPrice6h,
    predictedPrice24h,
    confidence1h,
    confidence6h,
    confidence24h,
    priceRange24h,
    direction,
    directionStrength,
    signal,
    signalScore,
  };
}

/**
 * 基于移动平均预测
 */
function predictFromMA(
  currentPrice: number,
  indicators: TechnicalIndicators
): { price1h: number; price6h: number; price24h: number } {
  // 短期跟随EMA5，中期跟随SMA10，长期跟随SMA20
  const maGap = indicators.ema5 - indicators.sma20;
  const momentum = maGap / indicators.sma20;
  
  return {
    price1h: currentPrice + momentum * currentPrice * 0.1,
    price6h: currentPrice + momentum * currentPrice * 0.3,
    price24h: (indicators.ema5 + indicators.sma10) / 2,
  };
}

/**
 * 基于动量预测
 */
function predictFromMomentum(
  currentPrice: number,
  trend: PriceTrendIndicators,
  indicators: TechnicalIndicators
): { price1h: number; price6h: number; price24h: number } {
  // 使用RSI和MACD判断动量
  const rsiMomentum = (indicators.rsi - 50) / 100; // -0.5 to 0.5
  const macdMomentum = indicators.macdHistogram / currentPrice * 10;
  
  const combinedMomentum = (rsiMomentum + macdMomentum + trend.momentum) / 3;
  
  return {
    price1h: currentPrice * (1 + combinedMomentum * 0.02),
    price6h: currentPrice * (1 + combinedMomentum * 0.05),
    price24h: currentPrice * (1 + combinedMomentum * 0.1),
  };
}

/**
 * 基于均值回归预测
 */
function predictFromMeanReversion(
  world: GameWorld,
  goodsId: number,
  currentPrice: number,
  indicators: TechnicalIndicators
): { price1h: number; price6h: number; price24h: number } {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const basePrice = goods?.basePrice || currentPrice;
  
  // 价格偏离程度
  const deviation = (currentPrice - basePrice) / basePrice;
  
  // 回归力度
  const reversionStrength = Math.min(0.1, Math.abs(deviation) * 0.2);
  const reversionDirection = deviation > 0 ? -1 : 1;
  
  return {
    price1h: currentPrice * (1 + reversionDirection * reversionStrength * 0.1),
    price6h: currentPrice * (1 + reversionDirection * reversionStrength * 0.3),
    price24h: currentPrice * (1 + reversionDirection * reversionStrength * 0.5),
  };
}

/**
 * 基于供需预测
 */
function predictFromSupplyDemand(
  currentPrice: number,
  indicators: TechnicalIndicators
): { price1h: number; price6h: number; price24h: number } {
  // 供需失衡程度
  const imbalance = 1 - indicators.supplyDemandRatio;
  const priceImpact = imbalance * 0.1;
  
  return {
    price1h: currentPrice * (1 + priceImpact * 0.2),
    price6h: currentPrice * (1 + priceImpact * 0.5),
    price24h: currentPrice * (1 + priceImpact * 0.8),
  };
}

/**
 * 计算预测一致性
 */
function calculateTrendConsistency(predictions: {
  ma: { price24h: number };
  momentum: { price24h: number };
  meanReversion: { price24h: number };
  supplyDemand: { price24h: number };
}): number {
  const values = [
    predictions.ma.price24h,
    predictions.momentum.price24h,
    predictions.meanReversion.price24h,
    predictions.supplyDemand.price24h,
  ];
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / mean; // 变异系数
  
  return Math.max(0, 1 - cv * 10);
}

/**
 * 生成交易信号
 */
function generateTradingSignal(
  indicators: TechnicalIndicators,
  trend: PriceTrendIndicators,
  priceChange24h: number,
  direction: 'bullish' | 'bearish' | 'neutral'
): { signal: PricePrediction['signal']; signalScore: number } {
  let score = 0;
  
  // RSI信号 (-30 to 30)
  if (indicators.rsi < 30) {
    score += 30 - indicators.rsi; // 超卖，买入信号
  } else if (indicators.rsi > 70) {
    score -= indicators.rsi - 70; // 超买，卖出信号
  }
  
  // MACD信号 (-20 to 20)
  if (indicators.macdHistogram > 0) {
    score += Math.min(20, indicators.macdHistogram * 100);
  } else {
    score += Math.max(-20, indicators.macdHistogram * 100);
  }
  
  // 布林带位置 (-20 to 20)
  const currentPrice = indicators.sma5; // 近似当前价格
  const bbPosition = (currentPrice - indicators.bollingerLower) / 
    (indicators.bollingerUpper - indicators.bollingerLower);
  
  if (bbPosition < 0.2) {
    score += 20 * (0.2 - bbPosition) * 5;
  } else if (bbPosition > 0.8) {
    score -= 20 * (bbPosition - 0.8) * 5;
  }
  
  // 供需信号 (-15 to 15)
  if (indicators.supplyDemandRatio < 0.8) {
    score += 15 * (1 - indicators.supplyDemandRatio);
  } else if (indicators.supplyDemandRatio > 1.2) {
    score -= 15 * (indicators.supplyDemandRatio - 1);
  }
  
  // 趋势方向 (-15 to 15)
  if (direction === 'bullish') {
    score += 15 * priceChange24h * 10;
  } else if (direction === 'bearish') {
    score += 15 * priceChange24h * 10; // 负数
  }
  
  // 限制范围
  score = Math.max(-100, Math.min(100, score));
  
  // 转换为信号
  let signal: PricePrediction['signal'];
  if (score >= 50) {
    signal = 'strong_buy';
  } else if (score >= 20) {
    signal = 'buy';
  } else if (score <= -50) {
    signal = 'strong_sell';
  } else if (score <= -20) {
    signal = 'sell';
  } else {
    signal = 'hold';
  }
  
  return { signal, signalScore: score };
}

// ==================== 拐点检测 ====================

/**
 * 检测价格拐点
 */
export function detectTurningPoints(
  world: GameWorld,
  goodsId: number
): TurningPointAnalysis {
  const currentPrice = world.goods.prices[goodsId];
  const indicators = calculateTechnicalIndicators(world, goodsId);
  
  // 检测顶部信号
  const isNearTop = 
    indicators.rsi > 70 ||
    currentPrice > indicators.bollingerUpper * 0.98 ||
    (indicators.macdHistogram < 0 && indicators.macd > 0);
  
  // 检测底部信号
  const isNearBottom = 
    indicators.rsi < 30 ||
    currentPrice < indicators.bollingerLower * 1.02 ||
    (indicators.macdHistogram > 0 && indicators.macd < 0);
  
  // 转向概率
  let turningProbability = 0;
  if (isNearTop) {
    turningProbability = Math.min(0.8, (indicators.rsi - 70) / 30 * 0.5 + 0.3);
  } else if (isNearBottom) {
    turningProbability = Math.min(0.8, (30 - indicators.rsi) / 30 * 0.5 + 0.3);
  }
  
  // 计算支撑/阻力位
  const { supportLevels, resistanceLevels } = findSupportResistance(world, goodsId);
  
  const nearestSupport = supportLevels.filter(s => s < currentPrice)
    .reduce((a, b) => b > a ? b : a, 0);
  const nearestResistance = resistanceLevels.filter(r => r > currentPrice)
    .reduce((a, b) => b < a ? b : a, currentPrice * 2);
  
  // 突破概率
  const priceToResistance = (nearestResistance - currentPrice) / currentPrice;
  const priceToSupport = (currentPrice - nearestSupport) / currentPrice;
  
  const breakoutUpProbability = priceToResistance < 0.02 && indicators.rsi > 60 ? 0.6 : 0.2;
  const breakoutDownProbability = priceToSupport < 0.02 && indicators.rsi < 40 ? 0.6 : 0.2;
  
  return {
    goodsId,
    isNearTop,
    isNearBottom,
    turningProbability,
    supportLevels,
    resistanceLevels,
    nearestSupport,
    nearestResistance,
    breakoutUpProbability,
    breakoutDownProbability,
  };
}

/**
 * 查找支撑和阻力位
 */
function findSupportResistance(
  world: GameWorld,
  goodsId: number
): { supportLevels: number[]; resistanceLevels: number[] } {
  const prices: number[] = [];
  
  // 收集历史价格
  for (let i = 0; i < 60 && i < HISTORY_SIZE; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) prices.push(price);
  }
  
  if (prices.length < 5) {
    const current = world.goods.prices[goodsId];
    return {
      supportLevels: [current * 0.9, current * 0.8],
      resistanceLevels: [current * 1.1, current * 1.2],
    };
  }
  
  // 找局部极值点
  const extremes: { price: number; type: 'high' | 'low' }[] = [];
  
  for (let i = 2; i < prices.length - 2; i++) {
    const isLocalHigh = prices[i] > prices[i-1] && prices[i] > prices[i-2] &&
                        prices[i] > prices[i+1] && prices[i] > prices[i+2];
    const isLocalLow = prices[i] < prices[i-1] && prices[i] < prices[i-2] &&
                       prices[i] < prices[i+1] && prices[i] < prices[i+2];
    
    if (isLocalHigh) extremes.push({ price: prices[i], type: 'high' });
    if (isLocalLow) extremes.push({ price: prices[i], type: 'low' });
  }
  
  // 聚类极值点
  const supportLevels = clusterPrices(
    extremes.filter(e => e.type === 'low').map(e => e.price)
  );
  const resistanceLevels = clusterPrices(
    extremes.filter(e => e.type === 'high').map(e => e.price)
  );
  
  return { supportLevels, resistanceLevels };
}

/**
 * 聚类价格点
 */
function clusterPrices(prices: number[]): number[] {
  if (prices.length === 0) return [];
  
  prices.sort((a, b) => a - b);
  
  const clusters: number[] = [];
  let currentCluster: number[] = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    const diff = (prices[i] - prices[i-1]) / prices[i-1];
    if (diff < 0.02) {
      currentCluster.push(prices[i]);
    } else {
      clusters.push(currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length);
      currentCluster = [prices[i]];
    }
  }
  
  clusters.push(currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length);
  
  return clusters.slice(0, 5); // 最多返回5个
}

// ==================== 最优交易时机 ====================

/**
 * 计算最优交易时机
 */
export function calculateOptimalTradingTime(
  world: GameWorld,
  goodsId: number
): OptimalTradingTime {
  const prediction = predictPrice(world, goodsId);
  const turning = detectTurningPoints(world, goodsId);
  const indicators = calculateTechnicalIndicators(world, goodsId);
  
  // 买入分析
  const shouldBuyNow = 
    prediction.signal === 'strong_buy' ||
    (prediction.signal === 'buy' && turning.isNearBottom);
  
  const buyUrgency = shouldBuyNow 
    ? Math.min(1, (prediction.signalScore + 100) / 150)
    : 0;
  
  const expectedBuyPrice = turning.isNearBottom 
    ? prediction.currentPrice * 0.98
    : prediction.predictedPrice6h;
  
  const waitForBetterPrice = 
    !turning.isNearBottom && 
    prediction.direction === 'bearish' &&
    prediction.currentPrice > turning.nearestSupport * 1.05;
  
  // 卖出分析
  const shouldSellNow = 
    prediction.signal === 'strong_sell' ||
    (prediction.signal === 'sell' && turning.isNearTop);
  
  const sellUrgency = shouldSellNow 
    ? Math.min(1, (-prediction.signalScore + 100) / 150)
    : 0;
  
  const expectedSellPrice = turning.isNearTop 
    ? prediction.currentPrice * 1.02
    : prediction.predictedPrice6h;
  
  const waitForBetterPrice_sell = 
    !turning.isNearTop && 
    prediction.direction === 'bullish' &&
    prediction.currentPrice < turning.nearestResistance * 0.95;
  
  // 持有原因
  let holdReason = '';
  if (!shouldBuyNow && !shouldSellNow) {
    if (prediction.signal === 'hold') {
      holdReason = '市场波动区间，等待明确信号';
    } else if (waitForBetterPrice) {
      holdReason = '预期价格将下跌，等待更好买入机会';
    } else if (waitForBetterPrice_sell) {
      holdReason = '预期价格将上涨，等待更好卖出机会';
    }
  }
  
  return {
    goodsId,
    shouldBuyNow,
    buyUrgency,
    expectedBuyPrice,
    waitForBetterPrice,
    shouldSellNow,
    sellUrgency,
    expectedSellPrice,
    waitForBetterPrice_sell,
    holdReason,
  };
}

// ==================== 批量预测接口 ====================

/**
 * 批量预测所有商品价格
 */
export function predictAllPrices(world: GameWorld): Map<number, PricePrediction> {
  const predictions = new Map<number, PricePrediction>();
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    // 只预测有活跃交易的商品
    if (world.goods.supplies[goodsId] > 0 || world.goods.demands[goodsId] > 0) {
      predictions.set(goodsId, predictPrice(world, goodsId));
    }
  }
  
  return predictions;
}

/**
 * 获取最佳买入机会（按信号强度排序）
 */
export function getBestBuyOpportunities(
  world: GameWorld,
  limit: number = 10
): PricePrediction[] {
  const predictions = predictAllPrices(world);
  
  return Array.from(predictions.values())
    .filter(p => p.signal === 'buy' || p.signal === 'strong_buy')
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, limit);
}

/**
 * 获取最佳卖出机会（按信号强度排序）
 */
export function getBestSellOpportunities(
  world: GameWorld,
  limit: number = 10
): PricePrediction[] {
  const predictions = predictAllPrices(world);
  
  return Array.from(predictions.values())
    .filter(p => p.signal === 'sell' || p.signal === 'strong_sell')
    .sort((a, b) => a.signalScore - b.signalScore)
    .slice(0, limit);
}