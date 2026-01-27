/**
 * 建筑拆除系统
 * 提供完整的建筑拆除功能，包括材料回收、现金返还、拆除成本计算
 */

import { MaterialRequirement, getBuildingConstructionConfig, isHazardousBuilding } from '../../data/buildingMaterials';
import { BUILDINGS_BY_ID } from '../../data/buildings';

// ==================== 枚举和类型定义 ====================

/** 拆除任务状态 */
export enum DemolitionStatus {
  QUEUED = 0,        // 排队中
  IN_PROGRESS = 1,   // 拆除中
  COMPLETED = 2,     // 已完成
  CANCELLED = 3,     // 已取消
}

/** 拆除配置 */
export interface DemolitionConfig {
  // 时间配置
  baseDemolitionTime: number;        // 基础拆除时间（tick）
  timePerBuildCost: number;          // 每单位建造成本增加的拆除时间
  
  // 成本配置
  laborCostMultiplier: number;       // 人工成本倍率（相对于建造成本）
  equipmentCostMultiplier: number;   // 设备成本倍率
  
  // 回收配置
  materialRecoveryRate: number;      // 材料回收率（0-1）
  cashRecoveryRate: number;          // 现金回收率（0-1）
  levelDepreciation: number;         // 每级折旧率
  ageDepreciation: number;           // 每年龄（tick）折旧率
  maxDepreciation: number;           // 最大折旧率
  
  // 特殊规则
  hazardousMaterialPenalty: number;  // 危险材料处理惩罚
  rushDemolitionMultiplier: number;  // 加急拆除成本倍率
  cancelRefundRate: number;          // 取消退款率
  materialSaleRate: number;          // 材料出售折扣率
}

/** 默认拆除配置 */
export const DEFAULT_DEMOLITION_CONFIG: DemolitionConfig = {
  baseDemolitionTime: 12,
  timePerBuildCost: 0.00001,
  
  laborCostMultiplier: 0.3,
  equipmentCostMultiplier: 0.1,
  
  materialRecoveryRate: 0.5,
  cashRecoveryRate: 0.3,
  levelDepreciation: 0.05,
  ageDepreciation: 0.00001,  // 每tick约0.001%
  maxDepreciation: 0.8,
  
  hazardousMaterialPenalty: 0.2,
  rushDemolitionMultiplier: 2.0,
  cancelRefundRate: 0.8,
  materialSaleRate: 0.8,
};

/** 拆除预估结果 */
export interface DemolitionEstimate {
  demolitionTime: number;            // 拆除时间（tick）
  laborCost: number;                 // 人工费用
  equipmentCost: number;             // 设备费用
  totalCost: number;                 // 总成本
  recoveredMaterials: MaterialRequirement[];  // 回收材料
  recoveredCash: number;             // 回收现金
  materialSaleValue: number;         // 材料出售价值
  totalRecovery: number;             // 总回收价值
  netCost: number;                   // 净成本（可能为负表示盈利）
  depreciationRate: number;          // 折旧率
}

/** 拆除任务 */
export interface DemolitionTask {
  taskId: number;
  companyId: number;
  buildingId: number;
  buildingTypeId: number;
  buildingLevel: number;
  buildingAge: number;
  
  status: DemolitionStatus;
  
  startTick: number;
  requiredTicks: number;
  progressTicks: number;
  
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
  
  recoveredMaterials: MaterialRequirement[];
  recoveredCash: number;
  
  isRush: boolean;
  sellMaterials: boolean;
}

/** 拆除事件 */
export interface DemolitionEvent {
  type: 'demolition_started' | 'demolition_complete' | 'demolition_cancelled';
  taskId: number;
  companyId: number;
  buildingId: number;
  buildingTypeId?: number;
  recoveredMaterials?: MaterialRequirement[];
  recoveredCash?: number;
  soldMaterials?: boolean;
  refundAmount?: number;
}

// ==================== 拆除队列系统（SoA设计） ====================

/** 拆除队列系统 */
export interface DemolitionQueueSystem {
  maxTasks: number;
  activeCount: number;
  
  // 任务基础信息
  taskIds: Uint32Array;
  companyIds: Uint16Array;
  buildingIds: Uint16Array;
  buildingTypeIds: Uint8Array;
  buildingLevels: Uint8Array;
  buildingAges: Uint32Array;
  
  // 状态
  statuses: Uint8Array;
  
