import { describe, expect, it } from 'vitest';

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
});
