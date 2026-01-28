/**
 * 订单簿索引系统
 * 维护每个商品的买卖单有序列表，实现O(log n)的插入和O(1)的最优价格查找
 */

import { GOODS_COUNT, MAX_ORDERS } from '../constants';

/**
 * 有序数组实现（支持动态扩容）
 * 使用二分查找维护排序
 */
class SortedOrderArray {
  private indices: Uint32Array;  // 改用 Uint32Array 支持更大索引
  private prices: Float32Array;
  private count: number = 0;
  private capacity: number;
  private ascending: boolean;
  private maxCapacity: number;  // 最大容量限制
  
  constructor(capacity: number, ascending: boolean = true, maxCapacity: number = 10000) {
    this.capacity = capacity;
    this.ascending = ascending;
    this.maxCapacity = maxCapacity;
    this.indices = new Uint32Array(capacity);
    this.prices = new Float32Array(capacity);
  }
  
  /**
   * 二分查找插入位置
   */
  private binarySearch(price: number): number {
    let left = 0;
    let right = this.count;
    
    while (left < right) {
      const mid = (left + right) >>> 1;
      const cmp = this.ascending
        ? this.prices[mid] - price
        : price - this.prices[mid];
      
      if (cmp < 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return left;
  }
  
  /**
   * 动态扩容
   */
  private grow(): boolean {
    if (this.capacity >= this.maxCapacity) {
      return false;  // 已达最大容量
    }
    
    const newCapacity = Math.min(this.capacity * 2, this.maxCapacity);
    const newIndices = new Uint32Array(newCapacity);
    const newPrices = new Float32Array(newCapacity);
    
    // 复制旧数据
    newIndices.set(this.indices.subarray(0, this.count));
    newPrices.set(this.prices.subarray(0, this.count));
    
    this.indices = newIndices;
    this.prices = newPrices;
    this.capacity = newCapacity;
    
    return true;
  }
  
  /**
   * 插入订单 O(log n + n) - 需要移动元素，支持自动扩容
   */
  insert(orderIdx: number, price: number): boolean {
    // 容量不足时尝试扩容
    if (this.count >= this.capacity) {
      if (!this.grow()) {
        // 扩容失败，静默处理（避免日志刷屏）
        return false;
      }
    }
    
    const pos = this.binarySearch(price);
    
    // 移动后面的元素
    for (let i = this.count; i > pos; i--) {
      this.indices[i] = this.indices[i - 1];
      this.prices[i] = this.prices[i - 1];
    }
    
    this.indices[pos] = orderIdx;
    this.prices[pos] = price;
    this.count++;
    return true;
  }
  
  /**
   * 删除订单 O(n) - 需要查找和移动
   */
  remove(orderIdx: number): boolean {
    for (let i = 0; i < this.count; i++) {
      if (this.indices[i] === orderIdx) {
        // 移动后面的元素
        for (let j = i; j < this.count - 1; j++) {
          this.indices[j] = this.indices[j + 1];
          this.prices[j] = this.prices[j + 1];
        }
        this.count--;
        return true;
      }
    }
    return false;
  }
  
  /**
   * 获取最优订单（第一个） O(1)
   */
  peek(): number | null {
    return this.count > 0 ? this.indices[0] : null;
  }
  
  /**
   * 获取最优价格 O(1)
   */
  peekPrice(): number | null {
    return this.count > 0 ? this.prices[0] : null;
  }
  
  /**
   * 弹出最优订单 O(n) - 需要移动元素
   */
  pop(): number | null {
    if (this.count === 0) return null;
    
    const result = this.indices[0];
    
    // 移动所有元素
    for (let i = 0; i < this.count - 1; i++) {
      this.indices[i] = this.indices[i + 1];
      this.prices[i] = this.prices[i + 1];
    }
    
    this.count--;
    return result;
  }
  
  /**
   * 获取所有订单索引（已排序）
   */
  getAll(): Uint32Array {
    return this.indices.subarray(0, this.count);
  }
  
  /**
   * 检查是否有空间
   */
  hasCapacity(): boolean {
    return this.count < this.capacity || this.capacity < this.maxCapacity;
  }
  
  /**
   * 获取当前容量使用率
   */
  getUsage(): number {
    return this.count / this.capacity;
  }
  
  /**
   * 获取订单数量
   */
  size(): number {
    return this.count;
  }
  
  /**
   * 清空
   */
  clear(): void {
    this.count = 0;
  }
  
  /**
   * 更新订单价格（删除后重新插入）
   */
  updatePrice(orderIdx: number, newPrice: number): boolean {
    if (this.remove(orderIdx)) {
      this.insert(orderIdx, newPrice);
      return true;
    }
    return false;
  }
}

/**
 * 单个商品的订单索引
 */
interface GoodsOrderIndex {
  buyOrders: SortedOrderArray;   // 按价格降序（最高买价优先）
  sellOrders: SortedOrderArray;  // 按价格升序（最低卖价优先）
}

/**
 * 订单簿索引管理器
 * 为每个商品维护有序的买卖单列表
 */
export class OrderBookIndex {
  private indices: GoodsOrderIndex[];
  private orderToGoods: Uint8Array;   // 订单索引 -> 商品ID的映射
  private orderTypes: Uint8Array;      // 订单索引 -> 订单类型的映射 (0=buy, 1=sell)
  private isTracked: Uint8Array;       // 订单是否被追踪
  
  constructor(goodsCount: number = GOODS_COUNT, maxOrders: number = MAX_ORDERS) {
    this.indices = [];
    this.orderToGoods = new Uint8Array(maxOrders);
    this.orderTypes = new Uint8Array(maxOrders);
    this.isTracked = new Uint8Array(maxOrders);
    
    // 为每个商品创建索引
    // 初始容量较小，支持动态扩容到最大容量
    const initialCapacity = 500;  // 初始容量
    // 增大最大容量以支持更多订单（50000订单 / 230商品 ≈ 217，但分布不均匀需要更大缓冲）
    const maxCapacityPerGoods = Math.max(20000, Math.ceil(maxOrders / goodsCount * 10));  // 最大容量
    
    for (let i = 0; i < goodsCount; i++) {
      this.indices.push({
        buyOrders: new SortedOrderArray(initialCapacity, false, maxCapacityPerGoods),  // 降序
        sellOrders: new SortedOrderArray(initialCapacity, true, maxCapacityPerGoods),  // 升序
      });
    }
  }
  
  /**
   * 添加订单到索引 O(log n + n)
   * @returns 是否成功添加
   */
  addOrder(orderIdx: number, goodsId: number, type: 0 | 1, price: number): boolean {
    const idx = this.indices[goodsId];
    if (!idx) {
      console.warn(`[OrderBookIndex] 商品索引不存在: goodsId=${goodsId}`);
      return false;
    }
    
    let success: boolean;
    if (type === 0) {
      success = idx.buyOrders.insert(orderIdx, price);
    } else {
      success = idx.sellOrders.insert(orderIdx, price);
    }
    
    if (!success) {
      console.warn(`[OrderBookIndex] 插入订单失败: orderIdx=${orderIdx}, goodsId=${goodsId}, type=${type}`);
      return false;
    }
    
    // 记录映射
    this.orderToGoods[orderIdx] = goodsId;
    this.orderTypes[orderIdx] = type;
    this.isTracked[orderIdx] = 1;
    
    return true;
  }
  
  /**
   * 从索引中移除订单 O(n)
   */
  removeOrder(orderIdx: number): boolean {
    if (!this.isTracked[orderIdx]) return false;
    
    const goodsId = this.orderToGoods[orderIdx];
    const type = this.orderTypes[orderIdx];
    const idx = this.indices[goodsId];
    
    let removed = false;
    if (type === 0) {
      removed = idx.buyOrders.remove(orderIdx);
    } else {
      removed = idx.sellOrders.remove(orderIdx);
    }
    
    if (removed) {
      this.isTracked[orderIdx] = 0;
    }
    
    return removed;
  }
  
  /**
   * 获取某商品的最优买价 O(1)
   */
  getBestBidPrice(goodsId: number): number | null {
    return this.indices[goodsId]?.buyOrders.peekPrice() ?? null;
  }
  
  /**
   * 获取某商品的最优卖价 O(1)
   */
  getBestAskPrice(goodsId: number): number | null {
    return this.indices[goodsId]?.sellOrders.peekPrice() ?? null;
  }
  
  /**
   * 获取某商品的最优买单索引 O(1)
   */
  getBestBuyOrder(goodsId: number): number | null {
    return this.indices[goodsId]?.buyOrders.peek() ?? null;
  }
  
  /**
   * 获取某商品的最优卖单索引 O(1)
   */
  getBestSellOrder(goodsId: number): number | null {
    return this.indices[goodsId]?.sellOrders.peek() ?? null;
  }
  
  /**
   * 获取某商品的所有买单索引（已按价格降序排列）
   */
  getAllBuyOrders(goodsId: number): Uint32Array {
    return this.indices[goodsId]?.buyOrders.getAll() ?? new Uint32Array(0);
  }
  
  /**
   * 获取某商品的所有卖单索引（已按价格升序排列）
   */
  getAllSellOrders(goodsId: number): Uint32Array {
    return this.indices[goodsId]?.sellOrders.getAll() ?? new Uint32Array(0);
  }
  
  /**
   * 检查某商品是否有订单容量
   */
  hasCapacity(goodsId: number, type: 0 | 1): boolean {
    const idx = this.indices[goodsId];
    if (!idx) return false;
    return type === 0 ? idx.buyOrders.hasCapacity() : idx.sellOrders.hasCapacity();
  }
  
  /**
   * 获取某商品的买单数量
   */
  getBuyOrderCount(goodsId: number): number {
    return this.indices[goodsId]?.buyOrders.size() ?? 0;
  }
  
  /**
   * 获取某商品的卖单数量
   */
  getSellOrderCount(goodsId: number): number {
    return this.indices[goodsId]?.sellOrders.size() ?? 0;
  }
  
  /**
   * 获取买卖价差
   */
  getSpread(goodsId: number): number | null {
    const bid = this.getBestBidPrice(goodsId);
    const ask = this.getBestAskPrice(goodsId);
    
    if (bid === null || ask === null) return null;
    return ask - bid;
  }
  
  /**
   * 获取中间价
   */
  getMidPrice(goodsId: number): number | null {
    const bid = this.getBestBidPrice(goodsId);
    const ask = this.getBestAskPrice(goodsId);
    
    if (bid === null || ask === null) return null;
    return (bid + ask) / 2;
  }
  
  /**
   * 清空某商品的所有订单
   */
  clearGoods(goodsId: number): void {
    const idx = this.indices[goodsId];
    if (idx) {
      idx.buyOrders.clear();
      idx.sellOrders.clear();
    }
  }
  
  /**
   * 清空所有索引
   */
  clearAll(): void {
    for (const idx of this.indices) {
      idx.buyOrders.clear();
      idx.sellOrders.clear();
    }
    this.isTracked.fill(0);
  }
  
  /**
   * 获取市场深度统计
   */
  getMarketDepth(goodsId: number): { buyDepth: number; sellDepth: number; buyVolume: number; sellVolume: number } {
    return {
      buyDepth: this.getBuyOrderCount(goodsId),
      sellDepth: this.getSellOrderCount(goodsId),
      buyVolume: 0,  // 需要遍历订单计算，暂不实现
      sellVolume: 0,
    };
  }
}

// 全局订单簿索引实例
let globalOrderBookIndex: OrderBookIndex | null = null;

/**
 * 获取或创建全局订单簿索引
 */
export function getOrderBookIndex(): OrderBookIndex {
  if (!globalOrderBookIndex) {
    globalOrderBookIndex = new OrderBookIndex();
  }
  return globalOrderBookIndex;
}

/**
 * 重置全局订单簿索引
 */
export function resetOrderBookIndex(): void {
  globalOrderBookIndex = new OrderBookIndex();
}

export { SortedOrderArray };