/**
 * 需求曲线与消费者分层系统
 * 实现多层次消费者的需求模拟和价格弹性计算
 *
 * v4.0更新：使用getBuildingProduction替代RECIPES
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS, GoodsDefinition, CONSUMER_GOODS, GoodsId } from '@/data/goods';
import { BUILDINGS_BY_ID, BuildingId } from '@/data/buildings';
import { GOODS_COUNT, TICKS_PER_DAY, ACTUAL_GOODS_COUNT, MAX_SUPPLY_DEMAND_RATIO, MAX_INPUTS } from '@/core/constants';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import { getDemandPressure } from './MarketStats';

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
 * 中国 2019 全国缩略模型的 8 个收入层级
 */
export const CONSUMER_TIERS: ConsumerTier[] = [
  {
    id: 0,
    name: '极低收入层',
    population: 260000000,
    baseIncome: 1500,
    incomeVariance: 0.12,
    savingsRate: 0.01,
    pricePreference: 0.97,
    qualityPreference: 0.03,
    budgetShares: new Map([
      ['raw', 0.12],
      ['basic', 0.34],
      ['intermediate', 0.02],
      ['final', 0.52],
    ]),
  },
  {
    id: 1,
    name: '低收入层',
    population: 280000000,
    baseIncome: 2500,
    incomeVariance: 0.15,
    savingsRate: 0.03,
    pricePreference: 0.93,
    qualityPreference: 0.07,
    budgetShares: new Map([
      ['raw', 0.10],
      ['basic', 0.32],
      ['intermediate', 0.03],
      ['final', 0.55],
    ]),
  },
  {
    id: 2,
    name: '中低收入层',
    population: 290000000,
    baseIncome: 4000,
    incomeVariance: 0.18,
    savingsRate: 0.06,
    pricePreference: 0.85,
    qualityPreference: 0.15,
    budgetShares: new Map([
      ['raw', 0.08],
      ['basic', 0.28],
      ['intermediate', 0.05],
      ['final', 0.59],
    ]),
  },
  {
    id: 3,
    name: '普通工薪层',
    population: 250000000,
    baseIncome: 6500,
    incomeVariance: 0.22,
    savingsRate: 0.10,
    pricePreference: 0.72,
    qualityPreference: 0.28,
    budgetShares: new Map([
      ['raw', 0.05],
      ['basic', 0.22],
      ['intermediate', 0.08],
      ['final', 0.65],
    ]),
  },
  {
    id: 4,
    name: '中等收入层',
    population: 150000000,
    baseIncome: 10000,
    incomeVariance: 0.26,
    savingsRate: 0.16,
    pricePreference: 0.58,
    qualityPreference: 0.42,
    budgetShares: new Map([
      ['raw', 0.03],
      ['basic', 0.16],
      ['intermediate', 0.10],
      ['final', 0.71],
    ]),
  },
  {
    id: 5,
    name: '中高收入层',
    population: 90000000,
    baseIncome: 16000,
    incomeVariance: 0.30,
    savingsRate: 0.22,
    pricePreference: 0.42,
    qualityPreference: 0.58,
    budgetShares: new Map([
      ['raw', 0.02],
      ['basic', 0.11],
      ['intermediate', 0.13],
      ['final', 0.74],
    ]),
  },
  {
    id: 6,
    name: '高收入层',
    population: 50000000,
    baseIncome: 30000,
    incomeVariance: 0.36,
    savingsRate: 0.30,
    pricePreference: 0.25,
    qualityPreference: 0.75,
    budgetShares: new Map([
      ['raw', 0.015],
      ['basic', 0.08],
      ['intermediate', 0.16],
      ['final', 0.745],
    ]),
  },
  {
    id: 7,
    name: '富裕阶层',
    population: 30000000,
    baseIncome: 80000,
    incomeVariance: 0.45,
    savingsRate: 0.42,
    pricePreference: 0.08,
    qualityPreference: 0.92,
    budgetShares: new Map([
      ['raw', 0.01],
      ['basic', 0.05],
      ['intermediate', 0.18],
      ['final', 0.76],
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
  // 基础消费率表（单位/月/人）
  // 仅保留与当前 goods.ts 真实 key 对应的居民消费品，按中国 2019 口径做缩略。
  const baseRates: Record<string, number> = {
    // 农产品与基础食品
    grain: 0.9,
    seafood: 0.18,
    meat: 0.7,
    dairy: 0.6,
    processed_food: 1.8,
    frozen_food: 0.2,
    canned_food: 0.12,
    beverages: 4.5,
    snacks: 0.45,
    food: 3.2,
    organic_food: 0.06,
    pet_food: 0.04,

    // 能源与居住消费
    fuel: 5.0,
    electricity: 65,

    // 日常耐用品
    smartphone: 0.006,
    computer: 0.0015,
    appliances: 0.0025,
    furniture: 0.0015,
    clothing: 0.12,
    drone: 0.00004,

    // 交通工具
    car: 0.0012,
    electric_car: 0.00002,
    luxury_car: 0.000015,

    // 医疗与可选消费
    generic_drug: 0.08,
    patent_drug: 0.01,
    otc_drug: 0.06,
    jewelry: 0.00008,
    luxury_watch: 0.00003,
    designer_clothing: 0.0012,
  };
  
  // 获取基础消费率，根据商品类别设置保守默认值。
  let baseRate = baseRates[goods.key];
  if (baseRate === undefined) {
    switch (goods.category) {
      case 'raw':
        baseRate = 0.01;
        break;
      case 'basic':
        baseRate = 0.05;
        break;
      case 'intermediate':
        baseRate = 0.02;
        break;
      case 'final':
        baseRate = goods.isConsumerGood ? 0.3 : 0.02;
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
function calculateQualityMatch(_goods: GoodsDefinition, _tier: ConsumerTier): number {
  return 1.0;
}

function calculateBudgetShareForGoods(goodsDef: GoodsDefinition): number {
  let weightedBudgetShare = 0;
  let totalPopulation = 0;

  for (const tier of CONSUMER_TIERS) {
    weightedBudgetShare += (tier.budgetShares.get(goodsDef.category) ?? 0) * tier.population;
    totalPopulation += tier.population;
  }

  return totalPopulation > 0 ? weightedBudgetShare / totalPopulation : 0;
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
    budgetShare: calculateBudgetShareForGoods(goodsDef),
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
    // 昂贵商品需求量应该更低（v2价格体系：以¥800为基准参考价）
    const priceBasedMax = 100000 * (800 / Math.max(10, goods.basePrice));
    
    // 约束3: 绝对上限 - 单个消费品每tick需求不超过50万
    const absoluteMax = 500000;
    
    // 取最小值作为最终上限
    const maxDemand = Math.min(supplyBasedMax, priceBasedMax, absoluteMax);
    newDemand = Math.min(newDemand, maxDemand);
    
    // 使用非对称滑动平均更新需求
    // 核心思路：消费者"想要"商品是相对稳定的，不应因供给短缺而消失
    const oldDemand = world.goods.demands[goods.id];
    if (oldDemand > 0) {
      // 当新需求高于旧需求时，快速响应（消费者购买意愿增强）
      // 当新需求低于旧需求时，缓慢下降（消费者不会突然不想要某件商品）
      if (newDemand >= oldDemand) {
        // 需求上升：70%新+30%旧，响应更快
        world.goods.demands[goods.id] = newDemand * 0.7 + oldDemand * 0.3;
      } else {
        // 需求下降：30%新+70%旧，防止因短期供给中断导致需求崩溃
        world.goods.demands[goods.id] = newDemand * 0.3 + oldDemand * 0.7;
      }
      // 底线保护：永远不低于新鲜计算值的20%
      // 这确保即使供给完全中断，消费者"想要"的基本需求不会归零
      world.goods.demands[goods.id] = Math.max(world.goods.demands[goods.id], newDemand * 0.2);
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
 * v4.0更新：使用getBuildingProduction替代RECIPES
 *
 * 原理：最终产品的需求会向上游传导
 * 例如：服装需求 → 纺织品需求 → 棉花需求
 *
 * 算法：
 * 1. 遍历所有建筑的生产配置
 * 2. 对于每个生产配置的输出商品，获取其当前需求量
 * 3. 根据输入输出比例，计算输入商品的派生需求
 * 4. 使用衰减系数（0.6）避免需求过度放大
 *
 * 【P3修复】新增企业/机构需求
 * B2B商品（非消费品）由企业和机构购买：
 * - 医院需要：疫苗、医用耗材、诊断设备、手术设备、抗生素
 * - 航空公司需要：航空部件
 * - 工厂需要：工业机器人、光伏系统、储能系统
 * - 发电站需要：风机叶片、光伏板
 */
/**
 * 计算商品当前价格相对基准价的弹性需求乘数
 * Why: 派生需求与机构需求原本完全无视价格，导致价格触顶后下游仍按 batches 拉满，
 *      形成"价格 3.5x 钉死、需求不退潮"的死锁。引入弹性后，价格越高需求越低。
 * 适用范围：B2B 派生需求与机构需求；消费品需求已在 calculateMarketDemand 内应用。
 */
function priceElasticityMultiplier(world: GameWorld, goodsId: number): number {
  const def = ALL_GOODS[goodsId];
  if (!def) return 1.0;
  const baseValue = world.goods.baseValues[goodsId] || def.basePrice || 0;
  const currentPrice = world.goods.prices[goodsId] || 0;
  if (baseValue <= 0 || currentPrice <= 0) return 1.0;
  const priceRatio = currentPrice / baseValue;
  // priceElasticity 通常为负（-0.2 到 -1.5），价格涨则需求降
  // 防御：若 elasticity 配置为正或缺失，跳过（保持原行为）
  const elasticity = def.priceElasticity ?? 0;
  if (elasticity >= 0) return 1.0;
  // 派生/机构场景全量应用弹性（之前 ×0.7 衰减不够，5 年模拟仍触顶）
  // 限制乘数范围 [0.1, 2.5]：极端高价时需求最多衰减到 10%，刹车要足够强
  return Math.max(0.1, Math.min(2.5, Math.pow(priceRatio, elasticity)));
}

const ELECTRICITY_UNITS_PER_POWER_POINT = 1000;

function calculateOperationalElectricityDemand(world: GameWorld): number {
  let totalDemand = 0;

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    if (!world.buildings.isActive[buildingId]) continue;

    const buildingTypeId = world.buildings.types[buildingId];
    if (buildingTypeId === BuildingId.POWER_PLANT) continue;

    const buildingDef = BUILDINGS_BY_ID.get(buildingTypeId);
    if (!buildingDef || buildingDef.powerConsumption <= 0) continue;

    const level = Math.max(1, world.buildings.levels[buildingId] || 1);
    const efficiency = Math.max(0.1, world.buildings.efficiencies[buildingId] || 1);
    const levelMultiplier = buildingDef.capacityMultipliers[level - 1] ?? 1;

    totalDemand +=
      buildingDef.powerConsumption *
      ELECTRICITY_UNITS_PER_POWER_POINT *
      levelMultiplier *
      efficiency;
  }

  return totalDemand * priceElasticityMultiplier(world, GoodsId.ELECTRICITY);
}

export function calculateDerivedDemand(world: GameWorld): void {
  // 派生需求衰减系数：防止上游需求过度膨胀
  const DERIVED_DEMAND_FACTOR = 0.6;
  const BUFFER_REPLENISHMENT_DAYS = 3;
  
  // 临时存储派生需求增量
  const derivedDemands = new Float32Array(ACTUAL_GOODS_COUNT);
  
  const buildings = world.buildings;
  const operationalElectricityDemand = calculateOperationalElectricityDemand(world);

  if (operationalElectricityDemand > 0) {
    derivedDemands[GoodsId.ELECTRICITY] += operationalElectricityDemand;
    world.goods.demands[GoodsId.ELECTRICITY] = Math.max(
      world.goods.demands[GoodsId.ELECTRICITY],
      operationalElectricityDemand,
    );
  }

  // 只根据真实存在且活跃的建筑生成派生需求，不能用全建筑模板虚构供应链需求。
  for (let buildingId = 0; buildingId < buildings.count; buildingId++) {
    if (!buildings.isActive[buildingId]) continue;

    const production = getBuildingRecipeFromInstance(world, buildingId);
    if (production.inputs.length === 0 || production.outputs.length === 0) continue;

    let maxBatches = 0;
    for (const output of production.outputs) {
      const demand = world.goods.demands[output.goodsId] || 0;
      const batchesNeeded = demand / output.amount;
      maxBatches = Math.max(maxBatches, batchesNeeded);
    }

    const level = Math.max(1, buildings.levels[buildingId] || 1);
    const efficiency = Math.max(0.1, buildings.efficiencies[buildingId] || 1);
    const ticksRequired = Math.max(1, production.ticksRequired || 1);
    const levelCapacityMultiplier = 1 + (level - 1) * 0.25;
    const dailyBatchCapacity = Math.max(0, (TICKS_PER_DAY / ticksRequired) * efficiency * levelCapacityMultiplier);
    const effectiveBatches = maxBatches > 0 ? Math.min(maxBatches, dailyBatchCapacity) : 0;
    const inputOffset = buildingId * MAX_INPUTS;

    for (let inputIndex = 0; inputIndex < production.inputs.length; inputIndex++) {
      const input = production.inputs[inputIndex];
      const currentBuffer = buildings.inputBuffers[inputOffset + inputIndex] || 0;
      const targetBuffer = (input.amount * 7 * TICKS_PER_DAY) / ticksRequired;
      const missingBuffer = Math.max(0, targetBuffer - currentBuffer);
      const missingBufferRatio = targetBuffer > 0
        ? Math.max(0, Math.min(1, missingBuffer / targetBuffer))
        : 1;
      if (missingBufferRatio <= 0) continue;

      const elasticityMult = priceElasticityMultiplier(world, input.goodsId);
      const outputPullDemand =
        effectiveBatches * input.amount * DERIVED_DEMAND_FACTOR * elasticityMult * missingBufferRatio;
      const structuralReplenishmentDemand =
        Math.min(missingBuffer, input.amount * dailyBatchCapacity * BUFFER_REPLENISHMENT_DAYS) * elasticityMult;
      const derivedDemand = Math.max(outputPullDemand, structuralReplenishmentDemand);
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
  
  // 时间增长系数（每年增长 5%，上限 1.3 倍）
  // Why: 5 年模拟显示原 2.0 上限把机构需求在 Y5 拉爆，建材成品/电子元件/航空部件/包装材料/抗生素持续触 3.5x
  // 价格天花板。年增 10%/上限 2x 等同于把市场逼到通胀失控状态；下调到年增 5%/上限 1.3x 后允许中速扩张。
  const yearsElapsed = world.tick / (TICKS_PER_DAY * 360);
  const growthMultiplier = Math.min(1.3, 1.0 + yearsElapsed * 0.05);
  
  // 基础需求系数
  const baseFactor = cycleMultiplier * growthMultiplier;
  
  // 机构需求配置表：[商品ID, 基础日需求量, 机构类型描述]
  // Why: 5 年长周期模拟显示 13 项 B2G/机构品长期触 3.5x 价格天花板，根因是机构需求过猛
  // 已按 Y5 实测压力差异化下调（触顶最严重的 ×0.4，边缘的 ×0.5-0.6，未触顶保持）
  const institutionalDemands: Array<[number, number, string]> = [
    // 医疗机构需求
    [GoodsId.VACCINE, 20, '医院-疫苗'],
    [GoodsId.ANTIBIOTICS, 40, '医院-抗生素'],
    [GoodsId.MEDICAL_SUPPLIES, 400, '医院-医用耗材'],
    [GoodsId.MEDICAL_DEVICE, 5, '医院-诊断设备'],
    [GoodsId.OTC_DRUG, 150, '医院-基础药品'],

    // 航空企业需求
    [GoodsId.AIRCRAFT_PARTS, 10, '航空-航空部件'],

    // 能源企业需求
    [GoodsId.SOLAR_PANEL, 60, '能源-光伏板'],
    [GoodsId.WIND_BLADE, 15, '能源-风机叶片'],
    [GoodsId.SOLAR_SYSTEM, 5, '能源-光伏系统'],
    [GoodsId.ENERGY_STORAGE, 5, '能源-储能系统'],

    // 制造企业需求
    [GoodsId.INDUSTRIAL_ROBOT, 8, '工厂-工业机器人'],
    [GoodsId.BUILDING_PRODUCTS, 100, '建筑-建材成品'],

    // 物流企业需求
    [GoodsId.PACKAGING, 200, '物流-包装材料'],
  ];
  
  // 应用机构需求（含价格弹性反馈）
  // Why: 机构虽是 B2G 必需品，但医院/政府/能源企业有预算约束；价格涨到 3x 时实际采购量会减少
  for (const [goodsId, baseDemand, _desc] of institutionalDemands) {
    if (goodsId < ACTUAL_GOODS_COUNT) {
      const elasticityMult = priceElasticityMultiplier(world, goodsId);
      const dailyDemand = baseDemand * baseFactor * elasticityMult;
      // 转换为每tick需求（除以24）
      const tickDemand = dailyDemand / TICKS_PER_DAY;

      // 累加到派生需求中
      derivedDemands[goodsId] += tickDemand;

      // 同时直接更新世界需求（确保需求立即生效）
      const currentDemand = world.goods.demands[goodsId];
      world.goods.demands[goodsId] = Math.max(currentDemand, dailyDemand);
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
  const pressure = world.goods.demandPressure;

  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    let currentDemand = pressure[i];
    const supply = world.goods.supplies[i];

    // 强制供需比约束
    if (supply > 0) {
      const currentRatio = currentDemand / supply;
      if (currentRatio > MAX_SUPPLY_DEMAND_RATIO) {
        currentDemand = supply * MAX_SUPPLY_DEMAND_RATIO;
        pressure[i] = currentDemand;
      }
    } else if (currentDemand > 100000) {
      currentDemand = 100000;
      pressure[i] = currentDemand;
    }

    // 只对未满足的需求部分进行衰减
    if (currentDemand > supply && currentDemand > 0) {
      const satisfiedRatio = supply / currentDemand;
      const satisfiedDemand = currentDemand * satisfiedRatio;
      const unsatisfiedDemand = currentDemand * (1 - satisfiedRatio);
      pressure[i] = satisfiedDemand + unsatisfiedDemand * DECAY_RATE;
    }

    // 供给平滑衰减已移至PriceEngine统一处理，此处仅衰减需求
  }

  // 调试日志
  if (world.tick % (TICKS_PER_DAY * 10) === 0) {
    let totalDemand = 0;
    let totalSupply = 0;
    let dormantCount = 0;
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      totalDemand += getDemandPressure(world, i);
      totalSupply += world.goods.supplies[i];
      if (world.goods.supplies[i] < 1) dormantCount++;
    }
    console.log(`[需求衰减 T${world.tick}] 总缺口:${totalDemand.toFixed(0)}, 总供给:${totalSupply.toFixed(0)}, 零供应:${dormantCount}`);
  }
}
