/**
 * 订单簿系统
 * 管理买卖订单的创建、匹配和取消
 *
 * 性能优化：
 * - 集成OrderBookIndex维护有序索引
 * - 使用公司-商品索引避免O(n)遍历
 * - 提前检查订单池状态避免无效计算
 */

import { GameWorld } from '../world/GameWorld';
import {
  GOODS_COUNT,
  MAX_ORDERS,
  MAX_COMPANIES,
  ACTUAL_GOODS_COUNT,
  ORDER_POOL_WARNING_THRESHOLD,
  ORDER_POOL_CRITICAL_THRESHOLD,
  TICKS_PER_DAY,
} from '../constants';
import { getOrderBookIndex } from './OrderBookIndex';

/**
 * 订单类型
 */
export type OrderType = 'buy' | 'sell';

/**
 * 订单接口
 */
export interface Order {
  id: number;
  companyId: number;
  goodsId: number;
  type: OrderType;
  quantity: number;
  price: number;
  remaining: number;
  createdTick: number;
  expiryTick: number;
}

/**
 * 成交记录
 */
export interface Trade {
  id: number;
  buyOrderId: number;
  sellOrderId: number;
  buyCompanyId: number;
  sellCompanyId: number;
  goodsId: number;
  quantity: number;
  price: number;
  value: number;
  tick: number;
}

// ==================== 公司-商品订单索引 ====================

/**
 * 公司商品订单索引
 * 维护每个(公司, 商品, 类型)组合的订单列表
 * 复杂度从O(n)降到O(k)，k为该组合的订单数
 */
class CompanyGoodsOrderIndex {
  // 索引结构: Map<companyId * GOODS_COUNT * 2 + goodsId * 2 + type, Set<orderIdx>>
  private index: Map<number, Set<number>> = new Map();
  
  private getKey(companyId: number, goodsId: number, orderType: number): number {
    return companyId * GOODS_COUNT * 2 + goodsId * 2 + orderType;
  }
  
  /**
   * 添加订单到索引
   */
  add(orderIdx: number, companyId: number, goodsId: number, orderType: number): void {
    const key = this.getKey(companyId, goodsId, orderType);
    let set = this.index.get(key);
    if (!set) {
      set = new Set();
      this.index.set(key, set);
    }
    set.add(orderIdx);
  }
  
  /**
   * 从索引移除订单
   */
  remove(orderIdx: number, companyId: number, goodsId: number, orderType: number): void {
    const key = this.getKey(companyId, goodsId, orderType);
    const set = this.index.get(key);
    if (set) {
      set.delete(orderIdx);
      if (set.size === 0) {
        this.index.delete(key);
      }
    }
  }
  
  /**
   * 获取某公司某商品某类型的所有订单索引
   */
  getOrders(companyId: number, goodsId: number, orderType: number): Set<number> | undefined {
    const key = this.getKey(companyId, goodsId, orderType);
    return this.index.get(key);
  }
  
  /**
   * 获取订单数量（O(1)复杂度）
   */
  count(companyId: number, goodsId: number, orderType: number): number {
    const set = this.getOrders(companyId, goodsId, orderType);
    return set ? set.size : 0;
  }
  
  /**
   * 清空索引
   */
  clear(): void {
    this.index.clear();
  }
}

// 全局公司商品订单索引
let companyGoodsIndex: CompanyGoodsOrderIndex | null = null;

// ==================== 活跃订单索引（性能优化关键）====================

/**
 * 活跃订单索引集合
 * 用于避免遍历全量订单池（100万）
 * 只遍历实际活跃的订单（通常1千-1万）
 */
const activeOrderIndices: Set<number> = new Set();

/**
 * 获取活跃订单索引集合（供外部模块使用）
 */
export function getActiveOrderIndices(): Set<number> {
  return activeOrderIndices;
}

/**
 * 获取或创建公司商品订单索引
 */
function getCompanyGoodsIndex(): CompanyGoodsOrderIndex {
  if (!companyGoodsIndex) {
    companyGoodsIndex = new CompanyGoodsOrderIndex();
  }
  return companyGoodsIndex;
}

// ==================== 订单池管理 ====================

/**
 * 订单池管理器
 * 使用对象池避免频繁内存分配
 */
class OrderPool {
  private freeIndices: number[] = [];
  
  // 增量维护买卖单计数，避免每次统计都遍历
  public buyOrderCount = 0;
  public sellOrderCount = 0;
  
