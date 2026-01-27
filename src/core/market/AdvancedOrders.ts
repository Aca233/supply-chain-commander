/**
 * 高级订单类型系统
 * 支持止损单、止盈单、限价止损、冰山订单等
 */

// ==================== 类型定义 ====================

/**
 * 订单类型枚举
 */
export enum OrderType {
  // 基础订单
  LIMIT = 0,           // 限价单
  MARKET = 1,          // 市价单
  
  // 条件订单
  STOP_LOSS = 10,      // 止损单 - 价格跌破触发卖出
  STOP_BUY = 11,       // 止损买入 - 价格突破触发买入
  TAKE_PROFIT = 12,    // 止盈单 - 价格达到目标触发卖出
  
  // 复合订单
  STOP_LIMIT = 20,     // 限价止损 - 触发后变为限价单
  OCO = 21,            // 二选一订单 (One-Cancels-Other)
  BRACKET = 22,        // 括号订单 (止损+止盈)
  
  // 特殊订单
  ICEBERG = 30,        // 冰山订单 - 分批显示
  TWAP = 31,           // 时间加权平均价订单
  VWAP = 32,           // 成交量加权平均价订单
  
  // 定时订单
  GTC = 40,            // Good-Till-Cancelled 永久有效
  GTD = 41,            // Good-Till-Date 有效期订单
  IOC = 42,            // Immediate-Or-Cancel 立即成交或取消
  FOK = 43,            // Fill-Or-Kill 全部成交或取消
}

/**
 * 订单状态
 */
export enum OrderStatus {
  PENDING = 0,         // 待触发（条件订单）
  ACTIVE = 1,          // 活跃中
  PARTIALLY_FILLED = 2, // 部分成交
  FILLED = 3,          // 完全成交
  CANCELLED = 4,       // 已取消
  EXPIRED = 5,         // 已过期
  TRIGGERED = 6,       // 已触发（条件订单转为活跃）
}

/**
 * 高级订单定义
 */
export interface AdvancedOrder {
  id: number;
  type: OrderType;
  status: OrderStatus;
  
  // 基本信息
  companyId: number;
  goodsId: number;
  isBuy: boolean;
  
  // 数量
  quantity: number;
  filledQuantity: number;
  
  // 价格条件
  price: number;              // 限价
  triggerPrice?: number;      // 触发价格（条件订单）
  stopPrice?: number;         // 止损价格
  takeProfitPrice?: number;   // 止盈价格
  
  // 冰山订单参数
  displayQuantity?: number;   // 显示数量
  
  // TWAP/VWAP参数
  startTick?: number;         // 开始时间
  endTick?: number;           // 结束时间
  totalSlices?: number;       // 分片数量
  currentSlice?: number;      // 当前分片
  
  // 关联订单
  linkedOrderIds?: number[];  // 关联订单ID（OCO/Bracket）
  parentOrderId?: number;     // 父订单ID
  
  // 时间
  createdTick: number;
  expiryTick?: number;        // 过期时间
  lastUpdatedTick: number;
  
  // 成交记录
  avgFillPrice: number;
  totalValue: number;
}

/**
 * 订单创建参数
 */
export interface CreateOrderParams {
  type: OrderType;
  companyId: number;
  goodsId: number;
  isBuy: boolean;
  quantity: number;
  price?: number;
  triggerPrice?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  displayQuantity?: number;
  durationTicks?: number;     // 有效期（tick数）
  slices?: number;            // TWAP分片数
}

// ==================== 订单管理器 ====================

export class AdvancedOrderManager {
  private orders: Map<number, AdvancedOrder> = new Map();
  private nextOrderId: number = 1;
  private ordersByCompany: Map<number, Set<number>> = new Map();
  private ordersByGoods: Map<number, Set<number>> = new Map();
  private pendingOrders: Set<number> = new Set();  // 待触发的条件订单
  
