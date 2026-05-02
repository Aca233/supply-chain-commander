/**
 * 玩家自动交易系统
 *
 * 功能：
 * 1. 自动销售：当玩家有多余库存时，自动挂卖单
 * 2. 自动采购：当玩家建筑需要的原材料不足时，自动购买
 * 3. 可配置的价格策略和交易阈值
 */

import { GameWorld } from '../world/GameWorld';
import { GOODS_BY_ID } from '@/data/goods';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';
import {
  AI_BUY_ORDER_EXPIRY,
  AI_SELL_ORDER_EXPIRY,
  BUILDING_MATERIAL_ORDER_EXPIRY,
  GOODS_COUNT,
  TICKS_PER_DAY,
} from '../constants';
import { createBuyOrder, createSellOrder, getOrderBookView, cancelOrder, getActiveOrderIndices } from '../market/OrderBook';
import { getBaseMaterials, getUpgradeMaterials, getBuildingConstructionConfig } from '@/data/buildingMaterials';
import { getCompanyConstructionQueue } from '../construction/ConstructionTick';
import { getCompanyRetailGoodsNeeds } from '../economy/RetailSystem';

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
  
  // 0.5 【新增】撤销库存已充足的买单
  cancelUnnecessaryBuyOrders(world, playerId, config);
  
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
  
  // 【新增】先检查市场上是否有高价买单可以"吃"（即时成交）
  ordersPlaced += executeTakeBuyOrders(world, playerId, config);
  
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
  
  // 收集生产配置需要的原材料及其每日需求量
  // 【修复】不再完全跳过原材料，而是计算需求量，只保留足够用的
  const productionInputNeeds = new Map<number, number>(); // goodsId -> 每日需求量
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== playerId || !b.isActive[buildingId]) continue;

    const production = getBuildingRecipeFromInstance(world, buildingId);

    // 计算每种输入材料的每日需求（每tick消耗 × 当前每天tick数）
    const efficiency = b.efficiencies[buildingId] || 1;
    for (const input of production.inputs) {
      const current = productionInputNeeds.get(input.goodsId) || 0;
      productionInputNeeds.set(input.goodsId, current + input.amount * efficiency * TICKS_PER_DAY);
    }
  }

  // 收集自有零售店当前需要从公司库存补入的商品量
  const retailGoodsNeeds = getCompanyRetailGoodsNeeds(world, playerId);
  
  // 收集玩家建筑的产出商品
  const outputGoods = new Set<number>();
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== playerId || !b.isActive[buildingId]) continue;

    const production = getBuildingRecipeFromInstance(world, buildingId);

    for (const output of production.outputs) {
      outputGoods.add(output.goodsId);
    }
  }
  
  // 同时也检查所有有库存的商品（不仅是建筑产出）
  // 【修复】原材料也可以卖出，只要库存超过生产所需
  for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
    // 跳过建造队列需要的材料
    if (reservedForConstruction.has(goodsId)) {
      continue;
    }
    
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    const retailReserve = retailGoodsNeeds.get(goodsId) || 0;
    
    // 如果是生产所需原材料，检查是否有多余库存
    const dailyNeed = productionInputNeeds.get(goodsId) || 0;
    if (dailyNeed > 0) {
      // 保留1天生产用量（从3天降到1天，更积极卖出）
      const reserveForProduction = dailyNeed * 1;
      const excessInventory = inventory - reserveForProduction;
      
      // 多余库存>10 或者 库存超过1000绝对值时可以卖（降低门槛）
      if (excessInventory - retailReserve > 10 || inventory > 1000) {
        // 有多余库存，加入可销售列表
        outputGoods.add(goodsId);
      }
      continue; // 已处理，跳过下面的通用逻辑
    }
    
    // 非生产原材料：如果库存超过10，也加入可销售列表
    if (inventory - retailReserve > 10) {
      outputGoods.add(goodsId);
    }
  }
  
  // 为每种产出商品检查是否需要挂卖单
  for (const goodsId of outputGoods) {
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    const reserved = c.inventoryReserved[playerId * GOODS_COUNT + goodsId];
    
    // 保留建造队列需要的材料
    const constructionReserved = reservedForConstruction.get(goodsId) || 0;
    
    // 保留生产所需的原材料（1天用量，更积极卖出）
    const dailyProductionNeed = productionInputNeeds.get(goodsId) || 0;
    const productionReserve = dailyProductionNeed * 1;

    // 保留自有零售店当前缺口
    const retailReserve = retailGoodsNeeds.get(goodsId) || 0;
    
    // 计算总需保留量
    const totalReserve = reserved + constructionReserved + productionReserve + retailReserve;
    
    // 计算真正可卖的数量
    let available = inventory - totalReserve;
    
    // 【关键修复】如果库存很大（>1000），强制可卖一部分
    // 但必须保证建造材料不被卖掉
    if (inventory > 1000 && available < inventory * 0.5) {
      // 计算硬性保留后的上限
      const maxSellable = Math.max(0, inventory - totalReserve);
      // 取50%和建造保留后上限的较小值
      available = Math.min(Math.floor(inventory * 0.5), maxSellable);
    }
    
    // 如果玩家自己有买单，且可用量很少，跳过
    const existingBuyOrders = countExistingOrders(world, playerId, goodsId, 'buy');
    if (existingBuyOrders > 0 && available <= 100) {
      continue;
    }
    
    // 保留一定比例
    const reserveAmount = Math.max(0, available) * config.autoSell.reserveRatio;
    const sellableAmount = Math.floor(available - reserveAmount);
    
    // 降低最小卖出门槛到1个单位
    if (sellableAmount < 1) continue;
    
    // 计算卖价
    const goods = GOODS_BY_ID.get(goodsId);
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
    
    // 库存压力降价：库存越接近积压上限，卖价越低，促成交
    // Why: 长周期模拟显示矿业 AI 库存涨数百万仍守在市价附近无法成交
    // How: 库存>1万时按比例下调 5-30%，但不低于基础价 20% 的硬地板
    if (inventory > 10000) {
      const pressureRatio = Math.min(1, (inventory - 10000) / 90000);
      sellPrice *= 1 - 0.30 * pressureRatio;
    }

    // 确保价格不低于基础价的20%
    sellPrice = Math.max(sellPrice, basePrice * 0.2);
    
    // 检查是否已有足够的卖单（放宽到10个，且只检查普通挂单）
    const existingSellOrders = countExistingOrders(world, playerId, goodsId, 'sell');
    if (existingSellOrders >= 10) continue;
    
    // 分批挂单（每次挂可售数量的50%，最少1个）
    const batchSize = Math.max(1, Math.min(sellableAmount, Math.floor(sellableAmount * 0.5)));
    
    const orderId = createSellOrder(
      world,
      playerId,
      goodsId,
      batchSize,
      sellPrice,
      AI_SELL_ORDER_EXPIRY
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
 * 【新增】吃买单功能 - 主动卖给市场上出价高的买家
 *
 * 核心逻辑：
 * 1. 遍历所有有库存的商品
 * 2. 检查订单簿中是否有其他公司的买单
 * 3. 如果买单价格合适（>=基准价的80%），直接以买单价格挂卖单
 * 4. 这样可以立即成交，不需要等待
 */
function executeTakeBuyOrders(
  world: GameWorld,
  playerId: number,
  config: PlayerAutoTradeConfig
): number {
  const c = world.companies;
  let ordersPlaced = 0;
  
  // 【关键修复】收集建造队列中需要保留的材料
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
  
  // 收集生产所需原材料的每日需求量
  const productionInputNeeds = new Map<number, number>();
  const b = world.buildings;
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== playerId || !b.isActive[buildingId]) continue;
    const production = getBuildingRecipeFromInstance(world, buildingId);
    const efficiency = b.efficiencies[buildingId] || 1;
    for (const input of production.inputs) {
      const current = productionInputNeeds.get(input.goodsId) || 0;
      productionInputNeeds.set(input.goodsId, current + input.amount * efficiency * TICKS_PER_DAY);
    }
  }

  // 收集自有零售店当前需要从公司库存补入的商品量
  const retailGoodsNeeds = getCompanyRetailGoodsNeeds(world, playerId);
  
  // 遍历所有商品
  for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    const reserved = c.inventoryReserved[playerId * GOODS_COUNT + goodsId];
    
    // 保留建造队列需要的材料
    const constructionReserve = reservedForConstruction.get(goodsId) || 0;
    
    // 保留生产所需的1天用量（从3天降到1天，更积极卖出）
    const dailyNeed = productionInputNeeds.get(goodsId) || 0;
    const productionReserve = dailyNeed * 1;

    // 保留自有零售店当前缺口
    const retailReserve = retailGoodsNeeds.get(goodsId) || 0;
    
    // 总可用 = 库存 - 已预留 - 建造保留 - 生产保留
    let available = inventory - reserved - constructionReserve - productionReserve - retailReserve;
    
    // 【关键修复】如果库存很大（>5000），强制可卖一部分
    // 但必须保证建造材料不被卖掉
    if (inventory > 5000 && available < inventory * 0.3) {
      // 计算硬性保留后的上限
      const maxSellable = Math.max(0, inventory - reserved - constructionReserve - productionReserve - retailReserve);
      // 取30%和建造保留后上限的较小值
      available = Math.min(Math.floor(inventory * 0.3), maxSellable);
    }
    
    // 如果玩家自己有买单，且可用量不多，跳过
    const existingBuyOrders = countExistingOrders(world, playerId, goodsId, 'buy');
    if (existingBuyOrders > 0 && available <= 100) {
      continue;
    }
    
    // 至少有5个可卖才处理
    if (available < 5) continue;
    
    const goods = GOODS_BY_ID.get(goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    
    // 获取订单簿
    const orderBookView = getOrderBookView(world, goodsId);
    
    // 遍历买单（已按价格降序排列）
    for (const buyOrder of orderBookView.buyOrders) {
      // 跳过自己的买单
      if (buyOrder.companyId === playerId) continue;
      
      // 检查价格是否可接受（至少基准价的50%，从80%降低到50%更积极）
      if (buyOrder.price < basePrice * 0.5) {
        break; // 买单是降序的，后面的价格更低，不用继续了
      }
      
      // 计算可卖数量（不超过可用库存和买单需求量）
      const sellQuantity = Math.min(available, buyOrder.remaining, 1000);
      
      if (sellQuantity < 1) continue;
      
      // 【修复】吃买单是立即成交的，不应该受卖单数量限制
      // 以买单价格挂卖单（确保立即成交）
      const orderId = createSellOrder(
        world,
        playerId,
        goodsId,
        sellQuantity,
        buyOrder.price, // 使用买方价格，确保立即成交
        AI_SELL_ORDER_EXPIRY
      );
      
      if (orderId !== null) {
        ordersPlaced++;
        playerAutoTradeState.totalSold += sellQuantity;
        // 每种商品每次只吃一个买单
        break;
      }
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
  
  // 1. 收集生产配置需要的原材料
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== playerId || !b.isActive[buildingId]) continue;

    const production = getBuildingRecipeFromInstance(world, buildingId);

    // 计算每周期需要的原材料
    for (const input of production.inputs) {
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
    const goods = GOODS_BY_ID.get(goodsId);
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
      BUILDING_MATERIAL_ORDER_EXPIRY
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
    
    // 【关键修复】先检查现有买单数量，避免重复下单
    const existingBuyQuantity = countExistingOrderQuantity(world, playerId, goodsId, 'buy');
    const totalPending = inventory + existingBuyQuantity;
    
    // 计算目标库存
    const targetStock = neededPerCycle * config.autoBuy.targetStockCycles;
    const lowThreshold = neededPerCycle * config.autoBuy.lowStockThreshold;
    
    // 如果库存+现有买单已经达到目标，跳过
    if (totalPending >= targetStock) {
      continue; // 已经有足够的库存或待购
    }
    
    // 如果库存+现有买单高于低库存阈值，也跳过（不急着补货）
    if (totalPending >= lowThreshold) {
      continue;
    }
    
    // 计算还需要采购多少（目标 - 已有 - 待购）
    const buyQuantity = Math.ceil(targetStock - totalPending);
    
    if (buyQuantity < 5) continue;
    
    // 计算买价
    const goods = GOODS_BY_ID.get(goodsId);
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
    
    // 检查是否已有足够的买单数量（订单个数限制）
    const existingBuyOrders = countExistingOrders(world, playerId, goodsId, 'buy');
    if (existingBuyOrders >= 2) continue; // 最多2个买单（从3降到2，更保守）
    
    // 一次性买够需要的数量（不再分批）
    const orderId = createBuyOrder(
      world,
      playerId,
      goodsId,
      buyQuantity,
      buyPrice,
      BUILDING_MATERIAL_ORDER_EXPIRY
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
    const goods = GOODS_BY_ID.get(order.goodsId);
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
          AI_SELL_ORDER_EXPIRY
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
          AI_BUY_ORDER_EXPIRY
        );
        if (orderId !== null) {
          // console.log(`[价格调整] 买单 商品${order.goodsId} 涨价 ${order.price.toFixed(2)} -> ${newPrice.toFixed(2)}`);
        }
      }
    }
  }
}

