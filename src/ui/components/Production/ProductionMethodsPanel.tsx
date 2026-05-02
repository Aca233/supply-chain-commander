import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { GoodsIcon } from '@/ui/components/Icons';
import {
  getSlotAvailableMethods,
  getBuildingConfig,
  getMethodById,
  getRecipeForBuilding,
  type BuildingSlotType,
  type BuildingProductionMethod,
} from '@/core/production/ProductionMethods';
import { getTotalWorkforceDemand } from '@/core/labor/LaborSystem';

interface ProductionMethodsPanelProps {
  buildingId: number;
  buildingTypeId: number;
  buildingLevel: number;
}

const GLASS_SLOT_COLORS: { bg: string; border: string; active: string; glow: string }[] = [
  { bg: 'bg-blue-500/20', border: 'border-blue-400/30', active: 'border-blue-400/60', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.4)]' },
  { bg: 'bg-purple-500/20', border: 'border-purple-400/30', active: 'border-purple-400/60', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.4)]' },
  { bg: 'bg-amber-500/20', border: 'border-amber-400/30', active: 'border-amber-400/60', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' },
  { bg: 'bg-green-500/20', border: 'border-green-400/30', active: 'border-green-400/60', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.4)]' },
  { bg: 'bg-cyan-500/20', border: 'border-cyan-400/30', active: 'border-cyan-400/60', glow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]' },
  { bg: 'bg-rose-500/20', border: 'border-rose-400/30', active: 'border-rose-400/60', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.4)]' },
  { bg: 'bg-indigo-500/20', border: 'border-indigo-400/30', active: 'border-indigo-400/60', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.4)]' },
  { bg: 'bg-teal-500/20', border: 'border-teal-400/30', active: 'border-teal-400/60', glow: 'shadow-[0_0_12px_rgba(20,184,166,0.4)]' },
];

type GoodsMethodEffect = {
  value: string;
  isPositive: boolean;
  goodsId: number;
  goodsName: string;
};

type MetaMethodEffect = {
  icon: string;
  label: string;
  value: string;
  isPositive: boolean;
};

type MethodEffectGroups = {
  inputs: GoodsMethodEffect[];
  outputs: GoodsMethodEffect[];
  meta: MetaMethodEffect[];
};

const GOODS_NAME_BY_ID = new Map(ALL_GOODS.map((goods) => [goods.id, goods.name]));

