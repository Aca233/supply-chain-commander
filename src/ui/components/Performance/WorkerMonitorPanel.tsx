/**
 * Worker性能监控面板
 * 实时显示Web Worker系统的运行状态和性能指标
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/ui/design-system';
import { getUnifiedWorkerFacade, type WorkerSystemStatus } from '@/core/workers/UnifiedWorkerFacade';

// ==================== 类型定义 ====================

export interface WorkerMonitorPanelProps {
  className?: string;
  refreshInterval?: number; // 刷新间隔（毫秒）
}

// ==================== 辅助函数 ====================

function formatNumber(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(decimals) + 'M';
  } else if (absValue >= 1000) {
    return (value / 1000).toFixed(decimals) + 'K';
  }
  return value.toFixed(decimals);
}

function formatTime(ms: number): string {
  if (ms >= 1000) {
    return (ms / 1000).toFixed(2) + 's';
  }
  return ms.toFixed(2) + 'ms';
}

function getHealthColor(value: number, thresholds: { good: number; warning: number }): string {
  if (value <= thresholds.good) return 'text-success';
  if (value <= thresholds.warning) return 'text-warning';
  return 'text-error';
}

// ==================== 子组件 ====================

const StatRow: React.FC<{
  label: string;
  value: string | number;
  icon?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}> = ({ label, value, icon, status = 'neutral' }) => {
  const statusColors = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    neutral: 'text-text-primary',
  };

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-b-0">
      <span className="text-sm text-text-secondary flex items-center gap-1.5">
        {icon && <span className="text-base">{icon}</span>}
        {label}
      </span>
      <span className={`text-sm font-mono font-medium ${statusColors[status]}`}>
        {value}
      </span>
    </div>
  );
};

const WorkerCard: React.FC<{
  title: string;
  icon: string;
  available: boolean;
  children: React.ReactNode;
}> = ({ title, icon, available, children }) => (
  <div className={`
    rounded-lg border p-3 transition-all
    ${available 
      ? 'bg-background-secondary border-border-default' 
      : 'bg-background-tertiary border-border-subtle opacity-60'
    }
  `}>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium flex items-center gap-1.5">
        <span>{icon}</span>
        {title}
      </h4>
      <Badge 
        variant={available ? 'success' : 'error'} 
        size="sm"
      >
        {available ? '运行中' : '离线'}
      </Badge>
    </div>
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
);

// ==================== 主组件 ====================

export const WorkerMonitorPanel: React.FC<WorkerMonitorPanelProps> = ({
  className = '',
  refreshInterval = 1000,
}) => {
  const [status, setStatus] = useState<WorkerSystemStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 刷新状态
  const refresh = useCallback(() => {
    try {
      const facade = getUnifiedWorkerFacade();
      const newStatus = facade.getStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error('获取Worker状态失败:', error);
    }
  }, []);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;
    
    refresh();
    const timer = setInterval(refresh, refreshInterval);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, refresh]);

  // 计算总体健康状态
  const getOverallHealth = (): 'healthy' | 'degraded' | 'critical' => {
    if (!status) return 'critical';
    
    const { economyWorker, aiWorker, workerPool } = status;
    const availableCount = [
      economyWorker.available,
      aiWorker.available,
      workerPool.available,
    ].filter(Boolean).length;
    
    if (availableCount >= 2) return 'healthy';
    if (availableCount >= 1) return 'degraded';
    return 'critical';
  };

  const health = getOverallHealth();
  const healthColors = {
    healthy: 'text-success',
    degraded: 'text-warning',
    critical: 'text-error',
  };
  const healthLabels = {
    healthy: '健康',
    degraded: '部分降级',
    critical: '离线',
  };

  if (!status) {
    return (
      <Card variant="elevated" className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-text-tertiary mb-2">Worker系统未初始化</div>
            <Button variant="primary" size="sm" onClick={refresh}>
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            ⚡ Worker性能监控
            <Badge 
              variant={health === 'healthy' ? 'success' : health === 'degraded' ? 'warning' : 'error'}
              size="sm"
            >
              {healthLabels[health]}
            </Badge>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1.5 rounded text-xs ${
                autoRefresh ? 'bg-success/20 text-success' : 'bg-background-tertiary text-text-tertiary'
              }`}
              title={autoRefresh ? '自动刷新中' : '自动刷新已暂停'}
            >
              {autoRefresh ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded bg-background-tertiary text-text-secondary hover:text-text-primary"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* 总体性能指标 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-text-tertiary mb-1">总任务数</div>
              <div className="text-lg font-bold text-text-primary tabular-nums">
                {formatNumber(status.performance.totalTasksProcessed, 0)}
              </div>
            </div>
            <div className="bg-background-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-text-tertiary mb-1">任务/秒</div>
              <div className="text-lg font-bold text-text-primary tabular-nums">
                {status.performance.tasksInLastSecond}
              </div>
            </div>
            <div className="bg-background-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-text-tertiary mb-1">平均响应</div>
              <div className={`text-lg font-bold tabular-nums ${
                getHealthColor(status.performance.avgResponseTime, { good: 5, warning: 20 })
              }`}>
                {formatTime(status.performance.avgResponseTime)}
              </div>
            </div>
            <div className="bg-background-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-text-tertiary mb-1">主线程回退</div>
              <div className={`text-lg font-bold tabular-nums ${
                status.performance.mainThreadFallbacks > 0 ? 'text-warning' : 'text-success'
              }`}>
                {status.performance.mainThreadFallbacks}
              </div>
            </div>
          </div>

          {/* Worker详情 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Worker Pool */}
            <WorkerCard
              title="Worker Pool"
              icon="🔧"
              available={status.workerPool.available}
            >
              <StatRow 
                label="Worker数" 
                value={`${status.workerPool.busyWorkers}/${status.workerPool.workerCount}`}
                status={status.workerPool.busyWorkers < status.workerPool.workerCount ? 'success' : 'warning'}
              />
              <StatRow 
                label="队列长度" 
                value={status.workerPool.queueLength}
                status={status.workerPool.queueLength === 0 ? 'success' : status.workerPool.queueLength < 10 ? 'neutral' : 'warning'}
              />
              <StatRow 
                label="已完成" 
                value={formatNumber(status.workerPool.completedTasks, 0)}
              />
              <StatRow 
                label="失败" 
                value={status.workerPool.failedTasks}
                status={status.workerPool.failedTasks === 0 ? 'success' : 'error'}
              />
              <StatRow 
                label="平均耗时" 
                value={formatTime(status.workerPool.avgTime)}
              />
            </WorkerCard>

            {/* Economy Worker */}
            <WorkerCard
              title="Economy Worker"
              icon="📊"
              available={status.economyWorker.available}
            >
              <StatRow 
                label="状态" 
                value={status.economyWorker.available ? '空闲' : '离线'}
                status={status.economyWorker.available ? 'success' : 'error'}
              />
              <StatRow 
                label="忙碌数" 
                value={status.economyWorker.busyCount}
              />
              <StatRow 
                label="平均耗时" 
                value={formatTime(status.economyWorker.avgTaskTime)}
              />
            </WorkerCard>

            {/* AI Worker */}
            <WorkerCard
              title="AI Worker"
              icon="🤖"
              available={status.aiWorker.available}
            >
              <StatRow 
                label="已发送" 
                value={formatNumber(status.aiWorker.requestsSent, 0)}
              />
              <StatRow 
                label="已完成" 
                value={formatNumber(status.aiWorker.requestsCompleted, 0)}
              />
              <StatRow 
                label="成功率" 
                value={status.aiWorker.requestsSent > 0 
                  ? `${((status.aiWorker.requestsCompleted / status.aiWorker.requestsSent) * 100).toFixed(1)}%`
                  : 'N/A'
                }
                status={status.aiWorker.requestsCompleted === status.aiWorker.requestsSent ? 'success' : 'warning'}
              />
              <StatRow 
                label="平均计算" 
                value={formatTime(status.aiWorker.avgComputeTime)}
              />
            </WorkerCard>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const facade = getUnifiedWorkerFacade();
                facade.resetStats();
                refresh();
              }}
            >
              重置统计
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
            >
              手动刷新
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default WorkerMonitorPanel;