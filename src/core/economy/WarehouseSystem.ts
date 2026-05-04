/**
 * 仓储系统
 * 管理公司存储容量、使用率计算、溢出处理和仓储费用
 *
 * 核心机制：
 * - 公司总存储容量 = 基础容量 + Σ(仓库建筑容量 × 等级系数)
 * - 库存占用超过容量时触发溢出处理
 * - 仓储费用基于实际占用量，拥挤时递增
 */

import {
  GOODS_COUNT,
  BASE_STORAGE_CAPACITY,
  WAREHOUSE_LEVEL_BONUS,
  STORAGE_WARNING_THRESHOLD,
  STORAGE_CONGESTION_MULTIPLIER,
  STORAGE_OVERFLOW_PENALTY,
  BASE_STORAGE_COST_PER_UNIT,
  TICKS_PER_DAY,
} from '@/core/constants';
import { type GameWorld, addInventory } from '@/core/world/GameWorld';
import { BUILDINGS_BY_ID, type WarehouseConfig } from '@/data/buildings';
import { GOODS_BY_ID, isServiceGoods } from '@/data/goods';

// ==================== Tick 级缓存 ====================
// 避免每 tick 对每个建筑重复遍历所有建筑来查询仓库状态
// 在一个 tick 内，建筑列表和仓库归属不会变化，因此可以安全缓存

let _cacheTick = -1;
/** companyId → 是否拥有仓库 */
const _hasWarehouseCache = new Map<number, boolean>();
/** companyId → 总存储容量 */
const _capacityCache = new Map<number, number>();
/** companyId → 有效仓储费率 */
const _rateCache = new Map<number, number>();

/**
 * 每 tick 开始时调用一次，刷新仓储缓存
 * 单次遍历所有建筑，为每个公司预计算 hasWarehouse、capacity 和费率
 */
export function refreshWarehouseCache(world: GameWorld): void {
  if (world.tick === _cacheTick) return;
  _cacheTick = world.tick;
  _hasWarehouseCache.clear();
  _capacityCache.clear();
  _rateCache.clear();

  // 中间累加：每公司的仓库总容量和加权费率
  const warehouseCap = new Map<number, number>();
  const weightedRate = new Map<number, number>();

  const b = world.buildings;
  for (let i = 0; i < b.count; i++) {
    if (b.isActive[i] !== 1) continue;
    const owner = b.owners[i];
    const def = BUILDINGS_BY_ID.get(b.types[i]);
    if (!def?.warehouseConfig) continue;

    _hasWarehouseCache.set(owner, true);
    const cap = getWarehouseBuildingCapacity(b.types[i], b.levels[i]);
    warehouseCap.set(owner, (warehouseCap.get(owner) || 0) + cap);
    weightedRate.set(owner, (weightedRate.get(owner) || 0) + cap * def.warehouseConfig.storageCostPerUnit);
  }

  // 计算最终容量和费率
  for (const [companyId, whCap] of warehouseCap) {
    _capacityCache.set(companyId, BASE_STORAGE_CAPACITY + whCap);
    const totalWithBase = whCap + BASE_STORAGE_CAPACITY;
    const blended =
      (BASE_STORAGE_CAPACITY * BASE_STORAGE_COST_PER_UNIT + (weightedRate.get(companyId) || 0)) / totalWithBase;
    _rateCache.set(companyId, blended);
  }
}

/** 手动失效缓存（建筑增删时） */
export function invalidateWarehouseCache(): void {
  _cacheTick = -1;
  _hasWarehouseCache.clear();
  _capacityCache.clear();
  _rateCache.clear();
}

// ==================== 类型定义 ====================

/** 公司存储状态 */
export interface CompanyStorageStatus {
  companyId: number;
  /** 总存储容量 */
  capacity: number;
  /** 当前库存占用 */
  usage: number;
  /** 可用空间 */
  free: number;
  /** 使用率 0-1 */
  utilization: number;
  /** 是否超过告警阈值 */
  isWarning: boolean;
  /** 是否已满 */
  isFull: boolean;
  /** 拥有的仓库数量 */
  warehouseCount: number;
}

/** 库存增加结果 */
export interface AddInventoryResult {
  /** 实际入库数量 */
  added: number;
  /** 溢出数量（无法入库的部分） */
  overflow: number;
}

