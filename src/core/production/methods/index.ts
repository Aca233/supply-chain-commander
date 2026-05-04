/**
 * 生产方式系统主入口
 *
 * 重构版本：适配新的40种建筑（ID 0-39）
 * - 采掘类：15种 (ID 0-14)
 * - 加工类：12种 (ID 15-26)
 * - 制造类：10种 (ID 27-36)
 * - 奢侈品类：2种 (ID 37-38)
 * - 服务类：1种 (ID 39)
 *
 * 每种建筑有3个槽位，每槽位有3-4种生产方式可选
 * 总计约360+个独特的生产方式配置
 */

// 导出类型定义
export * from './types';

// 导出注册表和工具函数
export {
  buildingConfigs,
  methodsById,
  methodsBySlot,
  getBuildingConfig,
  getBuildingSlots,
  getSlotMethods,
  getMethodById,
  getDefaultMethods,
  isMethodAvailable,
  computeRecipe,
  registerBuildingConfig,
  registerBuildingConfigs,
  createSlot,
  createMethod,
  createBuildingConfig,
  getRegisteredBuildingCount,
  getRegisteredMethodCount,
  getRegisteredBuildingIds,
  clearRegistry,
} from './registry';

// 导入各产业链注册函数
import { registerExtractionMethods } from './extraction';
import { registerProcessingMethods } from './processing';
import { registerManufacturingMethods } from './manufacturing';
import { registerLuxuryMethods } from './luxury';
import { registerServiceMethods } from './service';
import { registerWarehouseMethods } from './warehouse';

// 导入统计函数
import {
  getRegisteredBuildingCount,
  getRegisteredMethodCount
} from './registry';

// 导出各产业链配置（可选单独导入）
export { EXTRACTION_CONFIGS, registerExtractionMethods } from './extraction';
export { PROCESSING_CONFIGS, registerProcessingMethods } from './processing';
export { MANUFACTURING_CONFIGS, registerManufacturingMethods } from './manufacturing';
export { LUXURY_CONFIGS, registerLuxuryMethods } from './luxury';
export { SERVICE_CONFIGS, registerServiceMethods } from './service';
export { WAREHOUSE_CONFIGS, registerWarehouseMethods } from './warehouse';

let initialized = false;

/**
 * 初始化所有建筑专属生产方式
 * 在游戏启动时调用一次
 */
export function initializeProductionMethods(): void {
  if (initialized) {
    console.warn('[ProductionMethods] 生产方式系统已初始化，跳过重复初始化');
    return;
  }

  console.log('[ProductionMethods] 开始初始化建筑专属生产方式...');
  const startTime = performance.now();

  // 按产业链顺序注册所有生产方式（45种建筑，ID 0-39 + 50-54）
  registerExtractionMethods();    // ID 0-14: 采掘类（15种）
  registerProcessingMethods();    // ID 15-26: 加工类（12种）
  registerManufacturingMethods(); // ID 27-36: 制造类（10种）
  registerLuxuryMethods();        // ID 37-38: 奢侈品类（2种）
  registerServiceMethods();       // ID 39: 服务类（1种）
  registerWarehouseMethods();     // ID 50-54: 仓储类（5种）

  const endTime = performance.now();
  initialized = true;

  // 输出统计信息
  const buildingCount = getRegisteredBuildingCount();
  const methodCount = getRegisteredMethodCount();
  console.log(`[ProductionMethods] 初始化完成:
  - 建筑数量: ${buildingCount}/45
  - 生产方式总数: ${methodCount}
  - 耗时: ${(endTime - startTime).toFixed(2)}ms`);
}

/**
 * 检查生产方式系统是否已初始化
 */
export function isProductionMethodsInitialized(): boolean {
  return initialized;
}

/**
 * 获取系统统计信息
 */
export function getProductionMethodsStats(): {
  buildingCount: number;
  methodCount: number;
} {
  return {
    buildingCount: getRegisteredBuildingCount(),
    methodCount: getRegisteredMethodCount(),
  };
}