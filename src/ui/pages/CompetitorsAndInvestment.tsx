/**
 * 竞争与投资 - 统一页面
 * 整合竞争对手和股票市场功能
 */

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { MarketShareChart } from '@/ui/components/Charts/MarketShareChart';
import { CompanyRow } from '@/ui/components/Company/CompanyRow';
import { CompanyDetail } from '@/ui/components/Company/CompanyDetail';
import { ControlledCompanies } from '@/ui/components/Company/ControlledCompanies';
import { QuickTradeModal } from '@/ui/components/Company/TradePanel';
import { ShareholderChart } from '@/ui/components/Company/ShareholderChart';
import {
  CompanyProfile,
  getCompanyProfile,
  getAICompanyProfiles,
  getPlayerHoldingProfiles,
  getPlayerControlledProfiles,
  getGainersProfiles,
  getLosersProfiles,
  calculatePlayerPortfolio,
  calculateMarketStats,
} from '@/core/finance/CompanyProfile';
import { getMarketState } from '@/core/finance/StockMarket';

type TabType = 'all' | 'holdings' | 'favorites' | 'gainers' | 'losers';

/**
 * 格式化金额
 */
function formatMoney(value: number): string {
  if (value >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
  return `¥${value.toFixed(0)}`;
}

export const CompetitorsAndInvestment: React.FC = () => {
  const {
    getWorld,
    tick,
    playerCash,
    getStockInfo,
    getPlayerHoldings,
    playerIPO,
    initiateAcquisitionOffer,
    getPlayerAcquisitionOffers,
    analyzeAcquisition,
    addNotification,
  } = useGameStore();
  
  const world = getWorld();
  
  // 状态
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIPOModal, setShowIPOModal] = useState(false);
  const [showQuickTrade, setShowQuickTrade] = useState<{
    companyId: number;
    type: 'buy' | 'sell';
  } | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [showAcquisitionModal, setShowAcquisitionModal] = useState<number | null>(null);
  const [acquisitionPercent, setAcquisitionPercent] = useState(51);
  const [acquisitionPremium, setAcquisitionPremium] = useState(20);
  
  // IPO状态
  const [ipoShares, setIpoShares] = useState(400000);
  const [ipoPrice, setIpoPrice] = useState(10);
  
  // 获取玩家公司股票信息
  const playerStock = getStockInfo(0);
  
  // 获取玩家公司资料
  const playerProfile = useMemo(() => {
    if (!world) return null;
    return getCompanyProfile(world, 0);
  }, [world, tick]);
  
  // 获取所有公司资料（包括玩家）
  const allProfiles = useMemo(() => {
    if (!world) return [];
    return getAICompanyProfiles(world);
  }, [world, tick]);
  
  // 获取控股公司
  const controlledProfiles = useMemo(() => {
    if (!world) return [];
    return getPlayerControlledProfiles(world);
  }, [world, tick]);
  
  // 根据标签页筛选公司
  const filteredProfiles = useMemo(() => {
    if (!world) return [];
    
    let profiles: CompanyProfile[];
    
    switch (activeTab) {
      case 'holdings':
        profiles = getPlayerHoldingProfiles(world);
        break;
      case 'favorites':
        profiles = allProfiles.filter(p => favorites.has(p.id));
        break;
      case 'gainers':
        profiles = getGainersProfiles(world, 20);
        break;
      case 'losers':
        profiles = getLosersProfiles(world, 20);
        break;
      default:
        profiles = allProfiles;
    }
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      profiles = profiles.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.stock?.ticker || '').toLowerCase().includes(query)
      );
    }
    
    return profiles;
  }, [world, tick, activeTab, searchQuery, favorites, allProfiles]);
  
  // 选中的公司资料
  const selectedProfile = useMemo(() => {
    if (!world || selectedCompanyId === null) return null;
    return allProfiles.find(p => p.id === selectedCompanyId) || null;
  }, [world, selectedCompanyId, allProfiles]);
  
  // 市场统计
  const marketStats = useMemo(() => {
    if (!world) return { rising: 0, falling: 0, unchanged: 0, totalVolume: 0, totalMarketCap: 0 };
    return calculateMarketStats(world);
  }, [world, tick]);
  
  // 投资组合
  const portfolio = useMemo(() => {
    if (!world) return { totalValue: 0, totalCost: 0, totalGain: 0, gainPercent: 0, holdingCount: 0 };
    return calculatePlayerPortfolio(world);
  }, [world, tick]);
  
  // 市场指数
  const marketState = getMarketState();
  const marketIndex = marketState?.marketIndex || 1000;
  const marketIndexChange = marketState?.marketIndexChange || 0;
  
  // 市场份额数据
  const marketShareData = useMemo(() => {
    if (!world) return [{ name: '我的公司', value: 100, color: '#3b82f6' }];
    
    const playerCash = world.companies.cash[0] || 1000000;
    let totalCash = playerCash;
    
    for (const profile of allProfiles) {
      totalCash += profile.cash;
    }
    
    const playerShare = totalCash > 0 ? (playerCash / totalCash) * 100 : 0;
    
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    
    return [
      { name: '我的公司', value: playerShare, color: '#3b82f6' },
      ...allProfiles.slice(0, 7).map((p, i) => ({
        name: p.name,
        value: p.marketShare,
        color: colors[i % colors.length],
      })),
    ];
  }, [world, allProfiles, tick]);
  
  // HHI计算
  const hhi = useMemo(() => {
    let sum = 0;
    for (const item of marketShareData) {
      sum += item.value * item.value;
    }
    return Math.round(sum);
  }, [marketShareData]);
  
  // 切换收藏
  const toggleFavorite = (companyId: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };
  
  // 处理快速交易
  const handleQuickBuy = (companyId: number) => {
    setShowQuickTrade({ companyId, type: 'buy' });
  };
  
  const handleQuickSell = (companyId: number) => {
    setShowQuickTrade({ companyId, type: 'sell' });
  };
  
  // 处理收购
  const handleAcquire = (companyId: number) => {
    setShowAcquisitionModal(companyId);
  };
  
  // 执行收购
  const executeAcquisition = () => {
    if (showAcquisitionModal === null) return;
    
    const profile = allProfiles.find(p => p.id === showAcquisitionModal);
    if (!profile || !profile.stock) {
      addNotification('error', '无法获取公司信息');
      return;
    }
    
    // 计算收购价格（当前股价 * (1 + 溢价率)）
    const offerPrice = profile.stock.currentPrice * (1 + acquisitionPremium / 100);
    const targetPercent = acquisitionPercent / 100;
    
    const success = initiateAcquisitionOffer(showAcquisitionModal, targetPercent, offerPrice);
    if (success) {
      setShowAcquisitionModal(null);
    }
  };
  
  // 执行IPO
  const executeIPO = () => {
    playerIPO(ipoShares, ipoPrice);
    setShowIPOModal(false);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">竞争与投资</h1>
        {!playerStock && (
          <button
            onClick={() => setShowIPOModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            发起IPO
          </button>
        )}
      </div>
      
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 市场指数 */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400">市场指数</div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">
            {marketIndex.toFixed(2)}
          </div>
          <div className={`text-sm mt-1 tabular-nums ${
            marketIndexChange >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {marketIndexChange >= 0 ? '+' : ''}{(marketIndexChange * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-slate-500 mt-2">
            总市值: {formatMoney(marketStats.totalMarketCap)}
          </div>
        </div>
        
        {/* 我的投资组合 */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400">我的投资组合</div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">
            {formatMoney(portfolio.totalValue)}
          </div>
          <div className={`text-sm mt-1 tabular-nums ${
            portfolio.totalGain >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {portfolio.totalGain >= 0 ? '+' : ''}{formatMoney(portfolio.totalGain)}
            ({portfolio.gainPercent >= 0 ? '+' : ''}{portfolio.gainPercent.toFixed(2)}%)
          </div>
          <div className="text-xs text-slate-500 mt-2">
            持有 {portfolio.holdingCount} 只股票
          </div>
        </div>
        
        {/* 市场竞争格局 */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400">市场竞争格局</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-green-400 tabular-nums">{marketStats.rising}</span>
            <span className="text-slate-500">/</span>
            <span className="text-xl font-bold text-slate-400 tabular-nums">{marketStats.unchanged}</span>
            <span className="text-slate-500">/</span>
            <span className="text-xl font-bold text-red-400 tabular-nums">{marketStats.falling}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">涨 / 平 / 跌</div>
          <div className={`text-sm mt-2 ${
            hhi < 1500 ? 'text-green-400' : hhi < 2500 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            HHI: {hhi} ({hhi < 1500 ? '竞争充分' : hhi < 2500 ? '中度集中' : '高度集中'})
          </div>
        </div>
      </div>
      
      {/* 玩家公司信息 */}
      {playerProfile && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                {playerProfile.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">{playerProfile.name}</span>
                  {playerStock && (
                    <span className="font-mono text-slate-400">{playerStock.ticker}</span>
                  )}
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                    我的公司
                  </span>
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  {playerProfile.competition.specialization}
                </div>
              </div>
            </div>
            
            {!playerStock && (
              <button
                onClick={() => setShowIPOModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                发起IPO
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 现金 */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">现金</div>
              <div className="text-lg font-bold text-white tabular-nums">
                {formatMoney(playerProfile.cash)}
              </div>
            </div>
            
            {/* 总资产 */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">总资产</div>
              <div className="text-lg font-bold text-white tabular-nums">
                {formatMoney(playerProfile.totalAssets)}
              </div>
            </div>
            
            {/* 建筑数量 */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">建筑数量</div>
              <div className="text-lg font-bold text-white tabular-nums">
                {playerProfile.buildingCount}
              </div>
            </div>
            
            {/* 市场份额 */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">市场份额</div>
              <div className="text-lg font-bold text-white tabular-nums">
                {playerProfile.marketShare.toFixed(2)}%
              </div>
            </div>
            
            {/* 股票信息 */}
            {playerStock && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">股价</div>
                <div className="text-lg font-bold text-white tabular-nums">
                  ¥{playerStock.currentPrice.toFixed(2)}
                </div>
                {(() => {
                  const priceChange = playerStock.currentPrice - playerStock.previousClose;
                  const priceChangePercent = playerStock.previousClose > 0
                    ? (priceChange / playerStock.previousClose) * 100
                    : 0;
                  return (
                    <div className={`text-xs tabular-nums ${
                      priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                    </div>
                  );
                })()}
              </div>
            )}
            
            {!playerStock && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">股票状态</div>
                <div className="text-sm font-medium text-yellow-400">
                  未上市
                </div>
              </div>
            )}
          </div>
          
          {/* 库存价值 */}
          {playerProfile.inventoryValue > 0 && (
            <div className="mt-3 text-sm text-slate-400">
              库存价值: <span className="text-white tabular-nums">{formatMoney(playerProfile.inventoryValue)}</span>
            </div>
          )}
          
          {/* 股东结构 - 仅当已上市时显示 */}
          {playerStock && playerProfile.ownership && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-3">股东结构</h4>
              <ShareholderChart ownership={playerProfile.ownership} />
            </div>
          )}
        </div>
      )}
      
      {/* 市场份额图 + 控股公司 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <MarketShareChart
            data={marketShareData}
            title="市场份额分布"
            height={280}
            showLegend={false}
          />
        </div>
        
        <ControlledCompanies
          controlledProfiles={controlledProfiles}
          onSelectCompany={setSelectedCompanyId}
        />
      </div>
      
      {/* 标签页和搜索 */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div className="flex gap-1">
          {[
            { key: 'all', label: '🏢 全部公司', count: allProfiles.length },
            { key: 'holdings', label: '📈 我的持股', count: portfolio.holdingCount },
            { key: 'favorites', label: '⭐ 收藏', count: favorites.size },
            { key: 'gainers', label: '🔺 涨幅榜' },
            { key: 'losers', label: '🔻 跌幅榜' },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabType)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {label}
              {count !== undefined && (
                <span className="ml-1 text-xs opacity-70">({count})</span>
              )}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="搜索公司..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 px-3 py-2 pl-8 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400"
          />
          <span className="absolute left-2.5 top-2.5 text-slate-400">🔍</span>
        </div>
      </div>
      
      {/* 公司列表 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {/* 列表头部 */}
        <div className="grid grid-cols-12 gap-2 p-3 bg-slate-700/50 text-sm text-slate-300 font-medium">
          <div className="col-span-1">代码</div>
          <div className="col-span-2">公司名称</div>
          <div className="col-span-1 text-right">股价</div>
          <div className="col-span-1 text-right">涨跌</div>
          <div className="col-span-1 text-center">风格</div>
          <div className="col-span-1 text-right">市值</div>
          <div className="col-span-1 text-right">份额</div>
          <div className="col-span-1 text-center">威胁</div>
          <div className="col-span-1 text-right">持股</div>
          <div className="col-span-2 text-center">操作</div>
        </div>
        
        {/* 公司列表 */}
        <div className="max-h-[500px] overflow-y-auto">
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile) => (
              <CompanyRow
                key={profile.id}
                profile={profile}
                isSelected={selectedCompanyId === profile.id}
                onSelect={() => setSelectedCompanyId(
                  selectedCompanyId === profile.id ? null : profile.id
                )}
                onQuickBuy={() => handleQuickBuy(profile.id)}
                onQuickSell={() => handleQuickSell(profile.id)}
                onAcquire={() => handleAcquire(profile.id)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              {activeTab === 'holdings' ? '暂无持股' :
               activeTab === 'favorites' ? '暂无收藏' :
               searchQuery ? '未找到匹配的公司' : '暂无公司数据'}
            </div>
          )}
        </div>
      </div>
      
      {/* 选中公司详情面板 */}
      {selectedProfile && (
        <CompanyDetail
          profile={selectedProfile}
          onClose={() => setSelectedCompanyId(null)}
          onAcquire={() => handleAcquire(selectedProfile.id)}
        />
      )}
      
      {/* 竞争分析提示 */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-3">竞争分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <span>⚠️</span>
              <span className="font-medium">价格战警告</span>
            </div>
            <p className="text-slate-300 text-sm">
              {allProfiles.filter(p => p.personality === 'cost_leader').length > 0
                ? `成本领先型公司正在压低市场价格，注意调整定价策略。`
                : `市场价格暂时稳定，未发现明显价格战。`}
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <span>💡</span>
              <span className="font-medium">投资机会</span>
            </div>
            <p className="text-slate-300 text-sm">
              {marketStats.falling > marketStats.rising
                ? `市场下跌中，可能存在低估值买入机会。`
                : `市场上涨中，关注成长股的投资价值。`}
            </p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <span>✅</span>
              <span className="font-medium">控股提示</span>
            </div>
            <p className="text-slate-300 text-sm">
              {controlledProfiles.length > 0
                ? `您已控股 ${controlledProfiles.length} 家公司，可通过管理面板调整经营策略。`
                : `持股超过50%可获得公司控制权，建议关注高价值目标。`}
            </p>
          </div>
        </div>
      </div>
      
      {/* 快速交易模态框 */}
      {showQuickTrade && (() => {
        const profile = allProfiles.find(p => p.id === showQuickTrade.companyId);
        if (!profile || !profile.stock) return null;
        
        return (
          <QuickTradeModal
            companyId={profile.id}
            companyName={profile.name}
            ticker={profile.stock.ticker}
            currentPrice={profile.stock.currentPrice}
            playerShares={profile.ownership.playerHolding?.shares || 0}
            tradeType={showQuickTrade.type}
            onClose={() => setShowQuickTrade(null)}
          />
        );
      })()}
      
      {/* IPO模态框 */}
      {showIPOModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-[500px] border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-4">发起首次公开募股 (IPO)</h3>

            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-sm text-purple-300">
                <p>通过IPO，您可以将公司股份出售给公众，获得融资。发行后，公司股票将可在市场上自由交易。</p>
              </div>

              {/* 发行股数 */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">发行股数（总股本100万股）</label>
                <input
                  type="range"
                  min="100000"
                  max="600000"
                  step="10000"
                  value={ipoShares}
                  onChange={(e) => setIpoShares(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-400">10%</span>
                  <span className="text-white font-medium tabular-nums">
                    {ipoShares.toLocaleString()}股 ({(ipoShares / 10000).toFixed(0)}%)
                  </span>
                  <span className="text-slate-400">60%</span>
                </div>
              </div>

              {/* 发行价格 */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">发行价格（每股）</label>
                <input
                  type="number"
                  value={ipoPrice}
                  onChange={(e) => setIpoPrice(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  min="1"
                  step="1"
                />
              </div>

              {/* IPO预览 */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium text-slate-300 mb-2">IPO预览</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">募集资金:</span>
                    <span className="text-green-400 ml-2 tabular-nums">
                      ¥{(ipoShares * ipoPrice).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">估值:</span>
                    <span className="text-white ml-2 tabular-nums">
                      ¥{(1000000 * ipoPrice).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">保留股份:</span>
                    <span className="text-white ml-2 tabular-nums">
                      {(1000000 - ipoShares).toLocaleString()}股 ({((1000000 - ipoShares) / 10000).toFixed(0)}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">流通股:</span>
                    <span className="text-white ml-2 tabular-nums">
                      {ipoShares.toLocaleString()}股
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowIPOModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeIPO}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                确认发行
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 收购模态框 */}
      {showAcquisitionModal !== null && (() => {
        const profile = allProfiles.find(p => p.id === showAcquisitionModal);
        if (!profile) return null;
        
        const analysis = analyzeAcquisition(showAcquisitionModal);
        const currentPrice = profile.stock?.currentPrice || 0;
        const offerPrice = currentPrice * (1 + acquisitionPremium / 100);
        const targetShares = Math.floor((profile.stock?.totalShares || 1000000) * (acquisitionPercent / 100));
        const totalCost = offerPrice * targetShares;
        
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-[550px] border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                发起收购要约 - {profile.name}
              </h3>
              
              <div className="space-y-4">
                {/* 收购可行性分析 */}
                {analysis && (
                  <div className={`rounded-lg p-3 ${
                    analysis.feasible
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={analysis.feasible ? 'text-green-400' : 'text-red-400'}>
                        {analysis.feasible ? '✓ 收购可行' : '✗ 收购风险较高'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        analysis.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                        analysis.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        风险: {analysis.riskLevel === 'low' ? '低' :
                               analysis.riskLevel === 'medium' ? '中' : '高'}
                      </span>
                    </div>
                    {!analysis.feasible && analysis.reason && (
                      <p className="text-xs text-red-300 mt-1">{analysis.reason}</p>
                    )}
                  </div>
                )}
                
                {/* 目标持股比例 */}
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">目标持股比例</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={acquisitionPercent}
                    onChange={(e) => setAcquisitionPercent(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">10%</span>
                    <span className={`font-medium tabular-nums ${
                      acquisitionPercent >= 50 ? 'text-purple-400' :
                      acquisitionPercent >= 20 ? 'text-blue-400' : 'text-slate-300'
                    }`}>
                      {acquisitionPercent}%
                      {acquisitionPercent >= 50 ? ' (控股)' :
                       acquisitionPercent >= 20 ? ' (战略)' : ''}
                    </span>
                    <span className="text-slate-400">100%</span>
                  </div>
                </div>
                
                {/* 收购溢价 */}
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">收购溢价</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={acquisitionPremium}
                    onChange={(e) => setAcquisitionPremium(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">0%</span>
                    <span className="text-white font-medium tabular-nums">+{acquisitionPremium}%</span>
                    <span className="text-slate-400">50%</span>
                  </div>
                </div>
                
                {/* 收购预览 */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">收购预览</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">当前股价:</span>
                      <span className="text-white ml-2 tabular-nums">
                        ¥{currentPrice.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">要约价格:</span>
                      <span className="text-green-400 ml-2 tabular-nums">
                        ¥{offerPrice.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">目标股数:</span>
                      <span className="text-white ml-2 tabular-nums">
                        {targetShares.toLocaleString()}股
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">预估总成本:</span>
                      <span className={`ml-2 tabular-nums ${
                        totalCost > playerCash ? 'text-red-400' : 'text-white'
                      }`}>
                        {formatMoney(totalCost)}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-slate-600 pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">可用资金:</span>
                      <span className={`tabular-nums ${
                        totalCost > playerCash ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {formatMoney(playerCash)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {totalCost > playerCash && (
                  <p className="text-xs text-red-400 text-center">资金不足，无法完成收购</p>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowAcquisitionModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={executeAcquisition}
                  disabled={totalCost > playerCash}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  发起收购
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CompetitorsAndInvestment;