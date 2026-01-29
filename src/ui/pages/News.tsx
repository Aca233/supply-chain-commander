/**
 * 📰 新闻页面
 * 显示所有历史新闻报告
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { formatGameDate } from '@/core/world/GameWorld';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/ui/design-system/components/Card/Card';
import { Button } from '@/ui/design-system/components/Button/Button';
import { useMobile } from '@/ui/hooks/useMobile';
import { MonthlyNewsReport, NewsCategory, NewsImportance } from '@/core/news';

// 分类图标映射
const CATEGORY_ICONS: Record<NewsCategory, string> = {
  economy: '📊',
  market: '📈',
  company: '🏢',
  player: '🎮',
  disaster: '⚠️',
  technology: '🔬',
  policy: '📜',
  entertainment: '🎭',
};

// 分类名称映射
const CATEGORY_NAMES: Record<NewsCategory, string> = {
  economy: '经济动态',
  market: '市场行情',
  company: '企业资讯',
  player: '玩家成就',
  disaster: '灾害预警',
  technology: '科技前沿',
  policy: '政策法规',
  entertainment: '趣闻轶事',
};

// 重要性颜色
const IMPORTANCE_STYLES: Record<NewsImportance, { bg: string; text: string; border: string }> = {
  headline: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  major: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  minor: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  trivia: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

// 获取月份名称
function getMonthName(month: number): string {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return months[month - 1] || `${month}月`;
}

// 单条新闻卡片
const NewsArticleCard: React.FC<{
  article: MonthlyNewsReport['articles'][0];
  isHeadline?: boolean;
}> = ({ article, isHeadline }) => {
  const styles = IMPORTANCE_STYLES[article.importance];
  
  if (isHeadline) {
    return (
      <Card variant="glow" className="overflow-hidden">
        <div className={`${styles.bg} px-4 py-2 border-b ${styles.border}`}>
          <span className={`text-xs font-semibold ${styles.text} tracking-wider`}>
            🔥 头条新闻
          </span>
        </div>
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {article.title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {article.content}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card variant="glass" className="overflow-hidden hover:bg-white/[0.05] transition-colors">
      <div className="flex items-start gap-3 p-4">
        {/* 分类图标 */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-lg
          flex items-center justify-center text-xl
          bg-[var(--bg-muted)] border
          ${styles.text} ${styles.border}
        `}>
          {CATEGORY_ICONS[article.category]}
        </div>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[var(--text-muted)]">
              {CATEGORY_NAMES[article.category]}
            </span>
            {article.importance === 'headline' && (
              <span className={`px-1.5 py-0.5 text-[10px] ${styles.bg} ${styles.text} rounded`}>
                头条
              </span>
            )}
            {article.importance === 'major' && (
              <span className={`px-1.5 py-0.5 text-[10px] ${styles.bg} ${styles.text} rounded`}>
                重要
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
            {article.title}
          </h4>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2">
            {article.content}
          </p>
        </div>
      </div>
    </Card>
  );
};

// 月度报告展开卡片
const MonthlyReportCard: React.FC<{
  report: MonthlyNewsReport;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ report, isExpanded, onToggle }) => {
  return (
    <Card variant="glass" className="overflow-hidden">
      {/* 报告头部 */}
      <CardHeader 
        className="cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* 日期徽章 */}
          <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-900/50 to-orange-900/50 flex flex-col items-center justify-center border border-amber-500/20">
            <span className="text-xs text-amber-400/80">第{report.year}年</span>
            <span className="text-lg font-bold text-amber-300">{getMonthName(report.month)}</span>
          </div>
          
          {/* 标题和摘要 */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base mb-1 truncate">
              📰 {report.headline.title}
            </CardTitle>
            <p className="text-xs text-[var(--text-muted)] line-clamp-1">
              {report.summary || `共 ${report.articles.length + 1} 条新闻`}
            </p>
          </div>
          
          {/* 标签 */}
          <div className="flex items-center gap-2">
            {report.isLLMGenerated && (
              <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded-full">
                🤖 AI
              </span>
            )}
            <span className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded-full">
              {report.articles.length + 1} 条
            </span>
          </div>
          
          {/* 展开图标 */}
          <div className={`w-6 h-6 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </CardHeader>
      
      {/* 展开的内容 */}
      {isExpanded && (
        <CardContent className="p-4 border-t border-[var(--border-muted)]">
          <div className="space-y-4">
            {/* 头条 */}
            <NewsArticleCard article={report.headline} isHeadline />
            
            {/* 其他新闻 */}
            <div className="grid gap-3">
              {report.articles.map((article, idx) => (
                <NewsArticleCard key={article.id || idx} article={article} />
              ))}
            </div>
            
            {/* 月度总结 */}
            {report.summary && (
              <Card variant="glass" className="border-l-4 border-l-blue-500/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    📋 月度总结
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {report.summary}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* 统计数据 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[var(--bg-muted)]">
                <div className="text-xs text-[var(--text-muted)] mb-1">GDP</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  ¥{(report.stats.economy.gdp / 1000000).toFixed(1)}M
                </div>
                <div className={`text-xs ${report.stats.economy.gdpChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {report.stats.economy.gdpChange >= 0 ? '↑' : '↓'}{Math.abs(report.stats.economy.gdpChange).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-muted)]">
                <div className="text-xs text-[var(--text-muted)] mb-1">通胀率</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {(report.stats.economy.inflation * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-muted)]">
                <div className="text-xs text-[var(--text-muted)] mb-1">失业率</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {(report.stats.economy.unemployment * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-muted)]">
                <div className="text-xs text-[var(--text-muted)] mb-1">经济周期</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {report.stats.economy.cyclePhase === 'expansion' ? '📈 扩张' :
                   report.stats.economy.cyclePhase === 'peak' ? '🔝 顶峰' :
                   report.stats.economy.cyclePhase === 'contraction' ? '📉 收缩' : '🔻 低谷'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export const News: React.FC = () => {
  const { tick, getNewsHistory, getNewsCount, hasUnreadNews, showNewsPopup } = useGameStore();
  const newsVersion = useGameStore((s) => s.ui.newsVersion);
  const { isMobile } = useMobile();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  // 使用 newsVersion 确保新闻生成后页面立即更新
  const newsHistory = useMemo(() => getNewsHistory(), [newsVersion]);
  const newsCount = getNewsCount();
  const hasUnread = hasUnreadNews();
  
  // 按年月倒序排列
  const sortedNews = useMemo(() => {
    return [...newsHistory].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [newsHistory]);
  
  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  const handleViewReport = (report: MonthlyNewsReport) => {
    showNewsPopup(report);
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            📰 商业周刊
            {hasUnread && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </h2>
          <span className="text-sm text-[var(--text-muted)]">
            共 {newsCount} 期
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            全部
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            未读
          </Button>
        </div>
      </div>
      
      {/* 新闻列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-4">
        {sortedNews.length === 0 ? (
          <Card variant="glass" className="p-8">
            <div className="text-center text-[var(--text-muted)]">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-lg mb-2">暂无新闻</p>
              <p className="text-sm">
                新闻将在每月初自动生成，敬请期待！
              </p>
            </div>
          </Card>
        ) : (
          sortedNews.map(report => (
            <MonthlyReportCard
              key={report.id}
              report={report}
              isExpanded={expandedId === report.id}
              onToggle={() => handleToggleExpand(report.id)}
            />
          ))
        )}
      </div>
      
      {/* 底部提示 */}
      <div className="flex-shrink-0 text-center text-xs text-[var(--text-muted)] py-2">
        💡 新闻每两个月自动生成，回顾过去的经济动态
      </div>
    </div>
  );
};

export default News;