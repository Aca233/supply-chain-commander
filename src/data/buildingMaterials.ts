/**
 * 建筑建造材料配置
 * 精简版本：仅包含44种核心建筑
 */

/** 材料需求定义 */
export interface MaterialRequirement {
  goodsId: number;
  amount: number;
  optional?: boolean;
}

/** 建筑建造配置 */
export interface BuildingConstructionConfig {
  buildingTypeId: number;
  baseMaterials: MaterialRequirement[];
  upgradeMaterials: MaterialRequirement[][];
  buildTime: number;
  unlockConditions?: {
    requiredBuildings?: number[];
    requiredLevel?: number;
    requiredTech?: string[];
  };
  workers?: number;
  isHazardous?: boolean;
}

// ==================== 商品ID常量（精简版，第二轮优化后） ====================
const GOODS = {
  // 原材料 (0-13)
  IRON_ORE: 0,
  COPPER_ORE: 1,
  BAUXITE: 2,
  COAL: 3,
  CRUDE_OIL: 4,
  NATURAL_GAS: 5,
  TIMBER: 6,
  COTTON: 7,
  GRAIN: 8,
  SILICON: 9,
  RARE_EARTH: 10,
  RUBBER_RAW: 11,
  CHEMICALS_RAW: 12,
  LITHIUM: 13,
  
  // 基础材料 (14-25，ID 24已删除)
  STEEL: 14,
  COPPER: 15,
  ALUMINUM: 16,
  GLASS: 17,
  PLASTIC: 18,
  RUBBER: 19,
  CHEMICALS: 20,
  CEMENT: 21,
  PAPER: 22,
  TEXTILES: 23,
  // ID 24 加工食品已删除，使用FOOD(44)替代
  FUEL: 25,
  
  // 中间产品 (26-37)
  ELECTRONICS: 26,
  CHIPS: 27,
  BATTERY: 28,
  MOTOR: 29,
  SCREEN: 30,
  MECHANICAL_PARTS: 31,
  CAR_PARTS: 32,
  AIRCRAFT_PARTS: 33,
  SOLAR_PANEL: 34,
  WIND_BLADE: 35,
  BUILDING_MATERIALS: 36,
  PACKAGING: 37,
  
  // 最终产品 (39-57，ID 38/48/53已删除)
  // ID 38 智能手机已删除，使用BUDGET_PHONE(56)或PREMIUM_PHONE(55)替代
  COMPUTER: 39,
  APPLIANCES: 40,
  CAR: 41,
  ELECTRIC_CAR: 42,
  CLOTHING: 43,
  FOOD: 44,
  BEVERAGES: 45,
  FURNITURE: 46,
  BUILDING_PRODUCTS: 47,
  // ID 48 医疗设备已删除，使用诊断设备(78)或手术设备(79)替代
  SOLAR_SYSTEM: 49,
  ENERGY_STORAGE: 50,
  INDUSTRIAL_ROBOT: 51,
  DRONE: 52,
  // ID 53 奢侈品泛称已删除，使用JEWELRY(54)等具体商品替代
  JEWELRY: 54,
  PREMIUM_PHONE: 55,
  BUDGET_PHONE: 56,
  ELECTRICITY: 57,
  
  // 医药产业链 (70-79)
  DIAGNOSTIC_EQUIPMENT: 78,
  SURGICAL_EQUIPMENT: 79,
};

