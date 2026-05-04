/**
 * 生产方式注册中心（Vic3 风格）
 * - method 携带 input/output/workforce/energy delta（绝对值）
 * - 选定 slot 的 method 后，建筑实际配方 = 所有 method 的 delta 求和
 */

import {
  EMPTY_WORKFORCE_DEMAND,
  cloneWorkforceDemand,
  type WorkforceDemand,
} from '@/core/labor/LaborSystem';
import { TICKS_PER_DAY } from '@/core/constants';
import {
  BuildingMethodConfig,
  BuildingSlotType,
  BuildingProductionMethod,
  ComputedRecipe,
  RecipeDelta,
  getMethodIdBase,
} from './types';
import { GoodsId } from '@/data/goods';

export const buildingConfigs: Map<number, BuildingMethodConfig> = new Map();
export const methodsById: Map<number, BuildingProductionMethod> = new Map();
export const methodsBySlot: Map<string, BuildingProductionMethod[]> = new Map();

export function registerBuildingConfig(config: BuildingMethodConfig): void {
  const existingConfig = buildingConfigs.get(config.buildingTypeId);
  if (existingConfig) {
    for (const method of existingConfig.methods) {
      methodsById.delete(method.id);
      const slotKey = `${existingConfig.buildingTypeId}:${method.slotId}`;
      methodsBySlot.delete(slotKey);
    }
  }

  buildingConfigs.set(config.buildingTypeId, config);

  for (const method of config.methods) {
    if (!methodsById.has(method.id)) {
      methodsById.set(method.id, method);
    }
    const slotKey = `${config.buildingTypeId}:${method.slotId}`;
    const existing = methodsBySlot.get(slotKey) || [];
    if (!existing.some((m) => m.id === method.id)) {
      existing.push(method);
    }
    methodsBySlot.set(slotKey, existing);
  }
}

export function registerBuildingConfigs(configs: BuildingMethodConfig[]): void {
  for (const config of configs) {
    registerBuildingConfig(config);
  }
}

export function getBuildingConfig(buildingTypeId: number): BuildingMethodConfig | null {
  return buildingConfigs.get(buildingTypeId) || null;
}

export function getBuildingSlots(buildingTypeId: number): BuildingSlotType[] {
  const config = buildingConfigs.get(buildingTypeId);
  return config?.slots || [];
}

export function getSlotMethods(buildingTypeId: number, slotId: string): BuildingProductionMethod[] {
  const key = `${buildingTypeId}:${slotId}`;
  return methodsBySlot.get(key) || [];
}

export function getMethodById(methodId: number): BuildingProductionMethod | null {
  return methodsById.get(methodId) || null;
}

export function getDefaultMethods(buildingTypeId: number): Record<string, number> {
  const config = buildingConfigs.get(buildingTypeId);
  return config?.defaultMethods || {};
}

export function isMethodAvailable(
  buildingTypeId: number,
  methodId: number,
  buildingLevel: number,
): boolean {
  const method = methodsById.get(methodId);
  if (!method) return false;
  if (method.buildingTypeId !== buildingTypeId) return false;
  if (method.requiredLevel > buildingLevel) return false;
  return true;
}

const EMPTY_RECIPE: ComputedRecipe = {
  inputs: [],
  outputs: [],
  workforceRequired: cloneWorkforceDemand(EMPTY_WORKFORCE_DEMAND),
  energyRequired: 0,
  ticksRequired: TICKS_PER_DAY,
};

function createEmptyRecipe(): ComputedRecipe {
  return {
    inputs: [],
    outputs: [],
    workforceRequired: cloneWorkforceDemand(EMPTY_WORKFORCE_DEMAND),
    energyRequired: 0,
    ticksRequired: TICKS_PER_DAY,
  };
}

function cloneWorkforceDelta(demand: WorkforceDemand): WorkforceDemand {
  return {
    basic: Number.isFinite(demand.basic) ? demand.basic : 0,
    technical: Number.isFinite(demand.technical) ? demand.technical : 0,
    management: Number.isFinite(demand.management) ? demand.management : 0,
  };
}

/**
 * 计算建筑选定 method 后的实际配方（线性求和）
 */
