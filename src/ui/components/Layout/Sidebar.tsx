import React from 'react';
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

interface SidebarProps {
  mode?: 'fixed' | 'overlay';
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode = 'fixed',
  isOpen = true,
  onClose,
}) => {
  const { ui, setCurrentPage, toggleSidebar, hasUnreadNews } = useGameStore();
  const { currentPage, sidebarCollapsed } = ui;
  const hasUnread = hasUnreadNews();
  const isOverlay = mode === 'overlay';
  const isCollapsed = isOverlay ? false : sidebarCollapsed;

  return (
    <>
      {isOverlay && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 pt-14
          bg-background-elevated border-r border-border
          transition-all duration-300
          ${isOverlay ? 'z-50' : 'z-40'}
          ${isCollapsed ? 'w-16' : 'w-60'}
          ${isOverlay ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
        <nav className="h-full flex flex-col py-4">
          {/* 导航项 */}
          <div className="flex-1 space-y-1 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.page);
                  if (isOverlay) {
                    onClose?.();
                  }
                }}
                title={isCollapsed ? item.label : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-left transition-all duration-200 relative
                  ${currentPage === item.page
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)] shadow-sm border-l-2 border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                <span className="text-xl relative">
                  {item.icon}
                  {/* 未读新闻指示器 */}
                  {item.showBadge && hasUnread && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </span>
                {!isCollapsed && (
                  <span className="font-medium flex-1">{item.label}</span>
                )}
                {!isCollapsed && item.showBadge && hasUnread && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full">
                    新
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 折叠按钮 */}
          {!isOverlay && (
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
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
