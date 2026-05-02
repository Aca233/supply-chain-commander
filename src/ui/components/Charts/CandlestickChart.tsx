/**
 * 增强版K线图组件
 * 支持K线图、成交量、技术指标（MA、布林带、RSI）
 */

import React, { useMemo, useState, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// ==================== 类型定义 ====================

export interface OHLCData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandlestickChartProps {
  data: OHLCData[];
  title?: string;
  height?: number | string;
  showVolume?: boolean;
  showMA?: boolean;
  showBollinger?: boolean;
  showRSI?: boolean;
  maperiods?: number[];
  bollingerPeriod?: number;
  bollingerStdDev?: number;
  rsiPeriod?: number;
  className?: string;
}

interface IndicatorConfig {
  ma: boolean;
  bollinger: boolean;
  rsi: boolean;
}

// ==================== 辅助函数 ====================

/**
 * 计算简单移动平均线
 */
function calculateSMA(data: number[], period: number): (number | null)[] {
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
 * 计算布林带
 */
function calculateBollingerBands(
  data: number[],
  period: number,
  stdDev: number
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      let variance = 0;
      for (let j = 0; j < period; j++) {
        variance += Math.pow(data[i - j] - (middle[i] as number), 2);
      }
      const std = Math.sqrt(variance / period);
      upper.push((middle[i] as number) + stdDev * std);
      lower.push((middle[i] as number) - stdDev * std);
    }
  }

  return { upper, middle, lower };
}

/**
 * 计算RSI（相对强弱指数）
 */
function calculateRSI(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }

    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);

    if (i < period) {
      result.push(null);
    } else {
      let avgGain = 0;
      let avgLoss = 0;
      
      if (i === period) {
        // 第一个RSI值使用简单平均
        for (let j = 0; j < period; j++) {
          avgGain += gains[i - 1 - j];
          avgLoss += losses[i - 1 - j];
        }
        avgGain /= period;
        avgLoss /= period;
      } else {
        // 使用平滑平均
        const prevResult = result[i - 1];
        if (prevResult === null) {
          result.push(null);
          continue;
        }
        // 近似计算
        avgGain = (gains[i - 1] + (period - 1) * (gains[i - 2] || 0)) / period;
        avgLoss = (losses[i - 1] + (period - 1) * (losses[i - 2] || 0)) / period;
      }

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }

  return result;
}

/**
 * 格式化数字
 */
function formatNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  } else if (absValue >= 1000) {
    return (value / 1000).toFixed(2) + 'K';
  }
  return value.toFixed(2);
}

// ==================== 颜色配置 ====================

const COLORS = {
  up: '#22c55e',
  down: '#ef4444',
  ma5: '#f59e0b',
  ma10: '#8b5cf6',
  ma20: '#3b82f6',
  ma60: '#ec4899',
  bollingerUpper: '#06b6d4',
  bollingerMiddle: '#94a3b8',
  bollingerLower: '#06b6d4',
  bollingerFill: 'rgba(6, 182, 212, 0.1)',
  rsiLine: '#8b5cf6',
  rsiOverbought: 'rgba(239, 68, 68, 0.3)',
  rsiOversold: 'rgba(34, 197, 94, 0.3)',
  grid: '#1e293b',
  text: '#94a3b8',
  textLight: '#e2e8f0',
  tooltip: 'rgba(15, 23, 42, 0.95)',
  border: '#334155',
};

