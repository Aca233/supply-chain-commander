/**
 * 价格引擎
 * 实现基于供需的价格均衡机制
 *
 * 性能优化：使用PriceCache批量获取价格统计
 */

import { GameWorld, recordPriceHistory } from '../world/GameWorld';
import {
  MAX_TICK_PRICE_CHANGE,
  MEAN_REVERSION_RATE,
  GOODS_COUNT,
  ACTUAL_GOODS_COUNT,
  SUPPLY_DEMAND_SMOOTHING,
  MAX_PRICE_RATIO,
  MIN_PRICE_RATIO,
  NO_TRADE_REVERSION_MULTIPLIER,
  NO_TRADE_MAX_MONTHLY_CHANGE,
  MAX_SUPPLY_DEMAND_RATIO,
  TICKS_PER_DAY
} from '../constants';
import { getVWAP, get24hVolume } from '../market/MatchingEngine';
import { getPriceCache } from '../market/PriceCache';
import { updateWorldDemands, CONSUMER_TIERS, DemandModifiers } from './DemandCurve';
import { applyMarketSubstitution } from './SubstitutionSystem';
import { perfMonitor } from '../performance/PerformanceMonitor';
import { getDemandPressure, syncDemandPressureFromDemand } from './MarketStats';

// 使用constants.ts中定义的统一平滑系数 SUPPLY_DEMAND_SMOOTHING

// 收紧极端区间：原 [0.3, 5.0] 在长期供需失衡下会把价格锁死在地板/天花板上。
// [0.45, 3.5] 仍允许 ±250% 波动，但留出 AI 调价空间。
const EXTREME_SHORTAGE_PRICE_RATIO = 3.5;
const EXTREME_SURPLUS_PRICE_RATIO = 0.45;

function calculateMarketPriceBounds(
  baseValue: number,
  demand: number,
  supply: number,
): { minPrice: number; maxPrice: number } {
  const safeSupply = Math.max(supply, 0.001);
  const safeDemand = Math.max(demand, 0.001);
  const demandSupplyRatio = safeDemand / safeSupply;

  const shortageStress = Math.max(0, Math.min(1, Math.log10(demandSupplyRatio) / 2));
  const surplusStress = Math.max(0, Math.min(1, Math.log10(1 / demandSupplyRatio) / 2));

  const maxRatio = MAX_PRICE_RATIO + (EXTREME_SHORTAGE_PRICE_RATIO - MAX_PRICE_RATIO) * shortageStress;
  const minRatio = MIN_PRICE_RATIO - (MIN_PRICE_RATIO - EXTREME_SURPLUS_PRICE_RATIO) * surplusStress;

  return {
    minPrice: baseValue * minRatio,
    maxPrice: baseValue * maxRatio,
  };
}

/**
 * 瓦尔拉斯均衡价格搜索
 * 通过迭代调整找到供需均衡价格
 */
export function findEquilibriumPrice(
  supplyFn: (price: number) => number,
  demandFn: (price: number) => number,
  initialPrice: number,
  tolerance: number = 0.01,
  maxIterations: number = 50
): number {
  let price = initialPrice;
  const adjustmentSpeed = 0.1;
  
  for (let i = 0; i < maxIterations; i++) {
    const supply = supplyFn(price);
    const demand = demandFn(price);
    const excessDemand = demand - supply;
    
    // 均衡条件：超额需求接近零
    if (Math.abs(excessDemand) < tolerance * (supply + demand) / 2) {
      break;
    }
    
    // 价格调整幅度与超额需求成比例
    const priceAdjustment = adjustmentSpeed * excessDemand / (supply + demand + 0.001);
    price *= (1 + priceAdjustment);
    
    // 防止负价格
    price = Math.max(price, 0.01);
  }
  
  return price;
}

/**
 * 稳定价格变化
 * 限制单tick价格变化幅度，并添加均值回归
 */
export function stabilizePrice(
  currentPrice: number,
  targetPrice: number,
  basePrice: number,
  reversionRate: number = MEAN_REVERSION_RATE,
): number {
  // 计算目标变化率
  const changeRate = (targetPrice - currentPrice) / currentPrice;
  
  // 均值回归
  const reversionPull = (basePrice - currentPrice) / currentPrice * reversionRate;

  // 限制总变化幅度，避免均值回归绕过单tick价格上限
  const totalChangeRate = Math.max(
    -MAX_TICK_PRICE_CHANGE,
    Math.min(MAX_TICK_PRICE_CHANGE, changeRate + reversionPull),
  );
  
  // 应用变化
  return currentPrice * (1 + totalChangeRate);
}

