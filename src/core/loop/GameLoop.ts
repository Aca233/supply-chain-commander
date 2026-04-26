/**
 * 游戏主循环
 * 协调所有系统的更新
 *
 * 性能优化：
 * - 集成PerformanceMonitor追踪各系统耗时
 * - 使用PriceCache批量获取价格数据
 * - 使用OrderBookIndex加速订单撮合
 */

import { GameWorld } from '../world/GameWorld';
import { updateAllProduction, autoFeedBuildings, initRecipeCache } from '../production/ProductionEngine';
import { initializeBuildingProductionMethods } from '../production/ProductionMethods';
import { matchAllOrders, MatchingResult } from '../market/MatchingEngine';
import { cleanupExpiredOrders, initOrderPool, getOrderPoolStats, getOrderPoolHealth, logOrderPoolPerformance, syncOrderPoolWithWorld } from '../market/OrderBook';
import { resetOrderBookIndex } from '../market/OrderBookIndex';
import { resetPriceCache } from '../market/PriceCache';
import { updateAllPrices, simulateConsumerDemand, PriceUpdateResult } from '../economy/PriceEngine';
import { autoPostSellOrders, autoPostBuyOrders, executeAIStockTrading, runAISubsidiaryManagement, adjustAllAIOrderPrices, runStrategicMaterialCheck, buildForColdGoods, forceBuildzeroSupplyGoods } from '../ai/AIDecisionEngine';
import { initializeBankingSystem, updateBankingSystem, getBankingState } from '../finance/BankingSystem';
import { applyOperatingCosts } from '../finance/OperatingCosts';
import { initializeStockMarket, updateStockMarket } from '../finance/StockMarket';
import { initializeAcquisitionSystem, updateAcquisitionSystem } from '../finance/AcquisitionSystem';
import { bankruptcyResolution } from '../finance/BankruptcyResolution';
import {
  DEFAULT_TICK_INTERVAL,
  BASE_INTEREST_RATE,
  TARGET_INFLATION,
  GOODS_COUNT,
  AI_BATCH_SIZE,
  TICKS_PER_DAY,
  TICKS_PER_MONTH,
  TICKS_PER_YEAR,
} from '../constants';
import { perfMonitor, TickPerformanceReport } from '../performance/PerformanceMonitor';
import { memoryManager } from '../performance/MemoryManager';
import { tickAllPools } from '../performance/ObjectPool';
import { processAITick, getAISchedulerStats, resetAIScheduler, initAISchedulerWorker, getAIWorkerStatus, destroyAIScheduler } from '../ai/AIScheduler';
import { indicatorCache } from '../ai/IndicatorCache';
import { clearAllModuleCache } from '../ai/ModuleCache';
import { initializeUnifiedWorkerFacade, destroyUnifiedWorkerFacade } from '../workers/UnifiedWorkerFacade';

// 导入新增的增强系统
import { getCurrentSeason, getTotalSeasonalMultiplier, getActiveSeasonalEvents, Season, SeasonalEvent } from '../economy/SeasonalDemand';
import { inventoryDecayManager, DecayEvent } from '../economy/InventoryDecay';
import { brandManager } from '../economy/BrandSystem';
import { logisticsManager, ShipmentOrder } from '../economy/LogisticsSystem';
import { distributionManager } from '../economy/DistributionChannels';
import { supplyContractManager, ContractExecution } from '../economy/SupplyContracts';
import { advancedOrderManager, AdvancedOrder } from '../market/AdvancedOrders';
import { decayUnmetDemand } from '../economy/DemandCurve';
import { applyMarketSubstitution } from '../economy/SubstitutionSystem';
import { futuresMarket } from '../finance/FuturesMarket';
import { tradingFeeManager } from '../market/TradingFees';
import { executeConsumerPurchases, MarketConsumptionSummary, CONSUMER_MARKET_CONFIG } from '../economy/ConsumerMarket';
import { executePlayerAutoTrade } from '../ai/PlayerAutoTrader';
import { updateRetailSystem, RetailTickResult, processWholesaleSupply, WholesaleResult } from '../economy/RetailSystem';
import { processServiceConsumption, resetDailyServiceStats, ServiceConsumptionResult } from '../economy/ServiceConsumption';
import { processConstructionAndDemolitionTick, ConstructionTickResult } from '../construction/ConstructionTick';
import { updateMonthlyTracker, resetMonthlyPriceTracker } from '../economy/MonthlyPriceTracker';
import { forEachRetainedTradeNewestFirst } from '../market/TradeLedger';
import { saveManager } from '../save/SaveManager';

// 导入新闻系统
import {
  initNewsSystem,
  shouldCaptureSnapshot,
  shouldGenerateNews,
  generateMonthlyNews,
  captureMonthStartSnapshot,
  trackCompanyBankrupt,
  MonthlyNewsReport,
} from '../news';

/**
 * 游戏循环状态
 */
export interface GameLoopState {
  running: boolean;
  paused: boolean;
  speed: 1 | 2 | 4 | 8;
  tickInterval: number;
  lastTickTime: number;
  accumulator: number;
  
  // 性能统计
  avgTickTime: number;
  maxTickTime: number;
  tickCount: number;
}

/**
 * Tick结果
 */
export interface TickResult {
  tick: number;
  tickTime: number;
  
  production: {
    processedCount: number;
    producedCount: number;
    blockedCount: number;
  };
  
  matching: MatchingResult;
  
  prices: PriceUpdateResult;
  
  cleanedOrders: number;
  
  aiDecisions: number;  // AI公司决策数量
  
  // AI附属建筑管理结果
  aiSubsidiaryActions: number;
  
  // 新增系统结果
  season: Season;
  seasonalEvents: SeasonalEvent[];
  decayEvents: DecayEvent[];
  deliveredShipments: ShipmentOrder[];
  triggeredAdvancedOrders: AdvancedOrder[];
  executedContracts: ContractExecution[];
  expiredFuturesContracts: number;
  
  // 消费者市场结果
  consumerPurchases: MarketConsumptionSummary;
  
  // 零售系统结果
  retailResult: RetailTickResult;
  
  // 批发直销结果
  wholesaleResult: WholesaleResult;
  
  // 服务消费结果
  serviceConsumption: ServiceConsumptionResult;
  
  // 玩家自动交易结果
  playerAutoTrade: {
    sellOrders: number;
    buyOrders: number;
  };
  
  // AI自动挂单结果
  aiAutoOrders: {
    sellOrders: number;
    buyOrders: number;
  };
  
  // 建造/拆除系统结果
  construction: ConstructionTickResult;
  
  // 新闻系统结果
  newsGenerated?: MonthlyNewsReport;
}

/**
 * 游戏循环控制器
 */
export class GameLoop {
  private world: GameWorld;
  private state: GameLoopState;
  private tickCallback?: (result: TickResult) => void;
  private timerId?: number;
  private lastPerfReport: TickPerformanceReport | null = null;
  private aiWorkerInitialized: boolean = false;
  private lastRateLogTick = -1;
  private rateLogStartTime = 0;
  private rateLogTickCount = 0;
  private newsSystemInitialized: boolean = false;
  private readonly recentRetailRevenue = new Float64Array(TICKS_PER_MONTH);
  private readonly recentServiceRevenue = new Float64Array(TICKS_PER_MONTH);
  
  constructor(world: GameWorld) {
    this.world = world;
    this.state = {
      running: false,
      paused: true,
      speed: 1,
      tickInterval: DEFAULT_TICK_INTERVAL,
      lastTickTime: 0,
      accumulator: 0,
      avgTickTime: 0,
      maxTickTime: 0,
      tickCount: 0,
    };
    
    // 初始化系统
    initRecipeCache();
    initializeBuildingProductionMethods(); // 初始化建筑专属生产方式系统
    initOrderPool();
    resetOrderBookIndex();
    resetPriceCache();
    
    // 【关键修复】同步订单池和 OrderBookIndex，确保所有现有订单都能被撮合
    const syncResult = syncOrderPoolWithWorld(world);
    if (syncResult.fixed) {
      console.log(`[GameLoop] 订单同步: ${syncResult.details}`);
    }
    
    initializeBankingSystem(world);
    initializeStockMarket(world);
    initializeAcquisitionSystem();
    
    // 【新增】初始化新闻系统
    initNewsSystem(world);
    this.newsSystemInitialized = true;
    
    // 【新增】初始化月度价格追踪器
    resetMonthlyPriceTracker();
    
    // 【新增】初始化所有Worker系统（异步，不阻塞构造函数）
    this.initializeAllWorkers();
  }
  
  /**
   * 【新增】初始化所有Worker系统
   */
  private async initializeAllWorkers(): Promise<void> {
    try {
      // 并行初始化所有Worker系统
      const [unifiedResult, aiResult] = await Promise.allSettled([
        initializeUnifiedWorkerFacade(),  // 初始化统一Worker门面（含EconomyWorker）
        initAISchedulerWorker(),           // 初始化AI调度器Worker
      ]);
      
      const unifiedSuccess = unifiedResult.status === 'fulfilled' && unifiedResult.value;
      const aiSuccess = aiResult.status === 'fulfilled' && aiResult.value;
      
      this.aiWorkerInitialized = aiSuccess;
      
      console.log(`[GameLoop] Worker系统初始化结果:
        - UnifiedWorkerFacade (含EconomyWorker): ${unifiedSuccess ? '✓' : '✗'}
        - AISchedulerWorker: ${aiSuccess ? '✓' : '✗'}
      `);
      
      if (!unifiedSuccess) {
        console.warn('[GameLoop] UnifiedWorkerFacade初始化失败，经济计算将使用主线程');
      }
      if (!aiSuccess) {
        console.warn('[GameLoop] AI Worker初始化失败，使用同步模式');
      }
    } catch (error) {
      console.error('[GameLoop] Worker系统初始化异常:', error);
      this.aiWorkerInitialized = false;
    }
  }
  
