/**
 * PopulationSystem — 人口系统
 *
 * 将 DemandCurve.ts 中的静态 CONSUMER_TIERS 动态化，
 * 建立 Pop ↔ Labor 双向数据通道：
 *   Pop人口 → 劳动力供给 → 就业/失业 → 工资 → 有效收入 → 消费需求
 *
 * 设计约束：
 * - 8 个消费者层级（POPS_GROUPS）与 CONSUMER_TIERS 一一对应
 * - 人口数字保持 14 亿量级（不缩放），通过 laborScaleFactor 映射到劳动力规模
 * - effectiveIncomes 平滑过渡，避免经济剧烈震荡
 * - 向后兼容：若 world.population 不存在，从 CONSUMER_TIERS 常量初始化
 */

import { POPS_GROUPS, LABOR_ROLE_COUNT, TICKS_PER_MONTH } from '@/core/constants';

// ==================== 类型定义 ====================

/** 单个层级的劳动参与配置 */
export interface TierLaborProfile {
  /** 劳动参与率（0-1） */
  participationRate: number;
  /** 各角色分布 [BASIC, TECHNICAL, MANAGEMENT]，总和 = 1 */
  roleDistribution: readonly [number, number, number];
}

/** 人口系统 SoA 数据结构（挂载在 GameWorld 上） */
export interface PopulationSystemData {
  tierCount: number;

  // ---- 人口结构 ----
  /** [tierCount] 各层级当前人口 */
  populations: Float64Array;
  /** [tierCount] 各层级基础月收入（初始来自 CONSUMER_TIERS，不变） */
  baseIncomes: Float32Array;
  /** [tierCount] 各层级有效月收入（受就业和工资反馈调节） */
  effectiveIncomes: Float32Array;

  // ---- 劳动参与 ----
  /** [tierCount] 劳动参与率 */
  laborParticipationRates: Float32Array;

  // ---- 储蓄与消费 ----
  /** [tierCount] 储蓄率 */
  savingsRates: Float32Array;
  /** [tierCount] 价格敏感度 */
  pricePreferences: Float32Array;
  /** [tierCount] 品质偏好 */
  qualityPreferences: Float32Array;

  // ---- 收入方差 ----
  /** [tierCount] 收入波动系数 */
  incomeVariances: Float32Array;

  // ---- 汇总缓存 ----
  totalPopulation: number;
}

// ==================== 默认劳动参与配置 ====================

/**
 * 每个消费者层级的劳动参与率和向 3 种劳动角色的分布比例。
 *
 * 设计依据：
 * - 低收入层：参与率高，几乎全部提供 BASIC 工人
 * - 中间层：参与率最高，逐步向 TECHNICAL 过渡
 * - 高收入层：参与率下降，以 MANAGEMENT 为主
 *
 * roleDistribution: [BASIC, TECHNICAL, MANAGEMENT]，总和 = 1.0
 */
export const TIER_LABOR_PROFILES: readonly TierLaborProfile[] = [
  // tier 0: 极低收入层
  { participationRate: 0.55, roleDistribution: [0.95, 0.04, 0.01] },
  // tier 1: 低收入层
  { participationRate: 0.60, roleDistribution: [0.88, 0.10, 0.02] },
  // tier 2: 中低收入层
  { participationRate: 0.65, roleDistribution: [0.75, 0.20, 0.05] },
  // tier 3: 普通工薪层
  { participationRate: 0.68, roleDistribution: [0.55, 0.35, 0.10] },
  // tier 4: 中等收入层
  { participationRate: 0.62, roleDistribution: [0.30, 0.50, 0.20] },
  // tier 5: 中高收入层
  { participationRate: 0.55, roleDistribution: [0.15, 0.50, 0.35] },
  // tier 6: 高收入层
  { participationRate: 0.45, roleDistribution: [0.05, 0.40, 0.55] },
  // tier 7: 富裕阶层
  { participationRate: 0.25, roleDistribution: [0.02, 0.28, 0.70] },
] as const;

/**
 * 各劳动角色的缩放因子。
 *
 * 14 亿人口经参与率和角色分布后的原始劳动力：
 *   BASIC ≈ 555,165,000  → 目标 120,000 → factor ≈ 0.000216
 *   TECHNICAL ≈ 202,070,000 → 目标 32,000 → factor ≈ 0.000158
 *   MANAGEMENT ≈ 84,765,000 → 目标 8,000 → factor ≈ 0.0000944
 *
 * 使用分角色缩放确保初始劳动力供给与原 DEFAULT_TOTAL_SUPPLY 精确对齐，
 * 避免引入回归偏差。后续人口变化按同比例缩放。
 */
export const DEFAULT_LABOR_ROLE_SCALE_FACTORS: readonly [number, number, number] = [
  120_000 / 555_165_000,  // BASIC:      ~0.000216
  32_000 / 202_070_000,   // TECHNICAL:  ~0.000158
  8_000 / 84_765_000,     // MANAGEMENT: ~0.0000944
] as const;

/**
 * 有效收入平滑系数。
 * 每次更新时 effectiveIncome = old * (1 - α) + target * α。
 * 0.1 → 约 10 个月到达 ~65% 目标值，足够平滑。
 */
const INCOME_SMOOTHING_ALPHA = 0.1;

/**
 * 非劳动收入占基础收入的比例（储蓄利息、转移支付、被动收入等）。
 * 高收入层该比例更高，此处取统一保守值，后续可按层级差异化。
 */
const NON_LABOR_INCOME_RATIO = 0.2;

// ==================== 工厂函数 ====================

/**
 * 从 CONSUMER_TIERS 常量创建初始 PopulationSystemData。
 * 仅在 GameWorld 首次创建或存档缺少 population 字段时调用。
 */
export function createPopulationSystem(
  tiers: ReadonlyArray<{
    population: number;
    baseIncome: number;
    incomeVariance: number;
    savingsRate: number;
    pricePreference: number;
    qualityPreference: number;
  }>,
): PopulationSystemData {
  const n = POPS_GROUPS;
  const populations = new Float64Array(n);
  const baseIncomes = new Float32Array(n);
  const effectiveIncomes = new Float32Array(n);
  const laborParticipationRates = new Float32Array(n);
  const savingsRates = new Float32Array(n);
  const pricePreferences = new Float32Array(n);
  const qualityPreferences = new Float32Array(n);
  const incomeVariances = new Float32Array(n);

  let totalPop = 0;

  for (let i = 0; i < n; i++) {
    const tier = tiers[i];
    if (!tier) continue;

    populations[i] = tier.population;
    baseIncomes[i] = tier.baseIncome;
    // 初始有效收入 = 基础收入（尚无工资反馈）
    effectiveIncomes[i] = tier.baseIncome;
    laborParticipationRates[i] = TIER_LABOR_PROFILES[i]?.participationRate ?? 0.5;
    savingsRates[i] = tier.savingsRate;
    pricePreferences[i] = tier.pricePreference;
    qualityPreferences[i] = tier.qualityPreference;
    incomeVariances[i] = tier.incomeVariance;
    totalPop += tier.population;
  }

  return {
    tierCount: n,
    populations,
    baseIncomes,
    effectiveIncomes,
    laborParticipationRates,
    savingsRates,
    pricePreferences,
    qualityPreferences,
    incomeVariances,
    totalPopulation: totalPop,
  };
}

// ==================== Pop → Labor 供给计算 ====================

/**
 * 从人口结构推算各劳动角色的总供给量。
 *
 * @param popData - world.population
 * @param roleScaleFactors - 各角色缩放因子，默认 DEFAULT_LABOR_ROLE_SCALE_FACTORS
 * @returns [BASIC, TECHNICAL, MANAGEMENT] 供给量
 */
export function calculateLaborSupplyFromPop(
  popData: PopulationSystemData,
  roleScaleFactors: readonly [number, number, number] = DEFAULT_LABOR_ROLE_SCALE_FACTORS,
): [number, number, number] {
  const supply: [number, number, number] = [0, 0, 0];

  for (let tier = 0; tier < popData.tierCount; tier++) {
    const pop = popData.populations[tier];
    const profile = TIER_LABOR_PROFILES[tier];
    if (!profile || pop <= 0) continue;

    const participation = popData.laborParticipationRates[tier];
    const laborForce = pop * participation;

    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      supply[role] += laborForce * profile.roleDistribution[role];
    }
  }

  return [
    Math.round(supply[0] * roleScaleFactors[0]),
    Math.round(supply[1] * roleScaleFactors[1]),
    Math.round(supply[2] * roleScaleFactors[2]),
  ];
}

// ==================== Labor → Pop 收入反馈 ====================

/**
 * 根据劳动力市场的实际就业与工资数据，更新各层级的有效收入。
 *
 * 调用时机：每月一次（与 payMonthlyPayroll 同步）。
 *
 * 计算逻辑：
 * 1. 读取每个角色的平均月工资 = marketWages[role] × TICKS_PER_MONTH
 * 2. 对每个层级，加权计算其劳动力在各角色的就业收入
 * 3. 叠加非劳动收入（基于 baseIncome 的固定比例）
 * 4. 用指数平滑更新 effectiveIncomes
 *
 * @param popData - world.population（直接修改）
 * @param laborTotalSupply - world.labor.totalSupply
 * @param laborEmployed - world.labor.employed
 * @param laborMarketWages - world.labor.marketWages
 */
