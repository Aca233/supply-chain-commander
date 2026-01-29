/**
 * 市场份额饼图组件
 * 支持移动端适配
 */

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface MarketShareData {
  name: string;
  value: number;
  color?: string;
}

interface MarketShareChartProps {
  data: MarketShareData[];
  title?: string;
  height?: number;
  showLegend?: boolean;
}

// 颜色列表
const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#1d4ed8', '#15803d', '#b45309', '#b91c1c', '#7c3aed',
  '#0891b2', '#be185d', '#4d7c0f', '#c2410c', '#4338ca',
  '#60a5fa', '#4ade80', '#fbbf24', '#f87171', '#a78bfa',
];

// 检测是否为移动端
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

export const MarketShareChart: React.FC<MarketShareChartProps> = ({
  data,
  title = '市场份额',
  height = 300,
  showLegend = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const isInitializedRef = useRef(false);
  const dataRef = useRef<MarketShareData[]>(data);
  const [isMobileView, setIsMobileView] = useState(isMobile());
  
  // 更新数据引用
  dataRef.current = data;
  
  // 创建图表数据
  const createChartData = (sourceData: MarketShareData[]) => {
    return (sourceData || []).map((d, i) => ({
      name: d.name || '',
      value: d.value || 0,
      itemStyle: { color: d.color || COLORS[i % COLORS.length] },
    }));
  };
  
  // 获取响应式配置
  const getResponsiveConfig = (mobile: boolean) => {
    if (mobile) {
      return {
        radius: ['30%', '55%'],
        center: ['50%', '50%'],
        titleFontSize: 12,
        legendShow: false,
        tooltipFontSize: 11,
      };
    }
    return {
      radius: ['35%', '65%'],
      center: ['50%', '45%'],
      titleFontSize: 14,
      legendShow: showLegend,
      tooltipFontSize: 12,
    };
  };
  
  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // 创建图表实例
    const chart = echarts.init(chartContainerRef.current);
    chartInstanceRef.current = chart;
    
    const safeData = data || [];
    const config = getResponsiveConfig(isMobileView);
    
    // 设置初始配置（带动画）
    chart.setOption({
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
      backgroundColor: 'transparent',
      title: {
        text: title,
        textStyle: {
          color: '#e2e8f0',
          fontSize: config.titleFontSize,
          fontWeight: 'normal',
        },
        left: 10,
        top: 10,
      },
      tooltip: {
        show: true,
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        borderRadius: 8,
        padding: isMobileView ? [6, 10] : [8, 12],
        textStyle: { color: '#e2e8f0', fontSize: config.tooltipFontSize },
        formatter: (params: any) => {
          if (!params || params.value === undefined) return '';
          const currentData = dataRef.current || [];
          const total = currentData.reduce((sum, d) => sum + (d.value || 0), 0);
          if (total === 0) return '';
          const percent = ((params.value / total) * 100).toFixed(1);
          return `<div style="font-weight:600;margin-bottom:4px;">${params.name || ''}</div>
                  <div>份额: ${percent}%</div>
                  <div>数值: ${(params.value || 0).toLocaleString()}</div>`;
        },
        extraCssText: 'z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none;',
        confine: true, // 限制 tooltip 在容器内
      },
      legend: {
        show: config.legendShow && safeData.length <= 10,
        orient: 'horizontal',
        bottom: 5,
        left: 'center',
        textStyle: { color: '#94a3b8', fontSize: isMobileView ? 9 : 10 },
        itemWidth: isMobileView ? 8 : 10,
        itemHeight: isMobileView ? 8 : 10,
        itemGap: isMobileView ? 6 : 8,
        type: 'scroll',
        pageIconColor: '#94a3b8',
        pageIconInactiveColor: '#475569',
        pageTextStyle: { color: '#94a3b8' },
      },
      series: [
        {
          type: 'pie',
          radius: config.radius,
          center: config.center,
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: isMobileView ? 3 : 4,
            borderColor: '#0f172a',
            borderWidth: isMobileView ? 1 : 2,
          },
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            label: { show: false },
            labelLine: { show: false },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          data: createChartData(safeData),
        },
      ],
    });
    
    isInitializedRef.current = true;
    
    // 窗口大小变化时重新调整
    const handleResize = () => {
      const newIsMobile = isMobile();
      if (newIsMobile !== isMobileView) {
        setIsMobileView(newIsMobile);
      }
      chart.resize();
    };
    window.addEventListener('resize', handleResize);
    
    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartInstanceRef.current = null;
      isInitializedRef.current = false;
    };
  }, [isMobileView]); // 当移动端状态变化时重新初始化
  
  // 数据变化时更新图表
  useEffect(() => {
    if (!isInitializedRef.current || !chartInstanceRef.current) return;
    
    const chart = chartInstanceRef.current;
    const safeData = data || [];
    
    // 只更新数据，不触发入场动画
    chart.setOption({
      animation: false,
      series: [{
        data: createChartData(safeData),
      }],
    });
  }, [data]);
  
  // 响应式高度
  const responsiveHeight = isMobileView ? Math.min(height, 200) : height;
  
  return (
    <div
      ref={chartContainerRef}
      style={{ width: '100%', height: responsiveHeight }}
      className="touch-pan-y" // 允许垂直滚动
    />
  );
};

MarketShareChart.displayName = 'MarketShareChart';

export default MarketShareChart;
