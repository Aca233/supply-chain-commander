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
  SubsidiaryBuildingDef,
  InstalledSubsidiary,
  CombinedSubsidiaryEffects,
  getAvailableSubsidiaries,
  getSubsidiaryDef,
  getInstalledSubsidiaries,
  canInstallSubsidiary,
  installSubsidiary,
  uninstallSubsidiary,
  repairSubsidiary,
  calculateRepairCost,
  calculateCombinedEffects,
  getTotalSubsidiarySlots,
  getUsedSubsidiarySlots,
  getAvailableSubsidiarySlots,
  calculateDailySubsidiaryMaintenance,
  formatEffectDescription,
} from '@/core/production/SubsidiaryBuildings';
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
  Loan,
  CreditProfile,
  LoanType
} from '@/core/finance/BankingSystem';
import {
  getMarketState,
  getStock,
  getHoldings,
  buyStock,
  sellStock,
  initiateIPO,
  Stock,
  Holding,
  StockMarketState
} from '@/core/finance/StockMarket';
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
import { ALL_BUILDINGS, BuildingTypeDefinition, isRetailBuilding, getBuildingProduction } from '@/data/buildings';
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
import { GOODS_COUNT, MAX_SLOTS } from '@/core/constants';
import {
  getRetailStoreDetails,
  getPlayerRetailStores,
  getRetailMarketOverview,
  setRetailPrice,
  setRetailMarkup,
  registerRetailStore,
} from '@/core/economy/RetailSystem';
import {
  ProductionMethod,
  ProductionSlotType,
  BuildingSlotConfig,
  SLOT_CONFIGS_BY_BUILDING,
  METHODS_BY_ID,
  getMethodDisplayInfo,
  getSlotTypeName,
  getSlotTypeIcon,
  isMethodAvailable,
  isMethodUnlocked,
  calculateSwitchCost,
  getMaxSwitchCooldown,
  hasBuildingSpecificMethods,
  getBuildingSpecificSlots,
  getBuildingConfig,
  getSlotAvailableMethods,
  getMethodByIdNew,
  getBuildingSlotCount,
} from '@/core/production/ProductionMethods';
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
  buildBuilding: (buildingTypeId: number, outputModeId?: number) => number | null;
  upgradeBuilding: (buildingId: number) => boolean;
  toggleBuildingActive: (buildingId: number) => boolean;
  setOutputMode: (buildingId: number, outputModeId: number) => boolean;
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
  getBuildingSlotConfig: (buildingTypeId: number) => BuildingSlotConfig | null;
  getBuildingCurrentMethods: (buildingId: number) => number[];
  getAvailableMethodsForSlot: (buildingTypeId: number, slotIndex: number, buildingLevel: number) => ProductionMethod[];
  changeBuildingSlotMethod: (buildingId: number, slotIndex: number, methodId: number) => { success: boolean; reason?: string };
  getMethodInfo: (methodId: number) => ReturnType<typeof getMethodDisplayInfo>;
  
  // 数据获取
  getWorld: () => GameWorld | null;
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
  playerIPO: (offeringShares: number, offeringPrice: number) => boolean;
  
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
  
  // ============ 附属建筑系统 (新增) ============
  getAvailableSubsidiaries: (buildingId: number) => SubsidiaryBuildingDef[];
  getInstalledSubsidiaries: (buildingId: number) => Array<InstalledSubsidiary & { slotIndex: number; def: SubsidiaryBuildingDef | undefined }>;
  getBuildingSubsidiaryEffects: (buildingId: number) => CombinedSubsidiaryEffects | null;
  getBuildingSubsidiarySlots: (buildingId: number) => { total: number; used: number; available: number };
  installBuildingSubsidiary: (buildingId: number, subsidiaryId: number) => { success: boolean; reason?: string };
  uninstallBuildingSubsidiary: (buildingId: number, slotIndex: number) => { success: boolean; reason?: string };
  repairBuildingSubsidiary: (buildingId: number, slotIndex: number) => { success: boolean; cost: number; reason?: string };
  getSubsidiaryMaintenanceCost: (buildingId: number) => number;
  
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
  showNewsPopup: (news: MonthlyNewsReport) => void;
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

let notificationId = 0;

// 将world和gameLoop保存在store外部，避免被immer冻结
let worldRef: GameWorld | null = null;
let gameLoopRef: GameLoop | null = null;

