/**
 * 移动端底部导航栏
 * 显示 5 个核心导航项 + 更多菜单
 */

import React from 'react';
import { useGameStore } from '@/stores/gameStore';

type PageType = 'dashboard' | 'production' | 'market' | 'finance' | 'investment' | 'retail' | 'supplychain' | 'settings';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  page: PageType;
}

// 底部导航只显示核心的 4 个项目
const bottomNavItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: '📊', page: 'dashboard' },
  { id: 'production', label: '生产', icon: '🏭', page: 'production' },
  { id: 'market', label: '市场', icon: '💹', page: 'market' },
  { id: 'finance', label: '财务', icon: '📈', page: 'finance' },
];

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const { ui, setCurrentPage } = useGameStore();
  const { currentPage } = ui;

  // 检查当前页面是否在底部导航中
  const isInBottomNav = bottomNavItems.some(item => item.page === currentPage);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background-elevated border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.page)}
            className={`
              flex flex-col items-center justify-center flex-1 h-full
              transition-colors duration-200 relative
              ${currentPage === item.page
                ? 'text-accent'
                : 'text-foreground-muted hover:text-foreground-secondary'
              }
            `}
          >
            {/* 选中指示器 */}
            {currentPage === item.page && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-accent rounded-b-full" />
            )}
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        
        {/* 更多按钮 */}
        <button
          onClick={onMenuClick}
          className={`
            flex flex-col items-center justify-center flex-1 h-full
            transition-colors duration-200 relative
            ${!isInBottomNav
              ? 'text-accent'
              : 'text-foreground-muted hover:text-foreground-secondary'
            }
          `}
        >
          {!isInBottomNav && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-accent rounded-b-full" />
          )}
          <span className="text-xl mb-0.5">☰</span>
          <span className="text-[10px] font-medium">更多</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
