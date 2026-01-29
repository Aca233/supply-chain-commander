/**
 * 高级价格走势图表组件
 * 支持折线图、K线图、成交量、移动平均线等
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// ==================== 类型定义 ====================

export interface PriceDataPoint {
  time: string | number;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface TimeRange {
  label: string;
  value: number; // 显示的数据点数
}

export type ChartMode = 'line' | 'candlestick' | 'area';

export interface MAConfig {
  period: number;
  color: string;
  name: string;
  show: boolean;
}

export interface PriceChartProps {
  data: PriceDataPoint[];
  title?: string;
  height?: number | string;
  showVolume?: boolean;
  showMA?: boolean;
  showTimeRangeSelector?: boolean;
  color?: string;
  basePrice?: number;
  defaultMode?: ChartMode;
  defaultTimeRange?: number;
  maConfigs?: MAConfig[];
  onModeChange?: (mode: ChartMode) => void;
  onTimeRangeChange?: (range: number) => void;
  className?: string;
}

// ==================== 默认配置 ====================

const DEFAULT_TIME_RANGES: TimeRange[] = [
  { label: '1小时', value: 1 },
  { label: '1天', value: 24 },
  { label: '7天', value: 168 },
  { label: '30天', value: 720 },
  { label: '全部', value: -1 },
];

const DEFAULT_MA_CONFIGS: MAConfig[] = [
  { period: 5, color: '#f59e0b', name: 'MA5', show: true },
  { period: 10, color: '#8b5cf6', name: 'MA10', show: true },
  { period: 20, color: '#ec4899', name: 'MA20', show: false },
];

// ==================== 辅助函数 ====================

/**
 * 计算移动平均线
 */
function calculateMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * 格式化数字
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(2) + 'K';
  }
  return value.toFixed(2);
}