  // 时间
  startTicks: Uint32Array;
  requiredTicks: Uint32Array;
  progressTicks: Uint32Array;
  
  // 成本
  laborCosts: Float32Array;
  equipmentCosts: Float32Array;
  totalCosts: Float32Array;
  
  // 回收
  recoveredCash: Float32Array;
  
  // 选项
  isRush: Uint8Array;
  sellMaterials: Uint8Array;
  
  // 回收材料索引（指向 recoveredMaterialsPool）
  recoveredMaterialsStart: Uint32Array;
  recoveredMaterialsCount: Uint8Array;
  
  nextTaskId: number;
}

/** 回收材料池 */
export interface RecoveredMaterialsPool {
  maxEntries: number;
  count: number;
  
  taskIds: Uint32Array;
  goodsIds: Uint16Array;
  amounts: Float32Array;
}

/**
 * 创建拆除队列系统
 */
export function createDemolitionQueueSystem(maxTasks: number = 500): DemolitionQueueSystem {
  return {
    maxTasks,
    activeCount: 0,
    
    taskIds: new Uint32Array(maxTasks),
    companyIds: new Uint16Array(maxTasks),
    buildingIds: new Uint16Array(maxTasks),
    buildingTypeIds: new Uint8Array(maxTasks),
    buildingLevels: new Uint8Array(maxTasks),
    buildingAges: new Uint32Array(maxTasks),
    
    statuses: new Uint8Array(maxTasks),
    
    startTicks: new Uint32Array(maxTasks),
    requiredTicks: new Uint32Array(maxTasks),
    progressTicks: new Uint32Array(maxTasks),
    
    laborCosts: new Float32Array(maxTasks),
    equipmentCosts: new Float32Array(maxTasks),
    totalCosts: new Float32Array(maxTasks),
    
    recoveredCash: new Float32Array(maxTasks),
    
    isRush: new Uint8Array(maxTasks),
    sellMaterials: new Uint8Array(maxTasks),
    
    recoveredMaterialsStart: new Uint32Array(maxTasks),
    recoveredMaterialsCount: new Uint8Array(maxTasks),
    
    nextTaskId: 1,
  };
}

/**
 * 创建回收材料池
 */
export function createRecoveredMaterialsPool(maxEntries: number = 5000): RecoveredMaterialsPool {
  return {
    maxEntries,
    count: 0,
    
    taskIds: new Uint32Array(maxEntries),
    goodsIds: new Uint16Array(maxEntries),
    amounts: new Float32Array(maxEntries),
  };
}

// ==================== 拆除管理器 ====================

/**
 * 拆除管理器
 * 处理建筑拆除的所有逻辑
 */
export class DemolitionManager {
  private config: DemolitionConfig;
  
  constructor(config: DemolitionConfig = DEFAULT_DEMOLITION_CONFIG) {
    this.config = config;
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<DemolitionConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): DemolitionConfig {
    return { ...this.config };
  }
  
  /**
   * 检查是否可以拆除建筑
   */
  canDemolish(
    buildingId: number,
    buildingData: { isProducing: boolean; inventoryCount: number },
    demolitionQueue: DemolitionQueueSystem,
  ): { canDemolish: boolean; reason?: string } {
    // 检查是否正在生产
    if (buildingData.isProducing) {
      return { canDemolish: false, reason: '建筑正在生产中，请先停止生产' };
    }
    
    // 检查是否有库存
    if (buildingData.inventoryCount > 0) {
      return { canDemolish: false, reason: '建筑内有库存，请先清空' };
    }
    
    // 检查是否已在拆除队列
    if (this.isInDemolitionQueue(demolitionQueue, buildingId)) {
      return { canDemolish: false, reason: '建筑已在拆除队列中' };
    }
    
    return { canDemolish: true };
  }
  
