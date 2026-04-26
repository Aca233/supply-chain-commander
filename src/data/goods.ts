/**
 * 商品数据定义
 * 重构版本：包含80种商品（ID 0-79，连续无跳跃）
 * 4层产业链：原材料 → 基础材料 → 中间品 → 最终产品
 */

export interface GoodsDefinition {
  id: number;
  key: string;
  name: string;
  category: 'raw' | 'basic' | 'intermediate' | 'final';
  tier: 0 | 1 | 2 | 3;
  basePrice: number;
  priceElasticity: number;
  incomeElasticity: number;
  isConsumerGood: boolean;
  isService?: boolean;
  unit: string;
  description: string;
}

// ==================== 原材料层 Tier 0（ID 0-17，共18种）====================
const RAW_MATERIALS: GoodsDefinition[] = [
  { id: 0, key: 'iron_ore', name: '铁矿石', category: 'raw', tier: 0, basePrice: 50, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '用于炼钢的铁矿石' },
  { id: 1, key: 'copper_ore', name: '铜矿石', category: 'raw', tier: 0, basePrice: 80, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '用于制造电线和电子产品的铜矿石' },
  { id: 2, key: 'bauxite', name: '铝土矿', category: 'raw', tier: 0, basePrice: 45, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '用于生产铝材的铝土矿' },
  { id: 3, key: 'coal', name: '煤炭', category: 'raw', tier: 0, basePrice: 160, priceElasticity: -0.18, incomeElasticity: 0.25, isConsumerGood: false, unit: '吨', description: '用于炼钢和发电的煤炭' },
  { id: 4, key: 'crude_oil', name: '原油', category: 'raw', tier: 0, basePrice: 210, priceElasticity: -0.22, incomeElasticity: 0.35, isConsumerGood: false, unit: '桶', description: '石油化工的基础原料' },
  { id: 5, key: 'natural_gas', name: '天然气', category: 'raw', tier: 0, basePrice: 150, priceElasticity: -0.2, incomeElasticity: 0.3, isConsumerGood: false, unit: '立方米', description: '清洁能源和化工原料' },
  { id: 6, key: 'silicon', name: '硅石', category: 'raw', tier: 0, basePrice: 40, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '用于生产玻璃和半导体' },
  { id: 7, key: 'lithium', name: '锂矿', category: 'raw', tier: 0, basePrice: 150, priceElasticity: -0.4, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '电池生产的关键原料' },
  { id: 8, key: 'rare_earth', name: '稀土', category: 'raw', tier: 0, basePrice: 200, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: false, unit: '公斤', description: '高科技产品必需的稀有矿物' },
  { id: 9, key: 'timber', name: '木材', category: 'raw', tier: 0, basePrice: 25, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '立方米', description: '建筑和家具用木材' },
  { id: 10, key: 'cotton', name: '棉花', category: 'raw', tier: 0, basePrice: 20, priceElasticity: -0.6, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '纺织业的主要原料' },
  { id: 11, key: 'grain', name: '粮食', category: 'raw', tier: 0, basePrice: 15, priceElasticity: -0.2, incomeElasticity: 0.3, isConsumerGood: true, unit: '吨', description: '食品加工的基础原料' },
  { id: 12, key: 'rubber_raw', name: '天然橡胶', category: 'raw', tier: 0, basePrice: 50, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '轮胎和橡胶制品的原料' },
  { id: 13, key: 'livestock', name: '牲畜', category: 'raw', tier: 0, basePrice: 400, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: false, unit: '头', description: '活体牲畜（牛羊猪）' },
  { id: 14, key: 'seafood', name: '水产', category: 'raw', tier: 0, basePrice: 30, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: true, unit: '吨', description: '鱼虾等水产品' },
  { id: 15, key: 'herbs', name: '药材', category: 'raw', tier: 0, basePrice: 100, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '中草药原料' },
  { id: 16, key: 'gold_ore', name: '金矿石', category: 'raw', tier: 0, basePrice: 3000, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '含金矿石' },
  { id: 17, key: 'diamond_ore', name: '钻石原石', category: 'raw', tier: 0, basePrice: 8000, priceElasticity: -0.3, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '原钻矿石' },
];

