/**
 * 内存管理器
 * 监控内存使用并响应内存压力
 */

import { onGlobalMemoryPressure, tickAllPools, getAllPoolStats } from './ObjectPool';

export interface MemoryStats {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  usageRatio: number;
  poolStats: ReturnType<typeof getAllPoolStats>;
}

export type MemoryPressureLevel = 'normal' | 'warning' | 'critical';

interface MemoryConfig {
  warningThreshold: number;  // 内存使用率警告阈值
  criticalThreshold: number; // 内存使用率临界阈值
  checkInterval: number;     // 检查间隔（tick数）
  enableAutoGC: boolean;     // 启用自动GC提示
}

const DEFAULT_CONFIG: MemoryConfig = {
  warningThreshold: 0.7,
  criticalThreshold: 0.85,
  checkInterval: 60,
  enableAutoGC: true,
};

type MemoryPressureCallback = (level: MemoryPressureLevel, stats: MemoryStats) => void;

export class MemoryManager {
  private config: MemoryConfig;
  private tickCount = 0;
  private lastPressureLevel: MemoryPressureLevel = 'normal';
  private callbacks: MemoryPressureCallback[] = [];
  private history: Array<{ tick: number; used: number; level: MemoryPressureLevel }> = [];
  private maxHistorySize = 100;
  
  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 每tick调用
   */
  tick(): void {
    this.tickCount++;
    
    // 更新对象池
    tickAllPools();
    
    // 定期检查内存
    if (this.tickCount % this.config.checkInterval === 0) {
      this.checkMemory();
    }
  }
  
  /**
   * 检查内存状态
   */
  checkMemory(): MemoryStats {
    const stats = this.getStats();
    const level = this.getPressureLevel(stats.usageRatio);
    
    // 记录历史
    this.history.push({
      tick: this.tickCount,
      used: stats.usedJSHeapSize,
      level,
    });
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    // 压力级别变化时触发回调
    if (level !== this.lastPressureLevel) {
      this.lastPressureLevel = level;
      this.notifyPressureChange(level, stats);
    }
    
    // 根据压力级别采取行动
    if (level === 'critical') {
      this.handleCriticalPressure();
    } else if (level === 'warning') {
      this.handleWarningPressure();
    }
    
    return stats;
  }
  
  /**
   * 获取内存统计
   */
  getStats(): MemoryStats {
    // 尝试获取performance.memory（Chrome特有）
    const memory = (performance as any).memory;
    
    if (memory) {
      return {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
        poolStats: getAllPoolStats(),
      };
    }
    
    // 降级：使用估算值
    return {
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 假设2GB
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      usageRatio: 0,
      poolStats: getAllPoolStats(),
    };
  }
  
  /**
   * 获取压力级别
   */
  private getPressureLevel(usageRatio: number): MemoryPressureLevel {
    if (usageRatio >= this.config.criticalThreshold) {
      return 'critical';
    }
    if (usageRatio >= this.config.warningThreshold) {
      return 'warning';
    }
    return 'normal';
  }
  
  /**
   * 注册压力变化回调
   */
  onPressureChange(callback: MemoryPressureCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const idx = this.callbacks.indexOf(callback);
      if (idx >= 0) {
        this.callbacks.splice(idx, 1);
      }
    };
  }
  
  /**
   * 通知压力变化
   */
  private notifyPressureChange(level: MemoryPressureLevel, stats: MemoryStats): void {
    for (const callback of this.callbacks) {
      try {
        callback(level, stats);
      } catch (e) {
        console.error('Memory pressure callback error:', e);
      }
    }
  }
  
  /**
   * 处理临界压力
   */
  private handleCriticalPressure(): void {
    console.warn('[MemoryManager] Critical memory pressure detected!');
    
    // 强制清理对象池
    onGlobalMemoryPressure();
    
    // 建议GC
    if (this.config.enableAutoGC) {
      this.suggestGC();
    }
  }
  
  /**
   * 处理警告压力
   */
  private handleWarningPressure(): void {
    console.log('[MemoryManager] Warning: Memory pressure increasing');
    
    // 温和清理
    onGlobalMemoryPressure();
  }
  
  /**
   * 建议GC
   */
  private suggestGC(): void {
    // 尝试触发GC（不保证成功）
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }
  
  /**
   * 获取内存趋势
   */
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.history.length < 10) {
      return 'stable';
    }
    
    const recent = this.history.slice(-10);
    const firstHalf = recent.slice(0, 5);
    const secondHalf = recent.slice(5);
    
    const avgFirst = firstHalf.reduce((s, h) => s + h.used, 0) / 5;
    const avgSecond = secondHalf.reduce((s, h) => s + h.used, 0) / 5;
    
    const changeRatio = (avgSecond - avgFirst) / avgFirst;
    
    if (changeRatio > 0.05) {
      return 'increasing';
    }
    if (changeRatio < -0.05) {
      return 'decreasing';
    }
    return 'stable';
  }
  
  /**
   * 获取当前压力级别
   */
  getCurrentPressureLevel(): MemoryPressureLevel {
    return this.lastPressureLevel;
  }
  
  /**
   * 手动触发清理
   */
  forceCleanup(): void {
    onGlobalMemoryPressure();
    this.suggestGC();
  }
  
  /**
   * 获取历史记录
   */
  getHistory() {
    return [...this.history];
  }
  
  /**
   * 重置
   */
  reset(): void {
    this.tickCount = 0;
    this.history = [];
    this.lastPressureLevel = 'normal';
  }
}

// 全局单例
export const memoryManager = new MemoryManager();

/**
 * 内存使用装饰器
 * 用于监控函数的内存使用
 */
export function trackMemory(name: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const before = (performance as any).memory?.usedJSHeapSize ?? 0;
      const result = original.apply(this, args);
      const after = (performance as any).memory?.usedJSHeapSize ?? 0;
      
      const diff = after - before;
      if (diff > 1024 * 1024) { // 超过1MB增长
        console.warn(`[Memory] ${name}: ${(diff / 1024 / 1024).toFixed(2)}MB allocated`);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * 内存高效的批量操作包装器
 */
export function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => R[],
  batchSize: number = 1000
): R[] {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = processor(batch);
    results.push(...batchResults);
    
    // 检查内存压力
    if (memoryManager.getCurrentPressureLevel() === 'critical') {
      console.warn('[batchProcess] Critical memory pressure, pausing...');
      memoryManager.forceCleanup();
    }
  }
  
  return results;
}