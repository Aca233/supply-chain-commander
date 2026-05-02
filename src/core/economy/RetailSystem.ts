/**
 * RetailSystem - 零售系统核心
 * 
 * 核心功能：
 * 1. Pop只能在零售建筑消费
 * 2. 零售商从批发市场进货
 * 3. 动态零售价格调整
 * 4. 品牌/声誉系统影响消费者选择
 * 
 * 经济学原理：
 * - 零售商作为中介，连接生产者和消费者
 * - 加价率根据供需和竞争动态调整
 * - 消费者根据价格和声誉选择零售店
 */

import { GameWorld } from '../world/GameWorld';
import { CONSUMER_TIERS, ConsumerTier } from './DemandCurve';
import { ALL_GOODS, CONSUMER_GOODS, GoodsDefinition } from '@/data/goods';
import { CONSUMER_MARKET_CONFIG } from './ConsumerMarket';
import {
  BUILDINGS_BY_ID,
  isRetailBuilding,
  getRetailConfig,
  getRetailTypeIndex,
  RetailConfig,
} from '@/data/buildings';
import { getBuildingRecipeFromInstance } from '../production/ProductionEngine';
import { createBuyOrder, finalizeFilledOrder, getOrderBookView, getActiveOrderIndices } from '../market/OrderBook';
import { getOrderBookIndex } from '../market/OrderBookIndex';
import { recordFinalConsumption } from './MarketStats';
import {
  GOODS_COUNT,
  MAX_RETAIL_STORES,
  MAX_ORDERS,
  RETAIL_RESTOCK_THRESHOLD,
  RETAIL_TARGET_STOCK_LEVEL,
  RETAIL_MAX_CUSTOMER_RATE,
  RETAIL_PRICE_ADJUST_INTERVAL,
  RETAIL_MAX_TURNOVER_DAYS,
  TICKS_PER_DAY,
  RETAIL_BUY_ORDER_EXPIRY,
} from '../constants';
import { recordTrade, TradeOrderRef } from '../market/TradeLedger';

// ==================== 性能优化缓存 ====================

/** 商品→零售店索引缓存 */
interface RetailGoodsCache {
  /** 每个商品对应的零售店列表 */
  storesByGoods: Map<number, number[]>;
  /** 上次更新tick */
  lastUpdate: number;
  /** 更新间隔 */
  updateInterval: number;
}

const retailGoodsCache: RetailGoodsCache = {
  storesByGoods: new Map(),
  lastUpdate: -1000,
  updateInterval: 50,  // 每50tick更新一次
};

function invalidateRetailGoodsCache(): void {
  retailGoodsCache.storesByGoods.clear();
  retailGoodsCache.lastUpdate = -1000;
}

function resetRetailRuntimeCaches(): void {
  invalidateRetailGoodsCache();
  attractivenessCache.cache.clear();
  attractivenessCache.lastUpdate = -1000;
  companyBuyOrderCaches.clear();
  lastRestockTicks = null;
  restockBatchIndex = 0;
  consumptionBatchIndex = 0;
}

function isRetailStoreOperational(world: GameWorld, retailId: number): boolean {
  const buildingId = world.retail.buildingIds[retailId];
  return world.buildings.isActive[buildingId] === 1;
}

function createAggregateConsumerTier(): ConsumerTier {
  const totalPopulation = CONSUMER_TIERS.reduce((sum, tier) => sum + tier.population, 0);
  const weightedBaseIncome = CONSUMER_TIERS.reduce((sum, tier) => sum + tier.baseIncome * tier.population, 0) / totalPopulation;
  const weightedPricePreference = CONSUMER_TIERS.reduce((sum, tier) => sum + tier.pricePreference * tier.population, 0) / totalPopulation;
  const weightedQualityPreference = CONSUMER_TIERS.reduce((sum, tier) => sum + tier.qualityPreference * tier.population, 0) / totalPopulation;

  return {
    id: -1,
    name: '综合消费者',
    population: totalPopulation,
    baseIncome: weightedBaseIncome,
    incomeVariance: 0,
    savingsRate: 0,
    pricePreference: weightedPricePreference,
    qualityPreference: weightedQualityPreference,
    budgetShares: new Map(),
  };
}

const AGGREGATE_CONSUMER_TIER = createAggregateConsumerTier();

/** 店铺吸引力缓存 */
interface StoreAttractivenessCache {
  /** [goodsId][retailId] = attractiveness */
  cache: Map<number, Map<number, number>>;
  lastUpdate: number;
  updateInterval: number;
}

const attractivenessCache: StoreAttractivenessCache = {
  cache: new Map(),
  lastUpdate: -1000,
  updateInterval: TICKS_PER_DAY,
};

/** 消费批次控制 */
let consumptionBatchIndex = 0;
const CONSUMPTION_BATCH_SIZE = 10;  // 非 day-model 兼容：多 tick/天时按批次轮转

// ==================== 性能优化：可复用对象池 ====================

/** 可复用的RetailTickResult对象，避免每tick创建新对象 */
let reusableTickResult: RetailTickResult = {
  totalSales: 0,
  totalRevenue: 0,
  playerRevenue: 0,
  totalCustomers: 0,
  restockOrders: 0,
  priceAdjustments: 0,
  stockouts: 0,
};

/** 可复用的PopConsumptionResult对象 */
let reusableConsumptionResult: PopConsumptionResult = {
  totalQuantity: 0,
  totalSpent: 0,
  playerRevenue: 0,
  customerCount: 0,
  satisfiedDemand: 0,
  purchasesByGoods: new Map(),
  purchasesByRetail: new Map(),
};

/** 创建新的RetailTickResult对象 */
function createTickResult(): RetailTickResult {
  return {
    totalSales: 0,
    totalRevenue: 0,
    playerRevenue: 0,
    totalCustomers: 0,
    restockOrders: 0,
    priceAdjustments: 0,
    stockouts: 0,
  };
}

/** 创建新的PopConsumptionResult对象 */
function createConsumptionResult(): PopConsumptionResult {
  return {
    totalQuantity: 0,
    totalSpent: 0,
    playerRevenue: 0,
    customerCount: 0,
    satisfiedDemand: 0,
    purchasesByGoods: new Map(),
    purchasesByRetail: new Map(),
  };
}

// ==================== 类型定义 ====================

/** 零售系统数据结构 */
export interface RetailSystemData {
  count: number;                        // 零售店数量
  
  // 零售店基础属性
  buildingIds: Uint16Array;            // 对应的建筑ID
  types: Uint8Array;                   // 零售店类型（0-9 对应10种零售建筑）
  owners: Uint16Array;                 // 所属公司ID
  
  // 库存管理 [RETAIL_COUNT × GOODS_COUNT]
  inventories: Float32Array;           // 各商品库存
  inventoryCapacities: Float32Array;   // 库存上限
  
  // 定价 [RETAIL_COUNT × GOODS_COUNT]
  markups: Float32Array;               // 各商品加价率
  retailPrices: Float32Array;          // 零售价格
  purchaseCosts: Float32Array;         // 进货成本（用于计算利润）
  
  // 销售统计
  dailySales: Float32Array;            // [RETAIL_COUNT × GOODS_COUNT] 今日销量
  dailyRevenue: Float64Array;          // [RETAIL_COUNT] 今日营收
  dailyCost: Float64Array;             // [RETAIL_COUNT] 今日成本
  totalCustomers: Uint32Array;         // [RETAIL_COUNT] 今日客流
  
  // 声誉系统 [RETAIL_COUNT]
  reputation: Float32Array;            // 店铺声誉 0-100
  brandValue: Float32Array;            // 品牌价值
  
  // 进货记录
  lastRestockTick: Uint32Array;        // 上次进货tick
}

/** 零售Tick结果 */
export interface RetailTickResult {
  totalSales: number;
  totalRevenue: number;
  playerRevenue: number;
  totalCustomers: number;
  restockOrders: number;
  priceAdjustments: number;
  stockouts: number;  // 缺货次数
}

/** Pop消费结果 */
export interface PopConsumptionResult {
  totalQuantity: number;
  totalSpent: number;
  playerRevenue: number;
  customerCount: number;
  satisfiedDemand: number;  // 满足的需求比例
  purchasesByGoods: Map<number, { quantity: number; spent: number }>;
  purchasesByRetail: Map<number, { quantity: number; spent: number; customers: number }>;
}

/** 零售店信息（用于消费者选择） */
interface RetailStoreInfo {
  retailId: number;
  stock: number;
  price: number;
  reputation: number;
  attractiveness: number;
}

// ==================== 工厂函数 ====================

/**
 * 创建零售系统数据结构
 */
