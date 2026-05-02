/**
 * 商品图标映射表
 * 与 src/data/goods.ts 中 80 种商品（ID 0-79）严格对齐
 */

import { IconType } from 'react-icons';
import {
  // Tier 0 原材料
  GiOre, GiMining, GiMineWagon, GiCoalWagon, GiOilDrum, GiMolecule,
  GiCrystalCluster, GiBatteryPack, GiGems, GiWoodPile, GiFlax, GiWheat,
  GiTreeBranch, GiCow, GiFishBucket, GiHerbsBundle, GiGoldNuggets, GiCrystalGrowth,
  // Tier 1 基础材料
  GiSteelClaws, GiMetalBar, GiAnvilImpact, GiGasPump, GiPlasticDuck, GiChemicalDrop,
  GiWindow, GiConcreteBag, GiNewspaper, GiRolledCloth, GiCarWheel, GiMeat,
  GiMilkCarton, GiSlicedBread, GiGoldBar, GiCutDiamond, GiTestTubes, GiRobe,
  // Tier 2 中间品
  GiProcessor, GiMicrochip, GiBattery75, GiElectric, GiTablet, GiCarDoor,
  GiGears, GiAirplaneDeparture, GiSolarPower, GiWindmill, GiBrickPile, GiCardboardBox,
  GiIceCube, GiCannedFish, GiSpiralBottle, GiMedicines, GiSyringe, GiBandageRoll,
  GiSodaCan, GiCookie, GiYarn,
  // Tier 3 最终产品
  GiSmartphone, GiLaptop, GiWashingMachine, GiDeliveryDrone, GiCityCar, GiRaceCar,
  GiClothes, GiMeal, GiSofa, GiLightningBow, GiSunRadiations, GiRobotAntennas,
  GiHouse, GiPill, GiHealthNormal, GiMedicalPack, GiDiamondRing, GiPocketWatch,
  GiDress, GiDogBowl, GiPlantSeed,
} from 'react-icons/gi';

import { FaQuestion } from 'react-icons/fa';
import { MdElectricCar, MdBattery90 } from 'react-icons/md';

// 备用图标
const FallbackIcon = FaQuestion;

/**
 * 商品ID -> 图标 映射（与 goods.ts 一一对应）
 */
export const goodsIconMap: Record<number, IconType> = {
  // ==================== 原材料 Tier 0（ID 0-17）====================
  0: GiOre,               // 铁矿石
  1: GiMining,            // 铜矿石
  2: GiMineWagon,         // 铝土矿
  3: GiCoalWagon,         // 煤炭
  4: GiOilDrum,           // 原油
  5: GiMolecule,          // 天然气
  6: GiCrystalCluster,    // 硅石
  7: GiBatteryPack,       // 锂矿
  8: GiGems,              // 稀土
  9: GiWoodPile,          // 木材
  10: GiFlax,             // 棉花
  11: GiWheat,            // 粮食
  12: GiTreeBranch,       // 天然橡胶
  13: GiCow,              // 牲畜
  14: GiFishBucket,       // 水产
  15: GiHerbsBundle,      // 药材
  16: GiGoldNuggets,      // 金矿石
  17: GiCrystalGrowth,    // 钻石原石

  // ==================== 基础材料 Tier 1（ID 18-35）====================
  18: GiSteelClaws,       // 钢材
  19: GiMetalBar,         // 铜材
  20: GiAnvilImpact,      // 铝材
  21: GiGasPump,          // 燃油
  22: GiPlasticDuck,      // 塑料
  23: GiChemicalDrop,     // 化学品
  24: GiWindow,           // 玻璃
  25: GiConcreteBag,      // 水泥
  26: GiNewspaper,        // 纸张
  27: GiRolledCloth,      // 纺织品
  28: GiCarWheel,         // 橡胶制品
  29: GiMeat,             // 肉类
  30: GiMilkCarton,       // 乳制品
  31: GiSlicedBread,      // 加工食品
  32: GiGoldBar,          // 黄金
  33: GiCutDiamond,       // 钻石
  34: GiTestTubes,        // 医药原料
  35: GiRobe,             // 丝绸

  // ==================== 中间品 Tier 2（ID 36-55）====================
  36: GiProcessor,        // 电子元件
  37: GiMicrochip,        // 芯片
  38: GiBattery75,        // 电池
  39: GiElectric,         // 电机
  40: GiTablet,           // 屏幕
  41: GiCarDoor,          // 汽车零件
  42: GiGears,            // 机械部件
  43: GiAirplaneDeparture, // 航空部件
  44: GiSolarPower,       // 光伏板
  45: GiWindmill,         // 风机叶片
  46: GiBrickPile,        // 建筑材料
  47: GiCardboardBox,     // 包装材料
  48: GiIceCube,          // 冷冻食品
  49: GiCannedFish,       // 罐头食品
  50: GiSpiralBottle,     // 抗生素
  51: GiSyringe,          // 疫苗
  52: GiBandageRoll,      // 医用耗材
  53: GiSodaCan,          // 饮料
  54: GiCookie,           // 零食
  55: GiYarn,             // 服装面料

  // ==================== 最终产品 Tier 3（ID 56-79）====================
  56: GiSmartphone,       // 智能手机
  57: GiLaptop,           // 电脑
  58: GiWashingMachine,   // 家电
  59: GiDeliveryDrone,    // 无人机
  60: GiCityCar,          // 燃油汽车
  61: MdElectricCar,      // 电动汽车
  62: GiRaceCar,          // 豪华汽车
  63: GiClothes,          // 服装
  64: GiMeal,             // 食品
  65: GiSofa,             // 家具
  66: GiLightningBow,     // 电力
  67: GiSunRadiations,    // 光伏系统
  68: MdBattery90,        // 储能系统
  69: GiRobotAntennas,    // 工业机器人
  70: GiHouse,            // 建材成品
  71: GiPill,             // 仿制药
  72: GiMedicines,        // 专利药
  73: GiHealthNormal,     // 非处方药
  74: GiMedicalPack,      // 医疗设备
  75: GiDiamondRing,      // 珠宝
  76: GiPocketWatch,      // 奢侈腕表
  77: GiDress,            // 设计师服装
  78: GiDogBowl,          // 宠物食品
  79: GiPlantSeed,        // 有机食品
};

/**
 * 获取商品图标
 * @param goodsId 商品ID
 * @returns 对应的图标组件
 */
export function getGoodsIcon(goodsId: number): IconType {
  return goodsIconMap[goodsId] || FallbackIcon;
}

/**
 * 根据商品类别获取颜色类名
 */
export function getGoodsCategoryColor(category: 'raw' | 'basic' | 'intermediate' | 'final'): string {
  switch (category) {
    case 'raw':
      return 'text-amber-500';
    case 'basic':
      return 'text-blue-500';
    case 'intermediate':
      return 'text-purple-500';
    case 'final':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
}

export default goodsIconMap;
