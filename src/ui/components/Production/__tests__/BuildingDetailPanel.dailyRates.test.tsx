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
      capacityMultipliers: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
      efficiencyMultipliers: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
    },
  ],
  isRetailBuilding: () => false,
}));

vi.mock('@/core/production/ProductionEngine', () => ({
  getBuildingRecipeFromInstance: () => ({
    outputs: [{ goodsId: 1, amount: 10 }],
    inputs: [{ goodsId: 2, amount: 5 }],
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
    {
      id: 2,
      name: '测试原料',
      basePrice: 20,
    },
  ],
}));

vi.mock('@/data/buildingMaterials', () => ({
  getBuildingConstructionConfig: () => ({
    buildTime: 12,
    baseMaterials: [],
  }),
  isHazardousBuilding: () => false,
}));

vi.mock('@/ui/components/Icons', () => ({
  BuildingIcon: () => React.createElement('span', null, 'BuildingIcon'),
  GoodsIcon: () => React.createElement('span', null, 'GoodsIcon'),
}));

vi.mock('../ResourceBar', () => ({
  ResourceBar: () => React.createElement('div', null, 'ResourceBar'),
}));

vi.mock('../ProductionMethodsPanel', () => ({
  ProductionMethodsPanel: () => React.createElement('div', null, 'ProductionMethodsPanel'),
}));

vi.mock('../BuildingUpgradePanel', () => ({
  UpgradeConfirmDialog: () => null,
}));

vi.mock('@/ui/design-system', () => ({
  Button: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('section', null, children),
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  ProgressBar: () => React.createElement('div', null, 'ProgressBar'),
  Switch: () => React.createElement('div', null, 'Switch'),
  Slider: ({ label }: { label?: string }) => React.createElement('div', null, label ?? 'Slider'),
  Dialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  DialogBody: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

import { BuildingDetailPanel } from '../BuildingDetailPanel';

function createWorld() {
  return {
    buildings: {
      types: new Uint8Array([1]),
      levels: new Uint8Array([1]),
      efficiencies: new Float32Array([1]),
      isActive: new Uint8Array([1]),
      owners: new Uint16Array([0]),
      inputBuffers: new Float32Array([5, 0, 0, 0, 0, 0, 0, 0]),
      outputBuffers: new Float32Array(8),
    },
    goods: {
      prices: new Float32Array([0, 100, 20]),
    },
  };
}

describe('BuildingDetailPanel daily rates', () => {
  beforeEach(() => {
    useGameStoreMock.mockReset();
  });

  it('shows daily input and output amounts using the current day model', () => {
    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorld(),
      playerCash: 1_000_000,
      upgradeBuilding: vi.fn(),
      toggleBuildingActive: vi.fn(),
      demolishBuilding: vi.fn(),
      getBuildingProductionControl: () => ({
        ownerCompanyId: 0,
        ownerCompanyName: '玩家',
        autoAdjustEnabled: true,
        canManage: true,
        manualTarget: 1,
        manualTargetRange: { min: 0.5, max: 1.5 },
      }),
      setBuildingProductionControlAuto: vi.fn(),
      setBuildingManualProductionTarget: vi.fn(),
      getBuildingLaborView: () => null,
      setBuildingLaborWageMultiplier: vi.fn(),
      tick: 1,
      setSelectedGoods: vi.fn(),
      setCurrentPage: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(BuildingDetailPanel, {
        buildingIndex: 0,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('10 单位');
    expect(html).toContain('需求: 5/日');
    expect(html).toContain('+10/日');
    expect(html).toContain('¥8');
    expect(html).toContain('¥1.0K');
    expect(html).toContain('¥992');
  });

  it('shows the building labor view with role shortages and wage controls', () => {
    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorld(),
      playerCash: 1_000_000,
      upgradeBuilding: vi.fn(),
      toggleBuildingActive: vi.fn(),
      demolishBuilding: vi.fn(),
      getBuildingProductionControl: () => ({
        ownerCompanyId: 0,
        ownerCompanyName: '玩家',
        autoAdjustEnabled: true,
        canManage: true,
        manualTarget: 1,
        manualTargetRange: { min: 0.5, max: 1.5 },
      }),
      setBuildingProductionControlAuto: vi.fn(),
      setBuildingManualProductionTarget: vi.fn(),
      getBuildingLaborView: () => ({
        buildingId: 0,
        coverage: 0.4,
        bottleneckRole: 'basic',
        estimatedMonthlyPayroll: 36_000,
        accruedPayroll: 1_200,
        roles: {
          basic: {
            role: 'basic',
            name: '普通工人',
            fullDemand: 30,
            activeDemand: 25,
            hired: 10,
            shortage: 15,
            coverage: 0.4,
            marketWage: 120,
            wageMultiplier: 1.25,
            actualDailyWage: 150,
          },
          technical: {
            role: 'technical',
            name: '技术工人',
            fullDemand: 8,
            activeDemand: 8,
            hired: 8,
            shortage: 0,
            coverage: 1,
            marketWage: 260,
            wageMultiplier: 1,
            actualDailyWage: 260,
          },
          management: {
            role: 'management',
            name: '管理人员',
            fullDemand: 2,
            activeDemand: 2,
            hired: 2,
            shortage: 0,
            coverage: 1,
            marketWage: 520,
            wageMultiplier: 1,
            actualDailyWage: 520,
          },
        },
      }),
      setBuildingLaborWageMultiplier: vi.fn(),
      tick: 1,
      setSelectedGoods: vi.fn(),
      setCurrentPage: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(BuildingDetailPanel, {
        buildingIndex: 0,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('劳动力覆盖率');
    expect(html).toContain('40%');
    expect(html).toContain('瓶颈: 普通工人');
    expect(html).toContain('10 / 25');
    expect(html).toContain('满产需求: 30');
    expect(html).toContain('缺口: 15');
    expect(html).toContain('市场日薪: ¥120');
    expect(html).toContain('实际日薪: ¥150');
    expect(html).toContain('普通工人工资倍率');
    expect(html).toContain('预计月工资');
    expect(html).toContain('¥36.0K');
    expect(html).toContain('本月已计提');
    expect(html).toContain('¥1.2K');
  });
});
