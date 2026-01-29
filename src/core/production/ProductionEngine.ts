/**
 * 生产引擎
 * 批量处理所有建筑的生产计算
 * 包含劳动力和能源系统以及生产方式槽位修正
 * 支持新的建筑专属生产方式系统
 * 集成附属建筑效果系统
 */

import { GameWorld, addInventory } from '../world/GameWorld';
import { RECIPES_BY_ID, RecipeDefinition } from '@/data/recipes';
import { ALL_BUILDINGS } from '@/data/buildings';
import { MAX_INPUTS, MAX_OUTPUTS, MAX_SLOTS, GOODS_COUNT } from '../constants';
import {
  calculateProductionModifiers,
  ProductionModifiers,
  getBuildingSlotCount,
  METHODS_BY_ID,
  // 新系统集成函数
  hasBuildingSpecificMethods,
  getProductionModifiersForBuilding
} from './ProductionMethods';
import { determineProductionQuality, QualityGrade, QUALITY_INFO } from '../economy/QualitySystem';
import {
  calculateCombinedEffects,
  CombinedSubsidiaryEffects,
  updateSubsidiaryConditions,
} from './SubsidiaryBuildings';

/**
 * 配方缓存表，用于快速查找
 * 在游戏启动时初始化
 */
interface RecipeCache {
  inputCount: number;
  outputCount: number;
  inputGoods: number[];
  inputAmounts: number[];
  outputGoods: number[];
  outputAmounts: number[];
  ticksRequired: number;
  laborRequired: number;    // 每tick所需劳动力
  energyRequired: number;   // 每tick所需能源
}

const recipeCache: Map<number, RecipeCache> = new Map();

/**
 * 公司资源状态（劳动力和能源）
 */
interface CompanyResources {
  totalLabor: number;         // 总可用劳动力
  usedLabor: number;          // 已使用劳动力
  totalEnergy: number;        // 总可用能源
  usedEnergy: number;         // 已使用能源
  laborShortage: boolean;     // 是否劳动力短缺
  energyShortage: boolean;    // 是否能源短缺
}

// 公司资源追踪
const companyResources: Map<number, CompanyResources> = new Map();

/**
 * 初始化配方缓存
 */
export function initRecipeCache(): void {
  recipeCache.clear();
  
  for (const [id, recipe] of RECIPES_BY_ID) {
    const cache: RecipeCache = {
      inputCount: recipe.inputs.length,
      outputCount: recipe.outputs.length,
      inputGoods: recipe.inputs.map(i => i.goodsId),
      inputAmounts: recipe.inputs.map(i => i.amount),
      outputGoods: recipe.outputs.map(o => o.goodsId),
      outputAmounts: recipe.outputs.map(o => o.amount),
      ticksRequired: recipe.ticksRequired,
      laborRequired: recipe.laborRequired / recipe.ticksRequired, // 每tick需求
      energyRequired: recipe.energyRequired / recipe.ticksRequired,
    };
    recipeCache.set(id, cache);
  }
}

/**
 * 获取配方缓存
 */
function getRecipeCache(recipeId: number): RecipeCache | undefined {
  return recipeCache.get(recipeId);
}

/**
 * 计算公司的总可用资源
 * 劳动力 = 基础值 + 建筑数量 × 建筑劳动力
 * 能源 = 发电厂产能 + 基础电网
 */
function calculateCompanyResources(world: GameWorld, companyId: number): CompanyResources {
  let totalLabor = 1000; // 基础劳动力池
  let totalEnergy = 5000; // 基础电网供应
  
  // 统计公司建筑数量和类型
  let buildingCount = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      buildingCount++;
      const typeId = world.buildings.types[i];
      const recipeId = world.buildings.recipeIds[i];
      
      // 发电厂产生能源 (配方32-34是发电配方)
      if (recipeId >= 32 && recipeId <= 34) {
        const recipe = getRecipeCache(recipeId);
        if (recipe && recipe.outputGoods[0] === 57) { // 电力商品ID=57
          totalEnergy += recipe.outputAmounts[0];
        }
      }
    }
  }
  
  // 每个建筑提供一些劳动力容量（模拟员工）
  totalLabor += buildingCount * 50;
  
  // 根据公司现金计算可雇佣劳动力（现金越多，可雇佣越多）
  const cash = world.companies.cash[companyId] || 0;
  const laborFromCash = Math.min(cash / 10000, 500); // 每1万现金增加1劳动力，上限500
  totalLabor += laborFromCash;
  
  return {
    totalLabor,
    usedLabor: 0,
    totalEnergy,
    usedEnergy: 0,
    laborShortage: false,
    energyShortage: false,
  };
}

/**
 * 获取建筑的生产方式修正
 * 自动判断使用新系统（建筑专属）还是旧系统（通用方式）
 */
function getBuildingProductionModifiers(world: GameWorld, buildingId: number): ProductionModifiers {
  const b = world.buildings;
  const buildingTypeId = b.types[buildingId];
  
  // 获取该建筑的所有槽位方法
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];
  
  // 检查是否使用新的建筑专属生产方式系统
  if (hasBuildingSpecificMethods(buildingTypeId)) {
    // 新系统：使用建筑专属的生产方式
    const slotCount = MAX_SLOTS; // 新系统可能有更多槽位
    
    for (let i = 0; i < slotCount; i++) {
      const methodId = b.slotMethods[slotOffset + i];
      if (methodId > 0) {
        slotMethods.push(methodId);
      }
    }
    
    // 使用新系统计算修正，并转换为旧格式
    return getProductionModifiersForBuilding(buildingTypeId, slotMethods);
  } else {
    // 旧系统：使用通用生产方式
    const slotCount = getBuildingSlotCount(buildingTypeId);
    
    for (let i = 0; i < slotCount; i++) {
      const methodId = b.slotMethods[slotOffset + i];
      if (methodId > 0) {
        slotMethods.push(methodId);
      }
    }
    
    return calculateProductionModifiers(slotMethods);
  }
}

/**
 * 获取建筑选中的生产方式ID列表
 */
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

/**
 * 设置建筑的生产方式
 * @param world 游戏世界
 * @param buildingId 建筑ID
 * @param slotIndex 槽位索引
 * @param methodId 方式ID
 */
export function setBuildingMethod(
  world: GameWorld,
  buildingId: number,
  slotIndex: number,
  methodId: number
): boolean {
  const b = world.buildings;
  
  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
    return false;
  }
  
  const slotOffset = buildingId * MAX_SLOTS;
  b.slotMethods[slotOffset + slotIndex] = methodId;
  
  return true;
}

/**
 * 处理单个建筑的生产
 */
