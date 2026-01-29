/**
 * 需求曲线与消费者分层系统
 * 实现多层次消费者的需求模拟和价格弹性计算
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS, GoodsDefinition, CONSUMER_GOODS } from '@/data/goods';
import { GOODS_COUNT, DEMAND_SMOOTHING_FACTOR, TICKS_PER_DAY, ACTUAL_GOODS_COUNT, MAX_SUPPLY_DEMAND_RATIO } from '@/core/constants';
import { RECIPES } from '@/data/recipes';

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
 *
 * 【P2优化】调整弹性计算，使其更加平滑
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
  
  // 【优化】使用更平滑的调整曲线
  const incomeAdjustment = Math.min(1, (1 - tier.baseIncome / 100000) * 0.4);
  
  // 必需品vs奢侈品调整
  if (Math.abs(baseElasticity) < 0.5) {
    // 必需品：低收入层弹性略高
    baseElasticity *= (1 + incomeAdjustment * 0.2);
  } else {
    // 奢侈品：低收入层弹性更高，但限制在合理范围
    baseElasticity *= (1 + incomeAdjustment * 0.5);
  }
  
  // 【P2优化】限制弹性绝对值，防止极端价格效应
  return Math.max(-3.0, Math.min(-0.1, baseElasticity));
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
  
  // 9. 【P0修复】需求量级缩放（避免需求差异过大导致市场失衡）
  // 更激进的缩放：降低阈值到10000，使用更平缓的对数缩放
  if (demand > 10000) {
    // 使用对数缩放：base + log(excess) * scale
    demand = 10000 + Math.log10(demand / 10000 + 1) * 15000;
  }
  
  // 10. 【P0修复】绝对上限，防止需求溢出
  // 任何单一层级的需求不超过100000单位
  demand = Math.min(demand, 100000);
  
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
  // 基础消费率表（单位/月/人）- 全面提高约2倍
  // 注意：这些是标准化的消费单位，与商品定义中的单位对应
  const baseRates: Record<string, number> = {
    // === 原材料（主要是企业间交易，个人消费极低）===
    'grain': 1.0,            // 粮食：每人每月1.0单位（从0.5提高）
    'ore': 0.002,            // 矿石：几乎不直接消费
    'timber': 0.02,          // 木材：少量DIY需求
    'coal': 0.04,            // 煤炭：取暖需求
    'cotton': 0.01,          // 棉花：不直接消费
    'oil': 0.2,              // 原油：不直接消费
    'rubber': 0.002,         // 橡胶：不直接消费
    
    // === 基础加工品 ===
    'steel': 0.02,           // 钢材：建筑装修需求
    'plastic': 0.1,          // 塑料：日用品需求
    'textiles': 0.2,         // 纺织品：家居需求
    'glass': 0.04,           // 玻璃：家装需求
    'chemicals': 0.02,       // 化学品：清洁用品等
    'paper': 1.0,            // 纸张：办公和生活需求
    'cement': 0.02,          // 水泥：装修需求
    
    // === 中间产品 ===
    'components': 0.02,      // 电子元件：DIY需求
    'machinery': 0.002,      // 机械：几乎不直接消费
    'semiconductors': 0.002, // 半导体：不直接消费
    'batteries': 0.1,        // 电池：各类设备需求
    
    // === 最终消费品（提高约2倍）===
    'food': 6.0,             // 食品：每人每月6份（从3提高）
    'beverages': 10.0,       // 饮料：每人每月10瓶（从5提高）
    'clothing': 0.6,         // 服装：每人每月0.6件（从0.3提高）
    'processed-food': 4.0,   // 加工食品：每人每月4份（从2提高）
    'fuel': 20,              // 燃油：每人每月20升（从10提高）
    'electricity': 100,      // 电力：每人每月100度（从50提高）
    
    // === 耐用消费品（提高约2倍）===
    'smartphone': 0.04,      // 手机：每人每月0.04台（从0.02提高）
    'premium-phone': 0.016,  // 高端手机：从0.008提高
    'budget-phone': 0.06,    // 平价手机：从0.03提高
    'computer': 0.02,        // 电脑：从0.01提高
    'appliances': 0.01,      // 家电：从0.005提高
    'furniture': 0.006,      // 家具：从0.003提高
    'car': 0.002,            // 汽车：从0.001提高
    'electric-car': 0.0016,  // 电动车：从0.0008提高
    
    // === 奢侈品（提高约2倍）===
    'luxury-goods': 0.001,   // 奢侈品：从0.0005提高
    'jewelry': 0.0004,       // 珠宝：从0.0002提高
    
    // === 新兴产品（提高约2倍）===
    'drone': 0.0006,         // 无人机：从0.0003提高
    'ev-battery': 0.0004,    // 电动车电池：从0.0002提高
    'solar-panel': 0.0002,   // 太阳能板：从0.0001提高
    
    // === 新增日化和其他消费品 ===
    'cosmetics': 0.3,        // 化妆品
    'skincare': 0.4,         // 护肤品
    'detergent': 0.5,        // 洗涤用品
    'shampoo': 0.3,          // 洗发护发
    'toothpaste': 0.2,       // 口腔护理
    'snacks': 1.0,           // 零食
    'organic-food': 0.5,     // 有机食品
    'pet-food': 0.3,         // 宠物食品
    'meat': 2.0,             // 肉类
    'dairy': 1.5,            // 乳制品
    'frozen-food': 0.8,      // 冷冻食品
    'canned-food': 0.6,      // 罐头食品
    'vegetables': 3.0,       // 蔬菜
    'fruits': 2.5,           // 水果
    'fish': 0.8,             // 水产
    'beer': 2.0,             // 啤酒
    'wine': 0.3,             // 葡萄酒
    'spirits': 0.15,         // 烈酒
    'tea-product': 0.4,      // 茶饮
    'coffee-product': 0.5,   // 咖啡
    'candy': 0.8,            // 糖果
    'cigarettes': 0.5,       // 烟草
    'books': 0.2,            // 图书
    'magazines': 0.3,        // 杂志
    'toy': 0.1,              // 玩具
    'video-game': 0.05,      // 电子游戏
    'sports-equipment': 0.02,// 运动器材
    'shoes': 0.15,           // 鞋类
    'wool-clothing': 0.08,   // 毛织品
    'leather-goods': 0.03,   // 皮具
    'sanitary-ware': 0.005,  // 卫浴设备
    'tableware': 0.02,       // 餐具
    'decoration': 0.01,      // 装饰材料
    'bicycle': 0.005,        // 自行车
    'motorcycle': 0.001,     // 摩托车
    'electric-scooter': 0.002,// 电动滑板车
    'router': 0.01,          // 路由器
    'tablet': 0.015,         // 平板电脑
    'smartwatch': 0.02,      // 智能手表
    'vr-device': 0.005,      // VR设备
    'smart-robot': 0.001,    // 智能机器人
    'grape': 1.0,            // 葡萄
    'sugar': 0.5,            // 糖
    'edible-oil': 0.3,       // 食用油
    'flour': 0.8,            // 面粉
  };
  
  // 获取基础消费率，根据商品类别设置合理默认值（提高默认值）
  let baseRate = baseRates[goods.key];
  if (baseRate === undefined) {
    // 根据商品类别设置默认值（全部提高约2倍）
    switch (goods.category) {
      case 'raw':
        baseRate = 0.02;    // 原材料默认极低（从0.01提高）
        break;
      case 'basic':
        baseRate = 0.1;     // 基础品默认低（从0.05提高）
        break;
      case 'intermediate':
        baseRate = 0.04;    // 中间品默认低（从0.02提高）
        break;
      case 'final':
        baseRate = goods.isConsumerGood ? 1.0 : 0.04;  // 消费品默认中等（从0.5/0.02提高）
        break;
      default:
        baseRate = 0.02;
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
 *
 * 【P0修复】增加需求上限检查，防止需求爆炸
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
    
    // 【P0修复v2】全局需求上限，防止需求失控
    // 使用多重约束确保需求合理
    const currentSupply = world.goods.supplies[goods.id];
    
    // 约束1: 基于供给的动态上限（供给的100倍）
    // 当供给>10时，使用供给倍数；否则使用基础上限
    const supplyBasedMax = currentSupply > 10
      ? currentSupply * MAX_SUPPLY_DEMAND_RATIO
      : 10000;  // 供给极低时的保底值
    
    // 约束2: 基于商品价格的合理消费上限
    // 昂贵商品需求量应该更低
    const priceBasedMax = 100000 * (100 / Math.max(10, goods.basePrice));
    
    // 约束3: 绝对上限 - 单个消费品每tick需求不超过50万
    const absoluteMax = 500000;
    
    // 取最小值作为最终上限
    const maxDemand = Math.min(supplyBasedMax, priceBasedMax, absoluteMax);
    newDemand = Math.min(newDemand, maxDemand);
    
    // 使用滑动平均更新需求
    const oldDemand = world.goods.demands[goods.id];
    if (oldDemand > 0) {
      world.goods.demands[goods.id] = newDemand * smoothingFactor + oldDemand * (1 - smoothingFactor);
    } else {
      world.goods.demands[goods.id] = newDemand;
    }
  }
  
  // 【P0修复】计算并添加派生需求（供应链需求传导）
  calculateDerivedDemand(world);
}

/**
 * 【P0修复】计算派生需求 - 供应链需求传导
 *
 * 原理：最终产品的需求会向上游传导
 * 例如：服装需求 → 纺织品需求 → 棉花需求
 *
 * 算法：
 * 1. 遍历所有配方
 * 2. 对于每个配方的输出商品，获取其当前需求量
 * 3. 根据配方的输入输出比例，计算输入商品的派生需求
 * 4. 使用衰减系数（0.6）避免需求过度放大
 *
 * 【P3修复】新增企业/机构需求
 * B2B商品（非消费品）由企业和机构购买：
 * - 医院需要：疫苗、医用耗材、诊断设备、手术设备、抗生素
 * - 航空公司需要：航空部件
 * - 工厂需要：工业机器人、光伏系统、储能系统
 * - 发电站需要：风机叶片、光伏板
 */