export function updateTierEffectiveIncomes(
  popData: PopulationSystemData,
  laborTotalSupply: Float32Array,
  laborEmployed: Float32Array,
  laborMarketWages: Float32Array,
): void {
  // 各角色的月工资
  const monthlyWage: [number, number, number] = [0, 0, 0];
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    monthlyWage[role] = (laborMarketWages[role] || 0) * TICKS_PER_MONTH;
  }

  // 各角色的整体就业率
  const employmentRate: [number, number, number] = [0, 0, 0];
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const supply = laborTotalSupply[role] || 0;
    employmentRate[role] = supply > 0
      ? Math.min(1, (laborEmployed[role] || 0) / supply)
      : 0;
  }

  for (let tier = 0; tier < popData.tierCount; tier++) {
    const profile = TIER_LABOR_PROFILES[tier];
    if (!profile) continue;

    const participation = popData.laborParticipationRates[tier];

    // 计算该层级劳动力的加权平均就业月收入
    let weightedIncome = 0;
    let totalWeight = 0;

    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      const roleWeight = profile.roleDistribution[role];
      if (roleWeight <= 0) continue;

      const weight = participation * roleWeight;
      weightedIncome += weight * monthlyWage[role] * employmentRate[role];
      totalWeight += weight;
    }

    const employmentIncome = totalWeight > 0 ? weightedIncome / totalWeight : 0;

    // 非劳动收入 = 基础收入 × 固定比例
    const nonLaborIncome = popData.baseIncomes[tier] * NON_LABOR_INCOME_RATIO;

    // 目标有效收入
    const targetIncome = employmentIncome + nonLaborIncome;

    // 指数平滑
    const current = popData.effectiveIncomes[tier];
    const smoothed = current * (1 - INCOME_SMOOTHING_ALPHA) + targetIncome * INCOME_SMOOTHING_ALPHA;

    // 保底：不低于基础收入的 30%（最低生活保障）
    const floor = popData.baseIncomes[tier] * 0.3;
    popData.effectiveIncomes[tier] = Math.max(floor, smoothed);
  }
}

// ==================== 同步劳动力总供给 ====================

/**
 * 将 Pop 推算的劳动力供给写入 world.labor.totalSupply，
 * 并相应调整 unemployed（保持 employed 不变，差额进 unemployed）。
 *
 * 调用时机：每月一次（在 addMonthlyLaborGrowth 之前或替代它）。
 *
 * @param laborTotalSupply - world.labor.totalSupply（直接修改）
 * @param laborEmployed - world.labor.employed（只读）
 * @param laborUnemployed - world.labor.unemployed（直接修改）
 * @param newSupply - calculateLaborSupplyFromPop 的返回值
 */
export function syncLaborSupplyFromPop(
  laborTotalSupply: Float32Array,
  laborEmployed: Float32Array,
  laborUnemployed: Float32Array,
  newSupply: [number, number, number],
): void {
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const target = Math.max(0, newSupply[role]);
    laborTotalSupply[role] = target;
    // 保持 employed 不变，调整 unemployed = totalSupply - employed
    laborUnemployed[role] = Math.max(0, target - (laborEmployed[role] || 0));
  }
}

// ==================== 人口汇总缓存 ====================

/** 更新 totalPopulation 缓存 */
export function refreshTotalPopulation(popData: PopulationSystemData): void {
  let total = 0;
  for (let i = 0; i < popData.tierCount; i++) {
    total += popData.populations[i];
  }
  popData.totalPopulation = total;
}

// ==================== hydrate（向后兼容） ====================

/**
 * 确保 world.population 存在。
 * 若不存在（旧存档），从 CONSUMER_TIERS 常量初始化。
 *
 * @param tiers - CONSUMER_TIERS 常量引用
 * @returns 保证有效的 PopulationSystemData
 */
export function hydratePopulationSystem(
  existing: PopulationSystemData | undefined,
  tiers: ReadonlyArray<{
    population: number;
    baseIncome: number;
    incomeVariance: number;
    savingsRate: number;
    pricePreference: number;
    qualityPreference: number;
  }>,
): PopulationSystemData {
  if (existing && existing.populations && existing.populations.length === POPS_GROUPS) {
    return existing;
  }
  return createPopulationSystem(tiers);
}
