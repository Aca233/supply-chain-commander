import { beforeEach, describe, expect, it } from 'vitest';

import { TICKS_PER_DAY } from '@/core/constants';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

import { bankruptcyResolution, resetBankruptcyResolution } from '../BankruptcyResolution';

function createAuctionWorld() {
  const world = createGameWorld();
  world.companies.count = 3;
  world.companies.names[0] = '玩家公司';
  world.companies.names[1] = '破产AI';
  world.companies.names[2] = '健康AI';
  world.companies.isPlayer[0] = true;
  world.companies.isAI[0] = false;
  world.companies.isAI[1] = true;
  world.companies.isAI[2] = true;
  world.companies.cash[0] = 1_000_000;
  world.companies.cash[1] = -50_000;
  world.companies.cash[2] = 2_000_000;
  world.companies.totalLiabilities[0] = 150_000;
  world.companies.totalLiabilities[1] = 900_000;
  world.companies.totalLiabilities[2] = 80_000;
  return world;
}

function openBuildingAuction(currentTick: number, durationTicks: number) {
  const world = createAuctionWorld();
  const buildingId = addBuilding(world, 1, BuildingId.IRON_MINE, 0);
  const event = bankruptcyResolution.openEvent(world, 1, 'cash_insolvent', currentTick);
  bankruptcyResolution.startAuction(event.id, currentTick, durationTicks);

  const asset = bankruptcyResolution
    .getEventAssets(event.id)
    .find((entry) => entry.assetType === 'building');

  expect(asset).toBeTruthy();

  return {
    world,
    buildingId,
    event,
    asset: asset!,
  };
}

describe('BankruptcyResolution auctions', () => {
  beforeEach(() => {
    resetBankruptcyResolution();
  });

  it('sells a building lot to the highest confirmed bidder without transferring old debt', () => {
    const { world, buildingId, event, asset } = openBuildingAuction(300, 3 * TICKS_PER_DAY);
    const playerDebtBefore = world.companies.totalLiabilities[0];

    expect(bankruptcyResolution.placeBid(world, event.id, asset.id, 2, 400_000, 'manual')).toBe(true);
    expect(bankruptcyResolution.placeBid(world, event.id, asset.id, 0, 420_000, 'manual')).toBe(true);

    bankruptcyResolution.advance(world, 303);

    const settledAsset = bankruptcyResolution.getAsset(asset.id);
    const settledEvent = bankruptcyResolution.getEvent(event.id);

    expect(world.buildings.owners[buildingId]).toBe(0);
    expect(world.buildings.isActive[buildingId]).toBe(1);
    expect(world.companies.cash[0]).toBe(580_000);
    expect(world.companies.totalLiabilities[0]).toBe(playerDebtBefore);
    expect(settledAsset).toEqual(
      expect.objectContaining({
        id: asset.id,
        state: 'sold',
        currentHighestBid: 420_000,
        currentHighestBidderId: 0,
      }),
    );
    expect(settledEvent?.estateCash).toBe(420_000);
  });

  it('moves a winning strategy bid into pending confirmation and finalizes after manual confirm', () => {
    bankruptcyResolution.setStrategy(0, {
      mode: 'auto_participate',
      eventBudgetCap: 600_000,
      assetBudgetCap: 300_000,
      autoTrackSameIndustry: true,
    });

    const { world, buildingId, event, asset } = openBuildingAuction(350, 2 * TICKS_PER_DAY);

    expect(bankruptcyResolution.placeBid(world, event.id, asset.id, 0, 250_000, 'strategy')).toBe(true);

    bankruptcyResolution.advance(world, 352);

    const pendingAsset = bankruptcyResolution.getAsset(asset.id);

    expect(pendingAsset).toEqual(
      expect.objectContaining({
        id: asset.id,
        state: 'pending_confirmation',
        pendingWinnerId: 0,
        pendingConfirmUntilTick: 366,
      }),
    );
    expect(world.buildings.owners[buildingId]).toBe(1);
    expect(bankruptcyResolution.confirmPendingPurchase(world, event.id, asset.id, 0)).toBe(true);

    const soldAsset = bankruptcyResolution.getAsset(asset.id);
    const settledEvent = bankruptcyResolution.getEvent(event.id);

    expect(world.buildings.owners[buildingId]).toBe(0);
    expect(world.buildings.isActive[buildingId]).toBe(1);
    expect(world.companies.cash[0]).toBe(750_000);
    expect(soldAsset).toEqual(
      expect.objectContaining({
        id: asset.id,
        state: 'sold',
        currentHighestBid: 250_000,
        currentHighestBidderId: 0,
      }),
    );
    expect(soldAsset?.pendingWinnerId).toBeUndefined();
    expect(settledEvent?.estateCash).toBe(250_000);
  });

  it('requires manual confirmation when an automatic player bid wins and falls back on timeout', () => {
    bankruptcyResolution.setStrategy(0, {
      mode: 'auto_participate',
      eventBudgetCap: 600_000,
      assetBudgetCap: 300_000,
      autoTrackSameIndustry: true,
    });

    const { world, buildingId, event, asset } = openBuildingAuction(400, 2 * TICKS_PER_DAY);

    expect(bankruptcyResolution.placeBid(world, event.id, asset.id, 2, 220_000, 'manual')).toBe(true);
    expect(bankruptcyResolution.placeBid(world, event.id, asset.id, 0, 250_000, 'strategy')).toBe(true);

    bankruptcyResolution.advance(world, 402);

    const pendingAsset = bankruptcyResolution.getAsset(asset.id);

    expect(pendingAsset).toEqual(
      expect.objectContaining({
        id: asset.id,
        state: 'pending_confirmation',
        pendingWinnerId: 0,
      }),
    );
    expect(world.buildings.owners[buildingId]).toBe(1);
    expect(world.companies.cash[0]).toBe(1_000_000);

    bankruptcyResolution.advance(world, 416);

    const soldAsset = bankruptcyResolution.getAsset(asset.id);
    const settledEvent = bankruptcyResolution.getEvent(event.id);

    expect(world.buildings.owners[buildingId]).toBe(2);
    expect(world.buildings.isActive[buildingId]).toBe(1);
    expect(world.companies.cash[2]).toBe(1_780_000);
    expect(world.companies.cash[0]).toBe(1_000_000);
    expect(soldAsset).toEqual(
      expect.objectContaining({
        id: asset.id,
        state: 'sold',
        currentHighestBid: 220_000,
        currentHighestBidderId: 2,
      }),
    );
    expect(settledEvent?.estateCash).toBe(220_000);
  });

  it('reopens an unsold building once at a discount and destroys it after a second failed round', () => {
    const { world, buildingId, asset } = openBuildingAuction(500, 2 * TICKS_PER_DAY);
    const firstRoundReserve = asset.reservePrice;

    bankruptcyResolution.advance(world, 502);

    const reopenedAsset = bankruptcyResolution.getAsset(asset.id);

    expect(reopenedAsset).toEqual(
      expect.objectContaining({
        id: asset.id,
        state: 'open',
        discountedRound: 1,
        auctionEndTick: 516,
      }),
    );
    expect(reopenedAsset?.reservePrice).toBeLessThanOrEqual(firstRoundReserve);

    bankruptcyResolution.advance(world, 516);

    const destroyedAsset = bankruptcyResolution.getAsset(asset.id);

    expect(destroyedAsset?.state).toBe('destroyed');
    expect(world.buildings.owners[buildingId]).toBe(1);
    expect(world.buildings.isActive[buildingId]).toBe(0);
  });
});
