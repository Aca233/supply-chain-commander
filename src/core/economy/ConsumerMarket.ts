/**
 * 消费者市场模拟系统
 *
 * 核心功能：
 * 1. 将消费者需求转化为实际购买行为（最终消费品）
 * 2. 将企业生产需求转化为原材料采购（B2B交易）
 * 3. 消费者从市场购买商品（接受卖单）
 * 4. 消费者购买后商品被"消费"（从市场移除）
 *
 * 经济学原理：
 * - 消费者根据效用最大化原则购买
 * - 价格越接近或低于基准价，购买意愿越强
 * - 消费者有预算约束，按优先级购买
 * - 企业根据生产需求采购原材料
 * 
 * 重要变更：
 * - 当零售系统启用时，Pop消费通过零售店进行
 * - 零售系统未启用时，使用传统的直接市场购买
 */

import { GameWorld } from '../world/GameWorld';
import { ALL_GOODS, CONSUMER_GOODS, GoodsDefinition, GoodsId } from '@/data/goods';
import { GOODS_COUNT, MAX_ORDERS } from '../constants';
import { finalizeFilledOrder, getOrderBookView, OrderView } from '../market/OrderBook';
import { CONSUMER_TIERS, ConsumerTier } from './DemandCurve';
import { getBuildingProduction, getRetailConfig } from '@/data/buildings';
import { recordTrade, TradeOrderRef, TradePartyRef } from '../market/TradeLedger';

// ==================== 预计算查找表（O(1)查找替代O(n)） ====================

// 商品ID到商品定义的Map（避免每次 ALL_GOODS.find()）
const GOODS_BY_ID: Map<number, GoodsDefinition> = new Map();
for (const goods of ALL_GOODS) {
  GOODS_BY_ID.set(goods.id, goods);
}

// 配方系统已废弃，使用getBuildingProduction替代
// 保留空的Map定义以兼容可能的旧代码
const RECIPES_BY_ID: Map<number, unknown> = new Map();

// ==================== 可复用结果对象（减少GC压力） ====================

// 复用的B2B采购结果对象
const reusableB2BResult = {
  totalPurchases: 0,
  totalSpent: 0,
  totalQuantity: 0,
};

function resetB2BResult(): typeof reusableB2BResult {
  reusableB2BResult.totalPurchases = 0;
  reusableB2BResult.totalSpent = 0;
  reusableB2BResult.totalQuantity = 0;
  return reusableB2BResult;
}

// 复用的消费者购买结果对象
const reusablePurchaseResult: ConsumerPurchaseResult = {
  goodsId: 0,
  quantity: 0,
  totalSpent: 0,
  avgPrice: 0,
  ordersConsumed: 0,
};

function resetPurchaseResult(goodsId: number): ConsumerPurchaseResult {
  reusablePurchaseResult.goodsId = goodsId;
  reusablePurchaseResult.quantity = 0;
  reusablePurchaseResult.totalSpent = 0;
  reusablePurchaseResult.avgPrice = 0;
  reusablePurchaseResult.ordersConsumed = 0;
  return reusablePurchaseResult;
}

// 消费者购买配置
export interface ConsumerBuyConfig {
  // 每tick消费的需求比例（0-1）
  consumptionRatePerTick: number;
  // 消费者愿意接受的最高溢价比例（相对基准价）
  maxPremiumRatio: number;
  // 最低成交量（低于此量不交易，避免微交易）
  minTradeQuantity: number;
  // 价格敏感度（越高越在意价格）
  priceSensitivity: number;
  // 执行间隔（每N个tick执行一次，用于性能优化）
  executionInterval: number;
  // B2B采购执行间隔（每N个tick执行一次）
  b2bExecutionInterval: number;
  // 每次处理的商品分组数
  goodsBatchGroups: number;
  // B2B采购的建筑分组数（用于分批处理）
  b2bBuildingBatchGroups: number;
}

