/**
 * 供需平衡图组件
 * 可视化商品的供给与需求关系、价格均衡点
 */

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// ==================== 类型定义 ====================

export interface SupplyDemandData {
  goodsId: string;
  goodsName: string;
  currentPrice: number;
  basePrice: number;
  supply: number;
  demand: number;
  equilibriumPrice?: number;
  priceHistory?: { price: number; supply: number; demand: number }[];
}

export interface SupplyDemandChartProps {
  data: SupplyDemandData;
  height?: number | string;
  showCurves?: boolean;
  showHistory?: boolean;
  className?: string;
}

// ==================== 颜色配置 ====================

const COLORS = {
  supply: '#22c55e',
  supplyArea: 'rgba(34, 197, 94, 0.2)',
  demand: '#3b82f6',
  demandArea: 'rgba(59, 130, 246, 0.2)',
  equilibrium: '#f59e0b',
  currentPrice: '#8b5cf6',
  surplus: 'rgba(34, 197, 94, 0.3)',
  shortage: 'rgba(239, 68, 68, 0.3)',
  grid: '#1e293b',
  text: '#94a3b8',
  textLight: '#e2e8f0',
  tooltip: 'rgba(15, 23, 42, 0.95)',
  border: '#334155',
};

// ==================== 辅助函数 ====================

/**
 * 生成供给曲线数据点
 * 供给曲线：价格越高，供给量越大（正斜率）
 */
function generateSupplyCurve(
  baseSupply: number,
  basePrice: number,
  priceElasticity: number = 1.2
): { price: number; quantity: number }[] {
  const points: { price: number; quantity: number }[] = [];
  const minPrice = basePrice * 0.3;
  const maxPrice = basePrice * 2.5;
  const steps = 50;
  
  for (let i = 0; i <= steps; i++) {
    const price = minPrice + (maxPrice - minPrice) * (i / steps);
    // 供给量 = 基础供给 * (价格/基准价格)^弹性
    const quantity = baseSupply * Math.pow(price / basePrice, priceElasticity);
    points.push({ price, quantity });
  }
  
  return points;
}

/**
 * 生成需求曲线数据点
 * 需求曲线：价格越高，需求量越小（负斜率）
 */
function generateDemandCurve(
  baseDemand: number,
  basePrice: number,
  priceElasticity: number = -0.8
): { price: number; quantity: number }[] {
  const points: { price: number; quantity: number }[] = [];
  const minPrice = basePrice * 0.3;
  const maxPrice = basePrice * 2.5;
  const steps = 50;
  
  for (let i = 0; i <= steps; i++) {
    const price = minPrice + (maxPrice - minPrice) * (i / steps);
    // 需求量 = 基础需求 * (价格/基准价格)^弹性（负数）
    const quantity = baseDemand * Math.pow(price / basePrice, priceElasticity);
    points.push({ price, quantity });
  }
  
  return points;
}

/**
 * 找到供需曲线交点（均衡点）
 */
function findEquilibrium(
  supplyCurve: { price: number; quantity: number }[],
  demandCurve: { price: number; quantity: number }[]
): { price: number; quantity: number } | null {
  for (let i = 0; i < supplyCurve.length - 1; i++) {
    const s1 = supplyCurve[i];
    const s2 = supplyCurve[i + 1];
    const d1 = demandCurve[i];
    const d2 = demandCurve[i + 1];
    
    // 检查是否在这个区间内交叉
    if ((s1.quantity <= d1.quantity && s2.quantity >= d2.quantity) ||
        (s1.quantity >= d1.quantity && s2.quantity <= d2.quantity)) {
      // 线性插值找交点
      const t = (d1.quantity - s1.quantity) / 
                ((s2.quantity - s1.quantity) - (d2.quantity - d1.quantity));
      const price = s1.price + t * (s2.price - s1.price);
      const quantity = s1.quantity + t * (s2.quantity - s1.quantity);
      return { price, quantity };
    }
  }
  return null;
}

