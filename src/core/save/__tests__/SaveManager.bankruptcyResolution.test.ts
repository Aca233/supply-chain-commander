import { beforeEach, describe, expect, it } from 'vitest';

import {
  bankruptcyResolution,
  resetBankruptcyResolution,
} from '@/core/finance/BankruptcyResolution';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

import { SaveManager } from '../SaveManager';

describe('SaveManager bankruptcy snapshot', () => {
  beforeEach(() => {
    resetBankruptcyResolution();
  });

  it('round-trips active bankruptcy events and player strategy settings through save data', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '破产AI';
    addBuilding(world, 1, BuildingId.IRON_MINE, 0);

    bankruptcyResolution.setStrategy(0, {
      mode: 'auto_participate',
      eventBudgetCap: 800_000,
      assetBudgetCap: 200_000,
      autoTrackSameIndustry: true,
    });
    bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 360);

    const manager = new SaveManager();
    const serialized = manager.serializeWorld(world, 360);

    expect(serialized.bankruptcy?.events).toHaveLength(1);
    expect(serialized.bankruptcy?.strategies['0']?.mode).toBe('auto_participate');

    resetBankruptcyResolution();
    expect(bankruptcyResolution.getCompanyEvents(1)).toHaveLength(0);

    const hydratedWorld = createGameWorld();
    manager.deserializeWorld(serialized, hydratedWorld);

    expect(bankruptcyResolution.getCompanyEvents(1)).toHaveLength(1);
    expect(bankruptcyResolution.getStrategy(0).mode).toBe('auto_participate');
  });
});
