/**
 * 市场页面
 * 商品交易、价格走势、订单管理
 * 支持响应式布局
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS, GoodsDefinition, GOODS_BY_CATEGORY, GOODS_BY_INDUSTRY } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';
import { RECIPES } from '@/data/recipes';
import { GOODS_COUNT, HISTORY_SIZE } from '@/core/constants';
import { PriceChart, PriceDataPoint } from '@/ui/components/Charts/PriceChart';
import { MarketShareChart } from '@/ui/components/Charts/MarketShareChart';
import { findBestSubstitutes, findBestComplements } from '@/core/economy/SubstitutionSystem';
import { tickToDate, formatGameDate, GameWorld } from '@/core/world/GameWorld';
import { GoodsIcon, BuildingIcon } from '@/ui/components/Icons';
import { useMobile } from '@/ui/hooks/useMobile';

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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TooltipProvider,
  Tooltip,
} from '@/ui/design-system';

// 玩家拥有的建筑信息
interface PlayerBuildingInfo {
  buildingIndex: number;
  typeId: number;
  level: number;
}

// 商品分类配置
const CATEGORY_CONFIG = {
  raw: { name: '原材料', color: 'bg-amber-500' },
  basic: { name: '基础加工', color: 'bg-blue-500' },
  intermediate: { name: '中间产品', color: 'bg-purple-500' },
  final: { name: '最终产品', color: 'bg-green-500' },
};

const INDUSTRY_CONFIG = {
  core: { name: '核心产业', color: 'bg-slate-500' },
  agriculture: { name: '农业', color: 'bg-green-600' },
  pharma: { name: '医药', color: 'bg-red-500' },
  military: { name: '军工', color: 'bg-gray-700' },
  luxury: { name: '奢侈品', color: 'bg-yellow-500' },
  tech: { name: '高科技', color: 'bg-cyan-500' },
  dailyChemical: { name: '日化', color: 'bg-pink-500' },
  transport: { name: '交通运输', color: 'bg-indigo-500' },
  miningExtended: { name: '矿业扩展', color: 'bg-orange-600' },
  textileExtended: { name: '纺织扩展', color: 'bg-rose-400' },
  buildingExtended: { name: '建材扩展', color: 'bg-stone-500' },
  agriDeepProcess: { name: '农产品深加工', color: 'bg-lime-600' },
  energyExtended: { name: '能源扩展', color: 'bg-yellow-600' },
  telecom: { name: '通信', color: 'bg-blue-600' },
  service: { name: '服务业', color: 'bg-teal-500' },
  cultural: { name: '文化传媒', color: 'bg-violet-500' },
  misc: { name: '其他', color: 'bg-neutral-500' },
};

type ClassifyMode = 'category' | 'industry';

// ==================== 优化的价格图表组件 ====================
interface MemoizedPriceChartProps {
  world: GameWorld | null;
  selectedGoodsId: number;
  selectedGoods: GoodsDefinition;
  tick: number;
  historyIndex: number;
  tradesCount: number;
  height?: number;
}

const MemoizedPriceChart = React.memo<MemoizedPriceChartProps>(({
  world,
  selectedGoodsId,
  selectedGoods,
  tick,
  historyIndex,
  tradesCount,
  height = 280,
}) => {
  const priceHistoryData = useMemo(() => {
    if (!world) return [];
    
    const t = world.trades;
    const maxTrades = t.maxTrades;
    
    interface TickData {
      prices: number[];
      volumes: number[];
      firstPrice: number;
      lastPrice: number;
    }
    
    const tickDataMap = new Map<number, TickData>();
    const searchLimit = Math.min(t.count, 50000);
    
    for (let i = 0; i < searchLimit; i++) {
      const tradeIdx = (t.count - 1 - i + maxTrades) % maxTrades;
      if (t.goodsIds[tradeIdx] === selectedGoodsId) {
        const tradeTick = t.ticks[tradeIdx];
        const tradePrice = t.prices[tradeIdx];
        const tradeQty = t.quantities[tradeIdx];
        
        if (tradePrice > 0 && tradeQty > 0) {
          let data = tickDataMap.get(tradeTick);
          if (!data) {
            data = { prices: [], volumes: [], firstPrice: tradePrice, lastPrice: tradePrice };
            tickDataMap.set(tradeTick, data);
          }
          data.prices.push(tradePrice);
          data.volumes.push(tradeQty);
          data.firstPrice = tradePrice;
        }
      }
    }
    
    if (tickDataMap.size === 0) {
      const basePrice = selectedGoods?.basePrice || world.goods.prices[selectedGoodsId];
      if (basePrice > 0) {
        const date = tickToDate(tick);
        const timeStr = `${date.month}/${date.day} ${date.hour}:00`;
        return [{
          time: timeStr,
          price: basePrice,
          open: basePrice,
          high: basePrice,
          low: basePrice,
          close: basePrice,
          volume: 0,
        }];
      }
      return [];
    }
    
    const sortedTicks = Array.from(tickDataMap.keys()).sort((a, b) => a - b);
    const recentTicks = sortedTicks.slice(-200);
    
    const data: PriceDataPoint[] = [];
    
    for (const tickTime of recentTicks) {
      const tickData = tickDataMap.get(tickTime)!;
      const prices = tickData.prices;
      const volumes = tickData.volumes;
      
      const open = tickData.firstPrice;
      const close = tickData.lastPrice;
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const volume = volumes.reduce((sum, v) => sum + v, 0);
      
      let totalValue = 0;
      let totalQty = 0;
      for (let j = 0; j < prices.length; j++) {
        totalValue += prices[j] * volumes[j];
        totalQty += volumes[j];
      }
      const avgPrice = totalQty > 0 ? totalValue / totalQty : close;
      
      const date = tickToDate(tickTime);
      const timeStr = `${date.month}/${date.day} ${date.hour}:00`;
      
      data.push({
        time: timeStr,
        price: avgPrice,
        open,
        high,
        low,
        close,
        volume,
      });
    }
    
    return data;
  }, [world, tick, tradesCount, selectedGoodsId, selectedGoods]);
  
  if (!world || priceHistoryData.length === 0) {
    return (
      <div className="flex items-center justify-center text-foreground-muted" style={{ height }}>
        暂无价格数据
      </div>
    );
  }
  
  return (
    <PriceChart
      data={priceHistoryData}
      title="📈 价格走势"
      height={height}
      showVolume={true}
      showMA={true}
      showTimeRangeSelector={true}
      basePrice={selectedGoods.basePrice}
      defaultMode="area"
      defaultTimeRange={168}
    />
  );
});

MemoizedPriceChart.displayName = 'MemoizedPriceChart';

// ==================== 商品选择器组件（移动端用）====================
interface GoodsSelectorProps {
  goods: GoodsDefinition[];
  selectedGoodsId: number;
  onSelect: (goodsId: number) => void;
  playerStockMap: Map<number, number>;
}

const GoodsSelector = React.memo<GoodsSelectorProps>(({
  goods,
  selectedGoodsId,
  onSelect,
  playerStockMap,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {goods.map(g => {
        const hasStock = (playerStockMap.get(g.id) || 0) > 0;
        const isSelected = selectedGoodsId === g.id;
        
        return (
          <button
            key={g.id}
            className={`
              flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all
              ${isSelected
                ? 'bg-accent text-white shadow-md'
                : 'bg-background-muted text-foreground-secondary'
              }
            `}
            onClick={() => onSelect(g.id)}
          >
            <GoodsIcon goodsId={g.id} size={16} autoColor={!isSelected} />
            {hasStock && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
            <span className="text-sm font-medium whitespace-nowrap">{g.name}</span>
          </button>
        );
      })}
    </div>
  );
});

GoodsSelector.displayName = 'GoodsSelector';

// ==================== 商品分类树组件 ====================
interface GoodsCategoryTreeProps {
  filteredGoods: Record<string, GoodsDefinition[]>;
  expandedCategories: Record<string, boolean>;
  selectedGoodsId: number;
  playerStockMap: Map<number, number>;
  goodsWithOrdersSet: Set<number>;
  onToggleCategory: (category: string) => void;
  onSelectGoods: (goodsId: number) => void;
  classifyMode: ClassifyMode;
}

const GoodsCategoryTree = React.memo<GoodsCategoryTreeProps>(({
  filteredGoods,
  expandedCategories,
  selectedGoodsId,
  playerStockMap,
  goodsWithOrdersSet,
  onToggleCategory,
  onSelectGoods,
  classifyMode,
}) => {
  const config = classifyMode === 'category' ? CATEGORY_CONFIG : INDUSTRY_CONFIG;
  
  return (
    <TooltipProvider>
      {Object.entries(config).map(([category, categoryConfig]) => {
        const goods = filteredGoods[category] || [];
        if (goods.length === 0) return null;
        
        return (
          <div key={category} className="mb-3">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-background-muted rounded-xl transition-all duration-200 group"
              onClick={() => onToggleCategory(category)}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${categoryConfig.color}`}></span>
                <span>{categoryConfig.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background-subtle text-foreground-muted font-medium">{goods.length}</span>
                <span className={`text-foreground-muted text-xs transition-transform duration-200 ${expandedCategories[category] ? 'rotate-0' : '-rotate-90'}`}>▼</span>
              </div>
            </button>
            
            {expandedCategories[category] && (
              <div className="mt-1.5 space-y-1 pl-1">
                {goods.map(g => {
                  const hasStock = (playerStockMap.get(g.id) || 0) > 0;
                  const hasOrders = goodsWithOrdersSet.has(g.id);
                  const isSelected = selectedGoodsId === g.id;
                  
                  return (
                    <button
                      key={g.id}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all duration-200 ${
                        isSelected
                          ? 'bg-accent text-white shadow-md'
                          : 'hover:bg-background-muted text-foreground'
                      }`}
                      onClick={() => onSelectGoods(g.id)}
                    >
                      <GoodsIcon goodsId={g.id} size={18} autoColor={!isSelected} />
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        hasStock ? 'bg-success' : hasOrders ? 'bg-warning' : 'bg-gray-500/50'
                      }`}></span>
                      <span className="truncate font-medium">{g.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </TooltipProvider>
  );
});

GoodsCategoryTree.displayName = 'GoodsCategoryTree';

// ==================== 交易面板组件 ====================
interface TradePanelProps {
  selectedGoodsId: number;
  selectedGoods: GoodsDefinition | undefined;
  currentPrice: number;
  playerCash: number;
  playerStock: number;
  tradeType: 'buy' | 'sell';
  tradeQuantity: string;
  tradePrice: string;
  onTradeTypeChange: (type: 'buy' | 'sell') => void;
  onQuantityChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onSubmit: () => void;
  compact?: boolean;
}

const TradePanel = React.memo<TradePanelProps>(({
  selectedGoodsId,
  selectedGoods,
  currentPrice,
  playerCash,
  playerStock,
  tradeType,
  tradeQuantity,
  tradePrice,
  onTradeTypeChange,
  onQuantityChange,
  onPriceChange,
  onSubmit,
  compact = false,
}) => {
  const effectivePrice = tradePrice ? parseFloat(tradePrice) : currentPrice;
  const totalCost = effectivePrice * (parseFloat(tradeQuantity) || 0);

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* 买卖切换 */}
      <div className="flex gap-2 p-1 bg-background-muted rounded-xl">
        <Button
          variant={tradeType === 'buy' ? 'success' : 'ghost'}
          size="sm"
          className="flex-1"
          onClick={() => onTradeTypeChange('buy')}
        >
          📈 买入
        </Button>
        <Button
          variant={tradeType === 'sell' ? 'danger' : 'ghost'}
          size="sm"
          className="flex-1"
          onClick={() => onTradeTypeChange('sell')}
        >
          📉 卖出
        </Button>
      </div>
      
      {/* 数量输入 */}
      <Input
        label="数量"
        type="number"
        value={tradeQuantity}
        onChange={(e) => onQuantityChange(e.target.value)}
        size="sm"
        variant="filled"
      />
      
      {/* 单价输入 */}
      <Input
        label="单价"
        type="number"
        placeholder={`¥${currentPrice.toFixed(2)}`}
        value={tradePrice}
        onChange={(e) => onPriceChange(e.target.value)}
        size="sm"
        variant="filled"
      />
      
      {/* 总价 */}
      <div className={`flex justify-between p-3 rounded-xl border-2 ${
        tradeType === 'buy'
          ? 'bg-success/5 border-success/30'
          : 'bg-error/5 border-error/30'
      }`}>
        <span className="text-foreground-muted">总价</span>
        <span className={`font-bold ${
          tradeType === 'buy' ? 'text-success' : 'text-error'
        }`}>
          ¥{totalCost.toFixed(2)}
        </span>
      </div>
      
      {/* 余额/库存 */}
      <div className="text-xs text-foreground-muted flex justify-between p-2 rounded-lg bg-background-muted/50">
        <span>{tradeType === 'buy' ? '可用资金' : '可售库存'}</span>
        <span className="font-semibold text-foreground">
          {tradeType === 'buy' ? `¥${playerCash.toLocaleString()}` : playerStock.toFixed(0)}
        </span>
      </div>
      
      {/* 提交按钮 */}
      <Button
        variant={tradeType === 'buy' ? 'success' : 'danger'}
        className="w-full"
        onClick={onSubmit}
      >
        {tradeType === 'buy' ? '确认买入' : '确认卖出'}
      </Button>
    </div>
  );
});

