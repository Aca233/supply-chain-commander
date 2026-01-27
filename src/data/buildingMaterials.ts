/**
 * 建筑建造材料配置
 * 包含所有107种建筑的详细材料需求
 */

/** 材料需求定义 */
export interface MaterialRequirement {
  goodsId: number;     // 商品ID
  amount: number;      // 所需数量
  optional?: boolean;  // 是否可选（可用其他材料替代）
}

/** 建筑建造配置 */
export interface BuildingConstructionConfig {
  buildingTypeId: number;                    // 建筑类型ID
  baseMaterials: MaterialRequirement[];      // 基础建造材料
  upgradeMaterials: MaterialRequirement[][]; // 各等级升级材料 [level1, level2, ...]
  buildTime: number;                         // 建造时间（tick）
  unlockConditions?: {
    requiredBuildings?: number[];            // 前置建筑类型ID
    requiredLevel?: number;                  // 需要玩家等级
    requiredTech?: string[];                 // 需要解锁的科技
  };
  workers?: number;                          // 建造所需工人数
  isHazardous?: boolean;                     // 是否为危险建筑（影响拆除成本）
}

// ==================== 商品ID常量 ====================
// 基础材料
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
  
  // 基础材料 (14-25)
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
  PROCESSED_FOOD: 24,
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
  
  // 最终产品 (38-57)
  SMARTPHONE: 38,
  COMPUTER: 39,
  APPLIANCES: 40,
  CAR: 41,
  ELECTRIC_CAR: 42,
  CLOTHING: 43,
  FOOD: 44,
  BEVERAGES: 45,
  FURNITURE: 46,
  BUILDING_PRODUCTS: 47,
  MEDICAL_EQUIPMENT: 48,
  SOLAR_SYSTEM: 49,
  ENERGY_STORAGE: 50,
  INDUSTRIAL_ROBOT: 51,
  DRONE: 52,
  LUXURY_GOODS: 53,
  JEWELRY: 54,
  PREMIUM_PHONE: 55,
  BUDGET_PHONE: 56,
  ELECTRICITY: 57,
  
  // 军工 (80-87)
  SPECIAL_STEEL: 80,
  EXPLOSIVES: 81,
  ARMOR_PLATE: 82,
  MILITARY_ELECTRONICS: 83,
  SMALL_ARMS: 84,
  HEAVY_WEAPONS: 85,
  MILITARY_VEHICLE: 86,
  FIGHTER_JET: 87,
  
  // 交通运输设备 (116-127)
  TIRE: 116,
  CAR_SEAT: 117,
  SHIP_PARTS: 118,
  TRAIN_PARTS: 119,
  AIRCRAFT_ENGINE: 120,
  BICYCLE: 121,
  MOTORCYCLE: 122,
  ELECTRIC_SCOOTER: 123,
  SHIP: 124,
  TRAIN_CAR: 125,
  CIVIL_AIRCRAFT: 126,
  BUS: 127,
  
  // 纺织扩展 (140-149)
  WOOL: 140,
  FLAX: 141,
  LEATHER_RAW: 142,
  DOWN: 143,
  WOOL_YARN: 144,
  LINEN_FABRIC: 145,
  LEATHER: 146,
  WOOL_CLOTHING: 147,
  LEATHER_GOODS: 148,
  SHOES: 149,
  
  // 建材扩展 (150-159)
  CLAY: 150,
  MARBLE: 151,
  BRICK: 152,
  TILE: 153,
  WOOD_BOARD: 154,
  PAINT: 155,
  CERAMICS: 156,
  SANITARY_WARE: 157,
  TABLEWARE: 158,
  DECORATION: 159,
  
  // 能源扩展 (176-185)
  URANIUM_ORE: 176,
  BIOMASS: 177,
  NUCLEAR_FUEL: 178,
  HYDROGEN: 179,
  BIOFUEL: 180,
  NUCLEAR_REACTOR: 181,
  FUEL_CELL: 182,
  WIND_TURBINE: 183,
  TRANSFORMER: 184,
  POWER_CABLE: 185,
  
  // 通信 (186-195)
  OPTICAL_FIBER: 186,
  ANTENNA: 187,
  SENSOR: 188,
  MEMORY_CHIP: 189,
  DISPLAY_PANEL: 190,
  ROUTER: 191,
  BASE_STATION: 192,
  SATELLITE: 193,
  TABLET: 194,
  SMARTWATCH: 195,
  
  // 文化传媒 (210-219)
  PRINTING_INK: 210,
  FILM_EQUIPMENT: 211,
  BOOKS: 212,
  MAGAZINES: 213,
  MUSIC_ALBUM: 214,
  MOVIE: 215,
  VIDEO_GAME: 216,
  TOY: 217,
  SPORTS_EQUIPMENT: 218,
  MUSICAL_INSTRUMENT: 219,
  
  // 杂项 (220-229)
  ZIPPER: 220,
  BUTTONS: 221,
  PHOTORESIST: 222,
  INERT_GAS: 223,
  CATALYST: 224,
  ADHESIVE: 225,
  BEARING: 226,
  SPRING: 227,
  SEAL: 228,
  FILTER: 229,
};

