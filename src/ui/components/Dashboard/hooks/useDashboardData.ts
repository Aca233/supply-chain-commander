/**
 * 仪表盘数据聚合Hook
 * 集中管理仪表盘所需的所有数据，优化渲染性能
 */

import { useMemo, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { getActiveOrderIndices } from '@/core/market/OrderBook';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import { ALL_GOODS, isServiceGoods } from '@/data/goods';
import { formatMonthDay } from '@/core/world/GameWorld';
import { getStock } from '@/core/finance/StockMarket';
import { ControlLevel } from '@/core/finance/CompanyProfile';

// ==================== 类型定义 ====================

export interface KPIData {
  netWorth: number;
  cash: number;
  dailyProfit: number;
  buildingCount: {
    total: number;
    active: number;
    paused: number;
    starved: number;
  };
  portfolioValue: number;
  creditRating: string;
  creditScore: number;
}

export interface KPIChanges {
  netWorth: number;
  cash: number;
  dailyProfit: number;
  portfolioValue: number;
}

export interface FinancialTrendPoint {
  time: string;
  tick: number;
  cash: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ProductionStats {
  capacityUtilization: number;
  topProducers: { goodsId: number; name: string; output: number }[];
  problemBuildings: { id: number; name: string; issue: string; typeId: number }[];
  totalOutput: number;
}

export interface PriceChangeItem {
  goodsId: number;
  name: string;
  currentPrice: number;
  basePrice: number;
  change: number;
}

export interface MarketOpportunity {
  type: 'buy' | 'sell';
  goodsId: number;
  name: string;
  currentPrice: number;
  avgPrice: number;
  priceDiff: number;
  hasStock: boolean;
}

export interface MarketStats {
  risingCount: number;
  fallingCount: number;
  stableCount: number;
  topGainers: PriceChangeItem[];
  topLosers: PriceChangeItem[];
  opportunities: MarketOpportunity[];
  playerBuyOrders: number;
  playerSellOrders: number;
  pendingOrderValue: number;
}

export interface HoldingInfo {
  companyId: number;
  companyName: string;
  sharePercent: number;
  shares: number;
  value: number;
  cost: number;
  gain: number;
  gainPercent: number;
}

export interface ControlledCompanyInfo {
  companyId: number;
  companyName: string;
  controlLevel: string;
  cash: number;
  assets: number;
}

export interface InvestmentStats {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  gainPercent: number;
  holdings: HoldingInfo[];
  controlledCompanies: ControlledCompanyInfo[];
}

export interface CategoryValue {
  category: string;
  name: string;
  value: number;
  count: number;
}

export interface InventoryItem {
  goodsId: number;
  name: string;
  quantity: number;
  price: number;
  value: number;
  quality: string;
  qualityMultiplier: number;
}

export interface InventoryStats {
  byCategory: CategoryValue[];
  topItems: InventoryItem[];
  totalValue: number;
  totalItems: number;
}

export interface RecentActivity {
  id: number;
  type: 'trade' | 'build' | 'loan' | 'upgrade';
  action: 'buy' | 'sell' | 'complete' | 'approved';
  description: string;
  value?: number;
  tick: number;
  time: string;
}

export interface DashboardData {
  kpi: KPIData;
  kpiChanges: KPIChanges;
  financialTrends: FinancialTrendPoint[];
  productionStats: ProductionStats;
  marketStats: MarketStats;
  investmentStats: InvestmentStats;
  inventoryStats: InventoryStats;
  recentActivities: RecentActivity[];
}

// ==================== 常量 ====================

const CATEGORY_NAMES: Record<string, string> = {
  raw: '原材料',
  basic: '基础加工',
  intermediate: '中间产品',
  final: '最终产品',
};

// 控制权等级名称映射
const CONTROL_LEVEL_NAMES: Record<ControlLevel, string> = {
  [ControlLevel.None]: '无',
  [ControlLevel.Retail]: '散户',
  [ControlLevel.Significant]: '重要股东',
  [ControlLevel.Major]: '大股东',
  [ControlLevel.Strategic]: '战略投资',
  [ControlLevel.Relative]: '相对控股',
  [ControlLevel.Absolute]: '绝对控股',
};

function getControlLevelName(level: ControlLevel): string {
  return CONTROL_LEVEL_NAMES[level] || '未知';
}

// ==================== 主Hook ====================

export function useDashboardData(): DashboardData {
  const {
    getWorld,
    playerFinancialSnapshot,
    playerBuildings,
    tick,
    financialHistory,
    getPlayerCreditProfile,
    getPlayerPortfolio,
    getPlayerHoldings,
    getPlayerControlledProfiles,
    getPlayerBuildings,
    getInventoryQuality,
    lastTickResult,
  } = useGameStore();

  const world = getWorld();
  
  // 用于计算变化率的历史参考
  const prevDataRef = useRef<{
    netWorth: number;
    cash: number;
    dailyProfit: number;
    portfolioValue: number;
    tick: number;
  } | null>(null);

  // ==================== KPI 数据 ====================
  const kpi = useMemo((): KPIData => {
    // 建筑统计
    let active = 0, paused = 0, starved = 0;
    const buildings = getPlayerBuildings();
    
    for (const b of buildings) {
      if (b.isRetail) continue;
      if (b.status) {
        if (b.status.status === 'idle') {
          paused++;
        } else if (b.status.status === 'blocked' || b.status.efficiency < 0.1) {
          starved++;
        } else {
          active++;
        }
      }
    }

    // 投资组合
    const portfolio = getPlayerPortfolio();

    // 信用评级
    const credit = getPlayerCreditProfile();

    return {
      netWorth: playerFinancialSnapshot.netWorth,
      cash: playerFinancialSnapshot.cash,
      dailyProfit: playerFinancialSnapshot.dailyProfit,
      buildingCount: {
        total: playerBuildings,
        active,
        paused,
        starved,
      },
      portfolioValue: portfolio.totalValue,
      creditRating: credit?.rating || 'N/A',
      creditScore: credit?.score || 0,
    };
  }, [getPlayerBuildings, getPlayerCreditProfile, getPlayerPortfolio, playerBuildings, playerFinancialSnapshot]);

  // ==================== KPI 变化率 ====================
  const kpiChanges = useMemo((): KPIChanges => {
    const portfolio = getPlayerPortfolio();
    const current = {
      netWorth: kpi.netWorth,
      cash: kpi.cash,
      dailyProfit: kpi.dailyProfit,
      portfolioValue: portfolio.totalValue,
      tick,
    };

    // 每隔一定tick更新参考点
    if (!prevDataRef.current || tick - prevDataRef.current.tick >= TICKS_PER_DAY) {
      const changes: KPIChanges = {
        netWorth: prevDataRef.current ? (current.netWorth - prevDataRef.current.netWorth) / Math.max(Math.abs(prevDataRef.current.netWorth), 1) : 0,
        cash: prevDataRef.current ? (current.cash - prevDataRef.current.cash) / Math.max(Math.abs(prevDataRef.current.cash), 1) : 0,
        dailyProfit: 0,
        portfolioValue: prevDataRef.current ? (current.portfolioValue - prevDataRef.current.portfolioValue) / Math.max(Math.abs(prevDataRef.current.portfolioValue), 1) : 0,
      };
      prevDataRef.current = current;
      return changes;
    }

    return {
      netWorth: (current.netWorth - prevDataRef.current.netWorth) / Math.max(Math.abs(prevDataRef.current.netWorth), 1),
      cash: (current.cash - prevDataRef.current.cash) / Math.max(Math.abs(prevDataRef.current.cash), 1),
      dailyProfit: 0,
      portfolioValue: (current.portfolioValue - prevDataRef.current.portfolioValue) / Math.max(Math.abs(prevDataRef.current.portfolioValue), 1),
    };
  }, [kpi, tick]);

  // ==================== 财务趋势 ====================
  const financialTrends = useMemo((): FinancialTrendPoint[] => {
    return financialHistory.slice(-100).map(point => {
      return {
        time: formatMonthDay(point.tick),
        tick: point.tick,
        cash: point.cash,
        revenue: point.revenue,
        cost: point.cost,
        profit: point.profit,
      };
    });
  }, [financialHistory]);

  // ==================== 生产统计 ====================
  const productionStats = useMemo((): ProductionStats => {
    if (!world) {
      return {
        capacityUtilization: 0,
        topProducers: [],
        problemBuildings: [],
        totalOutput: 0,
      };
    }

    const buildings = getPlayerBuildings();
    let totalEfficiency = 0;
    let activeCount = 0;
    const outputByGoods = new Map<number, number>();
    const problems: ProductionStats['problemBuildings'] = [];

    for (const b of buildings) {
      if (b.isRetail || !b.status) continue;
      
      const isActive = b.status.status === 'producing';
      
      if (isActive) {
        activeCount++;
        totalEfficiency += b.status.efficiency;

        // 累计产出（从 outputLevels 获取）
        for (const output of b.status.outputLevels) {
          const current = outputByGoods.get(output.goodsId) || 0;
          // amount 是累计产出，转换为估算的每tick产出率
          outputByGoods.set(output.goodsId, current + output.amount / TICKS_PER_DAY);
        }
      }

      // 检测问题建筑
      if (b.status.status === 'idle') {
        problems.push({
          id: b.id,
          name: b.name,
          issue: '已暂停',
          typeId: world.buildings.types[b.id],
        });
      } else if (b.status.status === 'blocked' || b.status.efficiency < 0.3) {
        // 从 inputLevels 获取缺料信息
        const missingInputs = b.status.inputLevels
          .filter((i: { current: number; required: number; goodsId: number }) => i.current < i.required * 0.5)
          .map((i: { goodsId: number }) => ALL_GOODS.find(g => g.id === i.goodsId)?.name || `#${i.goodsId}`)
          .join(', ');
        problems.push({
          id: b.id,
          name: b.name,
          issue: missingInputs ? `缺料: ${missingInputs}` : '效率过低',
          typeId: world.buildings.types[b.id],
        });
      }
    }

    // 排序获取Top产出
    const topProducers = Array.from(outputByGoods.entries())
      .map(([goodsId, output]) => ({
        goodsId,
        name: ALL_GOODS.find(g => g.id === goodsId)?.name || `商品#${goodsId}`,
        output,
      }))
      .sort((a, b) => b.output - a.output)
      .slice(0, 5);

    const totalOutput = Array.from(outputByGoods.values()).reduce((sum, v) => sum + v, 0);

    return {
      capacityUtilization: activeCount > 0 ? totalEfficiency / activeCount : 0,
      topProducers,
      problemBuildings: problems.slice(0, 5),
      totalOutput,
    };
  }, [world, tick]);

  // ==================== 市场统计 ====================
  const marketStats = useMemo((): MarketStats => {
    if (!world) {
      return {
        risingCount: 0,
        fallingCount: 0,
        stableCount: 0,
        topGainers: [],
        topLosers: [],
        opportunities: [],
        playerBuyOrders: 0,
        playerSellOrders: 0,
        pendingOrderValue: 0,
      };
    }

    const priceChanges: PriceChangeItem[] = [];
    let rising = 0, falling = 0, stable = 0;

    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      const goods = ALL_GOODS.find(g => g.id === i);
      if (!goods) continue;

      const currentPrice = world.goods.prices[i];
      const basePrice = goods.basePrice;
      const change = (currentPrice - basePrice) / basePrice;

      if (change > 0.01) rising++;
      else if (change < -0.01) falling++;
      else stable++;

      priceChanges.push({
        goodsId: i,
        name: goods.name,
        currentPrice,
        basePrice,
        change,
      });
    }

    // 排序获取涨跌榜
    const sorted = [...priceChanges].sort((a, b) => b.change - a.change);
    const topGainers = sorted.slice(0, 3);
    const topLosers = sorted.slice(-3).reverse();

    // 交易机会检测
    const opportunities: MarketOpportunity[] = [];
    for (const item of priceChanges) {
      const stock = world.companies.inventories[0 * GOODS_COUNT + item.goodsId];
      const hasStock = stock > 0;

      // 低买机会：价格低于基准20%
      if (item.change < -0.2) {
        opportunities.push({
          type: 'buy',
          goodsId: item.goodsId,
          name: item.name,
          currentPrice: item.currentPrice,
          avgPrice: item.basePrice,
          priceDiff: item.change,
          hasStock,
        });
      }
      // 高卖机会：价格高于基准15%且有库存
      else if (item.change > 0.15 && hasStock) {
        opportunities.push({
          type: 'sell',
          goodsId: item.goodsId,
          name: item.name,
          currentPrice: item.currentPrice,
          avgPrice: item.basePrice,
          priceDiff: item.change,
          hasStock,
        });
      }
    }

    // 玩家挂单统计
    let buyOrders = 0, sellOrders = 0, pendingValue = 0;
    const activeIndices = getActiveOrderIndices();
    for (const i of activeIndices) {
      if (world.orders.companyIds[i] === 0) {
        const value = world.orders.prices[i] * world.orders.remainings[i];
        pendingValue += value;
        if (world.orders.types[i] === 0) {
          buyOrders++;
        } else {
          sellOrders++;
        }
      }
    }

    return {
      risingCount: rising,
      fallingCount: falling,
      stableCount: stable,
      topGainers,
      topLosers,
      opportunities: opportunities.slice(0, 5),
      playerBuyOrders: buyOrders,
      playerSellOrders: sellOrders,
      pendingOrderValue: pendingValue,
    };
  }, [world, tick]);

  // ==================== 投资统计 ====================
  const investmentStats = useMemo((): InvestmentStats => {
    const portfolio = getPlayerPortfolio();
    const rawHoldings = getPlayerHoldings();
    const controlled = getPlayerControlledProfiles();

    // Holding 类型有: ownerCompanyId, stockCompanyId, shares, avgCost, unrealizedGain
    const holdings: HoldingInfo[] = rawHoldings.map(h => {
      const stock = world ? getStock(h.stockCompanyId) : null;
      const currentPrice = stock?.currentPrice || 0;
      const value = h.shares * currentPrice;
      const cost = h.shares * h.avgCost;
      const totalShares = stock?.totalShares || 1;
      
      return {
        companyId: h.stockCompanyId,
        companyName: world?.companies.names[h.stockCompanyId] || `公司#${h.stockCompanyId}`,
        sharePercent: (h.shares / totalShares) * 100,
        shares: h.shares,
        value,
        cost,
        gain: value - cost,
        gainPercent: cost > 0 ? (value - cost) / cost : 0,
      };
    }).sort((a, b) => b.value - a.value);

    // CompanyProfile 的 controlStatus.playerControlLevel 是控制等级
    const controlledCompanies: ControlledCompanyInfo[] = controlled.map(c => ({
      companyId: c.id,
      companyName: c.name,
      controlLevel: getControlLevelName(c.controlStatus.playerControlLevel),
      cash: c.cash,
      assets: c.totalAssets,
    }));

    return {
      totalValue: portfolio.totalValue,
      totalCost: portfolio.totalCost,
      totalGain: portfolio.totalGain,
      gainPercent: portfolio.gainPercent,
      holdings: holdings.slice(0, 5),
      controlledCompanies,
    };
  }, [world, tick]);

  // ==================== 库存统计 ====================
  const inventoryStats = useMemo((): InventoryStats => {
    if (!world) {
      return {
        byCategory: [],
        topItems: [],
        totalValue: 0,
        totalItems: 0,
      };
    }

    const categoryValues: Record<string, { value: number; count: number }> = {
      raw: { value: 0, count: 0 },
      basic: { value: 0, count: 0 },
      intermediate: { value: 0, count: 0 },
      final: { value: 0, count: 0 },
    };

    const items: InventoryItem[] = [];
    let totalValue = 0;
    let totalItems = 0;

    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      // 服务类商品（电力等）不计入库存统计
      if (isServiceGoods(i)) continue;

      const quantity = world.companies.inventories[0 * GOODS_COUNT + i];
      if (quantity <= 0) continue;

      const goods = ALL_GOODS.find(g => g.id === i);
      if (!goods) continue;

      const price = world.goods.prices[i];
      const value = quantity * price;
      const quality = getInventoryQuality(i);

      totalValue += value;
      totalItems++;

      // 按类别统计
      if (categoryValues[goods.category]) {
        categoryValues[goods.category].value += value;
        categoryValues[goods.category].count++;
      }

      items.push({
        goodsId: i,
        name: goods.name,
        quantity,
        price,
        value,
        quality: quality.name,
        qualityMultiplier: quality.priceMultiplier,
      });
    }

    const byCategory: CategoryValue[] = Object.entries(categoryValues)
      .filter(([_, data]) => data.value > 0)
      .map(([category, data]) => ({
        category,
        name: CATEGORY_NAMES[category] || category,
        value: data.value,
        count: data.count,
      }));

    const topItems = items.sort((a, b) => b.value - a.value).slice(0, 10);

    return {
      byCategory,
      topItems,
      totalValue,
      totalItems,
    };
  }, [world, tick]);

  // ==================== 最近活动 ====================
  const recentActivities = useMemo((): RecentActivity[] => {
    if (!world || !lastTickResult) return [];

    const activities: RecentActivity[] = [];
    let activityId = 0;

    // 从最近交易获取
    const trades = lastTickResult.matching.trades || [];
    for (const trade of trades.slice(0, 5)) {
      if (trade.sellCompanyId === 0 || trade.buyCompanyId === 0) {
        const isSell = trade.sellCompanyId === 0;
        const goodsName = world.goods.names[trade.goodsId] || `商品#${trade.goodsId}`;
        
        activities.push({
          id: activityId++,
          type: 'trade',
          action: isSell ? 'sell' : 'buy',
          description: `${isSell ? '卖出' : '买入'} ${goodsName} x${trade.quantity.toFixed(0)} @ ¥${trade.price.toFixed(2)}`,
          value: trade.value,
          tick: trade.tick,
          time: formatMonthDay(trade.tick),
        });
      }
    }

    return activities.slice(0, 8);
  }, [world, lastTickResult]);

  return {
    kpi,
    kpiChanges,
    financialTrends,
    productionStats,
    marketStats,
    investmentStats,
    inventoryStats,
    recentActivities,
  };
}

export default useDashboardData;
