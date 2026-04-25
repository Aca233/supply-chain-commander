/**
 * AI人格差异系统
 * 重构版本：删除配方机制，使用建筑内置的outputModeId
 * 适配新的40种建筑（ID 0-39）和产品模式系统
 * 包含45家AI公司，覆盖完整产业链
 */

import { GameWorld } from '@/core/world/GameWorld';
import { AIDecision, CompanyAssessment } from './AIDecisionEngine';
import { ALL_BUILDINGS, BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';

/**
 * AI人格类型
 */
export type PersonalityType =
  | 'aggressive'      // 激进型：追求快速扩张
  | 'conservative'    // 保守型：稳健经营
  | 'opportunist'     // 机会型：善于抓住机会
  | 'specialist'      // 专精型：专注特定领域
  | 'diversified'     // 多元型：分散投资
  | 'innovator'       // 创新型：追求技术领先
  | 'cost_leader'     // 成本领先：追求最低成本
  | 'premium'         // 高端型：追求高质量高溢价
  | 'pioneer';        // 产业链开拓者：专门填补产业链缺口

/**
 * 产业类别偏好权重
 */
export interface IndustryPreferences {
  extraction: number;      // 采掘业
  processing: number;      // 加工业
  manufacturing: number;   // 制造业
  service: number;         // 服务业
  retail: number;          // 零售业
  agriculture: number;     // 农业产业链
  pharma: number;          // 医药产业链
  luxury: number;          // 奢侈品产业链
  tech: number;            // 高科技产业链
  basic: number;           // 基础材料产业链
}

/**
 * 默认产业偏好
 */
export const DEFAULT_INDUSTRY_PREFERENCES: IndustryPreferences = {
  extraction: 1.0,
  processing: 1.0,
  manufacturing: 1.0,
  service: 1.0,
  retail: 1.0,
  agriculture: 1.0,
  pharma: 1.0,
  luxury: 1.0,
  tech: 1.0,
  basic: 1.0,
};

/**
 * AI人格特征
 */
export interface AIPersonality {
  type: PersonalityType;
  name: string;
  description: string;
  riskTolerance: number;
  expansionBias: number;
  pricingBias: number;
  targetInventoryDays: number;
  targetCashRatio: number;
  marketAwareness: number;
  competitiveSensitivity: number;
  longTermFocus: number;
  specializationDegree: number;
  innovationInvestment: number;
  decisionFrequency: number;
  industryPreferences: IndustryPreferences;
  preferredCategories: string[];
  avoidedCategories: string[];
}

/**
 * 预定义AI人格
 */
export const AI_PERSONALITIES: Record<PersonalityType, AIPersonality> = {
  aggressive: {
    type: 'aggressive',
    name: '激进扩张者',
    description: '追求快速市场扩张，愿意承担高风险获取高回报',
    riskTolerance: 0.85,
    expansionBias: 0.9,
    pricingBias: -0.3,
    targetInventoryDays: 10,
    targetCashRatio: 0.15,
    marketAwareness: 0.7,
    competitiveSensitivity: 0.8,
    longTermFocus: 0.3,
    specializationDegree: 0.3,
    innovationInvestment: 0.05,
    decisionFrequency: 1.5,
    industryPreferences: {
      extraction: 0.8,
      processing: 1.2,
      manufacturing: 1.5,
      service: 0.6,
      retail: 0.5,
      agriculture: 0.6,
      pharma: 0.8,
      luxury: 0.8,
      tech: 1.8,
      basic: 0.6,
    },
    preferredCategories: ['final', 'intermediate'],
    avoidedCategories: [],
  },
  
  conservative: {
    type: 'conservative',
    name: '稳健经营者',
    description: '注重风险控制，偏好稳定可预测的收益',
    riskTolerance: 0.25,
    expansionBias: 0.3,
    pricingBias: 0.1,
    targetInventoryDays: 30,
    targetCashRatio: 0.45,
    marketAwareness: 0.5,
    competitiveSensitivity: 0.4,
    longTermFocus: 0.8,
    specializationDegree: 0.6,
    innovationInvestment: 0.02,
    decisionFrequency: 0.7,
    industryPreferences: {
      extraction: 1.5,
      processing: 1.3,
      manufacturing: 1.0,
      service: 0.8,
      retail: 0.6,
      agriculture: 1.3,
      pharma: 0.8,
      luxury: 0.5,
      tech: 0.6,
      basic: 1.6,
    },
    preferredCategories: ['basic', 'raw'],
    avoidedCategories: [],
  },
  
  opportunist: {
    type: 'opportunist',
    name: '机会猎手',
    description: '善于发现和抓住市场机会，决策灵活多变',
    riskTolerance: 0.7,
    expansionBias: 0.6,
    pricingBias: 0,
    targetInventoryDays: 15,
    targetCashRatio: 0.35,
    marketAwareness: 0.95,
    competitiveSensitivity: 0.7,
    longTermFocus: 0.4,
    specializationDegree: 0.2,
    innovationInvestment: 0.03,
    decisionFrequency: 1.3,
    industryPreferences: {
      extraction: 1.0,
      processing: 1.2,
      manufacturing: 1.2,
      service: 1.2,
      retail: 0.9,
      agriculture: 0.9,
      pharma: 1.0,
      luxury: 1.0,
      tech: 1.1,
      basic: 0.9,
    },
    preferredCategories: [],
    avoidedCategories: [],
  },
  
  specialist: {
    type: 'specialist',
    name: '行业专家',
    description: '深耕特定领域，追求在细分市场的主导地位',
    riskTolerance: 0.5,
    expansionBias: 0.5,
    pricingBias: 0.2,
    targetInventoryDays: 20,
    targetCashRatio: 0.3,
    marketAwareness: 0.6,
    competitiveSensitivity: 0.9,
    longTermFocus: 0.7,
    specializationDegree: 0.95,
    innovationInvestment: 0.08,
    decisionFrequency: 0.9,
    industryPreferences: {
      extraction: 0.9,
      processing: 1.5,
      manufacturing: 1.5,
      service: 0.7,
      retail: 0.5,
      agriculture: 0.7,
      pharma: 1.3,
      luxury: 0.9,
      tech: 1.4,
      basic: 0.8,
    },
    preferredCategories: ['intermediate'],
    avoidedCategories: [],
  },
  
  diversified: {
    type: 'diversified',
    name: '多元化集团',
    description: '分散投资多个领域，降低单一市场风险',
    riskTolerance: 0.45,
    expansionBias: 0.55,
    pricingBias: 0,
    targetInventoryDays: 25,
    targetCashRatio: 0.35,
    marketAwareness: 0.65,
    competitiveSensitivity: 0.5,
    longTermFocus: 0.6,
    specializationDegree: 0.1,
    innovationInvestment: 0.04,
    decisionFrequency: 0.85,
    industryPreferences: {
      extraction: 1.0,
      processing: 1.1,
      manufacturing: 1.1,
      service: 1.0,
      retail: 1.0,
      agriculture: 1.0,
      pharma: 1.0,
      luxury: 1.0,
      tech: 1.0,
      basic: 1.0,
    },
    preferredCategories: [],
    avoidedCategories: [],
  },
  
  innovator: {
    type: 'innovator',
    name: '技术创新者',
    description: '重视研发投入，追求技术领先和产品创新',
    riskTolerance: 0.65,
    expansionBias: 0.55,
    pricingBias: 0.35,
    targetInventoryDays: 15,
    targetCashRatio: 0.25,
    marketAwareness: 0.75,
    competitiveSensitivity: 0.6,
    longTermFocus: 0.85,
    specializationDegree: 0.7,
    innovationInvestment: 0.15,
    decisionFrequency: 0.95,
    industryPreferences: {
      extraction: 0.7,
      processing: 1.2,
      manufacturing: 1.5,
      service: 0.8,
      retail: 0.5,
      agriculture: 0.5,
      pharma: 1.5,
      luxury: 0.7,
      tech: 2.0,
      basic: 0.5,
    },
    preferredCategories: ['final', 'intermediate'],
    avoidedCategories: [],
  },
  
  cost_leader: {
    type: 'cost_leader',
    name: '成本领先者',
    description: '通过规模经济和效率优化实现最低成本',
    riskTolerance: 0.4,
    expansionBias: 0.7,
    pricingBias: -0.5,
    targetInventoryDays: 20,
    targetCashRatio: 0.3,
    marketAwareness: 0.6,
    competitiveSensitivity: 0.75,
    longTermFocus: 0.55,
    specializationDegree: 0.5,
    innovationInvestment: 0.02,
    decisionFrequency: 1.0,
    industryPreferences: {
      extraction: 1.3,
      processing: 1.5,
      manufacturing: 1.2,
      service: 0.9,
      retail: 0.7,
      agriculture: 1.2,
      pharma: 0.7,
      luxury: 0.4,
      tech: 0.7,
      basic: 1.5,
    },
    preferredCategories: ['basic', 'raw'],
    avoidedCategories: [],
  },
  
  premium: {
    type: 'premium',
    name: '高端品牌',
    description: '专注高端市场，通过品质和品牌获取溢价',
    riskTolerance: 0.35,
    expansionBias: 0.35,
    pricingBias: 0.6,
    targetInventoryDays: 25,
    targetCashRatio: 0.4,
    marketAwareness: 0.7,
    competitiveSensitivity: 0.55,
    longTermFocus: 0.75,
    specializationDegree: 0.8,
    innovationInvestment: 0.1,
    decisionFrequency: 0.8,
    industryPreferences: {
      extraction: 0.6,
      processing: 1.0,
      manufacturing: 1.3,
      service: 0.9,
      retail: 1.0,
      agriculture: 0.6,
      pharma: 0.9,
      luxury: 2.0,
      tech: 1.1,
      basic: 0.5,
    },
    preferredCategories: ['final'],
    avoidedCategories: [],
  },
  
  pioneer: {
    type: 'pioneer',
    name: '产业链开拓者',
    description: '专门填补产业链缺口，投资无人生产的关键商品',
    riskTolerance: 0.95,
    expansionBias: 0.95,
    pricingBias: -0.2,
    targetInventoryDays: 20,
    targetCashRatio: 0.15,
    marketAwareness: 0.9,
    competitiveSensitivity: 0.3,
    longTermFocus: 0.95,
    specializationDegree: 0.2,
    innovationInvestment: 0.05,
    decisionFrequency: 1.5,
    industryPreferences: {
      extraction: 1.5,
      processing: 2.0,
      manufacturing: 1.8,
      service: 0.5,
      retail: 0.3,
      agriculture: 1.2,
      pharma: 1.5,
      luxury: 0.6,
      tech: 1.8,
      basic: 2.0,
    },
    preferredCategories: ['intermediate', 'basic', 'raw'],
    avoidedCategories: [],
  },
};

/**
 * AI公司配置
 * 
 * outputModeId 说明：
 * - 单产品建筑使用 modeId=0
 * - 多产品建筑根据 buildings.ts 中的 outputModes 定义使用对应的 modeId
 */
export interface AICompanyConfig {
  id: number;
  name: string;
  personality: PersonalityType;
  initialCash: number;
  focusGoods: number[];
  category: 'extraction' | 'processing' | 'manufacturing' | 'agriculture' | 'pharma' | 'luxury' | 'energy' | 'diversified';
  description?: string;
  initialBuildings: Array<{
    typeId: number;
    outputModeId: number;  // 替代原来的 recipeId
    count: number;
  }>;
}

/**
 * 产品模式ID常量（用于多产品建筑）
 * 
 * 命名规则: BUILDING_MODE_产品名
 */
export const OutputModeId = {
  // 农场 (BuildingId.FARM = 10)
  FARM_GRAIN: 0,           // 粮食种植
  FARM_COTTON: 1,          // 棉花种植
  
  // 有色金属冶炼厂 (BuildingId.NON_FERROUS_SMELTER = 16)
  SMELTER_COPPER: 0,       // 铜冶炼
  SMELTER_ALUMINUM: 1,     // 铝冶炼
  
  // 化工厂 (BuildingId.CHEMICAL_PLANT = 18)
  CHEMICAL_CHEMICALS: 0,   // 化学品生产
  CHEMICAL_RUBBER: 1,      // 橡胶制品生产
  
  // 纺织厂 (BuildingId.TEXTILE_MILL = 22)
  TEXTILE_TEXTILES: 0,     // 纺织品生产
  TEXTILE_SILK: 1,         // 丝绸生产
  
  // 食品厂 (BuildingId.FOOD_FACTORY = 23)
  FOOD_PROCESSING: 0,      // 食品加工
  FOOD_BEVERAGE: 1,        // 饮料生产
  FOOD_SNACKS: 2,          // 零食生产
  FOOD_FINAL: 3,           // 食品成品生产
  FOOD_PET: 4,             // 宠物食品生产
  FOOD_ORGANIC: 5,         // 有机食品生产
  
  // 肉类加工厂 (BuildingId.MEAT_PROCESSING = 24)
  MEAT_PROCESSING: 0,      // 肉类加工
  MEAT_FROZEN: 1,          // 冷冻食品生产
  
  // 建材厂 (BuildingId.BUILDING_MATERIALS_FACTORY = 26)
  BUILDING_MATERIALS: 0,   // 建筑材料生产
  BUILDING_PACKAGING: 1,   // 包装材料生产
  BUILDING_PRODUCTS: 2,    // 建材成品生产
  
  // 电子厂 (BuildingId.ELECTRONICS_FACTORY = 27)
  ELECTRONICS_PRODUCTION: 0,  // 电子元件生产
  ELECTRONICS_SMARTPHONE: 1,  // 智能手机组装
  ELECTRONICS_COMPUTER: 2,    // 电脑组装
  ELECTRONICS_DRONE: 3,       // 无人机生产
  
  // 电池厂 (BuildingId.BATTERY_FACTORY = 29)
  BATTERY_PRODUCTION: 0,     // 电池生产
  BATTERY_STORAGE: 1,        // 储能系统生产
  BATTERY_SOLAR_SYSTEM: 2,   // 光伏系统组装
  
  // 零部件厂 (BuildingId.PARTS_FACTORY = 30)
  PARTS_MOTOR: 0,            // 电机生产
  PARTS_SCREEN: 1,           // 屏幕生产
  PARTS_CAR: 2,              // 汽车零部件生产
  PARTS_MECHANICAL: 3,       // 机械部件生产
  PARTS_AIRCRAFT: 4,         // 航空部件生产
  PARTS_FABRIC: 5,           // 服装面料生产
  
  // 汽车工厂 (BuildingId.CAR_FACTORY = 31)
  CAR_FUEL: 0,               // 燃油汽车组装
  CAR_ELECTRIC: 1,           // 电动汽车组装
  CAR_LUXURY: 2,             // 豪华汽车组装
  
  // 家具厂 (BuildingId.FURNITURE_FACTORY = 33)
  FURNITURE_PRODUCTION: 0,   // 家具生产
  FURNITURE_CLOTHING: 1,     // 服装生产
  
  // 新能源厂 (BuildingId.NEW_ENERGY_FACTORY = 34)
  ENERGY_SOLAR_PANEL: 0,     // 光伏板生产
  ENERGY_WIND_BLADE: 1,      // 风机叶片生产
  ENERGY_ROBOT: 2,           // 工业机器人生产
  
  // 制药厂 (BuildingId.PHARMA_FACTORY = 35)
  PHARMA_BASE: 0,            // 医药原料生产
  PHARMA_ANTIBIOTIC: 1,      // 抗生素生产
  PHARMA_VACCINE: 2,         // 疫苗生产
  PHARMA_GENERIC: 3,         // 仿制药生产
  PHARMA_PATENT: 4,          // 专利药生产
  PHARMA_OTC: 5,             // 非处方药生产
  
  // 医疗器械厂 (BuildingId.MEDICAL_DEVICE_FACTORY = 36)
  MEDICAL_SUPPLIES: 0,       // 医用耗材生产
  MEDICAL_DEVICE: 1,         // 医疗设备生产
  
  // 金矿/黄金精炼 (BuildingId.GOLD_REFINERY = 37)
  GOLD_MINING: 0,            // 金矿开采
  GOLD_DIAMOND: 1,           // 钻石矿开采
  GOLD_REFINING: 2,          // 黄金精炼
  GOLD_CUTTING: 3,           // 钻石切割
  
  // 奢侈品工坊 (BuildingId.LUXURY_WORKSHOP = 38)
  LUXURY_JEWELRY: 0,         // 珠宝制作
  LUXURY_WATCH: 1,           // 奢侈腕表生产
  LUXURY_DESIGNER: 2,        // 设计师服装生产
  
  // 发电厂 (BuildingId.POWER_PLANT = 39)
  POWER_COAL: 0,             // 燃煤发电
  POWER_GAS: 1,              // 燃气发电
  POWER_SOLAR: 2,            // 光伏发电
} as const;

/**
 * 预定义AI公司配置（45家）
 * 
 * 重构版本：使用outputModeId替代recipeId
 * 分类：
 * - 采掘公司 (8家): ID 1-8
 * - 农业公司 (3家): ID 9-11
 * - 加工公司 (10家): ID 12-21
 * - 制造公司 (12家): ID 22-33
 * - 医药公司 (3家): ID 34-36
 * - 奢侈品公司 (2家): ID 37-38
 * - 能源公司 (2家): ID 39-40
 * - 产业链开拓者 (5家): ID 41-45
 */
export const AI_COMPANIES: AICompanyConfig[] = [
  // ==================== A. 采掘公司 (8家) ====================
  {
    id: 1,
    name: '中钢矿业',
    personality: 'conservative',
    initialCash: 100000000,
    focusGoods: [GoodsId.IRON_ORE],
    category: 'extraction',
    description: '铁矿开采',
    initialBuildings: [
      { typeId: BuildingId.IRON_MINE, outputModeId: 0, count: 18 },
    ],
  },
  {
    id: 2,
    name: '神华煤炭',
    personality: 'conservative',
    initialCash: 150000000,
    focusGoods: [GoodsId.COAL],
    category: 'extraction',
    description: '煤炭开采',
    initialBuildings: [
      { typeId: BuildingId.COAL_MINE, outputModeId: 0, count: 25 },
    ],
  },
  {
    id: 3,
    name: '五矿铜业',
    personality: 'conservative',
    initialCash: 90000000,
    focusGoods: [GoodsId.COPPER_ORE],
    category: 'extraction',
    description: '铜矿开采',
    initialBuildings: [
      { typeId: BuildingId.COPPER_MINE, outputModeId: 0, count: 16 },
    ],
  },
  {
    id: 4,
    name: '中石油',
    personality: 'conservative',
    initialCash: 300000000,
    focusGoods: [GoodsId.CRUDE_OIL, GoodsId.NATURAL_GAS],
    category: 'extraction',
    description: '石油天然气开采',
    initialBuildings: [
      { typeId: BuildingId.OIL_FIELD, outputModeId: 0, count: 15 },
      { typeId: BuildingId.GAS_FIELD, outputModeId: 0, count: 12 },
    ],
  },
  {
    id: 5,
    name: '林业集团',
    personality: 'conservative',
    initialCash: 70000000,
    focusGoods: [GoodsId.TIMBER],
    category: 'extraction',
    description: '木材采伐',
    initialBuildings: [
      { typeId: BuildingId.LOGGING_CAMP, outputModeId: 0, count: 18 },
    ],
  },
  {
    id: 6,
    name: '硅海矿业',
    personality: 'specialist',
    initialCash: 120000000,
    focusGoods: [GoodsId.SILICON, GoodsId.RARE_EARTH],
    category: 'extraction',
    description: '硅石稀土开采',
    initialBuildings: [
      { typeId: BuildingId.SILICON_MINE, outputModeId: 0, count: 12 },
      { typeId: BuildingId.RARE_EARTH_MINE, outputModeId: 0, count: 6 },
    ],
  },
  {
    id: 7,
    name: '天齐锂业',
    personality: 'pioneer',
    initialCash: 180000000,
    focusGoods: [GoodsId.LITHIUM],
    category: 'extraction',
    description: '锂矿开采',
    initialBuildings: [
      { typeId: BuildingId.LITHIUM_MINE, outputModeId: 0, count: 20 },
    ],
  },
  {
    id: 8,
    name: '中铝矿业',
    personality: 'conservative',
    initialCash: 100000000,
    focusGoods: [GoodsId.BAUXITE],
    category: 'extraction',
    description: '铝土矿开采',
    initialBuildings: [
      { typeId: BuildingId.ALUMINUM_MINE, outputModeId: 0, count: 14 },
    ],
  },

  // ==================== B. 农业公司 (3家) ====================
  {
    id: 9,
    name: '中粮集团',
    personality: 'diversified',
    initialCash: 150000000,
    focusGoods: [GoodsId.GRAIN, GoodsId.COTTON],
    category: 'agriculture',
    description: '粮食棉花种植',
    initialBuildings: [
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_GRAIN, count: 15 },
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_COTTON, count: 10 },
    ],
  },
  {
    id: 10,
    name: '新希望牧业',
    personality: 'specialist',
    initialCash: 200000000,
    focusGoods: [GoodsId.LIVESTOCK, GoodsId.MEAT, GoodsId.DAIRY],
    category: 'agriculture',
    description: '畜牧养殖及肉乳加工',
    initialBuildings: [
      { typeId: BuildingId.LIVESTOCK_FARM, outputModeId: 0, count: 12 },
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_PROCESSING, count: 6 },
      { typeId: BuildingId.DAIRY_FACTORY, outputModeId: 0, count: 5 },
    ],
  },
  {
    id: 11,
    name: '华域橡胶',
    personality: 'specialist',
    initialCash: 150000000,
    focusGoods: [GoodsId.RUBBER_RAW, GoodsId.RUBBER],
    category: 'agriculture',
    description: '橡胶种植和橡胶制品生产',
    initialBuildings: [
      { typeId: BuildingId.RUBBER_PLANTATION, outputModeId: 0, count: 18 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_RUBBER, count: 8 },
    ],
  },

  // ==================== C. 加工公司 (10家) ====================
  {
    id: 12,
    name: '宝钢集团',
    personality: 'cost_leader',
    initialCash: 250000000,
    focusGoods: [GoodsId.STEEL],
    category: 'processing',
    description: '钢铁冶炼',
    initialBuildings: [
      { typeId: BuildingId.IRON_MINE, outputModeId: 0, count: 8 },
      { typeId: BuildingId.COAL_MINE, outputModeId: 0, count: 4 },
      { typeId: BuildingId.STEEL_MILL, outputModeId: 0, count: 12 },
    ],
  },
  {
    id: 13,
    name: '江铜冶炼',
    personality: 'specialist',
    initialCash: 150000000,
    focusGoods: [GoodsId.COPPER],
    category: 'processing',
    description: '铜材冶炼',
    initialBuildings: [
      { typeId: BuildingId.COPPER_MINE, outputModeId: 0, count: 6 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_COPPER, count: 12 },
    ],
  },
  {
    id: 14,
    name: '中铝集团',
    personality: 'specialist',
    initialCash: 150000000,
    focusGoods: [GoodsId.ALUMINUM],
    category: 'processing',
    description: '铝材冶炼',
    initialBuildings: [
      { typeId: BuildingId.ALUMINUM_MINE, outputModeId: 0, count: 6 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_ALUMINUM, count: 10 },
    ],
  },
  {
    id: 15,
    name: '中石化',
    personality: 'cost_leader',
    initialCash: 300000000,
    focusGoods: [GoodsId.FUEL, GoodsId.PLASTIC, GoodsId.CHEMICALS],
    category: 'processing',
    description: '石油炼化',
    initialBuildings: [
      { typeId: BuildingId.OIL_FIELD, outputModeId: 0, count: 6 },
      { typeId: BuildingId.REFINERY, outputModeId: 0, count: 14 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_CHEMICALS, count: 8 },
    ],
  },
  {
    id: 16,
    name: '福耀玻璃',
    personality: 'specialist',
    initialCash: 150000000,
    focusGoods: [GoodsId.GLASS],
    category: 'processing',
    description: '玻璃制造',
    initialBuildings: [
      { typeId: BuildingId.SILICON_MINE, outputModeId: 0, count: 8 },
      { typeId: BuildingId.GLASS_FACTORY, outputModeId: 0, count: 16 },
    ],
  },
  {
    id: 17,
    name: '海螺水泥',
    personality: 'cost_leader',
    initialCash: 150000000,
    focusGoods: [GoodsId.CEMENT, GoodsId.BUILDING_MATERIALS],
    category: 'processing',
    description: '水泥及建材生产',
    initialBuildings: [
      { typeId: BuildingId.CEMENT_FACTORY, outputModeId: 0, count: 10 },
      { typeId: BuildingId.BUILDING_MATERIALS_FACTORY, outputModeId: OutputModeId.BUILDING_MATERIALS, count: 8 },
    ],
  },
  {
    id: 18,
    name: '山鹰纸业',
    personality: 'cost_leader',
    initialCash: 120000000,
    focusGoods: [GoodsId.PAPER, GoodsId.PACKAGING, GoodsId.BUILDING_PRODUCTS],
    category: 'processing',
    description: '造纸和包装材料生产',
    initialBuildings: [
      { typeId: BuildingId.LOGGING_CAMP, outputModeId: 0, count: 10 },
      { typeId: BuildingId.PAPER_MILL, outputModeId: 0, count: 12 },
      { typeId: BuildingId.BUILDING_MATERIALS_FACTORY, outputModeId: OutputModeId.BUILDING_PACKAGING, count: 8 },
      { typeId: BuildingId.BUILDING_MATERIALS_FACTORY, outputModeId: OutputModeId.BUILDING_PRODUCTS, count: 6 },
    ],
  },
  {
    id: 19,
    name: '魏桥纺织',
    personality: 'cost_leader',
    initialCash: 120000000,
    focusGoods: [GoodsId.TEXTILES, GoodsId.CLOTHING, GoodsId.SILK],
    category: 'processing',
    description: '纺织加工',
    initialBuildings: [
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_COTTON, count: 6 },
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_TEXTILES, count: 10 },
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_SILK, count: 4 },
      { typeId: BuildingId.FURNITURE_FACTORY, outputModeId: OutputModeId.FURNITURE_CLOTHING, count: 6 },
    ],
  },
  {
    id: 20,
    name: '统一食品',
    personality: 'cost_leader',
    initialCash: 100000000,
    focusGoods: [GoodsId.FOOD, GoodsId.BEVERAGES, GoodsId.SNACKS, GoodsId.ORGANIC_FOOD],
    category: 'processing',
    description: '食品饮料加工',
    initialBuildings: [
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_PROCESSING, count: 8 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_BEVERAGE, count: 6 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_SNACKS, count: 5 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_FINAL, count: 4 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_ORGANIC, count: 4 },
    ],
  },
  {
    id: 21,
    name: '渔业集团',
    personality: 'specialist',
    initialCash: 100000000,
    focusGoods: [GoodsId.SEAFOOD],
    category: 'processing',
    description: '水产养殖',
    initialBuildings: [
      { typeId: BuildingId.FISHERY, outputModeId: 0, count: 18 },
    ],
  },

  // ==================== D. 制造公司 (12家) ====================
  {
    id: 22,
    name: '立讯精密',
    personality: 'specialist',
    initialCash: 200000000,
    focusGoods: [GoodsId.ELECTRONICS],
    category: 'manufacturing',
    description: '电子元件制造',
    initialBuildings: [
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_COPPER, count: 4 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 14 },
    ],
  },
  {
    id: 23,
    name: '中芯国际',
    personality: 'innovator',
    initialCash: 500000000,
    focusGoods: [GoodsId.CHIPS],
    category: 'manufacturing',
    description: '半导体芯片制造',
    initialBuildings: [
      { typeId: BuildingId.SILICON_MINE, outputModeId: 0, count: 6 },
      { typeId: BuildingId.RARE_EARTH_MINE, outputModeId: 0, count: 3 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_CHEMICALS, count: 4 },
      { typeId: BuildingId.SEMICONDUCTOR_FAB, outputModeId: 0, count: 8 },
    ],
  },
  {
    id: 24,
    name: '宁德时代',
    personality: 'innovator',
    initialCash: 400000000,
    focusGoods: [GoodsId.BATTERY, GoodsId.ENERGY_STORAGE],
    category: 'manufacturing',
    description: '动力电池及储能系统制造',
    initialBuildings: [
      { typeId: BuildingId.LITHIUM_MINE, outputModeId: 0, count: 10 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_COPPER, count: 5 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_PRODUCTION, count: 14 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_STORAGE, count: 6 },
    ],
  },
  {
    id: 25,
    name: '零部件集团',
    personality: 'specialist',
    initialCash: 250000000,
    focusGoods: [GoodsId.MOTOR, GoodsId.SCREEN, GoodsId.MECHANICAL_PARTS, GoodsId.CAR_PARTS],
    category: 'manufacturing',
    description: '机械零部件制造',
    initialBuildings: [
      { typeId: BuildingId.STEEL_MILL, outputModeId: 0, count: 4 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 8 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_SCREEN, count: 6 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 8 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 8 },
    ],
  },
  {
    id: 26,
    name: '华为终端',
    personality: 'innovator',
    initialCash: 200000000,
    focusGoods: [GoodsId.SMARTPHONE, GoodsId.COMPUTER, GoodsId.DRONE],
    category: 'manufacturing',
    description: '消费电子产品',
    initialBuildings: [
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 4 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_SMARTPHONE, count: 6 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_COMPUTER, count: 4 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_DRONE, count: 3 },
    ],
  },
  {
    id: 27,
    name: '海尔家电',
    personality: 'diversified',
    initialCash: 150000000,
    focusGoods: [GoodsId.APPLIANCES],
    category: 'manufacturing',
    description: '家用电器制造',
    initialBuildings: [
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 4 },
      { typeId: BuildingId.APPLIANCE_FACTORY, outputModeId: 0, count: 12 },
    ],
  },
  {
    id: 28,
    name: '比亚迪',
    personality: 'innovator',
    initialCash: 350000000,
    focusGoods: [GoodsId.ELECTRIC_CAR],
    category: 'manufacturing',
    description: '电动汽车制造',
    initialBuildings: [
      { typeId: BuildingId.LITHIUM_MINE, outputModeId: 0, count: 4 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_PRODUCTION, count: 5 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 5 },
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_ELECTRIC, count: 10 },
    ],
  },
  {
    id: 29,
    name: '吉利汽车',
    personality: 'aggressive',
    initialCash: 250000000,
    focusGoods: [GoodsId.CAR, GoodsId.LUXURY_CAR],
    category: 'manufacturing',
    description: '燃油汽车及豪华汽车制造',
    initialBuildings: [
      { typeId: BuildingId.STEEL_MILL, outputModeId: 0, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 5 },
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_FUEL, count: 6 },
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_LUXURY, count: 3 },
    ],
  },
  {
    id: 30,
    name: '欧派家居',
    personality: 'diversified',
    initialCash: 100000000,
    focusGoods: [GoodsId.FURNITURE],
    category: 'manufacturing',
    description: '家具制造',
    initialBuildings: [
      { typeId: BuildingId.LOGGING_CAMP, outputModeId: 0, count: 6 },
      { typeId: BuildingId.FURNITURE_FACTORY, outputModeId: OutputModeId.FURNITURE_PRODUCTION, count: 12 },
    ],
  },
  {
    id: 31,
    name: '新能源设备',
    personality: 'innovator',
    initialCash: 300000000,
    focusGoods: [GoodsId.SOLAR_PANEL, GoodsId.WIND_BLADE, GoodsId.SOLAR_SYSTEM],
    category: 'manufacturing',
    description: '光伏板风机叶片制造',
    initialBuildings: [
      { typeId: BuildingId.SILICON_MINE, outputModeId: 0, count: 6 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_ALUMINUM, count: 5 },
      { typeId: BuildingId.GLASS_FACTORY, outputModeId: 0, count: 6 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 10 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_WIND_BLADE, count: 8 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_SOLAR_SYSTEM, count: 5 },
    ],
  },
  {
    id: 32,
    name: '航空部件',
    personality: 'specialist',
    initialCash: 250000000,
    focusGoods: [GoodsId.AIRCRAFT_PARTS],
    category: 'manufacturing',
    description: '航空航天部件生产',
    initialBuildings: [
      { typeId: BuildingId.RARE_EARTH_MINE, outputModeId: 0, count: 5 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_ALUMINUM, count: 5 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_AIRCRAFT, count: 12 },
    ],
  },
  {
    id: 33,
    name: '工业机器人',
    personality: 'innovator',
    initialCash: 200000000,
    focusGoods: [GoodsId.INDUSTRIAL_ROBOT],
    category: 'manufacturing',
    description: '工业机器人生产',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 4 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 4 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_ROBOT, count: 10 },
    ],
  },

  // ==================== E. 医药公司 (3家) ====================
  {
    id: 34,
    name: '同仁堂',
    personality: 'specialist',
    initialCash: 120000000,
    focusGoods: [GoodsId.HERBS, GoodsId.PHARMA_BASE, GoodsId.GENERIC_DRUG, GoodsId.OTC_DRUG],
    category: 'pharma',
    description: '中药制剂生产',
    initialBuildings: [
      { typeId: BuildingId.HERB_FARM, outputModeId: 0, count: 10 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_BASE, count: 4 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_GENERIC, count: 8 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_OTC, count: 6 },
    ],
  },
  {
    id: 35,
    name: '恒瑞医药',
    personality: 'innovator',
    initialCash: 300000000,
    focusGoods: [GoodsId.PHARMA_BASE, GoodsId.ANTIBIOTICS, GoodsId.VACCINE, GoodsId.PATENT_DRUG],
    category: 'pharma',
    description: '创新药物研发',
    initialBuildings: [
      { typeId: BuildingId.HERB_FARM, outputModeId: 0, count: 8 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_BASE, count: 6 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_ANTIBIOTIC, count: 8 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_VACCINE, count: 8 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_PATENT, count: 6 },
    ],
  },
  {
    id: 36,
    name: '迈瑞医疗',
    personality: 'innovator',
    initialCash: 250000000,
    focusGoods: [GoodsId.MEDICAL_SUPPLIES, GoodsId.MEDICAL_DEVICE],
    category: 'pharma',
    description: '医疗器械制造',
    initialBuildings: [
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 5 },
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_TEXTILES, count: 4 },
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_SUPPLIES, count: 12 },
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_DEVICE, count: 8 },
    ],
  },

  // ==================== F. 奢侈品公司 (2家) ====================
  {
    id: 37,
    name: '珠宝集团',
    personality: 'premium',
    initialCash: 200000000,
    focusGoods: [GoodsId.GOLD_ORE, GoodsId.GOLD, GoodsId.DIAMOND, GoodsId.JEWELRY],
    category: 'luxury',
    description: '珠宝奢侈品制造',
    initialBuildings: [
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_MINING, count: 5 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_DIAMOND, count: 4 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_REFINING, count: 4 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_JEWELRY, count: 4 },
    ],
  },
  {
    id: 38,
    name: '奢侈品工坊',
    personality: 'premium',
    initialCash: 180000000,
    focusGoods: [GoodsId.GOLD, GoodsId.DIAMOND, GoodsId.LUXURY_WATCH, GoodsId.DESIGNER_CLOTHING],
    category: 'luxury',
    description: '高端腕表设计师服装',
    initialBuildings: [
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_SILK, count: 4 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_DIAMOND, count: 2 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_REFINING, count: 2 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_CUTTING, count: 4 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_WATCH, count: 5 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_DESIGNER, count: 5 },
    ],
  },

  // ==================== G. 能源公司 (2家) ====================
  {
    id: 39,
    name: '华能集团',
    personality: 'conservative',
    initialCash: 200000000,
    focusGoods: [GoodsId.ELECTRICITY],
    category: 'energy',
    description: '电力生产供应',
    initialBuildings: [
      { typeId: BuildingId.COAL_MINE, outputModeId: 0, count: 6 },
      { typeId: BuildingId.GAS_FIELD, outputModeId: 0, count: 4 },
      { typeId: BuildingId.POWER_PLANT, outputModeId: OutputModeId.POWER_COAL, count: 8 },
      { typeId: BuildingId.POWER_PLANT, outputModeId: OutputModeId.POWER_GAS, count: 5 },
    ],
  },
  {
    id: 40,
    name: '绿色电力',
    personality: 'innovator',
    initialCash: 180000000,
    focusGoods: [GoodsId.ELECTRICITY],
    category: 'energy',
    description: '清洁能源发电',
    initialBuildings: [
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 4 },
      { typeId: BuildingId.POWER_PLANT, outputModeId: OutputModeId.POWER_SOLAR, count: 12 },
    ],
  },

  // ==================== H. 产业链开拓者 (5家) ====================
  {
    id: 41,
    name: '产业链投资',
    personality: 'pioneer',
    initialCash: 600000000,
    focusGoods: [GoodsId.LITHIUM, GoodsId.BATTERY, GoodsId.ELECTRONICS, GoodsId.CHIPS],
    category: 'diversified',
    description: '产业链基础设施投资',
    initialBuildings: [
      { typeId: BuildingId.LITHIUM_MINE, outputModeId: 0, count: 12 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_PRODUCTION, count: 10 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 8 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 8 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_SCREEN, count: 8 },
    ],
  },
  {
    id: 42,
    name: '供应链开拓',
    personality: 'pioneer',
    initialCash: 500000000,
    focusGoods: [GoodsId.MOTOR, GoodsId.SCREEN, GoodsId.MECHANICAL_PARTS, GoodsId.SOLAR_PANEL],
    category: 'diversified',
    description: '高端零部件和清洁能源设备生产',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 8 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_SCREEN, count: 8 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 8 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 8 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 8 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_WIND_BLADE, count: 6 },
    ],
  },
  {
    id: 43,
    name: '冷链食品',
    personality: 'specialist',
    initialCash: 150000000,
    focusGoods: [GoodsId.FROZEN_FOOD, GoodsId.CANNED_FOOD],
    category: 'processing',
    description: '冷冻食品和罐头生产',
    initialBuildings: [
      { typeId: BuildingId.LIVESTOCK_FARM, outputModeId: 0, count: 6 },
      { typeId: BuildingId.FISHERY, outputModeId: 0, count: 6 },
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_PROCESSING, count: 4 },
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_FROZEN, count: 10 },
    ],
  },
  {
    id: 44,
    name: '医药生物',
    personality: 'pioneer',
    initialCash: 300000000,
    focusGoods: [GoodsId.PHARMA_BASE, GoodsId.ANTIBIOTICS, GoodsId.VACCINE, GoodsId.MEDICAL_SUPPLIES],
    category: 'pharma',
    description: '医药化工品和医用耗材生产',
    initialBuildings: [
      { typeId: BuildingId.HERB_FARM, outputModeId: 0, count: 10 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_BASE, count: 8 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_ANTIBIOTIC, count: 8 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_VACCINE, count: 8 },
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_SUPPLIES, count: 10 },
    ],
  },
  {
    id: 45,
    name: '基础材料',
    personality: 'pioneer',
    initialCash: 400000000,
    focusGoods: [GoodsId.STEEL, GoodsId.COPPER, GoodsId.ALUMINUM, GoodsId.PLASTIC, GoodsId.CHEMICALS, GoodsId.RUBBER],
    category: 'processing',
    description: '基础材料生产',
    initialBuildings: [
      { typeId: BuildingId.IRON_MINE, outputModeId: 0, count: 6 },
      { typeId: BuildingId.COPPER_MINE, outputModeId: 0, count: 4 },
      { typeId: BuildingId.ALUMINUM_MINE, outputModeId: 0, count: 4 },
      { typeId: BuildingId.COAL_MINE, outputModeId: 0, count: 4 },
      { typeId: BuildingId.OIL_FIELD, outputModeId: 0, count: 4 },
      { typeId: BuildingId.STEEL_MILL, outputModeId: 0, count: 8 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_COPPER, count: 6 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_ALUMINUM, count: 6 },
      { typeId: BuildingId.REFINERY, outputModeId: 0, count: 6 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_CHEMICALS, count: 6 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_RUBBER, count: 4 },
    ],
  },
];