// ==================== 采掘类建筑材料 (ID 0-7) ====================
const EXTRACTION_CONFIGS: BuildingConstructionConfig[] = [
  // 铁矿场 (ID: 0)
  {
    buildingTypeId: 0,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 500 },
      { goodsId: GOODS.TIMBER, amount: 300 },
      { goodsId: GOODS.BRICK, amount: 200 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 300 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 100 },   // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 5 },
      { goodsId: GOODS.TRANSFORMER, amount: 3 },
      { goodsId: GOODS.MOTOR, amount: 10 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 100 },
      { goodsId: GOODS.BEARING, amount: 200 },
      { goodsId: GOODS.SPRING, amount: 100 },
      { goodsId: GOODS.EXPLOSIVES, amount: 50 },
    ],
    upgradeMaterials: [
      [], // 1级无需材料
      [
        { goodsId: GOODS.STEEL, amount: 200 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 50 },
        { goodsId: GOODS.MOTOR, amount: 5 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 400 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 100 },
        { goodsId: GOODS.ELECTRONICS, amount: 30 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
        { goodsId: GOODS.ELECTRONICS, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
        { goodsId: GOODS.SENSOR, amount: 50 },
      ],
    ],
    buildTime: 48,
    workers: 50,
  },
  
  // 铜矿场 (ID: 1)
  {
    buildingTypeId: 1,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 900 },
      { goodsId: GOODS.CEMENT, amount: 550 },
      { goodsId: GOODS.TIMBER, amount: 280 },
      { goodsId: GOODS.BRICK, amount: 220 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 350 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 120 },   // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 6 },
      { goodsId: GOODS.TRANSFORMER, amount: 4 },
      { goodsId: GOODS.MOTOR, amount: 12 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 120 },
      { goodsId: GOODS.BEARING, amount: 250 },
      { goodsId: GOODS.EXPLOSIVES, amount: 60 },
      { goodsId: GOODS.CHEMICALS, amount: 30 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 250 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 60 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 500 },
        { goodsId: GOODS.ELECTRONICS, amount: 40 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 750 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 6 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 },
      ],
    ],
    buildTime: 48,
    workers: 55,
  },
  
  // 煤矿 (ID: 2)
  {
    buildingTypeId: 2,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 600 },
      { goodsId: GOODS.CEMENT, amount: 400 },
      { goodsId: GOODS.TIMBER, amount: 400 },
      { goodsId: GOODS.BRICK, amount: 150 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 250 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 80 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 8 },
      { goodsId: GOODS.TRANSFORMER, amount: 2 },
      { goodsId: GOODS.MOTOR, amount: 15 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 80 },
      { goodsId: GOODS.FILTER, amount: 50 },
      { goodsId: GOODS.SEAL, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 150 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 40 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 300 },
        { goodsId: GOODS.ELECTRONICS, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 450 },
        { goodsId: GOODS.SENSOR, amount: 30 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 },
      ],
    ],
    buildTime: 36,
    workers: 60,
  },
  
  // 油田 (ID: 3)
  {
    buildingTypeId: 3,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 800 },
      { goodsId: GOODS.SPECIAL_STEEL, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },   // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 15 },
      { goodsId: GOODS.TRANSFORMER, amount: 8 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 300 },
      { goodsId: GOODS.SEAL, amount: 500 },
      { goodsId: GOODS.FILTER, amount: 100 },
      { goodsId: GOODS.RUBBER, amount: 200 },
      { goodsId: GOODS.SENSOR, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 500 },
        { goodsId: GOODS.SPECIAL_STEEL, amount: 150 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 100 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1000 },
        { goodsId: GOODS.SPECIAL_STEEL, amount: 300 },
        { goodsId: GOODS.ELECTRONICS, amount: 80 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1500 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
    ],
    buildTime: 96,
    workers: 100,
    isHazardous: true,
  },
  
  // 气田 (ID: 4)
  {
    buildingTypeId: 4,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1800 },
      { goodsId: GOODS.CEMENT, amount: 700 },
      { goodsId: GOODS.SPECIAL_STEEL, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 550 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 180 },   // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 12 },
      { goodsId: GOODS.TRANSFORMER, amount: 6 },
      { goodsId: GOODS.MOTOR, amount: 25 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 250 },
      { goodsId: GOODS.SEAL, amount: 600 },
      { goodsId: GOODS.FILTER, amount: 80 },
      { goodsId: GOODS.SENSOR, amount: 80 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 450 },
        { goodsId: GOODS.SPECIAL_STEEL, amount: 120 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.ELECTRONICS, amount: 70 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1350 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
      ],
    ],
    buildTime: 84,
    workers: 90,
    isHazardous: true,
  },
  
  // 伐木场 (ID: 5)
  {
    buildingTypeId: 5,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 200 },
      { goodsId: GOODS.CEMENT, amount: 150 },
      { goodsId: GOODS.TIMBER, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 100 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 30 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 2 },
      { goodsId: GOODS.MOTOR, amount: 5 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 50 },
      { goodsId: GOODS.FUEL, amount: 500 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 50 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 100 },
        { goodsId: GOODS.MOTOR, amount: 3 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 150 },
        { goodsId: GOODS.ELECTRONICS, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 3 },
      ],
    ],
    buildTime: 24,
    workers: 30,
  },
  
  // 农场 (ID: 6)
  {
    buildingTypeId: 6,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 150 },
      { goodsId: GOODS.CEMENT, amount: 200 },
      { goodsId: GOODS.TIMBER, amount: 400 },
      { goodsId: GOODS.BRICK, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 120 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 40 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 3 },
      { goodsId: GOODS.MOTOR, amount: 8 },
      { goodsId: GOODS.PLASTIC, amount: 100 },
      { goodsId: GOODS.FUEL, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 50 },
        { goodsId: GOODS.MOTOR, amount: 4 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 100 },
        { goodsId: GOODS.ELECTRONICS, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 150 },
        { goodsId: GOODS.SENSOR, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
      ],
    ],
    buildTime: 36,
    workers: 40,
  },
  
  // 硅石矿场 (ID: 7)
  {
    buildingTypeId: 7,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 850 },
      { goodsId: GOODS.CEMENT, amount: 520 },
      { goodsId: GOODS.TIMBER, amount: 250 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 320 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 110 },   // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 5 },
      { goodsId: GOODS.TRANSFORMER, amount: 3 },
      { goodsId: GOODS.MOTOR, amount: 10 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 110 },
      { goodsId: GOODS.BEARING, amount: 220 },
      { goodsId: GOODS.EXPLOSIVES, amount: 55 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 220 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 55 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 440 },
        { goodsId: GOODS.ELECTRONICS, amount: 35 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 660 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 880 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
    ],
    buildTime: 48,
    workers: 50,
  },
];

// ==================== 加工类建筑材料 (ID 8-15) ====================
const PROCESSING_CONFIGS: BuildingConstructionConfig[] = [
  // 钢铁厂 (ID: 8)
  {
    buildingTypeId: 8,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 5000 },
      { goodsId: GOODS.CEMENT, amount: 3000 },
      { goodsId: GOODS.BRICK, amount: 1000 },
      { goodsId: GOODS.GLASS, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1500 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 500 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 30 },
      { goodsId: GOODS.TRANSFORMER, amount: 20 },
      { goodsId: GOODS.MOTOR, amount: 50 },
      { goodsId: GOODS.ELECTRONICS, amount: 100 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 500 },
      { goodsId: GOODS.BEARING, amount: 800 },
      { goodsId: GOODS.SPRING, amount: 300 },
      { goodsId: GOODS.SPECIAL_STEEL, amount: 1000 },
      { goodsId: GOODS.FILTER, amount: 200 },
      { goodsId: GOODS.SEAL, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 1500 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
        { goodsId: GOODS.MOTOR, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3000 },
        { goodsId: GOODS.ELECTRONICS, amount: 80 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 4500 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 6000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 30 },
      ],
    ],
    buildTime: 96,
    workers: 200,
    isHazardous: true,
  },
  
  // 炼油厂 (ID: 9)
  {
    buildingTypeId: 9,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 6000 },
      { goodsId: GOODS.CEMENT, amount: 2500 },
      { goodsId: GOODS.SPECIAL_STEEL, amount: 2000 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1800 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 600 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 40 },
      { goodsId: GOODS.TRANSFORMER, amount: 25 },
      { goodsId: GOODS.MOTOR, amount: 80 },
      { goodsId: GOODS.ELECTRONICS, amount: 200 },
      { goodsId: GOODS.SENSOR, amount: 100 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 600 },
      { goodsId: GOODS.SEAL, amount: 1000 },
      { goodsId: GOODS.FILTER, amount: 300 },
      { goodsId: GOODS.CATALYST, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.SPECIAL_STEEL, amount: 600 },
        { goodsId: GOODS.CATALYST, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3600 },
        { goodsId: GOODS.ELECTRONICS, amount: 150 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 5400 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 7200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 },
      ],
    ],
    buildTime: 120,
    workers: 250,
    isHazardous: true,
  },
  
  // 化工厂 (ID: 10)
  {
    buildingTypeId: 10,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 4000 },
      { goodsId: GOODS.CEMENT, amount: 2000 },
      { goodsId: GOODS.SPECIAL_STEEL, amount: 1500 },
      { goodsId: GOODS.GLASS, amount: 600 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1200 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 400 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 25 },
      { goodsId: GOODS.TRANSFORMER, amount: 15 },
      { goodsId: GOODS.MOTOR, amount: 60 },
      { goodsId: GOODS.ELECTRONICS, amount: 150 },
      { goodsId: GOODS.SENSOR, amount: 80 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 400 },
      { goodsId: GOODS.SEAL, amount: 800 },
      { goodsId: GOODS.FILTER, amount: 400 },
      { goodsId: GOODS.CATALYST, amount: 100 },
      { goodsId: GOODS.PAINT, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.SPECIAL_STEEL, amount: 450 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.ELECTRONICS, amount: 120 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3600 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 4800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
    ],
    buildTime: 108,
    workers: 180,
    isHazardous: true,
  },
  
  // 玻璃厂 (ID: 11)
  {
    buildingTypeId: 11,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1500 },
      { goodsId: GOODS.CEMENT, amount: 1000 },
      { goodsId: GOODS.BRICK, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 450 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 150 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 15 },
      { goodsId: GOODS.TRANSFORMER, amount: 10 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
      { goodsId: GOODS.BEARING, amount: 300 },
      { goodsId: GOODS.FILTER, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 450 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 80 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.ELECTRONICS, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1350 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
      ],
    ],
    buildTime: 60,
    workers: 100,
    isHazardous: true,
  },
  
  // 纺织厂 (ID: 12)
  {
    buildingTypeId: 12,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 600 },
      { goodsId: GOODS.TIMBER, amount: 300 },
      { goodsId: GOODS.GLASS, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 300 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 100 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 10 },
      { goodsId: GOODS.TRANSFORMER, amount: 5 },
      { goodsId: GOODS.MOTOR, amount: 100 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 300 },
      { goodsId: GOODS.BEARING, amount: 500 },
      { goodsId: GOODS.SPRING, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 240 },
        { goodsId: GOODS.MOTOR, amount: 40 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 480 },
        { goodsId: GOODS.ELECTRONICS, amount: 40 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 720 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 960 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
    ],
    buildTime: 48,
    workers: 150,
  },
  
  // 食品厂 (ID: 13)
  {
    buildingTypeId: 13,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1000 },
      { goodsId: GOODS.CEMENT, amount: 700 },
      { goodsId: GOODS.TILE, amount: 500 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 350 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 120 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 12 },
      { goodsId: GOODS.TRANSFORMER, amount: 6 },
      { goodsId: GOODS.MOTOR, amount: 40 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
      { goodsId: GOODS.FILTER, amount: 150 },
      { goodsId: GOODS.SEAL, amount: 200 },
      { goodsId: GOODS.PLASTIC, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 300 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 80 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.ELECTRONICS, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
    ],
    buildTime: 48,
    workers: 120,
  },
  
  // 水泥厂 (ID: 14)
  {
    buildingTypeId: 14,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 1500 },
      { goodsId: GOODS.BRICK, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 20 },
      { goodsId: GOODS.TRANSFORMER, amount: 12 },
      { goodsId: GOODS.MOTOR, amount: 50 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 400 },
      { goodsId: GOODS.BEARING, amount: 600 },
      { goodsId: GOODS.FILTER, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 150 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.ELECTRONICS, amount: 60 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 },
      ],
    ],
    buildTime: 72,
    workers: 150,
  },
  
  // 铝冶炼厂 (ID: 15)
  {
    buildingTypeId: 15,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 3000 },
      { goodsId: GOODS.CEMENT, amount: 1800 },
      { goodsId: GOODS.BRICK, amount: 600 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 900 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 300 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 50 },
      { goodsId: GOODS.TRANSFORMER, amount: 30 },
      { goodsId: GOODS.MOTOR, amount: 40 },
      { goodsId: GOODS.ELECTRONICS, amount: 80 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 350 },
      { goodsId: GOODS.FILTER, amount: 200 },
      { goodsId: GOODS.CHEMICALS, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.POWER_CABLE, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.ELECTRONICS, amount: 60 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2700 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3600 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
    ],
    buildTime: 84,
    workers: 160,
    isHazardous: true,
  },
];

// ==================== 制造类建筑材料 (ID 16-21) ====================
const MANUFACTURING_CONFIGS: BuildingConstructionConfig[] = [
  // 电子厂 (ID: 16)
  {
    buildingTypeId: 16,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 3000 },
      { goodsId: GOODS.CEMENT, amount: 2000 },
      { goodsId: GOODS.GLASS, amount: 1000 },
      { goodsId: GOODS.TILE, amount: 800 },
      { goodsId: GOODS.PAINT, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 900 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 300 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 30 },
      { goodsId: GOODS.TRANSFORMER, amount: 15 },
      { goodsId: GOODS.MOTOR, amount: 50 },
      { goodsId: GOODS.ELECTRONICS, amount: 500 },
      { goodsId: GOODS.SENSOR, amount: 100 },
      { goodsId: GOODS.FILTER, amount: 500 },
      { goodsId: GOODS.INERT_GAS, amount: 200 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.ELECTRONICS, amount: 200 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2700 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3600 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 40 },
      ],
    ],
    buildTime: 120,
    workers: 300,
  },
  
  // 半导体厂 (ID: 17)
  {
    buildingTypeId: 17,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 8000 },
      { goodsId: GOODS.CEMENT, amount: 5000 },
      { goodsId: GOODS.GLASS, amount: 3000 },
      { goodsId: GOODS.TILE, amount: 2000 },
      { goodsId: GOODS.PAINT, amount: 1000 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 2400 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 800 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 100 },
      { goodsId: GOODS.TRANSFORMER, amount: 50 },
      { goodsId: GOODS.MOTOR, amount: 100 },
      { goodsId: GOODS.ELECTRONICS, amount: 2000 },
      { goodsId: GOODS.CHIPS, amount: 500 },
      { goodsId: GOODS.SENSOR, amount: 500 },
      { goodsId: GOODS.PHOTORESIST, amount: 200 },
      { goodsId: GOODS.INERT_GAS, amount: 1000 },
      { goodsId: GOODS.FILTER, amount: 2000 },
      { goodsId: GOODS.CHEMICALS, amount: 500 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.ELECTRONICS, amount: 800 },
        { goodsId: GOODS.PHOTORESIST, amount: 80 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 4800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 7200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 35 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 9600 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 50 },
      ],
    ],
    buildTime: 240,
    workers: 500,
    unlockConditions: {
      requiredBuildings: [16, 10],
      requiredLevel: 5,
    },
  },
  
  // 汽车工厂 (ID: 18)
  {
    buildingTypeId: 18,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 10000 },
      { goodsId: GOODS.CEMENT, amount: 6000 },
      { goodsId: GOODS.GLASS, amount: 2000 },
      { goodsId: GOODS.PAINT, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 3000 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 1000 },   // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 60 },
      { goodsId: GOODS.TRANSFORMER, amount: 30 },
      { goodsId: GOODS.MOTOR, amount: 200 },
      { goodsId: GOODS.ELECTRONICS, amount: 500 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 1000 },
      { goodsId: GOODS.BEARING, amount: 1500 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 100 },
      { goodsId: GOODS.ADHESIVE, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 3000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 40 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 6000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 60 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 9000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 80 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 12000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 100 },
      ],
    ],
    buildTime: 168,
    workers: 400,
  },
  
  // 家电厂 (ID: 19)
  {
    buildingTypeId: 19,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2500 },
      { goodsId: GOODS.CEMENT, amount: 1500 },
      { goodsId: GOODS.GLASS, amount: 600 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 750 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 250 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 25 },
      { goodsId: GOODS.TRANSFORMER, amount: 12 },
      { goodsId: GOODS.MOTOR, amount: 80 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 400 },
      { goodsId: GOODS.BEARING, amount: 500 },
      { goodsId: GOODS.PLASTIC, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 750 },
        { goodsId: GOODS.ELECTRONICS, amount: 120 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1500 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2250 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 35 },
      ],
    ],
    buildTime: 96,
    workers: 250,
  },
  
  // 电池厂 (ID: 20)
  {
    buildingTypeId: 20,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 4000 },
      { goodsId: GOODS.CEMENT, amount: 2500 },
      { goodsId: GOODS.GLASS, amount: 800 },
      { goodsId: GOODS.TILE, amount: 600 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1200 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 400 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 40 },
      { goodsId: GOODS.TRANSFORMER, amount: 20 },
      { goodsId: GOODS.MOTOR, amount: 60 },
      { goodsId: GOODS.ELECTRONICS, amount: 400 },
      { goodsId: GOODS.SENSOR, amount: 150 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 350 },
      { goodsId: GOODS.FILTER, amount: 300 },
      { goodsId: GOODS.CHEMICALS, amount: 200 },
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 30 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.ELECTRONICS, amount: 160 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3600 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 4800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 40 },
      ],
    ],
    buildTime: 144,
    workers: 300,
    isHazardous: true,
  },
  
  // 零部件厂 (ID: 21)
  {
    buildingTypeId: 21,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 1200 },
      { goodsId: GOODS.GLASS, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 20 },
      { goodsId: GOODS.TRANSFORMER, amount: 10 },
      { goodsId: GOODS.MOTOR, amount: 100 },
      { goodsId: GOODS.ELECTRONICS, amount: 150 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 500 },
      { goodsId: GOODS.BEARING, amount: 800 },
      { goodsId: GOODS.SPRING, amount: 400 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 12 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 30 },
      ],
    ],
    buildTime: 84,
    workers: 200,
  },
];

// ==================== 服务类建筑材料 (ID 22-24) ====================
const SERVICE_CONFIGS: BuildingConstructionConfig[] = [
  // 物流中心 (ID: 22) - 添加无人机和公交车作为运输设备
  {
    buildingTypeId: 22,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 1500 },
      { goodsId: GOODS.TIMBER, amount: 500 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 15 },
      { goodsId: GOODS.TRANSFORMER, amount: 8 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.ELECTRONICS, amount: 100 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
      // 新增：物流运输设备
      { goodsId: GOODS.DRONE, amount: 10 },           // 配送无人机
      { goodsId: GOODS.BUS, amount: 2 },              // 货运车辆
      { goodsId: GOODS.COMPUTER, amount: 15 },        // 物流管理系统电脑
      { goodsId: GOODS.ROUTER, amount: 10 },          // 网络设备
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.MOTOR, amount: 15 },
        { goodsId: GOODS.DRONE, amount: 5 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.ELECTRONICS, amount: 80 },
        { goodsId: GOODS.DRONE, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
        { goodsId: GOODS.BUS, amount: 1 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
        { goodsId: GOODS.DRONE, amount: 15 },
      ],
    ],
    buildTime: 60,
    workers: 100,
  },
  
  // 仓储中心 (ID: 23) - 添加工业机器人和电脑
  {
    buildingTypeId: 23,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1500 },
      { goodsId: GOODS.CEMENT, amount: 1000 },
      { goodsId: GOODS.TIMBER, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 450 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 150 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 10 },
      { goodsId: GOODS.TRANSFORMER, amount: 5 },
      { goodsId: GOODS.MOTOR, amount: 20 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 150 },
      // 新增：仓库管理设备
      { goodsId: GOODS.COMPUTER, amount: 10 },        // 仓库管理系统
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 }, // 自动分拣机器人
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 450 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 60 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.MOTOR, amount: 10 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 3 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1350 },
        { goodsId: GOODS.ELECTRONICS, amount: 50 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
    ],
    buildTime: 48,
    workers: 60,
  },
  
  // 发电厂 (ID: 24) - 添加光伏系统和储能系统
  {
    buildingTypeId: 24,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 8000 },
      { goodsId: GOODS.CEMENT, amount: 5000 },
      { goodsId: GOODS.BRICK, amount: 1000 },
      { goodsId: GOODS.GLASS, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 2400 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 800 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 100 },
      { goodsId: GOODS.TRANSFORMER, amount: 50 },
      { goodsId: GOODS.MOTOR, amount: 100 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      { goodsId: GOODS.SENSOR, amount: 200 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 600 },
      { goodsId: GOODS.BEARING, amount: 800 },
      { goodsId: GOODS.FILTER, amount: 400 },
      // 新增：新能源设备
      { goodsId: GOODS.SOLAR_SYSTEM, amount: 10 },    // 光伏发电系统
      { goodsId: GOODS.ENERGY_STORAGE, amount: 5 },   // 储能系统
      { goodsId: GOODS.WIND_TURBINE, amount: 3 },     // 风力发电机
      { goodsId: GOODS.COMPUTER, amount: 20 },        // 电力监控系统
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.TRANSFORMER, amount: 20 },
        { goodsId: GOODS.SOLAR_SYSTEM, amount: 5 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 4800 },
        { goodsId: GOODS.ELECTRONICS, amount: 200 },
        { goodsId: GOODS.ENERGY_STORAGE, amount: 3 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 7200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
        { goodsId: GOODS.SOLAR_SYSTEM, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 9600 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 40 },
        { goodsId: GOODS.ENERGY_STORAGE, amount: 5 },
      ],
    ],
    buildTime: 144,
    workers: 200,
    isHazardous: true,
  },
];

