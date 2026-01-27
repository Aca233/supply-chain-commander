/**
 * 状态选择器
 * 使用浅比较和记忆化减少不必要的重渲染
 */

import { useCallback, useMemo, useRef } from 'react';
import { useGameStore } from './gameStore';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT } from '@/core/constants';

// ==================== 浅比较工具 ====================

function shallowEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if ((a as any)[key] !== (b as any)[key]) return false;
  }
  
  return true;
}

function shallowEqualArrays<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

// ==================== 记忆化Hook ====================

/**
 * 使用浅比较的记忆化选择器
 */
export function useMemoizedSelector<T>(
  selector: () => T,
  deps: React.DependencyList = []
): T {
  const prevRef = useRef<T | undefined>(undefined);
  
  const result = selector();
  
  if (prevRef.current !== undefined && shallowEqual(prevRef.current, result)) {
    return prevRef.current;
  }
  
  prevRef.current = result;
  return result;
}

/**
 * 使用浅比较数组的记忆化选择器
 */
export function useMemoizedArraySelector<T>(
  selector: () => T[],
  deps: React.DependencyList = []
): T[] {
  const prevRef = useRef<T[] | undefined>(undefined);
  
  const result = selector();
  
  if (prevRef.current !== undefined && shallowEqualArrays(prevRef.current, result)) {
    return prevRef.current;
  }
  
  prevRef.current = result;
  return result;
}

// ==================== 具体选择器 ====================

/**
 * 基础状态选择器
 */
export function useGameTick() {
  return useGameStore((state) => state.tick);
}

export function useGamePaused() {
  return useGameStore((state) => state.paused);
}

export function useGameSpeed() {
  return useGameStore((state) => state.speed);
}

export function useGameDate() {
  return useGameStore((state) => state.gameDate);
}

export function usePlayerCash() {
  return useGameStore((state) => state.playerCash);
}

export function usePlayerAssets() {
  return useGameStore((state) => state.playerAssets);
}

export function usePlayerBuildingCount() {
  return useGameStore((state) => state.playerBuildings);
}

/**
 * UI状态选择器
 */
export function useCurrentPage() {
  return useGameStore((state) => state.ui.currentPage);
}

export function useSidebarCollapsed() {
  return useGameStore((state) => state.ui.sidebarCollapsed);
}

export function useTheme() {
  return useGameStore((state) => state.ui.theme);
}

export function useSelectedGoodsId() {
  return useGameStore((state) => state.ui.selectedGoodsId);
}

export function useSelectedBuildingId() {
  return useGameStore((state) => state.ui.selectedBuildingId);
}

export function useNotifications() {
  return useGameStore((state) => state.ui.notifications);
}

/**
 * 性能状态选择器
 */
export function usePerformanceReport() {
  return useGameStore((state) => state.performance);
}

/**
 * 派生数据选择器 - 使用记忆化
 */

// 玩家财务摘要
export function usePlayerFinancialSummary() {
  const cash = usePlayerCash();
  const assets = usePlayerAssets();
  const buildings = usePlayerBuildingCount();
  
  return useMemo(() => ({
    cash,
    assets,
    buildings,
    netWorth: cash + assets,
  }), [cash, assets, buildings]);
}

// 价格趋势数据（按商品ID）
export function usePriceTrend(goodsId: number | null) {
  const getPriceTrend = useGameStore((state) => state.getPriceTrend);
  
  return useMemo(() => {
    if (goodsId === null) return null;
    return getPriceTrend(goodsId);
  }, [goodsId, getPriceTrend]);
}

// 市场统计（按商品ID）
export function useMarketStats(goodsId: number | null) {
  const getMarketStats = useGameStore((state) => state.getMarketStats);
  
  return useMemo(() => {
    if (goodsId === null) return null;
    return getMarketStats(goodsId);
  }, [goodsId, getMarketStats]);
}

// 订单簿（按商品ID）
export function useOrderBook(goodsId: number | null) {
  const getOrderBook = useGameStore((state) => state.getOrderBook);
  
  return useMemo(() => {
    if (goodsId === null) return null;
    return getOrderBook(goodsId);
  }, [goodsId, getOrderBook]);
}

// 建筑状态（按建筑ID）
export function useBuildingStatus(buildingId: number | null) {
  const getBuildingStatus = useGameStore((state) => state.getBuildingStatus);
  
  return useMemo(() => {
    if (buildingId === null) return null;
    return getBuildingStatus(buildingId);
  }, [buildingId, getBuildingStatus]);
}

/**
 * 增量更新选择器 - 只在变化时重新计算
 */

interface InventoryItem {
  goodsId: number;
  name: string;
  quantity: number;
  value: number;
}

export function usePlayerInventory(): InventoryItem[] {
  const getPlayerInventory = useGameStore((state) => state.getPlayerInventory);
  const tick = useGameTick();
  const prevRef = useRef<InventoryItem[]>([]);
  
  return useMemo(() => {
    const current = getPlayerInventory();
    
    // 检查是否有实质变化
    if (current.length === prevRef.current.length) {
      let hasChange = false;
      for (let i = 0; i < current.length; i++) {
        if (current[i].goodsId !== prevRef.current[i]?.goodsId ||
            Math.abs(current[i].quantity - (prevRef.current[i]?.quantity || 0)) > 0.01) {
          hasChange = true;
          break;
        }
      }
      if (!hasChange) return prevRef.current;
    }
    
    prevRef.current = current;
    return current;
  }, [getPlayerInventory, tick]);
}

