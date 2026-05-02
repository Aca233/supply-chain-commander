import { AI_COMPANIES } from '../src/core/ai/AIPersonality';
import { getBuildingProduction } from '../src/data/buildings';
import { ALL_GOODS, GOODS_BY_ID } from '../src/data/goods';

const supply = new Map<number, number>();
const demand = new Map<number, number>();

for (const company of AI_COMPANIES) {
  for (const slot of company.initialBuildings) {
    const prod = getBuildingProduction(slot.typeId, slot.outputModeId);
    if (!prod) continue;
    const ticks = prod.ticksRequired || 1;
    for (const out of prod.outputs) {
      supply.set(out.goodsId, (supply.get(out.goodsId) ?? 0) + (slot.count * out.amount) / ticks);
    }
    for (const inp of prod.inputs) {
      demand.set(inp.goodsId, (demand.get(inp.goodsId) ?? 0) + (slot.count * inp.amount) / ticks);
    }
  }
}

interface Row {
  id: number;
  name: string;
  s: number;
  d: number;
  ratio: number;
  tag: string;
}

const rows: Row[] = [];
for (const def of ALL_GOODS) {
  if (def.isService) continue;
  const s = supply.get(def.id) ?? 0;
  const d = demand.get(def.id) ?? 0;
  const ratio = d === 0 ? (s === 0 ? 0 : Infinity) : s / d;
  let tag = '';
  if (s === 0 && d === 0) tag = '悬空';
  else if (s === 0) tag = '零产能';
  else if (d === 0) tag = def.isConsumerGood ? '终端品' : 'B2G/无下游';
  else if (ratio < 0.5) tag = '短缺';
  else if (ratio > 2) tag = '过剩';
  else tag = '健康';
  rows.push({ id: def.id, name: def.name, s, d, ratio, tag });
}

const buckets: Record<string, Row[]> = {};
for (const r of rows) (buckets[r.tag] ??= []).push(r);

const order = ['零产能', '短缺', '健康', '过剩', 'B2G/无下游', '终端品', '悬空'];
console.log(`总 ${rows.length} 种非服务商品`);
console.log('分布:', order.map((t) => `${t}=${buckets[t]?.length ?? 0}`).join('  '));

for (const tag of order) {
  const list = buckets[tag];
  if (!list?.length) continue;
  console.log(`\n=== ${tag} (${list.length}) ===`);
  list.sort((a, b) => {
    if (tag === '短缺') return a.ratio - b.ratio;
    if (tag === '过剩') return b.ratio - a.ratio;
    return a.id - b.id;
  });
  for (const r of list) {
    const ratioStr = !Number.isFinite(r.ratio)
      ? '∞'
      : r.ratio === 0
        ? '-'
        : r.ratio.toFixed(2);
    console.log(
      `  #${String(r.id).padStart(2)} ${r.name.padEnd(14)} s=${r.s.toFixed(1).padStart(8)}  d=${r.d.toFixed(1).padStart(8)}  s/d=${ratioStr}`,
    );
  }
}

const sev = rows.filter((r) => r.tag === '短缺' && r.ratio < 0.2);
const ovr = rows.filter((r) => r.tag === '过剩' && r.ratio > 5);
console.log(`\n极端短缺(<0.2): ${sev.length}  极端过剩(>5): ${ovr.length}`);
