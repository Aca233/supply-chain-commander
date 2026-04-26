import { describe, expect, it } from 'vitest';

import { initializeWorld } from '@/core/world/WorldInitializer';
import {
  applyForLoan,
  getAvailableLoanOptions,
  getLoan,
  initializeBankingSystem,
} from '../BankingSystem';

describe('BankingSystem day-model terms', () => {
  it('keeps loan terms expressed in business-facing days', () => {
    const world = initializeWorld();
    initializeBankingSystem(world);

    const options = getAvailableLoanOptions(world, 0);
    const shortTerm = options.find(option => option.type === 'short_term');
    const mediumTerm = options.find(option => option.type === 'medium_term');

    expect(shortTerm?.termDays).toBe(90);
    expect(mediumTerm?.termDays).toBe(360);

    const application = applyForLoan(world, 0, 100_000, 'short_term');
    expect(application.approved).toBe(true);

    const loan = getLoan(application.loanId!);
    expect(loan?.termTicks).toBe(90);
    expect(loan?.nextPaymentTick).toBe(30);
  });
});