function processBuildingProduction(
  world: GameWorld,
  buildingId: number,
  resources: CompanyResources
): { produced: boolean; laborUsed: number; energyUsed: number; qualityBonus: number } {
  const b = world.buildings;
  const c = world.companies;
  const g = world.goods;
  
  const result = { produced: false, laborUsed: 0, energyUsed: 0, qualityBonus: 0 };
  
  // 检查建筑是否激活
  if (!b.isActive[buildingId]) {
    return result;
  }
  
  const recipeId = b.recipeIds[buildingId];
  const recipe = getRecipeCache(recipeId);
  
  if (!recipe) {
    return result;
  }
  
  const efficiency = b.efficiencies[buildingId];
  const owner = b.owners[buildingId];
  
  // 获取生产方式修正
  const modifiers = getBuildingProductionModifiers(world, buildingId);
  
  // 获取附属建筑效果
  const subsidiaryEffects = calculateCombinedEffects(world, buildingId);
  
  // 计算本tick的基础产出率
  let tickOutput = efficiency / recipe.ticksRequired;
  
  // 应用附属建筑的速度加成
  tickOutput *= subsidiaryEffects.speedMultiplier;
  
  // 应用生产方式的产出修正
  // 首先应用通用产出乘数
  let outputModifier = 1.0;
  
  // 检查是否有通用产出修正（goodsId=0 表示 'all'）
  if (modifiers.outputMultipliers.has(0)) {
    outputModifier *= modifiers.outputMultipliers.get(0) ?? 1.0;
  }
  
  // 计算特定商品的平均修正
  let specificModifier = 1.0;
  let specificCount = 0;
  for (const [goodsId, mult] of modifiers.outputMultipliers) {
    if (goodsId !== 0) { // 排除通用修正
      // 检查是否是本配方的输出商品
      if (recipe.outputGoods.includes(goodsId)) {
        specificModifier *= mult;
        specificCount++;
      }
    }
  }
  
  // 如果有特定商品的修正，应用它们
  if (specificCount > 0) {
    outputModifier *= specificModifier;
  }
  
  // 应用附属建筑的产出乘数
  outputModifier *= subsidiaryEffects.outputMultiplier;
  
  tickOutput *= outputModifier;
  
  // 计算劳动力修正（生产方式 + 附属建筑）
  const laborMultiplier = modifiers.laborMultiplier * (1 - subsidiaryEffects.laborReduction);
  
  // 检查劳动力是否足够（应用劳动力修正）
  const laborNeeded = recipe.laborRequired * efficiency * laborMultiplier;
  const availableLabor = resources.totalLabor - resources.usedLabor;
  if (laborNeeded > availableLabor) {
    // 劳动力不足，降低产能
    if (availableLabor > 0) {
      const laborRatio = availableLabor / laborNeeded;
      tickOutput *= laborRatio;
      resources.laborShortage = true;
    } else {
      resources.laborShortage = true;
      return result; // 完全没有劳动力，无法生产
    }
  }
  
  // 计算能源修正（生产方式 + 附属建筑）
  const energyMultiplier = modifiers.energyMultiplier * (1 - subsidiaryEffects.energyReduction);
  
  // 检查能源是否足够（应用能源修正）
  const energyNeeded = recipe.energyRequired * efficiency * energyMultiplier;
  const availableEnergy = resources.totalEnergy - resources.usedEnergy;
  if (energyNeeded > availableEnergy) {
    // 能源不足，降低产能
    if (availableEnergy > 0) {
      const energyRatio = availableEnergy / energyNeeded;
      tickOutput *= energyRatio;
      resources.energyShortage = true;
    } else {
      resources.energyShortage = true;
      return result; // 完全没有能源，无法生产
    }
  }
  
  // 计算输入修正（生产方式 + 附属建筑的输入减少）
  const inputReductionMultiplier = 1 - subsidiaryEffects.inputReduction;
  
  // 检查输入是否足够（应用输入修正）
  let canProduce = true;
  const inputOffset = buildingId * MAX_INPUTS;
  
  // 预先计算输入修正（用于检查和消耗）
  const inputMultipliers: number[] = [];
  for (let j = 0; j < recipe.inputCount; j++) {
    const goodsId = recipe.inputGoods[j];
    // 优先使用特定商品的修正，否则使用通用修正（goodsId=0）
    let inputMult = modifiers.inputMultipliers.get(goodsId);
    if (inputMult === undefined) {
      inputMult = modifiers.inputMultipliers.get(0) ?? 1.0;
    }
    // 应用附属建筑的输入减少
    inputMult *= inputReductionMultiplier;
    inputMultipliers[j] = inputMult;
    
    const required = recipe.inputAmounts[j] * tickOutput * inputMult;
    if (b.inputBuffers[inputOffset + j] < required) {
      canProduce = false;
      break;
    }
  }
  
  if (!canProduce) {
    return result;
  }
  
  // 消耗输入（应用输入修正）
  for (let j = 0; j < recipe.inputCount; j++) {
    const consumed = recipe.inputAmounts[j] * tickOutput * inputMultipliers[j];
    b.inputBuffers[inputOffset + j] -= consumed;
  }
  
  // 记录资源使用
  result.laborUsed = Math.min(laborNeeded, availableLabor);
  result.energyUsed = Math.min(energyNeeded, availableEnergy);
  
  // 合并品质加成（生产方式 + 附属建筑）
  result.qualityBonus = modifiers.qualityBonus + subsidiaryEffects.qualityBonus;
  
  // 产出
  const outputOffset = buildingId * MAX_OUTPUTS;
  for (let j = 0; j < recipe.outputCount; j++) {
    const goodsId = recipe.outputGoods[j];
    let amount = recipe.outputAmounts[j] * tickOutput;
    
    // 应用附属建筑的特定商品加成
    const specificBonus = subsidiaryEffects.specificGoodsBonus.get(goodsId);
    if (specificBonus) {
      amount *= specificBonus;
    }
    
    // 添加到输出缓冲区
    b.outputBuffers[outputOffset + j] += amount;
    
    // 直接添加到公司库存
    addInventory(world, owner, goodsId, amount);
    
    // 记录供给
    g.supplies[goodsId] += amount;
    
    // 更新库存品质分数（使用加权平均）
    updateInventoryQuality(world, owner, goodsId, amount, result.qualityBonus);
  }
  
  // 处理附属建筑的额外产出
  for (const bonusOutput of subsidiaryEffects.bonusOutputs) {
    if (Math.random() < bonusOutput.chance) {
      const bonusAmount = bonusOutput.amount;
      addInventory(world, owner, bonusOutput.goodsId, bonusAmount);
      g.supplies[bonusOutput.goodsId] += bonusAmount;
    }
  }
  
  // 更新生产进度
  b.progress[buildingId] = (b.progress[buildingId] + tickOutput) % 1;
  
  result.produced = true;
  return result;
}

