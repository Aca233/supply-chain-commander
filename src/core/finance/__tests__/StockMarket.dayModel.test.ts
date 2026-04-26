import { afterEach, describe, expect, it, vi } from 'vitest';

import { initializeWorld } from '../../world/WorldInitializer';
import { getMarketState, getStock, initializeStockMarket, updateStockMarket } from '../StockMarket';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
});

describe('StockMarket day-based cadence', () => {
  it('resets OHLC and daily volume after one simulated day tick', () => {
    const world = initializeWorld();
    initializeStockMarket(world);

    const stockIds = Array.from(getMarketState().stocks.keys());
    const batchSize = Math.ceil(stockIds.length / 4);
    const targetCompanyId = stockIds[batchSize];
    const stock = getStock(targetCompanyId);

    expect(stock).not.toBeNull();

    const baselinePrice = stock!.currentPrice;
    stock!.previousClose = baselinePrice - 5;
    stock!.openPrice = baselinePrice - 7;
    stock!.highPrice = baselinePrice + 12;
    stock!.lowPrice = baselinePrice - 12;
    stock!.volume = 321;

    world.tick = 1;
    updateStockMarket(world);

    expect(stock!.previousClose).toBe(baselinePrice);
    expect(stock!.openPrice).toBe(baselinePrice);
    expect(stock!.volume).toBe(0);
  });
});
