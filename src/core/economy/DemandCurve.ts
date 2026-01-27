/**
 * 需求曲线与消费者分层系统
 * 实现多层次消费者的需求模拟和价格弹性计算
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS, GoodsDefinition, CONSUMER_GOODS } from '@/data/goods';
import { GOODS_COUNT, DEMAND_SMOOTHING_FACTOR, TICKS_PER_DAY, ACTUAL_GOODS_COUNT } from '@/core/constants';

/**
 * 消费者层级定义
 */
export interface ConsumerTier {
  id: number;
  name: string;
  population: number;           // 人口数量
  baseIncome: number;           // 基础收入（月）
  incomeVariance: number;       // 收入波动系数
  savingsRate: number;          // 储蓄率
  pricePreference: number;      // 价格敏感度（0=只看品质，1=只看价格）
  qualityPreference: number;    // 品质偏好（0=低端，1=高端）
  budgetShares: Map<string, number>; // 各品类预算占比
}

/**
 * 需求计算结果
 */
export interface DemandResult {
  quantity: number;             // 需求数量
  priceElasticity: number;      // 价格弹性
  incomeElasticity: number;     // 收入弹性
  budgetShare: number;          // 预算占比
  tierBreakdown: Array<{        // 各层级需求分布
    tierId: number;
    tierName: string;
    quantity: number;
    share: number;
  }>;
}

/**
 * 消费者分层数据
 * 8个收入层级的精细化消费者结构
 */
export const CONSUMER_TIERS: ConsumerTier[] = [
  {
    id: 0,
    name: '极低收入层',
    population: 15000000,
    baseIncome: 2000,
    incomeVariance: 0.15,
    savingsRate: 0.02,
    pricePreference: 0.95,
    qualityPreference: 0.05,
    budgetShares: new Map([
      ['raw', 0.08],
      ['basic', 0.25],
      ['intermediate', 0.02],
      ['final', 0.65],
    ]),
  },
  {
    id: 1,
    name: '低收入层',
    population: 25000000,
    baseIncome: 3500,
    incomeVariance: 0.2,
    savingsRate: 0.05,
    pricePreference: 0.9,
    qualityPreference: 0.1,
    budgetShares: new Map([
      ['raw', 0.06],
      ['basic', 0.22],
      ['intermediate', 0.04],
      ['final', 0.68],
    ]),
  },
  {
    id: 2,
    name: '中低收入层',
    population: 35000000,
    baseIncome: 5500,
    incomeVariance: 0.22,
    savingsRate: 0.08,
    pricePreference: 0.8,
    qualityPreference: 0.2,
    budgetShares: new Map([
      ['raw', 0.04],
      ['basic', 0.18],
      ['intermediate', 0.06],
      ['final', 0.72],
    ]),
  },
  {
    id: 3,
    name: '中等偏下层',
    population: 40000000,
    baseIncome: 8000,
    incomeVariance: 0.25,
    savingsRate: 0.10,
    pricePreference: 0.65,
    qualityPreference: 0.35,
    budgetShares: new Map([
      ['raw', 0.03],
      ['basic', 0.14],
      ['intermediate', 0.08],
      ['final', 0.75],
    ]),
  },
  {
    id: 4,
    name: '中等收入层',
    population: 45000000,
    baseIncome: 12000,
    incomeVariance: 0.28,
    savingsRate: 0.15,
    pricePreference: 0.5,
    qualityPreference: 0.5,
    budgetShares: new Map([
      ['raw', 0.02],
      ['basic', 0.10],
      ['intermediate', 0.10],
      ['final', 0.78],
    ]),
  },
  {
    id: 5,
    name: '中高收入层',
    population: 30000000,
    baseIncome: 20000,
    incomeVariance: 0.32,
    savingsRate: 0.22,
    pricePreference: 0.35,
    qualityPreference: 0.65,
    budgetShares: new Map([
      ['raw', 0.01],
      ['basic', 0.06],
      ['intermediate', 0.11],
      ['final', 0.82],
    ]),
  },
  {
    id: 6,
    name: '高收入层',
    population: 15000000,
    baseIncome: 40000,
    incomeVariance: 0.38,
    savingsRate: 0.30,
    pricePreference: 0.2,
    qualityPreference: 0.8,
    budgetShares: new Map([
      ['raw', 0.01],
      ['basic', 0.04],
      ['intermediate', 0.08],
      ['final', 0.87],
    ]),
  },
  {
    id: 7,
    name: '富裕阶层',
    population: 5000000,
    baseIncome: 100000,
    incomeVariance: 0.45,
    savingsRate: 0.40,
    pricePreference: 0.05,
    qualityPreference: 0.95,
    budgetShares: new Map([
      ['raw', 0.005],
      ['basic', 0.02],
      ['intermediate', 0.05],
      ['final', 0.925],
    ]),
  },
];

