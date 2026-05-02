import { beforeEach, describe, expect, it } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { resetOrderPool } from '@/core/market/OrderBook';
import { createGameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS, GoodsId } from '@/data/goods';
import { AI_PERSONALITIES } from '../AIPersonality';
import { resetZIPState, zipBuyStrategy, zipSellStrategy } from '../ZIPTrader';

/**
 * 准备一个空白 world：仅注入商品基础数据，不创建建筑/订单
 */
function makeWorld() {
  const world = createGameWorld();
  world.goods.count = ALL_GOODS.length;
  for (const goods of ALL_GOODS) {
    world.goods.baseValues[goods.id] = goods.basePrice;
    world.goods.prices[goods.id] = goods.basePrice;
    world.goods.supplies[goods.id] = 100;
    world.goods.demands[goods.id] = 100;
  }
  world.companies.count = 1;
  world.companies.cash[0] = 10_000_000;
  return world;
}

/**
 * BSE ZIP 收敛性核心断言：
 * 在静态市场反馈（lastTradePrice 持续高于 self ask）下，
 * 卖方 marginSell 应单调上升 → 报价上行；
 * 在 lastTradePrice 持续低于 self bid 下，
 * 买方 marginBuy 应单调上升 → 报价下行。
 */
describe('ZIPTrader convergence', () => {
  beforeEach(() => {
    resetOrderPool();
    resetZIPState();
  });

  it('卖方报价在市场偏高反馈下应抬升', () => {
    const world = makeWorld();
    const goodsId = GoodsId.GRAIN;
    const goods = ALL_GOODS.find(g => g.id === goodsId)!;

    // 给公司足够库存
    world.companies.inventories[0 * GOODS_COUNT + goodsId] = 10_000;

    // 市场反馈价 = basePrice * 1.20（持续高于 ZIP 初始 ask）
    world.goods.prices[goodsId] = goods.basePrice * 1.20;

    const personality = AI_PERSONALITIES.aggressive;

    const asks: number[] = [];
    for (let i = 0; i < 30; i++) {
      const sig = zipSellStrategy(world, 0, goodsId, personality);
      if (sig) asks.push(sig.suggestedPrice);
      world.tick++;
    }

    expect(asks.length).toBeGreaterThan(20);
    const firstAvg = asks.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const lastAvg = asks.slice(-5).reduce((a, b) => a + b, 0) / 5;

    // 期望最后 5 次报价均价显著高于前 5 次
    expect(lastAvg).toBeGreaterThan(firstAvg);
  });

  it('买方报价在市场偏低反馈下应下行', () => {
    const world = makeWorld();
    const goodsId = GoodsId.GRAIN;
    const goods = ALL_GOODS.find(g => g.id === goodsId)!;

    world.goods.prices[goodsId] = goods.basePrice * 0.80;

    const personality = AI_PERSONALITIES.aggressive;

    const bids: number[] = [];
    for (let i = 0; i < 30; i++) {
      const sig = zipBuyStrategy(world, 0, goodsId, personality);
      if (sig) bids.push(sig.suggestedPrice);
      world.tick++;
    }

    expect(bids.length).toBeGreaterThan(20);
    const firstAvg = bids.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const lastAvg = bids.slice(-5).reduce((a, b) => a + b, 0) / 5;

    // marginBuy 上升 → bid = limit*(1-μ) 下降
    expect(lastAvg).toBeLessThan(firstAvg);
  });

  it('报价始终被 limitPrice 约束（卖方不低于成本下界，买方不高于支付上限）', () => {
    const world = makeWorld();
    const goodsId = GoodsId.GRAIN;
    const goods = ALL_GOODS.find(g => g.id === goodsId)!;
    world.companies.inventories[0 * GOODS_COUNT + goodsId] = 10_000;

    const personality = AI_PERSONALITIES.conservative;

    // 极端反馈下检查约束
    for (const factor of [0.3, 0.5, 1.0, 1.5, 2.0]) {
      world.goods.prices[goodsId] = goods.basePrice * factor;

      const sellSig = zipSellStrategy(world, 0, goodsId, personality);
      if (sellSig) {
        // 卖价应高于成本底线（limitSellPrice = basePrice * ~0.85）
        expect(sellSig.suggestedPrice).toBeGreaterThan(goods.basePrice * 0.80);
      }

      const buySig = zipBuyStrategy(world, 0, goodsId, personality);
      if (buySig) {
        // 买价应低于支付上限（limitBuyPrice = basePrice * ~1.10）
        expect(buySig.suggestedPrice).toBeLessThan(goods.basePrice * 1.30);
      }

      world.tick++;
    }
  });
});
