/**
 * 对比 world.goods.prices[i] 与订单簿 VWAP24h
 *
 * 假设：PriceEngine 算出的 prices[i] 与真实成交价（VWAP24h）严重脱节，
 *      把"极端过剩"幻觉强加给我们。
 *
 * 跑 360 ticks 后对全部商品输出对比表，按偏差排序。
 */

import { initializeWorld } from '../src/core/world/WorldInitializer';
import { createGameLoop } from '../src/core/loop/GameLoop';
import { getPriceCache } from '../src/core/market/PriceCache';
import { ALL_GOODS } from '../src/data/goods';

function deterministicRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

Math.random = deterministicRandom(1337);

const world = initializeWorld();
const loop = createGameLoop(world);

try {
  for (let t = 0; t < 360; t++) loop.manualTick();
} finally {
  loop.destroy();
}

const cache = getPriceCache();
cache.update(world);

interface Row {
  name: string;
  basePrice: number;
  enginePrice: number;
  vwap: number | null;
  enginRatio: number;
  vwapRatio: number | null;
  divergence: number; // |enginRatio - vwapRatio|
  volume: number;
}

const rows: Row[] = [];
for (const def of ALL_GOODS) {
  if (def.isService) continue;
  const enginePrice = world.goods.prices[def.id];
  const vwap = cache.getVWAP24h(def.id);
  const volume = cache.getVolume24h(def.id);
  const enginRatio = enginePrice / def.basePrice;
  const vwapRatio = vwap !== null ? vwap / def.basePrice : null;
  const divergence = vwapRatio !== null ? Math.abs(enginRatio - vwapRatio) : -1;
  rows.push({
    name: def.name,
    basePrice: def.basePrice,
    enginePrice,
    vwap,
    enginRatio,
    vwapRatio,
    divergence,
    volume,
  });
}

// 按 divergence 降序
rows.sort((a, b) => b.divergence - a.divergence);

console.log('Y1 (tick 360) 价格脱节对比 - 按偏差降序');
console.log('| 商品 | 基准价 | Engine价 | Engine倍率 | VWAP | VWAP倍率 | 偏差 | 24h成交 |');
console.log('|------|--------|---------|-----------|------|---------|------|---------|');
for (const r of rows.slice(0, 30)) {
  const vwapStr = r.vwap !== null ? r.vwap.toFixed(0) : 'null';
  const vwapRatStr = r.vwapRatio !== null ? r.vwapRatio.toFixed(2) + 'x' : '—';
  const divStr = r.divergence >= 0 ? r.divergence.toFixed(2) : '—';
  console.log(
    `| ${r.name} | ${r.basePrice} | ${r.enginePrice.toFixed(0)} | ${r.enginRatio.toFixed(2)}x | ${vwapStr} | ${vwapRatStr} | ${divStr} | ${r.volume.toFixed(0)} |`,
  );
}

// 统计
const withVwap = rows.filter((r) => r.vwap !== null);
const noVwap = rows.filter((r) => r.vwap === null);
const overstate = withVwap.filter((r) => r.enginRatio > 2 && r.vwapRatio !== null && r.vwapRatio < 1.8);
const understate = withVwap.filter((r) => r.enginRatio < 0.7 && r.vwapRatio !== null && r.vwapRatio > 0.9);

console.log(`\n=== 统计 ===`);
console.log(`总商品: ${rows.length}`);
console.log(`有真实 VWAP（24h 内有成交）: ${withVwap.length}`);
console.log(`无 VWAP: ${noVwap.length}`);
console.log(`Engine 报"过剩 >2x" 但实际 VWAP < 1.8x: ${overstate.length}`);
console.log(`Engine 报"短缺 <0.7x" 但实际 VWAP > 0.9x: ${understate.length}`);
if (overstate.length > 0) {
  console.log(`\n虚假过剩商品（Engine 错误判定）:`);
  for (const r of overstate) {
    console.log(`  ${r.name}: Engine ${r.enginRatio.toFixed(2)}x vs VWAP ${r.vwapRatio!.toFixed(2)}x`);
  }
}
if (understate.length > 0) {
  console.log(`\n虚假短缺商品（Engine 错误判定）:`);
  for (const r of understate) {
    console.log(`  ${r.name}: Engine ${r.enginRatio.toFixed(2)}x vs VWAP ${r.vwapRatio!.toFixed(2)}x`);
  }
}
