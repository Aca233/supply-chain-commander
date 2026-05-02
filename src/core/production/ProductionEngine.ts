/**
 * 生产引擎（Vic3 风格）
 * 批量处理所有建筑的生产计算
 * 配方完全由建筑选定 method 的 delta 求和决定
 */

import { GameWorld, addInventory } from '../world/GameWorld';
import { ALL_BUILDINGS, BUILDINGS_BY_ID } from '@/data/buildings';
import { drainMarketSupply, recordMarketSupply } from '../economy/MarketStats';
import {
  MAX_INPUTS,
  MAX_OUTPUTS,
  MAX_SLOTS,
  GOODS_COUNT,
  TICKS_PER_DAY,
} from '../constants';
import {
  ComputedRecipe,
  getBuildingDefaultMethods,
  getBuildingSlotCount,
  getRecipeForBuilding,
} from './ProductionMethods';
import { determineProductionQuality, QualityGrade, QUALITY_INFO } from '../economy/QualitySystem';
import {
  applyAutomaticEfficiencySafely,
  AUTO_PRODUCTION_EFFICIENCY_MIN,
  canAutomaticSystemsAdjustEfficiency,
} from './ProductionControl';
import {
  calculateWorkforceCoverage,
  setBuildingLaborRecipeProvider,
  type WorkforceCoverageResult,
} from '@/core/labor/LaborSystem';

// 建筑实例的配方缓存（按 buildingId 索引）
const recipeCache: Map<number, ComputedRecipe> = new Map();

export function invalidateRecipeCache(buildingId?: number): void {
  if (buildingId === undefined) {
    recipeCache.clear();
  } else {
    recipeCache.delete(buildingId);
  }
}

function getBuildingRecipe(world: GameWorld, buildingId: number): ComputedRecipe {
  let recipe = recipeCache.get(buildingId);
  if (!recipe) {
    const buildingTypeId = world.buildings.types[buildingId];
    const slotCount = getBuildingSlotCount(buildingTypeId);
    const slotOffset = buildingId * MAX_SLOTS;
    const slotMethods: number[] = [];
    for (let i = 0; i < slotCount; i++) {
      slotMethods.push(world.buildings.slotMethods[slotOffset + i] ?? 0);
    }
    recipe = getRecipeForBuilding(buildingTypeId, slotMethods);
    recipeCache.set(buildingId, recipe);
  }
  return recipe;
}

export function initProductionCache(): void {
  recipeCache.clear();
}

/** AI/UI 调用：按 buildingId 拿当前实际配方（带缓存） */
export function getBuildingRecipeFromInstance(world: GameWorld, buildingId: number): ComputedRecipe {
  return getBuildingRecipe(world, buildingId);
}

setBuildingLaborRecipeProvider(getBuildingRecipeFromInstance);

// 兼容旧版调用
export const initRecipeCache = initProductionCache;

export function getBuildingSelectedMethods(world: GameWorld, buildingId: number): number[] {
  const b = world.buildings;
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const methodId = b.slotMethods[slotOffset + i];
    if (methodId > 0) {
      slotMethods.push(methodId);
    }
  }
  return slotMethods;
}

export function setBuildingMethod(
  world: GameWorld,
  buildingId: number,
  slotIndex: number,
  methodId: number,
): boolean {
  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return false;
  const slotOffset = buildingId * MAX_SLOTS;
  world.buildings.slotMethods[slotOffset + slotIndex] = methodId;
  invalidateRecipeCache(buildingId);
  return true;
}

export function getBuildingWorkforceCoverage(
  world: GameWorld,
  buildingId: number,
): WorkforceCoverageResult {
  const recipe = getBuildingRecipe(world, buildingId);
  const utilization = world.buildings.efficiencies[buildingId] || 0;
  return calculateWorkforceCoverage(world, buildingId, recipe.workforceRequired, utilization);
}

