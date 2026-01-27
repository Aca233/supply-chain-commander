/**
 * 商品图标映射表
 * 为230种商品提供图标映射
 */

import { IconType } from 'react-icons';
import {
  // 矿石和原材料
  GiMineWagon, GiCoalWagon, GiOilDrum,
  GiWoodPile, GiWheat, GiCrystalBall,
  GiGems, GiSpiralBottle, GiChemicalDrop, GiBatteryPack,
  
  // 基础材料
  GiSteelClaws, GiMetalBar, GiAnvilImpact, GiWindow, GiPlasticDuck,
  GiCarWheel, GiPoisonBottle, GiBrickWall, GiNewspaper, GiRolledCloth,
  GiSlicedBread, GiGasPump,
  
  // 电子和中间产品
  GiProcessor, GiMicrochip, GiBattery75, GiElectric, GiComputerFan,
  GiGears, GiCarDoor, GiAirplaneDeparture, GiSolarPower, GiWindmill,
  GiConcreteBag, GiCardboardBox,
  
  // 最终产品
  GiSmartphone, GiLaptop, GiWashingMachine, GiCityCar, GiClothes,
  GiMeal, GiSodaCan, GiSofa, GiHouse, GiMedicalPack,
  GiSunRadiations, GiRobotAntennas, GiDeliveryDrone, GiDiamondRing,
  GiCrownedHeart, GiRotaryPhone, GiLightningBow,
  
  // 农业
  GiCarrot, GiFruitBowl, GiCow, GiChicken, GiFishBucket,
  GiMeat, GiMilkCarton, GiIceCube, GiCannedFish, GiCookie,
  GiPlantSeed, GiDogBowl,
  
  // 医药
  GiHerbsBundle, GiTestTubes, GiMedicines, GiSyringe, GiPill,
  GiBandageRoll, GiMicroscope, GiScalpel,
  
  // 军工
  GiMetalPlate, GiDynamite, GiChestArmor, GiRadarDish, GiPistolGun,
  GiJeep, GiJetFighter,
  
  // 奢侈品
  GiGoldNuggets, GiMining, GiGoldBar, GiCutDiamond, GiRobe,
  GiDress, GiPocketWatch, GiRaceCar,
  
  // 科技
  GiArtificialIntelligence, GiAtom, GiDna2, GiServerRack, GiRobotGolem,
  GiVrHeadset,
  
  // 日化
  GiCoconuts, GiFlowerPot, GiDroplets, GiPerfumeBottle, GiPaintBucket,
  GiPowder, GiWaterSplash, GiLipstick, GiSpray,
  
  // 交通
  GiTyre, GiCarSeat, GiShipWheel, GiJetPack, GiCycle,
  GiScooter, GiCargoShip, GiSteamLocomotive, GiAirplane,
  GiBusDoors,
  
  // 矿业扩展
  GiMiningHelmet, GiOre, GiCrystalGrowth, GiStonePile, GiDrill,
  GiAnvil, GiCrystalCluster, GiWeight, GiHammerDrop,
  
  // 纺织扩展
  GiWool, GiFlax, GiAnimalHide, GiFeather, GiYarn,
  GiLeatherBoot, GiWinterGloves, GiBackpack, GiBootStomp,
  
  // 建材扩展
  GiPlanks, GiRock, GiBrickPile, GiWoodBeam,
  GiPaintRoller, GiBathtub, GiKnifeFork, GiHanger,
  
  // 农产品深加工
  GiGrapes, GiSugarCane, GiTeapot, GiCoffeeBeans, GiCigar,
  GiSunflower, GiFlour, GiBeerStein, GiWineBottle,
  GiMartini, GiCandyCanes,
  
  // 能源扩展
  GiRadioactive, GiTreeBranch, GiNuclear, GiMolecule,
  GiNuclearPlant, GiFuelTank, GiWindTurbine, GiElectricalResistance, GiElectricalCrescent,
  
  // 通信
  GiRadioTower, GiTablet, GiWatch,
  GiSatelliteCommunication,
  
  // 服务业
  GiGraduateCap, GiHealthNormal, GiBanknote, GiPartyPopper, GiForkKnifeSpoon,
  GiBed, GiTruck, GiBroom, GiSecurityGate, GiMegaphone,
  GiScales, GiTalk, GiDatabase, GiMagnifyingGlass,
  
  // 文化传媒
  GiFilmProjector, GiBookCover, GiCompactDisc, GiFilmStrip,
  GiGamepad, GiRunningShoe, GiGuitar,
  
  // 杂项
  GiZipper, GiBaton, GiChemicalTank, GiReactor,
  GiCog, GiSpring, GiRoundStruck, GiGasMask,
} from 'react-icons/gi';