/**
 * 计算价格弹性
 * 需求的价格弹性 = (dQ/Q) / (dP/P) = (dQ/dP) * (P/Q)
 */
export function calculatePriceElasticity(
  goodsDef: GoodsDefinition,
  currentPrice: number,
  tier: ConsumerTier
): number {
  // 基础弹性来自商品定义
  let baseElasticity = goodsDef.priceElasticity;
  
  // 根据消费者层级调整弹性
  // 低收入层对必需品（弹性低的商品）敏感度更高，对奢侈品敏感度极高
  // 高收入层对价格整体敏感度较低
  
  const incomeAdjustment = 1 - (tier.baseIncome / 60000) * 0.5;
  
  // 必需品vs奢侈品调整
  if (Math.abs(baseElasticity) < 0.5) {
    // 必需品：低收入层弹性略高
    baseElasticity *= (1 + incomeAdjustment * 0.3);
  } else {
    // 奢侈品：低收入层弹性更高
    baseElasticity *= (1 + incomeAdjustment * 0.8);
  }
  
  return baseElasticity;
}

/**
 * 计算收入弹性
 * 需求的收入弹性 = (dQ/Q) / (dI/I)
 */
export function calculateIncomeElasticity(
  goodsDef: GoodsDefinition,
  tier: ConsumerTier
): number {
  let baseElasticity = goodsDef.incomeElasticity;
  
  // 恩格尔定律调整：收入越高，食品等必需品弹性越低
  if (goodsDef.category === 'final' && goodsDef.incomeElasticity < 1) {
    // 必需品
    const adjustment = tier.baseIncome / 60000;
    baseElasticity *= (1 - adjustment * 0.3);
  }
  
  return baseElasticity;
}

/**
 * 计算单个消费者层级对商品的需求
 */
