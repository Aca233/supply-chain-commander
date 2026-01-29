/**
 * React渲染优化工具集
 * 
 * 提供批量渲染、虚拟化列表、状态批处理等性能优化功能
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ==================== 批量状态更新 ====================

/**
 * 批量状态更新器
 * 收集多个状态更新，在下一帧一次性应用
 */
export class BatchStateUpdater<T extends Record<string, any>> {
  private pendingUpdates: Partial<T>[] = [];
  private rafId: number | null = null;
  private applyCallback: (merged: Partial<T>) => void;
  
  constructor(applyCallback: (merged: Partial<T>) => void) {
    this.applyCallback = applyCallback;
  }
  
  /**
   * 添加更新到批次
   */
  enqueue(update: Partial<T>): void {
    this.pendingUpdates.push(update);
    this.scheduleFlush();
  }
  
  /**
   * 调度批量应用
   */
  private scheduleFlush(): void {
    if (this.rafId !== null) return;
    
    this.rafId = requestAnimationFrame(() => {
      this.flush();
    });
  }
  
  /**
   * 立即应用所有待处理的更新
   */
  flush(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.pendingUpdates.length === 0) return;
    
    // 合并所有更新
    const merged = this.pendingUpdates.reduce(
      (acc, update) => ({ ...acc, ...update }),
      {} as Partial<T>
    );
    
    this.pendingUpdates = [];
    this.applyCallback(merged);
  }
  
  /**
   * 取消所有待处理的更新
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingUpdates = [];
  }
}

/**
 * useBatchUpdate Hook
 * 批量收集状态更新，在下一帧一次性应用
 */
export function useBatchUpdate<T extends Record<string, any>>(
  initialState: T
): [T, (update: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  
  const updaterRef = useRef<BatchStateUpdater<T> | null>(null);
  
  if (updaterRef.current === null) {
    updaterRef.current = new BatchStateUpdater<T>((merged) => {
      setState(prev => ({ ...prev, ...merged }));
    });
  }
  
  const update = useCallback((partial: Partial<T>) => {
    updaterRef.current?.enqueue(partial);
  }, []);
  
  const flush = useCallback(() => {
    updaterRef.current?.flush();
  }, []);
  
  useEffect(() => {
    return () => {
      updaterRef.current?.cancel();
    };
  }, []);
  
  return [state, update, flush];
}

// ==================== 虚拟列表 ====================

export interface VirtualListConfig {
  itemHeight: number;
  overscan?: number; // 超出可视区域多渲染的项数
  containerHeight: number;
}

export interface VirtualListResult<T> {
  virtualItems: { index: number; item: T; style: React.CSSProperties }[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
}

/**
 * useVirtualList Hook
 * 虚拟化长列表，只渲染可见项
 */
export function useVirtualList<T>(
  items: T[],
  config: VirtualListConfig,
  scrollTop: number = 0
): VirtualListResult<T> {
  const { itemHeight, overscan = 5, containerHeight } = config;
  
  return useMemo(() => {
    const totalHeight = items.length * itemHeight;
    
    // 计算可见范围
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);
    
    // 生成虚拟项
    const virtualItems: VirtualListResult<T>['virtualItems'] = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute',
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      });
    }
    
    return {
      virtualItems,
      totalHeight,
      startIndex,
      endIndex,
    };
  }, [items, itemHeight, overscan, containerHeight, scrollTop]);
}

/**
 * useVirtualScroll Hook
 * 管理虚拟滚动状态
 */
export function useVirtualScroll(
  containerRef: React.RefObject<HTMLElement>
): number {
  const [scrollTop, setScrollTop] = useState(0);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);
  
  return scrollTop;
}

// ==================== 渲染节流 ====================

/**
 * useThrottledValue Hook
 * 节流更新值，减少高频更新导致的重渲染
 */
export function useThrottledValue<T>(value: T, interval: number = 16): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const pendingValueRef = useRef<T>(value);
  
  useEffect(() => {
    pendingValueRef.current = value;
    
    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    if (timeSinceLastUpdate >= interval) {
      // 足够时间已过，立即更新
      lastUpdateRef.current = now;
      setThrottledValue(value);
    } else {
      // 调度延迟更新
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      rafIdRef.current = requestAnimationFrame(() => {
        lastUpdateRef.current = performance.now();
        setThrottledValue(pendingValueRef.current);
        rafIdRef.current = null;
      });
    }
    
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [value, interval]);
  
  return throttledValue;
}

/**
 * useDeferredUpdate Hook
 * 延迟非关键更新到空闲时间
 */
