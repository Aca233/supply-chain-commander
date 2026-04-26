/**
 * 股票交易系统
 * 实现公司股票的IPO、交易和估值
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT } from '@/core/constants';

/**
 * 股票信息
 */
export interface Stock {
  companyId: number;
  ticker: string;                  // 股票代码
  name: string;                    // 公司名称
  
  // 股本结构
  totalShares: number;             // 总股数
  outstandingShares: number;       // 流通股数
  treasuryShares: number;          // 库存股
  
  // 价格信息
  currentPrice: number;            // 当前股价
  openPrice: number;               // 开盘价
  highPrice: number;               // 最高价
  lowPrice: number;                // 最低价
  previousClose: number;           // 昨收价
  
  // 交易数据
  volume: number;                  // 日成交量
  totalVolume: number;             // 累计成交量
  turnoverRate: number;            // 换手率
  
  // 估值指标
  marketCap: number;               // 市值
  bookValue: number;               // 净资产
  earningsPerShare: number;        // 每股收益
  priceToEarnings: number;         // 市盈率
  priceToBook: number;             // 市净率
  dividendYield: number;           // 股息率
  
  // 状态
  isListed: boolean;               // 是否上市
  isTradable: boolean;             // 是否可交易
  listingDate: number;             // 上市时间（tick）
}

/**
 * 股票订单
 */
export interface StockOrder {
  id: number;
  companyId: number;               // 下单公司
  stockCompanyId: number;          // 目标股票公司
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  limitPrice?: number;
  createdTick: number;
  status: 'pending' | 'filled' | 'partial' | 'cancelled';
  filledQuantity: number;
  avgPrice: number;
}

/**
 * 持股记录
 */
export interface Holding {
  ownerCompanyId: number;
  stockCompanyId: number;
  shares: number;
  avgCost: number;                 // 平均成本
  unrealizedGain: number;          // 未实现收益
}

/**
 * 公司历史财务数据（用于计算业绩变化）
 */
export interface CompanyHistoryData {
  lastCash: number;
  lastNetWorth: number;
  lastUpdateTick: number;
}

export type IPOFailureReason =
  | 'already_listed'
  | 'invalid_price'
  | 'price_out_of_range'
  | 'share_count_out_of_range'
  | 'insufficient_demand';

export interface IPOOfferPreview {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  minShares: number;
  maxShares: number;
  estimatedDemand: number;
  shortfallShares: number;
  canLaunch: boolean;
  message: string;
}

export interface IPOResult extends IPOOfferPreview {
  success: boolean;
  reason?: IPOFailureReason;
  subscribedShares: number;
}

/**
 * 股票市场状态
 */
export interface StockMarketState {
  stocks: Map<number, Stock>;
  orders: StockOrder[];
  holdings: Map<string, Holding>; // key: `${ownerCompanyId}-${stockCompanyId}`
  nextOrderId: number;
  marketOpen: boolean;
  lastUpdateTick: number;
  
  // 市场指数
  marketIndex: number;
  marketIndexChange: number;
  totalMarketCap: number;
  totalVolume: number;
  
  // 公司历史数据（用于计算业绩变化驱动股价）
    companyHistory: Map<number, CompanyHistoryData>;
    
    // 估值缓存（避免重复计算）
    valuationCache: Map<number, {
      bookValue: number;
      intrinsicValue: number;
      marketValue: number;
      cachedTick: number;
    }>;
  }
  
  // 全局股票市场状态
let stockMarket: StockMarketState = {
  stocks: new Map(),
  orders: [],
  holdings: new Map(),
  nextOrderId: 1,
  marketOpen: true,
  lastUpdateTick: 0,
  marketIndex: 1000,
  marketIndexChange: 0,
  totalMarketCap: 0,
  totalVolume: 0,
  companyHistory: new Map(),
  valuationCache: new Map(),
};

const IPO_MIN_SHARE_RATIO = 0.1;
const IPO_MAX_SHARE_RATIO = 0.6;
const IPO_MIN_PRICE_MULTIPLIER = 0.5;
const IPO_MAX_PRICE_MULTIPLIER = 2;

interface IPOAssessment extends IPOOfferPreview {
  stock: Stock;
  subscriptions: Array<{ aiId: number; shares: number; cost: number }>;
}

/**
 * 初始化股票市场
 *
 * 修复：让AI公司互相持有股票，确保市场有流动性
 */
