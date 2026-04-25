/**
 * 建筑建造材料配置
 * 与重构后的40种建筑体系对齐
 */

import { GoodsId } from './goods';
import { BuildingId } from './buildings';

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

// ==================== 采掘类建筑材料 (ID 0-14) ====================
const EXTRACTION_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: BuildingId.IRON_MINE, // 0 铁矿场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 800 },
      { goodsId: GoodsId.CEMENT, amount: 500 },
      { goodsId: GoodsId.TIMBER, amount: 300 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 300 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 100 },
      { goodsId: GoodsId.MOTOR, amount: 10 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 200 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 50 }],
      [{ goodsId: GoodsId.STEEL, amount: 400 }, { goodsId: GoodsId.ELECTRONICS, amount: 30 }],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GoodsId.STEEL, amount: 800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 48,
    workers: 50,
  },
  {
    buildingTypeId: BuildingId.COPPER_MINE, // 1 铜矿场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 900 },
      { goodsId: GoodsId.CEMENT, amount: 550 },
      { goodsId: GoodsId.TIMBER, amount: 280 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 350 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 120 },
      { goodsId: GoodsId.MOTOR, amount: 12 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 120 },
      { goodsId: GoodsId.CHEMICALS, amount: 30 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 250 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 500 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 750 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 6 }],
      [{ goodsId: GoodsId.STEEL, amount: 1000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 12 }],
    ],
    buildTime: 48,
    workers: 55,
  },
  {
    buildingTypeId: BuildingId.ALUMINUM_MINE, // 2 铝土矿
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 850 },
      { goodsId: GoodsId.CEMENT, amount: 520 },
      { goodsId: GoodsId.TIMBER, amount: 250 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 320 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 110 },
      { goodsId: GoodsId.MOTOR, amount: 10 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 110 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 220 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 55 }],
      [{ goodsId: GoodsId.STEEL, amount: 440 }, { goodsId: GoodsId.ELECTRONICS, amount: 35 }],
      [{ goodsId: GoodsId.STEEL, amount: 660 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GoodsId.STEEL, amount: 880 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 48,
    workers: 50,
  },
  {
    buildingTypeId: BuildingId.COAL_MINE, // 3 煤矿
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 600 },
      { goodsId: GoodsId.CEMENT, amount: 400 },
      { goodsId: GoodsId.TIMBER, amount: 400 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 250 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 80 },
      { goodsId: GoodsId.MOTOR, amount: 15 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 80 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 150 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 300 }, { goodsId: GoodsId.ELECTRONICS, amount: 25 }],
      [{ goodsId: GoodsId.STEEL, amount: 450 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
    ],
    buildTime: 36,
    workers: 60,
  },
  {
    buildingTypeId: BuildingId.OIL_FIELD, // 4 油田
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 2000 },
      { goodsId: GoodsId.CEMENT, amount: 800 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 600 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GoodsId.MOTOR, amount: 30 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 300 },
      { goodsId: GoodsId.RUBBER, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 500 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 100 }],
      [{ goodsId: GoodsId.STEEL, amount: 1000 }, { goodsId: GoodsId.ELECTRONICS, amount: 80 }],
      [{ goodsId: GoodsId.STEEL, amount: 1500 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GoodsId.STEEL, amount: 2000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 96,
    workers: 100,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.GAS_FIELD, // 5 气田
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 1800 },
      { goodsId: GoodsId.CEMENT, amount: 700 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 550 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 180 },
      { goodsId: GoodsId.MOTOR, amount: 25 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 250 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 450 }],
      [{ goodsId: GoodsId.STEEL, amount: 900 }, { goodsId: GoodsId.ELECTRONICS, amount: 70 }],
      [{ goodsId: GoodsId.STEEL, amount: 1350 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 1800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 84,
    workers: 90,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.SILICON_MINE, // 6 硅矿场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 850 },
      { goodsId: GoodsId.CEMENT, amount: 520 },
      { goodsId: GoodsId.TIMBER, amount: 250 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 320 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 110 },
      { goodsId: GoodsId.MOTOR, amount: 10 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 110 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 220 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 55 }],
      [{ goodsId: GoodsId.STEEL, amount: 440 }, { goodsId: GoodsId.ELECTRONICS, amount: 35 }],
      [{ goodsId: GoodsId.STEEL, amount: 660 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GoodsId.STEEL, amount: 880 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 48,
    workers: 50,
  },
  {
    buildingTypeId: BuildingId.LITHIUM_MINE, // 7 锂矿场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 1000 },
      { goodsId: GoodsId.CEMENT, amount: 600 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 400 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 130 },
      { goodsId: GoodsId.MOTOR, amount: 15 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 150 },
      { goodsId: GoodsId.CHEMICALS, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 300 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.ELECTRONICS, amount: 50 }],
      [{ goodsId: GoodsId.STEEL, amount: 900 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 72,
    workers: 70,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.RARE_EARTH_MINE, // 8 稀土矿场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 1000 },
      { goodsId: GoodsId.CEMENT, amount: 600 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 400 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 130 },
      { goodsId: GoodsId.MOTOR, amount: 15 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 150 },
      { goodsId: GoodsId.CHEMICALS, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 300 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.ELECTRONICS, amount: 50 }],
      [{ goodsId: GoodsId.STEEL, amount: 900 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 84,
    workers: 70,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.LOGGING_CAMP, // 9 伐木场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 200 },
      { goodsId: GoodsId.CEMENT, amount: 150 },
      { goodsId: GoodsId.TIMBER, amount: 500 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 100 },
      { goodsId: GoodsId.MOTOR, amount: 5 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 50 },
      { goodsId: GoodsId.FUEL, amount: 500 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 50 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 25 }],
      [{ goodsId: GoodsId.STEEL, amount: 100 }, { goodsId: GoodsId.MOTOR, amount: 3 }],
      [{ goodsId: GoodsId.STEEL, amount: 150 }, { goodsId: GoodsId.ELECTRONICS, amount: 20 }],
      [{ goodsId: GoodsId.STEEL, amount: 200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 3 }],
    ],
    buildTime: 24,
    workers: 30,
  },
  {
    buildingTypeId: BuildingId.FARM, // 10 农场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 150 },
      { goodsId: GoodsId.CEMENT, amount: 200 },
      { goodsId: GoodsId.TIMBER, amount: 400 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 120 },
      { goodsId: GoodsId.MOTOR, amount: 8 },
      { goodsId: GoodsId.PLASTIC, amount: 100 },
      { goodsId: GoodsId.FUEL, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 50 }, { goodsId: GoodsId.MOTOR, amount: 4 }],
      [{ goodsId: GoodsId.STEEL, amount: 100 }, { goodsId: GoodsId.ELECTRONICS, amount: 15 }],
      [{ goodsId: GoodsId.STEEL, amount: 150 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 3 }],
      [{ goodsId: GoodsId.STEEL, amount: 200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 5 }],
    ],
    buildTime: 36,
    workers: 40,
  },
  {
    buildingTypeId: BuildingId.RUBBER_PLANTATION, // 11 橡胶园
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 200 },
      { goodsId: GoodsId.CEMENT, amount: 150 },
      { goodsId: GoodsId.TIMBER, amount: 400 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 100 },
      { goodsId: GoodsId.MOTOR, amount: 5 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 40 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 60 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 20 }],
      [{ goodsId: GoodsId.STEEL, amount: 120 }, { goodsId: GoodsId.ELECTRONICS, amount: 15 }],
      [{ goodsId: GoodsId.STEEL, amount: 180 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 2 }],
      [{ goodsId: GoodsId.STEEL, amount: 240 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 4 }],
    ],
    buildTime: 48,
    workers: 40,
  },
  {
    buildingTypeId: BuildingId.LIVESTOCK_FARM, // 12 畜牧场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 200 },
      { goodsId: GoodsId.CEMENT, amount: 300 },
      { goodsId: GoodsId.TIMBER, amount: 500 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 120 },
      { goodsId: GoodsId.MOTOR, amount: 8 },
      { goodsId: GoodsId.FUEL, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 60 }, { goodsId: GoodsId.MOTOR, amount: 4 }],
      [{ goodsId: GoodsId.STEEL, amount: 120 }, { goodsId: GoodsId.ELECTRONICS, amount: 15 }],
      [{ goodsId: GoodsId.STEEL, amount: 180 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 3 }],
      [{ goodsId: GoodsId.STEEL, amount: 240 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 6 }],
    ],
    buildTime: 60,
    workers: 40,
  },
  {
    buildingTypeId: BuildingId.FISHERY, // 13 渔场
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 300 },
      { goodsId: GoodsId.CEMENT, amount: 400 },
      { goodsId: GoodsId.PLASTIC, amount: 300 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 150 },
      { goodsId: GoodsId.MOTOR, amount: 15 },
      { goodsId: GoodsId.FUEL, amount: 400 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 90 }, { goodsId: GoodsId.MOTOR, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 180 }, { goodsId: GoodsId.ELECTRONICS, amount: 20 }],
      [{ goodsId: GoodsId.STEEL, amount: 270 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 4 }],
      [{ goodsId: GoodsId.STEEL, amount: 360 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
    ],
    buildTime: 48,
    workers: 50,
  },
  {
    buildingTypeId: BuildingId.HERB_FARM, // 14 药材种植园
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 150 },
      { goodsId: GoodsId.CEMENT, amount: 200 },
      { goodsId: GoodsId.TIMBER, amount: 350 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 100 },
      { goodsId: GoodsId.PLASTIC, amount: 150 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 45 }],
      [{ goodsId: GoodsId.STEEL, amount: 90 }, { goodsId: GoodsId.ELECTRONICS, amount: 12 }],
      [{ goodsId: GoodsId.STEEL, amount: 135 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 2 }],
      [{ goodsId: GoodsId.STEEL, amount: 180 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 5 }],
    ],
    buildTime: 48,
    workers: 35,
  },
];

