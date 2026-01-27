/**
 * 附属建筑系统
 * 为每种建筑类型提供专属附属建筑，增强生产效果
 */

import { GameWorld } from '../world/GameWorld';
import { MAX_SUBSIDIARIES } from '../constants';

// ==================== 类型定义 ====================

/** 附属建筑类别 */
export type SubsidiaryCategory = 
  | 'production'    // 生产增强
  | 'efficiency'    // 效率优化
  | 'quality'       // 品质提升
  | 'capacity'      // 容量扩展
  | 'specialized';  // 专业特化

/** 附属建筑效果 */
export interface SubsidiaryEffects {
  // 生产效果
  outputMultiplier?: number;         // 产出乘数 (1.0 = 不变, 1.2 = +20%)
  inputReduction?: number;           // 输入减少比例 (0.1 = 减少10%)
  speedMultiplier?: number;          // 速度乘数
  
  // 品质效果
  qualityBonus?: number;             // 品质加成 (0.1 = +0.1等级)
  defectReduction?: number;          // 缺陷率降低 (0.3 = -30%)
  
  // 成本效果
  laborReduction?: number;           // 人工成本降低 (0.2 = -20%)
  energyReduction?: number;          // 能源成本降低
  maintenanceReduction?: number;     // 维护成本降低
  
  // 容量效果
  storageCapacity?: number;          // 增加存储容量 (绝对值)
  bufferCapacity?: number;           // 增加缓冲容量
  
  // 特殊效果
  bonusOutputChance?: number;        // 额外产出几率 (0.1 = 10%几率)
  bonusOutputGoods?: number;         // 额外产出商品ID
  bonusOutputAmount?: number;        // 额外产出数量
  
  // 专业效果 - 特定商品的产出加成
  specificGoodsBonus?: Array<{ goodsId: number; multiplier: number }>;
}

/** 附属建筑定义 */
export interface SubsidiaryBuildingDef {
  id: number;                        // 唯一ID (从1000开始)
  key: string;                       // 键名
  name: string;                      // 显示名称
  description: string;               // 描述
  category: SubsidiaryCategory;      // 类别
  icon: string;                      // 图标 (emoji)
  
  // 适用范围
  applicableBuildingTypes: number[]; // 可安装的建筑类型ID列表
  
  // 成本
  buildCost: number;                 // 建造成本
  dailyMaintenance: number;          // 每日维护费
  
  // 解锁条件
  requiredBuildingLevel: number;     // 需要主建筑等级
  
  // 效果
  effects: SubsidiaryEffects;
  
  // 限制
  maxPerBuilding: number;            // 每建筑最多安装数量
  exclusiveWith?: number[];          // 互斥的附属建筑ID
  
  // 占用
  slots: number;                     // 占用槽位数 (1-3)
}

/** 已安装的附属建筑实例 */
export interface InstalledSubsidiary {
  subsidiaryId: number;              // 附属建筑定义ID
  installedTick: number;             // 安装时间
  condition: number;                 // 状态 0-1
}

/** 建筑的综合附属建筑效果 */
export interface CombinedSubsidiaryEffects {
  outputMultiplier: number;
  inputReduction: number;
  speedMultiplier: number;
  qualityBonus: number;
  defectReduction: number;
  laborReduction: number;
  energyReduction: number;
  maintenanceReduction: number;
  storageCapacity: number;
  bufferCapacity: number;
  bonusOutputs: Array<{ goodsId: number; chance: number; amount: number }>;
  specificGoodsBonus: Map<number, number>;
}

// ==================== 附属建筑注册表 ====================

/** 所有附属建筑定义 */
export const ALL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [];

/** ID到附属建筑的映射 */
export const SUBSIDIARIES_BY_ID: Map<number, SubsidiaryBuildingDef> = new Map();

/** 建筑类型到可用附属建筑的映射 */
export const SUBSIDIARIES_BY_BUILDING_TYPE: Map<number, SubsidiaryBuildingDef[]> = new Map();

/** 是否已初始化 */
let isInitialized = false;

/**
 * 清空注册表（用于重新初始化）
 */