/**
 * 更新所有商品价格（优化版）
 * 基于供需数据计算新的均衡价格
 * 使用PriceCache批量获取VWAP和成交量
 */
export function updateAllPrices(world: GameWorld): PriceUpdateResult {
  const endMeasure = perfMonitor.startMeasure('pricing');
  
  const g = world.goods;
  const priceCache = getPriceCache();
  
  // 确保价格缓存是最新的
  priceCache.update(world);
  
  // 批量获取所有商品的VWAP和成交量
  const allVWAP = priceCache.getAllVWAP24h();
  const allVolume = priceCache.getAllVolume24h();
  
  const result: PriceUpdateResult = {
    updatedCount: 0,
    avgChange: 0,
    maxIncrease: { goodsId: -1, change: 0 },
    maxDecrease: { goodsId: -1, change: 0 },
  };
  
  let totalChange = 0;
  
  // 只处理实际使用的商品
for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
  const supply = g.supplies[i];
  const demand = getDemandPressure(world, i);
  const currentPrice = g.prices[i];
  const baseValue = g.baseValues[i];
  
  // 从缓存获取成交量（O(1)）
  const volume24h = allVolume[i];
  
  // 无成交时仍向基准价缓慢回归，避免商品价格被锁死在 MIN/MAX_PRICE_RATIO 边界。
  // Why: 长周期模拟显示 51 项商品长年触地板 0.45×、3 项触天花板 3.5×，根因是 volume24h=0 时
  //      之前直接 continue 不更新价格，导致历史漂移结果永久固化。
  // How: 用 NO_TRADE_REVERSION_MULTIPLIER 加强回归，仍只衰减供给压力。
  if (volume24h === 0) {
    g.supplies[i] *= (1 - SUPPLY_DEMAND_SMOOTHING);
    if (baseValue > 0 && currentPrice > 0) {
      const noTradeRate = MEAN_REVERSION_RATE * NO_TRADE_REVERSION_MULTIPLIER;
      const targetChange = (baseValue - currentPrice) / currentPrice * noTradeRate;
      const tickCap = NO_TRADE_MAX_MONTHLY_CHANGE / 30;
      const cappedChange = Math.max(-tickCap, Math.min(tickCap, targetChange));
      g.prices[i] = currentPrice * (1 + cappedChange);
    }
    continue;
  }

    // === 有成交时的正常价格计算 ===
    const totalVolume = supply + demand;
    // 【P0修复】供需比上限，防止需求计算溢出
    let ratio = totalVolume > 0.001 ? demand / (supply + 0.001) : 1.0;
    ratio = Math.min(ratio, MAX_SUPPLY_DEMAND_RATIO);
    
    let targetChange: number;
    if (ratio > 1.05) {
      const excess = ratio - 1;
      targetChange = Math.min(0.10, excess * 0.05);
    } else if (ratio < 0.95) {
      const excess = ratio - 1;
      targetChange = Math.max(-0.10, excess * 0.05);
    } else {
      if (totalVolume < 10) {
        targetChange = (baseValue - currentPrice) / currentPrice * MEAN_REVERSION_RATE * 2;
      } else {
        targetChange = (baseValue - currentPrice) / currentPrice * MEAN_REVERSION_RATE;
      }
    }
    
    // 从缓存获取VWAP（O(1)）
    const vwap = allVWAP[i];

    // VWAP 主导价格：有真实成交时，市场价直接以 VWAP 为锚点
    // Why: 长周期诊断证明 supply/demand 算法对中间品系统性高估 0.3-1.0x、对上游原料低估 0.2-0.3x
    //      VWAP 是真实成交均价，远比 supply/demand 比值反映真实市场状态。
    // How: volume24h>=10 时让 VWAP 占 80% 权重；流动性低时退化到原算法。
    if (vwap > 0 && volume24h > 0) {
      const vwapPull = (vwap - currentPrice) / currentPrice;
      // 流动性越高，VWAP 越主导：volume>=100 时 0.80 权重，封顶
      const vwapWeight = Math.min(0.80, 0.3 + Math.log10(volume24h + 1) * 0.2);
      targetChange = targetChange * (1 - vwapWeight) + vwapPull * vwapWeight;
    }
    
    const imbalance = Math.abs(Math.log10(Math.max(ratio, 0.001)));
    const marketReversionRate = imbalance > 0.5 ? 0 : MEAN_REVERSION_RATE;
    const targetPrice = currentPrice * (1 + targetChange);
    let newPrice = stabilizePrice(currentPrice, targetPrice, baseValue, marketReversionRate);
    
    const { minPrice, maxPrice } = calculateMarketPriceBounds(baseValue, demand, supply);
    const tickLimitedMinPrice = currentPrice * (1 - MAX_TICK_PRICE_CHANGE);
    const tickLimitedMaxPrice = currentPrice * (1 + MAX_TICK_PRICE_CHANGE);
    const effectiveMinPrice = Math.min(minPrice, tickLimitedMaxPrice);
    const effectiveMaxPrice = Math.max(maxPrice, tickLimitedMinPrice);
    newPrice = Math.max(effectiveMinPrice, Math.min(effectiveMaxPrice, newPrice));
    
    const actualChange = (newPrice - currentPrice) / currentPrice;
    totalChange += Math.abs(actualChange);
    
    if (actualChange > result.maxIncrease.change) {
      result.maxIncrease = { goodsId: i, change: actualChange };
    }
    if (actualChange < result.maxDecrease.change) {
      result.maxDecrease = { goodsId: i, change: actualChange };
    }
    
    g.prices[i] = newPrice;
    
    // 平滑供给数据（需求由updateWorldDemands平滑处理，此处不再重复）
    g.supplies[i] *= (1 - SUPPLY_DEMAND_SMOOTHING);

    result.updatedCount++;
  }
  
  result.avgChange = totalChange / ACTUAL_GOODS_COUNT;
  
  // 记录价格历史
  recordPriceHistory(world);
  
  endMeasure();
  
  return result;
}

