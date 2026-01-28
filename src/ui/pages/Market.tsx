/**
 * 市场页面
 * 商品交易、价格走势、订单管理
 * 使用新设计系统组件重构
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
}

const MemoizedPriceChart = React.memo<MemoizedPriceChartProps>(({
  world,
  selectedGoodsId,
  selectedGoods,
  tick,
  historyIndex,
  tradesCount,
}) => {
  const priceHistoryData = useMemo(() => {
    if (!world) return [];
    
    const data: PriceDataPoint[] = [];
    const historyLength = Math.min(HISTORY_SIZE, 200);
    
    const volumeByTick = new Map<number, number>();
    const tradeSearchLimit = Math.min(world.trades.count, 500);
    
    for (let t = 0; t < tradeSearchLimit; t++) {
      const tradeIdx = (world.trades.count - 1 - t) % world.trades.maxTrades;
      if (world.trades.goodsIds[tradeIdx] === selectedGoodsId) {
        const tradeTick = world.trades.ticks[tradeIdx];
        volumeByTick.set(tradeTick, (volumeByTick.get(tradeTick) || 0) + world.trades.quantities[tradeIdx]);
      }
    }
    
    const currentHistoryIndex = historyIndex;
    
    for (let i = 0; i < historyLength; i++) {
      const historyIdx = (currentHistoryIndex - historyLength + i + HISTORY_SIZE) % HISTORY_SIZE;
      const price = world.goods.priceHistory[selectedGoodsId * HISTORY_SIZE + historyIdx];
      
      if (price > 0) {
        const ticksAgo = historyLength - i;
        const tickTime = tick - ticksAgo;
        
        const seed = (selectedGoodsId * 1000 + i) % 1000 / 1000;
        const volatility = price * 0.02;
        const open = price + (seed - 0.5) * volatility;
        const close = price;
        const high = Math.max(open, close) + seed * volatility * 0.5;
        const low = Math.min(open, close) - (1 - seed) * volatility * 0.5;
        
        const volume = volumeByTick.get(tickTime) || 0;
        
        const date = tickToDate(tickTime);
        const timeStr = `${date.month}/${date.day} ${date.hour}:00`;
        
        data.push({ time: timeStr, price, open, high, low, close, volume });
      }
    }
    
    return data;
  }, [world, tick, historyIndex, tradesCount, selectedGoodsId]);
  
  if (!world || priceHistoryData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-[var(--text-muted)]">
        暂无价格数据
      </div>
    );
  }
  
  return (
    <PriceChart
      data={priceHistoryData}
      title="📈 价格走势"
      height={280}
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
            {/* 分类标题 - 增强样式 */}
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] rounded-xl transition-all duration-200 group"
              onClick={() => onToggleCategory(category)}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${categoryConfig.color} shadow-sm ring-2 ring-offset-1 ring-offset-[var(--bg-surface)] ring-${categoryConfig.color.replace('bg-', '')}/30`}></span>
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">{categoryConfig.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium">{goods.length}</span>
                <span className={`text-[var(--text-muted)] text-xs transition-transform duration-200 ${expandedCategories[category] ? 'rotate-0' : '-rotate-90'}`}>▼</span>
              </div>
            </button>
            
            {/* 商品列表 - 增强动画和样式 */}
            {expandedCategories[category] && (
              <div className="mt-1.5 space-y-1 pl-1">
                {goods.map(g => {
                  const hasStock = (playerStockMap.get(g.id) || 0) > 0;
                  const hasOrders = goodsWithOrdersSet.has(g.id);
                  const isSelected = selectedGoodsId === g.id;
                  
                  return (
                    <Tooltip
                      key={g.id}
                      content={
                        <div className="text-xs">
                          <p className="font-semibold text-[var(--text-primary)]">{g.name}</p>
                          <p className="text-[var(--text-muted)] mt-1">库存: {playerStockMap.get(g.id) || 0}</p>
                          {hasOrders && <p className="text-yellow-400 mt-1">有挂单</p>}
                        </div>
                      }
                      side="right"
                      variant="game"
                      delayDuration={300}
                    >
                      <button
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent)]/25 scale-[1.02]'
                            : 'hover:bg-[var(--bg-muted)] text-[var(--text-primary)] hover:translate-x-1'
                        }`}
                        onClick={() => onSelectGoods(g.id)}
                      >
                        <GoodsIcon goodsId={g.id} size={18} autoColor={!isSelected} />
                        {/* 状态指示点 - 增强样式 */}
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          hasStock
                            ? 'bg-green-400 ring-2 ring-green-400/30 animate-pulse'
                            : hasOrders
                              ? 'bg-yellow-400 ring-2 ring-yellow-400/30'
                              : 'bg-gray-500/50'
                        }`}></span>
                        <span className="truncate font-medium">{g.name}</span>
                      </button>
                    </Tooltip>
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

export const Market: React.FC = () => {
  const storeTick = useGameStore((state) => state.tick);
  
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
  } = useGameStore();
  
  const world = getWorld();
  
  const [selectedGoodsId, setSelectedGoodsIdLocal] = useState<number>(ui.selectedGoodsId ?? 14);
  
  useEffect(() => {
    if (ui.selectedGoodsId !== null && ui.selectedGoodsId !== selectedGoodsId) {
      setSelectedGoodsIdLocal(ui.selectedGoodsId);
    }
  }, [ui.selectedGoodsId]);
  
  const setSelectedGoodsId = (goodsId: number) => {
    setSelectedGoodsIdLocal(goodsId);
    setStoreSelectedGoods(goodsId);
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

  // 最近成交
  const getRecentTrades = (goodsId: number) => {
    if (!world) return [];
    
    const trades: { tick: number; time: string; price: number; quantity: number }[] = [];
    const t = world.trades;
    
    const searchLimit = Math.min(t.count, 10000);
    for (let i = t.count - 1; i >= Math.max(0, t.count - searchLimit); i--) {
      const idx = i % t.maxTrades;
      if (t.goodsIds[idx] === goodsId) {
        const tradeTick = t.ticks[idx];
        const date = tickToDate(tradeTick);
        trades.push({
          tick: tradeTick,
          time: `${date.month}月${date.day}日 ${date.hour}:00`,
          price: t.prices[idx],
          quantity: t.quantities[idx],
        });
        if (trades.length >= 10) break;
      }
    }
    
    return trades;
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
  


  // 生产/消费建筑
  const getProducerBuildings = (goodsId: number) => {
    return RECIPES.filter(r => r.outputs.some(o => o.goodsId === goodsId))
      .map(r => ({
        recipe: r,
        building: ALL_BUILDINGS.find(b => b.id === r.buildingTypeId),
        output: r.outputs.find(o => o.goodsId === goodsId),
      }))
      .filter(item => item.building);
  };

  const getConsumerBuildings = (goodsId: number) => {
    return RECIPES.filter(r => r.inputs.some(i => i.goodsId === goodsId))
      .map(r => ({
        recipe: r,
        building: ALL_BUILDINGS.find(b => b.id === r.buildingTypeId),
        input: r.inputs.find(i => i.goodsId === goodsId),
      }))
      .filter(item => item.building);
  };

  const getPlayerBuildingsOfType = useCallback((buildingTypeId: number): PlayerBuildingInfo[] => {
    if (!world) return [];
    const buildings: PlayerBuildingInfo[] = [];
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === 0 && world.buildings.types[i] === buildingTypeId) {
        buildings.push({ buildingIndex: i, typeId: buildingTypeId, level: world.buildings.levels[i] });
      }
    }
    return buildings;
  }, [world]);

  const navigateToBuilding = useCallback((buildingIndex: number) => {
    setSelectedBuilding(buildingIndex);
    setCurrentPage('production');
  }, [setSelectedBuilding, setCurrentPage]);

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
  
  const marketRanking = useMemo(() => {
    const w = getWorld();
    if (!w) return [];
    
    const t = w.trades;
    const rankings: { companyId: number; name: string; quantity: number; share: number }[] = [];
    let totalSales = 0;
    
    for (let companyId = 0; companyId < w.companies.count; companyId++) {
      const statsIdx = companyId * GOODS_COUNT + selectedGoodsId;
      const quantity = t.cumulativeSalesQuantity[statsIdx];
      
      if (quantity > 0) {
        totalSales += quantity;
        rankings.push({
          companyId,
          name: companyId === 0 ? '玩家公司' : w.companies.names[companyId] || `公司#${companyId}`,
          quantity,
          share: 0,
        });
      }
    }
    
    for (const ranking of rankings) {
      ranking.share = totalSales > 0 ? (ranking.quantity / totalSales) * 100 : 0;
    }
    
    rankings.sort((a, b) => b.quantity - a.quantity);
    return rankings.slice(0, 5);
  }, [selectedGoodsId, storeTick, tradesCount]);
  
  const orderBook = useMemo(() => getOrderBook(selectedGoodsId), [selectedGoodsId, ordersActiveCount]);
  const recentTrades = useMemo(() => getRecentTrades(selectedGoodsId), [selectedGoodsId, tradesCount]);
  const playerOrders = useMemo(() => getPlayerOrders(selectedGoodsId), [selectedGoodsId, ordersActiveCount]);
  const producerBuildings = useMemo(() => getProducerBuildings(selectedGoodsId), [selectedGoodsId]);
  const consumerBuildings = useMemo(() => getConsumerBuildings(selectedGoodsId), [selectedGoodsId]);
  
  const substitutes = useMemo(() => findBestSubstitutes(selectedGoodsId, 5), [selectedGoodsId]);
  const complements = useMemo(() => findBestComplements(selectedGoodsId, 5), [selectedGoodsId]);

  // 上下游商品
  const upstreamGoods = useMemo(() => {
    const upstream: { goodsId: number; name: string; amount: number; recipe: string }[] = [];
    const seen = new Set<number>();
    
    for (const recipe of RECIPES) {
      if (recipe.outputs.some(o => o.goodsId === selectedGoodsId)) {
        for (const input of recipe.inputs) {
          if (!seen.has(input.goodsId)) {
            seen.add(input.goodsId);
            const goods = ALL_GOODS.find(g => g.id === input.goodsId);
            if (goods) {
              upstream.push({ goodsId: input.goodsId, name: goods.name, amount: input.amount, recipe: recipe.name });
            }
          }
        }
      }
    }
    return upstream;
  }, [selectedGoodsId]);

  const downstreamGoods = useMemo(() => {
    const downstream: { goodsId: number; name: string; amount: number; recipe: string }[] = [];
    const seen = new Set<number>();
    
    for (const recipe of RECIPES) {
      if (recipe.inputs.some(i => i.goodsId === selectedGoodsId)) {
        for (const output of recipe.outputs) {
          if (!seen.has(output.goodsId)) {
            seen.add(output.goodsId);
            const goods = ALL_GOODS.find(g => g.id === output.goodsId);
            if (goods) {
              downstream.push({ goodsId: output.goodsId, name: goods.name, amount: output.amount, recipe: recipe.name });
            }
          }
        }
      }
    }
    return downstream;
  }, [selectedGoodsId]);

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

  const effectivePrice = tradePrice ? parseFloat(tradePrice) : currentPrice;
  const totalCost = effectivePrice * (parseFloat(tradeQuantity) || 0);

  return (
    <div className="min-h-[calc(100vh-80px)] flex gap-5 p-1">
      {/* ==================== 左侧栏：商品分类树 ==================== */}
      <div className="w-52 flex-shrink-0 flex flex-col bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-elevated)] rounded-2xl overflow-hidden border border-[var(--border-muted)] max-h-[calc(100vh-100px)] shadow-card">
        {/* 分类模式切换 */}
        <div className="p-3 border-b border-[var(--border-muted)] bg-[var(--bg-surface)]/50">
          <Tabs value={classifyMode} onValueChange={(v) => setClassifyMode(v as ClassifyMode)}>
            <TabsList variant="game" size="sm" className="w-full">
              <TabsTrigger value="category" variant="game" className="flex-1 text-xs">按类别</TabsTrigger>
              <TabsTrigger value="industry" variant="game" className="flex-1 text-xs">按产业链</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* 搜索框 */}
        <div className="p-3 border-b border-[var(--border-muted)]">
          <Input
            placeholder="搜索商品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon="🔍"
            size="sm"
            variant="filled"
          />
        </div>
        
        {/* 分类树 - 添加渐变遮罩 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 relative">
          {/* 顶部渐变遮罩 */}
          <div className="sticky top-0 left-0 right-0 h-3 bg-gradient-to-b from-[var(--bg-surface)] to-transparent pointer-events-none z-10 -mt-2 -mx-2 mb-1"></div>
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
          {/* 底部渐变遮罩 */}
          <div className="sticky bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-[var(--bg-elevated)] to-transparent pointer-events-none z-10 -mb-2 -mx-2 mt-1"></div>
        </div>
        
        {/* 图例 - 增强样式 */}
        <div className="p-3 border-t border-[var(--border-muted)] bg-[var(--bg-surface)]/30">
          <div className="flex items-center justify-around">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-green-400/30 animate-pulse"></span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">有库存</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 ring-2 ring-yellow-400/30"></span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">有挂单</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 主内容区：商品详情 ==================== */}
      <div className="flex-1 space-y-5">
        {selectedGoods && (
          <>
            {/* 商品头部 - 增强视觉效果 */}
            <div className="flex items-center gap-5 p-4 bg-gradient-to-r from-[var(--bg-elevated)] via-[var(--bg-surface)] to-transparent rounded-2xl border border-[var(--border-muted)] shadow-card">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 flex items-center justify-center shadow-lg shadow-[var(--accent)]/10 border border-[var(--accent)]/20 group hover:scale-105 transition-transform duration-300">
                <GoodsIcon goodsId={selectedGoodsId} size={40} autoColor />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{selectedGoods.name}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge className={`${CATEGORY_CONFIG[selectedGoods.category].color} shadow-sm`} size="md">
                    {CATEGORY_CONFIG[selectedGoods.category].name}
                  </Badge>
                  <Badge variant="outline" className="border-[var(--border-strong)]">{selectedGoods.unit}</Badge>
                </div>
              </div>
            </div>

            {/* 产业链导航 - 增强视觉效果 */}
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-4">
                {/* 上游原料 */}
                <Card variant="game" padding="md" className="relative overflow-hidden">
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                  <h3 className="text-sm font-semibold mb-3 text-amber-400 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">⬆</span>
                    上一级（原料）
                  </h3>
                  {upstreamGoods.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {upstreamGoods.slice(0, 10).map((item) => (
                        <Tooltip
                          key={item.goodsId}
                          content={
                            <div className="text-xs">
                              <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                              <p className="text-[var(--text-muted)] mt-1">需要 {item.amount} · {item.recipe}</p>
                              <p className="text-amber-400 font-medium mt-1">¥{getCurrentPrice(item.goodsId).toFixed(2)}</p>
                            </div>
                          }
                          side="top"
                          variant="game"
                        >
                          <button
                            className="w-14 h-12 rounded-xl bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-surface)] hover:from-amber-500/20 hover:to-amber-500/10 border border-transparent hover:border-amber-500/40 transition-all duration-300 flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:shadow-amber-500/10 hover:scale-105"
                            onClick={() => setSelectedGoodsId(item.goodsId)}
                          >
                            <GoodsIcon goodsId={item.goodsId} size={20} autoColor />
                            <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{item.name}</span>
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
                      <span className="text-lg">🌱</span>
                      <span>原始资源，无需原料</span>
                    </div>
                  )}
                </Card>

                {/* 下游产品 */}
                <Card variant="game" padding="md" className="relative overflow-hidden">
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                  <h3 className="text-sm font-semibold mb-3 text-green-400 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-xs">⬇</span>
                    下一级（产品）
                  </h3>
                  {downstreamGoods.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {downstreamGoods.slice(0, 10).map((item) => (
                        <Tooltip
                          key={item.goodsId}
                          content={
                            <div className="text-xs">
                              <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                              <p className="text-[var(--text-muted)] mt-1">产出 {item.amount} · {item.recipe}</p>
                              <p className="text-green-400 font-medium mt-1">¥{getCurrentPrice(item.goodsId).toFixed(2)}</p>
                            </div>
                          }
                          side="top"
                          variant="game"
                        >
                          <button
                            className="w-14 h-12 rounded-xl bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-surface)] hover:from-green-500/20 hover:to-green-500/10 border border-transparent hover:border-green-500/40 transition-all duration-300 flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:shadow-green-500/10 hover:scale-105"
                            onClick={() => setSelectedGoodsId(item.goodsId)}
                          >
                            <GoodsIcon goodsId={item.goodsId} size={20} autoColor />
                            <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{item.name}</span>
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
                      <span className="text-lg">🎁</span>
                      <span>终端产品，无下游</span>
                    </div>
                  )}
                </Card>
              </div>
            </TooltipProvider>

            {/* 价格信息 - 增强视觉层次 */}
            <div className="grid grid-cols-4 gap-4">
              <StatWidget
                title="最新成交价"
                value={lastTradePrice !== null ? `¥${lastTradePrice.toFixed(2)}` : '暂无成交'}
                change={lastTradePrice && selectedGoods ? (lastTradePrice / selectedGoods.basePrice - 1) : undefined}
                icon="💰"
                variant="game"
                status={lastTradePrice && selectedGoods && lastTradePrice > selectedGoods.basePrice ? 'success' : lastTradePrice && selectedGoods && lastTradePrice < selectedGoods.basePrice ? 'error' : 'none'}
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
                className="border-dashed border-[var(--border-default)]"
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

            {/* 销售排行榜 - 增强视觉效果 */}
            <Card variant="game" padding="md" className="relative">
              {/* 背景装饰 */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent"></div>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">📊</span>
                  销售排行榜
                </CardTitle>
                <Badge variant="primary" size="sm" glow>
                  总销量 {marketRanking.reduce((sum, r) => sum + r.quantity, 0).toFixed(0)}
                </Badge>
              </div>
              
              {marketRanking.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="min-h-[200px]">
                    <MarketShareChart
                      data={marketRanking.map(r => ({
                        name: r.name,
                        value: r.quantity,
                        color: r.companyId === 0 ? '#3b82f6' : undefined,
                      }))}
                      title=""
                      height={200}
                      showLegend={false}
                    />
                  </div>
                  <div className="space-y-3">
                    {marketRanking.map((r, idx) => (
                      <div key={r.companyId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-muted)]/50 transition-colors">
                        <Badge
                          variant={idx === 0 ? 'gold' : idx === 1 ? 'outline' : idx === 2 ? 'warning' : 'outline'}
                          size="sm"
                          glow={idx === 0}
                          className={idx === 0 ? 'animate-pulse' : ''}
                        >
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm truncate font-medium ${r.companyId === 0 ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                              {r.name}
                            </span>
                            <span className="text-sm font-bold tabular-nums">{r.quantity.toFixed(0)}</span>
                          </div>
                          <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                r.companyId === 0
                                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]'
                                  : 'bg-gradient-to-r from-[var(--success)] to-emerald-400'
                              }`}
                              style={{ width: `${r.share}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-[var(--text-muted)] tabular-nums w-14 text-right font-medium">
                          {r.share.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="text-3xl mb-2 block">📭</span>
                  <p className="text-sm text-[var(--text-muted)]">暂无销售记录</p>
                </div>
              )}
            </Card>

            {/* 价格走势图 - 增强卡片样式 */}
            <Card variant="game" padding="md" className="relative overflow-hidden">
              {/* 顶部装饰线 */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--success)]/30 to-transparent"></div>
              <MemoizedPriceChart
                world={world}
                selectedGoodsId={selectedGoodsId}
                selectedGoods={selectedGoods}
                tick={tick}
                historyIndex={world?.goods.historyIndex ?? 0}
                tradesCount={tradesCount}
              />
            </Card>

            {/* 相关建筑 - 增强视觉效果 */}
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-4">
                {/* 生产建筑 */}
                <Card variant="game" padding="md" className="relative overflow-hidden">
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                  <h3 className="text-sm font-semibold mb-3 text-[var(--success)] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-xs">🏭</span>
                    生产建筑
                  </h3>
                  {producerBuildings.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {producerBuildings.slice(0, 10).map((item, idx) => {
                        const playerBuildings = getPlayerBuildingsOfType(item.building!.id);
                        const hasBuilding = playerBuildings.length > 0;
                        return (
                          <Tooltip
                            key={idx}
                            content={
                              <div className="text-xs">
                                <p className="font-semibold text-[var(--text-primary)]">{item.building?.name}</p>
                                <p className="text-[var(--text-muted)] mt-1">产出 {item.output?.amount}/{item.recipe.ticksRequired}h</p>
                                <p className="text-[var(--text-muted)]">成本 ¥{item.building?.buildCost.toLocaleString()}</p>
                                {hasBuilding && <p className="text-green-400 font-medium mt-1">已拥有 {playerBuildings.length} 座</p>}
                              </div>
                            }
                            side="top"
                            variant="game"
                          >
                            <div
                              className={`relative w-14 h-12 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                                hasBuilding
                                  ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 shadow-md shadow-green-500/10'
                                  : 'bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-surface)] border border-transparent hover:border-[var(--border-strong)]'
                              } hover:scale-110 hover:shadow-lg`}
                              onClick={() => hasBuilding ? navigateToBuilding(playerBuildings[0].buildingIndex) : null}
                            >
                              <BuildingIcon buildingId={item.building!.id} size={20} autoColor />
                              <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{item.building?.name}</span>
                              {/* 拥有数量徽章 */}
                              {hasBuilding && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-[10px] text-white flex items-center justify-center font-bold shadow-md shadow-green-500/30 ring-2 ring-[var(--bg-surface)]">
                                  {playerBuildings.length}
                                </span>
                              )}
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
                      <span className="text-lg">🚫</span>
                      <span>无可生产建筑</span>
                    </div>
                  )}
                </Card>

                {/* 消耗建筑 */}
                <Card variant="game" padding="md" className="relative overflow-hidden">
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                  <h3 className="text-sm font-semibold mb-3 text-[var(--warning)] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-xs">⚡</span>
                    消耗建筑
                  </h3>
                  {consumerBuildings.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {consumerBuildings.slice(0, 10).map((item, idx) => {
                        const playerBuildings = getPlayerBuildingsOfType(item.building!.id);
                        const hasBuilding = playerBuildings.length > 0;
                        return (
                          <Tooltip
                            key={idx}
                            content={
                              <div className="text-xs">
                                <p className="font-semibold text-[var(--text-primary)]">{item.building?.name}</p>
                                <p className="text-[var(--text-muted)] mt-1">消耗 {item.input?.amount}/{item.recipe.ticksRequired}h</p>
                                <p className="text-[var(--text-muted)]">成本 ¥{item.building?.buildCost.toLocaleString()}</p>
                                {hasBuilding && <p className="text-orange-400 font-medium mt-1">已拥有 {playerBuildings.length} 座</p>}
                              </div>
                            }
                            side="top"
                            variant="game"
                          >
                            <div
                              className={`relative w-14 h-12 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                                hasBuilding
                                  ? 'bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-2 border-orange-500/40 shadow-md shadow-orange-500/10'
                                  : 'bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-surface)] border border-transparent hover:border-[var(--border-strong)]'
                              } hover:scale-110 hover:shadow-lg`}
                              onClick={() => hasBuilding ? navigateToBuilding(playerBuildings[0].buildingIndex) : null}
                            >
                              <BuildingIcon buildingId={item.building!.id} size={20} autoColor />
                              <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{item.building?.name}</span>
                              {/* 拥有数量徽章 */}
                              {hasBuilding && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[10px] text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/30 ring-2 ring-[var(--bg-surface)]">
                                  {playerBuildings.length}
                                </span>
                              )}
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
                      <span className="text-lg">🚫</span>
                      <span>无消耗建筑</span>
                    </div>
                  )}
                </Card>
              </div>
            </TooltipProvider>
          </>
        )}
      </div>

      {/* ==================== 右侧栏：交易面板 ==================== */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 h-[calc(100vh-100px)]">
        {/* 市场挂单 - 固定高度，内容可滚动 */}
        <Card variant="game" padding="md" className="relative flex-1 min-h-0 flex flex-col">
          {/* 顶部装饰线 */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent"></div>
          
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">📋</span>
              市场挂单
            </CardTitle>
          </div>
          
          {/* 订单内容区域 - 可滚动 */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-3">
            {/* 卖方报价 - 红色主题 */}
            <div className="p-2.5 rounded-xl bg-[var(--error)]/5 border border-[var(--error)]/20">
              <p className="text-xs text-[var(--error)] mb-2 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)] animate-pulse"></span>
                卖方报价 (点击买入)
              </p>
              {orderBook.sellOrders.length > 0 ? (
                <div className="space-y-1">
                  {orderBook.sellOrders.map((order, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs p-1.5 rounded-lg hover:bg-[var(--error)]/10 cursor-pointer tabular-nums transition-colors border border-transparent hover:border-[var(--error)]/30"
                      onClick={() => { setTradeType('buy'); setTradePrice(order.price.toString()); }}
                    >
                      <span className="text-[var(--error)] font-semibold w-16">¥{order.price.toFixed(2)}</span>
                      <span className="w-12 text-right font-medium">{order.quantity.toFixed(0)}</span>
                      <span className="text-[var(--text-muted)] truncate w-20 text-right text-[10px]">{order.companyName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  <span className="text-sm">📭</span>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">暂无卖单</p>
                </div>
              )}
            </div>
            
            {/* 买方报价 - 绿色主题 */}
            <div className="p-2.5 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
              <p className="text-xs text-[var(--success)] mb-2 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>
                买方报价 (点击卖出)
              </p>
              {orderBook.buyOrders.length > 0 ? (
                <div className="space-y-1">
                  {orderBook.buyOrders.map((order, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs p-1.5 rounded-lg hover:bg-[var(--success)]/10 cursor-pointer tabular-nums transition-colors border border-transparent hover:border-[var(--success)]/30"
                      onClick={() => { setTradeType('sell'); setTradePrice(order.price.toString()); }}
                    >
                      <span className="text-[var(--success)] font-semibold w-16">¥{order.price.toFixed(2)}</span>
                      <span className="w-12 text-right font-medium">{order.quantity.toFixed(0)}</span>
                      <span className="text-[var(--text-muted)] truncate w-20 text-right text-[10px]">{order.companyName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  <span className="text-sm">📭</span>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">暂无买单</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 成交记录 - 固定高度，内容可滚动 */}
        <Card variant="game" padding="md" className="relative h-40 flex flex-col">
          {/* 顶部装饰线 */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--info)]/50 to-transparent"></div>
          
          <CardTitle className="text-sm mb-2 flex items-center gap-2 flex-shrink-0">
            <span className="w-5 h-5 rounded-lg bg-[var(--info)]/20 flex items-center justify-center text-xs">📝</span>
            成交记录
          </CardTitle>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            {recentTrades.length > 0 ? (
              <div className="space-y-1">
                {recentTrades.map((trade, idx) => (
                  <div key={idx} className="flex justify-between text-xs p-1.5 rounded-lg hover:bg-[var(--bg-muted)]/50 tabular-nums transition-colors">
                    <span className="text-[var(--text-muted)] w-20 text-[10px]">{trade.time}</span>
                    <span className="w-10 text-right font-medium">{trade.quantity.toFixed(0)}</span>
                    <span className="font-bold w-14 text-right text-[var(--text-primary)]">¥{trade.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <span className="text-xl">📭</span>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">暂无成交记录</p>
              </div>
            )}
          </div>
        </Card>

        {/* 自定义下单 - 固定高度 */}
        <Card variant="glow" padding="md" className="relative flex-shrink-0 border-[var(--accent)]/30">
          {/* 顶部装饰线 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-hover)] to-[var(--accent)]"></div>
          
          <CardTitle className="text-sm mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">🛒</span>
            自定义下单
          </CardTitle>
          
          {/* 买卖切换 - 更明显的视觉区分 */}
          <div className="flex gap-2 mb-4 p-1 bg-[var(--bg-muted)] rounded-xl">
            <Button
              variant={tradeType === 'buy' ? 'success' : 'ghost'}
              size="sm"
              className={`flex-1 ${tradeType === 'buy' ? 'shadow-md shadow-[var(--success)]/30' : ''}`}
              onClick={() => setTradeType('buy')}
            >
              <span className="mr-1">📈</span> 买入
            </Button>
            <Button
              variant={tradeType === 'sell' ? 'danger' : 'ghost'}
              size="sm"
              className={`flex-1 ${tradeType === 'sell' ? 'shadow-md shadow-[var(--error)]/30' : ''}`}
              onClick={() => setTradeType('sell')}
            >
              <span className="mr-1">📉</span> 卖出
            </Button>
          </div>
          
          {/* 数量输入 */}
          <Input
            label="数量"
            type="number"
            value={tradeQuantity}
            onChange={(e) => setTradeQuantity(e.target.value)}
            size="sm"
            variant="filled"
            className="mb-3"
          />
          
          {/* 单价输入 */}
          <Input
            label="单价 (选填)"
            type="number"
            placeholder={`¥${currentPrice.toFixed(2)}`}
            value={tradePrice}
            onChange={(e) => setTradePrice(e.target.value)}
            size="sm"
            variant="filled"
            className="mb-4"
          />
          
          {/* 总价显示 - 更突出 */}
          <div className={`flex justify-between text-sm mb-4 p-3 rounded-xl border-2 transition-colors ${
            tradeType === 'buy'
              ? 'bg-[var(--success)]/5 border-[var(--success)]/30'
              : 'bg-[var(--error)]/5 border-[var(--error)]/30'
          }`}>
            <span className="text-[var(--text-muted)] font-medium">总价</span>
            <span className={`tabular-nums font-bold text-lg ${
              tradeType === 'buy' ? 'text-[var(--success)]' : 'text-[var(--error)]'
            }`}>
              ¥{totalCost.toFixed(2)}
            </span>
          </div>
          
          {/* 余额 */}
          <div className="text-xs text-[var(--text-muted)] mb-4 tabular-nums flex items-center justify-between p-2 rounded-lg bg-[var(--bg-muted)]/50">
            <span>可用资金</span>
            <span className="font-semibold text-[var(--text-primary)]">¥{playerCash.toLocaleString()}</span>
          </div>
          
          {/* 提交按钮 */}
          <Button
            variant={tradeType === 'buy' ? 'success' : 'danger'}
            className={`w-full font-bold ${
              tradeType === 'buy'
                ? 'shadow-lg shadow-[var(--success)]/30'
                : 'shadow-lg shadow-[var(--error)]/30'
            }`}
            onClick={handleSubmitOrder}
          >
            {tradeType === 'buy' ? '📈 确认买入' : '📉 确认卖出'}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Market;
