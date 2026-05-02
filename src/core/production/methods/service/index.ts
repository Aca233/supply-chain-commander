/**
 * 服务类建筑生产方式（ID 39）
 * 使用静态默认配置目录注册单槽位生产方式。
 */

import { BuildingMethodConfig } from '../types';
import { registerBuildingConfigs } from '../registry';
import { BuildingId } from '../../../../data/buildings';
import { getDefaultBuildingMethodConfig } from '../defaultConfigs';

const SERVICE_BUILDING_IDS = [BuildingId.POWER_PLANT];

export const SERVICE_CONFIGS: BuildingMethodConfig[] =
  SERVICE_BUILDING_IDS.map(getDefaultBuildingMethodConfig);

export function registerServiceMethods(): void {
  registerBuildingConfigs(SERVICE_CONFIGS);
}
