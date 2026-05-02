/**
 * 采掘类建筑生产方式（ID 0-14）
 * 使用静态默认配置目录注册单槽位生产方式。
 */

import { BuildingMethodConfig } from '../types';
import { registerBuildingConfigs } from '../registry';
import { BuildingId } from '../../../../data/buildings';
import { getDefaultBuildingMethodConfig } from '../defaultConfigs';

const EXTRACTION_BUILDING_IDS = [
  BuildingId.IRON_MINE,
  BuildingId.COPPER_MINE,
  BuildingId.ALUMINUM_MINE,
  BuildingId.COAL_MINE,
  BuildingId.OIL_FIELD,
  BuildingId.GAS_FIELD,
  BuildingId.SILICON_MINE,
  BuildingId.LITHIUM_MINE,
  BuildingId.RARE_EARTH_MINE,
  BuildingId.LOGGING_CAMP,
  BuildingId.FARM,
  BuildingId.RUBBER_PLANTATION,
  BuildingId.LIVESTOCK_FARM,
  BuildingId.FISHERY,
  BuildingId.HERB_FARM,
];

export const EXTRACTION_CONFIGS: BuildingMethodConfig[] =
  EXTRACTION_BUILDING_IDS.map(getDefaultBuildingMethodConfig);

export function registerExtractionMethods(): void {
  registerBuildingConfigs(EXTRACTION_CONFIGS);
}
