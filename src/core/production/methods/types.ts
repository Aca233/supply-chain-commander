/**
 * 专属生产方式类型定义
 * 为每种建筑类型定义专属的槽位和生产方式
 */

// ==================== 槽位类型定义 ====================

/**
 * 建筑专属槽位类型
 */
export interface BuildingSlotType {
  id: string;                    // 槽位唯一标识，如 'steel_process'
  buildingTypeId: number;        // 所属建筑类型ID
  name: string;                  // 显示名称，如 "炼钢工艺"
  icon: string;                  // 图标
  description: string;           // 槽位描述
  order: number;                 // 显示顺序
}

/**
 * 资源修正定义
 */
export interface ResourceModifier {
  goodsId: number | 'all';       // 商品ID或'all'表示所有
  multiplier: number;            // 倍率修正
}

/**
 * 专属生产方式定义
 */
export interface BuildingProductionMethod {
  id: number;                    // 全局唯一ID
  key: string;                   // 唯一标识
  name: string;                  // 显示名称
  buildingTypeId: number;        // 适用的建筑类型
  slotId: string;                // 所属槽位ID
  
  // 资源修正
  inputModifiers: ResourceModifier[];   // 输入修正
  outputModifiers: ResourceModifier[];  // 输出修正
  
  // 成本修正
  laborMultiplier: number;              // 劳动力需求倍率
  energyMultiplier: number;             // 能源需求倍率
  maintenanceMultiplier: number;        // 维护成本倍率
  
  // 特殊效果
  qualityBonus: number;                 // 品质加成
  pollutionMultiplier: number;          // 污染倍率
  productionSpeedMultiplier: number;    // 生产速度倍率
  byproductChance?: number;             // 副产品几率 (0-1)
  byproductGoodsId?: number;            // 副产品商品ID
  byproductAmount?: number;             // 副产品数量
  
  // 解锁条件
  requiredLevel: number;                // 需要建筑等级
  requiredTech?: string;                // 需要解锁的科技（预留）
  
  // 切换成本
  switchCooldown: number;               // 切换冷却时间（tick）
  switchCost: number;                   // 切换费用
  
  // 描述信息
  description: string;                  // 方式描述
  effects: string[];                    // 效果列表（用于UI显示）
}

/**
 * 建筑槽位配置
 */
export interface BuildingMethodConfig {
  buildingTypeId: number;               // 建筑类型ID
  slots: BuildingSlotType[];            // 可用槽位列表
  methods: BuildingProductionMethod[];  // 可用方式列表
  defaultMethods: Record<string, number>; // 默认方式配置 { slotId: methodId }
}

// ==================== 计算结果类型 ====================

/**
 * 综合修正结果
 */
export interface ComputedModifiers {
  inputMultipliers: Map<number, number>;    // 各商品输入倍率
  outputMultipliers: Map<number, number>;   // 各商品输出倍率
  allInputMultiplier: number;               // 全局输入倍率
  allOutputMultiplier: number;              // 全局输出倍率
  laborMultiplier: number;                  // 劳动力倍率
  energyMultiplier: number;                 // 能源倍率
  maintenanceMultiplier: number;            // 维护倍率
  qualityBonus: number;                     // 品质加成
  pollutionMultiplier: number;              // 污染倍率
  productionSpeedMultiplier: number;        // 生产速度倍率
  byproducts: Array<{                       // 副产品列表
    goodsId: number;
    chance: number;
    amount: number;
  }>;
}

// ==================== 工具函数类型 ====================

/**
 * 获取建筑配置的函数类型
 */
export type GetBuildingConfigFn = (buildingTypeId: number) => BuildingMethodConfig | null;

/**
 * 计算修正的函数类型
 */
export type ComputeModifiersFn = (
  buildingTypeId: number,
  selectedMethods: Record<string, number>
) => ComputedModifiers;

// ==================== ID范围分配 ====================

/**
 * 方式ID分配规则（按建筑类型分段）
 * 每个建筑类型分配1000个ID空间
 */
