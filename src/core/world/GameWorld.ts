/**
 * GameWorld - 游戏世界核心数据结构
 * 使用结构体数组（SoA）设计，优化缓存和批量处理性能
 */

import {
  GOODS_COUNT,
  MAX_BUILDINGS,
  MAX_COMPANIES,
  MAX_ORDERS,
  MAX_INPUTS,
  MAX_OUTPUTS,
  MAX_SLOTS,
  HISTORY_SIZE,
  MAX_RETAIL_STORES,
  MAX_TRADES,
  MAX_CONSTRUCTION_QUEUE,
  MAX_DEMOLITION_QUEUE,
  MAX_RESERVED_MATERIALS,
  MAX_RECOVERED_MATERIALS,
  TICKS_PER_MONTH,
  TICKS_PER_YEAR,
} from '../constants';

// ==================== 类型定义 ====================

/** 商品系统数据 */
export interface GoodsSystem {
  count: number;
  prices: Float32Array;           // 当前价格
  baseValues: Float32Array;       // 基准价值
  supplies: Float32Array;         // 本tick总供给
  demands: Float32Array;          // 本tick总需求（gross demand）
  demandPressure: Float32Array;   // 本tick未满足需求压力（unmet demand）
  demandPressureTick: number;     // pressure 对应的 tick
  priceHistory: Float32Array;     // [GOODS_COUNT × HISTORY_SIZE]
  historyIndex: number;
  
  // 商品元数据（不需要高性能访问）
  names: string[];
  categories: string[];
}

/** 建筑系统数据 */
export interface BuildingsSystem {
  count: number;
  maxCount: number;
  
  // 基础属性（紧凑数组）
  types: Uint8Array;              // 建筑类型ID
  owners: Uint16Array;            // 所属公司ID
  levels: Uint8Array;             // 等级1-5
  efficiencies: Float32Array;     // 效率0-1.5
  productionControlModes: Uint8Array;     // 生产控制模式：0=自动 1=手动
  manualEfficiencyTargets: Float32Array;  // 手动效率目标（0.3-1.5）
  
  // 生产状态
  slotMethods: Uint32Array;       // [N × MAX_SLOTS] 每槽位当前方法 ID（注册体系 ID ≥ 10000）
  progress: Float32Array;         // 生产进度0-1
  
  // 输入输出缓冲区
  inputBuffers: Float32Array;     // [N × MAX_INPUTS]
  outputBuffers: Float32Array;    // [N × MAX_OUTPUTS]

  // 状态标记
  isActive: Uint8Array;           // 是否激活运营
  oversupplySuspendedGoods: Int16Array;      // 自动因过剩休眠的主商品，-1=未休眠
  oversupplySuspendedUntilTick: Uint32Array; // 自动休眠最早恢复 tick
}

/** 公司系统数据 */
export interface CompaniesSystem {
  count: number;
  
  // 财务
  cash: Float64Array;             // 现金（用64位避免精度问题）
  
  // 库存
  inventories: Float32Array;      // [COMPANY_COUNT × GOODS_COUNT]
  inventoryReserved: Float32Array; // 预留的库存（挂单中）
  
  // 品质追踪
  qualityScores: Float32Array;    // [COMPANY_COUNT × GOODS_COUNT] 每种商品的平均品质(0-4)
  
  // 运营数据
  totalAssets: Float64Array;
  totalLiabilities: Float64Array;
  
  // 【性能优化】预计算的建筑数量，避免O(N×M)遍历
  buildingCounts: Uint16Array;    // [COMPANY_COUNT] 每个公司拥有的建筑数量
  
  // 公司元数据
  names: string[];
  isPlayer: boolean[];
  isAI: boolean[];
}

/** 订单系统数据 */
export interface OrdersSystem {
  maxOrders: number;
  activeCount: number;
  
  // 订单数据
  companyIds: Uint16Array;
  goodsIds: Uint8Array;
  types: Uint8Array;              // 0=buy, 1=sell
  quantities: Float32Array;
  prices: Float32Array;
  remainings: Float32Array;
  expiries: Uint32Array;
  createdTicks: Uint32Array;
  
  // 状态标记
  isActive: Uint8Array;           // 位图：0=空闲, 1=活跃
  
  // 自增ID
  nextOrderId: number;
}

/** 成交记录 */
export interface TradesSystem {
  maxTrades: number;
  count: number;
  
  buyOrderIds: Int32Array;
  sellOrderIds: Int32Array;
  buyCompanyIds: Int16Array;
  sellCompanyIds: Int16Array;
  goodsIds: Uint8Array;
  quantities: Float32Array;
  prices: Float32Array;
  ticks: Uint32Array;
  
  nextTradeId: number;
  
  // 累计销售统计（不会被清空）
  // [COMPANY_COUNT × GOODS_COUNT] 每个公司每种商品的累计销售量
  cumulativeSalesQuantity: Float32Array;
  // [COMPANY_COUNT × GOODS_COUNT] 每个公司每种商品的累计销售额
  cumulativeSalesRevenue: Float64Array;
}

/** 零售系统数据（从RetailSystem导入） */
export interface RetailSystemData {
  count: number;
  buildingIds: Uint16Array;
  types: Uint8Array;
  owners: Uint16Array;
  inventories: Float32Array;
  inventoryCapacities: Float32Array;
  markups: Float32Array;
  retailPrices: Float32Array;
  purchaseCosts: Float32Array;
  dailySales: Float32Array;
  dailyRevenue: Float64Array;
  dailyCost: Float64Array;
  totalCustomers: Uint32Array;
  reputation: Float32Array;
  brandValue: Float32Array;
  lastRestockTick: Uint32Array;
}

/** 建造队列状态 */
export enum ConstructionStatus {
  WAITING = 0,      // 等待材料/资源
  IN_PROGRESS = 1,  // 建造中
  COMPLETED = 2,    // 已完成
  CANCELLED = 3,    // 已取消
}

/** 拆除队列状态 */
export enum DemolitionStatus {
  WAITING = 0,      // 等待开始
  IN_PROGRESS = 1,  // 拆除中
  COMPLETED = 2,    // 已完成
  CANCELLED = 3,    // 已取消
}

/** 建造队列系统数据 (SoA设计) */
export interface ConstructionQueueSystem {
  maxQueueSize: number;
  count: number;                        // 当前队列总数
  
  // 队列数据 (大小 = MAX_COMPANIES * MAX_CONSTRUCTION_QUEUE)
  companyIds: Uint16Array;              // 所属公司ID
  buildingTypeIds: Uint8Array;          // 目标建筑类型ID
  targetLevels: Uint8Array;             // 目标等级 (1=新建, 2-5=升级)
  statuses: Uint8Array;                 // ConstructionStatus
  progress: Float32Array;               // 建造进度 0-1
  startTicks: Uint32Array;              // 开始时间
  estimatedEndTicks: Uint32Array;       // 预计完成时间
  materialReserveIds: Uint32Array;      // 预留材料池的起始索引

  // 已有建筑升级专用 (新建时为-1)
  existingBuildingIds: Int16Array;      // 正在升级的建筑ID，-1表示新建
  slotMethods: Uint32Array;             // [queue × MAX_SLOTS] 新建完成时要应用的槽位方法
  
  // 状态标记
  isActive: Uint8Array;                 // 是否活跃 (位图)
  
  // 队列索引跟踪
  nextQueueId: number;
}

/** 拆除队列系统数据 (SoA设计) */
export interface DemolitionQueueSystem {
  maxQueueSize: number;
  count: number;
  
  // 队列数据 (大小 = MAX_COMPANIES * MAX_DEMOLITION_QUEUE)
  companyIds: Uint16Array;              // 所属公司ID
  buildingIds: Uint16Array;             // 目标建筑ID
  buildingTypeIds: Uint8Array;          // 建筑类型ID (用于计算回收)
  buildingLevels: Uint8Array;           // 建筑等级
  statuses: Uint8Array;                 // DemolitionStatus
  progress: Float32Array;               // 拆除进度 0-1
  startTicks: Uint32Array;              // 开始时间
  estimatedEndTicks: Uint32Array;       // 预计完成时间
  recoveryPoolIds: Uint32Array;         // 回收材料池的起始索引
  
