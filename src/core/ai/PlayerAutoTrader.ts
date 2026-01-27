/**
 * 玩家自动交易系统
 * 
 * 功能：
 * 1. 自动销售：当玩家有多余库存时，自动挂卖单
 * 2. 自动采购：当玩家建筑需要的原材料不足时，自动购买
 * 3. 可配置的价格策略和交易阈值
 */

import { GameWorld } from '../world/GameWorld';
import { ALL_GOODS } from '@/data/goods';
import { RECIPES } from '@/data/recipes';
import { GOODS_COUNT, MAX_ORDERS } from '../constants';
import { createBuyOrder, createSellOrder, getOrderBookView } from '../market/OrderBook';

// 价格策略
export type PriceStrategy = 'aggressive' | 'normal' | 'conservative';

// 自动交易配置
export interface PlayerAutoTradeConfig {
  // 是否启用自动交易
  enabled: boolean;
  
  // 自动销售设置
  autoSell: {
    enabled: boolean;
    priceStrategy: PriceStrategy;
    // 保留库存量（不卖完）
    reserveRatio: number; // 0-1, 保留多少比例的库存
  };
  
  // 自动采购设置
  autoBuy: {
    enabled: boolean;
    priceStrategy: PriceStrategy;
    // 当库存低于此周期用量时自动采购
    lowStockThreshold: number; // 周期数
    // 采购目标（补充到多少周期用量）
    targetStockCycles: number;
  };
  
  // 交易间隔（每多少tick执行一次）
  tradeInterval: number;
}

// 默认配置（优化：提高交易频率，降低门槛）
const DEFAULT_CONFIG: PlayerAutoTradeConfig = {
  enabled: true,
  autoSell: {
    enabled: true,
    priceStrategy: 'normal',
    reserveRatio: 0.05, // 保留5%库存（从10%降低到5%，更积极销售）
  },
  autoBuy: {
    enabled: true,
    priceStrategy: 'normal',
    lowStockThreshold: 5,  // 低于5周期用量时采购
    targetStockCycles: 15, // 补充到15周期
  },
  tradeInterval: 3, // 每3tick执行一次（从6降低到3，更频繁交易）
};

// 玩家自动交易状态
export interface PlayerAutoTradeState {
  lastTradesTick: number;
  config: PlayerAutoTradeConfig;
  
  // 统计数据
  sellOrdersPlaced: number;
  buyOrdersPlaced: number;
  totalSold: number;
  totalBought: number;
}

// 全局状态
let playerAutoTradeState: PlayerAutoTradeState = {
  lastTradesTick: 0,
  config: { ...DEFAULT_CONFIG },
  sellOrdersPlaced: 0,
  buyOrdersPlaced: 0,
  totalSold: 0,
  totalBought: 0,
};

/**
 * 获取当前配置
 */
export function getPlayerAutoTradeConfig(): PlayerAutoTradeConfig {
  return { ...playerAutoTradeState.config };
}

/**
 * 更新配置
 */
export function setPlayerAutoTradeConfig(config: Partial<PlayerAutoTradeConfig>): void {
  playerAutoTradeState.config = {
    ...playerAutoTradeState.config,
    ...config,
    autoSell: {
      ...playerAutoTradeState.config.autoSell,
      ...(config.autoSell || {}),
    },
    autoBuy: {
      ...playerAutoTradeState.config.autoBuy,
      ...(config.autoBuy || {}),
    },
  };
}

/**
 * 获取自动交易统计
 */
export function getPlayerAutoTradeStats(): {
  sellOrdersPlaced: number;
  buyOrdersPlaced: number;
  totalSold: number;
  totalBought: number;
} {
  return {
    sellOrdersPlaced: playerAutoTradeState.sellOrdersPlaced,
    buyOrdersPlaced: playerAutoTradeState.buyOrdersPlaced,
    totalSold: playerAutoTradeState.totalSold,
    totalBought: playerAutoTradeState.totalBought,
  };
}

/**
 * 执行玩家自动交易
 * 每tick由GameLoop调用
 */
