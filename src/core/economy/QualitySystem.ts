/**
 * 商品品质等级系统
 * 商品分为5个品质等级，影响价格和市场需求
 */

// ==================== 类型定义 ====================

/**
 * 品质等级枚举
 */
export enum QualityGrade {
  POOR = 0,      // 劣质 - 70% 基准价
  STANDARD = 1,  // 标准 - 100% 基准价
  GOOD = 2,      // 良好 - 125% 基准价
  PREMIUM = 3,   // 优质 - 160% 基准价
  LUXURY = 4,    // 奢华 - 220% 基准价
}

/**
 * 品质等级信息
 */
export interface QualityInfo {
  grade: QualityGrade;
  name: string;
  description: string;
  priceMultiplier: number;
  demandMultiplier: number;  // 需求倍数（高品质需求较少但单价高）
  color: string;             // UI显示颜色
}

/**
 * 库存品质分布
 */
export interface QualityDistribution {
  [QualityGrade.POOR]: number;
  [QualityGrade.STANDARD]: number;
  [QualityGrade.GOOD]: number;
  [QualityGrade.PREMIUM]: number;
  [QualityGrade.LUXURY]: number;
}

/**
 * 品质订单
 */
export interface QualityOrder {
  goodsId: number;
  quality: QualityGrade;
  quantity: number;
  price: number;
}

// ==================== 品质等级配置 ====================

export const QUALITY_INFO: Record<QualityGrade, QualityInfo> = {
  [QualityGrade.POOR]: {
    grade: QualityGrade.POOR,
    name: '劣质',
    description: '低于标准的产品，适合价格敏感市场',
    priceMultiplier: 0.7,
    demandMultiplier: 1.5,  // 需求较高（便宜货）
    color: '#9ca3af',
  },
  [QualityGrade.STANDARD]: {
    grade: QualityGrade.STANDARD,
    name: '标准',
    description: '符合行业标准的普通产品',
    priceMultiplier: 1.0,
    demandMultiplier: 1.0,
    color: '#60a5fa',
  },
  [QualityGrade.GOOD]: {
    grade: QualityGrade.GOOD,
    name: '良好',
    description: '高于标准的优质产品',
    priceMultiplier: 1.25,
    demandMultiplier: 0.7,
    color: '#4ade80',
  },
  [QualityGrade.PREMIUM]: {
    grade: QualityGrade.PREMIUM,
    name: '优质',
    description: '精心制作的高端产品',
    priceMultiplier: 1.6,
    demandMultiplier: 0.4,
    color: '#a78bfa',
  },
  [QualityGrade.LUXURY]: {
    grade: QualityGrade.LUXURY,
    name: '奢华',
    description: '顶级工艺的奢侈品级别产品',
    priceMultiplier: 2.2,
    demandMultiplier: 0.15,
    color: '#fbbf24',
  },
};

// ==================== 商品品质分类 ====================

/**
 * 商品品质类型
 * 不同类型的商品对品质的敏感度不同
 */
export enum GoodsQualityType {
  RAW_MATERIAL = 'raw_material',       // 原材料 - 品质影响小
  INDUSTRIAL = 'industrial',           // 工业品 - 品质影响中等
  CONSUMER = 'consumer',               // 消费品 - 品质影响大
  LUXURY_GOODS = 'luxury',             // 奢侈品 - 品质影响极大
  FOOD = 'food',                       // 食品 - 品质影响新鲜度
}

/**
 * 商品品质敏感度配置
 */