// ==================== 基础材料层 Tier 1（ID 18-35，共18种）====================
const BASIC_MATERIALS: GoodsDefinition[] = [
  { id: 18, key: 'steel', name: '钢材', category: 'basic', tier: 1, basePrice: 520, priceElasticity: -0.35, incomeElasticity: 0.55, isConsumerGood: false, unit: '吨', description: '工业生产的核心材料' },
  { id: 19, key: 'copper', name: '铜材', category: 'basic', tier: 1, basePrice: 200, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '电气和电子工业的基础材料' },
  { id: 20, key: 'aluminum', name: '铝材', category: 'basic', tier: 1, basePrice: 130, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '轻量化材料，用于航空和汽车' },
  { id: 21, key: 'fuel', name: '燃油', category: 'basic', tier: 1, basePrice: 320, priceElasticity: -0.35, incomeElasticity: 0.45, isConsumerGood: true, unit: '升', description: '汽车和机械用燃料' },
  { id: 22, key: 'plastic', name: '塑料', category: 'basic', tier: 1, basePrice: 260, priceElasticity: -0.45, incomeElasticity: 0.55, isConsumerGood: false, unit: '吨', description: '广泛使用的合成材料' },
  { id: 23, key: 'chemicals', name: '化学品', category: 'basic', tier: 1, basePrice: 300, priceElasticity: -0.35, incomeElasticity: 0.55, isConsumerGood: false, unit: '吨', description: '工业用化学品' },
  { id: 24, key: 'glass', name: '玻璃', category: 'basic', tier: 1, basePrice: 180, priceElasticity: -0.28, incomeElasticity: 0.4, isConsumerGood: false, unit: '平方米', description: '建筑和电子产品用玻璃' },
  { id: 25, key: 'cement', name: '水泥', category: 'basic', tier: 1, basePrice: 95, priceElasticity: -0.22, incomeElasticity: 0.25, isConsumerGood: false, unit: '吨', description: '建筑业的基础材料' },
  { id: 26, key: 'paper', name: '纸张', category: 'basic', tier: 1, basePrice: 35, priceElasticity: -0.7, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '包装和印刷用纸' },
  { id: 27, key: 'textiles', name: '纺织品', category: 'basic', tier: 1, basePrice: 55, priceElasticity: -0.8, incomeElasticity: 0.8, isConsumerGood: false, unit: '米', description: '服装和家纺的材料' },
  { id: 28, key: 'rubber', name: '橡胶制品', category: 'basic', tier: 1, basePrice: 110, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '轮胎和密封件的材料' },
  { id: 29, key: 'meat', name: '肉类', category: 'basic', tier: 1, basePrice: 45, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: true, unit: '吨', description: '加工肉类产品' },
  { id: 30, key: 'dairy', name: '乳制品', category: 'basic', tier: 1, basePrice: 25, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: true, unit: '吨', description: '牛奶、奶酪、黄油等' },
  { id: 31, key: 'processed_food', name: '加工食品', category: 'basic', tier: 1, basePrice: 22, priceElasticity: -0.4, incomeElasticity: 0.4, isConsumerGood: true, unit: '吨', description: '食品加工半成品' },
  { id: 32, key: 'gold', name: '黄金', category: 'basic', tier: 1, basePrice: 50000, priceElasticity: -0.4, incomeElasticity: 0.8, isConsumerGood: false, unit: '公斤', description: '精炼黄金' },
  { id: 33, key: 'diamond', name: '钻石', category: 'basic', tier: 1, basePrice: 80000, priceElasticity: -0.5, incomeElasticity: 1.0, isConsumerGood: false, unit: '克拉', description: '切割钻石' },
  { id: 34, key: 'pharma_base', name: '医药原料', category: 'basic', tier: 1, basePrice: 350, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '医药中间体' },
  { id: 35, key: 'silk', name: '丝绸', category: 'basic', tier: 1, basePrice: 180, priceElasticity: -0.6, incomeElasticity: 0.9, isConsumerGood: false, unit: '米', description: '高档丝绸面料' },
];

