import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { Sidebar } from '@/ui/components/Layout/Sidebar';
import { Header } from '@/ui/components/Layout/Header';
import { MobileDrawer } from '@/ui/components/Layout/MobileDrawer';
import { MobileHeader } from '@/ui/components/Layout/MobileHeader';
import { MobileBottomNav } from '@/ui/components/Layout/MobileBottomNav';
import { Dashboard } from '@/ui/pages/Dashboard';
import { Production } from '@/ui/pages/Production';
import { Market } from '@/ui/pages/Market';
import { Finance } from '@/ui/pages/Finance';
import { CompetitorsAndInvestment } from '@/ui/pages/CompetitorsAndInvestment';
import { Settings } from '@/ui/pages/Settings';
import Retail from '@/ui/pages/Retail';
import { SupplyChainPage } from '@/ui/pages/SupplyChain';
import { MainMenu, SettingsDialog } from '@/ui/pages/MainMenu';
import { ToastProvider } from '@/ui/components/Toast/ToastContext';
import { soundManager } from '@/core/sound';
import { useMobile } from '@/ui/hooks/useMobile';

// 存档前缀（与 SaveManager 保持一致）
const SAVE_PREFIX = 'supply_chain_save_';

// 应用状态类型
type AppScreen = 'mainmenu' | 'game' | 'loading';

// 获取所有存档的元数据
const getSaveList = () => {
  const saves: { id: string; name: string; timestamp: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SAVE_PREFIX)) {
      try {
        const json = localStorage.getItem(key);
        if (json) {
          const data = JSON.parse(json);
          if (data.metadata) {
            saves.push({
              id: data.metadata.id,
              name: data.metadata.name,
              timestamp: data.metadata.timestamp,
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse save:', key, e);
      }
    }
  }
  // 按时间戳降序排序
  return saves.sort((a, b) => b.timestamp - a.timestamp);
};

// 检查是否有存档
const checkHasSaveGame = (): boolean => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SAVE_PREFIX)) {
      return true;
    }
  }
  return false;
};