// ==================== 加工类建筑材料 (ID 15-26) ====================
const PROCESSING_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: BuildingId.STEEL_MILL, // 15 钢铁厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 5000 },
      { goodsId: GoodsId.CEMENT, amount: 3000 },
      { goodsId: GoodsId.GLASS, amount: 500 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 1500 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 500 },
      { goodsId: GoodsId.MOTOR, amount: 50 },
      { goodsId: GoodsId.ELECTRONICS, amount: 100 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 500 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 1500 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 200 }],
      [{ goodsId: GoodsId.STEEL, amount: 3000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GoodsId.STEEL, amount: 4500 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GoodsId.STEEL, amount: 6000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 30 }],
    ],
    buildTime: 96,
    workers: 200,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.NON_FERROUS_SMELTER, // 16 有色金属冶炼厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 3000 },
      { goodsId: GoodsId.CEMENT, amount: 1800 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 900 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 300 },
      { goodsId: GoodsId.MOTOR, amount: 40 },
      { goodsId: GoodsId.ELECTRONICS, amount: 80 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 350 },
      { goodsId: GoodsId.CHEMICALS, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 900 }],
      [{ goodsId: GoodsId.STEEL, amount: 1800 }, { goodsId: GoodsId.ELECTRONICS, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 2700 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GoodsId.STEEL, amount: 3600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 84,
    workers: 160,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.REFINERY, // 17 炼油厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 6000 },
      { goodsId: GoodsId.CEMENT, amount: 2500 },
      { goodsId: GoodsId.GLASS, amount: 300 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 1800 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 600 },
      { goodsId: GoodsId.MOTOR, amount: 80 },
      { goodsId: GoodsId.ELECTRONICS, amount: 200 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 600 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 1800 }],
      [{ goodsId: GoodsId.STEEL, amount: 3600 }, { goodsId: GoodsId.ELECTRONICS, amount: 150 }],
      [{ goodsId: GoodsId.STEEL, amount: 5400 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GoodsId.STEEL, amount: 7200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 25 }],
    ],
    buildTime: 120,
    workers: 250,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.CHEMICAL_PLANT, // 18 化工厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 4000 },
      { goodsId: GoodsId.CEMENT, amount: 2000 },
      { goodsId: GoodsId.GLASS, amount: 600 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 1200 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 400 },
      { goodsId: GoodsId.MOTOR, amount: 60 },
      { goodsId: GoodsId.ELECTRONICS, amount: 150 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 400 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }],
      [{ goodsId: GoodsId.STEEL, amount: 2400 }, { goodsId: GoodsId.ELECTRONICS, amount: 120 }],
      [{ goodsId: GoodsId.STEEL, amount: 3600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 12 }],
      [{ goodsId: GoodsId.STEEL, amount: 4800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 108,
    workers: 180,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.GLASS_FACTORY, // 19 玻璃厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 1500 },
      { goodsId: GoodsId.CEMENT, amount: 1000 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 450 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 150 },
      { goodsId: GoodsId.MOTOR, amount: 30 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 450 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 80 }],
      [{ goodsId: GoodsId.STEEL, amount: 900 }, { goodsId: GoodsId.ELECTRONICS, amount: 50 }],
      [{ goodsId: GoodsId.STEEL, amount: 1350 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 1800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 60,
    workers: 100,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.CEMENT_FACTORY, // 20 水泥厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 2000 },
      { goodsId: GoodsId.CEMENT, amount: 1500 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 600 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GoodsId.MOTOR, amount: 50 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 400 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 150 }],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }, { goodsId: GoodsId.ELECTRONICS, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 1800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 12 }],
      [{ goodsId: GoodsId.STEEL, amount: 2400 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 25 }],
    ],
    buildTime: 72,
    workers: 150,
  },
  {
    buildingTypeId: BuildingId.PAPER_MILL, // 21 造纸厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 800 },
      { goodsId: GoodsId.CEMENT, amount: 500 },
      { goodsId: GoodsId.TIMBER, amount: 200 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 300 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 100 },
      { goodsId: GoodsId.MOTOR, amount: 25 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 150 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 240 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 480 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 720 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 6 }],
      [{ goodsId: GoodsId.STEEL, amount: 960 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 12 }],
    ],
    buildTime: 48,
    workers: 80,
  },
  {
    buildingTypeId: BuildingId.TEXTILE_MILL, // 22 纺织厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 800 },
      { goodsId: GoodsId.CEMENT, amount: 600 },
      { goodsId: GoodsId.TIMBER, amount: 300 },
      { goodsId: GoodsId.GLASS, amount: 400 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 300 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 100 },
      { goodsId: GoodsId.MOTOR, amount: 100 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 240 }, { goodsId: GoodsId.MOTOR, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 480 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 720 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GoodsId.STEEL, amount: 960 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 48,
    workers: 150,
  },
  {
    buildingTypeId: BuildingId.FOOD_FACTORY, // 23 食品厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 1000 },
      { goodsId: GoodsId.CEMENT, amount: 700 },
      { goodsId: GoodsId.GLASS, amount: 300 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 350 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 120 },
      { goodsId: GoodsId.MOTOR, amount: 40 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 200 },
      { goodsId: GoodsId.PLASTIC, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 300 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 80 }],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.ELECTRONICS, amount: 50 }],
      [{ goodsId: GoodsId.STEEL, amount: 900 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
    ],
    buildTime: 48,
    workers: 120,
  },
  {
    buildingTypeId: BuildingId.MEAT_PROCESSING, // 24 肉类加工厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 800 },
      { goodsId: GoodsId.CEMENT, amount: 600 },
      { goodsId: GoodsId.GLASS, amount: 200 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 300 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 100 },
      { goodsId: GoodsId.MOTOR, amount: 30 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 150 },
      { goodsId: GoodsId.APPLIANCES, amount: 20 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 240 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 480 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 720 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 960 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 60,
    workers: 100,
  },
  {
    buildingTypeId: BuildingId.DAIRY_FACTORY, // 25 乳品厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 700 },
      { goodsId: GoodsId.CEMENT, amount: 500 },
      { goodsId: GoodsId.GLASS, amount: 200 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 250 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 80 },
      { goodsId: GoodsId.MOTOR, amount: 25 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 120 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 210 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 50 }],
      [{ goodsId: GoodsId.STEEL, amount: 420 }, { goodsId: GoodsId.ELECTRONICS, amount: 35 }],
      [{ goodsId: GoodsId.STEEL, amount: 630 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 6 }],
      [{ goodsId: GoodsId.STEEL, amount: 840 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 12 }],
    ],
    buildTime: 48,
    workers: 90,
  },
  {
    buildingTypeId: BuildingId.BUILDING_MATERIALS_FACTORY, // 26 建材厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 1200 },
      { goodsId: GoodsId.CEMENT, amount: 800 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 400 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 130 },
      { goodsId: GoodsId.MOTOR, amount: 35 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 360 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 80 }],
      [{ goodsId: GoodsId.STEEL, amount: 720 }, { goodsId: GoodsId.ELECTRONICS, amount: 50 }],
      [{ goodsId: GoodsId.STEEL, amount: 1080 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 1440 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 60,
    workers: 110,
  },
];

