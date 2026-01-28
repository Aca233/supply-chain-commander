import React from 'react';
import { useGameStore } from '@/stores/gameStore';

export const Header: React.FC = () => {
  const {
    gameDate,
    paused,
    speed,
    playerCash,
    startGame,
    pauseGame,
    resumeGame,
    setSpeed,
    initialized,
    ui,
    toggleTheme
  } = useGameStore();
  
  const theme = ui.theme;

  const formatCash = (value: number) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(2)}K`;
    }
    return `¥${value.toFixed(2)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-background-elevated border-b border-border">
      <div className="h-full flex items-center justify-between px-4">
        {/* Logo和游戏名称 */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">SC</span>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">
            供应链指挥官
          </h1>
        </div>

        {/* 游戏时间和控制 */}
        <div className="flex items-center gap-6">
          {/* 游戏日期 */}
          <div className="text-sm">
            <span className="text-text-tertiary">游戏时间：</span>
            <span className="text-text-primary font-medium ml-1 tabular-nums min-w-[150px] inline-block">{gameDate}</span>
          </div>

          {/* 速度控制 */}
          <div className="flex items-center gap-1">
            {([1, 2, 4, 8] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`
                  w-8 h-8 rounded text-sm font-medium transition-colors
                  ${speed === s
                    ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30'
                    : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }
                `}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* 播放/暂停 */}
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
              transition-colors text-xl
              ${paused
                ? 'bg-success text-white hover:bg-green-600'
                : 'bg-warning text-white hover:bg-yellow-600'
              }
            `}
          >
            {paused ? '▶' : '⏸'}
          </button>
        </div>

        {/* 玩家资金和设置 */}
        <div className="flex items-center gap-4">
          <div className="text-right min-w-[80px]">
            <div className="text-xs text-text-tertiary">现金</div>
            <div className="text-lg font-semibold text-text-primary tabular-nums">
              {formatCash(playerCash)}
            </div>
          </div>

          {/* 主题切换按钮 */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 bg-background-tertiary rounded-full flex items-center justify-center
                       hover:bg-background-secondary transition-colors"
            title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            <span className="text-lg">{theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>

          {/* 用户头像 */}
          <div className="w-9 h-9 bg-background-tertiary rounded-full flex items-center justify-center">
            <span className="text-text-secondary">👤</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;