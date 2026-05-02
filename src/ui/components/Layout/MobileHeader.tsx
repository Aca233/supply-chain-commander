/**
 * 移动端顶部导航栏
 * 简化版，只显示核心信息和菜单入口
 */

import React from 'react';
import { useGameStore } from '@/stores/gameStore';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick }) => {
  const {
    playerCash,
    paused,
    resumeGame,
    pauseGame,
    initialized,
    gameDate,
  } = useGameStore();

  const formatCash = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-40 bg-background-elevated border-b border-border safe-area-top">
      <div className="h-full flex items-center justify-between px-3">
        {/* 左侧：菜单按钮 + Logo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="w-10 h-10 rounded-lg bg-background-muted flex items-center justify-center
                       text-foreground-secondary hover:bg-background-subtle transition-colors"
          >
            <span className="text-xl">☰</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            <span className="text-sm font-medium text-foreground-muted hidden sm:inline">
              {gameDate}
            </span>
          </div>
        </div>

        {/* 右侧：现金 + 暂停按钮 */}
        <div className="flex items-center gap-2">
          {/* 现金显示 */}
          <div className="bg-background-surface rounded-lg px-3 py-1.5 border border-border">
            <span className="text-xs text-foreground-muted">💰</span>
            <span className="ml-1 text-sm font-semibold text-foreground tabular-nums">
              {formatCash(playerCash)}
            </span>
          </div>

          {/* 暂停/播放按钮 */}
          <button
            onClick={() => {
              if (!initialized) return;
              if (paused) {
                resumeGame();
              } else {
                pauseGame();
              }
            }}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              transition-colors text-lg
              ${paused
                ? 'bg-success text-white'
                : 'bg-warning text-white'
              }
            `}
          >
            {paused ? '▶' : '⏸'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
