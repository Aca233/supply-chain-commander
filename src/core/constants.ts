/**
 * 游戏核心常量定义
 * 这些常量用于SoA数据结构的大小分配和游戏规则配置
 * 精简版本：80种商品、50种建筑、60种配方
 */

// ==================== 数据规模常量 ====================

/** 商品种类数（当前运行时统一使用实际 80 种商品） */
export const GOODS_COUNT = 80;

/** 实际商品数量（与 goods.ts 中 ALL_GOODS 数量保持一致） */
export const ACTUAL_GOODS_COUNT = GOODS_COUNT;

/** 最大建筑数量（增加以支持更多产业链） */
export const MAX_BUILDINGS = 3000;

/** 劳动力岗位数量：普通工人、技术工人、管理人员 */
export const LABOR_ROLE_COUNT = 3;

/** 最大公司数量（包括玩家和AI） */
export const MAX_COMPANIES = 200;

/** 最大订单数量（大幅增加到50万以支持大规模交易，约占25MB内存） */
export const MAX_ORDERS = 500000;

/** 每个建筑最大输入槽位 */
export const MAX_INPUTS = 8;

/** 每个建筑最大输出槽位 */
export const MAX_OUTPUTS = 4;

/** 每个建筑最大生产方式槽位 */
export const MAX_SLOTS = 5;

/** 价格历史记录长度 */
export const HISTORY_SIZE = 365;

/** 人口分层数量（8个收入层级） */
export const POPS_GROUPS = 8;

/** 消费品种类数（实际约45种，根据goods.ts中isConsumerGood统计） */
export const CONSUMER_GOODS_COUNT = 45;

/** 建筑类型数量（50种建筑，含 10 种零售业态） */
export const BUILDING_TYPES_COUNT = 50;

/** 配方数量（60个配方，精简版产业链） */
export const RECIPE_COUNT = 60;

// ==================== 时间常量 ====================

/** 旧版本中每天的小时数，用于存档/配置兼容转换 */
export const LEGACY_HOURS_PER_DAY = 24;

/** 每天tick数（1 tick = 1天） */
export const TICKS_PER_DAY = 1;

/** 每月tick数 */
export const TICKS_PER_MONTH = 30;

/** 每年tick数（360天/年） */
export const TICKS_PER_YEAR = TICKS_PER_MONTH * 12;

export function legacyHourTicksToDayTicks(
  value: number,
  rounding: 'none' | 'floor' | 'ceil' = 'none',
): number {
  const scaled = value / LEGACY_HOURS_PER_DAY;

  if (rounding === 'floor') {
    return Math.floor(scaled);
  }

  if (rounding === 'ceil') {
    return Math.max(1, Math.ceil(scaled));
  }

  return scaled;
}

/** 默认tick间隔（毫秒）- 1000ms=1s，1 tick=1天，1年=360秒=6分钟 */
export const DEFAULT_TICK_INTERVAL = 1000;

// ==================== 经济常量 ====================

/** 初始GDP（游戏币） */
export const INITIAL_GDP = 99_100_000_000_000;

/** 初始人口 */
export const INITIAL_POPULATION = 1_400_000_000;

/** 初始货币供应量 */
export const INITIAL_MONEY_SUPPLY = 1_800_000_000_000;

/** 目标通胀率 */
export const TARGET_INFLATION = 0.028;

/** 基准利率 */
export const BASE_INTEREST_RATE = 0.043;

// ==================== 价格稳定常量 ====================
// 平衡性调优 v2.0: 进一步收紧价格边界，限制无成交商品价格变动

/** 单tick最大价格变化 - v2价格体系下收紧至2%，防止高基准价下绝对波动过大 */
export const MAX_TICK_PRICE_CHANGE = 0.02;  // 2%单tick上限（v2价格体系：¥800基准价下±¥16 vs 旧¥50下±¥2.5）

/** 均值回归速率 - v2增强以加速价格恢复稳定 */
export const MEAN_REVERSION_RATE = 0.008;  // 0.8%/tick均值回归（v2增强：基准价提升后需更强回归力）

/** 波动抑制系数 */
export const VOLATILITY_DAMPENING = 0.10;

/** 供需数据平滑系数 - v2增强以获得更稳定的供需数据 */
export const SUPPLY_DEMAND_SMOOTHING = 0.15;  // 每tick衰减15%，半衰期~4.5tick

/** 需求计算平滑系数 - v2增强：更多权重给历史需求 */
export const DEMAND_SMOOTHING_FACTOR = 0.2;  // 新需求占20%，历史需求占80%（更平滑）

