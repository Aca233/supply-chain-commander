import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/gameStore', () => ({
  useGameStore: () => ({}),
}));

vi.mock('@/data/goods', () => ({
  ALL_GOODS: [],
  GOODS_BY_CATEGORY: {},
  GOODS_BY_INDUSTRY: {},
}));

vi.mock('@/data/buildings', () => ({
  ALL_BUILDINGS: [],
}));

vi.mock('@/ui/utils/supplyChainUtils', () => ({
  getProductionsProducingGoods: () => [],
  getProductionsUsingGoods: () => [],
}));

vi.mock('@/ui/components/Charts/PriceChart', () => ({
  PriceChart: () => null,
}));

vi.mock('@/ui/components/Charts/MarketShareChart', () => ({
  MarketShareChart: () => null,
}));

vi.mock('@/ui/components/Charts/SupplyDemandChart', () => ({
  SupplyDemandChart: () => null,
}));

vi.mock('@/ui/components/Charts/CandlestickChart', () => ({
  CandlestickChart: () => null,
}));

vi.mock('@/core/world/GameWorld', () => ({
  formatMonthDay: (tick: number) => `tick-${tick}`,
  tickToDate: () => ({ year: 1, month: 1, day: 1 }),
}));

vi.mock('@/ui/components/Icons', () => ({
  GoodsIcon: () => null,
  BuildingIcon: () => null,
}));

vi.mock('@/ui/hooks/useMobile', () => ({
  useMobile: () => ({ isMobile: false, isTablet: false, isNarrowDesktop: false }),
}));

vi.mock('@/ui/components/Layout/ResponsiveOverlayPanel', () => ({
  ResponsiveOverlayPanel: () => null,
}));

vi.mock('@/ui/design-system', () => ({
  Button: () => null,
  Card: () => null,
  CardTitle: () => null,
  Badge: () => null,
  Input: () => null,
  StatWidget: () => null,
  Tabs: () => null,
  TabsList: () => null,
  TabsTrigger: () => null,
  TooltipProvider: () => null,
}));

import * as MarketModule from '../Market';

describe('buildSupplyDemandData', () => {
  it('uses deterministic world supply and demand instead of synthetic placeholder history', () => {
    expect(typeof (MarketModule as any).buildSupplyDemandData).toBe('function');

    if (typeof (MarketModule as any).buildSupplyDemandData !== 'function') {
      return;
    }

    const world = {
      goods: {
        supplies: new Float32Array([240]),
        demands: new Float32Array([180]),
      },
      orders: {
        maxOrders: 0,
        isActive: new Uint8Array([]),
        goodsIds: new Uint16Array([]),
        remainings: new Float32Array([]),
        types: new Uint8Array([]),
      },
      trades: {
        count: 0,
        maxTrades: 0,
        goodsIds: new Uint16Array([]),
        prices: new Float32Array([]),
      },
    };

    const selectedGoods = {
      id: 0,
      name: '钢铁',
      basePrice: 120,
    };

    const data = (MarketModule as any).buildSupplyDemandData({
      world,
      selectedGoodsId: 0,
      selectedGoods,
      currentPrice: 135,
    });

    expect(data).toEqual({
      goodsId: '0',
      goodsName: '钢铁',
      currentPrice: 135,
      basePrice: 120,
      supply: 240,
      demand: 180,
      equilibriumPrice: 135,
      priceHistory: [],
    });
  });
});
