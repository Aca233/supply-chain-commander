/**
 * 商品数据定义
 * 精简版本：包含88种商品（核心+农业+医药+奢侈品产业链）
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
  isService?: boolean;  // 服务类商品标识
  unit: string;
  description: string;
}

// ==================== 核心原材料（层级0，ID 0-13）====================
const RAW_MATERIALS: GoodsDefinition[] = [
  { id: 0, key: 'iron-ore', name: '铁矿石', category: 'raw', tier: 0, basePrice: 50, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '用于炼钢的铁矿石' },
  { id: 1, key: 'copper-ore', name: '铜矿石', category: 'raw', tier: 0, basePrice: 80, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '用于制造电线和电子产品的铜矿石' },
  { id: 2, key: 'bauxite', name: '铝土矿', category: 'raw', tier: 0, basePrice: 40, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '用于生产铝材的铝土矿' },
  { id: 3, key: 'coal', name: '煤炭', category: 'raw', tier: 0, basePrice: 30, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: false, unit: '吨', description: '用于炼钢和发电的煤炭' },
  { id: 4, key: 'crude-oil', name: '原油', category: 'raw', tier: 0, basePrice: 100, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: false, unit: '桶', description: '石油化工的基础原料' },
  { id: 5, key: 'natural-gas', name: '天然气', category: 'raw', tier: 0, basePrice: 60, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: false, unit: '立方米', description: '清洁能源和化工原料' },
  { id: 6, key: 'timber', name: '木材', category: 'raw', tier: 0, basePrice: 25, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '立方米', description: '建筑和家具用木材' },
  { id: 7, key: 'cotton', name: '棉花', category: 'raw', tier: 0, basePrice: 20, priceElasticity: -0.6, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '纺织业的主要原料' },
  { id: 8, key: 'grain', name: '粮食', category: 'raw', tier: 0, basePrice: 15, priceElasticity: -0.2, incomeElasticity: 0.3, isConsumerGood: true, unit: '吨', description: '食品加工的基础原料' },
  { id: 9, key: 'silicon', name: '硅石', category: 'raw', tier: 0, basePrice: 35, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '用于生产玻璃和半导体' },
  { id: 10, key: 'rare-earth', name: '稀土', category: 'raw', tier: 0, basePrice: 200, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: false, unit: '公斤', description: '高科技产品必需的稀有矿物' },
  { id: 11, key: 'rubber-raw', name: '天然橡胶', category: 'raw', tier: 0, basePrice: 45, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '轮胎和橡胶制品的原料' },
  { id: 12, key: 'chemicals-raw', name: '化工原料', category: 'raw', tier: 0, basePrice: 70, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '化工产品的基础原料' },
  { id: 13, key: 'lithium', name: '锂矿', category: 'raw', tier: 0, basePrice: 150, priceElasticity: -0.4, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '电池生产的关键原料' },
];

// ==================== 核心基础材料（层级1，ID 14-25）====================
// 注意：ID 24 已删除（加工食品与食品重复）
const BASIC_MATERIALS: GoodsDefinition[] = [
  { id: 14, key: 'steel', name: '钢材', category: 'basic', tier: 1, basePrice: 150, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '工业生产的核心材料' },
  { id: 15, key: 'copper', name: '铜材', category: 'basic', tier: 1, basePrice: 200, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '电气和电子工业的基础材料' },
  { id: 16, key: 'aluminum', name: '铝材', category: 'basic', tier: 1, basePrice: 120, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '轻量化材料，用于航空和汽车' },
  { id: 17, key: 'glass', name: '玻璃', category: 'basic', tier: 1, basePrice: 80, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: false, unit: '平方米', description: '建筑和电子产品用玻璃' },
  { id: 18, key: 'plastic', name: '塑料', category: 'basic', tier: 1, basePrice: 60, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '广泛使用的合成材料' },
  { id: 19, key: 'rubber', name: '橡胶制品', category: 'basic', tier: 1, basePrice: 100, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '轮胎和密封件的材料' },
  { id: 20, key: 'chemicals', name: '化学品', category: 'basic', tier: 1, basePrice: 150, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '工业用化学品' },
  { id: 21, key: 'cement', name: '水泥', category: 'basic', tier: 1, basePrice: 40, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '建筑业的基础材料' },
  { id: 22, key: 'paper', name: '纸张', category: 'basic', tier: 1, basePrice: 30, priceElasticity: -0.7, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '包装和印刷用纸' },
  { id: 23, key: 'textiles', name: '纺织品', category: 'basic', tier: 1, basePrice: 50, priceElasticity: -0.8, incomeElasticity: 0.8, isConsumerGood: false, unit: '米', description: '服装和家纺的材料' },
  { id: 25, key: 'fuel', name: '燃油', category: 'basic', tier: 1, basePrice: 120, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: true, unit: '升', description: '汽车和机械用燃料' },
];

// ==================== 核心中间产品（层级2，ID 26-37）====================
const INTERMEDIATE_PRODUCTS: GoodsDefinition[] = [
  { id: 26, key: 'electronics', name: '电子元件', category: 'intermediate', tier: 2, basePrice: 300, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: false, unit: '件', description: '电子产品的核心组件' },
  { id: 27, key: 'chips', name: '芯片', category: 'intermediate', tier: 2, basePrice: 500, priceElasticity: -0.5, incomeElasticity: 0.9, isConsumerGood: false, unit: '片', description: '高科技产品的大脑' },
  { id: 28, key: 'battery', name: '电池', category: 'intermediate', tier: 2, basePrice: 400, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: false, unit: '组', description: '储能设备的核心' },
  { id: 29, key: 'motor', name: '电机', category: 'intermediate', tier: 2, basePrice: 350, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '台', description: '电动设备的动力来源' },
  { id: 30, key: 'screen', name: '屏幕', category: 'intermediate', tier: 2, basePrice: 250, priceElasticity: -0.7, incomeElasticity: 0.9, isConsumerGood: false, unit: '块', description: '显示设备的核心部件' },
  { id: 31, key: 'mechanical-parts', name: '机械部件', category: 'intermediate', tier: 2, basePrice: 200, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '套', description: '机械设备的组件' },
  { id: 32, key: 'car-parts', name: '汽车零部件', category: 'intermediate', tier: 2, basePrice: 450, priceElasticity: -0.5, incomeElasticity: 0.8, isConsumerGood: false, unit: '套', description: '汽车制造的核心零部件' },
  { id: 33, key: 'aircraft-parts', name: '航空部件', category: 'intermediate', tier: 2, basePrice: 800, priceElasticity: -0.4, incomeElasticity: 0.8, isConsumerGood: false, unit: '套', description: '航空航天用高精度部件' },
  { id: 34, key: 'solar-panel', name: '光伏板', category: 'intermediate', tier: 2, basePrice: 300, priceElasticity: -0.6, incomeElasticity: 0.9, isConsumerGood: false, unit: '块', description: '太阳能发电的核心组件' },
  { id: 35, key: 'wind-blade', name: '风机叶片', category: 'intermediate', tier: 2, basePrice: 600, priceElasticity: -0.5, incomeElasticity: 0.8, isConsumerGood: false, unit: '片', description: '风力发电的核心部件' },
  { id: 36, key: 'building-materials', name: '建筑材料', category: 'intermediate', tier: 2, basePrice: 100, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '建筑施工用材料包' },
  { id: 37, key: 'packaging', name: '包装材料', category: 'intermediate', tier: 2, basePrice: 40, priceElasticity: -0.7, incomeElasticity: 0.5, isConsumerGood: false, unit: '套', description: '产品包装用材料' },
];

// ==================== 核心最终产品（层级3，ID 38-57）====================
// 注意：ID 38（智能手机）已删除（与高端手机/平价手机重复）
// 注意：ID 48（医疗设备）已删除（与诊断设备/手术设备重复）
// 注意：ID 53（奢侈品）已删除（与具体奢侈品重复）
const FINAL_PRODUCTS: GoodsDefinition[] = [
  { id: 39, key: 'computer', name: '电脑', category: 'final', tier: 3, basePrice: 1200, priceElasticity: -1.2, incomeElasticity: 1.4, isConsumerGood: true, unit: '台', description: '个人和办公计算设备' },
  { id: 40, key: 'appliances', name: '家电', category: 'final', tier: 3, basePrice: 600, priceElasticity: -1.2, incomeElasticity: 1.3, isConsumerGood: true, unit: '台', description: '家用电器' },
  { id: 41, key: 'car', name: '汽车', category: 'final', tier: 3, basePrice: 25000, priceElasticity: -1.5, incomeElasticity: 2.0, isConsumerGood: true, unit: '辆', description: '传统燃油汽车' },
  { id: 42, key: 'electric-car', name: '电动汽车', category: 'final', tier: 3, basePrice: 35000, priceElasticity: -1.4, incomeElasticity: 2.2, isConsumerGood: true, unit: '辆', description: '新能源电动汽车' },
  { id: 43, key: 'clothing', name: '服装', category: 'final', tier: 3, basePrice: 80, priceElasticity: -1.0, incomeElasticity: 1.0, isConsumerGood: true, unit: '件', description: '日常穿着的服装' },
  { id: 44, key: 'food', name: '食品', category: 'final', tier: 3, basePrice: 20, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: true, unit: '份', description: '日常消费食品' },
  { id: 45, key: 'beverages', name: '饮料', category: 'final', tier: 3, basePrice: 10, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: true, unit: '瓶', description: '各类饮品' },
  { id: 46, key: 'furniture', name: '家具', category: 'final', tier: 3, basePrice: 500, priceElasticity: -1.4, incomeElasticity: 1.6, isConsumerGood: true, unit: '件', description: '家用家具' },
  { id: 47, key: 'building-products', name: '建材成品', category: 'final', tier: 3, basePrice: 200, priceElasticity: -0.8, incomeElasticity: 0.9, isConsumerGood: false, unit: '套', description: '建筑用成品材料' },
  { id: 49, key: 'solar-system', name: '光伏系统', category: 'final', tier: 3, basePrice: 8000, priceElasticity: -0.8, incomeElasticity: 1.4, isConsumerGood: false, unit: '套', description: '完整的太阳能发电系统' },
  { id: 50, key: 'energy-storage', name: '储能系统', category: 'final', tier: 3, basePrice: 10000, priceElasticity: -0.7, incomeElasticity: 1.3, isConsumerGood: false, unit: '套', description: '大型储能电池系统' },
  { id: 51, key: 'industrial-robot', name: '工业机器人', category: 'final', tier: 3, basePrice: 15000, priceElasticity: -0.6, incomeElasticity: 1.2, isConsumerGood: false, unit: '台', description: '自动化生产机器人' },
  { id: 52, key: 'drone', name: '无人机', category: 'final', tier: 3, basePrice: 2000, priceElasticity: -1.0, incomeElasticity: 1.5, isConsumerGood: true, unit: '台', description: '消费和商用无人机' },
  { id: 54, key: 'jewelry', name: '珠宝', category: 'final', tier: 3, basePrice: 10000, priceElasticity: -3.0, incomeElasticity: 4.0, isConsumerGood: true, unit: '件', description: '贵金属和宝石饰品' },
  { id: 55, key: 'premium-phone', name: '高端手机', category: 'final', tier: 3, basePrice: 1500, priceElasticity: -1.8, incomeElasticity: 2.0, isConsumerGood: true, unit: '台', description: '旗舰级智能手机' },
  { id: 56, key: 'budget-phone', name: '平价手机', category: 'final', tier: 3, basePrice: 300, priceElasticity: -0.9, incomeElasticity: 0.8, isConsumerGood: true, unit: '台', description: '经济型智能手机' },
  { id: 57, key: 'electricity', name: '电力', category: 'final', tier: 3, basePrice: 0.5, priceElasticity: -0.2, incomeElasticity: 0.3, isConsumerGood: true, unit: '度', description: '工业和民用电力' },
];

// ==================== 农业产业链扩展（ID 58-69）====================
const AGRICULTURE_GOODS: GoodsDefinition[] = [
  { id: 58, key: 'vegetables', name: '蔬菜', category: 'raw', tier: 0, basePrice: 8, priceElasticity: -0.4, incomeElasticity: 0.3, isConsumerGood: true, unit: '吨', description: '新鲜蔬菜' },
  { id: 59, key: 'fruits', name: '水果', category: 'raw', tier: 0, basePrice: 12, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: true, unit: '吨', description: '新鲜水果' },
  { id: 60, key: 'livestock', name: '牲畜', category: 'raw', tier: 0, basePrice: 500, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: false, unit: '头', description: '活体牲畜（牛羊猪）' },
  { id: 61, key: 'poultry', name: '家禽', category: 'raw', tier: 0, basePrice: 30, priceElasticity: -0.4, incomeElasticity: 0.4, isConsumerGood: false, unit: '只', description: '鸡鸭等家禽' },
  { id: 62, key: 'fish', name: '水产', category: 'raw', tier: 0, basePrice: 25, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: true, unit: '吨', description: '鱼虾等水产品' },
  { id: 63, key: 'meat', name: '肉类', category: 'basic', tier: 1, basePrice: 40, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: true, unit: '吨', description: '加工肉类产品' },
  { id: 64, key: 'dairy', name: '乳制品', category: 'basic', tier: 1, basePrice: 20, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: true, unit: '吨', description: '牛奶、奶酪、黄油等' },
  { id: 65, key: 'frozen-food', name: '冷冻食品', category: 'intermediate', tier: 2, basePrice: 50, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: true, unit: '吨', description: '速冻食品' },
  { id: 66, key: 'canned-food', name: '罐头食品', category: 'intermediate', tier: 2, basePrice: 35, priceElasticity: -0.5, incomeElasticity: 0.4, isConsumerGood: true, unit: '吨', description: '罐头制品' },
  { id: 67, key: 'snacks', name: '零食', category: 'final', tier: 3, basePrice: 15, priceElasticity: -0.8, incomeElasticity: 0.7, isConsumerGood: true, unit: '件', description: '休闲零食' },
  { id: 68, key: 'organic-food', name: '有机食品', category: 'final', tier: 3, basePrice: 80, priceElasticity: -1.2, incomeElasticity: 1.5, isConsumerGood: true, unit: '份', description: '高端有机产品' },
  { id: 69, key: 'pet-food', name: '宠物食品', category: 'final', tier: 3, basePrice: 45, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: true, unit: '袋', description: '宠物饲料' },
];

// ==================== 医药产业链扩展（ID 70-79）====================
const PHARMA_GOODS: GoodsDefinition[] = [
  { id: 70, key: 'herbs', name: '药材', category: 'raw', tier: 0, basePrice: 100, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '中草药原料' },
  { id: 71, key: 'medical-chemicals', name: '医药化工品', category: 'basic', tier: 1, basePrice: 300, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '医药中间体' },
  { id: 72, key: 'antibiotics', name: '抗生素', category: 'intermediate', tier: 2, basePrice: 800, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '批', description: '抗生素原料药' },
  { id: 73, key: 'vaccines', name: '疫苗', category: 'intermediate', tier: 2, basePrice: 2000, priceElasticity: -0.2, incomeElasticity: 0.4, isConsumerGood: false, unit: '批', description: '疫苗制品' },
  { id: 74, key: 'generic-drugs', name: '仿制药', category: 'final', tier: 3, basePrice: 50, priceElasticity: -0.5, incomeElasticity: 0.4, isConsumerGood: true, unit: '盒', description: '普通仿制药品' },
  { id: 75, key: 'patent-drugs', name: '专利药', category: 'final', tier: 3, basePrice: 500, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: true, unit: '盒', description: '专利处方药' },
  { id: 76, key: 'otc-drugs', name: '非处方药', category: 'final', tier: 3, basePrice: 30, priceElasticity: -0.4, incomeElasticity: 0.3, isConsumerGood: true, unit: '盒', description: 'OTC药品' },
  { id: 77, key: 'medical-consumables', name: '医用耗材', category: 'intermediate', tier: 2, basePrice: 100, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '箱', description: '口罩、注射器等' },
  { id: 78, key: 'diagnostic-equipment', name: '诊断设备', category: 'final', tier: 3, basePrice: 8000, priceElasticity: -0.5, incomeElasticity: 0.8, isConsumerGood: false, unit: '台', description: '医疗诊断仪器' },
  { id: 79, key: 'surgical-equipment', name: '手术设备', category: 'final', tier: 3, basePrice: 50000, priceElasticity: -0.4, incomeElasticity: 0.7, isConsumerGood: false, unit: '台', description: '高端手术设备' },
];

// ==================== 奢侈品产业链扩展（ID 88-95）====================
// 注意：ID 80-87 跳过（原军工产业链已删除）
const LUXURY_GOODS: GoodsDefinition[] = [
  { id: 88, key: 'gold-ore', name: '金矿石', category: 'raw', tier: 0, basePrice: 5000, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '含金矿石' },
  { id: 89, key: 'diamond-ore', name: '钻石矿石', category: 'raw', tier: 0, basePrice: 10000, priceElasticity: -0.3, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '原钻矿石' },
  { id: 90, key: 'gold', name: '黄金', category: 'basic', tier: 1, basePrice: 60000, priceElasticity: -0.4, incomeElasticity: 0.8, isConsumerGood: false, unit: '公斤', description: '精炼黄金' },
  { id: 91, key: 'diamond', name: '钻石', category: 'basic', tier: 1, basePrice: 100000, priceElasticity: -0.5, incomeElasticity: 1.0, isConsumerGood: false, unit: '克拉', description: '切割钻石' },
  { id: 92, key: 'silk', name: '丝绸', category: 'basic', tier: 1, basePrice: 200, priceElasticity: -0.6, incomeElasticity: 0.9, isConsumerGood: false, unit: '米', description: '高档丝绸面料' },
  { id: 93, key: 'designer-clothing', name: '设计师服装', category: 'final', tier: 3, basePrice: 2000, priceElasticity: -1.8, incomeElasticity: 2.5, isConsumerGood: true, unit: '件', description: '名牌设计师服装' },
  { id: 94, key: 'luxury-watch', name: '奢侈腕表', category: 'final', tier: 3, basePrice: 50000, priceElasticity: -2.5, incomeElasticity: 3.5, isConsumerGood: true, unit: '只', description: '高端奢侈手表' },
  { id: 95, key: 'luxury-car', name: '豪华汽车', category: 'final', tier: 3, basePrice: 500000, priceElasticity: -2.0, incomeElasticity: 3.0, isConsumerGood: true, unit: '辆', description: '豪华轿车' },
];

// 合并所有商品（精简版本：84种商品，删除了4个重复商品）
export const ALL_GOODS: GoodsDefinition[] = [
  ...RAW_MATERIALS,
  ...BASIC_MATERIALS,
  ...INTERMEDIATE_PRODUCTS,
  ...FINAL_PRODUCTS,
  ...AGRICULTURE_GOODS,
  ...PHARMA_GOODS,
  ...LUXURY_GOODS,
];

// 商品ID到定义的映射
export const GOODS_BY_ID: Map<number, GoodsDefinition> = new Map(
  ALL_GOODS.map(g => [g.id, g])
);

// 商品Key到定义的映射
export const GOODS_BY_KEY: Map<string, GoodsDefinition> = new Map(
  ALL_GOODS.map(g => [g.key, g])
);

// 按类别分组（动态计算包含扩展内容）
export const GOODS_BY_CATEGORY = {
  raw: ALL_GOODS.filter(g => g.category === 'raw'),
  basic: ALL_GOODS.filter(g => g.category === 'basic'),
  intermediate: ALL_GOODS.filter(g => g.category === 'intermediate'),
  final: ALL_GOODS.filter(g => g.category === 'final'),
};

// 按产业链分组
export const GOODS_BY_INDUSTRY = {
  core: [...RAW_MATERIALS, ...BASIC_MATERIALS, ...INTERMEDIATE_PRODUCTS, ...FINAL_PRODUCTS],
  agriculture: AGRICULTURE_GOODS,
  pharma: PHARMA_GOODS,
  luxury: LUXURY_GOODS,
};

// 消费品列表
export const CONSUMER_GOODS = ALL_GOODS.filter(g => g.isConsumerGood);

// 服务类商品列表
export const SERVICE_GOODS_LIST = ALL_GOODS.filter(g => g.isService);

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
export const GOODS_COUNT = ALL_GOODS.length; // 84