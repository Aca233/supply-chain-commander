/**
 * 建筑图标映射表
 * 为107种建筑提供图标映射
 */

import { IconType } from 'react-icons';
import {
  // 采掘类
  GiMiningHelmet, GiMineWagon, GiCoalWagon, GiOilPump, GiWoodAxe,
  GiFarmTractor, GiCrystalShine,
  
  // 加工类
  GiFurnace, GiOilRig, GiChemicalTank, GiWindow, GiSewingMachine,
  GiCookingPot, GiConcreteBag, GiAnvilImpact,
  
  // 制造类
  GiCircuitry, GiMicrochip, GiGears, GiWashingMachine, GiBatteryPack,
  
  // 服务类
  GiTruck, GiCardboardBox, GiPowerGenerator,
  
  // 农业
  GiPlantWatering, GiCow, GiFishingBoat, GiMeat,
  
  // 医药
  GiHerbsBundle, GiMedicines, GiMedicalDrip,
  
  // 军工
  GiAnvil, GiAk47, GiSpaceSuit,
  
  // 奢侈品
  GiGoldNuggets, GiGemChain,
  
  // 科技
  GiArtificialIntelligence, GiAtom, GiDna2,
  
  // 扩展
  GiTreehouse, GiBattery50, GiNewspaper, GiTyre, GiWoodenChair,
  GiBrickWall, GiRobotGolem, GiSolarPower,
  
  // 零售
  GiShop, GiShoppingCart, GiShoppingBag, GiSmartphone, GiCarKey,
  GiClothes, GiDiamondRing, GiGasPump, GiSofa,
  
  // 日化
  GiPalmTree, GiLipstick, GiSpray,
  
  // 交通
  GiCycle, GiCargoShip, GiSteamLocomotive, GiAirplane,
  
  // 矿业扩展
  GiMiner, GiFire,
  
  // 纺织扩展
  GiSheep, GiLeatherArmor, GiHandBag,
  
  // 建材扩展
  GiStoneTower, GiBrickPile, GiBathtub,
  
  // 农产品深加工
  GiSugarCane, GiBeerStein, GiCoffeeBeans,
  
  // 能源扩展
  GiRadioactive, GiNuclearBomb, GiNuclearPlant, GiElectric,
  
  // 通信
  GiRadioTower, GiSatelliteCommunication,
  
  // 服务业扩展
  GiGraduateCap, GiHealthNormal, GiBanknote, GiBed, GiTalk,
  
  // 文化传媒
  GiSprint, GiFilmProjector, GiGamepad, GiRolledCloth,
  
  // 杂项
  GiBaton, GiTestTubes, GiBookCover, GiWineBottle, GiRunningShoe,
  GiGuitar,
} from 'react-icons/gi';

import { FaQuestion, FaCar, FaPills, FaHospital, FaUniversity, FaWarehouse } from 'react-icons/fa';

// 备用图标
const FallbackIcon = FaQuestion;

/**
 * 建筑ID到图标的映射
 */
