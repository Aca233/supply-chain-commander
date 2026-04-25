/**
 * 建造管理器
 * 处理建筑建造的所有逻辑，包括材料检查、预留、建造进度等
 */

import { 
  MaterialRequirement, 
  getBuildingConstructionConfig, 
  getBaseMaterials,
  getUpgradeMaterials,
  getBuildTime,
  calculateMaterialsValue,
} from '../../data/buildingMaterials';
import { BUILDINGS_BY_ID } from '../../data/buildings';

// ==================== 枚举和类型定义 ====================

/** 建造任务状态 */
export enum ConstructionStatus {
  QUEUED = 0,        // 排队中
  BUILDING = 1,      // 建造中
  PAUSED = 2,        // 暂停
  COMPLETED = 3,     // 已完成
  CANCELLED = 4,     // 已取消
}

/** 建造任务类型 */
export enum ConstructionType {
  NEW_BUILDING = 0,  // 新建建筑
  UPGRADE = 1,       // 升级建筑
}

/** 建造配置 */
export interface ConstructionConfig {
  maxQueuePerCompany: number;        // 每公司最大队列数
  simultaneousBuilds: number;        // 同时建造数量
  speedBoostMax: number;             // 最大加速倍率
  cancelRefundRate: number;          // 取消退款率（材料）
  cancelCashRefundRate: number;      // 取消退款率（现金）
}

/** 默认建造配置 */
export const DEFAULT_CONSTRUCTION_CONFIG: ConstructionConfig = {
  maxQueuePerCompany: 10,
  simultaneousBuilds: 3,
  speedBoostMax: 5.0,
  cancelRefundRate: 0.8,
  cancelCashRefundRate: 0.9,
};

/** 建造任务 */
export interface ConstructionTask {
  taskId: number;
  companyId: number;
  buildingTypeId: number;
  taskType: ConstructionType;
  status: ConstructionStatus;
  targetLevel: number;
  
  startTick: number;
  requiredTicks: number;
  progressTicks: number;
  
  speedBoost: number;
  
  reservedMaterials: MaterialRequirement[];
  cashCost: number;
  
  existingBuildingId: number;  // -1 表示新建
  outputModeId: number;        // 新建建筑使用的产品模式ID
}

/** 材料检查结果 */
export interface MaterialCheckResult {
  sufficient: boolean;
  available: Map<number, number>;
  missing: MaterialRequirement[];
  totalCost: number;
}

/** 建造事件 */
export interface ConstructionEvent {
  type: 'construction_started' | 'construction_complete' | 'construction_cancelled' | 'construction_paused' | 'construction_resumed';
  taskId: number;
  companyId: number;
  buildingTypeId: number;
  taskType: ConstructionType;
  newBuildingId?: number;
  refundedMaterials?: MaterialRequirement[];
  refundedCash?: number;
}

// ==================== 建造队列系统（SoA设计） ====================

/** 建造队列系统 */
export interface ConstructionQueueSystem {
  maxTasks: number;
  activeCount: number;
  
  // 任务基础信息
  taskIds: Uint32Array;
  companyIds: Uint16Array;
  buildingTypeIds: Uint8Array;
  taskTypes: Uint8Array;
  statuses: Uint8Array;
  targetLevels: Uint8Array;
  
  // 时间追踪
  startTicks: Uint32Array;
  requiredTicks: Uint32Array;
  progressTicks: Uint32Array;
  
  // 加速
  speedBoosts: Float32Array;
  
  // 预留材料索引
  reservedMaterialsStart: Uint32Array;
  reservedMaterialsCount: Uint8Array;
  
  // 现金成本
  cashCosts: Float32Array;
  
  // 建筑引用
  existingBuildingIds: Int16Array;
  outputModeIds: Int16Array;
  
  nextTaskId: number;
}

/** 预留材料池 */
export interface ReservedMaterialsPool {
  maxEntries: number;
  count: number;
  
  taskIds: Uint32Array;
  goodsIds: Uint16Array;
  amounts: Float32Array;
}

/**
 * 创建建造队列系统
 */
export function createConstructionQueueSystem(maxTasks: number = 1000): ConstructionQueueSystem {
  return {
    maxTasks,
    activeCount: 0,
    
    taskIds: new Uint32Array(maxTasks),
    companyIds: new Uint16Array(maxTasks),
    buildingTypeIds: new Uint8Array(maxTasks),
    taskTypes: new Uint8Array(maxTasks),
    statuses: new Uint8Array(maxTasks),
    targetLevels: new Uint8Array(maxTasks),
    
    startTicks: new Uint32Array(maxTasks),
    requiredTicks: new Uint32Array(maxTasks),
    progressTicks: new Uint32Array(maxTasks),
    
    speedBoosts: new Float32Array(maxTasks).fill(1.0),
    
    reservedMaterialsStart: new Uint32Array(maxTasks),
    reservedMaterialsCount: new Uint8Array(maxTasks),
    
    cashCosts: new Float32Array(maxTasks),
    
    existingBuildingIds: new Int16Array(maxTasks).fill(-1),
    outputModeIds: new Int16Array(maxTasks).fill(-1),
    
    nextTaskId: 1,
  };
}

/**
 * 创建预留材料池
 */
export function createReservedMaterialsPool(maxEntries: number = 5000): ReservedMaterialsPool {
  return {
    maxEntries,
    count: 0,
    
    taskIds: new Uint32Array(maxEntries),
    goodsIds: new Uint16Array(maxEntries),
    amounts: new Float32Array(maxEntries),
  };
}

// ==================== 材料检查器 ====================

/**
 * 材料检查器
 * 处理材料的检查、预留和消耗
 */
export class MaterialChecker {
  /**
   * 检查材料是否充足
   */
  checkMaterials(
    requirements: MaterialRequirement[],
    inventoryGetter: (goodsId: number) => number,
    priceGetter?: (goodsId: number) => number,
  ): MaterialCheckResult {
    const available = new Map<number, number>();
    const missing: MaterialRequirement[] = [];
    let totalCost = 0;
    let sufficient = true;
    
    for (const req of requirements) {
      const inStock = inventoryGetter(req.goodsId);
      available.set(req.goodsId, inStock);
      
      if (inStock < req.amount) {
        sufficient = false;
        missing.push({
          goodsId: req.goodsId,
          amount: req.amount - inStock,
        });
      }
      
      if (priceGetter) {
        totalCost += req.amount * priceGetter(req.goodsId);
      }
    }
    
    return { sufficient, available, missing, totalCost };
  }
  
  /**
   * 预留材料到池中
   */
  reserveMaterials(
    pool: ReservedMaterialsPool,
    taskId: number,
    requirements: MaterialRequirement[],
  ): boolean {
    // 检查池容量
    if (pool.count + requirements.length > pool.maxEntries) {
      return false;
    }
    
    for (const req of requirements) {
      const index = pool.count++;
      pool.taskIds[index] = taskId;
      pool.goodsIds[index] = req.goodsId;
      pool.amounts[index] = req.amount;
    }
    
    return true;
  }
  
  /**
   * 获取任务的预留材料
   */
  getReservedMaterials(
    pool: ReservedMaterialsPool,
    taskId: number,
  ): MaterialRequirement[] {
    const materials: MaterialRequirement[] = [];
    
    for (let i = 0; i < pool.count; i++) {
      if (pool.taskIds[i] === taskId) {
        materials.push({
          goodsId: pool.goodsIds[i],
          amount: pool.amounts[i],
        });
      }
    }
    
    return materials;
  }
  
  /**
   * 释放预留材料
   */
  releaseReservedMaterials(
    pool: ReservedMaterialsPool,
    taskId: number,
  ): MaterialRequirement[] {
    const released: MaterialRequirement[] = [];
    let writeIndex = 0;
    
    for (let i = 0; i < pool.count; i++) {
      if (pool.taskIds[i] === taskId) {
        released.push({
          goodsId: pool.goodsIds[i],
          amount: pool.amounts[i],
        });
      } else {
        if (writeIndex !== i) {
          pool.taskIds[writeIndex] = pool.taskIds[i];
          pool.goodsIds[writeIndex] = pool.goodsIds[i];
          pool.amounts[writeIndex] = pool.amounts[i];
        }
        writeIndex++;
      }
    }
    
    pool.count = writeIndex;
    return released;
  }
}