export function executePlayerAutoTrade(world: GameWorld): {
  sellOrders: number;
  buyOrders: number;
} {
  const config = playerAutoTradeState.config;
  const currentTick = world.tick;
  
  // 检查是否启用
  if (!config.enabled) {
    return { sellOrders: 0, buyOrders: 0 };
  }
  
  // 检查间隔
  if (currentTick - playerAutoTradeState.lastTradesTick < config.tradeInterval) {
    return { sellOrders: 0, buyOrders: 0 };
  }
  
  playerAutoTradeState.lastTradesTick = currentTick;
  
  let sellOrders = 0;
  let buyOrders = 0;
  
  const playerId = 0; // 玩家公司ID
  
  // 1. 执行自动销售
  if (config.autoSell.enabled) {
    sellOrders = executeAutoSell(world, playerId, config);
  }
  
  // 2. 执行自动采购
  if (config.autoBuy.enabled) {
    buyOrders = executeAutoBuy(world, playerId, config);
  }
  
  playerAutoTradeState.sellOrdersPlaced += sellOrders;
  playerAutoTradeState.buyOrdersPlaced += buyOrders;
  
  return { sellOrders, buyOrders };
}

/**
 * 执行自动销售
 */
function executeAutoSell(
  world: GameWorld,
  playerId: number,
  config: PlayerAutoTradeConfig
): number {
  const c = world.companies;
  const b = world.buildings;
  let ordersPlaced = 0;
  
  // 收集玩家建筑的产出商品
  const outputGoods = new Set<number>();
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== playerId || !b.isActive[buildingId]) continue;
    
    const recipeId = b.recipeIds[buildingId];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    for (const output of recipe.outputs) {
      outputGoods.add(output.goodsId);
    }
  }
  
  // 同时也检查所有有库存的商品（不仅是建筑产出）
  // 这样可以自动卖出多余的原材料，降低门槛到10个单位
  for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    // 如果库存超过10，也加入可销售列表（从100降低到10）
    if (inventory > 10) {
      outputGoods.add(goodsId);
    }
  }
  
  // 为每种产出商品检查是否需要挂卖单
  for (const goodsId of outputGoods) {
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    const reserved = c.inventoryReserved[playerId * GOODS_COUNT + goodsId];
    const available = inventory - reserved;
    
    // 保留一定比例
    const reserveAmount = inventory * config.autoSell.reserveRatio;
    const sellableAmount = Math.floor(available - reserveAmount);
    
    // 降低最小卖出门槛到1个单位
    if (sellableAmount < 1) continue;
    
    // 计算卖价
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    const marketPrice = world.goods.prices[goodsId];
    
    // 根据策略确定价格（优化：更激进的定价以促成交易）
    let sellPrice: number;
    switch (config.autoSell.priceStrategy) {
      case 'aggressive':
        // 激进：比市价低10%快速出货
        sellPrice = Math.min(marketPrice, basePrice) * 0.90;
        break;
      case 'conservative':
        // 保守：比市价高3%
        sellPrice = Math.max(marketPrice, basePrice) * 1.03;
        break;
      case 'normal':
      default:
        // 正常：市价略低2%（促进成交）
        sellPrice = (marketPrice > 0 ? marketPrice : basePrice) * 0.98;
        break;
    }
    
    // 确保价格不低于基础价的20%
    sellPrice = Math.max(sellPrice, basePrice * 0.2);
    
    // 检查是否已有足够的卖单（放宽到5个）
    const existingSellOrders = countExistingOrders(world, playerId, goodsId, 'sell');
    if (existingSellOrders >= 5) continue;
    
    // 分批挂单（每次挂可售数量的50%，最少1个）
    const batchSize = Math.max(1, Math.min(sellableAmount, Math.floor(sellableAmount * 0.5)));
    
    const orderId = createSellOrder(
      world,
      playerId,
      goodsId,
      batchSize,
      sellPrice,
      24 * 5 // 5天过期（延长过期时间）
    );
    
    if (orderId !== null) {
      ordersPlaced++;
      playerAutoTradeState.totalSold += batchSize;
      
      // 调试日志（可选）
      // console.log(`[自动卖出] 商品${goodsId} 数量${batchSize} 价格${sellPrice.toFixed(2)}`);
    }
  }
  
  return ordersPlaced;
}

