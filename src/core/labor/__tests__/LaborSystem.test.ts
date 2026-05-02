import { describe, expect, it } from 'vitest';

import { TICKS_PER_MONTH } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import {
  LABOR_ROLE_BASIC,
  LABOR_ROLE_COUNT,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  clampWageMultiplier,
  getBuildingLaborIndex,
  getTotalWorkforceDemand,
  getRoleName,
  hydrateLaborState,
  cloneWorkforceDemand,
  scaleWorkforceDemand,
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