// ==================== 零售类建筑材料 (ID 49-58) ====================
const RETAIL_CONFIGS: BuildingConstructionConfig[] = [
  // 便利店 (ID: 49) - 添加冰柜和收银设备
  {
    buildingTypeId: 49,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 50 },
      { goodsId: GOODS.CEMENT, amount: 80 },
      { goodsId: GOODS.BRICK, amount: 100 },
      { goodsId: GOODS.GLASS, amount: 100 },
      { goodsId: GOODS.TILE, amount: 50 },
      { goodsId: GOODS.PAINT, amount: 30 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 30 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 10 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 1 },
      { goodsId: GOODS.ELECTRONICS, amount: 20 },
      { goodsId: GOODS.APPLIANCES, amount: 5 },         // 冰柜等家电
      // 新增：收银和管理设备
      { goodsId: GOODS.COMPUTER, amount: 2 },           // 收银电脑
      { goodsId: GOODS.ROUTER, amount: 1 },             // 网络设备
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 15 },
        { goodsId: GOODS.APPLIANCES, amount: 3 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 30 },
        { goodsId: GOODS.ELECTRONICS, amount: 15 },
        { goodsId: GOODS.COMPUTER, amount: 1 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 45 },
        { goodsId: GOODS.ELECTRONICS, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 60 },
        { goodsId: GOODS.ELECTRONICS, amount: 40 },
      ],
    ],
    buildTime: 12,
    workers: 10,
  },
  
  // 超市 (ID: 50) - 添加冷藏设备和收银系统
  {
    buildingTypeId: 50,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 300 },
      { goodsId: GOODS.CEMENT, amount: 400 },
      { goodsId: GOODS.BRICK, amount: 300 },
      { goodsId: GOODS.GLASS, amount: 400 },
      { goodsId: GOODS.TILE, amount: 200 },
      { goodsId: GOODS.PAINT, amount: 100 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 120 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 40 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 5 },
      { goodsId: GOODS.TRANSFORMER, amount: 2 },
      { goodsId: GOODS.ELECTRONICS, amount: 50 },
      { goodsId: GOODS.APPLIANCES, amount: 20 },        // 冰柜冷藏柜
      { goodsId: GOODS.FURNITURE, amount: 50 },         // 货架
      // 新增：收银和监控设备
      { goodsId: GOODS.COMPUTER, amount: 8 },           // 收银电脑
      { goodsId: GOODS.ROUTER, amount: 3 },             // 网络设备
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 90 },
        { goodsId: GOODS.APPLIANCES, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 180 },
        { goodsId: GOODS.ELECTRONICS, amount: 40 },
        { goodsId: GOODS.COMPUTER, amount: 4 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 270 },
        { goodsId: GOODS.ELECTRONICS, amount: 60 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 360 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
      ],
    ],
    buildTime: 36,
    workers: 40,
  },
  
  // 大卖场 (ID: 51) - 添加购物车和自助收银
  {
    buildingTypeId: 51,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1500 },
      { goodsId: GOODS.CEMENT, amount: 2000 },
      { goodsId: GOODS.BRICK, amount: 800 },
      { goodsId: GOODS.GLASS, amount: 1500 },
      { goodsId: GOODS.TILE, amount: 1000 },
      { goodsId: GOODS.PAINT, amount: 500 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 20 },
      { goodsId: GOODS.TRANSFORMER, amount: 10 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.ELECTRONICS, amount: 200 },
      { goodsId: GOODS.APPLIANCES, amount: 100 },       // 大型冷藏设备
      { goodsId: GOODS.FURNITURE, amount: 200 },        // 货架展柜
      // 新增：收银和管理系统
      { goodsId: GOODS.COMPUTER, amount: 30 },          // 收银和管理电脑
      { goodsId: GOODS.ROUTER, amount: 15 },            // 网络设备
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },   // 自助收银机器人
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 450 },
        { goodsId: GOODS.APPLIANCES, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.ELECTRONICS, amount: 150 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 3 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1350 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
      ],
    ],
    buildTime: 72,
    workers: 100,
  },
  
  // 电子商城 (ID: 52) - 添加展示电子产品
  {
    buildingTypeId: 52,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 500 },
      { goodsId: GOODS.CEMENT, amount: 600 },
      { goodsId: GOODS.GLASS, amount: 800 },
      { goodsId: GOODS.TILE, amount: 400 },
      { goodsId: GOODS.PAINT, amount: 200 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 200 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 70 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 15 },
      { goodsId: GOODS.TRANSFORMER, amount: 8 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      { goodsId: GOODS.FURNITURE, amount: 80 },
      // 新增：展示电子产品
      { goodsId: GOODS.COMPUTER, amount: 20 },          // 展示电脑
      { goodsId: GOODS.SMARTPHONE, amount: 50 },        // 展示手机
      { goodsId: GOODS.TABLET, amount: 20 },            // 展示平板
      { goodsId: GOODS.ROUTER, amount: 30 },            // 展示路由器
      { goodsId: GOODS.SMARTWATCH, amount: 30 },        // 展示智能手表
      { goodsId: GOODS.APPLIANCES, amount: 20 },        // 展示家电
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 150 },
        { goodsId: GOODS.ELECTRONICS, amount: 120 },
        { goodsId: GOODS.SMARTPHONE, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 300 },
        { goodsId: GOODS.ELECTRONICS, amount: 200 },
        { goodsId: GOODS.COMPUTER, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 450 },
        { goodsId: GOODS.ELECTRONICS, amount: 300 },
        { goodsId: GOODS.TABLET, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.ELECTRONICS, amount: 400 },
        { goodsId: GOODS.SMARTWATCH, amount: 15 },
      ],
    ],
    buildTime: 48,
    workers: 50,
  },
  
  // 汽车4S店 (ID: 53) - 添加展示汽车
  {
    buildingTypeId: 53,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2000 },
      { goodsId: GOODS.CEMENT, amount: 2500 },
      { goodsId: GOODS.GLASS, amount: 2000 },
      { goodsId: GOODS.TILE, amount: 800 },
      { goodsId: GOODS.PAINT, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 800 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 250 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 25 },
      { goodsId: GOODS.TRANSFORMER, amount: 12 },
      { goodsId: GOODS.MOTOR, amount: 20 },
      { goodsId: GOODS.ELECTRONICS, amount: 150 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 200 },
      { goodsId: GOODS.FURNITURE, amount: 100 },
      // 新增：展示车辆和维修设备
      { goodsId: GOODS.CAR, amount: 8 },                // 展示汽车
      { goodsId: GOODS.ELECTRIC_CAR, amount: 4 },       // 展示电动汽车
      { goodsId: GOODS.MOTORCYCLE, amount: 6 },         // 展示摩托车
      { goodsId: GOODS.COMPUTER, amount: 10 },          // 销售和管理电脑
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 2 },   // 维修机器人
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.MECHANICAL_PARTS, amount: 80 },
        { goodsId: GOODS.CAR, amount: 4 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.ELECTRONICS, amount: 120 },
        { goodsId: GOODS.ELECTRIC_CAR, amount: 2 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1800 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
        { goodsId: GOODS.CAR, amount: 4 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
        { goodsId: GOODS.ELECTRIC_CAR, amount: 4 },
      ],
    ],
    buildTime: 96,
    workers: 80,
  },
  
  // 服装店 (ID: 54) - 添加展示服装和鞋子
  {
    buildingTypeId: 54,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 100 },
      { goodsId: GOODS.CEMENT, amount: 150 },
      { goodsId: GOODS.GLASS, amount: 200 },
      { goodsId: GOODS.TILE, amount: 100 },
      { goodsId: GOODS.PAINT, amount: 80 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 50 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 15 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 3 },
      { goodsId: GOODS.ELECTRONICS, amount: 30 },
      { goodsId: GOODS.FURNITURE, amount: 60 },
      // 新增：展示服装产品
      { goodsId: GOODS.CLOTHING, amount: 100 },         // 展示服装
      { goodsId: GOODS.SHOES, amount: 50 },             // 展示鞋子
      { goodsId: GOODS.LEATHER_GOODS, amount: 20 },     // 展示皮具
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 30 },
        { goodsId: GOODS.FURNITURE, amount: 30 },
        { goodsId: GOODS.CLOTHING, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 60 },
        { goodsId: GOODS.ELECTRONICS, amount: 25 },
        { goodsId: GOODS.SHOES, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 90 },
        { goodsId: GOODS.ELECTRONICS, amount: 40 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 120 },
        { goodsId: GOODS.ELECTRONICS, amount: 60 },
      ],
    ],
    buildTime: 24,
    workers: 20,
  },
  
  // 奢侈品店 (ID: 55) - 添加展示奢侈品
  {
    buildingTypeId: 55,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 1000 },
      { goodsId: GOODS.GLASS, amount: 1200 },
      { goodsId: GOODS.MARBLE, amount: 500 },
      { goodsId: GOODS.TILE, amount: 600 },
      { goodsId: GOODS.PAINT, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 350 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 120 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 10 },
      { goodsId: GOODS.TRANSFORMER, amount: 5 },
      { goodsId: GOODS.ELECTRONICS, amount: 200 },
      { goodsId: GOODS.FURNITURE, amount: 150 },
      // 新增：展示奢侈品
      { goodsId: GOODS.LUXURY_GOODS, amount: 30 },      // 展示奢侈品
      { goodsId: GOODS.JEWELRY, amount: 20 },           // 展示珠宝
      { goodsId: GOODS.PREMIUM_PHONE, amount: 10 },     // 展示高端手机
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.MARBLE, amount: 200 },
        { goodsId: GOODS.FURNITURE, amount: 60 },
        { goodsId: GOODS.JEWELRY, amount: 10 },
      ],
      [
        { goodsId: GOODS.MARBLE, amount: 400 },
        { goodsId: GOODS.ELECTRONICS, amount: 150 },
        { goodsId: GOODS.LUXURY_GOODS, amount: 15 },
      ],
      [
        { goodsId: GOODS.MARBLE, amount: 600 },
        { goodsId: GOODS.ELECTRONICS, amount: 250 },
      ],
      [
        { goodsId: GOODS.MARBLE, amount: 800 },
        { goodsId: GOODS.ELECTRONICS, amount: 350 },
      ],
    ],
    buildTime: 60,
    workers: 40,
  },
  
  // 药店 (ID: 56) - 添加医疗设备
  {
    buildingTypeId: 56,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 80 },
      { goodsId: GOODS.CEMENT, amount: 120 },
      { goodsId: GOODS.GLASS, amount: 150 },
      { goodsId: GOODS.TILE, amount: 100 },
      { goodsId: GOODS.PAINT, amount: 50 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 40 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 12 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 2 },
      { goodsId: GOODS.ELECTRONICS, amount: 40 },
      { goodsId: GOODS.APPLIANCES, amount: 10 },        // 冷藏柜
      { goodsId: GOODS.FURNITURE, amount: 30 },
      // 新增：医疗检测设备
      { goodsId: GOODS.MEDICAL_EQUIPMENT, amount: 3 },  // 血压计、血糖仪等
      { goodsId: GOODS.COMPUTER, amount: 2 },           // 管理电脑
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 25 },
        { goodsId: GOODS.APPLIANCES, amount: 5 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 50 },
        { goodsId: GOODS.ELECTRONICS, amount: 30 },
        { goodsId: GOODS.MEDICAL_EQUIPMENT, amount: 2 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 75 },
        { goodsId: GOODS.ELECTRONICS, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 100 },
        { goodsId: GOODS.ELECTRONICS, amount: 80 },
        { goodsId: GOODS.MEDICAL_EQUIPMENT, amount: 3 },
      ],
    ],
    buildTime: 18,
    workers: 15,
  },
  
  // 加油站 (ID: 57) - 保持原有配置
  {
    buildingTypeId: 57,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 400 },
      { goodsId: GOODS.CEMENT, amount: 600 },
      { goodsId: GOODS.SPECIAL_STEEL, amount: 200 },
      { goodsId: GOODS.GLASS, amount: 100 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 150 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 50 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 8 },
      { goodsId: GOODS.TRANSFORMER, amount: 3 },
      { goodsId: GOODS.MOTOR, amount: 15 },
      { goodsId: GOODS.ELECTRONICS, amount: 60 },
      { goodsId: GOODS.SEAL, amount: 200 },
      { goodsId: GOODS.FILTER, amount: 50 },
      // 新增：充电设备
      { goodsId: GOODS.ENERGY_STORAGE, amount: 2 },     // 充电桩储能
      { goodsId: GOODS.COMPUTER, amount: 3 },           // 支付终端
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 120 },
        { goodsId: GOODS.MOTOR, amount: 8 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 240 },
        { goodsId: GOODS.ELECTRONICS, amount: 50 },
        { goodsId: GOODS.ENERGY_STORAGE, amount: 1 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 360 },
        { goodsId: GOODS.ELECTRONICS, amount: 80 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 480 },
        { goodsId: GOODS.ELECTRONICS, amount: 120 },
        { goodsId: GOODS.ENERGY_STORAGE, amount: 2 },
      ],
    ],
    buildTime: 36,
    workers: 25,
    isHazardous: true,
  },
  
  // 家居商城 (ID: 58) - 添加展示家具和卫浴
  {
    buildingTypeId: 58,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1000 },
      { goodsId: GOODS.CEMENT, amount: 1200 },
      { goodsId: GOODS.GLASS, amount: 800 },
      { goodsId: GOODS.TILE, amount: 600 },
      { goodsId: GOODS.PAINT, amount: 400 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 400 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 130 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 15 },
      { goodsId: GOODS.TRANSFORMER, amount: 8 },
      { goodsId: GOODS.MOTOR, amount: 15 },
      { goodsId: GOODS.ELECTRONICS, amount: 100 },
      { goodsId: GOODS.FURNITURE, amount: 300 },        // 展示家具
      // 新增：展示家居产品
      { goodsId: GOODS.SANITARY_WARE, amount: 30 },     // 展示卫浴设备
      { goodsId: GOODS.APPLIANCES, amount: 50 },        // 展示家电
      { goodsId: GOODS.DECORATION, amount: 50 },        // 展示装饰品
      { goodsId: GOODS.TABLEWARE, amount: 30 },         // 展示餐具
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 300 },
        { goodsId: GOODS.FURNITURE, amount: 120 },
        { goodsId: GOODS.SANITARY_WARE, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.ELECTRONICS, amount: 80 },
        { goodsId: GOODS.APPLIANCES, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 8 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
      ],
    ],
    buildTime: 60,
    workers: 60,
  },
];

// ==================== 扩展零售店配置 (ID 101-106) ====================
const EXTENDED_RETAIL_CONFIGS: BuildingConstructionConfig[] = [
  // 化妆品店 (ID: 101)
  {
    buildingTypeId: 101,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 150 },
      { goodsId: GOODS.CEMENT, amount: 200 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.TILE, amount: 150 },
      { goodsId: GOODS.PAINT, amount: 100 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 60 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 20 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 4 },
      { goodsId: GOODS.ELECTRONICS, amount: 50 },
      { goodsId: GOODS.FURNITURE, amount: 80 },
      { goodsId: GOODS.COMPUTER, amount: 3 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.STEEL, amount: 50 }, { goodsId: GOODS.FURNITURE, amount: 30 }],
      [{ goodsId: GOODS.STEEL, amount: 100 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 150 }, { goodsId: GOODS.ELECTRONICS, amount: 60 }],
      [{ goodsId: GOODS.STEEL, amount: 200 }, { goodsId: GOODS.ELECTRONICS, amount: 80 }],
    ],
    buildTime: 30,
    workers: 20,
  },
  
  // 书店 (ID: 102)
  {
    buildingTypeId: 102,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 100 },
      { goodsId: GOODS.CEMENT, amount: 150 },
      { goodsId: GOODS.GLASS, amount: 150 },
      { goodsId: GOODS.TILE, amount: 100 },
      { goodsId: GOODS.PAINT, amount: 60 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 45 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 15 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 2 },
      { goodsId: GOODS.ELECTRONICS, amount: 20 },
      { goodsId: GOODS.FURNITURE, amount: 100 },        // 书架
      { goodsId: GOODS.BOOKS, amount: 200 },            // 展示图书
      { goodsId: GOODS.COMPUTER, amount: 2 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.FURNITURE, amount: 50 }, { goodsId: GOODS.BOOKS, amount: 100 }],
      [{ goodsId: GOODS.STEEL, amount: 50 }, { goodsId: GOODS.ELECTRONICS, amount: 15 }],
      [{ goodsId: GOODS.STEEL, amount: 75 }, { goodsId: GOODS.ELECTRONICS, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 100 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
    ],
    buildTime: 24,
    workers: 15,
  },
  
  // 酒类专卖店 (ID: 103)
  {
    buildingTypeId: 103,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 120 },
      { goodsId: GOODS.CEMENT, amount: 180 },
      { goodsId: GOODS.GLASS, amount: 200 },
      { goodsId: GOODS.TILE, amount: 120 },
      { goodsId: GOODS.PAINT, amount: 70 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 55 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 18 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 3 },
      { goodsId: GOODS.ELECTRONICS, amount: 30 },
      { goodsId: GOODS.FURNITURE, amount: 70 },
      { goodsId: GOODS.APPLIANCES, amount: 5 },         // 恒温酒柜
      { goodsId: GOODS.COMPUTER, amount: 2 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GOODS.FURNITURE, amount: 30 }, { goodsId: GOODS.APPLIANCES, amount: 3 }],
      [{ goodsId: GOODS.STEEL, amount: 60 }, { goodsId: GOODS.ELECTRONICS, amount: 25 }],
      [{ goodsId: GOODS.STEEL, amount: 90 }, { goodsId: GOODS.ELECTRONICS, amount: 40 }],
      [{ goodsId: GOODS.STEEL, amount: 120 }, { goodsId: GOODS.ELECTRONICS, amount: 60 }],
    ],
    buildTime: 28,
    workers: 18,
  },
  
  // 体育用品店 (ID: 104) - 添加展示自行车和运动器材
  {
    buildingTypeId: 104,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 200 },
      { goodsId: GOODS.CEMENT, amount: 250 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.TILE, amount: 150 },
      { goodsId: GOODS.PAINT, amount: 100 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 80 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 25 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 5 },
      { goodsId: GOODS.ELECTRONICS, amount: 40 },
      { goodsId: GOODS.FURNITURE, amount: 80 },
      // 新增：展示体育产品
      { goodsId: GOODS.BICYCLE, amount: 15 },           // 展示自行车
      { goodsId: GOODS.ELECTRIC_SCOOTER, amount: 10 },  // 展示电动滑板车
      { goodsId: GOODS.SPORTS_EQUIPMENT, amount: 30 },  // 展示运动器材
      { goodsId: GOODS.SHOES, amount: 50 },             // 展示运动鞋
      { goodsId: GOODS.COMPUTER, amount: 3 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.FURNITURE, amount: 40 },
        { goodsId: GOODS.BICYCLE, amount: 8 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 100 },
        { goodsId: GOODS.ELECTRONICS, amount: 30 },
        { goodsId: GOODS.SPORTS_EQUIPMENT, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 150 },
        { goodsId: GOODS.ELECTRONICS, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 200 },
        { goodsId: GOODS.ELECTRONICS, amount: 70 },
      ],
    ],
    buildTime: 36,
    workers: 25,
  },
  
  // 玩具店 (ID: 105) - 添加展示玩具和游戏
  {
    buildingTypeId: 105,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 100 },
      { goodsId: GOODS.CEMENT, amount: 150 },
      { goodsId: GOODS.GLASS, amount: 200 },
      { goodsId: GOODS.TILE, amount: 100 },
      { goodsId: GOODS.PAINT, amount: 80 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 45 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 15 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 3 },
      { goodsId: GOODS.ELECTRONICS, amount: 30 },
      { goodsId: GOODS.FURNITURE, amount: 70 },
      // 新增：展示玩具产品
      { goodsId: GOODS.TOY, amount: 100 },              // 展示玩具
      { goodsId: GOODS.VIDEO_GAME, amount: 30 },        // 展示游戏
      { goodsId: GOODS.COMPUTER, amount: 2 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.FURNITURE, amount: 30 },
        { goodsId: GOODS.TOY, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 50 },
        { goodsId: GOODS.ELECTRONICS, amount: 25 },
        { goodsId: GOODS.VIDEO_GAME, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 75 },
        { goodsId: GOODS.ELECTRONICS, amount: 40 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 100 },
        { goodsId: GOODS.ELECTRONICS, amount: 60 },
      ],
    ],
    buildTime: 24,
    workers: 18,
  },
  
  // 乐器店 (ID: 106) - 添加展示乐器
  {
    buildingTypeId: 106,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 200 },
      { goodsId: GOODS.CEMENT, amount: 250 },
      { goodsId: GOODS.GLASS, amount: 250 },
      { goodsId: GOODS.TILE, amount: 150 },
      { goodsId: GOODS.PAINT, amount: 100 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 80 },    // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 25 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 5 },
      { goodsId: GOODS.ELECTRONICS, amount: 50 },
      { goodsId: GOODS.FURNITURE, amount: 100 },
      // 新增：展示乐器
      { goodsId: GOODS.MUSICAL_INSTRUMENT, amount: 30 }, // 展示乐器
      { goodsId: GOODS.MUSIC_ALBUM, amount: 50 },       // 展示唱片
      { goodsId: GOODS.COMPUTER, amount: 3 },
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.FURNITURE, amount: 50 },
        { goodsId: GOODS.MUSICAL_INSTRUMENT, amount: 15 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 100 },
        { goodsId: GOODS.ELECTRONICS, amount: 40 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 150 },
        { goodsId: GOODS.ELECTRONICS, amount: 60 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 200 },
        { goodsId: GOODS.ELECTRONICS, amount: 80 },
      ],
    ],
    buildTime: 42,
    workers: 22,
  },
];

