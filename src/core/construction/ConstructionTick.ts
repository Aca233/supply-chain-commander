/**
 * 建造/拆除系统游戏循环集成
 * 每tick处理建造队列和拆除队列的进度更新
 */

import { GameWorld } from '../world/GameWorld';
import { ConstructionStatus, DemolitionStatus } from '../world/GameWorld';
import { GOODS_COUNT, MAX_CONCURRENT_CONSTRUCTIONS, MAX_CONCURRENT_DEMOLITIONS } from '../constants';
import { getBuildingConstructionConfig, MaterialRequirement, getBaseMaterials, getBuildTime } from '../../data/buildingMaterials';
import { ALL_BUILDINGS, BUILDINGS_BY_ID, BuildingTypeDefinition, isRetailBuilding } from '../../data/buildings';
import { registerRetailStore } from '../economy/RetailSystem';

/**
 * 建造/拆除系统tick结果
 */
export interface ConstructionTickResult {
  // 建造相关
  constructionsProcessed: number;
  constructionsCompleted: number;
  constructionsCancelled: number;
  materialsConsumed: number;
  
  // 拆除相关
  demolitionsProcessed: number;
  demolitionsCompleted: number;
  demolitionsCancelled: number;
  materialsRecovered: number;
  cashRecovered: number;
  
  // 新建筑
  newBuildings: number[];  // 新建成的建筑ID列表
  upgradedBuildings: number[];  // 升级完成的建筑ID列表
  demolishedBuildings: number[];  // 拆除完成的建筑ID列表
}

/**
 * 处理建造队列tick更新
 */
