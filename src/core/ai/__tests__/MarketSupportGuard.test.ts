import { describe, expect, it } from 'vitest';

import {
  createMarketSupportGuardState,
  markMarketSupportTriggered,
  shouldTriggerMarketSupport,
} from '../MarketSupportGuard';

describe('MarketSupportGuard', () => {
  it('requires repeated shortage observations before support is allowed', () => {
    const state = createMarketSupportGuardState();

    expect(
      shouldTriggerMarketSupport(state, {
        kind: 'zeroSupply',
        goodsId: 7,
        tick: 15,
        shortageDetected: true,
        hasDemand: true,
        hasActiveProducer: false,
        hasInFlightCapacity: false,
        requiredStreak: 2,
        cooldownTicks: 90,
      }),
    ).toBe(false);

    expect(
      shouldTriggerMarketSupport(state, {
        kind: 'zeroSupply',
        goodsId: 7,
        tick: 30,
        shortageDetected: true,
        hasDemand: true,
        hasActiveProducer: false,
        hasInFlightCapacity: false,
        requiredStreak: 2,
        cooldownTicks: 90,
      }),
    ).toBe(true);
  });

  it('blocks repeated interventions during cooldown and resets after recovery', () => {
    const state = createMarketSupportGuardState();

    const baseSignal = {
      kind: 'coldGoods' as const,
      goodsId: 11,
      shortageDetected: true,
      hasDemand: true,
      hasActiveProducer: false,
      hasInFlightCapacity: false,
      requiredStreak: 1,
      cooldownTicks: 120,
    };

    expect(shouldTriggerMarketSupport(state, { ...baseSignal, tick: 30 })).toBe(true);
    markMarketSupportTriggered(state, 'coldGoods', 11, 30);

    expect(shouldTriggerMarketSupport(state, { ...baseSignal, tick: 60 })).toBe(false);

    expect(
      shouldTriggerMarketSupport(state, {
        ...baseSignal,
        tick: 90,
        shortageDetected: false,
      }),
    ).toBe(false);

    expect(shouldTriggerMarketSupport(state, { ...baseSignal, tick: 180 })).toBe(true);
  });
});
