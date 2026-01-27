# 图标系统设计与实施计划

## 概述

为游戏中的 **230种商品** 和 **107种建筑** 设计并实装图标系统，使用 **React Icons** 混合方案实现最佳覆盖率。

## 技术方案

### 依赖安装
```bash
npm install react-icons
```

### 主要使用的图标集
1. **Game Icons (gi)** - 工业、资源、材料相关图标（主力）
2. **Font Awesome (fa)** - 通用图标补充
3. **Material Design Icons (md)** - 建筑和服务类图标
4. **Heroicons (hi)** - 现代UI元素
5. **Remix Icons (ri)** - 额外补充

## 架构设计

### 文件结构
```
src/
├── ui/
│   └── components/
│       └── Icons/
│           ├── index.ts           # 统一导出
│           ├── GoodsIcon.tsx      # 商品图标组件
│           ├── BuildingIcon.tsx   # 建筑图标组件
│           ├── goodsIconMap.ts    # 商品图标映射
│           └── buildingIconMap.ts # 建筑图标映射
```

### 图标组件设计

```tsx
// GoodsIcon.tsx
interface GoodsIconProps {
  goodsId: number;
  size?: number;
  className?: string;
}

export const GoodsIcon: React.FC<GoodsIconProps> = ({ goodsId, size = 24, className }) => {
  const IconComponent = goodsIconMap[goodsId] || FaQuestion;
  return <IconComponent size={size} className={className} />;
};
```

---

## 商品图标映射表（230种商品）

### 核心原材料（tier 0, ID 0-13）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 0 | iron-ore | 铁矿石 | GiIronBar | gi |
| 1 | copper-ore | 铜矿石 | GiCopperBar | gi |
| 2 | bauxite | 铝土矿 | GiMineWagon | gi |
| 3 | coal | 煤炭 | GiCoalWagon | gi |
| 4 | crude-oil | 原油 | GiOilDrum | gi |
| 5 | natural-gas | 天然气 | GiGasStove | gi |
| 6 | timber | 木材 | GiWoodPile | gi |
| 7 | cotton | 棉花 | GiCottonFlower | gi |
| 8 | grain | 粮食 | GiWheat | gi |
| 9 | silicon | 硅石 | GiCrystalBall | gi |
| 10 | rare-earth | 稀土 | GiGems | gi |
| 11 | rubber-raw | 天然橡胶 | GiSpiralBottle | gi |
| 12 | chemicals-raw | 化工原料 | GiChemicalDrop | gi |
| 13 | lithium | 锂矿 | GiBattery100 | gi |

### 核心基础材料（tier 1, ID 14-25）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 14 | steel | 钢材 | GiSteelClaws | gi |
| 15 | copper | 铜材 | GiMetalBar | gi |
| 16 | aluminum | 铝材 | GiAnvilImpact | gi |
| 17 | glass | 玻璃 | GiWindow | gi |
| 18 | plastic | 塑料 | GiPlasticDuck | gi |
| 19 | rubber | 橡胶制品 | GiCarWheel | gi |
| 20 | chemicals | 化学品 | GiPoisonBottle | gi |
| 21 | cement | 水泥 | GiBrickWall | gi |
| 22 | paper | 纸张 | GiNewspaper | gi |
| 23 | textiles | 纺织品 | GiRolledCloth | gi |
| 24 | processed-food | 加工食品 | GiSlicedBread | gi |
| 25 | fuel | 燃油 | GiGasPump | gi |

### 核心中间产品（tier 2, ID 26-37）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 26 | electronics | 电子元件 | GiProcessor | gi |
| 27 | chips | 芯片 | GiMicrochip | gi |
| 28 | battery | 电池 | GiBattery75 | gi |
| 29 | motor | 电机 | GiElectric | gi |
| 30 | screen | 屏幕 | GiComputerFan | gi |
| 31 | mechanical-parts | 机械部件 | GiGears | gi |
| 32 | car-parts | 汽车零部件 | GiCarDoor | gi |
| 33 | aircraft-parts | 航空部件 | GiAirplaneDeparture | gi |
| 34 | solar-panel | 光伏板 | GiSolarPower | gi |
| 35 | wind-blade | 风机叶片 | GiWindmill | gi |
| 36 | building-materials | 建筑材料 | GiConcreteBag | gi |
| 37 | packaging | 包装材料 | GiCardboardBox | gi |

