import { describe, expect, it } from 'vitest';

import { getBuildTime } from '@/data/buildingMaterials';
import { BuildingId } from '@/data/buildings';
import { formatConstructionTime } from '../index';

describe('construction time formatting in the day model', () => {
  it('converts legacy build times to day ticks and formats them without hours', () => {
    expect(getBuildTime(BuildingId.LOGGING_CAMP)).toBe(1);
    expect(getBuildTime(BuildingId.FARM)).toBe(2);
    expect(formatConstructionTime(1)).toBe('1天');
    expect(formatConstructionTime(45)).toBe('1个月15天');
  });
});
