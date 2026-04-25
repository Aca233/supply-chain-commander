import { beforeEach, describe, expect, it } from 'vitest';

import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

import { initProductionCache, updateAllProduction } from '../ProductionEngine';
import { initializeBuildingProductionMethods } from '../ProductionMethods';

describe('Production energy handling', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    initProductionCache();
  });

  it('does not block production when total notional energy demand exceeds company supply', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 10_000_000;

    for (let i = 0; i < 30; i++) {
      addBuilding(world, 0, BuildingId.OIL_FIELD, 0);
    }

    const result = updateAllProduction(world);

    expect(result.processedCount).toBe(30);
    expect(result.producedCount).toBe(30);
    expect(result.blockedCount).toBe(0);
  });
});