export function createRetailSystem(): RetailSystemData {
  return {
    count: 0,
    buildingIds: new Uint16Array(MAX_RETAIL_STORES),
    types: new Uint8Array(MAX_RETAIL_STORES),
    owners: new Uint16Array(MAX_RETAIL_STORES),
    
    inventories: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    inventoryCapacities: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    
    markups: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    retailPrices: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    purchaseCosts: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    
    dailySales: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    dailyRevenue: new Float64Array(MAX_RETAIL_STORES),
    dailyCost: new Float64Array(MAX_RETAIL_STORES),
    totalCustomers: new Uint32Array(MAX_RETAIL_STORES),
    
    reputation: new Float32Array(MAX_RETAIL_STORES),
    brandValue: new Float32Array(MAX_RETAIL_STORES),
    
    lastRestockTick: new Uint32Array(MAX_RETAIL_STORES),
  };
}

// ==================== 初始化函数 ====================

/**
 * 初始化零售系统
 * 扫描现有零售建筑并注册
 */
export function initRetailSystem(world: GameWorld): void {
  if (!world.retail) {
    world.retail = createRetailSystem();
  }

  // 重置模块级缓存，避免新世界/新存档沿用旧运行态数据
  resetRetailRuntimeCaches();

  const b = world.buildings;
  
  // 扫描所有建筑，注册零售店
  for (let i = 0; i < b.count; i++) {
    const buildingType = b.types[i];
    if (isRetailBuilding(buildingType)) {
      registerRetailStore(world, i);
    }
  }
  
  // 初始化时重置所有每日统计，确保数据从0开始
  resetDailyStats(world);
  
  console.log(`[RetailSystem] 初始化完成，共 ${world.retail.count} 家零售店`);
}

interface RegisterRetailStoreOptions {
  initialInventoryRatio?: number;
}

/**
 * 注册新零售店
 * @param world 游戏世界
 * @param buildingId 建筑ID
 * @param optionsOrIsNewlyBuilt 显式初始库存配置；旧布尔参数仅保留兼容，不再隐式灌满库存
 */
export function registerRetailStore(
  world: GameWorld,
  buildingId: number,
  optionsOrIsNewlyBuilt: RegisterRetailStoreOptions | boolean = {},
): number {
  const retail = world.retail;
  const b = world.buildings;
  
  if (retail.count >= MAX_RETAIL_STORES) {
    console.warn('[RetailSystem] 零售店数量已达上限');
    return -1;
  }
  
  const buildingType = b.types[buildingId];
  const retailConfig = getRetailConfig(buildingType);
  
  if (!retailConfig) {
    console.warn(`[RetailSystem] 建筑类型 ${buildingType} 不是零售建筑`);
    return -1;
  }
  
  const retailId = retail.count++;
  const ownerId = b.owners[buildingId];
  const options: RegisterRetailStoreOptions =
    typeof optionsOrIsNewlyBuilt === 'object' ? optionsOrIsNewlyBuilt : {};
  const initialInventoryRatio = Math.max(0, Math.min(1, options.initialInventoryRatio ?? 0));
  
  const retailTypeIndex = getRetailTypeIndex(buildingType);
  if (retailTypeIndex < 0) {
    console.warn(`[RetailSystem] 建筑类型 ${buildingType} 没有有效的零售类型索引`);
    retail.count--;
    return -1;
  }

  retail.buildingIds[retailId] = buildingId;
  retail.types[retailId] = retailTypeIndex;
  retail.owners[retailId] = ownerId;
  retail.reputation[retailId] = 50;  // 初始声誉50
  retail.brandValue[retailId] = 0;
  
  // 初始化允许销售商品的库存容量和加价率
  const buildingLevel = b.levels[buildingId] || 1;
  const capacityMultiplier = BUILDINGS_BY_ID.get(buildingType)?.capacityMultipliers[buildingLevel - 1] || 1;
  
  for (const goodsId of retailConfig.allowedGoodsIds) {
    const idx = retailId * GOODS_COUNT + goodsId;
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    const basePrice = goods?.basePrice || 100;
    
    // 设置库存容量
    retail.inventoryCapacities[idx] = retailConfig.inventoryCapacity * capacityMultiplier;
    
    // 初始加价率取范围中值
    retail.markups[idx] = (retailConfig.markupRange[0] + retailConfig.markupRange[1]) / 2;
    
    // 计算初始零售价格
    retail.retailPrices[idx] = basePrice * (1 + retail.markups[idx]);
    
    // 设置初始进货成本（基准价）
    retail.purchaseCosts[idx] = basePrice;
    
    retail.inventories[idx] = retail.inventoryCapacities[idx] * initialInventoryRatio;
  }
  
  console.log(`[RetailSystem] 注册零售店 #${retailId} (建筑${buildingId}, 所有者${ownerId}, 初始库存=${initialInventoryRatio})`);
  
  return retailId;
}

// ==================== 核心更新函数 ====================

/**
 * 每tick更新零售系统
 */
export function updateRetailSystem(world: GameWorld): RetailTickResult {
  // 【性能优化】使用可复用对象，避免每tick创建新对象
  // 注意：如果对象被冻结（如HMR），则创建新对象
  let result: RetailTickResult;
  try {
    reusableTickResult.totalSales = 0;
    reusableTickResult.totalRevenue = 0;
    reusableTickResult.playerRevenue = 0;
    reusableTickResult.totalCustomers = 0;
    reusableTickResult.restockOrders = 0;
    reusableTickResult.priceAdjustments = 0;
    reusableTickResult.stockouts = 0;
    result = reusableTickResult;
  } catch {
    // 对象被冻结时创建新对象
    result = createTickResult();
    reusableTickResult = result;
  }
  
  if (!world.retail || world.retail.count === 0) {
    return result;
  }

  if (world.tick > TICKS_PER_DAY && world.tick % TICKS_PER_DAY === 0) {
    updateReputations(world);
    resetDailyStats(world);
  }
  
  // 1. 处理收货（将公司库存转移到零售店）
  const deliveredCount = processRetailDelivery(world);
  
  // 2. 处理进货（在市场上挂买单）- 分批处理优化
  result.restockOrders = processRestocking(world);
  
  // 3. 处理Pop消费（核心：Pop只能在零售店消费）
  const consumptionResult = processPopConsumption(world);
  result.totalSales = consumptionResult.totalQuantity;
  result.totalRevenue = consumptionResult.totalSpent;
  result.playerRevenue = consumptionResult.playerRevenue;
  result.totalCustomers = consumptionResult.customerCount;
  
  // 4. 动态价格调整（每24tick一次）
  if (world.tick % RETAIL_PRICE_ADJUST_INTERVAL === 0) {
    result.priceAdjustments = adjustRetailPrices(world);
  }
  
  // 调试日志（每100 tick输出一次）
  if (world.tick % 100 === 0) {
    let totalStock = 0;
    for (let i = 0; i < world.retail.count * GOODS_COUNT; i++) {
      totalStock += world.retail.inventories[i];
    }
    console.log(`[零售系统 T${world.tick}] 店铺数:${world.retail.count}, 总库存:${totalStock.toFixed(0)}, 收货:${deliveredCount}, 进货单:${result.restockOrders}, 销售:${result.totalSales.toFixed(0)}, 客流:${result.totalCustomers}`);
  }
  
  return result;
}

// ==================== 进货系统 ====================

/**
 * 直接从卖单采购（优化版）
 * 使用OrderBookIndex获取已排序的卖单，避免O(n)遍历
 *
 * 性能优化：
 * 1. 使用 getAllSellOrders(goodsId) 获取已排序的订单索引
 * 2. 避免重复排序（订单簿已按价格排序）
 * 3. 提前退出当价格超出预算
 */