export function initializeStockMarket(world: GameWorld): void {
  stockMarket = {
    stocks: new Map(),
    orders: [],
    holdings: new Map(),
    nextOrderId: 1,
    marketOpen: true,
    lastUpdateTick: world.tick,
    marketIndex: 1000,
    marketIndexChange: 0,
    totalMarketCap: 0,
    totalVolume: 0,
    companyHistory: new Map(),
    valuationCache: new Map(),
  };
  
  // 第一遍：为每个AI公司创建股票
  const aiCompanyIds: number[] = [];
  for (let i = 1; i < world.companies.count; i++) {
    if (world.companies.isAI[i]) {
      aiCompanyIds.push(i);
      const stock = createStock(world, i);
      stockMarket.stocks.set(i, stock);
      
      // 初始化公司历史数据
      const { bookValue } = calculateValuation(world, i);
      stockMarket.companyHistory.set(i, {
        lastCash: world.companies.cash[i],
        lastNetWorth: bookValue,
        lastUpdateTick: world.tick,
      });
    }
  }
  
  // 第二遍：分配持股
  // 设计：每家公司自持50%，其他AI公司共持30%（流通），剩余20%待IPO认购
  for (const companyId of aiCompanyIds) {
    const stock = stockMarket.stocks.get(companyId);
    if (!stock) continue;
    
    // 1. 自持50%
    const selfShares = Math.floor(stock.totalShares * 0.50);
    const selfHolding: Holding = {
      ownerCompanyId: companyId,
      stockCompanyId: companyId,
      shares: selfShares,
      avgCost: stock.currentPrice,
      unrealizedGain: 0,
    };
    stockMarket.holdings.set(`${companyId}-${companyId}`, selfHolding);
    
    // 2. 分配30%给其他AI公司（确保市场有卖方）
    const distributedShares = Math.floor(stock.totalShares * 0.30);
    const otherCompanies = aiCompanyIds.filter(id => id !== companyId);
    
    if (otherCompanies.length > 0) {
      // 每家公司分配的股份数量（平均分配）
      const sharesPerCompany = Math.floor(distributedShares / Math.min(otherCompanies.length, 10));
      
      // 只分配给最多10家公司，避免持股太分散
      const recipients = otherCompanies.slice(0, 10);
      
      for (const recipientId of recipients) {
        if (sharesPerCompany >= 100) { // 至少100股
          const holdingKey = `${recipientId}-${companyId}`;
          const existingHolding = stockMarket.holdings.get(holdingKey);
          
          if (existingHolding) {
            existingHolding.shares += sharesPerCompany;
          } else {
            const holding: Holding = {
              ownerCompanyId: recipientId,
              stockCompanyId: companyId,
              shares: sharesPerCompany,
              avgCost: stock.currentPrice,
              unrealizedGain: 0,
            };
            stockMarket.holdings.set(holdingKey, holding);
          }
        }
      }
    }
    
    // 3. 剩余20%作为可认购的流通股（stock.outstandingShares已设定为40%）
  }
  
  console.log(`[StockMarket] 初始化完成: ${aiCompanyIds.length}家公司上市, ${stockMarket.holdings.size}个持股记录`);
}

/**
 * 创建股票
 */
function createStock(world: GameWorld, companyId: number): Stock {
  const name = world.companies.names[companyId] || `公司#${companyId}`;
  const ticker = generateTicker(name);
  
  // 计算公司价值（确保数值有效）
  const cash = world.companies.cash[companyId] || 0;
  let inventoryValue = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    const invQty = world.companies.inventories[companyId * GOODS_COUNT + i] || 0;
    const price = world.goods.prices[i] || 0;
    if (isFinite(invQty) && isFinite(price)) {
      inventoryValue += invQty * price;
    }
  }
  
  // 统计建筑资产
  let buildingValue = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      buildingValue += 500000; // 简化估值
    }
  }
  
  // 确保所有值有效
  const validCash = isFinite(cash) ? cash : 0;
  const validInventory = isFinite(inventoryValue) ? inventoryValue : 0;
  const validBuilding = isFinite(buildingValue) ? buildingValue : 0;
  const bookValue = validCash + validInventory + validBuilding;
  
  // 股本设计
  const totalShares = 1000000; // 100万股
  const outstandingShares = totalShares * 0.4; // 40%流通
  
  // 初始定价（确保最低价格为1）
  let initialPrice = bookValue / totalShares * 1.5; // 1.5倍市净率
  if (!isFinite(initialPrice) || initialPrice <= 0) {
    initialPrice = 10; // 默认价格10元
  }
  
  return {
    companyId,
    ticker,
    name,
    totalShares,
    outstandingShares,
    treasuryShares: 0,
    currentPrice: initialPrice,
    openPrice: initialPrice,
    highPrice: initialPrice,
    lowPrice: initialPrice,
    previousClose: initialPrice,
    volume: 0,
    totalVolume: 0,
    turnoverRate: 0,
    marketCap: initialPrice * totalShares,
    bookValue,
    earningsPerShare: 0,
    priceToEarnings: 15, // 默认15倍PE
    priceToBook: 1.5,
    dividendYield: 0.02, // 2%股息
    isListed: true,
    isTradable: true,
    listingDate: world.tick,
  };
}

/**
 * 生成股票代码
 */
function generateTicker(name: string): string {
  // 简化：取首字母
  const letters = name.substring(0, 4).toUpperCase();
  return letters.padEnd(4, 'X');
}

/**
 * 计算公司估值（带缓存优化）
 *
 * 性能优化：缓存估值结果，同一tick内不重复计算
 */
export function calculateValuation(world: GameWorld, companyId: number): {
  bookValue: number;
  intrinsicValue: number;
  marketValue: number;
} {
  // 检查缓存
  const cached = stockMarket.valuationCache.get(companyId);
  if (cached && cached.cachedTick === world.tick) {
    return {
      bookValue: cached.bookValue,
      intrinsicValue: cached.intrinsicValue,
      marketValue: cached.marketValue,
    };
  }
  
  const cash = world.companies.cash[companyId] || 0;
  
  let inventoryValue = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    const qty = world.companies.inventories[companyId * GOODS_COUNT + i] || 0;
    const price = world.goods.prices[i] || 0;
    if (isFinite(qty) && isFinite(price)) {
      inventoryValue += qty * price;
    }
  }
  
  let buildingValue = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      buildingValue += 500000;
    }
  }
  
  // 确保所有值有效
  const validCash = isFinite(cash) ? cash : 0;
  const validInventory = isFinite(inventoryValue) ? inventoryValue : 0;
  const validBuilding = isFinite(buildingValue) ? buildingValue : 0;
  const bookValue = validCash + validInventory + validBuilding;
  
  // 内在价值 = 账面价值 + 未来盈利折现
  const estimatedEarnings = bookValue * 0.1; // 假设10%ROE
  const intrinsicValue = bookValue + estimatedEarnings * 10; // 10年DCF简化
  
  // 市场价值
  const stock = stockMarket.stocks.get(companyId);
  let marketValue = stock ? stock.marketCap : bookValue;
  if (!isFinite(marketValue) || marketValue <= 0) {
    marketValue = bookValue > 0 ? bookValue : 1000000; // 默认100万
  }
  
  const result = {
    bookValue: isFinite(bookValue) ? bookValue : 0,
    intrinsicValue: isFinite(intrinsicValue) ? intrinsicValue : bookValue,
    marketValue
  };
  
  // 更新缓存
  stockMarket.valuationCache.set(companyId, {
    ...result,
    cachedTick: world.tick,
  });
  
  return result;
}

/**
 * 下单买入股票
 *
 * 优化：市价单直接从AI持股中购买，确保即时成交
 */
export function buyStock(
  world: GameWorld,
  buyerCompanyId: number,
  stockCompanyId: number,
  quantity: number,
  orderType: 'market' | 'limit',
  limitPrice?: number
): number | null {
  const stock = stockMarket.stocks.get(stockCompanyId);
  if (!stock || !stock.isTradable) {
    console.log(`[StockMarket] 买入失败: 股票不存在或不可交易 companyId=${stockCompanyId}`);
    return null;
  }
  
  const tradePrice = limitPrice || stock.currentPrice;
  const estimatedCost = tradePrice * quantity;
  
  if (world.companies.cash[buyerCompanyId] < estimatedCost) {
    console.log(`[StockMarket] 买入失败: 资金不足 需要=${estimatedCost} 拥有=${world.companies.cash[buyerCompanyId]}`);
    return null; // 资金不足
  }
  
  // 市价单：尝试即时成交
  if (orderType === 'market') {
    // 查找可用的卖方（AI公司持股）
    let remainingQuantity = quantity;
    let totalCost = 0;
    let filledQuantity = 0;
    
    // 遍历所有持股，找到可以卖出的
    for (const [key, holding] of stockMarket.holdings) {
      if (holding.stockCompanyId !== stockCompanyId) continue;
      if (holding.ownerCompanyId === buyerCompanyId) continue; // 不能自己买自己
      if (holding.ownerCompanyId === stockCompanyId) continue; // 公司自持股不卖
      if (holding.shares <= 0) continue;
      
      // 计算可以购买的数量
      const availableShares = Math.min(holding.shares, remainingQuantity);
      const cost = availableShares * tradePrice;
      
      // 执行交易
      holding.shares -= availableShares;
      if (holding.shares <= 0) {
        stockMarket.holdings.delete(key);
      }
      
      // 更新买方持股
      updateHoldings(world, buyerCompanyId, stockCompanyId, availableShares, tradePrice);
      
      // 转移资金
      world.companies.cash[buyerCompanyId] -= cost;
      world.companies.cash[holding.ownerCompanyId] += cost;
      
      totalCost += cost;
      filledQuantity += availableShares;
      remainingQuantity -= availableShares;
      
      // 更新交易量（日成交量和累计成交量）
      stock.volume += availableShares;
      stock.totalVolume += availableShares;
      
      if (remainingQuantity <= 0) break;
    }
    
    if (filledQuantity > 0) {
      // 更新股价（基于成交价）
      stock.currentPrice = tradePrice;
      stock.marketCap = stock.currentPrice * stock.totalShares;
      stock.highPrice = Math.max(stock.highPrice, tradePrice);
      stock.lowPrice = Math.min(stock.lowPrice, tradePrice);
      
      console.log(`[StockMarket] 市价买入成交: ${filledQuantity}股 @ ¥${tradePrice.toFixed(2)}`);
      
      // 返回一个虚拟订单ID表示成功
      return stockMarket.nextOrderId++;
    }
    
    // 如果没有可用卖方，创建挂单等待
    console.log(`[StockMarket] 市价买入: 无可用卖方，创建挂单`);
  }
  
  // 限价单或市价单无法即时成交：创建挂单
  const order: StockOrder = {
    id: stockMarket.nextOrderId++,
    companyId: buyerCompanyId,
    stockCompanyId,
    type: 'buy',
    orderType,
    quantity,
    limitPrice,
    createdTick: world.tick,
    status: 'pending',
    filledQuantity: 0,
    avgPrice: 0,
  };
  
  stockMarket.orders.push(order);
  
  // 预留资金
  world.companies.cash[buyerCompanyId] -= estimatedCost;
  
  return order.id;
}

/**
 * 下单卖出股票
 */
export function sellStock(
  world: GameWorld,
  sellerCompanyId: number,
  stockCompanyId: number,
  quantity: number,
  orderType: 'market' | 'limit',
  limitPrice?: number
): number | null {
  const stock = stockMarket.stocks.get(stockCompanyId);
  if (!stock || !stock.isTradable) return null;
  
  // 检查持股
  const holdingKey = `${sellerCompanyId}-${stockCompanyId}`;
  const holding = stockMarket.holdings.get(holdingKey);
  if (!holding || holding.shares < quantity) {
    return null; // 持股不足
  }
  
  const order: StockOrder = {
    id: stockMarket.nextOrderId++,
    companyId: sellerCompanyId,
    stockCompanyId,
    type: 'sell',
    orderType,
    quantity,
    limitPrice,
    createdTick: world.tick,
    status: 'pending',
    filledQuantity: 0,
    avgPrice: 0,
  };
  
  stockMarket.orders.push(order);
  
  return order.id;
}

/**
 * 撮合股票交易
 *
 * 优化版本：
 * 1. 使用订单索引避免重复遍历
 * 2. 价格优先、时间优先排序
 * 3. 利用排序特性提前终止无效匹配
 */
