/**
 * 商业周期与宏观经济波动系统
 * 模拟经济周期的繁荣、衰退、萧条、复苏阶段
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS } from '@/data/goods';
import {
  BASE_INTEREST_RATE,
  BUSINESS_CYCLE_LENGTH,
  INITIAL_GDP,
  TARGET_INFLATION,
} from '@/core/constants';

/**
 * 经济周期阶段
 */
export type CyclePhase = 'expansion' | 'peak' | 'contraction' | 'trough';

/**
 * 宏观经济指标
 */
export interface MacroIndicators {
  gdp: number;                    // 国内生产总值
  gdpGrowthRate: number;          // GDP增长率
  inflation: number;              // 通胀率
  unemployment: number;           // 失业率
  interestRate: number;           // 利率
  consumerConfidence: number;     // 消费者信心指数 (0-100)
  businessConfidence: number;     // 企业信心指数 (0-100)
  moneySupply: number;            // 货币供应量
  creditAvailability: number;     // 信贷可获得性 (0-1)
  cyclePhase: CyclePhase;
  cyclePosition: number;          // 周期位置 (0-1)
}

/**
 * 经济事件
 */
export interface EconomicEvent {
  id: number;
  name: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  category: 'monetary' | 'fiscal' | 'trade' | 'technology' | 'natural' | 'political';
  effects: {
    gdpImpact: number;            // GDP影响百分比
    inflationImpact: number;      // 通胀影响百分点
    unemploymentImpact: number;   // 失业率影响百分点
    interestRateImpact: number;   // 利率影响百分点
    confidenceImpact: number;     // 信心指数影响
    duration: number;             // 持续tick数
    goodsEffects?: Array<{        // 对特定商品的影响
      goodsId: number;
      demandMultiplier: number;
      priceMultiplier: number;
    }>;
  };
  probability: number;            // 发生概率（每tick）
  cooldown: number;               // 冷却期tick数
}

/**
 * 经济周期配置
 */
const CYCLE_CONFIG = {
  baseCycleLength: BUSINESS_CYCLE_LENGTH,   // 约 5 年完整周期
  cycleLengthVariance: BUSINESS_CYCLE_LENGTH * 0.2,
  
  // 各阶段默认参数
  phases: {
    expansion: {
      duration: 0.35,             // 占周期的比例
      gdpGrowthRange: [0.02, 0.06],
      inflationRange: [0.01, 0.04],
      unemploymentChange: -0.005,
      interestRateTrend: 0.001,
      confidenceTrend: 0.5,
    },
    peak: {
      duration: 0.15,
      gdpGrowthRange: [0.01, 0.03],
      inflationRange: [0.03, 0.06],
      unemploymentChange: 0,
      interestRateTrend: 0.002,
      confidenceTrend: 0,
    },
    contraction: {
      duration: 0.30,
      gdpGrowthRange: [-0.03, 0.01],
      inflationRange: [0.00, 0.02],
      unemploymentChange: 0.008,
      interestRateTrend: -0.001,
      confidenceTrend: -0.8,
    },
    trough: {
      duration: 0.20,
      gdpGrowthRange: [-0.02, 0.02],
      inflationRange: [-0.01, 0.01],
      unemploymentChange: 0.002,
      interestRateTrend: -0.002,
      confidenceTrend: 0.2,
    },
  },
};

/**
 * 预定义经济事件
 */