// ==================== 主组件 ====================

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  title = 'K线图',
  height = 500,
  showVolume = true,
  showMA = true,
  showBollinger = false,
  showRSI = false,
  maperiods = [5, 10, 20],
  bollingerPeriod = 20,
  bollingerStdDev = 2,
  rsiPeriod = 14,
  className = '',
}) => {
  const chartRef = useRef<ReactECharts>(null);
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    ma: showMA,
    bollinger: showBollinger,
    rsi: showRSI,
  });

  // 计算指标数据
  const indicatorData = useMemo(() => {
    const closePrices = data.map(d => d.close);
    
    // MA数据
    const maData: Record<number, (number | null)[]> = {};
    if (indicators.ma) {
      maperiods.forEach(period => {
        maData[period] = calculateSMA(closePrices, period);
      });
    }
    
    // 布林带数据
    const bollinger = indicators.bollinger
      ? calculateBollingerBands(closePrices, bollingerPeriod, bollingerStdDev)
      : null;
    
    // RSI数据
    const rsi = indicators.rsi
      ? calculateRSI(closePrices, rsiPeriod)
      : null;
    
    return { maData, bollinger, rsi };
  }, [data, indicators, maperiods, bollingerPeriod, bollingerStdDev, rsiPeriod]);

  // 构建图表配置
  const option: EChartsOption = useMemo(() => {
    const times = data.map(d => String(d.time));
    const candlestickData = data.map(d => [d.open, d.close, d.low, d.high]);
    const volumes = data.map(d => d.volume || 0);
    const closePrices = data.map(d => d.close);

    // 计算图表区域布局
    const hasRSI = indicators.rsi && indicatorData.rsi;
    const gridCount = 1 + (showVolume ? 1 : 0) + (hasRSI ? 1 : 0);
    
    // 构建grid配置
    const grids: any[] = [];
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    
    // 主图区域（K线）
    let mainHeight = hasRSI ? '45%' : (showVolume ? '55%' : '80%');
    grids.push({
      left: 60,
      right: 20,
      top: 60,
      height: mainHeight,
    });
    
    xAxes.push({
      type: 'category',
      data: times,
      gridIndex: 0,
      axisLine: { lineStyle: { color: COLORS.border } },
      axisLabel: { color: COLORS.text, fontSize: 10, show: !showVolume && !hasRSI },
      axisTick: { show: false },
      boundaryGap: true,
    });
    
    yAxes.push({
      type: 'value',
      gridIndex: 0,
      splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
      axisLine: { show: false },
      axisLabel: { 
        color: COLORS.text, 
        fontSize: 10,
        formatter: (value: number) => `¥${formatNumber(value)}`,
      },
      scale: true,
    });

    // 成交量区域
    if (showVolume) {
      const volumeTop = hasRSI ? '62%' : '72%';
      const volumeHeight = hasRSI ? '13%' : '18%';
      
      grids.push({
        left: 60,
        right: 20,
        top: volumeTop,
        height: volumeHeight,
      });
      
      xAxes.push({
        type: 'category',
        data: times,
        gridIndex: 1,
        axisLine: { lineStyle: { color: COLORS.border } },
        axisLabel: { show: !hasRSI, color: COLORS.text, fontSize: 10 },
        axisTick: { show: false },
        boundaryGap: true,
      });
      
      yAxes.push({
        type: 'value',
        gridIndex: 1,
        splitLine: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
      });
    }

    // RSI区域
    if (hasRSI) {
      grids.push({
        left: 60,
        right: 20,
        top: showVolume ? '78%' : '72%',
        height: '15%',
      });
      
      const rsiGridIndex = showVolume ? 2 : 1;
      
      xAxes.push({
        type: 'category',
        data: times,
        gridIndex: rsiGridIndex,
        axisLine: { lineStyle: { color: COLORS.border } },
        axisLabel: { color: COLORS.text, fontSize: 10 },
        axisTick: { show: false },
        boundaryGap: true,
      });
      
      yAxes.push({
        type: 'value',
        gridIndex: rsiGridIndex,
        min: 0,
        max: 100,
        interval: 50,
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        axisLine: { show: false },
        axisLabel: { color: COLORS.text, fontSize: 10 },
      });
    }

    // 构建series
    const series: any[] = [];

    // K线图
    series.push({
      name: 'K线',
      type: 'candlestick',
      data: candlestickData,
      itemStyle: {
        color: COLORS.up,
        color0: COLORS.down,
        borderColor: COLORS.up,
        borderColor0: COLORS.down,
      },
    });

    // MA线
    if (indicators.ma) {
      const maColors = [COLORS.ma5, COLORS.ma10, COLORS.ma20, COLORS.ma60];
      maperiods.forEach((period, index) => {
        if (indicatorData.maData[period]) {
          series.push({
            name: `MA${period}`,
            type: 'line',
            data: indicatorData.maData[period],
            smooth: true,
            symbol: 'none',
            lineStyle: { 
              color: maColors[index % maColors.length], 
              width: 1.5,
              opacity: 0.8,
            },
          });
        }
      });
    }

    // 布林带
    if (indicators.bollinger && indicatorData.bollinger) {
      const { upper, middle, lower } = indicatorData.bollinger;
      
      series.push({
        name: 'BOLL上轨',
        type: 'line',
        data: upper,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: COLORS.bollingerUpper, width: 1, type: 'dashed' },
      });
      
      series.push({
        name: 'BOLL中轨',
        type: 'line',
        data: middle,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: COLORS.bollingerMiddle, width: 1 },
      });
      
      series.push({
        name: 'BOLL下轨',
        type: 'line',
        data: lower,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: COLORS.bollingerLower, width: 1, type: 'dashed' },
        areaStyle: {
          color: COLORS.bollingerFill,
          origin: 'start',
        },
      });
    }

    // 成交量
    if (showVolume) {
      series.push({
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes.map((vol, idx) => ({
          value: vol,
          itemStyle: {
            color: idx > 0 && closePrices[idx] >= closePrices[idx - 1]
              ? 'rgba(34, 197, 94, 0.6)'
              : 'rgba(239, 68, 68, 0.6)',
          },
        })),
      });
    }

    // RSI
    if (hasRSI && indicatorData.rsi) {
      const rsiYAxisIndex = showVolume ? 2 : 1;
      const rsiXAxisIndex = showVolume ? 2 : 1;
      
      series.push({
        name: 'RSI',
        type: 'line',
        xAxisIndex: rsiXAxisIndex,
        yAxisIndex: rsiYAxisIndex,
        data: indicatorData.rsi,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: COLORS.rsiLine, width: 1.5 },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { 
              yAxis: 70, 
              lineStyle: { color: COLORS.down, type: 'dashed', width: 1 },
              label: { show: true, position: 'end', formatter: '超买', color: COLORS.down, fontSize: 9 },
            },
            { 
              yAxis: 30, 
              lineStyle: { color: COLORS.up, type: 'dashed', width: 1 },
              label: { show: true, position: 'end', formatter: '超卖', color: COLORS.up, fontSize: 9 },
            },
          ],
        },
      });
    }

    // 图例配置
    const legendData = ['K线'];
    if (indicators.ma) {
      maperiods.forEach(p => legendData.push(`MA${p}`));
    }
    if (indicators.bollinger) {
      legendData.push('BOLL上轨', 'BOLL中轨', 'BOLL下轨');
    }
    if (showVolume) legendData.push('成交量');
    if (hasRSI) legendData.push('RSI');

    return {
      animation: false,
      backgroundColor: 'transparent',
      title: {
        text: title,
        textStyle: { color: COLORS.textLight, fontSize: 14, fontWeight: 'normal' },
        left: 10,
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#999' },
          lineStyle: { color: '#64748b', type: 'dashed' },
        },
        backgroundColor: COLORS.tooltip,
        borderColor: COLORS.border,
        borderWidth: 1,
        textStyle: { color: COLORS.textLight, fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          
          const firstParam = params[0];
          if (!firstParam) return '';
          
          let html = `<div class="font-medium mb-2">${firstParam.name}</div>`;
          
          // K线数据
          const klineParam = params.find((p: any) => p.seriesName === 'K线');
          if (klineParam && Array.isArray(klineParam.data)) {
            const [open, close, low, high] = klineParam.data;
            const change = ((close - open) / open * 100).toFixed(2);
            const changeColor = close >= open ? COLORS.up : COLORS.down;
            html += `
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:8px;">
                <div>开: ¥${open.toFixed(2)}</div>
                <div>高: ¥${high.toFixed(2)}</div>
                <div>收: ¥${close.toFixed(2)}</div>
                <div>低: ¥${low.toFixed(2)}</div>
              </div>
              <div style="color:${changeColor}">涨跌: ${change}%</div>
            `;
          }
          
          // 其他指标
          params.forEach((p: any) => {
            if (p.seriesName === 'K线') return;
            if (p.value === null || p.value === undefined) return;
            
            const value = typeof p.value === 'number' ? p.value.toFixed(2) : p.value;
            html += `<div style="display:flex;justify-content:space-between;gap:8px;">
              <span style="color:${p.color}">● ${p.seriesName}</span>
              <span>${p.seriesName === '成交量' ? formatNumber(Number(value)) : value}</span>
            </div>`;
          });
          
          return html;
        },
      },
      legend: {
        show: true,
        data: legendData,
        textStyle: { color: COLORS.text, fontSize: 10 },
        right: 20,
        top: 10,
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 3,
        selected: {
          'BOLL上轨': false,
          'BOLL下轨': false,
        },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: Array.from({ length: gridCount }, (_, i) => i),
          start: Math.max(0, ((data.length - 60) / data.length) * 100),
          end: 100,
        },
        {
          show: data.length > 30,
          type: 'slider',
          xAxisIndex: Array.from({ length: gridCount }, (_, i) => i),
          bottom: 5,
          height: 18,
          borderColor: COLORS.border,
          backgroundColor: COLORS.grid,
          fillerColor: 'rgba(59, 130, 246, 0.2)',
          handleStyle: { color: '#3b82f6' },
          textStyle: { color: COLORS.text, fontSize: 9 },
        },
      ],
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
    };
  }, [data, indicatorData, indicators, showVolume, title, maperiods]);

  // 指标切换处理
  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // 计算涨跌信息
  const priceChange = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0];
    const last = data[data.length - 1];
    const change = last.close - first.open;
    const changePercent = (change / first.open) * 100;
    return {
      current: last.close,
      change,
      changePercent,
      isUp: change >= 0,
    };
  }, [data]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-3">
          {priceChange && (
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${priceChange.isUp ? 'text-chart-up' : 'text-chart-down'}`}>
                ¥{priceChange.current.toFixed(2)}
              </span>
              <span className={`text-sm ${priceChange.isUp ? 'text-chart-up' : 'text-chart-down'}`}>
                {priceChange.isUp ? '▲' : '▼'}
                {Math.abs(priceChange.changePercent).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        
        {/* 指标切换按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleIndicator('ma')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              indicators.ma 
                ? 'bg-accent/20 text-accent' 
                : 'bg-background-tertiary text-text-tertiary hover:bg-background-secondary'
            }`}
          >
            MA
          </button>
          <button
            onClick={() => toggleIndicator('bollinger')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              indicators.bollinger 
                ? 'bg-accent/20 text-accent' 
                : 'bg-background-tertiary text-text-tertiary hover:bg-background-secondary'
            }`}
          >
            BOLL
          </button>
          <button
            onClick={() => toggleIndicator('rsi')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              indicators.rsi 
                ? 'bg-accent/20 text-accent' 
                : 'bg-background-tertiary text-text-tertiary hover:bg-background-secondary'
            }`}
          >
            RSI
          </button>
        </div>
      </div>

      {/* 图表 */}
      <div className="flex-1 min-h-0">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: typeof height === 'number' ? height : height, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
};

export default CandlestickChart;