export function matchStockOrders(world: GameWorld): void {
  const stocks = stockMarket.stocks;
  
  // 预构建订单索引：按股票分组的买卖订单
  const orderIndex = new Map<number, { buyOrders: StockOrder[]; sellOrders: StockOrder[] }>();
  
  // 单次遍历所有订单构建索引
  for (const order of stockMarket.orders) {
    if (order.status !== 'pending' && order.status !== 'partial') continue;
    
    if (!orderIndex.has(order.stockCompanyId)) {
      orderIndex.set(order.stockCompanyId, { buyOrders: [], sellOrders: [] });
    }
    
    const index = orderIndex.get(order.stockCompanyId)!;
    if (order.type === 'buy') {
      index.buyOrders.push(order);
    } else {
      index.sellOrders.push(order);
    }
  }
  
  // 对每只有订单的股票进行撮合
  for (const [companyId, orders] of orderIndex) {
    const stock = stocks.get(companyId);
    if (!stock) continue;
    
    // 排序：买单按价格降序（高价优先），卖单按价格升序（低价优先）
    // 时间优先通过ID实现（先下单的ID更小）
    orders.buyOrders.sort((a, b) => {
      const priceA = a.orderType === 'market' ? Infinity : (a.limitPrice || 0);
      const priceB = b.orderType === 'market' ? Infinity : (b.limitPrice || 0);
      if (priceA !== priceB) return priceB - priceA; // 高价优先
      return a.id - b.id; // 时间优先
    });
    
    orders.sellOrders.sort((a, b) => {
      const priceA = a.orderType === 'market' ? 0 : (a.limitPrice || Infinity);
      const priceB = b.orderType === 'market' ? 0 : (b.limitPrice || Infinity);
      if (priceA !== priceB) return priceA - priceB; // 低价优先
      return a.id - b.id; // 时间优先
    });
    
    let tradeVolume = 0;
    let lastTradePrice = stock.currentPrice;
    let buyIndex = 0;
    let sellIndex = 0;
    
    // 双指针撮合（利用排序特性，O(n)复杂度）
    while (buyIndex < orders.buyOrders.length && sellIndex < orders.sellOrders.length) {
      const buyOrder = orders.buyOrders[buyIndex];
      const sellOrder = orders.sellOrders[sellIndex];
      
      // 跳过已完成的订单
      if (buyOrder.status === 'filled') {
        buyIndex++;
        continue;
      }
      if (sellOrder.status === 'filled') {
        sellIndex++;
        continue;
      }
      
      // 跳过自交易
      if (buyOrder.companyId === sellOrder.companyId) {
        // 尝试下一个卖单
        sellIndex++;
        continue;
      }
      
      // 获取有效价格
      const buyPrice = buyOrder.orderType === 'market' ? Infinity : buyOrder.limitPrice!;
      const sellPrice = sellOrder.orderType === 'market' ? 0 : sellOrder.limitPrice!;
      
      // 价格不匹配时，利用排序特性判断是否需要提前终止
      if (buyPrice < sellPrice) {
        // 当前最高买价低于最低卖价，后续不可能匹配
        break;
      }
      
      // 可以成交
      // 成交价格确定：
      // - 双市价单：使用当前股价
      // - 单市价单：使用对方限价
      // - 双限价单：使用中间价
      let tradePrice: number;
      if (buyOrder.orderType === 'market' && sellOrder.orderType === 'market') {
        tradePrice = stock.currentPrice;
      } else if (buyOrder.orderType === 'market') {
        tradePrice = sellPrice;
      } else if (sellOrder.orderType === 'market') {
        tradePrice = buyPrice;
      } else {
        tradePrice = (buyPrice + sellPrice) / 2;
      }
      
      // 成交数量
      const buyRemaining = buyOrder.quantity - buyOrder.filledQuantity;
      const sellRemaining = sellOrder.quantity - sellOrder.filledQuantity;
      const tradeQuantity = Math.min(buyRemaining, sellRemaining);
      
      if (tradeQuantity <= 0) {
        // 应该不会发生，但作为安全检查
        buyIndex++;
        continue;
      }
      
      // 更新订单状态
      buyOrder.filledQuantity += tradeQuantity;
      sellOrder.filledQuantity += tradeQuantity;
      
      // 更新平均成交价
      const prevBuyFilled = buyOrder.filledQuantity - tradeQuantity;
      const prevSellFilled = sellOrder.filledQuantity - tradeQuantity;
      buyOrder.avgPrice = prevBuyFilled > 0
        ? (buyOrder.avgPrice * prevBuyFilled + tradePrice * tradeQuantity) / buyOrder.filledQuantity
        : tradePrice;
      sellOrder.avgPrice = prevSellFilled > 0
        ? (sellOrder.avgPrice * prevSellFilled + tradePrice * tradeQuantity) / sellOrder.filledQuantity
        : tradePrice;
      
      // 更新订单状态
      if (buyOrder.filledQuantity >= buyOrder.quantity) {
        buyOrder.status = 'filled';
      } else {
        buyOrder.status = 'partial';
      }
      
      if (sellOrder.filledQuantity >= sellOrder.quantity) {
        sellOrder.status = 'filled';
      } else {
        sellOrder.status = 'partial';
      }
      
      // 更新持股
      updateHoldings(world, buyOrder.companyId, companyId, tradeQuantity, tradePrice);
      updateHoldings(world, sellOrder.companyId, companyId, -tradeQuantity, tradePrice);
      
      // 转移资金（卖方收款）
      const tradeCost = tradePrice * tradeQuantity;
      world.companies.cash[sellOrder.companyId] += tradeCost;
      
      // 更新交易统计
      tradeVolume += tradeQuantity;
      lastTradePrice = tradePrice;
      
      // 移动指针
      if (buyOrder.status === 'filled') {
        buyIndex++;
      }
      if (sellOrder.status === 'filled') {
        sellIndex++;
      }
    }
    
    // 更新股票价格
    if (tradeVolume > 0) {
      stock.previousClose = stock.currentPrice;
      stock.currentPrice = lastTradePrice;
      stock.volume += tradeVolume;
      stock.totalVolume += tradeVolume;  // 更新累计成交量
      stock.turnoverRate = tradeVolume / stock.outstandingShares;
      stock.marketCap = stock.currentPrice * stock.totalShares;
      
      // 更新最高最低价
      stock.highPrice = Math.max(stock.highPrice, lastTradePrice);
      stock.lowPrice = Math.min(stock.lowPrice, lastTradePrice);
    }
  }
  
  // 清理已完成订单（只保留活跃订单）
  stockMarket.orders = stockMarket.orders.filter(o =>
    o.status === 'pending' || o.status === 'partial'
  );
  
  // 更新市场指数
  updateMarketIndex();
}

