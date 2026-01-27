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
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

const colorStyles = {
  blue: 'from-blue-500 to-blue-400',
  green: 'from-green-500 to-green-400',
  yellow: 'from-yellow-500 to-yellow-400',
  red: 'from-red-500 to-red-400',
  purple: 'from-purple-500 to-purple-400',
};

const getAutoColor = (value: number): string => {
  if (value >= 0.8) return colorStyles.green;
  if (value >= 0.5) return colorStyles.blue;
  if (value >= 0.3) return colorStyles.yellow;
  return colorStyles.red;
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
  
  const barColor = color === 'auto' ? getAutoColor(clampedValue) : colorStyles[color];
  
  return (
    <div className={`${className}`}>
      {(label || rightText || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-xs text-text-secondary truncate">{label}</span>
          )}
          <span className="text-xs text-text-tertiary tabular-nums">
            {rightText || (showPercentage && `${percentage}%`)}
          </span>
        </div>
      )}
      <div className={`w-full bg-white/10 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full ${
            animated ? 'transition-all duration-300 ease-out' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// 紧凑版本，用于卡片内显示
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
  const barColor = color === 'auto' ? getAutoColor(clampedValue) : colorStyles[color];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary w-12 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-text-tertiary tabular-nums w-8 text-right">{percentage}%</span>
    </div>
  );
};

export default ResourceBar;