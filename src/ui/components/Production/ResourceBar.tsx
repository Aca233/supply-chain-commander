/**
 * 资源进度条组件
 * 毛玻璃风格设计
 */

import React from 'react';

interface ResourceBarProps {
  /** 当前值 (0-1) */
  value: number;
  /** 显示的标签 */
  label?: string;
  /** 右侧显示的文本 */
  rightText?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示百分比 */
  showPercentage?: boolean;
  /** 自定义颜色 (默认根据值自动选择) */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'auto';
  /** 是否有动画 */
  animated?: boolean;
  /** 自定义类名 */
  className?: string;
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
};

// 毛玻璃风格渐变色配置
const colorConfig = {
  blue: {
    gradient: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
    glow: '0 0 10px rgba(59, 130, 246, 0.4)',
  },
  green: {
    gradient: 'linear-gradient(90deg, #22C55E 0%, #4ADE80 100%)',
    glow: '0 0 10px rgba(34, 197, 94, 0.4)',
  },
  yellow: {
    gradient: 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)',
    glow: '0 0 10px rgba(245, 158, 11, 0.4)',
  },
  red: {
    gradient: 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)',
    glow: '0 0 10px rgba(239, 68, 68, 0.4)',
  },
  purple: {
    gradient: 'linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%)',
    glow: '0 0 10px rgba(139, 92, 246, 0.4)',
  },
};

const getAutoColor = (value: number): { gradient: string; glow: string } => {
  if (value >= 0.8) return colorConfig.green;
  if (value >= 0.5) return colorConfig.blue;
  if (value >= 0.3) return colorConfig.yellow;
  return colorConfig.red;
};

export const ResourceBar: React.FC<ResourceBarProps> = ({
  value,
  label,
  rightText,
  size = 'md',
  showPercentage = false,
  color = 'auto',
  animated = true,
  className = '',
}) => {
  const clampedValue = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clampedValue * 100);
  
  const barStyle = color === 'auto' ? getAutoColor(clampedValue) : colorConfig[color];
  
  return (
    <div className={className}>
      {(label || rightText || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-xs text-white/60 truncate">{label}</span>
          )}
          <span className="text-xs text-white/50 tabular-nums">
            {rightText || (showPercentage && `${percentage}%`)}
          </span>
        </div>
      )}
      <div className={`w-full bg-white/[0.08] rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`h-full rounded-full ${animated ? 'transition-all duration-300 ease-out' : ''}`}
          style={{
            width: `${percentage}%`,
            background: barStyle.gradient,
            boxShadow: barStyle.glow,
          }}
        />
      </div>
    </div>
  );
};

// 紧凑版本，用于卡片内显示 - 毛玻璃风格
interface CompactResourceBarProps {
  value: number;
  label: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'auto';
}

export const CompactResourceBar: React.FC<CompactResourceBarProps> = ({
  value,
  label,
  color = 'auto',
}) => {
  const clampedValue = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clampedValue * 100);
  const barStyle = color === 'auto' ? getAutoColor(clampedValue) : colorConfig[color];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/50 w-10 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: barStyle.gradient,
            boxShadow: barStyle.glow,
          }}
        />
      </div>
      <span className="text-[10px] text-white/50 tabular-nums w-7 text-right">{percentage}%</span>
    </div>
  );
};

export default ResourceBar;