/**
 * 更新持股
 */
function updateHoldings(
  world: GameWorld,
  ownerCompanyId: number,
  stockCompanyId: number,
  sharesChange: number,
  price: number
): void {
  const key = `${ownerCompanyId}-${stockCompanyId}`;
  let holding = stockMarket.holdings.get(key);
  
  if (!holding) {
    holding = {
      ownerCompanyId,
      stockCompanyId,
      shares: 0,
      avgCost: 0,
      unrealizedGain: 0,
    };
    stockMarket.holdings.set(key, holding);
  }
  
  if (sharesChange > 0) {
    // 买入：更新平均成本
    const totalCost = holding.avgCost * holding.shares + price * sharesChange;
    holding.shares += sharesChange;
    holding.avgCost = holding.shares > 0 ? totalCost / holding.shares : 0;
  } else {
    // 卖出
    holding.shares += sharesChange;
    if (holding.shares <= 0) {
      stockMarket.holdings.delete(key);
    }
  }
  
  // 更新未实现收益
  if (holding.shares > 0) {
    const stock = stockMarket.stocks.get(stockCompanyId);
    if (stock) {
      holding.unrealizedGain = (stock.currentPrice - holding.avgCost) * holding.shares;
    }
  }
}

/**
 * 更新市场指数
 */
function updateMarketIndex(): void {
  let totalMarketCap = 0;
  let weightedChange = 0;
  
  for (const [_, stock] of stockMarket.stocks) {
    if (!stock.isListed) {
      continue;
    }
    totalMarketCap += stock.marketCap;
    const priceChange = stock.currentPrice - stock.previousClose;
    weightedChange += priceChange * stock.totalShares;
  }
  
  stockMarket.totalMarketCap = totalMarketCap;
  
  if (totalMarketCap > 0) {
    const changePercent = weightedChange / totalMarketCap;
    stockMarket.marketIndex *= (1 + changePercent);
    stockMarket.marketIndexChange = changePercent;
  }
}

/**
 * 获取股票信息
 */
export function getStock(companyId: number): Stock | null {
  return stockMarket.stocks.get(companyId) || null;
}

export function haltStock(companyId: number): boolean {
  const stock = stockMarket.stocks.get(companyId);
  if (!stock) {
    return false;
  }

  stock.isTradable = false;
  return true;
}

export function delistStock(
  world: GameWorld,
  companyId: number,
  residualCash: number,
): { distributedCash: number } {
  const stock = stockMarket.stocks.get(companyId);
  if (!stock) {
    return { distributedCash: 0 };
  }

  stock.isTradable = false;
  stock.isListed = false;
  stock.outstandingShares = 0;
  stock.marketCap = 0;
  stock.turnoverRate = 0;
  stock.volume = 0;

  let distributedCash = 0;
  const affectedHoldings = Array.from(stockMarket.holdings.entries())
    .filter(([, holding]) => holding.stockCompanyId === companyId);
  const externalShareTotal = affectedHoldings.reduce((sum, [, holding]) => {
    if (holding.ownerCompanyId === companyId || holding.shares <= 0) {
      return sum;
    }
    return sum + holding.shares;
  }, 0);

  for (const [holdingKey, holding] of affectedHoldings) {
    if (holding.ownerCompanyId !== companyId && holding.shares > 0 && externalShareTotal > 0) {
      const payout = residualCash * (holding.shares / externalShareTotal);
      world.companies.cash[holding.ownerCompanyId] += payout;
      distributedCash += payout;
    }
    stockMarket.holdings.delete(holdingKey);
  }

  stockMarket.orders = stockMarket.orders.filter((order) => {
    if (order.stockCompanyId !== companyId) {
      return true;
    }

    if (order.type === 'buy') {
      const remainingQuantity = Math.max(0, order.quantity - order.filledQuantity);
      const refundPrice = order.limitPrice ?? stock.currentPrice;
      world.companies.cash[order.companyId] += remainingQuantity * refundPrice;
    }

    return false;
  });

  return { distributedCash };
}

/**
 * 获取持股信息
 */
export function getHoldings(ownerCompanyId: number): Holding[] {
  const holdings: Holding[] = [];
  
  for (const [key, holding] of stockMarket.holdings) {
    if (holding.ownerCompanyId === ownerCompanyId) {
      holdings.push(holding);
    }
  }
  
  return holdings;
}

/**
 * 获取市场状态
 */
export function getMarketState(): StockMarketState {
  return stockMarket;
}

function estimateIPOSubscriptions(
  world: GameWorld,
  companyId: number,
  offeringShares: number,
  offeringPrice: number,
): Array<{ aiId: number; shares: number; cost: number }> {
  const aiCompanyIds: number[] = [];
  for (let i = 1; i < world.companies.count; i++) {
    if (i !== companyId && world.companies.isAI[i] && world.companies.cash[i] > offeringPrice * 100) {
      aiCompanyIds.push(i);
    }
  }

  const subscriptions: Array<{ aiId: number; shares: number; cost: number }> = [];
  let remainingShares = offeringShares;

  if (aiCompanyIds.length === 0) {
    return subscriptions;
  }

  const topAIs = aiCompanyIds
    .sort((a, b) => world.companies.cash[b] - world.companies.cash[a])
    .slice(0, 10);

  for (const aiId of topAIs) {
    if (remainingShares <= 0) {
      break;
    }

    const maxAffordable = Math.floor(world.companies.cash[aiId] * 0.1 / offeringPrice);
    const subscribedShares = Math.min(remainingShares, maxAffordable);
    if (subscribedShares <= 0) {
      continue;
    }

    subscriptions.push({
      aiId,
      shares: subscribedShares,
      cost: subscribedShares * offeringPrice,
    });
    remainingShares -= subscribedShares;
  }

  return subscriptions;
}

