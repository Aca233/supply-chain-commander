/**
 * 虚拟化列表组件
 * 只渲染可见区域的元素，优化大量数据渲染性能
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onEndReached,
  endReachedThreshold = 200,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEndReachedRef = useRef(false);
  
  // 计算可见范围
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);
    
    const visible = items.slice(start, end + 1).map((item, i) => ({
      item,
      index: start + i,
    }));
    
    return {
      startIndex: start,
      endIndex: end,
      visibleItems: visible,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);
  
  // 总高度
  const totalHeight = items.length * itemHeight;
  
  // 使用passive事件监听器优化滚动性能
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      setScrollTop(scrollTop);
      
      // 检测是否到达底部
      if (onEndReached) {
        const distanceFromEnd = totalHeight - scrollTop - containerHeight;
        if (distanceFromEnd < endReachedThreshold && !lastEndReachedRef.current) {
          lastEndReachedRef.current = true;
          onEndReached();
        } else if (distanceFromEnd >= endReachedThreshold) {
          lastEndReachedRef.current = false;
        }
      }
    };
    
    // 使用passive: true优化滚动性能
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [totalHeight, containerHeight, endReachedThreshold, onEndReached]);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 虚拟化表格组件
 */
interface Column<T> {
  key: string;
  title: string;
  width?: number | string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface VirtualTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowHeight?: number;
  containerHeight: number;
  rowKey: keyof T | ((record: T) => string | number);
  className?: string;
  headerClassName?: string;
  onRowClick?: (record: T, index: number) => void;
}

export function VirtualTable<T extends Record<string, any>>({
  columns,
  data,
  rowHeight = 40,
  containerHeight,
  rowKey,
  className = '',
  headerClassName = '',
  onRowClick,
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  
  const headerHeight = 40;
  const bodyHeight = containerHeight - headerHeight;
  
  // 计算可见范围
  const overscan = 3;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(bodyHeight / rowHeight);
  const endIndex = Math.min(data.length - 1, startIndex + visibleCount + overscan * 2);
  
  const visibleData = data.slice(startIndex, endIndex + 1);
  const totalHeight = data.length * rowHeight;
  
  const getRowKey = (record: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] as string | number;
  };
  
  // 使用passive事件监听器优化滚动性能
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    
    const handleScroll = () => {
      setScrollTop(body.scrollTop);
    };
    
    body.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      body.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return (
    <div className={`flex flex-col ${className}`}>
      {/* 表头 */}
      <div
        className={`flex border-b border-slate-700 bg-slate-800 ${headerClassName}`}
        style={{ height: headerHeight }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex items-center px-3 font-medium text-slate-300"
            style={{
              width: col.width || 'auto',
              flex: col.width ? 'none' : 1,
              justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
            }}
          >
            {col.title}
          </div>
        ))}
      </div>
      
      {/* 表体 */}
      <div
        ref={bodyRef}
        className="overflow-auto"
        style={{ height: bodyHeight }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleData.map((record, i) => {
            const actualIndex = startIndex + i;
            return (
              <div
                key={getRowKey(record, actualIndex)}
                className={`flex border-b border-slate-700/50 hover:bg-slate-700/30 ${onRowClick ? 'cursor-pointer' : ''}`}
                style={{
                  position: 'absolute',
                  top: actualIndex * rowHeight,
                  left: 0,
                  right: 0,
                  height: rowHeight,
                }}
                onClick={() => onRowClick?.(record, actualIndex)}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="flex items-center px-3 text-sm"
                    style={{
                      width: col.width || 'auto',
                      flex: col.width ? 'none' : 1,
                      justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                    }}
                  >
                    {col.render
                      ? col.render(record[col.key], record, actualIndex)
                      : record[col.key]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;