/**
 * 供应过剩自动减产配置
 */
const OVERSUPPLY_CONFIG = {
  threshold: 2.0,           // 供需比阈值：超过2倍供应视为过剩
  efficiencyReduction: 0.10, // 每tick效率降低10%
  minEfficiency: 0.3,        // 最低效率30%
  recoveryRate: 0.05,        // 当不再过剩时，效率恢复速度5%/tick
};

/**
 * 检查供应过剩并自动调整生产效率
 * 当商品的供需比超过阈值时，自动降低生产该商品的建筑效率
 * 当供需恢复正常时，逐步恢复效率
 */
export function adjustOversupplyProduction(world: GameWorld): OversupplyAdjustmentResult {
  const result: OversupplyAdjustmentResult = {
    oversuppliedGoodsCount: 0,
    reducedBuildingsCount: 0,
    recoveredBuildingsCount: 0,
  };
  
  const g = world.goods;
  const b = world.buildings;
  
  // 找出供应过剩的商品
  const oversuppliedGoods = new Set<number>();
  for (let i = 0; i < GOODS_COUNT; i++) {
    const supply = g.supplies[i];
    const demand = g.demands[i];
    // 只有当需求存在且供需比超过阈值时才视为过剩
    if (demand > 0.01 && supply / demand > OVERSUPPLY_CONFIG.threshold) {
      oversuppliedGoods.add(i);
    }
  }
  result.oversuppliedGoodsCount = oversuppliedGoods.size;
  
  // 遍历所有建筑，调整生产过剩商品的建筑效率
  for (let i = 0; i < b.count; i++) {
    if (!b.isActive[i]) continue;
    
    const recipeId = b.recipeIds[i];
    const recipe = getRecipeCache(recipeId);
    if (!recipe) continue;
    
    // 检查该建筑是否生产过剩商品
    let producesOversupplied = false;
    for (let j = 0; j < recipe.outputCount; j++) {
      if (oversuppliedGoods.has(recipe.outputGoods[j])) {
        producesOversupplied = true;
        break;
      }
    }
    
    const currentEfficiency = b.efficiencies[i];
    const baseEfficiency = 1.0; // 基础效率为1.0
    
    if (producesOversupplied) {
      // 降低效率
      if (currentEfficiency > OVERSUPPLY_CONFIG.minEfficiency) {
        const newEfficiency = Math.max(
          OVERSUPPLY_CONFIG.minEfficiency,
          currentEfficiency * (1 - OVERSUPPLY_CONFIG.efficiencyReduction)
        );
        b.efficiencies[i] = newEfficiency;
        result.reducedBuildingsCount++;
      }
    } else {
      // 如果效率低于基础值，逐步恢复
      if (currentEfficiency < baseEfficiency) {
        const newEfficiency = Math.min(
          baseEfficiency,
          currentEfficiency * (1 + OVERSUPPLY_CONFIG.recoveryRate)
        );
        b.efficiencies[i] = newEfficiency;
        result.recoveredBuildingsCount++;
      }
    }
  }
  
  return result;
}

/**
 * 供应过剩调整结果
 */
