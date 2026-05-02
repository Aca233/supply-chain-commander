import { GameWorld } from '../world/GameWorld';

function getTrackedGoodsCount(world: GameWorld): number {
  return world.goods.count > 0 ? world.goods.count : world.goods.demands.length;
}

export function syncDemandPressureFromDemand(world: GameWorld): void {
  const count = getTrackedGoodsCount(world);
  for (let i = 0; i < count; i++) {
    world.goods.demandPressure[i] = world.goods.demands[i];
  }
  world.goods.demandPressureTick = world.tick;
}

function ensureDemandPressureForCurrentTick(world: GameWorld): void {
  if (world.goods.demandPressureTick === world.tick) return;
  syncDemandPressureFromDemand(world);
}

export function setDemandPressure(world: GameWorld, goodsId: number, quantity: number): void {
  world.goods.demandPressure[goodsId] = Math.max(0, quantity);
  world.goods.demandPressureTick = world.tick;
}

export function getDemandPressure(world: GameWorld, goodsId: number): number {
  if (world.goods.demandPressureTick !== world.tick) {
    return world.goods.demands[goodsId];
  }

  return world.goods.demandPressure[goodsId];
}

/**
 * Records newly produced market supply.
 *
 * `world.goods.supplies` is used by the price engine as recent available supply pressure.
 * It should rise when goods enter circulation and fall when they are actually consumed
 * or locked away for internal use.
 */
export function recordMarketSupply(world: GameWorld, goodsId: number, quantity: number): void {
  if (quantity <= 0) return;
  world.goods.supplies[goodsId] += quantity;
}

/**
 * Removes supply pressure after goods leave the tradable market pool.
 *
 * Examples:
 * - households consume final goods
 * - buildings pull inputs into internal buffers
 * - construction consumes materials
 */
export function drainMarketSupply(world: GameWorld, goodsId: number, quantity: number): void {
  if (quantity <= 0) return;
  world.goods.supplies[goodsId] = Math.max(0, world.goods.supplies[goodsId] - quantity);
}

/**
 * Records demand that has been satisfied by an actual purchase or service delivery.
 *
 * Satisfied demand is removed from the current unmet-demand pressure so prices react
 * to shortages that remain after trades, rather than double counting all fulfilled
 * sales as both demand and supply.
 */
export function recordSatisfiedDemand(world: GameWorld, goodsId: number, quantity: number): void {
  if (quantity <= 0) return;
  ensureDemandPressureForCurrentTick(world);
  world.goods.demandPressure[goodsId] = Math.max(0, world.goods.demandPressure[goodsId] - quantity);
}

/**
 * Records final consumption: households buy and consume goods or services.
 */
export function recordFinalConsumption(world: GameWorld, goodsId: number, quantity: number): void {
  drainMarketSupply(world, goodsId, quantity);
  recordSatisfiedDemand(world, goodsId, quantity);
}
