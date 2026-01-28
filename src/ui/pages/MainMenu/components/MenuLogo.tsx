/**
 * 🎮 主菜单 Logo 组件
 * 带有动画效果的游戏标题
 */

import React, { useMemo } from 'react';
import '../styles/menu.css';

interface MenuLogoProps {
  /** 是否启用动画 */
  animate?: boolean;
  /** 动画开始延迟 (ms) */
  animationDelay?: number;
}

const TITLE_LINE_1 = 'SUPPLY';
const TITLE_LINE_2 = 'CHAIN';
const SUBTITLE = 'COMMANDER';
const TAGLINE = '建立你的商业帝国';

export const MenuLogo: React.FC<MenuLogoProps> = ({
  animate = true,
  animationDelay = 200,
}) => {
  // 生成逐字动画的字符
  const renderAnimatedText = useMemo(() => {
    return (text: string, baseDelay: number, stagger: number = 50) => {
      return text.split('').map((char, index) => (
        <span
          key={index}
          className={animate ? 'char-animate' : ''}
          style={animate ? {
            animationDelay: `${baseDelay + index * stagger}ms`,
          } : undefined}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ));
    };
  }, [animate]);

  return (
    <div className="menu-logo-container">
      {/* 顶部装饰线 */}
      <div 
        className="menu-decorative-line"
        style={animate ? { animationDelay: `${animationDelay}ms` } : { transform: 'scaleX(1)' }}
      />
      
      {/* 主标题 */}
      <div className="flex flex-col items-center">
        <h1 className={`menu-title-main ${animate ? 'glow-animation' : ''}`}>
          <span className="block">
            {renderAnimatedText(TITLE_LINE_1, animationDelay + 200, 60)}
          </span>
          <span className="block">
            {renderAnimatedText(TITLE_LINE_2, animationDelay + 400, 60)}
          </span>
        </h1>
      </div>
      
      {/* 副标题 */}
      <h2 
        className="menu-title-sub"
        style={animate ? { animationDelay: `${animationDelay + 700}ms` } : { opacity: 1 }}
      >
        {SUBTITLE}
      </h2>
      
      {/* 口号 */}
      <p 
        className="menu-tagline"
        style={animate ? { animationDelay: `${animationDelay + 900}ms` } : { opacity: 1 }}
      >
        {TAGLINE}
      </p>
    </div>
  );
};

export default MenuLogo;