// ==================== 采掘类建筑材料 (ID 0-7) ====================
const EXTRACTION_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 0, // 铁矿场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 500 },
      { goodsId: GOODS.TIMBER, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 300 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 100 },
      { goodsId: GOODS.MOTOR, amount: 10 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 200 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 400 }, { goodsId: GOODS.ELECTRONICS, amount: 30 }],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GOODS.STEEL, amount: 800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 48,
    workers: 50,
  },
  {
    buildingTypeId: 1, // 铜矿场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 900 },
      { goodsId: GOODS.CEMENT, amount: 550 },
      { goodsId: GOODS.TIMBER, amount: 280 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 350 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 120 },
      { goodsId: GOODS.MOTOR, amount: 12 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 120 },
      { goodsId: GOODS.CHEMICALS, amount: 30 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 250 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 500 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 750 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 6 }],
      [{ goodsId: GOODS.STEEL, amount: 1000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 }],
    ],
    buildTime: 48,
    workers: 55,
  },
  {
    buildingTypeId: 2, // 煤矿
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 600 },
      { goodsId: GOODS.CEMENT, amount: 400 },
      { goodsId: GOODS.TIMBER, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 250 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 80 },
      { goodsId: GOODS.MOTOR, amount: 15 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 80 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 150 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 300 }, { goodsId: GOODS.ELECTRONICS, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 450 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 }],
    ],
    buildTime: 36,
    workers: 60,
  },
  {
    buildingTypeId: 3, // 油田
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 300 },
      { goodsId: GOODS.RUBBER, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 500 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 100 }],
      [{ goodsId: GOODS.STEEL, amount: 1000 }, { goodsId: GOODS.ELECTRONICS, amount: 80 }],
      [{ goodsId: GOODS.STEEL, amount: 1500 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 2000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 96,
    workers: 100,
    isHazardous: true,
  },
  {
    buildingTypeId: 4, // 气田
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1800 },
      { goodsId: GOODS.CEMENT, amount: 700 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 550 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 180 },
      { goodsId: GOODS.MOTOR, amount: 25 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 250 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 450 }],
      [{ goodsId: GOODS.STEEL, amount: 900 }, { goodsId: GOODS.ELECTRONICS, amount: 70 }],
      [{ goodsId: GOODS.STEEL, amount: 1350 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 84,
    workers: 90,
    isHazardous: true,
  },
  {
    buildingTypeId: 5, // 伐木场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 200 },
      { goodsId: GOODS.CEMENT, amount: 150 },
      { goodsId: GOODS.TIMBER, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 100 },
      { goodsId: GOODS.MOTOR, amount: 5 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 50 },
      { goodsId: GOODS.FUEL, amount: 500 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 50 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 100 }, { goodsId: GOODS.MOTOR, amount: 3 }],
      [{ goodsId: GOODS.STEEL, amount: 150 }, { goodsId: GOODS.ELECTRONICS, amount: 20 }],
      [{ goodsId: GOODS.STEEL, amount: 200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 3 }],
    ],
    buildTime: 24,
    workers: 30,
  },
  {
    buildingTypeId: 6, // 农场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 150 },
      { goodsId: GOODS.CEMENT, amount: 200 },
      { goodsId: GOODS.TIMBER, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 120 },
      { goodsId: GOODS.MOTOR, amount: 8 },
      { goodsId: GOODS.PLASTIC, amount: 100 },
      { goodsId: GOODS.FUEL, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 50 }, { goodsId: GOODS.MOTOR, amount: 4 }],
      [{ goodsId: GOODS.STEEL, amount: 100 }, { goodsId: GOODS.ELECTRONICS, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 150 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 3 }],
      [{ goodsId: GOODS.STEEL, amount: 200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }],
    ],
    buildTime: 36,
    workers: 40,
  },
  {
    buildingTypeId: 7, // 硅石矿场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 850 },
      { goodsId: GOODS.CEMENT, amount: 520 },
      { goodsId: GOODS.TIMBER, amount: 250 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 320 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 110 },
      { goodsId: GOODS.MOTOR, amount: 10 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 110 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 220 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 55 }],
      [{ goodsId: GOODS.STEEL, amount: 440 }, { goodsId: GOODS.ELECTRONICS, amount: 35 }],
      [{ goodsId: GOODS.STEEL, amount: 660 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GOODS.STEEL, amount: 880 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 48,
    workers: 50,
  },
];

// ==================== 加工类建筑材料 (ID 8-15) ====================
const PROCESSING_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 8, // 钢铁厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 5000 },
      { goodsId: GOODS.CEMENT, amount: 3000 },
      { goodsId: GOODS.GLASS, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1500 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 500 },
      { goodsId: GOODS.MOTOR, amount: 50 },
      { goodsId: GOODS.ELECTRONICS, amount: 100 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 500 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 1500 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 }],
      [{ goodsId: GOODS.STEEL, amount: 3000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 4500 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GOODS.STEEL, amount: 6000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 30 }],
    ],
    buildTime: 96,
    workers: 200,
    isHazardous: true,
  },
  {
    buildingTypeId: 9, // 炼油厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 6000 },
      { goodsId: GOODS.CEMENT, amount: 2500 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1800 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 600 },
      { goodsId: GOODS.MOTOR, amount: 80 },
      { goodsId: GOODS.ELECTRONICS, amount: 200 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 600 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 1800 }],
      [{ goodsId: GOODS.STEEL, amount: 3600 }, { goodsId: GOODS.ELECTRONICS, amount: 150 }],
      [{ goodsId: GOODS.STEEL, amount: 5400 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 7200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 }],
    ],
    buildTime: 120,
    workers: 250,
    isHazardous: true,
  },
  {
    buildingTypeId: 10, // 化工厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 4000 },
      { goodsId: GOODS.CEMENT, amount: 2000 },
      { goodsId: GOODS.GLASS, amount: 600 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1200 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 400 },
      { goodsId: GOODS.MOTOR, amount: 60 },
      { goodsId: GOODS.ELECTRONICS, amount: 150 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 400 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 1200 }],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.ELECTRONICS, amount: 120 }],
      [{ goodsId: GOODS.STEEL, amount: 3600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 }],
      [{ goodsId: GOODS.STEEL, amount: 4800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 108,
    workers: 180,
    isHazardous: true,
  },
  {
    buildingTypeId: 11, // 玻璃厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1500 },
      { goodsId: GOODS.CEMENT, amount: 1000 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 450 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 150 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 450 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 80 }],
      [{ goodsId: GOODS.STEEL, amount: 900 }, { goodsId: GOODS.ELECTRONICS, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 1350 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 60,
    workers: 100,
    isHazardous: true,
  },
  {
    buildingTypeId: 12, // 纺织厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 600 },
      { goodsId: GOODS.TIMBER, amount: 300 },
      { goodsId: GOODS.GLASS, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 300 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 100 },
      { goodsId: GOODS.MOTOR, amount: 100 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 240 }, { goodsId: GOODS.MOTOR, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 480 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 720 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 960 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 48,
    workers: 150,
  },
  {
    buildingTypeId: 13, // 食品厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1000 },
      { goodsId: GOODS.CEMENT, amount: 700 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 350 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 120 },
      { goodsId: GOODS.MOTOR, amount: 40 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
      { goodsId: GOODS.PLASTIC, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 300 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 80 }],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.ELECTRONICS, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 900 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 48,
    workers: 120,
  },
  {
    buildingTypeId: 14, // 水泥厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 1500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GOODS.MOTOR, amount: 50 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 400 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 150 }],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.ELECTRONICS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 }],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 }],
    ],
    buildTime: 72,
    workers: 150,
  },
  {
    buildingTypeId: 15, // 铝冶炼厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 3000 },
      { goodsId: GOODS.CEMENT, amount: 1800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 900 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 300 },
      { goodsId: GOODS.MOTOR, amount: 40 },
      { goodsId: GOODS.ELECTRONICS, amount: 80 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 350 },
      { goodsId: GOODS.CHEMICALS, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 900 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.ELECTRONICS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 2700 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 3600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 84,
    workers: 160,
    isHazardous: true,
  },
];

// ==================== 制造类建筑材料 (ID 16-21) ====================
const MANUFACTURING_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 16, // 电子厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 3000 },
      { goodsId: GOODS.CEMENT, amount: 2000 },
      { goodsId: GOODS.GLASS, amount: 1000 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 900 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 300 },
      { goodsId: GOODS.MOTOR, amount: 50 },
      { goodsId: GOODS.ELECTRONICS, amount: 500 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 900 }, { goodsId: GOODS.ELECTRONICS, amount: 200 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 2700 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 3600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 40 }],
    ],
    buildTime: 120,
    workers: 300,
  },
  {
    buildingTypeId: 17, // 半导体厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 8000 },
      { goodsId: GOODS.CEMENT, amount: 5000 },
      { goodsId: GOODS.GLASS, amount: 3000 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 2400 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 800 },
      { goodsId: GOODS.MOTOR, amount: 100 },
      { goodsId: GOODS.ELECTRONICS, amount: 2000 },
      { goodsId: GOODS.CHIPS, amount: 500 },
      { goodsId: GOODS.CHEMICALS, amount: 500 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.ELECTRONICS, amount: 800 }],
      [{ goodsId: GOODS.STEEL, amount: 4800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GOODS.STEEL, amount: 7200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 35 }],
      [{ goodsId: GOODS.STEEL, amount: 9600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 50 }],
    ],
    buildTime: 240,
    workers: 500,
    unlockConditions: { requiredBuildings: [16, 10], requiredLevel: 5 },
  },
  {
    buildingTypeId: 18, // 汽车工厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 10000 },
      { goodsId: GOODS.CEMENT, amount: 6000 },
      { goodsId: GOODS.GLASS, amount: 2000 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 3000 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 1000 },
      { goodsId: GOODS.MOTOR, amount: 200 },
      { goodsId: GOODS.ELECTRONICS, amount: 500 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 1000 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 3000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 6000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 9000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 80 }],
      [{ goodsId: GOODS.STEEL, amount: 12000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 100 }],
    ],
    buildTime: 168,
    workers: 400,
  },
  {
    buildingTypeId: 19, // 家电厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2500 },
      { goodsId: GOODS.CEMENT, amount: 1500 },
      { goodsId: GOODS.GLASS, amount: 600 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 750 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 250 },
      { goodsId: GOODS.MOTOR, amount: 80 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 400 },
      { goodsId: GOODS.PLASTIC, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 750 }, { goodsId: GOODS.ELECTRONICS, amount: 120 }],
      [{ goodsId: GOODS.STEEL, amount: 1500 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 2250 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 3000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 35 }],
    ],
    buildTime: 96,
    workers: 250,
  },
  {
    buildingTypeId: 20, // 电池厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 4000 },
      { goodsId: GOODS.CEMENT, amount: 2500 },
      { goodsId: GOODS.GLASS, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1200 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 400 },
      { goodsId: GOODS.MOTOR, amount: 60 },
      { goodsId: GOODS.ELECTRONICS, amount: 400 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 350 },
      { goodsId: GOODS.CHEMICALS, amount: 200 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 30 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.ELECTRONICS, amount: 160 }],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 3600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 4800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 40 }],
    ],
    buildTime: 144,
    workers: 300,
    isHazardous: true,
  },
  {
    buildingTypeId: 21, // 零部件厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 1200 },
      { goodsId: GOODS.GLASS, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GOODS.MOTOR, amount: 100 },
      { goodsId: GOODS.ELECTRONICS, amount: 150 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 500 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 }],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 30 }],
    ],
    buildTime: 84,
    workers: 200,
  },
];

