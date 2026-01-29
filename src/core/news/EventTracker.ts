/**
 * 事件追踪器
 * 在游戏运行过程中记录重要事件，供月度报告使用
 */

import { GameEvent, GameEventType } from './types';

// 事件存储（按月份分组）
const eventsByMonth = new Map<string, GameEvent[]>();

// 当前月份的事件
let currentMonthEvents: GameEvent[] = [];
let currentMonthKey = '';

/**
 * 获取月份key
 */
function getMonthKey(tick: number): string {
  const day = Math.floor(tick / 24) + 1;
  const month = Math.floor((day - 1) / 30) + 1;
  const year = Math.floor((month - 1) / 12) + 1;
  const monthOfYear = ((month - 1) % 12) + 1;
  return `${year}-${monthOfYear}`;
}

/**
 * 记录事件
 */
export function trackEvent(
  type: GameEventType,
  tick: number,
  data: Record<string, unknown>
): void {
  const monthKey = getMonthKey(tick);
  
  // 检测月份变化
  if (monthKey !== currentMonthKey) {
    if (currentMonthKey) {
      eventsByMonth.set(currentMonthKey, [...currentMonthEvents]);
    }
    currentMonthKey = monthKey;
    currentMonthEvents = [];
  }
  
  const event: GameEvent = {
    id: `${type}_${tick}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    tick,
    data,
  };
  
  currentMonthEvents.push(event);
  
  // 限制每月事件数量，避免内存溢出
  if (currentMonthEvents.length > 1000) {
    currentMonthEvents = currentMonthEvents.slice(-500);
  }
}

/**
 * 获取指定月份的事件
 */
export function getMonthEvents(year: number, month: number): GameEvent[] {
  const key = `${year}-${month}`;
  if (key === currentMonthKey) {
    return [...currentMonthEvents];
  }
  return eventsByMonth.get(key) || [];
}

/**
 * 获取当前月份的事件
 */
export function getCurrentMonthEvents(): GameEvent[] {
  return [...currentMonthEvents];
}

/**
 * 清理旧事件（保留最近12个月）
 */
export function cleanupOldEvents(currentTick: number): void {
  const currentKey = getMonthKey(currentTick);
  const [currentYear, currentMonth] = currentKey.split('-').map(Number);
  
  const keysToDelete: string[] = [];
  
  eventsByMonth.forEach((_, key) => {
    const [year, month] = key.split('-').map(Number);
    const monthsDiff = (currentYear - year) * 12 + (currentMonth - month);
    if (monthsDiff > 12) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => eventsByMonth.delete(key));
}

/**
 * 重置事件追踪器（游戏重新开始时调用）
 */
export function resetEventTracker(): void {
  eventsByMonth.clear();
  currentMonthEvents = [];
  currentMonthKey = '';
}

// ==================== 便捷事件记录函数 ====================

/**
 * 记录公司破产事件
 */
export function trackCompanyBankrupt(tick: number, companyId: number, companyName: string): void {
  trackEvent('company_bankrupt', tick, { companyId, companyName });
}

/**
 * 记录公司IPO事件
 */
export function trackCompanyIPO(tick: number, companyId: number, companyName: string, shares: number, price: number): void {
  trackEvent('company_ipo', tick, { companyId, companyName, shares, price });
}

/**
 * 记录公司收购事件
 */
export function trackCompanyAcquisition(tick: number, acquirerId: number, acquirerName: string, targetId: number, targetName: string): void {
  trackEvent('company_acquisition', tick, { acquirerId, acquirerName, targetId, targetName });
}

/**
 * 记录价格冲击事件
 */
export function trackPriceShock(tick: number, goodsId: number, goodsName: string, type: 'surge' | 'crash', changePercent: number): void {
  trackEvent('price_shock', tick, { goodsId, goodsName, type, changePercent });
}

/**
 * 记录灾难事件
 */
export function trackDisaster(tick: number, disasterType: string, severity: string, impact: string): void {
  trackEvent('disaster', tick, { disasterType, severity, impact });
}

/**
 * 记录经济事件
 */
export function trackEconomicEvent(tick: number, eventType: string, description: string): void {
  trackEvent('economic_event', tick, { eventType, description });
}

/**
 * 记录玩家建造/拆除建筑
 */
export function trackPlayerBuilding(tick: number, action: 'built' | 'demolished', buildingType: string, buildingName: string): void {
  const eventType = action === 'built' ? 'player_building_built' : 'player_building_demolished';
  trackEvent(eventType, tick, { buildingType, buildingName });
}

/**
 * 记录大额交易
 */
export function trackLargeTrade(tick: number, isPlayer: boolean, goodsId: number, goodsName: string, value: number, quantity: number): void {
  const eventType = isPlayer ? 'player_large_trade' : 'ai_large_trade';
  trackEvent(eventType, tick, { goodsId, goodsName, value, quantity });
}

/**
 * 记录市场里程碑事件
 */
export function trackMarketMilestone(tick: number, milestone: string, description: string): void {
  trackEvent('market_milestone', tick, { milestone, description });
}