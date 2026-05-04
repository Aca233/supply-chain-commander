/**
 * 建筑卡片 - 网格摘要视图（视觉重做）
 *
 * 设计要点：
 * - 日利润作为视觉焦点，独立底色区域 + 大号数字
 * - 输入状态用微型彩色圆点代替文字百分比
 * - 效率用渐变发光进度条
 * - 左边框 3px 状态指示 + 同色微光晕
 * - 输出区用图标+数量的紧凑布局
 */

import React from 'react';
import { useBuildingData } from '@/ui/hooks/useBuildingData';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { formatMoneyCompact } from '@/ui/utils/format';
import { Badge } from '@/ui/design-system';
import { getMethodIconForBuilding } from './methodIconMap';
import { STATUS_STYLES, profitColorClass, inputPercentColor } from './buildingCardConfig';

interface BuildingCardGridProps {
  buildingIndex: number;
  isSelected?: boolean;
  onClick?: () => void;
}

/** 输入充足率 → 小圆点颜色 */
function inputDotColor(pct: number): string {
  if (pct >= 0.8) return 'bg-[var(--success)]';
  if (pct >= 0.5) return 'bg-[var(--warning)]';
  return 'bg-[var(--error)]';
}

/** 效率 → 渐变方向颜色 */
function effGradient(pct: number): string {
  if (pct >= 80) return 'from-emerald-500 to-green-400';
  if (pct >= 50) return 'from-amber-500 to-yellow-400';
  return 'from-red-500 to-rose-400';
}

/** 效率 → 发光色 */
function effGlow(pct: number): string {
  if (pct >= 80) return '0 0 8px rgba(34,197,94,0.5)';
  if (pct >= 50) return '0 0 8px rgba(245,158,11,0.5)';
  return '0 0 8px rgba(239,68,68,0.5)';
}

