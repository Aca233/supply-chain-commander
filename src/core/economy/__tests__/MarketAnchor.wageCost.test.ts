import { it } from 'vitest';
import { DEFAULT_BUILDING_PRODUCTION_BY_ID } from '@/core/production/methods/defaultConfigs';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';

it('对比 building.laborCost vs 实际 workforce 工资', () => {
  const WAGES = [120, 260, 520]; // basic, technical, management

  const entries = Object.entries(DEFAULT_BUILDING_PRODUCTION_BY_ID);
  const lines: string[] = ['=== laborCost vs wageCost 对比 ===', ''];

  for (const [bIdStr, def] of entries) {
    const bId = Number(bIdStr);
    if (!def || def.variants.length === 0) continue;
    const bDef = BUILDINGS_BY_ID.get(bId);
    if (!bDef) continue;

    for (const variant of def.variants) {
      const wf = variant.workforceRequired;
      const wageCost = wf.basic * WAGES[0] + wf.technical * WAGES[1] + wf.management * WAGES[2];
      const buildingLabor = bDef.laborCost;
      const ratio = wageCost / buildingLabor;

      // 输出价值
      let outputValue = 0;
      for (const out of variant.outputs) {
        const bp = ALL_GOODS[out.goodsId]?.basePrice ?? 0;
        outputValue += out.amount * bp;
      }

      const realTotalCost = bDef.maintenanceCost + wageCost;
      let inputCost = 0;
      for (const inp of variant.inputs) {
        const bp = ALL_GOODS[inp.goodsId]?.basePrice ?? 0;
        inputCost += inp.amount * bp;
      }
      const energyCost = (variant.energyRequired || 0) * 0.68;
      const margin = outputValue > 0 ? (outputValue - inputCost - energyCost - realTotalCost) / outputValue : -999;

      if (margin < 0.08) {
        lines.push(
          `[${bId}] ${bDef.name}/${variant.name}: ` +
          `laborCost=¥${buildingLabor}, wageCost=¥${wageCost} (${ratio.toFixed(1)}x), ` +
          `maint=¥${bDef.maintenanceCost}, totalFixed=¥${realTotalCost}, ` +
          `output=¥${outputValue.toFixed(0)}, margin=${(margin * 100).toFixed(1)}%`
        );
      }
    }
  }

  console.log(lines.join('\n'));
});