export function calculateDerivedDemand(world: GameWorld): void {
  // 派生需求衰减系数：防止上游需求过度膨胀
  const DERIVED_DEMAND_FACTOR = 0.6;
  
  // 临时存储派生需求增量
  const derivedDemands = new Float32Array(ACTUAL_GOODS_COUNT);
  
  // 遍历所有配方
  for (const recipe of RECIPES) {
    // 跳过无输出的配方（如纯采掘）
    if (recipe.outputs.length === 0) continue;
    
    // 计算输出商品的总需求
    let outputDemandTotal = 0;
    for (const output of recipe.outputs) {
      outputDemandTotal += world.goods.demands[output.goodsId] || 0;
    }
    
    // 如果输出商品没有需求，跳过
    if (outputDemandTotal <= 0) continue;
    
    // 计算输出总量（用于比例计算）
    let outputAmountTotal = 0;
    for (const output of recipe.outputs) {
      outputAmountTotal += output.amount;
    }
    
    if (outputAmountTotal <= 0) continue;
    
    // 计算需要的生产批次数（基于需求和产出比例）
    // 使用最大输出商品的需求/产出比
    let maxBatches = 0;
    for (const output of recipe.outputs) {
      const demand = world.goods.demands[output.goodsId] || 0;
      const batchesNeeded = demand / output.amount;
      maxBatches = Math.max(maxBatches, batchesNeeded);
    }
    
    // 为每个输入商品添加派生需求
    for (const input of recipe.inputs) {
      // 派生需求 = 批次数 × 输入量 × 衰减系数
      const derivedDemand = maxBatches * input.amount * DERIVED_DEMAND_FACTOR;
      derivedDemands[input.goodsId] += derivedDemand;
    }
  }
  
  // 将派生需求添加到世界需求中（使用平滑过渡）
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    if (derivedDemands[i] > 0) {
      const currentDemand = world.goods.demands[i];
      // 取当前需求和派生需求的较大者
      // 这确保了上游商品至少有足够的需求来满足下游生产
      world.goods.demands[i] = Math.max(currentDemand, derivedDemands[i]);
      
      // 如果派生需求显著大于当前需求，进行平滑过渡
      if (derivedDemands[i] > currentDemand * 1.5) {
        // 使用50%的派生需求增量
        world.goods.demands[i] = currentDemand + (derivedDemands[i] - currentDemand) * 0.5;
      }
    }
  }
  
  // 【P3修复】添加企业/机构需求（B2B商品的固定需求基础）
  // 这些商品是B2B商品，由医院、航空公司、工厂等机构购买
  addInstitutionalDemand(world, derivedDemands);
  
  // 调试日志（每10天输出一次）
  if (world.tick % (TICKS_PER_DAY * 10) === 0) {
    let topDerived: Array<{id: number, name: string, derived: number}> = [];
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      if (derivedDemands[i] > 100) {
        const goods = ALL_GOODS[i];
        if (goods) {
          topDerived.push({id: i, name: goods.name, derived: derivedDemands[i]});
        }
      }
    }
    topDerived.sort((a, b) => b.derived - a.derived);
    if (topDerived.length > 0) {
      console.log(`[派生需求 T${world.tick}] Top5:`,
        topDerived.slice(0, 5).map(d => `${d.name}:${d.derived.toFixed(0)}`).join(', '));
    }
  }
}

