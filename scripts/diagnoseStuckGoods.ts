/**
 * 触顶商品深度诊断
 *
 * 跑 720 ticks，每月（30 ticks）追踪 5 个常年触顶商品的：
 *   - 价格 / 基准价比
 *   - world.goods.supplies / demands (本 tick 计算值)
 *   - AI 库存总和
 *   - OrderBook bestBid / bestAsk / 挂单数
 *   - 实际成交量（trades 增量）
 *
 * 用法：npx tsx scripts/diagnoseStuckGoods.ts
 */

import { initializeWorld } from '../src/core/world/WorldInitializer';
import { createGameLoop } from '../src/core/loop/GameLoop';
import { getOrderBookView } from '../src/core/market/OrderBook';
import { GoodsId, GOODS_BY_ID } from '../src/data/goods';
import { GOODS_COUNT } from '../src/core/constants';

function deterministicRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

Math.random = deterministicRandom(1337);

const TARGETS = [
  GoodsId.ELECTRONICS,
  GoodsId.PACKAGING,
  GoodsId.BUILDING_PRODUCTS,
  GoodsId.AIRCRAFT_PARTS,
  GoodsId.ANTIBIOTICS,
];

const world = initializeWorld();
const loop = createGameLoop(world);

console.log('tick,month,name,priceRatio,supply,demand,inventory,bestBid,bestAsk,buyOrders,sellOrders,tradesLast30');

const lastTradeCount = new Map<number, number>();

try {
  for (let t = 0; t < 720; t++) {
    loop.manualTick();

    if ((t + 1) % 30 === 0) {
      const month = Math.floor((t + 1) / 30);
      for (const gid of TARGETS) {
        const def = GOODS_BY_ID.get(gid)!;
        const price = world.goods.prices[gid];
        const ratio = price / def.basePrice;
        const supply = world.goods.supplies[gid];
        const demand = world.goods.demands[gid];

        let inv = 0;
        for (let c = 1; c < 200; c++) {
          inv += world.companies.inventories[c * GOODS_COUNT + gid] ?? 0;
        }

        const view = getOrderBookView(world, gid);
        const bestBid = view.buyOrders[0]?.price ?? 0;
        const bestAsk = view.sellOrders[0]?.price ?? 0;
        const buyN = view.buyOrders.length;
        const sellN = view.sellOrders.length;

        // count trades for this good in trades buffer
        let tradesNow = 0;
        for (let i = 0; i < world.trades.count; i++) {
          if (world.trades.goodsIds[i] === gid) tradesNow++;
        }
        const tradesLast = tradesNow - (lastTradeCount.get(gid) ?? 0);
        lastTradeCount.set(gid, tradesNow);

        console.log(
          `${t + 1},${month},${def.name},${ratio.toFixed(2)},${supply.toFixed(0)},${demand.toFixed(0)},${inv.toFixed(0)},${bestBid.toFixed(2)},${bestAsk.toFixed(2)},${buyN},${sellN},${tradesLast}`,
        );
      }
    }
  }
} finally {
  loop.destroy();
}