const ECONOMIC_EVENTS: EconomicEvent[] = [
  // ===== 正面事件 =====
  {
    id: 1,
    name: '技术突破',
    description: '新技术的突破带来生产效率提升',
    type: 'positive',
    category: 'technology',
    effects: {
      gdpImpact: 0.02,
      inflationImpact: -0.005,
      unemploymentImpact: -0.01,
      interestRateImpact: 0,
      confidenceImpact: 15,
      duration: 480,
      goodsEffects: [
        { goodsId: 27, demandMultiplier: 1.3, priceMultiplier: 0.9 }, // 芯片
        { goodsId: 56, demandMultiplier: 1.2, priceMultiplier: 0.95 }, // 平价手机
      ],
    },
    probability: 0.0002,
    cooldown: 1440,
  },
  {
    id: 2,
    name: '贸易协定签署',
    description: '新的贸易协定降低了关税壁垒',
    type: 'positive',
    category: 'trade',
    effects: {
      gdpImpact: 0.015,
      inflationImpact: -0.01,
      unemploymentImpact: -0.005,
      interestRateImpact: 0,
      confidenceImpact: 10,
      duration: 720,
    },
    probability: 0.0001,
    cooldown: 2880,
  },
  {
    id: 3,
    name: '消费旺季',
    description: '节假日带来消费需求激增',
    type: 'positive',
    category: 'fiscal',
    effects: {
      gdpImpact: 0.01,
      inflationImpact: 0.005,
      unemploymentImpact: -0.003,
      interestRateImpact: 0,
      confidenceImpact: 8,
      duration: 240,
      goodsEffects: [
        { goodsId: 40, demandMultiplier: 1.4, priceMultiplier: 1.05 }, // 家电
        { goodsId: 43, demandMultiplier: 1.5, priceMultiplier: 1.1 }, // 服装
        { goodsId: 54, demandMultiplier: 1.6, priceMultiplier: 1.1 }, // 珠宝
      ],
    },
    probability: 0.0005,
    cooldown: 720,
  },
  {
    id: 4,
    name: '基础设施投资',
    description: '政府大规模基础设施投资计划',
    type: 'positive',
    category: 'fiscal',
    effects: {
      gdpImpact: 0.025,
      inflationImpact: 0.01,
      unemploymentImpact: -0.015,
      interestRateImpact: 0.002,
      confidenceImpact: 12,
      duration: 960,
      goodsEffects: [
        { goodsId: 14, demandMultiplier: 1.4, priceMultiplier: 1.1 }, // 钢材
        { goodsId: 21, demandMultiplier: 1.5, priceMultiplier: 1.15 }, // 水泥
        { goodsId: 36, demandMultiplier: 1.3, priceMultiplier: 1.1 }, // 建筑材料
      ],
    },
    probability: 0.00015,
    cooldown: 2160,
  },
  
  // ===== 负面事件 =====
  {
    id: 11,
    name: '能源危机',
    description: '能源供应短缺导致价格飙升',
    type: 'negative',
    category: 'natural',
    effects: {
      gdpImpact: -0.02,
      inflationImpact: 0.03,
      unemploymentImpact: 0.01,
      interestRateImpact: 0.005,
      confidenceImpact: -20,
      duration: 480,
      goodsEffects: [
        { goodsId: 4, demandMultiplier: 1.0, priceMultiplier: 1.5 }, // 原油
        { goodsId: 5, demandMultiplier: 1.0, priceMultiplier: 1.4 }, // 天然气
        { goodsId: 25, demandMultiplier: 0.9, priceMultiplier: 1.3 }, // 燃油
        { goodsId: 66, demandMultiplier: 1.0, priceMultiplier: 1.25 }, // 电力 (GoodsId.ELECTRICITY)
      ],
    },
    probability: 0.0001,
    cooldown: 1440,
  },
  {
    id: 12,
    name: '供应链中断',
    description: '全球供应链受到严重干扰',
    type: 'negative',
    category: 'trade',
    effects: {
      gdpImpact: -0.015,
      inflationImpact: 0.02,
      unemploymentImpact: 0.008,
      interestRateImpact: 0,
      confidenceImpact: -15,
      duration: 360,
      goodsEffects: [
        { goodsId: 27, demandMultiplier: 0.8, priceMultiplier: 1.3 }, // 芯片
        { goodsId: 26, demandMultiplier: 0.85, priceMultiplier: 1.2 }, // 电子元件
      ],
    },
    probability: 0.00015,
    cooldown: 960,
  },
  {
    id: 13,
    name: '金融市场动荡',
    description: '金融市场剧烈波动，信贷收紧',
    type: 'negative',
    category: 'monetary',
    effects: {
      gdpImpact: -0.01,
      inflationImpact: -0.005,
      unemploymentImpact: 0.005,
      interestRateImpact: 0.01,
      confidenceImpact: -25,
      duration: 240,
    },
    probability: 0.0002,
    cooldown: 720,
  },
  {
    id: 14,
    name: '自然灾害',
    description: '自然灾害影响生产和物流',
    type: 'negative',
    category: 'natural',
    effects: {
      gdpImpact: -0.01,
      inflationImpact: 0.015,
      unemploymentImpact: 0.003,
      interestRateImpact: -0.002,
      confidenceImpact: -10,
      duration: 360,
      goodsEffects: [
        { goodsId: 8, demandMultiplier: 0.7, priceMultiplier: 1.4 }, // 粮食
        { goodsId: 6, demandMultiplier: 0.8, priceMultiplier: 1.3 }, // 木材
      ],
    },
    probability: 0.00025,
    cooldown: 480,
  },
  
  // ===== 中性事件 =====
  {
    id: 21,
    name: '货币政策调整',
    description: '央行调整货币政策方向',
    type: 'neutral',
    category: 'monetary',
    effects: {
      gdpImpact: 0,
      inflationImpact: 0,
      unemploymentImpact: 0,
      interestRateImpact: 0.005,
      confidenceImpact: 0,
      duration: 480,
    },
    probability: 0.0003,
    cooldown: 720,
  },
  {
    id: 22,
    name: '行业结构调整',
    description: '部分行业面临转型压力',
    type: 'neutral',
    category: 'technology',
    effects: {
      gdpImpact: 0,
      inflationImpact: 0,
      unemploymentImpact: 0.005,
      interestRateImpact: 0,
      confidenceImpact: -5,
      duration: 720,
    },
    probability: 0.0002,
    cooldown: 960,
  },
];

/**
 * 活动事件跟踪
 */
interface ActiveEvent {
  event: EconomicEvent;
  startTick: number;
  endTick: number;
  remainingDuration: number;
}

// 活动事件列表
let activeEvents: ActiveEvent[] = [];
let eventCooldowns: Map<number, number> = new Map();

/**
 * 初始化经济周期
 */
export function initializeBusinessCycle(world: GameWorld): void {
  world.economyStats = {
    gdp: INITIAL_GDP,
    inflation: TARGET_INFLATION,
    unemployment: 0.05,
    interestRate: BASE_INTEREST_RATE,
    cyclePhase: 'expansion',
    cyclePosition: 0.38,
  };
  
  activeEvents = [];
  eventCooldowns.clear();
}

/**
 * 更新经济周期位置
 */
export function updateCyclePosition(world: GameWorld): void {
  const stats = world.economyStats;
  
  // 推进周期位置
  const cycleLength = CYCLE_CONFIG.baseCycleLength;
  stats.cyclePosition += 1 / cycleLength;
  
  if (stats.cyclePosition >= 1) {
    stats.cyclePosition -= 1;
  }
  
  // 确定当前阶段
  const { phases } = CYCLE_CONFIG;
  let cumulative = 0;
  
  if (stats.cyclePosition < (cumulative += phases.expansion.duration)) {
    stats.cyclePhase = 'expansion';
  } else if (stats.cyclePosition < (cumulative += phases.peak.duration)) {
    stats.cyclePhase = 'peak';
  } else if (stats.cyclePosition < (cumulative += phases.contraction.duration)) {
    stats.cyclePhase = 'contraction';
  } else {
    stats.cyclePhase = 'trough';
  }
}

/**
 * 更新宏观经济指标
 */
