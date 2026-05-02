/**
 * 经济计算Web Worker
 * 将计算密集型的经济系统计算分离到Worker线程
 *
 * 支持的任务类型：
 * - CALCULATE_PRICES: 价格均衡计算
 * - CALCULATE_PRODUCTION: 生产产出计算
 * - CALCULATE_DEMAND: 需求计算
 * - BATCH_UPDATE: 批量更新（价格+生产+需求）
 * - MATCH_ORDERS: 订单撮合
 * - AI_BATCH_DECISIONS: AI批量决策
 * - PRICE_ANALYSIS: 价格分析
 */

// Worker消息类型
export interface WorkerMessage {
  type:
    | 'CALCULATE_PRICES'
    | 'CALCULATE_PRODUCTION'
    | 'CALCULATE_DEMAND'
    | 'BATCH_UPDATE'
    | 'MATCH_ORDERS'
    | 'AI_BATCH_DECISIONS'
    | 'PRICE_ANALYSIS'
    | 'BATCH_INVENTORY_UPDATE';
  payload: any;
  id: number;
}

export interface WorkerResponse {
  type: string;
  result: any;
  id: number;
  duration: number;
}

// 订单撮合结果
interface MatchResult {
  goodsId: number;
  trades: Array<{
    buyOrderIdx: number;
    sellOrderIdx: number;
    quantity: number;
    price: number;
  }>;
}

// AI决策结果
interface AIDecisionResult {
  companyId: number;
  decisions: Array<{
    type: string;
    action: string;
    params: Record<string, number>;
    priority: number;
  }>;
}

// 价格分析结果
interface PriceAnalysisResult {
  goodsId: number;
  trend: 'up' | 'down' | 'stable';
  volatility: number;
  predictedChange: number;
}

// 价格计算函数（在Worker中执行）
function calculatePriceEquilibrium(
  supplies: Float32Array,
  demands: Float32Array,
  currentPrices: Float32Array,
  basePrices: Float32Array,
  count: number
): Float32Array {
  const newPrices = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    const supply = supplies[i] || 1;
    const demand = demands[i] || 1;
    const basePrice = basePrices[i] || 100;
    const currentPrice = currentPrices[i] || basePrice;
    
    // 供需比
    const ratio = demand / supply;
    
    // 价格调整
    let adjustment = 0;
    if (ratio > 1.05) {
      // 需求大于供给，涨价
      adjustment = Math.min(0.05, (ratio - 1) * 0.1);
    } else if (ratio < 0.95) {
      // 供给大于需求，降价
      adjustment = Math.max(-0.05, (ratio - 1) * 0.1);
    }
    
    // 均值回归
    const priceRatio = currentPrice / basePrice;
    const meanReversion = (1 - priceRatio) * 0.002;
    
    // 计算新价格
    let newPrice = currentPrice * (1 + adjustment + meanReversion);
    
    // 价格边界
    newPrice = Math.max(basePrice * 0.2, Math.min(basePrice * 5, newPrice));
    
    newPrices[i] = newPrice;
  }
  
  return newPrices;
}

// 生产计算函数
function calculateProduction(
  buildingCount: number,
  efficiencies: Float32Array,
  recipeOutputs: Uint8Array,
  recipeAmounts: Float32Array
): Float32Array {
  const outputs = new Float32Array(128); // GOODS_COUNT
  
  for (let i = 0; i < buildingCount; i++) {
    const efficiency = efficiencies[i] || 1;
    const outputGoodsId = recipeOutputs[i];
    const baseAmount = recipeAmounts[i] || 0;
    
    if (outputGoodsId < 128) {
      outputs[outputGoodsId] += baseAmount * efficiency;
    }
  }
  
  return outputs;
}

// 需求计算函数
function calculateDemand(
  goodsCount: number,
  prices: Float32Array,
  basePrices: Float32Array,
  priceElasticities: Float32Array,
  baseDemands: Float32Array
): Float32Array {
  const demands = new Float32Array(goodsCount);
  
  for (let i = 0; i < goodsCount; i++) {
    const price = prices[i] || basePrices[i];
    const basePrice = basePrices[i] || 100;
    const elasticity = priceElasticities[i] || -1;
    const baseDemand = baseDemands[i] || 1000;
    
    // 价格变化率
    const priceChange = (price - basePrice) / basePrice;
    
    // 需求变化 = 弹性 × 价格变化率
    const demandChange = elasticity * priceChange;
    
    // 新需求
    demands[i] = Math.max(0, baseDemand * (1 + demandChange));
  }
  
  return demands;
}

