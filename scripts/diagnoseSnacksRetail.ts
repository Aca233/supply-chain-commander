/**
 * 诊断零食产能 + 零售库存消耗速率
 */
import { initializeWorld } from '../src/core/world/WorldInitializer';
import { createGameLoop } from '../src/core/loop/GameLoop';
import { getOrderBookView } from '../src/core/market/OrderBook';
import { GoodsId, GOODS_BY_ID } from '../src/data/goods';
import { GOODS_COUNT, MAX_RETAIL_STORES } from '../src/core/constants';

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

// CONSUMER_GOODS we care about for retail
const CONSUMER_TARGETS = [
  GoodsId.SNACKS, GoodsId.PROCESSED_FOOD, GoodsId.BEVERAGES, GoodsId.FOOD,
  GoodsId.DAIRY, GoodsId.MEAT, GoodsId.CLOTHING, GoodsId.APPLIANCES,
];

console.log('=== 零食供应链 + 零售库存消耗速率诊断 ===\n');

// SNACKS supplier check
const SNACKS_BUILDINGS: number[] = [];
for (let b = 0; b < world.buildings.count; b++) {
  if (!world.buildings.isActive[b]) continue;
  const typeId = world.buildings.types[b];
  const modeId = world.buildings.outputModeIds[b];
  if (typeId === 23 && modeId === 2) {
    SNACKS_BUILDINGS.push(b);
  }
}
console.log(`SNACKS 生产线总数: ${SNACKS_BUILDINGS.length}`);
// detail: each building's owner, GRAIN/PACKAGING input buffer
const MAX_INPUTS_LOCAL = 8;
for (const b of SNACKS_BUILDINGS.slice(0, 5)) {
  const owner = world.buildings.owners[b];
  const grainBuf = world.buildings.inputBuffers[b * MAX_INPUTS_LOCAL + 0]; // GRAIN
  const pkgBuf = world.buildings.inputBuffers[b * MAX_INPUTS_LOCAL + 1]; // PACKAGING
  const ownerCash = world.companies.cash[owner];
  const ownerGrainInv = world.companies.inventories[owner * GOODS_COUNT + GoodsId.GRAIN];
  const ownerPkgInv = world.companies.inventories[owner * GOODS_COUNT + GoodsId.PACKAGING];
  console.log(`  building=${b} owner=${owner} 现金=${ownerCash.toFixed(0)} GRAIN库存=${ownerGrainInv.toFixed(0)} PACKAGING库存=${ownerPkgInv.toFixed(0)} 输入buf[GRAIN]=${grainBuf.toFixed(1)} 输入buf[PACKAGING]=${pkgBuf.toFixed(1)}`);
}

// Run 90 ticks (3 months)
const SNAPSHOTS = [60, 180, 360, 720, 1080, 1440, 1800];
const lastSnacksTrades = { count: 0 };