export interface OversupplyAdjustmentResult {
  oversuppliedGoodsCount: number;   // 过剩商品数量
  reducedBuildingsCount: number;    // 被减产的建筑数量
  recoveredBuildingsCount: number;  // 恢复效率的建筑数量
}

/**
 * 批量更新所有建筑的生产
 * 这是主要的生产计算入口点
 */
export function updateAllProduction(world: GameWorld): ProductionResult {
  const b = world.buildings;
  const result: ProductionResult = {
    processedCount: 0,
    producedCount: 0,
    blockedCount: 0,
    laborShortage: 0,
    energyShortage: 0,
    totalLaborUsed: 0,
    totalEnergyUsed: 0,
    totalQualityBonus: 0,
  };
  
  // 供应过剩自动减产检查（每8tick执行一次以减少性能开销）
  if (world.tick % 8 === 0) {
    adjustOversupplyProduction(world);
  }
  
  // 更新附属建筑状态（每tick衰减）
  updateSubsidiaryConditions(world);
  
  // 首先计算每个公司的可用资源
  companyResources.clear();
  for (let i = 0; i < world.companies.count; i++) {
    companyResources.set(i, calculateCompanyResources(world, i));
  }
  
  // 处理每个建筑的生产
  for (let i = 0; i < b.count; i++) {
    result.processedCount++;
    
    const owner = b.owners[i];
    const resources = companyResources.get(owner);
    
    if (!resources) continue;
    
    const prodResult = processBuildingProduction(world, i, resources);
    
    if (prodResult.produced) {
      result.producedCount++;
      resources.usedLabor += prodResult.laborUsed;
      resources.usedEnergy += prodResult.energyUsed;
      result.totalLaborUsed += prodResult.laborUsed;
      result.totalEnergyUsed += prodResult.energyUsed;
      result.totalQualityBonus += prodResult.qualityBonus;
    } else if (b.isActive[i]) {
      result.blockedCount++;
    }
  }
  
  // 统计资源短缺情况
  for (const [, res] of companyResources) {
    if (res.laborShortage) result.laborShortage++;
    if (res.energyShortage) result.energyShortage++;
  }
  
  return result;
}

/**
 * 更新库存的品质分数
 * 使用加权平均合并新产出的品质
 */
function updateInventoryQuality(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  newAmount: number,
  qualityBonus: number
): void {
  const idx = companyId * GOODS_COUNT + goodsId;
  const existingAmount = world.companies.inventories[idx] - newAmount; // 已有库存（不含本次产出）
  const existingQuality = world.companies.qualityScores[idx];
  
  // 根据品质加成确定新产出的品质等级（0.0-0.5映射到0-4等级）
  // qualityBonus 通常在 0.0-0.3 范围
  const baseQuality = 0.5 + qualityBonus; // 基础品质分 0.5-0.8
  const newQuality = determineProductionQuality(baseQuality);
  
  // 加权平均计算新的品质分数
  if (existingAmount > 0 && newAmount > 0) {
    const totalAmount = existingAmount + newAmount;
    world.companies.qualityScores[idx] =
      (existingQuality * existingAmount + newQuality * newAmount) / totalAmount;
  } else if (newAmount > 0) {
    world.companies.qualityScores[idx] = newQuality;
  }
  // 如果newAmount为0则不更新
}

/**
 * 获取公司某商品的品质等级名称
 */
export function getInventoryQualityName(world: GameWorld, companyId: number, goodsId: number): string {
  const idx = companyId * GOODS_COUNT + goodsId;
  const score = world.companies.qualityScores[idx];
  const grade = Math.round(score) as QualityGrade;
  return QUALITY_INFO[grade]?.name || '标准';
}

/**
 * 获取公司某商品的品质价格乘数
 */
export function getInventoryQualityPriceMultiplier(world: GameWorld, companyId: number, goodsId: number): number {
  const idx = companyId * GOODS_COUNT + goodsId;
  const score = world.companies.qualityScores[idx];
  const grade = Math.round(score) as QualityGrade;
  return QUALITY_INFO[grade]?.priceMultiplier || 1.0;
}

/**
 * 生产结果统计
 */
