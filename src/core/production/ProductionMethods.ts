/**
 * 生产方式槽位系统 (Victoria 3风格)
 * 每个建筑可配置多个槽位，每个槽位可选择不同的生产方式
 */

// ==================== 类型定义 ====================

/**
 * 生产方式槽位类型
 */
export type ProductionSlotType = 
  | 'process'      // 生产工艺
  | 'automation'   // 自动化程度
  | 'energy'       // 能源来源
  | 'quality'      // 品质控制
  | 'environment'; // 环保措施

/**
 * 生产方式定义
 */
export interface ProductionMethod {
  id: number;
  key: string;
  name: string;
  slotType: ProductionSlotType;
  
  // 资源修正 (goodsId -> multiplier)
  inputMultipliers: Map<number, number>;   // 输入量倍数
  outputMultipliers: Map<number, number>;  // 输出量倍数
  
  // 成本修正
  laborMultiplier: number;
  energyMultiplier: number;
  maintenanceMultiplier: number;
  
  // 品质影响
  qualityBonus: number;                    // 产品品质提升
  
  // 环境影响
  pollutionMultiplier: number;
  
  // 解锁条件
  requiredLevel: number;
  
  // 切换成本
  switchCooldown: number;                  // tick数
  switchCost: number;
  
  // 描述
  description: string;
}

/**
 * 建筑槽位配置
 */
export interface BuildingSlotConfig {
  buildingTypeId: number;
  slots: {
    slotType: ProductionSlotType;
    availableMethods: number[];            // 可用方式ID列表
    defaultMethod: number;
  }[];
}

/**
 * 建筑实例的槽位状态
 */
export interface BuildingSlotState {
  methodId: number;
  cooldownRemaining: number;               // 剩余冷却时间
}

/**
 * 计算后的生产修正
 */
export interface ProductionModifiers {
  inputMultipliers: Map<number, number>;
  outputMultipliers: Map<number, number>;
  laborMultiplier: number;
  energyMultiplier: number;
  maintenanceMultiplier: number;
  qualityBonus: number;
  pollutionMultiplier: number;
}

// ==================== 生产方式定义 ====================

// 生产工艺方式 (100-109)
const PROCESS_METHODS: ProductionMethod[] = [
  {
    id: 100,
    key: 'traditional_process',
    name: '传统工艺',
    slotType: 'process',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 1.0,
    energyMultiplier: 1.0,
    maintenanceMultiplier: 1.0,
    qualityBonus: 0,
    pollutionMultiplier: 1.2,
    requiredLevel: 1,
    switchCooldown: 24,
    switchCost: 10000,
    description: '传统生产工艺，成本低但效率一般',
  },
  {
    id: 101,
    key: 'improved_process',
    name: '改良工艺',
    slotType: 'process',
    inputMultipliers: new Map(),
    outputMultipliers: new Map([[0, 1.1]]),  // 产出+10%（通用占位）
    laborMultiplier: 0.9,
    energyMultiplier: 1.1,
    maintenanceMultiplier: 1.1,
    qualityBonus: 0.05,
    pollutionMultiplier: 1.0,
    requiredLevel: 2,
    switchCooldown: 48,
    switchCost: 50000,
    description: '改良生产工艺，提升效率和品质',
  },
  {
    id: 102,
    key: 'advanced_process',
    name: '先进工艺',
    slotType: 'process',
    inputMultipliers: new Map([[0, 0.9]]),  // 输入-10%
    outputMultipliers: new Map([[0, 1.2]]),  // 产出+20%
    laborMultiplier: 0.8,
    energyMultiplier: 1.2,
    maintenanceMultiplier: 1.3,
    qualityBonus: 0.15,
    pollutionMultiplier: 0.8,
    requiredLevel: 3,
    switchCooldown: 72,
    switchCost: 150000,
    description: '先进生产工艺，高效率高品质',
  },
  {
    id: 103,
    key: 'cutting_edge_process',
    name: '尖端工艺',
    slotType: 'process',
    inputMultipliers: new Map([[0, 0.85]]),
    outputMultipliers: new Map([[0, 1.35]]),
    laborMultiplier: 0.6,
    energyMultiplier: 1.4,
    maintenanceMultiplier: 1.6,
    qualityBonus: 0.25,
    pollutionMultiplier: 0.6,
    requiredLevel: 4,
    switchCooldown: 96,
    switchCost: 400000,
    description: '尖端生产工艺，极高效率和品质',
  },
];

