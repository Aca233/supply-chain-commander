/**
 * 产业链页面
 * 完整的产业链可视化和分析界面
 * 支持移动端响应式布局
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
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@/ui/design-system';
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
  const [mobileTab, setMobileTab] = useState<'list' | 'graph'>('list');

  // 选中的层级（从filters中提取）
  const selectedTiers = useMemo(() => filters.tiers || [], [filters.tiers]);

  // 商品点击处理
  const handleGoodsClick = useCallback((goodsId: number) => {
    setSelectedGoodsId(goodsId);
    setShowDetailPanel(true);
    if (isMobile) {
      // 移动端直接显示详情弹窗
    } else if (viewMode !== 'trace') {
      setViewMode('trace');
    }
  }, [viewMode, isMobile]);

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

  // ==================== 移动端布局 ====================
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* 顶部：搜索 + 视图切换 */}
        <div className="flex-shrink-0 p-3 border-b border-border bg-background-surface space-y-2">
          {/* 视图切换 + 搜索 */}
          <div className="flex items-center gap-2">
            {/* 视图切换按钮 */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => setMobileTab('list')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mobileTab === 'list'
                    ? 'bg-accent text-white'
                    : 'bg-background-muted text-foreground-secondary'
                }`}
              >
                📋 列表
              </button>
              <button
                onClick={() => setMobileTab('graph')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mobileTab === 'graph'
                    ? 'bg-accent text-white'
                    : 'bg-background-muted text-foreground-secondary'
                }`}
              >
                🔗 图表
              </button>
            </div>
            
            {/* 搜索栏 */}
            <div className="flex-1">
              <Input
                placeholder="搜索商品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
                variant="filled"
                leftIcon="🔍"
              />
            </div>
          </div>
          
          {/* 层级筛选 - 水平滚动 */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[0, 1, 2, 3].map((tier) => {
              const isSelected = selectedTiers.includes(tier);
              const tierColors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500'];
              return (
                <button
                  key={tier}
                  onClick={() => handleTierToggle(tier)}
                  className={`
                    flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all
                    ${isSelected
                      ? 'bg-accent text-white'
                      : 'bg-background-muted text-foreground-secondary'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${tierColors[tier]}`} />
                  <span>T{tier}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 主内容：根据 mobileTab 切换 */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'list' ? (
            <div className="h-full overflow-y-auto">
              <IndustryList
                selectedGoodsId={selectedGoodsId}
                onGoodsClick={handleGoodsClick}
                searchQuery={searchQuery}
              />
            </div>
          ) : (
            <div className="h-full">
              <SupplyChainGraph
                viewMode={viewMode}
                focusedGoodsId={selectedGoodsId}
                onGoodsClick={handleGoodsClick}
                onGoodsHover={handleGoodsHover}
              />
            </div>
          )}
        </div>

        {/* 商品详情弹窗 */}
        {showDetailPanel && selectedGoods && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDetailPanel(false)}
          >
            <div 
              className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-background-elevated rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h3 className="font-semibold">{selectedGoods.name}</h3>
                <button 
                  onClick={() => setShowDetailPanel(false)}
                  className="w-8 h-8 rounded-full bg-background-muted flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(80vh-56px)]">
                <GoodsDetailPanel
                  goodsId={selectedGoodsId!}
                  onClose={() => setShowDetailPanel(false)}
                  onGoodsClick={handleGoodsClick}
                  onTraceProduct={() => {
                    setShowDetailPanel(false);
                    setMobileTab('graph');
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 生产规划器弹窗 */}
        {showPlanner && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-3"
            onClick={() => setShowPlanner(false)}
          >
            <div 
              className="w-full h-full bg-background-elevated rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
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
  }

  // ==================== 平板布局 ====================
  if (isTablet) {
    return (
      <div className="flex flex-col h-full">
        {/* 顶部工具栏 */}
        <div className="flex-shrink-0 p-3 border-b border-border bg-background-surface">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔗</span>
              <h1 className="text-base font-semibold">产业链</h1>
              <Badge variant="outline" size="sm">{ALL_GOODS.length} 商品</Badge>
            </div>
            <ViewModeSelector value={viewMode} onChange={setViewMode} />
          </div>
          
          {/* 层级筛选 */}
          <div className="mt-2">
            <TierLegend
              selectedTiers={selectedTiers.length > 0 ? selectedTiers : undefined}
              onTierClick={handleTierToggle}
            />
          </div>
        </div>

        {/* 主内容 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧列表 */}
          <div className="w-64 flex-shrink-0 border-r border-border overflow-hidden flex flex-col">
            <div className="p-2 border-b border-border">
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
                variant="filled"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <IndustryList
                selectedGoodsId={selectedGoodsId}
                onGoodsClick={handleGoodsClick}
                searchQuery={searchQuery}
              />
            </div>
          </div>

          {/* 图形区 */}
          <div className="flex-1 relative">
            <SupplyChainGraph
              focusedGoodsId={selectedGoodsId}
              viewMode={viewMode}
              filterCategory={filters.categories?.[0] || null}
              filterTier={selectedTiers.length === 1 ? selectedTiers[0] : undefined}
              onGoodsClick={handleGoodsClick}
              onGoodsHover={handleGoodsHover}
            />
          </div>
        </div>

        {/* 详情弹窗 */}
        {showDetailPanel && selectedGoods && (
          <div 
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setShowDetailPanel(false)}
          >
            <div 
              className="absolute right-0 top-0 bottom-0 w-80 bg-background-elevated"
              onClick={(e) => e.stopPropagation()}
            >
              <GoodsDetailPanel
                goodsId={selectedGoodsId!}
                onClose={() => setShowDetailPanel(false)}
                onGoodsClick={handleGoodsClick}
                onTraceProduct={() => setViewMode('trace')}
              />
            </div>
          </div>
        )}

        {/* 生产规划器 */}
        {showPlanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg max-h-[90vh] bg-background-surface rounded-xl shadow-2xl overflow-hidden flex flex-col">
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
  }

  // ==================== 桌面端布局 ====================
  return (
    <div className="h-full flex flex-col bg-background">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 border-b border-border bg-background-surface">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 标题 */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h1 className="text-lg font-semibold">产业链</h1>
              <p className="text-xs text-foreground-muted">
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
            'flex-shrink-0 border-r border-border bg-background-surface',
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
              <div className="p-3 border-b border-border">
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
                  <span className="font-medium">
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
          <div className="w-96 flex-shrink-0 border-l border-border bg-background-surface overflow-hidden">
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
          <div className="w-[650px] max-h-[90vh] bg-background-surface rounded-xl shadow-2xl overflow-hidden flex flex-col">
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
