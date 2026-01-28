/**
 * 产业列表组件
 * 按产业分类展示商品
 */

import React, { useState, useMemo, useCallback } from 'react';
import { GoodsDefinition } from '@/data/goods';
import { 
  groupGoodsByIndustry, 
  INDUSTRY_INFO, 
  TIER_COLORS 
} from '@/ui/utils/supplyChainUtils';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/ui/design-system';
import { cn } from '@/ui/design-system/utils/cn';

export interface IndustryListProps {
  selectedGoodsId?: number | null;
  onGoodsClick?: (goodsId: number) => void;
  searchQuery?: string;
  className?: string;
}

export const IndustryList: React.FC<IndustryListProps> = ({
  selectedGoodsId,
  onGoodsClick,
  searchQuery = '',
  className,
}) => {
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set(['core']));
  
  const goodsByIndustry = useMemo(() => groupGoodsByIndustry(), []);

  const filteredGoodsByIndustry = useMemo(() => {
    if (!searchQuery.trim()) return goodsByIndustry;
    
    const query = searchQuery.toLowerCase();
    const result = new Map<string, GoodsDefinition[]>();
    
    for (const [industry, goods] of goodsByIndustry) {
      const filtered = goods.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.key.toLowerCase().includes(query)
      );
      if (filtered.length > 0) {
        result.set(industry, filtered);
      }
    }
    
    return result;
  }, [goodsByIndustry, searchQuery]);

  const toggleIndustry = useCallback((industry: string) => {
    setExpandedIndustries(prev => {
      const next = new Set(prev);
      if (next.has(industry)) {
        next.delete(industry);
      } else {
        next.add(industry);
      }
      return next;
    });
  }, []);

  const industries = Array.from(filteredGoodsByIndustry.keys());

  return (
    <div className={cn('space-y-2 overflow-y-auto', className)}>
      {industries.map((industry) => {
        const info = INDUSTRY_INFO[industry] || { name: industry, icon: '📦', color: '#71717A' };
        const goods = filteredGoodsByIndustry.get(industry) || [];
        const isExpanded = expandedIndustries.has(industry);
        
        // 统计各层级商品数量
        const tierCounts = [0, 1, 2, 3].map(tier => 
          goods.filter(g => g.tier === tier).length
        );

        return (
          <Card key={industry} variant="default" className="overflow-hidden">
            {/* 产业头部 */}
            <div
              className={cn(
                'px-4 py-3 cursor-pointer',
                'flex items-center justify-between',
                'hover:bg-[var(--bg-elevated)]',
                'transition-colors duration-150',
              )}
              onClick={() => toggleIndustry(industry)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{info.icon}</span>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {info.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {goods.length} 种商品
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 层级分布小圆点 */}
                <div className="flex gap-1">
                  {tierCounts.map((count, tier) => count > 0 && (
                    <div
                      key={tier}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: TIER_COLORS[tier] }}
                      title={`Tier ${tier}: ${count}个`}
                    />
                  ))}
                </div>
                
                {/* 展开图标 */}
                <span className={cn(
                  'text-[var(--text-muted)] transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}>
                  ▼
                </span>
              </div>
            </div>

            {/* 商品列表 */}
            {isExpanded && (
              <CardContent className="pt-0 pb-3 space-y-1">
                {/* 按层级分组显示 */}
                {[0, 1, 2, 3].map((tier) => {
                  const tierGoods = goods.filter(g => g.tier === tier);
                  if (tierGoods.length === 0) return null;
                  
                  return (
                    <div key={tier} className="mb-2">
                      <div 
                        className="text-xs font-medium mb-1 flex items-center gap-1"
                        style={{ color: TIER_COLORS[tier] }}
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: TIER_COLORS[tier] }}
                        />
                        Tier {tier}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tierGoods.map((g) => (
                          <Badge
                            key={g.id}
                            variant={selectedGoodsId === g.id ? 'primary' : 'outline'}
                            size="sm"
                            className="cursor-pointer hover:border-[var(--accent)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGoodsClick?.(g.id);
                            }}
                          >
                            {g.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}

      {industries.length === 0 && (
        <div className="text-center py-8 text-[var(--text-muted)]">
          <div className="text-4xl mb-2">🔍</div>
          <div>没有找到匹配的商品</div>
        </div>
      )}
    </div>
  );
};