export interface ProductionResult {
  processedCount: number;   // 处理的建筑数
  producedCount: number;    // 成功生产的建筑数
  blockedCount: number;     // 因缺少输入而阻塞的建筑数
  laborShortage: number;    // 劳动力短缺的公司数
  energyShortage: number;   // 能源短缺的公司数
  totalLaborUsed: number;   // 总劳动力使用
  totalEnergyUsed: number;  // 总能源使用
  totalQualityBonus: number; // 总品质加成
}

/**
 * 获取公司的资源使用情况
 */
export function getCompanyResourceUsage(companyId: number): CompanyResources | null {
  return companyResources.get(companyId) || null;
}

/**
 * 计算建筑的理论产能
 */
export function calculateTheoreticalOutput(
  buildingTypeId: number,
  level: number,
  recipeId: number
): { goodsId: number; amount: number }[] {
  const recipe = RECIPES_BY_ID.get(recipeId);
  if (!recipe) return [];
  
  // 获取建筑等级效率加成
  // 这里简化处理，实际应该从building数据获取
  const efficiencyMultiplier = 1 + (level - 1) * 0.1;
  
  return recipe.outputs.map(output => ({
    goodsId: output.goodsId,
    amount: (output.amount / recipe.ticksRequired) * 24 * efficiencyMultiplier, // 日产量
  }));
}

/**
 * 计算建筑的每日消耗
 */
export function calculateDailyConsumption(
  recipeId: number,
  efficiency: number = 1
): { goodsId: number; amount: number }[] {
  const recipe = RECIPES_BY_ID.get(recipeId);
  if (!recipe) return [];
  
  return recipe.inputs.map(input => ({
    goodsId: input.goodsId,
    amount: (input.amount / recipe.ticksRequired) * 24 * efficiency,
  }));
}

/**
 * 自动从公司库存补充建筑输入
 */
export function autoFeedBuildings(world: GameWorld): void {
  const b = world.buildings;
  const c = world.companies;
  
  for (let i = 0; i < b.count; i++) {
    if (!b.isActive[i]) continue;
    
    const recipeId = b.recipeIds[i];
    const recipe = getRecipeCache(recipeId);
    if (!recipe) continue;
    
    const owner = b.owners[i];
    const inputOffset = i * MAX_INPUTS;
    
    // 尝试补充每个输入槽
    for (let j = 0; j < recipe.inputCount; j++) {
      const goodsId = recipe.inputGoods[j];
      const currentBuffer = b.inputBuffers[inputOffset + j];
      
      // 目标：保持7天的库存
      const targetBuffer = recipe.inputAmounts[j] * 7 / recipe.ticksRequired * 24;
      
      if (currentBuffer < targetBuffer) {
        const needed = targetBuffer - currentBuffer;
        const inventoryIdx = owner * GOODS_COUNT + goodsId;
        const available = c.inventories[inventoryIdx];
        
        const transfer = Math.min(needed, available);
        if (transfer > 0) {
          c.inventories[inventoryIdx] -= transfer;
          b.inputBuffers[inputOffset + j] += transfer;
        }
      }
    }
  }
}

/**
 * 获取建筑的生产状态
 */
