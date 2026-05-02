import { LABOR_ROLE_COUNT, MAX_BUILDINGS } from '@/core/constants';
import type { GameWorld, LaborSystemData } from '@/core/world/GameWorld';

export { LABOR_ROLE_COUNT };

export const LABOR_ROLE_BASIC = 0;
export const LABOR_ROLE_TECHNICAL = 1;
export const LABOR_ROLE_MANAGEMENT = 2;

export type LaborRole =
  | typeof LABOR_ROLE_BASIC
  | typeof LABOR_ROLE_TECHNICAL
  | typeof LABOR_ROLE_MANAGEMENT;

export interface WorkforceDemand {
  basic: number;
  technical: number;
  management: number;
}

export interface WorkforceCoverageResult {
  coverage: number;
  roleCoverage: WorkforceDemand;
  activeDemand: WorkforceDemand;
  bottleneckRole: LaborRole | null;
}

export type BuildingLaborRecipeProvider = (
  world: GameWorld,
  buildingId: number,
) => { workforceRequired: WorkforceDemand };

export type AICompanyPersonalityProvider = (
  world: GameWorld,
  companyId: number,
) => { type?: string } | null;

export const EMPTY_WORKFORCE_DEMAND: WorkforceDemand = {
  basic: 0,
  technical: 0,
  management: 0,
};

const ROLE_NAMES = ['普通工人', '技术工人', '管理人员'] as const;
const DEFAULT_TOTAL_SUPPLY = [120_000, 32_000, 8_000] as const;
const DEFAULT_MARKET_WAGES = [120, 260, 520] as const;
const DEFAULT_MONTHLY_GROWTH = [600, 120, 30] as const;
const MARKET_WAGE_PRESSURE_COEFFICIENT = 0.02;
const MARKET_WAGE_UNEMPLOYMENT_COEFFICIENT = 0.008;

export const WAGE_MULTIPLIER_MIN = 0.5;
export const WAGE_MULTIPLIER_MAX = 2.0;

const BASE_HIRE_RATES = [0.12, 0.07, 0.04] as const;
const BASE_QUIT_RATES = [0.025, 0.018, 0.012] as const;
const AI_WAGE_MULTIPLIER_FLOOR = 0.8;

let buildingLaborRecipeProvider: BuildingLaborRecipeProvider | null = null;
let aiCompanyPersonalityProvider: AICompanyPersonalityProvider | null = null;

// hydrateLaborState 标记，避免每 tick 重复遍历
let lastHydratedWorldTick = -1;

interface AIWageAdjustmentProfile {
  upStep: number;
  downStep: number;
  maxMultiplier: number;
}

// ====== 纯工具函数 ======

export function isValidLaborRole(role: number): role is LaborRole {
  return role === 0 || role === 1 || role === 2;
}

export function getRoleName(role: LaborRole): string {
  return ROLE_NAMES[role] ?? '';
}

export function getBuildingLaborIndex(buildingId: number, role: LaborRole): number {
  if (role < 0 || role >= LABOR_ROLE_COUNT || buildingId < 0) return -1;
  return buildingId * LABOR_ROLE_COUNT + role;
}

export function clampWageMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1.0;
  return value < WAGE_MULTIPLIER_MIN ? WAGE_MULTIPLIER_MIN : value > WAGE_MULTIPLIER_MAX ? WAGE_MULTIPLIER_MAX : value;
}

export function getWorkforceDemandValue(demand: WorkforceDemand, role: LaborRole): number {
  if (role === LABOR_ROLE_BASIC) return demand.basic;
  if (role === LABOR_ROLE_TECHNICAL) return demand.technical;
  return demand.management;
}

export function setWorkforceDemandValue(
  demand: WorkforceDemand,
  role: LaborRole,
  value: number,
): void {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
  if (role === LABOR_ROLE_BASIC) demand.basic = safeValue;
  else if (role === LABOR_ROLE_TECHNICAL) demand.technical = safeValue;
  else demand.management = safeValue;
}

export function addWorkforceDemand(a: WorkforceDemand, b: WorkforceDemand): WorkforceDemand {
  return {
    basic: Math.max(0, a.basic + b.basic),
    technical: Math.max(0, a.technical + b.technical),
    management: Math.max(0, a.management + b.management),
  };
}

export function cloneWorkforceDemand(demand: WorkforceDemand): WorkforceDemand {
  return {
    basic: Math.max(0, Number.isFinite(demand.basic) ? demand.basic : 0),
    technical: Math.max(0, Number.isFinite(demand.technical) ? demand.technical : 0),
    management: Math.max(0, Number.isFinite(demand.management) ? demand.management : 0),
  };
}

export function getTotalWorkforceDemand(demand: WorkforceDemand): number {
  return (
    Math.max(0, demand.basic || 0) +
    Math.max(0, demand.technical || 0) +
    Math.max(0, demand.management || 0)
  );
}

export function scaleWorkforceDemand(demand: WorkforceDemand, utilization: number): WorkforceDemand {
  const factor = Math.max(0, Number.isFinite(utilization) ? utilization : 0);
  if (factor <= 0) return { basic: 0, technical: 0, management: 0 };

  return {
    basic: Math.ceil(demand.basic * factor),
    technical: Math.ceil(demand.technical * factor),
    management: Math.ceil(demand.management * factor),
  };
}

// ====== Provider 注册 ======

export function setBuildingLaborRecipeProvider(provider: BuildingLaborRecipeProvider): void {
  buildingLaborRecipeProvider = provider;
}

export function setAICompanyPersonalityProvider(provider: AICompanyPersonalityProvider): void {
  aiCompanyPersonalityProvider = provider;
}

// ====== 内部辅助（轻量 inline，不调 hydrate） ======

function getHired(world: GameWorld, buildingId: number, role: number): number {
  const v = world.buildings.workforceHired[buildingId * LABOR_ROLE_COUNT + role];
  return v > 0 ? v : 0;
}

function getWageMul(world: GameWorld, buildingId: number, role: number): number {
  const v = world.buildings.wageMultipliers[buildingId * LABOR_ROLE_COUNT + role];
  if (!Number.isFinite(v) || v <= 0) return 1.0;
  return v < WAGE_MULTIPLIER_MIN ? WAGE_MULTIPLIER_MIN : v > WAGE_MULTIPLIER_MAX ? WAGE_MULTIPLIER_MAX : v;
}

function getDemandForRole(demand: WorkforceDemand, role: number): number {
  if (role === 0) return demand.basic;
  if (role === 1) return demand.technical;
  return demand.management;
}

function isActiveBuilding(world: GameWorld, buildingId: number): boolean {
  return buildingId < world.buildings.count && world.buildings.isActive[buildingId] === 1;
}

function getOwner(world: GameWorld, buildingId: number): number {
  const owner = world.buildings.owners[buildingId];
  return owner >= 0 && owner < world.companies.count ? owner : -1;
}

function getActiveDemand(world: GameWorld, buildingId: number): WorkforceDemand {
  const efficiency = world.buildings.efficiencies[buildingId] || 0;
  if (efficiency <= 0 || !buildingLaborRecipeProvider) return { basic: 0, technical: 0, management: 0 };

  const recipe = buildingLaborRecipeProvider(world, buildingId);
  return scaleWorkforceDemand(recipe.workforceRequired, efficiency);
}

function getAIProfile(_world: GameWorld, companyId: number): AIWageAdjustmentProfile {
  const personality = aiCompanyPersonalityProvider?.(_world, companyId) ?? null;
  switch (personality?.type) {
    case 'aggressive':
    case 'pioneer':
      return { upStep: 0.04, downStep: 0.008, maxMultiplier: 1.8 };
    case 'conservative':
    case 'cost_leader':
      return { upStep: 0.015, downStep: 0.02, maxMultiplier: 1.35 };
    default:
      return { upStep: 0.025, downStep: 0.012, maxMultiplier: 1.55 };
  }
}

function clampAIWage(value: number, maxMultiplier: number): number {
  const profileMax = Math.min(WAGE_MULTIPLIER_MAX, Math.max(AI_WAGE_MULTIPLIER_FLOOR, maxMultiplier));
  const v = value < AI_WAGE_MULTIPLIER_FLOOR ? AI_WAGE_MULTIPLIER_FLOOR : value > profileMax ? profileMax : value;
  return v;
}

// ====== hydrateLaborState：只在数组缺失时执行，不做全量遍历 ======

export function createDefaultLaborSystem(): LaborSystemData {
  const totalSupply = new Float32Array(LABOR_ROLE_COUNT);
  const employed = new Float32Array(LABOR_ROLE_COUNT);
  const unemployed = new Float32Array(LABOR_ROLE_COUNT);
  const marketWages = new Float32Array(LABOR_ROLE_COUNT);
  const monthlyGrowth = new Float32Array(LABOR_ROLE_COUNT);

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    totalSupply[role] = DEFAULT_TOTAL_SUPPLY[role];
    unemployed[role] = DEFAULT_TOTAL_SUPPLY[role];
    marketWages[role] = DEFAULT_MARKET_WAGES[role];
    monthlyGrowth[role] = DEFAULT_MONTHLY_GROWTH[role];
  }

  return {
    totalSupply,
    employed,
    unemployed,
    marketWages,
    monthlyGrowth,
    demandOpenings: new Float32Array(LABOR_ROLE_COUNT),
    lastPayrollTick: 0,
  };
}

function ensureLaborArray(current: Float32Array | undefined, defaults: readonly number[]): Float32Array {
  if (current && current.length === LABOR_ROLE_COUNT) return current;
  const next = new Float32Array(LABOR_ROLE_COUNT);
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    next[role] = current?.[role] ?? defaults[role] ?? 0;
  }
  return next;
}

/**
 * 确保 world.labor 和 buildings 劳动力数组存在。
 * 幂等：同一 tick 内多次调用不重复工作。
 */
export function hydrateLaborState(world: GameWorld): void {
  // 快速路径：同一 tick 不重复执行
  if (lastHydratedWorldTick === world.tick && world.labor && world.buildings.workforceHired) {
    return;
  }

  const mutableWorld = world as GameWorld & { labor?: LaborSystemData };
  const existing = mutableWorld.labor;

  // 只在 labor 不存在或数组损坏时重建
  if (!existing || !existing.totalSupply || existing.totalSupply.length !== LABOR_ROLE_COUNT) {
    mutableWorld.labor = {
      totalSupply: ensureLaborArray(existing?.totalSupply, DEFAULT_TOTAL_SUPPLY),
      employed: ensureLaborArray(existing?.employed, [0, 0, 0]),
      unemployed: ensureLaborArray(existing?.unemployed, DEFAULT_TOTAL_SUPPLY),
      marketWages: ensureLaborArray(existing?.marketWages, DEFAULT_MARKET_WAGES),
      monthlyGrowth: ensureLaborArray(existing?.monthlyGrowth, DEFAULT_MONTHLY_GROWTH),
      demandOpenings: ensureLaborArray(existing?.demandOpenings, [0, 0, 0]),
      lastPayrollTick: existing?.lastPayrollTick ?? 0,
    };
  }

  const laborSize = MAX_BUILDINGS * LABOR_ROLE_COUNT;
  const buildings = world.buildings as typeof world.buildings & {
    workforceHired?: Float32Array;
    wageMultipliers?: Float32Array;
    accruedPayroll?: Float64Array;
  };

  if (!buildings.workforceHired || buildings.workforceHired.length !== laborSize) {
    const next = new Float32Array(laborSize);
    if (buildings.workforceHired) {
      next.set(buildings.workforceHired.subarray(0, Math.min(buildings.workforceHired.length, laborSize)));
    }
    buildings.workforceHired = next;
  }

  if (!buildings.wageMultipliers || buildings.wageMultipliers.length !== laborSize) {
    const next = new Float32Array(laborSize);
    next.fill(1.0);
    if (buildings.wageMultipliers) {
      next.set(buildings.wageMultipliers.subarray(0, Math.min(buildings.wageMultipliers.length, laborSize)));
    }
    buildings.wageMultipliers = next;
  }

  if (!buildings.accruedPayroll || buildings.accruedPayroll.length !== MAX_BUILDINGS) {
    const next = new Float64Array(MAX_BUILDINGS);
    if (buildings.accruedPayroll) {
      next.set(buildings.accruedPayroll.subarray(0, Math.min(buildings.accruedPayroll.length, MAX_BUILDINGS)));
    }
    buildings.accruedPayroll = next;
  }

  // 注意：不再对全部 9000 个 wageMultiplier 做 clamp。clamp 在读取时按需执行。
  lastHydratedWorldTick = world.tick;
}

// ====== calculateWorkforceCoverage：被 ProductionEngine 在内循环调用，必须极轻 ======

export function calculateWorkforceCoverage(
  world: GameWorld,
  buildingId: number,
  fullDemand: WorkforceDemand,
  utilization: number,
): WorkforceCoverageResult {
  // 不在此调 hydrateLaborState——调用方（ProductionEngine）会在批量入口调一次
  const activeDemand = scaleWorkforceDemand(fullDemand, utilization);
  const roleCoverage: WorkforceDemand = { basic: 1, technical: 1, management: 1 };
  let coverage = 1;
  let bottleneckRole: LaborRole | null = null;
  let hasDemand = false;

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const demand = getDemandForRole(activeDemand, role);
    if (demand > 0) {
      hasDemand = true;
      const hired = getHired(world, buildingId, role);
      const currentCoverage = Math.min(1, hired / demand);
      setWorkforceDemandValue(roleCoverage, role as LaborRole, currentCoverage);
      if (currentCoverage < coverage) {
        coverage = currentCoverage;
        bottleneckRole = role as LaborRole;
      }
    }
  }

  return {
    coverage: hasDemand ? coverage : 1,
    roleCoverage,
    activeDemand,
    bottleneckRole,
  };
}

// ====== 单栋建筑 hire/attrition：内联逻辑，不调 hydrate ======

export function hireForBuildingRole(
  world: GameWorld,
  buildingId: number,
  role: LaborRole,
  target: number,
  wageMultiplier: number,
): number {
  if (role < 0 || role >= LABOR_ROLE_COUNT || buildingId < 0) return 0;
  const idx = buildingId * LABOR_ROLE_COUNT + role;
  const hired = world.buildings.workforceHired[idx] || 0;
  const gap = target - hired;
  if (gap <= 0) return 0;

  const rate = BASE_HIRE_RATES[role] * clampWageMultiplier(wageMultiplier);
  const desiredHire = Math.ceil(gap * rate);
  const available = world.labor.unemployed[role] || 0;
  const actualHire = Math.min(gap, available, desiredHire);
  if (actualHire <= 0) return 0;

  world.buildings.workforceHired[idx] += actualHire;
  world.labor.unemployed[role] = Math.max(0, world.labor.unemployed[role] - actualHire);
  world.labor.employed[role] += actualHire;
  return actualHire;
}

export function processRoleAttrition(
  world: GameWorld,
  buildingId: number,
  role: LaborRole,
  wageMultiplier: number,
): number {
  if (role < 0 || role >= LABOR_ROLE_COUNT || buildingId < 0) return 0;
  const multiplier = clampWageMultiplier(wageMultiplier);
  if (multiplier >= 1) return 0;

  const idx = buildingId * LABOR_ROLE_COUNT + role;
  const hired = world.buildings.workforceHired[idx] || 0;
  if (hired <= 0) return 0;

  const quitRate = BASE_QUIT_RATES[role] * (1 - multiplier);
  const quit = Math.min(hired, Math.max(1, Math.ceil(hired * quitRate)));
  if (quit <= 0) return 0;

  world.buildings.workforceHired[idx] = Math.max(0, world.buildings.workforceHired[idx] - quit);
  world.labor.employed[role] = Math.max(0, world.labor.employed[role] - quit);
  world.labor.unemployed[role] += quit;
  return quit;
}

// ====== 主入口：processBuildingLaborMarket —— 合并为单次遍历 ======

export function processBuildingLaborMarket(world: GameWorld): void {
  hydrateLaborState(world);

  const demandOpenings = world.labor.demandOpenings;
  demandOpenings[0] = 0;
  demandOpenings[1] = 0;
  demandOpenings[2] = 0;

  const buildingCount = world.buildings.count;

  // 单次遍历：计算 demand → attrition → hiring
  for (let buildingId = 0; buildingId < buildingCount; buildingId++) {
    if (!isActiveBuilding(world, buildingId)) continue;
    if (getOwner(world, buildingId) < 0) continue;

    const activeDemand = getActiveDemand(world, buildingId);

    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      const demand = getDemandForRole(activeDemand, role);
      if (demand <= 0) continue;

      const typedRole = role as LaborRole;
      const wm = getWageMul(world, buildingId, role);

      // 先处理 attrition
      processRoleAttrition(world, buildingId, typedRole, wm);

      // 计算 opening（attrition 后的）
      const hiredNow = getHired(world, buildingId, role);
      const opening = demand - hiredNow;
      if (opening > 0) {
        demandOpenings[role] += opening;
      }

      // hiring
      hireForBuildingRole(world, buildingId, typedRole, demand, wm);
    }
  }
}

// ====== adjustAIWageMultipliers：预计算 cashPressure，避免 O(N²) ======

export function adjustAIWageMultipliers(world: GameWorld): void {
  hydrateLaborState(world);

  const buildingCount = world.buildings.count;

  // 预计算每个 AI 公司的 target daily payroll（单次遍历）
  const companyPayroll = new Float64Array(world.companies.count);
  for (let buildingId = 0; buildingId < buildingCount; buildingId++) {
    if (!isActiveBuilding(world, buildingId)) continue;
    const owner = getOwner(world, buildingId);
    if (owner < 0) continue;
    const isAI = world.companies.isAI as unknown as ArrayLike<boolean | number>;
    if (!isAI[owner]) continue;

    const activeDemand = getActiveDemand(world, buildingId);
    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      const demand = getDemandForRole(activeDemand, role);
      if (demand <= 0) continue;
      const wage = world.labor.marketWages[role] || 0;
      companyPayroll[owner] += demand * wage * getWageMul(world, buildingId, role);
    }
  }

  // 单次遍历调整工资倍率
  for (let buildingId = 0; buildingId < buildingCount; buildingId++) {
    if (!isActiveBuilding(world, buildingId)) continue;
    const owner = getOwner(world, buildingId);
    if (owner < 0) continue;
    const isAI = world.companies.isAI as unknown as ArrayLike<boolean | number>;
    if (!isAI[owner]) continue;

    const activeDemand = getActiveDemand(world, buildingId);
    if (getDemandForRole(activeDemand, 0) + getDemandForRole(activeDemand, 1) + getDemandForRole(activeDemand, 2) <= 0) continue;

    const profile = getAIProfile(world, owner);
    const cash = world.companies.cash[owner] || 0;
    const cashPressured = cash < companyPayroll[owner] * 30;

    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      const demand = getDemandForRole(activeDemand, role);
      if (demand <= 0) continue;

      const idx = buildingId * LABOR_ROLE_COUNT + role;
      const current = clampAIWage(world.buildings.wageMultipliers[idx] || 1, profile.maxMultiplier);
      const hired = getHired(world, buildingId, role);

      let next = current;
      if (cashPressured || hired >= demand) {
        next = current - profile.downStep;
      } else {
        next = current + profile.upStep;
      }

      world.buildings.wageMultipliers[idx] = clampAIWage(next, profile.maxMultiplier);
    }
  }
}

// ====== updateMarketWages ======