export const METHOD_ID_RANGES = {
  // 采掘类 (0-7): ID 10000-17999
  EXTRACTION_START: 10000,
  EXTRACTION_PER_BUILDING: 1000,
  
  // 加工类 (8-15): ID 18000-25999
  PROCESSING_START: 18000,
  PROCESSING_PER_BUILDING: 1000,
  
  // 制造类 (16-21): ID 26000-31999
  MANUFACTURING_START: 26000,
  MANUFACTURING_PER_BUILDING: 1000,
  
  // 服务类 (22-24): ID 32000-34999
  SERVICE_START: 32000,
  SERVICE_PER_BUILDING: 1000,
  
  // 农业产业链 (25-28): ID 35000-38999
  AGRICULTURE_START: 35000,
  AGRICULTURE_PER_BUILDING: 1000,
  
  // 医药产业链 (29-31): ID 39000-41999
  PHARMA_START: 39000,
  PHARMA_PER_BUILDING: 1000,
  
  // 军工产业链 (32-34): ID 42000-44999
  MILITARY_START: 42000,
  MILITARY_PER_BUILDING: 1000,
  
  // 奢侈品产业链 (35-36): ID 45000-46999
  LUXURY_START: 45000,
  LUXURY_PER_BUILDING: 1000,
  
  // 科技产业链 (37-39): ID 47000-49999
  TECH_START: 47000,
  TECH_PER_BUILDING: 1000,
  
  // 补全产业链 (40-48): ID 50000-58999
  EXTENDED_START: 50000,
  EXTENDED_PER_BUILDING: 1000,
  
  // 零售类 (49-58): ID 59000-68999
  RETAIL_START: 59000,
  RETAIL_PER_BUILDING: 1000,
  
  // 日化产业链 (59-61): ID 69000-71999
  DAILY_CHEMICAL_START: 69000,
  DAILY_CHEMICAL_PER_BUILDING: 1000,
  
  // 交通运输 (62-66): ID 72000-76999
  TRANSPORT_START: 72000,
  TRANSPORT_PER_BUILDING: 1000,
  
  // 矿业扩展 (67-69): ID 77000-79999
  MINING_EXTENDED_START: 77000,
  MINING_EXTENDED_PER_BUILDING: 1000,
  
  // 纺织扩展 (70-72): ID 80000-82999
  TEXTILE_EXTENDED_START: 80000,
  TEXTILE_EXTENDED_PER_BUILDING: 1000,
  
  // 建材扩展 (73-75): ID 83000-85999
  BUILDING_EXTENDED_START: 83000,
  BUILDING_EXTENDED_PER_BUILDING: 1000,
  
  // 农产品深加工 (76-79): ID 86000-89999
  AGRI_DEEP_START: 86000,
  AGRI_DEEP_PER_BUILDING: 1000,
  
  // 能源扩展 (80-83): ID 90000-93999
  ENERGY_EXTENDED_START: 90000,
  ENERGY_EXTENDED_PER_BUILDING: 1000,
  
  // 通信产业链 (84-87): ID 94000-97999
  TELECOM_START: 94000,
  TELECOM_PER_BUILDING: 1000,
  
  // 服务业扩展 (88-93): ID 98000-103999
  SERVICE_EXTENDED_START: 98000,
  SERVICE_EXTENDED_PER_BUILDING: 1000,
  
  // 文化传媒 (94-97): ID 104000-107999
  CULTURAL_START: 104000,
  CULTURAL_PER_BUILDING: 1000,
  
  // 杂项建筑 (98-106): ID 108000-116999
  MISC_START: 108000,
  MISC_PER_BUILDING: 1000,
};

/**
 * 计算建筑的方式ID起始值
 */
