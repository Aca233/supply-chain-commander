/**
 * 性能数据导出模块
 * 支持JSON和CSV格式导出
 */

import { PerformanceSnapshot, perfMonitor } from './PerformanceMonitor';

/**
 * 导出选项
 */
export interface ExportOptions {
  format: 'json' | 'csv';
  timeRange?: 'all' | 'last100' | 'last500' | 'last1000';
  includeMemory?: boolean;
  includePools?: boolean;
  includeBreakdown?: boolean;
  includeWarnings?: boolean;
  prettyPrint?: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'json',
  timeRange: 'last100',
  includeMemory: true,
  includePools: true,
  includeBreakdown: true,
  includeWarnings: false,
  prettyPrint: true,
};

/**
 * 性能数据导出器
 */
export class PerformanceExporter {
  
  /**
   * 导出为JSON格式
   */
  static exportJSON(snapshots: PerformanceSnapshot[], options: Partial<ExportOptions> = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const exportData = {
      exportTime: new Date().toISOString(),
      exportOptions: opts,
      totalSnapshots: snapshots.length,
      summary: this.generateSummary(snapshots),
      snapshots: snapshots.map(s => this.formatSnapshotForExport(s, opts)),
    };
    
    return opts.prettyPrint
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);
  }
  
  /**
   * 导出为CSV格式
   */
  static exportCSV(snapshots: PerformanceSnapshot[], options: Partial<ExportOptions> = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // 构建表头
    const headers = ['tick', 'timestamp', 'fps_current', 'fps_avg', 'tickTime', 'avgTickTime', 'health'];
    
    if (opts.includeBreakdown) {
      headers.push('production', 'matching', 'pricing', 'ai', 'retail', 'other');
    }
    
    if (opts.includeMemory) {
      headers.push('memory_used_mb', 'memory_total_mb', 'memory_ratio');
    }
    
    if (opts.includePools) {
      headers.push(
        'pool_orders_active', 'pool_orders_size', 'pool_orders_hitRate',
        'pool_events_active', 'pool_events_size',
        'pool_trades_active', 'pool_trades_size',
        'pool_pricePoints_active', 'pool_pricePoints_size'
      );
    }
    
    // 构建数据行
    const rows = snapshots.map(s => {
      const row: (string | number)[] = [
        s.tick,
        s.timestamp,
        s.fps.current.toFixed(2),
        s.fps.avg.toFixed(2),
        s.tickTime.toFixed(3),
        s.avgTickTime.toFixed(3),
        s.health,
      ];
      
      if (opts.includeBreakdown) {
        row.push(
          s.breakdown.production.toFixed(3),
          s.breakdown.matching.toFixed(3),
          s.breakdown.pricing.toFixed(3),
          s.breakdown.ai.toFixed(3),
          s.breakdown.retail.toFixed(3),
          s.breakdown.other.toFixed(3)
        );
      }
      
      if (opts.includeMemory) {
        row.push(
          (s.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
          (s.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
          (s.memory.usageRatio * 100).toFixed(2)
        );
      }
      
      if (opts.includePools) {
        row.push(
          s.pools.orders.activeCount,
          s.pools.orders.poolSize,
          s.pools.orders.hitRate.toFixed(3),
          s.pools.events.activeCount,
          s.pools.events.poolSize,
          s.pools.trades.activeCount,
          s.pools.trades.poolSize,
          s.pools.pricePoints.activeCount,
          s.pools.pricePoints.poolSize
        );
      }
      
      return row.join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  /**
   * 生成摘要统计
   */
  private static generateSummary(snapshots: PerformanceSnapshot[]) {
    if (snapshots.length === 0) {
      return {
        tickRange: { start: 0, end: 0 },
        timeRange: { start: '', end: '' },
        avgFPS: 0,
        avgTickTime: 0,
        maxTickTime: 0,
        healthBreakdown: { healthy: 0, warning: 0, critical: 0 },
      };
    }
    
    const fpsValues = snapshots.map(s => s.fps.avg);
    const tickTimes = snapshots.map(s => s.tickTime);
    
    let healthy = 0, warning = 0, critical = 0;
    for (const s of snapshots) {
      if (s.health === 'healthy') healthy++;
      else if (s.health === 'warning') warning++;
      else critical++;
    }
    
    return {
      tickRange: {
        start: snapshots[0].tick,
        end: snapshots[snapshots.length - 1].tick,
      },
      timeRange: {
        start: new Date(snapshots[0].timestamp).toISOString(),
        end: new Date(snapshots[snapshots.length - 1].timestamp).toISOString(),
      },
      avgFPS: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,
      avgTickTime: tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length,
      maxTickTime: Math.max(...tickTimes),
      minTickTime: Math.min(...tickTimes),
      healthBreakdown: {
        healthy,
        warning,
        critical,
        healthyPercent: (healthy / snapshots.length * 100).toFixed(1) + '%',
        warningPercent: (warning / snapshots.length * 100).toFixed(1) + '%',
        criticalPercent: (critical / snapshots.length * 100).toFixed(1) + '%',
      },
    };
  }
  
  /**
   * 格式化单个快照用于导出
   */
  private static formatSnapshotForExport(snapshot: PerformanceSnapshot, opts: ExportOptions) {
    const result: any = {
      tick: snapshot.tick,
      timestamp: snapshot.timestamp,
      fps: snapshot.fps,
      tickTime: snapshot.tickTime,
      avgTickTime: snapshot.avgTickTime,
      health: snapshot.health,
    };
    
    if (opts.includeBreakdown) {
      result.breakdown = snapshot.breakdown;
    }
    
    if (opts.includeMemory) {
      result.memory = {
        usedMB: (snapshot.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
        totalMB: (snapshot.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
        usagePercent: (snapshot.memory.usageRatio * 100).toFixed(2),
      };
    }
    
    if (opts.includePools) {
      result.pools = snapshot.pools;
    }
    
    if (opts.includeWarnings && snapshot.warnings.length > 0) {
      result.warnings = snapshot.warnings;
    }
    
    return result;
  }
  
  /**
   * 触发文件下载
   */
  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * 导出并下载JSON
   */
  static downloadJSON(options: Partial<ExportOptions> = {}): void {
    const snapshots = this.getSnapshotsForExport(options);
    const content = this.exportJSON(snapshots, options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.downloadFile(content, `performance-${timestamp}.json`, 'application/json');
  }
  
  /**
   * 导出并下载CSV
   */
  static downloadCSV(options: Partial<ExportOptions> = {}): void {
    const snapshots = this.getSnapshotsForExport(options);
    const content = this.exportCSV(snapshots, options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.downloadFile(content, `performance-${timestamp}.csv`, 'text/csv');
  }
  
  /**
   * 根据选项获取快照
   */
  private static getSnapshotsForExport(options: Partial<ExportOptions> = {}): PerformanceSnapshot[] {
    const timeRange = options.timeRange || 'last100';
    
    switch (timeRange) {
      case 'all':
        return perfMonitor.getAllSnapshots();
      case 'last100':
        return perfMonitor.getSnapshots(100);
      case 'last500':
        return perfMonitor.getSnapshots(500);
      case 'last1000':
        return perfMonitor.getSnapshots(1000);
      default:
        return perfMonitor.getSnapshots(100);
    }
  }
}

// 便捷导出函数
export const downloadPerformanceJSON = (options?: Partial<ExportOptions>) => 
  PerformanceExporter.downloadJSON(options);

export const downloadPerformanceCSV = (options?: Partial<ExportOptions>) => 
  PerformanceExporter.downloadCSV(options);