for (let t = 0; t < 1800; t++) {
  loop.manualTick();
  if (SNAPSHOTS.includes(t + 1)) {
    console.log(`\n--- Tick ${t + 1} ---`);

    // SNACKS state
    const snacksPrice = world.goods.prices[GoodsId.SNACKS];
    const snacksBase = GOODS_BY_ID.get(GoodsId.SNACKS)!.basePrice;
    let snacksInv = 0;
    for (let c = 1; c < 200; c++) snacksInv += world.companies.inventories[c * GOODS_COUNT + GoodsId.SNACKS] ?? 0;
    let snacksTradesCount = 0;
    for (let i = 0; i < world.trades.count; i++) {
      if (world.trades.goodsIds[i] === GoodsId.SNACKS) snacksTradesCount++;
    }
    const snacksTradesDelta = snacksTradesCount - lastSnacksTrades.count;
    lastSnacksTrades.count = snacksTradesCount;
    const snacksOB = getOrderBookView(world, GoodsId.SNACKS);
    console.log(`SNACKS: 价${snacksPrice.toFixed(0)} (${(snacksPrice/snacksBase).toFixed(2)}x), 全 AI 库存=${snacksInv.toFixed(0)}, 累计成交=${snacksTradesCount}, 期间增量=${snacksTradesDelta}, 卖单=${snacksOB.sellOrders.length}, 买单=${snacksOB.buyOrders.length}`);

    // 检查农业 AI 粮食生产 + 挂单
    const FARM_OWNERS = [9, 51, 68, 110]; // 中粮、蒙牛、北大荒、益海嘉里
    for (const owner of FARM_OWNERS) {
      const grainInv = world.companies.inventories[owner * GOODS_COUNT + GoodsId.GRAIN];
      const cottonInv = world.companies.inventories[owner * GOODS_COUNT + GoodsId.COTTON];
      const cashLeft = world.companies.cash[owner];
      // count this owner's grain sell orders
      const ob = getOrderBookView(world, GoodsId.GRAIN);
      const sellN = ob.sellOrders.filter(o => o.companyId === owner).length;
      const buyN = ob.buyOrders.filter(o => o.companyId === owner).length;
      console.log(`  AI${owner}: 现金=${(cashLeft/1e6).toFixed(0)}M GRAIN库存=${grainInv.toFixed(0)} COTTON库存=${cottonInv.toFixed(0)} 粮食卖单=${sellN} 粮食买单=${buyN}`);
    }

    // 公司 20 (统一食品) 粮食情况
    const c20Cash = world.companies.cash[20];
    const c20Grain = world.companies.inventories[20 * GOODS_COUNT + GoodsId.GRAIN];
    const c20Pkg = world.companies.inventories[20 * GOODS_COUNT + GoodsId.PACKAGING];
    const grainOB = getOrderBookView(world, GoodsId.GRAIN);
    const c20BuyGrain = grainOB.buyOrders.filter(o => o.companyId === 20).length;
    const c20SellGrain = grainOB.sellOrders.filter(o => o.companyId === 20).length;
    console.log(`公司20 现金=${(c20Cash/1e6).toFixed(0)}M GRAIN=${c20Grain.toFixed(0)} PACKAGING=${c20Pkg.toFixed(0)} 粮食买单=${c20BuyGrain} 粮食卖单=${c20SellGrain}`);
    const grainPrice = world.goods.prices[GoodsId.GRAIN];
    const grainSellAsk = grainOB.sellOrders[0]?.price ?? 0;
    console.log(`粮食市价=${grainPrice.toFixed(2)} 最低卖价=${grainSellAsk.toFixed(2)} 全市场粮食卖单=${grainOB.sellOrders.length}`);

    // Retail inventory check
    const retail = world.retail;
    let totalStores = retail.count;
    let totalCapacity = 0;
    let totalInv = 0;
    const goodsInv: Record<number, { inv: number, cap: number }> = {};
    for (let s = 0; s < retail.count; s++) {
      for (let g = 0; g < 80; g++) {
        const inv = retail.inventories[s * GOODS_COUNT + g] ?? 0;
        const cap = retail.inventoryCapacities[s * GOODS_COUNT + g] ?? 0;
        totalInv += inv;
        totalCapacity += cap;
        if (CONSUMER_TARGETS.includes(g)) {
          if (!goodsInv[g]) goodsInv[g] = { inv: 0, cap: 0 };
          goodsInv[g].inv += inv;
          goodsInv[g].cap += cap;
        }
      }
    }
    console.log(`零售: ${totalStores} 家店, 总库存=${totalInv.toFixed(0)}/${totalCapacity.toFixed(0)} (${(totalInv/Math.max(1,totalCapacity)*100).toFixed(0)}%)`);
    for (const gid of CONSUMER_TARGETS) {
      const def = GOODS_BY_ID.get(gid)!;
      const data = goodsInv[gid];
      if (data && data.cap > 0) {
        console.log(`  ${def.name.padEnd(8)}: ${data.inv.toFixed(0)}/${data.cap.toFixed(0)} (${(data.inv/data.cap*100).toFixed(0)}%)`);
      }
    }
  }
}

loop.destroy();
