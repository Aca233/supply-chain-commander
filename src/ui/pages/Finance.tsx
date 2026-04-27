/**
 * 财务报表页面
 * 显示玩家公司的财务状况
 * 使用新设计系统组件重构
 */

import React, { useMemo, useState } from 'react';
import { TICKS_PER_DAY } from '@/core/constants';
import { BankruptcyEventStatus, bankruptcyResolution } from '@/core/finance/BankruptcyResolution';
import { useGameStore } from '@/stores/gameStore';
import { PriceChart } from '@/ui/components/Charts/PriceChart';
import { MarketShareChart } from '@/ui/components/Charts/MarketShareChart';
import { FinancialReportChart, FinancialDataPoint } from '@/ui/components/Charts/FinancialReportChart';
import { BankruptcyResolutionPanel } from '@/ui/components/Finance';
import { LoanType } from '@/core/finance/BankingSystem';
import { formatGameDate, formatMonthDay, formatMonthDayText } from '@/core/world/GameWorld';
import { useMobile } from '@/ui/hooks/useMobile';
import { shouldUseCompactFinanceLayout } from './responsivePageLayout';
import { ALL_BUILDINGS } from '@/data/buildings';
import { formatCurrency } from '@/ui/utils/format';

// 设计系统组件
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  DataTable,
  StatWidget,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Slider,
  type Column,
} from '@/ui/design-system';

interface FinancialMetric {
  label: string;
  value: number;
  change?: number;
  format: 'currency' | 'percent' | 'number';
  icon?: string;
}

const LOAN_TYPE_NAMES: Record<LoanType, string> = {
  'credit_line': '循环信用额度',
  'short_term': '短期贷款',
  'medium_term': '中期贷款',
  'long_term': '长期贷款',
};

const BANKRUPTCY_REASON_LABELS: Record<string, string> = {
  insolvent: '资不抵债',
  cash_insolvent: '现金流断裂',
  debt_default: '债务违约',
};

const BANKRUPTCY_STATUS_LABELS: Record<BankruptcyEventStatus, string> = {
  bankruptcy_frozen: '冻结清点中',
  auction_open: '公开竞拍中',
  settlement_in_progress: '债务清偿中',
  delisted: '已退市',
  restructure_cooldown: '重组冷却中',
  restructured: '已重组',
};