// 默认配置
// 【任务8优化】提高消费速率，加快商品流通，减少订单积压
const DEFAULT_CONFIG: ConsumerBuyConfig = {
  consumptionRatePerTick: 0.48, // 【提高】从32%提升到48%（加快50%消费速度）
  maxPremiumRatio: 1.8,          // 【提高】从150%提升到180%（消费者愿意接受更高溢价）
  minTradeQuantity: 0.5,         // 【降低】从1降到0.5（允许更小额交易）
  priceSensitivity: 0.35,        // 【降低】从0.5降到0.35（消费者对价格不那么敏感）
  executionInterval: 3,          // 【提高频率】从每4tick改为每3tick执行
  b2bExecutionInterval: 3,       // 【提高频率】从每4tick改为每3tick执行B2B采购
  goodsBatchGroups: 3,           // 【优化】商品分3组轮询处理（配合3tick间隔）
  b2bBuildingBatchGroups: 3,     // 【优化】建筑分3组轮询处理B2B采购
};

// 消费者购买结果
export interface ConsumerPurchaseResult {
  goodsId: number;
  quantity: number;
  totalSpent: number;
  avgPrice: number;
  ordersConsumed: number;
}

// 市场消费汇总
export interface MarketConsumptionSummary {
  totalPurchases: number;
  totalSpent: number;
  totalQuantity: number;
  purchasesByGoods: Map<number, ConsumerPurchaseResult>;
  
  // B2B采购统计
  b2bPurchases: number;
  b2bSpent: number;
  b2bQuantity: number;
}

// 空结果缓存（避免每次创建新对象）
const EMPTY_SUMMARY: MarketConsumptionSummary = {
  totalPurchases: 0,
  totalSpent: 0,
  totalQuantity: 0,
  purchasesByGoods: new Map(),
  b2bPurchases: 0,
  b2bSpent: 0,
  b2bQuantity: 0,
};

const INSTITUTIONAL_GOODS = [
  GoodsId.VACCINE,
  GoodsId.ANTIBIOTICS,
  GoodsId.MEDICAL_SUPPLIES,
  GoodsId.MEDICAL_DEVICE,
  GoodsId.AIRCRAFT_PARTS,
  GoodsId.SOLAR_PANEL,
  GoodsId.WIND_BLADE,
  GoodsId.SOLAR_SYSTEM,
  GoodsId.ENERGY_STORAGE,
  GoodsId.INDUSTRIAL_ROBOT,
  GoodsId.BUILDING_PRODUCTS,
  GoodsId.PACKAGING,
];

const INSTITUTIONAL_DEMAND_RATE = 0.18;
const INSTITUTIONAL_MAX_PREMIUM_RATIO = 1.65;
const INSTITUTIONAL_MIN_TRADE_QUANTITY = 1;
const INSTITUTIONAL_PRICE_SENSITIVITY = 0.2;

function accumulatePurchaseSummary(
  summary: MarketConsumptionSummary,
  result: ConsumerPurchaseResult,
): void {
  if (result.quantity <= 0) {
    return;
  }

  summary.totalPurchases++;
  summary.totalSpent += result.totalSpent;
  summary.totalQuantity += result.quantity;
  summary.purchasesByGoods.set(result.goodsId, result);
}

function getRetailServedGoods(world: GameWorld): Set<number> {
  const servedGoods = new Set<number>();

  if (!world.retail || world.retail.count <= 0) {
    return servedGoods;
  }

  for (let retailId = 0; retailId < world.retail.count; retailId++) {
    const buildingId = world.retail.buildingIds[retailId];
    const buildingType = world.buildings.types[buildingId];
    const retailConfig = getRetailConfig(buildingType);
    if (!retailConfig) continue;

    for (const goodsId of retailConfig.allowedGoodsIds) {
      const inventoryIdx = retailId * GOODS_COUNT + goodsId;
      if (world.retail.inventories[inventoryIdx] > 0) {
        servedGoods.add(goodsId);
      }
    }
  }

  return servedGoods;
}

/**
 * 零售是否可服务消费者
 * 规则：至少有一家已注册零售店在可售商品中存在库存
 */
export function canRetailServeConsumers(world: GameWorld): boolean {
  return getRetailServedGoods(world).size > 0;
}

/**
 * 执行消费者市场购买
 * 性能优化：使用间隔执行和商品分批处理
 *
 * 重要：当零售系统启用时，Pop消费通过零售店进行
 */
export function executeConsumerPurchases(
  world: GameWorld,
  config: ConsumerBuyConfig = DEFAULT_CONFIG
): MarketConsumptionSummary {
  const currentTick = world.tick;
  
  // 性能优化：消费者购买每N个tick执行一次
  const shouldExecuteConsumer = currentTick % config.executionInterval === 0;
  // B2B采购使用独立的间隔，错峰执行（偏移2个tick）
  const shouldExecuteB2B = (currentTick + 2) % config.b2bExecutionInterval === 0;
  
  // 如果两者都不需要执行，返回空结果
  if (!shouldExecuteConsumer && !shouldExecuteB2B) {
    return EMPTY_SUMMARY;
  }
  
  const summary: MarketConsumptionSummary = {
    totalPurchases: 0,
    totalSpent: 0,
    totalQuantity: 0,
    purchasesByGoods: new Map(),
    b2bPurchases: 0,
    b2bSpent: 0,
    b2bQuantity: 0,
  };
  
  // 1. 处理消费者购买
  if (shouldExecuteConsumer) {
    const servedByRetail = getRetailServedGoods(world);

    // 商品分组处理，每次只处理一组
    const groupIndex = (currentTick / config.executionInterval) % config.goodsBatchGroups;
    const goodsToProcess = CONSUMER_GOODS.filter(
      (_, idx) => idx % config.goodsBatchGroups === groupIndex
    );
    
    for (const goods of goodsToProcess) {
      // 零售系统当前能承接的商品交给零售，未覆盖或断货商品回退到直购市场
      if (servedByRetail.has(goods.id)) {
        continue;
      }

      // 调整消费量以补偿分组（每组处理goodsBatchGroups倍的量）
      const adjustedConfig = {
        ...config,
        consumptionRatePerTick: config.consumptionRatePerTick * config.goodsBatchGroups,
      };
      const result = purchaseGoodsForConsumers(world, goods, adjustedConfig);

      accumulatePurchaseSummary(summary, result);
    }

    const institutionalGoodsToProcess = INSTITUTIONAL_GOODS.filter(
      (_, idx) => idx % config.goodsBatchGroups === groupIndex
    );

    for (const goodsId of institutionalGoodsToProcess) {
      const goods = GOODS_BY_ID.get(goodsId);
      if (!goods) continue;

      const result = purchaseGoodsForInstitutions(world, goods, config);
      accumulatePurchaseSummary(summary, result);
    }
  }
  
  // 2. 处理企业B2B采购（原材料和中间品）- 错峰执行
  if (shouldExecuteB2B) {
    const b2bResult = executeB2BPurchases(world, config);
    summary.b2bPurchases = b2bResult.totalPurchases;
    summary.b2bSpent = b2bResult.totalSpent;
    summary.b2bQuantity = b2bResult.totalQuantity;
    
    // 合并B2B结果到总计
    summary.totalPurchases += b2bResult.totalPurchases;
    summary.totalSpent += b2bResult.totalSpent;
    summary.totalQuantity += b2bResult.totalQuantity;
  }
  
  return summary;
}

/**
 * 执行企业B2B采购
 * 根据生产需求，企业从市场采购原材料和中间品
 *
 * 【性能优化】将建筑分组处理，每次只处理一组
 */
