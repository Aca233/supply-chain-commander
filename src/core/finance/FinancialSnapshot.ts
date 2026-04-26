import { GOODS_COUNT, TICKS_PER_DAY } from '@/core/constants';
import { GameWorld } from '@/core/world/GameWorld';

const BUILDING_BOOK_VALUE = 500_000;

export interface FinancialHistoryPointLike {
  tick: number;
  revenue: number;
  cost: number;
  profit: number;
  cash: number;
}

export interface CompanyAssetBreakdown {
  cash: number;
  inventoryValue: number;
  buildingValue: number;
  operatingAssets: number;
  totalAssets: number;
  liabilities: number;
  netWorth: number;
}

export interface PlayerFinancialSnapshot extends CompanyAssetBreakdown {
  dailyRevenue: number;
  dailyCost: number;
  dailyProfit: number;
  cumulativeRevenue: number;
  cumulativeCost: number;
  cumulativeProfit: number;
}

export function createEmptyPlayerFinancialSnapshot(): PlayerFinancialSnapshot {
  return {
    cash: 0,
    inventoryValue: 0,
    buildingValue: 0,
    operatingAssets: 0,
    totalAssets: 0,
    liabilities: 0,
    netWorth: 0,
    dailyRevenue: 0,
    dailyCost: 0,
    dailyProfit: 0,
    cumulativeRevenue: 0,
    cumulativeCost: 0,
    cumulativeProfit: 0,
  };
}

function safeNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function sumHistoryWindow<T extends FinancialHistoryPointLike>(
  history: T[],
  currentTick: number,
  windowTicks: number,
  field: 'revenue' | 'cost' | 'profit',
): number {
  const minTickExclusive = currentTick - windowTicks;

  return history.reduce((total, point) => {
    if (point.tick > minTickExclusive && point.tick <= currentTick) {
      return total + safeNumber(point[field]);
    }

    return total;
  }, 0);
}

export function calculateCompanyAssetBreakdown(
  world: GameWorld | null | undefined,
  companyId: number,
): CompanyAssetBreakdown {
  if (!world) {
    return {
      cash: 0,
      inventoryValue: 0,
      buildingValue: 0,
      operatingAssets: 0,
      totalAssets: 0,
      liabilities: 0,
      netWorth: 0,
    };
  }

  const cash = safeNumber(world.companies.cash[companyId]);
  const liabilities = safeNumber(world.companies.totalLiabilities[companyId]);

  let inventoryValue = 0;
  for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
    const inventoryIndex = companyId * GOODS_COUNT + goodsId;
    inventoryValue +=
      safeNumber(world.companies.inventories[inventoryIndex]) *
      safeNumber(world.goods.prices[goodsId]);
  }

  let buildingValue = 0;
  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    if (world.buildings.owners[buildingId] === companyId) {
      buildingValue += BUILDING_BOOK_VALUE;
    }
  }

  const operatingAssets = inventoryValue + buildingValue;
  const totalAssets = cash + operatingAssets;

  return {
    cash,
    inventoryValue,
    buildingValue,
    operatingAssets,
    totalAssets,
    liabilities,
    netWorth: totalAssets - liabilities,
  };
}

export function calculatePlayerFinancialSnapshot({
  world,
  currentTick,
  financialHistory,
  companyId = 0,
}: {
  world: GameWorld | null | undefined;
  currentTick: number;
  financialHistory: FinancialHistoryPointLike[];
  companyId?: number;
}): PlayerFinancialSnapshot {
  if (!world) {
    return createEmptyPlayerFinancialSnapshot();
  }

  const assets = calculateCompanyAssetBreakdown(world, companyId);
  const cumulativeRevenue = financialHistory.reduce((total, point) => total + safeNumber(point.revenue), 0);
  const cumulativeCost = financialHistory.reduce((total, point) => total + safeNumber(point.cost), 0);

  return {
    ...assets,
    dailyRevenue: sumHistoryWindow(financialHistory, currentTick, TICKS_PER_DAY, 'revenue'),
    dailyCost: sumHistoryWindow(financialHistory, currentTick, TICKS_PER_DAY, 'cost'),
    dailyProfit: sumHistoryWindow(financialHistory, currentTick, TICKS_PER_DAY, 'profit'),
    cumulativeRevenue,
    cumulativeCost,
    cumulativeProfit: cumulativeRevenue - cumulativeCost,
  };
}