export function updateMarketWages(world: GameWorld): void {
  hydrateLaborState(world);

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const totalSupply = Math.max(1, world.labor.totalSupply[role] || 0);
    const targetPressure = (world.labor.demandOpenings[role] || 0) / totalSupply;
    const unemploymentRate = (world.labor.unemployed[role] || 0) / totalSupply;
    const wageDelta =
      targetPressure * MARKET_WAGE_PRESSURE_COEFFICIENT -
      unemploymentRate * MARKET_WAGE_UNEMPLOYMENT_COEFFICIENT;
    const dailyChange = Math.max(-0.01, Math.min(0.01, wageDelta));
    const marketWage = world.labor.marketWages[role] || 0;
    world.labor.marketWages[role] = Math.max(1, marketWage * (1 + dailyChange));
  }
}

// ====== addMonthlyLaborGrowth ======

export function addMonthlyLaborGrowth(world: GameWorld): void {
  hydrateLaborState(world);

  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const growth = world.labor.monthlyGrowth[role] || 0;
    if (growth > 0) {
      world.labor.totalSupply[role] += growth;
      world.labor.unemployed[role] += growth;
    }
  }
}

// ====== getActualDailyWage：轻量 ======

export function getActualDailyWage(world: GameWorld, buildingId: number, role: LaborRole): number {
  if (role < 0 || role >= LABOR_ROLE_COUNT) return 0;
  const marketWage = world.labor.marketWages[role] || 0;
  const multiplier = getWageMul(world, buildingId, role);
  return marketWage * multiplier;
}

// ====== accrueDailyPayroll：单次遍历，内联工资计算 ======

export function accrueDailyPayrollForBuilding(world: GameWorld, buildingId: number): number {
  let total = 0;
  const base = buildingId * LABOR_ROLE_COUNT;
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    const hired = world.buildings.workforceHired[base + role] || 0;
    if (hired <= 0) continue;
    const marketWage = world.labor.marketWages[role] || 0;
    const mul = getWageMul(world, buildingId, role);
    total += hired * marketWage * mul;
  }
  if (total > 0) {
    world.buildings.accruedPayroll[buildingId] += total;
  }
  return total;
}

export function accrueDailyPayroll(world: GameWorld): number {
  hydrateLaborState(world);
  let total = 0;

  const buildingCount = world.buildings.count;
  for (let buildingId = 0; buildingId < buildingCount; buildingId++) {
    if (!world.buildings.isActive[buildingId]) continue;
    total += accrueDailyPayrollForBuilding(world, buildingId);
  }

  return total;
}

// ====== payMonthlyPayroll ======

export function payMonthlyPayroll(world: GameWorld): number[] {
  hydrateLaborState(world);
  const companyCount = world.companies.count;
  const paidByCompany = new Array(companyCount).fill(0);

  const buildingCount = world.buildings.count;
  for (let buildingId = 0; buildingId < buildingCount; buildingId++) {
    const accrued = world.buildings.accruedPayroll[buildingId] || 0;
    if (accrued <= 0) continue;

    const owner = world.buildings.owners[buildingId];
    if (owner >= 0 && owner < companyCount) {
      const availableCash = world.companies.cash[owner] || 0;
      const paid = Math.min(accrued, Math.max(0, availableCash));

      if (paid > 0) {
        world.companies.cash[owner] -= paid;
        paidByCompany[owner] += paid;
        world.households.cash[0] += paid;
        world.households.totalWagesReceived += paid;
      }

      world.buildings.accruedPayroll[buildingId] = accrued - paid;
    }
  }

  world.labor.lastPayrollTick = world.tick;
  return paidByCompany;
}

// ====== 向后兼容的别名（测试使用） ======

/** @deprecated 仅供单元测试使用，内部已改为 getHired */
function getBuildingRoleHired(world: GameWorld, buildingId: number, role: LaborRole): number {
  return getHired(world, buildingId, role);
}

// 保留导出供测试文件引用
export { getBuildingRoleHired };
