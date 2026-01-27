/**
 * 生产方式系统主入口
 * 
 * 此模块提供了完整的建筑专属生产方式系统:
 * - 107种建筑类型，每种有专属的生产方式槽位和方法
 * - 约600+个独特的生产方式配置
 * - 支持产量、品质、能耗、人力、污染等多维度修正
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
  computeModifiers,
  getInputMultiplier,
  getOutputMultiplier,
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
import { registerServiceMethods } from './service';
import { registerAgricultureMethods } from './agriculture';
import { registerPharmaMethods } from './pharma';
import { registerDefenseMethods } from './defense';
import { registerLuxuryMethods } from './luxury';
import { registerTechMethods } from './tech';
import { registerConsumerMethods } from './consumer';
import { registerTransportMethods } from './transport';
import { registerMiscMethods } from './misc';

// 导入统计函数
import { 
  getRegisteredBuildingCount, 
  getRegisteredMethodCount 
} from './registry';

// 导出各产业链配置（可选单独导入）
export { EXTRACTION_CONFIGS, registerExtractionMethods } from './extraction';
export { PROCESSING_CONFIGS, registerProcessingMethods } from './processing';
export { MANUFACTURING_CONFIGS, registerManufacturingMethods } from './manufacturing';
export { SERVICE_CONFIGS, registerServiceMethods } from './service';
export { AGRICULTURE_CONFIGS, registerAgricultureMethods } from './agriculture';
export { PHARMA_CONFIGS, registerPharmaMethods } from './pharma';
export { DEFENSE_CONFIGS, registerDefenseMethods } from './defense';
export { LUXURY_CONFIGS, registerLuxuryMethods } from './luxury';
export { TECH_CONFIGS, registerTechMethods } from './tech';
export { CONSUMER_CONFIGS, registerConsumerMethods } from './consumer';
export { TRANSPORT_CONFIGS, registerTransportMethods } from './transport';
export { MISC_CONFIGS, registerMiscMethods } from './misc';

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

  // 按产业链顺序注册所有生产方式
  registerExtractionMethods();   // ID 0-7: 采掘类
  registerProcessingMethods();    // ID 8-15: 加工类
  registerManufacturingMethods(); // ID 16-21: 制造类
  registerServiceMethods();       // ID 22-24: 服务类
  registerAgricultureMethods();   // ID 25-31: 农业产业链
  registerPharmaMethods();        // ID 32-36: 医药产业链
  registerDefenseMethods();       // ID 37-41: 军工产业链
  registerLuxuryMethods();        // ID 42-46: 奢侈品产业链
  registerTechMethods();          // ID 47-51: 科技产业链
  registerConsumerMethods();      // ID 52-56: 日化产业链
  registerTransportMethods();     // ID 57-61: 交通运输设备
  registerMiscMethods();          // ID 62-106: 其他产业链

  const endTime = performance.now();
  initialized = true;

  // 输出统计信息
  const buildingCount = getRegisteredBuildingCount();
  const methodCount = getRegisteredMethodCount();
  console.log(`[ProductionMethods] 初始化完成:
  - 建筑数量: ${buildingCount}
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