function processConstructionTick(world: GameWorld): {
  processed: number;
  completed: number;
  cancelled: number;
  materialsConsumed: number;
  newBuildings: number[];
  upgradedBuildings: number[];
} {
  const construction = world.construction;
  const reservedMaterials = world.reservedMaterials;
  const companies = world.companies;
  const buildingsData = world.buildings;
  
  let processed = 0;
  let completed = 0;
  let cancelled = 0;
  let materialsConsumed = 0;
  const newBuildings: number[] = [];
  const upgradedBuildings: number[] = [];
  
  // 按公司分组处理建造队列
  const companyQueues = new Map<number, number[]>();
  
  for (let i = 0; i < construction.maxQueueSize; i++) {
    if (construction.isActive[i] === 0) continue;
    
    const companyId = construction.companyIds[i];
    if (!companyQueues.has(companyId)) {
      companyQueues.set(companyId, []);
    }
    companyQueues.get(companyId)!.push(i);
  }
  
  // 处理每个公司的建造队列
  for (const [companyId, queueIndices] of companyQueues) {
    // 按状态排序：优先处理正在进行的
    queueIndices.sort((a, b) => {
      const statusA = construction.statuses[a];
      const statusB = construction.statuses[b];
      if (statusA === ConstructionStatus.IN_PROGRESS && statusB !== ConstructionStatus.IN_PROGRESS) return -1;
      if (statusA !== ConstructionStatus.IN_PROGRESS && statusB === ConstructionStatus.IN_PROGRESS) return 1;
      return construction.startTicks[a] - construction.startTicks[b];
    });
    
    let activeCount = 0;
    
    for (const queueIdx of queueIndices) {
      const status = construction.statuses[queueIdx];
      
      // 跳过已完成或已取消的
      if (status === ConstructionStatus.COMPLETED || status === ConstructionStatus.CANCELLED) {
        continue;
      }
      
      // 检查是否超过同时建造上限
      if (status === ConstructionStatus.WAITING && activeCount >= MAX_CONCURRENT_CONSTRUCTIONS) {
        continue;
      }
      
      // 处理等待中的建造任务
      if (status === ConstructionStatus.WAITING) {
        // 检查材料是否已预留完毕
        const buildingTypeId = construction.buildingTypeIds[queueIdx];
        const targetLevel = construction.targetLevels[queueIdx];
        const config = getBuildingConstructionConfig(buildingTypeId);
        
        if (!config) {
          // 配置不存在，取消建造
          construction.statuses[queueIdx] = ConstructionStatus.CANCELLED;
          construction.isActive[queueIdx] = 0;
          cancelled++;
          continue;
        }
        
        // 检查并预留材料
        // 升级任务：使用基础材料的50%
        let materials: MaterialRequirement[];
        if (targetLevel === 1) {
          // 新建：使用完整的基础材料
          materials = config.baseMaterials;
        } else {
          // 升级：优先使用升级材料配置，如果没有则使用基础材料的50%
          const upgradeMats = config.upgradeMaterials[targetLevel - 2];
          if (upgradeMats && upgradeMats.length > 0) {
            materials = upgradeMats;
          } else {
            // 没有专门的升级材料配置，使用基础材料的50%
            materials = config.baseMaterials.map(mat => ({
              goodsId: mat.goodsId,
              amount: Math.ceil(mat.amount * 0.5),
            }));
          }
        }
        
        let allMaterialsReserved = true;
        
        // 确保至少需要一些材料（防止空数组直接通过）
        if (materials.length === 0) {
          allMaterialsReserved = false;
          console.warn(`[建造系统] 建筑类型 ${buildingTypeId} 没有配置材料需求`);
          continue;
        }
        
        for (const mat of materials) {
          const inventoryIdx = companyId * GOODS_COUNT + mat.goodsId;
          const available = companies.inventories[inventoryIdx] - companies.inventoryReserved[inventoryIdx];
          
          if (available < mat.amount) {
            allMaterialsReserved = false;
            break;
          }
        }
        
        if (allMaterialsReserved) {
          // 预留材料
          for (const mat of materials) {
            const inventoryIdx = companyId * GOODS_COUNT + mat.goodsId;
            companies.inventoryReserved[inventoryIdx] += mat.amount;
            
            // 记录到预留材料池
            if (reservedMaterials.count < reservedMaterials.maxSize) {
              const poolIdx = reservedMaterials.count++;
              reservedMaterials.queueIds[poolIdx] = queueIdx;
              reservedMaterials.goodsIds[poolIdx] = mat.goodsId;
              reservedMaterials.quantities[poolIdx] = mat.amount;
              reservedMaterials.companyIds[poolIdx] = companyId;
              reservedMaterials.isReserved[poolIdx] = 1;
            }
          }
          
          // 开始建造
          construction.statuses[queueIdx] = ConstructionStatus.IN_PROGRESS;
          construction.startTicks[queueIdx] = world.tick;
          construction.estimatedEndTicks[queueIdx] = world.tick + config.buildTime;
          activeCount++;
        }
      }
      
      // 处理正在进行的建造任务
      if (construction.statuses[queueIdx] === ConstructionStatus.IN_PROGRESS) {
        activeCount++;
        processed++;
        
        const buildingTypeId = construction.buildingTypeIds[queueIdx];
        const config = getBuildingConstructionConfig(buildingTypeId);
        
        if (!config) continue;
        
        // 更新进度
        const elapsed = world.tick - construction.startTicks[queueIdx];
        const progress = Math.min(1, elapsed / config.buildTime);
        construction.progress[queueIdx] = progress;
        
        // 检查是否完成
        if (progress >= 1) {
          const targetLevel = construction.targetLevels[queueIdx];
          const existingBuildingId = construction.existingBuildingIds[queueIdx];
          
          // 消耗预留的材料
          for (let i = 0; i < reservedMaterials.count; i++) {
            if (reservedMaterials.queueIds[i] === queueIdx && reservedMaterials.isReserved[i] === 1) {
              const goodsId = reservedMaterials.goodsIds[i];
              const quantity = reservedMaterials.quantities[i];
              const matCompanyId = reservedMaterials.companyIds[i];
              
              const inventoryIdx = matCompanyId * GOODS_COUNT + goodsId;
              companies.inventories[inventoryIdx] -= quantity;
              companies.inventoryReserved[inventoryIdx] -= quantity;
              
              reservedMaterials.isReserved[i] = 0;
              materialsConsumed++;
            }
          }
          
          // 创建或升级建筑
          if (existingBuildingId >= 0) {
            // 升级现有建筑 - 添加等级保护，防止降级
            const currentLevel = buildingsData.levels[existingBuildingId];
            if (targetLevel > currentLevel) {
              buildingsData.levels[existingBuildingId] = targetLevel;
              upgradedBuildings.push(existingBuildingId);
            } else {
              // 目标等级不高于当前等级，跳过升级（可能建筑已被其他方式升级）
              console.log(`[建造系统] 跳过升级：建筑#${existingBuildingId}当前等级${currentLevel}已>=目标等级${targetLevel}`);
            }
          } else {
            // 创建新建筑
            if (buildingsData.count < buildingsData.maxCount) {
              const newBuildingId = buildingsData.count++;
              buildingsData.types[newBuildingId] = buildingTypeId;
              buildingsData.owners[newBuildingId] = companyId;
              buildingsData.levels[newBuildingId] = 1;
              buildingsData.efficiencies[newBuildingId] = 1.0;
              buildingsData.isActive[newBuildingId] = 1;
              buildingsData.progress[newBuildingId] = 0;
              
              // 设置配方ID - 优先使用建造时指定的配方，否则使用默认配方
              let recipeId = construction.recipeIds[queueIdx];
              if (recipeId === 0) {
                // 没有指定配方，使用建筑类型的默认配方
                const buildingType = BUILDINGS_BY_ID.get(buildingTypeId);
                if (buildingType) {
                  recipeId = buildingType.defaultRecipeId;
                }
              }
              buildingsData.recipeIds[newBuildingId] = recipeId;
              
              // 【性能优化】更新公司建筑计数
              world.companies.buildingCounts[companyId]++;
              
              newBuildings.push(newBuildingId);
            }
          }
          
          // 标记完成
          construction.statuses[queueIdx] = ConstructionStatus.COMPLETED;
          construction.isActive[queueIdx] = 0;
          completed++;
        }
      }
    }
  }
  
  return {
    processed,
    completed,
    cancelled,
    materialsConsumed,
    newBuildings,
    upgradedBuildings,
  };
}

/**
 * 处理拆除队列tick更新
 */
function processDemolitionTick(world: GameWorld): {
  processed: number;
  completed: number;
  cancelled: number;
  materialsRecovered: number;
  cashRecovered: number;
  demolishedBuildings: number[];
} {
  const demolition = world.demolition;
  const recoveredMaterials = world.recoveredMaterials;
  const companies = world.companies;
  const buildingsData = world.buildings;
  
  let processed = 0;
  let completed = 0;
  let cancelled = 0;
  let materialsRecovered = 0;
  let cashRecovered = 0;
  const demolishedBuildings: number[] = [];
  
  // 按公司分组处理拆除队列
  const companyQueues = new Map<number, number[]>();
  
  for (let i = 0; i < demolition.maxQueueSize; i++) {
    if (demolition.isActive[i] === 0) continue;
    
    const companyId = demolition.companyIds[i];
    if (!companyQueues.has(companyId)) {
      companyQueues.set(companyId, []);
    }
    companyQueues.get(companyId)!.push(i);
  }
  
  // 处理每个公司的拆除队列
  for (const [companyId, queueIndices] of companyQueues) {
    // 按状态排序
    queueIndices.sort((a, b) => {
      const statusA = demolition.statuses[a];
      const statusB = demolition.statuses[b];
      if (statusA === DemolitionStatus.IN_PROGRESS && statusB !== DemolitionStatus.IN_PROGRESS) return -1;
      if (statusA !== DemolitionStatus.IN_PROGRESS && statusB === DemolitionStatus.IN_PROGRESS) return 1;
      return demolition.startTicks[a] - demolition.startTicks[b];
    });
    
    let activeCount = 0;
    
    for (const queueIdx of queueIndices) {
      const status = demolition.statuses[queueIdx];
      
      // 跳过已完成或已取消的
      if (status === DemolitionStatus.COMPLETED || status === DemolitionStatus.CANCELLED) {
        continue;
      }
      
      // 检查是否超过同时拆除上限
      if (status === DemolitionStatus.WAITING && activeCount >= MAX_CONCURRENT_DEMOLITIONS) {
        continue;
      }
      
      // 处理等待中的拆除任务
      if (status === DemolitionStatus.WAITING) {
        const buildingId = demolition.buildingIds[queueIdx];
        const demolitionCost = demolition.demolitionCosts[queueIdx];
        
        // 检查是否有足够现金支付拆除费用
        if (companies.cash[companyId] >= demolitionCost) {
          // 扣除拆除费用
          companies.cash[companyId] -= demolitionCost;
          
          // 开始拆除
          demolition.statuses[queueIdx] = DemolitionStatus.IN_PROGRESS;
          demolition.startTicks[queueIdx] = world.tick;
          
          // 拆除时间 = 建造时间的一半
          const buildingTypeId = demolition.buildingTypeIds[queueIdx];
          const config = getBuildingConstructionConfig(buildingTypeId);
          const demolishTime = config ? Math.floor(config.buildTime / 2) : 24;
          demolition.estimatedEndTicks[queueIdx] = world.tick + demolishTime;
          
          // 停止建筑运营
          buildingsData.isActive[buildingId] = 0;
          
          activeCount++;
        }
      }
      
      // 处理正在进行的拆除任务
      if (demolition.statuses[queueIdx] === DemolitionStatus.IN_PROGRESS) {
        activeCount++;
        processed++;
        
        const buildingTypeId = demolition.buildingTypeIds[queueIdx];
        const config = getBuildingConstructionConfig(buildingTypeId);
        const demolishTime = config ? Math.floor(config.buildTime / 2) : 24;
        
        // 更新进度
        const elapsed = world.tick - demolition.startTicks[queueIdx];
        const progress = Math.min(1, elapsed / demolishTime);
        demolition.progress[queueIdx] = progress;
        
        // 检查是否完成
        if (progress >= 1) {
          const buildingId = demolition.buildingIds[queueIdx];
          const buildingLevel = demolition.buildingLevels[queueIdx];
          
          // 计算回收材料
          if (config) {
            const baseMaterials = config.baseMaterials;
            const recoveryRate = 0.5; // 50%回收率
            
            for (const mat of baseMaterials) {
              const recoveredQty = mat.amount * recoveryRate;
              
              // 添加到回收材料池
              if (recoveredMaterials.count < recoveredMaterials.maxSize) {
                const poolIdx = recoveredMaterials.count++;
                recoveredMaterials.queueIds[poolIdx] = queueIdx;
                recoveredMaterials.goodsIds[poolIdx] = mat.goodsId;
                recoveredMaterials.quantities[poolIdx] = recoveredQty;
                recoveredMaterials.targetCompanyIds[poolIdx] = companyId;
                recoveredMaterials.isCollected[poolIdx] = 0;
              }
              
              materialsRecovered++;
            }
          }
          
          // 发放现金回收
          const estimatedCash = demolition.estimatedCashRecovery[queueIdx];
          companies.cash[companyId] += estimatedCash;
          cashRecovered += estimatedCash;
          
          // 【性能优化】更新公司建筑计数（在修改owners之前获取companyId）
          const originalOwner = buildingsData.owners[buildingId];
          if (originalOwner < world.companies.count && world.companies.buildingCounts[originalOwner] > 0) {
            world.companies.buildingCounts[originalOwner]--;
          }
          
          // 标记建筑为已拆除（将所有者设为0xFFFF表示无效）
          buildingsData.owners[buildingId] = 0xFFFF;
          buildingsData.isActive[buildingId] = 0;
          demolishedBuildings.push(buildingId);
          
          // 标记拆除完成
          demolition.statuses[queueIdx] = DemolitionStatus.COMPLETED;
          demolition.isActive[queueIdx] = 0;
          completed++;
        }
      }
    }
  }
  
  return {
    processed,
    completed,
    cancelled,
    materialsRecovered,
    cashRecovered,
    demolishedBuildings,
  };
}

