/**
 * 采掘类建筑的专属附属建筑
 * 包括矿场、油气田、农场、林场等
 */

import { SubsidiaryBuildingDef } from '../SubsidiaryBuildings';

// ==================== 矿场类附属建筑 (ID 1001-1009) ====================

/** 铁矿场、铜矿场、煤矿、硅石矿场通用 */
const MINE_BUILDING_TYPES = [0, 1, 2, 7]; // iron-mine, copper-mine, coal-mine, silicon-mine

/** 多金属矿场、战略金属矿场 */
const EXTENDED_MINE_TYPES = [67, 68]; // multi-metal-mine, strategic-metal-mine

/** 所有矿场类型 */
const ALL_MINE_TYPES = [...MINE_BUILDING_TYPES, ...EXTENDED_MINE_TYPES, 41]; // 包括锂矿场

export const MINE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1001,
    key: 'deep_drilling',
    name: '深井开采设备',
    description: '深挖矿脉获取更多矿石，但增加能源消耗',
    category: 'production',
    icon: '⛏️',
    applicableBuildingTypes: ALL_MINE_TYPES,
    buildCost: 150000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.20,
      energyReduction: -0.15, // 负值表示增加
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1002,
    key: 'ore_preprocessing',
    name: '矿石预处理厂',
    description: '初步筛选提高矿石纯度，略微降低产量',
    category: 'quality',
    icon: '🔬',
    applicableBuildingTypes: ALL_MINE_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.15,
      outputMultiplier: 0.95,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1003,
    key: 'automated_mining',
    name: '自动化采矿系统',
    description: '减少人力依赖，但增加维护成本',
    category: 'efficiency',
    icon: '🤖',
    applicableBuildingTypes: ALL_MINE_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 2,
    effects: {
      laborReduction: 0.30,
      maintenanceReduction: -0.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1004,
    key: 'mine_ventilation',
    name: '矿井通风系统',
    description: '改善工作环境，提高效率和安全性',
    category: 'efficiency',
    icon: '💨',
    applicableBuildingTypes: ALL_MINE_TYPES,
    buildCost: 80000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 1,
    effects: {
      speedMultiplier: 1.10,
      defectReduction: 0.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1005,
    key: 'ore_storage',
    name: '矿石储存站',
    description: '增加产出缓冲容量',
    category: 'capacity',
    icon: '📦',
    applicableBuildingTypes: ALL_MINE_TYPES,
    buildCost: 60000,
    dailyMaintenance: 150,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 500,
      bufferCapacity: 200,
    },
    maxPerBuilding: 2,
    slots: 1,
  },
];

// ==================== 油气田类附属建筑 (ID 1010-1019) ====================

const OIL_GAS_TYPES = [3, 4]; // oil-field, gas-field

