import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useGameStoreMock } = vi.hoisted(() => ({
  useGameStoreMock: vi.fn(),
}));

vi.mock('@/stores/gameStore', () => ({
  useGameStore: useGameStoreMock,
}));

vi.mock('@/data/goods', () => ({
  ALL_GOODS: [
    {
      id: 1,
      name: '测试商品',
      basePrice: 100,
    },
  ],
}));

vi.mock('@/data/buildings', () => ({
  ALL_BUILDINGS: [
    {
      id: 1,
      name: '测试工厂',
      maintenanceCost: 100,
      laborCost: 100,
      energyCost: 100,
    },
  ],
  getBuildingProduction: () => ({
    outputs: [{ goodsId: 1, amount: 10 }],
    inputs: [],
    ticksRequired: 1,
  }),
}));

vi.mock('@/ui/design-system', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('section', null, children),
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  StatWidget: ({ title, value }: { title: string; value: string }) =>
    React.createElement('div', null, `${title}:${value}`),
  Tabs: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TabsList: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TabsTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
}));

import { ProductionOverview } from '../ProductionOverview';

function createWorld() {
  return {
    buildings: {
      count: 1,
      owners: new Uint16Array([0]),
      isActive: new Uint8Array([1]),
      efficiencies: new Float32Array([1]),
      outputModeIds: new Uint8Array([0]),
      types: new Uint8Array([1]),
      inputBuffers: new Float32Array(8),
    },
    goods: {
      prices: new Float32Array([0, 100]),
    },
  };
}

function createWorldWithTwoPlayerBuildings() {
  const world = createWorld();
  return {
    ...world,
    buildings: {
      ...world.buildings,
      count: 2,
      owners: new Uint16Array([0, 0]),
      isActive: new Uint8Array([1, 0]),
      efficiencies: new Float32Array([1, 1]),
      outputModeIds: new Uint8Array([0, 0]),
      types: new Uint8Array([1, 1]),
      inputBuffers: new Float32Array(16),
    },
  };
}

describe('ProductionOverview time model', () => {
  beforeEach(() => {
    useGameStoreMock.mockReset();
  });

  it('reports day-range output and profit with the current ticks-per-day value', () => {
    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorld(),
      playerCash: 1_000_000,
      playerBuildings: 1,
      tick: 1,
    });

    const html = renderToStaticMarkup(React.createElement(ProductionOverview));

    expect(html).toContain('日产能:¥1.0K');
    expect(html).toContain('日预估利润:¥700');
  });

  it('derives total building count from the current world instead of cached store count', () => {
    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorldWithTwoPlayerBuildings(),
      playerCash: 1_000_000,
      playerBuildings: 99,
      tick: 1,
    });

    const html = renderToStaticMarkup(React.createElement(ProductionOverview));

    expect(html).toContain('运营建筑:1/2');
  });
});
