/**
 * 商品图标组件
 * 根据商品ID显示对应的图标
 */

import React from 'react';
import { getGoodsIcon, getGoodsCategoryColor } from './goodsIconMap';
import { ALL_GOODS } from '@/data/goods';

export interface GoodsIconProps {
  /** 商品ID */
  goodsId: number;
  /** 图标大小 (px) */
  size?: number;
  /** 自定义className */
  className?: string;
  /** 是否根据商品类别自动着色 */
  autoColor?: boolean;
  /** 是否显示提示 */
  showTooltip?: boolean;
}

/**
 * 商品图标组件
 * 自动根据商品ID渲染对应的图标
 */
export const GoodsIcon: React.FC<GoodsIconProps> = React.memo(({
  goodsId,
  size = 24,
  className = '',
  autoColor = false,
  showTooltip = false,
}) => {
  const IconComponent = getGoodsIcon(goodsId);
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  
  // 获取基于类别的颜色
  const colorClass = autoColor && goods ? getGoodsCategoryColor(goods.category) : '';
  
  const icon = (
    <IconComponent
      size={size}
      className={`${colorClass} ${className}`.trim()}
      aria-label={goods?.name || `商品 ${goodsId}`}
    />
  );
  
  if (showTooltip && goods) {
    return (
      <span title={goods.name} className="inline-flex">
        {icon}
      </span>
    );
  }
  
  return icon;
});

GoodsIcon.displayName = 'GoodsIcon';

export default GoodsIcon;