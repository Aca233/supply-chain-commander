/**
 * 生产管理页面状态 hook
 * 统一管理面板状态、store 同步、回调函数
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import type { ViewMode } from '@/ui/components/Production/ProductionToolbar';

export interface ProductionPageState {
  // 面板状态
  selectedBuilding: number | null;
  buildModalTypeId: number | null;
  showCatalog: boolean;
  showQueue: boolean;
  viewMode: ViewMode;

  // 建筑列表
  playerBuildingList: number[];

  // 队列计数
  queueCount: number;

  // 动作
  selectBuilding: (index: number | null) => void;
  openBuildModal: (typeId: number) => void;
  closeBuildModal: () => void;
  handleBuild: (typeId: number, slotMethods?: number[]) => void;
  toggleCatalog: () => void;
  toggleQueue: () => void;
  setViewMode: (mode: ViewMode) => void;
  closeCatalog: () => void;
  closeQueue: () => void;
}

export function useProductionPageState(): ProductionPageState {
  const {
    getWorld, buildBuilding, tick, ui,
    setSelectedBuilding: setStoreSelectedBuilding,
    setPendingBuildTypeId,
    getConstructionQueue, getDemolitionQueue,
  } = useGameStore();

  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [buildModalTypeId, setBuildModalTypeId] = useState<number | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  // 监听从其他页面跳转来的建筑选中
  useEffect(() => {
    if (ui.selectedBuildingId !== null && ui.selectedBuildingId !== processedStoreSelectionRef.current) {
      setSelectedBuilding(ui.selectedBuildingId);
      processedStoreSelectionRef.current = ui.selectedBuildingId;
      setStoreSelectedBuilding(null);
    }
  }, [ui.selectedBuildingId, setStoreSelectedBuilding]);

  // 获取玩家建筑列表
  const playerBuildingList = useMemo(() => {
    const world = getWorld();
    if (!world) return [];
    const buildings: number[] = [];
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === 0) buildings.push(i);
    }
    buildings.sort((a, b) => {
      const typeA = world.buildings.types[a];
      const typeB = world.buildings.types[b];
      return typeA !== typeB ? typeA - typeB : a - b;
    });
    return buildings;
  }, [getWorld, tick]);

  // 队列计数
  const queueCount = useMemo(() => {
    const cq = getConstructionQueue?.() || [];
    const dq = getDemolitionQueue?.() || [];
    const activeC = cq.filter((t: { status: number }) => t.status !== 2 && t.status !== 3).length;
    const activeD = dq.filter((t: { status: number }) => t.status !== 2 && t.status !== 3).length;
    return activeC + activeD;
  }, [getConstructionQueue, getDemolitionQueue, tick]);

  const selectBuilding = useCallback((index: number | null) => {
    setSelectedBuilding(prev => prev === index ? null : index);
  }, []);

  const handleBuild = useCallback((typeId: number, slotMethods?: number[]) => {
    const buildingId = buildBuilding(typeId, slotMethods);
    if (buildingId !== null) {
      setBuildModalTypeId(null);
      setSelectedBuilding(buildingId);
    }
  }, [buildBuilding]);

  return {
    selectedBuilding,
    buildModalTypeId,
    showCatalog,
    showQueue,
    viewMode,
    playerBuildingList,
    queueCount,
    selectBuilding,
    openBuildModal: setBuildModalTypeId,
    closeBuildModal: useCallback(() => setBuildModalTypeId(null), []),
    handleBuild,
    toggleCatalog: useCallback(() => setShowCatalog(v => !v), []),
    toggleQueue: useCallback(() => setShowQueue(v => !v), []),
    setViewMode,
    closeCatalog: useCallback(() => setShowCatalog(false), []),
    closeQueue: useCallback(() => setShowQueue(false), []),
  };
}