// ==================== 服务类建筑材料 (ID 22-24) ====================
const SERVICE_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 22, // 物流中心
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 1500 },
      { goodsId: GOODS.TIMBER, amount: 500 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.ELECTRONICS, amount: 100 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
      { goodsId: GOODS.DRONE, amount: 10 },
      { goodsId: GOODS.COMPUTER, amount: 15 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.MOTOR, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.ELECTRONICS, amount: 80 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 60,
    workers: 100,
  },
  {
    buildingTypeId: 23, // 仓储中心
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1500 },
      { goodsId: GOODS.CEMENT, amount: 1000 },
      { goodsId: GOODS.TIMBER, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 450 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 150 },
      { goodsId: GOODS.MOTOR, amount: 20 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 150 },
      { goodsId: GOODS.COMPUTER, amount: 10 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 450 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 900 }, { goodsId: GOODS.MOTOR, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 1350 }, { goodsId: GOODS.ELECTRONICS, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 48,
    workers: 60,
  },
  {
    buildingTypeId: 24, // 发电厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 8000 },
      { goodsId: GOODS.CEMENT, amount: 5000 },
      { goodsId: GOODS.GLASS, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 2400 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 800 },
      { goodsId: GOODS.MOTOR, amount: 100 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 600 },
      { goodsId: GOODS.SOLAR_SYSTEM, amount: 10 },
      { goodsId: GOODS.ENERGY_STORAGE, amount: 5 },
      { goodsId: GOODS.COMPUTER, amount: 20 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.SOLAR_SYSTEM, amount: 5 }],
      [{ goodsId: GOODS.STEEL, amount: 4800 }, { goodsId: GOODS.ELECTRONICS, amount: 200 }],
      [{ goodsId: GOODS.STEEL, amount: 7200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GOODS.STEEL, amount: 9600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 40 }],
    ],
    buildTime: 144,
    workers: 200,
    isHazardous: true,
  },
];

