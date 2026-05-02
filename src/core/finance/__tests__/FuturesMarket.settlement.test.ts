import { describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';

import { ContractPosition, FuturesMarket } from '../FuturesMarket';
import { createGameWorld } from '../../world/GameWorld';

describe('FuturesMarket settlement', () => {
  it('creates agricultural and metal contracts on the actual goods ids', () => {
    const market = new FuturesMarket();

    market.createMonthlyContracts(0, new Map([
      [GoodsId.GRAIN, 100],
      [GoodsId.COTTON, 80],
      [GoodsId.STEEL, 120],
      [GoodsId.COPPER, 150],
    ]));

    expect(market.getGoodsContracts(GoodsId.GRAIN).length).toBeGreaterThan(0);
    expect(market.getGoodsContracts(GoodsId.COTTON).length).toBeGreaterThan(0);
    expect(market.getGoodsContracts(GoodsId.STEEL).length).toBeGreaterThan(0);
    expect(market.getGoodsContracts(GoodsId.COPPER).length).toBeGreaterThan(0);
  });

  it('freezes initial margin on entry and releases it with final pnl at expiry', () => {
    const world = createGameWorld();
    world.companies.cash[0] = 1_000_000;

    const market = new FuturesMarket();
    const [contract] = market.createMonthlyContracts(0, new Map([[GoodsId.IRON_ORE, 100]]));
    const entryPrice = contract.settlementPrice;

    const order = market.placeOrder(
      world,
      0,
      contract.id,
      ContractPosition.LONG,
      2,
      entryPrice,
      'market',
      0,
    );

    expect(order).not.toBeNull();
    expect(world.companies.cash[0]).toBeCloseTo(1_000_000 - contract.initialMargin * 2, 6);

    market.updatePositionsPnL(world, new Map([[GoodsId.IRON_ORE, 120]]));
    const midPnl = (120 - entryPrice) * 2 * contract.contractSize;
    expect(world.companies.cash[0]).toBeCloseTo(1_000_000 - contract.initialMargin * 2 + midPnl, 6);

    const expiredContracts = market.handleExpiry(world, contract.expiryTick, new Map([[GoodsId.IRON_ORE, 130]]));
    const finalPnl = (130 - entryPrice) * 2 * contract.contractSize;

    expect(expiredContracts).toBeGreaterThanOrEqual(1);
    expect(market.getCompanyPositions(0)).toHaveLength(0);
    expect(world.companies.cash[0]).toBeCloseTo(1_000_000 + finalPnl, 6);
  });

  it('rejects orders when the company cannot post the required margin', () => {
    const world = createGameWorld();

    const market = new FuturesMarket();
    const [contract] = market.createMonthlyContracts(0, new Map([[GoodsId.IRON_ORE, 100]]));
    world.companies.cash[0] = contract.initialMargin - 1;

    const order = market.placeOrder(
      world,
      0,
      contract.id,
      ContractPosition.LONG,
      1,
      contract.settlementPrice,
      'market',
      0,
    );

    expect(order).toBeNull();
  });
});
