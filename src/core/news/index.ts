/**
 * 新闻系统模块
 * 导出所有新闻相关功能
 */

// 类型导出
export type {
  NewsCategory,
  NewsImportance,
  NewsArticle,
  MonthlyNewsReport,
  MonthlyStats,
  GameEvent,
  GameEventType,
  MonthSnapshot,
} from './types';

// 事件追踪器
export {
  trackEvent,
  getMonthEvents,
  getCurrentMonthEvents,
  cleanupOldEvents,
  resetEventTracker,
  // 便捷函数
  trackCompanyBankrupt,
  trackCompanyIPO,
  trackCompanyAcquisition,
  trackPriceShock,
  trackDisaster,
  trackEconomicEvent,
  trackPlayerBuilding,
  trackLargeTrade,
  trackMarketMilestone,
} from './EventTracker';

// 月度统计收集器
export {
  captureMonthStartSnapshot,
  getMonthStartSnapshot,
  collectMonthlyStats,
  resetMonthlyStats,
} from './MonthlyStatsCollector';

// 新闻存储
export {
  loadNewsHistory,
  saveNewsReport,
  getLatestNews,
  getNewsByMonth,
  getAllNews,
  getNewsCount,
  clearNewsHistory,
  hasUnreadNews,
  markNewsAsRead,
  getLastReadNewsId,
  resetNewsStore,
  fullResetNewsStore,
} from './NewsStore';

// LLM新闻生成器
export { generateNewsWithLLM } from './LLMNewsGenerator';

// 模板新闻生成器
export { generateTemplateNews } from './TemplateNewsGenerator';

// 新闻生成器主逻辑
export {
  onNewsGenerated,
  shouldGenerateNews,
  shouldCaptureSnapshot,
  generateMonthlyNews,
  initNewsSystem,
  resetNewsSystem,
  forceGenerateNews,
  getLastGeneratedMonth,
} from './NewsGenerator';