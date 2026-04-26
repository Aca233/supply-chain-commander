import { beforeEach, describe, expect, it } from 'vitest';

import { createGameWorld, GameWorld } from '@/core/world/GameWorld';

import {
  getHoldings,
  getIPOOfferPreview,
  getStock,
  initializeStockMarket,
  initiateIPO,
} from '../StockMarket';

function createIPOTestWorld(aiCash: number): GameWorld {
  const world = createGameWorld();

  world.tick = 240;
  world.companies.count = 4;
  world.companies.names[0] = '玩家公司';
  world.companies.isPlayer[0] = true;
  world.companies.cash[0] = 12_000_000;

  for (let companyId = 1; companyId < 4; companyId++) {
    world.companies.names[companyId] = `AI公司${companyId}`;
    world.companies.isAI[companyId] = true;
    world.companies.cash[companyId] = aiCash;
  }

  world.buildings.count = 6;
  for (let buildingId = 0; buildingId < 6; buildingId++) {
    world.buildings.owners[buildingId] = 0;
  }

  return world;
}

describe('initiateIPO', () => {
  beforeEach(() => {
    initializeStockMarket(createIPOTestWorld(50_000_000));
  });

  it('provides IPO preview guidance for price range and expected subscription', () => {
    const world = createIPOTestWorld(50_000_000);
    initializeStockMarket(world);

    const preview = getIPOOfferPreview(world, 0, 300_000, 20);

    expect(preview.suggestedPrice).toBe(22.5);
    expect(preview.minPrice).toBe(11.25);
    expect(preview.maxPrice).toBe(45);
    expect(preview.estimatedDemand).toBe(300_000);
    expect(preview.canLaunch).toBe(true);
    expect(preview.message).toBe('按当前定价，发行可被真实买家全部认购');
  });

  it('rejects wildly overpriced IPOs without minting cash', () => {
    const world = createIPOTestWorld(50_000_000);
    initializeStockMarket(world);

    const playerCashBefore = world.companies.cash[0];

    const result = initiateIPO(world, 0, 300_000, 10_000);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('price_out_of_range');
    expect(world.companies.cash[0]).toBe(playerCashBefore);
    expect(getStock(0)).toBeNull();
  });

  it('fails when the offering cannot be fully subscribed by real buyers', () => {
    const world = createIPOTestWorld(500_000);
    initializeStockMarket(world);

    const playerCashBefore = world.companies.cash[0];

    const result = initiateIPO(world, 0, 300_000, 20);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('insufficient_demand');
    expect(world.companies.cash[0]).toBe(playerCashBefore);
    expect(getStock(0)).toBeNull();
  });

  it('sets IPO quote fields from the offering price after a successful listing', () => {
    const world = createIPOTestWorld(50_000_000);
    initializeStockMarket(world);

    const result = initiateIPO(world, 0, 300_000, 20);
    const stock = getStock(0);
    const selfHolding = getHoldings(0).find((holding) => holding.stockCompanyId === 0);

    expect(result.success).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(stock).toBeTruthy();
    expect(stock?.currentPrice).toBe(20);
    expect(stock?.openPrice).toBe(20);
    expect(stock?.highPrice).toBe(20);
    expect(stock?.lowPrice).toBe(20);
    expect(stock?.previousClose).toBe(20);
    expect(stock?.outstandingShares).toBe(300_000);
    expect(stock?.marketCap).toBe(20_000_000);
    expect(world.companies.cash[0]).toBe(18_000_000);
    expect(selfHolding?.shares).toBe(700_000);
  });
});