### 核心最终产品（tier 3, ID 38-57）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 38 | smartphone | 智能手机 | GiSmartphone | gi |
| 39 | computer | 电脑 | GiLaptop | gi |
| 40 | appliances | 家电 | GiWashingMachine | gi |
| 41 | car | 汽车 | GiCityCar | gi |
| 42 | electric-car | 电动汽车 | GiElectricCar | gi |
| 43 | clothing | 服装 | GiClothes | gi |
| 44 | food | 食品 | GiMeal | gi |
| 45 | beverages | 饮料 | GiSodaCan | gi |
| 46 | furniture | 家具 | GiSofa | gi |
| 47 | building-products | 建材成品 | GiHouseFrame | gi |
| 48 | medical-equipment | 医疗设备 | GiMedicalPackAlt | gi |
| 49 | solar-system | 光伏系统 | GiSunRadiations | gi |
| 50 | energy-storage | 储能系统 | GiBatteryPack | gi |
| 51 | industrial-robot | 工业机器人 | GiRobotAntennas | gi |
| 52 | drone | 无人机 | GiDeliveryDrone | gi |
| 53 | luxury-goods | 奢侈品 | GiDiamondRing | gi |
| 54 | jewelry | 珠宝 | GiCrownedHeart | gi |
| 55 | premium-phone | 高端手机 | GiSmartphone | gi |
| 56 | budget-phone | 平价手机 | GiRotaryPhone | gi |
| 57 | electricity | 电力 | GiLightningBolt | gi |

### 农业产业链（ID 58-69）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 58 | vegetables | 蔬菜 | GiCarrot | gi |
| 59 | fruits | 水果 | GiFruitBowl | gi |
| 60 | livestock | 牲畜 | GiCow | gi |
| 61 | poultry | 家禽 | GiChicken | gi |
| 62 | fish | 水产 | GiFishBucket | gi |
| 63 | meat | 肉类 | GiMeat | gi |
| 64 | dairy | 乳制品 | GiMilkCarton | gi |
| 65 | frozen-food | 冷冻食品 | GiFrozenBlock | gi |
| 66 | canned-food | 罐头食品 | GiCanister | gi |
| 67 | snacks | 零食 | GiCookie | gi |
| 68 | organic-food | 有机食品 | GiPlantSeed | gi |
| 69 | pet-food | 宠物食品 | GiDogBowl | gi |

### 医药产业链（ID 70-79）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 70 | herbs | 药材 | GiHerbsBundle | gi |
| 71 | medical-chemicals | 医药化工品 | GiTestTubes | gi |
| 72 | antibiotics | 抗生素 | GiMedicines | gi |
| 73 | vaccines | 疫苗 | GiSyringe | gi |
| 74 | generic-drugs | 仿制药 | GiPill | gi |
| 75 | patent-drugs | 专利药 | GiMedicinePills | gi |
| 76 | otc-drugs | 非处方药 | GiFirstAidKit | gi |
| 77 | medical-consumables | 医用耗材 | GiBandageRoll | gi |
| 78 | diagnostic-equipment | 诊断设备 | GiMicroscope | gi |
| 79 | surgical-equipment | 手术设备 | GiScalpel | gi |

### 军工产业链（ID 80-87）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 80 | special-steel | 特种钢材 | GiMetalPlate | gi |
| 81 | explosives | 炸药 | GiDynamite | gi |
| 82 | armor-plate | 装甲板 | GiChestArmor | gi |
| 83 | military-electronics | 军用电子 | GiRadarDish | gi |
| 84 | small-arms | 轻武器 | GiPistolGun | gi |
| 85 | heavy-weapons | 重武器 | GiArtilleryShell | gi |
| 86 | military-vehicle | 军用车辆 | GiJeep | gi |
| 87 | fighter-jet | 战斗机 | GiJetFighter | gi |

### 奢侈品产业链（ID 88-95）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 88 | gold-ore | 金矿石 | GiGoldNuggets | gi |
| 89 | diamond-ore | 钻石矿石 | GiMining | gi |
| 90 | gold | 黄金 | GiGoldBar | gi |
| 91 | diamond | 钻石 | GiCutDiamond | gi |
| 92 | silk | 丝绸 | GiSilkRobe | gi |
| 93 | designer-clothing | 设计师服装 | GiTravelDress | gi |
| 94 | luxury-watch | 奢侈腕表 | GiWristwatch | gi |
| 95 | luxury-car | 豪华汽车 | GiRaceCar | gi |

### 科技产业链（ID 96-103）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 96 | ai-chip | AI芯片 | GiArtificialIntelligence | gi |
| 97 | quantum-component | 量子组件 | GiAtom | gi |
| 98 | biotech-material | 生物材料 | GiDna2 | gi |
| 99 | ai-server | AI服务器 | GiServerRack | gi |
| 100 | quantum-computer | 量子计算机 | GiQuantumBrain | gi |
| 101 | biotech-product | 生物制品 | GiDnaHelix | gi |
| 102 | smart-robot | 智能机器人 | GiRobotGolem | gi |
| 103 | vr-device | VR设备 | GiVrHeadset | gi |

### 日化产业链（ID 104-115）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 104 | palm-oil | 棕榈油 | GiCoconut | gi |
| 105 | fragrance-raw | 香料原料 | GiFlowerPot | gi |
| 106 | surfactant | 表面活性剂 | GiDroplet | gi |
| 107 | fragrance | 香精 | GiPerfumeBottle | gi |
| 108 | pigment | 颜料 | GiPaintBucket | gi |
| 109 | cosmetic-base | 化妆品基质 | GiPowder | gi |
| 110 | cleaning-agent | 清洁剂原液 | GiWaterSplash | gi |
| 111 | cosmetics | 化妆品 | GiLipstick | gi |
| 112 | skincare | 护肤品 | GiFaceToFace | gi |
| 113 | detergent | 洗涤用品 | GiSpray | gi |
| 114 | shampoo | 洗发护发用品 | GiShampoo | gi |
| 115 | toothpaste | 口腔护理用品 | GiToothbrush | gi |

### 交通运输设备（ID 116-127）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 116 | tire | 轮胎 | GiTyre | gi |
| 117 | car-seat | 汽车座椅 | GiCarSeat | gi |
| 118 | ship-parts | 船舶部件 | GiShipWheel | gi |
| 119 | train-parts | 铁路车辆部件 | GiTrainTrack | gi |
| 120 | aircraft-engine | 航空发动机 | GiJetPack | gi |
| 121 | bicycle | 自行车 | GiBicycle | gi |
| 122 | motorcycle | 摩托车 | GiMotorbike | gi |
| 123 | electric-scooter | 电动滑板车 | GiScooter | gi |
| 124 | ship | 船舶 | GiCargoShip | gi |
| 125 | train-car | 铁路车辆 | GiSteamLocomotive | gi |
| 126 | civil-aircraft | 民用飞机 | GiAirplane | gi |
| 127 | bus | 公交车 | GiBus | gi |

### 矿业扩展（ID 128-139）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 128 | zinc-ore | 锌矿石 | GiMineWagon | gi |
| 129 | nickel-ore | 镍矿石 | GiMiningHammer | gi |
| 130 | tin-ore | 锡矿石 | GiOre | gi |
| 131 | cobalt-ore | 钴矿石 | GiCrystalGrowth | gi |
| 132 | manganese-ore | 锰矿石 | GiStonePile | gi |
| 133 | tungsten-ore | 钨矿石 | GiDrill | gi |
| 134 | zinc | 锌 | GiAnvil | gi |
| 135 | nickel | 镍 | GiMetalDisc | gi |
| 136 | tin | 锡 | GiIngot | gi |
| 137 | cobalt | 钴 | GiCrystalCluster | gi |
| 138 | manganese | 锰 | GiWeight | gi |
| 139 | tungsten | 钨 | GiHammerDrop | gi |

### 纺织扩展（ID 140-149）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 140 | wool | 羊毛 | GiWool | gi |
| 141 | flax | 亚麻 | GiFlax | gi |
| 142 | leather-raw | 生皮 | GiAnimalHide | gi |
| 143 | down | 羽绒 | GiFeather | gi |
| 144 | wool-yarn | 毛纱 | GiYarn | gi |
| 145 | linen-fabric | 麻布 | GiFabric | gi |
| 146 | leather | 皮革 | GiLeatherBoot | gi |
| 147 | wool-clothing | 毛织品 | GiWinterGloves | gi |
| 148 | leather-goods | 皮具 | GiBackpack | gi |
| 149 | shoes | 鞋类 | GiBootStomp | gi |

### 建材扩展（ID 150-159）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 150 | clay | 粘土 | GiPlanks | gi |
| 151 | marble | 大理石 | GiRock | gi |
| 152 | brick | 砖 | GiBrickPile | gi |
| 153 | tile | 瓷砖 | GiTiles | gi |
| 154 | wood-board | 木板 | GiWoodBeam | gi |
| 155 | paint | 涂料 | GiPaintRoller | gi |
| 156 | ceramics | 陶瓷制品 | GiVase | gi |
| 157 | sanitary-ware | 卫浴设备 | GiBathtub | gi |
| 158 | tableware | 餐具 | GiKnifeFork | gi |
| 159 | decoration | 装饰材料 | GiHanger | gi |

### 农产品深加工（ID 160-175）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 160 | grape | 葡萄 | GiGrapes | gi |
| 161 | sugarcane | 甘蔗 | GiSugarCane | gi |
| 162 | tea-leaf | 茶叶 | GiTeapot | gi |
| 163 | coffee-bean | 咖啡豆 | GiCoffeeBeans | gi |
| 164 | tobacco | 烟叶 | GiCigar | gi |
| 165 | oilseed | 油料作物 | GiSunflower | gi |
| 166 | sugar | 糖 | GiSugarCane | gi |
| 167 | edible-oil | 食用油 | GiOilRig | gi |
| 168 | flour | 面粉 | GiFlour | gi |
| 169 | beer | 啤酒 | GiBeerStein | gi |
| 170 | wine | 葡萄酒 | GiWineBottle | gi |
| 171 | spirits | 烈酒 | GiMartini | gi |
| 172 | tea-product | 茶饮 | GiTeaCup | gi |
| 173 | coffee-product | 咖啡 | GiCoffeeCup | gi |
| 174 | cigarettes | 烟草制品 | GiCigarette | gi |
| 175 | candy | 糖果 | GiCandyCanes | gi |

### 能源扩展（ID 176-185）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 176 | uranium-ore | 铀矿石 | GiRadioactive | gi |
| 177 | biomass | 生物质 | GiTreeBranch | gi |
| 178 | nuclear-fuel | 核燃料 | GiNuclear | gi |
| 179 | hydrogen | 氢气 | GiMolecule | gi |
| 180 | biofuel | 生物燃料 | GiGascan | gi |
| 181 | nuclear-reactor | 核反应堆 | GiNuclearPlant | gi |
| 182 | fuel-cell | 燃料电池 | GiFuelTank | gi |
| 183 | wind-turbine | 风力发电机 | GiWindTurbine | gi |
| 184 | transformer | 变压器 | GiElectricalResistance | gi |
| 185 | power-cable | 电力电缆 | GiElectricalCrescent | gi |

### 通信产业链（ID 186-195）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 186 | optical-fiber | 光纤 | GiFiberOptic | gi |
| 187 | antenna | 天线 | GiAntenna | gi |
| 188 | sensor | 传感器 | GiSensorProbe | gi |
| 189 | memory-chip | 存储芯片 | GiSdCard | gi |
| 190 | display-panel | 显示面板 | GiTablet | gi |
| 191 | router | 路由器 | GiRouter | gi |
| 192 | base-station | 通信基站 | GiRadioTower | gi |
| 193 | satellite | 卫星 | GiSatelliteCommunication | gi |
| 194 | tablet | 平板电脑 | GiTabletPad | gi |
| 195 | smartwatch | 智能手表 | GiWatch | gi |

### 服务业产品（ID 196-209）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 196 | education-service | 教育服务 | GiGraduateCap | gi |
| 197 | healthcare-service | 医疗服务 | GiHealthNormal | gi |
| 198 | financial-service | 金融服务 | GiBanknote | gi |
| 199 | entertainment-service | 娱乐服务 | GiPartyPopper | gi |
| 200 | catering-service | 餐饮服务 | GiForkKnifeSpoon | gi |
| 201 | hotel-service | 住宿服务 | GiBed | gi |
| 202 | transport-service | 运输服务 | GiTruck | gi |
| 203 | cleaning-service | 清洁服务 | GiBroom | gi |
| 204 | security-service | 安保服务 | GiSecurityGate | gi |
| 205 | advertising-service | 广告服务 | GiMegaphone | gi |
| 206 | legal-service | 法律服务 | GiScales | gi |
| 207 | consulting-service | 咨询服务 | GiTalk | gi |
| 208 | software-service | 软件服务 | GiDatabase | gi |
| 209 | research-service | 研发服务 | GiMagnifyingGlass | gi |