function executeB2BPurchases(
  world: GameWorld,
  config: ConsumerBuyConfig
): { totalPurchases: number; totalSpent: number; totalQuantity: number } {
  let totalPurchases = 0;
  let totalSpent = 0;
  let totalQuantity = 0;
  
  const c = world.companies;
  const b = world.buildings;
  
  // 【性能优化】建筑分组处理，每次只处理一组
  const currentTick = world.tick;
  const groupIndex = Math.floor(currentTick / config.b2bExecutionInterval) % config.b2bBuildingBatchGroups;
  
  // 遍历当前组的建筑，计算原材料需求
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    // 【性能优化】只处理当前组的建筑
    if (buildingId % config.b2bBuildingBatchGroups !== groupIndex) continue;
    if (!b.isActive[buildingId]) continue;
    
    const companyId = b.owners[buildingId];
    const buildingTypeId = b.types[buildingId];
    const outputModeId = b.outputModeIds[buildingId];
    // 使用getBuildingProduction替代RECIPES
    const production = getBuildingProduction(buildingTypeId, outputModeId);
    
    if (!production) continue;
    
    const inputs = production.inputs || [];
    // 遍历生产配置的每个输入
    for (const input of inputs) {
      const goodsId = input.goodsId;
      const neededPerCycle = input.amount;
      
      // 检查当前库存
      const currentStock = c.inventories[companyId * GOODS_COUNT + goodsId];
      
      // 如果库存不足8个周期的用量，需要采购（从5提升到8，更积极采购）
      if (currentStock < neededPerCycle * 8) {
        // 计算采购量（补充到15个周期的用量，从10提升到15）
        const targetStock = neededPerCycle * 15;
        const buyQuantity = Math.min(targetStock - currentStock, 2000);  // 提高单次采购上限到2000
        
        if (buyQuantity > 1) {
          // 从市场购买
          const result = purchaseFromMarketForCompany(
            world,
            companyId,
            goodsId,
            buyQuantity,
            config
          );
          
          if (result.quantity > 0) {
            totalPurchases++;
            totalSpent += result.totalSpent;
            totalQuantity += result.quantity;
          }
        }
      }
    }
  }
  
  return { totalPurchases, totalSpent, totalQuantity };
}

/**
 * 为企业从市场购买商品
 * 企业会接受市场上合理价格的卖单
 */
function purchaseFromMarketForCompany(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  targetQuantity: number,
  config: ConsumerBuyConfig
): ConsumerPurchaseResult {
  // 使用预计算的Map进行O(1)查找（替代O(n)的ALL_GOODS.find）
  const goods = GOODS_BY_ID.get(goodsId);
  if (!goods) {
    return { goodsId, quantity: 0, totalSpent: 0, avgPrice: 0, ordersConsumed: 0 };
  }
  
  const basePrice = goods.basePrice;
  const c = world.companies;
  
  // 企业愿意支付更高溢价（因为是生产必需品）
  const maxAcceptablePrice = basePrice * 1.5;  // 最多150%基准价
  
  // 检查企业资金
  const availableCash = c.cash[companyId];
  if (availableCash < basePrice * targetQuantity * 0.5) {
    // 资金不足，减少采购量
    targetQuantity = Math.floor(availableCash / basePrice * 0.3);
  }
  
  if (targetQuantity < 1) {
    return { goodsId, quantity: 0, totalSpent: 0, avgPrice: 0, ordersConsumed: 0 };
  }
  
  // 获取市场卖单
  const orderBook = getOrderBookView(world, goodsId);
  const sellOrders = orderBook.sellOrders;
  
  if (sellOrders.length === 0) {
    return { goodsId, quantity: 0, totalSpent: 0, avgPrice: 0, ordersConsumed: 0 };
  }
  
  let remainingQuantity = targetQuantity;
  let totalSpent = 0;
  let totalQuantityBought = 0;
  let ordersConsumed = 0;
  
  for (const sellOrder of sellOrders) {
    if (remainingQuantity <= 0) break;
    
    // 不买自己公司的订单
    if (sellOrder.companyId === companyId) continue;
    
    // 检查价格
    if (sellOrder.price > maxAcceptablePrice) continue;
    
    // 检查资金
    const maxAffordable = Math.floor((c.cash[companyId] - totalSpent) / sellOrder.price);
    if (maxAffordable < 1) break;
    
    const buyQuantity = Math.min(
      remainingQuantity,
      sellOrder.remaining,
      maxAffordable
    );
    
    if (buyQuantity >= 1) {
      // 执行企业采购
      const result = executeCompanyPurchase(
        world,
        companyId,
        goodsId,
        sellOrder,
        buyQuantity
      );
      
      if (result.success) {
        totalSpent += result.cost;
        totalQuantityBought += result.quantity;
        remainingQuantity -= result.quantity;
        ordersConsumed++;
      }
    }
  }
  
  return {
    goodsId,
    quantity: totalQuantityBought,
    totalSpent,
    avgPrice: totalQuantityBought > 0 ? totalSpent / totalQuantityBought : 0,
    ordersConsumed,
  };
}

