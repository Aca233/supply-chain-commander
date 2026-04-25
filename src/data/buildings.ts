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

/** 生产输入/输出定义 */
export interface ProductionIO {
  goodsId: number;
  amount: number;
}

/** 产品模式（用于多产品建筑） */
export interface OutputMode {
  modeId: number;
  name: string;
  inputs: ProductionIO[];
  outputs: ProductionIO[];
  ticksRequired?: number;
  laborRequired?: number;
  energyRequired?: number;
  unlockLevel?: number;
}

/** 建筑生产配置 */
export interface BuildingProductionConfig {
  // 默认生产参数
  inputs: ProductionIO[];
  outputs: ProductionIO[];
  ticksRequired: number;
  laborRequired: number;
  energyRequired: number;
  
  // 可选产品模式（用于多产品建筑）
  outputModes?: OutputMode[];
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
  
  // 生产配置（替代原来的配方）
  production: BuildingProductionConfig;
  
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.IRON_ORE, amount: 100 }],
      ticksRequired: 1,
      laborRequired: 50,
      energyRequired: 200,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.COPPER_ORE, amount: 80 }],
      ticksRequired: 1,
      laborRequired: 50,
      energyRequired: 220,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.BAUXITE, amount: 100 }],
      ticksRequired: 1,
      laborRequired: 50,
      energyRequired: 200,
    },
    description: '开采铝土矿的矿场',
  },
  {
    id: 3,
    key: 'coal_mine',
    name: '煤矿',
    category: 'extraction',
    buildCost: 400000,
    buildTime: 36,
    maintenanceCost: 800,
    laborCost: 4000,
    energyCost: 1500,
    powerConsumption: 12,
    maxLevel: 5,
    upgradeCosts: [0, 160000, 320000, 640000, 1280000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.COAL, amount: 150 }],
      ticksRequired: 1,
      laborRequired: 40,
      energyRequired: 150,
    },
    description: '开采煤炭的矿场',
  },
  {
    id: 4,
    key: 'oil_field',
    name: '油田',
    category: 'extraction',
    buildCost: 2000000,
    buildTime: 96,
    maintenanceCost: 5000,
    laborCost: 15000,
    energyCost: 8000,
    powerConsumption: 25,
    maxLevel: 5,
    upgradeCosts: [0, 800000, 1600000, 3200000, 6400000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.CRUDE_OIL, amount: 80 }],
      ticksRequired: 1,
      laborRequired: 30,
      energyRequired: 300,
    },
    description: '开采原油的油田',
  },
  {
    id: 5,
    key: 'gas_field',
    name: '气田',
    category: 'extraction',
    buildCost: 1800000,
    buildTime: 84,
    maintenanceCost: 4500,
    laborCost: 12000,
    energyCost: 6000,
    powerConsumption: 22,
    maxLevel: 5,
    upgradeCosts: [0, 720000, 1440000, 2880000, 5760000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.NATURAL_GAS, amount: 100 }],
      ticksRequired: 1,
      laborRequired: 25,
      energyRequired: 250,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.SILICON, amount: 90 }],
      ticksRequired: 1,
      laborRequired: 45,
      energyRequired: 180,
    },
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
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.LITHIUM, amount: 50 }],
      ticksRequired: 2,
      laborRequired: 55,
      energyRequired: 280,
    },
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
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.RARE_EARTH, amount: 30 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 250,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.TIMBER, amount: 120 }],
      ticksRequired: 1,
      laborRequired: 60,
      energyRequired: 100,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.GRAIN, amount: 200 }],
      ticksRequired: 18,
      laborRequired: 100,
      energyRequired: 50,
      outputModes: [
        {
          modeId: 0,
          name: '粮食种植',
          inputs: [],
          outputs: [{ goodsId: GoodsId.GRAIN, amount: 200 }],
          ticksRequired: 18,
          laborRequired: 100,
          energyRequired: 50,
        },
        {
          modeId: 1,
          name: '棉花种植',
          inputs: [],
          outputs: [{ goodsId: GoodsId.COTTON, amount: 80 }],
          ticksRequired: 18,
          laborRequired: 80,
          energyRequired: 40,
          unlockLevel: 2,
        },
      ],
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.RUBBER_RAW, amount: 80 }],
      ticksRequired: 1,
      laborRequired: 60,
      energyRequired: 50,
    },
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
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.GRAIN, amount: 150 }],
      outputs: [{ goodsId: GoodsId.LIVESTOCK, amount: 12 }],
      ticksRequired: 36,
      laborRequired: 100,
      energyRequired: 80,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.SEAFOOD, amount: 80 }],
      ticksRequired: 18,
      laborRequired: 50,
      energyRequired: 60,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.HERBS, amount: 72 }],
      ticksRequired: 36,
      laborRequired: 40,
      energyRequired: 30,
    },
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
    buildCost: 2000000,
    buildTime: 96,
    maintenanceCost: 5000,
    laborCost: 20000,
    energyCost: 15000,
    powerConsumption: 80,
    maxLevel: 5,
    upgradeCosts: [0, 800000, 1600000, 3200000, 6400000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.IRON_ORE, amount: 100 }, { goodsId: GoodsId.COAL, amount: 50 }],
      outputs: [{ goodsId: GoodsId.STEEL, amount: 80 }],
      ticksRequired: 2,
      laborRequired: 80,
      energyRequired: 500,
    },
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
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [{ goodsId: GoodsId.COPPER_ORE, amount: 80 }],
      outputs: [{ goodsId: GoodsId.COPPER, amount: 60 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 400,
      outputModes: [
        {
          modeId: 0,
          name: '铜冶炼',
          inputs: [{ goodsId: GoodsId.COPPER_ORE, amount: 80 }],
          outputs: [{ goodsId: GoodsId.COPPER, amount: 60 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 400,
        },
        {
          modeId: 1,
          name: '铝冶炼',
          inputs: [{ goodsId: GoodsId.BAUXITE, amount: 100 }],
          outputs: [{ goodsId: GoodsId.ALUMINUM, amount: 40 }],
          ticksRequired: 2,
          laborRequired: 45,
          energyRequired: 600,
          unlockLevel: 2,
        },
      ],
    },
    description: '冶炼铜材和铝材',
  },
  {
    id: 17,
    key: 'refinery',
    name: '炼油厂',
    category: 'processing',
    buildCost: 3000000,
    buildTime: 120,
    maintenanceCost: 8000,
    laborCost: 25000,
    energyCost: 20000,
    powerConsumption: 60,
    maxLevel: 5,
    upgradeCosts: [0, 1200000, 2400000, 4800000, 9600000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.CRUDE_OIL, amount: 100 }],
      outputs: [{ goodsId: GoodsId.FUEL, amount: 60 }, { goodsId: GoodsId.PLASTIC, amount: 30 }],
      ticksRequired: 2,
      laborRequired: 40,
      energyRequired: 400,
    },
    description: '将原油精炼成燃油和塑料',
  },
  {
    id: 18,
    key: 'chemical_plant',
    name: '化工厂',
    category: 'processing',
    buildCost: 2500000,
    buildTime: 108,
    maintenanceCost: 6000,
    laborCost: 18000,
    energyCost: 12000,
    powerConsumption: 55,
    maxLevel: 5,
    upgradeCosts: [0, 1000000, 2000000, 4000000, 8000000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.CRUDE_OIL, amount: 60 }, { goodsId: GoodsId.NATURAL_GAS, amount: 20 }],
      outputs: [{ goodsId: GoodsId.CHEMICALS, amount: 50 }],
      ticksRequired: 2,
      laborRequired: 40,
      energyRequired: 300,
      outputModes: [
        {
          modeId: 0,
          name: '化学品生产',
          inputs: [{ goodsId: GoodsId.CRUDE_OIL, amount: 60 }, { goodsId: GoodsId.NATURAL_GAS, amount: 20 }],
          outputs: [{ goodsId: GoodsId.CHEMICALS, amount: 50 }],
          ticksRequired: 2,
          laborRequired: 40,
          energyRequired: 300,
        },
        {
          modeId: 1,
          name: '橡胶制品生产',
          inputs: [{ goodsId: GoodsId.RUBBER_RAW, amount: 60 }, { goodsId: GoodsId.CHEMICALS, amount: 15 }],
          outputs: [{ goodsId: GoodsId.RUBBER, amount: 50 }],
          ticksRequired: 2,
          laborRequired: 45,
          energyRequired: 180,
          unlockLevel: 2,
        },
      ],
    },
    description: '生产化学品和橡胶制品',
  },
  {
    id: 19,
    key: 'glass_factory',
    name: '玻璃厂',
    category: 'processing',
    buildCost: 1000000,
    buildTime: 60,
    maintenanceCost: 2500,
    laborCost: 10000,
    energyCost: 8000,
    powerConsumption: 45,
    maxLevel: 5,
    upgradeCosts: [0, 400000, 800000, 1600000, 3200000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [{ goodsId: GoodsId.SILICON, amount: 80 }],
      outputs: [{ goodsId: GoodsId.GLASS, amount: 60 }],
      ticksRequired: 1,
      laborRequired: 35,
      energyRequired: 350,
    },
    description: '生产玻璃制品',
  },
  {
    id: 20,
    key: 'cement_factory',
    name: '水泥厂',
    category: 'processing',
    buildCost: 1200000,
    buildTime: 72,
    maintenanceCost: 3000,
    laborCost: 12000,
    energyCost: 10000,
    powerConsumption: 50,
    maxLevel: 5,
    upgradeCosts: [0, 480000, 960000, 1920000, 3840000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [{ goodsId: GoodsId.SILICON, amount: 50 }, { goodsId: GoodsId.COAL, amount: 30 }],
      outputs: [{ goodsId: GoodsId.CEMENT, amount: 100 }],
      ticksRequired: 2,
      laborRequired: 50,
      energyRequired: 400,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [{ goodsId: GoodsId.TIMBER, amount: 80 }],
      outputs: [{ goodsId: GoodsId.PAPER, amount: 100 }],
      ticksRequired: 2,
      laborRequired: 40,
      energyRequired: 200,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [{ goodsId: GoodsId.COTTON, amount: 100 }],
      outputs: [{ goodsId: GoodsId.TEXTILES, amount: 80 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 150,
      outputModes: [
        {
          modeId: 0,
          name: '纺织品生产',
          inputs: [{ goodsId: GoodsId.COTTON, amount: 100 }],
          outputs: [{ goodsId: GoodsId.TEXTILES, amount: 80 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 150,
        },
        {
          modeId: 1,
          name: '丝绸生产',
          inputs: [{ goodsId: GoodsId.COTTON, amount: 80 }],
          outputs: [{ goodsId: GoodsId.SILK, amount: 30 }],
          ticksRequired: 4,
          laborRequired: 80,
          energyRequired: 120,
          unlockLevel: 2,
        },
      ],
    },
    description: '将棉花加工成纺织品和丝绸',
  },
  {
    id: 23,
    key: 'food_factory',
    name: '食品厂',
    category: 'processing',
    buildCost: 700000,
    buildTime: 48,
    maintenanceCost: 1800,
    laborCost: 10000,
    energyCost: 4000,
    powerConsumption: 20,
    maxLevel: 5,
    upgradeCosts: [0, 280000, 560000, 1120000, 2240000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [{ goodsId: GoodsId.GRAIN, amount: 100 }],
      outputs: [{ goodsId: GoodsId.PROCESSED_FOOD, amount: 80 }],
      ticksRequired: 1,
      laborRequired: 40,
      energyRequired: 100,
      outputModes: [
        {
          modeId: 0,
          name: '食品加工',
          inputs: [{ goodsId: GoodsId.GRAIN, amount: 100 }],
          outputs: [{ goodsId: GoodsId.PROCESSED_FOOD, amount: 80 }],
          ticksRequired: 1,
          laborRequired: 40,
          energyRequired: 100,
        },
        {
          modeId: 1,
          name: '饮料生产',
          inputs: [{ goodsId: GoodsId.GRAIN, amount: 30 }],
          outputs: [{ goodsId: GoodsId.BEVERAGES, amount: 100 }],
          ticksRequired: 1,
          laborRequired: 30,
          energyRequired: 80,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '零食生产',
          inputs: [{ goodsId: GoodsId.GRAIN, amount: 40 }, { goodsId: GoodsId.PACKAGING, amount: 10 }],
          outputs: [{ goodsId: GoodsId.SNACKS, amount: 80 }],
          ticksRequired: 1,
          laborRequired: 30,
          energyRequired: 80,
          unlockLevel: 2,
        },
        {
          modeId: 3,
          name: '食品成品生产',
          inputs: [{ goodsId: GoodsId.PROCESSED_FOOD, amount: 50 }],
          outputs: [{ goodsId: GoodsId.FOOD, amount: 60 }],
          ticksRequired: 1,
          laborRequired: 40,
          energyRequired: 80,
          unlockLevel: 2,
        },
        {
          modeId: 4,
          name: '宠物食品生产',
          inputs: [{ goodsId: GoodsId.MEAT, amount: 20 }, { goodsId: GoodsId.GRAIN, amount: 30 }],
          outputs: [{ goodsId: GoodsId.PET_FOOD, amount: 60 }],
          ticksRequired: 1,
          laborRequired: 35,
          energyRequired: 90,
          unlockLevel: 3,
        },
        {
          modeId: 5,
          name: '有机食品生产',
          inputs: [{ goodsId: GoodsId.GRAIN, amount: 50 }, { goodsId: GoodsId.DAIRY, amount: 20 }],
          outputs: [{ goodsId: GoodsId.ORGANIC_FOOD, amount: 30 }],
          ticksRequired: 2,
          laborRequired: 50,
          energyRequired: 100,
          unlockLevel: 2,
        },
      ],
    },
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
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.LIVESTOCK, amount: 5 }],
      outputs: [{ goodsId: GoodsId.MEAT, amount: 100 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 150,
      outputModes: [
        {
          modeId: 0,
          name: '肉类加工',
          inputs: [{ goodsId: GoodsId.LIVESTOCK, amount: 5 }],
          outputs: [{ goodsId: GoodsId.MEAT, amount: 100 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 150,
        },
        {
          modeId: 1,
          name: '冷冻食品生产',
          inputs: [{ goodsId: GoodsId.MEAT, amount: 30 }, { goodsId: GoodsId.SEAFOOD, amount: 20 }],
          outputs: [{ goodsId: GoodsId.FROZEN_FOOD, amount: 60 }],
          ticksRequired: 2,
          laborRequired: 50,
          energyRequired: 200,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '罐头食品生产',
          inputs: [{ goodsId: GoodsId.MEAT, amount: 20 }, { goodsId: GoodsId.PROCESSED_FOOD, amount: 10 }],
          outputs: [{ goodsId: GoodsId.CANNED_FOOD, amount: 40 }],
          ticksRequired: 2,
          laborRequired: 45,
          energyRequired: 120,
        },
      ],
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [{ goodsId: GoodsId.LIVESTOCK, amount: 2 }],
      outputs: [{ goodsId: GoodsId.DAIRY, amount: 150 }],
      ticksRequired: 1,
      laborRequired: 30,
      energyRequired: 100,
    },
    description: '乳制品生产工厂',
  },
  {
    id: 26,
    key: 'building_materials_factory',
    name: '建材厂',
    category: 'processing',
    buildCost: 900000,
    buildTime: 60,
    maintenanceCost: 2200,
    laborCost: 11000,
    energyCost: 5000,
    powerConsumption: 40,
    maxLevel: 5,
    upgradeCosts: [0, 360000, 720000, 1440000, 2880000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [{ goodsId: GoodsId.CEMENT, amount: 60 }, { goodsId: GoodsId.STEEL, amount: 40 }],
      outputs: [{ goodsId: GoodsId.BUILDING_MATERIALS, amount: 80 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 250,
      outputModes: [
        {
          modeId: 0,
          name: '建筑材料生产',
          inputs: [{ goodsId: GoodsId.CEMENT, amount: 60 }, { goodsId: GoodsId.STEEL, amount: 40 }],
          outputs: [{ goodsId: GoodsId.BUILDING_MATERIALS, amount: 80 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 250,
        },
        {
          modeId: 1,
          name: '包装材料生产',
          inputs: [{ goodsId: GoodsId.PAPER, amount: 50 }, { goodsId: GoodsId.PLASTIC, amount: 20 }],
          outputs: [{ goodsId: GoodsId.PACKAGING, amount: 80 }],
          ticksRequired: 1,
          laborRequired: 30,
          energyRequired: 100,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '建材成品生产',
          inputs: [{ goodsId: GoodsId.BUILDING_MATERIALS, amount: 50 }, { goodsId: GoodsId.GLASS, amount: 20 }],
          outputs: [{ goodsId: GoodsId.BUILDING_PRODUCTS, amount: 40 }],
          ticksRequired: 3,
          laborRequired: 80,
          energyRequired: 200,
          unlockLevel: 2,
        },
      ],
    },
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
    buildCost: 5000000,
    buildTime: 120,
    maintenanceCost: 12000,
    laborCost: 40000,
    energyCost: 15000,
    powerConsumption: 45,
    maxLevel: 5,
    upgradeCosts: [0, 2000000, 4000000, 8000000, 16000000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.8],
    production: {
      inputs: [{ goodsId: GoodsId.COPPER, amount: 20 }, { goodsId: GoodsId.PLASTIC, amount: 15 }],
      outputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 25 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 250,
      outputModes: [
        {
          modeId: 0,
          name: '电子元件生产',
          inputs: [{ goodsId: GoodsId.COPPER, amount: 20 }, { goodsId: GoodsId.PLASTIC, amount: 15 }],
          outputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 25 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 250,
        },
        {
          modeId: 1,
          name: '智能手机组装',
          inputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 15 }, { goodsId: GoodsId.CHIPS, amount: 5 }, { goodsId: GoodsId.BATTERY, amount: 3 }, { goodsId: GoodsId.SCREEN, amount: 5 }],
          outputs: [{ goodsId: GoodsId.SMARTPHONE, amount: 12 }],
          ticksRequired: 2,
          laborRequired: 80,
          energyRequired: 150,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '电脑组装',
          inputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 20 }, { goodsId: GoodsId.CHIPS, amount: 8 }, { goodsId: GoodsId.SCREEN, amount: 2 }, { goodsId: GoodsId.PLASTIC, amount: 10 }],
          outputs: [{ goodsId: GoodsId.COMPUTER, amount: 5 }],
          ticksRequired: 3,
          laborRequired: 100,
          energyRequired: 200,
          unlockLevel: 2,
        },
        {
          modeId: 3,
          name: '无人机生产',
          inputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 20 }, { goodsId: GoodsId.CHIPS, amount: 3 }, { goodsId: GoodsId.BATTERY, amount: 2 }, { goodsId: GoodsId.PLASTIC, amount: 10 }],
          outputs: [{ goodsId: GoodsId.DRONE, amount: 5 }],
          ticksRequired: 3,
          laborRequired: 90,
          energyRequired: 180,
          unlockLevel: 3,
        },
      ],
    },
    description: '生产电子元件、手机、电脑、无人机',
  },
  {
    id: 28,
    key: 'semiconductor_fab',
    name: '半导体厂',
    category: 'manufacturing',
    buildCost: 20000000,
    buildTime: 240,
    maintenanceCost: 50000,
    laborCost: 100000,
    energyCost: 80000,
    powerConsumption: 120,
    maxLevel: 5,
    upgradeCosts: [0, 8000000, 16000000, 32000000, 64000000],
    capacityMultipliers: [1.0, 1.15, 1.3, 1.5, 1.8],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    production: {
      inputs: [{ goodsId: GoodsId.SILICON, amount: 30 }, { goodsId: GoodsId.RARE_EARTH, amount: 5 }, { goodsId: GoodsId.CHEMICALS, amount: 10 }],
      outputs: [{ goodsId: GoodsId.CHIPS, amount: 20 }],
      ticksRequired: 4,
      laborRequired: 120,
      energyRequired: 500,
    },
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
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    production: {
      inputs: [{ goodsId: GoodsId.LITHIUM, amount: 30 }, { goodsId: GoodsId.COPPER, amount: 15 }, { goodsId: GoodsId.CHEMICALS, amount: 20 }],
      outputs: [{ goodsId: GoodsId.BATTERY, amount: 20 }],
      ticksRequired: 3,
      laborRequired: 50,
      energyRequired: 350,
      outputModes: [
        {
          modeId: 0,
          name: '电池生产',
          inputs: [{ goodsId: GoodsId.LITHIUM, amount: 30 }, { goodsId: GoodsId.COPPER, amount: 15 }, { goodsId: GoodsId.CHEMICALS, amount: 20 }],
          outputs: [{ goodsId: GoodsId.BATTERY, amount: 20 }],
          ticksRequired: 3,
          laborRequired: 50,
          energyRequired: 350,
        },
        {
          modeId: 1,
          name: '储能系统生产',
          inputs: [{ goodsId: GoodsId.BATTERY, amount: 30 }, { goodsId: GoodsId.ELECTRONICS, amount: 20 }],
          outputs: [{ goodsId: GoodsId.ENERGY_STORAGE, amount: 3 }],
          ticksRequired: 4,
          laborRequired: 80,
          energyRequired: 300,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '光伏系统组装',
          inputs: [{ goodsId: GoodsId.SOLAR_PANEL, amount: 30 }, { goodsId: GoodsId.ELECTRONICS, amount: 20 }, { goodsId: GoodsId.BATTERY, amount: 5 }],
          outputs: [{ goodsId: GoodsId.SOLAR_SYSTEM, amount: 2 }],
          ticksRequired: 5,
          laborRequired: 120,
          energyRequired: 250,
          unlockLevel: 3,
        },
      ],
    },
    description: '生产电池、储能系统和光伏系统',
  },
  {
    id: 30,
    key: 'parts_factory',
    name: '零部件厂',
    category: 'manufacturing',
    buildCost: 3000000,
    buildTime: 84,
    maintenanceCost: 8000,
    laborCost: 30000,
    energyCost: 10000,
    powerConsumption: 50,
    maxLevel: 5,
    upgradeCosts: [0, 1200000, 2400000, 4800000, 9600000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.COPPER, amount: 30 }, { goodsId: GoodsId.STEEL, amount: 20 }, { goodsId: GoodsId.RARE_EARTH, amount: 3 }],
      outputs: [{ goodsId: GoodsId.MOTOR, amount: 15 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 200,
      outputModes: [
        {
          modeId: 0,
          name: '电机生产',
          inputs: [{ goodsId: GoodsId.COPPER, amount: 30 }, { goodsId: GoodsId.STEEL, amount: 20 }, { goodsId: GoodsId.RARE_EARTH, amount: 3 }],
          outputs: [{ goodsId: GoodsId.MOTOR, amount: 15 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 200,
        },
        {
          modeId: 1,
          name: '屏幕生产',
          inputs: [{ goodsId: GoodsId.GLASS, amount: 30 }, { goodsId: GoodsId.ELECTRONICS, amount: 15 }, { goodsId: GoodsId.RARE_EARTH, amount: 2 }],
          outputs: [{ goodsId: GoodsId.SCREEN, amount: 20 }],
          ticksRequired: 2,
          laborRequired: 70,
          energyRequired: 250,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '汽车零部件生产',
          inputs: [{ goodsId: GoodsId.STEEL, amount: 50 }, { goodsId: GoodsId.PLASTIC, amount: 20 }],
          outputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 30 }],
          ticksRequired: 3,
          laborRequired: 100,
          energyRequired: 300,
        },
        {
          modeId: 3,
          name: '机械部件生产',
          inputs: [{ goodsId: GoodsId.STEEL, amount: 40 }, { goodsId: GoodsId.ALUMINUM, amount: 20 }],
          outputs: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 35 }],
          ticksRequired: 2,
          laborRequired: 70,
          energyRequired: 220,
        },
        {
          modeId: 4,
          name: '航空部件生产',
          inputs: [{ goodsId: GoodsId.ALUMINUM, amount: 50 }, { goodsId: GoodsId.STEEL, amount: 30 }, { goodsId: GoodsId.RARE_EARTH, amount: 5 }],
          outputs: [{ goodsId: GoodsId.AIRCRAFT_PARTS, amount: 10 }],
          ticksRequired: 5,
          laborRequired: 120,
          energyRequired: 350,
          unlockLevel: 3,
        },
        {
          modeId: 5,
          name: '服装面料生产',
          inputs: [{ goodsId: GoodsId.TEXTILES, amount: 50 }],
          outputs: [{ goodsId: GoodsId.CLOTHING_FABRIC, amount: 40 }],
          ticksRequired: 2,
          laborRequired: 50,
          energyRequired: 100,
        },
      ],
    },
    description: '生产电机、屏幕、汽车零件、机械部件等',
  },
  {
    id: 31,
    key: 'car_factory',
    name: '汽车工厂',
    category: 'manufacturing',
    buildCost: 10000000,
    buildTime: 168,
    maintenanceCost: 25000,
    laborCost: 80000,
    energyCost: 30000,
    powerConsumption: 85,
    maxLevel: 5,
    upgradeCosts: [0, 4000000, 8000000, 16000000, 32000000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    production: {
      inputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 20 }, { goodsId: GoodsId.ELECTRONICS, amount: 10 }, { goodsId: GoodsId.RUBBER, amount: 8 }, { goodsId: GoodsId.GLASS, amount: 10 }],
      outputs: [{ goodsId: GoodsId.CAR, amount: 1 }],
      ticksRequired: 5,
      laborRequired: 200,
      energyRequired: 400,
      outputModes: [
        {
          modeId: 0,
          name: '燃油汽车组装',
          inputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 20 }, { goodsId: GoodsId.ELECTRONICS, amount: 10 }, { goodsId: GoodsId.RUBBER, amount: 8 }, { goodsId: GoodsId.GLASS, amount: 10 }],
          outputs: [{ goodsId: GoodsId.CAR, amount: 1 }],
          ticksRequired: 5,
          laborRequired: 200,
          energyRequired: 400,
        },
        {
          modeId: 1,
          name: '电动汽车组装',
          inputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 15 }, { goodsId: GoodsId.BATTERY, amount: 10 }, { goodsId: GoodsId.MOTOR, amount: 4 }, { goodsId: GoodsId.ELECTRONICS, amount: 15 }],
          outputs: [{ goodsId: GoodsId.ELECTRIC_CAR, amount: 1 }],
          ticksRequired: 6,
          laborRequired: 180,
          energyRequired: 350,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '豪华汽车组装',
          inputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 25 }, { goodsId: GoodsId.ELECTRONICS, amount: 30 }, { goodsId: GoodsId.GOLD, amount: 1 }, { goodsId: GoodsId.GLASS, amount: 20 }],
          outputs: [{ goodsId: GoodsId.LUXURY_CAR, amount: 1 }],
          ticksRequired: 10,
          laborRequired: 300,
          energyRequired: 500,
          unlockLevel: 3,
        },
      ],
    },
    description: '组装燃油汽车、电动汽车和豪华汽车',
  },
  {
    id: 32,
    key: 'appliance_factory',
    name: '家电厂',
    category: 'manufacturing',
    buildCost: 4000000,
    buildTime: 96,
    maintenanceCost: 10000,
    laborCost: 35000,
    energyCost: 12000,
    powerConsumption: 40,
    maxLevel: 5,
    upgradeCosts: [0, 1600000, 3200000, 6400000, 12800000],
    capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.STEEL, amount: 30 }, { goodsId: GoodsId.ELECTRONICS, amount: 20 }, { goodsId: GoodsId.PLASTIC, amount: 25 }],
      outputs: [{ goodsId: GoodsId.APPLIANCES, amount: 5 }],
      ticksRequired: 4,
      laborRequired: 120,
      energyRequired: 280,
    },
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
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.15, 1.3, 1.5, 1.7],
    production: {
      inputs: [{ goodsId: GoodsId.TIMBER, amount: 60 }, { goodsId: GoodsId.STEEL, amount: 20 }],
      outputs: [{ goodsId: GoodsId.FURNITURE, amount: 10 }],
      ticksRequired: 3,
      laborRequired: 100,
      energyRequired: 150,
      outputModes: [
        {
          modeId: 0,
          name: '家具生产',
          inputs: [{ goodsId: GoodsId.TIMBER, amount: 60 }, { goodsId: GoodsId.STEEL, amount: 20 }],
          outputs: [{ goodsId: GoodsId.FURNITURE, amount: 10 }],
          ticksRequired: 3,
          laborRequired: 100,
          energyRequired: 150,
        },
        {
          modeId: 1,
          name: '服装生产',
          inputs: [{ goodsId: GoodsId.CLOTHING_FABRIC, amount: 50 }],
          outputs: [{ goodsId: GoodsId.CLOTHING, amount: 40 }],
          ticksRequired: 2,
          laborRequired: 80,
          energyRequired: 80,
          unlockLevel: 2,
        },
      ],
    },
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
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    production: {
      inputs: [{ goodsId: GoodsId.SILICON, amount: 50 }, { goodsId: GoodsId.GLASS, amount: 30 }, { goodsId: GoodsId.ALUMINUM, amount: 20 }],
      outputs: [{ goodsId: GoodsId.SOLAR_PANEL, amount: 20 }],
      ticksRequired: 3,
      laborRequired: 80,
      energyRequired: 300,
      outputModes: [
        {
          modeId: 0,
          name: '光伏板生产',
          inputs: [{ goodsId: GoodsId.SILICON, amount: 50 }, { goodsId: GoodsId.GLASS, amount: 30 }, { goodsId: GoodsId.ALUMINUM, amount: 20 }],
          outputs: [{ goodsId: GoodsId.SOLAR_PANEL, amount: 20 }],
          ticksRequired: 3,
          laborRequired: 80,
          energyRequired: 300,
        },
        {
          modeId: 1,
          name: '风机叶片生产',
          inputs: [{ goodsId: GoodsId.ALUMINUM, amount: 50 }, { goodsId: GoodsId.PLASTIC, amount: 30 }],
          outputs: [{ goodsId: GoodsId.WIND_BLADE, amount: 8 }],
          ticksRequired: 4,
          laborRequired: 100,
          energyRequired: 350,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '工业机器人生产',
          inputs: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 30 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }, { goodsId: GoodsId.CHIPS, amount: 10 }],
          outputs: [{ goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 2 }],
          ticksRequired: 6,
          laborRequired: 150,
          energyRequired: 400,
          unlockLevel: 3,
        },
      ],
    },
    description: '生产光伏板、风机叶片和工业机器人',
  },
  {
    id: 35,
    key: 'pharma_factory',
    name: '制药厂',
    category: 'manufacturing',
    buildCost: 8000000,
    buildTime: 144,
    maintenanceCost: 20000,
    laborCost: 60000,
    energyCost: 25000,
    powerConsumption: 60,
    maxLevel: 5,
    upgradeCosts: [0, 3200000, 6400000, 12800000, 25600000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    production: {
      inputs: [{ goodsId: GoodsId.HERBS, amount: 50 }, { goodsId: GoodsId.CHEMICALS, amount: 20 }],
      outputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 30 }],
      ticksRequired: 3,
      laborRequired: 70,
      energyRequired: 250,
      outputModes: [
        {
          modeId: 0,
          name: '医药原料生产',
          inputs: [{ goodsId: GoodsId.HERBS, amount: 50 }, { goodsId: GoodsId.CHEMICALS, amount: 20 }],
          outputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 30 }],
          ticksRequired: 3,
          laborRequired: 70,
          energyRequired: 250,
        },
        {
          modeId: 1,
          name: '抗生素生产',
          inputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 30 }],
          outputs: [{ goodsId: GoodsId.ANTIBIOTICS, amount: 15 }],
          ticksRequired: 4,
          laborRequired: 100,
          energyRequired: 280,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '疫苗生产',
          inputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 50 }, { goodsId: GoodsId.CHEMICALS, amount: 30 }],
          outputs: [{ goodsId: GoodsId.VACCINE, amount: 10 }],
          ticksRequired: 8,
          laborRequired: 150,
          energyRequired: 400,
          unlockLevel: 3,
        },
        {
          modeId: 3,
          name: '仿制药生产',
          inputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 20 }],
          outputs: [{ goodsId: GoodsId.GENERIC_DRUG, amount: 100 }],
          ticksRequired: 3,
          laborRequired: 80,
          energyRequired: 200,
        },
        {
          modeId: 4,
          name: '专利药生产',
          inputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 40 }, { goodsId: GoodsId.CHEMICALS, amount: 20 }],
          outputs: [{ goodsId: GoodsId.PATENT_DRUG, amount: 20 }],
          ticksRequired: 5,
          laborRequired: 120,
          energyRequired: 300,
          unlockLevel: 2,
        },
        {
          modeId: 5,
          name: '非处方药生产',
          inputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 10 }],
          outputs: [{ goodsId: GoodsId.OTC_DRUG, amount: 80 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 150,
        },
      ],
    },
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
    capacityMultipliers: [1.0, 1.2, 1.4, 1.6, 1.9],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.PLASTIC, amount: 30 }, { goodsId: GoodsId.TEXTILES, amount: 20 }],
      outputs: [{ goodsId: GoodsId.MEDICAL_SUPPLIES, amount: 100 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 150,
      outputModes: [
        {
          modeId: 0,
          name: '医用耗材生产',
          inputs: [{ goodsId: GoodsId.PLASTIC, amount: 30 }, { goodsId: GoodsId.TEXTILES, amount: 20 }],
          outputs: [{ goodsId: GoodsId.MEDICAL_SUPPLIES, amount: 100 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 150,
        },
        {
          modeId: 1,
          name: '医疗设备生产',
          inputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 30 }, { goodsId: GoodsId.CHIPS, amount: 10 }, { goodsId: GoodsId.STEEL, amount: 20 }],
          outputs: [{ goodsId: GoodsId.MEDICAL_DEVICE, amount: 2 }],
          ticksRequired: 6,
          laborRequired: 100,
          energyRequired: 300,
          unlockLevel: 2,
        },
      ],
    },
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
    capacityMultipliers: [1.0, 1.2, 1.4, 1.6, 1.9],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [{ goodsId: GoodsId.GOLD_ORE, amount: 5 }],
      ticksRequired: 2,
      laborRequired: 60,
      energyRequired: 300,
      outputModes: [
        {
          modeId: 0,
          name: '金矿开采',
          inputs: [],
          outputs: [{ goodsId: GoodsId.GOLD_ORE, amount: 5 }],
          ticksRequired: 2,
          laborRequired: 60,
          energyRequired: 300,
        },
        {
          modeId: 1,
          name: '钻石矿开采',
          inputs: [],
          outputs: [{ goodsId: GoodsId.DIAMOND_ORE, amount: 2 }],
          ticksRequired: 3,
          laborRequired: 70,
          energyRequired: 350,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '黄金精炼',
          inputs: [{ goodsId: GoodsId.GOLD_ORE, amount: 10 }],
          outputs: [{ goodsId: GoodsId.GOLD, amount: 8 }],
          ticksRequired: 3,
          laborRequired: 40,
          energyRequired: 400,
          unlockLevel: 2,
        },
        {
          modeId: 3,
          name: '钻石切割',
          inputs: [{ goodsId: GoodsId.DIAMOND_ORE, amount: 5 }],
          outputs: [{ goodsId: GoodsId.DIAMOND, amount: 3 }],
          ticksRequired: 4,
          laborRequired: 50,
          energyRequired: 200,
          unlockLevel: 2,
        },
      ],
    },
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
    capacityMultipliers: [1.0, 1.2, 1.4, 1.6, 1.9],
    efficiencyMultipliers: [1.0, 1.1, 1.25, 1.4, 1.6],
    production: {
      inputs: [{ goodsId: GoodsId.GOLD, amount: 5 }, { goodsId: GoodsId.DIAMOND, amount: 2 }],
      outputs: [{ goodsId: GoodsId.JEWELRY, amount: 3 }],
      ticksRequired: 5,
      laborRequired: 80,
      energyRequired: 100,
      outputModes: [
        {
          modeId: 0,
          name: '珠宝制作',
          inputs: [{ goodsId: GoodsId.GOLD, amount: 5 }, { goodsId: GoodsId.DIAMOND, amount: 2 }],
          outputs: [{ goodsId: GoodsId.JEWELRY, amount: 3 }],
          ticksRequired: 5,
          laborRequired: 80,
          energyRequired: 100,
        },
        {
          modeId: 1,
          name: '奢侈腕表生产',
          inputs: [{ goodsId: GoodsId.GOLD, amount: 2 }, { goodsId: GoodsId.ELECTRONICS, amount: 5 }, { goodsId: GoodsId.GLASS, amount: 3 }],
          outputs: [{ goodsId: GoodsId.LUXURY_WATCH, amount: 2 }],
          ticksRequired: 8,
          laborRequired: 100,
          energyRequired: 80,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '设计师服装生产',
          inputs: [{ goodsId: GoodsId.SILK, amount: 20 }, { goodsId: GoodsId.TEXTILES, amount: 30 }],
          outputs: [{ goodsId: GoodsId.DESIGNER_CLOTHING, amount: 10 }],
          ticksRequired: 6,
          laborRequired: 120,
          energyRequired: 80,
          unlockLevel: 2,
        },
      ],
    },
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
    buildCost: 5000000,
    buildTime: 144,
    maintenanceCost: 15000,
    laborCost: 30000,
    energyCost: 0,
    powerConsumption: 0,  // 发电厂不消耗电力
    maxLevel: 5,
    upgradeCosts: [0, 2000000, 4000000, 8000000, 16000000],
    capacityMultipliers: [1.0, 1.3, 1.6, 2.0, 2.5],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.35, 1.5],
    production: {
      inputs: [{ goodsId: GoodsId.COAL, amount: 100 }],
      outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 500 }],
      ticksRequired: 1,
      laborRequired: 30,
      energyRequired: 0,
      outputModes: [
        {
          modeId: 0,
          name: '燃煤发电',
          inputs: [{ goodsId: GoodsId.COAL, amount: 100 }],
          outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 500 }],
          ticksRequired: 1,
          laborRequired: 30,
          energyRequired: 0,
        },
        {
          modeId: 1,
          name: '燃气发电',
          inputs: [{ goodsId: GoodsId.NATURAL_GAS, amount: 60 }],
          outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 400 }],
          ticksRequired: 1,
          laborRequired: 20,
          energyRequired: 0,
          unlockLevel: 2,
        },
        {
          modeId: 2,
          name: '光伏发电',
          inputs: [],
          outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 200 }],
          ticksRequired: 1,
          laborRequired: 10,
          energyRequired: 0,
          unlockLevel: 3,
        },
      ],
    },
    description: '发电供应工厂和市场',
  },
];