export function calculateTierDemand(
  world: GameWorld,
  goodsId: number,
  tier: ConsumerTier,
  economyMultiplier: number = 1.0
): number {
  const goodsDef = ALL_GOODS.find(g => g.id === goodsId);
  if (!goodsDef || !goodsDef.isConsumerGood) {
    return 0;
  }
  
  const currentPrice = world.goods.prices[goodsId];
  const basePrice = goodsDef.basePrice;
  
  // 1. 计算有效收入
  const cycleFactor = world.economyStats.cyclePosition;
  const effectiveIncome = tier.baseIncome * (1 + (cycleFactor - 0.5) * 0.2) * economyMultiplier;
  
  // 2. 计算该商品类别的预算
  const categoryBudget = tier.budgetShares.get(goodsDef.category) || 0.1;
  const availableBudget = effectiveIncome * (1 - tier.savingsRate) * categoryBudget;
  
  // 3. 计算基础需求量（假设价格为基准价时的需求）
  // 使用人口和人均消费率
  const perCapitaBaseConsumption = getPerCapitaConsumption(goodsDef, tier);
  const baseQuantity = tier.population * perCapitaBaseConsumption;
  
  // 4. 应用价格弹性
  const priceElasticity = calculatePriceElasticity(goodsDef, currentPrice, tier);
  const priceRatio = currentPrice / basePrice;
  const priceEffect = Math.pow(priceRatio, priceElasticity);
  
  // 5. 应用收入弹性
  const incomeElasticity = calculateIncomeElasticity(goodsDef, tier);
  const incomeRatio = effectiveIncome / tier.baseIncome;
  const incomeEffect = Math.pow(incomeRatio, incomeElasticity);
  
  // 6. 品质偏好调整
  const qualityMatch = calculateQualityMatch(goodsDef, tier);
  
  // 7. 最终需求
  let demand = baseQuantity * priceEffect * incomeEffect * qualityMatch;
  
  // 8. 预算约束（放宽：允许超出单品类预算50%，反映实际消费弹性）
  // 修复：消费者会在品类间调整预算，不应过于严格限制
  const maxAffordable = availableBudget * 1.5 / currentPrice;
  demand = Math.min(demand, maxAffordable);
  
  // 9. 需求量级缩放（避免需求差异过大导致市场失衡）
  // 使用对数缩放使需求更加合理
  if (demand > 10000) {
    demand = 10000 + Math.log10(demand / 10000) * 5000;
  }
  
  return Math.max(0, demand);
}

/**
 * 获取人均消费率
 *
 * 修复说明：
 * 1. 调整消费率使需求更加合理
 * 2. 统一使用"单位/月/人"作为单位
 * 3. 增加更多商品的基础消费率
 * 4. 根据商品类别设置合理的默认值
 */
function getPerCapitaConsumption(goods: GoodsDefinition, tier: ConsumerTier): number {
  // 基础消费率表（单位/月/人）
  // 注意：这些是标准化的消费单位，与商品定义中的单位对应
  const baseRates: Record<string, number> = {
    // === 原材料（主要是企业间交易，个人消费极低）===
    'grain': 0.5,            // 粮食：每人每月0.5单位
    'ore': 0.001,            // 矿石：几乎不直接消费
    'timber': 0.01,          // 木材：少量DIY需求
    'coal': 0.02,            // 煤炭：取暖需求
    'cotton': 0.005,         // 棉花：不直接消费
    'oil': 0.1,              // 原油：不直接消费
    'rubber': 0.001,         // 橡胶：不直接消费
    
    // === 基础加工品 ===
    'steel': 0.01,           // 钢材：建筑装修需求
    'plastic': 0.05,         // 塑料：日用品需求
    'textiles': 0.1,         // 纺织品：家居需求
    'glass': 0.02,           // 玻璃：家装需求
    'chemicals': 0.01,       // 化学品：清洁用品等
    'paper': 0.5,            // 纸张：办公和生活需求
    'cement': 0.01,          // 水泥：装修需求
    
    // === 中间产品 ===
    'components': 0.01,      // 电子元件：DIY需求
    'machinery': 0.001,      // 机械：几乎不直接消费
    'semiconductors': 0.001, // 半导体：不直接消费
    'batteries': 0.05,       // 电池：各类设备需求
    
    // === 最终消费品 ===
    'food': 3.0,             // 食品：每人每月3份（一日三餐）
    'beverages': 5.0,        // 饮料：每人每月5瓶
    'clothing': 0.3,         // 服装：每人每月0.3件（约4个月一件）
    'processed-food': 2.0,   // 加工食品：每人每月2份
    'fuel': 10,              // 燃油：每人每月10升（有车家庭分摊）
    'electricity': 50,       // 电力：每人每月50度（按人均）
    
    // === 耐用消费品 ===
    'smartphone': 0.02,      // 手机：每人每月0.02台（约4年换一次）
    'premium-phone': 0.008,  // 高端手机：更低频率
    'budget-phone': 0.03,    // 平价手机：更高频率
    'computer': 0.01,        // 电脑：每人每月0.01台（约8年换一次）
    'appliances': 0.005,     // 家电：每人每月0.005台（约16年换一次）
    'furniture': 0.003,      // 家具：低频需求
    'car': 0.001,            // 汽车：每人每月0.001台（约80年？按家庭计算更合理）
    'electric-car': 0.0008,  // 电动车：略低于传统汽车
    
    // === 奢侈品 ===
    'luxury-goods': 0.0005,  // 奢侈品：极低频率
    'jewelry': 0.0002,       // 珠宝：更低频率
    
    // === 新兴产品 ===
    'drone': 0.0003,         // 无人机：新兴市场
    'ev-battery': 0.0002,    // 电动车电池：随车购买
    'solar-panel': 0.0001,   // 太阳能板：家庭安装
  };
  
  // 获取基础消费率，根据商品类别设置合理默认值
  let baseRate = baseRates[goods.key];
  if (baseRate === undefined) {
    // 根据商品类别设置默认值
    switch (goods.category) {
      case 'raw':
        baseRate = 0.01;    // 原材料默认极低
        break;
      case 'basic':
        baseRate = 0.05;    // 基础品默认低
        break;
      case 'intermediate':
        baseRate = 0.02;    // 中间品默认低
        break;
      case 'final':
        baseRate = goods.isConsumerGood ? 0.5 : 0.02;  // 消费品默认中等
        break;
      default:
        baseRate = 0.01;
    }
  }
  
  // 根据收入层调整消费频率
  let adjustment = 1.0;
  
  if (goods.incomeElasticity > 1.5) {
    // 奢侈品：高收入层消费更多
    // 使用更平滑的曲线，避免极端值
    const incomeRatio = Math.min(tier.baseIncome / 12000, 10);
    adjustment = Math.pow(incomeRatio, Math.min(goods.incomeElasticity - 1, 2));
  } else if (goods.incomeElasticity < 0.5) {
    // 必需品：各层消费差异较小
    adjustment = 1 + (tier.baseIncome / 60000) * 0.3;
  } else {
    // 普通商品：中等调整
    adjustment = 0.8 + (tier.baseIncome / 30000) * 0.4;
  }
  
  // 确保返回值合理
  return Math.max(0.0001, baseRate * adjustment);
}

