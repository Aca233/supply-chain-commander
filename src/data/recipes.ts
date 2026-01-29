/**
 * 生产配方定义
 * 精简版本：包含约60种配方（核心+农业+医药+奢侈品产业链）
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
  { id: 17, key: 'food-processing', name: '食品加工', buildingTypeId: 13, inputs: [{ goodsId: 8, amount: 100 }], outputs: [{ goodsId: 44, amount: 80 }], ticksRequired: 1, laborRequired: 40, energyRequired: 100, description: '将粮食加工成食品' },
  { id: 18, key: 'beverage-production', name: '饮料生产', buildingTypeId: 13, inputs: [{ goodsId: 8, amount: 30 }], outputs: [{ goodsId: 45, amount: 100 }], ticksRequired: 1, laborRequired: 30, energyRequired: 80, description: '生产各类饮料' },
  { id: 19, key: 'cement-production', name: '水泥生产', buildingTypeId: 14, inputs: [{ goodsId: 9, amount: 50 }, { goodsId: 3, amount: 30 }], outputs: [{ goodsId: 21, amount: 100 }], ticksRequired: 2, laborRequired: 50, energyRequired: 400, description: '生产水泥' },
  { id: 20, key: 'aluminum-smelting', name: '铝冶炼', buildingTypeId: 15, inputs: [{ goodsId: 2, amount: 100 }], outputs: [{ goodsId: 16, amount: 40 }], ticksRequired: 2, laborRequired: 45, energyRequired: 600, description: '将铝土矿冶炼成铝材' },
];

// ==================== 制造类配方（ID 21-31）====================
const MANUFACTURING_RECIPES: RecipeDefinition[] = [
  { id: 21, key: 'electronics-production', name: '电子元件生产', buildingTypeId: 16, inputs: [{ goodsId: 15, amount: 20 }, { goodsId: 18, amount: 15 }], outputs: [{ goodsId: 26, amount: 25 }], ticksRequired: 2, laborRequired: 60, energyRequired: 250, description: '生产电子元件' },
  { id: 22, key: 'smartphone-assembly', name: '智能手机组装', buildingTypeId: 16, inputs: [{ goodsId: 26, amount: 15 }, { goodsId: 27, amount: 5 }, { goodsId: 28, amount: 3 }, { goodsId: 17, amount: 5 }], outputs: [{ goodsId: 56, amount: 12 }], ticksRequired: 2, laborRequired: 80, energyRequired: 150, unlockLevel: 2, description: '组装平价智能手机' },
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

// ==================== 奢侈品产业链配方（ID 54-57）====================
// 注意：ID 49-53 跳过（原军工产业链已删除）
const LUXURY_RECIPES: RecipeDefinition[] = [
  { id: 54, key: 'gold-mining', name: '金矿开采', buildingTypeId: 35, inputs: [], outputs: [{ goodsId: 88, amount: 5 }], ticksRequired: 2, laborRequired: 60, energyRequired: 300, description: '开采含金矿石' },
  { id: 55, key: 'gold-refining', name: '黄金精炼', buildingTypeId: 35, inputs: [{ goodsId: 88, amount: 10 }], outputs: [{ goodsId: 90, amount: 8 }], ticksRequired: 3, laborRequired: 40, energyRequired: 400, description: '精炼黄金' },
  { id: 56, key: 'jewelry-making', name: '珠宝制作', buildingTypeId: 36, inputs: [{ goodsId: 90, amount: 5 }, { goodsId: 91, amount: 2 }], outputs: [{ goodsId: 54, amount: 3 }], ticksRequired: 5, laborRequired: 80, energyRequired: 100, description: '手工制作珠宝首饰' },
  { id: 57, key: 'luxury-watch-production', name: '奢侈腕表生产', buildingTypeId: 36, inputs: [{ goodsId: 90, amount: 2 }, { goodsId: 26, amount: 5 }, { goodsId: 17, amount: 3 }], outputs: [{ goodsId: 94, amount: 2 }], ticksRequired: 8, laborRequired: 100, energyRequired: 80, description: '手工制作高端奢侈手表' },
];

// ==================== 补全产业链配方（ID 106-107为新建筑配方）====================
const SUPPLEMENTARY_RECIPES: RecipeDefinition[] = [
  { id: 106, key: 'rubber-harvesting', name: '天然橡胶采集', buildingTypeId: 32, inputs: [], outputs: [{ goodsId: 11, amount: 80 }], ticksRequired: 1, laborRequired: 60, energyRequired: 50, description: '采集天然橡胶原料' },
  { id: 107, key: 'lithium-mining', name: '锂矿开采', buildingTypeId: 33, inputs: [], outputs: [{ goodsId: 13, amount: 40 }], ticksRequired: 2, laborRequired: 55, energyRequired: 280, description: '开采锂矿石' },
];

// ==================== 补全产业链配方（保留与核心产业链相关的配方）====================
const EXTENDED_RECIPES: RecipeDefinition[] = [
  { id: 66, key: 'paper-production', name: '纸张生产', buildingTypeId: 34, inputs: [{ goodsId: 6, amount: 80 }], outputs: [{ goodsId: 22, amount: 100 }], ticksRequired: 2, laborRequired: 40, energyRequired: 200, description: '将木材加工成纸张' },
  { id: 67, key: 'packaging-production', name: '包装材料生产', buildingTypeId: 34, inputs: [{ goodsId: 22, amount: 50 }, { goodsId: 18, amount: 20 }], outputs: [{ goodsId: 37, amount: 80 }], ticksRequired: 1, laborRequired: 30, energyRequired: 100, unlockLevel: 2, description: '生产各类包装材料' },
  { id: 68, key: 'rubber-products', name: '橡胶制品生产', buildingTypeId: 10, inputs: [{ goodsId: 11, amount: 60 }, { goodsId: 20, amount: 15 }], outputs: [{ goodsId: 19, amount: 50 }], ticksRequired: 2, laborRequired: 45, energyRequired: 180, description: '将天然橡胶加工成橡胶制品' },
  { id: 69, key: 'clothing-production', name: '服装生产', buildingTypeId: 12, inputs: [{ goodsId: 23, amount: 50 }], outputs: [{ goodsId: 43, amount: 40 }], ticksRequired: 2, laborRequired: 80, energyRequired: 80, description: '生产日常服装' },
  { id: 70, key: 'furniture-production', name: '家具生产', buildingTypeId: 21, inputs: [{ goodsId: 6, amount: 60 }, { goodsId: 14, amount: 20 }], outputs: [{ goodsId: 46, amount: 10 }], ticksRequired: 3, laborRequired: 100, energyRequired: 150, description: '生产各类家居家具' },
  { id: 71, key: 'building-materials-production', name: '建筑材料生产', buildingTypeId: 14, inputs: [{ goodsId: 21, amount: 60 }, { goodsId: 14, amount: 40 }], outputs: [{ goodsId: 36, amount: 80 }], ticksRequired: 2, laborRequired: 60, energyRequired: 250, description: '生产建筑用材料包' },
  { id: 72, key: 'building-products-production', name: '建材成品生产', buildingTypeId: 14, inputs: [{ goodsId: 36, amount: 50 }, { goodsId: 17, amount: 30 }], outputs: [{ goodsId: 47, amount: 40 }], ticksRequired: 3, laborRequired: 80, energyRequired: 200, unlockLevel: 2, description: '生产门窗等建材成品' },
  { id: 73, key: 'industrial-robot-production', name: '工业机器人生产', buildingTypeId: 21, inputs: [{ goodsId: 31, amount: 30 }, { goodsId: 26, amount: 40 }, { goodsId: 27, amount: 10 }], outputs: [{ goodsId: 51, amount: 2 }], ticksRequired: 6, laborRequired: 150, energyRequired: 400, description: '生产工业自动化机器人' },
  { id: 75, key: 'solar-panel-production', name: '光伏板生产', buildingTypeId: 21, inputs: [{ goodsId: 9, amount: 50 }, { goodsId: 17, amount: 30 }, { goodsId: 16, amount: 20 }], outputs: [{ goodsId: 34, amount: 20 }], ticksRequired: 3, laborRequired: 80, energyRequired: 300, description: '生产太阳能光伏板' },
  { id: 76, key: 'wind-blade-production', name: '风机叶片生产', buildingTypeId: 21, inputs: [{ goodsId: 16, amount: 50 }, { goodsId: 18, amount: 30 }], outputs: [{ goodsId: 35, amount: 8 }], ticksRequired: 4, laborRequired: 100, energyRequired: 350, unlockLevel: 2, description: '生产风力发电机叶片' },
  { id: 77, key: 'solar-system-assembly', name: '光伏系统组装', buildingTypeId: 20, inputs: [{ goodsId: 34, amount: 30 }, { goodsId: 26, amount: 20 }, { goodsId: 28, amount: 5 }], outputs: [{ goodsId: 49, amount: 2 }], ticksRequired: 5, laborRequired: 120, energyRequired: 250, unlockLevel: 2, description: '组装完整的光伏发电系统' },
  { id: 78, key: 'copper-smelting', name: '铜冶炼', buildingTypeId: 8, inputs: [{ goodsId: 1, amount: 80 }], outputs: [{ goodsId: 15, amount: 60 }], ticksRequired: 2, laborRequired: 60, energyRequired: 400, unlockLevel: 2, description: '将铜矿石冶炼成铜材' },
  { id: 79, key: 'mechanical-parts-production', name: '机械部件生产', buildingTypeId: 21, inputs: [{ goodsId: 14, amount: 40 }, { goodsId: 16, amount: 20 }], outputs: [{ goodsId: 31, amount: 35 }], ticksRequired: 2, laborRequired: 70, energyRequired: 220, description: '生产通用机械部件' },
  { id: 80, key: 'aircraft-parts-production', name: '航空部件生产', buildingTypeId: 21, inputs: [{ goodsId: 16, amount: 50 }, { goodsId: 14, amount: 30 }, { goodsId: 10, amount: 5 }], outputs: [{ goodsId: 33, amount: 10 }], ticksRequired: 5, laborRequired: 120, energyRequired: 350, unlockLevel: 3, description: '生产航空航天用高精度部件' },
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
  { id: 92, key: 'surgical-equipment-production', name: '手术设备生产', buildingTypeId: 31, inputs: [{ goodsId: 14, amount: 30 }, { goodsId: 26, amount: 40 }, { goodsId: 27, amount: 10 }], outputs: [{ goodsId: 79, amount: 1 }], ticksRequired: 10, laborRequired: 200, energyRequired: 500, unlockLevel: 3, description: '生产高端手术设备' },
  { id: 97, key: 'diamond-mining', name: '钻石矿开采', buildingTypeId: 35, inputs: [], outputs: [{ goodsId: 89, amount: 2 }], ticksRequired: 3, laborRequired: 70, energyRequired: 350, description: '开采原钻矿石' },
  { id: 98, key: 'diamond-cutting', name: '钻石切割', buildingTypeId: 36, inputs: [{ goodsId: 89, amount: 5 }], outputs: [{ goodsId: 91, amount: 3 }], ticksRequired: 4, laborRequired: 50, energyRequired: 100, description: '切割和打磨钻石' },
  { id: 99, key: 'silk-production', name: '丝绸生产', buildingTypeId: 12, inputs: [{ goodsId: 7, amount: 80 }], outputs: [{ goodsId: 92, amount: 30 }], ticksRequired: 4, laborRequired: 80, energyRequired: 120, description: '生产高档丝绸面料' },
  { id: 100, key: 'designer-clothing-production', name: '设计师服装生产', buildingTypeId: 36, inputs: [{ goodsId: 92, amount: 20 }, { goodsId: 23, amount: 30 }], outputs: [{ goodsId: 93, amount: 10 }], ticksRequired: 6, laborRequired: 120, energyRequired: 80, description: '手工制作名牌服装' },
  { id: 101, key: 'luxury-car-production', name: '豪华汽车生产', buildingTypeId: 18, inputs: [{ goodsId: 32, amount: 25 }, { goodsId: 26, amount: 30 }, { goodsId: 19, amount: 15 }, { goodsId: 17, amount: 20 }, { goodsId: 90, amount: 1 }], outputs: [{ goodsId: 95, amount: 1 }], ticksRequired: 10, laborRequired: 300, energyRequired: 500, description: '组装豪华轿车' },
  { id: 102, key: 'bauxite-mining', name: '铝土矿开采', buildingTypeId: 7, inputs: [], outputs: [{ goodsId: 2, amount: 120 }], ticksRequired: 1, laborRequired: 50, energyRequired: 200, description: '开采铝土矿石' },
  { id: 103, key: 'packaged-food-production', name: '包装食品生产', buildingTypeId: 13, inputs: [{ goodsId: 44, amount: 40 }, { goodsId: 37, amount: 10 }], outputs: [{ goodsId: 65, amount: 50 }], ticksRequired: 1, laborRequired: 35, energyRequired: 80, description: '生产包装即食食品' },
];

// 合并所有配方（精简版本：约60种配方，修复了配方分配和引用问题）
export const RECIPES: RecipeDefinition[] = [
  ...EXTRACTION_RECIPES,
  ...PROCESSING_RECIPES,
  ...MANUFACTURING_RECIPES,
  ...POWER_RECIPES,
  ...AGRICULTURE_RECIPES,
  ...PHARMA_RECIPES,
  ...LUXURY_RECIPES,
  ...SUPPLEMENTARY_RECIPES,
  ...EXTENDED_RECIPES,
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
export const RECIPE_COUNT = RECIPES.length; // 约60