/**
 * 获取AI公司的人格
 */
export function getCompanyPersonality(world: GameWorld, companyId: number): AIPersonality | null {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  if (!config) return null;
  return AI_PERSONALITIES[config.personality];
}

/**
 * 根据人格调整决策
 */
export function adjustDecisionByPersonality(
  decision: AIDecision,
  personality: AIPersonality,
  assessment: CompanyAssessment
): AIDecision {
  const adjusted = { ...decision };
  
  switch (decision.type) {
    case 'investment':
      adjusted.priority *= (1.0 + personality.expansionBias * 0.4);
      adjusted.confidence *= (0.8 + personality.riskTolerance * 0.4);
      
      if (assessment.buildingCount < 3) {
        adjusted.priority *= 1.5;
      } else if (assessment.buildingCount < 5) {
        adjusted.priority *= 1.35;
      } else if (assessment.buildingCount < 10) {
        adjusted.priority *= 1.2;
      }
      
      if (assessment.profitMargin > 0.15) {
        adjusted.priority *= 1.25;
      } else if (assessment.profitMargin > 0.08) {
        adjusted.priority *= 1.15;
      } else if (assessment.profitMargin > 0) {
        adjusted.priority *= 1.05;
      }
      break;
      
    case 'trading':
      if (decision.action === 'sell' && decision.params.price) {
        const priceAdjustment = 1 + personality.pricingBias * 0.1;
        adjusted.params = {
          ...adjusted.params,
          price: (adjusted.params.price as number) * priceAdjustment,
        };
      }
      adjusted.priority *= (0.7 + personality.marketAwareness * 0.6);
      break;
      
    case 'production':
      adjusted.priority *= (0.8 + personality.specializationDegree * 0.4);
      break;
      
    case 'pricing':
      adjusted.priority *= (0.7 + personality.competitiveSensitivity * 0.6);
      break;
  }
  
  if (assessment.cashRatio < personality.targetCashRatio * 0.3) {
    if (decision.type === 'investment') {
      adjusted.priority *= 0.8;
    }
    if (decision.type === 'trading' && decision.action === 'sell') {
      adjusted.priority *= 1.5;
    }
  } else if (assessment.cashRatio < personality.targetCashRatio * 0.5) {
    if (decision.type === 'investment') {
      adjusted.priority *= 0.9;
    }
  }
  
  if (assessment.cashRatio > personality.targetCashRatio * 2.0) {
    if (decision.type === 'investment') {
      adjusted.priority *= 1.5;
    }
  } else if (assessment.cashRatio > personality.targetCashRatio * 1.5) {
    if (decision.type === 'investment') {
      adjusted.priority *= 1.3;
    }
  } else if (assessment.cashRatio > personality.targetCashRatio) {
    if (decision.type === 'investment') {
      adjusted.priority *= 1.1;
    }
  }
  
  return adjusted;
}

/**
 * 获取商品类别的偏好权重
 */
export function getCategoryWeight(personality: AIPersonality, category: string): number {
  const prefs = personality.industryPreferences;
  
  switch (category) {
    case 'raw':
      return prefs.extraction * prefs.basic;
    case 'basic':
      return prefs.basic;
    case 'intermediate':
      return prefs.processing;
    case 'final':
      return prefs.manufacturing;
    default:
      return 1.0;
  }
}

/**
 * 判断建筑是否属于农业产业链
 */
function isAgricultureBuilding(buildingTypeId: number): boolean {
  const agricultureBuildings: number[] = [
    BuildingId.FARM,
    BuildingId.RUBBER_PLANTATION,
    BuildingId.LIVESTOCK_FARM,
    BuildingId.FISHERY,
    BuildingId.HERB_FARM,
    BuildingId.MEAT_PROCESSING,
    BuildingId.DAIRY_FACTORY,
  ];
  return agricultureBuildings.includes(buildingTypeId);
}

/**
 * 判断建筑是否属于医药产业链
 */
function isPharmaBuilding(buildingTypeId: number): boolean {
  const pharmaBuildings: number[] = [
    BuildingId.HERB_FARM,
    BuildingId.PHARMA_FACTORY,
    BuildingId.MEDICAL_DEVICE_FACTORY,
  ];
  return pharmaBuildings.includes(buildingTypeId);
}

