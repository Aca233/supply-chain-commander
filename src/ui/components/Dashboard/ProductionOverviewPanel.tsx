/**
 * 生产概览面板组件
 * 显示生产状态、效率统计和产能分布
 */

import React from 'react';
import { ProductionStats } from './hooks/useDashboardData';
import { GoodsIcon } from '@/ui/components/Icons';

interface ProductionOverviewPanelProps {
  stats: ProductionStats;
  onNavigate?: (view: string) => void;
  onGoodsClick?: (goodsId: number) => void;
}

export const ProductionOverviewPanel: React.FC<ProductionOverviewPanelProps> = ({ stats, onNavigate, onGoodsClick }) => {
  // 获取效率样式
  const getEfficiencyStyle = (rate: number) => {
    if (rate >= 0.9) return { color: 'text-chart-up', label: '优秀', icon: '🟢' };
    if (rate >= 0.7) return { color: 'text-warning', label: '良好', icon: '🟡' };
    if (rate >= 0.5) return { color: 'text-orange-400', label: '一般', icon: '🟠' };
    return { color: 'text-chart-down', label: '低效', icon: '🔴' };
  };

  const efficiencyStyle = getEfficiencyStyle(stats.capacityUtilization);

  const formatOutput = (value: number): string => {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(1);
  };

  return (
    <div className="card p-4 h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          🏭 生产概览
        </h3>
        <button
          onClick={() => onNavigate?.('production')}
          className="text-xs text-primary hover:text-primary-hover transition-colors"
        >
          查看详情 →
        </button>
      </div>

      {/* 状态概览 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* 产能利用率 */}
        <div className="bg-background-secondary rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-tertiary">产能利用率</span>
            <span className={`text-xs ${efficiencyStyle.color}`}>
              {efficiencyStyle.icon} {efficiencyStyle.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-semibold tabular-nums ${efficiencyStyle.color}`}>
              {(stats.capacityUtilization * 100).toFixed(1)}
            </span>
            <span className="text-sm text-text-tertiary">%</span>
          </div>
          {/* 效率条 */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-background-tertiary">
            <div
              className={`h-full transition-all ${
                stats.capacityUtilization >= 0.9 ? 'bg-chart-up' :
                stats.capacityUtilization >= 0.7 ? 'bg-warning' :
                stats.capacityUtilization >= 0.5 ? 'bg-orange-400' : 'bg-chart-down'
              }`}
              style={{ width: `${Math.min(stats.capacityUtilization * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* 总产出 */}
        <div className="bg-background-secondary rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-tertiary">总产出/tick</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums text-text-primary">
              {formatOutput(stats.totalOutput)}
            </span>
            <span className="text-sm text-text-tertiary">单位</span>
          </div>
        </div>
      </div>

      {/* Top产出商品 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <p className="text-xs text-text-tertiary mb-2">主要产出</p>
        {stats.topProducers.length > 0 ? (
          <div className="space-y-2 flex-1 overflow-hidden">
            {stats.topProducers.map((item, index) => (
              <div
                key={item.goodsId}
                className="flex items-center gap-2 py-1 px-1 -mx-1 rounded hover:bg-background-secondary cursor-pointer transition-colors"
                onClick={() => onGoodsClick?.(item.goodsId)}
              >
                <span className="text-xs text-text-tertiary w-4">{index + 1}</span>
                <GoodsIcon goodsId={item.goodsId} size={16} autoColor />
                <span className="text-xs text-text-secondary flex-1 truncate">
                  {item.name}
                </span>
                <span className="text-xs text-text-primary tabular-nums">
                  {formatOutput(item.output)}/tick
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 text-text-tertiary">
            <div className="text-center">
              <p className="text-2xl mb-2">🏗️</p>
              <p className="text-sm">暂无产出数据</p>
            </div>
          </div>
        )}
      </div>

      {/* 问题建筑 */}
      {stats.problemBuildings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-primary">
          <p className="text-xs text-warning mb-2 flex items-center gap-1">
            ⚠️ 需要关注 ({stats.problemBuildings.length})
          </p>
          <div className="space-y-1">
            {stats.problemBuildings.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center gap-2 text-xs">
                <span className="text-text-secondary truncate flex-1">{b.name}</span>
                <span className="text-warning">{b.issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionOverviewPanel;