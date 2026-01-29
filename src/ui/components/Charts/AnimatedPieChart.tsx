/**
 * 增强版市场份额饼图组件
 * 支持动画、交互高亮、详情展示
 */

import React, { useMemo, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// ==================== 类型定义 ====================

export interface PieDataItem {
  id: string;
  name: string;
  value: number;
  color?: string;
  icon?: string;
  description?: string;
  change?: number;  // 环比变化
}

export interface AnimatedPieChartProps {
  data: PieDataItem[];
  title?: string;
  height?: number | string;
  showLegend?: boolean;
  showLabels?: boolean;
  centerContent?: React.ReactNode;
  variant?: 'pie' | 'donut' | 'rose';
  animated?: boolean;
  onItemClick?: (item: PieDataItem) => void;
  onItemHover?: (item: PieDataItem | null) => void;
  className?: string;
}

// ==================== 颜色配置 ====================

const DEFAULT_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#0ea5e9', '#d946ef',
];

const COLORS = {
  text: '#94a3b8',
  textLight: '#e2e8f0',
  tooltip: 'rgba(15, 23, 42, 0.95)',
  border: '#334155',
  background: '#0f172a',
};

// ==================== 辅助函数 ====================

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
}

// ==================== 主组件 ====================

export const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({
  data,
  title = '市场份额',
  height = 350,
  showLegend = true,
  showLabels = false,
  centerContent,
  variant = 'donut',
  animated = true,
  onItemClick,
  onItemHover,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 计算总值
  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  // 准备图表数据
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      name: item.name,
      value: item.value,
      itemStyle: {
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    }));
  }, [data]);

  // 构建图表配置
  const option: EChartsOption = useMemo(() => {
    // 根据变体确定半径
    let innerRadius: string;
    let outerRadius: string;
    let roseType: boolean | 'radius' | 'area' = false;

    switch (variant) {
      case 'pie':
        innerRadius = '0%';
        outerRadius = '70%';
        break;
      case 'rose':
        innerRadius = '20%';
        outerRadius = '70%';
        roseType = 'radius';
        break;
      case 'donut':
      default:
        innerRadius = '45%';
        outerRadius = '70%';
        break;
    }

    return {
      animation: animated,
      animationDuration: 800,
      animationEasing: 'cubicOut',
      backgroundColor: 'transparent',
      title: {
        text: title,
        textStyle: { color: COLORS.textLight, fontSize: 14, fontWeight: 'normal' },
        left: 10,
        top: 10,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: COLORS.tooltip,
        borderColor: COLORS.border,
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: COLORS.textLight, fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.data) return '';
          const item = data.find(d => d.name === params.name);
          const percent = formatPercent(params.value, total);
          let html = `
            <div style="font-weight:600;margin-bottom:8px;font-size:13px;">
              ${params.marker} ${params.name}
            </div>
            <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:4px;">
              <span style="color:#94a3b8;">数值</span>
              <span style="font-weight:500;">${formatNumber(params.value)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:20px;">
              <span style="color:#94a3b8;">占比</span>
              <span style="font-weight:500;">${percent}</span>
            </div>
          `;
          
          if (item?.change !== undefined) {
            const changeColor = item.change >= 0 ? '#22c55e' : '#ef4444';
            const changeSign = item.change >= 0 ? '+' : '';
            html += `
              <div style="display:flex;justify-content:space-between;gap:20px;margin-top:4px;">
                <span style="color:#94a3b8;">变化</span>
                <span style="color:${changeColor};font-weight:500;">${changeSign}${item.change.toFixed(1)}%</span>
              </div>
            `;
          }
          
          if (item?.description) {
            html += `
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid #334155;font-size:11px;color:#64748b;">
                ${item.description}
              </div>
            `;
          }
          
          return html;
        },
      },
      legend: showLegend ? {
        orient: 'vertical',
        right: 10,
        top: 'center',
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
        formatter: (name: string) => {
          const item = data.find(d => d.name === name);
          if (!item) return name;
          const percent = formatPercent(item.value, total);
          return `{name|${name}} {percent|${percent}}`;
        },
        textStyle: {
          rich: {
            name: {
              color: COLORS.textLight,
              fontSize: 11,
              width: 80,
            },
            percent: {
              color: COLORS.text,
              fontSize: 10,
              align: 'right',
            },
          },
        },
      } : undefined,
      series: [
        {
          type: 'pie',
          radius: [innerRadius, outerRadius],
          center: showLegend ? ['35%', '50%'] : ['50%', '50%'],
          roseType: roseType || undefined,
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: variant === 'donut' ? 6 : 4,
            borderColor: COLORS.background,
            borderWidth: 2,
          },
          label: showLabels ? {
            show: true,
            position: 'outside',
            formatter: '{b}: {d}%',
            color: COLORS.text,
            fontSize: 10,
          } : {
            show: false,
          },
          labelLine: showLabels ? {
            show: true,
            length: 10,
            length2: 15,
            lineStyle: { color: COLORS.border },
          } : {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold',
            },
            scaleSize: 10,
          },
          data: chartData,
          // 选中效果
          selectedMode: 'single',
          selectedOffset: 10,
        },
      ],
    };
  }, [data, chartData, total, title, showLegend, showLabels, variant, animated]);

  // 事件处理
  const onEvents = useMemo(() => ({
    click: (params: any) => {
      if (params.dataIndex !== undefined) {
        const item = data[params.dataIndex];
        setSelectedIndex(params.dataIndex === selectedIndex ? null : params.dataIndex);
        if (item) onItemClick?.(item);
      }
    },
    mouseover: (params: any) => {
      if (params.dataIndex !== undefined) {
        setHoveredIndex(params.dataIndex);
        const item = data[params.dataIndex];
        if (item) onItemHover?.(item);
      }
    },
    mouseout: () => {
      setHoveredIndex(null);
      onItemHover?.(null);
    },
  }), [data, selectedIndex, onItemClick, onItemHover]);

  // 获取当前悬停/选中的项目
  const activeItem = useMemo(() => {
    const index = hoveredIndex ?? selectedIndex;
    return index !== null ? data[index] : null;
  }, [data, hoveredIndex, selectedIndex]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 图表 */}
      <div className="relative flex-1 min-h-0">
        <ReactECharts
          option={option}
          style={{ height: typeof height === 'number' ? height : height, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
          lazyUpdate={true}
          onEvents={onEvents}
        />
        
        {/* 中心内容（仅环形图） */}
        {variant === 'donut' && (centerContent || activeItem) && (
          <div 
            className="absolute pointer-events-none flex flex-col items-center justify-center"
            style={{
              left: showLegend ? '35%' : '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80px',
              height: '80px',
            }}
          >
            {centerContent || (
              activeItem ? (
                <>
                  <div className="text-lg font-bold text-text-primary">
                    {formatPercent(activeItem.value, total)}
                  </div>
                  <div className="text-xs text-text-tertiary text-center truncate max-w-full px-1">
                    {activeItem.name}
                  </div>
                  {activeItem.change !== undefined && (
                    <div className={`text-xs ${activeItem.change >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
                      {activeItem.change >= 0 ? '▲' : '▼'} {Math.abs(activeItem.change).toFixed(1)}%
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-text-primary">
                    {data.length}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    总项目
                  </div>
                </>
              )
            )}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      {data.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-text-tertiary">
          <div>
            总计: <span className="font-medium text-text-secondary">{formatNumber(total)}</span>
          </div>
          <div>
            最大: <span className="font-medium text-text-secondary">
              {data.reduce((max, item) => item.value > max.value ? item : max).name}
            </span>
          </div>
          <div>
            项目数: <span className="font-medium text-text-secondary">{data.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedPieChart;