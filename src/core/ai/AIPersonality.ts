/**
 * AI人格差异系统
 * 为每个AI公司定义独特的行为特征和决策偏好
 *
 * 【重要更新】v2.0 - 产业偏好权重系统
 * - 新增 IndustryPreferences 接口定义产业偏好权重
 * - AI不再完全排除某些产业，而是通过权重调整优先级
 * - 所有AI都能建造所有类型建筑，但有明显的偏好趋向
 */

import { GameWorld } from '@/core/world/GameWorld';
import { AIDecision, CompanyAssessment } from './AIDecisionEngine';
import { ALL_BUILDINGS } from '@/data/buildings';

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
  | 'premium';        // 高端型：追求高质量高溢价

/**
 * 产业类别偏好权重
 *
 * 权重范围：0.2 - 2.0
 * - 0.2-0.5: 低偏好（优先级大幅降低，但不排除）
 * - 0.5-0.8: 中低偏好
 * - 0.8-1.2: 中等偏好（正常）
 * - 1.2-1.5: 中高偏好
 * - 1.5-2.0: 高偏好（优先级大幅提高）
 */
export interface IndustryPreferences {
  // 建筑类别偏好
  extraction: number;      // 采掘业（矿场、油田、农场等）
  processing: number;      // 加工业（钢铁厂、炼油厂等）
  manufacturing: number;   // 制造业（电子厂、汽车厂等）
  service: number;         // 服务业（物流、仓储等）
  retail: number;          // 零售业（商店、超市等）
  
  // 细分产业偏好
  agriculture: number;     // 农业产业链
  pharma: number;          // 医药产业链
  luxury: number;          // 奢侈品产业链
  tech: number;            // 高科技产业链
  basic: number;           // 基础材料产业链
}

/**
 * 默认产业偏好（均衡）
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
  
  // 风险偏好（0-1，越高越激进）
  riskTolerance: number;
  
  // 扩张倾向（0-1，越高越倾向扩张）
  expansionBias: number;
  
  // 价格策略（-1到1，负数倾向低价，正数倾向高价）
  pricingBias: number;
  
  // 库存偏好（目标库存周转天数）
  targetInventoryDays: number;
  
  // 现金储备率（目标现金占资产比例）
  targetCashRatio: number;
  
  // 市场关注度（0-1，越高越关注市场变化）
  marketAwareness: number;
  
  // 竞争敏感度（0-1，越高越关注竞争对手）
  competitiveSensitivity: number;
  
  // 长期思维（0-1，越高越注重长期利益）
  longTermFocus: number;
  
  // 专业化程度（0-1，越高越专注特定商品）
  specializationDegree: number;
  
  // 创新投资比例（收入中用于研发的比例）
  innovationInvestment: number;
  
  // 决策频率调整（基础决策频率的乘数）
  decisionFrequency: number;
  
  // 【新增】产业偏好权重
  industryPreferences: IndustryPreferences;
  
  // 偏好的商品类别（保留用于向后兼容）
  preferredCategories: string[];
  
  // 避免的商品类别（保留用于向后兼容，但不再用于完全过滤）
  avoidedCategories: string[];
}

/**
 * 预定义AI人格
 *
 * 【v2.0更新】每种人格都定义了产业偏好权重
 * - 所有AI都能建造所有类型建筑
 * - 但通过权重系统体现明显的偏好趋向
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
      extraction: 0.6,      // 低偏好但不排除
      processing: 0.8,      // 中等偏好
      manufacturing: 1.5,   // 高偏好
      service: 0.5,         // 低偏好
      retail: 0.4,          // 低偏好
      agriculture: 0.5,
      pharma: 0.7,
      luxury: 0.8,
      tech: 1.8,            // 极高偏好
      basic: 0.4,
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
      extraction: 1.5,      // 高偏好
      processing: 1.2,      // 中高偏好
      manufacturing: 0.6,   // 低偏好但不排除
      service: 0.8,
      retail: 0.5,
      agriculture: 1.3,
      pharma: 0.7,
      luxury: 0.3,          // 很低偏好但不排除
      tech: 0.4,
      basic: 1.6,           // 极高偏好
    },
    preferredCategories: ['basic', 'raw'],
    avoidedCategories: [],  // 不再完全排除任何类别
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
      extraction: 1.0,      // 均衡
      processing: 1.0,
      manufacturing: 1.0,
      service: 1.2,         // 略高（贸易服务）
      retail: 0.8,
      agriculture: 0.8,
      pharma: 1.0,
      luxury: 1.0,
      tech: 1.0,
      basic: 0.8,
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
      extraction: 0.7,      // 低偏好但不排除
      processing: 1.3,      // 中高偏好
      manufacturing: 1.4,   // 高偏好
      service: 0.6,
      retail: 0.4,
      agriculture: 0.6,
      pharma: 1.2,
      luxury: 0.8,
      tech: 1.3,
      basic: 0.6,
    },
    preferredCategories: ['intermediate'],
    avoidedCategories: [],  // 不再完全排除任何类别
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
      extraction: 1.0,      // 完全均衡
      processing: 1.0,
      manufacturing: 1.0,
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
      extraction: 0.5,      // 低偏好但不排除
      processing: 0.8,
      manufacturing: 1.3,   // 高偏好
      service: 0.7,
      retail: 0.4,
      agriculture: 0.4,
      pharma: 1.4,          // 高偏好（医药研发）
      luxury: 0.6,
      tech: 2.0,            // 极高偏好
      basic: 0.3,
    },
    preferredCategories: ['final', 'intermediate'],
    avoidedCategories: [],  // 不再完全排除任何类别
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
      extraction: 1.3,      // 中高偏好
      processing: 1.4,      // 高偏好
      manufacturing: 1.0,
      service: 0.8,
      retail: 0.6,
      agriculture: 1.2,
      pharma: 0.6,
      luxury: 0.2,          // 很低偏好但不排除
      tech: 0.5,
      basic: 1.5,           // 高偏好
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
      extraction: 0.4,      // 低偏好但不排除
      processing: 0.6,
      manufacturing: 1.2,   // 中高偏好
      service: 0.8,
      retail: 1.0,          // 中等（高端零售）
      agriculture: 0.5,
      pharma: 0.8,
      luxury: 2.0,          // 极高偏好
      tech: 1.0,
      basic: 0.3,           // 很低偏好但不排除
    },
    preferredCategories: ['final'],
    avoidedCategories: [],  // 不再完全排除任何类别
  },
};

/**
 * AI公司配置
 */
export interface AICompanyConfig {
  id: number;
  name: string;
  personality: PersonalityType;
  initialCash: number;
  focusGoods: number[];       // 专注的商品ID（用于描述主营业务）
  category: 'extraction' | 'processing' | 'manufacturing' | 'agriculture' | 'pharma' | 'luxury' | 'energy' | 'retail' | 'diversified';
  description?: string;       // 公司业务描述
  initialBuildings: Array<{   // 初始建筑配置
    typeId: number;
    recipeId: number;
    count: number;
  }>;
}

/**
 * 预定义AI公司配置
 *
 * 【v3.0更新】统一公司配置
 * - 包含所有生产类公司（32家）
 * - 包含所有零售类公司（10家）
 * - 每家公司都有明确的产业分类和主营业务描述
 */
export const AI_COMPANIES: AICompanyConfig[] = [
  // ==================== A. 原材料采掘公司 (7家) ====================
  {
    id: 1,
    name: '中钢矿业',
    personality: 'conservative',
    initialCash: 80000000,
    focusGoods: [0],  // 铁矿石
    category: 'extraction',
    description: '铁矿开采',
    initialBuildings: [
      { typeId: 0, recipeId: 0, count: 15 },  // 铁矿×15
    ],
  },
  {
    id: 2,
    name: '神华煤炭',
    personality: 'conservative',
    initialCash: 150000000,
    focusGoods: [3],  // 煤炭
    category: 'extraction',
    description: '煤炭开采',
    initialBuildings: [
      { typeId: 2, recipeId: 2, count: 25 },  // 煤矿×25
    ],
  },
  {
    id: 3,
    name: '国投煤业',
    personality: 'conservative',
    initialCash: 70000000,
    focusGoods: [3],  // 煤炭
    category: 'extraction',
    description: '煤炭开采',
    initialBuildings: [
      { typeId: 2, recipeId: 2, count: 12 },  // 煤矿×12
    ],
  },
  {
    id: 4,
    name: '五矿铜业',
    personality: 'conservative',
    initialCash: 80000000,
    focusGoods: [1],  // 铜矿石
    category: 'extraction',
    description: '铜矿开采',
    initialBuildings: [
      { typeId: 1, recipeId: 1, count: 14 },  // 铜矿×14
    ],
  },
  {
    id: 5,
    name: '中石油',
    personality: 'conservative',
    initialCash: 250000000,
    focusGoods: [4, 5],  // 原油、天然气
    category: 'extraction',
    description: '石油天然气开采',
    initialBuildings: [
      { typeId: 3, recipeId: 3, count: 12 },  // 油田×12
      { typeId: 4, recipeId: 4, count: 10 },  // 气田×10
    ],
  },
  {
    id: 6,
    name: '林业集团',
    personality: 'conservative',
    initialCash: 60000000,
    focusGoods: [6],  // 木材
    category: 'extraction',
    description: '木材采伐',
    initialBuildings: [
      { typeId: 5, recipeId: 5, count: 14 },  // 伐木场×14
    ],
  },
  {
    id: 7,
    name: '硅海矿业',
    personality: 'conservative',
    initialCash: 90000000,
    focusGoods: [9, 10],  // 硅石、稀土
    category: 'extraction',
    description: '硅石稀土开采',
    initialBuildings: [
      { typeId: 7, recipeId: 8, count: 10 },   // 硅石矿×10
      { typeId: 7, recipeId: 9, count: 4 },    // 稀土矿×4
      { typeId: 7, recipeId: 102, count: 2 },  // 铝土矿×2
    ],
  },
  
  // ==================== B. 农业公司 (2家) ====================
  {
    id: 8,
    name: '中粮集团',
    personality: 'diversified',
    initialCash: 100000000,
    focusGoods: [7, 8, 58, 59],  // 棉花、粮食、蔬菜、水果
    category: 'agriculture',
    description: '粮食蔬果种植',
    initialBuildings: [
      { typeId: 6, recipeId: 6, count: 8 },   // 粮食种植×8
      { typeId: 6, recipeId: 7, count: 4 },   // 棉花种植×4
      { typeId: 25, recipeId: 35, count: 3 }, // 蔬菜农场×3
      { typeId: 25, recipeId: 36, count: 3 }, // 水果农场×3
    ],
  },
  {
    id: 9,
    name: '新希望牧业',
    personality: 'specialist',
    initialCash: 80000000,
    focusGoods: [60, 61, 62],  // 牲畜、家禽、水产
    category: 'agriculture',
    description: '畜牧水产养殖',
    initialBuildings: [
      { typeId: 26, recipeId: 37, count: 4 }, // 牲畜养殖×4
      { typeId: 26, recipeId: 38, count: 5 }, // 家禽养殖×5
      { typeId: 27, recipeId: 39, count: 6 }, // 水产养殖×6
    ],
  },
  
  // ==================== C. 基础加工公司 (8家) ====================
  {
    id: 10,
    name: '宝钢集团',
    personality: 'cost_leader',
    initialCash: 200000000,
    focusGoods: [14],  // 钢材
    category: 'processing',
    description: '钢铁冶炼（垂直整合）',
    initialBuildings: [
      { typeId: 0, recipeId: 0, count: 8 },   // 自有铁矿×8
      { typeId: 2, recipeId: 2, count: 4 },   // 自有煤矿×4
      { typeId: 8, recipeId: 10, count: 8 },  // 高炉炼钢×8
      { typeId: 8, recipeId: 11, count: 4 },  // 电弧炉炼钢×4
    ],
  },
  {
    id: 11,
    name: '江铜冶炼',
    personality: 'specialist',
    initialCash: 100000000,
    focusGoods: [15],  // 铜材
    category: 'processing',
    description: '铜材冶炼（垂直整合）',
    initialBuildings: [
      { typeId: 1, recipeId: 1, count: 6 },   // 自有铜矿×6
      { typeId: 8, recipeId: 78, count: 10 }, // 铜冶炼×10
    ],
  },
  {
    id: 12,
    name: '中石化',
    personality: 'cost_leader',
    initialCash: 250000000,
    focusGoods: [25, 12],  // 燃油、化工原料
    category: 'processing',
    description: '石油炼化（垂直整合）',
    initialBuildings: [
      { typeId: 3, recipeId: 3, count: 6 },   // 自有油田×6
      { typeId: 9, recipeId: 12, count: 14 }, // 石油精炼×14
    ],
  },
  {
    id: 13,
    name: '塑料化工',
    personality: 'specialist',
    initialCash: 120000000,
    focusGoods: [18, 20],  // 塑料、化学品
    category: 'processing',
    description: '塑料化工生产',
    initialBuildings: [
      { typeId: 10, recipeId: 13, count: 8 },  // 塑料生产×8
      { typeId: 10, recipeId: 14, count: 6 },  // 化学品生产×6
      { typeId: 10, recipeId: 68, count: 4 },  // 橡胶制品×4
    ],
  },
  {
    id: 14,
    name: '福耀玻璃',
    personality: 'specialist',
    initialCash: 80000000,
    focusGoods: [17],  // 玻璃
    category: 'processing',
    description: '玻璃制造（垂直整合）',
    initialBuildings: [
      { typeId: 7, recipeId: 8, count: 4 },   // 自有硅矿×4
      { typeId: 11, recipeId: 15, count: 8 }, // 玻璃生产×8
    ],
  },
  {
    id: 15,
    name: '魏桥纺织',
    personality: 'cost_leader',
    initialCash: 100000000,
    focusGoods: [23],  // 纺织品
    category: 'processing',
    description: '纺织加工（垂直整合）',
    initialBuildings: [
      { typeId: 6, recipeId: 7, count: 4 },   // 自有棉花×4
      { typeId: 12, recipeId: 16, count: 6 }, // 纺织品生产×6
      { typeId: 12, recipeId: 99, count: 2 }, // 丝绸生产×2
      { typeId: 12, recipeId: 69, count: 4 }, // 服装生产×4
    ],
  },
  {
    id: 16,
    name: '海螺水泥',
    personality: 'cost_leader',
    initialCash: 120000000,
    focusGoods: [21, 36, 47],  // 水泥、建筑材料、建材成品
    category: 'processing',
    description: '水泥及建材生产（垂直整合）',
    initialBuildings: [
      { typeId: 7, recipeId: 8, count: 4 },   // 自有硅矿×4
      { typeId: 2, recipeId: 2, count: 2 },   // 自有煤矿×2
      { typeId: 14, recipeId: 19, count: 6 }, // 水泥生产×6
      { typeId: 14, recipeId: 71, count: 4 }, // 建筑材料×4
      { typeId: 14, recipeId: 72, count: 2 }, // 建材成品×2
    ],
  },
  {
    id: 17,
    name: '中铝集团',
    personality: 'specialist',
    initialCash: 100000000,
    focusGoods: [2, 16],  // 铝土矿、铝材
    category: 'processing',
    description: '铝材冶炼（垂直整合）',
    initialBuildings: [
      { typeId: 7, recipeId: 102, count: 6 }, // 铝土矿开采×6
      { typeId: 15, recipeId: 20, count: 9 }, // 铝冶炼×9
    ],
  },
  
  // ==================== D. 食品加工公司 (3家) ====================
  {
    id: 18,
    name: '统一食品',
    personality: 'cost_leader',
    initialCash: 80000000,
    focusGoods: [44, 45],  // 食品、饮料
    category: 'processing',
    description: '食品饮料加工',
    initialBuildings: [
      { typeId: 13, recipeId: 17, count: 5 },  // 食品加工×5
      { typeId: 13, recipeId: 18, count: 4 },  // 饮料生产×4
      { typeId: 13, recipeId: 86, count: 3 },  // 零食生产×3
      { typeId: 13, recipeId: 103, count: 2 }, // 包装食品×2
    ],
  },
  {
    id: 19,
    name: '双汇食品',
    personality: 'specialist',
    initialCash: 90000000,
    focusGoods: [63, 64],  // 肉制品、乳制品
    category: 'processing',
    description: '肉类乳品加工（垂直整合）',
    initialBuildings: [
      { typeId: 26, recipeId: 37, count: 2 }, // 自有牲畜养殖×2
      { typeId: 26, recipeId: 38, count: 2 }, // 自有家禽养殖×2
      { typeId: 28, recipeId: 40, count: 5 }, // 肉类加工×5
      { typeId: 28, recipeId: 41, count: 3 }, // 乳制品生产×3
      { typeId: 13, recipeId: 85, count: 1 }, // 罐头生产×1
    ],
  },
  {
    id: 20,
    name: '冷冻零食',
    personality: 'opportunist',
    initialCash: 70000000,
    focusGoods: [65, 67, 69],  // 冷冻食品、零食、即食食品
    category: 'processing',
    description: '冷冻零食生产',
    initialBuildings: [
      { typeId: 13, recipeId: 42, count: 5 },  // 冷冻食品×5
      { typeId: 13, recipeId: 86, count: 4 },  // 零食生产×4
      { typeId: 13, recipeId: 88, count: 3 },  // 宠物食品×3
    ],
  },
  
  // ==================== E. 电子与制造公司 (8家) ====================
  {
    id: 21,
    name: '立讯精密',
    personality: 'specialist',
    initialCash: 150000000,
    focusGoods: [26],  // 电子元件
    category: 'manufacturing',
    description: '电子元件制造（垂直整合）',
    initialBuildings: [
      { typeId: 1, recipeId: 1, count: 4 },    // 自有铜矿×4
      { typeId: 8, recipeId: 78, count: 4 },   // 自有铜冶炼×4
      { typeId: 16, recipeId: 21, count: 12 }, // 电子元件生产×12
    ],
  },
  {
    id: 22,
    name: '中芯国际',
    personality: 'innovator',
    initialCash: 180000000,
    focusGoods: [27],  // 芯片
    category: 'manufacturing',
    description: '半导体芯片制造（垂直整合）',
    initialBuildings: [
      { typeId: 7, recipeId: 8, count: 6 },   // 自有硅矿×6
      { typeId: 7, recipeId: 9, count: 2 },   // 自有稀土矿×2
      { typeId: 17, recipeId: 24, count: 10 }, // 芯片生产×10
    ],
  },
  {
    id: 44,
    name: '富士康电子',
    personality: 'cost_leader',
    initialCash: 150000000,
    focusGoods: [26],  // 电子元件
    category: 'manufacturing',
    description: '电子元件代工制造（垂直整合）',
    initialBuildings: [
      { typeId: 1, recipeId: 1, count: 4 },    // 自有铜矿×4
      { typeId: 8, recipeId: 78, count: 4 },   // 自有铜冶炼×4
      { typeId: 16, recipeId: 21, count: 10 }, // 电子元件生产×10
    ],
  },
  {
    id: 45,
    name: '歌尔股份',
    personality: 'specialist',
    initialCash: 100000000,
    focusGoods: [26, 30],  // 电子元件、屏幕
    category: 'manufacturing',
    description: '精密电子元件制造（垂直整合）',
    initialBuildings: [
      { typeId: 1, recipeId: 1, count: 3 },    // 自有铜矿×3
      { typeId: 8, recipeId: 78, count: 3 },   // 自有铜冶炼×3
      { typeId: 16, recipeId: 21, count: 6 },  // 电子元件生产×6
      { typeId: 21, recipeId: 31, count: 3 },  // 屏幕生产×3
    ],
  },
  {
    id: 23,
    name: '华为终端',
    personality: 'innovator',
    initialCash: 150000000,
    focusGoods: [55, 56, 39, 52],  // 高端手机、电脑、消费电子、无人机
    category: 'manufacturing',
    description: '消费电子产品及无人机（垂直整合）',
    initialBuildings: [
      { typeId: 16, recipeId: 21, count: 3 },  // 自有电子元件×3
      { typeId: 16, recipeId: 83, count: 4 },  // 高端手机生产×4
      { typeId: 16, recipeId: 84, count: 4 },  // 平价手机生产×4
      { typeId: 16, recipeId: 23, count: 3 },  // 电脑组装×3
      { typeId: 16, recipeId: 82, count: 2 },  // 无人机生产×2
    ],
  },
  {
    id: 24,
    name: '海尔家电',
    personality: 'diversified',
    initialCash: 100000000,
    focusGoods: [40],  // 家电
    category: 'manufacturing',
    description: '家用电器制造（垂直整合）',
    initialBuildings: [
      { typeId: 16, recipeId: 21, count: 4 },  // 自有电子元件×4
      { typeId: 19, recipeId: 27, count: 10 }, // 家电生产×10
    ],
  },
  {
    id: 25,
    name: '宁德时代',
    personality: 'innovator',
    initialCash: 200000000,
    focusGoods: [28, 49, 50],  // 电池、光伏系统、储能系统
    category: 'manufacturing',
    description: '动力电池及储能系统制造（垂直整合）',
    initialBuildings: [
      { typeId: 33, recipeId: 107, count: 6 }, // 自有锂矿×6
      { typeId: 8, recipeId: 78, count: 3 },   // 自有铜冶炼×3
      { typeId: 20, recipeId: 28, count: 8 },  // 电池生产×8
      { typeId: 20, recipeId: 77, count: 3 },  // 光伏系统组装×3
      { typeId: 20, recipeId: 81, count: 2 },  // 储能系统生产×2
    ],
  },
  {
    id: 26,
    name: '零部件集团',
    personality: 'specialist',
    initialCash: 150000000,
    focusGoods: [31, 32, 29, 30, 46, 51],  // 机械部件、汽车零部件、电机、屏幕、家具、工业机器人
    category: 'manufacturing',
    description: '机械零部件及工业设备制造（垂直整合）',
    initialBuildings: [
      { typeId: 8, recipeId: 10, count: 3 },   // 自有炼钢×3
      { typeId: 21, recipeId: 79, count: 5 },  // 机械部件生产×5
      { typeId: 21, recipeId: 29, count: 4 },  // 汽车零部件×4
      { typeId: 21, recipeId: 30, count: 3 },  // 电机×3
      { typeId: 21, recipeId: 31, count: 2 },  // 屏幕×2
      { typeId: 21, recipeId: 70, count: 2 },  // 家具生产×2
      { typeId: 21, recipeId: 73, count: 1 },  // 工业机器人×1
    ],
  },
  
  // ==================== F. 汽车公司 (2家) ====================
  {
    id: 27,
    name: '比亚迪',
    personality: 'innovator',
    initialCash: 250000000,
    focusGoods: [42],  // 电动汽车
    category: 'manufacturing',
    description: '电动汽车制造（高度垂直整合）',
    initialBuildings: [
      { typeId: 33, recipeId: 107, count: 3 }, // 自有锂矿×3
      { typeId: 20, recipeId: 28, count: 4 },  // 自有电池生产×4
      { typeId: 8, recipeId: 10, count: 2 },   // 自有炼钢×2
      { typeId: 21, recipeId: 29, count: 4 },  // 自有汽车零部件×4
      { typeId: 16, recipeId: 21, count: 3 },  // 自有电子元件×3
      { typeId: 18, recipeId: 26, count: 8 },  // 电动汽车组装×8
    ],
  },
  {
    id: 28,
    name: '吉利汽车',
    personality: 'aggressive',
    initialCash: 200000000,
    focusGoods: [41, 95],  // 燃油汽车、豪华汽车
    category: 'manufacturing',
    description: '燃油汽车及豪华汽车制造（垂直整合）',
    initialBuildings: [
      { typeId: 8, recipeId: 10, count: 3 },   // 自有炼钢×3
      { typeId: 21, recipeId: 29, count: 5 },  // 自有汽车零部件×5
      { typeId: 16, recipeId: 21, count: 2 },  // 自有电子元件×2
      { typeId: 18, recipeId: 25, count: 6 },  // 燃油汽车组装×6
      { typeId: 18, recipeId: 26, count: 4 },  // 电动汽车组装×4
      { typeId: 18, recipeId: 101, count: 2 }, // 豪华汽车生产×2
    ],
  },
  
  // ==================== G. 医药公司 (3家) ====================
  {
    id: 29,
    name: '同仁堂',
    personality: 'specialist',
    initialCash: 100000000,
    focusGoods: [70, 74],  // 中草药、仿制药
    category: 'pharma',
    description: '中药制剂生产（垂直整合）',
    initialBuildings: [
      { typeId: 29, recipeId: 43, count: 6 },  // 药材种植×6
      { typeId: 30, recipeId: 44, count: 5 },  // 仿制药生产×5
      { typeId: 30, recipeId: 91, count: 3 },  // OTC药品×3
    ],
  },
  {
    id: 30,
    name: '恒瑞医药',
    personality: 'innovator',
    initialCash: 150000000,
    focusGoods: [71, 73, 75],  // 医药化工、专利药、疫苗
    category: 'pharma',
    description: '创新药物研发（垂直整合）',
    initialBuildings: [
      { typeId: 29, recipeId: 43, count: 4 },  // 自有药材种植×4
      { typeId: 10, recipeId: 89, count: 3 },  // 医药化工品×3
      { typeId: 30, recipeId: 45, count: 4 },  // 专利药生产×4
      { typeId: 30, recipeId: 46, count: 3 },  // 疫苗生产×3
      { typeId: 30, recipeId: 90, count: 2 },  // 抗生素生产×2
    ],
  },
  {
    id: 31,
    name: '迈瑞医疗',
    personality: 'innovator',
    initialCash: 120000000,
    focusGoods: [77, 78],  // 医疗设备、医疗耗材
    category: 'pharma',
    description: '医疗器械制造（垂直整合）',
    initialBuildings: [
      { typeId: 16, recipeId: 21, count: 3 },  // 自有电子元件×3
      { typeId: 31, recipeId: 47, count: 5 },  // 医用耗材生产×5
      { typeId: 31, recipeId: 48, count: 4 },  // 诊断设备生产×4
      { typeId: 31, recipeId: 92, count: 2 },  // 手术设备生产×2
    ],
  },
  
  // ==================== H. 奢侈品公司 (1家) ====================
  {
    id: 32,
    name: '珠宝奢侈',
    personality: 'premium',
    initialCash: 150000000,
    focusGoods: [88, 89, 90, 91, 54, 94],  // 黄金、钻石、金饰、钻戒、珠宝、高级手表
    category: 'luxury',
    description: '珠宝奢侈品制造（全产业链）',
    initialBuildings: [
      { typeId: 35, recipeId: 54, count: 4 },  // 金矿开采×4
      { typeId: 35, recipeId: 97, count: 3 },  // 钻石矿开采×3
      { typeId: 35, recipeId: 55, count: 3 },  // 黄金精炼×3
      { typeId: 36, recipeId: 98, count: 2 },  // 钻石切割×2
      { typeId: 36, recipeId: 56, count: 2 },  // 珠宝制作×2
      { typeId: 36, recipeId: 57, count: 2 },  // 奢侈腕表×2
    ],
  },
  
  // ==================== I. 发电公司 (1家) ====================
  {
    id: 33,
    name: '华能集团',
    personality: 'conservative',
    initialCash: 150000000,
    focusGoods: [57],  // 电力
    category: 'energy',
    description: '电力生产供应（垂直整合）',
    initialBuildings: [
      { typeId: 2, recipeId: 2, count: 4 },   // 自有煤矿×4
      { typeId: 4, recipeId: 4, count: 2 },   // 自有气田×2
      { typeId: 24, recipeId: 32, count: 6 }, // 燃煤发电×6
      { typeId: 24, recipeId: 33, count: 4 }, // 燃气发电×4
      { typeId: 24, recipeId: 34, count: 2 }, // 光伏发电×2
    ],
  },
  
  // ==================== J. 零售公司 (10家) ====================
  {
    id: 34,
    name: '全家便利',
    personality: 'opportunist',
    initialCash: 20000000,
    focusGoods: [8, 44, 45, 67],  // 粮食、食品、饮料、零食
    category: 'retail',
    description: '便利店零售',
    initialBuildings: [
      { typeId: 49, recipeId: -1, count: 12 },  // 便利店×12
    ],
  },
  {
    id: 35,
    name: '永辉超市',
    personality: 'cost_leader',
    initialCash: 40000000,
    focusGoods: [44, 45, 58, 59, 63, 64],  // 食品、饮料、蔬菜、水果、肉制品、乳制品
    category: 'retail',
    description: '综合超市零售',
    initialBuildings: [
      { typeId: 50, recipeId: -1, count: 15 },  // 超市×15
    ],
  },
  {
    id: 36,
    name: '沃尔玛',
    personality: 'cost_leader',
    initialCash: 80000000,
    focusGoods: [44, 45, 40, 55, 56],  // 食品、饮料、家电、手机、电脑
    category: 'retail',
    description: '大型综合零售',
    initialBuildings: [
      { typeId: 51, recipeId: -1, count: 10 },  // 大卖场×10
    ],
  },
  {
    id: 37,
    name: '苏宁电器',
    personality: 'specialist',
    initialCash: 50000000,
    focusGoods: [39, 40, 55, 56],  // 消费电子、家电、手机、电脑
    category: 'retail',
    description: '电子产品零售',
    initialBuildings: [
      { typeId: 52, recipeId: -1, count: 12 },  // 电子商城×12
    ],
  },
  {
    id: 38,
    name: '广汽4S',
    personality: 'premium',
    initialCash: 120000000,
    focusGoods: [41, 42, 95],  // 燃油车、电动车、豪华车
    category: 'retail',
    description: '汽车销售服务',
    initialBuildings: [
      { typeId: 53, recipeId: -1, count: 10 },  // 汽车4S店×10
    ],
  },
  {
    id: 39,
    name: '优衣库',
    personality: 'cost_leader',
    initialCash: 30000000,
    focusGoods: [43, 23],  // 服装、纺织品
    category: 'retail',
    description: '服装零售',
    initialBuildings: [
      { typeId: 54, recipeId: -1, count: 14 },  // 服装店×14
    ],
  },
  {
    id: 40,
    name: '卡地亚精品',
    personality: 'premium',
    initialCash: 150000000,
    focusGoods: [54, 94, 93, 95],  // 珠宝、高级手表、设计师服装、豪华车
    category: 'retail',
    description: '奢侈品零售',
    initialBuildings: [
      { typeId: 55, recipeId: -1, count: 10 },  // 奢侈品店×10
    ],
  },
  {
    id: 41,
    name: '大参林药房',
    personality: 'specialist',
    initialCash: 30000000,
    focusGoods: [74, 75, 76, 77],  // 仿制药、疫苗、OTC药品、医疗设备
    category: 'retail',
    description: '药品零售',
    initialBuildings: [
      { typeId: 56, recipeId: -1, count: 15 },  // 药店×15
    ],
  },
  {
    id: 42,
    name: '中石化加油',
    personality: 'cost_leader',
    initialCash: 80000000,
    focusGoods: [25, 57],  // 燃油、电力
    category: 'retail',
    description: '加油站零售',
    initialBuildings: [
      { typeId: 57, recipeId: -1, count: 18 },  // 加油站×18
    ],
  },
  {
    id: 43,
    name: '红星美凯龙',
    personality: 'diversified',
    initialCash: 80000000,
    focusGoods: [46, 47, 40],  // 家具、建材成品、家电
    category: 'retail',
    description: '家居建材零售',
    initialBuildings: [
      { typeId: 58, recipeId: -1, count: 10 },  // 家居商城×10
    ],
  },
  
  // ==================== K. 新增公司 (4家) ====================
  {
    id: 46,
    name: '华域橡胶',
    personality: 'specialist',
    initialCash: 100000000,
    focusGoods: [11, 19],  // 天然橡胶、橡胶制品
    category: 'processing',
    description: '橡胶种植和橡胶制品生产',
    initialBuildings: [
      { typeId: 32, recipeId: 106, count: 10 }, // 橡胶园×10
      { typeId: 10, recipeId: 68, count: 6 },   // 橡胶制品生产×6
    ],
  },
  {
    id: 47,
    name: '天齐锂业',
    personality: 'conservative',
    initialCash: 120000000,
    focusGoods: [13],  // 锂矿
    category: 'extraction',
    description: '锂矿开采',
    initialBuildings: [
      { typeId: 33, recipeId: 107, count: 14 }, // 锂矿场×14
    ],
  },
  {
    id: 48,
    name: '山鹰纸业',
    personality: 'cost_leader',
    initialCash: 80000000,
    focusGoods: [22, 37],  // 纸张、包装材料
    category: 'processing',
    description: '造纸和包装材料生产（垂直整合）',
    initialBuildings: [
      { typeId: 5, recipeId: 5, count: 6 },    // 自有伐木场×6
      { typeId: 34, recipeId: 66, count: 6 },  // 纸张生产×6
      { typeId: 34, recipeId: 67, count: 4 },  // 包装材料生产×4
    ],
  },
  {
    id: 49,
    name: '申洲国际',
    personality: 'cost_leader',
    initialCash: 70000000,
    focusGoods: [43],  // 服装
    category: 'manufacturing',
    description: '服装制造代工（垂直整合）',
    initialBuildings: [
      { typeId: 6, recipeId: 7, count: 4 },    // 自有棉花种植×4
      { typeId: 12, recipeId: 16, count: 4 },  // 纺织品生产×4
      { typeId: 12, recipeId: 69, count: 6 },  // 服装生产×6
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
 *
 * 【优化说明】提高投资决策的优先级保留：
 * 1. 投资优先级乘数从 (0.5 + expansionBias) 改为 (0.7 + expansionBias * 0.5)
 *    - 原来：保守型(0.3) -> 0.65倍，激进型(0.9) -> 1.4倍
 *    - 现在：保守型(0.3) -> 0.85倍，激进型(0.9) -> 1.15倍
 * 2. 现金紧张时的惩罚从0.5倍改为0.7倍
 * 3. 增加对投资决策的额外激励
 */
export function adjustDecisionByPersonality(
  decision: AIDecision,
  personality: AIPersonality,
  assessment: CompanyAssessment
): AIDecision {
  const adjusted = { ...decision };
  
  // 根据人格调整优先级
  switch (decision.type) {
    case 'investment':
      // 【进一步优化】大幅提高投资优先级保留
      // 原来：0.7 + expansionBias * 0.5 (范围0.7-1.15)
      // 现在：1.0 + expansionBias * 0.4 (范围1.0-1.36)
      // 保守型也能保持100%优先级，激进型最高136%
      adjusted.priority *= (1.0 + personality.expansionBias * 0.4);
      
      // 风险容忍度影响信心，也提高基础值
      adjusted.confidence *= (0.8 + personality.riskTolerance * 0.4);
      
      // 【新增】如果公司建筑数量少，额外提高投资优先级
      if (assessment.buildingCount < 3) {
        adjusted.priority *= 1.5; // 很小的公司急需扩张
      } else if (assessment.buildingCount < 5) {
        adjusted.priority *= 1.35; // 小公司更需要扩张
      } else if (assessment.buildingCount < 10) {
        adjusted.priority *= 1.2;
      }
      
      // 【新增】如果利润率高，说明业务健康，鼓励扩张
      if (assessment.profitMargin > 0.15) {
        adjusted.priority *= 1.25;
      } else if (assessment.profitMargin > 0.08) {
        adjusted.priority *= 1.15;
      } else if (assessment.profitMargin > 0) {
        adjusted.priority *= 1.05; // 只要盈利就稍微鼓励扩张
      }
      break;
      
    case 'trading':
      // 价格偏好影响交易决策
      if (decision.action === 'sell' && decision.params.price) {
        const priceAdjustment = 1 + personality.pricingBias * 0.1;
        adjusted.params = {
          ...adjusted.params,
          price: (adjusted.params.price as number) * priceAdjustment,
        };
      }
      // 市场意识影响交易频率
      adjusted.priority *= (0.7 + personality.marketAwareness * 0.6);
      break;
      
    case 'production':
      // 专业化程度影响生产优先级
      adjusted.priority *= (0.8 + personality.specializationDegree * 0.4);
      break;
      
    case 'pricing':
      // 竞争敏感度影响定价响应
      adjusted.priority *= (0.7 + personality.competitiveSensitivity * 0.6);
      break;
  }
  
  // 现金储备约束 - 进一步放宽惩罚
  if (assessment.cashRatio < personality.targetCashRatio * 0.3) {
    // 只有现金极度紧张时才降低投资优先级
    // 原来：0.7倍，现在：0.8倍
    if (decision.type === 'investment') {
      adjusted.priority *= 0.8;
    }
    // 提高卖出优先级
    if (decision.type === 'trading' && decision.action === 'sell') {
      adjusted.priority *= 1.5;
    }
  } else if (assessment.cashRatio < personality.targetCashRatio * 0.5) {
    // 现金稍紧，轻微降低投资优先级
    if (decision.type === 'investment') {
      adjusted.priority *= 0.9;
    }
  }
  
  // 【新增】现金充裕时鼓励投资
  if (assessment.cashRatio > personality.targetCashRatio * 2.0) {
    if (decision.type === 'investment') {
      adjusted.priority *= 1.5; // 现金过多时大幅提高投资积极性
    }
  } else if (assessment.cashRatio > personality.targetCashRatio * 1.5) {
    if (decision.type === 'investment') {
      adjusted.priority *= 1.3; // 现金充裕时更积极投资
    }
  } else if (assessment.cashRatio > personality.targetCashRatio) {
    if (decision.type === 'investment') {
      adjusted.priority *= 1.1; // 现金达标就稍微鼓励投资
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
  // 农业相关建筑ID: 6(农场), 25(蔬菜农场), 26(畜牧场), 27(渔场), 28(肉类加工厂)
  return [6, 25, 26, 27, 28].includes(buildingTypeId);
}

/**
 * 判断建筑是否属于医药产业链
 */
function isPharmaBuilding(buildingTypeId: number): boolean {
  // 医药相关建筑ID: 29(药材种植园), 30(制药厂), 31(医疗器械厂)
  return [29, 30, 31].includes(buildingTypeId);
}

/**
 * 判断建筑是否属于奢侈品产业链
 */
function isLuxuryBuilding(buildingTypeId: number): boolean {
  // 奢侈品相关建筑ID: 35(金矿), 36(奢侈品工坊), 55(奢侈品店)
  return [35, 36, 55].includes(buildingTypeId);
}

/**
 * 判断建筑是否属于高科技产业链
 */
function isTechBuilding(buildingTypeId: number): boolean {
  // 高科技相关建筑ID: 17(半导体厂), 16(电子厂), 20(电池厂), 52(电子商城)
  return [16, 17, 20, 52].includes(buildingTypeId);
}

/**
 * 获取建筑类型的偏好权重
 */
export function getBuildingTypeWeight(personality: AIPersonality, buildingTypeId: number): number {
  const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
  if (!building) return 1.0;
  
  const prefs = personality.industryPreferences;
  
  // 基于建筑类别的基础权重
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
  }
  
  // 细分产业加成（使用平均值避免权重过大或过小）
  if (isAgricultureBuilding(buildingTypeId)) {
    weight = (weight + prefs.agriculture) / 2;
  } else if (isPharmaBuilding(buildingTypeId)) {
    weight = (weight + prefs.pharma) / 2;
  } else if (isLuxuryBuilding(buildingTypeId)) {
    weight = (weight + prefs.luxury) / 2;
  } else if (isTechBuilding(buildingTypeId)) {
    weight = (weight + prefs.tech) / 2;
  }
  
  // 确保权重在合理范围内
  return Math.max(0.2, Math.min(2.0, weight));
}

/**
 * 筛选符合人格偏好的决策
 *
 * 【v2.0更新】不再完全过滤任何决策，而是通过权重调整优先级
 * - 低偏好的决策优先级降低，但仍可能被执行
 * - 高偏好的决策优先级提高
 */
export function filterDecisionsByPersonality(
  decisions: AIDecision[],
  personality: AIPersonality,
  world: GameWorld
): AIDecision[] {
  return decisions.map(d => {
    const adjusted = { ...d };
    
    // 检查商品类别偏好
    if (d.params.goodsId !== undefined) {
      const goodsId = d.params.goodsId as number;
      const category = world.goods.categories[goodsId];
      
      // 【新逻辑】使用权重调整优先级，而非完全过滤
      const categoryWeight = getCategoryWeight(personality, category);
      adjusted.priority *= categoryWeight;
      adjusted.confidence *= Math.sqrt(categoryWeight); // 置信度也受轻微影响
    }
    
    // 检查建筑类型偏好（投资决策）
    if (d.type === 'investment' && d.params.buildingTypeId !== undefined) {
      const buildingTypeId = d.params.buildingTypeId as number;
      const buildingWeight = getBuildingTypeWeight(personality, buildingTypeId);
      adjusted.priority *= buildingWeight;
    }
    
    // 风险过滤 - 不再完全过滤，而是降低优先级
    const minConfidence = (1 - personality.riskTolerance) * 0.3; // 降低阈值
    if (adjusted.confidence < minConfidence) {
      adjusted.priority *= 0.3; // 大幅降低优先级而非完全过滤
    }
    
    return adjusted;
  }).filter(d => d.priority > 0.05); // 只过滤优先级极低的决策
}

/**
 * 计算人格驱动的目标市场份额
 */
export function calculateTargetMarketShare(personality: AIPersonality): number {
  const baseShare = 0.1; // 10% 基础目标
  
  const aggressiveness = personality.expansionBias * personality.riskTolerance;
  const focus = personality.specializationDegree;
  
  // 激进且专注的公司追求更高市场份额
  return baseShare + aggressiveness * 0.2 + focus * 0.1;
}

/**
 * 评估与人格目标的差距
 */
export function evaluatePersonalityGoalGap(
  personality: AIPersonality,
  assessment: CompanyAssessment
): {
  cashGap: number;           // 现金缺口（正数表示需要更多现金）
  inventoryGap: number;      // 库存缺口
  expansionNeed: number;     // 扩张需求
  riskLevel: number;         // 当前风险水平
} {
  const cashGap = personality.targetCashRatio - assessment.cashRatio;
  
  // 计算库存周转天数
  const avgDailySales = assessment.inventoryValue / 30; // 简化估算
  const currentInventoryDays = avgDailySales > 0 ? 
    assessment.inventoryValue / avgDailySales : 0;
  const inventoryGap = currentInventoryDays - personality.targetInventoryDays;
  
  // 扩张需求基于市场份额差距
  const targetShare = calculateTargetMarketShare(personality);
  const expansionNeed = Math.max(0, targetShare - assessment.marketShare);
  
  // 风险评估
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