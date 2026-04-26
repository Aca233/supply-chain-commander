/**
 * 市场页面
 * 商品交易、价格走势、订单管理
 * 支持响应式布局
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS, GoodsDefinition, GOODS_BY_CATEGORY, GOODS_BY_INDUSTRY } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';
import { getProductionsProducingGoods, getProductionsUsingGoods } from '@/ui/utils/supplyChainUtils';
import { GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import { PriceChart, PriceDataPoint } from '@/ui/components/Charts/PriceChart';
import { MarketShareChart } from '@/ui/components/Charts/MarketShareChart';
import { SupplyDemandChart, SupplyDemandData } from '@/ui/components/Charts/SupplyDemandChart';
import { CandlestickChart, OHLCData } from '@/ui/components/Charts/CandlestickChart';
import { formatMonthDay, tickToDate, GameWorld } from '@/core/world/GameWorld';
import { GoodsIcon, BuildingIcon } from '@/ui/components/Icons';
import { useMobile } from '@/ui/hooks/useMobile';
import { ResponsiveOverlayPanel } from '@/ui/components/Layout/ResponsiveOverlayPanel';

// 设计系统组件
import {
  Button,
  Card,
  CardTitle,
  Badge,
  Input,
  StatWidget,
  Tabs,
  TabsList,
  TabsTrigger,
  TooltipProvider,
} from '@/ui/design-system';

// 商品分类配置
const CATEGORY_CONFIG = {
  raw: { name: '原材料', color: 'bg-amber-500' },
  basic: { name: '基础加工', color: 'bg-blue-500' },
  intermediate: { name: '中间产品', color: 'bg-purple-500' },
  final: { name: '最终产品', color: 'bg-green-500' },
};

const INDUSTRY_CONFIG: Record<string, { name: string; color: string }> = {
  mining: { name: '矿业', color: 'bg-stone-500' },
  energy: { name: '能源', color: 'bg-yellow-500' },
  agriculture: { name: '农林牧渔', color: 'bg-green-500' },
  food: { name: '食品', color: 'bg-orange-500' },
  chemical: { name: '化工建材', color: 'bg-emerald-500' },
  metallurgy: { name: '冶金', color: 'bg-slate-500' },
  textile: { name: '纺织家具', color: 'bg-rose-500' },
  electronics: { name: '电子科技', color: 'bg-cyan-500' },
  automotive: { name: '汽车', color: 'bg-blue-500' },
  appliance: { name: '家电', color: 'bg-indigo-500' },
  newEnergy: { name: '新能源', color: 'bg-lime-500' },
  pharma: { name: '医药', color: 'bg-pink-500' },
  luxury: { name: '奢侈品', color: 'bg-purple-500' },
};

type ClassifyMode = 'category' | 'industry';

export function buildSupplyDemandData({
  world,
  selectedGoodsId,
  selectedGoods,
  currentPrice,
}: {
  world: Pick<GameWorld, 'goods'>;
  selectedGoodsId: number;
  selectedGoods: Pick<GoodsDefinition, 'name' | 'basePrice'>;
  currentPrice: number;
}): SupplyDemandData {
  const supply = world.goods.supplies?.[selectedGoodsId] ?? 0;
  const demand = world.goods.demands?.[selectedGoodsId] ?? 0;

  return {
    goodsId: selectedGoodsId.toString(),
    goodsName: selectedGoods.name,
    currentPrice,
    basePrice: selectedGoods.basePrice,
    supply,
    demand,
    equilibriumPrice: currentPrice,
    priceHistory: [],
  };
}

// ==================== 优化的价格图表组件 ====================
interface MemoizedPriceChartProps {
  world: GameWorld | null;
  selectedGoodsId: number;
  selectedGoods: GoodsDefinition;
  tick: number;
  tradesCount: number;
  height?: number;
}

const MemoizedPriceChart = React.memo<MemoizedPriceChartProps>(({
  world,
  selectedGoodsId,
  selectedGoods,
  tick,
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
        return [{
          time: formatMonthDay(tick),
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

      data.push({
        time: formatMonthDay(tickTime),
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
  const { isMobile, isTablet, isNarrowDesktop } = useMobile();
  
  const {
    getWorld,
    playerCash,
    placeBuyOrder,
    placeSellOrder,
    cancelPlayerOrder,
    ui,
    setSelectedGoods: setStoreSelectedGoods,
    navigateToBuildBuilding,
  } = useGameStore();
  
  const world = getWorld();
  
  const [selectedGoodsId, setSelectedGoodsIdLocal] = useState<number>(ui.selectedGoodsId ?? 14);
  const [showGoodsSelector, setShowGoodsSelector] = useState(false);
  const [showTradePanel, setShowTradePanel] = useState(false);
  
  useEffect(() => {
    if (ui.selectedGoodsId !== null && ui.selectedGoodsId !== selectedGoodsId) {
      setSelectedGoodsIdLocal(ui.selectedGoodsId);
    }
  }, [ui.selectedGoodsId, selectedGoodsId]);
  
  const setSelectedGoodsId = (goodsId: number) => {
    setSelectedGoodsIdLocal(goodsId);
    setStoreSelectedGoods(goodsId);
    setShowGoodsSelector(false);
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [classifyMode, setClassifyMode] = useState<ClassifyMode>('category');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    // 按类别
    raw: true, basic: true, intermediate: false, final: false,
    // 按产业链
    mining: true, energy: false, agriculture: false, food: false,
    chemical: false, metallurgy: false, textile: false, electronics: false,
    automotive: false, appliance: false, newEnergy: false, pharma: false, luxury: false,
  });
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState<string>('10');
  const [tradePrice, setTradePrice] = useState<string>('');

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
  const tick = world?.tick ?? 0;
  const tradesCount = world?.trades.count ?? 0;
  const ordersActiveCount = world?.orders.activeCount ?? 0;
  
  const currentPrice = useMemo(() => getCurrentPrice(selectedGoodsId), [selectedGoodsId, tick]);
  const lastTradePrice = useMemo(() => getLastTradePrice(selectedGoodsId), [selectedGoodsId, tradesCount]);
  const playerStock = useMemo(() => getPlayerStock(selectedGoodsId), [selectedGoodsId, tick]);
  const orderBook = useMemo(() => getOrderBook(selectedGoodsId), [selectedGoodsId, ordersActiveCount]);
  const playerOrders = useMemo(() => getPlayerOrders(selectedGoodsId), [selectedGoodsId, ordersActiveCount]);

  // 供需数据计算
  const supplyDemandData = useMemo((): SupplyDemandData | null => {
    if (!world || !selectedGoods) return null;

    return buildSupplyDemandData({
      world,
      selectedGoodsId,
      selectedGoods,
      currentPrice,
    });
  }, [world, selectedGoodsId, selectedGoods, currentPrice, tick]);

  // K线数据计算
  const candlestickData = useMemo((): OHLCData[] => {
    if (!world) return [];
    
    const t = world.trades;
    const maxTrades = t.maxTrades;
    
    // 按天聚合交易数据
    const dayDataMap = new Map<number, {
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      firstTick: number;
      lastTick: number;
    }>();
    
    const searchLimit = Math.min(t.count, 50000);
    
    for (let i = 0; i < searchLimit; i++) {
      const tradeIdx = (t.count - 1 - i + maxTrades) % maxTrades;
      if (t.goodsIds[tradeIdx] === selectedGoodsId) {
        const tradeTick = t.ticks[tradeIdx];
        const tradePrice = t.prices[tradeIdx];
        const tradeQty = t.quantities[tradeIdx];
        
        if (tradePrice > 0 && tradeQty > 0) {
          const dayIndex = Math.floor(tradeTick / TICKS_PER_DAY);
          
          let data = dayDataMap.get(dayIndex);
          if (!data) {
            data = {
              open: tradePrice,
              high: tradePrice,
              low: tradePrice,
              close: tradePrice,
              volume: 0,
              firstTick: tradeTick,
              lastTick: tradeTick,
            };
            dayDataMap.set(dayIndex, data);
          }
          
          // 更新OHLC
          if (tradeTick < data.firstTick) {
            data.open = tradePrice;
            data.firstTick = tradeTick;
          }
          if (tradeTick > data.lastTick) {
            data.close = tradePrice;
            data.lastTick = tradeTick;
          }
          data.high = Math.max(data.high, tradePrice);
          data.low = Math.min(data.low, tradePrice);
          data.volume += tradeQty;
        }
      }
    }
    
    if (dayDataMap.size === 0) return [];
    
    // 转换为数组并排序
    const sortedDays = Array.from(dayDataMap.keys()).sort((a, b) => a - b);
    const recentDays = sortedDays.slice(-60); // 最近60天
    
    return recentDays.map(dayIndex => {
      const data = dayDataMap.get(dayIndex)!;
      const date = tickToDate(dayIndex * TICKS_PER_DAY);
      return {
        time: `${date.year}/${date.month}/${date.day}`,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
      };
    });
  }, [world, selectedGoodsId, tradesCount]);

  // 图表视图模式
  const [chartViewMode, setChartViewMode] = useState<'price' | 'candlestick' | 'supplyDemand'>('price');

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

  const renderSelectedGoodsAnalysisContent = () => {
    if (!selectedGoods) return null;
    return (
      <>
      {/* 商品头部 */}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border-muted bg-gradient-to-r from-background-elevated via-background-surface to-transparent p-4 shadow-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/20 to-accent/5 shadow-lg shadow-accent/10">
          <GoodsIcon goodsId={selectedGoodsId} size={40} autoColor />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-bold tracking-tight">{selectedGoods.name}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge className={`${CATEGORY_CONFIG[selectedGoods.category].color} shadow-sm`} size="md">
              {CATEGORY_CONFIG[selectedGoods.category].name}
            </Badge>
            <Badge variant="outline" className="border-border-strong">{selectedGoods.unit}</Badge>
          </div>
        </div>
      </div>

      {/* 上下游产业链 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 上一级（原料） */}
        <Card variant="game" padding="md" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <h3 className="text-sm font-semibold mb-3 text-amber-400 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">⬆</span>
            上一级（原料）
          </h3>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const inputGoods = new Set<number>();
              const productions = getProductionsProducingGoods(selectedGoodsId);
              productions.forEach(p => p.inputs.forEach(i => inputGoods.add(i.goodsId)));
              const inputs = Array.from(inputGoods).slice(0, 6);
              if (inputs.length === 0) return (
                <div className="flex items-center gap-2 text-sm text-foreground-muted py-2">
                  <span className="text-lg">🌱</span>
                  <span>原始资源，无需原料</span>
                </div>
              );
              return inputs.map(gid => {
                const g = ALL_GOODS.find(x => x.id === gid);
                return g ? (
                  <button
                    key={gid}
                    className="w-14 h-12 rounded-xl bg-gradient-to-br from-background-muted to-background-surface hover:from-green-500/20 hover:to-green-500/10 border border-transparent hover:border-green-500/40 transition-all duration-300 flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:shadow-green-500/10 hover:scale-105"
                    onClick={() => setSelectedGoodsId(gid)}
                  >
                    <GoodsIcon goodsId={gid} size={20} autoColor />
                    <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{g.name}</span>
                  </button>
                ) : null;
              });
            })()}
          </div>
        </Card>

        {/* 下一级（产品） */}
        <Card variant="game" padding="md" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <h3 className="text-sm font-semibold mb-3 text-green-400 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-xs">⬇</span>
            下一级（产品）
          </h3>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const outputGoods = new Set<number>();
              const usingProductions = getProductionsUsingGoods(selectedGoodsId);
              usingProductions.forEach(p => p.outputs.forEach(o => outputGoods.add(o.goodsId)));
              const outputs = Array.from(outputGoods).slice(0, 8);
              if (outputs.length === 0) return (
                <div className="flex items-center gap-2 text-sm text-foreground-muted py-2">
                  <span className="text-lg">🎯</span>
                  <span>最终产品，无下游</span>
                </div>
              );
              return outputs.map(gid => {
                const g = ALL_GOODS.find(x => x.id === gid);
                return g ? (
                  <button
                    key={gid}
                    className="w-14 h-12 rounded-xl bg-gradient-to-br from-background-muted to-background-surface hover:from-green-500/20 hover:to-green-500/10 border border-transparent hover:border-green-500/40 transition-all duration-300 flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:shadow-green-500/10 hover:scale-105"
                    onClick={() => setSelectedGoodsId(gid)}
                  >
                    <GoodsIcon goodsId={gid} size={20} autoColor />
                    <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{g.name}</span>
                  </button>
                ) : null;
              });
            })()}
          </div>
        </Card>
      </div>

      {/* 价格信息 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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

      {/* 销售排行榜 */}
      <Card variant="game" padding="md">
        {(() => {
          // 饼图颜色配置（与 MarketShareChart 一致）
          const CHART_COLORS = [
            '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
          ];
          
          // 格式化数字（使用万、亿单位）
          const formatNumber = (num: number) => {
            if (num >= 100000000) {
              return (num / 100000000).toFixed(1) + '亿';
            } else if (num >= 10000) {
              return (num / 10000).toFixed(1) + '万';
            }
            return Math.round(num).toLocaleString('zh-CN');
          };
          
          // 【修复】使用累计销售统计数据，而不是遍历交易记录
          // 这样可以获取真正的历史累计销售量，不会因为环形缓冲区覆盖而消失
          if (!world) return <div className="text-center text-foreground-muted py-8">暂无数据</div>;
          const companyVolumes = new Map<number, number>();
          const t = world.trades;
          let totalVolume = 0;
          
          // 遍历所有公司，从累计销售统计中获取该商品的销售量
          for (let companyId = 0; companyId < world.companies.count; companyId++) {
            const statsIdx = companyId * GOODS_COUNT + selectedGoodsId;
            const cumulativeQty = t.cumulativeSalesQuantity[statsIdx];
            if (cumulativeQty > 0) {
              companyVolumes.set(companyId, cumulativeQty);
              totalVolume += cumulativeQty;
            }
          }
          
          // 排序所有公司
          const allSortedCompanies = Array.from(companyVolumes.entries())
            .sort((a, b) => b[1] - a[1]);
          
          // 取前5名
          const top5Companies = allSortedCompanies.slice(0, 5);
          
          // 计算其他公司的销量
          const othersVolume = allSortedCompanies.slice(5).reduce((sum, [, v]) => sum + v, 0);
          
          if (top5Companies.length === 0) return <div className="text-center text-foreground-muted py-8">暂无销售数据</div>;
          
          // 构建饼图数据（包含颜色）
          const chartData = top5Companies.map(([companyId, volume], index) => ({
            name: companyId === 0 ? '玩家公司' : (world.companies.names[companyId] || `公司#${companyId}`),
            value: volume,
            color: CHART_COLORS[index % CHART_COLORS.length],
          }));
          
          // 添加"其他公司"到饼图（如果有的话）
          if (othersVolume > 0) {
            chartData.push({
              name: '其他公司',
              value: othersVolume,
              color: '#64748b',
            });
          }
          
          return (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>📊</span> 销售排行榜
                </CardTitle>
                <span className="text-xs text-accent">
                  总销量 {formatNumber(totalVolume)}
                </span>
              </div>
              
              <div className="flex flex-col gap-6 xl:flex-row">
                {/* 左侧饼图 */}
                <div className="w-48 flex-shrink-0">
                  <MarketShareChart data={chartData} height={200} showLegend={false} />
                </div>
                {/* 右侧公司列表 */}
                <div className="flex-1 space-y-3 min-w-0">
                  {top5Companies.map(([companyId, volume], index) => {
                    const companyName = companyId === 0 ? '玩家公司' : (world.companies.names[companyId] || `公司#${companyId}`);
                    const percentage = totalVolume > 0 ? (volume / totalVolume * 100) : 0;
                    const isPlayer = companyId === 0;
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    return (
                      <div key={companyId} className="flex items-center gap-3">
                        {/* 排名/图标 - 使用饼图颜色 */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: isPlayer ? undefined : color }}
                        >
                          {isPlayer ? '🏠' : index + 1}
                        </div>
                        {/* 公司信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span
                              className="text-sm font-medium truncate"
                              style={{ color: isPlayer ? undefined : color }}
                            >
                              {companyName}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-bold tabular-nums">{formatNumber(volume)}</span>
                              <span className="text-xs text-foreground-muted w-12 text-right">{percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                          {/* 进度条 - 使用饼图颜色 */}
                          <div className="h-1.5 bg-background-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percentage}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* 其他公司 */}
                  {othersVolume > 0 && (
                    <div className="flex items-center gap-3 opacity-70">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: '#64748b' }}
                      >
                        +
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-sm font-medium truncate text-slate-400">
                            其他公司
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-bold tabular-nums">{formatNumber(othersVolume)}</span>
                            <span className="text-xs text-foreground-muted w-12 text-right">
                              {totalVolume > 0 ? (othersVolume / totalVolume * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-background-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${totalVolume > 0 ? (othersVolume / totalVolume * 100) : 0}%`, backgroundColor: '#64748b' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </Card>

      {/* 图表区域 - 支持多种视图 */}
      <Card variant="game" padding="md">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>📊</span> 市场分析
          </CardTitle>
          <Tabs value={chartViewMode} onValueChange={(v) => setChartViewMode(v as 'price' | 'candlestick' | 'supplyDemand')}>
            <TabsList variant="game" size="sm">
              <TabsTrigger value="price" variant="game" className="text-xs">价格走势</TabsTrigger>
              <TabsTrigger value="candlestick" variant="game" className="text-xs">K线图</TabsTrigger>
              <TabsTrigger value="supplyDemand" variant="game" className="text-xs">供需分析</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* 价格走势视图 */}
        {chartViewMode === 'price' && (
          <MemoizedPriceChart
            world={world}
            selectedGoodsId={selectedGoodsId}
            selectedGoods={selectedGoods}
            tick={tick}
            tradesCount={tradesCount}
          />
        )}
        
        {/* K线图视图 */}
        {chartViewMode === 'candlestick' && (
          candlestickData.length > 0 ? (
            <CandlestickChart
              data={candlestickData}
              title={`${selectedGoods.name} K线图`}
              height={280}
              showMA={true}
              showVolume={true}
              showBollinger={false}
              showRSI={false}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-foreground-muted">
              暂无足够的交易数据生成K线图
            </div>
          )
        )}
        
        {/* 供需分析视图 */}
        {chartViewMode === 'supplyDemand' && supplyDemandData && (
          <SupplyDemandChart
            data={supplyDemandData}
            height={280}
            showCurves={true}
            showHistory={true}
          />
        )}
      </Card>

      {/* 生产建筑与消耗建筑 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 生产建筑 */}
        <Card variant="game" padding="md" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <h3 className="text-sm font-semibold mb-3 text-success flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-xs">🏭</span>
            生产建筑
          </h3>
          <div className="flex flex-wrap gap-2">
            {(() => {
              // 找出可以生产此商品的建筑及玩家拥有数量
              const productions = getProductionsProducingGoods(selectedGoodsId);
              const producerBuildingIds = new Set(productions.map(p => p.buildingTypeId));
              const producerBuildings = ALL_BUILDINGS.filter(b => producerBuildingIds.has(b.id)).slice(0, 6);
              if (producerBuildings.length === 0) return (
                <div className="flex items-center gap-2 text-sm text-foreground-muted py-2">
                  <span className="text-lg">🚫</span>
                  <span>暂无生产建筑</span>
                </div>
              );
              return producerBuildings.map(b => {
                // 计算玩家拥有的此类型建筑数量
                const playerBuildingCount = world ?
                  Array.from({ length: world.buildings.maxCount }, (_, i) => i)
                    .filter(i => world.buildings.isActive[i] &&
                                world.buildings.owners[i] === 0 &&
                                world.buildings.types[i] === b.id).length : 0;
                return (
                  <div
                    key={b.id}
                    className={`relative w-14 h-12 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                      playerBuildingCount > 0
                        ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 shadow-md shadow-green-500/10'
                        : 'bg-gradient-to-br from-background-muted to-background-surface border border-border-muted'
                    } hover:scale-110 hover:shadow-lg`}
                    onClick={() => navigateToBuildBuilding(b.id)}
                  >
                    <BuildingIcon buildingId={b.id} size={20} autoColor />
                    <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{b.name}</span>
                    {playerBuildingCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-[10px] text-white flex items-center justify-center font-bold shadow-md shadow-green-500/30 ring-2 ring-background-surface">
                        {playerBuildingCount}
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </Card>

        {/* 消耗建筑 */}
        <Card variant="game" padding="md" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <h3 className="text-sm font-semibold mb-3 text-warning flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-xs">⚡</span>
            消耗建筑
          </h3>
          <div className="flex flex-wrap gap-2">
            {(() => {
              // 找出消耗此商品的建筑及玩家拥有数量
              const usingProductions = getProductionsUsingGoods(selectedGoodsId);
              const consumerBuildingIds = new Set(usingProductions.map(p => p.buildingTypeId));
              const consumerBuildings = ALL_BUILDINGS.filter(b => consumerBuildingIds.has(b.id)).slice(0, 6);
              if (consumerBuildings.length === 0) return (
                <div className="flex items-center gap-2 text-sm text-foreground-muted py-2">
                  <span className="text-lg">🎯</span>
                  <span>最终产品，无消耗建筑</span>
                </div>
              );
              return consumerBuildings.map(b => {
                // 计算玩家拥有的此类型建筑数量
                const playerBuildingCount = world ?
                  Array.from({ length: world.buildings.maxCount }, (_, i) => i)
                    .filter(i => world.buildings.isActive[i] &&
                                world.buildings.owners[i] === 0 &&
                                world.buildings.types[i] === b.id).length : 0;
                return (
                  <div
                    key={b.id}
                    className={`relative w-14 h-12 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                      playerBuildingCount > 0
                        ? 'bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-2 border-orange-500/40 shadow-md shadow-orange-500/10'
                        : 'bg-gradient-to-br from-background-muted to-background-surface border border-border-muted'
                    } hover:scale-110 hover:shadow-lg`}
                    onClick={() => navigateToBuildBuilding(b.id)}
                  >
                    <BuildingIcon buildingId={b.id} size={20} autoColor />
                    <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{b.name}</span>
                    {playerBuildingCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[10px] text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/30 ring-2 ring-background-surface">
                        {playerBuildingCount}
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      </div>
      </>
    );
  };

  // ==================== 移动端布局 ====================
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* 商品选择栏 */}
        <div className="flex-shrink-0 p-3 border-b border-border bg-background-surface">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2 p-2 rounded-xl bg-background-muted"
              onClick={() => setShowGoodsSelector(true)}
            >
              <GoodsIcon goodsId={selectedGoodsId} size={24} autoColor />
              <span className="font-medium">{selectedGoods?.name || '选择商品'}</span>
              <span className="ml-auto text-foreground-muted">▼</span>
            </Button>
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
                      <div key={idx} className="flex flex-col text-xs py-1">
                        <div className="flex justify-between">
                          <span className="text-error">¥{order.price.toFixed(2)}</span>
                          <span>{order.quantity.toFixed(0)}</span>
                        </div>
                        <span className="text-[10px] text-foreground-muted truncate">{order.companyName}</span>
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
                      <div key={idx} className="flex flex-col text-xs py-1">
                        <div className="flex justify-between">
                          <span className="text-success">¥{order.price.toFixed(2)}</span>
                          <span>{order.quantity.toFixed(0)}</span>
                        </div>
                        <span className="text-[10px] text-foreground-muted truncate">{order.companyName}</span>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => cancelPlayerOrder(order.index)}
                        >
                          ✕
                        </Button>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full"
                  onClick={() => setShowGoodsSelector(false)}
                >
                  ✕
                </Button>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full"
                  onClick={() => setShowTradePanel(false)}
                >
                  ✕
                </Button>
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
                  <div key={idx} className="flex flex-col text-xs py-1">
                    <div className="flex justify-between">
                      <span className="text-error">¥{order.price.toFixed(2)}</span>
                      <span>{order.quantity.toFixed(0)}</span>
                    </div>
                    <span className="text-[10px] text-foreground-muted truncate">{order.companyName}</span>
                  </div>
                ))}
              </div>
              {/* 买单 */}
              <div className="p-2 rounded-lg bg-success/5">
                <p className="text-xs text-success mb-1">买方</p>
                {orderBook.buyOrders.slice(0, 3).map((order, idx) => (
                  <div key={idx} className="flex flex-col text-xs py-1">
                    <div className="flex justify-between">
                      <span className="text-success">¥{order.price.toFixed(2)}</span>
                      <span>{order.quantity.toFixed(0)}</span>
                    </div>
                    <span className="text-[10px] text-foreground-muted truncate">{order.companyName}</span>
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

  if (isNarrowDesktop) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col gap-4 p-1">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-muted bg-background-surface p-3 shadow-card">
          <Button
            variant="ghost"
            className="min-w-0 flex-1 justify-start gap-2 rounded-xl bg-background-muted"
            onClick={() => setShowGoodsSelector(true)}
          >
            <GoodsIcon goodsId={selectedGoodsId} size={20} autoColor />
            <span className="truncate font-medium">{selectedGoods?.name || '选择商品'}</span>
            <span className="ml-auto text-foreground-muted">▼</span>
          </Button>
          <Button
            variant="primary"
            className="whitespace-nowrap"
            onClick={() => setShowTradePanel(true)}
          >
            挂单与交易
          </Button>
          <div className="min-w-[220px] flex-1">
            <Input
              placeholder="搜索商品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon="🔍"
              size="sm"
              variant="filled"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="min-w-0 space-y-5">
            {renderSelectedGoodsAnalysisContent()}
          </div>
        </div>

        <ResponsiveOverlayPanel
          open={showGoodsSelector}
          title="商品选择"
          onClose={() => setShowGoodsSelector(false)}
          position="left"
          widthClassName="max-w-sm"
        >
          <div className="flex h-full flex-col bg-gradient-to-b from-background-surface to-background-elevated">
            <div className="border-b border-border-muted bg-background-surface/50 p-3">
              <Tabs value={classifyMode} onValueChange={(v) => setClassifyMode(v as ClassifyMode)}>
                <TabsList variant="game" size="sm" className="w-full">
                  <TabsTrigger value="category" variant="game" className="flex-1 text-xs">按类别</TabsTrigger>
                  <TabsTrigger value="industry" variant="game" className="flex-1 text-xs">按产业链</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="border-b border-border-muted p-3">
              <Input
                placeholder="搜索商品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon="🔍"
                size="sm"
                variant="filled"
              />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
              <GoodsCategoryTree
                filteredGoods={filteredGoods}
                expandedCategories={expandedCategories}
                selectedGoodsId={selectedGoodsId}
                playerStockMap={playerStockMap}
                goodsWithOrdersSet={goodsWithOrdersSet}
                onToggleCategory={toggleCategory}
                onSelectGoods={(goodsId) => {
                  setSelectedGoodsId(goodsId);
                  setShowGoodsSelector(false);
                }}
                classifyMode={classifyMode}
              />
            </div>
          </div>
        </ResponsiveOverlayPanel>

        <ResponsiveOverlayPanel
          open={showTradePanel}
          title="挂单与交易"
          onClose={() => setShowTradePanel(false)}
          position="right"
          widthClassName="max-w-md"
        >
          <div className="space-y-3 p-4">
            <Card variant="game" padding="md" className="min-h-0 flex flex-col">
              <CardTitle className="text-sm mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">📋</span>
                市场挂单
              </CardTitle>

              <div className="min-h-0 space-y-3">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-5 h-5 hover:bg-error/20 hover:text-error"
                              onClick={() => cancelPlayerOrder(order.index)}
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-error/5 border border-error/20">
                  <p className="text-xs text-error mb-2 font-semibold">卖方报价</p>
                  {orderBook.sellOrders.length > 0 ? (
                    <div className="space-y-1">
                      {orderBook.sellOrders.map((order, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-error/10 cursor-pointer"
                          onClick={() => { setTradeType('buy'); setTradePrice(order.price.toString()); }}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-error font-semibold flex-shrink-0">¥{order.price.toFixed(2)}</span>
                            <span className="text-foreground-muted truncate text-[10px]">({order.companyName})</span>
                          </div>
                          <span className="flex-shrink-0 ml-2">{order.quantity.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-muted text-center py-2">暂无卖单</p>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-success/5 border border-success/20">
                  <p className="text-xs text-success mb-2 font-semibold">买方报价</p>
                  {orderBook.buyOrders.length > 0 ? (
                    <div className="space-y-1">
                      {orderBook.buyOrders.map((order, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-success/10 cursor-pointer"
                          onClick={() => { setTradeType('sell'); setTradePrice(order.price.toString()); }}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-success font-semibold flex-shrink-0">¥{order.price.toFixed(2)}</span>
                            <span className="text-foreground-muted truncate text-[10px]">({order.companyName})</span>
                          </div>
                          <span className="flex-shrink-0 ml-2">{order.quantity.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-muted text-center py-2">暂无买单</p>
                  )}
                </div>
              </div>
            </Card>

            <Card variant="glow" padding="md" className="border-accent/30">
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
        </ResponsiveOverlayPanel>
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

            {/* 上下游产业链 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 上一级（原料） */}
              <Card variant="game" padding="md" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-semibold mb-3 text-amber-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">⬆</span>
                  上一级（原料）
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const inputGoods = new Set<number>();
                    const productions = getProductionsProducingGoods(selectedGoodsId);
                    productions.forEach(p => p.inputs.forEach(i => inputGoods.add(i.goodsId)));
                    const inputs = Array.from(inputGoods).slice(0, 6);
                    if (inputs.length === 0) return (
                      <div className="flex items-center gap-2 text-sm text-foreground-muted py-2">
                        <span className="text-lg">🌱</span>
                        <span>原始资源，无需原料</span>
                      </div>
                    );
                    return inputs.map(gid => {
                      const g = ALL_GOODS.find(x => x.id === gid);
                      return g ? (
                        <button
                          key={gid}
                          className="w-14 h-12 rounded-xl bg-gradient-to-br from-background-muted to-background-surface hover:from-green-500/20 hover:to-green-500/10 border border-transparent hover:border-green-500/40 transition-all duration-300 flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:shadow-green-500/10 hover:scale-105"
                          onClick={() => setSelectedGoodsId(gid)}
                        >
                          <GoodsIcon goodsId={gid} size={20} autoColor />
                          <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{g.name}</span>
                        </button>
                      ) : null;
                    });
                  })()}
                </div>
              </Card>

              {/* 下一级（产品） */}
              <Card variant="game" padding="md" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-semibold mb-3 text-green-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-xs">⬇</span>
                  下一级（产品）
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const outputGoods = new Set<number>();
                    const usingProductions = getProductionsUsingGoods(selectedGoodsId);
                    usingProductions.forEach(p => p.outputs.forEach(o => outputGoods.add(o.goodsId)));
                    const outputs = Array.from(outputGoods).slice(0, 8);
                    if (outputs.length === 0) return (
                      <div className="flex items-center gap-2 text-sm text-foreground-muted py-2">
                        <span className="text-lg">🎯</span>
                        <span>最终产品，无下游</span>
                      </div>
                    );
                    return outputs.map(gid => {
                      const g = ALL_GOODS.find(x => x.id === gid);
                      return g ? (
                        <button
                          key={gid}
                          className="w-14 h-12 rounded-xl bg-gradient-to-br from-background-muted to-background-surface hover:from-green-500/20 hover:to-green-500/10 border border-transparent hover:border-green-500/40 transition-all duration-300 flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:shadow-green-500/10 hover:scale-105"
                          onClick={() => setSelectedGoodsId(gid)}
                        >
                          <GoodsIcon goodsId={gid} size={20} autoColor />
                          <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{g.name}</span>
                        </button>
                      ) : null;
                    });
                  })()}
                </div>
              </Card>
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

            {/* 销售排行榜 */}
            <Card variant="game" padding="md">
              {(() => {
                // 饼图颜色配置（与 MarketShareChart 一致）
                const CHART_COLORS = [
                  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
                  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
                ];
                
                // 格式化数字（使用万、亿单位）
                const formatNumber = (num: number) => {
                  if (num >= 100000000) {
                    return (num / 100000000).toFixed(1) + '亿';
                  } else if (num >= 10000) {
                    return (num / 10000).toFixed(1) + '万';
                  }
                  return Math.round(num).toLocaleString('zh-CN');
                };
                
                // 【修复】使用累计销售统计数据，而不是遍历交易记录
                // 这样可以获取真正的历史累计销售量，不会因为环形缓冲区覆盖而消失
                if (!world) return <div className="text-center text-foreground-muted py-8">暂无数据</div>;
                const companyVolumes = new Map<number, number>();
                const t = world.trades;
                let totalVolume = 0;
                
                // 遍历所有公司，从累计销售统计中获取该商品的销售量
                for (let companyId = 0; companyId < world.companies.count; companyId++) {
                  const statsIdx = companyId * GOODS_COUNT + selectedGoodsId;
                  const cumulativeQty = t.cumulativeSalesQuantity[statsIdx];
                  if (cumulativeQty > 0) {
                    companyVolumes.set(companyId, cumulativeQty);
                    totalVolume += cumulativeQty;
                  }
                }
                
                // 排序所有公司
                const allSortedCompanies = Array.from(companyVolumes.entries())
                  .sort((a, b) => b[1] - a[1]);
                
                // 取前5名
                const top5Companies = allSortedCompanies.slice(0, 5);
                
                // 计算其他公司的销量
                const othersVolume = allSortedCompanies.slice(5).reduce((sum, [, v]) => sum + v, 0);
                
                if (top5Companies.length === 0) return <div className="text-center text-foreground-muted py-8">暂无销售数据</div>;
                
                // 构建饼图数据（包含颜色）
                const chartData = top5Companies.map(([companyId, volume], index) => ({
                  name: companyId === 0 ? '玩家公司' : (world.companies.names[companyId] || `公司#${companyId}`),
                  value: volume,
                  color: CHART_COLORS[index % CHART_COLORS.length],
                }));
                
                // 添加"其他公司"到饼图（如果有的话）
                if (othersVolume > 0) {
                  chartData.push({
                    name: '其他公司',
                    value: othersVolume,
                    color: '#64748b',
                  });
                }
                
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span>📊</span> 销售排行榜
                      </CardTitle>
                      <span className="text-xs text-accent">
                        总销量 {formatNumber(totalVolume)}
                      </span>
                    </div>
                
                    <div className="flex gap-6">
                      {/* 左侧饼图 */}
                      <div className="w-48 flex-shrink-0">
                        <MarketShareChart data={chartData} height={200} showLegend={false} />
                      </div>
                      {/* 右侧公司列表 */}
                      <div className="flex-1 space-y-3">
                        {top5Companies.map(([companyId, volume], index) => {
                          const companyName = companyId === 0 ? '玩家公司' : (world.companies.names[companyId] || `公司#${companyId}`);
                          const percentage = totalVolume > 0 ? (volume / totalVolume * 100) : 0;
                          const isPlayer = companyId === 0;
                          const color = CHART_COLORS[index % CHART_COLORS.length];
                          return (
                            <div key={companyId} className="flex items-center gap-3">
                              {/* 排名/图标 - 使用饼图颜色 */}
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                                style={{ backgroundColor: isPlayer ? undefined : color }}
                              >
                                {isPlayer ? '🏠' : index + 1}
                              </div>
                              {/* 公司信息 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span
                                    className="text-sm font-medium truncate"
                                    style={{ color: isPlayer ? undefined : color }}
                                  >
                                    {companyName}
                                  </span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-sm font-bold tabular-nums">{formatNumber(volume)}</span>
                                    <span className="text-xs text-foreground-muted w-12 text-right">{percentage.toFixed(1)}%</span>
                                  </div>
                                </div>
                                {/* 进度条 - 使用饼图颜色 */}
                                <div className="h-1.5 bg-background-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${percentage}%`, backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* 其他公司 */}
                        {othersVolume > 0 && (
                          <div className="flex items-center gap-3 opacity-70">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                              style={{ backgroundColor: '#64748b' }}
                            >
                              +
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium truncate text-slate-400">
                                  其他公司
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-sm font-bold tabular-nums">{formatNumber(othersVolume)}</span>
                                  <span className="text-xs text-foreground-muted w-12 text-right">
                                    {totalVolume > 0 ? (othersVolume / totalVolume * 100).toFixed(1) : 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-background-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${totalVolume > 0 ? (othersVolume / totalVolume * 100) : 0}%`, backgroundColor: '#64748b' }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* 图表区域 - 支持多种视图 */}
            <Card variant="game" padding="md">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>📊</span> 市场分析
                </CardTitle>
                <Tabs value={chartViewMode} onValueChange={(v) => setChartViewMode(v as 'price' | 'candlestick' | 'supplyDemand')}>
                  <TabsList variant="game" size="sm">
                    <TabsTrigger value="price" variant="game" className="text-xs">价格走势</TabsTrigger>
                    <TabsTrigger value="candlestick" variant="game" className="text-xs">K线图</TabsTrigger>
                    <TabsTrigger value="supplyDemand" variant="game" className="text-xs">供需分析</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {/* 价格走势视图 */}
              {chartViewMode === 'price' && (
                <MemoizedPriceChart
                  world={world}
                  selectedGoodsId={selectedGoodsId}
                  selectedGoods={selectedGoods}
                  tick={tick}
                  tradesCount={tradesCount}
                />
              )}
              
              {/* K线图视图 */}
              {chartViewMode === 'candlestick' && (
                candlestickData.length > 0 ? (
                  <CandlestickChart
                    data={candlestickData}
                    title={`${selectedGoods.name} K线图`}
                    height={280}
                    showMA={true}
                    showVolume={true}
                    showBollinger={false}
                    showRSI={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-foreground-muted">
                    暂无足够的交易数据生成K线图
                  </div>
                )
              )}
              
              {/* 供需分析视图 */}
              {chartViewMode === 'supplyDemand' && supplyDemandData && (
                <SupplyDemandChart
                  data={supplyDemandData}
                  height={280}
                  showCurves={true}
                  showHistory={true}
                />
              )}
            </Card>

            {/* 生产建筑与消耗建筑 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 生产建筑 */}
              <Card variant="game" padding="md" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-semibold mb-3 text-success flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-xs">🏭</span>
                  生产建筑
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    // 找出可以生产此商品的建筑及玩家拥有数量
                    const productions = getProductionsProducingGoods(selectedGoodsId);
                    const producerBuildingIds = new Set(productions.map(p => p.buildingTypeId));
                    const producerBuildings = ALL_BUILDINGS.filter(b => producerBuildingIds.has(b.id)).slice(0, 6);
                    if (producerBuildings.length === 0) return (
                      <div className="flex items-center gap-2 text-sm text-foreground-muted py-2">
                        <span className="text-lg">🚫</span>
                        <span>暂无生产建筑</span>
                      </div>
                    );
                    return producerBuildings.map(b => {
                      // 计算玩家拥有的此类型建筑数量
                      const playerBuildingCount = world ?
                        Array.from({ length: world.buildings.maxCount }, (_, i) => i)
                          .filter(i => world.buildings.isActive[i] &&
                                      world.buildings.owners[i] === 0 &&
                                      world.buildings.types[i] === b.id).length : 0;
                      return (
                        <div
                          key={b.id}
                          className={`relative w-14 h-12 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                            playerBuildingCount > 0
                              ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 shadow-md shadow-green-500/10'
                              : 'bg-gradient-to-br from-background-muted to-background-surface border border-border-muted'
                          } hover:scale-110 hover:shadow-lg`}
                          onClick={() => navigateToBuildBuilding(b.id)}
                        >
                          <BuildingIcon buildingId={b.id} size={20} autoColor />
                          <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{b.name}</span>
                          {playerBuildingCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-[10px] text-white flex items-center justify-center font-bold shadow-md shadow-green-500/30 ring-2 ring-background-surface">
                              {playerBuildingCount}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>

              {/* 消耗建筑 */}
              <Card variant="game" padding="md" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-semibold mb-3 text-warning flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-xs">⚡</span>
                  消耗建筑
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    // 找出消耗此商品的建筑及玩家拥有数量
                    const usingProductions = getProductionsUsingGoods(selectedGoodsId);
                    const consumerBuildingIds = new Set(usingProductions.map(p => p.buildingTypeId));
                    const consumerBuildings = ALL_BUILDINGS.filter(b => consumerBuildingIds.has(b.id)).slice(0, 6);
                    if (consumerBuildings.length === 0) return (
                      <div className="flex items-center gap-2 text-sm text-foreground-muted py-2">
                        <span className="text-lg">🎯</span>
                        <span>最终产品，无消耗建筑</span>
                      </div>
                    );
                    return consumerBuildings.map(b => {
                      // 计算玩家拥有的此类型建筑数量
                      const playerBuildingCount = world ?
                        Array.from({ length: world.buildings.maxCount }, (_, i) => i)
                          .filter(i => world.buildings.isActive[i] &&
                                      world.buildings.owners[i] === 0 &&
                                      world.buildings.types[i] === b.id).length : 0;
                      return (
                        <div
                          key={b.id}
                          className={`relative w-14 h-12 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                            playerBuildingCount > 0
                              ? 'bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-2 border-orange-500/40 shadow-md shadow-orange-500/10'
                              : 'bg-gradient-to-br from-background-muted to-background-surface border border-border-muted'
                          } hover:scale-110 hover:shadow-lg`}
                          onClick={() => navigateToBuildBuilding(b.id)}
                        >
                          <BuildingIcon buildingId={b.id} size={20} autoColor />
                          <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{b.name}</span>
                          {playerBuildingCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[10px] text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/30 ring-2 ring-background-surface">
                              {playerBuildingCount}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>
            </div>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-5 h-5 hover:bg-error/20 hover:text-error"
                          onClick={() => cancelPlayerOrder(order.index)}
                        >
                          ✕
                        </Button>
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
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-error/10 cursor-pointer"
                      onClick={() => { setTradeType('buy'); setTradePrice(order.price.toString()); }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-error font-semibold flex-shrink-0">¥{order.price.toFixed(2)}</span>
                        <span className="text-foreground-muted truncate text-[10px]">({order.companyName})</span>
                      </div>
                      <span className="flex-shrink-0 ml-2">{order.quantity.toFixed(0)}</span>
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
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-success/10 cursor-pointer"
                      onClick={() => { setTradeType('sell'); setTradePrice(order.price.toString()); }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-success font-semibold flex-shrink-0">¥{order.price.toFixed(2)}</span>
                        <span className="text-foreground-muted truncate text-[10px]">({order.companyName})</span>
                      </div>
                      <span className="flex-shrink-0 ml-2">{order.quantity.toFixed(0)}</span>
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