  // 拆除成本与回收
  demolitionCosts: Float32Array;        // 拆除花费
  estimatedCashRecovery: Float32Array;  // 预计现金回收
  
  // 状态标记
  isActive: Uint8Array;
  isHazardous: Uint8Array;              // 是否危险建筑 (需额外成本)
  
  nextQueueId: number;
}

/** 预留材料池 (用于建造) */
export interface ReservedMaterialsPool {
  maxSize: number;
  count: number;
  
  queueIds: Uint32Array;                // 关联的建造队列ID
  goodsIds: Uint8Array;                 // 商品ID
  quantities: Float32Array;             // 数量
  companyIds: Uint16Array;              // 来源公司ID
  isReserved: Uint8Array;               // 是否已预留
}

/** 回收材料池 (用于拆除) */
export interface RecoveredMaterialsPool {
  maxSize: number;
  count: number;
  
  queueIds: Uint32Array;                // 关联的拆除队列ID
  goodsIds: Uint8Array;                 // 商品ID
  quantities: Float32Array;             // 数量
  targetCompanyIds: Uint16Array;        // 目标公司ID
  isCollected: Uint8Array;              // 是否已领取
}

/** 家庭系统数据（闭合货币循环：消费者资金池） */
export interface HouseholdSystem {
  cash: Float64Array;
  totalWagesReceived: number;
  totalConsumptionSpent: number;
}

/** 游戏世界主结构 */
export interface GameWorld {
  tick: number;
  speed: 1 | 2 | 4 | 8;
  paused: boolean;

  goods: GoodsSystem;
  buildings: BuildingsSystem;
  companies: CompaniesSystem;
  orders: OrdersSystem;
  trades: TradesSystem;

  // 零售系统（Pop只能在零售建筑消费）
  retail: RetailSystemData;

  // 家庭/消费者系统（闭合货币循环）
  households: HouseholdSystem;

  // 建造/拆除系统
  construction: ConstructionQueueSystem;
  demolition: DemolitionQueueSystem;
  reservedMaterials: ReservedMaterialsPool;
  recoveredMaterials: RecoveredMaterialsPool;

  // 经济指标
  economyStats: {
    gdp: number;
    inflation: number;
    unemployment: number;
    interestRate: number;
    cyclePhase: 'expansion' | 'peak' | 'contraction' | 'trough';
    cyclePosition: number;
    // 零售统计
    retailSales?: number;
    retailRevenue?: number;
  };
}

// ==================== 工厂函数 ====================

/**
 * 创建空的商品系统
 */
export function createGoodsSystem(): GoodsSystem {
  return {
    count: 0,
    prices: new Float32Array(GOODS_COUNT),
    baseValues: new Float32Array(GOODS_COUNT),
    supplies: new Float32Array(GOODS_COUNT),
    demands: new Float32Array(GOODS_COUNT),
    demandPressure: new Float32Array(GOODS_COUNT),
    demandPressureTick: -1,
    priceHistory: new Float32Array(GOODS_COUNT * HISTORY_SIZE),
    historyIndex: 0,
    names: [],
    categories: [],
  };
}

/**
 * 创建空的建筑系统
 */
export function createBuildingsSystem(): BuildingsSystem {
  const manualEfficiencyTargets = new Float32Array(MAX_BUILDINGS);
  manualEfficiencyTargets.fill(1.0);
  const oversupplySuspendedGoods = new Int16Array(MAX_BUILDINGS);
  oversupplySuspendedGoods.fill(-1);

  return {
    count: 0,
    maxCount: MAX_BUILDINGS,
    types: new Uint8Array(MAX_BUILDINGS),
    owners: new Uint16Array(MAX_BUILDINGS),
    levels: new Uint8Array(MAX_BUILDINGS),
    efficiencies: new Float32Array(MAX_BUILDINGS),
    productionControlModes: new Uint8Array(MAX_BUILDINGS),
    manualEfficiencyTargets,
    slotMethods: new Uint32Array(MAX_BUILDINGS * MAX_SLOTS),  // 升级到Uint32支持10000+的方式ID
    progress: new Float32Array(MAX_BUILDINGS),
    inputBuffers: new Float32Array(MAX_BUILDINGS * MAX_INPUTS),
    outputBuffers: new Float32Array(MAX_BUILDINGS * MAX_OUTPUTS),
    isActive: new Uint8Array(MAX_BUILDINGS),
    oversupplySuspendedGoods,
    oversupplySuspendedUntilTick: new Uint32Array(MAX_BUILDINGS),
  };
}

/**
 * 创建空的公司系统
 */
export function createCompaniesSystem(): CompaniesSystem {
  // 初始化品质分数为标准品质(1.0)
  const qualityScores = new Float32Array(MAX_COMPANIES * GOODS_COUNT);
  qualityScores.fill(1.0); // QualityGrade.STANDARD = 1
  
  return {
    count: 0,
    cash: new Float64Array(MAX_COMPANIES),
    inventories: new Float32Array(MAX_COMPANIES * GOODS_COUNT),
    inventoryReserved: new Float32Array(MAX_COMPANIES * GOODS_COUNT),
    qualityScores,
    totalAssets: new Float64Array(MAX_COMPANIES),
    totalLiabilities: new Float64Array(MAX_COMPANIES),
    // 【性能优化】预计算建筑数量，避免O(N×M)遍历
    buildingCounts: new Uint16Array(MAX_COMPANIES),
    names: [],
    isPlayer: [],
    isAI: [],
  };
}

/**
 * 创建空的订单系统
 */
export function createOrdersSystem(): OrdersSystem {
  return {
    maxOrders: MAX_ORDERS,
    activeCount: 0,
    companyIds: new Uint16Array(MAX_ORDERS),
    goodsIds: new Uint8Array(MAX_ORDERS),
    types: new Uint8Array(MAX_ORDERS),
    quantities: new Float32Array(MAX_ORDERS),
    prices: new Float32Array(MAX_ORDERS),
    remainings: new Float32Array(MAX_ORDERS),
    expiries: new Uint32Array(MAX_ORDERS),
    createdTicks: new Uint32Array(MAX_ORDERS),
    isActive: new Uint8Array(MAX_ORDERS),
    nextOrderId: 1,
  };
}

/**
 * 创建空的成交系统
 * 使用 MAX_TRADES 常量控制环形缓冲区大小
 * 默认100000条记录，可保留更长历史
 */
export function createTradesSystem(): TradesSystem {
  return {
    maxTrades: MAX_TRADES,
    count: 0,
    buyOrderIds: new Int32Array(MAX_TRADES),
    sellOrderIds: new Int32Array(MAX_TRADES),
    buyCompanyIds: new Int16Array(MAX_TRADES),
    sellCompanyIds: new Int16Array(MAX_TRADES),
    goodsIds: new Uint8Array(MAX_TRADES),
    quantities: new Float32Array(MAX_TRADES),
    prices: new Float32Array(MAX_TRADES),
    ticks: new Uint32Array(MAX_TRADES),
    nextTradeId: 1,
    // 累计销售统计
    cumulativeSalesQuantity: new Float32Array(MAX_COMPANIES * GOODS_COUNT),
    cumulativeSalesRevenue: new Float64Array(MAX_COMPANIES * GOODS_COUNT),
  };
}

/**
 * 创建零售系统数据结构
 */
export function createRetailSystem(): RetailSystemData {
  return {
    count: 0,
    buildingIds: new Uint16Array(MAX_RETAIL_STORES),
    types: new Uint8Array(MAX_RETAIL_STORES),
    owners: new Uint16Array(MAX_RETAIL_STORES),
    
    inventories: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    inventoryCapacities: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    
    markups: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    retailPrices: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    purchaseCosts: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    
    dailySales: new Float32Array(MAX_RETAIL_STORES * GOODS_COUNT),
    dailyRevenue: new Float64Array(MAX_RETAIL_STORES),
    dailyCost: new Float64Array(MAX_RETAIL_STORES),
    totalCustomers: new Uint32Array(MAX_RETAIL_STORES),
    
    reputation: new Float32Array(MAX_RETAIL_STORES),
    brandValue: new Float32Array(MAX_RETAIL_STORES),
    
    lastRestockTick: new Uint32Array(MAX_RETAIL_STORES),
  };
}

