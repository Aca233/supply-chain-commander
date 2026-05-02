/**
 * AI高级交易系统
 * 
 * 实现复杂的交易策略和市场操作
 * 
 * 设计目标：
 * 1. 多种交易策略（趋势跟踪、均值回归、套利等）
 * 2. 订单管理（分批下单、止损止盈）
 * 3. 市场做市
 * 4. 流动性提供
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ACTUAL_GOODS_COUNT, AI_BUY_ORDER_EXPIRY, AI_SELL_ORDER_EXPIRY, GOODS_COUNT } from '@/core/constants';
import { createBuyOrder, createSellOrder, getOrderBookView } from '@/core/market/OrderBook';
import { AIPersonality, getCompanyPersonality } from './AIPersonality';
import { BEHAVIOR_PATTERNS } from './PersonalityBehaviors';
import { zicStrategy } from './ZICTrader';
import { zipStrategy } from './ZIPTrader';
import { 
  predictPrice, 
  calculateTechnicalIndicators,
  TechnicalIndicators,
  PricePrediction 
} from './PricePredictor';
import { 
  getGoodsProfitMargin,
  analyzeMarketShare 
} from './PrecisionCalculator';
import { getOptimalParameters, LearningParameters } from './HistoricalLearning';
import { ALL_GOODS } from '@/data/goods';

// ==================== 类型定义 ====================

/**
 * 交易策略类型
 */
export type TradingStrategyType = 
  | 'trend_following'    // 趋势跟踪
  | 'mean_reversion'     // 均值回归
  | 'momentum'           // 动量交易
  | 'arbitrage'          // 套利
  | 'market_making'      // 做市商
  | 'value_investing'    // 价值投资
  | 'scalping'           // 短线快进快出
  | 'swing_trading'      // 波段交易
  | 'zic'                // BSE Zero-Intelligence Constrained（约束下随机报价）
  | 'zip';               // BSE Zero-Intelligence Plus（自适应利润率学习）

/**
 * 交易信号
 */
export interface TradingSignal {
  goodsId: number;
  strategy: TradingStrategyType;
  action: 'buy' | 'sell' | 'hold';
  strength: number;               // 0-100
  
  // 建议参数
  suggestedPrice: number;
  suggestedQuantity: number;
  
  // 风险管理
  stopLoss?: number;              // 止损价
  takeProfit?: number;            // 止盈价
  
  // 有效期
  validUntilTick: number;
  
  // 原因
  reason: string;
}

/**
 * 订单管理配置
 */
export interface OrderManagement {
  // 分批下单
  splitOrders: boolean;
  splitCount: number;
  splitInterval: number;          // ticks
  
  // 止损止盈
  useStopLoss: boolean;
  stopLossPercent: number;
  useTakeProfit: boolean;
  takeProfitPercent: number;
  
  // 追踪止损
  useTrailingStop: boolean;
  trailingPercent: number;
  
  // 限价调整
  priceAdjustmentTicks: number;   // 多久调整一次价格
  priceAdjustmentPercent: number;
}

/**
 * 持仓跟踪
 */
export interface PositionTracking {
  goodsId: number;
  entryPrice: number;
  currentQuantity: number;
  highestPrice: number;           // 最高价（用于追踪止损）
  lowestPrice: number;            // 最低价
  stopLossPrice?: number;
  takeProfitPrice?: number;
  entryTick: number;
}

/**
 * 做市商配置
 */
export interface MarketMakingConfig {
  enabled: boolean;
  spreadPercent: number;          // 买卖价差百分比
  inventoryTarget: number;        // 目标库存
  maxInventory: number;           // 最大库存
  quoteSize: number;              // 单次报价数量
  refreshInterval: number;        // 刷新间隔（ticks）
}

/**
 * 交易会话
 */
export interface TradingSession {
  companyId: number;
  
  // 活跃策略
  activeStrategies: TradingStrategyType[];
  
  // 持仓跟踪
  positions: Map<number, PositionTracking>;
  
  // 订单管理配置
  orderManagement: OrderManagement;
  
  // 做市配置
  marketMaking: MarketMakingConfig;
  
