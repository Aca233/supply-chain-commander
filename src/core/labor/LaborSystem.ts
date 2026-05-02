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

export const EMPTY_WORKFORCE_DEMAND: WorkforceDemand = {
  basic: 0,
  technical: 0,
  management: 0,
};

const ROLE_NAMES = ['普通工人', '技术工人', '管理人员'] as const;
const DEFAULT_TOTAL_SUPPLY = [120_000, 32_000, 8_000] as const;
const DEFAULT_MARKET_WAGES = [120, 260, 520] as const;
const DEFAULT_MONTHLY_GROWTH = [600, 120, 30] as const;

export const WAGE_MULTIPLIER_MIN = 0.5;
export const WAGE_MULTIPLIER_MAX = 2.0;

export function getRoleName(role: LaborRole): string {
  return ROLE_NAMES[role];
}

export function getBuildingLaborIndex(buildingId: number, role: LaborRole): number {
  return buildingId * LABOR_ROLE_COUNT + role;
}

export function clampWageMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1.0;
  return Math.max(WAGE_MULTIPLIER_MIN, Math.min(WAGE_MULTIPLIER_MAX, value));
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
    Math.max(0, Number.isFinite(demand.basic) ? demand.basic : 0) +
    Math.max(0, Number.isFinite(demand.technical) ? demand.technical : 0) +
    Math.max(0, Number.isFinite(demand.management) ? demand.management : 0)
  );
}

export function scaleWorkforceDemand(demand: WorkforceDemand, utilization: number): WorkforceDemand {
  const factor = Math.max(0, Number.isFinite(utilization) ? utilization : 0);
  if (factor <= 0) return { ...EMPTY_WORKFORCE_DEMAND };

  return {
    basic: Math.ceil(demand.basic * factor),
    technical: Math.ceil(demand.technical * factor),
    management: Math.ceil(demand.management * factor),
  };
}

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
  const next = new Float32Array(LABOR_ROLE_COUNT);
  for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
    next[role] = current?.[role] ?? defaults[role] ?? 0;
  }
  return next;
}

export function hydrateLaborState(world: GameWorld): void {
  const mutableWorld = world as GameWorld & { labor?: LaborSystemData };
  const existing = mutableWorld.labor;
  mutableWorld.labor = {
    totalSupply: ensureLaborArray(existing?.totalSupply, DEFAULT_TOTAL_SUPPLY),
    employed: ensureLaborArray(existing?.employed, [0, 0, 0]),
    unemployed: ensureLaborArray(existing?.unemployed, DEFAULT_TOTAL_SUPPLY),
    marketWages: ensureLaborArray(existing?.marketWages, DEFAULT_MARKET_WAGES),
    monthlyGrowth: ensureLaborArray(existing?.monthlyGrowth, DEFAULT_MONTHLY_GROWTH),
    demandOpenings: ensureLaborArray(existing?.demandOpenings, [0, 0, 0]),
    lastPayrollTick: existing?.lastPayrollTick ?? 0,
  };

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

  for (let buildingId = 0; buildingId < world.buildings.maxCount; buildingId++) {
    for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
      const idx = getBuildingLaborIndex(buildingId, role as LaborRole);
      buildings.wageMultipliers[idx] = clampWageMultiplier(buildings.wageMultipliers[idx] || 1);
    }
  }
}
