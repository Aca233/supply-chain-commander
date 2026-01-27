import React from 'react';
import { useGameStore } from '@/stores/gameStore';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  page: 'dashboard' | 'production' | 'market' | 'finance' | 'investment' | 'retail' | 'settings';
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: '📊', page: 'dashboard' },
  { id: 'production', label: '生产管理', icon: '🏭', page: 'production' },
  { id: 'market', label: '市场交易', icon: '💹', page: 'market' },
  { id: 'retail', label: '零售管理', icon: '🏪', page: 'retail' },
  { id: 'finance', label: '财务报表', icon: '📈', page: 'finance' },
  { id: 'investment', label: '竞争与投资', icon: '🏛️', page: 'investment' },
  { id: 'settings', label: '设置', icon: '⚙️', page: 'settings' },
];

export const Sidebar: React.FC = () => {
  const { ui, setCurrentPage, toggleSidebar } = useGameStore();
  const { currentPage, sidebarCollapsed } = ui;

  return (
    <aside
      className={`
        fixed left-0 top-0 bottom-0 z-40 pt-14
        bg-background-elevated border-r border-border
        transition-all duration-300
        ${sidebarCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      <nav className="h-full flex flex-col py-4">
        {/* 导航项 */}
        <div className="flex-1 space-y-1 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.page)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-left transition-colors
                ${currentPage === item.page
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'text-text-secondary hover:bg-background-secondary hover:text-text-primary'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </div>

        {/* 折叠按钮 */}
        <div className="px-2 mt-4">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                       text-text-tertiary hover:bg-background-secondary hover:text-text-secondary
                       transition-colors"
          >
            <span className="text-lg">
              {sidebarCollapsed ? '→' : '←'}
            </span>
            {!sidebarCollapsed && <span>收起侧栏</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;