/**
 * Zero-Intelligence Plus (ZIP) 自适应报价策略
 *
 * 灵感来源：BSE 中 Cliff (1997) 提出的 ZIP 算法。
 *
 * 核心思想：
 *   - 每个交易者维护一个利润率 μ（margin），基于 limitPrice 形成报价：
 *       买方报价 = limitPrice * (1 - μ_buy)
 *       卖方报价 = limitPrice * (1 + μ_sell)
 *   - 观察上一笔市场成交价 p_last 与自身上一报价 p_self：
 *       * 卖方：若 p_last > p_self（市场更愿出价），抬高 μ；若 p_last < p_self，下调 μ
 *       * 买方：若 p_last < p_self（市场要价更低），下调 μ（让出价更接近 limit）；反之抬高 μ
 *   - 调整公式：μ_new = μ_old + β * (target - μ_old)
 *     其中 β 为学习率（0.1-0.5），target 由市场反馈方向决定
 *   - 在大量交易者博弈下，价格会向 Smith 均衡价收敛
 *
 * 用途：
 *   - aggressive / opportunist 人格的核心策略
 *   - 比 ZIC 更智能，能跟随市场流动趋势调整报价
 *   - 不依赖技术指标，纯靠价格反馈学习
 *
 * 注意：仅参考算法思想，未直接拷贝 BSE GPL 源码
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS } from '@/data/goods';
import { GOODS_COUNT } from '@/core/constants';
import { getOrderBookView } from '@/core/market/OrderBook';
import { AIPersonality } from './AIPersonality';
import type { TradingSignal } from './AdvancedTrading';

/**
 * ZIP 交易者状态：每个 (companyId, goodsId, side) 维护一份 μ
 */
interface ZIPState {
  marginBuy: number;       // 买方利润率 μ_buy ∈ (0, 1)
  marginSell: number;      // 卖方利润率 μ_sell ∈ (0, +∞)
  lastBuyPrice: number;    // 上一次买方报价
  lastSellPrice: number;   // 上一次卖方报价
  lastUpdateTick: number;
}

const zipStateMap = new Map<string, ZIPState>();

function stateKey(companyId: number, goodsId: number): string {
  return `${companyId}:${goodsId}`;
}

function getOrCreateState(companyId: number, goodsId: number): ZIPState {
  const key = stateKey(companyId, goodsId);
  let state = zipStateMap.get(key);
  if (!state) {
    state = {
      marginBuy: 0.05 + Math.random() * 0.10,
      marginSell: 0.05 + Math.random() * 0.10,
      lastBuyPrice: 0,
      lastSellPrice: 0,
      lastUpdateTick: 0,
    };
    zipStateMap.set(key, state);
  }
  return state;
}

/**
 * 重置 ZIP 状态（仅用于测试）
 */
export function resetZIPState(): void {
  zipStateMap.clear();
}

/**
 * 根据上一笔成交价更新利润率 μ
 *
 * @param state ZIP 状态
 * @param lastTradePrice 上一笔市场成交价
 * @param personality 人格（决定学习率）
 */
function updateMargins(
  state: ZIPState,
  lastTradePrice: number,
  basePrice: number,
  personality: AIPersonality,
): void {
  // 学习率：激进者学得快，保守者学得慢
  const beta = 0.1 + personality.marketAwareness * 0.4;
  // 微小扰动，避免所有交易者完全同步
  const momentum = 0.05 + Math.random() * 0.05;
  const noise = (Math.random() - 0.5) * 0.02;

  // 卖方调整
  if (state.lastSellPrice > 0) {
    if (lastTradePrice > state.lastSellPrice) {
      // 市场愿意出更高价，抬高 μ_sell
      const target = (lastTradePrice / basePrice - 1) + 0.05 + noise;
      state.marginSell = state.marginSell + beta * (target - state.marginSell) * momentum * 10;
    } else if (lastTradePrice < state.lastSellPrice) {
      // 市场出价更低，下调 μ_sell（让卖价更接近 limit）
      const target = Math.max(0.02, (lastTradePrice / basePrice - 1) - 0.02 + noise);
      state.marginSell = state.marginSell + beta * (target - state.marginSell) * momentum * 10;
    }
    state.marginSell = Math.max(0.01, Math.min(0.5, state.marginSell));
  }

  // 买方调整
  if (state.lastBuyPrice > 0) {
    if (lastTradePrice < state.lastBuyPrice) {
      // 市场要价更低，下调 μ_buy（接近 limit）
      const target = Math.max(0.02, (1 - lastTradePrice / basePrice) - 0.02 + noise);
      state.marginBuy = state.marginBuy + beta * (target - state.marginBuy) * momentum * 10;
    } else if (lastTradePrice > state.lastBuyPrice) {
      // 市场要价更高，抬高 μ_buy 同时让 bid 更激进
      const target = (1 - lastTradePrice / basePrice) + 0.05 + noise;
      state.marginBuy = state.marginBuy + beta * (target - state.marginBuy) * momentum * 10;
    }
    state.marginBuy = Math.max(0.01, Math.min(0.5, state.marginBuy));
  }
}

