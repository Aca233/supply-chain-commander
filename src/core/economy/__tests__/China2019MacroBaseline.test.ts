import { describe, expect, it } from 'vitest';

import {
  BASE_INTEREST_RATE,
  INITIAL_GDP,
  INITIAL_MONEY_SUPPLY,
  TARGET_INFLATION,
} from '@/core/constants';
import { getBankingState, initializeBankingSystem } from '@/core/finance/BankingSystem';
import { createGameWorld } from '@/core/world/GameWorld';
import { initializeWorld } from '@/core/world/WorldInitializer';

import { initializeBusinessCycle } from '../BusinessCycle';

describe('china 2019 macro baseline regression guards', () => {
  it('keeps the business-cycle baseline aligned with China-2019 constants', () => {
    const world = createGameWorld();

    initializeBusinessCycle(world);

    expect(world.economyStats.gdp).toBe(INITIAL_GDP);
    expect(world.economyStats.inflation).toBe(TARGET_INFLATION);
    expect(world.economyStats.interestRate).toBe(BASE_INTEREST_RATE);
    expect(world.economyStats.cyclePhase).toBe('expansion');
  });

  it('keeps world warm-start logic while using China-2019 money conditions', () => {
    const world = initializeWorld();
    initializeBankingSystem(world);
    const bankingState = getBankingState();

    expect(world.economyStats.gdp).toBe(0);
    expect(world.economyStats.inflation).toBe(TARGET_INFLATION);
    expect(world.economyStats.interestRate).toBe(BASE_INTEREST_RATE);
    expect(bankingState.baseInterestRate).toBe(BASE_INTEREST_RATE);
    expect(bankingState.totalDeposits).toBe(INITIAL_MONEY_SUPPLY);
  });
});
