/**
 * 全局技术指标缓存系统
 * 
 * 解决问题：每个AI公司独立计算相同商品的技术指标，导致大量重复计算
 * 方案：每tick开始时预计算所有活跃商品的指标，供所有AI共享
 * 
 * 预期效果：技术指标计算从 O(公司数×商品数) 降到 O(商品数)
 * 如果有20个AI公司，计算量减少95%
 */

import { GameWorld, getPriceHistory } from '@/core/world/GameWorld';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, HISTORY_SIZE } from '@/core/constants';
import { ALL_GOODS } from '@/data/goods';
import { analyzePriceTrend, PriceTrendIndicators } from './PrecisionCalculator';

// ==================== 类型定义 ====================

/**
 * 技术指标（与PricePredictor中相同，但这里是缓存版本）
 */
export interface CachedTechnicalIndicators {
  goodsId: number;
  
  // 移动平均
  sma5: number;
  sma10: number;
  sma20: number;
  ema5: number;
  ema10: number;
  ema20: number;
  
  // 动量指标
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  
  // 波动指标
  atr: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  
  // 成交量指标
  volumeTrend: number;
  
  // 供需指标
  supplyDemandRatio: number;
  supplyTrend: number;
  demandTrend: number;
}

/**
 * 缓存的价格预测结果
 */
export interface CachedPricePrediction {
  goodsId: number;
  currentPrice: number;
  
  // 预测价格
  predictedPrice1h: number;
  predictedPrice6h: number;
  predictedPrice24h: number;
  
  // 置信区间
  confidence1h: number;
  confidence6h: number;
  confidence24h: number;
  
  // 价格区间
  priceRange24h: { low: number; high: number };
  
  // 方向预测
  direction: 'bullish' | 'bearish' | 'neutral';
  directionStrength: number;
  
  // 交易信号
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  signalScore: number;
}

/**
 * 缓存的拐点分析
 */
export interface CachedTurningPoint {
  goodsId: number;
  isNearTop: boolean;
  isNearBottom: boolean;
  turningProbability: number;
  nearestSupport: number;
  nearestResistance: number;
  breakoutUpProbability: number;
  breakoutDownProbability: number;
}

/**
 * 缓存的最优交易时机
 */
export interface CachedTradingTime {
  goodsId: number;
  shouldBuyNow: boolean;
  buyUrgency: number;
  expectedBuyPrice: number;
  waitForBetterPrice: boolean;
  shouldSellNow: boolean;
  sellUrgency: number;
  expectedSellPrice: number;
  waitForBetterPrice_sell: boolean;
  holdReason: string;
}

/**
 * 全局缓存结构
 */
interface GlobalIndicatorCache {
  tick: number;
  indicators: Map<number, CachedTechnicalIndicators>;
  predictions: Map<number, CachedPricePrediction>;
  turningPoints: Map<number, CachedTurningPoint>;
  tradingTimes: Map<number, CachedTradingTime>;
  trends: Map<number, PriceTrendIndicators>;
  activeGoods: Set<number>;
  computeTimeMs: number;
}

// ==================== 指标计算函数（优化版） ====================

/**
 * 批量计算SMA - 复用中间结果
 */
function calculateBatchSMA(
  world: GameWorld,
  goodsId: number
): { sma5: number; sma10: number; sma20: number } {
  let sum5 = 0, sum10 = 0, sum20 = 0;
  let count5 = 0, count10 = 0, count20 = 0;
  
  for (let i = 0; i < 20 && i < HISTORY_SIZE; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) {
      if (i < 5) { sum5 += price; count5++; }
      if (i < 10) { sum10 += price; count10++; }
      sum20 += price; count20++;
    }
  }
  
  const fallback = world.goods.prices[goodsId];
  return {
    sma5: count5 > 0 ? sum5 / count5 : fallback,
    sma10: count10 > 0 ? sum10 / count10 : fallback,
    sma20: count20 > 0 ? sum20 / count20 : fallback,
  };
}

/**
 * 批量计算EMA
 */
