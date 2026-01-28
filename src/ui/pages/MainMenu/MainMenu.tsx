/**
 * 🎮 主菜单页面
 * 游戏启动时的主菜单界面
 */

import React, { useCallback, useEffect, useState } from 'react';
import { MenuBackground } from './components/MenuBackground';
import { MenuLogo } from './components/MenuLogo';
import { MenuButton } from './components/MenuButton';
import { MenuFooter } from './components/MenuFooter';
import { useMenuAnimations } from './hooks/useMenuAnimations';
import { soundManager } from '@/core/sound';
import './styles/menu.css';

// 图标组件
const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ContinueIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ExitIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export interface MainMenuProps {
  /** 是否有可继续的存档 */
  hasSaveGame?: boolean;
  /** 开始新游戏回调 */
  onNewGame?: () => void;
  /** 继续游戏回调 */
  onContinue?: () => void;
  /** 加载存档回调 */
  onLoadGame?: () => void;
  /** 设置回调 */
  onSettings?: () => void;
  /** 退出回调 */
  onExit?: () => void;
  /** 版本号 */
  version?: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  hasSaveGame = false,
  onNewGame,
  onContinue,
  onLoadGame,
  onSettings,
  onExit,
  version = '0.1.0-alpha',
}) => {
  const { isStarted, getButtonDelay } = useMenuAnimations();
  const [isExiting, setIsExiting] = useState(false);

  // 按钮点击处理
  const handleNewGame = useCallback(() => {
    soundManager.playClick();
    setIsExiting(true);
    setTimeout(() => {
      onNewGame?.();
    }, 300);
  }, [onNewGame]);

  const handleContinue = useCallback(() => {
    soundManager.playClick();
    setIsExiting(true);
    setTimeout(() => {
      onContinue?.();
    }, 300);
  }, [onContinue]);

  const handleLoadGame = useCallback(() => {
    soundManager.playClick();
    onLoadGame?.();
  }, [onLoadGame]);

  const handleSettings = useCallback(() => {
    soundManager.playClick();
    onSettings?.();
  }, [onSettings]);

  const handleExit = useCallback(() => {
    soundManager.playClick();
    onExit?.();
  }, [onExit]);

  // 按钮悬停音效
  const handleButtonHover = useCallback(() => {
    soundManager.playHover();
  }, []);

  // 键盘导航支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // 如果有焦点的按钮，不需要额外处理
        return;
      }
      
      // ESC 键退出
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExit]);

  return (
    <div 
      className={`
        fixed inset-0 flex flex-col items-center justify-center
        transition-opacity duration-300
        ${isExiting ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* 动态背景 */}
      <MenuBackground />

      {/* 主内容区 */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <MenuLogo animate={isStarted} />

        {/* 菜单按钮组 */}
        <div className="menu-button-group">
          {/* 新游戏 */}
          <MenuButton
            variant="primary"
            icon={<PlayIcon />}
            animationDelay={getButtonDelay(0)}
            animate={isStarted}
            onClick={handleNewGame}
            onMouseEnter={handleButtonHover}
          >
            新 游 戏
          </MenuButton>

          {/* 继续游戏 */}
          <MenuButton
            variant="secondary"
            icon={<ContinueIcon />}
            animationDelay={getButtonDelay(1)}
            animate={isStarted}
            onClick={handleContinue}
            onMouseEnter={handleButtonHover}
            disabled={!hasSaveGame}
          >
            继续游戏
          </MenuButton>

          {/* 加载存档 */}
          <MenuButton
            variant="ghost"
            icon={<FolderIcon />}
            animationDelay={getButtonDelay(2)}
            animate={isStarted}
            onClick={handleLoadGame}
            onMouseEnter={handleButtonHover}
          >
            加载存档
          </MenuButton>

          {/* 设置 */}
          <MenuButton
            variant="ghost"
            icon={<SettingsIcon />}
            animationDelay={getButtonDelay(3)}
            animate={isStarted}
            onClick={handleSettings}
            onMouseEnter={handleButtonHover}
          >
            设    置
          </MenuButton>

          {/* 退出 */}
          <MenuButton
            variant="danger"
            icon={<ExitIcon />}
            animationDelay={getButtonDelay(4)}
            animate={isStarted}
            onClick={handleExit}
            onMouseEnter={handleButtonHover}
          >
            退    出
          </MenuButton>
        </div>
      </div>

      {/* 底部信息 */}
      <MenuFooter version={version} animate={isStarted} />
    </div>
  );
};

export default MainMenu;
