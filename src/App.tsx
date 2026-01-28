import React, { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { Sidebar } from '@/ui/components/Layout/Sidebar';
import { Header } from '@/ui/components/Layout/Header';
import { Dashboard } from '@/ui/pages/Dashboard';
import { Production } from '@/ui/pages/Production';
import { Market } from '@/ui/pages/Market';
import { Finance } from '@/ui/pages/Finance';
import { CompetitorsAndInvestment } from '@/ui/pages/CompetitorsAndInvestment';
import { Settings } from '@/ui/pages/Settings';
import Retail from '@/ui/pages/Retail';
import { SupplyChainPage } from '@/ui/pages/SupplyChain';
import { ToastProvider } from '@/ui/components/Toast/ToastContext';
import { soundManager } from '@/core/sound';

const App: React.FC = () => {
  const { initGame, startGame, initialized, paused, ui, setTheme, setSpeed, pauseGame, resumeGame, speed } = useGameStore();
  const currentPage = ui.currentPage;
  const sidebarCollapsed = ui.sidebarCollapsed;
  const theme = ui.theme;
  
  // 用于防止输入框中触发快捷键
  const isInputFocused = useRef(false);

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
  }, [setTheme]);

  // 初始化游戏
  useEffect(() => {
    if (!initialized) {
      initGame();
    }
  }, [initGame, initialized]);

  // 自动开始游戏（可以改为手动）
  useEffect(() => {
    if (initialized && paused) {
      // startGame(); // 取消注释以自动开始
    }
  }, [initialized, paused, startGame]);

  // 键盘快捷键控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框中，不处理快捷键
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' ||
                     target.tagName === 'TEXTAREA' ||
                     target.isContentEditable;
      
      if (isInput) return;
      
      // 数字键 1-4 控制速度
      if (e.key === '1') {
        setSpeed(1);
        soundManager.playClick();
      } else if (e.key === '2') {
        setSpeed(2);
        soundManager.playClick();
      } else if (e.key === '3') {
        setSpeed(4);
        soundManager.playClick();
      } else if (e.key === '4') {
        setSpeed(8);
        soundManager.playClick();
      }
      // 空格键控制暂停/继续
      else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); // 防止页面滚动
        if (paused) {
          resumeGame();
        } else {
          pauseGame();
        }
        soundManager.playClick();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [paused, setSpeed, pauseGame, resumeGame]);

  // 全局点击音效
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // 检查是否点击了按钮或可交互元素
      const isButton = target.tagName === 'BUTTON' ||
                       target.closest('button') !== null;
      const isClickable = target.tagName === 'A' ||
                         target.closest('a') !== null ||
                         target.role === 'button' ||
                         target.closest('[role="button"]') !== null;
      const isTab = target.closest('[role="tab"]') !== null;
      const isSelect = target.tagName === 'SELECT';
      
      // 排除滑块和输入框
      const isSlider = target.tagName === 'INPUT' &&
                      (target as HTMLInputElement).type === 'range';
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (isSlider) return; // 滑块不播放点击音效
      
      if (isButton || isClickable || isTab || isSelect) {
        soundManager.playClick();
      }
    };
    
    // 使用捕获阶段确保在其他处理器之前触发
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'production':
        return <Production />;
      case 'supplychain':
        return <SupplyChainPage />;
      case 'market':
        return <Market />;
      case 'finance':
        return <Finance />;
      case 'investment':
        return <CompetitorsAndInvestment />;
      case 'retail':
        return <Retail />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text-secondary">正在初始化游戏...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-background text-text-primary">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 主内容区 - 根据侧边栏状态动态调整左边距 */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
          {/* 顶部栏 */}
          <Header />

          {/* 页面内容 */}
          <main className="flex-1 overflow-y-auto p-6 mt-14">
            {renderPage()}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;