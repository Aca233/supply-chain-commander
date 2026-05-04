import { describe, expect, it } from 'vitest';

import { LABOR_ROLE_COUNT, POPS_GROUPS } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import {
  calculateLaborSupplyFromPop,
  createPopulationSystem,
  DEFAULT_LABOR_ROLE_SCALE_FACTORS,
  hydratePopulationSystem,
  refreshTotalPopulation,
  syncLaborSupplyFromPop,
  TIER_LABOR_PROFILES,
  updateTierEffectiveIncomes,
} from '../PopulationSystem';

// 与 DemandCurve CONSUMER_TIERS 一致的默认层级数据
const DEFAULT_TIERS = [
  { population: 260_000_000, baseIncome: 1500,  incomeVariance: 0.12, savingsRate: 0.01, pricePreference: 0.97, qualityPreference: 0.03 },
  { population: 280_000_000, baseIncome: 2500,  incomeVariance: 0.15, savingsRate: 0.03, pricePreference: 0.93, qualityPreference: 0.07 },
  { population: 290_000_000, baseIncome: 4000,  incomeVariance: 0.18, savingsRate: 0.06, pricePreference: 0.85, qualityPreference: 0.15 },
  { population: 250_000_000, baseIncome: 6500,  incomeVariance: 0.22, savingsRate: 0.10, pricePreference: 0.72, qualityPreference: 0.28 },
  { population: 150_000_000, baseIncome: 10000, incomeVariance: 0.26, savingsRate: 0.16, pricePreference: 0.58, qualityPreference: 0.42 },
  { population: 90_000_000,  baseIncome: 16000, incomeVariance: 0.30, savingsRate: 0.22, pricePreference: 0.42, qualityPreference: 0.58 },
  { population: 50_000_000,  baseIncome: 30000, incomeVariance: 0.36, savingsRate: 0.30, pricePreference: 0.25, qualityPreference: 0.75 },
  { population: 30_000_000,  baseIncome: 80000, incomeVariance: 0.45, savingsRate: 0.42, pricePreference: 0.08, qualityPreference: 0.92 },
] as const;