// ==================== 农业扩展建筑材料 (ID 25-28) ====================
const AGRICULTURE_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 25, // 蔬菜农场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 100 },
      { goodsId: GOODS.CEMENT, amount: 150 },
      { goodsId: GOODS.TIMBER, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 80 },
      { goodsId: GOODS.PLASTIC, amount: 200 },
      { goodsId: GOODS.MOTOR, amount: 5 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 30 }, { goodsId: GOODS.PLASTIC, amount: 100 }],
      [{ goodsId: GOODS.STEEL, amount: 60 }, { goodsId: GOODS.ELECTRONICS, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 90 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 2 }],
      [{ goodsId: GOODS.STEEL, amount: 120 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 4 }],
    ],
    buildTime: 24,
    workers: 30,
  },
  {
    buildingTypeId: 26, // 畜牧场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 200 },
      { goodsId: GOODS.CEMENT, amount: 300 },
      { goodsId: GOODS.TIMBER, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 120 },
      { goodsId: GOODS.MOTOR, amount: 8 },
      { goodsId: GOODS.FUEL, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 60 }, { goodsId: GOODS.MOTOR, amount: 4 }],
      [{ goodsId: GOODS.STEEL, amount: 120 }, { goodsId: GOODS.ELECTRONICS, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 180 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 3 }],
      [{ goodsId: GOODS.STEEL, amount: 240 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 6 }],
    ],
    buildTime: 36,
    workers: 40,
  },
  {
    buildingTypeId: 27, // 渔场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 300 },
      { goodsId: GOODS.CEMENT, amount: 400 },
      { goodsId: GOODS.PLASTIC, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 150 },
      { goodsId: GOODS.MOTOR, amount: 15 },
      { goodsId: GOODS.FUEL, amount: 400 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 90 }, { goodsId: GOODS.MOTOR, amount: 8 }],
      [{ goodsId: GOODS.STEEL, amount: 180 }, { goodsId: GOODS.ELECTRONICS, amount: 20 }],
      [{ goodsId: GOODS.STEEL, amount: 270 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 4 }],
      [{ goodsId: GOODS.STEEL, amount: 360 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 }],
    ],
    buildTime: 48,
    workers: 50,
  },
  {
    buildingTypeId: 28, // 肉类加工厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 600 },
      { goodsId: GOODS.GLASS, amount: 200 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 300 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 100 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 150 },
      { goodsId: GOODS.APPLIANCES, amount: 20 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 240 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 480 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 720 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GOODS.STEEL, amount: 960 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 60,
    workers: 100,
  },
];

// ==================== 医药建筑材料 (ID 29-31) ====================
const PHARMA_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 29, // 药材种植园
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 150 },
      { goodsId: GOODS.CEMENT, amount: 200 },
      { goodsId: GOODS.TIMBER, amount: 350 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 100 },
      { goodsId: GOODS.PLASTIC, amount: 150 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 45 }],
      [{ goodsId: GOODS.STEEL, amount: 90 }, { goodsId: GOODS.ELECTRONICS, amount: 12 }],
      [{ goodsId: GOODS.STEEL, amount: 135 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 2 }],
      [{ goodsId: GOODS.STEEL, amount: 180 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }],
    ],
    buildTime: 30,
    workers: 35,
  },
  {
    buildingTypeId: 30, // 制药厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2500 },
      { goodsId: GOODS.CEMENT, amount: 1800 },
      { goodsId: GOODS.GLASS, amount: 1000 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 800 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 250 },
      { goodsId: GOODS.MOTOR, amount: 40 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 250 },
      { goodsId: GOODS.CHEMICALS, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 750 }, { goodsId: GOODS.ELECTRONICS, amount: 120 }],
      [{ goodsId: GOODS.STEEL, amount: 1500 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 }],
      [{ goodsId: GOODS.STEEL, amount: 2250 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GOODS.STEEL, amount: 3000 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 30 }],
    ],
    buildTime: 108,
    workers: 180,
  },
  {
    buildingTypeId: 31, // 医疗器械厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 1500 },
      { goodsId: GOODS.GLASS, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 650 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GOODS.MOTOR, amount: 35 },
      { goodsId: GOODS.ELECTRONICS, amount: 400 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 300 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.ELECTRONICS, amount: 160 }],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 18 }],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 28 }],
    ],
    buildTime: 96,
    workers: 150,
  },
];

