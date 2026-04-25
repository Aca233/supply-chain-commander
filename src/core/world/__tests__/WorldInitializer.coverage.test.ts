import { describe, expect, it } from 'vitest';

import { getBuildingProduction } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

import { AI_COMPANIES } from '@/core/ai/AIPersonality';

function countInitialProducers(goodsId: number): number {
  let producerCount = 0;

  for (const company of AI_COMPANIES) {
    for (const building of company.initialBuildings) {
      const production = getBuildingProduction(building.typeId, building.outputModeId);
      if (production?.outputs.some(output => output.goodsId === goodsId)) {
        producerCount += building.count;
      }
    }
  }

  return producerCount;
}

describe('AI bootstrap production coverage', () => {
  it('covers the advanced goods that were previously left cold at startup', () => {
    expect(countInitialProducers(GoodsId.OTC_DRUG)).toBeGreaterThan(0);
    expect(countInitialProducers(GoodsId.ORGANIC_FOOD)).toBeGreaterThan(0);
    expect(countInitialProducers(GoodsId.BUILDING_PRODUCTS)).toBeGreaterThan(0);
    expect(countInitialProducers(GoodsId.DIAMOND)).toBeGreaterThan(0);
  });
});
