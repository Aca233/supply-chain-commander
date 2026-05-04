/**
 * 生产管理页面（视觉重做）
 *
 * 设计要点：
 * - 空状态用居中大图 + 渐变按钮
 * - 网格视图：卡片行间距 + 选中行下方插入展开面板
 * - 表格视图：半透明表头 + 行间微分隔 + 选中行下方展开
 * - 内容区带顶部微光渐变
 */

import React, { useMemo } from 'react';
import {
  BuildingCatalog,
  BuildModal,
  ConstructionQueuePanel,
} from '@/ui/components/Production';
import { BuildingCardGrid } from '@/ui/components/Production/BuildingCardGrid';
import { BuildingCardExpanded } from '@/ui/components/Production/BuildingCardExpanded';
import { BuildingCardRow } from '@/ui/components/Production/BuildingCardRow';
import { ProductionToolbar } from '@/ui/components/Production/ProductionToolbar';
import { useProductionStats } from '@/ui/components/Production/useProductionStats';
import { useProductionPageState } from '@/ui/hooks/useProductionPageState';
import { ResponsiveOverlayPanel } from '@/ui/components/Layout/ResponsiveOverlayPanel';
import { useMobile } from '@/ui/hooks/useMobile';
import { Button } from '@/ui/design-system';

/**
 * 计算当前视口下每行卡片数量
 */
function useColumnsPerRow(): number {
  const { width } = useMobile();
  if (width >= 1536) return 5;  // 2xl
  if (width >= 1280) return 4;  // xl
  if (width >= 1024) return 3;  // lg
  if (width >= 640) return 2;   // sm
  return 1;
}

/**
 * 将建筑列表按行分组，并在选中建筑所在行后插入展开面板
 */
function useBuildingRows(
  buildings: number[],
  columnsPerRow: number,
  selectedBuilding: number | null,
) {
  return useMemo(() => {
    const rows: Array<
      | { type: 'cards'; items: number[] }
      | { type: 'detail'; buildingIndex: number }
    > = [];
    let selectedRowInserted = false;

    for (let i = 0; i < buildings.length; i += columnsPerRow) {
      const rowItems = buildings.slice(i, i + columnsPerRow);
      rows.push({ type: 'cards', items: rowItems });

      if (selectedBuilding !== null && !selectedRowInserted && rowItems.includes(selectedBuilding)) {
        rows.push({ type: 'detail', buildingIndex: selectedBuilding });
        selectedRowInserted = true;
      }
    }

    return rows;
  }, [buildings, columnsPerRow, selectedBuilding]);
}

export const Production: React.FC = () => {
  const stats = useProductionStats();
  const page = useProductionPageState();
  const columnsPerRow = useColumnsPerRow();
  const rows = useBuildingRows(page.playerBuildingList, columnsPerRow, page.selectedBuilding);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ═══ 工具栏 ═══ */}
      <ProductionToolbar
        stats={stats}
        viewMode={page.viewMode}
        onViewModeChange={page.setViewMode}
        onOpenCatalog={page.toggleCatalog}
        onOpenQueue={page.toggleQueue}
        queueCount={page.queueCount}
      />

      {/* ═══ 内容区 ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {/* 顶部渐变光晕 */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--accent)]/[0.03] to-transparent pointer-events-none z-0" />

        <div className="relative z-10 p-4 lg:p-6">
          {page.playerBuildingList.length === 0 ? (
            /* ──── 空状态 ──── */
            <div className="flex flex-col items-center justify-center py-20">
              {/* 装饰圆环 */}
              <div className="
                w-24 h-24 rounded-full mb-6
                bg-gradient-to-br from-white/[0.06] to-white/[0.02]
                border border-white/[0.08]
                flex items-center justify-center
                shadow-[0_0_40px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]
              ">
                <span className="text-4xl">🏗️</span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">
                还没有建筑
              </h3>
              <p className="text-sm text-white/30 mb-6 text-center max-w-[240px]">
                建造你的第一个工厂，开始生产商品并赚取利润
              </p>
              <Button variant="primary" size="md" onClick={page.toggleCatalog} className="gap-1.5">
                <span className="text-base">＋</span>
                建造第一个建筑
              </Button>
            </div>

          ) : page.viewMode === 'grid' ? (
            /* ──── 网格视图 ──── */
            <div className="space-y-3">
              {rows.map((row, ri) => {
                if (row.type === 'detail') {
                  return (
                    <BuildingCardExpanded
                      key={`detail-${row.buildingIndex}`}
                      buildingIndex={row.buildingIndex}
                      onClose={() => page.selectBuilding(null)}
                    />
                  );
                }
                const gridCols = {
                  1: 'grid-cols-1',
                  2: 'grid-cols-1 sm:grid-cols-2',
                  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
                }[columnsPerRow] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

                return (
                  <div key={`row-${ri}`} className={`grid ${gridCols} gap-3`}>
                    {row.items.map(idx => (
                      <BuildingCardGrid
                        key={idx}
                        buildingIndex={idx}
                        isSelected={page.selectedBuilding === idx}
                        onClick={() => page.selectBuilding(idx)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

          ) : (
            /* ──── 表格视图 ──── */
            <div className="space-y-0.5">
              {/* 表头 — 半透明固定行 */}
              <div className="
                flex items-center gap-3 px-3 py-2
                rounded-lg
                bg-white/[0.02] border border-white/[0.04]
                text-[9px] text-white/20 uppercase tracking-wider font-semibold
                mb-1
              ">
                <span className="w-[140px] pl-3">建筑</span>
                <span className="w-[52px]">状态</span>
                <span className="w-[80px]">效率</span>
                <span className="w-[60px]">输入</span>
                <span className="flex-1">产出</span>
                <span className="w-[76px] text-right pr-2">日利润</span>
              </div>
              {page.playerBuildingList.map(idx => (
                <React.Fragment key={idx}>
                  <BuildingCardRow
                    buildingIndex={idx}
                    isSelected={page.selectedBuilding === idx}
                    onClick={() => page.selectBuilding(idx)}
                  />
                  {page.selectedBuilding === idx && (
                    <BuildingCardExpanded
                      buildingIndex={idx}
                      onClose={() => page.selectBuilding(null)}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 建造模态框 ═══ */}
      {page.buildModalTypeId !== null && (
        <BuildModal
          buildingTypeId={page.buildModalTypeId}
          onClose={page.closeBuildModal}
          onConfirm={page.handleBuild}
        />
      )}

      {/* ═══ Overlay: 建筑目录 ═══ */}
      <ResponsiveOverlayPanel
        open={page.showCatalog}
        title="建筑目录"
        position="left"
        widthClassName="max-w-sm"
        onClose={page.closeCatalog}
      >
        <BuildingCatalog onSelectBuilding={page.openBuildModal} />
      </ResponsiveOverlayPanel>

      {/* ═══ Overlay: 建造队列 ═══ */}
      <ResponsiveOverlayPanel
        open={page.showQueue}
        title="建造队列"
        position="bottom"
        onClose={page.closeQueue}
      >
        <ConstructionQueuePanel
          collapsed={false}
          onToggleCollapse={page.closeQueue}
        />
      </ResponsiveOverlayPanel>
    </div>
  );
};

export default Production;