  constructor(maxSize: number) {
    // 初始化所有索引为空闲
    for (let i = maxSize - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
    this.buyOrderCount = 0;
    this.sellOrderCount = 0;
  }
  
  acquire(): number | null {
    if (this.freeIndices.length === 0) {
      return null;
    }
    return this.freeIndices.pop()!;
  }
  
  release(index: number): void {
    this.freeIndices.push(index);
  }
  
  get availableCount(): number {
    return this.freeIndices.length;
  }
  
  /**
   * 检查是否有可用槽位（用于提前退出）
   */
  hasAvailable(): boolean {
    return this.freeIndices.length > 0;
  }
  
  // 更新订单类型计数
  incrementOrderCount(orderType: number): void {
    if (orderType === 0) {
      this.buyOrderCount++;
    } else {
      this.sellOrderCount++;
    }
  }
  
  decrementOrderCount(orderType: number): void {
    if (orderType === 0) {
      this.buyOrderCount = Math.max(0, this.buyOrderCount - 1);
    } else {
      this.sellOrderCount = Math.max(0, this.sellOrderCount - 1);
    }
  }
}

// 全局订单池
let orderPool: OrderPool | null = null;
let orderPoolInitialized = false;

/**
 * 初始化订单池（幂等操作，只在首次调用时初始化）
 */
export function initOrderPool(): void {
  if (orderPoolInitialized) {
    return;  // 已经初始化过，跳过
  }
  orderPool = new OrderPool(MAX_ORDERS);
  companyGoodsIndex = new CompanyGoodsOrderIndex();
  orderPoolInitialized = true;
}

/**
 * 重置订单池（仅用于测试或重新开始游戏）
 */
export function resetOrderPool(): void {
  orderPool = new OrderPool(MAX_ORDERS);
  companyGoodsIndex = new CompanyGoodsOrderIndex();
  activeOrderIndices.clear();  // 清空活跃订单索引
  getOrderBookIndex().clearAll();  // 清空撮合索引，避免残留脏数据
  orderPoolInitialized = true;
}

/**
 * 同步订单池状态（修复订单池和world.orders不一致的问题）
 * 这个函数会根据world.orders中的实际活跃订单重建订单池
 * 注意：这是唯一需要遍历MAX_ORDERS的地方，只在同步时调用一次
 * 【关键修复】同时重建OrderBookIndex确保撮合引擎能找到所有订单
 */
export function syncOrderPoolWithWorld(world: GameWorld): { fixed: boolean; details: string } {
  const o = world.orders;
  const orderIndex = getOrderBookIndex();
  
  // 1. 统计world.orders中的实际活跃订单，并重建activeOrderIndices
  const foundActiveIndices: number[] = [];
  let actualBuyCount = 0;
  let actualSellCount = 0;
  
  // 清空并重建活跃订单索引
  activeOrderIndices.clear();
  
  for (let i = 0; i < MAX_ORDERS; i++) {
    if (o.isActive[i]) {
      foundActiveIndices.push(i);
      activeOrderIndices.add(i);  // 添加到全局活跃索引集合
      if (o.types[i] === 0) {
        actualBuyCount++;
      } else {
        actualSellCount++;
      }
    }
  }
  
  // 2. 检查订单池状态
  const poolAvailable = orderPool?.availableCount ?? 0;
  const expectedAvailable = MAX_ORDERS - foundActiveIndices.length;
  
  // 3. 如果不一致，重建订单池
  if (poolAvailable !== expectedAvailable) {
    console.warn(`[订单池同步] 检测到不一致：池可用${poolAvailable}, 应有${expectedAvailable}`);
    
    // 重建订单池
    orderPool = new OrderPool(MAX_ORDERS);
    orderPool.buyOrderCount = actualBuyCount;
    orderPool.sellOrderCount = actualSellCount;
    
    const details = `同步完成：活跃订单${foundActiveIndices.length}, 买${actualBuyCount}, 卖${actualSellCount}`;
    console.log(`[订单池同步] ${details}`);
    
    // 重建公司商品索引
    companyGoodsIndex = new CompanyGoodsOrderIndex();
    for (const idx of foundActiveIndices) {
      companyGoodsIndex!.add(idx, o.companyIds[idx], o.goodsIds[idx], o.types[idx]);
    }
    
    // 【关键修复】重建OrderBookIndex，确保撮合引擎能找到所有订单
    orderIndex.clearAll();
    for (const idx of foundActiveIndices) {
      const goodsId = o.goodsIds[idx];
      const orderType = o.types[idx] as 0 | 1;
      const price = o.prices[idx];
      orderIndex.addOrder(idx, goodsId, orderType, price);
    }
    return { fixed: true, details };
  }
  
  // 4. 【新增】即使订单池状态一致，也检查并同步 OrderBookIndex
  // 这是因为 OrderBookIndex 可能在其他地方被意外清空
  let orderIndexNeedsRebuild = false;
  for (const idx of foundActiveIndices) {
    const goodsId = o.goodsIds[idx];
    const orderType = o.types[idx] as 0 | 1;
    
    // 检查订单是否在 OrderBookIndex 中
    const allOrders = orderType === 0
      ? orderIndex.getAllBuyOrders(goodsId)
      : orderIndex.getAllSellOrders(goodsId);
    
    let found = false;
    for (let i = 0; i < allOrders.length; i++) {
      if (allOrders[i] === idx) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      orderIndexNeedsRebuild = true;
      break;
    }
  }
  
  if (orderIndexNeedsRebuild) {
    console.warn(`[订单池同步] OrderBookIndex与订单池不同步，正在重建...`);
    orderIndex.clearAll();
    for (const idx of foundActiveIndices) {
      const goodsId = o.goodsIds[idx];
      const orderType = o.types[idx] as 0 | 1;
      const price = o.prices[idx];
      orderIndex.addOrder(idx, goodsId, orderType, price);
    }
    return { fixed: true, details: `OrderBookIndex已同步，包含${foundActiveIndices.length}个订单` };
  }
  
  return { fixed: false, details: `订单池状态正常：可用${poolAvailable}/${MAX_ORDERS}` };
}

/**
 * 检查订单池是否有可用空间（用于提前退出）
 */
export function hasOrderPoolCapacity(): boolean {
  return orderPool?.hasAvailable() ?? false;
}

/**
 * 释放订单槽位到对象池（供撮合引擎使用）
 * 当订单完全成交后调用此函数归还槽位
 */
export function releaseOrderSlot(orderIdx: number, orderType: number): void {
  if (orderPool) {
    orderPool.decrementOrderCount(orderType);
    orderPool.release(orderIdx);
  }
}

/**
 * 从公司商品索引中移除订单（供撮合引擎使用）
 */
export function removeFromCompanyGoodsIndex(
  orderIdx: number,
  companyId: number,
  goodsId: number,
  orderType: number
): void {
  const cgIndex = getCompanyGoodsIndex();
  cgIndex.remove(orderIdx, companyId, goodsId, orderType);
}

export function finalizeFilledOrder(world: GameWorld, orderIdx: number): void {
  const o = world.orders;
  if (!o.isActive[orderIdx] || o.remainings[orderIdx] > 0) {
    return;
  }

  const companyId = o.companyIds[orderIdx];
  const goodsId = o.goodsIds[orderIdx];
  const orderType = o.types[orderIdx];

  getOrderBookIndex().removeOrder(orderIdx);
  removeFromCompanyGoodsIndex(orderIdx, companyId, goodsId, orderType);
  activeOrderIndices.delete(orderIdx);
  o.isActive[orderIdx] = 0;
  o.activeCount--;
  releaseOrderSlot(orderIdx, orderType);
}

/** 每公司每商品最大订单数（放宽限制） */
const MAX_ORDERS_PER_COMPANY_GOODS = 6;

/** 价格合并容差（5%以内视为相同价格，增加合并率以减少订单池压力） */
const PRICE_MERGE_TOLERANCE = 0.05;

/** 单个订单最大数量限制（大幅提高以支持大额交易） */
const MAX_ORDER_QUANTITY = 100000;
const BUY_ORDER_EXPIRY_TICKS = TICKS_PER_DAY;
const SELL_ORDER_EXPIRY_TICKS = TICKS_PER_DAY * 2;
const ORDER_PRICE_BAND = 0.50;

/** 单个订单最大合并后数量（大幅提高以支持大额交易） */
const MAX_MERGED_QUANTITY = 500000;

function getReferencePrice(world: GameWorld, goodsId: number): number {
  return world.goods.prices[goodsId] || world.goods.baseValues[goodsId] || 1;
}

function normalizeOrderPrice(world: GameWorld, goodsId: number, orderType: number, requestedPrice: number): number {
  const referencePrice = getReferencePrice(world, goodsId);
  const minPrice = referencePrice * (1 - ORDER_PRICE_BAND);
  const maxPrice = referencePrice * (1 + ORDER_PRICE_BAND);

  if (orderType === 0) {
    return Math.max(minPrice, Math.min(maxPrice, requestedPrice));
  }

  return Math.max(minPrice, Math.min(maxPrice, requestedPrice));
}

/**
 * 统计某公司某商品的活跃订单数（优化版：O(1)复杂度）
 */
function countCompanyGoodsOrders(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  orderType: number
): number {
  // 使用索引直接获取数量，O(1)复杂度
  return getCompanyGoodsIndex().count(companyId, goodsId, orderType);
}

/**
 * 查找可合并的现有订单（优化版：使用索引，O(k)复杂度）
 * 条件：同一公司、同一商品、同一类型、价格在容差范围内（1%）
 * 优化：买单合并到最高价，卖单合并到最低价
 * @returns 订单索引，如果未找到返回 -1
 */
function findMatchingOrder(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  orderType: number,  // 0 = buy, 1 = sell
  price: number
): number {
  const o = world.orders;
  
  // 使用索引获取该公司该商品的订单集合
  const orderSet = getCompanyGoodsIndex().getOrders(companyId, goodsId, orderType);
  if (!orderSet || orderSet.size === 0) {
    return -1;  // 没有现有订单
  }
  
  // 价格容差：1%以内视为相同价格
  const priceTolerance = price * PRICE_MERGE_TOLERANCE;
  
  let bestIdx = -1;
  let bestPrice = orderType === 0 ? 0 : Infinity;  // 买单找最高价，卖单找最低价
  
  // 只遍历该公司该商品的订单（通常只有几个）
  for (const orderIdx of orderSet) {
    if (!o.isActive[orderIdx]) continue;
    
    const existingPrice = o.prices[orderIdx];
    
    // 检查价格是否在容差范围内
    if (Math.abs(existingPrice - price) <= priceTolerance) {
      return orderIdx;
    }
    
    // 记录最优价格的订单用于强制合并
    if (orderType === 0) {  // 买单：找最高价
      if (existingPrice > bestPrice) {
        bestPrice = existingPrice;
        bestIdx = orderIdx;
      }
    } else {  // 卖单：找最低价
      if (existingPrice < bestPrice) {
        bestPrice = existingPrice;
        bestIdx = orderIdx;
      }
    }
  }
  
  return -1;  // 未找到
}

/**
 * 输出订单池性能调试信息
 */
export function logOrderPoolPerformance(currentTick: number): void {
  if (!orderPool) return;
  
  const available = orderPool.availableCount;
  const buyCount = orderPool.buyOrderCount;
  const sellCount = orderPool.sellOrderCount;
  const total = buyCount + sellCount;
  
  console.log(`[订单池 T${currentTick}] 可用槽位: ${available}/${MAX_ORDERS}, 活跃订单: ${total} (买${buyCount}/卖${sellCount}), 使用率: ${((1 - available/MAX_ORDERS) * 100).toFixed(1)}%`);
  
  // 如果槽位严重不足，输出警告
  if (available < 1000) {
    console.warn(`[订单池警告] 可用槽位只剩 ${available}！可能存在槽位泄漏。`);
  }
}

/**
 * 创建买单（支持订单合并）
 * 如果存在相同公司、商品、价格的买单，将合并到现有订单
 *
 * 性能优化：
 * - 提前检查订单池容量，避免无效计算
 * - 使用公司商品索引加速合并查找
 * - 限制单个订单最大数量，防止无限堆积
 */
export function createBuyOrder(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  quantity: number,
  price: number,
  expiryTicks: number = BUY_ORDER_EXPIRY_TICKS
): number | null {
  // 【优化】提前初始化并检查容量
  if (!orderPool) {
    initOrderPool();
  }
  
  const o = world.orders;
  const c = world.companies;
  const orderIndex = getOrderBookIndex();
  const cgIndex = getCompanyGoodsIndex();
  
  // 【新增】限制单个订单数量，防止无限堆积
  const clampedQuantity = Math.min(quantity, MAX_ORDER_QUANTITY);
  if (clampedQuantity <= 0) {
    return null;
  }
  const normalizedPrice = normalizeOrderPrice(world, goodsId, 0, price);
  
  // 检查公司现金是否足够
  const totalValue = clampedQuantity * normalizedPrice;
  if (c.cash[companyId] < totalValue) {
    return null;
  }
  
  // 查找可合并的现有订单（使用优化后的索引查找）
  const existingOrderIdx = findMatchingOrder(world, companyId, goodsId, 0, normalizedPrice);
  
  if (existingOrderIdx >= 0) {
    // 【新增】检查合并后是否超过最大数量限制
    const currentRemaining = o.remainings[existingOrderIdx];
    if (currentRemaining >= MAX_MERGED_QUANTITY) {
      // 已达到最大合并数量，拒绝继续合并，静默失败
      return null;
    }
    
    // 计算实际可合并的数量
    const maxAddable = MAX_MERGED_QUANTITY - currentRemaining;
    const actualAddQuantity = Math.min(clampedQuantity, maxAddable);
    
    if (actualAddQuantity <= 0) {
      return null;
    }
    
    // 找到可合并的订单，合并数量
    const actualValue = actualAddQuantity * normalizedPrice;
    c.cash[companyId] -= actualValue;  // 冻结资金
    
    o.quantities[existingOrderIdx] += actualAddQuantity;
    o.remainings[existingOrderIdx] += actualAddQuantity;
    
    // 延长过期时间（取较晚的）
    const newExpiry = world.tick + expiryTicks;
    if (newExpiry > o.expiries[existingOrderIdx]) {
      o.expiries[existingOrderIdx] = newExpiry;
    }
    
    // 返回一个特殊值表示合并成功（使用负数表示合并到索引）
    return -(existingOrderIdx + 1);
  }
  
  // 【优化】提前检查池容量，避免后续无效计算
  if (!orderPool!.hasAvailable()) {
    // 静默失败，不输出警告（避免日志刷屏）
    return null;
  }
  
  const orderIdx = orderPool!.acquire();
  if (orderIdx === null) {
    return null;
  }
  
  // 冻结资金（使用实际入簿价格）
  c.cash[companyId] -= clampedQuantity * normalizedPrice;
  
  // 创建订单
  const orderId = o.nextOrderId++;
  o.companyIds[orderIdx] = companyId;
  o.goodsIds[orderIdx] = goodsId;
  o.types[orderIdx] = 0;  // 0 = buy
  o.quantities[orderIdx] = clampedQuantity;
  o.prices[orderIdx] = normalizedPrice;
  o.remainings[orderIdx] = clampedQuantity;
  o.createdTicks[orderIdx] = world.tick;
  o.expiries[orderIdx] = world.tick + expiryTicks;
  o.isActive[orderIdx] = 1;
  o.activeCount++;
  
  // 【性能优化】添加到活跃订单索引集合
  activeOrderIndices.add(orderIdx);
  
  // 更新买单计数
  orderPool!.incrementOrderCount(0);
  
  // 添加到订单簿索引（【关键修复】检查返回值确保同步成功）
  const indexAdded = orderIndex.addOrder(orderIdx, goodsId, 0, normalizedPrice);
  if (!indexAdded) {
    console.error(`[createBuyOrder] 订单添加到索引失败: orderIdx=${orderIdx}, goodsId=${goodsId}, price=${price}`);
    // 不回滚，订单仍然有效，只是撮合可能需要通过备用路径
  }
  
  // 【新增】添加到公司商品索引
  cgIndex.add(orderIdx, companyId, goodsId, 0);
  
  return orderId;
}

/**
 * 订单创建结果
 */
export interface OrderResult {
  success: boolean;
  orderId: number | null;
  reason?: string;
  actualQuantity?: number;
}

/**
 * 创建卖单（支持订单合并）
 * 如果存在相同公司、商品、价格的卖单，将合并到现有订单
 *
 * 性能优化：
 * - 提前检查订单池容量，避免无效计算
 * - 使用公司商品索引加速合并查找
 * - 限制单个订单最大数量，防止无限堆积
 */
export function createSellOrder(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  quantity: number,
  price: number,
  expiryTicks: number = SELL_ORDER_EXPIRY_TICKS
): number | null {
  const result = createSellOrderWithReason(world, companyId, goodsId, quantity, price, expiryTicks);
  return result.orderId;
}

/**
 * 创建卖单（带详细失败原因）
 */
export function createSellOrderWithReason(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  quantity: number,
  price: number,
  expiryTicks: number = SELL_ORDER_EXPIRY_TICKS
): OrderResult {
  // 【优化】提前初始化并检查容量
  if (!orderPool) {
    initOrderPool();
  }
  
  const o = world.orders;
  const c = world.companies;
  const orderIndex = getOrderBookIndex();
  const cgIndex = getCompanyGoodsIndex();
  
  // 数量验证
  if (quantity <= 0) {
    return { success: false, orderId: null, reason: '数量必须大于0' };
  }
  const normalizedPrice = normalizeOrderPrice(world, goodsId, 1, price);
  
  // 限制单个卖单数量，避免生产型 AI 把百万库存一次性砸成单笔巨单
  const clampedQuantity = Math.min(quantity, MAX_ORDER_QUANTITY);
  if (clampedQuantity <= 0) {
    return { success: false, orderId: null, reason: '数量必须大于0' };
  }
  
  // 检查库存是否足够
  const inventoryIdx = companyId * GOODS_COUNT + goodsId;
  const totalInventory = c.inventories[inventoryIdx];
  const reserved = c.inventoryReserved[inventoryIdx];
  const available = totalInventory - reserved;
  
  if (available < clampedQuantity) {
    return {
      success: false,
      orderId: null,
      reason: `库存不足：可用 ${available.toFixed(0)}，需要 ${clampedQuantity.toFixed(0)}（总库存 ${totalInventory.toFixed(0)}，已预留 ${reserved.toFixed(0)}）`
    };
  }
  
  // 查找可合并的现有订单（使用优化后的索引查找）
  const existingOrderIdx = findMatchingOrder(world, companyId, goodsId, 1, normalizedPrice);
  
  if (existingOrderIdx >= 0) {
    // 【新增】检查合并后是否超过最大数量限制
    const currentRemaining = o.remainings[existingOrderIdx];
    if (currentRemaining >= MAX_MERGED_QUANTITY) {
      return {
        success: false,
        orderId: null,
        reason: `订单合并数量已达上限 ${MAX_MERGED_QUANTITY.toLocaleString()}`
      };
    }
    
    // 计算实际可合并的数量
    const maxAddable = MAX_MERGED_QUANTITY - currentRemaining;
    const actualAddQuantity = Math.min(clampedQuantity, maxAddable);
    
    if (actualAddQuantity <= 0) {
      return {
        success: false,
        orderId: null,
        reason: '无法添加更多数量到现有订单'
      };
    }
    
    // 找到可合并的订单，合并数量
    c.inventoryReserved[inventoryIdx] += actualAddQuantity;  // 冻结库存
    
    o.quantities[existingOrderIdx] += actualAddQuantity;
    o.remainings[existingOrderIdx] += actualAddQuantity;
    
    // 延长过期时间（取较晚的）
    const newExpiry = world.tick + expiryTicks;
    if (newExpiry > o.expiries[existingOrderIdx]) {
      o.expiries[existingOrderIdx] = newExpiry;
    }
    
    // 返回一个特殊值表示合并成功（使用负数表示合并到索引）
    return {
      success: true,
      orderId: -(existingOrderIdx + 1),
      actualQuantity: actualAddQuantity,
      reason: actualAddQuantity < clampedQuantity ? `部分合并：${actualAddQuantity.toFixed(0)}/${clampedQuantity.toFixed(0)}` : undefined
    };
  }
  
  // 【优化】提前检查池容量，避免后续无效计算
  if (!orderPool!.hasAvailable()) {
    return {
      success: false,
      orderId: null,
      reason: '订单池已满，请等待现有订单成交或过期'
    };
  }
  
  const orderIdx = orderPool!.acquire();
  if (orderIdx === null) {
    return {
      success: false,
      orderId: null,
      reason: '无法获取订单槽位'
    };
  }
  
  // 冻结库存
  c.inventoryReserved[inventoryIdx] += clampedQuantity;
  
  // 创建订单
  const orderId = o.nextOrderId++;
  o.companyIds[orderIdx] = companyId;
  o.goodsIds[orderIdx] = goodsId;
  o.types[orderIdx] = 1;  // 1 = sell
  o.quantities[orderIdx] = clampedQuantity;
  o.prices[orderIdx] = normalizedPrice;
  o.remainings[orderIdx] = clampedQuantity;
  o.createdTicks[orderIdx] = world.tick;
  o.expiries[orderIdx] = world.tick + expiryTicks;
  o.isActive[orderIdx] = 1;
  o.activeCount++;
  
  // 【性能优化】添加到活跃订单索引集合
  activeOrderIndices.add(orderIdx);
  
  // 更新卖单计数
  orderPool!.incrementOrderCount(1);
  
  // 添加到订单簿索引（【关键修复】检查返回值确保同步成功）
  const indexAdded = orderIndex.addOrder(orderIdx, goodsId, 1, normalizedPrice);
  if (!indexAdded) {
    console.error(`[createSellOrder] 订单添加到索引失败: orderIdx=${orderIdx}, goodsId=${goodsId}, price=${price}`);
    // 不回滚，订单仍然有效，只是撮合可能需要通过备用路径
  }
  
  // 【新增】添加到公司商品索引
  cgIndex.add(orderIdx, companyId, goodsId, 1);
  
  return { success: true, orderId, actualQuantity: clampedQuantity };
}

/**
 * 取消订单
 */
export function cancelOrder(
  world: GameWorld,
  orderIdx: number
): boolean {
  const o = world.orders;
  const c = world.companies;
  const orderIndex = getOrderBookIndex();
  const cgIndex = getCompanyGoodsIndex();
  
  if (!o.isActive[orderIdx]) {
    return false;
  }
  
  const companyId = o.companyIds[orderIdx];
  const goodsId = o.goodsIds[orderIdx];
  const remaining = o.remainings[orderIdx];
  const price = o.prices[orderIdx];
  const type = o.types[orderIdx];
  
  if (type === 0) {
    // 买单：退还冻结资金
    c.cash[companyId] += remaining * price;
  } else {
    // 卖单：释放冻结库存
    const inventoryIdx = companyId * GOODS_COUNT + goodsId;
    c.inventoryReserved[inventoryIdx] -= remaining;
  }
  
  // 从订单簿索引移除
  orderIndex.removeOrder(orderIdx);
  
  // 【新增】从公司商品索引移除
  cgIndex.remove(orderIdx, companyId, goodsId, type);
  
  // 标记为非激活
  o.isActive[orderIdx] = 0;
  o.activeCount--;
  
  // 【性能优化】从活跃订单索引集合移除
  activeOrderIndices.delete(orderIdx);
  
  // 更新订单类型计数
  orderPool?.decrementOrderCount(type);
  
  // 释放到对象池
  orderPool?.release(orderIdx);
  
  return true;
}

export function cancelCompanyOrders(
  world: GameWorld,
  companyId: number,
): {
  orderIndices: number[];
  refundedCash: number;
  returnedInventory: number;
} {
  const o = world.orders;
  const orderIndices: number[] = [];
  let refundedCash = 0;
  let returnedInventory = 0;

  for (const orderIdx of activeOrderIndices) {
    if (!o.isActive[orderIdx]) {
      continue;
    }
    if (o.companyIds[orderIdx] !== companyId) {
      continue;
    }

    orderIndices.push(orderIdx);
    const remaining = o.remainings[orderIdx];
    if (o.types[orderIdx] === 0) {
      refundedCash += remaining * o.prices[orderIdx];
    } else {
      returnedInventory += remaining;
    }
  }

  for (const orderIdx of orderIndices) {
    cancelOrder(world, orderIdx);
  }

  return {
    orderIndices,
    refundedCash,
    returnedInventory,
  };
}

/**
 * 清理过期订单（性能优化版：使用活跃订单索引）
 * 复杂度从O(MAX_ORDERS)降为O(活跃订单数)
 */
export function cleanupExpiredOrders(world: GameWorld): number {
  const o = world.orders;
  let cleanedCount = 0;
  
  // 收集要删除的订单（避免在遍历中修改集合）
  const toDelete: number[] = [];
  
  // 只遍历活跃订单，而不是全部100万个槽位
  for (const orderIdx of activeOrderIndices) {
    if (o.expiries[orderIdx] <= world.tick) {
      toDelete.push(orderIdx);
    }
  }
  
  // 批量取消过期订单
  for (const orderIdx of toDelete) {
    cancelOrder(world, orderIdx);
    cleanedCount++;
  }
  
  return cleanedCount;
}

/**
 * 获取某商品的订单簿视图（性能优化版：使用活跃订单索引）
 * 复杂度从O(MAX_ORDERS)降为O(活跃订单数)
 */
export function getOrderBookView(
  world: GameWorld,
  goodsId: number
): OrderBookView {
  const o = world.orders;
  
  const buyOrders: OrderView[] = [];
  const sellOrders: OrderView[] = [];
  
  // 只遍历活跃订单，而不是全部100万个槽位
  for (const orderIdx of activeOrderIndices) {
    if (o.goodsIds[orderIdx] !== goodsId) continue;
    
    const orderView: OrderView = {
      idx: orderIdx,
      companyId: o.companyIds[orderIdx],
      price: o.prices[orderIdx],
      remaining: o.remainings[orderIdx],
      createdTick: o.createdTicks[orderIdx],
    };
    
    if (o.types[orderIdx] === 0) {
      buyOrders.push(orderView);
    } else {
      sellOrders.push(orderView);
    }
  }
  
  // 买单按价格降序排列（最高价优先）
  buyOrders.sort((a, b) => b.price - a.price);
  
  // 卖单按价格升序排列（最低价优先）
  sellOrders.sort((a, b) => a.price - b.price);
  
  // 计算统计数据
  const bestBid = buyOrders.length > 0 ? buyOrders[0].price : null;
  const bestAsk = sellOrders.length > 0 ? sellOrders[0].price : null;
  const spread = bestBid && bestAsk ? (bestAsk - bestBid) / bestBid : null;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : null;
  
  const totalBuyVolume = buyOrders.reduce((sum, o) => sum + o.remaining, 0);
  const totalSellVolume = sellOrders.reduce((sum, o) => sum + o.remaining, 0);
  
  return {
    goodsId,
    buyOrders,
    sellOrders,
    bestBid,
    bestAsk,
    spread,
    midPrice,
    totalBuyVolume,
    totalSellVolume,
  };
}

/**
 * 订单视图（简化版本用于UI显示）
 */
export interface OrderView {
  idx: number;
  companyId: number;
  price: number;
  remaining: number;
  createdTick: number;
}

/**
 * 订单簿视图
 */
export interface OrderBookView {
  goodsId: number;
  buyOrders: OrderView[];
  sellOrders: OrderView[];
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  midPrice: number | null;
  totalBuyVolume: number;
  totalSellVolume: number;
}

/**
 * 聚合订单簿深度
 * 将价格相近的订单合并显示
 */
export function aggregateOrderBook(
  view: OrderBookView,
  priceStep: number = 1
): AggregatedOrderBook {
  const aggregateSide = (orders: OrderView[]): AggregatedLevel[] => {
    const levels: Map<number, number> = new Map();
    
    for (const order of orders) {
      const levelPrice = Math.floor(order.price / priceStep) * priceStep;
      levels.set(levelPrice, (levels.get(levelPrice) || 0) + order.remaining);
    }
    
    return Array.from(levels.entries())
      .map(([price, volume]) => ({ price, volume }))
      .sort((a, b) => b.price - a.price);
  };
  
  return {
    goodsId: view.goodsId,
    bids: aggregateSide(view.buyOrders),
    asks: aggregateSide(view.sellOrders).reverse(),
    bestBid: view.bestBid,
    bestAsk: view.bestAsk,
    spread: view.spread,
  };
}

export interface AggregatedLevel {
  price: number;
  volume: number;
}

export interface AggregatedOrderBook {
  goodsId: number;
  bids: AggregatedLevel[];
  asks: AggregatedLevel[];
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
}

/**
 * 订单池统计信息
 */
export interface OrderPoolStats {
  maxOrders: number;
  activeOrders: number;
  availableSlots: number;
  usagePercent: number;
  buyOrders: number;
  sellOrders: number;
}

/**
 * 获取订单池统计信息（优化版：O(1)复杂度，使用增量维护的计数器）
 */
export function getOrderPoolStats(world: GameWorld): OrderPoolStats {
  const o = world.orders;
  
  const activeOrders = o.activeCount;
  const availableSlots = orderPool?.availableCount ?? (MAX_ORDERS - activeOrders);
  const usagePercent = (activeOrders / MAX_ORDERS) * 100;
  
  // 使用增量维护的计数器，避免遍历所有订单
  const buyCount = orderPool?.buyOrderCount ?? 0;
  const sellCount = orderPool?.sellOrderCount ?? 0;
  
  return {
    maxOrders: MAX_ORDERS,
    activeOrders,
    availableSlots,
    usagePercent,
    buyOrders: buyCount,
    sellOrders: sellCount,
  };
}

/**
 * 检查订单池健康状态（优化版：直接计算，不调用完整统计）
 * 使用常量中定义的阈值：
 * - ORDER_POOL_WARNING_THRESHOLD (70%)
 * - ORDER_POOL_CRITICAL_THRESHOLD (85%)
 * @returns 'healthy' | 'warning' | 'critical'
 */
export function getOrderPoolHealth(world: GameWorld): 'healthy' | 'warning' | 'critical' {
  const activeOrders = world.orders.activeCount;
  const usageRatio = activeOrders / MAX_ORDERS;
  
  // 使用constants.ts中定义的阈值
  if (usageRatio >= ORDER_POOL_CRITICAL_THRESHOLD) {
    return 'critical';
  } else if (usageRatio >= ORDER_POOL_WARNING_THRESHOLD) {
    return 'warning';
  }
  return 'healthy';
}

/**
 * 【任务6】订单池健康监控和自动清理系统
 *
 * 功能：
 * 1. 监控订单池使用率
 * 2. 当使用率超过警告阈值时输出日志
 * 3. 当使用率超过危险阈值时自动清理最旧的订单
 *
 * @param world 游戏世界
 * @returns 清理的订单数量
 */
export function performOrderPoolHealthCheck(world: GameWorld): {
  status: 'healthy' | 'warning' | 'critical';
  usagePercent: number;
  cleanedCount: number;
} {
  const o = world.orders;
  const activeOrders = o.activeCount;
  const usageRatio = activeOrders / MAX_ORDERS;
  const usagePercent = usageRatio * 100;
  
  let cleanedCount = 0;
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  if (usageRatio >= ORDER_POOL_CRITICAL_THRESHOLD) {
    status = 'critical';
    // 危险状态：强制清理最旧的10%订单
    cleanedCount = performEmergencyCleanup(world, 0.1);
    console.warn(`[订单池危机 T${world.tick}] 使用率${usagePercent.toFixed(1)}%! 紧急清理了${cleanedCount}个订单`);
  } else if (usageRatio >= ORDER_POOL_WARNING_THRESHOLD) {
    status = 'warning';
    // 警告状态：清理过期订单
    cleanedCount = cleanupExpiredOrders(world);}
  
  return { status, usagePercent, cleanedCount };
}

/**
 * 【任务6】紧急清理订单池
 * 当订单池使用率超过危险阈值时调用
 *
 * 清理策略：
 * 1. 优先清理最旧的订单
 * 2. 优先清理价格偏离市场价较大的订单
 * 3. 保留近期创建的订单
 *
 * @param world 游戏世界
 * @param cleanupRatio 要清理的订单比例（0.1 = 10%）
 * @returns 清理的订单数量
 */
function performEmergencyCleanup(world: GameWorld, cleanupRatio: number): number {
  const o = world.orders;
  const targetCleanupCount = Math.floor(o.activeCount * cleanupRatio);
  
  if (targetCleanupCount <= 0) return 0;
  
  // 收集所有活跃订单信息
  const orderInfos: Array<{
    idx: number;
    createdTick: number;
    priceDeviation: number;  // 价格偏离度
  }> = [];
  
  // 保护阈值：偏离度低于此值的订单被视为"合理报价"，紧急清理时跳过
  // 这能避免误杀零售店补货 / 生产链刚需的合理订单
  const PROTECTED_DEVIATION_THRESHOLD = 0.10;

  for (const idx of activeOrderIndices) {
    const goodsId = o.goodsIds[idx];
    const orderPrice = o.prices[idx];
    const marketPrice = world.goods.prices[goodsId];

    // 计算价格偏离度（与市场价的差异）
    let priceDeviation = 0;
    if (o.types[idx] === 0) {  // 买单
      // 买单价格远低于市场价 = 高偏离度
      priceDeviation = marketPrice > 0 ? Math.max(0, (marketPrice - orderPrice) / marketPrice) : 0;
    } else {  // 卖单
      // 卖单价格远高于市场价 = 高偏离度
      priceDeviation = marketPrice > 0 ? Math.max(0, (orderPrice - marketPrice) / marketPrice) : 0;
    }

    orderInfos.push({
      idx,
      createdTick: o.createdTicks[idx],
      priceDeviation,
    });
  }

  // 先把所有"接近市场价"的合理订单分离出来（保护层）
  // 紧急清理只在剩余订单中按偏离度 + 年龄打分
  const protectedOrders = orderInfos.filter(o => o.priceDeviation <= PROTECTED_DEVIATION_THRESHOLD);
  const candidateOrders = orderInfos.filter(o => o.priceDeviation > PROTECTED_DEVIATION_THRESHOLD);

  // 按优先级排序：先按价格偏离度（高偏离优先清理），再按创建时间（旧订单优先清理）
  candidateOrders.sort((a, b) => {
    const scoreA = a.priceDeviation * 0.6 + (world.tick - a.createdTick) / 1000 * 0.4;
    const scoreB = b.priceDeviation * 0.6 + (world.tick - b.createdTick) / 1000 * 0.4;
    return scoreB - scoreA;
  });

  let cleanedCount = 0;

  // 先清候选（高偏离度）订单
  for (let i = 0; i < Math.min(targetCleanupCount, candidateOrders.length); i++) {
    const orderIdx = candidateOrders[i].idx;
    if (cancelOrder(world, orderIdx)) {
      cleanedCount++;
    }
  }

  // 如果还没清够（候选不足），再从最老的"合理订单"里清，但只清最老的 50% 以保留新近合理订单
  if (cleanedCount < targetCleanupCount && protectedOrders.length > 0) {
    const remaining = targetCleanupCount - cleanedCount;
    protectedOrders.sort((a, b) => a.createdTick - b.createdTick); // 越老越前
    const safeToCleanup = Math.floor(protectedOrders.length * 0.5);
    const toClean = Math.min(remaining, safeToCleanup);
    for (let i = 0; i < toClean; i++) {
      const orderIdx = protectedOrders[i].idx;
      if (cancelOrder(world, orderIdx)) {
        cleanedCount++;
      }
    }
  }

  return cleanedCount;
}

/**
 * 【任务6】获取订单池健康报告
 * 用于UI显示或调试
 */
export function getOrderPoolHealthReport(world: GameWorld): {
  status: 'healthy' | 'warning' | 'critical';
  activeOrders: number;
  maxOrders: number;
  usagePercent: number;
  buyOrders: number;
  sellOrders: number;
  oldestOrderAge: number;  // 最旧订单的tick数
  avgOrderAge: number;     // 平均订单年龄
  recommendation: string;
} {
  const o = world.orders;
  const stats = getOrderPoolStats(world);
  const status = getOrderPoolHealth(world);
  
  // 计算订单年龄统计
  let oldestAge = 0;
  let totalAge = 0;
  let orderCount = 0;
  
  for (const idx of activeOrderIndices) {
    const age = world.tick - o.createdTicks[idx];
    oldestAge = Math.max(oldestAge, age);
    totalAge += age;
    orderCount++;
  }
  
  const avgOrderAge = orderCount > 0 ? totalAge / orderCount : 0;
  
  // 生成建议
  let recommendation = '';
  if (status === 'critical') {
    recommendation = '订单池即将溢出！建议立即减少新订单创建并清理陈旧订单。';
  } else if (status === 'warning') {
    recommendation = '订单池使用率较高，建议检查是否存在订单堆积问题。';
  } else if (avgOrderAge > 500) {
    recommendation = '订单平均存活时间较长，可能存在交易不活跃的问题。';
  } else {
    recommendation = '订单池状态正常。';
  }
  
  return {
    status,
    activeOrders: stats.activeOrders,
    maxOrders: stats.maxOrders,
    usagePercent: stats.usagePercent,
    buyOrders: stats.buyOrders,
    sellOrders: stats.sellOrders,
    oldestOrderAge: oldestAge,
    avgOrderAge,
    recommendation,
  };
}

/**
 * 检查公司是否已有某商品的活跃订单（用于防止重复挂单）
 * 使用索引进行O(1)查询，避免遍历订单池
 *
 * @param companyId 公司ID
 * @param goodsId 商品ID
 * @param orderType 订单类型（0=买单，1=卖单）
 * @returns 是否存在活跃订单
 */
export function hasExistingOrderForCompanyGoods(
  companyId: number,
  goodsId: number,
  orderType: number
): boolean {
  const cgIndex = getCompanyGoodsIndex();
  const orderSet = cgIndex.getOrders(companyId, goodsId, orderType);
  return orderSet !== undefined && orderSet.size > 0;
}