function processBuildingProduction(
  world: GameWorld,
  buildingId: number,
): { produced: boolean; workforceCoverage: number; laborShortage: boolean; qualityBonus: number } {
  const b = world.buildings;
  const result = { produced: false, workforceCoverage: 1, laborShortage: false, qualityBonus: 0 };

  if (!b.isActive[buildingId]) return result;

  const recipe = getBuildingRecipe(world, buildingId);
  if (recipe.outputs.length === 0 && recipe.inputs.length === 0) {
    return result;
  }

  const efficiency = b.efficiencies[buildingId];
  const owner = b.owners[buildingId];

  // 本 tick 产出率（无 modifier 乘法）
  const tickOutput = efficiency / recipe.ticksRequired;

  const workforceCoverage = getBuildingWorkforceCoverage(world, buildingId);
  result.workforceCoverage = workforceCoverage.coverage;
  result.laborShortage = workforceCoverage.coverage < 1;

  if (workforceCoverage.coverage <= 0) {
    return result;
  }

  const actualOutput = tickOutput * workforceCoverage.coverage;

  // 输入检查
  const inputOffset = buildingId * MAX_INPUTS;
  for (let j = 0; j < recipe.inputs.length; j++) {
    const required = recipe.inputs[j].amount * actualOutput;
    if (b.inputBuffers[inputOffset + j] < required) {
      return result;
    }
  }

  // 消耗输入
  for (let j = 0; j < recipe.inputs.length; j++) {
    b.inputBuffers[inputOffset + j] -= recipe.inputs[j].amount * actualOutput;
  }

  result.qualityBonus = 0;

  // 产出
  const outputOffset = buildingId * MAX_OUTPUTS;
  for (let j = 0; j < recipe.outputs.length; j++) {
    const goodsId = recipe.outputs[j].goodsId;
    const amount = recipe.outputs[j].amount * actualOutput;
    b.outputBuffers[outputOffset + j] += amount;
    addInventory(world, owner, goodsId, amount);
    recordMarketSupply(world, goodsId, amount);
    updateInventoryQuality(world, owner, goodsId, amount, result.qualityBonus);
  }

  b.progress[buildingId] = (b.progress[buildingId] + actualOutput) % 1;
  result.produced = true;
  return result;
}

const OVERSUPPLY_CONFIG = {
  threshold: 2.0,
  zeroDemandSupplyFloor: 50,
  zeroDemandInventoryCoverage: 4.0,
  inventoryCoverageWindow: 30,
  positiveDemandInventoryCoverage: 3.0,
  efficiencyReduction: 0.10,
  minEfficiency: AUTO_PRODUCTION_EFFICIENCY_MIN,
  recoveryRate: 0.05,
  structuralSuspendCooldownTicks: 32,
  structuralSuspendEfficiencyThreshold: 0.2,
  fullSuspendSeverityThreshold: 12,
  fullSuspendMaxActiveProducers: 2,
  reactivationEfficiency: 0.3,
  reactivationDemandPressureFloor: 15,
  reactivationSupplyCoverage: 0.85,
  reactivationInventoryCoverage: 1.5,
};

const OVERSUPPLY_EPSILON = 1e-4;

function getOversupplyReductionRate(severity: number): number {
  if (severity >= 20) return 0.4;
  if (severity >= 10) return 0.3;
  if (severity >= 5) return 0.2;
  return OVERSUPPLY_CONFIG.efficiencyReduction;
}

function clearOversupplySuspension(world: GameWorld, buildingId: number): void {
  world.buildings.oversupplySuspendedGoods[buildingId] = -1;
  world.buildings.oversupplySuspendedUntilTick[buildingId] = 0;
}

function markOversupplySuspension(world: GameWorld, buildingId: number, goodsId: number): void {
  world.buildings.oversupplySuspendedGoods[buildingId] = goodsId;
  world.buildings.oversupplySuspendedUntilTick[buildingId] =
    world.tick + OVERSUPPLY_CONFIG.structuralSuspendCooldownTicks;
}

