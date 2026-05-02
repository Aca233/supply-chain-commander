import { describe, expect, it } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import {
  ContractRole,
  ContractStatus,
  SupplyContractManager,
} from '@/core/economy/SupplyContracts';
import { createGameWorld } from '@/core/world/GameWorld';

function inventoryIndex(companyId: number, goodsId: number): number {
  return companyId * GOODS_COUNT + goodsId;
}

describe('SupplyContractManager settlement', () => {
  it('transfers inventory and cash when a scheduled contract delivery clears', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.cash[0] = 10_000;
    world.companies.cash[1] = 20_000;

    const manager = new SupplyContractManager();
    const proposal = manager.createProposal(0, 1, ContractRole.SUPPLIER, 0, 100, 7, 1, 50, 0);
    const contract = manager.acceptProposal(proposal.id, 0)!;
    const [delivery] = manager.getContractDeliveries(contract.id);

    world.companies.inventories[inventoryIndex(0, 0)] = 150;

    const executions = manager.processContracts(world, delivery.scheduledTick);

    expect(executions).toHaveLength(1);
    expect(executions[0]).toMatchObject({
      contractId: contract.id,
      quantity: 100,
      value: 5_000,
      penalty: 0,
      success: true,
    });
    expect(world.companies.inventories[inventoryIndex(0, 0)]).toBe(50);
    expect(world.companies.inventories[inventoryIndex(1, 0)]).toBe(100);
    expect(world.companies.cash[0]).toBe(15_000);
    expect(world.companies.cash[1]).toBe(15_000);
    expect(contract.status).toBe(ContractStatus.COMPLETED);
  });

  it('settles partial deliveries and charges the supplier for contractual shortfalls', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.cash[0] = 10_000;
    world.companies.cash[1] = 20_000;

    const manager = new SupplyContractManager();
    const proposal = manager.createProposal(0, 1, ContractRole.SUPPLIER, 0, 100, 7, 1, 50, 0);
    const contract = manager.acceptProposal(proposal.id, 0)!;
    const [delivery] = manager.getContractDeliveries(contract.id);

    world.companies.inventories[inventoryIndex(0, 0)] = 60;

    const executions = manager.processContracts(world, delivery.scheduledTick);
    const penalty = (contract.minQuantity - 60) * 50 * contract.penaltyRate;

    expect(executions).toHaveLength(1);
    expect(executions[0]).toMatchObject({
      quantity: 60,
      value: 3_000,
      penalty,
      success: false,
    });
    expect(world.companies.inventories[inventoryIndex(0, 0)]).toBe(0);
    expect(world.companies.inventories[inventoryIndex(1, 0)]).toBe(60);
    expect(world.companies.cash[0]).toBeCloseTo(12_900, 6);
    expect(world.companies.cash[1]).toBeCloseTo(17_100, 6);
    expect(manager.getContractDeliveries(contract.id)[0].status).toBe('partial');
  });

  it('limits delivery by buyer liquidity and charges the buyer for failing the minimum take', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.cash[0] = 5_000;
    world.companies.cash[1] = 1_000;

    const manager = new SupplyContractManager();
    const proposal = manager.createProposal(0, 1, ContractRole.SUPPLIER, 0, 100, 7, 1, 50, 0);
    const contract = manager.acceptProposal(proposal.id, 0)!;
    const [delivery] = manager.getContractDeliveries(contract.id);

    world.companies.inventories[inventoryIndex(0, 0)] = 100;

    const executions = manager.processContracts(world, delivery.scheduledTick);
    const penalty = (contract.minQuantity - 20) * 50 * contract.penaltyRate;

    expect(executions).toHaveLength(1);
    expect(executions[0]).toMatchObject({
      quantity: 20,
      value: 1_000,
      penalty,
      success: false,
    });
    expect(world.companies.inventories[inventoryIndex(0, 0)]).toBe(80);
    expect(world.companies.inventories[inventoryIndex(1, 0)]).toBe(20);
    expect(world.companies.cash[0]).toBeCloseTo(6_300, 6);
    expect(world.companies.cash[1]).toBeCloseTo(-300, 6);
    expect(manager.getContractDeliveries(contract.id)[0].status).toBe('partial');
  });
});