/**
 * 创建建造队列系统
 */
export function createConstructionQueueSystem(): ConstructionQueueSystem {
  const size = MAX_COMPANIES * MAX_CONSTRUCTION_QUEUE;
  return {
    maxQueueSize: size,
    count: 0,
    companyIds: new Uint16Array(size),
    buildingTypeIds: new Uint8Array(size),
    targetLevels: new Uint8Array(size),
    statuses: new Uint8Array(size),
    progress: new Float32Array(size),
    startTicks: new Uint32Array(size),
    estimatedEndTicks: new Uint32Array(size),
    materialReserveIds: new Uint32Array(size),
    existingBuildingIds: new Int16Array(size).fill(-1),
    slotMethods: new Uint32Array(size * MAX_SLOTS),
    isActive: new Uint8Array(size),
    nextQueueId: 1,
  };
}

/**
 * 创建拆除队列系统
 */
export function createDemolitionQueueSystem(): DemolitionQueueSystem {
  const size = MAX_COMPANIES * MAX_DEMOLITION_QUEUE;
  return {
    maxQueueSize: size,
    count: 0,
    companyIds: new Uint16Array(size),
    buildingIds: new Uint16Array(size),
    buildingTypeIds: new Uint8Array(size),
    buildingLevels: new Uint8Array(size),
    statuses: new Uint8Array(size),
    progress: new Float32Array(size),
    startTicks: new Uint32Array(size),
    estimatedEndTicks: new Uint32Array(size),
    recoveryPoolIds: new Uint32Array(size),
    demolitionCosts: new Float32Array(size),
    estimatedCashRecovery: new Float32Array(size),
    isActive: new Uint8Array(size),
    isHazardous: new Uint8Array(size),
    nextQueueId: 1,
  };
}

/**
 * 创建预留材料池
 */
export function createReservedMaterialsPool(): ReservedMaterialsPool {
  return {
    maxSize: MAX_RESERVED_MATERIALS,
    count: 0,
    queueIds: new Uint32Array(MAX_RESERVED_MATERIALS),
    goodsIds: new Uint8Array(MAX_RESERVED_MATERIALS),
    quantities: new Float32Array(MAX_RESERVED_MATERIALS),
    companyIds: new Uint16Array(MAX_RESERVED_MATERIALS),
    isReserved: new Uint8Array(MAX_RESERVED_MATERIALS),
  };
}

/**
 * 创建回收材料池
 */
export function createRecoveredMaterialsPool(): RecoveredMaterialsPool {
  return {
    maxSize: MAX_RECOVERED_MATERIALS,
    count: 0,
    queueIds: new Uint32Array(MAX_RECOVERED_MATERIALS),
    goodsIds: new Uint8Array(MAX_RECOVERED_MATERIALS),
    quantities: new Float32Array(MAX_RECOVERED_MATERIALS),
    targetCompanyIds: new Uint16Array(MAX_RECOVERED_MATERIALS),
    isCollected: new Uint8Array(MAX_RECOVERED_MATERIALS),
  };
}

/**
 * 创建家庭系统（闭合货币循环）
 */
export function createHouseholdSystem(): HouseholdSystem {
  return {
    cash: new Float64Array(1),
    totalWagesReceived: 0,
    totalConsumptionSpent: 0,
  };
}

/**
 * 创建完整的游戏世界
 */
export function createGameWorld(): GameWorld {
  return {
    tick: 0,
    speed: 1,
    paused: true,

    goods: createGoodsSystem(),
    buildings: createBuildingsSystem(),
    companies: createCompaniesSystem(),
    orders: createOrdersSystem(),
    trades: createTradesSystem(),
    retail: createRetailSystem(),
    households: createHouseholdSystem(),

    // 建造/拆除系统
    construction: createConstructionQueueSystem(),
    demolition: createDemolitionQueueSystem(),
    reservedMaterials: createReservedMaterialsPool(),
    recoveredMaterials: createRecoveredMaterialsPool(),

    economyStats: {
      gdp: 0,
      inflation: 0,
      unemployment: 0.05,
      interestRate: 0.03,
      cyclePhase: 'expansion',
      cyclePosition: 0.5,
      retailSales: 0,
      retailRevenue: 0,
    },
  };
}

