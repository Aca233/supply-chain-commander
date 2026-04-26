/**
 * 批发/零售渠道系统
 * 模拟多层次的商品分销网络
 */

import { TICKS_PER_DAY } from '@/core/constants';

// ==================== 类型定义 ====================

/**
 * 渠道类型
 */
export enum ChannelType {
  DIRECT = 'direct',             // 直销
  WHOLESALE = 'wholesale',       // 批发
  DISTRIBUTOR = 'distributor',   // 分销商
  RETAIL = 'retail',             // 零售
  ONLINE = 'online',             // 电商
  EXPORT = 'export',             // 出口
}

/**
 * 渠道配置
 */
export interface ChannelConfig {
  type: ChannelType;
  name: string;
  description: string;
  
  // 成本参数
  commissionRate: number;         // 渠道佣金率
  setupCost: number;              // 渠道建设成本
  monthlyFee: number;             // 月度费用
  
  // 销量参数
  minOrderQuantity: number;       // 最小订单量
  maxDailyVolume: number;         // 日最大销量
  leadTime: number;               // 交付周期（天）
  
  // 价格参数
  priceMultiplier: number;        // 终端售价倍数
  
  // 限制
  applicableGoods: number[];      // 适用商品（空表示通用）
  minBrandTier: number;           // 最低品牌等级要求
}

/**
 * 渠道关系
 */
export interface ChannelRelationship {
  id: number;
  companyId: number;
  channelType: ChannelType;
  
  // 合作状态
  isActive: boolean;
  establishedTick: number;
  
  // 业绩
  totalSalesVolume: number;
  totalSalesValue: number;
  monthlyTarget: number;
  
  // 渠道评级
  channelRating: number;          // 渠道评分 0-100
  paymentReliability: number;     // 付款可靠性 0-100
  
  // 条款
  agreedCommissionRate: number;
  paymentTermDays: number;        // 账期（天）
  
  // 商品配额
  goodsQuotas: Map<number, number>;
}

/**
 * 渠道销售订单
 */
export interface ChannelOrder {
  id: number;
  relationshipId: number;
  companyId: number;
  channelType: ChannelType;
  
  // 订单内容
  goodsId: number;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  
  // 状态
  status: ChannelOrderStatus;
  createdTick: number;
  deliveryTick?: number;
  paymentTick?: number;
  
  // 财务
  commission: number;
  netRevenue: number;
}

/**
 * 渠道订单状态
 */
export enum ChannelOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

// ==================== 渠道配置 ====================

export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.DIRECT]: {
    type: ChannelType.DIRECT,
    name: '直销',
    description: '直接面向终端客户销售，利润高但销量有限',
    commissionRate: 0,
    setupCost: 50000,
    monthlyFee: 5000,
    minOrderQuantity: 1,
    maxDailyVolume: 100,
    leadTime: 1,
    priceMultiplier: 1.3,
    applicableGoods: [],
    minBrandTier: 0,
  },
  [ChannelType.WHOLESALE]: {
    type: ChannelType.WHOLESALE,
    name: '批发',
    description: '大批量销售给批发商，量大价低',
    commissionRate: 0.05,
    setupCost: 100000,
    monthlyFee: 10000,
    minOrderQuantity: 100,
    maxDailyVolume: 5000,
    leadTime: 3,
    priceMultiplier: 0.85,
    applicableGoods: [],
    minBrandTier: 0,
  },
  [ChannelType.DISTRIBUTOR]: {
    type: ChannelType.DISTRIBUTOR,
    name: '分销商',
    description: '通过分销商网络覆盖更广市场',
    commissionRate: 0.15,
    setupCost: 200000,
    monthlyFee: 20000,
    minOrderQuantity: 50,
    maxDailyVolume: 2000,
    leadTime: 5,
    priceMultiplier: 1.0,
    applicableGoods: [],
    minBrandTier: 1,
  },
  [ChannelType.RETAIL]: {
    type: ChannelType.RETAIL,
    name: '零售',
    description: '进入零售渠道，面向消费者',
    commissionRate: 0.25,
    setupCost: 300000,
    monthlyFee: 30000,
    minOrderQuantity: 10,
    maxDailyVolume: 500,
    leadTime: 7,
    priceMultiplier: 1.5,
    applicableGoods: [44, 45, 40, 55, 56, 43, 54, 41, 42], // 消费品
    minBrandTier: 2,
  },
  [ChannelType.ONLINE]: {
    type: ChannelType.ONLINE,
    name: '电商',
    description: '通过电商平台销售，覆盖面广',
    commissionRate: 0.12,
    setupCost: 80000,
    monthlyFee: 15000,
    minOrderQuantity: 1,
    maxDailyVolume: 3000,
    leadTime: 2,
    priceMultiplier: 1.2,
    applicableGoods: [],
    minBrandTier: 1,
  },
  [ChannelType.EXPORT]: {
    type: ChannelType.EXPORT,
    name: '出口',
    description: '出口到海外市场',
    commissionRate: 0.08,
    setupCost: 500000,
    monthlyFee: 50000,
    minOrderQuantity: 500,
    maxDailyVolume: 10000,
    leadTime: 30,
    priceMultiplier: 1.1,
    applicableGoods: [],
    minBrandTier: 2,
  },
};

