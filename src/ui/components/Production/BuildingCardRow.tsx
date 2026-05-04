/**
 * 建筑卡片 - 表格行视图（视觉重做）
 *
 * 设计要点：
 * - ~44px 高紧凑行，但不再是纯文字
 * - 左侧 3px 状态色条
 * - 效率用微型渐变条替代纯白条
 * - hover 时行背景渐变 + 微上浮
 * - 选中时发光边框 + 轻柔光晕
 * - 利润数字右对齐，背景色块强调
 */

import React from 'react';
import { useBuildingData } from '@/ui/hooks/useBuildingData';
import { BuildingIcon } from '@/ui/components/Icons';
import { formatMoneyCompact } from '@/ui/utils/format';
import { STATUS_STYLES, profitColorClass } from './buildingCardConfig';

interface BuildingCardRowProps {
  buildingIndex: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export const BuildingCardRow: React.FC<BuildingCardRowProps> = ({
  buildingIndex,
  isSelected = false,
  onClick,
}) => {
  const data = useBuildingData(buildingIndex);
  if (!data) return null;

  const st = STATUS_STYLES[data.status];
  const eff = Math.round(data.efficiency * 100);

  // 效率颜色
  const effBarColor = eff >= 80
    ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
    : eff >= 50
      ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
      : 'linear-gradient(90deg, #EF4444, #F87171)';
  const effGlow = eff >= 80
    ? '0 0 6px rgba(34,197,94,0.4)'
    : eff >= 50
      ? '0 0 6px rgba(245,158,11,0.4)'
      : '0 0 6px rgba(239,68,68,0.4)';

  // 最差输入
  const worstInput = data.inputs.length > 0
    ? data.inputs.reduce((min, i) => (i.percentage < min.percentage ? i : min))
    : null;
  const missingCount = data.inputs.filter(i => i.percentage < 1).length;

  // 主产出
  const mainOutput = data.outputs[0];

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 rounded-lg text-left
        transition-all duration-200 ease-out group
        border-l-[3px] ${st.borderColor}
        ${isSelected
          ? 'bg-gradient-to-r from-[var(--accent)]/[0.12] to-[var(--accent)]/[0.04] border border-[var(--accent)]/30 shadow-[0_0_16px_rgba(59,130,246,0.15)]'
          : 'bg-white/[0.02] hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.02] border border-transparent hover:border-white/[0.06]'}
        hover:-translate-y-[1px]
        active:translate-y-0
        px-3 py-2
      `}
    >
      {/* 建筑图标 + 名称 + 等级 */}
      <div className="flex items-center gap-2 w-[140px] flex-shrink-0 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.05] flex items-center justify-center flex-shrink-0">
          <BuildingIcon buildingId={data.typeId} size={15} autoColor />
        </div>
        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
          {data.name}
        </span>
        <span className="text-[8px] px-1 py-[1px] rounded bg-white/[0.06] text-white/40 font-medium tabular-nums border border-white/[0.04]">
          {data.level}
        </span>
      </div>

      {/* 状态 */}
      <div className="flex items-center gap-1.5 w-[52px] flex-shrink-0">
        <span className={`w-[6px] h-[6px] rounded-full ${st.dotColor} shadow-[0_0_4px_currentColor]`} />
        <span className="text-[10px] text-white/40 font-medium">{st.label}</span>
      </div>

      {/* 效率条 — 渐变微型条 */}
      <div className="flex items-center gap-1.5 w-[80px] flex-shrink-0">
        <div className="flex-1 h-[4px] bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${eff}%`, background: effBarColor, boxShadow: effGlow }}
          />
        </div>
        <span className="text-[10px] text-white/35 tabular-nums w-6 text-right font-medium">
          {eff}%
        </span>
      </div>

      {/* 输入状态 — 圆点指示 */}
      <div className="w-[60px] flex-shrink-0 text-[10px] font-medium">
        {data.inputs.length === 0 ? (
          <span className="text-white/20">—</span>
        ) : worstInput && worstInput.percentage < 1 ? (
          <span className={worstInput.percentage < 0.5 ? 'text-[var(--error)]' : 'text-[var(--warning)]'}>
            ⚠ 缺{missingCount}种
          </span>
        ) : (
          <span className="text-[var(--success)]/70">✓ 充足</span>
        )}
      </div>

      {/* 产出 */}
      <div className="flex-1 min-w-0 text-[10px] truncate">
        {mainOutput ? (
          <span className="text-white/50">
            {mainOutput.name}
            <span className="text-[var(--success)] font-semibold ml-1">+{mainOutput.dailyAmount.toFixed(0)}/日</span>
          </span>
        ) : data.isRetail ? (
          <span className="text-[var(--warning)]/70">零售</span>
        ) : (
          <span className="text-white/15">—</span>
        )}
      </div>

      {/* 日利润 — 背景色块强调 */}
      <div className={`
        w-[76px] flex-shrink-0 text-right
        px-2 py-0.5 rounded-md
        ${data.dailyProfit >= 0
          ? 'bg-[var(--success)]/[0.06]'
          : 'bg-[var(--error)]/[0.06]'}
      `}>
        <span className={`text-xs font-bold tabular-nums ${profitColorClass(data.dailyProfit)}`}>
          {formatMoneyCompact(data.dailyProfit)}
        </span>
      </div>
    </button>
  );
};

export default BuildingCardRow;
