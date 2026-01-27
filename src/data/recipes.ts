/**
 * 生产配方定义
 * 包含232种配方的完整配置（产业链全覆盖版本）
 */

export interface RecipeInput {
  goodsId: number;
  amount: number;
}

export interface RecipeOutput {
  goodsId: number;
  amount: number;
}

export interface RecipeDefinition {
  id: number;
  key: string;
  name: string;
  buildingTypeId: number;
  
  inputs: RecipeInput[];
  outputs: RecipeOutput[];
  
  ticksRequired: number;    // 生产周期
  laborRequired: number;    // 人力需求
  energyRequired: number;   // 能源需求（kWh）
  
  unlockLevel?: number;     // 需要建筑等级
  description: string;
}

// ==================== 采掘类配方（ID 0-9）====================
const EXTRACTION_RECIPES: RecipeDefinition[] = [
  { id: 0, key: 'iron-mining', name: '铁矿开采', buildingTypeId: 0, inputs: [], outputs: [{ goodsId: 0, amount: 100 }], ticksRequired: 1, laborRequired: 50, energyRequired: 200, description: '开采铁矿石' },
  { id: 1, key: 'copper-mining', name: '铜矿开采', buildingTypeId: 1, inputs: [], outputs: [{ goodsId: 1, amount: 80 }], ticksRequired: 1, laborRequired: 50, energyRequired: 220, description: '开采铜矿石' },
  { id: 2, key: 'coal-mining', name: '煤炭开采', buildingTypeId: 2, inputs: [], outputs: [{ goodsId: 3, amount: 150 }], ticksRequired: 1, laborRequired: 40, energyRequired: 150, description: '开采煤炭' },
  { id: 3, key: 'oil-extraction', name: '原油开采', buildingTypeId: 3, inputs: [], outputs: [{ goodsId: 4, amount: 80 }], ticksRequired: 1, laborRequired: 30, energyRequired: 300, description: '开采原油' },
  { id: 4, key: 'gas-extraction', name: '天然气开采', buildingTypeId: 4, inputs: [], outputs: [{ goodsId: 5, amount: 100 }], ticksRequired: 1, laborRequired: 25, energyRequired: 250, description: '开采天然气' },
  { id: 5, key: 'logging', name: '木材采伐', buildingTypeId: 5, inputs: [], outputs: [{ goodsId: 6, amount: 120 }], ticksRequired: 1, laborRequired: 60, energyRequired: 100, description: '采伐木材' },
  { id: 6, key: 'grain-farming', name: '粮食种植', buildingTypeId: 6, inputs: [], outputs: [{ goodsId: 8, amount: 200 }], ticksRequired: 24, laborRequired: 100, energyRequired: 50, description: '种植粮食作物' },
  { id: 7, key: 'cotton-farming', name: '棉花种植', buildingTypeId: 6, inputs: [], outputs: [{ goodsId: 7, amount: 80 }], ticksRequired: 24, laborRequired: 80, energyRequired: 40, description: '种植棉花' },
  { id: 8, key: 'silicon-mining', name: '硅石开采', buildingTypeId: 7, inputs: [], outputs: [{ goodsId: 9, amount: 90 }], ticksRequired: 1, laborRequired: 45, energyRequired: 180, description: '开采硅石' },
  { id: 9, key: 'rare-earth-mining', name: '稀土开采', buildingTypeId: 7, inputs: [], outputs: [{ goodsId: 10, amount: 20 }], ticksRequired: 2, laborRequired: 60, energyRequired: 250, description: '开采稀土矿物' },
];

// ==================== 加工类配方（ID 10-20）====================
const PROCESSING_RECIPES: RecipeDefinition[] = [
  { id: 10, key: 'steel-production', name: '钢铁冶炼', buildingTypeId: 8, inputs: [{ goodsId: 0, amount: 100 }, { goodsId: 3, amount: 50 }], outputs: [{ goodsId: 14, amount: 80 }], ticksRequired: 2, laborRequired: 80, energyRequired: 500, description: '高炉炼钢' },
  { id: 11, key: 'steel-electric-arc', name: '电弧炉炼钢', buildingTypeId: 8, inputs: [{ goodsId: 0, amount: 80 }], outputs: [{ goodsId: 14, amount: 75 }], ticksRequired: 2, laborRequired: 50, energyRequired: 800, unlockLevel: 2, description: '使用电弧炉炼钢' },
  { id: 12, key: 'oil-refining', name: '石油精炼', buildingTypeId: 9, inputs: [{ goodsId: 4, amount: 100 }], outputs: [{ goodsId: 25, amount: 60 }, { goodsId: 12, amount: 30 }], ticksRequired: 2, laborRequired: 40, energyRequired: 400, description: '精炼成燃油和化工原料' },
  { id: 13, key: 'plastic-production', name: '塑料生产', buildingTypeId: 10, inputs: [{ goodsId: 12, amount: 50 }], outputs: [{ goodsId: 18, amount: 40 }], ticksRequired: 1, laborRequired: 30, energyRequired: 200, description: '生产塑料制品' },
  { id: 14, key: 'chemicals-production', name: '化学品生产', buildingTypeId: 10, inputs: [{ goodsId: 12, amount: 60 }, { goodsId: 5, amount: 20 }], outputs: [{ goodsId: 20, amount: 50 }], ticksRequired: 2, laborRequired: 40, energyRequired: 300, description: '生产工业用化学品' },
  { id: 15, key: 'glass-production', name: '玻璃生产', buildingTypeId: 11, inputs: [{ goodsId: 9, amount: 80 }], outputs: [{ goodsId: 17, amount: 60 }], ticksRequired: 1, laborRequired: 35, energyRequired: 350, description: '生产玻璃制品' },
  { id: 16, key: 'textiles-production', name: '纺织品生产', buildingTypeId: 12, inputs: [{ goodsId: 7, amount: 100 }], outputs: [{ goodsId: 23, amount: 80 }], ticksRequired: 2, laborRequired: 60, energyRequired: 150, description: '将棉花加工成纺织品' },
  { id: 17, key: 'food-processing', name: '食品加工', buildingTypeId: 13, inputs: [{ goodsId: 8, amount: 100 }], outputs: [{ goodsId: 24, amount: 80 }], ticksRequired: 1, laborRequired: 40, energyRequired: 100, description: '将粮食加工成食品' },
  { id: 18, key: 'beverage-production', name: '饮料生产', buildingTypeId: 13, inputs: [{ goodsId: 8, amount: 30 }], outputs: [{ goodsId: 45, amount: 100 }], ticksRequired: 1, laborRequired: 30, energyRequired: 80, description: '生产各类饮料' },
  { id: 19, key: 'cement-production', name: '水泥生产', buildingTypeId: 14, inputs: [{ goodsId: 9, amount: 50 }, { goodsId: 3, amount: 30 }], outputs: [{ goodsId: 21, amount: 100 }], ticksRequired: 2, laborRequired: 50, energyRequired: 400, description: '生产水泥' },
  { id: 20, key: 'aluminum-smelting', name: '铝冶炼', buildingTypeId: 15, inputs: [{ goodsId: 2, amount: 100 }], outputs: [{ goodsId: 16, amount: 40 }], ticksRequired: 2, laborRequired: 45, energyRequired: 600, description: '将铝土矿冶炼成铝材' },
];

// ==================== 制造类配方（ID 21-31）====================
const MANUFACTURING_RECIPES: RecipeDefinition[] = [
  { id: 21, key: 'electronics-production', name: '电子元件生产', buildingTypeId: 16, inputs: [{ goodsId: 15, amount: 20 }, { goodsId: 18, amount: 15 }], outputs: [{ goodsId: 26, amount: 25 }], ticksRequired: 2, laborRequired: 60, energyRequired: 250, description: '生产电子元件' },
  { id: 22, key: 'smartphone-assembly', name: '智能手机组装', buildingTypeId: 16, inputs: [{ goodsId: 26, amount: 15 }, { goodsId: 27, amount: 5 }, { goodsId: 28, amount: 3 }, { goodsId: 17, amount: 5 }], outputs: [{ goodsId: 38, amount: 10 }], ticksRequired: 2, laborRequired: 80, energyRequired: 150, unlockLevel: 2, description: '组装智能手机' },
  { id: 23, key: 'computer-assembly', name: '电脑组装', buildingTypeId: 16, inputs: [{ goodsId: 26, amount: 20 }, { goodsId: 27, amount: 8 }, { goodsId: 30, amount: 2 }, { goodsId: 18, amount: 10 }], outputs: [{ goodsId: 39, amount: 5 }], ticksRequired: 3, laborRequired: 100, energyRequired: 200, unlockLevel: 2, description: '组装个人电脑' },
  { id: 24, key: 'chip-production', name: '芯片生产', buildingTypeId: 17, inputs: [{ goodsId: 9, amount: 30 }, { goodsId: 10, amount: 5 }, { goodsId: 20, amount: 10 }], outputs: [{ goodsId: 27, amount: 20 }], ticksRequired: 4, laborRequired: 120, energyRequired: 500, description: '生产半导体芯片' },
  { id: 25, key: 'car-assembly', name: '燃油汽车组装', buildingTypeId: 18, inputs: [{ goodsId: 32, amount: 20 }, { goodsId: 26, amount: 10 }, { goodsId: 19, amount: 8 }, { goodsId: 17, amount: 10 }], outputs: [{ goodsId: 41, amount: 1 }], ticksRequired: 5, laborRequired: 200, energyRequired: 400, description: '组装燃油汽车' },
  { id: 26, key: 'electric-car-assembly', name: '电动汽车组装', buildingTypeId: 18, inputs: [{ goodsId: 32, amount: 15 }, { goodsId: 26, amount: 15 }, { goodsId: 28, amount: 10 }, { goodsId: 29, amount: 4 }, { goodsId: 17, amount: 10 }], outputs: [{ goodsId: 42, amount: 1 }], ticksRequired: 6, laborRequired: 180, energyRequired: 350, unlockLevel: 2, description: '组装电动汽车' },
  { id: 27, key: 'appliance-production', name: '家电生产', buildingTypeId: 19, inputs: [{ goodsId: 14, amount: 30 }, { goodsId: 26, amount: 20 }, { goodsId: 18, amount: 25 }], outputs: [{ goodsId: 40, amount: 5 }], ticksRequired: 4, laborRequired: 120, energyRequired: 280, description: '生产家用电器' },
  { id: 28, key: 'battery-production', name: '电池生产', buildingTypeId: 20, inputs: [{ goodsId: 13, amount: 30 }, { goodsId: 15, amount: 15 }, { goodsId: 20, amount: 20 }], outputs: [{ goodsId: 28, amount: 20 }], ticksRequired: 3, laborRequired: 50, energyRequired: 350, description: '生产锂电池' },
  { id: 29, key: 'car-parts-production', name: '汽车零部件生产', buildingTypeId: 21, inputs: [{ goodsId: 14, amount: 50 }, { goodsId: 18, amount: 20 }], outputs: [{ goodsId: 32, amount: 30 }], ticksRequired: 3, laborRequired: 100, energyRequired: 300, description: '生产汽车零部件' },
  { id: 30, key: 'motor-production', name: '电机生产', buildingTypeId: 21, inputs: [{ goodsId: 15, amount: 30 }, { goodsId: 14, amount: 20 }, { goodsId: 10, amount: 3 }], outputs: [{ goodsId: 29, amount: 15 }], ticksRequired: 2, laborRequired: 60, energyRequired: 200, description: '生产电机' },
  { id: 31, key: 'screen-production', name: '屏幕生产', buildingTypeId: 21, inputs: [{ goodsId: 17, amount: 30 }, { goodsId: 26, amount: 15 }, { goodsId: 10, amount: 2 }], outputs: [{ goodsId: 30, amount: 20 }], ticksRequired: 2, laborRequired: 70, energyRequired: 250, description: '生产显示屏' },
];

