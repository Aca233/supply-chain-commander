/**
 * 交易面板组件
 * 提供股票买入/卖出功能
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';

interface TradePanelProps {
  companyId: number;
  currentPrice: number;
  playerShares?: number;
  onClose?: () => void;
  variant?: 'full' | 'compact';
}

/**
 * 格式化金额
 */
function formatMoney(value: number): string {
  if (value >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
  return `¥${value.toFixed(0)}`;
}

export const TradePanel: React.FC<TradePanelProps> = ({
  companyId,
  currentPrice,
  playerShares = 0,
  onClose,
  variant = 'full',
}) => {
  const { playerCash, buyStockOrder, sellStockOrder, getStockInfo, getWorld, addNotification } = useGameStore();
  
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState(100);
  const [limitPrice, setLimitPrice] = useState(currentPrice);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const stock = getStockInfo(companyId);
  
  // 获取最新的实际现金值（确保与store同步）
  const actualCash = useMemo(() => {
    const world = getWorld();
    return world ? world.companies.cash[0] : playerCash;
  }, [getWorld, playerCash]);
  
  // 确保价格有效
  const safeCurrentPrice = isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 10;
  const safeLimitPrice = isFinite(limitPrice) && limitPrice > 0 ? limitPrice : safeCurrentPrice;

  // 计算预估成本/收益
  const estimatedValue = useMemo(() => {
    const price = orderType === 'limit' ? safeLimitPrice : safeCurrentPrice;
    const value = quantity * price;
    return isFinite(value) ? value : 0;
  }, [quantity, safeLimitPrice, safeCurrentPrice, orderType]);

  // 最大可买数量
  const maxBuyQuantity = useMemo(() => {
    const price = orderType === 'limit' ? safeLimitPrice : safeCurrentPrice;
    if (!isFinite(price) || price <= 0) return 0;
    if (!isFinite(actualCash) || actualCash <= 0) return 0;
    const max = Math.floor(actualCash / price);
    return isFinite(max) ? max : 0;
  }, [actualCash, safeLimitPrice, safeCurrentPrice, orderType]);
  
  // 检查是否可以交易
  const canTrade = useMemo(() => {
    if (quantity <= 0) return false;
    if (tradeType === 'buy' && estimatedValue > actualCash) return false;
    if (tradeType === 'sell' && quantity > playerShares) return false;
    return true;
  }, [quantity, tradeType, estimatedValue, actualCash, playerShares]);
  
  // 执行交易
  const executeTrade = () => {
    if (!canTrade || isProcessing) {
      // 提供更明确的错误反馈
      if (quantity <= 0) {
        addNotification('error', '请输入有效的交易数量');
      } else if (tradeType === 'buy' && estimatedValue > actualCash) {
        addNotification('error', `资金不足，需要 ${formatMoney(estimatedValue)}，当前 ${formatMoney(actualCash)}`);
      } else if (tradeType === 'sell' && quantity > playerShares) {
        addNotification('error', `持股不足，当前持有 ${playerShares} 股`);
      }
      return;
    }
    
    setIsProcessing(true);
    
    try {
      if (tradeType === 'buy') {
        const success = buyStockOrder(
          companyId,
          quantity,
          orderType,
          orderType === 'limit' ? limitPrice : undefined
        );
        if (success && onClose) onClose();
      } else {
        const success = sellStockOrder(
          companyId,
          quantity,
          orderType,
          orderType === 'limit' ? limitPrice : undefined
        );
        if (success && onClose) onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 快速数量按钮
  const quickQuantities = [100, 500, 1000, 5000];
  
  if (variant === 'compact') {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTradeType('buy')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              tradeType === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            买入
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              tradeType === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            disabled={playerShares <= 0}
          >
            卖出
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">数量（股）</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              min="1"
              step="100"
            />
          </div>
          
          <div className="flex gap-1">
            {quickQuantities.map((q) => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                className="flex-1 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
              >
                {q}
              </button>
            ))}
            {tradeType === 'buy' && (
              <button
                onClick={() => setQuantity(maxBuyQuantity)}
                className="flex-1 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
              >
                最大
              </button>
            )}
            {tradeType === 'sell' && (
              <button
                onClick={() => setQuantity(playerShares)}
                className="flex-1 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
              >
                全部
              </button>
            )}
          </div>
          
          <div className="bg-slate-700/50 rounded-lg p-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">预估金额:</span>
              <span className="text-white font-medium tabular-nums">
                {formatMoney(estimatedValue)}
              </span>
            </div>
            {tradeType === 'buy' && (
              <div className="flex justify-between">
                <span className="text-slate-400">可用资金:</span>
                <span className={`tabular-nums ${estimatedValue > actualCash ? 'text-red-400' : 'text-slate-300'}`}>
                  {formatMoney(actualCash)}
                </span>
              </div>
            )}
          </div>
          
          {tradeType === 'buy' && estimatedValue > actualCash && (
            <p className="text-xs text-red-400 text-center">资金不足</p>
          )}
          
          <button
            onClick={executeTrade}
            className={`w-full py-2 rounded-lg font-medium transition-colors ${
              !canTrade || isProcessing
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : tradeType === 'buy'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            disabled={!canTrade || isProcessing}
          >
            {isProcessing ? '处理中...' : `确认${tradeType === 'buy' ? '买入' : '卖出'}`}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h4 className="text-lg font-semibold text-white mb-4">交易面板</h4>
      
      {/* 买卖切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            tradeType === 'buy'
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          买入
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            tradeType === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          disabled={playerShares <= 0}
        >
          卖出
        </button>
      </div>
      
      <div className="space-y-4">
        {/* 订单类型 */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block">订单类型</label>
          <div className="flex gap-2">
            <button
              onClick={() => setOrderType('market')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                orderType === 'market'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              市价单
            </button>
            <button
              onClick={() => {
                setOrderType('limit');
                setLimitPrice(safeCurrentPrice);
              }}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                orderType === 'limit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              限价单
            </button>
          </div>
        </div>
        
        {/* 数量输入 */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block">数量（股）</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            min="1"
            step="100"
          />
          <div className="flex gap-2 mt-2">
            {quickQuantities.map((q) => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                className="flex-1 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
              >
                {q}
              </button>
            ))}
          </div>
          {tradeType === 'buy' && (
            <p className="text-xs text-slate-500 mt-1">
              最大可买: {maxBuyQuantity.toLocaleString()} 股
            </p>
          )}
          {tradeType === 'sell' && (
            <p className="text-xs text-slate-500 mt-1">
              持有: {playerShares.toLocaleString()} 股
            </p>
          )}
        </div>
        
        {/* 限价输入 */}
        {orderType === 'limit' && (
          <div>
            <label className="text-sm text-slate-400 mb-2 block">限价</label>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              min="0.01"
              step="0.1"
            />
            <p className="text-xs text-slate-500 mt-1">
              当前价: ¥{safeCurrentPrice.toFixed(2)}
            </p>
          </div>
        )}
        
        {/* 预估信息 */}
        <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">单价:</span>
            <span className="text-white tabular-nums">
              ¥{(orderType === 'limit' ? safeLimitPrice : safeCurrentPrice).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">数量:</span>
            <span className="text-white tabular-nums">
              {quantity.toLocaleString()} 股
            </span>
          </div>
          <div className="border-t border-slate-600 pt-2 flex justify-between">
            <span className="text-slate-400">预估{tradeType === 'buy' ? '成本' : '收益'}:</span>
            <span className={`font-medium tabular-nums ${
              tradeType === 'buy' ? 'text-white' : 'text-green-400'
            }`}>
              {formatMoney(estimatedValue)}
            </span>
          </div>
          {tradeType === 'buy' && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">可用资金:</span>
              <span className={`tabular-nums ${
                estimatedValue > actualCash ? 'text-red-400' : 'text-slate-300'
              }`}>
                {formatMoney(actualCash)}
              </span>
            </div>
          )}
        </div>
        
        {/* 确认按钮 */}
        <button
          onClick={executeTrade}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            !canTrade || isProcessing
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : tradeType === 'buy'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          disabled={!canTrade || isProcessing}
        >
          {isProcessing ? '处理中...' : `确认${tradeType === 'buy' ? '买入' : '卖出'}`}
        </button>
        
        {/* 提示信息 */}
        {tradeType === 'buy' && estimatedValue > actualCash && (
          <p className="text-xs text-red-400 text-center">资金不足</p>
        )}
        {tradeType === 'sell' && quantity > playerShares && (
          <p className="text-xs text-red-400 text-center">持股不足</p>
        )}
      </div>
    </div>
  );
};

/**
 * 快速交易模态框
 */
export const QuickTradeModal: React.FC<{
  companyId: number;
  companyName: string;
  ticker: string;
  currentPrice: number;
  playerShares: number;
  tradeType: 'buy' | 'sell';
  onClose: () => void;
}> = ({
  companyId,
  companyName,
  ticker,
  currentPrice,
  playerShares,
  tradeType: initialType,
  onClose,
}) => {
  const [tradeType, setTradeType] = useState(initialType);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-[400px] border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">
              {tradeType === 'buy' ? '买入' : '卖出'} {ticker}
            </h3>
            <p className="text-sm text-slate-400">{companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4 bg-slate-700/50 rounded-lg p-3 flex justify-between items-center">
          <span className="text-slate-400">当前股价</span>
          <span className="text-2xl font-bold text-white tabular-nums">
            ¥{(isFinite(currentPrice) ? currentPrice : 0).toFixed(2)}
          </span>
        </div>
        
        <TradePanel
          companyId={companyId}
          currentPrice={currentPrice}
          playerShares={playerShares}
          onClose={onClose}
          variant="compact"
        />
      </div>
    </div>
  );
};

export default TradePanel;