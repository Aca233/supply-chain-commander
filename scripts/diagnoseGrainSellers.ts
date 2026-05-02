/**
 * 诊断粮食卖方：为何农业 AI 不愿/无法挂粮食卖单
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

const world = initializeWorld();
const loop = createGameLoop(world);

// 找农业 AI 公司
const FARM_OWNERS: number[] = [];
for (let b = 0; b < world.buildings.count; b++) {
  if (!world.buildings.isActive[b]) continue;
  const typeId = world.buildings.types[b];
  const modeId = world.buildings.outputModeIds[b];
  if (typeId === 10 && modeId === 0) {
    const owner = world.buildings.owners[b];
    if (!FARM_OWNERS.includes(owner)) FARM_OWNERS.push(owner);
  }
}
console.log(`粮食农场 AI 公司: ${FARM_OWNERS.join(',')}\n`);

const SNAPSHOTS = [30, 60, 120, 240, 360, 720];

for (let t = 0; t < 720; t++) {
  loop.manualTick();
  if (SNAPSHOTS.includes(t + 1)) {
    console.log(`--- Tick ${t + 1} ---`);

    const ob = getOrderBookView(world, GoodsId.GRAIN);
    const grainPrice = world.goods.prices[GoodsId.GRAIN];
    console.log(`粮食市价=${grainPrice.toFixed(2)} 总买单=${ob.buyOrders.length} 总卖单=${ob.sellOrders.length}`);
    console.log(`  最高买价=${ob.buyOrders[0]?.price.toFixed(2) ?? '-'}, 最低卖价=${ob.sellOrders[0]?.price.toFixed(2) ?? '-'}`);

    for (const owner of FARM_OWNERS) {
      const grainInv = world.companies.inventories[owner * GOODS_COUNT + GoodsId.GRAIN];
      const reserved = world.companies.inventoryReserved[owner * GOODS_COUNT + GoodsId.GRAIN];
      const sellN = ob.sellOrders.filter(o => o.companyId === owner).length;
      const buyN = ob.buyOrders.filter(o => o.companyId === owner).length;
      const sellsAt = ob.sellOrders.filter(o => o.companyId === owner).map(o => `${o.price.toFixed(1)}@${o.remaining.toFixed(0)}`).join(',');

      // 计算该公司日产能
      let dailyOut = 0;
      let farmCount = 0;
      for (let b = 0; b < world.buildings.count; b++) {
        if (world.buildings.owners[b] !== owner) continue;
        if (!world.buildings.isActive[b]) continue;
        if (world.buildings.types[b] === 10 && world.buildings.outputModeIds[b] === 0) {
          farmCount++;
          dailyOut += 320 / 18; // FARM_GRAIN amount/ticks
        }
      }
      const days = dailyOut > 0 ? grainInv / dailyOut : 999;
      console.log(`  AI${owner}: ${farmCount}个粮食农场 日产${dailyOut.toFixed(0)} 库存=${grainInv.toFixed(0)}(reserved=${reserved.toFixed(0)}) 库存天数=${days.toFixed(1)} 卖单=${sellN}[${sellsAt}] 买单=${buyN}`);
    }
    console.log('');
  }
}

loop.destroy();
