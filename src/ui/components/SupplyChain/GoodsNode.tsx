/**
 * 商品节点组件
 * 用于在产业链图表中展示单个商品
 */

import React, { memo } from 'react';
import { GoodsDefinition } from '@/data/goods';
import { TIER_COLORS, TIER_NAMES } from '@/ui/utils/supplyChainUtils';
import { cn } from '@/ui/design-system/utils/cn';
import { GoodsIcon } from '@/ui/components/Icons';

export interface GoodsNodeProps {
  goods: GoodsDefinition;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  showPrice?: boolean;
  showTier?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const GoodsNode = memo<GoodsNodeProps>(({
  goods,
  size = 'md',
  selected = false,
  highlighted = false,
  dimmed = false,
  showPrice = true,
  showTier = true,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style,
  className,
}) => {
  const tierColor = TIER_COLORS[goods.tier];
  
  const sizeClasses = {
    sm: 'w-24 h-16 text-xs',
    md: 'w-32 h-20 text-sm',
    lg: 'w-40 h-24 text-base',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center',
        'rounded-lg border-2 cursor-pointer',
        'transition-all duration-200 ease-out',
        'bg-[var(--bg-surface)]',
        sizeClasses[size],
        // 状态样式
        selected && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-base)] scale-110',
        highlighted && 'scale-105 shadow-lg',
        dimmed && 'opacity-40',
        !selected && !dimmed && 'hover:scale-105 hover:shadow-md',
        className
      )}
      style={{
        borderColor: tierColor,
        boxShadow: selected || highlighted 
          ? `0 0 20px ${tierColor}40` 
          : undefined,
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 层级标签 */}
      {showTier && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
          style={{
            backgroundColor: tierColor,
            color: 'white',
          }}
        >
          {TIER_NAMES[goods.tier]}
        </div>
      )}

      {/* 商品图标 */}
      <div className="mb-1">
        <GoodsIcon goodsId={goods.id} size={iconSizes[size]} autoColor />
      </div>

      {/* 商品名称 */}
      <span className="font-medium text-[var(--text-primary)] text-center px-1 truncate w-full">
        {goods.name}
      </span>

      {/* 价格 */}
      {showPrice && (
        <span className="text-[var(--text-muted)] text-[10px]">
          ¥{goods.basePrice.toLocaleString()}/{goods.unit}
        </span>
      )}

      {/* 消费品标识 */}
      {goods.isConsumerGood && (
        <div 
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--success)] flex items-center justify-center"
          title="消费品"
        >
          <span className="text-[8px]">👤</span>
        </div>
      )}
    </div>
  );
});

GoodsNode.displayName = 'GoodsNode';