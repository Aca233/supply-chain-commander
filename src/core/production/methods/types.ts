/**
 * 建筑生产方式类型定义（Vic3 风格）
 * - 每个 method 携带一组 delta（input/output/labor/energy 的绝对值加减项）
 * - 选中所有 slot 的 method 后，建筑实际配方 = 所有 delta 的求和
 * - 没有任何百分比 modifier
 */

export interface BuildingSlotType {
  id: string;
  buildingTypeId: number;
  name: string;
  icon: string;
  description: string;
  order: number;
}

export interface RecipeDelta {
  goodsId: number;
  amount: number;
}

export interface BuildingProductionMethod {
  id: number;
  key: string;
  name: string;
  buildingTypeId: number;
  slotId: string;

  // 配方加减项：正=加项，负=减项；最终配方按 goodsId 求和后过滤 amount > 0
  inputDelta: RecipeDelta[];
  outputDelta: RecipeDelta[];
  laborDelta: number;
  energyDelta: number;
  ticksRequired: number;

  requiredLevel: number;
  switchCost: number;
  switchCooldown: number;
  description: string;
}

export interface BuildingMethodConfig {
  buildingTypeId: number;
  slots: BuildingSlotType[];
  methods: BuildingProductionMethod[];
  defaultMethods: Record<string, number>;
}

/** 求和后的建筑实际配方 */
export interface ComputedRecipe {
  inputs: { goodsId: number; amount: number }[];
  outputs: { goodsId: number; amount: number }[];
  laborRequired: number;
  energyRequired: number;
  ticksRequired: number;
}

export type GetBuildingConfigFn = (buildingTypeId: number) => BuildingMethodConfig | null;

export type ComputeRecipeFn = (
  buildingTypeId: number,
  selectedMethods: Record<string, number>,
) => ComputedRecipe;

// ==================== ID 范围 ====================

export const METHOD_ID_RANGES = {
  EXTRACTION_START: 10000,
  EXTRACTION_PER_BUILDING: 100,
  PROCESSING_START: 11500,
  PROCESSING_PER_BUILDING: 100,
  MANUFACTURING_START: 12700,
  MANUFACTURING_PER_BUILDING: 100,
  LUXURY_START: 13700,
  LUXURY_PER_BUILDING: 100,
  SERVICE_START: 13900,
  SERVICE_PER_BUILDING: 100,
};

export function getMethodIdBase(buildingTypeId: number): number {
  if (buildingTypeId <= 14) {
    return METHOD_ID_RANGES.EXTRACTION_START + buildingTypeId * METHOD_ID_RANGES.EXTRACTION_PER_BUILDING;
  } else if (buildingTypeId <= 26) {
    return METHOD_ID_RANGES.PROCESSING_START + (buildingTypeId - 15) * METHOD_ID_RANGES.PROCESSING_PER_BUILDING;
  } else if (buildingTypeId <= 36) {
    return METHOD_ID_RANGES.MANUFACTURING_START + (buildingTypeId - 27) * METHOD_ID_RANGES.MANUFACTURING_PER_BUILDING;
  } else if (buildingTypeId <= 38) {
    return METHOD_ID_RANGES.LUXURY_START + (buildingTypeId - 37) * METHOD_ID_RANGES.LUXURY_PER_BUILDING;
  } else {
    return METHOD_ID_RANGES.SERVICE_START + (buildingTypeId - 39) * METHOD_ID_RANGES.SERVICE_PER_BUILDING;
  }
}