// 自动化方式 (110-119)
const AUTOMATION_METHODS: ProductionMethod[] = [
  {
    id: 110,
    key: 'manual_operation',
    name: '人工操作',
    slotType: 'automation',
    inputMultipliers: new Map(),
    outputMultipliers: new Map([[0, 0.9]]),
    laborMultiplier: 1.5,
    energyMultiplier: 0.8,
    maintenanceMultiplier: 0.9,
    qualityBonus: -0.1,
    pollutionMultiplier: 1.1,
    requiredLevel: 1,
    switchCooldown: 12,
    switchCost: 0,
    description: '人工操作，灵活但效率较低',
  },
  {
    id: 111,
    key: 'semi_automation',
    name: '半自动化',
    slotType: 'automation',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 1.0,
    energyMultiplier: 1.0,
    maintenanceMultiplier: 1.0,
    qualityBonus: 0,
    pollutionMultiplier: 1.0,
    requiredLevel: 1,
    switchCooldown: 24,
    switchCost: 100000,
    description: '半自动化生产线，平衡效率和成本',
  },
  {
    id: 112,
    key: 'full_automation',
    name: '全自动化',
    slotType: 'automation',
    inputMultipliers: new Map(),
    outputMultipliers: new Map([[0, 1.15]]),
    laborMultiplier: 0.4,
    energyMultiplier: 1.3,
    maintenanceMultiplier: 1.4,
    qualityBonus: 0.15,
    pollutionMultiplier: 0.9,
    requiredLevel: 3,
    switchCooldown: 72,
    switchCost: 500000,
    description: '全自动化产线，低人力高效率',
  },
  {
    id: 113,
    key: 'ai_controlled',
    name: 'AI智能控制',
    slotType: 'automation',
    inputMultipliers: new Map([[0, 0.95]]),
    outputMultipliers: new Map([[0, 1.3]]),
    laborMultiplier: 0.2,
    energyMultiplier: 1.5,
    maintenanceMultiplier: 1.8,
    qualityBonus: 0.25,
    pollutionMultiplier: 0.8,
    requiredLevel: 5,
    switchCooldown: 120,
    switchCost: 2000000,
    description: 'AI控制的智能工厂，最高效率',
  },
];

// 能源方式 (120-129)
const ENERGY_METHODS: ProductionMethod[] = [
  {
    id: 120,
    key: 'coal_power',
    name: '燃煤供能',
    slotType: 'energy',
    inputMultipliers: new Map([[3, 1.2]]),  // 需要额外煤炭(goodsId=3)
    outputMultipliers: new Map(),
    laborMultiplier: 1.1,
    energyMultiplier: 0.3,
    maintenanceMultiplier: 1.1,
    qualityBonus: 0,
    pollutionMultiplier: 1.5,
    requiredLevel: 1,
    switchCooldown: 72,
    switchCost: 300000,
    description: '自备燃煤发电，成本低但污染高',
  },
  {
    id: 121,
    key: 'grid_power',
    name: '电网供电',
    slotType: 'energy',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 1.0,
    energyMultiplier: 1.0,
    maintenanceMultiplier: 1.0,
    qualityBonus: 0,
    pollutionMultiplier: 1.0,
    requiredLevel: 1,
    switchCooldown: 24,
    switchCost: 50000,
    description: '使用公共电网供电，标准方案',
  },
  {
    id: 122,
    key: 'gas_power',
    name: '燃气供能',
    slotType: 'energy',
    inputMultipliers: new Map([[5, 0.5]]),  // 需要天然气(goodsId=5)
    outputMultipliers: new Map(),
    laborMultiplier: 0.95,
    energyMultiplier: 0.4,
    maintenanceMultiplier: 1.05,
    qualityBonus: 0,
    pollutionMultiplier: 0.8,
    requiredLevel: 2,
    switchCooldown: 48,
    switchCost: 400000,
    description: '燃气发电，清洁高效',
  },
  {
    id: 123,
    key: 'solar_power',
    name: '光伏供能',
    slotType: 'energy',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 0.9,
    energyMultiplier: 0.5,
    maintenanceMultiplier: 0.8,
    qualityBonus: 0,
    pollutionMultiplier: 0.3,
    requiredLevel: 2,
    switchCooldown: 96,
    switchCost: 800000,
    description: '光伏发电，环保但初始投资高',
  },
  {
    id: 124,
    key: 'hybrid_power',
    name: '混合供能',
    slotType: 'energy',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 0.95,
    energyMultiplier: 0.6,
    maintenanceMultiplier: 1.1,
    qualityBonus: 0,
    pollutionMultiplier: 0.6,
    requiredLevel: 3,
    switchCooldown: 72,
    switchCost: 600000,
    description: '多能源混合供电，稳定可靠',
  },
];

// 品质控制方式 (130-139)
const QUALITY_METHODS: ProductionMethod[] = [
  {
    id: 130,
    key: 'basic_qc',
    name: '基础质检',
    slotType: 'quality',
    inputMultipliers: new Map(),
    outputMultipliers: new Map([[0, 0.98]]),  // 略有损耗
    laborMultiplier: 1.0,
    energyMultiplier: 1.0,
    maintenanceMultiplier: 1.0,
    qualityBonus: 0,
    pollutionMultiplier: 1.0,
    requiredLevel: 1,
    switchCooldown: 12,
    switchCost: 20000,
    description: '基础质量检查，满足最低标准',
  },
  {
    id: 131,
    key: 'standard_qc',
    name: '标准质检',
    slotType: 'quality',
    inputMultipliers: new Map(),
    outputMultipliers: new Map([[0, 0.95]]),
    laborMultiplier: 1.1,
    energyMultiplier: 1.05,
    maintenanceMultiplier: 1.1,
    qualityBonus: 0.15,
    pollutionMultiplier: 1.0,
    requiredLevel: 1,
    switchCooldown: 24,
    switchCost: 50000,
    description: '标准质量控制流程，稳定品质',
  },
  {
    id: 132,
    key: 'premium_qc',
    name: '高端质检',
    slotType: 'quality',
    inputMultipliers: new Map(),
    outputMultipliers: new Map([[0, 0.90]]),
    laborMultiplier: 1.3,
    energyMultiplier: 1.1,
    maintenanceMultiplier: 1.2,
    qualityBonus: 0.35,
    pollutionMultiplier: 1.0,
    requiredLevel: 3,
    switchCooldown: 48,
    switchCost: 150000,
    description: '严格的高端质量控制',
  },
  {
    id: 133,
    key: 'luxury_qc',
    name: '奢华品控',
    slotType: 'quality',
    inputMultipliers: new Map(),
    outputMultipliers: new Map([[0, 0.85]]),
    laborMultiplier: 1.6,
    energyMultiplier: 1.15,
    maintenanceMultiplier: 1.4,
    qualityBonus: 0.5,
    pollutionMultiplier: 1.0,
    requiredLevel: 4,
    switchCooldown: 72,
    switchCost: 300000,
    description: '极致品控，适合奢侈品生产',
  },
];