// ==================== 发电配方（ID 32-34）====================
const POWER_RECIPES: RecipeDefinition[] = [
  { id: 32, key: 'coal-power', name: '燃煤发电', buildingTypeId: 24, inputs: [{ goodsId: 3, amount: 100 }], outputs: [{ goodsId: 57, amount: 500 }], ticksRequired: 1, laborRequired: 30, energyRequired: 0, description: '燃烧煤炭发电' },
  { id: 33, key: 'gas-power', name: '燃气发电', buildingTypeId: 24, inputs: [{ goodsId: 5, amount: 60 }], outputs: [{ goodsId: 57, amount: 400 }], ticksRequired: 1, laborRequired: 20, energyRequired: 0, unlockLevel: 2, description: '燃烧天然气发电' },
  { id: 34, key: 'solar-power', name: '光伏发电', buildingTypeId: 24, inputs: [], outputs: [{ goodsId: 57, amount: 200 }], ticksRequired: 1, laborRequired: 10, energyRequired: 0, unlockLevel: 3, description: '利用太阳能发电' },
];

// ==================== 农业产业链配方（ID 35-42）====================
const AGRICULTURE_RECIPES: RecipeDefinition[] = [
  { id: 35, key: 'vegetable-farming', name: '蔬菜种植', buildingTypeId: 25, inputs: [], outputs: [{ goodsId: 58, amount: 150 }], ticksRequired: 12, laborRequired: 80, energyRequired: 40, description: '种植各类蔬菜' },
  { id: 36, key: 'fruit-farming', name: '水果种植', buildingTypeId: 25, inputs: [], outputs: [{ goodsId: 59, amount: 100 }], ticksRequired: 24, laborRequired: 60, energyRequired: 30, description: '种植各类水果' },
  { id: 37, key: 'livestock-breeding', name: '牲畜养殖', buildingTypeId: 26, inputs: [{ goodsId: 8, amount: 200 }], outputs: [{ goodsId: 60, amount: 10 }], ticksRequired: 48, laborRequired: 100, energyRequired: 80, description: '养殖牛羊猪等牲畜' },
  { id: 38, key: 'poultry-breeding', name: '家禽养殖', buildingTypeId: 26, inputs: [{ goodsId: 8, amount: 50 }], outputs: [{ goodsId: 61, amount: 100 }], ticksRequired: 12, laborRequired: 40, energyRequired: 30, description: '养殖鸡鸭等家禽' },
  { id: 39, key: 'fish-farming', name: '水产养殖', buildingTypeId: 27, inputs: [], outputs: [{ goodsId: 62, amount: 80 }], ticksRequired: 24, laborRequired: 50, energyRequired: 60, description: '养殖鱼虾等水产' },
  { id: 40, key: 'meat-processing', name: '肉类加工', buildingTypeId: 28, inputs: [{ goodsId: 60, amount: 5 }, { goodsId: 61, amount: 30 }], outputs: [{ goodsId: 63, amount: 100 }], ticksRequired: 2, laborRequired: 60, energyRequired: 150, description: '加工肉类产品' },
  { id: 41, key: 'dairy-production', name: '乳制品生产', buildingTypeId: 28, inputs: [{ goodsId: 60, amount: 2 }], outputs: [{ goodsId: 64, amount: 150 }], ticksRequired: 1, laborRequired: 30, energyRequired: 100, description: '生产牛奶、奶酪等乳制品' },
  { id: 42, key: 'frozen-food-production', name: '冷冻食品生产', buildingTypeId: 13, inputs: [{ goodsId: 63, amount: 30 }, { goodsId: 58, amount: 50 }], outputs: [{ goodsId: 65, amount: 60 }], ticksRequired: 2, laborRequired: 50, energyRequired: 200, unlockLevel: 2, description: '生产速冻食品' },
];

// ==================== 医药产业链配方（ID 43-48）====================
const PHARMA_RECIPES: RecipeDefinition[] = [
  { id: 43, key: 'herb-cultivation', name: '药材种植', buildingTypeId: 29, inputs: [], outputs: [{ goodsId: 70, amount: 60 }], ticksRequired: 48, laborRequired: 40, energyRequired: 30, description: '种植中草药材' },
  { id: 44, key: 'generic-drug-production', name: '仿制药生产', buildingTypeId: 30, inputs: [{ goodsId: 71, amount: 20 }], outputs: [{ goodsId: 74, amount: 100 }], ticksRequired: 3, laborRequired: 80, energyRequired: 200, description: '生产普通仿制药品' },
  { id: 45, key: 'patent-drug-production', name: '专利药生产', buildingTypeId: 30, inputs: [{ goodsId: 71, amount: 40 }, { goodsId: 20, amount: 20 }], outputs: [{ goodsId: 75, amount: 20 }], ticksRequired: 5, laborRequired: 120, energyRequired: 300, unlockLevel: 2, description: '生产高端专利药品' },
  { id: 46, key: 'vaccine-production', name: '疫苗生产', buildingTypeId: 30, inputs: [{ goodsId: 71, amount: 50 }, { goodsId: 20, amount: 30 }], outputs: [{ goodsId: 73, amount: 10 }], ticksRequired: 8, laborRequired: 150, energyRequired: 400, unlockLevel: 3, description: '生产疫苗制品' },
  { id: 47, key: 'medical-consumables-production', name: '医用耗材生产', buildingTypeId: 31, inputs: [{ goodsId: 18, amount: 30 }, { goodsId: 23, amount: 20 }], outputs: [{ goodsId: 77, amount: 100 }], ticksRequired: 2, laborRequired: 60, energyRequired: 150, description: '生产口罩、注射器等医用耗材' },
  { id: 48, key: 'diagnostic-equipment-production', name: '诊断设备生产', buildingTypeId: 31, inputs: [{ goodsId: 26, amount: 30 }, { goodsId: 27, amount: 5 }], outputs: [{ goodsId: 78, amount: 2 }], ticksRequired: 6, laborRequired: 100, energyRequired: 300, unlockLevel: 2, description: '生产医疗诊断设备' },
];

// ==================== 军工产业链配方（ID 49-53）====================
const MILITARY_RECIPES: RecipeDefinition[] = [
  { id: 49, key: 'special-steel-production', name: '特种钢生产', buildingTypeId: 32, inputs: [{ goodsId: 14, amount: 100 }, { goodsId: 10, amount: 10 }], outputs: [{ goodsId: 80, amount: 50 }], ticksRequired: 4, laborRequired: 80, energyRequired: 600, description: '生产军工级特种钢材' },
  { id: 50, key: 'armor-plate-production', name: '装甲板生产', buildingTypeId: 32, inputs: [{ goodsId: 80, amount: 50 }], outputs: [{ goodsId: 82, amount: 20 }], ticksRequired: 3, laborRequired: 60, energyRequired: 400, unlockLevel: 2, description: '生产防护装甲板' },
  { id: 51, key: 'small-arms-production', name: '轻武器生产', buildingTypeId: 33, inputs: [{ goodsId: 80, amount: 20 }, { goodsId: 18, amount: 10 }], outputs: [{ goodsId: 84, amount: 30 }], ticksRequired: 4, laborRequired: 100, energyRequired: 250, description: '生产步枪、手枪等轻武器' },
  { id: 52, key: 'military-vehicle-production', name: '军用车辆生产', buildingTypeId: 33, inputs: [{ goodsId: 82, amount: 30 }, { goodsId: 83, amount: 10 }, { goodsId: 29, amount: 5 }], outputs: [{ goodsId: 86, amount: 1 }], ticksRequired: 10, laborRequired: 200, energyRequired: 500, unlockLevel: 2, description: '生产装甲车、坦克等军用车辆' },
  { id: 53, key: 'fighter-jet-production', name: '战斗机生产', buildingTypeId: 34, inputs: [{ goodsId: 33, amount: 50 }, { goodsId: 83, amount: 30 }, { goodsId: 80, amount: 100 }], outputs: [{ goodsId: 87, amount: 1 }], ticksRequired: 30, laborRequired: 500, energyRequired: 1000, unlockLevel: 3, description: '生产军用战斗机' },
];

// ==================== 奢侈品产业链配方（ID 54-57）====================
const LUXURY_RECIPES: RecipeDefinition[] = [
  { id: 54, key: 'gold-mining', name: '金矿开采', buildingTypeId: 35, inputs: [], outputs: [{ goodsId: 88, amount: 5 }], ticksRequired: 2, laborRequired: 60, energyRequired: 300, description: '开采含金矿石' },
  { id: 55, key: 'gold-refining', name: '黄金精炼', buildingTypeId: 35, inputs: [{ goodsId: 88, amount: 10 }], outputs: [{ goodsId: 90, amount: 8 }], ticksRequired: 3, laborRequired: 40, energyRequired: 400, unlockLevel: 2, description: '精炼黄金' },
  { id: 56, key: 'jewelry-making', name: '珠宝制作', buildingTypeId: 36, inputs: [{ goodsId: 90, amount: 5 }, { goodsId: 91, amount: 2 }], outputs: [{ goodsId: 54, amount: 3 }], ticksRequired: 5, laborRequired: 80, energyRequired: 100, description: '手工制作珠宝首饰' },
  { id: 57, key: 'luxury-watch-production', name: '奢侈腕表生产', buildingTypeId: 36, inputs: [{ goodsId: 90, amount: 2 }, { goodsId: 26, amount: 5 }, { goodsId: 17, amount: 3 }], outputs: [{ goodsId: 94, amount: 2 }], ticksRequired: 8, laborRequired: 100, energyRequired: 80, unlockLevel: 2, description: '手工制作高端奢侈手表' },
];

