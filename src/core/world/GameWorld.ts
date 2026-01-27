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
  MAX_SUBSIDIARIES,
  HISTORY_SIZE,
  MAX_RETAIL_STORES,
  MAX_TRADES,
} from '../constants';

// ==================== 类型定义 ====================

/** 商品系统数据 */
export interface GoodsSystem {
  count: number;
  prices: Float32Array;           // 当前价格
  baseValues: Float32Array;       // 基准价值
  supplies: Float32Array;         // 本tick总供给
  demands: Float32Array;          // 本tick总需求
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
  
  // 生产状态
  slotMethods: Uint32Array;       // [N × MAX_SLOTS] 每槽位当前方法(新系统ID 10000+)
  progress: Float32Array;         // 生产进度0-1
  
  // 输入输出缓冲区
  inputBuffers: Float32Array;     // [N × MAX_INPUTS]
  outputBuffers: Float32Array;    // [N × MAX_OUTPUTS]
  
  // 配方索引
  recipeIds: Uint8Array;          // 当前使用的配方ID
  
  // 状态标记
  isActive: Uint8Array;           // 是否激活运营
  
  // 附属建筑系统
  subsidiaryIds: Uint16Array;           // [N × MAX_SUBSIDIARIES] 已安装的附属建筑ID
  subsidiaryConditions: Float32Array;   // [N × MAX_SUBSIDIARIES] 附属建筑状态 0-1
  subsidiaryInstalledTicks: Uint32Array; // [N × MAX_SUBSIDIARIES] 安装时间
  subsidiaryCount: Uint8Array;          // [N] 每个建筑已安装的附属建筑数量
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
  
  buyOrderIds: Uint32Array;
  sellOrderIds: Uint32Array;
  buyCompanyIds: Uint16Array;
  sellCompanyIds: Uint16Array;
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
  return {
    count: 0,
    maxCount: MAX_BUILDINGS,
    types: new Uint8Array(MAX_BUILDINGS),
    owners: new Uint16Array(MAX_BUILDINGS),
    levels: new Uint8Array(MAX_BUILDINGS),
    efficiencies: new Float32Array(MAX_BUILDINGS),
    slotMethods: new Uint32Array(MAX_BUILDINGS * MAX_SLOTS),  // 升级到Uint32支持10000+的方式ID
    progress: new Float32Array(MAX_BUILDINGS),
    inputBuffers: new Float32Array(MAX_BUILDINGS * MAX_INPUTS),
    outputBuffers: new Float32Array(MAX_BUILDINGS * MAX_OUTPUTS),
    recipeIds: new Uint8Array(MAX_BUILDINGS),
    isActive: new Uint8Array(MAX_BUILDINGS),
    // 附属建筑系统
    subsidiaryIds: new Uint16Array(MAX_BUILDINGS * MAX_SUBSIDIARIES),
    subsidiaryConditions: new Float32Array(MAX_BUILDINGS * MAX_SUBSIDIARIES),
    subsidiaryInstalledTicks: new Uint32Array(MAX_BUILDINGS * MAX_SUBSIDIARIES),
    subsidiaryCount: new Uint8Array(MAX_BUILDINGS),
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
    buyOrderIds: new Uint32Array(MAX_TRADES),
    sellOrderIds: new Uint32Array(MAX_TRADES),
    buyCompanyIds: new Uint16Array(MAX_TRADES),
    sellCompanyIds: new Uint16Array(MAX_TRADES),
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
 * 计算游戏内日期
 */
export function tickToDate(tick: number): { year: number; month: number; day: number; hour: number } {
  const day = Math.floor(tick / 24) + 1;
  const hour = tick % 24;
  const month = Math.floor((day - 1) / 30) + 1;
  const year = Math.floor((month - 1) / 12) + 1;
  return {
    year,
    month: ((month - 1) % 12) + 1,
    day: ((day - 1) % 30) + 1,
    hour,
  };
}

/**
 * 格式化游戏日期
 */
export function formatGameDate(tick: number): string {
  const date = tickToDate(tick);
  return `第${date.year}年 ${date.month}月${date.day}日 ${date.hour}:00`;
}