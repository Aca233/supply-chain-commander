/**
 * 月度统计数据收集器
 * 在月末收集当月的各项统计数据
 */

import { GameWorld, tickToDate } from '@/core/world/GameWorld';
import { ALL_GOODS } from '@/data/goods';
import { MonthlyStats, MonthSnapshot, GameEvent } from './types';
import { getMonthEvents } from './EventTracker';
import { GOODS_COUNT } from '@/core/constants';
import { forEachRetainedTradeOldestFirst } from '@/core/market/TradeLedger';

// 月初快照存储
let monthStartSnapshot: MonthSnapshot | null = null;

/**
 * 计算玩家建筑数量
 */
function countPlayerBuildings(world: GameWorld): number {
  let count = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === 0) count++;
  }
  return count;
}

/**
 * 在月初记录快照
 */
export function captureMonthStartSnapshot(world: GameWorld): void {
  const date = tickToDate(world.tick);
  
  monthStartSnapshot = {
    tick: world.tick,
    year: date.year,
    month: date.month,
    prices: new Float32Array(world.goods.prices),
    companyCash: new Float64Array(world.companies.cash),
    companyAssets: new Float64Array(world.companies.totalAssets),
    playerCash: world.companies.cash[0],
    playerBuildings: countPlayerBuildings(world),
    gdp: world.economyStats.gdp,
  };
  
  console.log(`[MonthlyStats] Captured snapshot for ${date.year}-${date.month}`);
}

/**
 * 获取当前月初快照
 */
export function getMonthStartSnapshot(): MonthSnapshot | null {
  return monthStartSnapshot;
}

/**
 * 收集月度统计数据
 */
export function collectMonthlyStats(world: GameWorld): MonthlyStats {
  const date = tickToDate(world.tick);
  
  // 获取上个月的事件（因为是在月初生成上月新闻）
  let eventYear = date.year;
  let eventMonth = date.month - 1;
  if (eventMonth < 1) {
    eventMonth = 12;
    eventYear -= 1;
  }
  
  const events = getMonthEvents(eventYear, eventMonth);
  
  // 计算价格变化
  const priceChanges = calculatePriceChanges(world);
  
  // 计算公司排行
  const companyRankings = calculateCompanyRankings(world, events);
  
  // 计算玩家统计
  const playerStats = calculatePlayerStats(world, events);
  
  // 提取灾难事件
  const disasters = events
    .filter(e => e.type === 'disaster')
    .map(e => ({
      type: e.data.disasterType as string,
      severity: e.data.severity as string,
      tick: e.tick,
      impact: e.data.impact as string,
    }));
  
  // 提取重大事件
  const majorEvents = extractMajorEvents(events);
  
  // 计算GDP变化
  let gdpChange = 0;
  if (monthStartSnapshot && monthStartSnapshot.gdp > 0) {
    gdpChange = ((world.economyStats.gdp - monthStartSnapshot.gdp) / monthStartSnapshot.gdp) * 100;
  }
  
  return {
    economy: {
      gdp: world.economyStats.gdp,
      gdpChange,
      inflation: world.economyStats.inflation,
      unemployment: world.economyStats.unemployment,
      cyclePhase: world.economyStats.cyclePhase,
    },
    priceChanges,
    companyRankings,
    playerStats,
    disasters,
    majorEvents,
  };
}

/**
 * 计算价格变化 Top 10
 */
function calculatePriceChanges(world: GameWorld): MonthlyStats['priceChanges'] {
  if (!monthStartSnapshot) {
    // 没有快照，返回空数组
    return [];
  }
  
  const changes: MonthlyStats['priceChanges'] = [];
  
  for (let i = 0; i < world.goods.count; i++) {
    const startPrice = monthStartSnapshot.prices[i];
    const endPrice = world.goods.prices[i];
    
    // 跳过价格为0的商品
    if (startPrice <= 0 || endPrice <= 0) continue;
    
    const changePercent = ((endPrice - startPrice) / startPrice) * 100;
    
    const goodsDef = ALL_GOODS.find(g => g.id === i);
    
    changes.push({
      goodsId: i,
      goodsName: goodsDef?.name || `商品${i}`,
      startPrice,
      endPrice,
      changePercent,
    });
  }
  
  // 按变化幅度绝对值排序，取前10
  changes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  return changes.slice(0, 10);
}

/**
 * 计算公司排行
 */
