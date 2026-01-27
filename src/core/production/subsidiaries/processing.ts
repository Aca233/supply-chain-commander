/**
 * 加工类建筑的专属附属建筑
 * 包括钢铁厂、炼油厂、化工厂、食品厂等
 */

import { SubsidiaryBuildingDef } from '../SubsidiaryBuildings';

// ==================== 钢铁厂附属建筑 (ID 1100-1109) ====================

const STEEL_MILL_TYPES = [8, 32]; // steel-mill, special-steel-mill

export const STEEL_MILL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1100,
    key: 'blast_furnace_expansion',
    name: '高炉扩建',
    description: '增加炼钢产能，但能耗上升',
    category: 'production',
    icon: '🔥',
    applicableBuildingTypes: STEEL_MILL_TYPES,
    buildCost: 600000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.25,
      energyReduction: -0.20,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1101,
    key: 'continuous_casting',
    name: '连铸生产线',
    description: '连续铸造提高效率和品质',
    category: 'efficiency',
    icon: '⚙️',
    applicableBuildingTypes: STEEL_MILL_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1200,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.20,
      qualityBonus: 0.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1102,
    key: 'scrap_recycling',
    name: '废钢回收站',
    description: '循环利用废钢，降低原料消耗',
    category: 'efficiency',
    icon: '♻️',
    applicableBuildingTypes: STEEL_MILL_TYPES,
    buildCost: 250000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      inputReduction: 0.15,
      outputMultiplier: 1.03,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1103,
    key: 'special_steel_lab',
    name: '特钢研发中心',
    description: '研发高端特钢产品',
    category: 'quality',
    icon: '🔬',
    applicableBuildingTypes: [32], // 仅特钢厂
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 0.95,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1104,
    key: 'waste_heat_power',
    name: '余热发电站',
    description: '利用余热发电，大幅降低能耗',
    category: 'efficiency',
    icon: '⚡',
    applicableBuildingTypes: STEEL_MILL_TYPES,
    buildCost: 800000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 3,
    effects: {
      energyReduction: 0.30,
      maintenanceReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 炼油厂附属建筑 (ID 1110-1119) ====================

const REFINERY_TYPES = [9]; // refinery

export const REFINERY_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1110,
    key: 'catalytic_cracking',
    name: '催化裂化装置',
    description: '深度加工，增加产量和副产品',
    category: 'production',
    icon: '⚗️',
    applicableBuildingTypes: REFINERY_TYPES,
    buildCost: 1000000,
    dailyMaintenance: 3000,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.20,
      bonusOutputChance: 0.20,
      bonusOutputGoods: 27, // 化工原料
      bonusOutputAmount: 10,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1111,
    key: 'desulfurization',
    name: '脱硫脱蜡设备',
    description: '产品提纯，提高品质',
    category: 'quality',
    icon: '🧪',
    applicableBuildingTypes: REFINERY_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      defectReduction: 0.25,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1112,
    key: 'oil_tank_farm',
    name: '储油罐群',
    description: '大规模存储，增加容量',
    category: 'capacity',
    icon: '🛢️',
    applicableBuildingTypes: REFINERY_TYPES,
    buildCost: 400000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 2000,
      bufferCapacity: 500,
    },
    maxPerBuilding: 2,
    slots: 2,
  },
  {
    id: 1113,
    key: 'pipeline_transport',
    name: '管道运输站',
    description: '管道直运，降低运输成本',
    category: 'efficiency',
    icon: '🔗',
    applicableBuildingTypes: REFINERY_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      maintenanceReduction: 0.25,
      speedMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 化工厂附属建筑 (ID 1120-1129) ====================

const CHEMICAL_TYPES = [10, 99]; // chemical-plant, specialty-chemical-factory

export const CHEMICAL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1120,
    key: 'fine_chemical_workshop',
    name: '精细化工车间',
    description: '生产高纯度产品，品质大幅提升',
    category: 'quality',
    icon: '🔬',
    applicableBuildingTypes: CHEMICAL_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1800,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.30,
      outputMultiplier: 0.90,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1121,
    key: 'safety_control_center',
    name: '安全控制中心',
    description: '安全生产，降低事故率和维护成本',
    category: 'efficiency',
    icon: '🛡️',
    applicableBuildingTypes: CHEMICAL_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 1,
    effects: {
      defectReduction: 0.50,
      maintenanceReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1122,
    key: 'wastewater_treatment',
    name: '废水处理站',
    description: '环保设施，降低运营成本',
    category: 'efficiency',
    icon: '💧',
    applicableBuildingTypes: CHEMICAL_TYPES,
    buildCost: 250000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 1,
    effects: {
      maintenanceReduction: 0.15,
      defectReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1123,
    key: 'catalyst_factory',
    name: '催化剂工厂',
    description: '自产催化剂，提高效率降低成本',
    category: 'specialized',
    icon: '⚗️',
    applicableBuildingTypes: CHEMICAL_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.15,
      inputReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 食品厂附属建筑 (ID 1130-1139) ====================

const FOOD_FACTORY_TYPES = [13, 28, 77, 78, 79]; // food-factory, meat-processing, sugar-mill, brewery, beverage-factory

export const FOOD_FACTORY_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1130,
    key: 'cold_chain_line',
    name: '冷链加工线',
    description: '低温加工，提高品质和保鲜',
    category: 'quality',
    icon: '❄️',
    applicableBuildingTypes: FOOD_FACTORY_TYPES,
    buildCost: 300000,
    dailyMaintenance: 900,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.20,
      defectReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1131,
    key: 'quality_lab',
    name: '质检实验室',
    description: '严格品质把控，降低缺陷率',
    category: 'quality',
    icon: '🔬',
    applicableBuildingTypes: FOOD_FACTORY_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.15,
      defectReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1132,
    key: 'packaging_automation',
    name: '包装自动化',
    description: '自动包装，减少人工提高效率',
    category: 'efficiency',
    icon: '📦',
    applicableBuildingTypes: FOOD_FACTORY_TYPES,
    buildCost: 250000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 2,
    effects: {
      laborReduction: 0.25,
      speedMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1133,
    key: 'organic_workshop',
    name: '有机认证车间',
    description: '生产有机食品，品质溢价',
    category: 'specialized',
    icon: '🌿',
    applicableBuildingTypes: [13], // 仅食品厂
    buildCost: 350000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 0.92,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1134,
    key: 'additive_station',
    name: '食品添加剂站',
    description: '添加剂加工，增加产量',
    category: 'production',
    icon: '🧂',
    applicableBuildingTypes: FOOD_FACTORY_TYPES,
    buildCost: 150000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 1,
    effects: {
      outputMultiplier: 1.15,
      qualityBonus: -0.05,
    },
    maxPerBuilding: 1,
    exclusiveWith: [1133], // 与有机车间互斥
    slots: 1,
  },
];

// ==================== 玻璃厂附属建筑 (ID 1140-1144) ====================

const GLASS_FACTORY_TYPES = [11]; // glass-factory

export const GLASS_FACTORY_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1140,
    key: 'precision_molding',
    name: '精密成型设备',
    description: '高精度玻璃成型，提高品质',
    category: 'quality',
    icon: '🔮',
    applicableBuildingTypes: GLASS_FACTORY_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.22,
      defectReduction: 0.25,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1141,
    key: 'tempering_furnace',
    name: '钢化炉',
    description: '生产钢化玻璃，增加产品价值',
    category: 'specialized',
    icon: '🔥',
    applicableBuildingTypes: GLASS_FACTORY_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 纺织厂附属建筑 (ID 1145-1149) ====================

const TEXTILE_TYPES = [12, 71]; // textile-mill, tannery

export const TEXTILE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1145,
    key: 'dyeing_workshop',
    name: '染色车间',
    description: '高品质染色，提升产品价值',
    category: 'quality',
    icon: '🎨',
    applicableBuildingTypes: TEXTILE_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 1.05,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1146,
    key: 'weaving_automation',
    name: '自动织机',
    description: '自动化织造，提高效率',
    category: 'efficiency',
    icon: '🧵',
    applicableBuildingTypes: [12], // 仅纺织厂
    buildCost: 350000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.25,
      laborReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1147,
    key: 'leather_treatment',
    name: '皮革处理线',
    description: '高级皮革处理，提升品质',
    category: 'quality',
    icon: '🧤',
    applicableBuildingTypes: [71], // 仅制革厂
    buildCost: 250000,
    dailyMaintenance: 700,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.22,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 水泥厂附属建筑 (ID 1150-1154) ====================

const CEMENT_TYPES = [14]; // cement-factory

export const CEMENT_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1150,
    key: 'rotary_kiln_upgrade',
    name: '回转窑升级',
    description: '提高煅烧效率和产量',
    category: 'production',
    icon: '🔥',
    applicableBuildingTypes: CEMENT_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.22,
      energyReduction: -0.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1151,
    key: 'dust_collection',
    name: '除尘系统',
    description: '环保除尘，降低维护成本',
    category: 'efficiency',
    icon: '💨',
    applicableBuildingTypes: CEMENT_TYPES,
    buildCost: 200000,
    dailyMaintenance: 400,
    requiredBuildingLevel: 1,
    effects: {
      maintenanceReduction: 0.20,
      defectReduction: 0.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 铝冶炼厂附属建筑 (ID 1155-1159) ====================

const ALUMINUM_TYPES = [15, 69]; // aluminum-smelter, metal-refinery

export const ALUMINUM_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1155,
    key: 'electrolysis_upgrade',
    name: '电解槽升级',
    description: '提高电解效率，降低能耗',
    category: 'efficiency',
    icon: '⚡',
    applicableBuildingTypes: ALUMINUM_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      energyReduction: 0.20,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1156,
    key: 'alloy_mixing',
    name: '合金配料站',
    description: '生产铝合金，提高产品价值',
    category: 'specialized',
    icon: '🔩',
    applicableBuildingTypes: ALUMINUM_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 1.08,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 造纸厂附属建筑 (ID 1160-1164) ====================

const PAPER_MILL_TYPES = [42]; // paper-mill

export const PAPER_MILL_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1160,
    key: 'pulp_bleaching',
    name: '纸浆漂白线',
    description: '高白度纸浆，提高品质',
    category: 'quality',
    icon: '📄',
    applicableBuildingTypes: PAPER_MILL_TYPES,
    buildCost: 200000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.18,
      outputMultiplier: 0.98,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1161,
    key: 'recycled_paper',
    name: '再生纸生产线',
    description: '利用废纸，降低原料消耗',
    category: 'efficiency',
    icon: '♻️',
    applicableBuildingTypes: PAPER_MILL_TYPES,
    buildCost: 250000,
    dailyMaintenance: 500,
    requiredBuildingLevel: 2,
    effects: {
      inputReduction: 0.20,
      qualityBonus: -0.05,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 导出所有加工类附属建筑 ====================

export const PROCESSING_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  ...STEEL_MILL_SUBSIDIARIES,
  ...REFINERY_SUBSIDIARIES,
  ...CHEMICAL_SUBSIDIARIES,
  ...FOOD_FACTORY_SUBSIDIARIES,
  ...GLASS_FACTORY_SUBSIDIARIES,
  ...TEXTILE_SUBSIDIARIES,
  ...CEMENT_SUBSIDIARIES,
  ...ALUMINUM_SUBSIDIARIES,
  ...PAPER_MILL_SUBSIDIARIES,
];