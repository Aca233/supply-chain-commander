import { describe, expect, it } from 'vitest';

import { ContractRole, SupplyContractManager } from '@/core/economy/SupplyContracts';

describe('SupplyContractManager.calculateContractValue', () => {
  it('falls back to agreedPrice when delivered quantity is zero', () => {
    const manager = new SupplyContractManager();
    const proposal = manager.createProposal(
      0,
      1,
      ContractRole.SUPPLIER,
      0,
      100,
      7,
      4,
      80,
      10,
    );
    const contract = manager.acceptProposal(proposal.id, 10)!;

    contract.currentPeriod = 1;
    contract.totalDelivered = 0;
    contract.totalValue = 5_000;

    const value = manager.calculateContractValue(contract);

    expect(Number.isFinite(value.averagePrice)).toBe(true);
    expect(value.averagePrice).toBe(contract.agreedPrice);
  });
});
