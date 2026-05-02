/**
 * ServiceConsumption - 服务消费系统
 * 
 * 核心功能：
 * 1. Pop通过服务设施（医院、学校、银行等）消费服务类商品
 * 2. 服务设施根据产能提供服务
 * 3. 服务费用转化为设施所有者的收入
 * 
 * 服务类商品的特殊性：
 * - 无法库存（即产即消）
 * - 消费发生在服务设施而非零售店
 * - 需求与人口规模和收入水平相关
 */

import { GameWorld } from '../world/GameWorld';
import { SERVICE_GOODS_LIST, ALL_GOODS, GOODS_BY_ID } from '@/data/goods';
import { BUILDINGS_BY_ID, ALL_BUILDINGS } from '@/data/buildings';
import { CONSUMER_TIERS } from './DemandCurve';
import { GOODS_COUNT, TICKS_PER_DAY } from '../constants';
import { recordFinalConsumption, setDemandPressure } from './MarketStats';

// ==================== 类型定义 ====================

/** 服务设施配置 */
export interface ServiceFacilityConfig {
  buildingTypeId: number;      // 建筑类型ID
  serviceGoodsId: number;      // 提供的服务商品ID
  capacityPerTick: number;     // 每tick最大服务人数
  basePriceMultiplier: number; // 定价倍率（相对基准价）
}

/** 服务设施状态 */
interface ServiceFacility {
  buildingId: number;
  ownerId: number;
  config: ServiceFacilityConfig;
  dailyCustomers: number;
  dailyRevenue: number;
  utilization: number;  // 使用率 0-1
}

/** 服务消费结果 */
export interface ServiceConsumptionResult {
  totalServiceProvided: number;
  totalRevenue: number;
  totalCustomers: number;
  facilityResults: Map<number, { customers: number; revenue: number; utilization: number }>;
  goodsResults: Map<number, { quantity: number; revenue: number }>;
}

// ==================== 配置数据 ====================

/**
 * 建筑类型 → 服务商品映射
 *
 * 建筑ID对应 buildings.ts 中的定义
 * 服务商品ID对应 goods.ts 中的定义
 *
 * 注意：服务业建筑已在精简中删除，此配置暂时为空
 * 保留结构以便未来扩展
 */
const SERVICE_BUILDING_CONFIGS: ServiceFacilityConfig[] = [
  // 服务业建筑已删除，此配置为空
  // 未来可在此添加新的服务设施配置
];

// 建立建筑类型到配置的映射
const CONFIG_BY_BUILDING_TYPE = new Map<number, ServiceFacilityConfig>();
for (const config of SERVICE_BUILDING_CONFIGS) {
  CONFIG_BY_BUILDING_TYPE.set(config.buildingTypeId, config);
}

// 建立服务商品到配置列表的映射
const CONFIGS_BY_GOODS_ID = new Map<number, ServiceFacilityConfig[]>();
for (const config of SERVICE_BUILDING_CONFIGS) {
  const list = CONFIGS_BY_GOODS_ID.get(config.serviceGoodsId) || [];
  list.push(config);
  CONFIGS_BY_GOODS_ID.set(config.serviceGoodsId, list);
}

// ==================== 缓存 ====================

/** 服务设施缓存 */
interface ServiceFacilityCache {
  facilities: ServiceFacility[];
  facilitiesByGoods: Map<number, ServiceFacility[]>;
  lastUpdate: number;
  updateInterval: number;
}

const facilityCache: ServiceFacilityCache = {
  facilities: [],
  facilitiesByGoods: new Map(),
  lastUpdate: -1000,
  updateInterval: 24,  // 每天更新一次
};

/** 服务需求缓存 */
interface ServiceDemandCache {
  demandByGoods: Map<number, number>;
  lastUpdate: number;
  updateInterval: number;
}

const demandCache: ServiceDemandCache = {
  demandByGoods: new Map(),
  lastUpdate: -1000,
  updateInterval: 24,
};

// ==================== 核心函数 ====================

/**
 * 更新服务设施缓存
 */
function updateFacilityCache(world: GameWorld): void {
  if (world.tick - facilityCache.lastUpdate < facilityCache.updateInterval) {
    return;
  }
  
  facilityCache.facilities = [];
  facilityCache.facilitiesByGoods.clear();
  
  const b = world.buildings;
  
  for (let buildingId = 0; buildingId < b.count; buildingId++) {
    if (!b.isActive[buildingId]) continue;
    
    const buildingType = b.types[buildingId];
    const config = CONFIG_BY_BUILDING_TYPE.get(buildingType);
    
    if (!config) continue;
    
    const facility: ServiceFacility = {
      buildingId,
      ownerId: b.owners[buildingId],
      config,
      dailyCustomers: 0,
      dailyRevenue: 0,
      utilization: 0,
    };
    
    facilityCache.facilities.push(facility);
    
    // 按商品ID分类
    const list = facilityCache.facilitiesByGoods.get(config.serviceGoodsId) || [];
    list.push(facility);
    facilityCache.facilitiesByGoods.set(config.serviceGoodsId, list);
  }
  
  facilityCache.lastUpdate = world.tick;
}

