import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/stores/gameStore';
import {
  getSlotTypeName,
  ProductionMethod,
  ProductionSlotType,
  METHODS_BY_ID,
  // 新系统集成函数
  hasBuildingSpecificMethods,
  getSlotAvailableMethods,
  getBuildingConfig,
  getMethodByIdNew,
  isNewSystemInitialized,
  type BuildingSlotTypeV2 as BuildingSlotType,
  type BuildingProductionMethod,
} from '@/core/production/ProductionMethods';

interface ProductionMethodsPanelProps {
  buildingId: number;
  buildingTypeId: number;
  buildingLevel: number;
}

// 槽位类型对应的图标（旧系统）
const SLOT_ICONS: Record<ProductionSlotType, string> = {
  'process': '⚙️',
  'automation': '🤖',
  'energy': '⚡',
  'quality': '⭐',
  'environment': '🌿',
};

// 槽位类型对应的颜色（旧系统）
const SLOT_COLORS: Record<ProductionSlotType, { bg: string; border: string; active: string }> = {
  'process': { bg: 'bg-blue-900/60', border: 'border-blue-500/50', active: 'border-blue-400' },
  'automation': { bg: 'bg-purple-900/60', border: 'border-purple-500/50', active: 'border-purple-400' },
  'energy': { bg: 'bg-yellow-900/60', border: 'border-yellow-500/50', active: 'border-yellow-400' },
  'quality': { bg: 'bg-amber-900/60', border: 'border-amber-500/50', active: 'border-amber-400' },
  'environment': { bg: 'bg-green-900/60', border: 'border-green-500/50', active: 'border-green-400' },
};

// 新系统槽位颜色（根据槽位索引循环使用）
const NEW_SLOT_COLORS: { bg: string; border: string; active: string }[] = [
  { bg: 'bg-blue-900/60', border: 'border-blue-500/50', active: 'border-blue-400' },
  { bg: 'bg-purple-900/60', border: 'border-purple-500/50', active: 'border-purple-400' },
  { bg: 'bg-yellow-900/60', border: 'border-yellow-500/50', active: 'border-yellow-400' },
  { bg: 'bg-amber-900/60', border: 'border-amber-500/50', active: 'border-amber-400' },
  { bg: 'bg-green-900/60', border: 'border-green-500/50', active: 'border-green-400' },
  { bg: 'bg-cyan-900/60', border: 'border-cyan-500/50', active: 'border-cyan-400' },
  { bg: 'bg-rose-900/60', border: 'border-rose-500/50', active: 'border-rose-400' },
  { bg: 'bg-indigo-900/60', border: 'border-indigo-500/50', active: 'border-indigo-400' },
];

