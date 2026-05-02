import { beforeEach, describe, expect, it } from 'vitest';

import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import {
  resolveLegacyOutputModeToSlotMethods,
} from '@/core/production/legacyOutputModeBridge';
import { getProductionVariantByLegacyOutputMode } from '@/core/production/legacyOutputModeBridge';
import { BuildingId } from '@/data/buildings';

describe('legacy output mode bridge', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
  });

  it('resolves a legacy output mode to the registered slot methods', () => {
    const variant = getProductionVariantByLegacyOutputMode(BuildingId.FOOD_FACTORY, 2);

    expect(variant).not.toBeNull();
    expect(resolveLegacyOutputModeToSlotMethods(BuildingId.FOOD_FACTORY, 2)).toEqual(
      variant!.slotMethods,
    );
  });

  it('falls back to default slot methods when a legacy output mode is unknown', () => {
    const slotMethods = resolveLegacyOutputModeToSlotMethods(BuildingId.FARM, 999);

    expect(slotMethods).toHaveLength(1);
    expect(slotMethods[0]).toBeGreaterThan(0);
  });
});