/**
 * 执行自动采购
 */
function executeAutoBuy(
  world: GameWorld,
  playerId: number,
  config: PlayerAutoTradeConfig
): number {
  const c = world.companies;
  const b = world.buildings;
  let ordersPlaced = 0;
  
  // 计算每种原材料的需求量
  const materialNeeds = new Map<number, number>();
  
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== playerId || !b.isActive[buildingId]) continue;
    
    const recipeId = b.recipeIds[buildingId];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    // 计算每周期需要的原材料
    for (const input of recipe.inputs) {
      const current = materialNeeds.get(input.goodsId) || 0;
      materialNeeds.set(input.goodsId, current + input.amount);
    }
  }
  
  // 为每种原材料检查库存并采购
  for (const [goodsId, neededPerCycle] of materialNeeds) {
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    
    // 检查是否低于阈值
    if (inventory >= neededPerCycle * config.autoBuy.lowStockThreshold) {
      continue; // 库存充足
    }
    
    // 计算采购量
    const targetStock = neededPerCycle * config.autoBuy.targetStockCycles;
    const buyQuantity = Math.ceil(targetStock - inventory);
    
    if (buyQuantity < 5) continue;
    
    // 计算买价
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    const marketPrice = world.goods.prices[goodsId];
    
    // 根据策略确定价格
    let buyPrice: number;
    switch (config.autoBuy.priceStrategy) {
      case 'aggressive':
        // 激进：比市价高10%快速买入
        buyPrice = Math.max(marketPrice, basePrice) * 1.1;
        break;
      case 'conservative':
        // 保守：比市价低5%
        buyPrice = Math.min(marketPrice, basePrice) * 0.95;
        break;
      case 'normal':
      default:
        // 正常：市价
        buyPrice = marketPrice > 0 ? marketPrice : basePrice;
        break;
    }
    
    // 检查资金
    const cost = buyQuantity * buyPrice;
    if (c.cash[playerId] < cost * 1.2) {
      // 资金不足，减少采购量
      const affordableQty = Math.floor(c.cash[playerId] / buyPrice * 0.5);
      if (affordableQty < 5) continue;
    }
    
    // 检查是否已有足够的买单
    const existingBuyOrders = countExistingOrders(world, playerId, goodsId, 'buy');
    if (existingBuyOrders >= 3) continue; // 最多3个买单
    
    // 分批挂单
    const batchSize = Math.min(buyQuantity, Math.max(10, buyQuantity * 0.5));
    
    const orderId = createBuyOrder(
      world,
      playerId,
      goodsId,
      batchSize,
      buyPrice,
      24 * 3 // 3天过期
    );
    
    if (orderId !== null) {
      ordersPlaced++;
      playerAutoTradeState.totalBought += batchSize;
    }
  }
  
  return ordersPlaced;
}

/**
 * 统计现有订单数量
 */
function countExistingOrders(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  orderType: 'buy' | 'sell'
): number {
  const o = world.orders;
  const typeValue = orderType === 'buy' ? 0 : 1;
  let count = 0;
  
  for (let i = 0; i < MAX_ORDERS; i++) {
    if (
      o.isActive[i] &&
      o.companyIds[i] === companyId &&
      o.goodsIds[i] === goodsId &&
      o.types[i] === typeValue
    ) {
      count++;
    }
  }
  
  return count;
}

/**
 * 重置统计数据
 */
export function resetPlayerAutoTradeStats(): void {
  playerAutoTradeState.sellOrdersPlaced = 0;
  playerAutoTradeState.buyOrdersPlaced = 0;
  playerAutoTradeState.totalSold = 0;
  playerAutoTradeState.totalBought = 0;
}

export { DEFAULT_CONFIG as PLAYER_AUTO_TRADE_DEFAULT_CONFIG };