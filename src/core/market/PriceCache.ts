/**
 * 价格缓存系统
 * 批量预计算所有商品的VWAP和Volume，避免重复遍历交易历史
 */

import { GOODS_COUNT, ACTUAL_GOODS_COUNT } from '../constants';
import { GameWorld } from '../world/GameWorld';

/**
 * 价格统计数据
 */
export interface PriceStats {
  vwap: number;           // 成交量加权平均价格
  volume: number;         // 成交量
  value: number;          // 成交额
  tradeCount: number;     // 成交笔数
  lastPrice: number;      // 最新成交价
  high: number;           // 最高价
  low: number;            // 最低价
  open: number;           // 开盘价
  close: number;          // 收盘价
}

/**
 * 价格缓存类
 * 一次遍历计算所有商品的价格统计
 */
export class PriceCache {
  // 24小时统计数据
  private vwap24h: Float32Array;
  private volume24h: Float32Array;
  private value24h: Float32Array;
  private tradeCount24h: Uint16Array;
  private lastPrice: Float32Array;
  private high24h: Float32Array;
  private low24h: Float32Array;
  
  // 1小时统计数据
  private vwap1h: Float32Array;
  private volume1h: Float32Array;
  
  // 缓存元数据
  private lastUpdateTick: number = -1;
  private goodsCount: number;
  
  // 临时累加器（避免每次创建新数组）
  private tempValue: Float32Array;
  private tempVolume: Float32Array;
  
  constructor(goodsCount: number = GOODS_COUNT) {
    this.goodsCount = goodsCount;
    
    // 分配内存
    this.vwap24h = new Float32Array(goodsCount);
    this.volume24h = new Float32Array(goodsCount);
    this.value24h = new Float32Array(goodsCount);
    this.tradeCount24h = new Uint16Array(goodsCount);
    this.lastPrice = new Float32Array(goodsCount);
    this.high24h = new Float32Array(goodsCount);
    this.low24h = new Float32Array(goodsCount);
    
    this.vwap1h = new Float32Array(goodsCount);
    this.volume1h = new Float32Array(goodsCount);
    
    this.tempValue = new Float32Array(goodsCount);
    this.tempVolume = new Float32Array(goodsCount);
    
    // 初始化low为最大值
    this.low24h.fill(Infinity);
  }
  
  /**
   * 批量更新所有商品的价格缓存
   * 只遍历一次交易历史，计算所有商品的统计数据
   */
  update(world: GameWorld): void {
    const currentTick = world.tick;
    
    // 如果已经是最新的，跳过更新
    if (this.lastUpdateTick === currentTick) {
      return;
    }
    
    const t = world.trades;
    const startTick24h = currentTick - 24;
    const startTick1h = currentTick - 1;
    
    // 重置临时累加器
    this.tempValue.fill(0);
    this.tempVolume.fill(0);
    this.volume24h.fill(0);
    this.value24h.fill(0);
    this.tradeCount24h.fill(0);
    this.high24h.fill(0);
    this.low24h.fill(Infinity);
    this.lastPrice.fill(0);
    this.volume1h.fill(0);
    this.vwap1h.fill(0);
    
    // 用于追踪每个商品的第一笔和最后一笔成交
    const firstTradeTick = new Uint32Array(this.goodsCount);
    const firstTradePrice = new Float32Array(this.goodsCount);
    firstTradeTick.fill(0xFFFFFFFF);  // 初始化为最大值
    
    // 单次遍历计算所有商品的统计数据
    // 从最新到最旧遍历
    for (let i = t.count - 1; i >= 0; i--) {
      const idx = i % t.maxTrades;
      const tradeTick = t.ticks[idx];
      
      // 超出24小时范围，停止
      if (tradeTick < startTick24h) break;
      
      const goodsId = t.goodsIds[idx];
      if (goodsId >= this.goodsCount) continue;
      
      const quantity = t.quantities[idx];
      const price = t.prices[idx];
      const value = quantity * price;
      
      // 24小时统计
      this.tempValue[goodsId] += value;
      this.tempVolume[goodsId] += quantity;
      this.tradeCount24h[goodsId]++;
      
      // 高低价
      if (price > this.high24h[goodsId]) {
        this.high24h[goodsId] = price;
      }
      if (price < this.low24h[goodsId]) {
        this.low24h[goodsId] = price;
      }
      
      // 最新价（第一个遇到的就是最新的）
      if (this.lastPrice[goodsId] === 0) {
        this.lastPrice[goodsId] = price;
      }
      
      // 开盘价追踪（找最早的那笔）
      if (tradeTick < firstTradeTick[goodsId]) {
        firstTradeTick[goodsId] = tradeTick;
        firstTradePrice[goodsId] = price;
      }
      
      // 1小时统计
      if (tradeTick >= startTick1h) {
        this.volume1h[goodsId] += quantity;
        // 1小时的value单独累加
        this.value24h[goodsId] += value;  // 复用，后面会覆盖
      }
    }
    
    // 计算VWAP和整理数据
    for (let i = 0; i < this.goodsCount; i++) {
      // 24小时数据
      this.volume24h[i] = this.tempVolume[i];
      this.value24h[i] = this.tempValue[i];
      
      if (this.tempVolume[i] > 0) {
        this.vwap24h[i] = this.tempValue[i] / this.tempVolume[i];
      } else {
        this.vwap24h[i] = 0;
        this.high24h[i] = 0;
        this.low24h[i] = 0;
      }
      
      // 开盘价
      // 收盘价就是lastPrice
    }
    
    // 计算1小时VWAP（需要重新遍历，但只看1小时范围）
    this.tempValue.fill(0);
    for (let i = t.count - 1; i >= 0; i--) {
      const idx = i % t.maxTrades;
      const tradeTick = t.ticks[idx];
      
      if (tradeTick < startTick1h) break;
      
      const goodsId = t.goodsIds[idx];
      if (goodsId >= this.goodsCount) continue;
      
      this.tempValue[goodsId] += t.quantities[idx] * t.prices[idx];
    }
    
    for (let i = 0; i < this.goodsCount; i++) {
      if (this.volume1h[i] > 0) {
        this.vwap1h[i] = this.tempValue[i] / this.volume1h[i];
      } else {
        this.vwap1h[i] = 0;
      }
    }
    
    this.lastUpdateTick = currentTick;
  }
  
  /**
   * 强制更新（即使tick相同）
   */
  forceUpdate(world: GameWorld): void {
    this.lastUpdateTick = -1;
    this.update(world);
  }
  
  /**
   * 获取商品的24小时VWAP
   */
  getVWAP24h(goodsId: number): number | null {
    if (goodsId >= this.goodsCount) return null;
    const v = this.vwap24h[goodsId];
    return v > 0 ? v : null;
  }
  
  /**
   * 获取商品的1小时VWAP
   */
  getVWAP1h(goodsId: number): number | null {
    if (goodsId >= this.goodsCount) return null;
    const v = this.vwap1h[goodsId];
    return v > 0 ? v : null;
  }
  
  /**
   * 获取商品的24小时成交量
   */
  getVolume24h(goodsId: number): number {
    if (goodsId >= this.goodsCount) return 0;
    return this.volume24h[goodsId];
  }
  
  /**
   * 获取商品的1小时成交量
   */
  getVolume1h(goodsId: number): number {
    if (goodsId >= this.goodsCount) return 0;
    return this.volume1h[goodsId];
  }
  
  /**
   * 获取商品的24小时成交额
   */
  getValue24h(goodsId: number): number {
    if (goodsId >= this.goodsCount) return 0;
    return this.value24h[goodsId];
  }
  
  /**
   * 获取商品的24小时成交笔数
   */
  getTradeCount24h(goodsId: number): number {
    if (goodsId >= this.goodsCount) return 0;
    return this.tradeCount24h[goodsId];
  }
  
  /**
   * 获取商品的最新成交价
   */
  getLastPrice(goodsId: number): number | null {
    if (goodsId >= this.goodsCount) return null;
    const p = this.lastPrice[goodsId];
    return p > 0 ? p : null;
  }
  
  /**
   * 获取商品的24小时最高价
   */
  getHigh24h(goodsId: number): number | null {
    if (goodsId >= this.goodsCount) return null;
    const h = this.high24h[goodsId];
    return h > 0 ? h : null;
  }
  
  /**
   * 获取商品的24小时最低价
   */
  getLow24h(goodsId: number): number | null {
    if (goodsId >= this.goodsCount) return null;
    const l = this.low24h[goodsId];
    return l < Infinity ? l : null;
  }
  
  /**
   * 获取商品的完整统计数据
   */
  getStats(goodsId: number): PriceStats | null {
    if (goodsId >= this.goodsCount) return null;
    
    return {
      vwap: this.vwap24h[goodsId] || 0,
      volume: this.volume24h[goodsId],
      value: this.value24h[goodsId],
      tradeCount: this.tradeCount24h[goodsId],
      lastPrice: this.lastPrice[goodsId],
      high: this.high24h[goodsId] || 0,
      low: this.low24h[goodsId] < Infinity ? this.low24h[goodsId] : 0,
      open: 0,  // TODO: 需要额外追踪
      close: this.lastPrice[goodsId],
    };
  }
  
  /**
   * 批量获取所有商品的VWAP（返回视图，避免复制）
   */
  getAllVWAP24h(): Float32Array {
    return this.vwap24h;
  }
  
  /**
   * 批量获取所有商品的成交量（返回视图，避免复制）
   */
  getAllVolume24h(): Float32Array {
    return this.volume24h;
  }
  
  /**
   * 获取最后更新的tick
   */
  getLastUpdateTick(): number {
    return this.lastUpdateTick;
  }
  
  /**
   * 检查是否需要更新
   */
  needsUpdate(currentTick: number): boolean {
    return this.lastUpdateTick !== currentTick;
  }
  
  /**
   * 获取有成交的商品ID列表
   */
  getActiveGoodsIds(): number[] {
    const result: number[] = [];
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      if (this.volume24h[i] > 0) {
        result.push(i);
      }
    }
    return result;
  }
  
  /**
   * 获取成交量最大的N个商品
   */
  getTopVolumeGoods(n: number): Array<{ goodsId: number; volume: number }> {
    const items: Array<{ goodsId: number; volume: number }> = [];
    
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      if (this.volume24h[i] > 0) {
        items.push({ goodsId: i, volume: this.volume24h[i] });
      }
    }
    
    items.sort((a, b) => b.volume - a.volume);
    return items.slice(0, n);
  }
  
  /**
   * 获取价格波动最大的N个商品
   */
  getTopVolatilityGoods(n: number): Array<{ goodsId: number; range: number; rangePercent: number }> {
    const items: Array<{ goodsId: number; range: number; rangePercent: number }> = [];
    
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      const high = this.high24h[i];
      const low = this.low24h[i];
      
      if (high > 0 && low < Infinity && low > 0) {
        const range = high - low;
        const rangePercent = range / low;
        items.push({ goodsId: i, range, rangePercent });
      }
    }
    
    items.sort((a, b) => b.rangePercent - a.rangePercent);
    return items.slice(0, n);
  }
}

// 全局价格缓存实例
let globalPriceCache: PriceCache | null = null;

/**
 * 获取或创建全局价格缓存
 */
export function getPriceCache(): PriceCache {
  if (!globalPriceCache) {
    globalPriceCache = new PriceCache();
  }
  return globalPriceCache;
}

/**
 * 重置全局价格缓存
 */
export function resetPriceCache(): void {
  globalPriceCache = new PriceCache();
}

/**
 * 更新全局价格缓存
 */
export function updatePriceCache(world: GameWorld): void {
  getPriceCache().update(world);
}