function shouldReactivateOversupplySuspendedGoods(
  world: GameWorld,
  goodsId: number,
  totalInventoryByGoods: Float64Array,
): boolean {
  if (goodsId < 0 || goodsId >= GOODS_COUNT) {
    return false;
  }

  const supply = world.goods.supplies[goodsId] || 0;
  const demand = world.goods.demands[goodsId] || 0;
  const demandPressure = world.goods.demandPressureTick === world.tick
    ? world.goods.demandPressure[goodsId] || 0
    : world.goods.demandPressure[goodsId] || 0;
  const inventoryBacklog = totalInventoryByGoods[goodsId] || 0;

  if (demandPressure >= Math.max(
    OVERSUPPLY_CONFIG.reactivationDemandPressureFloor,
    supply * 0.5,
  )) {
    return true;
  }

  if (demand <= 0.01) {
    return false;
  }

  return (
    supply < demand * OVERSUPPLY_CONFIG.reactivationSupplyCoverage &&
    inventoryBacklog < demand * OVERSUPPLY_CONFIG.inventoryCoverageWindow * OVERSUPPLY_CONFIG.reactivationInventoryCoverage
  );
}

function getStructuralActiveProducerTarget(
  severity: number,
  demand: number,
  activeProducerCount: number,
): number {
  if (activeProducerCount <= 0) {
    return 0;
  }

  if (demand <= 0.01) {
    return 0;
  }

  if (
    activeProducerCount <= OVERSUPPLY_CONFIG.fullSuspendMaxActiveProducers &&
    severity >= OVERSUPPLY_CONFIG.fullSuspendSeverityThreshold
  ) {
    return 0;
  }

  return Math.max(1, Math.ceil(activeProducerCount / Math.max(1, severity)));
}

export interface OversupplyAdjustmentResult {
  oversuppliedGoodsCount: number;
  reducedBuildingsCount: number;
  recoveredBuildingsCount: number;
  suspendedBuildingsCount: number;
  reactivatedBuildingsCount: number;
}

