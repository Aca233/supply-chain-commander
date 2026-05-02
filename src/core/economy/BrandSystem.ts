/**
 * 品牌溢价系统
 * 管理公司品牌价值和产品溢价能力
 */

// ==================== 类型定义 ====================

/**
 * 品牌等级
 */
export enum BrandTier {
  UNKNOWN = 0,     // 无品牌
  LOCAL = 1,       // 地方品牌
  REGIONAL = 2,    // 区域品牌
  NATIONAL = 3,    // 全国品牌
  PREMIUM = 4,     // 高端品牌
  LUXURY = 5,      // 奢华品牌
}

/**
 * 品牌信息
 */
export interface Brand {
  companyId: number;
  name: string;
  tier: BrandTier;
  
  // 核心指标
  awareness: number;        // 品牌知名度 0-100
  reputation: number;       // 品牌声誉 0-100
  loyalty: number;          // 客户忠诚度 0-100
  
  // 品牌资产
  brandValue: number;       // 品牌价值（金额）
  marketPosition: number;   // 市场定位 0-100 (0=经济, 100=奢华)
  
  // 历史数据
  createdTick: number;
  lastUpdatedTick: number;
  
  // 品类专长
  categoryStrengths: Map<number, number>;  // goodsId -> 强度0-100
}

/**
 * 品牌事件
 */
export interface BrandEvent {
  type: BrandEventType;
  companyId: number;
  impact: number;           // 影响值 -100 to +100
  tick: number;
  description: string;
}

/**
 * 品牌事件类型
 */
export enum BrandEventType {
  QUALITY_ISSUE = 'quality_issue',           // 质量问题
  PRODUCT_RECALL = 'product_recall',         // 产品召回
  INNOVATION = 'innovation',                  // 创新成功
  AWARD = 'award',                           // 获奖
  SCANDAL = 'scandal',                        // 丑闻
  MARKETING_CAMPAIGN = 'marketing_campaign', // 营销活动
  CUSTOMER_COMPLAINT = 'customer_complaint', // 客户投诉
  POSITIVE_REVIEW = 'positive_review',       // 好评
}

/**
 * 品牌投资类型
 */
export enum BrandInvestmentType {
  ADVERTISING = 'advertising',       // 广告投放
  SPONSORSHIP = 'sponsorship',       // 赞助活动
  PUBLIC_RELATIONS = 'pr',           // 公关活动
  CUSTOMER_SERVICE = 'service',      // 客户服务
  QUALITY_IMPROVEMENT = 'quality',   // 质量提升
}

// ==================== 配置数据 ====================

/**
 * 品牌等级配置
 */
export const BRAND_TIER_CONFIG: Record<BrandTier, {
  name: string;
  minAwareness: number;
  minReputation: number;
  priceMultiplier: number;
  demandMultiplier: number;
  color: string;
}> = {
  [BrandTier.UNKNOWN]: {
    name: '无品牌',
    minAwareness: 0,
    minReputation: 0,
    priceMultiplier: 0.9,
    demandMultiplier: 1.0,
    color: '#9ca3af',
  },
  [BrandTier.LOCAL]: {
    name: '地方品牌',
    minAwareness: 10,
    minReputation: 20,
    priceMultiplier: 1.0,
    demandMultiplier: 1.05,
    color: '#60a5fa',
  },
  [BrandTier.REGIONAL]: {
    name: '区域品牌',
    minAwareness: 30,
    minReputation: 40,
    priceMultiplier: 1.1,
    demandMultiplier: 1.1,
    color: '#4ade80',
  },
  [BrandTier.NATIONAL]: {
    name: '全国品牌',
    minAwareness: 60,
    minReputation: 60,
    priceMultiplier: 1.25,
    demandMultiplier: 1.2,
    color: '#a78bfa',
  },
  [BrandTier.PREMIUM]: {
    name: '高端品牌',
    minAwareness: 80,
    minReputation: 75,
    priceMultiplier: 1.5,
    demandMultiplier: 1.1,
    color: '#f472b6',
  },
  [BrandTier.LUXURY]: {
    name: '奢华品牌',
    minAwareness: 90,
    minReputation: 90,
    priceMultiplier: 2.0,
    demandMultiplier: 0.8,
    color: '#fbbf24',
  },
};

