import { describe, expect, it } from 'vitest';

import { PriceDataExporter } from '../PriceDataExporter';
import { MonthlyPriceReport } from '../MonthlyPriceTracker';

describe('PriceDataExporter', () => {
  it('exports percentages that recalculate from exported two-decimal prices', () => {
    const report: MonthlyPriceReport = {
      id: 'current',
      year: 2026,
      month: 4,
      startTick: 0,
      endTick: 30,
      generateTime: 0,
      summary: {
        totalGoods: 1,
        risingCount: 1,
        fallingCount: 0,
        unchangedCount: 0,
        topGainers: [],
        topLosers: [],
        mostActive: [],
      },
      goods: [{
        goodsId: 1,
        name: '测试商品',
        category: 'raw',
        basePrice: 100.004,
        startPrice: 10.004,
        endPrice: 10.995,
        highPrice: 10.995,
        lowPrice: 10.004,
        changeAbsolute: 0.991,
        changePercent: 9.906,
        baseChangeAbsolute: -89.009,
        baseChangePercent: -89.005,
        startSupply: 0,
        endSupply: 0,
        startDemand: 0,
        endDemand: 0,
        avgSupplyDemandRatio: 1,
        totalVolume: 10,
        totalValue: 109.95,
        tradeCount: 1,
        avgPrice: 10.995,
      }],
    };

    const csv = PriceDataExporter.exportReportCSV(report);
    const [headerLine, dataLine] = csv.split('\n');
    const headers = headerLine.split(',');
    const values = dataLine.split(',');
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));

    const startPrice = Number(row['月初价格']);
    const endPrice = Number(row['月末价格']);
    const basePrice = Number(row['基准价']);
    const monthlyChange = Number(row['月内涨跌%'].replace('%', '').replace('+', ''));
    const baseChange = Number(row['较基准涨跌%'].replace('%', '').replace('+', ''));

    expect(monthlyChange).toBeCloseTo(((endPrice / startPrice) - 1) * 100, 2);
    expect(baseChange).toBeCloseTo(((endPrice / basePrice) - 1) * 100, 2);
  });
});