  /**
   * 检查建筑是否在拆除队列中
   */
  isInDemolitionQueue(queue: DemolitionQueueSystem, buildingId: number): boolean {
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.buildingIds[i] === buildingId && 
          queue.statuses[i] !== DemolitionStatus.COMPLETED &&
          queue.statuses[i] !== DemolitionStatus.CANCELLED) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 计算拆除预估
   */
  calculateDemolition(
    buildingTypeId: number,
    buildingLevel: number,
    buildingAge: number,
    options: { isRush?: boolean; sellMaterials?: boolean } = {},
    priceGetter?: (goodsId: number) => number,
  ): DemolitionEstimate {
    const buildingType = BUILDINGS_BY_ID.get(buildingTypeId);
    const constructionConfig = getBuildingConstructionConfig(buildingTypeId);
    
    if (!buildingType) {
      throw new Error(`Unknown building type: ${buildingTypeId}`);
    }
    
    const buildCost = buildingType.buildCost;
    
    // 计算拆除时间
    let demolitionTime = Math.ceil(
      this.config.baseDemolitionTime + buildCost * this.config.timePerBuildCost
    );
    
    if (options.isRush) {
      demolitionTime = Math.ceil(demolitionTime / 2);
    }
    
    // 计算拆除成本
    let laborCost = buildCost * this.config.laborCostMultiplier;
    let equipmentCost = buildCost * this.config.equipmentCostMultiplier;
    
    // 危险材料处理
    if (isHazardousBuilding(buildingTypeId)) {
      laborCost *= (1 + this.config.hazardousMaterialPenalty);
      equipmentCost *= (1 + this.config.hazardousMaterialPenalty);
    }
    
    // 加急拆除
    if (options.isRush) {
      laborCost *= this.config.rushDemolitionMultiplier;
      equipmentCost *= this.config.rushDemolitionMultiplier;
    }
    
    const totalCost = Math.floor(laborCost + equipmentCost);
    
    // 计算折旧率
    const levelDepreciation = (buildingLevel - 1) * this.config.levelDepreciation;
    const ageDepreciation = buildingAge * this.config.ageDepreciation;
    const depreciationRate = Math.min(
      levelDepreciation + ageDepreciation,
      this.config.maxDepreciation
    );
    
    const recoveryMultiplier = 1 - depreciationRate;
    const materialRecoveryRate = this.config.materialRecoveryRate * recoveryMultiplier;
    
    // 计算回收材料
    const recoveredMaterials: MaterialRequirement[] = [];
    if (constructionConfig) {
      for (const material of constructionConfig.baseMaterials) {
        const recoveredAmount = Math.floor(material.amount * materialRecoveryRate);
        if (recoveredAmount > 0) {
          recoveredMaterials.push({
            goodsId: material.goodsId,
            amount: recoveredAmount,
          });
        }
      }
    }
    
    // 计算回收现金
    const cashRecoveryRate = this.config.cashRecoveryRate * recoveryMultiplier;
    const recoveredCash = Math.floor(buildCost * cashRecoveryRate);
    
    // 计算材料出售价值
    let materialSaleValue = 0;
    if (options.sellMaterials && priceGetter) {
      for (const material of recoveredMaterials) {
        const price = priceGetter(material.goodsId);
        materialSaleValue += material.amount * price * this.config.materialSaleRate;
      }
      materialSaleValue = Math.floor(materialSaleValue);
    }
    
    const totalRecovery = recoveredCash + (options.sellMaterials ? materialSaleValue : 0);
    const netCost = totalCost - totalRecovery;
    
    return {
      demolitionTime,
      laborCost: Math.floor(laborCost),
      equipmentCost: Math.floor(equipmentCost),
      totalCost,
      recoveredMaterials,
      recoveredCash,
      materialSaleValue,
      totalRecovery,
      netCost,
      depreciationRate,
    };
  }
  