const App: React.FC = () => {
  const { initGame, startGame, initialized, paused, ui, setTheme, setSpeed, pauseGame, resumeGame, setCurrentPage } = useGameStore();
  const currentPage = ui.currentPage;
  const sidebarCollapsed = ui.sidebarCollapsed;
  
  // 移动端检测
  const { isMobile, isTablet } = useMobile();
  const showMobileLayout = isMobile || isTablet;
  
  // 移动端抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // 应用屏幕状态
  const [screen, setScreen] = useState<AppScreen>('mainmenu');
  
  // 检查是否有存档
  const [hasSaveGame, setHasSaveGame] = useState(false);
  
  // 显示存档列表对话框
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveList, setSaveList] = useState<{ id: string; name: string; timestamp: number }[]>([]);
  
  // 显示设置对话框
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // 用于防止输入框中触发快捷键
  const isInputFocused = useRef(false);
  
  // 用于确保游戏只启动一次
  const hasAutoStartedRef = useRef(false);

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
  }, [setTheme]);

  // 检查存档
  useEffect(() => {
    setHasSaveGame(checkHasSaveGame());
  }, []);

  // 初始化游戏（仅在进入游戏时）
  useEffect(() => {
    if (screen === 'game' && !initialized) {
      initGame();
    }
  }, [screen, initGame, initialized]);

  // 游戏初始化完成后自动开始（只执行一次）
  useEffect(() => {
    if (screen === 'game' && initialized && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startGame();
    }
  }, [screen, initialized, startGame]);

  // 当返回主菜单时重置自动启动标志
  useEffect(() => {
    if (screen === 'mainmenu') {
      hasAutoStartedRef.current = false;
    }
  }, [screen]);

  // 键盘快捷键控制（仅在游戏中生效，移动端禁用）
  useEffect(() => {
    if (screen !== 'game' || showMobileLayout) return;
    
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
  }, [screen, paused, setSpeed, pauseGame, resumeGame, showMobileLayout]);

  // 全局点击音效（仅在游戏中生效）
  useEffect(() => {
    if (screen !== 'game') return;
    
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
  }, [screen]);

  // 主菜单回调 - 新游戏
  const handleNewGame = useCallback(() => {
    setScreen('game');
  }, []);

  // 主菜单回调 - 继续游戏（加载最近的存档）
  const handleContinue = useCallback(() => {
    const saves = getSaveList();
    if (saves.length > 0) {
      // 加载最近的存档
      const latestSave = saves[0];
      console.log('继续游戏，加载存档:', latestSave.name);
      // TODO: 实际加载存档逻辑
      // gameStore.loadGame(latestSave.id);
      setScreen('game');
    }
  }, []);

  // 主菜单回调 - 加载存档
  const handleLoadGame = useCallback(() => {
    const saves = getSaveList();
    setSaveList(saves);
    setShowLoadDialog(true);
  }, []);

  // 加载指定存档
  const handleLoadSave = useCallback((saveId: string) => {
    console.log('加载存档:', saveId);
    // TODO: 实际加载存档逻辑
    // gameStore.loadGame(saveId);
    setShowLoadDialog(false);
    setScreen('game');
  }, []);

  // 主菜单回调 - 设置
  const handleSettings = useCallback(() => {
    setShowSettingsDialog(true);
  }, []);

  // 主菜单回调 - 退出
  const handleExit = useCallback(() => {
    // 网页游戏通常不需要退出功能
    if (confirm('确定要退出游戏吗？')) {
      window.close();
    }
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

  // 存档列表对话框
  const renderLoadDialog = () => {
    if (!showLoadDialog) return null;
    
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
        onClick={() => setShowLoadDialog(false)}
      >
        <div 
          className="bg-[#0a0a0b] border border-[#27272a] rounded-xl p-4 sm:p-6 w-full max-w-[480px] max-h-[80vh] overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, #0a0a0b 0%, #111113 100%)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>📂</span>
            <span>加载存档</span>
          </h2>
          
          {saveList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-4">📭</div>
              <p>没有找到存档</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {saveList.map((save) => (
                <button
                  key={save.id}
                  className="w-full p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10 hover:border-[#3b82f6] hover:bg-white/10 transition-all text-left group"
                  onClick={() => handleLoadSave(save.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="font-medium text-white group-hover:text-[#60a5fa]">
                      {save.name}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500">
                      {new Date(save.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
              onClick={() => setShowLoadDialog(false)}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 主菜单屏幕
  if (screen === 'mainmenu') {
    return (
      <>
        <MainMenu
          hasSaveGame={hasSaveGame}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onLoadGame={handleLoadGame}
          onSettings={handleSettings}
          onExit={handleExit}
          version="0.1.0-alpha"
        />
        {renderLoadDialog()}
        <SettingsDialog 
          open={showSettingsDialog} 
          onClose={() => setShowSettingsDialog(false)} 
        />
      </>
    );
  }

  // 加载屏幕
  if (screen === 'game' && !initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text-secondary">正在初始化游戏...</p>
        </div>
      </div>
    );
  }

  // 游戏主界面 - 移动端布局
  if (showMobileLayout) {
    return (
      <ToastProvider>
        <div className="flex flex-col h-screen bg-background text-text-primary">
          {/* 移动端顶部栏 */}
          <MobileHeader onMenuClick={() => setDrawerOpen(true)} />

          {/* 主内容区 */}
          <main className="flex-1 overflow-y-auto pt-14 pb-16 px-3 sm:px-4">
            {renderPage()}
          </main>

          {/* 移动端底部导航 */}
          <MobileBottomNav onMenuClick={() => setDrawerOpen(true)} />

          {/* 移动端抽屉导航 */}
          <MobileDrawer 
            isOpen={drawerOpen} 
            onClose={() => setDrawerOpen(false)} 
          />
        </div>
      </ToastProvider>
);
  }

  // 游戏主界面 - 桌面端布局
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