// ==================== 制造类建筑材料 (ID 27-36) ====================
const MANUFACTURING_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: BuildingId.ELECTRONICS_FACTORY, // 27 电子厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 3000 },
      { goodsId: GoodsId.CEMENT, amount: 2000 },
      { goodsId: GoodsId.GLASS, amount: 1000 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 900 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 300 },
      { goodsId: GoodsId.MOTOR, amount: 50 },
      { goodsId: GoodsId.ELECTRONICS, amount: 500 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 300 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 900 }, { goodsId: GoodsId.ELECTRONICS, amount: 200 }],
      [{ goodsId: GoodsId.STEEL, amount: 1800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GoodsId.STEEL, amount: 2700 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 25 }],
      [{ goodsId: GoodsId.STEEL, amount: 3600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 40 }],
    ],
    buildTime: 120,
    workers: 300,
  },
  {
    buildingTypeId: BuildingId.SEMICONDUCTOR_FAB, // 28 半导体厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 8000 },
      { goodsId: GoodsId.CEMENT, amount: 5000 },
      { goodsId: GoodsId.GLASS, amount: 3000 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 2400 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 800 },
      { goodsId: GoodsId.MOTOR, amount: 100 },
      { goodsId: GoodsId.ELECTRONICS, amount: 2000 },
      { goodsId: GoodsId.CHIPS, amount: 500 },
      { goodsId: GoodsId.CHEMICALS, amount: 500 },
      { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 50 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 2400 }, { goodsId: GoodsId.ELECTRONICS, amount: 800 }],
      [{ goodsId: GoodsId.STEEL, amount: 4800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GoodsId.STEEL, amount: 7200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 35 }],
      [{ goodsId: GoodsId.STEEL, amount: 9600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 50 }],
    ],
    buildTime: 240,
    workers: 500,
    unlockConditions: { requiredBuildings: [BuildingId.ELECTRONICS_FACTORY, BuildingId.CHEMICAL_PLANT], requiredLevel: 5 },
  },
  {
    buildingTypeId: BuildingId.BATTERY_FACTORY, // 29 电池厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 4000 },
      { goodsId: GoodsId.CEMENT, amount: 2500 },
      { goodsId: GoodsId.GLASS, amount: 800 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 1200 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 400 },
      { goodsId: GoodsId.MOTOR, amount: 60 },
      { goodsId: GoodsId.ELECTRONICS, amount: 400 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 350 },
      { goodsId: GoodsId.CHEMICALS, amount: 200 },
      { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 30 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }, { goodsId: GoodsId.ELECTRONICS, amount: 160 }],
      [{ goodsId: GoodsId.STEEL, amount: 2400 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GoodsId.STEEL, amount: 3600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 25 }],
      [{ goodsId: GoodsId.STEEL, amount: 4800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 40 }],
    ],
    buildTime: 144,
    workers: 300,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.PARTS_FACTORY, // 30 零部件厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 2500 },
      { goodsId: GoodsId.CEMENT, amount: 1600 },
      { goodsId: GoodsId.GLASS, amount: 500 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 800 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 260 },
      { goodsId: GoodsId.MOTOR, amount: 80 },
      { goodsId: GoodsId.ELECTRONICS, amount: 200 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 450 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 750 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 180 }],
      [{ goodsId: GoodsId.STEEL, amount: 1500 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 12 }],
      [{ goodsId: GoodsId.STEEL, amount: 2250 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 22 }],
      [{ goodsId: GoodsId.STEEL, amount: 3000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 32 }],
    ],
    buildTime: 96,
    workers: 220,
  },
  {
    buildingTypeId: BuildingId.CAR_FACTORY, // 31 汽车工厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 10000 },
      { goodsId: GoodsId.CEMENT, amount: 6000 },
      { goodsId: GoodsId.GLASS, amount: 2000 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 3000 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 1000 },
      { goodsId: GoodsId.MOTOR, amount: 200 },
      { goodsId: GoodsId.ELECTRONICS, amount: 500 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 1000 },
      { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 3000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 6000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 9000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 80 }],
      [{ goodsId: GoodsId.STEEL, amount: 12000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 100 }],
    ],
    buildTime: 168,
    workers: 400,
  },
  {
    buildingTypeId: BuildingId.APPLIANCE_FACTORY, // 32 家电厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 2500 },
      { goodsId: GoodsId.CEMENT, amount: 1500 },
      { goodsId: GoodsId.GLASS, amount: 600 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 750 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 250 },
      { goodsId: GoodsId.MOTOR, amount: 80 },
      { goodsId: GoodsId.ELECTRONICS, amount: 300 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 400 },
      { goodsId: GoodsId.PLASTIC, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 750 }, { goodsId: GoodsId.ELECTRONICS, amount: 120 }],
      [{ goodsId: GoodsId.STEEL, amount: 1500 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GoodsId.STEEL, amount: 2250 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 25 }],
      [{ goodsId: GoodsId.STEEL, amount: 3000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 35 }],
    ],
    buildTime: 96,
    workers: 250,
  },
  {
    buildingTypeId: BuildingId.FURNITURE_FACTORY, // 33 家具厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 1000 },
      { goodsId: GoodsId.CEMENT, amount: 800 },
      { goodsId: GoodsId.TIMBER, amount: 500 },
      { goodsId: GoodsId.GLASS, amount: 300 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 350 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 110 },
      { goodsId: GoodsId.MOTOR, amount: 30 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 180 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 300 }, { goodsId: GoodsId.MECHANICAL_PARTS, amount: 70 }],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 900 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 60,
    workers: 120,
  },
  {
    buildingTypeId: BuildingId.NEW_ENERGY_FACTORY, // 34 新能源厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 4000 },
      { goodsId: GoodsId.CEMENT, amount: 2500 },
      { goodsId: GoodsId.GLASS, amount: 1500 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 1200 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 400 },
      { goodsId: GoodsId.MOTOR, amount: 70 },
      { goodsId: GoodsId.ELECTRONICS, amount: 400 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 350 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }, { goodsId: GoodsId.ELECTRONICS, amount: 160 }],
      [{ goodsId: GoodsId.STEEL, amount: 2400 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
      [{ goodsId: GoodsId.STEEL, amount: 3600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 25 }],
      [{ goodsId: GoodsId.STEEL, amount: 4800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 40 }],
    ],
    buildTime: 120,
    workers: 280,
  },
  {
    buildingTypeId: BuildingId.PHARMA_FACTORY, // 35 制药厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 2500 },
      { goodsId: GoodsId.CEMENT, amount: 1800 },
      { goodsId: GoodsId.GLASS, amount: 1000 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 800 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 250 },
      { goodsId: GoodsId.MOTOR, amount: 40 },
      { goodsId: GoodsId.ELECTRONICS, amount: 300 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 250 },
      { goodsId: GoodsId.CHEMICALS, amount: 200 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 750 }, { goodsId: GoodsId.ELECTRONICS, amount: 120 }],
      [{ goodsId: GoodsId.STEEL, amount: 1500 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 12 }],
      [{ goodsId: GoodsId.STEEL, amount: 2250 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GoodsId.STEEL, amount: 3000 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 30 }],
    ],
    buildTime: 108,
    workers: 180,
  },
  {
    buildingTypeId: BuildingId.MEDICAL_DEVICE_FACTORY, // 36 医疗器械厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 2000 },
      { goodsId: GoodsId.CEMENT, amount: 1500 },
      { goodsId: GoodsId.GLASS, amount: 800 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 650 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 200 },
      { goodsId: GoodsId.MOTOR, amount: 35 },
      { goodsId: GoodsId.ELECTRONICS, amount: 400 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 300 },
      { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.ELECTRONICS, amount: 160 }],
      [{ goodsId: GoodsId.STEEL, amount: 1200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
      [{ goodsId: GoodsId.STEEL, amount: 1800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 18 }],
      [{ goodsId: GoodsId.STEEL, amount: 2400 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 28 }],
    ],
    buildTime: 96,
    workers: 150,
  },
];