/**
 * 处理回收材料领取
 * 玩家需要主动领取回收的材料
 */
export function collectRecoveredMaterials(world: GameWorld, companyId: number): {
  collected: number;
  materials: Array<{ goodsId: number; quantity: number }>;
} {
  const recoveredMaterials = world.recoveredMaterials;
  const companies = world.companies;
  
  const collected: Array<{ goodsId: number; quantity: number }> = [];
  let collectedCount = 0;
  
  for (let i = 0; i < recoveredMaterials.count; i++) {
    if (recoveredMaterials.targetCompanyIds[i] === companyId && 
        recoveredMaterials.isCollected[i] === 0) {
      const goodsId = recoveredMaterials.goodsIds[i];
      const quantity = recoveredMaterials.quantities[i];
      
      // 添加到公司库存
      const inventoryIdx = companyId * GOODS_COUNT + goodsId;
      companies.inventories[inventoryIdx] += quantity;
      
      // 标记为已领取
      recoveredMaterials.isCollected[i] = 1;
      
      collected.push({ goodsId, quantity });
      collectedCount++;
    }
  }
  
  return {
    collected: collectedCount,
    materials: collected,
  };
}

/**
 * 取消建造任务
 */
export function cancelConstruction(world: GameWorld, queueIdx: number): {
  success: boolean;
  refundedCash: number;
  refundedMaterials: Array<{ goodsId: number; quantity: number }>;
} {
  const construction = world.construction;
  const reservedMaterials = world.reservedMaterials;
  const companies = world.companies;
  
  if (construction.isActive[queueIdx] === 0) {
    return { success: false, refundedCash: 0, refundedMaterials: [] };
  }
  
  const status = construction.statuses[queueIdx];
  if (status === ConstructionStatus.COMPLETED || status === ConstructionStatus.CANCELLED) {
    return { success: false, refundedCash: 0, refundedMaterials: [] };
  }
  
  const companyId = construction.companyIds[queueIdx];
  const refundedMaterials: Array<{ goodsId: number; quantity: number }> = [];
  
  // 退还预留的材料
  for (let i = 0; i < reservedMaterials.count; i++) {
    if (reservedMaterials.queueIds[i] === queueIdx && reservedMaterials.isReserved[i] === 1) {
      const goodsId = reservedMaterials.goodsIds[i];
      const quantity = reservedMaterials.quantities[i];
      
      const inventoryIdx = companyId * GOODS_COUNT + goodsId;
      companies.inventoryReserved[inventoryIdx] -= quantity;
      
      reservedMaterials.isReserved[i] = 0;
      refundedMaterials.push({ goodsId, quantity });
    }
  }
  
  // 计算现金退款（已支付的部分按80%退还）
  const progress = construction.progress[queueIdx];
  const buildingTypeId = construction.buildingTypeIds[queueIdx];
  const buildingDef = ALL_BUILDINGS.find((b: BuildingTypeDefinition) => b.id === buildingTypeId);
  const baseCost = buildingDef?.buildCost || 0;
  
  const paidAmount = baseCost * progress;
  const refundRate = 0.8; // 80%退款率
  const refundedCash = paidAmount * refundRate;
  
  if (refundedCash > 0) {
    companies.cash[companyId] += refundedCash;
  }
  
  // 标记为已取消
  construction.statuses[queueIdx] = ConstructionStatus.CANCELLED;
  construction.isActive[queueIdx] = 0;
  
  return {
    success: true,
    refundedCash,
    refundedMaterials,
  };
}

