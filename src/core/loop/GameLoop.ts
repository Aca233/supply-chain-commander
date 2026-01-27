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
import { cleanupExpiredOrders, initOrderPool, getOrderPoolStats, getOrderPoolHealth, logOrderPoolPerformance } from '../market/OrderBook';
import { resetOrderBookIndex } from '../market/OrderBookIndex';
import { resetPriceCache } from '../market/PriceCache';
import { updateAllPrices, simulateConsumerDemand, PriceUpdateResult } from '../economy/PriceEngine';
import { autoPostSellOrders, autoPostBuyOrders, executeAIStockTrading, runAISubsidiaryManagement } from '../ai/AIDecisionEngine';
import { initializeBankingSystem, updateBankingSystem } from '../finance/BankingSystem';
import { initializeStockMarket, updateStockMarket } from '../finance/StockMarket';
import { initializeAcquisitionSystem, updateAcquisitionSystem } from '../finance/AcquisitionSystem';
import { addBuilding } from '../world/WorldInitializer';
import { DEFAULT_TICK_INTERVAL, BASE_INTEREST_RATE, TARGET_INFLATION, GOODS_COUNT, AI_BATCH_SIZE } from '../constants';
import { perfMonitor, TickPerformanceReport } from '../performance/PerformanceMonitor';
import { memoryManager } from '../performance/MemoryManager';
import { tickAllPools } from '../performance/ObjectPool';
import { processAITick, getAISchedulerStats, resetAIScheduler } from '../ai/AIScheduler';
import { indicatorCache } from '../ai/IndicatorCache';
import { clearAllModuleCache } from '../ai/ModuleCache';

