/**
 * 制造类建筑生产方式（ID 27-36）
 * 使用静态默认配置目录注册单槽位生产方式。
 */

import { BuildingMethodConfig } from '../types';
import { registerBuildingConfigs } from '../registry';
import { BuildingId } from '../../../../data/buildings';
import { getDefaultBuildingMethodConfig } from '../defaultConfigs';

const MANUFACTURING_BUILDING_IDS = [
  BuildingId.ELECTRONICS_FACTORY,
  BuildingId.SEMICONDUCTOR_FAB,
  BuildingId.BATTERY_FACTORY,
  BuildingId.PARTS_FACTORY,
  BuildingId.CAR_FACTORY,
  BuildingId.APPLIANCE_FACTORY,
  BuildingId.FURNITURE_FACTORY,
  BuildingId.NEW_ENERGY_FACTORY,
  BuildingId.PHARMA_FACTORY,
  BuildingId.MEDICAL_DEVICE_FACTORY,
];

export const MANUFACTURING_CONFIGS: BuildingMethodConfig[] =
  MANUFACTURING_BUILDING_IDS.map(getDefaultBuildingMethodConfig);

export function registerManufacturingMethods(): void {
  registerBuildingConfigs(MANUFACTURING_CONFIGS);
}
