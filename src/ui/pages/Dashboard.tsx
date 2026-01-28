/**
 * 仪表盘主页面
 * 混合型管理控制台 - 整合所有关键业务信息
 */

import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { formatGameDate } from '@/core/world/GameWorld';

// 导入仪表盘组件
import {
  KPIBar,
  FinancialTrends,
  ProductionOverviewPanel,
  MarketDynamicsPanel,
  InvestmentPanel,
  AlertCenter,
  InventoryOverview,
  useDashboardData,
} from '@/ui/components/Dashboard';

export const Dashboard: React.FC = () => {
  const { tick, performance, setCurrentPage, setSelectedGoods } = useGameStore();

  // 获取聚合的仪表盘数据
  const {
    kpi,
    kpiChanges,
    financialTrends,
    productionStats,
    marketStats,
    investmentStats,
    inventoryStats,
  } = useDashboardData();

  // 导航处理
  const handleNavigate = useCallback((view: string, _data?: Record<string, unknown>) => {
    setCurrentPage(view as any);
  }, [setCurrentPage]);

  // 交易处理 - 跳转到市场并选中指定商品
  const handleTrade = useCallback((goodsId: number, _type: 'buy' | 'sell') => {
    setSelectedGoods(goodsId);
    setCurrentPage('market');
  }, [setCurrentPage, setSelectedGoods]);

  // 商品点击处理 - 跳转到市场并选中指定商品
  const handleGoodsClick = useCallback((goodsId: number) => {
    setSelectedGoods(goodsId);
    setCurrentPage('market');
  }, [setCurrentPage, setSelectedGoods]);

  // 查看公司
  const handleViewCompany = useCallback((_companyId: number) => {
    setCurrentPage('investment');
    // TODO: 选中指定公司
  }, [setCurrentPage]);

  // 卖出库存
  const handleSellItem = useCallback((_goodsId: number) => {
    setCurrentPage('market');
    // TODO: 打开卖出面板
  }, [setCurrentPage]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toUpperCase()) {
        case 'B':
          handleNavigate('buildings');
          break;
        case 'T':
          handleNavigate('market');
          break;
        case 'L':
          handleNavigate('finance');
          break;
        case 'I':
          handleNavigate('investment');
          break;
        case 'P':
          handleNavigate('production');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNavigate]);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">控制台</h2>
        </div>
        <div className="flex items-center gap-4 text-sm text-text-tertiary">
          <span className="tabular-nums">{formatGameDate(tick)}</span>
          <span className="text-text-tertiary">|</span>
          <span className="tabular-nums">
            {performance?.avgTickTime.toFixed(2) || '0.00'}ms/tick
          </span>
        </div>
      </div>

      {/* KPI 栏 */}
      <div className="flex-shrink-0">
        <KPIBar kpi={kpi} changes={kpiChanges} />
      </div>

      {/* 主要内容区域 - 3栏布局 */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        {/* 左侧栏 - 财务与生产 */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          {/* 财务趋势 */}
          <div className="flex-1 min-h-0">
            <FinancialTrends
              data={financialTrends}
              dailyProfit={kpi.dailyProfit}
            />
          </div>
          
          {/* 生产概览 */}
          <div className="flex-1 min-h-0">
            <ProductionOverviewPanel
              stats={productionStats}
              onNavigate={handleNavigate}
              onGoodsClick={handleGoodsClick}
            />
          </div>
        </div>

        {/* 中间栏 - 市场与投资 */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          {/* 市场动态 */}
          <div className="flex-1 min-h-0">
            <MarketDynamicsPanel
              stats={marketStats}
              onNavigate={handleNavigate}
              onTrade={handleTrade}
            />
          </div>
          
          {/* 投资组合 */}
          <div className="flex-1 min-h-0">
            <InvestmentPanel
              stats={investmentStats}
              onNavigate={handleNavigate}
              onViewCompany={handleViewCompany}
            />
          </div>
        </div>

        {/* 右侧栏 - 告警、库存 */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          {/* 告警中心 */}
          <div className="h-56 flex-shrink-0">
            <AlertCenter
              onNavigate={handleNavigate}
              maxAlerts={5}
            />
          </div>
          
          {/* 库存概览 */}
          <div className="flex-1 min-h-0">
            <InventoryOverview
              stats={inventoryStats}
              onNavigate={handleNavigate}
              onSellItem={handleSellItem}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;