function calculateCompanyRankings(world: GameWorld, events: GameEvent[]): MonthlyStats['companyRankings'] {
  const companies: Array<{
    id: number;
    name: string;
    cash: number;
    assets: number;
    buildings: number;
    isAI: boolean;
  }> = [];
  
  for (let i = 0; i < world.companies.count; i++) {
    companies.push({
      id: i,
      name: world.companies.names[i],
      cash: world.companies.cash[i],
      assets: world.companies.totalAssets[i],
      buildings: world.companies.buildingCounts[i],
      isAI: world.companies.isAI[i],
    });
  }
  
  // 最富有（排除玩家，取AI公司）
  const richest = companies
    .filter(c => c.isAI && c.cash > 0)
    .sort((a, b) => b.cash - a.cash)
    .slice(0, 5)
    .map(c => ({ id: c.id, name: c.name, cash: c.cash }));
  
  // 最多建筑
  const mostBuildings = companies
    .filter(c => c.isAI && c.buildings > 0)
    .sort((a, b) => b.buildings - a.buildings)
    .slice(0, 5)
    .map(c => ({ id: c.id, name: c.name, count: c.buildings }));
  
  // 增长最快（需要月初快照）
  let mostGrowth: Array<{ id: number; name: string; growthPercent: number }> = [];
  if (monthStartSnapshot) {
    mostGrowth = companies
      .filter(c => c.isAI && monthStartSnapshot!.companyCash[c.id] > 100000) // 排除资金太少的
      .map(c => {
        const startCash = monthStartSnapshot!.companyCash[c.id];
        const growthPercent = ((c.cash - startCash) / startCash) * 100;
        return {
          id: c.id,
          name: c.name,
          growthPercent,
        };
      })
      .filter(c => isFinite(c.growthPercent))
      .sort((a, b) => b.growthPercent - a.growthPercent)
      .slice(0, 5);
  }
  
  // 破产公司
  const bankrupt = events
    .filter(e => e.type === 'company_bankrupt')
    .map(e => ({ 
      id: e.data.companyId as number, 
      name: e.data.companyName as string 
    }));
  
  return { richest, mostBuildings, mostGrowth, bankrupt };
}

/**
 * 计算玩家统计
 * 直接从GameWorld中统计玩家交易和建筑数据，不依赖事件追踪
 */
function calculatePlayerStats(world: GameWorld, events: GameEvent[]): MonthlyStats['playerStats'] {
  const currentCash = world.companies.cash[0];
  const currentBuildings = countPlayerBuildings(world);
  
  const startCash = monthStartSnapshot?.playerCash || currentCash;
  const startBuildings = monthStartSnapshot?.playerBuildings || currentBuildings;
  
  // 直接从 world.trades 统计玩家交易
  // 统计最近两个月（约1440 ticks）的玩家交易
  const startTick = monthStartSnapshot?.tick || 0;
  const trades = world.trades;
  
  let tradesCompleted = 0;
  let totalTradeValue = 0;
  let largestTradeValue = 0;
  let largestTradeGoodsId = -1;
  
  // 遍历交易记录，找到玩家参与的交易
  forEachRetainedTradeOldestFirst(world, idx => {
    const tradeTick = trades.ticks[idx];
    
    // 只统计快照之后的交易
    if (tradeTick < startTick) return;
    
    const buyCompanyId = trades.buyCompanyIds[idx];
    const sellCompanyId = trades.sellCompanyIds[idx];
    const quantity = trades.quantities[idx];
    const price = trades.prices[idx];
    const value = quantity * price;
    
    // 检查玩家是否参与（玩家公司ID = 0）
    if (buyCompanyId === 0 || sellCompanyId === 0) {
      tradesCompleted++;
      totalTradeValue += value;
      
      if (value > largestTradeValue) {
        largestTradeValue = value;
        largestTradeGoodsId = trades.goodsIds[idx];
      }
    }
  });
  
  // 计算建筑变化
  const buildingsBuilt = Math.max(0, currentBuildings - startBuildings);
  const buildingsDemolished = Math.max(0, startBuildings - currentBuildings);
  
  // 获取最大交易的商品名称
  let largestTrade: { goodsName: string; value: number } | undefined;
  if (largestTradeGoodsId >= 0 && largestTradeValue > 0) {
    const goodsDef = ALL_GOODS.find(g => g.id === largestTradeGoodsId);
    largestTrade = {
      goodsName: goodsDef?.name || `商品${largestTradeGoodsId}`,
      value: largestTradeValue,
    };
  }
  
  return {
    cashChange: currentCash - startCash,
    cashChangePercent: startCash > 0 ? ((currentCash - startCash) / startCash) * 100 : 0,
    buildingsBuilt,
    buildingsDemolished,
    tradesCompleted,
    totalTradeValue,
    largestTrade,
  };
}

/**
 * 提取重大事件
 */
function extractMajorEvents(events: GameEvent[]): MonthlyStats['majorEvents'] {
  const majorEventTypes = [
    'company_ipo', 
    'company_acquisition', 
    'economic_event', 
    'market_milestone'
  ];
  
  return events
    .filter(e => majorEventTypes.includes(e.type))
    .slice(0, 10)
    .map(e => ({
      type: e.type,
      description: formatEventDescription(e),
      tick: e.tick,
    }));
}

/**
 * 格式化事件描述
 */
function formatEventDescription(event: GameEvent): string {
  switch (event.type) {
    case 'company_ipo':
      return `${event.data.companyName} 成功上市，发行${event.data.shares}股`;
    case 'company_acquisition':
      return `${event.data.acquirerName} 收购了 ${event.data.targetName}`;
    case 'economic_event':
      return event.data.description as string || '经济事件发生';
    case 'market_milestone':
      return event.data.description as string || '市场里程碑';
    default:
      return '重大事件';
  }
}

/**
 * 重置月度统计（游戏重新开始时调用）
 */
export function resetMonthlyStats(): void {
  monthStartSnapshot = null;
}