export function updateMacroIndicators(world: GameWorld): void {
  const stats = world.economyStats;
  const phaseConfig = CYCLE_CONFIG.phases[stats.cyclePhase];
  
  // 基于周期阶段更新指标
  const [minGrowth, maxGrowth] = phaseConfig.gdpGrowthRange;
  const gdpGrowth = minGrowth + Math.random() * (maxGrowth - minGrowth);
  stats.gdp *= (1 + gdpGrowth / 365); // 日增长率
  
  // 通胀
  const [minInflation, maxInflation] = phaseConfig.inflationRange;
  const targetInflation = minInflation + Math.random() * (maxInflation - minInflation);
  stats.inflation = stats.inflation * 0.99 + targetInflation * 0.01;
  
  // 失业率
  stats.unemployment = Math.max(0.02, Math.min(0.15, 
    stats.unemployment + phaseConfig.unemploymentChange / 365 + (Math.random() - 0.5) * 0.001
  ));
  
  // 利率
  stats.interestRate = Math.max(0.001, Math.min(0.15,
    stats.interestRate + phaseConfig.interestRateTrend / 365
  ));
  
  // 应用活动事件效果
  applyActiveEventEffects(world);
}

/**
 * 处理随机经济事件
 */
export function processRandomEvents(world: GameWorld): EconomicEvent | null {
  const currentTick = world.tick;
  
  // 更新冷却时间
  for (const [eventId, cooldownEnd] of eventCooldowns.entries()) {
    if (currentTick >= cooldownEnd) {
      eventCooldowns.delete(eventId);
    }
  }
  
  // 清理过期事件
  activeEvents = activeEvents.filter(ae => ae.remainingDuration > 0);
  
  // 检查是否触发新事件
  for (const event of ECONOMIC_EVENTS) {
    // 跳过冷却中的事件
    if (eventCooldowns.has(event.id)) continue;
    
    // 检查触发概率
    if (Math.random() < event.probability) {
      // 触发事件
      const activeEvent: ActiveEvent = {
        event,
        startTick: currentTick,
        endTick: currentTick + event.effects.duration,
        remainingDuration: event.effects.duration,
      };
      
      activeEvents.push(activeEvent);
      eventCooldowns.set(event.id, currentTick + event.cooldown);
      
      return event;
    }
  }
  
  return null;
}

/**
 * 应用活动事件效果
 */
function applyActiveEventEffects(world: GameWorld): void {
  const stats = world.economyStats;
  
  for (const activeEvent of activeEvents) {
    const { event } = activeEvent;
    const { effects } = event;
    
    // 计算效果衰减（效果在持续期间线性衰减）
    const effectStrength = activeEvent.remainingDuration / effects.duration;
    
    // 应用GDP影响
    stats.gdp *= (1 + effects.gdpImpact * effectStrength / effects.duration);
    
    // 应用通胀影响
    stats.inflation += effects.inflationImpact * effectStrength / effects.duration;
    
    // 应用失业率影响
    stats.unemployment = Math.max(0.02, Math.min(0.15,
      stats.unemployment + effects.unemploymentImpact * effectStrength / effects.duration
    ));
    
    // 应用利率影响
    stats.interestRate = Math.max(0.001, Math.min(0.15,
      stats.interestRate + effects.interestRateImpact * effectStrength / effects.duration
    ));
    
    // 应用商品特定效果
    if (effects.goodsEffects) {
      for (const goodsEffect of effects.goodsEffects) {
        // 需求乘数
        const demandMod = 1 + (goodsEffect.demandMultiplier - 1) * effectStrength;
        world.goods.demands[goodsEffect.goodsId] *= demandMod;
        
        // 价格乘数（影响基准价格）
        const priceMod = 1 + (goodsEffect.priceMultiplier - 1) * effectStrength;
        world.goods.prices[goodsEffect.goodsId] *= (1 + (priceMod - 1) * 0.1);
      }
    }
    
    // 减少剩余时间
    activeEvent.remainingDuration--;
  }
}

/**
 * 获取当前活动事件
 */
export function getActiveEvents(): ActiveEvent[] {
  return [...activeEvents];
}

/**
 * 计算经济周期对需求的总体影响
 */
export function getCycleDemandMultiplier(world: GameWorld): number {
  const stats = world.economyStats;
  
  // 基于周期位置的需求乘数
  // 使用正弦波模拟周期波动
  const cycleEffect = Math.sin(stats.cyclePosition * Math.PI * 2) * 0.15;
  
  // 基于信心指数的调整
  const confidenceMultiplier = world.economyStats.cyclePosition > 0.5 ? 0.95 : 1.05;
  
  return 1 + cycleEffect * confidenceMultiplier;
}

/**
 * 计算经济周期对价格的影响
 */
export function getCyclePriceMultiplier(world: GameWorld): number {
  const stats = world.economyStats;
  
  // 通胀影响
  const inflationEffect = 1 + stats.inflation;
  
  // 周期影响（滞后于需求）
  const cycleEffect = Math.sin((stats.cyclePosition - 0.1) * Math.PI * 2) * 0.1;
  
  return inflationEffect * (1 + cycleEffect);
}

/**
 * 计算利率对投资决策的影响
 */
export function getInvestmentMultiplier(world: GameWorld): number {
  const baseRate = 0.03; // 3% 基准利率
  const currentRate = world.economyStats.interestRate;
  
  // 利率高于基准 → 投资减少，反之增加
  const rateEffect = (baseRate - currentRate) * 5;
  
  return Math.max(0.5, Math.min(1.5, 1 + rateEffect));
}

/**
 * 预测经济趋势
 */
export function predictEconomicTrend(world: GameWorld, ticksAhead: number): {
  predictedPhase: CyclePhase;
  gdpTrend: 'growing' | 'stable' | 'declining';
  inflationTrend: 'rising' | 'stable' | 'falling';
  confidence: number;
} {
  const stats = world.economyStats;
  const futurePosition = (stats.cyclePosition + ticksAhead / CYCLE_CONFIG.baseCycleLength) % 1;
  
  // 预测阶段
  const { phases } = CYCLE_CONFIG;
  let cumulative = 0;
  let predictedPhase: CyclePhase = 'expansion';
  
  if (futurePosition < (cumulative += phases.expansion.duration)) {
    predictedPhase = 'expansion';
  } else if (futurePosition < (cumulative += phases.peak.duration)) {
    predictedPhase = 'peak';
  } else if (futurePosition < (cumulative += phases.contraction.duration)) {
    predictedPhase = 'contraction';
  } else {
    predictedPhase = 'trough';
  }
  
  // GDP趋势
  let gdpTrend: 'growing' | 'stable' | 'declining';
  if (predictedPhase === 'expansion') gdpTrend = 'growing';
  else if (predictedPhase === 'contraction') gdpTrend = 'declining';
  else gdpTrend = 'stable';
  
  // 通胀趋势
  let inflationTrend: 'rising' | 'stable' | 'falling';
  if (predictedPhase === 'peak' || predictedPhase === 'expansion') inflationTrend = 'rising';
  else if (predictedPhase === 'trough') inflationTrend = 'falling';
  else inflationTrend = 'stable';
  
  // 预测置信度（预测越远越不确定）
  const confidence = Math.max(0.3, 1 - ticksAhead / CYCLE_CONFIG.baseCycleLength);
  
  return {
    predictedPhase,
    gdpTrend,
    inflationTrend,
    confidence,
  };
}

/**
 * 主更新函数 - 每tick调用
 */
export function updateBusinessCycle(world: GameWorld): EconomicEvent | null {
  updateCyclePosition(world);
  updateMacroIndicators(world);
  return processRandomEvents(world);
}
