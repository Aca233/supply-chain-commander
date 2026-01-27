/**
 * 财务报表页面
 * 显示玩家公司的财务状况
 */

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { PriceChart } from '@/ui/components/Charts/PriceChart';
import { MarketShareChart } from '@/ui/components/Charts/MarketShareChart';
import { GOODS_COUNT } from '@/core/constants';
import { LoanType } from '@/core/finance/BankingSystem';
import { formatGameDate, tickToDate } from '@/core/world/GameWorld';

interface FinancialMetric {
  label: string;
  value: number;
  change?: number;
  format: 'currency' | 'percent' | 'number';
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
  const [loanAmount, setLoanAmount] = useState(100000);
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
  
  // 计算真实交易收入（从最近成交中统计）
  const { totalRevenue, totalCost, recentTrades } = useMemo(() => {
    if (!world) {
      return { totalRevenue: 0, totalCost: 0, recentTrades: [] };
    }
    
    // 从world.trades读取历史成交记录
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
    
    // 读取最近50笔玩家参与的交易
    let revenue = 0;
    let cost = 0;
    const currentTick = world.tick;
    const lookbackTicks = 100; // 查看最近100个tick的交易
    
    for (let i = t.count - 1; i >= Math.max(0, t.count - 1000); i--) {
      const idx = i % t.maxTrades;
      const tradeTick = t.ticks[idx];
      
      // 只查看最近的交易
      if (tradeTick < currentTick - lookbackTicks) continue;
      
      const buyCompanyId = t.buyCompanyIds[idx];
      const sellCompanyId = t.sellCompanyIds[idx];
      
      // 检查是否是玩家参与的交易（玩家ID=0或消费者ID=-1视为玩家相关）
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
      
      // 只统计最近24个tick的收入成本（用于当前tick显示）
      if (tradeTick >= currentTick - 24) {
        if (sellCompanyId === 0) {
          revenue += value;
        }
        if (buyCompanyId === 0) {
          cost += value;
        }
      }
      
      // 最多保留50条记录
      if (trades.length >= 50) break;
    }
    
    return { totalRevenue: revenue, totalCost: cost, recentTrades: trades };
  }, [world, tick]);
  
  // 计算净资产
  const netWorth = playerAssets - playerLiabilities + playerCash;
  
  // 财务指标
  const metrics: FinancialMetric[] = [
    { label: '现金余额', value: playerCash, format: 'currency' },
    { label: '总资产', value: playerAssets + playerCash, format: 'currency' },
    { label: '总负债', value: playerLiabilities, format: 'currency' },
    { label: '净资产', value: netWorth, format: 'currency' },
    { label: '资产负债率', value: playerAssets > 0 ? playerLiabilities / (playerAssets + playerCash) : 0, format: 'percent' },
    { label: '流动比率', value: playerLiabilities > 0 ? playerCash / playerLiabilities : 10, format: 'number' },
  ];
  
  // 获取真实财务历史数据
  const financialHistory = useGameStore(state => state.financialHistory);
  
  // 现金余额趋势数据（使用真实历史数据）
  const incomeData = useMemo(() => {
    // 使用最近100个数据点
    const recentHistory = financialHistory.slice(-100);
    
    if (recentHistory.length === 0) {
      // 没有历史数据时返回当前现金
      const now = tickToDate(tick);
      return [{ time: `${now.month}/${now.day} ${now.hour}:00`, price: playerCash }];
    }
    
    // 显示现金余额变化趋势
    return recentHistory.map(point => {
      const t = tickToDate(point.tick);
      return {
        time: `${t.month}/${t.day} ${t.hour}:00`,
        price: point.cash, // 改为显示现金余额
      };
    });
  }, [financialHistory, tick, playerCash]);
  
  // 计算日收入变化
  const dailyIncomeChange = useMemo(() => {
    if (financialHistory.length < 2) return 0;
    const recent = financialHistory.slice(-24); // 最近24个tick
    let totalProfit = 0;
    for (const point of recent) {
      totalProfit += point.profit;
    }
    return totalProfit;
  }, [financialHistory]);
  
  // 计算累计收入和成本（最近100个tick）
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
  
  // 资产分布数据 - 使用真实库存价值
  const assetDistribution = useMemo(() => [
    { name: '现金', value: playerCash },
    { name: '库存价值', value: inventoryValue },
    { name: '建筑资产', value: Math.max(0, playerAssets - inventoryValue) },
  ], [playerCash, playerAssets, inventoryValue]);
  
  // 计算净利润
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
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">财务报表</h1>
      
