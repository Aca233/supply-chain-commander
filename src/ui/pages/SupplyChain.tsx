/**
 * 产业链页面
 * 完整的产业链可视化和分析界面
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  GoodsNode,
  ViewModeSelector,
  TierLegend,
  SearchAndFilter,
  IndustryList,
  GoodsDetailPanel,
  ProductionPlanner,
  SupplyChainGraph,
  ViewMode,
} from '@/ui/components/SupplyChain';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/ui/design-system';
import { cn } from '@/ui/design-system/utils/cn';
import { ALL_GOODS, GOODS_BY_ID } from '@/data/goods';
import { INDUSTRY_INFO, FilterState } from '@/ui/utils/supplyChainUtils';
import { useMobile } from '@/ui/hooks/useMobile';

export const SupplyChainPage: React.FC = () => {
  const { isMobile, isTablet } = useMobile();
  
  // 视图状态
  const [viewMode, setViewMode] = useState<ViewMode>('tier');
  const [selectedGoodsId, setSelectedGoodsId] = useState<number | null>(null);
  const [hoveredGoodsId, setHoveredGoodsId] = useState<number | null>(null);
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<FilterState>>({});
  
  // 面板状态
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // 选中的层级（从filters中提取）
  const selectedTiers = useMemo(() => filters.tiers || [], [filters.tiers]);

  // 商品点击处理
  const handleGoodsClick = useCallback((goodsId: number) => {
    setSelectedGoodsId(goodsId);
    setShowDetailPanel(true);
    if (viewMode !== 'trace') {
      setViewMode('trace');
    }
  }, [viewMode]);

  // 商品悬停处理
  const handleGoodsHover = useCallback((goodsId: number | null) => {
    setHoveredGoodsId(goodsId);
  }, []);

  // 层级筛选切换
  const handleTierToggle = useCallback((tier: number) => {
    setFilters(prev => {
      const currentTiers = prev.tiers || [];
      const newTiers = currentTiers.includes(tier)
        ? currentTiers.filter(t => t !== tier)
        : [...currentTiers, tier];
      return { ...prev, tiers: newTiers.length > 0 ? newTiers : undefined };
    });
  }, []);

  // 清除筛选
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({});
  }, []);

  // 打开生产规划器
  const openPlanner = useCallback((goodsId?: number) => {
    if (goodsId) {
      setSelectedGoodsId(goodsId);
    }
    setShowPlanner(true);
  }, []);

  const selectedGoods = selectedGoodsId ? GOODS_BY_ID.get(selectedGoodsId) : null;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 border-b border-[var(--border-muted)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 标题 */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                产业链
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                探索 {ALL_GOODS.length} 种商品的生产关系
              </p>
            </div>
          </div>

          {/* 视图模式切换 */}
          <ViewModeSelector value={viewMode} onChange={setViewMode} />

          {/* 快捷操作 */}
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => openPlanner()}
            >
              🎯 生产规划
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFilters}
            >
              🔄 重置
            </Button>
          </div>
        </div>

        {/* 层级图例 */}
        <div className="px-4 pb-3">
          <TierLegend
            selectedTiers={selectedTiers.length > 0 ? selectedTiers : undefined}
            onTierClick={handleTierToggle}
          />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板 - 商品列表 */}
        <div
          className={cn(
            'flex-shrink-0 border-r border-[var(--border-muted)] bg-[var(--bg-surface)]',
            'transition-all duration-300 overflow-hidden',
            leftPanelCollapsed ? 'w-12' : 'w-80'
          )}
        >
          {leftPanelCollapsed ? (
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setLeftPanelCollapsed(false)}
              >
                ➡️
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* 搜索和折叠按钮 */}
              <div className="p-3 border-b border-[var(--border-muted)]">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLeftPanelCollapsed(true)}
                  >
                    ⬅️
                  </Button>
                </div>
                <SearchAndFilter
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </div>

              {/* 商品列表 */}
              <div className="flex-1 overflow-y-auto">
                <IndustryList
                  selectedGoodsId={selectedGoodsId}
                  onGoodsClick={handleGoodsClick}
                  searchQuery={searchQuery}
                />
              </div>
            </div>
          )}
        </div>

        {/* 中间区域 - 图形视图 */}
        <div className="flex-1 relative">
          <SupplyChainGraph
            focusedGoodsId={selectedGoodsId}
            viewMode={viewMode}
            filterCategory={filters.categories?.[0] || null}
            filterTier={selectedTiers.length === 1 ? selectedTiers[0] : undefined}
            onGoodsClick={handleGoodsClick}
            onGoodsHover={handleGoodsHover}
          />

          {/* 选中提示 */}
          {selectedGoods && viewMode === 'trace' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <Card variant="default" className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎯</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    正在追溯: {selectedGoods.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedGoodsId(null);
                      setViewMode('tier');
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* 快速操作浮动按钮 */}
          {selectedGoods && (
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => openPlanner(selectedGoodsId!)}
              >
                🎯 规划生产
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDetailPanel(true)}
              >
                📋 详情
              </Button>
            </div>
          )}
        </div>

        {/* 右侧面板 - 商品详情 */}
        {showDetailPanel && selectedGoods && (
          <div className="w-96 flex-shrink-0 border-l border-[var(--border-muted)] bg-[var(--bg-surface)] overflow-hidden">
            <GoodsDetailPanel
              goodsId={selectedGoodsId!}
              onClose={() => setShowDetailPanel(false)}
              onGoodsClick={handleGoodsClick}
              onTraceProduct={() => {
                setViewMode('trace');
              }}
            />
          </div>
        )}
      </div>

      {/* 生产规划器弹窗 */}
      {showPlanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-[650px] max-h-[90vh] bg-[var(--bg-surface)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <ProductionPlanner
              initialGoodsId={selectedGoodsId ?? undefined}
              onGoodsClick={handleGoodsClick}
              onClose={() => setShowPlanner(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyChainPage;