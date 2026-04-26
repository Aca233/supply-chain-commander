import { describe, expect, it } from 'vitest';

import { TICKS_PER_DAY } from '@/core/constants';
import { GoodsId } from '@/data/goods';

import { updateWorldDemands } from '../DemandCurve';
import { initializeWorld } from '../../world/WorldInitializer';

describe('institutional demand mapping', () => {
  it('applies baseline demand to the intended institutional goods', () => {
    const world = initializeWorld();

    updateWorldDemands(world);

    expect(world.goods.demands[GoodsId.VACCINE]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.ANTIBIOTICS]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.MEDICAL_SUPPLIES]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.MEDICAL_DEVICE]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.AIRCRAFT_PARTS]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.SOLAR_SYSTEM]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.ENERGY_STORAGE]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.INDUSTRIAL_ROBOT]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.BUILDING_PRODUCTS]).toBeGreaterThan(0);
    expect(world.goods.demands[GoodsId.PACKAGING]).toBeGreaterThan(0);
  });

  it('keeps institutional daily demand aligned with the current day tick model', () => {
    const world = initializeWorld();
    const cycleMultiplier = 0.8 + world.economyStats.cyclePosition * 0.4;
    const growthMultiplier = Math.min(2.0, 1.0 + (world.tick / (TICKS_PER_DAY * 360)) * 0.1);
    const expectedVaccineDemand = 50 * cycleMultiplier * growthMultiplier;

    updateWorldDemands(world);

    expect(world.goods.demands[GoodsId.VACCINE]).toBeCloseTo(expectedVaccineDemand, 5);
  });
});