/** 仓储费用明细 */
export interface StorageCostBreakdown {
  /** 基于库存量的仓储费 */
  storageFee: number;
  /** 拥挤附加费（使用率超过阈值时） */
  congestionSurcharge: number;
  /** 总仓储费 */
  total: number;
}

// ==================== 容量计算 ====================

/**
 * 计算单个仓库建筑提供的存储容量
 */
export function getWarehouseBuildingCapacity(
  buildingTypeId: number,
  level: number,
): number {
  const def = BUILDINGS_BY_ID.get(buildingTypeId);
  if (!def || !def.warehouseConfig) return 0;

  const baseCapacity = def.warehouseConfig.storageCapacity;
  // 使用建筑定义中的 capacityMultipliers（已包含等级系数）
  const levelIdx = Math.min(level - 1, def.capacityMultipliers.length - 1);
  const multiplier = def.capacityMultipliers[Math.max(0, levelIdx)];

  return baseCapacity * multiplier;
}

/**
 * 计算公司的总存储容量
 * = 基础容量 + Σ(仓库建筑容量)
 * 优先使用 tick 级缓存（refreshWarehouseCache 刷新后有效）
 */
export function getCompanyStorageCapacity(
  world: GameWorld,
  companyId: number,
): number {
  // 优先使用缓存
  if (world.tick === _cacheTick) {
    return _capacityCache.get(companyId) ?? BASE_STORAGE_CAPACITY;
  }

  let totalCapacity = BASE_STORAGE_CAPACITY;
  const b = world.buildings;

  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (b.isActive[i] !== 1) continue;

    const typeId = b.types[i];
    const def = BUILDINGS_BY_ID.get(typeId);
    if (!def || !def.warehouseConfig) continue;

    totalCapacity += getWarehouseBuildingCapacity(typeId, b.levels[i]);
  }

  return totalCapacity;
}

/**
 * 计算公司当前库存总占用量
 * 遍历该公司在所有 80 种商品上的库存之和
 * 排除服务类商品（如电力），它们不占用物理存储空间
 */
export function getCompanyInventoryUsage(
  world: GameWorld,
  companyId: number,
): number {
  const c = world.companies;
  const offset = companyId * GOODS_COUNT;
  let total = 0;

  for (let g = 0; g < GOODS_COUNT; g++) {
    // 服务类商品（电力等）不占用仓储空间
    if (isServiceGoods(g)) continue;
    const qty = c.inventories[offset + g];
    if (qty > 0) total += qty;
  }

  return total;
}

/**
 * 计算公司可用存储空间
 */
export function getCompanyFreeStorage(
  world: GameWorld,
  companyId: number,
): number {
  const capacity = getCompanyStorageCapacity(world, companyId);
  const usage = getCompanyInventoryUsage(world, companyId);
  return Math.max(0, capacity - usage);
}

/**
 * 计算公司存储使用率 (0-1+，可超过1表示超载)
 */
export function getStorageUtilization(
  world: GameWorld,
  companyId: number,
): number {
  const capacity = getCompanyStorageCapacity(world, companyId);
  if (capacity <= 0) return 1;
  return getCompanyInventoryUsage(world, companyId) / capacity;
}

/**
 * 获取公司完整存储状态
 */
export function getCompanyStorageStatus(
  world: GameWorld,
  companyId: number,
): CompanyStorageStatus {
  const capacity = getCompanyStorageCapacity(world, companyId);
  const usage = getCompanyInventoryUsage(world, companyId);
  const free = Math.max(0, capacity - usage);
  const utilization = capacity > 0 ? usage / capacity : 1;

  // 统计仓库数量
  let warehouseCount = 0;
  const b = world.buildings;
  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (b.isActive[i] !== 1) continue;
    const def = BUILDINGS_BY_ID.get(b.types[i]);
    if (def?.warehouseConfig) warehouseCount++;
  }

  return {
    companyId,
    capacity,
    usage,
    free,
    utilization,
    isWarning: utilization >= STORAGE_WARNING_THRESHOLD,
    isFull: free <= 0,
    warehouseCount,
  };
}

// ==================== 仓库存在性检查 ====================

/**
 * 检查公司是否拥有至少一个活跃的仓库建筑
 * 容量限制仅对有仓库的公司生效，无仓库的公司不受限制（向后兼容）
 * 优先使用 tick 级缓存
 */
