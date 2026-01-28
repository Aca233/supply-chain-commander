/**
 * 📋 主菜单底部信息组件
 */

import React from 'react';
import '../styles/menu.css';

interface MenuFooterProps {
  /** 版本号 */
  version?: string;
  /** 是否启用动画 */
  animate?: boolean;
}

export const MenuFooter: React.FC<MenuFooterProps> = ({
  version = '0.1.0-alpha',
  animate = true,
}) => {
  return (
    <footer 
      className="menu-footer"
      style={animate ? undefined : { opacity: 1 }}
    >
      <div className="menu-footer-version">
        v{version}
      </div>
      <div className="menu-footer-credits">
        Made with <span className="heart">❤️</span> for simulation game enthusiasts
      </div>
    </footer>
  );
};

export default MenuFooter;
