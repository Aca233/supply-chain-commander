/**
 * 季节性需求系统
 * 模拟不同商品在一年中的需求波动
 */

import { TICKS_PER_DAY } from '@/core/constants';

// ==================== 类型定义 ====================

/**
 * 季节枚举
 */
export enum Season {
  SPRING = 0,  // 春季 (3-5月)
  SUMMER = 1,  // 夏季 (6-8月)
  AUTUMN = 2,  // 秋季 (9-11月)
  WINTER = 3,  // 冬季 (12-2月)
}

/**
 * 季节信息
 */
export interface SeasonInfo {
  season: Season;
  name: string;
  description: string;
  startMonth: number;  // 开始月份 (1-12)
  endMonth: number;    // 结束月份 (1-12)
}

/**
 * 商品季节性配置
 */
export interface GoodsSeasonalConfig {
  goodsId: number;
  seasonalPattern: SeasonalPattern;
  peakSeason: Season;
  peakMultiplier: number;      // 旺季需求倍数
  troughMultiplier: number;    // 淡季需求倍数
  priceVolatility: number;     // 价格波动性 (0-1)
}

/**
 * 季节性模式
 */
export enum SeasonalPattern {
  NONE = 'none',                    // 无季节性
  SUMMER_PEAK = 'summer_peak',      // 夏季高峰
  WINTER_PEAK = 'winter_peak',      // 冬季高峰
  SPRING_AUTUMN = 'spring_autumn',  // 春秋高峰
  HARVEST = 'harvest',              // 收获季节（秋季）
  YEAR_END = 'year_end',            // 年末高峰
  HOLIDAY = 'holiday',              // 假日高峰（多个节日）
  CONSTRUCTION = 'construction',    // 建筑季节（春夏）
  BACK_TO_SCHOOL = 'back_to_school', // 开学季（秋季）
}

// ==================== 季节配置 ====================

export const SEASON_INFO: Record<Season, SeasonInfo> = {
  [Season.SPRING]: {
    season: Season.SPRING,
    name: '春季',
    description: '万物复苏，建设活动增加',
    startMonth: 3,
    endMonth: 5,
  },
  [Season.SUMMER]: {
    season: Season.SUMMER,
    name: '夏季',
    description: '旅游旺季，消费活跃',
    startMonth: 6,
    endMonth: 8,
  },
  [Season.AUTUMN]: {
    season: Season.AUTUMN,
    name: '秋季',
    description: '收获季节，开学季',
    startMonth: 9,
    endMonth: 11,
  },
  [Season.WINTER]: {
    season: Season.WINTER,
    name: '冬季',
    description: '年末消费高峰，供暖需求',
    startMonth: 12,
    endMonth: 2,
  },
};

/**
 * 季节性模式的需求曲线
 * 返回每个季节的需求倍数
 */
export const SEASONAL_PATTERNS: Record<SeasonalPattern, Record<Season, number>> = {
  [SeasonalPattern.NONE]: {
    [Season.SPRING]: 1.0,
    [Season.SUMMER]: 1.0,
    [Season.AUTUMN]: 1.0,
    [Season.WINTER]: 1.0,
  },
  [SeasonalPattern.SUMMER_PEAK]: {
    [Season.SPRING]: 1.1,
    [Season.SUMMER]: 1.4,
    [Season.AUTUMN]: 0.9,
    [Season.WINTER]: 0.7,
  },
  [SeasonalPattern.WINTER_PEAK]: {
    [Season.SPRING]: 0.8,
    [Season.SUMMER]: 0.6,
    [Season.AUTUMN]: 0.9,
    [Season.WINTER]: 1.5,
  },
  [SeasonalPattern.SPRING_AUTUMN]: {
    [Season.SPRING]: 1.3,
    [Season.SUMMER]: 0.8,
    [Season.AUTUMN]: 1.3,
    [Season.WINTER]: 0.8,
  },
  [SeasonalPattern.HARVEST]: {
    [Season.SPRING]: 0.7,
    [Season.SUMMER]: 0.9,
    [Season.AUTUMN]: 1.5,
    [Season.WINTER]: 0.9,
  },
  [SeasonalPattern.YEAR_END]: {
    [Season.SPRING]: 0.8,
    [Season.SUMMER]: 0.9,
    [Season.AUTUMN]: 1.0,
    [Season.WINTER]: 1.4,
  },
  [SeasonalPattern.HOLIDAY]: {
    [Season.SPRING]: 1.2,  // 春节
    [Season.SUMMER]: 1.1,  // 暑假
    [Season.AUTUMN]: 1.0,
    [Season.WINTER]: 1.3,  // 圣诞/新年
  },
  [SeasonalPattern.CONSTRUCTION]: {
    [Season.SPRING]: 1.4,
    [Season.SUMMER]: 1.3,
    [Season.AUTUMN]: 1.1,
    [Season.WINTER]: 0.5,  // 冬季施工困难
  },
  [SeasonalPattern.BACK_TO_SCHOOL]: {
    [Season.SPRING]: 0.8,
    [Season.SUMMER]: 1.1,
    [Season.AUTUMN]: 1.5,  // 开学季
    [Season.WINTER]: 0.8,
  },
};

// ==================== 商品季节性配置 ====================

/**
 * 商品季节性配置表
 */
const GOODS_SEASONAL_CONFIGS: GoodsSeasonalConfig[] = [
  // 能源类 - 冬季高峰
  { goodsId: 3, seasonalPattern: SeasonalPattern.WINTER_PEAK, peakSeason: Season.WINTER, peakMultiplier: 1.6, troughMultiplier: 0.5, priceVolatility: 0.3 },  // 煤炭
  { goodsId: 5, seasonalPattern: SeasonalPattern.WINTER_PEAK, peakSeason: Season.WINTER, peakMultiplier: 1.5, troughMultiplier: 0.6, priceVolatility: 0.25 }, // 天然气
  
  // 农产品 - 收获季节
  { goodsId: 8, seasonalPattern: SeasonalPattern.HARVEST, peakSeason: Season.AUTUMN, peakMultiplier: 1.4, troughMultiplier: 0.7, priceVolatility: 0.2 },      // 粮食
  { goodsId: 7, seasonalPattern: SeasonalPattern.HARVEST, peakSeason: Season.AUTUMN, peakMultiplier: 1.3, troughMultiplier: 0.8, priceVolatility: 0.15 },     // 棉花
  
  // 建材类 - 建筑季节
  { goodsId: 14, seasonalPattern: SeasonalPattern.CONSTRUCTION, peakSeason: Season.SPRING, peakMultiplier: 1.35, troughMultiplier: 0.55, priceVolatility: 0.15 }, // 钢材
  { goodsId: 6, seasonalPattern: SeasonalPattern.CONSTRUCTION, peakSeason: Season.SPRING, peakMultiplier: 1.3, troughMultiplier: 0.6, priceVolatility: 0.12 },   // 木材
  
  // 消费电子 - 年末高峰
  { goodsId: 27, seasonalPattern: SeasonalPattern.YEAR_END, peakSeason: Season.WINTER, peakMultiplier: 1.5, troughMultiplier: 0.75, priceVolatility: 0.2 },   // 电子产品
  { goodsId: 26, seasonalPattern: SeasonalPattern.YEAR_END, peakSeason: Season.WINTER, peakMultiplier: 1.4, troughMultiplier: 0.8, priceVolatility: 0.18 },   // 家电
  
  // 服装 - 春秋换季
  { goodsId: 43, seasonalPattern: SeasonalPattern.SPRING_AUTUMN, peakSeason: Season.AUTUMN, peakMultiplier: 1.35, troughMultiplier: 0.75, priceVolatility: 0.15 }, // 服装
  
  // 食品饮料 - 夏季高峰
  { goodsId: 45, seasonalPattern: SeasonalPattern.SUMMER_PEAK, peakSeason: Season.SUMMER, peakMultiplier: 1.5, troughMultiplier: 0.7, priceVolatility: 0.1 },  // 饮料
  { goodsId: 44, seasonalPattern: SeasonalPattern.HOLIDAY, peakSeason: Season.WINTER, peakMultiplier: 1.3, troughMultiplier: 0.85, priceVolatility: 0.08 },    // 食品
  
  // 汽车 - 年末促销
  { goodsId: 41, seasonalPattern: SeasonalPattern.YEAR_END, peakSeason: Season.WINTER, peakMultiplier: 1.25, troughMultiplier: 0.85, priceVolatility: 0.1 },   // 汽车
  
  // 奢侈品 - 假日高峰
  { goodsId: 54, seasonalPattern: SeasonalPattern.HOLIDAY, peakSeason: Season.WINTER, peakMultiplier: 1.6, troughMultiplier: 0.7, priceVolatility: 0.2 },      // 珠宝
  { goodsId: 90, seasonalPattern: SeasonalPattern.HOLIDAY, peakSeason: Season.WINTER, peakMultiplier: 1.5, troughMultiplier: 0.75, priceVolatility: 0.18 },    // 钻石饰品
  
  // 学习用品/电子 - 开学季
  // (这里假设有相关商品ID)
];

