import { afterEach, describe, expect, it, vi } from 'vitest';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
  vi.restoreAllMocks();
});

function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function parseExportNumber(value: string): number {
  const trimmed = value.trim();
  const multiplier = trimmed.endsWith('K')
    ? 1_000
    : trimmed.endsWith('M')
      ? 1_000_000
      : trimmed.endsWith('B')
        ? 1_000_000_000
        : 1;
  const numericPart = multiplier === 1 ? trimmed : trimmed.slice(0, -1);
  return Number(numericPart) * multiplier;
}

function parsePercent(value: string): number {
  return Number(value.replace('%', '').replace('+', ''));
}

function parseCsv(csv: string): Array<Record<string, string>> {
  const [headerLine, ...dataLines] = csv.trim().split('\n');
  const headers = headerLine.split(',');

  return dataLines.map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

describe('GameLoop price CSV market regression', () => {
  it('exports a current-month CSV that can be used to audit market and economy invariants', async () => {
    vi.resetModules();
    vi.spyOn(Math, 'random').mockImplementation(createDeterministicRandom(20260427));

    const { initializeWorld } = await import('../../world/WorldInitializer');
    const { createGameLoop } = await import('../GameLoop');
    const { getMonthlyPriceTracker } = await import('../../economy/MonthlyPriceTracker');
    const { PriceDataExporter } = await import('../../economy/PriceDataExporter');

    const world = initializeWorld();
    const loop = createGameLoop(world);

    try {
      for (let tick = 0; tick < 45; tick++) {
        loop.manualTick();
      }
    } finally {
      loop.destroy();
    }

    const report = getMonthlyPriceTracker().getCurrentMonthData(world);
    expect(report).not.toBeNull();

    const csv = PriceDataExporter.exportReportCSV(report!);
    const rows = parseCsv(csv);

    expect(rows).toHaveLength(80);
    expect(Object.keys(rows[0])).toContain('成交均价');
    expect(Object.keys(rows[0])).toContain('成交笔数');

    // 月度成交量在 CSV 中以 K/M 量级显示并取整：< 0.5K 时显示为 "0"，但底层
    // 仍可能有 micro 成交推动月初/月末价。允许 5% 以内的漂移以容忍这种舍入。
    const zeroVolumePriceChanges = rows.filter(row => (
      parseExportNumber(row['成交量']) === 0 && Math.abs(parsePercent(row['月内涨跌%'])) > 5
    ));
    const zeroRatioWithTrades = rows.filter(row => (
      parseExportNumber(row['成交量']) > 0 && Number(row['供需比']) === 0
    ));
    const averageOutsideRange = rows.filter(row => {
      const volume = parseExportNumber(row['成交量']);
      if (volume === 0) return false;

      const averagePrice = Number(row['成交均价']);
      const lowPrice = Number(row['最低价']);
      const highPrice = Number(row['最高价']);
      return averagePrice < lowPrice - 0.01 || averagePrice > highPrice + 0.01;
    });
    const inconsistentPercents = rows.filter(row => {
      const startPrice = Number(row['月初价格']);
      const endPrice = Number(row['月末价格']);
      const basePrice = Number(row['基准价']);
      const monthlyChange = parsePercent(row['月内涨跌%']);
      const baseChange = parsePercent(row['较基准涨跌%']);
      const expectedMonthly = startPrice > 0 ? ((endPrice / startPrice) - 1) * 100 : 0;
      const expectedBase = basePrice > 0 ? ((endPrice / basePrice) - 1) * 100 : 0;

      return Math.abs(monthlyChange - expectedMonthly) > 0.01
        || Math.abs(baseChange - expectedBase) > 0.01;
    });

    expect(zeroVolumePriceChanges).toEqual([]);
    expect(zeroRatioWithTrades).toEqual([]);
    expect(averageOutsideRange).toEqual([]);
    expect(inconsistentPercents).toEqual([]);
  }, 30000);
});
