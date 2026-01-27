/**
 * 性能监控系统
 * 追踪和分析游戏各系统的性能指标
 * 
 * 增强功能：
 * - FPS追踪
 * - 渲染时间追踪
 * - 综合性能快照
 * - 对象池统计聚合
 */

import { getAllPoolStats } from './ObjectPool';

/**
 * 性能指标
 */
export interface PerformanceMetric {
  name: string;
  avg: number;
  min: number;
  max: number;
  last: number;
  samples: number;
  total: number;
}

/**
 * FPS追踪器数据
 */
export interface FPSData {
  current: number;
  avg: number;
  min: number;
  max: number;
  frameCount: number;
}

/**
 * 内存统计
 */
export interface MemoryData {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  usageRatio: number;
}

/**
 * 系统breakdown数据
 */
export interface TickBreakdown {
  production: number;
  matching: number;
  pricing: number;
  ai: number;
  retail: number;
  other: number;
}

/**
 * 对象池统计
 */
export interface PoolStatsData {
  orders: { poolSize: number; activeCount: number; hitRate: number; peakActive: number };
  events: { poolSize: number; activeCount: number; hitRate: number; peakActive: number };
  trades: { poolSize: number; activeCount: number; hitRate: number; peakActive: number };
  pricePoints: { poolSize: number; activeCount: number; hitRate: number; peakActive: number };
  typedArrays: { pooledArrays: number; pooledBytes: number; hitRate: number };
}

/**
 * 综合性能快照
 */
export interface PerformanceSnapshot {
  tick: number;
  timestamp: number;
  fps: FPSData;
  tickTime: number;
  avgTickTime: number;
  breakdown: TickBreakdown;
  memory: MemoryData;
  pools: PoolStatsData;
  health: 'healthy' | 'warning' | 'critical';
  warnings: string[];
}

/**
 * Tick性能报告
 */
export interface TickPerformanceReport {
  tick: number;
  totalTime: number;
  metrics: Map<string, PerformanceMetric>;
  breakdown: TickBreakdown;
  warnings: string[];
}

/**
 * 环形缓冲区存储历史样本
 */
class RingBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private count: number = 0;
  private capacity: number;
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }
  
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }
  
  getAll(): T[] {
    const result: T[] = [];
    const start = this.count < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[(start + i) % this.capacity]);
    }
    return result;
  }
  
  getLast(n: number): T[] {
    const result: T[] = [];
    const count = Math.min(n, this.count);
    for (let i = 0; i < count; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      result.unshift(this.buffer[idx]);
    }
    return result;
  }
  
  size(): number {
    return this.count;
  }
  
  clear(): void {
    this.head = 0;
    this.count = 0;
  }
  
  getLatest(): T | null {
    if (this.count === 0) return null;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private metrics: Map<string, RingBuffer<number>> = new Map();
  private enabled: boolean = true;
  private sampleSize: number;
  private currentTickStart: number = 0;
  private currentTickMetrics: Map<string, number> = new Map();
  private tickHistory: RingBuffer<TickPerformanceReport>;
  private snapshotHistory: RingBuffer<PerformanceSnapshot>;
  
  // 性能阈值
  private warningThreshold: number = 16;  // 16ms (60fps)
  private criticalThreshold: number = 33; // 33ms (30fps)
  
  // FPS追踪
  private fpsData: FPSData = {
    current: 60,
    avg: 60,
    min: 60,
    max: 60,
    frameCount: 0,
  };
  private fpsHistory: RingBuffer<number>;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 500; // 每500ms更新一次FPS
  private lastFpsUpdate: number = 0;
  
  // 渲染追踪
  private renderStartTime: number = 0;
  private lastRenderTime: number = 0;
  private renderTimes: RingBuffer<number>;
  
  constructor(sampleSize: number = 100) {
    this.sampleSize = sampleSize;
    this.tickHistory = new RingBuffer(sampleSize);
    this.snapshotHistory = new RingBuffer(1000); // 保存更多快照用于导出
    this.fpsHistory = new RingBuffer(100);
    this.renderTimes = new RingBuffer(100);
  }
  
  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  // ==================== FPS追踪 ====================
  
  /**
   * 开始帧测量（在渲染开始时调用）
   */
  startFrame(): void {
    if (!this.enabled) return;
    
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      if (delta > 0) {
        const instantFPS = 1000 / delta;
        this.fpsHistory.push(instantFPS);
        this.frameCount++;
      }
    }
    
    this.lastFrameTime = now;
    
    // 定期更新FPS统计
    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.updateFPSStats();
      this.lastFpsUpdate = now;
    }
  }
  
  /**
   * 结束帧测量
   */
  endFrame(): void {
    // 目前不需要额外处理，FPS在startFrame中计算
  }
  
  /**
   * 更新FPS统计数据
   */
  private updateFPSStats(): void {
    const samples = this.fpsHistory.getAll();
    if (samples.length === 0) {
      return;
    }
    
    const sum = samples.reduce((a, b) => a + b, 0);
    this.fpsData = {
      current: samples.length > 0 ? samples[samples.length - 1] : 60,
      avg: sum / samples.length,
      min: Math.min(...samples),
      max: Math.max(...samples),
      frameCount: this.frameCount,
    };
  }
  
  /**
   * 获取FPS数据
   */
  getFPS(): FPSData {
    return { ...this.fpsData };
  }
  
  // ==================== 渲染追踪 ====================
  
  /**
   * 开始渲染测量
   */
  startRender(): void {
    if (!this.enabled) return;
    this.renderStartTime = performance.now();
  }
  
  /**
   * 结束渲染测量
   */
  endRender(): number {
    if (!this.enabled || this.renderStartTime === 0) return 0;
    
    const renderTime = performance.now() - this.renderStartTime;
    this.lastRenderTime = renderTime;
    this.renderTimes.push(renderTime);
    this.renderStartTime = 0;
    
    return renderTime;
  }
  
  /**
   * 测量渲染函数
   */
  measureRender<T>(fn: () => T): T {
    this.startRender();
    const result = fn();
    this.endRender();
    return result;
  }
  
  /**
   * 获取渲染时间统计
   */
  getRenderStats(): { current: number; avg: number; max: number } {
    const samples = this.renderTimes.getAll();
    if (samples.length === 0) {
      return { current: 0, avg: 0, max: 0 };
    }
    
    const sum = samples.reduce((a, b) => a + b, 0);
    return {
      current: this.lastRenderTime,
      avg: sum / samples.length,
      max: Math.max(...samples),
    };
  }
  
  // ==================== 原有功能 ====================
  
  /**
   * 开始测量
   * 返回一个结束函数，调用时记录耗时
   */
  startMeasure(name: string): () => number {
    if (!this.enabled) {
      return () => 0;
    }
    
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return duration;
    };
  }
  
  /**
   * 测量函数执行时间
   */
  measure<T>(name: string, fn: () => T): T {
    if (!this.enabled) {
      return fn();
    }
    
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    return result;
  }
  
  /**
   * 测量异步函数执行时间
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return fn();
    }
    
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    return result;
  }
  
  /**
   * 记录指标
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, new RingBuffer(this.sampleSize));
    }
    
    this.metrics.get(name)!.push(value);
    this.currentTickMetrics.set(name, value);
  }
  
  /**
   * 开始新的tick测量
   */
  startTick(): void {
    this.currentTickStart = performance.now();
    this.currentTickMetrics.clear();
  }
  
  /**
   * 结束tick测量并生成报告
   */
  endTick(tick: number): TickPerformanceReport {
    const totalTime = performance.now() - this.currentTickStart;
    
    const metrics = new Map<string, PerformanceMetric>();
    
    for (const [name, buffer] of this.metrics) {
      const samples = buffer.getAll();
      if (samples.length === 0) continue;
      
      const sum = samples.reduce((a, b) => a + b, 0);
      const avg = sum / samples.length;
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const last = samples[samples.length - 1];
      
      metrics.set(name, {
        name,
        avg,
        min,
        max,
        last,
        samples: samples.length,
        total: sum,
      });
    }
    
    // 计算分解
    const breakdown: TickBreakdown = {
      production: this.currentTickMetrics.get('production') || 0,
      matching: this.currentTickMetrics.get('matching') || 0,
      pricing: this.currentTickMetrics.get('pricing') || 0,
      ai: this.currentTickMetrics.get('ai') || 0,
      retail: this.currentTickMetrics.get('retail') || 0,
      other: 0,
    };
    
    breakdown.other = Math.max(0, totalTime - (
      breakdown.production +
      breakdown.matching +
      breakdown.pricing +
      breakdown.ai +
      breakdown.retail
    ));
    
    // 生成警告
    const warnings: string[] = [];
    
    if (totalTime > this.criticalThreshold) {
      warnings.push(`CRITICAL: Tick ${tick} took ${totalTime.toFixed(2)}ms (>${this.criticalThreshold}ms)`);
    } else if (totalTime > this.warningThreshold) {
      warnings.push(`WARNING: Tick ${tick} took ${totalTime.toFixed(2)}ms (>${this.warningThreshold}ms)`);
    }
    
    // 检查各系统
    for (const [name, value] of this.currentTickMetrics) {
      if (value > 10) {
        warnings.push(`${name}: ${value.toFixed(2)}ms`);
      }
    }
    
    const report: TickPerformanceReport = {
      tick,
      totalTime,
      metrics,
      breakdown,
      warnings,
    };
    
    this.tickHistory.push(report);
    
    // 生成并保存快照
    this.saveSnapshot(tick, totalTime, breakdown, warnings);
    
    return report;
  }
  
  // ==================== 快照功能 ====================
  
  /**
   * 保存性能快照
   */
  private saveSnapshot(tick: number, tickTime: number, breakdown: TickBreakdown, warnings: string[]): void {
    const snapshot: PerformanceSnapshot = {
      tick,
      timestamp: Date.now(),
      fps: this.getFPS(),
      tickTime,
      avgTickTime: this.getAverageTickTime(),
      breakdown,
      memory: this.getMemoryStats(),
      pools: this.getPoolStats(),
      health: this.getHealthStatus(),
      warnings,
    };
    
    this.snapshotHistory.push(snapshot);
  }
  
  /**
   * 获取内存统计
   */
  getMemoryStats(): MemoryData {
    const memory = (performance as any).memory;
    
    if (memory) {
      return {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
      };
    }
    
    // 降级：返回默认值
    return {
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 假设2GB
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      usageRatio: 0,
    };
  }
  
  /**
   * 获取对象池统计
   */
  getPoolStats(): PoolStatsData {
    const rawStats = getAllPoolStats();
    
    return {
      orders: {
        poolSize: rawStats.orders.poolSize,
        activeCount: rawStats.orders.activeCount,
        hitRate: rawStats.orders.hitRate,
        peakActive: rawStats.orders.peakActive,
      },
      events: {
        poolSize: rawStats.events.poolSize,
        activeCount: rawStats.events.activeCount,
        hitRate: rawStats.events.hitRate,
        peakActive: rawStats.events.peakActive,
      },
      trades: {
        poolSize: rawStats.trades.poolSize,
        activeCount: rawStats.trades.activeCount,
        hitRate: rawStats.trades.hitRate,
        peakActive: rawStats.trades.peakActive,
      },
      pricePoints: {
        poolSize: rawStats.pricePoints.poolSize,
        activeCount: rawStats.pricePoints.activeCount,
        hitRate: rawStats.pricePoints.hitRate,
        peakActive: rawStats.pricePoints.peakActive,
      },
      typedArrays: {
        pooledArrays: rawStats.typedArrays.pooledArrays,
        pooledBytes: rawStats.typedArrays.pooledBytes,
        hitRate: rawStats.typedArrays.hitRate,
      },
    };
  }
  
  /**
   * 获取最新快照
   */
  getSnapshot(): PerformanceSnapshot | null {
    return this.snapshotHistory.getLatest();
  }
  
  /**
   * 获取历史快照
   */
  getSnapshots(count: number): PerformanceSnapshot[] {
    return this.snapshotHistory.getLast(count);
  }
  
  /**
   * 获取所有快照
   */
  getAllSnapshots(): PerformanceSnapshot[] {
    return this.snapshotHistory.getAll();
  }
  
  // ==================== 原有统计功能 ====================
  
  /**
   * 获取指标统计
   */
  getMetricStats(name: string): PerformanceMetric | null {
    const buffer = this.metrics.get(name);
    if (!buffer) return null;
    
    const samples = buffer.getAll();
    if (samples.length === 0) return null;
    
    const sum = samples.reduce((a, b) => a + b, 0);
    const avg = sum / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const last = samples[samples.length - 1];
    
    return {
      name,
      avg,
      min,
      max,
      last,
      samples: samples.length,
      total: sum,
    };
  }
  
  /**
   * 获取所有指标
   */
  getAllMetrics(): Map<string, PerformanceMetric> {
    const result = new Map<string, PerformanceMetric>();
    
    for (const [name] of this.metrics) {
      const stats = this.getMetricStats(name);
      if (stats) {
        result.set(name, stats);
      }
    }
    
    return result;
  }
  
  /**
   * 获取综合报告
   */
  getReport(): string {
    const lines: string[] = [];
    lines.push('=== Performance Report ===');
    lines.push('');
    
    // FPS信息
    const fps = this.getFPS();
    lines.push(`FPS: ${fps.current.toFixed(1)} (avg: ${fps.avg.toFixed(1)}, min: ${fps.min.toFixed(1)}, max: ${fps.max.toFixed(1)})`);
    lines.push('');
    
    // Tick时间
    lines.push(`Average Tick Time: ${this.getAverageTickTime().toFixed(2)}ms`);
    lines.push(`Health Status: ${this.getHealthStatus()}`);
    lines.push('');
    
    // 内存
    const memory = this.getMemoryStats();
    lines.push(`Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB (${(memory.usageRatio * 100).toFixed(1)}%)`);
    lines.push('');
    
    // 各指标
    const allMetrics = this.getAllMetrics();
    const sorted = Array.from(allMetrics.values()).sort((a, b) => b.avg - a.avg);
    
    lines.push('--- Metrics ---');
    for (const metric of sorted) {
      lines.push(`${metric.name}:`);
      lines.push(`  avg: ${metric.avg.toFixed(2)}ms`);
      lines.push(`  min: ${metric.min.toFixed(2)}ms`);
      lines.push(`  max: ${metric.max.toFixed(2)}ms`);
      lines.push(`  samples: ${metric.samples}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  /**
   * 获取最近N个tick的报告
   */
  getRecentTicks(n: number): TickPerformanceReport[] {
    return this.tickHistory.getLast(n);
  }
  
  /**
   * 获取平均tick时间
   */
  getAverageTickTime(): number {
    const recent = this.tickHistory.getLast(this.sampleSize);
    if (recent.length === 0) return 0;
    
    const sum = recent.reduce((a, b) => a + b.totalTime, 0);
    return sum / recent.length;
  }
  
  /**
   * 获取性能状态
   */
  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const avgTime = this.getAverageTickTime();
    
    if (avgTime > this.criticalThreshold) return 'critical';
    if (avgTime > this.warningThreshold) return 'warning';
    return 'healthy';
  }
  
  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics.clear();
    this.tickHistory.clear();
    this.snapshotHistory.clear();
    this.fpsHistory.clear();
    this.renderTimes.clear();
    this.currentTickMetrics.clear();
    this.frameCount = 0;
    this.fpsData = { current: 60, avg: 60, min: 60, max: 60, frameCount: 0 };
  }
  
  /**
   * 设置阈值
   */
  setThresholds(warning: number, critical: number): void {
    this.warningThreshold = warning;
    this.criticalThreshold = critical;
  }
  
  /**
   * 获取阈值
   */
  getThresholds(): { warning: number; critical: number } {
    return {
      warning: this.warningThreshold,
      critical: this.criticalThreshold,
    };
  }
  
  /**
   * 输出性能报告到控制台
   */
  logReport(): void {
    console.log(this.getReport());
  }
  
  /**
   * 获取JSON格式的报告
   */
  toJSON(): object {
    const metrics: Record<string, PerformanceMetric> = {};
    
    for (const [name, metric] of this.getAllMetrics()) {
      metrics[name] = metric;
    }
    
    return {
      enabled: this.enabled,
      sampleSize: this.sampleSize,
      fps: this.getFPS(),
      averageTickTime: this.getAverageTickTime(),
      healthStatus: this.getHealthStatus(),
      memory: this.getMemoryStats(),
      pools: this.getPoolStats(),
      metrics,
    };
  }
}

// 全局性能监控器实例
export const perfMonitor = new PerformanceMonitor();

/**
 * 便捷的测量装饰器
 */
export function measurePerformance(name: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: unknown[]) {
      return perfMonitor.measure(`${name}.${propertyKey}`, () => {
        return originalMethod.apply(this, args);
      });
    };
    
    return descriptor;
  };
}

/**
 * 简单的性能追踪宏
 */
export function trackPerformance<T>(name: string, fn: () => T): T {
  return perfMonitor.measure(name, fn);
}