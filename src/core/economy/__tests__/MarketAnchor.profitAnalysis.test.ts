/**
 * 利润分析测试 — 用 TCP 计算每个建筑每个生产方式的日利润率
 * 目标：找出不平衡的配方（利润过高/过低/亏损）
 */
import { it } from 'vitest';
import { calculateAnchorPrices, DEFAULT_ANCHOR_CONFIG } from '../MarketAnchor';
import { DEFAULT_BUILDING_PRODUCTION_BY_ID } from '@/core/production/methods/defaultConfigs';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';

it('打印每个生产方式的利润分析', () => {
  const result = calculateAnchorPrices(DEFAULT_ANCHOR_CONFIG);
  const tcp = result.tcp;

  const lines: string[] = [
    `=== 生产方式利润分析（基于 TCP）===`,
    ``,
    `${'建筑ID'.padStart(4)} | ${'建筑名称'.padEnd(10)} | ${'模式'.padEnd(12)} | ${'日输入成本'.padStart(10)} | ${'日输出价值'.padStart(10)} | ${'固定成本'.padStart(8)} | ${'日利润'.padStart(10)} | ${'利润率'.padStart(8)} | ${'ROI天数'.padStart(7)}`,
    `${'-'.repeat(110)}`,
  ];

  const entries = Object.entries(DEFAULT_BUILDING_PRODUCTION_BY_ID);
  for (const [bIdStr, def] of entries) {
    const bId = Number(bIdStr);
    if (!def || def.variants.length === 0) continue;

    const bDef = BUILDINGS_BY_ID.get(bId);
    if (!bDef) continue;

    const fixedCost = bDef.maintenanceCost + bDef.laborCost + bDef.energyCost;

    for (const variant of def.variants) {
      // 日输入成本
      let inputCost = 0;
      for (const inp of variant.inputs) {
        inputCost += inp.amount * tcp[inp.goodsId];
      }
      // 电力成本
      const energyCost = (variant.energyRequired || 0) * tcp[GoodsId.ELECTRICITY];

      // 日输出价值
      let outputValue = 0;
      for (const out of variant.outputs) {
        outputValue += out.amount * tcp[out.goodsId];
      }

      const totalCost = inputCost + energyCost + fixedCost;
      const profit = outputValue - totalCost;
      const marginPct = outputValue > 0 ? ((profit / outputValue) * 100).toFixed(1) : 'N/A';
      const roiDays = profit > 0 ? Math.round(bDef.buildCost / profit) : -1;

      const bName = bDef.name.padEnd(10);
      const mName = variant.name.padEnd(12);

      lines.push(
        `${String(bId).padStart(4)} | ${bName} | ${mName} | ${inputCost.toFixed(0).padStart(10)} | ${outputValue.toFixed(0).padStart(10)} | ${String(fixedCost).padStart(8)} | ${profit.toFixed(0).padStart(10)} | ${String(marginPct).padStart(7)}% | ${String(roiDays).padStart(7)}`,
      );
    }
  }

  // 汇总
  lines.push('');
  lines.push('=== 按利润率排序（前10高 + 后10低）===');

  type Row = { bId: number; bName: string; mName: string; profit: number; margin: number; roiDays: number; outputValue: number };
  const rows: Row[] = [];

  for (const [bIdStr, def] of entries) {
    const bId = Number(bIdStr);
    if (!def || def.variants.length === 0) continue;
    const bDef = BUILDINGS_BY_ID.get(bId);
    if (!bDef) continue;
    const fixedCost = bDef.maintenanceCost + bDef.laborCost + bDef.energyCost;

    for (const variant of def.variants) {
      let inputCost = 0;
      for (const inp of variant.inputs) inputCost += inp.amount * tcp[inp.goodsId];
      const energyCost = (variant.energyRequired || 0) * tcp[GoodsId.ELECTRICITY];
      let outputValue = 0;
      for (const out of variant.outputs) outputValue += out.amount * tcp[out.goodsId];
      const totalCost = inputCost + energyCost + fixedCost;
      const profit = outputValue - totalCost;
      const margin = outputValue > 0 ? (profit / outputValue) * 100 : -999;
      const roiDays = profit > 0 ? Math.round(bDef.buildCost / profit) : -1;
      rows.push({ bId, bName: bDef.name, mName: variant.name, profit, margin, roiDays, outputValue });
    }
  }

  rows.sort((a, b) => b.margin - a.margin);

  lines.push('');
  lines.push('--- 利润率最高 TOP 10 ---');
  for (const r of rows.slice(0, 10)) {
    lines.push(`  [${r.bId}] ${r.bName} / ${r.mName}: 利润率=${r.margin.toFixed(1)}%, 日利润=¥${r.profit.toFixed(0)}, ROI=${r.roiDays}天, 日产值=¥${r.outputValue.toFixed(0)}`);
  }

  lines.push('');
  lines.push('--- 利润率最低 / 亏损 BOTTOM 10 ---');
  for (const r of rows.slice(-10)) {
    lines.push(`  [${r.bId}] ${r.bName} / ${r.mName}: 利润率=${r.margin.toFixed(1)}%, 日利润=¥${r.profit.toFixed(0)}, ROI=${r.roiDays}天, 日产值=¥${r.outputValue.toFixed(0)}`);
  }

  // 按 Tier 汇总平均利润率
  lines.push('');
  lines.push('=== 按建筑类型平均利润率 ===');
  const catMap: Record<string, number[]> = {};
  for (const r of rows) {
    const bDef = BUILDINGS_BY_ID.get(r.bId);
    const cat = bDef?.category || 'unknown';
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push(r.margin);
  }
  for (const [cat, margins] of Object.entries(catMap)) {
    const avg = margins.reduce((s, m) => s + m, 0) / margins.length;
    const min = Math.min(...margins);
    const max = Math.max(...margins);
    lines.push(`  ${cat.padEnd(14)}: 平均=${avg.toFixed(1)}%, 最低=${min.toFixed(1)}%, 最高=${max.toFixed(1)}% (${margins.length}种配方)`);
  }

  console.log(lines.join('\n'));
});
