/**
 * 长周期市场动态模拟
 *
 * 跑 5 游戏年（1800 ticks），每 360 ticks（1 年）打一次快照：
 *   - 每商品价格漂移（vs basePrice）
 *   - 每商品 AI 库存累积
 *   - 零供应商品计数
 *   - 负现金 AI 数（事实破产）
 *   - 健康商品桶分布
 *
 * 用法：npx tsx scripts/longRunSimulation.ts
 */

import { initializeWorld } from '../src/core/world/WorldInitializer';
import { createGameLoop } from '../src/core/loop/GameLoop';
import { getZeroSupplyGoodsReport } from '../src/core/ai/AIDecisionEngine';
import { ALL_GOODS, GOODS_BY_ID } from '../src/data/goods';
import { GOODS_COUNT } from '../src/core/constants';

function deterministicRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const SEED = Number(process.env.SIM_SEED ?? 1337);
const TOTAL_TICKS = Number(process.env.SIM_TICKS ?? 1800);
const SNAPSHOT_INTERVAL = 360;

Math.random = deterministicRandom(SEED);

console.log(`=== 长周期模拟 seed=${SEED} ticks=${TOTAL_TICKS} ===\n`);

const world = initializeWorld();
const loop = createGameLoop(world);

interface Snapshot {
  tick: number;
  zeroSupply: number;
  negativeCash: number;
  bucket: { 短缺: number; 健康: number; 过剩: number; 极端短缺: number; 极端过剩: number };
  topPriceUp: Array<{ name: string; ratio: number }>;
  topPriceDown: Array<{ name: string; ratio: number }>;
  topInventory: Array<{ name: string; total: number }>;
}

function snapshot(tick: number): Snapshot {
  const zeroSupply = getZeroSupplyGoodsReport(world).length;
  let negativeCash = 0;
  for (let i = 1; i < world.companies.cash.length; i++) {
    if ((world.companies.cash[i] ?? 0) < 0) negativeCash++;
  }

  const bucket = { 短缺: 0, 健康: 0, 过剩: 0, 极端短缺: 0, 极端过剩: 0 };
  const priceRatios: Array<{ name: string; ratio: number }> = [];
  const inventoryTotals: Array<{ name: string; total: number }> = [];

  for (const def of ALL_GOODS) {
    if (def.isService) continue;
    const price = world.goods.prices[def.id] ?? 0;
    const ratio = price / def.basePrice;
    if (Number.isFinite(ratio) && ratio > 0) priceRatios.push({ name: def.name, ratio });

    if (ratio < 0.6) bucket.短缺++;
    else if (ratio > 1.8) bucket.过剩++;
    else bucket.健康++;
    if (ratio < 0.3) bucket.极端短缺++;
    if (ratio > 3) bucket.极端过剩++;

    let total = 0;
    for (let c = 1; c < 200; c++) {
      total += world.companies.inventories[c * GOODS_COUNT + def.id] ?? 0;
    }
    inventoryTotals.push({ name: def.name, total });
  }

  priceRatios.sort((a, b) => b.ratio - a.ratio);
  inventoryTotals.sort((a, b) => b.total - a.total);

  return {
    tick,
    zeroSupply,
    negativeCash,
    bucket,
    topPriceUp: priceRatios.slice(0, 5),
    topPriceDown: priceRatios.slice(-5).reverse(),
    topInventory: inventoryTotals.slice(0, 8),
  };
}

const snapshots: Snapshot[] = [];

const startTime = Date.now();
try {
  for (let t = 0; t < TOTAL_TICKS; t++) {
    loop.manualTick();
    if ((t + 1) % SNAPSHOT_INTERVAL === 0) {
      snapshots.push(snapshot(t + 1));
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`tick ${t + 1}/${TOTAL_TICKS}  elapsed ${elapsed}s`);
    }
  }
} finally {
  loop.destroy();
}

console.log('\n=== 快照详情 ===');
for (const s of snapshots) {
  const year = s.tick / 360;
  console.log(`\n--- Year ${year} (tick ${s.tick}) ---`);
  console.log(`  零供应=${s.zeroSupply}  负现金AI=${s.negativeCash}`);
  console.log(`  桶: 极短=${s.bucket.极端短缺} 短缺=${s.bucket.短缺} 健康=${s.bucket.健康} 过剩=${s.bucket.过剩} 极过=${s.bucket.极端过剩}`);
  console.log(`  价格 Top5 涨: ${s.topPriceUp.map((p) => `${p.name}=${p.ratio.toFixed(2)}x`).join(', ')}`);
  console.log(`  价格 Top5 跌: ${s.topPriceDown.map((p) => `${p.name}=${p.ratio.toFixed(2)}x`).join(', ')}`);
  console.log(`  库存 Top8 (堆积): ${s.topInventory.map((i) => `${i.name}=${i.total.toFixed(0)}`).join(', ')}`);
}

console.log('\n=== 趋势分析 ===');
if (snapshots.length >= 2) {
  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;
  console.log(`零供应: Year1=${first.zeroSupply} → Year${last.tick / 360}=${last.zeroSupply}`);
  console.log(`负现金AI: Year1=${first.negativeCash} → Year${last.tick / 360}=${last.negativeCash}`);
  console.log(`极端项: Y1 极短=${first.bucket.极端短缺}+极过=${first.bucket.极端过剩} → Y${last.tick / 360} 极短=${last.bucket.极端短缺}+极过=${last.bucket.极端过剩}`);
}
