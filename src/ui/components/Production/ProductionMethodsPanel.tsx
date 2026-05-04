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

interface ProductionMethodsPanelProps {
  buildingId: number;
  buildingTypeId: number;
  buildingLevel: number;
  compact?: boolean;
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
const WORKFORCE_ROLE_LABELS = [
  { key: 'basic', label: '普通工人' },
  { key: 'technical', label: '技术工人' },
  { key: 'management', label: '管理人员' },
] as const;

export const ProductionMethodsPanel: React.FC<ProductionMethodsPanelProps> = ({
  buildingId,
  buildingTypeId,
  buildingLevel,
  compact = false,
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

    for (const role of WORKFORCE_ROLE_LABELS) {
      const amount = method.workforceDelta[role.key] || 0;
      const formatted = formatDelta(amount);
      if (formatted) {
        meta.push({
          icon: '👷',
          label: role.label,
          value: formatted,
          isPositive: amount < 0,
        });
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
      <span className={`${compact ? 'max-w-[72px]' : 'max-w-[88px]'} truncate text-white/78`}>
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
        className={`rounded-lg border border-white/[0.085] bg-[#121820] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
        }`}
      >
        <div className={`flex ${compact ? 'items-center gap-2' : 'items-start gap-3'} min-w-0`}>
          <div className={`flex items-center justify-center rounded-md border border-white/[0.10] bg-white/[0.045] text-white/78 ${compact ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base'}`}>
            {getMethodIcon(method, { id: method.slotId, buildingTypeId, name: '', icon: '⚙️', description: '', order: 0 })}
          </div>

          <div className="min-w-0 flex-1">
            {showMethodName && (
              <div className={`flex min-w-0 items-center justify-between gap-2 ${compact ? 'mb-1' : 'mb-1.5'}`}>
                <div className="min-w-0">
                  <div className={`truncate font-medium text-white/84 ${compact ? 'text-[12px]' : 'text-sm'}`}>
                    {slotName ? `${slotName} · ${method.name}` : method.name}
                  </div>
                  {!compact && method.description && (
                    <div className="truncate text-[10px] text-white/38">
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
                <span className="text-[10px] text-white/42">无需原料</span>
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
                        ? 'border-white/[0.08] bg-white/[0.035] text-white/58'
                        : 'border-rose-400/20 bg-rose-400/[0.055] text-rose-200/85'
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
    ...WORKFORCE_ROLE_LABELS
      .map((role) => ({
        icon: '👷',
        label: role.label,
        value: `${Math.max(0, finalRecipe.workforceRequired[role.key] || 0)}`,
        isPositive: true,
      }))
      .filter(effect => effect.value !== '0'),
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
    <div className="rounded-lg border border-white/[0.085] bg-[#121820] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.08em] text-white/68">
          最终投入产出
        </span>
        <span className="text-[10px] text-white/36">
          所有槽位共同生效
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2 flex-wrap">
        {finalRecipeInputs.length === 0 ? (
          <span className="text-[10px] text-white/42">无需原料</span>
        ) : (
          finalRecipeInputs.map((effect, index) => renderGoodsEntry(effect, `final-input-${index}`))
        )}

        {(finalRecipeInputs.length > 0 || finalRecipeOutputs.length > 0) && (
          <span className="text-base text-sky-300/90">→</span>
        )}

        {finalRecipeOutputs.length > 0 ? (
          finalRecipeOutputs.map((effect, index) => renderGoodsEntry(effect, `final-output-${index}`))
        ) : (
          <span className="text-[10px] text-white/42">无产出</span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[10px]">
        {finalRecipeMeta.map((effect, index) => (
          <span
            key={`final-meta-${index}`}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${
              effect.isPositive
                ? 'border-white/[0.08] bg-white/[0.035] text-white/58'
                : 'border-rose-400/20 bg-rose-400/[0.055] text-rose-200/85'
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
        className="fixed z-[9999] min-w-[280px] overflow-y-auto
                   rounded-lg border border-white/[0.12] bg-[#111720]
                   shadow-[0_18px_48px_rgba(0,0,0,0.46)]"
        style={{
          top: Math.max(10, dropdownPos.top),
          left: dropdownPos.left,
          maxHeight: `${maxHeight}px`,
        }}
      >
        <div className="sticky top-0 border-b border-white/[0.08] bg-[#141b24] p-2.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">{slot.icon}</span>
            <div>
              <div className="text-sm font-medium text-white/86">{slot.name}</div>
              {slot.description && (
                <div className="text-xs text-white/40">{slot.description}</div>
              )}
            </div>
          </div>
        </div>
        <div className="p-1">
          <button
            className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-all
                        ${currentMethodId === 0
                          ? 'bg-white/[0.08] text-white/78 border border-white/[0.12]'
                          : 'hover:bg-white/[0.055] border border-transparent text-white/50'}`}
            onClick={(e) => handleMethodSelect(activeSlot, 0, e)}
          >
            <span className="w-6 text-center text-white/42">×</span>
            <span>未选择</span>
          </button>

          {availableMethods.map((method: BuildingProductionMethod) => {
            const isSelected = currentMethodId === method.id;
            const effects = getMethodEffects(method.id);
            const isLocked = method.requiredLevel > buildingLevel;

            return (
              <button
                key={method.id}
                disabled={isLocked}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-all
                            ${isSelected
                              ? 'bg-white/[0.08] border border-[var(--accent)]/35'
                              : 'hover:bg-white/[0.055] border border-transparent'}
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

  const renderSlotButtons = (compactMode = false) => (
    buildingConfig.slots.map((slot: BuildingSlotType, slotIndex: number) => {
      const currentMethodId = currentMethods[slotIndex] || 0;
      const currentMethod = currentMethodId > 0
        ? (getMethodById(currentMethodId) as BuildingProductionMethod | undefined)
        : undefined;
      const colors = GLASS_SLOT_COLORS[slotIndex % GLASS_SLOT_COLORS.length];
      const isActive = activeSlot === slotIndex;
      const hasMethod = currentMethodId > 0 && currentMethod;
      const sizeClass = compactMode
        ? 'h-8 w-8 rounded-lg text-base'
        : 'h-10 w-10 rounded-xl text-lg';

      return (
        <div key={slotIndex} className="relative">
          <button
            ref={el => buttonRefs.current[slotIndex] = el}
            className={`
              ${sizeClass} flex items-center justify-center
              transition-all duration-200 hover:scale-105
              backdrop-blur-sm border
              ${isActive
                ? `${colors.bg} ${colors.active} ${compactMode ? '' : colors.glow} scale-105`
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
    })
  );

  if (compact) {
    const selectedCount = currentMethods.filter(Boolean).length;

    return (
      <div className="mt-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {renderSlotButtons(true)}
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-white/35">
            {selectedCount}/{buildingConfig.slots.length} 槽
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap gap-1">
          {buildingConfig.slots.map((slot: BuildingSlotType, slotIndex: number) => {
            const currentMethodId = currentMethods[slotIndex] || 0;
            if (!currentMethodId) return null;
            const method = getMethodById(currentMethodId) as BuildingProductionMethod | null;
            if (!method) return null;

            return (
              <span
                key={`compact-active-${slotIndex}`}
                className="inline-flex max-w-full items-center gap-1 rounded border border-white/[0.08] bg-white/[0.035] px-1.5 py-0.5 text-[10px] text-white/58"
              >
                <span className="text-white/38">{slot.name}</span>
                <span className="text-white/22">·</span>
                <span className="truncate text-white/76">{method.name}</span>
              </span>
            );
          })}
        </div>

        <div className="rounded-md border border-white/[0.07] bg-black/[0.13] px-2.5 py-2">
          <div className="mb-1.5 text-[10px] font-medium tracking-[0.08em] text-white/42">
            最终投入产出
          </div>
          <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
            {finalRecipeInputs.length === 0 ? (
              <span className="text-[10px] text-white/42">无需原料</span>
            ) : (
              finalRecipeInputs.map((effect, index) => renderGoodsEntry(effect, `compact-final-input-${index}`, true))
            )}

            {(finalRecipeInputs.length > 0 || finalRecipeOutputs.length > 0) && (
              <span className="text-sm text-sky-300/75">→</span>
            )}

            {finalRecipeOutputs.length > 0 ? (
              finalRecipeOutputs.map((effect, index) => renderGoodsEntry(effect, `compact-final-output-${index}`, true))
            ) : (
              <span className="text-[10px] text-white/42">无产出</span>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {finalRecipeMeta.map((effect, index) => (
              <span
                key={`compact-final-meta-${index}`}
                className={`rounded border px-1.5 py-0.5 text-[10px] tabular-nums ${
                  effect.isPositive
                    ? 'border-white/[0.08] bg-white/[0.035] text-white/52'
                    : 'border-rose-400/15 bg-rose-400/[0.045] text-rose-200/75'
                }`}
              >
                {effect.label} {effect.value}
              </span>
            ))}
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
  }

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
                  className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.035] px-1.5 py-0.5 text-[10px] text-white/62"
                >
                  <span>{slot.icon}</span>
                  <span>{slot.name}</span>
                  <span className="text-white/24">·</span>
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
