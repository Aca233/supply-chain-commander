/**
 * 生产方式图标映射
 * 从 ProductionMethodsPanel 中提取，纯函数无副作用
 */

import { useGameStore } from '@/stores/gameStore';
import {
  getBuildingConfig,
  getMethodById,
  type BuildingProductionMethod,
  type BuildingSlotType,
} from '@/core/production/ProductionMethods';

/**
 * 根据方式名称关键字匹配图标
 */
export function getMethodIcon(
  method: BuildingProductionMethod | undefined,
  slot: BuildingSlotType,
): string {
  if (!method) return slot.icon || '⚙️';
  const name = method.name.toLowerCase();

  // 按优先级匹配关键字
  const KEYWORD_ICONS: [string[], string][] = [
    [['手工', '传统', '人工'], '✋'],
    [['机械', '半自动'], '🔧'],
    [['全自动', '自动化'], '🤖'],
    [['智能', 'ai', '数字'], '🧠'],
    [['煤', '蒸汽'], '🏭'],
    [['电', '电力'], '⚡'],
    [['太阳', '光伏'], '☀️'],
    [['核'], '☢️'],
    [['标准', '基础'], '📊'],
    [['高端', '精密', '高级'], '💎'],
    [['大师', '匠人', '专家'], '👨‍🔧'],
    [['循环', '回收'], '♻️'],
    [['绿色', '环保', '清洁'], '🌿'],
    [['过滤'], '🌀'],
    [['露天', '矿'], '⛏️'],
    [['深井', '钻探'], '🕳️'],
    [['水力', '液压'], '💧'],
    [['连铸', '冶炼'], '🔥'],
    [['定向', '爆破'], '💥'],
  ];

  for (const [keywords, icon] of KEYWORD_ICONS) {
    if (keywords.some(kw => name.includes(kw))) return icon;
  }

  return slot.icon || '⚙️';
}

/**
 * 获取建筑当前所有生产方式的图标列表
 * 用于卡片中显示紧凑的方式图标行
 */
export function getMethodIconForBuilding(buildingIndex: number): string[] {
  const { getBuildingCurrentMethods, getWorld } = useGameStore.getState();
  const world = getWorld();
  if (!world) return [];

  const typeId = world.buildings.types[buildingIndex];
  const config = getBuildingConfig(typeId);
  if (!config || config.slots.length === 0) return [];

  const currentMethods = getBuildingCurrentMethods(buildingIndex);
  const icons: string[] = [];

  for (let i = 0; i < config.slots.length; i++) {
    const slot = config.slots[i] as BuildingSlotType;
    const methodId = currentMethods[i] || 0;
    const method = methodId > 0
      ? (getMethodById(methodId) as BuildingProductionMethod | undefined)
      : undefined;
    icons.push(getMethodIcon(method, slot));
  }

  return icons;
}