// 环保措施 (140-149)
const ENVIRONMENT_METHODS: ProductionMethod[] = [
  {
    id: 140,
    key: 'no_treatment',
    name: '无环保处理',
    slotType: 'environment',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 1.0,
    energyMultiplier: 1.0,
    maintenanceMultiplier: 1.0,
    qualityBonus: 0,
    pollutionMultiplier: 1.5,
    requiredLevel: 1,
    switchCooldown: 12,
    switchCost: 0,
    description: '无环保处理，高污染风险',
  },
  {
    id: 141,
    key: 'basic_filter',
    name: '基础过滤',
    slotType: 'environment',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 1.05,
    energyMultiplier: 1.1,
    maintenanceMultiplier: 1.15,
    qualityBonus: 0,
    pollutionMultiplier: 0.8,
    requiredLevel: 1,
    switchCooldown: 24,
    switchCost: 100000,
    description: '基础废气废水处理',
  },
  {
    id: 142,
    key: 'advanced_treatment',
    name: '高级处理',
    slotType: 'environment',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 1.1,
    energyMultiplier: 1.2,
    maintenanceMultiplier: 1.3,
    qualityBonus: 0,
    pollutionMultiplier: 0.4,
    requiredLevel: 2,
    switchCooldown: 48,
    switchCost: 300000,
    description: '先进的环保处理系统',
  },
  {
    id: 143,
    key: 'zero_emission',
    name: '零排放系统',
    slotType: 'environment',
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 1.15,
    energyMultiplier: 1.4,
    maintenanceMultiplier: 1.5,
    qualityBonus: 0.05,
    pollutionMultiplier: 0.1,
    requiredLevel: 4,
    switchCooldown: 96,
    switchCost: 800000,
    description: '近乎零排放的绿色工厂',
  },
];

// ==================== 合并所有生产方式 ====================

export const ALL_PRODUCTION_METHODS: ProductionMethod[] = [
  ...PROCESS_METHODS,
  ...AUTOMATION_METHODS,
  ...ENERGY_METHODS,
  ...QUALITY_METHODS,
  ...ENVIRONMENT_METHODS,
];

// ID到方式的映射
export const METHODS_BY_ID: Map<number, ProductionMethod> = new Map(
  ALL_PRODUCTION_METHODS.map(m => [m.id, m])
);

// Key到方式的映射
export const METHODS_BY_KEY: Map<string, ProductionMethod> = new Map(
  ALL_PRODUCTION_METHODS.map(m => [m.key, m])
);

// 按槽位类型分组
export const METHODS_BY_SLOT: Map<ProductionSlotType, ProductionMethod[]> = new Map([
  ['process', PROCESS_METHODS],
  ['automation', AUTOMATION_METHODS],
  ['energy', ENERGY_METHODS],
  ['quality', QUALITY_METHODS],
  ['environment', ENVIRONMENT_METHODS],
]);

// ==================== 建筑槽位配置 ====================

/**
 * 各建筑类型的槽位配置
 * 不同类型建筑有不同的可用槽位和方式选项
 */