// ==================== 补全产业链建筑材料 (ID 32-34) ====================
const SUPPLEMENTARY_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 32, // 橡胶园
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 200 },
      { goodsId: GOODS.CEMENT, amount: 150 },
      { goodsId: GOODS.TIMBER, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 100 },
      { goodsId: GOODS.MOTOR, amount: 5 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 40 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 60 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 20 }],
      [{ goodsId: GOODS.STEEL, amount: 120 }, { goodsId: GOODS.ELECTRONICS, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 180 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 2 }],
      [{ goodsId: GOODS.STEEL, amount: 240 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 4 }],
    ],
    buildTime: 48,
    workers: 40,
  },
  {
    buildingTypeId: 33, // 锂矿场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1000 },
      { goodsId: GOODS.CEMENT, amount: 600 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 400 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 130 },
      { goodsId: GOODS.MOTOR, amount: 15 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 150 },
      { goodsId: GOODS.CHEMICALS, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 300 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.ELECTRONICS, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 900 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 72,
    workers: 70,
    isHazardous: true,
  },
  {
    buildingTypeId: 34, // 造纸厂
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 500 },
      { goodsId: GOODS.TIMBER, amount: 200 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 300 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 100 },
      { goodsId: GOODS.MOTOR, amount: 25 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 150 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 240 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 480 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 720 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 6 }],
      [{ goodsId: GOODS.STEEL, amount: 960 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 }],
    ],
    buildTime: 48,
    workers: 80,
  },
];

// ==================== 奢侈品建筑材料 (ID 35-36) ====================
const LUXURY_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 35, // 金矿
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1200 },
      { goodsId: GOODS.CEMENT, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 450 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 150 },
      { goodsId: GOODS.MOTOR, amount: 20 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 180 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 360 }, { goodsId: GOODS.MECHANICAL_PARTS, amount: 70 }],
      [{ goodsId: GOODS.STEEL, amount: 720 }, { goodsId: GOODS.ELECTRONICS, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 1080 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GOODS.STEEL, amount: 1440 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 72,
    workers: 80,
  },
  {
    buildingTypeId: 36, // 奢侈品工坊
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 500 },
      { goodsId: GOODS.CEMENT, amount: 400 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 200 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 80 },
      { goodsId: GOODS.ELECTRONICS, amount: 100 },
      { goodsId: GOODS.FURNITURE, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 150 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 300 }, { goodsId: GOODS.ELECTRONICS, amount: 80 }],
      [{ goodsId: GOODS.STEEL, amount: 450 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 48,
    workers: 50,
  },
];