export function useDeferredUpdate<T>(value: T, timeout: number = 100): T {
  const [deferredValue, setDeferredValue] = useState(value);
  
  useEffect(() => {
    // 使用requestIdleCallback（如果可用）或setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(
        () => setDeferredValue(value),
        { timeout }
      );
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => setDeferredValue(value), 0);
      return () => clearTimeout(id);
    }
  }, [value, timeout]);
  
  return deferredValue;
}

// ==================== 分块渲染 ====================

export interface ChunkedRenderConfig {
  chunkSize: number;
  delayBetweenChunks?: number;
}

/**
 * useChunkedRender Hook
 * 分块渲染大量数据，避免长时间阻塞主线程
 */
export function useChunkedRender<T>(
  items: T[],
  config: ChunkedRenderConfig
): { renderedItems: T[]; isComplete: boolean; progress: number } {
  const { chunkSize, delayBetweenChunks = 16 } = config;
  const [renderedCount, setRenderedCount] = useState(chunkSize);
  
  useEffect(() => {
    // 重置
    setRenderedCount(chunkSize);
  }, [items, chunkSize]);
  
  useEffect(() => {
    if (renderedCount >= items.length) return;
    
    const timer = setTimeout(() => {
      setRenderedCount(prev => Math.min(prev + chunkSize, items.length));
    }, delayBetweenChunks);
    
    return () => clearTimeout(timer);
  }, [renderedCount, items.length, chunkSize, delayBetweenChunks]);
  
  return useMemo(() => ({
    renderedItems: items.slice(0, renderedCount),
    isComplete: renderedCount >= items.length,
    progress: items.length > 0 ? renderedCount / items.length : 1,
  }), [items, renderedCount]);
}

// ==================== 选择性重渲染 ====================

/**
 * useShallowCompare Hook
 * 浅比较值变化，只在实际变化时触发更新
 */
export function useShallowCompare<T extends Record<string, any>>(value: T): T {
  const ref = useRef<T>(value);
  
  if (!shallowEqual(ref.current, value)) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * 浅比较两个对象
 */
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
}

// ==================== 懒加载 ====================

export interface LazyLoadConfig {
  rootMargin?: string;
  threshold?: number;
}

/**
 * useLazyLoad Hook
 * 元素进入视口时才加载
 */
export function useLazyLoad(
  elementRef: React.RefObject<HTMLElement>,
  config: LazyLoadConfig = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false);
  const { rootMargin = '100px', threshold = 0 } = config;
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [elementRef, rootMargin, threshold]);
  
  return isVisible;
}

// ==================== 渲染性能监控 ====================

export interface RenderStats {
  renderCount: number;
  lastRenderTime: number;
  avgRenderTime: number;
  maxRenderTime: number;
}

/**
 * useRenderStats Hook
 * 追踪组件渲染性能
 */
export function useRenderStats(componentName: string): RenderStats {
  const statsRef = useRef<RenderStats>({
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
  });
  
  const startTimeRef = useRef(performance.now());
  
  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;
    
    const stats = statsRef.current;
    stats.renderCount++;
    stats.lastRenderTime = renderTime;
    stats.avgRenderTime = (stats.avgRenderTime * (stats.renderCount - 1) + renderTime) / stats.renderCount;
    stats.maxRenderTime = Math.max(stats.maxRenderTime, renderTime);
    
    // 性能警告
    if (renderTime > 16) {
      console.warn(`[RenderStats] ${componentName} took ${renderTime.toFixed(2)}ms to render`);
    }
    
    // 重置开始时间
    startTimeRef.current = performance.now();
  });
  
  return statsRef.current;
}

// ==================== 批量DOM更新 ====================

/**
 * useBatchDOM Hook
 * 批量收集DOM更新，统一应用
 */
export function useBatchDOM() {
  const pendingUpdatesRef = useRef<(() => void)[]>([]);
  const rafIdRef = useRef<number | null>(null);
  
  const scheduleUpdate = useCallback((updateFn: () => void) => {
    pendingUpdatesRef.current.push(updateFn);
    
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        const updates = pendingUpdatesRef.current;
        pendingUpdatesRef.current = [];
        rafIdRef.current = null;
        
        // 执行所有更新
        for (const update of updates) {
          update();
        }
      });
    }
  }, []);
  
  const flushNow = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    const updates = pendingUpdatesRef.current;
    pendingUpdatesRef.current = [];
    
    for (const update of updates) {
      update();
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  return { scheduleUpdate, flushNow };
}

export default {
  BatchStateUpdater,
  useBatchUpdate,
  useVirtualList,
  useVirtualScroll,
  useThrottledValue,
  useDeferredUpdate,
  useChunkedRender,
  useShallowCompare,
  useLazyLoad,
  useRenderStats,
  useBatchDOM,
};