// ==================== 中间品层 Tier 2（ID 36-55，共20种）====================
const INTERMEDIATE_PRODUCTS: GoodsDefinition[] = [
  { id: 36, key: 'electronics', name: '电子元件', category: 'intermediate', tier: 2, basePrice: 900, priceElasticity: -0.55, incomeElasticity: 0.9, isConsumerGood: false, unit: '件', description: '电子产品的核心组件' },
  { id: 37, key: 'chips', name: '芯片', category: 'intermediate', tier: 2, basePrice: 2200, priceElasticity: -0.35, incomeElasticity: 1.1, isConsumerGood: false, unit: '片', description: '高科技产品的大脑' },
  { id: 38, key: 'battery', name: '电池', category: 'intermediate', tier: 2, basePrice: 420, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: false, unit: '组', description: '储能设备的核心' },
  { id: 39, key: 'motor', name: '电机', category: 'intermediate', tier: 2, basePrice: 380, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '台', description: '电动设备的动力来源' },
  { id: 40, key: 'screen', name: '屏幕', category: 'intermediate', tier: 2, basePrice: 280, priceElasticity: -0.7, incomeElasticity: 0.9, isConsumerGood: false, unit: '块', description: '显示设备的核心部件' },
  { id: 41, key: 'car_parts', name: '汽车零件', category: 'intermediate', tier: 2, basePrice: 480, priceElasticity: -0.5, incomeElasticity: 0.8, isConsumerGood: false, unit: '套', description: '汽车制造的核心零部件' },
  { id: 42, key: 'mechanical_parts', name: '机械部件', category: 'intermediate', tier: 2, basePrice: 220, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '套', description: '机械设备的组件' },
  { id: 43, key: 'aircraft_parts', name: '航空部件', category: 'intermediate', tier: 2, basePrice: 900, priceElasticity: -0.4, incomeElasticity: 0.8, isConsumerGood: false, unit: '套', description: '航空航天用高精度部件' },
  { id: 44, key: 'solar_panel', name: '光伏板', category: 'intermediate', tier: 2, basePrice: 340, priceElasticity: -0.6, incomeElasticity: 0.9, isConsumerGood: false, unit: '块', description: '太阳能发电的核心组件' },
  { id: 45, key: 'wind_blade', name: '风机叶片', category: 'intermediate', tier: 2, basePrice: 650, priceElasticity: -0.5, incomeElasticity: 0.8, isConsumerGood: false, unit: '片', description: '风力发电的核心部件' },
  { id: 46, key: 'building_materials', name: '建筑材料', category: 'intermediate', tier: 2, basePrice: 160, priceElasticity: -0.35, incomeElasticity: 0.4, isConsumerGood: false, unit: '吨', description: '建筑施工用材料包' },
  { id: 47, key: 'packaging', name: '包装材料', category: 'intermediate', tier: 2, basePrice: 60, priceElasticity: -0.45, incomeElasticity: 0.35, isConsumerGood: false, unit: '套', description: '产品包装用材料' },
  { id: 48, key: 'frozen_food', name: '冷冻食品', category: 'intermediate', tier: 2, basePrice: 55, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: true, unit: '吨', description: '速冻食品' },
  { id: 49, key: 'canned_food', name: '罐头食品', category: 'intermediate', tier: 2, basePrice: 40, priceElasticity: -0.5, incomeElasticity: 0.4, isConsumerGood: true, unit: '吨', description: '罐头制品' },
  { id: 50, key: 'antibiotics', name: '抗生素', category: 'intermediate', tier: 2, basePrice: 850, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '批', description: '抗生素原料药' },
  { id: 51, key: 'vaccine', name: '疫苗', category: 'intermediate', tier: 2, basePrice: 2200, priceElasticity: -0.2, incomeElasticity: 0.4, isConsumerGood: false, unit: '批', description: '疫苗制品' },
  { id: 52, key: 'medical_supplies', name: '医用耗材', category: 'intermediate', tier: 2, basePrice: 120, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '箱', description: '口罩、注射器等' },
  { id: 53, key: 'beverages', name: '饮料', category: 'intermediate', tier: 2, basePrice: 8, priceElasticity: -0.35, incomeElasticity: 0.3, isConsumerGood: true, unit: '瓶', description: '各类饮品' },
  { id: 54, key: 'snacks', name: '零食', category: 'intermediate', tier: 2, basePrice: 18, priceElasticity: -0.8, incomeElasticity: 0.7, isConsumerGood: true, unit: '件', description: '休闲零食' },
  { id: 55, key: 'clothing_fabric', name: '服装面料', category: 'intermediate', tier: 2, basePrice: 75, priceElasticity: -0.7, incomeElasticity: 0.7, isConsumerGood: false, unit: '米', description: '服装制造用面料' },
];