export function clearSubsidiaryRegistry(): void {
  ALL_SUBSIDIARIES.length = 0;
  SUBSIDIARIES_BY_ID.clear();
  SUBSIDIARIES_BY_BUILDING_TYPE.clear();
  isInitialized = false;
}

/**
 * 注册附属建筑
 */
export function registerSubsidiary(def: SubsidiaryBuildingDef): void {
  // 检查是否已注册（防止重复）
  if (SUBSIDIARIES_BY_ID.has(def.id)) {
    return;
  }
  
  ALL_SUBSIDIARIES.push(def);
  SUBSIDIARIES_BY_ID.set(def.id, def);
  
  // 建立建筑类型到附属建筑的映射
  for (const buildingTypeId of def.applicableBuildingTypes) {
    const existing = SUBSIDIARIES_BY_BUILDING_TYPE.get(buildingTypeId) || [];
    existing.push(def);
    SUBSIDIARIES_BY_BUILDING_TYPE.set(buildingTypeId, existing);
  }
}

/**
 * 批量注册附属建筑
 */
export function registerSubsidiaries(defs: SubsidiaryBuildingDef[]): void {
  // 如果已初始化，先清空
  if (isInitialized) {
    clearSubsidiaryRegistry();
  }
  
  for (const def of defs) {
    registerSubsidiary(def);
  }
  
  isInitialized = true;
}

// ==================== 工具函数 ====================

/**
 * 获取建筑类型可用的附属建筑列表
 */
export function getAvailableSubsidiaries(
  buildingTypeId: number,
  buildingLevel: number
): SubsidiaryBuildingDef[] {
  const all = SUBSIDIARIES_BY_BUILDING_TYPE.get(buildingTypeId) || [];
  return all.filter(sub => sub.requiredBuildingLevel <= buildingLevel);
}

/**
 * 获取附属建筑定义
 */
export function getSubsidiaryDef(subsidiaryId: number): SubsidiaryBuildingDef | undefined {
  return SUBSIDIARIES_BY_ID.get(subsidiaryId);
}

/**
 * 获取附属建筑类别名称
 */
export function getCategoryName(category: SubsidiaryCategory): string {
  const names: Record<SubsidiaryCategory, string> = {
    'production': '生产增强',
    'efficiency': '效率优化',
    'quality': '品质提升',
    'capacity': '容量扩展',
    'specialized': '专业特化',
  };
  return names[category];
}

/**
 * 获取附属建筑类别图标
 */
export function getCategoryIcon(category: SubsidiaryCategory): string {
  const icons: Record<SubsidiaryCategory, string> = {
    'production': '⚡',
    'efficiency': '🔧',
    'quality': '⭐',
    'capacity': '📦',
    'specialized': '🎯',
  };
  return icons[category];
}

/**
 * 获取附属建筑类别颜色
 */
export function getCategoryColor(category: SubsidiaryCategory): string {
  const colors: Record<SubsidiaryCategory, string> = {
    'production': 'text-yellow-400',
    'efficiency': 'text-blue-400',
    'quality': 'text-purple-400',
    'capacity': 'text-green-400',
    'specialized': 'text-orange-400',
  };
  return colors[category];
}

// ==================== 效果计算 ====================

/**
 * 计算建筑的综合附属建筑效果
 */