/**
 * 执行企业采购（企业间B2B交易）
 */
function executeCompanyPurchase(
  world: GameWorld,
  buyerCompanyId: number,
  goodsId: number,
  sellOrder: OrderView,
  quantity: number
): { success: boolean; quantity: number; cost: number } {
  const o = world.orders;
  const c = world.companies;
  
  const orderIdx = sellOrder.idx;
  
  // 验证订单有效
  if (!o.isActive[orderIdx] || o.remainings[orderIdx] <= 0) {
    return { success: false, quantity: 0, cost: 0 };
  }
  
  const actualQuantity = Math.min(quantity, o.remainings[orderIdx]);
  if (actualQuantity < 0.01) {
    return { success: false, quantity: 0, cost: 0 };
  }
  
  const price = o.prices[orderIdx];
  const totalCost = actualQuantity * price;
  const sellCompanyId = o.companyIds[orderIdx];
  
  // 检查买方资金
  if (c.cash[buyerCompanyId] < totalCost) {
    return { success: false, quantity: 0, cost: 0 };
  }
  
  // ====== 执行B2B交易 ======
  
  // 1. 买方支付资金
  c.cash[buyerCompanyId] -= totalCost;
  
  // 2. 买方获得商品
  const buyInvIdx = buyerCompanyId * GOODS_COUNT + goodsId;
  c.inventories[buyInvIdx] += actualQuantity;
  
  // 3. 卖方获得资金
  c.cash[sellCompanyId] += totalCost;
  
  // 4. 卖方减少库存和预留
  const sellInvIdx = sellCompanyId * GOODS_COUNT + goodsId;
  o.remainings[orderIdx] -= actualQuantity;
  c.inventoryReserved[sellInvIdx] -= actualQuantity;
  c.inventories[sellInvIdx] -= actualQuantity;
  
  // 5. 更新供需数据
  world.goods.supplies[goodsId] += actualQuantity;
  world.goods.demands[goodsId] += actualQuantity;
  
  recordTrade(world, {
    buyOrderId: -1,
    sellOrderId: orderIdx,
    buyCompanyId: buyerCompanyId,
    sellCompanyId,
    goodsId,
    quantity: actualQuantity,
    price,
    tick: world.tick,
  });
  
  // 8. 如果订单完全成交，标记为非激活
  if (o.remainings[orderIdx] <= 0) {
    finalizeFilledOrder(world, orderIdx);
  }
  
  return {
    success: true,
    quantity: actualQuantity,
    cost: totalCost,
  };
}

/**
 * 为消费者购买特定商品
 */
function purchaseGoodsForConsumers(
  world: GameWorld,
  goods: GoodsDefinition,
  config: ConsumerBuyConfig
): ConsumerPurchaseResult {
  const goodsId = goods.id;
  const currentDemand = world.goods.demands[goodsId];

  return purchaseGoodsForDemandSegment(
    world,
    goods,
    currentDemand * config.consumptionRatePerTick,
    config.maxPremiumRatio,
    config.minTradeQuantity,
    config.priceSensitivity,
  );
}

function purchaseGoodsForInstitutions(
  world: GameWorld,
  goods: GoodsDefinition,
  config: ConsumerBuyConfig,
): ConsumerPurchaseResult {
  const currentDemand = world.goods.demands[goods.id];

  return purchaseGoodsForDemandSegment(
    world,
    goods,
    currentDemand * Math.min(config.consumptionRatePerTick, INSTITUTIONAL_DEMAND_RATE),
    INSTITUTIONAL_MAX_PREMIUM_RATIO,
    INSTITUTIONAL_MIN_TRADE_QUANTITY,
    INSTITUTIONAL_PRICE_SENSITIVITY,
  );
}