/**
 * 计算服务类商品的需求
 */
function calculateServiceDemand(world: GameWorld, goodsId: number): number {
  const goods = GOODS_BY_ID.get(goodsId);
  if (!goods || !goods.isService) return 0;
  
  // 基于人口和收入计算需求
  let totalDemand = 0;
  const basePrice = goods.basePrice;
  const currentPrice = world.goods.prices[goodsId] || basePrice;
  const priceRatio = currentPrice / basePrice;
  
  for (const tier of CONSUMER_TIERS) {
    // 人均服务消费频率（根据收入调整）
    const incomeRatio = tier.baseIncome / 12000;  // 相对于中等收入
    let perCapitaRate = 0.005;  // 基础消费率（每人每tick）- 从0.001提高5倍
    
    // 收入弹性调整
    perCapitaRate *= Math.pow(incomeRatio, goods.incomeElasticity);
    
    // 价格弹性调整
    perCapitaRate *= Math.pow(priceRatio, goods.priceElasticity);
    
    // 根据服务类型调整消费率 - 全面提高
    switch (goods.key) {
      case 'education-service':
        perCapitaRate *= 0.3;   // 从0.1提高到0.3
        break;
      case 'healthcare-service':
        perCapitaRate *= 0.2;   // 从0.05提高到0.2
        break;
      case 'entertainment-service':
        perCapitaRate *= 1.0;   // 从0.5提高到1.0
        break;
      case 'catering-service':
        perCapitaRate *= 2.5;   // 从1.5提高到2.5
        break;
      case 'transport-service':
        perCapitaRate *= 3.0;   // 从2.0提高到3.0
        break;
      case 'financial-service':
        perCapitaRate *= 0.3;   // 从0.1提高到0.3
        break;
      case 'hotel-service':
        perCapitaRate *= 0.08;  // 从0.02提高到0.08
        break;
      default:
        perCapitaRate *= 0.6;   // 从0.3提高到0.6
    }
    
    totalDemand += tier.population * perCapitaRate;
  }
  
  // 经济周期调整
  const cycleFactor = 0.8 + world.economyStats.cyclePosition * 0.4;
  totalDemand *= cycleFactor;
  
  return totalDemand;
}

/**
 * 更新服务需求缓存
 */
function updateDemandCache(world: GameWorld): void {
  if (world.tick - demandCache.lastUpdate < demandCache.updateInterval) {
    return;
  }
  
  demandCache.demandByGoods.clear();
  
  for (const goods of SERVICE_GOODS_LIST) {
    const demand = calculateServiceDemand(world, goods.id);
    demandCache.demandByGoods.set(goods.id, demand);
    
    // 更新world中的需求数据
    const grossDemand = demand * TICKS_PER_DAY;
    world.goods.demands[goods.id] = grossDemand;
    setDemandPressure(world, goods.id, grossDemand);
  }
  
  demandCache.lastUpdate = world.tick;
}

/**
 * 处理服务消费
 * 每tick调用一次
 */
