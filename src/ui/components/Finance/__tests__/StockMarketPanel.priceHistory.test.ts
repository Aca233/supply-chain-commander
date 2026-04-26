import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/gameStore', () => ({
  useGameStore: () => ({}),
}));

vi.mock('@/ui/components/Charts/PriceChart', () => ({
  PriceChart: () => null,
}));

vi.mock('@/ui/design-system', () => ({
  Card: () => null,
  CardHeader: () => null,
  CardTitle: () => null,
  CardContent: () => null,
  Button: () => null,
  Badge: () => null,
  DataTable: () => null,
  StatWidget: () => null,
  Dialog: () => null,
  DialogTrigger: () => null,
  DialogContent: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
  DialogBody: () => null,
  DialogFooter: () => null,
  Slider: () => null,
}));

vi.mock('@/ui/hooks/useMobile', () => ({
  useMobile: () => ({ isMobile: false, isTablet: false, isNarrowDesktop: false }),
}));

vi.mock('@/ui/pages/responsivePageLayout', () => ({
  shouldUseCompactStockMarketLayout: () => false,
}));

import * as StockMarketPanelModule from '../StockMarketPanel';

describe('buildStockPriceHistory', () => {
  it('builds a deterministic session series from actual stock summary values', () => {
    expect(typeof (StockMarketPanelModule as any).buildStockPriceHistory).toBe('function');

    if (typeof (StockMarketPanelModule as any).buildStockPriceHistory !== 'function') {
      return;
    }

    const stock = {
      previousClose: 98,
      openPrice: 100,
      currentPrice: 105,
    };

    expect((StockMarketPanelModule as any).buildStockPriceHistory(stock)).toEqual([
      { time: '昨收', price: 98 },
      { time: '开盘', price: 100 },
      { time: '最新', price: 105 },
    ]);
  });
});
