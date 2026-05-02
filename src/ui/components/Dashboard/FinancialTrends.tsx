/**
 * 财务趋势图表组件
 * 显示现金余额、收入支出趋势
 */

import React, { useMemo } from 'react';
import { PriceChart } from '@/ui/components/Charts/PriceChart';
import { FinancialTrendPoint } from './hooks/useDashboardData';

interface FinancialTrendsProps {
  data: FinancialTrendPoint[];
  dailyProfit: number;
}

export const FinancialTrends: React.FC<FinancialTrendsProps> = ({ data, dailyProfit }) => {
  // 转换数据格式为 PriceChart 需要的格式
  const chartData = useMemo(() => {
    return data.map(point => ({
      time: point.time,
      price: point.cash,
      volume: Math.abs(point.revenue) + Math.abs(point.cost),
    }));
  }, [data]);

  // 计算累计收支
  const { cumulativeRevenue, cumulativeCost, cumulativeProfit } = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    for (const point of data) {
      revenue += point.revenue;
      cost += point.cost;
    }
    return {
      cumulativeRevenue: revenue,
      cumulativeCost: cost,
      cumulativeProfit: revenue - cost,
    };
  }, [data]);

  const formatMoney = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `¥${(value / 1000).toFixed(1)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  return (
    <div className="card p-4 h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          📈 财务趋势
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-text-tertiary">
            日收益: 
            <span className={`ml-1 font-medium ${dailyProfit >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
              {dailyProfit >= 0 ? '+' : ''}{formatMoney(dailyProfit)}
            </span>
          </span>
        </div>
      </div>

      {/* 摘要指标 */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-background-secondary rounded-lg p-2">
          <p className="text-xs text-text-tertiary">累计收入</p>
          <p className="text-sm font-medium text-chart-up tabular-nums">
            {formatMoney(cumulativeRevenue)}
          </p>
        </div>
        <div className="bg-background-secondary rounded-lg p-2">
          <p className="text-xs text-text-tertiary">累计支出</p>
          <p className="text-sm font-medium text-chart-down tabular-nums">
            {formatMoney(cumulativeCost)}
          </p>
        </div>
        <div className="bg-background-secondary rounded-lg p-2">
          <p className="text-xs text-text-tertiary">累计利润</p>
          <p className={`text-sm font-medium tabular-nums ${cumulativeProfit >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
            {cumulativeProfit >= 0 ? '+' : ''}{formatMoney(cumulativeProfit)}
          </p>
        </div>
      </div>

      {/* 图表 */}
      <div className="flex-1 min-h-0">
        {data.length > 0 ? (
          <PriceChart
            data={chartData}
            title="现金余额趋势"
            height={200}
            showVolume={true}
            showMA={false}
            showTimeRangeSelector={false}
            defaultMode="area"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            <div className="text-center">
              <p className="text-2xl mb-2">📊</p>
              <p className="text-sm">暂无财务数据</p>
              <p className="text-xs">运行游戏后将自动记录</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialTrends;