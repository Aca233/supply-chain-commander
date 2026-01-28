/**
 * 游戏世界初始化器
 * 精简版本：只包含核心产业链（88种商品、44种建筑、60种配方）
 *
 * 【v3.0更新】使用统一的AI_COMPANIES配置
 * - 所有公司配置统一在AIPersonality.ts中定义
 * - 确保公司名称、产业和建筑配置的一致性
 */

import { GameWorld, createGameWorld, setInventory } from './GameWorld';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';
import { RECIPES, RecipeDefinition } from '@/data/recipes';
import { PLAYER_INITIAL_CASH, GOODS_COUNT, MAX_SLOTS } from '../constants';
import { getDefaultSlotMethods, getBuildingSlotCount, initializeBuildingProductionMethods } from '../production/ProductionMethods';
import { createBuyOrder, createSellOrder, initOrderPool } from '../market/OrderBook';
import { initRetailSystem, registerRetailStore } from '../economy/RetailSystem';
import { buildingIndex, inventoryIndex, resetAllIndices } from '../performance/DataStructures';
import { initializeSubsidiaries } from '../production/subsidiaries';
import { AI_COMPANIES, AICompanyConfig } from '../ai/AIPersonality';

// ==================== 智能配方分配系统 ====================

interface RecipeSupplyTracker {
  goodsProducerCount: Map<number, number>;
  recipeAssignmentCount: Map<number, number>;
}

function createRecipeSupplyTracker(): RecipeSupplyTracker {
  return {
    goodsProducerCount: new Map(),
    recipeAssignmentCount: new Map(),
  };
}

function recordRecipeAssignment(tracker: RecipeSupplyTracker, recipeId: number): void {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;
  
  tracker.recipeAssignmentCount.set(
    recipeId,
    (tracker.recipeAssignmentCount.get(recipeId) || 0) + 1
  );
  
  for (const output of recipe.outputs) {
    tracker.goodsProducerCount.set(
      output.goodsId,
      (tracker.goodsProducerCount.get(output.goodsId) || 0) + 1
    );
  }
}

let globalRecipeTracker: RecipeSupplyTracker | null = null;

function getGlobalRecipeTracker(): RecipeSupplyTracker {
  if (!globalRecipeTracker) {
    globalRecipeTracker = createRecipeSupplyTracker();
  }
  return globalRecipeTracker;
}

function resetGlobalRecipeTracker(): void {
  globalRecipeTracker = createRecipeSupplyTracker();
}

/**
 * 初始化游戏世界
 */