  // 待处理信号
  pendingSignals: TradingSignal[];
  
  // 统计
  stats: {
    tradesExecuted: number;
    successfulTrades: number;
    totalProfit: number;
    winRate: number;
  };
}

// ==================== 存储管理 ====================

const tradingSessions = new Map<number, TradingSession>();

/**
 * 获取交易会话
 */
export function getTradingSession(companyId: number): TradingSession | null {
  return tradingSessions.get(companyId) || null;
}

/**
 * 初始化交易会话
 */
export function initializeTradingSession(
  companyId: number,
  personality: AIPersonality
): TradingSession {
  const pattern = BEHAVIOR_PATTERNS[personality.type];
  
  // 根据人格选择策略
  const strategies = selectStrategiesForPersonality(personality);
  
  const session: TradingSession = {
    companyId,
    activeStrategies: strategies,
    positions: new Map(),
    orderManagement: {
      splitOrders: personality.riskTolerance < 0.5,
      splitCount: 3,
      splitInterval: 6,
      useStopLoss: personality.riskTolerance < 0.6,
      stopLossPercent: 0.1 - personality.riskTolerance * 0.05,
      useTakeProfit: true,
      takeProfitPercent: 0.15 + personality.pricingBias * 0.1,
      useTrailingStop: personality.longTermFocus > 0.6,
      trailingPercent: 0.05,
      priceAdjustmentTicks: 12,
      priceAdjustmentPercent: 0.02,
    },
    marketMaking: {
      enabled: personality.type === 'opportunist' || personality.marketAwareness > 0.8,
      spreadPercent: 0.05 + (1 - personality.competitiveSensitivity) * 0.05,
      inventoryTarget: 100,
      maxInventory: 500,
      quoteSize: 50,
      refreshInterval: 6,
    },
    pendingSignals: [],
    stats: {
      tradesExecuted: 0,
      successfulTrades: 0,
      totalProfit: 0,
      winRate: 0,
    },
  };
  
  tradingSessions.set(companyId, session);
  return session;
}

/**
 * 根据人格选择交易策略
 */
function selectStrategiesForPersonality(personality: AIPersonality): TradingStrategyType[] {
  const strategies: TradingStrategyType[] = [];
  
  switch (personality.type) {
    case 'aggressive':
      strategies.push('momentum', 'trend_following', 'scalping', 'zip');
      break;
    case 'conservative':
      strategies.push('value_investing', 'mean_reversion', 'zic');
      break;
    case 'opportunist':
      strategies.push('arbitrage', 'momentum', 'market_making', 'zip');
      break;
    case 'specialist':
      strategies.push('trend_following', 'swing_trading');
      break;
    case 'diversified':
      strategies.push('value_investing', 'mean_reversion', 'swing_trading', 'zic');
      break;
    case 'innovator':
      strategies.push('momentum', 'trend_following', 'zip');
      break;
    case 'cost_leader':
      strategies.push('mean_reversion', 'scalping', 'zic');
      break;
    case 'premium':
      strategies.push('value_investing', 'swing_trading');
      break;
    case 'pioneer':
      strategies.push('arbitrage', 'value_investing', 'zip');
      break;
  }
  
  return strategies;
}

// ==================== 策略实现 ====================

/**
 * 趋势跟踪策略
 */
