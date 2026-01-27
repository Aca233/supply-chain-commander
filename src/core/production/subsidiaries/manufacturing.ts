/**
 * 制造类建筑的专属附属建筑
 * 包括电子厂、半导体厂、汽车工厂、制药厂等高端制造业
 */

import { SubsidiaryBuildingDef } from '../SubsidiaryBuildings';

// ==================== 电子厂附属建筑 (ID 1200-1209) ====================

const ELECTRONICS_TYPES = [16]; // electronics-factory

export const ELECTRONICS_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1200,
    key: 'cleanroom_expansion',
    name: '洁净室扩建',
    description: '高等级洁净室，提高品质和产量',
    category: 'quality',
    icon: '🏭',
    applicableBuildingTypes: ELECTRONICS_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.30,
      outputMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1201,
    key: 'smt_line',
    name: 'SMT贴片线',
    description: '自动贴片，提高效率减少人工',
    category: 'efficiency',
    icon: '🔧',
    applicableBuildingTypes: ELECTRONICS_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.25,
      laborReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1202,
    key: 'testing_center',
    name: '测试中心',
    description: '全面测试，大幅降低缺陷率',
    category: 'quality',
    icon: '🔬',
    applicableBuildingTypes: ELECTRONICS_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      defectReduction: 0.40,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1203,
    key: 'rd_lab_electronics',
    name: '研发实验室',
    description: '研发能力，提升品质和创新',
    category: 'specialized',
    icon: '💡',
    applicableBuildingTypes: ELECTRONICS_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1200,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.15,
      outputMultiplier: 1.08,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 半导体厂附属建筑 (ID 1210-1219) ====================

const SEMICONDUCTOR_TYPES = [17, 37]; // semiconductor-fab, ai-chip-fab

