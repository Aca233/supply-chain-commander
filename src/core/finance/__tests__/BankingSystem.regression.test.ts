import { describe, expect, it } from 'vitest';

import { initializeWorld } from '../../world/WorldInitializer';
import {
  applyForLoan,
  getCreditProfile,
  getCompanyLoans,
  initializeBankingSystem,
  makePayment,
  prepayLoan,
  updateBankingSystem,
} from '../BankingSystem';

describe('BankingSystem regressions', () => {
  it('does not increase principal when a custom payment is below interest', () => {
    const world = initializeWorld();
    initializeBankingSystem(world);
    world.companies.cash[0] = 10_000_000;

    const result = applyForLoan(world, 0, 1_000_000, 'short_term');
    expect(result.approved).toBe(true);

    const loan = getCompanyLoans(0)[0];
    const principalBefore = loan.remainingPrincipal;
    const monthlyInterest = loan.remainingPrincipal * (loan.interestRate / 12);

    const payment = makePayment(world, loan.id, monthlyInterest * 0.5);
    expect(payment.success).toBe(true);

    expect(loan.remainingPrincipal).toBeCloseTo(principalBefore, 6);
  });

  it('counts missed payments by overdue months instead of per tick', () => {
    const world = initializeWorld();
    initializeBankingSystem(world);
    world.companies.cash[0] = 1_000_000;

    const result = applyForLoan(world, 0, 200_000, 'short_term');
    expect(result.approved).toBe(true);

    const loan = getCompanyLoans(0)[0];
    world.companies.cash[0] = 0;

    world.tick = loan.nextPaymentTick + 31;
    updateBankingSystem(world);
    expect(loan.missedPayments).toBe(1);

    world.tick += 5;
    updateBankingSystem(world);
    expect(loan.missedPayments).toBe(1);

    world.tick = loan.nextPaymentTick + 61;
    updateBankingSystem(world);
    expect(loan.missedPayments).toBe(2);
  });

  it('keeps company liabilities aligned with the outstanding loan balance through amortization and prepayment', () => {
    const world = initializeWorld();
    initializeBankingSystem(world);
    world.companies.cash[0] = 20_000_000;

    const result = applyForLoan(world, 0, 600_000, 'medium_term');
    expect(result.approved).toBe(true);

    const loan = getCompanyLoans(0)[0];
    const profile = getCreditProfile(0);

    expect(loan).toBeDefined();
    expect(profile).not.toBeNull();
    expect(world.companies.totalLiabilities[0]).toBeCloseTo(loan.remainingPrincipal, 6);
    expect(profile?.totalDebt).toBeCloseTo(loan.remainingPrincipal, 6);

    const payment = makePayment(world, loan.id);
    expect(payment.success).toBe(true);
    expect(world.companies.totalLiabilities[0]).toBeCloseTo(loan.remainingPrincipal, 6);
    expect(getCreditProfile(0)?.totalDebt).toBeCloseTo(loan.remainingPrincipal, 6);

    const prepayment = prepayLoan(world, loan.id);
    expect(prepayment.success).toBe(true);
    expect(world.companies.totalLiabilities[0]).toBe(0);
    expect(getCreditProfile(0)?.totalDebt).toBe(0);
  });
});