function purchaseFromSellOrders(
  world: GameWorld,
  ownerId: number,
  goodsId: number,
  maxQuantity: number,
  maxPrice: number
): { purchased: number; spent: number } {
  const o = world.orders;
  const c = world.companies;
  const orderIndex = getOrderBookIndex();
  
  let totalPurchased = 0;
  let totalSpent = 0;
  let remainingQty = maxQuantity;
  
  // 【优化】使用订单簿索引获取已排序的卖单（价格升序）
  const sellOrderIndices = orderIndex.getAllSellOrders(goodsId);
  
  // 遍历已排序的卖单
  for (let i = 0; i < sellOrderIndices.length && remainingQty > 0; i++) {
    const orderIdx = sellOrderIndices[i];
    
    // 验证订单仍然有效
    if (!o.isActive[orderIdx]) continue;
    
    const sellPrice = o.prices[orderIdx];
    
    // 【优化】价格超出预算则停止（后续都更贵）
    if (sellPrice > maxPrice) break;
    
    // 不能从自己买
    if (o.companyIds[orderIdx] === ownerId) continue;
    
    const sellOrder = {
      idx: orderIdx,
      price: sellPrice,
      remaining: o.remainings[orderIdx],
    };
    
    // 计算购买数量
    let buyQty = Math.min(remainingQty, sellOrder.remaining);
    const cost = buyQty * sellOrder.price;
    
    // 检查买方资金
    if (c.cash[ownerId] < cost) {
      // 资金不足，计算能买多少
      const affordableQty = Math.floor(c.cash[ownerId] / sellOrder.price);
      if (affordableQty <= 0) continue;
      buyQty = affordableQty;
    }
    
    const actualCost = buyQty * sellOrder.price;
    const sellerId = o.companyIds[sellOrder.idx];
    const inventoryIdx = sellerId * GOODS_COUNT + goodsId;
    
    // 执行交易
    // 1. 买方付款
    c.cash[ownerId] -= actualCost;
    // 2. 卖方收款
    c.cash[sellerId] += actualCost;
    // 3. 卖方库存转移到买方
    c.inventories[ownerId * GOODS_COUNT + goodsId] += buyQty;
    c.inventories[inventoryIdx] -= buyQty;
    c.inventoryReserved[inventoryIdx] -= buyQty;
    
    // 4. 更新卖单剩余量
    o.remainings[sellOrder.idx] -= buyQty;
    if (o.remainings[sellOrder.idx] <= 0) {
      finalizeFilledOrder(world, sellOrder.idx);
    }
    
    // 5. 创建交易记录
    recordTrade(world, {
      buyOrderId: TradeOrderRef.RETAIL_DIRECT,
      sellOrderId: sellOrder.idx,
      buyCompanyId: ownerId,
      sellCompanyId: sellerId,
      goodsId,
      quantity: buyQty,
      price: sellOrder.price,
      tick: world.tick,
    });
    
    totalPurchased += buyQty;
    totalSpent += actualCost;
    remainingQty -= buyQty;
    
  }
  
  return { purchased: totalPurchased, spent: totalSpent };
}

/**
 * 公司买单缓存 - 避免重复遍历订单
 */
interface CompanyBuyOrderCache {
  quantities: Map<number, number>;  // goodsId → totalQuantity
  lastUpdate: number;
}

const companyBuyOrderCaches: Map<number, CompanyBuyOrderCache> = new Map();
const BUY_ORDER_CACHE_TTL = 6;  // 缓存有效期6tick

/**
 * 统计公司对某商品的现有买单总量（优化版）
 * 使用缓存避免重复遍历
 * 【性能优化】使用 activeOrderIndices 替代全量遍历
 */
function countExistingBuyOrders(world: GameWorld, companyId: number, goodsId: number): number {
  // 检查缓存
  let cache = companyBuyOrderCaches.get(companyId);
  if (cache && world.tick - cache.lastUpdate < BUY_ORDER_CACHE_TTL) {
    return cache.quantities.get(goodsId) || 0;
  }
  
  // 缓存过期或不存在，重新计算整个公司的买单
  const o = world.orders;
  const quantities = new Map<number, number>();
  
  // 【性能优化】只遍历活跃订单，而不是所有 MAX_ORDERS
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (!o.isActive[i]) continue;
    if (o.companyIds[i] !== companyId) continue;
    if (o.types[i] !== 0) continue;  // 0 = buy
    
    const gId = o.goodsIds[i];
    quantities.set(gId, (quantities.get(gId) || 0) + o.remainings[i]);
  }
  
  // 更新缓存
  companyBuyOrderCaches.set(companyId, {
    quantities,
    lastUpdate: world.tick,
  });
  
  return quantities.get(goodsId) || 0;
}

/**
 * 清理过期的买单缓存（每100tick调用）
 */
function cleanupBuyOrderCache(currentTick: number): void {
  for (const [companyId, cache] of companyBuyOrderCaches) {
    if (currentTick - cache.lastUpdate > BUY_ORDER_CACHE_TTL * 10) {
      companyBuyOrderCaches.delete(companyId);
    }
  }
}

/** 进货间隔控制 - 使用更高效的Uint32Array */
// 【P1修复】将进货间隔从24tick降低到6tick（每6小时检查一次）
const RESTOCK_INTERVAL = 3;  // 缩短到 3 tick，原 6 太慢导致零售断货后等几小时才补
const RESTOCK_BATCH_SIZE = 20;  // 提高到 20，分批快速覆盖所有零售店
let restockBatchIndex = 0;

// 【P1修复】紧急进货阈值 - 库存低于10%时触发紧急进货
const EMERGENCY_RESTOCK_THRESHOLD = 0.1;  // 10%库存触发紧急进货
const EMERGENCY_RESTOCK_INTERVAL = 2;  // 紧急进货间隔保持 2 tick

// 使用TypedArray替代Map，更高效
let lastRestockTicks: Uint32Array | null = null;

const RETAIL_TARGET_COVER_DAYS = 5;
const RETAIL_DISPLAY_STOCK_MIN = 20;
const RETAIL_DISPLAY_STOCK_MAX = 50;

function getLastRestockTick(retailId: number, goodsId: number): number {
  if (!lastRestockTicks) return 0;
  const idx = retailId * GOODS_COUNT + goodsId;
  return lastRestockTicks[idx] || 0;
}

function setLastRestockTick(retailId: number, goodsId: number, tick: number): void {
  if (!lastRestockTicks) {
    lastRestockTicks = new Uint32Array(MAX_RETAIL_STORES * GOODS_COUNT);
  }
  const idx = retailId * GOODS_COUNT + goodsId;
  lastRestockTicks[idx] = tick;
}

function getRetailTargetStock(world: GameWorld, retailId: number, goodsId: number, capacity: number): number {
  if (capacity <= 0) return 0;

  const idx = retailId * GOODS_COUNT + goodsId;
  const recentDailySales = world.retail.dailySales[idx] || 0;
  const displayFloor = Math.min(
    capacity,
    Math.max(RETAIL_DISPLAY_STOCK_MIN, Math.min(RETAIL_DISPLAY_STOCK_MAX, capacity * 0.1)),
  );
  const salesDrivenTarget = recentDailySales * RETAIL_TARGET_COVER_DAYS;

  return Math.min(capacity * RETAIL_TARGET_STOCK_LEVEL, Math.max(displayFloor, salesDrivenTarget));
}

/**
 * 统计某公司自有零售店当前需要从公司库存补入的商品量
 * 用于阻止内部调拨货物被自动卖出。
 */
export function getCompanyRetailGoodsNeeds(world: GameWorld, ownerId: number): Map<number, number> {
  const retail = world.retail;
  const needsByGoods = new Map<number, number>();

  if (!retail || retail.count === 0) {
    return needsByGoods;
  }

  for (let retailId = 0; retailId < retail.count; retailId++) {
    if (retail.owners[retailId] !== ownerId) continue;
    if (!isRetailStoreOperational(world, retailId)) continue;

    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId] as number;
    const retailConfig = getRetailConfig(buildingType);
    if (!retailConfig) continue;

    for (const goodsId of retailConfig.allowedGoodsIds) {
      const idx = retailId * GOODS_COUNT + goodsId;
      const capacity = retail.inventoryCapacities[idx];
      const currentStock = retail.inventories[idx];
      const targetStock = getRetailTargetStock(world, retailId, goodsId, capacity);
      const needed = Math.max(0, targetStock - currentStock);

      if (needed > 0) {
        needsByGoods.set(goodsId, (needsByGoods.get(goodsId) || 0) + needed);
      }
    }
  }

  return needsByGoods;
}

/**
 * 处理零售店进货（优化版）
 *
 * 性能优化：
 * 1. 分批处理：每tick只处理部分零售店
 * 2. 使用订单簿索引：O(k)而非O(n)查找
 * 3. 缓存买单统计：避免重复遍历
 * 4. 增加进货间隔：24tick检查一次
 */
