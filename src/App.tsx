import React, { useEffect } from 'react';
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
import { ToastProvider } from '@/ui/components/Toast/ToastContext';

const App: React.FC = () => {
  const { initGame, startGame, initialized, paused, ui, setTheme } = useGameStore();
  const currentPage = ui.currentPage;
  const sidebarCollapsed = ui.sidebarCollapsed;
  const theme = ui.theme;

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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'production':
        return <Production />;
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