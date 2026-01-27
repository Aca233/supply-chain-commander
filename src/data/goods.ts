/**
 * 商品数据定义
 * 包含230种商品的完整配置（产业链全覆盖版本）
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
  { id: 24, key: 'processed-food', name: '加工食品', category: 'basic', tier: 1, basePrice: 35, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: true, unit: '件', description: '即食和半成品食品' },
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
const FINAL_PRODUCTS: GoodsDefinition[] = [
  { id: 38, key: 'smartphone', name: '智能手机', category: 'final', tier: 3, basePrice: 800, priceElasticity: -1.3, incomeElasticity: 1.5, isConsumerGood: true, unit: '台', description: '现代通讯和娱乐设备' },
  { id: 39, key: 'computer', name: '电脑', category: 'final', tier: 3, basePrice: 1200, priceElasticity: -1.2, incomeElasticity: 1.4, isConsumerGood: true, unit: '台', description: '个人和办公计算设备' },
  { id: 40, key: 'appliances', name: '家电', category: 'final', tier: 3, basePrice: 600, priceElasticity: -1.2, incomeElasticity: 1.3, isConsumerGood: true, unit: '台', description: '家用电器' },
  { id: 41, key: 'car', name: '汽车', category: 'final', tier: 3, basePrice: 25000, priceElasticity: -1.5, incomeElasticity: 2.0, isConsumerGood: true, unit: '辆', description: '传统燃油汽车' },
  { id: 42, key: 'electric-car', name: '电动汽车', category: 'final', tier: 3, basePrice: 35000, priceElasticity: -1.4, incomeElasticity: 2.2, isConsumerGood: true, unit: '辆', description: '新能源电动汽车' },
  { id: 43, key: 'clothing', name: '服装', category: 'final', tier: 3, basePrice: 80, priceElasticity: -1.0, incomeElasticity: 1.0, isConsumerGood: true, unit: '件', description: '日常穿着的服装' },
  { id: 44, key: 'food', name: '食品', category: 'final', tier: 3, basePrice: 20, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: true, unit: '份', description: '日常消费食品' },
  { id: 45, key: 'beverages', name: '饮料', category: 'final', tier: 3, basePrice: 10, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: true, unit: '瓶', description: '各类饮品' },
  { id: 46, key: 'furniture', name: '家具', category: 'final', tier: 3, basePrice: 500, priceElasticity: -1.4, incomeElasticity: 1.6, isConsumerGood: true, unit: '件', description: '家用家具' },
  { id: 47, key: 'building-products', name: '建材成品', category: 'final', tier: 3, basePrice: 200, priceElasticity: -0.8, incomeElasticity: 0.9, isConsumerGood: false, unit: '套', description: '建筑用成品材料' },
  { id: 48, key: 'medical-equipment', name: '医疗设备', category: 'final', tier: 3, basePrice: 5000, priceElasticity: -0.6, incomeElasticity: 1.2, isConsumerGood: false, unit: '台', description: '医疗诊断和治疗设备' },
  { id: 49, key: 'solar-system', name: '光伏系统', category: 'final', tier: 3, basePrice: 8000, priceElasticity: -0.8, incomeElasticity: 1.4, isConsumerGood: false, unit: '套', description: '完整的太阳能发电系统' },
  { id: 50, key: 'energy-storage', name: '储能系统', category: 'final', tier: 3, basePrice: 10000, priceElasticity: -0.7, incomeElasticity: 1.3, isConsumerGood: false, unit: '套', description: '大型储能电池系统' },
  { id: 51, key: 'industrial-robot', name: '工业机器人', category: 'final', tier: 3, basePrice: 15000, priceElasticity: -0.6, incomeElasticity: 1.2, isConsumerGood: false, unit: '台', description: '自动化生产机器人' },
  { id: 52, key: 'drone', name: '无人机', category: 'final', tier: 3, basePrice: 2000, priceElasticity: -1.0, incomeElasticity: 1.5, isConsumerGood: true, unit: '台', description: '消费和商用无人机' },
  { id: 53, key: 'luxury-goods', name: '奢侈品', category: 'final', tier: 3, basePrice: 5000, priceElasticity: -2.5, incomeElasticity: 3.0, isConsumerGood: true, unit: '件', description: '高端奢侈消费品' },
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

// ==================== 军工产业链扩展（ID 80-87）====================
const MILITARY_GOODS: GoodsDefinition[] = [
  { id: 80, key: 'special-steel', name: '特种钢材', category: 'basic', tier: 1, basePrice: 500, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '军工级特种钢材' },
  { id: 81, key: 'explosives', name: '炸药', category: 'intermediate', tier: 2, basePrice: 800, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '工业/军用炸药' },
  { id: 82, key: 'armor-plate', name: '装甲板', category: 'intermediate', tier: 2, basePrice: 2000, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '防护装甲材料' },
  { id: 83, key: 'military-electronics', name: '军用电子', category: 'intermediate', tier: 2, basePrice: 3000, priceElasticity: -0.4, incomeElasticity: 0.7, isConsumerGood: false, unit: '套', description: '军用级电子系统' },
  { id: 84, key: 'small-arms', name: '轻武器', category: 'final', tier: 3, basePrice: 1500, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '支', description: '步枪手枪等轻武器' },
  { id: 85, key: 'heavy-weapons', name: '重武器', category: 'final', tier: 3, basePrice: 50000, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: false, unit: '门', description: '火炮导弹等重武器' },
  { id: 86, key: 'military-vehicle', name: '军用车辆', category: 'final', tier: 3, basePrice: 200000, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: false, unit: '辆', description: '装甲车、坦克等' },
  { id: 87, key: 'fighter-jet', name: '战斗机', category: 'final', tier: 3, basePrice: 5000000, priceElasticity: -0.2, incomeElasticity: 0.5, isConsumerGood: false, unit: '架', description: '军用战斗机' },
];

// ==================== 奢侈品产业链扩展（ID 88-95）====================
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

// ==================== 科技产业链扩展（ID 96-103）====================
const TECH_GOODS: GoodsDefinition[] = [
  { id: 96, key: 'ai-chip', name: 'AI芯片', category: 'intermediate', tier: 2, basePrice: 5000, priceElasticity: -0.5, incomeElasticity: 0.9, isConsumerGood: false, unit: '片', description: '人工智能专用芯片' },
  { id: 97, key: 'quantum-component', name: '量子组件', category: 'intermediate', tier: 2, basePrice: 50000, priceElasticity: -0.4, incomeElasticity: 0.8, isConsumerGood: false, unit: '套', description: '量子计算核心组件' },
  { id: 98, key: 'biotech-material', name: '生物材料', category: 'intermediate', tier: 2, basePrice: 3000, priceElasticity: -0.5, incomeElasticity: 0.8, isConsumerGood: false, unit: '批', description: '生物科技材料' },
  { id: 99, key: 'ai-server', name: 'AI服务器', category: 'final', tier: 3, basePrice: 100000, priceElasticity: -0.6, incomeElasticity: 1.0, isConsumerGood: false, unit: '台', description: 'AI计算服务器' },
  { id: 100, key: 'quantum-computer', name: '量子计算机', category: 'final', tier: 3, basePrice: 10000000, priceElasticity: -0.3, incomeElasticity: 0.8, isConsumerGood: false, unit: '台', description: '量子计算机' },
  { id: 101, key: 'biotech-product', name: '生物制品', category: 'final', tier: 3, basePrice: 8000, priceElasticity: -0.5, incomeElasticity: 0.9, isConsumerGood: true, unit: '套', description: '生物科技产品' },
  { id: 102, key: 'smart-robot', name: '智能机器人', category: 'final', tier: 3, basePrice: 80000, priceElasticity: -0.8, incomeElasticity: 1.2, isConsumerGood: true, unit: '台', description: '家用/商用服务机器人' },
  { id: 103, key: 'vr-device', name: 'VR设备', category: 'final', tier: 3, basePrice: 3000, priceElasticity: -1.0, incomeElasticity: 1.4, isConsumerGood: true, unit: '套', description: '虚拟现实设备' },
];

// ==================== 日化产业链（ID 104-115）====================
const DAILY_CHEMICAL_GOODS: GoodsDefinition[] = [
  { id: 104, key: 'palm-oil', name: '棕榈油', category: 'raw', tier: 0, basePrice: 60, priceElasticity: -0.4, incomeElasticity: 0.4, isConsumerGood: false, unit: '吨', description: '日化和食品工业原料' },
  { id: 105, key: 'fragrance-raw', name: '香料原料', category: 'raw', tier: 0, basePrice: 150, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '天然香料植物和提取物' },
  { id: 106, key: 'surfactant', name: '表面活性剂', category: 'basic', tier: 1, basePrice: 180, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '洗涤产品核心原料' },
  { id: 107, key: 'fragrance', name: '香精', category: 'basic', tier: 1, basePrice: 500, priceElasticity: -0.6, incomeElasticity: 0.7, isConsumerGood: false, unit: '公斤', description: '化妆品和日化香精' },
  { id: 108, key: 'pigment', name: '颜料', category: 'basic', tier: 1, basePrice: 200, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '化妆品和涂料用颜料' },
  { id: 109, key: 'cosmetic-base', name: '化妆品基质', category: 'intermediate', tier: 2, basePrice: 300, priceElasticity: -0.6, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '化妆品基础配方' },
  { id: 110, key: 'cleaning-agent', name: '清洁剂原液', category: 'intermediate', tier: 2, basePrice: 120, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '洗涤用品原液' },
  { id: 111, key: 'cosmetics', name: '化妆品', category: 'final', tier: 3, basePrice: 150, priceElasticity: -1.5, incomeElasticity: 1.8, isConsumerGood: true, unit: '件', description: '彩妆和美妆产品' },
  { id: 112, key: 'skincare', name: '护肤品', category: 'final', tier: 3, basePrice: 200, priceElasticity: -1.3, incomeElasticity: 1.6, isConsumerGood: true, unit: '件', description: '护肤和保养产品' },
  { id: 113, key: 'detergent', name: '洗涤用品', category: 'final', tier: 3, basePrice: 25, priceElasticity: -0.4, incomeElasticity: 0.4, isConsumerGood: true, unit: '件', description: '洗衣液、洗洁精等' },
  { id: 114, key: 'shampoo', name: '洗发护发用品', category: 'final', tier: 3, basePrice: 35, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: true, unit: '件', description: '洗发水、护发素等' },
  { id: 115, key: 'toothpaste', name: '口腔护理用品', category: 'final', tier: 3, basePrice: 15, priceElasticity: -0.3, incomeElasticity: 0.3, isConsumerGood: true, unit: '件', description: '牙膏、漱口水等' },
];

// ==================== 交通运输设备（ID 116-127）====================
const TRANSPORT_GOODS: GoodsDefinition[] = [
  { id: 116, key: 'tire', name: '轮胎', category: 'intermediate', tier: 2, basePrice: 400, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '条', description: '汽车和自行车轮胎' },
  { id: 117, key: 'car-seat', name: '汽车座椅', category: 'intermediate', tier: 2, basePrice: 600, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '套', description: '汽车座椅总成' },
  { id: 118, key: 'ship-parts', name: '船舶部件', category: 'intermediate', tier: 2, basePrice: 5000, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '套', description: '船舶结构和动力部件' },
  { id: 119, key: 'train-parts', name: '铁路车辆部件', category: 'intermediate', tier: 2, basePrice: 8000, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '套', description: '铁路车辆核心部件' },
  { id: 120, key: 'aircraft-engine', name: '航空发动机', category: 'intermediate', tier: 2, basePrice: 1000000, priceElasticity: -0.3, incomeElasticity: 0.7, isConsumerGood: false, unit: '台', description: '飞机发动机' },
  { id: 121, key: 'bicycle', name: '自行车', category: 'final', tier: 3, basePrice: 500, priceElasticity: -1.0, incomeElasticity: 0.8, isConsumerGood: true, unit: '辆', description: '各类自行车' },
  { id: 122, key: 'motorcycle', name: '摩托车', category: 'final', tier: 3, basePrice: 8000, priceElasticity: -1.2, incomeElasticity: 1.2, isConsumerGood: true, unit: '辆', description: '燃油和电动摩托车' },
  { id: 123, key: 'electric-scooter', name: '电动滑板车', category: 'final', tier: 3, basePrice: 1500, priceElasticity: -1.1, incomeElasticity: 1.0, isConsumerGood: true, unit: '辆', description: '电动滑板车和平衡车' },
  { id: 124, key: 'ship', name: '船舶', category: 'final', tier: 3, basePrice: 5000000, priceElasticity: -0.4, incomeElasticity: 0.7, isConsumerGood: false, unit: '艘', description: '货船和客船' },
  { id: 125, key: 'train-car', name: '铁路车辆', category: 'final', tier: 3, basePrice: 2000000, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '节', description: '火车车厢和机车' },
  { id: 126, key: 'civil-aircraft', name: '民用飞机', category: 'final', tier: 3, basePrice: 50000000, priceElasticity: -0.3, incomeElasticity: 0.7, isConsumerGood: false, unit: '架', description: '民用客机和货机' },
  { id: 127, key: 'bus', name: '公交车', category: 'final', tier: 3, basePrice: 400000, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '辆', description: '公共交通车辆' },
];

// ==================== 矿业扩展（ID 128-139）====================
const MINING_EXTENDED_GOODS: GoodsDefinition[] = [
  { id: 128, key: 'zinc-ore', name: '锌矿石', category: 'raw', tier: 0, basePrice: 70, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '锌矿石原矿' },
  { id: 129, key: 'nickel-ore', name: '镍矿石', category: 'raw', tier: 0, basePrice: 100, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '镍矿石原矿' },
  { id: 130, key: 'tin-ore', name: '锡矿石', category: 'raw', tier: 0, basePrice: 120, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '锡矿石原矿' },
  { id: 131, key: 'cobalt-ore', name: '钴矿石', category: 'raw', tier: 0, basePrice: 300, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '钴矿石原矿' },
  { id: 132, key: 'manganese-ore', name: '锰矿石', category: 'raw', tier: 0, basePrice: 60, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '锰矿石原矿' },
  { id: 133, key: 'tungsten-ore', name: '钨矿石', category: 'raw', tier: 0, basePrice: 250, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '钨矿石原矿' },
  { id: 134, key: 'zinc', name: '锌', category: 'basic', tier: 1, basePrice: 180, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '精炼锌' },
  { id: 135, key: 'nickel', name: '镍', category: 'basic', tier: 1, basePrice: 280, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '精炼镍' },
  { id: 136, key: 'tin', name: '锡', category: 'basic', tier: 1, basePrice: 320, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '精炼锡' },
  { id: 137, key: 'cobalt', name: '钴', category: 'basic', tier: 1, basePrice: 800, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '精炼钴' },
  { id: 138, key: 'manganese', name: '锰', category: 'basic', tier: 1, basePrice: 160, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '精炼锰' },
  { id: 139, key: 'tungsten', name: '钨', category: 'basic', tier: 1, basePrice: 650, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '精炼钨' },
];

// ==================== 纺织扩展（ID 140-149）====================
const TEXTILE_EXTENDED_GOODS: GoodsDefinition[] = [
  { id: 140, key: 'wool', name: '羊毛', category: 'raw', tier: 0, basePrice: 50, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '原毛' },
  { id: 141, key: 'flax', name: '亚麻', category: 'raw', tier: 0, basePrice: 35, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '亚麻纤维' },
  { id: 142, key: 'leather-raw', name: '生皮', category: 'raw', tier: 0, basePrice: 80, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '张', description: '未加工皮革' },
  { id: 143, key: 'down', name: '羽绒', category: 'raw', tier: 0, basePrice: 200, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '鹅绒鸭绒' },
  { id: 144, key: 'wool-yarn', name: '毛纱', category: 'basic', tier: 1, basePrice: 120, priceElasticity: -0.6, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '羊毛纺纱' },
  { id: 145, key: 'linen-fabric', name: '麻布', category: 'basic', tier: 1, basePrice: 80, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: false, unit: '米', description: '亚麻织物' },
  { id: 146, key: 'leather', name: '皮革', category: 'basic', tier: 1, basePrice: 250, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: false, unit: '张', description: '加工皮革' },
  { id: 147, key: 'wool-clothing', name: '毛织品', category: 'final', tier: 3, basePrice: 300, priceElasticity: -1.2, incomeElasticity: 1.3, isConsumerGood: true, unit: '件', description: '羊毛服装和制品' },
  { id: 148, key: 'leather-goods', name: '皮具', category: 'final', tier: 3, basePrice: 500, priceElasticity: -1.5, incomeElasticity: 1.8, isConsumerGood: true, unit: '件', description: '皮包皮带等皮革制品' },
  { id: 149, key: 'shoes', name: '鞋类', category: 'final', tier: 3, basePrice: 150, priceElasticity: -1.0, incomeElasticity: 1.0, isConsumerGood: true, unit: '双', description: '各类鞋子' },
];

// ==================== 建材扩展（ID 150-159）====================
const BUILDING_EXTENDED_GOODS: GoodsDefinition[] = [
  { id: 150, key: 'clay', name: '粘土', category: 'raw', tier: 0, basePrice: 15, priceElasticity: -0.4, incomeElasticity: 0.4, isConsumerGood: false, unit: '吨', description: '陶瓷和砖瓦原料' },
  { id: 151, key: 'marble', name: '大理石', category: 'raw', tier: 0, basePrice: 300, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '吨', description: '装饰石材' },
  { id: 152, key: 'brick', name: '砖', category: 'basic', tier: 1, basePrice: 25, priceElasticity: -0.4, incomeElasticity: 0.4, isConsumerGood: false, unit: '万块', description: '建筑用砖' },
  { id: 153, key: 'tile', name: '瓷砖', category: 'basic', tier: 1, basePrice: 50, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '平方米', description: '墙地砖' },
  { id: 154, key: 'wood-board', name: '木板', category: 'basic', tier: 1, basePrice: 60, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '立方米', description: '人造板和实木板' },
  { id: 155, key: 'paint', name: '涂料', category: 'intermediate', tier: 2, basePrice: 100, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '墙面和工业涂料' },
  { id: 156, key: 'ceramics', name: '陶瓷制品', category: 'intermediate', tier: 2, basePrice: 150, priceElasticity: -0.6, incomeElasticity: 0.7, isConsumerGood: false, unit: '件', description: '卫浴陶瓷和艺术陶瓷' },
  { id: 157, key: 'sanitary-ware', name: '卫浴设备', category: 'final', tier: 3, basePrice: 800, priceElasticity: -0.8, incomeElasticity: 1.0, isConsumerGood: true, unit: '套', description: '马桶、浴缸、洗手盆' },
  { id: 158, key: 'tableware', name: '餐具', category: 'final', tier: 3, basePrice: 100, priceElasticity: -0.7, incomeElasticity: 0.8, isConsumerGood: true, unit: '套', description: '陶瓷和玻璃餐具' },
  { id: 159, key: 'decoration', name: '装饰材料', category: 'final', tier: 3, basePrice: 200, priceElasticity: -0.8, incomeElasticity: 1.0, isConsumerGood: true, unit: '套', description: '壁纸、装饰板等' },
];

// ==================== 农产品深加工（ID 160-175）====================
const AGRI_DEEP_PROCESS_GOODS: GoodsDefinition[] = [
  { id: 160, key: 'grape', name: '葡萄', category: 'raw', tier: 0, basePrice: 15, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: true, unit: '吨', description: '酿酒葡萄和鲜食葡萄' },
  { id: 161, key: 'sugarcane', name: '甘蔗', category: 'raw', tier: 0, basePrice: 10, priceElasticity: -0.3, incomeElasticity: 0.3, isConsumerGood: false, unit: '吨', description: '制糖原料' },
  { id: 162, key: 'tea-leaf', name: '茶叶', category: 'raw', tier: 0, basePrice: 100, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '鲜茶叶' },
  { id: 163, key: 'coffee-bean', name: '咖啡豆', category: 'raw', tier: 0, basePrice: 80, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '生咖啡豆' },
  { id: 164, key: 'tobacco', name: '烟叶', category: 'raw', tier: 0, basePrice: 50, priceElasticity: -0.2, incomeElasticity: 0.3, isConsumerGood: false, unit: '吨', description: '烟草原料' },
  { id: 165, key: 'oilseed', name: '油料作物', category: 'raw', tier: 0, basePrice: 20, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: false, unit: '吨', description: '大豆花生菜籽等' },
  { id: 166, key: 'sugar', name: '糖', category: 'basic', tier: 1, basePrice: 30, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: true, unit: '吨', description: '白糖和红糖' },
  { id: 167, key: 'edible-oil', name: '食用油', category: 'basic', tier: 1, basePrice: 50, priceElasticity: -0.3, incomeElasticity: 0.4, isConsumerGood: true, unit: '吨', description: '各种食用植物油' },
  { id: 168, key: 'flour', name: '面粉', category: 'basic', tier: 1, basePrice: 20, priceElasticity: -0.2, incomeElasticity: 0.3, isConsumerGood: true, unit: '吨', description: '小麦面粉' },
  { id: 169, key: 'beer', name: '啤酒', category: 'final', tier: 3, basePrice: 8, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: true, unit: '升', description: '各类啤酒' },
  { id: 170, key: 'wine', name: '葡萄酒', category: 'final', tier: 3, basePrice: 100, priceElasticity: -1.2, incomeElasticity: 1.5, isConsumerGood: true, unit: '瓶', description: '红白葡萄酒' },
  { id: 171, key: 'spirits', name: '烈酒', category: 'final', tier: 3, basePrice: 200, priceElasticity: -1.0, incomeElasticity: 1.3, isConsumerGood: true, unit: '瓶', description: '白酒威士忌等' },
  { id: 172, key: 'tea-product', name: '茶饮', category: 'final', tier: 3, basePrice: 50, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: true, unit: '盒', description: '茶叶和茶饮料' },
  { id: 173, key: 'coffee-product', name: '咖啡', category: 'final', tier: 3, basePrice: 80, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: true, unit: '袋', description: '咖啡粉和咖啡饮品' },
  { id: 174, key: 'cigarettes', name: '烟草制品', category: 'final', tier: 3, basePrice: 30, priceElasticity: -0.2, incomeElasticity: 0.3, isConsumerGood: true, unit: '盒', description: '香烟和雪茄' },
  { id: 175, key: 'candy', name: '糖果', category: 'final', tier: 3, basePrice: 20, priceElasticity: -0.7, incomeElasticity: 0.6, isConsumerGood: true, unit: '袋', description: '糖果和巧克力' },
];

// ==================== 能源扩展（ID 176-185）====================
const ENERGY_EXTENDED_GOODS: GoodsDefinition[] = [
  { id: 176, key: 'uranium-ore', name: '铀矿石', category: 'raw', tier: 0, basePrice: 500, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '核燃料原料' },
  { id: 177, key: 'biomass', name: '生物质', category: 'raw', tier: 0, basePrice: 20, priceElasticity: -0.3, incomeElasticity: 0.3, isConsumerGood: false, unit: '吨', description: '秸秆等生物质燃料原料' },
  { id: 178, key: 'nuclear-fuel', name: '核燃料', category: 'intermediate', tier: 2, basePrice: 10000, priceElasticity: -0.3, incomeElasticity: 0.5, isConsumerGood: false, unit: '组', description: '浓缩铀燃料棒' },
  { id: 179, key: 'hydrogen', name: '氢气', category: 'intermediate', tier: 2, basePrice: 50, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '立方米', description: '燃料电池用氢气' },
  { id: 180, key: 'biofuel', name: '生物燃料', category: 'intermediate', tier: 2, basePrice: 80, priceElasticity: -0.4, incomeElasticity: 0.4, isConsumerGood: false, unit: '吨', description: '乙醇和生物柴油' },
  { id: 181, key: 'nuclear-reactor', name: '核反应堆', category: 'final', tier: 3, basePrice: 100000000, priceElasticity: -0.2, incomeElasticity: 0.5, isConsumerGood: false, unit: '座', description: '核电站反应堆' },
  { id: 182, key: 'fuel-cell', name: '燃料电池', category: 'final', tier: 3, basePrice: 5000, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: false, unit: '套', description: '氢燃料电池系统' },
  { id: 183, key: 'wind-turbine', name: '风力发电机', category: 'final', tier: 3, basePrice: 500000, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '台', description: '风力发电设备' },
  { id: 184, key: 'transformer', name: '变压器', category: 'intermediate', tier: 2, basePrice: 10000, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '台', description: '电力变压设备' },
  { id: 185, key: 'power-cable', name: '电力电缆', category: 'intermediate', tier: 2, basePrice: 500, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '公里', description: '高压输电电缆' },
];

// ==================== 通信产业链（ID 186-195）====================
const TELECOM_GOODS: GoodsDefinition[] = [
  { id: 186, key: 'optical-fiber', name: '光纤', category: 'basic', tier: 1, basePrice: 100, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '公里', description: '通信光纤' },
  { id: 187, key: 'antenna', name: '天线', category: 'intermediate', tier: 2, basePrice: 500, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '套', description: '通信天线系统' },
  { id: 188, key: 'sensor', name: '传感器', category: 'intermediate', tier: 2, basePrice: 200, priceElasticity: -0.6, incomeElasticity: 0.7, isConsumerGood: false, unit: '件', description: '各类电子传感器' },
  { id: 189, key: 'memory-chip', name: '存储芯片', category: 'intermediate', tier: 2, basePrice: 300, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: false, unit: '片', description: '内存和闪存芯片' },
  { id: 190, key: 'display-panel', name: '显示面板', category: 'intermediate', tier: 2, basePrice: 400, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: false, unit: '块', description: 'LCD/OLED面板' },
  { id: 191, key: 'router', name: '路由器', category: 'final', tier: 3, basePrice: 300, priceElasticity: -0.8, incomeElasticity: 0.9, isConsumerGood: true, unit: '台', description: '家用和企业路由器' },
  { id: 192, key: 'base-station', name: '通信基站', category: 'final', tier: 3, basePrice: 100000, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '座', description: '移动通信基站' },
  { id: 193, key: 'satellite', name: '卫星', category: 'final', tier: 3, basePrice: 50000000, priceElasticity: -0.3, incomeElasticity: 0.6, isConsumerGood: false, unit: '颗', description: '通信和导航卫星' },
  { id: 194, key: 'tablet', name: '平板电脑', category: 'final', tier: 3, basePrice: 600, priceElasticity: -1.1, incomeElasticity: 1.3, isConsumerGood: true, unit: '台', description: '平板电脑设备' },
  { id: 195, key: 'smartwatch', name: '智能手表', category: 'final', tier: 3, basePrice: 400, priceElasticity: -1.2, incomeElasticity: 1.4, isConsumerGood: true, unit: '只', description: '智能穿戴手表' },
];

// ==================== 服务业产品（ID 196-209）====================
const SERVICE_GOODS: GoodsDefinition[] = [
  { id: 196, key: 'education-service', name: '教育服务', category: 'final', tier: 3, basePrice: 500, priceElasticity: -0.4, incomeElasticity: 1.2, isConsumerGood: true, isService: true, unit: '课时', description: '教育培训服务' },
  { id: 197, key: 'healthcare-service', name: '医疗服务', category: 'final', tier: 3, basePrice: 300, priceElasticity: -0.3, incomeElasticity: 1.0, isConsumerGood: true, isService: true, unit: '次', description: '医疗诊治服务' },
  { id: 198, key: 'financial-service', name: '金融服务', category: 'final', tier: 3, basePrice: 200, priceElasticity: -0.5, incomeElasticity: 1.3, isConsumerGood: true, isService: true, unit: '笔', description: '银行保险金融服务' },
  { id: 199, key: 'entertainment-service', name: '娱乐服务', category: 'final', tier: 3, basePrice: 100, priceElasticity: -1.0, incomeElasticity: 1.5, isConsumerGood: true, isService: true, unit: '次', description: '影院游乐等娱乐服务' },
  { id: 200, key: 'catering-service', name: '餐饮服务', category: 'final', tier: 3, basePrice: 50, priceElasticity: -0.6, incomeElasticity: 0.8, isConsumerGood: true, isService: true, unit: '餐', description: '餐厅餐饮服务' },
  { id: 201, key: 'hotel-service', name: '住宿服务', category: 'final', tier: 3, basePrice: 300, priceElasticity: -0.8, incomeElasticity: 1.2, isConsumerGood: true, isService: true, unit: '晚', description: '酒店住宿服务' },
  { id: 202, key: 'transport-service', name: '运输服务', category: 'final', tier: 3, basePrice: 20, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: true, isService: true, unit: '公里', description: '客货运输服务' },
  { id: 203, key: 'cleaning-service', name: '清洁服务', category: 'final', tier: 3, basePrice: 100, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: true, isService: true, unit: '次', description: '保洁清洁服务' },
  { id: 204, key: 'security-service', name: '安保服务', category: 'final', tier: 3, basePrice: 150, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, isService: true, unit: '天', description: '安全保卫服务' },
  { id: 205, key: 'advertising-service', name: '广告服务', category: 'final', tier: 3, basePrice: 1000, priceElasticity: -0.7, incomeElasticity: 1.0, isConsumerGood: false, isService: true, unit: '单', description: '广告设计投放服务' },
  { id: 206, key: 'legal-service', name: '法律服务', category: 'final', tier: 3, basePrice: 500, priceElasticity: -0.4, incomeElasticity: 1.1, isConsumerGood: true, isService: true, unit: '小时', description: '律师法律咨询服务' },
  { id: 207, key: 'consulting-service', name: '咨询服务', category: 'final', tier: 3, basePrice: 800, priceElasticity: -0.5, incomeElasticity: 1.2, isConsumerGood: false, isService: true, unit: '项目', description: '企业管理咨询服务' },
  { id: 208, key: 'software-service', name: '软件服务', category: 'final', tier: 3, basePrice: 2000, priceElasticity: -0.6, incomeElasticity: 1.3, isConsumerGood: false, isService: true, unit: '套', description: '软件开发和SaaS服务' },
  { id: 209, key: 'research-service', name: '研发服务', category: 'final', tier: 3, basePrice: 5000, priceElasticity: -0.4, incomeElasticity: 1.0, isConsumerGood: false, isService: true, unit: '项目', description: '科研技术服务' },
];

// ==================== 文化传媒商品（ID 210-219）====================
const CULTURAL_GOODS: GoodsDefinition[] = [
  { id: 210, key: 'printing-ink', name: '印刷油墨', category: 'intermediate', tier: 2, basePrice: 150, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '印刷用油墨' },
  { id: 211, key: 'film-equipment', name: '影视设备', category: 'intermediate', tier: 2, basePrice: 10000, priceElasticity: -0.5, incomeElasticity: 0.7, isConsumerGood: false, unit: '套', description: '摄影摄像设备' },
  { id: 212, key: 'books', name: '图书', category: 'final', tier: 3, basePrice: 50, priceElasticity: -0.7, incomeElasticity: 0.9, isConsumerGood: true, unit: '册', description: '各类书籍' },
  { id: 213, key: 'magazines', name: '杂志报刊', category: 'final', tier: 3, basePrice: 15, priceElasticity: -0.6, incomeElasticity: 0.6, isConsumerGood: true, unit: '期', description: '杂志和报纸' },
  { id: 214, key: 'music-album', name: '音乐专辑', category: 'final', tier: 3, basePrice: 30, priceElasticity: -0.8, incomeElasticity: 0.9, isConsumerGood: true, unit: '张', description: '音乐CD和数字专辑' },
  { id: 215, key: 'movie', name: '电影', category: 'final', tier: 3, basePrice: 50000000, priceElasticity: -0.6, incomeElasticity: 1.0, isConsumerGood: false, isService: true, unit: '部', description: '电影作品' },
  { id: 216, key: 'video-game', name: '电子游戏', category: 'final', tier: 3, basePrice: 300, priceElasticity: -1.0, incomeElasticity: 1.4, isConsumerGood: true, unit: '款', description: '电子游戏产品' },
  { id: 217, key: 'toy', name: '玩具', category: 'final', tier: 3, basePrice: 100, priceElasticity: -1.0, incomeElasticity: 1.1, isConsumerGood: true, unit: '件', description: '儿童玩具' },
  { id: 218, key: 'sports-equipment', name: '运动器材', category: 'final', tier: 3, basePrice: 300, priceElasticity: -0.9, incomeElasticity: 1.2, isConsumerGood: true, unit: '件', description: '体育运动器材' },
  { id: 219, key: 'musical-instrument', name: '乐器', category: 'final', tier: 3, basePrice: 1000, priceElasticity: -1.2, incomeElasticity: 1.5, isConsumerGood: true, unit: '件', description: '各类乐器' },
];

// ==================== 杂项补充商品（ID 220-229）====================
const MISC_GOODS: GoodsDefinition[] = [
  { id: 220, key: 'zipper', name: '拉链', category: 'intermediate', tier: 2, basePrice: 5, priceElasticity: -0.5, incomeElasticity: 0.4, isConsumerGood: false, unit: '条', description: '服装拉链' },
  { id: 221, key: 'buttons', name: '纽扣', category: 'intermediate', tier: 2, basePrice: 2, priceElasticity: -0.5, incomeElasticity: 0.4, isConsumerGood: false, unit: '颗', description: '服装纽扣' },
  { id: 222, key: 'photoresist', name: '光刻胶', category: 'intermediate', tier: 2, basePrice: 5000, priceElasticity: -0.4, incomeElasticity: 0.7, isConsumerGood: false, unit: '公斤', description: '芯片制造用光刻胶' },
  { id: 223, key: 'inert-gas', name: '惰性气体', category: 'basic', tier: 1, basePrice: 200, priceElasticity: -0.4, incomeElasticity: 0.5, isConsumerGood: false, unit: '立方米', description: '氩气氮气等' },
  { id: 224, key: 'catalyst', name: '催化剂', category: 'intermediate', tier: 2, basePrice: 1000, priceElasticity: -0.4, incomeElasticity: 0.6, isConsumerGood: false, unit: '吨', description: '化工催化剂' },
  { id: 225, key: 'adhesive', name: '胶粘剂', category: 'intermediate', tier: 2, basePrice: 80, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '吨', description: '工业和民用胶水' },
  { id: 226, key: 'bearing', name: '轴承', category: 'intermediate', tier: 2, basePrice: 50, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '套', description: '机械轴承' },
  { id: 227, key: 'spring', name: '弹簧', category: 'intermediate', tier: 2, basePrice: 20, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '件', description: '各类弹簧' },
  { id: 228, key: 'seal', name: '密封件', category: 'intermediate', tier: 2, basePrice: 30, priceElasticity: -0.5, incomeElasticity: 0.5, isConsumerGood: false, unit: '件', description: '橡胶密封圈等' },
  { id: 229, key: 'filter', name: '过滤器', category: 'intermediate', tier: 2, basePrice: 100, priceElasticity: -0.5, incomeElasticity: 0.6, isConsumerGood: false, unit: '件', description: '空气和液体过滤器' },
];

// 合并所有商品（产业链全覆盖版本：230种商品）
export const ALL_GOODS: GoodsDefinition[] = [
  ...RAW_MATERIALS,
  ...BASIC_MATERIALS,
  ...INTERMEDIATE_PRODUCTS,
  ...FINAL_PRODUCTS,
  ...AGRICULTURE_GOODS,
  ...PHARMA_GOODS,
  ...MILITARY_GOODS,
  ...LUXURY_GOODS,
  ...TECH_GOODS,
  ...DAILY_CHEMICAL_GOODS,
  ...TRANSPORT_GOODS,
  ...MINING_EXTENDED_GOODS,
  ...TEXTILE_EXTENDED_GOODS,
  ...BUILDING_EXTENDED_GOODS,
  ...AGRI_DEEP_PROCESS_GOODS,
  ...ENERGY_EXTENDED_GOODS,
  ...TELECOM_GOODS,
  ...SERVICE_GOODS,
  ...CULTURAL_GOODS,
  ...MISC_GOODS,
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
  military: MILITARY_GOODS,
  luxury: LUXURY_GOODS,
  tech: TECH_GOODS,
  dailyChemical: DAILY_CHEMICAL_GOODS,
  transport: TRANSPORT_GOODS,
  miningExtended: MINING_EXTENDED_GOODS,
  textileExtended: TEXTILE_EXTENDED_GOODS,
  buildingExtended: BUILDING_EXTENDED_GOODS,
  agriDeepProcess: AGRI_DEEP_PROCESS_GOODS,
  energyExtended: ENERGY_EXTENDED_GOODS,
  telecom: TELECOM_GOODS,
  service: SERVICE_GOODS,
  cultural: CULTURAL_GOODS,
  misc: MISC_GOODS,
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
export const GOODS_COUNT = ALL_GOODS.length; // 230