/**
 * 【新增】撤销库存已充足的买单
 * 当库存已经超过目标时，撤销多余的买单
 */
function cancelUnnecessaryBuyOrders(
  world: GameWorld,
  playerId: number,
  config: PlayerAutoTradeConfig
): void {
  const c = world.companies;
  const o = world.orders;
  const b = world.buildings;
  
  // 计算每种原材料的每周期需求量
  const materialNeeds = new Map<number, number>();
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (b.owners[buildingId] !== playerId || !b.isActive[buildingId]) continue;
    const production = getBuildingRecipeFromInstance(world, buildingId);
    for (const input of production.inputs) {
      const current = materialNeeds.get(input.goodsId) || 0;
      materialNeeds.set(input.goodsId, current + input.amount);
    }
  }
  
  // 收集建造队列需要的材料
  const constructionNeeds = new Map<number, number>();
  const constructionQueue = getCompanyConstructionQueue(world, playerId);
  for (const task of constructionQueue) {
    if (task.status < 2) {
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
        const current = constructionNeeds.get(mat.goodsId) || 0;
        constructionNeeds.set(mat.goodsId, current + mat.amount);
      }
    }
  }
  
  // 遍历玩家的所有买单
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (o.companyIds[i] !== playerId) continue;
    if (o.types[i] !== 0) continue; // 只处理买单
    
    const goodsId = o.goodsIds[i];
    const inventory = c.inventories[playerId * GOODS_COUNT + goodsId];
    
    // 计算这个商品的目标库存
    const neededPerCycle = materialNeeds.get(goodsId) || 0;
    const constructionNeed = constructionNeeds.get(goodsId) || 0;
    
    // 目标库存 = 生产需求 × 目标周期 + 建造需求
    const targetStock = neededPerCycle * config.autoBuy.targetStockCycles + constructionNeed;
    
    // 如果当前库存已经超过目标的150%，撤销买单
    if (inventory > targetStock * 1.5 && inventory > 100) {
      if (cancelOrder(world, i)) {
        const goods = GOODS_BY_ID.get(goodsId);
        console.log(`[撤销多余买单] 商品${goodsId}(${goods?.name}) 库存${inventory} > 目标${targetStock.toFixed(0)}×1.5`);
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
