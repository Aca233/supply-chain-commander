/**
 * AI快速决策模块
 * 
 * 为fast层级提供极简决策路径，跳过所有复杂分析
 * 目标：每公司处理时间 < 0.5ms
 * 
 * 设计原则：
 * 1. 只处理最基本的交易逻辑
 * 2. 使用简单规则而非复杂模型
 * 3. 复用缓存数据，避免重复计算
 * 4. 仅处理主营商品，跳过次要商品
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, MAX_COMPANIES, MAX_ORDERS } from '@/core/constants';
import { createBuyOrder, createSellOrder, cancelOrder } from '@/core/market/OrderBook';
import { 
  getCachedPrediction, 
  getCachedTradingTime,
  CachedPricePrediction 
} from './IndicatorCache';

// ==================== 配置 ====================

const FAST_CONFIG = {
  maxGoodsPerCompany: 8,        // 每公司最多处理8种商品
  minInventoryToSell: 50,       // 最小卖出库存阈值
  maxInventoryDays: 20,         // 最大库存天数
  minCashRatio: 0.1,            // 最低现金比例
  orderExpiryTicks: 24,         // 订单过期tick数
  buyQuantityBase: 100,         // 基础买入数量
  sellQuantityRatio: 0.3,       // 卖出比例（库存的30%）
  priceMarginBuy: 1.02,         // 买入价格上浮2%
  priceMarginSell: 0.98,        // 卖出价格下浮2%
  skipPredictionThreshold: 300, // 跳过预测的库存阈值
  minCashForBuy: 50000,         // 最小买入现金要求
};

// ==================== 主营商品缓存 ====================

// 每个公司的主营商品列表（按重要性排序）
const companyMainGoods: Map<number, number[]> = new Map();
const companyMainGoodsLastUpdate: Map<number, number> = new Map();
const MAIN_GOODS_UPDATE_INTERVAL = 60; // 每60tick更新一次

/**
 * 获取公司主营商品列表
 */
function getMainGoods(world: GameWorld, companyId: number): number[] {
  const lastUpdate = companyMainGoodsLastUpdate.get(companyId) || 0;
  
  // 定期更新
  if (world.tick - lastUpdate >= MAIN_GOODS_UPDATE_INTERVAL) {
    updateMainGoods(world, companyId);
  }
  
  return companyMainGoods.get(companyId) || [];
}

/**
 * 更新公司主营商品列表
 */
function updateMainGoods(world: GameWorld, companyId: number): void {
  const goodsScores: Array<{ goodsId: number; score: number }> = [];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const idx = companyId * GOODS_COUNT + goodsId;
    const inventory = world.companies.inventories[idx];
    const sales = world.trades.cumulativeSalesQuantity[idx];
    
    // 综合评分：库存 + 销售量
    const score = inventory * 0.5 + sales * 1.0;
    
    if (score > 0) {
      goodsScores.push({ goodsId, score });
    }
  }
  
  // 按分数排序，取前N个
  goodsScores.sort((a, b) => b.score - a.score);
  const mainGoods = goodsScores
    .slice(0, FAST_CONFIG.maxGoodsPerCompany)
    .map(g => g.goodsId);
  
  companyMainGoods.set(companyId, mainGoods);
  companyMainGoodsLastUpdate.set(companyId, world.tick);
}

// ==================== 快速决策核心 ====================

/**
 * 快速决策 - 主入口（超优化版）
 *
 * 优化策略：
 * 1. 跳过资金不足的公司
 * 2. 只处理最重要的2-3个商品
 * 3. 使用极简规则，避免复杂计算
 * 4. 减少订单管理频率
 *
 * @param world 游戏世界
 * @param companyId 公司ID
 * @returns 处理的决策数量
 */
export function fastDecision(world: GameWorld, companyId: number): number {
  // 玩家公司跳过自动交易
  if (companyId === 0) return 0;
  
  const cash = world.companies.cash[companyId];
  
  // 资金太少的公司直接跳过，节省计算
  if (cash < 10000) return 0;
  
  const totalAssets = world.companies.totalAssets[companyId];
  const cashRatio = totalAssets > 0 ? cash / totalAssets : 0;
  
  let decisionsCount = 0;
  
  // 1. 获取主营商品（限制数量）
  const mainGoods = getMainGoods(world, companyId);
  const topGoods = mainGoods.slice(0, FAST_CONFIG.maxGoodsPerCompany);
  
  // 2. 超快速库存检查和交易决策
  for (const goodsId of topGoods) {
    decisionsCount += ultraFastGoodsDecision(world, companyId, goodsId, cash, cashRatio);
  }
  
  // 3. 订单管理只在特定tick执行（每5tick一次）
  if (world.tick % 5 === companyId % 5) {
    decisionsCount += fastOrderManagement(world, companyId);
  }
  
  return decisionsCount;
}

/**
 * 超快速单商品决策
 *
 * 完全跳过价格预测，使用纯规则驱动
 * 目标：每次调用<0.1ms
 */
function ultraFastGoodsDecision(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  cash: number,
  cashRatio: number
): number {
  const idx = companyId * GOODS_COUNT + goodsId;
  const inventory = world.companies.inventories[idx];
  const reserved = world.companies.inventoryReserved[idx];
  const available = inventory - reserved;
  const price = world.goods.prices[goodsId];
  
  // 极简规则：库存超过阈值直接卖，无需任何分析
  if (available > FAST_CONFIG.skipPredictionThreshold) {
    const sellQty = Math.floor(available * FAST_CONFIG.sellQuantityRatio);
    const sellPrice = price * FAST_CONFIG.priceMarginSell;
    if (sellQty > 10) {
      createSellOrder(world, companyId, goodsId, sellQty, sellPrice);
      return 1;
    }
  }
  
  // 中等库存：使用简单规则
  if (available > FAST_CONFIG.minInventoryToSell) {
    // 简单判断：供大于求时卖
    const supply = world.goods.supplies[goodsId];
    const demand = world.goods.demands[goodsId];
    
    if (supply > demand * 0.8 || available > 200) {
      const sellQty = Math.floor(available * 0.3);
      const sellPrice = price * FAST_CONFIG.priceMarginSell;
      if (sellQty > 5) {
        createSellOrder(world, companyId, goodsId, sellQty, sellPrice);
        return 1;
      }
    }
  }
  
  // 买入决策：库存很低且现金充裕
  if (available < 30 && cash > FAST_CONFIG.minCashForBuy && cashRatio > 0.15) {
    const buyQty = FAST_CONFIG.buyQuantityBase;
    const buyPrice = price * FAST_CONFIG.priceMarginBuy;
    const totalCost = buyQty * buyPrice;
    
    // 单笔不超过5%现金
    if (totalCost < cash * 0.05) {
      createBuyOrder(world, companyId, goodsId, buyQty, buyPrice);
      return 1;
    }
  }
  
  return 0;
}

/**
 * 原有的快速决策（保留用于标准层级）
 */
function fastGoodsDecision(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  cash: number,
  cashRatio: number
): number {
  const idx = companyId * GOODS_COUNT + goodsId;
  const inventory = world.companies.inventories[idx];
  const price = world.goods.prices[goodsId];
  
  // 获取缓存的预测和交易时机
  const prediction = getCachedPrediction(world, goodsId);
  const tradingTime = getCachedTradingTime(world, goodsId);
  
  let decisions = 0;
  
  // 卖出决策：库存过多
  if (inventory > FAST_CONFIG.minInventoryToSell) {
    const shouldSell = shouldFastSell(inventory, price, prediction, tradingTime);
    
    if (shouldSell) {
      const sellQty = Math.floor(inventory * FAST_CONFIG.sellQuantityRatio);
      const sellPrice = calculateFastSellPrice(price, prediction);
      
      if (sellQty > 0) {
        createSellOrder(world, companyId, goodsId, sellQty, sellPrice);
        decisions++;
      }
    }
  }
  
  // 买入决策：库存不足且现金充裕
  if (inventory < 100 && cashRatio > 0.1) {
    const shouldBuy = shouldFastBuy(price, cash, prediction, tradingTime);
    
    if (shouldBuy) {
      const buyQty = FAST_CONFIG.buyQuantityBase;
      const buyPrice = calculateFastBuyPrice(price, prediction);
      const totalCost = buyQty * buyPrice;
      
      if (totalCost < cash * 0.1) { // 单笔不超过10%现金
        createBuyOrder(world, companyId, goodsId, buyQty, buyPrice);
        decisions++;
      }
    }
  }
  
  return decisions;
}

/**
 * 快速判断是否应该卖出
 */
function shouldFastSell(
  inventory: number,
  price: number,
  prediction: CachedPricePrediction | null,
  tradingTime: ReturnType<typeof getCachedTradingTime>
): boolean {
  // 库存过多必须卖
  if (inventory > 500) return true;
  
  // 有交易时机建议时使用
  if (tradingTime?.shouldSellNow) return true;
  
  // 有预测信号时使用
  if (prediction) {
    if (prediction.signal === 'strong_sell') return true;
    if (prediction.signal === 'sell' && inventory > 200) return true;
    // 价格预计下跌时卖出
    if (prediction.direction === 'bearish' && prediction.directionStrength > 0.3) return true;
  }
  
  return false;
}

/**
 * 快速判断是否应该买入
 */
function shouldFastBuy(
  price: number,
  cash: number,
  prediction: CachedPricePrediction | null,
  tradingTime: ReturnType<typeof getCachedTradingTime>
): boolean {
  // 现金不足时不买
  if (cash < price * 100) return false;
  
  // 有交易时机建议时使用
  if (tradingTime?.shouldBuyNow) return true;
  
  // 有预测信号时使用
  if (prediction) {
    if (prediction.signal === 'strong_buy') return true;
    if (prediction.signal === 'buy') return true;
    // 价格预计上涨时买入
    if (prediction.direction === 'bullish' && prediction.directionStrength > 0.3) return true;
  }
  
  return false;
}