/**
 * 订单撮合计算
 * 在Worker中执行订单匹配
 */
function matchOrdersRange(
  buyPrices: Float32Array,
  buyQuantities: Float32Array,
  buyCompanies: Uint16Array,
  buyActive: Uint8Array,
  sellPrices: Float32Array,
  sellQuantities: Float32Array,
  sellCompanies: Uint16Array,
  sellActive: Uint8Array,
  goodsStart: number,
  goodsEnd: number,
  orderGoodsIds: Uint8Array
): MatchResult[] {
  const results: MatchResult[] = [];
  
  for (let goodsId = goodsStart; goodsId < goodsEnd; goodsId++) {
    // 收集该商品的买卖单
    const buyIndices: number[] = [];
    const sellIndices: number[] = [];
    
    for (let i = 0; i < buyPrices.length; i++) {
      if (orderGoodsIds[i] === goodsId && buyActive[i]) {
        buyIndices.push(i);
      }
    }
    
    for (let i = 0; i < sellPrices.length; i++) {
      if (orderGoodsIds[i] === goodsId && sellActive[i]) {
        sellIndices.push(i);
      }
    }
    
    if (buyIndices.length === 0 || sellIndices.length === 0) {
      continue;
    }
    
    // 排序
    buyIndices.sort((a, b) => buyPrices[b] - buyPrices[a]);
    sellIndices.sort((a, b) => sellPrices[a] - sellPrices[b]);
    
    const trades: MatchResult['trades'] = [];
    let buyPtr = 0;
    let sellPtr = 0;
    
    while (buyPtr < buyIndices.length && sellPtr < sellIndices.length) {
      const buyIdx = buyIndices[buyPtr];
      const sellIdx = sellIndices[sellPtr];
      
      if (buyQuantities[buyIdx] <= 0) {
        buyPtr++;
        continue;
      }
      if (sellQuantities[sellIdx] <= 0) {
        sellPtr++;
        continue;
      }
      
      // 自成交防护
      if (buyCompanies[buyIdx] === sellCompanies[sellIdx]) {
        buyPtr++;
        continue;
      }
      
      if (buyPrices[buyIdx] < sellPrices[sellIdx]) {
        break;
      }
      
      const matchQty = Math.min(buyQuantities[buyIdx], sellQuantities[sellIdx]);
      const matchPrice = (buyPrices[buyIdx] + sellPrices[sellIdx]) / 2;
      
      trades.push({
        buyOrderIdx: buyIdx,
        sellOrderIdx: sellIdx,
        quantity: matchQty,
        price: matchPrice,
      });
      
      buyQuantities[buyIdx] -= matchQty;
      sellQuantities[sellIdx] -= matchQty;
      
      if (buyQuantities[buyIdx] <= 0) buyPtr++;
      if (sellQuantities[sellIdx] <= 0) sellPtr++;
    }
    
    if (trades.length > 0) {
      results.push({ goodsId, trades });
    }
  }
  
  return results;
}

/**
 * 批量库存更新计算
 */
function calculateInventoryUpdates(
  inventories: Float32Array,
  changes: Float32Array,
  companyCount: number,
  goodsCount: number
): Float32Array {
  const result = new Float32Array(companyCount * goodsCount);
  
  for (let i = 0; i < companyCount * goodsCount; i++) {
    result[i] = Math.max(0, inventories[i] + changes[i]);
  }
  
  return result;
}

/**
 * 价格趋势分析
 */
function analyzePriceTrends(
  priceHistory: Float32Array,
  historySize: number,
  goodsCount: number
): PriceAnalysisResult[] {
  const results: PriceAnalysisResult[] = [];
  
  for (let i = 0; i < goodsCount; i++) {
    const offset = i * historySize;
    
    // 计算简单移动平均
    let sum = 0;
    let count = 0;
    let firstPrice = 0;
    let lastPrice = 0;
    
    for (let j = 0; j < historySize; j++) {
      const price = priceHistory[offset + j];
      if (price > 0) {
        sum += price;
        count++;
        if (firstPrice === 0) firstPrice = price;
        lastPrice = price;
      }
    }
    
    if (count < 2) {
      results.push({
        goodsId: i,
        trend: 'stable',
        volatility: 0,
        predictedChange: 0,
      });
      continue;
    }
    
    const avg = sum / count;
    
    // 计算波动率
    let variance = 0;
    for (let j = 0; j < historySize; j++) {
      const price = priceHistory[offset + j];
      if (price > 0) {
        variance += (price - avg) ** 2;
      }
    }
    const volatility = Math.sqrt(variance / count) / avg;
    
    // 确定趋势
    const change = (lastPrice - firstPrice) / firstPrice;
    let trend: 'up' | 'down' | 'stable';
    if (change > 0.02) {
      trend = 'up';
    } else if (change < -0.02) {
      trend = 'down';
    } else {
      trend = 'stable';
    }
    
    // 预测变化（简单线性外推）
    const predictedChange = change * 0.5; // 假设趋势会减弱
    
    results.push({
      goodsId: i,
      trend,
      volatility,
      predictedChange,
    });
  }
  
  return results;
}