export function calculateCombinedEffects(
  world: GameWorld,
  buildingId: number
): CombinedSubsidiaryEffects {
  const result: CombinedSubsidiaryEffects = {
    outputMultiplier: 1.0,
    inputReduction: 0,
    speedMultiplier: 1.0,
    qualityBonus: 0,
    defectReduction: 0,
    laborReduction: 0,
    energyReduction: 0,
    maintenanceReduction: 0,
    storageCapacity: 0,
    bufferCapacity: 0,
    bonusOutputs: [],
    specificGoodsBonus: new Map(),
  };
  
  const b = world.buildings;
  const subsidiaryOffset = buildingId * MAX_SUBSIDIARIES;
  const count = b.subsidiaryCount[buildingId];
  
  for (let i = 0; i < count; i++) {
    const subId = b.subsidiaryIds[subsidiaryOffset + i];
    const condition = b.subsidiaryConditions[subsidiaryOffset + i];
    
    if (subId === 0 || condition <= 0) continue;
    
    const def = SUBSIDIARIES_BY_ID.get(subId);
    if (!def) continue;
    
    const effects = def.effects;
    const effectMultiplier = condition; // 状态影响效果强度
    
    // 累加效果（乘法效果用乘积，加法效果用累加）
    if (effects.outputMultiplier) {
      result.outputMultiplier *= 1 + (effects.outputMultiplier - 1) * effectMultiplier;
    }
    if (effects.inputReduction) {
      result.inputReduction += effects.inputReduction * effectMultiplier;
    }
    if (effects.speedMultiplier) {
      result.speedMultiplier *= 1 + (effects.speedMultiplier - 1) * effectMultiplier;
    }
    if (effects.qualityBonus) {
      result.qualityBonus += effects.qualityBonus * effectMultiplier;
    }
    if (effects.defectReduction) {
      result.defectReduction += effects.defectReduction * effectMultiplier;
    }
    if (effects.laborReduction) {
      result.laborReduction += effects.laborReduction * effectMultiplier;
    }
    if (effects.energyReduction) {
      result.energyReduction += effects.energyReduction * effectMultiplier;
    }
    if (effects.maintenanceReduction) {
      result.maintenanceReduction += effects.maintenanceReduction * effectMultiplier;
    }
    if (effects.storageCapacity) {
      result.storageCapacity += effects.storageCapacity * effectMultiplier;
    }
    if (effects.bufferCapacity) {
      result.bufferCapacity += effects.bufferCapacity * effectMultiplier;
    }
    
    // 额外产出
    if (effects.bonusOutputChance && effects.bonusOutputGoods !== undefined) {
      result.bonusOutputs.push({
        goodsId: effects.bonusOutputGoods,
        chance: effects.bonusOutputChance * effectMultiplier,
        amount: effects.bonusOutputAmount || 1,
      });
    }
    
    // 特定商品加成
    if (effects.specificGoodsBonus) {
      for (const bonus of effects.specificGoodsBonus) {
        const current = result.specificGoodsBonus.get(bonus.goodsId) || 1.0;
        result.specificGoodsBonus.set(
          bonus.goodsId,
          current * (1 + (bonus.multiplier - 1) * effectMultiplier)
        );
      }
    }
  }
  
  // 限制最大减少比例
  result.inputReduction = Math.min(result.inputReduction, 0.5);
  result.laborReduction = Math.min(result.laborReduction, 0.5);
  result.energyReduction = Math.min(result.energyReduction, 0.5);
  result.maintenanceReduction = Math.min(result.maintenanceReduction, 0.5);
  result.defectReduction = Math.min(result.defectReduction, 0.8);
  
  return result;
}

// ==================== 安装和管理 ====================

/**
 * 检查是否可以安装附属建筑
 */
export function canInstallSubsidiary(
  world: GameWorld,
  buildingId: number,
  subsidiaryId: number
): { canInstall: boolean; reason?: string } {
  const b = world.buildings;
  
  // 检查建筑是否存在
  if (buildingId >= b.count) {
    return { canInstall: false, reason: '建筑不存在' };
  }
  
  // 获取附属建筑定义
  const def = SUBSIDIARIES_BY_ID.get(subsidiaryId);
  if (!def) {
    return { canInstall: false, reason: '附属建筑不存在' };
  }
  
  // 检查建筑类型是否适用
  const buildingTypeId = b.types[buildingId];
  if (!def.applicableBuildingTypes.includes(buildingTypeId)) {
    return { canInstall: false, reason: '此附属建筑不适用于该建筑类型' };
  }
  
  // 检查建筑等级
  const buildingLevel = b.levels[buildingId];
  if (buildingLevel < def.requiredBuildingLevel) {
    return { canInstall: false, reason: `需要建筑等级 ${def.requiredBuildingLevel}` };
  }
  
  // 检查槽位
  const usedSlots = getUsedSubsidiarySlots(world, buildingId);
  const totalSlots = getTotalSubsidiarySlots(buildingLevel);
  if (usedSlots + def.slots > totalSlots) {
    return { canInstall: false, reason: `槽位不足，需要 ${def.slots} 个槽位` };
  }
  
  // 检查同类型数量限制
  const count = getSubsidiaryCount(world, buildingId, subsidiaryId);
  if (count >= def.maxPerBuilding) {
    return { canInstall: false, reason: `每个建筑最多安装 ${def.maxPerBuilding} 个` };
  }
  
  // 检查互斥
  if (def.exclusiveWith && def.exclusiveWith.length > 0) {
    const installed = getInstalledSubsidiaries(world, buildingId);
    for (const instSub of installed) {
      if (def.exclusiveWith.includes(instSub.subsidiaryId)) {
        const exDef = SUBSIDIARIES_BY_ID.get(instSub.subsidiaryId);
        return { canInstall: false, reason: `与「${exDef?.name || '其他设施'}」互斥` };
      }
    }
  }
  
  return { canInstall: true };
}

