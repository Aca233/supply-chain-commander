import { beforeEach, describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';
import {
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { AI_COMPANIES } from '@/core/ai/AIPersonality';

function countInitialProducers(goodsId: number): number {
  let producerCount = 0;

  for (const company of AI_COMPANIES) {
    for (const building of company.initialBuildings) {
      const production = getRecipeForBuilding(building.typeId, building.slotMethods);
      if (production.outputs.some((output) => output.goodsId === goodsId)) {
        producerCount += building.count;
      }
    }
  }

  return producerCount;
}

describe('AI bootstrap production coverage', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('covers the advanced goods that were previously left cold at startup', () => {
    expect(countInitialProducers(GoodsId.OTC_DRUG)).toBeGreaterThan(0);
    expect(countInitialProducers(GoodsId.ORGANIC_FOOD)).toBeGreaterThan(0);
    expect(countInitialProducers(GoodsId.BUILDING_PRODUCTS)).toBeGreaterThan(0);
    expect(countInitialProducers(GoodsId.DIAMOND)).toBeGreaterThan(0);
  });
});