function trendFollowingStrategy(
  world: GameWorld,
  goodsId: number,
  indicators: TechnicalIndicators,
  prediction: PricePrediction
): TradingSignal | null {
  const currentPrice = world.goods.prices[goodsId];
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;
  
  // 趋势判断
  const shortTermTrend = indicators.ema5 > indicators.ema10;
  const mediumTermTrend = indicators.ema10 > indicators.sma20;
  const macdPositive = indicators.macd > indicators.macdSignal;
  
  let action: 'buy' | 'sell' | 'hold' = 'hold';
  let strength = 0;
  let reason = '';
  
  // 上升趋势
  if (shortTermTrend && mediumTermTrend && macdPositive) {
    action = 'buy';
    strength = 60 + (prediction.signalScore > 0 ? prediction.signalScore * 0.4 : 0);
    reason = '多重均线上涨确认，MACD金叉';
  }
  // 下降趋势
  else if (!shortTermTrend && !mediumTermTrend && !macdPositive) {
    action = 'sell';
    strength = 60 + (prediction.signalScore < 0 ? -prediction.signalScore * 0.4 : 0);
    reason = '多重均线下跌确认，MACD死叉';
  }
  
  if (action === 'hold') return null;
  
  return {
    goodsId,
    strategy: 'trend_following',
    action,
    strength,
    suggestedPrice: action === 'buy' 
      ? currentPrice * 1.01 
      : currentPrice * 0.99,
    suggestedQuantity: 50,
    stopLoss: action === 'buy' ? currentPrice * 0.92 : currentPrice * 1.08,
    takeProfit: action === 'buy' ? currentPrice * 1.15 : currentPrice * 0.85,
    validUntilTick: world.tick + 24,
    reason,
  };
}

/**
 * 均值回归策略
 */
function meanReversionStrategy(
  world: GameWorld,
  goodsId: number,
  indicators: TechnicalIndicators,
  prediction: PricePrediction
): TradingSignal | null {
  const currentPrice = world.goods.prices[goodsId];
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;
  
  const basePrice = goods.basePrice;
  const deviation = (currentPrice - basePrice) / basePrice;
  
  let action: 'buy' | 'sell' | 'hold' = 'hold';
  let strength = 0;
  let reason = '';
  
  // RSI超卖 + 价格低于均值
  if (indicators.rsi < 30 && deviation < -0.15) {
    action = 'buy';
    strength = 50 + (30 - indicators.rsi) * 1.5;
    reason = `RSI超卖(${indicators.rsi.toFixed(0)})，价格偏离${(deviation * 100).toFixed(0)}%`;
  }
  // RSI超买 + 价格高于均值
  else if (indicators.rsi > 70 && deviation > 0.15) {
    action = 'sell';
    strength = 50 + (indicators.rsi - 70) * 1.5;
    reason = `RSI超买(${indicators.rsi.toFixed(0)})，价格偏离${(deviation * 100).toFixed(0)}%`;
  }
  // 布林带突破
  else if (currentPrice < indicators.bollingerLower) {
    action = 'buy';
    strength = 55;
    reason = '价格突破布林带下轨';
  }
  else if (currentPrice > indicators.bollingerUpper) {
    action = 'sell';
    strength = 55;
    reason = '价格突破布林带上轨';
  }
  
  if (action === 'hold') return null;
  
  return {
    goodsId,
    strategy: 'mean_reversion',
    action,
    strength,
    suggestedPrice: action === 'buy' 
      ? currentPrice * 0.98 
      : currentPrice * 1.02,
    suggestedQuantity: 30,
    stopLoss: action === 'buy' ? currentPrice * 0.9 : currentPrice * 1.1,
    takeProfit: basePrice, // 目标回归均值
    validUntilTick: world.tick + 48,
    reason,
  };
}

/**
 * 动量策略
 */
function momentumStrategy(
  world: GameWorld,
  goodsId: number,
  indicators: TechnicalIndicators,
  prediction: PricePrediction
): TradingSignal | null {
  const currentPrice = world.goods.prices[goodsId];
  
  // MACD动量
  const macdMomentum = indicators.macdHistogram;
  // RSI动量
  const rsiMomentum = (indicators.rsi - 50) / 50;
  // 综合动量
  const momentum = (macdMomentum / currentPrice * 100 + rsiMomentum) / 2;
  
  let action: 'buy' | 'sell' | 'hold' = 'hold';
  let strength = 0;
  let reason = '';
  
  if (momentum > 0.3 && indicators.macdHistogram > 0) {
    action = 'buy';
    strength = Math.min(80, 50 + momentum * 50);
    reason = '强劲上涨动量';
  } else if (momentum < -0.3 && indicators.macdHistogram < 0) {
    action = 'sell';
    strength = Math.min(80, 50 - momentum * 50);
    reason = '强劲下跌动量';
  }
  
  if (action === 'hold') return null;
  
  return {
    goodsId,
    strategy: 'momentum',
    action,
    strength,
    suggestedPrice: action === 'buy' 
      ? currentPrice * 1.02 
      : currentPrice * 0.98,
    suggestedQuantity: 40,
    validUntilTick: world.tick + 12,
    reason,
  };
}