/**
 * 计算品质匹配度
 */
function calculateQualityMatch(goods: GoodsDefinition, tier: ConsumerTier): number {
  // 根据商品层级和消费者偏好计算匹配度
  const goodsTier = goods.tier / 3; // 0-1
  const preference = tier.qualityPreference;
  
  // 偏好匹配：差距越大匹配度越低
  const mismatch = Math.abs(goodsTier - preference);
  const matchScore = 1 - mismatch * 0.5;
  
  // 特殊商品处理
  if (goods.key === 'premium-phone' && tier.qualityPreference < 0.5) {
    return 0.1; // 低收入层很少买高端手机
  }
  if (goods.key === 'budget-phone' && tier.qualityPreference > 0.7) {
    return 0.2; // 高收入层较少买平价手机
  }
  
  return Math.max(0.1, matchScore);
}

/**
 * 计算市场总需求
 */
export function calculateMarketDemand(
  world: GameWorld,
  goodsId: number
): DemandResult {
  const goodsDef = ALL_GOODS.find(g => g.id === goodsId);
  
  if (!goodsDef) {
    return {
      quantity: 0,
      priceElasticity: -1,
      incomeElasticity: 1,
      budgetShare: 0,
      tierBreakdown: [],
    };
  }
  
  let totalDemand = 0;
  const tierBreakdown: DemandResult['tierBreakdown'] = [];
  
  // 经济周期调整
  const economyMultiplier = 1 + (world.economyStats.cyclePosition - 0.5) * 0.3;
  
  // 遍历所有消费者层级
  for (const tier of CONSUMER_TIERS) {
    const tierDemand = calculateTierDemand(world, goodsId, tier, economyMultiplier);
    totalDemand += tierDemand;
    
    tierBreakdown.push({
      tierId: tier.id,
      tierName: tier.name,
      quantity: tierDemand,
      share: 0, // 后面计算
    });
  }
  
  // 计算各层级占比
  for (const item of tierBreakdown) {
    item.share = totalDemand > 0 ? item.quantity / totalDemand : 0;
  }
  
  // 计算整体弹性（加权平均）
  let weightedPriceElasticity = 0;
  let weightedIncomeElasticity = 0;
  let totalWeight = 0;
  
  for (const tier of CONSUMER_TIERS) {
    const weight = tier.population * tier.baseIncome;
    weightedPriceElasticity += calculatePriceElasticity(goodsDef, world.goods.prices[goodsId], tier) * weight;
    weightedIncomeElasticity += calculateIncomeElasticity(goodsDef, tier) * weight;
    totalWeight += weight;
  }
  
  return {
    quantity: totalDemand,
    priceElasticity: weightedPriceElasticity / totalWeight,
    incomeElasticity: weightedIncomeElasticity / totalWeight,
    budgetShare: 0.1, // TODO: 精确计算
    tierBreakdown,
  };
}

