/**
 * 建筑类型定义
 * 精简版本：包含44种建筑（核心+农业+医药+奢侈品+零售）
 */

/** 零售建筑专属配置 */
export interface RetailConfig {
  maxInventorySlots: number;      // 最大库存槽位
  inventoryCapacity: number;      // 每槽位容量
  customerCapacity: number;       // 每日最大客流
  markupRange: [number, number];  // 加价率范围 [min, max]
  allowedGoodsIds: number[];      // 可销售的商品ID列表
}

export interface BuildingTypeDefinition {
  id: number;
  key: string;
  name: string;
  category: 'extraction' | 'processing' | 'manufacturing' | 'service' | 'retail';
  
  // 建造成本
  buildCost: number;
  buildTime: number;           // tick数
  
  // 运营成本
  maintenanceCost: number;     // 每日维护费
  laborCost: number;           // 人力成本/日
  energyCost: number;          // 能源成本/日
  
  // 升级
  maxLevel: number;
  upgradeCosts: number[];      // 各等级升级费用
  capacityMultipliers: number[]; // 各等级产能倍数
  efficiencyMultipliers: number[]; // 各等级效率倍数
  
  // 可用配方ID列表（生产类建筑使用）
  availableRecipes: number[];
  
  // 默认配方
  defaultRecipeId: number;
  
  description: string;
  
  // 零售建筑专属配置（仅retail类别使用）
  retailConfig?: RetailConfig;
}

// ==================== 采掘类建筑（ID 0-7）====================
const EXTRACTION_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 0,
    key: 'iron-mine',
    name: '铁矿场',
    category: 'extraction',
    buildCost: 500000,
    buildTime: 48,
    maintenanceCost: 1000,
    laborCost: 5000,
    energyCost: 2000,
    maxLevel: 5,
    upgradeCosts: [0, 200000, 400000, 800000, 1600000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [0],
    defaultRecipeId: 0,
    description: '开采铁矿石的矿场',
  },
  {
    id: 1,
    key: 'copper-mine',
    name: '铜矿场',
    category: 'extraction',
    buildCost: 600000,
    buildTime: 48,
    maintenanceCost: 1200,
    laborCost: 5500,
    energyCost: 2200,
    maxLevel: 5,
    upgradeCosts: [0, 240000, 480000, 960000, 1920000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [1],
    defaultRecipeId: 1,
    description: '开采铜矿石的矿场',
  },
  {
    id: 2,
    key: 'coal-mine',
    name: '煤矿',
    category: 'extraction',
    buildCost: 400000,
    buildTime: 36,
    maintenanceCost: 800,
    laborCost: 4000,
    energyCost: 1500,
    maxLevel: 5,
    upgradeCosts: [0, 160000, 320000, 640000, 1280000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [2],
    defaultRecipeId: 2,
    description: '开采煤炭的矿场',
  },
  {
    id: 3,
    key: 'oil-field',
    name: '油田',
    category: 'extraction',
    buildCost: 2000000,
    buildTime: 96,
    maintenanceCost: 5000,
    laborCost: 15000,
    energyCost: 8000,
    maxLevel: 5,
    upgradeCosts: [0, 800000, 1600000, 3200000, 6400000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [3],
    defaultRecipeId: 3,
    description: '开采原油的油田',
  },
  {
    id: 4,
    key: 'gas-field',
    name: '气田',
    category: 'extraction',
    buildCost: 1800000,
    buildTime: 84,
    maintenanceCost: 4500,
    laborCost: 12000,
    energyCost: 6000,
    maxLevel: 5,
    upgradeCosts: [0, 720000, 1440000, 2880000, 5760000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [4],
    defaultRecipeId: 4,
    description: '开采天然气的气田',
  },
  {
    id: 5,
    key: 'logging-camp',
    name: '伐木场',
    category: 'extraction',
    buildCost: 200000,
    buildTime: 24,
    maintenanceCost: 500,
    laborCost: 3000,
    energyCost: 1000,
    maxLevel: 5,
    upgradeCosts: [0, 80000, 160000, 320000, 640000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [5],
    defaultRecipeId: 5,
    description: '采伐木材的林场',
  },
  {
    id: 6,
    key: 'farm',
    name: '农场',
    category: 'extraction',
    buildCost: 300000,
    buildTime: 36,
    maintenanceCost: 600,
    laborCost: 4000,
    energyCost: 500,
    maxLevel: 5,
    upgradeCosts: [0, 120000, 240000, 480000, 960000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [6, 7],
    defaultRecipeId: 6,
    description: '种植粮食和棉花的农场',
  },
  {
    id: 7,
    key: 'silicon-mine',
    name: '硅石矿场',
    category: 'extraction',
    buildCost: 550000,
    buildTime: 48,
    maintenanceCost: 1100,
    laborCost: 5200,
    energyCost: 2100,
    maxLevel: 5,
    upgradeCosts: [0, 220000, 440000, 880000, 1760000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [8, 9],
    defaultRecipeId: 8,
    description: '开采硅石和稀土的矿场',
  },
];

// ==================== 加工类建筑（ID 8-15）====================
const PROCESSING_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 8,
    key: 'steel-mill',
    name: '钢铁厂',
    category: 'processing',
    buildCost: 2000000,
    buildTime: 96,
    maintenanceCost: 5000,
    laborCost: 20000,
    energyCost: 15000,
    maxLevel: 5,
    upgradeCosts: [0, 800000, 1600000, 3200000, 6400000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],
    availableRecipes: [10, 11, 78],
    defaultRecipeId: 10,
    description: '将铁矿石加工成钢材，也可冶炼铜',
  },
  {
    id: 9,
    key: 'refinery',
    name: '炼油厂',
    category: 'processing',
    buildCost: 3000000,
    buildTime: 120,
    maintenanceCost: 8000,
    laborCost: 25000,
    energyCost: 20000,
    maxLevel: 5,
    upgradeCosts: [0, 1200000, 2400000, 4800000, 9600000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [12],
    defaultRecipeId: 12,
    description: '将原油精炼成燃油和化工原料',
  },
  {
    id: 10,
    key: 'chemical-plant',
    name: '化工厂',
    category: 'processing',
    buildCost: 2500000,
    buildTime: 108,
    maintenanceCost: 6000,
    laborCost: 18000,
    energyCost: 12000,
    maxLevel: 5,
    upgradeCosts: [0, 1000000, 2000000, 4000000, 8000000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],
    availableRecipes: [13, 14, 89],
    defaultRecipeId: 13,
    description: '生产塑料、化学品和医药化工品',
  },
  {
    id: 11,
    key: 'glass-factory',
    name: '玻璃厂',
    category: 'processing',
    buildCost: 1000000,
    buildTime: 60,
    maintenanceCost: 2500,
    laborCost: 10000,
    energyCost: 8000,
    maxLevel: 5,
    upgradeCosts: [0, 400000, 800000, 1600000, 3200000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [15],
    defaultRecipeId: 15,
    description: '生产玻璃制品',
  },
  {
    id: 12,
    key: 'textile-mill',
    name: '纺织厂',
    category: 'processing',
    buildCost: 600000,
    buildTime: 48,
    maintenanceCost: 1500,
    laborCost: 8000,
    energyCost: 3000,
    maxLevel: 5,
    upgradeCosts: [0, 240000, 480000, 960000, 1920000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [16, 99],
    defaultRecipeId: 16,
    description: '将棉花加工成纺织品和丝绸',
  },
  {
    id: 13,
    key: 'food-factory',
    name: '食品厂',
    category: 'processing',
    buildCost: 700000,
    buildTime: 48,
    maintenanceCost: 1800,
    laborCost: 10000,
    energyCost: 4000,
    maxLevel: 5,
    upgradeCosts: [0, 280000, 560000, 1120000, 2240000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [17, 18, 42, 85, 86, 87, 88, 103],
    defaultRecipeId: 17,
    description: '加工食品、饮料和各类食品制品',
  },
  {
    id: 14,
    key: 'cement-factory',
    name: '水泥厂',
    category: 'processing',
    buildCost: 1200000,
    buildTime: 72,
    maintenanceCost: 3000,
    laborCost: 12000,
    energyCost: 10000,
    maxLevel: 5,
    upgradeCosts: [0, 480000, 960000, 1920000, 3840000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [19],
    defaultRecipeId: 19,
    description: '生产水泥',
  },
  {
    id: 15,
    key: 'aluminum-smelter',
    name: '铝冶炼厂',
    category: 'processing',
    buildCost: 1800000,
    buildTime: 84,
    maintenanceCost: 4500,
    laborCost: 16000,
    energyCost: 25000,
    maxLevel: 5,
    upgradeCosts: [0, 720000, 1440000, 2880000, 5760000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [20, 102],
    defaultRecipeId: 20,
    description: '将铝土矿加工成铝材',
  },
];

// ==================== 制造类建筑（ID 16-21）====================
const MANUFACTURING_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 16,
    key: 'electronics-factory',
    name: '电子厂',
    category: 'manufacturing',
    buildCost: 5000000,
    buildTime: 120,
    maintenanceCost: 12000,
    laborCost: 40000,
    energyCost: 15000,
    maxLevel: 5,
    upgradeCosts: [0, 2000000, 4000000, 8000000, 16000000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.8],
    availableRecipes: [21, 22, 23, 62, 82, 83, 84],
    defaultRecipeId: 21,
    description: '生产电子元件、消费电子和无人机',
  },
  {
    id: 17,
    key: 'semiconductor-fab',
    name: '半导体厂',
    category: 'manufacturing',
    buildCost: 20000000,
    buildTime: 240,
    maintenanceCost: 50000,
    laborCost: 100000,
    energyCost: 80000,
    maxLevel: 5,
    upgradeCosts: [0, 8000000, 16000000, 32000000, 64000000],
    capacityMultipliers: [1.0, 1.15, 1.3, 1.5, 1.8],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    availableRecipes: [24],
    defaultRecipeId: 24,
    description: '生产芯片的高科技工厂',
  },
  {
    id: 18,
    key: 'car-factory',
    name: '汽车工厂',
    category: 'manufacturing',
    buildCost: 10000000,
    buildTime: 168,
    maintenanceCost: 25000,
    laborCost: 80000,
    energyCost: 30000,
    maxLevel: 5,
    upgradeCosts: [0, 4000000, 8000000, 16000000, 32000000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    availableRecipes: [25, 26, 101],
    defaultRecipeId: 25,
    description: '组装各类汽车的大型工厂',
  },
  {
    id: 19,
    key: 'appliance-factory',
    name: '家电厂',
    category: 'manufacturing',
    buildCost: 4000000,
    buildTime: 96,
    maintenanceCost: 10000,
    laborCost: 35000,
    energyCost: 12000,
    maxLevel: 5,
    upgradeCosts: [0, 1600000, 3200000, 6400000, 12800000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [27],
    defaultRecipeId: 27,
    description: '生产家用电器',
  },
  {
    id: 20,
    key: 'battery-factory',
    name: '电池厂',
    category: 'manufacturing',
    buildCost: 8000000,
    buildTime: 144,
    maintenanceCost: 20000,
    laborCost: 50000,
    energyCost: 25000,
    maxLevel: 5,
    upgradeCosts: [0, 3200000, 6400000, 12800000, 25600000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    availableRecipes: [28, 81],
    defaultRecipeId: 28,
    description: '生产电池和储能系统',
  },
  {
    id: 21,
    key: 'parts-factory',
    name: '零部件厂',
    category: 'manufacturing',
    buildCost: 3000000,
    buildTime: 84,
    maintenanceCost: 8000,
    laborCost: 30000,
    energyCost: 10000,
    maxLevel: 5,
    upgradeCosts: [0, 1200000, 2400000, 4800000, 9600000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [29, 30, 31, 79, 80],
    defaultRecipeId: 29,
    description: '生产机械、汽车和航空零部件',
  },
];

// ==================== 服务类建筑（ID 22-24）====================
const SERVICE_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 22,
    key: 'logistics-center',
    name: '物流中心',
    category: 'service',
    buildCost: 1500000,
    buildTime: 60,
    maintenanceCost: 4000,
    laborCost: 15000,
    energyCost: 5000,
    maxLevel: 5,
    upgradeCosts: [0, 600000, 1200000, 2400000, 4800000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '提供物流配送服务，降低运输成本',
  },
  {
    id: 23,
    key: 'warehouse',
    name: '仓储中心',
    category: 'service',
    buildCost: 800000,
    buildTime: 48,
    maintenanceCost: 2000,
    laborCost: 8000,
    energyCost: 3000,
    maxLevel: 5,
    upgradeCosts: [0, 320000, 640000, 1280000, 2560000],
    capacityMultipliers: [1.0, 1.5, 2.0, 3.0, 4.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '增加库存容量',
  },
  {
    id: 24,
    key: 'power-plant',
    name: '发电厂',
    category: 'service',
    buildCost: 5000000,
    buildTime: 144,
    maintenanceCost: 15000,
    laborCost: 30000,
    energyCost: 0,
    maxLevel: 5,
    upgradeCosts: [0, 2000000, 4000000, 8000000, 16000000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [32, 33, 34],
    defaultRecipeId: 32,
    description: '发电供应工厂和市场',
  },
];

// ==================== 农业产业链建筑（ID 25-28）====================
const AGRICULTURE_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 25,
    key: 'vegetable-farm',
    name: '蔬菜农场',
    category: 'extraction',
    buildCost: 250000,
    buildTime: 36,
    maintenanceCost: 500,
    laborCost: 3500,
    energyCost: 400,
    maxLevel: 5,
    upgradeCosts: [0, 100000, 200000, 400000, 800000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [35, 36],
    defaultRecipeId: 35,
    description: '种植蔬菜和水果的现代化农场',
  },
  {
    id: 26,
    key: 'livestock-farm',
    name: '畜牧场',
    category: 'extraction',
    buildCost: 600000,
    buildTime: 60,
    maintenanceCost: 1500,
    laborCost: 8000,
    energyCost: 1200,
    maxLevel: 5,
    upgradeCosts: [0, 240000, 480000, 960000, 1920000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [37, 38],
    defaultRecipeId: 37,
    description: '养殖牲畜和家禽的大型农场',
  },
  {
    id: 27,
    key: 'fishery',
    name: '渔场',
    category: 'extraction',
    buildCost: 400000,
    buildTime: 48,
    maintenanceCost: 1000,
    laborCost: 6000,
    energyCost: 800,
    maxLevel: 5,
    upgradeCosts: [0, 160000, 320000, 640000, 1280000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [39],
    defaultRecipeId: 39,
    description: '水产养殖和捕捞基地',
  },
  {
    id: 28,
    key: 'meat-processing',
    name: '肉类加工厂',
    category: 'processing',
    buildCost: 800000,
    buildTime: 60,
    maintenanceCost: 2000,
    laborCost: 12000,
    energyCost: 5000,
    maxLevel: 5,
    upgradeCosts: [0, 320000, 640000, 1280000, 2560000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [40, 41],
    defaultRecipeId: 40,
    description: '肉类加工和乳制品生产',
  },
];

// ==================== 医药产业链建筑（ID 29-31）====================
const PHARMA_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 29,
    key: 'herb-farm',
    name: '药材种植园',
    category: 'extraction',
    buildCost: 400000,
    buildTime: 48,
    maintenanceCost: 800,
    laborCost: 5000,
    energyCost: 600,
    maxLevel: 5,
    upgradeCosts: [0, 160000, 320000, 640000, 1280000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [43],
    defaultRecipeId: 43,
    description: '种植中草药的专业种植园',
  },
  {
    id: 30,
    key: 'pharma-factory',
    name: '制药厂',
    category: 'manufacturing',
    buildCost: 8000000,
    buildTime: 144,
    maintenanceCost: 20000,
    laborCost: 60000,
    energyCost: 25000,
    maxLevel: 5,
    upgradeCosts: [0, 3200000, 6400000, 12800000, 25600000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    availableRecipes: [44, 45, 46, 90, 91],
    defaultRecipeId: 44,
    description: '生产各类药品的现代化制药工厂',
  },
  {
    id: 31,
    key: 'medical-device-factory',
    name: '医疗器械厂',
    category: 'manufacturing',
    buildCost: 12000000,
    buildTime: 180,
    maintenanceCost: 30000,
    laborCost: 80000,
    energyCost: 35000,
    maxLevel: 5,
    upgradeCosts: [0, 4800000, 9600000, 19200000, 38400000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.6, 1.9],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [47, 48, 92, 104],
    defaultRecipeId: 47,
    description: '生产医疗设备和耗材的高科技工厂',
  },
];

// ==================== 补全产业链建筑（ID 32-34）====================
// 使用原军工产业链删除后的空位
const SUPPLEMENTARY_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 32,
    key: 'rubber-plantation',
    name: '橡胶园',
    category: 'extraction',
    buildCost: 350000,
    buildTime: 48,
    maintenanceCost: 700,
    laborCost: 4500,
    energyCost: 600,
    maxLevel: 5,
    upgradeCosts: [0, 140000, 280000, 560000, 1120000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [106],  // 天然橡胶采集
    defaultRecipeId: 106,
    description: '种植和采集天然橡胶的种植园',
  },
  {
    id: 33,
    key: 'lithium-mine',
    name: '锂矿场',
    category: 'extraction',
    buildCost: 800000,
    buildTime: 72,
    maintenanceCost: 2000,
    laborCost: 7000,
    energyCost: 3000,
    maxLevel: 5,
    upgradeCosts: [0, 320000, 640000, 1280000, 2560000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [107],  // 锂矿开采
    defaultRecipeId: 107,
    description: '开采电池生产所需锂矿的矿场',
  },
  {
    id: 34,
    key: 'paper-mill',
    name: '造纸厂',
    category: 'processing',
    buildCost: 500000,
    buildTime: 48,
    maintenanceCost: 1200,
    laborCost: 6000,
    energyCost: 3000,
    maxLevel: 5,
    upgradeCosts: [0, 200000, 400000, 800000, 1600000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [66, 67],  // 纸张生产、包装材料生产
    defaultRecipeId: 66,
    description: '将木材加工成纸张和包装材料',
  },
];

// ==================== 奢侈品产业链建筑（ID 35-36）====================
const LUXURY_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 35,
    key: 'gold-mine',
    name: '金矿',
    category: 'extraction',
    buildCost: 10000000,
    buildTime: 120,
    maintenanceCost: 25000,
    laborCost: 40000,
    energyCost: 20000,
    maxLevel: 5,
    upgradeCosts: [0, 4000000, 8000000, 16000000, 32000000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.6, 1.9],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [54, 55, 97],
    defaultRecipeId: 54,
    description: '开采和精炼贵金属和钻石的矿场',
  },
  {
    id: 36,
    key: 'luxury-factory',
    name: '奢侈品工坊',
    category: 'manufacturing',
    buildCost: 15000000,
    buildTime: 180,
    maintenanceCost: 40000,
    laborCost: 100000,
    energyCost: 15000,
    maxLevel: 5,
    upgradeCosts: [0, 6000000, 12000000, 24000000, 48000000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.6, 1.9],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    availableRecipes: [56, 57, 98, 100, 105],
    defaultRecipeId: 56,
    description: '手工制作高端奢侈品的精品工坊',
  },
];

// ==================== 零售类建筑（ID 49-58）====================
// 注意：ID 37-48 跳过（原科技/扩展产业链已删除）
const RETAIL_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 49,
    key: 'convenience-store',
    name: '便利店',
    category: 'retail',
    buildCost: 100000,
    buildTime: 12,
    maintenanceCost: 500,
    laborCost: 3000,
    energyCost: 800,
    maxLevel: 5,
    upgradeCosts: [0, 40000, 80000, 160000, 320000],
    capacityMultipliers: [1.0, 1.5, 2.0, 2.8, 4.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '24小时营业的小型零售店，销售食品和日用品',
    retailConfig: {
      maxInventorySlots: 20,
      inventoryCapacity: 1000,
      customerCapacity: 2000,
      markupRange: [0.15, 0.30],
      // 便利店：食品、日用品（ID24已删除，使用44食品替代）
      allowedGoodsIds: [8, 44, 45, 67, 74, 76],
    },
  },
  {
    id: 50,
    key: 'supermarket',
    name: '超市',
    category: 'retail',
    buildCost: 500000,
    buildTime: 36,
    maintenanceCost: 2000,
    laborCost: 15000,
    energyCost: 3000,
    maxLevel: 5,
    upgradeCosts: [0, 200000, 400000, 800000, 1600000],
    capacityMultipliers: [1.0, 1.4, 1.9, 2.5, 3.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '中型综合零售店，商品种类丰富',
    retailConfig: {
      maxInventorySlots: 50,
      inventoryCapacity: 5000,
      customerCapacity: 8000,
      markupRange: [0.10, 0.25],
      // 超市：全品类食品、日用品、生鲜（ID24已删除）
      allowedGoodsIds: [
        8, 44, 45, 43, 46, 67, 68, 69, 63, 64, 65, 66, 74, 76,
        58, 59, 62,      // 生鲜：蔬菜、水果、水产
      ],
    },
  },
  {
    id: 51,
    key: 'hypermarket',
    name: '大卖场',
    category: 'retail',
    buildCost: 2000000,
    buildTime: 72,
    maintenanceCost: 8000,
    laborCost: 50000,
    energyCost: 15000,
    maxLevel: 5,
    upgradeCosts: [0, 800000, 1600000, 3200000, 6400000],
    capacityMultipliers: [1.0, 1.3, 1.7, 2.2, 3.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '大型综合卖场，全品类商品一站式购物',
    retailConfig: {
      maxInventorySlots: 100,
      inventoryCapacity: 20000,
      customerCapacity: 30000,
      markupRange: [0.05, 0.20],
      // 大卖场：全品类一站式购物（ID24和38已删除）
      allowedGoodsIds: [
        8, 44, 45, 43, 46, 67, 68, 69, 63, 64, 65, 66, 40, 55, 56, 74, 76, 25,
        58, 59, 62,      // 生鲜：蔬菜、水果、水产
      ],
    },
  },
  {
    id: 52,
    key: 'electronics-store',
    name: '电子商城',
    category: 'retail',
    buildCost: 800000,
    buildTime: 48,
    maintenanceCost: 3000,
    laborCost: 20000,
    energyCost: 5000,
    maxLevel: 5,
    upgradeCosts: [0, 320000, 640000, 1280000, 2560000],
    capacityMultipliers: [1.0, 1.4, 1.8, 2.3, 3.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '专业电子产品零售店，销售手机、电脑、家电',
    retailConfig: {
      maxInventorySlots: 30,
      inventoryCapacity: 500,
      customerCapacity: 4000,
      markupRange: [0.08, 0.20],
      // 电子商城：手机、电脑、家电、无人机（ID38已删除）
      allowedGoodsIds: [39, 40, 55, 56, 52],
    },
  },
  {
    id: 53,
    key: 'car-dealership',
    name: '汽车4S店',
    category: 'retail',
    buildCost: 5000000,
    buildTime: 96,
    maintenanceCost: 15000,
    laborCost: 60000,
    energyCost: 8000,
    maxLevel: 5,
    upgradeCosts: [0, 2000000, 4000000, 8000000, 16000000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '汽车销售和服务中心',
    retailConfig: {
      maxInventorySlots: 20,
      inventoryCapacity: 100,
      customerCapacity: 200,
      markupRange: [0.05, 0.15],
      allowedGoodsIds: [41, 42, 95],
    },
  },
  {
    id: 54,
    key: 'clothing-store',
    name: '服装店',
    category: 'retail',
    buildCost: 300000,
    buildTime: 24,
    maintenanceCost: 1200,
    laborCost: 8000,
    energyCost: 1500,
    maxLevel: 5,
    upgradeCosts: [0, 120000, 240000, 480000, 960000],
    capacityMultipliers: [1.0, 1.5, 2.0, 2.8, 4.0],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '服装和时尚用品零售店',
    retailConfig: {
      maxInventorySlots: 40,
      inventoryCapacity: 2000,
      customerCapacity: 3000,
      markupRange: [0.30, 0.60],
      allowedGoodsIds: [43, 23],
    },
  },
  {
    id: 55,
    key: 'luxury-boutique',
    name: '奢侈品店',
    category: 'retail',
    buildCost: 3000000,
    buildTime: 60,
    maintenanceCost: 10000,
    laborCost: 40000,
    energyCost: 5000,
    maxLevel: 5,
    upgradeCosts: [0, 1200000, 2400000, 4800000, 9600000],
    capacityMultipliers: [1.0, 1.2, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '高端奢侈品专卖店',
    retailConfig: {
      maxInventorySlots: 15,
      inventoryCapacity: 200,
      customerCapacity: 400,
      markupRange: [0.50, 1.00],
      // 奢侈品店：珠宝、设计师服装、腕表、豪华车（ID53已删除）
      allowedGoodsIds: [54, 94, 93, 95],
    },
  },
  {
    id: 56,
    key: 'pharmacy',
    name: '药店',
    category: 'retail',
    buildCost: 200000,
    buildTime: 18,
    maintenanceCost: 800,
    laborCost: 6000,
    energyCost: 1000,
    maxLevel: 5,
    upgradeCosts: [0, 80000, 160000, 320000, 640000],
    capacityMultipliers: [1.0, 1.4, 1.9, 2.5, 3.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '药品和医疗用品零售店',
    retailConfig: {
      maxInventorySlots: 30,
      inventoryCapacity: 3000,
      customerCapacity: 2500,
      markupRange: [0.20, 0.40],
      allowedGoodsIds: [74, 75, 76, 77],
    },
  },
  {
    id: 57,
    key: 'gas-station',
    name: '加油站',
    category: 'retail',
    buildCost: 800000,
    buildTime: 36,
    maintenanceCost: 2000,
    laborCost: 8000,
    energyCost: 3000,
    maxLevel: 5,
    upgradeCosts: [0, 320000, 640000, 1280000, 2560000],
    capacityMultipliers: [1.0, 1.5, 2.0, 2.8, 4.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '燃油零售站点',
    retailConfig: {
      maxInventorySlots: 5,
      inventoryCapacity: 50000,
      customerCapacity: 1500,
      markupRange: [0.05, 0.10],
      allowedGoodsIds: [25, 57],
    },
  },
  {
    id: 58,
    key: 'furniture-mall',
    name: '家居商城',
    category: 'retail',
    buildCost: 1500000,
    buildTime: 60,
    maintenanceCost: 5000,
    laborCost: 25000,
    energyCost: 8000,
    maxLevel: 5,
    upgradeCosts: [0, 600000, 1200000, 2400000, 4800000],
    capacityMultipliers: [1.0, 1.3, 1.7, 2.2, 3.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    availableRecipes: [],
    defaultRecipeId: -1,
    description: '家具和家居用品商城',
    retailConfig: {
      maxInventorySlots: 60,
      inventoryCapacity: 1000,
      customerCapacity: 2000,
      markupRange: [0.15, 0.35],
      allowedGoodsIds: [46, 47, 40],
    },
  },
];

// 合并所有建筑（精简版本：47种建筑，补全了3个缺失建筑）
export const ALL_BUILDINGS: BuildingTypeDefinition[] = [
  ...EXTRACTION_BUILDINGS,
  ...PROCESSING_BUILDINGS,
  ...MANUFACTURING_BUILDINGS,
  ...SERVICE_BUILDINGS,
  ...AGRICULTURE_BUILDINGS,
  ...PHARMA_BUILDINGS,
  ...SUPPLEMENTARY_BUILDINGS,
  ...LUXURY_BUILDINGS,
  ...RETAIL_BUILDINGS,
];

// 导出零售建筑列表供零售系统使用
export const RETAIL_BUILDINGS_LIST = ALL_BUILDINGS.filter(b => b.category === 'retail');

// 向后兼容：保持原有导出名
export { RETAIL_BUILDINGS };

// 建筑ID到定义的映射
export const BUILDINGS_BY_ID: Map<number, BuildingTypeDefinition> = new Map(
  ALL_BUILDINGS.map(b => [b.id, b])
);

// 建筑Key到定义的映射
export const BUILDINGS_BY_KEY: Map<string, BuildingTypeDefinition> = new Map(
  ALL_BUILDINGS.map(b => [b.key, b])
);

// 按类别分组（动态计算）
export const BUILDINGS_BY_CATEGORY = {
  extraction: ALL_BUILDINGS.filter(b => b.category === 'extraction'),
  processing: ALL_BUILDINGS.filter(b => b.category === 'processing'),
  manufacturing: ALL_BUILDINGS.filter(b => b.category === 'manufacturing'),
  service: ALL_BUILDINGS.filter(b => b.category === 'service'),
  retail: ALL_BUILDINGS.filter(b => b.category === 'retail'),
};

// 按产业链分组
export const BUILDINGS_BY_INDUSTRY = {
  core: [...EXTRACTION_BUILDINGS, ...PROCESSING_BUILDINGS, ...MANUFACTURING_BUILDINGS, ...SERVICE_BUILDINGS],
  agriculture: AGRICULTURE_BUILDINGS,
  pharma: PHARMA_BUILDINGS,
  luxury: LUXURY_BUILDINGS,
  retail: RETAIL_BUILDINGS,
};

/**
 * 检查建筑是否为零售类
 */
export function isRetailBuilding(buildingTypeId: number): boolean {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  return building?.category === 'retail';
}

/**
 * 获取零售建筑配置
 */
export function getRetailConfig(buildingTypeId: number): RetailConfig | undefined {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  return building?.retailConfig;
}

/**
 * 获取建筑名称
 */
export function getBuildingName(buildingTypeId: number): string {
  return BUILDINGS_BY_ID.get(buildingTypeId)?.name ?? `未知建筑(${buildingTypeId})`;
}

/**
 * 计算建筑升级后的产能
 */
export function getBuildingCapacity(buildingTypeId: number, level: number): number {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  if (!building) return 1;
  const idx = Math.min(level - 1, building.capacityMultipliers.length - 1);
  return building.capacityMultipliers[idx];
}

/**
 * 计算建筑升级后的效率
 */
export function getBuildingEfficiency(buildingTypeId: number, level: number): number {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  if (!building) return 1;
  const idx = Math.min(level - 1, building.efficiencyMultipliers.length - 1);
  return building.efficiencyMultipliers[idx];
}

/**
 * 获取建筑总数
 */
export const BUILDING_COUNT = ALL_BUILDINGS.length; // 47