/**
 * 安装附属建筑
 */
export function installSubsidiary(
  world: GameWorld,
  buildingId: number,
  subsidiaryId: number
): { success: boolean; reason?: string } {
  const check = canInstallSubsidiary(world, buildingId, subsidiaryId);
  if (!check.canInstall) {
    return { success: false, reason: check.reason };
  }
  
  const b = world.buildings;
  const subsidiaryOffset = buildingId * MAX_SUBSIDIARIES;
  
  // 找到空槽位
  let slotIndex = -1;
  for (let i = 0; i < MAX_SUBSIDIARIES; i++) {
    if (b.subsidiaryIds[subsidiaryOffset + i] === 0) {
      slotIndex = i;
      break;
    }
  }
  
  if (slotIndex === -1) {
    return { success: false, reason: '没有可用槽位' };
  }
  
  // 安装
  b.subsidiaryIds[subsidiaryOffset + slotIndex] = subsidiaryId;
  b.subsidiaryConditions[subsidiaryOffset + slotIndex] = 1.0;
  b.subsidiaryInstalledTicks[subsidiaryOffset + slotIndex] = world.tick;
  b.subsidiaryCount[buildingId]++;
  
  return { success: true };
}

/**
 * 卸载附属建筑
 */
export function uninstallSubsidiary(
  world: GameWorld,
  buildingId: number,
  slotIndex: number
): { success: boolean; reason?: string } {
  const b = world.buildings;
  
  if (buildingId >= b.count) {
    return { success: false, reason: '建筑不存在' };
  }
  
  if (slotIndex < 0 || slotIndex >= MAX_SUBSIDIARIES) {
    return { success: false, reason: '无效的槽位' };
  }
  
  const subsidiaryOffset = buildingId * MAX_SUBSIDIARIES;
  
  if (b.subsidiaryIds[subsidiaryOffset + slotIndex] === 0) {
    return { success: false, reason: '该槽位没有附属建筑' };
  }
  
  // 卸载
  b.subsidiaryIds[subsidiaryOffset + slotIndex] = 0;
  b.subsidiaryConditions[subsidiaryOffset + slotIndex] = 0;
  b.subsidiaryInstalledTicks[subsidiaryOffset + slotIndex] = 0;
  b.subsidiaryCount[buildingId]--;
  
  return { success: true };
}

/**
 * 获取建筑已安装的附属建筑列表
 */
export function getInstalledSubsidiaries(
  world: GameWorld,
  buildingId: number
): Array<InstalledSubsidiary & { slotIndex: number; def: SubsidiaryBuildingDef | undefined }> {
  const b = world.buildings;
  const result: Array<InstalledSubsidiary & { slotIndex: number; def: SubsidiaryBuildingDef | undefined }> = [];
  
  if (buildingId >= b.count) return result;
  
  const subsidiaryOffset = buildingId * MAX_SUBSIDIARIES;
  
  for (let i = 0; i < MAX_SUBSIDIARIES; i++) {
    const subId = b.subsidiaryIds[subsidiaryOffset + i];
    if (subId > 0) {
      result.push({
        slotIndex: i,
        subsidiaryId: subId,
        installedTick: b.subsidiaryInstalledTicks[subsidiaryOffset + i],
        condition: b.subsidiaryConditions[subsidiaryOffset + i],
        def: SUBSIDIARIES_BY_ID.get(subId),
      });
    }
  }
  
  return result;
}

