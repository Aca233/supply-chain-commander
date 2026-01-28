/**
 * 财务报表页面
 * 显示玩家公司的财务状况
 * 使用新设计系统组件重构
 */

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { PriceChart } from '@/ui/components/Charts/PriceChart';
import { MarketShareChart } from '@/ui/components/Charts/MarketShareChart';
import { GOODS_COUNT } from '@/core/constants';
import { LoanType } from '@/core/finance/BankingSystem';
import { formatGameDate, tickToDate } from '@/core/world/GameWorld';

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

export const Finance: React.FC = () => {
  const {
    getWorld,
    lastTickResult,
    tick,
    getPlayerLoans,
    getPlayerCreditProfile,
    getPlayerLoanOptions,
    applyLoan,
    prepayPlayerLoan,
  } = useGameStore();
  const world = getWorld();

  // 贷款模态框状态
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedLoanType, setSelectedLoanType] = useState<LoanType>('medium_term');
  const [loanAmount, setLoanAmount] = useState([100000]);
  const [collateralType, setCollateralType] = useState<'none' | 'inventory' | 'building'>('none');

  // 实时数据
  const playerCash = world?.companies.cash[0] || 1000000;
  const playerAssets = world?.companies.totalAssets[0] || 0;
  const playerLiabilities = world?.companies.totalLiabilities[0] || 0;

  // 计算真实的库存价值
  const inventoryValue = useMemo(() => {
    if (!world) return 0;
    let total = 0;
    for (let i = 0; i < GOODS_COUNT; i++) {
      const qty = world.companies.inventories[0 * GOODS_COUNT + i];
      const price = world.goods.prices[i];
      total += qty * price;
    }
    return total;
  }, [world, tick]);

  // 计算真实交易收入
  const { totalRevenue, totalCost, recentTrades } = useMemo(() => {
    if (!world) {
      return { totalRevenue: 0, totalCost: 0, recentTrades: [] };
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

    let revenue = 0;
    let cost = 0;
    const currentTick = world.tick;
    const lookbackTicks = 100;

    for (let i = t.count - 1; i >= Math.max(0, t.count - 1000); i--) {
      const idx = i % t.maxTrades;
      const tradeTick = t.ticks[idx];

      if (tradeTick < currentTick - lookbackTicks) continue;

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

      if (tradeTick >= currentTick - 24) {
        if (sellCompanyId === 0) revenue += value;
        if (buyCompanyId === 0) cost += value;
      }

      if (trades.length >= 50) break;
    }

    return { totalRevenue: revenue, totalCost: cost, recentTrades: trades };
  }, [world, tick]);

  // 计算净资产
  const netWorth = playerAssets - playerLiabilities + playerCash;

  // 财务指标
  const metrics: FinancialMetric[] = [
    { label: '现金余额', value: playerCash, format: 'currency', icon: '💵' },
    { label: '总资产', value: playerAssets + playerCash, format: 'currency', icon: '🏦' },
    { label: '总负债', value: playerLiabilities, format: 'currency', icon: '📉' },
    { label: '净资产', value: netWorth, format: 'currency', icon: '💰' },
    { label: '资产负债率', value: playerAssets > 0 ? playerLiabilities / (playerAssets + playerCash) : 0, format: 'percent', icon: '📊' },
    { label: '流动比率', value: playerLiabilities > 0 ? playerCash / playerLiabilities : 10, format: 'number', icon: '💧' },
  ];

  // 获取真实财务历史数据
  const financialHistory = useGameStore(state => state.financialHistory);

  // 现金余额趋势数据
  const incomeData = useMemo(() => {
    const recentHistory = financialHistory.slice(-100);

    if (recentHistory.length === 0) {
      const now = tickToDate(tick);
      return [{ time: `${now.month}/${now.day} ${now.hour}:00`, price: playerCash }];
    }

    return recentHistory.map(point => {
      const t = tickToDate(point.tick);
      return {
        time: `${t.month}/${t.day} ${t.hour}:00`,
        price: point.cash,
      };
    });
  }, [financialHistory, tick, playerCash]);

  // 计算日收入变化
  const dailyIncomeChange = useMemo(() => {
    if (financialHistory.length < 2) return 0;
    const recent = financialHistory.slice(-24);
    let totalProfit = 0;
    for (const point of recent) {
      totalProfit += point.profit;
    }
    return totalProfit;
  }, [financialHistory]);

  // 计算累计收入和成本
  const { cumulativeRevenue, cumulativeCost, cumulativeProfit } = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    for (const point of financialHistory) {
      revenue += point.revenue;
      cost += point.cost;
    }
    return {
      cumulativeRevenue: revenue,
      cumulativeCost: cost,
      cumulativeProfit: revenue - cost,
    };
  }, [financialHistory]);

  // 资产分布数据
  const assetDistribution = useMemo(() => [
    { name: '现金', value: playerCash },
    { name: '库存价值', value: inventoryValue },
    { name: '建筑资产', value: Math.max(0, playerAssets - inventoryValue) },
  ], [playerCash, playerAssets, inventoryValue]);

  const netProfit = totalRevenue - totalCost;

  const formatValue = (value: number, format: FinancialMetric['format']) => {
    switch (format) {
      case 'currency':
        if (value >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `¥${(value / 1000).toFixed(2)}K`;
        return `¥${value.toFixed(2)}`;
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
      render: (value) => `¥${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    },
    {
      key: 'remainingPrincipal',
      title: '剩余',
      align: 'right',
      render: (value) => `¥${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
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
          ¥{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">💼 财务报表</h1>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <div className="flex items-center justify-between w-full">
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

      {/* 损益表 */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>📋 损益表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-[var(--bg-muted)]">
              <tr>
                <th className="text-left p-3 text-[var(--text-muted)] text-sm font-medium">项目</th>
                <th className="text-right p-3 text-[var(--text-muted)] text-sm font-medium">当日</th>
                <th className="text-right p-3 text-[var(--text-muted)] text-sm font-medium">累计(近100小时)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-muted)]">
              <tr className="hover:bg-[var(--bg-muted)]">
                <td className="p-3 text-[var(--text-primary)] font-medium">销售收入</td>
                <td className="p-3 text-right text-[var(--success)] tabular-nums">
                  ¥{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="p-3 text-right text-[var(--success)] tabular-nums">
                  ¥{cumulativeRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
              <tr className="hover:bg-[var(--bg-muted)]">
                <td className="p-3 text-[var(--text-primary)] font-medium">采购成本</td>
                <td className="p-3 text-right text-[var(--error)] tabular-nums">
                  -¥{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="p-3 text-right text-[var(--error)] tabular-nums">
                  -¥{cumulativeCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
              <tr className="hover:bg-[var(--bg-muted)]">
                <td className="p-3 text-[var(--text-muted)] pl-6">库存价值</td>
                <td className="p-3 text-right text-[var(--text-secondary)] tabular-nums" colSpan={2}>
                  ¥{inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
              <tr className="bg-[var(--bg-muted)]">
                <td className="p-3 text-[var(--text-primary)] font-bold">净利润</td>
                <td className={`p-3 text-right font-bold tabular-nums ${netProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {netProfit >= 0 ? '¥' : '-¥'}{Math.abs(netProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className={`p-3 text-right font-bold tabular-nums ${cumulativeProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {cumulativeProfit >= 0 ? '¥' : '-¥'}{Math.abs(cumulativeProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="p-2 text-xs text-[var(--text-muted)] text-center tabular-nums border-t border-[var(--border-muted)]">
            {formatGameDate(tick)} | 历史记录: {financialHistory.length} 条
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
                const tradeTime = tickToDate(trade.tick);
                const timeStr = `${tradeTime.month}月${tradeTime.day}日 ${tradeTime.hour}:00`;
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
                        ¥{trade.price.toFixed(2)} × {trade.quantity.toFixed(0)}
                      </span>
                      <span className="text-[var(--text-muted)] ml-2">
                        = ¥{trade.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                  ¥{creditProfile.availableCredit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
          <div className="flex justify-between items-center w-full">
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
                    <div className="grid grid-cols-2 gap-2">
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
                            最高 ¥{option.maxAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                    formatValue={(v) => `¥${v.toLocaleString()}`}
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
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">借款金额：</span>
                              <span className="text-[var(--text-primary)] font-medium">¥{amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">年利率：</span>
                              <span className="text-[var(--text-primary)]">{(selectedOption.interestRate * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">每月还款：</span>
                              <span className="text-[var(--warning)] font-medium">¥{monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">还款期限：</span>
                              <span className="text-[var(--text-primary)]">{termMonths.toFixed(0)}个月</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">利息总额：</span>
                              <span className="text-[var(--error)]">¥{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">还款总额：</span>
                              <span className="text-[var(--text-primary)] font-medium">¥{totalPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
        <CardContent className="p-0">
          <DataTable
            data={activeLoans}
            columns={loanColumns}
            rowKey="id"
            variant="game"
            hoverable
            emptyText="暂无贷款记录"
            emptyIcon="🎉"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
