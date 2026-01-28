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
import { GOODS_COUNT } from '../constants';
import { createBuyOrder, createSellOrder, getOrderBookView, cancelOrder, getActiveOrderIndices } from '../market/OrderBook';
import { getBaseMaterials, getUpgradeMaterials, getBuildingConstructionConfig } from '@/data/buildingMaterials';
import { getCompanyConstructionQueue } from '../construction/ConstructionTick';

// 订单价格调整配置
const ORDER_PRICE_ADJUST_CONFIG = {
  // 订单存在多少tick后开始调整价格
  adjustAfterTicks: 12,
  // 每次调整的价格比例
  adjustPercent: 0.05,  // 5%
  // 最大调整次数（防止价格无限调整）
  maxAdjustments: 10,
  // 卖单最低价格（相对于基础价）
  minSellPriceRatio: 0.3,  // 30%
  // 买单最高价格（相对于基础价）
  maxBuyPriceRatio: 2.0,   // 200%
};

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
  
  // 0. 先调整长期未成交的订单价格
  adjustStaleOrderPrices(world, playerId);
  
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
  
  // 收集建造队列中需要保留的材料（不应该自动卖出）
  const reservedForConstruction = new Map<number, number>();
  const constructionQueue = getCompanyConstructionQueue(world, playerId);
  for (const task of constructionQueue) {
    // 只关注未完成的任务
    if (task.status < 2) { // WAITING=0, IN_PROGRESS=1
      let materials;
      if (task.isUpgrade) {
        const cfg = getBuildingConstructionConfig(task.buildingTypeId);
        const upgradeMats = cfg?.upgradeMaterials?.[task.targetLevel - 2];
        if (upgradeMats && upgradeMats.length > 0) {
          materials = upgradeMats;
        } else {
          materials = getBaseMaterials(task.buildingTypeId).map(mat => ({
            goodsId: mat.goodsId,
            amount: Math.ceil(mat.amount * 0.5),
          }));
        }
      } else {
        materials = getBaseMaterials(task.buildingTypeId);
      }
      for (const mat of materials) {
        const current = reservedForConstruction.get(mat.goodsId) || 0;
        reservedForConstruction.set(mat.goodsId, current + mat.amount);
      }
    }
  }
  
  // 收集生产配方需要的原材料（这些也不应该自动卖出！）
  const productionInputs = new Set<number>();
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== playerId || !b.isActive[buildingId]) continue;
    
    const recipeId = b.recipeIds[buildingId];
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    // 记录所有输入材料
    for (const input of recipe.inputs) {
      productionInputs.add(input.goodsId);
    }
  }
  
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
  // 但排除建造队列需要的材料和生产需要的原材料
  for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
    // 跳过建造队列需要的材料
    if (reservedForConstruction.has(goodsId)) {
      continue;
    }
    
    // 跳过生产需要的原材料（避免自己买自己卖）
    if (productionInputs.has(goodsId)) {
      continue;
    }
    
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    // 如果库存超过10，也加入可销售列表（从100降低到10）
    if (inventory > 10) {
      outputGoods.add(goodsId);
    }
  }
  
  // 为每种产出商品检查是否需要挂卖单
  for (const goodsId of outputGoods) {
    // 再次检查：如果这个商品是生产需要的原材料，不要卖出
    if (productionInputs.has(goodsId)) {
      continue;
    }
    
    // 检查是否已经有买单（避免同时买卖同一商品）
    const existingBuyOrders = countExistingOrders(world, playerId, goodsId, 'buy');
    if (existingBuyOrders > 0) {
      continue; // 已有买单，不要卖
    }
    
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    const reserved = c.inventoryReserved[playerId * GOODS_COUNT + goodsId];
    
    // 额外保留建造队列需要的材料
    const constructionReserved = reservedForConstruction.get(goodsId) || 0;
    const available = inventory - reserved - constructionReserved;
    
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
  
  // 计算每种原材料的需求量（包括生产和建造）
  const materialNeeds = new Map<number, number>();
  
  // 1. 收集生产配方需要的原材料
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
  
  // 2. 收集建造队列需要的材料（优先级最高！）
  const constructionNeeds = new Map<number, number>();
  const constructionQueue = getCompanyConstructionQueue(world, playerId);
  
  // 调试日志
  if (world.tick % 50 === 0 && constructionQueue.length > 0) {
    console.log(`[PlayerAutoTrader T${world.tick}] 建造队列: ${constructionQueue.length} 个任务`);
  }
  
  for (const task of constructionQueue) {
    // 只关注等待材料的任务
    if (task.status === 0) { // WAITING = 0
      // 修复：使用与ConstructionTick一致的材料获取逻辑
      let materials;
      if (task.isUpgrade) {
        // 升级任务：优先使用升级材料，否则使用基础材料的50%
        const config = getBuildingConstructionConfig(task.buildingTypeId);
        const upgradeMats = config?.upgradeMaterials?.[task.targetLevel - 2];
        if (upgradeMats && upgradeMats.length > 0) {
          materials = upgradeMats;
        } else {
          materials = getBaseMaterials(task.buildingTypeId).map(mat => ({
            goodsId: mat.goodsId,
            amount: Math.ceil(mat.amount * 0.5),
          }));
        }
      } else {
        // 新建任务：使用基础材料
        materials = getBaseMaterials(task.buildingTypeId);
      }
      
      // 调试日志
      if (world.tick % 50 === 0) {
        console.log(`[PlayerAutoTrader] 任务: ${task.buildingName}, 类型ID=${task.buildingTypeId}, 升级=${task.isUpgrade}, 材料数=${materials.length}`);
      }
      
      for (const mat of materials) {
        const current = constructionNeeds.get(mat.goodsId) || 0;
        constructionNeeds.set(mat.goodsId, current + mat.amount);
      }
    }
  }
  
  // 3. 优先为建造队列采购材料
  for (const [goodsId, neededAmount] of constructionNeeds) {
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    const reserved = c.inventoryReserved[playerId * GOODS_COUNT + goodsId];
    const available = inventory - reserved;
    
    // 计算现有买单的总量
    const existingBuyQuantity = countExistingOrderQuantity(world, playerId, goodsId, 'buy');
    
    // 计算实际缺口（考虑库存 + 现有买单）
    const totalPending = available + existingBuyQuantity;
    
    // 如果库存+现有买单已经足够，跳过
    if (totalPending >= neededAmount) {
      continue;
    }
    
    // 计算还需要采购多少
    const shortfall = neededAmount - totalPending;
    // 多采购20%作为缓冲
    const buyQuantity = Math.ceil(shortfall * 1.2);
    
    if (buyQuantity < 1) continue;
    
    // 计算买价（建造材料采购使用激进策略，快速买入）
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    const marketPrice = world.goods.prices[goodsId];
    
    // 建造材料：比市价高15%快速买入（更激进）
    let buyPrice = Math.max(marketPrice, basePrice) * 1.15;
    
    // 【吃单功能】检查市场上是否有更便宜的卖单，如果有则使用卖单价格
    const orderBookView = getOrderBookView(world, goodsId);
    if (orderBookView.bestAsk !== null && orderBookView.bestAsk < buyPrice) {
      // 使用市场最低卖价（吃单），但要排除自己的卖单
      const cheapestNonPlayerSellOrder = orderBookView.sellOrders.find(
        order => order.companyId !== playerId
      );
      if (cheapestNonPlayerSellOrder && cheapestNonPlayerSellOrder.price < buyPrice) {
        buyPrice = cheapestNonPlayerSellOrder.price;
        // console.log(`[吃单] 商品${goodsId} 使用对方卖价 ${buyPrice.toFixed(2)}`);
      }
    }
    
    // 检查资金
    const cost = buyQuantity * buyPrice;
    if (c.cash[playerId] < cost) {
      // 资金不足，减少采购量
      const affordableQty = Math.floor(c.cash[playerId] * 0.3 / buyPrice);
      if (affordableQty < 1) continue;
    }
    
    // 检查是否已有足够的买单数量（避免太多订单）
    const existingBuyOrders = countExistingOrders(world, playerId, goodsId, 'buy');
    if (existingBuyOrders >= 3) continue; // 建造材料最多3个买单
    
    const orderId = createBuyOrder(
      world,
      playerId,
      goodsId,
      buyQuantity,
      buyPrice,
      9999999 // 建造材料订单永不过期
    );
    
    if (orderId !== null) {
      ordersPlaced++;
      playerAutoTradeState.totalBought += buyQuantity;
      // console.log(`[建造材料采购] 商品${goodsId} 数量${buyQuantity} 价格${buyPrice.toFixed(2)} 缺口${shortfall}`);
    }
  }
  
  // 4. 为生产原材料检查库存并采购
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
    
    // 【吃单功能】检查市场上是否有更便宜的卖单，如果有则使用卖单价格
    const orderBookView = getOrderBookView(world, goodsId);
    if (orderBookView.bestAsk !== null && orderBookView.bestAsk < buyPrice) {
      // 使用市场最低卖价（吃单），但要排除自己的卖单
      const cheapestNonPlayerSellOrder = orderBookView.sellOrders.find(
        order => order.companyId !== playerId
      );
      if (cheapestNonPlayerSellOrder && cheapestNonPlayerSellOrder.price < buyPrice) {
        buyPrice = cheapestNonPlayerSellOrder.price;
        // console.log(`[生产材料吃单] 商品${goodsId} 使用对方卖价 ${buyPrice.toFixed(2)}`);
      }
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
    
    // 一次性买够需要的数量（不再分批）
    const orderId = createBuyOrder(
      world,
      playerId,
      goodsId,
      buyQuantity,
      buyPrice,
      24 * 5 // 5天过期（延长过期时间）
    );
    
    if (orderId !== null) {
      ordersPlaced++;
      playerAutoTradeState.totalBought += buyQuantity;
    }
  }
  
  return ordersPlaced;
}