/**
 * 品牌投资配置
 */
export const BRAND_INVESTMENT_CONFIG: Record<BrandInvestmentType, {
  name: string;
  awarenessGain: number;      // 每投资1万的知名度增益
  reputationGain: number;     // 每投资1万的声誉增益
  loyaltyGain: number;        // 每投资1万的忠诚度增益
  diminishingFactor: number;  // 边际递减系数
  cooldownDays: number;       // 投资冷却天数
}> = {
  [BrandInvestmentType.ADVERTISING]: {
    name: '广告投放',
    awarenessGain: 2.0,
    reputationGain: 0.2,
    loyaltyGain: 0.1,
    diminishingFactor: 0.95,
    cooldownDays: 1,
  },
  [BrandInvestmentType.SPONSORSHIP]: {
    name: '赞助活动',
    awarenessGain: 1.5,
    reputationGain: 1.0,
    loyaltyGain: 0.3,
    diminishingFactor: 0.9,
    cooldownDays: 7,
  },
  [BrandInvestmentType.PUBLIC_RELATIONS]: {
    name: '公关活动',
    awarenessGain: 0.5,
    reputationGain: 2.0,
    loyaltyGain: 0.5,
    diminishingFactor: 0.85,
    cooldownDays: 3,
  },
  [BrandInvestmentType.CUSTOMER_SERVICE]: {
    name: '客户服务',
    awarenessGain: 0.2,
    reputationGain: 1.0,
    loyaltyGain: 2.0,
    diminishingFactor: 0.92,
    cooldownDays: 1,
  },
  [BrandInvestmentType.QUALITY_IMPROVEMENT]: {
    name: '质量提升',
    awarenessGain: 0.3,
    reputationGain: 1.5,
    loyaltyGain: 1.0,
    diminishingFactor: 0.88,
    cooldownDays: 30,
  },
};

// ==================== 品牌管理器 ====================

export class BrandManager {
  private brands: Map<number, Brand> = new Map();
  private events: BrandEvent[] = [];
  private investmentHistory: Map<number, Map<BrandInvestmentType, number>> = new Map();
  
  /**
   * 创建或获取品牌
   */
  getOrCreateBrand(companyId: number, companyName: string, currentTick: number): Brand {
    if (this.brands.has(companyId)) {
      return this.brands.get(companyId)!;
    }
    
    const brand: Brand = {
      companyId,
      name: companyName,
      tier: BrandTier.UNKNOWN,
      awareness: 5,
      reputation: 50,
      loyalty: 30,
      brandValue: 0,
      marketPosition: 50,
      createdTick: currentTick,
      lastUpdatedTick: currentTick,
      categoryStrengths: new Map(),
    };
    
    this.brands.set(companyId, brand);
    return brand;
  }
  
  /**
   * 投资品牌
   */
  investInBrand(
    companyId: number,
    investmentType: BrandInvestmentType,
    amount: number,
    currentTick: number
  ): { success: boolean; awarenessGain: number; reputationGain: number; loyaltyGain: number } {
    const brand = this.brands.get(companyId);
    if (!brand) {
      return { success: false, awarenessGain: 0, reputationGain: 0, loyaltyGain: 0 };
    }
    
    const config = BRAND_INVESTMENT_CONFIG[investmentType];
    
    // 检查冷却
    const lastInvestment = this.getLastInvestment(companyId, investmentType);
    const cooldownTicks = config.cooldownDays * 24;
    if (lastInvestment && currentTick - lastInvestment < cooldownTicks) {
      return { success: false, awarenessGain: 0, reputationGain: 0, loyaltyGain: 0 };
    }
    
    // 计算收益（考虑边际递减）
    const investmentUnits = amount / 10000;  // 每1万为一单位
    const effectiveUnits = investmentUnits * Math.pow(config.diminishingFactor, investmentUnits);
    
    const awarenessGain = Math.min(100 - brand.awareness, config.awarenessGain * effectiveUnits);
    const reputationGain = Math.min(100 - brand.reputation, config.reputationGain * effectiveUnits);
    const loyaltyGain = Math.min(100 - brand.loyalty, config.loyaltyGain * effectiveUnits);
    
    // 应用收益
    brand.awareness = Math.min(100, brand.awareness + awarenessGain);
    brand.reputation = Math.min(100, brand.reputation + reputationGain);
    brand.loyalty = Math.min(100, brand.loyalty + loyaltyGain);
    brand.lastUpdatedTick = currentTick;
    
    // 记录投资
    this.recordInvestment(companyId, investmentType, currentTick);
    
    // 更新品牌等级
    this.updateBrandTier(brand);
    
    // 更新品牌价值
    this.calculateBrandValue(brand);
    
    return { success: true, awarenessGain, reputationGain, loyaltyGain };
  }
  
