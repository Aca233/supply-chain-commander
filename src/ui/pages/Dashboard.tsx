import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { StatCard } from '@/ui/components/Dashboard/StatCard';
import { formatGameDate, tickToDate } from '@/core/world/GameWorld';

export const Dashboard: React.FC = () => {
  const {
    playerCash,
    playerBuildings,
    tick,
    getPlayerInventory,
    getPriceSummary,
    lastTickResult,
    performance,
    getInventoryQuality,
  } = useGameStore();

  const inventory = getPlayerInventory();
  const priceSummary = getPriceSummary();

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.value, 0);

  const formatMoney = (value: number) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(1)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">仪表盘</h2>
        <div className="text-sm text-text-tertiary tabular-nums">
          <span className="inline-block min-w-[150px]">{formatGameDate(tick)}</span> | 性能: <span className="inline-block w-[50px] text-right">{performance?.avgTickTime.toFixed(2)}ms</span>
        </div>
      </div>

      {/* KPI卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="现金"
          value={formatMoney(playerCash)}
          icon="💰"
          change={0.023}
        />
        <StatCard
          title="库存价值"
          value={formatMoney(totalInventoryValue)}
          icon="📦"
          change={-0.012}
        />
        <StatCard
          title="日营收"
          value={formatMoney(lastTickResult?.matching.matchedValue || 0)}
          icon="📈"
          change={0.056}
        />
        <StatCard
          title="建筑数量"
          value={playerBuildings}
          icon="🏭"
          suffix="座"
        />
      </div>

      {/* 市场概览和库存 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 市场价格概览 */}
        <div className="card p-5">
          <h3 className="text-base font-medium mb-4">市场价格概览</h3>
          {priceSummary && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">上涨商品</span>
                <span className="text-chart-up font-medium tabular-nums w-12 text-right">{priceSummary.increasingCount} 种</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">下跌商品</span>
                <span className="text-chart-down font-medium tabular-nums w-12 text-right">{priceSummary.decreasingCount} 种</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">持平商品</span>
                <span className="text-text-secondary font-medium tabular-nums w-12 text-right">{priceSummary.stableCount} 种</span>
              </div>
              
              <div className="border-t border-border my-3"></div>
              
              <div>
                <p className="text-xs text-text-tertiary mb-2">涨幅最大</p>
                {priceSummary.topIncreases.slice(0, 3).map((item) => (
                  <div key={item.goodsId} className="flex justify-between text-sm py-1">
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="text-chart-up tabular-nums w-16 text-right">+{(item.change * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              
              <div>
                <p className="text-xs text-text-tertiary mb-2">跌幅最大</p>
                {priceSummary.topDecreases.slice(0, 3).map((item) => (
                  <div key={item.goodsId} className="flex justify-between text-sm py-1">
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="text-chart-down tabular-nums w-16 text-right">{(item.change * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 库存列表 */}
        <div className="card p-5">
          <h3 className="text-base font-medium mb-4">我的库存</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {inventory.length === 0 ? (
              <p className="text-text-tertiary text-sm py-4 text-center">暂无库存</p>
            ) : (
              inventory.map((item) => {
                const quality = getInventoryQuality(item.goodsId);
                return (
                  <div
                    key={item.goodsId}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{item.name}</p>
                          <span
                            className="px-1.5 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: `${quality.color}20`,
                              color: quality.color,
                            }}
                          >
                            {quality.name}
                          </span>
                        </div>
                        <p className="text-xs text-text-tertiary tabular-nums">
                          <span className="inline-block w-16">{item.quantity.toFixed(0)} 单位</span>
                          {quality.priceMultiplier !== 1.0 && (
                            <span className={`inline-block w-16 ${quality.priceMultiplier > 1 ? 'text-green-400' : 'text-red-400'}`}>
                              价格{quality.priceMultiplier > 1 ? '+' : ''}{((quality.priceMultiplier - 1) * 100).toFixed(0)}%
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">
                        {formatMoney(item.value)}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        实际 {formatMoney(item.value * quality.priceMultiplier)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="card p-5">
        <h3 className="text-base font-medium mb-4">最近活动</h3>
        <div className="space-y-2">
          {lastTickResult && lastTickResult.matching.trades.length > 0 ? (
            lastTickResult.matching.trades.slice(0, 5).map((trade, idx) => {
              const tradeDate = tickToDate(trade.tick);
              const timeStr = `${tradeDate.month}月${tradeDate.day}日 ${tradeDate.hour}:00`;
              return (
                <div key={idx} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-success">🟢</span>
                  <span className="text-sm flex-1 tabular-nums">
                    商品#{trade.goodsId} 以 ¥{trade.price.toFixed(2)} 成交 {trade.quantity.toFixed(0)} 单位
                  </span>
                  <span className="text-xs text-text-tertiary tabular-nums w-24 text-right">
                    {timeStr}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-text-tertiary text-sm py-4 text-center">暂无活动</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;