/**
 * AI人格差异系统
 * 重构版本：删除配方机制，使用建筑内置的outputModeId
 * 适配新的40种建筑（ID 0-39）和产品模式系统
 * 包含45家AI公司，覆盖完整产业链
 */

import { GameWorld } from '@/core/world/GameWorld';
import {
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';
import { resolveLegacyOutputModeToSlotMethods } from '@/core/production/legacyOutputModeBridge';
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
 * initialBuildings 在导出前会被归一化为 slotMethods。
 * raw 配置里仍允许使用 legacy outputModeId，兼容旧表维护方式。
 */
export interface AIInitialBuildingConfig {
  typeId: number;
  count: number;
  slotMethods: number[];
}

export interface AICompanyConfig {
  id: number;
  name: string;
  personality: PersonalityType;
  initialCash: number;
  focusGoods: number[];
  category: 'extraction' | 'processing' | 'manufacturing' | 'agriculture' | 'pharma' | 'luxury' | 'energy' | 'diversified';
  description?: string;
  initialBuildings: AIInitialBuildingConfig[];
}

interface RawAIInitialBuildingConfig {
  typeId: number;
  count: number;
  outputModeId?: number;
  slotMethods?: number[];
}

interface RawAICompanyConfig extends Omit<AICompanyConfig, 'initialBuildings'> {
  initialBuildings: RawAIInitialBuildingConfig[];
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
  MEAT_CANNED: 2,          // 罐头食品生产
  
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
 * 预定义AI公司配置（119家）
 *
 * Raw 配置仍使用 outputModeId 维护多产品建筑选择，
 * 导出时会统一归一化成 slotMethods。
 * 分类：
 * - 采掘公司 (8家): ID 1-8
 * - 农业公司 (3家): ID 9-11
 * - 加工公司 (10家): ID 12-21
 * - 制造公司 (12家): ID 22-33
 * - 医药公司 (3家): ID 34-36
 * - 奢侈品公司 (2家): ID 37-38
 * - 能源公司 (2家): ID 39-40
 * - 产业链开拓者 (5家): ID 41-45
 * - 第二供应商扩充 (14家): ID 46-59 — 解决终端品垄断导致的价格锁死
 *
 * 翻倍扩展（60家全新独立公司，ID 60-119）：
 * - 采掘扩充 (8家): ID 60-67 — 紫金/陕煤/洛钼/赣锋/中海油/西部矿业/中金/山东黄金
 * - 农业扩充 (3家): ID 68-70 — 北大荒/温氏/云南白药种植
 * - 加工扩充 (10家): ID 71-80 — 鞍钢/武钢/中海石化/万华/信义玻璃/金隅水泥/玖龙/山东如意/双汇/雨润
 * - 制造扩充 (12家): ID 81-92 — OPPO/vivo/联想/TCL/美的/格力/长城汽车/广汽/一汽/三一重工/沈飞/顾家
 * - 医药扩充 (3家): ID 93-95 — 国药/哈药/联影
 * - 奢侈品扩充 (2家): ID 96-97 — 老凤祥/海澜之家
 * - 能源扩充 (2家): ID 98-99 — 大唐发电/隆基绿能
 * - 第三供应商 (20家): ID 100-119 — 云南铜业/神火铝业/国机重装/海康威视/大族激光/京东方/国轩高科/协鑫/金风/远景/益海嘉里/伊利/上海家化/太极/振华重工/福田/红豆/光明/五粮液/茅台
 */
function resolveInitialBuildingSlotMethods(
  buildingTypeId: number,
  config: RawAIInitialBuildingConfig,
): number[] {
  if (config.slotMethods && config.slotMethods.length > 0) {
    return [...config.slotMethods];
  }

  initializeBuildingProductionMethods();
  return resolveLegacyOutputModeToSlotMethods(buildingTypeId, config.outputModeId ?? 0);
}

function normalizeAICompanyConfig(config: RawAICompanyConfig): AICompanyConfig {
  return {
    ...config,
    initialBuildings: config.initialBuildings.map((building) => ({
      typeId: building.typeId,
      count: building.count,
      slotMethods: resolveInitialBuildingSlotMethods(building.typeId, building),
    })),
  };
}

const RAW_AI_COMPANIES: RawAICompanyConfig[] = [
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
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_GRAIN, count: 33 },
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_COTTON, count: 18 },
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
      { typeId: BuildingId.LIVESTOCK_FARM, outputModeId: 0, count: 18 },
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_PROCESSING, count: 4 },
      { typeId: BuildingId.DAIRY_FACTORY, outputModeId: 0, count: 1 },
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
      { typeId: BuildingId.OIL_FIELD, outputModeId: 0, count: 4 },
      { typeId: BuildingId.REFINERY, outputModeId: 0, count: 8 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_CHEMICALS, count: 5 },
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
      { typeId: BuildingId.LOGGING_CAMP, outputModeId: 0, count: 6 },
      { typeId: BuildingId.PAPER_MILL, outputModeId: 0, count: 12 },
      { typeId: BuildingId.BUILDING_MATERIALS_FACTORY, outputModeId: OutputModeId.BUILDING_PACKAGING, count: 1 },
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
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_COTTON, count: 15 },
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
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_SCREEN, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 4 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 4 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_FABRIC, count: 5 },
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
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 3 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_SMARTPHONE, count: 4 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_COMPUTER, count: 3 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_DRONE, count: 2 },
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
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 3 },
      { typeId: BuildingId.APPLIANCE_FACTORY, outputModeId: 0, count: 9 },
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
      { typeId: BuildingId.SILICON_MINE, outputModeId: 0, count: 5 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_ALUMINUM, count: 4 },
      { typeId: BuildingId.GLASS_FACTORY, outputModeId: 0, count: 5 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 7 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_WIND_BLADE, count: 5 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_SOLAR_SYSTEM, count: 3 },
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
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 2 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 2 },
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
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_GENERIC, count: 5 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_OTC, count: 3 },
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
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_ANTIBIOTIC, count: 5 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_VACCINE, count: 5 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_PATENT, count: 3 },
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
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 3 },
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_TEXTILES, count: 2 },
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_SUPPLIES, count: 6 },
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_DEVICE, count: 4 },
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
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_MINING, count: 3 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_DIAMOND, count: 2 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_REFINING, count: 2 },
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
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_SILK, count: 2 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_DIAMOND, count: 1 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_REFINING, count: 1 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_WATCH, count: 4 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_DESIGNER, count: 4 },
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
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 3 },
      { typeId: BuildingId.POWER_PLANT, outputModeId: OutputModeId.POWER_SOLAR, count: 9 },
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
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_SCREEN, count: 3 },
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
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_SCREEN, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_FABRIC, count: 4 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 5 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_WIND_BLADE, count: 4 },
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
      { typeId: BuildingId.LIVESTOCK_FARM, outputModeId: 0, count: 10 },
      { typeId: BuildingId.FISHERY, outputModeId: 0, count: 6 },
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_PROCESSING, count: 3 },
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_FROZEN, count: 6 },
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_CANNED, count: 4 },
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
      { typeId: BuildingId.HERB_FARM, outputModeId: 0, count: 7 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_BASE, count: 5 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_ANTIBIOTIC, count: 5 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_VACCINE, count: 5 },
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_SUPPLIES, count: 6 },
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
      { typeId: BuildingId.IRON_MINE, outputModeId: 0, count: 4 },
      { typeId: BuildingId.COPPER_MINE, outputModeId: 0, count: 3 },
      { typeId: BuildingId.ALUMINUM_MINE, outputModeId: 0, count: 2 },
      { typeId: BuildingId.COAL_MINE, outputModeId: 0, count: 3 },
      { typeId: BuildingId.OIL_FIELD, outputModeId: 0, count: 2 },
      { typeId: BuildingId.STEEL_MILL, outputModeId: 0, count: 5 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_COPPER, count: 3 },
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_ALUMINUM, count: 3 },
      { typeId: BuildingId.REFINERY, outputModeId: 0, count: 3 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_CHEMICALS, count: 3 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_RUBBER, count: 2 },
    ],
  },

  // ==================== 第二供应商扩充 (ID 46-59) ====================
  // 解决"终端品 21/24 只有一家厂"导致价格锁死的问题
  // 每家定位为现有龙头的竞争者，提供供给弹性

  {
    id: 46,
    name: '小米科技',
    personality: 'innovator',
    initialCash: 200000000,
    focusGoods: [GoodsId.SMARTPHONE, GoodsId.COMPUTER, GoodsId.APPLIANCES, GoodsId.DRONE],
    category: 'manufacturing',
    description: '消费电子第二供应商',
    initialBuildings: [
      { typeId: BuildingId.SEMICONDUCTOR_FAB, outputModeId: 0, count: 2 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 2 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_SMARTPHONE, count: 3 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_COMPUTER, count: 2 },
      { typeId: BuildingId.APPLIANCE_FACTORY, outputModeId: 0, count: 2 },
    ],
  },
  {
    id: 47,
    name: '大疆创新',
    personality: 'specialist',
    initialCash: 180000000,
    focusGoods: [GoodsId.DRONE, GoodsId.AIRCRAFT_PARTS],
    category: 'manufacturing',
    description: '无人机与航空部件专家',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_AIRCRAFT, count: 5 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MOTOR, count: 1 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_DRONE, count: 6 },
    ],
  },
  {
    id: 48,
    name: '上汽集团',
    personality: 'aggressive',
    initialCash: 280000000,
    focusGoods: [GoodsId.CAR, GoodsId.LUXURY_CAR],
    category: 'manufacturing',
    description: '燃油车与豪华车第二供应商',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 5 },
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_FUEL, count: 5 },
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_LUXURY, count: 3 },
    ],
  },
  {
    id: 49,
    name: '蔚来汽车',
    personality: 'innovator',
    initialCash: 320000000,
    focusGoods: [GoodsId.ELECTRIC_CAR, GoodsId.BATTERY],
    category: 'manufacturing',
    description: '电动汽车第二供应商',
    initialBuildings: [
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_PRODUCTION, count: 4 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 3 },
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_ELECTRIC, count: 6 },
    ],
  },
  {
    id: 50,
    name: '红星家居',
    personality: 'diversified',
    initialCash: 130000000,
    focusGoods: [GoodsId.FURNITURE, GoodsId.CLOTHING],
    category: 'manufacturing',
    description: '家具与服装多元集团',
    initialBuildings: [
      { typeId: BuildingId.FURNITURE_FACTORY, outputModeId: OutputModeId.FURNITURE_PRODUCTION, count: 7 },
      { typeId: BuildingId.FURNITURE_FACTORY, outputModeId: OutputModeId.FURNITURE_CLOTHING, count: 5 },
    ],
  },
  {
    id: 51,
    name: '蒙牛食品',
    personality: 'cost_leader',
    initialCash: 160000000,
    focusGoods: [GoodsId.FOOD, GoodsId.PET_FOOD, GoodsId.ORGANIC_FOOD, GoodsId.DAIRY],
    category: 'processing',
    description: '食品成品与有机食品第二供应商',
    initialBuildings: [
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_GRAIN, count: 9 },
      { typeId: BuildingId.LIVESTOCK_FARM, outputModeId: 0, count: 6 },
      { typeId: BuildingId.DAIRY_FACTORY, outputModeId: 0, count: 1 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_FINAL, count: 4 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_PET, count: 4 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_ORGANIC, count: 4 },
    ],
  },
  {
    id: 52,
    name: '阳光电源',
    personality: 'innovator',
    initialCash: 260000000,
    focusGoods: [GoodsId.SOLAR_SYSTEM, GoodsId.ENERGY_STORAGE, GoodsId.SOLAR_PANEL],
    category: 'manufacturing',
    description: '光伏与储能系统第二供应商',
    initialBuildings: [
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 4 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_STORAGE, count: 4 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_SOLAR_SYSTEM, count: 4 },
    ],
  },
  {
    id: 53,
    name: 'ABB机器人',
    personality: 'innovator',
    initialCash: 220000000,
    focusGoods: [GoodsId.INDUSTRIAL_ROBOT, GoodsId.MECHANICAL_PARTS],
    category: 'manufacturing',
    description: '工业机器人第二供应商',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_FABRIC, count: 6 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_ROBOT, count: 7 },
    ],
  },
  {
    id: 54,
    name: '中国建材',
    personality: 'cost_leader',
    initialCash: 110000000,
    focusGoods: [GoodsId.BUILDING_PRODUCTS, GoodsId.BUILDING_MATERIALS, GoodsId.CEMENT],
    category: 'processing',
    description: '建材成品第二供应商',
    initialBuildings: [
      { typeId: BuildingId.CEMENT_FACTORY, outputModeId: 0, count: 3 },
      { typeId: BuildingId.BUILDING_MATERIALS_FACTORY, outputModeId: OutputModeId.BUILDING_MATERIALS, count: 3 },
      { typeId: BuildingId.BUILDING_MATERIALS_FACTORY, outputModeId: OutputModeId.BUILDING_PRODUCTS, count: 6 },
    ],
  },
  {
    id: 55,
    name: '复星医药',
    personality: 'specialist',
    initialCash: 260000000,
    focusGoods: [GoodsId.PATENT_DRUG, GoodsId.GENERIC_DRUG, GoodsId.OTC_DRUG, GoodsId.PHARMA_BASE],
    category: 'pharma',
    description: '专利药与仿制药第二供应商',
    initialBuildings: [
      { typeId: BuildingId.HERB_FARM, outputModeId: 0, count: 7 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_BASE, count: 5 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_GENERIC, count: 3 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_PATENT, count: 3 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_OTC, count: 3 },
    ],
  },
  {
    id: 56,
    name: '鱼跃医疗',
    personality: 'specialist',
    initialCash: 180000000,
    focusGoods: [GoodsId.MEDICAL_DEVICE, GoodsId.MEDICAL_SUPPLIES],
    category: 'pharma',
    description: '医疗设备第二供应商',
    initialBuildings: [
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_SUPPLIES, count: 3 },
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_DEVICE, count: 5 },
    ],
  },
  {
    id: 57,
    name: '周大福',
    personality: 'premium',
    initialCash: 200000000,
    focusGoods: [GoodsId.JEWELRY, GoodsId.LUXURY_WATCH, GoodsId.GOLD, GoodsId.DIAMOND],
    category: 'luxury',
    description: '珠宝与奢侈腕表第二供应商',
    initialBuildings: [
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_REFINING, count: 2 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_CUTTING, count: 1 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_JEWELRY, count: 4 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_WATCH, count: 3 },
    ],
  },
  {
    id: 58,
    name: '江南布衣',
    personality: 'premium',
    initialCash: 140000000,
    focusGoods: [GoodsId.DESIGNER_CLOTHING, GoodsId.CLOTHING],
    category: 'luxury',
    description: '设计师服装第二供应商',
    initialBuildings: [
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_SILK, count: 2 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_DESIGNER, count: 4 },
      { typeId: BuildingId.FURNITURE_FACTORY, outputModeId: OutputModeId.FURNITURE_CLOTHING, count: 3 },
    ],
  },
  {
    id: 59,
    name: '紫光集团',
    personality: 'innovator',
    initialCash: 380000000,
    focusGoods: [GoodsId.CHIPS, GoodsId.ELECTRONICS],
    category: 'manufacturing',
    description: '芯片与电子元件第二供应商',
    initialBuildings: [
      { typeId: BuildingId.SEMICONDUCTOR_FAB, outputModeId: 0, count: 6 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 4 },
    ],
  },

  // ==================== J. 翻倍扩展 - 采掘扩充 (8家, ID 60-67) ====================
  {
    id: 60,
    name: '紫金矿业',
    personality: 'aggressive',
    initialCash: 260000000,
    focusGoods: [GoodsId.COPPER_ORE, GoodsId.GOLD_ORE],
    category: 'extraction',
    description: '多金属综合采矿巨头',
    initialBuildings: [
      { typeId: BuildingId.COPPER_MINE, outputModeId: 0, count: 11 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_MINING, count: 3 },
    ],
  },
  {
    id: 61,
    name: '陕西煤业',
    personality: 'cost_leader',
    initialCash: 220000000,
    focusGoods: [GoodsId.COAL],
    category: 'extraction',
    description: '西部低成本煤炭开采',
    initialBuildings: [
      { typeId: BuildingId.COAL_MINE, outputModeId: 0, count: 16 },
    ],
  },
  {
    id: 62,
    name: '洛阳钼业',
    personality: 'specialist',
    initialCash: 180000000,
    focusGoods: [GoodsId.RARE_EARTH, GoodsId.COPPER_ORE],
    category: 'extraction',
    description: '稀有金属与铜矿专营',
    initialBuildings: [
      { typeId: BuildingId.RARE_EARTH_MINE, outputModeId: 0, count: 5 },
      { typeId: BuildingId.COPPER_MINE, outputModeId: 0, count: 6 },
    ],
  },
  {
    id: 63,
    name: '赣锋锂业',
    personality: 'pioneer',
    initialCash: 200000000,
    focusGoods: [GoodsId.LITHIUM],
    category: 'extraction',
    description: '锂资源新势力',
    initialBuildings: [
      { typeId: BuildingId.LITHIUM_MINE, outputModeId: 0, count: 9 },
    ],
  },
  {
    id: 64,
    name: '中海油',
    personality: 'conservative',
    initialCash: 420000000,
    focusGoods: [GoodsId.CRUDE_OIL, GoodsId.NATURAL_GAS],
    category: 'extraction',
    description: '海上油气开采',
    initialBuildings: [
      { typeId: BuildingId.OIL_FIELD, outputModeId: 0, count: 9 },
      { typeId: BuildingId.GAS_FIELD, outputModeId: 0, count: 6 },
    ],
  },
  {
    id: 65,
    name: '西部矿业',
    personality: 'diversified',
    initialCash: 150000000,
    focusGoods: [GoodsId.IRON_ORE, GoodsId.BAUXITE],
    category: 'extraction',
    description: '西部综合矿业',
    initialBuildings: [
      { typeId: BuildingId.IRON_MINE, outputModeId: 0, count: 7 },
      { typeId: BuildingId.ALUMINUM_MINE, outputModeId: 0, count: 6 },
    ],
  },
  {
    id: 66,
    name: '中金黄金',
    personality: 'premium',
    initialCash: 170000000,
    focusGoods: [GoodsId.GOLD_ORE],
    category: 'extraction',
    description: '黄金开采龙头',
    initialBuildings: [
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_MINING, count: 4 },
    ],
  },
  {
    id: 67,
    name: '山东黄金',
    personality: 'specialist',
    initialCash: 160000000,
    focusGoods: [GoodsId.GOLD_ORE, GoodsId.DIAMOND_ORE],
    category: 'extraction',
    description: '黄金与钻石矿开采',
    initialBuildings: [
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_MINING, count: 3 },
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_DIAMOND, count: 2 },
    ],
  },

  // ==================== K. 翻倍扩展 - 农业扩充 (3家, ID 68-70) ====================
  {
    id: 68,
    name: '北大荒',
    personality: 'cost_leader',
    initialCash: 130000000,
    focusGoods: [GoodsId.GRAIN, GoodsId.COTTON],
    category: 'agriculture',
    description: '东北大型粮棉基地',
    initialBuildings: [
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_GRAIN, count: 30 },
      { typeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_COTTON, count: 12 },
    ],
  },
  {
    id: 69,
    name: '温氏股份',
    personality: 'specialist',
    initialCash: 120000000,
    focusGoods: [GoodsId.LIVESTOCK],
    category: 'agriculture',
    description: '生猪养殖龙头',
    initialBuildings: [
      { typeId: BuildingId.LIVESTOCK_FARM, outputModeId: 0, count: 14 },
    ],
  },
  {
    id: 70,
    name: '云南白药种植',
    personality: 'specialist',
    initialCash: 95000000,
    focusGoods: [GoodsId.HERBS],
    category: 'agriculture',
    description: '中草药种植专营',
    initialBuildings: [
      { typeId: BuildingId.HERB_FARM, outputModeId: 0, count: 8 },
    ],
  },

  // ==================== L. 翻倍扩展 - 加工扩充 (10家, ID 71-80) ====================
  {
    id: 71,
    name: '鞍钢集团',
    personality: 'conservative',
    initialCash: 320000000,
    focusGoods: [GoodsId.STEEL],
    category: 'processing',
    description: '北方老牌钢铁企业',
    initialBuildings: [
      { typeId: BuildingId.STEEL_MILL, outputModeId: 0, count: 9 },
    ],
  },
  {
    id: 72,
    name: '武钢集团',
    personality: 'cost_leader',
    initialCash: 280000000,
    focusGoods: [GoodsId.STEEL],
    category: 'processing',
    description: '华中钢铁产能基地',
    initialBuildings: [
      { typeId: BuildingId.STEEL_MILL, outputModeId: 0, count: 8 },
    ],
  },
  {
    id: 73,
    name: '中海石化',
    personality: 'aggressive',
    initialCash: 350000000,
    focusGoods: [GoodsId.FUEL, GoodsId.PLASTIC],
    category: 'processing',
    description: '炼化与塑料原料',
    initialBuildings: [
      { typeId: BuildingId.REFINERY, outputModeId: 0, count: 6 },
    ],
  },
  {
    id: 74,
    name: '万华化学',
    personality: 'innovator',
    initialCash: 240000000,
    focusGoods: [GoodsId.CHEMICALS, GoodsId.RUBBER],
    category: 'processing',
    description: '高端聚氨酯化工',
    initialBuildings: [
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_CHEMICALS, count: 5 },
      { typeId: BuildingId.CHEMICAL_PLANT, outputModeId: OutputModeId.CHEMICAL_RUBBER, count: 3 },
    ],
  },
  {
    id: 75,
    name: '信义玻璃',
    personality: 'specialist',
    initialCash: 130000000,
    focusGoods: [GoodsId.GLASS],
    category: 'processing',
    description: '玻璃制造专家',
    initialBuildings: [
      { typeId: BuildingId.GLASS_FACTORY, outputModeId: 0, count: 9 },
    ],
  },
  {
    id: 76,
    name: '金隅水泥',
    personality: 'cost_leader',
    initialCash: 110000000,
    focusGoods: [GoodsId.CEMENT],
    category: 'processing',
    description: '京津水泥供应商',
    initialBuildings: [
      { typeId: BuildingId.CEMENT_FACTORY, outputModeId: 0, count: 10 },
    ],
  },
  {
    id: 77,
    name: '玖龙纸业',
    personality: 'aggressive',
    initialCash: 140000000,
    focusGoods: [GoodsId.PAPER, GoodsId.PACKAGING],
    category: 'processing',
    description: '包装用纸与包装材料',
    initialBuildings: [
      { typeId: BuildingId.PAPER_MILL, outputModeId: 0, count: 5 },
      { typeId: BuildingId.BUILDING_MATERIALS_FACTORY, outputModeId: OutputModeId.BUILDING_PACKAGING, count: 3 },
    ],
  },
  {
    id: 78,
    name: '山东如意',
    personality: 'diversified',
    initialCash: 95000000,
    focusGoods: [GoodsId.TEXTILES, GoodsId.SILK],
    category: 'processing',
    description: '纺织与丝绸双轨',
    initialBuildings: [
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_TEXTILES, count: 5 },
      { typeId: BuildingId.TEXTILE_MILL, outputModeId: OutputModeId.TEXTILE_SILK, count: 2 },
    ],
  },
  {
    id: 79,
    name: '双汇集团',
    personality: 'cost_leader',
    initialCash: 120000000,
    focusGoods: [GoodsId.MEAT, GoodsId.FROZEN_FOOD],
    category: 'processing',
    description: '肉类加工龙头',
    initialBuildings: [
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_PROCESSING, count: 6 },
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_FROZEN, count: 4 },
    ],
  },
  {
    id: 80,
    name: '雨润食品',
    personality: 'opportunist',
    initialCash: 90000000,
    focusGoods: [GoodsId.PROCESSED_FOOD, GoodsId.MEAT],
    category: 'processing',
    description: '冷鲜肉与食品加工',
    initialBuildings: [
      { typeId: BuildingId.MEAT_PROCESSING, outputModeId: OutputModeId.MEAT_PROCESSING, count: 4 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_PROCESSING, count: 4 },
    ],
  },

  // ==================== M. 翻倍扩展 - 制造扩充 (12家, ID 81-92) ====================
  {
    id: 81,
    name: 'OPPO',
    personality: 'innovator',
    initialCash: 320000000,
    focusGoods: [GoodsId.SMARTPHONE],
    category: 'manufacturing',
    description: '中端智能手机制造',
    initialBuildings: [
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_SMARTPHONE, count: 7 },
    ],
  },
  {
    id: 82,
    name: 'vivo',
    personality: 'innovator',
    initialCash: 300000000,
    focusGoods: [GoodsId.SMARTPHONE],
    category: 'manufacturing',
    description: '影像优势手机品牌',
    initialBuildings: [
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_SMARTPHONE, count: 6 },
    ],
  },
  {
    id: 83,
    name: '联想集团',
    personality: 'diversified',
    initialCash: 360000000,
    focusGoods: [GoodsId.COMPUTER, GoodsId.SMARTPHONE],
    category: 'manufacturing',
    description: 'PC 与移动设备制造',
    initialBuildings: [
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_COMPUTER, count: 6 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_SMARTPHONE, count: 3 },
    ],
  },
  {
    id: 84,
    name: 'TCL科技',
    personality: 'cost_leader',
    initialCash: 250000000,
    focusGoods: [GoodsId.APPLIANCES, GoodsId.SCREEN],
    category: 'manufacturing',
    description: '彩电与面板制造',
    initialBuildings: [
      { typeId: BuildingId.APPLIANCE_FACTORY, outputModeId: 0, count: 5 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_SCREEN, count: 4 },
    ],
  },
  {
    id: 85,
    name: '美的集团',
    personality: 'aggressive',
    initialCash: 380000000,
    focusGoods: [GoodsId.APPLIANCES],
    category: 'manufacturing',
    description: '白色家电巨头',
    initialBuildings: [
      { typeId: BuildingId.APPLIANCE_FACTORY, outputModeId: 0, count: 9 },
    ],
  },
  {
    id: 86,
    name: '格力电器',
    personality: 'premium',
    initialCash: 350000000,
    focusGoods: [GoodsId.APPLIANCES],
    category: 'manufacturing',
    description: '空调专精制造',
    initialBuildings: [
      { typeId: BuildingId.APPLIANCE_FACTORY, outputModeId: 0, count: 8 },
    ],
  },
  {
    id: 87,
    name: '长城汽车',
    personality: 'specialist',
    initialCash: 280000000,
    focusGoods: [GoodsId.CAR],
    category: 'manufacturing',
    description: 'SUV 与皮卡专营',
    initialBuildings: [
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_FUEL, count: 6 },
    ],
  },
  {
    id: 88,
    name: '广汽集团',
    personality: 'diversified',
    initialCash: 340000000,
    focusGoods: [GoodsId.CAR, GoodsId.ELECTRIC_CAR],
    category: 'manufacturing',
    description: '燃油与新能源双线',
    initialBuildings: [
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_FUEL, count: 4 },
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_ELECTRIC, count: 3 },
    ],
  },
  {
    id: 89,
    name: '一汽集团',
    personality: 'conservative',
    initialCash: 320000000,
    focusGoods: [GoodsId.CAR, GoodsId.LUXURY_CAR],
    category: 'manufacturing',
    description: '老牌国有车企',
    initialBuildings: [
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_FUEL, count: 5 },
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_LUXURY, count: 2 },
    ],
  },
  {
    id: 90,
    name: '三一重工',
    personality: 'specialist',
    initialCash: 220000000,
    focusGoods: [GoodsId.MECHANICAL_PARTS, GoodsId.INDUSTRIAL_ROBOT],
    category: 'manufacturing',
    description: '工程机械制造',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 6 },
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_ROBOT, count: 2 },
    ],
  },
  {
    id: 91,
    name: '沈飞集团',
    personality: 'specialist',
    initialCash: 260000000,
    focusGoods: [GoodsId.AIRCRAFT_PARTS],
    category: 'manufacturing',
    description: '航空部件供应',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_AIRCRAFT, count: 4 },
    ],
  },
  {
    id: 92,
    name: '顾家家居',
    personality: 'premium',
    initialCash: 110000000,
    focusGoods: [GoodsId.FURNITURE],
    category: 'manufacturing',
    description: '中高端家居制造',
    initialBuildings: [
      { typeId: BuildingId.FURNITURE_FACTORY, outputModeId: OutputModeId.FURNITURE_PRODUCTION, count: 7 },
    ],
  },

  // ==================== N. 翻倍扩展 - 医药扩充 (3家, ID 93-95) ====================
  {
    id: 93,
    name: '国药控股',
    personality: 'diversified',
    initialCash: 280000000,
    focusGoods: [GoodsId.GENERIC_DRUG, GoodsId.OTC_DRUG, GoodsId.MEDICAL_SUPPLIES],
    category: 'pharma',
    description: '医药全品类供应',
    initialBuildings: [
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_BASE, count: 3 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_GENERIC, count: 4 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_OTC, count: 3 },
    ],
  },
  {
    id: 94,
    name: '哈药集团',
    personality: 'cost_leader',
    initialCash: 160000000,
    focusGoods: [GoodsId.ANTIBIOTICS, GoodsId.GENERIC_DRUG],
    category: 'pharma',
    description: '抗生素与仿制药',
    initialBuildings: [
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_ANTIBIOTIC, count: 4 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_GENERIC, count: 3 },
    ],
  },
  {
    id: 95,
    name: '联影医疗',
    personality: 'innovator',
    initialCash: 240000000,
    focusGoods: [GoodsId.MEDICAL_DEVICE],
    category: 'pharma',
    description: '高端影像设备',
    initialBuildings: [
      { typeId: BuildingId.MEDICAL_DEVICE_FACTORY, outputModeId: OutputModeId.MEDICAL_DEVICE, count: 4 },
    ],
  },

  // ==================== O. 翻倍扩展 - 奢侈品扩充 (2家, ID 96-97) ====================
  {
    id: 96,
    name: '老凤祥',
    personality: 'premium',
    initialCash: 180000000,
    focusGoods: [GoodsId.JEWELRY, GoodsId.GOLD],
    category: 'luxury',
    description: '老字号金饰品牌',
    initialBuildings: [
      { typeId: BuildingId.GOLD_REFINERY, outputModeId: OutputModeId.GOLD_REFINING, count: 2 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_JEWELRY, count: 6 },
    ],
  },
  {
    id: 97,
    name: '海澜之家',
    personality: 'cost_leader',
    initialCash: 100000000,
    focusGoods: [GoodsId.CLOTHING, GoodsId.DESIGNER_CLOTHING],
    category: 'luxury',
    description: '男装连锁制造',
    initialBuildings: [
      { typeId: BuildingId.FURNITURE_FACTORY, outputModeId: OutputModeId.FURNITURE_CLOTHING, count: 6 },
      { typeId: BuildingId.LUXURY_WORKSHOP, outputModeId: OutputModeId.LUXURY_DESIGNER, count: 2 },
    ],
  },

  // ==================== P. 翻倍扩展 - 能源扩充 (2家, ID 98-99) ====================
  {
    id: 98,
    name: '大唐发电',
    personality: 'conservative',
    initialCash: 380000000,
    focusGoods: [GoodsId.ELECTRICITY],
    category: 'energy',
    description: '燃煤发电主力',
    initialBuildings: [
      { typeId: BuildingId.POWER_PLANT, outputModeId: OutputModeId.POWER_COAL, count: 5 },
    ],
  },
  {
    id: 99,
    name: '隆基绿能',
    personality: 'pioneer',
    initialCash: 260000000,
    focusGoods: [GoodsId.SOLAR_PANEL, GoodsId.ELECTRICITY],
    category: 'energy',
    description: '光伏组件与发电',
    initialBuildings: [
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 5 },
      { typeId: BuildingId.POWER_PLANT, outputModeId: OutputModeId.POWER_SOLAR, count: 2 },
    ],
  },

  // ==================== Q. 翻倍扩展 - 第三供应商 (20家, ID 100-119) ====================
  {
    id: 100,
    name: '云南铜业',
    personality: 'specialist',
    initialCash: 130000000,
    focusGoods: [GoodsId.COPPER],
    category: 'processing',
    description: '铜冶炼第三供应商',
    initialBuildings: [
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_COPPER, count: 5 },
    ],
  },
  {
    id: 101,
    name: '神火铝业',
    personality: 'cost_leader',
    initialCash: 120000000,
    focusGoods: [GoodsId.ALUMINUM],
    category: 'processing',
    description: '电解铝第三供应商',
    initialBuildings: [
      { typeId: BuildingId.NON_FERROUS_SMELTER, outputModeId: OutputModeId.SMELTER_ALUMINUM, count: 5 },
    ],
  },
  {
    id: 102,
    name: '国机重装',
    personality: 'specialist',
    initialCash: 200000000,
    focusGoods: [GoodsId.MECHANICAL_PARTS],
    category: 'manufacturing',
    description: '机械装备第三供应商',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 5 },
    ],
  },
  {
    id: 103,
    name: '海康威视',
    personality: 'innovator',
    initialCash: 280000000,
    focusGoods: [GoodsId.ELECTRONICS, GoodsId.DRONE],
    category: 'manufacturing',
    description: '安防与无人机制造',
    initialBuildings: [
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_PRODUCTION, count: 4 },
      { typeId: BuildingId.ELECTRONICS_FACTORY, outputModeId: OutputModeId.ELECTRONICS_DRONE, count: 3 },
    ],
  },
  {
    id: 104,
    name: '大族激光',
    personality: 'specialist',
    initialCash: 170000000,
    focusGoods: [GoodsId.MOTOR, GoodsId.MECHANICAL_PARTS],
    category: 'manufacturing',
    description: '激光设备与服装面料',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_FABRIC, count: 5 },
    ],
  },
  {
    id: 105,
    name: '京东方',
    personality: 'aggressive',
    initialCash: 300000000,
    focusGoods: [GoodsId.SCREEN],
    category: 'manufacturing',
    description: '面板第二供应商',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_SCREEN, count: 7 },
    ],
  },
  {
    id: 106,
    name: '国轩高科',
    personality: 'pioneer',
    initialCash: 220000000,
    focusGoods: [GoodsId.BATTERY, GoodsId.ENERGY_STORAGE],
    category: 'energy',
    description: '动力电池第二阵营',
    initialBuildings: [
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_PRODUCTION, count: 4 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_STORAGE, count: 2 },
    ],
  },
  {
    id: 107,
    name: '协鑫能科',
    personality: 'opportunist',
    initialCash: 180000000,
    focusGoods: [GoodsId.SOLAR_PANEL, GoodsId.SOLAR_SYSTEM],
    category: 'energy',
    description: '光伏与系统集成',
    initialBuildings: [
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_SOLAR_PANEL, count: 3 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_SOLAR_SYSTEM, count: 3 },
    ],
  },
  {
    id: 108,
    name: '金风科技',
    personality: 'specialist',
    initialCash: 160000000,
    focusGoods: [GoodsId.WIND_BLADE],
    category: 'energy',
    description: '风电叶片专营',
    initialBuildings: [
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_WIND_BLADE, count: 5 },
    ],
  },
  {
    id: 109,
    name: '远景能源',
    personality: 'innovator',
    initialCash: 200000000,
    focusGoods: [GoodsId.WIND_BLADE, GoodsId.BATTERY],
    category: 'energy',
    description: '风储一体化',
    initialBuildings: [
      { typeId: BuildingId.NEW_ENERGY_FACTORY, outputModeId: OutputModeId.ENERGY_WIND_BLADE, count: 3 },
      { typeId: BuildingId.BATTERY_FACTORY, outputModeId: OutputModeId.BATTERY_PRODUCTION, count: 3 },
    ],
  },
  {
    id: 110,
    name: '益海嘉里',
    personality: 'cost_leader',
    initialCash: 140000000,
    focusGoods: [GoodsId.PROCESSED_FOOD, GoodsId.FOOD, GoodsId.SNACKS],
    category: 'processing',
    description: '粮油食品加工',
    initialBuildings: [
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_PROCESSING, count: 3 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_FINAL, count: 3 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_SNACKS, count: 3 },
    ],
  },
  {
    id: 111,
    name: '伊利股份',
    personality: 'aggressive',
    initialCash: 200000000,
    focusGoods: [GoodsId.DAIRY, GoodsId.BEVERAGES],
    category: 'processing',
    description: '乳制品龙头',
    initialBuildings: [
      { typeId: BuildingId.DAIRY_FACTORY, outputModeId: 0, count: 1 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_BEVERAGE, count: 3 },
    ],
  },
  {
    id: 112,
    name: '上海家化',
    personality: 'premium',
    initialCash: 90000000,
    focusGoods: [GoodsId.PROCESSED_FOOD, GoodsId.OTC_DRUG],
    category: 'pharma',
    description: '日化与保健品',
    initialBuildings: [
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_OTC, count: 3 },
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_ORGANIC, count: 2 },
    ],
  },
  {
    id: 113,
    name: '太极集团',
    personality: 'conservative',
    initialCash: 110000000,
    focusGoods: [GoodsId.PHARMA_BASE, GoodsId.GENERIC_DRUG],
    category: 'pharma',
    description: '中成药与原料药',
    initialBuildings: [
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_BASE, count: 4 },
      { typeId: BuildingId.PHARMA_FACTORY, outputModeId: OutputModeId.PHARMA_GENERIC, count: 2 },
    ],
  },
  {
    id: 114,
    name: '振华重工',
    personality: 'specialist',
    initialCash: 230000000,
    focusGoods: [GoodsId.MECHANICAL_PARTS, GoodsId.AIRCRAFT_PARTS],
    category: 'manufacturing',
    description: '港口机械与重工',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_MECHANICAL, count: 4 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_AIRCRAFT, count: 2 },
    ],
  },
  {
    id: 115,
    name: '福田汽车',
    personality: 'cost_leader',
    initialCash: 180000000,
    focusGoods: [GoodsId.CAR, GoodsId.CAR_PARTS],
    category: 'manufacturing',
    description: '商用车制造',
    initialBuildings: [
      { typeId: BuildingId.CAR_FACTORY, outputModeId: OutputModeId.CAR_FUEL, count: 3 },
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_CAR, count: 3 },
    ],
  },
  {
    id: 116,
    name: '红豆服饰',
    personality: 'opportunist',
    initialCash: 70000000,
    focusGoods: [GoodsId.CLOTHING, GoodsId.CLOTHING_FABRIC],
    category: 'processing',
    description: '大众服装连锁',
    initialBuildings: [
      { typeId: BuildingId.PARTS_FACTORY, outputModeId: OutputModeId.PARTS_FABRIC, count: 3 },
      { typeId: BuildingId.FURNITURE_FACTORY, outputModeId: OutputModeId.FURNITURE_CLOTHING, count: 5 },
    ],
  },
  {
    id: 117,
    name: '光明乳业',
    personality: 'specialist',
    initialCash: 130000000,
    focusGoods: [GoodsId.DAIRY],
    category: 'processing',
    description: '华东乳业第二品牌',
    initialBuildings: [
      { typeId: BuildingId.DAIRY_FACTORY, outputModeId: 0, count: 1 },
    ],
  },
  {
    id: 118,
    name: '五粮液',
    personality: 'premium',
    initialCash: 220000000,
    focusGoods: [GoodsId.BEVERAGES],
    category: 'luxury',
    description: '高端白酒制造',
    initialBuildings: [
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_BEVERAGE, count: 5 },
    ],
  },
  {
    id: 119,
    name: '茅台集团',
    personality: 'premium',
    initialCash: 320000000,
    focusGoods: [GoodsId.BEVERAGES],
    category: 'luxury',
    description: '顶级白酒品牌',
    initialBuildings: [
      { typeId: BuildingId.FOOD_FACTORY, outputModeId: OutputModeId.FOOD_BEVERAGE, count: 6 },
    ],
  },
];

export const AI_COMPANIES: AICompanyConfig[] = RAW_AI_COMPANIES.map(normalizeAICompanyConfig);

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