  /**
   * 创建新订单
   */
  createOrder(params: CreateOrderParams, currentTick: number): AdvancedOrder {
    const orderId = this.nextOrderId++;
    
    const order: AdvancedOrder = {
      id: orderId,
      type: params.type,
      status: this.isConditionalOrder(params.type) ? OrderStatus.PENDING : OrderStatus.ACTIVE,
      companyId: params.companyId,
      goodsId: params.goodsId,
      isBuy: params.isBuy,
      quantity: params.quantity,
      filledQuantity: 0,
      price: params.price ?? 0,
      triggerPrice: params.triggerPrice,
      stopPrice: params.stopPrice,
      takeProfitPrice: params.takeProfitPrice,
      displayQuantity: params.displayQuantity,
      createdTick: currentTick,
      expiryTick: params.durationTicks ? currentTick + params.durationTicks : undefined,
      lastUpdatedTick: currentTick,
      avgFillPrice: 0,
      totalValue: 0,
    };
    
    // TWAP订单初始化
    if (params.type === OrderType.TWAP && params.slices) {
      order.totalSlices = params.slices;
      order.currentSlice = 0;
      order.startTick = currentTick;
      order.endTick = currentTick + (params.durationTicks ?? params.slices * 10);
    }
    
    this.orders.set(orderId, order);
    this.addToIndex(order);
    
    if (order.status === OrderStatus.PENDING) {
      this.pendingOrders.add(orderId);
    }
    
    return order;
  }
  
  /**
   * 判断是否为条件订单
   */
  private isConditionalOrder(type: OrderType): boolean {
    return type >= OrderType.STOP_LOSS && type <= OrderType.TAKE_PROFIT;
  }
  
  /**
   * 添加到索引
   */
  private addToIndex(order: AdvancedOrder): void {
    // 按公司索引
    if (!this.ordersByCompany.has(order.companyId)) {
      this.ordersByCompany.set(order.companyId, new Set());
    }
    this.ordersByCompany.get(order.companyId)!.add(order.id);
    
    // 按商品索引
    if (!this.ordersByGoods.has(order.goodsId)) {
      this.ordersByGoods.set(order.goodsId, new Set());
    }
    this.ordersByGoods.get(order.goodsId)!.add(order.id);
  }
  
  /**
   * 从索引移除
   */
  private removeFromIndex(order: AdvancedOrder): void {
    this.ordersByCompany.get(order.companyId)?.delete(order.id);
    this.ordersByGoods.get(order.goodsId)?.delete(order.id);
    this.pendingOrders.delete(order.id);
  }
  
  /**
   * 检查条件订单触发
   */
  checkTriggers(goodsId: number, currentPrice: number, currentTick: number): AdvancedOrder[] {
    const triggered: AdvancedOrder[] = [];
    const goodsOrders = this.ordersByGoods.get(goodsId);
    
    if (!goodsOrders) return triggered;
    
    for (const orderId of goodsOrders) {
      const order = this.orders.get(orderId);
      if (!order || order.status !== OrderStatus.PENDING) continue;
      
      let shouldTrigger = false;
      
      switch (order.type) {
        case OrderType.STOP_LOSS:
          // 价格跌破触发价
          if (!order.isBuy && order.triggerPrice && currentPrice <= order.triggerPrice) {
            shouldTrigger = true;
          }
          break;
          
        case OrderType.STOP_BUY:
          // 价格突破触发价
          if (order.isBuy && order.triggerPrice && currentPrice >= order.triggerPrice) {
            shouldTrigger = true;
          }
          break;
          
        case OrderType.TAKE_PROFIT:
          // 价格达到止盈价
          if (!order.isBuy && order.takeProfitPrice && currentPrice >= order.takeProfitPrice) {
            shouldTrigger = true;
          }
          break;
          
        case OrderType.STOP_LIMIT:
          // 触发后变为限价单
          if (order.triggerPrice) {
            if ((order.isBuy && currentPrice >= order.triggerPrice) ||
                (!order.isBuy && currentPrice <= order.triggerPrice)) {
              shouldTrigger = true;
            }
          }
          break;
      }
      
      if (shouldTrigger) {
        order.status = OrderStatus.TRIGGERED;
        order.lastUpdatedTick = currentTick;
        this.pendingOrders.delete(orderId);
        triggered.push(order);
      }
    }
    
    return triggered;
  }
  
