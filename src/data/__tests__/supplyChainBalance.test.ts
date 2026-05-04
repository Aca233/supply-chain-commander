import { beforeEach, describe, expect, it } from 'vitest';

import { AI_COMPANIES } from '@/core/ai/AIPersonality';
import { ALL_BUILDINGS, BUILDINGS_BY_ID } from '@/data/buildings';
import {
  getBuildingProductionVariants,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { ALL_GOODS, GOODS_BY_ID, GoodsId } from '@/data/goods';

interface Flow {
  goodsId: number;
  amount: number;
  ticksRequired: number;
}

function collectAllProductionPaths(): Array<{
  buildingTypeId: number;
  outputModeId?: number;
  inputs: Flow[];
  outputs: Flow[];
  ticksRequired: number;
}> {
  const paths: Array<{
    buildingTypeId: number;
    outputModeId?: number;
    inputs: Flow[];
    outputs: Flow[];
    ticksRequired: number;
  }> = [];

  for (const building of ALL_BUILDINGS) {
    for (const variant of getBuildingProductionVariants(building.id)) {
      const outputModeId = variant.legacyOutputModeId ?? undefined;
      const prod = variant.recipe;
      if (prod.inputs.length === 0 && prod.outputs.length === 0) continue;
      paths.push({
        buildingTypeId: building.id,
        outputModeId,
        inputs: prod.inputs.map((i) => ({
          goodsId: i.goodsId,
          amount: i.amount,
          ticksRequired: prod.ticksRequired,
        })),
        outputs: prod.outputs.map((o) => ({
          goodsId: o.goodsId,
          amount: o.amount,
          ticksRequired: prod.ticksRequired,
        })),
        ticksRequired: prod.ticksRequired,
      });
    }
  }

  return paths;
}

interface DeployedFlows {
  supply: Map<number, number>;
  productionDemand: Map<number, number>;
}

beforeEach(() => {
  initializeBuildingProductionMethods();
  initProductionCache();
});

function aggregateDeployedFlows(): DeployedFlows {
  const supply = new Map<number, number>();
  const productionDemand = new Map<number, number>();

  for (const company of AI_COMPANIES) {
    for (const slot of company.initialBuildings) {
      const prod = getRecipeForBuilding(slot.typeId, slot.slotMethods);
      if (prod.inputs.length === 0 && prod.outputs.length === 0) continue;
      const ticks = prod.ticksRequired || 1;

      for (const out of prod.outputs) {
        const dailyOut = (slot.count * out.amount) / ticks;
        supply.set(out.goodsId, (supply.get(out.goodsId) ?? 0) + dailyOut);
      }
      for (const inp of prod.inputs) {
        const dailyIn = (slot.count * inp.amount) / ticks;
        productionDemand.set(
          inp.goodsId,
          (productionDemand.get(inp.goodsId) ?? 0) + dailyIn,
        );
      }
    }
  }

  return { supply, productionDemand };
}

describe('supply-chain graph self-consistency', () => {
  it('every good consumed as a production input has at least one producer', () => {
    const paths = collectAllProductionPaths();

    const consumed = new Set<number>();
    const produced = new Set<number>();

    for (const path of paths) {
      for (const i of path.inputs) consumed.add(i.goodsId);
      for (const o of path.outputs) produced.add(o.goodsId);
    }

    const missingProducers = Array.from(consumed)
      .filter((g) => !produced.has(g))
      .map((g) => `${GOODS_BY_ID.get(g)?.name ?? '?'}#${g}`);

    expect(missingProducers, `下列商品被生产配方消耗，但全游戏没有任何建筑能产出：${missingProducers.join(', ')}`).toEqual([]);
  });

  it('every produced good either has a downstream consumer or is a final consumer good', () => {
    const INSTITUTIONAL_GOODS = new Set<number>([
      GoodsId.BUILDING_PRODUCTS,
      GoodsId.ENERGY_STORAGE,
      GoodsId.SOLAR_SYSTEM,
      GoodsId.AIRCRAFT_PARTS,
      GoodsId.WIND_BLADE,
      GoodsId.INDUSTRIAL_ROBOT,
      GoodsId.ANTIBIOTICS,
      GoodsId.VACCINE,
      GoodsId.MEDICAL_SUPPLIES,
      GoodsId.MEDICAL_DEVICE,
    ]);

    const paths = collectAllProductionPaths();

    const produced = new Set<number>();
    const consumed = new Set<number>();
    for (const path of paths) {
      for (const o of path.outputs) produced.add(o.goodsId);
      for (const i of path.inputs) consumed.add(i.goodsId);
    }

    const danglingProducers: string[] = [];
    for (const g of produced) {
      if (consumed.has(g)) continue;
      const def = GOODS_BY_ID.get(g);
      if (!def) continue;
      if (def.isConsumerGood) continue;
      if (INSTITUTIONAL_GOODS.has(g)) continue;
      danglingProducers.push(`${def.name}#${g}`);
    }

    expect(danglingProducers, `下列非消费品被某建筑产出，但没有下游建筑消耗它，也不是终端消费品：${danglingProducers.join(', ')}`).toEqual([]);
  });

  it('每条生产配方的产物与原料 goodsId 都在合法 goods 表中', () => {
    const validIds = new Set(ALL_GOODS.map((g) => g.id));
    const paths = collectAllProductionPaths();
    const invalid: string[] = [];

    for (const path of paths) {
      const building = BUILDINGS_BY_ID.get(path.buildingTypeId);
      const label = `${building?.name ?? '?'}#${path.buildingTypeId}` +
        (path.outputModeId !== undefined ? `[mode=${path.outputModeId}]` : '');
      for (const io of [...path.inputs, ...path.outputs]) {
        if (!validIds.has(io.goodsId)) {
          invalid.push(`${label} -> goodsId=${io.goodsId}`);
        }
        if (!Number.isFinite(io.amount) || io.amount < 0) {
          invalid.push(`${label} -> amount=${io.amount} (goodsId=${io.goodsId})`);
        }
        if (!Number.isFinite(io.ticksRequired) || io.ticksRequired <= 0) {
          invalid.push(`${label} -> ticksRequired=${io.ticksRequired}`);
        }
      }
    }

    expect(invalid, `配方包含非法 I/O 项：\n${invalid.join('\n')}`).toEqual([]);
  });
});

describe('AI 部署后的产能/原料需求平衡', () => {
  it('每个商品至少有一个 AI 公司在生产或消费它（不存在“悬空商品”）', () => {
    const { supply, productionDemand } = aggregateDeployedFlows();
    const orphanGoods: string[] = [];

    for (const def of ALL_GOODS) {
      if (def.isService) continue;
      const s = supply.get(def.id) ?? 0;
      const d = productionDemand.get(def.id) ?? 0;
      if (s === 0 && d === 0 && !def.isConsumerGood) {
        orphanGoods.push(`${def.name}#${def.id}`);
      }
    }

    expect(
      orphanGoods,
      `下列非消费品在所有 AI 初始建筑中既无产出也无原料需求：${orphanGoods.join(', ')}`,
    ).toEqual([]);
  });

  it('部署中有产有耗的商品供需比落在工资版健康区间 [0.45, 25]', () => {
    const { supply, productionDemand } = aggregateDeployedFlows();
    const violations: Array<{
      good: string;
      supply: number;
      demand: number;
      ratio: number;
    }> = [];

    for (const def of ALL_GOODS) {
      if (def.isService) continue;
      const s = supply.get(def.id) ?? 0;
      const d = productionDemand.get(def.id) ?? 0;
      if (s <= 0 || d <= 0) continue;
      const ratio = s / d;
      if (ratio < 0.45 || ratio > 25) {
        violations.push({
          good: `${def.name}#${def.id}`,
          supply: Number(s.toFixed(2)),
          demand: Number(d.toFixed(2)),
          ratio: Number(ratio.toFixed(3)),
        });
      }
    }

    expect(
      violations,
      `下列商品的产能/产线需求比超出 [0.45, 25] 工资版健康区间：\n` +
        violations.map((v) => `  ${v.good}: supply=${v.supply}, demand=${v.demand}, ratio=${v.ratio}`).join('\n'),
    ).toEqual([]);
  });

  it('所有商品的供需比都不应超过 1000:1 的极端阈值（含已知失衡项的兜底）', () => {
    const { supply, productionDemand } = aggregateDeployedFlows();
    const extreme: string[] = [];

    for (const def of ALL_GOODS) {
      if (def.isService) continue;
      const s = supply.get(def.id) ?? 0;
      const d = productionDemand.get(def.id) ?? 0;
      if (s > 0 && d > 0) {
        const ratio = s / d;
        if (ratio > 1000 || ratio < 0.001) {
          extreme.push(`${def.name}#${def.id}: supply=${s.toFixed(2)}, demand=${d.toFixed(2)}, ratio=${ratio.toExponential(2)}`);
        }
      }
    }

    expect(extreme, `下列商品供需比超出 1000:1 极端阈值（守住失衡上限）：\n${extreme.join('\n')}`).toEqual([]);
  });
});

describe('工资版供应体系关键瓶颈回归', () => {
  it('塑料与贵金属链不再退回严重短缺区间', () => {
    const baseline: Record<string, { min: number; max: number }> = {
      PLASTIC: { min: 0.5, max: 2.5 },
      GOLD: { min: 0.6, max: 2.5 },
      DIAMOND: { min: 0.5, max: 2.5 },
    };

    const { supply, productionDemand } = aggregateDeployedFlows();
    const violations: string[] = [];

    for (const [key, band] of Object.entries(baseline)) {
      const goodsId = (GoodsId as Record<string, number>)[key];
      const s = supply.get(goodsId) ?? 0;
      const d = productionDemand.get(goodsId) ?? 0;
      if (s === 0 && d === 0) continue;
      const ratio = d === 0 ? Number.POSITIVE_INFINITY : s / d;
      if (ratio < band.min || ratio > band.max) {
        violations.push(
          `${key}: supply=${s.toFixed(2)}, demand=${d.toFixed(2)}, ratio=${
            Number.isFinite(ratio) ? ratio.toFixed(3) : '∞'
          }, allowed=[${band.min}, ${band.max === Infinity ? '∞' : band.max}]`,
        );
      }
    }

    expect(violations, `工资版关键瓶颈超出回归基线带：\n${violations.join('\n')}`).toEqual([]);
  });
});