export const BUILDING_SLOT_CONFIGS: BuildingSlotConfig[] = [
  // 采掘类建筑 - 简单配置（只有自动化和环保槽位）
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [140, 141, 142], defaultMethod: 140 },
    ],
  })),
  
  // 钢铁厂 (ID 8) - 完整5槽配置
  {
    buildingTypeId: 8,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112, 113], defaultMethod: 111 },
      { slotType: 'energy', availableMethods: [120, 121, 122, 123, 124], defaultMethod: 121 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142, 143], defaultMethod: 141 },
    ],
  },
  
  // 炼油厂 (ID 9) - 完整5槽配置
  {
    buildingTypeId: 9,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112, 113], defaultMethod: 111 },
      { slotType: 'energy', availableMethods: [120, 121, 122, 123, 124], defaultMethod: 121 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142, 143], defaultMethod: 141 },
    ],
  },
  
  // 化工厂 (ID 10) - 完整5槽配置
  {
    buildingTypeId: 10,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112, 113], defaultMethod: 111 },
      { slotType: 'energy', availableMethods: [120, 121, 122, 123, 124], defaultMethod: 121 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142, 143], defaultMethod: 141 },
    ],
  },
  
  // 玻璃厂、纺织厂、食品厂、水泥厂、铝厂 (ID 11-15) - 4槽配置
  ...[11, 12, 13, 14, 15].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  })),
  
  // 电子厂 (ID 16) - 完整5槽 + 高端选项
  {
    buildingTypeId: 16,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 111 },
      { slotType: 'energy', availableMethods: [121, 122, 123, 124], defaultMethod: 121 },
      { slotType: 'quality', availableMethods: [130, 131, 132, 133], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [141, 142, 143], defaultMethod: 141 },
    ],
  },
  
  // 半导体厂 (ID 17) - 高端配置
  {
    buildingTypeId: 17,
    slots: [
      { slotType: 'process', availableMethods: [102, 103], defaultMethod: 102 },
      { slotType: 'automation', availableMethods: [112, 113], defaultMethod: 112 },
      { slotType: 'energy', availableMethods: [121, 123, 124], defaultMethod: 121 },
      { slotType: 'quality', availableMethods: [132, 133], defaultMethod: 132 },
      { slotType: 'environment', availableMethods: [142, 143], defaultMethod: 142 },
    ],
  },
  
  // 汽车厂 (ID 18) - 完整配置
  {
    buildingTypeId: 18,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 111 },
      { slotType: 'energy', availableMethods: [121, 122, 123, 124], defaultMethod: 121 },
      { slotType: 'quality', availableMethods: [130, 131, 132, 133], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [140, 141, 142, 143], defaultMethod: 141 },
    ],
  },
  
  // 家电厂、电池厂、零部件厂 (ID 19-21) - 标准制造配置
  ...[19, 20, 21].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112, 113], defaultMethod: 111 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  })),
  
  // 物流中心、仓储中心 (ID 22-23) - 只有自动化
  ...[22, 23].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 111 },
    ],
  })),
  
  // 发电厂 (ID 24) - 能源和环保
  {
    buildingTypeId: 24,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'environment', availableMethods: [140, 141, 142, 143], defaultMethod: 141 },
    ],
  },
  
  // 农业建筑 (ID 25-28) - 简单配置
  ...[25, 26, 27, 28].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 110 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [130, 131], defaultMethod: 130 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [140, 141], defaultMethod: 140 },
    ],
  })),
  
  // 制药建筑 (ID 29-31) - 高品质配置
  ...[29, 30, 31].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [100, 101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [111, 112, 113], defaultMethod: 111 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [131, 132, 133], defaultMethod: 131 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  })),
  
  // 军工建筑 (ID 32-34) - 高规格配置
  ...[32, 33, 34].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [101, 102, 103], defaultMethod: 102 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [111, 112, 113], defaultMethod: 112 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [131, 132, 133], defaultMethod: 132 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  })),
  
  // 奢侈品建筑 (ID 35-36) - 品质优先
  ...[35, 36].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [101, 102, 103], defaultMethod: 102 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 110 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [132, 133], defaultMethod: 132 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [141, 142], defaultMethod: 141 },
    ],
  })),
  
  // 高科技建筑 (ID 37-39) - 尖端配置
  ...[37, 38, 39].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [102, 103], defaultMethod: 103 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [112, 113], defaultMethod: 112 },
      { slotType: 'energy' as ProductionSlotType, availableMethods: [123, 124], defaultMethod: 123 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [132, 133], defaultMethod: 132 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [142, 143], defaultMethod: 143 },
    ],
  })),
  
  // 橡胶园、锂矿场 (ID 40-41) - 采掘配置
  ...[40, 41].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [140, 141, 142], defaultMethod: 140 },
    ],
  })),
  
  // 造纸厂、橡胶厂 (ID 42-43) - 加工配置
  ...[42, 43].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  })),
  
  // 服装厂、家具厂、建材厂 (ID 44-46) - 制造配置
  ...[44, 45, 46].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112, 113], defaultMethod: 111 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  })),
  
  // 机器人厂 (ID 47) - 高端制造配置
  {
    buildingTypeId: 47,
    slots: [
      { slotType: 'process', availableMethods: [101, 102, 103], defaultMethod: 102 },
      { slotType: 'automation', availableMethods: [112, 113], defaultMethod: 112 },
      { slotType: 'energy', availableMethods: [121, 123, 124], defaultMethod: 121 },
      { slotType: 'quality', availableMethods: [131, 132, 133], defaultMethod: 132 },
      { slotType: 'environment', availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  },
  
  // 新能源设备厂 (ID 48) - 环保制造配置
  {
    buildingTypeId: 48,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 111 },
      { slotType: 'energy', availableMethods: [121, 123, 124], defaultMethod: 123 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  },
  
  // ==================== 新增产业链建筑配置 ====================
  
  // 日化产业链建筑 (ID 59-61)
  // 棕榈种植园 (ID 59) - 采掘配置
  {
    buildingTypeId: 59,
    slots: [
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 110 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 140 },
    ],
  },
  // 日化厂 (ID 60) - 制造配置
  {
    buildingTypeId: 60,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112, 113], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132, 133], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  // 洗涤用品厂 (ID 61) - 制造配置
  {
    buildingTypeId: 61,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  
  // 交通运输设备建筑 (ID 62-66)
  // 轮胎厂 (ID 62)
  {
    buildingTypeId: 62,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  // 自行车厂 (ID 63)
  {
    buildingTypeId: 63,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141], defaultMethod: 140 },
    ],
  },
  // 造船厂、铁路车辆厂、民用航空厂 (ID 64-66) - 高端制造配置
  ...[64, 65, 66].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'process' as ProductionSlotType, availableMethods: [101, 102, 103], defaultMethod: 102 },
      { slotType: 'automation' as ProductionSlotType, availableMethods: [111, 112, 113], defaultMethod: 112 },
      { slotType: 'energy' as ProductionSlotType, availableMethods: [121, 122, 123, 124], defaultMethod: 121 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [131, 132, 133], defaultMethod: 132 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  })),
  
  // 矿业扩展建筑 (ID 67-69)
  // 多金属矿场、战略金属矿场 (ID 67-68) - 采掘配置
  ...[67, 68].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'environment' as ProductionSlotType, availableMethods: [140, 141, 142], defaultMethod: 140 },
    ],
  })),
  // 有色金属冶炼厂 (ID 69) - 加工配置
  {
    buildingTypeId: 69,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112, 113], defaultMethod: 111 },
      { slotType: 'energy', availableMethods: [120, 121, 122, 123, 124], defaultMethod: 121 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142, 143], defaultMethod: 141 },
    ],
  },
  
  // 纺织扩展建筑 (ID 70-72)
  // 牧羊场 (ID 70) - 采掘配置
  {
    buildingTypeId: 70,
    slots: [
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 110 },
      { slotType: 'quality', availableMethods: [130, 131], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141], defaultMethod: 140 },
    ],
  },
  // 制革厂 (ID 71)
  {
    buildingTypeId: 71,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  // 皮具厂 (ID 72)
  {
    buildingTypeId: 72,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [131, 132, 133], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  
  // 建材扩展建筑 (ID 73-75)
  // 粘土矿场 (ID 73) - 采掘配置
  {
    buildingTypeId: 73,
    slots: [
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 140 },
    ],
  },
  // 砖瓦厂 (ID 74)
  {
    buildingTypeId: 74,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  // 陶瓷厂 (ID 75)
  {
    buildingTypeId: 75,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132, 133], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  
  // 农产品深加工建筑 (ID 76-79)
  // 经济作物种植园 (ID 76) - 采掘配置
  {
    buildingTypeId: 76,
    slots: [
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 110 },
      { slotType: 'quality', availableMethods: [130, 131], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141], defaultMethod: 140 },
    ],
  },
  // 制糖厂 (ID 77)
  {
    buildingTypeId: 77,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  // 酿酒厂 (ID 78)
  {
    buildingTypeId: 78,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 110 },
      { slotType: 'quality', availableMethods: [130, 131, 132, 133], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  // 饮品厂 (ID 79)
  {
    buildingTypeId: 79,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  
  // 能源扩展建筑 (ID 80-83)
  // 铀矿场 (ID 80) - 采掘配置
  {
    buildingTypeId: 80,
    slots: [
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'environment', availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  },
  // 核燃料厂 (ID 81) - 高端加工配置
  {
    buildingTypeId: 81,
    slots: [
      { slotType: 'process', availableMethods: [102, 103], defaultMethod: 102 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 112 },
      { slotType: 'quality', availableMethods: [132, 133], defaultMethod: 132 },
      { slotType: 'environment', availableMethods: [142, 143], defaultMethod: 143 },
    ],
  },
  // 核电设备厂 (ID 82) - 尖端制造配置
  {
    buildingTypeId: 82,
    slots: [
      { slotType: 'process', availableMethods: [102, 103], defaultMethod: 103 },
      { slotType: 'automation', availableMethods: [112, 113], defaultMethod: 112 },
      { slotType: 'energy', availableMethods: [123, 124], defaultMethod: 123 },
      { slotType: 'quality', availableMethods: [132, 133], defaultMethod: 133 },
      { slotType: 'environment', availableMethods: [142, 143], defaultMethod: 143 },
    ],
  },
  // 电力设备厂 (ID 83)
  {
    buildingTypeId: 83,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  },
  
  // 通信产业链建筑 (ID 84-87)
  // 光纤厂 (ID 84)
  {
    buildingTypeId: 84,
    slots: [
      { slotType: 'process', availableMethods: [101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [131, 132, 133], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [141, 142], defaultMethod: 141 },
    ],
  },
  // 通信设备厂 (ID 85)
  {
    buildingTypeId: 85,
    slots: [
      { slotType: 'process', availableMethods: [101, 102, 103], defaultMethod: 102 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 112 },
      { slotType: 'quality', availableMethods: [131, 132, 133], defaultMethod: 132 },
      { slotType: 'environment', availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  },
  // 网络设备厂 (ID 86)
  {
    buildingTypeId: 86,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [141, 142], defaultMethod: 141 },
    ],
  },
  // 卫星工厂 (ID 87) - 尖端制造配置
  {
    buildingTypeId: 87,
    slots: [
      { slotType: 'process', availableMethods: [102, 103], defaultMethod: 103 },
      { slotType: 'automation', availableMethods: [112, 113], defaultMethod: 112 },
      { slotType: 'energy', availableMethods: [123, 124], defaultMethod: 123 },
      { slotType: 'quality', availableMethods: [132, 133], defaultMethod: 133 },
      { slotType: 'environment', availableMethods: [142, 143], defaultMethod: 143 },
    ],
  },
  
  // 服务业建筑 (ID 88-93) - 只有自动化
  ...[88, 89, 90, 91, 92, 93].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality' as ProductionSlotType, availableMethods: [130, 131, 132], defaultMethod: 131 },
    ],
  })),
  
  // 文化传媒建筑 (ID 94-97)
  // 印刷厂 (ID 94)
  {
    buildingTypeId: 94,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141, 142], defaultMethod: 141 },
    ],
  },
  // 影视制作中心 (ID 95)
  {
    buildingTypeId: 95,
    slots: [
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [131, 132, 133], defaultMethod: 132 },
    ],
  },
  // 游戏工作室 (ID 96)
  {
    buildingTypeId: 96,
    slots: [
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 131 },
    ],
  },
  // 玩具厂 (ID 97)
  {
    buildingTypeId: 97,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131, 132], defaultMethod: 131 },
      { slotType: 'environment', availableMethods: [140, 141], defaultMethod: 140 },
    ],
  },
  
  // 杂项建筑 (ID 98-100)
  // 配件厂 (ID 98)
  {
    buildingTypeId: 98,
    slots: [
      { slotType: 'process', availableMethods: [100, 101, 102], defaultMethod: 100 },
      { slotType: 'automation', availableMethods: [110, 111, 112], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [130, 131], defaultMethod: 130 },
      { slotType: 'environment', availableMethods: [140, 141], defaultMethod: 140 },
    ],
  },
  // 精细化工厂 (ID 99)
  {
    buildingTypeId: 99,
    slots: [
      { slotType: 'process', availableMethods: [101, 102, 103], defaultMethod: 102 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 112 },
      { slotType: 'quality', availableMethods: [131, 132, 133], defaultMethod: 132 },
      { slotType: 'environment', availableMethods: [141, 142, 143], defaultMethod: 142 },
    ],
  },
  // 精密零件厂 (ID 100)
  {
    buildingTypeId: 100,
    slots: [
      { slotType: 'process', availableMethods: [101, 102, 103], defaultMethod: 101 },
      { slotType: 'automation', availableMethods: [111, 112, 113], defaultMethod: 111 },
      { slotType: 'quality', availableMethods: [131, 132, 133], defaultMethod: 132 },
      { slotType: 'environment', availableMethods: [141, 142], defaultMethod: 141 },
    ],
  },
  
  // 新增零售建筑 (ID 101-106) - 只有自动化（零售建筑不生产）
  ...[101, 102, 103, 104, 105, 106].map(id => ({
    buildingTypeId: id,
    slots: [
      { slotType: 'automation' as ProductionSlotType, availableMethods: [110, 111, 112], defaultMethod: 111 },
    ],
  })),
];

// 建筑类型ID到槽位配置的映射
export const SLOT_CONFIGS_BY_BUILDING: Map<number, BuildingSlotConfig> = new Map(
  BUILDING_SLOT_CONFIGS.map(c => [c.buildingTypeId, c])
);

// ==================== 工具函数 ====================

/**
 * 获取建筑的默认槽位方法数组
 * 优先使用新系统的专属配置，回退到旧系统
 */
export function getDefaultSlotMethods(buildingTypeId: number): number[] {
  // 优先使用新系统的专属配置
  if (newSystemInitialized) {
    const newConfig = NewMethodsSystem.getBuildingConfig(buildingTypeId);
    if (newConfig && newConfig.defaultMethods) {
      // 返回新系统的默认方式ID数组
      const methodIds = Object.values(newConfig.defaultMethods) as number[];
      return methodIds;
    }
  }
  
  // 回退到旧系统
  const config = SLOT_CONFIGS_BY_BUILDING.get(buildingTypeId);
  if (!config) {
    return [];
  }
  const methodIds = config.slots.map(s => s.defaultMethod);
  return methodIds;
}

/**
 * 获取建筑的槽位数量
 * 优先使用新系统的配置
 */
export function getBuildingSlotCount(buildingTypeId: number): number {
  // 优先使用新系统
  if (newSystemInitialized) {
    const newConfig = NewMethodsSystem.getBuildingConfig(buildingTypeId);
    if (newConfig && newConfig.slots) {
      return newConfig.slots.length;
    }
  }
  
  // 回退到旧系统
  const config = SLOT_CONFIGS_BY_BUILDING.get(buildingTypeId);
  return config ? config.slots.length : 0;
}