### 文化传媒商品（ID 210-219）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 210 | printing-ink | 印刷油墨 | GiInk | gi |
| 211 | film-equipment | 影视设备 | GiFilmProjector | gi |
| 212 | books | 图书 | GiBookCover | gi |
| 213 | magazines | 杂志报刊 | GiNewspaper | gi |
| 214 | music-album | 音乐专辑 | GiCompactDisc | gi |
| 215 | movie | 电影 | GiFilmStrip | gi |
| 216 | video-game | 电子游戏 | GiGamepad | gi |
| 217 | toy | 玩具 | GiTeddyBear | gi |
| 218 | sports-equipment | 运动器材 | GiRunningShoe | gi |
| 219 | musical-instrument | 乐器 | GiGuitar | gi |

### 杂项补充商品（ID 220-229）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 220 | zipper | 拉链 | GiZipper | gi |
| 221 | buttons | 纽扣 | GiButton | gi |
| 222 | photoresist | 光刻胶 | GiChemicalTank | gi |
| 223 | inert-gas | 惰性气体 | GiGasMask | gi |
| 224 | catalyst | 催化剂 | GiReactor | gi |
| 225 | adhesive | 胶粘剂 | GiGlue | gi |
| 226 | bearing | 轴承 | GiCog | gi |
| 227 | spring | 弹簧 | GiCoiledNail | gi |
| 228 | seal | 密封件 | GiRoundStruck | gi |
| 229 | filter | 过滤器 | GiAirFilter | gi |

---

## 建筑图标映射表（107种建筑）

### 采掘类建筑（ID 0-7）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 0 | iron-mine | 铁矿场 | GiMiningHelmet | gi |
| 1 | copper-mine | 铜矿场 | GiMineWagon | gi |
| 2 | coal-mine | 煤矿 | GiCoalPile | gi |
| 3 | oil-field | 油田 | GiOilPump | gi |
| 4 | gas-field | 气田 | GiGasPump | gi |
| 5 | logging-camp | 伐木场 | GiWoodAxe | gi |
| 6 | farm | 农场 | GiFarmTractor | gi |
| 7 | silicon-mine | 硅石矿场 | GiCrystalShine | gi |

### 加工类建筑（ID 8-15）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 8 | steel-mill | 钢铁厂 | GiFoundry | gi |
| 9 | refinery | 炼油厂 | GiOilRig | gi |
| 10 | chemical-plant | 化工厂 | GiChemicalTank | gi |
| 11 | glass-factory | 玻璃厂 | GiGlass | gi |
| 12 | textile-mill | 纺织厂 | GiSewingMachine | gi |
| 13 | food-factory | 食品厂 | GiCookingPot | gi |
| 14 | cement-factory | 水泥厂 | GiConcreteBag | gi |
| 15 | aluminum-smelter | 铝冶炼厂 | GiAnvilImpact | gi |

### 制造类建筑（ID 16-21）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 16 | electronics-factory | 电子厂 | GiCircuitBoard | gi |
| 17 | semiconductor-fab | 半导体厂 | GiMicrochip | gi |
| 18 | car-factory | 汽车工厂 | GiCarFactory | gi |
| 19 | appliance-factory | 家电厂 | GiWashingMachine | gi |
| 20 | battery-factory | 电池厂 | GiBatteryPack | gi |
| 21 | parts-factory | 零部件厂 | GiGears | gi |

### 服务类建筑（ID 22-24）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 22 | logistics-center | 物流中心 | GiTruck | gi |
| 23 | warehouse | 仓储中心 | GiWarehouse | gi |
| 24 | power-plant | 发电厂 | GiPowerGenerator | gi |

### 农业产业链建筑（ID 25-28）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 25 | vegetable-farm | 蔬菜农场 | GiPlantWatering | gi |
| 26 | livestock-farm | 畜牧场 | GiCow | gi |
| 27 | fishery | 渔场 | GiFishingBoat | gi |
| 28 | meat-processing | 肉类加工厂 | GiMeat | gi |