  /**
   * 记录投资
   */
  private recordInvestment(companyId: number, type: BrandInvestmentType, tick: number): void {
    if (!this.investmentHistory.has(companyId)) {
      this.investmentHistory.set(companyId, new Map());
    }
    this.investmentHistory.get(companyId)!.set(type, tick);
  }
  
  /**
   * 获取上次投资时间
   */
  private getLastInvestment(companyId: number, type: BrandInvestmentType): number | null {
    return this.investmentHistory.get(companyId)?.get(type) ?? null;
  }
  
  /**
   * 更新品牌等级
   */
  private updateBrandTier(brand: Brand): void {
    for (let tier = BrandTier.LUXURY; tier >= BrandTier.UNKNOWN; tier--) {
      const config = BRAND_TIER_CONFIG[tier];
      if (brand.awareness >= config.minAwareness && brand.reputation >= config.minReputation) {
        brand.tier = tier;
        return;
      }
    }
    brand.tier = BrandTier.UNKNOWN;
  }
  
  /**
   * 计算品牌价值
   */
  private calculateBrandValue(brand: Brand): void {
    // 品牌价值 = (知名度 × 声誉 × 忠诚度) × 等级系数 × 基础乘数
    const baseValue = (brand.awareness * brand.reputation * brand.loyalty) / 1000;
    const tierMultiplier = BRAND_TIER_CONFIG[brand.tier].priceMultiplier;
    brand.brandValue = baseValue * tierMultiplier * 10000;
  }
  
  /**
   * 处理品牌事件
   */
  recordBrandEvent(
    companyId: number,
    type: BrandEventType,
    impact: number,
    description: string,
    currentTick: number
  ): void {
    const brand = this.brands.get(companyId);
    if (!brand) return;
    
    // 记录事件
    const event: BrandEvent = {
      type,
      companyId,
      impact,
      tick: currentTick,
      description,
    };
    this.events.push(event);
    
    // 应用影响
    const impactFactor = impact / 100;
    
    switch (type) {
      case BrandEventType.QUALITY_ISSUE:
        brand.reputation = Math.max(0, brand.reputation + impactFactor * 30);
        brand.loyalty = Math.max(0, brand.loyalty + impactFactor * 20);
        break;
        
      case BrandEventType.PRODUCT_RECALL:
        brand.reputation = Math.max(0, brand.reputation + impactFactor * 50);
        brand.awareness = Math.min(100, brand.awareness + Math.abs(impactFactor) * 10);  // 负面事件也增加知名度
        break;
        
      case BrandEventType.INNOVATION:
        brand.reputation = Math.min(100, brand.reputation + impactFactor * 20);
        brand.awareness = Math.min(100, brand.awareness + impactFactor * 15);
        break;
        
      case BrandEventType.AWARD:
        brand.reputation = Math.min(100, brand.reputation + impactFactor * 30);
        brand.awareness = Math.min(100, brand.awareness + impactFactor * 20);
        break;
        
      case BrandEventType.SCANDAL:
        brand.reputation = Math.max(0, brand.reputation + impactFactor * 60);
        brand.loyalty = Math.max(0, brand.loyalty + impactFactor * 40);
        brand.awareness = Math.min(100, brand.awareness + Math.abs(impactFactor) * 20);
        break;
        
      case BrandEventType.MARKETING_CAMPAIGN:
        brand.awareness = Math.min(100, brand.awareness + impactFactor * 25);
        break;
        
      case BrandEventType.CUSTOMER_COMPLAINT:
        brand.reputation = Math.max(0, brand.reputation + impactFactor * 5);
        brand.loyalty = Math.max(0, brand.loyalty + impactFactor * 10);
        break;
        
      case BrandEventType.POSITIVE_REVIEW:
        brand.reputation = Math.min(100, brand.reputation + impactFactor * 10);
        brand.loyalty = Math.min(100, brand.loyalty + impactFactor * 5);
        break;
    }
    
    brand.lastUpdatedTick = currentTick;
    this.updateBrandTier(brand);
    this.calculateBrandValue(brand);
  }
  
  /**
   * 处理每日品牌衰减
   */
  processDailyDecay(currentTick: number): void {
    if (currentTick % 24 !== 0) return;
    
    for (const [, brand] of this.brands) {
      // 知名度自然衰减（需要持续投入维持）
      brand.awareness = Math.max(0, brand.awareness - 0.1);
      
      // 忠诚度较慢衰减
      brand.loyalty = Math.max(0, brand.loyalty - 0.02);
      
      // 声誉相对稳定
      // 向中间值回归
      if (brand.reputation > 50) {
        brand.reputation = Math.max(50, brand.reputation - 0.01);
      } else if (brand.reputation < 50) {
        brand.reputation = Math.min(50, brand.reputation + 0.01);
      }
      
      this.updateBrandTier(brand);
      this.calculateBrandValue(brand);
    }
  }
  
  /**
   * 获取品牌溢价倍数
   */
  getBrandPriceMultiplier(_companyId: number, _goodsId?: number): number {
    return 1.0;
  }

  /**
   * 获取品牌需求倍数
   */
  getBrandDemandMultiplier(_companyId: number): number {
    return 1.0;
  }
  
  /**
   * 获取品牌信息
   */
  getBrand(companyId: number): Brand | null {
    return this.brands.get(companyId) ?? null;
  }
  
  /**
   * 获取品牌历史事件
   */
  getBrandEvents(companyId: number, limit: number = 10): BrandEvent[] {
    return this.events
      .filter(e => e.companyId === companyId)
      .slice(-limit);
  }
  
  /**
   * 增加品类专长
   */
  increaseCategoryStrength(companyId: number, goodsId: number, amount: number): void {
    const brand = this.brands.get(companyId);
    if (!brand) return;
    
    const current = brand.categoryStrengths.get(goodsId) ?? 50;
    brand.categoryStrengths.set(goodsId, Math.min(100, current + amount));
  }
}

// ==================== 单例实例 ====================

export const brandManager = new BrandManager();

// ==================== 工具函数 ====================

/**
 * 获取品牌等级名称
 */
export function getBrandTierName(tier: BrandTier): string {
  return BRAND_TIER_CONFIG[tier].name;
}

/**
 * 获取品牌等级颜色
 */
export function getBrandTierColor(tier: BrandTier): string {
  return BRAND_TIER_CONFIG[tier].color;
}

/**
 * 格式化品牌信息
 */
export function formatBrandInfo(brand: Brand): string {
  const tierName = getBrandTierName(brand.tier);
  return `${brand.name} [${tierName}] 知名度:${brand.awareness.toFixed(0)}% 声誉:${brand.reputation.toFixed(0)}% 忠诚度:${brand.loyalty.toFixed(0)}%`;
}

/**
 * 计算品牌投资推荐
 */
export function getBrandInvestmentRecommendation(brand: Brand): BrandInvestmentType {
  // 根据当前短板推荐投资方向
  if (brand.awareness < 30) {
    return BrandInvestmentType.ADVERTISING;
  } else if (brand.reputation < 50) {
    return BrandInvestmentType.QUALITY_IMPROVEMENT;
  } else if (brand.loyalty < 40) {
    return BrandInvestmentType.CUSTOMER_SERVICE;
  } else if (brand.awareness < brand.reputation) {
    return BrandInvestmentType.ADVERTISING;
  } else {
    return BrandInvestmentType.PUBLIC_RELATIONS;
  }
}