export function adjustOversupplyProduction(world: GameWorld): OversupplyAdjustmentResult {
  const result: OversupplyAdjustmentResult = {
    oversuppliedGoodsCount: 0,
    reducedBuildingsCount: 0,
    recoveredBuildingsCount: 0,
    suspendedBuildingsCount: 0,
    reactivatedBuildingsCount: 0,
  };
  const g = world.goods;
  const b = world.buildings;
  const c = world.companies;
  const totalInventoryByGoods = new Float64Array(GOODS_COUNT);
  const oversupplySeverityByGoods = new Float32Array(GOODS_COUNT);
  const activeProducerCountByGoods = new Uint16Array(GOODS_COUNT);
  const suspensionCandidatesByGoods: Map<number, number[]> = new Map();
  const suspendedBuildingsByGoods: Map<number, number[]> = new Map();

  for (let companyId = 0; companyId < c.count; companyId++) {
    const inventoryOffset = companyId * GOODS_COUNT;
    for (let goodsId = 0; goodsId < GOODS_COUNT; goodsId++) {
      totalInventoryByGoods[goodsId] += c.inventories[inventoryOffset + goodsId] || 0;
    }
  }

  const oversuppliedGoods = new Set<number>();
  for (let i = 0; i < GOODS_COUNT; i++) {
    const supply = g.supplies[i];
    const demand = g.demands[i];
    const inventoryBacklog = totalInventoryByGoods[i];
    const ratioOversupplied = demand > 0.01 && supply / demand > OVERSUPPLY_CONFIG.threshold;
    const positiveDemandBacklogOversupplied =
      demand > 0.01 &&
      inventoryBacklog >=
        demand * OVERSUPPLY_CONFIG.inventoryCoverageWindow * OVERSUPPLY_CONFIG.positiveDemandInventoryCoverage;
    const zeroDemandBacklogOversupplied =
      demand <= 0.01 &&
      supply >= OVERSUPPLY_CONFIG.zeroDemandSupplyFloor &&
      inventoryBacklog >= supply * OVERSUPPLY_CONFIG.zeroDemandInventoryCoverage;

    if (ratioOversupplied || positiveDemandBacklogOversupplied || zeroDemandBacklogOversupplied) {
      oversuppliedGoods.add(i);
      if (ratioOversupplied) {
        const flowSeverity = supply / Math.max(demand, 1);
        const inventorySeverity = inventoryBacklog / Math.max(
          demand * OVERSUPPLY_CONFIG.inventoryCoverageWindow,
          1,
        );
        oversupplySeverityByGoods[i] = Math.max(
          OVERSUPPLY_CONFIG.threshold,
          flowSeverity,
          inventorySeverity,
        );
      } else if (positiveDemandBacklogOversupplied) {
        oversupplySeverityByGoods[i] = Math.max(
          OVERSUPPLY_CONFIG.threshold,
          inventoryBacklog / Math.max(
            demand * OVERSUPPLY_CONFIG.inventoryCoverageWindow,
            1,
          ),
        );
      } else {
        oversupplySeverityByGoods[i] = Math.max(
          OVERSUPPLY_CONFIG.threshold,
          inventoryBacklog / Math.max(supply, 1),
        );
      }
    }
  }
  result.oversuppliedGoodsCount = oversuppliedGoods.size;

  for (let i = 0; i < b.count; i++) {
    const suspendedGoodsId = b.oversupplySuspendedGoods[i];
    if (suspendedGoodsId < 0) {
      continue;
    }

    if (b.isActive[i]) {
      clearOversupplySuspension(world, i);
      continue;
    }

    const suspended = suspendedBuildingsByGoods.get(suspendedGoodsId) ?? [];
    suspended.push(i);
    suspendedBuildingsByGoods.set(suspendedGoodsId, suspended);
  }

  for (const [goodsId, buildingIds] of suspendedBuildingsByGoods) {
    if (buildingIds.length === 0) {
      continue;
    }
    if (!shouldReactivateOversupplySuspendedGoods(world, goodsId, totalInventoryByGoods)) {
      continue;
    }

    for (const buildingId of buildingIds) {
      if (world.tick < b.oversupplySuspendedUntilTick[buildingId]) {
        continue;
      }

      b.isActive[buildingId] = 1;
      clearOversupplySuspension(world, buildingId);
      applyAutomaticEfficiencySafely(
        world,
        buildingId,
        Math.max(b.efficiencies[buildingId], OVERSUPPLY_CONFIG.reactivationEfficiency),
      );
      result.reactivatedBuildingsCount++;
      break;
    }
  }

  for (let i = 0; i < b.count; i++) {
    if (!b.isActive[i]) continue;
    const recipe = getBuildingRecipe(world, i);
    if (recipe.outputs.length === 0) continue;

    let producesOversupplied = false;
    let maxOversupplySeverity = 0;
    let structuralOversupplyGoodsId = -1;
    let allOutputsOversupplied = true;
    for (const o of recipe.outputs) {
      activeProducerCountByGoods[o.goodsId]++;
      if (oversuppliedGoods.has(o.goodsId)) {
        producesOversupplied = true;
        if (oversupplySeverityByGoods[o.goodsId] >= maxOversupplySeverity) {
          maxOversupplySeverity = oversupplySeverityByGoods[o.goodsId];
          structuralOversupplyGoodsId = o.goodsId;
        }
      } else {
        allOutputsOversupplied = false;
      }
    }

    const currentEfficiency = b.efficiencies[i];
    const baseEfficiency = 1.0;

    if (producesOversupplied) {
      if (currentEfficiency > OVERSUPPLY_CONFIG.minEfficiency) {
        const reductionRate = getOversupplyReductionRate(maxOversupplySeverity);
        const newEfficiency = Math.max(
          OVERSUPPLY_CONFIG.minEfficiency,
          currentEfficiency * (1 - reductionRate),
        );
        if (applyAutomaticEfficiencySafely(world, i, newEfficiency)) {
          result.reducedBuildingsCount++;
        }
      }
    } else if (currentEfficiency < baseEfficiency) {
      const newEfficiency = Math.min(
        baseEfficiency,
        currentEfficiency * (1 + OVERSUPPLY_CONFIG.recoveryRate),
      );
      if (applyAutomaticEfficiencySafely(world, i, newEfficiency)) {
        result.recoveredBuildingsCount++;
      }
    }

    if (
      producesOversupplied &&
      allOutputsOversupplied &&
      structuralOversupplyGoodsId >= 0 &&
      currentEfficiency <= OVERSUPPLY_CONFIG.structuralSuspendEfficiencyThreshold + OVERSUPPLY_EPSILON &&
      canAutomaticSystemsAdjustEfficiency(world, i)
    ) {
      const candidates = suspensionCandidatesByGoods.get(structuralOversupplyGoodsId) ?? [];
      candidates.push(i);
      suspensionCandidatesByGoods.set(structuralOversupplyGoodsId, candidates);
    }
  }

  for (const [goodsId, candidates] of suspensionCandidatesByGoods) {
    if (candidates.length === 0) {
      continue;
    }

    const activeProducerCount = activeProducerCountByGoods[goodsId];
    const desiredActiveCount = getStructuralActiveProducerTarget(
      oversupplySeverityByGoods[goodsId],
      g.demands[goodsId],
      activeProducerCount,
    );
    let suspendNeeded = Math.min(
      candidates.length,
      Math.max(0, activeProducerCount - desiredActiveCount),
    );

    for (const buildingId of candidates) {
      if (suspendNeeded <= 0) {
        break;
      }
      if (!b.isActive[buildingId]) {
        continue;
      }

      b.isActive[buildingId] = 0;
      markOversupplySuspension(world, buildingId, goodsId);
      result.suspendedBuildingsCount++;
      suspendNeeded--;
    }
  }
  return result;
}

export interface ProductionResult {
  processedCount: number;
  producedCount: number;
  blockedCount: number;
  laborShortage: number;
  totalLaborCoverage: number;
  totalQualityBonus: number;
}

export function updateAllProduction(world: GameWorld): ProductionResult {
  const b = world.buildings;
  const result: ProductionResult = {
    processedCount: 0,
    producedCount: 0,
    blockedCount: 0,
    laborShortage: 0,
    totalLaborCoverage: 0,
    totalQualityBonus: 0,
  };

  if (world.tick % 8 === 0) {
    adjustOversupplyProduction(world);
  }

  for (let i = 0; i < b.count; i++) {
    result.processedCount++;
    const prodResult = processBuildingProduction(world, i);
    if (b.isActive[i]) {
      result.totalLaborCoverage += prodResult.workforceCoverage;
      if (prodResult.laborShortage) result.laborShortage++;
    }
    if (prodResult.produced) {
      result.producedCount++;
      result.totalQualityBonus += prodResult.qualityBonus;
    } else if (b.isActive[i]) {
      result.blockedCount++;
    }
  }

  return result;
}

function updateInventoryQuality(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  newAmount: number,
  qualityBonus: number,
): void {
  const idx = companyId * GOODS_COUNT + goodsId;
  const existingAmount = world.companies.inventories[idx] - newAmount;
  const existingQuality = world.companies.qualityScores[idx];
  const baseQuality = 0.5 + qualityBonus;
  const newQuality = determineProductionQuality(baseQuality);
  if (existingAmount > 0 && newAmount > 0) {
    const totalAmount = existingAmount + newAmount;
    world.companies.qualityScores[idx] =
      (existingQuality * existingAmount + newQuality * newAmount) / totalAmount;
  } else if (newAmount > 0) {
    world.companies.qualityScores[idx] = newQuality;
  }
}

export function getInventoryQualityName(_world: GameWorld, _companyId: number, _goodsId: number): string {
  return '标准';
}

export function getInventoryQualityPriceMultiplier(_world: GameWorld, _companyId: number, _goodsId: number): number {
  return 1.0;
}

/**
 * 计算建筑的理论日产能（按默认 method）
 */
export function calculateTheoreticalOutput(
  buildingTypeId: number,
  level: number,
): { goodsId: number; amount: number }[] {
  const recipe = getRecipeForBuilding(
    buildingTypeId,
    getBuildingDefaultMethods(buildingTypeId),
  );
  if (recipe.outputs.length === 0) return [];

  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  const efficiencyMultiplier = building
    ? building.efficiencyMultipliers[Math.min(level - 1, building.efficiencyMultipliers.length - 1)]
    : 1;

  return recipe.outputs.map((o) => ({
    goodsId: o.goodsId,
    amount: (o.amount / recipe.ticksRequired) * TICKS_PER_DAY * efficiencyMultiplier,
  }));
}

export function calculateDailyConsumption(
  buildingTypeId: number,
  efficiency: number = 1,
): { goodsId: number; amount: number }[] {
  const recipe = getRecipeForBuilding(buildingTypeId, getBuildingDefaultMethods(buildingTypeId));
  return recipe.inputs.map((i) => ({
    goodsId: i.goodsId,
    amount: (i.amount / recipe.ticksRequired) * TICKS_PER_DAY * efficiency,
  }));
}