/**
 * 取得最近一笔成交价：优先使用订单簿中价 (mid)，否则用商品当前价
 */
function getLastMarketPrice(world: GameWorld, goodsId: number): number {
  const view = getOrderBookView(world, goodsId);
  if (view.midPrice !== null) return view.midPrice;
  if (view.bestAsk !== null) return view.bestAsk;
  if (view.bestBid !== null) return view.bestBid;
  return world.goods.prices[goodsId];
}

/**
 * ZIP 买方策略
 */
export function zipBuyStrategy(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  personality: AIPersonality,
): TradingSignal | null {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;

  const cash = world.companies.cash[companyId];
  if (cash < goods.basePrice * 5) return null;

  const state = getOrCreateState(companyId, goodsId);
  const lastTradePrice = getLastMarketPrice(world, goodsId);
  updateMargins(state, lastTradePrice, goods.basePrice, personality);

  // 限价：愿意支付的最高价（基准价 + 风险承受溢价）
  const limitBuyPrice = goods.basePrice * (1 + 0.10 + personality.riskTolerance * 0.15);

  // ZIP 报价：limitPrice * (1 - μ_buy)
  const bid = limitBuyPrice * (1 - state.marginBuy);
  state.lastBuyPrice = bid;
  state.lastUpdateTick = world.tick;

  if (bid <= 0) return null;

  const quantity = Math.max(10, Math.min(80, Math.floor(cash / (bid * 4))));

  return {
    goodsId,
    strategy: 'zip',
    action: 'buy',
    strength: 60 + personality.marketAwareness * 20,
    suggestedPrice: bid,
    suggestedQuantity: quantity,
    validUntilTick: world.tick + 18,
    reason: `ZIP 自适应买价 μ=${state.marginBuy.toFixed(3)}`,
  };
}

/**
 * ZIP 卖方策略
 */
export function zipSellStrategy(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  personality: AIPersonality,
): TradingSignal | null {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;

  const inventoryIdx = companyId * GOODS_COUNT + goodsId;
  const inventory = world.companies.inventories[inventoryIdx];
  if (inventory < 10) return null;

  const state = getOrCreateState(companyId, goodsId);
  const lastTradePrice = getLastMarketPrice(world, goodsId);
  updateMargins(state, lastTradePrice, goods.basePrice, personality);

  // 限价：愿意接受的最低价（成本下界，约基准价的 90%）
  const limitSellPrice = goods.basePrice * (0.90 - (1 - personality.riskTolerance) * 0.05);

  // ZIP 报价：limitPrice * (1 + μ_sell)
  const ask = limitSellPrice * (1 + state.marginSell);
  state.lastSellPrice = ask;
  state.lastUpdateTick = world.tick;

  const quantity = Math.max(10, Math.min(80, Math.floor(inventory * 0.15)));

  return {
    goodsId,
    strategy: 'zip',
    action: 'sell',
    strength: 60 + personality.marketAwareness * 20,
    suggestedPrice: ask,
    suggestedQuantity: quantity,
    validUntilTick: world.tick + 18,
    reason: `ZIP 自适应卖价 μ=${state.marginSell.toFixed(3)}`,
  };
}

/**
 * 综合入口：根据库存自动选择买/卖
 */
export function zipStrategy(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  personality: AIPersonality,
): TradingSignal | null {
  const inventoryIdx = companyId * GOODS_COUNT + goodsId;
  const inventory = world.companies.inventories[inventoryIdx];

  const targetInventory = personality.targetInventoryDays * 5;

  if (inventory > targetInventory * 1.5) {
    return zipSellStrategy(world, companyId, goodsId, personality);
  }
  if (inventory < targetInventory * 0.5) {
    return zipBuyStrategy(world, companyId, goodsId, personality);
  }

  return Math.random() < 0.5
    ? zipBuyStrategy(world, companyId, goodsId, personality)
    : zipSellStrategy(world, companyId, goodsId, personality);
}