/**
 * 取消拆除任务
 */
export function cancelDemolition(world: GameWorld, queueIdx: number): {
  success: boolean;
  buildingRestored: boolean;
} {
  const demolition = world.demolition;
  const buildingsData = world.buildings;
  
  if (demolition.isActive[queueIdx] === 0) {
    return { success: false, buildingRestored: false };
  }
  
  const status = demolition.statuses[queueIdx];
  if (status === DemolitionStatus.COMPLETED || status === DemolitionStatus.CANCELLED) {
    return { success: false, buildingRestored: false };
  }
  
  // 恢复建筑运营
  const buildingId = demolition.buildingIds[queueIdx];
  buildingsData.isActive[buildingId] = 1;
  
  // 标记为已取消（注意：拆除费用不退还）
  demolition.statuses[queueIdx] = DemolitionStatus.CANCELLED;
  demolition.isActive[queueIdx] = 0;
  
  return {
    success: true,
    buildingRestored: true,
  };
}

/**
 * 主tick处理函数
 */
export function processConstructionAndDemolitionTick(world: GameWorld): ConstructionTickResult {
  // 处理建造队列
  const constructionResult = processConstructionTick(world);
  
  // 处理拆除队列
  const demolitionResult = processDemolitionTick(world);
  
  return {
    constructionsProcessed: constructionResult.processed,
    constructionsCompleted: constructionResult.completed,
    constructionsCancelled: constructionResult.cancelled,
    materialsConsumed: constructionResult.materialsConsumed,
    
    demolitionsProcessed: demolitionResult.processed,
    demolitionsCompleted: demolitionResult.completed,
    demolitionsCancelled: demolitionResult.cancelled,
    materialsRecovered: demolitionResult.materialsRecovered,
    cashRecovered: demolitionResult.cashRecovered,
    
    newBuildings: constructionResult.newBuildings,
    upgradedBuildings: constructionResult.upgradedBuildings,
    demolishedBuildings: demolitionResult.demolishedBuildings,
  };
}