// ==================== 最终产品层 Tier 3（ID 56-79，共24种）====================
const FINAL_PRODUCTS: GoodsDefinition[] = [
  { id: 56, key: 'smartphone', name: '智能手机', category: 'final', tier: 3, basePrice: 3600, priceElasticity: -1.2, incomeElasticity: 1.5, isConsumerGood: true, unit: '台', description: '智能手机' },
  { id: 57, key: 'computer', name: '电脑', category: 'final', tier: 3, basePrice: 5200, priceElasticity: -1.0, incomeElasticity: 1.3, isConsumerGood: true, unit: '台', description: '个人和办公计算设备' },
  { id: 58, key: 'appliances', name: '家电', category: 'final', tier: 3, basePrice: 2600, priceElasticity: -0.85, incomeElasticity: 1.15, isConsumerGood: true, unit: '台', description: '家用电器' },
  { id: 59, key: 'drone', name: '无人机', category: 'final', tier: 3, basePrice: 2200, priceElasticity: -1.0, incomeElasticity: 1.5, isConsumerGood: true, unit: '台', description: '消费和商用无人机' },
  { id: 60, key: 'car', name: '燃油汽车', category: 'final', tier: 3, basePrice: 98000, priceElasticity: -1.1, incomeElasticity: 1.7, isConsumerGood: true, unit: '辆', description: '传统燃油汽车' },
  { id: 61, key: 'electric_car', name: '电动汽车', category: 'final', tier: 3, basePrice: 128000, priceElasticity: -1.2, incomeElasticity: 1.9, isConsumerGood: true, unit: '辆', description: '新能源电动汽车' },
  { id: 62, key: 'luxury_car', name: '豪华汽车', category: 'final', tier: 3, basePrice: 450000, priceElasticity: -2.0, incomeElasticity: 3.0, isConsumerGood: true, unit: '辆', description: '豪华轿车' },
  { id: 63, key: 'clothing', name: '服装', category: 'final', tier: 3, basePrice: 140, priceElasticity: -0.75, incomeElasticity: 0.85, isConsumerGood: true, unit: '件', description: '日常穿着的服装' },
  { id: 64, key: 'food', name: '食品', category: 'final', tier: 3, basePrice: 18, priceElasticity: -0.18, incomeElasticity: 0.22, isConsumerGood: true, unit: '份', description: '日常消费食品' },
  { id: 65, key: 'furniture', name: '家具', category: 'final', tier: 3, basePrice: 550, priceElasticity: -1.4, incomeElasticity: 1.6, isConsumerGood: true, unit: '件', description: '家用家具' },
  { id: 66, key: 'electricity', name: '电力', category: 'final', tier: 3, basePrice: 0.68, priceElasticity: -0.1, incomeElasticity: 0.12, isConsumerGood: true, isService: true, unit: '度', description: '工业和民用电力' },
  { id: 67, key: 'solar_system', name: '光伏系统', category: 'final', tier: 3, basePrice: 9000, priceElasticity: -0.8, incomeElasticity: 1.4, isConsumerGood: false, unit: '套', description: '完整的太阳能发电系统' },
  { id: 68, key: 'energy_storage', name: '储能系统', category: 'final', tier: 3, basePrice: 11000, priceElasticity: -0.7, incomeElasticity: 1.3, isConsumerGood: false, unit: '套', description: '大型储能电池系统' },
  { id: 69, key: 'industrial_robot', name: '工业机器人', category: 'final', tier: 3, basePrice: 16000, priceElasticity: -0.6, incomeElasticity: 1.2, isConsumerGood: false, unit: '台', description: '自动化生产机器人' },
  { id: 70, key: 'building_products', name: '建材成品', category: 'final', tier: 3, basePrice: 220, priceElasticity: -0.8, incomeElasticity: 0.9, isConsumerGood: false, unit: '套', description: '建筑用成品材料' },
  { id: 71, key: 'generic_drug', name: '仿制药', category: 'final', tier: 3, basePrice: 36, priceElasticity: -0.16, incomeElasticity: 0.18, isConsumerGood: true, unit: '盒', description: '普通仿制药品' },
  { id: 72, key: 'patent_drug', name: '专利药', category: 'final', tier: 3, basePrice: 550, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: true, unit: '盒', description: '专利处方药' },
  { id: 73, key: 'otc_drug', name: '非处方药', category: 'final', tier: 3, basePrice: 28, priceElasticity: -0.2, incomeElasticity: 0.2, isConsumerGood: true, unit: '盒', description: 'OTC药品' },
  { id: 74, key: 'medical_device', name: '医疗设备', category: 'final', tier: 3, basePrice: 9000, priceElasticity: -0.5, incomeElasticity: 0.8, isConsumerGood: false, unit: '台', description: '医疗诊断仪器' },
  { id: 75, key: 'jewelry', name: '珠宝', category: 'final', tier: 3, basePrice: 28000, priceElasticity: -2.4, incomeElasticity: 3.2, isConsumerGood: true, unit: '件', description: '贵金属和宝石饰品' },
  { id: 76, key: 'luxury_watch', name: '奢侈腕表', category: 'final', tier: 3, basePrice: 55000, priceElasticity: -2.5, incomeElasticity: 3.5, isConsumerGood: true, unit: '只', description: '高端奢侈手表' },
  { id: 77, key: 'designer_clothing', name: '设计师服装', category: 'final', tier: 3, basePrice: 2500, priceElasticity: -1.8, incomeElasticity: 2.5, isConsumerGood: true, unit: '件', description: '名牌设计师服装' },
  { id: 78, key: 'pet_food', name: '宠物食品', category: 'final', tier: 3, basePrice: 50, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: true, unit: '袋', description: '宠物饲料' },
  { id: 79, key: 'organic_food', name: '有机食品', category: 'final', tier: 3, basePrice: 85, priceElasticity: -1.2, incomeElasticity: 1.5, isConsumerGood: true, unit: '份', description: '高端有机产品' },
];