function buildIPOAssessment(
  world: GameWorld,
  companyId: number,
  offeringShares: number,
  offeringPrice: number,
): IPOAssessment {
  const stock = createStock(world, companyId);
  const minShares = Math.floor(stock.totalShares * IPO_MIN_SHARE_RATIO);
  const maxShares = Math.floor(stock.totalShares * IPO_MAX_SHARE_RATIO);
  const suggestedPrice = stock.currentPrice;
  const minPrice = Math.max(1, suggestedPrice * IPO_MIN_PRICE_MULTIPLIER);
  const maxPrice = Math.max(minPrice, suggestedPrice * IPO_MAX_PRICE_MULTIPLIER);

  const subscriptions = isFinite(offeringPrice) && offeringPrice > 0
    ? estimateIPOSubscriptions(world, companyId, offeringShares, offeringPrice)
    : [];
  const estimatedDemand = subscriptions.reduce((sum, subscription) => sum + subscription.shares, 0);
  const shortfallShares = Math.max(0, offeringShares - estimatedDemand);

  let reason: IPOFailureReason | undefined;
  let message = '按当前定价，发行可被真实买家全部认购';

  if (stockMarket.stocks.has(companyId)) {
    reason = 'already_listed';
    message = '公司已上市，不能重复发起 IPO';
  } else if (!Number.isInteger(offeringShares) || offeringShares < minShares || offeringShares > maxShares) {
    reason = 'share_count_out_of_range';
    message = `发行股数需在 ${minShares.toLocaleString()} 到 ${maxShares.toLocaleString()} 股之间`;
  } else if (!isFinite(offeringPrice) || offeringPrice <= 0) {
    reason = 'invalid_price';
    message = '发行价必须大于 0';
  } else if (offeringPrice < minPrice || offeringPrice > maxPrice) {
    reason = 'price_out_of_range';
    message = `发行价超出建议区间，建议设在 ¥${minPrice.toFixed(2)} - ¥${maxPrice.toFixed(2)}`;
  } else if (shortfallShares > 0) {
    reason = 'insufficient_demand';
    message = `按当前定价预计仅能认购 ${estimatedDemand.toLocaleString()} / ${offeringShares.toLocaleString()} 股`;
  }

  return {
    stock,
    subscriptions,
    suggestedPrice,
    minPrice,
    maxPrice,
    minShares,
    maxShares,
    estimatedDemand,
    shortfallShares,
    canLaunch: reason === undefined,
    message,
  };
}

export function getIPOOfferPreview(
  world: GameWorld,
  companyId: number,
  offeringShares: number,
  offeringPrice: number,
): IPOOfferPreview {
  const assessment = buildIPOAssessment(world, companyId, offeringShares, offeringPrice);
  return {
    suggestedPrice: assessment.suggestedPrice,
    minPrice: assessment.minPrice,
    maxPrice: assessment.maxPrice,
    minShares: assessment.minShares,
    maxShares: assessment.maxShares,
    estimatedDemand: assessment.estimatedDemand,
    shortfallShares: assessment.shortfallShares,
    canLaunch: assessment.canLaunch,
    message: assessment.message,
  };
}

/**
 * 玩家IPO
 */
export function initiateIPO(
  world: GameWorld,
  companyId: number,
  offeringShares: number,
  offeringPrice: number
): IPOResult {
  const assessment = buildIPOAssessment(world, companyId, offeringShares, offeringPrice);
  if (!assessment.canLaunch) {
    return {
      success: false,
      reason: stockMarket.stocks.has(companyId)
        ? 'already_listed'
        : !Number.isInteger(offeringShares) || offeringShares < assessment.minShares || offeringShares > assessment.maxShares
          ? 'share_count_out_of_range'
          : !isFinite(offeringPrice) || offeringPrice <= 0
            ? 'invalid_price'
            : offeringPrice < assessment.minPrice || offeringPrice > assessment.maxPrice
              ? 'price_out_of_range'
              : 'insufficient_demand',
      subscribedShares: assessment.estimatedDemand,
      suggestedPrice: assessment.suggestedPrice,
      minPrice: assessment.minPrice,
      maxPrice: assessment.maxPrice,
      minShares: assessment.minShares,
      maxShares: assessment.maxShares,
      estimatedDemand: assessment.estimatedDemand,
      shortfallShares: assessment.shortfallShares,
      canLaunch: false,
      message: assessment.message,
    };
  }

  const stock = assessment.stock;
  const subscriptions = assessment.subscriptions;
  const totalSubscribed = assessment.estimatedDemand;

  stock.currentPrice = offeringPrice;
  stock.openPrice = offeringPrice;
  stock.highPrice = offeringPrice;
  stock.lowPrice = offeringPrice;
  stock.previousClose = offeringPrice;
  stock.outstandingShares = offeringShares;
  stock.volume = 0;
  stock.totalVolume = 0;
  stock.turnoverRate = 0;
  stock.marketCap = offeringPrice * stock.totalShares;
  stock.priceToBook = stock.bookValue > 0 ? stock.marketCap / stock.bookValue : 0;

  stockMarket.stocks.set(companyId, stock);

  // 创建者持有剩余股份
  const selfHolding: Holding = {
    ownerCompanyId: companyId,
    stockCompanyId: companyId,
    shares: stock.totalShares - offeringShares,
    avgCost: offeringPrice,
    unrealizedGain: 0,
  };
  stockMarket.holdings.set(`${companyId}-${companyId}`, selfHolding);

  for (const { aiId, shares, cost } of subscriptions) {
    world.companies.cash[aiId] -= cost;

    const holdingKey = `${aiId}-${companyId}`;
    const holding: Holding = {
      ownerCompanyId: aiId,
      stockCompanyId: companyId,
      shares,
      avgCost: offeringPrice,
      unrealizedGain: 0,
    };
    stockMarket.holdings.set(holdingKey, holding);
  }

  world.companies.cash[companyId] += totalSubscribed * offeringPrice;

  stockMarket.valuationCache.delete(companyId);
  const postMoneyValuation = calculateValuation(world, companyId);
  stock.bookValue = postMoneyValuation.bookValue;
  stock.priceToBook = stock.bookValue > 0 ? stock.marketCap / stock.bookValue : 0;
  stockMarket.companyHistory.set(companyId, {
    lastCash: world.companies.cash[companyId],
    lastNetWorth: postMoneyValuation.bookValue,
    lastUpdateTick: world.tick,
  });

  updateMarketIndex();
  console.log(`[StockMarket] IPO完成: ${companyId}号公司发行${offeringShares}股，AI认购${totalSubscribed}股`);

  return {
    success: true,
    subscribedShares: totalSubscribed,
    suggestedPrice: assessment.suggestedPrice,
    minPrice: assessment.minPrice,
    maxPrice: assessment.maxPrice,
    minShares: assessment.minShares,
    maxShares: assessment.maxShares,
    estimatedDemand: assessment.estimatedDemand,
    shortfallShares: 0,
    canLaunch: true,
    message: `IPO成功！发行${offeringShares.toLocaleString()}股 @ ¥${offeringPrice.toFixed(2)}`,
  };
}