/**
 * 检查方式是否可用于该建筑
 */
export function isMethodAvailable(buildingTypeId: number, slotIndex: number, methodId: number): boolean {
  const config = SLOT_CONFIGS_BY_BUILDING.get(buildingTypeId);
  if (!config || slotIndex >= config.slots.length) return false;
  return config.slots[slotIndex].availableMethods.includes(methodId);
}

/**
 * 检查方式是否满足建筑等级要求
 */
export function isMethodUnlocked(buildingLevel: number, methodId: number): boolean {
  const method = METHODS_BY_ID.get(methodId);
  if (!method) return false;
  return buildingLevel >= method.requiredLevel;
}

/**
 * 计算建筑的综合生产修正
 * 将多个槽位的方式效果叠加
 */
export function calculateProductionModifiers(slotMethods: number[]): ProductionModifiers {
  const result: ProductionModifiers = {
    inputMultipliers: new Map(),
    outputMultipliers: new Map(),
    laborMultiplier: 1.0,
    energyMultiplier: 1.0,
    maintenanceMultiplier: 1.0,
    qualityBonus: 0,
    pollutionMultiplier: 1.0,
  };
  
  for (const methodId of slotMethods) {
    const method = METHODS_BY_ID.get(methodId);
    if (!method) continue;
    
    // 叠加输入修正（乘法）
    for (const [goodsId, multiplier] of method.inputMultipliers) {
      const current = result.inputMultipliers.get(goodsId) ?? 1.0;
      result.inputMultipliers.set(goodsId, current * multiplier);
    }
    
    // 叠加输出修正（乘法）
    for (const [goodsId, multiplier] of method.outputMultipliers) {
      const current = result.outputMultipliers.get(goodsId) ?? 1.0;
      result.outputMultipliers.set(goodsId, current * multiplier);
    }
    
    // 叠加成本修正（乘法）
    result.laborMultiplier *= method.laborMultiplier;
    result.energyMultiplier *= method.energyMultiplier;
    result.maintenanceMultiplier *= method.maintenanceMultiplier;
    
    // 叠加品质加成（加法）
    result.qualityBonus += method.qualityBonus;
    
    // 叠加污染修正（乘法）
    result.pollutionMultiplier *= method.pollutionMultiplier;
  }
  
  return result;
}

/**
 * 计算槽位切换的总成本
 */
