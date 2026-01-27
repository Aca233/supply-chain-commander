/**
 * 性能监控面板
 * 实时显示FPS、Tick耗时、内存使用、系统breakdown等
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  perfMonitor,
  PerformanceSnapshot,
  FPSData,
  MemoryData,
  TickBreakdown,
  PoolStatsData,
  downloadPerformanceJSON,
  downloadPerformanceCSV,
  ExportOptions,
} from '@/core/performance';

// ==================== 类型定义 ====================

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'healthy' | 'warning' | 'critical';
  icon?: string;
}

// ==================== 辅助函数 ====================

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const getStatusColor = (status: 'healthy' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'healthy': return '#22c55e';
    case 'warning': return '#f59e0b';
    case 'critical': return '#ef4444';
    default: return '#64748b';
  }
};

const getStatusBgClass = (status: 'healthy' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'healthy': return 'bg-green-500/20 border-green-500/50';
    case 'warning': return 'bg-yellow-500/20 border-yellow-500/50';
    case 'critical': return 'bg-red-500/20 border-red-500/50';
    default: return 'bg-slate-700 border-slate-600';
  }
};

// ==================== 子组件 ====================

/**
 * 指标卡片
 */
const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, status, icon }) => {
  const statusColor = status ? getStatusColor(status) : '#3b82f6';
  const bgClass = status ? getStatusBgClass(status) : 'bg-slate-800 border-slate-700';
  
  return (
    <div className={`rounded-lg p-4 border ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{title}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-2xl font-bold" style={{ color: statusColor }}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
};

/**
 * 健康状态指示器
 */
const HealthIndicator: React.FC<{ health: 'healthy' | 'warning' | 'critical' }> = ({ health }) => {
  const labels = {
    healthy: '✓ 正常',
    warning: '⚠ 警告',
    critical: '✗ 临界',
  };
  
  return (
    <div className={`rounded-lg p-4 border ${getStatusBgClass(health)} text-center`}>
      <div className="text-sm text-slate-400 mb-2">健康状态</div>
      <div className="text-2xl font-bold" style={{ color: getStatusColor(health) }}>
        {labels[health]}
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

export const PerformanceDashboard: React.FC = () => {
  // 状态
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<PerformanceSnapshot | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(500);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [exportTimeRange, setExportTimeRange] = useState<ExportOptions['timeRange']>('last100');
  
  // 定时刷新
  useEffect(() => {
    if (!isAutoRefresh) return;
    
    const interval = setInterval(() => {
      const latest = perfMonitor.getSnapshot();
      const history = perfMonitor.getSnapshots(100);
      setLatestSnapshot(latest);
      setSnapshots(history);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval]);
  
  // 初始加载
  useEffect(() => {
    const latest = perfMonitor.getSnapshot();
    const history = perfMonitor.getSnapshots(100);
    setLatestSnapshot(latest);
    setSnapshots(history);
  }, []);
  
  // 导出处理
  const handleExportJSON = useCallback(() => {
    downloadPerformanceJSON({ timeRange: exportTimeRange });
  }, [exportTimeRange]);
  
  const handleExportCSV = useCallback(() => {
    downloadPerformanceCSV({ timeRange: exportTimeRange });
  }, [exportTimeRange]);
  
  // 获取当前数据
  const fps = latestSnapshot?.fps || { current: 0, avg: 0, min: 0, max: 0, frameCount: 0 };
  const memory = latestSnapshot?.memory || { usedJSHeapSize: 0, jsHeapSizeLimit: 1, usageRatio: 0, totalJSHeapSize: 0 };
  const breakdown = latestSnapshot?.breakdown || { production: 0, matching: 0, pricing: 0, ai: 0, retail: 0, other: 0 };
  const pools = latestSnapshot?.pools;
  const health = latestSnapshot?.health || 'healthy';
  const tickTime = latestSnapshot?.tickTime || 0;
  const avgTickTime = latestSnapshot?.avgTickTime || 0;
  
  // Tick耗时历史图表配置
  const tickTimeChartOption: EChartsOption = useMemo(() => {
    const times = snapshots.map(s => s.tick);
    const values = snapshots.map(s => s.tickTime);
    const thresholds = perfMonitor.getThresholds();
    
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0];
          return `Tick ${p.name}<br/>耗时: ${p.value.toFixed(2)}ms`;
        },
      },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: { 
          color: '#94a3b8', 
          fontSize: 10,
          formatter: (v: number) => `${v}ms`,
        },
      },
      series: [
        {
          name: 'Tick耗时',
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#3b82f6', width: 2 },
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
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              { 
                yAxis: thresholds.warning, 
                lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 },
                label: { show: true, formatter: '警告', color: '#f59e0b', fontSize: 10 },
              },
              { 
                yAxis: thresholds.critical, 
                lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
                label: { show: true, formatter: '临界', color: '#ef4444', fontSize: 10 },
              },
            ],
          },
        },
      ],
    };
  }, [snapshots]);
  
  // 系统Breakdown饼图配置
  const breakdownChartOption: EChartsOption = useMemo(() => {
    const data = [
      { name: '生产', value: breakdown.production, itemStyle: { color: '#3b82f6' } },
      { name: '撮合', value: breakdown.matching, itemStyle: { color: '#8b5cf6' } },
      { name: '定价', value: breakdown.pricing, itemStyle: { color: '#ec4899' } },
      { name: 'AI', value: breakdown.ai, itemStyle: { color: '#f59e0b' } },
      { name: '零售', value: breakdown.retail, itemStyle: { color: '#22c55e' } },
      { name: '其他', value: breakdown.other, itemStyle: { color: '#64748b' } },
    ].filter(d => d.value > 0.01); // 过滤掉太小的值
    
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: any) => `${params.name}: ${params.value.toFixed(2)}ms (${params.percent}%)`,
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: '系统耗时',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: '#0f172a', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold', color: '#fff' },
          },
          data,
        },
      ],
    };
  }, [breakdown]);
  
  // 对象池使用率条形图配置
  const poolChartOption: EChartsOption = useMemo(() => {
    if (!pools) return {};
    
    const poolData = [
      { name: 'Orders', usage: pools.orders.activeCount / (pools.orders.poolSize + pools.orders.activeCount + 1) * 100, hitRate: pools.orders.hitRate * 100 },
      { name: 'Events', usage: pools.events.activeCount / (pools.events.poolSize + pools.events.activeCount + 1) * 100, hitRate: pools.events.hitRate * 100 },
      { name: 'Trades', usage: pools.trades.activeCount / (pools.trades.poolSize + pools.trades.activeCount + 1) * 100, hitRate: pools.trades.hitRate * 100 },
      { name: 'PricePoints', usage: pools.pricePoints.activeCount / (pools.pricePoints.poolSize + pools.pricePoints.activeCount + 1) * 100, hitRate: pools.pricePoints.hitRate * 100 },
    ];
    
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: any) => {
          const d = poolData.find(p => p.name === params[0].name);
          if (!d) return '';
          return `${d.name}<br/>使用率: ${d.usage.toFixed(1)}%<br/>命中率: ${d.hitRate.toFixed(1)}%`;
        },
      },
      grid: { left: 80, right: 30, top: 20, bottom: 30 },
      xAxis: {
        type: 'value',
        max: 100,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, formatter: (v: number) => `${v}%` },
      },
      yAxis: {
        type: 'category',
        data: poolData.map(d => d.name),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: '使用率',
          type: 'bar',
          data: poolData.map(d => ({
            value: d.usage,
            itemStyle: { 
              color: d.usage > 80 ? '#ef4444' : d.usage > 50 ? '#f59e0b' : '#22c55e',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            color: '#94a3b8',
            fontSize: 10,
            formatter: (params: any) => `${params.value.toFixed(0)}%`,
          },
        },
      ],
    };
  }, [pools]);
  
  return (
    <div className="space-y-6">
      {/* 标题和控制栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">性能监控</h2>
        <div className="flex items-center gap-4">
          {/* 自动刷新开关 */}
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={isAutoRefresh}
              onChange={e => setIsAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
            />
            自动刷新
          </label>
          
          {/* 刷新间隔 */}
          <select
            value={refreshInterval}
            onChange={e => setRefreshInterval(Number(e.target.value))}
            className="bg-slate-700 text-white text-sm px-3 py-1 rounded border border-slate-600"
          >
            <option value={250}>250ms</option>
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
          </select>
          
          {/* 导出按钮 */}
          <div className="flex items-center gap-2">
            <select
              value={exportTimeRange}
              onChange={e => setExportTimeRange(e.target.value as ExportOptions['timeRange'])}
              className="bg-slate-700 text-white text-sm px-3 py-1 rounded border border-slate-600"
            >
              <option value="last100">最近100条</option>
              <option value="last500">最近500条</option>
              <option value="last1000">最近1000条</option>
              <option value="all">全部</option>
            </select>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              导出JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              导出CSV
            </button>
          </div>
        </div>
      </div>
      
      {/* 指标卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="FPS"
          value={fps.current.toFixed(1)}
          subtitle={`平均: ${fps.avg.toFixed(1)} | 范围: ${fps.min.toFixed(0)}-${fps.max.toFixed(0)}`}
          status={fps.avg >= 50 ? 'healthy' : fps.avg >= 30 ? 'warning' : 'critical'}
          icon="🎮"
        />
        <MetricCard
          title="Tick耗时"
          value={`${tickTime.toFixed(2)}ms`}
          subtitle={`平均: ${avgTickTime.toFixed(2)}ms`}
          status={health}
          icon="⏱️"
        />
        <MetricCard
          title="内存使用"
          value={formatBytes(memory.usedJSHeapSize)}
          subtitle={`总量: ${formatBytes(memory.jsHeapSizeLimit)} | ${(memory.usageRatio * 100).toFixed(1)}%`}
          status={memory.usageRatio > 0.85 ? 'critical' : memory.usageRatio > 0.7 ? 'warning' : 'healthy'}
          icon="💾"
        />
        <HealthIndicator health={health} />
      </div>
      
      {/* 图表区域 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Tick耗时历史 */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Tick耗时历史</h3>
          <ReactECharts
            option={tickTimeChartOption}
            style={{ height: 200 }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
        
        {/* 系统Breakdown */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">系统耗时分布</h3>
          <ReactECharts
            option={breakdownChartOption}
            style={{ height: 200 }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </div>
      
      {/* 对象池状态 */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3">对象池使用率</h3>
        <div className="grid grid-cols-2 gap-4">
          <ReactECharts
            option={poolChartOption}
            style={{ height: 160 }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
            lazyUpdate={true}
          />
          
          {/* 对象池详细信息 */}
          {pools && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-700/50 rounded p-3">
                <div className="text-slate-400 mb-1">Orders Pool</div>
                <div className="text-white">活跃: {pools.orders.activeCount} / 池中: {pools.orders.poolSize}</div>
                <div className="text-slate-500">命中率: {(pools.orders.hitRate * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-slate-700/50 rounded p-3">
                <div className="text-slate-400 mb-1">Trades Pool</div>
                <div className="text-white">活跃: {pools.trades.activeCount} / 池中: {pools.trades.poolSize}</div>
                <div className="text-slate-500">命中率: {(pools.trades.hitRate * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-slate-700/50 rounded p-3">
                <div className="text-slate-400 mb-1">Events Pool</div>
                <div className="text-white">活跃: {pools.events.activeCount} / 池中: {pools.events.poolSize}</div>
                <div className="text-slate-500">命中率: {(pools.events.hitRate * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-slate-700/50 rounded p-3">
                <div className="text-slate-400 mb-1">TypedArrays Pool</div>
                <div className="text-white">数组: {pools.typedArrays.pooledArrays} / {formatBytes(pools.typedArrays.pooledBytes)}</div>
                <div className="text-slate-500">命中率: {(pools.typedArrays.hitRate * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 最近警告 */}
      {latestSnapshot && latestSnapshot.warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-400 mb-2">⚠️ 性能警告</h3>
          <ul className="text-sm text-yellow-200 space-y-1">
            {latestSnapshot.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;