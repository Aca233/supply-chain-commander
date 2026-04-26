/**
 * 交易手续费系统
 * 管理市场交易的各种费用
 */

// ==================== 类型定义 ====================

/**
 * 费用类型
 */
export enum FeeType {
  TRANSACTION = 'transaction',     // 交易手续费
  LISTING = 'listing',             // 挂单费
  CLEARING = 'clearing',           // 清算费
  DELIVERY = 'delivery',           // 交割费
  STAMP = 'stamp',                 // 印花税
  MEMBERSHIP = 'membership',       // 会员费
}

/**
 * 费用计算模式
 */
export enum FeeCalculationMode {
  FLAT = 'flat',                   // 固定费用
  PERCENTAGE = 'percentage',       // 按比例
  TIERED = 'tiered',               // 阶梯费率
  CAPPED = 'capped',               // 封顶费率
}

/**
 * 费用配置
 */
export interface FeeConfig {
  type: FeeType;
  name: string;
  description: string;
  mode: FeeCalculationMode;
  
  // 费率参数
  rate: number;                    // 基础费率
  minFee: number;                  // 最低费用
  maxFee: number;                  // 最高费用（封顶）
  
  // 阶梯费率
  tiers?: {
    threshold: number;
    rate: number;
  }[];
  
  // 适用范围
  applicableGoods?: number[];      // 适用商品（空表示全部）
  excludedGoods?: number[];        // 排除商品
}

/**
 * 交易费用明细
 */
export interface TradeFeeBreakdown {
  transactionFee: number;
  listingFee: number;
  clearingFee: number;
  deliveryFee: number;
  stampDuty: number;
  totalFees: number;
  netAmount: number;
}

/**
 * 会员等级
 */
export enum MembershipTier {
  BASIC = 0,
  SILVER = 1,
  GOLD = 2,
  PLATINUM = 3,
  VIP = 4,
}

/**
 * 会员配置
 */
export interface MembershipConfig {
  tier: MembershipTier;
  name: string;
  monthlyFee: number;
  feeDiscount: number;           // 费用折扣 0-1
  priorityExecution: boolean;    // 优先执行
  freeListings: number;          // 免费挂单数
  dedicatedSupport: boolean;     // 专属支持
}

// ==================== 费用配置 ====================

export const FEE_CONFIGS: Record<FeeType, FeeConfig> = {
  [FeeType.TRANSACTION]: {
    type: FeeType.TRANSACTION,
    name: '交易手续费',
    description: '每笔成交收取的基础手续费',
    mode: FeeCalculationMode.TIERED,
    rate: 0.001,  // 0.1% 基础费率
    minFee: 5,
    maxFee: 10000,
    tiers: [
      { threshold: 10000, rate: 0.001 },    // 0-1万: 0.1%
      { threshold: 100000, rate: 0.0008 },  // 1-10万: 0.08%
      { threshold: 1000000, rate: 0.0005 }, // 10-100万: 0.05%
      { threshold: Infinity, rate: 0.0003 }, // 100万+: 0.03%
    ],
  },
  [FeeType.LISTING]: {
    type: FeeType.LISTING,
    name: '挂单费',
    description: '创建订单时收取的费用',
    mode: FeeCalculationMode.FLAT,
    rate: 1,
    minFee: 1,
    maxFee: 100,
  },
  [FeeType.CLEARING]: {
    type: FeeType.CLEARING,
    name: '清算费',
    description: '交易结算时的清算费用',
    mode: FeeCalculationMode.PERCENTAGE,
    rate: 0.0002,  // 0.02%
    minFee: 1,
    maxFee: 1000,
  },
  [FeeType.DELIVERY]: {
    type: FeeType.DELIVERY,
    name: '交割费',
    description: '实物交割时的费用',
    mode: FeeCalculationMode.PERCENTAGE,
    rate: 0.0005,  // 0.05%
    minFee: 10,
    maxFee: 5000,
    excludedGoods: [66], // 电力不需要交割 (GoodsId.ELECTRICITY)
  },
  [FeeType.STAMP]: {
    type: FeeType.STAMP,
    name: '印花税',
    description: '交易印花税',
    mode: FeeCalculationMode.PERCENTAGE,
    rate: 0.001,  // 0.1%
    minFee: 0,
    maxFee: Infinity,
  },
  [FeeType.MEMBERSHIP]: {
    type: FeeType.MEMBERSHIP,
    name: '会员费',
    description: '交易所会员费用',
    mode: FeeCalculationMode.FLAT,
    rate: 0,
    minFee: 0,
    maxFee: 0,
  },
};

