/**
 * 月度价格追踪系统
 * 记录每月商品价格变化，支持多月份对比和基准价格对比
 */

import { GameWorld, tickToDate } from '../world/GameWorld';
import { ACTUAL_GOODS_COUNT, GOODS_COUNT, TICKS_PER_DAY, MAX_SUPPLY_DEMAND_RATIO } from '../constants';
import { ALL_GOODS, GOODS_BY_ID } from '@/data/goods';
import { getPriceCache } from '../market/PriceCache';

// ==================== 类型定义 ====================

/** 单个商品的月初快照 */
export interface GoodsSnapshot {
  goodsId: number;
  price: number;        // 月初价格
  supply: number;       // 月初供给
  demand: number;       // 月初需求
}

/** 月度快照 */
export interface MonthlySnapshot {
  year: number;
  month: number;
  startTick: number;
  snapshots: GoodsSnapshot[];
}

/** 单个商品的月度统计 */
export interface GoodsMonthlyStats {
  goodsId: number;
  name: string;
  category: string;
  
  // 价格数据
  startPrice: number;       // 月初价格
  endPrice: number;         // 月末价格
  highPrice: number;        // 月内最高价
  lowPrice: number;         // 月内最低价
  changePercent: number;    // 涨跌幅 (%)
  changeAbsolute: number;   // 涨跌金额
  
  // 基准价格对比
  basePrice: number;        // 游戏初始基准价格
  baseChangePercent: number; // 相对于基准价格的变化 (%)
  baseChangeAbsolute: number; // 相对于基准价格的绝对变化
  
  // 供需数据
  startSupply: number;      // 月初供给
  endSupply: number;        // 月末供给
  startDemand: number;      // 月初需求
  endDemand: number;        // 月末需求
  avgSupplyDemandRatio: number;  // 月均供需比
  
  // 成交数据
  totalVolume: number;      // 月度总成交量
  totalValue: number;       // 月度总成交额
  tradeCount: number;       // 月度成交笔数
  avgPrice: number;         // 月均成交价 (VWAP)
}

/** 完整月度报告 */
export interface MonthlyPriceReport {
  id: string;             // 唯一ID: "YYYY-MM"
  year: number;
  month: number;
  startTick: number;
  endTick: number;
  generateTime: number;   // 生成时间戳
  
  // 市场概览
  summary: {
    totalGoods: number;
    risingCount: number;
    fallingCount: number;
    unchangedCount: number;
    topGainers: GoodsMonthlyStats[];  // 涨幅前5
    topLosers: GoodsMonthlyStats[];   // 跌幅前5
    mostActive: GoodsMonthlyStats[];  // 成交量前5
  };
  
  // 所有商品详细数据
  goods: GoodsMonthlyStats[];
}

/** 多月份对比数据结构 */
export interface MonthComparisonData {
  goodsId: number;
  name: string;
  category: string;
  basePrice: number;
  
  months: {
    [monthKey: string]: {
      endPrice: number;
      changePercent: number;
      baseChangePercent: number;
      volume: number;
      supplyDemandRatio: number;
    };
  };
}

/** 对比报告 */
export interface MultiMonthComparisonReport {
  generatedAt: number;
  monthKeys: string[];
  goods: MonthComparisonData[];
}

// ==================== 高低价追踪器 ====================

class PriceExtremeTracker {
  private highs: Float32Array;
  private lows: Float32Array;
  private volumes: Float32Array;
  private values: Float64Array;
  private tradeCounts: Uint32Array;
  private supplyDemandRatioSum: Float32Array;
  private supplyDemandCount: Uint32Array;
  
  constructor() {
    this.highs = new Float32Array(GOODS_COUNT);
    this.lows = new Float32Array(GOODS_COUNT);
    this.volumes = new Float32Array(GOODS_COUNT);
    this.values = new Float64Array(GOODS_COUNT);
    this.tradeCounts = new Uint32Array(GOODS_COUNT);
    this.supplyDemandRatioSum = new Float32Array(GOODS_COUNT);
    this.supplyDemandCount = new Uint32Array(GOODS_COUNT);
    this.reset();
  }
  
  reset(): void {
    this.highs.fill(0);
    this.lows.fill(Infinity);
    this.volumes.fill(0);
    this.values.fill(0);
    this.tradeCounts.fill(0);
    this.supplyDemandRatioSum.fill(0);
    this.supplyDemandCount.fill(0);
  }
  
  update(world: GameWorld): void {
    const g = world.goods;
    const priceCache = getPriceCache();
    priceCache.update(world);
    
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      const price = g.prices[i];
      
      // 更新最高价
      if (price > this.highs[i]) {
        this.highs[i] = price;
      }
      
      // 更新最低价
      if (price < this.lows[i] && price > 0) {
        this.lows[i] = price;
      }
      
      // 累计成交量和成交额（从PriceCache获取）
      const volume1h = priceCache.getVolume1h(i);
      const stats = priceCache.getStats(i);
      if (stats && volume1h > 0) {
        this.volumes[i] += volume1h;
        this.values[i] += volume1h * (stats.vwap || price);
        this.tradeCounts[i]++;
      }
      
      // 累计供需比（限制在合理范围内）
      const supply = g.supplies[i];
      const demand = g.demands[i];
      if (supply > 0 || demand > 0) {
        // 计算供需比，使用更安全的分母（至少为1）
        // 并限制最大值为MAX_SUPPLY_DEMAND_RATIO
        const safeDenominator = Math.max(supply, 1);
        const ratio = Math.min(demand / safeDenominator, MAX_SUPPLY_DEMAND_RATIO);
        this.supplyDemandRatioSum[i] += ratio;
        this.supplyDemandCount[i]++;
      }
    }
  }
  
  getStats(goodsId: number): {
    high: number;
    low: number;
    volume: number;
    value: number;
    tradeCount: number;
    avgSupplyDemandRatio: number;
  } {
    return {
      high: this.highs[goodsId],
      low: this.lows[goodsId] === Infinity ? 0 : this.lows[goodsId],
      volume: this.volumes[goodsId],
      value: this.values[goodsId],
      tradeCount: this.tradeCounts[goodsId],
      avgSupplyDemandRatio: this.supplyDemandCount[goodsId] > 0
        ? this.supplyDemandRatioSum[goodsId] / this.supplyDemandCount[goodsId]
        : 1.0,
    };
  }
}

// ==================== 月度价格追踪器 ====================

class MonthlyPriceTrackerImpl {
  private currentSnapshot: MonthlySnapshot | null = null;
  private extremeTracker: PriceExtremeTracker;
  private reports: MonthlyPriceReport[] = [];
  private lastMonth: number = -1;
  private lastYear: number = -1;
  private monthStartTick: number = 0;
  private initialized: boolean = false;
  
  // 持久化相关
  private readonly STORAGE_KEY = 'game_monthly_price_reports';
  private readonly MAX_REPORTS = 12;
  
  constructor() {
    this.extremeTracker = new PriceExtremeTracker();
    this.loadFromStorage();
  }
  
  /** 每tick调用，检测月份变化并更新追踪数据 */
  update(world: GameWorld): void {
    const date = tickToDate(world.tick);
    
    // 首次初始化
    if (!this.initialized) {
      this.lastMonth = date.month;
      this.lastYear = date.year;
      this.monthStartTick = world.tick;
      this.captureSnapshot(world);
      this.initialized = true;
      return;
    }
    
    // 检测月份变化
    if (date.month !== this.lastMonth || date.year !== this.lastYear) {
      // 月末：生成上月报告
      this.generateReport(world, this.lastYear, this.lastMonth);
      
      // 月初：捕获新快照
      this.lastMonth = date.month;
      this.lastYear = date.year;
      this.monthStartTick = world.tick;
      this.extremeTracker.reset();
      this.captureSnapshot(world);
    }
    
    // 每tick更新极值追踪
    this.extremeTracker.update(world);
  }
  
  /** 捕获月初快照 */
  private captureSnapshot(world: GameWorld): void {
    const date = tickToDate(world.tick);
    const g = world.goods;
    
    const snapshots: GoodsSnapshot[] = [];
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      snapshots.push({
        goodsId: i,
        price: g.prices[i],
        supply: g.supplies[i],
        demand: g.demands[i],
      });
    }
    
    this.currentSnapshot = {
      year: date.year,
      month: date.month,
      startTick: world.tick,
      snapshots,
    };
  }
  
  /** 生成月度报告 */
  private generateReport(world: GameWorld, year: number, month: number): void {
    if (!this.currentSnapshot) return;
    
    const g = world.goods;
    const goodsStats: GoodsMonthlyStats[] = [];
    
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      const snapshot = this.currentSnapshot.snapshots.find(s => s.goodsId === i);
      if (!snapshot) continue;
      
      const goodsDef = GOODS_BY_ID.get(i);
      if (!goodsDef) continue;
      
      const startPrice = snapshot.price;
      const endPrice = g.prices[i];
      const basePrice = goodsDef.basePrice;
      const extreme = this.extremeTracker.getStats(i);
      
      const changeAbsolute = endPrice - startPrice;
      const changePercent = startPrice > 0 ? (changeAbsolute / startPrice) * 100 : 0;
      const baseChangeAbsolute = endPrice - basePrice;
      const baseChangePercent = basePrice > 0 ? (baseChangeAbsolute / basePrice) * 100 : 0;
      
      const stats: GoodsMonthlyStats = {
        goodsId: i,
        name: goodsDef.name,
        category: goodsDef.category,
        
        startPrice,
        endPrice,
        highPrice: extreme.high || endPrice,
        lowPrice: extreme.low || endPrice,
        changePercent,
        changeAbsolute,
        
        basePrice,
        baseChangePercent,
        baseChangeAbsolute,
        
        startSupply: snapshot.supply,
        endSupply: g.supplies[i],
        startDemand: snapshot.demand,
        endDemand: g.demands[i],
        avgSupplyDemandRatio: extreme.avgSupplyDemandRatio,
        
        totalVolume: extreme.volume,
        totalValue: extreme.value,
        tradeCount: extreme.tradeCount,
        avgPrice: extreme.volume > 0 ? extreme.value / extreme.volume : endPrice,
      };
      
      goodsStats.push(stats);
    }
    
    // 计算汇总数据
    let risingCount = 0;
    let fallingCount = 0;
    let unchangedCount = 0;
    
    for (const stat of goodsStats) {
      if (stat.changePercent > 1) risingCount++;
      else if (stat.changePercent < -1) fallingCount++;
      else unchangedCount++;
    }
    
    // 排序获取Top列表
    const sortedByChange = [...goodsStats].sort((a, b) => b.changePercent - a.changePercent);
    const sortedByVolume = [...goodsStats].sort((a, b) => b.totalVolume - a.totalVolume);
    
    const report: MonthlyPriceReport = {
      id: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      startTick: this.monthStartTick,
      endTick: world.tick,
      generateTime: Date.now(),
      
      summary: {
        totalGoods: goodsStats.length,
        risingCount,
        fallingCount,
        unchangedCount,
        topGainers: sortedByChange.slice(0, 5),
        topLosers: sortedByChange.slice(-5).reverse(),
        mostActive: sortedByVolume.slice(0, 5),
      },
      
      goods: goodsStats,
    };
    
    // 保存报告
    this.reports.push(report);
    
    // 限制报告数量
    if (this.reports.length > this.MAX_REPORTS) {
      this.reports = this.reports.slice(-this.MAX_REPORTS);
    }
    
    // 持久化
    this.saveToStorage();
    
    console.log(`[MonthlyPriceTracker] Generated report for ${year}-${month}, ${goodsStats.length} goods`);
  }
  
  /** 获取最新报告 */
  getLatestReport(): MonthlyPriceReport | null {
    if (this.reports.length === 0) return null;
    return this.reports[this.reports.length - 1];
  }
  
  /** 获取所有历史报告 */
  getAllReports(): MonthlyPriceReport[] {
    return [...this.reports];
  }
  
  /** 根据月份key获取报告 */
  getReportByKey(monthKey: string): MonthlyPriceReport | null {
    return this.reports.find(r => r.id === monthKey) || null;
  }
  
  /** 获取可用月份列表 */
  getAvailableMonths(): Array<{ key: string; label: string }> {
    return this.reports.map(r => ({
      key: r.id,
      label: `${r.year}年${r.month}月`,
    }));
  }
  
  /** 获取当前月份实时数据 */
  getCurrentMonthData(world: GameWorld): MonthlyPriceReport | null {
    if (!this.currentSnapshot) return null;
    
    const date = tickToDate(world.tick);
    const g = world.goods;
    const goodsStats: GoodsMonthlyStats[] = [];
    
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      const snapshot = this.currentSnapshot.snapshots.find(s => s.goodsId === i);
      if (!snapshot) continue;
      
      const goodsDef = GOODS_BY_ID.get(i);
      if (!goodsDef) continue;
      
      const startPrice = snapshot.price;
      const endPrice = g.prices[i];
      const basePrice = goodsDef.basePrice;
      const extreme = this.extremeTracker.getStats(i);
      
      const changeAbsolute = endPrice - startPrice;
      const changePercent = startPrice > 0 ? (changeAbsolute / startPrice) * 100 : 0;
      const baseChangeAbsolute = endPrice - basePrice;
      const baseChangePercent = basePrice > 0 ? (baseChangeAbsolute / basePrice) * 100 : 0;
      
      goodsStats.push({
        goodsId: i,
        name: goodsDef.name,
        category: goodsDef.category,
        startPrice,
        endPrice,
        highPrice: extreme.high || endPrice,
        lowPrice: extreme.low || endPrice,
        changePercent,
        changeAbsolute,
        basePrice,
        baseChangePercent,
        baseChangeAbsolute,
        startSupply: snapshot.supply,
        endSupply: g.supplies[i],
        startDemand: snapshot.demand,
        endDemand: g.demands[i],
        avgSupplyDemandRatio: extreme.avgSupplyDemandRatio,
        totalVolume: extreme.volume,
        totalValue: extreme.value,
        tradeCount: extreme.tradeCount,
        avgPrice: extreme.volume > 0 ? extreme.value / extreme.volume : endPrice,
      });
    }
    
    // 计算汇总
    let risingCount = 0, fallingCount = 0, unchangedCount = 0;
    for (const stat of goodsStats) {
      if (stat.changePercent > 1) risingCount++;
      else if (stat.changePercent < -1) fallingCount++;
      else unchangedCount++;
    }
    
    const sortedByChange = [...goodsStats].sort((a, b) => b.changePercent - a.changePercent);
    const sortedByVolume = [...goodsStats].sort((a, b) => b.totalVolume - a.totalVolume);
    
    return {
      id: 'current',
      year: date.year,
      month: date.month,
      startTick: this.monthStartTick,
      endTick: world.tick,
      generateTime: Date.now(),
      summary: {
        totalGoods: goodsStats.length,
        risingCount,
        fallingCount,
        unchangedCount,
        topGainers: sortedByChange.slice(0, 5),
        topLosers: sortedByChange.slice(-5).reverse(),
        mostActive: sortedByVolume.slice(0, 5),
      },
      goods: goodsStats,
    };
  }
  
  /** 生成多月份对比报告 */
  getMultiMonthComparison(monthKeys: string[]): MultiMonthComparisonReport | null {
    if (monthKeys.length < 2) return null;
    
    const validReports = monthKeys
      .map(key => this.getReportByKey(key))
      .filter((r): r is MonthlyPriceReport => r !== null);
    
    if (validReports.length < 2) return null;
    
    const comparisonGoods: MonthComparisonData[] = [];
    
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      const goodsDef = GOODS_BY_ID.get(i);
      if (!goodsDef) continue;
      
      const months: MonthComparisonData['months'] = {};
      
      for (const report of validReports) {
        const goodsStat = report.goods.find(g => g.goodsId === i);
        if (goodsStat) {
          months[report.id] = {
            endPrice: goodsStat.endPrice,
            changePercent: goodsStat.changePercent,
            baseChangePercent: goodsStat.baseChangePercent,
            volume: goodsStat.totalVolume,
            supplyDemandRatio: goodsStat.avgSupplyDemandRatio,
          };
        }
      }
      
      if (Object.keys(months).length > 0) {
        comparisonGoods.push({
          goodsId: i,
          name: goodsDef.name,
          category: goodsDef.category,
          basePrice: goodsDef.basePrice,
          months,
        });
      }
    }
    
    return {
      generatedAt: Date.now(),
      monthKeys: validReports.map(r => r.id),
      goods: comparisonGoods,
    };
  }
  
  /** 重置追踪器 */
  reset(): void {
    this.currentSnapshot = null;
    this.extremeTracker.reset();
    this.reports = [];
    this.lastMonth = -1;
    this.lastYear = -1;
    this.monthStartTick = 0;
    this.initialized = false;
    this.saveToStorage();
  }
  
  /** 从localStorage加载 */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          this.reports = data;
        }
      }
    } catch (e) {
      console.warn('[MonthlyPriceTracker] Failed to load from storage:', e);
    }
  }
  
  /** 保存到localStorage */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.reports));
    } catch (e) {
      console.warn('[MonthlyPriceTracker] Failed to save to storage:', e);
    }
  }
}

// ==================== 单例导出 ====================

let trackerInstance: MonthlyPriceTrackerImpl | null = null;

export function getMonthlyPriceTracker(): MonthlyPriceTrackerImpl {
  if (!trackerInstance) {
    trackerInstance = new MonthlyPriceTrackerImpl();
  }
  return trackerInstance;
}

export function resetMonthlyPriceTracker(): void {
  if (trackerInstance) {
    trackerInstance.reset();
  }
  trackerInstance = new MonthlyPriceTrackerImpl();
}

/** 每tick调用的更新函数 */
export function updateMonthlyTracker(world: GameWorld): void {
  getMonthlyPriceTracker().update(world);
}

// ==================== 辅助函数 ====================

/** 获取商品的基准价格 */
export function getGoodsBasePrice(goodsId: number): number {
  const def = GOODS_BY_ID.get(goodsId);
  return def?.basePrice ?? 0;
}

/** 获取所有商品的基准价格映射 */
export function getAllGoodsBasePrices(): Map<number, number> {
  const map = new Map<number, number>();
  for (const goods of ALL_GOODS) {
    map.set(goods.id, goods.basePrice);
  }
  return map;
}