export function getBuildingProductionStatus(
  world: GameWorld,
  buildingId: number
): BuildingProductionStatus {
  const b = world.buildings;
  const recipeId = b.recipeIds[buildingId];
  const recipe = RECIPES_BY_ID.get(recipeId);
  const buildingTypeId = b.types[buildingId];
  
  // 获取槽位方法
  const slotCount = getBuildingSlotCount(buildingTypeId);
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    slotMethods.push(b.slotMethods[slotOffset + i]);
  }
  
  if (!recipe) {
    return {
      status: 'error',
      efficiency: 0,
      progress: 0,
      inputLevels: [],
      outputLevels: [],
      bottleneck: null,
      productionModifiers: null,
      slotMethods,
    };
  }
  
  const inputOffset = buildingId * MAX_INPUTS;
  const outputOffset = buildingId * MAX_OUTPUTS;
  const efficiency = b.efficiencies[buildingId];
  
  // 获取生产方式修正
  const productionModifiers = getBuildingProductionModifiers(world, buildingId);
  
  // 计算输入水平
  const inputLevels: { goodsId: number; current: number; required: number; percentage: number }[] = [];
  let bottleneck: number | null = null;
  let minPercentage = Infinity;
  
  for (let i = 0; i < recipe.inputs.length; i++) {
    const current = b.inputBuffers[inputOffset + i];
    const required = recipe.inputs[i].amount;
    const percentage = Math.min(100, (current / required) * 100);
    
    inputLevels.push({
      goodsId: recipe.inputs[i].goodsId,
      current,
      required,
      percentage,
    });
    
    if (percentage < minPercentage) {
      minPercentage = percentage;
      bottleneck = recipe.inputs[i].goodsId;
    }
  }
  
  // 计算输出水平
  const outputLevels: { goodsId: number; amount: number }[] = [];
  for (let i = 0; i < recipe.outputs.length; i++) {
    outputLevels.push({
      goodsId: recipe.outputs[i].goodsId,
      amount: b.outputBuffers[outputOffset + i],
    });
  }
  
  // 确定状态
  let status: 'producing' | 'blocked' | 'idle' | 'error';
  if (!b.isActive[buildingId]) {
    status = 'idle';
  } else if (minPercentage >= 100) {
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
    productionModifiers,
    slotMethods,
  };
}

/**
 * 建筑生产状态
 */
export interface BuildingProductionStatus {
  status: 'producing' | 'blocked' | 'idle' | 'error';
  efficiency: number;
  progress: number;
  inputLevels: { goodsId: number; current: number; required: number; percentage: number }[];
  outputLevels: { goodsId: number; amount: number }[];
  bottleneck: number | null;  // 瓶颈商品ID
  productionModifiers: ProductionModifiers | null;  // 生产方式修正
  slotMethods: number[];  // 当前槽位方法
}

/**
 * 获取建筑的生产状态（包含生产方式信息）
 */
export function getBuildingProductionStatusWithMethods(
  world: GameWorld,
  buildingId: number
): BuildingProductionStatus {
  const b = world.buildings;
  const recipeId = b.recipeIds[buildingId];
  const recipe = RECIPES_BY_ID.get(recipeId);
  const buildingTypeId = b.types[buildingId];
  
  // 获取槽位方法
  const slotCount = getBuildingSlotCount(buildingTypeId);
  const slotOffset = buildingId * MAX_SLOTS;
  const slotMethods: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    slotMethods.push(b.slotMethods[slotOffset + i]);
  }
  
  // 获取生产方式修正
  const productionModifiers = getBuildingProductionModifiers(world, buildingId);
  
  if (!recipe) {
    return {
      status: 'error',
      efficiency: 0,
      progress: 0,
      inputLevels: [],
      outputLevels: [],
      bottleneck: null,
      productionModifiers: null,
      slotMethods,
    };
  }
  
  const inputOffset = buildingId * MAX_INPUTS;
  const outputOffset = buildingId * MAX_OUTPUTS;
  const efficiency = b.efficiencies[buildingId];
  
  // 计算输入水平
  const inputLevels: { goodsId: number; current: number; required: number; percentage: number }[] = [];
  let bottleneck: number | null = null;
  let minPercentage = Infinity;
  
  for (let i = 0; i < recipe.inputs.length; i++) {
    const current = b.inputBuffers[inputOffset + i];
    const required = recipe.inputs[i].amount;
    const percentage = Math.min(100, (current / required) * 100);
    
    inputLevels.push({
      goodsId: recipe.inputs[i].goodsId,
      current,
      required,
      percentage,
    });
    
    if (percentage < minPercentage) {
      minPercentage = percentage;
      bottleneck = recipe.inputs[i].goodsId;
    }
  }
  
  // 计算输出水平
  const outputLevels: { goodsId: number; amount: number }[] = [];
  for (let i = 0; i < recipe.outputs.length; i++) {
    outputLevels.push({
      goodsId: recipe.outputs[i].goodsId,
      amount: b.outputBuffers[outputOffset + i],
    });
  }
  
  // 确定状态
  let status: 'producing' | 'blocked' | 'idle' | 'error';
  if (!b.isActive[buildingId]) {
    status = 'idle';
  } else if (minPercentage >= 100) {
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
    productionModifiers,
    slotMethods,
  };
}