// ==================== 科技产业链配方（ID 58-63）====================
const TECH_RECIPES: RecipeDefinition[] = [
  { id: 58, key: 'ai-chip-production', name: 'AI芯片生产', buildingTypeId: 37, inputs: [{ goodsId: 27, amount: 10 }, { goodsId: 10, amount: 5 }], outputs: [{ goodsId: 96, amount: 5 }], ticksRequired: 6, laborRequired: 150, energyRequired: 600, description: '生产人工智能专用芯片' },
  { id: 59, key: 'quantum-component-production', name: '量子组件生产', buildingTypeId: 38, inputs: [{ goodsId: 96, amount: 10 }, { goodsId: 10, amount: 20 }], outputs: [{ goodsId: 97, amount: 1 }], ticksRequired: 15, laborRequired: 300, energyRequired: 1500, description: '生产量子计算核心组件' },
  { id: 60, key: 'ai-server-assembly', name: 'AI服务器组装', buildingTypeId: 37, inputs: [{ goodsId: 96, amount: 20 }, { goodsId: 26, amount: 50 }], outputs: [{ goodsId: 99, amount: 2 }], ticksRequired: 8, laborRequired: 120, energyRequired: 400, unlockLevel: 2, description: '组装AI计算服务器' },
  { id: 61, key: 'quantum-computer-assembly', name: '量子计算机组装', buildingTypeId: 38, inputs: [{ goodsId: 97, amount: 50 }, { goodsId: 96, amount: 30 }], outputs: [{ goodsId: 100, amount: 1 }], ticksRequired: 30, laborRequired: 500, energyRequired: 2000, unlockLevel: 3, description: '组装量子计算机' },
  { id: 62, key: 'vr-device-production', name: 'VR设备生产', buildingTypeId: 16, inputs: [{ goodsId: 30, amount: 4 }, { goodsId: 27, amount: 3 }, { goodsId: 18, amount: 10 }], outputs: [{ goodsId: 103, amount: 5 }], ticksRequired: 3, laborRequired: 80, energyRequired: 180, unlockLevel: 3, description: '生产虚拟现实设备' },
  { id: 63, key: 'biotech-product-production', name: '生物制品生产', buildingTypeId: 39, inputs: [{ goodsId: 98, amount: 30 }, { goodsId: 20, amount: 20 }], outputs: [{ goodsId: 101, amount: 10 }], ticksRequired: 6, laborRequired: 150, energyRequired: 300, description: '研发和生产生物科技产品' },
];

// ==================== 补全产业链配方（ID 64-105）====================
const EXTENDED_RECIPES: RecipeDefinition[] = [
  { id: 64, key: 'rubber-plantation', name: '天然橡胶种植', buildingTypeId: 40, inputs: [], outputs: [{ goodsId: 11, amount: 80 }], ticksRequired: 24, laborRequired: 60, energyRequired: 30, description: '种植和采集天然橡胶' },
  { id: 65, key: 'lithium-mining', name: '锂矿开采', buildingTypeId: 41, inputs: [], outputs: [{ goodsId: 13, amount: 50 }], ticksRequired: 2, laborRequired: 55, energyRequired: 280, description: '开采锂矿石' },
  { id: 66, key: 'paper-production', name: '纸张生产', buildingTypeId: 42, inputs: [{ goodsId: 6, amount: 80 }], outputs: [{ goodsId: 22, amount: 100 }], ticksRequired: 2, laborRequired: 40, energyRequired: 200, description: '将木材加工成纸张' },
  { id: 67, key: 'packaging-production', name: '包装材料生产', buildingTypeId: 42, inputs: [{ goodsId: 22, amount: 50 }, { goodsId: 18, amount: 20 }], outputs: [{ goodsId: 37, amount: 80 }], ticksRequired: 1, laborRequired: 30, energyRequired: 100, unlockLevel: 2, description: '生产各类包装材料' },
  { id: 68, key: 'rubber-products', name: '橡胶制品生产', buildingTypeId: 43, inputs: [{ goodsId: 11, amount: 60 }, { goodsId: 20, amount: 15 }], outputs: [{ goodsId: 19, amount: 50 }], ticksRequired: 2, laborRequired: 45, energyRequired: 180, description: '将天然橡胶加工成橡胶制品' },
  { id: 69, key: 'clothing-production', name: '服装生产', buildingTypeId: 44, inputs: [{ goodsId: 23, amount: 50 }], outputs: [{ goodsId: 43, amount: 40 }], ticksRequired: 2, laborRequired: 80, energyRequired: 80, description: '生产日常服装' },
  { id: 70, key: 'furniture-production', name: '家具生产', buildingTypeId: 45, inputs: [{ goodsId: 6, amount: 60 }, { goodsId: 14, amount: 20 }], outputs: [{ goodsId: 46, amount: 10 }], ticksRequired: 3, laborRequired: 100, energyRequired: 150, description: '生产各类家居家具' },
  { id: 71, key: 'building-materials-production', name: '建筑材料生产', buildingTypeId: 46, inputs: [{ goodsId: 21, amount: 60 }, { goodsId: 14, amount: 40 }], outputs: [{ goodsId: 36, amount: 80 }], ticksRequired: 2, laborRequired: 60, energyRequired: 250, description: '生产建筑用材料包' },
  { id: 72, key: 'building-products-production', name: '建材成品生产', buildingTypeId: 46, inputs: [{ goodsId: 36, amount: 50 }, { goodsId: 17, amount: 30 }], outputs: [{ goodsId: 47, amount: 40 }], ticksRequired: 3, laborRequired: 80, energyRequired: 200, unlockLevel: 2, description: '生产门窗等建材成品' },
  { id: 73, key: 'industrial-robot-production', name: '工业机器人生产', buildingTypeId: 47, inputs: [{ goodsId: 31, amount: 30 }, { goodsId: 26, amount: 40 }, { goodsId: 27, amount: 10 }], outputs: [{ goodsId: 51, amount: 2 }], ticksRequired: 6, laborRequired: 150, energyRequired: 400, description: '生产工业自动化机器人' },
  { id: 74, key: 'smart-robot-production', name: '智能机器人生产', buildingTypeId: 47, inputs: [{ goodsId: 51, amount: 1 }, { goodsId: 96, amount: 5 }, { goodsId: 30, amount: 2 }], outputs: [{ goodsId: 102, amount: 1 }], ticksRequired: 8, laborRequired: 200, energyRequired: 500, unlockLevel: 3, description: '生产服务型智能机器人' },
  { id: 75, key: 'solar-panel-production', name: '光伏板生产', buildingTypeId: 48, inputs: [{ goodsId: 9, amount: 50 }, { goodsId: 17, amount: 30 }, { goodsId: 16, amount: 20 }], outputs: [{ goodsId: 34, amount: 20 }], ticksRequired: 3, laborRequired: 80, energyRequired: 300, description: '生产太阳能光伏板' },
  { id: 76, key: 'wind-blade-production', name: '风机叶片生产', buildingTypeId: 48, inputs: [{ goodsId: 16, amount: 50 }, { goodsId: 18, amount: 30 }], outputs: [{ goodsId: 35, amount: 8 }], ticksRequired: 4, laborRequired: 100, energyRequired: 350, unlockLevel: 2, description: '生产风力发电机叶片' },
  { id: 77, key: 'solar-system-assembly', name: '光伏系统组装', buildingTypeId: 48, inputs: [{ goodsId: 34, amount: 30 }, { goodsId: 26, amount: 20 }, { goodsId: 28, amount: 5 }], outputs: [{ goodsId: 49, amount: 2 }], ticksRequired: 5, laborRequired: 120, energyRequired: 250, unlockLevel: 2, description: '组装完整的光伏发电系统' },
  { id: 78, key: 'copper-smelting', name: '铜冶炼', buildingTypeId: 8, inputs: [{ goodsId: 1, amount: 80 }], outputs: [{ goodsId: 15, amount: 60 }], ticksRequired: 2, laborRequired: 60, energyRequired: 400, unlockLevel: 2, description: '将铜矿石冶炼成铜材' },
  { id: 79, key: 'mechanical-parts-production', name: '机械部件生产', buildingTypeId: 21, inputs: [{ goodsId: 14, amount: 40 }, { goodsId: 16, amount: 20 }], outputs: [{ goodsId: 31, amount: 35 }], ticksRequired: 2, laborRequired: 70, energyRequired: 220, description: '生产通用机械部件' },
  { id: 80, key: 'aircraft-parts-production', name: '航空部件生产', buildingTypeId: 21, inputs: [{ goodsId: 16, amount: 50 }, { goodsId: 80, amount: 20 }, { goodsId: 10, amount: 5 }], outputs: [{ goodsId: 33, amount: 10 }], ticksRequired: 5, laborRequired: 120, energyRequired: 350, unlockLevel: 3, description: '生产航空航天用高精度部件' },
  { id: 81, key: 'energy-storage-production', name: '储能系统生产', buildingTypeId: 20, inputs: [{ goodsId: 28, amount: 30 }, { goodsId: 26, amount: 20 }], outputs: [{ goodsId: 50, amount: 3 }], ticksRequired: 4, laborRequired: 80, energyRequired: 300, unlockLevel: 2, description: '生产大型储能电池系统' },
  { id: 82, key: 'drone-production', name: '无人机生产', buildingTypeId: 16, inputs: [{ goodsId: 26, amount: 20 }, { goodsId: 27, amount: 3 }, { goodsId: 28, amount: 2 }, { goodsId: 18, amount: 10 }], outputs: [{ goodsId: 52, amount: 5 }], ticksRequired: 3, laborRequired: 90, energyRequired: 180, unlockLevel: 2, description: '生产消费和商用无人机' },
  { id: 83, key: 'premium-phone-production', name: '高端手机生产', buildingTypeId: 16, inputs: [{ goodsId: 26, amount: 20 }, { goodsId: 27, amount: 8 }, { goodsId: 28, amount: 4 }, { goodsId: 17, amount: 8 }, { goodsId: 10, amount: 2 }], outputs: [{ goodsId: 55, amount: 8 }], ticksRequired: 3, laborRequired: 100, energyRequired: 200, unlockLevel: 3, description: '生产旗舰级智能手机' },
  { id: 84, key: 'budget-phone-production', name: '平价手机生产', buildingTypeId: 16, inputs: [{ goodsId: 26, amount: 10 }, { goodsId: 27, amount: 3 }, { goodsId: 28, amount: 2 }, { goodsId: 18, amount: 10 }], outputs: [{ goodsId: 56, amount: 15 }], ticksRequired: 2, laborRequired: 60, energyRequired: 120, description: '生产经济型智能手机' },
  { id: 85, key: 'canned-food-production', name: '罐头生产', buildingTypeId: 13, inputs: [{ goodsId: 63, amount: 30 }, { goodsId: 58, amount: 20 }, { goodsId: 14, amount: 5 }], outputs: [{ goodsId: 66, amount: 50 }], ticksRequired: 2, laborRequired: 45, energyRequired: 120, unlockLevel: 2, description: '生产罐头制品' },
  { id: 86, key: 'snacks-production', name: '零食生产', buildingTypeId: 13, inputs: [{ goodsId: 8, amount: 40 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 67, amount: 80 }], ticksRequired: 1, laborRequired: 30, energyRequired: 80, description: '生产休闲零食' },
  { id: 87, key: 'organic-food-production', name: '有机食品生产', buildingTypeId: 13, inputs: [{ goodsId: 58, amount: 60 }, { goodsId: 59, amount: 40 }], outputs: [{ goodsId: 68, amount: 20 }], ticksRequired: 2, laborRequired: 60, energyRequired: 100, unlockLevel: 3, description: '生产高端有机产品' },
  { id: 88, key: 'pet-food-production', name: '宠物食品生产', buildingTypeId: 13, inputs: [{ goodsId: 63, amount: 20 }, { goodsId: 8, amount: 30 }], outputs: [{ goodsId: 69, amount: 60 }], ticksRequired: 1, laborRequired: 35, energyRequired: 90, unlockLevel: 2, description: '生产宠物饲料' },
  { id: 89, key: 'medical-chemicals-production', name: '医药化工品生产', buildingTypeId: 10, inputs: [{ goodsId: 12, amount: 40 }, { goodsId: 70, amount: 20 }], outputs: [{ goodsId: 71, amount: 30 }], ticksRequired: 3, laborRequired: 70, energyRequired: 250, unlockLevel: 2, description: '生产医药中间体' },
  { id: 90, key: 'antibiotic-production', name: '抗生素生产', buildingTypeId: 30, inputs: [{ goodsId: 71, amount: 30 }], outputs: [{ goodsId: 72, amount: 15 }], ticksRequired: 4, laborRequired: 100, energyRequired: 280, unlockLevel: 2, description: '生产抗生素原料药' },
  { id: 91, key: 'otc-drugs-production', name: '非处方药生产', buildingTypeId: 30, inputs: [{ goodsId: 71, amount: 15 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 76, amount: 80 }], ticksRequired: 2, laborRequired: 50, energyRequired: 150, description: '生产OTC药品' },
  { id: 92, key: 'surgical-equipment-production', name: '手术设备生产', buildingTypeId: 31, inputs: [{ goodsId: 80, amount: 30 }, { goodsId: 26, amount: 40 }, { goodsId: 27, amount: 10 }], outputs: [{ goodsId: 79, amount: 1 }], ticksRequired: 10, laborRequired: 200, energyRequired: 500, unlockLevel: 3, description: '生产高端手术设备' },
  { id: 93, key: 'explosives-production', name: '炸药生产', buildingTypeId: 10, inputs: [{ goodsId: 12, amount: 50 }, { goodsId: 20, amount: 30 }], outputs: [{ goodsId: 81, amount: 20 }], ticksRequired: 3, laborRequired: 80, energyRequired: 300, unlockLevel: 3, description: '生产工业/军用炸药' },
  { id: 94, key: 'military-electronics-production', name: '军用电子生产', buildingTypeId: 16, inputs: [{ goodsId: 26, amount: 40 }, { goodsId: 27, amount: 15 }, { goodsId: 10, amount: 5 }], outputs: [{ goodsId: 83, amount: 10 }], ticksRequired: 4, laborRequired: 120, energyRequired: 300, unlockLevel: 3, description: '生产军用级电子系统' },
  { id: 95, key: 'biomaterial-cultivation', name: '生物材料培育', buildingTypeId: 39, inputs: [{ goodsId: 20, amount: 30 }], outputs: [{ goodsId: 98, amount: 15 }], ticksRequired: 6, laborRequired: 100, energyRequired: 200, description: '培育生物科技材料' },
  { id: 96, key: 'heavy-weapons-production', name: '重武器生产', buildingTypeId: 33, inputs: [{ goodsId: 80, amount: 50 }, { goodsId: 81, amount: 20 }, { goodsId: 83, amount: 10 }], outputs: [{ goodsId: 85, amount: 1 }], ticksRequired: 8, laborRequired: 180, energyRequired: 400, unlockLevel: 3, description: '生产火炮导弹等重武器' },
  { id: 97, key: 'diamond-mining', name: '钻石矿开采', buildingTypeId: 35, inputs: [], outputs: [{ goodsId: 89, amount: 2 }], ticksRequired: 3, laborRequired: 70, energyRequired: 350, unlockLevel: 2, description: '开采原钻矿石' },
  { id: 98, key: 'diamond-cutting', name: '钻石切割', buildingTypeId: 36, inputs: [{ goodsId: 89, amount: 5 }], outputs: [{ goodsId: 91, amount: 3 }], ticksRequired: 4, laborRequired: 50, energyRequired: 100, description: '切割和打磨钻石' },
  { id: 99, key: 'silk-production', name: '丝绸生产', buildingTypeId: 12, inputs: [{ goodsId: 7, amount: 80 }], outputs: [{ goodsId: 92, amount: 30 }], ticksRequired: 4, laborRequired: 80, energyRequired: 120, unlockLevel: 2, description: '生产高档丝绸面料' },
  { id: 100, key: 'designer-clothing-production', name: '设计师服装生产', buildingTypeId: 36, inputs: [{ goodsId: 92, amount: 20 }, { goodsId: 23, amount: 30 }], outputs: [{ goodsId: 93, amount: 10 }], ticksRequired: 6, laborRequired: 120, energyRequired: 80, unlockLevel: 2, description: '手工制作名牌服装' },
  { id: 101, key: 'luxury-car-production', name: '豪华汽车生产', buildingTypeId: 18, inputs: [{ goodsId: 32, amount: 25 }, { goodsId: 26, amount: 30 }, { goodsId: 19, amount: 15 }, { goodsId: 17, amount: 20 }, { goodsId: 90, amount: 1 }], outputs: [{ goodsId: 95, amount: 1 }], ticksRequired: 10, laborRequired: 300, energyRequired: 500, unlockLevel: 3, description: '组装豪华轿车' },
  { id: 102, key: 'bauxite-mining', name: '铝土矿开采', buildingTypeId: 15, inputs: [], outputs: [{ goodsId: 2, amount: 120 }], ticksRequired: 1, laborRequired: 50, energyRequired: 200, description: '开采铝土矿石' },
  { id: 103, key: 'food-production', name: '食品生产', buildingTypeId: 13, inputs: [{ goodsId: 24, amount: 40 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 44, amount: 100 }], ticksRequired: 1, laborRequired: 35, energyRequired: 80, description: '生产日常消费食品' },
  { id: 104, key: 'medical-equipment-production', name: '医疗设备生产', buildingTypeId: 31, inputs: [{ goodsId: 26, amount: 30 }, { goodsId: 27, amount: 8 }, { goodsId: 14, amount: 20 }], outputs: [{ goodsId: 48, amount: 3 }], ticksRequired: 5, laborRequired: 120, energyRequired: 350, unlockLevel: 2, description: '生产综合医疗设备' },
  { id: 105, key: 'luxury-goods-production', name: '奢侈品生产', buildingTypeId: 36, inputs: [{ goodsId: 90, amount: 3 }, { goodsId: 92, amount: 10 }, { goodsId: 23, amount: 20 }], outputs: [{ goodsId: 53, amount: 5 }], ticksRequired: 4, laborRequired: 100, energyRequired: 80, description: '生产高端奢侈消费品' },
];