function processRestocking(world: GameWorld): number {
  const retail = world.retail;
  const c = world.companies;
  let ordersPlaced = 0;
  let directPurchases = 0;
  
  // 计算本tick要处理的零售店范围
  const totalRetails = retail.count;
  if (totalRetails === 0) return 0;
  
  const startIdx = restockBatchIndex * RESTOCK_BATCH_SIZE;
  const endIdx = Math.min(startIdx + RESTOCK_BATCH_SIZE, totalRetails);
  
  // 更新批次索引
  restockBatchIndex = (restockBatchIndex + 1) % Math.ceil(totalRetails / RESTOCK_BATCH_SIZE);
  
  // 只处理本批次的零售店
  for (let retailId = startIdx; retailId < endIdx; retailId++) {
    if (!isRetailStoreOperational(world, retailId)) continue;

    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId] as number;
    const retailConfig = getRetailConfig(buildingType);
    
    if (!retailConfig) continue;
    
    const ownerId = retail.owners[retailId];
    
    for (const goodsId of retailConfig.allowedGoodsIds) {
      const idx = retailId * GOODS_COUNT + goodsId;
      const currentStock = retail.inventories[idx];
      const capacity = retail.inventoryCapacities[idx];
      
      // 检查是否需要进货（库存低于阈值时触发）
      const stockRatio = capacity > 0 ? currentStock / capacity : 0;
      // 修复 P1：双轨进货冲突 — 批发系统在 stockRatio<0.5 时已主动直供，市场买单仅作 backup
      // Why: 之前批发 + 挂市场买单并行，同一商品被同时进货两次，导致库存爆仓 + 撤多余买单日志
      // How: 挂市场买单仅在 stockRatio<0.15 (即批发未能补足) 才触发，避免双轨冲突
      const restockThreshold = RETAIL_RESTOCK_THRESHOLD * 0.5;  // 0.30 → 0.15
      
      // 【P1修复】紧急进货检查 - 库存极低时使用更短的进货间隔
      const isEmergency = stockRatio < EMERGENCY_RESTOCK_THRESHOLD;
      const effectiveInterval = isEmergency ? EMERGENCY_RESTOCK_INTERVAL : RESTOCK_INTERVAL;
      
      if (stockRatio < restockThreshold) {
        // ============ 进货间隔检查（使用TypedArray）============
        const lastRestock = getLastRestockTick(retailId, goodsId);
        if (world.tick - lastRestock < effectiveInterval) {
          continue;  // 还没到进货间隔时间
        }
        
        // 【P1修复】紧急进货时打印调试日志
        if (isEmergency && world.tick % 100 === 0) {
          const goods = ALL_GOODS.find(g => g.id === goodsId);
          console.log(`[紧急进货 T${world.tick}] 零售店#${retailId} ${goods?.name || goodsId} 库存:${(stockRatio * 100).toFixed(1)}%`);
        }
        
        const targetStock = getRetailTargetStock(world, retailId, goodsId, capacity);
        
        // ============ 关键修复：检查现有买单和公司库存 ============
        const existingBuyOrders = countExistingBuyOrders(world, ownerId, goodsId);
        const companyInventory = c.inventories[ownerId * GOODS_COUNT + goodsId] || 0;
        
        // 实际还需要的数量 = 目标 - 当前零售库存 - 现有买单 - 公司库存
        const actualNeeded = targetStock - currentStock - existingBuyOrders - companyInventory;
        
        // 如果已有足够的进货中订单，跳过
        if (actualNeeded <= 10) {
          continue;
        }
        
        const neededQuantity = Math.max(50, Math.floor(actualNeeded));
        
        // 获取商品信息
        const goods = ALL_GOODS.find(g => g.id === goodsId);
        if (!goods) continue;
        const basePrice = goods.basePrice;
        
        // 计算愿意支付的最高价格
        // Why: 原 1.5× 报价过激，紧急时叠加 1.15× 共 1.725× 直接撞 PriceEngine 天花板，把
        //      市价拉爆并污染零售成本锚点。改为温和 1.10×（紧急 1.15×），仍能撮合主流卖单。
        const currentMarketPrice = world.goods.prices[goodsId] || basePrice;
        const desiredPrice = Math.max(basePrice * 1.10, currentMarketPrice * 1.10);
        const absoluteCap = basePrice * 2.5;  // 极限上限从 5× 降到 2.5×
        const maxBuyPrice = Math.min(desiredPrice, absoluteCap);
        
        // 检查公司资金
        const ownerCash = c.cash[ownerId];
        const affordableQty = Math.floor(ownerCash * 0.5 / maxBuyPrice);  // 最多用50%的现金
        if (affordableQty < 5) continue;  // 最小进货量
        
        const orderQuantity = Math.min(neededQuantity, affordableQty);
        
        // ============ 优先直接从卖单采购（使用优化版）============
        const purchaseResult = purchaseFromSellOrders(world, ownerId, goodsId, orderQuantity, maxBuyPrice);
        
        if (purchaseResult.purchased > 0) {
          directPurchases++;
          
          // 更新进货成本
          retail.purchaseCosts[idx] = purchaseResult.spent / purchaseResult.purchased;
          
          // 【P1修复】紧急进货成功时，记录购买数量以便调试
          if (isEmergency) {
            console.log(`[紧急采购成功] 零售店#${retailId} 商品${goodsId} 采购量:${purchaseResult.purchased.toFixed(0)}`);
          }
        }
        
        // ============ 如果还需要更多，挂买单 ============
        const stillNeeded = orderQuantity - purchaseResult.purchased;
        // 【P1修复】紧急进货时降低最小订单量阈值
        const minOrderQty = isEmergency ? 10 : 20;
        if (stillNeeded >= minOrderQty) {
          // 再次检查，确保不会过量下单
          const updatedExistingOrders = countExistingBuyOrders(world, ownerId, goodsId);
          const updatedCompanyInv = c.inventories[ownerId * GOODS_COUNT + goodsId] || 0;
          const finalNeeded = targetStock - currentStock - updatedExistingOrders - updatedCompanyInv;
          
          if (finalNeeded <= minOrderQty) {
            continue;  // 已经有足够的订单在进行中
          }
          
          const actualOrderQty = Math.min(stillNeeded, Math.floor(finalNeeded));
          if (actualOrderQty < minOrderQty) continue;
          
          // 紧急进货时温和加价（原 1.15×，叠加噪声后 1.265×；现 1.08×，叠加后 1.19×）
          const priceMultiplier = isEmergency ? 1.08 : 1.0;

          const currentCash = c.cash[ownerId];
          const buyPrice = Math.max(basePrice, currentMarketPrice) * priceMultiplier * (1.0 + Math.random() * 0.05);
          
          if (currentCash >= actualOrderQty * buyPrice) {
            // 零售补货买单使用更长 expiry，避免被每 tick 清理（原默认 1 tick 死循环）
            const orderId = createBuyOrder(world, ownerId, goodsId, actualOrderQty, buyPrice, RETAIL_BUY_ORDER_EXPIRY);
            
            if (orderId !== null) {
              ordersPlaced++;
              // 记录本次进货时间
              setLastRestockTick(retailId, goodsId, world.tick);
            }
          }
        }
        
        // 即使没有挂单，只要做了进货检查就更新时间（防止频繁检查）
        setLastRestockTick(retailId, goodsId, world.tick);
      }
    }
  }
  
  // 每100tick清理缓存
  if (world.tick % 100 === 0) {
    cleanupBuyOrderCache(world.tick);
  }
  
  return ordersPlaced + directPurchases;
}

// ==================== AI批发直销系统 ====================

/**
 * 批发直销配置
 */
interface WholesaleConfig {
  /** 批发价格折扣率（相对于市场价） */
  wholesaleDiscount: number;
  /** 最小批发量 */
  minWholesaleQuantity: number;
  /** 每tick最大批发交易数 */
  maxWholesaleDealsPerTick: number;
  /** 零售店库存低于此比例时接受批发 */
  retailRestockThreshold: number;
  /** AI生产商库存高于此比例时愿意批发 */
  producerSurplusThreshold: number;
}

const DEFAULT_WHOLESALE_CONFIG: WholesaleConfig = {
  wholesaleDiscount: 0.92,  // 批发价为市场价的92%
  minWholesaleQuantity: 20,
  maxWholesaleDealsPerTick: 30,
  retailRestockThreshold: 0.5,  // 零售店库存低于50%时接受批发
  producerSurplusThreshold: 0.3,  // 生产商库存高于30%容量时愿意批发
};

/** 批发交易记录 */
interface WholesaleDeal {
  producerId: number;
  retailId: number;
  goodsId: number;
  quantity: number;
  price: number;
  timestamp: number;
}

/** 批发交易结果 */
export interface WholesaleResult {
  dealsCompleted: number;
  totalQuantity: number;
  totalRevenue: number;
}

/** 批发交易批次控制 */
let wholesaleBatchIndex = 0;
const WHOLESALE_BATCH_SIZE = 15;  // 每tick处理15家零售店
const WHOLESALE_EXECUTION_INTERVAL = 3;  // 每3tick执行一次

/**
 * 处理AI批发直销
 * AI生产商主动向零售店供货，绕过订单簿
 *
 * 优势：
 * 1. 减少订单簿压力
 * 2. 加快商品流通
 * 3. 为生产商提供稳定销售渠道
 * 4. 为零售商提供稳定货源
 */
export function processWholesaleSupply(
  world: GameWorld,
  config: WholesaleConfig = DEFAULT_WHOLESALE_CONFIG
): WholesaleResult {
  const result: WholesaleResult = {
    dealsCompleted: 0,
    totalQuantity: 0,
    totalRevenue: 0,
  };
  
  // 性能优化：间隔执行
  if (world.tick % WHOLESALE_EXECUTION_INTERVAL !== 0) {
    return result;
  }
  
  const retail = world.retail;
  const c = world.companies;
  
  if (!retail || retail.count === 0) {
    return result;
  }
  
  // 计算本tick处理的零售店范围
  const totalRetails = retail.count;
  const startIdx = wholesaleBatchIndex * WHOLESALE_BATCH_SIZE;
  const endIdx = Math.min(startIdx + WHOLESALE_BATCH_SIZE, totalRetails);
  
  // 更新批次索引
  wholesaleBatchIndex = (wholesaleBatchIndex + 1) % Math.ceil(totalRetails / WHOLESALE_BATCH_SIZE);
  
  let dealsThisTick = 0;
  
  // 遍历本批次的零售店
  for (let retailId = startIdx; retailId < endIdx && dealsThisTick < config.maxWholesaleDealsPerTick; retailId++) {
    if (!isRetailStoreOperational(world, retailId)) continue;

    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId] as number;
    const retailConfig = getRetailConfig(buildingType);
    
    if (!retailConfig) continue;
    
    const retailOwnerId = retail.owners[retailId];
    
    // 遍历该零售店销售的商品
    for (const goodsId of retailConfig.allowedGoodsIds) {
      if (dealsThisTick >= config.maxWholesaleDealsPerTick) break;
      
      const retailIdx = retailId * GOODS_COUNT + goodsId;
      const currentStock = retail.inventories[retailIdx];
      const capacity = retail.inventoryCapacities[retailIdx];
      const stockRatio = capacity > 0 ? currentStock / capacity : 1;
      const targetStock = getRetailTargetStock(world, retailId, goodsId, capacity);
      
      // 检查零售店是否需要进货
      if (stockRatio >= config.retailRestockThreshold || currentStock >= targetStock) {
        continue;  // 库存充足，不需要批发
      }
      
      // 计算需要的数量
      const neededQuantity = targetStock - currentStock;
      
      if (neededQuantity < config.minWholesaleQuantity) {
        continue;
      }
      
      // 寻找愿意批发的AI生产商
      const deal = findWholesaleProducer(
        world,
        goodsId,
        neededQuantity,
        retailOwnerId,
        config
      );
      
      if (deal) {
        // 执行批发交易
        const dealResult = executeWholesaleDeal(
          world,
          deal.producerId,
          retailId,
          goodsId,
          deal.quantity,
          deal.price
        );
        
        if (dealResult.success) {
          result.dealsCompleted++;
          result.totalQuantity += dealResult.quantity;
          result.totalRevenue += dealResult.revenue;
          dealsThisTick++;
        }
      }
    }
  }
  
  // 调试日志（每100tick输出一次）
  if (world.tick % 100 === 0 && result.dealsCompleted > 0) {
    console.log(`[批发直销 T${world.tick}] 完成${result.dealsCompleted}笔交易, 总量:${result.totalQuantity.toFixed(0)}, 总额:${result.totalRevenue.toFixed(0)}`);
  }
  
  return result;
}

/**
 * 寻找愿意批发的AI生产商
 * 优先选择库存充足、价格合理的生产商
 */
function findWholesaleProducer(
  world: GameWorld,
  goodsId: number,
  neededQuantity: number,
  excludeCompanyId: number,
  config: WholesaleConfig
): { producerId: number; quantity: number; price: number } | null {
  const c = world.companies;
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;
  
  const basePrice = goods.basePrice;
  const marketPrice = world.goods.prices[goodsId] || basePrice;
  const wholesalePrice = marketPrice * config.wholesaleDiscount;
  
  let bestProducer: { producerId: number; quantity: number; price: number } | null = null;
  let bestScore = -Infinity;
  
  // 遍历所有公司，寻找有库存的生产商（仅AI公司）
  for (let companyId = 1; companyId < c.count; companyId++) {  // 跳过玩家公司(0)
    if (companyId === excludeCompanyId) continue;
    // 只允许AI公司参与批发
    if (!c.isAI[companyId]) continue;
    
    const invIdx = companyId * GOODS_COUNT + goodsId;
    const inventory = c.inventories[invIdx];
    const reserved = c.inventoryReserved[invIdx] || 0;
    const available = inventory - reserved;

    // 检查是否有足够的可用库存
    if (available < config.minWholesaleQuantity) continue;

    // 修复：用"库存天数"替代假容量估算（estimatedCapacity = inventory * 3 让任何库存都
    //       按 0.33 surplusRatio 算，库存越多越被卡住，导致大库存生产商进不了批发）
    // Why: 之前 surplusRatio 计算反向逻辑——库存大 = capacity 大 = surplusRatio 仍是 0.33
    //      → 5 年模拟里 SNACKS / 家电 大库存生产商始终无法批发供货零售
    // How: inventoryDays = inventory / dailyOutput，>=7 天才进入批发供给池
    let dailyOutput = 0;
    const buildings = world.buildings;
    for (let bi = 0; bi < buildings.count; bi++) {
      if (buildings.owners[bi] !== companyId || !buildings.isActive[bi]) continue;
      const prod = getBuildingRecipeFromInstance(world, bi);
      const ticks = Math.max(1, prod.ticksRequired || 1);
      for (const out of prod.outputs) {
        if (out.goodsId === goodsId) {
          dailyOutput += (out.amount * (buildings.efficiencies[bi] || 1)) / ticks;
        }
      }
    }
    const inventoryDays = dailyOutput > 0 ? inventory / dailyOutput : 999;
    // 至少 7 天库存才批发；非生产者 (dailyOutput=0) 视为纯囤货可批发
    if (dailyOutput > 0 && inventoryDays < 7) continue;

    // 计算批发吸引力分数：库存天数越多越积压，越优先卖
    const score = available * Math.min(inventoryDays / 30, 3);
    
    if (score > bestScore) {
      bestScore = score;
      const dealQuantity = Math.min(available * 0.5, neededQuantity);  // 最多卖出50%可用库存
      
      if (dealQuantity >= config.minWholesaleQuantity) {
        bestProducer = {
          producerId: companyId,
          quantity: dealQuantity,
          price: wholesalePrice,
        };
      }
    }
  }
  
  return bestProducer;
}

/**
 * 执行批发交易
 * 直接将商品从生产商转移到零售店
 */
function executeWholesaleDeal(
  world: GameWorld,
  producerId: number,
  retailId: number,
  goodsId: number,
  quantity: number,
  price: number
): { success: boolean; quantity: number; revenue: number } {
  const retail = world.retail;
  const c = world.companies;
  
  const retailOwnerId = retail.owners[retailId];
  const producerInvIdx = producerId * GOODS_COUNT + goodsId;
  const retailInvIdx = retailId * GOODS_COUNT + goodsId;
  const buyerInvIdx = retailOwnerId * GOODS_COUNT + goodsId;
  
  // 验证生产商库存
  const producerInventory = c.inventories[producerInvIdx];
  const reserved = c.inventoryReserved[producerInvIdx] || 0;
  const available = producerInventory - reserved;
  
  if (available < quantity) {
    quantity = available;
  }
  
  if (quantity < 10) {
    return { success: false, quantity: 0, revenue: 0 };
  }
  
  // 验证零售店容量
  const retailCapacity = retail.inventoryCapacities[retailInvIdx];
  const retailStock = retail.inventories[retailInvIdx];
  const spaceAvailable = retailCapacity - retailStock;
  
  if (spaceAvailable < quantity) {
    quantity = spaceAvailable;
  }
  
  if (quantity < 10) {
    return { success: false, quantity: 0, revenue: 0 };
  }
  
  const totalCost = quantity * price;
  
  // 验证零售商资金
  if (c.cash[retailOwnerId] < totalCost) {
    // 资金不足，减少购买量
    const affordableQty = Math.floor(c.cash[retailOwnerId] * 0.8 / price);
    if (affordableQty < 10) {
      return { success: false, quantity: 0, revenue: 0 };
    }
    quantity = affordableQty;
  }
  
  const actualCost = quantity * price;
  
  // ====== 执行批发交易 ======
  
  // 1. 生产商减少库存
  c.inventories[producerInvIdx] -= quantity;
  
  // 2. 零售店增加库存
  retail.inventories[retailInvIdx] += quantity;
  
  // 3. 更新零售店进货成本
  retail.purchaseCosts[retailInvIdx] = price;
  
  // 4. 资金流转：零售商付款给生产商
  c.cash[retailOwnerId] -= actualCost;
  c.cash[producerId] += actualCost;
  
  recordTrade(world, {
    buyOrderId: TradeOrderRef.WHOLESALE_DIRECT,
    sellOrderId: TradeOrderRef.WHOLESALE_DIRECT,
    buyCompanyId: retailOwnerId,
    sellCompanyId: producerId,
    goodsId,
    quantity,
    price,
    tick: world.tick,
  });
  
  return {
    success: true,
    quantity,
    revenue: actualCost,
  };
}

/**
 * 获取批发市场概览
 * 用于UI显示和AI决策
 */
export function getWholesaleMarketOverview(world: GameWorld): {
  activeProducers: number;
  totalWholesaleCapacity: number;
  avgWholesaleDiscount: number;
  topWholesaleGoods: Array<{ goodsId: number; name: string; volume: number }>;
} {
  const c = world.companies;
  const config = DEFAULT_WHOLESALE_CONFIG;
  
  let activeProducers = 0;
  let totalCapacity = 0;
  const volumeByGoods = new Map<number, number>();
  
  // 统计每个公司的批发潜力（仅AI公司）
  for (let companyId = 1; companyId < c.count; companyId++) {
    // 只统计AI公司
    if (!c.isAI[companyId]) continue;
    
    let hasWholesaleCapacity = false;
    
    for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
      const invIdx = companyId * GOODS_COUNT + goodsId;
      const inventory = c.inventories[invIdx];
      const reserved = c.inventoryReserved[invIdx] || 0;
      const available = inventory - reserved;
      
      if (available >= config.minWholesaleQuantity) {
        hasWholesaleCapacity = true;
        totalCapacity += available;
        volumeByGoods.set(goodsId, (volumeByGoods.get(goodsId) || 0) + available);
      }
    }
    
    if (hasWholesaleCapacity) {
      activeProducers++;
    }
  }
  
  // 排序获取top批发商品
  const sortedGoods = Array.from(volumeByGoods.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([goodsId, volume]) => {
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      return {
        goodsId,
        name: goods?.name || '未知商品',
        volume,
      };
    });
  
  return {
    activeProducers,
    totalWholesaleCapacity: totalCapacity,
    avgWholesaleDiscount: config.wholesaleDiscount,
    topWholesaleGoods: sortedGoods,
  };
}

/**
 * 处理零售店收货
 * 检查已成交的买单，将商品入库
 */
export function processRetailDelivery(world: GameWorld): number {
  const retail = world.retail;
  const c = world.companies;
  let deliveredCount = 0;
  let inventoryChanged = false;
  
  // 遍历所有零售店
  for (let retailId = 0; retailId < retail.count; retailId++) {
    if (!isRetailStoreOperational(world, retailId)) continue;

    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId] as number;
    const retailConfig = getRetailConfig(buildingType);
    
    if (!retailConfig) continue;
    
    const ownerId = retail.owners[retailId];
    
    // 遍历允许销售的商品
    for (const goodsId of retailConfig.allowedGoodsIds) {
      const idx = retailId * GOODS_COUNT + goodsId;
      
      // 检查公司库存中有多少该商品
      const companyInvIdx = ownerId * GOODS_COUNT + goodsId;
      const companyInventory = c.inventories[companyInvIdx];
      const reservedInventory = c.inventoryReserved[companyInvIdx] || 0;
      const availableCompanyInventory = Math.max(0, companyInventory - reservedInventory);
      
      // 如果公司有库存，转移到零售店
      if (availableCompanyInventory > 0) {
        const capacity = retail.inventoryCapacities[idx];
        const currentStock = retail.inventories[idx];
        const spaceAvailable = capacity - currentStock;
        
        if (spaceAvailable > 0) {
          const transferAmount = Math.min(availableCompanyInventory, spaceAvailable);
          
          // 从公司库存转移到零售店库存
          c.inventories[companyInvIdx] -= transferAmount;
          retail.inventories[idx] += transferAmount;
          inventoryChanged = true;
          
          // 更新进货成本
          const goods = ALL_GOODS.find(g => g.id === goodsId);
          const marketPrice = world.goods.prices[goodsId] || goods?.basePrice || 100;
          retail.purchaseCosts[idx] = marketPrice;
          
          deliveredCount++;
        }
      }
    }
  }

  if (inventoryChanged) {
    invalidateRetailGoodsCache();
  }
  
  return deliveredCount;
}

// ==================== Pop消费系统（核心）====================

/**
 * 更新商品→零售店索引缓存
 */
function updateRetailGoodsCache(world: GameWorld): void {
  if (world.tick - retailGoodsCache.lastUpdate < retailGoodsCache.updateInterval) {
    return;
  }
  
  retailGoodsCache.storesByGoods.clear();
  const retail = world.retail;
  
  for (let retailId = 0; retailId < retail.count; retailId++) {
    if (!isRetailStoreOperational(world, retailId)) continue;

    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId];
    const retailConfig = getRetailConfig(buildingType);
    
    if (!retailConfig) continue;
    
    for (const goodsId of retailConfig.allowedGoodsIds) {
      const idx = retailId * GOODS_COUNT + goodsId;
      if (retail.inventories[idx] > 0) {
        let stores = retailGoodsCache.storesByGoods.get(goodsId);
        if (!stores) {
          stores = [];
          retailGoodsCache.storesByGoods.set(goodsId, stores);
        }
        stores.push(retailId);
      }
    }
  }
  
  retailGoodsCache.lastUpdate = world.tick;
}

/**
 * 处理Pop消费（优化版）
 * 核心逻辑：Pop只能在零售店消费
 *
 * 性能优化：
 * 1. 使用商品→店铺索引缓存
 * 2. 批量处理商品，分散到多个tick
 * 3. 简化吸引力计算
 */
function processPopConsumption(world: GameWorld): PopConsumptionResult {
  // 【性能优化】使用可复用对象，避免每tick创建新对象
  let result: PopConsumptionResult;
  try {
    reusableConsumptionResult.totalQuantity = 0;
    reusableConsumptionResult.totalSpent = 0;
    reusableConsumptionResult.playerRevenue = 0;
    reusableConsumptionResult.customerCount = 0;
    reusableConsumptionResult.satisfiedDemand = 0;
    reusableConsumptionResult.purchasesByGoods.clear();
    reusableConsumptionResult.purchasesByRetail.clear();
    result = reusableConsumptionResult;
  } catch {
    // 对象被冻结时创建新对象
    result = createConsumptionResult();
    reusableConsumptionResult = result;
  }
  
  const retail = world.retail;
  if (retail.count === 0) return result;
  
  let totalDemand = 0;
  let satisfiedDemand = 0;
  
  // 获取消费商品列表
  const consumerGoodsIds = CONSUMER_GOODS.map(g => g.id);
  const totalGoods = consumerGoodsIds.length;
  
  // day-model 下 1 tick = 1 天，消费品必须每天全量处理；否则会把日消费摊成多天轮询。
  const goodsToProcess = TICKS_PER_DAY === 1
    ? consumerGoodsIds
    : (() => {
        const startIdx = consumptionBatchIndex * CONSUMPTION_BATCH_SIZE;
        const endIdx = Math.min(startIdx + CONSUMPTION_BATCH_SIZE, totalGoods);
        consumptionBatchIndex = (consumptionBatchIndex + 1) % Math.ceil(totalGoods / CONSUMPTION_BATCH_SIZE);
        return consumerGoodsIds.slice(startIdx, endIdx);
      })();
  
  // 预计算所有层级的总人口
  const totalPopulation = CONSUMER_TIERS.reduce((sum, t) => sum + t.population, 0);

  // P2 修复：店级客流 cap — 单店每 tick 跨所有商品累计客流 ≤ customerCapacity
  // Why: 之前按"库存比例"分配，库存最多的店瞬间被秒空，单店日客流可达数千远超物理容纳
  // How: 用 retailConfig.customerCapacity 作为店级硬上限；每 1 客流 = 2 件商品（既有约定）
  const tickCustomersByStore = new Map<number, number>();
  const storeCapacityCache = new Map<number, number>();
  function getStoreCustomerCap(retailId: number): number {
    let cap = storeCapacityCache.get(retailId);
    if (cap !== undefined) return cap;
    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId];
    const cfg = getRetailConfig(buildingType);
    cap = cfg?.customerCapacity ?? 50;
    storeCapacityCache.set(retailId, cap);
    return cap;
  }

  // 遍历本批次的商品
  for (const goodsId of goodsToProcess) {
    // 计算该商品的总需求
    let goodsDemand = world.goods.demands[goodsId];
    if (goodsDemand < 10) {
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      const priceRatio = 100 / Math.max(10, goods?.basePrice || 100);
      goodsDemand = totalPopulation * 0.0001 * priceRatio;
    }
    
    const tickDemand = goodsDemand * RETAIL_MAX_CUSTOMER_RATE;
    if (tickDemand <= 0.001) continue;
    
    totalDemand += tickDemand;

    const stores = findStoresWithGoods(world, goodsId, AGGREGATE_CONSUMER_TIER);
    if (stores.length === 0) continue;

    const allocations = allocateDemandToStores(
      world,
      goodsId,
      tickDemand,
      stores,
      AGGREGATE_CONSUMER_TIER,
    );

    for (const storeAllocation of allocations) {
      const retailId = storeAllocation.retailId;

      // P2: 店级客流 cap — 跨所有商品本 tick 累计 ≤ customerCapacity
      const storeCap = getStoreCustomerCap(retailId);
      const usedCustomers = tickCustomersByStore.get(retailId) ?? 0;
      const remainingCap = Math.max(0, storeCap - usedCustomers);
      const remainingItemsAtCap = remainingCap * 2;  // 1 客流 ≈ 2 件商品
      if (remainingItemsAtCap <= 0.01) continue;

      const purchase = executeRetailPurchase(
        world,
        retailId,
        goodsId,
        Math.min(storeAllocation.quantity, remainingItemsAtCap),
        AGGREGATE_CONSUMER_TIER,
      );

      if (purchase.quantity <= 0) continue;

      const ownerId = retail.owners[retailId];
      if (ownerId === 0) {
        result.playerRevenue += purchase.spent;
      }

      tickCustomersByStore.set(retailId, usedCustomers + purchase.customers);
      result.totalQuantity += purchase.quantity;
      result.totalSpent += purchase.spent;
      result.customerCount += purchase.customers;
      satisfiedDemand += purchase.quantity;
    }
  }
  
  result.satisfiedDemand = totalDemand > 0 ? satisfiedDemand / totalDemand : 0;
  
  // 调试日志（降低频率）
  if (world.tick % 500 === 0 && totalDemand > 0) {
    console.log(`[零售消费 T${world.tick}] 本批商品:${goodsToProcess.length}, 需求:${totalDemand.toFixed(0)}, 满足:${satisfiedDemand.toFixed(0)}`);
  }
  
  return result;
}