// 商品ID到季节性配置的映射
const SEASONAL_CONFIG_MAP: Map<number, GoodsSeasonalConfig> = new Map(
  GOODS_SEASONAL_CONFIGS.map(c => [c.goodsId, c])
);

// ==================== 工具函数 ====================

/**
 * 根据tick获取当前季节
 */
export function getCurrentSeason(tick: number): Season {
  const day = Math.floor(tick / TICKS_PER_DAY) + 1;
  const month = ((Math.floor((day - 1) / 30) % 12) + 1);
  
  if (month >= 3 && month <= 5) return Season.SPRING;
  if (month >= 6 && month <= 8) return Season.SUMMER;
  if (month >= 9 && month <= 11) return Season.AUTUMN;
  return Season.WINTER;
}

/**
 * 根据tick获取当前月份
 */
export function getCurrentMonth(tick: number): number {
  const day = Math.floor(tick / TICKS_PER_DAY) + 1;
  return ((Math.floor((day - 1) / 30) % 12) + 1);
}

/**
 * 获取季节名称
 */
export function getSeasonName(season: Season): string {
  return SEASON_INFO[season].name;
}

/**
 * 获取商品的季节性配置
 */
export function getGoodsSeasonalConfig(goodsId: number): GoodsSeasonalConfig | null {
  return SEASONAL_CONFIG_MAP.get(goodsId) ?? null;
}

/**
 * 计算商品在当前时间的季节性需求倍数
 */
export function getSeasonalDemandMultiplier(goodsId: number, tick: number): number {
  const config = SEASONAL_CONFIG_MAP.get(goodsId);
  if (!config) return 1.0;
  
  const currentSeason = getCurrentSeason(tick);
  const baseMultiplier = SEASONAL_PATTERNS[config.seasonalPattern][currentSeason];
  
  // 添加平滑过渡效果
  const dayInMonth = Math.floor(tick / TICKS_PER_DAY) % 30 + 1;
  
  // 获取相邻季节的倍数用于插值
  const nextSeason = ((currentSeason + 1) % 4) as Season;
  const prevSeason = ((currentSeason + 3) % 4) as Season;
  
  const nextMultiplier = SEASONAL_PATTERNS[config.seasonalPattern][nextSeason];
  const prevMultiplier = SEASONAL_PATTERNS[config.seasonalPattern][prevSeason];
  
  // 在季节交界处进行平滑过渡
  let finalMultiplier = baseMultiplier;
  
  // 月初向前过渡
  if (dayInMonth <= 10) {
    const transitionFactor = dayInMonth / 10;
    finalMultiplier = prevMultiplier + (baseMultiplier - prevMultiplier) * transitionFactor;
  }
  // 月末向后过渡
  else if (dayInMonth >= 21) {
    const transitionFactor = (dayInMonth - 20) / 10;
    finalMultiplier = baseMultiplier + (nextMultiplier - baseMultiplier) * transitionFactor;
  }
  
  return finalMultiplier;
}

/**
 * 计算商品的季节性价格修正
 * 供需变化导致的价格波动
 */
export function getSeasonalPriceMultiplier(goodsId: number, tick: number): number {
  const config = SEASONAL_CONFIG_MAP.get(goodsId);
  if (!config) return 1.0;
  
  // 获取需求倍数
  const demandMultiplier = getSeasonalDemandMultiplier(goodsId, tick);
  
  // 价格波动基于需求变化和商品波动性
  const demandDeviation = demandMultiplier - 1;
  const priceEffect = demandDeviation * config.priceVolatility * 0.5;
  
  return 1 + priceEffect;
}

/**
 * 判断当前是否是商品的旺季
 */
export function isPeakSeason(goodsId: number, tick: number): boolean {
  const config = SEASONAL_CONFIG_MAP.get(goodsId);
  if (!config) return false;
  
  const currentSeason = getCurrentSeason(tick);
  return currentSeason === config.peakSeason;
}

/**
 * 判断当前是否是商品的淡季
 */
export function isOffSeason(goodsId: number, tick: number): boolean {
  const config = SEASONAL_CONFIG_MAP.get(goodsId);
  if (!config) return false;
  
  const demandMultiplier = getSeasonalDemandMultiplier(goodsId, tick);
  return demandMultiplier < 0.85;
}

/**
 * 获取商品全年的季节性曲线
 * 返回12个月的需求倍数数组
 */
export function getYearlySeasonalCurve(goodsId: number): number[] {
  const curve: number[] = [];
  
  // 模拟一年中每个月的需求
  for (let month = 1; month <= 12; month++) {
    // 将月份转换为tick（月中）
    const day = (month - 1) * 30 + 15;
    const tick = day * TICKS_PER_DAY;
    curve.push(getSeasonalDemandMultiplier(goodsId, tick));
  }
  
  return curve;
}

/**
 * 获取季节性事件列表
 */
export interface SeasonalEvent {
  name: string;
  description: string;
  month: number;
  duration: number;  // 天数
  affectedGoods: number[];
  demandBoost: number;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    name: '春节',
    description: '传统佳节，消费需求激增',
    month: 2,
    duration: 14,
    affectedGoods: [44, 45, 54, 90, 43], // 食品、饮料、珠宝、钻石饰品、服装
    demandBoost: 0.5,
  },
  {
    name: '五一黄金周',
    description: '劳动节假期，旅游消费高峰',
    month: 5,
    duration: 7,
    affectedGoods: [45, 44, 26], // 饮料、食品、电子元件
    demandBoost: 0.3,
  },
  {
    name: '双十一购物节',
    description: '电商大促，各类商品销量激增',
    month: 11,
    duration: 3,
    affectedGoods: [40, 55, 43, 54], // 家电、高端手机、服装、珠宝
    demandBoost: 0.8,
  },
  {
    name: '圣诞新年季',
    description: '年末节日消费高峰',
    month: 12,
    duration: 14,
    affectedGoods: [54, 90, 55, 40, 44], // 珠宝、钻石饰品、高端手机、家电、食品
    demandBoost: 0.4,
  },
  {
    name: '开学季',
    description: '学生返校，文具电子需求上升',
    month: 9,
    duration: 10,
    affectedGoods: [56, 43], // 平价手机、服装
    demandBoost: 0.35,
  },
];

/**
 * 检查当前是否有活跃的季节性事件
 */
export function getActiveSeasonalEvents(tick: number): SeasonalEvent[] {
  const month = getCurrentMonth(tick);
  const day = Math.floor(tick / TICKS_PER_DAY) % 30 + 1;
  
  return SEASONAL_EVENTS.filter(event => {
    if (event.month !== month) return false;
    return day >= 1 && day <= event.duration;
  });
}

/**
 * 计算季节性事件对商品的额外需求加成
 */
export function getEventDemandBoost(goodsId: number, tick: number): number {
  const activeEvents = getActiveSeasonalEvents(tick);
  
  let totalBoost = 0;
  for (const event of activeEvents) {
    if (event.affectedGoods.includes(goodsId)) {
      totalBoost += event.demandBoost;
    }
  }
  
  return totalBoost;
}

/**
 * 获取商品的综合季节性需求倍数（包含事件）
 */
export function getTotalSeasonalMultiplier(goodsId: number, tick: number): number {
  const baseMultiplier = getSeasonalDemandMultiplier(goodsId, tick);
  const eventBoost = getEventDemandBoost(goodsId, tick);
  
  return baseMultiplier * (1 + eventBoost);
}

/**
 * 格式化季节性状态
 */
export function formatSeasonalStatus(goodsId: number, tick: number): string {
  const season = getCurrentSeason(tick);
  const multiplier = getSeasonalDemandMultiplier(goodsId, tick);
  const events = getActiveSeasonalEvents(tick);
  
  let status = `${SEASON_INFO[season].name}`;
  
  if (multiplier > 1.2) {
    status += ' (旺季)';
  } else if (multiplier < 0.8) {
    status += ' (淡季)';
  }
  
  if (events.length > 0) {
    status += ` [${events[0].name}]`;
  }
  
  return status;
}
