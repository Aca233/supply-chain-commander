/**
 * 生产方式注册中心
 * 管理所有建筑的专属生产方式配置
 */

import {
  BuildingMethodConfig,
  BuildingSlotType,
  BuildingProductionMethod,
  ComputedModifiers,
  getMethodIdBase,
} from './types';

// ==================== 全局注册表 ====================

/** 按建筑类型ID索引的配置表 */
export const buildingConfigs: Map<number, BuildingMethodConfig> = new Map();

/** 按方式ID索引的方式表（用于快速查找） */
export const methodsById: Map<number, BuildingProductionMethod> = new Map();

/** 按建筑类型ID和槽位ID索引的方式列表 */
export const methodsBySlot: Map<string, BuildingProductionMethod[]> = new Map();

// ==================== 注册函数 ====================

/**
 * 注册建筑的生产方式配置
 */
export function registerBuildingConfig(config: BuildingMethodConfig): void {
  buildingConfigs.set(config.buildingTypeId, config);
  
  // 索引所有方式
  for (const method of config.methods) {
    methodsById.set(method.id, method);
    
    // 按槽位分组
    const slotKey = `${config.buildingTypeId}:${method.slotId}`;
    const existing = methodsBySlot.get(slotKey) || [];
    existing.push(method);
    methodsBySlot.set(slotKey, existing);
  }
}

/**
 * 批量注册多个配置
 */
export function registerBuildingConfigs(configs: BuildingMethodConfig[]): void {
  for (const config of configs) {
    registerBuildingConfig(config);
  }
}

// ==================== 查询函数 ====================

/**
 * 获取建筑的配置
 */
export function getBuildingConfig(buildingTypeId: number): BuildingMethodConfig | null {
  return buildingConfigs.get(buildingTypeId) || null;
}

/**
 * 获取建筑的所有槽位
 */
export function getBuildingSlots(buildingTypeId: number): BuildingSlotType[] {
  const config = buildingConfigs.get(buildingTypeId);
  return config?.slots || [];
}

/**
 * 获取建筑某个槽位可用的方式列表
 */
export function getSlotMethods(buildingTypeId: number, slotId: string): BuildingProductionMethod[] {
  const key = `${buildingTypeId}:${slotId}`;
  return methodsBySlot.get(key) || [];
}

/**
 * 获取单个方式详情
 */
export function getMethodById(methodId: number): BuildingProductionMethod | null {
  return methodsById.get(methodId) || null;
}

/**
 * 获取建筑的默认方式配置
 */
export function getDefaultMethods(buildingTypeId: number): Record<string, number> {
  const config = buildingConfigs.get(buildingTypeId);
  return config?.defaultMethods || {};
}

/**
 * 检查方式是否对建筑可用
 */
export function isMethodAvailable(
  buildingTypeId: number,
  methodId: number,
  buildingLevel: number
): boolean {
  const method = methodsById.get(methodId);
  if (!method) return false;
  if (method.buildingTypeId !== buildingTypeId) return false;
  if (method.requiredLevel > buildingLevel) return false;
  return true;
}

// ==================== 计算函数 ====================

/**
 * 计算建筑的综合修正
 * @param buildingTypeId 建筑类型ID
 * @param selectedMethods 已选方式 { slotId: methodId }
 */
export function computeModifiers(
  buildingTypeId: number,
  selectedMethods: Record<string, number>
): ComputedModifiers {
  const result: ComputedModifiers = {
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    allInputMultiplier: 1.0,
    allOutputMultiplier: 1.0,
    laborMultiplier: 1.0,
    energyMultiplier: 1.0,
    maintenanceMultiplier: 1.0,
    qualityBonus: 0,
    pollutionMultiplier: 1.0,
    productionSpeedMultiplier: 1.0,
    byproducts: [],
  };
  
  // 遍历所有选中的方式
  for (const slotId of Object.keys(selectedMethods)) {
    const methodId = selectedMethods[slotId];
    if (!methodId) continue;
    
    const method = methodsById.get(methodId);
    if (!method || method.buildingTypeId !== buildingTypeId) continue;
    
    // 应用输入修正
    for (const mod of method.inputModifiers) {
      if (mod.goodsId === 'all') {
        result.allInputMultiplier *= mod.multiplier;
      } else {
        const current = result.inputMultipliers.get(mod.goodsId) ?? 1.0;
        result.inputMultipliers.set(mod.goodsId, current * mod.multiplier);
      }
    }
    
    // 应用输出修正
    for (const mod of method.outputModifiers) {
      if (mod.goodsId === 'all') {
        result.allOutputMultiplier *= mod.multiplier;
      } else {
        const current = result.outputMultipliers.get(mod.goodsId) ?? 1.0;
        result.outputMultipliers.set(mod.goodsId, current * mod.multiplier);
      }
    }
    
    // 应用成本修正（乘法叠加）
    result.laborMultiplier *= method.laborMultiplier;
    result.energyMultiplier *= method.energyMultiplier;
    result.maintenanceMultiplier *= method.maintenanceMultiplier;
    
    // 品质加成（加法叠加）
    result.qualityBonus += method.qualityBonus;
    
    // 污染和速度修正（乘法叠加）
    result.pollutionMultiplier *= method.pollutionMultiplier;
    result.productionSpeedMultiplier *= method.productionSpeedMultiplier;
    
    // 副产品
    if (method.byproductChance && method.byproductGoodsId !== undefined) {
      result.byproducts.push({
        goodsId: method.byproductGoodsId,
        chance: method.byproductChance,
        amount: method.byproductAmount || 1,
      });
    }
  }
  
  return result;
}

