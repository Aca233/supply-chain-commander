/**
 * 虚拟列表组件
 * 高性能渲染大量列表项，只渲染可视区域内的元素
 */

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useVirtualList, useVirtualScroll, useThrottledValue } from '@/ui/utils/renderOptimization';

// ==================== 类型定义 ====================

export interface VirtualListProps<T> {
  /** 列表数据 */
  items: T[];
  /** 每项高度（像素） */
  itemHeight: number;
  /** 容器高度（像素） */
  height: number;
  /** 容器宽度 */
  width?: number | string;
  /** 超出可视区域预渲染的项数 */
  overscan?: number;
  /** 渲染单个项 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 获取唯一key */
  getKey?: (item: T, index: number) => string | number;
  /** 容器类名 */
  className?: string;
  /** 列表为空时显示的内容 */
  emptyContent?: React.ReactNode;
  /** 加载状态 */
  loading?: boolean;
  /** 加载更多回调 */
  onLoadMore?: () => void;
  /** 触发加载更多的阈值（距离底部多少像素时触发） */
  loadMoreThreshold?: number;
}

// ==================== 虚拟列表组件 ====================

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const {
    items,
    itemHeight,
    height,
    width = '100%',
    overscan = 5,
    renderItem,
    getKey,
    className = '',
    emptyContent,
    loading = false,
    onLoadMore,
    loadMoreThreshold = 100,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 节流滚动事件
  const throttledScrollTop = useThrottledValue(scrollTop, 16);

  // 计算虚拟列表
  const { virtualItems, totalHeight, startIndex, endIndex } = useVirtualList(
    items,
    {
      itemHeight,
      overscan,
      containerHeight: height,
    },
    throttledScrollTop
  );

  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    
    // 检查是否需要加载更多
    if (onLoadMore && !loading) {
      const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceToBottom < loadMoreThreshold) {
        onLoadMore();
      }
    }
  }, [onLoadMore, loading, loadMoreThreshold]);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const container = containerRef.current;
    if (!container) return;
    
    let targetTop: number;
    
    switch (align) {
      case 'center':
        targetTop = index * itemHeight - (height - itemHeight) / 2;
        break;
      case 'end':
        targetTop = (index + 1) * itemHeight - height;
        break;
      case 'start':
      default:
        targetTop = index * itemHeight;
    }
    
    container.scrollTop = Math.max(0, Math.min(targetTop, totalHeight - height));
  }, [itemHeight, height, totalHeight]);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    scrollToIndex,
    scrollToTop: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    },
    scrollToBottom: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = totalHeight - height;
      }
    },
    getScrollTop: () => scrollTop,
  } as any));

  // 空状态
  if (items.length === 0 && !loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height, width }}
      >
        {emptyContent || (
          <div className="text-text-tertiary text-sm">暂无数据</div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height, width }}
      onScroll={handleScroll}
    >
      {/* 占位容器，撑开滚动高度 */}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {/* 渲染可见项 */}
        {virtualItems.map(({ index, item, style }) => (
          <div
            key={getKey ? getKey(item, index) : index}
            style={style}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      {/* 加载指示器 */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// 使用forwardRef包装以支持泛型
export const VirtualList = React.forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

// ==================== 虚拟网格组件 ====================

export interface VirtualGridProps<T> {
  /** 网格数据 */
  items: T[];
  /** 每项宽度 */
  itemWidth: number;
  /** 每项高度 */
  itemHeight: number;
  /** 容器高度 */
  height: number;
  /** 容器宽度 */
  width: number;
  /** 列间距 */
  columnGap?: number;
  /** 行间距 */
  rowGap?: number;
  /** 渲染单个项 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 获取唯一key */
  getKey?: (item: T, index: number) => string | number;
  /** 容器类名 */
  className?: string;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  height,
  width,
  columnGap = 0,
  rowGap = 0,
  renderItem,
  getKey,
  className = '',
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 计算列数
  const columns = useMemo(() => {
    return Math.max(1, Math.floor((width + columnGap) / (itemWidth + columnGap)));
  }, [width, itemWidth, columnGap]);
  
  // 计算行数和总高度
  const rows = Math.ceil(items.length / columns);
  const totalHeight = rows * (itemHeight + rowGap) - rowGap;
  
  // 计算可见范围
  const visibleRange = useMemo(() => {
    const rowHeight = itemHeight + rowGap;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
    const visibleRows = Math.ceil(height / rowHeight) + 2;
    const endRow = Math.min(rows - 1, startRow + visibleRows);
    
    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columns - 1);
    
    return { startIndex, endIndex, startRow, endRow };
  }, [scrollTop, itemHeight, rowGap, height, rows, columns, items.length]);
  
  // 生成可见项
  const visibleItems = useMemo(() => {
    const result: { index: number; item: T; style: React.CSSProperties }[] = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      
      result.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute',
          left: col * (itemWidth + columnGap),
          top: row * (itemHeight + rowGap),
          width: itemWidth,
          height: itemHeight,
        },
      });
    }
    
    return result;
  }, [visibleRange, items, columns, itemWidth, itemHeight, columnGap, rowGap]);
  
  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height, width }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ index, item, style }) => (
          <div
            key={getKey ? getKey(item, index) : index}
            style={style}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 分页列表组件 ====================

export interface PaginatedListProps<T> {
  /** 列表数据 */
  items: T[];
  /** 每页数量 */
  pageSize: number;
  /** 渲染单个项 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 获取唯一key */
  getKey?: (item: T, index: number) => string | number;
  /** 容器类名 */
  className?: string;
  /** 列表项类名 */
  itemClassName?: string;
}

export function PaginatedList<T>({
  items,
  pageSize,
  renderItem,
  getKey,
  className = '',
  itemClassName = '',
}: PaginatedListProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / pageSize);
  
  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);
  
  return (
    <div className={className}>
      {/* 列表 */}
      <div>
        {visibleItems.map((item, localIndex) => {
          const globalIndex = (currentPage - 1) * pageSize + localIndex;
          return (
            <div
              key={getKey ? getKey(item, globalIndex) : globalIndex}
              className={itemClassName}
            >
              {renderItem(item, globalIndex)}
            </div>
          );
        })}
      </div>
      
      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-background-secondary text-text-secondary disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-text-secondary">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-background-secondary text-text-secondary disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

export default VirtualList;