/**
 * 附属建筑系统 - 索引文件
 * 汇总并注册所有附属建筑定义
 */

import { registerSubsidiaries, SubsidiaryBuildingDef } from '../SubsidiaryBuildings';

// 导入各类别附属建筑
import { EXTRACTION_SUBSIDIARIES } from './extraction';
import { PROCESSING_SUBSIDIARIES } from './processing';
import { MANUFACTURING_SUBSIDIARIES } from './manufacturing';
import { SERVICE_SUBSIDIARIES } from './service';
import { RETAIL_SUBSIDIARIES } from './retail';

// 汇总所有附属建筑
export const ALL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  ...EXTRACTION_SUBSIDIARIES,
  ...PROCESSING_SUBSIDIARIES,
  ...MANUFACTURING_SUBSIDIARIES,
  ...SERVICE_SUBSIDIARIES,
  ...RETAIL_SUBSIDIARIES,
];

// 按类别导出
export {
  EXTRACTION_SUBSIDIARIES,
  PROCESSING_SUBSIDIARIES,
  MANUFACTURING_SUBSIDIARIES,
  SERVICE_SUBSIDIARIES,
  RETAIL_SUBSIDIARIES,
};

// 导出类型
export type { SubsidiaryBuildingDef } from '../SubsidiaryBuildings';

/**
 * 初始化并注册所有附属建筑
 * 应在游戏启动时调用
 */
export function initializeSubsidiaries(): void {
  console.log(`[SubsidiarySystem] 正在注册 ${ALL_SUBSIDIARIES.length} 个附属建筑...`);
  
  registerSubsidiaries(ALL_SUBSIDIARIES);
  
  console.log(`[SubsidiarySystem] 附属建筑注册完成`);
  console.log(`  - 采掘类: ${EXTRACTION_SUBSIDIARIES.length} 个`);
  console.log(`  - 加工类: ${PROCESSING_SUBSIDIARIES.length} 个`);
  console.log(`  - 制造类: ${MANUFACTURING_SUBSIDIARIES.length} 个`);
  console.log(`  - 服务类: ${SERVICE_SUBSIDIARIES.length} 个`);
  console.log(`  - 零售类: ${RETAIL_SUBSIDIARIES.length} 个`);
}

/**
 * 获取附属建筑统计信息
 */
export function getSubsidiaryStats(): {
  total: number;
  byCategory: Record<string, number>;
  byBuildingType: Map<number, number>;
} {
  const byCategory: Record<string, number> = {
    extraction: EXTRACTION_SUBSIDIARIES.length,
    processing: PROCESSING_SUBSIDIARIES.length,
    manufacturing: MANUFACTURING_SUBSIDIARIES.length,
    service: SERVICE_SUBSIDIARIES.length,
    retail: RETAIL_SUBSIDIARIES.length,
  };
  
  const byBuildingType = new Map<number, number>();
  
  for (const sub of ALL_SUBSIDIARIES) {
    for (const buildingType of sub.applicableBuildingTypes) {
      const count = byBuildingType.get(buildingType) || 0;
      byBuildingType.set(buildingType, count + 1);
    }
  }
  
  return {
    total: ALL_SUBSIDIARIES.length,
    byCategory,
    byBuildingType,
  };
}