/**
 * 判断建筑是否属于奢侈品产业链
 */
function isLuxuryBuilding(buildingTypeId: number): boolean {
  const luxuryBuildings: number[] = [
    BuildingId.GOLD_REFINERY,
    BuildingId.LUXURY_WORKSHOP,
  ];
  return luxuryBuildings.includes(buildingTypeId);
}

/**
 * 判断建筑是否属于高科技产业链
 */
function isTechBuilding(buildingTypeId: number): boolean {
  const techBuildings: number[] = [
    BuildingId.ELECTRONICS_FACTORY,
    BuildingId.SEMICONDUCTOR_FAB,
    BuildingId.BATTERY_FACTORY,
    BuildingId.NEW_ENERGY_FACTORY,
  ];
  return techBuildings.includes(buildingTypeId);
}

/**
 * 获取建筑类型的偏好权重
 */
export function getBuildingTypeWeight(personality: AIPersonality, buildingTypeId: number): number {
  const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
  if (!building) return 1.0;
  
  const prefs = personality.industryPreferences;
  
  let weight = 1.0;
  switch (building.category) {
    case 'extraction':
      weight = prefs.extraction;
      break;
    case 'processing':
      weight = prefs.processing;
      break;
    case 'manufacturing':
      weight = prefs.manufacturing;
      break;
    case 'service':
      weight = prefs.service;
      break;
    case 'retail':
      weight = prefs.retail;
      break;
    case 'luxury':
      weight = prefs.luxury;
      break;
  }
  
  if (isAgricultureBuilding(buildingTypeId)) {
    weight = (weight + prefs.agriculture) / 2;
  } else if (isPharmaBuilding(buildingTypeId)) {
    weight = (weight + prefs.pharma) / 2;
  } else if (isLuxuryBuilding(buildingTypeId)) {
    weight = (weight + prefs.luxury) / 2;
  } else if (isTechBuilding(buildingTypeId)) {
    weight = (weight + prefs.tech) / 2;
  }
  
  return Math.max(0.2, Math.min(2.0, weight));
}