export function initializeWorld(): GameWorld {
  const world = createGameWorld();
  
  resetAllIndices();
  initializeBuildingProductionMethods();
  initializeSubsidiaries();
  resetGlobalRecipeTracker();
  
  initializeGoods(world);
  initializePlayerCompany(world);
  initializeAICompanies(world);
  initializeMarketState(world);
  initOrderPool();
  generateInitialMarketOrders(world);
  initializeRetailStores(world);
  
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
  
  const starterBuildings = [
    { buildingTypeId: 0, recipeId: 0 },  // 铁矿场-铁矿开采
    { buildingTypeId: 8, recipeId: 10 }, // 钢铁厂-钢铁冶炼
    { buildingTypeId: 6, recipeId: 6 },  // 农场-粮食种植
  ];
  
  for (const config of starterBuildings) {
    const building = ALL_BUILDINGS.find(b => b.id === config.buildingTypeId);
    const recipe = RECIPES.find(r => r.id === config.recipeId);
    
    if (building && recipe) {
      try {
        addBuilding(world, playerId, config.buildingTypeId, config.recipeId);
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
  
  // 过滤出非零售类公司（零售类公司在initializeRetailStores中单独处理）
  const productionCompanies = AI_COMPANIES.filter(co => co.category !== 'retail');
  
  // 创建所有生产类AI公司
  for (let i = 0; i < productionCompanies.length; i++) {
    const ai = productionCompanies[i];
    const companyId = c.count;
    
    c.count++;
    c.cash[companyId] = ai.initialCash;
    c.totalAssets[companyId] = ai.initialCash;
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
    
    // 给AI初始建筑材料库存（只使用有效的商品ID）
    const buildingMaterialsInit: Array<{ goodsId: number; amount: number }> = [
      { goodsId: 14, amount: 500 + Math.random() * 1000 },  // 钢材
      { goodsId: 21, amount: 400 + Math.random() * 600 },   // 水泥
      { goodsId: 6, amount: 300 + Math.random() * 500 },    // 木材
      { goodsId: 17, amount: 200 + Math.random() * 300 },   // 玻璃
      { goodsId: 36, amount: 200 + Math.random() * 300 },   // 建筑材料
      { goodsId: 47, amount: 80 + Math.random() * 120 },    // 建材成品
      { goodsId: 29, amount: 20 + Math.random() * 30 },     // 电机
      { goodsId: 31, amount: 100 + Math.random() * 150 },   // 机械部件
      { goodsId: 25, amount: 300 + Math.random() * 500 },   // 燃油
      { goodsId: 18, amount: 200 + Math.random() * 300 },   // 塑料
      { goodsId: 19, amount: 100 + Math.random() * 150 },   // 橡胶制品
    ];
    
    for (const mat of buildingMaterialsInit) {
      if (mat.goodsId < GOODS_COUNT) {
        const currentInv = world.companies.inventories[companyId * GOODS_COUNT + mat.goodsId] || 0;
        setInventory(world, companyId, mat.goodsId, currentInv + Math.floor(mat.amount));
      }
    }
    
    // 创建建筑（从统一配置中读取）
    const tracker = getGlobalRecipeTracker();
    
    for (const buildingConfig of ai.initialBuildings) {
      for (let count = 0; count < buildingConfig.count; count++) {
        const recipeId = buildingConfig.recipeId;
        
        if (recipeId !== undefined) {
          try {
            addBuilding(world, companyId, buildingConfig.typeId, recipeId);
            if (recipeId >= 0) {
              recordRecipeAssignment(tracker, recipeId);
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
  
  world.economyStats.gdp = 10000000000;
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
    
    // 为AI需要的原材料挂买单
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (world.buildings.owners[buildingId] !== companyId) continue;
      
      const recipeId = world.buildings.recipeIds[buildingId];
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!recipe) continue;
      
      for (const input of recipe.inputs) {
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
  for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    
    // 生成买单
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
      const companyId = 1 + Math.floor(Math.random() * (c.count - 1));
      if (companyId >= c.count || !c.isAI[companyId]) continue;
      
      const buyPrice = basePrice * (0.90 + Math.random() * 0.18);
      const buyQuantity = Math.floor(30 + Math.random() * 150);
      
      if (c.cash[companyId] >= buyQuantity * buyPrice * 1.2) {
        createBuyOrder(world, companyId, goodsId, buyQuantity, buyPrice);
      }
    }
    
    // 生成卖单
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
      const companyId = 1 + Math.floor(Math.random() * (c.count - 1));
      if (companyId >= c.count || !c.isAI[companyId]) continue;
      
      const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
      if (inventory < 50) {
        setInventory(world, companyId, goodsId, 200 + Math.random() * 400);
      }
      
      const sellPrice = basePrice * (0.88 + Math.random() * 0.15);
      const sellQuantity = Math.floor(30 + Math.random() * 150);
      
      createSellOrder(world, companyId, goodsId, sellQuantity, sellPrice);
    }
  }
  
  console.log(`[初始化] 生成了 ${world.orders.activeCount} 个初始市场订单`);
}

/**
 * 为公司添加建筑
 */
export function addBuilding(
  world: GameWorld,
  companyId: number,
  buildingTypeId: number,
  recipeId: number
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
  b.recipeIds[buildingId] = recipeId;
  b.isActive[buildingId] = 1;
  
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
  
  buildingIndex.add(buildingId, companyId, buildingTypeId, recipeId);
  
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
 * 初始化零售店 - 使用统一的AI_COMPANIES配置
 *
 * 【v3.0更新】从AIPersonality.ts导入零售公司配置
 */
function initializeRetailStores(world: GameWorld): void {
  initRetailSystem(world);
  
  const c = world.companies;
  
  // 从统一配置中获取零售类公司
  const retailCompanies = AI_COMPANIES.filter(co => co.category === 'retail');
  
  for (const retailCo of retailCompanies) {
    const companyId = c.count;
    
    c.count++;
    c.cash[companyId] = retailCo.initialCash;
    c.totalAssets[companyId] = retailCo.initialCash;
    c.totalLiabilities[companyId] = 0;
    c.names.push(retailCo.name);
    c.isPlayer.push(false);
    c.isAI.push(true);
    
    for (let j = 0; j < ALL_GOODS.length; j++) {
      setInventory(world, companyId, j, 0);
    }
    
    // 从统一配置创建零售建筑
    for (const buildingConfig of retailCo.initialBuildings) {
      for (let count = 0; count < buildingConfig.count; count++) {
        const buildingId = addRetailBuilding(world, companyId, buildingConfig.typeId);
        if (buildingId >= 0) {
          registerRetailStore(world, buildingId);
        }
      }
    }
  }
  
  const playerRetailBuildingId = addRetailBuilding(world, 0, 49);
  if (playerRetailBuildingId >= 0) {
    registerRetailStore(world, playerRetailBuildingId);
  }
  
  console.log(`[初始化] 创建了 ${retailCompanies.length} 家零售公司，共 ${world.retail.count} 家零售店`);
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
  b.recipeIds[buildingId] = -1;
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
  
  return buildingId;
}