// ==================== 日化产业链配方（ID 106-118）====================
const DAILY_CHEMICAL_RECIPES: RecipeDefinition[] = [
  { id: 106, key: 'palm-oil-extraction', name: '棕榈油提取', buildingTypeId: 59, inputs: [], outputs: [{ goodsId: 104, amount: 80 }], ticksRequired: 12, laborRequired: 50, energyRequired: 40, description: '种植棕榈并提取棕榈油' },
  { id: 107, key: 'fragrance-extraction', name: '香料提取', buildingTypeId: 59, inputs: [], outputs: [{ goodsId: 105, amount: 40 }], ticksRequired: 24, laborRequired: 60, energyRequired: 50, description: '种植香料植物并提取精华' },
  { id: 108, key: 'surfactant-production', name: '表面活性剂生产', buildingTypeId: 60, inputs: [{ goodsId: 104, amount: 40 }, { goodsId: 20, amount: 30 }], outputs: [{ goodsId: 106, amount: 50 }], ticksRequired: 2, laborRequired: 50, energyRequired: 180, description: '生产洗涤产品核心原料' },
  { id: 109, key: 'fragrance-production', name: '香精生产', buildingTypeId: 60, inputs: [{ goodsId: 105, amount: 30 }, { goodsId: 20, amount: 20 }], outputs: [{ goodsId: 107, amount: 25 }], ticksRequired: 3, laborRequired: 60, energyRequired: 150, description: '生产化妆品和日化香精' },
  { id: 110, key: 'pigment-production', name: '颜料生产', buildingTypeId: 60, inputs: [{ goodsId: 20, amount: 40 }], outputs: [{ goodsId: 108, amount: 30 }], ticksRequired: 2, laborRequired: 45, energyRequired: 160, description: '生产化妆品和涂料用颜料' },
  { id: 111, key: 'cosmetic-base-production', name: '化妆品基质生产', buildingTypeId: 60, inputs: [{ goodsId: 104, amount: 30 }, { goodsId: 107, amount: 10 }, { goodsId: 20, amount: 20 }], outputs: [{ goodsId: 109, amount: 40 }], ticksRequired: 3, laborRequired: 70, energyRequired: 200, unlockLevel: 2, description: '生产化妆品基础配方' },
  { id: 112, key: 'cleaning-agent-production', name: '清洁剂原液生产', buildingTypeId: 60, inputs: [{ goodsId: 106, amount: 40 }, { goodsId: 20, amount: 20 }], outputs: [{ goodsId: 110, amount: 50 }], ticksRequired: 2, laborRequired: 40, energyRequired: 120, description: '生产洗涤用品原液' },
  { id: 113, key: 'cosmetics-production', name: '化妆品生产', buildingTypeId: 60, inputs: [{ goodsId: 109, amount: 30 }, { goodsId: 108, amount: 15 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 111, amount: 40 }], ticksRequired: 3, laborRequired: 80, energyRequired: 150, unlockLevel: 2, description: '生产彩妆和美妆产品' },
  { id: 114, key: 'skincare-production', name: '护肤品生产', buildingTypeId: 60, inputs: [{ goodsId: 109, amount: 40 }, { goodsId: 107, amount: 15 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 112, amount: 35 }], ticksRequired: 3, laborRequired: 75, energyRequired: 140, unlockLevel: 2, description: '生产护肤和保养产品' },
  { id: 115, key: 'detergent-production', name: '洗涤用品生产', buildingTypeId: 61, inputs: [{ goodsId: 110, amount: 40 }, { goodsId: 37, amount: 15 }], outputs: [{ goodsId: 113, amount: 80 }], ticksRequired: 2, laborRequired: 40, energyRequired: 100, description: '生产洗衣液、洗洁精等' },
  { id: 116, key: 'shampoo-production', name: '洗发护发用品生产', buildingTypeId: 61, inputs: [{ goodsId: 110, amount: 30 }, { goodsId: 107, amount: 10 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 114, amount: 60 }], ticksRequired: 2, laborRequired: 45, energyRequired: 110, description: '生产洗发水、护发素等' },
  { id: 117, key: 'toothpaste-production', name: '口腔护理用品生产', buildingTypeId: 61, inputs: [{ goodsId: 20, amount: 20 }, { goodsId: 107, amount: 5 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 115, amount: 100 }], ticksRequired: 1, laborRequired: 35, energyRequired: 80, description: '生产牙膏、漱口水等' },
  { id: 118, key: 'personal-care-combo', name: '个人护理套装生产', buildingTypeId: 61, inputs: [{ goodsId: 113, amount: 20 }, { goodsId: 114, amount: 15 }, { goodsId: 115, amount: 15 }], outputs: [{ goodsId: 112, amount: 30 }], ticksRequired: 2, laborRequired: 50, energyRequired: 90, unlockLevel: 2, description: '组装个人护理套装产品' },
];