  /**
   * 开始拆除任务
   */
  startDemolition(
    queue: DemolitionQueueSystem,
    materialsPool: RecoveredMaterialsPool,
    buildingId: number,
    buildingTypeId: number,
    buildingLevel: number,
    buildingAge: number,
    companyId: number,
    currentTick: number,
    options: { isRush?: boolean; sellMaterials?: boolean } = {},
    priceGetter?: (goodsId: number) => number,
  ): { success: boolean; taskId?: number; error?: string; estimate?: DemolitionEstimate } {
    // 检查队列容量
    if (queue.activeCount >= queue.maxTasks) {
      return { success: false, error: '拆除队列已满' };
    }
    
    // 计算拆除详情
    const estimate = this.calculateDemolition(
      buildingTypeId,
      buildingLevel,
      buildingAge,
      options,
      priceGetter
    );
    
    // 分配任务槽位
    const taskIndex = queue.activeCount;
    const taskId = queue.nextTaskId++;
    
    // 保存回收材料到池
    const materialsStart = materialsPool.count;
    for (const material of estimate.recoveredMaterials) {
      if (materialsPool.count >= materialsPool.maxEntries) {
        return { success: false, error: '回收材料池已满' };
      }
      
      const matIndex = materialsPool.count++;
      materialsPool.taskIds[matIndex] = taskId;
      materialsPool.goodsIds[matIndex] = material.goodsId;
      materialsPool.amounts[matIndex] = material.amount;
    }
    
    // 填充任务数据
    queue.taskIds[taskIndex] = taskId;
    queue.companyIds[taskIndex] = companyId;
    queue.buildingIds[taskIndex] = buildingId;
    queue.buildingTypeIds[taskIndex] = buildingTypeId;
    queue.buildingLevels[taskIndex] = buildingLevel;
    queue.buildingAges[taskIndex] = buildingAge;
    
    queue.statuses[taskIndex] = DemolitionStatus.QUEUED;
    
    queue.startTicks[taskIndex] = currentTick;
    queue.requiredTicks[taskIndex] = estimate.demolitionTime;
    queue.progressTicks[taskIndex] = 0;
    
    queue.laborCosts[taskIndex] = estimate.laborCost;
    queue.equipmentCosts[taskIndex] = estimate.equipmentCost;
    queue.totalCosts[taskIndex] = estimate.totalCost;
    
    queue.recoveredCash[taskIndex] = estimate.recoveredCash;
    
    queue.isRush[taskIndex] = options.isRush ? 1 : 0;
    queue.sellMaterials[taskIndex] = options.sellMaterials ? 1 : 0;
    
    queue.recoveredMaterialsStart[taskIndex] = materialsStart;
    queue.recoveredMaterialsCount[taskIndex] = estimate.recoveredMaterials.length;
    
    queue.activeCount++;
    
    return { success: true, taskId, estimate };
  }
  