/** 价格相对于基准价的最大倍数 - 适度放宽以激励短缺商品生产 */
export const MAX_PRICE_RATIO = 3.0;  // 从2.5倍提高到3倍，允许高利润激励生产

/** 价格相对于基准价的最小倍数 - 保持50%保护生产者 */
export const MIN_PRICE_RATIO = 0.5;  // 50%地板，防止价格崩盘

/** 无成交时的均值回归增强系数 - 大幅降低以减少冷门商品价格跳跃 */
export const NO_TRADE_REVERSION_MULTIPLIER = 1.5;  // 从3倍降低到1.5倍

/** 无成交商品每月最大价格变动幅度 */
export const NO_TRADE_MAX_MONTHLY_CHANGE = 0.05;  // 无成交商品每月最多变动5%

/** 供需比上限 - 防止需求计算溢出 */
export const MAX_SUPPLY_DEMAND_RATIO = 100;  // 最大供需比限制在100:1

// ==================== 玩家初始常量 ====================

/** 玩家初始现金（增加以支持零售业务）*/
export const PLAYER_INITIAL_CASH = 18_000_000;

/** 玩家初始信用额度 */
export const PLAYER_CREDIT_LIMIT = 22_000_000;

/** 玩家贷款利率 */
export const PLAYER_CREDIT_RATE = 0.058;

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

// ==================== AI订单存活期常量 ====================
// 注：原值过短（1-2 tick）导致挂单频繁过期被清，撮合机会窗口太短，
// 表现为"零售店买不到、AI 卖不出"。统一拉长到符合现实的"挂几天"语义。

/** 普通AI买单过期时间（tick） */
export const AI_BUY_ORDER_EXPIRY = TICKS_PER_DAY * 5;

/** 普通AI卖单过期时间（tick） */
export const AI_SELL_ORDER_EXPIRY = TICKS_PER_DAY * 5;

/** 紧急订单过期时间（tick） */
export const URGENT_ORDER_EXPIRY = TICKS_PER_DAY * 2;

/** 建造材料买单过期时间（tick） */
export const BUILDING_MATERIAL_ORDER_EXPIRY = TICKS_PER_DAY * 10;

/** 零售补货买单过期时间（tick）— 零售店缺货时挂的买单需要更长窗口等卖方进场 */
export const RETAIL_BUY_ORDER_EXPIRY = TICKS_PER_DAY * 10;

/** 低周转商品（奢侈品/汽车/高端家电）卖单过期时间（tick）— 长期持仓不应被频繁清理 */
export const LOW_TURNOVER_SELL_ORDER_EXPIRY = TICKS_PER_DAY * 15;

/** 订单池健康警告阈值（使用率超过此比例时警告） */
export const ORDER_POOL_WARNING_THRESHOLD = 0.7;

/** 订单池危险阈值（使用率超过此比例时强制清理） */
export const ORDER_POOL_CRITICAL_THRESHOLD = 0.85;

// ==================== POPs常量 ====================

/** POPs采样率 */
export const POPS_SAMPLING_RATE = 0.01;

/** POPs缩放因子 */
export const POPS_SCALE_FACTOR = 100;

// ==================== 零售系统常量 ====================

/** 最大零售店数量 */
export const MAX_RETAIL_STORES = 500;

/** 零售建筑类型起始ID（当前零售目录从便利店开始） */
export const RETAIL_BUILDING_START_ID = 40;

/** 零售建筑类型数量（10 种业态：便利店/超市/电器/4S 店/服装/家具/药房/奢侈品/能源服务/百货） */
export const RETAIL_BUILDING_COUNT = 10;

/** 零售进货触发阈值（库存低于此比例时触发进货） */
export const RETAIL_RESTOCK_THRESHOLD = 0.3;

/** 零售目标库存水平 */
export const RETAIL_TARGET_STOCK_LEVEL = 0.9;

/** 每tick最大客流处理比例
 * Why: day-model 迁移后 1 tick = 1 天，0.15 意味着每天只消费 15% 的需求池，注入端工资按
 *      日全额发放、消费端按 15% 回流，2 年内累积导致家庭池吸光所有现金、AI 公司链式破产。
 * How: 提高到 0.85，让单日能消费 ~85% 的当日需求，留 ~15% 滚到次日；与 hourly 模型下
 *      0.15×24≈99% 的实际等效日消费速率近似。
 */
export const RETAIL_MAX_CUSTOMER_RATE = 0.85;

/** 零售价格调整周期（tick） */
export const RETAIL_PRICE_ADJUST_INTERVAL = TICKS_PER_DAY;

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