// ==================== 渠道管理器 ====================

export class DistributionManager {
  private relationships: Map<number, ChannelRelationship> = new Map();
  private orders: Map<number, ChannelOrder> = new Map();
  
  private nextRelationshipId: number = 1;
  private nextOrderId: number = 1;
  
  private relationshipsByCompany: Map<number, Set<number>> = new Map();
  
  /**
   * 建立渠道关系
   */
  establishChannel(
    companyId: number,
    channelType: ChannelType,
    currentTick: number,
    brandTier: number = 0
  ): { success: boolean; relationship?: ChannelRelationship; reason?: string } {
    const config = CHANNEL_CONFIGS[channelType];
    
    // 检查品牌等级要求
    if (brandTier < config.minBrandTier) {
      return { success: false, reason: `需要品牌等级 ${config.minBrandTier} 以上` };
    }
    
    // 检查是否已有该渠道
    const existing = this.getCompanyChannelRelationship(companyId, channelType);
    if (existing) {
      return { success: false, reason: '已建立该渠道' };
    }
    
    const relationshipId = this.nextRelationshipId++;
    
    const relationship: ChannelRelationship = {
      id: relationshipId,
      companyId,
      channelType,
      isActive: true,
      establishedTick: currentTick,
      totalSalesVolume: 0,
      totalSalesValue: 0,
      monthlyTarget: 0,
      channelRating: 50,
      paymentReliability: 80,
      agreedCommissionRate: config.commissionRate,
      paymentTermDays: channelType === ChannelType.EXPORT ? 60 : 30,
      goodsQuotas: new Map(),
    };
    
    this.relationships.set(relationshipId, relationship);
    
    if (!this.relationshipsByCompany.has(companyId)) {
      this.relationshipsByCompany.set(companyId, new Set());
    }
    this.relationshipsByCompany.get(companyId)!.add(relationshipId);
    
    return { success: true, relationship };
  }
  
  /**
   * 获取公司的某渠道关系
   */
  getCompanyChannelRelationship(companyId: number, channelType: ChannelType): ChannelRelationship | null {
    const relationshipIds = this.relationshipsByCompany.get(companyId);
    if (!relationshipIds) return null;
    
    for (const id of relationshipIds) {
      const rel = this.relationships.get(id);
      if (rel && rel.channelType === channelType && rel.isActive) {
        return rel;
      }
    }
    return null;
  }
  
  /**
   * 获取公司的所有渠道
   */
  getCompanyChannels(companyId: number): ChannelRelationship[] {
    const relationshipIds = this.relationshipsByCompany.get(companyId);
    if (!relationshipIds) return [];
    
    return Array.from(relationshipIds)
      .map(id => this.relationships.get(id))
      .filter((r): r is ChannelRelationship => r !== undefined && r.isActive);
  }
  
  /**
   * 通过渠道销售
   */
  sellThroughChannel(
    companyId: number,
    channelType: ChannelType,
    goodsId: number,
    quantity: number,
    basePrice: number,
    currentTick: number
  ): { success: boolean; order?: ChannelOrder; reason?: string } {
    const relationship = this.getCompanyChannelRelationship(companyId, channelType);
    if (!relationship) {
      return { success: false, reason: '未建立该渠道' };
    }
    
    const config = CHANNEL_CONFIGS[channelType];
    
    // 检查最小订单量
    if (quantity < config.minOrderQuantity) {
      return { success: false, reason: `最小订单量: ${config.minOrderQuantity}` };
    }
    
    // 检查商品限制
    if (config.applicableGoods.length > 0 && !config.applicableGoods.includes(goodsId)) {
      return { success: false, reason: '该渠道不支持此商品' };
    }
    
    // 计算价格
    const unitPrice = basePrice * config.priceMultiplier;
    const totalValue = quantity * unitPrice;
    const commission = totalValue * relationship.agreedCommissionRate;
    const netRevenue = totalValue - commission;
    
    const orderId = this.nextOrderId++;
    
    const order: ChannelOrder = {
      id: orderId,
      relationshipId: relationship.id,
      companyId,
      channelType,
      goodsId,
      quantity,
      unitPrice,
      totalValue,
      status: ChannelOrderStatus.PENDING,
      createdTick: currentTick,
      deliveryTick: currentTick + config.leadTime * TICKS_PER_DAY,
      commission,
      netRevenue,
    };
    
    this.orders.set(orderId, order);
    
    // 更新渠道统计
    relationship.totalSalesVolume += quantity;
    relationship.totalSalesValue += totalValue;
    
    return { success: true, order };
  }
  