  /**
   * 获取游戏世界
   */
  getWorld(): GameWorld {
    return this.world;
  }
  
  /**
   * 获取循环状态
   */
  getState(): GameLoopState {
    return { ...this.state };
  }
  
  /**
   * 设置tick回调
   */
  onTick(callback: (result: TickResult) => void): void {
    this.tickCallback = callback;
  }
  
  /**
   * 开始游戏循环
   */
  start(): void {
    if (this.state.running) return;
    
    this.state.running = true;
    this.state.paused = false;
    // 注意: world对象可能被Zustand冻结，不直接修改world.paused
    this.state.lastTickTime = performance.now();
    
    this.scheduleNextTick();
  }
  
  /**
   * 暂停游戏
   */
  pause(): void {
    this.state.paused = true;
    // 注意: world对象可能被Zustand冻结，不直接修改world.paused
    
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
  }
  
  /**
   * 继续游戏
   */
  resume(): void {
    if (!this.state.running) {
      this.start();
      return;
    }
    
    this.state.paused = false;
    // 注意: world对象可能被Zustand冻结，不直接修改world.paused
    this.state.lastTickTime = performance.now();
    this.scheduleNextTick();
  }
  
  /**
   * 停止游戏循环
   */
  stop(): void {
    this.state.running = false;
    this.state.paused = true;
    // 注意: world对象可能被Zustand冻结，不直接修改world.paused
    
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
  }
  
  /**
   * 【新增】销毁游戏循环
   */
  destroy(): void {
    this.stop();
    destroyAIScheduler();
    destroyUnifiedWorkerFacade();  // 销毁统一Worker门面
    console.log('[GameLoop] 已销毁');
  }
  
  /**
   * 设置游戏速度
   */
  setSpeed(speed: 1 | 2 | 4 | 8): void {
    this.state.speed = speed;
    // 注意: world对象可能被Zustand冻结，不直接修改world.speed
  }
  
  /**
   * 手动执行单个tick
   */
  manualTick(): TickResult {
    return this.processTick();
  }
  
  /**
   * 调度下一个tick
   */
  private scheduleNextTick(): void {
    if (!this.state.running || this.state.paused) return;
    
    const now = performance.now();
    const elapsed = now - this.state.lastTickTime;
    this.state.accumulator += elapsed;
    this.state.lastTickTime = now;
    
    const targetInterval = this.state.tickInterval / this.state.speed;
    
    // 处理累积的tick
    while (this.state.accumulator >= targetInterval) {
      this.processTick();
      this.state.accumulator -= targetInterval;
    }
    
    // 计算下一次调度延迟
    const nextDelay = Math.max(1, targetInterval - this.state.accumulator);
    
    this.timerId = window.setTimeout(() => {
      this.scheduleNextTick();
    }, nextDelay);
  }
  
