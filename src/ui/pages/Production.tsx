/**
 * 生产管理页面
 * 建筑管理、配方设置、建造队列
 * 使用新设计系统组件重构
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import {
  ProductionOverview,
  BuildingCard,
  BuildingCatalog,
  BuildModal,
  BuildingDetailPanel,
  ConstructionQueuePanel,
} from '@/ui/components/Production';
import { ResponsiveOverlayPanel } from '@/ui/components/Layout/ResponsiveOverlayPanel';

// 设计系统组件
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/ui/design-system';

import { useMobile } from '@/ui/hooks/useMobile';

// 视图模式
type ViewMode = 'grid' | 'list';

export const Production: React.FC = () => {
  const { getWorld, playerBuildings, playerCash, buildBuilding, tick, ui, setSelectedBuilding: setStoreSelectedBuilding, setPendingBuildTypeId } = useGameStore();
  const world = getWorld();
  const { isMobile, isTablet, isNarrowDesktop } = useMobile();
  const useOverlayPanels = isMobile || isTablet || isNarrowDesktop;
  
  // 状态
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [buildModalTypeId, setBuildModalTypeId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCatalog, setShowCatalog] = useState(!useOverlayPanels);
  const [showConstructionQueue, setShowConstructionQueue] = useState(false);
  
  const processedStoreSelectionRef = useRef<number | null>(null);
  const processedPendingBuildRef = useRef<number | null>(null);
  
  // 监听从其他页面跳转来的建造请求
  useEffect(() => {
    if (ui.pendingBuildTypeId !== null && ui.pendingBuildTypeId !== processedPendingBuildRef.current) {
      setBuildModalTypeId(ui.pendingBuildTypeId);
      processedPendingBuildRef.current = ui.pendingBuildTypeId;
      setPendingBuildTypeId(null);
    }
  }, [ui.pendingBuildTypeId, setPendingBuildTypeId]);
  
  useEffect(() => {
    if (ui.selectedBuildingId !== null && ui.selectedBuildingId !== processedStoreSelectionRef.current) {
      setSelectedBuilding(ui.selectedBuildingId);
      processedStoreSelectionRef.current = ui.selectedBuildingId;
      setStoreSelectedBuilding(null);
    }
  }, [ui.selectedBuildingId, setStoreSelectedBuilding]);

  useEffect(() => {
    setShowCatalog(!useOverlayPanels);
    if (!useOverlayPanels) {
      setShowConstructionQueue(true);
    } else {
      setShowConstructionQueue(false);
    }
  }, [useOverlayPanels]);

  // 获取玩家的建筑列表
  const playerBuildingList = useMemo(() => {
    if (!world) return [];
    const buildings: number[] = [];

    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === 0) {
        buildings.push(i);
      }
    }
    
    buildings.sort((a, b) => {
      const typeA = world.buildings.types[a];
      const typeB = world.buildings.types[b];
      if (typeA !== typeB) return typeA - typeB;
      return a - b;
    });
    
    return buildings;
  }, [world, tick]);

  // 处理建造建筑
  const handleBuild = useCallback((buildingTypeId: number, outputModeId: number) => {
    const buildingId = buildBuilding(buildingTypeId, outputModeId);
    if (buildingId !== null) {
      setBuildModalTypeId(null);
      setSelectedBuilding(buildingId);
    }
  }, [buildBuilding]);

  // 处理选择建筑
  const handleSelectBuilding = useCallback((index: number) => {
    setSelectedBuilding(selectedBuilding === index ? null : index);
  }, [selectedBuilding]);

  // 处理打开建造弹窗
  const handleOpenBuildModal = useCallback((typeId: number) => {
    setBuildModalTypeId(typeId);
  }, []);

  const showPersistentCatalog = showCatalog && !useOverlayPanels;
  const showPersistentDetail = selectedBuilding !== null && !useOverlayPanels;
  const showPersistentQueue = showConstructionQueue && !useOverlayPanels;

  return (
    <div className="h-full min-h-0 flex">
      {/* 左侧建筑目录 */}
      {showPersistentCatalog && (
        <div className="w-64 flex-shrink-0 h-full">
          <BuildingCatalog onSelectBuilding={handleOpenBuildModal} />
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
        {/* 头部 */}
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 lg:px-6 border-b border-[var(--border-muted)] bg-[var(--bg-surface)]">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showCatalog ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setShowCatalog((open) => !open)}
              >
                {showCatalog ? (useOverlayPanels ? '隐藏目录' : '◀') : (useOverlayPanels ? '建筑目录' : '▶')}
              </Button>
              <Button
                variant={selectedBuilding !== null ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (selectedBuilding !== null) setSelectedBuilding(null);
                }}
                disabled={selectedBuilding === null}
              >
                建筑详情
              </Button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                🏭 生产管理
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                <Badge variant="outline" size="sm">
                  建筑: {playerBuildings}/100
                </Badge>
                <Badge variant="success" size="sm">
                  ¥{playerCash.toLocaleString()}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* 视图切换和队列按钮 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 建造队列按钮 */}
            <Button
              variant={showConstructionQueue ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowConstructionQueue((open) => !open)}
            >
              🏗️ 建造队列
            </Button>
            
            {/* 视图切换 */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList variant="default" size="sm">
                <TabsTrigger value="grid">网格</TabsTrigger>
                <TabsTrigger value="list">列表</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-h-0 flex">
          {/* 建筑展示区 */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
            {/* 生产概览 */}
            <ProductionOverview />

            {/* 建筑列表 */}
            {playerBuildingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">还没有建筑</h3>
                <p className="text-sm mb-4">{useOverlayPanels ? '打开建筑目录开始建造吧' : '从左侧目录选择建筑开始建造吧'}</p>
                {!showCatalog && (
                  <Button onClick={() => setShowCatalog(true)}>
                    📋 打开建筑目录
                  </Button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              /* 网格视图 */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {playerBuildingList.map((buildingIndex) => (
                  <BuildingCard
                    key={buildingIndex}
                    buildingIndex={buildingIndex}
                    isSelected={selectedBuilding === buildingIndex}
                    onClick={() => handleSelectBuilding(buildingIndex)}
                  />
                ))}
              </div>
            ) : (
              /* 列表视图 */
              <div className="space-y-2">
                {playerBuildingList.map((buildingIndex) => (
                  <BuildingCard
                    key={buildingIndex}
                    buildingIndex={buildingIndex}
                    isSelected={selectedBuilding === buildingIndex}
                    onClick={() => handleSelectBuilding(buildingIndex)}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          {/* 右侧详情面板 */}
          {showPersistentDetail && (
            <div className="w-80 flex-shrink-0 h-full border-l border-[var(--border-muted)]">
              <BuildingDetailPanel
                buildingIndex={selectedBuilding}
                onClose={() => setSelectedBuilding(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 建造模态框 */}
      {buildModalTypeId !== null && (
        <BuildModal
          buildingTypeId={buildModalTypeId}
          onClose={() => setBuildModalTypeId(null)}
          onConfirm={handleBuild}
        />
      )}

      {/* 建造队列悬浮面板 */}
      {showPersistentQueue && (
        <div
          className={`fixed bottom-4 w-80 z-40 transition-all duration-300 ${
            showPersistentDetail ? 'right-[340px]' : 'right-4'
          }`}
        >
          <ConstructionQueuePanel
            collapsed={false}
            onToggleCollapse={() => setShowConstructionQueue(false)}
          />
        </div>
      )}

      {/* 响应式覆盖层面板 */}
      <ResponsiveOverlayPanel
        open={useOverlayPanels && showCatalog}
        title="建筑目录"
        position="left"
        widthClassName="max-w-sm"
        onClose={() => setShowCatalog(false)}
      >
        <BuildingCatalog onSelectBuilding={handleOpenBuildModal} />
      </ResponsiveOverlayPanel>

      <ResponsiveOverlayPanel
        open={useOverlayPanels && selectedBuilding !== null}
        title="建筑详情"
        position="right"
        widthClassName="max-w-lg"
        onClose={() => setSelectedBuilding(null)}
      >
        {selectedBuilding !== null && (
          <BuildingDetailPanel
            buildingIndex={selectedBuilding}
            onClose={() => setSelectedBuilding(null)}
          />
        )}
      </ResponsiveOverlayPanel>

      <ResponsiveOverlayPanel
        open={useOverlayPanels && showConstructionQueue}
        title="建造队列"
        position="bottom"
        onClose={() => setShowConstructionQueue(false)}
      >
        <ConstructionQueuePanel
          collapsed={false}
          onToggleCollapse={() => setShowConstructionQueue(false)}
        />
      </ResponsiveOverlayPanel>
    </div>
  );
};

export default Production;