function calculateBatchEMA(
  world: GameWorld,
  goodsId: number
): { ema5: number; ema10: number; ema20: number } {
  const currentPrice = world.goods.prices[goodsId];
  
  // 简化EMA计算 - 使用近似公式
  const prices: number[] = [];
  for (let i = 0; i < 20 && i < HISTORY_SIZE; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) prices.push(price);
  }
  
  if (prices.length === 0) {
    return { ema5: currentPrice, ema10: currentPrice, ema20: currentPrice };
  }
  
  // 快速EMA计算
  const calcEMA = (periods: number): number => {
    const mult = 2 / (periods + 1);
    let ema = prices[Math.min(periods - 1, prices.length - 1)];
    
    for (let i = Math.min(periods - 2, prices.length - 2); i >= 0; i--) {
      ema = (prices[i] - ema) * mult + ema;
    }
    return ema;
  };
  
  return {
    ema5: calcEMA(5),
    ema10: calcEMA(10),
    ema20: calcEMA(20),
  };
}

/**
 * 计算RSI
 */
function calculateRSI(world: GameWorld, goodsId: number): number {
  let gains = 0, losses = 0;
  const periods = 14;
  
  for (let i = 0; i < periods && i < HISTORY_SIZE - 1; i++) {
    const current = getPriceHistory(world, goodsId, i);
    const previous = getPriceHistory(world, goodsId, i + 1);
    
    if (current > 0 && previous > 0) {
      const change = current - previous;
      if (change > 0) gains += change;
      else losses -= change;
    }
  }
  
  if (losses === 0) return 100;
  if (gains === 0) return 0;
  
  return 100 - (100 / (1 + gains / losses));
}

/**
 * 计算MACD
 */
function calculateMACD(
  ema5: number,
  ema10: number,
  ema20: number,
  currentPrice: number
): { macd: number; macdSignal: number; macdHistogram: number } {
  // 简化MACD：使用EMA差值
  const ema12_approx = (ema5 + ema10) / 2;
  const ema26_approx = ema20;
  const macd = ema12_approx - ema26_approx;
  
  // 信号线近似
  const signal = macd * 0.2;
  
  return {
    macd,
    macdSignal: signal,
    macdHistogram: macd - signal,
  };
}

/**
 * 计算ATR
 */
function calculateATR(world: GameWorld, goodsId: number): number {
  let sumTR = 0;
  let count = 0;
  
  for (let i = 0; i < 14 && i < HISTORY_SIZE - 1; i++) {
    const high = getPriceHistory(world, goodsId, i);
    const low = getPriceHistory(world, goodsId, i + 1);
    
    if (high > 0 && low > 0) {
      sumTR += Math.abs(high - low);
      count++;
    }
  }
  
  return count > 0 ? sumTR / count : world.goods.prices[goodsId] * 0.05;
}

/**
 * 计算布林带
 */
function calculateBollingerBands(
  sma20: number,
  world: GameWorld,
  goodsId: number
): { upper: number; middle: number; lower: number } {
  let sumSq = 0;
  let count = 0;
  
  for (let i = 0; i < 20 && i < HISTORY_SIZE; i++) {
    const price = getPriceHistory(world, goodsId, i);
    if (price > 0) {
      sumSq += Math.pow(price - sma20, 2);
      count++;
    }
  }
  
  const stdDev = count > 1 ? Math.sqrt(sumSq / (count - 1)) : sma20 * 0.05;
  
  return {
    upper: sma20 + 2 * stdDev,
    middle: sma20,
    lower: sma20 - 2 * stdDev,
  };
}

/**
 * 批量计算单个商品的所有技术指标
 */
function calculateAllIndicators(
  world: GameWorld,
  goodsId: number
): CachedTechnicalIndicators {
  const currentPrice = world.goods.prices[goodsId];
  
  // 批量计算移动平均
  const smas = calculateBatchSMA(world, goodsId);
  const emas = calculateBatchEMA(world, goodsId);
  
  // 动量指标
  const rsi = calculateRSI(world, goodsId);
  const macdData = calculateMACD(emas.ema5, emas.ema10, emas.ema20, currentPrice);
  
  // 波动指标
  const atr = calculateATR(world, goodsId);
  const bollinger = calculateBollingerBands(smas.sma20, world, goodsId);
  
  // 供需指标
  const supply = world.goods.supplies[goodsId];
  const demand = world.goods.demands[goodsId];
  const supplyDemandRatio = demand > 0 ? supply / demand : 2;
  const volumeTrend = Math.max(-1, Math.min(1, (demand - supply) / Math.max(1, demand + supply)));
  
  return {
    goodsId,
    ...smas,
    ...emas,
    rsi,
    ...macdData,
    atr,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    volumeTrend,
    supplyDemandRatio,
    supplyTrend: 0,
    demandTrend: 0,
  };
}

