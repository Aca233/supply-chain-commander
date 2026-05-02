/**
 * 游戏状态管理
 * 使用 Zustand 进行状态管理
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GameWorld, formatGameDate } from '@/core/world/GameWorld';
import {
  MonthlyNewsReport,
  onNewsGenerated,
  loadNewsHistory,
  getAllNews,
  getLatestNews as getLatestNewsFromStore,
  hasUnreadNews as checkUnreadNews,
  markNewsAsRead as markNewsRead,
  getNewsCount,
  fullResetNewsStore,
  resetNewsSystem,
  resetMonthlyStats,
  resetEventTracker,
} from '@/core/news';
import { initializeWorld, addBuilding, getBuildingSlotMethodsArray, setBuildingSlotMethod } from '@/core/world/WorldInitializer';
import { GameLoop, createGameLoop, TickResult, PerformanceReport } from '@/core/loop/GameLoop';
import { createBuyOrder, createSellOrder, createSellOrderWithReason, cancelOrder, getOrderBookView, OrderBookView, OrderResult } from '@/core/market/OrderBook';
import { soundManager } from '@/core/sound';
import { getMarketStats, MarketStats } from '@/core/market/MatchingEngine';
import { getPriceTrend, PriceTrend, getPriceSummary, PriceSummary } from '@/core/economy/PriceEngine';
import { getBuildingProductionStatus, BuildingProductionStatus, getBuildingProductionStatusWithMethods, getInventoryQualityName, getInventoryQualityPriceMultiplier } from '@/core/production/ProductionEngine';
import { QUALITY_INFO, QualityGrade } from '@/core/economy/QualitySystem';
import {
  perfMonitor,
  PerformanceSnapshot,
  FPSData,
  MemoryData,
  downloadPerformanceJSON,
  downloadPerformanceCSV,
  ExportOptions,
} from '@/core/performance';
import {
  applyForLoan,
  prepayLoan,
  getCompanyLoans,
  getCreditProfile,
  getAvailableLoanOptions,
  getBankingState,
  Loan,
  CreditProfile,
  LoanType
} from '@/core/finance/BankingSystem';
import { calculateCompanyOperatingCostPerTick } from '@/core/finance/OperatingCosts';
import { formatCurrency } from '@/ui/utils/format';
import {
  PlayerFinancialSnapshot,
  calculateCompanyAssetBreakdown,
  calculatePlayerFinancialSnapshot,
  createEmptyPlayerFinancialSnapshot,
} from '@/core/finance/FinancialSnapshot';
import {
  getMarketState,
  getStock,
  getHoldings,
  buyStock,
  sellStock,
  initiateIPO,
  IPOResult,
  Stock,
  Holding,
  StockMarketState
} from '@/core/finance/StockMarket';
import {
  BankruptcyStrategySettings,
  bankruptcyResolution,
  resetBankruptcyResolution,
} from '@/core/finance/BankruptcyResolution';
import {
  evaluateCompanyValue,
  initiateAcquisition,
  initiateAssetPurchase,
  confirmAssetTransaction,
  getOffersByCompany,
  getOffersForCompany,
  analyzeAcquisitionFeasibility,
  AcquisitionOffer,
  AcquisitionType
} from '@/core/finance/AcquisitionSystem';
import {
  CompanyProfile,
  ControlLevel,
  getCompanyProfile,
  getAllCompanyProfiles,
  getAICompanyProfiles,
  getPlayerHoldingProfiles,
  getPlayerControlledProfiles,
  calculatePlayerPortfolio,
  calculateMarketStats as calculateCompanyMarketStats,
} from '@/core/finance/CompanyProfile';
import {
  getPlayerControlLevel,
  getPlayerControlledCompanyIds,
  hasControlRight,
  setControlledCompanyStrategy,
  requestDividend,
  initiateAssetTransfer,
  ControlStrategy,
  ControlRight,
} from '@/core/finance/OwnershipControl';
import { ALL_GOODS, GoodsDefinition } from '@/data/goods';
import { ALL_BUILDINGS, BuildingTypeDefinition, isRetailBuilding } from '@/data/buildings';
import { getBaseMaterials, getBuildTime } from '@/data/buildingMaterials';
import {
  getCompanyConstructionQueue,
  getCompanyDemolitionQueue,
  cancelConstruction as cancelConstructionTask,
  cancelDemolition as cancelDemolitionTask,
  startConstruction as startConstructionTask,
  startUpgrade as startUpgradeTask,
  startDemolition as startDemolitionTask,
} from '@/core/construction/ConstructionTick';
import { ConstructionStatus, DemolitionStatus } from '@/core/world/GameWorld';
import { GOODS_COUNT, MAX_SLOTS, TICKS_PER_DAY } from '@/core/constants';
import {
  getRetailStoreDetails,
  getPlayerRetailStores,
  getRetailMarketOverview,
  setRetailPrice,
  setRetailMarkup,
  registerRetailStore,
} from '@/core/economy/RetailSystem';
import {
  getBuildingConfig,
  getSlotAvailableMethods,
  getMethodById,
  getBuildingSlotCount,
} from '@/core/production/ProductionMethods';

// UI bridge：组件层依赖的 slot config 形状
export interface UiBuildingSlotConfig {
  buildingTypeId: number;
  slots: {
    slotType: string;
    availableMethods: number[];
    defaultMethod: number;
  }[];
}

// UI bridge：方式视图（Vic3 风格 delta）
export interface UiProductionMethod {
  id: number;
  key: string;
  name: string;
  slotType: string;
  inputDelta: Array<{ goodsId: number; amount: number }>;
  outputDelta: Array<{ goodsId: number; amount: number }>;
  laborDelta: number;
  energyDelta: number;
  requiredLevel: number;
  switchCost: number;
  switchCooldown: number;
  description: string;
}

export interface UiMethodInfo {
  name: string;
  description: string;
  slotType: string;
  requiredLevel: number;
  switchCost: number;
  switchCooldown: number;
}
import {
  PRODUCTION_CONTROL_MODE_AUTO,
  PRODUCTION_CONTROL_MODE_MANUAL,
  PRODUCTION_EFFICIENCY_MIN,
  PRODUCTION_EFFICIENCY_MAX,
  clampManualEfficiencyTarget,
  canPlayerManageBuildingProduction,
  getBuildingManualEfficiencyTarget,
  getBuildingProductionControlMode,
  setBuildingManualEfficiencyTarget as setBuildingManualEfficiencyTargetCore,
  setBuildingProductionControlMode,
} from '@/core/production/ProductionControl';
import {
  getMonthlyPriceTracker,
  resetMonthlyPriceTracker,
  MonthlyPriceReport,
  GoodsMonthlyStats,
  MultiMonthComparisonReport,
} from '@/core/economy/MonthlyPriceTracker';
import {
  PriceDataExporter,
  PriceExportOptions,
  downloadPriceReportCSV,
  downloadPriceReportJSON,
} from '@/core/economy/PriceDataExporter';
import { saveManager } from '@/core/save/SaveManager';

/**
 * UI状态
 */
interface UIState {
  selectedGoodsId: number | null;
  selectedBuildingId: number | null;
  pendingBuildTypeId: number | null;  // 待打开建造弹窗的建筑类型ID
  currentPage: 'dashboard' | 'production' | 'market' | 'finance' | 'investment' | 'retail' | 'supplychain' | 'settings' | 'news';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  theme: 'light' | 'dark';
  favoriteCompanies: number[];
  // 新闻系统
  showNewsDialog: boolean;
  pendingNews: MonthlyNewsReport | null;
  newsDialogOpenSource: 'auto-generated' | 'manual';
  newsVersion: number;  // 用于触发新闻列表刷新
}

/**
 * 通知
 */
interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

/**
 * 历史数据点
 */
interface HistoryDataPoint {
  tick: number;
  revenue: number;
  cost: number;
  profit: number;
  cash: number;
  assets: number;
  // 额外的收入来源
  retailRevenue: number;
  productionValue: number;
  // 额外的支出来源
  maintenanceCost: number;
  laborCost: number;
  energyCost: number;
}

export interface BuildingProductionControlView {
  buildingId: number;
  ownerCompanyId: number;
  ownerCompanyName: string;
  canManage: boolean;
  mode: 'auto' | 'manual';
  autoAdjustEnabled: boolean;
  manualTarget: number;
  manualTargetRange: {
    min: number;
    max: number;
  };
}

/**
 * 游戏状态
 */
interface GameState {
  // 核心（world和gameLoop通过getter函数访问，不在immer state中）
  initialized: boolean;
  
  // 游戏状态
  tick: number;
  paused: boolean;
  speed: 1 | 2 | 4 | 8;
  gameDate: string;
  
  // 玩家数据
  playerCash: number;
  playerAssets: number;
  playerBuildings: number;
  playerFinancialSnapshot: PlayerFinancialSnapshot;
  
  // UI状态
  ui: UIState;
  
  // 最近tick结果
  lastTickResult: TickResult | null;
  
  // 性能
  performance: PerformanceReport | null;
  