// ==================== 交通运输设备配方（ID 119-130）====================
const TRANSPORT_RECIPES: RecipeDefinition[] = [
  { id: 119, key: 'tire-production', name: '轮胎生产', buildingTypeId: 62, inputs: [{ goodsId: 19, amount: 40 }, { goodsId: 14, amount: 10 }], outputs: [{ goodsId: 116, amount: 20 }], ticksRequired: 2, laborRequired: 60, energyRequired: 200, description: '生产汽车和自行车轮胎' },
  { id: 120, key: 'car-seat-production', name: '汽车座椅生产', buildingTypeId: 62, inputs: [{ goodsId: 23, amount: 30 }, { goodsId: 14, amount: 20 }, { goodsId: 18, amount: 15 }], outputs: [{ goodsId: 117, amount: 15 }], ticksRequired: 3, laborRequired: 70, energyRequired: 180, unlockLevel: 2, description: '生产汽车座椅总成' },
  { id: 121, key: 'bicycle-production', name: '自行车生产', buildingTypeId: 63, inputs: [{ goodsId: 14, amount: 15 }, { goodsId: 116, amount: 2 }, { goodsId: 19, amount: 5 }], outputs: [{ goodsId: 121, amount: 10 }], ticksRequired: 2, laborRequired: 40, energyRequired: 80, description: '生产各类自行车' },
  { id: 122, key: 'motorcycle-production', name: '摩托车生产', buildingTypeId: 63, inputs: [{ goodsId: 14, amount: 30 }, { goodsId: 29, amount: 2 }, { goodsId: 116, amount: 2 }, { goodsId: 26, amount: 10 }], outputs: [{ goodsId: 122, amount: 5 }], ticksRequired: 4, laborRequired: 80, energyRequired: 180, unlockLevel: 2, description: '生产燃油和电动摩托车' },
  { id: 123, key: 'electric-scooter-production', name: '电动滑板车生产', buildingTypeId: 63, inputs: [{ goodsId: 16, amount: 10 }, { goodsId: 28, amount: 3 }, { goodsId: 29, amount: 1 }, { goodsId: 18, amount: 8 }], outputs: [{ goodsId: 123, amount: 8 }], ticksRequired: 2, laborRequired: 50, energyRequired: 100, description: '生产电动滑板车和平衡车' },
  { id: 124, key: 'ship-parts-production', name: '船舶部件生产', buildingTypeId: 64, inputs: [{ goodsId: 14, amount: 100 }, { goodsId: 16, amount: 50 }, { goodsId: 29, amount: 10 }], outputs: [{ goodsId: 118, amount: 5 }], ticksRequired: 6, laborRequired: 150, energyRequired: 400, description: '生产船舶结构和动力部件' },
  { id: 125, key: 'ship-production', name: '船舶建造', buildingTypeId: 64, inputs: [{ goodsId: 118, amount: 20 }, { goodsId: 26, amount: 50 }, { goodsId: 17, amount: 30 }], outputs: [{ goodsId: 124, amount: 1 }], ticksRequired: 30, laborRequired: 500, energyRequired: 1000, unlockLevel: 2, description: '建造货船和客船' },
  { id: 126, key: 'train-parts-production', name: '铁路车辆部件生产', buildingTypeId: 65, inputs: [{ goodsId: 14, amount: 80 }, { goodsId: 29, amount: 15 }, { goodsId: 26, amount: 30 }], outputs: [{ goodsId: 119, amount: 8 }], ticksRequired: 5, laborRequired: 120, energyRequired: 350, description: '生产铁路车辆核心部件' },
  { id: 127, key: 'train-car-production', name: '铁路车辆生产', buildingTypeId: 65, inputs: [{ goodsId: 119, amount: 15 }, { goodsId: 17, amount: 40 }, { goodsId: 27, amount: 10 }], outputs: [{ goodsId: 125, amount: 1 }], ticksRequired: 15, laborRequired: 300, energyRequired: 600, unlockLevel: 2, description: '生产火车车厢和机车' },
  { id: 128, key: 'aircraft-engine-production', name: '航空发动机生产', buildingTypeId: 66, inputs: [{ goodsId: 80, amount: 50 }, { goodsId: 10, amount: 20 }, { goodsId: 26, amount: 40 }], outputs: [{ goodsId: 120, amount: 2 }], ticksRequired: 10, laborRequired: 250, energyRequired: 500, description: '生产飞机发动机' },
  { id: 129, key: 'civil-aircraft-production', name: '民用飞机生产', buildingTypeId: 66, inputs: [{ goodsId: 120, amount: 4 }, { goodsId: 33, amount: 80 }, { goodsId: 27, amount: 30 }, { goodsId: 17, amount: 50 }], outputs: [{ goodsId: 126, amount: 1 }], ticksRequired: 40, laborRequired: 600, energyRequired: 1200, unlockLevel: 3, description: '生产民用客机和货机' },
  { id: 130, key: 'bus-production', name: '公交车生产', buildingTypeId: 66, inputs: [{ goodsId: 32, amount: 30 }, { goodsId: 26, amount: 25 }, { goodsId: 17, amount: 30 }, { goodsId: 117, amount: 20 }], outputs: [{ goodsId: 127, amount: 2 }], ticksRequired: 8, laborRequired: 180, energyRequired: 350, description: '生产公共交通车辆' },
];

// ==================== 矿业扩展配方（ID 131-142）====================
const MINING_EXTENDED_RECIPES: RecipeDefinition[] = [
  { id: 131, key: 'zinc-mining', name: '锌矿开采', buildingTypeId: 67, inputs: [], outputs: [{ goodsId: 128, amount: 90 }], ticksRequired: 1, laborRequired: 50, energyRequired: 200, description: '开采锌矿石' },
  { id: 132, key: 'nickel-mining', name: '镍矿开采', buildingTypeId: 67, inputs: [], outputs: [{ goodsId: 129, amount: 70 }], ticksRequired: 1, laborRequired: 55, energyRequired: 220, description: '开采镍矿石' },
  { id: 133, key: 'tin-mining', name: '锡矿开采', buildingTypeId: 67, inputs: [], outputs: [{ goodsId: 130, amount: 60 }], ticksRequired: 1, laborRequired: 50, energyRequired: 210, description: '开采锡矿石' },
  { id: 134, key: 'cobalt-mining', name: '钴矿开采', buildingTypeId: 68, inputs: [], outputs: [{ goodsId: 131, amount: 40 }], ticksRequired: 2, laborRequired: 60, energyRequired: 280, description: '开采钴矿石' },
  { id: 135, key: 'manganese-mining', name: '锰矿开采', buildingTypeId: 68, inputs: [], outputs: [{ goodsId: 132, amount: 80 }], ticksRequired: 1, laborRequired: 50, energyRequired: 200, description: '开采锰矿石' },
  { id: 136, key: 'tungsten-mining', name: '钨矿开采', buildingTypeId: 68, inputs: [], outputs: [{ goodsId: 133, amount: 30 }], ticksRequired: 2, laborRequired: 65, energyRequired: 300, description: '开采钨矿石' },
  { id: 137, key: 'zinc-smelting', name: '锌冶炼', buildingTypeId: 69, inputs: [{ goodsId: 128, amount: 80 }], outputs: [{ goodsId: 134, amount: 50 }], ticksRequired: 2, laborRequired: 60, energyRequired: 400, description: '冶炼精炼锌' },
  { id: 138, key: 'nickel-smelting', name: '镍冶炼', buildingTypeId: 69, inputs: [{ goodsId: 129, amount: 70 }], outputs: [{ goodsId: 135, amount: 45 }], ticksRequired: 2, laborRequired: 65, energyRequired: 450, description: '冶炼精炼镍' },
  { id: 139, key: 'tin-smelting', name: '锡冶炼', buildingTypeId: 69, inputs: [{ goodsId: 130, amount: 60 }], outputs: [{ goodsId: 136, amount: 40 }], ticksRequired: 2, laborRequired: 55, energyRequired: 380, description: '冶炼精炼锡' },
  { id: 140, key: 'cobalt-smelting', name: '钴冶炼', buildingTypeId: 69, inputs: [{ goodsId: 131, amount: 40 }], outputs: [{ goodsId: 137, amount: 25 }], ticksRequired: 3, laborRequired: 70, energyRequired: 500, unlockLevel: 2, description: '冶炼精炼钴' },
  { id: 141, key: 'manganese-smelting', name: '锰冶炼', buildingTypeId: 69, inputs: [{ goodsId: 132, amount: 80 }], outputs: [{ goodsId: 138, amount: 55 }], ticksRequired: 2, laborRequired: 55, energyRequired: 350, description: '冶炼精炼锰' },
  { id: 142, key: 'tungsten-smelting', name: '钨冶炼', buildingTypeId: 69, inputs: [{ goodsId: 133, amount: 30 }], outputs: [{ goodsId: 139, amount: 20 }], ticksRequired: 3, laborRequired: 75, energyRequired: 550, unlockLevel: 2, description: '冶炼精炼钨' },
];