/**
 * 统计现有订单数量（使用活跃订单索引优化）
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
  
  // 使用活跃订单索引，避免遍历全部 MAX_ORDERS
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (
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
 * 统计现有订单的总数量（用于避免重复下单，使用活跃订单索引优化）
 */
function countExistingOrderQuantity(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  orderType: 'buy' | 'sell'
): number {
  const o = world.orders;
  const typeValue = orderType === 'buy' ? 0 : 1;
  let totalQuantity = 0;
  
  // 使用活跃订单索引，避免遍历全部 MAX_ORDERS
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (
      o.companyIds[i] === companyId &&
      o.goodsIds[i] === goodsId &&
      o.types[i] === typeValue
    ) {
      totalQuantity += o.remainings[i];
    }
  }
  
  return totalQuantity;
}

/**
 * 调整长期未成交的订单价格（使用活跃订单索引优化）
 * 卖单：降价促销
 * 买单：涨价买入
 */
function adjustStaleOrderPrices(world: GameWorld, playerId: number): void {
  const o = world.orders;
  const currentTick = world.tick;
  
  // 收集需要调整的订单
  const ordersToAdjust: Array<{
    orderIdx: number;
    goodsId: number;
    orderType: number; // 0=buy, 1=sell
    price: number;
    remaining: number;
    createdTick: number;
  }> = [];
  
  // 使用活跃订单索引，避免遍历全部 MAX_ORDERS
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (o.companyIds[i] !== playerId) continue;
    
    const orderAge = currentTick - o.createdTicks[i];
    
    // 只调整存在超过阈值时间的订单
    if (orderAge >= ORDER_PRICE_ADJUST_CONFIG.adjustAfterTicks) {
      ordersToAdjust.push({
        orderIdx: i,
        goodsId: o.goodsIds[i],
        orderType: o.types[i],
        price: o.prices[i],
        remaining: o.remainings[i],
        createdTick: o.createdTicks[i],
      });
    }
  }
  
  // 调整每个订单
  for (const order of ordersToAdjust) {
    const goods = ALL_GOODS.find(g => g.id === order.goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    let newPrice: number;
    
    if (order.orderType === 1) {
      // 卖单：降价
      newPrice = order.price * (1 - ORDER_PRICE_ADJUST_CONFIG.adjustPercent);
      const minPrice = basePrice * ORDER_PRICE_ADJUST_CONFIG.minSellPriceRatio;
      
      // 检查是否低于最低价
      if (newPrice < minPrice) {
        newPrice = minPrice;
        // 如果已经是最低价，不再调整
        if (order.price <= minPrice) {
          continue;
        }
      }
      
      // 取消旧订单，以新价格重新下单
      if (cancelOrder(world, order.orderIdx)) {
        const orderId = createSellOrder(
          world,
          playerId,
          order.goodsId,
          order.remaining,
          newPrice,
          24 * 5
        );
        if (orderId !== null) {
          // console.log(`[价格调整] 卖单 商品${order.goodsId} 降价 ${order.price.toFixed(2)} -> ${newPrice.toFixed(2)}`);
        }
      }
    } else {
      // 买单：涨价
      newPrice = order.price * (1 + ORDER_PRICE_ADJUST_CONFIG.adjustPercent);
      const maxPrice = basePrice * ORDER_PRICE_ADJUST_CONFIG.maxBuyPriceRatio;
      
      // 检查是否高于最高价
      if (newPrice > maxPrice) {
        newPrice = maxPrice;
        // 如果已经是最高价，不再调整
        if (order.price >= maxPrice) {
          continue;
        }
      }
      
      // 取消旧订单，以新价格重新下单
      if (cancelOrder(world, order.orderIdx)) {
        const orderId = createBuyOrder(
          world,
          playerId,
          order.goodsId,
          order.remaining,
          newPrice,
          9999999
        );
        if (orderId !== null) {
          // console.log(`[价格调整] 买单 商品${order.goodsId} 涨价 ${order.price.toFixed(2)} -> ${newPrice.toFixed(2)}`);
        }
      }
    }
  }
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