  /**
   * 处理TWAP订单分片
   */
  processTWAPSlice(orderId: number, currentTick: number): { quantity: number; price: number } | null {
    const order = this.orders.get(orderId);
    if (!order || order.type !== OrderType.TWAP) return null;
    if (!order.totalSlices || !order.endTick || !order.startTick) return null;
    
    // 计算当前应该执行的分片
    const totalDuration = order.endTick - order.startTick;
    const elapsed = currentTick - order.startTick;
    const expectedSlice = Math.floor((elapsed / totalDuration) * order.totalSlices);
    
    if (expectedSlice <= (order.currentSlice ?? 0)) return null;
    
    // 计算分片数量
    const remainingQuantity = order.quantity - order.filledQuantity;
    const remainingSlices = order.totalSlices - (order.currentSlice ?? 0);
    const sliceQuantity = Math.min(
      remainingQuantity / remainingSlices,
      remainingQuantity
    );
    
    order.currentSlice = expectedSlice;
    order.lastUpdatedTick = currentTick;
    
    return {
      quantity: sliceQuantity,
      price: order.price,
    };
  }
  
  /**
   * 获取冰山订单的显示数量
   */
  getIcebergDisplayQuantity(orderId: number): number {
    const order = this.orders.get(orderId);
    if (!order || order.type !== OrderType.ICEBERG) {
      return order?.quantity ?? 0;
    }
    
    const remaining = order.quantity - order.filledQuantity;
    return Math.min(order.displayQuantity ?? remaining, remaining);
  }
  
  /**
   * 记录成交
   */
  recordFill(orderId: number, quantity: number, price: number, currentTick: number): void {
    const order = this.orders.get(orderId);
    if (!order) return;
    
    const previousTotal = order.totalValue;
    const fillValue = quantity * price;
    
    order.filledQuantity += quantity;
    order.totalValue += fillValue;
    order.avgFillPrice = order.totalValue / order.filledQuantity;
    order.lastUpdatedTick = currentTick;
    
    if (order.filledQuantity >= order.quantity) {
      order.status = OrderStatus.FILLED;
      this.handleOrderComplete(order);
    } else {
      order.status = OrderStatus.PARTIALLY_FILLED;
    }
  }
  
  /**
   * 处理订单完成
   */
  private handleOrderComplete(order: AdvancedOrder): void {
    // 处理OCO订单 - 取消关联订单
    if (order.linkedOrderIds) {
      for (const linkedId of order.linkedOrderIds) {
        this.cancelOrder(linkedId, order.lastUpdatedTick);
      }
    }
    
    this.removeFromIndex(order);
  }
  
  /**
   * 取消订单
   */
  cancelOrder(orderId: number, currentTick: number): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
      return false;
    }
    
    order.status = OrderStatus.CANCELLED;
    order.lastUpdatedTick = currentTick;
    this.removeFromIndex(order);
    
    return true;
  }
  
  /**
   * 检查过期订单
   */
  checkExpiry(currentTick: number): AdvancedOrder[] {
    const expired: AdvancedOrder[] = [];
    
    for (const [, order] of this.orders) {
      if (order.status === OrderStatus.ACTIVE || 
          order.status === OrderStatus.PENDING ||
          order.status === OrderStatus.PARTIALLY_FILLED) {
        if (order.expiryTick && currentTick >= order.expiryTick) {
          order.status = OrderStatus.EXPIRED;
          order.lastUpdatedTick = currentTick;
          this.removeFromIndex(order);
          expired.push(order);
        }
      }
    }
    
    return expired;
  }
  
  /**
   * 获取订单
   */
  getOrder(orderId: number): AdvancedOrder | undefined {
    return this.orders.get(orderId);
  }
  
  /**
   * 获取公司的所有订单
   */
  getCompanyOrders(companyId: number): AdvancedOrder[] {
    const orderIds = this.ordersByCompany.get(companyId);
    if (!orderIds) return [];
    
    return Array.from(orderIds)
      .map(id => this.orders.get(id))
      .filter((o): o is AdvancedOrder => o !== undefined);
  }
  
  /**
   * 获取商品的活跃订单
   */
  getGoodsActiveOrders(goodsId: number): AdvancedOrder[] {
    const orderIds = this.ordersByGoods.get(goodsId);
    if (!orderIds) return [];
    
    return Array.from(orderIds)
      .map(id => this.orders.get(id))
      .filter((o): o is AdvancedOrder => 
        o !== undefined && 
        (o.status === OrderStatus.ACTIVE || o.status === OrderStatus.PARTIALLY_FILLED)
      );
  }
  
  /**
   * 创建括号订单（买入 + 止损 + 止盈）
   */
  createBracketOrder(
    companyId: number,
    goodsId: number,
    quantity: number,
    entryPrice: number,
    stopLossPrice: number,
    takeProfitPrice: number,
    currentTick: number
  ): { entryOrder: AdvancedOrder; stopLoss: AdvancedOrder; takeProfit: AdvancedOrder } {
    // 创建入场订单
    const entryOrder = this.createOrder({
      type: OrderType.LIMIT,
      companyId,
      goodsId,
      isBuy: true,
      quantity,
      price: entryPrice,
    }, currentTick);
    
    // 创建止损订单（待触发）
    const stopLoss = this.createOrder({
      type: OrderType.STOP_LOSS,
      companyId,
      goodsId,
      isBuy: false,
      quantity,
      price: stopLossPrice,
      triggerPrice: stopLossPrice,
    }, currentTick);
    
    // 创建止盈订单（待触发）
    const takeProfit = this.createOrder({
      type: OrderType.TAKE_PROFIT,
      companyId,
      goodsId,
      isBuy: false,
      quantity,
      price: takeProfitPrice,
      takeProfitPrice: takeProfitPrice,
    }, currentTick);
    
    // 关联订单（OCO关系）
    stopLoss.linkedOrderIds = [takeProfit.id];
    takeProfit.linkedOrderIds = [stopLoss.id];
    stopLoss.parentOrderId = entryOrder.id;
    takeProfit.parentOrderId = entryOrder.id;
    
    return { entryOrder, stopLoss, takeProfit };
  }
}

