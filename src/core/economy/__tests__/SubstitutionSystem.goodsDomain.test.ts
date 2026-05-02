import { describe, expect, it } from 'vitest';

import { ALL_GOODS } from '@/data/goods';

import { getAllSubstitutionRelations } from '../SubstitutionSystem';

describe('SubstitutionSystem goods domain', () => {
  it('defines substitution and complement relations only within the active goods catalog', () => {
    const invalidRelations = getAllSubstitutionRelations().filter(
      relation => relation.goodsA >= ALL_GOODS.length || relation.goodsB >= ALL_GOODS.length,
    );

    expect(invalidRelations).toEqual([]);
  });
});