// ==================== 服务扩展建筑配置 (ID 88-93) ====================
const SERVICE_EXTENDED_CONFIGS: BuildingConstructionConfig[] = [
  // 学校 (ID: 88) - 添加教学设备
  {
    buildingTypeId: 88,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 800 },
      { goodsId: GOODS.CEMENT, amount: 1200 },
      { goodsId: GOODS.BRICK, amount: 600 },
      { goodsId: GOODS.GLASS, amount: 500 },
      { goodsId: GOODS.TILE, amount: 400 },
      { goodsId: GOODS.PAINT, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 350 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 120 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 15 },
      { goodsId: GOODS.TRANSFORMER, amount: 5 },
      { goodsId: GOODS.ELECTRONICS, amount: 100 },
      { goodsId: GOODS.FURNITURE, amount: 200 },        // 课桌椅
      // 新增：教学设备
      { goodsId: GOODS.COMPUTER, amount: 50 },          // 教学电脑
      { goodsId: GOODS.TABLET, amount: 100 },           // 学生平板
      { goodsId: GOODS.ROUTER, amount: 20 },            // 校园网络
      { goodsId: GOODS.SCREEN, amount: 30 },            // 教学屏幕
      { goodsId: GOODS.BOOKS, amount: 500 },            // 教材图书
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 250 },
        { goodsId: GOODS.COMPUTER, amount: 25 },
        { goodsId: GOODS.TABLET, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 500 },
        { goodsId: GOODS.ELECTRONICS, amount: 80 },
        { goodsId: GOODS.COMPUTER, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 750 },
        { goodsId: GOODS.ELECTRONICS, amount: 120 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 5 },
      ],
    ],
    buildTime: 72,
    workers: 80,
  },
  
  // 医院 (ID: 89) - 添加医疗设备
  {
    buildingTypeId: 89,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 3000 },
      { goodsId: GOODS.CEMENT, amount: 4000 },
      { goodsId: GOODS.BRICK, amount: 1500 },
      { goodsId: GOODS.GLASS, amount: 1500 },
      { goodsId: GOODS.TILE, amount: 2000 },
      { goodsId: GOODS.PAINT, amount: 800 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1200 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 400 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 50 },
      { goodsId: GOODS.TRANSFORMER, amount: 25 },
      { goodsId: GOODS.ELECTRONICS, amount: 500 },
      { goodsId: GOODS.FURNITURE, amount: 400 },
      // 新增：医疗设备
      { goodsId: GOODS.MEDICAL_EQUIPMENT, amount: 50 }, // 医疗设备
      { goodsId: GOODS.COMPUTER, amount: 80 },          // 医疗信息系统
      { goodsId: GOODS.APPLIANCES, amount: 30 },        // 医用冰箱等
      { goodsId: GOODS.SANITARY_WARE, amount: 100 },    // 卫浴设备
      { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },  // 手术机器人
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 1000 },
        { goodsId: GOODS.MEDICAL_EQUIPMENT, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2000 },
        { goodsId: GOODS.ELECTRONICS, amount: 300 },
        { goodsId: GOODS.MEDICAL_EQUIPMENT, amount: 25 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 4000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 20 },
        { goodsId: GOODS.MEDICAL_EQUIPMENT, amount: 30 },
      ],
    ],
    buildTime: 144,
    workers: 200,
  },
  
  // 银行 (ID: 90)
  {
    buildingTypeId: 90,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1500 },
      { goodsId: GOODS.CEMENT, amount: 2000 },
      { goodsId: GOODS.MARBLE, amount: 500 },
      { goodsId: GOODS.GLASS, amount: 800 },
      { goodsId: GOODS.TILE, amount: 600 },
      { goodsId: GOODS.PAINT, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 600 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 200 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 20 },
      { goodsId: GOODS.TRANSFORMER, amount: 10 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      { goodsId: GOODS.FURNITURE, amount: 200 },
      // 新增：银行设备
      { goodsId: GOODS.COMPUTER, amount: 50 },          // 办公电脑
      { goodsId: GOODS.ROUTER, amount: 20 },            // 网络设备
      { goodsId: GOODS.SPECIAL_STEEL, amount: 200 },    // 保险柜
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 500 },
        { goodsId: GOODS.COMPUTER, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1000 },
        { goodsId: GOODS.ELECTRONICS, amount: 200 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1500 },
        { goodsId: GOODS.ELECTRONICS, amount: 300 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2000 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
      ],
    ],
    buildTime: 84,
    workers: 100,
  },
  
  // 酒店 (ID: 91) - 添加家具家电
  {
    buildingTypeId: 91,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 2500 },
      { goodsId: GOODS.CEMENT, amount: 3500 },
      { goodsId: GOODS.BRICK, amount: 1000 },
      { goodsId: GOODS.GLASS, amount: 1500 },
      { goodsId: GOODS.TILE, amount: 1500 },
      { goodsId: GOODS.PAINT, amount: 600 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 1000 },  // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 350 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 40 },
      { goodsId: GOODS.TRANSFORMER, amount: 20 },
      { goodsId: GOODS.ELECTRONICS, amount: 300 },
      // 新增：酒店设施
      { goodsId: GOODS.FURNITURE, amount: 500 },        // 客房家具
      { goodsId: GOODS.APPLIANCES, amount: 200 },       // 空调电视等
      { goodsId: GOODS.SANITARY_WARE, amount: 150 },    // 卫浴设备
      { goodsId: GOODS.COMPUTER, amount: 30 },          // 前台和管理电脑
      { goodsId: GOODS.ROUTER, amount: 50 },            // 酒店WiFi
      { goodsId: GOODS.DECORATION, amount: 100 },       // 装饰品
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 800 },
        { goodsId: GOODS.FURNITURE, amount: 200 },
        { goodsId: GOODS.APPLIANCES, amount: 80 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1600 },
        { goodsId: GOODS.ELECTRONICS, amount: 200 },
        { goodsId: GOODS.SANITARY_WARE, amount: 50 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 2400 },
        { goodsId: GOODS.ELECTRONICS, amount: 300 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 3200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 15 },
      ],
    ],
    buildTime: 120,
    workers: 150,
  },
  
  // 运输公司 (ID: 92) - 添加车辆
  {
    buildingTypeId: 92,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 1000 },
      { goodsId: GOODS.CEMENT, amount: 1500 },
      { goodsId: GOODS.BRICK, amount: 400 },
      { goodsId: GOODS.GLASS, amount: 300 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 400 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 130 },    // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 10 },
      { goodsId: GOODS.TRANSFORMER, amount: 5 },
      { goodsId: GOODS.MOTOR, amount: 30 },
      { goodsId: GOODS.ELECTRONICS, amount: 80 },
      { goodsId: GOODS.MECHANICAL_PARTS, amount: 150 },
      // 新增：运输车辆和设备
      { goodsId: GOODS.BUS, amount: 5 },                // 客运车辆
      { goodsId: GOODS.CAR, amount: 10 },               // 小型运输车
      { goodsId: GOODS.COMPUTER, amount: 15 },          // 调度系统
      { goodsId: GOODS.DRONE, amount: 5 },              // 配送无人机
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 300 },
        { goodsId: GOODS.BUS, amount: 2 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.ELECTRONICS, amount: 60 },
        { goodsId: GOODS.CAR, amount: 5 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 900 },
        { goodsId: GOODS.DRONE, amount: 5 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 1200 },
        { goodsId: GOODS.INDUSTRIAL_ROBOT, amount: 10 },
        { goodsId: GOODS.BUS, amount: 3 },
      ],
    ],
    buildTime: 72,
    workers: 80,
  },
  
  // 咨询公司 (ID: 93)
  {
    buildingTypeId: 93,
    baseMaterials: [
      { goodsId: GOODS.STEEL, amount: 600 },
      { goodsId: GOODS.CEMENT, amount: 800 },
      { goodsId: GOODS.GLASS, amount: 600 },
      { goodsId: GOODS.TILE, amount: 400 },
      { goodsId: GOODS.PAINT, amount: 200 },
      { goodsId: GOODS.BUILDING_MATERIALS, amount: 250 },   // 建筑材料
      { goodsId: GOODS.BUILDING_PRODUCTS, amount: 80 },     // 建材成品
      { goodsId: GOODS.POWER_CABLE, amount: 10 },
      { goodsId: GOODS.TRANSFORMER, amount: 3 },
      { goodsId: GOODS.ELECTRONICS, amount: 150 },
      { goodsId: GOODS.FURNITURE, amount: 150 },
      // 新增：办公设备
      { goodsId: GOODS.COMPUTER, amount: 50 },          // 办公电脑
      { goodsId: GOODS.ROUTER, amount: 15 },            // 网络设备
      { goodsId: GOODS.TABLET, amount: 20 },            // 移动办公
    ],
    upgradeMaterials: [
      [],
      [
        { goodsId: GOODS.STEEL, amount: 200 },
        { goodsId: GOODS.COMPUTER, amount: 20 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 400 },
        { goodsId: GOODS.ELECTRONICS, amount: 100 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 600 },
        { goodsId: GOODS.ELECTRONICS, amount: 150 },
      ],
      [
        { goodsId: GOODS.STEEL, amount: 800 },
        { goodsId: GOODS.COMPUTER, amount: 30 },
      ],
    ],
    buildTime: 48,
    workers: 60,
  },
];