      {/* 关键指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <div className="text-sm text-slate-400">{metric.label}</div>
            <div className={`text-xl font-bold mt-1 tabular-nums ${
              index === 3 ? (metric.value >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white'
            }`}>
              {formatValue(metric.value, metric.format)}
            </div>
          </div>
        ))}
      </div>
      
      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 现金余额趋势 */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">日收益变化</span>
            <span className={`text-sm font-medium tabular-nums min-w-[80px] text-right ${dailyIncomeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {dailyIncomeChange >= 0 ? '+' : ''}{dailyIncomeChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <PriceChart
            data={incomeData}
            title="现金余额趋势"
            height={280}
            color="#22c55e"
          />
        </div>
        
        {/* 资产分布 */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <MarketShareChart
            data={assetDistribution}
            title="资产分布"
            height={300}
          />
        </div>
      </div>
      
      {/* 财务明细表 - 使用真实数据 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">损益表</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left p-3 text-slate-300">项目</th>
              <th className="text-right p-3 text-slate-300">当日</th>
              <th className="text-right p-3 text-slate-300">累计(近100小时)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            <tr className="hover:bg-slate-700/30">
              <td className="p-3 text-white font-medium w-32">销售收入</td>
              <td className="p-3 text-right text-green-400 tabular-nums w-32">
                ¥{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="p-3 text-right text-green-400 tabular-nums w-32">
                ¥{cumulativeRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>
            <tr className="hover:bg-slate-700/30">
              <td className="p-3 text-white font-medium w-32">采购成本</td>
              <td className="p-3 text-right text-red-400 tabular-nums w-32">
                -¥{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="p-3 text-right text-red-400 tabular-nums w-32">
                -¥{cumulativeCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>
            <tr className="hover:bg-slate-700/30">
              <td className="p-3 text-slate-300 pl-6 w-32">库存价值</td>
              <td className="p-3 text-right text-slate-300 tabular-nums" colSpan={2}>
                ¥{inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>
            <tr className="bg-slate-700/30">
              <td className="p-3 text-white font-bold w-32">净利润</td>
              <td className={`p-3 text-right font-bold tabular-nums w-32 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '¥' : '-¥'}{Math.abs(netProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className={`p-3 text-right font-bold tabular-nums w-32 ${cumulativeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {cumulativeProfit >= 0 ? '¥' : '-¥'}{Math.abs(cumulativeProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="p-2 text-xs text-slate-500 text-center tabular-nums">
          <span className="inline-block min-w-[150px]">{formatGameDate(tick)}</span> | 历史记录: <span className="inline-block w-8 text-right">{financialHistory.length}</span> 条
        </div>
      </div>
      
      {/* 最近交易记录 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">最近交易</h2>
          <span className="text-xs text-slate-500">
            共 {recentTrades.length} 条记录（近100小时）
          </span>
        </div>
        <div className="p-4">
          {recentTrades.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentTrades
                .slice(0, 20)
                .map((trade, idx) => {
                  const goods = world?.goods.names[trade.goodsId] || `商品#${trade.goodsId}`;
                  const tradeTime = tickToDate(trade.tick);
                  const timeStr = `${tradeTime.month}月${tradeTime.day}日 ${tradeTime.hour}:00`;
                  return (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs w-10 text-center ${
                          trade.sellCompanyId === 0
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.sellCompanyId === 0 ? '卖出' : '买入'}
                        </span>
                        <span className="text-slate-300 truncate w-24">{goods}</span>
                        <span className="text-xs text-slate-500 tabular-nums w-24">{timeStr}</span>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="text-white inline-block w-32">
                          ¥{trade.price.toFixed(2)} × {trade.quantity.toFixed(0)}
                        </span>
                        <span className="text-slate-400 ml-2 inline-block w-20">
                          = ¥{trade.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p>暂无交易记录</p>
              <p className="text-xs mt-2">玩家参与的交易会在这里显示</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 信用评级卡片 */}
      {(() => {
        const creditProfile = getPlayerCreditProfile();
        if (!creditProfile) return null;
        
        const ratingColors: Record<string, string> = {
          'AAA': 'text-green-400 bg-green-500/20',
          'AA': 'text-green-400 bg-green-500/20',
          'A': 'text-blue-400 bg-blue-500/20',
          'BBB': 'text-blue-400 bg-blue-500/20',
          'BB': 'text-yellow-400 bg-yellow-500/20',
          'B': 'text-yellow-400 bg-yellow-500/20',
          'CCC': 'text-red-400 bg-red-500/20',
          'D': 'text-red-400 bg-red-500/20',
        };
        
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">信用评级</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-4xl font-bold ${ratingColors[creditProfile.rating] || 'text-white'} px-4 py-2 rounded-lg inline-block`}>
                  {creditProfile.rating}
                </div>
                <p className="text-sm text-slate-400 mt-2">信用评级</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{creditProfile.score}</div>
                <p className="text-sm text-slate-400">信用分数</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  ¥{creditProfile.availableCredit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-sm text-slate-400">可用额度</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {(creditProfile.debtToEquityRatio * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-slate-400">资产负债率</p>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* 贷款信息 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">贷款与债务</h2>
          <button
            onClick={() => setShowLoanModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            申请贷款
          </button>
        </div>
        <div className="p-4">
          {(() => {
            const loans = getPlayerLoans();
            const activeLoans = loans.filter(l => l.status === 'active');
            
            if (activeLoans.length === 0) {
              return (
                <div className="text-center py-8 text-slate-400">
                  暂无贷款记录
                </div>
              );
            }
            
            return (
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left p-3 text-slate-300">贷款类型</th>
                    <th className="text-right p-3 text-slate-300">本金</th>
                    <th className="text-right p-3 text-slate-300">剩余</th>
                    <th className="text-right p-3 text-slate-300">利率</th>
                    <th className="text-right p-3 text-slate-300">月供</th>
                    <th className="text-right p-3 text-slate-300">到期日</th>
                    <th className="text-right p-3 text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {activeLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-700/30">
                      <td className="p-3 text-white">{LOAN_TYPE_NAMES[loan.type]}</td>
                      <td className="p-3 text-right text-slate-300">
                        ¥{loan.principal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        ¥{loan.remainingPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {(loan.interestRate * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 text-right text-yellow-400">
                        ¥{loan.monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {formatGameDate(loan.maturityTick)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => prepayPlayerLoan(loan.id)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          提前还款
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>
      
      {/* 贷款申请模态框 */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-4">申请贷款</h3>
            
            {/* 贷款类型选择 */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">贷款类型</label>
              <div className="grid grid-cols-2 gap-2">
                {getPlayerLoanOptions().map((option) => (
                  <div
                    key={option.type}
                    onClick={() => {
                      setSelectedLoanType(option.type);
                      setLoanAmount(Math.min(loanAmount, option.maxAmount));
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLoanType === option.type
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <p className="font-medium text-white">{option.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      利率: {(option.interestRate * 100).toFixed(1)}% | 期限: {option.termDays}天
                    </p>
                    <p className="text-xs text-green-400 mt-1">
                      最高 ¥{option.maxAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 贷款金额 */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">贷款金额</label>
              <input
                type="range"
                min="10000"
                max={getPlayerLoanOptions().find(o => o.type === selectedLoanType)?.maxAmount || 1000000}
                step="10000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-400">¥10,000</span>
                <span className="text-2xl font-bold text-white">
                  ¥{loanAmount.toLocaleString()}
                </span>
                <span className="text-slate-400">
                  ¥{(getPlayerLoanOptions().find(o => o.type === selectedLoanType)?.maxAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* 抵押品选择 */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">抵押品（可降低利率）</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCollateralType('none')}
                  className={`px-4 py-2 rounded-lg ${
                    collateralType === 'none'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  无抵押
                </button>
                <button
                  onClick={() => setCollateralType('inventory')}
                  className={`px-4 py-2 rounded-lg ${
                    collateralType === 'inventory'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  库存抵押
                </button>
                <button
                  onClick={() => setCollateralType('building')}
                  className={`px-4 py-2 rounded-lg ${
                    collateralType === 'building'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  建筑抵押
                </button>
              </div>
            </div>
            
            {/* 贷款预览 */}
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">贷款预览</h4>
              {(() => {
                const option = getPlayerLoanOptions().find(o => o.type === selectedLoanType);
                if (!option) return null;
                
                const termMonths = option.termDays / 30;
                const monthlyRate = option.interestRate / 12;
                const monthlyPayment = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths) /
                                        (Math.pow(1 + monthlyRate, termMonths) - 1);
                const totalPayment = monthlyPayment * termMonths;
                const totalInterest = totalPayment - loanAmount;
                
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">借款金额：</span>
                      <span className="text-white">¥{loanAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">年利率：</span>
                      <span className="text-white">{(option.interestRate * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">每月还款：</span>
                      <span className="text-yellow-400">¥{monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">还款期限：</span>
                      <span className="text-white">{termMonths.toFixed(0)}个月</span>
                    </div>
                    <div>
                      <span className="text-slate-400">利息总额：</span>
                      <span className="text-red-400">¥{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">还款总额：</span>
                      <span className="text-white">¥{totalPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLoanModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const result = applyLoan(loanAmount, selectedLoanType, collateralType);
                  if (result.approved) {
                    setShowLoanModal(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                确认申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;