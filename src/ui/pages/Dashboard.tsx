/**
 * 仪表盘主页面
 * 混合型管理控制台 - 整合所有关键业务信息
 * 支持响应式布局：移动端单列、平板双列、桌面三列
 */

import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { formatGameDate } from '@/core/world/GameWorld';
import { useMobile } from '@/ui/hooks/useMobile';
import { getDashboardLayoutMode } from './dashboardLayout';

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
  const { isMobile, isTablet, isNarrowDesktop } = useMobile();
  const layoutMode = getDashboardLayoutMode({ isMobile, isTablet, isNarrowDesktop });

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

  // 快捷键支持 (仅桌面端)
  useEffect(() => {
    if (isMobile || isTablet) return;
    
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
  }, [handleNavigate, isMobile, isTablet]);

  // 移动端布局
  if (layoutMode === 'mobile') {
    return (
      <div className="flex flex-col gap-3 pb-4">
        {/* 顶部信息栏 - 简化版 */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">控制台</h2>
          <span className="text-xs text-foreground-muted tabular-nums">
            {formatGameDate(tick)}
          </span>
        </div>

        {/* KPI 栏 - 移动端优化 */}
        <KPIBar kpi={kpi} changes={kpiChanges} />

        {/* 单列滚动布局 */}
        <div className="space-y-3">
          {/* 告警中心 - 移动端放在顶部 */}
          <AlertCenter
            onNavigate={handleNavigate}
            maxAlerts={3}
          />
          
          {/* 财务趋势 */}
          <FinancialTrends
            data={financialTrends}
            dailyProfit={kpi.dailyProfit}
          />
          
          {/* 生产概览 */}
          <ProductionOverviewPanel
            stats={productionStats}
            onNavigate={handleNavigate}
            onGoodsClick={handleGoodsClick}
          />
          
          {/* 市场动态 */}
          <MarketDynamicsPanel
            stats={marketStats}
            onNavigate={handleNavigate}
            onTrade={handleTrade}
          />
          
          {/* 库存概览 */}
          <InventoryOverview
            stats={inventoryStats}
            onNavigate={handleNavigate}
            onSellItem={handleSellItem}
          />
          
          {/* 投资组合 */}
          <InvestmentPanel
            stats={investmentStats}
            onNavigate={handleNavigate}
            onViewCompany={handleViewCompany}
          />
        </div>
      </div>
    );
  }

  // 平板布局 - 双列
  if (layoutMode === 'tablet') {
    return (
      <div className="flex flex-col gap-4 pb-4">
        {/* 顶部信息栏 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">控制台</h2>
          <div className="flex items-center gap-3 text-sm text-foreground-muted">
            <span className="tabular-nums">{formatGameDate(tick)}</span>
            <span>|</span>
            <span className="tabular-nums">
              {performance?.avgTickTime.toFixed(2) || '0.00'}ms/tick
            </span>
          </div>
        </div>

        {/* KPI 栏 */}
        <KPIBar kpi={kpi} changes={kpiChanges} />

        {/* 双列布局 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 左列 */}
          <div className="space-y-4">
            <AlertCenter
              onNavigate={handleNavigate}
              maxAlerts={4}
            />
            <FinancialTrends
              data={financialTrends}
              dailyProfit={kpi.dailyProfit}
            />
            <ProductionOverviewPanel
              stats={productionStats}
              onNavigate={handleNavigate}
              onGoodsClick={handleGoodsClick}
            />
          </div>
          
          {/* 右列 */}
          <div className="space-y-4">
            <MarketDynamicsPanel
              stats={marketStats}
              onNavigate={handleNavigate}
              onTrade={handleTrade}
            />
            <InventoryOverview
              stats={inventoryStats}
              onNavigate={handleNavigate}
              onSellItem={handleSellItem}
            />
            <InvestmentPanel
              stats={investmentStats}
              onNavigate={handleNavigate}
              onViewCompany={handleViewCompany}
            />
          </div>
        </div>
      </div>
    );
  }

  if (layoutMode === 'narrow-desktop') {
    return (
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">控制台</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground-muted">
            <span className="tabular-nums">{formatGameDate(tick)}</span>
            <span className="tabular-nums">
              {performance?.avgTickTime.toFixed(2) || '0.00'}ms/tick
            </span>
          </div>
        </div>

        <KPIBar kpi={kpi} changes={kpiChanges} />

        <div className="grid grid-cols-2 items-start gap-4">
          <div className="space-y-4">
            <AlertCenter
              onNavigate={handleNavigate}
              maxAlerts={4}
            />
            <FinancialTrends
              data={financialTrends}
              dailyProfit={kpi.dailyProfit}
            />
            <ProductionOverviewPanel
              stats={productionStats}
              onNavigate={handleNavigate}
              onGoodsClick={handleGoodsClick}
            />
          </div>

          <div className="space-y-4">
            <MarketDynamicsPanel
              stats={marketStats}
              onNavigate={handleNavigate}
              onTrade={handleTrade}
            />
            <InventoryOverview
              stats={inventoryStats}
              onNavigate={handleNavigate}
              onSellItem={handleSellItem}
            />
            <InvestmentPanel
              stats={investmentStats}
              onNavigate={handleNavigate}
              onViewCompany={handleViewCompany}
            />
          </div>
        </div>
      </div>
    );
  }

  // 宽桌面布局 - 三列
  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 顶部信息栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">控制台</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
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
      <div className="grid grid-cols-12 items-start gap-4">
        {/* 左侧栏 - 财务与生产 */}
        <div className="col-span-4 space-y-4">
          {/* 财务趋势 */}
          <FinancialTrends
            data={financialTrends}
            dailyProfit={kpi.dailyProfit}
          />
          
          {/* 生产概览 */}
          <ProductionOverviewPanel
            stats={productionStats}
            onNavigate={handleNavigate}
            onGoodsClick={handleGoodsClick}
          />
        </div>

        {/* 中间栏 - 市场与投资 */}
        <div className="col-span-4 space-y-4">
          {/* 市场动态 */}
          <MarketDynamicsPanel
            stats={marketStats}
            onNavigate={handleNavigate}
            onTrade={handleTrade}
          />
          
          {/* 投资组合 */}
          <InvestmentPanel
            stats={investmentStats}
            onNavigate={handleNavigate}
            onViewCompany={handleViewCompany}
          />
        </div>

        {/* 右侧栏 - 告警、库存 */}
        <div className="col-span-4 space-y-4">
          {/* 告警中心 */}
          <div className="h-56 flex-shrink-0">
            <AlertCenter
              onNavigate={handleNavigate}
              maxAlerts={5}
            />
          </div>
          
          {/* 库存概览 */}
          <InventoryOverview
            stats={inventoryStats}
            onNavigate={handleNavigate}
            onSellItem={handleSellItem}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