export const buildingIconMap: Record<number, IconType> = {
  // ==================== 采掘类建筑（ID 0-7）====================
  0: GiMiningHelmet,      // 铁矿场
  1: GiMineWagon,         // 铜矿场
  2: GiCoalWagon,         // 煤矿
  3: GiOilPump,           // 油田
  4: GiGasPump,           // 气田
  5: GiWoodAxe,           // 伐木场
  6: GiFarmTractor,       // 农场
  7: GiCrystalShine,      // 硅石矿场
  
  // ==================== 加工类建筑（ID 8-15）====================
  8: GiFurnace,           // 钢铁厂
  9: GiOilRig,            // 炼油厂
  10: GiChemicalTank,     // 化工厂
  11: GiWindow,           // 玻璃厂
  12: GiSewingMachine,    // 纺织厂
  13: GiCookingPot,       // 食品厂
  14: GiConcreteBag,      // 水泥厂
  15: GiAnvilImpact,      // 铝冶炼厂
  
  // ==================== 制造类建筑（ID 16-21）====================
  16: GiCircuitry,        // 电子厂
  17: GiMicrochip,        // 半导体厂
  18: FaCar,              // 汽车工厂
  19: GiWashingMachine,   // 家电厂
  20: GiBatteryPack,      // 电池厂
  21: GiGears,            // 零部件厂
  
  // ==================== 服务类建筑（ID 22-24）====================
  22: GiTruck,            // 物流中心
  23: FaWarehouse,        // 仓储中心
  24: GiPowerGenerator,   // 发电厂
  
  // ==================== 农业产业链建筑（ID 25-28）====================
  25: GiPlantWatering,    // 蔬菜农场
  26: GiCow,              // 畜牧场
  27: GiFishingBoat,      // 渔场
  28: GiMeat,             // 肉类加工厂
  
  // ==================== 医药产业链建筑（ID 29-31）====================
  29: GiHerbsBundle,      // 药材种植园
  30: GiMedicines,        // 制药厂
  31: GiMedicalDrip,      // 医疗器械厂
  
  // ==================== 军工产业链建筑（ID 32-34）====================
  32: GiAnvil,            // 特钢厂
  33: GiAk47,             // 武器工厂
  34: GiSpaceSuit,        // 航空航天厂
  
  // ==================== 奢侈品产业链建筑（ID 35-36）====================
  35: GiGoldNuggets,      // 金矿
  36: GiGemChain,         // 奢侈品工坊
  
  // ==================== 科技产业链建筑（ID 37-39）====================
  37: GiArtificialIntelligence, // AI芯片厂
  38: GiAtom,             // 量子实验室
  39: GiDna2,             // 生物实验室
  
  // ==================== 补全产业链建筑（ID 40-48）====================
  40: GiTreehouse,        // 橡胶园
  41: GiBattery50,        // 锂矿场
  42: GiNewspaper,        // 造纸厂
  43: GiTyre,             // 橡胶厂
  44: GiSewingMachine,    // 服装厂
  45: GiWoodenChair,      // 家具厂
  46: GiBrickWall,        // 建材厂
  47: GiRobotGolem,       // 机器人厂
  48: GiSolarPower,       // 新能源设备厂
  
  // ==================== 零售类建筑（ID 49-58）====================
  49: GiShop,             // 便利店
  50: GiShoppingCart,     // 超市
  51: GiShoppingBag,      // 大卖场
  52: GiSmartphone,       // 电子商城
  53: GiCarKey,           // 汽车4S店
  54: GiClothes,          // 服装店
  55: GiDiamondRing,      // 奢侈品店
  56: FaPills,            // 药店
  57: GiGasPump,          // 加油站
  58: GiSofa,             // 家居商城
  
  // ==================== 日化产业链建筑（ID 59-61）====================
  59: GiPalmTree,         // 棕榈种植园
  60: GiLipstick,         // 日化厂
  61: GiSpray,            // 洗涤用品厂
  
  // ==================== 交通运输设备建筑（ID 62-66）====================
  62: GiTyre,             // 轮胎厂
  63: GiCycle,            // 自行车厂
  64: GiCargoShip,        // 造船厂
  65: GiSteamLocomotive,  // 铁路车辆厂
  66: GiAirplane,         // 民用航空厂
  
  // ==================== 矿业扩展建筑（ID 67-69）====================
  67: GiMiner,            // 多金属矿场
  68: GiMiner,            // 战略金属矿场
  69: GiFire,             // 有色金属冶炼厂
  
  // ==================== 纺织扩展建筑（ID 70-72）====================
  70: GiSheep,            // 牧羊场
  71: GiLeatherArmor,     // 制革厂
  72: GiHandBag,          // 皮具厂
  
  // ==================== 建材扩展建筑（ID 73-75）====================
  73: GiStoneTower,       // 粘土矿场
  74: GiBrickPile,        // 砖瓦厂
  75: GiBathtub,          // 陶瓷厂
  
  // ==================== 农产品深加工建筑（ID 76-79）====================
  76: GiFarmTractor,      // 经济作物种植园
  77: GiSugarCane,        // 制糖厂
  78: GiBeerStein,        // 酿酒厂
  79: GiCoffeeBeans,      // 饮品厂
  
  // ==================== 能源扩展建筑（ID 80-83）====================
  80: GiRadioactive,      // 铀矿场
  81: GiNuclearBomb,      // 核燃料厂
  82: GiNuclearPlant,     // 核电设备厂
  83: GiElectric,         // 电力设备厂
  
  // ==================== 通信产业链建筑（ID 84-87）====================
  84: GiElectric,         // 光纤厂
  85: GiRadioTower,       // 通信设备厂
  86: GiRadioTower,       // 网络设备厂
  87: GiSatelliteCommunication, // 卫星工厂
  
  // ==================== 服务业建筑（ID 88-93）====================
  88: GiGraduateCap,      // 学校
  89: FaHospital,         // 医院
  90: FaUniversity,       // 银行
  91: GiBed,              // 酒店
  92: GiTruck,            // 运输公司
  93: GiTalk,             // 咨询公司
  
  // ==================== 文化传媒建筑（ID 94-97）====================
  94: GiSprint,           // 印刷厂
  95: GiFilmProjector,    // 影视制作中心
  96: GiGamepad,          // 游戏工作室
  97: GiRolledCloth,      // 玩具厂
  
  // ==================== 杂项建筑（ID 98-106）====================
  98: GiBaton,            // 配件厂
  99: GiTestTubes,        // 精细化工厂
  100: GiGears,           // 精密零件厂
  101: GiLipstick,        // 化妆品店
  102: GiBookCover,       // 书店
  103: GiWineBottle,      // 酒类专卖店
  104: GiRunningShoe,     // 体育用品店
  105: GiRolledCloth,     // 玩具店
  106: GiGuitar,          // 乐器店
};

/**
 * 获取建筑图标
 * @param buildingTypeId 建筑类型ID
 * @returns 对应的图标组件
 */
export function getBuildingIcon(buildingTypeId: number): IconType {
  return buildingIconMap[buildingTypeId] || FallbackIcon;
}

/**
 * 根据建筑类别获取颜色类名
 */
export function getBuildingCategoryColor(category: 'extraction' | 'processing' | 'manufacturing' | 'luxury' | 'service' | 'retail'): string {
  switch (category) {
    case 'extraction':
      return 'text-amber-500';
    case 'processing':
      return 'text-blue-500';
    case 'manufacturing':
      return 'text-green-500';
    case 'luxury':
      return 'text-yellow-500';
    case 'service':
      return 'text-purple-500';
    case 'retail':
      return 'text-orange-500';
    default:
      return 'text-gray-500';
  }
}

export default buildingIconMap;