/**
 * 筛选符合人格偏好的决策
 */
export function filterDecisionsByPersonality(
  decisions: AIDecision[],
  personality: AIPersonality,
  world: GameWorld
): AIDecision[] {
  return decisions.map(d => {
    const adjusted = { ...d };
    
    if (d.params.goodsId !== undefined) {
      const goodsId = d.params.goodsId as number;
      const category = world.goods.categories[goodsId];
      
      const categoryWeight = getCategoryWeight(personality, category);
      adjusted.priority *= categoryWeight;
      adjusted.confidence *= Math.sqrt(categoryWeight);
    }
    
    if (d.type === 'investment' && d.params.buildingTypeId !== undefined) {
      const buildingTypeId = d.params.buildingTypeId as number;
      const buildingWeight = getBuildingTypeWeight(personality, buildingTypeId);
      adjusted.priority *= buildingWeight;
    }
    
    const minConfidence = (1 - personality.riskTolerance) * 0.3;
    if (adjusted.confidence < minConfidence) {
      adjusted.priority *= 0.3;
    }
    
    return adjusted;
  }).filter(d => d.priority > 0.05);
}

/**
 * 计算人格驱动的目标市场份额
 */
export function calculateTargetMarketShare(personality: AIPersonality): number {
  const baseShare = 0.1;
  const aggressiveness = personality.expansionBias * personality.riskTolerance;
  const focus = personality.specializationDegree;
  return baseShare + aggressiveness * 0.2 + focus * 0.1;
}

/**
 * 评估与人格目标的差距
 */
export function evaluatePersonalityGoalGap(
  personality: AIPersonality,
  assessment: CompanyAssessment
): {
  cashGap: number;
  inventoryGap: number;
  expansionNeed: number;
  riskLevel: number;
} {
  const cashGap = personality.targetCashRatio - assessment.cashRatio;
  
  const avgDailySales = assessment.inventoryValue / 30;
  const currentInventoryDays = avgDailySales > 0 ? 
    assessment.inventoryValue / avgDailySales : 0;
  const inventoryGap = currentInventoryDays - personality.targetInventoryDays;
  
  const targetShare = calculateTargetMarketShare(personality);
  const expansionNeed = Math.max(0, targetShare - assessment.marketShare);
  
  const riskLevel = (1 - assessment.cashRatio) * 0.4 + 
    (assessment.buildingCount / 20) * 0.3 +
    (1 - assessment.profitMargin) * 0.3;
  
  return {
    cashGap,
    inventoryGap,
    expansionNeed,
    riskLevel,
  };
}

/**
 * 生成符合人格的战略目标
 */
export function generateStrategicGoals(
  personality: AIPersonality,
  assessment: CompanyAssessment,
  world: GameWorld
): string[] {
  const goals: string[] = [];
  const gap = evaluatePersonalityGoalGap(personality, assessment);
  
  if (gap.cashGap > 0.1) {
    goals.push('增加现金储备');
  }
  
  if (gap.inventoryGap > 10) {
    goals.push('减少库存积压');
  } else if (gap.inventoryGap < -10) {
    goals.push('增加安全库存');
  }
  
  if (gap.expansionNeed > 0.05 && gap.riskLevel < personality.riskTolerance) {
    goals.push('扩大市场份额');
  }
  
  if (personality.innovationInvestment > 0.05) {
    goals.push('加大研发投入');
  }
  
  if (personality.specializationDegree > 0.7) {
    goals.push('深化专业领域');
  }
  
  if (personality.pricingBias > 0.3) {
    goals.push('提升品牌溢价');
  } else if (personality.pricingBias < -0.3) {
    goals.push('降低成本价格');
  }
  
  return goals;
}