// ==================== 建造管理器 ====================

/**
 * 建造管理器
 * 处理建筑建造的所有逻辑
 */
export class ConstructionManager {
  private config: ConstructionConfig;
  private materialChecker: MaterialChecker;
  
  constructor(config: ConstructionConfig = DEFAULT_CONSTRUCTION_CONFIG) {
    this.config = config;
    this.materialChecker = new MaterialChecker();
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<ConstructionConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): ConstructionConfig {
    return { ...this.config };
  }
  
  /**
   * 检查是否可以建造
   */
  canConstruct(
    buildingTypeId: number,
    companyId: number,
    queue: ConstructionQueueSystem,
    inventoryGetter: (goodsId: number) => number,
    cashGetter: () => number,
    priceGetter?: (goodsId: number) => number,
  ): { canBuild: boolean; missingMaterials: MaterialRequirement[]; missingCash: number; reason?: string } {
    // 检查建筑类型是否存在
    const buildingType = BUILDINGS_BY_ID.get(buildingTypeId);
    if (!buildingType) {
      return { canBuild: false, missingMaterials: [], missingCash: 0, reason: '未知的建筑类型' };
    }
    
    // 检查队列限制
    const companyQueueCount = this.getCompanyQueueCount(queue, companyId);
    if (companyQueueCount >= this.config.maxQueuePerCompany) {
      return { canBuild: false, missingMaterials: [], missingCash: 0, reason: '建造队列已满' };
    }
    
    // 获取材料需求
    const materials = getBaseMaterials(buildingTypeId);
    
    // 检查材料
    const materialCheck = this.materialChecker.checkMaterials(
      materials, inventoryGetter, priceGetter
    );
    
    // 检查现金
    const cash = cashGetter();
    const missingCash = Math.max(0, buildingType.buildCost - cash);
    
    const canBuild = materialCheck.sufficient && missingCash === 0;
    
    return {
      canBuild,
      missingMaterials: materialCheck.missing,
      missingCash,
      reason: canBuild ? undefined : (
        !materialCheck.sufficient ? '材料不足' : '现金不足'
      ),
    };
  }
  
  /**
   * 开始建造新建筑
   */
  startConstruction(
    queue: ConstructionQueueSystem,
    materialsPool: ReservedMaterialsPool,
    companyId: number,
    buildingTypeId: number,
    currentTick: number,
    outputModeId: number = -1,
  ): { success: boolean; taskId?: number; error?: string } {
    // 检查队列容量
    if (queue.activeCount >= queue.maxTasks) {
      return { success: false, error: '系统建造队列已满' };
    }
    
    // 获取建筑类型
    const buildingType = BUILDINGS_BY_ID.get(buildingTypeId);
    if (!buildingType) {
      return { success: false, error: '未知的建筑类型' };
    }
    
    // 获取材料需求
    const materials = getBaseMaterials(buildingTypeId);
    const buildTime = getBuildTime(buildingTypeId);
    
    // 分配任务
    const taskIndex = queue.activeCount;
    const taskId = queue.nextTaskId++;
    
    // 预留材料
    const materialsStart = materialsPool.count;
    if (!this.materialChecker.reserveMaterials(materialsPool, taskId, materials)) {
      return { success: false, error: '预留材料池已满' };
    }
    
    // 填充任务数据
    queue.taskIds[taskIndex] = taskId;
    queue.companyIds[taskIndex] = companyId;
    queue.buildingTypeIds[taskIndex] = buildingTypeId;
    queue.taskTypes[taskIndex] = ConstructionType.NEW_BUILDING;
    queue.statuses[taskIndex] = ConstructionStatus.QUEUED;
    queue.targetLevels[taskIndex] = 1;
    
    queue.startTicks[taskIndex] = currentTick;
    queue.requiredTicks[taskIndex] = buildTime;
    queue.progressTicks[taskIndex] = 0;
    
    queue.speedBoosts[taskIndex] = 1.0;
    
    queue.reservedMaterialsStart[taskIndex] = materialsStart;
    queue.reservedMaterialsCount[taskIndex] = materials.length;
    
    queue.cashCosts[taskIndex] = buildingType.buildCost;
    
    queue.existingBuildingIds[taskIndex] = -1;
    queue.outputModeIds[taskIndex] = outputModeId;
    
    queue.activeCount++;
    
    return { success: true, taskId };
  }
  