/**
 * 基于指标生成价格预测
 */
function generatePrediction(
  world: GameWorld,
  goodsId: number,
  indicators: CachedTechnicalIndicators,
  trend: PriceTrendIndicators
): CachedPricePrediction {
  const currentPrice = world.goods.prices[goodsId];
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const basePrice = goods?.basePrice || currentPrice;
  
  // 多方法预测
  // 1. MA预测
  const maGap = indicators.ema5 - indicators.sma20;
  const maMomentum = maGap / indicators.sma20;
  const maPredict = {
    price1h: currentPrice + maMomentum * currentPrice * 0.1,
    price6h: currentPrice + maMomentum * currentPrice * 0.3,
    price24h: (indicators.ema5 + indicators.sma10) / 2,
  };
  
  // 2. 动量预测
  const rsiMomentum = (indicators.rsi - 50) / 100;
  const macdMomentum = indicators.macdHistogram / currentPrice * 10;
  const combinedMomentum = (rsiMomentum + macdMomentum + trend.momentum) / 3;
  const momentumPredict = {
    price1h: currentPrice * (1 + combinedMomentum * 0.02),
    price6h: currentPrice * (1 + combinedMomentum * 0.05),
    price24h: currentPrice * (1 + combinedMomentum * 0.1),
  };
  
  // 3. 均值回归
  const deviation = (currentPrice - basePrice) / basePrice;
  const reversionStrength = Math.min(0.1, Math.abs(deviation) * 0.2);
  const reversionDirection = deviation > 0 ? -1 : 1;
  const reversionPredict = {
    price1h: currentPrice * (1 + reversionDirection * reversionStrength * 0.1),
    price6h: currentPrice * (1 + reversionDirection * reversionStrength * 0.3),
    price24h: currentPrice * (1 + reversionDirection * reversionStrength * 0.5),
  };
  
  // 4. 供需预测
  const imbalance = 1 - indicators.supplyDemandRatio;
  const priceImpact = imbalance * 0.1;
  const sdPredict = {
    price1h: currentPrice * (1 + priceImpact * 0.2),
    price6h: currentPrice * (1 + priceImpact * 0.5),
    price24h: currentPrice * (1 + priceImpact * 0.8),
  };
  
  // 加权平均
  const weights = { ma: 0.3, momentum: 0.25, reversion: 0.25, sd: 0.2 };
  
  const predictedPrice1h = 
    maPredict.price1h * weights.ma +
    momentumPredict.price1h * weights.momentum +
    reversionPredict.price1h * weights.reversion +
    sdPredict.price1h * weights.sd;
  
  const predictedPrice6h = 
    maPredict.price6h * weights.ma +
    momentumPredict.price6h * weights.momentum +
    reversionPredict.price6h * weights.reversion +
    sdPredict.price6h * weights.sd;
  
  const predictedPrice24h = 
    maPredict.price24h * weights.ma +
    momentumPredict.price24h * weights.momentum +
    reversionPredict.price24h * weights.reversion +
    sdPredict.price24h * weights.sd;
  
  // 置信度计算
  const volatilityFactor = 1 - Math.min(1, indicators.atr / currentPrice);
  
  // 方向判断
  const priceChange24h = (predictedPrice24h - currentPrice) / currentPrice;
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let directionStrength = 0;
  
  if (priceChange24h > 0.02) {
    direction = 'bullish';
    directionStrength = Math.min(1, priceChange24h * 10);
  } else if (priceChange24h < -0.02) {
    direction = 'bearish';
    directionStrength = Math.min(1, -priceChange24h * 10);
  }
  
  // 交易信号
  let score = 0;
  
  if (indicators.rsi < 30) score += 30 - indicators.rsi;
  else if (indicators.rsi > 70) score -= indicators.rsi - 70;
  
  if (indicators.macdHistogram > 0) score += Math.min(20, indicators.macdHistogram * 100);
  else score += Math.max(-20, indicators.macdHistogram * 100);
  
  const bbPosition = (indicators.sma5 - indicators.bollingerLower) / 
    (indicators.bollingerUpper - indicators.bollingerLower);
  if (bbPosition < 0.2) score += 20 * (0.2 - bbPosition) * 5;
  else if (bbPosition > 0.8) score -= 20 * (bbPosition - 0.8) * 5;
  
  if (indicators.supplyDemandRatio < 0.8) score += 15 * (1 - indicators.supplyDemandRatio);
  else if (indicators.supplyDemandRatio > 1.2) score -= 15 * (indicators.supplyDemandRatio - 1);
  
  if (direction === 'bullish') score += 15 * priceChange24h * 10;
  else if (direction === 'bearish') score += 15 * priceChange24h * 10;
  
  score = Math.max(-100, Math.min(100, score));
  
  let signal: CachedPricePrediction['signal'];
  if (score >= 50) signal = 'strong_buy';
  else if (score >= 20) signal = 'buy';
  else if (score <= -50) signal = 'strong_sell';
  else if (score <= -20) signal = 'sell';
  else signal = 'hold';
  
  return {
    goodsId,
    currentPrice,
    predictedPrice1h,
    predictedPrice6h,
    predictedPrice24h,
    confidence1h: Math.min(0.95, 0.5 + volatilityFactor * 0.3),
    confidence6h: Math.min(0.85, 0.4 + volatilityFactor * 0.25),
    confidence24h: Math.min(0.75, 0.3 + volatilityFactor * 0.2),
    priceRange24h: {
      low: predictedPrice24h - indicators.atr * 2,
      high: predictedPrice24h + indicators.atr * 2,
    },
    direction,
    directionStrength,
    signal,
    signalScore: score,
  };
}