// 合并所有商品（80种商品，ID 0-79连续）
export const ALL_GOODS: GoodsDefinition[] = [
  ...RAW_MATERIALS,
  ...BASIC_MATERIALS,
  ...INTERMEDIATE_PRODUCTS,
  ...FINAL_PRODUCTS,
];

// 商品ID到定义的映射
export const GOODS_BY_ID: Map<number, GoodsDefinition> = new Map(
  ALL_GOODS.map(g => [g.id, g])
);

// 商品Key到定义的映射
export const GOODS_BY_KEY: Map<string, GoodsDefinition> = new Map(
  ALL_GOODS.map(g => [g.key, g])
);

// 按类别分组
export const GOODS_BY_CATEGORY = {
  raw: ALL_GOODS.filter(g => g.category === 'raw'),
  basic: ALL_GOODS.filter(g => g.category === 'basic'),
  intermediate: ALL_GOODS.filter(g => g.category === 'intermediate'),
  final: ALL_GOODS.filter(g => g.category === 'final'),
};

// 按层级分组
export const GOODS_BY_TIER = {
  tier0: RAW_MATERIALS,
  tier1: BASIC_MATERIALS,
  tier2: INTERMEDIATE_PRODUCTS,
  tier3: FINAL_PRODUCTS,
};

// 按产业链分组（用于UI显示）
export const GOODS_BY_INDUSTRY: Record<string, GoodsDefinition[]> = {
  // 矿业：金属矿石和稀有矿物
  mining: ALL_GOODS.filter(g => [0, 1, 2, 3, 6, 7, 8].includes(g.id)),
  
  // 能源：石油、天然气、电力相关
  energy: ALL_GOODS.filter(g => [4, 5, 21, 66, 67, 68].includes(g.id)),
  
  // 农林牧渔：农业、林业、畜牧、渔业、药材
  agriculture: ALL_GOODS.filter(g => [9, 10, 11, 12, 13, 14, 15].includes(g.id)),
  
  // 食品：食品加工全链条
  food: ALL_GOODS.filter(g => [29, 30, 31, 48, 49, 53, 54, 64, 78, 79].includes(g.id)),
  
  // 化工建材：化学品、塑料、玻璃、水泥、建材
  chemical: ALL_GOODS.filter(g => [22, 23, 24, 25, 26, 46, 47, 70].includes(g.id)),
  
  // 冶金：钢铁、有色金属
  metallurgy: ALL_GOODS.filter(g => [18, 19, 20, 42].includes(g.id)),
  
  // 纺织家具：纺织品、服装、家具
  textile: ALL_GOODS.filter(g => [27, 28, 35, 55, 63, 65].includes(g.id)),
  
  // 电子科技：电子元件、芯片、电池、屏幕、手机、电脑
  electronics: ALL_GOODS.filter(g => [36, 37, 38, 39, 40, 56, 57, 59, 69].includes(g.id)),
  
  // 汽车：汽车零件和整车
  automotive: ALL_GOODS.filter(g => [41, 43, 60, 61, 62].includes(g.id)),
  
  // 家电
  appliance: ALL_GOODS.filter(g => [58].includes(g.id)),
  
  // 新能源：光伏、风电
  newEnergy: ALL_GOODS.filter(g => [44, 45].includes(g.id)),
  
  // 医药：药材、医药原料、抗生素、疫苗、药品、医疗设备
  pharma: ALL_GOODS.filter(g => [34, 50, 51, 52, 71, 72, 73, 74].includes(g.id)),
  
  // 奢侈品：黄金、钻石、珠宝、奢侈品
  luxury: ALL_GOODS.filter(g => [16, 17, 32, 33, 75, 76, 77].includes(g.id)),
};