export function calculateSwitchCost(currentMethods: number[], newMethods: number[]): number {
  let totalCost = 0;
  
  for (let i = 0; i < newMethods.length; i++) {
    if (currentMethods[i] !== newMethods[i]) {
      const newMethod = METHODS_BY_ID.get(newMethods[i]);
      if (newMethod) {
        totalCost += newMethod.switchCost;
      }
    }
  }
  
  return totalCost;
}

/**
 * 获取槽位切换的最长冷却时间
 */
export function getMaxSwitchCooldown(currentMethods: number[], newMethods: number[]): number {
  let maxCooldown = 0;
  
  for (let i = 0; i < newMethods.length; i++) {
    if (currentMethods[i] !== newMethods[i]) {
      const newMethod = METHODS_BY_ID.get(newMethods[i]);
      if (newMethod && newMethod.switchCooldown > maxCooldown) {
        maxCooldown = newMethod.switchCooldown;
      }
    }
  }
  
  return maxCooldown;
}

/**
 * 获取生产方式的显示信息
 */
export function getMethodDisplayInfo(methodId: number): {
  name: string;
  description: string;
  effects: string[];
  slotType: ProductionSlotType;
  requiredLevel: number;
  switchCost: number;
  switchCooldown: number;
} | null {
  const method = METHODS_BY_ID.get(methodId);
  if (!method) return null;
  
  const effects: string[] = [];
  
  // 输出效果
  for (const [, mult] of method.outputMultipliers) {
    if (mult !== 1.0) {
      const pct = ((mult - 1) * 100).toFixed(0);
      effects.push(`产出 ${mult > 1 ? '+' : ''}${pct}%`);
    }
  }
  
  // 输入效果
  for (const [, mult] of method.inputMultipliers) {
    if (mult !== 1.0) {
      const pct = ((mult - 1) * 100).toFixed(0);
      effects.push(`原料消耗 ${mult > 1 ? '+' : ''}${pct}%`);
    }
  }
  
  // 成本效果
  if (method.laborMultiplier !== 1.0) {
    const pct = ((method.laborMultiplier - 1) * 100).toFixed(0);
    effects.push(`人力成本 ${method.laborMultiplier > 1 ? '+' : ''}${pct}%`);
  }
  if (method.energyMultiplier !== 1.0) {
    const pct = ((method.energyMultiplier - 1) * 100).toFixed(0);
    effects.push(`能源成本 ${method.energyMultiplier > 1 ? '+' : ''}${pct}%`);
  }
  if (method.maintenanceMultiplier !== 1.0) {
    const pct = ((method.maintenanceMultiplier - 1) * 100).toFixed(0);
    effects.push(`维护成本 ${method.maintenanceMultiplier > 1 ? '+' : ''}${pct}%`);
  }
  
  // 品质效果
  if (method.qualityBonus !== 0) {
    const pct = (method.qualityBonus * 100).toFixed(0);
    effects.push(`品质 ${method.qualityBonus > 0 ? '+' : ''}${pct}%`);
  }
  
  // 污染效果
  if (method.pollutionMultiplier !== 1.0) {
    const pct = ((method.pollutionMultiplier - 1) * 100).toFixed(0);
    effects.push(`污染 ${method.pollutionMultiplier > 1 ? '+' : ''}${pct}%`);
  }
  
  return {
    name: method.name,
    description: method.description,
    effects,
    slotType: method.slotType,
    requiredLevel: method.requiredLevel,
    switchCost: method.switchCost,
    switchCooldown: method.switchCooldown,
  };
}

/**
 * 获取槽位类型的中文名称
 */
export function getSlotTypeName(slotType: ProductionSlotType): string {
  const names: Record<ProductionSlotType, string> = {
    'process': '生产工艺',
    'automation': '自动化程度',
    'energy': '能源供应',
    'quality': '品质控制',
    'environment': '环保措施',
  };
  return names[slotType];
}

/**
 * 获取槽位类型的图标
 */
export function getSlotTypeIcon(slotType: ProductionSlotType): string {
  const icons: Record<ProductionSlotType, string> = {
    'process': '🔧',
    'automation': '🤖',
    'energy': '⚡',
    'quality': '✨',
    'environment': '🌿',
  };
  return icons[slotType];
}

// ==================== 新建筑专属生产方式系统集成 ====================

// 导出新系统需要的类型（从types直接导入避免循环依赖）
export type {
  BuildingMethodConfig,
  BuildingSlotType as BuildingSlotTypeV2,
  BuildingProductionMethod,
  ComputedModifiers,
} from './methods/types';

// 同步导入新系统模块
import * as NewMethodsSystem from './methods';

// 新系统初始化标志
let newSystemInitialized = false;

/**
 * 初始化建筑专属生产方式系统（同步版本）
 */
export function initializeBuildingProductionMethods(): void {
  if (newSystemInitialized) {
    console.log('[ProductionMethods] 新系统已初始化');
    return;
  }
  
  try {
    NewMethodsSystem.initializeProductionMethods();
    newSystemInitialized = true;
    console.log('[ProductionMethods] 新系统初始化成功');
  } catch (e) {
    console.error('[ProductionMethods] 初始化失败:', e);
  }
}

/**
 * 同步初始化函数（兼容别名）
 */
export function initializeBuildingProductionMethodsSync(): void {
  initializeBuildingProductionMethods();
}

/**
 * 检查新系统是否已初始化
 */
export function isNewSystemInitialized(): boolean {
  return newSystemInitialized;
}

/**
 * 检查建筑是否有专属生产方式配置
 */
