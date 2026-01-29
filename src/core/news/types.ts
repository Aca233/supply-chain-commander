/**
 * 新闻系统类型定义
 */

/**
 * 新闻类别
 */
export type NewsCategory = 
  | 'economy'      // 经济指标
  | 'market'       // 市场价格
  | 'company'      // 公司动态
  | 'player'       // 玩家成就
  | 'disaster'     // 灾难事件
  | 'technology'   // 科技进步
  | 'policy'       // 政策变化
  | 'entertainment'; // 趣闻轶事

/**
 * 新闻重要性
 */
export type NewsImportance = 'headline' | 'major' | 'minor' | 'trivia';

/**
 * 单条新闻
 */
export interface NewsArticle {
  id: string;
  category: NewsCategory;
  importance: NewsImportance;
  title: string;           // 标题
  content: string;         // 内容
  emoji?: string;          // 装饰表情
  relatedData?: {          // 关联数据（用于显示图表等）
    type: 'price' | 'company' | 'goods';
    id: number;
  };
}

/**
 * 月度新闻报告
 */
export interface MonthlyNewsReport {
  id: string;
  year: number;
  month: number;
  tick: number;           // 生成时的tick
  generatedAt: number;    // 真实时间戳
  isLLMGenerated: boolean; // 是否由LLM生成
  
  // 头条新闻
  headline: NewsArticle;
  
  // 分类新闻
  articles: NewsArticle[];
  
  // 月度总结
  summary: string;
  
  // 月度关键数据
  stats: MonthlyStats;
}

/**
 * 月度统计数据
 */
export interface MonthlyStats {
  // 经济指标
  economy: {
    gdp: number;
    gdpChange: number;
    inflation: number;
    unemployment: number;
    cyclePhase: string;
  };
  
  // 价格变化 Top 10
  priceChanges: Array<{
    goodsId: number;
    goodsName: string;
    startPrice: number;
    endPrice: number;
    changePercent: number;
  }>;
  
  // 公司排行
  companyRankings: {
    richest: Array<{ id: number; name: string; cash: number }>;
    mostBuildings: Array<{ id: number; name: string; count: number }>;
    mostGrowth: Array<{ id: number; name: string; growthPercent: number }>;
    bankrupt: Array<{ id: number; name: string }>;
  };
  
  // 玩家数据
  playerStats: {
    cashChange: number;
    cashChangePercent: number;
    buildingsBuilt: number;
    buildingsDemolished: number;
    tradesCompleted: number;
    totalTradeValue: number;
    largestTrade?: { goodsName: string; value: number };
  };
  
  // 灾难事件
  disasters: Array<{
    type: string;
    severity: string;
    tick: number;
    impact: string;
  }>;
  
  // 重大事件
  majorEvents: Array<{
    type: string;
    description: string;
    tick: number;
  }>;
}

/**
 * 游戏事件（用于追踪）
 */
export interface GameEvent {
  id: string;
  type: GameEventType;
  tick: number;
  data: Record<string, unknown>;
}

/**
 * 游戏事件类型
 */
export type GameEventType =
  | 'company_bankrupt'
  | 'company_ipo'
  | 'company_acquisition'
  | 'price_shock'
  | 'disaster'
  | 'economic_event'
  | 'player_building_built'
  | 'player_building_demolished'
  | 'player_large_trade'
  | 'ai_large_trade'
  | 'market_milestone';

/**
 * 月初快照数据
 */
export interface MonthSnapshot {
  tick: number;
  year: number;
  month: number;
  prices: Float32Array;
  companyCash: Float64Array;
  companyAssets: Float64Array;
  playerCash: number;
  playerBuildings: number;
  gdp: number;
}