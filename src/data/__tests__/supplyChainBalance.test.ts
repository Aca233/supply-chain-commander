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

const DEMANDLESS_GUARDED_GOODS = new Set<number>([
  GoodsId.ELECTRICITY,
  GoodsId.FUEL,
]);

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
  const KNOWN_IMBALANCED = new Set<number>([
    GoodsId.HERBS,
    GoodsId.GRAIN,
    GoodsId.ELECTRICITY,
    GoodsId.FUEL,
    GoodsId.GENERIC_DRUG,
    GoodsId.OTC_DRUG,
    GoodsId.MEDICAL_SUPPLIES,
    GoodsId.GOLD,
    GoodsId.DIAMOND,
    GoodsId.CAR_PARTS,
    GoodsId.SILK,
    GoodsId.RARE_EARTH,
    GoodsId.PHARMA_BASE,
  ]);

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

  it('健康商品的部署供需比落在宽松健康区间 [0.05, 50]（极端不健康项已豁免）', () => {
    const { supply, productionDemand } = aggregateDeployedFlows();
    const violations: Array<{
      good: string;
      supply: number;
      demand: number;
      ratio: number;
    }> = [];

    for (const def of ALL_GOODS) {
      if (def.isService) continue;
      if (KNOWN_IMBALANCED.has(def.id)) continue;
      const s = supply.get(def.id) ?? 0;
      const d = productionDemand.get(def.id) ?? 0;
      if (s <= 0 || d <= 0) continue;
      const ratio = s / d;
      if (ratio < 0.05 || ratio > 50) {
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
      `下列商品的产能/产线需求比超出 [0.05, 50] 健康区间：\n` +
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

describe('已知失衡商品的回归基线', () => {
  it('每个已知失衡商品都至少有一处供给来源（彻底零产出会让市场无法自愈）', () => {
    const { supply } = aggregateDeployedFlows();
    const guarded: number[] = [
      GoodsId.HERBS,
      GoodsId.GRAIN,
      GoodsId.ELECTRICITY,
      GoodsId.FUEL,
      GoodsId.GENERIC_DRUG,
      GoodsId.OTC_DRUG,
      GoodsId.GOLD,
      GoodsId.DIAMOND,
      GoodsId.CAR_PARTS,
      GoodsId.SILK,
      GoodsId.RARE_EARTH,
      GoodsId.PHARMA_BASE,
      GoodsId.MEDICAL_SUPPLIES,
    ];

    const zeroSupply = guarded
      .filter((g) => !DEMANDLESS_GUARDED_GOODS.has(g))
      .filter((g) => (supply.get(g) ?? 0) <= 0)
      .map((g) => `${GOODS_BY_ID.get(g)?.name ?? '?'}#${g}`);

    expect(zeroSupply, `下列已知失衡商品当前产能为 0，市场无法自愈：${zeroSupply.join(', ')}`).toEqual([]);
  });

  it('已知失衡商品的供需比不得在当前基础上恶化超过 2 倍（防止平衡补丁误改放大问题）', () => {
    const baseline: Record<string, { min: number; max: number }> = {
      HERBS: { min: 0, max: 8 },
      GRAIN: { min: 0, max: 6 },
      GENERIC_DRUG: { min: 0, max: Infinity },
      OTC_DRUG: { min: 0, max: Infinity },
      MEDICAL_SUPPLIES: { min: 0.5, max: Infinity },
      GOLD: { min: 0.3, max: Infinity },
      DIAMOND: { min: 0, max: Infinity },
      CAR_PARTS: { min: 0.3, max: Infinity },
      SILK: { min: 0.3, max: Infinity },
      RARE_EARTH: { min: 0.3, max: Infinity },
      PHARMA_BASE: { min: 0.3, max: Infinity },
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

    expect(violations, `已知失衡商品超出回归基线带：\n${violations.join('\n')}`).toEqual([]);
  });
});
