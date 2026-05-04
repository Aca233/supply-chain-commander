import { BUILDINGS_BY_ID } from '@/data/buildings';
import { TICKS_PER_DAY } from '@/core/constants';
import { calculateStorageCostPerTick } from '@/core/economy/WarehouseSystem';

import { GameWorld } from '../world/GameWorld';

export interface OperatingCostBreakdown {
  maintenance: number;
  labor: number;
  energy: number;
  /** 仓储费用（基于库存占用量和仓库配置） */
  storage: number;
  total: number;
  cashExpense: number;
  nonCashExpense: number;
}

const DEFAULT_TICKS_PER_DAY = TICKS_PER_DAY;

export function calculateCompanyOperatingCostPerTick(
  world: GameWorld,
  companyId: number,
  ticksPerDay: number = DEFAULT_TICKS_PER_DAY,
): OperatingCostBreakdown {
  let maintenance = 0;
  let labor = 0;
  let energy = 0;

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    if (world.buildings.owners[buildingId] !== companyId) continue;
    if (world.buildings.isActive[buildingId] !== 1) continue;

    const buildingDef = BUILDINGS_BY_ID.get(world.buildings.types[buildingId]);
    if (!buildingDef) continue;

    maintenance += buildingDef.maintenanceCost / ticksPerDay;

    // 工资由 LaborSystem 的 accrual/payroll 路径结算，避免在运营成本中重复扣款。
    labor += 0;

    // Energy is paid through electricity goods in recipe inputs, not a separate cash drain.
    energy += 0;
  }

  // 仓储费用：基于库存占用量和仓库配置
  const storageCost = calculateStorageCostPerTick(world, companyId, ticksPerDay);
  const storage = storageCost.total;

  const cashExpense = maintenance + labor + energy + storage;

  return {
    maintenance,
    labor,
    energy,
    storage,
    total: cashExpense,
    cashExpense,
    nonCashExpense: 0,
  };
}

export function applyOperatingCosts(
  world: GameWorld,
  ticksPerDay: number = DEFAULT_TICKS_PER_DAY,
): OperatingCostBreakdown[] {
  const breakdowns: OperatingCostBreakdown[] = [];

  for (let companyId = 0; companyId < world.companies.count; companyId++) {
    const breakdown = calculateCompanyOperatingCostPerTick(world, companyId, ticksPerDay);
    breakdowns.push(breakdown);

    if (breakdown.cashExpense !== 0) {
      world.companies.cash[companyId] -= breakdown.cashExpense;
    }

  }

  return breakdowns;
}
