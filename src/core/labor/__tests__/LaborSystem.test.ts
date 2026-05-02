import { describe, expect, it } from 'vitest';

import { TICKS_PER_MONTH } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import {
  accrueDailyPayroll,
  accrueDailyPayrollForBuilding,
  addMonthlyLaborGrowth,
  LABOR_ROLE_BASIC,
  LABOR_ROLE_COUNT,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  clampWageMultiplier,
  getActualDailyWage,
  getBuildingLaborIndex,
  getTotalWorkforceDemand,
  getRoleName,
  hireForBuildingRole,
  hydrateLaborState,
  cloneWorkforceDemand,
  payMonthlyPayroll,
  processRoleAttrition,
  scaleWorkforceDemand,
  updateMarketWages,
} from '../LaborSystem';

describe('LaborSystem', () => {
  it('creates world and building labor arrays with stable defaults', () => {
    const world = createGameWorld();

    expect(world.labor.totalSupply.length).toBe(LABOR_ROLE_COUNT);
    expect(world.labor.marketWages[LABOR_ROLE_BASIC]).toBe(120);
    expect(world.labor.marketWages[LABOR_ROLE_TECHNICAL]).toBe(260);
    expect(world.labor.marketWages[LABOR_ROLE_MANAGEMENT]).toBe(520);
    expect(world.labor.unemployed[LABOR_ROLE_BASIC]).toBe(world.labor.totalSupply[LABOR_ROLE_BASIC]);
    expect(world.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(1);
    expect(world.buildings.accruedPayroll[0]).toBe(0);
  });

  it('hydrates missing labor arrays for old world objects', () => {
    const world = createGameWorld();
    const legacy = world as unknown as {
      labor?: unknown;
      buildings: {
        workforceHired?: unknown;
        wageMultipliers?: unknown;
        accruedPayroll?: unknown;
      };
    };

    delete legacy.labor;
    delete legacy.buildings.workforceHired;
    delete legacy.buildings.wageMultipliers;
    delete legacy.buildings.accruedPayroll;

    hydrateLaborState(world);

    expect(world.labor.totalSupply[LABOR_ROLE_BASIC]).toBeGreaterThan(0);
    expect(world.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(1);
  });

  it('scales workforce demand and rounds management demand up when utilization is positive', () => {
    const demand = { basic: 100, technical: 20, management: 5 };

    expect(scaleWorkforceDemand(demand, 0.5)).toEqual({
      basic: 50,
      technical: 10,
      management: 3,
    });
    expect(scaleWorkforceDemand(demand, 0)).toEqual({
      basic: 0,
      technical: 0,
      management: 0,
    });
  });

  it('clones and totals workforce demand without sharing mutable state', () => {
    const demand = { basic: 100, technical: 20, management: 5 };
    const cloned = cloneWorkforceDemand(demand);

    cloned.basic = 1;

    expect(demand.basic).toBe(100);
    expect(getTotalWorkforceDemand(demand)).toBe(125);
    expect(getTotalWorkforceDemand({ basic: -1, technical: Number.NaN, management: 3 })).toBe(3);
  });

  it('clamps wage multipliers and exposes display names', () => {
    expect(clampWageMultiplier(0.1)).toBe(0.5);
    expect(clampWageMultiplier(1.25)).toBe(1.25);
    expect(clampWageMultiplier(4)).toBe(2);
    expect(getRoleName(LABOR_ROLE_BASIC)).toBe('普通工人');
    expect(getRoleName(LABOR_ROLE_TECHNICAL)).toBe('技术工人');
    expect(getRoleName(LABOR_ROLE_MANAGEMENT)).toBe('管理人员');
  });

  it('uses monthly time constant for payroll cadence expectations', () => {
    expect(TICKS_PER_MONTH).toBe(30);
  });
});

describe('labor hiring, attrition, market wages, and payroll', () => {
  it('hires only up to the building gap and unemployed pool', () => {
    const world = createGameWorld();
    world.buildings.count = 1;
    world.labor.unemployed[LABOR_ROLE_BASIC] = 3;

    const hired = hireForBuildingRole(world, 0, LABOR_ROLE_BASIC, 10, 1.0);

    expect(hired).toBe(2);
    expect(world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)]).toBe(2);
    expect(world.labor.unemployed[LABOR_ROLE_BASIC]).toBe(1);
    expect(world.labor.employed[LABOR_ROLE_BASIC]).toBe(2);
  });

  it('returns low-paid workers to unemployment through attrition', () => {
    const world = createGameWorld();
    const idx = getBuildingLaborIndex(0, LABOR_ROLE_BASIC);
    world.buildings.workforceHired[idx] = 100;
    world.labor.employed[LABOR_ROLE_BASIC] = 100;
    world.labor.unemployed[LABOR_ROLE_BASIC] = 0;

    const quit = processRoleAttrition(world, 0, LABOR_ROLE_BASIC, 0.5);

    expect(quit).toBeGreaterThan(0);
    expect(world.buildings.workforceHired[idx]).toBe(100 - quit);
    expect(world.labor.unemployed[LABOR_ROLE_BASIC]).toBe(quit);
  });

  it('attrits at least one low-paid worker from a small workforce', () => {
    const world = createGameWorld();
    const idx = getBuildingLaborIndex(0, LABOR_ROLE_BASIC);
    world.buildings.workforceHired[idx] = 2;
    world.labor.employed[LABOR_ROLE_BASIC] = 2;
    world.labor.unemployed[LABOR_ROLE_BASIC] = 0;

    const quit = processRoleAttrition(world, 0, LABOR_ROLE_BASIC, 0.5);

    expect(quit).toBe(1);
    expect(world.buildings.workforceHired[idx]).toBe(1);
    expect(world.labor.employed[LABOR_ROLE_BASIC]).toBe(1);
    expect(world.labor.unemployed[LABOR_ROLE_BASIC]).toBe(1);
  });

  it('does not attrit workers at or above market wage', () => {
    const world = createGameWorld();
    const idx = getBuildingLaborIndex(0, LABOR_ROLE_BASIC);
    world.buildings.workforceHired[idx] = 100;

    expect(processRoleAttrition(world, 0, LABOR_ROLE_BASIC, 1.0)).toBe(0);
    expect(processRoleAttrition(world, 0, LABOR_ROLE_BASIC, 1.3)).toBe(0);
  });

  it('updates market wages with a one percent daily cap', () => {
    const world = createGameWorld();
    world.labor.demandOpenings[LABOR_ROLE_TECHNICAL] = 20_000;
    world.labor.unemployed[LABOR_ROLE_TECHNICAL] = 0;
    const before = world.labor.marketWages[LABOR_ROLE_TECHNICAL];

    updateMarketWages(world);

    expect(world.labor.marketWages[LABOR_ROLE_TECHNICAL]).toBeCloseTo(before * 1.01);
  });

  it('caps market wage decreases at one percent and keeps wages above the lower bound', () => {
    const world = createGameWorld();
    world.labor.marketWages[LABOR_ROLE_BASIC] = 1;
    world.labor.demandOpenings[LABOR_ROLE_BASIC] = 0;
    world.labor.unemployed[LABOR_ROLE_BASIC] = world.labor.totalSupply[LABOR_ROLE_BASIC];

    updateMarketWages(world);

    expect(world.labor.marketWages[LABOR_ROLE_BASIC]).toBe(1);
  });

  it('adds monthly labor growth to supply and unemployment', () => {
    const world = createGameWorld();
    const beforeSupply = world.labor.totalSupply[LABOR_ROLE_MANAGEMENT];
    const beforeUnemployed = world.labor.unemployed[LABOR_ROLE_MANAGEMENT];

    addMonthlyLaborGrowth(world);

    expect(world.labor.totalSupply[LABOR_ROLE_MANAGEMENT]).toBe(beforeSupply + 30);
    expect(world.labor.unemployed[LABOR_ROLE_MANAGEMENT]).toBe(beforeUnemployed + 30);
  });

  it('uses clamped wage multipliers for actual daily wages', () => {
    const world = createGameWorld();
    world.buildings.wageMultipliers[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)] = 3;

    expect(getActualDailyWage(world, 0, LABOR_ROLE_BASIC)).toBe(120 * 2);
  });

  it('ignores invalid labor roles without mutating labor arrays', () => {
    const world = createGameWorld();
    const invalidRole = 99 as typeof LABOR_ROLE_BASIC;
    const hiredBefore = Array.from(world.buildings.workforceHired.slice(0, LABOR_ROLE_COUNT));
    const employedBefore = Array.from(world.labor.employed);
    const unemployedBefore = Array.from(world.labor.unemployed);

    expect(getBuildingLaborIndex(0, invalidRole)).toBe(-1);
    expect(hireForBuildingRole(world, 0, invalidRole, 10, 1)).toBe(0);
    expect(processRoleAttrition(world, 0, invalidRole, 0.5)).toBe(0);
    expect(getActualDailyWage(world, 0, invalidRole)).toBe(0);

    expect(Array.from(world.buildings.workforceHired.slice(0, LABOR_ROLE_COUNT))).toEqual(hiredBefore);
    expect(Array.from(world.labor.employed)).toEqual(employedBefore);
    expect(Array.from(world.labor.unemployed)).toEqual(unemployedBefore);
    expect(Number.isNaN(world.buildings.workforceHired[-1 as number])).toBe(false);
  });

  it('accrues daily payroll and pays monthly into households', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 100_000;
    world.buildings.count = 1;
    world.buildings.owners[0] = 0;
    world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)] = 10;

    const accrued = accrueDailyPayrollForBuilding(world, 0);
    expect(accrued).toBe(10 * 120);
    expect(world.buildings.accruedPayroll[0]).toBe(accrued);

    const paid = payMonthlyPayroll(world);
    expect(paid[0]).toBe(accrued);
    expect(world.companies.cash[0]).toBe(100_000 - accrued);
    expect(world.households.cash[0]).toBe(accrued);
    expect(world.households.totalWagesReceived).toBe(accrued);
    expect(world.buildings.accruedPayroll[0]).toBe(0);
  });

  it('caps monthly payroll to company cash and keeps unpaid wages accrued', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.companies.cash[0] = 500;
    world.buildings.count = 1;
    world.buildings.owners[0] = 0;
    world.buildings.accruedPayroll[0] = 1_200;

    const paid = payMonthlyPayroll(world);

    expect(paid[0]).toBe(500);
    expect(world.companies.cash[0]).toBe(0);
    expect(world.households.cash[0]).toBe(500);
    expect(world.households.totalWagesReceived).toBe(500);
    expect(world.buildings.accruedPayroll[0]).toBe(700);
  });

  it('preserves accrued payroll when the building owner is invalid', () => {
    const world = createGameWorld();
    world.companies.count = 1;
    world.buildings.count = 1;
    world.buildings.owners[0] = 9;
    world.buildings.accruedPayroll[0] = 1_200;

    const paid = payMonthlyPayroll(world);

    expect(paid[0]).toBe(0);
    expect(world.households.totalWagesReceived).toBe(0);
    expect(world.buildings.accruedPayroll[0]).toBe(1_200);
  });

  it('accrues daily payroll for active buildings only', () => {
    const world = createGameWorld();
    world.buildings.count = 2;
    world.buildings.isActive[0] = 1;
    world.buildings.isActive[1] = 0;
    world.buildings.workforceHired[getBuildingLaborIndex(0, LABOR_ROLE_BASIC)] = 1;
    world.buildings.workforceHired[getBuildingLaborIndex(1, LABOR_ROLE_BASIC)] = 1;

    expect(accrueDailyPayroll(world)).toBe(120);
    expect(world.buildings.accruedPayroll[0]).toBe(120);
    expect(world.buildings.accruedPayroll[1]).toBe(0);
  });
});