import { FaQuestion, FaTint, FaFire, FaPen } from 'react-icons/fa';
import { MdElectricCar, MdBattery90, MdRouter, MdSensors } from 'react-icons/md';
import { BiCabinet } from 'react-icons/bi';

// 备用图标（当特定图标不可用时使用）
const FallbackIcon = FaQuestion;

/**
 * 商品ID到图标的映射
 * 使用 Record 类型确保类型安全
 */
export const goodsIconMap: Record<number, IconType> = {
  // ==================== 核心原材料（tier 0, ID 0-13）====================
  0: GiOre,               // 铁矿石
  1: GiMetalBar,          // 铜矿石
  2: GiMineWagon,         // 铝土矿
  3: GiCoalWagon,         // 煤炭
  4: GiOilDrum,           // 原油
  5: GiGasMask,           // 天然气
  6: GiWoodPile,          // 木材
  7: GiFlax,              // 棉花
  8: GiWheat,             // 粮食
  9: GiCrystalBall,       // 硅石
  10: GiGems,             // 稀土
  11: GiSpiralBottle,     // 天然橡胶
  12: GiChemicalDrop,     // 化工原料
  13: GiBatteryPack,      // 锂矿
  
  // ==================== 核心基础材料（tier 1, ID 14-25）====================
  14: GiSteelClaws,       // 钢材
  15: GiMetalBar,         // 铜材
  16: GiAnvilImpact,      // 铝材
  17: GiWindow,           // 玻璃
  18: GiPlasticDuck,      // 塑料
  19: GiCarWheel,         // 橡胶制品
  20: GiPoisonBottle,     // 化学品
  21: GiBrickWall,        // 水泥
  22: GiNewspaper,        // 纸张
  23: GiRolledCloth,      // 纺织品
  24: GiSlicedBread,      // 加工食品
  25: GiGasPump,          // 燃油
  
  // ==================== 核心中间产品（tier 2, ID 26-37）====================
  26: GiProcessor,        // 电子元件
  27: GiMicrochip,        // 芯片
  28: GiBattery75,        // 电池
  29: GiElectric,         // 电机
  30: GiComputerFan,      // 屏幕
  31: GiGears,            // 机械部件
  32: GiCarDoor,          // 汽车零部件
  33: GiAirplaneDeparture, // 航空部件
  34: GiSolarPower,       // 光伏板
  35: GiWindmill,         // 风机叶片
  36: GiConcreteBag,      // 建筑材料
  37: GiCardboardBox,     // 包装材料
  
  // ==================== 核心最终产品（tier 3, ID 38-57）====================
  38: GiSmartphone,       // 智能手机
  39: GiLaptop,           // 电脑
  40: GiWashingMachine,   // 家电
  41: GiCityCar,          // 汽车
  42: MdElectricCar,      // 电动汽车
  43: GiClothes,          // 服装
  44: GiMeal,             // 食品
  45: GiSodaCan,          // 饮料
  46: GiSofa,             // 家具
  47: GiHouse,            // 建材成品
  48: GiMedicalPack,      // 医疗设备
  49: GiSunRadiations,    // 光伏系统
  50: MdBattery90,        // 储能系统
  51: GiRobotAntennas,    // 工业机器人
  52: GiDeliveryDrone,    // 无人机
  53: GiDiamondRing,      // 奢侈品
  54: GiCrownedHeart,     // 珠宝
  55: GiSmartphone,       // 高端手机
  56: GiRotaryPhone,      // 平价手机
  57: GiLightningBow,     // 电力
  
  // ==================== 农业产业链（ID 58-69）====================
  58: GiCarrot,           // 蔬菜
  59: GiFruitBowl,        // 水果
  60: GiCow,              // 牲畜
  61: GiChicken,          // 家禽
  62: GiFishBucket,       // 水产
  63: GiMeat,             // 肉类
  64: GiMilkCarton,       // 乳制品
  65: GiIceCube,          // 冷冻食品
  66: GiCannedFish,       // 罐头食品
  67: GiCookie,           // 零食
  68: GiPlantSeed,        // 有机食品
  69: GiDogBowl,          // 宠物食品
  
  // ==================== 医药产业链（ID 70-79）====================
  70: GiHerbsBundle,      // 药材
  71: GiTestTubes,        // 医药化工品
  72: GiMedicines,        // 抗生素
  73: GiSyringe,          // 疫苗
  74: GiPill,             // 仿制药
  75: GiMedicines,        // 专利药
  76: GiMedicalPack,      // 非处方药
  77: GiBandageRoll,      // 医用耗材
  78: GiMicroscope,       // 诊断设备
  79: GiScalpel,          // 手术设备
  
  // ==================== 军工产业链（ID 80-87）====================
  80: GiMetalPlate,       // 特种钢材
  81: GiDynamite,         // 炸药
  82: GiChestArmor,       // 装甲板
  83: GiRadarDish,        // 军用电子
  84: GiPistolGun,        // 轻武器
  85: GiDynamite,         // 重武器
  86: GiJeep,             // 军用车辆
  87: GiJetFighter,       // 战斗机
  
  // ==================== 奢侈品产业链（ID 88-95）====================
  88: GiGoldNuggets,      // 金矿石
  89: GiMining,           // 钻石矿石
  90: GiGoldBar,          // 黄金
  91: GiCutDiamond,       // 钻石
  92: GiRobe,             // 丝绸
  93: GiDress,            // 设计师服装
  94: GiPocketWatch,      // 奢侈腕表
  95: GiRaceCar,          // 豪华汽车
  
  // ==================== 科技产业链（ID 96-103）====================
  96: GiArtificialIntelligence, // AI芯片
  97: GiAtom,             // 量子组件
  98: GiDna2,             // 生物材料
  99: GiServerRack,       // AI服务器
  100: GiAtom,            // 量子计算机
  101: GiDna2,            // 生物制品
  102: GiRobotGolem,      // 智能机器人
  103: GiVrHeadset,       // VR设备
  
  // ==================== 日化产业链（ID 104-115）====================
  104: GiCoconuts,        // 棕榈油
  105: GiFlowerPot,       // 香料原料
  106: GiDroplets,        // 表面活性剂
  107: GiPerfumeBottle,   // 香精
  108: GiPaintBucket,     // 颜料
  109: GiPowder,          // 化妆品基质
  110: GiWaterSplash,     // 清洁剂原液
  111: GiLipstick,        // 化妆品
  112: GiLipstick,        // 护肤品
  113: GiSpray,           // 洗涤用品
  114: GiSpray,           // 洗发护发用品
  115: GiSpray,           // 口腔护理用品
  
  // ==================== 交通运输设备（ID 116-127）====================
  116: GiTyre,            // 轮胎
  117: GiCarSeat,         // 汽车座椅
  118: GiShipWheel,       // 船舶部件
  119: GiSteamLocomotive, // 铁路车辆部件
  120: GiJetPack,         // 航空发动机
  121: GiCycle,           // 自行车
  122: GiScooter,         // 摩托车
  123: GiScooter,         // 电动滑板车
  124: GiCargoShip,       // 船舶
  125: GiSteamLocomotive, // 铁路车辆
  126: GiAirplane,        // 民用飞机
  127: GiBusDoors,        // 公交车
  
  // ==================== 矿业扩展（ID 128-139）====================
  128: GiMineWagon,       // 锌矿石
  129: GiMiningHelmet,    // 镍矿石
  130: GiOre,             // 锡矿石
  131: GiCrystalGrowth,   // 钴矿石
  132: GiStonePile,       // 锰矿石
  133: GiDrill,           // 钨矿石
  134: GiAnvil,           // 锌
  135: GiMetalBar,        // 镍
  136: GiAnvil,           // 锡
  137: GiCrystalCluster,  // 钴
  138: GiWeight,          // 锰
  139: GiHammerDrop,      // 钨
  
  // ==================== 纺织扩展（ID 140-149）====================
  140: GiWool,            // 羊毛
  141: GiFlax,            // 亚麻
  142: GiAnimalHide,      // 生皮
  143: GiFeather,         // 羽绒
  144: GiYarn,            // 毛纱
  145: GiRolledCloth,     // 麻布
  146: GiLeatherBoot,     // 皮革
  147: GiWinterGloves,    // 毛织品
  148: GiBackpack,        // 皮具
  149: GiBootStomp,       // 鞋类
  
  // ==================== 建材扩展（ID 150-159）====================
  150: GiPlanks,          // 粘土
  151: GiRock,            // 大理石
  152: GiBrickPile,       // 砖
  153: GiBrickWall,       // 瓷砖
  154: GiWoodBeam,        // 木板
  155: GiPaintRoller,     // 涂料
  156: BiCabinet,         // 陶瓷制品
  157: GiBathtub,         // 卫浴设备
  158: GiKnifeFork,       // 餐具
  159: GiHanger,          // 装饰材料
  
  // ==================== 农产品深加工（ID 160-175）====================
  160: GiGrapes,          // 葡萄
  161: GiSugarCane,       // 甘蔗
  162: GiTeapot,          // 茶叶
  163: GiCoffeeBeans,     // 咖啡豆
  164: GiCigar,           // 烟叶
  165: GiSunflower,       // 油料作物
  166: GiSugarCane,       // 糖
  167: FaTint,            // 食用油
  168: GiFlour,           // 面粉
  169: GiBeerStein,       // 啤酒
  170: GiWineBottle,      // 葡萄酒
  171: GiMartini,         // 烈酒
  172: GiTeapot,          // 茶饮
  173: GiCoffeeBeans,     // 咖啡
  174: GiCigar,           // 烟草制品
  175: GiCandyCanes,      // 糖果
  
  // ==================== 能源扩展（ID 176-185）====================
  176: GiRadioactive,     // 铀矿石
  177: GiTreeBranch,      // 生物质
  178: GiNuclear,         // 核燃料
  179: GiMolecule,        // 氢气
  180: FaFire,            // 生物燃料
  181: GiNuclearPlant,    // 核反应堆
  182: GiFuelTank,        // 燃料电池
  183: GiWindTurbine,     // 风力发电机
  184: GiElectricalResistance, // 变压器
  185: GiElectricalCrescent, // 电力电缆
  
  // ==================== 通信产业链（ID 186-195）====================
  186: GiElectricalCrescent, // 光纤
  187: GiRadioTower,      // 天线
  188: MdSensors,         // 传感器
  189: GiMicrochip,       // 存储芯片
  190: GiTablet,          // 显示面板
  191: MdRouter,          // 路由器
  192: GiRadioTower,      // 通信基站
  193: GiSatelliteCommunication, // 卫星
  194: GiTablet,          // 平板电脑
  195: GiWatch,           // 智能手表
  
  // ==================== 服务业产品（ID 196-209）====================
  196: GiGraduateCap,     // 教育服务
  197: GiHealthNormal,    // 医疗服务
  198: GiBanknote,        // 金融服务
  199: GiPartyPopper,     // 娱乐服务
  200: GiForkKnifeSpoon,  // 餐饮服务
  201: GiBed,             // 住宿服务
  202: GiTruck,           // 运输服务
  203: GiBroom,           // 清洁服务
  204: GiSecurityGate,    // 安保服务
  205: GiMegaphone,       // 广告服务
  206: GiScales,          // 法律服务
  207: GiTalk,            // 咨询服务
  208: GiDatabase,        // 软件服务
  209: GiMagnifyingGlass, // 研发服务
  
  // ==================== 文化传媒商品（ID 210-219）====================
  210: FaPen,             // 印刷油墨
  211: GiFilmProjector,   // 影视设备
  212: GiBookCover,       // 图书
  213: GiNewspaper,       // 杂志报刊
  214: GiCompactDisc,     // 音乐专辑
  215: GiFilmStrip,       // 电影
  216: GiGamepad,         // 电子游戏
  217: GiCookie,          // 玩具
  218: GiRunningShoe,     // 运动器材
  219: GiGuitar,          // 乐器
  
  // ==================== 杂项补充商品（ID 220-229）====================
  220: GiZipper,          // 拉链
  221: GiBaton,           // 纽扣
  222: GiChemicalTank,    // 光刻胶
  223: GiGasMask,         // 惰性气体
  224: GiReactor,         // 催化剂
  225: GiChemicalDrop,    // 胶粘剂
  226: GiCog,             // 轴承
  227: GiSpring,          // 弹簧
  228: GiRoundStruck,     // 密封件
  229: GiCog,             // 过滤器
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