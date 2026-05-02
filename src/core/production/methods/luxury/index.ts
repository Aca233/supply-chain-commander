/**
 * 奢侈品类建筑生产方式（ID 37-38）
 * 使用静态默认配置目录注册单槽位生产方式。
 */

import { BuildingMethodConfig } from '../types';
import { registerBuildingConfigs } from '../registry';
import { BuildingId } from '../../../../data/buildings';
import { getDefaultBuildingMethodConfig } from '../defaultConfigs';

const LUXURY_BUILDING_IDS = [BuildingId.GOLD_REFINERY, BuildingId.LUXURY_WORKSHOP];

export const LUXURY_CONFIGS: BuildingMethodConfig[] =
  LUXURY_BUILDING_IDS.map(getDefaultBuildingMethodConfig);

export function registerLuxuryMethods(): void {
  registerBuildingConfigs(LUXURY_CONFIGS);
}