  /**
   * 开始升级建筑
   */
  startUpgrade(
    queue: ConstructionQueueSystem,
    materialsPool: ReservedMaterialsPool,
    companyId: number,
    buildingId: number,
    buildingTypeId: number,
    currentLevel: number,
    targetLevel: number,
    currentTick: number,
  ): { success: boolean; taskId?: number; error?: string } {
    // 检查队列容量
    if (queue.activeCount >= queue.maxTasks) {
      return { success: false, error: '系统建造队列已满' };
    }
    
    // 获取建筑类型
    const buildingType = BUILDINGS_BY_ID.get(buildingTypeId);
    if (!buildingType) {
      return { success: false, error: '未知的建筑类型' };
    }
    
    // 检查等级
    if (targetLevel <= currentLevel) {
      return { success: false, error: '目标等级必须高于当前等级' };
    }
    
    if (targetLevel > buildingType.maxLevel) {
      return { success: false, error: '超过最大等级限制' };
    }
    
    // 获取升级材料
    const materials = getUpgradeMaterials(buildingTypeId, targetLevel);
    const buildTime = Math.ceil(getBuildTime(buildingTypeId) * 0.5); // 升级时间为建造时间的一半
    
    // 获取升级费用
    const upgradeCost = buildingType.upgradeCosts[targetLevel - 1] || 0;
    
    // 分配任务
    const taskIndex = queue.activeCount;
    const taskId = queue.nextTaskId++;
    
    // 预留材料
    const materialsStart = materialsPool.count;
    if (materials.length > 0) {
      if (!this.materialChecker.reserveMaterials(materialsPool, taskId, materials)) {
        return { success: false, error: '预留材料池已满' };
      }
    }
    
    // 填充任务数据
    queue.taskIds[taskIndex] = taskId;
    queue.companyIds[taskIndex] = companyId;
    queue.buildingTypeIds[taskIndex] = buildingTypeId;
    queue.taskTypes[taskIndex] = ConstructionType.UPGRADE;
    queue.statuses[taskIndex] = ConstructionStatus.QUEUED;
    queue.targetLevels[taskIndex] = targetLevel;
    
    queue.startTicks[taskIndex] = currentTick;
    queue.requiredTicks[taskIndex] = buildTime;
    queue.progressTicks[taskIndex] = 0;
    
    queue.speedBoosts[taskIndex] = 1.0;
    
    queue.reservedMaterialsStart[taskIndex] = materialsStart;
    queue.reservedMaterialsCount[taskIndex] = materials.length;
    
    queue.cashCosts[taskIndex] = upgradeCost;
    
    queue.existingBuildingIds[taskIndex] = buildingId;
    queue.outputModeIds[taskIndex] = -1;
    
    queue.activeCount++;
    
    return { success: true, taskId };
  }
  
