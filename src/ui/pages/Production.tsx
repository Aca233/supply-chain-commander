import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { RECIPES } from '@/data/recipes';
import {
  ProductionOverview,
  BuildingCard,
  BuildingCatalog,
  BuildModal,
  BuildingDetailPanel,
} from '@/ui/components/Production';

// 视图模式
type ViewMode = 'grid' | 'list';

export const Production: React.FC = () => {
  const { getWorld, playerBuildings, playerCash, buildBuilding, tick, ui, setSelectedBuilding: setStoreSelectedBuilding } = useGameStore();
  const world = getWorld();
  
  // 状态
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [buildModalTypeId, setBuildModalTypeId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCatalog, setShowCatalog] = useState(true);
  
  // 用于跟踪是否已经处理过从 store 传入的 selectedBuildingId
  const processedStoreSelectionRef = useRef<number | null>(null);
  
  // 当从 store 收到 selectedBuildingId 时，同步到本地状态
  useEffect(() => {
    if (ui.selectedBuildingId !== null && ui.selectedBuildingId !== processedStoreSelectionRef.current) {
      setSelectedBuilding(ui.selectedBuildingId);
      processedStoreSelectionRef.current = ui.selectedBuildingId;
      // 清除 store 中的选择，避免重复触发
      setStoreSelectedBuilding(null);
    }
  }, [ui.selectedBuildingId, setStoreSelectedBuilding]);

  // 获取玩家的建筑列表（按建筑类型分组排序，同类型建筑排在一起）
  const playerBuildingList = useMemo(() => {
    if (!world) return [];
    const buildings: number[] = [];

    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === 0) {
        buildings.push(i);
      }
    }
    
    // 按建筑类型ID排序，同类型的建筑会排在一起
    buildings.sort((a, b) => {
      const typeA = world.buildings.types[a];
      const typeB = world.buildings.types[b];
      if (typeA !== typeB) {
        return typeA - typeB;
      }
      // 同类型建筑按索引排序（先建造的在前）
      return a - b;
    });
    
    return buildings;
  }, [world, tick]);

  // 处理建造建筑
  const handleBuild = useCallback((buildingTypeId: number, recipeId: number) => {
    const buildingId = buildBuilding(buildingTypeId, recipeId);
    if (buildingId !== null) {
      setBuildModalTypeId(null);
      // 选中新建造的建筑
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

  return (
    <div className="h-full flex">
      {/* 左侧建筑目录 */}
      {showCatalog && (
        <div className="w-64 flex-shrink-0 h-full">
          <BuildingCatalog onSelectBuilding={handleOpenBuildModal} />
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className={`p-2 rounded-lg transition-colors ${
                showCatalog ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-text-tertiary hover:bg-white/10'
              }`}
              title={showCatalog ? '隐藏建筑目录' : '显示建筑目录'}
            >
              {showCatalog ? '◀' : '▶'}
            </button>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">生产管理</h2>
              <p className="text-xs text-text-tertiary">
                建筑: {playerBuildings}/100 · 资金: <span className="text-green-400">¥{playerCash.toLocaleString()}</span>
              </p>
            </div>
          </div>
          
          {/* 视图切换 */}
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                网格
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                列表
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 建筑展示区 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            {/* 生产概览 */}
            <ProductionOverview />

            {/* 建筑列表 */}
            {playerBuildingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-lg font-medium text-text-secondary mb-2">还没有建筑</h3>
                <p className="text-sm mb-4">从左侧目录选择建筑开始建造吧</p>
                {!showCatalog && (
                  <button
                    onClick={() => setShowCatalog(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                  >
                    打开建筑目录
                  </button>
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
          {selectedBuilding !== null && (
            <div className="w-80 flex-shrink-0 h-full border-l border-white/10 animate-slide-in-right">
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

      {/* 自定义动画样式 */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Production;