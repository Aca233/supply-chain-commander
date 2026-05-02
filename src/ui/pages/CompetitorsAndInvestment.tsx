/**
 * 竞争与投资 - 统一页面
 * 整合竞争对手和股票市场功能
 * 使用新设计系统组件重构
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { MarketShareChart } from '@/ui/components/Charts/MarketShareChart';
import { useMobile } from '@/ui/hooks/useMobile';
import { CompanyRow } from '@/ui/components/Company/CompanyRow';
import { CompanyDetail } from '@/ui/components/Company/CompanyDetail';
import { ControlledCompanies } from '@/ui/components/Company/ControlledCompanies';
import { QuickTradeModal } from '@/ui/components/Company/TradePanel';
import { ShareholderChart } from '@/ui/components/Company/ShareholderChart';
import { StockMarketPanel } from '@/ui/components/Finance';
import { ResponsiveOverlayPanel } from '@/ui/components/Layout/ResponsiveOverlayPanel';
import { shouldUseOverlayCompanyDetail } from './responsivePageLayout';
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
import { getIPOOfferPreview, getMarketState } from '@/core/finance/StockMarket';
import { formatCurrency } from '@/ui/utils/format';

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Slider,
} from '@/ui/design-system';

type MainTabType = 'competitors' | 'stockmarket';
type CompanyTabType = 'all' | 'holdings' | 'favorites' | 'gainers' | 'losers';

export const CompetitorsAndInvestment: React.FC = () => {
  const { isMobile, isTablet, isNarrowDesktop } = useMobile();
  const useOverlayCompanyDetail = shouldUseOverlayCompanyDetail({
    isMobile,
    isTablet,
    isNarrowDesktop,
  });
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
  const [mainTab, setMainTab] = useState<MainTabType>('competitors');
  const [activeTab, setActiveTab] = useState<CompanyTabType>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIPOModal, setShowIPOModal] = useState(false);
  const [showQuickTrade, setShowQuickTrade] = useState<{
    companyId: number;
    type: 'buy' | 'sell';
  } | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [showAcquisitionModal, setShowAcquisitionModal] = useState<number | null>(null);
  const [acquisitionPercent, setAcquisitionPercent] = useState([51]);
  const [acquisitionPremium, setAcquisitionPremium] = useState([20]);
  
  // IPO状态
  const [ipoShares, setIpoShares] = useState([400000]);
  const [ipoPrice, setIpoPrice] = useState(10);
  const [ipoFeedback, setIpoFeedback] = useState<string | null>(null);
  
  // 获取玩家公司股票信息
  const playerStock = getStockInfo(0);
  
  // 获取玩家公司资料
  const playerProfile = useMemo(() => {
    if (!world) return null;
    return getCompanyProfile(world, 0);
  }, [world, tick]);
  
  // 获取所有公司资料
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
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };
  
  // 处理快速交易
  const handleQuickBuy = (companyId: number) => setShowQuickTrade({ companyId, type: 'buy' });
  const handleQuickSell = (companyId: number) => setShowQuickTrade({ companyId, type: 'sell' });
  const handleAcquire = (companyId: number) => setShowAcquisitionModal(companyId);
  
  // 执行收购
  const executeAcquisition = () => {
    if (showAcquisitionModal === null) return;
    
    const profile = allProfiles.find(p => p.id === showAcquisitionModal);
    if (!profile || !profile.stock) {
      addNotification('error', '无法获取公司信息');
      return;
    }
    
    const offerPrice = profile.stock.currentPrice * (1 + acquisitionPremium[0] / 100);
    const targetPercent = acquisitionPercent[0] / 100;
    
    const success = initiateAcquisitionOffer(showAcquisitionModal, targetPercent, offerPrice);
    if (success) setShowAcquisitionModal(null);
  };
  
  // 执行IPO
  const executeIPO = () => {
    const result = playerIPO(ipoShares[0], ipoPrice);
    if (result.success) {
      setIpoFeedback(null);
      setShowIPOModal(false);
      return;
    }

    setIpoFeedback(result.message);
  };

  const ipoPreview = useMemo(() => {
    if (!world || playerStock) return null;
    return getIPOOfferPreview(world, 0, ipoShares[0], ipoPrice);
  }, [world, playerStock, ipoShares[0], ipoPrice, tick]);

  useEffect(() => {
    if (!showIPOModal) {
      setIpoFeedback(null);
      return;
    }
    setIpoFeedback(null);
  }, [showIPOModal, ipoShares[0], ipoPrice]);
  
  return (
    <div className={`space-y-4 ${isMobile ? 'pb-4' : useOverlayCompanyDetail ? 'p-4' : 'p-6'}`}>
      {/* 页面标题和主标签页切换 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className={`font-bold ${isMobile ? 'text-lg' : useOverlayCompanyDetail ? 'text-xl' : 'text-2xl'}`}>📊 竞争与投资</h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTabType)}>
            <TabsList variant="game" className="flex flex-wrap h-auto">
              <TabsTrigger value="competitors" variant="game">
                🏢 竞争对手
              </TabsTrigger>
              <TabsTrigger value="stockmarket" variant="game">
                📈 股票交易
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {mainTab === 'competitors' && !playerStock && (
            <Button variant="gradient" size="sm" onClick={() => setShowIPOModal(true)}>
              🚀 发起IPO
            </Button>
          )}
        </div>
      </div>
      
      {/* 股票交易面板 - 当选择股票交易标签时显示 */}
      {mainTab === 'stockmarket' && (
        <StockMarketPanel />
      )}
      
      {/* 竞争对手面板 - 当选择竞争对手标签时显示 */}
      {mainTab === 'competitors' && (
      <>
      
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatWidget
          title="市场指数"
          value={marketIndex.toFixed(2)}
          change={marketIndexChange}
          icon="📈"
          status={marketIndexChange >= 0 ? 'success' : 'error'}
        />
        <StatWidget
          title="我的投资组合"
          value={formatCurrency(portfolio.totalValue)}
          change={portfolio.gainPercent / 100}
          icon="💼"
          status={portfolio.totalGain >= 0 ? 'success' : 'error'}
        />
        <Card variant="elevated" padding="md">
          <div className="text-sm text-[var(--text-muted)]">市场竞争格局</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="success">{marketStats.rising}</Badge>
            <span className="text-[var(--text-muted)]">/</span>
            <Badge variant="outline">{marketStats.unchanged}</Badge>
            <span className="text-[var(--text-muted)]">/</span>
            <Badge variant="error">{marketStats.falling}</Badge>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">涨 / 平 / 跌</div>
          <Badge
            variant={hhi < 1500 ? 'success' : hhi < 2500 ? 'warning' : 'error'}
            size="sm"
            className="mt-2"
          >
            HHI: {hhi} ({hhi < 1500 ? '竞争充分' : hhi < 2500 ? '中度集中' : '高度集中'})
          </Badge>
        </Card>
      </div>
      
      {/* 玩家公司信息 */}
      {playerProfile && (
        <Card variant="game" padding="md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xl">
                {playerProfile.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[var(--text-primary)]">{playerProfile.name}</span>
                  {playerStock && (
                    <Badge variant="outline">{playerStock.ticker}</Badge>
                  )}
                  <Badge variant="primary">我的公司</Badge>
                </div>
                <div className="text-sm text-[var(--text-muted)] mt-1">
                  {playerProfile.competition.specialization}
                </div>
              </div>
            </div>
            
            {!playerStock && (
              <Button variant="gradient" onClick={() => setShowIPOModal(true)}>
                🚀 发起IPO
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            <StatWidget title="现金" value={formatCurrency(playerProfile.cash)} icon="💵" compact />
            <StatWidget title="总资产" value={formatCurrency(playerProfile.totalAssets)} icon="🏦" compact />
            <StatWidget title="建筑数量" value={playerProfile.buildingCount.toString()} icon="🏭" compact />
            <StatWidget title="市场份额" value={`${playerProfile.marketShare.toFixed(2)}%`} icon="📊" compact />
            {playerStock ? (
              <StatWidget
                title="股价"
                value={formatCurrency(playerStock.currentPrice)}
                change={(playerStock.currentPrice - playerStock.previousClose) / playerStock.previousClose}
                icon="📈"
                compact
              />
            ) : (
              <Card variant="elevated" padding="sm">
                <div className="text-xs text-[var(--text-muted)] mb-1">股票状态</div>
                <Badge variant="warning">未上市</Badge>
              </Card>
            )}
          </div>
          
          {playerProfile.inventoryValue > 0 && (
            <div className="mt-3 text-sm text-[var(--text-muted)]">
              库存价值: <span className="text-[var(--text-primary)] tabular-nums">{formatCurrency(playerProfile.inventoryValue)}</span>
            </div>
          )}
          
          {playerStock && playerProfile.ownership && (
            <div className="mt-4 pt-4 border-t border-[var(--border-muted)]">
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">股东结构</h4>
              <ShareholderChart ownership={playerProfile.ownership} />
            </div>
          )}
        </Card>
      )}
      
      {/* 市场份额图 + 控股公司 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="md">
          <MarketShareChart
            data={marketShareData}
            title="市场份额分布"
            height={280}
            showLegend={false}
          />
        </Card>
        
        <ControlledCompanies
          controlledProfiles={controlledProfiles}
          onSelectCompany={setSelectedCompanyId}
        />
      </div>
      
      {/* 标签页和搜索 */}
      <Card variant="elevated" padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CompanyTabType)}>
              <TabsList variant="game" className="flex flex-wrap h-auto">
              <TabsTrigger value="all" variant="game">
                🏢 全部 <Badge variant="outline" size="sm" className="ml-1">{allProfiles.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="holdings" variant="game">
                📈 持股 <Badge variant="outline" size="sm" className="ml-1">{portfolio.holdingCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="favorites" variant="game">
                ⭐ 收藏 <Badge variant="outline" size="sm" className="ml-1">{favorites.size}</Badge>
              </TabsTrigger>
              <TabsTrigger value="gainers" variant="game">🔺 涨幅榜</TabsTrigger>
              <TabsTrigger value="losers" variant="game">🔻 跌幅榜</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <Input
            placeholder="搜索公司..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon="🔍"
            size="sm"
            className={useOverlayCompanyDetail ? 'w-full' : 'w-48'}
          />
        </div>
      </Card>
      
      {/* 公司列表 */}
      <Card variant="elevated" padding="none">
        {/* 表头 - 仅桌面端显示 */}
        {!isMobile && (
          <div className="grid grid-cols-12 gap-2 p-3 bg-[var(--bg-muted)] text-sm text-[var(--text-muted)] font-medium border-b border-[var(--border-muted)]">
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
        )}
        
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
            <div className="text-center py-8 text-[var(--text-muted)]">
              {activeTab === 'holdings' ? '📭 暂无持股' :
               activeTab === 'favorites' ? '⭐ 暂无收藏' :
               searchQuery ? '🔍 未找到匹配的公司' : '📊 暂无公司数据'}
            </div>
          )}
        </div>
      </Card>
      
      {/* 选中公司详情面板 */}
      {selectedProfile && !useOverlayCompanyDetail && (
        <CompanyDetail
          profile={selectedProfile}
          onClose={() => setSelectedCompanyId(null)}
          onAcquire={() => handleAcquire(selectedProfile.id)}
        />
      )}

      {selectedProfile && useOverlayCompanyDetail && (
        <ResponsiveOverlayPanel
          open={selectedProfile !== null}
          title={selectedProfile.name}
          position="right"
          widthClassName="max-w-2xl"
          onClose={() => setSelectedCompanyId(null)}
        >
          <CompanyDetail
            profile={selectedProfile}
            onClose={() => setSelectedCompanyId(null)}
            onAcquire={() => handleAcquire(selectedProfile.id)}
          />
        </ResponsiveOverlayPanel>
      )}
      
      {/* 竞争分析提示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="default" status="warning" padding="md">
          <div className="flex items-center gap-2 text-[var(--warning)] mb-2">
            <span>⚠️</span>
            <span className="font-medium">价格战警告</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            {allProfiles.filter(p => p.personality === 'cost_leader').length > 0
              ? `成本领先型公司正在压低市场价格，注意调整定价策略。`
              : `市场价格暂时稳定，未发现明显价格战。`}
          </p>
        </Card>
        <Card variant="default" status="info" padding="md">
          <div className="flex items-center gap-2 text-[var(--info)] mb-2">
            <span>💡</span>
            <span className="font-medium">投资机会</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            {marketStats.falling > marketStats.rising
              ? `市场下跌中，可能存在低估值买入机会。`
              : `市场上涨中，关注成长股的投资价值。`}
          </p>
        </Card>
        <Card variant="default" status="success" padding="md">
          <div className="flex items-center gap-2 text-[var(--success)] mb-2">
            <span>✅</span>
            <span className="font-medium">控股提示</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            {controlledProfiles.length > 0
              ? `您已控股 ${controlledProfiles.length} 家公司，可通过管理面板调整经营策略。`
              : `持股超过50%可获得公司控制权，建议关注高价值目标。`}
          </p>
        </Card>
      </div>
      </>
      )}
      
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
      <Dialog open={showIPOModal} onOpenChange={setShowIPOModal}>
        <DialogContent size="md" variant="game">
          <DialogHeader>
            <DialogTitle>🚀 发起首次公开募股 (IPO)</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Card variant="default" status="info" padding="sm">
              <p className="text-sm text-[var(--info)]">
                通过IPO，您可以将公司股份出售给公众，获得融资。发行后，公司股票将可在市场上自由交易。
              </p>
            </Card>

            <Slider
              value={ipoShares}
              onValueChange={setIpoShares}
              min={100000}
              max={600000}
              step={10000}
              label="发行股数（总股本100万股）"
              showValue
              formatValue={(v) => `${v.toLocaleString()}股 (${(v / 10000).toFixed(0)}%)`}
              variant="game"
              color="brand"
            />

            <Input
              label="发行价格（每股）"
              type="number"
              value={ipoPrice.toString()}
              onChange={(e) => setIpoPrice(Math.max(1, parseFloat(e.target.value) || 0))}
              min={1}
              step={1}
              error={ipoFeedback || (!ipoPreview?.canLaunch ? ipoPreview?.message : undefined)}
              helperText={ipoPreview ? `建议发行价：${formatCurrency(ipoPreview.minPrice, 2)} - ${formatCurrency(ipoPreview.maxPrice, 2)}，基准价约 ${formatCurrency(ipoPreview.suggestedPrice, 2)}` : undefined}
            />

            <Card variant="elevated" padding="md">
              <CardTitle className="text-sm mb-3">IPO预览</CardTitle>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">募集资金:</span>
                  <span className="text-[var(--success)] font-medium tabular-nums">
                    {formatCurrency(ipoShares[0] * ipoPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">估值:</span>
                  <span className="text-[var(--text-primary)] tabular-nums">
                    {formatCurrency(1000000 * ipoPrice, 2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">保留股份:</span>
                  <span className="text-[var(--text-primary)] tabular-nums">
                    {(1000000 - ipoShares[0]).toLocaleString()}股 ({((1000000 - ipoShares[0]) / 10000).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">流通股:</span>
                  <span className="text-[var(--text-primary)] tabular-nums">
                    {ipoShares[0].toLocaleString()}股
                  </span>
                </div>
              </div>
            </Card>

            {ipoPreview && (
              <Card
                variant="default"
                status={ipoPreview.canLaunch ? 'success' : 'warning'}
                padding="md"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">发行规则检查</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      真实认购和建议定价基于当前市场资金情况动态计算
                    </div>
                  </div>
                  <Badge variant={ipoPreview.canLaunch ? 'success' : 'warning'}>
                    {ipoPreview.canLaunch ? '可发行' : '需调整'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">允许发行股数:</span>
                    <span className="text-[var(--text-primary)] tabular-nums">
                      {ipoPreview.minShares.toLocaleString()} - {ipoPreview.maxShares.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">建议价格区间:</span>
                    <span className="text-[var(--text-primary)] tabular-nums">
                      {formatCurrency(ipoPreview.minPrice)} - {formatCurrency(ipoPreview.maxPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">预计真实认购:</span>
                    <span className="text-[var(--text-primary)] tabular-nums">
                      {ipoPreview.estimatedDemand.toLocaleString()} / {ipoShares[0].toLocaleString()} 股
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">认购缺口:</span>
                    <span className={`tabular-nums ${ipoPreview.shortfallShares > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                      {ipoPreview.shortfallShares.toLocaleString()} 股
                    </span>
                  </div>
                </div>
                <p className={`text-sm ${ipoPreview.canLaunch ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                  {ipoPreview.message}
                </p>
              </Card>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowIPOModal(false)}>取消</Button>
            <Button variant="gradient" onClick={executeIPO} disabled={!ipoPreview?.canLaunch}>确认发行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 收购模态框 */}
      {showAcquisitionModal !== null && (() => {
        const profile = allProfiles.find(p => p.id === showAcquisitionModal);
        if (!profile) return null;
        
        const analysis = analyzeAcquisition(showAcquisitionModal);
        const currentPrice = profile.stock?.currentPrice || 0;
        const offerPrice = currentPrice * (1 + acquisitionPremium[0] / 100);
        const targetShares = Math.floor((profile.stock?.totalShares || 1000000) * (acquisitionPercent[0] / 100));
        const totalCost = offerPrice * targetShares;
        
        return (
          <Dialog open={true} onOpenChange={() => setShowAcquisitionModal(null)}>
            <DialogContent size="lg" variant="game">
              <DialogHeader>
                <DialogTitle>🏢 发起收购要约 - {profile.name}</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-4">
                {analysis && (
                  <Card
                    variant="default"
                    status={analysis.feasible ? 'success' : 'error'}
                    padding="sm"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className={analysis.feasible ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                        {analysis.feasible ? '✓ 收购可行' : '✗ 收购风险较高'}
                      </span>
                      <Badge
                        variant={analysis.riskLevel === 'low' ? 'success' : analysis.riskLevel === 'medium' ? 'warning' : 'error'}
                        size="sm"
                      >
                        风险: {analysis.riskLevel === 'low' ? '低' : analysis.riskLevel === 'medium' ? '中' : '高'}
                      </Badge>
                    </div>
                    {!analysis.feasible && analysis.reason && (
                      <p className="text-xs text-[var(--error)] mt-1">{analysis.reason}</p>
                    )}
                  </Card>
                )}
                
                <Slider
                  value={acquisitionPercent}
                  onValueChange={setAcquisitionPercent}
                  min={10}
                  max={100}
                  step={1}
                  label="目标持股比例"
                  showValue
                  formatValue={(v) => `${v}%${v >= 50 ? ' (控股)' : v >= 20 ? ' (战略)' : ''}`}
                  variant="game"
                  color={acquisitionPercent[0] >= 50 ? 'brand' : undefined}
                />
                
                <Slider
                  value={acquisitionPremium}
                  onValueChange={setAcquisitionPremium}
                  min={0}
                  max={50}
                  step={5}
                  label="收购溢价"
                  showValue
                  formatValue={(v) => `+${v}%`}
                  variant="game"
                />
                
                <Card variant="elevated" padding="md">
                  <CardTitle className="text-sm mb-3">收购预览</CardTitle>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">当前股价:</span>
                      <span className="text-[var(--text-primary)] tabular-nums">{formatCurrency(currentPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">要约价格:</span>
                      <span className="text-[var(--success)] tabular-nums">{formatCurrency(offerPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">目标股数:</span>
                      <span className="text-[var(--text-primary)] tabular-nums">{targetShares.toLocaleString()}股</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">预估总成本:</span>
                      <span className={`tabular-nums ${totalCost > playerCash ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
                        {formatCurrency(totalCost)}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-[var(--border-muted)] pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">可用资金:</span>
                      <span className={`tabular-nums ${totalCost > playerCash ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                        {formatCurrency(playerCash)}
                      </span>
                    </div>
                  </div>
                </Card>
                
                {totalCost > playerCash && (
                  <p className="text-xs text-[var(--error)] text-center">⚠️ 资金不足，无法完成收购</p>
                )}
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowAcquisitionModal(null)}>取消</Button>
                <Button
                  variant="gradient"
                  onClick={executeAcquisition}
                  disabled={totalCost > playerCash}
                >
                  发起收购
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
      
      {/* 股票交易模态框保留在主组件中以便两个标签页都可以使用 */}
    </div>
  );
};

export default CompetitorsAndInvestment;