/**
 * 计算快速卖出价格
 */
function calculateFastSellPrice(
  currentPrice: number,
  prediction: CachedPricePrediction | null
): number {
  let price = currentPrice * FAST_CONFIG.priceMarginSell;
  
  // 根据预测微调
  if (prediction) {
    if (prediction.signal === 'strong_sell') {
      // 急于卖出，价格更低
      price *= 0.95;
    } else if (prediction.direction === 'bullish') {
      // 预计上涨，价格稍高
      price = currentPrice * 1.01;
    }
  }
  
  return Math.max(1, Math.round(price * 100) / 100);
}

/**
 * 计算快速买入价格
 */
function calculateFastBuyPrice(
  currentPrice: number,
  prediction: CachedPricePrediction | null
): number {
  let price = currentPrice * FAST_CONFIG.priceMarginBuy;
  
  // 根据预测微调
  if (prediction) {
    if (prediction.signal === 'strong_buy') {
      // 急于买入，价格更高
      price *= 1.05;
    } else if (prediction.direction === 'bearish') {
      // 预计下跌，价格稍低
      price = currentPrice * 0.99;
    }
  }
  
  return Math.max(1, Math.round(price * 100) / 100);
}

// ==================== 快速订单管理 ====================

/** 订单取消的价格偏离阈值（10%，从20%降低以更快清理无效订单） */
const PRICE_DEVIATION_CANCEL_THRESHOLD = 0.1;

/** 长期未成交订单的取消阈值（tick数） */
const STALE_ORDER_THRESHOLD = 50;

/**
 * 快速订单管理 - 取消过期和无效订单
 * 优化：更激进地清理订单以防止订单池溢出
 */
function fastOrderManagement(world: GameWorld, companyId: number): number {
  let cancelledCount = 0;
  const o = world.orders;
  
  // 遍历该公司的所有活跃订单
  for (let orderIdx = 0; orderIdx < MAX_ORDERS; orderIdx++) {
    if (!o.isActive[orderIdx]) continue;
    if (o.companyIds[orderIdx] !== companyId) continue;
    
    const goodsId = o.goodsIds[orderIdx];
    const orderType = o.types[orderIdx]; // 0 = buy, 1 = sell
    const orderPrice = o.prices[orderIdx];
    const orderTick = o.createdTicks[orderIdx];
    const orderAge = world.tick - orderTick;
    
    // 检查订单是否过期
    if (orderAge > FAST_CONFIG.orderExpiryTicks) {
      cancelOrder(world, orderIdx);
      cancelledCount++;
      continue;
    }
    
    // 检查长期未成交订单（完全未成交超过50tick）
    if (orderAge > STALE_ORDER_THRESHOLD && o.remainings[orderIdx] === o.quantities[orderIdx]) {
      cancelOrder(world, orderIdx);
      cancelledCount++;
      continue;
    }
    
    const currentPrice = world.goods.prices[goodsId];
    
    if (orderType === 0) {
      // 买单：买价比市价高10%以上，取消（从20%降低到10%）
      if (orderPrice > currentPrice * (1 + PRICE_DEVIATION_CANCEL_THRESHOLD)) {
        cancelOrder(world, orderIdx);
        cancelledCount++;
      }
    } else {
      // 卖单：卖价比市价低10%以上，取消（从20%降低到10%）
      if (orderPrice < currentPrice * (1 - PRICE_DEVIATION_CANCEL_THRESHOLD)) {
        const prediction = getCachedPrediction(world, goodsId);
        if (prediction?.signal !== 'strong_sell') {
          cancelOrder(world, orderIdx);
          cancelledCount++;
        }
      }
    }
  }
  
  return cancelledCount;
}

// ==================== 批量快速决策 ====================

/**
 * 批量处理多个公司的快速决策
 * 
 * @param world 游戏世界
 * @param companyIds 要处理的公司ID列表
 * @returns 总决策数量
 */
export function batchFastDecision(world: GameWorld, companyIds: number[]): number {
  let totalDecisions = 0;
  
  for (const companyId of companyIds) {
    totalDecisions += fastDecision(world, companyId);
  }
  
  return totalDecisions;
}

/**
 * 处理所有AI公司的快速决策
 */
export function processAllAIFast(world: GameWorld): number {
  let totalDecisions = 0;
  
  // 跳过玩家公司（ID=0）
  for (let companyId = 1; companyId < MAX_COMPANIES; companyId++) {
    // 检查公司是否活跃
    if (world.companies.cash[companyId] > 0) {
      totalDecisions += fastDecision(world, companyId);
    }
  }
  
  return totalDecisions;
}

// ==================== 清理函数 ====================

/**
 * 清理缓存数据
 */
export function clearFastDecisionCache(): void {
  companyMainGoods.clear();
  companyMainGoodsLastUpdate.clear();
}