export const QUALITY_SENSITIVITY: Record<GoodsQualityType, {
  priceSensitivity: number;     // 价格对品质的敏感度
  demandSensitivity: number;    // 需求对品质的敏感度
  qualityDecay: number;         // 品质随时间的衰减率（每天）
}> = {
  [GoodsQualityType.RAW_MATERIAL]: {
    priceSensitivity: 0.3,
    demandSensitivity: 0.2,
    qualityDecay: 0,
  },
  [GoodsQualityType.INDUSTRIAL]: {
    priceSensitivity: 0.6,
    demandSensitivity: 0.4,
    qualityDecay: 0,
  },
  [GoodsQualityType.CONSUMER]: {
    priceSensitivity: 1.0,
    demandSensitivity: 0.8,
    qualityDecay: 0.001,
  },
  [GoodsQualityType.LUXURY_GOODS]: {
    priceSensitivity: 1.5,
    demandSensitivity: 1.2,
    qualityDecay: 0.0005,
  },
  [GoodsQualityType.FOOD]: {
    priceSensitivity: 0.8,
    demandSensitivity: 1.0,
    qualityDecay: 0.02,  // 食品品质衰减快
  },
};

/**
 * 商品到品质类型的映射
 */
export const GOODS_QUALITY_TYPE: Map<number, GoodsQualityType> = new Map([
  // 原材料 (0-15)
  [0, GoodsQualityType.RAW_MATERIAL],   // 铁矿石
  [1, GoodsQualityType.RAW_MATERIAL],   // 铜矿石
  [2, GoodsQualityType.RAW_MATERIAL],   // 铝矿石
  [3, GoodsQualityType.RAW_MATERIAL],   // 煤炭
  [4, GoodsQualityType.RAW_MATERIAL],   // 原油
  [5, GoodsQualityType.RAW_MATERIAL],   // 天然气
  [6, GoodsQualityType.RAW_MATERIAL],   // 木材
  [7, GoodsQualityType.RAW_MATERIAL],   // 棉花
  [8, GoodsQualityType.FOOD],           // 粮食
  [9, GoodsQualityType.RAW_MATERIAL],   // 硅石
  [10, GoodsQualityType.RAW_MATERIAL],  // 稀土
  
  // 基础工业品 (14-20)
  [14, GoodsQualityType.INDUSTRIAL],    // 钢材
  [15, GoodsQualityType.INDUSTRIAL],    // 铜材
  [16, GoodsQualityType.INDUSTRIAL],    // 铝材
  [17, GoodsQualityType.INDUSTRIAL],    // 塑料
  [18, GoodsQualityType.INDUSTRIAL],    // 玻璃
  [19, GoodsQualityType.INDUSTRIAL],    // 橡胶
  [20, GoodsQualityType.INDUSTRIAL],    // 化肥
  
  // 消费品 (24-35)
  [24, GoodsQualityType.FOOD],          // 加工食品
  [25, GoodsQualityType.CONSUMER],      // 饮料
  [26, GoodsQualityType.CONSUMER],      // 家电
  [27, GoodsQualityType.CONSUMER],      // 电子产品
  [28, GoodsQualityType.CONSUMER],      // 汽车
  [29, GoodsQualityType.CONSUMER],      // 服装
  [30, GoodsQualityType.CONSUMER],      // 家具
  
  // 高端产品 (35-45)
  [35, GoodsQualityType.LUXURY_GOODS],  // 珠宝
  [36, GoodsQualityType.LUXURY_GOODS],  // 奢侈品
  [37, GoodsQualityType.CONSUMER],      // 医药
  [38, GoodsQualityType.INDUSTRIAL],    // 军工
]);

// ==================== 工具函数 ====================

/**
 * 获取商品的品质类型
 */
export function getGoodsQualityType(goodsId: number): GoodsQualityType {
  return GOODS_QUALITY_TYPE.get(goodsId) ?? GoodsQualityType.INDUSTRIAL;
}

/**
 * 计算品质调整后的价格
 */
export function getQualityAdjustedPrice(
  basePrice: number,
  quality: QualityGrade,
  goodsId: number
): number {
  const qualityInfo = QUALITY_INFO[quality];
  const qualityType = getGoodsQualityType(goodsId);
  const sensitivity = QUALITY_SENSITIVITY[qualityType];
  
  // 计算品质价格修正（考虑敏感度）
  const priceModifier = 1 + (qualityInfo.priceMultiplier - 1) * sensitivity.priceSensitivity;
  
  return basePrice * priceModifier;
}