// ==================== 单例实例 ====================

export const advancedOrderManager = new AdvancedOrderManager();

// ==================== 工具函数 ====================

/**
 * 获取订单类型名称
 */
export function getOrderTypeName(type: OrderType): string {
  const names: Record<OrderType, string> = {
    [OrderType.LIMIT]: '限价单',
    [OrderType.MARKET]: '市价单',
    [OrderType.STOP_LOSS]: '止损单',
    [OrderType.STOP_BUY]: '突破买入',
    [OrderType.TAKE_PROFIT]: '止盈单',
    [OrderType.STOP_LIMIT]: '限价止损',
    [OrderType.OCO]: '二选一订单',
    [OrderType.BRACKET]: '括号订单',
    [OrderType.ICEBERG]: '冰山订单',
    [OrderType.TWAP]: 'TWAP订单',
    [OrderType.VWAP]: 'VWAP订单',
    [OrderType.GTC]: '永久有效',
    [OrderType.GTD]: '限期有效',
    [OrderType.IOC]: '即时成交',
    [OrderType.FOK]: '全额成交',
  };
  return names[type] ?? '未知';
}

/**
 * 获取订单状态名称
 */
export function getOrderStatusName(status: OrderStatus): string {
  const names: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: '待触发',
    [OrderStatus.ACTIVE]: '活跃',
    [OrderStatus.PARTIALLY_FILLED]: '部分成交',
    [OrderStatus.FILLED]: '已成交',
    [OrderStatus.CANCELLED]: '已取消',
    [OrderStatus.EXPIRED]: '已过期',
    [OrderStatus.TRIGGERED]: '已触发',
  };
  return names[status] ?? '未知';
}

/**
 * 格式化订单信息
 */
export function formatOrderInfo(order: AdvancedOrder): string {
  const typeName = getOrderTypeName(order.type);
  const statusName = getOrderStatusName(order.status);
  const direction = order.isBuy ? '买入' : '卖出';
  
  let info = `${typeName} ${direction} ${order.quantity}单位 @ ¥${order.price.toFixed(2)}`;
  
  if (order.triggerPrice) {
    info += ` (触发价: ¥${order.triggerPrice.toFixed(2)})`;
  }
  
  info += ` [${statusName}]`;
  
  if (order.filledQuantity > 0) {
    info += ` 已成交: ${order.filledQuantity}单位 @ ¥${order.avgFillPrice.toFixed(2)}`;
  }
  
  return info;
}