/**
 * 股东结构图表组件
 * 以条形图形式展示公司股东持股比例
 */

import React, { useMemo } from 'react';
import { OwnershipInfo, ShareholderInfo } from '@/core/finance/CompanyProfile';

interface ShareholderChartProps {
  ownership: OwnershipInfo;
  showLegend?: boolean;
  height?: number;
}

// 股东颜色映射
const SHAREHOLDER_COLORS = [
  '#8b5cf6', // 紫色 - 自持/大股东
  '#3b82f6', // 蓝色
  '#22c55e', // 绿色
  '#f59e0b', // 橙色
  '#ef4444', // 红色
  '#06b6d4', // 青色
  '#ec4899', // 粉色
  '#84cc16', // 青绿
];

// 玩家专用颜色
const PLAYER_COLOR = '#fbbf24'; // 金色

/**
 * 格式化百分比
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const ShareholderChart: React.FC<ShareholderChartProps> = ({
  ownership,
  showLegend = true,
  height = 24,
}) => {
  // 处理股东数据
  const chartData = useMemo(() => {
    const shareholders = ownership.majorShareholders;
    const result: Array<{
      id: number;
      name: string;
      percentage: number;
      color: string;
      isPlayer: boolean;
    }> = [];
    
    let totalPercentage = 0;
    let colorIndex = 0;
    
    // 添加主要股东
    for (const sh of shareholders) {
      if (sh.percentage < 1) continue; // 忽略太小的持股
      
      result.push({
        id: sh.holderId,
        name: sh.holderName,
        percentage: sh.percentage,
        color: sh.isPlayer ? PLAYER_COLOR : SHAREHOLDER_COLORS[colorIndex % SHAREHOLDER_COLORS.length],
        isPlayer: sh.isPlayer,
      });
      
      totalPercentage += sh.percentage;
      if (!sh.isPlayer) colorIndex++;
    }
    
    // 添加"公众持股/流通股"
    if (totalPercentage < 100) {
      result.push({
        id: -1,
        name: '公众流通股',
        percentage: 100 - totalPercentage,
        color: '#475569', // slate-600
        isPlayer: false,
      });
    }
    
    return result;
  }, [ownership.majorShareholders]);
  
  // 计算可用流通股（非自持部分）
  const floatInfo = useMemo(() => {
    const selfHolding = ownership.majorShareholders.find(
      sh => sh.holderId === ownership.controllingShareholderId
    );
    const selfPercent = selfHolding?.percentage || 0;
    return {
      floatPercent: 100 - selfPercent,
      selfPercent,
    };
  }, [ownership]);
  
  return (
    <div className="space-y-2">
      {/* 进度条 */}
      <div 
        className="w-full rounded-full overflow-hidden flex"
        style={{ height: `${height}px` }}
      >
        {chartData.map((item, index) => (
          <div
            key={item.id}
            className="h-full relative group transition-all"
            style={{
              width: `${item.percentage}%`,
              backgroundColor: item.color,
              minWidth: item.percentage > 0 ? '2px' : '0',
            }}
            title={`${item.name}: ${formatPercent(item.percentage)}`}
          >
            {/* 悬浮提示 */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 
                          opacity-0 group-hover:opacity-100 transition-opacity z-10
                          bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {item.name}: {formatPercent(item.percentage)}
            </div>
            
            {/* 大比例时显示标签 */}
            {item.percentage >= 15 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-white drop-shadow-md">
                  {formatPercent(item.percentage)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* 图例 */}
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {chartData.map((item) => (
            <div key={item.id} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className={item.isPlayer ? 'text-yellow-400 font-medium' : 'text-slate-300'}>
                {item.name}
              </span>
              <span className="text-slate-500">
                {formatPercent(item.percentage)}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* 流通股信息 */}
      <div className="flex flex-col gap-1 text-xs text-slate-400">
        <div className="flex justify-between">
          <span>流通股比例: {formatPercent(floatInfo.floatPercent)}</span>
          {ownership.controllingShareholderName && (
            <span>
              控股方: {ownership.controllingShareholderName}
              ({formatPercent(ownership.controllingPercentage)})
            </span>
          )}
        </div>
        <div className="text-slate-500">
          注：「公众流通股」表示在市场上可自由交易、尚未被特定股东持有的股份
        </div>
      </div>
    </div>
  );
};

/**
 * 紧凑版股东图表（用于列表中）
 */
export const ShareholderChartCompact: React.FC<{
  ownership: OwnershipInfo;
}> = ({ ownership }) => {
  const chartData = useMemo(() => {
    const shareholders = ownership.majorShareholders;
    const result: Array<{ percentage: number; color: string }> = [];
    
    let totalPercentage = 0;
    let colorIndex = 0;
    
    for (const sh of shareholders.slice(0, 4)) {
      if (sh.percentage < 1) continue;
      
      result.push({
        percentage: sh.percentage,
        color: sh.isPlayer ? PLAYER_COLOR : SHAREHOLDER_COLORS[colorIndex % SHAREHOLDER_COLORS.length],
      });
      
      totalPercentage += sh.percentage;
      if (!sh.isPlayer) colorIndex++;
    }
    
    if (totalPercentage < 100) {
      result.push({
        percentage: 100 - totalPercentage,
        color: '#475569',
      });
    }
    
    return result;
  }, [ownership.majorShareholders]);
  
  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-700">
      {chartData.map((item, index) => (
        <div
          key={index}
          className="h-full"
          style={{
            width: `${item.percentage}%`,
            backgroundColor: item.color,
          }}
        />
      ))}
    </div>
  );
};

export default ShareholderChart;