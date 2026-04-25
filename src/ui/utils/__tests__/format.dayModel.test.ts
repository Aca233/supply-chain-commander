import { describe, expect, it } from 'vitest';

import { formatRelativeTime, formatTick } from '../format';

describe('format day-based time strings', () => {
  it('renders day-sized ticks without hours', () => {
    expect(formatTick(0)).toBe('第1年 1月1日');
    expect(formatRelativeTime(1)).toBe('1天');
    expect(formatRelativeTime(30)).toBe('1个月');
    expect(formatRelativeTime(360)).toBe('1年');
  });
});