// ==================== 奢侈品类建筑材料 (ID 37-38) ====================
const LUXURY_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: BuildingId.GOLD_REFINERY, // 37 金矿精炼厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 1500 },
      { goodsId: GoodsId.CEMENT, amount: 1000 },
      { goodsId: GoodsId.GLASS, amount: 400 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 500 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 160 },
      { goodsId: GoodsId.MOTOR, amount: 25 },
      { goodsId: GoodsId.ELECTRONICS, amount: 150 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 220 },
      { goodsId: GoodsId.CHEMICALS, amount: 80 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 450 }, { goodsId: GoodsId.ELECTRONICS, amount: 60 }],
      [{ goodsId: GoodsId.STEEL, amount: 900 }, { goodsId: GoodsId.ELECTRONICS, amount: 100 }],
      [{ goodsId: GoodsId.STEEL, amount: 1350 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 8 }],
      [{ goodsId: GoodsId.STEEL, amount: 1800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 15 }],
    ],
    buildTime: 72,
    workers: 100,
    isHazardous: true,
  },
  {
    buildingTypeId: BuildingId.LUXURY_WORKSHOP, // 38 奢侈品工坊
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 500 },
      { goodsId: GoodsId.CEMENT, amount: 400 },
      { goodsId: GoodsId.GLASS, amount: 300 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 200 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 80 },
      { goodsId: GoodsId.ELECTRONICS, amount: 100 },
      { goodsId: GoodsId.FURNITURE, amount: 100 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 150 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 300 }, { goodsId: GoodsId.ELECTRONICS, amount: 80 }],
      [{ goodsId: GoodsId.STEEL, amount: 450 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 5 }],
      [{ goodsId: GoodsId.STEEL, amount: 600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 }],
    ],
    buildTime: 48,
    workers: 50,
  },
];