// ==================== 纺织扩展配方（ID 143-152）====================
const TEXTILE_EXTENDED_RECIPES: RecipeDefinition[] = [
  { id: 143, key: 'wool-harvesting', name: '羊毛采集', buildingTypeId: 70, inputs: [{ goodsId: 8, amount: 100 }], outputs: [{ goodsId: 140, amount: 60 }], ticksRequired: 24, laborRequired: 50, energyRequired: 40, description: '养殖绵羊并采集羊毛' },
  { id: 144, key: 'flax-harvesting', name: '亚麻收获', buildingTypeId: 70, inputs: [], outputs: [{ goodsId: 141, amount: 50 }], ticksRequired: 20, laborRequired: 45, energyRequired: 30, description: '种植亚麻纤维' },
  { id: 145, key: 'down-harvesting', name: '羽绒采集', buildingTypeId: 70, inputs: [{ goodsId: 61, amount: 50 }], outputs: [{ goodsId: 143, amount: 20 }], ticksRequired: 12, laborRequired: 40, energyRequired: 25, unlockLevel: 2, description: '从家禽采集羽绒' },
  { id: 146, key: 'raw-leather-processing', name: '生皮处理', buildingTypeId: 71, inputs: [{ goodsId: 60, amount: 3 }], outputs: [{ goodsId: 142, amount: 10 }], ticksRequired: 4, laborRequired: 50, energyRequired: 100, description: '从牲畜获取生皮' },
  { id: 147, key: 'wool-yarn-production', name: '毛纱生产', buildingTypeId: 71, inputs: [{ goodsId: 140, amount: 50 }], outputs: [{ goodsId: 144, amount: 40 }], ticksRequired: 3, laborRequired: 60, energyRequired: 120, description: '将羊毛纺成毛纱' },
  { id: 148, key: 'leather-production', name: '皮革加工', buildingTypeId: 71, inputs: [{ goodsId: 142, amount: 10 }, { goodsId: 20, amount: 5 }], outputs: [{ goodsId: 146, amount: 8 }], ticksRequired: 4, laborRequired: 70, energyRequired: 150, description: '将生皮加工成皮革' },
  // 【新增】麻布生产配方 - 修复商品145无生产者问题
  { id: 232, key: 'linen-production', name: '麻布生产', buildingTypeId: 71, inputs: [{ goodsId: 141, amount: 40 }], outputs: [{ goodsId: 145, amount: 30 }], ticksRequired: 2, laborRequired: 55, energyRequired: 100, description: '将亚麻纤维织成麻布' },
  { id: 149, key: 'wool-clothing-production', name: '毛织品生产', buildingTypeId: 72, inputs: [{ goodsId: 144, amount: 30 }], outputs: [{ goodsId: 147, amount: 20 }], ticksRequired: 3, laborRequired: 80, energyRequired: 100, description: '生产羊毛服装和制品' },
  { id: 150, key: 'leather-goods-production', name: '皮具生产', buildingTypeId: 72, inputs: [{ goodsId: 146, amount: 10 }, { goodsId: 14, amount: 5 }], outputs: [{ goodsId: 148, amount: 8 }], ticksRequired: 4, laborRequired: 100, energyRequired: 120, unlockLevel: 2, description: '生产皮包皮带等皮革制品' },
  { id: 151, key: 'shoes-production', name: '鞋类生产', buildingTypeId: 72, inputs: [{ goodsId: 146, amount: 5 }, { goodsId: 19, amount: 8 }, { goodsId: 23, amount: 10 }], outputs: [{ goodsId: 149, amount: 20 }], ticksRequired: 2, laborRequired: 70, energyRequired: 80, description: '生产各类鞋子' },
];

// ==================== 建材扩展配方（ID 152-161）====================
const BUILDING_EXTENDED_RECIPES: RecipeDefinition[] = [
  { id: 152, key: 'clay-mining', name: '粘土开采', buildingTypeId: 73, inputs: [], outputs: [{ goodsId: 150, amount: 150 }], ticksRequired: 1, laborRequired: 40, energyRequired: 100, description: '开采陶瓷和砖瓦原料' },
  { id: 153, key: 'marble-mining', name: '大理石开采', buildingTypeId: 73, inputs: [], outputs: [{ goodsId: 151, amount: 30 }], ticksRequired: 2, laborRequired: 60, energyRequired: 200, unlockLevel: 2, description: '开采装饰石材' },
  { id: 154, key: 'brick-production', name: '砖生产', buildingTypeId: 74, inputs: [{ goodsId: 150, amount: 100 }], outputs: [{ goodsId: 152, amount: 80 }], ticksRequired: 2, laborRequired: 50, energyRequired: 200, description: '生产建筑用砖' },
  { id: 155, key: 'tile-production', name: '瓷砖生产', buildingTypeId: 74, inputs: [{ goodsId: 150, amount: 80 }, { goodsId: 108, amount: 10 }], outputs: [{ goodsId: 153, amount: 60 }], ticksRequired: 3, laborRequired: 60, energyRequired: 250, description: '生产墙地砖' },
  { id: 156, key: 'wood-board-production', name: '木板生产', buildingTypeId: 74, inputs: [{ goodsId: 6, amount: 60 }], outputs: [{ goodsId: 154, amount: 50 }], ticksRequired: 2, laborRequired: 45, energyRequired: 150, description: '生产人造板和实木板' },
  { id: 157, key: 'paint-production', name: '涂料生产', buildingTypeId: 75, inputs: [{ goodsId: 20, amount: 40 }, { goodsId: 108, amount: 20 }], outputs: [{ goodsId: 155, amount: 50 }], ticksRequired: 2, laborRequired: 50, energyRequired: 180, description: '生产墙面和工业涂料' },
  { id: 158, key: 'ceramics-production', name: '陶瓷制品生产', buildingTypeId: 75, inputs: [{ goodsId: 150, amount: 60 }], outputs: [{ goodsId: 156, amount: 40 }], ticksRequired: 3, laborRequired: 70, energyRequired: 300, description: '生产卫浴陶瓷和艺术陶瓷' },
  { id: 159, key: 'sanitary-ware-production', name: '卫浴设备生产', buildingTypeId: 75, inputs: [{ goodsId: 156, amount: 20 }, { goodsId: 14, amount: 10 }, { goodsId: 17, amount: 10 }], outputs: [{ goodsId: 157, amount: 10 }], ticksRequired: 4, laborRequired: 90, energyRequired: 250, unlockLevel: 2, description: '生产马桶、浴缸、洗手盆' },
  { id: 160, key: 'tableware-production', name: '餐具生产', buildingTypeId: 75, inputs: [{ goodsId: 156, amount: 15 }, { goodsId: 17, amount: 10 }], outputs: [{ goodsId: 158, amount: 30 }], ticksRequired: 2, laborRequired: 50, energyRequired: 150, description: '生产陶瓷和玻璃餐具' },
  { id: 161, key: 'decoration-production', name: '装饰材料生产', buildingTypeId: 75, inputs: [{ goodsId: 22, amount: 30 }, { goodsId: 18, amount: 20 }, { goodsId: 108, amount: 10 }], outputs: [{ goodsId: 159, amount: 40 }], ticksRequired: 2, laborRequired: 60, energyRequired: 120, unlockLevel: 2, description: '生产壁纸、装饰板等' },
];

// ==================== 农产品深加工配方（ID 162-177）====================
const AGRI_DEEP_PROCESS_RECIPES: RecipeDefinition[] = [
  { id: 162, key: 'grape-farming', name: '葡萄种植', buildingTypeId: 76, inputs: [], outputs: [{ goodsId: 160, amount: 100 }], ticksRequired: 36, laborRequired: 60, energyRequired: 40, description: '种植酿酒葡萄和鲜食葡萄' },
  { id: 163, key: 'sugarcane-farming', name: '甘蔗种植', buildingTypeId: 76, inputs: [], outputs: [{ goodsId: 161, amount: 200 }], ticksRequired: 24, laborRequired: 50, energyRequired: 30, description: '种植制糖原料' },
  { id: 164, key: 'tea-farming', name: '茶叶种植', buildingTypeId: 76, inputs: [], outputs: [{ goodsId: 162, amount: 40 }], ticksRequired: 48, laborRequired: 70, energyRequired: 40, description: '种植鲜茶叶' },
  { id: 165, key: 'coffee-farming', name: '咖啡种植', buildingTypeId: 76, inputs: [], outputs: [{ goodsId: 163, amount: 35 }], ticksRequired: 48, laborRequired: 65, energyRequired: 35, description: '种植生咖啡豆' },
  { id: 166, key: 'tobacco-farming', name: '烟草种植', buildingTypeId: 76, inputs: [], outputs: [{ goodsId: 164, amount: 60 }], ticksRequired: 36, laborRequired: 55, energyRequired: 30, description: '种植烟草原料' },
  { id: 167, key: 'oilseed-farming', name: '油料作物种植', buildingTypeId: 76, inputs: [], outputs: [{ goodsId: 165, amount: 120 }], ticksRequired: 24, laborRequired: 50, energyRequired: 30, description: '种植大豆花生菜籽等' },
  { id: 168, key: 'sugar-production', name: '糖生产', buildingTypeId: 77, inputs: [{ goodsId: 161, amount: 100 }], outputs: [{ goodsId: 166, amount: 60 }], ticksRequired: 2, laborRequired: 50, energyRequired: 200, description: '生产白糖和红糖' },
  { id: 169, key: 'edible-oil-production', name: '食用油生产', buildingTypeId: 77, inputs: [{ goodsId: 165, amount: 80 }], outputs: [{ goodsId: 167, amount: 50 }], ticksRequired: 2, laborRequired: 45, energyRequired: 180, description: '生产各种食用植物油' },
  { id: 170, key: 'flour-production', name: '面粉生产', buildingTypeId: 77, inputs: [{ goodsId: 8, amount: 100 }], outputs: [{ goodsId: 168, amount: 80 }], ticksRequired: 1, laborRequired: 35, energyRequired: 100, description: '生产小麦面粉' },
  { id: 171, key: 'beer-production', name: '啤酒酿造', buildingTypeId: 78, inputs: [{ goodsId: 8, amount: 60 }], outputs: [{ goodsId: 169, amount: 200 }], ticksRequired: 4, laborRequired: 60, energyRequired: 150, description: '酿造各类啤酒' },
  { id: 172, key: 'wine-production', name: '葡萄酒酿造', buildingTypeId: 78, inputs: [{ goodsId: 160, amount: 80 }], outputs: [{ goodsId: 170, amount: 40 }], ticksRequired: 24, laborRequired: 50, energyRequired: 100, unlockLevel: 2, description: '酿造红白葡萄酒' },
  { id: 173, key: 'spirits-production', name: '烈酒酿造', buildingTypeId: 78, inputs: [{ goodsId: 8, amount: 100 }], outputs: [{ goodsId: 171, amount: 30 }], ticksRequired: 12, laborRequired: 55, energyRequired: 180, unlockLevel: 2, description: '酿造白酒威士忌等' },
  { id: 174, key: 'tea-production', name: '茶饮生产', buildingTypeId: 79, inputs: [{ goodsId: 162, amount: 30 }], outputs: [{ goodsId: 172, amount: 50 }], ticksRequired: 2, laborRequired: 40, energyRequired: 80, description: '生产茶叶和茶饮料' },
  { id: 175, key: 'coffee-production', name: '咖啡生产', buildingTypeId: 79, inputs: [{ goodsId: 163, amount: 30 }], outputs: [{ goodsId: 173, amount: 40 }], ticksRequired: 2, laborRequired: 45, energyRequired: 90, description: '生产咖啡粉和咖啡饮品' },
  { id: 176, key: 'cigarettes-production', name: '烟草制品生产', buildingTypeId: 79, inputs: [{ goodsId: 164, amount: 50 }, { goodsId: 22, amount: 10 }], outputs: [{ goodsId: 174, amount: 100 }], ticksRequired: 2, laborRequired: 50, energyRequired: 80, unlockLevel: 2, description: '生产香烟和雪茄' },
  { id: 177, key: 'candy-production', name: '糖果生产', buildingTypeId: 79, inputs: [{ goodsId: 166, amount: 40 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 175, amount: 80 }], ticksRequired: 2, laborRequired: 45, energyRequired: 100, description: '生产糖果和巧克力' },
];

