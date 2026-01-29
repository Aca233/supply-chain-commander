/**
 * 财务报表图表组件
 * 支持收入支出对比、利润趋势、资产负债表可视化
 */

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// ==================== 类型定义 ====================

export interface FinancialDataPoint {
  period: string;  // 时间周期（如 "Day 1", "Week 1"）
  revenue: number;
  costs: number;
  profit: number;
  assets?: number;
  liabilities?: number;
  equity?: number;
}

export interface FinancialReportChartProps {
  data: FinancialDataPoint[];
  title?: string;
  height?: number | string;
  mode?: 'income' | 'balance' | 'cashflow';
  showComparison?: boolean;
  className?: string;
}

type ChartMode = 'income' | 'balance' | 'cashflow';

// ==================== 颜色配置 ====================

const COLORS = {
  revenue: '#22c55e',
  revenueGradient: ['rgba(34, 197, 94, 0.8)', 'rgba(34, 197, 94, 0.2)'],
  costs: '#ef4444',
  costsGradient: ['rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.2)'],
  profit: '#3b82f6',
  profitPositive: '#22c55e',
  profitNegative: '#ef4444',
  assets: '#8b5cf6',
  liabilities: '#f59e0b',
  equity: '#06b6d4',
  grid: '#1e293b',
  text: '#94a3b8',
  textLight: '#e2e8f0',
  tooltip: 'rgba(15, 23, 42, 0.95)',
  border: '#334155',
};

// ==================== 辅助函数 ====================