export const MEMBERSHIP_CONFIGS: Record<MembershipTier, MembershipConfig> = {
  [MembershipTier.BASIC]: {
    tier: MembershipTier.BASIC,
    name: '普通会员',
    monthlyFee: 0,
    feeDiscount: 0,
    priorityExecution: false,
    freeListings: 10,
    dedicatedSupport: false,
  },
  [MembershipTier.SILVER]: {
    tier: MembershipTier.SILVER,
    name: '白银会员',
    monthlyFee: 1000,
    feeDiscount: 0.1,
    priorityExecution: false,
    freeListings: 50,
    dedicatedSupport: false,
  },
  [MembershipTier.GOLD]: {
    tier: MembershipTier.GOLD,
    name: '黄金会员',
    monthlyFee: 5000,
    feeDiscount: 0.2,
    priorityExecution: false,
    freeListings: 200,
    dedicatedSupport: true,
  },
  [MembershipTier.PLATINUM]: {
    tier: MembershipTier.PLATINUM,
    name: '铂金会员',
    monthlyFee: 20000,
    feeDiscount: 0.35,
    priorityExecution: true,
    freeListings: 1000,
    dedicatedSupport: true,
  },
  [MembershipTier.VIP]: {
    tier: MembershipTier.VIP,
    name: 'VIP会员',
    monthlyFee: 100000,
    feeDiscount: 0.5,
    priorityExecution: true,
    freeListings: Infinity,
    dedicatedSupport: true,
  },
};

// ==================== 费用管理器 ====================

export class TradingFeeManager {
  private companyMemberships: Map<number, MembershipTier> = new Map();
  private companyListingsUsed: Map<number, number> = new Map();
  private feeHistory: Map<number, { tick: number; amount: number; type: FeeType }[]> = new Map();
  
  /**
   * 设置公司会员等级
   */
  setMembership(companyId: number, tier: MembershipTier): void {
    this.companyMemberships.set(companyId, tier);
  }
  
  /**
   * 获取公司会员等级
   */
  getMembership(companyId: number): MembershipTier {
    return this.companyMemberships.get(companyId) ?? MembershipTier.BASIC;
  }
  
  /**
   * 计算单项费用
   */
  calculateFee(
    feeType: FeeType,
    amount: number,
    companyId: number,
    goodsId?: number
  ): number {
    const config = FEE_CONFIGS[feeType];
    
    // 检查商品是否适用
    if (goodsId !== undefined) {
      if (config.excludedGoods?.includes(goodsId)) {
        return 0;
      }
      if (config.applicableGoods?.length && !config.applicableGoods.includes(goodsId)) {
        return 0;
      }
    }
    
    let fee = 0;
    
    switch (config.mode) {
      case FeeCalculationMode.FLAT:
        fee = config.rate;
        break;
        
      case FeeCalculationMode.PERCENTAGE:
        fee = amount * config.rate;
        break;
        
      case FeeCalculationMode.TIERED:
        if (config.tiers) {
          let remaining = amount;
          let prevThreshold = 0;
          
          for (const tier of config.tiers) {
            const tierAmount = Math.min(remaining, tier.threshold - prevThreshold);
            fee += tierAmount * tier.rate;
            remaining -= tierAmount;
            prevThreshold = tier.threshold;
            
            if (remaining <= 0) break;
          }
        } else {
          fee = amount * config.rate;
        }
        break;
        
      case FeeCalculationMode.CAPPED:
        fee = Math.min(amount * config.rate, config.maxFee);
        break;
    }
    
    // 应用最低和最高限制
    fee = Math.max(config.minFee, fee);
    fee = Math.min(config.maxFee, fee);
    
    // 应用会员折扣
    const membership = this.getMembership(companyId);
    const membershipConfig = MEMBERSHIP_CONFIGS[membership];
    fee *= (1 - membershipConfig.feeDiscount);
    
    return fee;
  }
  
