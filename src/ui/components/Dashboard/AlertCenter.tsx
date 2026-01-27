/**
 * 告警中心组件
 * 显示需要玩家关注的告警和通知
 */

import React, { useState } from 'react';
import { useAlerts, Alert, AlertLevel } from './hooks/useAlerts';

interface AlertCenterProps {
  onNavigate?: (view: string, data?: Record<string, unknown>) => void;
  maxAlerts?: number;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({ 
  onNavigate,
  maxAlerts = 5 
}) => {
  const { alerts, criticalCount, warningCount, infoCount, hasAlerts } = useAlerts();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 获取告警样式
  const getAlertStyle = (level: AlertLevel) => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-l-red-500',
          icon: '🔴',
          text: 'text-red-400',
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          border: 'border-l-warning',
          icon: '🟡',
          text: 'text-warning',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-l-blue-500',
          icon: '🔵',
          text: 'text-blue-400',
        };
    }
  };

  // 渲染告警项
  const renderAlert = (alert: Alert) => {
    const style = getAlertStyle(alert.level);
    const isExpanded = expandedId === alert.id;

    return (
      <div
        key={alert.id}
        className={`${style.bg} border-l-2 ${style.border} rounded-r-lg p-3 cursor-pointer transition-all hover:brightness-110`}
        onClick={() => setExpandedId(isExpanded ? null : alert.id)}
      >
        <div className="flex items-start gap-2">
          <span className="text-sm">{style.icon}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${style.text}`}>{alert.title}</p>
            <p className={`text-xs text-text-tertiary mt-0.5 ${isExpanded ? '' : 'line-clamp-1'}`}>
              {alert.description}
            </p>
          </div>
        </div>
        
        {/* 操作按钮 */}
        {isExpanded && alert.actionLabel && (
          <div className="mt-2 pl-6">
            <button
              className="text-xs text-primary hover:text-primary-hover transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.(alert.actionView || 'dashboard', alert.actionData);
              }}
            >
              {alert.actionLabel} →
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card p-4 h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          🔔 告警中心
          {hasAlerts && (
            <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
              {alerts.length}
            </span>
          )}
        </h3>
        
        {/* 告警统计 */}
        {hasAlerts && (
          <div className="flex items-center gap-2 text-xs">
            {criticalCount > 0 && (
              <span className="text-red-400">🔴 {criticalCount}</span>
            )}
            {warningCount > 0 && (
              <span className="text-warning">🟡 {warningCount}</span>
            )}
            {infoCount > 0 && (
              <span className="text-blue-400">🔵 {infoCount}</span>
            )}
          </div>
        )}
      </div>

      {/* 告警列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {hasAlerts ? (
          alerts.slice(0, maxAlerts).map(renderAlert)
        ) : (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            <div className="text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm">一切正常</p>
              <p className="text-xs">当前无需关注的问题</p>
            </div>
          </div>
        )}
      </div>

      {/* 更多告警提示 */}
      {alerts.length > maxAlerts && (
        <div className="mt-2 pt-2 border-t border-border-primary">
          <p className="text-xs text-text-tertiary text-center">
            还有 {alerts.length - maxAlerts} 条告警
          </p>
        </div>
      )}
    </div>
  );
};

export default AlertCenter;