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

// 商品分类配置（按类别）
const CATEGORY_CONFIG = {
  raw: { name: '原材料', color: 'bg-amber-500' },
  basic: { name: '基础加工', color: 'bg-blue-500' },
  intermediate: { name: '中间产品', color: 'bg-purple-500' },
  final: { name: '最终产品', color: 'bg-green-500' },
};

// 商品分类配置（按产业链）
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
// 使用 React.memo 避免不必要的重渲染
// 使用 useMemo 缓存昂贵的价格历史数据计算

interface MemoizedPriceChartProps {
  world: GameWorld | null;
  selectedGoodsId: number;
  selectedGoods: GoodsDefinition;
  // 显式传递这些值作为 props，确保 React 能检测到变化
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
  // 使用 useMemo 缓存价格历史数据的计算
  // 依赖项使用显式传递的 props，确保变化能被检测到
  const priceHistoryData = useMemo(() => {
    if (!world) return [];
    
    const data: PriceDataPoint[] = [];
    const historyLength = Math.min(HISTORY_SIZE, 200);
    
    // 预先构建成交量索引，避免嵌套循环
    // 这将 O(200 * 1000) 降低到 O(200 + 1000)
    const volumeByTick = new Map<number, number>();
    const tradeSearchLimit = Math.min(world.trades.count, 500); // 减少搜索范围
    
    for (let t = 0; t < tradeSearchLimit; t++) {
      const tradeIdx = (world.trades.count - 1 - t) % world.trades.maxTrades;
      if (world.trades.goodsIds[tradeIdx] === selectedGoodsId) {
        const tradeTick = world.trades.ticks[tradeIdx];
        volumeByTick.set(tradeTick, (volumeByTick.get(tradeTick) || 0) + world.trades.quantities[tradeIdx]);
      }
    }
    
    // 使用显式传递的 historyIndex 来确保数据更新
    const currentHistoryIndex = historyIndex;
    
    for (let i = 0; i < historyLength; i++) {
      const historyIdx = (currentHistoryIndex - historyLength + i + HISTORY_SIZE) % HISTORY_SIZE;
      const price = world.goods.priceHistory[selectedGoodsId * HISTORY_SIZE + historyIdx];
      
      if (price > 0) {
        // 计算对应的tick时间，使用显式传递的 tick
        const ticksAgo = historyLength - i;
        const tickTime = tick - ticksAgo;
        
        // 使用确定性的K线数据生成（避免每次渲染结果不同）
        // 基于价格和索引生成伪随机但一致的值
        const seed = (selectedGoodsId * 1000 + i) % 1000 / 1000;
        const volatility = price * 0.02;
        const open = price + (seed - 0.5) * volatility;
        const close = price;
        const high = Math.max(open, close) + seed * volatility * 0.5;
        const low = Math.min(open, close) - (1 - seed) * volatility * 0.5;
        
        // 使用预计算的成交量
        const volume = volumeByTick.get(tickTime) || 0;
        
        // 将tick转换为时间格式
        const date = tickToDate(tickTime);
        const timeStr = `${date.month}/${date.day} ${date.hour}:00`;
        
        data.push({
          time: timeStr,
          price,
          open,
          high,
          low,
          close,
          volume,
        });
      }
    }
    
    return data;
  }, [world, tick, historyIndex, tradesCount, selectedGoodsId]);
  
  if (!world || priceHistoryData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-text-tertiary">
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
// 注意：移除了过于严格的自定义比较函数
// useMemo 内部已经通过依赖项控制了重新计算的时机
// React.memo 的默认浅比较足够处理基本情况

MemoizedPriceChart.displayName = 'MemoizedPriceChart';

// ==================== 优化的商品分类树组件 ====================
// 预计算库存和订单状态，避免每个商品项都遍历数据

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
    <>
      {Object.entries(config).map(([category, categoryConfig]) => {
        const goods = filteredGoods[category] || [];
        if (goods.length === 0) return null;
        
        return (
          <div key={category} className="mb-2">
            {/* 分类标题 */}
            <button
              className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-text-secondary hover:bg-background rounded-lg"
              onClick={() => onToggleCategory(category)}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${categoryConfig.color}`}></span>
                <span>{categoryConfig.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary">({goods.length})</span>
                <span className="text-text-tertiary">{expandedCategories[category] ? '▼' : '▶'}</span>
              </div>
            </button>
            
            {/* 商品列表 */}
            {expandedCategories[category] && (
              <div className="mt-1 space-y-0.5">
                {goods.map(g => {
                  const hasStock = (playerStockMap.get(g.id) || 0) > 0;
                  const hasOrders = goodsWithOrdersSet.has(g.id);
                  
                  return (
                    <button
                      key={g.id}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedGoodsId === g.id
                          ? 'bg-accent text-white'
                          : 'hover:bg-background text-text-primary'
                      }`}
                      onClick={() => onSelectGoods(g.id)}
                    >
                      <GoodsIcon goodsId={g.id} size={16} autoColor={selectedGoodsId !== g.id} />
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        hasStock ? 'bg-green-400' : hasOrders ? 'bg-yellow-400' : 'bg-gray-500'
                      }`}></span>
                      <span className="truncate">{g.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});

GoodsCategoryTree.displayName = 'GoodsCategoryTree';

export const Market: React.FC = () => {
  // 使用选择器订阅 tick 状态，确保每次 tick 变化时组件都会重新渲染
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
  } = useGameStore();
  
  const world = getWorld();
  
  // 使用 store 中的 selectedGoodsId，如果有值则使用，否则默认为14（钢材）
  const [selectedGoodsId, setSelectedGoodsIdLocal] = useState<number>(ui.selectedGoodsId ?? 14);
  
  // 当 store 中的 selectedGoodsId 变化时，同步到本地状态
  useEffect(() => {
    if (ui.selectedGoodsId !== null && ui.selectedGoodsId !== selectedGoodsId) {
      setSelectedGoodsIdLocal(ui.selectedGoodsId);
    }
  }, [ui.selectedGoodsId]);
  
  // 统一的设置选中商品的方法
  const setSelectedGoodsId = (goodsId: number) => {
    setSelectedGoodsIdLocal(goodsId);
    setStoreSelectedGoods(goodsId);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [classifyMode, setClassifyMode] = useState<ClassifyMode>('category');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    raw: true,
    basic: true,
    intermediate: false,
    final: false,
    // 产业链分类默认展开状态
    core: true,
    agriculture: false,
    pharma: false,
    military: false,
    luxury: false,
    tech: false,
    dailyChemical: false,
    transport: false,
    miningExtended: false,
    textileExtended: false,
    buildingExtended: false,
    agriDeepProcess: false,
    energyExtended: false,
    telecom: false,
    service: false,
    cultural: false,
    misc: false,
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

  // 获取商品当前市场均衡价格（系统计算价格）
  const getCurrentPrice = (goodsId: number) => {
    return world?.goods.prices[goodsId] || ALL_GOODS.find(g => g.id === goodsId)?.basePrice || 0;
  };

  // 获取真实最后成交价（从成交记录中获取）
  const getLastTradePrice = (goodsId: number): number | null => {
    if (!world) return null;
    const t = world.trades;
    
    // 从最新往回找该商品的成交记录
    for (let i = t.count - 1; i >= Math.max(0, t.count - 1000); i--) {
      const idx = i % t.maxTrades;
      if (t.goodsIds[idx] === goodsId) {
        return t.prices[idx];
      }
    }
    return null;  // 无成交记录
  };

  // 检查该商品是否有成交记录
  const hasTradeHistory = (goodsId: number): boolean => {
    return getLastTradePrice(goodsId) !== null;
  };

  // 获取玩家库存
  const getPlayerStock = (goodsId: number) => {
    if (!world) return 0;
    return world.companies.inventories[0 * GOODS_COUNT + goodsId] || 0;
  };

  // 获取公司市场份额排行（基于累计卖出数量，不会被清空）
  const getMarketShareRanking = (goodsId: number) => {
    if (!world) return [];
    
    const t = world.trades;
    
    // 使用累计销售统计（不会被清空）
    // 注意：必须使用 GOODS_COUNT 常量（256），与 MatchingEngine.ts 中写入时一致
    const rankings: { companyId: number; name: string; quantity: number; share: number }[] = [];
    let totalSales = 0;
    
    // 遍历所有公司，获取该商品的累计销售量
    for (let companyId = 0; companyId < world.companies.count; companyId++) {
      const statsIdx = companyId * GOODS_COUNT + goodsId;
      const quantity = t.cumulativeSalesQuantity[statsIdx];
      
      if (quantity > 0) {
        totalSales += quantity;
        rankings.push({
          companyId,
          name: companyId === 0 ? '玩家公司' : world.companies.names[companyId] || `公司#${companyId}`,
          quantity,
          share: 0, // 稍后计算
        });
      }
    }
    
    // 计算市场份额
    for (const ranking of rankings) {
      ranking.share = totalSales > 0 ? (ranking.quantity / totalSales) * 100 : 0;
    }
    
    // 按卖出数量排序
    rankings.sort((a, b) => b.quantity - a.quantity);
    
    return rankings.slice(0, 5); // 只显示前5名
  };

  // 获取订单簿
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
        
        if (world.orders.types[i] === 0) {
          buyOrders.push(order);
        } else {
          sellOrders.push(order);
        }
      }
    }
    
    buyOrders.sort((a, b) => b.price - a.price);
    sellOrders.sort((a, b) => a.price - b.price);
    
    return { buyOrders: buyOrders.slice(0, 5), sellOrders: sellOrders.slice(0, 5) };
  };

  // 获取最近成交记录
  // 修复：增加搜索范围从50到10000，确保能找到特定商品的成交记录
  const getRecentTrades = (goodsId: number) => {
    if (!world) return [];
    
    const trades: { tick: number; time: string; price: number; quantity: number }[] = [];
    const t = world.trades;
    
    // 搜索最近10000条交易记录，以确保能找到特定商品的成交
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
        if (trades.length >= 10) break;  // 增加显示数量到10条
      }
    }
    
    return trades;
  };

  // 获取当前选中商品的玩家挂单
  const getPlayerOrders = (goodsId: number) => {
    if (!world) return [];
    
    const orders: { index: number; type: 'buy' | 'sell'; price: number; quantity: number; goodsId: number }[] = [];
    
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i] &&
          world.orders.companyIds[i] === 0 &&
          world.orders.goodsIds[i] === goodsId) {
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
  
  // 获取所有玩家挂单（用于显示全部挂单）
  const getAllPlayerOrders = () => {
    if (!world) return [];
    
    const orders: { index: number; type: 'buy' | 'sell'; price: number; quantity: number; goodsId: number; goodsName: string }[] = [];
    
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i] && world.orders.companyIds[i] === 0) {
        const gId = world.orders.goodsIds[i];
        const goods = ALL_GOODS.find(g => g.id === gId);
        orders.push({
          index: i,
          type: world.orders.types[i] === 0 ? 'buy' : 'sell',
          price: world.orders.prices[i],
          quantity: world.orders.remainings[i],
          goodsId: gId,
          goodsName: goods?.name || `商品#${gId}`,
        });
      }
    }
    
    return orders;
  };

  // 获取能生产该商品的建筑
  const getProducerBuildings = (goodsId: number) => {
    return RECIPES.filter(r => r.outputs.some(o => o.goodsId === goodsId))
      .map(r => {
        const building = ALL_BUILDINGS.find(b => b.id === r.buildingTypeId);
        return {
          recipe: r,
          building,
          output: r.outputs.find(o => o.goodsId === goodsId),
        };
      })
      .filter(item => item.building);
  };

  // 获取消耗该商品的建筑
  const getConsumerBuildings = (goodsId: number) => {
    return RECIPES.filter(r => r.inputs.some(i => i.goodsId === goodsId))
      .map(r => {
        const building = ALL_BUILDINGS.find(b => b.id === r.buildingTypeId);
        return {
          recipe: r,
          building,
          input: r.inputs.find(i => i.goodsId === goodsId),
        };
      })
      .filter(item => item.building);
  };

  // 提交订单
  const handleSubmitOrder = () => {
    const price = parseFloat(tradePrice) || getCurrentPrice(selectedGoodsId);
    const quantity = parseFloat(tradeQuantity);
    
    // 验证输入
    if (isNaN(quantity) || quantity <= 0) {
      return;
    }
    
    if (isNaN(price) || price <= 0) {
      return;
    }
    
    let success = false;
    if (tradeType === 'buy') {
      success = placeBuyOrder(selectedGoodsId, quantity, price);
    } else {
      success = placeSellOrder(selectedGoodsId, quantity, price);
    }
    
    if (success) {
      setTradeQuantity('10');
      setTradePrice('');
    }
  };

  // 切换分类展开状态
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // 使用 useMemo 缓存昂贵的计算结果，避免每次渲染都重新计算
  // 注意：由于 world 是外部引用，需要使用 storeTick 来触发重新读取
  // 每次 storeTick 变化时，重新从 world 读取最新数据
  const currentWorld = getWorld();
  const tick = currentWorld?.tick ?? 0;
  const tradesCount = currentWorld?.trades.count ?? 0;
  const ordersActiveCount = currentWorld?.orders.activeCount ?? 0;
  
  const currentPrice = useMemo(() => {
    return getCurrentPrice(selectedGoodsId);
  }, [selectedGoodsId, tick]);
  
  const lastTradePrice = useMemo(() => {
    return getLastTradePrice(selectedGoodsId);
  }, [selectedGoodsId, tradesCount]);
  
  const playerStock = useMemo(() => {
    return getPlayerStock(selectedGoodsId);
  }, [selectedGoodsId, tick]);
  
  // 销售排行榜数据
  // 依赖项：selectedGoodsId（商品切换）、storeTick（每tick更新触发重新计算）
  // 由于 world 是外部引用（不在 React 状态中），需要在 useMemo 内部重新获取
  const marketRanking = useMemo(() => {
    // 重新获取 world 以确保读取最新数据
    const w = getWorld();
    if (!w) return [];
    
    const t = w.trades;
    
    // 使用累计销售统计（不会被清空）
    const rankings: { companyId: number; name: string; quantity: number; share: number }[] = [];
    let totalSales = 0;
    
    // 遍历所有公司，获取该商品的累计销售量
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
    
    // 计算市场份额
    for (const ranking of rankings) {
      ranking.share = totalSales > 0 ? (ranking.quantity / totalSales) * 100 : 0;
    }
    
    // 按卖出数量排序
    rankings.sort((a, b) => b.quantity - a.quantity);
    
    return rankings.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGoodsId, storeTick, tradesCount]);
  
  const orderBook = useMemo(() => {
    return getOrderBook(selectedGoodsId);
  }, [selectedGoodsId, ordersActiveCount]);
  
  const recentTrades = useMemo(() => {
    return getRecentTrades(selectedGoodsId);
  }, [selectedGoodsId, tradesCount]);
  
  const playerOrders = useMemo(() => {
    return getPlayerOrders(selectedGoodsId);
  }, [selectedGoodsId, ordersActiveCount]);
  
  const allPlayerOrders = useMemo(() => {
    return getAllPlayerOrders();
  }, [ordersActiveCount]);
  
  const producerBuildings = useMemo(() => {
    return getProducerBuildings(selectedGoodsId);
  }, [selectedGoodsId]);
  
  const consumerBuildings = useMemo(() => {
    return getConsumerBuildings(selectedGoodsId);
  }, [selectedGoodsId]);
  
  // 获取替代品和互补品信息
  const substitutes = useMemo(() => findBestSubstitutes(selectedGoodsId, 5), [selectedGoodsId]);
  const complements = useMemo(() => findBestComplements(selectedGoodsId, 5), [selectedGoodsId]);

  // 获取上一级商品（生产当前商品需要的原料）
  const upstreamGoods = useMemo(() => {
    const upstream: { goodsId: number; name: string; amount: number; recipe: string }[] = [];
    const seen = new Set<number>();
    
    // 找到生产当前商品的所有配方
    for (const recipe of RECIPES) {
      if (recipe.outputs.some(o => o.goodsId === selectedGoodsId)) {
        // 获取该配方的所有输入材料
        for (const input of recipe.inputs) {
          if (!seen.has(input.goodsId)) {
            seen.add(input.goodsId);
            const goods = ALL_GOODS.find(g => g.id === input.goodsId);
            if (goods) {
              upstream.push({
                goodsId: input.goodsId,
                name: goods.name,
                amount: input.amount,
                recipe: recipe.name,
              });
            }
          }
        }
      }
    }
    
    return upstream;
  }, [selectedGoodsId]);

  // 获取下一级商品（使用当前商品生产的产品）
  const downstreamGoods = useMemo(() => {
    const downstream: { goodsId: number; name: string; amount: number; recipe: string }[] = [];
    const seen = new Set<number>();
    
    // 找到消耗当前商品的所有配方
    for (const recipe of RECIPES) {
      if (recipe.inputs.some(i => i.goodsId === selectedGoodsId)) {
        // 获取该配方的所有输出产品
        for (const output of recipe.outputs) {
          if (!seen.has(output.goodsId)) {
            seen.add(output.goodsId);
            const goods = ALL_GOODS.find(g => g.id === output.goodsId);
            if (goods) {
              downstream.push({
                goodsId: output.goodsId,
                name: goods.name,
                amount: output.amount,
                recipe: recipe.name,
              });
            }
          }
        }
      }
    }
    
    return downstream;
  }, [selectedGoodsId]);

  // 预计算玩家库存映射，避免在商品列表中每个商品都调用 getPlayerStock
  const playerStockMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!world) return map;
    
    for (let i = 0; i < GOODS_COUNT; i++) {
      const stock = world.companies.inventories[0 * GOODS_COUNT + i];
      if (stock > 0) {
        map.set(i, stock);
      }
    }
    return map;
  }, [tick]);
  
  // 预计算有订单的商品集合，避免每个商品都遍历订单
  const goodsWithOrdersSet = useMemo(() => {
    const set = new Set<number>();
    if (!world) return set;
    
    for (let i = 0; i < world.orders.maxOrders; i++) {
      if (world.orders.isActive[i]) {
        set.add(world.orders.goodsIds[i]);
      }
    }
    return set;
  }, [ordersActiveCount]);

  // 设置默认价格
  const effectivePrice = tradePrice ? parseFloat(tradePrice) : currentPrice;
  const totalCost = effectivePrice * (parseFloat(tradeQuantity) || 0);

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4">
      {/* ==================== 左侧栏：商品分类树 ==================== */}
      <div className="w-48 flex-shrink-0 flex flex-col bg-background-secondary rounded-lg overflow-hidden">
        {/* 分类模式切换 */}
        <div className="p-2 border-b border-border">
          <div className="flex gap-1 bg-background rounded-lg p-1">
            <button
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                classifyMode === 'category'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              onClick={() => setClassifyMode('category')}
            >
              按类别
            </button>
            <button
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                classifyMode === 'industry'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              onClick={() => setClassifyMode('industry')}
            >
              按产业链
            </button>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">🔍</span>
            <input
              type="text"
              placeholder="搜索商品..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-background rounded-lg border border-border focus:border-accent focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
        
        {/* 图例 */}
        <div className="p-3 border-t border-border text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span className="text-text-tertiary">有库存</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span className="text-text-tertiary">有挂单</span>
          </div>
        </div>
      </div>

      {/* ==================== 主内容区：商品详情 ==================== */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4">
        {selectedGoods && (
          <>
            {/* 商品头部 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <GoodsIcon goodsId={selectedGoodsId} size={32} autoColor />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{selectedGoods.name}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    CATEGORY_CONFIG[selectedGoods.category].color
                  } text-white`}>
                    {CATEGORY_CONFIG[selectedGoods.category].name}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded bg-gray-600 text-gray-200">
                    {selectedGoods.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* 产业链导航：上一级（原料）和下一级（产品）*/}
            <div className="grid grid-cols-2 gap-4">
              {/* 上一级商品（原料） */}
              <div className="card p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">⬆</span>
                  上一级（原料）
                  <span className="text-xs text-text-tertiary font-normal">生产所需</span>
                </h3>
                
                {upstreamGoods.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {upstreamGoods.map((item) => {
                      const price = getCurrentPrice(item.goodsId);
                      const goods = ALL_GOODS.find(g => g.id === item.goodsId);
                      return (
                        <button
                          key={item.goodsId}
                          className="w-full flex items-center gap-3 p-2 rounded-lg bg-background-secondary hover:bg-amber-500/10 transition-colors text-left"
                          onClick={() => setSelectedGoodsId(item.goodsId)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <GoodsIcon goodsId={item.goodsId} size={20} autoColor />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-text-tertiary">
                              需要 {item.amount} · {item.recipe}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-accent tabular-nums">¥{price.toFixed(2)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-text-tertiary">
                    <p className="text-2xl mb-1">🌱</p>
                    <p className="text-sm">这是原始资源</p>
                    <p className="text-xs">无需其他原料生产</p>
                  </div>
                )}
              </div>

              {/* 下一级商品（产品） */}
              <div className="card p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-sm">⬇</span>
                  下一级（产品）
                  <span className="text-xs text-text-tertiary font-normal">可生产</span>
                </h3>
                
                {downstreamGoods.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {downstreamGoods.map((item) => {
                      const price = getCurrentPrice(item.goodsId);
                      const goods = ALL_GOODS.find(g => g.id === item.goodsId);
                      return (
                        <button
                          key={item.goodsId}
                          className="w-full flex items-center gap-3 p-2 rounded-lg bg-background-secondary hover:bg-green-500/10 transition-colors text-left"
                          onClick={() => setSelectedGoodsId(item.goodsId)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <GoodsIcon goodsId={item.goodsId} size={20} autoColor />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-text-tertiary">
                              产出 {item.amount} · {item.recipe}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-accent tabular-nums">¥{price.toFixed(2)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-text-tertiary">
                    <p className="text-2xl mb-1">🎁</p>
                    <p className="text-sm">这是终端产品</p>
                    <p className="text-xs">直接用于消费</p>
                  </div>
                )}
              </div>
            </div>

            {/* 价格信息卡片 */}
            <div className="grid grid-cols-4 gap-4">
              {/* 最新成交价 - 显示真实成交价格 */}
              <div className="card p-4">
                <p className="text-sm text-text-tertiary mb-1">最新成交价</p>
                {lastTradePrice !== null ? (
                  <>
                    <p className="text-2xl font-bold text-accent tabular-nums">¥{lastTradePrice.toFixed(2)}</p>
                    <p className={`text-xs mt-1 tabular-nums ${lastTradePrice >= selectedGoods.basePrice ? 'text-chart-up' : 'text-chart-down'}`}>
                      {lastTradePrice >= selectedGoods.basePrice ? '▲' : '▼'} {((lastTradePrice / selectedGoods.basePrice - 1) * 100).toFixed(1)}%
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl text-text-tertiary">暂无成交</p>
                    <p className="text-xs text-text-tertiary mt-1">该商品尚未有交易记录</p>
                  </>
                )}
              </div>
              {/* 市场均衡价 - 系统计算的理论价格 */}
              <div className="card p-4">
                <p className="text-sm text-text-tertiary mb-1">市场均衡价</p>
                <p className="text-2xl font-bold text-blue-400 tabular-nums">¥{currentPrice.toFixed(2)}</p>
                <p className={`text-xs mt-1 tabular-nums ${currentPrice >= selectedGoods.basePrice ? 'text-chart-up' : 'text-chart-down'}`}>
                  {currentPrice >= selectedGoods.basePrice ? '▲' : '▼'} {((currentPrice / selectedGoods.basePrice - 1) * 100).toFixed(1)}%
                </p>
              </div>
              {/* 参考价格 */}
              <div className="card p-4">
                <p className="text-sm text-text-tertiary mb-1">参考价格</p>
                <p className="text-2xl font-bold text-yellow-400 tabular-nums">¥{selectedGoods.basePrice.toFixed(2)}</p>
                <p className="text-xs text-text-tertiary mt-1">基准定价</p>
              </div>
              {/* 我的库存 */}
              <div className="card p-4">
                <p className="text-sm text-text-tertiary mb-1">我的库存</p>
                <p className="text-2xl font-bold tabular-nums">{playerStock.toFixed(0)}</p>
                <p className="text-xs text-text-tertiary mt-1 tabular-nums">价值 ¥{(playerStock * (lastTradePrice || currentPrice)).toFixed(0)}</p>
              </div>
            </div>

            {/* 市场份额排行榜 */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  📊 销售排行榜
                  <span className="text-xs text-text-tertiary font-normal">按卖出数量</span>
                </h3>
                <span className="text-xs text-text-tertiary tabular-nums">
                  总销量 {marketRanking.reduce((sum, r) => sum + r.quantity, 0).toFixed(0)}
                </span>
              </div>
              
              {marketRanking.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 饼图 */}
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
                  
                  {/* 排行列表 */}
                  <div className="space-y-2">
                    {marketRanking.map((r, idx) => (
                      <div key={r.companyId} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-black' :
                          idx === 1 ? 'bg-gray-400 text-black' :
                          idx === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm truncate max-w-[100px] ${r.companyId === 0 ? 'text-accent font-medium' : ''}`}>
                              {r.name}
                            </span>
                            <span className="text-sm font-medium tabular-nums w-16 text-right">{r.quantity.toFixed(0)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${r.companyId === 0 ? 'bg-accent' : 'bg-chart-up'}`}
                              style={{ width: `${r.share}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm text-text-tertiary tabular-nums w-16 text-right">
                          {r.share.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-tertiary text-center py-4">暂无销售记录</p>
              )}
            </div>

            {/* 价格走势图 - 使用增强版PriceChart组件 */}
            <div className="card p-4">
              <MemoizedPriceChart
                world={world}
                selectedGoodsId={selectedGoodsId}
                selectedGoods={selectedGoods}
                tick={tick}
                historyIndex={world?.goods.historyIndex ?? 0}
                tradesCount={tradesCount}
              />
            </div>

            {/* 生产建筑 */}
            <div className="card p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                🏭 生产建筑
                <span className="text-xs text-text-tertiary">可以生产该商品的建筑</span>
              </h3>
              
              {producerBuildings.length > 0 ? (
                <div className="space-y-2">
                  {producerBuildings.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <BuildingIcon buildingId={item.building!.id} size={24} autoColor />
                        </div>
                        <div>
                          <p className="font-medium">{item.building?.name}</p>
                          <p className="text-xs text-text-tertiary">
                            产出 {item.output?.amount}/{item.recipe.ticksRequired}周期 · {item.recipe.name}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            建造成本: ¥{item.building?.buildCost.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90">
                        建造
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary text-center py-4">没有建筑可以生产此商品</p>
              )}
            </div>

            {/* 消耗建筑 */}
            <div className="card p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                ⚡ 消耗建筑
                <span className="text-xs text-text-tertiary">需要消耗该商品的建筑</span>
              </h3>
              
              {consumerBuildings.length > 0 ? (
                <div className="space-y-2">
                  {consumerBuildings.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <BuildingIcon buildingId={item.building!.id} size={24} autoColor />
                        </div>
                        <div>
                          <p className="font-medium">{item.building?.name}</p>
                          <p className="text-xs text-text-tertiary">
                            消耗 {item.input?.amount}/{item.recipe.ticksRequired}周期 · {item.recipe.name}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            建造成本: ¥{item.building?.buildCost.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90">
                        建造
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary text-center py-4">没有建筑消耗此商品</p>
              )}
            </div>

            {/* 替代品与互补品 */}
            {(substitutes.length > 0 || complements.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 替代品 */}
                {substitutes.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      🔄 替代品
                      <span className="text-xs text-text-tertiary">价格上涨时需求可能转向这些商品</span>
                    </h3>
                    <div className="space-y-2">
                      {substitutes.map((sub) => {
                        const subPrice = getCurrentPrice(sub.goodsId);
                        const currentGoodsPrice = getCurrentPrice(selectedGoodsId);
                        const priceRatio = subPrice / currentGoodsPrice;
                        
                        return (
                          <div
                            key={sub.goodsId}
                            className="flex items-center justify-between p-3 rounded-lg bg-background-secondary hover:bg-background cursor-pointer"
                            onClick={() => setSelectedGoodsId(sub.goodsId)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <GoodsIcon goodsId={sub.goodsId} size={18} autoColor />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{sub.name}</p>
                                <p className="text-xs text-text-tertiary">
                                  相似度 {(sub.similarity * 100).toFixed(0)}% ·
                                  弹性 {sub.elasticity.toFixed(1)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">¥{subPrice.toFixed(2)}</p>
                              <p className={`text-xs ${priceRatio < 1 ? 'text-green-400' : priceRatio > 1 ? 'text-red-400' : 'text-slate-400'}`}>
                                {priceRatio < 1 ? '更便宜' : priceRatio > 1 ? '更贵' : '同价'}
                                ({((priceRatio - 1) * 100).toFixed(0)}%)
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-text-tertiary mt-3">
                      💡 当本商品涨价时，消费者可能转向购买这些替代品
                    </p>
                  </div>
                )}

                {/* 互补品 */}
                {complements.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      🔗 互补品
                      <span className="text-xs text-text-tertiary">通常一起使用或购买的商品</span>
                    </h3>
                    <div className="space-y-2">
                      {complements.map((comp) => {
                        const compPrice = getCurrentPrice(comp.goodsId);
                        const compStock = getPlayerStock(comp.goodsId);
                        
                        return (
                          <div
                            key={comp.goodsId}
                            className="flex items-center justify-between p-3 rounded-lg bg-background-secondary hover:bg-background cursor-pointer"
                            onClick={() => setSelectedGoodsId(comp.goodsId)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <GoodsIcon goodsId={comp.goodsId} size={18} autoColor />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{comp.name}</p>
                                <p className="text-xs text-text-tertiary">
                                  互补弹性 {comp.elasticity.toFixed(1)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">¥{compPrice.toFixed(2)}</p>
                              <p className="text-xs text-text-tertiary">
                                库存 {compStock.toFixed(0)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-text-tertiary mt-3">
                      ⚠️ 互补品价格上涨会降低本商品需求
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================== 右侧栏：交易面板 ==================== */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
        {/* 市场挂单 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">📋 市场挂单</h3>
            <a href="#" className="text-xs text-accent">点击接受报价</a>
          </div>
          
          {/* 卖方报价 */}
          <div className="mb-3">
            <p className="text-xs text-chart-down mb-2">卖方报价 (点击买入)</p>
            {orderBook.sellOrders.length > 0 ? (
              <div className="space-y-1">
                {orderBook.sellOrders.map((order, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-xs p-1.5 rounded hover:bg-chart-down/10 cursor-pointer tabular-nums"
                    onClick={() => {
                      setTradeType('buy');
                      setTradePrice(order.price.toString());
                    }}
                  >
                    <span className="text-chart-down w-16">¥{order.price.toFixed(2)}</span>
                    <span className="w-12 text-right">{order.quantity.toFixed(0)}</span>
                    <span className="text-text-tertiary truncate w-20 text-right">{order.companyName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary text-center py-2">暂无卖单</p>
            )}
          </div>
          
          {/* 买方报价 */}
          <div>
            <p className="text-xs text-chart-up mb-2">买方报价 (点击卖出)</p>
            {orderBook.buyOrders.length > 0 ? (
              <div className="space-y-1">
                {orderBook.buyOrders.map((order, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-xs p-1.5 rounded hover:bg-chart-up/10 cursor-pointer tabular-nums"
                    onClick={() => {
                      setTradeType('sell');
                      setTradePrice(order.price.toString());
                    }}
                  >
                    <span className="text-chart-up w-16">¥{order.price.toFixed(2)}</span>
                    <span className="w-12 text-right">{order.quantity.toFixed(0)}</span>
                    <span className="text-text-tertiary truncate w-20 text-right">{order.companyName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary text-center py-2">暂无买单</p>
            )}
          </div>
        </div>

        {/* 成交记录 */}
        <div className="card p-4">
          <h3 className="text-sm font-medium mb-3">📝 成交记录</h3>
          {recentTrades.length > 0 ? (
            <div className="space-y-1">
              {recentTrades.map((trade, idx) => (
                <div key={idx} className="flex justify-between text-xs p-1.5 tabular-nums">
                  <span className="text-text-tertiary w-24">{trade.time}</span>
                  <span className="w-12 text-right">{trade.quantity.toFixed(0)}</span>
                  <span className="font-medium w-16 text-right">¥{trade.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary text-center py-2">暂无成交记录</p>
          )}
        </div>

        {/* 自定义下单 */}
        <div className="card p-4">
          <h3 className="text-sm font-medium mb-3">🛒 自定义下单</h3>
          
          {/* 买卖切换 */}
          <div className="flex gap-2 mb-3">
            <button
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                tradeType === 'buy'
                  ? 'bg-chart-up text-white'
                  : 'bg-gray-700 text-text-tertiary hover:text-white'
              }`}
              onClick={() => setTradeType('buy')}
            >
              买入
            </button>
            <button
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                tradeType === 'sell'
                  ? 'bg-chart-down text-white'
                  : 'bg-gray-700 text-text-tertiary hover:text-white'
              }`}
              onClick={() => setTradeType('sell')}
            >
              卖出
            </button>
          </div>
          
          {/* 数量输入 */}
          <div className="mb-3">
            <label className="block text-xs text-text-tertiary mb-1">数量</label>
            <input
              type="number"
              className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border focus:border-accent focus:outline-none"
              value={tradeQuantity}
              onChange={(e) => setTradeQuantity(e.target.value)}
            />
          </div>
          
          {/* 单价输入 */}
          <div className="mb-3">
            <label className="block text-xs text-text-tertiary mb-1">单价 (选填)</label>
            <input
              type="number"
              className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border focus:border-accent focus:outline-none"
              placeholder={`¥${currentPrice.toFixed(2)}`}
              value={tradePrice}
              onChange={(e) => setTradePrice(e.target.value)}
            />
          </div>
          
          {/* 总价显示 */}
          <div className="flex justify-between text-sm mb-3 p-2 rounded-lg bg-background-secondary">
            <span className="text-text-tertiary">总价</span>
            <span className={`tabular-nums ${tradeType === 'buy' ? 'text-chart-up' : 'text-chart-down'}`}>
              ¥{totalCost.toFixed(2)}
            </span>
          </div>
          
          {/* 余额显示 */}
          <div className="text-xs text-text-tertiary mb-3 tabular-nums">
            可用资金: ¥{playerCash.toLocaleString()}
          </div>
          
          {/* 提交按钮 */}
          <button
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
              tradeType === 'buy'
                ? 'bg-chart-up text-white hover:bg-chart-up/90'
                : 'bg-chart-down text-white hover:bg-chart-down/90'
            }`}
            onClick={handleSubmitOrder}
          >
            {tradeType === 'buy' ? '买入' : '卖出'}
          </button>
        </div>

        {/* 我的挂单 - 当前商品 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">📌 当前商品挂单</h3>
            <span className="text-xs text-text-tertiary">{playerOrders.length}笔</span>
          </div>
          
          {playerOrders.length > 0 ? (
            <div className="space-y-2">
              {playerOrders.map((order) => (
                <div key={order.index} className="flex items-center justify-between p-2 rounded-lg bg-background-secondary">
                  <div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      order.type === 'buy' ? 'bg-chart-up/20 text-chart-up' : 'bg-chart-down/20 text-chart-down'
                    }`}>
                      {order.type === 'buy' ? '买' : '卖'}
                    </span>
                    <span className="text-sm ml-2 tabular-nums">
                      ¥{order.price.toFixed(2)} × {order.quantity.toFixed(0)}
                    </span>
                  </div>
                  <button
                    className="text-xs text-error hover:underline"
                    onClick={() => cancelPlayerOrder(order.index)}
                  >
                    取消
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary text-center py-2">当前商品暂无挂单</p>
          )}
        </div>
        
        {/* 我的所有挂单 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">📋 所有挂单</h3>
            <span className="text-xs text-text-tertiary">{allPlayerOrders.length}笔</span>
          </div>
          
          {allPlayerOrders.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
              {allPlayerOrders.map((order) => (
                <div
                  key={order.index}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    order.goodsId === selectedGoodsId
                      ? 'bg-accent/20 border border-accent/50'
                      : 'bg-background-secondary hover:bg-background-secondary/70'
                  }`}
                  onClick={() => setSelectedGoodsId(order.goodsId)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        order.type === 'buy' ? 'bg-chart-up/20 text-chart-up' : 'bg-chart-down/20 text-chart-down'
                      }`}>
                        {order.type === 'buy' ? '买' : '卖'}
                      </span>
                      <span className="text-xs text-text-secondary truncate">{order.goodsName}</span>
                    </div>
                    <span className="text-sm tabular-nums">
                      ¥{order.price.toFixed(2)} × {order.quantity.toFixed(0)}
                    </span>
                  </div>
                  <button
                    className="text-xs text-error hover:underline flex-shrink-0 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelPlayerOrder(order.index);
                    }}
                  >
                    取消
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary text-center py-2">暂无任何挂单</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Market;