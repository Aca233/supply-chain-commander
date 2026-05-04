/**
 * 生产管理工具栏（视觉重做）
 *
 * 设计要点：
 * - 工具栏整体带渐变底色 + 底部微光线
 * - 统计指标用独立发光小卡片（非简单文字拼接）
 * - 视图切换用圆角分段控制器 + 选中态发光
 * - 建造/队列按钮有图标 + 微交互
 */

import React from 'react';
import { useGameStore } from '@/stores/gameStore';
import { formatMoneyCompact } from '@/ui/utils/format';
import { Button, Tabs, TabsList, TabsTrigger } from '@/ui/design-system';
import { ProductionStats } from './useProductionStats';

export type ViewMode = 'grid' | 'table';

interface ProductionToolbarProps {
  stats: ProductionStats;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenCatalog: () => void;
  onOpenQueue: () => void;
  queueCount: number;
}

export const ProductionToolbar: React.FC<ProductionToolbarProps> = ({
  stats,
  viewMode,
  onViewModeChange,
  onOpenCatalog,
  onOpenQueue,
  queueCount,
}) => {
  const { playerCash } = useGameStore();

  return (
    <div className="
      px-4 py-3 lg:px-6
      bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-base)]
      border-b border-white/[0.06]
      shadow-[0_1px_0_rgba(255,255,255,0.03)]
      space-y-3
    ">
      {/* ═══ 第一行：标题 + 建筑数 + 操作按钮 ═══ */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
            🏭 生产管理
          </h2>
          {/* 建筑计数 — 小圆角色块 */}
          <span className="
            text-[11px] px-2 py-0.5 rounded-md tabular-nums font-medium
            bg-white/[0.06] text-white/50 border border-white/[0.06]
          ">
            {stats.activeBuildings}/{stats.totalBuildings} 运行中
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onOpenCatalog} className="gap-1">
            <span className="text-[13px]">＋</span>
            建造
          </Button>
          <button
            onClick={onOpenQueue}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200
              ${queueCount > 0
                ? 'bg-[var(--accent)]/[0.10] text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/[0.18]'
                : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'}
            `}
          >
            🏗️ 队列
            {queueCount > 0 && (
              <span className="
                min-w-[18px] h-[18px] flex items-center justify-center
                rounded-full bg-[var(--accent)] text-white text-[10px] font-bold
                shadow-[0_0_8px_rgba(59,130,246,0.4)]
              ">
                {queueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══ 第二行：统计卡片 + 视图切换 ═══ */}
      <div className="flex items-center justify-between gap-3">
        {/* 统计指标行 */}
        <div className="flex items-center gap-2 flex-wrap">
          <MetricChip
            icon="⚡"
            label="日产值"
            value={formatMoneyCompact(stats.periodOutput)}
            color="default"
          />
          <MetricChip
            icon="⚠️"
            label="瓶颈"
            value={stats.bottleneckCount.toString()}
            color={stats.bottleneckCount > 0 ? 'warning' : 'default'}
          />
          <MetricChip
            icon="💰"
            label="日利润"
            value={formatMoneyCompact(stats.periodProfit)}
            color={stats.periodProfit >= 0 ? 'success' : 'error'}
          />
          <MetricChip
            icon="📈"
            label="平均效率"
            value={`${(stats.avgEfficiency * 100).toFixed(0)}%`}
            color={stats.avgEfficiency >= 0.8 ? 'success' : stats.avgEfficiency >= 0.5 ? 'warning' : 'error'}
          />
        </div>

        {/* 视图切换 */}
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <TabsList variant="default" size="sm">
            <TabsTrigger value="grid">▦ 网格</TabsTrigger>
            <TabsTrigger value="table">☰ 列表</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════
// 统计指标小卡片 — 独立发光
// ══════════════════════════════════════════

interface MetricChipProps {
  icon: string;
  label: string;
  value: string;
  color: 'default' | 'success' | 'warning' | 'error';
}

const CHIP_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  default: {
    text:   'text-white/60',
    bg:     'bg-white/[0.03]',
    border: 'border-white/[0.05]',
    glow:   'none',
  },
  success: {
    text:   'text-[var(--success)]',
    bg:     'bg-[var(--success)]/[0.06]',
    border: 'border-[var(--success)]/[0.12]',
    glow:   '0 0 10px rgba(34,197,94,0.08)',
  },
  warning: {
    text:   'text-[var(--warning)]',
    bg:     'bg-[var(--warning)]/[0.06]',
    border: 'border-[var(--warning)]/[0.12]',
    glow:   '0 0 10px rgba(245,158,11,0.08)',
  },
  error: {
    text:   'text-[var(--error)]',
    bg:     'bg-[var(--error)]/[0.06]',
    border: 'border-[var(--error)]/[0.12]',
    glow:   '0 0 10px rgba(239,68,68,0.08)',
  },
};

const MetricChip: React.FC<MetricChipProps> = ({ icon, label, value, color }) => {
  const c = CHIP_COLORS[color] || CHIP_COLORS.default;

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
        ${c.bg} border ${c.border}
        transition-all duration-200
      `}
      style={{ boxShadow: c.glow }}
    >
      <span className="text-[11px]">{icon}</span>
      <span className="text-[10px] text-white/30 font-medium">{label}</span>
      <span className={`text-[11px] font-bold tabular-nums ${c.text}`}>{value}</span>
    </div>
  );
};

export default ProductionToolbar;