// ==================== 零售类建筑材料 (ID 49-58) ====================
const RETAIL_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: 49, // 便利店
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 50 },
      { goodsId: GOODS.CEMENT, amount: 80 },
      { goodsId: GOODS.GLASS, amount: 100 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 30 },
      { goodsId: GOODS.ELECTRONICS, amount: 20 },
      { goodsId: GOODS.APPLIANCES, amount: 5 },
      { goodsId: GOODS.COMPUTER, amount: 2 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 15 }, { goodsId: GOODS.APPLIANCES, amount: 3 }],
      [{ goodsId: GOODS.STEEL, amount: 30 }, { goodsId: GOODS.ELECTRONICS, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 45 }, { goodsId: GOODS.ELECTRONICS, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 60 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
    ],
    buildTime: 12,
    workers: 10,
  },
  {
    buildingTypeId: 50, // 超市
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 300 },
      { goodsId: GOODS.CEMENT, amount: 400 },
      { goodsId: GOODS.GLASS, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 120 },
      { goodsId: GOODS.ELECTRONICS, amount: 50 },
      { goodsId: GOODS.APPLIANCES, amount: 20 },
      { goodsId: GOODS.FURNITURE, amount: 50 },
      { goodsId: GOODS.COMPUTER, amount: 8 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 90 }, { goodsId: GOODS.APPLIANCES, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 180 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 270 }, { goodsId: GOODS.ELECTRONICS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 360 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }],
    ],
    buildTime: 36,
    workers: 40,
  },
  {
    buildingTypeId: 51, // 大卖场
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1500 },
      { goodsId: GOODS.CEMENT, amount: 2000 },
      { goodsId: GOODS.GLASS, amount: 1500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.ELECTRONICS, amount: 200 },
      { goodsId: GOODS.APPLIANCES, amount: 100 },
      { goodsId: GOODS.FURNITURE, amount: 200 },
      { goodsId: GOODS.COMPUTER, amount: 30 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 450 }, { goodsId: GOODS.APPLIANCES, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 900 }, { goodsId: GOODS.ELECTRONICS, amount: 150 }],
      [{ goodsId: GOODS.STEEL, amount: 1350 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 72,
    workers: 100,
  },
  {
    buildingTypeId: 52, // 电子商城
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 500 },
      { goodsId: GOODS.CEMENT, amount: 600 },
      { goodsId: GOODS.GLASS, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 200 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      { goodsId: GOODS.FURNITURE, amount: 80 },
      { goodsId: GOODS.COMPUTER, amount: 20 },
      { goodsId: GOODS.BUDGET_PHONE, amount: 50 },
      { goodsId: GOODS.APPLIANCES, amount: 20 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 150 }, { goodsId: GOODS.ELECTRONICS, amount: 120 }],
      [{ goodsId: GOODS.STEEL, amount: 300 }, { goodsId: GOODS.ELECTRONICS, amount: 200 }],
      [{ goodsId: GOODS.STEEL, amount: 450 }, { goodsId: GOODS.ELECTRONICS, amount: 300 }],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.ELECTRONICS, amount: 400 }],
    ],
    buildTime: 48,
    workers: 50,
  },
  {
    buildingTypeId: 53, // 汽车4S店
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 2500 },
      { goodsId: GOODS.GLASS, amount: 2000 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 800 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 250 },
      { goodsId: GOODS.MOTOR, amount: 20 },
      { goodsId: GOODS.ELECTRONICS, amount: 150 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
      { goodsId: GOODS.FURNITURE, amount: 100 },
      { goodsId: GOODS.CAR, amount: 8 },
      { goodsId: GOODS.ELECTRIC_CAR, amount: 4 },
      { goodsId: GOODS.COMPUTER, amount: 10 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.CAR, amount: 4 }],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.ELECTRONICS, amount: 120 }],
      [{ goodsId: GOODS.STEEL, amount: 1800 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GOODS.STEEL, amount: 2400 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 96,
    workers: 80,
  },
  {
    buildingTypeId: 54, // 服装店
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 100 },
      { goodsId: GOODS.CEMENT, amount: 150 },
      { goodsId: GOODS.GLASS, amount: 200 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 50 },
      { goodsId: GOODS.ELECTRONICS, amount: 30 },
      { goodsId: GOODS.FURNITURE, amount: 60 },
      { goodsId: GOODS.CLOTHING, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 30 }, { goodsId: GOODS.FURNITURE, amount: 30 }],
      [{ goodsId: GOODS.STEEL, amount: 60 }, { goodsId: GOODS.ELECTRONICS, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 90 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 120 }, { goodsId: GOODS.ELECTRONICS, amount: 60 }],
    ],
    buildTime: 24,
    workers: 20,
  },
  {
    buildingTypeId: 55, // 奢侈品店
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 1000 },
      { goodsId: GOODS.GLASS, amount: 1200 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 350 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 120 },
      { goodsId: GOODS.ELECTRONICS, amount: 200 },
      { goodsId: GOODS.FURNITURE, amount: 150 },
      { goodsId: GOODS.JEWELRY, amount: 50 },
      { goodsId: GOODS.PREMIUM_PHONE, amount: 10 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 250 }, { goodsId: GOODS.FURNITURE, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 500 }, { goodsId: GOODS.ELECTRONICS, amount: 150 }],
      [{ goodsId: GOODS.STEEL, amount: 750 }, { goodsId: GOODS.ELECTRONICS, amount: 250 }],
      [{ goodsId: GOODS.STEEL, amount: 1000 }, { goodsId: GOODS.ELECTRONICS, amount: 350 }],
    ],
    buildTime: 60,
    workers: 40,
  },
  {
    buildingTypeId: 56, // 药店
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 80 },
      { goodsId: GOODS.CEMENT, amount: 120 },
      { goodsId: GOODS.GLASS, amount: 150 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 40 },
      { goodsId: GOODS.ELECTRONICS, amount: 40 },
      { goodsId: GOODS.APPLIANCES, amount: 10 },
      { goodsId: GOODS.FURNITURE, amount: 30 },
      { goodsId: GOODS.DIAGNOSTIC_EQUIPMENT, amount: 3 },
      { goodsId: GOODS.COMPUTER, amount: 2 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 25 }, { goodsId: GOODS.APPLIANCES, amount: 5 }],
      [{ goodsId: GOODS.STEEL, amount: 50 }, { goodsId: GOODS.ELECTRONICS, amount: 30 }],
      [{ goodsId: GOODS.STEEL, amount: 75 }, { goodsId: GOODS.ELECTRONICS, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 100 }, { goodsId: GOODS.ELECTRONICS, amount: 80 }],
    ],
    buildTime: 18,
    workers: 15,
  },
  {
    buildingTypeId: 57, // 加油站
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 400 },
      { goodsId: GOODS.CEMENT, amount: 600 },
      { goodsId: GOODS.GLASS, amount: 100 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 150 },
      { goodsId: GOODS.MOTOR, amount: 15 },
      { goodsId: GOODS.ELECTRONICS, amount: 60 },
      { goodsId: GOODS.ENERGY_STORAGE, amount: 2 },
      { goodsId: GOODS.COMPUTER, amount: 3 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 120 }, { goodsId: GOODS.MOTOR, amount: 8 }],
      [{ goodsId: GOODS.STEEL, amount: 240 }, { goodsId: GOODS.ELECTRONICS, amount: 50 }],
      [{ goodsId: GOODS.STEEL, amount: 360 }, { goodsId: GOODS.ELECTRONICS, amount: 80 }],
      [{ goodsId: GOODS.STEEL, amount: 480 }, { goodsId: GOODS.ELECTRONICS, amount: 120 }],
    ],
    buildTime: 36,
    workers: 25,
    isHazardous: true,
  },
  {
    buildingTypeId: 58, // 家居商城
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1000 },
      { goodsId: GOODS.CEMENT, amount: 1200 },
      { goodsId: GOODS.GLASS, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 400 },
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 130 },
      { goodsId: GOODS.MOTOR, amount: 15 },
      { goodsId: GOODS.ELECTRONICS, amount: 100 },
      { goodsId: GOODS.FURNITURE, amount: 300 },
      { goodsId: GOODS.APPLIANCES, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 300 }, { goodsId: GOODS.FURNITURE, amount: 120 }],
      [{ goodsId: GOODS.STEEL, amount: 600 }, { goodsId: GOODS.ELECTRONICS, amount: 80 }],
      [{ goodsId: GOODS.STEEL, amount: 900 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GOODS.STEEL, amount: 1200 }, { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 60,
    workers: 60,
  },
];

