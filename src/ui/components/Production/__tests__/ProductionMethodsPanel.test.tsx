import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useGameStoreMock,
  getBuildingConfigMock,
  getMethodByIdMock,
  getSlotAvailableMethodsMock,
  getRecipeForBuildingMock,
} = vi.hoisted(() => ({
  useGameStoreMock: vi.fn(),
  getBuildingConfigMock: vi.fn(),
  getMethodByIdMock: vi.fn(),
  getSlotAvailableMethodsMock: vi.fn(),
  getRecipeForBuildingMock: vi.fn(),
}));

vi.mock('@/stores/gameStore', () => ({
  useGameStore: useGameStoreMock,
}));

vi.mock('@/core/production/ProductionMethods', () => ({
  getSlotAvailableMethods: getSlotAvailableMethodsMock,
  getBuildingConfig: getBuildingConfigMock,
  getMethodById: getMethodByIdMock,
  getRecipeForBuilding: getRecipeForBuildingMock,
}));

vi.mock('@/data/goods', () => ({
  ALL_GOODS: [
    { id: 1, name: '钢材' },
    { id: 2, name: '煤炭' },
    { id: 3, name: '石灰' },
  ],
}));

vi.mock('@/ui/components/Icons', () => ({
  GoodsIcon: ({ goodsId }: { goodsId: number }) => React.createElement('span', null, `GoodsIcon${goodsId}`),
}));

import { ProductionMethodsPanel } from '../ProductionMethodsPanel';

describe('ProductionMethodsPanel', () => {
  beforeEach(() => {
    useGameStoreMock.mockReset();
    getBuildingConfigMock.mockReset();
    getMethodByIdMock.mockReset();
    getSlotAvailableMethodsMock.mockReset();
    getRecipeForBuildingMock.mockReset();

    getBuildingConfigMock.mockReturnValue({
      slots: [
        {
          id: 'production',
          buildingTypeId: 1,
          name: '生产方式',
          icon: '⚙️',
          description: '默认生产槽',
          order: 0,
        },
        {
          id: 'workforce',
          buildingTypeId: 1,
          name: '劳动力',
          icon: '👷',
          description: '劳动力配置',
          order: 0,
        },
      ],
      defaultMethods: {
        production: 10001,
        workforce: 10002,
      },
    });

    getMethodByIdMock.mockImplementation((methodId: number) => {
      if (methodId === 10001) {
        return {
          id: 10001,
          key: 'default_1',
          name: '标准炼钢',
          buildingTypeId: 1,
          slotId: 'production',
          inputDelta: [{ goodsId: 2, amount: 11 }],
          outputDelta: [{ goodsId: 1, amount: 17 }],
          laborDelta: 0,
          energyDelta: 0,
          ticksRequired: 1,
          requiredLevel: 1,
          switchCost: 0,
          switchCooldown: 0,
          description: '标准炼钢工艺',
        };
      }

      if (methodId === 10002) {
        return {
          id: 10002,
          key: 'workers_1',
          name: '熟练工人',
          buildingTypeId: 1,
          slotId: 'workforce',
          inputDelta: [{ goodsId: 3, amount: 5 }],
          outputDelta: [{ goodsId: 1, amount: 24 }],
          laborDelta: 1,
          energyDelta: 0,
          ticksRequired: 1,
          requiredLevel: 1,
          switchCost: 0,
          switchCooldown: 0,
          description: '提升品质但增加辅料',
        };
      }

      return null;
    });

    getSlotAvailableMethodsMock.mockReturnValue([]);
    getRecipeForBuildingMock.mockReturnValue({
      inputs: [
        { goodsId: 2, amount: 62 },
        { goodsId: 3, amount: 7 },
      ],
      outputs: [{ goodsId: 1, amount: 41 }],
      laborRequired: 1,
      energyRequired: 0,
      ticksRequired: 1,
    });

    useGameStoreMock.mockReturnValue({
      getBuildingCurrentMethods: () => [10001, 10002],
      changeBuildingSlotMethod: vi.fn(),
      tick: 1,
    });
  });

  it('renders final combined recipe with non-production slot effects included', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductionMethodsPanel, {
        buildingId: 0,
        buildingTypeId: 1,
        buildingLevel: 1,
      })
    );

    expect(html).toContain('钢材');
    expect(html).toContain('煤炭');
    expect(html).toContain('石灰');
    expect(html).toContain('GoodsIcon1');
    expect(html).toContain('GoodsIcon2');
    expect(html).toContain('GoodsIcon3');
    expect(html).toContain('41');
    expect(html).toContain('62');
    expect(html).toContain('7');
    expect(html).not.toContain('产出#1');
    expect(html).not.toContain('输入#2');
  });
});
