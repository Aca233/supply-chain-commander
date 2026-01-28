/**
 * 🌌 主菜单背景组件
 * 包含网格、光晕、粒子效果
 */

import React from 'react';
import { ParticleField } from './ParticleField';
import '../styles/menu.css';

interface MenuBackgroundProps {
  /** 是否启用粒子效果 */
  enableParticles?: boolean;
  /** 是否启用网格动画 */
  enableGrid?: boolean;
  /** 是否启用光晕效果 */
  enableGlow?: boolean;
}

export const MenuBackground: React.FC<MenuBackgroundProps> = ({
  enableParticles = true,
  enableGrid = true,
  enableGlow = true,
}) => {
  return (
    <div className="menu-background">
      {/* 网格层 */}
      {enableGrid && <div className="menu-grid" />}
      
      {/* 粒子效果层 */}
      {enableParticles && <ParticleField />}
      
      {/* 顶部光晕 */}
      {enableGlow && <div className="menu-glow-top" />}
      
      {/* 底部渐变 */}
      <div className="menu-gradient-bottom" />
    </div>
  );
};

export default MenuBackground;