// 消费品列表
export const CONSUMER_GOODS = ALL_GOODS.filter(g => g.isConsumerGood);

// 服务类商品列表
export const SERVICE_GOODS_LIST = ALL_GOODS.filter(g => g.isService);

// 商品ID常量（方便其他模块引用）
export const GoodsId = {
  // 原材料
  IRON_ORE: 0,
  COPPER_ORE: 1,
  BAUXITE: 2,
  COAL: 3,
  CRUDE_OIL: 4,
  NATURAL_GAS: 5,
  SILICON: 6,
  LITHIUM: 7,
  RARE_EARTH: 8,
  TIMBER: 9,
  COTTON: 10,
  GRAIN: 11,
  RUBBER_RAW: 12,
  LIVESTOCK: 13,
  SEAFOOD: 14,
  HERBS: 15,
  GOLD_ORE: 16,
  DIAMOND_ORE: 17,
  // 基础材料
  STEEL: 18,
  COPPER: 19,
  ALUMINUM: 20,
  FUEL: 21,
  PLASTIC: 22,
  CHEMICALS: 23,
  GLASS: 24,
  CEMENT: 25,
  PAPER: 26,
  TEXTILES: 27,
  RUBBER: 28,
  MEAT: 29,
  DAIRY: 30,
  PROCESSED_FOOD: 31,
  GOLD: 32,
  DIAMOND: 33,
  PHARMA_BASE: 34,
  SILK: 35,
  // 中间品
  ELECTRONICS: 36,
  CHIPS: 37,
  BATTERY: 38,
  MOTOR: 39,
  SCREEN: 40,
  CAR_PARTS: 41,
  MECHANICAL_PARTS: 42,
  AIRCRAFT_PARTS: 43,
  SOLAR_PANEL: 44,
  WIND_BLADE: 45,
  BUILDING_MATERIALS: 46,
  PACKAGING: 47,
  FROZEN_FOOD: 48,
  CANNED_FOOD: 49,
  ANTIBIOTICS: 50,
  VACCINE: 51,
  MEDICAL_SUPPLIES: 52,
  BEVERAGES: 53,
  SNACKS: 54,
  CLOTHING_FABRIC: 55,
  // 最终产品
  SMARTPHONE: 56,
  COMPUTER: 57,
  APPLIANCES: 58,
  DRONE: 59,
  CAR: 60,
  ELECTRIC_CAR: 61,
  LUXURY_CAR: 62,
  CLOTHING: 63,
  FOOD: 64,
  FURNITURE: 65,
  ELECTRICITY: 66,
  SOLAR_SYSTEM: 67,
  ENERGY_STORAGE: 68,
  INDUSTRIAL_ROBOT: 69,
  BUILDING_PRODUCTS: 70,
  GENERIC_DRUG: 71,
  PATENT_DRUG: 72,
  OTC_DRUG: 73,
  MEDICAL_DEVICE: 74,
  JEWELRY: 75,
  LUXURY_WATCH: 76,
  DESIGNER_CLOTHING: 77,
  PET_FOOD: 78,
  ORGANIC_FOOD: 79,
} as const;

/**
 * 获取商品的显示名称
 */
export function getGoodsName(goodsId: number): string {
  return GOODS_BY_ID.get(goodsId)?.name ?? `未知商品(${goodsId})`;
}

/**
 * 获取商品的基准价格
 */
export function getGoodsBasePrice(goodsId: number): number {
  return GOODS_BY_ID.get(goodsId)?.basePrice ?? 100;
}

/**
 * 判断商品是否为服务类
 */
export function isServiceGoods(goodsId: number): boolean {
  return GOODS_BY_ID.get(goodsId)?.isService === true;
}

/**
 * 获取商品总数
 */
export const GOODS_COUNT = ALL_GOODS.length; // 80
