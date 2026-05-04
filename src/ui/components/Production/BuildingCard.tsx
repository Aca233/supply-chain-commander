/**
 * 建筑卡片组件（视觉重做）
 * compact 模式和 standard 模式
 *
 * 设计要点：
 * - 渐变发光效率条
 * - 输入用彩色圆点而非文字百分比
 * - 利润数字用背景色块强调
 * - 状态发光边框
 * - 图标容器用柔和渐变 + inset 高光
 */

import React, { useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { CompactResourceBar } from './ResourceBar';
import { ProductionMethodsPanel } from './ProductionMethodsPanel';
import { BuildingProductionControlInline } from './BuildingProductionControlInline';
import { useBuildingData } from '@/ui/hooks/useBuildingData';
import { formatMoneyCompact } from '@/ui/utils/format';
import { STATUS_STYLES, profitColorClass } from './buildingCardConfig';
import { Badge, Button } from '@/ui/design-system';

interface BuildingCardProps {
  buildingIndex: number;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

/** 效率 → 渐变 */
function effGradient(pct: number): string {
  if (pct >= 80) return 'from-emerald-500 to-green-400';
  if (pct >= 50) return 'from-amber-500 to-yellow-400';
  return 'from-red-500 to-rose-400';
}

function effGlow(pct: number): string {
  if (pct >= 80) return '0 0 8px rgba(34,197,94,0.5)';
  if (pct >= 50) return '0 0 8px rgba(245,158,11,0.5)';
  return '0 0 8px rgba(239,68,68,0.5)';
}

export const BuildingCard: React.FC<BuildingCardProps> = ({
  buildingIndex,
  isSelected = false,
  onClick,
  compact = false,
}) => {
  const { upgradeBuilding } = useGameStore();
  const data = useBuildingData(buildingIndex);

  const handleUpgrade = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      upgradeBuilding(buildingIndex);
    },
    [buildingIndex, upgradeBuilding],
  );

  if (!data) return null;

  const st = STATUS_STYLES[data.status];
  const eff = Math.round(data.efficiency * 100);

  // 状态发光
  const statusGlow: Record<string, string> = {
    success: '0 0 16px rgba(34,197,94,0.12)',
    warning: '0 0 16px rgba(245,158,11,0.12)',
    error:   '0 0 16px rgba(239,68,68,0.12)',
    none:    'none',
  };

  const cardShadow = `${statusGlow[st.cardStatus] || 'none'}, 0 6px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.10)`;

  // ──── 紧凑模式 ────
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`
          rounded-2xl cursor-pointer overflow-hidden
          border-l-[3px] ${st.borderColor}
          bg-gradient-to-br from-white/[0.07] to-white/[0.02]
          backdrop-blur-[16px] saturate-[180%]
          border border-white/[0.10]
          transition-all duration-200
          hover:from-white/[0.11] hover:to-white/[0.04]
          hover:border-white/[0.18] hover:-translate-y-0.5
          active:scale-[0.99]
          p-3.5 flex flex-col gap-3
          ${isSelected ? 'ring-2 ring-[var(--accent)]/50 ring-offset-1 ring-offset-[var(--bg-base)]' : ''}
        `}
        style={{ boxShadow: cardShadow }}
      >
        <div className="flex items-center gap-3">
          {/* 图标 */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.10] to-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <BuildingIcon buildingId={data.typeId} size={24} autoColor />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate text-[var(--text-primary)]">{data.name}</span>
              <Badge variant="outline" size="xs">Lv.{data.level}</Badge>
              <Badge variant={st.badge} size="xs" dot>{st.label}</Badge>
            </div>
            <div className="text-[10px] text-white/35 truncate mt-0.5">{data.productionName}</div>
          </div>

          {/* 利润 — 背景色块 */}
          <div className={`
            text-right flex-shrink-0 px-2.5 py-1 rounded-lg
            ${data.dailyProfit >= 0
              ? 'bg-[var(--success)]/[0.08] border border-[var(--success)]/[0.12]'
              : 'bg-[var(--error)]/[0.08] border border-[var(--error)]/[0.12]'}
          `}>
            <div className={`text-sm font-bold tabular-nums ${profitColorClass(data.dailyProfit)}`}>
              {formatMoneyCompact(data.dailyProfit)}
            </div>
            <div className="text-[9px] text-white/25">效率 {eff}%</div>
          </div>
        </div>

        <BuildingProductionControlInline buildingId={buildingIndex} compact />
      </div>
    );
  }

  // ──── 标准模式 ────
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl cursor-pointer overflow-hidden
        border-l-[3px] ${st.borderColor}
        bg-gradient-to-br from-white/[0.07] to-white/[0.02]
        backdrop-blur-[16px] saturate-[180%]
        border border-white/[0.10]
        transition-all duration-200
        hover:from-white/[0.11] hover:to-white/[0.04]
        hover:border-white/[0.18] hover:-translate-y-0.5
        active:scale-[0.99]
        ${isSelected ? 'ring-2 ring-[var(--accent)]/50 ring-offset-1 ring-offset-[var(--bg-base)]' : ''}
      `}
      style={{ boxShadow: cardShadow }}
    >
      {/* 头部 */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/[0.10] to-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <BuildingIcon buildingId={data.typeId} size={28} autoColor />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm truncate text-[var(--text-primary)]">{data.name}</span>
              <span className="text-[9px] px-1.5 py-[1px] rounded-md bg-white/[0.06] text-white/50 border border-white/[0.08] font-medium tabular-nums">
                Lv.{data.level}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={st.badge} size="xs" dot>{st.label}</Badge>
              <span className="text-[10px] text-white/35 truncate">{data.productionName}</span>
            </div>
          </div>
        </div>

        {/* 效率 — 渐变发光 */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-medium">效率</span>
            <span className="text-[10px] text-white/45 tabular-nums font-medium">{eff}%</span>
          </div>
          <div className="h-[5px] w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${effGradient(eff)} transition-all duration-500`}
              style={{ width: `${eff}%`, boxShadow: effGlow(eff) }}
            />
          </div>
        </div>
      </div>

      {/* 输入 / 输出 */}
      {!data.isRetail && (
        <div className="px-4 py-3 border-t border-white/[0.06] bg-black/[0.15]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[9px] text-white/25 uppercase tracking-wider mb-2 font-medium">📥 输入</div>
              <div className="space-y-1.5">
                {data.inputs.length === 0 ? (
                  <span className="text-[10px] text-[var(--success)]/60">无需原料</span>
                ) : (
                  data.inputs.slice(0, 3).map(inp => (
                    <CompactResourceBar
                      key={inp.goodsId}
                      value={inp.percentage}
                      label={inp.name.slice(0, 4)}
                    />
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-white/25 uppercase tracking-wider mb-2 font-medium">📤 产出</div>
              <div className="space-y-1">
                {data.outputs.slice(0, 3).map(out => (
                  <div key={out.goodsId} className="flex items-center gap-1.5">
                    <GoodsIcon goodsId={out.goodsId} size={12} />
                    <span className="text-[10px] text-[var(--success)] tabular-nums font-semibold">
                      +{out.dailyAmount.toFixed(0)}/日
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 产量控制 */}
      <div className="px-4 py-3 border-t border-white/[0.06] bg-black/[0.08]">
        <BuildingProductionControlInline buildingId={buildingIndex} />
      </div>

      {/* 生产方式 */}
      <div className="px-4 py-2 border-t border-white/[0.06]">
        <ProductionMethodsPanel
          buildingId={buildingIndex}
          buildingTypeId={data.typeId}
          buildingLevel={data.level}
        />
      </div>

      {/* 底栏 — 利润焦点 */}
      <div className="px-4 py-3 border-t border-white/[0.06] bg-gradient-to-r from-black/25 to-black/15 flex items-center justify-between">
        {/* 利润 — 背景色块 */}
        <div className={`
          px-2.5 py-1 rounded-lg
          ${data.dailyProfit >= 0
            ? 'bg-[var(--success)]/[0.08] border border-[var(--success)]/[0.12]'
            : 'bg-[var(--error)]/[0.08] border border-[var(--error)]/[0.12]'}
        `}>
          <span className={`text-[15px] font-bold tabular-nums ${profitColorClass(data.dailyProfit)}`}>
            {formatMoneyCompact(data.dailyProfit)}
          </span>
          <span className="text-[9px] text-white/25 ml-0.5">/日</span>
        </div>

        <Button
          size="xs"
          variant={data.canUpgrade ? 'primary' : 'glass'}
          disabled={!data.canUpgrade}
          onClick={handleUpgrade}
        >
          {data.level >= data.maxLevel
            ? '满级'
            : `升级 ${formatMoneyCompact(data.upgradeCost)}`}
        </Button>
      </div>
    </div>
  );
};

export default BuildingCard;
