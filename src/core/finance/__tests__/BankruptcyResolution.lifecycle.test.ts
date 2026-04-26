import { beforeEach, describe, expect, it } from 'vitest';

import { GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import {
  createBuyOrder,
  createSellOrderWithReason,
  resetOrderPool,
} from '@/core/market/OrderBook';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import {
  ContractRole,
  ContractStatus,
  supplyContractManager,
} from '@/core/economy/SupplyContracts';

import {
  BankruptcyEventStatus,
  BankruptcyResolutionSnapshot,
  BankruptcyStrategyMode,
  BankruptcyStrategySettings,
  DEFAULT_STRATEGY,
  bankruptcyResolution,
  resetBankruptcyResolution,
} from '../BankruptcyResolution';
import { getStock, initializeStockMarket } from '../StockMarket';

describe('BankruptcyResolution lifecycle', () => {
  beforeEach(() => {
    resetBankruptcyResolution();
    resetOrderPool();
    supplyContractManager.reset();
  });

  it('exposes required contract types and literal values', () => {
    const eventStatus: BankruptcyEventStatus = 'auction_open';
    const cooldownStatus: BankruptcyEventStatus = 'restructure_cooldown';
    const strategyMode: BankruptcyStrategyMode = 'auto_participate';
    const strategy: BankruptcyStrategySettings = DEFAULT_STRATEGY;
    const snapshot: BankruptcyResolutionSnapshot = {
      events: [],
      assets: [],
      strategies: {},
      nextEventId: 1,
      nextAssetId: 1,
    };

    expect(eventStatus).toBe('auction_open');
    expect(cooldownStatus).toBe('restructure_cooldown');
    expect(strategyMode).toBe('auto_participate');
    expect(strategy).toEqual({
      mode: 'notify_only',
      eventBudgetCap: 0,
      assetBudgetCap: 0,
      autoTrackSameIndustry: false,
    });
    expect(snapshot.nextEventId).toBe(1);
  });

  it('creates a frozen bankruptcy event with building and inventory auction lots', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[1] = '破产AI';
    world.companies.cash[1] = -50_000;
    world.companies.totalLiabilities[1] = 600_000;

    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    world.companies.inventories[1 * GOODS_COUNT + 0] = 120;

    const event = bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 240);
    const companyEvents = bankruptcyResolution.getCompanyEvents(1);
    const assets = bankruptcyResolution.getEventAssets(event.id);
    const firstAsset = bankruptcyResolution.getAsset(assets[0].id);
    const snapshot = bankruptcyResolution.getSnapshot();

    expect(event.id).toBe('bk-1');
    expect(event.status).toBe('bankruptcy_frozen');
    expect(event.reason).toBe('cash_insolvent');
    expect(event.createdTick).toBe(240);
    expect(event.expiresTick).toBe(240 + 14 * TICKS_PER_DAY);
    expect(event.debtSnapshot).toBe(600_000);
    expect(event.estateCash).toBe(0);
    expect(event.settlementCosts).toBe(0);
    expect(event.assetIds.length).toBeGreaterThan(0);
    expect(event.delisted).toBe(false);
    expect(assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: event.id,
          assetType: 'building',
          buildingId,
          quantity: 1,
          reservePrice: expect.any(Number),
          state: 'queued',
          currentHighestBid: 0,
          currentHighestBidderId: null,
          discountedRound: 0,
          auctionEndTick: null,
          bids: [],
        }),
        expect.objectContaining({
          eventId: event.id,
          assetType: 'inventory',
          goodsId: 0,
          quantity: 120,
          reservePrice: expect.any(Number),
          state: 'queued',
          currentHighestBid: 0,
          currentHighestBidderId: null,
          discountedRound: 0,
          auctionEndTick: null,
          bids: [],
        }),
      ]),
    );
    expect(companyEvents.map((item) => item.id)).toContain(event.id);
    expect(firstAsset).toEqual(expect.objectContaining({ id: assets[0].id }));
    expect(event.assetIds).toEqual(assets.map((asset) => asset.id));
    expect(snapshot).toEqual(
      expect.objectContaining({
        events: expect.arrayContaining([expect.objectContaining({ id: event.id })]),
        assets: expect.arrayContaining([expect.objectContaining({ id: assets[0].id })]),
        strategies: expect.any(Object),
        nextEventId: 2,
        nextAssetId: assets.length + 1,
      }),
    );
    expect(world.buildings.isActive[buildingId]).toBe(0);
  });

  it('returns notify-only as the default player strategy', () => {
    expect(bankruptcyResolution.getStrategy(0)).toEqual({
      mode: 'notify_only',
      eventBudgetCap: 0,
      assetBudgetCap: 0,
      autoTrackSameIndustry: false,
    });
  });

  it('cancels open market orders and breaches long-term contracts when the event opens', () => {
    const world = createGameWorld();
    world.companies.count = 2;
    world.companies.names[0] = '玩家公司';
    world.companies.names[1] = '破产AI';
    world.companies.cash[1] = 300_000;
    world.companies.totalLiabilities[1] = 400_000;
    world.companies.inventories[1 * GOODS_COUNT + 0] = 200;

    createBuyOrder(world, 1, 18, 50, 120);
    createSellOrderWithReason(world, 1, 0, 100, 80);

    const proposal = supplyContractManager.createProposal(
      1,
      0,
      ContractRole.SUPPLIER,
      0,
      40,
      7,
      3,
      90,
      120,
    );
    const contract = supplyContractManager.acceptProposal(proposal.id, 120)!;

    const event = bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 120);

    expect(world.orders.activeCount).toBe(0);
    expect(world.companies.inventoryReserved[1 * GOODS_COUNT + 0]).toBe(0);
    expect(
      supplyContractManager.getCompanyContracts(1).find((entry) => entry.id === contract.id)?.status,
    ).toBe(ContractStatus.BREACHED);
    expect(event.cancelledOrderIndices.length).toBeGreaterThan(0);
    expect(event.breachedContractIds).toContain(contract.id);
    expect(event.settlementCosts).toBeGreaterThan(0);
  });

  it('settles the estate, delists the stock, and restores the company only after cooldown', () => {
    const world = createGameWorld();
    world.companies.count = 3;
    world.companies.names[1] = '待重组AI';
    world.companies.names[2] = '健康AI';
    world.companies.isAI[1] = true;
    world.companies.isAI[2] = true;
    world.companies.cash[1] = 800_000;
    world.companies.cash[2] = 2_000_000;
    world.companies.totalLiabilities[1] = 500_000;

    const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
    initializeStockMarket(world);

    const event = bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', 720);
    bankruptcyResolution.startAuction(event.id, 720, 2 * TICKS_PER_DAY);
    const buildingAsset = bankruptcyResolution
      .getEventAssets(event.id)
      .find((asset) => asset.assetType === 'building');

    expect(buildingAsset).toBeTruthy();
    expect(bankruptcyResolution.placeBid(world, event.id, buildingAsset!.id, 2, 700_000, 'manual')).toBe(true);

    bankruptcyResolution.advance(world, 722);

    const stock = getStock(1);
    const settledEvent = bankruptcyResolution.getCompanyEvents(1)[0];

    expect(stock).toBeTruthy();
    expect(stock?.isTradable).toBe(false);
    expect(stock?.isListed).toBe(false);
    expect(settledEvent.status).toBe('restructure_cooldown');
    expect(settledEvent.restructureAvailableTick).toBeGreaterThan(722);
    expect(bankruptcyResolution.getOpenEvents().map((item) => item.id)).not.toContain(event.id);

    bankruptcyResolution.advance(world, settledEvent.restructureAvailableTick!);

    const restructuredEvent = bankruptcyResolution.getCompanyEvents(1)[0];

    expect(world.companies.cash[1]).toBeGreaterThan(0);
    expect(world.companies.totalLiabilities[1]).toBe(0);
    expect(world.buildings.owners[buildingId]).toBe(2);
    expect(restructuredEvent.status).toBe('restructured');
  });
});
