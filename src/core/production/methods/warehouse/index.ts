/**
 * 仓储类建筑生产方式（ID 50-54）
 * 仓库不生产商品，但需要劳动力维持运营。
 * 注册空输入/输出的配方，仅定义 workforceRequired 和 energyRequired。
 */

import { BuildingMethodConfig } from '../types';
import { registerBuildingConfigs, createBuildingConfig, createSlot, createMethod } from '../registry';
import { BuildingId } from '../../../../data/buildings';
import type { WorkforceDemand } from '@/core/labor/LaborSystem';

/**
 * 仓库劳动力分配：基础工人为主（搬运、叉车操作），少量技术工人（系统维护），极少管理。
 * 自动化仓库则技术工人占比更高。
 */
function warehouseWorkforce(total: number, isAutomated = false): WorkforceDemand {
  if (isAutomated) {
    return {
      basic: Math.max(0, Math.round(total * 0.30)),
      technical: Math.max(0, Math.round(total * 0.55)),
      management: Math.max(1, Math.ceil(total * 0.15)),
    };
  }
  return {
    basic: Math.max(0, Math.round(total * 0.75)),
    technical: Math.max(0, Math.round(total * 0.15)),
    management: Math.max(1, Math.ceil(total * 0.10)),
  };
}

function buildWarehouseConfig(
  buildingTypeId: number,
  name: string,
  workforce: WorkforceDemand,
  energy: number,
  description: string,
): BuildingMethodConfig {
  const slotId = 'storage';
  const slot = createSlot(buildingTypeId, slotId, name, '📦', description, 0);
  const method = createMethod(buildingTypeId, 0, slotId, `warehouse_ops_${buildingTypeId}`, name, {
    inputDelta: [],
    outputDelta: [],
    workforceDelta: workforce,
    energyDelta: energy,
    ticksRequired: 1,
    requiredLevel: 1,
    switchCost: 0,
    switchCooldown: 0,
    description,
  });
  return createBuildingConfig(buildingTypeId, [slot], [method]);
}

export const WAREHOUSE_CONFIGS: BuildingMethodConfig[] = [
  // 小型仓库 (ID 50) — laborCost=6000, ~20人
  buildWarehouseConfig(BuildingId.SMALL_WAREHOUSE, '仓储运营', warehouseWorkforce(20), 8, '日常仓储运营'),
  // 大型仓库 (ID 51) — laborCost=16000, ~50人
  buildWarehouseConfig(BuildingId.LARGE_WAREHOUSE, '仓储运营', warehouseWorkforce(50), 18, '大型仓储运营'),
  // 冷链仓库 (ID 52) — laborCost=12000, ~35人
  buildWarehouseConfig(BuildingId.COLD_STORAGE, '冷链运营', warehouseWorkforce(35), 30, '恒温冷藏仓储运营'),
  // 散货堆场 (ID 53) — laborCost=8000, ~25人
  buildWarehouseConfig(BuildingId.BULK_YARD, '堆场运营', warehouseWorkforce(25), 5, '散货堆场运营'),
  // 自动化仓库 (ID 54) — laborCost=5000, ~15人（高技术工人比例）
  buildWarehouseConfig(BuildingId.AUTOMATED_WAREHOUSE, '自动化运营', warehouseWorkforce(15, true), 40, '全自动化仓储运营'),
];

export function registerWarehouseMethods(): void {
  registerBuildingConfigs(WAREHOUSE_CONFIGS);
}
