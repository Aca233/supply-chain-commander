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
 * 方式ID分配规则（适配新的40种建筑，ID 0-39）
 * 每个建筑类型分配100个ID空间
 */
export const METHOD_ID_RANGES = {
  // 采掘类 (0-14): ID 10000-11499
  EXTRACTION_START: 10000,
  EXTRACTION_PER_BUILDING: 100,
  
  // 加工类 (15-26): ID 11500-12699
  PROCESSING_START: 11500,
  PROCESSING_PER_BUILDING: 100,
  
  // 制造类 (27-36): ID 12700-13699
  MANUFACTURING_START: 12700,
  MANUFACTURING_PER_BUILDING: 100,
  
  // 奢侈品类 (37-38): ID 13700-13899
  LUXURY_START: 13700,
  LUXURY_PER_BUILDING: 100,
  
  // 服务类 (39): ID 13900-13999
  SERVICE_START: 13900,
  SERVICE_PER_BUILDING: 100,
};

/**
 * 计算建筑的方式ID起始值
 * 适配新的40种建筑（ID 0-39）
 */
export function getMethodIdBase(buildingTypeId: number): number {
  if (buildingTypeId <= 14) {
    // 采掘类 (0-14)
    return METHOD_ID_RANGES.EXTRACTION_START + buildingTypeId * METHOD_ID_RANGES.EXTRACTION_PER_BUILDING;
  } else if (buildingTypeId <= 26) {
    // 加工类 (15-26)
    return METHOD_ID_RANGES.PROCESSING_START + (buildingTypeId - 15) * METHOD_ID_RANGES.PROCESSING_PER_BUILDING;
  } else if (buildingTypeId <= 36) {
    // 制造类 (27-36)
    return METHOD_ID_RANGES.MANUFACTURING_START + (buildingTypeId - 27) * METHOD_ID_RANGES.MANUFACTURING_PER_BUILDING;
  } else if (buildingTypeId <= 38) {
    // 奢侈品类 (37-38)
    return METHOD_ID_RANGES.LUXURY_START + (buildingTypeId - 37) * METHOD_ID_RANGES.LUXURY_PER_BUILDING;
  } else {
    // 服务类 (39)
    return METHOD_ID_RANGES.SERVICE_START + (buildingTypeId - 39) * METHOD_ID_RANGES.SERVICE_PER_BUILDING;
  }
}