/**
 * 计算给定价格下的市场需求（用于生成需求曲线）
 */
export function calculateDemandAtPrice(
  world: GameWorld,
  goodsId: number,
  price: number
): number {
  // 临时保存原价格
  const originalPrice = world.goods.prices[goodsId];
  world.goods.prices[goodsId] = price;
  
  const result = calculateMarketDemand(world, goodsId);
  
  // 恢复价格
  world.goods.prices[goodsId] = originalPrice;
  
  return result.quantity;
}

/**
 * 生成需求曲线数据点
 */
export function generateDemandCurve(
  world: GameWorld,
  goodsId: number,
  priceRange: { min: number; max: number },
  points: number = 20
): Array<{ price: number; quantity: number }> {
  const curve: Array<{ price: number; quantity: number }> = [];
  const step = (priceRange.max - priceRange.min) / (points - 1);
  
  for (let i = 0; i < points; i++) {
    const price = priceRange.min + step * i;
    const quantity = calculateDemandAtPrice(world, goodsId, price);
    curve.push({ price, quantity });
  }
  
  return curve;
}

/**
 * 计算消费者剩余
 */
export function calculateConsumerSurplus(
  world: GameWorld,
  goodsId: number,
  currentQuantity: number
): number {
  const currentPrice = world.goods.prices[goodsId];
  const goodsDef = ALL_GOODS.find(g => g.id === goodsId);
  if (!goodsDef) return 0;
  
  // 通过积分需求曲线来计算
  // 简化版本：使用三角形近似
  const maxWillingnessToPay = goodsDef.basePrice * 2; // 假设最高支付意愿是基准价的2倍
  const surplus = 0.5 * currentQuantity * (maxWillingnessToPay - currentPrice);
  
  return Math.max(0, surplus);
}

/**
 * 需求计算修正系数
 */
export interface DemandModifiers {
  seasonalMultipliers?: Float32Array;  // 季节性修正
  cycleMultiplier?: number;             // 经济周期修正
  categoryMultipliers?: Map<string, number>; // 品类修正
}

/**
 * 更新世界需求数据
 * @param world 游戏世界
 * @param modifiers 可选的修正系数，如果提供则应用修正
 */