// ==================== 主组件 ====================

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  title = '价格走势',
  height = 400,
  showVolume = true,
  showMA = true,
  showTimeRangeSelector = true,
  color = '#3b82f6',
  basePrice,
  defaultMode = 'area',
  defaultTimeRange = 168,
  maConfigs = DEFAULT_MA_CONFIGS,
  onModeChange,
  onTimeRangeChange,
  className = '',
}) => {
  // ==================== 状态管理 ====================
  // 固定使用面积图模式
  const chartMode: ChartMode = 'area';
  const [timeRange, setTimeRange] = useState<number>(defaultTimeRange);
  // MA指标默认配置
  const activeMAs: Record<number, boolean> = Object.fromEntries(
    maConfigs.map(ma => [ma.period, ma.show])
  );
  const chartRef = useRef<ReactECharts>(null);
  
  // dataZoom状态：记住用户手动调整的位置
  const [zoomState, setZoomState] = useState<{ start: number; end: number } | null>(null);
  const prevTimeRangeRef = useRef(timeRange);
  const prevDataLengthRef = useRef(0);
  
  // 当时间范围改变时，重置zoom状态
  useEffect(() => {
    if (prevTimeRangeRef.current !== timeRange) {
      prevTimeRangeRef.current = timeRange;
      setZoomState(null); // 重置用户的缩放状态
    }
  }, [timeRange]);

  // ==================== 数据处理 ====================
  const displayData = useMemo(() => {
    if (timeRange === -1 || timeRange >= data.length) {
      return data;
    }
    return data.slice(-timeRange);
  }, [data, timeRange]);

  const chartData = useMemo(() => {
    const times = displayData.map(d => String(d.time));
    const prices = displayData.map(d => d.price);
    const volumes = displayData.map(d => d.volume || 0);
    
    // K线数据 [open, close, low, high] - ECharts K线格式
    const candlestickData = displayData.map(d => [
      d.open ?? d.price,
      d.close ?? d.price,
      d.low ?? d.price,
      d.high ?? d.price,
    ]);

    // 计算MA
    const maData: Record<number, (number | null)[]> = {};
    maConfigs.forEach(ma => {
      if (activeMAs[ma.period]) {
        maData[ma.period] = calculateMA(prices, ma.period);
      }
    });

    // 计算价格范围
    const validPrices = prices.filter(p => p > 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 100;
    const padding = (maxPrice - minPrice) * 0.1 || 1;

    // 判断涨跌
    const isUp = prices.length >= 2 && prices[prices.length - 1] >= prices[0];
    const trendColor = isUp ? '#22c55e' : '#ef4444';

    return {
      times,
      prices,
      volumes,
      candlestickData,
      maData,
      minPrice: minPrice - padding,
      maxPrice: maxPrice + padding,
      isUp,
      trendColor,
    };
  }, [displayData, maConfigs, activeMAs]);

  // ==================== 图表配置 ====================
  const option: EChartsOption = useMemo(() => {
    const { times, prices, volumes, candlestickData, maData, minPrice, maxPrice, isUp, trendColor } = chartData;
    const effectiveColor = chartMode === 'area' ? trendColor : color;

    // 构建series数组
    const series: any[] = [];

    // 主图表系列 - 固定使用面积图
    series.push({
      name: '价格',
      type: 'line',
      data: prices,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: effectiveColor, width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `${effectiveColor}60` },
            { offset: 0.5, color: `${effectiveColor}20` },
            { offset: 1, color: `${effectiveColor}05` },
          ],
        },
      },
      markLine: basePrice ? {
        silent: true,
        symbol: 'none',
        data: [{ 
          yAxis: basePrice, 
          name: '基准价',
          lineStyle: { color: '#64748b', type: 'dashed', width: 1 },
          label: { 
            show: true,
            position: 'insideEndTop',
            formatter: '基准 ¥{c}',
            color: '#94a3b8', 
            fontSize: 10,
          },
        }],
      } : undefined,
    });

    // 移动平均线系列
    if (showMA) {
      maConfigs.forEach(ma => {
        if (activeMAs[ma.period] && maData[ma.period]) {
          series.push({
            name: ma.name,
            type: 'line',
            data: maData[ma.period],
            smooth: true,
            symbol: 'none',
            lineStyle: { color: ma.color, width: 1.5, opacity: 0.8 },
          });
        }
      });
    }

    // 成交量系列
    if (showVolume) {
      series.push({
        name: '成交量',
        type: 'bar',
        data: volumes,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: (params: any) => {
            const idx = params.dataIndex;
            if (idx > 0 && prices[idx] >= prices[idx - 1]) {
              return 'rgba(34, 197, 94, 0.5)';
            }
            return 'rgba(239, 68, 68, 0.5)';
          },
        },
      });
    }

    // 构建grid配置
    const grids = showVolume ? [
      { left: 60, right: 20, top: 80, height: '50%' },
      { left: 60, right: 20, bottom: 40, height: '15%' },
    ] : [{
      left: 60,
      right: 20,
      top: 80,
      bottom: 40,
    }];

    // 构建xAxis配置 - 面积图使用boundaryGap为false
    const useBoundaryGap = false;
    const xAxisConfig = showVolume ? [
      {
        type: 'category' as const,
        data: times,
        gridIndex: 0,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          rotate: 0,
          interval: 'auto',
          showMaxLabel: true,
          showMinLabel: true,
        },
        axisTick: { show: false },
        boundaryGap: useBoundaryGap,
      },
      {
        type: 'category' as const,
        data: times,
        gridIndex: 1,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { show: false },
        axisTick: { show: false },
        boundaryGap: useBoundaryGap,
      },
    ] : {
      type: 'category' as const,
      data: times,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        rotate: 0,
        interval: 'auto',
        showMaxLabel: true,
        showMinLabel: true,
      },
      axisTick: { show: false },
      boundaryGap: useBoundaryGap,
    };

    // 构建yAxis配置
    const yAxisConfig = showVolume ? [
      {
        type: 'value' as const,
        gridIndex: 0,
        min: minPrice,
        max: maxPrice,
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' as const } },
        axisLine: { show: false },
        axisLabel: { 
          color: '#94a3b8', 
          fontSize: 10,
          formatter: (value: number) => `¥${formatNumber(value)}`,
        },
      },
      {
        type: 'value' as const,
        gridIndex: 1,
        splitLine: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
      },
    ] : {
      type: 'value' as const,
      min: minPrice,
      max: maxPrice,
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' as const } },
      axisLine: { show: false },
      axisLabel: { 
        color: '#94a3b8', 
        fontSize: 10,
        formatter: (value: number) => `¥${formatNumber(value)}`,
      },
    };

    // 图例配置 - 面积图固定使用"价格"
    const legendData: string[] = ['价格'];
    // 只有当showMA为true且对应的MA数据存在时才添加到图例
    if (showMA) {
      maConfigs.forEach(ma => {
        if (activeMAs[ma.period] && maData[ma.period]) {
          legendData.push(ma.name);
        }
      });
    }
    if (showVolume) legendData.push('成交量');

    return {
      // 完全禁用动画 - 游戏运行时频繁更新数据，动画会导致线条乱飞
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          crossStyle: { color: '#999' },
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: any) => {
          // 防护性检查：确保params有效且包含数据
          if (!Array.isArray(params) || params.length === 0) return '';
          
          // 检查第一个param是否有效（防止getRawIndex错误）
          const firstParam = params[0];
          if (!firstParam || firstParam.dataIndex === undefined || firstParam.dataIndex === null) {
            return '';
          }
          
          const time = firstParam.name;
          if (!time) return '';
          
          let html = `<div class="font-medium mb-1">${time}</div>`;
          
          params.forEach((p: any) => {
            // 跳过无效的数据点
            if (!p || p.value === undefined || p.value === null) return;
            
            if (p.seriesName === '成交量') {
              html += `<div class="flex justify-between gap-4"><span style="color:${p.color}">● ${p.seriesName}</span><span>${formatNumber(p.value)}</span></div>`;
            } else if (typeof p.value === 'number') {
              html += `<div class="flex justify-between gap-4"><span style="color:${p.color}">● ${p.seriesName}</span><span>¥${p.value.toFixed(2)}</span></div>`;
            }
          });

          if (basePrice && firstParam && typeof firstParam.value === 'number') {
            const currentPrice = firstParam.value;
            const change = ((currentPrice - basePrice) / basePrice * 100).toFixed(2);
            const changeColor = currentPrice >= basePrice ? '#22c55e' : '#ef4444';
            html += `<div style="color:${changeColor};margin-top:4px">涨跌: ${change}%</div>`;
          }
          
          return html;
        },
      },
      legend: {
        show: true,
        data: legendData,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        right: 20,
        top: 10,
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 3,
      },
      dataZoom: (() => {
        const totalPoints = times.length;
        
        // 如果用户手动调整过缩放，保持用户的设置
        if (zoomState) {
          return [
            {
              type: 'inside',
              xAxisIndex: showVolume ? [0, 1] : [0],
              start: zoomState.start,
              end: zoomState.end,
              zoomOnMouseWheel: true,
              moveOnMouseMove: true,
            },
            {
              show: totalPoints > 30,
              type: 'slider',
              xAxisIndex: showVolume ? [0, 1] : [0],
              bottom: 10,
              height: 20,
              borderColor: '#334155',
              backgroundColor: '#1e293b',
              fillerColor: 'rgba(59, 130, 246, 0.2)',
              handleStyle: { color: '#3b82f6' },
              textStyle: { color: '#94a3b8', fontSize: 10 },
              start: zoomState.start,
              end: zoomState.end,
            },
          ];
        }
        
        // 自动计算显示范围：
        // - 数据少时显示全部
        // - 数据多时显示最后80个数据点（约3天多）
        const maxVisiblePoints = 80;
        let startPercent = 0;
        let endPercent = 100;
        
        if (totalPoints > maxVisiblePoints) {
          // 计算需要显示的起始百分比
          startPercent = Math.max(0, ((totalPoints - maxVisiblePoints) / totalPoints) * 100);
        }
        
        return [
          {
            type: 'inside',
            xAxisIndex: showVolume ? [0, 1] : [0],
            start: startPercent,
            end: endPercent,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
          },
          {
            show: totalPoints > 30,
            type: 'slider',
            xAxisIndex: showVolume ? [0, 1] : [0],
            bottom: 10,
            height: 20,
            borderColor: '#334155',
            backgroundColor: '#1e293b',
            fillerColor: 'rgba(59, 130, 246, 0.2)',
            handleStyle: { color: '#3b82f6' },
            textStyle: { color: '#94a3b8', fontSize: 10 },
            start: startPercent,
            end: endPercent,
          },
        ];
      })(),
      grid: grids,
      xAxis: xAxisConfig,
      yAxis: yAxisConfig,
      series,
    };
  }, [chartData, chartMode, showVolume, showMA, maConfigs, activeMAs, color, basePrice, zoomState]);
  
  // 监听dataZoom事件，记住用户的手动调整
  const onEvents = useMemo(() => ({
    datazoom: (params: any) => {
      // 检查是否是用户手动操作（而不是程序设置）
      if (params.batch) {
        // inside zoom (滚轮/拖动)
        const zoom = params.batch[0];
        if (zoom) {
          setZoomState({ start: zoom.start, end: zoom.end });
        }
      } else if (params.start !== undefined && params.end !== undefined) {
        // slider zoom
        setZoomState({ start: params.start, end: params.end });
      }
    },
  }), []);

  // ==================== 事件处理 ====================
  const handleTimeRangeChange = useCallback((range: number) => {
    setTimeRange(range);
    onTimeRangeChange?.(range);
  }, [onTimeRangeChange]);

  // ==================== 渲染 ====================
  return (
    <div className={`flex flex-col ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-3 px-2">
        {/* 标题和当前价格 */}
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-text-primary">{title}</h3>
          {chartData.prices.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${chartData.isUp ? 'text-chart-up' : 'text-chart-down'}`}>
                ¥{chartData.prices[chartData.prices.length - 1]?.toFixed(2)}
              </span>
              {chartData.prices.length >= 2 && (
                <span className={`text-xs ${chartData.isUp ? 'text-chart-up' : 'text-chart-down'}`}>
                  {chartData.isUp ? '▲' : '▼'}
                  {Math.abs((chartData.prices[chartData.prices.length - 1] / chartData.prices[0] - 1) * 100).toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>


      </div>

      {/* 图表区域 */}
      <div className="flex-1 min-h-0">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: typeof height === 'number' ? height : height, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
          lazyUpdate={true}
          onEvents={onEvents}
        />
      </div>
    </div>
  );
};

export default PriceChart;