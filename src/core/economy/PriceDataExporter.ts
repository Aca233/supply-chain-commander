/**
 * 价格数据导出模块
 * 支持CSV和JSON格式导出月度价格报告
 */

import {
  MonthlyPriceReport,
  GoodsMonthlyStats,
  MultiMonthComparisonReport,
  MonthComparisonData,
  getMonthlyPriceTracker,
} from './MonthlyPriceTracker';

// ==================== 类型定义 ====================

/** 导出选项 */
export interface PriceExportOptions {
  format: 'json' | 'csv';
  timeRange: 'current' | 'last3' | 'last6' | 'last12' | 'all';
  includeCategories: boolean;
  includeSupplyDemand: boolean;
  includeBasePrice: boolean;
  compareMonths?: string[];
  sortBy: 'name' | 'changePercent' | 'volume' | 'value' | 'baseChangePercent';
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_OPTIONS: PriceExportOptions = {
  format: 'json',
  timeRange: 'current',
  includeCategories: true,
  includeSupplyDemand: true,
  includeBasePrice: true,
  sortBy: 'changePercent',
  sortOrder: 'desc',
};

// ==================== 导出器实现 ====================

export class PriceDataExporter {
  
  /**
   * 导出单月报告为JSON
   */
  static exportReportJSON(report: MonthlyPriceReport, options: Partial<PriceExportOptions> = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const sortedGoods = this.sortGoods(report.goods, opts.sortBy, opts.sortOrder);
    
    const exportData = {
      exportTime: new Date().toISOString(),
      reportId: report.id,
      year: report.year,
      month: report.month,
      period: {
        startTick: report.startTick,
        endTick: report.endTick,
        generateTime: new Date(report.generateTime).toISOString(),
      },
      summary: report.summary,
      goods: sortedGoods.map(g => this.formatGoodsForJSON(g, opts)),
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * 导出单月报告为CSV
   */
  static exportReportCSV(report: MonthlyPriceReport, options: Partial<PriceExportOptions> = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const sortedGoods = this.sortGoods(report.goods, opts.sortBy, opts.sortOrder);
    
    // 构建表头
    const headers: string[] = ['月份', '商品ID', '商品名称'];
    
    if (opts.includeCategories) {
      headers.push('分类');
    }
    
    if (opts.includeBasePrice) {
      headers.push('基准价');
    }
    
    headers.push('月初价格', '月末价格', '月内涨跌%');
    
    if (opts.includeBasePrice) {
      headers.push('较基准涨跌%');
    }
    
    headers.push('最高价', '最低价', '成交量', '成交额', '成交均价', '成交笔数');
    
    if (opts.includeSupplyDemand) {
      headers.push('供需比');
    }
    
    // 构建数据行
    const rows: string[] = [headers.join(',')];
    
    for (const goods of sortedGoods) {
      const startPrice = Number(goods.startPrice.toFixed(2));
      const endPrice = Number(goods.endPrice.toFixed(2));
      const basePrice = Number(goods.basePrice.toFixed(2));
      const changePercent = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
      const baseChangePercent = basePrice > 0 ? ((endPrice - basePrice) / basePrice) * 100 : 0;
      const row: string[] = [
        report.id,
        String(goods.goodsId),
        goods.name,
      ];
      
      if (opts.includeCategories) {
        row.push(goods.category);
      }
      
      if (opts.includeBasePrice) {
        row.push(basePrice.toFixed(2));
      }
      
      row.push(
        startPrice.toFixed(2),
        endPrice.toFixed(2),
        this.formatPercent(changePercent),
      );
      
      if (opts.includeBasePrice) {
        row.push(this.formatPercent(baseChangePercent));
      }
      
      row.push(
        goods.highPrice.toFixed(2),
        goods.lowPrice.toFixed(2),
        this.formatVolume(goods.totalVolume),
        this.formatValue(goods.totalValue),
        goods.avgPrice.toFixed(2),
        String(goods.tradeCount),
      );
      
      if (opts.includeSupplyDemand) {
        row.push(goods.avgSupplyDemandRatio.toFixed(4));
      }
      
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }
  
  /**
   * 导出多月份对比为JSON
   */
  static exportComparisonJSON(comparison: MultiMonthComparisonReport, options: Partial<PriceExportOptions> = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // 按指定字段排序
    const sortedGoods = this.sortComparisonGoods(comparison.goods, comparison.monthKeys, opts.sortBy, opts.sortOrder);
    
    const exportData = {
      exportTime: new Date().toISOString(),
      comparisonMonths: comparison.monthKeys,
      goods: sortedGoods.map(g => ({
        goodsId: g.goodsId,
        name: g.name,
        category: opts.includeCategories ? g.category : undefined,
        basePrice: opts.includeBasePrice ? g.basePrice : undefined,
        months: g.months,
      })),
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * 导出多月份对比为CSV
   */
  static exportComparisonCSV(comparison: MultiMonthComparisonReport, options: Partial<PriceExportOptions> = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const sortedGoods = this.sortComparisonGoods(comparison.goods, comparison.monthKeys, opts.sortBy, opts.sortOrder);
    
    // 构建表头
    const headers: string[] = ['商品ID', '商品名称'];
    
    if (opts.includeCategories) {
      headers.push('分类');
    }
    
    if (opts.includeBasePrice) {
      headers.push('基准价');
    }
    
    // 为每个月份添加列
    for (const monthKey of comparison.monthKeys) {
      headers.push(
        `${monthKey}月末价`,
        `${monthKey}月涨跌%`,
      );
      
      if (opts.includeBasePrice) {
        headers.push(`${monthKey}较基准%`);
      }
      
      headers.push(`${monthKey}成交量`);
    }
    
    // 构建数据行
    const rows: string[] = [headers.join(',')];
    
    for (const goods of sortedGoods) {
      const row: string[] = [
        String(goods.goodsId),
        goods.name,
      ];
      
      if (opts.includeCategories) {
        row.push(goods.category);
      }
      
      if (opts.includeBasePrice) {
        row.push(goods.basePrice.toFixed(2));
      }
      
      // 添加每个月份的数据
      for (const monthKey of comparison.monthKeys) {
        const monthData = goods.months[monthKey];
        if (monthData) {
          row.push(
            monthData.endPrice.toFixed(2),
            this.formatPercent(monthData.changePercent),
          );
          
          if (opts.includeBasePrice) {
            row.push(this.formatPercent(monthData.baseChangePercent));
          }
          
          row.push(this.formatVolume(monthData.volume));
        } else {
          // 该月份无数据
          row.push('-', '-');
          if (opts.includeBasePrice) {
            row.push('-');
          }
          row.push('-');
        }
      }
      
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }
  
  /**
   * 导出多个月度报告为JSON
   */
  static exportMultipleReportsJSON(reports: MonthlyPriceReport[], options: Partial<PriceExportOptions> = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const exportData = {
      exportTime: new Date().toISOString(),
      reportCount: reports.length,
      reports: reports.map(report => ({
        id: report.id,
        year: report.year,
        month: report.month,
        summary: report.summary,
        goods: this.sortGoods(report.goods, opts.sortBy, opts.sortOrder)
          .map(g => this.formatGoodsForJSON(g, opts)),
      })),
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * 导出多个月度报告为CSV
   */
  static exportMultipleReportsCSV(reports: MonthlyPriceReport[], options: Partial<PriceExportOptions> = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // 合并所有报告的CSV
    const csvParts: string[] = [];
    let isFirst = true;
    
    for (const report of reports) {
      const csv = this.exportReportCSV(report, opts);
      if (isFirst) {
        csvParts.push(csv);
        isFirst = false;
      } else {
        // 跳过表头
        const lines = csv.split('\n');
        csvParts.push(lines.slice(1).join('\n'));
      }
    }
    
    return csvParts.join('\n');
  }
  
  // ==================== 辅助方法 ====================
  
  private static formatGoodsForJSON(goods: GoodsMonthlyStats, opts: PriceExportOptions): object {
    const result: any = {
      goodsId: goods.goodsId,
      name: goods.name,
    };
    
    if (opts.includeCategories) {
      result.category = goods.category;
    }
    
    if (opts.includeBasePrice) {
      result.basePrice = goods.basePrice;
      result.baseChangePercent = parseFloat(goods.baseChangePercent.toFixed(2));
    }
    
    result.startPrice = parseFloat(goods.startPrice.toFixed(2));
    result.endPrice = parseFloat(goods.endPrice.toFixed(2));
    result.changePercent = parseFloat(goods.changePercent.toFixed(2));
    result.highPrice = parseFloat(goods.highPrice.toFixed(2));
    result.lowPrice = parseFloat(goods.lowPrice.toFixed(2));
    result.totalVolume = parseFloat(goods.totalVolume.toFixed(0));
    result.totalValue = parseFloat(goods.totalValue.toFixed(2));
    result.avgPrice = parseFloat(goods.avgPrice.toFixed(2));
    result.tradeCount = goods.tradeCount;
    
    if (opts.includeSupplyDemand) {
      result.avgSupplyDemandRatio = parseFloat(goods.avgSupplyDemandRatio.toFixed(3));
    }
    
    return result;
  }
  
  private static sortGoods(
    goods: GoodsMonthlyStats[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): GoodsMonthlyStats[] {
    const sorted = [...goods];
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'changePercent':
          return multiplier * (a.changePercent - b.changePercent);
        case 'baseChangePercent':
          return multiplier * (a.baseChangePercent - b.baseChangePercent);
        case 'volume':
          return multiplier * (a.totalVolume - b.totalVolume);
        case 'value':
          return multiplier * (a.totalValue - b.totalValue);
        default:
          return 0;
      }
    });
    
    return sorted;
  }
  
  private static sortComparisonGoods(
    goods: MonthComparisonData[],
    monthKeys: string[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): MonthComparisonData[] {
    const sorted = [...goods];
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    const lastMonth = monthKeys[monthKeys.length - 1];
    
    sorted.sort((a, b) => {
      const aData = a.months[lastMonth];
      const bData = b.months[lastMonth];
      
      if (!aData && !bData) return 0;
      if (!aData) return 1;
      if (!bData) return -1;
      
      switch (sortBy) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'changePercent':
          return multiplier * (aData.changePercent - bData.changePercent);
        case 'baseChangePercent':
          return multiplier * (aData.baseChangePercent - bData.baseChangePercent);
        case 'volume':
          return multiplier * (aData.volume - bData.volume);
        default:
          return 0;
      }
    });
    
    return sorted;
  }
  
  private static formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
  
  private static formatVolume(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(0);
  }
  
  private static formatValue(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(2);
  }
  
  // ==================== 文件下载 ====================
  
  /**
   * 触发文件下载
   */
  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob(['\ufeff' + content], { type: mimeType + ';charset=utf-8' }); // 添加BOM以支持Excel正确识别中文
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * 下载当前月度报告CSV
   */
  static downloadCurrentReportCSV(report: MonthlyPriceReport, options: Partial<PriceExportOptions> = {}): void {
    const content = this.exportReportCSV(report, options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    this.downloadFile(content, `price-report-${report.id}-${timestamp}.csv`, 'text/csv');
  }
  
  /**
   * 下载当前月度报告JSON
   */
  static downloadCurrentReportJSON(report: MonthlyPriceReport, options: Partial<PriceExportOptions> = {}): void {
    const content = this.exportReportJSON(report, options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    this.downloadFile(content, `price-report-${report.id}-${timestamp}.json`, 'application/json');
  }
  
  /**
   * 下载多月份对比CSV
   */
  static downloadComparisonCSV(comparison: MultiMonthComparisonReport, options: Partial<PriceExportOptions> = {}): void {
    const content = this.exportComparisonCSV(comparison, options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const monthRange = comparison.monthKeys.join('_');
    this.downloadFile(content, `price-comparison-${monthRange}-${timestamp}.csv`, 'text/csv');
  }
  
  /**
   * 下载多月份对比JSON
   */
  static downloadComparisonJSON(comparison: MultiMonthComparisonReport, options: Partial<PriceExportOptions> = {}): void {
    const content = this.exportComparisonJSON(comparison, options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const monthRange = comparison.monthKeys.join('_');
    this.downloadFile(content, `price-comparison-${monthRange}-${timestamp}.json`, 'application/json');
  }
  
  /**
   * 下载多个月度报告CSV
   */
  static downloadMultipleReportsCSV(reports: MonthlyPriceReport[], options: Partial<PriceExportOptions> = {}): void {
    const content = this.exportMultipleReportsCSV(reports, options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    this.downloadFile(content, `price-reports-${timestamp}.csv`, 'text/csv');
  }
  
  /**
   * 下载多个月度报告JSON
   */
  static downloadMultipleReportsJSON(reports: MonthlyPriceReport[], options: Partial<PriceExportOptions> = {}): void {
    const content = this.exportMultipleReportsJSON(reports, options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    this.downloadFile(content, `price-reports-${timestamp}.json`, 'application/json');
  }
}

// ==================== 便捷导出函数 ====================

export const downloadPriceReportCSV = (report: MonthlyPriceReport, options?: Partial<PriceExportOptions>) =>
  PriceDataExporter.downloadCurrentReportCSV(report, options);

export const downloadPriceReportJSON = (report: MonthlyPriceReport, options?: Partial<PriceExportOptions>) =>
  PriceDataExporter.downloadCurrentReportJSON(report, options);

export const downloadPriceComparisonCSV = (comparison: MultiMonthComparisonReport, options?: Partial<PriceExportOptions>) =>
  PriceDataExporter.downloadComparisonCSV(comparison, options);

export const downloadPriceComparisonJSON = (comparison: MultiMonthComparisonReport, options?: Partial<PriceExportOptions>) =>
  PriceDataExporter.downloadComparisonJSON(comparison, options);