function purchaseGoodsForDemandSegment(
  world: GameWorld,
  goods: GoodsDefinition,
  targetQuantity: number,
  maxPremiumRatio: number,
  minTradeQuantity: number,
  priceSensitivity: number,
): ConsumerPurchaseResult {
  const goodsId = goods.id;
  const basePrice = goods.basePrice;

  if (targetQuantity < minTradeQuantity) {
    return {
      goodsId,
      quantity: 0,
      totalSpent: 0,
      avgPrice: 0,
      ordersConsumed: 0,
    };
  }

  const maxAcceptablePrice = basePrice * maxPremiumRatio;
  const orderBook = getOrderBookView(world, goodsId);
  const sellOrders = orderBook.sellOrders;

  if (sellOrders.length === 0) {
    return {
      goodsId,
      quantity: 0,
      totalSpent: 0,
      avgPrice: 0,
      ordersConsumed: 0,
    };
  }

  let remainingQuantity = targetQuantity;
  let totalSpent = 0;
  let totalQuantity = 0;
  let ordersConsumed = 0;

  for (const sellOrder of sellOrders) {
    if (remainingQuantity <= 0) break;

    if (sellOrder.price > maxAcceptablePrice) {
      continue;
    }

    const priceRatio = sellOrder.price / basePrice;
    const purchaseWillingness = calculatePurchaseWillingness(priceRatio, priceSensitivity);
    const adjustedQuantity = Math.min(
      remainingQuantity * purchaseWillingness,
      sellOrder.remaining
    );

    if (adjustedQuantity < minTradeQuantity) {
      continue;
    }

    const purchaseResult = executeOrderPurchase(
      world,
      goodsId,
      sellOrder,
      adjustedQuantity
    );

    if (purchaseResult.success) {
      totalSpent += purchaseResult.cost;
      totalQuantity += purchaseResult.quantity;
      remainingQuantity -= purchaseResult.quantity;
      ordersConsumed++;
    }
  }

  return {
    goodsId,
    quantity: totalQuantity,
    totalSpent,
    avgPrice: totalQuantity > 0 ? totalSpent / totalQuantity : 0,
    ordersConsumed,
  };
}

/**
 * 计算购买意愿
 * @param priceRatio 当前价格/基准价格
 * @param sensitivity 价格敏感度
 * @returns 0-1之间的购买意愿系数
 */
function calculatePurchaseWillingness(priceRatio: number, sensitivity: number): number {
  // 价格等于基准价时，意愿为1
  // 价格越高，意愿越低
  // 价格越低，意愿越高（但有上限）
  
  if (priceRatio <= 0.8) {
    // 折扣20%以上，抢购
    return 1.5;
  } else if (priceRatio <= 1.0) {
    // 折扣，高意愿
    return 1.0 + (1 - priceRatio) * 0.5;
  } else if (priceRatio <= 1.1) {
    // 轻微溢价，正常意愿
    return 1.0 - (priceRatio - 1) * sensitivity;
  } else {
    // 溢价较高，意愿下降
    return Math.max(0.1, 1.0 - (priceRatio - 1) * sensitivity * 2);
  }
}

/**
 * 执行订单购买（消费者吃掉卖单）
 */
