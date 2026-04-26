import { beforeEach, describe, expect, it } from 'vitest';

import {
  BASE_INTEREST_RATE,
  INITIAL_GDP,
  INITIAL_MONEY_SUPPLY,
  INITIAL_POPULATION,
  PLAYER_CREDIT_RATE,
} from '@/core/constants';
import { getAvailableLoanOptions, initializeBankingSystem } from '@/core/finance/BankingSystem';
import { initializeWorld } from '@/core/world/WorldInitializer';

import { useBalanceStore } from '../BalanceConfig';

describe('china 2019 balance baseline regression guards', () => {
  beforeEach(() => {
    useBalanceStore.getState().resetToDefault();
  });

  it('keeps the China-2019 economy constants baseline', () => {
    expect(INITIAL_GDP).toBe(99_100_000_000_000);
    expect(INITIAL_POPULATION).toBe(1_400_000_000);
    expect(INITIAL_MONEY_SUPPLY).toBe(1_800_000_000_000);
    expect(BASE_INTEREST_RATE).toBe(0.043);
    expect(PLAYER_CREDIT_RATE).toBe(0.058);
  });

  it('keeps balance store defaults aligned with baseline constants', () => {
    const config = useBalanceStore.getState().getConfig();

    expect(config.economy.initialGDP).toBe(INITIAL_GDP);
    expect(config.economy.initialPopulation).toBe(INITIAL_POPULATION);
    expect(config.economy.baseInterestRate).toBe(BASE_INTEREST_RATE);
    expect(config.player.creditRate).toBe(PLAYER_CREDIT_RATE);
  });

  it('keeps first available loan option in expected baseline rate band', () => {
    const world = initializeWorld();
    initializeBankingSystem(world);

    const options = getAvailableLoanOptions(world, 0);

    expect(options.length).toBeGreaterThan(0);
    expect(options[0]!.interestRate).toBeGreaterThanOrEqual(0.045);
    expect(options[0]!.interestRate).toBeLessThan(0.08);
  });
});