/**
 * 获取指定附属建筑的安装数量
 */
export function getSubsidiaryCount(
  world: GameWorld,
  buildingId: number,
  subsidiaryId: number
): number {
  const b = world.buildings;
  const subsidiaryOffset = buildingId * MAX_SUBSIDIARIES;
  
  let count = 0;
  for (let i = 0; i < MAX_SUBSIDIARIES; i++) {
    if (b.subsidiaryIds[subsidiaryOffset + i] === subsidiaryId) {
      count++;
    }
  }
  
  return count;
}

/**
 * 获取已使用的槽位数
 */
export function getUsedSubsidiarySlots(world: GameWorld, buildingId: number): number {
  const installed = getInstalledSubsidiaries(world, buildingId);
  return installed.reduce((sum, sub) => sum + (sub.def?.slots || 1), 0);
}

/**
 * 获取建筑的总槽位数
 * 基础5个，每升级增加1个
 */
export function getTotalSubsidiarySlots(buildingLevel: number): number {
  return 5 + (buildingLevel - 1);
}

/**
 * 获取建筑的空闲槽位数
 */
export function getAvailableSubsidiarySlots(world: GameWorld, buildingId: number): number {
  const b = world.buildings;
  const level = b.levels[buildingId];
  const total = getTotalSubsidiarySlots(level);
  const used = getUsedSubsidiarySlots(world, buildingId);
  return total - used;
}

/**
 * 更新附属建筑状态（每tick调用）
 * 状态会缓慢衰减，需要维护
 */
export function updateSubsidiaryConditions(world: GameWorld): void {
  const b = world.buildings;
  
  for (let i = 0; i < b.count; i++) {
    const subsidiaryOffset = i * MAX_SUBSIDIARIES;
    
    for (let j = 0; j < MAX_SUBSIDIARIES; j++) {
      const subId = b.subsidiaryIds[subsidiaryOffset + j];
      if (subId === 0) continue;
      
      // 每天衰减约0.1%（每tick约0.004%）
      const decay = 0.00004;
      b.subsidiaryConditions[subsidiaryOffset + j] = Math.max(
        0.5, // 最低50%效率
        b.subsidiaryConditions[subsidiaryOffset + j] - decay
      );
    }
  }
}

/**
 * 计算维修成本（不执行维修）
 */
export function calculateRepairCost(
  world: GameWorld,
  buildingId: number,
  slotIndex: number
): { canRepair: boolean; cost: number; reason?: string } {
  const b = world.buildings;
  const subsidiaryOffset = buildingId * MAX_SUBSIDIARIES;
  
  const subId = b.subsidiaryIds[subsidiaryOffset + slotIndex];
  if (subId === 0) {
    return { canRepair: false, cost: 0, reason: '没有附属建筑' };
  }
  
  const def = SUBSIDIARIES_BY_ID.get(subId);
  if (!def) {
    return { canRepair: false, cost: 0, reason: '附属建筑定义不存在' };
  }
  
  const currentCondition = b.subsidiaryConditions[subsidiaryOffset + slotIndex];
  if (currentCondition >= 0.99) {
    return { canRepair: false, cost: 0, reason: '状态良好，无需维修' };
  }
  
  // 维修成本 = 建造成本 * (1 - 当前状态) * 0.3
  const cost = def.buildCost * (1 - currentCondition) * 0.3;
  
  return { canRepair: true, cost };
}

/**
 * 执行维修附属建筑
 */