export function getMethodIdBase(buildingTypeId: number): number {
  if (buildingTypeId <= 7) {
    return METHOD_ID_RANGES.EXTRACTION_START + buildingTypeId * METHOD_ID_RANGES.EXTRACTION_PER_BUILDING;
  } else if (buildingTypeId <= 15) {
    return METHOD_ID_RANGES.PROCESSING_START + (buildingTypeId - 8) * METHOD_ID_RANGES.PROCESSING_PER_BUILDING;
  } else if (buildingTypeId <= 21) {
    return METHOD_ID_RANGES.MANUFACTURING_START + (buildingTypeId - 16) * METHOD_ID_RANGES.MANUFACTURING_PER_BUILDING;
  } else if (buildingTypeId <= 24) {
    return METHOD_ID_RANGES.SERVICE_START + (buildingTypeId - 22) * METHOD_ID_RANGES.SERVICE_PER_BUILDING;
  } else if (buildingTypeId <= 28) {
    return METHOD_ID_RANGES.AGRICULTURE_START + (buildingTypeId - 25) * METHOD_ID_RANGES.AGRICULTURE_PER_BUILDING;
  } else if (buildingTypeId <= 31) {
    return METHOD_ID_RANGES.PHARMA_START + (buildingTypeId - 29) * METHOD_ID_RANGES.PHARMA_PER_BUILDING;
  } else if (buildingTypeId <= 34) {
    return METHOD_ID_RANGES.MILITARY_START + (buildingTypeId - 32) * METHOD_ID_RANGES.MILITARY_PER_BUILDING;
  } else if (buildingTypeId <= 36) {
    return METHOD_ID_RANGES.LUXURY_START + (buildingTypeId - 35) * METHOD_ID_RANGES.LUXURY_PER_BUILDING;
  } else if (buildingTypeId <= 39) {
    return METHOD_ID_RANGES.TECH_START + (buildingTypeId - 37) * METHOD_ID_RANGES.TECH_PER_BUILDING;
  } else if (buildingTypeId <= 48) {
    return METHOD_ID_RANGES.EXTENDED_START + (buildingTypeId - 40) * METHOD_ID_RANGES.EXTENDED_PER_BUILDING;
  } else if (buildingTypeId <= 58) {
    return METHOD_ID_RANGES.RETAIL_START + (buildingTypeId - 49) * METHOD_ID_RANGES.RETAIL_PER_BUILDING;
  } else if (buildingTypeId <= 61) {
    return METHOD_ID_RANGES.DAILY_CHEMICAL_START + (buildingTypeId - 59) * METHOD_ID_RANGES.DAILY_CHEMICAL_PER_BUILDING;
  } else if (buildingTypeId <= 66) {
    return METHOD_ID_RANGES.TRANSPORT_START + (buildingTypeId - 62) * METHOD_ID_RANGES.TRANSPORT_PER_BUILDING;
  } else if (buildingTypeId <= 69) {
    return METHOD_ID_RANGES.MINING_EXTENDED_START + (buildingTypeId - 67) * METHOD_ID_RANGES.MINING_EXTENDED_PER_BUILDING;
  } else if (buildingTypeId <= 72) {
    return METHOD_ID_RANGES.TEXTILE_EXTENDED_START + (buildingTypeId - 70) * METHOD_ID_RANGES.TEXTILE_EXTENDED_PER_BUILDING;
  } else if (buildingTypeId <= 75) {
    return METHOD_ID_RANGES.BUILDING_EXTENDED_START + (buildingTypeId - 73) * METHOD_ID_RANGES.BUILDING_EXTENDED_PER_BUILDING;
  } else if (buildingTypeId <= 79) {
    return METHOD_ID_RANGES.AGRI_DEEP_START + (buildingTypeId - 76) * METHOD_ID_RANGES.AGRI_DEEP_PER_BUILDING;
  } else if (buildingTypeId <= 83) {
    return METHOD_ID_RANGES.ENERGY_EXTENDED_START + (buildingTypeId - 80) * METHOD_ID_RANGES.ENERGY_EXTENDED_PER_BUILDING;
  } else if (buildingTypeId <= 87) {
    return METHOD_ID_RANGES.TELECOM_START + (buildingTypeId - 84) * METHOD_ID_RANGES.TELECOM_PER_BUILDING;
  } else if (buildingTypeId <= 93) {
    return METHOD_ID_RANGES.SERVICE_EXTENDED_START + (buildingTypeId - 88) * METHOD_ID_RANGES.SERVICE_EXTENDED_PER_BUILDING;
  } else if (buildingTypeId <= 97) {
    return METHOD_ID_RANGES.CULTURAL_START + (buildingTypeId - 94) * METHOD_ID_RANGES.CULTURAL_PER_BUILDING;
  } else {
    return METHOD_ID_RANGES.MISC_START + (buildingTypeId - 98) * METHOD_ID_RANGES.MISC_PER_BUILDING;
  }
}