export function hasAnyWarehouse(
  world: GameWorld,
  companyId: number,
): boolean {
  // 优先使用缓存
  if (world.tick === _cacheTick) {
    return _hasWarehouseCache.get(companyId) ?? false;
  }

  const b = world.buildings;
  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (b.isActive[i] !== 1) continue;
    const def = BUILDINGS_BY_ID.get(b.types[i]);
    if (def?.warehouseConfig) return true;
  }
  return false;
}

// ==================== 容量检查入库 ====================

/**
 * 带容量检查的库存增加
 * 返回实际入库量和溢出量，溢出部分由调用方决定处理方式
 * 服务类商品（电力等）不占物理仓储空间，直接入库不受容量限制
 */
export function addInventoryWithCapacityCheck(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  amount: number,
): AddInventoryResult {
  if (amount <= 0) return { added: 0, overflow: 0 };

  // 服务类商品（电力等）不占仓储空间，直接入库
  if (isServiceGoods(goodsId)) {
    addInventory(world, companyId, goodsId, amount);
    return { added: amount, overflow: 0 };
  }

  const free = getCompanyFreeStorage(world, companyId);
  const added = Math.min(amount, free);
  const overflow = amount - added;

  if (added > 0) {
    addInventory(world, companyId, goodsId, added);
  }

  return { added, overflow };
}

// ==================== 仓储费用 ====================

/**
 * 计算公司每 tick 的仓储费用
 */
export function calculateStorageCostPerTick(
  world: GameWorld,
  companyId: number,
  ticksPerDay: number = TICKS_PER_DAY,
): StorageCostBreakdown {
  const usage = getCompanyInventoryUsage(world, companyId);
  if (usage <= 0) return { storageFee: 0, congestionSurcharge: 0, total: 0 };

  const capacity = getCompanyStorageCapacity(world, companyId);
  const utilization = capacity > 0 ? usage / capacity : 1;

  // 计算加权平均仓储费率
  // 如果有仓库，使用仓库的费率；否则使用基础费率
  const effectiveRate = getEffectiveStorageRate(world, companyId);
  const dailyFee = usage * effectiveRate;
  const storageFee = dailyFee / ticksPerDay;

  // 拥挤附加费：使用率超过告警阈值后线性递增
  let congestionSurcharge = 0;
  if (utilization > STORAGE_WARNING_THRESHOLD) {
    const overRatio = utilization - STORAGE_WARNING_THRESHOLD;
    congestionSurcharge = storageFee * overRatio * STORAGE_CONGESTION_MULTIPLIER;
  }

  return {
    storageFee,
    congestionSurcharge,
    total: storageFee + congestionSurcharge,
  };
}

/**
 * 计算公司的有效仓储费率（加权平均）
 * 有仓库时使用仓库费率加权平均，无仓库时使用基础费率
 * 优先使用 tick 级缓存
 */
function getEffectiveStorageRate(
  world: GameWorld,
  companyId: number,
): number {
  // 优先使用缓存
  if (world.tick === _cacheTick) {
    return _rateCache.get(companyId) ?? BASE_STORAGE_COST_PER_UNIT;
  }

  const b = world.buildings;
  let totalCapacity = 0;
  let weightedRate = 0;

  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (b.isActive[i] !== 1) continue;

    const def = BUILDINGS_BY_ID.get(b.types[i]);
    if (!def?.warehouseConfig) continue;

    const cap = getWarehouseBuildingCapacity(b.types[i], b.levels[i]);
    totalCapacity += cap;
    weightedRate += cap * def.warehouseConfig.storageCostPerUnit;
  }

  if (totalCapacity <= 0) {
    return BASE_STORAGE_COST_PER_UNIT;
  }

  const totalWithBase = totalCapacity + BASE_STORAGE_CAPACITY;
  const blendedRate =
    (BASE_STORAGE_CAPACITY * BASE_STORAGE_COST_PER_UNIT + weightedRate) /
    totalWithBase;

  return blendedRate;
}

// ==================== 仓库商品限制检查 ====================

/**
 * 检查指定商品是否可以存放在公司的仓库中
 * 如果公司有限定品类的仓库（如散货堆场只限原料），
 * 需要确认该商品能否被存放
 *
 * 注意：当前实现中容量是公司级汇总，限定品类的仓库只影响计算。
 * 如果公司同时有通用仓库和限定仓库，所有商品都可以存放。
 */