/**
 * 简化的AI决策计算（在Worker中执行）
 */
function calculateAIDecisions(
  companyIds: number[],
  cash: Float64Array,
  inventories: Float32Array,
  prices: Float32Array,
  goodsCount: number
): AIDecisionResult[] {
  const results: AIDecisionResult[] = [];
  
  for (const companyId of companyIds) {
    const decisions: AIDecisionResult['decisions'] = [];
    const companyCash = cash[companyId];
    
    // 简化的卖出决策
    for (let goodsId = 0; goodsId < goodsCount; goodsId++) {
      const invIdx = companyId * goodsCount + goodsId;
      const inventory = inventories[invIdx];
      
      if (inventory > 10) {
        const price = prices[goodsId] * 0.98;
        decisions.push({
          type: 'trading',
          action: 'sell',
          params: { goodsId, quantity: inventory * 0.5, price },
          priority: 6,
        });
      }
    }
    
    // 简化的买入决策
    if (companyCash > 100000) {
      for (let goodsId = 0; goodsId < Math.min(10, goodsCount); goodsId++) {
        const price = prices[goodsId];
        const quantity = Math.floor(companyCash * 0.01 / price);
        if (quantity > 0) {
          decisions.push({
            type: 'trading',
            action: 'buy',
            params: { goodsId, quantity, price: price * 1.02 },
            priority: 5,
          });
        }
      }
    }
    
    results.push({ companyId, decisions });
  }
  
  return results;
}

// Worker主函数
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload, id } = e.data;
  const startTime = performance.now();
  
  let result: unknown;
  
  switch (type) {
    case 'CALCULATE_PRICES':
      result = calculatePriceEquilibrium(
        payload.supplies,
        payload.demands,
        payload.currentPrices,
        payload.basePrices,
        payload.count
      );
      break;
      
    case 'CALCULATE_PRODUCTION':
      result = calculateProduction(
        payload.buildingCount,
        payload.efficiencies,
        payload.recipeOutputs,
        payload.recipeAmounts
      );
      break;
      
    case 'CALCULATE_DEMAND':
      result = calculateDemand(
        payload.goodsCount,
        payload.prices,
        payload.basePrices,
        payload.priceElasticities,
        payload.baseDemands
      );
      break;
      
    case 'BATCH_UPDATE':
      {
        const prices = calculatePriceEquilibrium(
          payload.supplies,
          payload.demands,
          payload.currentPrices,
          payload.basePrices,
          payload.goodsCount
        );
        
        const production = calculateProduction(
          payload.buildingCount,
          payload.efficiencies,
          payload.recipeOutputs,
          payload.recipeAmounts
        );
        
        result = { prices, production };
      }
      break;
      
    case 'MATCH_ORDERS':
      result = matchOrdersRange(
        payload.buyPrices,
        payload.buyQuantities,
        payload.buyCompanies,
        payload.buyActive,
        payload.sellPrices,
        payload.sellQuantities,
        payload.sellCompanies,
        payload.sellActive,
        payload.goodsStart,
        payload.goodsEnd,
        payload.orderGoodsIds
      );
      break;
      
    case 'AI_BATCH_DECISIONS':
      result = calculateAIDecisions(
        payload.companyIds,
        payload.cash,
        payload.inventories,
        payload.prices,
        payload.goodsCount
      );
      break;
      
    case 'PRICE_ANALYSIS':
      result = analyzePriceTrends(
        payload.priceHistory,
        payload.historySize,
        payload.goodsCount
      );
      break;
      
    case 'BATCH_INVENTORY_UPDATE':
      result = calculateInventoryUpdates(
        payload.inventories,
        payload.changes,
        payload.companyCount,
        payload.goodsCount
      );
      break;
      
    default:
      result = null;
  }
  
  const duration = performance.now() - startTime;
  
  const response: WorkerResponse = {
    type,
    result,
    id,
    duration,
  };
  
  self.postMessage(response);
};

export {};
