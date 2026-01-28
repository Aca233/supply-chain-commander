/**
 * 搜索和筛选组件
 * 提供商品搜索和多维度筛选功能
 */

import React, { useState, useCallback } from 'react';
import { Input, Button, Badge } from '@/ui/design-system';
import { TIER_NAMES, INDUSTRY_INFO, FilterState } from '@/ui/utils/supplyChainUtils';
import { cn } from '@/ui/design-system/utils/cn';

export interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: Partial<FilterState>;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  className?: string;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  className,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const toggleTier = useCallback((tier: number) => {
    const currentTiers = filters.tiers || [0, 1, 2, 3];
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter(t => t !== tier)
      : [...currentTiers, tier];
    onFiltersChange({ ...filters, tiers: newTiers });
  }, [filters, onFiltersChange]);

  const toggleIndustry = useCallback((industry: string) => {
    const currentIndustries = filters.industries || [];
    const newIndustries = currentIndustries.includes(industry)
      ? currentIndustries.filter(i => i !== industry)
      : [...currentIndustries, industry];
    onFiltersChange({ ...filters, industries: newIndustries.length > 0 ? newIndustries : undefined });
  }, [filters, onFiltersChange]);

  const toggleConsumerGood = useCallback(() => {
    const current = filters.isConsumerGood;
    const next = current === null ? true : current === true ? false : null;
    onFiltersChange({ ...filters, isConsumerGood: next });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({});
    onSearchChange('');
  }, [onFiltersChange, onSearchChange]);

  const hasActiveFilters = 
    (filters.tiers && filters.tiers.length < 4) ||
    (filters.industries && filters.industries.length > 0) ||
    filters.isConsumerGood !== null && filters.isConsumerGood !== undefined;

  return (
    <div className={cn('space-y-3', className)}>
      {/* 搜索框 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            🔍
          </span>
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索商品名称..."
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span>🎛️</span>
          {hasActiveFilters && (
            <span className="ml-1 w-2 h-2 rounded-full bg-[var(--accent)]" />
          )}
        </Button>
        {(searchQuery || hasActiveFilters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            清除
          </Button>
        )}
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="p-4 rounded-lg border border-[var(--border-muted)] bg-[var(--bg-surface)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 层级筛选 */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              商品层级
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((tier) => {
                const isActive = !filters.tiers || filters.tiers.includes(tier);
                return (
                  <Badge
                    key={tier}
                    variant={isActive ? 'primary' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTier(tier)}
                  >
                    Tier {tier}: {TIER_NAMES[tier]}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* 产业筛选 */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              产业分类
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {Object.entries(INDUSTRY_INFO).map(([key, info]) => {
                const isActive = filters.industries?.includes(key);
                return (
                  <Badge
                    key={key}
                    variant={isActive ? 'primary' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleIndustry(key)}
                  >
                    {info.icon} {info.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* 消费品筛选 */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              商品类型
            </div>
            <div className="flex gap-2">
              <Badge
                variant={filters.isConsumerGood === true ? 'success' : 'outline'}
                className="cursor-pointer"
                onClick={() => onFiltersChange({ 
                  ...filters, 
                  isConsumerGood: filters.isConsumerGood === true ? null : true 
                })}
              >
                👤 消费品
              </Badge>
              <Badge
                variant={filters.isConsumerGood === false ? 'warning' : 'outline'}
                className="cursor-pointer"
                onClick={() => onFiltersChange({ 
                  ...filters, 
                  isConsumerGood: filters.isConsumerGood === false ? null : false 
                })}
              >
                🏭 工业品
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};