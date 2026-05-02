import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useGameStoreMock } = vi.hoisted(() => ({
  useGameStoreMock: vi.fn(),
}));

vi.mock('@/stores/gameStore', () => ({
  useGameStore: useGameStoreMock,
}));

vi.mock('@/data/buildings', () => ({
  ALL_BUILDINGS: [
    {
      id: 1,
      name: '测试工厂',
      description: '用于测试',
      maintenanceCost: 100,
      laborCost: 100,
      energyCost: 100,
      maxLevel: 5,
      upgradeCosts: [0, 0, 0, 0, 0, 0],
    },
  ],
  isRetailBuilding: () => false,
}));

vi.mock('@/core/production/ProductionEngine', () => ({
  getBuildingRecipeFromInstance: () => ({
    outputs: [{ goodsId: 1, amount: 10 }],
    inputs: [],
    ticksRequired: 1,
    workforceRequired: { basic: 0, technical: 0, management: 0 },
    energyRequired: 0,
  }),
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

vi.mock('@/ui/components/Icons', () => ({
  BuildingIcon: () => React.createElement('span', null, 'BuildingIcon'),
  GoodsIcon: () => React.createElement('span', null, 'GoodsIcon'),
}));

vi.mock('../ResourceBar', () => ({
  CompactResourceBar: () => React.createElement('div', null, 'CompactResourceBar'),
}));

vi.mock('../ProductionMethodsPanel', () => ({
  ProductionMethodsPanel: () => React.createElement('div', null, 'ProductionMethodsPanel'),
}));

vi.mock('../BuildingProductionControlInline', () => ({
  BuildingProductionControlInline: () => React.createElement('div', null, 'BuildingProductionControlInline'),
}));

vi.mock('@/ui/design-system', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  Button: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
  ProgressBar: () => React.createElement('div', null, 'ProgressBar'),
}));

import { BuildingCard } from '../BuildingCard';

function createWorld(isActive: 0 | 1) {
  return {
    buildings: {
      types: new Uint8Array([1]),
      levels: new Uint8Array([1]),
      efficiencies: new Float32Array([1]),
      isActive: new Uint8Array([isActive]),
      owners: new Uint16Array([0]),
      inputBuffers: new Float32Array(8),
    },
    goods: {
      prices: new Float32Array([0, 100]),
    },
  };
}

describe('BuildingCard', () => {
  beforeEach(() => {
    useGameStoreMock.mockReset();
  });

  it('shows only operating-cost loss when the building is paused', () => {
    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorld(0),
      playerCash: 1_000_000,
      upgradeBuilding: vi.fn(),
      tick: 1,
    });

    const html = renderToStaticMarkup(
      React.createElement(BuildingCard, {
        buildingIndex: 0,
        compact: true,
      })
    );

    expect(html).toContain('¥-8/日');
  });

  it('keeps showing positive estimated profit when the building is active', () => {
    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorld(1),
      playerCash: 1_000_000,
      upgradeBuilding: vi.fn(),
      tick: 1,
    });

    const html = renderToStaticMarkup(
      React.createElement(BuildingCard, {
        buildingIndex: 0,
        compact: true,
      })
    );

    expect(html).toContain('¥992/日');
  });
});