export function computeRecipe(
  buildingTypeId: number,
  selectedMethods: Record<string, number>,
): ComputedRecipe {
  const config = buildingConfigs.get(buildingTypeId);
  if (!config) return createEmptyRecipe();

  const inputMap = new Map<number, number>();
  const outputMap = new Map<number, number>();
  let workforce: WorkforceDemand = { ...EMPTY_WORKFORCE_DEMAND };
  let energy = 0;
  let ticksRequired = 0;

  for (const slotId of Object.keys(selectedMethods)) {
    const methodId = selectedMethods[slotId];
    if (!methodId) continue;
    const method = methodsById.get(methodId);
    if (!method || method.buildingTypeId !== buildingTypeId) continue;

    for (const d of method.inputDelta) {
      inputMap.set(d.goodsId, (inputMap.get(d.goodsId) ?? 0) + d.amount);
    }
    for (const d of method.outputDelta) {
      outputMap.set(d.goodsId, (outputMap.get(d.goodsId) ?? 0) + d.amount);
    }
    workforce = {
      basic: workforce.basic + method.workforceDelta.basic,
      technical: workforce.technical + method.workforceDelta.technical,
      management: workforce.management + method.workforceDelta.management,
    };
    energy += method.energyDelta;
    ticksRequired = Math.max(ticksRequired, method.ticksRequired);
  }

  const energyRequired = Math.max(0, energy);
  const producesElectricity = (outputMap.get(GoodsId.ELECTRICITY) ?? 0) > 0;
  if (energyRequired > 0 && !producesElectricity) {
    inputMap.set(
      GoodsId.ELECTRICITY,
      (inputMap.get(GoodsId.ELECTRICITY) ?? 0) + energyRequired,
    );
  }

  return {
    inputs: [...inputMap.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([goodsId, amount]) => ({ goodsId, amount })),
    outputs: [...outputMap.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([goodsId, amount]) => ({ goodsId, amount })),
    workforceRequired: cloneWorkforceDemand(workforce),
    energyRequired,
    ticksRequired: Math.max(TICKS_PER_DAY, ticksRequired),
  };
}

// ==================== 辅助构建函数 ====================

export function createSlot(
  buildingTypeId: number,
  id: string,
  name: string,
  icon: string,
  description: string,
  order: number = 0,
): BuildingSlotType {
  return { id, buildingTypeId, name, icon, description, order };
}

export interface CreateMethodOptions {
  inputDelta?: RecipeDelta[];
  outputDelta?: RecipeDelta[];
  workforceDelta?: WorkforceDemand;
  energyDelta?: number;
  ticksRequired?: number;
  requiredLevel?: number;
  switchCost?: number;
  switchCooldown?: number;
  description?: string;
}

export function createMethod(
  buildingTypeId: number,
  localId: number,
  slotId: string,
  key: string,
  name: string,
  options: CreateMethodOptions = {},
): BuildingProductionMethod {
  const baseId = getMethodIdBase(buildingTypeId);
  return {
    id: baseId + localId,
    key,
    name,
    buildingTypeId,
    slotId,
    inputDelta: options.inputDelta ?? [],
    outputDelta: options.outputDelta ?? [],
    workforceDelta: cloneWorkforceDelta(options.workforceDelta ?? EMPTY_WORKFORCE_DEMAND),
    energyDelta: options.energyDelta ?? 0,
    ticksRequired: options.ticksRequired ?? TICKS_PER_DAY,
    requiredLevel: options.requiredLevel ?? 1,
    switchCost: options.switchCost ?? 50000,
    switchCooldown: options.switchCooldown ?? 24,
    description: options.description ?? '',
  };
}

export function createBuildingConfig(
  buildingTypeId: number,
  slots: BuildingSlotType[],
  methods: BuildingProductionMethod[],
  defaultMethods?: Record<string, number>,
): BuildingMethodConfig {
  const defaults = defaultMethods ?? {};
  if (!defaultMethods) {
    for (const slot of slots) {
      const slotMethods = methods.filter((m) => m.slotId === slot.id);
      if (slotMethods.length > 0) {
        defaults[slot.id] = slotMethods[0].id;
      }
    }
  }
  return { buildingTypeId, slots, methods, defaultMethods: defaults };
}

export function getRegisteredBuildingCount(): number {
  return buildingConfigs.size;
}

export function getRegisteredMethodCount(): number {
  return methodsById.size;
}

export function getRegisteredBuildingIds(): number[] {
  return Array.from(buildingConfigs.keys());
}

export function clearRegistry(): void {
  buildingConfigs.clear();
  methodsById.clear();
  methodsBySlot.clear();
}