export function updateWorldDemands(world: GameWorld, modifiers?: DemandModifiers): void {
  // 不再重置需求为0，而是使用滑动平均
  // 使用统一的平滑系数（来自constants.ts）
  const smoothingFactor = DEMAND_SMOOTHING_FACTOR;
  
  // 计算每种消费品的需求
  for (const goods of CONSUMER_GOODS) {
    const result = calculateMarketDemand(world, goods.id);
    let newDemand = result.quantity;
    
    // 应用季节性修正
    if (modifiers?.seasonalMultipliers) {
      newDemand *= modifiers.seasonalMultipliers[goods.id] || 1.0;
    }
    
    // 应用经济周期修正
    if (modifiers?.cycleMultiplier !== undefined) {
      newDemand *= modifiers.cycleMultiplier;
    }
    
    // 应用品类修正
    if (modifiers?.categoryMultipliers) {
      const categoryMult = modifiers.categoryMultipliers.get(goods.category);
      if (categoryMult !== undefined) {
        newDemand *= categoryMult;
      }
    }
    
    // 使用滑动平均更新需求
    const oldDemand = world.goods.demands[goods.id];
    if (oldDemand > 0) {
      world.goods.demands[goods.id] = newDemand * smoothingFactor + oldDemand * (1 - smoothingFactor);
    } else {
      world.goods.demands[goods.id] = newDemand;
    }
  }
}

/**
 * 初始化所有商品的基础需求（游戏开始时调用一次）
 */
export function initializeBaseDemands(world: GameWorld): void {
  for (const goods of CONSUMER_GOODS) {
    const result = calculateMarketDemand(world, goods.id);
    world.goods.demands[goods.id] = result.quantity;
  }
}

/**
 * 获取需求统计摘要
 */
export function getDemandSummary(world: GameWorld): {
  totalDemand: number;
  topDemands: Array<{ goodsId: number; name: string; quantity: number }>;
  demandByCategory: Record<string, number>;
} {
  let totalDemand = 0;
  const demands: Array<{ goodsId: number; name: string; quantity: number }> = [];
  const demandByCategory: Record<string, number> = {
    raw: 0,
    basic: 0,
    intermediate: 0,
    final: 0,
  };
  
  for (const goods of ALL_GOODS) {
    const quantity = world.goods.demands[goods.id];
    totalDemand += quantity;
    demands.push({
      goodsId: goods.id,
      name: goods.name,
      quantity,
    });
    demandByCategory[goods.category] = (demandByCategory[goods.category] || 0) + quantity;
  }
  
  demands.sort((a, b) => b.quantity - a.quantity);
  
  return {
    totalDemand,
    topDemands: demands.slice(0, 10),
    demandByCategory,
  };
}

/**
 * 每日未满足需求衰减
 * 防止需求无限累积，保持市场平衡
 *
 * 调用时机：每天结束时（tick % 24 === 0）
 * 衰减逻辑：未满足的需求保留70%，30%衰减掉
 */
export function decayUnmetDemand(world: GameWorld): void {
  // 每天结束时执行衰减
  if (world.tick % TICKS_PER_DAY !== 0) return;
  
  const DECAY_RATE = 0.7;  // 保留70%的未满足需求
  
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const currentDemand = world.goods.demands[i];
    const supply = world.goods.supplies[i];
    
    // 只对未满足的需求部分进行衰减
    // 如果需求大于供给，说明有未满足的需求
    if (currentDemand > supply && currentDemand > 0) {
      // 计算满足比例
      const satisfiedRatio = supply / currentDemand;
      
      // 已满足的部分保持，未满足的部分衰减
      const satisfiedDemand = currentDemand * satisfiedRatio;
      const unsatisfiedDemand = currentDemand * (1 - satisfiedRatio);
      
      // 衰减后的需求 = 已满足部分 + 未满足部分 × 衰减率
      world.goods.demands[i] = satisfiedDemand + unsatisfiedDemand * DECAY_RATE;
    }
    
    // 同时重置供给数据（每天重新计算）
    // 供给会在生产和交易中重新累积
    world.goods.supplies[i] *= 0.5;  // 供给也平滑衰减
  }
  
  // 调试日志
  if (world.tick % (TICKS_PER_DAY * 10) === 0) {
    let totalDemand = 0;
    let totalSupply = 0;
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      totalDemand += world.goods.demands[i];
      totalSupply += world.goods.supplies[i];
    }
    console.log(`[需求衰减 T${world.tick}] 总需求:${totalDemand.toFixed(0)}, 总供给:${totalSupply.toFixed(0)}`);
  }
}