// 性能优化：限制状态更新频率
let lastUIUpdateTick = 0;
const UI_UPDATE_INTERVAL = 2; // 每2个tick更新一次UI状态（保持流畅度）

// 财务历史数据更新间隔
const HISTORY_UPDATE_INTERVAL = 4; // 每4个tick记录一次历史数据

// 建筑计数缓存
let cachedPlayerBuildingCount = 0;
let cachedBuildingCountTick = -100;
const BUILDING_COUNT_CACHE_INTERVAL = 24; // 每24tick更新一次建筑计数

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
    gameDate: '第1年 1月1日 0:00',
    playerCash: 0,
    playerAssets: 0,
    playerBuildings: 0,
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
      newsVersion: 0,
    },
    lastTickResult: null,
    performance: null,
    financialHistory: [],
    
    // ==================== 初始化 ====================
    initGame: () => {
      const world = initializeWorld();
      
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
              state.playerCash = worldRef.companies.cash[0];
              state.playerAssets = worldRef.companies.totalAssets[0];
              
              // 优化：使用缓存的建筑数量，仅在特定间隔更新
              if (currentTick - cachedBuildingCountTick >= BUILDING_COUNT_CACHE_INTERVAL) {
                cachedBuildingCountTick = currentTick;
                let buildingCount = 0;
                for (let i = 0; i < worldRef.buildings.count; i++) {
                  if (worldRef.buildings.owners[i] === 0) {
                    buildingCount++;
                  }
                }
                cachedPlayerBuildingCount = buildingCount;
              }
              state.playerBuildings = cachedPlayerBuildingCount;
            }
            
            state.performance = gameLoop.getPerformanceReport();
          }
          
          // 财务历史数据更新（降低频率）
          if (shouldUpdateHistory && worldRef) {
            // 从交易中计算收入支出
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
            
            // 计算生产价值（估算：基于玩家建筑的产出）
            let productionValue = 0;
            let maintenanceCost = 0;
            let laborCost = 0;
            let retailRevenue = 0;
            
            // 从建筑计算维护和劳动力成本
            for (let i = 0; i < worldRef.buildings.count; i++) {
              if (worldRef.buildings.owners[i] === 0) {
                const typeId = worldRef.buildings.types[i];
                const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
                if (buildingDef) {
                  maintenanceCost += buildingDef.maintenanceCost / 24; // 每tick的维护成本
                  laborCost += buildingDef.laborCost / 24; // 每tick的劳动力成本
                }
              }
            }
            
            // 综合收入和支出
            const totalRevenue = tradeRevenue + retailRevenue;
            const totalCost = tradeCost + maintenanceCost + laborCost;
            
            // 使用现金变化来补充未跟踪的收支
            const prevCash = state.financialHistory.length > 0
              ? state.financialHistory[state.financialHistory.length - 1].cash
              : worldRef.companies.cash[0];
            const currentCash = worldRef.companies.cash[0];
            const cashChange = currentCash - prevCash;
            
            // 如果现金变化与计算的利润不符，调整收入或支出
            const calculatedProfit = totalRevenue - totalCost;
            const unmatchedChange = cashChange - calculatedProfit;
            
            let adjustedRevenue = totalRevenue;
            let adjustedCost = totalCost;
            
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
              assets: worldRef.companies.totalAssets[0],
              retailRevenue,
              productionValue,
              maintenanceCost,
              laborCost,
            };
            
            state.financialHistory.push(historyPoint);
            
            // 保留最近100个数据点
            if (state.financialHistory.length > 100) {
              state.financialHistory = state.financialHistory.slice(-100);
            }
          }
        });
      });
      
      set((state) => {
        state.initialized = true;
        state.playerCash = world.companies.cash[0];
        state.tick = world.tick;
        state.gameDate = formatGameDate(world.tick);
      });
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
          state.playerCash = worldRef!.companies.cash[0];
        });
        soundManager.playOrderPlace();
        get().addNotification('success', `买单已提交: ${quantity}单位 @ ¥${price.toFixed(2)}`);
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
        get().addNotification('success', `卖单已提交: ${actualQty.toFixed(0)}单位 @ ¥${price.toFixed(2)}`);
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
          state.playerCash = worldRef!.companies.cash[0];
        });
        soundManager.playOrderCancel();
        get().addNotification('info', '订单已取消');
      }
      return success;
    },
    
    // ==================== 建筑 ====================
    buildBuilding: (buildingTypeId, outputModeId = 0) => {
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
          get().addNotification('error', `资金不足！需要 ¥${totalCost.toLocaleString()}`);
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
        const result = startConstructionTask(worldRef, playerCompanyId, buildingTypeId, outputModeId);
        
        if (!result.success) {
          // 退还建造费用
          worldRef.companies.cash[0] += building.buildCost;
          soundManager.playTradeFail();
          get().addNotification('error', `建造失败：${result.error || '未知错误'}`);
          return null;
        }
        
        set((state) => {
          state.playerCash = worldRef!.companies.cash[0];
          // 强制触发 tick 更新以刷新建造队列UI
          state.tick = state.tick + 0.001;
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
        get().addNotification('error', `资金不足，升级需要 ¥${totalCost.toLocaleString()}`);
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
        state.playerCash = worldRef!.companies.cash[0];
        // 强制触发 tick 更新以刷新建造队列UI
        state.tick = state.tick + 0.001;
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
    
    setOutputMode: (buildingId, outputModeId) => {
      if (!worldRef) return false;
      
      // 检查建筑所有权
      if (worldRef.buildings.owners[buildingId] !== 0) {
        get().addNotification('error', '无法修改不属于你的建筑');
        return false;
      }
      
      const typeId = worldRef.buildings.types[buildingId];
      const building = ALL_BUILDINGS.find(b => b.id === typeId);
      
      if (!building) {
        get().addNotification('error', '建筑类型无效');
        return false;
      }
      
      // 检查outputMode是否支持
      const production = building.production;
      if (!production) {
        get().addNotification('error', '该建筑没有生产配置');
        return false;
      }
      
      // 验证outputModeId有效性
      if (outputModeId !== 0 && production.outputModes) {
        const validMode = production.outputModes.find(m => m.modeId === outputModeId);
        if (!validMode) {
          get().addNotification('error', '该建筑不支持此产品模式');
          return false;
        }
      }
      
      // 切换产品模式
      worldRef.buildings.outputModeIds[buildingId] = outputModeId;
      
      // 清空缓冲区（切换模式后需要重新生产）
      for (let i = 0; i < 8; i++) {
        worldRef.buildings.inputBuffers[buildingId * 8 + i] = 0;
        worldRef.buildings.outputBuffers[buildingId * 8 + i] = 0;
      }
      // 重置生产进度
      worldRef.buildings.progress[buildingId] = 0;
      
      // 获取模式名称
      const modeName = outputModeId === 0
        ? '默认模式'
        : production.outputModes?.find(m => m.modeId === outputModeId)?.name || '未知模式';
      get().addNotification('success', `已切换到「${modeName}」`);
      
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
          state.playerCash = worldRef!.companies.cash[0];
        });
        soundManager.playCoin();
        get().addNotification('success', `贷款申请成功！获得 ¥${amount.toLocaleString()}`);
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
          state.playerCash = worldRef!.companies.cash[0];
        });
        soundManager.playTradeSuccess();
        get().addNotification('success', `贷款已提前还清${result.penalty ? `，罚金 ¥${result.penalty.toFixed(0)}` : ''}`);
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
      // 先检查是否使用新系统
      if (hasBuildingSpecificMethods(buildingTypeId)) {
        const newConfig = getBuildingConfig(buildingTypeId);
        if (newConfig) {
          // 转换为旧格式以保持UI兼容
          return {
            buildingTypeId,
            slots: newConfig.slots.map((slot: { id: string }, _i: number) => {
              const methods = getSlotAvailableMethods(buildingTypeId, slot.id);
              return {
                slotType: 'process' as ProductionSlotType, // 占位
                availableMethods: methods.map((m: { id: number }) => m.id),
                defaultMethod: methods[0]?.id || 0,
              };
            }),
          };
        }
      }
      return SLOT_CONFIGS_BY_BUILDING.get(buildingTypeId) || null;
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
      // 检查是否使用新系统
      if (hasBuildingSpecificMethods(buildingTypeId)) {
        const newConfig = getBuildingConfig(buildingTypeId);
        if (newConfig && slotIndex < newConfig.slots.length) {
          const slot = newConfig.slots[slotIndex];
          const newMethods = getSlotAvailableMethods(buildingTypeId, slot.id) as Array<{
            id: number;
            key: string;
            name: string;
            outputModifiers: Array<{ goodsId: number | 'all'; multiplier: number }>;
            inputModifiers: Array<{ goodsId: number | 'all'; multiplier: number }>;
            laborMultiplier: number;
            energyMultiplier: number;
            qualityBonus: number;
            requiredLevel: number;
            switchCost: number;
            switchCooldown: number;
          }>;
          
          // 转换为旧格式
          return newMethods
            .filter(m => m.requiredLevel <= buildingLevel)
            .map(m => ({
              id: m.id,
              key: m.key,
              name: m.name,
              slotType: 'process' as ProductionSlotType,
              outputMultipliers: new Map(
                m.outputModifiers.map(mod => [
                  typeof mod.goodsId === 'number' ? mod.goodsId : 0,
                  mod.multiplier
                ])
              ),
              inputMultipliers: new Map(
                m.inputModifiers.map(mod => [
                  typeof mod.goodsId === 'number' ? mod.goodsId : 0,
                  mod.multiplier
                ])
              ),
              laborMultiplier: m.laborMultiplier,
              energyMultiplier: m.energyMultiplier,
              qualityBonus: m.qualityBonus,
              requiredLevel: m.requiredLevel,
              switchCost: m.switchCost,
              switchCooldown: m.switchCooldown,
            })) as ProductionMethod[];
        }
        return [];
      }
      
      // 旧系统
      const config = SLOT_CONFIGS_BY_BUILDING.get(buildingTypeId);
      if (!config || slotIndex >= config.slots.length) return [];
      
      const slot = config.slots[slotIndex];
      const methods: ProductionMethod[] = [];
      
      for (const methodId of slot.availableMethods) {
        const method = METHODS_BY_ID.get(methodId);
        if (method && isMethodUnlocked(buildingLevel, methodId)) {
          methods.push(method);
        }
      }
      
      return methods;
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
      
      // 检查是否使用新系统
      if (hasBuildingSpecificMethods(buildingTypeId)) {
        const newConfig = getBuildingConfig(buildingTypeId);
        
        if (!newConfig || slotIndex >= newConfig.slots.length) {
          return { success: false, reason: '无效的槽位索引' };
        }
        
        const slot = newConfig.slots[slotIndex] as { id: string; name: string };
        
        // 如果methodId为0，表示清空槽位
        if (methodId === 0) {
          const slotOffset = buildingId * MAX_SLOTS;
          worldRef.buildings.slotMethods[slotOffset + slotIndex] = 0;
          get().addNotification('info', `已清空「${slot.name}」槽位`);
          return { success: true };
        }
        
        const newMethod = getMethodByIdNew(methodId) as {
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
        
        // 检查方式是否属于该建筑
        if (newMethod.buildingTypeId !== buildingTypeId) {
          return { success: false, reason: '该生产方式不属于此建筑' };
        }
        
        // 检查方式是否属于该槽位
        if (newMethod.slotId !== slot.id) {
          return { success: false, reason: '该生产方式不属于此槽位' };
        }
        
        // 检查等级要求
        if (newMethod.requiredLevel > buildingLevel) {
          return { success: false, reason: `需要建筑等级 ${newMethod.requiredLevel}` };
        }
        
        // 计算切换成本
        const switchCost = newMethod.switchCost || 50000;
        const playerCash = worldRef.companies.cash[0];
        
        if (playerCash < switchCost) {
          return { success: false, reason: `资金不足，切换需要 ¥${switchCost.toLocaleString()}` };
        }
        
        // 扣费并切换
        worldRef.companies.cash[0] -= switchCost;
        const slotOffset = buildingId * MAX_SLOTS;
        worldRef.buildings.slotMethods[slotOffset + slotIndex] = methodId;
        
        set((state) => {
          state.playerCash = worldRef!.companies.cash[0];
          // 强制增加tick来触发UI刷新
          state.tick = state.tick + 0.001;
        });
        
        get().addNotification('success', `已切换到「${newMethod.name}」，花费 ¥${switchCost.toLocaleString()}`);
        return { success: true };
      }
      
      // 旧系统
      // 检查方式是否可用
      if (!isMethodAvailable(buildingTypeId, slotIndex, methodId)) {
        return { success: false, reason: '该生产方式不可用于此建筑槽位' };
      }
      
      // 检查等级要求
      if (!isMethodUnlocked(buildingLevel, methodId)) {
        const method = METHODS_BY_ID.get(methodId);
        return { success: false, reason: `需要建筑等级 ${method?.requiredLevel || '?'}` };
      }
      
      // 计算切换成本
      const currentMethods = getBuildingSlotMethodsArray(worldRef, buildingId);
      const newMethods = [...currentMethods];
      newMethods[slotIndex] = methodId;
      
      const switchCost = calculateSwitchCost(currentMethods, newMethods);
      const playerCash = worldRef.companies.cash[0];
      
      if (playerCash < switchCost) {
        return { success: false, reason: `资金不足，切换需要 ¥${switchCost.toLocaleString()}` };
      }
      
      // 扣费并切换
      worldRef.companies.cash[0] -= switchCost;
      const success = setBuildingSlotMethod(worldRef, buildingId, slotIndex, methodId);
      
      if (success) {
        set((state) => {
          state.playerCash = worldRef!.companies.cash[0];
        });
        
        const method = METHODS_BY_ID.get(methodId);
        get().addNotification('success', `已切换到「${method?.name || '未知方式'}」，花费 ¥${switchCost.toLocaleString()}`);
        return { success: true };
      } else {
        // 恢复现金
        worldRef.companies.cash[0] += switchCost;
        return { success: false, reason: '切换失败' };
      }
    },
    
    getMethodInfo: (methodId) => {
      // 先检查新系统
      const newMethod = getMethodByIdNew(methodId) as {
        name: string;
        description?: string;
        effects?: string[];
        requiredLevel: number;
        switchCost: number;
        switchCooldown: number;
      } | null;
      if (newMethod) {
        return {
          name: newMethod.name,
          description: newMethod.description || '',
          effects: newMethod.effects || [],
          slotType: 'process' as ProductionSlotType, // 占位
          requiredLevel: newMethod.requiredLevel,
          switchCost: newMethod.switchCost,
          switchCooldown: newMethod.switchCooldown,
        };
      }
      return getMethodDisplayInfo(methodId);
    },
    
    // ==================== 数据获取 ====================
    getWorld: () => worldRef,
    
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
          state.playerCash = worldRef!.companies.cash[0];
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
      if (!worldRef) return false;
      
      const success = initiateIPO(worldRef, 0, offeringShares, offeringPrice);
      if (success) {
        set((state) => {
          state.playerCash = worldRef!.companies.cash[0];
        });
        soundManager.playCoin();
        get().addNotification('success', `IPO成功！发行${offeringShares}股 @ ¥${offeringPrice}`);
        return true;
      } else {
        soundManager.playTradeFail();
        get().addNotification('error', 'IPO失败：公司已上市');
        return false;
      }
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
          state.playerCash = worldRef!.companies.cash[0];
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
            state.playerCash = worldRef!.companies.cash[0];
            state.playerBuildings++;
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
          state.playerCash = worldRef!.companies.cash[0];
        });
        soundManager.playCoin();
        get().addNotification('success', `分红成功！获得 ¥${result.playerReceived?.toLocaleString() || 0}`);
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
    
    // ==================== 附属建筑系统 ====================
    getAvailableSubsidiaries: (buildingId: number) => {
      if (!worldRef) return [];
      
      const b = worldRef.buildings;
      if (buildingId >= b.count) return [];
      
      const buildingTypeId = b.types[buildingId];
      const buildingLevel = b.levels[buildingId];
      
      return getAvailableSubsidiaries(buildingTypeId, buildingLevel);
    },
    
    getInstalledSubsidiaries: (buildingId: number) => {
      if (!worldRef) return [];
      return getInstalledSubsidiaries(worldRef, buildingId);
    },
    
    getBuildingSubsidiaryEffects: (buildingId: number) => {
      if (!worldRef) return null;
      return calculateCombinedEffects(worldRef, buildingId);
    },
    
    getBuildingSubsidiarySlots: (buildingId: number) => {
      if (!worldRef) return { total: 0, used: 0, available: 0 };
      
      const b = worldRef.buildings;
      if (buildingId >= b.count) return { total: 0, used: 0, available: 0 };
      
      const level = b.levels[buildingId];
      const total = getTotalSubsidiarySlots(level);
      const used = getUsedSubsidiarySlots(worldRef, buildingId);
      
      return {
        total,
        used,
        available: total - used,
      };
    },
    
    installBuildingSubsidiary: (buildingId: number, subsidiaryId: number) => {
      if (!worldRef) return { success: false, reason: '游戏未初始化' };
      
      const b = worldRef.buildings;
      
      // 检查建筑是否存在
      if (buildingId >= b.count) {
        return { success: false, reason: '建筑不存在' };
      }
      
      // 检查是否是玩家建筑
      if (b.owners[buildingId] !== 0) {
        return { success: false, reason: '无法修改非玩家建筑的附属设施' };
      }
      
      // 获取附属建筑定义
      const def = getSubsidiaryDef(subsidiaryId);
      if (!def) {
        return { success: false, reason: '附属建筑不存在' };
      }
      
      // 检查是否可以安装
      const check = canInstallSubsidiary(worldRef, buildingId, subsidiaryId);
      if (!check.canInstall) {
        return { success: false, reason: check.reason };
      }
      
      // 检查资金
      const playerCash = worldRef.companies.cash[0];
      if (playerCash < def.buildCost) {
        return { success: false, reason: `资金不足，需要 ¥${def.buildCost.toLocaleString()}` };
      }
      
      // 扣费
      worldRef.companies.cash[0] -= def.buildCost;
      
      // 安装
      const result = installSubsidiary(worldRef, buildingId, subsidiaryId);
      
      if (result.success) {
        set((state) => {
          state.playerCash = worldRef!.companies.cash[0];
          // 强制触发 tick 更新以刷新 UI
          state.tick = state.tick + 0.001;
        });
        soundManager.playBuildComplete();
        get().addNotification('success', `已安装「${def.name}」，花费 ¥${def.buildCost.toLocaleString()}`);
      } else {
        // 恢复资金
        worldRef.companies.cash[0] += def.buildCost;
        get().addNotification('error', `安装失败：${result.reason || '未知错误'}`);
      }
      
      return result;
    },
    
    uninstallBuildingSubsidiary: (buildingId: number, slotIndex: number) => {
      if (!worldRef) return { success: false, reason: '游戏未初始化' };
      
      const b = worldRef.buildings;
      
      // 检查是否是玩家建筑
      if (b.owners[buildingId] !== 0) {
        return { success: false, reason: '无法修改非玩家建筑的附属设施' };
      }
      
      const result = uninstallSubsidiary(worldRef, buildingId, slotIndex);
      
      if (result.success) {
        soundManager.playOrderCancel();
        get().addNotification('info', '附属设施已拆除');
      }
      
      return result;
    },
    
    repairBuildingSubsidiary: (buildingId: number, slotIndex: number) => {
      if (!worldRef) return { success: false, cost: 0, reason: '游戏未初始化' };
      
      const b = worldRef.buildings;
      
      // 检查是否是玩家建筑
      if (b.owners[buildingId] !== 0) {
        return { success: false, cost: 0, reason: '无法修改非玩家建筑的附属设施' };
      }
      
      // 先计算维修成本（不执行维修）
      const costResult = calculateRepairCost(worldRef, buildingId, slotIndex);
      
      if (!costResult.canRepair) {
        return { success: false, cost: 0, reason: costResult.reason };
      }
      
      // 检查资金
      const playerCash = worldRef.companies.cash[0];
      if (playerCash < costResult.cost) {
        return { success: false, cost: costResult.cost, reason: `资金不足，维修需要 ¥${costResult.cost.toFixed(0)}` };
      }
      
      // 扣费
      worldRef.companies.cash[0] -= costResult.cost;
      
      // 执行维修
      const result = repairSubsidiary(worldRef, buildingId, slotIndex);
      
      if (result.success) {
        set((state) => {
          state.playerCash = worldRef!.companies.cash[0];
        });
        
        soundManager.playUpgrade();
        get().addNotification('success', `维修完成，花费 ¥${costResult.cost.toFixed(0)}`);
      } else {
        // 恢复资金
        worldRef.companies.cash[0] += costResult.cost;
      }
      
      return result;
    },
    
    getSubsidiaryMaintenanceCost: (buildingId: number) => {
      if (!worldRef) return 0;
      return calculateDailySubsidiaryMaintenance(worldRef, buildingId);
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
          state.playerCash = worldRef!.companies.cash[0];
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
    
    showNewsPopup: (news: MonthlyNewsReport) => {
      set((state) => {
        state.ui.pendingNews = news;
        state.ui.showNewsDialog = true;
      });
    },
    
    hideNewsDialog: () => {
      set((state) => {
        state.ui.showNewsDialog = false;
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