export function hasBuildingSpecificMethods(buildingTypeId: number): boolean {
  if (!newSystemInitialized) {
    return false;
  }
  return NewMethodsSystem.getBuildingConfig(buildingTypeId) !== null;
}

/**
 * 获取建筑的专属槽位列表
 */
export function getBuildingSpecificSlots(buildingTypeId: number): any[] {
  if (!newSystemInitialized) {
    return [];
  }
  return NewMethodsSystem.getBuildingSlots(buildingTypeId);
}

/**
 * 获取建筑槽位可用的专属生产方式
 */
export function getSlotAvailableMethods(buildingTypeId: number, slotId: string): any[] {
  if (!newSystemInitialized) {
    return [];
  }
  return NewMethodsSystem.getSlotMethods(buildingTypeId, slotId);
}

/**
 * 获取建筑的默认专属方式配置
 */
export function getBuildingDefaultMethods(buildingTypeId: number): Record<string, number> {
  if (!newSystemInitialized) {
    return {};
  }
  return NewMethodsSystem.getDefaultMethods(buildingTypeId);
}

/**
 * 获取建筑的完整配置
 */
export function getBuildingConfig(buildingTypeId: number): any {
  if (!newSystemInitialized) {
    return null;
  }
  return NewMethodsSystem.getBuildingConfig(buildingTypeId);
}

/**
 * 获取新系统的方式详情
 */
export function getMethodByIdNew(methodId: number): any {
  if (!newSystemInitialized) {
    return null;
  }
  return NewMethodsSystem.getMethodById(methodId);
}

/**
 * 获取方式详情（统一接口）
 */
export function getMethodDetails(methodId: number): {
  name: string;
  description: string;
  effects: string[];
  requiredLevel: number;
  switchCost: number;
} | null {
  // 只使用旧系统
  return getMethodDisplayInfo(methodId);
}

/**
 * 计算建筑的综合生产修正（新系统接口）
 * 优先使用新系统，回退到旧系统
 */
export function calculateBuildingModifiers(
  buildingTypeId: number,
  selectedMethods: Record<string, number>
): {
  inputMultipliers: Map<number, number>;
  outputMultipliers: Map<number, number>;
  allInputMultiplier: number;
  allOutputMultiplier: number;
  laborMultiplier: number;
  energyMultiplier: number;
  maintenanceMultiplier: number;
  qualityBonus: number;
  pollutionMultiplier: number;
  productionSpeedMultiplier: number;
  byproducts: Array<{ goodsId: number; rate: number }>;
} {
  // 优先使用新系统
  if (newSystemInitialized && hasBuildingSpecificMethods(buildingTypeId)) {
    const modifiers = NewMethodsSystem.computeModifiers(buildingTypeId, selectedMethods);
    return {
      inputMultipliers: modifiers.inputMultipliers,
      outputMultipliers: modifiers.outputMultipliers,
      allInputMultiplier: modifiers.allInputMultiplier,
      allOutputMultiplier: modifiers.allOutputMultiplier,
      laborMultiplier: modifiers.laborMultiplier,
      energyMultiplier: modifiers.energyMultiplier,
      maintenanceMultiplier: modifiers.maintenanceMultiplier,
      qualityBonus: modifiers.qualityBonus,
      pollutionMultiplier: modifiers.pollutionMultiplier,
      productionSpeedMultiplier: modifiers.productionSpeedMultiplier,
      byproducts: modifiers.byproducts.map(b => ({ goodsId: b.goodsId, rate: b.chance * b.amount })),
    };
  }
  
  // 回退到旧系统
  const methods = Object.values(selectedMethods);
  const oldModifiers = calculateProductionModifiers(methods);
  
  return {
    inputMultipliers: oldModifiers.inputMultipliers,
    outputMultipliers: oldModifiers.outputMultipliers,
    allInputMultiplier: 1.0,
    allOutputMultiplier: 1.0,
    laborMultiplier: oldModifiers.laborMultiplier,
    energyMultiplier: oldModifiers.energyMultiplier,
    maintenanceMultiplier: oldModifiers.maintenanceMultiplier,
    qualityBonus: oldModifiers.qualityBonus,
    pollutionMultiplier: oldModifiers.pollutionMultiplier,
    productionSpeedMultiplier: 1.0,
    byproducts: [],
  };
}

/**
 * 获取建筑的综合生产修正（统一接口）
 * 优先使用新系统
 */
export function getProductionModifiersForBuilding(
  buildingTypeId: number,
  selectedMethods: Record<string, number> | number[]
): ProductionModifiers {
  // 优先使用新系统
  if (newSystemInitialized && hasBuildingSpecificMethods(buildingTypeId)) {
    const methodsRecord = Array.isArray(selectedMethods)
      ? {} // 旧格式不适用于新系统
      : selectedMethods;
    
    if (!Array.isArray(selectedMethods)) {
      const modifiers = NewMethodsSystem.computeModifiers(buildingTypeId, methodsRecord);
      return {
        inputMultipliers: modifiers.inputMultipliers,
        outputMultipliers: modifiers.outputMultipliers,
        laborMultiplier: modifiers.laborMultiplier,
        energyMultiplier: modifiers.energyMultiplier,
        maintenanceMultiplier: modifiers.maintenanceMultiplier,
        qualityBonus: modifiers.qualityBonus,
        pollutionMultiplier: modifiers.pollutionMultiplier,
      };
    }
  }
  
  // 回退到旧系统
  const methods = Array.isArray(selectedMethods) ? selectedMethods : Object.values(selectedMethods);
  return calculateProductionModifiers(methods);
}