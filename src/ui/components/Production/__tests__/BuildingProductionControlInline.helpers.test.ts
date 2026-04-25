import { describe, expect, it, vi } from 'vitest';

import type { BuildingProductionControlView } from '@/stores/gameStore';

import {
  buildBuildingProductionControlInlineViewModel,
  getBuildingProductionControlInlineStopPropagationProps,
  stopBuildingProductionControlPropagation,
} from '../BuildingProductionControlInline.helpers';

function createProductionControlView(
  overrides: Partial<BuildingProductionControlView> = {}
): BuildingProductionControlView {
  return {
    buildingId: 7,
    ownerCompanyId: 0,
    ownerCompanyName: '玩家公司',
    canManage: true,
    mode: 'auto',
    autoAdjustEnabled: true,
    manualTarget: 1,
    manualTargetRange: {
      min: 0.3,
      max: 1.5,
    },
    ...overrides,
  };
}

describe('BuildingProductionControlInline helpers', () => {
  it('builds an auto-mode view model without showing the manual slider', () => {
    const viewModel = buildBuildingProductionControlInlineViewModel(
      createProductionControlView({
        mode: 'auto',
        autoAdjustEnabled: true,
        manualTarget: 1.1,
      })
    );

    expect(viewModel.modeLabel).toBe('自动模式');
    expect(viewModel.showManualSlider).toBe(false);
    expect(viewModel.manualPercent).toBe(110);
    expect(viewModel.permissionHint).toBeNull();
  });

  it('builds a manual-mode view model with slider bounds and permission hint', () => {
    const viewModel = buildBuildingProductionControlInlineViewModel(
      createProductionControlView({
        canManage: false,
        mode: 'manual',
        autoAdjustEnabled: false,
        manualTarget: 0.76,
      })
    );

    expect(viewModel.modeLabel).toBe('手动模式');
    expect(viewModel.showManualSlider).toBe(true);
    expect(viewModel.manualPercent).toBe(76);
    expect(viewModel.manualMinPercent).toBe(30);
    expect(viewModel.manualMaxPercent).toBe(150);
    expect(viewModel.permissionHint).toContain('influence_strategy');
  });

  it('stops event propagation so card controls do not trigger parent selection', () => {
    const stopPropagation = vi.fn();

    stopBuildingProductionControlPropagation({ stopPropagation });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('uses bubble-phase event handlers so inner controls still receive clicks', () => {
    const handlers = getBuildingProductionControlInlineStopPropagationProps();

    expect(handlers.onClick).toBe(stopBuildingProductionControlPropagation);
    expect(handlers.onPointerDown).toBe(stopBuildingProductionControlPropagation);
    expect(handlers.onKeyDown).toBe(stopBuildingProductionControlPropagation);
    expect('onClickCapture' in handlers).toBe(false);
    expect('onPointerDownCapture' in handlers).toBe(false);
    expect('onKeyDownCapture' in handlers).toBe(false);
  });
});
