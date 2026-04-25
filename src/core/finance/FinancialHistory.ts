export interface ProfitHistoryPointLike {
  tick: number;
  profit: number;
}

export function sumProfitWithinTickWindow<T extends ProfitHistoryPointLike>(
  history: T[],
  currentTick: number,
  windowTicks: number,
): number {
  const minTickExclusive = currentTick - windowTicks;

  return history.reduce((total, point) => {
    if (point.tick > minTickExclusive && point.tick <= currentTick) {
      return total + point.profit;
    }

    return total;
  }, 0);
}

export function calculateCumulativeDelta(
  currentTotal: number,
  previousTotal: number,
): { currentTotal: number; delta: number } {
  return {
    currentTotal,
    delta: currentTotal >= previousTotal ? currentTotal - previousTotal : currentTotal,
  };
}