export const BuildingCardGrid: React.FC<BuildingCardGridProps> = ({
  buildingIndex,
  isSelected = false,
  onClick,
}) => {
  const data = useBuildingData(buildingIndex);
  if (!data) return null;

  const st = STATUS_STYLES[data.status];
  const eff = Math.round(data.efficiency * 100);
  const methodIcons = getMethodIconForBuilding(buildingIndex);

  // 状态发光 shadow
  const statusGlow: Record<string, string> = {
    success: '0 0 16px rgba(34,197,94,0.15)',
    warning: '0 0 16px rgba(245,158,11,0.15)',
    error:   '0 0 16px rgba(239,68,68,0.15)',
    none:    'none',
  };
  const glowShadow = statusGlow[st.cardStatus] || 'none';

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer
        border-l-[3px] ${st.borderColor}
        bg-gradient-to-br from-white/[0.07] to-white/[0.02]
        backdrop-blur-[16px] saturate-[180%]
        border border-white/[0.10]
        transition-all duration-200 ease-out
        hover:from-white/[0.11] hover:to-white/[0.04]
        hover:border-white/[0.18]
        hover:-translate-y-0.5
        active:scale-[0.99] active:translate-y-0
        ${isSelected
          ? 'ring-2 ring-[var(--accent)]/50 ring-offset-1 ring-offset-[var(--bg-base)] shadow-[0_0_24px_rgba(59,130,246,0.25)]'
          : ''}
      `}
      style={{ boxShadow: isSelected ? undefined : `${glowShadow}, 0 6px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)` }}
    >
      {/* ======== 头部：图标 + 名称 + 等级 + 状态 ======== */}
      <div className="px-3.5 pt-3.5 pb-2 flex items-center gap-2.5">
        {/* 图标容器 — 柔和渐变背景 */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.10] to-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <BuildingIcon buildingId={data.typeId} size={22} autoColor />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
              {data.name}
            </span>
            <span className="text-[9px] px-1.5 py-[1px] rounded-md bg-white/[0.06] text-white/50 border border-white/[0.08] font-medium tabular-nums">
              Lv.{data.level}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant={st.badge} size="xs" dot>{st.label}</Badge>
            <span className="text-[10px] text-[var(--text-muted)] truncate">{data.productionName}</span>
          </div>
        </div>
      </div>

      {/* ======== 效率条 — 渐变发光 ======== */}
      <div className="px-3.5 pb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">效率</span>
          <span className="text-[10px] text-white/50 tabular-nums font-medium">{eff}%</span>
        </div>
        <div className="h-[5px] w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${effGradient(eff)} transition-all duration-500 ease-out`}
            style={{ width: `${eff}%`, boxShadow: effGlow(eff) }}
          />
        </div>
      </div>

      {/* ======== 输入 / 输出 — 视觉差异化 ======== */}
      <div className="border-t border-white/[0.06] bg-black/[0.15]">
        <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
          {/* 输入 — 圆点矩阵 */}
          <div className="px-3.5 py-2.5">
            <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5 font-medium">输入</div>
            {data.isRetail ? (
              <span className="text-[10px] text-[var(--warning)]">🏪 零售</span>
            ) : data.inputs.length === 0 ? (
              <span className="text-[10px] text-[var(--success)]/70">无需原料</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.inputs.map(inp => (
                  <div
                    key={inp.goodsId}
                    className="flex items-center gap-1 group/inp"
                    title={`${inp.name}: ${Math.round(inp.percentage * 100)}%`}
                  >
                    <span className={`w-2 h-2 rounded-full ${inputDotColor(inp.percentage)} shadow-[0_0_4px_currentColor]`} />
                    <span className={`text-[10px] font-medium ${inputPercentColor(inp.percentage)}`}>
                      {inp.name.slice(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 输出 — 图标 + 产量 */}
          <div className="px-3.5 py-2.5">
            <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5 font-medium">产出</div>
            {data.outputs.length === 0 ? (
              <span className="text-[10px] text-white/20">—</span>
            ) : (
              <div className="space-y-1">
                {data.outputs.slice(0, 2).map(out => (
                  <div key={out.goodsId} className="flex items-center gap-1.5">
                    <GoodsIcon goodsId={out.goodsId} size={13} />
                    <span className="text-[10px] text-white/50 truncate flex-1">{out.name}</span>
                    <span className="text-[10px] text-[var(--success)] tabular-nums font-semibold">
                      +{out.dailyAmount.toFixed(0)}
                    </span>
                  </div>
                ))}
                {data.outputs.length > 2 && (
                  <span className="text-[9px] text-white/20">+{data.outputs.length - 2} 种</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======== 底栏：利润焦点区 + 方式图标 ======== */}
      <div className="px-3.5 py-2.5 border-t border-white/[0.06] bg-gradient-to-r from-black/25 to-black/15 flex items-center justify-between">
        {/* 生产方式图标 */}
        <div className="flex items-center gap-0.5">
          {methodIcons.length > 0 ? (
            methodIcons.map((icon, i) => (
              <span
                key={i}
                className="w-[22px] h-[22px] rounded-md bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-[11px] hover:bg-white/[0.12] transition-colors"
              >
                {icon}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-white/15">—</span>
          )}
        </div>

        {/* 日利润 — 视觉焦点 */}
        <div className={`
          text-right px-2.5 py-1 rounded-lg
          ${data.dailyProfit >= 0
            ? 'bg-[var(--success)]/[0.08] border border-[var(--success)]/[0.15]'
            : 'bg-[var(--error)]/[0.08] border border-[var(--error)]/[0.15]'}
        `}>
          <span className={`text-[15px] font-bold tabular-nums leading-none ${profitColorClass(data.dailyProfit)}`}>
            {formatMoneyCompact(data.dailyProfit)}
          </span>
          <span className="text-[9px] text-white/30 ml-0.5">/日</span>
        </div>
      </div>
    </div>
  );
};

export default BuildingCardGrid;
