/**
 * 游戏世界初始化器
 * 【v4.0更新】移除配方系统，使用建筑内嵌生产配置
 *
 * 核心变更：
 * - 移除所有RECIPES依赖
 * - 使用outputModeId替代recipeId
 * - 生产参数从buildings.ts的production属性获取
 */

import { GameWorld, createGameWorld, setInventory } from './GameWorld';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS, isRetailBuilding, getBuildingProduction, BuildingId } from '@/data/buildings';
import { PLAYER_INITIAL_CASH, INITIAL_MONEY_SUPPLY, GOODS_COUNT, MAX_SLOTS } from '../constants';
import { getDefaultSlotMethods, getBuildingSlotCount, initializeBuildingProductionMethods } from '../production/ProductionMethods';
import { initializeBuildingProductionControl } from '../production/ProductionControl';
import { createBuyOrder, createSellOrder, initOrderPool } from '../market/OrderBook';
import { initRetailSystem, registerRetailStore } from '../economy/RetailSystem';
import { buildingIndex, inventoryIndex, resetAllIndices } from '../performance/DataStructures';
import { initializeSubsidiaries } from '../production/subsidiaries';
import { AI_COMPANIES, AICompanyConfig, OutputModeId } from '../ai/AIPersonality';
import {
  getBootstrapBuyerCompanyIds,
  seedBootstrapBuyOrders,
  seedInventoryBackedSellOrders,
} from './MarketBootstrap';

// ==================== 生产模式追踪系统 ====================

interface ProductionTracker {
  goodsProducerCount: Map<number, number>;
  modeAssignmentCount: Map<string, number>; // key = "buildingTypeId:outputModeId"
}

function createProductionTracker(): ProductionTracker {
  return {
    goodsProducerCount: new Map(),
    modeAssignmentCount: new Map(),
  };
}

function recordModeAssignment(tracker: ProductionTracker, buildingTypeId: number, outputModeId: number): void {
  const production = getBuildingProduction(buildingTypeId, outputModeId);
  if (!production) return;
  
  const key = `${buildingTypeId}:${outputModeId}`;
  tracker.modeAssignmentCount.set(
    key,
    (tracker.modeAssignmentCount.get(key) || 0) + 1
  );
  
  for (const output of production.outputs) {
    tracker.goodsProducerCount.set(
      output.goodsId,
      (tracker.goodsProducerCount.get(output.goodsId) || 0) + 1
    );
  }
}

let globalProductionTracker: ProductionTracker | null = null;

function getGlobalProductionTracker(): ProductionTracker {
  if (!globalProductionTracker) {
    globalProductionTracker = createProductionTracker();
  }
  return globalProductionTracker;
}

function resetGlobalProductionTracker(): void {
  globalProductionTracker = createProductionTracker();
}

/**
 * 初始化游戏世界
 */
export function initializeWorld(): GameWorld {
  const world = createGameWorld();
  
  resetAllIndices();
  initializeBuildingProductionMethods();
  initializeSubsidiaries();
  resetGlobalProductionTracker();
  
  initializeGoods(world);
  initializePlayerCompany(world);
  initializeAICompanies(world);
  initializeMarketState(world);
  initOrderPool();
  generateInitialMarketOrders(world);
  initializeRetailStores(world);

  // 初始化家庭资金池（闭合货币循环的起点）
  world.households.cash[0] = INITIAL_MONEY_SUPPLY;
  world.households.totalWagesReceived = 0;
  world.households.totalConsumptionSpent = 0;

  return world;
}

/**
 * 初始化商品系统
 */
function initializeGoods(world: GameWorld): void {
  const g = world.goods;
  g.count = ALL_GOODS.length;
  
  for (const goods of ALL_GOODS) {
    g.prices[goods.id] = goods.basePrice;
    g.baseValues[goods.id] = goods.basePrice;
    g.supplies[goods.id] = 0;
    g.demands[goods.id] = 0;
    g.names.push(goods.name);
    g.categories.push(goods.category);
    
    for (let h = 0; h < 365; h++) {
      g.priceHistory[goods.id * 365 + h] = goods.basePrice;
    }
  }
}

/**
 * 初始化玩家公司
 */
function initializePlayerCompany(world: GameWorld): void {
  const c = world.companies;
  const playerId = 0;
  
  c.count = 1;
  c.cash[playerId] = PLAYER_INITIAL_CASH;
  c.totalAssets[playerId] = PLAYER_INITIAL_CASH;
  c.totalLiabilities[playerId] = 0;
  c.names.push('玩家公司');
  c.isPlayer.push(true);
  c.isAI.push(false);
  
  for (let i = 0; i < ALL_GOODS.length; i++) {
    setInventory(world, playerId, i, 0);
  }
  
  const starterGoods = [
    { id: 0, amount: 1000 },  // 铁矿石
    { id: 3, amount: 500 },   // 煤炭
    { id: 1, amount: 300 },   // 铜矿石
    { id: 6, amount: 200 },   // 木材
    { id: 8, amount: 500 },   // 粮食
  ];
  
  for (const item of starterGoods) {
    if (item.id < ALL_GOODS.length) {
      setInventory(world, playerId, item.id, item.amount);
    }
  }
  
  initializePlayerBuildings(world);
}

/**
 * 初始化玩家初始建筑
 */
function initializePlayerBuildings(world: GameWorld): void {
  const playerId = 0;
  
  // 使用outputModeId替代recipeId
  // 单产品建筑使用 modeId=0
  const starterBuildings = [
    { buildingTypeId: BuildingId.IRON_MINE, outputModeId: 0 },         // 铁矿场-铁矿开采
    { buildingTypeId: BuildingId.STEEL_MILL, outputModeId: 0 },        // 钢铁厂-钢铁冶炼
    { buildingTypeId: BuildingId.FARM, outputModeId: OutputModeId.FARM_GRAIN },  // 农场-粮食种植
  ];
  
  for (const config of starterBuildings) {
    const building = ALL_BUILDINGS.find(b => b.id === config.buildingTypeId);
    const production = getBuildingProduction(config.buildingTypeId, config.outputModeId);
    
    if (building && production) {
      try {
        addBuilding(world, playerId, config.buildingTypeId, config.outputModeId);
      } catch (e) {
        console.warn('Failed to add starter building:', e);
      }
    }
  }
}

/**
 * 初始化AI公司 - 使用统一的AI_COMPANIES配置
 *
 * 【v3.0更新】从AIPersonality.ts导入公司配置
 * - 确保公司名称、产业类型和建筑配置的一致性
 * - 支持生产类公司和零售类公司的统一初始化
 */
function initializeAICompanies(world: GameWorld): void {
  const c = world.companies;
  
  // 使用所有AI公司配置
  const productionCompanies = AI_COMPANIES;
  
  // 创建所有生产类AI公司
  for (let i = 0; i < productionCompanies.length; i++) {
    const ai = productionCompanies[i];
    const companyId = c.count;
    
    c.count++;
    c.cash[companyId] = ai.initialCash * 6;
    c.totalAssets[companyId] = ai.initialCash * 6;
    c.totalLiabilities[companyId] = 0;
    c.names.push(ai.name);
    c.isPlayer.push(false);
    c.isAI.push(true);
    
    // AI初始库存 - 清零
    for (let j = 0; j < ALL_GOODS.length; j++) {
      setInventory(world, companyId, j, 0);
    }
    
    // 给AI初始商品库存（基于focusGoods）
    for (const goodsId of ai.focusGoods) {
      if (goodsId < GOODS_COUNT) {
        const goods = ALL_GOODS.find(g => g.id === goodsId);
        if (!goods) continue;
        const basePrice = goods.basePrice;
        let baseAmount: number;
        if (basePrice > 50000) {
          baseAmount = 15 + Math.random() * 25;
        } else if (basePrice > 10000) {
          baseAmount = 60 + Math.random() * 90;
        } else if (basePrice > 1000) {
          baseAmount = 250 + Math.random() * 350;
        } else if (basePrice > 100) {
          baseAmount = 600 + Math.random() * 800;
        } else {
          baseAmount = 1500 + Math.random() * 1500;
        }
        setInventory(world, companyId, goodsId, baseAmount);
      }
    }
    
    // 给AI初始建筑材料库存（大幅增加以确保AI能建造建筑）
    // 【关键修复】增加初始建材数量，确保AI公司能够建造建筑
    const buildingMaterialsInit: Array<{ goodsId: number; amount: number }> = [
      { goodsId: 14, amount: 2000 + Math.random() * 3000 },  // 钢材 - 大幅增加
      { goodsId: 21, amount: 1500 + Math.random() * 2000 },  // 水泥 - 大幅增加
      { goodsId: 6, amount: 800 + Math.random() * 1200 },    // 木材
      { goodsId: 17, amount: 600 + Math.random() * 800 },    // 玻璃
      { goodsId: 36, amount: 800 + Math.random() * 1200 },   // 建筑材料 - 大幅增加
      { goodsId: 47, amount: 300 + Math.random() * 400 },    // 建材成品 - 大幅增加
      { goodsId: 29, amount: 50 + Math.random() * 80 },      // 电机 - 增加
      { goodsId: 31, amount: 300 + Math.random() * 400 },    // 机械部件 - 大幅增加
      { goodsId: 25, amount: 500 + Math.random() * 800 },    // 燃油
      { goodsId: 18, amount: 400 + Math.random() * 600 },    // 塑料
      { goodsId: 19, amount: 200 + Math.random() * 300 },    // 橡胶制品
      { goodsId: 26, amount: 100 + Math.random() * 200 },    // 电子元件
      { goodsId: 51, amount: 10 + Math.random() * 20 },      // 工业机器人
    ];
    
    for (const mat of buildingMaterialsInit) {
      if (mat.goodsId < GOODS_COUNT) {
        const currentInv = world.companies.inventories[companyId * GOODS_COUNT + mat.goodsId] || 0;
        setInventory(world, companyId, mat.goodsId, currentInv + Math.floor(mat.amount));
      }
    }
    
    // 创建建筑（从统一配置中读取，使用outputModeId）
    const tracker = getGlobalProductionTracker();
    
    for (const buildingConfig of ai.initialBuildings) {
      for (let count = 0; count < buildingConfig.count; count++) {
        const outputModeId = buildingConfig.outputModeId;
        
        if (outputModeId !== undefined) {
          try {
            addBuilding(world, companyId, buildingConfig.typeId, outputModeId);
            if (outputModeId >= 0) {
              recordModeAssignment(tracker, buildingConfig.typeId, outputModeId);
            }
          } catch (e) {
            console.warn(`[初始化] 无法为 ${ai.name} 添加建筑类型 ${buildingConfig.typeId}:`, e);
          }
        }
      }
    }
  }
  
  console.log(`[初始化] 创建了 ${productionCompanies.length} 家生产类AI公司，共 ${world.buildings.count} 个建筑`);
}

/**
 * 初始化市场状态
 */
function initializeMarketState(world: GameWorld): void {
  const g = world.goods;
  
  for (let i = 0; i < g.count; i++) {
    const basePrice = g.baseValues[i];
    g.supplies[i] = basePrice * 100;
    g.demands[i] = basePrice * 100;
  }
  
  // GDP uses live activity after the first full in-game day.
  // Starting from zero avoids the opening “flash crash” caused by a placeholder value.
  world.economyStats.gdp = 0;
  world.economyStats.inflation = 0;
  world.economyStats.unemployment = 0.05;
  world.economyStats.interestRate = 0.03;
  world.economyStats.cyclePhase = 'expansion';
  world.economyStats.cyclePosition = 0.5;
}

/**
 * 生成初始市场订单
 */
function generateInitialMarketOrders(world: GameWorld): void {
  const c = world.companies;
  
  // 【关键修复】首先为建筑材料生成大量初始卖单
  // 确保AI公司能够采购到建造所需的材料
  generateBuildingMaterialSellOrders(world);
  
  // 为每个AI公司生成初始订单
  for (let companyId = 1; companyId < c.count; companyId++) {
    if (!c.isAI[companyId]) continue;
    
    // 遍历该公司的库存，为有库存的商品挂卖单
    for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
      const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
      
      if (inventory > 30) {
        const currentPrice = world.goods.prices[goodsId];
        const goods = ALL_GOODS.find(g => g.id === goodsId);
        if (!goods) continue;
        const basePrice = goods.basePrice;
        
        const sellPrice = basePrice * (0.88 + Math.random() * 0.12);
        const sellQuantity = Math.floor(inventory * (0.4 + Math.random() * 0.3));
        
        if (sellQuantity > 5) {
          createSellOrder(world, companyId, goodsId, sellQuantity, sellPrice);
        }
      }
    }
    
    // 为AI需要的原材料挂买单（使用建筑内嵌的生产配置）
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (world.buildings.owners[buildingId] !== companyId) continue;
      
      const buildingTypeId = world.buildings.types[buildingId];
      const outputModeId = world.buildings.outputModeIds[buildingId];
      const production = getBuildingProduction(buildingTypeId, outputModeId);
      if (!production) continue;
      
      for (const input of production.inputs) {
        const currentPrice = world.goods.prices[input.goodsId];
        const goods = ALL_GOODS.find(g => g.id === input.goodsId);
        if (!goods) continue;
        const basePrice = goods.basePrice;
        
        const buyPrice = basePrice * (0.95 + Math.random() * 0.2);
        const buyQuantity = Math.floor(input.amount * (15 + Math.random() * 25));
        
        if (buyQuantity > 5 && c.cash[companyId] >= buyQuantity * buyPrice * 1.2) {
          createBuyOrder(world, companyId, input.goodsId, buyQuantity, buyPrice);
        }
      }
    }
  }
  
  // 为所有商品生成市场订单
  const aiCompanyIds = Array.from({ length: c.count - 1 }, (_, offset) => offset + 1)
    .filter(companyId => c.isAI[companyId]);

  for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
    const bootstrapBuyerIds = getBootstrapBuyerCompanyIds(world, goodsId);
    seedBootstrapBuyOrders(world, goodsId, bootstrapBuyerIds);
    seedInventoryBackedSellOrders(world, goodsId, aiCompanyIds);
  }
  
  console.log(`[初始化] 生成了 ${world.orders.activeCount} 个初始市场订单`);
}

/**
 * 为公司添加建筑
 * 【v4.0更新】使用outputModeId替代recipeId
 */
export function addBuilding(
  world: GameWorld,
  companyId: number,
  buildingTypeId: number,
  outputModeId: number
): number {
  const b = world.buildings;
  
  if (b.count >= b.maxCount) {
    throw new Error('建筑数量已达上限');
  }
  
  const buildingId = b.count;
  b.count++;
  
  b.types[buildingId] = buildingTypeId;
  b.owners[buildingId] = companyId;
  b.levels[buildingId] = 1;
  b.efficiencies[buildingId] = 1.0;
  b.progress[buildingId] = 0;
  b.outputModeIds[buildingId] = outputModeId;
  b.isActive[buildingId] = 1;
  initializeBuildingProductionControl(world, buildingId);
  
  const defaultMethods = getDefaultSlotMethods(buildingTypeId);
  const slotOffset = buildingId * MAX_SLOTS;
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (i < defaultMethods.length) {
      b.slotMethods[slotOffset + i] = defaultMethods[i];
    } else {
      b.slotMethods[slotOffset + i] = 0;
    }
  }
  
  for (let i = 0; i < 8; i++) {
    b.inputBuffers[buildingId * 8 + i] = 0;
  }
  for (let i = 0; i < 4; i++) {
    b.outputBuffers[buildingId * 4 + i] = 0;
  }
  
  buildingIndex.add(buildingId, companyId, buildingTypeId, outputModeId);
  
  // 【性能优化】更新公司建筑计数
  world.companies.buildingCounts[companyId]++;
  
  return buildingId;
}

/**
 * 更新库存并同步索引
 */
export function setInventoryWithIndex(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  quantity: number
): void {
  setInventory(world, companyId, goodsId, quantity);
  inventoryIndex.update(companyId, goodsId, quantity);
}

/**
 * 获取建筑的槽位方法数组
 */
export function getBuildingSlotMethodsArray(world: GameWorld, buildingId: number): number[] {
  const b = world.buildings;
  const slotOffset = buildingId * MAX_SLOTS;
  const buildingTypeId = b.types[buildingId];
  const slotCount = getBuildingSlotCount(buildingTypeId);
  
  const methods: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    const value = b.slotMethods[slotOffset + i];
    methods.push(value);
  }
  return methods;
}

/**
 * 设置建筑的槽位方法
 */
export function setBuildingSlotMethod(
  world: GameWorld,
  buildingId: number,
  slotIndex: number,
  methodId: number
): boolean {
  const b = world.buildings;
  
  if (buildingId >= b.count) {
    return false;
  }
  
  const buildingTypeId = b.types[buildingId];
  const slotCount = getBuildingSlotCount(buildingTypeId);
  
  if (slotIndex >= slotCount) {
    return false;
  }
  
  const slotOffset = buildingId * MAX_SLOTS;
  b.slotMethods[slotOffset + slotIndex] = methodId;
  
  return true;
}

/**
 * 给建筑添加输入材料
 */
export function addBuildingInput(
  world: GameWorld,
  buildingId: number,
  inputSlot: number,
  amount: number
): void {
  const idx = buildingId * 8 + inputSlot;
  world.buildings.inputBuffers[idx] += amount;
}

/**
 * 从建筑收取产出
 */
export function collectBuildingOutput(
  world: GameWorld,
  buildingId: number,
  outputSlot: number
): number {
  const idx = buildingId * 4 + outputSlot;
  const amount = world.buildings.outputBuffers[idx];
  world.buildings.outputBuffers[idx] = 0;
  return amount;
}

// ==================== 零售系统初始化 ====================

/**
 * 初始化零售店
 *
 * 【v3.0更新】不再创建独立零售公司，只为玩家创建初始零售店
 */
function initializeRetailStores(world: GameWorld): void {
  initRetailSystem(world);
  
  // 只为玩家创建初始便利店
  const playerRetailBuildingId = addRetailBuilding(world, 0, BuildingId.CONVENIENCE_STORE);
  if (playerRetailBuildingId >= 0) {
    registerRetailStore(world, playerRetailBuildingId, true);
  }
  
  console.log(`[初始化] 创建了 ${world.retail.count} 家零售店`);
}

/**
 * 添加零售建筑
 */
function addRetailBuilding(
  world: GameWorld,
  companyId: number,
  buildingTypeId: number
): number {
  const b = world.buildings;
  
  if (b.count >= b.maxCount) {
    console.warn('建筑数量已达上限');
    return -1;
  }
  
  if (!isRetailBuilding(buildingTypeId)) {
    console.warn(`建筑类型 ${buildingTypeId} 不是零售建筑`);
    return -1;
  }
  
  const buildingId = b.count;
  b.count++;
  
  b.types[buildingId] = buildingTypeId;
  b.owners[buildingId] = companyId;
  b.levels[buildingId] = 1;
  b.efficiencies[buildingId] = 1.0;
  b.progress[buildingId] = 0;
  b.outputModeIds[buildingId] = -1; // 零售建筑不需要生产模式
  b.isActive[buildingId] = 1;
  
  const slotOffset = buildingId * MAX_SLOTS;
  for (let i = 0; i < MAX_SLOTS; i++) {
    b.slotMethods[slotOffset + i] = 0;
  }
  
  for (let i = 0; i < 8; i++) {
    b.inputBuffers[buildingId * 8 + i] = 0;
  }
  for (let i = 0; i < 4; i++) {
    b.outputBuffers[buildingId * 4 + i] = 0;
  }
  
  // 【性能优化】更新公司建筑计数
  world.companies.buildingCounts[companyId]++;
  
  return buildingId;
}

// ==================== 建筑材料市场初始化 ====================

/**
 * 生成建筑材料的初始卖单
 * 【关键修复】确保市场上有足够的建材供应，使AI公司能够采购到建造所需材料
 */
function generateBuildingMaterialSellOrders(world: GameWorld): void {
  const c = world.companies;
  
  // 建筑材料列表及其初始供应量 - 【v3.1更新】大幅增加种类和数量
  const buildingMaterials: Array<{ goodsId: number; name: string; sellQty: number }> = [
    // 基础建材 - 大幅增加供应
    { goodsId: 14, name: '钢材', sellQty: 10000 },      // 钢材 - 最重要的建材
    { goodsId: 21, name: '水泥', sellQty: 6000 },       // 水泥
    { goodsId: 6, name: '木材', sellQty: 4000 },        // 木材
    { goodsId: 17, name: '玻璃', sellQty: 3000 },       // 玻璃
    { goodsId: 36, name: '建筑材料', sellQty: 4000 },   // 建筑材料
    { goodsId: 47, name: '建材成品', sellQty: 1500 },   // 建材成品
    
    // 机械和电子材料
    { goodsId: 29, name: '电机', sellQty: 400 },        // 电机 - 增加
    { goodsId: 31, name: '机械部件', sellQty: 2000 },   // 机械部件 - 增加
    { goodsId: 26, name: '电子元件', sellQty: 1000 },   // 电子元件 - 增加
    { goodsId: 51, name: '工业机器人', sellQty: 200 },  // 工业机器人 - 增加
    { goodsId: 27, name: '芯片', sellQty: 300 },        // 芯片 - 新增
    
    // 化工和能源材料
    { goodsId: 18, name: '塑料', sellQty: 2000 },       // 塑料 - 增加
    { goodsId: 19, name: '橡胶制品', sellQty: 1000 },   // 橡胶制品 - 增加
    { goodsId: 20, name: '化工产品', sellQty: 600 },    // 化工产品 - 增加
    { goodsId: 25, name: '燃油', sellQty: 3000 },       // 燃油 - 增加
    
    // 高端建材（发电厂、物流中心等需要）
    { goodsId: 49, name: '光伏系统', sellQty: 50 },     // 光伏系统 - 新增
    { goodsId: 50, name: '储能系统', sellQty: 30 },     // 储能系统 - 新增
    { goodsId: 52, name: '无人机', sellQty: 60 },       // 无人机 - 新增
    { goodsId: 39, name: '电脑', sellQty: 100 },        // 电脑 - 新增（仓储、物流需要）
    
    // 零售店建材
    { goodsId: 40, name: '家电', sellQty: 200 },        // 家电 - 新增
    { goodsId: 46, name: '家具', sellQty: 500 },        // 家具 - 新增
    { goodsId: 43, name: '服装', sellQty: 300 },        // 服装 - 新增（服装店需要）
    { goodsId: 41, name: '汽车', sellQty: 30 },         // 汽车 - 新增（4S店需要）
    { goodsId: 42, name: '电动汽车', sellQty: 20 },     // 电动汽车 - 新增
    { goodsId: 54, name: '珠宝', sellQty: 100 },        // 珠宝 - 新增（奢侈品店需要）
    { goodsId: 55, name: '高端手机', sellQty: 50 },     // 高端手机 - 新增
    { goodsId: 56, name: '平价手机', sellQty: 200 },    // 平价手机 - 新增
    { goodsId: 78, name: '诊断设备', sellQty: 20 },     // 诊断设备 - 新增（药店需要）
  ];
  
  let ordersCreated = 0;
  
  for (const mat of buildingMaterials) {
    const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    
    // 为每种建材创建多个卖单（分散在不同AI公司）
    // 每个卖单数量较小，确保多样性
    const ordersPerMaterial = 8;  // 每种建材8个卖单
    const qtyPerOrder = Math.ceil(mat.sellQty / ordersPerMaterial);
    
    for (let i = 0; i < ordersPerMaterial; i++) {
      // 选择一个随机AI公司
      const companyId = 1 + (i % Math.max(1, c.count - 1));
      if (companyId >= c.count) continue;
      
      // 给该公司增加库存
      const currentInv = world.companies.inventories[companyId * GOODS_COUNT + mat.goodsId] || 0;
      setInventory(world, companyId, mat.goodsId, currentInv + qtyPerOrder);
      
      // 创建卖单（价格略低于基准价，确保有吸引力）
      const sellPrice = basePrice * (0.85 + Math.random() * 0.15);  // 85%-100%基准价
      createSellOrder(world, companyId, mat.goodsId, qtyPerOrder, sellPrice, 9999999);
      ordersCreated++;
    }
  }
  
  console.log(`[初始化] 生成了${ordersCreated}个建筑材料初始卖单`);
}