  // 历史数据（最近100个tick）
  financialHistory: HistoryDataPoint[];
}

/**
 * 游戏操作
 */
interface GameActions {
  // 初始化
  initGame: () => void;
  loadGame: (saveId: string) => boolean;
  
  // 游戏控制
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  setSpeed: (speed: 1 | 2 | 4 | 8) => void;
  manualTick: () => void;
  
  // 交易
  placeBuyOrder: (goodsId: number, quantity: number, price: number) => boolean;
  placeSellOrder: (goodsId: number, quantity: number, price: number) => boolean;
  cancelPlayerOrder: (orderIdx: number) => boolean;
  
  // 建筑
  buildBuilding: (buildingTypeId: number, slotMethods?: number[]) => number | null;
  upgradeBuilding: (buildingId: number) => boolean;
  toggleBuildingActive: (buildingId: number) => boolean;
  getBuildingProductionControl: (buildingId: number) => BuildingProductionControlView | null;
  setBuildingProductionControlAuto: (buildingId: number, autoAdjustEnabled: boolean) => boolean;
  setBuildingManualProductionTarget: (buildingId: number, manualTarget: number) => boolean;
  demolishBuilding: (buildingId: number) => boolean;
  
  // 贷款
  applyLoan: (amount: number, loanType: LoanType, collateralType?: 'inventory' | 'building' | 'none') => { approved: boolean; loanId?: number; reason?: string };
  prepayPlayerLoan: (loanId: number) => { success: boolean; penalty?: number; reason?: string };
  getPlayerLoans: () => Loan[];
  getPlayerCreditProfile: () => CreditProfile | null;
  getPlayerLoanOptions: () => Array<{
    type: LoanType;
    name: string;
    maxAmount: number;
    interestRate: number;
    termDays: number;
    monthlyPayment: number;
  }>;
  
  // UI
  setSelectedGoods: (goodsId: number | null) => void;
  setSelectedBuilding: (buildingId: number | null) => void;
  setPendingBuildTypeId: (typeId: number | null) => void;
  navigateToBuildBuilding: (buildingTypeId: number) => void;
  setCurrentPage: (page: UIState['currentPage']) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (type: Notification['type'], message: string) => void;
  dismissNotification: (id: number) => void;
  
  // 生产方式槽位
  getBuildingSlotConfig: (buildingTypeId: number) => UiBuildingSlotConfig | null;
  getBuildingCurrentMethods: (buildingId: number) => number[];
  getAvailableMethodsForSlot: (buildingTypeId: number, slotIndex: number, buildingLevel: number) => UiProductionMethod[];
  changeBuildingSlotMethod: (buildingId: number, slotIndex: number, methodId: number) => { success: boolean; reason?: string };
  getMethodInfo: (methodId: number) => UiMethodInfo | null;
  
  // 数据获取
  getWorld: () => GameWorld | null;
  getTotalMoneySupply: () => { companyCash: number; householdCash: number; bankDeposits: number; total: number };
  getPlayerInventory: () => { goodsId: number; name: string; quantity: number; value: number }[];
  getOrderBook: (goodsId: number) => OrderBookView | null;
  getMarketStats: (goodsId: number) => MarketStats | null;
  getPriceTrend: (goodsId: number) => PriceTrend | null;
  getPriceSummary: () => PriceSummary | null;
  getBuildingStatus: (buildingId: number) => BuildingProductionStatus | null;
  getBuildingStatusWithMethods: (buildingId: number) => BuildingProductionStatus | null;
  getPlayerBuildings: () => { id: number; name: string; level: number; status: BuildingProductionStatus | null; slotMethods: number[]; isRetail?: boolean }[];
  getAllGoods: () => GoodsDefinition[];
  getAllBuildingTypes: () => BuildingTypeDefinition[];
  getFinancialHistory: () => HistoryDataPoint[];
  getInventoryQuality: (goodsId: number) => { name: string; priceMultiplier: number; color: string };
  
  // 零售系统
  getPlayerRetailStores: () => number[];
  getRetailStoreDetails: (retailId: number) => ReturnType<typeof getRetailStoreDetails> | null;
  getRetailMarketOverview: () => ReturnType<typeof getRetailMarketOverview> | null;
  setRetailPrice: (retailId: number, goodsId: number, price: number) => boolean;
  setRetailMarkup: (retailId: number, goodsId: number, markup: number) => boolean;
  
  // 股票市场
  getStockMarketState: () => StockMarketState | null;
  getStockInfo: (companyId: number) => Stock | null;
  getPlayerHoldings: () => Holding[];
  buyStockOrder: (stockCompanyId: number, quantity: number, orderType: 'market' | 'limit', limitPrice?: number) => boolean;
  sellStockOrder: (stockCompanyId: number, quantity: number, orderType: 'market' | 'limit', limitPrice?: number) => boolean;
  playerIPO: (offeringShares: number, offeringPrice: number) => IPOResult;
  getBankruptcyEvents: () => ReturnType<typeof bankruptcyResolution.getOpenEvents>;
  getBankruptcyStrategy: () => BankruptcyStrategySettings;
  updateBankruptcyStrategy: (patch: Partial<BankruptcyStrategySettings>) => void;
  placeBankruptcyBid: (eventId: string, assetId: string, amount: number, source?: 'manual' | 'strategy') => boolean;
  confirmBankruptcyPurchase: (eventId: string, assetId: string) => boolean;
  
  // 收购系统
  getCompanyValuation: (companyId: number) => { bookValue: number; marketValue: number; enterpriseValue: number; fairValue: number } | null;
  analyzeAcquisition: (targetId: number) => ReturnType<typeof analyzeAcquisitionFeasibility> | null;
  initiateAcquisitionOffer: (targetId: number, targetSharePercent: number, offerPrice: number) => boolean;
  initiateAssetBuy: (sellerId: number, assetType: 'building' | 'inventory', assetIds: number[], price: number) => boolean;
  getPlayerAcquisitionOffers: () => AcquisitionOffer[];
  
  // ============ 统一公司数据 (新增) ============
  getCompanyProfile: (companyId: number) => CompanyProfile | null;
  getAllCompanyProfiles: () => CompanyProfile[];
  getAICompanyProfiles: () => CompanyProfile[];
  getPlayerHoldingProfiles: () => CompanyProfile[];
  getPlayerControlledProfiles: () => CompanyProfile[];
  getPlayerPortfolio: () => { totalValue: number; totalCost: number; totalGain: number; gainPercent: number; holdingCount: number };
  getCompanyMarketStats: () => { rising: number; falling: number; unchanged: number; totalVolume: number; totalMarketCap: number };
  
  // ============ 控制权相关 (新增) ============
  getPlayerControlLevel: (companyId: number) => ControlLevel;
  getPlayerControlledCompanyIds: () => number[];
  hasPlayerControlRight: (companyId: number, right: ControlRight) => boolean;
  setControlledStrategy: (companyId: number, strategy: ControlStrategy) => boolean;
  requestCompanyDividend: (companyId: number, amount: number) => { success: boolean; playerReceived?: number; reason?: string };
  transferAssets: (fromId: number, toId: number, assetType: 'building' | 'inventory', assetIds: number[]) => { success: boolean; reason?: string };
  
  // ============ 收藏管理 (新增) ============
  toggleFavoriteCompany: (companyId: number) => void;
  getFavoriteCompanies: () => number[];
  
  // 性能监控
  getPerformanceSnapshot: () => PerformanceSnapshot | null;
  getPerformanceSnapshots: (count: number) => PerformanceSnapshot[];
  getFPSData: () => FPSData;
  getMemoryData: () => MemoryData;
  exportPerformanceJSON: (options?: Partial<ExportOptions>) => void;
  exportPerformanceCSV: (options?: Partial<ExportOptions>) => void;
  
  // ============ 建造队列系统 (新增) ============
  getConstructionQueue: () => Array<{
    taskId: number;
    queueIdx: number;
    buildingTypeId: number;
    buildingName: string;
    targetLevel: number;
    status: number;
    progress: number;
    progressTicks: number;
    requiredTicks: number;
    taskType: number;
    speedBoost: number;
    reservedMaterials: Array<{ goodsId: number; amount: number }>;
  }>;
  getDemolitionQueue: () => Array<{
    taskId: number;
    queueIdx: number;
    buildingId: number;
    buildingTypeId: number;
    buildingName: string;
    buildingLevel: number;
    status: number;
    progress: number;
    progressTicks: number;
    requiredTicks: number;
    recoveredCash: number;
    recoveredMaterials: Array<{ goodsId: number; amount: number }>;
  }>;
  pauseConstruction: (taskId: number) => boolean;
  resumeConstruction: (taskId: number) => boolean;
  cancelPlayerConstruction: (taskId: number) => boolean;
  cancelPlayerDemolition: (taskId: number) => boolean;
  
  // ============ 新闻系统 (新增) ============
  getNewsHistory: () => MonthlyNewsReport[];
  getLatestNews: () => MonthlyNewsReport | null;
  getNewsCount: () => number;
  hasUnreadNews: () => boolean;
  showNewsPopup: (news: MonthlyNewsReport, source?: 'auto-generated' | 'manual') => void;
  hideNewsDialog: () => void;
  markCurrentNewsRead: () => void;
  navigateToNews: () => void;
  
  // ============ 月度价格追踪 (新增) ============
  getMonthlyPriceData: (monthKey?: string) => MonthlyPriceReport | null;
  getCurrentMonthPriceData: () => MonthlyPriceReport | null;
  getAllMonthlyReports: () => MonthlyPriceReport[];
  getAvailableMonths: () => Array<{ key: string; label: string }>;
  getMultiMonthComparison: (monthKeys: string[]) => MultiMonthComparisonReport | null;
  exportPriceDataCSV: (options?: Partial<PriceExportOptions>) => void;
  exportPriceDataJSON: (options?: Partial<PriceExportOptions>) => void;
  exportMonthComparisonCSV: (monthKeys: string[], options?: Partial<PriceExportOptions>) => void;
  exportMonthComparisonJSON: (monthKeys: string[], options?: Partial<PriceExportOptions>) => void;
}

function syncPlayerFinancialState(
  state: Pick<GameState, 'playerCash' | 'playerAssets' | 'playerFinancialSnapshot' | 'financialHistory'>,
  world: GameWorld | null,
  fallbackTick: number,
) {
  const snapshot = calculatePlayerFinancialSnapshot({
    world,
    currentTick: world?.tick ?? fallbackTick,
    financialHistory: state.financialHistory,
  });

  state.playerCash = snapshot.cash;
  state.playerAssets = snapshot.operatingAssets;
  state.playerFinancialSnapshot = snapshot;
}

function countCompanyBuildings(world: GameWorld, ownerCompanyId: number): number {
  let buildingCount = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === ownerCompanyId) {
      buildingCount++;
    }
  }
  return buildingCount;
}

let notificationId = 0;

// 将world和gameLoop保存在store外部，避免被immer冻结
let worldRef: GameWorld | null = null;
let gameLoopRef: GameLoop | null = null;

// 性能优化：限制状态更新频率
let lastUIUpdateTick = 0;
const UI_UPDATE_INTERVAL = 1; // 每tick更新UI（1 tick=1天，每1秒刷新）

// 财务历史数据更新间隔
const HISTORY_UPDATE_INTERVAL = TICKS_PER_DAY; // 按天记录财务历史，和当前时间模型保持一致

// 建筑计数缓存
let cachedPlayerBuildingCount = 0;
let cachedBuildingCountTick = -100;
const BUILDING_COUNT_CACHE_INTERVAL = 24; // 每24tick更新一次建筑计数

function refreshPlayerBuildingCount(world: GameWorld, currentTick: number, force = false): number {
  if (force || currentTick - cachedBuildingCountTick >= BUILDING_COUNT_CACHE_INTERVAL) {
    cachedBuildingCountTick = currentTick;
    cachedPlayerBuildingCount = countCompanyBuildings(world, 0);
  }

  return cachedPlayerBuildingCount;
}

/**
 * 创建游戏Store
 */
export const useGameStore = create<GameState & GameActions>()(
  immer((set, get) => ({
    // 初始状态
    initialized: false,
    tick: 0,
    paused: true,
    speed: 1,
    gameDate: '第1年 1月1日',
    playerCash: 0,
    playerAssets: 0,
    playerBuildings: 0,
    playerFinancialSnapshot: createEmptyPlayerFinancialSnapshot(),
    ui: {
      selectedGoodsId: null,
      selectedBuildingId: null,
      pendingBuildTypeId: null,
      currentPage: 'dashboard',
      sidebarCollapsed: false,
      notifications: [],
      theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
      favoriteCompanies: [],
      // 新闻系统
      showNewsDialog: false,
      pendingNews: null,
      newsDialogOpenSource: 'manual',
      newsVersion: 0,
    },
    lastTickResult: null,
    performance: null,
    financialHistory: [],
    
    // ==================== 初始化 ====================
    initGame: () => {
      const world = initializeWorld();
      resetBankruptcyResolution();
      const savedSettings = saveManager.loadSettings();
      if (savedSettings.bankruptcyStrategy) {
        bankruptcyResolution.setStrategy(0, savedSettings.bankruptcyStrategy);
      }
      let lastRecordedPlayerCash = world.companies.cash[0];
      let pendingTradeRevenue = 0;
      let pendingTradeCost = 0;
      let pendingRetailRevenue = 0;
      let pendingCashOperatingCost = 0;
      let pendingMaintenanceCost = 0;
      let pendingLaborCost = 0;
      let pendingEnergyCost = 0;
      
      // 【重要】在创建GameLoop之前重置新闻系统，因为GameLoop会初始化并捕获快照
      fullResetNewsStore();  // 清除localStorage中的旧新闻
      resetNewsSystem();     // 重置生成器状态
      resetMonthlyStats();   // 重置月度快照
      resetEventTracker();   // 重置事件追踪
      
      // 创建游戏循环（这会调用 initNewsSystem 捕获初始快照）
      const gameLoop = createGameLoop(world);
      
      // 保存到外部引用（不被immer冻结）
      worldRef = world;
      gameLoopRef = gameLoop;
      
      // 加载新闻历史（现在是空的）并注册新闻回调
      loadNewsHistory();
      onNewsGenerated((report) => {
        // 当新闻生成时，显示弹窗并触发列表刷新
        set((state) => {
          state.ui.pendingNews = report;
          state.ui.showNewsDialog = true;
          state.ui.newsDialogOpenSource = 'auto-generated';
          state.ui.newsVersion += 1;  // 触发新闻页面刷新
        });
        
        // 添加通知
        get().addNotification('info', `📰 ${report.headline.title}`);
      });
      
      // 设置tick回调（性能优化版本）
      gameLoop.onTick((result) => {
        const currentTick = result.tick;
        const shouldUpdateUI = currentTick - lastUIUpdateTick >= UI_UPDATE_INTERVAL;
        const shouldUpdateHistory = currentTick % HISTORY_UPDATE_INTERVAL === 0;
        const playerOperatingCosts = worldRef
          ? calculateCompanyOperatingCostPerTick(worldRef, 0)
          : { maintenance: 0, labor: 0, energy: 0, total: 0, cashExpense: 0, nonCashExpense: 0 };
        
        let tradeRevenue = 0;
        let tradeCost = 0;
        const trades = result.matching.trades || [];
        for (const trade of trades) {
          if (trade.sellCompanyId === 0) {
            tradeRevenue += trade.value;
          }
          if (trade.buyCompanyId === 0) {
            tradeCost += trade.value;
          }
        }
        
        pendingTradeRevenue += tradeRevenue;
        pendingTradeCost += tradeCost;
        pendingRetailRevenue += result.retailResult.playerRevenue || 0;
        pendingCashOperatingCost += playerOperatingCosts.cashExpense;
        pendingMaintenanceCost += playerOperatingCosts.maintenance;
        pendingLaborCost += playerOperatingCosts.labor;
        pendingEnergyCost += playerOperatingCosts.energy;
        
        // 始终更新tick（轻量级）
        set((state) => {
          state.tick = currentTick;
          state.lastTickResult = result;
          
          // 仅在需要时更新其他UI状态（减少渲染开销）
          if (shouldUpdateUI) {
            lastUIUpdateTick = currentTick;
            state.gameDate = formatGameDate(currentTick);
            
            // 更新玩家数据（从外部引用读取）
            if (worldRef) {
              syncPlayerFinancialState(state, worldRef, currentTick);
              state.playerBuildings = refreshPlayerBuildingCount(worldRef, currentTick);
            }
            
            state.performance = gameLoop.getPerformanceReport();
          }
          
          // 财务历史数据更新（降低频率）
          if (shouldUpdateHistory && worldRef) {
            // 计算生产价值（估算：基于玩家建筑的产出）
            let productionValue = 0;
            const maintenanceCost = pendingMaintenanceCost;
            const laborCost = pendingLaborCost;
            const energyCost = pendingEnergyCost;
            const retailRevenue = pendingRetailRevenue;
            
            // 综合收入和支出
            const totalRevenue = pendingTradeRevenue + retailRevenue;
            const totalCost = pendingTradeCost + pendingCashOperatingCost;
            
            const currentCash = worldRef.companies.cash[0];
            const cashChange = currentCash - lastRecordedPlayerCash;
            
            // 如果现金变化与计算的利润不符，调整收入或支出
            const calculatedProfit = totalRevenue - totalCost;
            const unmatchedChange = cashChange - calculatedProfit;
            
            let adjustedRevenue = totalRevenue;
            let adjustedCost = totalCost;
            const assetBreakdown = calculateCompanyAssetBreakdown(worldRef, 0);
            
            if (unmatchedChange > 0) {
              // 有未记录的收入
              adjustedRevenue += unmatchedChange;
            } else if (unmatchedChange < 0) {
              // 有未记录的支出
              adjustedCost += Math.abs(unmatchedChange);
            }
            
            const historyPoint: HistoryDataPoint = {
              tick: currentTick,
              revenue: adjustedRevenue,
              cost: adjustedCost,
              profit: adjustedRevenue - adjustedCost,
              cash: currentCash,
              assets: assetBreakdown.totalAssets,
              retailRevenue,
              productionValue,
              maintenanceCost,
              laborCost,
              energyCost,
            };
            
            state.financialHistory.push(historyPoint);
            
            // 保留最近100个数据点
            if (state.financialHistory.length > 100) {
              state.financialHistory = state.financialHistory.slice(-100);
            }

            syncPlayerFinancialState(state, worldRef, currentTick);
            
            lastRecordedPlayerCash = currentCash;
            pendingTradeRevenue = 0;
            pendingTradeCost = 0;
            pendingRetailRevenue = 0;
            pendingCashOperatingCost = 0;
            pendingMaintenanceCost = 0;
            pendingLaborCost = 0;
            pendingEnergyCost = 0;
          }
        });
      });

      lastUIUpdateTick = world.tick;

      set((state) => {
        state.initialized = true;
        syncPlayerFinancialState(state, world, world.tick);
        state.tick = world.tick;
        state.gameDate = formatGameDate(world.tick);
        state.playerBuildings = refreshPlayerBuildingCount(world, world.tick, true);
      });
    },

    loadGame: (saveId) => {
      if (!worldRef || !gameLoopRef) {
        get().initGame();
      }

      if (!worldRef) {
        return false;
      }

      gameLoopRef?.pause();
      const saveData = saveManager.load(saveId, worldRef);
      if (!saveData) {
        return false;
      }

      lastUIUpdateTick = worldRef.tick;

      set((state) => {
        state.initialized = true;
        state.paused = true;
        state.lastTickResult = null;
        state.financialHistory = [];
        state.tick = worldRef!.tick;
        state.gameDate = formatGameDate(worldRef!.tick);
        syncPlayerFinancialState(state, worldRef, worldRef!.tick);
        state.playerBuildings = refreshPlayerBuildingCount(worldRef!, worldRef!.tick, true);
        state.performance = gameLoopRef?.getPerformanceReport() ?? null;
        state.ui.currentPage = 'dashboard';
      });

      return true;
    },
    
    // ==================== 游戏控制 ====================
    startGame: () => {
      if (gameLoopRef) {
        gameLoopRef.start();
        set((state) => {
          state.paused = false;
        });
      }
    },
    
    pauseGame: () => {
      if (gameLoopRef) {
        gameLoopRef.pause();
        set((state) => {
          state.paused = true;
        });
      }
    },
    
    resumeGame: () => {
      if (gameLoopRef) {
        gameLoopRef.resume();
        set((state) => {
          state.paused = false;
        });
      }
    },
    
    setSpeed: (speed) => {
      if (gameLoopRef) {
        gameLoopRef.setSpeed(speed);
        set((state) => {
          state.speed = speed;
        });
      }
    },
    
    manualTick: () => {
      if (gameLoopRef) {
        gameLoopRef.manualTick();
      }
    },
    
    // ==================== 交易 ====================
    placeBuyOrder: (goodsId, quantity, price) => {
      if (!worldRef) return false;
      
      const orderId = createBuyOrder(worldRef, 0, goodsId, quantity, price);
      if (orderId !== null) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        soundManager.playOrderPlace();
        get().addNotification('success', `买单已提交: ${quantity}单位 @ ${formatCurrency(price)}`);
        return true;
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', '买单提交失败：资金不足或订单池已满');
        return false;
      }
    },
    
    placeSellOrder: (goodsId, quantity, price) => {
      if (!worldRef) return false;
      
      const result = createSellOrderWithReason(worldRef, 0, goodsId, quantity, price);
      if (result.success) {
        const actualQty = result.actualQuantity ?? quantity;
        soundManager.playOrderPlace();
        get().addNotification('success', `卖单已提交: ${actualQty.toFixed(0)}单位 @ ${formatCurrency(price)}`);
        return true;
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', `卖单提交失败：${result.reason || '未知错误'}`);
        return false;
      }
    },
    
    cancelPlayerOrder: (orderIdx) => {
      if (!worldRef) return false;
      
      const success = cancelOrder(worldRef, orderIdx);
      if (success) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        soundManager.playOrderCancel();
        get().addNotification('info', '订单已取消');
      }
      return success;
    },
    
    // ==================== 建筑 ====================
    buildBuilding: (buildingTypeId, slotMethods) => {
      if (!worldRef) return null;
      
      try {
        const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
        if (!building) {
          get().addNotification('error', '未知的建筑类型');
          return null;
        }
        
        // 获取建造材料需求
        const requiredMaterials = getBaseMaterials(buildingTypeId);
        
        // 计算材料缺口和成本
        const playerCompanyId = 0;
        let totalMaterialCost = 0;
        const materialsToBuy: Array<{ goodsId: number; amount: number; price: number }> = [];
        
        for (const mat of requiredMaterials) {
          const inventoryIdx = playerCompanyId * GOODS_COUNT + mat.goodsId;
          const available = worldRef.companies.inventories[inventoryIdx] || 0;
          const missing = Math.max(0, mat.amount - available);
          
          if (missing > 0) {
            const marketPrice = worldRef.goods.prices[mat.goodsId] || 100;
            const buyPrice = marketPrice * 1.1; // 10%溢价
            totalMaterialCost += missing * buyPrice;
            materialsToBuy.push({ goodsId: mat.goodsId, amount: missing, price: buyPrice });
          }
        }
        
        // 计算总费用
        const totalCost = building.buildCost + totalMaterialCost;
        
        // 检查资金
        if (worldRef.companies.cash[0] < totalCost) {
          soundManager.playTradeFail();
          get().addNotification('error', `资金不足！需要 ${formatCurrency(totalCost)}`);
          return null;
        }
        
        // 扣除建造费用
        worldRef.companies.cash[0] -= building.buildCost;
        
        // 为缺少的材料挂买单
        for (const mat of materialsToBuy) {
          const orderId = createBuyOrder(worldRef, 0, mat.goodsId, mat.amount, mat.price);
          if (orderId !== null) {
            const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
            get().addNotification('info', `已挂单采购 ${mat.amount.toFixed(0)} ${goods?.name || '材料'}`);
          }
        }
        
        // 添加到建造队列
        const result = startConstructionTask(worldRef, playerCompanyId, buildingTypeId, slotMethods);
        
        if (!result.success) {
          // 退还建造费用
          worldRef.companies.cash[0] += building.buildCost;
          soundManager.playTradeFail();
          get().addNotification('error', `建造失败：${result.error || '未知错误'}`);
          return null;
        }
        
        set((state) => {
          // 强制触发 tick 更新以刷新建造队列UI
          state.tick = state.tick + 0.001;
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        
        soundManager.playBuildComplete();
        if (materialsToBuy.length > 0) {
          get().addNotification('success', `建筑已加入建造队列！已自动采购 ${materialsToBuy.length} 种材料`);
        } else {
          get().addNotification('success', '建筑已加入建造队列！');
        }
        
        // 返回队列索引作为临时ID（建筑完成后会有真正的ID）
        return result.queueIdx ?? -1;
      } catch (e) {
        console.error('Build building error:', e);
        soundManager.playTradeFail();
        get().addNotification('error', '建筑建造失败');
        return null;
      }
    },
    
    upgradeBuilding: (buildingId) => {
      if (!worldRef) return false;
      
      // 检查建筑所有权
      if (worldRef.buildings.owners[buildingId] !== 0) {
        get().addNotification('error', '无法升级不属于你的建筑');
        return false;
      }
      
      const currentLevel = worldRef.buildings.levels[buildingId];
      const typeId = worldRef.buildings.types[buildingId];
      const building = ALL_BUILDINGS.find(b => b.id === typeId);
      
      if (!building) {
        get().addNotification('error', '建筑类型无效');
        return false;
      }
      
      if (currentLevel >= building.maxLevel) {
        get().addNotification('warning', '建筑已达最高等级');
        return false;
      }
      
      const targetLevel = currentLevel + 1;
      const upgradeCost = building.upgradeCosts[currentLevel] || building.buildCost * 0.5;
      
      // 获取升级材料需求（建造材料的50%）
      const baseMaterials = getBaseMaterials(typeId);
      const upgradeMaterials = baseMaterials.map(mat => ({
        goodsId: mat.goodsId,
        amount: Math.ceil(mat.amount * 0.5) // 升级只需50%材料
      }));
      
      // 计算材料缺口和成本
      const playerCompanyId = 0;
      let totalMaterialCost = 0;
      const materialsToBuy: Array<{ goodsId: number; amount: number; price: number }> = [];
      
      for (const mat of upgradeMaterials) {
        const inventoryIdx = playerCompanyId * GOODS_COUNT + mat.goodsId;
        const available = worldRef.companies.inventories[inventoryIdx] || 0;
        const missing = Math.max(0, mat.amount - available);
        
        if (missing > 0) {
          const marketPrice = worldRef.goods.prices[mat.goodsId] || 100;
          const buyPrice = marketPrice * 1.1; // 10%溢价
          totalMaterialCost += missing * buyPrice;
          materialsToBuy.push({ goodsId: mat.goodsId, amount: missing, price: buyPrice });
        }
      }
      
      // 计算总费用
      const totalCost = upgradeCost + totalMaterialCost;
      const playerCash = worldRef.companies.cash[0];
      
      if (playerCash < totalCost) {
        get().addNotification('error', `资金不足，升级需要 ${formatCurrency(totalCost)}`);
        return false;
      }
      
      // 扣除升级费用
      worldRef.companies.cash[0] -= upgradeCost;
      
      // 为缺少的材料挂买单
      for (const mat of materialsToBuy) {
        const orderId = createBuyOrder(worldRef, 0, mat.goodsId, mat.amount, mat.price);
        if (orderId !== null) {
          const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
          get().addNotification('info', `已挂单采购 ${mat.amount.toFixed(0)} ${goods?.name || '材料'}`);
        }
      }
      
      // 添加到建造队列（升级任务）
      const result = startUpgradeTask(worldRef, playerCompanyId, buildingId, targetLevel);
      
      if (!result.success) {
        // 退还升级费用
        worldRef.companies.cash[0] += upgradeCost;
        soundManager.playTradeFail();
        get().addNotification('error', `升级失败：${result.error || '未知错误'}`);
        return false;
      }
      
      set((state) => {
        // 强制触发 tick 更新以刷新建造队列UI
        state.tick = state.tick + 0.001;
        syncPlayerFinancialState(state, worldRef, state.tick);
      });
      
      soundManager.playUpgrade();
      if (materialsToBuy.length > 0) {
        get().addNotification('success', `${building.name} 已加入升级队列！已自动采购 ${materialsToBuy.length} 种材料`);
      } else {
        get().addNotification('success', `${building.name} 已加入升级队列！`);
      }
      return true;
    },
    
    toggleBuildingActive: (buildingId) => {
      if (!worldRef) return false;
      
      // 检查建筑所有权
      if (worldRef.buildings.owners[buildingId] !== 0) {
        get().addNotification('error', '无法控制不属于你的建筑');
        return false;
      }
      
      const isActive = worldRef.buildings.isActive[buildingId];
      // isActive 是 Uint8Array，用 1 和 0 表示激活状态
      worldRef.buildings.isActive[buildingId] = isActive ? 0 : 1;
      
      if (isActive) {
        get().addNotification('info', '建筑已暂停生产');
      } else {
        get().addNotification('success', '建筑已恢复生产');
      }
      
      return true;
    },
    

    getBuildingProductionControl: (buildingId: number) => {
      if (!worldRef) return null;
      if (buildingId < 0 || buildingId >= worldRef.buildings.count) return null;

      const ownerCompanyId = worldRef.buildings.owners[buildingId];
      const ownerCompanyName = ownerCompanyId === 0
        ? '玩家公司'
        : (worldRef.companies.names[ownerCompanyId] || `公司#${ownerCompanyId}`);
      const canManage = canPlayerManageBuildingProduction(worldRef, 0, buildingId);
      const modeId = getBuildingProductionControlMode(worldRef, buildingId);
      const manualTarget = getBuildingManualEfficiencyTarget(worldRef, buildingId);

      return {
        buildingId,
        ownerCompanyId,
        ownerCompanyName,
        canManage,
        mode: modeId === PRODUCTION_CONTROL_MODE_MANUAL ? 'manual' : 'auto',
        autoAdjustEnabled: modeId === PRODUCTION_CONTROL_MODE_AUTO,
        manualTarget,
        manualTargetRange: {
          min: PRODUCTION_EFFICIENCY_MIN,
          max: PRODUCTION_EFFICIENCY_MAX,
        },
      };
    },

    setBuildingProductionControlAuto: (buildingId: number, autoAdjustEnabled: boolean) => {
      if (!worldRef) return false;
      if (buildingId < 0 || buildingId >= worldRef.buildings.count) return false;

      if (!canPlayerManageBuildingProduction(worldRef, 0, buildingId)) {
        get().addNotification('error', '你没有权限管理该建筑产量（需要 influence_strategy）');
        return false;
      }

      setBuildingProductionControlMode(
        worldRef,
        buildingId,
        autoAdjustEnabled ? PRODUCTION_CONTROL_MODE_AUTO : PRODUCTION_CONTROL_MODE_MANUAL
      );

      set((state) => {
        state.tick = state.tick + 0.001;
      });
      return true;
    },

    setBuildingManualProductionTarget: (buildingId: number, manualTarget: number) => {
      if (!worldRef) return false;
      if (buildingId < 0 || buildingId >= worldRef.buildings.count) return false;

      if (!canPlayerManageBuildingProduction(worldRef, 0, buildingId)) {
        get().addNotification('error', '你没有权限管理该建筑产量（需要 influence_strategy）');
        return false;
      }

      setBuildingManualEfficiencyTargetCore(worldRef, buildingId, clampManualEfficiencyTarget(manualTarget));
      set((state) => {
        state.tick = state.tick + 0.001;
      });
      return true;
    },
    
    demolishBuilding: (buildingId) => {
      if (!worldRef) return false;
      
      // 检查建筑所有权
      if (worldRef.buildings.owners[buildingId] !== 0) {
        get().addNotification('error', '无法拆除不属于你的建筑');
        return false;
      }
      
      // 添加到拆除队列
      const result = startDemolitionTask(worldRef, 0, buildingId);
      
      if (!result.success) {
        soundManager.playTradeFail();
        get().addNotification('error', `拆除失败：${result.error || '未知错误'}`);
        return false;
      }
      
      set((state) => {
        // 强制触发 tick 更新以刷新UI
        state.tick = state.tick + 0.001;
      });
      
      soundManager.playOrderPlace();
      get().addNotification('success', '建筑已加入拆除队列！');
      
      return true;
    },
    
    // ==================== 贷款 ====================
    applyLoan: (amount, loanType, collateralType = 'none') => {
      if (!worldRef) return { approved: false, reason: '游戏未初始化' };
      
      const result = applyForLoan(worldRef, 0, amount, loanType, collateralType);
      
      if (result.approved) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        soundManager.playCoin();
        get().addNotification('success', `贷款申请成功！获得 ${formatCurrency(amount)}`);
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', `贷款申请失败：${result.reason}`);
      }
      
      return result;
    },
    
    prepayPlayerLoan: (loanId) => {
      if (!worldRef) return { success: false, reason: '游戏未初始化' };
      
      const result = prepayLoan(worldRef, loanId);
      
      if (result.success) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        soundManager.playTradeSuccess();
        get().addNotification('success', `贷款已提前还清${result.penalty ? `，罚金 ${formatCurrency(result.penalty)}` : ''}`);
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', `还款失败：${result.reason}`);
      }
      
      return result;
    },
    
    getPlayerLoans: () => {
      if (!worldRef) return [];
      return getCompanyLoans(0);
    },
    
    getPlayerCreditProfile: () => {
      if (!worldRef) return null;
      return getCreditProfile(0);
    },
    
    getPlayerLoanOptions: () => {
      if (!worldRef) return [];
      return getAvailableLoanOptions(worldRef, 0);
    },
    
    // ==================== UI ====================
    setSelectedGoods: (goodsId) => {
      set((state) => {
        state.ui.selectedGoodsId = goodsId;
      });
    },
    
    setSelectedBuilding: (buildingId) => {
      set((state) => {
        state.ui.selectedBuildingId = buildingId;
      });
    },
    
    setPendingBuildTypeId: (typeId) => {
      set((state) => {
        state.ui.pendingBuildTypeId = typeId;
      });
    },
    
    navigateToBuildBuilding: (buildingTypeId) => {
      set((state) => {
        state.ui.pendingBuildTypeId = buildingTypeId;
        state.ui.currentPage = 'production';
      });
    },
    
    setCurrentPage: (page) => {
      set((state) => {
        state.ui.currentPage = page;
      });
    },
    
    toggleSidebar: () => {
      set((state) => {
        state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
      });
    },
    
    toggleTheme: () => {
      set((state) => {
        const newTheme = state.ui.theme === 'dark' ? 'light' : 'dark';
        state.ui.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        // 更新 document class
        if (newTheme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      });
    },
    
    setTheme: (theme) => {
      set((state) => {
        state.ui.theme = theme;
        localStorage.setItem('theme', theme);
        if (theme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      });
    },
    
    addNotification: (type, message) => {
      const id = ++notificationId;
      set((state) => {
        state.ui.notifications.push({
          id,
          type,
          message,
          timestamp: Date.now(),
        });
        
        // 最多保留10条
        if (state.ui.notifications.length > 10) {
          state.ui.notifications.shift();
        }
      });
      
      // 5秒后自动消失
      setTimeout(() => {
        get().dismissNotification(id);
      }, 5000);
    },
    
    dismissNotification: (id) => {
      set((state) => {
        state.ui.notifications = state.ui.notifications.filter(n => n.id !== id);
      });
    },
    
    // ==================== 生产方式槽位 ====================
    getBuildingSlotConfig: (buildingTypeId) => {
      const newConfig = getBuildingConfig(buildingTypeId);
      if (!newConfig) return null;
      return {
        buildingTypeId,
        slots: newConfig.slots.map((slot: { id: string }) => {
          const methods = getSlotAvailableMethods(buildingTypeId, slot.id);
          return {
            slotType: 'process',
            availableMethods: methods.map((m: { id: number }) => m.id),
            defaultMethod: methods[0]?.id || 0,
          };
        }),
      };
    },
    
    getBuildingCurrentMethods: (buildingId) => {
      if (!worldRef) return [];
      
      // 直接从worldRef读取，避免模块缓存问题
      const b = worldRef.buildings;
      const slotOffset = buildingId * MAX_SLOTS;
      const buildingTypeId = b.types[buildingId];
      const slotCount = getBuildingSlotCount(buildingTypeId);
      
      const methods: number[] = [];
      for (let i = 0; i < slotCount; i++) {
        methods.push(b.slotMethods[slotOffset + i]);
      }
      return methods;
    },
    
    getAvailableMethodsForSlot: (buildingTypeId, slotIndex, buildingLevel) => {
      const newConfig = getBuildingConfig(buildingTypeId);
      if (!newConfig || slotIndex >= newConfig.slots.length) return [];

      const slot = newConfig.slots[slotIndex];
      const methods = getSlotAvailableMethods(buildingTypeId, slot.id);

      return methods
        .filter(m => m.requiredLevel <= buildingLevel)
        .map<UiProductionMethod>(m => ({
          id: m.id,
          key: m.key,
          name: m.name,
          slotType: 'process',
          inputDelta: m.inputDelta.map(d => ({ goodsId: d.goodsId, amount: d.amount })),
          outputDelta: m.outputDelta.map(d => ({ goodsId: d.goodsId, amount: d.amount })),
          laborDelta: m.laborDelta,
          energyDelta: m.energyDelta,
          requiredLevel: m.requiredLevel,
          switchCost: m.switchCost,
          switchCooldown: m.switchCooldown,
          description: m.description,
        }));
    },
    
    changeBuildingSlotMethod: (buildingId, slotIndex, methodId) => {
      if (!worldRef) return { success: false, reason: '游戏未初始化' };
      
      const b = worldRef.buildings;
      
      // 检查建筑是否存在
      if (buildingId >= b.count) {
        return { success: false, reason: '建筑不存在' };
      }
      
      // 检查是否是玩家建筑
      if (b.owners[buildingId] !== 0) {
        return { success: false, reason: '无法修改非玩家建筑的生产方式' };
      }
      
      const buildingTypeId = b.types[buildingId];
      const buildingLevel = b.levels[buildingId];

      const newConfig = getBuildingConfig(buildingTypeId);
      if (!newConfig || slotIndex >= newConfig.slots.length) {
        return { success: false, reason: '无效的槽位索引' };
      }

      const slot = newConfig.slots[slotIndex] as { id: string; name: string };

      // methodId === 0 表示清空槽位
      if (methodId === 0) {
        const slotOffset = buildingId * MAX_SLOTS;
        worldRef.buildings.slotMethods[slotOffset + slotIndex] = 0;
        get().addNotification('info', `已清空「${slot.name}」槽位`);
        return { success: true };
      }

      const newMethod = getMethodById(methodId) as {
        id: number;
        name: string;
        buildingTypeId: number;
        slotId: string;
        requiredLevel: number;
        switchCost: number;
      } | null;

      if (!newMethod) {
        return { success: false, reason: '无效的生产方式ID' };
      }
      if (newMethod.buildingTypeId !== buildingTypeId) {
        return { success: false, reason: '该生产方式不属于此建筑' };
      }
      if (newMethod.slotId !== slot.id) {
        return { success: false, reason: '该生产方式不属于此槽位' };
      }
      if (newMethod.requiredLevel > buildingLevel) {
        return { success: false, reason: `需要建筑等级 ${newMethod.requiredLevel}` };
      }

      const switchCost = newMethod.switchCost || 50000;
      const playerCash = worldRef.companies.cash[0];
      if (playerCash < switchCost) {
        return { success: false, reason: `资金不足，切换需要 ${formatCurrency(switchCost)}` };
      }

      worldRef.companies.cash[0] -= switchCost;
      const slotOffset = buildingId * MAX_SLOTS;
      worldRef.buildings.slotMethods[slotOffset + slotIndex] = methodId;

      set((state) => {
        state.tick = state.tick + 0.001;
        syncPlayerFinancialState(state, worldRef, state.tick);
      });

      get().addNotification('success', `已切换到「${newMethod.name}」，花费 ${formatCurrency(switchCost)}`);
      return { success: true };
    },
    
    getMethodInfo: (methodId): UiMethodInfo | null => {
      const method = getMethodById(methodId);
      if (!method) return null;
      return {
        name: method.name,
        description: method.description || '',
        slotType: 'process',
        requiredLevel: method.requiredLevel,
        switchCost: method.switchCost,
        switchCooldown: method.switchCooldown,
      };
    },
    
    // ==================== 数据获取 ====================
    getWorld: () => worldRef,

    getTotalMoneySupply: () => {
      if (!worldRef) return { companyCash: 0, householdCash: 0, bankDeposits: 0, total: 0 };
      let companyCash = 0;
      for (let i = 0; i < worldRef.companies.count; i++) {
        companyCash += worldRef.companies.cash[i];
      }
      const householdCash = worldRef.households.cash[0];
      const bankDeposits = getBankingState().totalDeposits;
      return {
        companyCash,
        householdCash,
        bankDeposits,
        total: companyCash + householdCash + bankDeposits,
      };
    },

    getPlayerInventory: () => {
      if (!worldRef) return [];
      
      const inventory: { goodsId: number; name: string; quantity: number; value: number }[] = [];
      
      for (let i = 0; i < worldRef.goods.count; i++) {
        const quantity = worldRef.companies.inventories[0 * GOODS_COUNT + i];
        if (quantity > 0) {
          inventory.push({
            goodsId: i,
            name: worldRef.goods.names[i],
            quantity,
            value: quantity * worldRef.goods.prices[i],
          });
        }
      }
      
      return inventory.sort((a, b) => b.value - a.value);
    },
    
    getOrderBook: (goodsId) => {
      if (!worldRef) return null;
      return getOrderBookView(worldRef, goodsId);
    },
    
    getMarketStats: (goodsId) => {
      if (!worldRef) return null;
      return getMarketStats(worldRef, goodsId);
    },
    
    getPriceTrend: (goodsId) => {
      if (!worldRef) return null;
      return getPriceTrend(worldRef, goodsId);
    },
    
    getPriceSummary: () => {
      if (!worldRef) return null;
      return getPriceSummary(worldRef);
    },
    
    getBuildingStatus: (buildingId) => {
      if (!worldRef) return null;
      return getBuildingProductionStatus(worldRef, buildingId);
    },
    
    getBuildingStatusWithMethods: (buildingId) => {
      if (!worldRef) return null;
      return getBuildingProductionStatusWithMethods(worldRef, buildingId);
    },
    
    getPlayerBuildings: () => {
      if (!worldRef) return [];
      
      const buildings: { id: number; name: string; level: number; status: BuildingProductionStatus | null; slotMethods: number[]; isRetail?: boolean }[] = [];
      
      for (let i = 0; i < worldRef.buildings.count; i++) {
        if (worldRef.buildings.owners[i] === 0) {
          const typeId = worldRef.buildings.types[i];
          const buildingType = ALL_BUILDINGS.find(b => b.id === typeId);
          const isRetail = isRetailBuilding(typeId);
          buildings.push({
            id: i,
            name: buildingType?.name ?? `建筑 ${i}`,
            level: worldRef.buildings.levels[i],
            status: isRetail ? null : getBuildingProductionStatusWithMethods(worldRef, i),
            slotMethods: isRetail ? [] : getBuildingSlotMethodsArray(worldRef, i),
            isRetail,
          });
        }
      }
      
      return buildings;
    },
    
    getAllGoods: () => ALL_GOODS,
    
    getAllBuildingTypes: () => ALL_BUILDINGS,
    
    getFinancialHistory: () => {
      const state = get();
      return state.financialHistory;
    },
    
    getInventoryQuality: (goodsId: number) => {
      if (!worldRef) return { name: '标准', priceMultiplier: 1.0, color: '#60a5fa' };
      
      const name = getInventoryQualityName(worldRef, 0, goodsId);
      const priceMultiplier = getInventoryQualityPriceMultiplier(worldRef, 0, goodsId);
      
      // 根据名称获取颜色
      const colors: Record<string, string> = {
        '劣质': '#9ca3af',
        '标准': '#60a5fa',
        '良好': '#4ade80',
        '优质': '#a78bfa',
        '奢华': '#fbbf24',
      };
      
      return {
        name,
        priceMultiplier,
        color: colors[name] || '#60a5fa',
      };
    },
    
    // ==================== 零售系统 ====================
    
    getPlayerRetailStores: () => {
      if (!worldRef) return [];
      return getPlayerRetailStores(worldRef, 0);
    },
    
    getRetailStoreDetails: (retailId: number) => {
      if (!worldRef) return null;
      return getRetailStoreDetails(worldRef, retailId);
    },
    
    getRetailMarketOverview: () => {
      if (!worldRef) return null;
      return getRetailMarketOverview(worldRef);
    },
    
    setRetailPrice: (retailId: number, goodsId: number, price: number) => {
      if (!worldRef) return false;
      return setRetailPrice(worldRef, retailId, goodsId, price);
    },
    
    setRetailMarkup: (retailId: number, goodsId: number, markup: number) => {
      if (!worldRef) return false;
      return setRetailMarkup(worldRef, retailId, goodsId, markup);
    },
    
    // ==================== 股票市场 ====================
    getStockMarketState: () => {
      return getMarketState();
    },
    
    getStockInfo: (companyId: number) => {
      return getStock(companyId);
    },
    
    getPlayerHoldings: () => {
      return getHoldings(0);
    },
    
    buyStockOrder: (stockCompanyId: number, quantity: number, orderType: 'market' | 'limit', limitPrice?: number) => {
      if (!worldRef) return false;
      
      const orderId = buyStock(worldRef, 0, stockCompanyId, quantity, orderType, limitPrice);
      if (orderId !== null) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        const stock = getStock(stockCompanyId);
        soundManager.playTradeSuccess();
        get().addNotification('success', `买入股票 ${stock?.ticker || ''} ${quantity}股`);
        return true;
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', '买入失败：资金不足或股票不可交易');
        return false;
      }
    },
    
    sellStockOrder: (stockCompanyId: number, quantity: number, orderType: 'market' | 'limit', limitPrice?: number) => {
      if (!worldRef) return false;
      
      const orderId = sellStock(worldRef, 0, stockCompanyId, quantity, orderType, limitPrice);
      if (orderId !== null) {
        const stock = getStock(stockCompanyId);
        soundManager.playTradeSuccess();
        get().addNotification('success', `卖出股票 ${stock?.ticker || ''} ${quantity}股`);
        return true;
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', '卖出失败：持股不足或股票不可交易');
        return false;
      }
    },
    
    playerIPO: (offeringShares: number, offeringPrice: number) => {
      if (!worldRef) {
        return {
          success: false,
          reason: 'invalid_price',
          subscribedShares: 0,
          suggestedPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          minShares: 0,
          maxShares: 0,
          estimatedDemand: 0,
          shortfallShares: offeringShares,
          canLaunch: false,
          message: 'IPO失败：世界未初始化',
        };
      }
      
      const result = initiateIPO(worldRef, 0, offeringShares, offeringPrice);
      if (result.success) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        soundManager.playCoin();
        get().addNotification('success', result.message);
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', result.message);
      }
      return result;
    },

    getBankruptcyEvents: () => {
      return bankruptcyResolution.getOpenEvents();
    },

    getBankruptcyStrategy: () => {
      return bankruptcyResolution.getStrategy(0);
    },

    updateBankruptcyStrategy: (patch: Partial<BankruptcyStrategySettings>) => {
      const next = bankruptcyResolution.setStrategy(0, patch);
      saveManager.saveSettings({
        ...saveManager.loadSettings(),
        bankruptcyStrategy: next,
      });
      get().addNotification('success', '破产参与策略已更新');
    },

    placeBankruptcyBid: (
      eventId: string,
      assetId: string,
      amount: number,
      source: 'manual' | 'strategy' = 'manual',
    ) => {
      if (!worldRef) return false;

      const success = bankruptcyResolution.placeBid(worldRef, eventId, assetId, 0, amount, source);
      if (success) {
        get().addNotification('success', `破产竞拍出价已提交：${formatCurrency(amount)}`);
      }
      return success;
    },

    confirmBankruptcyPurchase: (eventId: string, assetId: string) => {
      if (!worldRef) return false;

      const success = bankruptcyResolution.confirmPendingPurchase(worldRef, eventId, assetId, 0);
      if (success) {
        get().addNotification('success', '破产资产成交已确认');
      }
      return success;
    },
    
    // ==================== 收购系统 ====================
    getCompanyValuation: (companyId: number) => {
      if (!worldRef) return null;
      return evaluateCompanyValue(worldRef, companyId);
    },
    
    analyzeAcquisition: (targetId: number) => {
      if (!worldRef) return null;
      return analyzeAcquisitionFeasibility(worldRef, 0, targetId);
    },
    
    initiateAcquisitionOffer: (targetId: number, targetSharePercent: number, offerPrice: number) => {
      if (!worldRef) return false;
      
      const result = initiateAcquisition(worldRef, 0, targetId, 'friendly', targetSharePercent, offerPrice);
      if (result.success) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        soundManager.playTradeSuccess();
        get().addNotification('success', `收购要约已发起，目标持股 ${(targetSharePercent * 100).toFixed(0)}%`);
        return true;
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', `收购失败：${result.reason}`);
        return false;
      }
    },
    
    initiateAssetBuy: (sellerId: number, assetType: 'building' | 'inventory', assetIds: number[], price: number) => {
      if (!worldRef) return false;
      
      const result = initiateAssetPurchase(worldRef, 0, sellerId, assetType, assetIds, price);
      if (result.success && result.transactionId) {
        // 自动确认交易（简化流程）
        const confirmResult = confirmAssetTransaction(worldRef, result.transactionId);
        if (confirmResult.success) {
          set((state) => {
            state.playerBuildings++;
            syncPlayerFinancialState(state, worldRef, state.tick);
          });
          soundManager.playCoin();
          get().addNotification('success', `资产购买成功！`);
          return true;
        }
      }
      soundManager.playTradeFail();
      get().addNotification('error', `资产购买失败：${result.reason || '交易失败'}`);
      return false;
    },
    
    getPlayerAcquisitionOffers: () => {
      return getOffersByCompany(0);
    },
    
    // ==================== 统一公司数据 (新增) ====================
    getCompanyProfile: (companyId: number) => {
      if (!worldRef) return null;
      return getCompanyProfile(worldRef, companyId);
    },
    
    getAllCompanyProfiles: () => {
      if (!worldRef) return [];
      return getAllCompanyProfiles(worldRef);
    },
    
    getAICompanyProfiles: () => {
      if (!worldRef) return [];
      return getAICompanyProfiles(worldRef);
    },
    
    getPlayerHoldingProfiles: () => {
      if (!worldRef) return [];
      return getPlayerHoldingProfiles(worldRef);
    },
    
    getPlayerControlledProfiles: () => {
      if (!worldRef) return [];
      return getPlayerControlledProfiles(worldRef);
    },
    
    getPlayerPortfolio: () => {
      if (!worldRef) return { totalValue: 0, totalCost: 0, totalGain: 0, gainPercent: 0, holdingCount: 0 };
      return calculatePlayerPortfolio(worldRef);
    },
    
    getCompanyMarketStats: () => {
      if (!worldRef) return { rising: 0, falling: 0, unchanged: 0, totalVolume: 0, totalMarketCap: 0 };
      return calculateCompanyMarketStats(worldRef);
    },
    
    // ==================== 控制权相关 (新增) ====================
    getPlayerControlLevel: (companyId: number) => {
      return getPlayerControlLevel(companyId);
    },
    
    getPlayerControlledCompanyIds: () => {
      return getPlayerControlledCompanyIds();
    },
    
    hasPlayerControlRight: (companyId: number, right: ControlRight) => {
      return hasControlRight(0, companyId, right);
    },
    
    setControlledStrategy: (companyId: number, strategy: ControlStrategy) => {
      if (!worldRef) return false;
      const success = setControlledCompanyStrategy(worldRef, companyId, strategy);
      if (success) {
        get().addNotification('success', `已更新控股公司经营策略`);
      }
      return success;
    },
    
    requestCompanyDividend: (companyId: number, amount: number) => {
      if (!worldRef) return { success: false, reason: '游戏未初始化' };
      const result = requestDividend(worldRef, companyId, amount);
      if (result.success) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        soundManager.playCoin();
        get().addNotification('success', `分红成功！获得 ${formatCurrency(result.playerReceived || 0)}`);
      }
      return result;
    },
    
    transferAssets: (fromId: number, toId: number, assetType: 'building' | 'inventory', assetIds: number[]) => {
      if (!worldRef) return { success: false, reason: '游戏未初始化' };
      const result = initiateAssetTransfer(worldRef, fromId, toId, assetType, assetIds);
      if (result.success) {
        set((state) => {
          if (toId === 0) {
            state.playerBuildings++;
          }
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        get().addNotification('success', '资产转移成功');
      }
      return result;
    },
    
    // ==================== 收藏管理 (新增) ====================
    toggleFavoriteCompany: (companyId: number) => {
      set((state) => {
        const index = state.ui.favoriteCompanies.indexOf(companyId);
        if (index >= 0) {
          state.ui.favoriteCompanies.splice(index, 1);
        } else {
          state.ui.favoriteCompanies.push(companyId);
        }
      });
    },
    
    getFavoriteCompanies: () => {
      return get().ui.favoriteCompanies;
    },
    
    // ==================== 性能监控 ====================
    getPerformanceSnapshot: () => {
      return perfMonitor.getSnapshot();
    },
    
    getPerformanceSnapshots: (count: number) => {
      return perfMonitor.getSnapshots(count);
    },
    
    getFPSData: () => {
      return perfMonitor.getFPS();
    },
    
    getMemoryData: () => {
      return perfMonitor.getMemoryStats();
    },
    
    exportPerformanceJSON: (options?: Partial<ExportOptions>) => {
      downloadPerformanceJSON(options);
    },
    
    exportPerformanceCSV: (options?: Partial<ExportOptions>) => {
      downloadPerformanceCSV(options);
    },
    
    // ==================== 建造队列系统 ====================
    getConstructionQueue: () => {
      if (!worldRef) return [];
      
      const rawQueue = getCompanyConstructionQueue(worldRef, 0);
      const playerCompanyId = 0;
      
      // 转换为UI期望的格式，包含材料信息
      return rawQueue.map(item => {
        // 获取建造所需材料
        const requiredMaterials = getBaseMaterials(item.buildingTypeId);
        
        // 计算每种材料的当前库存和需求量
        const materialsStatus = requiredMaterials.map(mat => {
          const inventoryIdx = playerCompanyId * GOODS_COUNT + mat.goodsId;
          const currentAmount = worldRef!.companies.inventories[inventoryIdx] || 0;
          const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
          return {
            goodsId: mat.goodsId,
            goodsName: goods?.name || '未知',
            requiredAmount: mat.amount,
            currentAmount: currentAmount,
            isSufficient: currentAmount >= mat.amount,
          };
        });
        
        // 检查是否所有材料都充足
        const allMaterialsReady = materialsStatus.every(m => m.isSufficient);
        
        return {
          taskId: item.queueIdx,
          queueIdx: item.queueIdx,
          buildingTypeId: item.buildingTypeId,
          buildingName: item.buildingName,
          targetLevel: item.targetLevel,
          status: item.status,
          progress: item.progress,
          progressTicks: Math.floor(item.progress * 100),
          requiredTicks: 100,
          taskType: item.isUpgrade ? 1 : 0,
          speedBoost: 1.0,
          reservedMaterials: [],
          materialsStatus,
          allMaterialsReady,
        };
      });
    },
    
    getDemolitionQueue: () => {
      if (!worldRef) return [];
      
      const rawQueue = getCompanyDemolitionQueue(worldRef, 0);
      
      // 转换为UI期望的格式
      return rawQueue.map(item => ({
        taskId: item.queueIdx,
        queueIdx: item.queueIdx,
        buildingId: item.buildingId,
        buildingTypeId: item.buildingTypeId,
        buildingName: item.buildingName,
        buildingLevel: 1, // 默认值
        status: item.status,
        progress: item.progress,
        progressTicks: Math.floor(item.progress * 100),
        requiredTicks: 100,
        recoveredCash: item.estimatedCashRecovery,
        recoveredMaterials: [],
      }));
    },
    
    pauseConstruction: (_taskId: number) => {
      // 当前系统不支持暂停，返回false
      get().addNotification('warning', '当前版本不支持暂停建造');
      return false;
    },
    
    resumeConstruction: (_taskId: number) => {
      // 当前系统不支持恢复，返回false
      get().addNotification('warning', '当前版本不支持恢复建造');
      return false;
    },
    
    cancelPlayerConstruction: (taskId: number) => {
      if (!worldRef) return false;
      
      const result = cancelConstructionTask(worldRef, taskId);
      if (result.success) {
        set((state) => {
          syncPlayerFinancialState(state, worldRef, state.tick);
        });
        soundManager.playOrderCancel();
        get().addNotification('info', `建造已取消，退还材料 ${result.refundedMaterials.length} 种`);
        return true;
      }
      return false;
    },
    
    cancelPlayerDemolition: (taskId: number) => {
      if (!worldRef) return false;
      
      const result = cancelDemolitionTask(worldRef, taskId);
      if (result.success) {
        soundManager.playOrderCancel();
        get().addNotification('info', '拆除已取消，建筑已恢复');
        return true;
      }
      return false;
    },
    
    // ==================== 新闻系统 ====================
    getNewsHistory: () => {
      return getAllNews();
    },
    
    getLatestNews: () => {
      return getLatestNewsFromStore();
    },
    
    getNewsCount: () => {
      return getNewsCount();
    },
    
    hasUnreadNews: () => {
      return checkUnreadNews();
    },
    
    showNewsPopup: (news: MonthlyNewsReport, source: 'auto-generated' | 'manual' = 'manual') => {
      set((state) => {
        state.ui.pendingNews = news;
        state.ui.showNewsDialog = true;
        state.ui.newsDialogOpenSource = source;
      });
    },
    
    hideNewsDialog: () => {
      set((state) => {
        state.ui.showNewsDialog = false;
        state.ui.newsDialogOpenSource = 'manual';
        // 保留pendingNews以便继续查看
      });
    },
    
    markCurrentNewsRead: () => {
      const state = get();
      if (state.ui.pendingNews) {
        markNewsRead(state.ui.pendingNews.id);
      }
    },
    
    navigateToNews: () => {
      set((state) => {
        state.ui.currentPage = 'news';
        state.ui.showNewsDialog = false;
        state.ui.newsDialogOpenSource = 'manual';
      });
    },
    
    // ==================== 月度价格追踪 ====================
    getMonthlyPriceData: (monthKey?: string) => {
      const tracker = getMonthlyPriceTracker();
      if (monthKey) {
        return tracker.getReportByKey(monthKey);
      }
      return tracker.getLatestReport();
    },
    
    getCurrentMonthPriceData: () => {
      if (!worldRef) return null;
      const tracker = getMonthlyPriceTracker();
      return tracker.getCurrentMonthData(worldRef);
    },
    
    getAllMonthlyReports: () => {
      const tracker = getMonthlyPriceTracker();
      return tracker.getAllReports();
    },
    
    getAvailableMonths: () => {
      const tracker = getMonthlyPriceTracker();
      const months = tracker.getAvailableMonths();
      // 添加当前月份（实时数据）
      if (worldRef) {
        const currentData = tracker.getCurrentMonthData(worldRef);
        if (currentData) {
          return [
            { key: 'current', label: `${currentData.year}年${currentData.month}月 (实时)` },
            ...months,
          ];
        }
      }
      return months;
    },
    
    getMultiMonthComparison: (monthKeys: string[]) => {
      const tracker = getMonthlyPriceTracker();
      return tracker.getMultiMonthComparison(monthKeys);
    },
    
    exportPriceDataCSV: (options?: Partial<PriceExportOptions>) => {
      if (!worldRef) {
        get().addNotification('error', '游戏未初始化');
        return;
      }
      
      const tracker = getMonthlyPriceTracker();
      const report = tracker.getCurrentMonthData(worldRef);
      
      if (!report) {
        get().addNotification('error', '无可用数据');
        return;
      }
      
      PriceDataExporter.downloadCurrentReportCSV(report, options);
      get().addNotification('success', '月度价格数据已导出 (CSV)');
    },
    
    exportPriceDataJSON: (options?: Partial<PriceExportOptions>) => {
      if (!worldRef) {
        get().addNotification('error', '游戏未初始化');
        return;
      }
      
      const tracker = getMonthlyPriceTracker();
      const report = tracker.getCurrentMonthData(worldRef);
      
      if (!report) {
        get().addNotification('error', '无可用数据');
        return;
      }
      
      PriceDataExporter.downloadCurrentReportJSON(report, options);
      get().addNotification('success', '月度价格数据已导出 (JSON)');
    },
    
    exportMonthComparisonCSV: (monthKeys: string[], options?: Partial<PriceExportOptions>) => {
      const tracker = getMonthlyPriceTracker();
      const comparison = tracker.getMultiMonthComparison(monthKeys);
      
      if (!comparison) {
        get().addNotification('error', '无法生成对比报告，需要至少2个月份数据');
        return;
      }
      
      PriceDataExporter.downloadComparisonCSV(comparison, options);
      get().addNotification('success', '多月份对比数据已导出 (CSV)');
    },
    
    exportMonthComparisonJSON: (monthKeys: string[], options?: Partial<PriceExportOptions>) => {
      const tracker = getMonthlyPriceTracker();
      const comparison = tracker.getMultiMonthComparison(monthKeys);
      
      if (!comparison) {
        get().addNotification('error', '无法生成对比报告，需要至少2个月份数据');
        return;
      }
      
      PriceDataExporter.downloadComparisonJSON(comparison, options);
      get().addNotification('success', '多月份对比数据已导出 (JSON)');
    },
  }))
);
