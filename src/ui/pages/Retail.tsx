/**
 * 零售管理页面
 * Pop只能在零售建筑消费，这个页面让玩家管理他们的零售店
 * 使用新设计系统组件重构
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { formatNumber } from '@/ui/utils/format';

// 设计系统组件
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  StatWidget,
  ProgressBar,
} from '@/ui/design-system';

const Retail: React.FC = () => {
  const {
    getPlayerRetailStores,
    getRetailStoreDetails,
    getRetailMarketOverview,
    setRetailMarkup,
    setCurrentPage,
    setSelectedGoods,
    tick,
  } = useGameStore();

  // 强制刷新计数器
  const [, setRefresh] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh(r => r + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 获取玩家的零售店
  const playerStoreIds = useMemo(() => getPlayerRetailStores(), [getPlayerRetailStores, tick]);

  // 获取零售市场概览
  const marketOverview = useMemo(() => getRetailMarketOverview(), [getRetailMarketOverview, tick]);

  // 获取每个零售店的详情
  const storeDetails = useMemo(() => {
    return playerStoreIds.map(id => getRetailStoreDetails(id)).filter(Boolean);
  }, [playerStoreIds, getRetailStoreDetails, tick]);

  const handleMarkupChange = (retailId: number, goodsId: number, markup: number) => {
    setRetailMarkup(retailId, goodsId, markup);
  };

  // 点击商品名称跳转到市场页面
  const handleGoodsClick = (goodsId: number) => {
    setSelectedGoods(goodsId);
    setCurrentPage('market');
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        🏪 零售管理
      </h1>

      {/* 市场概览 */}
      {marketOverview && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>📊 市场概览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatWidget
                title="总零售店数"
                value={marketOverview.totalStores.toString()}
                icon="🏪"
                compact
              />
              <StatWidget
                title="今日营收"
                value={`¥${formatNumber(marketOverview.totalRevenue)}`}
                icon="💰"
                status="success"
                compact
              />
              <StatWidget
                title="今日客流"
                value={formatNumber(marketOverview.totalCustomers)}
                icon="👥"
                compact
              />
              <StatWidget
                title="平均声誉"
                value={marketOverview.avgReputation.toFixed(1)}
                icon="⭐"
                status={marketOverview.avgReputation >= 80 ? 'success' : marketOverview.avgReputation >= 50 ? 'warning' : 'error'}
                compact
              />
            </div>

            {/* 热销商品 */}
            {marketOverview.topSellingGoods.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                  🔥 热销商品
                </h3>
                <div className="flex flex-wrap gap-2">
                  {marketOverview.topSellingGoods.slice(0, 5).map(item => (
                    <Badge
                      key={item.goodsId}
                      variant="error"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleGoodsClick(item.goodsId)}
                    >
                      {item.name}: {formatNumber(item.quantity)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 玩家零售店列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            我的零售店
          </h2>
          <Badge variant="primary">{playerStoreIds.length} 家</Badge>
        </div>

        {storeDetails.length === 0 ? (
          <Card variant="elevated" padding="lg">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🏪</div>
              <p className="text-[var(--text-muted)]">
                你还没有零售店。建造零售建筑来开始你的零售业务！
              </p>
              <p className="text-sm text-[var(--text-subtle)] mt-2">
                提示：消费者(Pop)只能在零售店购买商品
              </p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setCurrentPage('production')}
              >
                🏗️ 去建造零售店
              </Button>
            </div>
          </Card>
        ) : (
          storeDetails.map(store => store && (
            <Card key={store.id} variant="elevated">
              {/* 店铺头部 */}
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <CardTitle>{store.typeName} #{store.id}</CardTitle>
                    <p className="text-sm text-[var(--text-muted)]">
                      建筑ID: {store.buildingId}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-xl">⭐</span>
                      <span className="text-2xl font-bold text-[var(--text-primary)]">
                        {store.reputation.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">声誉</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 经营指标 */}
                <div className="grid grid-cols-3 gap-4">
                  <StatWidget
                    title="今日营收"
                    value={`¥${formatNumber(store.dailyRevenue)}`}
                    icon="💵"
                    status="success"
                    compact
                  />
                  <StatWidget
                    title="今日利润"
                    value={`¥${formatNumber(store.dailyProfit)}`}
                    icon={store.dailyProfit >= 0 ? '📈' : '📉'}
                    status={store.dailyProfit >= 0 ? 'success' : 'error'}
                    compact
                  />
                  <StatWidget
                    title="今日客流"
                    value={store.totalCustomers.toString()}
                    icon="👥"
                    compact
                  />
                </div>

                {/* 库存列表 */}
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3">
                    📦 库存管理
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
                          <th className="pb-2">商品</th>
                          <th className="pb-2 text-right">库存</th>
                          <th className="pb-2 text-center w-32">库存状态</th>
                          <th className="pb-2 text-right">今日销量</th>
                          <th className="pb-2 text-right">加价率</th>
                          <th className="pb-2 text-right">零售价</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store.inventory.map(item => {
                          const fillPercent = (item.quantity / item.capacity) * 100;
                          return (
                            <tr
                              key={item.goodsId}
                              className="border-b border-[var(--border-muted)] cursor-pointer hover:bg-[var(--bg-muted)] transition-colors"
                              onClick={() => handleGoodsClick(item.goodsId)}
                            >
                              <td className="py-2">
                                <span className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]">
                                  {item.name}
                                </span>
                              </td>
                              <td className="py-2 text-right">
                                <span className={`tabular-nums ${
                                  item.quantity <= 0
                                    ? 'text-[var(--error)]'
                                    : fillPercent < 30
                                      ? 'text-[var(--warning)]'
                                      : 'text-[var(--text-primary)]'
                                }`}>
                                  {formatNumber(item.quantity)}
                                </span>
                                <span className="text-[var(--text-muted)]">
                                  /{formatNumber(item.capacity)}
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                <ProgressBar
                                  value={fillPercent}
                                  size="sm"
                                  color={
                                    fillPercent <= 0 ? 'error' :
                                    fillPercent < 30 ? 'warning' :
                                    fillPercent < 70 ? 'brand' : 'success'
                                  }
                                />
                              </td>
                              <td className="py-2 text-right text-[var(--info)] tabular-nums">
                                {formatNumber(item.dailySales)}
                              </td>
                              <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    value={(item.markup * 100).toFixed(0)}
                                    onChange={(e) => {
                                      const newMarkup = parseFloat(e.target.value) / 100;
                                      if (!isNaN(newMarkup)) {
                                        handleMarkupChange(store.id, item.goodsId, newMarkup);
                                      }
                                    }}
                                    className="w-16 px-2 py-1 text-right bg-[var(--bg-surface)] border border-[var(--border-default)] rounded text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                                    min="0"
                                    max="200"
                                  />
                                  <span className="text-[var(--text-muted)]">%</span>
                                </div>
                              </td>
                              <td className="py-2 text-right font-medium text-[var(--success)] tabular-nums">
                                ¥{formatNumber(item.price)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {store.inventory.some(item => item.quantity <= 0) && (
                    <Card variant="default" status="error" padding="sm" className="mt-3">
                      <p className="text-sm text-[var(--error)]">
                        ⚠️ 部分商品缺货！零售店会自动从批发市场进货。
                      </p>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 说明 */}
      <Card variant="default" status="info" padding="md">
        <h3 className="text-sm font-semibold text-[var(--info)] mb-2">
          📋 零售系统说明
        </h3>
        <ul className="text-sm text-[var(--text-secondary)] space-y-1">
          <li>• <strong className="text-[var(--text-primary)]">消费者(Pop)只能在零售店消费</strong>，不能直接从批发市场购买</li>
          <li>• 零售店会自动从批发市场进货，当库存低于30%时触发</li>
          <li>• 你可以手动设置加价率，系统也会根据销售情况自动调整</li>
          <li>• 声誉会影响消费者的选择，良好经营可提升声誉</li>
          <li>• 缺货会降低声誉，请保持充足库存</li>
        </ul>
      </Card>
    </div>
  );
};

export default Retail;
