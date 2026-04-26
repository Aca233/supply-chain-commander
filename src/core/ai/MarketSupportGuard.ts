export type MarketSupportKind = 'zeroSupply' | 'coldGoods';

export interface MarketSupportSignal {
  kind: MarketSupportKind;
  goodsId: number;
  tick: number;
  shortageDetected: boolean;
  hasDemand: boolean;
  hasActiveProducer: boolean;
  hasInFlightCapacity: boolean;
  requiredStreak: number;
  cooldownTicks: number;
}

export interface MarketSupportGuardState {
  shortageStreaks: Map<string, number>;
  lastTriggeredTick: Map<string, number>;
}

function guardKey(kind: MarketSupportKind, goodsId: number): string {
  return `${kind}:${goodsId}`;
}

export function createMarketSupportGuardState(): MarketSupportGuardState {
  return {
    shortageStreaks: new Map(),
    lastTriggeredTick: new Map(),
  };
}

export function shouldTriggerMarketSupport(
  state: MarketSupportGuardState,
  signal: MarketSupportSignal,
): boolean {
  const key = guardKey(signal.kind, signal.goodsId);

  if (
    !signal.shortageDetected ||
    !signal.hasDemand ||
    signal.hasActiveProducer ||
    signal.hasInFlightCapacity
  ) {
    state.shortageStreaks.delete(key);
    return false;
  }

  const nextStreak = (state.shortageStreaks.get(key) ?? 0) + 1;
  state.shortageStreaks.set(key, nextStreak);

  const lastTriggered = state.lastTriggeredTick.get(key) ?? -Infinity;
  const cooldownReady = signal.tick - lastTriggered >= signal.cooldownTicks;

  return nextStreak >= signal.requiredStreak && cooldownReady;
}

export function markMarketSupportTriggered(
  state: MarketSupportGuardState,
  kind: MarketSupportKind,
  goodsId: number,
  tick: number,
): void {
  const key = guardKey(kind, goodsId);
  state.lastTriggeredTick.set(key, tick);
  state.shortageStreaks.set(key, 0);
}
