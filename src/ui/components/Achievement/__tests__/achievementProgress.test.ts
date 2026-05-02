import { describe, expect, it } from 'vitest';

import { evaluateAchievementProgress } from '../achievementProgress';

describe('evaluateAchievementProgress', () => {
  it('treats net worth achievements as progress beyond the starting baseline', () => {
    const initial = evaluateAchievementProgress({
      achievementId: 'first_million',
      metric: 'netWorth',
      conditionType: 'threshold',
      target: 1_000_000,
      currentValue: 20_000_000,
    });

    expect(initial.unlocked).toBe(false);
    expect(initial.currentValue).toBe(0);

    const crossed = evaluateAchievementProgress({
      achievementId: 'first_million',
      metric: 'netWorth',
      conditionType: 'threshold',
      target: 1_000_000,
      currentValue: 21_000_000,
      existingProgress: initial,
    });

    expect(crossed.unlocked).toBe(true);
    expect(crossed.currentValue).toBe(1_000_000);
  });

  it('requires debt-free achievements to transition from debt back to zero loans', () => {
    const initial = evaluateAchievementProgress({
      achievementId: 'debt_free',
      metric: 'debtFree',
      conditionType: 'milestone',
      target: 1,
      currentValue: 1,
    });

    expect(initial.unlocked).toBe(false);

    const indebted = evaluateAchievementProgress({
      achievementId: 'debt_free',
      metric: 'debtFree',
      conditionType: 'milestone',
      target: 1,
      currentValue: 0,
      existingProgress: initial,
    });

    expect(indebted.unlocked).toBe(false);

    const cleared = evaluateAchievementProgress({
      achievementId: 'debt_free',
      metric: 'debtFree',
      conditionType: 'milestone',
      target: 1,
      currentValue: 1,
      existingProgress: indebted,
    });

    expect(cleared.unlocked).toBe(true);
  });

  it('ignores starter inventory when tracking diversified production', () => {
    const initial = evaluateAchievementProgress({
      achievementId: 'diversified',
      metric: 'uniqueProducts',
      conditionType: 'threshold',
      target: 5,
      currentValue: 6,
    });

    expect(initial.unlocked).toBe(false);
    expect(initial.currentValue).toBe(0);

    const crossed = evaluateAchievementProgress({
      achievementId: 'diversified',
      metric: 'uniqueProducts',
      conditionType: 'threshold',
      target: 5,
      currentValue: 11,
      existingProgress: initial,
    });

    expect(crossed.unlocked).toBe(true);
    expect(crossed.currentValue).toBe(5);
  });
});