// ==================== 辅助函数 ====================

/**
 * 获取公司的库存量
 */
export function getInventory(world: GameWorld, companyId: number, goodsId: number): number {
  const idx = companyId * GOODS_COUNT + goodsId;
  return world.companies.inventories[idx];
}

/**
 * 设置公司的库存量
 */
export function setInventory(world: GameWorld, companyId: number, goodsId: number, amount: number): void {
  const idx = companyId * GOODS_COUNT + goodsId;
  world.companies.inventories[idx] = amount;
}

/**
 * 增加公司的库存量
 */
export function addInventory(world: GameWorld, companyId: number, goodsId: number, amount: number): void {
  const idx = companyId * GOODS_COUNT + goodsId;
  world.companies.inventories[idx] += amount;
}

/**
 * 获取建筑的输入缓冲区
 */
export function getBuildingInput(world: GameWorld, buildingId: number, inputSlot: number): number {
  const idx = buildingId * MAX_INPUTS + inputSlot;
  return world.buildings.inputBuffers[idx];
}

/**
 * 设置建筑的输入缓冲区
 */
export function setBuildingInput(world: GameWorld, buildingId: number, inputSlot: number, amount: number): void {
  const idx = buildingId * MAX_INPUTS + inputSlot;
  world.buildings.inputBuffers[idx] = amount;
}

/**
 * 获取建筑的输出缓冲区
 */
export function getBuildingOutput(world: GameWorld, buildingId: number, outputSlot: number): number {
  const idx = buildingId * MAX_OUTPUTS + outputSlot;
  return world.buildings.outputBuffers[idx];
}

/**
 * 设置建筑的输出缓冲区
 */
export function setBuildingOutput(world: GameWorld, buildingId: number, outputSlot: number, amount: number): void {
  const idx = buildingId * MAX_OUTPUTS + outputSlot;
  world.buildings.outputBuffers[idx] = amount;
}

/**
 * 获取价格历史
 */
export function getPriceHistory(world: GameWorld, goodsId: number, periodsBack: number): number {
  const idx = (world.goods.historyIndex - periodsBack + HISTORY_SIZE) % HISTORY_SIZE;
  return world.goods.priceHistory[goodsId * HISTORY_SIZE + idx];
}

/**
 * 记录当前价格到历史
 */
export function recordPriceHistory(world: GameWorld): void {
  const g = world.goods;
  for (let i = 0; i < g.count; i++) {
    g.priceHistory[i * HISTORY_SIZE + g.historyIndex] = g.prices[i];
  }
  g.historyIndex = (g.historyIndex + 1) % HISTORY_SIZE;
}

/**
 * 计算游戏内日期（1 tick = 1天）
 */
export function tickToDate(tick: number): { year: number; month: number; day: number } {
  const dayIndex = Math.floor(tick);
  const year = Math.floor(dayIndex / TICKS_PER_YEAR) + 1;
  const month = Math.floor((dayIndex % TICKS_PER_YEAR) / TICKS_PER_MONTH) + 1;
  const day = (dayIndex % TICKS_PER_MONTH) + 1;

  return {
    year,
    month,
    day,
  };
}

/**
 * 格式化月/日短标签
 */
export function formatMonthDay(tick: number): string {
  const date = tickToDate(tick);
  return `${date.month}/${date.day}`;
}

/**
 * 格式化月/日中文标签
 */
export function formatMonthDayText(tick: number): string {
  const date = tickToDate(tick);
  return `${date.month}月${date.day}日`;
}

/**
 * 格式化游戏日期（1 tick = 1天）
 */
export function formatGameDate(tick: number): string {
  const date = tickToDate(tick);
  return `第${date.year}年 ${date.month}月${date.day}日`;
}
