export type AchievementConditionType = 'counter' | 'threshold' | 'milestone' | 'compound';

export interface EvaluatedAchievementProgress {
  achievementId: string;
  currentValue: number;
  unlocked: boolean;
  unlockedAt?: number;
  notified?: boolean;
  baselineValue?: number;
}

export interface EvaluateAchievementProgressInput {
  achievementId: string;
  metric: string;
  conditionType: AchievementConditionType;
  target: number;
  currentValue: number;
  existingProgress?: EvaluatedAchievementProgress;
  now?: number;
}

const BASELINE_RELATIVE_METRICS = new Set([
  'totalFacilities',
  'totalProduced',
  'uniqueProducts',
  'netWorth',
  'stockHoldings',
  'acquisitions',
]);

function normalizeComparableValue(metric: string, currentValue: number, baselineValue: number): number {
  if (BASELINE_RELATIVE_METRICS.has(metric)) {
    return Math.max(0, currentValue - baselineValue);
  }

  return currentValue;
}

export function evaluateAchievementProgress({
  achievementId,
  metric,
  conditionType,
  target,
  currentValue,
  existingProgress,
  now = Date.now(),
}: EvaluateAchievementProgressInput): EvaluatedAchievementProgress {
  const baselineValue = existingProgress?.baselineValue ?? (BASELINE_RELATIVE_METRICS.has(metric) ? currentValue : 0);
  const comparableValue = normalizeComparableValue(metric, currentValue, baselineValue);

  if (!existingProgress) {
    return {
      achievementId,
      currentValue: comparableValue,
      unlocked: false,
      baselineValue,
    };
  }

  if (existingProgress.unlocked) {
    return {
      ...existingProgress,
      currentValue: comparableValue,
      baselineValue,
    };
  }

  let achieved = false;
  switch (conditionType) {
    case 'threshold':
    case 'milestone':
    case 'counter':
    case 'compound':
      achieved = existingProgress.currentValue < target && comparableValue >= target;
      break;
  }

  return {
    ...existingProgress,
    currentValue: comparableValue,
    baselineValue,
    unlocked: achieved,
    unlockedAt: achieved ? now : existingProgress.unlockedAt,
    notified: achieved ? false : existingProgress.notified,
  };
}