// ==================== 能源扩展配方（ID 178-187）====================
const ENERGY_EXTENDED_RECIPES: RecipeDefinition[] = [
  { id: 178, key: 'uranium-mining', name: '铀矿开采', buildingTypeId: 80, inputs: [], outputs: [{ goodsId: 176, amount: 10 }], ticksRequired: 2, laborRequired: 80, energyRequired: 400, description: '开采核燃料原料' },
  { id: 179, key: 'biomass-harvesting', name: '生物质采集', buildingTypeId: 80, inputs: [], outputs: [{ goodsId: 177, amount: 150 }], ticksRequired: 1, laborRequired: 40, energyRequired: 60, description: '采集秸秆等生物质燃料原料' },
  { id: 180, key: 'nuclear-fuel-production', name: '核燃料生产', buildingTypeId: 81, inputs: [{ goodsId: 176, amount: 10 }], outputs: [{ goodsId: 178, amount: 2 }], ticksRequired: 8, laborRequired: 150, energyRequired: 600, description: '生产浓缩铀燃料棒' },
  { id: 181, key: 'hydrogen-production', name: '氢气生产', buildingTypeId: 81, inputs: [{ goodsId: 57, amount: 300 }], outputs: [{ goodsId: 179, amount: 100 }], ticksRequired: 2, laborRequired: 50, energyRequired: 400, description: '电解水生产氢气' },
  { id: 182, key: 'biofuel-production', name: '生物燃料生产', buildingTypeId: 81, inputs: [{ goodsId: 177, amount: 100 }, { goodsId: 20, amount: 20 }], outputs: [{ goodsId: 180, amount: 50 }], ticksRequired: 3, laborRequired: 60, energyRequired: 200, unlockLevel: 2, description: '生产乙醇和生物柴油' },
  { id: 183, key: 'nuclear-reactor-production', name: '核反应堆生产', buildingTypeId: 82, inputs: [{ goodsId: 80, amount: 200 }, { goodsId: 26, amount: 100 }, { goodsId: 27, amount: 30 }], outputs: [{ goodsId: 181, amount: 1 }], ticksRequired: 60, laborRequired: 800, energyRequired: 2000, unlockLevel: 3, description: '生产核电站反应堆' },
  { id: 184, key: 'fuel-cell-production', name: '燃料电池生产', buildingTypeId: 83, inputs: [{ goodsId: 26, amount: 30 }, { goodsId: 10, amount: 5 }, { goodsId: 18, amount: 20 }], outputs: [{ goodsId: 182, amount: 5 }], ticksRequired: 4, laborRequired: 100, energyRequired: 300, description: '生产氢燃料电池系统' },
  { id: 185, key: 'wind-turbine-production', name: '风力发电机生产', buildingTypeId: 83, inputs: [{ goodsId: 35, amount: 6 }, { goodsId: 29, amount: 5 }, { goodsId: 26, amount: 20 }], outputs: [{ goodsId: 183, amount: 1 }], ticksRequired: 6, laborRequired: 120, energyRequired: 400, unlockLevel: 2, description: '生产风力发电设备' },
  { id: 186, key: 'transformer-production', name: '变压器生产', buildingTypeId: 83, inputs: [{ goodsId: 15, amount: 40 }, { goodsId: 14, amount: 30 }, { goodsId: 26, amount: 15 }], outputs: [{ goodsId: 184, amount: 5 }], ticksRequired: 3, laborRequired: 70, energyRequired: 200, description: '生产电力变压设备' },
  { id: 187, key: 'power-cable-production', name: '电力电缆生产', buildingTypeId: 83, inputs: [{ goodsId: 15, amount: 50 }, { goodsId: 19, amount: 20 }], outputs: [{ goodsId: 185, amount: 10 }], ticksRequired: 2, laborRequired: 50, energyRequired: 150, description: '生产高压输电电缆' },
];

// ==================== 通信产业链配方（ID 188-197）====================
const TELECOM_RECIPES: RecipeDefinition[] = [
  { id: 188, key: 'optical-fiber-production', name: '光纤生产', buildingTypeId: 84, inputs: [{ goodsId: 9, amount: 50 }, { goodsId: 17, amount: 30 }], outputs: [{ goodsId: 186, amount: 20 }], ticksRequired: 3, laborRequired: 80, energyRequired: 300, description: '生产通信光纤' },
  { id: 189, key: 'antenna-production', name: '天线生产', buildingTypeId: 85, inputs: [{ goodsId: 16, amount: 30 }, { goodsId: 26, amount: 20 }], outputs: [{ goodsId: 187, amount: 15 }], ticksRequired: 2, laborRequired: 60, energyRequired: 150, description: '生产通信天线系统' },
  { id: 190, key: 'sensor-production', name: '传感器生产', buildingTypeId: 85, inputs: [{ goodsId: 26, amount: 20 }, { goodsId: 27, amount: 3 }], outputs: [{ goodsId: 188, amount: 30 }], ticksRequired: 2, laborRequired: 70, energyRequired: 180, description: '生产各类电子传感器' },
  { id: 191, key: 'memory-chip-production', name: '存储芯片生产', buildingTypeId: 85, inputs: [{ goodsId: 9, amount: 20 }, { goodsId: 10, amount: 3 }, { goodsId: 20, amount: 10 }], outputs: [{ goodsId: 189, amount: 25 }], ticksRequired: 4, laborRequired: 100, energyRequired: 400, unlockLevel: 2, description: '生产内存和闪存芯片' },
  { id: 192, key: 'display-panel-production', name: '显示面板生产', buildingTypeId: 85, inputs: [{ goodsId: 17, amount: 40 }, { goodsId: 26, amount: 25 }, { goodsId: 10, amount: 2 }], outputs: [{ goodsId: 190, amount: 15 }], ticksRequired: 3, laborRequired: 90, energyRequired: 350, unlockLevel: 2, description: '生产LCD/OLED面板' },
  { id: 193, key: 'router-production', name: '路由器生产', buildingTypeId: 86, inputs: [{ goodsId: 26, amount: 15 }, { goodsId: 27, amount: 3 }, { goodsId: 18, amount: 8 }], outputs: [{ goodsId: 191, amount: 20 }], ticksRequired: 2, laborRequired: 60, energyRequired: 120, description: '生产家用和企业路由器' },
  { id: 194, key: 'base-station-production', name: '通信基站生产', buildingTypeId: 86, inputs: [{ goodsId: 187, amount: 10 }, { goodsId: 26, amount: 50 }, { goodsId: 27, amount: 10 }], outputs: [{ goodsId: 192, amount: 2 }], ticksRequired: 6, laborRequired: 120, energyRequired: 400, unlockLevel: 2, description: '生产移动通信基站' },
  { id: 195, key: 'satellite-production', name: '卫星生产', buildingTypeId: 87, inputs: [{ goodsId: 33, amount: 30 }, { goodsId: 34, amount: 20 }, { goodsId: 27, amount: 20 }, { goodsId: 187, amount: 10 }], outputs: [{ goodsId: 193, amount: 1 }], ticksRequired: 30, laborRequired: 500, energyRequired: 1500, unlockLevel: 3, description: '生产通信和导航卫星' },
  { id: 196, key: 'tablet-production', name: '平板电脑生产', buildingTypeId: 86, inputs: [{ goodsId: 190, amount: 3 }, { goodsId: 27, amount: 4 }, { goodsId: 28, amount: 2 }, { goodsId: 16, amount: 5 }], outputs: [{ goodsId: 194, amount: 8 }], ticksRequired: 3, laborRequired: 80, energyRequired: 160, description: '生产平板电脑设备' },
  { id: 197, key: 'smartwatch-production', name: '智能手表生产', buildingTypeId: 86, inputs: [{ goodsId: 190, amount: 1 }, { goodsId: 27, amount: 2 }, { goodsId: 28, amount: 1 }, { goodsId: 188, amount: 3 }], outputs: [{ goodsId: 195, amount: 15 }], ticksRequired: 2, laborRequired: 70, energyRequired: 100, unlockLevel: 2, description: '生产智能穿戴手表' },
];

// ==================== 服务业配方（ID 198-211）====================
const SERVICE_RECIPES: RecipeDefinition[] = [
  { id: 198, key: 'education-service', name: '教育服务提供', buildingTypeId: 88, inputs: [{ goodsId: 212, amount: 20 }], outputs: [{ goodsId: 196, amount: 100 }], ticksRequired: 1, laborRequired: 100, energyRequired: 50, description: '提供教育培训服务' },
  { id: 199, key: 'healthcare-service', name: '医疗服务提供', buildingTypeId: 89, inputs: [{ goodsId: 77, amount: 20 }, { goodsId: 74, amount: 10 }], outputs: [{ goodsId: 197, amount: 50 }], ticksRequired: 1, laborRequired: 200, energyRequired: 100, description: '提供医疗诊治服务' },
  { id: 200, key: 'financial-service', name: '金融服务提供', buildingTypeId: 90, inputs: [], outputs: [{ goodsId: 198, amount: 80 }], ticksRequired: 1, laborRequired: 80, energyRequired: 30, description: '提供银行保险金融服务' },
  { id: 201, key: 'entertainment-service', name: '娱乐服务提供', buildingTypeId: 91, inputs: [], outputs: [{ goodsId: 199, amount: 100 }], ticksRequired: 1, laborRequired: 60, energyRequired: 80, description: '提供影院游乐等娱乐服务' },
  { id: 202, key: 'catering-service', name: '餐饮服务提供', buildingTypeId: 91, inputs: [{ goodsId: 44, amount: 30 }, { goodsId: 45, amount: 20 }], outputs: [{ goodsId: 200, amount: 100 }], ticksRequired: 1, laborRequired: 80, energyRequired: 60, description: '提供餐厅餐饮服务' },
  { id: 203, key: 'hotel-service', name: '住宿服务提供', buildingTypeId: 91, inputs: [], outputs: [{ goodsId: 201, amount: 50 }], ticksRequired: 1, laborRequired: 100, energyRequired: 80, description: '提供酒店住宿服务' },
  { id: 204, key: 'transport-service', name: '运输服务提供', buildingTypeId: 92, inputs: [{ goodsId: 25, amount: 50 }], outputs: [{ goodsId: 202, amount: 200 }], ticksRequired: 1, laborRequired: 50, energyRequired: 100, description: '提供客货运输服务' },
  { id: 205, key: 'cleaning-service', name: '清洁服务提供', buildingTypeId: 92, inputs: [{ goodsId: 113, amount: 10 }], outputs: [{ goodsId: 203, amount: 80 }], ticksRequired: 1, laborRequired: 40, energyRequired: 20, description: '提供保洁清洁服务' },
  { id: 206, key: 'security-service', name: '安保服务提供', buildingTypeId: 92, inputs: [], outputs: [{ goodsId: 204, amount: 60 }], ticksRequired: 1, laborRequired: 80, energyRequired: 30, description: '提供安全保卫服务' },
  { id: 207, key: 'advertising-service', name: '广告服务提供', buildingTypeId: 93, inputs: [], outputs: [{ goodsId: 205, amount: 20 }], ticksRequired: 2, laborRequired: 60, energyRequired: 40, description: '提供广告设计投放服务' },
  { id: 208, key: 'legal-service', name: '法律服务提供', buildingTypeId: 93, inputs: [], outputs: [{ goodsId: 206, amount: 30 }], ticksRequired: 1, laborRequired: 80, energyRequired: 20, description: '提供律师法律咨询服务' },
  { id: 209, key: 'consulting-service', name: '咨询服务提供', buildingTypeId: 93, inputs: [], outputs: [{ goodsId: 207, amount: 15 }], ticksRequired: 2, laborRequired: 100, energyRequired: 30, description: '提供企业管理咨询服务' },
  { id: 210, key: 'software-service', name: '软件服务提供', buildingTypeId: 93, inputs: [], outputs: [{ goodsId: 208, amount: 10 }], ticksRequired: 4, laborRequired: 120, energyRequired: 50, unlockLevel: 2, description: '提供软件开发和SaaS服务' },
  { id: 211, key: 'research-service', name: '研发服务提供', buildingTypeId: 93, inputs: [], outputs: [{ goodsId: 209, amount: 5 }], ticksRequired: 6, laborRequired: 150, energyRequired: 80, unlockLevel: 2, description: '提供科研技术服务' },
];