/**
 * 计算消费者层级的即时需求
 * 如果系统需求数据为0，使用基于人口的默认需求
 */
function calculateTierDemands(
  world: GameWorld,
  tier: ConsumerTier
): Map<number, number> {
  const demands = new Map<number, number>();
  
  // 计算总人口
  const totalPopulation = CONSUMER_TIERS.reduce((sum, t) => sum + t.population, 0);
  const tierShare = tier.population / totalPopulation;
  
  for (const goods of CONSUMER_GOODS) {
    // 使用现有的需求数据
    let baseDemand = world.goods.demands[goods.id];
    
    // 如果系统需求为0或很低，使用基于人口的默认需求
    // 每百万人口每tick消费一定量的商品
    if (baseDemand < 10) {
      // 根据商品价格反向估算需求（便宜的商品需求高）
      const priceRatio = 100 / Math.max(10, goods.basePrice);
      baseDemand = tier.population * 0.0001 * priceRatio;  // 每10万人每tick需求约1单位（便宜商品）
    }
    
    // 每tick消费一小部分需求
    const tickDemand = baseDemand * tierShare * RETAIL_MAX_CUSTOMER_RATE;
    
    // 降低阈值，让更多需求能够通过
    if (tickDemand > 0.001) {
      demands.set(goods.id, tickDemand);
    }
  }
  
  return demands;
}

/**
 * 找到销售指定商品的零售店
 * 返回按吸引力排序的店铺列表
 */
function findStoresWithGoods(
  world: GameWorld,
  goodsId: number,
  tier: ConsumerTier
): RetailStoreInfo[] {
  const retail = world.retail;
  const stores: RetailStoreInfo[] = [];
  
  for (let retailId = 0; retailId < retail.count; retailId++) {
    if (!isRetailStoreOperational(world, retailId)) continue;

    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId];
    const retailConfig = getRetailConfig(buildingType);
    
    // 检查是否销售该商品
    if (!retailConfig || !retailConfig.allowedGoodsIds.includes(goodsId)) continue;
    
    const idx = retailId * GOODS_COUNT + goodsId;
    const stock = retail.inventories[idx];
    
    if (stock <= 0) continue;  // 无库存
    
    const retailPrice = retail.retailPrices[idx];
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    const basePrice = goods?.basePrice || 100;
    const priceReference = getRetailPriceReference(world, retailId, goodsId, basePrice);
    const acceptablePriceRatio = Math.max(
      CONSUMER_MARKET_CONFIG.maxPremiumRatio,
      1 + Math.max(0, retailConfig.markupRange[1]),
    );
    const acceptablePrice = priceReference * acceptablePriceRatio;
    if (retailPrice > acceptablePrice) continue;

    const reputation = retail.reputation[retailId];
    
    // 计算吸引力分数
    // 价格因素（价格越低分数越高）
    const priceScore = Math.max(0, 2 - retailPrice / Math.max(1, priceReference)) * tier.pricePreference;
    // 声誉因素
    const reputationScore = (reputation / 100) * (1 - tier.pricePreference) * 0.5;
    // 库存因素（有货就行）
    const stockScore = Math.min(1, stock / 50) * 0.2;
    
    const attractiveness = priceScore + reputationScore + stockScore;
    
    stores.push({
      retailId,
      stock,
      price: retailPrice,
      reputation,
      attractiveness,
    });
  }
  
  // 按吸引力排序（降序）
  stores.sort((a, b) => b.attractiveness - a.attractiveness);
  
  return stores;
}

/**
 * 分配需求到零售店
 * 按吸引力加权分配，价格优先
 */
function allocateDemandToStores(
  world: GameWorld,
  goodsId: number,
  totalDemand: number,
  stores: RetailStoreInfo[],
  tier: ConsumerTier
): Array<{ retailId: number; quantity: number }> {
  const allocation: Array<{ retailId: number; quantity: number }> = [];
  let remainingDemand = totalDemand;
  
  // 计算总吸引力
  const totalAttractiveness = stores.reduce((sum, s) => sum + Math.max(0, s.attractiveness), 0);
  if (totalAttractiveness <= 0) {
    return allocation;
  }
  
  for (const store of stores) {
    if (remainingDemand <= 0) break;
    
    // 按吸引力占比分配
    const share = Math.max(0, store.attractiveness) / totalAttractiveness;
    let allocatedQty = totalDemand * share;
    
    // 不能超过库存和剩余需求
    allocatedQty = Math.min(allocatedQty, store.stock, remainingDemand);
    
    if (allocatedQty > 0.01) {
      allocation.push({
        retailId: store.retailId,
        quantity: allocatedQty,
      });
      remainingDemand -= allocatedQty;
    }
  }
  
  return allocation;
}

function getRetailPriceReference(
  world: GameWorld,
  retailId: number,
  goodsId: number,
  basePrice: number,
): number {
  const retail = world.retail;
  const idx = retailId * GOODS_COUNT + goodsId;
  const marketPrice = world.goods.prices[goodsId] || 0;

  if (retail.purchaseCosts[idx] > 0) {
    return retail.purchaseCosts[idx];
  }

  if (marketPrice > 0) {
    return marketPrice;
  }

  return basePrice;
}

/**
 * 执行零售购买
 * 这里是商品真正被消费的地方
 */
function executeRetailPurchase(
  world: GameWorld,
  retailId: number,
  goodsId: number,
  quantity: number,
  tier: ConsumerTier
): { quantity: number; spent: number; customers: number } {
  const retail = world.retail;
  const idx = retailId * GOODS_COUNT + goodsId;
  
  // 实际可购买量
  const actualQty = Math.min(quantity, retail.inventories[idx]);
  if (actualQty <= 0) {
    return { quantity: 0, spent: 0, customers: 0 };
  }
  
  const price = retail.retailPrices[idx];
  const totalSpent = actualQty * price;
  if (totalSpent > world.households.cash[0]) {
    return { quantity: 0, spent: 0, customers: 0 };
  }
  
  // 扣减库存
  retail.inventories[idx] -= actualQty;
  
  // 记录销售
  retail.dailySales[idx] += actualQty;
  retail.dailyRevenue[retailId] += totalSpent;
  
  // 计算成本（用于利润计算）
  const cost = actualQty * retail.purchaseCosts[idx];
  retail.dailyCost[retailId] += cost;
  
  // 资金流入零售商（从家庭资金池扣款，闭合货币循环）
  world.households.cash[0] -= totalSpent;
  world.households.totalConsumptionSpent += totalSpent;

  const ownerId = retail.owners[retailId];
  world.companies.cash[ownerId] += totalSpent;
  
  // 更新最终消费：零售库存被家庭实际消化，需同步减少市场供给压力
  recordFinalConsumption(world, goodsId, actualQty);
  
  // 估算客流（假设每位顾客购买少量）
  const avgPurchasePerCustomer = 2;
  const customers = Math.ceil(actualQty / avgPurchasePerCustomer);
  retail.totalCustomers[retailId] += customers;
  
  return {
    quantity: actualQty,
    spent: totalSpent,
    customers,
  };
}

// ==================== 价格调整系统 ====================

/**
 * 动态调整零售价格
 * 玩家可以手动设置，系统也会自动调整
 */
