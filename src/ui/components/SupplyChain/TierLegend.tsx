/**
 * 层级图例组件
 * 展示商品层级的颜色编码
 */

import React from 'react';
import { TIER_COLORS, TIER_NAMES } from '@/ui/utils/supplyChainUtils';
import { cn } from '@/ui/design-system/utils/cn';

export interface TierLegendProps {
  selectedTiers?: number[];
  onTierClick?: (tier: number) => void;
  vertical?: boolean;
  className?: string;
}

export const TierLegend: React.FC<TierLegendProps> = ({
  selectedTiers,
  onTierClick,
  vertical = false,
  className,
}) => {
  const tiers = [0, 1, 2, 3];
  const isInteractive = !!onTierClick;

  return (
    <div
      className={cn(
        'flex gap-2',
        vertical ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
    >
      {tiers.map((tier) => {
        const isSelected = !selectedTiers || selectedTiers.includes(tier);
        
        return (
          <div
            key={tier}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg',
              'border border-[var(--border-muted)]',
              'transition-all duration-200',
              isInteractive && 'cursor-pointer hover:border-[var(--border-strong)]',
              !isSelected && 'opacity-40',
            )}
            onClick={() => onTierClick?.(tier)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: TIER_COLORS[tier] }}
            />
            <span className="text-xs text-[var(--text-secondary)]">
              Tier {tier}: {TIER_NAMES[tier]}
            </span>
          </div>
        );
      })}
    </div>
  );
};