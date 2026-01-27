/**
 * 游戏核心常量定义
 * 这些常量用于SoA数据结构的大小分配和游戏规则配置
 * 产业链全覆盖版本：230种商品、107种建筑、232种配方
 */

// ==================== 数据规模常量 ====================

/** 商品种类数（实际230种，预留空间至256） */
export const GOODS_COUNT = 256;

/** 实际商品数量（用于遍历时的精确计数） */
export const ACTUAL_GOODS_COUNT = 230;

/** 最大建筑数量（增加以支持更多产业链） */
export const MAX_BUILDINGS = 3000;

/** 最大公司数量（包括玩家和AI） */
export const MAX_COMPANIES = 100;

/** 最大订单数量（增加以支持更多交易，并预留缓冲空间） */
export const MAX_ORDERS = 50000;

/** 每个建筑最大输入槽位 */
export const MAX_INPUTS = 8;

/** 每个建筑最大输出槽位 */
export const MAX_OUTPUTS = 4;

/** 每个建筑最大生产方式槽位 */
export const MAX_SLOTS = 5;

/** 每个建筑最大附属建筑槽位 */
export const MAX_SUBSIDIARIES = 6;

/** 价格历史记录长度 */
export const HISTORY_SIZE = 365;

/** 人口分层数量（8个收入层级） */
export const POPS_GROUPS = 8;

/** 消费品种类数（实际约80种，根据goods.ts中isConsumerGood统计） */
export const CONSUMER_GOODS_COUNT = 80;

/** 建筑类型数量（107种建筑，包含所有产业链建筑） */
export const BUILDING_TYPES_COUNT = 107;

/** 配方数量（232个配方，包含完整产业链） */
export const RECIPE_COUNT = 232;

// ==================== 时间常量 ====================

/** 每天tick数 */
export const TICKS_PER_DAY = 24;

/** 每年tick数 */
export const TICKS_PER_YEAR = 8760;

/** 默认tick间隔（毫秒）- 400ms作为1x基础，8x时为50ms */
export const DEFAULT_TICK_INTERVAL = 400;

// ==================== 经济常量 ====================

/** 初始GDP（游戏币） */
export const INITIAL_GDP = 10_000_000_000;

/** 初始人口 */
export const INITIAL_POPULATION = 1_000_000;

/** 初始货币供应量 */
export const INITIAL_MONEY_SUPPLY = 50_000_000_000;

/** 目标通胀率 */
export const TARGET_INFLATION = 0.02;

/** 基准利率 */
export const BASE_INTEREST_RATE = 0.03;

// ==================== 价格稳定常量 ====================

/** 单tick最大价格变化 */
export const MAX_TICK_PRICE_CHANGE = 0.10;  // 从5%提升到10%，允许更灵活的价格调整

/** 均值回归速率 */
export const MEAN_REVERSION_RATE = 0.002;

/** 波动抑制系数 */
export const VOLATILITY_DAMPENING = 0.1;

/** 供需数据平滑系数（统一使用） */
export const SUPPLY_DEMAND_SMOOTHING = 0.5;  // 新数据占50%，历史占50%

/** 需求计算平滑系数（统一使用） */
export const DEMAND_SMOOTHING_FACTOR = 0.5;  // 新需求占50%，历史需求占50%

/** 价格相对于基准价的最大倍数（防止价格无限上涨） */
export const MAX_PRICE_RATIO = 5.0;  // 最高5倍基准价

/** 价格相对于基准价的最小倍数（防止价格过低） */
export const MIN_PRICE_RATIO = 0.2;  // 最低20%基准价

/** 无成交时的均值回归增强系数 */
export const NO_TRADE_REVERSION_MULTIPLIER = 5.0;

// ==================== 玩家初始常量 ====================

/** 玩家初始现金（增加以支持零售业务）*/
export const PLAYER_INITIAL_CASH = 5_000_000;

/** 玩家初始信用额度 */
export const PLAYER_CREDIT_LIMIT = 500_000;

/** 玩家贷款利率 */
export const PLAYER_CREDIT_RATE = 0.08;

/** 玩家初始声望 */
export const PLAYER_INITIAL_REPUTATION = 50;