  /**
   * 取消拆除任务
   */
  cancelDemolition(
    queue: DemolitionQueueSystem,
    taskId: number,
  ): { success: boolean; refundAmount?: number; error?: string } {
    // 查找任务
    let taskIndex = -1;
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.taskIds[i] === taskId) {
        taskIndex = i;
        break;
      }
    }
    
    if (taskIndex === -1) {
      return { success: false, error: '任务不存在' };
    }
    
    if (queue.statuses[taskIndex] !== DemolitionStatus.QUEUED) {
      return { success: false, error: '只能取消排队中的任务' };
    }
    
    // 计算退款
    const refundAmount = Math.floor(queue.totalCosts[taskIndex] * this.config.cancelRefundRate);
    
    // 标记为取消
    queue.statuses[taskIndex] = DemolitionStatus.CANCELLED;
    
    return { success: true, refundAmount };
  }
  
  /**
   * 处理每tick的拆除进度
   */
  processTick(
    queue: DemolitionQueueSystem,
    materialsPool: RecoveredMaterialsPool,
    currentTick: number,
  ): DemolitionEvent[] {
    const events: DemolitionEvent[] = [];
    
    // 先启动队列中的任务
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.statuses[i] === DemolitionStatus.QUEUED) {
        queue.statuses[i] = DemolitionStatus.IN_PROGRESS;
        events.push({
          type: 'demolition_started',
          taskId: queue.taskIds[i],
          companyId: queue.companyIds[i],
          buildingId: queue.buildingIds[i],
          buildingTypeId: queue.buildingTypeIds[i],
        });
        break; // 每tick只启动一个任务
      }
    }
    
    // 处理进行中的任务
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.statuses[i] !== DemolitionStatus.IN_PROGRESS) {
        continue;
      }
      
      // 增加进度
      queue.progressTicks[i]++;
      
      // 检查是否完成
      if (queue.progressTicks[i] >= queue.requiredTicks[i]) {
        queue.statuses[i] = DemolitionStatus.COMPLETED;
        
        // 获取回收材料
        const recoveredMaterials = this.getRecoveredMaterials(
          queue, materialsPool, i
        );
        
        events.push({
          type: 'demolition_complete',
          taskId: queue.taskIds[i],
          companyId: queue.companyIds[i],
          buildingId: queue.buildingIds[i],
          buildingTypeId: queue.buildingTypeIds[i],
          recoveredMaterials,
          recoveredCash: queue.recoveredCash[i],
          soldMaterials: queue.sellMaterials[i] === 1,
        });
      }
    }
    
    return events;
  }
  
  /**
   * 获取任务的回收材料
   */
  getRecoveredMaterials(
    queue: DemolitionQueueSystem,
    materialsPool: RecoveredMaterialsPool,
    taskIndex: number,
  ): MaterialRequirement[] {
    const start = queue.recoveredMaterialsStart[taskIndex];
    const count = queue.recoveredMaterialsCount[taskIndex];
    const materials: MaterialRequirement[] = [];
    
    for (let i = start; i < start + count; i++) {
      materials.push({
        goodsId: materialsPool.goodsIds[i],
        amount: materialsPool.amounts[i],
      });
    }
    
    return materials;
  }
  
  /**
   * 获取公司的拆除队列
   */
  getCompanyQueue(
    queue: DemolitionQueueSystem,
    materialsPool: RecoveredMaterialsPool,
    companyId: number,
  ): DemolitionTask[] {
    const tasks: DemolitionTask[] = [];
    
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.companyIds[i] !== companyId) continue;
      if (queue.statuses[i] === DemolitionStatus.COMPLETED ||
          queue.statuses[i] === DemolitionStatus.CANCELLED) continue;
      
      tasks.push({
        taskId: queue.taskIds[i],
        companyId: queue.companyIds[i],
        buildingId: queue.buildingIds[i],
        buildingTypeId: queue.buildingTypeIds[i],
        buildingLevel: queue.buildingLevels[i],
        buildingAge: queue.buildingAges[i],
        
        status: queue.statuses[i],
        
        startTick: queue.startTicks[i],
        requiredTicks: queue.requiredTicks[i],
        progressTicks: queue.progressTicks[i],
        
        laborCost: queue.laborCosts[i],
        equipmentCost: queue.equipmentCosts[i],
        totalCost: queue.totalCosts[i],
        
        recoveredMaterials: this.getRecoveredMaterials(queue, materialsPool, i),
        recoveredCash: queue.recoveredCash[i],
        
        isRush: queue.isRush[i] === 1,
        sellMaterials: queue.sellMaterials[i] === 1,
      });
    }
    
    return tasks;
  }
  
  /**
   * 获取拆除进度百分比
   */
  getProgress(queue: DemolitionQueueSystem, taskId: number): number {
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.taskIds[i] === taskId) {
        return (queue.progressTicks[i] / queue.requiredTicks[i]) * 100;
      }
    }
    return 0;
  }
  
  /**
   * 获取预计完成时间（剩余tick）
   */
  getEstimatedCompletion(queue: DemolitionQueueSystem, taskId: number): number {
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.taskIds[i] === taskId) {
        return queue.requiredTicks[i] - queue.progressTicks[i];
      }
    }
    return 0;
  }
  
  /**
   * 清理已完成和已取消的任务
   */
  cleanupCompletedTasks(queue: DemolitionQueueSystem): number {
    let cleaned = 0;
    let writeIndex = 0;
    
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.statuses[i] === DemolitionStatus.COMPLETED ||
          queue.statuses[i] === DemolitionStatus.CANCELLED) {
        cleaned++;
        continue;
      }
      
      if (writeIndex !== i) {
        // 移动任务到新位置
        queue.taskIds[writeIndex] = queue.taskIds[i];
        queue.companyIds[writeIndex] = queue.companyIds[i];
        queue.buildingIds[writeIndex] = queue.buildingIds[i];
        queue.buildingTypeIds[writeIndex] = queue.buildingTypeIds[i];
        queue.buildingLevels[writeIndex] = queue.buildingLevels[i];
        queue.buildingAges[writeIndex] = queue.buildingAges[i];
        queue.statuses[writeIndex] = queue.statuses[i];
        queue.startTicks[writeIndex] = queue.startTicks[i];
        queue.requiredTicks[writeIndex] = queue.requiredTicks[i];
        queue.progressTicks[writeIndex] = queue.progressTicks[i];
        queue.laborCosts[writeIndex] = queue.laborCosts[i];
        queue.equipmentCosts[writeIndex] = queue.equipmentCosts[i];
        queue.totalCosts[writeIndex] = queue.totalCosts[i];
        queue.recoveredCash[writeIndex] = queue.recoveredCash[i];
        queue.isRush[writeIndex] = queue.isRush[i];
        queue.sellMaterials[writeIndex] = queue.sellMaterials[i];
        queue.recoveredMaterialsStart[writeIndex] = queue.recoveredMaterialsStart[i];
        queue.recoveredMaterialsCount[writeIndex] = queue.recoveredMaterialsCount[i];
      }
      
      writeIndex++;
    }
    
    queue.activeCount = writeIndex;
    return cleaned;
  }
}

// ==================== 导出单例 ====================
export const demolitionManager = new DemolitionManager();