/**
 * 计算品质调整后的需求
 */
export function getQualityAdjustedDemand(
  baseDemand: number,
  quality: QualityGrade,
  goodsId: number
): number {
  const qualityInfo = QUALITY_INFO[quality];
  const qualityType = getGoodsQualityType(goodsId);
  const sensitivity = QUALITY_SENSITIVITY[qualityType];
  
  // 计算品质需求修正（考虑敏感度）
  const demandModifier = 1 + (qualityInfo.demandMultiplier - 1) * sensitivity.demandSensitivity;
  
  return baseDemand * demandModifier;
}

/**
 * 创建空的品质分布
 */
export function createEmptyQualityDistribution(): QualityDistribution {
  return {
    [QualityGrade.POOR]: 0,
    [QualityGrade.STANDARD]: 0,
    [QualityGrade.GOOD]: 0,
    [QualityGrade.PREMIUM]: 0,
    [QualityGrade.LUXURY]: 0,
  };
}

/**
 * 获取品质分布的总量
 */
export function getTotalQuantity(distribution: QualityDistribution): number {
  return distribution[QualityGrade.POOR]
    + distribution[QualityGrade.STANDARD]
    + distribution[QualityGrade.GOOD]
    + distribution[QualityGrade.PREMIUM]
    + distribution[QualityGrade.LUXURY];
}

/**
 * 获取品质分布的平均品质
 */
export function getAverageQuality(distribution: QualityDistribution): number {
  const total = getTotalQuantity(distribution);
  if (total === 0) return QualityGrade.STANDARD;
  
  const weightedSum = 
    distribution[QualityGrade.POOR] * 0
    + distribution[QualityGrade.STANDARD] * 1
    + distribution[QualityGrade.GOOD] * 2
    + distribution[QualityGrade.PREMIUM] * 3
    + distribution[QualityGrade.LUXURY] * 4;
  
  return weightedSum / total;
}

/**
 * 获取品质分布的加权平均价格
 */
export function getAverageQualityPrice(
  distribution: QualityDistribution,
  basePrice: number,
  goodsId: number
): number {
  const total = getTotalQuantity(distribution);
  if (total === 0) return basePrice;
  
  let totalValue = 0;
  for (let grade = 0; grade <= 4; grade++) {
    const qty = distribution[grade as QualityGrade];
    const price = getQualityAdjustedPrice(basePrice, grade as QualityGrade, goodsId);
    totalValue += qty * price;
  }
  
  return totalValue / total;
}

/**
 * 根据生产条件决定产出品质分布
 * @param baseQuality 基础品质分（0-1，来自生产方式等）
 * @param randomSeed 随机种子
 */
export function determineProductionQuality(
  baseQuality: number,
  randomSeed: number = Math.random()
): QualityGrade {
  // 基础品质影响分布概率
  // baseQuality 0.0 -> 主要产出劣质
  // baseQuality 0.5 -> 主要产出标准
  // baseQuality 1.0 -> 主要产出优质/奢华
  
  const adjustedQuality = Math.max(0, Math.min(1, baseQuality));
  
  // 计算各等级概率
  let probabilities: number[];
  
  if (adjustedQuality < 0.2) {
    // 低品质生产
    probabilities = [0.5, 0.35, 0.12, 0.03, 0];
  } else if (adjustedQuality < 0.4) {
    // 较低品质
    probabilities = [0.2, 0.5, 0.22, 0.07, 0.01];
  } else if (adjustedQuality < 0.6) {
    // 标准品质
    probabilities = [0.05, 0.5, 0.3, 0.12, 0.03];
  } else if (adjustedQuality < 0.8) {
    // 较高品质
    probabilities = [0.02, 0.15, 0.45, 0.3, 0.08];
  } else {
    // 高品质生产
    probabilities = [0, 0.05, 0.2, 0.45, 0.3];
  }
  
  // 根据概率选择品质
  let cumulative = 0;
  for (let grade = 0; grade <= 4; grade++) {
    cumulative += probabilities[grade];
    if (randomSeed < cumulative) {
      return grade as QualityGrade;
    }
  }
  
  return QualityGrade.STANDARD;
}