/**
 * 支付股息
 */
export function payDividend(world: GameWorld, companyId: number, dividendPerShare: number): boolean {
  const stock = stockMarket.stocks.get(companyId);
  if (!stock) return false;
  
  const totalDividend = dividendPerShare * stock.outstandingShares;
  
  if (world.companies.cash[companyId] < totalDividend) {
    return false; // 现金不足
  }
  
  // 扣除公司现金
  world.companies.cash[companyId] -= totalDividend;
  
  // 向股东支付股息
  for (const [key, holding] of stockMarket.holdings) {
    if (holding.stockCompanyId === companyId && holding.ownerCompanyId !== companyId) {
      const dividend = dividendPerShare * holding.shares;
      world.companies.cash[holding.ownerCompanyId] += dividend;
    }
  }
  
  // 更新股息收益率
  stock.dividendYield = dividendPerShare * 12 / stock.currentPrice; // 年化
  
  return true;
}

/**
 * 计算基于业绩的动态股价
 *
 * 优化后的考虑因素：
 * 1. 公司净资产变化（权重35%）- 反映公司整体价值
 * 2. 现金流变化（权重30%）- 反映盈利能力
 * 3. 市场估值回归（权重20%）- 价格向内在价值靠拢
 * 4. 市场情绪随机波动（权重15%）- 模拟市场不确定性（降低随机性）
 *
 * @param world 游戏世界
 * @param companyId 公司ID
 * @param stock 股票信息
 * @returns 新的股价
 */
