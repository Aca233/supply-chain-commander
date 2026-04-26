/**
 * 新闻生成器
 * 协调LLM生成和模板生成，管理新闻生成流程
 */

import { GameWorld, tickToDate } from '@/core/world/GameWorld';
import { MonthlyNewsReport } from './types';
import { collectMonthlyStats, captureMonthStartSnapshot } from './MonthlyStatsCollector';
import { generateNewsWithLLM } from './LLMNewsGenerator';
import { generateTemplateNews } from './TemplateNewsGenerator';
import { saveNewsReport, getNewsByMonth } from './NewsStore';
import { isLLMConfigured } from '@/core/llm/LLMConfig';
import { cleanupOldEvents } from './EventTracker';

// 上次生成新闻的月份
let lastGeneratedMonth = -1;
let lastGeneratedYear = -1;

// 新闻生成回调
type NewsCallback = (report: MonthlyNewsReport) => void;
let newsCallbacks: NewsCallback[] = [];

/**
 * 注册新闻生成回调
 */
export function onNewsGenerated(callback: NewsCallback): () => void {
  newsCallbacks.push(callback);
  // 返回取消注册函数
  return () => {
    newsCallbacks = newsCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * 触发新闻回调
 */
function triggerNewsCallbacks(report: MonthlyNewsReport): void {
  newsCallbacks.forEach(cb => {
    try {
      cb(report);
    } catch (e) {
      console.error('[NewsGenerator] Callback error:', e);
    }
  });
}

/**
 * 检查是否需要生成新闻（每两个月）
 * 触发月份：1、3、5、7、9、11月
 */
export function shouldGenerateNews(
  tick: number,
  newsGenerationEnabled: boolean = true,
): boolean {
  if (!newsGenerationEnabled) {
    return false;
  }

  const date = tickToDate(tick);
  // 每两个月的1号触发（奇数月：1、3、5、7、9、11）
  if (date.day === 1 && date.month % 2 === 1) {
    // 避免重复生成
    if (date.year !== lastGeneratedYear || date.month !== lastGeneratedMonth) {
      return true;
    }
  }

  return false;
}

/**
 * 检查是否需要记录快照（每两个月）
 * 快照月份：1、3、5、7、9、11月（与新闻生成同步）
 */
export function shouldCaptureSnapshot(tick: number): boolean {
  const date = tickToDate(tick);
  // 每两个月的1号记录快照（奇数月，1 tick = 1天）
  return date.day === 1 && date.month % 2 === 1;
}

/**
 * 生成双月新闻报告（每两个月一期）
 */
export async function generateMonthlyNews(world: GameWorld): Promise<MonthlyNewsReport | null> {
  const date = tickToDate(world.tick);
  
  // 生成的是过去两个月的新闻（例如：3月1日生成1-2月的新闻）
  let reportYear = date.year;
  let reportEndMonth = date.month - 1; // 上个月为结束月
  if (reportEndMonth < 1) {
    reportEndMonth = 12;
    reportYear -= 1;
  }
  let reportStartMonth = reportEndMonth - 1; // 上上个月为开始月
  if (reportStartMonth < 1) {
    reportStartMonth = 12;
    if (reportEndMonth === 12) {
      // 如果结束月是12月，开始月是11月，年份不变
    } else {
      reportYear -= 1;
    }
  }
  
  // 用于存储的月份标识（使用结束月）
  const reportMonth = reportEndMonth;
  
  // 前两个月不生成新闻（没有历史数据）
  if (reportYear < 1 || (reportYear === 1 && reportMonth < 2)) {
    console.log(`[NewsGenerator] Skipping news for first period`);
    // 更新状态避免重复触发
    lastGeneratedYear = date.year;
    lastGeneratedMonth = date.month;
    return null;
  }
  
  // 检查是否已有该月新闻
  const existing = getNewsByMonth(reportYear, reportMonth);
  if (existing) {
    console.log(`[NewsGenerator] News for ${reportYear}-${reportMonth} already exists`);
    // 更新状态
    lastGeneratedYear = date.year;
    lastGeneratedMonth = date.month;
    return existing;
  }
  
  console.log(`[NewsGenerator] Generating news for ${reportYear}-${reportMonth}...`);
  
  // 收集统计数据
  const stats = collectMonthlyStats(world);
  
  // 尝试LLM生成
  let newsContent: {
    headline: any;
    articles: any[];
    summary: string;
  } | null = null;
  
  let isLLMGenerated = false;
  
  if (isLLMConfigured()) {
    console.log('[NewsGenerator] Attempting LLM generation...');
    try {
      newsContent = await generateNewsWithLLM(stats, reportYear, reportMonth);
      if (newsContent) {
        isLLMGenerated = true;
        console.log('[NewsGenerator] LLM generation successful');
      } else {
        console.log('[NewsGenerator] LLM generation returned null, falling back to template');
      }
    } catch (e) {
      console.error('[NewsGenerator] LLM generation error:', e);
    }
  } else {
    console.log('[NewsGenerator] LLM not configured, using template');
  }
  
  // 如果LLM失败，使用模板
  if (!newsContent) {
    console.log('[NewsGenerator] Using template generation');
    newsContent = generateTemplateNews(stats, reportYear, reportMonth);
  }
  
  // 构建完整报告
  const report: MonthlyNewsReport = {
    id: `news_${reportYear}_${reportMonth}_${Date.now()}`,
    year: reportYear,
    month: reportMonth,
    tick: world.tick,
    generatedAt: Date.now(),
    isLLMGenerated,
    headline: {
      ...newsContent.headline,
      id: `headline_${reportYear}_${reportMonth}`,
    },
    articles: newsContent.articles.map((a, i) => ({
      ...a,
      id: `article_${reportYear}_${reportMonth}_${i}`,
    })),
    summary: newsContent.summary,
    stats,
  };
  
  // 保存
  saveNewsReport(report);
  
  // 更新状态
  lastGeneratedYear = date.year;
  lastGeneratedMonth = date.month;
  
  // 清理旧事件
  cleanupOldEvents(world.tick);
  
  console.log(`[NewsGenerator] News report generated: ${report.id}`);
  
  // 触发回调
  triggerNewsCallbacks(report);
  
  return report;
}

/**
 * 初始化新闻系统（游戏开始时调用）
 */
export function initNewsSystem(world: GameWorld): void {
  const date = tickToDate(world.tick);
  lastGeneratedYear = date.year;
  lastGeneratedMonth = date.month;
  
  // 记录初始快照
  captureMonthStartSnapshot(world);
  
  console.log(`[NewsGenerator] Initialized at ${date.year}-${date.month}`);
}

/**
 * 重置新闻系统（游戏重新开始时调用）
 */
export function resetNewsSystem(): void {
  lastGeneratedYear = -1;
  lastGeneratedMonth = -1;
  newsCallbacks = [];
  console.log('[NewsGenerator] Reset');
}

/**
 * 手动触发新闻生成（调试用）
 */
export async function forceGenerateNews(world: GameWorld): Promise<MonthlyNewsReport | null> {
  const date = tickToDate(world.tick);
  
  // 强制重置状态
  lastGeneratedYear = -1;
  lastGeneratedMonth = -1;
  
  // 生成新闻
  const report = await generateMonthlyNews(world);
  
  return report;
}

/**
 * 获取上次生成新闻的月份信息
 */
export function getLastGeneratedMonth(): { year: number; month: number } | null {
  if (lastGeneratedYear < 0 || lastGeneratedMonth < 0) {
    return null;
  }
  return { year: lastGeneratedYear, month: lastGeneratedMonth };
}
