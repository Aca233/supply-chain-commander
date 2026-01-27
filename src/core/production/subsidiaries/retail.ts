/**
 * 零售类建筑的专属附属建筑
 * 包括便利店、超市、专卖店等各类零售业态
 */

import { SubsidiaryBuildingDef } from '../SubsidiaryBuildings';

// ==================== 便利店附属建筑 (ID 1400-1404) ====================

const CONVENIENCE_TYPES = [49]; // convenience-store

export const CONVENIENCE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1400,
    key: 'fresh_corner',
    name: '生鲜区扩建',
    description: '增加生鲜品类，吸引更多客流',
    category: 'production',
    icon: '🥬',
    applicableBuildingTypes: CONVENIENCE_TYPES,
    buildCost: 50000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.20,
      storageCapacity: 100,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1401,
    key: 'self_checkout',
    name: '自助收银系统',
    description: '自助结账，减少人工提高效率',
    category: 'efficiency',
    icon: '🖥️',
    applicableBuildingTypes: CONVENIENCE_TYPES,
    buildCost: 80000,
    dailyMaintenance: 150,
    requiredBuildingLevel: 2,
    effects: {
      laborReduction: 0.30,
      speedMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1402,
    key: 'membership_system',
    name: '会员系统',
    description: '会员运营，提高复购率',
    category: 'specialized',
    icon: '💳',
    applicableBuildingTypes: CONVENIENCE_TYPES,
    buildCost: 30000,
    dailyMaintenance: 100,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.10,
      qualityBonus: 0.05,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1403,
    key: 'delivery_station',
    name: '配送站点',
    description: '提供外送服务，增加收入',
    category: 'production',
    icon: '🛵',
    applicableBuildingTypes: CONVENIENCE_TYPES,
    buildCost: 60000,
    dailyMaintenance: 250,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.15,
      maintenanceReduction: -0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 超市附属建筑 (ID 1405-1409) ====================

const SUPERMARKET_TYPES = [50]; // supermarket

export const SUPERMARKET_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1405,
    key: 'bakery_section',
    name: '烘焙区',
    description: '现烤面包，吸引客流',
    category: 'production',
    icon: '🥖',
    applicableBuildingTypes: SUPERMARKET_TYPES,
    buildCost: 100000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.15,
      qualityBonus: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1406,
    key: 'cold_chain_display',
    name: '冷链展示柜',
    description: '保鲜展示，提升品质',
    category: 'quality',
    icon: '❄️',
    applicableBuildingTypes: SUPERMARKET_TYPES,
    buildCost: 150000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1407,
    key: 'warehouse_expansion',
    name: '仓库扩建',
    description: '增加库存容量',
    category: 'capacity',
    icon: '📦',
    applicableBuildingTypes: SUPERMARKET_TYPES,
    buildCost: 120000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 500,
      bufferCapacity: 200,
    },
    maxPerBuilding: 2,
    slots: 1,
  },
  {
    id: 1408,
    key: 'smart_pricing',
    name: '智能定价系统',
    description: '动态定价，优化利润',
    category: 'efficiency',
    icon: '📊',
    applicableBuildingTypes: SUPERMARKET_TYPES,
    buildCost: 80000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.08,
      maintenanceReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 大卖场附属建筑 (ID 1410-1414) ====================

const HYPERMARKET_TYPES = [51]; // hypermarket

export const HYPERMARKET_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1410,
    key: 'food_court',
    name: '美食广场',
    description: '餐饮服务，增加客流和收入',
    category: 'production',
    icon: '🍔',
    applicableBuildingTypes: HYPERMARKET_TYPES,
    buildCost: 300000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.20,
      storageCapacity: 200,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1411,
    key: 'parking_expansion',
    name: '停车场扩建',
    description: '便利停车，吸引更多顾客',
    category: 'production',
    icon: '🅿️',
    applicableBuildingTypes: HYPERMARKET_TYPES,
    buildCost: 200000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.15,
      maintenanceReduction: -0.05,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1412,
    key: 'bulk_storage',
    name: '大宗仓储区',
    description: '大容量存储，支持批发',
    category: 'capacity',
    icon: '🏭',
    applicableBuildingTypes: HYPERMARKET_TYPES,
    buildCost: 250000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 2,
    effects: {
      storageCapacity: 1000,
      bufferCapacity: 400,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 电子商城附属建筑 (ID 1415-1419) ====================

const ELECTRONICS_STORE_TYPES = [52]; // electronics-store

export const ELECTRONICS_STORE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1415,
    key: 'experience_zone',
    name: '体验区',
    description: '产品体验，提高转化率',
    category: 'quality',
    icon: '🎮',
    applicableBuildingTypes: ELECTRONICS_STORE_TYPES,
    buildCost: 150000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.20,
      outputMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1416,
    key: 'repair_center',
    name: '维修服务中心',
    description: '售后服务，提升客户满意度',
    category: 'quality',
    icon: '🔧',
    applicableBuildingTypes: ELECTRONICS_STORE_TYPES,
    buildCost: 100000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      outputMultiplier: 1.08,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1417,
    key: 'demo_room',
    name: '演示厅',
    description: '产品演示，促进销售',
    category: 'production',
    icon: '📺',
    applicableBuildingTypes: ELECTRONICS_STORE_TYPES,
    buildCost: 120000,
    dailyMaintenance: 350,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.18,
      qualityBonus: 0.08,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 汽车4S店附属建筑 (ID 1420-1424) ====================

const CAR_DEALER_TYPES = [53]; // car-dealership

export const CAR_DEALER_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1420,
    key: 'showroom_expansion',
    name: '展厅扩建',
    description: '更大展示空间，展示更多车型',
    category: 'capacity',
    icon: '🚗',
    applicableBuildingTypes: CAR_DEALER_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      storageCapacity: 50,
      outputMultiplier: 1.20,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1421,
    key: 'service_center',
    name: '售后服务中心',
    description: '维修保养服务，增加收入',
    category: 'production',
    icon: '🔧',
    applicableBuildingTypes: CAR_DEALER_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1200,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.25,
      qualityBonus: 0.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1422,
    key: 'test_drive_track',
    name: '试驾场地',
    description: '试驾体验，促进成交',
    category: 'quality',
    icon: '🏎️',
    applicableBuildingTypes: CAR_DEALER_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      outputMultiplier: 1.12,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 服装店附属建筑 (ID 1425-1429) ====================

const CLOTHING_STORE_TYPES = [54]; // clothing-store

export const CLOTHING_STORE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1425,
    key: 'fitting_rooms',
    name: '试衣间升级',
    description: '舒适试衣体验，提高转化',
    category: 'quality',
    icon: '👗',
    applicableBuildingTypes: CLOTHING_STORE_TYPES,
    buildCost: 50000,
    dailyMaintenance: 150,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1426,
    key: 'fashion_display',
    name: '时尚橱窗',
    description: '吸引眼球，增加客流',
    category: 'production',
    icon: '✨',
    applicableBuildingTypes: CLOTHING_STORE_TYPES,
    buildCost: 40000,
    dailyMaintenance: 120,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.15,
      qualityBonus: 0.08,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1427,
    key: 'alteration_service',
    name: '改衣服务',
    description: '定制服务，提升满意度',
    category: 'quality',
    icon: '✂️',
    applicableBuildingTypes: CLOTHING_STORE_TYPES,
    buildCost: 30000,
    dailyMaintenance: 100,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 1.05,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 奢侈品店附属建筑 (ID 1430-1434) ====================

const LUXURY_STORE_TYPES = [55]; // luxury-boutique

export const LUXURY_STORE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1430,
    key: 'vip_lounge',
    name: 'VIP客户室',
    description: '高端服务，吸引VIP客户',
    category: 'quality',
    icon: '👑',
    applicableBuildingTypes: LUXURY_STORE_TYPES,
    buildCost: 300000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.30,
      outputMultiplier: 1.25,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1431,
    key: 'brand_gallery',
    name: '品牌展廊',
    description: '沉浸式品牌体验',
    category: 'quality',
    icon: '🖼️',
    applicableBuildingTypes: LUXURY_STORE_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1432,
    key: 'concierge_service',
    name: '礼宾服务',
    description: '专属服务，提升体验',
    category: 'specialized',
    icon: '🎩',
    applicableBuildingTypes: LUXURY_STORE_TYPES,
    buildCost: 150000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      outputMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 药店附属建筑 (ID 1435-1439) ====================

const PHARMACY_TYPES = [56]; // pharmacy

export const PHARMACY_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1435,
    key: 'consultation_room',
    name: '咨询室',
    description: '药师咨询服务，提升专业形象',
    category: 'quality',
    icon: '💊',
    applicableBuildingTypes: PHARMACY_TYPES,
    buildCost: 50000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1436,
    key: 'health_corner',
    name: '健康角',
    description: '健康检测服务，吸引客流',
    category: 'production',
    icon: '❤️',
    applicableBuildingTypes: PHARMACY_TYPES,
    buildCost: 40000,
    dailyMaintenance: 150,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.15,
      qualityBonus: 0.08,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1437,
    key: 'cold_storage_pharma_retail',
    name: '冷藏柜',
    description: '药品保鲜，保证品质',
    category: 'quality',
    icon: '❄️',
    applicableBuildingTypes: PHARMACY_TYPES,
    buildCost: 30000,
    dailyMaintenance: 100,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.12,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 加油站附属建筑 (ID 1440-1444) ====================

const GAS_STATION_TYPES = [57]; // gas-station

export const GAS_STATION_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1440,
    key: 'convenience_shop',
    name: '便利店',
    description: '附加零售，增加收入',
    category: 'production',
    icon: '🏪',
    applicableBuildingTypes: GAS_STATION_TYPES,
    buildCost: 80000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.20,
      storageCapacity: 100,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1441,
    key: 'car_wash',
    name: '洗车服务',
    description: '附加服务，增加收入',
    category: 'production',
    icon: '🚿',
    applicableBuildingTypes: GAS_STATION_TYPES,
    buildCost: 100000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.15,
      qualityBonus: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1442,
    key: 'tank_expansion',
    name: '油罐扩容',
    description: '增加储油量',
    category: 'capacity',
    icon: '🛢️',
    applicableBuildingTypes: GAS_STATION_TYPES,
    buildCost: 150000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 2,
    effects: {
      storageCapacity: 500,
      bufferCapacity: 200,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 家居商城附属建筑 (ID 1445-1449) ====================

const FURNITURE_MALL_TYPES = [58]; // furniture-mall

export const FURNITURE_MALL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1445,
    key: 'model_rooms',
    name: '样板间',
    description: '场景展示，促进销售',
    category: 'quality',
    icon: '🏠',
    applicableBuildingTypes: FURNITURE_MALL_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.22,
      outputMultiplier: 1.18,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1446,
    key: 'delivery_assembly',
    name: '配送安装服务',
    description: '一站式服务，提升满意度',
    category: 'quality',
    icon: '🚚',
    applicableBuildingTypes: FURNITURE_MALL_TYPES,
    buildCost: 150000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      outputMultiplier: 1.12,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1447,
    key: 'design_consultation',
    name: '设计咨询',
    description: '专业设计服务',
    category: 'specialized',
    icon: '📐',
    applicableBuildingTypes: FURNITURE_MALL_TYPES,
    buildCost: 100000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 化妆品店附属建筑 (ID 1450-1454) ====================

const COSMETICS_STORE_TYPES = [101]; // cosmetics-store

export const COSMETICS_STORE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1450,
    key: 'beauty_counter',
    name: '美妆柜台',
    description: '专业试妆服务',
    category: 'quality',
    icon: '💄',
    applicableBuildingTypes: COSMETICS_STORE_TYPES,
    buildCost: 80000,
    dailyMaintenance: 300,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.20,
      outputMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1451,
    key: 'skin_analysis',
    name: '肤质检测',
    description: '科学护肤推荐',
    category: 'specialized',
    icon: '🔬',
    applicableBuildingTypes: COSMETICS_STORE_TYPES,
    buildCost: 60000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 1.12,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 书店附属建筑 (ID 1455-1459) ====================

const BOOKSTORE_TYPES = [102]; // bookstore

export const BOOKSTORE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1455,
    key: 'reading_area',
    name: '阅读区',
    description: '舒适阅读空间，增加停留时间',
    category: 'quality',
    icon: '📖',
    applicableBuildingTypes: BOOKSTORE_TYPES,
    buildCost: 40000,
    dailyMaintenance: 150,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      outputMultiplier: 1.12,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1456,
    key: 'cafe_corner',
    name: '咖啡角',
    description: '咖啡服务，增加收入',
    category: 'production',
    icon: '☕',
    applicableBuildingTypes: BOOKSTORE_TYPES,
    buildCost: 50000,
    dailyMaintenance: 200,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.18,
      qualityBonus: 0.08,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 导出所有零售类附属建筑 ====================

export const RETAIL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  ...CONVENIENCE_SUBSIDIARIES,
  ...SUPERMARKET_SUBSIDIARIES,
  ...HYPERMARKET_SUBSIDIARIES,
  ...ELECTRONICS_STORE_SUBSIDIARIES,
  ...CAR_DEALER_SUBSIDIARIES,
  ...CLOTHING_STORE_SUBSIDIARIES,
  ...LUXURY_STORE_SUBSIDIARIES,
  ...PHARMACY_SUBSIDIARIES,
  ...GAS_STATION_SUBSIDIARIES,
  ...FURNITURE_MALL_SUBSIDIARIES,
  ...COSMETICS_STORE_SUBSIDIARIES,
  ...BOOKSTORE_SUBSIDIARIES,
];