/**
 * 分页数据选择器
 */
export function usePaginatedData<T>(
  data: T[],
  page: number,
  pageSize: number
): { items: T[]; totalPages: number; hasMore: boolean } {
  return useMemo(() => {
    const start = page * pageSize;
    const items = data.slice(start, start + pageSize);
    const totalPages = Math.ceil(data.length / pageSize);
    
    return {
      items,
      totalPages,
      hasMore: page < totalPages - 1,
    };
  }, [data, page, pageSize]);
}

// ==================== 批量选择器 ====================

/**
 * 批量获取多个商品的价格
 */
export function useGoodsPrices(goodsIds: number[]): Map<number, number> {
  const getWorld = useGameStore((state) => state.getWorld);
  const tick = useGameTick();
  
  return useMemo(() => {
    const prices = new Map<number, number>();
    const world = getWorld();
    if (!world) return prices;
    
    for (const id of goodsIds) {
      if (id < world.goods.count) {
        prices.set(id, world.goods.prices[id]);
      }
    }
    
    return prices;
  }, [goodsIds, getWorld, tick]);
}

/**
 * 批量获取多个商品的供需数据
 */
export function useGoodsSupplyDemand(goodsIds: number[]): Map<number, { supply: number; demand: number }> {
  const getWorld = useGameStore((state) => state.getWorld);
  const tick = useGameTick();
  
  return useMemo(() => {
    const data = new Map<number, { supply: number; demand: number }>();
    const world = getWorld();
    if (!world) return data;
    
    for (const id of goodsIds) {
      if (id < world.goods.count) {
        data.set(id, {
          supply: world.goods.supplies[id],
          demand: world.goods.demands[id],
        });
      }
    }
    
    return data;
  }, [goodsIds, getWorld, tick]);
}

// ==================== 动作选择器 ====================

/**
 * 只返回动作的选择器（不会触发重渲染）
 */
export function useGameActions() {
  return {
    startGame: useGameStore((state) => state.startGame),
    pauseGame: useGameStore((state) => state.pauseGame),
    resumeGame: useGameStore((state) => state.resumeGame),
    setSpeed: useGameStore((state) => state.setSpeed),
    manualTick: useGameStore((state) => state.manualTick),
    placeBuyOrder: useGameStore((state) => state.placeBuyOrder),
    placeSellOrder: useGameStore((state) => state.placeSellOrder),
    cancelPlayerOrder: useGameStore((state) => state.cancelPlayerOrder),
    buildBuilding: useGameStore((state) => state.buildBuilding),
    upgradeBuilding: useGameStore((state) => state.upgradeBuilding),
    setSelectedGoods: useGameStore((state) => state.setSelectedGoods),
    setSelectedBuilding: useGameStore((state) => state.setSelectedBuilding),
    setCurrentPage: useGameStore((state) => state.setCurrentPage),
    toggleSidebar: useGameStore((state) => state.toggleSidebar),
    toggleTheme: useGameStore((state) => state.toggleTheme),
    addNotification: useGameStore((state) => state.addNotification),
    dismissNotification: useGameStore((state) => state.dismissNotification),
  };
}

// ==================== 节流更新 ====================

/**
 * 节流选择器 - 限制更新频率
 */
export function useThrottledValue<T>(
  selector: () => T,
  throttleMs: number = 100
): T {
  const valueRef = useRef<T | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);
  
  const current = selector();
  const now = Date.now();
  
  if (valueRef.current === undefined || 
      now - lastUpdateRef.current > throttleMs) {
    valueRef.current = current;
    lastUpdateRef.current = now;
  }
  
  return valueRef.current!;
}

/**
 * 按tick间隔更新的选择器
 */
export function useTickIntervalValue<T>(
  selector: () => T,
  tickInterval: number = 10
): T {
  const tick = useGameTick();
  const valueRef = useRef<{ value: T; tick: number } | undefined>(undefined);
  
  if (valueRef.current === undefined || 
      tick - valueRef.current.tick >= tickInterval) {
    valueRef.current = { value: selector(), tick };
  }
  
  return valueRef.current.value;
}

// ==================== 组合选择器 ====================

/**
 * 市场概览数据
 */
export function useMarketOverview() {
  const getWorld = useGameStore((state) => state.getWorld);
  const tick = useGameTick();
  
  return useTickIntervalValue(() => {
    const world = getWorld();
    if (!world) return null;
    
    let totalVolume = 0;
    let totalOrders = 0;
    
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      totalVolume += world.goods.supplies[i] + world.goods.demands[i];
    }
    
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i]) {
        totalOrders++;
      }
    }
    
    return {
      totalVolume,
      totalOrders,
      goodsCount: ACTUAL_GOODS_COUNT,
    };
  }, 20);
}

/**
 * 生产概览数据
 */
export function useProductionOverview() {
  const getPlayerBuildings = useGameStore((state) => state.getPlayerBuildings);
  const tick = useGameTick();
  
  return useTickIntervalValue(() => {
    const buildings = getPlayerBuildings();
    
    let activeCount = 0;
    let retailCount = 0;
    
    for (const b of buildings) {
      if (b.isRetail) {
        retailCount++;
      } else if (b.status) {
        activeCount++;
      }
    }
    
    return {
      totalBuildings: buildings.length,
      productionBuildings: activeCount,
      retailBuildings: retailCount,
    };
  }, 30);
}