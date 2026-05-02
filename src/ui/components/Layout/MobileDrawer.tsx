/**
 * 移动端抽屉导航组件
 * 从左侧滑出的全屏导航菜单
 */

import React, { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  page: 'dashboard' | 'production' | 'market' | 'finance' | 'investment' | 'retail' | 'supplychain' | 'news' | 'settings';
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: '📊', page: 'dashboard' },
  { id: 'production', label: '生产管理', icon: '🏭', page: 'production' },
  { id: 'supplychain', label: '产业链', icon: '🔗', page: 'supplychain' },
  { id: 'market', label: '市场交易', icon: '💹', page: 'market' },
  { id: 'retail', label: '零售管理', icon: '🏪', page: 'retail' },
  { id: 'finance', label: '财务报表', icon: '📈', page: 'finance' },
  { id: 'investment', label: '竞争与投资', icon: '🏛️', page: 'investment' },
  { id: 'news', label: '商业周刊', icon: '📰', page: 'news', showBadge: true },
  { id: 'settings', label: '设置', icon: '⚙️', page: 'settings' },
];

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { ui, setCurrentPage, gameDate, playerCash, paused, speed, setSpeed, pauseGame, resumeGame, hasUnreadNews } = useGameStore();
  const { currentPage } = ui;
  const drawerRef = useRef<HTMLDivElement>(null);
  const hasUnread = hasUnreadNews();

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleNavClick = (page: NavItem['page']) => {
    setCurrentPage(page);
    onClose();
  };

  const formatCash = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`
          fixed inset-0 z-50 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* 抽屉面板 */}
      <div
        ref={drawerRef}
        className={`
          fixed left-0 top-0 bottom-0 z-50 w-72
          bg-background-elevated border-r border-border
          transform transition-transform duration-300 ease-out
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 头部 - Logo 和关闭按钮 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">SC</span>
            </div>
            <div>
              <h1 className="font-semibold text-foreground">供应链指挥官</h1>
              <p className="text-xs text-foreground-muted">{gameDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-background-muted flex items-center justify-center
                       text-foreground-secondary hover:bg-background-subtle transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 游戏状态 */}
        <div className="p-4 border-b border-border bg-background-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground-secondary">现金</span>
            <span className="text-lg font-semibold text-foreground tabular-nums">
              {formatCash(playerCash)}
            </span>
          </div>
          
          {/* 速度控制 - 暂停按钮已在顶栏，这里只显示速度 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-secondary">速度</span>
            <div className="flex-1 flex items-center gap-1">
              {([1, 2, 4, 8] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`
                    flex-1 h-9 rounded-lg text-sm font-medium transition-colors
                    ${speed === s
                      ? 'bg-accent text-white'
                      : 'bg-background-muted text-foreground-secondary'
                    }
                  `}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 导航列表 */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.page)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  text-left transition-all duration-200 relative
                  ${currentPage === item.page
                    ? 'bg-accent/15 text-accent border-l-4 border-accent'
                    : 'text-foreground-secondary hover:bg-background-muted hover:text-foreground'
                  }
                `}
              >
                <span className="text-2xl relative">
                  {item.icon}
                  {/* 未读新闻指示器 */}
                  {item.showBadge && hasUnread && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  )}
                </span>
                <span className="font-medium text-base flex-1">{item.label}</span>
                {item.showBadge && hasUnread && (
                  <span className="px-2 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full">
                    新
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* 底部版本信息 */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-foreground-muted text-center">v0.1.0-alpha</p>
        </div>
      </div>
    </>
  );
};

export default MobileDrawer;