/**
 * 获取公司的建造队列状态
 */
export function getCompanyConstructionQueue(world: GameWorld, companyId: number): Array<{
  queueIdx: number;
  buildingTypeId: number;
  buildingName: string;
  targetLevel: number;
  status: ConstructionStatus;
  progress: number;
  estimatedEndTick: number;
  isUpgrade: boolean;
}> {
  const construction = world.construction;
  const result: Array<{
    queueIdx: number;
    buildingTypeId: number;
    buildingName: string;
    targetLevel: number;
    status: ConstructionStatus;
    progress: number;
    estimatedEndTick: number;
    isUpgrade: boolean;
  }> = [];
  
  for (let i = 0; i < construction.maxQueueSize; i++) {
    if (construction.isActive[i] === 0) continue;
    if (construction.companyIds[i] !== companyId) continue;
    
    const buildingTypeId = construction.buildingTypeIds[i];
    const buildingDef = ALL_BUILDINGS.find((b: BuildingTypeDefinition) => b.id === buildingTypeId);
    
    result.push({
      queueIdx: i,
      buildingTypeId,
      buildingName: buildingDef?.name || `建筑#${buildingTypeId}`,
      targetLevel: construction.targetLevels[i],
      status: construction.statuses[i] as ConstructionStatus,
      progress: construction.progress[i],
      estimatedEndTick: construction.estimatedEndTicks[i],
      isUpgrade: construction.existingBuildingIds[i] >= 0,
    });
  }
  
  return result;
}

/**
 * 获取公司的拆除队列状态
 */
export function getCompanyDemolitionQueue(world: GameWorld, companyId: number): Array<{
  queueIdx: number;
  buildingId: number;
  buildingTypeId: number;
  buildingName: string;
  status: DemolitionStatus;
  progress: number;
  estimatedEndTick: number;
  estimatedCashRecovery: number;
  isHazardous: boolean;
}> {
  const demolition = world.demolition;
  const result: Array<{
    queueIdx: number;
    buildingId: number;
    buildingTypeId: number;
    buildingName: string;
    status: DemolitionStatus;
    progress: number;
    estimatedEndTick: number;
    estimatedCashRecovery: number;
    isHazardous: boolean;
  }> = [];
  
  for (let i = 0; i < demolition.maxQueueSize; i++) {
    if (demolition.isActive[i] === 0) continue;
    if (demolition.companyIds[i] !== companyId) continue;
    
    const buildingTypeId = demolition.buildingTypeIds[i];
    const buildingDef = ALL_BUILDINGS.find((b: BuildingTypeDefinition) => b.id === buildingTypeId);
    
    result.push({
      queueIdx: i,
      buildingId: demolition.buildingIds[i],
      buildingTypeId,
      buildingName: buildingDef?.name || `建筑#${buildingTypeId}`,
      status: demolition.statuses[i] as DemolitionStatus,
      progress: demolition.progress[i],
      estimatedEndTick: demolition.estimatedEndTicks[i],
      estimatedCashRecovery: demolition.estimatedCashRecovery[i],
      isHazardous: demolition.isHazardous[i] === 1,
    });
  }
  
  return result;
}

