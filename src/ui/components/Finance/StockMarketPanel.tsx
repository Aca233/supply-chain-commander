/**
 * 股票市场面板
 * 提供完整的股票交易界面，包括：
 * - 股票列表与行情
 * - K线/价格图表
 * - 买卖交易面板
 * - 持仓管理
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { PriceChart } from '@/ui/components/Charts/PriceChart';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
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
import { useMobile } from '@/ui/hooks/useMobile';
import { shouldUseCompactStockMarketLayout } from '@/ui/pages/responsivePageLayout';
import { CompanyProfile, StockView } from '@/core/finance/CompanyProfile';

// ============ 辅助函数 ============

function formatMoney(value: number): string {
  if (!isFinite(value)) return '¥0';
  if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
  return `¥${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  if (!isFinite(value)) return '0.00%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatVolume(value: number): string {
  if (!isFinite(value)) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

// ============ 子组件 ============

/**
 * 股票行情卡片
 */
const StockQuoteCard: React.FC<{
  profile: CompanyProfile;
  isSelected: boolean;
  onClick: () => void;
}> = ({ profile, isSelected, onClick }) => {
  const stock = profile.stock;
  if (!stock) return null;

  const priceUp = stock.priceChange >= 0;

  return (
    <Card
      variant={isSelected ? 'glow' : 'glass'}
      interactive
      padding="sm"
      className="cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {stock.ticker}
            </span>
            <Badge variant="outline" size="sm">
              {profile.personalityName}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-[120px]">
            {profile.name}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold tabular-nums ${priceUp ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            ¥{stock.currentPrice.toFixed(2)}
          </p>
          <p className={`text-xs tabular-nums ${priceUp ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {formatPercent(stock.priceChangePercent)}
          </p>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
        <span>市值: {formatMoney(stock.marketCap)}</span>
        <span>成交: {formatVolume(stock.volume)}</span>
      </div>
    </Card>
  );
};

/**
 * 股票详情面板
 */
const StockDetailPanel: React.FC<{
  profile: CompanyProfile;
  onTrade: (type: 'buy' | 'sell') => void;
}> = ({ profile, onTrade }) => {
  const stock = profile.stock;
  if (!stock) return null;

  const priceUp = stock.priceChange >= 0;

  // 生成模拟价格历史数据（后续可替换为真实历史数据）
  const priceHistory = useMemo(() => {
    const data = [];
    const basePrice = stock.previousClose || stock.currentPrice;
    for (let i = 23; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * basePrice * 0.02;
      const price = i === 0 ? stock.currentPrice : basePrice + variance;
      data.push({
        time: `${String(24 - i).padStart(2, '0')}:00`,
        price: Math.max(0.01, price),
      });
    }
    return data;
  }, [stock.currentPrice, stock.previousClose]);

  return (
    <div className="space-y-4">
      {/* 股票头部信息 */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {stock.ticker}
            </span>
            <Badge variant={priceUp ? 'success' : 'error'} glow>
              {priceUp ? '↑' : '↓'} {formatPercent(stock.priceChangePercent)}
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">{profile.name}</p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold tabular-nums ${priceUp ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            ¥{stock.currentPrice.toFixed(2)}
          </p>
          <p className="text-sm text-[var(--text-muted)] tabular-nums">
            涨跌: {priceUp ? '+' : ''}¥{stock.priceChange.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 价格图表 */}
      <Card variant="elevated" padding="sm">
        <PriceChart
          data={priceHistory}
          title=""
          height={200}
          color={priceUp ? '#22c55e' : '#ef4444'}
          showTimeRangeSelector={false}
        />
      </Card>

      {/* 行情指标 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)]">开盘</p>
          <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
            ¥{stock.openPrice.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)]">最高</p>
          <p className="text-sm font-medium text-[var(--success)] tabular-nums">
            ¥{stock.highPrice.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)]">最低</p>
          <p className="text-sm font-medium text-[var(--error)] tabular-nums">
            ¥{stock.lowPrice.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)]">昨收</p>
          <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
            ¥{stock.previousClose.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 估值指标 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)]">市盈率</p>
          <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
            {stock.pe > 0 ? stock.pe.toFixed(1) : '-'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)]">市净率</p>
          <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
            {stock.pb.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)]">成交量</p>
          <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
            {formatVolume(stock.volume)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)]">换手率</p>
          <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
            {(stock.turnoverRate * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* 交易按钮 */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          className="flex-1 bg-[var(--success)] hover:bg-[#16a34a]"
          onClick={() => onTrade('buy')}
        >
          📈 买入
        </Button>
        <Button
          variant="primary"
          className="flex-1 bg-[var(--error)] hover:bg-[#dc2626]"
          onClick={() => onTrade('sell')}
        >
          📉 卖出
        </Button>
      </div>
    </div>
  );
};

/**
 * 交易对话框
 */
const TradeDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CompanyProfile;
  tradeType: 'buy' | 'sell';
  playerShares: number;
}> = ({ open, onOpenChange, profile, tradeType, playerShares }) => {
  const { buyStockOrder, sellStockOrder, playerCash, getWorld, addNotification } = useGameStore();
  const stock = profile.stock;
  
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState([100]);
  const [limitPrice, setLimitPrice] = useState(stock?.currentPrice || 10);
  const [isProcessing, setIsProcessing] = useState(false);

  // 获取实际现金
  const actualCash = useMemo(() => {
    const world = getWorld();
    return world ? world.companies.cash[0] : playerCash;
  }, [getWorld, playerCash]);

  if (!stock) return null;

  const currentPrice = stock.currentPrice || 10;
  const effectivePrice = orderType === 'limit' ? limitPrice : currentPrice;
  const estimatedCost = quantity[0] * effectivePrice;
  const maxBuyQuantity = Math.floor(actualCash / effectivePrice);

  const canTrade = tradeType === 'buy'
    ? quantity[0] > 0 && estimatedCost <= actualCash
    : quantity[0] > 0 && quantity[0] <= playerShares;

  const handleTrade = async () => {
    if (!canTrade || isProcessing) return;
    
    setIsProcessing(true);
    try {
      let success: boolean;
      if (tradeType === 'buy') {
        success = buyStockOrder(
          profile.id,
          quantity[0],
          orderType,
          orderType === 'limit' ? limitPrice : undefined
        );
      } else {
        success = sellStockOrder(
          profile.id,
          quantity[0],
          orderType,
          orderType === 'limit' ? limitPrice : undefined
        );
      }
      
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const quickQuantities = [100, 500, 1000, 5000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" variant="game">
        <DialogHeader>
          <DialogTitle>
            {tradeType === 'buy' ? '📈 买入' : '📉 卖出'} {stock.ticker}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* 当前价格 */}
          <Card variant="elevated" padding="sm">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)]">当前股价</span>
              <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                ¥{currentPrice.toFixed(2)}
              </span>
            </div>
          </Card>

          {/* 订单类型 */}
          <div>
            <label className="text-sm text-[var(--text-muted)] mb-2 block">订单类型</label>
            <div className="flex gap-2">
              <Button
                variant={orderType === 'market' ? 'primary' : 'secondary'}
                size="sm"
                className="flex-1"
                onClick={() => setOrderType('market')}
              >
                市价单
              </Button>
              <Button
                variant={orderType === 'limit' ? 'primary' : 'secondary'}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setOrderType('limit');
                  setLimitPrice(currentPrice);
                }}
              >
                限价单
              </Button>
            </div>
          </div>

          {/* 限价输入 */}
          {orderType === 'limit' && (
            <Slider
              value={[limitPrice]}
              onValueChange={(v) => setLimitPrice(v[0])}
              min={currentPrice * 0.9}
              max={currentPrice * 1.1}
              step={0.01}
              label="限价"
              showValue
              formatValue={(v) => `¥${v.toFixed(2)}`}
              variant="game"
              color={tradeType === 'buy' ? 'success' : 'error'}
            />
          )}

          {/* 数量选择 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-muted)]">数量（股）</span>
              {tradeType === 'buy' ? (
                <span className="text-[var(--text-muted)]">
                  最大可买: {maxBuyQuantity.toLocaleString()}股
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">
                  持有: {playerShares.toLocaleString()}股
                </span>
              )}
            </div>
            <Slider
              value={quantity}
              onValueChange={setQuantity}
              min={1}
              max={tradeType === 'buy' ? Math.max(1, maxBuyQuantity) : Math.max(1, playerShares)}
              step={1}
              showValue
              formatValue={(v) => `${v.toLocaleString()}股`}
              variant="game"
              color={tradeType === 'buy' ? 'success' : 'error'}
            />
            <div className="flex gap-2 mt-2">
              {quickQuantities.map((q) => (
                <Button
                  key={q}
                  variant="ghost"
                  size="xs"
                  onClick={() => setQuantity([Math.min(q, tradeType === 'buy' ? maxBuyQuantity : playerShares)])}
                >
                  {q}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setQuantity([tradeType === 'buy' ? maxBuyQuantity : playerShares])}
              >
                全部
              </Button>
            </div>
          </div>

          {/* 预估信息 */}
          <Card variant="elevated" padding="sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">单价:</span>
                <span className="text-[var(--text-primary)] tabular-nums">
                  ¥{effectivePrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">数量:</span>
                <span className="text-[var(--text-primary)] tabular-nums">
                  {quantity[0].toLocaleString()}股
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--border-muted)] pt-2">
                <span className="text-[var(--text-muted)]">
                  预估{tradeType === 'buy' ? '成本' : '收益'}:
                </span>
                <span className={`font-bold tabular-nums ${tradeType === 'buy' ? 'text-[var(--text-primary)]' : 'text-[var(--success)]'}`}>
                  {formatMoney(estimatedCost)}
                </span>
              </div>
              {tradeType === 'buy' && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">可用资金:</span>
                  <span className={`tabular-nums ${estimatedCost > actualCash ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`}>
                    {formatMoney(actualCash)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* 警告信息 */}
          {tradeType === 'buy' && estimatedCost > actualCash && (
            <p className="text-xs text-[var(--error)] text-center">资金不足</p>
          )}
          {tradeType === 'sell' && quantity[0] > playerShares && (
            <p className="text-xs text-[var(--error)] text-center">持股不足</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="gradient"
            className={tradeType === 'buy' ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}
            onClick={handleTrade}
            disabled={!canTrade || isProcessing}
          >
            {isProcessing ? '处理中...' : `确认${tradeType === 'buy' ? '买入' : '卖出'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * 持仓列表
 */
const HoldingsPanel: React.FC = () => {
  const { isTablet, isNarrowDesktop } = useMobile();
  const useCompactDesktop = shouldUseCompactStockMarketLayout({ isTablet, isNarrowDesktop });
  const { getPlayerHoldings, getStockInfo, getCompanyProfile, tick } = useGameStore();

  const holdings = useMemo(() => {
    const raw = getPlayerHoldings();
    return raw
      .filter(h => h.shares > 0)
      .map(h => {
        const stock = getStockInfo(h.stockCompanyId);
        const profile = getCompanyProfile(h.stockCompanyId);
        const marketValue = h.shares * (stock?.currentPrice || 0);
        const costBasis = h.shares * h.avgCost;
        const gain = marketValue - costBasis;
        const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
        
        return {
          companyId: h.stockCompanyId,
          ticker: stock?.ticker || '----',
          name: profile?.name || `公司#${h.stockCompanyId}`,
          shares: h.shares,
          avgCost: h.avgCost,
          currentPrice: stock?.currentPrice || 0,
          marketValue,
          gain,
          gainPercent,
        };
      })
      .sort((a, b) => b.marketValue - a.marketValue);
  }, [getPlayerHoldings, getStockInfo, getCompanyProfile, tick]);

  const columns: Column<typeof holdings[0]>[] = [
    {
      key: 'ticker',
      title: '股票',
      render: (_, row) => (
        <div>
          <span className="font-medium text-[var(--text-primary)]">{row.ticker}</span>
          <p className="text-xs text-[var(--text-muted)] truncate max-w-[100px]">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'shares',
      title: '持仓',
      align: 'right',
      render: (v) => `${v.toLocaleString()}股`,
    },
    {
      key: 'avgCost',
      title: '成本',
      align: 'right',
      render: (v) => `¥${v.toFixed(2)}`,
    },
    {
      key: 'currentPrice',
      title: '现价',
      align: 'right',
      render: (v) => `¥${v.toFixed(2)}`,
    },
    {
      key: 'marketValue',
      title: '市值',
      align: 'right',
      render: (v) => formatMoney(v),
    },
    {
      key: 'gain',
      title: '盈亏',
      align: 'right',
      render: (_, row) => (
        <div className={row.gain >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
          <span className="tabular-nums">{formatMoney(row.gain)}</span>
          <span className="text-xs ml-1 tabular-nums">
            ({formatPercent(row.gainPercent)})
          </span>
        </div>
      ),
    },
  ];

  // 计算汇总
  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    for (const h of holdings) {
      totalValue += h.marketValue;
      totalCost += h.shares * h.avgCost;
    }
    const totalGain = totalValue - totalCost;
    const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalGain, gainPercent, count: holdings.length };
  }, [holdings]);

  if (holdings.length === 0) {
    return (
      <Card variant="elevated">
        <CardContent>
          <div className="text-center py-8 text-[var(--text-muted)]">
            <p className="text-4xl mb-2">📊</p>
            <p>暂无持仓</p>
            <p className="text-xs mt-1">买入股票后将在这里显示</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <CardTitle>💼 我的持仓</CardTitle>
          <Badge variant={summary.totalGain >= 0 ? 'success' : 'error'} glow>
            {formatPercent(summary.gainPercent)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[760px]">
          <DataTable
            data={holdings}
            columns={columns}
            rowKey="companyId"
            variant="game"
            hoverable
            compact
          />
          <div className="p-3 border-t border-[var(--border-muted)] bg-[var(--bg-muted)]">
            <div className={`text-sm ${useCompactDesktop ? 'space-y-2' : 'flex justify-between'}`}>
              <span className="block text-[var(--text-muted)]">
                持仓 {summary.count} 只 | 总成本 {formatMoney(summary.totalCost)}
              </span>
              <span className="block font-medium">
                总市值 <span className="text-[var(--text-primary)]">{formatMoney(summary.totalValue)}</span>
                <span className={`ml-2 ${summary.totalGain >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {summary.totalGain >= 0 ? '+' : ''}{formatMoney(summary.totalGain)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 市场概览卡片
 */
const MarketOverviewCard: React.FC = () => {
  const { getStockMarketState, getCompanyMarketStats, tick } = useGameStore();

  const stats = useMemo(() => {
    const marketState = getStockMarketState();
    const companyStats = getCompanyMarketStats();
    
    return {
      index: marketState?.marketIndex || 1000,
      indexChange: marketState?.marketIndexChange || 0,
      totalMarketCap: marketState?.totalMarketCap || 0,
      totalVolume: marketState?.totalVolume || 0,
      rising: companyStats.rising,
      falling: companyStats.falling,
      unchanged: companyStats.unchanged,
    };
  }, [getStockMarketState, getCompanyMarketStats, tick]);

  const indexUp = stats.indexChange >= 0;

  return (
    <Card variant="game" padding="md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)]">市场指数</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${indexUp ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {stats.index.toFixed(2)}
            </span>
            <span className={`text-sm tabular-nums ${indexUp ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {indexUp ? '+' : ''}{(stats.indexChange * 100).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-sm font-medium text-[var(--success)]">{stats.rising}</p>
            <p className="text-xs text-[var(--text-muted)]">上涨</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{stats.unchanged}</p>
            <p className="text-xs text-[var(--text-muted)]">平盘</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--error)]">{stats.falling}</p>
            <p className="text-xs text-[var(--text-muted)]">下跌</p>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-3 pt-3 border-t border-[var(--border-muted)] text-xs text-[var(--text-muted)]">
        <span>总市值: {formatMoney(stats.totalMarketCap)}</span>
        <span>成交量: {formatVolume(stats.totalVolume)}</span>
      </div>
    </Card>
  );
};

// ============ 主组件 ============

export const StockMarketPanel: React.FC = () => {
  const { isMobile, isTablet, isNarrowDesktop } = useMobile();
  const useCompactDesktop = shouldUseCompactStockMarketLayout({ isTablet, isNarrowDesktop });
  const { getAICompanyProfiles, getPlayerHoldings, tick } = useGameStore();

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'marketCap' | 'priceChange' | 'volume'>('marketCap');

  // 获取所有AI公司（排除玩家公司）
  const companies = useMemo(() => {
    const profiles = getAICompanyProfiles();
    return profiles
      .filter(p => p.stock?.isListed)
      .filter(p => 
        searchTerm === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.stock?.ticker.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'priceChange':
            return (b.stock?.priceChangePercent || 0) - (a.stock?.priceChangePercent || 0);
          case 'volume':
            return (b.stock?.volume || 0) - (a.stock?.volume || 0);
          case 'marketCap':
          default:
            return (b.stock?.marketCap || 0) - (a.stock?.marketCap || 0);
        }
      });
  }, [getAICompanyProfiles, searchTerm, sortBy, tick]);

  const selectedProfile = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // 获取玩家对选中公司的持股
  const playerShares = useMemo(() => {
    if (!selectedCompanyId) return 0;
    const holdings = getPlayerHoldings();
    const holding = holdings.find(h => h.stockCompanyId === selectedCompanyId);
    return holding?.shares || 0;
  }, [selectedCompanyId, getPlayerHoldings, tick]);

  const handleTrade = useCallback((type: 'buy' | 'sell') => {
    setTradeType(type);
    setTradeDialogOpen(true);
  }, []);

  // 移动端布局
  if (isMobile) {
    return (
      <div className="space-y-4 pb-4">
        <h1 className="text-lg font-bold">📈 股票市场</h1>

        {/* 市场概览 */}
        <MarketOverviewCard />

        {/* 搜索和排序 */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="搜索股票..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
          >
            <option value="marketCap">市值</option>
            <option value="priceChange">涨跌</option>
            <option value="volume">成交量</option>
          </select>
        </div>

        {/* 股票列表 */}
        <div className="space-y-2">
          {companies.slice(0, 10).map((profile) => (
            <StockQuoteCard
              key={profile.id}
              profile={profile}
              isSelected={selectedCompanyId === profile.id}
              onClick={() => setSelectedCompanyId(profile.id)}
            />
          ))}
        </div>

        {/* 选中股票详情 */}
        {selectedProfile && (
          <Card variant="elevated" padding="md">
            <StockDetailPanel profile={selectedProfile} onTrade={handleTrade} />
          </Card>
        )}

        {/* 持仓 */}
        <HoldingsPanel />

        {/* 交易对话框 */}
        {selectedProfile && (
          <TradeDialog
            open={tradeDialogOpen}
            onOpenChange={setTradeDialogOpen}
            profile={selectedProfile}
            tradeType={tradeType}
            playerShares={playerShares}
          />
        )}
      </div>
    );
  }

  // 桌面/平板布局
  return (
    <div className={`space-y-6 ${useCompactDesktop ? 'p-4' : 'p-6'}`}>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className={`font-bold ${useCompactDesktop ? 'text-xl' : 'text-2xl'}`}>📈 股票市场</h1>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <input
            type="text"
            placeholder="搜索股票..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] ${
              useCompactDesktop ? 'flex-1 min-w-[220px]' : 'w-48'
            }`}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] ${
              useCompactDesktop ? 'w-full sm:w-auto' : ''
            }`}
          >
            <option value="marketCap">按市值</option>
            <option value="priceChange">按涨跌</option>
            <option value="volume">按成交量</option>
          </select>
        </div>
      </div>

      {/* 市场概览 */}
      <MarketOverviewCard />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 左侧：股票列表 */}
        <div className="xl:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
          <h3 className="text-sm font-medium text-[var(--text-muted)] sticky top-0 bg-[var(--bg-base)] py-2">
            上市公司 ({companies.length})
          </h3>
          {companies.map((profile) => (
            <StockQuoteCard
              key={profile.id}
              profile={profile}
              isSelected={selectedCompanyId === profile.id}
              onClick={() => setSelectedCompanyId(profile.id)}
            />
          ))}
        </div>

        {/* 右侧：股票详情 */}
        <div className="xl:col-span-2">
          {selectedProfile ? (
            <Card variant="elevated" padding="lg">
              <StockDetailPanel profile={selectedProfile} onTrade={handleTrade} />
            </Card>
          ) : (
            <Card variant="elevated" padding="lg">
              <div className="text-center py-12 text-[var(--text-muted)]">
                <p className="text-5xl mb-4">📊</p>
                <p className="text-lg">选择一只股票查看详情</p>
                <p className="text-sm mt-2">点击左侧列表中的股票卡片</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 持仓列表 */}
      <HoldingsPanel />

      {/* 交易对话框 */}
      {selectedProfile && (
        <TradeDialog
          open={tradeDialogOpen}
          onOpenChange={setTradeDialogOpen}
          profile={selectedProfile}
          tradeType={tradeType}
          playerShares={playerShares}
        />
      )}
    </div>
  );
};

export default StockMarketPanel;
