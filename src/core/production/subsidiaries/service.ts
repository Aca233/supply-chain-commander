/**
 * 服务类建筑的专属附属建筑
 * 包括物流中心、仓储中心、发电厂、学校、医院等
 */

import { SubsidiaryBuildingDef } from '../SubsidiaryBuildings';

// ==================== 物流中心附属建筑 (ID 1300-1309) ====================

const LOGISTICS_TYPES = [22]; // logistics-center

export const LOGISTICS_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1300,
    key: 'auto_sorting',
    name: '自动分拣系统',
    description: '自动化分拣，大幅提高效率',
    category: 'efficiency',
    icon: '📦',
    applicableBuildingTypes: LOGISTICS_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.40,
      laborReduction: 0.35,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1301,
    key: 'vertical_warehouse',
    name: '立体仓库',
    description: '高密度存储，大幅增加容量',
    category: 'capacity',
    icon: '🏢',
    applicableBuildingTypes: LOGISTICS_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 2,
    effects: {
      storageCapacity: 2000,
      bufferCapacity: 500,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1302,
    key: 'truck_fleet',
    name: '货运车队',
    description: '自有车队，降低运输成本提高速度',
    category: 'efficiency',
    icon: '🚚',
    applicableBuildingTypes: LOGISTICS_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1200,
    requiredBuildingLevel: 1,
    effects: {
      maintenanceReduction: 0.20,
      speedMultiplier: 1.25,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1303,
    key: 'logistics_it',
    name: '信息管理中心',
    description: '物流追踪，提高效率',
    category: 'efficiency',
    icon: '💻',
    applicableBuildingTypes: LOGISTICS_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.15,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 仓储中心附属建筑 (ID 1310-1314) ====================

const WAREHOUSE_TYPES = [23]; // warehouse

export const WAREHOUSE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1310,
    key: 'climate_control',
    name: '温控系统',
    description: '恒温恒湿，保护货物品质',
    category: 'quality',
    icon: '🌡️',
    applicableBuildingTypes: WAREHOUSE_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      defectReduction: 0.30,
      qualityBonus: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1311,
    key: 'rack_expansion',
    name: '货架扩建',
    description: '增加存储空间',
    category: 'capacity',
    icon: '📚',
    applicableBuildingTypes: WAREHOUSE_TYPES,
    buildCost: 150000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 1000,
      bufferCapacity: 300,
    },
    maxPerBuilding: 3,
    slots: 1,
  },
  {
    id: 1312,
    key: 'forklift_fleet',
    name: '叉车车队',
    description: '提高装卸效率',
    category: 'efficiency',
    icon: '🚜',
    applicableBuildingTypes: WAREHOUSE_TYPES,
    buildCost: 100000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 1,
    effects: {
      speedMultiplier: 1.20,
      laborReduction: 0.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 发电厂附属建筑 (ID 1315-1324) ====================

const POWER_PLANT_TYPES = [24]; // power-plant

export const POWER_PLANT_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1315,
    key: 'turbine_upgrade',
    name: '增压机组',
    description: '提升发电能力和效率',
    category: 'production',
    icon: '⚡',
    applicableBuildingTypes: POWER_PLANT_TYPES,
    buildCost: 1000000,
    dailyMaintenance: 3000,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.25,
      speedMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1316,
    key: 'emission_control',
    name: '脱硫脱硝设备',
    description: '环保达标，获得补贴',
    category: 'efficiency',
    icon: '🌿',
    applicableBuildingTypes: POWER_PLANT_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 1,
    effects: {
      maintenanceReduction: 0.15,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1317,
    key: 'energy_storage',
    name: '储能电站',
    description: '平滑供电，峰谷套利',
    category: 'specialized',
    icon: '🔋',
    applicableBuildingTypes: POWER_PLANT_TYPES,
    buildCost: 1500000,
    dailyMaintenance: 2500,
    requiredBuildingLevel: 3,
    effects: {
      outputMultiplier: 1.15,
      storageCapacity: 500,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1318,
    key: 'smart_grid',
    name: '智能调度中心',
    description: '智能调度，提高效率降低成本',
    category: 'efficiency',
    icon: '🖥️',
    applicableBuildingTypes: POWER_PLANT_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.15,
      maintenanceReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 学校附属建筑 (ID 1325-1329) ====================

const SCHOOL_TYPES = [88]; // school

export const SCHOOL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1325,
    key: 'computer_lab',
    name: '计算机实验室',
    description: '现代化教学，提升服务质量',
    category: 'quality',
    icon: '💻',
    applicableBuildingTypes: SCHOOL_TYPES,
    buildCost: 200000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.20,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1326,
    key: 'library_expansion',
    name: '图书馆扩建',
    description: '丰富教学资源',
    category: 'quality',
    icon: '📚',
    applicableBuildingTypes: SCHOOL_TYPES,
    buildCost: 150000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      storageCapacity: 200,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 医院附属建筑 (ID 1330-1334) ====================

const HOSPITAL_TYPES = [89]; // hospital

export const HOSPITAL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1330,
    key: 'icu_ward',
    name: 'ICU病房',
    description: '重症监护，提升医疗水平',
    category: 'quality',
    icon: '🏥',
    applicableBuildingTypes: HOSPITAL_TYPES,
    buildCost: 1000000,
    dailyMaintenance: 3000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.30,
      outputMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1331,
    key: 'imaging_center',
    name: '影像中心',
    description: '先进诊断设备',
    category: 'quality',
    icon: '🔬',
    applicableBuildingTypes: HOSPITAL_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1332,
    key: 'pharmacy_dept',
    name: '药房扩建',
    description: '增加药品供应能力',
    category: 'capacity',
    icon: '💊',
    applicableBuildingTypes: HOSPITAL_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 500,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 银行附属建筑 (ID 1335-1339) ====================

const BANK_TYPES = [90]; // bank

export const BANK_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1335,
    key: 'vault_expansion',
    name: '金库扩建',
    description: '增加资金容量',
    category: 'capacity',
    icon: '🏦',
    applicableBuildingTypes: BANK_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 1000,
      defectReduction: 0.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1336,
    key: 'digital_banking',
    name: '数字银行系统',
    description: '在线服务，提高效率',
    category: 'efficiency',
    icon: '💳',
    applicableBuildingTypes: BANK_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.30,
      laborReduction: 0.25,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 酒店附属建筑 (ID 1340-1344) ====================

const HOTEL_TYPES = [91]; // hotel

export const HOTEL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1340,
    key: 'spa_center',
    name: 'SPA中心',
    description: '高端服务，提升品质',
    category: 'quality',
    icon: '🧖',
    applicableBuildingTypes: HOTEL_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1200,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1341,
    key: 'conference_hall',
    name: '会议中心',
    description: '商务服务，增加收入',
    category: 'production',
    icon: '🏛️',
    applicableBuildingTypes: HOTEL_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.20,
      storageCapacity: 200,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1342,
    key: 'restaurant_upgrade',
    name: '餐厅升级',
    description: '高品质餐饮服务',
    category: 'quality',
    icon: '🍽️',
    applicableBuildingTypes: HOTEL_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 1.08,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 运输公司附属建筑 (ID 1345-1349) ====================

const TRANSPORT_TYPES = [92]; // transport-company

export const TRANSPORT_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1345,
    key: 'vehicle_depot',
    name: '车辆调度中心',
    description: '优化调度，提高效率',
    category: 'efficiency',
    icon: '🚌',
    applicableBuildingTypes: TRANSPORT_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 1,
    effects: {
      speedMultiplier: 1.25,
      maintenanceReduction: 0.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1346,
    key: 'maintenance_bay',
    name: '维修车间',
    description: '自主维修，降低成本',
    category: 'efficiency',
    icon: '🔧',
    applicableBuildingTypes: TRANSPORT_TYPES,
    buildCost: 250000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      maintenanceReduction: 0.25,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 咨询公司附属建筑 (ID 1350-1354) ====================

const CONSULTING_TYPES = [93]; // consulting-firm

export const CONSULTING_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1350,
    key: 'research_dept',
    name: '研究部门',
    description: '深度研究，提升服务质量',
    category: 'quality',
    icon: '📊',
    applicableBuildingTypes: CONSULTING_TYPES,
    buildCost: 300000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1351,
    key: 'training_center',
    name: '培训中心',
    description: '人才培养，提高效率',
    category: 'efficiency',
    icon: '🎓',
    applicableBuildingTypes: CONSULTING_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      speedMultiplier: 1.15,
      qualityBonus: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 影视制作中心附属建筑 (ID 1355-1359) ====================

const FILM_STUDIO_TYPES = [95]; // film-studio

export const FILM_STUDIO_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1355,
    key: 'sound_stage',
    name: '摄影棚扩建',
    description: '增加制作能力',
    category: 'production',
    icon: '🎬',
    applicableBuildingTypes: FILM_STUDIO_TYPES,
    buildCost: 2000000,
    dailyMaintenance: 5000,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.25,
      storageCapacity: 300,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1356,
    key: 'post_production',
    name: '后期制作中心',
    description: '高品质后期，提升作品质量',
    category: 'quality',
    icon: '🎞️',
    applicableBuildingTypes: FILM_STUDIO_TYPES,
    buildCost: 1500000,
    dailyMaintenance: 4000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.30,
      speedMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 游戏工作室附属建筑 (ID 1360-1364) ====================

const GAME_STUDIO_TYPES = [96]; // game-studio

export const GAME_STUDIO_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1360,
    key: 'motion_capture',
    name: '动作捕捉室',
    description: '高品质动画，提升游戏质量',
    category: 'quality',
    icon: '🎮',
    applicableBuildingTypes: GAME_STUDIO_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.28,
      outputMultiplier: 1.05,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1361,
    key: 'qa_department',
    name: 'QA测试部门',
    description: '严格测试，降低缺陷',
    category: 'quality',
    icon: '🐛',
    applicableBuildingTypes: GAME_STUDIO_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 1,
    effects: {
      defectReduction: 0.40,
      qualityBonus: 0.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 导出所有服务类附属建筑 ====================

export const SERVICE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  ...LOGISTICS_SUBSIDIARIES,
  ...WAREHOUSE_SUBSIDIARIES,
  ...POWER_PLANT_SUBSIDIARIES,
  ...SCHOOL_SUBSIDIARIES,
  ...HOSPITAL_SUBSIDIARIES,
  ...BANK_SUBSIDIARIES,
  ...HOTEL_SUBSIDIARIES,
  ...TRANSPORT_SUBSIDIARIES,
  ...CONSULTING_SUBSIDIARIES,
  ...FILM_STUDIO_SUBSIDIARIES,
  ...GAME_STUDIO_SUBSIDIARIES,
];