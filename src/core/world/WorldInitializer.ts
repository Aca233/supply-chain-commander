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
import { ALL_GOODS, GoodsId } from '@/data/goods';
import { ALL_BUILDINGS, isRetailBuilding, BuildingId } from '@/data/buildings';
import {
  BASE_INTEREST_RATE,
  GOODS_COUNT,
  INITIAL_MONEY_SUPPLY,
  MAX_SLOTS,
  PLAYER_INITIAL_CASH,
  TARGET_INFLATION,
  TICKS_PER_DAY,
  BUILDING_MATERIAL_ORDER_EXPIRY,
} from '../constants';
import {
  getDefaultSlotMethods,
  getBuildingProductionVariants,
  getBuildingSlotCount,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '../production/ProductionMethods';
import {
  resolveLegacyBuildingMethodSelection,
  resolveLegacyOutputModeToSlotMethods,
} from '../production/legacyOutputModeBridge';
import { initializeBuildingProductionControl } from '../production/ProductionControl';
import { createBuyOrder, createSellOrder, resetOrderPool } from '../market/OrderBook';
import { initRetailSystem, registerRetailStore } from '../economy/RetailSystem';
import { buildingIndex, inventoryIndex, resetAllIndices } from '../performance/DataStructures';
import { AI_COMPANIES, AICompanyConfig, OutputModeId } from '../ai/AIPersonality';
import {
  getBootstrapBuyerCompanyIds,
  seedBootstrapBuyOrders,
  seedInventoryBackedSellOrders,
} from './MarketBootstrap';

// ==================== 生产模式追踪系统 ====================

interface ProductionTracker {
  goodsProducerCount: Map<number, number>;
}

function createProductionTracker(): ProductionTracker {
  return {
    goodsProducerCount: new Map(),
  };
}

function recordSlotMethodAssignment(
  tracker: ProductionTracker,
  buildingTypeId: number,
  slotMethods: number[],
): void {
  const recipe = getRecipeForBuilding(buildingTypeId, slotMethods);

  for (const output of recipe.outputs) {
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

type BuildingMethodSelection = Parameters<typeof resolveLegacyBuildingMethodSelection>[1];
const HOUSEHOLD_BOOTSTRAP_CASH_SHARE = 0.1;
const STARTUP_INPUT_BUFFER_DAYS = 4;

/**
 * 初始化游戏世界
 */
export function initializeWorld(): GameWorld {
  const world = createGameWorld();
  
  resetAllIndices();
  initializeBuildingProductionMethods();
  resetGlobalProductionTracker();
  
  initializeGoods(world);
  initializePlayerCompany(world);
  initializeAICompanies(world);
  initializeMarketState(world);
  resetOrderPool();
  generateInitialMarketOrders(world);
  initializeRetailStores(world);

  seedBootstrapLiquidity(world);

  return world;
}

function seedBootstrapLiquidity(world: GameWorld): void {
  // 日模型下直接把全部货币注入家庭侧会导致企业端长期缺流动性。
  // 开局只把一小部分放入家庭现金池，其余按 AI 公司初始规模分配到企业侧，
  // 让消费循环和工资回流发生在一个可闭合的量级上。
  const householdCash = INITIAL_MONEY_SUPPLY * HOUSEHOLD_BOOTSTRAP_CASH_SHARE;
  world.households.cash[0] = householdCash;
  world.households.totalWagesReceived = 0;
  world.households.totalConsumptionSpent = 0;

  const corporateLiquidity = Math.max(0, INITIAL_MONEY_SUPPLY - householdCash);
  let aiCashBase = 0;

  for (let companyId = 1; companyId < world.companies.count; companyId++) {
    if (!world.companies.isAI[companyId]) continue;
    aiCashBase += Math.max(0, world.companies.cash[companyId] || 0);
  }

  if (aiCashBase <= 0 || corporateLiquidity <= 0) {
    return;
  }

  for (let companyId = 1; companyId < world.companies.count; companyId++) {
    if (!world.companies.isAI[companyId]) continue;

    const baseCash = Math.max(0, world.companies.cash[companyId] || 0);
    const allocation = corporateLiquidity * (baseCash / aiCashBase);
    world.companies.cash[companyId] += allocation;
    world.companies.totalAssets[companyId] += allocation;
  }
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
    { id: GoodsId.IRON_ORE, amount: 1000 },
    { id: GoodsId.COAL, amount: 500 },
    { id: GoodsId.COPPER_ORE, amount: 300 },
    { id: GoodsId.TIMBER, amount: 200 },
    { id: GoodsId.GRAIN, amount: 500 },
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
    { buildingTypeId: BuildingId.IRON_MINE, slotMethods: getDefaultSlotMethods(BuildingId.IRON_MINE) },
    { buildingTypeId: BuildingId.STEEL_MILL, slotMethods: getDefaultSlotMethods(BuildingId.STEEL_MILL) },
    {
      buildingTypeId: BuildingId.FARM,
      slotMethods:
        resolveLegacyOutputModeToSlotMethods(BuildingId.FARM, OutputModeId.FARM_GRAIN),
    },
  ];

  for (const config of starterBuildings) {
    const building = ALL_BUILDINGS.find(b => b.id === config.buildingTypeId);

    if (building) {
      try {
        addBuilding(world, playerId, config.buildingTypeId, { slotMethods: config.slotMethods });
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
      { goodsId: GoodsId.STEEL, amount: 2000 + Math.random() * 3000 },
      { goodsId: GoodsId.CEMENT, amount: 1500 + Math.random() * 2000 },
      { goodsId: GoodsId.TIMBER, amount: 800 + Math.random() * 1200 },
      { goodsId: GoodsId.GLASS, amount: 600 + Math.random() * 800 },
      { goodsId: GoodsId.BUILDING_MATERIALS, amount: 800 + Math.random() * 1200 },
      { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 300 + Math.random() * 400 },
      { goodsId: GoodsId.MOTOR, amount: 50 + Math.random() * 80 },
      { goodsId: GoodsId.MECHANICAL_PARTS, amount: 300 + Math.random() * 400 },
      { goodsId: GoodsId.FUEL, amount: 500 + Math.random() * 800 },
      { goodsId: GoodsId.PLASTIC, amount: 400 + Math.random() * 600 },
      { goodsId: GoodsId.RUBBER, amount: 200 + Math.random() * 300 },
      { goodsId: GoodsId.ELECTRONICS, amount: 100 + Math.random() * 200 },
      { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 10 + Math.random() * 20 },
    ];
    
    for (const mat of buildingMaterialsInit) {
      if (mat.goodsId < GOODS_COUNT) {
        const currentInv = world.companies.inventories[companyId * GOODS_COUNT + mat.goodsId] || 0;
        setInventory(world, companyId, mat.goodsId, currentInv + Math.floor(mat.amount));
      }
    }
    
    // 创建建筑（统一配置已预解析为 slotMethods）
    const tracker = getGlobalProductionTracker();
    
    for (const buildingConfig of ai.initialBuildings) {
      for (let count = 0; count < buildingConfig.count; count++) {
        try {
          const slotMethods = [...buildingConfig.slotMethods];
          addBuilding(world, companyId, buildingConfig.typeId, { slotMethods });
          if (slotMethods.length > 0) {
            recordSlotMethodAssignment(tracker, buildingConfig.typeId, slotMethods);
          }
        } catch (e) {
          console.warn(`[初始化] 无法为 ${ai.name} 添加建筑类型 ${buildingConfig.typeId}:`, e);
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
    // Demand is computed from the first real economy tick onward.
    // Seeding it from prices makes non-consumer demand carry phantom values forever.
    g.demands[i] = 0;
  }
  
  // GDP uses live activity after the first full in-game day.
  // Starting from zero avoids the opening “flash crash” caused by a placeholder value.
  world.economyStats.gdp = 0;
  world.economyStats.inflation = TARGET_INFLATION;
  world.economyStats.unemployment = 0.05;
  world.economyStats.interestRate = BASE_INTEREST_RATE;
  world.economyStats.cyclePhase = 'expansion';
  world.economyStats.cyclePosition = 0.38;
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
    
    generateStartupInputBuyOrders(world, companyId);
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

function generateStartupInputBuyOrders(world: GameWorld, companyId: number): void {
  const c = world.companies;
  const aggregatedDailyNeeds = new Map<number, number>();

  for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
    if (world.buildings.owners[buildingId] !== companyId) continue;
    if (!world.buildings.isActive[buildingId]) continue;

    const buildingTypeId = world.buildings.types[buildingId];
    const slotMethods = getBuildingSlotMethodsArray(world, buildingId);
    const production = getRecipeForBuilding(buildingTypeId, slotMethods);
    const ticksRequired = Math.max(1, production.ticksRequired || 1);

    for (const input of production.inputs) {
      const currentNeed = aggregatedDailyNeeds.get(input.goodsId) || 0;
      const dailyNeed = (input.amount * TICKS_PER_DAY) / ticksRequired;
      aggregatedDailyNeeds.set(input.goodsId, currentNeed + dailyNeed);
    }
  }

  for (const [goodsId, dailyNeed] of aggregatedDailyNeeds) {
    if (dailyNeed <= 0) continue;

    const inventoryIdx = companyId * GOODS_COUNT + goodsId;
    const availableInventory = Math.max(
      0,
      (c.inventories[inventoryIdx] || 0) - (c.inventoryReserved[inventoryIdx] || 0),
    );
    const targetInventory = Math.ceil(dailyNeed * STARTUP_INPUT_BUFFER_DAYS);
    const missingInventory = Math.max(0, targetInventory - availableInventory);
    if (missingInventory <= 5) continue;

    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;

    const referencePrice = Math.max(goods.basePrice, world.goods.prices[goodsId] || 0);
    const buyPrice = referencePrice * (0.96 + Math.random() * 0.08);
    const affordableQuantity = Math.floor(c.cash[companyId] / (buyPrice * 1.2));
    const actualBuyQuantity = Math.min(missingInventory, affordableQuantity);

    if (actualBuyQuantity > 5) {
      createBuyOrder(world, companyId, goodsId, actualBuyQuantity, buyPrice);
    }
  }
}

/**
 * 为公司添加建筑
 * 兼容旧 outputModeId，同时允许直接提供已解析的 slotMethods
 */
export function addBuilding(
  world: GameWorld,
  companyId: number,
  buildingTypeId: number,
  selection?: BuildingMethodSelection,
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
  b.isActive[buildingId] = 1;
  b.oversupplySuspendedGoods[buildingId] = -1;
  b.oversupplySuspendedUntilTick[buildingId] = 0;
  initializeBuildingProductionControl(world, buildingId);
  
  const initialMethods = resolveLegacyBuildingMethodSelection(buildingTypeId, selection);
  const slotOffset = buildingId * MAX_SLOTS;
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (i < initialMethods.length) {
      b.slotMethods[slotOffset + i] = initialMethods[i];
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
  
  buildingIndex.add(buildingId, companyId, buildingTypeId, -1);
  
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
 * AI 公司初始零售建筑分配表
 * 按人格匹配业态，覆盖全部 10 种零售类型，让 final 商品有零售出口
 */
const AI_RETAIL_ASSIGNMENTS: Array<{ companyId: number; retailTypeId: number }> = [
  // 食品/快消
  { companyId: 20, retailTypeId: BuildingId.CONVENIENCE_STORE }, // 统一食品 → 便利店
  { companyId: 9, retailTypeId: BuildingId.SUPERMARKET },         // 中粮集团 → 超市
  { companyId: 43, retailTypeId: BuildingId.SUPERMARKET },        // 冷链食品 → 超市
  // 电子/家电
  { companyId: 27, retailTypeId: BuildingId.ELECTRONICS_STORE },  // 海尔家电 → 电器商场
  { companyId: 26, retailTypeId: BuildingId.ELECTRONICS_STORE },  // 华为终端 → 电器商场
  // 汽车
  { companyId: 28, retailTypeId: BuildingId.CAR_DEALERSHIP },     // 比亚迪 → 4S 店
  { companyId: 29, retailTypeId: BuildingId.CAR_DEALERSHIP },     // 吉利汽车 → 4S 店
  // 服装
  { companyId: 19, retailTypeId: BuildingId.CLOTHING_STORE },     // 魏桥纺织 → 服装店
  // 家具
  { companyId: 30, retailTypeId: BuildingId.FURNITURE_MALL },     // 欧派家居 → 家具城
  // 医药
  { companyId: 34, retailTypeId: BuildingId.PHARMACY },           // 同仁堂 → 药房
  { companyId: 44, retailTypeId: BuildingId.PHARMACY },           // 医药生物 → 药房
  // 奢侈品
  { companyId: 37, retailTypeId: BuildingId.LUXURY_STORE },       // 珠宝集团 → 奢侈品店
  { companyId: 38, retailTypeId: BuildingId.LUXURY_STORE },       // 奢侈品工坊 → 奢侈品店
  // 能源服务
  { companyId: 40, retailTypeId: BuildingId.ENERGY_SERVICE_STORE },// 绿色电力 → 能源服务店
  { companyId: 31, retailTypeId: BuildingId.ENERGY_SERVICE_STORE },// 新能源设备 → 能源服务店
  // 综合百货
  { companyId: 41, retailTypeId: BuildingId.DEPARTMENT_STORE },   // 产业链投资 → 综合百货
  { companyId: 42, retailTypeId: BuildingId.DEPARTMENT_STORE },   // 供应链开拓 → 综合百货

  // 新增第二供应商的零售门店（让供给者直接面向消费者）
  { companyId: 46, retailTypeId: BuildingId.ELECTRONICS_STORE },  // 小米科技 → 电器商场
  { companyId: 47, retailTypeId: BuildingId.ELECTRONICS_STORE },  // 大疆创新 → 电器商场
  { companyId: 48, retailTypeId: BuildingId.CAR_DEALERSHIP },     // 上汽集团 → 4S 店
  { companyId: 49, retailTypeId: BuildingId.CAR_DEALERSHIP },     // 蔚来汽车 → 4S 店
  { companyId: 50, retailTypeId: BuildingId.FURNITURE_MALL },     // 红星家居 → 家具城
  { companyId: 51, retailTypeId: BuildingId.SUPERMARKET },        // 蒙牛食品 → 超市
  { companyId: 52, retailTypeId: BuildingId.ENERGY_SERVICE_STORE },// 阳光电源 → 能源服务店
  { companyId: 55, retailTypeId: BuildingId.PHARMACY },           // 复星医药 → 药房
  { companyId: 56, retailTypeId: BuildingId.PHARMACY },           // 鱼跃医疗 → 药房
  { companyId: 57, retailTypeId: BuildingId.LUXURY_STORE },       // 周大福 → 奢侈品店
  { companyId: 58, retailTypeId: BuildingId.CLOTHING_STORE },     // 江南布衣 → 服装店
];

/**
 * 初始化零售店
 *
 * 【v3.0更新】不再创建独立零售公司，只为玩家创建初始零售店
 * 【v3.1更新】为部分 AI 公司预置零售门店，让 final 商品有零售出口
 */
function initializeRetailStores(world: GameWorld): void {
  initRetailSystem(world);

  // 玩家初始便利店：默认开张，开局即进货营业
  const playerRetailBuildingId = addRetailBuilding(world, 0, BuildingId.CONVENIENCE_STORE);
  if (playerRetailBuildingId >= 0) {
    registerRetailStore(world, playerRetailBuildingId, { initialInventoryRatio: 0 });
  }

  // AI 公司初始零售门店（仅给已存在的 AI 公司分配）
  let aiRetailCount = 0;
  for (const { companyId, retailTypeId } of AI_RETAIL_ASSIGNMENTS) {
    if (companyId >= world.companies.count) continue; // 公司未创建则跳过
    const buildingId = addRetailBuilding(world, companyId, retailTypeId);
    if (buildingId >= 0) {
      registerRetailStore(world, buildingId, { initialInventoryRatio: 0 });
      aiRetailCount++;
    }
  }

  console.log(`[初始化] 创建了 ${world.retail.count} 家零售店（玩家 1 家 + AI ${aiRetailCount} 家）`);
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
    { goodsId: GoodsId.STEEL, name: '钢材', sellQty: 10000 },
    { goodsId: GoodsId.CEMENT, name: '水泥', sellQty: 6000 },
    { goodsId: GoodsId.TIMBER, name: '木材', sellQty: 4000 },
    { goodsId: GoodsId.GLASS, name: '玻璃', sellQty: 3000 },
    { goodsId: GoodsId.BUILDING_MATERIALS, name: '建筑材料', sellQty: 4000 },
    { goodsId: GoodsId.BUILDING_PRODUCTS, name: '建材成品', sellQty: 1500 },
    
    // 机械和电子材料
    { goodsId: GoodsId.MOTOR, name: '电机', sellQty: 400 },
    { goodsId: GoodsId.MECHANICAL_PARTS, name: '机械部件', sellQty: 2000 },
    { goodsId: GoodsId.ELECTRONICS, name: '电子元件', sellQty: 1000 },
    { goodsId: GoodsId.INDUSTRIAL_ROBOT, name: '工业机器人', sellQty: 200 },
    { goodsId: GoodsId.CHIPS, name: '芯片', sellQty: 300 },
    
    // 化工和能源材料
    { goodsId: GoodsId.PLASTIC, name: '塑料', sellQty: 2000 },
    { goodsId: GoodsId.RUBBER, name: '橡胶制品', sellQty: 1000 },
    { goodsId: GoodsId.CHEMICALS, name: '化学品', sellQty: 600 },
    { goodsId: GoodsId.FUEL, name: '燃油', sellQty: 3000 },
    
    // 高端建材（发电厂、物流中心等需要）
    { goodsId: GoodsId.SOLAR_SYSTEM, name: '光伏系统', sellQty: 50 },
    { goodsId: GoodsId.ENERGY_STORAGE, name: '储能系统', sellQty: 30 },
    { goodsId: GoodsId.DRONE, name: '无人机', sellQty: 60 },
    { goodsId: GoodsId.COMPUTER, name: '电脑', sellQty: 100 },
    
    // 零售店建材
    { goodsId: GoodsId.APPLIANCES, name: '家电', sellQty: 200 },
    { goodsId: GoodsId.FURNITURE, name: '家具', sellQty: 500 },
    { goodsId: GoodsId.CLOTHING, name: '服装', sellQty: 300 },
    { goodsId: GoodsId.CAR, name: '汽车', sellQty: 30 },
    { goodsId: GoodsId.ELECTRIC_CAR, name: '电动汽车', sellQty: 20 },
    { goodsId: GoodsId.JEWELRY, name: '珠宝', sellQty: 100 },
    { goodsId: GoodsId.SMARTPHONE, name: '智能手机', sellQty: 200 },
    { goodsId: GoodsId.MEDICAL_DEVICE, name: '医疗设备', sellQty: 20 },
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
      createSellOrder(world, companyId, mat.goodsId, qtyPerOrder, sellPrice, BUILDING_MATERIAL_ORDER_EXPIRY);
      ordersCreated++;
    }
  }
  
  console.log(`[初始化] 生成了${ordersCreated}个建筑材料初始卖单`);
}