export const SEMICONDUCTOR_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1210,
    key: 'advanced_lithography',
    name: '先进光刻室',
    description: '先进制程，可生产高端芯片',
    category: 'quality',
    icon: '🔬',
    applicableBuildingTypes: SEMICONDUCTOR_TYPES,
    buildCost: 5000000,
    dailyMaintenance: 15000,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.40,
      outputMultiplier: 0.90,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1211,
    key: 'cleanroom_ultra',
    name: '超净车间扩展',
    description: '扩大产能，增加产量',
    category: 'production',
    icon: '🏭',
    applicableBuildingTypes: SEMICONDUCTOR_TYPES,
    buildCost: 3000000,
    dailyMaintenance: 8000,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.20,
      energyReduction: -0.15,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1212,
    key: 'wafer_inspection',
    name: '晶圆检测站',
    description: '良率控制，大幅降低缺陷',
    category: 'quality',
    icon: '🔍',
    applicableBuildingTypes: SEMICONDUCTOR_TYPES,
    buildCost: 2000000,
    dailyMaintenance: 5000,
    requiredBuildingLevel: 2,
    effects: {
      defectReduction: 0.50,
      qualityBonus: 0.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1213,
    key: 'packaging_testing',
    name: '封装测试线',
    description: '封测能力，完整产业链',
    category: 'specialized',
    icon: '📦',
    applicableBuildingTypes: SEMICONDUCTOR_TYPES,
    buildCost: 1500000,
    dailyMaintenance: 4000,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.15,
      outputMultiplier: 1.05,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 汽车工厂附属建筑 (ID 1220-1229) ====================

const CAR_FACTORY_TYPES = [18]; // car-factory

export const CAR_FACTORY_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1220,
    key: 'stamping_workshop',
    name: '冲压车间',
    description: '零件自制，增加产量',
    category: 'production',
    icon: '🔨',
    applicableBuildingTypes: CAR_FACTORY_TYPES,
    buildCost: 1500000,
    dailyMaintenance: 4000,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.20,
      inputReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1221,
    key: 'painting_line',
    name: '涂装生产线',
    description: '高品质涂装，外观升级',
    category: 'quality',
    icon: '🎨',
    applicableBuildingTypes: CAR_FACTORY_TYPES,
    buildCost: 1000000,
    dailyMaintenance: 3000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      defectReduction: 0.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1222,
    key: 'assembly_automation',
    name: '总装自动化',
    description: '机器人组装，提高效率减少人工',
    category: 'efficiency',
    icon: '🤖',
    applicableBuildingTypes: CAR_FACTORY_TYPES,
    buildCost: 2000000,
    dailyMaintenance: 5000,
    requiredBuildingLevel: 3,
    effects: {
      speedMultiplier: 1.25,
      laborReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1223,
    key: 'quality_inspection',
    name: '质检中心',
    description: '严格质检，降低缺陷率',
    category: 'quality',
    icon: '✅',
    applicableBuildingTypes: CAR_FACTORY_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.15,
      defectReduction: 0.35,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1224,
    key: 'test_track',
    name: '试车跑道',
    description: '下线测试，验证品质',
    category: 'quality',
    icon: '🏎️',
    applicableBuildingTypes: CAR_FACTORY_TYPES,
    buildCost: 800000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.10,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 制药厂附属建筑 (ID 1230-1239) ====================

const PHARMA_TYPES = [30]; // pharma-factory

export const PHARMA_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1230,
    key: 'gmp_cleanroom',
    name: 'GMP洁净车间',
    description: 'GMP认证，大幅提升品质',
    category: 'quality',
    icon: '🏥',
    applicableBuildingTypes: PHARMA_TYPES,
    buildCost: 1200000,
    dailyMaintenance: 4000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.35,
      defectReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1231,
    key: 'quality_analysis',
    name: '质量分析室',
    description: '严格质控，大幅降低缺陷',
    category: 'quality',
    icon: '🔬',
    applicableBuildingTypes: PHARMA_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      defectReduction: 0.45,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1232,
    key: 'cold_storage_pharma',
    name: '冷链储存库',
    description: '药品保鲜，增加存储容量',
    category: 'capacity',
    icon: '❄️',
    applicableBuildingTypes: PHARMA_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1200,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 500,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1233,
    key: 'clinical_trial',
    name: '临床试验中心',
    description: '新药研发，加速创新',
    category: 'specialized',
    icon: '💊',
    applicableBuildingTypes: PHARMA_TYPES,
    buildCost: 2000000,
    dailyMaintenance: 5000,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1234,
    key: 'sterile_filling',
    name: '无菌灌装线',
    description: '无菌灌装，高品质产品',
    category: 'quality',
    icon: '💉',
    applicableBuildingTypes: PHARMA_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      speedMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 医疗器械厂附属建筑 (ID 1240-1244) ====================

const MEDICAL_DEVICE_TYPES = [31]; // medical-device-factory

export const MEDICAL_DEVICE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1240,
    key: 'precision_machining',
    name: '精密加工中心',
    description: '高精度加工，提升品质',
    category: 'quality',
    icon: '⚙️',
    applicableBuildingTypes: MEDICAL_DEVICE_TYPES,
    buildCost: 1000000,
    dailyMaintenance: 3000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.28,
      defectReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1241,
    key: 'sterilization_facility',
    name: '灭菌设施',
    description: '医疗级灭菌，品质保证',
    category: 'quality',
    icon: '🧼',
    applicableBuildingTypes: MEDICAL_DEVICE_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.20,
      defectReduction: 0.25,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 家电厂附属建筑 (ID 1245-1249) ====================

const APPLIANCE_TYPES = [19]; // appliance-factory

export const APPLIANCE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1245,
    key: 'assembly_line_upgrade',
    name: '装配线升级',
    description: '提高装配效率和产量',
    category: 'production',
    icon: '🔧',
    applicableBuildingTypes: APPLIANCE_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      outputMultiplier: 1.20,
      speedMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1246,
    key: 'energy_efficiency_lab',
    name: '能效实验室',
    description: '研发节能产品，提升品质',
    category: 'quality',
    icon: '💡',
    applicableBuildingTypes: APPLIANCE_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.18,
      energyReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 电池厂附属建筑 (ID 1250-1254) ====================

const BATTERY_TYPES = [20]; // battery-factory

export const BATTERY_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1250,
    key: 'electrode_coating',
    name: '电极涂布线',
    description: '高精度涂布，提升电池性能',
    category: 'quality',
    icon: '🔋',
    applicableBuildingTypes: BATTERY_TYPES,
    buildCost: 1200000,
    dailyMaintenance: 3500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      defectReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1251,
    key: 'cell_formation',
    name: '化成分容设备',
    description: '电池激活，提高一致性',
    category: 'quality',
    icon: '⚡',
    applicableBuildingTypes: BATTERY_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.18,
      defectReduction: 0.25,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1252,
    key: 'recycling_line',
    name: '电池回收线',
    description: '回收利用，降低原料成本',
    category: 'efficiency',
    icon: '♻️',
    applicableBuildingTypes: BATTERY_TYPES,
    buildCost: 600000,
    dailyMaintenance: 1500,
    requiredBuildingLevel: 2,
    effects: {
      inputReduction: 0.15,
      maintenanceReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 零部件厂附属建筑 (ID 1255-1259) ====================

const PARTS_TYPES = [21, 100]; // parts-factory, precision-parts-factory

export const PARTS_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1255,
    key: 'cnc_machining',
    name: 'CNC加工中心',
    description: '数控加工，提高精度和效率',
    category: 'quality',
    icon: '🔩',
    applicableBuildingTypes: PARTS_TYPES,
    buildCost: 500000,
    dailyMaintenance: 1200,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.22,
      speedMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1256,
    key: 'heat_treatment',
    name: '热处理车间',
    description: '零件热处理，提升强度',
    category: 'quality',
    icon: '🔥',
    applicableBuildingTypes: PARTS_TYPES,
    buildCost: 350000,
    dailyMaintenance: 900,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      defectReduction: 0.20,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 服装厂附属建筑 (ID 1260-1264) ====================

const CLOTHING_TYPES = [44, 72]; // clothing-factory, leather-goods-factory

export const CLOTHING_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1260,
    key: 'design_studio',
    name: '设计工作室',
    description: '时尚设计，提升产品价值',
    category: 'quality',
    icon: '✂️',
    applicableBuildingTypes: CLOTHING_TYPES,
    buildCost: 300000,
    dailyMaintenance: 800,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.22,
      outputMultiplier: 1.05,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
  {
    id: 1261,
    key: 'sewing_automation',
    name: '自动缝纫线',
    description: '自动化缝制，提高效率',
    category: 'efficiency',
    icon: '🧵',
    applicableBuildingTypes: CLOTHING_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      speedMultiplier: 1.25,
      laborReduction: 0.25,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 家具厂附属建筑 (ID 1265-1269) ====================

const FURNITURE_TYPES = [45]; // furniture-factory

export const FURNITURE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1265,
    key: 'woodworking_cnc',
    name: '木工数控中心',
    description: '精密木工，提高品质',
    category: 'quality',
    icon: '🪑',
    applicableBuildingTypes: FURNITURE_TYPES,
    buildCost: 400000,
    dailyMaintenance: 1000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      speedMultiplier: 1.15,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1266,
    key: 'finishing_workshop',
    name: '涂装车间',
    description: '高品质涂装，提升外观',
    category: 'quality',
    icon: '🎨',
    applicableBuildingTypes: FURNITURE_TYPES,
    buildCost: 250000,
    dailyMaintenance: 600,
    requiredBuildingLevel: 1,
    effects: {
      qualityBonus: 0.15,
      defectReduction: 0.15,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 机器人厂附属建筑 (ID 1270-1274) ====================

const ROBOT_TYPES = [47]; // robot-factory

export const ROBOT_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1270,
    key: 'ai_integration',
    name: 'AI集成中心',
    description: '智能化升级，提升产品价值',
    category: 'quality',
    icon: '🤖',
    applicableBuildingTypes: ROBOT_TYPES,
    buildCost: 2000000,
    dailyMaintenance: 5000,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.30,
      outputMultiplier: 1.10,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1271,
    key: 'precision_assembly',
    name: '精密装配线',
    description: '高精度装配，降低缺陷',
    category: 'quality',
    icon: '⚙️',
    applicableBuildingTypes: ROBOT_TYPES,
    buildCost: 1000000,
    dailyMaintenance: 2500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.20,
      defectReduction: 0.35,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 航空航天厂附属建筑 (ID 1275-1279) ====================

const AEROSPACE_TYPES = [34, 66]; // aerospace-factory, civil-aircraft-factory

export const AEROSPACE_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1275,
    key: 'wind_tunnel',
    name: '风洞实验室',
    description: '空气动力学测试，提升品质',
    category: 'quality',
    icon: '💨',
    applicableBuildingTypes: AEROSPACE_TYPES,
    buildCost: 5000000,
    dailyMaintenance: 15000,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.30,
      defectReduction: 0.25,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1276,
    key: 'composite_workshop',
    name: '复合材料车间',
    description: '先进材料加工，提升性能',
    category: 'specialized',
    icon: '🛠️',
    applicableBuildingTypes: AEROSPACE_TYPES,
    buildCost: 3000000,
    dailyMaintenance: 8000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      inputReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 武器工厂附属建筑 (ID 1280-1284) ====================

const ARMS_TYPES = [33]; // arms-factory

export const ARMS_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1280,
    key: 'ballistics_lab',
    name: '弹道实验室',
    description: '精确测试，提升武器性能',
    category: 'quality',
    icon: '🎯',
    applicableBuildingTypes: ARMS_TYPES,
    buildCost: 2000000,
    dailyMaintenance: 6000,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.28,
      defectReduction: 0.30,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1281,
    key: 'secure_storage',
    name: '安保仓库',
    description: '安全存储，增加容量',
    category: 'capacity',
    icon: '🔐',
    applicableBuildingTypes: ARMS_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2000,
    requiredBuildingLevel: 1,
    effects: {
      storageCapacity: 300,
      defectReduction: 0.10,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 奢侈品工坊附属建筑 (ID 1285-1289) ====================

const LUXURY_TYPES = [36]; // luxury-factory

export const LUXURY_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1285,
    key: 'master_craftsman',
    name: '大师工坊',
    description: '顶级工匠，极致品质',
    category: 'quality',
    icon: '👑',
    applicableBuildingTypes: LUXURY_TYPES,
    buildCost: 1500000,
    dailyMaintenance: 5000,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.40,
      outputMultiplier: 0.85,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
  {
    id: 1286,
    key: 'gem_setting',
    name: '宝石镶嵌室',
    description: '精美镶嵌，提升价值',
    category: 'specialized',
    icon: '💎',
    applicableBuildingTypes: LUXURY_TYPES,
    buildCost: 800000,
    dailyMaintenance: 2500,
    requiredBuildingLevel: 2,
    effects: {
      qualityBonus: 0.25,
      outputMultiplier: 1.05,
    },
    maxPerBuilding: 1,
    slots: 1,
  },
];

// ==================== 量子实验室附属建筑 (ID 1290-1294) ====================

const QUANTUM_TYPES = [38]; // quantum-lab

export const QUANTUM_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  {
    id: 1290,
    key: 'cryogenic_system',
    name: '超低温系统',
    description: '极低温环境，提升量子性能',
    category: 'quality',
    icon: '❄️',
    applicableBuildingTypes: QUANTUM_TYPES,
    buildCost: 10000000,
    dailyMaintenance: 30000,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.35,
      energyReduction: -0.30,
    },
    maxPerBuilding: 1,
    slots: 3,
  },
  {
    id: 1291,
    key: 'quantum_error_correction',
    name: '量子纠错模块',
    description: '降低错误率，提升稳定性',
    category: 'quality',
    icon: '🔮',
    applicableBuildingTypes: QUANTUM_TYPES,
    buildCost: 5000000,
    dailyMaintenance: 15000,
    requiredBuildingLevel: 3,
    effects: {
      qualityBonus: 0.25,
      defectReduction: 0.40,
    },
    maxPerBuilding: 1,
    slots: 2,
  },
];

// ==================== 导出所有制造类附属建筑 ====================

export const MANUFACTURING_SUBSIDIARIES: SubsidiaryBuildingDef[] = [
  ...ELECTRONICS_SUBSIDIARIES,
  ...SEMICONDUCTOR_SUBSIDIARIES,
  ...CAR_FACTORY_SUBSIDIARIES,
  ...PHARMA_SUBSIDIARIES,
  ...MEDICAL_DEVICE_SUBSIDIARIES,
  ...APPLIANCE_SUBSIDIARIES,
  ...BATTERY_SUBSIDIARIES,
  ...PARTS_SUBSIDIARIES,
  ...CLOTHING_SUBSIDIARIES,
  ...FURNITURE_SUBSIDIARIES,
  ...ROBOT_SUBSIDIARIES,
  ...AEROSPACE_SUBSIDIARIES,
  ...ARMS_SUBSIDIARIES,
  ...LUXURY_SUBSIDIARIES,
  ...QUANTUM_SUBSIDIARIES,
];