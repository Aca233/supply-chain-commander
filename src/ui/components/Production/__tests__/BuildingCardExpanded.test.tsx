import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_BUILDINGS, MAX_INPUTS, MAX_OUTPUTS } from '@/core/constants';

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
      name: '高位测试工厂',
      description: '用于测试高建筑 ID',
      maintenanceCost: 100,
      laborCost: 100,
      energyCost: 100,
      buildCost: 1000,
      maxLevel: 5,
      upgradeCosts: [0, 1000, 2000, 3000, 4000, 5000],
      capacityMultipliers: [1, 1.2, 1.4, 1.6, 1.8, 2],
      efficiencyMultipliers: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
    },
  ],
  isRetailBuilding: () => false,
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

vi.mock('@/core/production/ProductionEngine', () => ({
  getBuildingRecipeFromInstance: () => ({
    outputs: [{ goodsId: 1, amount: 10 }],
    inputs: [],
    ticksRequired: 1,
    workforceRequired: { basic: 0, technical: 0, management: 0 },
    energyRequired: 0,
  }),
}));

vi.mock('@/ui/components/Icons', () => ({
  BuildingIcon: () => React.createElement('span', null, 'BuildingIcon'),
  GoodsIcon: () => React.createElement('span', null, 'GoodsIcon'),
}));

vi.mock('../ResourceBar', () => ({
  ResourceBar: () => React.createElement('div', null, 'ResourceBar'),
}));

vi.mock('../ProductionMethodsPanel', () => ({
  ProductionMethodsPanel: ({ compact }: { compact?: boolean }) => (
    React.createElement('div', null, compact ? 'ProductionMethodsPanel compact' : 'ProductionMethodsPanel')
  ),
}));

vi.mock('../BuildingUpgradePanel', () => ({
  UpgradeConfirmDialog: () => null,
}));

vi.mock('@/ui/design-system', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('header', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h3', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('section', null, children),
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
  Button: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
  ProgressBar: () => React.createElement('div', null, 'ProgressBar'),
  Switch: () => React.createElement('input', { type: 'checkbox' }),
  Slider: () => React.createElement('input', { type: 'range' }),
}));

import { BuildingCardExpanded } from '../BuildingCardExpanded';

function createWorld(buildingId: number) {
  const types = new Uint8Array(MAX_BUILDINGS);
  const owners = new Uint16Array(MAX_BUILDINGS);
  const levels = new Uint8Array(MAX_BUILDINGS);
  const efficiencies = new Float32Array(MAX_BUILDINGS);
  const isActive = new Uint8Array(MAX_BUILDINGS);
  const outputBuffers = new Float32Array(MAX_BUILDINGS * MAX_OUTPUTS);

  types[buildingId] = 1;
  owners[buildingId] = 0;
  levels[buildingId] = 1;
  efficiencies[buildingId] = 1;
  isActive[buildingId] = 1;
  outputBuffers[buildingId * MAX_OUTPUTS] = 7;

  return {
    buildings: {
      count: buildingId + 1,
      types,
      owners,
      levels,
      efficiencies,
      isActive,
      inputBuffers: new Float32Array(MAX_BUILDINGS * MAX_INPUTS),
      outputBuffers,
    },
    goods: {
      prices: new Float32Array([0, 100]),
    },
  };
}

describe('BuildingCardExpanded', () => {
  beforeEach(() => {
    useGameStoreMock.mockReset();
  });

  it('reads output buffers with the output slot stride for high building ids', () => {
    const buildingId = Math.floor(MAX_BUILDINGS * 0.75);

    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorld(buildingId),
      playerCash: 1_000_000,
      tick: 1,
      upgradeBuilding: vi.fn(),
      toggleBuildingActive: vi.fn(),
      demolishBuilding: vi.fn(),
      getBuildingProductionControl: () => ({
        ownerCompanyId: 0,
        canManage: true,
        autoAdjustEnabled: true,
        manualTarget: 1,
        manualTargetRange: { min: 0.3, max: 1.5 },
      }),
      setBuildingProductionControlAuto: vi.fn(),
      setBuildingManualProductionTarget: vi.fn(),
      getBuildingLaborView: () => null,
      setBuildingLaborWageMultiplier: vi.fn(),
      setSelectedGoods: vi.fn(),
      setCurrentPage: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(BuildingCardExpanded, {
        buildingIndex: buildingId,
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain('库存 7');
  });

  it('renders industrial dashboard sections with compact labor summary', () => {
    const buildingId = 4;

    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorld(buildingId),
      playerCash: 1_000_000,
      tick: 1,
      upgradeBuilding: vi.fn(),
      toggleBuildingActive: vi.fn(),
      demolishBuilding: vi.fn(),
      getBuildingProductionControl: () => ({
        ownerCompanyId: 0,
        canManage: true,
        autoAdjustEnabled: true,
        manualTarget: 1,
        manualTargetRange: { min: 0.3, max: 1.5 },
      }),
      setBuildingProductionControlAuto: vi.fn(),
      setBuildingManualProductionTarget: vi.fn(),
      getBuildingLaborView: () => ({
        coverage: 0.82,
        bottleneckRole: 'technical',
        estimatedMonthlyPayroll: 12_500,
        accruedPayroll: 3_200,
        roles: {
          basic: {
            name: '基础工人',
            hired: 18,
            activeDemand: 20,
            shortage: 2,
            coverage: 0.9,
            wageMultiplier: 1,
          },
          technical: {
            name: '技术工人',
            hired: 4,
            activeDemand: 8,
            shortage: 4,
            coverage: 0.5,
            wageMultiplier: 1.2,
          },
          management: {
            name: '管理人员',
            hired: 2,
            activeDemand: 2,
            shortage: 0,
            coverage: 1,
            wageMultiplier: 1.1,
          },
        },
      }),
      setBuildingLaborWageMultiplier: vi.fn(),
      setSelectedGoods: vi.fn(),
      setCurrentPage: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(BuildingCardExpanded, {
        buildingIndex: buildingId,
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain('生产链');
    expect(html).toContain('生产方式与产量');
    expect(html).toContain('经营拆账');
    expect(html).toContain('劳动力与工资');
    expect(html).toContain('瓶颈');
    expect(html).toContain('技术工人');
  });

  it('uses the compact production method controls in the building detail panel', () => {
    const buildingId = 3;

    useGameStoreMock.mockReturnValue({
      getWorld: () => createWorld(buildingId),
      playerCash: 1_000_000,
      tick: 1,
      upgradeBuilding: vi.fn(),
      toggleBuildingActive: vi.fn(),
      demolishBuilding: vi.fn(),
      getBuildingProductionControl: () => ({
        ownerCompanyId: 0,
        canManage: true,
        autoAdjustEnabled: true,
        manualTarget: 1,
        manualTargetRange: { min: 0.3, max: 1.5 },
      }),
      setBuildingProductionControlAuto: vi.fn(),
      setBuildingManualProductionTarget: vi.fn(),
      getBuildingLaborView: () => null,
      setBuildingLaborWageMultiplier: vi.fn(),
      setSelectedGoods: vi.fn(),
      setCurrentPage: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(BuildingCardExpanded, {
        buildingIndex: buildingId,
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain('ProductionMethodsPanel compact');
    expect(html).toContain('自动产量');
    expect(html).not.toContain('按市场与库存压力调整');
  });
});