  /**
   * 处理单个tick
   */
  private processTick(): TickResult {
    // 开始性能监控
    perfMonitor.startTick();
    const startTime = performance.now();
    const currentTick = this.world.tick + 1;
    
    // 递增tick
    this.world.tick = currentTick;
    
    // 更新内存管理器和对象池
    memoryManager.tick();
    tickAllPools();
    
    // ==================== 阶段1: 生产前准备 ====================
    
    // 1. 自动补充建筑输入
    const endAutoFeed = perfMonitor.startMeasure('autoFeed');
    autoFeedBuildings(this.world);
    endAutoFeed();
    
    // 2. 获取季节信息（不再直接修改demands）
    const season = getCurrentSeason(currentTick);
    const seasonalEvents = getActiveSeasonalEvents(currentTick);
    
    // ==================== 阶段2: 生产计算 ====================
    
    // 3. 生产计算（生产方式效果已在ProductionEngine中应用）
    const endProduction = perfMonitor.startMeasure('production');
    const productionResult = updateAllProduction(this.world);
    endProduction();
    
    // ==================== 阶段3: 库存管理 ====================
    
    const endInventory = perfMonitor.startMeasure('inventory');
    
    // 4. 处理库存损耗（每天结算一次）
    const decayEvents = inventoryDecayManager.processDailyDecay(currentTick);
    
    // 5. 处理物流运输
    const deliveredShipments = logisticsManager.updateShipments(currentTick);
    
    // 6. 处理供应合同执行
    const executedContracts = supplyContractManager.processContracts(currentTick);
    
    endInventory();
    
    // ==================== 阶段4: 市场交易 ====================
    
    // 7. 模拟消费者需求（统一处理季节性、经济周期等修正）
    const endDemand = perfMonitor.startMeasure('demand');
    this.simulateEnhancedDemand(currentTick);
    endDemand();
    
    // 8. AI公司决策 - 使用新的调度系统（分层决策 + 批量处理 + 缓存）
    const endAI = perfMonitor.startMeasure('ai');
    
    // 使用新的AI调度器处理所有AI决策
    const aiSchedulerStats = processAITick(this.world);
    const aiDecisions = aiSchedulerStats.fastProcessed +
                        aiSchedulerStats.standardProcessed +
                        aiSchedulerStats.deepProcessed;
    
    // 8.5. AI自动挂单（每天执行，确保市场有流动性）
    const aiSellOrders = autoPostSellOrders(this.world);
    const aiBuyOrders = autoPostBuyOrders(this.world);

    // 8.6. AI订单价格自动调整（每3天执行一次）
    if (currentTick % 3 === 0) {
      adjustAllAIOrderPrices(this.world);
    }
    endAI();
    
    // 9. 玩家自动交易（自动销售产品和采购原材料）
    const endPlayerTrade = perfMonitor.startMeasure('playerTrade');
    const playerAutoTrade = executePlayerAutoTrade(this.world);
    endPlayerTrade();
    
    // 10. 消费者市场购买（核心：让需求转化为实际交易）
    const endConsumer = perfMonitor.startMeasure('consumer');
    const consumerPurchases = executeConsumerPurchases(this.world, CONSUMER_MARKET_CONFIG);
    endConsumer();
    
    // 10.5. 零售系统更新（进货、Pop消费、价格调整）
    const endRetail = perfMonitor.startMeasure('retail');
    const retailResult = updateRetailSystem(this.world);
    endRetail();
    
    // 10.6. AI批发直销（生产商直接向零售店供货）
    const endWholesale = perfMonitor.startMeasure('wholesale');
    const wholesaleResult = processWholesaleSupply(this.world);
    endWholesale();
    
    // 10.7. 服务消费系统更新（医院、学校、银行等服务设施）
    const endService = perfMonitor.startMeasure('service');
    const serviceConsumption = processServiceConsumption(this.world);
    endService();

    const dailyActivitySlot = (currentTick - 1) % TICKS_PER_MONTH;
    this.recentRetailRevenue[dailyActivitySlot] = retailResult.totalRevenue ?? 0;
    this.recentServiceRevenue[dailyActivitySlot] = serviceConsumption.totalRevenue ?? 0;
    
    // 11. 检查高级订单触发（止损、止盈等）
    const endAdvanced = perfMonitor.startMeasure('advancedOrders');
    const triggeredAdvancedOrders = this.checkAdvancedOrders(currentTick);
    endAdvanced();
    
    // 12. 订单撮合
    const endMatching = perfMonitor.startMeasure('matching');
    const matchingResult = matchAllOrders(this.world);
    endMatching();
    
    // 调试日志：每100个tick输出一次市场状态
    if (currentTick % 100 === 0) {
      const orderPoolStats = getOrderPoolStats(this.world);
      const orderPoolHealth = getOrderPoolHealth(this.world);
      
      // 输出订单池性能调试信息
      logOrderPoolPerformance(currentTick);
      
      // 订单池警告
      if (orderPoolHealth === 'critical') {
        console.error(`[订单池警告 T${currentTick}] 使用率${orderPoolStats.usagePercent.toFixed(1)}%，活跃订单${orderPoolStats.activeOrders}/${orderPoolStats.maxOrders}！`);
      } else if (orderPoolHealth === 'warning') {
        console.warn(`[订单池警告 T${currentTick}] 使用率${orderPoolStats.usagePercent.toFixed(1)}%，活跃订单${orderPoolStats.activeOrders}/${orderPoolStats.maxOrders}`);
      }
    }
    
    // 13. 应用交易手续费
    this.applyTradingFees(matchingResult);
    
    // 14. 处理渠道订单交付和付款
    // 【性能优化】错峰执行：避免与Deep决策(tick%8===0)冲突
    const monthlyPhase = (currentTick - 1) % TICKS_PER_MONTH;

    if (monthlyPhase === 1) {
      const endDistribution = perfMonitor.startMeasure('distribution');
      distributionManager.processDeliveries(currentTick);
      endDistribution();
    }
    if (monthlyPhase === 9) {
      const endPayments = perfMonitor.startMeasure('distribution-payments');
      distributionManager.processPayments(currentTick);
      endPayments();
    }
    
    // 15. 清理过期订单
    const cleanedOrders = cleanupExpiredOrders(this.world);
    advancedOrderManager.checkExpiry(currentTick);
    
    // ==================== 阶段5: 价格和金融 ====================
    
    const endPricing = perfMonitor.startMeasure('pricing');
    
    // 16. 价格更新
    const priceResult = updateAllPrices(this.world);
    
    // 17. 更新期货市场（每周执行）
    let expiredFuturesContracts = 0;
    if (monthlyPhase === 17) {
      const endFutures = perfMonitor.startMeasure('futures');
      const spotPrices = new Map<number, number>();
      for (let i = 0; i < this.world.goods.count; i++) {
        spotPrices.set(i, this.world.goods.prices[i]);
      }

      // 创建新合约（每月初）
      if (currentTick % TICKS_PER_MONTH === 0) {
        futuresMarket.createMonthlyContracts(currentTick, spotPrices);
      }
      
      // 更新持仓盈亏
      futuresMarket.updatePositionsPnL(spotPrices);
      
      // 处理到期合约
      futuresMarket.handleExpiry(currentTick, spotPrices);
      endFutures();
    }
    
    // 17.5. 需求衰减（每天结束时处理未满足的需求）
    decayUnmetDemand(this.world);
    
    // 17.6. 商品替代效应（每2天应用一次）
    if (currentTick % 2 === 0) {
      applyMarketSubstitution(this.world);
    }
    
    endPricing();
    
    // 18. 更新经济周期
    const endFinance = perfMonitor.startMeasure('finance');
    this.updateBusinessCycle();
    
    // 19. 更新银行系统（每个tick处理还款等）
    updateBankingSystem(this.world);
    
    // 19.5. 结算建筑运营成本（维护、人力、能耗）
    applyOperatingCosts(this.world);
    
    // ==================== 阶段6: 品牌和状态更新 ====================
    
    // 20. AI股票交易决策（每3天一次）
    if (currentTick % 3 === 0) {
      executeAIStockTrading(this.world);
    }

    // 21. 更新股票市场（每天更新）
    updateStockMarket(this.world);
    
    // 21. 更新收购系统（处理过期要约等）
    updateAcquisitionSystem(this.world);
    
    endFinance();
    
    // 22. AI附属建筑管理（每5天一次）
    let aiSubsidiaryActions = 0;
    if (currentTick % 5 === 0) {
      const endAISubsidiary = perfMonitor.startMeasure('ai-subsidiary');
      aiSubsidiaryActions = runAISubsidiaryManagement(this.world);
      endAISubsidiary();
    }

    // 23. 更新品牌衰减（每天）
    const endState = perfMonitor.startMeasure('state');
    brandManager.processDailyDecay(currentTick);

    // 23.5 重置服务设施每日统计（每天执行）
    resetDailyServiceStats();
    
    // 23.6 处理建造/拆除队列
    const constructionResult = processConstructionAndDemolitionTick(this.world);
    
    // 24. 更新供应合同状态
    supplyContractManager.updateContractStatus(currentTick);

    // 24.5 推进破产处置流程
    bankruptcyResolution.advance(this.world, currentTick);
    
    // 25. 检查AI破产（每月一次）
    // 当前日历模型为 1 tick = 1 天，因此 30 tick = 30 天 = 1 个月。
    if (currentTick % TICKS_PER_MONTH === 0) {
      this.checkAIBankruptcy();
      this.logMoneySupply();
    }

    // 26. 战略建材检查（每15天运行一次）
    const strategicMaterialDecisions = runStrategicMaterialCheck(this.world);
    if (strategicMaterialDecisions > 0 && currentTick % 15 === 0) {
      console.log(`[战略建材 T${currentTick}] 触发了${strategicMaterialDecisions}个紧急建造决策`);
    }

    // 27. 冷门商品检测与自动补充（每月运行一次）
    const coldGoodsDecisions = buildForColdGoods(this.world);
    if (coldGoodsDecisions > 0) {
      console.log(`[冷门商品 T${currentTick}] 触发了${coldGoodsDecisions}个建造决策`);
    }
    
    // 28. 【P2修复】零供应商品强制建造
    // 每100tick运行一次，强制分配AI公司建造完全没有供应的商品
    const zeroSupplyDecisions = forceBuildzeroSupplyGoods(this.world);
    if (zeroSupplyDecisions > 0) {
      console.log(`[零供应强制建造 T${currentTick}] 触发了${zeroSupplyDecisions}个强制建造决策`);
    }
    
    // ==================== 阶段7: 新闻系统 ====================
    
    // 重要：必须先生成新闻（使用上月快照），再捕获新月快照！
    // 顺序错误会导致价格变化等数据全为0
    
    let newsGenerated: MonthlyNewsReport | undefined;
    
    const shouldProcessMonthlyNews = shouldCaptureSnapshot(currentTick);

    // 28. 生成月度新闻（每月1号0点，生成上月新闻）
    // 必须在捕获新快照之前执行，否则上月数据会被覆盖
    if (shouldProcessMonthlyNews) {
      const { newsGenerationEnabled } = saveManager.loadSettings();

      if (shouldGenerateNews(currentTick, newsGenerationEnabled)) {
        // 异步生成新闻，不阻塞游戏循环
        generateMonthlyNews(this.world)
          .then(report => {
            if (report) {
              console.log(`[GameLoop] 月度新闻已生成: ${report.headline.title}`);
            }
          })
          .catch(error => {
            console.error('[GameLoop] 新闻生成失败:', error);
          });
      }

      // 29. 记录月初快照（每月1号0点）
      // 必须在生成新闻之后执行，为下个月新闻准备数据
      captureMonthStartSnapshot(this.world);
    }
    
    // 30. 更新月度价格追踪器（每tick更新，但仅在月末生成报告）
    updateMonthlyTracker(this.world);
    
    endState();
    
    // 计算tick时间
    const tickTime = performance.now() - startTime;
    
    // 结束性能监控并生成报告
    this.lastPerfReport = perfMonitor.endTick(currentTick);
    
    // 更新性能统计
    this.state.tickCount++;
    this.state.avgTickTime =
      (this.state.avgTickTime * (this.state.tickCount - 1) + tickTime) / this.state.tickCount;
    if (tickTime > this.state.maxTickTime) {
      this.state.maxTickTime = tickTime;
    }
    
    // 速率日志
    this.rateLogTickCount++;
    if (this.rateLogStartTime === 0) {
      this.rateLogStartTime = performance.now();
      this.lastRateLogTick = 1;
      this.rateLogTickCount = 0;
      console.log(`[游戏启动] 倍速:${this.state.speed}x | 目标间隔:${this.state.tickInterval}ms | 1tick=1游戏天`);
    }
    if (this.rateLogTickCount >= 10) {
      const now = performance.now();
      const elapsedSec = (now - this.rateLogStartTime) / 1000;
      const actualRate = (this.rateLogTickCount / elapsedSec).toFixed(2);
      console.log(`[速率] ${actualRate} tick/秒 = ${actualRate} 游戏天/秒 | 距上次:${elapsedSec.toFixed(1)}秒 | 倍速:${this.state.speed}x`);
      this.rateLogStartTime = now;
      this.rateLogTickCount = 0;
    }
    
    const result: TickResult = {
      tick: this.world.tick,
      tickTime,
      production: productionResult,
      matching: matchingResult,
      prices: priceResult,
      cleanedOrders,
      aiDecisions,
      // 新增系统结果
      season,
      seasonalEvents,
      decayEvents,
      deliveredShipments,
      triggeredAdvancedOrders,
      executedContracts,
      expiredFuturesContracts,
      consumerPurchases,
      retailResult,
      wholesaleResult,
      serviceConsumption,
      playerAutoTrade,
      aiAutoOrders: {
        sellOrders: aiSellOrders,
        buyOrders: aiBuyOrders,
      },
      aiSubsidiaryActions,
      construction: constructionResult,
      newsGenerated,
    };
    
    // 调用回调
    if (this.tickCallback) {
      this.tickCallback(result);
    }
    
    return result;
  }
  
  /**
   * 增强版消费需求模拟（统一处理所有修正因素）
   *
   * 修复说明：
   * 1. 将季节性、经济周期、品类修正统一在此处计算
   * 2. 一次性传递给 simulateConsumerDemand 避免重复修改
   * 3. 品牌效应保持独立计算（用于AI决策）
   */
  private simulateEnhancedDemand(currentTick: number): void {
    // 1. 计算季节性修正数组
    const seasonalMultipliers = new Float32Array(this.world.goods.count);
    for (let i = 0; i < this.world.goods.count; i++) {
      seasonalMultipliers[i] = getTotalSeasonalMultiplier(i, currentTick);
    }
    
    // 2. 计算品类的经济周期修正
    const cyclePosition = this.world.economyStats.cyclePosition;
    const categoryMultipliers = new Map<string, number>([
      // 原材料：受周期影响较小
      ['raw', 0.95 + cyclePosition * 0.1],
      // 基础品：受周期影响中等
      ['basic', 0.92 + cyclePosition * 0.16],
      // 中间品：受周期影响较大（企业投资敏感）- 减小波动
      ['intermediate', 0.8 + cyclePosition * 0.4],
      // 最终品：受周期影响（消费信心敏感）
      ['final', 0.88 + cyclePosition * 0.24],
    ]);
    
    // 3. 调用统一的需求计算
    simulateConsumerDemand(this.world, seasonalMultipliers, categoryMultipliers);
    
    // 4. 品牌效应：知名品牌产品需求更高（用于AI决策参考）
    for (let companyId = 0; companyId < this.world.companies.count; companyId++) {
      const brand = brandManager.getBrand(companyId);
      if (brand) {
        brandManager.getBrandDemandMultiplier(companyId);
      }
    }
  }
  
