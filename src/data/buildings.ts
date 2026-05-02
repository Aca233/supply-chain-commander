/**
 * 建筑类型定义
 * 重构版本：包含40种建筑（ID 0-39，连续无跳跃）
 * 分类：采掘15 + 加工12 + 制造10 + 奢侈品2 + 服务1
 * 所有建筑消耗电力（发电厂除外）
 * 
 * 重构：删除配方机制，将生产属性直接内置到建筑定义中
 */

import { GoodsId } from './goods';

/** 零售建筑专属配置 */
export interface RetailConfig {
  maxInventorySlots: number;
  inventoryCapacity: number;
  customerCapacity: number;
  markupRange: [number, number];
  allowedGoodsIds: number[];
}

export interface BuildingTypeDefinition {
  id: number;
  key: string;
  name: string;
  category: 'extraction' | 'processing' | 'manufacturing' | 'luxury' | 'service' | 'retail';
  
  // 建造成本
  buildCost: number;
  buildTime: number;
  
  // 运营成本
  maintenanceCost: number;
  laborCost: number;
  energyCost: number;
  
  // 电力消耗（每tick）
  powerConsumption: number;
  
  // 升级
  maxLevel: number;
  upgradeCosts: number[];
  capacityMultipliers: number[];
  efficiencyMultipliers: number[];

  description: string;
  
  // 零售建筑专属配置
  retailConfig?: RetailConfig;
}

// ==================== 采掘类建筑（ID 0-14，共15种）====================
const EXTRACTION_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 0,
    key: 'iron_mine',
    name: '铁矿场',
    category: 'extraction',
    buildCost: 500000,
    buildTime: 48,
    maintenanceCost: 1000,
    laborCost: 5000,
    energyCost: 2000,
    powerConsumption: 15,
    maxLevel: 5,
    upgradeCosts: [0, 200000, 400000, 800000, 1600000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采铁矿石的矿场',
  },
  {
    id: 1,
    key: 'copper_mine',
    name: '铜矿场',
    category: 'extraction',
    buildCost: 600000,
    buildTime: 48,
    maintenanceCost: 1200,
    laborCost: 5500,
    energyCost: 2200,
    powerConsumption: 18,
    maxLevel: 5,
    upgradeCosts: [0, 240000, 480000, 960000, 1920000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采铜矿石的矿场',
  },
  {
    id: 2,
    key: 'aluminum_mine',
    name: '铝矿场',
    category: 'extraction',
    buildCost: 550000,
    buildTime: 48,
    maintenanceCost: 1100,
    laborCost: 5200,
    energyCost: 2100,
    powerConsumption: 20,
    maxLevel: 5,
    upgradeCosts: [0, 220000, 440000, 880000, 1760000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采铝土矿的矿场',
  },
  {
    id: 3,
    key: 'coal_mine',
    name: '煤矿',
    category: 'extraction',
    buildCost: 650000,
    buildTime: 42,
    maintenanceCost: 1500,
    laborCost: 9000,
    energyCost: 2500,
    powerConsumption: 18,
    maxLevel: 5,
    upgradeCosts: [0, 260000, 520000, 1040000, 2080000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采煤炭的矿场',
  },
  {
    id: 4,
    key: 'oil_field',
    name: '油田',
    category: 'extraction',
    buildCost: 3500000,
    buildTime: 120,
    maintenanceCost: 9000,
    laborCost: 22000,
    energyCost: 15000,
    powerConsumption: 42,
    maxLevel: 5,
    upgradeCosts: [0, 1400000, 2800000, 5600000, 11200000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采原油的油田',
  },
  {
    id: 5,
    key: 'gas_field',
    name: '气田',
    category: 'extraction',
    buildCost: 3000000,
    buildTime: 108,
    maintenanceCost: 7500,
    laborCost: 18000,
    energyCost: 11000,
    powerConsumption: 36,
    maxLevel: 5,
    upgradeCosts: [0, 1200000, 2400000, 4800000, 9600000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采天然气的气田',
  },
  {
    id: 6,
    key: 'silicon_mine',
    name: '硅矿场',
    category: 'extraction',
    buildCost: 550000,
    buildTime: 48,
    maintenanceCost: 1100,
    laborCost: 5200,
    energyCost: 2100,
    powerConsumption: 18,
    maxLevel: 5,
    upgradeCosts: [0, 220000, 440000, 880000, 1760000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采硅石的矿场',
  },
  {
    id: 7,
    key: 'lithium_mine',
    name: '锂矿场',
    category: 'extraction',
    buildCost: 800000,
    buildTime: 72,
    maintenanceCost: 2000,
    laborCost: 7000,
    energyCost: 3000,
    powerConsumption: 30,
    maxLevel: 5,
    upgradeCosts: [0, 320000, 640000, 1280000, 2560000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采锂矿的矿场',
  },
  {
    id: 8,
    key: 'rare_earth_mine',
    name: '稀土矿',
    category: 'extraction',
    buildCost: 1200000,
    buildTime: 84,
    maintenanceCost: 3000,
    laborCost: 9000,
    energyCost: 4000,
    powerConsumption: 35,
    maxLevel: 5,
    upgradeCosts: [0, 480000, 960000, 1920000, 3840000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采稀土矿的矿场',
  },
  {
    id: 9,
    key: 'logging_camp',
    name: '伐木场',
    category: 'extraction',
    buildCost: 200000,
    buildTime: 24,
    maintenanceCost: 500,
    laborCost: 3000,
    energyCost: 1000,
    powerConsumption: 8,
    maxLevel: 5,
    upgradeCosts: [0, 80000, 160000, 320000, 640000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '采伐木材的林场',
  },
  {
    id: 10,
    key: 'farm',
    name: '农场',
    category: 'extraction',
    buildCost: 300000,
    buildTime: 36,
    maintenanceCost: 600,
    laborCost: 4000,
    energyCost: 500,
    powerConsumption: 5,
    maxLevel: 5,
    upgradeCosts: [0, 120000, 240000, 480000, 960000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '种植粮食和棉花的农场',
  },
  {
    id: 11,
    key: 'rubber_plantation',
    name: '橡胶园',
    category: 'extraction',
    buildCost: 350000,
    buildTime: 48,
    maintenanceCost: 700,
    laborCost: 4500,
    energyCost: 600,
    powerConsumption: 6,
    maxLevel: 5,
    upgradeCosts: [0, 140000, 280000, 560000, 1120000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '种植和采集天然橡胶的种植园',
  },
  {
    id: 12,
    key: 'livestock_farm',
    name: '畜牧场',
    category: 'extraction',
    buildCost: 600000,
    buildTime: 60,
    maintenanceCost: 1500,
    laborCost: 8000,
    energyCost: 1200,
    powerConsumption: 10,
    maxLevel: 5,
    upgradeCosts: [0, 240000, 480000, 960000, 1920000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '养殖牲畜的大型农场',
  },
  {
    id: 13,
    key: 'fishery',
    name: '渔场',
    category: 'extraction',
    buildCost: 400000,
    buildTime: 48,
    maintenanceCost: 1000,
    laborCost: 6000,
    energyCost: 800,
    powerConsumption: 12,
    maxLevel: 5,
    upgradeCosts: [0, 160000, 320000, 640000, 1280000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '水产养殖和捕捞基地',
  },
  {
    id: 14,
    key: 'herb_farm',
    name: '药材园',
    category: 'extraction',
    buildCost: 400000,
    buildTime: 48,
    maintenanceCost: 800,
    laborCost: 5000,
    energyCost: 600,
    powerConsumption: 8,
    maxLevel: 5,
    upgradeCosts: [0, 160000, 320000, 640000, 1280000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '种植中草药的专业种植园',
  },
];

// ==================== 加工类建筑（ID 15-26，共12种）====================
const PROCESSING_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 15,
    key: 'steel_mill',
    name: '钢铁厂',
    category: 'processing',
    buildCost: 6500000,
    buildTime: 132,
    maintenanceCost: 18000,
    laborCost: 48000,
    energyCost: 42000,
    powerConsumption: 150,
    maxLevel: 5,
    upgradeCosts: [0, 2600000, 5200000, 10400000, 20800000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '将铁矿石加工成钢材',
  },
  {
    id: 16,
    key: 'non_ferrous_smelter',
    name: '有色金属冶炼厂',
    category: 'processing',
    buildCost: 1800000,
    buildTime: 84,
    maintenanceCost: 4500,
    laborCost: 16000,
    energyCost: 25000,
    powerConsumption: 90,
    maxLevel: 5,
    upgradeCosts: [0, 720000, 1440000, 2880000, 5760000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '冶炼铜材和铝材',
  },
  {
    id: 17,
    key: 'refinery',
    name: '炼油厂',
    category: 'processing',
    buildCost: 9000000,
    buildTime: 168,
    maintenanceCost: 22000,
    laborCost: 52000,
    energyCost: 48000,
    powerConsumption: 125,
    maxLevel: 5,
    upgradeCosts: [0, 3600000, 7200000, 14400000, 28800000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '将原油精炼成燃油和塑料',
  },
  {
    id: 18,
    key: 'chemical_plant',
    name: '化工厂',
    category: 'processing',
    buildCost: 5500000,
    buildTime: 144,
    maintenanceCost: 15000,
    laborCost: 34000,
    energyCost: 28000,
    powerConsumption: 100,
    maxLevel: 5,
    upgradeCosts: [0, 2200000, 4400000, 8800000, 17600000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产化学品和橡胶制品',
  },
  {
    id: 19,
    key: 'glass_factory',
    name: '玻璃厂',
    category: 'processing',
    buildCost: 2200000,
    buildTime: 72,
    maintenanceCost: 5000,
    laborCost: 16000,
    energyCost: 18000,
    powerConsumption: 70,
    maxLevel: 5,
    upgradeCosts: [0, 880000, 1760000, 3520000, 7040000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产玻璃制品',
  },
  {
    id: 20,
    key: 'cement_factory',
    name: '水泥厂',
    category: 'processing',
    buildCost: 2800000,
    buildTime: 84,
    maintenanceCost: 6500,
    laborCost: 19000,
    energyCost: 23000,
    powerConsumption: 85,
    maxLevel: 5,
    upgradeCosts: [0, 1120000, 2240000, 4480000, 8960000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产水泥',
  },
  {
    id: 21,
    key: 'paper_mill',
    name: '造纸厂',
    category: 'processing',
    buildCost: 500000,
    buildTime: 48,
    maintenanceCost: 1200,
    laborCost: 6000,
    energyCost: 3000,
    powerConsumption: 35,
    maxLevel: 5,
    upgradeCosts: [0, 200000, 400000, 800000, 1600000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '将木材加工成纸张',
  },
  {
    id: 22,
    key: 'textile_mill',
    name: '纺织厂',
    category: 'processing',
    buildCost: 600000,
    buildTime: 48,
    maintenanceCost: 1500,
    laborCost: 8000,
    energyCost: 3000,
    powerConsumption: 25,
    maxLevel: 5,
    upgradeCosts: [0, 240000, 480000, 960000, 1920000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '将棉花加工成纺织品和丝绸',
  },
  {
    id: 23,
    key: 'food_factory',
    name: '食品厂',
    category: 'processing',
    buildCost: 1000000,
    buildTime: 54,
    maintenanceCost: 2500,
    laborCost: 13000,
    energyCost: 5000,
    powerConsumption: 24,
    maxLevel: 5,
    upgradeCosts: [0, 400000, 800000, 1600000, 3200000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '加工各类食品',
  },
  {
    id: 24,
    key: 'meat_processing',
    name: '肉类加工厂',
    category: 'processing',
    buildCost: 800000,
    buildTime: 60,
    maintenanceCost: 2000,
    laborCost: 12000,
    energyCost: 5000,
    powerConsumption: 30,
    maxLevel: 5,
    upgradeCosts: [0, 320000, 640000, 1280000, 2560000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '肉类加工和冷冻食品生产',
  },
  {
    id: 25,
    key: 'dairy_factory',
    name: '乳品厂',
    category: 'processing',
    buildCost: 700000,
    buildTime: 48,
    maintenanceCost: 1800,
    laborCost: 10000,
    energyCost: 4500,
    powerConsumption: 28,
    maxLevel: 5,
    upgradeCosts: [0, 280000, 560000, 1120000, 2240000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '乳制品生产工厂',
  },
  {
    id: 26,
    key: 'building_materials_factory',
    name: '建材厂',
    category: 'processing',
    buildCost: 2100000,
    buildTime: 72,
    maintenanceCost: 5000,
    laborCost: 18000,
    energyCost: 12000,
    powerConsumption: 60,
    maxLevel: 5,
    upgradeCosts: [0, 840000, 1680000, 3360000, 6720000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产建筑材料和包装材料',
  },
];

// ==================== 制造类建筑（ID 27-36，共10种）====================
const MANUFACTURING_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 27,
    key: 'electronics_factory',
    name: '电子厂',
    category: 'manufacturing',
    buildCost: 6500000,
    buildTime: 132,
    maintenanceCost: 16000,
    laborCost: 52000,
    energyCost: 20000,
    powerConsumption: 60,
    maxLevel: 5,
    upgradeCosts: [0, 2600000, 5200000, 10400000, 20800000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产电子元件、手机、电脑、无人机',
  },
  {
    id: 28,
    key: 'semiconductor_fab',
    name: '半导体厂',
    category: 'manufacturing',
    buildCost: 35000000,
    buildTime: 300,
    maintenanceCost: 85000,
    laborCost: 150000,
    energyCost: 140000,
    powerConsumption: 180,
    maxLevel: 5,
    upgradeCosts: [0, 14000000, 28000000, 56000000, 112000000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产芯片的高科技工厂',
  },
  {
    id: 29,
    key: 'battery_factory',
    name: '电池厂',
    category: 'manufacturing',
    buildCost: 8000000,
    buildTime: 144,
    maintenanceCost: 20000,
    laborCost: 50000,
    energyCost: 25000,
    powerConsumption: 70,
    maxLevel: 5,
    upgradeCosts: [0, 3200000, 6400000, 12800000, 25600000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产电池、储能系统和光伏系统',
  },
  {
    id: 30,
    key: 'parts_factory',
    name: '零部件厂',
    category: 'manufacturing',
    buildCost: 4500000,
    buildTime: 108,
    maintenanceCost: 12000,
    laborCost: 40000,
    energyCost: 18000,
    powerConsumption: 70,
    maxLevel: 5,
    upgradeCosts: [0, 1800000, 3600000, 7200000, 14400000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产电机、屏幕、汽车零件、机械部件等',
  },
  {
    id: 31,
    key: 'car_factory',
    name: '汽车工厂',
    category: 'manufacturing',
    buildCost: 15000000,
    buildTime: 192,
    maintenanceCost: 34000,
    laborCost: 98000,
    energyCost: 42000,
    powerConsumption: 110,
    maxLevel: 5,
    upgradeCosts: [0, 6000000, 12000000, 24000000, 48000000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '组装燃油汽车、电动汽车和豪华汽车',
  },
  {
    id: 32,
    key: 'appliance_factory',
    name: '家电厂',
    category: 'manufacturing',
    buildCost: 5500000,
    buildTime: 108,
    maintenanceCost: 15000,
    laborCost: 46000,
    energyCost: 18000,
    powerConsumption: 60,
    maxLevel: 5,
    upgradeCosts: [0, 2200000, 4400000, 8800000, 17600000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产家用电器',
  },
  {
    id: 33,
    key: 'furniture_factory',
    name: '家具厂',
    category: 'manufacturing',
    buildCost: 1500000,
    buildTime: 60,
    maintenanceCost: 4000,
    laborCost: 15000,
    energyCost: 5000,
    powerConsumption: 25,
    maxLevel: 5,
    upgradeCosts: [0, 600000, 1200000, 2400000, 4800000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产家具和服装',
  },
  {
    id: 34,
    key: 'new_energy_factory',
    name: '新能源厂',
    category: 'manufacturing',
    buildCost: 6000000,
    buildTime: 120,
    maintenanceCost: 15000,
    laborCost: 45000,
    energyCost: 18000,
    powerConsumption: 55,
    maxLevel: 5,
    upgradeCosts: [0, 2400000, 4800000, 9600000, 19200000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产光伏板、风机叶片和工业机器人',
  },
  {
    id: 35,
    key: 'pharma_factory',
    name: '制药厂',
    category: 'manufacturing',
    buildCost: 10500000,
    buildTime: 168,
    maintenanceCost: 26000,
    laborCost: 78000,
    energyCost: 32000,
    powerConsumption: 90,
    maxLevel: 5,
    upgradeCosts: [0, 4200000, 8400000, 16800000, 33600000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产各类药品',
  },
  {
    id: 36,
    key: 'medical_device_factory',
    name: '医疗器械厂',
    category: 'manufacturing',
    buildCost: 12000000,
    buildTime: 180,
    maintenanceCost: 30000,
    laborCost: 80000,
    energyCost: 35000,
    powerConsumption: 50,
    maxLevel: 5,
    upgradeCosts: [0, 4800000, 9600000, 19200000, 38400000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '生产医疗设备和医用耗材',
  },
];

// ==================== 奢侈品建筑（ID 37-38，共2种）====================
const LUXURY_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 37,
    key: 'gold_refinery',
    name: '金矿/黄金精炼',
    category: 'luxury',
    buildCost: 10000000,
    buildTime: 120,
    maintenanceCost: 25000,
    laborCost: 40000,
    energyCost: 20000,
    powerConsumption: 65,
    maxLevel: 5,
    upgradeCosts: [0, 4000000, 8000000, 16000000, 32000000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '开采和精炼贵金属和钻石',
  },
  {
    id: 38,
    key: 'luxury_workshop',
    name: '奢侈品工坊',
    category: 'luxury',
    buildCost: 15000000,
    buildTime: 180,
    maintenanceCost: 40000,
    laborCost: 100000,
    energyCost: 15000,
    powerConsumption: 15,
    maxLevel: 5,
    upgradeCosts: [0, 6000000, 12000000, 24000000, 48000000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '手工制作珠宝、腕表、设计师服装',
  },
];

// ==================== 服务类建筑（ID 39，共1种）====================
const SERVICE_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 39,
    key: 'power_plant',
    name: '发电厂',
    category: 'service',
    buildCost: 12000000,
    buildTime: 192,
    maintenanceCost: 28000,
    laborCost: 50000,
    energyCost: 0,
    powerConsumption: 0,  // 发电厂不消耗电力
    maxLevel: 5,
    upgradeCosts: [0, 4800000, 9600000, 19200000, 38400000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    description: '发电供应工厂和市场',
  },
];

// ==================== 零售类建筑（ID 40-49，共10种）====================
// 共用模板：retail 建筑无生产输入输出，只通过 retailConfig 销售

export const RETAIL_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 40,
    key: 'convenience_store',
    name: '便利店',
    category: 'retail',
    buildCost: 900000,
    buildTime: 36,
    maintenanceCost: 2500,
    laborCost: 8000,
    energyCost: 1800,
    powerConsumption: 8,
    maxLevel: 5,
    upgradeCosts: [0, 300000, 600000, 1200000, 2400000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 12,
      inventoryCapacity: 200,
      customerCapacity: 80,
      markupRange: [0.15, 0.30],
      allowedGoodsIds: [
        GoodsId.FOOD,
        GoodsId.BEVERAGES,
        GoodsId.SNACKS,
        GoodsId.GENERIC_DRUG,
        GoodsId.OTC_DRUG,
      ],
    },
    description: '面向社区居民的综合零售门店',
  },
  {
    id: 41,
    key: 'supermarket',
    name: '超市',
    category: 'retail',
    buildCost: 2400000,
    buildTime: 60,
    maintenanceCost: 6000,
    laborCost: 22000,
    energyCost: 4500,
    powerConsumption: 22,
    maxLevel: 5,
    upgradeCosts: [0, 800000, 1600000, 3200000, 6400000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 24,
      inventoryCapacity: 500,
      customerCapacity: 240,
      markupRange: [0.10, 0.25],
      allowedGoodsIds: [
        GoodsId.FOOD,
        GoodsId.BEVERAGES,
        GoodsId.SNACKS,
        GoodsId.PROCESSED_FOOD,
        GoodsId.FROZEN_FOOD,
        GoodsId.CANNED_FOOD,
        GoodsId.DAIRY,
        GoodsId.MEAT,
        GoodsId.ORGANIC_FOOD,
        GoodsId.PET_FOOD,
        GoodsId.GENERIC_DRUG,
        GoodsId.OTC_DRUG,
      ],
    },
    description: '中型综合超市，覆盖日常食品与生鲜',
  },
  {
    id: 42,
    key: 'electronics_store',
    name: '电器商场',
    category: 'retail',
    buildCost: 3500000,
    buildTime: 75,
    maintenanceCost: 9000,
    laborCost: 28000,
    energyCost: 5500,
    powerConsumption: 30,
    maxLevel: 5,
    upgradeCosts: [0, 1200000, 2400000, 4800000, 9600000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 12,
      inventoryCapacity: 150,
      customerCapacity: 80,
      markupRange: [0.08, 0.20],
      allowedGoodsIds: [
        GoodsId.SMARTPHONE,
        GoodsId.COMPUTER,
        GoodsId.APPLIANCES,
        GoodsId.DRONE,
        GoodsId.INDUSTRIAL_ROBOT,
      ],
    },
    description: '电子产品与家电的专业卖场',
  },
  {
    id: 43,
    key: 'car_dealership',
    name: '汽车 4S 店',
    category: 'retail',
    buildCost: 5500000,
    buildTime: 90,
    maintenanceCost: 14000,
    laborCost: 35000,
    energyCost: 4000,
    powerConsumption: 18,
    maxLevel: 5,
    upgradeCosts: [0, 1800000, 3600000, 7200000, 14400000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 6,
      inventoryCapacity: 40,
      customerCapacity: 30,
      markupRange: [0.05, 0.15],
      allowedGoodsIds: [
        GoodsId.CAR,
        GoodsId.ELECTRIC_CAR,
        GoodsId.LUXURY_CAR,
      ],
    },
    description: '汽车整车销售与售后展厅',
  },
  {
    id: 44,
    key: 'clothing_store',
    name: '服装店',
    category: 'retail',
    buildCost: 1500000,
    buildTime: 45,
    maintenanceCost: 4000,
    laborCost: 14000,
    energyCost: 2000,
    powerConsumption: 10,
    maxLevel: 5,
    upgradeCosts: [0, 500000, 1000000, 2000000, 4000000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 6,
      inventoryCapacity: 300,
      customerCapacity: 100,
      markupRange: [0.30, 0.60],
      allowedGoodsIds: [
        GoodsId.CLOTHING,
        GoodsId.DESIGNER_CLOTHING,
      ],
    },
    description: '日常服装与设计师品牌的零售门店',
  },
  {
    id: 45,
    key: 'furniture_mall',
    name: '家具城',
    category: 'retail',
    buildCost: 3200000,
    buildTime: 70,
    maintenanceCost: 7500,
    laborCost: 22000,
    energyCost: 3500,
    powerConsumption: 18,
    maxLevel: 5,
    upgradeCosts: [0, 1100000, 2200000, 4400000, 8800000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 6,
      inventoryCapacity: 120,
      customerCapacity: 60,
      markupRange: [0.15, 0.35],
      allowedGoodsIds: [
        GoodsId.FURNITURE,
        GoodsId.BUILDING_PRODUCTS,
      ],
    },
    description: '家具与建材成品的大型卖场',
  },
  {
    id: 46,
    key: 'pharmacy',
    name: '药房',
    category: 'retail',
    buildCost: 1200000,
    buildTime: 40,
    maintenanceCost: 3500,
    laborCost: 12000,
    energyCost: 1800,
    powerConsumption: 8,
    maxLevel: 5,
    upgradeCosts: [0, 400000, 800000, 1600000, 3200000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 10,
      inventoryCapacity: 200,
      customerCapacity: 90,
      markupRange: [0.20, 0.40],
      allowedGoodsIds: [
        GoodsId.GENERIC_DRUG,
        GoodsId.OTC_DRUG,
        GoodsId.PATENT_DRUG,
        GoodsId.MEDICAL_DEVICE,
        GoodsId.MEDICAL_SUPPLIES,
      ],
    },
    description: '医药与医疗器械的零售药店',
  },
  {
    id: 47,
    key: 'luxury_store',
    name: '奢侈品店',
    category: 'retail',
    buildCost: 4500000,
    buildTime: 80,
    maintenanceCost: 12000,
    laborCost: 30000,
    energyCost: 3500,
    powerConsumption: 16,
    maxLevel: 5,
    upgradeCosts: [0, 1500000, 3000000, 6000000, 12000000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 6,
      inventoryCapacity: 50,
      customerCapacity: 30,
      markupRange: [0.50, 1.00],
      allowedGoodsIds: [
        GoodsId.JEWELRY,
        GoodsId.LUXURY_WATCH,
        GoodsId.DESIGNER_CLOTHING,
      ],
    },
    description: '高端珠宝、名表与设计师服饰精品店',
  },
  {
    id: 48,
    key: 'energy_service_store',
    name: '能源服务店',
    category: 'retail',
    buildCost: 2800000,
    buildTime: 65,
    maintenanceCost: 7000,
    laborCost: 18000,
    energyCost: 4500,
    powerConsumption: 20,
    maxLevel: 5,
    upgradeCosts: [0, 900000, 1800000, 3600000, 7200000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 6,
      inventoryCapacity: 60,
      customerCapacity: 40,
      markupRange: [0.05, 0.10],
      allowedGoodsIds: [
        GoodsId.SOLAR_SYSTEM,
        GoodsId.ENERGY_STORAGE,
      ],
    },
    description: '光伏系统与储能产品的销售与安装服务店',
  },
  {
    id: 49,
    key: 'department_store',
    name: '综合百货',
    category: 'retail',
    buildCost: 6800000,
    buildTime: 100,
    maintenanceCost: 18000,
    laborCost: 45000,
    energyCost: 7500,
    powerConsumption: 38,
    maxLevel: 5,
    upgradeCosts: [0, 2300000, 4600000, 9200000, 18400000],
    capacityMultipliers: [1, 1, 1, 1, 1],
    efficiencyMultipliers: [1, 1, 1, 1, 1],
    retailConfig: {
      maxInventorySlots: 24,
      inventoryCapacity: 400,
      customerCapacity: 250,
      markupRange: [0.05, 0.20],
      allowedGoodsIds: [
        GoodsId.CLOTHING,
        GoodsId.DESIGNER_CLOTHING,
        GoodsId.SMARTPHONE,
        GoodsId.COMPUTER,
        GoodsId.APPLIANCES,
        GoodsId.FURNITURE,
        GoodsId.JEWELRY,
        GoodsId.LUXURY_WATCH,
        GoodsId.PROCESSED_FOOD,
        GoodsId.ORGANIC_FOOD,
        GoodsId.PET_FOOD,
        GoodsId.MEDICAL_DEVICE,
        GoodsId.GENERIC_DRUG,
        GoodsId.OTC_DRUG,
      ],
    },
    description: '一站式综合百货商场，覆盖中高端品类',
  },
];
export const RETAIL_BUILDINGS_LIST = RETAIL_BUILDINGS;

// 合并所有建筑（50种建筑，ID 0-49连续）
export const ALL_BUILDINGS: BuildingTypeDefinition[] = [
  ...EXTRACTION_BUILDINGS,
  ...PROCESSING_BUILDINGS,
  ...MANUFACTURING_BUILDINGS,
  ...LUXURY_BUILDINGS,
  ...SERVICE_BUILDINGS,
  ...RETAIL_BUILDINGS,
];

// 建筑ID到定义的映射
export const BUILDINGS_BY_ID: Map<number, BuildingTypeDefinition> = new Map(
  ALL_BUILDINGS.map(b => [b.id, b])
);

// 建筑Key到定义的映射
export const BUILDINGS_BY_KEY: Map<string, BuildingTypeDefinition> = new Map(
  ALL_BUILDINGS.map(b => [b.key, b])
);

// 按类别分组
export const BUILDINGS_BY_CATEGORY = {
  extraction: ALL_BUILDINGS.filter(b => b.category === 'extraction'),
  processing: ALL_BUILDINGS.filter(b => b.category === 'processing'),
  manufacturing: ALL_BUILDINGS.filter(b => b.category === 'manufacturing'),
  luxury: ALL_BUILDINGS.filter(b => b.category === 'luxury'),
  service: ALL_BUILDINGS.filter(b => b.category === 'service'),
  retail: ALL_BUILDINGS.filter(b => b.category === 'retail'),
};

// 按产业链分组（用于UI显示）
export const BUILDINGS_BY_INDUSTRY: Record<string, BuildingTypeDefinition[]> = {
  // 矿业产业链：金属矿产开采
  mining: ALL_BUILDINGS.filter(b => [0, 1, 2, 3, 6, 7, 8].includes(b.id)),
  
  // 能源产业链：能源开采与发电
  energy: ALL_BUILDINGS.filter(b => [4, 5, 17, 39].includes(b.id)),
  
  // 农林产业链：农业、林业、渔业
  agriculture: ALL_BUILDINGS.filter(b => [9, 10, 11, 12, 13, 14].includes(b.id)),
  
  // 食品产业链：食品加工
  food: ALL_BUILDINGS.filter(b => [23, 24, 25].includes(b.id)),
  
  // 化工产业链：化学品、建材
  chemical: ALL_BUILDINGS.filter(b => [18, 19, 20, 21].includes(b.id)),
  
  // 冶金产业链：金属冶炼与加工
  metallurgy: ALL_BUILDINGS.filter(b => [15, 16, 26].includes(b.id)),
  
  // 纺织产业链：纺织与服装
  textile: ALL_BUILDINGS.filter(b => [22, 33].includes(b.id)),
  
  // 电子产业链：电子、半导体、电池
  electronics: ALL_BUILDINGS.filter(b => [27, 28, 29, 30].includes(b.id)),
  
  // 汽车产业链：汽车制造
  automotive: ALL_BUILDINGS.filter(b => [31].includes(b.id)),
  
  // 家电产业链：家用电器
  appliance: ALL_BUILDINGS.filter(b => [32].includes(b.id)),
  
  // 新能源产业链：光伏、风电、机器人
  newEnergy: ALL_BUILDINGS.filter(b => [34].includes(b.id)),
  
  // 医药产业链：制药与医疗器械
  pharma: ALL_BUILDINGS.filter(b => [35, 36].includes(b.id)),
  
  // 奢侈品产业链：珠宝、奢侈品
  luxury: ALL_BUILDINGS.filter(b => [37, 38].includes(b.id)),

  // 零售产业链：便利店/超市/电器/4S店/服装/家具/药房/奢侈品店/能源服务/综合百货
  retail: ALL_BUILDINGS.filter(b => b.id >= 40 && b.id <= 49),
};

// 建筑ID常量
export const BuildingId = {
  // 采掘类
  IRON_MINE: 0,
  COPPER_MINE: 1,
  ALUMINUM_MINE: 2,
  COAL_MINE: 3,
  OIL_FIELD: 4,
  GAS_FIELD: 5,
  SILICON_MINE: 6,
  LITHIUM_MINE: 7,
  RARE_EARTH_MINE: 8,
  LOGGING_CAMP: 9,
  FARM: 10,
  RUBBER_PLANTATION: 11,
  LIVESTOCK_FARM: 12,
  FISHERY: 13,
  HERB_FARM: 14,
  // 加工类
  STEEL_MILL: 15,
  NON_FERROUS_SMELTER: 16,
  REFINERY: 17,
  CHEMICAL_PLANT: 18,
  GLASS_FACTORY: 19,
  CEMENT_FACTORY: 20,
  PAPER_MILL: 21,
  TEXTILE_MILL: 22,
  FOOD_FACTORY: 23,
  MEAT_PROCESSING: 24,
  DAIRY_FACTORY: 25,
  BUILDING_MATERIALS_FACTORY: 26,
  // 制造类
  ELECTRONICS_FACTORY: 27,
  SEMICONDUCTOR_FAB: 28,
  BATTERY_FACTORY: 29,
  PARTS_FACTORY: 30,
  CAR_FACTORY: 31,
  APPLIANCE_FACTORY: 32,
  FURNITURE_FACTORY: 33,
  NEW_ENERGY_FACTORY: 34,
  PHARMA_FACTORY: 35,
  MEDICAL_DEVICE_FACTORY: 36,
  // 奢侈品
  GOLD_REFINERY: 37,
  LUXURY_WORKSHOP: 38,
  // 服务
  POWER_PLANT: 39,
  // 零售
  CONVENIENCE_STORE: 40,
  SUPERMARKET: 41,
  ELECTRONICS_STORE: 42,
  CAR_DEALERSHIP: 43,
  CLOTHING_STORE: 44,
  FURNITURE_MALL: 45,
  PHARMACY: 46,
  LUXURY_STORE: 47,
  ENERGY_SERVICE_STORE: 48,
  DEPARTMENT_STORE: 49,
} as const;

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
 * 获取零售建筑类型索引（用于RetailSystem.types）
 */
export function getRetailTypeIndex(buildingTypeId: number): number {
  return RETAIL_BUILDINGS.findIndex(b => b.id === buildingTypeId);
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
 * 获取建筑电力消耗
 */
export function getBuildingPowerConsumption(buildingTypeId: number): number {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  return building?.powerConsumption ?? 0;
}


/**
 * 获取建筑总数
 */
export const BUILDING_COUNT = ALL_BUILDINGS.length; // 41