/**
 * 生成拐点分析
 */
function generateTurningPoint(
  indicators: CachedTechnicalIndicators,
  currentPrice: number
): CachedTurningPoint {
  const isNearTop = 
    indicators.rsi > 70 ||
    currentPrice > indicators.bollingerUpper * 0.98 ||
    (indicators.macdHistogram < 0 && indicators.macd > 0);
  
  const isNearBottom = 
    indicators.rsi < 30 ||
    currentPrice < indicators.bollingerLower * 1.02 ||
    (indicators.macdHistogram > 0 && indicators.macd < 0);
  
  let turningProbability = 0;
  if (isNearTop) {
    turningProbability = Math.min(0.8, (indicators.rsi - 70) / 30 * 0.5 + 0.3);
  } else if (isNearBottom) {
    turningProbability = Math.min(0.8, (30 - indicators.rsi) / 30 * 0.5 + 0.3);
  }
  
  // 简化支撑/阻力位计算
  const nearestSupport = currentPrice * 0.95;
  const nearestResistance = currentPrice * 1.05;
  
  return {
    goodsId: indicators.goodsId,
    isNearTop,
    isNearBottom,
    turningProbability,
    nearestSupport,
    nearestResistance,
    breakoutUpProbability: isNearTop ? 0.2 : 0.5,
    breakoutDownProbability: isNearBottom ? 0.2 : 0.5,
  };
}

/**
 * 生成交易时机建议
 */