  /**
   * 检查高级订单触发
   */
  private checkAdvancedOrders(currentTick: number): AdvancedOrder[] {
    const allTriggered: AdvancedOrder[] = [];
    
    for (let goodsId = 0; goodsId < this.world.goods.count; goodsId++) {
      const currentPrice = this.world.goods.prices[goodsId];
      const triggered = advancedOrderManager.checkTriggers(goodsId, currentPrice, currentTick);
      allTriggered.push(...triggered);
    }
    
    return allTriggered;
  }
  
  /**
   * 应用交易手续费
   */
  private applyTradingFees(matchingResult: MatchingResult): void {
    if (!matchingResult.trades) return;
    
    for (const trade of matchingResult.trades) {
      // 买方手续费
      const buyerFee = tradingFeeManager.calculateTotalFee(trade.value, trade.buyCompanyId);
      this.world.companies.cash[trade.buyCompanyId] -= buyerFee;
      
      // 卖方手续费
      const sellerFee = tradingFeeManager.calculateTotalFee(trade.value, trade.sellCompanyId);
      this.world.companies.cash[trade.sellCompanyId] -= sellerFee;
    }
  }
  
  /**
   * 更新经济周期
   * 经济周期影响：需求、利率、通胀、失业率
   */
  private updateBusinessCycle(): void {
    const stats = this.world.economyStats;
    const cycleLength = TICKS_PER_YEAR * 5;
    
    // 1. 计算周期位置 (0-1，使用正弦波)
    const radians = (this.world.tick % cycleLength) / cycleLength * 2 * Math.PI;
    stats.cyclePosition = (Math.sin(radians) + 1) / 2;
    
    // 2. 确定周期阶段
    if (stats.cyclePosition > 0.75) {
      stats.cyclePhase = 'peak';
    } else if (stats.cyclePosition > 0.5) {
      stats.cyclePhase = 'expansion';
    } else if (stats.cyclePosition > 0.25) {
      stats.cyclePhase = 'trough';
    } else {
      stats.cyclePhase = 'contraction';
    }
    
    // 3. 根据周期阶段调整经济参数
    this.applyCycleEffects(stats);
    
    // 4. 每天更新GDP：等待一整天数据后再初始化，避免开局占位值导致假暴跌
    if (this.world.tick >= TICKS_PER_DAY && this.world.tick % TICKS_PER_DAY === 0) {
      this.updateGDP();
    }
  }
  
  /**
   * 应用经济周期效果
   */
  private applyCycleEffects(stats: GameWorld['economyStats']): void {
    const position = stats.cyclePosition;
    
    // 利率：繁荣期高，衰退期低（央行逆周期调节）
    // 扩张期：提高利率抑制过热
    // 收缩期：降低利率刺激经济
    const baseRate = BASE_INTEREST_RATE; // 0.03 (3%)
    const rateAdjustment = (position - 0.5) * 0.04; // ±2%波动
    stats.interestRate = Math.max(0.005, Math.min(0.08, baseRate + rateAdjustment));
    
    // 通胀：繁荣期高，衰退期低
    // 滞后于周期位置约1/4周期
    const cycleLength = TICKS_PER_YEAR * 5;
    const inflationLag = Math.sin((this.world.tick % cycleLength) / cycleLength * 2 * Math.PI - Math.PI / 4);
    const inflationPosition = (inflationLag + 1) / 2;
    stats.inflation = TARGET_INFLATION + (inflationPosition - 0.5) * 0.04; // 目标2%，波动±2%

    // 失业率：与周期相反，衰退期高
    // 失业率滞后于经济周期约1/8周期
    const unemploymentLag = Math.sin((this.world.tick % cycleLength) / cycleLength * 2 * Math.PI + Math.PI / 8);
    const unemploymentPosition = (unemploymentLag + 1) / 2;
    stats.unemployment = 0.03 + (1 - unemploymentPosition) * 0.07; // 3%-10%范围
    
    // 经济周期对需求的影响已在 simulateEnhancedDemand 中统一处理
  }
  
  // applyDemandCycleEffect 已移除 - 功能合并到 simulateEnhancedDemand 中
  
  /**
   * 检查AI公司破产
   * 【性能优化】使用预计算的buildingCounts，复杂度从O(N×M)降至O(N)
   */
  private checkAIBankruptcy(): void {
    const companies = this.world.companies;
    
    for (let i = 1; i < companies.count; i++) { // 跳过玩家公司(id=0)
      if (!companies.isAI[i]) continue;
      if (bankruptcyResolution.hasActiveEvent(i)) continue;
      
      const cash = companies.cash[i];
      const liabilities = companies.totalLiabilities[i];
      const assets = companies.totalAssets[i];
      
      // 计算净资产
      const netWorth = cash + assets - liabilities;
      
      // 破产条件：
      // 1. 净资产为负
      // 2. 现金不足以支付运营成本（假设每个建筑需要1000/tick）
      // 【性能优化】直接读取预计算的建筑数量，无需遍历所有建筑
      const buildingCount = companies.buildingCounts[i];
      
      const operatingCost = buildingCount * 1000;
      const isCashInsolvent = cash < operatingCost && cash < 10000;
      const isBalanceInsolvent = netWorth < -liabilities * 0.5;
      
      if (isCashInsolvent || isBalanceInsolvent) {
        this.handleBankruptcy(i);
      }
    }
  }
  
  /**
   * 处理公司破产
   */
  private handleBankruptcy(companyId: number): void {
    if (bankruptcyResolution.hasActiveEvent(companyId)) {
      return;
    }

    const companyName = this.world.companies.names[companyId];
    console.log(`[破产] 公司 ${companyName} 已破产`);
    
    // 记录破产事件到新闻系统
    trackCompanyBankrupt(this.world.tick, companyId, companyName);

    bankruptcyResolution.openEvent(this.world, companyId, 'insolvent', this.world.tick);
  }
  
  /**
   * 更新GDP
   */
  private updateGDP(): void {
    // Use a rolling day window under the day model so GDP updates every tick
    // without exploding the annualization factor when each tick is already a day.
    const windowLength = Math.max(TICKS_PER_DAY, Math.min(TICKS_PER_MONTH, this.world.tick));
    let windowRevenue = 0;
    
    // 统计滚动窗口内的成交总额
    const trades = this.world.trades;
    const currentTick = this.world.tick;
    forEachRetainedTradeNewestFirst(this.world, tradeIdx => {
      const tradeTick = trades.ticks[tradeIdx];
      if (tradeTick <= currentTick - windowLength) {
        return false;
      }

      if (tradeTick > currentTick - windowLength && tradeTick <= currentTick) {
        windowRevenue += trades.quantities[tradeIdx] * trades.prices[tradeIdx];
      }
    });

    for (let offset = 0; offset < windowLength; offset++) {
      const slot = (currentTick - 1 - offset + TICKS_PER_MONTH) % TICKS_PER_MONTH;
      windowRevenue += this.recentRetailRevenue[slot];
      windowRevenue += this.recentServiceRevenue[slot];
    }

    const averageDailyGDP = windowRevenue / windowLength;
    const annualizedGDP = averageDailyGDP * TICKS_PER_YEAR;

    if (this.world.economyStats.gdp <= 0) {
      this.world.economyStats.gdp = annualizedGDP;
      return;
    }

    // 平滑更新GDP（避免剧烈波动）
    const smoothingFactor = 0.1;
    this.world.economyStats.gdp =
      this.world.economyStats.gdp * (1 - smoothingFactor) + annualizedGDP * smoothingFactor;
  }

  /**
   * 验证货币循环闭合：sum(企业现金) + 家庭现金 + 银行存款 应恒定（仅维护费沉没）
   */
  private logMoneySupply(): void {
    let totalCompanyCash = 0;
    for (let i = 0; i < this.world.companies.count; i++) {
      totalCompanyCash += this.world.companies.cash[i];
    }
    const householdCash = this.world.households.cash[0];
    const bankDeposits = getBankingState().totalDeposits;
    const totalMoneySupply = totalCompanyCash + householdCash + bankDeposits;

    console.log(
      `[货币供应 T${this.world.tick}] ` +
      `企业: ¥${(totalCompanyCash / 1e8).toFixed(2)}亿 | ` +
      `家庭: ¥${(householdCash / 1e8).toFixed(2)}亿 | ` +
      `银行: ¥${(bankDeposits / 1e8).toFixed(2)}亿 | ` +
      `总计: ¥${(totalMoneySupply / 1e8).toFixed(2)}亿 | ` +
      `累计工资: ¥${(this.world.households.totalWagesReceived / 1e8).toFixed(2)}亿 | ` +
      `累计消费: ¥${(this.world.households.totalConsumptionSpent / 1e8).toFixed(2)}亿`
    );
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): PerformanceReport {
    return {
      tickCount: this.state.tickCount,
      avgTickTime: this.state.avgTickTime,
      maxTickTime: this.state.maxTickTime,
      targetTickTime: this.state.tickInterval,
      performanceRatio: this.state.avgTickTime / this.state.tickInterval,
      isHealthy: this.state.avgTickTime < this.state.tickInterval * 0.5,
    };
  }
  
  /**
   * 【新增】获取AI Worker状态
   */
  getAIWorkerStatus() {
    const workerStatus = getAIWorkerStatus();
    return {
      ...workerStatus,
      loopInitialized: this.aiWorkerInitialized,
    };
  }
  
  /**
   * 获取详细性能报告
   */
  getDetailedPerformanceReport(): TickPerformanceReport | null {
    return this.lastPerfReport;
  }
  
  /**
   * 获取性能监控器的完整报告
   */
  getFullPerformanceReport(): string {
    return perfMonitor.getReport();
  }
  
  /**
   * 获取性能健康状态
   */
  getPerformanceHealth(): 'healthy' | 'warning' | 'critical' {
    return perfMonitor.getHealthStatus();
  }
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  tickCount: number;
  avgTickTime: number;
  maxTickTime: number;
  targetTickTime: number;
  performanceRatio: number;
  isHealthy: boolean;
}

/**
 * 创建游戏循环实例
 */
export function createGameLoop(world: GameWorld): GameLoop {
  return new GameLoop(world);
}
