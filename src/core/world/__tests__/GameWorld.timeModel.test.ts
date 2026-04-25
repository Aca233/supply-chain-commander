import { describe, expect, it } from 'vitest';

import {
  LEGACY_HOURS_PER_DAY,
  TICKS_PER_DAY,
  TICKS_PER_MONTH,
  TICKS_PER_YEAR,
  legacyHourTicksToDayTicks,
} from '@/core/constants';
import { formatGameDate, tickToDate } from '../GameWorld';

describe('GameWorld day-based time model', () => {
  it('defines one tick as one day while preserving the legacy hour conversion helper', () => {
    expect(LEGACY_HOURS_PER_DAY).toBe(24);
    expect(TICKS_PER_DAY).toBe(1);
    expect(TICKS_PER_MONTH).toBe(30);
    expect(TICKS_PER_YEAR).toBe(360);
    expect(legacyHourTicksToDayTicks(72, 'floor')).toBe(3);
  });

  it('formats dates without an hour field', () => {
    expect(tickToDate(0)).toEqual({ year: 1, month: 1, day: 1 });
    expect(tickToDate(30)).toEqual({ year: 1, month: 2, day: 1 });
    expect(formatGameDate(359)).toBe('第1年 12月30日');
  });
});