export const Finance: React.FC = () => {
  const { isMobile, isTablet, isNarrowDesktop } = useMobile();
  const useCompactDesktop = shouldUseCompactFinanceLayout({ isTablet, isNarrowDesktop });
  const gameStore = useGameStore();
  const {
    getWorld,
    lastTickResult,
    tick,
    getPlayerLoans,
    getPlayerCreditProfile,
    getPlayerLoanOptions,
    applyLoan,
    prepayPlayerLoan,
  } = gameStore;
  const getBankruptcyEvents = gameStore.getBankruptcyEvents ?? (() => []);
  const getBankruptcyStrategy = gameStore.getBankruptcyStrategy ?? (() => ({
    mode: 'notify_only' as const,
    eventBudgetCap: 0,
    assetBudgetCap: 0,
    autoTrackSameIndustry: false,
  }));
  const updateBankruptcyStrategy = gameStore.updateBankruptcyStrategy ?? (() => undefined);
  const placeBankruptcyBid = gameStore.placeBankruptcyBid ?? (() => false);
  const confirmBankruptcyPurchase = gameStore.confirmBankruptcyPurchase ?? (() => false);
  const playerFinancialSnapshot = useGameStore(state => state.playerFinancialSnapshot);
  const financialHistory = useGameStore(state => state.financialHistory);
  const world = getWorld();

  // 贷款模态框状态
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedLoanType, setSelectedLoanType] = useState<LoanType>('medium_term');
  const [loanAmount, setLoanAmount] = useState([100000]);
  const [collateralType, setCollateralType] = useState<'none' | 'inventory' | 'building'>('none');

  // 实时数据
  const playerCash = playerFinancialSnapshot.cash;
  const playerAssets = playerFinancialSnapshot.operatingAssets;
  const playerTotalAssets = playerFinancialSnapshot.totalAssets;
  const playerLiabilities = playerFinancialSnapshot.liabilities;
  const inventoryValue = playerFinancialSnapshot.inventoryValue;

  // 计算真实交易收入
  const { recentTrades } = useMemo(() => {
    if (!world) {
      return { recentTrades: [] };
    }

    const t = world.trades;
    const trades: Array<{
      id: number;
      buyCompanyId: number;
      sellCompanyId: number;
      goodsId: number;
      quantity: number;
      price: number;
      value: number;
      tick: number;
    }> = [];

    for (let i = t.count - 1; i >= Math.max(0, t.count - 1000); i--) {
      const idx = i % t.maxTrades;
      const tradeTick = t.ticks[idx];

      const buyCompanyId = t.buyCompanyIds[idx];
      const sellCompanyId = t.sellCompanyIds[idx];

      if (buyCompanyId !== 0 && sellCompanyId !== 0) continue;

      const quantity = t.quantities[idx];
      const price = t.prices[idx];
      const value = quantity * price;

      trades.push({
        id: i,
        buyCompanyId,
        sellCompanyId,
        goodsId: t.goodsIds[idx],
        quantity,
        price,
        value,
        tick: tradeTick,
      });

      if (trades.length >= 50) break;
    }

    return { recentTrades: trades };
  }, [world, tick]);

  // 计算净资产
  const netWorth = playerFinancialSnapshot.netWorth;

  // 财务指标
  const metrics: FinancialMetric[] = [
    { label: '现金余额', value: playerCash, format: 'currency', icon: '💵' },
    { label: '总资产', value: playerTotalAssets, format: 'currency', icon: '🏦' },
    { label: '总负债', value: playerLiabilities, format: 'currency', icon: '📉' },
    { label: '净资产', value: netWorth, format: 'currency', icon: '💰' },
    { label: '资产负债率', value: playerTotalAssets > 0 ? playerLiabilities / playerTotalAssets : 0, format: 'percent', icon: '📊' },
    { label: '流动比率', value: playerLiabilities > 0 ? playerCash / playerLiabilities : 10, format: 'number', icon: '💧' },
  ];

  // 现金余额趋势数据
  const incomeData = useMemo(() => {
    const recentHistory = financialHistory.slice(-100);

    if (recentHistory.length === 0) {
      return [{ time: formatMonthDay(tick), price: playerCash }];
    }

    return recentHistory.map(point => {
      return {
        time: formatMonthDay(point.tick),
        price: point.cash,
      };
    });
  }, [financialHistory, tick, playerCash]);

  // 计算日收入变化
  const dailyIncomeChange = playerFinancialSnapshot.dailyProfit;

  // 计算累计收入和成本
  const cumulativeRevenue = playerFinancialSnapshot.cumulativeRevenue;
  const cumulativeCost = playerFinancialSnapshot.cumulativeCost;
  const cumulativeProfit = playerFinancialSnapshot.cumulativeProfit;
  const bankruptcyEvents = getBankruptcyEvents();
  const bankruptcyStrategy = getBankruptcyStrategy();

  // 将财务历史转换为FinancialReportChart所需格式（按天聚合）
  const financialReportData: FinancialDataPoint[] = useMemo(() => {
    if (financialHistory.length === 0) return [];
    
    // 按天聚合数据
    const dayMap = new Map<number, { revenue: number; costs: number; profit: number }>();
    
    for (const point of financialHistory) {
      const dayIndex = Math.floor(point.tick / TICKS_PER_DAY);
      const existing = dayMap.get(dayIndex) || { revenue: 0, costs: 0, profit: 0 };
      dayMap.set(dayIndex, {
        revenue: existing.revenue + point.revenue,
        costs: existing.costs + point.cost,
        profit: existing.profit + point.profit,
      });
    }
    
    // 转换为数组
    const sortedDays = Array.from(dayMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-14); // 最近14天
    
    return sortedDays.map(([dayIndex, data]) => ({
      period: `第${dayIndex + 1}天`,
      revenue: data.revenue,
      costs: data.costs,
      profit: data.profit,
      assets: playerTotalAssets,
      liabilities: playerLiabilities,
      equity: netWorth,
    }));
  }, [financialHistory, playerLiabilities, playerTotalAssets, netWorth]);

  // 资产分布数据
  const assetDistribution = useMemo(() => [
    { name: '现金', value: playerCash },
    { name: '库存价值', value: inventoryValue },
    { name: '建筑资产', value: playerFinancialSnapshot.buildingValue },
  ], [inventoryValue, playerCash, playerFinancialSnapshot.buildingValue]);

  const totalRevenue = playerFinancialSnapshot.dailyRevenue;
  const totalCost = playerFinancialSnapshot.dailyCost;
  const netProfit = playerFinancialSnapshot.dailyProfit;

  const formatValue = (value: number, format: FinancialMetric['format']) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      case 'number':
        return value.toFixed(2);
    }
  };

  // 贷款表格列定义
  const loanColumns: Column<any>[] = [
    {
      key: 'type',
      title: '贷款类型',
      render: (value) => LOAN_TYPE_NAMES[value as LoanType],
    },
    {
      key: 'principal',
      title: '本金',
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'remainingPrincipal',
      title: '剩余',
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'interestRate',
      title: '利率',
      align: 'right',
      render: (value) => `${(value * 100).toFixed(1)}%`,
    },
    {
      key: 'monthlyPayment',
      title: '月供',
      align: 'right',
      render: (value) => (
        <span className="text-[var(--warning)]">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'maturityTick',
      title: '到期日',
      align: 'right',
      render: (value) => formatGameDate(value),
    },
    {
      key: 'id',
      title: '操作',
      align: 'center',
      render: (_, loan) => (
        <Button size="xs" variant="ghost" onClick={() => prepayPlayerLoan(loan.id)}>
          提前还款
        </Button>
      ),
    },
  ];

  const activeLoans = getPlayerLoans().filter(l => l.status === 'active');
  const creditProfile = getPlayerCreditProfile();
  const loanOptions = getPlayerLoanOptions();
  const selectedOption = loanOptions.find(o => o.type === selectedLoanType);
  const bankruptcyEventViews = bankruptcyEvents.map((event) => ({
    id: event.id,
    companyName: world?.companies?.names?.[event.companyId] || `公司 #${event.companyId}`,
    reasonLabel: BANKRUPTCY_REASON_LABELS[event.reason] || event.reason,
    statusLabel: BANKRUPTCY_STATUS_LABELS[event.status] || event.status,
    remainingDays: Math.max(0, Math.ceil((event.expiresTick - tick) / TICKS_PER_DAY)),
    debtSnapshot: event.debtSnapshot,
    stockStateLabel: event.delisted ? '已退市' : '停牌中',
    assets: bankruptcyResolution.getEventAssets(event.id).map((asset) => {
      const buildingTypeId = asset.buildingId !== undefined
        ? world?.buildings?.types?.[asset.buildingId]
        : undefined;
      const buildingName = ALL_BUILDINGS.find((building) => building.id === buildingTypeId)?.name;
      const goodsName = asset.goodsId !== undefined
        ? world?.goods?.names?.[asset.goodsId]
        : undefined;

      return {
        id: asset.id,
        label: asset.assetType === 'building'
          ? `${buildingName || '建筑'} #${asset.buildingId ?? '?'}`
          : `${goodsName || '商品'} × ${asset.quantity.toLocaleString()}`,
        assetType: asset.assetType,
        reservePrice: asset.reservePrice,
        currentHighestBid: asset.currentHighestBid,
        playerBid: asset.bids.find((bid) => bid.bidderId === 0)?.amount ?? 0,
        state: asset.state,
        pendingConfirmDays: asset.pendingConfirmUntilTick !== undefined
          ? Math.max(0, Math.ceil((asset.pendingConfirmUntilTick - tick) / TICKS_PER_DAY))
          : undefined,
      };
    }),
  }));
  const bankruptcySection = (
    <BankruptcyResolutionPanel
      strategy={bankruptcyStrategy}
      events={bankruptcyEventViews}
      onStrategyChange={updateBankruptcyStrategy}
      onPlaceBid={(eventId, assetId, amount) => {
        placeBankruptcyBid(eventId, assetId, amount, 'manual');
      }}
      onConfirmPendingPurchase={confirmBankruptcyPurchase}
    />
  );

  // 移动端布局
  if (isMobile) {
    return (
      <div className="space-y-4 pb-4">
        <h1 className="text-lg font-bold">💼 财务报表</h1>

        {/* 关键指标 - 2列 */}
        <div className="grid grid-cols-2 gap-2">
          {metrics.slice(0, 4).map((metric) => (
            <StatWidget
              key={metric.label}
              title={metric.label}
              value={formatValue(metric.value, metric.format)}
              icon={metric.icon}
              compact
            />
          ))}
        </div>

        {/* 现金趋势 */}
        <Card variant="elevated" padding="sm">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">📈 现金余额</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PriceChart
              data={incomeData}
              title=""
              height={180}
              color="#22c55e"
              showTimeRangeSelector={false}
            />
          </CardContent>
        </Card>

        {/* 损益表简化版 */}
        <Card variant="elevated" padding="sm">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">📋 损益表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">销售收入</span>
              <span className="text-success">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">采购成本</span>
              <span className="text-error">{formatCurrency(-totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
              <span>净利润</span>
              <span className={netProfit >= 0 ? 'text-success' : 'text-error'}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </CardContent>
        </Card>

        {bankruptcySection}

        {/* 信用评级 */}
        {creditProfile && (
          <Card variant="game" padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    creditProfile.rating.startsWith('A') ? 'success' :
                    creditProfile.rating.startsWith('B') ? 'warning' : 'error'
                  }
                  size="lg"
                  glow
                >
                  {creditProfile.rating}
                </Badge>
                <div>
                  <p className="text-sm font-medium">信用评级</p>
                  <p className="text-xs text-foreground-muted">分数: {creditProfile.score}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-success">
                  {formatCurrency(creditProfile.availableCredit)}
                </p>
                <p className="text-xs text-foreground-muted">可用额度</p>
              </div>
            </div>
          </Card>
        )}

        {/* 贷款列表 */}
        <Card variant="elevated" padding="sm">
          <CardHeader className="py-2">
            <div className="flex justify-between items-center w-full">
              <CardTitle className="text-sm">🏦 贷款</CardTitle>
              <Button size="xs" onClick={() => setShowLoanModal(true)}>申请</Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeLoans.length > 0 ? (
              <div className="space-y-2">
                {activeLoans.map((loan) => (
                  <div key={loan.id} className="p-2 rounded-lg bg-background-muted">
                    <div className="flex justify-between text-sm">
                      <span>{LOAN_TYPE_NAMES[loan.type as LoanType]}</span>
                      <span className="font-medium">{formatCurrency(loan.remainingPrincipal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-foreground-muted mt-1">
                      <span>月供: {formatCurrency(loan.monthlyPayment)}</span>
                      <Button size="xs" variant="ghost" onClick={() => prepayPlayerLoan(loan.id)}>还款</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted text-center py-4">🎉 无贷款</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${useCompactDesktop ? 'p-4' : 'p-6'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={`font-bold ${useCompactDesktop ? 'text-xl' : 'text-2xl'}`}>💼 财务报表</h1>
      </div>

      {/* 关键指标卡片 */}
      <div className={`grid gap-4 ${useCompactDesktop ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
        {metrics.map((metric, index) => (
          <StatWidget
            key={metric.label}
            title={metric.label}
            value={formatValue(metric.value, metric.format)}
            icon={metric.icon}
            status={index === 3 ? (metric.value >= 0 ? 'success' : 'error') : undefined}
            compact
          />
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 现金余额趋势 */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <CardTitle>📈 现金余额趋势</CardTitle>
              <Badge variant={dailyIncomeChange >= 0 ? 'success' : 'error'}>
                {dailyIncomeChange >= 0 ? '+' : ''}{dailyIncomeChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <PriceChart
              data={incomeData}
              title=""
              height={250}
              color="#22c55e"
              showTimeRangeSelector={false}
            />
          </CardContent>
        </Card>

        {/* 资产分布 */}
        <Card variant="elevated">
          <CardContent>
            <MarketShareChart
              data={assetDistribution}
              title="资产分布"
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      {/* 增强版财务报表图表 */}
      {financialReportData.length > 0 && (
        <Card variant="elevated">
          <CardContent className="p-0">
            <FinancialReportChart
              data={financialReportData}
              title="财务分析"
              height={350}
              mode="income"
              showComparison={true}
            />
          </CardContent>
        </Card>
      )}

      {bankruptcySection}

      {/* 损益表 */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>📋 损益表</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <div className="min-w-[720px]">
          <table className="w-full">
            <thead className="bg-[var(--bg-muted)]">
              <tr>
                <th className="text-left p-3 text-[var(--text-muted)] text-sm font-medium">项目</th>
                <th className="text-right p-3 text-[var(--text-muted)] text-sm font-medium">当日</th>
                <th className="text-right p-3 text-[var(--text-muted)] text-sm font-medium">累计(近100天)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-muted)]">
              <tr className="hover:bg-[var(--bg-muted)]">
                <td className="p-3 text-[var(--text-primary)] font-medium">销售收入</td>
                <td className="p-3 text-right text-[var(--success)] tabular-nums">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="p-3 text-right text-[var(--success)] tabular-nums">
                  {formatCurrency(cumulativeRevenue)}
                </td>
              </tr>
              <tr className="hover:bg-[var(--bg-muted)]">
                <td className="p-3 text-[var(--text-primary)] font-medium">采购成本</td>
                <td className="p-3 text-right text-[var(--error)] tabular-nums">
                  {formatCurrency(-totalCost)}
                </td>
                <td className="p-3 text-right text-[var(--error)] tabular-nums">
                  {formatCurrency(-cumulativeCost)}
                </td>
              </tr>
              <tr className="hover:bg-[var(--bg-muted)]">
                <td className="p-3 text-[var(--text-muted)] pl-6">库存价值</td>
                <td className="p-3 text-right text-[var(--text-secondary)] tabular-nums" colSpan={2}>
                  {formatCurrency(inventoryValue)}
                </td>
              </tr>
              <tr className="bg-[var(--bg-muted)]">
                <td className="p-3 text-[var(--text-primary)] font-bold">净利润</td>
                <td className={`p-3 text-right font-bold tabular-nums ${netProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {formatCurrency(netProfit)}
                </td>
                <td className={`p-3 text-right font-bold tabular-nums ${cumulativeProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {formatCurrency(cumulativeProfit)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="p-2 text-xs text-[var(--text-muted)] text-center tabular-nums border-t border-[var(--border-muted)]">
            {formatGameDate(tick)} | 历史记录: {financialHistory.length} 条
          </div>
          </div>
        </CardContent>
      </Card>

      {/* 最近交易记录 */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <CardTitle>📜 最近交易</CardTitle>
            <Badge variant="outline">{recentTrades.length} 条记录</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {recentTrades.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentTrades.slice(0, 20).map((trade, idx) => {
                const goods = world?.goods.names[trade.goodsId] || `商品#${trade.goodsId}`;
                const timeStr = formatMonthDayText(trade.tick);
                return (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--border-muted)] last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.sellCompanyId === 0 ? 'success' : 'error'} size="sm">
                        {trade.sellCompanyId === 0 ? '卖出' : '买入'}
                      </Badge>
                      <span className="text-[var(--text-secondary)] truncate w-24">{goods}</span>
                      <span className="text-xs text-[var(--text-muted)] tabular-nums">{timeStr}</span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="text-[var(--text-primary)]">
                        {formatCurrency(trade.price)} × {trade.quantity.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <p>📭 暂无交易记录</p>
              <p className="text-xs mt-2">玩家参与的交易会在这里显示</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 信用评级卡片 */}
      {creditProfile && (
        <Card variant="game">
          <CardHeader>
            <CardTitle>⭐ 信用评级</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-6 ${useCompactDesktop ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
              <div className="text-center">
                <Badge
                  variant={
                    creditProfile.rating.startsWith('A') ? 'success' :
                    creditProfile.rating.startsWith('B') ? 'warning' : 'error'
                  }
                  size="lg"
                  glow
                  className="text-3xl px-6 py-2"
                >
                  {creditProfile.rating}
                </Badge>
                <p className="text-sm text-[var(--text-muted)] mt-2">信用评级</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{creditProfile.score}</div>
                <p className="text-sm text-[var(--text-muted)]">信用分数</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--success)]">
                    {formatCurrency(creditProfile.availableCredit)}
                </div>
                <p className="text-sm text-[var(--text-muted)]">可用额度</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--warning)]">
                  {(creditProfile.debtToEquityRatio * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-[var(--text-muted)]">资产负债率</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 贷款信息 */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <CardTitle>🏦 贷款与债务</CardTitle>
            <Dialog open={showLoanModal} onOpenChange={setShowLoanModal}>
              <DialogTrigger asChild>
                <Button>💳 申请贷款</Button>
              </DialogTrigger>
              <DialogContent size="lg" variant="game">
                <DialogHeader>
                  <DialogTitle>💳 申请贷款</DialogTitle>
                </DialogHeader>
                <DialogBody className="space-y-6">
                  {/* 贷款类型选择 */}
                  <div>
                    <label className="text-sm text-[var(--text-muted)] mb-2 block">贷款类型</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {loanOptions.map((option) => (
                        <Card
                          key={option.type}
                          variant={selectedLoanType === option.type ? 'glow' : 'default'}
                          padding="sm"
                          interactive
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedLoanType(option.type);
                            setLoanAmount([Math.min(loanAmount[0], option.maxAmount)]);
                          }}
                        >
                          <p className="font-medium text-[var(--text-primary)]">{option.name}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            利率: {(option.interestRate * 100).toFixed(1)}% | 期限: {option.termDays}天
                          </p>
                          <p className="text-xs text-[var(--success)] mt-1">
                            最高 {formatCurrency(option.maxAmount)}
                          </p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* 贷款金额 */}
                  <Slider
                    value={loanAmount}
                    onValueChange={setLoanAmount}
                    min={10000}
                    max={selectedOption?.maxAmount || 1000000}
                    step={10000}
                    label="贷款金额"
                    showValue
                    formatValue={(v) => formatCurrency(v)}
                    variant="game"
                    color="brand"
                  />

                  {/* 抵押品选择 */}
                  <div>
                    <label className="text-sm text-[var(--text-muted)] mb-2 block">抵押品（可降低利率）</label>
                    <div className="flex gap-2">
                      {[
                        { key: 'none', label: '无抵押' },
                        { key: 'inventory', label: '库存抵押' },
                        { key: 'building', label: '建筑抵押' },
                      ].map((item) => (
                        <Button
                          key={item.key}
                          variant={collateralType === item.key ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setCollateralType(item.key as any)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 贷款预览 */}
                  {selectedOption && (
                    <Card variant="elevated" padding="md">
                      <CardTitle className="text-sm mb-3">贷款预览</CardTitle>
                      {(() => {
                        const termMonths = selectedOption.termDays / 30;
                        const monthlyRate = selectedOption.interestRate / 12;
                        const amount = loanAmount[0];
                        const monthlyPayment = amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths) /
                                               (Math.pow(1 + monthlyRate, termMonths) - 1);
                        const totalPayment = monthlyPayment * termMonths;
                        const totalInterest = totalPayment - amount;

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">借款金额：</span>
                    <span className="text-[var(--text-primary)] font-medium">{formatCurrency(amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">年利率：</span>
                              <span className="text-[var(--text-primary)]">{(selectedOption.interestRate * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">每月还款：</span>
                    <span className="text-[var(--warning)] font-medium">{formatCurrency(monthlyPayment)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">还款期限：</span>
                              <span className="text-[var(--text-primary)]">{termMonths.toFixed(0)}个月</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">利息总额：</span>
                    <span className="text-[var(--error)]">{formatCurrency(totalInterest)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">还款总额：</span>
                    <span className="text-[var(--text-primary)] font-medium">{formatCurrency(totalPayment)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </Card>
                  )}
                </DialogBody>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowLoanModal(false)}>
                    取消
                  </Button>
                  <Button
                    variant="gradient"
                    onClick={() => {
                      const result = applyLoan(loanAmount[0], selectedLoanType, collateralType);
                      if (result.approved) {
                        setShowLoanModal(false);
                      }
                    }}
                  >
                    确认申请
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[680px]">
            <DataTable
              data={activeLoans}
              columns={loanColumns}
              rowKey="id"
              variant="game"
              hoverable
              emptyText="暂无贷款记录"
              emptyIcon="🎉"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
