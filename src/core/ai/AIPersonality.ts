/**
 * AI人格差异系统
 * 为每个AI公司定义独特的行为特征和决策偏好
 */

import { GameWorld } from '@/core/world/GameWorld';
import { AIDecision, CompanyAssessment } from './AIDecisionEngine';

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
  
  // 偏好的商品类别
  preferredCategories: string[];
  
  // 避免的商品类别
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
    preferredCategories: ['basic', 'raw'],
    avoidedCategories: ['final'],
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
    preferredCategories: ['intermediate'],
    avoidedCategories: ['raw'],
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
    preferredCategories: ['final', 'intermediate'],
    avoidedCategories: ['raw'],
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
    preferredCategories: ['final'],
    avoidedCategories: ['raw', 'basic'],
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
  focusGoods: number[];       // 专注的商品ID
  initialBuildings: Array<{   // 初始建筑配置
    typeId: number;
    recipeId: number;
    count: number;
  }>;
}

/**
 * 预定义AI公司配置
 */
export const AI_COMPANIES: AICompanyConfig[] = [
  {
    id: 1,
    name: '铁拳工业',
    personality: 'aggressive',
    initialCash: 5000000,
    focusGoods: [14, 16, 32], // 钢材、铝材、汽车零部件
    initialBuildings: [
      { typeId: 0, recipeId: 0, count: 2 }, // 铁矿场
      { typeId: 8, recipeId: 10, count: 1 }, // 钢铁厂
    ],
  },
  {
    id: 2,
    name: '恒泰资源',
    personality: 'conservative',
    initialCash: 8000000,
    focusGoods: [0, 1, 3, 4], // 铁矿、铜矿、煤炭、原油
    initialBuildings: [
      { typeId: 2, recipeId: 2, count: 3 }, // 煤矿
      { typeId: 3, recipeId: 3, count: 1 }, // 油田
    ],
  },
  {
    id: 3,
    name: '智芯科技',
    personality: 'innovator',
    initialCash: 10000000,
    focusGoods: [27, 38, 39], // 芯片、智能手机、电脑
    initialBuildings: [
      { typeId: 17, recipeId: 24, count: 1 }, // 半导体厂
      { typeId: 16, recipeId: 21, count: 1 }, // 电子厂
    ],
  },
  {
    id: 4,
    name: '鸿运贸易',
    personality: 'opportunist',
    initialCash: 6000000,
    focusGoods: [],
    initialBuildings: [
      { typeId: 23, recipeId: -1, count: 2 }, // 仓储中心
    ],
  },
  {
    id: 5,
    name: '精密零件',
    personality: 'specialist',
    initialCash: 4000000,
    focusGoods: [31, 32, 29], // 机械部件、汽车零部件、电机
    initialBuildings: [
      { typeId: 21, recipeId: 29, count: 2 }, // 零部件厂
    ],
  },
  {
    id: 6,
    name: '四海集团',
    personality: 'diversified',
    initialCash: 12000000,
    focusGoods: [],
    initialBuildings: [
      { typeId: 6, recipeId: 6, count: 2 }, // 农场
      { typeId: 12, recipeId: 16, count: 1 }, // 纺织厂
      { typeId: 13, recipeId: 17, count: 1 }, // 食品厂
    ],
  },
  {
    id: 7,
    name: '低价王',
    personality: 'cost_leader',
    initialCash: 7000000,
    focusGoods: [24, 44, 45], // 加工食品、食品、饮料
    initialBuildings: [
      { typeId: 13, recipeId: 17, count: 3 }, // 食品厂
    ],
  },
  {
    id: 8,
    name: '尊享品牌',
    personality: 'premium',
    initialCash: 15000000,
    focusGoods: [53, 54, 55], // 奢侈品、珠宝、高端手机
    initialBuildings: [
      { typeId: 16, recipeId: 22, count: 1 }, // 电子厂生产手机
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
 * 筛选符合人格偏好的决策
 */
export function filterDecisionsByPersonality(
  decisions: AIDecision[],
  personality: AIPersonality,
  world: GameWorld
): AIDecision[] {
  return decisions.filter(d => {
    // 检查商品类别偏好
    if (d.params.goodsId !== undefined) {
      const goodsId = d.params.goodsId as number;
      const goods = world.goods.categories[goodsId];
      
      // 避免的类别
      if (personality.avoidedCategories.includes(goods)) {
        return false;
      }
      
      // 非偏好类别降低权重
      if (personality.preferredCategories.length > 0 && 
          !personality.preferredCategories.includes(goods)) {
        d.priority *= 0.6;
      }
    }
    
    // 风险过滤
    if (d.confidence < (1 - personality.riskTolerance) * 0.5) {
      return false;
    }
    
    return true;
  });
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