/**
 * 套利策略
 */
function arbitrageStrategy(
  world: GameWorld,
  goodsId: number
): TradingSignal | null {
  const orderBook = getOrderBookView(world, goodsId);
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;
  
  const basePrice = goods.basePrice;
  const currentPrice = world.goods.prices[goodsId];
  
  // 检查买卖价差套利机会
  if (orderBook.bestBid && orderBook.bestAsk) {
    const spread = (orderBook.bestAsk - orderBook.bestBid) / orderBook.bestBid;
    
    // 价差超过5%可能有套利机会
    if (spread > 0.05) {
      return {
        goodsId,
        strategy: 'arbitrage',
        action: 'buy',
        strength: 60 + spread * 200,
        suggestedPrice: orderBook.bestBid * 1.01,
        suggestedQuantity: 50, // 固定数量，避免类型问题
        validUntilTick: world.tick + 6,
        reason: `买卖价差${(spread * 100).toFixed(1)}%`,
      };
    }
  }
  
  // 检查价格偏离套利
  const deviation = (currentPrice - basePrice) / basePrice;
  if (Math.abs(deviation) > 0.3) {
    const action = deviation > 0 ? 'sell' : 'buy';
    return {
      goodsId,
      strategy: 'arbitrage',
      action,
      strength: 55 + Math.abs(deviation) * 50,
      suggestedPrice: action === 'buy' 
        ? currentPrice * 0.99 
        : currentPrice * 1.01,
      suggestedQuantity: 30,
      validUntilTick: world.tick + 24,
      reason: `价格偏离基准${(deviation * 100).toFixed(0)}%`,
    };
  }
  
  return null;
}

/**
 * 价值投资策略
 */
function valueInvestingStrategy(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  indicators: TechnicalIndicators
): TradingSignal | null {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;
  
  const currentPrice = world.goods.prices[goodsId];
  const basePrice = goods.basePrice;
  const profitMargin = getGoodsProfitMargin(world, companyId, goodsId);
  
  // 价值被低估
  if (currentPrice < basePrice * 0.75 && profitMargin > 0) {
    return {
      goodsId,
      strategy: 'value_investing',
      action: 'buy',
      strength: 70,
      suggestedPrice: currentPrice * 0.98,
      suggestedQuantity: 100,
      takeProfit: basePrice,
      validUntilTick: world.tick + 72,
      reason: `价值被低估，当前价格仅为基准价${((currentPrice / basePrice) * 100).toFixed(0)}%`,
    };
  }
  
  // 价值被高估
  if (currentPrice > basePrice * 1.5 && profitMargin > 0.2) {
    return {
      goodsId,
      strategy: 'value_investing',
      action: 'sell',
      strength: 65,
      suggestedPrice: currentPrice * 1.02,
      suggestedQuantity: 50,
      validUntilTick: world.tick + 72,
      reason: `价值被高估，利润率${(profitMargin * 100).toFixed(0)}%`,
    };
  }
  
  return null;
}

/**
 * 波段交易策略
 */
function swingTradingStrategy(
  world: GameWorld,
  goodsId: number,
  indicators: TechnicalIndicators,
  prediction: PricePrediction
): TradingSignal | null {
  const currentPrice = world.goods.prices[goodsId];
  
  // 识别波段低点
  const nearSupport = currentPrice < indicators.bollingerLower * 1.02;
  const oversold = indicators.rsi < 35;
  const bullishReversal = indicators.macdHistogram > 0 && prediction.direction === 'bullish';
  
  if (nearSupport && oversold && bullishReversal) {
    return {
      goodsId,
      strategy: 'swing_trading',
      action: 'buy',
      strength: 70,
      suggestedPrice: currentPrice * 0.99,
      suggestedQuantity: 60,
      stopLoss: indicators.bollingerLower * 0.95,
      takeProfit: indicators.bollingerMiddle,
      validUntilTick: world.tick + 48,
      reason: '波段底部确认，准备反弹',
    };
  }
  
  // 识别波段高点
  const nearResistance = currentPrice > indicators.bollingerUpper * 0.98;
  const overbought = indicators.rsi > 65;
  const bearishReversal = indicators.macdHistogram < 0 && prediction.direction === 'bearish';
  
  if (nearResistance && overbought && bearishReversal) {
    return {
      goodsId,
      strategy: 'swing_trading',
      action: 'sell',
      strength: 70,
      suggestedPrice: currentPrice * 1.01,
      suggestedQuantity: 60,
      stopLoss: indicators.bollingerUpper * 1.05,
      takeProfit: indicators.bollingerMiddle,
      validUntilTick: world.tick + 48,
      reason: '波段顶部确认，准备回落',
    };
  }
  
  return null;
}

