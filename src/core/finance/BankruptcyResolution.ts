import { GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import { supplyContractManager } from '@/core/economy/SupplyContracts';
import { cancelCompanyOrders } from '@/core/market/OrderBook';
import { GameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';

import { delistStock, haltStock } from './StockMarket';

export type BankruptcyEventStatus =
  | 'bankruptcy_frozen'
  | 'auction_open'
  | 'settlement_in_progress'
  | 'delisted'
  | 'restructure_cooldown'
  | 'restructured';

export type BankruptcyStrategyMode =
  | 'auto_participate'
  | 'notify_only'
  | 'never_participate';

export interface BankruptcyStrategySettings {
  mode: BankruptcyStrategyMode;
  eventBudgetCap: number;
  assetBudgetCap: number;
  autoTrackSameIndustry: boolean;
}

export interface BankruptcyAuctionAsset {
  id: string;
  eventId: string;
  assetType: 'building' | 'inventory';
  buildingId?: number;
  goodsId?: number;
  quantity: number;
  reservePrice: number;
  state: 'queued' | 'open' | 'pending_confirmation' | 'sold' | 'unsold' | 'destroyed';
  currentHighestBid: number;
  currentHighestBidderId: number | null;
  discountedRound: number;
  auctionEndTick: number | null;
  bids: Array<{
    bidderId: number;
    amount: number;
    source: 'manual' | 'strategy';
    createdTick: number;
  }>;
  pendingWinnerId?: number;
  pendingConfirmUntilTick?: number;
}

export interface BankruptcyEvent {
  id: string;
  companyId: number;
  status: BankruptcyEventStatus;
  createdTick: number;
  expiresTick: number;
  reason: string;
  debtSnapshot: number;
  estateCash: number;
  settlementCosts: number;
  cancelledOrderIndices: number[];
  breachedContractIds: number[];
  assetIds: string[];
  delisted: boolean;
  restructureAvailableTick?: number;
}

export interface BankruptcyResolutionSnapshot {
  events: BankruptcyEvent[];
  assets: BankruptcyAuctionAsset[];
  strategies: Record<string, BankruptcyStrategySettings>;
  nextEventId: number;
  nextAssetId: number;
}

type AuctionBid = BankruptcyAuctionAsset['bids'][number];

const BUILDING_RESERVE_PRICE = 200_000;
const INVENTORY_RESERVE_PRICE_PER_UNIT = 100;
// 1 tick = 1天 = 1秒，破产拍卖需要给玩家留出足够的反应时间。
const INITIAL_AUCTION_DURATION = 30 * TICKS_PER_DAY;
const RELIST_AUCTION_DURATION = 14 * TICKS_PER_DAY;
const PENDING_CONFIRMATION_DURATION = 14 * TICKS_PER_DAY;
const BUILDING_RELIST_DISCOUNT = 0.8;
const RESTRUCTURE_COOLDOWN_DURATION = 30 * TICKS_PER_DAY;
const RESTRUCTURE_RESTART_CASH = 3_000_000;

export const DEFAULT_STRATEGY: BankruptcyStrategySettings = {
  mode: 'notify_only',
  eventBudgetCap: 0,
  assetBudgetCap: 0,
  autoTrackSameIndustry: false,
};

function cloneStrategy(strategy: BankruptcyStrategySettings): BankruptcyStrategySettings {
  return { ...strategy };
}

function cloneAsset(asset: BankruptcyAuctionAsset): BankruptcyAuctionAsset {
  return {
    ...asset,
    bids: asset.bids.map((bid) => ({ ...bid })),
  };
}

function cloneEvent(event: BankruptcyEvent): BankruptcyEvent {
  return {
    ...event,
    cancelledOrderIndices: [...event.cancelledOrderIndices],
    breachedContractIds: [...event.breachedContractIds],
    assetIds: [...event.assetIds],
  };
}

export class BankruptcyResolutionManager {
  private nextEventId = 1;
  private nextAssetId = 1;
  private events = new Map<string, BankruptcyEvent>();
  private assets = new Map<string, BankruptcyAuctionAsset>();
  private companyEventIds = new Map<number, string[]>();
  private strategies = new Map<number, BankruptcyStrategySettings>();

  private getActiveEventForCompany(companyId: number): BankruptcyEvent | null {
    const eventIds = this.companyEventIds.get(companyId) ?? [];
    for (const eventId of eventIds) {
      const event = this.events.get(eventId);
      if (!event) {
        continue;
      }
      if (event.status !== 'restructured' && event.status !== 'delisted') {
        return event;
      }
    }
    return null;
  }

  reset(): void {
    this.nextEventId = 1;
    this.nextAssetId = 1;
    this.events.clear();
    this.assets.clear();
    this.companyEventIds.clear();
    this.strategies.clear();
  }

  getStrategy(companyId: number): BankruptcyStrategySettings {
    const strategy = this.strategies.get(companyId);
    return strategy ? cloneStrategy(strategy) : cloneStrategy(DEFAULT_STRATEGY);
  }

  setStrategy(companyId: number, patch: Partial<BankruptcyStrategySettings>): BankruptcyStrategySettings {
    const next = {
      ...this.getStrategy(companyId),
      ...patch,
    };
    this.strategies.set(companyId, next);
    return cloneStrategy(next);
  }

  openEvent(
    world: GameWorld,
    companyId: number,
    reason: string,
    currentTick: number,
  ): BankruptcyEvent {
    const activeEvent = this.getActiveEventForCompany(companyId);
    if (activeEvent) {
      return cloneEvent(activeEvent);
    }

    const eventId = `bk-${this.nextEventId++}`;
    const assetIds: string[] = [];

    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (world.buildings.owners[buildingId] !== companyId) {
        continue;
      }

      world.buildings.isActive[buildingId] = 0;

      const assetId = `ba-${this.nextAssetId++}`;
      const asset: BankruptcyAuctionAsset = {
        id: assetId,
        eventId,
        assetType: 'building',
        buildingId,
        quantity: 1,
        reservePrice: BUILDING_RESERVE_PRICE,
        state: 'queued',
        currentHighestBid: 0,
        currentHighestBidderId: null,
        discountedRound: 0,
        auctionEndTick: null,
        bids: [],
      };
      this.assets.set(assetId, asset);
      assetIds.push(assetId);
    }

    for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
      const inventoryIndex = companyId * GOODS_COUNT + goodsId;
      const quantity = world.companies.inventories[inventoryIndex];
      if (quantity <= 0) {
        continue;
      }

      const assetId = `ba-${this.nextAssetId++}`;
      const asset: BankruptcyAuctionAsset = {
        id: assetId,
        eventId,
        assetType: 'inventory',
        goodsId,
        quantity,
        reservePrice: Math.max(1, Math.floor(quantity * INVENTORY_RESERVE_PRICE_PER_UNIT)),
        state: 'queued',
        currentHighestBid: 0,
        currentHighestBidderId: null,
        discountedRound: 0,
        auctionEndTick: null,
        bids: [],
      };
      this.assets.set(assetId, asset);
      assetIds.push(assetId);
    }

    const cancelledOrders = cancelCompanyOrders(world, companyId);
    const breachedContracts = supplyContractManager.terminateCompanyContractsForBankruptcy(companyId, currentTick);

    const event: BankruptcyEvent = {
      id: eventId,
      companyId,
      status: 'bankruptcy_frozen',
      createdTick: currentTick,
      expiresTick: currentTick + 14 * TICKS_PER_DAY,
      reason,
      debtSnapshot: world.companies.totalLiabilities[companyId] ?? 0,
      estateCash: Math.max(0, world.companies.cash[companyId] ?? 0),
      settlementCosts: breachedContracts.reduce((sum, item) => sum + item.penalty, 0),
      cancelledOrderIndices: cancelledOrders.orderIndices,
      breachedContractIds: breachedContracts.map((item) => item.contractId),
      assetIds,
      delisted: false,
    };

    this.events.set(event.id, event);
    const companyEventIds = this.companyEventIds.get(companyId) ?? [];
    companyEventIds.push(event.id);
    this.companyEventIds.set(companyId, companyEventIds);

    return cloneEvent(event);
  }

  getEvent(eventId: string): BankruptcyEvent | null {
    const event = this.events.get(eventId);
    return event ? cloneEvent(event) : null;
  }

  getEventAssets(eventId: string): BankruptcyAuctionAsset[] {
    const event = this.events.get(eventId);
    if (!event) {
      return [];
    }

    return event.assetIds
      .map((assetId) => this.assets.get(assetId))
      .filter((asset): asset is BankruptcyAuctionAsset => Boolean(asset))
      .map(cloneAsset);
  }

  getCompanyEvents(companyId: number): BankruptcyEvent[] {
    const eventIds = this.companyEventIds.get(companyId) ?? [];
    return eventIds
      .map((eventId) => this.events.get(eventId))
      .filter((event): event is BankruptcyEvent => Boolean(event))
      .map(cloneEvent);
  }

  hasActiveEvent(companyId: number): boolean {
    return this.getActiveEventForCompany(companyId) !== null;
  }

  startAuction(eventId: string, currentTick: number, durationTicks: number): void {
    const event = this.events.get(eventId);
    if (!event) {
      return;
    }

    event.status = 'auction_open';

    for (const assetId of event.assetIds) {
      const asset = this.assets.get(assetId);
      if (!asset || asset.state !== 'queued') {
        continue;
      }

      asset.state = 'open';
      asset.auctionEndTick = currentTick + durationTicks;
      asset.pendingWinnerId = undefined;
      asset.pendingConfirmUntilTick = undefined;
    }
  }

  placeBid(
    world: GameWorld,
    eventId: string,
    assetId: string,
    bidderId: number,
    amount: number,
    source: 'manual' | 'strategy',
  ): boolean {
    const event = this.events.get(eventId);
    const asset = this.assets.get(assetId);
    if (!event || !asset || asset.eventId !== eventId) {
      return false;
    }
    if (event.status !== 'auction_open' || asset.state !== 'open') {
      return false;
    }
    if (bidderId === event.companyId || bidderId < 0 || bidderId >= world.companies.count) {
      return false;
    }

    const minimumBid = Math.max(asset.reservePrice, asset.currentHighestBid + 1);
    if (amount < minimumBid || world.companies.cash[bidderId] < amount) {
      return false;
    }

    if (!this.isBidSourceAllowed(bidderId, amount, source)) {
      return false;
    }

    const bid: AuctionBid = {
      bidderId,
      amount,
      source,
      createdTick: world.tick + asset.bids.length,
    };
    asset.bids.push(bid);
    asset.currentHighestBid = amount;
    asset.currentHighestBidderId = bidderId;
    return true;
  }

  confirmPendingPurchase(
    world: GameWorld,
    eventId: string,
    assetId: string,
    bidderId: number,
  ): boolean {
    const event = this.events.get(eventId);
    const asset = this.assets.get(assetId);
    if (!event || !asset || asset.eventId !== eventId) {
      return false;
    }
    if (asset.state !== 'pending_confirmation' || asset.pendingWinnerId !== bidderId) {
      return false;
    }

    const winningBid = this.getBestBidForBidder(asset, bidderId);
    if (!winningBid) {
      return false;
    }

    if (this.finalizeAssetAuction(world, event, asset, winningBid)) {
      return true;
    }

    this.expirePendingConfirmation(world, event, asset, asset.pendingConfirmUntilTick ?? world.tick);
    const refreshedAsset = this.assets.get(assetId);
    return refreshedAsset?.state === 'sold' && refreshedAsset.currentHighestBidderId === bidderId;
  }

  advance(world: GameWorld, currentTick: number): void {
    for (const event of this.events.values()) {
      if (event.status === 'bankruptcy_frozen') {
        this.startAuction(event.id, currentTick, INITIAL_AUCTION_DURATION);
        continue;
      }

      if (event.status === 'auction_open') {
        for (const assetId of event.assetIds) {
          const asset = this.assets.get(assetId);
          if (!asset) {
            continue;
          }
          if (asset.state === 'open' && asset.auctionEndTick !== null && currentTick >= asset.auctionEndTick) {
            this.finalizeOpenAuction(world, event, asset, currentTick);
            continue;
          }
          if (
            asset.state === 'pending_confirmation'
            && asset.pendingConfirmUntilTick !== undefined
            && currentTick >= asset.pendingConfirmUntilTick
          ) {
            this.expirePendingConfirmation(world, event, asset, currentTick);
          }
        }

        if (this.areEventAssetsResolved(event)) {
          this.settleEvent(world, event, currentTick);
        }
        continue;
      }

      if (
        event.status === 'restructure_cooldown'
        && event.restructureAvailableTick !== undefined
        && currentTick >= event.restructureAvailableTick
      ) {
        this.restructureCompany(world, event, currentTick);
      }
    }
  }

  getAsset(assetId: string): BankruptcyAuctionAsset | null {
    const asset = this.assets.get(assetId);
    return asset ? cloneAsset(asset) : null;
  }

  getOpenEvents(): BankruptcyEvent[] {
    return Array.from(this.events.values())
      .filter((event) => event.status === 'bankruptcy_frozen' || event.status === 'auction_open')
      .map(cloneEvent);
  }

  getSnapshot(): BankruptcyResolutionSnapshot {
    const strategies: Record<string, BankruptcyStrategySettings> = {};
    for (const [companyId, strategy] of this.strategies.entries()) {
      strategies[String(companyId)] = cloneStrategy(strategy);
    }

    return {
      events: Array.from(this.events.values()).map(cloneEvent),
      assets: Array.from(this.assets.values()).map(cloneAsset),
      strategies,
      nextEventId: this.nextEventId,
      nextAssetId: this.nextAssetId,
    };
  }

  hydrate(snapshot?: BankruptcyResolutionSnapshot): void {
    this.reset();
    if (!snapshot) {
      return;
    }

    this.nextEventId = snapshot.nextEventId;
    this.nextAssetId = snapshot.nextAssetId;

    for (const event of snapshot.events) {
      const clonedEvent = cloneEvent(event);
      this.events.set(clonedEvent.id, clonedEvent);

      const companyEventIds = this.companyEventIds.get(clonedEvent.companyId) ?? [];
      companyEventIds.push(clonedEvent.id);
      this.companyEventIds.set(clonedEvent.companyId, companyEventIds);
    }

    for (const asset of snapshot.assets) {
      const clonedAsset = cloneAsset(asset);
      this.assets.set(clonedAsset.id, clonedAsset);
    }

    for (const [companyId, strategy] of Object.entries(snapshot.strategies)) {
      this.strategies.set(Number(companyId), cloneStrategy(strategy));
    }
  }

  private isBidSourceAllowed(
    bidderId: number,
    amount: number,
    source: 'manual' | 'strategy',
  ): boolean {
    if (source !== 'strategy') {
      return true;
    }

    const strategy = this.getStrategy(bidderId);
    if (strategy.mode !== 'auto_participate') {
      return false;
    }

    return amount <= strategy.assetBudgetCap && amount <= strategy.eventBudgetCap;
  }

  private getBestBidForBidder(asset: BankruptcyAuctionAsset, bidderId: number): AuctionBid | null {
    let bestBid: AuctionBid | null = null;
    for (const bid of asset.bids) {
      if (bid.bidderId !== bidderId) {
        continue;
      }
      if (
        !bestBid
        || bid.amount > bestBid.amount
        || (bid.amount === bestBid.amount && bid.createdTick < bestBid.createdTick)
      ) {
        bestBid = bid;
      }
    }
    return bestBid ? { ...bestBid } : null;
  }

  private getRankedValidBids(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    excludedBidderIds = new Set<number>(),
  ): AuctionBid[] {
    const bestBidByBidder = new Map<number, AuctionBid>();

    for (const bid of asset.bids) {
      if (excludedBidderIds.has(bid.bidderId)) {
        continue;
      }

      const currentBest = bestBidByBidder.get(bid.bidderId);
      if (
        !currentBest
        || bid.amount > currentBest.amount
        || (bid.amount === currentBest.amount && bid.createdTick < currentBest.createdTick)
      ) {
        bestBidByBidder.set(bid.bidderId, bid);
      }
    }

    return Array.from(bestBidByBidder.values())
      .filter((bid) => this.isBidStillValid(world, event, asset, bid))
      .sort((left, right) => {
        if (right.amount !== left.amount) {
          return right.amount - left.amount;
        }
        return left.createdTick - right.createdTick;
      })
      .map((bid) => ({ ...bid }));
  }

  private isBidStillValid(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    bid: AuctionBid,
  ): boolean {
    if (bid.bidderId === event.companyId || bid.bidderId < 0 || bid.bidderId >= world.companies.count) {
      return false;
    }
    if (bid.amount < asset.reservePrice) {
      return false;
    }
    if (world.companies.cash[bid.bidderId] < bid.amount) {
      return false;
    }
    return this.isBidSourceAllowed(bid.bidderId, bid.amount, bid.source);
  }

  private finalizeOpenAuction(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    currentTick: number,
  ): void {
    const [winningBid] = this.getRankedValidBids(world, event, asset);
    if (!winningBid) {
      this.resolveUnsoldAsset(world, event, asset, currentTick);
      return;
    }

    if (this.requiresPendingConfirmation(world, winningBid)) {
      asset.state = 'pending_confirmation';
      asset.pendingWinnerId = winningBid.bidderId;
      asset.pendingConfirmUntilTick = currentTick + PENDING_CONFIRMATION_DURATION;
      asset.currentHighestBid = winningBid.amount;
      asset.currentHighestBidderId = winningBid.bidderId;
      asset.auctionEndTick = null;
      return;
    }

    if (!this.finalizeAssetAuction(world, event, asset, winningBid)) {
      this.resolveUnsoldAsset(world, event, asset, currentTick);
    }
  }

  private expirePendingConfirmation(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    currentTick: number,
  ): void {
    const excludedBidderIds = new Set<number>();
    if (asset.pendingWinnerId !== undefined) {
      excludedBidderIds.add(asset.pendingWinnerId);
    }

    const [fallbackBid] = this.getRankedValidBids(world, event, asset, excludedBidderIds);
    asset.pendingWinnerId = undefined;
    asset.pendingConfirmUntilTick = undefined;

    if (fallbackBid && this.finalizeAssetAuction(world, event, asset, fallbackBid)) {
      return;
    }

    this.resolveUnsoldAsset(world, event, asset, currentTick);
  }

  private finalizeAssetAuction(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    winningBid: AuctionBid,
  ): boolean {
    if (!this.isBidStillValid(world, event, asset, winningBid)) {
      return false;
    }

    world.companies.cash[winningBid.bidderId] -= winningBid.amount;
    event.estateCash += winningBid.amount;

    if (asset.assetType === 'building' && asset.buildingId !== undefined) {
      this.transferBuildingToWinner(world, asset.buildingId, event.companyId, winningBid.bidderId);
    } else if (asset.assetType === 'inventory' && asset.goodsId !== undefined) {
      this.transferInventoryToWinner(world, event.companyId, winningBid.bidderId, asset.goodsId, asset.quantity);
    }

    asset.state = 'sold';
    asset.currentHighestBid = winningBid.amount;
    asset.currentHighestBidderId = winningBid.bidderId;
    asset.pendingWinnerId = undefined;
    asset.pendingConfirmUntilTick = undefined;
    asset.auctionEndTick = null;
    return true;
  }

  private transferBuildingToWinner(
    world: GameWorld,
    buildingId: number,
    sellerId: number,
    buyerId: number,
  ): void {
    const previousOwner = world.buildings.owners[buildingId];
    world.buildings.owners[buildingId] = buyerId;
    world.buildings.isActive[buildingId] = 1;

    if (previousOwner === buyerId) {
      return;
    }

    if (previousOwner === sellerId && world.companies.buildingCounts[sellerId] > 0) {
      world.companies.buildingCounts[sellerId] -= 1;
    }
    world.companies.buildingCounts[buyerId] += 1;
  }

  private transferInventoryToWinner(
    world: GameWorld,
    sellerId: number,
    buyerId: number,
    goodsId: number,
    quantity: number,
  ): void {
    const sellerIndex = sellerId * GOODS_COUNT + goodsId;
    const buyerIndex = buyerId * GOODS_COUNT + goodsId;
    const transferableQuantity = Math.min(quantity, world.companies.inventories[sellerIndex]);

    world.companies.inventories[sellerIndex] -= transferableQuantity;
    world.companies.inventories[buyerIndex] += transferableQuantity;
  }

  private resolveUnsoldAsset(
    world: GameWorld,
    event: BankruptcyEvent,
    asset: BankruptcyAuctionAsset,
    currentTick: number,
  ): void {
    asset.pendingWinnerId = undefined;
    asset.pendingConfirmUntilTick = undefined;

    if (asset.assetType === 'building') {
      if (asset.discountedRound < 1) {
        asset.discountedRound += 1;
        asset.reservePrice = Math.max(1, Math.floor(asset.reservePrice * BUILDING_RELIST_DISCOUNT));
        asset.state = 'open';
        asset.auctionEndTick = currentTick + RELIST_AUCTION_DURATION;
        asset.currentHighestBid = 0;
        asset.currentHighestBidderId = null;
        asset.bids = [];
        return;
      }

      asset.state = 'destroyed';
      asset.auctionEndTick = null;
      if (asset.buildingId !== undefined) {
        world.buildings.isActive[asset.buildingId] = 0;
      }
      return;
    }

    if (asset.goodsId !== undefined) {
      const inventoryIndex = event.companyId * GOODS_COUNT + asset.goodsId;
      const salvageQuantity = Math.min(asset.quantity, world.companies.inventories[inventoryIndex]);
      world.companies.inventories[inventoryIndex] -= salvageQuantity;
      event.estateCash += Math.max(1, Math.floor(asset.reservePrice * 0.5));
    }
    asset.state = 'unsold';
    asset.auctionEndTick = null;
    asset.currentHighestBid = 0;
    asset.currentHighestBidderId = null;
  }

  private areEventAssetsResolved(event: BankruptcyEvent): boolean {
    return event.assetIds.every((assetId) => {
      const asset = this.assets.get(assetId);
      return asset !== undefined
        && (asset.state === 'sold' || asset.state === 'unsold' || asset.state === 'destroyed');
    });
  }

  private settleEvent(world: GameWorld, event: BankruptcyEvent, currentTick: number): void {
    if (event.status !== 'auction_open') {
      return;
    }

    event.status = 'settlement_in_progress';

    const companyId = event.companyId;
    const remainingLiabilities = Math.max(0, world.companies.totalLiabilities[companyId] ?? 0);
    const estateValue = Math.max(0, event.estateCash - event.settlementCosts);
    const paidDebt = Math.min(estateValue, remainingLiabilities);
    const residualCash = Math.max(0, estateValue - paidDebt);

    world.companies.totalLiabilities[companyId] = Math.max(0, remainingLiabilities - paidDebt);
    world.companies.cash[companyId] = 0;
    world.companies.totalAssets[companyId] = 0;

    haltStock(companyId);
    delistStock(world, companyId, residualCash);
    event.delisted = true;
    event.status = 'restructure_cooldown';
    event.restructureAvailableTick = currentTick + RESTRUCTURE_COOLDOWN_DURATION;
    event.expiresTick = event.restructureAvailableTick;
  }

  private restructureCompany(world: GameWorld, event: BankruptcyEvent, currentTick: number): void {
    const companyId = event.companyId;
    const restartCash = RESTRUCTURE_RESTART_CASH;

    world.companies.cash[companyId] = restartCash;
    world.companies.totalAssets[companyId] = restartCash;
    world.companies.totalLiabilities[companyId] = 0;

    addBuilding(world, companyId, BuildingId.IRON_MINE, 0);

    event.status = 'restructured';
    event.expiresTick = currentTick;
  }

  private requiresPendingConfirmation(world: GameWorld, winningBid: AuctionBid): boolean {
    return winningBid.source === 'strategy'
      && (winningBid.bidderId === 0 || world.companies.isPlayer[winningBid.bidderId] === true);
  }
}

export const bankruptcyResolution = new BankruptcyResolutionManager();

export function resetBankruptcyResolution(): void {
  bankruptcyResolution.reset();
}
