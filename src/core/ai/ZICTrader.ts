/**
 * Zero-Intelligence Constrained (ZIC) 报价策略
 *
 * 灵感来源：Bristol Stock Exchange (BSE) 学术参考实现中的经典基线算法
 * （Gode & Sunder 1993 提出的 Zero-Intelligence-Constrained 交易者）。
 *
 * 核心思想：
 *   - 买方：在 [floorPrice, limitBuyPrice] 范围内均匀随机出价，limit 由商品基准价 + 风险偏好决定
 *   - 卖方：在 [limitSellPrice, ceilPrice] 范围内均匀随机要价，limit 由商品成本下界决定
 *   - 不使用任何技术指标 / 趋势 / 学习；仅受成本与限价约束
 *
 * 用途：
 *   - 作为 conservative / cost_leader 人格的基线策略
 *   - 提供市场流动性，吸收订单簿尖刺
 *   - 在静态供需下应能与对手交易者一起将成交价收敛到均衡区间（Smith 收敛性）
 *
 * 注意：
 *   - 本文件仅参考算法思想，未直接拷贝 BSE GPL 源码
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS } from '@/data/goods';
import { GOODS_COUNT } from '@/core/constants';
import { getOrderBookView } from '@/core/market/OrderBook';
import { AIPersonality } from './AIPersonality';
import type { TradingSignal } from './AdvancedTrading';

/**
 * 以买方视角生成 ZIC 限价单信号
 *
 * limitPrice 为该买方愿意支付的最高价（来自商品基准价 + 风险溢价）；
 * 实际报价在 [floor, limitPrice] 间均匀随机抽样。
 */
export function zicBuyStrategy(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  personality: AIPersonality,
): TradingSignal | null {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;

  const inventoryIdx = companyId * GOODS_COUNT + goodsId;
  const inventory = world.companies.inventories[inventoryIdx];
  const cash = world.companies.cash[companyId];

  // 现金不足 / 库存已饱和则不出价
  if (cash < goods.basePrice * 5) return null;
  if (inventory > goods.basePrice * 0.0 + 1000) return null;

  const view = getOrderBookView(world, goodsId);
  const currentPrice = world.goods.prices[goodsId] || goods.basePrice;

  // 买方限价：保守者愿意支付的上限较低，激进者更高
  const buyMargin = 0.05 + personality.riskTolerance * 0.20;
  const limitBuyPrice = goods.basePrice * (1 + buyMargin);
  const floor = Math.max(goods.basePrice * 0.5, currentPrice * 0.7);

  if (limitBuyPrice <= floor) return null;

  // 在 [floor, limitBuyPrice] 内均匀随机
  const bid = floor + Math.random() * (limitBuyPrice - floor);

  // 不优于 best ask 时不强行出价（避免立刻吃单成本过高）
  if (view.bestAsk !== null && bid > view.bestAsk * 1.02) {
    return null;
  }

  const quantity = Math.max(10, Math.min(50, Math.floor(cash / (bid * 4))));

  return {
    goodsId,
    strategy: 'zic',
    action: 'buy',
    strength: 55,
    suggestedPrice: bid,
    suggestedQuantity: quantity,
    validUntilTick: world.tick + 24,
    reason: `ZIC 随机买价 [${floor.toFixed(2)}, ${limitBuyPrice.toFixed(2)}]`,
  };
}

/**
 * 以卖方视角生成 ZIC 限价单信号
 *
 * limitPrice 为成本底线（不低于此价不愿卖）；
 * 实际报价在 [limitSellPrice, ceil] 间均匀随机抽样。
 */
export function zicSellStrategy(
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

  const view = getOrderBookView(world, goodsId);
  const currentPrice = world.goods.prices[goodsId] || goods.basePrice;

  // 卖方成本底线：保守者要求更高利润，激进者愿低价快速出货
  const sellMargin = 0.05 + (1 - personality.riskTolerance) * 0.15;
  const limitSellPrice = goods.basePrice * (1 - sellMargin * 0.5);
  const ceil = Math.max(limitSellPrice * 1.3, currentPrice * 1.3);

  if (ceil <= limitSellPrice) return null;

  const ask = limitSellPrice + Math.random() * (ceil - limitSellPrice);

  if (view.bestBid !== null && ask < view.bestBid * 0.98) {
    return null;
  }

  const quantity = Math.max(10, Math.min(50, Math.floor(inventory * 0.1)));

  return {
    goodsId,
    strategy: 'zic',
    action: 'sell',
    strength: 55,
    suggestedPrice: ask,
    suggestedQuantity: quantity,
    validUntilTick: world.tick + 24,
    reason: `ZIC 随机卖价 [${limitSellPrice.toFixed(2)}, ${ceil.toFixed(2)}]`,
  };
}

/**
 * 综合入口：根据库存与现金状况自动选择买/卖方向
 */
export function zicStrategy(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  personality: AIPersonality,
): TradingSignal | null {
  const inventoryIdx = companyId * GOODS_COUNT + goodsId;
  const inventory = world.companies.inventories[inventoryIdx];
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return null;

  // 库存高于阈值倾向卖出，低于阈值且有现金倾向买入
  const inventoryDays = personality.targetInventoryDays;
  const targetInventory = inventoryDays * 5;

  if (inventory > targetInventory * 1.5) {
    return zicSellStrategy(world, companyId, goodsId, personality);
  }
  if (inventory < targetInventory * 0.5) {
    return zicBuyStrategy(world, companyId, goodsId, personality);
  }

  // 中间区间：随机决定，提供流动性
  return Math.random() < 0.5
    ? zicBuyStrategy(world, companyId, goodsId, personality)
    : zicSellStrategy(world, companyId, goodsId, personality);
}