function generateTradingTime(
  prediction: CachedPricePrediction,
  turning: CachedTurningPoint,
  indicators: CachedTechnicalIndicators
): CachedTradingTime {
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
    goodsId: prediction.goodsId,
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

// ==================== 简化分析辅助函数 ====================

/**
 * 创建简化的趋势分析（用于低活跃度商品）
 */
function createSimpleTrend(world: GameWorld, goodsId: number, currentPrice: number): PriceTrendIndicators {
  // 获取最近几个价格点计算简单趋势
  const price1 = getPriceHistory(world, goodsId, 0) || currentPrice;
  const price5 = getPriceHistory(world, goodsId, 4) || currentPrice;
  
  const change = price1 - price5;
  const changePercent = price5 > 0 ? change / price5 : 0;
  
  // 确定趋势方向
  let trend: 'up' | 'down' | 'sideways' = 'sideways';
  if (changePercent > 0.02) trend = 'up';
  else if (changePercent < -0.02) trend = 'down';
  
  return {
    goodsId,
    ma5: currentPrice,
    ma20: currentPrice,
    ma60: currentPrice,
    momentum: Math.max(-1, Math.min(1, changePercent * 10)),
    volatility: 0.1, // 默认低波动
    trendStrength: Math.abs(changePercent),
    trend,
    pricePosition: 0.5, // 默认中间位置
  };
}

/**
 * 创建简化的价格预测（用于低活跃度商品）
 */
function createSimplePrediction(
  goodsId: number,
  currentPrice: number,
  indicators: CachedTechnicalIndicators
): CachedPricePrediction {
  // 简单预测：假设价格维持当前水平
  return {
    goodsId,
    currentPrice,
    predictedPrice1h: currentPrice,
    predictedPrice6h: currentPrice,
    predictedPrice24h: currentPrice,
    confidence1h: 0.5,
    confidence6h: 0.4,
    confidence24h: 0.3,
    priceRange24h: {
      low: currentPrice * 0.95,
      high: currentPrice * 1.05,
    },
    direction: 'neutral',
    directionStrength: 0,
    signal: 'hold',
    signalScore: 0,
  };
}

// ==================== 缓存管理类 ====================

class IndicatorCacheManager {
  private cache: GlobalIndicatorCache | null = null;
  private lastBuildTime = 0;
  private rebuildInterval = 12; // 每12tick重建一次缓存（从6提高到12）
  private minActiveThreshold = 20; // 供需之和至少20才视为活跃商品（从10提高到20）
  private highActivityThreshold = 50; // 高活跃度阈值（从20提高到50）
  
  /**
   * 获取或重建缓存
   * 优化：不再每tick重建，使用缓存有效期
   */
  private ensureCache(world: GameWorld): GlobalIndicatorCache {
    // 缓存有效期内直接返回
    if (this.cache && (world.tick - this.cache.tick < this.rebuildInterval)) {
      return this.cache;
    }
    
    // 首次构建或超过有效期，重建缓存
    this.rebuildCache(world);
    return this.cache!;
  }
  
  /**
   * 重建全部缓存
   */
  private rebuildCache(world: GameWorld): void {
    const startTime = performance.now();
    
    const newCache: GlobalIndicatorCache = {
      tick: world.tick,
      indicators: new Map(),
      predictions: new Map(),
      turningPoints: new Map(),
      tradingTimes: new Map(),
      trends: new Map(),
      activeGoods: new Set(),
      computeTimeMs: 0,
    };
    
    // 优化：只处理真正活跃的商品（供需之和达到阈值）
    // 这可以显著减少计算量
    for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
      const supply = world.goods.supplies[goodsId];
      const demand = world.goods.demands[goodsId];
      const price = world.goods.prices[goodsId];
      const activity = supply + demand;
      
      // 只处理活跃商品：有显著供需或有价格
      if (activity >= this.minActiveThreshold || price > 0) {
        newCache.activeGoods.add(goodsId);
        
        // 计算技术指标
        const indicators = calculateAllIndicators(world, goodsId);
        newCache.indicators.set(goodsId, indicators);
        
        // 只为高活跃度商品计算完整分析
        if (activity >= this.highActivityThreshold) {
          // 计算趋势
          const trend = analyzePriceTrend(world, goodsId);
          newCache.trends.set(goodsId, trend);
          
          // 生成预测
          const prediction = generatePrediction(world, goodsId, indicators, trend);
          newCache.predictions.set(goodsId, prediction);
          
          // 生成拐点分析
          const turning = generateTurningPoint(indicators, price);
          newCache.turningPoints.set(goodsId, turning);
          
          // 生成交易时机
          const tradingTime = generateTradingTime(prediction, turning, indicators);
          newCache.tradingTimes.set(goodsId, tradingTime);
        } else {
          // 低活跃度商品使用简化分析
          const simpleTrend = createSimpleTrend(world, goodsId, price);
          newCache.trends.set(goodsId, simpleTrend);
          
          const simplePrediction = createSimplePrediction(goodsId, price, indicators);
          newCache.predictions.set(goodsId, simplePrediction);
        }
      }
    }
    
    newCache.computeTimeMs = performance.now() - startTime;
    this.cache = newCache;
    this.lastBuildTime = newCache.computeTimeMs;
  }
  
  /**
   * 获取商品技术指标（使用缓存）
   */
  getIndicators(world: GameWorld, goodsId: number): CachedTechnicalIndicators | null {
    const cache = this.ensureCache(world);
    return cache.indicators.get(goodsId) || null;
  }
  
  /**
   * 获取商品价格预测（使用缓存）
   */
  getPrediction(world: GameWorld, goodsId: number): CachedPricePrediction | null {
    const cache = this.ensureCache(world);
    return cache.predictions.get(goodsId) || null;
  }
  
  /**
   * 获取商品拐点分析（使用缓存）
   */
  getTurningPoint(world: GameWorld, goodsId: number): CachedTurningPoint | null {
    const cache = this.ensureCache(world);
    return cache.turningPoints.get(goodsId) || null;
  }
  
  /**
   * 获取商品交易时机（使用缓存）
   */
  getTradingTime(world: GameWorld, goodsId: number): CachedTradingTime | null {
    const cache = this.ensureCache(world);
    return cache.tradingTimes.get(goodsId) || null;
  }
  
  /**
   * 获取商品趋势（使用缓存）
   */
  getTrend(world: GameWorld, goodsId: number): PriceTrendIndicators | null {
    const cache = this.ensureCache(world);
    return cache.trends.get(goodsId) || null;
  }
  
  /**
   * 获取所有活跃商品ID
   */
  getActiveGoods(world: GameWorld): Set<number> {
    const cache = this.ensureCache(world);
    return cache.activeGoods;
  }
  
  /**
   * 获取买入信号商品列表（按信号强度排序）
   */
  getBuySignals(world: GameWorld, limit: number = 10): CachedPricePrediction[] {
    const cache = this.ensureCache(world);
    
    return Array.from(cache.predictions.values())
      .filter(p => p.signal === 'buy' || p.signal === 'strong_buy')
      .sort((a, b) => b.signalScore - a.signalScore)
      .slice(0, limit);
  }
  
  /**
   * 获取卖出信号商品列表
   */
  getSellSignals(world: GameWorld, limit: number = 10): CachedPricePrediction[] {
    const cache = this.ensureCache(world);
    
    return Array.from(cache.predictions.values())
      .filter(p => p.signal === 'sell' || p.signal === 'strong_sell')
      .sort((a, b) => a.signalScore - b.signalScore)
      .slice(0, limit);
  }
  
  /**
   * 获取缓存统计信息
   */
  getStats(): { tick: number; goodsCount: number; computeTimeMs: number } | null {
    if (!this.cache) return null;
    
    return {
      tick: this.cache.tick,
      goodsCount: this.cache.activeGoods.size,
      computeTimeMs: this.cache.computeTimeMs,
    };
  }
  
  /**
   * 强制清除缓存
   */
  clear(): void {
    this.cache = null;
  }
}

// 导出单例
export const indicatorCache = new IndicatorCacheManager();

// 导出便捷函数
export function getCachedIndicators(world: GameWorld, goodsId: number): CachedTechnicalIndicators | null {
  return indicatorCache.getIndicators(world, goodsId);
}

export function getCachedPrediction(world: GameWorld, goodsId: number): CachedPricePrediction | null {
  return indicatorCache.getPrediction(world, goodsId);
}

export function getCachedTurningPoint(world: GameWorld, goodsId: number): CachedTurningPoint | null {
  return indicatorCache.getTurningPoint(world, goodsId);
}

export function getCachedTradingTime(world: GameWorld, goodsId: number): CachedTradingTime | null {
  return indicatorCache.getTradingTime(world, goodsId);
}

export function getCachedTrend(world: GameWorld, goodsId: number): PriceTrendIndicators | null {
  return indicatorCache.getTrend(world, goodsId);
}

export function getActiveGoods(world: GameWorld): Set<number> {
  return indicatorCache.getActiveGoods(world);
}

export function getCacheStats(): { tick: number; goodsCount: number; computeTimeMs: number } | null {
  return indicatorCache.getStats();
}