// ==================== 信号生成 ====================

/**
 * 生成交易信号
 */
export function generateTradingSignals(
  world: GameWorld,
  companyId: number,
  goodsIds: number[]
): TradingSignal[] {
  const session = tradingSessions.get(companyId);
  if (!session) return [];
  
  const signals: TradingSignal[] = [];
  
  // ZIC/ZIP 需要 personality 信息
  const personality = getCompanyPersonality(world, companyId);

  for (const goodsId of goodsIds) {
    const indicators = calculateTechnicalIndicators(world, goodsId);
    const prediction = predictPrice(world, goodsId);

    // 应用每个活跃策略
    for (const strategy of session.activeStrategies) {
      let signal: TradingSignal | null = null;

      switch (strategy) {
        case 'trend_following':
          signal = trendFollowingStrategy(world, goodsId, indicators, prediction);
          break;
        case 'mean_reversion':
          signal = meanReversionStrategy(world, goodsId, indicators, prediction);
          break;
        case 'momentum':
          signal = momentumStrategy(world, goodsId, indicators, prediction);
          break;
        case 'arbitrage':
          signal = arbitrageStrategy(world, goodsId);
          break;
        case 'value_investing':
          signal = valueInvestingStrategy(world, companyId, goodsId, indicators);
          break;
        case 'swing_trading':
          signal = swingTradingStrategy(world, goodsId, indicators, prediction);
          break;
        case 'zic':
          if (personality) signal = zicStrategy(world, companyId, goodsId, personality);
          break;
        case 'zip':
          if (personality) signal = zipStrategy(world, companyId, goodsId, personality);
          break;
      }

      if (signal && signal.strength >= 50) {
        signals.push(signal);
      }
    }
  }
  
  // 按强度排序
  signals.sort((a, b) => b.strength - a.strength);
  
  return signals;
}

// ==================== 订单执行 ====================

/**
 * 执行交易信号
 */