function adjustRetailPrices(world: GameWorld): number {
  const retail = world.retail;
  let adjustments = 0;

  // 价格调整不要求店铺激活：未运营的店仍需在 UI 上呈现合理标价
  for (let retailId = 0; retailId < retail.count; retailId++) {
    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId];
    const retailConfig = getRetailConfig(buildingType);
    
    if (!retailConfig) continue;
    
    for (const goodsId of retailConfig.allowedGoodsIds) {
      const idx = retailId * GOODS_COUNT + goodsId;
      const stock = retail.inventories[idx];
      const capacity = retail.inventoryCapacities[idx];
      const dailySales = retail.dailySales[idx];
      
      // 计算库存周转率
      const stockRatio = stock / Math.max(1, capacity);
      const salesRate = dailySales > 0 ? dailySales : 0.1;
      const turnoverDays = stock / salesRate;
      
      let newMarkup = retail.markups[idx];
      const configuredMarkup = (retailConfig.markupRange[0] + retailConfig.markupRange[1]) / 2;

      // 兼容历史零 markup 存档/运行态：先回填到当前业态的默认中值，再参与正常调价。
      if (newMarkup <= 0 && configuredMarkup > 0) {
        newMarkup = configuredMarkup;
      }

      if (stockRatio > 0.8 || turnoverDays > RETAIL_MAX_TURNOVER_DAYS) {
        // 库存积压，降价促销
        newMarkup *= 0.95;
        adjustments++;
      } else if (stockRatio < 0.2 && dailySales > 0) {
        // 热销商品，可以提价
        newMarkup *= 1.05;
        adjustments++;
      }

      // 自动调价不应跌破业态最低加价；同时保留 0 的防御性下限。
      const minimumMarkup = Math.max(0, retailConfig.markupRange[0]);
      newMarkup = Math.max(minimumMarkup, newMarkup);

      retail.markups[idx] = newMarkup;
      
      // 更新零售价格：优先以真实进货成本为锚，缺失时使用实时市场价，再退回基准价
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      const basePrice = goods?.basePrice || 100;
      const marketPrice = world.goods.prices[goodsId] || 0;
      const priceAnchor = retail.purchaseCosts[idx] > 0
        ? retail.purchaseCosts[idx]
        : marketPrice > 0
          ? marketPrice
          : basePrice;
      retail.retailPrices[idx] = priceAnchor * (1 + newMarkup);
    }
  }
  
  return adjustments;
}

/**
 * 玩家手动设置零售价格
 */
export function setRetailPrice(
  world: GameWorld,
  retailId: number,
  goodsId: number,
  price: number
): boolean {
  const retail = world.retail;
  
  if (retailId >= retail.count) return false;
  
  const buildingId = retail.buildingIds[retailId];
  const buildingType = world.buildings.types[buildingId];
  const retailConfig = getRetailConfig(buildingType);
  
  if (!retailConfig || !retailConfig.allowedGoodsIds.includes(goodsId)) {
    return false;
  }
  
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return false;
  
  const idx = retailId * GOODS_COUNT + goodsId;
  retail.retailPrices[idx] = price;
  retail.markups[idx] = price / goods.basePrice - 1;
  
  return true;
}

/**
 * 玩家手动设置加价率
 */
export function setRetailMarkup(
  world: GameWorld,
  retailId: number,
  goodsId: number,
  markup: number
): boolean {
  const retail = world.retail;
  
  if (retailId >= retail.count) return false;
  
  const buildingId = retail.buildingIds[retailId];
  const buildingType = world.buildings.types[buildingId];
  const retailConfig = getRetailConfig(buildingType);
  
  if (!retailConfig || !retailConfig.allowedGoodsIds.includes(goodsId)) {
    return false;
  }
  
  // 防御性下限：避免负 markup
  markup = Math.max(0, markup);

  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return false;
  
  const idx = retailId * GOODS_COUNT + goodsId;
  retail.markups[idx] = markup;
  retail.retailPrices[idx] = goods.basePrice * (1 + markup);
  
  return true;
}

// ==================== 声誉系统 ====================

/**
 * 更新店铺声誉
 */
function updateReputations(world: GameWorld): void {
  const retail = world.retail;
  
  for (let retailId = 0; retailId < retail.count; retailId++) {
    if (!isRetailStoreOperational(world, retailId)) continue;

    let reputationChange = 0;
    
    // 销售量影响（卖得多声誉涨）
    const dailyRevenue = retail.dailyRevenue[retailId];
    if (dailyRevenue > 10000) {
      reputationChange += 0.5;
    } else if (dailyRevenue < 1000) {
      reputationChange -= 0.2;
    }
    
    // 缺货影响（经常缺货降声誉）
    const buildingId = retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId];
    const retailConfig = getRetailConfig(buildingType);
    
    if (retailConfig) {
      let stockoutCount = 0;
      for (const goodsId of retailConfig.allowedGoodsIds) {
        const idx = retailId * GOODS_COUNT + goodsId;
        if (retail.inventories[idx] <= 0) {
          stockoutCount++;
        }
      }
      if (stockoutCount > retailConfig.allowedGoodsIds.length * 0.3) {
        reputationChange -= 1;
      }
    }
    
    // 更新声誉（0-100范围）
    retail.reputation[retailId] = Math.max(0, Math.min(100,
      retail.reputation[retailId] + reputationChange
    ));
    
    // 更新品牌价值（累计声誉）
    retail.brandValue[retailId] += retail.reputation[retailId] * 0.01;
  }
}

/**
 * 重置每日统计
 */
function resetDailyStats(world: GameWorld): void {
  const retail = world.retail;
  
  for (let retailId = 0; retailId < retail.count; retailId++) {
    retail.dailyRevenue[retailId] = 0;
    retail.dailyCost[retailId] = 0;
    retail.totalCustomers[retailId] = 0;
    
    for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
      const idx = retailId * GOODS_COUNT + goodsId;
      retail.dailySales[idx] = 0;
    }
  }
}

// ==================== 查询接口 ====================

/**
 * 获取零售店详情
 */
export function getRetailStoreDetails(world: GameWorld, retailId: number): {
  id: number;
  buildingId: number;
  type: number;
  typeName: string;
  ownerId: number;
  reputation: number;
  brandValue: number;
  dailyRevenue: number;
  dailyCost: number;
  dailyProfit: number;
  totalCustomers: number;
  inventory: Array<{ goodsId: number; name: string; quantity: number; capacity: number; price: number; markup: number; dailySales: number }>;
} | null {
  const retail = world.retail;
  
  if (retailId >= retail.count) return null;
  
  const buildingId = retail.buildingIds[retailId];
  const buildingType = world.buildings.types[buildingId];
  const buildingDef = BUILDINGS_BY_ID.get(buildingType);
  const retailConfig = getRetailConfig(buildingType);
  
  const inventory: Array<{ goodsId: number; name: string; quantity: number; capacity: number; price: number; markup: number; dailySales: number }> = [];
  
  if (retailConfig) {
    for (const goodsId of retailConfig.allowedGoodsIds) {
      const idx = retailId * GOODS_COUNT + goodsId;
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      inventory.push({
        goodsId,
        name: goods?.name || '未知商品',
        quantity: retail.inventories[idx],
        capacity: retail.inventoryCapacities[idx],
        price: retail.retailPrices[idx],
        markup: retail.markups[idx],
        dailySales: retail.dailySales[idx],
      });
    }
  }
  
  return {
    id: retailId,
    buildingId,
    type: retail.types[retailId],
    typeName: buildingDef?.name || '未知类型',
    ownerId: retail.owners[retailId],
    reputation: retail.reputation[retailId],
    brandValue: retail.brandValue[retailId],
    dailyRevenue: retail.dailyRevenue[retailId],
    dailyCost: retail.dailyCost[retailId],
    dailyProfit: retail.dailyRevenue[retailId] - retail.dailyCost[retailId],
    totalCustomers: retail.totalCustomers[retailId],
    inventory,
  };
}

/**
 * 获取玩家的所有零售店
 */
export function getPlayerRetailStores(world: GameWorld, playerId: number = 0): number[] {
  const retail = world.retail;
  const stores: number[] = [];
  
  for (let i = 0; i < retail.count; i++) {
    if (retail.owners[i] === playerId) {
      stores.push(i);
    }
  }
  
  return stores;
}

/**
 * 获取零售市场概览
 */
export function getRetailMarketOverview(world: GameWorld): {
  totalStores: number;
  totalRevenue: number;
  totalCustomers: number;
  avgReputation: number;
  topSellingGoods: Array<{ goodsId: number; name: string; quantity: number }>;
} {
  const retail = world.retail;
  
  let totalRevenue = 0;
  let totalCustomers = 0;
  let totalReputation = 0;
  const salesByGoods = new Map<number, number>();
  
  for (let retailId = 0; retailId < retail.count; retailId++) {
    totalRevenue += retail.dailyRevenue[retailId];
    totalCustomers += retail.totalCustomers[retailId];
    totalReputation += retail.reputation[retailId];
    
    for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
      const idx = retailId * GOODS_COUNT + goodsId;
      const sales = retail.dailySales[idx];
      if (sales > 0) {
        salesByGoods.set(goodsId, (salesByGoods.get(goodsId) || 0) + sales);
      }
    }
  }
  
  // 排序获取top销售商品
  const sortedSales = Array.from(salesByGoods.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([goodsId, quantity]) => {
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      return {
        goodsId,
        name: goods?.name || '未知商品',
        quantity,
      };
    });
  
  return {
    totalStores: retail.count,
    totalRevenue,
    totalCustomers,
    avgReputation: retail.count > 0 ? totalReputation / retail.count : 0,
    topSellingGoods: sortedSales,
  };
}