/**
 * 开始新建筑建造
 * 将建造任务添加到建造队列
 */
export function startConstruction(
  world: GameWorld,
  companyId: number,
  buildingTypeId: number,
  recipeId: number = 0
): {
  success: boolean;
  queueIdx?: number;
  error?: string;
} {
  const construction = world.construction;
  
  // 检查建筑类型是否有效
  const buildingDef = ALL_BUILDINGS.find((b: BuildingTypeDefinition) => b.id === buildingTypeId);
  if (!buildingDef) {
    return { success: false, error: '无效的建筑类型' };
  }
  
  // 查找空闲的队列槽位
  let freeSlot = -1;
  for (let i = 0; i < construction.maxQueueSize; i++) {
    if (construction.isActive[i] === 0) {
      freeSlot = i;
      break;
    }
  }
  
  if (freeSlot === -1) {
    return { success: false, error: '建造队列已满' };
  }
  
  // 获取建造配置
  const config = getBuildingConstructionConfig(buildingTypeId);
  const buildTime = config?.buildTime || getBuildTime(buildingTypeId);
  
  // 获取默认配方ID（如果未指定）
  let finalRecipeId = recipeId;
  if (finalRecipeId === 0) {
    finalRecipeId = buildingDef.defaultRecipeId;
  }
  
  // 添加到队列
  construction.isActive[freeSlot] = 1;
  construction.companyIds[freeSlot] = companyId;
  construction.buildingTypeIds[freeSlot] = buildingTypeId;
  construction.targetLevels[freeSlot] = 1;
  construction.existingBuildingIds[freeSlot] = -1; // 新建，不是升级
  construction.statuses[freeSlot] = ConstructionStatus.WAITING;
  construction.progress[freeSlot] = 0;
  construction.startTicks[freeSlot] = world.tick;
  construction.estimatedEndTicks[freeSlot] = world.tick + buildTime;
  construction.recipeIds[freeSlot] = finalRecipeId; // 存储配方ID
  
  return { success: true, queueIdx: freeSlot };
}

/**
 * 开始升级建筑
 */
export function startUpgrade(
  world: GameWorld,
  companyId: number,
  buildingId: number,
  targetLevel: number
): {
  success: boolean;
  queueIdx?: number;
  error?: string;
} {
  const construction = world.construction;
  const buildingsData = world.buildings;
  
  // 检查建筑是否存在并属于该公司
  if (buildingId >= buildingsData.count || buildingsData.owners[buildingId] !== companyId) {
    return { success: false, error: '建筑不存在或不属于该公司' };
  }
  
  const buildingTypeId = buildingsData.types[buildingId];
  const currentLevel = buildingsData.levels[buildingId];
  
  // 检查目标等级
  if (targetLevel <= currentLevel) {
    return { success: false, error: '目标等级必须高于当前等级' };
  }
  
  const buildingDef = ALL_BUILDINGS.find((b: BuildingTypeDefinition) => b.id === buildingTypeId);
  if (!buildingDef) {
    return { success: false, error: '无效的建筑类型' };
  }
  
  if (targetLevel > buildingDef.maxLevel) {
    return { success: false, error: '超过最大等级' };
  }
  
  // 查找空闲的队列槽位
  let freeSlot = -1;
  for (let i = 0; i < construction.maxQueueSize; i++) {
    if (construction.isActive[i] === 0) {
      freeSlot = i;
      break;
    }
  }
  
  if (freeSlot === -1) {
    return { success: false, error: '建造队列已满' };
  }
  
  // 获取升级配置
  const config = getBuildingConstructionConfig(buildingTypeId);
  const buildTime = config?.buildTime ? Math.floor(config.buildTime * 0.5) : 24; // 升级时间为建造时间的50%
  
  // 添加到队列
  construction.isActive[freeSlot] = 1;
  construction.companyIds[freeSlot] = companyId;
  construction.buildingTypeIds[freeSlot] = buildingTypeId;
  construction.targetLevels[freeSlot] = targetLevel;
  construction.existingBuildingIds[freeSlot] = buildingId; // 升级现有建筑
  construction.statuses[freeSlot] = ConstructionStatus.WAITING;
  construction.progress[freeSlot] = 0;
  construction.startTicks[freeSlot] = world.tick;
  construction.estimatedEndTicks[freeSlot] = world.tick + buildTime;
  
  return { success: true, queueIdx: freeSlot };
}