// ==================== 合并所有配置 ====================
const ALL_CONSTRUCTION_CONFIGS: BuildingConstructionConfig[] = [
  ...EXTRACTION_CONFIGS,
  ...PROCESSING_CONFIGS,
  ...MANUFACTURING_CONFIGS,
  ...SERVICE_CONFIGS,
  ...RETAIL_CONFIGS,
  ...EXTENDED_RETAIL_CONFIGS,
  ...SERVICE_EXTENDED_CONFIGS,
];

// ==================== 导出配置 ====================

/** 所有建筑的建造配置映射 */
export const BUILDING_CONSTRUCTION_CONFIGS: Map<number, BuildingConstructionConfig> = new Map(
  ALL_CONSTRUCTION_CONFIGS.map(config => [config.buildingTypeId, config])
);

/**
 * 获取建筑的建造配置
 */
export function getBuildingConstructionConfig(buildingTypeId: number): BuildingConstructionConfig | undefined {
  return BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId);
}

/**
 * 获取建筑的基础材料需求
 */
export function getBaseMaterials(buildingTypeId: number): MaterialRequirement[] {
  return BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId)?.baseMaterials ?? [];
}

/**
 * 获取建筑的升级材料需求
 */
export function getUpgradeMaterials(buildingTypeId: number, targetLevel: number): MaterialRequirement[] {
  const config = BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId);
  if (!config || targetLevel < 1 || targetLevel >= config.upgradeMaterials.length) {
    return [];
  }
  return config.upgradeMaterials[targetLevel] ?? [];
}

/**
 * 检查建筑是否为危险建筑
 */
export function isHazardousBuilding(buildingTypeId: number): boolean {
  return BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId)?.isHazardous ?? false;
}

/**
 * 获取建造时间
 */
export function getBuildTime(buildingTypeId: number): number {
  return BUILDING_CONSTRUCTION_CONFIGS.get(buildingTypeId)?.buildTime ?? 24;
}

/**
 * 计算材料的总价值
 */
export function calculateMaterialsValue(
  materials: MaterialRequirement[],
  priceGetter: (goodsId: number) => number
): number {
  return materials.reduce((total, mat) => total + mat.amount * priceGetter(mat.goodsId), 0);
}