describe('PopulationSystem', () => {
  describe('createPopulationSystem', () => {
    it('initializes with 8 tiers and correct total population', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);

      expect(pop.tierCount).toBe(POPS_GROUPS);
      expect(pop.totalPopulation).toBe(1_400_000_000);
      expect(pop.populations.length).toBe(POPS_GROUPS);
      expect(pop.baseIncomes.length).toBe(POPS_GROUPS);
      expect(pop.effectiveIncomes.length).toBe(POPS_GROUPS);
    });

    it('sets effectiveIncomes equal to baseIncomes at initialization', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);

      for (let i = 0; i < POPS_GROUPS; i++) {
        expect(pop.effectiveIncomes[i]).toBe(pop.baseIncomes[i]);
      }
    });

    it('copies population values from tier data', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);

      expect(pop.populations[0]).toBe(260_000_000);
      expect(pop.populations[7]).toBe(30_000_000);
    });

    it('sets labor participation rates from TIER_LABOR_PROFILES', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);

      for (let i = 0; i < POPS_GROUPS; i++) {
        // Float32Array 有精度限制，用 toBeCloseTo 而非 toBe
        expect(pop.laborParticipationRates[i]).toBeCloseTo(TIER_LABOR_PROFILES[i].participationRate, 5);
      }
    });
  });

  describe('calculateLaborSupplyFromPop', () => {
    it('produces labor supply matching original DEFAULT_TOTAL_SUPPLY', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);
      const supply = calculateLaborSupplyFromPop(pop);

      // 必须与 LaborSystem 的 DEFAULT_TOTAL_SUPPLY 精确对齐
      expect(supply[0]).toBe(120_000); // BASIC
      expect(supply[1]).toBe(32_000);  // TECHNICAL
      expect(supply[2]).toBe(8_000);   // MANAGEMENT
    });

    it('scales proportionally when population changes', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);
      const baseSupply = calculateLaborSupplyFromPop(pop);

      // 所有层级人口翻倍
      for (let i = 0; i < POPS_GROUPS; i++) {
        pop.populations[i] *= 2;
      }

      const doubledSupply = calculateLaborSupplyFromPop(pop);

      // 各角色供给应接近翻倍（可能因四舍五入有 ±1 偏差）
      for (let role = 0; role < LABOR_ROLE_COUNT; role++) {
        expect(doubledSupply[role]).toBeCloseTo(baseSupply[role] * 2, -1);
      }
    });

    it('returns zeros when all populations are zero', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);
      for (let i = 0; i < POPS_GROUPS; i++) {
        pop.populations[i] = 0;
      }

      const supply = calculateLaborSupplyFromPop(pop);
      expect(supply).toEqual([0, 0, 0]);
    });
  });

  describe('syncLaborSupplyFromPop', () => {
    it('sets totalSupply and adjusts unemployed while keeping employed unchanged', () => {
      const totalSupply = new Float32Array(LABOR_ROLE_COUNT);
      const employed = new Float32Array(LABOR_ROLE_COUNT);
      const unemployed = new Float32Array(LABOR_ROLE_COUNT);

      employed[0] = 50_000;
      employed[1] = 10_000;
      employed[2] = 3_000;

      syncLaborSupplyFromPop(totalSupply, employed, unemployed, [120_000, 32_000, 8_000]);

      expect(totalSupply[0]).toBe(120_000);
      expect(totalSupply[1]).toBe(32_000);
      expect(totalSupply[2]).toBe(8_000);

      expect(unemployed[0]).toBe(70_000);
      expect(unemployed[1]).toBe(22_000);
      expect(unemployed[2]).toBe(5_000);

      // employed 不变
      expect(employed[0]).toBe(50_000);
      expect(employed[1]).toBe(10_000);
      expect(employed[2]).toBe(3_000);
    });

    it('clamps unemployed to zero when employed exceeds supply', () => {
      const totalSupply = new Float32Array(LABOR_ROLE_COUNT);
      const employed = new Float32Array(LABOR_ROLE_COUNT);
      const unemployed = new Float32Array(LABOR_ROLE_COUNT);

      employed[0] = 200_000; // 超过 supply

      syncLaborSupplyFromPop(totalSupply, employed, unemployed, [120_000, 32_000, 8_000]);

      expect(unemployed[0]).toBe(0); // 不会为负
    });
  });

  describe('updateTierEffectiveIncomes', () => {
    it('smoothly adjusts effective incomes toward employment-derived target', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);

      // 模拟劳动力市场状态
      const totalSupply = new Float32Array([120_000, 32_000, 8_000]);
      const employed = new Float32Array([108_000, 28_800, 7_200]); // 90% 就业率
      const marketWages = new Float32Array([120, 260, 520]);

      const incomeBefore = pop.effectiveIncomes[0];

      updateTierEffectiveIncomes(pop, totalSupply, employed, marketWages);

      // 有效收入应该发生变化（不再等于 baseIncome）
      expect(pop.effectiveIncomes[0]).not.toBe(incomeBefore);
      // 不应该低于保底（baseIncome × 0.3）
      expect(pop.effectiveIncomes[0]).toBeGreaterThanOrEqual(pop.baseIncomes[0] * 0.3);
    });

    it('respects minimum income floor at 30% of baseIncome', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);

      // 模拟零就业
      const totalSupply = new Float32Array([120_000, 32_000, 8_000]);
      const employed = new Float32Array([0, 0, 0]);
      const marketWages = new Float32Array([120, 260, 520]);

      // 多次迭代，让收入向下收敛
      for (let i = 0; i < 100; i++) {
        updateTierEffectiveIncomes(pop, totalSupply, employed, marketWages);
      }

      // 即使零就业，也不低于 baseIncome × 0.3
      for (let tier = 0; tier < POPS_GROUPS; tier++) {
        const floor = pop.baseIncomes[tier] * 0.3;
        expect(pop.effectiveIncomes[tier]).toBeGreaterThanOrEqual(floor - 0.01);
      }
    });

    it('increases effective income when employment and wages are high', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);

      // 高就业率、高工资
      const totalSupply = new Float32Array([120_000, 32_000, 8_000]);
      const employed = new Float32Array([120_000, 32_000, 8_000]); // 100% 就业
      const marketWages = new Float32Array([240, 520, 1040]); // 工资翻倍

      const incomeBefore = pop.effectiveIncomes[3]; // 普通工薪层

      for (let i = 0; i < 20; i++) {
        updateTierEffectiveIncomes(pop, totalSupply, employed, marketWages);
      }

      // 高就业 + 高工资 → 有效收入应上升
      expect(pop.effectiveIncomes[3]).toBeGreaterThan(incomeBefore);
    });
  });

  describe('hydratePopulationSystem', () => {
    it('returns existing data when valid', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);
      const result = hydratePopulationSystem(pop, DEFAULT_TIERS);

      expect(result).toBe(pop); // 同一引用
    });

    it('creates new data when existing is undefined', () => {
      const result = hydratePopulationSystem(undefined, DEFAULT_TIERS);

      expect(result.tierCount).toBe(POPS_GROUPS);
      expect(result.totalPopulation).toBe(1_400_000_000);
    });
  });

  describe('refreshTotalPopulation', () => {
    it('recalculates totalPopulation from tier populations', () => {
      const pop = createPopulationSystem(DEFAULT_TIERS);
      pop.populations[0] = 300_000_000; // 增加 4000 万

      refreshTotalPopulation(pop);

      expect(pop.totalPopulation).toBe(1_440_000_000);
    });
  });

  describe('TIER_LABOR_PROFILES', () => {
    it('has exactly POPS_GROUPS profiles', () => {
      expect(TIER_LABOR_PROFILES.length).toBe(POPS_GROUPS);
    });

    it('role distributions sum to 1.0 for each tier', () => {
      for (let i = 0; i < POPS_GROUPS; i++) {
        const [basic, tech, mgmt] = TIER_LABOR_PROFILES[i].roleDistribution;
        expect(basic + tech + mgmt).toBeCloseTo(1.0);
      }
    });

    it('participation rates are between 0 and 1', () => {
      for (const profile of TIER_LABOR_PROFILES) {
        expect(profile.participationRate).toBeGreaterThan(0);
        expect(profile.participationRate).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('GameWorld integration', () => {
    it('createGameWorld includes a population system with correct initial values', () => {
      const world = createGameWorld();

      expect(world.population).toBeDefined();
      expect(world.population.tierCount).toBe(POPS_GROUPS);
      expect(world.population.totalPopulation).toBe(1_400_000_000);
      expect(world.population.populations[0]).toBe(260_000_000);

      // 劳动力供给从 Pop 推算应匹配原始默认值
      const supply = calculateLaborSupplyFromPop(world.population);
      expect(supply[0]).toBe(120_000);
      expect(supply[1]).toBe(32_000);
      expect(supply[2]).toBe(8_000);
    });
  });
});