export function processServiceConsumption(world: GameWorld): ServiceConsumptionResult {
  const result: ServiceConsumptionResult = {
    totalServiceProvided: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    facilityResults: new Map(),
    goodsResults: new Map(),
  };
  
  // 更新缓存
  updateFacilityCache(world);
  updateDemandCache(world);
  
  if (facilityCache.facilities.length === 0) {
    return result;
  }
  
  const c = world.companies;
  
  // 遍历每种服务商品
  for (const [goodsId, demand] of demandCache.demandByGoods) {
    const facilities = facilityCache.facilitiesByGoods.get(goodsId);
    if (!facilities || facilities.length === 0) continue;
    
    const goods = GOODS_BY_ID.get(goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    let remainingDemand = demand;
    let goodsQuantity = 0;
    let goodsRevenue = 0;
    
    // 计算总容量
    let totalCapacity = 0;
    for (const facility of facilities) {
      totalCapacity += facility.config.capacityPerTick;
    }
    
    if (totalCapacity <= 0) continue;
    
    // 按容量比例分配需求
    for (const facility of facilities) {
      if (remainingDemand <= 0) break;
      
      const { config, ownerId, buildingId } = facility;
      const capacity = config.capacityPerTick;
      
      // 分配量 = min(需求 × 该设施占比, 容量)
      const allocation = Math.min(
        remainingDemand * (capacity / totalCapacity),
        capacity
      );
      
      if (allocation <= 0) continue;
      
      // 计算价格和收入
      const price = basePrice * config.basePriceMultiplier;
      const revenue = allocation * price;
      
      // 收入转入设施所有者
      c.cash[ownerId] += revenue;
      
      // 服务即产即消：交付服务满足需求，不增加商品供给存量
      recordFinalConsumption(world, goodsId, allocation);
      
      // 记录设施结果
      const customers = Math.ceil(allocation);
      const utilization = allocation / capacity;
      
      facility.dailyCustomers += customers;
      facility.dailyRevenue += revenue;
      facility.utilization = utilization;
      
      result.facilityResults.set(buildingId, {
        customers,
        revenue,
        utilization,
      });
      
      // 累计统计
      goodsQuantity += allocation;
      goodsRevenue += revenue;
      remainingDemand -= allocation;
      
      result.totalServiceProvided += allocation;
      result.totalRevenue += revenue;
      result.totalCustomers += customers;
    }
    
    // 记录商品结果
    result.goodsResults.set(goodsId, {
      quantity: goodsQuantity,
      revenue: goodsRevenue,
    });
  }
  
  // 调试日志（每100 tick输出一次）
  if (world.tick % 100 === 0 && result.totalServiceProvided > 0) {
    console.log(`[服务消费 T${world.tick}] 设施数:${facilityCache.facilities.length}, 服务量:${result.totalServiceProvided.toFixed(0)}, 收入:¥${result.totalRevenue.toFixed(0)}, 客流:${result.totalCustomers}`);
  }
  
  return result;
}

/**
 * 每日重置服务设施统计
 * 在每天0点调用
 */
export function resetDailyServiceStats(): void {
  for (const facility of facilityCache.facilities) {
    facility.dailyCustomers = 0;
    facility.dailyRevenue = 0;
    facility.utilization = 0;
  }
}

/**
 * 获取服务设施详情
 */
export function getServiceFacilityDetails(world: GameWorld, buildingId: number): {
  buildingId: number;
  buildingType: number;
  buildingName: string;
  serviceGoodsId: number;
  serviceGoodsName: string;
  ownerId: number;
  capacity: number;
  dailyCustomers: number;
  dailyRevenue: number;
  utilization: number;
} | null {
  const facility = facilityCache.facilities.find(f => f.buildingId === buildingId);
  if (!facility) return null;
  
  const buildingType = world.buildings.types[buildingId];
  const buildingDef = BUILDINGS_BY_ID.get(buildingType);
  const goods = GOODS_BY_ID.get(facility.config.serviceGoodsId);
  
  return {
    buildingId,
    buildingType,
    buildingName: buildingDef?.name || '未知建筑',
    serviceGoodsId: facility.config.serviceGoodsId,
    serviceGoodsName: goods?.name || '未知服务',
    ownerId: facility.ownerId,
    capacity: facility.config.capacityPerTick * TICKS_PER_DAY,
    dailyCustomers: facility.dailyCustomers,
    dailyRevenue: facility.dailyRevenue,
    utilization: facility.utilization,
  };
}

/**
 * 获取服务市场概览
 */
export function getServiceMarketOverview(world: GameWorld): {
  totalFacilities: number;
  totalDailyRevenue: number;
  totalDailyCustomers: number;
  byServiceType: Array<{
    goodsId: number;
    goodsName: string;
    facilityCount: number;
    dailyDemand: number;
    dailySupply: number;
    avgPrice: number;
  }>;
} {
  updateFacilityCache(world);
  updateDemandCache(world);
  
  let totalDailyRevenue = 0;
  let totalDailyCustomers = 0;
  
  for (const facility of facilityCache.facilities) {
    totalDailyRevenue += facility.dailyRevenue;
    totalDailyCustomers += facility.dailyCustomers;
  }
  
  const byServiceType: Array<{
    goodsId: number;
    goodsName: string;
    facilityCount: number;
    dailyDemand: number;
    dailySupply: number;
    avgPrice: number;
  }> = [];
  
  for (const goods of SERVICE_GOODS_LIST) {
    const facilities = facilityCache.facilitiesByGoods.get(goods.id) || [];
    const demand = demandCache.demandByGoods.get(goods.id) || 0;
    const supply = world.goods.supplies[goods.id] || 0;
    
    byServiceType.push({
      goodsId: goods.id,
      goodsName: goods.name,
      facilityCount: facilities.length,
      dailyDemand: demand * TICKS_PER_DAY,
      dailySupply: supply,
      avgPrice: world.goods.prices[goods.id] || goods.basePrice,
    });
  }
  
  return {
    totalFacilities: facilityCache.facilities.length,
    totalDailyRevenue,
    totalDailyCustomers,
    byServiceType,
  };
}

/**
 * 判断建筑是否为服务设施
 */
export function isServiceFacility(buildingTypeId: number): boolean {
  return CONFIG_BY_BUILDING_TYPE.has(buildingTypeId);
}

/**
 * 获取服务设施提供的服务商品ID
 */
export function getServiceGoodsId(buildingTypeId: number): number | null {
  const config = CONFIG_BY_BUILDING_TYPE.get(buildingTypeId);
  return config ? config.serviceGoodsId : null;
}