/**
 * 开始建筑拆除
 * 将拆除任务添加到拆除队列
 */
export function startDemolition(
  world: GameWorld,
  companyId: number,
  buildingId: number
): {
  success: boolean;
  queueIdx?: number;
  error?: string;
} {
  const demolition = world.demolition;
  const buildingsData = world.buildings;
  
  // 检查建筑是否存在并属于该公司
  if (buildingId >= buildingsData.count || buildingsData.owners[buildingId] !== companyId) {
    return { success: false, error: '建筑不存在或不属于该公司' };
  }
  
  // 检查建筑是否已在拆除队列中
  for (let i = 0; i < demolition.maxQueueSize; i++) {
    if (demolition.isActive[i] === 1 && demolition.buildingIds[i] === buildingId) {
      return { success: false, error: '该建筑已在拆除队列中' };
    }
  }
  
  // 查找空闲的队列槽位
  let freeSlot = -1;
  for (let i = 0; i < demolition.maxQueueSize; i++) {
    if (demolition.isActive[i] === 0) {
      freeSlot = i;
      break;
    }
  }
  
  if (freeSlot === -1) {
    return { success: false, error: '拆除队列已满' };
  }
  
  const buildingTypeId = buildingsData.types[buildingId];
  const buildingLevel = buildingsData.levels[buildingId];
  const buildingDef = ALL_BUILDINGS.find((b: BuildingTypeDefinition) => b.id === buildingTypeId);
  
  // 计算拆除费用和回收金额
  const baseCost = buildingDef?.buildCost || 0;
  const demolitionCost = Math.floor(baseCost * 0.1); // 拆除费用为建造成本的10%
  const cashRecovery = Math.floor(baseCost * 0.3); // 现金回收为建造成本的30%
  
  // 计算拆除时间
  const config = getBuildingConstructionConfig(buildingTypeId);
  const buildTime = config?.buildTime || getBuildTime(buildingTypeId);
  const demolishTime = Math.floor(buildTime / 2);
  
  // 添加到队列
  demolition.isActive[freeSlot] = 1;
  demolition.companyIds[freeSlot] = companyId;
  demolition.buildingIds[freeSlot] = buildingId;
  demolition.buildingTypeIds[freeSlot] = buildingTypeId;
  demolition.buildingLevels[freeSlot] = buildingLevel;
  demolition.statuses[freeSlot] = DemolitionStatus.WAITING;
  demolition.progress[freeSlot] = 0;
  demolition.startTicks[freeSlot] = world.tick;
  demolition.estimatedEndTicks[freeSlot] = world.tick + demolishTime;
  demolition.demolitionCosts[freeSlot] = demolitionCost;
  demolition.estimatedCashRecovery[freeSlot] = cashRecovery;
  demolition.isHazardous[freeSlot] = 0;
  
  return { success: true, queueIdx: freeSlot };
}