### 医药产业链建筑（ID 29-31）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 29 | herb-farm | 药材种植园 | GiHerbsBundle | gi |
| 30 | pharma-factory | 制药厂 | GiMedicines | gi |
| 31 | medical-device-factory | 医疗器械厂 | GiMedicalDrip | gi |

### 军工产业链建筑（ID 32-34）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 32 | special-steel-mill | 特钢厂 | GiAnvil | gi |
| 33 | arms-factory | 武器工厂 | GiAk47 | gi |
| 34 | aerospace-factory | 航空航天厂 | GiSpaceSuit | gi |

### 奢侈品产业链建筑（ID 35-36）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 35 | gold-mine | 金矿 | GiGoldMine | gi |
| 36 | luxury-factory | 奢侈品工坊 | GiGemChain | gi |

### 科技产业链建筑（ID 37-39）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 37 | ai-chip-fab | AI芯片厂 | GiArtificialHive | gi |
| 38 | quantum-lab | 量子实验室 | GiAtomicSlashes | gi |
| 39 | biotech-lab | 生物实验室 | GiDna1 | gi |

### 补全产业链建筑（ID 40-48）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 40 | rubber-plantation | 橡胶园 | GiTreehouse | gi |
| 41 | lithium-mine | 锂矿场 | GiBattery50 | gi |
| 42 | paper-mill | 造纸厂 | GiPaperclip | gi |
| 43 | rubber-factory | 橡胶厂 | GiTyre | gi |
| 44 | clothing-factory | 服装厂 | GiSewingMachine | gi |
| 45 | furniture-factory | 家具厂 | GiWoodenChair | gi |
| 46 | building-materials-factory | 建材厂 | GiBrickWall | gi |
| 47 | robot-factory | 机器人厂 | GiRobotGolem | gi |
| 48 | renewable-energy-factory | 新能源设备厂 | GiSolarPower | gi |

### 零售类建筑（ID 49-58）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 49 | convenience-store | 便利店 | GiShop | gi |
| 50 | supermarket | 超市 | GiShoppingCart | gi |
| 51 | hypermarket | 大卖场 | GiShoppingBag | gi |
| 52 | electronics-store | 电子商城 | GiSmartphone | gi |
| 53 | car-dealership | 汽车4S店 | GiCarKey | gi |
| 54 | clothing-store | 服装店 | GiClothes | gi |
| 55 | luxury-boutique | 奢侈品店 | GiDiamondRing | gi |
| 56 | pharmacy | 药店 | GiMedicines | gi |
| 57 | gas-station | 加油站 | GiGasPump | gi |
| 58 | furniture-mall | 家居商城 | GiSofa | gi |

### 日化产业链建筑（ID 59-61）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 59 | palm-plantation | 棕榈种植园 | GiPalmTree | gi |
| 60 | cosmetics-factory | 日化厂 | GiLipstick | gi |
| 61 | detergent-factory | 洗涤用品厂 | GiSpray | gi |

### 交通运输设备建筑（ID 62-66）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 62 | tire-factory | 轮胎厂 | GiTyre | gi |
| 63 | bicycle-factory | 自行车厂 | GiBicycle | gi |
| 64 | shipyard | 造船厂 | GiCargoShip | gi |
| 65 | train-factory | 铁路车辆厂 | GiSteamLocomotive | gi |
| 66 | civil-aircraft-factory | 民用航空厂 | GiAirplane | gi |

### 矿业扩展建筑（ID 67-69）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 67 | multi-metal-mine | 多金属矿场 | GiMiner | gi |
| 68 | strategic-metal-mine | 战略金属矿场 | GiTwoCoins | gi |
| 69 | metal-refinery | 有色金属冶炼厂 | GiFireZone | gi |

### 纺织扩展建筑（ID 70-72）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 70 | sheep-farm | 牧羊场 | GiSheep | gi |
| 71 | tannery | 制革厂 | GiLeatherArmor | gi |
| 72 | leather-goods-factory | 皮具厂 | GiHandBag | gi |

### 建材扩展建筑（ID 73-75）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 73 | clay-quarry | 粘土矿场 | GiStoneTower | gi |
| 74 | brick-factory | 砖瓦厂 | GiBrickPile | gi |
| 75 | ceramics-factory | 陶瓷厂 | GiVase | gi |

