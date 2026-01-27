/**
 * 零售管理页面
 * Pop只能在零售建筑消费，这个页面让玩家管理他们的零售店
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { formatNumber } from '@/ui/utils/format';

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

  // 强制刷新计数器（每个tick刷新）
  const [, setRefresh] = useState(0);
  
  useEffect(() => {
    // 每秒刷新一次UI
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        🏪 零售管理
      </h1>
      
      {/* 市场概览 */}
      {marketOverview && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            市场概览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">总零售店数</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {marketOverview.totalStores}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">今日营收</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ¥{formatNumber(marketOverview.totalRevenue)}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">今日客流</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatNumber(marketOverview.totalCustomers)}
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">平均声誉</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {marketOverview.avgReputation.toFixed(1)}
              </div>
            </div>
          </div>
          
          {/* 热销商品 */}
          {marketOverview.topSellingGoods.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔥 热销商品
              </h3>
              <div className="flex flex-wrap gap-2">
                {marketOverview.topSellingGoods.slice(0, 5).map(item => (
                  <span
                    key={item.goodsId}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm cursor-pointer hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                    onClick={() => handleGoodsClick(item.goodsId)}
                    title="点击查看市场详情"
                  >
                    {item.name}: {formatNumber(item.quantity)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 玩家零售店列表 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          我的零售店 ({playerStoreIds.length})
        </h2>
        
        {storeDetails.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🏪</div>
            <p className="text-gray-500 dark:text-gray-400">
              你还没有零售店。建造零售建筑来开始你的零售业务！
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              提示：消费者(Pop)只能在零售店购买商品
            </p>
          </div>
        ) : (
          storeDetails.map(store => store && (
            <div
              key={store.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              {/* 店铺头部 */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {store.typeName} #{store.id}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      建筑ID: {store.buildingId}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {store.reputation.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      声誉
                    </p>
                  </div>
                </div>
                
                {/* 经营指标 */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">今日营收</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      ¥{formatNumber(store.dailyRevenue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">今日利润</div>
                    <div className={`text-lg font-semibold ${
                      store.dailyProfit >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ¥{formatNumber(store.dailyProfit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">今日客流</div>
                    <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                      {store.totalCustomers}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 库存列表 */}
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  📦 库存管理
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-2">商品</th>
                        <th className="pb-2 text-right">库存</th>
                        <th className="pb-2 text-right">容量</th>
                        <th className="pb-2 text-right">今日销量</th>
                        <th className="pb-2 text-right">加价率</th>
                        <th className="pb-2 text-right">零售价</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store.inventory.map(item => (
                        <tr
                          key={item.goodsId}
                          className="border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          onClick={() => handleGoodsClick(item.goodsId)}
                          title="点击查看市场详情"
                        >
                          <td className="py-2">
                            <span className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                              {item.name}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <span className={`${
                              item.quantity <= 0
                                ? 'text-red-500'
                                : item.quantity < item.capacity * 0.3
                                  ? 'text-yellow-500'
                                  : 'text-gray-900 dark:text-white'
                            }`}>
                              {formatNumber(item.quantity)}
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-500 dark:text-gray-400">
                            {formatNumber(item.capacity)}
                          </td>
                          <td className="py-2 text-right text-blue-600 dark:text-blue-400">
                            {formatNumber(item.dailySales)}
                          </td>
                          <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              value={(item.markup * 100).toFixed(0)}
                              onChange={(e) => {
                                const newMarkup = parseFloat(e.target.value) / 100;
                                if (!isNaN(newMarkup)) {
                                  handleMarkupChange(store.id, item.goodsId, newMarkup);
                                }
                              }}
                              className="w-16 px-2 py-1 text-right bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
                              min="0"
                              max="200"
                            />
                            <span className="ml-1 text-gray-500">%</span>
                          </td>
                          <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">
                            ¥{formatNumber(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {store.inventory.some(item => item.quantity <= 0) && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ⚠️ 部分商品缺货！零售店会自动从批发市场进货。
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* 说明 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
          📋 零售系统说明
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• <strong>消费者(Pop)只能在零售店消费</strong>，不能直接从批发市场购买</li>
          <li>• 零售店会自动从批发市场进货，当库存低于30%时触发</li>
          <li>• 你可以手动设置加价率，系统也会根据销售情况自动调整</li>
          <li>• 声誉会影响消费者的选择，良好经营可提升声誉</li>
          <li>• 缺货会降低声誉，请保持充足库存</li>
        </ul>
      </div>
    </div>
  );
};

export default Retail;