/**
 * 【P3修复】添加机构需求 - B2B商品的固定需求
 *
 * 这些商品不是消费品，需要由机构/企业购买：
 * - 医疗机构：疫苗、抗生素、医用耗材、诊断设备、手术设备
 * - 航空企业：航空部件
 * - 能源企业：光伏板、风机叶片、光伏系统、储能系统
 * - 制造企业：工业机器人、建材成品
 *
 * 需求量基于经济周期和时间增长
 */
function addInstitutionalDemand(world: GameWorld, derivedDemands: Float32Array): void {
  // 经济周期调整系数
  const cycleMultiplier = 0.8 + world.economyStats.cyclePosition * 0.4;
  
  // 时间增长系数（每年增长10%，上限2倍）
  const yearsElapsed = world.tick / (TICKS_PER_DAY * 360);
  const growthMultiplier = Math.min(2.0, 1.0 + yearsElapsed * 0.1);
  
  // 基础需求系数
  const baseFactor = cycleMultiplier * growthMultiplier;
  
  // 机构需求配置表：[商品ID, 基础日需求量, 机构类型描述]
  const institutionalDemands: Array<[number, number, string]> = [
    // 医疗机构需求
    [73, 50, '医院-疫苗'],          // 疫苗：每天50批
    [72, 100, '医院-抗生素'],       // 抗生素：每天100批
    [77, 200, '医院-医用耗材'],     // 医用耗材：每天200箱
    [78, 5, '医院-诊断设备'],       // 诊断设备：每天5台
    [79, 1, '医院-手术设备'],       // 手术设备：每天1台
    
    // 航空企业需求
    [33, 20, '航空-航空部件'],      // 航空部件：每天20套
    
    // 能源企业需求
    [34, 100, '能源-光伏板'],       // 光伏板：每天100块
    [35, 30, '能源-风机叶片'],      // 风机叶片：每天30片
    [49, 10, '能源-光伏系统'],      // 光伏系统：每天10套
    [50, 8, '能源-储能系统'],       // 储能系统：每天8套
    
    // 制造企业需求
    [51, 15, '工厂-工业机器人'],    // 工业机器人：每天15台
    [47, 200, '建筑-建材成品'],     // 建材成品：每天200套
    
    // 物流企业需求
    [37, 500, '物流-包装材料'],     // 包装材料：每天500套
  ];
  
  // 应用机构需求
  for (const [goodsId, baseDemand, _desc] of institutionalDemands) {
    if (goodsId < ACTUAL_GOODS_COUNT) {
      const dailyDemand = baseDemand * baseFactor;
      // 转换为每tick需求（除以24）
      const tickDemand = dailyDemand / TICKS_PER_DAY;
      
      // 累加到派生需求中
      derivedDemands[goodsId] += tickDemand;
      
      // 同时直接更新世界需求（确保需求立即生效）
      const currentDemand = world.goods.demands[goodsId];
      world.goods.demands[goodsId] = Math.max(currentDemand, tickDemand * 24);
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
 * 每日未满足需求衰减与供需比约束
 * 防止需求无限累积，保持市场平衡
 *
 * 调用时机：每天结束时（tick % 24 === 0）
 * 衰减逻辑：未满足的需求保留90%，10%衰减掉
 * 【新增】强制供需比约束：确保demand/supply <= MAX_SUPPLY_DEMAND_RATIO
 */
export function decayUnmetDemand(world: GameWorld): void {
  // 每天结束时执行衰减
  if (world.tick % TICKS_PER_DAY !== 0) return;
  
  const DECAY_RATE = 0.9;  // 保留90%的未满足需求
  const MINIMUM_DEMAND_FLOOR = 50;  // 每种商品最低需求50单位
  
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    let currentDemand = world.goods.demands[i];
    const supply = world.goods.supplies[i];
    
    // 【P0修复v2】强制供需比约束
    // 在衰减前先检查并限制供需比
    if (supply > 0) {
      const currentRatio = currentDemand / supply;
      if (currentRatio > MAX_SUPPLY_DEMAND_RATIO) {
        // 将需求限制到供给的MAX_SUPPLY_DEMAND_RATIO倍
        currentDemand = supply * MAX_SUPPLY_DEMAND_RATIO;
        world.goods.demands[i] = currentDemand;
      }
    } else if (currentDemand > 100000) {
      // 供给为0但需求很大，限制需求上限
      currentDemand = 100000;
      world.goods.demands[i] = currentDemand;
    }
    
    // 只对未满足的需求部分进行衰减
    if (currentDemand > supply && currentDemand > 0) {
      const satisfiedRatio = supply / currentDemand;
      const satisfiedDemand = currentDemand * satisfiedRatio;
      const unsatisfiedDemand = currentDemand * (1 - satisfiedRatio);
      world.goods.demands[i] = satisfiedDemand + unsatisfiedDemand * DECAY_RATE;
    }
    
    // 确保需求不低于最低底线（针对消费品）
    const goods = ALL_GOODS[i];
    if (goods && goods.isConsumerGood) {
      const priceAdjustedFloor = MINIMUM_DEMAND_FLOOR * (100 / Math.max(10, goods.basePrice));
      world.goods.demands[i] = Math.max(world.goods.demands[i], priceAdjustedFloor);
    }
    
    // 同时重置供给数据（每天重新计算）
    world.goods.supplies[i] *= 0.7;
  }
  
  // 调试日志
  if (world.tick % (TICKS_PER_DAY * 10) === 0) {
    let totalDemand = 0;
    let totalSupply = 0;
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      totalDemand += world.goods.demands[i];
      totalSupply += world.goods.supplies[i];
    }
    console.log(`[需求衰减 T${world.tick}] 总需求:${totalDemand.toFixed(0)}, 总供给:${totalSupply.toFixed(0)}, 衰减率:${DECAY_RATE}`);
  }
}