// 导入新增的增强系统
import { getCurrentSeason, getTotalSeasonalMultiplier, getActiveSeasonalEvents, Season, SeasonalEvent } from '../economy/SeasonalDemand';
import { inventoryDecayManager, DecayEvent } from '../economy/InventoryDecay';
import { brandManager } from '../economy/BrandSystem';
import { logisticsManager, ShipmentOrder } from '../economy/LogisticsSystem';
import { distributionManager } from '../economy/DistributionChannels';
import { supplyContractManager, ContractExecution } from '../economy/SupplyContracts';
import { advancedOrderManager, AdvancedOrder } from '../market/AdvancedOrders';
import { decayUnmetDemand } from '../economy/DemandCurve';
import { futuresMarket } from '../finance/FuturesMarket';
import { tradingFeeManager } from '../market/TradingFees';
import { executeConsumerPurchases, MarketConsumptionSummary, CONSUMER_MARKET_CONFIG } from '../economy/ConsumerMarket';
import { executePlayerAutoTrade } from '../ai/PlayerAutoTrader';
import { updateRetailSystem, RetailTickResult } from '../economy/RetailSystem';

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
    initializeBankingSystem(world);
    initializeStockMarket(world);
    initializeAcquisitionSystem();
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
    
    // 4. 处理库存损耗（每天结算一次）
    const decayEvents = inventoryDecayManager.processDailyDecay(currentTick);
    
    // 5. 处理物流运输
    const deliveredShipments = logisticsManager.updateShipments(currentTick);
    
    // 6. 处理供应合同执行
    const executedContracts = supplyContractManager.processContracts(currentTick);
    
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
    
    // 8.5. AI自动挂单（确保市场有流动性）
    const aiSellOrders = autoPostSellOrders(this.world);
    const aiBuyOrders = autoPostBuyOrders(this.world);
    endAI();
    
    // 9. 玩家自动交易（自动销售产品和采购原材料）
    const playerAutoTrade = executePlayerAutoTrade(this.world);
    
    // 10. 消费者市场购买（核心：让需求转化为实际交易）
    const consumerPurchases = executeConsumerPurchases(this.world, CONSUMER_MARKET_CONFIG);
    
    // 10.5. 零售系统更新（进货、Pop消费、价格调整）
    const endRetail = perfMonitor.startMeasure('retail');
    const retailResult = updateRetailSystem(this.world);
    endRetail();
    
    // 11. 检查高级订单触发（止损、止盈等）
    const triggeredAdvancedOrders = this.checkAdvancedOrders(currentTick);
    
    // 12. 订单撮合（已有内部性能监控）
    const matchingResult = matchAllOrders(this.world);
    
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
    if (currentTick % 24 === 0) {
      distributionManager.processDeliveries(currentTick);
      distributionManager.processPayments(currentTick);
    }
    
    // 15. 清理过期订单
    const cleanedOrders = cleanupExpiredOrders(this.world);
    advancedOrderManager.checkExpiry(currentTick);
    
    // ==================== 阶段5: 价格和金融 ====================
    
    // 16. 价格更新（已有内部性能监控）
    const priceResult = updateAllPrices(this.world);
    
    // 17. 更新期货市场
    let expiredFuturesContracts = 0;
    if (currentTick % 24 === 0) {
      const spotPrices = new Map<number, number>();
      for (let i = 0; i < this.world.goods.count; i++) {
        spotPrices.set(i, this.world.goods.prices[i]);
      }
      
      // 创建新合约（每月初）
      if (currentTick % (30 * 24) === 0) {
        futuresMarket.createMonthlyContracts(currentTick, spotPrices);
      }
      
      // 更新持仓盈亏
      futuresMarket.updatePositionsPnL(spotPrices);
      
      // 处理到期合约
      futuresMarket.handleExpiry(currentTick, spotPrices);
    }
    
    // 17.5. 需求衰减（每天结束时处理未满足的需求）
    decayUnmetDemand(this.world);
    
    // 18. 更新经济周期
    this.updateBusinessCycle();
    
    // 19. 更新银行系统（每个tick处理还款等）
    updateBankingSystem(this.world);
    
    // ==================== 阶段6: 品牌和状态更新 ====================
    
    // 20. AI股票交易决策（每12个tick执行一次，分散负载）
    if (currentTick % 12 === 0) {
      executeAIStockTrading(this.world);
    }
    
    // 21. 更新股票市场（提高更新频率到每4小时更新一次，使市场更活跃）
    if (currentTick % 4 === 0) {
      updateStockMarket(this.world);
    }
    
    // 21. 更新收购系统（处理过期要约等）
    updateAcquisitionSystem(this.world);
    
    // 22. AI附属建筑管理（每天执行一次）
    let aiSubsidiaryActions = 0;
    if (currentTick % 24 === 0) {
      aiSubsidiaryActions = runAISubsidiaryManagement(this.world);
    }
    
    // 23. 更新品牌衰减（每天）
    brandManager.processDailyDecay(currentTick);
    
    // 24. 更新供应合同状态
    supplyContractManager.updateContractStatus(currentTick);
    
    // 25. 检查AI破产（每100个tick检查一次）
    if (currentTick % 100 === 0) {
      this.checkAIBankruptcy();
    }
    
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
    
    // 性能警告（使用性能监控器的警告）
    if (this.lastPerfReport.warnings.length > 0 && tickTime > this.state.tickInterval * 0.8) {
      console.warn(`Tick ${this.world.tick} performance:`, this.lastPerfReport.breakdown);
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
      playerAutoTrade,
      aiAutoOrders: {
        sellOrders: aiSellOrders,
        buyOrders: aiBuyOrders,
      },
      aiSubsidiaryActions,
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
    const cycleLength = 8760 * 5;  // 5年周期 (5年 × 8760 ticks/年)
    
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
    
    // 4. 每天更新GDP（每24个tick更新一次）
    if (this.world.tick % 24 === 0) {
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
    const inflationLag = Math.sin((this.world.tick % (8760 * 5)) / (8760 * 5) * 2 * Math.PI - Math.PI / 4);
    const inflationPosition = (inflationLag + 1) / 2;
    stats.inflation = TARGET_INFLATION + (inflationPosition - 0.5) * 0.04; // 目标2%，波动±2%
    
    // 失业率：与周期相反，衰退期高
    // 失业率滞后于经济周期约1/8周期
    const unemploymentLag = Math.sin((this.world.tick % (8760 * 5)) / (8760 * 5) * 2 * Math.PI + Math.PI / 8);
    const unemploymentPosition = (unemploymentLag + 1) / 2;
    stats.unemployment = 0.03 + (1 - unemploymentPosition) * 0.07; // 3%-10%范围
    
    // 经济周期对需求的影响已在 simulateEnhancedDemand 中统一处理
  }
  
  // applyDemandCycleEffect 已移除 - 功能合并到 simulateEnhancedDemand 中
  
  /**
   * 检查AI公司破产
   */
  private checkAIBankruptcy(): void {
    const companies = this.world.companies;
    
    for (let i = 1; i < companies.count; i++) { // 跳过玩家公司(id=0)
      if (!companies.isAI[i]) continue;
      
      const cash = companies.cash[i];
      const liabilities = companies.totalLiabilities[i];
      const assets = companies.totalAssets[i];
      
      // 计算净资产
      const netWorth = cash + assets - liabilities;
      
      // 破产条件：
      // 1. 净资产为负
      // 2. 现金不足以支付运营成本（假设每个建筑需要1000/tick）
      let buildingCount = 0;
      for (let b = 0; b < this.world.buildings.count; b++) {
        if (this.world.buildings.owners[b] === i) {
          buildingCount++;
        }
      }
      
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
    console.log(`[破产] 公司 ${this.world.companies.names[companyId]} 已破产`);
    
    // 1. 清算所有建筑（转移给市场/其他公司）
    for (let i = 0; i < this.world.buildings.count; i++) {
      if (this.world.buildings.owners[i] === companyId) {
        // 建筑停止运营
        this.world.buildings.isActive[i] = 0;
        
        // 以折扣价出售给其他公司或市场
        const buildingValue = 200000; // 固定估值
        
        // 找一个有能力收购的公司
        let buyerId = -1;
        let maxCash = 0;
        
        for (let j = 0; j < this.world.companies.count; j++) {
          if (j === companyId) continue;
          if (this.world.companies.cash[j] > maxCash &&
              this.world.companies.cash[j] > buildingValue * 0.5) {
            maxCash = this.world.companies.cash[j];
            buyerId = j;
          }
        }
        
        if (buyerId >= 0) {
          // 收购
          const salePrice = buildingValue * 0.5; // 50%折扣
          this.world.companies.cash[buyerId] -= salePrice;
          this.world.companies.cash[companyId] += salePrice;
          this.world.buildings.owners[i] = buyerId;
          this.world.buildings.isActive[i] = 1;
          
          console.log(`[收购] 公司 ${this.world.companies.names[buyerId]} 收购了建筑 #${i}`);
        }
      }
    }
    
    // 2. 清算库存
    for (let i = 0; i < GOODS_COUNT; i++) {
      const inventory = this.world.companies.inventories[companyId * GOODS_COUNT + i];
      if (inventory > 0) {
        // 折价出售库存
        const price = this.world.goods.prices[i] * 0.7;
        this.world.companies.cash[companyId] += inventory * price;
        this.world.companies.inventories[companyId * GOODS_COUNT + i] = 0;
      }
    }
    
    // 3. 偿还债务（尽可能多）
    const cashAfterLiquidation = this.world.companies.cash[companyId];
    const debtRepayment = Math.min(cashAfterLiquidation, this.world.companies.totalLiabilities[companyId]);
    this.world.companies.totalLiabilities[companyId] -= debtRepayment;
    this.world.companies.cash[companyId] -= debtRepayment;
    
    // 4. 重组公司（给予新的启动资金和建筑，模拟新公司进入市场）
    this.restructureCompany(companyId);
  }
  
  /**
   * 重组破产公司
   */
  private restructureCompany(companyId: number): void {
    const newCash = 5000000 + Math.random() * 5000000; // 500万-1000万新资金
    
    this.world.companies.cash[companyId] = newCash;
    this.world.companies.totalAssets[companyId] = newCash;
    this.world.companies.totalLiabilities[companyId] = 0;
    
    // 给予一个新建筑
    const buildingTypes = [0, 1, 2, 3, 4, 5, 6];
    const randomType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
    
    // 简化：使用配方ID = 建筑类型ID
    try {
      addBuilding(this.world, companyId, randomType, randomType);
    } catch (e) {
      // 如果失败，至少有现金可以运营
      console.warn('Failed to add building during restructure:', e);
    }
    
    console.log(`[重组] 公司 ${this.world.companies.names[companyId]} 已重组，新资金 ¥${newCash.toLocaleString()}`);
  }
  
  /**
   * 更新GDP
   */
  private updateGDP(): void {
    // 计算日GDP：所有成交金额总和
    let dailyGDP = 0;
    
    // 统计最近24个tick的成交总额
    const trades = this.world.trades;
    const currentTick = this.world.tick;
    
    for (let i = 0; i < trades.count; i++) {
      const tradeTick = trades.ticks[i];
      if (tradeTick > currentTick - 24 && tradeTick <= currentTick) {
        dailyGDP += trades.quantities[i] * trades.prices[i];
      }
    }
    
    // 年化GDP（乘以365天）
    const annualizedGDP = dailyGDP * 365;
    
    // 平滑更新GDP（避免剧烈波动）
    const smoothingFactor = 0.1;
    this.world.economyStats.gdp =
      this.world.economyStats.gdp * (1 - smoothingFactor) + annualizedGDP * smoothingFactor;
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