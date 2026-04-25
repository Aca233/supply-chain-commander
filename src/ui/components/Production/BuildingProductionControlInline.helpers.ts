import type { BuildingProductionControlView } from '@/stores/gameStore';

export interface BuildingProductionControlInlineViewModel {
  modeLabel: '自动模式' | '手动模式';
  showManualSlider: boolean;
  manualPercent: number;
  manualMinPercent: number;
  manualMaxPercent: number;
  permissionHint: string | null;
}

export function buildBuildingProductionControlInlineViewModel(
  control: BuildingProductionControlView
): BuildingProductionControlInlineViewModel {
  return {
    modeLabel: control.autoAdjustEnabled ? '自动模式' : '手动模式',
    showManualSlider: !control.autoAdjustEnabled,
    manualPercent: Math.round(control.manualTarget * 100),
    manualMinPercent: Math.round(control.manualTargetRange.min * 100),
    manualMaxPercent: Math.round(control.manualTargetRange.max * 100),
    permissionHint: control.canManage
      ? null
      : '当前无权管理该建筑产量，需要 influence_strategy 权限。',
  };
}

export function stopBuildingProductionControlPropagation(event: {
  stopPropagation: () => void;
}): void {
  event.stopPropagation();
}

export function getBuildingProductionControlInlineStopPropagationProps() {
  return {
    onClick: stopBuildingProductionControlPropagation,
    onPointerDown: stopBuildingProductionControlPropagation,
    onKeyDown: stopBuildingProductionControlPropagation,
  };
}