export function executeSignal(
  world: GameWorld,
  companyId: number,
  signal: TradingSignal
): boolean {
  const session = tradingSessions.get(companyId);
  if (!session) return false;
  
  // 检查信号是否过期
  if (world.tick > signal.validUntilTick) return false;
  
  // 应用学习参数调整
  const learningParams = getOptimalParameters(companyId);
  let adjustedPrice = signal.suggestedPrice;
  let adjustedQuantity = signal.suggestedQuantity;
  
  if (learningParams) {
    if (signal.action === 'buy') {
      const goods = ALL_GOODS.find(g => g.id === signal.goodsId);
      if (goods) {
        adjustedPrice = Math.min(adjustedPrice, goods.basePrice * learningParams.optimalBuyPriceRatio);
      }
      adjustedQuantity *= learningParams.optimalBuyQuantityRatio;
    } else {
      const goods = ALL_GOODS.find(g => g.id === signal.goodsId);
      if (goods) {
        adjustedPrice = Math.max(adjustedPrice, goods.basePrice * learningParams.optimalSellPriceRatio * 0.9);
      }
      adjustedQuantity *= learningParams.optimalSellQuantityRatio;
    }
  }
  
  // 分批下单
  if (session.orderManagement.splitOrders && adjustedQuantity > 20) {
    const splitQuantity = adjustedQuantity / session.orderManagement.splitCount;
    
    // 只下第一批，其余加入待处理
    const orderId = signal.action === 'buy'
      ? createBuyOrder(world, companyId, signal.goodsId, splitQuantity, adjustedPrice)
      : createSellOrder(world, companyId, signal.goodsId, splitQuantity, adjustedPrice);
    
    if (orderId !== null) {
      // 创建后续信号
      for (let i = 1; i < session.orderManagement.splitCount; i++) {
        const delayedSignal: TradingSignal = {
          ...signal,
          suggestedQuantity: splitQuantity,
          validUntilTick: world.tick + session.orderManagement.splitInterval * (i + 1),
        };
        session.pendingSignals.push(delayedSignal);
      }
      
      // 跟踪持仓
      if (signal.action === 'buy') {
        trackPosition(session, signal.goodsId, adjustedPrice, splitQuantity, world.tick, signal);
      }
      
      session.stats.tradesExecuted++;
      return true;
    }
  } else {
    // 单次下单
    const orderId = signal.action === 'buy'
      ? createBuyOrder(world, companyId, signal.goodsId, adjustedQuantity, adjustedPrice)
      : createSellOrder(world, companyId, signal.goodsId, adjustedQuantity, adjustedPrice);
    
    if (orderId !== null) {
      if (signal.action === 'buy') {
        trackPosition(session, signal.goodsId, adjustedPrice, adjustedQuantity, world.tick, signal);
      }
      
      session.stats.tradesExecuted++;
      return true;
    }
  }
  
  return false;
}

/**
 * 跟踪持仓
 */
function trackPosition(
  session: TradingSession,
  goodsId: number,
  price: number,
  quantity: number,
  tick: number,
  signal: TradingSignal
): void {
  const existing = session.positions.get(goodsId);
  
  if (existing) {
    // 更新现有持仓
    const totalQuantity = existing.currentQuantity + quantity;
    const avgPrice = (existing.entryPrice * existing.currentQuantity + price * quantity) / totalQuantity;
    existing.entryPrice = avgPrice;
    existing.currentQuantity = totalQuantity;
    existing.highestPrice = Math.max(existing.highestPrice, price);
  } else {
    // 新建持仓
    session.positions.set(goodsId, {
      goodsId,
      entryPrice: price,
      currentQuantity: quantity,
      highestPrice: price,
      lowestPrice: price,
      stopLossPrice: signal.stopLoss,
      takeProfitPrice: signal.takeProfit,
      entryTick: tick,
    });
  }
}

// ==================== 持仓管理 ====================

/**
 * 更新持仓状态
 */
export function updatePositions(
  world: GameWorld,
  companyId: number
): { stopLossTriggered: number[]; takeProfitTriggered: number[] } {
  const session = tradingSessions.get(companyId);
  if (!session) return { stopLossTriggered: [], takeProfitTriggered: [] };
  
  const stopLossTriggered: number[] = [];
  const takeProfitTriggered: number[] = [];
  
  for (const [goodsId, position] of session.positions) {
    const currentPrice = world.goods.prices[goodsId];
    
    // 更新最高/最低价
    position.highestPrice = Math.max(position.highestPrice, currentPrice);
    position.lowestPrice = Math.min(position.lowestPrice, currentPrice);
    
    // 追踪止损更新
    if (session.orderManagement.useTrailingStop) {
      const trailingStop = position.highestPrice * (1 - session.orderManagement.trailingPercent);
      if (!position.stopLossPrice || trailingStop > position.stopLossPrice) {
        position.stopLossPrice = trailingStop;
      }
    }
    
    // 检查止损
    if (position.stopLossPrice && currentPrice <= position.stopLossPrice) {
      stopLossTriggered.push(goodsId);
      // 执行止损卖出
      const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
      const sellQty = Math.min(position.currentQuantity, inventory);
      if (sellQty > 0) {
        createSellOrder(world, companyId, goodsId, sellQty, currentPrice * 0.98);
      }
      session.positions.delete(goodsId);
    }
    
    // 检查止盈
    if (position.takeProfitPrice && currentPrice >= position.takeProfitPrice) {
      takeProfitTriggered.push(goodsId);
      // 执行止盈卖出
      const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
      const sellQty = Math.min(position.currentQuantity, inventory);
      if (sellQty > 0) {
        createSellOrder(world, companyId, goodsId, sellQty, currentPrice * 0.99);
        session.stats.successfulTrades++;
      }
      session.positions.delete(goodsId);
    }
  }
  
  // 更新胜率
  if (session.stats.tradesExecuted > 0) {
    session.stats.winRate = session.stats.successfulTrades / session.stats.tradesExecuted;
  }
  
  return { stopLossTriggered, takeProfitTriggered };
}