export const ProductionMethodsPanel: React.FC<ProductionMethodsPanelProps> = ({
  buildingId,
  buildingTypeId,
  buildingLevel,
}) => {
  const {
    getBuildingSlotConfig,
    getBuildingCurrentMethods,
    getAvailableMethodsForSlot,
    changeBuildingSlotMethod,
    tick,
  } = useGameStore();

  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 检查是否使用新系统（新系统在WorldInitializer中已初始化）
  const useNewSystem = useMemo(() => {
    const initialized = isNewSystemInitialized();
    const hasSpecific = hasBuildingSpecificMethods(buildingTypeId);
    return initialized && hasSpecific;
  }, [buildingTypeId]);

  // 获取新系统的建筑配置
  const newBuildingConfig = useMemo(() => {
    if (!useNewSystem) return null;
    return getBuildingConfig(buildingTypeId);
  }, [buildingTypeId, useNewSystem]);

  // 获取槽位配置（旧系统）
  const slotConfig = useMemo(() => {
    if (useNewSystem) return null;
    return getBuildingSlotConfig(buildingTypeId);
  }, [buildingTypeId, getBuildingSlotConfig, useNewSystem]);

  // 获取当前生产方式（依赖tick确保切换后刷新）
  // 如果存储的是旧系统ID或无效ID，使用新系统的默认值（只替换无效的槽位）
  const currentMethods = useMemo(() => {
    const storedMethods = getBuildingCurrentMethods(buildingId);
    
    // 如果使用新系统，逐个检查并修复无效的方式ID
    if (useNewSystem && newBuildingConfig) {
      const slots = newBuildingConfig.slots;
      const defaultMethods = newBuildingConfig.defaultMethods || {};
      const defaultIds = Object.values(defaultMethods) as number[];
      
      // 逐个检查每个槽位，只替换无效的ID
      const fixedMethods = slots.map((_: any, index: number) => {
        const storedId = storedMethods[index] || 0;
        // 0表示未选择，是有效的
        if (storedId === 0) return 0;
        // 新系统的方式ID应该 >= 10000
        if (storedId >= 10000) return storedId; // 有效的新系统ID，保留
        // 无效ID，替换为默认值
        return defaultIds[index] || 0;
      });
      
      return fixedMethods;
    }
    
    return storedMethods;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, getBuildingCurrentMethods, tick, useNewSystem, newBuildingConfig]);

  // 如果既没有旧系统配置也没有新系统配置，则不渲染
  if (!useNewSystem && (!slotConfig || slotConfig.slots.length === 0)) {
    return null;
  }
  if (useNewSystem && (!newBuildingConfig || newBuildingConfig.slots.length === 0)) {
    return null;
  }

  // 格式化修正值显示
  const formatModifier = (value: number, isMultiplier: boolean = true) => {
    if (isMultiplier) {
      const percentage = (value - 1) * 100;
      if (Math.abs(percentage) < 0.1) return null;
      return percentage > 0 ? `+${percentage.toFixed(0)}%` : `${percentage.toFixed(0)}%`;
    }
    if (value === 0) return null;
    return value > 0 ? `+${(value * 100).toFixed(0)}%` : `${(value * 100).toFixed(0)}%`;
  };

  // 获取方式的效果列表（旧系统）
  const getMethodEffects = (methodId: number) => {
    const method = METHODS_BY_ID.get(methodId);
    if (!method) return [];

    const effects: { label: string; value: string; isPositive: boolean }[] = [];

    // 输出修正
    if (method.outputMultipliers.size > 0) {
      let sum = 0;
      method.outputMultipliers.forEach(v => sum += v);
      const avg = sum / method.outputMultipliers.size;
      const formatted = formatModifier(avg);
      if (formatted) {
        effects.push({ label: '产出', value: formatted, isPositive: avg > 1 });
      }
    }

    // 输入修正
    if (method.inputMultipliers.size > 0) {
      let sum = 0;
      method.inputMultipliers.forEach(v => sum += v);
      const avg = sum / method.inputMultipliers.size;
      const formatted = formatModifier(avg);
      if (formatted) {
        effects.push({ label: '消耗', value: formatted, isPositive: avg < 1 });
      }
    }

    // 劳动力
    const laborMod = formatModifier(method.laborMultiplier);
    if (laborMod) {
      effects.push({ label: '人力', value: laborMod, isPositive: method.laborMultiplier < 1 });
    }

    // 能源
    const energyMod = formatModifier(method.energyMultiplier);
    if (energyMod) {
      effects.push({ label: '能耗', value: energyMod, isPositive: method.energyMultiplier < 1 });
    }

    // 品质
    if (method.qualityBonus && method.qualityBonus !== 0) {
      const formatted = formatModifier(method.qualityBonus, false);
      if (formatted) {
        effects.push({ label: '品质', value: formatted, isPositive: method.qualityBonus > 0 });
      }
    }

    return effects;
  };

  // 获取新系统方式的效果列表
  const getNewMethodEffects = (methodId: number) => {
    const method = getMethodByIdNew(methodId) as BuildingProductionMethod | null;
    if (!method) return [];

    const effects: { label: string; value: string; isPositive: boolean }[] = [];

    // 输出修正
    if (method.outputModifiers && method.outputModifiers.length > 0) {
      let sum = 0;
      method.outputModifiers.forEach((m: { multiplier: number }) => sum += m.multiplier);
      const avg = sum / method.outputModifiers.length;
      const formatted = formatModifier(avg);
      if (formatted) {
        effects.push({ label: '产出', value: formatted, isPositive: avg > 1 });
      }
    }

    // 输入修正
    if (method.inputModifiers && method.inputModifiers.length > 0) {
      let sum = 0;
      method.inputModifiers.forEach((m: { multiplier: number }) => sum += m.multiplier);
      const avg = sum / method.inputModifiers.length;
      const formatted = formatModifier(avg);
      if (formatted) {
        effects.push({ label: '消耗', value: formatted, isPositive: avg < 1 });
      }
    }

    // 劳动力
    if (method.laborMultiplier && method.laborMultiplier !== 1) {
      const laborMod = formatModifier(method.laborMultiplier);
      if (laborMod) {
        effects.push({ label: '人力', value: laborMod, isPositive: method.laborMultiplier < 1 });
      }
    }

    // 能源
    if (method.energyMultiplier && method.energyMultiplier !== 1) {
      const energyMod = formatModifier(method.energyMultiplier);
      if (energyMod) {
        effects.push({ label: '能耗', value: energyMod, isPositive: method.energyMultiplier < 1 });
      }
    }

    // 品质
    if (method.qualityBonus && method.qualityBonus !== 0) {
      const formatted = formatModifier(method.qualityBonus, false);
      if (formatted) {
        effects.push({ label: '品质', value: formatted, isPositive: method.qualityBonus > 0 });
      }
    }

    return effects;
  };

  // 获取方法的简短图标（旧系统）
  const getMethodIcon = (method: ProductionMethod | undefined, slotType: ProductionSlotType): string => {
    if (!method) return '❓';
    
    // 根据方法名称和槽位类型推断图标
    const name = method.name.toLowerCase();
    
    if (name.includes('手工') || name.includes('传统')) return '✋';
    if (name.includes('机械') || name.includes('半自动')) return '🔧';
    if (name.includes('自动')) return '🤖';
    if (name.includes('智能') || name.includes('ai')) return '🧠';
    if (name.includes('煤') || name.includes('蒸汽')) return '🏭';
    if (name.includes('电') || name.includes('电力')) return '⚡';
    if (name.includes('太阳') || name.includes('光伏')) return '☀️';
    if (name.includes('核')) return '☢️';
    if (name.includes('标准') || name.includes('基础')) return '📊';
    if (name.includes('高端') || name.includes('精密')) return '💎';
    if (name.includes('大师') || name.includes('匠人')) return '👨‍🔧';
    if (name.includes('循环') || name.includes('回收')) return '♻️';
    if (name.includes('绿色') || name.includes('环保')) return '🌿';
    if (name.includes('过滤')) return '🌀';
    
    return SLOT_ICONS[slotType];
  };

  // 获取新系统方法的图标
  const getNewMethodIcon = (method: BuildingProductionMethod | undefined, slot: BuildingSlotType): string => {
    if (!method) return slot.icon || '❓';
    
    // 根据方法名称推断图标
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

  // 处理槽位点击
  const handleSlotClick = (slotIndex: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeSlot === slotIndex) {
      setActiveSlot(null);
      setDropdownPos(null);
    } else {
      setActiveSlot(slotIndex);
      // 计算下拉菜单位置，智能判断上下方向
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = 350; // 预估菜单最大高度
      
      // 如果下方空间不足，则显示在上方
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;
      
      if (showAbove) {
        setDropdownPos({
          top: rect.top - menuHeight - 4,
          left: rect.left,
        });
      } else {
        setDropdownPos({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
    }
  };

  // 处理方法选择
  const handleMethodSelect = (slotIndex: number, methodId: number, event?: React.MouseEvent) => {
    event?.stopPropagation();
    changeBuildingSlotMethod(buildingId, slotIndex, methodId);
    setActiveSlot(null);
    setDropdownPos(null);
  };

  // 渲染下拉菜单内容（旧系统）
  const renderOldDropdownMenu = () => {
    if (activeSlot === null || !dropdownPos || !slotConfig) return null;
    
    const slot = slotConfig.slots[activeSlot];
    const currentMethodId = currentMethods[activeSlot] || 0;
    
    // 计算实际可用高度
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.min(300, viewportHeight - dropdownPos.top - 20);
    
    return createPortal(
      <div
        className="fixed z-[9999] min-w-[220px] overflow-y-auto
                   bg-slate-800/98 backdrop-blur-sm border border-slate-600 rounded-lg shadow-2xl"
        style={{
          top: Math.max(10, dropdownPos.top),
          left: dropdownPos.left,
          maxHeight: `${maxHeight}px`,
        }}
      >
        <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800">
          <div className="text-xs font-medium text-text-secondary">{getSlotTypeName(slot.slotType)}</div>
        </div>
        <div className="p-1">
          {/* 空选项 */}
          <button
            className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors
                        ${currentMethodId === 0 ? 'bg-accent/20 text-accent' : 'hover:bg-slate-700'}`}
            onClick={(e) => handleMethodSelect(activeSlot, 0, e)}
          >
            <span className="w-6 text-center">❌</span>
            <span className="text-text-tertiary">未选择</span>
          </button>
          
          {/* 可用方法 */}
          {getAvailableMethodsForSlot(buildingTypeId, activeSlot, buildingLevel).map((method: ProductionMethod) => {
            const isSelected = currentMethodId === method.id;
            const effects = getMethodEffects(method.id);
            
            return (
              <button
                key={method.id}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors
                            ${isSelected ? 'bg-accent/20 text-accent' : 'hover:bg-slate-700'}`}
                onClick={(e) => handleMethodSelect(activeSlot, method.id, e)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-base">
                    {getMethodIcon(method, slot.slotType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {method.name}
                      {method.requiredLevel > 1 && (
                        <span className="ml-1 text-xs text-text-tertiary">(Lv.{method.requiredLevel}+)</span>
                      )}
                    </div>
                    {effects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {effects.slice(0, 3).map((effect, i) => (
                          <span
                            key={i}
                            className={`text-xs ${effect.isPositive ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {effect.label}{effect.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    );
  };

  // 渲染下拉菜单内容（新系统）
  const renderNewDropdownMenu = () => {
    if (activeSlot === null || !dropdownPos || !newBuildingConfig) return null;
    
    const slot = newBuildingConfig.slots[activeSlot];
    if (!slot) return null;
    
    const currentMethodId = currentMethods[activeSlot] || 0;
    const availableMethods = getSlotAvailableMethods(buildingTypeId, slot.id);
    
    // 计算实际可用高度
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.min(350, viewportHeight - dropdownPos.top - 20);
    
    return createPortal(
      <div
        className="fixed z-[9999] min-w-[260px] overflow-y-auto
                   bg-slate-800/98 backdrop-blur-sm border border-slate-600 rounded-lg shadow-2xl"
        style={{
          top: Math.max(10, dropdownPos.top),
          left: dropdownPos.left,
          maxHeight: `${maxHeight}px`,
        }}
      >
        <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base">{slot.icon}</span>
            <div>
              <div className="text-sm font-medium text-text-primary">{slot.name}</div>
              {slot.description && (
                <div className="text-xs text-text-tertiary">{slot.description}</div>
              )}
            </div>
          </div>
        </div>
        <div className="p-1">
          {/* 空选项 */}
          <button
            className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors
                        ${currentMethodId === 0 ? 'bg-accent/20 text-accent' : 'hover:bg-slate-700'}`}
            onClick={(e) => handleMethodSelect(activeSlot, 0, e)}
          >
            <span className="w-6 text-center">❌</span>
            <span className="text-text-tertiary">未选择</span>
          </button>
          
          {/* 可用方法 */}
          {availableMethods.map((method: BuildingProductionMethod) => {
            const isSelected = currentMethodId === method.id;
            const effects = getNewMethodEffects(method.id);
            const isLocked = method.requiredLevel > buildingLevel;
            
            return (
              <button
                key={method.id}
                disabled={isLocked}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors
                            ${isSelected ? 'bg-accent/20 text-accent' : 'hover:bg-slate-700'}
                            ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={(e) => !isLocked && handleMethodSelect(activeSlot, method.id, e)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-base">
                    {getNewMethodIcon(method, slot)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-1">
                      {method.name}
                      {method.requiredLevel > 1 && (
                        <span className={`text-xs ${isLocked ? 'text-red-400' : 'text-text-tertiary'}`}>
                          (Lv.{method.requiredLevel}+)
                        </span>
                      )}
                    </div>
                    {method.description && (
                      <div className="text-xs text-text-tertiary truncate">{method.description}</div>
                    )}
                    {effects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {effects.slice(0, 4).map((effect, i) => (
                          <span
                            key={i}
                            className={`text-xs ${effect.isPositive ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {effect.label}{effect.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    );
  };

  // 渲染下拉菜单（根据系统类型选择）
  const renderDropdownMenu = () => {
    if (useNewSystem) {
      return renderNewDropdownMenu();
    } else {
      return renderOldDropdownMenu();
    }
  };

  // 渲染旧系统的槽位
  const renderOldSlots = () => {
    if (!slotConfig) return null;
    
    return (
      <>
        {/* 槽位图标列表 */}
        <div className="flex gap-1">
          {slotConfig.slots.map((slot, slotIndex) => {
            const currentMethodId = currentMethods[slotIndex] || 0;
            const currentMethod = METHODS_BY_ID.get(currentMethodId);
            const colors = SLOT_COLORS[slot.slotType];
            const isActive = activeSlot === slotIndex;
            const hasMethod = currentMethodId > 0 && currentMethod;
            
            return (
              <div key={slotIndex} className="relative">
                {/* 槽位按钮 */}
                <button
                  ref={el => buttonRefs.current[slotIndex] = el}
                  className={`
                    w-10 h-10 rounded border-2 flex items-center justify-center text-lg
                    transition-all duration-150 hover:scale-105
                    ${colors.bg} ${isActive ? colors.active : colors.border}
                    ${isActive ? 'ring-2 ring-white/30 scale-105' : ''}
                    ${!hasMethod ? 'opacity-60' : ''}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlotClick(slotIndex, e);
                  }}
                  onMouseEnter={() => setShowTooltip(slotIndex)}
                  onMouseLeave={() => setShowTooltip(null)}
                  title={`${getSlotTypeName(slot.slotType)}${currentMethod ? `: ${currentMethod.name}` : ''}`}
                >
                  {hasMethod ? getMethodIcon(currentMethod, slot.slotType) : SLOT_ICONS[slot.slotType]}
                </button>
                
                {/* Tooltip 悬浮提示 */}
                {showTooltip === slotIndex && !isActive && (
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap">
                    <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs shadow-lg">
                      <div className="font-medium">{getSlotTypeName(slot.slotType)}</div>
                      {currentMethod && (
                        <div className="text-text-tertiary">{currentMethod.name}</div>
                      )}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* 当前选中方式的效果摘要 */}
        <div className="flex-1 min-w-0 ml-2 hidden md:flex items-center gap-1 flex-wrap">
          {slotConfig.slots.map((slot, slotIndex) => {
            const currentMethodId = currentMethods[slotIndex] || 0;
            if (!currentMethodId) return null;
            
            const effects = getMethodEffects(currentMethodId).slice(0, 1);
            return effects.map((effect, i) => (
              <span
                key={`${slotIndex}-${i}`}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  effect.isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {effect.label}{effect.value}
              </span>
            ));
          })}
        </div>
      </>
    );
  };

  // 渲染新系统的槽位
  const renderNewSlots = () => {
    if (!newBuildingConfig) return null;
    
    return (
      <>
        {/* 槽位图标列表 */}
        <div className="flex gap-1 flex-wrap">
          {newBuildingConfig.slots.map((slot: BuildingSlotType, slotIndex: number) => {
            const currentMethodId = currentMethods[slotIndex] || 0;
            const currentMethod = currentMethodId > 0 ? getMethodByIdNew(currentMethodId) as BuildingProductionMethod | undefined : undefined;
            const colors = NEW_SLOT_COLORS[slotIndex % NEW_SLOT_COLORS.length];
            const isActive = activeSlot === slotIndex;
            const hasMethod = currentMethodId > 0 && currentMethod;
            
            return (
              <div key={slotIndex} className="relative">
                {/* 槽位按钮 */}
                <button
                  ref={el => buttonRefs.current[slotIndex] = el}
                  className={`
                    w-10 h-10 rounded border-2 flex items-center justify-center text-lg
                    transition-all duration-150 hover:scale-105
                    ${colors.bg} ${isActive ? colors.active : colors.border}
                    ${isActive ? 'ring-2 ring-white/30 scale-105' : ''}
                    ${!hasMethod ? 'opacity-60' : ''}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlotClick(slotIndex, e);
                  }}
                  onMouseEnter={() => setShowTooltip(slotIndex)}
                  onMouseLeave={() => setShowTooltip(null)}
                  title={`${slot.name}${currentMethod ? `: ${currentMethod.name}` : ''}`}
                >
                  {hasMethod ? getNewMethodIcon(currentMethod, slot) : (slot.icon || '⚙️')}
                </button>
                
                {/* Tooltip 悬浮提示 */}
                {showTooltip === slotIndex && !isActive && (
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap max-w-[200px]">
                    <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs shadow-lg">
                      <div className="font-medium flex items-center gap-1">
                        <span>{slot.icon}</span>
                        <span>{slot.name}</span>
                      </div>
                      {currentMethod ? (
                        <div className="text-accent mt-0.5">{currentMethod.name}</div>
                      ) : (
                        <div className="text-text-tertiary mt-0.5">未选择</div>
                      )}
                      {slot.description && (
                        <div className="text-text-tertiary mt-0.5 text-[10px]">{slot.description}</div>
                      )}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* 当前选中方式的效果摘要 */}
        <div className="flex-1 min-w-0 ml-2 hidden md:flex items-center gap-1 flex-wrap">
          {newBuildingConfig.slots.map((slot: BuildingSlotType, slotIndex: number) => {
            const currentMethodId = currentMethods[slotIndex] || 0;
            if (!currentMethodId) return null;
            
            const effects = getNewMethodEffects(currentMethodId).slice(0, 1);
            return effects.map((effect, i) => (
              <span
                key={`${slotIndex}-${i}`}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  effect.isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {effect.label}{effect.value}
              </span>
            ));
          })}
        </div>
      </>
    );
  };

  return (
    <div className="mt-3">
      {/* 生产方式槽位 - 维多利亚3风格水平排列 */}
      <div className="flex items-center gap-1 relative">
        {/* 槽位标签 */}
        <span className="text-xs text-text-tertiary mr-1 hidden sm:inline">
          {useNewSystem ? '专属方式' : '方式'}
        </span>
        
        {/* 根据系统类型渲染槽位 */}
        {useNewSystem ? renderNewSlots() : renderOldSlots()}
      </div>
      
      {/* 使用Portal渲染下拉菜单到body */}
      {renderDropdownMenu()}
      
      {/* 点击空白处关闭菜单 - 使用Portal避免影响其他元素 */}
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