export function canStoreGoods(
  world: GameWorld,
  companyId: number,
  goodsId: number,
): boolean {
  const goodsDef = GOODS_BY_ID.get(goodsId);
  if (!goodsDef) return false;

  const b = world.buildings;
  let hasAnyWarehouse = false;
  let hasUniversalWarehouse = false;

  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (b.isActive[i] !== 1) continue;

    const def = BUILDINGS_BY_ID.get(b.types[i]);
    if (!def?.warehouseConfig) continue;

    hasAnyWarehouse = true;

    const categories = def.warehouseConfig.allowedGoodsCategories;
    if (categories.length === 0) {
      hasUniversalWarehouse = true;
      break;
    }
    if (categories.includes(goodsDef.category)) {
      return true;
    }
  }

  // 基础容量（无仓库）可以存放任何商品
  if (!hasAnyWarehouse) return true;
  // 有通用仓库可以存放任何商品
  if (hasUniversalWarehouse) return true;
  // 只有限定仓库且不匹配
  // 但基础容量部分仍可存放，所以返回 true
  return true;
}

// ==================== 冷链损耗降低 ====================

/**
 * 获取公司对指定商品的最佳损耗降低系数
 * 取公司所有仓库中 spoilageReduction 的最大值
 */
export function getCompanySpoilageReduction(
  world: GameWorld,
  companyId: number,
): number {
  const b = world.buildings;
  let maxReduction = 0;

  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (b.isActive[i] !== 1) continue;

    const def = BUILDINGS_BY_ID.get(b.types[i]);
    if (!def?.warehouseConfig) continue;

    if (def.warehouseConfig.spoilageReduction > maxReduction) {
      maxReduction = def.warehouseConfig.spoilageReduction;
    }
  }

  return maxReduction;
}

// ==================== AI 建仓决策辅助 ====================

/**
 * 判断公司是否需要建造仓库
 */
export function shouldBuildWarehouse(
  world: GameWorld,
  companyId: number,
): boolean {
  const utilization = getStorageUtilization(world, companyId);
  // 使用率 > 80% 时建议建仓库
  return utilization > 0.8;
}

/**
 * 判断公司是否有在建的仓库
 */
export function hasWarehouseUnderConstruction(
  world: GameWorld,
  companyId: number,
): boolean {
  const cq = world.construction;
  for (let i = 0; i < cq.count; i++) {
    if (cq.companyIds[i] !== companyId) continue;
    if (cq.isActive[i] !== 1) continue;

    const typeId = cq.buildingTypeIds[i];
    const def = BUILDINGS_BY_ID.get(typeId);
    if (def?.warehouseConfig) return true;
  }
  return false;
}

/**
 * 推荐最适合公司的仓库类型
 * 基于公司主要生产的商品类别和规模
 */
export function recommendWarehouseType(
  world: GameWorld,
  companyId: number,
): number {
  const b = world.buildings;
  const c = world.companies;

  // 统计公司建筑数和主要商品类别
  let buildingCount = 0;
  let hasRawProduction = false;
  let hasFoodProduction = false;

  // 原料/基础材料相关建筑ID
  const rawBuildingIds = new Set([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]);
  // 食品相关建筑ID
  const foodBuildingIds = new Set([10,12,13,14,23,24,25]);

  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId) continue;
    if (b.isActive[i] !== 1) continue;
    const def = BUILDINGS_BY_ID.get(b.types[i]);
    if (!def || def.category === 'warehouse' || def.category === 'retail') continue;

    buildingCount++;
    if (rawBuildingIds.has(b.types[i])) hasRawProduction = true;
    if (foodBuildingIds.has(b.types[i])) hasFoodProduction = true;
  }

  // 食品公司优先冷链仓库
  if (hasFoodProduction) return 52; // COLD_STORAGE

  // 原料公司优先散货堆场
  if (hasRawProduction && !hasFoodProduction) return 53; // BULK_YARD

  // 大型公司（>10建筑）优先自动化仓库
  if (buildingCount > 10) return 54; // AUTOMATED_WAREHOUSE

  // 中型公司优先大型仓库
  if (buildingCount > 5) return 51; // LARGE_WAREHOUSE

  // 默认小型仓库
  return 50; // SMALL_WAREHOUSE
}