export function repairSubsidiary(
  world: GameWorld,
  buildingId: number,
  slotIndex: number
): { success: boolean; cost: number; reason?: string } {
  const costResult = calculateRepairCost(world, buildingId, slotIndex);
  
  if (!costResult.canRepair) {
    return { success: false, cost: 0, reason: costResult.reason };
  }
  
  const b = world.buildings;
  const subsidiaryOffset = buildingId * MAX_SUBSIDIARIES;
  
  // 恢复到100%
  b.subsidiaryConditions[subsidiaryOffset + slotIndex] = 1.0;
  
  return { success: true, cost: costResult.cost };
}

/**
 * 计算建筑附属建筑的每日维护成本
 */
export function calculateDailySubsidiaryMaintenance(
  world: GameWorld,
  buildingId: number
): number {
  const installed = getInstalledSubsidiaries(world, buildingId);
  return installed.reduce((sum, sub) => sum + (sub.def?.dailyMaintenance || 0), 0);
}

// ==================== 辅助函数 ====================

/**
 * 格式化效果描述
 */
export function formatEffectDescription(effects: SubsidiaryEffects): string[] {
  const descriptions: string[] = [];
  
  if (effects.outputMultiplier && effects.outputMultiplier !== 1) {
    const pct = ((effects.outputMultiplier - 1) * 100).toFixed(0);
    descriptions.push(`产出 ${Number(pct) >= 0 ? '+' : ''}${pct}%`);
  }
  if (effects.inputReduction && effects.inputReduction > 0) {
    descriptions.push(`消耗 -${(effects.inputReduction * 100).toFixed(0)}%`);
  }
  if (effects.speedMultiplier && effects.speedMultiplier !== 1) {
    const pct = ((effects.speedMultiplier - 1) * 100).toFixed(0);
    descriptions.push(`速度 ${Number(pct) >= 0 ? '+' : ''}${pct}%`);
  }
  if (effects.qualityBonus && effects.qualityBonus > 0) {
    descriptions.push(`品质 +${effects.qualityBonus.toFixed(2)}`);
  }
  if (effects.defectReduction && effects.defectReduction > 0) {
    descriptions.push(`缺陷 -${(effects.defectReduction * 100).toFixed(0)}%`);
  }
  if (effects.laborReduction && effects.laborReduction > 0) {
    descriptions.push(`人工 -${(effects.laborReduction * 100).toFixed(0)}%`);
  }
  if (effects.energyReduction && effects.energyReduction > 0) {
    descriptions.push(`能耗 -${(effects.energyReduction * 100).toFixed(0)}%`);
  }
  if (effects.maintenanceReduction && effects.maintenanceReduction > 0) {
    descriptions.push(`维护 -${(effects.maintenanceReduction * 100).toFixed(0)}%`);
  }
  if (effects.storageCapacity && effects.storageCapacity > 0) {
    descriptions.push(`存储 +${effects.storageCapacity}`);
  }
  if (effects.bufferCapacity && effects.bufferCapacity > 0) {
    descriptions.push(`缓冲 +${effects.bufferCapacity}`);
  }
  if (effects.bonusOutputChance && effects.bonusOutputGoods !== undefined) {
    descriptions.push(`${(effects.bonusOutputChance * 100).toFixed(0)}%几率额外产出`);
  }
  
  return descriptions;
}

/**
 * 获取效果的类型标签
 */
export function getEffectTags(effects: SubsidiaryEffects): Array<{ text: string; color: string }> {
  const tags: Array<{ text: string; color: string }> = [];
  
  if (effects.outputMultiplier && effects.outputMultiplier > 1) {
    tags.push({ text: '增产', color: 'bg-yellow-500/20 text-yellow-400' });
  }
  if (effects.qualityBonus && effects.qualityBonus > 0) {
    tags.push({ text: '提质', color: 'bg-purple-500/20 text-purple-400' });
  }
  if (effects.laborReduction || effects.energyReduction) {
    tags.push({ text: '节能', color: 'bg-green-500/20 text-green-400' });
  }
  if (effects.storageCapacity || effects.bufferCapacity) {
    tags.push({ text: '扩容', color: 'bg-blue-500/20 text-blue-400' });
  }
  if (effects.bonusOutputChance) {
    tags.push({ text: '副产', color: 'bg-orange-500/20 text-orange-400' });
  }
  
  return tags;
}