// ==================== 零售类建筑（ID 40，共1种）====================
export const RETAIL_BUILDINGS: BuildingTypeDefinition[] = [
  {
    id: 40,
    key: 'convenience_store',
    name: '便利店',
    category: 'retail',
    buildCost: 1200000,
    buildTime: 48,
    maintenanceCost: 3000,
    laborCost: 7000,
    energyCost: 2000,
    powerConsumption: 10,
    maxLevel: 5,
    upgradeCosts: [0, 360000, 720000, 1440000, 2880000],
    capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
    efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
    production: {
      inputs: [],
      outputs: [],
      ticksRequired: 1,
      laborRequired: 0,
      energyRequired: 0,
    },
    retailConfig: {
      maxInventorySlots: 12,
      inventoryCapacity: 200,
      customerCapacity: 80,
      markupRange: [0.1, 0.45],
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
];
export const RETAIL_BUILDINGS_LIST = RETAIL_BUILDINGS;

// 合并所有建筑（41种建筑，ID 0-40连续）
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
 * 获取建筑的生产配置
 * @param buildingTypeId 建筑类型ID
 * @param outputModeId 可选的产品模式ID，如果提供则返回该模式的生产配置
 */
export function getBuildingProduction(buildingTypeId: number, outputModeId?: number): {
  inputs: ProductionIO[];
  outputs: ProductionIO[];
  ticksRequired: number;
  laborRequired: number;
  energyRequired: number;
} | undefined {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  if (!building) return undefined;
  
  const production = building.production;
  
  // 如果指定了模式ID且建筑有多产品模式，则返回指定模式的配置
  if (outputModeId !== undefined && production.outputModes && production.outputModes.length > 0) {
    const mode = production.outputModes.find(m => m.modeId === outputModeId);
    if (mode) {
      return {
        inputs: mode.inputs,
        outputs: mode.outputs,
        ticksRequired: mode.ticksRequired ?? production.ticksRequired,
        laborRequired: mode.laborRequired ?? production.laborRequired,
        energyRequired: mode.energyRequired ?? production.energyRequired,
      };
    }
  }
  
  // 返回默认配置
  return {
    inputs: production.inputs,
    outputs: production.outputs,
    ticksRequired: production.ticksRequired,
    laborRequired: production.laborRequired,
    energyRequired: production.energyRequired,
  };
}

/**
 * 获取建筑的指定产品模式
 */
export function getBuildingOutputMode(buildingTypeId: number, modeId: number): OutputMode | undefined {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  if (!building?.production.outputModes) return undefined;
  return building.production.outputModes.find(m => m.modeId === modeId);
}

/**
 * 获取建筑可用的产品模式列表
 */
export function getAvailableOutputModes(buildingTypeId: number, level: number): OutputMode[] {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  if (!building?.production.outputModes) return [];
  return building.production.outputModes.filter(m => (m.unlockLevel ?? 1) <= level);
}

/**
 * 检查建筑是否有多产品模式
 */
export function hasMultipleOutputModes(buildingTypeId: number): boolean {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  return (building?.production.outputModes?.length ?? 0) > 1;
}

/**
 * 获取建筑总数
 */
export const BUILDING_COUNT = ALL_BUILDINGS.length; // 41