  /**
   * 取消建造任务
   */
  cancelConstruction(
    queue: ConstructionQueueSystem,
    materialsPool: ReservedMaterialsPool,
    taskId: number,
  ): { success: boolean; refundedMaterials: MaterialRequirement[]; refundedCash: number; error?: string } {
    // 查找任务
    let taskIndex = -1;
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.taskIds[i] === taskId) {
        taskIndex = i;
        break;
      }
    }
    
    if (taskIndex === -1) {
      return { success: false, refundedMaterials: [], refundedCash: 0, error: '任务不存在' };
    }
    
    const status = queue.statuses[taskIndex];
    if (status === ConstructionStatus.COMPLETED || status === ConstructionStatus.CANCELLED) {
      return { success: false, refundedMaterials: [], refundedCash: 0, error: '任务已完成或已取消' };
    }
    
    // 计算退款
    const progress = queue.progressTicks[taskIndex] / queue.requiredTicks[taskIndex];
    const refundRate = this.config.cancelRefundRate * (1 - progress);
    const cashRefundRate = this.config.cancelCashRefundRate * (1 - progress);
    
    // 释放预留材料
    const releasedMaterials = this.materialChecker.releaseReservedMaterials(materialsPool, taskId);
    
    // 计算退还材料
    const refundedMaterials: MaterialRequirement[] = releasedMaterials.map(mat => ({
      goodsId: mat.goodsId,
      amount: Math.floor(mat.amount * refundRate),
    })).filter(mat => mat.amount > 0);
    
    // 计算退还现金
    const refundedCash = Math.floor(queue.cashCosts[taskIndex] * cashRefundRate);
    
    // 标记为取消
    queue.statuses[taskIndex] = ConstructionStatus.CANCELLED;
    
    return { success: true, refundedMaterials, refundedCash };
  }
  
  /**
   * 暂停建造任务
   */
  pauseConstruction(
    queue: ConstructionQueueSystem,
    taskId: number,
  ): { success: boolean; error?: string } {
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.taskIds[i] === taskId) {
        if (queue.statuses[i] === ConstructionStatus.BUILDING) {
          queue.statuses[i] = ConstructionStatus.PAUSED;
          return { success: true };
        }
        return { success: false, error: '只能暂停正在建造的任务' };
      }
    }
    return { success: false, error: '任务不存在' };
  }
  
  /**
   * 恢复建造任务
   */
  resumeConstruction(
    queue: ConstructionQueueSystem,
    taskId: number,
  ): { success: boolean; error?: string } {
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.taskIds[i] === taskId) {
        if (queue.statuses[i] === ConstructionStatus.PAUSED) {
          queue.statuses[i] = ConstructionStatus.BUILDING;
          return { success: true };
        }
        return { success: false, error: '只能恢复暂停的任务' };
      }
    }
    return { success: false, error: '任务不存在' };
  }
  
  /**
   * 使用加速道具
   */
  applySpeedBoost(
    queue: ConstructionQueueSystem,
    taskId: number,
    boostMultiplier: number,
  ): boolean {
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.taskIds[i] === taskId) {
        const newBoost = Math.min(
          queue.speedBoosts[i] * boostMultiplier,
          this.config.speedBoostMax
        );
        queue.speedBoosts[i] = newBoost;
        return true;
      }
    }
    return false;
  }
  
  /**
   * 处理每tick的建造进度
   */
  processTick(
    queue: ConstructionQueueSystem,
  ): ConstructionEvent[] {
    const events: ConstructionEvent[] = [];
    
    // 启动队列中的任务（最多同时建造 simultaneousBuilds 个）
    let buildingCount = 0;
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.statuses[i] === ConstructionStatus.BUILDING) {
        buildingCount++;
      }
    }
    
    for (let i = 0; i < queue.activeCount && buildingCount < this.config.simultaneousBuilds; i++) {
      if (queue.statuses[i] === ConstructionStatus.QUEUED) {
        queue.statuses[i] = ConstructionStatus.BUILDING;
        buildingCount++;
        
        events.push({
          type: 'construction_started',
          taskId: queue.taskIds[i],
          companyId: queue.companyIds[i],
          buildingTypeId: queue.buildingTypeIds[i],
          taskType: queue.taskTypes[i],
        });
      }
    }
    
    // 处理进行中的任务
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.statuses[i] !== ConstructionStatus.BUILDING) {
        continue;
      }
      
      // 应用加速
      const boost = queue.speedBoosts[i];
      queue.progressTicks[i] += boost;
      
      // 检查是否完成
      if (queue.progressTicks[i] >= queue.requiredTicks[i]) {
        queue.statuses[i] = ConstructionStatus.COMPLETED;
        
        events.push({
          type: 'construction_complete',
          taskId: queue.taskIds[i],
          companyId: queue.companyIds[i],
          buildingTypeId: queue.buildingTypeIds[i],
          taskType: queue.taskTypes[i],
        });
      }
    }
    
    return events;
  }
  
  /**
   * 获取公司的建造队列
   */
  getCompanyQueue(
    queue: ConstructionQueueSystem,
    materialsPool: ReservedMaterialsPool,
    companyId: number,
  ): ConstructionTask[] {
    const tasks: ConstructionTask[] = [];
    
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.companyIds[i] !== companyId) continue;
      if (queue.statuses[i] === ConstructionStatus.COMPLETED ||
          queue.statuses[i] === ConstructionStatus.CANCELLED) continue;
      
      // 获取预留材料
      const start = queue.reservedMaterialsStart[i];
      const count = queue.reservedMaterialsCount[i];
      const reservedMaterials: MaterialRequirement[] = [];
      
      for (let j = start; j < start + count; j++) {
        reservedMaterials.push({
          goodsId: materialsPool.goodsIds[j],
          amount: materialsPool.amounts[j],
        });
      }
      
      tasks.push({
        taskId: queue.taskIds[i],
        companyId: queue.companyIds[i],
        buildingTypeId: queue.buildingTypeIds[i],
        taskType: queue.taskTypes[i],
        status: queue.statuses[i],
        targetLevel: queue.targetLevels[i],
        
        startTick: queue.startTicks[i],
        requiredTicks: queue.requiredTicks[i],
        progressTicks: queue.progressTicks[i],
        
        speedBoost: queue.speedBoosts[i],
        
        reservedMaterials,
        cashCost: queue.cashCosts[i],
        
        existingBuildingId: queue.existingBuildingIds[i],
        outputModeId: queue.outputModeIds[i],
      });
    }
    
    return tasks;
  }
  
  /**
   * 获取公司的队列数量
   */
  getCompanyQueueCount(queue: ConstructionQueueSystem, companyId: number): number {
    let count = 0;
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.companyIds[i] === companyId &&
          queue.statuses[i] !== ConstructionStatus.COMPLETED &&
          queue.statuses[i] !== ConstructionStatus.CANCELLED) {
        count++;
      }
    }
    return count;
  }
  
  /**
   * 获取建造进度百分比
   */
  getProgress(queue: ConstructionQueueSystem, taskId: number): number {
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
  getEstimatedCompletion(queue: ConstructionQueueSystem, taskId: number): number {
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.taskIds[i] === taskId) {
        const remaining = queue.requiredTicks[i] - queue.progressTicks[i];
        return Math.ceil(remaining / queue.speedBoosts[i]);
      }
    }
    return 0;
  }
  
  /**
   * 清理已完成和已取消的任务
   */
  cleanupCompletedTasks(queue: ConstructionQueueSystem): number {
    let cleaned = 0;
    let writeIndex = 0;
    
    for (let i = 0; i < queue.activeCount; i++) {
      if (queue.statuses[i] === ConstructionStatus.COMPLETED ||
          queue.statuses[i] === ConstructionStatus.CANCELLED) {
        cleaned++;
        continue;
      }
      
      if (writeIndex !== i) {
        // 移动任务到新位置
        queue.taskIds[writeIndex] = queue.taskIds[i];
        queue.companyIds[writeIndex] = queue.companyIds[i];
        queue.buildingTypeIds[writeIndex] = queue.buildingTypeIds[i];
        queue.taskTypes[writeIndex] = queue.taskTypes[i];
        queue.statuses[writeIndex] = queue.statuses[i];
        queue.targetLevels[writeIndex] = queue.targetLevels[i];
        queue.startTicks[writeIndex] = queue.startTicks[i];
        queue.requiredTicks[writeIndex] = queue.requiredTicks[i];
        queue.progressTicks[writeIndex] = queue.progressTicks[i];
        queue.speedBoosts[writeIndex] = queue.speedBoosts[i];
        queue.reservedMaterialsStart[writeIndex] = queue.reservedMaterialsStart[i];
        queue.reservedMaterialsCount[writeIndex] = queue.reservedMaterialsCount[i];
        queue.cashCosts[writeIndex] = queue.cashCosts[i];
        queue.existingBuildingIds[writeIndex] = queue.existingBuildingIds[i];
        queue.outputModeIds[writeIndex] = queue.outputModeIds[i];
      }
      
      writeIndex++;
    }
    
    queue.activeCount = writeIndex;
    return cleaned;
  }
}

// ==================== 导出单例 ====================
export const constructionManager = new ConstructionManager();
export const materialChecker = new MaterialChecker();