/**
 * 获取某商品的实际输入倍率
 */
export function getInputMultiplier(modifiers: ComputedModifiers, goodsId: number): number {
  const specific = modifiers.inputMultipliers.get(goodsId) ?? 1.0;
  return specific * modifiers.allInputMultiplier;
}

/**
 * 获取某商品的实际输出倍率
 */
export function getOutputMultiplier(modifiers: ComputedModifiers, goodsId: number): number {
  const specific = modifiers.outputMultipliers.get(goodsId) ?? 1.0;
  return specific * modifiers.allOutputMultiplier;
}

// ==================== 辅助构建函数 ====================

/**
 * 创建槽位定义的辅助函数
 */
export function createSlot(
  buildingTypeId: number,
  id: string,
  name: string,
  icon: string,
  description: string,
  order: number = 0
): BuildingSlotType {
  return {
    id,
    buildingTypeId,
    name,
    icon,
    description,
    order,
  };
}

/**
 * 创建方式定义的辅助函数
 */
export function createMethod(
  buildingTypeId: number,
  localId: number,  // 建筑内的本地ID（0-999）
  slotId: string,
  key: string,
  name: string,
  options: Partial<Omit<BuildingProductionMethod, 'id' | 'key' | 'name' | 'buildingTypeId' | 'slotId'>> = {}
): BuildingProductionMethod {
  const baseId = getMethodIdBase(buildingTypeId);
  
  return {
    id: baseId + localId,
    key,
    name,
    buildingTypeId,
    slotId,
    inputModifiers: options.inputModifiers || [],
    outputModifiers: options.outputModifiers || [],
    laborMultiplier: options.laborMultiplier ?? 1.0,
    energyMultiplier: options.energyMultiplier ?? 1.0,
    maintenanceMultiplier: options.maintenanceMultiplier ?? 1.0,
    qualityBonus: options.qualityBonus ?? 0,
    pollutionMultiplier: options.pollutionMultiplier ?? 1.0,
    productionSpeedMultiplier: options.productionSpeedMultiplier ?? 1.0,
    byproductChance: options.byproductChance,
    byproductGoodsId: options.byproductGoodsId,
    byproductAmount: options.byproductAmount,
    requiredLevel: options.requiredLevel ?? 1,
    requiredTech: options.requiredTech,
    switchCooldown: options.switchCooldown ?? 24,
    switchCost: options.switchCost ?? 50000,
    description: options.description || '',
    effects: options.effects || [],
  };
}

/**
 * 创建建筑配置的辅助函数
 */
export function createBuildingConfig(
  buildingTypeId: number,
  slots: BuildingSlotType[],
  methods: BuildingProductionMethod[],
  defaultMethods?: Record<string, number>
): BuildingMethodConfig {
  // 如果没有提供默认配置，则使用每个槽位的第一个方式
  const defaults = defaultMethods || {};
  if (!defaultMethods) {
    for (const slot of slots) {
      const slotMethods = methods.filter(m => m.slotId === slot.id);
      if (slotMethods.length > 0) {
        defaults[slot.id] = slotMethods[0].id;
      }
    }
  }
  
  return {
    buildingTypeId,
    slots,
    methods,
    defaultMethods: defaults,
  };
}

// ==================== 统计函数 ====================

/**
 * 获取已注册的建筑数量
 */
export function getRegisteredBuildingCount(): number {
  return buildingConfigs.size;
}

/**
 * 获取已注册的方式总数
 */
export function getRegisteredMethodCount(): number {
  return methodsById.size;
}

/**
 * 获取所有已注册的建筑类型ID
 */
export function getRegisteredBuildingIds(): number[] {
  return Array.from(buildingConfigs.keys());
}

/**
 * 清空注册表（用于测试）
 */
export function clearRegistry(): void {
  buildingConfigs.clear();
  methodsById.clear();
  methodsBySlot.clear();
}