// ==================== 做市商功能 ====================

/**
 * 执行做市操作
 */
export function performMarketMaking(
  world: GameWorld,
  companyId: number,
  goodsId: number
): { buyOrderId: number | null; sellOrderId: number | null } {
  const session = tradingSessions.get(companyId);
  if (!session || !session.marketMaking.enabled) {
    return { buyOrderId: null, sellOrderId: null };
  }
  
  const mm = session.marketMaking;
  const currentPrice = world.goods.prices[goodsId];
  const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
  
  // 计算买卖价格
  const halfSpread = mm.spreadPercent / 2;
  const bidPrice = currentPrice * (1 - halfSpread);
  const askPrice = currentPrice * (1 + halfSpread);
  
  let buyOrderId: number | null = null;
  let sellOrderId: number | null = null;
  
  // 库存调整
  const inventoryRatio = inventory / mm.inventoryTarget;
  
  // 库存不足时增加买入
  if (inventoryRatio < 1.5) {
    const buyQty = mm.quoteSize * (2 - inventoryRatio);
    const cash = world.companies.cash[companyId];
    if (cash >= buyQty * bidPrice) {
      buyOrderId = createBuyOrder(world, companyId, goodsId, buyQty, bidPrice);
    }
  }
  
  // 有库存时提供卖出
  if (inventory > mm.quoteSize && inventoryRatio > 0.5) {
    const sellQty = Math.min(mm.quoteSize * inventoryRatio, inventory * 0.3);
    sellOrderId = createSellOrder(world, companyId, goodsId, sellQty, askPrice);
  }
  
  return { buyOrderId, sellOrderId };
}

// ==================== 吃买单功能 ====================

/**
 * AI公司"吃买单"功能 - 主动卖给市场上出价高的买家
 *
 * 只处理传入的targetGoods列表（AI公司生产的产品）
 */
export function executeTakeBuyOrders(
  world: GameWorld,
  companyId: number,
  targetGoods: number[]
): number {
  const c = world.companies;
  let ordersPlaced = 0;
  
  // 只遍历目标商品（AI公司生产的产品）
  for (const goodsId of targetGoods) {
    const inventory = c.inventories[companyId * GOODS_COUNT + goodsId];
    const reserved = c.inventoryReserved[companyId * GOODS_COUNT + goodsId];
    
    // 计算可卖数量（保留10%用于生产）
    const productionReserve = inventory * 0.1;
    let available = inventory - reserved - productionReserve;
    
    // 如果库存很大（>1000），强制可卖一部分
    if (inventory > 1000 && available < inventory * 0.3) {
      available = Math.floor(inventory * 0.3);
    }
    
    // 至少有10个可卖才处理
    if (available < 10) continue;
    
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    
    // 获取订单簿
    const orderBookView = getOrderBookView(world, goodsId);
    
    // 遍历买单（已按价格降序排列）
    for (const buyOrder of orderBookView.buyOrders) {
      // 跳过自己的买单
      if (buyOrder.companyId === companyId) continue;
      
      // 检查价格是否可接受（至少基准价的50%）
      if (buyOrder.price < basePrice * 0.5) {
        break; // 买单是降序的，后面的价格更低，不用继续了
      }
      
      // 计算可卖数量（不超过可用库存和买单需求量）
      const sellQuantity = Math.min(available, buyOrder.remaining, 500);
      
      if (sellQuantity < 1) continue;
      
      // 以买单价格挂卖单（确保立即成交）
      const orderId = createSellOrder(
        world,
        companyId,
        goodsId,
        sellQuantity,
        buyOrder.price, // 使用买方价格，确保立即成交
        AI_SELL_ORDER_EXPIRY
      );
      
      if (orderId !== null) {
        ordersPlaced++;
        // 每种商品每次只吃一个买单
        break;
      }
    }
  }
  
  return ordersPlaced;
}

