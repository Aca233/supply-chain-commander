import React, { useMemo } from 'react';

import { useGameStore } from '@/stores/gameStore';
import { Badge, Slider, Switch } from '@/ui/design-system';

import {
  buildBuildingProductionControlInlineViewModel,
  getBuildingProductionControlInlineStopPropagationProps,
} from './BuildingProductionControlInline.helpers';

interface BuildingProductionControlInlineProps {
  buildingId: number;
  compact?: boolean;
}

export const BuildingProductionControlInline: React.FC<BuildingProductionControlInlineProps> = ({
  buildingId,
  compact = false,
}) => {
  const tick = useGameStore((state) => state.tick);
  const getBuildingProductionControl = useGameStore((state) => state.getBuildingProductionControl);
  const setBuildingProductionControlAuto = useGameStore((state) => state.setBuildingProductionControlAuto);
  const setBuildingManualProductionTarget = useGameStore((state) => state.setBuildingManualProductionTarget);

  const productionControl = useMemo(
    () => getBuildingProductionControl(buildingId),
    [buildingId, getBuildingProductionControl, tick]
  );

  const viewModel = useMemo(
    () => (productionControl ? buildBuildingProductionControlInlineViewModel(productionControl) : null),
    [productionControl]
  );

  if (!productionControl || !viewModel) {
    return null;
  }

  const handleToggleAutoAdjust = (checked: boolean) => {
    setBuildingProductionControlAuto(buildingId, checked);
  };

  const handleManualTargetChange = (values: number[]) => {
    if (!values.length) return;
    setBuildingManualProductionTarget(buildingId, values[0] / 100);
  };

  const wrapperProps = getBuildingProductionControlInlineStopPropagationProps();

  if (compact) {
    return (
      <div
        {...wrapperProps}
        className="mt-3 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium tracking-[0.16em] text-white/45 uppercase">
                产量控制
              </span>
              <Badge variant={productionControl.autoAdjustEnabled ? 'info' : 'warning'} size="sm">
                {viewModel.modeLabel}
              </Badge>
            </div>
            {viewModel.permissionHint && (
              <p className="mt-1 text-[10px] text-[var(--warning)]">
                {viewModel.permissionHint}
              </p>
            )}
          </div>
          <Switch
            checked={productionControl.autoAdjustEnabled}
            onCheckedChange={handleToggleAutoAdjust}
            disabled={!productionControl.canManage}
            size="sm"
            variant="game"
          />
        </div>

        {viewModel.showManualSlider && (
          <div className="mt-2">
            <Slider
              value={[viewModel.manualPercent]}
              min={viewModel.manualMinPercent}
              max={viewModel.manualMaxPercent}
              step={1}
              onValueChange={handleManualTargetChange}
              label="手动产量"
              showValue
              formatValue={(value) => `${Math.round(value)}%`}
              size="sm"
              variant="game"
              color="warning"
              disabled={!productionControl.canManage}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      {...wrapperProps}
      className="rounded-2xl border border-white/[0.08] bg-black/20 px-3.5 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium tracking-[0.18em] text-white/45 uppercase">
              产量控制
            </span>
            <Badge variant={productionControl.autoAdjustEnabled ? 'info' : 'warning'} size="sm">
              {viewModel.modeLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-white/55">
            {productionControl.autoAdjustEnabled
              ? '自动模式下会按市场情况动态调整。'
              : '手动模式下保持当前建筑的指定产量。'}
          </p>
          {viewModel.permissionHint && (
            <p className="mt-1 text-xs text-[var(--warning)]">
              {viewModel.permissionHint}
            </p>
          )}
        </div>

        <Switch
          checked={productionControl.autoAdjustEnabled}
          onCheckedChange={handleToggleAutoAdjust}
          disabled={!productionControl.canManage}
          size="sm"
          variant="game"
        />
      </div>

      {viewModel.showManualSlider && (
        <div className="mt-3">
          <Slider
            value={[viewModel.manualPercent]}
            min={viewModel.manualMinPercent}
            max={viewModel.manualMaxPercent}
            step={1}
            onValueChange={handleManualTargetChange}
            label="手动产量"
            showValue
            formatValue={(value) => `${Math.round(value)}%`}
            size="sm"
            variant="game"
            color="warning"
            disabled={!productionControl.canManage}
          />
        </div>
      )}
    </div>
  );
};

export default BuildingProductionControlInline;