export function autoFeedBuildings(world: GameWorld): void {
  const b = world.buildings;
  const c = world.companies;
  for (let i = 0; i < b.count; i++) {
    if (!b.isActive[i]) continue;
    const recipe = getBuildingRecipe(world, i);
    if (recipe.inputs.length === 0) continue;
    const owner = b.owners[i];
    const inputOffset = i * MAX_INPUTS;
    for (let j = 0; j < recipe.inputs.length; j++) {
      const goodsId = recipe.inputs[j].goodsId;
      const currentBuffer = b.inputBuffers[inputOffset + j];
      const targetBuffer = (recipe.inputs[j].amount * 7 / recipe.ticksRequired) * TICKS_PER_DAY;
      if (currentBuffer < targetBuffer) {
        const needed = targetBuffer - currentBuffer;
        const inventoryIdx = owner * GOODS_COUNT + goodsId;
        const available = c.inventories[inventoryIdx];
        const transfer = Math.min(needed, available);
        if (transfer > 0) {
          c.inventories[inventoryIdx] -= transfer;
          b.inputBuffers[inputOffset + j] += transfer;
          drainMarketSupply(world, goodsId, transfer);
        }
      }
    }
  }
}

export interface BuildingProductionStatus {
  status: 'producing' | 'blocked' | 'idle' | 'error';
  efficiency: number;
  progress: number;
  inputLevels: { goodsId: number; current: number; required: number; percentage: number }[];
  outputLevels: { goodsId: number; amount: number }[];
  bottleneck: number | null;
  recipe: ComputedRecipe | null;
  slotMethods: number[];
}

export function getBuildingProductionStatus(
  world: GameWorld,
  buildingId: number,
): BuildingProductionStatus {
  const b = world.buildings;
  const typeId = b.types[buildingId];
  const building = BUILDINGS_BY_ID.get(typeId);

  const slotCount = getBuildingSlotCount(typeId);
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    slotMethods.push(b.slotMethods[slotOffset + i]);
  }

  if (!building) {
    return {
      status: 'error',
      efficiency: 0,
      progress: 0,
      inputLevels: [],
      outputLevels: [],
      bottleneck: null,
      recipe: null,
      slotMethods,
    };
  }

  const recipe = getBuildingRecipe(world, buildingId);
  const inputOffset = buildingId * MAX_INPUTS;
  const outputOffset = buildingId * MAX_OUTPUTS;
  const efficiency = b.efficiencies[buildingId];

  const inputLevels: { goodsId: number; current: number; required: number; percentage: number }[] = [];
  let bottleneck: number | null = null;
  let minPercentage = Infinity;

  for (let i = 0; i < recipe.inputs.length; i++) {
    const current = b.inputBuffers[inputOffset + i];
    const required = recipe.inputs[i].amount;
    const percentage = required > 0 ? Math.min(100, (current / required) * 100) : 100;
    inputLevels.push({ goodsId: recipe.inputs[i].goodsId, current, required, percentage });
    if (percentage < minPercentage) {
      minPercentage = percentage;
      bottleneck = recipe.inputs[i].goodsId;
    }
  }

  const outputLevels: { goodsId: number; amount: number }[] = [];
  for (let i = 0; i < recipe.outputs.length; i++) {
    outputLevels.push({
      goodsId: recipe.outputs[i].goodsId,
      amount: b.outputBuffers[outputOffset + i],
    });
  }

  let status: 'producing' | 'blocked' | 'idle' | 'error';
  if (!b.isActive[buildingId]) {
    status = 'idle';
  } else if (recipe.inputs.length === 0 || minPercentage >= 100) {
    status = 'producing';
  } else {
    status = 'blocked';
  }

  return {
    status,
    efficiency,
    progress: b.progress[buildingId],
    inputLevels,
    outputLevels,
    bottleneck: status === 'blocked' ? bottleneck : null,
    recipe,
    slotMethods,
  };
}

export const getBuildingProductionStatusWithMethods = getBuildingProductionStatus;

// ALL_BUILDINGS 仍被外部使用（虽然 production 字段稍后删除）
export { ALL_BUILDINGS };