/**
 * 价格更新结果
 */
export interface PriceUpdateResult {
  updatedCount: number;
  avgChange: number;
  maxIncrease: { goodsId: number; change: number };
  maxDecrease: { goodsId: number; change: number };
}

/**
 * 计算商品的理论价值
 * 基于生产成本
 */
export function calculateCostBasedValue(
  world: GameWorld,
  goodsId: number
): number | null {
  // TODO: 实现基于生产链的成本计算
  return world.goods.baseValues[goodsId];
}

/**
 * 获取价格趋势
 */
export function getPriceTrend(
  world: GameWorld,
  goodsId: number,
  periods: number = 7
): PriceTrend {
  const g = world.goods;
  const currentPrice = g.prices[goodsId];
  
  // 获取历史价格
  const historyStart = (g.historyIndex - periods + 365) % 365;
  const historicalPrice = g.priceHistory[goodsId * 365 + historyStart];
  
  // 计算变化
  const change = (currentPrice - historicalPrice) / historicalPrice;
  
  // 计算波动率
  let sumSquaredReturns = 0;
  let prevPrice = historicalPrice;
  
  for (let i = 1; i <= periods; i++) {
    const idx = (historyStart + i) % 365;
    const price = g.priceHistory[goodsId * 365 + idx];
    const ret = (price - prevPrice) / prevPrice;
    sumSquaredReturns += ret * ret;
    prevPrice = price;
  }
  
  const volatility = Math.sqrt(sumSquaredReturns / periods);
  
  // 确定趋势方向
  let direction: 'up' | 'down' | 'stable';
  if (change > 0.02) {
    direction = 'up';
  } else if (change < -0.02) {
    direction = 'down';
  } else {
    direction = 'stable';
  }
  
  return {
    goodsId,
    currentPrice,
    historicalPrice,
    change,
    changePercent: change * 100,
    volatility,
    direction,
    periods,
  };
}

/**
 * 价格趋势
 */
export interface PriceTrend {
  goodsId: number;
  currentPrice: number;
  historicalPrice: number;
  change: number;
  changePercent: number;
  volatility: number;
  direction: 'up' | 'down' | 'stable';
  periods: number;
}

/**
 * 计算价格弹性影响
 */
export function applyPriceElasticity(
  baseQuantity: number,
  priceRatio: number,  // 当前价格/基准价格
  elasticity: number   // 弹性系数（通常为负数）
): number {
  // Q = Q0 × (P/P0)^ε
  return baseQuantity * Math.pow(priceRatio, elasticity);
}

/**
 * 计算收入弹性影响
 */
export function applyIncomeElasticity(
  baseQuantity: number,
  incomeRatio: number,  // 当前收入/基准收入
  elasticity: number    // 弹性系数
): number {
  return baseQuantity * Math.pow(incomeRatio, elasticity);
}

