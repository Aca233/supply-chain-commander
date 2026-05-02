/**
 * 模块化附属设施系统
 * 允许玩家为建筑添加附属模块来增强功能
 */

// ==================== 类型定义 ====================

/**
 * 附属设施类型
 */
export type FacilityType =
  | 'storage'        // 仓储设施
  | 'logistics'      // 物流设施
  | 'research'       // 研发设施
  | 'maintenance'    // 维护设施
  | 'worker'         // 员工设施
  | 'environmental'  // 环保设施
  | 'security';      // 安保设施

/**
 * 附属设施定义
 */
export interface FacilityDefinition {
  id: number;
  key: string;
  name: string;
  description: string;
  type: FacilityType;
  
  // 成本
  buildCost: number;           // 建造成本
  dailyMaintenance: number;    // 每日维护费
  
  // 前置条件
  requiredBuildingLevel: number;
  requiredBuildingTypes?: number[];  // 限定建筑类型（空表示通用）
  
  // 效果修正
  effects: FacilityEffects;
  
  // 限制
  maxPerBuilding: number;      // 每个建筑最多安装数量
  stackable: boolean;          // 效果是否可叠加
  
  // 尺寸（占用的附属槽位）
  slots: number;
}

/**
 * 附属设施效果
 */
export interface FacilityEffects {
  // 存储效果
  storageCapacity?: number;           // 增加存储容量
  storageEfficiency?: number;         // 存储效率（减少损耗）
  
  // 物流效果
  loadingSpeed?: number;              // 装卸速度倍数
  transportCostReduction?: number;    // 运输成本降低百分比
  
  // 生产效果
  productionBonus?: number;           // 生产量加成
  qualityBonus?: number;              // 品质加成
  efficiencyBonus?: number;           // 效率加成
  
  // 成本效果
  laborReduction?: number;            // 劳动力需求降低
  energyReduction?: number;           // 能源需求降低
  maintenanceReduction?: number;      // 维护成本降低
  
  // 研发效果
  researchSpeed?: number;             // 研发速度加成
  innovationChance?: number;          // 创新几率加成
  
  // 环境效果
  pollutionReduction?: number;        // 污染降低
  wasteRecycling?: number;            // 废料回收率
  
  // 安全效果
  accidentReduction?: number;         // 事故率降低
  sabotageProtection?: number;        // 破坏防护
  
  // 特殊效果
  specialEffect?: string;             // 特殊效果标识
}

/**
 * 建筑的附属设施实例
 */
export interface BuildingFacility {
  facilityId: number;
  level: number;          // 设施等级（用于可升级设施）
  installedTick: number;  // 安装时间
  condition: number;      // 设施状态 0-1
}

// ==================== 附属设施定义 ====================

/**
 * 仓储类设施
 */
const STORAGE_FACILITIES: FacilityDefinition[] = [
  {
    id: 1,
    key: 'basic_warehouse',
    name: '基础仓库',
    description: '扩展建筑的存储能力，可存放更多原材料和产品',
    type: 'storage',
    buildCost: 50000,
    dailyMaintenance: 100,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 500,
      storageEfficiency: 0.95,
    },
    maxPerBuilding: 3,
    stackable: true,
    slots: 1,
  },
  {
    id: 2,
    key: 'cold_storage',
    name: '冷藏仓库',
    description: '低温存储设施，适合存放易腐商品',
    type: 'storage',
    buildCost: 150000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 2,
    requiredBuildingTypes: [13, 25, 26, 27, 28], // 食品厂、农场类
    effects: {
      storageCapacity: 300,
      storageEfficiency: 0.98,
      specialEffect: 'cold_chain',
    },
    maxPerBuilding: 2,
    stackable: true,
    slots: 2,
  },
  {
    id: 3,
    key: 'automated_warehouse',
    name: '自动化仓库',
    description: '全自动存取系统，大幅提升存储效率',
    type: 'storage',
    buildCost: 500000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 3,
    effects: {
      storageCapacity: 1000,
      storageEfficiency: 0.99,
      laborReduction: 0.2,
      loadingSpeed: 1.5,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 3,
  },
];

/**
 * 物流类设施
 */
const LOGISTICS_FACILITIES: FacilityDefinition[] = [
  {
    id: 10,
    key: 'loading_dock',
    name: '装卸码头',
    description: '专用装卸区域，加快货物进出速度',
    type: 'logistics',
    buildCost: 80000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 1,
    effects: {
      loadingSpeed: 1.3,
      transportCostReduction: 0.05,
    },
    maxPerBuilding: 2,
    stackable: true,
    slots: 1,
  },
  {
    id: 11,
    key: 'rail_siding',
    name: '铁路专用线',
    description: '连接铁路网络，降低大宗运输成本',
    type: 'logistics',
    buildCost: 300000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 2,
    requiredBuildingTypes: [0, 1, 2, 3, 4, 5, 8, 9, 14], // 矿场、钢铁厂、炼油厂、水泥厂
    effects: {
      loadingSpeed: 1.2,
      transportCostReduction: 0.15,
      storageCapacity: 200,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 2,
  },
  {
    id: 12,
    key: 'fleet_garage',
    name: '车队车库',
    description: '自有运输车队，显著降低运输成本',
    type: 'logistics',
    buildCost: 200000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 2,
    effects: {
      transportCostReduction: 0.2,
      loadingSpeed: 1.1,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 2,
  },
];

/**
 * 研发类设施
 */
const RESEARCH_FACILITIES: FacilityDefinition[] = [
  {
    id: 20,
    key: 'quality_lab',
    name: '品质实验室',
    description: '产品质量检测和改进实验室',
    type: 'research',
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0,
      researchSpeed: 0.1,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 2,
  },
  {
    id: 21,
    key: 'rd_center',
    name: '研发中心',
    description: '专业研发团队，提升创新能力',
    type: 'research',
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 3,
    requiredBuildingTypes: [16, 17, 18, 29, 30, 31, 37, 38, 39], // 高科技、制药、军工
    effects: {
      qualityBonus: 0,
      researchSpeed: 0.3,
      innovationChance: 0,
      efficiencyBonus: 0,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 3,
  },
  {
    id: 22,
    key: 'process_optimization',
    name: '工艺优化室',
    description: '持续改进生产工艺，提升效率',
    type: 'research',
    buildCost: 150000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 2,
    effects: {
      efficiencyBonus: 0,
      productionBonus: 0,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 1,
  },
];

/**
 * 维护类设施
 */
const MAINTENANCE_FACILITIES: FacilityDefinition[] = [
  {
    id: 30,
    key: 'maintenance_shop',
    name: '维修车间',
    description: '基础维护设施，降低维护成本',
    type: 'maintenance',
    buildCost: 80000,
    dailyMaintenance: 150,
    requiredBuildingLevel: 1,
    effects: {
      maintenanceReduction: 0.15,
      accidentReduction: 0.1,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 1,
  },
  {
    id: 31,
    key: 'spare_parts_storage',
    name: '备件仓库',
    description: '常备维修备件，减少停机时间',
    type: 'maintenance',
    buildCost: 60000,
    dailyMaintenance: 100,
    requiredBuildingLevel: 1,
    effects: {
      maintenanceReduction: 0.1,
      efficiencyBonus: 0,
    },
    maxPerBuilding: 2,
    stackable: true,
    slots: 1,
  },
  {
    id: 32,
    key: 'advanced_diagnostics',
    name: '高级诊断系统',
    description: '预测性维护系统，大幅降低故障率',
    type: 'maintenance',
    buildCost: 250000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 3,
    effects: {
      maintenanceReduction: 0.25,
      accidentReduction: 0.3,
      efficiencyBonus: 0,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 2,
  },
];

/**
 * 员工类设施
 */
const WORKER_FACILITIES: FacilityDefinition[] = [
  {
    id: 40,
    key: 'cafeteria',
    name: '员工餐厅',
    description: '提供员工餐饮，提高工作效率',
    type: 'worker',
    buildCost: 50000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 1,
    effects: {
      efficiencyBonus: 0,
      laborReduction: 0.05,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 1,
  },
  {
    id: 41,
    key: 'training_center',
    name: '培训中心',
    description: '员工技能培训，提升生产质量',
    type: 'worker',
    buildCost: 120000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0,
      efficiencyBonus: 0,
      accidentReduction: 0.15,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 1,
  },
  {
    id: 42,
    key: 'dormitory',
    name: '员工宿舍',
    description: '住宿设施，减少通勤时间损耗',
    type: 'worker',
    buildCost: 100000,
    dailyMaintenance: 250,
    requiredBuildingLevel: 1,
    effects: {
      laborReduction: 0.1,
      efficiencyBonus: 0,
    },
    maxPerBuilding: 2,
    stackable: true,
    slots: 1,
  },
];

/**
 * 环保类设施
 */
const ENVIRONMENTAL_FACILITIES: FacilityDefinition[] = [
  {
    id: 50,
    key: 'waste_treatment',
    name: '废物处理站',
    description: '处理生产废物，降低污染',
    type: 'environmental',
    buildCost: 150000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 1,
    effects: {
      pollutionReduction: 0.3,
      wasteRecycling: 0.1,
    },
    maxPerBuilding: 2,
    stackable: true,
    slots: 1,
  },
  {
    id: 51,
    key: 'recycling_center',
    name: '回收中心',
    description: '回收生产废料，降低原材料消耗',
    type: 'environmental',
    buildCost: 200000,
    dailyMaintenance: 350,
    requiredBuildingLevel: 2,
    effects: {
      wasteRecycling: 0.25,
      pollutionReduction: 0.1,
      productionBonus: 0,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 2,
  },
  {
    id: 52,
    key: 'solar_panels',
    name: '太阳能板',
    description: '清洁能源供应，降低能源成本',
    type: 'environmental',
    buildCost: 300000,
    dailyMaintenance: 100,
    requiredBuildingLevel: 2,
    effects: {
      energyReduction: 0.2,
      pollutionReduction: 0.1,
    },
    maxPerBuilding: 3,
    stackable: true,
    slots: 1,
  },
];

/**
 * 安保类设施
 */
const SECURITY_FACILITIES: FacilityDefinition[] = [
  {
    id: 60,
    key: 'security_post',
    name: '保安岗亭',
    description: '基础安保设施',
    type: 'security',
    buildCost: 30000,
    dailyMaintenance: 100,
    requiredBuildingLevel: 1,
    effects: {
      sabotageProtection: 0.2,
      accidentReduction: 0.05,
    },
    maxPerBuilding: 2,
    stackable: true,
    slots: 1,
  },
  {
    id: 61,
    key: 'surveillance_system',
    name: '监控系统',
    description: '全面监控，提高安全性',
    type: 'security',
    buildCost: 100000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 2,
    effects: {
      sabotageProtection: 0.4,
      accidentReduction: 0.1,
      efficiencyBonus: 0,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 1,
  },
  {
    id: 62,
    key: 'fire_suppression',
    name: '消防系统',
    description: '先进消防设施，降低火灾风险',
    type: 'security',
    buildCost: 80000,
    dailyMaintenance: 150,
    requiredBuildingLevel: 1,
    effects: {
      accidentReduction: 0.25,
      maintenanceReduction: 0.05,
    },
    maxPerBuilding: 1,
    stackable: false,
    slots: 1,
  },
];

// ==================== 合并所有设施 ====================

export const ALL_FACILITIES: FacilityDefinition[] = [
  ...STORAGE_FACILITIES,
  ...LOGISTICS_FACILITIES,
  ...RESEARCH_FACILITIES,
  ...MAINTENANCE_FACILITIES,
  ...WORKER_FACILITIES,
  ...ENVIRONMENTAL_FACILITIES,
  ...SECURITY_FACILITIES,
];

// ID到设施的映射
export const FACILITIES_BY_ID: Map<number, FacilityDefinition> = new Map(
  ALL_FACILITIES.map(f => [f.id, f])
);

// Key到设施的映射
export const FACILITIES_BY_KEY: Map<string, FacilityDefinition> = new Map(
  ALL_FACILITIES.map(f => [f.key, f])
);

// 按类型分组
export const FACILITIES_BY_TYPE: Map<FacilityType, FacilityDefinition[]> = new Map([
  ['storage', STORAGE_FACILITIES],
  ['logistics', LOGISTICS_FACILITIES],
  ['research', RESEARCH_FACILITIES],
  ['maintenance', MAINTENANCE_FACILITIES],
  ['worker', WORKER_FACILITIES],
  ['environmental', ENVIRONMENTAL_FACILITIES],
  ['security', SECURITY_FACILITIES],
]);

// ==================== 工具函数 ====================

/**
 * 获取设施类型的中文名称
 */
export function getFacilityTypeName(type: FacilityType): string {
  const names: Record<FacilityType, string> = {
    'storage': '仓储设施',
    'logistics': '物流设施',
    'research': '研发设施',
    'maintenance': '维护设施',
    'worker': '员工设施',
    'environmental': '环保设施',
    'security': '安保设施',
  };
  return names[type];
}

/**
 * 获取设施类型的图标
 */
export function getFacilityTypeIcon(type: FacilityType): string {
  const icons: Record<FacilityType, string> = {
    'storage': '📦',
    'logistics': '🚚',
    'research': '🔬',
    'maintenance': '🔧',
    'worker': '👷',
    'environmental': '🌱',
    'security': '🛡️',
  };
  return icons[type];
}

/**
 * 检查设施是否可以安装到建筑
 */
export function canInstallFacility(
  facilityId: number,
  buildingTypeId: number,
  buildingLevel: number,
  currentFacilities: BuildingFacility[],
  availableSlots: number
): { canInstall: boolean; reason?: string } {
  const facility = FACILITIES_BY_ID.get(facilityId);
  if (!facility) {
    return { canInstall: false, reason: '设施不存在' };
  }
  
  // 检查建筑等级
  if (buildingLevel < facility.requiredBuildingLevel) {
    return { canInstall: false, reason: `需要建筑等级 ${facility.requiredBuildingLevel}` };
  }
  
  // 检查建筑类型限制
  if (facility.requiredBuildingTypes && facility.requiredBuildingTypes.length > 0) {
    if (!facility.requiredBuildingTypes.includes(buildingTypeId)) {
      return { canInstall: false, reason: '此设施不适用于该建筑类型' };
    }
  }
  
  // 检查槽位
  if (availableSlots < facility.slots) {
    return { canInstall: false, reason: `需要 ${facility.slots} 个空闲槽位` };
  }
  
  // 检查数量限制
  const installedCount = currentFacilities.filter(f => f.facilityId === facilityId).length;
  if (installedCount >= facility.maxPerBuilding) {
    return { canInstall: false, reason: `每个建筑最多安装 ${facility.maxPerBuilding} 个` };
  }
  
  return { canInstall: true };
}

/**
 * 计算建筑的综合设施效果
 */
export function calculateFacilityEffects(facilities: BuildingFacility[]): FacilityEffects {
  const result: FacilityEffects = {};
  
  for (const installed of facilities) {
    const facility = FACILITIES_BY_ID.get(installed.facilityId);
    if (!facility) continue;
    
    const condition = installed.condition;
    const effects = facility.effects;
    
    // 叠加各种效果（考虑设施状态）
    if (effects.storageCapacity) {
      result.storageCapacity = (result.storageCapacity || 0) + effects.storageCapacity * condition;
    }
    if (effects.storageEfficiency) {
      result.storageEfficiency = Math.min(0.99, (result.storageEfficiency || 1) * effects.storageEfficiency);
    }
    if (effects.loadingSpeed) {
      result.loadingSpeed = (result.loadingSpeed || 1) * (1 + (effects.loadingSpeed - 1) * condition);
    }
    if (effects.transportCostReduction) {
      result.transportCostReduction = (result.transportCostReduction || 0) + effects.transportCostReduction * condition;
    }
    if (effects.productionBonus) {
      result.productionBonus = (result.productionBonus || 0) + effects.productionBonus * condition;
    }
    if (effects.qualityBonus) {
      result.qualityBonus = (result.qualityBonus || 0) + effects.qualityBonus * condition;
    }
    if (effects.efficiencyBonus) {
      result.efficiencyBonus = (result.efficiencyBonus || 0) + effects.efficiencyBonus * condition;
    }
    if (effects.laborReduction) {
      result.laborReduction = (result.laborReduction || 0) + effects.laborReduction * condition;
    }
    if (effects.energyReduction) {
      result.energyReduction = (result.energyReduction || 0) + effects.energyReduction * condition;
    }
    if (effects.maintenanceReduction) {
      result.maintenanceReduction = (result.maintenanceReduction || 0) + effects.maintenanceReduction * condition;
    }
    if (effects.pollutionReduction) {
      result.pollutionReduction = (result.pollutionReduction || 0) + effects.pollutionReduction * condition;
    }
    if (effects.wasteRecycling) {
      result.wasteRecycling = (result.wasteRecycling || 0) + effects.wasteRecycling * condition;
    }
    if (effects.accidentReduction) {
      result.accidentReduction = (result.accidentReduction || 0) + effects.accidentReduction * condition;
    }
    if (effects.sabotageProtection) {
      result.sabotageProtection = (result.sabotageProtection || 0) + effects.sabotageProtection * condition;
    }
    if (effects.researchSpeed) {
      result.researchSpeed = (result.researchSpeed || 0) + effects.researchSpeed * condition;
    }
    if (effects.innovationChance) {
      result.innovationChance = (result.innovationChance || 0) + effects.innovationChance * condition;
    }
  }
  
  // 限制最大值
  if (result.laborReduction) result.laborReduction = Math.min(result.laborReduction, 0.5);
  if (result.energyReduction) result.energyReduction = Math.min(result.energyReduction, 0.5);
  if (result.maintenanceReduction) result.maintenanceReduction = Math.min(result.maintenanceReduction, 0.5);
  if (result.pollutionReduction) result.pollutionReduction = Math.min(result.pollutionReduction, 0.8);
  if (result.wasteRecycling) result.wasteRecycling = Math.min(result.wasteRecycling, 0.5);
  if (result.accidentReduction) result.accidentReduction = Math.min(result.accidentReduction, 0.8);
  if (result.sabotageProtection) result.sabotageProtection = Math.min(result.sabotageProtection, 0.9);
  
  return result;
}

/**
 * 计算设施的每日维护总成本
 */
export function calculateDailyMaintenanceCost(facilities: BuildingFacility[]): number {
  let total = 0;
  
  for (const installed of facilities) {
    const facility = FACILITIES_BY_ID.get(installed.facilityId);
    if (facility) {
      total += facility.dailyMaintenance;
    }
  }
  
  return total;
}

/**
 * 获取适用于特定建筑的设施列表
 */
export function getAvailableFacilities(
  buildingTypeId: number,
  buildingLevel: number
): FacilityDefinition[] {
  return ALL_FACILITIES.filter(facility => {
    // 检查建筑等级
    if (buildingLevel < facility.requiredBuildingLevel) {
      return false;
    }
    
    // 检查建筑类型限制
    if (facility.requiredBuildingTypes && facility.requiredBuildingTypes.length > 0) {
      if (!facility.requiredBuildingTypes.includes(buildingTypeId)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * 获取建筑可用的附属设施槽位数
 * 基础5个槽位，每升级增加1个
 */
export function getBuildingFacilitySlots(buildingLevel: number): number {
  return 5 + (buildingLevel - 1);
}

/**
 * 计算已使用的槽位数
 */
export function getUsedFacilitySlots(facilities: BuildingFacility[]): number {
  let used = 0;
  for (const installed of facilities) {
    const facility = FACILITIES_BY_ID.get(installed.facilityId);
    if (facility) {
      used += facility.slots;
    }
  }
  return used;
}