  /**
   * 处理订单交付
   */
  processDeliveries(currentTick: number): ChannelOrder[] {
    const delivered: ChannelOrder[] = [];
    
    for (const [, order] of this.orders) {
      if (order.status === ChannelOrderStatus.PENDING && 
          order.deliveryTick && currentTick >= order.deliveryTick) {
        order.status = ChannelOrderStatus.DELIVERED;
        
        // 设置付款时间
        const relationship = this.relationships.get(order.relationshipId);
        if (relationship) {
          order.paymentTick = currentTick + relationship.paymentTermDays * TICKS_PER_DAY;
        }
        
        delivered.push(order);
      }
    }
    
    return delivered;
  }
  
  /**
   * 处理付款
   */
  processPayments(currentTick: number): ChannelOrder[] {
    const paid: ChannelOrder[] = [];
    
    for (const [, order] of this.orders) {
      if (order.status === ChannelOrderStatus.DELIVERED && 
          order.paymentTick && currentTick >= order.paymentTick) {
        
        // 模拟付款可靠性
        const relationship = this.relationships.get(order.relationshipId);
        if (relationship) {
          const payOnTime = Math.random() * 100 < relationship.paymentReliability;
          
          if (payOnTime) {
            order.status = ChannelOrderStatus.PAID;
            paid.push(order);
          } else {
            // 延迟付款
            order.paymentTick = currentTick + 7 * TICKS_PER_DAY;
            relationship.paymentReliability = Math.max(0, relationship.paymentReliability - 5);
          }
        }
      }
    }
    
    return paid;
  }
  
  /**
   * 计算渠道月度费用
   */
  calculateMonthlyFees(companyId: number): number {
    const channels = this.getCompanyChannels(companyId);
    return channels.reduce((sum, rel) => {
      const config = CHANNEL_CONFIGS[rel.channelType];
      return sum + config.monthlyFee;
    }, 0);
  }
  
  /**
   * 获取渠道销售建议
   */
  getChannelRecommendation(
    goodsId: number,
    quantity: number,
    brandTier: number
  ): { channel: ChannelType; expectedRevenue: number; commission: number }[] {
    const recommendations: { channel: ChannelType; expectedRevenue: number; commission: number }[] = [];
    
    for (const [type, config] of Object.entries(CHANNEL_CONFIGS)) {
      const channelType = type as ChannelType;
      
      // 检查适用性
      if (brandTier < config.minBrandTier) continue;
      if (quantity < config.minOrderQuantity) continue;
      if (config.applicableGoods.length > 0 && !config.applicableGoods.includes(goodsId)) continue;
      
      const basePrice = 100;  // 示例基准价
      const revenue = quantity * basePrice * config.priceMultiplier;
      const commission = revenue * config.commissionRate;
      
      recommendations.push({
        channel: channelType,
        expectedRevenue: revenue - commission,
        commission,
      });
    }
    
    return recommendations.sort((a, b) => b.expectedRevenue - a.expectedRevenue);
  }
  
  /**
   * 获取渠道统计
   */
  getChannelStatistics(companyId: number): {
    channelType: ChannelType;
    totalVolume: number;
    totalValue: number;
    pendingOrders: number;
    averageCommission: number;
  }[] {
    const channels = this.getCompanyChannels(companyId);
    const stats: Map<ChannelType, {
      totalVolume: number;
      totalValue: number;
      pendingOrders: number;
      totalCommission: number;
      orderCount: number;
    }> = new Map();
    
    for (const [, order] of this.orders) {
      if (order.companyId !== companyId) continue;
      
      if (!stats.has(order.channelType)) {
        stats.set(order.channelType, {
          totalVolume: 0,
          totalValue: 0,
          pendingOrders: 0,
          totalCommission: 0,
          orderCount: 0,
        });
      }
      
      const s = stats.get(order.channelType)!;
      s.totalVolume += order.quantity;
      s.totalValue += order.totalValue;
      s.totalCommission += order.commission;
      s.orderCount++;
      
      if (order.status === ChannelOrderStatus.PENDING) {
        s.pendingOrders++;
      }
    }
    
    return Array.from(stats.entries()).map(([type, s]) => ({
      channelType: type,
      totalVolume: s.totalVolume,
      totalValue: s.totalValue,
      pendingOrders: s.pendingOrders,
      averageCommission: s.orderCount > 0 ? s.totalCommission / s.orderCount : 0,
    }));
  }
}

// ==================== 单例实例 ====================

export const distributionManager = new DistributionManager();

// ==================== 工具函数 ====================

/**
 * 获取渠道名称
 */
export function getChannelName(type: ChannelType): string {
  return CHANNEL_CONFIGS[type].name;
}

/**
 * 格式化渠道信息
 */
export function formatChannelInfo(relationship: ChannelRelationship): string {
  const config = CHANNEL_CONFIGS[relationship.channelType];
  return `${config.name} - 总销量: ${relationship.totalSalesVolume} 总金额: ¥${relationship.totalSalesValue.toFixed(0)} 评级: ${relationship.channelRating}`;
}

/**
 * 计算渠道利润率
 */
export function calculateChannelMargin(channelType: ChannelType): number {
  const config = CHANNEL_CONFIGS[channelType];
  return config.priceMultiplier * (1 - config.commissionRate) - 1;
}