export const ProductionMethodsPanel: React.FC<ProductionMethodsPanelProps> = ({
  buildingId,
  buildingTypeId,
  buildingLevel,
}) => {
  const {
    getBuildingCurrentMethods,
    changeBuildingSlotMethod,
    tick,
  } = useGameStore();

  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const buildingConfig = useMemo(
    () => getBuildingConfig(buildingTypeId),
    [buildingTypeId],
  );

  // 当前生产方式（依赖 tick 触发刷新）；过滤无效 ID（< 10000）
  const currentMethods = useMemo(() => {
    const stored = getBuildingCurrentMethods(buildingId);
    if (!buildingConfig) return stored;
    const slots = buildingConfig.slots;
    const defaults = (buildingConfig.defaultMethods || {}) as Record<string, number>;
    const defaultIds = Object.values(defaults) as number[];
    return slots.map((_: BuildingSlotType, index: number) => {
      const id = stored[index] || 0;
      if (id === 0) return 0;
      if (id >= 10000) return id;
      return defaultIds[index] || 0;
    });
  }, [buildingId, getBuildingCurrentMethods, tick, buildingConfig]);

  if (!buildingConfig || buildingConfig.slots.length === 0) {
    return null;
  }

  const finalRecipe = getRecipeForBuilding(buildingTypeId, currentMethods);

  const formatDelta = (value: number, invertSign = false) => {
    if (value === 0) return null;
    const displayed = invertSign ? -value : value;
    return displayed > 0 ? `+${displayed}` : `${displayed}`;
  };

  const getMethodEffects = (methodId: number): MethodEffectGroups => {
    const method = getMethodById(methodId) as BuildingProductionMethod | null;
    if (!method) {
      return { inputs: [], outputs: [], meta: [] };
    }

    const inputs: GoodsMethodEffect[] = [];
    const outputs: GoodsMethodEffect[] = [];
    const meta: MetaMethodEffect[] = [];

    for (const d of method.outputDelta) {
      const formatted = formatDelta(d.amount);
      if (formatted) {
        outputs.push({
          value: formatted,
          isPositive: d.amount > 0,
          goodsId: d.goodsId,
          goodsName: GOODS_NAME_BY_ID.get(d.goodsId) || `商品#${d.goodsId}`,
        });
      }
    }

    for (const d of method.inputDelta) {
      const formatted = formatDelta(d.amount, true);
      if (formatted) {
        inputs.push({
          value: formatted,
          isPositive: d.amount < 0,
          goodsId: d.goodsId,
          goodsName: GOODS_NAME_BY_ID.get(d.goodsId) || `商品#${d.goodsId}`,
        });
      }
    }

    const workforceDelta = getTotalWorkforceDemand(method.workforceDelta);
    if (workforceDelta !== 0) {
      const formatted = formatDelta(workforceDelta);
      if (formatted) {
        meta.push({ icon: '👷', label: '人力', value: formatted, isPositive: workforceDelta < 0 });
      }
    }

    if (method.energyDelta !== 0) {
      const formatted = formatDelta(method.energyDelta);
      if (formatted) {
        meta.push({ icon: '⚡', label: '能耗', value: formatted, isPositive: method.energyDelta < 0 });
      }
    }

    if (method.ticksRequired !== 1) {
      meta.push({ icon: '⏱', label: '周期', value: `${method.ticksRequired}`, isPositive: true });
    }

    return { inputs, outputs, meta };
  };

  const renderGoodsEntry = (effect: GoodsMethodEffect, key: React.Key, compact = false) => (
    <span
      key={key}
      className={`inline-flex items-center gap-1 ${compact ? 'text-[11px]' : 'text-xs'} ${
        effect.isPositive ? 'text-emerald-300' : 'text-rose-300'
      }`}
    >
      <GoodsIcon
        goodsId={effect.goodsId}
        size={compact ? 13 : 14}
        className={effect.isPositive ? 'drop-shadow-[0_0_4px_rgba(74,222,128,0.35)]' : 'drop-shadow-[0_0_4px_rgba(251,113,133,0.35)]'}
      />
      <span className={`${compact ? 'max-w-[72px]' : 'max-w-[88px]'} truncate text-[rgba(255,243,217,0.88)]`}>
        {effect.goodsName}
      </span>
      <span className="tabular-nums font-semibold">{effect.value.replace('+', '')}</span>
    </span>
  );

  const renderMethodRecipeBar = (
    method: BuildingProductionMethod,
    effects: MethodEffectGroups,
    options?: { compact?: boolean; showMethodName?: boolean; slotName?: string }
  ) => {
    const compact = options?.compact ?? false;
    const showMethodName = options?.showMethodName ?? true;
    const slotName = options?.slotName;
    const hasRecipe = effects.inputs.length > 0 || effects.outputs.length > 0;

    return (
      <div
        className={`rounded-xl border border-[#b89353]/60 bg-[linear-gradient(180deg,rgba(74,60,42,0.96),rgba(36,28,20,0.98))] shadow-[inset_0_1px_0_rgba(255,234,196,0.14),0_10px_20px_rgba(0,0,0,0.22)] ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
        }`}
      >
        <div className={`flex ${compact ? 'items-center gap-2' : 'items-start gap-3'} min-w-0`}>
          <div className={`flex items-center justify-center rounded-lg border border-[#c7a96f]/35 bg-[rgba(217,186,126,0.08)] text-[#e7cf9c] ${compact ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base'}`}>
            {getMethodIcon(method, { id: method.slotId, buildingTypeId, name: '', icon: '⚙️', description: '', order: 0 })}
          </div>

          <div className="min-w-0 flex-1">
            {showMethodName && (
              <div className={`flex min-w-0 items-center justify-between gap-2 ${compact ? 'mb-1' : 'mb-1.5'}`}>
                <div className="min-w-0">
                  <div className={`truncate font-medium text-[#f4e6c6] ${compact ? 'text-[12px]' : 'text-sm'}`}>
                    {slotName ? `${slotName} · ${method.name}` : method.name}
                  </div>
                  {!compact && method.description && (
                    <div className="truncate text-[10px] text-[rgba(245,229,196,0.46)]">
                      {method.description}
                    </div>
                  )}
                </div>
                {method.requiredLevel > 1 && (
                  <span className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">
                    Lv.{method.requiredLevel}+
                  </span>
                )}
              </div>
            )}

            <div className={`flex min-w-0 items-center ${compact ? 'gap-1.5' : 'gap-2'} flex-wrap`}>
              {effects.inputs.length === 0 ? (
                <span className="text-[10px] text-[rgba(255,234,196,0.55)]">无需原料</span>
              ) : (
                effects.inputs.map((effect, index) => renderGoodsEntry(effect, `input-${index}`, compact))
              )}

              {hasRecipe && (
                <span className={`text-sky-300/90 ${compact ? 'text-sm' : 'text-base'}`}>→</span>
              )}

              {effects.outputs.length > 0 && (
                effects.outputs.map((effect, index) => renderGoodsEntry(effect, `output-${index}`, compact))
              )}
            </div>

            {effects.meta.length > 0 && (
              <div className={`mt-1.5 flex items-center gap-2 flex-wrap text-[10px] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                {effects.meta.map((effect, index) => (
                  <span
                    key={`meta-${index}`}
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${
                      effect.isPositive
                        ? 'border-[#7b6a4d] bg-[rgba(255,240,205,0.06)] text-[rgba(242,227,198,0.8)]'
                        : 'border-rose-400/20 bg-rose-400/8 text-rose-200/85'
                    }`}
                  >
                    <span>{effect.icon}</span>
                    <span>{effect.label}</span>
                    <span className="tabular-nums">{effect.value.replace('+', '')}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const finalRecipeInputs = finalRecipe.inputs.map((entry) => ({
    goodsId: entry.goodsId,
    goodsName: GOODS_NAME_BY_ID.get(entry.goodsId) || `商品#${entry.goodsId}`,
    value: `${entry.amount}`,
    isPositive: false,
  }));

  const finalRecipeOutputs = finalRecipe.outputs.map((entry) => ({
    goodsId: entry.goodsId,
    goodsName: GOODS_NAME_BY_ID.get(entry.goodsId) || `商品#${entry.goodsId}`,
    value: `${entry.amount}`,
    isPositive: true,
  }));

  const finalRecipeMeta: MetaMethodEffect[] = [
    ...(getTotalWorkforceDemand(finalRecipe.workforceRequired) > 0 ? [{
      icon: '👷',
      label: '工资',
      value: `${getTotalWorkforceDemand(finalRecipe.workforceRequired)}`,
      isPositive: false,
    }] : []),
    ...(finalRecipe.energyRequired > 0 ? [{
      icon: '⚡',
      label: '能耗',
      value: `${finalRecipe.energyRequired}`,
      isPositive: false,
    }] : []),
    {
      icon: '⏱',
      label: '周期',
      value: `${finalRecipe.ticksRequired}`,
      isPositive: true,
    },
  ];

  const renderFinalRecipeBar = () => (
    <div className="rounded-xl border border-[#b89353]/65 bg-[linear-gradient(180deg,rgba(70,56,38,0.98),rgba(29,23,17,1))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,238,202,0.16),0_12px_28px_rgba(0,0,0,0.24)]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.08em] text-[#efdfba]">
          最终投入产出
        </span>
        <span className="text-[10px] text-[rgba(245,229,196,0.56)]">
          所有槽位共同生效
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2 flex-wrap">
        {finalRecipeInputs.length === 0 ? (
          <span className="text-[10px] text-[rgba(255,234,196,0.55)]">无需原料</span>
        ) : (
          finalRecipeInputs.map((effect, index) => renderGoodsEntry(effect, `final-input-${index}`))
        )}

        {(finalRecipeInputs.length > 0 || finalRecipeOutputs.length > 0) && (
          <span className="text-base text-sky-300/90">→</span>
        )}

        {finalRecipeOutputs.length > 0 ? (
          finalRecipeOutputs.map((effect, index) => renderGoodsEntry(effect, `final-output-${index}`))
        ) : (
          <span className="text-[10px] text-[rgba(255,234,196,0.55)]">无产出</span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[10px]">
        {finalRecipeMeta.map((effect, index) => (
          <span
            key={`final-meta-${index}`}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${
              effect.isPositive
                ? 'border-[#7b6a4d] bg-[rgba(255,240,205,0.06)] text-[rgba(242,227,198,0.8)]'
                : 'border-rose-400/20 bg-rose-400/8 text-rose-200/85'
            }`}
          >
            <span>{effect.icon}</span>
            <span>{effect.label}</span>
            <span className="tabular-nums">{effect.value}</span>
          </span>
        ))}
      </div>
    </div>
  );

  const getMethodIcon = (method: BuildingProductionMethod | undefined, slot: BuildingSlotType): string => {
    if (!method) return slot.icon || '⚙️';
    const name = method.name.toLowerCase();
    if (name.includes('手工') || name.includes('传统') || name.includes('人工')) return '✋';
    if (name.includes('机械') || name.includes('半自动')) return '🔧';
    if (name.includes('全自动') || name.includes('自动化')) return '🤖';
    if (name.includes('智能') || name.includes('ai') || name.includes('数字')) return '🧠';
    if (name.includes('煤') || name.includes('蒸汽')) return '🏭';
    if (name.includes('电') || name.includes('电力')) return '⚡';
    if (name.includes('太阳') || name.includes('光伏')) return '☀️';
    if (name.includes('核')) return '☢️';
    if (name.includes('标准') || name.includes('基础')) return '📊';
    if (name.includes('高端') || name.includes('精密') || name.includes('高级')) return '💎';
    if (name.includes('大师') || name.includes('匠人') || name.includes('专家')) return '👨‍🔧';
    if (name.includes('循环') || name.includes('回收')) return '♻️';
    if (name.includes('绿色') || name.includes('环保') || name.includes('清洁')) return '🌿';
    if (name.includes('过滤')) return '🌀';
    if (name.includes('露天') || name.includes('矿')) return '⛏️';
    if (name.includes('深井') || name.includes('钻探')) return '🕳️';
    if (name.includes('水力') || name.includes('液压')) return '💧';
    if (name.includes('连铸') || name.includes('冶炼')) return '🔥';
    if (name.includes('定向') || name.includes('爆破')) return '💥';
    return slot.icon || '⚙️';
  };

  const handleSlotClick = (slotIndex: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeSlot === slotIndex) {
      setActiveSlot(null);
      setDropdownPos(null);
    } else {
      setActiveSlot(slotIndex);
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = 350;
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;
      if (showAbove) {
        setDropdownPos({ top: rect.top - menuHeight - 4, left: rect.left });
      } else {
        setDropdownPos({ top: rect.bottom + 4, left: rect.left });
      }
    }
  };

  const handleMethodSelect = (slotIndex: number, methodId: number, event?: React.MouseEvent) => {
    event?.stopPropagation();
    changeBuildingSlotMethod(buildingId, slotIndex, methodId);
    setActiveSlot(null);
    setDropdownPos(null);
  };

  const renderDropdownMenu = () => {
    if (activeSlot === null || !dropdownPos || !buildingConfig) return null;
    const slot = buildingConfig.slots[activeSlot];
    if (!slot) return null;

    const currentMethodId = currentMethods[activeSlot] || 0;
    const availableMethods = getSlotAvailableMethods(buildingTypeId, slot.id);
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.min(350, viewportHeight - dropdownPos.top - 20);

    return createPortal(
      <div
        className="fixed z-[9999] min-w-[260px] overflow-y-auto
                   bg-gradient-to-br from-white/[0.12] to-white/[0.06]
                   backdrop-blur-xl border border-white/[0.15] rounded-xl
                   shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        style={{
          top: Math.max(10, dropdownPos.top),
          left: dropdownPos.left,
          maxHeight: `${maxHeight}px`,
        }}
      >
        <div className="p-2.5 border-b border-white/[0.1] sticky top-0 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">{slot.icon}</span>
            <div>
              <div className="text-sm font-medium text-white">{slot.name}</div>
              {slot.description && (
                <div className="text-xs text-white/50">{slot.description}</div>
              )}
            </div>
          </div>
        </div>
        <div className="p-1">
          <button
            className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all
                        ${currentMethodId === 0
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                          : 'hover:bg-white/[0.08] border border-transparent'}`}
            onClick={(e) => handleMethodSelect(activeSlot, 0, e)}
          >
            <span className="w-6 text-center">❌</span>
            <span className="text-white/50">未选择</span>
          </button>

          {availableMethods.map((method: BuildingProductionMethod) => {
            const isSelected = currentMethodId === method.id;
            const effects = getMethodEffects(method.id);
            const isLocked = method.requiredLevel > buildingLevel;

            return (
              <button
                key={method.id}
                disabled={isLocked}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all
                            ${isSelected
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                              : 'hover:bg-white/[0.08] border border-transparent'}
                            ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={(e) => !isLocked && handleMethodSelect(activeSlot, method.id, e)}
              >
                {renderMethodRecipeBar(method, effects)}
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 relative">
        <span className="text-xs text-white/40 mr-1 hidden sm:inline font-medium">
          专属方式
        </span>

        <div className="flex gap-1 flex-wrap">
          {buildingConfig.slots.map((slot: BuildingSlotType, slotIndex: number) => {
            const currentMethodId = currentMethods[slotIndex] || 0;
            const currentMethod = currentMethodId > 0
              ? (getMethodById(currentMethodId) as BuildingProductionMethod | undefined)
              : undefined;
            const colors = GLASS_SLOT_COLORS[slotIndex % GLASS_SLOT_COLORS.length];
            const isActive = activeSlot === slotIndex;
            const hasMethod = currentMethodId > 0 && currentMethod;

            return (
              <div key={slotIndex} className="relative">
                <button
                  ref={el => buttonRefs.current[slotIndex] = el}
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-lg
                    transition-all duration-200 hover:scale-105
                    backdrop-blur-sm border
                    ${isActive
                      ? `${colors.bg} ${colors.active} ${colors.glow} scale-105`
                      : `bg-white/[0.08] ${colors.border} hover:bg-white/[0.12]`}
                    ${!hasMethod ? 'opacity-50' : ''}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlotClick(slotIndex, e);
                  }}
                  onMouseEnter={() => setShowTooltip(slotIndex)}
                  onMouseLeave={() => setShowTooltip(null)}
                  title={`${slot.name}${currentMethod ? `: ${currentMethod.name}` : ''}`}
                >
                  {hasMethod ? getMethodIcon(currentMethod, slot) : (slot.icon || '⚙️')}
                </button>

                {showTooltip === slotIndex && !isActive && (
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap max-w-[200px]">
                    <div className="bg-gradient-to-br from-white/[0.15] to-white/[0.08] backdrop-blur-xl border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
                      <div className="font-medium flex items-center gap-1 text-white">
                        <span>{slot.icon}</span>
                        <span>{slot.name}</span>
                      </div>
                      {currentMethod ? (
                        <div className="text-blue-400 mt-0.5">{currentMethod.name}</div>
                      ) : (
                        <div className="text-white/50 mt-0.5">未选择</div>
                      )}
                      {slot.description && (
                        <div className="text-white/40 mt-0.5 text-[10px]">{slot.description}</div>
                      )}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/[0.15]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 min-w-0 ml-2 hidden md:flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1">
            {buildingConfig.slots.map((slot: BuildingSlotType, slotIndex: number) => {
              const currentMethodId = currentMethods[slotIndex] || 0;
              if (!currentMethodId) return null;
              const method = getMethodById(currentMethodId) as BuildingProductionMethod | null;
              if (!method) return null;

              return (
                <span
                  key={`active-${slotIndex}`}
                  className="inline-flex items-center gap-1 rounded-md border border-[#c8ab72]/30 bg-[rgba(217,186,126,0.08)] px-1.5 py-0.5 text-[10px] text-[rgba(245,232,204,0.82)]"
                >
                  <span>{slot.icon}</span>
                  <span>{slot.name}</span>
                  <span className="text-[rgba(245,232,204,0.46)]">·</span>
                  <span>{method.name}</span>
                </span>
              );
            })}
          </div>

          {renderFinalRecipeBar()}

          {buildingConfig.slots.map((slot: BuildingSlotType, slotIndex: number) => {
            const currentMethodId = currentMethods[slotIndex] || 0;
            if (!currentMethodId) return null;
            const method = getMethodById(currentMethodId) as BuildingProductionMethod | null;
            if (!method) return null;
            const effects = getMethodEffects(currentMethodId);

            return (
              <div key={slotIndex} className="hidden">
                {renderMethodRecipeBar(method, effects, {
                  compact: true,
                  slotName: slot.name,
                })}
              </div>
            );
          })}
        </div>
      </div>

      {renderDropdownMenu()}

      {activeSlot !== null && createPortal(
        <div
          className="fixed inset-0 z-[9998]"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSlot(null);
            setDropdownPos(null);
          }}
        />,
        document.body
      )}
    </div>
  );
};

export default ProductionMethodsPanel;