  /**
   * 计算交易总费用
   */
  calculateTradeFees(
    tradeValue: number,
    companyId: number,
    goodsId: number,
    isPhysicalDelivery: boolean = true
  ): TradeFeeBreakdown {
    const transactionFee = this.calculateFee(FeeType.TRANSACTION, tradeValue, companyId, goodsId);
    const clearingFee = this.calculateFee(FeeType.CLEARING, tradeValue, companyId, goodsId);
    const stampDuty = this.calculateFee(FeeType.STAMP, tradeValue, companyId, goodsId);
    const deliveryFee = isPhysicalDelivery 
      ? this.calculateFee(FeeType.DELIVERY, tradeValue, companyId, goodsId)
      : 0;
    
    // 挂单费（检查免费额度）
    let listingFee = 0;
    const membership = this.getMembership(companyId);
    const membershipConfig = MEMBERSHIP_CONFIGS[membership];
    const listingsUsed = this.companyListingsUsed.get(companyId) ?? 0;
    
    if (listingsUsed >= membershipConfig.freeListings) {
      listingFee = this.calculateFee(FeeType.LISTING, tradeValue, companyId, goodsId);
    }
    
    const totalFees = transactionFee + listingFee + clearingFee + deliveryFee + stampDuty;
    
    return {
      transactionFee,
      listingFee,
      clearingFee,
      deliveryFee,
      stampDuty,
      totalFees,
      netAmount: tradeValue - totalFees,
    };
  }
  
  /**
   * 记录挂单使用
   */
  recordListing(companyId: number): void {
    const current = this.companyListingsUsed.get(companyId) ?? 0;
    this.companyListingsUsed.set(companyId, current + 1);
  }
  
  /**
   * 重置月度挂单计数（每月初调用）
   */
  resetMonthlyListings(): void {
    this.companyListingsUsed.clear();
  }
  
  /**
   * 记录费用历史
   */
  recordFee(companyId: number, type: FeeType, amount: number, tick: number): void {
    if (!this.feeHistory.has(companyId)) {
      this.feeHistory.set(companyId, []);
    }
    this.feeHistory.get(companyId)!.push({ tick, amount, type });
    
    // 保留最近30天的记录
    const minTick = tick - 30 * 24;
    const history = this.feeHistory.get(companyId)!;
    while (history.length > 0 && history[0].tick < minTick) {
      history.shift();
    }
  }
  
  /**
   * 获取公司的费用统计
   */
  getFeeStatistics(companyId: number): {
    totalFees: number;
    byType: Record<FeeType, number>;
    averageDaily: number;
  } {
    const history = this.feeHistory.get(companyId) ?? [];
    
    const byType: Record<FeeType, number> = {
      [FeeType.TRANSACTION]: 0,
      [FeeType.LISTING]: 0,
      [FeeType.CLEARING]: 0,
      [FeeType.DELIVERY]: 0,
      [FeeType.STAMP]: 0,
      [FeeType.MEMBERSHIP]: 0,
    };
    
    let totalFees = 0;
    for (const record of history) {
      byType[record.type] += record.amount;
      totalFees += record.amount;
    }
    
    // 计算日均费用
    const days = Math.max(1, history.length > 0 
      ? Math.ceil((history[history.length - 1].tick - history[0].tick) / 24)
      : 1);
    
    return {
      totalFees,
      byType,
      averageDaily: totalFees / days,
    };
  }
  
  /**
   * 计算交易总费用（简化版本，用于GameLoop）
   */
  calculateTotalFee(tradeValue: number, companyId: number): number {
    const breakdown = this.calculateTradeFees(tradeValue, companyId, 0, true);
    return breakdown.totalFees;
  }
  
  /**
   * 估算月度费用
   */
  estimateMonthlyFees(
    companyId: number,
    expectedTradeVolume: number,
    expectedTrades: number
  ): number {
    const membership = this.getMembership(companyId);
    const membershipConfig = MEMBERSHIP_CONFIGS[membership];
    
    // 估算交易费用
    const avgTradeValue = expectedTradeVolume / expectedTrades;
    const transactionFees = expectedTrades * this.calculateFee(FeeType.TRANSACTION, avgTradeValue, companyId);
    const clearingFees = expectedTrades * this.calculateFee(FeeType.CLEARING, avgTradeValue, companyId);
    const stampDuty = this.calculateFee(FeeType.STAMP, expectedTradeVolume, companyId);
    
    // 挂单费
    const paidListings = Math.max(0, expectedTrades - membershipConfig.freeListings);
    const listingFees = paidListings * this.calculateFee(FeeType.LISTING, avgTradeValue, companyId);
    
    // 会员费
    const membershipFee = membershipConfig.monthlyFee;
    
    return transactionFees + clearingFees + stampDuty + listingFees + membershipFee;
  }
  
  /**
   * 推荐最优会员等级
   */
  recommendMembership(
    expectedMonthlyVolume: number,
    expectedMonthlyTrades: number
  ): { tier: MembershipTier; estimatedSavings: number } {
    let bestTier = MembershipTier.BASIC;
    let bestSavings = 0;
    
    // 计算基础等级费用
    const baseFees = this.estimateFees(0, expectedMonthlyVolume, expectedMonthlyTrades);
    
    for (let tier = MembershipTier.SILVER; tier <= MembershipTier.VIP; tier++) {
      const tierConfig = MEMBERSHIP_CONFIGS[tier];
      const tierFees = this.estimateFees(tier, expectedMonthlyVolume, expectedMonthlyTrades);
      const netCost = tierFees + tierConfig.monthlyFee;
      const savings = baseFees - netCost;
      
      if (savings > bestSavings) {
        bestSavings = savings;
        bestTier = tier;
      }
    }
    
    return { tier: bestTier, estimatedSavings: bestSavings };
  }
  
  /**
   * 内部费用估算
   */
  private estimateFees(tier: MembershipTier, volume: number, trades: number): number {
    const discount = MEMBERSHIP_CONFIGS[tier].feeDiscount;
    const freeListings = MEMBERSHIP_CONFIGS[tier].freeListings;
    
    const avgValue = volume / trades;
    let totalFees = 0;
    
    // 交易费（使用阶梯费率）
    totalFees += volume * 0.0005 * (1 - discount);  // 简化计算
    
    // 清算费
    totalFees += volume * 0.0002 * (1 - discount);
    
    // 印花税（无折扣）
    totalFees += volume * 0.001;
    
    // 挂单费
    const paidListings = Math.max(0, trades - freeListings);
    totalFees += paidListings * 1 * (1 - discount);
    
    return totalFees;
  }
}

// ==================== 单例实例 ====================

export const tradingFeeManager = new TradingFeeManager();

// ==================== 工具函数 ====================

/**
 * 获取费用类型名称
 */
export function getFeeTypeName(type: FeeType): string {
  return FEE_CONFIGS[type].name;
}

/**
 * 获取会员等级名称
 */
export function getMembershipName(tier: MembershipTier): string {
  return MEMBERSHIP_CONFIGS[tier].name;
}

/**
 * 格式化费用明细
 */
export function formatFeeBreakdown(breakdown: TradeFeeBreakdown): string {
  const parts: string[] = [];
  
  if (breakdown.transactionFee > 0) {
    parts.push(`手续费: ¥${breakdown.transactionFee.toFixed(2)}`);
  }
  if (breakdown.clearingFee > 0) {
    parts.push(`清算费: ¥${breakdown.clearingFee.toFixed(2)}`);
  }
  if (breakdown.stampDuty > 0) {
    parts.push(`印花税: ¥${breakdown.stampDuty.toFixed(2)}`);
  }
  if (breakdown.deliveryFee > 0) {
    parts.push(`交割费: ¥${breakdown.deliveryFee.toFixed(2)}`);
  }
  if (breakdown.listingFee > 0) {
    parts.push(`挂单费: ¥${breakdown.listingFee.toFixed(2)}`);
  }
  
  parts.push(`总计: ¥${breakdown.totalFees.toFixed(2)}`);
  
  return parts.join(' | ');
}

/**
 * 计算有效费率
 */
export function calculateEffectiveRate(breakdown: TradeFeeBreakdown, tradeValue: number): number {
  return breakdown.totalFees / tradeValue;
}