// ==================== 市场结构常量 ====================

/** 反垄断HHI阈值 */
export const ANTITRUST_HHI_THRESHOLD = 2500;

/** 最大市场份额 */
export const MAX_MARKET_SHARE = 0.7;

/** 合并审查阈值 */
export const MERGER_REVIEW_THRESHOLD = 0.3;

// ==================== 经济周期常量 ====================

/** 经济周期长度（tick数，约5年） */
export const BUSINESS_CYCLE_LENGTH = TICKS_PER_YEAR * 5;

/** 经济周期振幅 */
export const BUSINESS_CYCLE_AMPLITUDE = 0.1;

// ==================== AI常量 ====================

/** AI决策间隔（tick） - 从24降低到6以提高AI交易频率 */
export const AI_DECISION_INTERVAL = 6;

/** 每tick处理的AI批次大小（提高到10以加快决策频率） */
export const AI_BATCH_SIZE = 10;

// ==================== POPs常量 ====================

/** POPs采样率 */
export const POPS_SAMPLING_RATE = 0.01;

/** POPs缩放因子 */
export const POPS_SCALE_FACTOR = 100;

// ==================== 零售系统常量 ====================

/** 最大零售店数量 */
export const MAX_RETAIL_STORES = 500;

/** 零售建筑类型起始ID */
export const RETAIL_BUILDING_START_ID = 49;

/** 零售建筑类型数量（包含新增的日化店、书店、酒类店、体育用品店、玩具店、乐器店） */
export const RETAIL_BUILDING_COUNT = 16;

/** 零售进货触发阈值（库存低于此比例时触发进货） */
export const RETAIL_RESTOCK_THRESHOLD = 0.3;

/** 零售目标库存水平 */
export const RETAIL_TARGET_STOCK_LEVEL = 0.9;

/** 每tick最大客流处理比例（提高以增加市场活跃度） */
export const RETAIL_MAX_CUSTOMER_RATE = 0.25;  // 从0.15提高到0.25，增加消费速度

/** 零售价格调整周期（tick） */
export const RETAIL_PRICE_ADJUST_INTERVAL = 24;

/** 最大库存周转天数（超过则降价） */
export const RETAIL_MAX_TURNOVER_DAYS = 30;

// ==================== 成交记录常量 ====================

/** 最大成交记录数（环形缓冲区大小，增大以保留更多历史记录） */
export const MAX_TRADES = 100000;

// ==================== 建造/拆除系统常量 ====================

/** 每个公司最大建造队列长度 */
export const MAX_CONSTRUCTION_QUEUE = 10;

/** 每个公司同时建造的建筑数量上限 */
export const MAX_CONCURRENT_CONSTRUCTIONS = 3;

/** 取消建造退款比例 */
export const CONSTRUCTION_CANCEL_REFUND_RATE = 0.8;

/** 每个公司最大拆除队列长度 */
export const MAX_DEMOLITION_QUEUE = 10;

/** 每个公司同时拆除的建筑数量上限 */
export const MAX_CONCURRENT_DEMOLITIONS = 2;

/** 建筑每升一级的折旧率 */
export const DEMOLITION_LEVEL_DEPRECIATION = 0.05;

/** 建筑每年的折旧率 */
export const DEMOLITION_YEAR_DEPRECIATION = 0.02;

/** 拆除材料回收率 */
export const DEMOLITION_MATERIAL_RECOVERY_RATE = 0.5;

/** 拆除现金回收率（相对于折旧后价值） */
export const DEMOLITION_CASH_RECOVERY_RATE = 0.3;

/** 危险建筑额外拆除成本比例 */
export const HAZARDOUS_DEMOLITION_COST_MULTIPLIER = 0.2;

/** 最大预留材料条目数 */
export const MAX_RESERVED_MATERIALS = 10000;

/** 最大回收材料条目数 */
export const MAX_RECOVERED_MATERIALS = 10000;

// ==================== 性能目标常量 ====================

/** 目标tick时间（毫秒） */
export const TARGET_TICK_TIME = 10;

/** 目标内存占用（字节） */
export const TARGET_MEMORY_USAGE = 100 * 1024 * 1024; // 100MB