function formatMoney(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  } else if (absValue >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

// ==================== 主组件 ====================

export const FinancialReportChart: React.FC<FinancialReportChartProps> = ({
  data,
  title = '财务报表',
  height = 400,
  mode: initialMode = 'income',
  showComparison = true,
  className = '',
}) => {
  const [mode, setMode] = useState<ChartMode>(initialMode);

  // 计算汇总数据
  const summary = useMemo(() => {
    if (data.length === 0) return null;

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalCosts = data.reduce((sum, d) => sum + d.costs, 0);
    const totalProfit = data.reduce((sum, d) => sum + d.profit, 0);
    const avgProfitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

    // 计算增长率
    const latestPeriod = data[data.length - 1];
    const previousPeriod = data.length > 1 ? data[data.length - 2] : null;
    
    const revenueGrowth = previousPeriod && previousPeriod.revenue > 0
      ? (latestPeriod.revenue - previousPeriod.revenue) / previousPeriod.revenue
      : 0;
    const profitGrowth = previousPeriod && previousPeriod.profit !== 0
      ? (latestPeriod.profit - previousPeriod.profit) / Math.abs(previousPeriod.profit)
      : 0;

    // 资产负债表数据
    const latestAssets = latestPeriod.assets || 0;
    const latestLiabilities = latestPeriod.liabilities || 0;
    const latestEquity = latestPeriod.equity || 0;
    const debtRatio = latestAssets > 0 ? latestLiabilities / latestAssets : 0;

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      avgProfitMargin,
      revenueGrowth,
      profitGrowth,
      latestAssets,
      latestLiabilities,
      latestEquity,
      debtRatio,
      latestPeriod,
    };
  }, [data]);

  // 构建图表配置
  const option: EChartsOption = useMemo(() => {
    const periods = data.map(d => d.period);

    if (mode === 'income') {
      // 收入支出对比图 - 柱状图 + 折线图
      // 禁用动画以支持高速游戏更新
      return {
        animation: false,
        animationDuration: 0,
        animationDurationUpdate: 0,
        backgroundColor: 'transparent',
        title: {
          text: '收入与支出',
          textStyle: { color: COLORS.textLight, fontSize: 14 },
          left: 10,
          top: 5,
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: COLORS.tooltip,
          borderColor: COLORS.border,
          borderWidth: 1,
          textStyle: { color: COLORS.textLight, fontSize: 12 },
          formatter: (params: any) => {
            if (!Array.isArray(params) || params.length === 0) return '';
            let html = `<div class="font-medium mb-2">${params[0].name}</div>`;
            params.forEach((p: any) => {
              const value = typeof p.value === 'number' ? formatMoney(p.value) : p.value;
              html += `<div style="display:flex;justify-content:space-between;gap:16px;">
                <span style="color:${p.color}">● ${p.seriesName}</span>
                <span>¥${value}</span>
              </div>`;
            });
            // 利润率
            const revenueParam = params.find((p: any) => p.seriesName === '收入');
            const profitParam = params.find((p: any) => p.seriesName === '利润');
            if (revenueParam && profitParam && revenueParam.value > 0) {
              const margin = (profitParam.value / revenueParam.value * 100).toFixed(1);
              html += `<div style="margin-top:8px;color:#94a3b8;">利润率: ${margin}%</div>`;
            }
            return html;
          },
        },
        legend: {
          show: true,
          data: ['收入', '支出', '利润'],
          textStyle: { color: COLORS.text, fontSize: 10 },
          right: 20,
          top: 5,
        },
        grid: {
          left: 70,
          right: 30,
          top: 60,
          bottom: 40,
        },
        xAxis: {
          type: 'category',
          data: periods,
          axisLine: { lineStyle: { color: COLORS.border } },
          axisLabel: { color: COLORS.text, fontSize: 10 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
          axisLine: { show: false },
          axisLabel: {
            color: COLORS.text,
            fontSize: 10,
            formatter: (value: number) => `¥${formatMoney(value)}`,
          },
        },
        series: [
          {
            name: '收入',
            type: 'bar',
            data: data.map(d => d.revenue),
            barWidth: '25%',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: COLORS.revenueGradient[0] },
                  { offset: 1, color: COLORS.revenueGradient[1] },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
          },
          {
            name: '支出',
            type: 'bar',
            data: data.map(d => d.costs),
            barWidth: '25%',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: COLORS.costsGradient[0] },
                  { offset: 1, color: COLORS.costsGradient[1] },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
          },
          {
            name: '利润',
            type: 'line',
            data: data.map(d => d.profit),
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { color: COLORS.profit, width: 2 },
            itemStyle: {
              color: (params: any) => params.value >= 0 ? COLORS.profitPositive : COLORS.profitNegative,
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
                ],
              },
            },
          },
        ],
      };
    } else if (mode === 'balance') {
      // 资产负债表 - 堆叠柱状图
      // 禁用动画以支持高速游戏更新
      return {
        animation: false,
        animationDuration: 0,
        animationDurationUpdate: 0,
        backgroundColor: 'transparent',
        title: {
          text: '资产负债表',
          textStyle: { color: COLORS.textLight, fontSize: 14 },
          left: 10,
          top: 5,
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: COLORS.tooltip,
          borderColor: COLORS.border,
          borderWidth: 1,
          textStyle: { color: COLORS.textLight, fontSize: 12 },
          formatter: (params: any) => {
            if (!Array.isArray(params) || params.length === 0) return '';
            let html = `<div class="font-medium mb-2">${params[0].name}</div>`;
            let total = 0;
            params.forEach((p: any) => {
              const value = typeof p.value === 'number' ? p.value : 0;
              total += value;
              html += `<div style="display:flex;justify-content:space-between;gap:16px;">
                <span style="color:${p.color}">● ${p.seriesName}</span>
                <span>¥${formatMoney(value)}</span>
              </div>`;
            });
            html += `<div style="margin-top:8px;border-top:1px solid #334155;padding-top:4px;">
              总资产: ¥${formatMoney(total)}
            </div>`;
            return html;
          },
        },
        legend: {
          show: true,
          data: ['负债', '所有者权益'],
          textStyle: { color: COLORS.text, fontSize: 10 },
          right: 20,
          top: 5,
        },
        grid: {
          left: 70,
          right: 30,
          top: 60,
          bottom: 40,
        },
        xAxis: {
          type: 'category',
          data: periods,
          axisLine: { lineStyle: { color: COLORS.border } },
          axisLabel: { color: COLORS.text, fontSize: 10 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
          axisLine: { show: false },
          axisLabel: {
            color: COLORS.text,
            fontSize: 10,
            formatter: (value: number) => `¥${formatMoney(value)}`,
          },
        },
        series: [
          {
            name: '负债',
            type: 'bar',
            stack: 'total',
            data: data.map(d => d.liabilities || 0),
            barWidth: '40%',
            itemStyle: {
              color: COLORS.liabilities,
              borderRadius: [0, 0, 0, 0],
            },
          },
          {
            name: '所有者权益',
            type: 'bar',
            stack: 'total',
            data: data.map(d => d.equity || 0),
            barWidth: '40%',
            itemStyle: {
              color: COLORS.equity,
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      };
    } else {
      // 现金流瀑布图
      const cashFlowData: { name: string; value: number; itemStyle?: any }[] = [];
      let runningTotal = 0;

      data.forEach((d, index) => {
        if (index === 0) {
          runningTotal = d.profit;
          cashFlowData.push({
            name: d.period,
            value: d.profit,
            itemStyle: { color: d.profit >= 0 ? COLORS.profitPositive : COLORS.profitNegative },
          });
        } else {
          const change = d.profit;
          cashFlowData.push({
            name: d.period,
            value: change,
            itemStyle: { color: change >= 0 ? COLORS.profitPositive : COLORS.profitNegative },
          });
          runningTotal += change;
        }
      });

      // 禁用动画以支持高速游戏更新
      return {
        animation: false,
        animationDuration: 0,
        animationDurationUpdate: 0,
        backgroundColor: 'transparent',
        title: {
          text: '现金流变化',
          textStyle: { color: COLORS.textLight, fontSize: 14 },
          left: 10,
          top: 5,
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: COLORS.tooltip,
          borderColor: COLORS.border,
          borderWidth: 1,
          textStyle: { color: COLORS.textLight, fontSize: 12 },
          formatter: (params: any) => {
            if (!Array.isArray(params) || params.length === 0) return '';
            const p = params[0];
            const sign = p.value >= 0 ? '+' : '';
            return `
              <div class="font-medium mb-1">${p.name}</div>
              <div>变化: <span style="color:${p.value >= 0 ? COLORS.profitPositive : COLORS.profitNegative}">${sign}¥${formatMoney(p.value)}</span></div>
            `;
          },
        },
        grid: {
          left: 70,
          right: 30,
          top: 60,
          bottom: 40,
        },
        xAxis: {
          type: 'category',
          data: cashFlowData.map(d => d.name),
          axisLine: { lineStyle: { color: COLORS.border } },
          axisLabel: { color: COLORS.text, fontSize: 10 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
          axisLine: { show: false },
          axisLabel: {
            color: COLORS.text,
            fontSize: 10,
            formatter: (value: number) => `¥${formatMoney(value)}`,
          },
        },
        series: [
          {
            type: 'bar',
            data: cashFlowData,
            barWidth: '50%',
            label: {
              show: true,
              position: 'top',
              formatter: (params: any) => {
                const sign = params.value >= 0 ? '+' : '';
                return `${sign}${formatMoney(params.value)}`;
              },
              color: COLORS.text,
              fontSize: 10,
            },
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      };
    }
  }, [data, mode]);

  // 模式切换按钮
  const modeButtons: { key: ChartMode; label: string; icon: string }[] = [
    { key: 'income', label: '损益表', icon: '📊' },
    { key: 'balance', label: '资产负债', icon: '⚖️' },
    { key: 'cashflow', label: '现金流', icon: '💰' },
  ];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-background-secondary rounded-t-lg">
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
        
        {/* 模式切换 */}
        <div className="flex items-center gap-1">
          {modeButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setMode(btn.key)}
              className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                mode === btn.key
                  ? 'bg-accent/20 text-accent'
                  : 'bg-background-tertiary text-text-tertiary hover:bg-background-secondary'
              }`}
            >
              <span>{btn.icon}</span>
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 汇总指标 */}
      {showComparison && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 py-2 bg-background-tertiary">
          {mode === 'income' && (
            <>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">总收入</p>
                <p className="text-sm font-medium text-chart-up">
                  ¥{formatMoney(summary.totalRevenue)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">总支出</p>
                <p className="text-sm font-medium text-chart-down">
                  ¥{formatMoney(summary.totalCosts)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">净利润</p>
                <p className={`text-sm font-medium ${summary.totalProfit >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
                  {summary.totalProfit >= 0 ? '+' : ''}¥{formatMoney(summary.totalProfit)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">利润率</p>
                <p className={`text-sm font-medium ${summary.avgProfitMargin >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
                  {formatPercent(summary.avgProfitMargin)}
                </p>
              </div>
            </>
          )}
          {mode === 'balance' && (
            <>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">总资产</p>
                <p className="text-sm font-medium text-accent">
                  ¥{formatMoney(summary.latestAssets)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">总负债</p>
                <p className="text-sm font-medium text-warning">
                  ¥{formatMoney(summary.latestLiabilities)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">所有者权益</p>
                <p className="text-sm font-medium text-info">
                  ¥{formatMoney(summary.latestEquity)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">资产负债率</p>
                <p className={`text-sm font-medium ${summary.debtRatio > 0.6 ? 'text-chart-down' : 'text-chart-up'}`}>
                  {formatPercent(summary.debtRatio)}
                </p>
              </div>
            </>
          )}
          {mode === 'cashflow' && (
            <>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">期末现金</p>
                <p className={`text-sm font-medium ${summary.totalProfit >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
                  ¥{formatMoney(summary.totalProfit)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">收入增长</p>
                <p className={`text-sm font-medium ${summary.revenueGrowth >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
                  {summary.revenueGrowth >= 0 ? '+' : ''}{formatPercent(summary.revenueGrowth)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">利润增长</p>
                <p className={`text-sm font-medium ${summary.profitGrowth >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
                  {summary.profitGrowth >= 0 ? '+' : ''}{formatPercent(summary.profitGrowth)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary">数据周期</p>
                <p className="text-sm font-medium text-text-secondary">
                  {data.length} 期
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* 图表 */}
      <div className="flex-1 min-h-0 bg-background-tertiary rounded-b-lg">
        {data.length > 0 ? (
          <ReactECharts
            option={option}
            style={{ height: typeof height === 'number' ? height : height, width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={false}
            lazyUpdate={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            <div className="text-center">
              <p className="text-3xl mb-2">📈</p>
              <p className="text-sm">暂无财务数据</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialReportChart;