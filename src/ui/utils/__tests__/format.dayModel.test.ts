import { describe, expect, it } from 'vitest';

import { formatCurrency, formatRelativeTime, formatTick } from '../format';

describe('format day-based time strings', () => {
  it('renders day-sized ticks without hours', () => {
    expect(formatTick(0)).toBe('第1年 1月1日');
    expect(formatRelativeTime(1)).toBe('1天');
    expect(formatRelativeTime(30)).toBe('1个月');
    expect(formatRelativeTime(360)).toBe('1年');
  });
});

describe('format currency strings', () => {
  it('keeps sub-1K amounts in yuan and uses K for larger values', () => {
    expect(formatCurrency(999)).toBe('¥999');
    expect(formatCurrency(0.68)).toBe('¥0.68');
    expect(formatCurrency(1000)).toBe('¥1.0K');
    expect(formatCurrency(1200000)).toBe('¥1,200.0K');
  });
});
