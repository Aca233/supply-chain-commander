import {
  type BuildingProductionVariant,
  getBuildingProductionVariants,
  getDefaultSlotMethods,
} from './ProductionMethods';

export interface LegacyBuildingMethodSelection {
  outputModeId?: number;
  slotMethods?: number[];
}

export function getProductionVariantByLegacyOutputMode(
  buildingTypeId: number,
  outputModeId: number = 0,
): BuildingProductionVariant | null {
  const variants = getBuildingProductionVariants(buildingTypeId);
  const exactMatch = variants.find((variant) => variant.legacyOutputModeId === outputModeId);
  if (exactMatch) {
    return exactMatch;
  }
  return variants.find((variant) => variant.legacyOutputModeId === 0) ?? variants[0] ?? null;
}

export function resolveLegacyOutputModeToSlotMethods(
  buildingTypeId: number,
  outputModeId: number = 0,
): number[] {
  return (
    getProductionVariantByLegacyOutputMode(buildingTypeId, outputModeId)?.slotMethods
    ?? getDefaultSlotMethods(buildingTypeId)
  );
}

export function resolveLegacyBuildingMethodSelection(
  buildingTypeId: number,
  selection?: number | LegacyBuildingMethodSelection,
): number[] {
  if (selection === undefined) {
    return getDefaultSlotMethods(buildingTypeId);
  }

  if (typeof selection === 'number') {
    return resolveLegacyOutputModeToSlotMethods(buildingTypeId, selection);
  }

  if (selection.slotMethods && selection.slotMethods.length > 0) {
    return [...selection.slotMethods];
  }

  if (selection.outputModeId !== undefined) {
    return resolveLegacyOutputModeToSlotMethods(buildingTypeId, selection.outputModeId);
  }

  return getDefaultSlotMethods(buildingTypeId);
}