/**
 * 品质衰减计算
 * 用于食品等易腐商品
 */
export function applyQualityDecay(
  distribution: QualityDistribution,
  goodsId: number,
  ticksPassed: number = 1
): QualityDistribution {
  const qualityType = getGoodsQualityType(goodsId);
  const decayRate = QUALITY_SENSITIVITY[qualityType].qualityDecay;
  
  if (decayRate === 0) {
    return distribution;
  }
  
  const result = { ...distribution };
  const daysPassed = ticksPassed / 24;
  const decayFactor = decayRate * daysPassed;
  
  // 高品质向低品质转移
  for (let grade = 4; grade > 0; grade--) {
    const decayAmount = result[grade as QualityGrade] * decayFactor;
    result[grade as QualityGrade] -= decayAmount;
    result[(grade - 1) as QualityGrade] += decayAmount;
  }
  
  // 最低品质商品损耗（变成废品）
  result[QualityGrade.POOR] *= (1 - decayFactor * 0.5);
  
  return result;
}

/**
 * 合并两个品质分布
 */
export function mergeQualityDistributions(
  a: QualityDistribution,
  b: QualityDistribution
): QualityDistribution {
  return {
    [QualityGrade.POOR]: a[QualityGrade.POOR] + b[QualityGrade.POOR],
    [QualityGrade.STANDARD]: a[QualityGrade.STANDARD] + b[QualityGrade.STANDARD],
    [QualityGrade.GOOD]: a[QualityGrade.GOOD] + b[QualityGrade.GOOD],
    [QualityGrade.PREMIUM]: a[QualityGrade.PREMIUM] + b[QualityGrade.PREMIUM],
    [QualityGrade.LUXURY]: a[QualityGrade.LUXURY] + b[QualityGrade.LUXURY],
  };
}

/**
 * 从品质分布中消耗指定数量（优先消耗低品质）
 */
export function consumeFromDistribution(
  distribution: QualityDistribution,
  amount: number,
  preferHighQuality: boolean = false
): { consumed: QualityDistribution; remaining: QualityDistribution } {
  const consumed = createEmptyQualityDistribution();
  const remaining = { ...distribution };
  
  let toConsume = amount;
  
  const order = preferHighQuality
    ? [4, 3, 2, 1, 0]  // 优先消耗高品质
    : [0, 1, 2, 3, 4]; // 优先消耗低品质
  
  for (const grade of order) {
    const available = remaining[grade as QualityGrade];
    const take = Math.min(available, toConsume);
    
    consumed[grade as QualityGrade] = take;
    remaining[grade as QualityGrade] -= take;
    toConsume -= take;
    
    if (toConsume <= 0) break;
  }
  
  return { consumed, remaining };
}

/**
 * 获取品质等级的显示名称
 */
export function getQualityName(quality: QualityGrade): string {
  return QUALITY_INFO[quality].name;
}

/**
 * 获取品质等级的颜色
 */
export function getQualityColor(quality: QualityGrade): string {
  return QUALITY_INFO[quality].color;
}

/**
 * 格式化品质分布为可读字符串
 */
export function formatQualityDistribution(distribution: QualityDistribution): string {
  const parts: string[] = [];
  
  for (let grade = 4; grade >= 0; grade--) {
    const qty = distribution[grade as QualityGrade];
    if (qty > 0) {
      parts.push(`${QUALITY_INFO[grade as QualityGrade].name}: ${qty.toFixed(1)}`);
    }
  }
  
  return parts.length > 0 ? parts.join(', ') : '无';
}