/**
 * AI公司"吃卖单"功能 - 主动购买市场上价格低的卖家货物
 *
 * 只处理传入的neededGoods列表（AI公司需要的原材料）
 */
export function executeTakeSellOrders(
  world: GameWorld,
  companyId: number,
  neededGoods: number[]
): number {
  const c = world.companies;
  let ordersPlaced = 0;
  
  // 只遍历需要的商品
  for (const goodsId of neededGoods) {
    const inventory = c.inventories[companyId * GOODS_COUNT + goodsId];
    const cash = c.cash[companyId];
    
    // 目标库存（暂定500）
    const targetInventory = 500;
    const shortage = targetInventory - inventory;
    
    if (shortage < 10) continue;
    
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    
    // 获取订单簿
    const orderBookView = getOrderBookView(world, goodsId);
    
    // 遍历卖单（已按价格升序排列）
    for (const sellOrder of orderBookView.sellOrders) {
      // 跳过自己的卖单
      if (sellOrder.companyId === companyId) continue;
      
      // 检查价格是否可接受（不超过基准价的150%）
      if (sellOrder.price > basePrice * 1.5) {
        break;
      }
      
      // 计算可买数量
      const maxAffordable = Math.floor(cash * 0.3 / sellOrder.price);
      const buyQuantity = Math.min(shortage, sellOrder.remaining, maxAffordable, 500);
      
      if (buyQuantity < 1) continue;
      
      // 以卖单价格挂买单（确保立即成交）
      const orderId = createBuyOrder(
        world,
        companyId,
        goodsId,
        buyQuantity,
        sellOrder.price, // 使用卖方价格，确保立即成交
        AI_BUY_ORDER_EXPIRY
      );
      
      if (orderId !== null) {
        ordersPlaced++;
        // 每种商品每次只吃一个卖单
        break;
      }
    }
  }
  
  return ordersPlaced;
}

// ==================== 交易系统主循环 ====================

/**
 * 运行高级交易系统
 */
export function runAdvancedTradingCycle(
  world: GameWorld,
  companyId: number,
  targetGoods: number[]
): void {
  let session = tradingSessions.get(companyId);
  if (!session) return;
  
  // 0. 【新增】先执行吃单操作（优先立即成交）
  // 只处理targetGoods列表，不遍历所有商品
  executeTakeBuyOrders(world, companyId, targetGoods);
  executeTakeSellOrders(world, companyId, targetGoods);
  
  // 1. 处理待处理的信号
  const validPendingSignals = session.pendingSignals.filter(
    s => world.tick >= s.validUntilTick - 24 && world.tick <= s.validUntilTick
  );
  
  for (const signal of validPendingSignals) {
    executeSignal(world, companyId, signal);
  }
  
  // 清理过期信号
  session.pendingSignals = session.pendingSignals.filter(
    s => world.tick <= s.validUntilTick
  );
  
  // 2. 更新持仓状态
  updatePositions(world, companyId);
  
  // 3. 生成新信号
  const newSignals = generateTradingSignals(world, companyId, targetGoods);
  
  // 4. 执行最强信号
  for (const signal of newSignals.slice(0, 3)) {
    executeSignal(world, companyId, signal);
  }
  
  // 5. 做市操作（如果启用）
  if (session.marketMaking.enabled) {
    for (const goodsId of targetGoods.slice(0, 5)) {
      performMarketMaking(world, companyId, goodsId);
    }
  }
}

/**
 * 获取交易统计
 */
export function getTradingStats(companyId: number): TradingSession['stats'] | null {
  const session = tradingSessions.get(companyId);
  return session?.stats || null;
}

/**
 * 获取活跃持仓
 */
export function getActivePositions(companyId: number): PositionTracking[] {
  const session = tradingSessions.get(companyId);
  if (!session) return [];
  return Array.from(session.positions.values());
}