/**
 * 获取价格汇总数据
 */
export function getPriceSummary(world: GameWorld): PriceSummary {
  const g = world.goods;
  
  let totalValue = 0;
  let increasingCount = 0;
  let decreasingCount = 0;
  let stableCount = 0;
  
  const topIncreases: { goodsId: number; name: string; change: number }[] = [];
  const topDecreases: { goodsId: number; name: string; change: number }[] = [];
  
  for (let i = 0; i < g.count; i++) {
    const trend = getPriceTrend(world, i, 1);
    
    totalValue += g.prices[i];
    
    if (trend.change > 0.01) {
      increasingCount++;
      topIncreases.push({ goodsId: i, name: g.names[i], change: trend.change });
    } else if (trend.change < -0.01) {
      decreasingCount++;
      topDecreases.push({ goodsId: i, name: g.names[i], change: trend.change });
    } else {
      stableCount++;
    }
  }
  
  // 排序
  topIncreases.sort((a, b) => b.change - a.change);
  topDecreases.sort((a, b) => a.change - b.change);
  
  return {
    totalGoods: g.count,
    avgPrice: totalValue / g.count,
    increasingCount,
    decreasingCount,
    stableCount,
    topIncreases: topIncreases.slice(0, 5),
    topDecreases: topDecreases.slice(0, 5),
  };
}

/**
 * 价格汇总
 */
export interface PriceSummary {
  totalGoods: number;
  avgPrice: number;
  increasingCount: number;
  decreasingCount: number;
  stableCount: number;
  topIncreases: { goodsId: number; name: string; change: number }[];
  topDecreases: { goodsId: number; name: string; change: number }[];
}

/**
 * 模拟消费者需求
 * 使用8层消费者系统计算精细化需求
 *
 * 修复说明：
 * 1. 将所有修正系数合并传递给 updateWorldDemands
 * 2. 避免多次乘以修正系数导致值不可预测
 * 3. 季节性和经济周期修正在调用时传入
 */
export function simulateConsumerDemand(
  world: GameWorld,
  seasonalMultipliers?: Float32Array,
  categoryMultipliers?: Map<string, number>
): void {
  // 获取经济周期乘数
  const cycleMultiplier = getCycleDemandMultiplier(world);
  
  // 构建修正系数对象
  const modifiers: DemandModifiers = {
    seasonalMultipliers,
    cycleMultiplier,
    categoryMultipliers,
  };
  
  // 一次性应用所有修正
  updateWorldDemands(world, modifiers);
  
  // 应用商品替代效应：当某商品价格变化时，需求会转移到替代品
  applyMarketSubstitution(world);

  // gross demand 用于 UI/AI，pressure 用于价格与短缺。
  syncDemandPressureFromDemand(world);
}

/**
 * 获取经济周期对需求的乘数影响
 */
function getCycleDemandMultiplier(world: GameWorld): number {
  const phase = world.economyStats.cyclePhase;
  const position = world.economyStats.cyclePosition;
  
  switch (phase) {
    case 'expansion':
      return 1.0 + position * 0.15;  // 扩张期：需求增加0-15%
    case 'peak':
      return 1.15 - (position - 0.75) * 0.1;  // 顶峰：开始回落
    case 'contraction':
      return 1.05 - position * 0.2;  // 收缩期：需求减少
    case 'trough':
      return 0.85 + (position - 0.25) * 0.15;  // 低谷：开始恢复
    default:
      return 1.0;
  }
}

/**
 * 获取消费者分层统计
 */
export function getConsumerStats(): {
  totalPopulation: number;
  totalIncome: number;
  avgIncome: number;
  tierStats: Array<{
    name: string;
    population: number;
    income: number;
    share: number;
  }>;
} {
  let totalPop = 0;
  let totalIncome = 0;
  const tierStats = [];
  
  for (const tier of CONSUMER_TIERS) {
    totalPop += tier.population;
    totalIncome += tier.population * tier.baseIncome;
    tierStats.push({
      name: tier.name,
      population: tier.population,
      income: tier.baseIncome,
      share: 0, // 计算后填充
    });
  }
  
  // 计算占比
  for (const stat of tierStats) {
    stat.share = stat.population / totalPop;
  }
  
  return {
    totalPopulation: totalPop,
    totalIncome,
    avgIncome: totalIncome / totalPop,
    tierStats,
  };
}
