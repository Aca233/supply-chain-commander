/**
 * 生产方式 facade（Vic3 风格）：
 * - 暴露注册体系；method 携带 delta（绝对值），建筑实际配方 = 选中 delta 求和
 */

import { EMPTY_WORKFORCE_DEMAND } from '@/core/labor/LaborSystem';
import * as MethodsRegistry from './methods';
import type { ComputedRecipe } from './methods/types';

export type {
  BuildingMethodConfig,
  BuildingSlotType,
  BuildingProductionMethod,
  RecipeDelta,
  ComputedRecipe,
} from './methods/types';

export interface BuildingProductionVariant {
  slotId: string;
  methodId: number;
  key: string;
  name: string;
  requiredLevel: number;
  slotMethods: number[];
  recipe: ComputedRecipe;
  legacyOutputModeId: number | null;
}

const EMPTY_RECIPE_BUILDER = (): ComputedRecipe => ({
  inputs: [],
  outputs: [],
  workforceRequired: { ...EMPTY_WORKFORCE_DEMAND },
  energyRequired: 0,
  ticksRequired: 1,
});

export function initializeBuildingProductionMethods(): void {
  if (MethodsRegistry.isProductionMethodsInitialized()) {
    return;
  }
  MethodsRegistry.initializeProductionMethods();
}

export function getBuildingConfig(buildingTypeId: number) {
  return MethodsRegistry.getBuildingConfig(buildingTypeId);
}

export function getBuildingSpecificSlots(buildingTypeId: number) {
  return MethodsRegistry.getBuildingSlots(buildingTypeId);
}

export function getSlotAvailableMethods(buildingTypeId: number, slotId: string) {
  return MethodsRegistry.getSlotMethods(buildingTypeId, slotId);
}

export function getBuildingDefaultMethods(buildingTypeId: number): Record<string, number> {
  return MethodsRegistry.getDefaultMethods(buildingTypeId);
}

export function getMethodById(methodId: number) {
  return MethodsRegistry.getMethodById(methodId);
}

export function getDefaultSlotMethods(buildingTypeId: number): number[] {
  const config = MethodsRegistry.getBuildingConfig(buildingTypeId);
  if (!config || !config.defaultMethods) return [];
  return Object.values(config.defaultMethods) as number[];
}

export function getBuildingSlotCount(buildingTypeId: number): number {
  const config = MethodsRegistry.getBuildingConfig(buildingTypeId);
  return config && config.slots ? config.slots.length : 0;
}

function normalizeSelectedMethods(
  buildingTypeId: number,
  selectedMethods: Record<string, number> | number[],
): Record<string, number> {
  if (!Array.isArray(selectedMethods)) {
    return selectedMethods;
  }
  const slots = MethodsRegistry.getBuildingSlots(buildingTypeId);
  const normalized: Record<string, number> = {};
  for (let i = 0; i < slots.length; i++) {
    const methodId = selectedMethods[i];
    if (methodId > 0) {
      normalized[slots[i].id] = methodId;
    }
  }
  return normalized;
}

function toSlotMethodArray(
  buildingTypeId: number,
  selectedMethods: Record<string, number>,
): number[] {
  const slots = MethodsRegistry.getBuildingSlots(buildingTypeId);
  return slots.map((slot) => selectedMethods[slot.id] ?? 0);
}

function deriveLegacyOutputModeId(
  method: ReturnType<typeof MethodsRegistry.getMethodById>,
  hasExplicitLegacyModes: boolean,
): number | null {
  if (!method || method.slotId !== 'production') {
    return null;
  }
  if (method.key.startsWith('default_')) {
    if (hasExplicitLegacyModes) {
      return null;
    }
    return 0;
  }
  const match = /^mode_\d+_(\d+)$/.exec(method.key);
  return match ? Number(match[1]) : null;
}

/** 计算建筑选定 method 后的实际配方 */
export function getRecipeForBuilding(
  buildingTypeId: number,
  selectedMethods: Record<string, number> | number[],
): ComputedRecipe {
  const config = MethodsRegistry.getBuildingConfig(buildingTypeId);
  if (!config) return EMPTY_RECIPE_BUILDER();
  const methodsRecord = normalizeSelectedMethods(buildingTypeId, selectedMethods);
  return MethodsRegistry.computeRecipe(buildingTypeId, methodsRecord);
}

export function getBuildingProductionVariants(buildingTypeId: number): BuildingProductionVariant[] {
  const config = MethodsRegistry.getBuildingConfig(buildingTypeId);
  if (!config || config.slots.length === 0) {
    return [];
  }

  const productionSlot = config.slots.find((slot) => slot.id === 'production') ?? config.slots[0];
  const slotMethods = MethodsRegistry.getSlotMethods(buildingTypeId, productionSlot.id);
  if (slotMethods.length === 0) {
    return [];
  }
  const hasExplicitLegacyModes = slotMethods.some((method) => /^mode_\d+_\d+$/.test(method.key));

  const baseSelection = { ...config.defaultMethods };

  return slotMethods.map((method) => {
    const selectedMethods = {
      ...baseSelection,
      [productionSlot.id]: method.id,
    };

    return {
      slotId: productionSlot.id,
      methodId: method.id,
      key: method.key,
      name: method.name,
      requiredLevel: method.requiredLevel,
      slotMethods: toSlotMethodArray(buildingTypeId, selectedMethods),
      recipe: MethodsRegistry.computeRecipe(buildingTypeId, selectedMethods),
      legacyOutputModeId: deriveLegacyOutputModeId(method, hasExplicitLegacyModes),
    };
  });
}

export function getMethodDetails(methodId: number): {
  name: string;
  description: string;
  requiredLevel: number;
  switchCost: number;
  switchCooldown: number;
} | null {
  const method = MethodsRegistry.getMethodById(methodId);
  if (!method) return null;
  return {
    name: method.name,
    description: method.description ?? '',
    requiredLevel: method.requiredLevel,
    switchCost: method.switchCost,
    switchCooldown: method.switchCooldown,
  };
}