/**
 * 格式化数字
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

// ==================== 主组件 ====================

export const SupplyDemandChart: React.FC<SupplyDemandChartProps> = ({
  data,
  height = 400,
  showCurves = true,
  showHistory = true,
  className = '',
}) => {
  // 计算供需曲线和均衡点
  const chartData = useMemo(() => {
    const supplyCurve = generateSupplyCurve(data.supply, data.basePrice);
    const demandCurve = generateDemandCurve(data.demand, data.basePrice);
    const equilibrium = findEquilibrium(supplyCurve, demandCurve);
    
    // 当前供需状态
    const supplyDemandRatio = data.supply / (data.demand || 1);
    const marketStatus = supplyDemandRatio > 1.1 
      ? 'surplus' 
      : supplyDemandRatio < 0.9 
        ? 'shortage' 
        : 'balanced';
    
    // 价格范围
    const minPrice = data.basePrice * 0.3;
    const maxPrice = data.basePrice * 2.5;
    const maxQuantity = Math.max(
      ...supplyCurve.map(p => p.quantity),
      ...demandCurve.map(p => p.quantity)
    );
    
    return {
      supplyCurve,
      demandCurve,
      equilibrium,
      marketStatus,
      supplyDemandRatio,
      minPrice,
      maxPrice,
      maxQuantity,
    };
  }, [data]);

  // 构建图表配置
  const option: EChartsOption = useMemo(() => {
    const { supplyCurve, demandCurve, equilibrium, maxQuantity } = chartData;
    
    const series: any[] = [];
    
    // 供给曲线
    if (showCurves) {
      series.push({
        name: '供给曲线',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: supplyCurve.map(p => [p.quantity, p.price]),
        lineStyle: { color: COLORS.supply, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: 'transparent' },
              { offset: 1, color: COLORS.supplyArea },
            ],
          },
        },
      });
      
      // 需求曲线
      series.push({
        name: '需求曲线',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: demandCurve.map(p => [p.quantity, p.price]),
        lineStyle: { color: COLORS.demand, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: COLORS.demandArea },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
      });
    }
    
    // 当前供给点
    series.push({
      name: '当前供给',
      type: 'scatter',
      data: [[data.supply, data.currentPrice]],
      symbolSize: 15,
      itemStyle: { color: COLORS.supply },
      label: {
        show: true,
        position: 'right',
        formatter: 'S',
        color: COLORS.supply,
        fontWeight: 'bold',
      },
    });
    
    // 当前需求点
    series.push({
      name: '当前需求',
      type: 'scatter',
      data: [[data.demand, data.currentPrice]],
      symbolSize: 15,
      itemStyle: { color: COLORS.demand },
      label: {
        show: true,
        position: 'left',
        formatter: 'D',
        color: COLORS.demand,
        fontWeight: 'bold',
      },
    });
    
    // 均衡点
    if (equilibrium) {
      series.push({
        name: '均衡点',
        type: 'scatter',
        data: [[equilibrium.quantity, equilibrium.price]],
        symbolSize: 20,
        symbol: 'diamond',
        itemStyle: { 
          color: COLORS.equilibrium,
          shadowBlur: 10,
          shadowColor: COLORS.equilibrium,
        },
        label: {
          show: true,
          position: 'top',
          formatter: 'E',
          color: COLORS.equilibrium,
          fontWeight: 'bold',
        },
      });
    }
    
    // 当前价格线
    series.push({
      name: '当前价格',
      type: 'line',
      data: [[0, data.currentPrice], [maxQuantity * 1.1, data.currentPrice]],
      lineStyle: { 
        color: COLORS.currentPrice, 
        width: 2, 
        type: 'dashed' 
      },
      symbol: 'none',
    });
    
    // 历史轨迹
    if (showHistory && data.priceHistory && data.priceHistory.length > 1) {
      const historyData = data.priceHistory.map((h, i) => ({
        value: [h.supply, h.price],
        itemStyle: {
          opacity: 0.3 + (i / data.priceHistory!.length) * 0.7,
        },
      }));
      
      series.push({
        name: '历史轨迹',
        type: 'line',
        data: historyData,
        lineStyle: { color: '#64748b', width: 1, type: 'dotted' },
        symbol: 'circle',
        symbolSize: 4,
      });
    }

    return {
      animation: true,
      animationDuration: 300,
      backgroundColor: 'transparent',
      title: {
        text: `${data.goodsName} 供需分析`,
        subtext: `当前价格: ¥${data.currentPrice.toFixed(2)}`,
        textStyle: { color: COLORS.textLight, fontSize: 14 },
        subtextStyle: { color: COLORS.text, fontSize: 11 },
        left: 10,
        top: 5,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: COLORS.tooltip,
        borderColor: COLORS.border,
        borderWidth: 1,
        textStyle: { color: COLORS.textLight, fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.data) return '';
          const [quantity, price] = params.data.value || params.data;
          return `
            <div class="font-medium mb-1">${params.seriesName}</div>
            <div>价格: ¥${price.toFixed(2)}</div>
            <div>数量: ${formatNumber(quantity)}</div>
          `;
        },
      },
      legend: {
        show: true,
        data: showCurves 
          ? ['供给曲线', '需求曲线', '当前供给', '当前需求', '均衡点']
          : ['当前供给', '当前需求', '均衡点'],
        textStyle: { color: COLORS.text, fontSize: 10 },
        right: 10,
        top: 5,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 3,
      },
      grid: {
        left: 70,
        right: 30,
        top: 70,
        bottom: 60,
      },
      xAxis: {
        type: 'value',
        name: '数量',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: COLORS.text, fontSize: 11 },
        min: 0,
        max: maxQuantity * 1.1,
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        axisLine: { lineStyle: { color: COLORS.border } },
        axisLabel: { 
          color: COLORS.text, 
          fontSize: 10,
          formatter: (value: number) => formatNumber(value),
        },
      },
      yAxis: {
        type: 'value',
        name: '价格',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: { color: COLORS.text, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        axisLine: { show: false },
        axisLabel: { 
          color: COLORS.text, 
          fontSize: 10,
          formatter: (value: number) => `¥${formatNumber(value)}`,
        },
      },
      series,
    };
  }, [data, chartData, showCurves, showHistory]);

  // 市场状态指示器
  const statusInfo = useMemo(() => {
    const { marketStatus, supplyDemandRatio, equilibrium } = chartData;
    
    let statusText: string;
    let statusColor: string;
    let statusIcon: string;
    
    switch (marketStatus) {
      case 'surplus':
        statusText = '供过于求';
        statusColor = 'text-chart-up';
        statusIcon = '📈';
        break;
      case 'shortage':
        statusText = '供不应求';
        statusColor = 'text-chart-down';
        statusIcon = '📉';
        break;
      default:
        statusText = '供需平衡';
        statusColor = 'text-accent';
        statusIcon = '⚖️';
    }
    
    const priceGap = equilibrium 
      ? ((data.currentPrice - equilibrium.price) / equilibrium.price * 100).toFixed(1)
      : null;
    
    return {
      statusText,
      statusColor,
      statusIcon,
      ratio: (supplyDemandRatio * 100).toFixed(0),
      priceGap,
      equilibriumPrice: equilibrium?.price,
    };
  }, [chartData, data.currentPrice]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 状态指示栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-background-secondary rounded-t-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusInfo.statusIcon}</span>
            <span className={`font-medium ${statusInfo.statusColor}`}>
              {statusInfo.statusText}
            </span>
          </div>
          
          <div className="text-sm text-text-tertiary">
            供需比: <span className="font-mono">{statusInfo.ratio}%</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          {statusInfo.equilibriumPrice && (
            <div className="text-text-tertiary">
              均衡价: 
              <span className="ml-1 font-medium text-warning">
                ¥{statusInfo.equilibriumPrice.toFixed(2)}
              </span>
            </div>
          )}
          
          {statusInfo.priceGap && (
            <div className="text-text-tertiary">
              价格偏离: 
              <span className={`ml-1 font-medium ${
                Number(statusInfo.priceGap) > 0 ? 'text-chart-down' : 'text-chart-up'
              }`}>
                {Number(statusInfo.priceGap) > 0 ? '+' : ''}{statusInfo.priceGap}%
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* 图表 */}
      <div className="flex-1 min-h-0 bg-background-tertiary rounded-b-lg">
        <ReactECharts
          option={option}
          style={{ height: typeof height === 'number' ? height : height, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
      
      {/* 图例说明 */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-text-tertiary">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.supply }}></span>
          <span>供给</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.demand }}></span>
          <span>需求</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rotate-45" style={{ 
            backgroundColor: COLORS.equilibrium,
            transform: 'rotate(45deg)',
          }}></span>
          <span>均衡点</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: COLORS.currentPrice }}></span>
          <span>当前价格</span>
        </div>
      </div>
    </div>
  );
};

export default SupplyDemandChart;