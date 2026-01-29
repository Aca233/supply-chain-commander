/**
 * 新闻存储系统
 * 管理历史新闻的存储和读取
 */

import { MonthlyNewsReport } from './types';

const STORAGE_KEY = 'game_news_history';
const LAST_READ_KEY = 'last_read_news_id';
const MAX_STORED_REPORTS = 24; // 保留最近2年的新闻

// 内存缓存
let newsCache: MonthlyNewsReport[] = [];
let cacheLoaded = false;
let lastReadNewsId: string | null = null;

/**
 * 加载历史新闻
 */
export function loadNewsHistory(): MonthlyNewsReport[] {
  if (cacheLoaded) {
    return [...newsCache];
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      newsCache = JSON.parse(stored);
      cacheLoaded = true;
    }
  } catch (e) {
    console.error('[NewsStore] Failed to load news history:', e);
    newsCache = [];
  }
  
  return [...newsCache];
}

/**
 * 保存新闻报告
 */
export function saveNewsReport(report: MonthlyNewsReport): void {
  loadNewsHistory(); // 确保缓存已加载
  
  // 检查是否已存在相同月份的新闻（避免重复）
  const existingIndex = newsCache.findIndex(
    r => r.year === report.year && r.month === report.month
  );
  
  if (existingIndex >= 0) {
    // 替换已有的
    newsCache[existingIndex] = report;
  } else {
    // 添加新报告到开头
    newsCache.unshift(report);
  }
  
  // 限制数量
  if (newsCache.length > MAX_STORED_REPORTS) {
    newsCache = newsCache.slice(0, MAX_STORED_REPORTS);
  }
  
  // 持久化
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newsCache));
    console.log(`[NewsStore] Saved news report: ${report.id}`);
  } catch (e) {
    console.error('[NewsStore] Failed to save news report:', e);
  }
}

/**
 * 获取最新新闻
 */
export function getLatestNews(): MonthlyNewsReport | null {
  loadNewsHistory();
  return newsCache[0] || null;
}

/**
 * 获取指定月份的新闻
 */
export function getNewsByMonth(year: number, month: number): MonthlyNewsReport | null {
  loadNewsHistory();
  return newsCache.find(r => r.year === year && r.month === month) || null;
}

/**
 * 获取所有新闻历史
 */
export function getAllNews(): MonthlyNewsReport[] {
  return loadNewsHistory();
}

/**
 * 获取新闻数量
 */
export function getNewsCount(): number {
  loadNewsHistory();
  return newsCache.length;
}

/**
 * 清除新闻历史
 */
export function clearNewsHistory(): void {
  newsCache = [];
  cacheLoaded = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_READ_KEY);
    console.log('[NewsStore] Cleared news history');
  } catch (e) {
    console.error('[NewsStore] Failed to clear news history:', e);
  }
}

/**
 * 检查是否有未读新闻
 */
export function hasUnreadNews(): boolean {
  const latest = getLatestNews();
  if (!latest) return false;
  
  try {
    lastReadNewsId = localStorage.getItem(LAST_READ_KEY);
  } catch {
    lastReadNewsId = null;
  }
  
  return latest.id !== lastReadNewsId;
}

/**
 * 标记新闻为已读
 */
export function markNewsAsRead(newsId: string): void {
  lastReadNewsId = newsId;
  try {
    localStorage.setItem(LAST_READ_KEY, newsId);
  } catch (e) {
    console.error('[NewsStore] Failed to mark news as read:', e);
  }
}

/**
 * 获取上次阅读的新闻ID
 */
export function getLastReadNewsId(): string | null {
  if (lastReadNewsId === null) {
    try {
      lastReadNewsId = localStorage.getItem(LAST_READ_KEY);
    } catch {
      lastReadNewsId = null;
    }
  }
  return lastReadNewsId;
}

/**
 * 重置新闻存储（游戏重新开始时调用，但保留历史）
 */
export function resetNewsStore(): void {
  // 只重置缓存标记，不清除localStorage
  // 这样玩家可以保留历史新闻
  cacheLoaded = false;
  lastReadNewsId = null;
}

/**
 * 完全重置（新游戏时调用）
 */
export function fullResetNewsStore(): void {
  clearNewsHistory();
  lastReadNewsId = null;
}