/**
 * 建筑图标组件
 * 根据建筑ID显示对应的图标
 */

import React from 'react';
import { getBuildingIcon, getBuildingCategoryColor } from './buildingIconMap';
import { ALL_BUILDINGS } from '@/data/buildings';

export interface BuildingIconProps {
  /** 建筑ID */
  buildingId: number;
  /** 图标大小 (px) */
  size?: number;
  /** 自定义className */
  className?: string;
  /** 是否根据建筑类别自动着色 */
  autoColor?: boolean;
  /** 是否显示提示 */
  showTooltip?: boolean;
}

/**
 * 建筑图标组件
 * 自动根据建筑ID渲染对应的图标
 */
export const BuildingIcon: React.FC<BuildingIconProps> = React.memo(({
  buildingId,
  size = 24,
  className = '',
  autoColor = false,
  showTooltip = false,
}) => {
  const IconComponent = getBuildingIcon(buildingId);
  const building = ALL_BUILDINGS.find(b => b.id === buildingId);
  
  // 获取基于类别的颜色
  const colorClass = autoColor && building ? getBuildingCategoryColor(building.category) : '';
  
  const icon = (
    <IconComponent
      size={size}
      className={`${colorClass} ${className}`.trim()}
      aria-label={building?.name || `建筑 ${buildingId}`}
    />
  );
  
  if (showTooltip && building) {
    return (
      <span title={building.name} className="inline-flex">
        {icon}
      </span>
    );
  }
  
  return icon;
});

BuildingIcon.displayName = 'BuildingIcon';

export default BuildingIcon;