// ==================== 服务类建筑材料 (ID 39) ====================
const SERVICE_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: BuildingId.POWER_PLANT, // 39 发电厂
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 8000 },
      { goodsId: GoodsId.CEMENT, amount: 5000 },
      { goodsId: GoodsId.GLASS, amount: 500 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 2400 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 800 },
      { goodsId: GoodsId.MOTOR, amount: 100 },
      { goodsId: GoodsId.ELECTRONICS, amount: 300 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 600 },
      { goodsId: GoodsId.SOLAR_SYSTEM, amount: 10 },
      { goodsId: GoodsId.ENERGY_STORAGE, amount: 5 },
      { goodsId: GoodsId.COMPUTER, amount: 20 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 2400 }, { goodsId: GoodsId.SOLAR_SYSTEM, amount: 5 }],
      [{ goodsId: GoodsId.STEEL, amount: 4800 }, { goodsId: GoodsId.ELECTRONICS, amount: 200 }],
      [{ goodsId: GoodsId.STEEL, amount: 7200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 20 }],
      [{ goodsId: GoodsId.STEEL, amount: 9600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 40 }],
    ],
    buildTime: 144,
    workers: 200,
    isHazardous: true,
  },
];

// ==================== 零售类建筑材料 (ID 40) ====================
const RETAIL_CONFIGS: BuildingConstructionConfig[] = [
  {
    buildingTypeId: BuildingId.CONVENIENCE_STORE, // 40 便利店
    baseMaterials: [
      { goodsId: GoodsId.STEEL, amount: 350 },
      { goodsId: GoodsId.CEMENT, amount: 500 },
      { goodsId: GoodsId.GLASS, amount: 220 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 180 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 70 },
      { goodsId: GoodsId.ELECTRONICS, amount: 60 },
      { goodsId: GoodsId.FURNITURE, amount: 120 },
      { goodsId: GoodsId.APPLIANCES, amount: 20 },
    ],
    upgradeMaterials: [
      [],
      [{ goodsId: GoodsId.STEEL, amount: 120 }, { goodsId: GoodsId.BUILDING_MATERIALS, amount: 80 }],
      [{ goodsId: GoodsId.STEEL, amount: 240 }, { goodsId: GoodsId.ELECTRONICS, amount: 40 }],
      [{ goodsId: GoodsId.STEEL, amount: 360 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 2 }],
      [{ goodsId: GoodsId.STEEL, amount: 480 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 4 }],
    ],
    buildTime: 48,
    workers: 40,
  },
];

// ==================== 合并所有配置 ====================
const ALL_CONSTRUCTION_CONFIGS: BuildingConstructionConfig[] = [
  ...EXTRACTION_CONFIGS,      // ID 0-14
  ...PROCESSING_CONFIGS,      // ID 15-26
  ...MANUFACTURING_CONFIGS,   // ID 27-36
  ...LUXURY_CONFIGS,          // ID 37-38
  ...SERVICE_CONFIGS,         // ID 39
  ...RETAIL_CONFIGS,          // ID 40
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