// ==================== 文化传媒配方（ID 212-221）====================
const CULTURAL_RECIPES: RecipeDefinition[] = [
  { id: 212, key: 'printing-ink-production', name: '印刷油墨生产', buildingTypeId: 94, inputs: [{ goodsId: 20, amount: 30 }, { goodsId: 108, amount: 20 }], outputs: [{ goodsId: 210, amount: 40 }], ticksRequired: 2, laborRequired: 40, energyRequired: 120, description: '生产印刷用油墨' },
  { id: 213, key: 'books-production', name: '图书印刷', buildingTypeId: 94, inputs: [{ goodsId: 22, amount: 50 }, { goodsId: 210, amount: 10 }], outputs: [{ goodsId: 212, amount: 100 }], ticksRequired: 2, laborRequired: 50, energyRequired: 150, description: '印刷各类书籍' },
  { id: 214, key: 'magazines-production', name: '杂志报刊印刷', buildingTypeId: 94, inputs: [{ goodsId: 22, amount: 30 }, { goodsId: 210, amount: 8 }], outputs: [{ goodsId: 213, amount: 200 }], ticksRequired: 1, laborRequired: 40, energyRequired: 100, description: '印刷杂志和报纸' },
  { id: 215, key: 'film-equipment-production', name: '影视设备生产', buildingTypeId: 95, inputs: [{ goodsId: 26, amount: 30 }, { goodsId: 30, amount: 5 }, { goodsId: 17, amount: 15 }], outputs: [{ goodsId: 211, amount: 3 }], ticksRequired: 4, laborRequired: 80, energyRequired: 200, description: '生产摄影摄像设备' },
  { id: 216, key: 'music-album-production', name: '音乐专辑制作', buildingTypeId: 95, inputs: [], outputs: [{ goodsId: 214, amount: 50 }], ticksRequired: 6, laborRequired: 100, energyRequired: 80, description: '制作音乐CD和数字专辑' },
  { id: 217, key: 'movie-production', name: '电影制作', buildingTypeId: 95, inputs: [{ goodsId: 211, amount: 5 }], outputs: [{ goodsId: 215, amount: 1 }], ticksRequired: 30, laborRequired: 500, energyRequired: 300, unlockLevel: 2, description: '制作电影作品' },
  { id: 218, key: 'video-game-development', name: '电子游戏开发', buildingTypeId: 96, inputs: [], outputs: [{ goodsId: 216, amount: 5 }], ticksRequired: 12, laborRequired: 200, energyRequired: 100, description: '开发电子游戏产品' },
  { id: 219, key: 'toy-production', name: '玩具生产', buildingTypeId: 97, inputs: [{ goodsId: 18, amount: 30 }, { goodsId: 108, amount: 10 }], outputs: [{ goodsId: 217, amount: 50 }], ticksRequired: 2, laborRequired: 60, energyRequired: 100, description: '生产儿童玩具' },
  { id: 220, key: 'sports-equipment-production', name: '运动器材生产', buildingTypeId: 97, inputs: [{ goodsId: 14, amount: 20 }, { goodsId: 18, amount: 15 }, { goodsId: 19, amount: 10 }], outputs: [{ goodsId: 218, amount: 20 }], ticksRequired: 3, laborRequired: 70, energyRequired: 120, description: '生产体育运动器材' },
  { id: 221, key: 'musical-instrument-production', name: '乐器生产', buildingTypeId: 97, inputs: [{ goodsId: 6, amount: 30 }, { goodsId: 14, amount: 10 }, { goodsId: 26, amount: 5 }], outputs: [{ goodsId: 219, amount: 10 }], ticksRequired: 4, laborRequired: 100, energyRequired: 80, unlockLevel: 2, description: '生产各类乐器' },
];

// ==================== 杂项配方（ID 222-231）====================
const MISC_RECIPES: RecipeDefinition[] = [
  { id: 222, key: 'zipper-production', name: '拉链生产', buildingTypeId: 98, inputs: [{ goodsId: 14, amount: 5 }, { goodsId: 18, amount: 10 }], outputs: [{ goodsId: 220, amount: 200 }], ticksRequired: 1, laborRequired: 30, energyRequired: 50, description: '生产服装拉链' },
  { id: 223, key: 'buttons-production', name: '纽扣生产', buildingTypeId: 98, inputs: [{ goodsId: 18, amount: 8 }], outputs: [{ goodsId: 221, amount: 500 }], ticksRequired: 1, laborRequired: 25, energyRequired: 40, description: '生产服装纽扣' },
  { id: 224, key: 'photoresist-production', name: '光刻胶生产', buildingTypeId: 99, inputs: [{ goodsId: 20, amount: 50 }, { goodsId: 10, amount: 5 }], outputs: [{ goodsId: 222, amount: 10 }], ticksRequired: 4, laborRequired: 100, energyRequired: 300, description: '生产芯片制造用光刻胶' },
  { id: 225, key: 'inert-gas-production', name: '惰性气体生产', buildingTypeId: 99, inputs: [], outputs: [{ goodsId: 223, amount: 100 }], ticksRequired: 2, laborRequired: 40, energyRequired: 200, description: '生产氩气氮气等' },
  { id: 226, key: 'catalyst-production', name: '催化剂生产', buildingTypeId: 99, inputs: [{ goodsId: 20, amount: 40 }, { goodsId: 10, amount: 8 }], outputs: [{ goodsId: 224, amount: 15 }], ticksRequired: 3, laborRequired: 80, energyRequired: 250, unlockLevel: 2, description: '生产化工催化剂' },
  { id: 227, key: 'adhesive-production', name: '胶粘剂生产', buildingTypeId: 99, inputs: [{ goodsId: 20, amount: 30 }, { goodsId: 11, amount: 20 }], outputs: [{ goodsId: 225, amount: 40 }], ticksRequired: 2, laborRequired: 50, energyRequired: 150, description: '生产工业和民用胶水' },
  { id: 228, key: 'bearing-production', name: '轴承生产', buildingTypeId: 100, inputs: [{ goodsId: 14, amount: 30 }, { goodsId: 10, amount: 2 }], outputs: [{ goodsId: 226, amount: 50 }], ticksRequired: 2, laborRequired: 70, energyRequired: 180, description: '生产机械轴承' },
  { id: 229, key: 'spring-production', name: '弹簧生产', buildingTypeId: 100, inputs: [{ goodsId: 14, amount: 20 }], outputs: [{ goodsId: 227, amount: 100 }], ticksRequired: 1, laborRequired: 40, energyRequired: 100, description: '生产各类弹簧' },
  { id: 230, key: 'seal-production', name: '密封件生产', buildingTypeId: 100, inputs: [{ goodsId: 19, amount: 25 }], outputs: [{ goodsId: 228, amount: 80 }], ticksRequired: 1, laborRequired: 45, energyRequired: 80, description: '生产橡胶密封圈等' },
  { id: 231, key: 'filter-production', name: '过滤器生产', buildingTypeId: 100, inputs: [{ goodsId: 14, amount: 15 }, { goodsId: 18, amount: 10 }, { goodsId: 22, amount: 5 }], outputs: [{ goodsId: 229, amount: 40 }], ticksRequired: 2, laborRequired: 55, energyRequired: 120, description: '生产空气和液体过滤器' },
];

// 合并所有配方（产业链全覆盖版本：233种配方）
export const RECIPES: RecipeDefinition[] = [
  ...EXTRACTION_RECIPES,
  ...PROCESSING_RECIPES,
  ...MANUFACTURING_RECIPES,
  ...POWER_RECIPES,
  ...AGRICULTURE_RECIPES,
  ...PHARMA_RECIPES,
  ...MILITARY_RECIPES,
  ...LUXURY_RECIPES,
  ...TECH_RECIPES,
  ...EXTENDED_RECIPES,
  ...DAILY_CHEMICAL_RECIPES,
  ...TRANSPORT_RECIPES,
  ...MINING_EXTENDED_RECIPES,
  ...TEXTILE_EXTENDED_RECIPES,
  ...BUILDING_EXTENDED_RECIPES,
  ...AGRI_DEEP_PROCESS_RECIPES,
  ...ENERGY_EXTENDED_RECIPES,
  ...TELECOM_RECIPES,
  ...SERVICE_RECIPES,
  ...CULTURAL_RECIPES,
  ...MISC_RECIPES,
];

// 配方ID到定义的映射
export const RECIPES_BY_ID: Map<number, RecipeDefinition> = new Map(
  RECIPES.map(r => [r.id, r])
);

// 配方Key到定义的映射
export const RECIPES_BY_KEY: Map<string, RecipeDefinition> = new Map(
  RECIPES.map(r => [r.key, r])
);

// 按建筑类型分组的配方
export const RECIPES_BY_BUILDING: Map<number, RecipeDefinition[]> = new Map();
RECIPES.forEach(r => {
  const existing = RECIPES_BY_BUILDING.get(r.buildingTypeId) || [];
  existing.push(r);
  RECIPES_BY_BUILDING.set(r.buildingTypeId, existing);
});

/**
 * 获取配方名称
 */
export function getRecipeName(recipeId: number): string {
  return RECIPES_BY_ID.get(recipeId)?.name ?? `未知配方(${recipeId})`;
}

/**
 * 获取建筑可用的配方列表
 */
export function getAvailableRecipes(buildingTypeId: number, level: number): RecipeDefinition[] {
  const recipes = RECIPES_BY_BUILDING.get(buildingTypeId) || [];
  return recipes.filter(r => (r.unlockLevel ?? 1) <= level);
}

/**
 * 获取配方总数
 */
export const RECIPE_COUNT = RECIPES.length; // 233