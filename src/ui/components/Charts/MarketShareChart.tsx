/**
 * 市场份额饼图组件
 */

import React, { useMemo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

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

// 扩展的颜色列表 - 41种差异明显的颜色
const COLORS = [
  // 主色系
  '#3b82f6', // 蓝
  '#22c55e', // 绿
  '#f59e0b', // 橙
  '#ef4444', // 红
  '#8b5cf6', // 紫
  '#06b6d4', // 青
  '#ec4899', // 粉
  '#84cc16', // 黄绿
  '#f97316', // 深橙
  '#6366f1', // 靛蓝
  // 第二组 - 深色系
  '#1d4ed8', // 深蓝
  '#15803d', // 深绿
  '#b45309', // 深橙
  '#b91c1c', // 深红
  '#7c3aed', // 深紫
  '#0891b2', // 深青
  '#be185d', // 深粉
  '#4d7c0f', // 深黄绿
  '#c2410c', // 棕橙
  '#4338ca', // 深靛蓝
  // 第三组 - 浅色系
  '#60a5fa', // 浅蓝
  '#4ade80', // 浅绿
  '#fbbf24', // 金黄
  '#f87171', // 浅红
  '#a78bfa', // 浅紫
  '#22d3ee', // 浅青
  '#f472b6', // 浅粉
  '#a3e635', // 亮绿
  '#fb923c', // 浅橙
  '#818cf8', // 浅靛蓝
  // 第四组 - 额外颜色
  '#2dd4bf', // 蓝绿
  '#facc15', // 黄
  '#e879f9', // 紫红
  '#34d399', // 翠绿
  '#fb7185', // 玫瑰
  '#38bdf8', // 天蓝
  '#c084fc', // 薰衣草
  '#fcd34d', // 浅金
  '#a855f7', // 亮紫
  '#14b8a6', // 蓝青
  '#f43f5e', // 玫红
];

export const MarketShareChart: React.FC<MarketShareChartProps> = ({
  data,
  title = '市场份额',
  height = 300,
  showLegend = true,
}) => {
  const chartRef = useRef<ReactECharts>(null);
  const hasAnimatedRef = useRef(false);
  const isFirstRenderRef = useRef(true);
  
  // 初始option（首次渲染用）
  const initialOption: EChartsOption = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    return {
      animation: true, // 首次允许动画
      animationDuration: 800,
      animationEasing: 'cubicOut',
      backgroundColor: 'transparent',
      title: {
        text: title,
        textStyle: {
          color: '#e2e8f0',
          fontSize: 14,
          fontWeight: 'normal',
        },
        left: 10,
        top: 10,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0' },
        formatter: (params: any) => {
          const percent = ((params.value / total) * 100).toFixed(1);
          return `<div class="font-medium">${params.name}</div>
                  <div>份额: ${percent}%</div>
                  <div>数值: ${params.value.toLocaleString()}</div>`;
        },
      },
      legend: {
        show: showLegend && data.length <= 10, // 只在10个以内显示图例
        orient: 'horizontal',
        bottom: 5,
        left: 'center',
        textStyle: { color: '#94a3b8', fontSize: 10 },
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 8,
        type: 'scroll', // 可滚动
        pageIconColor: '#94a3b8',
        pageIconInactiveColor: '#475569',
        pageTextStyle: { color: '#94a3b8' },
      },
      series: [
        {
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['50%', '45%'], // 居中显示
          avoidLabelOverlap: true,
          animation: true,
          animationDuration: 800,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#0f172a',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#e2e8f0',
              formatter: (params: any) => {
                const percent = ((params.value / total) * 100).toFixed(1);
                return `${params.name}\n${percent}%`;
              },
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          data: data.map((d, i) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: d.color || COLORS[i % COLORS.length] },
          })),
        },
      ],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在首次渲染时创建
  
  // 数据更新时直接调用setOption（禁用动画）
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      // 首次动画完成后标记
      setTimeout(() => {
        hasAnimatedRef.current = true;
      }, 1000);
      return;
    }
    
    // 后续更新：直接使用chart实例setOption，只更新数据部分
    const chart = chartRef.current?.getEchartsInstance();
    if (chart && hasAnimatedRef.current) {
      const total = data.reduce((sum, d) => sum + d.value, 0);
      
      // 只更新数据，不替换整个series配置
      chart.setOption({
        animation: false,
        series: [{
          type: 'pie', // 保留类型
          animation: false,
          animationDuration: 0,
          animationDurationUpdate: 0,
          data: data.map((d, i) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: d.color || COLORS[i % COLORS.length] },
          })),
          emphasis: {
            label: {
              formatter: (params: any) => {
                const percent = ((params.value / total) * 100).toFixed(1);
                return `${params.name}\n${percent}%`;
              },
            },
          },
        }],
        tooltip: {
          formatter: (params: any) => {
            const percent = ((params.value / total) * 100).toFixed(1);
            return `<div class="font-medium">${params.name}</div>
                    <div>份额: ${percent}%</div>
                    <div>数值: ${params.value.toLocaleString()}</div>`;
          },
        },
      }, {
        notMerge: false, // 合并而不是替换
        lazyUpdate: true,
      });
    }
  }, [data]);
  
  return (
    <ReactECharts
      ref={chartRef}
      option={initialOption}
      style={{ height }}
      opts={{ renderer: 'canvas' }}
      notMerge={false}
      lazyUpdate={true}
    />
  );
};

export default MarketShareChart;