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

vi.mock('@/core/labor/LaborSystem', () => ({
  getTotalWorkforceDemand: (demand: { basic: number; technical: number; management: number }) =>
    demand.basic + demand.technical + demand.management,
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
          workforceDelta: { basic: 0, technical: 0, management: 0 },
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
          workforceDelta: { basic: -2, technical: 3, management: 1 },
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
      workforceRequired: { basic: 12, technical: 4, management: 2 },
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
    expect(html).toContain('普通工人');
    expect(html).toContain('技术工人');
    expect(html).toContain('管理人员');
    expect(html).not.toContain('工资');
    expect(html).not.toContain('产出#1');
    expect(html).not.toContain('输入#2');
  });

  it('uses industrial dashboard styling instead of the old brown switching panel style', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductionMethodsPanel, {
        buildingId: 0,
        buildingTypeId: 1,
        buildingLevel: 1,
        compact: true,
      })
    );

    expect(html).toContain('最终投入产出');
    expect(html).not.toContain('#b89353');
    expect(html).not.toContain('#efdfba');
    expect(html).not.toContain('#c8ab72');
  });
});