// ==================== 合并所有配置 ====================
const ALL_CONSTRUCTION_CONFIGS: BuildingConstructionConfig[] = [
  ...EXTRACTION_CONFIGS,
  ...PROCESSING_CONFIGS,
  ...MANUFACTURING_CONFIGS,
  ...SERVICE_CONFIGS,
  ...AGRICULTURE_CONFIGS,
  ...PHARMA_CONFIGS,
  ...SUPPLEMENTARY_CONFIGS,
  ...LUXURY_CONFIGS,
  ...RETAIL_CONFIGS,
];

// ==================== 导出配置 ====================

export const BUILDING_CONSTRUCTION_CONFIGS: Map<number, BuildingConstructionConfig> = new Map(
  ALL_CONSTRUCTION_CONFIGS.map(config => [config.buildingTypeId, config])
);

export function getBuildingConstructionConfig(buildingTypeId: number): BuildingConstructionConfig | undefined {
  return BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId);
}

export function getBaseMaterials(buildingTypeId: number): MaterialRequirement[] {
  return BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId)?.baseMaterials ?? [];
}

export function getUpgradeMaterials(buildingTypeId: number, targetLevel: number): MaterialRequirement[] {
  const config = BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId);
  if (!config || targetLevel < 1 || targetLevel >= config.upgradeMaterials.length) {
    return [];
  }
  return config.upgradeMaterials[targetLevel] ?? [];
}

export function isHazardousBuilding(buildingTypeId: number): boolean {
  return BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId)?.isHazardous ?? false;
}

export function getBuildTime(buildingTypeId: number): number {
  return BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId)?.buildTime ?? 24;
}

export function calculateMaterialsValue(
  materials: MaterialRequirement[],
  priceGetter: (goodsId: number) => number
): number {
  return materials.reduce((total, mat) => total + mat.amount * priceGetter(mat.goodsId), 0);
}