export const OIL_GAS_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1010,
    key: 'water_injection',
    name: '增压注水站',
    description: '二次采油技术提高产量，增加能耗',
    category: 'production',
    icon: '💧',
    applicableBuildingTypes: OIL_GAS_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.25,
      energyReduction: -0.20,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1011,
    key: 'gas_separator',
    name: '油气分离器',
    description: '分离副产品，提高品质并产出额外天然气',
    category: 'specialized',
    icon: '⚗️',
    applicableBuildingTypes: [3], // 仅油田
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      bonusOutputChance: 0.15,
      bonusOutputGoods: 10, // 天然气
      bonusOutputAmount: 5,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1012,
    key: 'offshore_extension',
    name: '海上平台扩展',
    description: '扩展采集能力，增加产量和容量',
    category: 'capacity',
    icon: '🏗️',
    applicableBuildingTypes: OIL_GAS_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 3,
    effects: {
      outputMultiplier: 1.15,
      storageCapacity: 300,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1013,
    key: 'pipeline_station',
    name: '管道直连站',
    description: '直接管道输送，降低运输成本',
    category: 'efficiency',
    icon: '🔗',
    applicableBuildingTypes: OIL_GAS_TYPES,
    buildCost: 350000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 2,
    effects: {
      maintenanceReduction: 0.20,
      speedMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 农场类附属建筑 (ID 1020-1029) ====================

const FARM_TYPES = [6, 25, 26, 27]; // farm, vegetable-farm, livestock-farm, fishery
const PLANT_FARM_TYPES = [6, 25, 29, 40, 59, 70, 73, 76]; // 农场、蔬菜农场、药材园、橡胶园、棕榈园、牧羊场、粘土矿、经济作物园

export const FARM_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1020,
    key: 'greenhouse',
    name: '温室大棚',
    description: '全季节生产，大幅提高产量但增加能耗',
    category: 'production',
    icon: '🏠',
    applicableBuildingTypes: [6, 25, 29, 76], // 农场、蔬菜农场、药材园、经济作物园
    buildCost: 180000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.30,
      energyReduction: -0.25,
    },
    maxPerBuilding: 2,
    slots: 2,
  },
  {
    id: 1021,
    key: 'organic_certification',
    name: '有机认证设施',
    description: '有机农产品溢价，但产量略降',
    category: 'quality',
    icon: '🌿',
    applicableBuildingTypes: FARM_TYPES,
    buildCost: 120000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 0.90,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1022,
    key: 'irrigation_system',
    name: '灌溉系统',
    description: '稳定灌溉，提高效率',
    category: 'efficiency',
    icon: '🚿',
    applicableBuildingTypes: PLANT_FARM_TYPES,
    buildCost: 100000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 1,
    effects: {
      speedMultiplier: 1.15,
      defectReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1023,
    key: 'farm_machinery',
    name: '农业机械库',
    description: '机械化作业，大幅减少人工但增加维护',
    category: 'efficiency',
    icon: '🚜',
    applicableBuildingTypes: FARM_TYPES,
    buildCost: 250000,
    dailyMaintenance: 700,
    requiredBuildingLevel: 2,
    effects: {
      laborReduction: 0.40,
      maintenanceReduction: -0.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1024,
    key: 'seed_research',
    name: '种子研发站',
    description: '改良品种，提高品质和产量',
    category: 'specialized',
    icon: '🧬',
    applicableBuildingTypes: [6, 25, 76], // 农场、蔬菜农场、经济作物园
    buildCost: 200000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.10,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1025,
    key: 'cold_storage_farm',
    name: '冷藏存储库',
    description: '延长保质期，增加存储容量',
    category: 'capacity',
    icon: '❄️',
    applicableBuildingTypes: FARM_TYPES,
    buildCost: 150000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 800,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 畜牧场专属附属建筑 (ID 1030-1034) ====================

const LIVESTOCK_TYPES = [26, 70]; // livestock-farm, sheep-farm

export const LIVESTOCK_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1030,
    key: 'veterinary_clinic',
    name: '兽医诊所',
    description: '保障牲畜健康，提高品质和产量',
    category: 'quality',
    icon: '🏥',
    applicableBuildingTypes: LIVESTOCK_TYPES,
    buildCost: 100000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      defectReduction: 0.25,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1031,
    key: 'feed_processing',
    name: '饲料加工站',
    description: '自制饲料，降低输入消耗',
    category: 'efficiency',
    icon: '🌾',
    applicableBuildingTypes: LIVESTOCK_TYPES,
    buildCost: 120000,
    dailyMaintenance: 350,
    requiredBuildingLevel: 2,
    effects: {
      inputReduction: 0.15,
      outputMultiplier: 1.05,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1032,
    key: 'breeding_center',
    name: '育种中心',
    description: '优良品种培育，长期提升品质',
    category: 'specialized',
    icon: '🧪',
    applicableBuildingTypes: LIVESTOCK_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.20,
      outputMultiplier: 1.08,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 林场/伐木场附属建筑 (ID 1035-1039) ====================

const LOGGING_TYPES = [5]; // logging-camp

export const LOGGING_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1035,
    key: 'sustainable_forestry',
    name: '可持续林业中心',
    description: '科学伐木，提高产量和品质',
    category: 'production',
    icon: '🌲',
    applicableBuildingTypes: LOGGING_TYPES,
    buildCost: 150000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.15,
      qualityBonus: 0.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1036,
    key: 'wood_drying',
    name: '木材干燥房',
    description: '木材预处理，提高品质和加工速度',
    category: 'quality',
    icon: '🔥',
    applicableBuildingTypes: LOGGING_TYPES,
    buildCost: 100000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.20,
      speedMultiplier: 1.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1037,
    key: 'nursery',
    name: '林场苗圃',
    description: '森林再生，长期提升产量',
    category: 'specialized',
    icon: '🌱',
    applicableBuildingTypes: LOGGING_TYPES,
    buildCost: 80000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.05,
      defectReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 渔场附属建筑 (ID 1040-1044) ====================

const FISHERY_TYPES = [27]; // fishery

export const FISHERY_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1040,
    key: 'aquaculture_tanks',
    name: '养殖池扩建',
    description: '扩大养殖规模，增加产量',
    category: 'production',
    icon: '🐟',
    applicableBuildingTypes: FISHERY_TYPES,
    buildCost: 200000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.25,
      storageCapacity: 300,
    },
    maxPerBuilding: 2,
    slots: 2,
  },
  {
    id: 1041,
    key: 'water_treatment',
    name: '水质处理系统',
    description: '保持水质，提高鱼类品质',
    category: 'quality',
    icon: '💧',
    applicableBuildingTypes: FISHERY_TYPES,
    buildCost: 120000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.18,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1042,
    key: 'fish_processing',
    name: '鱼类加工线',
    description: '初步加工，提高产品价值',
    category: 'specialized',
    icon: '🔪',
    applicableBuildingTypes: FISHERY_TYPES,
    buildCost: 150000,
    dailyMaintenance: 450,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.12,
      outputMultiplier: 1.08,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 金矿附属建筑 (ID 1045-1049) ====================

const GOLD_MINE_TYPES = [35]; // gold-mine

export const GOLD_MINE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1045,
    key: 'gold_refinery',
    name: '黄金精炼室',
    description: '提高黄金纯度，大幅提升品质',
    category: 'quality',
    icon: '✨',
    applicableBuildingTypes: GOLD_MINE_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.30,
      outputMultiplier: 0.95,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1046,
    key: 'security_vault',
    name: '安保金库',
    description: '安全存储贵金属，增加容量',
    category: 'capacity',
    icon: '🔐',
    applicableBuildingTypes: GOLD_MINE_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 200,
      defectReduction: 0.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1047,
    key: 'gem_sorting',
    name: '宝石分拣站',
    description: '分拣钻石和宝石，额外产出',
    category: 'specialized',
    icon: '💎',
    applicableBuildingTypes: GOLD_MINE_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 3,
    effects: {
      bonusOutputChance: 0.10,
      bonusOutputGoods: 91, // 钻石
      bonusOutputAmount: 1,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 铀矿附属建筑 (ID 1050-1054) ====================

const URANIUM_MINE_TYPES = [80]; // uranium-mine

export const URANIUM_MINE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1050,
    key: 'radiation_shielding',
    name: '辐射防护设施',
    description: '保护工人安全，提高效率',
    category: 'efficiency',
    icon: '☢️',
    applicableBuildingTypes: URANIUM_MINE_TYPES,
    buildCost: 600000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 1,
    effects: {
      speedMultiplier: 1.15,
      defectReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1051,
    key: 'uranium_enrichment',
    name: '铀浓缩预处理',
    description: '初步浓缩，提高品质',
    category: 'quality',
    icon: '⚛️',
    applicableBuildingTypes: URANIUM_MINE_TYPES,
    buildCost: 1000000,
    dailyMaintenance: 3000,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 0.90,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
];

// ==================== 导出所有采掘类附属建筑 ====================

export const EXTRACTION_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  ...MINE_SUBSIDIARIES,
  ...OIL_GAS_SUBSIDIARIES,
  ...FARM_SUBSIDIARIES,
  ...LIVESTOCK_SUBSIDIARIES,
  ...LOGGING_SUBSIDIARIES,
  ...FISHERY_SUBSIDIARIES,
  ...GOLD_MINE_SUBSIDIARIES,
  ...URANIUM_MINE_SUBSIDIARIES,
];