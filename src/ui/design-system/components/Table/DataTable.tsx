/**
 * 📊 DataTable 数据表格组件
 * 支持排序、选择、虚拟滚动
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// 列定义
export interface Column<T> {
  /** 列键名 */
  key: string;
  /** 列标题 */
  title: React.ReactNode;
  /** 自定义渲染 */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  /** 是否可排序 */
  sortable?: boolean;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 列宽 */
  width?: string | number;
  /** 列类名 */
  className?: string;
  /** 头部类名 */
  headerClassName?: string;
}

// 表格属性
export interface DataTableProps<T extends Record<string, any>> {
  /** 数据源 */
  data: T[];
  /** 列定义 */
  columns: Column<T>[];
  /** 行唯一标识 */
  rowKey: keyof T | ((row: T, index: number) => string);
  /** 加载状态 */
  loading?: boolean;
  /** 斑马纹 */
  striped?: boolean;
  /** 悬浮高亮 */
  hoverable?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
  /** 固定表头 */
  stickyHeader?: boolean;
  /** 最大高度（启用滚动） */
  maxHeight?: string | number;
  /** 行点击事件 */
  onRowClick?: (row: T, index: number) => void;
  /** 空状态文本 */
  emptyText?: React.ReactNode;
  /** 空状态图标 */
  emptyIcon?: React.ReactNode;
  /** 表格类名 */
  className?: string;
  /** 变体 */
  variant?: 'default' | 'game';
  /** 选中的行 */
  selectedRow?: string | number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
  loading = false,
  striped = false,
  hoverable = true,
  compact = false,
  stickyHeader = false,
  maxHeight,
  onRowClick,
  emptyText = '暂无数据',
  emptyIcon,
  className,
  variant = 'default',
  selectedRow,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // 排序后的数据
  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const order = sortOrder === 'asc' ? 1 : -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * order;
      }
      return String(aVal).localeCompare(String(bVal)) * order;
    });
  }, [data, sortKey, sortOrder]);

  // 获取行Key
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(row, index);
    return String(row[rowKey]);
  };

  // 处理排序
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // 单元格内边距
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div
      className={cn(
        'w-full overflow-auto rounded-lg',
        variant === 'default' && 'border border-[var(--border-default)]',
        variant === 'game' && 'border border-[var(--border-muted)]',
        className
      )}
      style={{ maxHeight }}
    >
      <table className="w-full border-collapse">
        <thead
          className={cn(
            stickyHeader && 'sticky top-0 z-10',
            variant === 'default' && 'bg-[var(--bg-muted)]',
            variant === 'game' && 'bg-gradient-to-r from-[var(--bg-muted)] to-[var(--bg-surface)]'
          )}
        >
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide',
                  'border-b border-[var(--border-default)]',
                  cellPadding,
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors',
                  col.headerClassName
                )}
                style={{ width: col.width }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className={cn(
                  'flex items-center gap-1',
                  col.align === 'center' && 'justify-center',
                  col.align === 'right' && 'justify-end'
                )}>
                  {col.title}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-[var(--accent)]">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                  <span className="text-sm text-[var(--text-muted)]">加载中...</span>
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-16">
                <div className="flex flex-col items-center gap-3">
                  {emptyIcon || (
                    <svg
                      className="w-12 h-12 text-[var(--text-subtle)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  )}
                  <span className="text-sm text-[var(--text-muted)]">{emptyText}</span>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => {
              const key = getRowKey(row, index);
              const isSelected = selectedRow !== undefined && String(selectedRow) === key;

              return (
                <tr
                  key={key}
                  className={cn(
                    'transition-colors',
                    'border-b border-[var(--border-muted)]',
                    'last:border-b-0',
                    striped && index % 2 === 1 && 'bg-[var(--bg-surface)]',
                    hoverable && 'hover:bg-[var(--bg-muted)]',
                    onRowClick && 'cursor-pointer',
                    isSelected && [
                      'bg-[var(--accent-muted)]',
                      variant === 'game' && 'shadow-[inset_0_0_20px_var(--accent-glow)]'
                    ]
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'text-sm text-[var(--text-primary)]',
                        cellPadding,
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key], row, index)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
