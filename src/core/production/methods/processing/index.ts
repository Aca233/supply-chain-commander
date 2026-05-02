/**
 * 加工类建筑生产方式（ID 15-26）
 * 使用静态默认配置目录注册单槽位生产方式。
 */

import { BuildingMethodConfig } from '../types';
import { registerBuildingConfigs } from '../registry';
import { BuildingId } from '../../../../data/buildings';
import { getDefaultBuildingMethodConfig } from '../defaultConfigs';

const PROCESSING_BUILDING_IDS = [
  BuildingId.STEEL_MILL,
  BuildingId.NON_FERROUS_SMELTER,
  BuildingId.REFINERY,
  BuildingId.CHEMICAL_PLANT,
  BuildingId.GLASS_FACTORY,
  BuildingId.CEMENT_FACTORY,
  BuildingId.PAPER_MILL,
  BuildingId.TEXTILE_MILL,
  BuildingId.FOOD_FACTORY,
  BuildingId.MEAT_PROCESSING,
  BuildingId.DAIRY_FACTORY,
  BuildingId.BUILDING_MATERIALS_FACTORY,
];

export const PROCESSING_CONFIGS: BuildingMethodConfig[] =
  PROCESSING_BUILDING_IDS.map(getDefaultBuildingMethodConfig);

export function registerProcessingMethods(): void {
  registerBuildingConfigs(PROCESSING_CONFIGS);
}