function calculateDynamicPrice(world: GameWorld, companyId: number, stock: Stock): number {
  // 确保当前价格有效
  let currentPrice = stock.currentPrice;
  if (!isFinite(currentPrice) || currentPrice <= 0) {
    currentPrice = 10; // 默认价格
  }
  
  const history = stockMarket.companyHistory.get(companyId);
  const currentCash = world.companies.cash[companyId] || 0;
  const valuation = calculateValuation(world, companyId);
  const currentNetWorth = valuation.bookValue || 0;
  
  // 如果没有历史数据，初始化并返回当前价格
  if (!history) {
    stockMarket.companyHistory.set(companyId, {
      lastCash: isFinite(currentCash) ? currentCash : 0,
      lastNetWorth: isFinite(currentNetWorth) ? currentNetWorth : 0,
      lastUpdateTick: world.tick,
    });
    return currentPrice;
  }
  
  // 计算业绩变化率
  // 1. 净资产变化率（公司整体价值变化）
  let netWorthChangeRate = 0;
  if (history.lastNetWorth > 0 && isFinite(currentNetWorth)) {
    netWorthChangeRate = (currentNetWorth - history.lastNetWorth) / history.lastNetWorth;
    // 限制极端值并确保有效
    if (!isFinite(netWorthChangeRate)) netWorthChangeRate = 0;
    netWorthChangeRate = Math.max(-0.3, Math.min(0.3, netWorthChangeRate));
  }
  
  // 2. 现金变化率（盈利能力指标）
  let cashChangeRate = 0;
  if (history.lastCash > 0 && isFinite(currentCash)) {
    cashChangeRate = (currentCash - history.lastCash) / history.lastCash;
    // 限制极端值并确保有效
    if (!isFinite(cashChangeRate)) cashChangeRate = 0;
    cashChangeRate = Math.max(-0.3, Math.min(0.3, cashChangeRate));
  }
  
  // 3. 估值回归因子（价格向内在价值靠拢）
  // 如果当前价格低于内在价值，有上涨压力；反之有下跌压力
  let intrinsicPricePerShare = valuation.intrinsicValue / stock.totalShares;
  if (!isFinite(intrinsicPricePerShare) || intrinsicPricePerShare <= 0) {
    intrinsicPricePerShare = currentPrice; // 使用当前价格作为内在价值
  }
  
  let valuationGap = 0;
  if (intrinsicPricePerShare > 0 && currentPrice > 0) {
    // 计算当前价格与内在价值的偏离比例
    const deviation = (intrinsicPricePerShare - currentPrice) / intrinsicPricePerShare;
    if (isFinite(deviation)) {
      // 限制回归速度（每次最多回归5%的偏离）
      valuationGap = Math.max(-0.05, Math.min(0.05, deviation * 0.1));
    }
  }
  
  // 4. 市场情绪随机波动（降低到±0.75%）
  const randomVolatility = (Math.random() - 0.5) * 0.015;
  
  // 5. 交易量影响：有交易时价格更稳定
  let volumeStabilizer = 1.0;
  if (stock.volume > 100) {
    volumeStabilizer = 0.8; // 高交易量时波动降低20%
  } else if (stock.volume > 0) {
    volumeStabilizer = 0.9;
  }
  
  // 综合计算变化率
  // 优化权重：净资产35% + 现金30% + 估值回归20% + 随机15%
  let priceChangeRate =
    netWorthChangeRate * 0.35 +
    cashChangeRate * 0.30 +
    valuationGap * 0.20 +
    randomVolatility * 0.15;
  
  // 确保变化率有效
  if (!isFinite(priceChangeRate)) {
    priceChangeRate = 0;
  }
  
  // 应用交易量稳定因子
  priceChangeRate *= volumeStabilizer;
  
  // 应用涨跌停限制（由于更新更频繁，改为±3%单次限制）
  priceChangeRate = Math.max(-0.03, Math.min(0.03, priceChangeRate));
  
  // 计算新价格
  let newPrice = currentPrice * (1 + priceChangeRate);
  
  // 确保新价格有效
  if (!isFinite(newPrice) || newPrice <= 0) {
    newPrice = currentPrice > 0 ? currentPrice : 10;
  }
  
  // 价格下限保护（不低于账面价值的50%或1元）
  const bookValuePerShare = stock.bookValue / stock.totalShares;
  const minPrice = Math.max(1, isFinite(bookValuePerShare) ? bookValuePerShare * 0.5 : 1);
  newPrice = Math.max(minPrice, newPrice);
  
  // 价格上限保护（不超过内在价值的3倍）
  const maxPrice = intrinsicPricePerShare * 3;
  if (isFinite(maxPrice) && maxPrice > 0) {
    newPrice = Math.min(newPrice, maxPrice);
  }
  
  // 更新历史数据
  stockMarket.companyHistory.set(companyId, {
    lastCash: isFinite(currentCash) ? currentCash : 0,
    lastNetWorth: isFinite(currentNetWorth) ? currentNetWorth : 0,
    lastUpdateTick: world.tick,
  });
  
  // 更新每股收益（EPS）
  const ticksSinceUpdate = world.tick - history.lastUpdateTick;
  if (ticksSinceUpdate > 0 && isFinite(currentCash) && isFinite(history.lastCash)) {
    const earningsThisPeriod = currentCash - history.lastCash;
    // 年化每股收益
    const annualizedEarnings = (earningsThisPeriod / ticksSinceUpdate) * (365 * 24);
    if (isFinite(annualizedEarnings)) {
      stock.earningsPerShare = annualizedEarnings / stock.totalShares;
      
      // 更新市盈率
      if (stock.earningsPerShare > 0 && isFinite(stock.earningsPerShare)) {
        stock.priceToEarnings = newPrice / stock.earningsPerShare;
        if (!isFinite(stock.priceToEarnings)) {
          stock.priceToEarnings = 0;
        }
      } else {
        stock.priceToEarnings = 0; // 亏损时不显示PE
      }
    }
  }
  
  return newPrice;
}

/**
 * 更新股票市场（性能优化版：分批处理 + 降低更新频率）
 *
 * 优化策略：
 * 1. 订单撮合：每tick执行（保证交易实时性）
 * 2. 股价更新：每4个tick执行，每次处理1/4的股票（分批）
 * 3. 市场指数：每4个tick更新一次
 */
export function updateStockMarket(world: GameWorld): void {
  const currentTick = world.tick;
  
  // 1. 订单撮合 - 每tick执行（保证交易实时性）
  matchStockOrders(world);
  
  // 2. 股价更新 - 分批处理，降低每tick开销
  // 每4个tick更新所有股票，每个tick更新1/4
  const updatePhase = currentTick % 4;
  const stockArray = Array.from(stockMarket.stocks.entries())
    .filter(([, stock]) => stock.isListed);
  const batchSize = Math.ceil(stockArray.length / 4);
  const startIdx = updatePhase * batchSize;
  const endIdx = Math.min(startIdx + batchSize, stockArray.length);
  
  // 判断是否是新的一天（每24个tick）
  const isNewDay = currentTick % 24 === 0;
  
  // 只处理当前批次的股票
  for (let i = startIdx; i < endIdx; i++) {
    const [companyId, stock] = stockArray[i];
    
    // 更新估值指标（使用缓存）
    const valuation = calculateValuation(world, companyId);
    stock.bookValue = valuation.bookValue;
    
    // 新的一天：保存昨收价，重置日内数据
    if (isNewDay) {
      stock.previousClose = stock.currentPrice;
      stock.openPrice = stock.currentPrice;
      stock.highPrice = stock.currentPrice;
      stock.lowPrice = stock.currentPrice;
      stock.volume = 0;
    }
    
    // 计算基于业绩的动态价格
    const newPrice = calculateDynamicPrice(world, companyId, stock);
    
    // 更新价格
    stock.currentPrice = newPrice;
    
    // 更新日内最高最低价
    stock.highPrice = Math.max(stock.highPrice, newPrice);
    stock.lowPrice = Math.min(stock.lowPrice, newPrice);
    
    // 更新市值和市净率
    stock.marketCap = newPrice * stock.totalShares;
    if (valuation.bookValue > 0) {
      stock.priceToBook = stock.marketCap / valuation.bookValue;
    }
  }
  
  // 3. 每4个tick更新一次市场指数（在第0相位）
  if (updatePhase === 0) {
    updateMarketIndex();
  }
  
  stockMarket.lastUpdateTick = currentTick;
  
  // 4. 清理过期的估值缓存（每100个tick清理一次，避免内存泄漏）
  if (currentTick % 100 === 0) {
    for (const [companyId, cache] of stockMarket.valuationCache) {
      if (currentTick - cache.cachedTick > 10) {
        stockMarket.valuationCache.delete(companyId);
      }
    }
  }
}