TradePanel.displayName = 'TradePanel';

export const Market: React.FC = () => {
  const storeTick = useGameStore((state) => state.tick);
  const { isMobile, isTablet } = useMobile();
  
  const {
    getWorld,
    playerCash,
    getPlayerInventory,
    placeBuyOrder,
    placeSellOrder,
    cancelPlayerOrder,
    ui,
    setSelectedGoods: setStoreSelectedGoods,
    setCurrentPage,
    setSelectedBuilding,
    navigateToBuildBuilding,
    addNotification,
  } = useGameStore();
  
  const world = getWorld();
  
  const [selectedGoodsId, setSelectedGoodsIdLocal] = useState<number>(ui.selectedGoodsId ?? 14);
  const [showGoodsSelector, setShowGoodsSelector] = useState(false);
  const [showTradePanel, setShowTradePanel] = useState(false);
  
  useEffect(() => {
    if (ui.selectedGoodsId !== null && ui.selectedGoodsId !== selectedGoodsId) {
      setSelectedGoodsIdLocal(ui.selectedGoodsId);
    }
  }, [ui.selectedGoodsId]);
  
  const setSelectedGoodsId = (goodsId: number) => {
    setSelectedGoodsIdLocal(goodsId);
    setStoreSelectedGoods(goodsId);
    setShowGoodsSelector(false);
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [classifyMode, setClassifyMode] = useState<ClassifyMode>('category');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    raw: true, basic: true, intermediate: false, final: false,
    core: true, agriculture: false, pharma: false, military: false,
    luxury: false, tech: false, dailyChemical: false, transport: false,
    miningExtended: false, textileExtended: false, buildingExtended: false,
    agriDeepProcess: false, energyExtended: false, telecom: false,
    service: false, cultural: false, misc: false,
  });
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState<string>('10');
  const [tradePrice, setTradePrice] = useState<string>('');

  const inventory = getPlayerInventory();
  const selectedGoods = ALL_GOODS.find(g => g.id === selectedGoodsId);

  // 过滤商品
  const filteredGoods = useMemo(() => {
    const sourceData = classifyMode === 'category' ? GOODS_BY_CATEGORY : GOODS_BY_INDUSTRY;
    if (!searchQuery) return sourceData;
    
    const query = searchQuery.toLowerCase();
    const result: Record<string, GoodsDefinition[]> = {};
    
    for (const [key, goods] of Object.entries(sourceData)) {
      result[key] = goods.filter(g => g.name.toLowerCase().includes(query));
    }
    
    return result;
  }, [searchQuery, classifyMode]);

  // 所有商品列表（用于移动端选择器）
  const allGoodsList = useMemo(() => {
    return ALL_GOODS.slice(0, 50); // 限制数量
  }, []);

  // 价格获取函数
  const getCurrentPrice = (goodsId: number) => {
    return world?.goods.prices[goodsId] || ALL_GOODS.find(g => g.id === goodsId)?.basePrice || 0;
  };

  const getLastTradePrice = (goodsId: number): number | null => {
    if (!world) return null;
    const t = world.trades;
    for (let i = t.count - 1; i >= Math.max(0, t.count - 1000); i--) {
      const idx = i % t.maxTrades;
      if (t.goodsIds[idx] === goodsId) return t.prices[idx];
    }
    return null;
  };

  const getPlayerStock = (goodsId: number) => {
    if (!world) return 0;
    return world.companies.inventories[0 * GOODS_COUNT + goodsId] || 0;
  };

  // 订单簿
  const getOrderBook = (goodsId: number) => {
    if (!world) return { buyOrders: [], sellOrders: [] };
    
    const buyOrders: { price: number; quantity: number; companyName: string }[] = [];
    const sellOrders: { price: number; quantity: number; companyName: string }[] = [];
    
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i] && world.orders.goodsIds[i] === goodsId) {
        const order = {
          price: world.orders.prices[i],
          quantity: world.orders.remainings[i],
          companyName: world.orders.companyIds[i] === 0 ? '玩家公司' : 
            world.companies.names[world.orders.companyIds[i]] || `公司#${world.orders.companyIds[i]}`,
        };
        
        if (world.orders.types[i] === 0) buyOrders.push(order);
        else sellOrders.push(order);
      }
    }
    
    buyOrders.sort((a, b) => b.price - a.price);
    sellOrders.sort((a, b) => a.price - b.price);
    
    return { buyOrders: buyOrders.slice(0, 5), sellOrders: sellOrders.slice(0, 5) };
  };

  // 玩家订单
  const getPlayerOrders = (goodsId: number) => {
    if (!world) return [];
    
    const orders: { index: number; type: 'buy' | 'sell'; price: number; quantity: number; goodsId: number }[] = [];
    
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i] && world.orders.companyIds[i] === 0 && world.orders.goodsIds[i] === goodsId) {
        orders.push({
          index: i,
          type: world.orders.types[i] === 0 ? 'buy' : 'sell',
          price: world.orders.prices[i],
          quantity: world.orders.remainings[i],
          goodsId: world.orders.goodsIds[i],
        });
      }
    }
    
    return orders;
  };

  // 提交订单
  const handleSubmitOrder = () => {
    const price = parseFloat(tradePrice) || currentPrice;
    const quantity = parseFloat(tradeQuantity);
    
    if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) return;
    
    let success = false;
    if (tradeType === 'buy') success = placeBuyOrder(selectedGoodsId, quantity, price);
    else success = placeSellOrder(selectedGoodsId, quantity, price);
    
    if (success) {
      setTradeQuantity('10');
      setTradePrice('');
      setShowTradePanel(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Memoized values
  const currentWorld = getWorld();
  const tick = currentWorld?.tick ?? 0;
  const tradesCount = currentWorld?.trades.count ?? 0;
  const ordersActiveCount = currentWorld?.orders.activeCount ?? 0;
  
  const currentPrice = useMemo(() => getCurrentPrice(selectedGoodsId), [selectedGoodsId, tick]);
  const lastTradePrice = useMemo(() => getLastTradePrice(selectedGoodsId), [selectedGoodsId, tradesCount]);
  const playerStock = useMemo(() => getPlayerStock(selectedGoodsId), [selectedGoodsId, tick]);
  const orderBook = useMemo(() => getOrderBook(selectedGoodsId), [selectedGoodsId, ordersActiveCount]);
  const playerOrders = useMemo(() => getPlayerOrders(selectedGoodsId), [selectedGoodsId, ordersActiveCount]);

  const playerStockMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!world) return map;
    for (let i = 0; i < GOODS_COUNT; i++) {
      const stock = world.companies.inventories[0 * GOODS_COUNT + i];
      if (stock > 0) map.set(i, stock);
    }
    return map;
  }, [tick]);
  
  const goodsWithOrdersSet = useMemo(() => {
    const set = new Set<number>();
    if (!world) return set;
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i]) set.add(world.orders.goodsIds[i]);
    }
    return set;
  }, [ordersActiveCount]);

  // ==================== 移动端布局 ====================
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* 商品选择栏 */}
        <div className="flex-shrink-0 p-3 border-b border-border bg-background-surface">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowGoodsSelector(true)}
              className="flex-1 flex items-center gap-2 p-2 rounded-xl bg-background-muted"
            >
              <GoodsIcon goodsId={selectedGoodsId} size={24} autoColor />
              <span className="font-medium">{selectedGoods?.name || '选择商品'}</span>
              <span className="ml-auto text-foreground-muted">▼</span>
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowTradePanel(true)}
            >
              交易
            </Button>
          </div>
          
          {/* 快速价格信息 */}
          <div className="flex gap-2 text-xs">
            <div className="flex-1 p-2 rounded-lg bg-background-muted">
              <span className="text-foreground-muted">成交价</span>
              <span className="ml-2 font-semibold">
                {lastTradePrice ? `¥${lastTradePrice.toFixed(2)}` : '-'}
              </span>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-background-muted">
              <span className="text-foreground-muted">库存</span>
              <span className="ml-2 font-semibold">{playerStock.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {selectedGoods && (
            <>
              {/* 价格走势 */}
              <Card variant="game" padding="sm">
                <MemoizedPriceChart
                  world={world}
                  selectedGoodsId={selectedGoodsId}
                  selectedGoods={selectedGoods}
                  tick={tick}
                  historyIndex={world?.goods.historyIndex ?? 0}
                  tradesCount={tradesCount}
                  height={200}
                />
              </Card>

              {/* 订单簿 */}
              <Card variant="game" padding="sm">
                <CardTitle className="text-sm mb-2">📋 市场挂单</CardTitle>
                <div className="grid grid-cols-2 gap-2">
                  {/* 卖单 */}
                  <div className="p-2 rounded-lg bg-error/5">
                    <p className="text-xs text-error mb-1 font-medium">卖方</p>
                    {orderBook.sellOrders.slice(0, 3).map((order, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1">
                        <span className="text-error">¥{order.price.toFixed(2)}</span>
                        <span>{order.quantity.toFixed(0)}</span>
                      </div>
                    ))}
                    {orderBook.sellOrders.length === 0 && (
                      <p className="text-xs text-foreground-muted text-center py-2">无</p>
                    )}
                  </div>
                  {/* 买单 */}
                  <div className="p-2 rounded-lg bg-success/5">
                    <p className="text-xs text-success mb-1 font-medium">买方</p>
                    {orderBook.buyOrders.slice(0, 3).map((order, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1">
                        <span className="text-success">¥{order.price.toFixed(2)}</span>
                        <span>{order.quantity.toFixed(0)}</span>
                      </div>
                    ))}
                    {orderBook.buyOrders.length === 0 && (
                      <p className="text-xs text-foreground-muted text-center py-2">无</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* 我的订单 */}
              {playerOrders.length > 0 && (
                <Card variant="game" padding="sm">
                  <CardTitle className="text-sm mb-2">📝 我的挂单</CardTitle>
                  <div className="space-y-1">
                    {playerOrders.map((order) => (
                      <div
                        key={order.index}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          order.type === 'buy' ? 'bg-success/10' : 'bg-error/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={order.type === 'buy' ? 'success' : 'error'} size="sm">
                            {order.type === 'buy' ? '买' : '卖'}
                          </Badge>
                          <span className="text-sm font-medium">¥{order.price.toFixed(2)}</span>
                          <span className="text-sm text-foreground-muted">×{order.quantity.toFixed(0)}</span>
                        </div>
                        <button
                          className="w-6 h-6 rounded-lg bg-background-muted text-foreground-muted text-xs"
                          onClick={() => cancelPlayerOrder(order.index)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* 商品选择弹窗 */}
        {showGoodsSelector && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowGoodsSelector(false)}
          >
            <div 
              className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-background-elevated rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold">选择商品</h3>
                <button 
                  onClick={() => setShowGoodsSelector(false)}
                  className="w-8 h-8 rounded-full bg-background-muted flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="p-3">
                <Input
                  placeholder="搜索商品..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="sm"
                  variant="filled"
                />
              </div>
              <div className="overflow-y-auto max-h-[50vh] p-3">
                <GoodsCategoryTree
                  filteredGoods={filteredGoods}
                  expandedCategories={expandedCategories}
                  selectedGoodsId={selectedGoodsId}
                  playerStockMap={playerStockMap}
                  goodsWithOrdersSet={goodsWithOrdersSet}
                  onToggleCategory={toggleCategory}
                  onSelectGoods={setSelectedGoodsId}
                  classifyMode={classifyMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* 交易面板弹窗 */}
        {showTradePanel && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTradePanel(false)}
          >
            <div 
              className="absolute bottom-0 left-0 right-0 bg-background-elevated rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <GoodsIcon goodsId={selectedGoodsId} size={24} autoColor />
                  <h3 className="font-semibold">{selectedGoods?.name}</h3>
                </div>
                <button 
                  onClick={() => setShowTradePanel(false)}
                  className="w-8 h-8 rounded-full bg-background-muted flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <TradePanel
                  selectedGoodsId={selectedGoodsId}
                  selectedGoods={selectedGoods}
                  currentPrice={currentPrice}
                  playerCash={playerCash}
                  playerStock={playerStock}
                  tradeType={tradeType}
                  tradeQuantity={tradeQuantity}
                  tradePrice={tradePrice}
                  onTradeTypeChange={setTradeType}
                  onQuantityChange={setTradeQuantity}
                  onPriceChange={setTradePrice}
                  onSubmit={handleSubmitOrder}
                  compact
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 平板布局 ====================
  if (isTablet) {
    return (
      <div className="flex flex-col h-full gap-4">
        {/* 顶部商品选择 */}
        <div className="flex-shrink-0">
          <GoodsSelector
            goods={allGoodsList}
            selectedGoodsId={selectedGoodsId}
            onSelect={setSelectedGoodsId}
            playerStockMap={playerStockMap}
          />
        </div>

        {/* 主内容 */}
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          {/* 左侧：价格信息 */}
          <div className="col-span-2 space-y-4 overflow-y-auto">
            {selectedGoods && (
              <>
                {/* 商品头部 */}
                <div className="flex items-center gap-4 p-4 bg-background-surface rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <GoodsIcon goodsId={selectedGoodsId} size={32} autoColor />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedGoods.name}</h2>
                    <div className="flex gap-2 mt-1">
                      <Badge className={CATEGORY_CONFIG[selectedGoods.category].color}>
                        {CATEGORY_CONFIG[selectedGoods.category].name}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 价格信息 */}
                <div className="grid grid-cols-3 gap-3">
                  <StatWidget
                    title="成交价"
                    value={lastTradePrice ? `¥${lastTradePrice.toFixed(2)}` : '-'}
                    icon="💰"
                    variant="game"
                    compact
                  />
                  <StatWidget
                    title="均衡价"
                    value={`¥${currentPrice.toFixed(2)}`}
                    icon="📊"
                    variant="elevated"
                    compact
                  />
                  <StatWidget
                    title="库存"
                    value={playerStock.toFixed(0)}
                    icon="📦"
                    variant="elevated"
                    compact
                  />
                </div>

                {/* 价格走势 */}
                <Card variant="game" padding="md">
                  <MemoizedPriceChart
                    world={world}
                    selectedGoodsId={selectedGoodsId}
                    selectedGoods={selectedGoods}
                    tick={tick}
                    historyIndex={world?.goods.historyIndex ?? 0}
                    tradesCount={tradesCount}
                    height={250}
                  />
                </Card>
              </>
            )}
          </div>

          {/* 右侧：交易 */}
          <div className="space-y-4 overflow-y-auto">
            {/* 订单簿 */}
            <Card variant="game" padding="sm">
              <CardTitle className="text-sm mb-2">📋 市场挂单</CardTitle>
              {/* 卖单 */}
              <div className="p-2 rounded-lg bg-error/5 mb-2">
                <p className="text-xs text-error mb-1">卖方</p>
                {orderBook.sellOrders.slice(0, 3).map((order, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1">
                    <span className="text-error">¥{order.price.toFixed(2)}</span>
                    <span>{order.quantity.toFixed(0)}</span>
                  </div>
                ))}
              </div>
              {/* 买单 */}
              <div className="p-2 rounded-lg bg-success/5">
                <p className="text-xs text-success mb-1">买方</p>
                {orderBook.buyOrders.slice(0, 3).map((order, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1">
                    <span className="text-success">¥{order.price.toFixed(2)}</span>
                    <span>{order.quantity.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 交易面板 */}
            <Card variant="glow" padding="md">
              <CardTitle className="text-sm mb-3">🛒 下单</CardTitle>
              <TradePanel
                selectedGoodsId={selectedGoodsId}
                selectedGoods={selectedGoods}
                currentPrice={currentPrice}
                playerCash={playerCash}
                playerStock={playerStock}
                tradeType={tradeType}
                tradeQuantity={tradeQuantity}
                tradePrice={tradePrice}
                onTradeTypeChange={setTradeType}
                onQuantityChange={setTradeQuantity}
                onPriceChange={setTradePrice}
                onSubmit={handleSubmitOrder}
                compact
              />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 桌面端布局 ====================
  return (
    <div className="min-h-[calc(100vh-80px)] flex gap-5 p-1">
      {/* 左侧栏：商品分类树 */}
      <div className="w-52 flex-shrink-0 flex flex-col bg-gradient-to-b from-background-surface to-background-elevated rounded-2xl overflow-hidden border border-border-muted max-h-[calc(100vh-100px)] shadow-card">
        {/* 分类模式切换 */}
        <div className="p-3 border-b border-border-muted bg-background-surface/50">
          <Tabs value={classifyMode} onValueChange={(v) => setClassifyMode(v as ClassifyMode)}>
            <TabsList variant="game" size="sm" className="w-full">
              <TabsTrigger value="category" variant="game" className="flex-1 text-xs">按类别</TabsTrigger>
              <TabsTrigger value="industry" variant="game" className="flex-1 text-xs">按产业链</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* 搜索框 */}
        <div className="p-3 border-b border-border-muted">
          <Input
            placeholder="搜索商品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon="🔍"
            size="sm"
            variant="filled"
          />
        </div>
        
        {/* 分类树 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          <GoodsCategoryTree
            filteredGoods={filteredGoods}
            expandedCategories={expandedCategories}
            selectedGoodsId={selectedGoodsId}
            playerStockMap={playerStockMap}
            goodsWithOrdersSet={goodsWithOrdersSet}
            onToggleCategory={toggleCategory}
            onSelectGoods={setSelectedGoodsId}
            classifyMode={classifyMode}
          />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 space-y-5">
        {selectedGoods && (
          <>
            {/* 商品头部 */}
            <div className="flex items-center gap-5 p-4 bg-gradient-to-r from-background-elevated via-background-surface to-transparent rounded-2xl border border-border-muted shadow-card">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-lg shadow-accent/10 border border-accent/20">
                <GoodsIcon goodsId={selectedGoodsId} size={40} autoColor />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold tracking-tight">{selectedGoods.name}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge className={`${CATEGORY_CONFIG[selectedGoods.category].color} shadow-sm`} size="md">
                    {CATEGORY_CONFIG[selectedGoods.category].name}
                  </Badge>
                  <Badge variant="outline" className="border-border-strong">{selectedGoods.unit}</Badge>
                </div>
              </div>
            </div>

            {/* 价格信息 */}
            <div className="grid grid-cols-4 gap-4">
              <StatWidget
                title="最新成交价"
                value={lastTradePrice !== null ? `¥${lastTradePrice.toFixed(2)}` : '暂无成交'}
                change={lastTradePrice && selectedGoods ? (lastTradePrice / selectedGoods.basePrice - 1) : undefined}
                icon="💰"
                variant="game"
                glow={lastTradePrice !== null}
                compact
              />
              <StatWidget
                title="市场均衡价"
                value={`¥${currentPrice.toFixed(2)}`}
                change={selectedGoods ? (currentPrice / selectedGoods.basePrice - 1) : undefined}
                icon="📊"
                variant="elevated"
                compact
              />
              <StatWidget
                title="参考价格"
                value={`¥${selectedGoods.basePrice.toFixed(2)}`}
                icon="📌"
                variant="default"
                compact
              />
              <StatWidget
                title="我的库存"
                value={playerStock.toFixed(0)}
                icon="📦"
                variant="elevated"
                status={playerStock > 0 ? 'success' : 'none'}
                suffix={selectedGoods.unit}
                compact
              />
            </div>

            {/* 价格走势图 */}
            <Card variant="game" padding="md">
              <MemoizedPriceChart
                world={world}
                selectedGoodsId={selectedGoodsId}
                selectedGoods={selectedGoods}
                tick={tick}
                historyIndex={world?.goods.historyIndex ?? 0}
                tradesCount={tradesCount}
              />
            </Card>
          </>
        )}
      </div>

      {/* 右侧栏：交易面板 */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 h-[calc(100vh-100px)]">
        {/* 市场挂单 */}
        <Card variant="game" padding="md" className="flex-1 min-h-0 flex flex-col">
          <CardTitle className="text-sm mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">📋</span>
            市场挂单
          </CardTitle>
          
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-3">
            {/* 我的挂单 */}
            {playerOrders.length > 0 && (
              <div className="p-2.5 rounded-xl bg-accent/5 border border-accent/30">
                <p className="text-xs text-accent mb-2 font-semibold">我的挂单</p>
                <div className="space-y-1.5">
                  {playerOrders.map((order) => (
                    <div
                      key={order.index}
                      className={`flex items-center justify-between text-xs p-2 rounded-lg ${
                        order.type === 'buy' ? 'bg-success/10' : 'bg-error/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={order.type === 'buy' ? 'success' : 'error'} size="sm">
                          {order.type === 'buy' ? '买' : '卖'}
                        </Badge>
                        <span className="font-semibold">¥{order.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{order.quantity.toFixed(0)}</span>
                        <button
                          className="w-5 h-5 rounded-lg bg-background-muted hover:bg-error/20 text-foreground-muted hover:text-error transition-colors flex items-center justify-center text-xs"
                          onClick={() => cancelPlayerOrder(order.index)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 卖方报价 */}
            <div className="p-2.5 rounded-xl bg-error/5 border border-error/20">
              <p className="text-xs text-error mb-2 font-semibold">卖方报价</p>
              {orderBook.sellOrders.length > 0 ? (
                <div className="space-y-1">
                  {orderBook.sellOrders.map((order, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs p-1.5 rounded-lg hover:bg-error/10 cursor-pointer"
                      onClick={() => { setTradeType('buy'); setTradePrice(order.price.toString()); }}
                    >
                      <span className="text-error font-semibold">¥{order.price.toFixed(2)}</span>
                      <span>{order.quantity.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground-muted text-center py-2">暂无卖单</p>
              )}
            </div>
            
            {/* 买方报价 */}
            <div className="p-2.5 rounded-xl bg-success/5 border border-success/20">
              <p className="text-xs text-success mb-2 font-semibold">买方报价</p>
              {orderBook.buyOrders.length > 0 ? (
                <div className="space-y-1">
                  {orderBook.buyOrders.map((order, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs p-1.5 rounded-lg hover:bg-success/10 cursor-pointer"
                      onClick={() => { setTradeType('sell'); setTradePrice(order.price.toString()); }}
                    >
                      <span className="text-success font-semibold">¥{order.price.toFixed(2)}</span>
                      <span>{order.quantity.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground-muted text-center py-2">暂无买单</p>
              )}
            </div>
          </div>
        </Card>

        {/* 自定义下单 */}
        <Card variant="glow" padding="md" className="flex-shrink-0 border-accent/30">
          <CardTitle className="text-sm mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">🛒</span>
            自定义下单
          </CardTitle>
          
          <TradePanel
            selectedGoodsId={selectedGoodsId}
            selectedGoods={selectedGoods}
            currentPrice={currentPrice}
            playerCash={playerCash}
            playerStock={playerStock}
            tradeType={tradeType}
            tradeQuantity={tradeQuantity}
            tradePrice={tradePrice}
            onTradeTypeChange={setTradeType}
            onQuantityChange={setTradeQuantity}
            onPriceChange={setTradePrice}
            onSubmit={handleSubmitOrder}
          />
        </Card>
      </div>
    </div>
  );
};

export default Market;
