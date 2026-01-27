/**
 * 建造与拆除系统模块
 * 
 * 提供完整的建筑建造和拆除功能：
 * - 建造管理器：处理新建建筑和升级
 * - 拆除管理器：处理建筑拆除和材料回收
 * - 材料检查器：处理材料的检查和预留
 */

// ==================== 建造系统 ====================
export {
  // 枚举
  ConstructionStatus,
  ConstructionType,
  
  // 类型
  type ConstructionConfig,
  type ConstructionTask,
  type MaterialCheckResult,
  type ConstructionEvent,
  type ConstructionQueueSystem,
  type ReservedMaterialsPool,
  
  // 配置
  DEFAULT_CONSTRUCTION_CONFIG,
  
  // 工厂函数
  createConstructionQueueSystem,
  createReservedMaterialsPool,
  
  // 类
  MaterialChecker,
  ConstructionManager,
  
  // 单例
  constructionManager,
  materialChecker,
} from './ConstructionManager';

// ==================== 拆除系统 ====================
export {
  // 枚举
  DemolitionStatus,
  
  // 类型
  type DemolitionConfig,
  type DemolitionEstimate,
  type DemolitionTask,
  type DemolitionEvent,
  type DemolitionQueueSystem,
  type RecoveredMaterialsPool,
  
  // 配置
  DEFAULT_DEMOLITION_CONFIG,
  
  // 工厂函数
  createDemolitionQueueSystem,
  createRecoveredMaterialsPool,
  
  // 类
  DemolitionManager,
  
  // 单例
  demolitionManager,
} from './DemolitionSystem';

// ==================== 游戏循环集成 ====================
export {
  type ConstructionTickResult,
  processConstructionAndDemolitionTick,
  collectRecoveredMaterials,
  cancelConstruction,
  cancelDemolition,
  getCompanyConstructionQueue,
  getCompanyDemolitionQueue,
  startConstruction,
  startUpgrade,
  startDemolition,
} from './ConstructionTick';

// ==================== 辅助函数 ====================

// 导入工厂函数用于初始化
import {
  createConstructionQueueSystem as _createConstructionQueueSystem,
  createReservedMaterialsPool as _createReservedMaterialsPool,
} from './ConstructionManager';

import {
  createDemolitionQueueSystem as _createDemolitionQueueSystem,
  createRecoveredMaterialsPool as _createRecoveredMaterialsPool,
} from './DemolitionSystem';

/**
 * 初始化建造/拆除系统
 * 创建所有必要的数据结构
 */
export function initializeConstructionSystem(options?: {
  maxConstructionTasks?: number;
  maxDemolitionTasks?: number;
  maxReservedMaterials?: number;
  maxRecoveredMaterials?: number;
}): {
  constructionQueue: import('./ConstructionManager').ConstructionQueueSystem;
  reservedMaterialsPool: import('./ConstructionManager').ReservedMaterialsPool;
  demolitionQueue: import('./DemolitionSystem').DemolitionQueueSystem;
  recoveredMaterialsPool: import('./DemolitionSystem').RecoveredMaterialsPool;
} {
  const {
    maxConstructionTasks = 1000,
    maxDemolitionTasks = 500,
    maxReservedMaterials = 5000,
    maxRecoveredMaterials = 3000,
  } = options ?? {};
  
  return {
    constructionQueue: _createConstructionQueueSystem(maxConstructionTasks),
    reservedMaterialsPool: _createReservedMaterialsPool(maxReservedMaterials),
    demolitionQueue: _createDemolitionQueueSystem(maxDemolitionTasks),
    recoveredMaterialsPool: _createRecoveredMaterialsPool(maxRecoveredMaterials),
  };
}

/**
 * 格式化建造/拆除时间为可读字符串
 */
export function formatConstructionTime(ticks: number): string {
  // 假设 1 tick = 1 小时
  if (ticks < 24) {
    return `${ticks}小时`;
  }
  
  const days = Math.floor(ticks / 24);
  const hours = ticks % 24;
  
  if (hours === 0) {
    return `${days}天`;
  }
  
  return `${days}天${hours}小时`;
}

/**
 * 获取建造状态的显示文本
 */
export function getConstructionStatusText(status: import('./ConstructionManager').ConstructionStatus): string {
  const statusTexts: Record<number, string> = {
    0: '排队中',
    1: '建造中',
    2: '已暂停',
    3: '已完成',
    4: '已取消',
  };
  return statusTexts[status] ?? '未知';
}

/**
 * 获取拆除状态的显示文本
 */
export function getDemolitionStatusText(status: import('./DemolitionSystem').DemolitionStatus): string {
  const statusTexts: Record<number, string> = {
    0: '排队中',
    1: '拆除中',
    2: '已完成',
    3: '已取消',
  };
  return statusTexts[status] ?? '未知';
}