function executeOrderPurchase(
  world: GameWorld,
  goodsId: number,
  sellOrder: OrderView,
  quantity: number
): { success: boolean; quantity: number; cost: number } {
  const o = world.orders;
  const c = world.companies;
  
  const orderIdx = sellOrder.idx;
  
  // 验证订单仍然有效
  if (!o.isActive[orderIdx] || o.remainings[orderIdx] <= 0) {
    return { success: false, quantity: 0, cost: 0 };
  }
  
  // 实际可购买量
  let actualQuantity = Math.min(quantity, o.remainings[orderIdx]);
  if (actualQuantity < 0.01) {
    return { success: false, quantity: 0, cost: 0 };
  }

  const price = o.prices[orderIdx];
  let totalCost = actualQuantity * price;
  const sellCompanyId = o.companyIds[orderIdx];

  // 闭合货币循环：消费者购买从家庭资金池扣款
  const householdCash = world.households.cash[0];
  if (totalCost > householdCash) {
    const affordableQty = Math.floor(householdCash / price * 100) / 100;
    if (affordableQty < 0.01) {
      return { success: false, quantity: 0, cost: 0 };
    }
    actualQuantity = affordableQty;
    totalCost = actualQuantity * price;
  }
  world.households.cash[0] -= totalCost;
  world.households.totalConsumptionSpent += totalCost;

  // ====== 执行交易 ======

  // 1. 卖方获得资金
  c.cash[sellCompanyId] += totalCost;
  
  // 2. 卖方释放冻结库存并减少库存（商品被消费者买走）
  const sellInvIdx = sellCompanyId * GOODS_COUNT + goodsId;
  o.remainings[orderIdx] -= actualQuantity;
  c.inventoryReserved[sellInvIdx] -= actualQuantity;
  c.inventories[sellInvIdx] -= actualQuantity;
  
  // 3. 商品被消费（不进入任何库存，而是从市场消失）
  // 这模拟了最终消费者购买并使用商品
  
  // 4. 更新供给数据（商品被消费，供给减少）
  world.goods.supplies[goodsId] += actualQuantity;
  
  recordTrade(world, {
    buyOrderId: TradeOrderRef.CONSUMER_DIRECT,
    sellOrderId: orderIdx,
    buyCompanyId: TradePartyRef.CONSUMER_MARKET,
    sellCompanyId,
    goodsId,
    quantity: actualQuantity,
    price,
    tick: world.tick,
  });
  
  // 7. 如果订单完全成交，标记为非激活
  if (o.remainings[orderIdx] <= 0) {
    finalizeFilledOrder(world, orderIdx);
  }
  
  return {
    success: true,
    quantity: actualQuantity,
    cost: totalCost,
  };
}

/**
 * 获取消费者市场统计
 */
export function getConsumerMarketStats(world: GameWorld): {
  totalDemand: number;
  topDemandGoods: Array<{ goodsId: number; name: string; demand: number }>;
  avgPriceVsBase: number;
} {
  let totalDemand = 0;
  const demandByGoods: Array<{ goodsId: number; name: string; demand: number }> = [];
  let totalPriceRatio = 0;
  let priceCount = 0;
  
  for (const goods of CONSUMER_GOODS) {
    const demand = world.goods.demands[goods.id];
    totalDemand += demand;
    demandByGoods.push({
      goodsId: goods.id,
      name: goods.name,
      demand,
    });
    
    const currentPrice = world.goods.prices[goods.id];
    if (currentPrice > 0 && goods.basePrice > 0) {
      totalPriceRatio += currentPrice / goods.basePrice;
      priceCount++;
    }
  }
  
  demandByGoods.sort((a, b) => b.demand - a.demand);
  
  return {
    totalDemand,
    topDemandGoods: demandByGoods.slice(0, 10),
    avgPriceVsBase: priceCount > 0 ? totalPriceRatio / priceCount : 1,
  };
}

/**
 * 获取指定商品的消费潜力
 * 用于AI决策参考
 */
export function getGoodsConsumptionPotential(
  world: GameWorld,
  goodsId: number
): {
  demand: number;
  marketPrice: number;
  basePrice: number;
  priceRatio: number;
  sellOrdersCount: number;
  sellOrdersVolume: number;
  estimatedDailyConsumption: number;
} {
  // 使用预计算的Map进行O(1)查找（替代O(n)的ALL_GOODS.find）
  const goods = GOODS_BY_ID.get(goodsId);
  if (!goods) {
    return {
      demand: 0,
      marketPrice: 0,
      basePrice: 0,
      priceRatio: 1,
      sellOrdersCount: 0,
      sellOrdersVolume: 0,
      estimatedDailyConsumption: 0,
    };
  }
  
  const demand = world.goods.demands[goodsId];
  const marketPrice = world.goods.prices[goodsId];
  const basePrice = goods.basePrice;
  
  const orderBook = getOrderBookView(world, goodsId);
  const sellOrdersVolume = orderBook.sellOrders.reduce((sum, o) => sum + o.remaining, 0);
  
  return {
    demand,
    marketPrice,
    basePrice,
    priceRatio: basePrice > 0 ? marketPrice / basePrice : 1,
    sellOrdersCount: orderBook.sellOrders.length,
    sellOrdersVolume,
    estimatedDailyConsumption: demand * DEFAULT_CONFIG.consumptionRatePerTick * 24,
  };
}

export { DEFAULT_CONFIG as CONSUMER_MARKET_CONFIG };
