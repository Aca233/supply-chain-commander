/**
 * 商业周刊 - 非阻塞侧边滑入面板
 * 从右侧滑入，不遮挡游戏操作
 */

import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/ui/design-system/components/Card/Card';
import { Button } from '@/ui/design-system/components/Button/Button';
import { useGameStore } from '@/stores/gameStore';
import { MonthlyNewsReport, NewsCategory, NewsImportance } from '@/core/news';
import { cn } from '@/ui/design-system/utils/cn';

const CATEGORY_ICONS: Record<NewsCategory, string> = {
  economy: '📊', market: '📈', company: '🏢', player: '🎮',
  disaster: '⚠️', technology: '🔬', policy: '📜', entertainment: '🎭',
};

const CATEGORY_NAMES: Record<NewsCategory, string> = {
  economy: '经济动态', market: '市场行情', company: '企业资讯', player: '玩家成就',
  disaster: '灾害预警', technology: '科技前沿', policy: '政策法规', entertainment: '趣闻轶事',
};

const IMPORTANCE_COLORS: Record<NewsImportance, string> = {
  headline: 'text-red-400 border-red-400/30',
  major: 'text-orange-400 border-orange-400/30',
  minor: 'text-blue-400 border-blue-400/30',
  trivia: 'text-gray-400 border-gray-400/30',
};

function getMonthName(month: number): string {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return months[month - 1] || `${month}月`;
}

interface NewsDialogProps {
  open: boolean;
  news: MonthlyNewsReport | null;
  onOpenChange: (open: boolean) => void;
  onViewMore: () => void;
}

export const NewsDialog: React.FC<NewsDialogProps> = ({ open, news, onOpenChange, onViewMore }) => {
  const { markCurrentNewsRead } = useGameStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape 键关闭
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        markCurrentNewsRead();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange, markCurrentNewsRead]);

  if (!news || !open) return null;

  const handleClose = () => {
    markCurrentNewsRead();
    onOpenChange(false);
  };

  const handleViewMore = () => {
    markCurrentNewsRead();
    onViewMore();
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed right-0 top-0 bottom-0 z-40',
        'w-[420px] max-w-[92vw]',
        'bg-gradient-to-b from-[#12121a] to-[#0c0c0e]',
        'border-l border-[#27272a]',
        'shadow-[-8px_0_30px_rgba(0,0,0,0.6)]',
        'flex flex-col',
        'animate-slide-in-right',
      )}
    >
      {/* 头部 */}
      <div className="relative overflow-hidden border-b-2 border-amber-500/30 shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        <div className="text-center py-3 px-4">
          <div className="text-xs text-amber-400/80 tracking-widest mb-1">
            {news.year}年{getMonthName(news.month)}刊
          </div>
          <div className="text-xl font-bold bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
            商业周刊
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {news.isLLMGenerated ? 'AI记者撰写' : '模板生成'}
          </div>
        </div>
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className={cn(
            'absolute right-3 top-3',
            'w-8 h-8 rounded-lg',
            'flex items-center justify-center',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            'hover:bg-[var(--bg-muted)]',
            'transition-colors',
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 头条 */}
        <Card variant="glow" className="overflow-hidden">
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 px-4 py-2 border-b border-red-500/20">
            <span className="text-xs font-semibold text-red-400 tracking-wider">🔥 头条新闻</span>
          </div>
          <CardContent className="p-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{news.headline.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{news.headline.content}</p>
          </CardContent>
        </Card>

        {/* 其他新闻 */}
        <div className="grid gap-3">
          {news.articles.slice(0, 6).map((article, index) => (
            <Card key={article.id || index} variant="glass" className="overflow-hidden">
              <div className="flex items-start gap-3 p-3">
                <div className={cn(
                  'flex-shrink-0 w-9 h-9 rounded-lg',
                  'flex items-center justify-center text-lg',
                  'bg-[var(--bg-muted)]',
                  IMPORTANCE_COLORS[article.importance],
                  'border',
                )}>
                  {CATEGORY_ICONS[article.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--text-muted)]">{CATEGORY_NAMES[article.category]}</span>
                    {article.importance === 'headline' && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">头条</span>
                    )}
                    {article.importance === 'major' && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-orange-500/20 text-orange-400 rounded">重要</span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">{article.title}</h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">{article.content}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 月度总结 */}
        {news.summary && (
          <Card variant="glass" className="overflow-hidden border-l-4 border-l-blue-500/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">📋 月度总结</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{news.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* 剩余新闻提示 */}
        {news.articles.length > 6 && (
          <div className="text-center text-sm text-[var(--text-muted)]">
            还有 {news.articles.length - 6} 条新闻...
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="shrink-0 px-4 py-3 border-t border-[#27272a] bg-[#0c0c0e]/80 flex justify-between items-center">
        <div className="text-xs text-[var(--text-muted)]">
          共 {news.articles.length + 1} 条新闻
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>稍后再看</Button>
          <Button variant="primary" size="sm" onClick={handleViewMore}>查看全部 →</Button>
        </div>
      </div>
    </div>
  );
};

export default NewsDialog;