### 农产品深加工建筑（ID 76-79）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 76 | plantation | 经济作物种植园 | GiFarmField | gi |
| 77 | sugar-mill | 制糖厂 | GiSugarCane | gi |
| 78 | brewery | 酿酒厂 | GiBeerStein | gi |
| 79 | beverage-factory | 饮品厂 | GiCoffeeCup | gi |

### 能源扩展建筑（ID 80-83）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 80 | uranium-mine | 铀矿场 | GiRadioactive | gi |
| 81 | nuclear-fuel-plant | 核燃料厂 | GiNuclearBomb | gi |
| 82 | nuclear-reactor-factory | 核电设备厂 | GiNuclearPlant | gi |
| 83 | power-equipment-factory | 电力设备厂 | GiElectrical | gi |

### 通信产业链建筑（ID 84-87）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 84 | fiber-optic-factory | 光纤厂 | GiFiberOptic | gi |
| 85 | telecom-equipment-factory | 通信设备厂 | GiAntenna | gi |
| 86 | network-equipment-factory | 网络设备厂 | GiRouter | gi |
| 87 | satellite-factory | 卫星工厂 | GiSatellite | gi |

### 服务业建筑（ID 88-93）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 88 | school | 学校 | GiTeacher | gi |
| 89 | hospital | 医院 | GiHospital | gi |
| 90 | bank | 银行 | GiBank | gi |
| 91 | hotel | 酒店 | GiBed | gi |
| 92 | transport-company | 运输公司 | GiTruck | gi |
| 93 | consulting-firm | 咨询公司 | GiDiscussion | gi |

### 文化传媒建筑（ID 94-97）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 94 | printing-factory | 印刷厂 | GiPrint | gi |
| 95 | film-studio | 影视制作中心 | GiFilmProjector | gi |
| 96 | game-studio | 游戏工作室 | GiGamepad | gi |
| 97 | toy-factory | 玩具厂 | GiTeddyBear | gi |

### 杂项建筑（ID 98-106）
| ID | Key | 名称 | 图标名 | 来源 |
|----|-----|------|--------|------|
| 98 | accessories-factory | 配件厂 | GiButton | gi |
| 99 | specialty-chemical-factory | 精细化工厂 | GiTestTubes | gi |
| 100 | precision-parts-factory | 精密零件厂 | GiGears | gi |
| 101 | cosmetics-store | 化妆品店 | GiLipstick | gi |
| 102 | bookstore | 书店 | GiBookshelf | gi |
| 103 | liquor-store | 酒类专卖店 | GiWineBottle | gi |
| 104 | sports-store | 体育用品店 | GiRunningShoe | gi |
| 105 | toy-store | 玩具店 | GiTeddyBear | gi |
| 106 | music-store | 乐器店 | GiGuitar | gi |

---

## 实施步骤

### 第一步：安装依赖
```bash
npm install react-icons
```

### 第二步：创建图标映射文件
创建 `src/ui/components/Icons/goodsIconMap.ts` 和 `buildingIconMap.ts`

### 第三步：创建图标组件
创建 `GoodsIcon.tsx` 和 `BuildingIcon.tsx` 组件

### 第四步：更新数据文件
在 `goods.ts` 和 `buildings.ts` 中添加 `icon` 字段

### 第五步：更新UI页面
- 修改 Market.tsx 使用 GoodsIcon 组件
- 修改 Production.tsx 使用 BuildingIcon 组件

### 第六步：测试验证
确保所有图标正确显示

---

## 图标风格指南

### 颜色方案
- 原材料（raw）：琥珀色调 `text-amber-500`
- 基础加工（basic）：蓝色调 `text-blue-500`
- 中间产品（intermediate）：紫色调 `text-purple-500`
- 最终产品（final）：绿色调 `text-green-500`

### 尺寸规范
- 列表项图标：16-20px
- 卡片图标：24-32px
- 详情页图标：40-48px

### 备选方案
对于 react-icons 中找不到的特定图标，使用以下备选：
1. 使用类似图标 + 颜色区分
2. 使用 Emoji 作为后备 ⚡🔧⛏️🏭🏪
3. 自定义 SVG（最后手段）

---

## 注意事项

1. **Tree-shaking**：只导入需要的图标，避免打包整个图标库
2. **性能**：使用 React.memo 包装图标组件
3. **无障碍**：为图标添加 aria-label
4. **后备机制**：图标找不到时显示默认图标

你确认这个计划后，我将切换到 Code 模式开始实现！