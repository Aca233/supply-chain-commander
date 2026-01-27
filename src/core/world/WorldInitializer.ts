/**
 * 游戏世界初始化器
 * 负责初始化游戏世界的所有数据
 */

import { GameWorld, createGameWorld, setInventory } from './GameWorld';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS, RETAIL_BUILDINGS, isRetailBuilding, BuildingTypeDefinition } from '@/data/buildings';
import { RECIPES, RecipeDefinition } from '@/data/recipes';
import { PLAYER_INITIAL_CASH, GOODS_COUNT, MAX_SLOTS, ACTUAL_GOODS_COUNT } from '../constants';
import { getDefaultSlotMethods, getBuildingSlotCount, initializeBuildingProductionMethods } from '../production/ProductionMethods';
import { createBuyOrder, createSellOrder, initOrderPool } from '../market/OrderBook';
import { initRetailSystem, registerRetailStore } from '../economy/RetailSystem';
import { buildingIndex, inventoryIndex, resetAllIndices } from '../performance/DataStructures';

// ==================== 智能配方分配系统 ====================

/**
 * 配方供应追踪器
 * 追踪每种商品已被分配生产的建筑数量
 */
interface RecipeSupplyTracker {
  // 商品ID -> 生产该商品的建筑数量
  goodsProducerCount: Map<number, number>;
  // 配方ID -> 已分配该配方的建筑数量
  recipeAssignmentCount: Map<number, number>;
}

/**
 * 创建配方供应追踪器
 */
function createRecipeSupplyTracker(): RecipeSupplyTracker {
  return {
    goodsProducerCount: new Map(),
    recipeAssignmentCount: new Map(),
  };
}

/**
 * 记录配方分配
 */
function recordRecipeAssignment(tracker: RecipeSupplyTracker, recipeId: number): void {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;
  
  // 增加配方分配计数
  tracker.recipeAssignmentCount.set(
    recipeId,
    (tracker.recipeAssignmentCount.get(recipeId) || 0) + 1
  );
  
  // 增加产出商品的生产者计数
  for (const output of recipe.outputs) {
    tracker.goodsProducerCount.set(
      output.goodsId,
      (tracker.goodsProducerCount.get(output.goodsId) || 0) + 1
    );
  }
}

/**
 * 计算配方的供应得分（越低表示越需要生产）
 *
 * 得分计算考虑：
 * 1. 产出商品当前的生产者数量（越少分数越低）
 * 2. 商品是否为消费品（消费品优先）
 * 3. 配方的产出数量（高产出优先）
 */
function calculateRecipeSupplyScore(
  tracker: RecipeSupplyTracker,
  recipe: RecipeDefinition
): number {
  let score = 0;
  
  for (const output of recipe.outputs) {
    const producerCount = tracker.goodsProducerCount.get(output.goodsId) || 0;
    const goods = ALL_GOODS.find(g => g.id === output.goodsId);
    
    // 基础分数：生产者数量
    let outputScore = producerCount * 100;
    
    // 消费品加权：消费品更需要供应
    if (goods?.isConsumerGood) {
      outputScore -= 50;  // 降低分数表示更需要
    }
    
    // 高层级商品通常更稀缺
    if (goods?.tier && goods.tier >= 3) {
      outputScore -= 20;
    }
    
    // 产出数量加权：高产出配方略优
    outputScore -= Math.min(output.amount / 10, 10);
    
    score += outputScore;
  }
  
  return score;
}

/**
 * 智能选择配方
 *
 * 对于拥有多个可用配方的建筑，选择当前供应最少的商品对应的配方
 *
 * @param buildingTypeId 建筑类型ID
 * @param tracker 供应追踪器
 * @param preferredOutputGoods 优先产出的商品ID列表（来自AI公司配置）
 * @returns 选择的配方ID
 */
function selectOptimalRecipe(
  buildingTypeId: number,
  tracker: RecipeSupplyTracker,
  preferredOutputGoods: number[] = []
): number {
  const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
  if (!building) return -1;
  
  const availableRecipes = building.availableRecipes;
  if (availableRecipes.length === 0) return building.defaultRecipeId;
  if (availableRecipes.length === 1) return availableRecipes[0];
  
  // 收集该建筑可用的配方
  const candidateRecipes: Array<{ recipe: RecipeDefinition; score: number }> = [];
  
  for (const recipeId of availableRecipes) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    let score = calculateRecipeSupplyScore(tracker, recipe);
    
    // 如果配方产出优先商品，降低分数（优先选择）
    for (const output of recipe.outputs) {
      if (preferredOutputGoods.includes(output.goodsId)) {
        score -= 200;  // 大幅降低分数
      }
    }
    
    candidateRecipes.push({ recipe, score });
  }
  
  if (candidateRecipes.length === 0) return building.defaultRecipeId;
  
  // 按分数排序，选择分数最低的（最需要生产的）
  candidateRecipes.sort((a, b) => a.score - b.score);
  
  return candidateRecipes[0].recipe.id;
}

/**
 * 智能分配建筑配方
 *
 * 确保：
 * 1. 每种可生产的商品都有至少一个生产者
 * 2. 供应分布均衡
 * 3. 优先满足消费品需求
 */
function assignBuildingRecipesIntelligently(
  buildingTypeId: number,
  buildingCount: number,
  tracker: RecipeSupplyTracker,
  preferredOutputGoods: number[] = []
): number[] {
  const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
  if (!building) return [];
  
  const availableRecipes = building.availableRecipes;
  const assignedRecipes: number[] = [];
  
  // 如果只有一个配方或没有配方，直接返回默认
  if (availableRecipes.length <= 1) {
    const defaultRecipe = availableRecipes[0] || building.defaultRecipeId;
    for (let i = 0; i < buildingCount; i++) {
      assignedRecipes.push(defaultRecipe);
      if (defaultRecipe >= 0) {
        recordRecipeAssignment(tracker, defaultRecipe);
      }
    }
    return assignedRecipes;
  }
  
  // 多个配方：智能分配
  // 策略1: 首先确保每种配方至少有一个建筑（如果建筑数量足够）
  // 策略2: 剩余建筑分配给供应最少的配方
  
  // 第一轮：每种配方分配一个（如果建筑足够）
  const recipesToDistribute = Math.min(availableRecipes.length, buildingCount);
  
  // 按当前供应得分排序配方
  const sortedRecipes = availableRecipes
    .map(recipeId => {
      const recipe = RECIPES.find(r => r.id === recipeId);
      return recipe ? { recipeId, score: calculateRecipeSupplyScore(tracker, recipe) } : null;
    })
    .filter(r => r !== null) as Array<{ recipeId: number; score: number }>;
  
  sortedRecipes.sort((a, b) => a.score - b.score);
  
  for (let i = 0; i < recipesToDistribute; i++) {
    const recipeId = sortedRecipes[i].recipeId;
    assignedRecipes.push(recipeId);
    recordRecipeAssignment(tracker, recipeId);
  }
  
  // 第二轮：剩余建筑分配给供应最少的配方
  for (let i = recipesToDistribute; i < buildingCount; i++) {
    const optimalRecipe = selectOptimalRecipe(buildingTypeId, tracker, preferredOutputGoods);
    assignedRecipes.push(optimalRecipe);
    if (optimalRecipe >= 0) {
      recordRecipeAssignment(tracker, optimalRecipe);
    }
  }
  
  return assignedRecipes;
}

/**
 * 初始化全局配方追踪器（在游戏开始时调用）
 */
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
  
  // 重置性能索引
  resetAllIndices();
  
  // 初始化建筑专属生产方式系统（必须在创建建筑之前）
  initializeBuildingProductionMethods();
  
  // 重置配方追踪器
  resetGlobalRecipeTracker();
  
  // 初始化商品数据
  initializeGoods(world);
  
  // 初始化玩家公司
  initializePlayerCompany(world);
  
  // 初始化AI公司
  initializeAICompanies(world);
  
  // 初始化初始市场状态
  initializeMarketState(world);
  
  // 初始化订单池
  initOrderPool();
  
  // 生成AI初始订单（让市场一开始就有交易）
  generateInitialMarketOrders(world);
  
  // 初始化零售系统（Pop只能在零售建筑消费）
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
    
    // 初始化价格历史为基准价格
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
  
  // 玩家初始库存 - 给一些基础原材料
  for (let i = 0; i < ALL_GOODS.length; i++) {
    setInventory(world, playerId, i, 0);
  }
  
  // 初始原材料：给玩家一些基础资源（参照goods.ts定义）
  const starterGoods = [
    { id: 0, amount: 1000 },  // 铁矿石
    { id: 3, amount: 500 },   // 煤炭 (ID 3)
    { id: 1, amount: 300 },   // 铜矿石 (ID 1)
    { id: 6, amount: 200 },   // 木材 (ID 6)
    { id: 8, amount: 500 },   // 粮食 (ID 8)
  ];
  
  for (const item of starterGoods) {
    if (item.id < ALL_GOODS.length) {
      setInventory(world, playerId, item.id, item.amount);
    }
  }
  
  // 给玩家初始建筑
  initializePlayerBuildings(world);
}

/**
 * 初始化玩家初始建筑
 */
function initializePlayerBuildings(world: GameWorld): void {
  const playerId = 0;
  
  // 玩家初始建筑配置（确保buildingTypeId与recipeId匹配）
  // 参照: buildings.ts的建筑定义 和 recipes.ts的配方定义
  const starterBuildings = [
    { buildingTypeId: 0, recipeId: 0 },   // 铁矿场(ID 0) - 铁矿开采(recipeId 0, buildingTypeId 0)
    { buildingTypeId: 8, recipeId: 10 },  // 钢铁厂(ID 8) - 钢铁冶炼(recipeId 10, buildingTypeId 8)
    { buildingTypeId: 6, recipeId: 6 },   // 农场(ID 6) - 粮食种植(recipeId 6, buildingTypeId 6)
  ];
  
  for (const config of starterBuildings) {
    // 检查建筑类型和配方是否存在
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
 * 初始化AI公司
 */
function initializeAICompanies(world: GameWorld): void {
  const c = world.companies;
  
  /**
   * 完整的AI公司配置 - 覆盖所有49种建筑类型
   *
   * 建筑类型参照 buildings.ts:
   * - 采掘类(0-7): 铁矿场、铜矿场、煤矿、油田、气田、伐木场、农场、硅石矿场
   * - 加工类(8-15): 钢铁厂、炼油厂、化工厂、玻璃厂、纺织厂、食品厂、水泥厂、铝冶炼厂
   * - 制造类(16-21): 电子厂、半导体厂、汽车工厂、家电厂、电池厂、零部件厂
   * - 服务类(22-24): 物流中心、仓储中心、发电厂
   * - 农业扩展(25-28): 蔬菜农场、畜牧场、渔场、肉类加工厂
   * - 医药(29-31): 药材种植园、制药厂、医疗器械厂
   * - 军工(32-34): 特钢厂、武器工厂、航空航天厂
   * - 奢侈品(35-36): 金矿、奢侈品工坊
   * - 科技(37-39): AI芯片厂、量子实验室、生物实验室
   * - 扩展(40-48): 橡胶园、锂矿场、造纸厂、橡胶厂、服装厂、家具厂、建材厂、机器人厂、新能源设备厂
   */
  const aiCompanies = [
    // ==================== 原材料采掘公司 (8家) ====================
    {
      name: '铁龙矿业',
      cash: 30000000,
      buildings: [
        { typeId: 0 },  // 铁矿场
        { typeId: 0 },  // 铁矿场
        { typeId: 2 },  // 煤矿
      ],
      starterGoods: [0, 3],  // 铁矿石、煤炭
      outputGoods: [0, 3],   // 铁矿石、煤炭
    },
    {
      name: '铜都资源',
      cash: 25000000,
      buildings: [
        { typeId: 1 },  // 铜矿场
        { typeId: 1 },  // 铜矿场
      ],
      starterGoods: [1],     // 铜矿石
      outputGoods: [1],      // 铜矿石
    },
    {
      name: '黑金能源',
      cash: 80000000,
      buildings: [
        { typeId: 3 },  // 油田
        { typeId: 4 },  // 气田
        { typeId: 4 },  // 气田
      ],
      starterGoods: [4, 5],  // 原油、天然气
      outputGoods: [4, 5],   // 原油、天然气
    },
    {
      name: '森林木业',
      cash: 15000000,
      buildings: [
        { typeId: 5 },  // 伐木场
        { typeId: 5 },  // 伐木场
        { typeId: 5 },  // 伐木场
      ],
      starterGoods: [6],     // 木材
      outputGoods: [6],      // 木材
    },
    {
      name: '丰收农业',
      cash: 20000000,
      buildings: [
        { typeId: 6 },   // 农场
        { typeId: 6 },   // 农场
        { typeId: 25 },  // 蔬菜农场
      ],
      starterGoods: [7, 8],  // 棉花、粮食
      outputGoods: [7, 8, 58, 59], // 棉花、粮食、蔬菜、水果
    },
    {
      name: '硅海矿业',
      cash: 35000000,
      buildings: [
        { typeId: 7 },  // 硅石矿场
        { typeId: 7 },  // 硅石矿场
      ],
      starterGoods: [9, 10], // 硅石、稀土
      outputGoods: [9, 10],  // 硅石、稀土
    },
    {
      name: '牧场集团',
      cash: 25000000,
      buildings: [
        { typeId: 26 },  // 畜牧场
        { typeId: 26 },  // 畜牧场
        { typeId: 27 },  // 渔场
      ],
      starterGoods: [8],     // 粮食（饲料）
      outputGoods: [60, 61, 62], // 牲畜、家禽、水产
    },
    {
      name: '橡胶林业',
      cash: 18000000,
      buildings: [
        { typeId: 40 },  // 橡胶园
        { typeId: 40 },  // 橡胶园
      ],
      starterGoods: [],      // 无需原材料
      outputGoods: [11],     // 天然橡胶
    },
    
    // ==================== 基础加工公司 (10家) ====================
    {
      name: '铁拳重工',
      cash: 50000000,
      buildings: [
        { typeId: 8 },  // 钢铁厂
        { typeId: 8 },  // 钢铁厂
        { typeId: 8 },  // 钢铁厂
      ],
      starterGoods: [0, 3, 1], // 铁矿石、煤炭、铜矿石
      outputGoods: [14, 15], // 钢材、铜材
    },
    {
      name: '绿叶能源',
      cash: 100000000,
      buildings: [
        { typeId: 9 },   // 炼油厂
        { typeId: 9 },   // 炼油厂
        { typeId: 24 },  // 发电厂
      ],
      starterGoods: [4, 5, 3], // 原油、天然气、煤炭
      outputGoods: [25, 12, 57], // 燃油、化工原料、电力
    },
    {
      name: '蓝天化工',
      cash: 40000000,
      buildings: [
        { typeId: 10 },  // 化工厂
        { typeId: 10 },  // 化工厂
      ],
      starterGoods: [12, 5, 70, 177], // 化工原料、天然气、药材、生物质
      outputGoods: [18, 20, 71, 81], // 塑料、化学品、医药化工品、炸药
    },
    {
      name: '晶华玻璃',
      cash: 25000000,
      buildings: [
        { typeId: 11 },  // 玻璃厂
        { typeId: 11 },  // 玻璃厂
      ],
      starterGoods: [9],     // 硅石
      outputGoods: [17],     // 玻璃
    },
    {
      name: '锦绣纺织',
      cash: 20000000,
      buildings: [
        { typeId: 12 },  // 纺织厂
        { typeId: 12 },  // 纺织厂
      ],
      starterGoods: [7],     // 棉花
      outputGoods: [23, 92], // 纺织品、丝绸
    },
    {
      name: '坚固水泥',
      cash: 30000000,
      buildings: [
        { typeId: 14 },  // 水泥厂
        { typeId: 14 },  // 水泥厂
      ],
      starterGoods: [9, 3],  // 硅石、煤炭
      outputGoods: [21],     // 水泥
    },
    {
      name: '轻盈铝业',
      cash: 45000000,
      buildings: [
        { typeId: 15 },  // 铝冶炼厂
        { typeId: 15 },  // 铝冶炼厂
      ],
      starterGoods: [],      // 自产铝土矿
      outputGoods: [2, 16],  // 铝土矿、铝材
    },
    {
      name: '肉联集团',
      cash: 28000000,
      buildings: [
        { typeId: 28 },  // 肉类加工厂
        { typeId: 28 },  // 肉类加工厂
      ],
      starterGoods: [60, 61, 62], // 牲畜、家禽、水产
      outputGoods: [63, 64], // 肉类、乳制品
    },
    {
      name: '造纸龙头',
      cash: 22000000,
      buildings: [
        { typeId: 42 },  // 造纸厂
        { typeId: 42 },  // 造纸厂
      ],
      starterGoods: [6],     // 木材
      outputGoods: [22, 37], // 纸张、包装材料
    },
    {
      name: '橡胶加工',
      cash: 25000000,
      buildings: [
        { typeId: 43 },  // 橡胶厂
        { typeId: 43 },  // 橡胶厂
      ],
      starterGoods: [11, 20], // 天然橡胶、化学品
      outputGoods: [19],     // 橡胶制品
    },
    
    // ==================== 高端制造公司 (12家) ====================
    {
      name: '智联电子',
      cash: 60000000,
      buildings: [
        { typeId: 16 },  // 电子厂
        { typeId: 16 },  // 电子厂
        { typeId: 16 },  // 电子厂
      ],
      starterGoods: [15, 18, 27, 28, 30], // 铜材、塑料、芯片、电池、屏幕
      outputGoods: [26, 38, 39, 40, 52, 55, 56, 83, 103], // 电子元件、手机、电脑、家电、无人机、高端手机、平价手机、军用电子、VR设备
    },
    {
      name: '星辰科技',
      cash: 80000000,
      buildings: [
        { typeId: 17 },  // 半导体厂
        { typeId: 17 },  // 半导体厂
      ],
      starterGoods: [9, 10, 20], // 硅石、稀土、化学品
      outputGoods: [27],     // 芯片
    },
    {
      name: '东方汽车',
      cash: 70000000,
      buildings: [
        { typeId: 18 },  // 汽车工厂
        { typeId: 18 },  // 汽车工厂
      ],
      starterGoods: [32, 26, 19, 17, 28, 29, 90], // 汽车零部件、电子元件、橡胶制品、玻璃、电池、电机、黄金
      outputGoods: [41, 42, 95], // 汽车、电动汽车、豪华汽车
    },
    {
      name: '海尔家电',
      cash: 55000000,
      buildings: [
        { typeId: 19 },  // 家电厂
        { typeId: 19 },  // 家电厂
      ],
      starterGoods: [14, 26, 18], // 钢材、电子元件、塑料
      outputGoods: [40],     // 家电
    },
    {
      name: '宁德电池',
      cash: 65000000,
      buildings: [
        { typeId: 20 },  // 电池厂
        { typeId: 20 },  // 电池厂
      ],
      starterGoods: [13, 15, 20], // 锂矿、铜材、化学品
      outputGoods: [28, 50], // 电池、储能系统
    },
    {
      name: '精工制造',
      cash: 45000000,
      buildings: [
        { typeId: 21 },  // 零部件厂
        { typeId: 21 },  // 零部件厂
        { typeId: 21 },  // 零部件厂
      ],
      starterGoods: [14, 15, 16, 17, 18, 26, 10, 80], // 钢材、铜材、铝材、玻璃、塑料、电子元件、稀土、特种钢
      outputGoods: [29, 30, 31, 32, 33], // 电机、屏幕、机械部件、汽车零部件、航空部件
    },
    // 【重要修复】四海食品：明确指定不同配方，确保饮料生产
    {
      name: '四海食品',
      cash: 30000000,
      buildings: [
        { typeId: 13, recipeId: 17 },  // 食品厂 - 食品加工(产出加工食品24)
        { typeId: 13, recipeId: 18 },  // 食品厂 - 饮料生产(产出饮料45) ★关键修复
        { typeId: 13, recipeId: 42 },  // 食品厂 - 高级食品(产出食品44)
      ],
      starterGoods: [8, 63, 58, 62, 59, 24, 37], // 粮食、肉类、蔬菜、水产、水果、加工食品、包装材料
      outputGoods: [24, 44, 45, 65, 66, 67, 68, 69], // 加工食品、食品、饮料、冷冻食品、罐头、零食、有机食品、宠物食品
    },
    // 【新增】饮料专业生产商 - 确保饮料产业链有足够产能
    {
      name: '可口饮品',
      cash: 25000000,
      buildings: [
        { typeId: 13, recipeId: 18 },  // 食品厂 - 饮料生产
        { typeId: 13, recipeId: 18 },  // 食品厂 - 饮料生产
        { typeId: 13, recipeId: 18 },  // 食品厂 - 饮料生产
      ],
      starterGoods: [8],     // 粮食（饮料原料）
      outputGoods: [45],     // 饮料
    },
    {
      name: '康美制药',
      cash: 80000000,
      buildings: [
        { typeId: 29 },  // 药材园
        { typeId: 29 },  // 药材园
        { typeId: 30 },  // 制药厂
        { typeId: 30 },  // 制药厂
        { typeId: 30 },  // 制药厂
        { typeId: 30 },  // 制药厂
      ],
      starterGoods: [20, 12, 37, 70, 71], // 化学品、化工原料、包装材料、药材、医药化工品
      outputGoods: [70, 71, 72, 73, 74, 75, 76], // 药材、医药化工品、抗生素、疫苗、仿制药、专利药、非处方药
    },
    {
      name: '辉瑞中国',
      cash: 120000000,
      buildings: [
        { typeId: 30 },  // 制药厂
        { typeId: 30 },  // 制药厂
        { typeId: 30 },  // 制药厂
      ],
      starterGoods: [70, 71, 20, 12], // 药材、医药化工品、化学品、化工原料
      outputGoods: [75, 73], // 专利药、疫苗
    },
    {
      name: '华海药业',
      cash: 60000000,
      buildings: [
        { typeId: 30 },  // 制药厂
        { typeId: 30 },  // 制药厂
      ],
      starterGoods: [70, 71, 20],
      outputGoods: [74, 76], // 仿制药、非处方药
    },
    {
      name: '医疗器械',
      cash: 60000000,
      buildings: [
        { typeId: 31 },  // 医疗器械厂
        { typeId: 31 },  // 医疗器械厂
      ],
      starterGoods: [18, 23, 26, 27, 14], // 塑料、纺织品、电子元件、芯片、钢材
      outputGoods: [48, 77, 78, 79], // 医疗设备、医用耗材、诊断设备、手术设备
    },
    {
      name: '时尚服装',
      cash: 25000000,
      buildings: [
        { typeId: 44 },  // 服装厂
        { typeId: 44 },  // 服装厂
        { typeId: 44 },  // 服装厂
      ],
      starterGoods: [23, 143, 140, 147], // 纺织品、羽绒、羊毛、毛织品
      outputGoods: [43],     // 服装
    },
    {
      name: '宜居家具',
      cash: 28000000,
      buildings: [
        { typeId: 45 },  // 家具厂
        { typeId: 45 },  // 家具厂
      ],
      starterGoods: [6, 14], // 木材、钢材
      outputGoods: [46],     // 家具
    },
    {
      name: '建材巨头',
      cash: 35000000,
      buildings: [
        { typeId: 46 },  // 建材厂
        { typeId: 46 },  // 建材厂
      ],
      starterGoods: [21, 14, 17], // 水泥、钢材、玻璃
      outputGoods: [36, 47], // 建筑材料、建材成品
    },
    
    // ==================== 高科技与特殊产业 (10家) ====================
    {
      name: '特钢集团',
      cash: 40000000,
      buildings: [
        { typeId: 32 },  // 特钢厂
        { typeId: 32 },  // 特钢厂
      ],
      starterGoods: [14, 10], // 钢材、稀土
      outputGoods: [80, 82], // 特种钢材、装甲板
    },
    {
      name: '北方军工',
      cash: 100000000,
      buildings: [
        { typeId: 33 },  // 武器工厂
        { typeId: 33 },  // 武器工厂
      ],
      starterGoods: [80, 81, 83], // 特种钢材、炸药、军用电子
      outputGoods: [84, 85, 86], // 轻武器、重武器、军用车辆
    },
    {
      name: '航空航天',
      cash: 200000000,
      buildings: [
        { typeId: 34 },  // 航空航天厂
      ],
      starterGoods: [33, 83, 80], // 航空部件、军用电子、特种钢材
      outputGoods: [87],     // 战斗机
    },
    {
      name: '珠宝奢侈',
      cash: 80000000,
      buildings: [
        { typeId: 35 },  // 金矿
        { typeId: 36 },  // 奢侈品工坊
      ],
      starterGoods: [88, 89, 92, 23, 90, 91], // 金矿石、钻石矿石、丝绸、纺织品、黄金、钻石
      outputGoods: [88, 89, 53, 54, 90, 91, 93, 94], // 金矿石、钻石矿石、奢侈品、珠宝、黄金、钻石、设计师服装、奢侈腕表
    },
    {
      name: '寒武纪AI',
      cash: 120000000,
      buildings: [
        { typeId: 37 },  // AI芯片厂
        { typeId: 37 },  // AI芯片厂
      ],
      starterGoods: [27, 10], // 芯片、稀土
      outputGoods: [96, 99], // AI芯片、AI服务器
    },
    {
      name: '量子科技',
      cash: 300000000,
      buildings: [
        { typeId: 38 },  // 量子实验室
      ],
      starterGoods: [96, 10], // AI芯片、稀土
      outputGoods: [97, 100], // 量子组件、量子计算机
    },
    {
      name: '生命科学',
      cash: 60000000,
      buildings: [
        { typeId: 39 },  // 生物实验室
        { typeId: 39 },  // 生物实验室
      ],
      starterGoods: [20],    // 化学品
      outputGoods: [98, 101], // 生物材料、生物制品
    },
    {
      name: '锂电资源',
      cash: 35000000,
      buildings: [
        { typeId: 41 },  // 锂矿场
        { typeId: 41 },  // 锂矿场
      ],
      starterGoods: [],      // 无需原材料
      outputGoods: [13],     // 锂矿
    },
    {
      name: '机器人科技',
      cash: 70000000,
      buildings: [
        { typeId: 47 },  // 机器人厂
        { typeId: 47 },  // 机器人厂
      ],
      starterGoods: [31, 26, 27, 96], // 机械部件、电子元件、芯片、AI芯片
      outputGoods: [51, 102], // 工业机器人、智能机器人
    },
    {
      name: '新能源装备',
      cash: 50000000,
      buildings: [
        { typeId: 48 },  // 新能源设备厂
        { typeId: 48 },  // 新能源设备厂
      ],
      starterGoods: [9, 17, 16, 28, 177, 180], // 硅石、玻璃、铝材、电池、生物质、生物燃料
      outputGoods: [34, 35, 49], // 光伏板、风机叶片、光伏系统
    },
    
    // ==================== 新增产业链公司 ====================
    
    // 日化产业链 (建筑59-61, 商品104-115)
    {
      name: '棕榈日化',
      cash: 25000000,
      buildings: [
        { typeId: 59 },  // 棕榈种植园
        { typeId: 59 },  // 棕榈种植园
      ],
      starterGoods: [],
      outputGoods: [104, 105], // 棕榈油(104)、香料原料(105)
    },
    {
      name: '宝洁中国',
      cash: 60000000,
      buildings: [
        { typeId: 60 },  // 日化厂
        { typeId: 60 },  // 日化厂
        { typeId: 61 },  // 洗涤用品厂
      ],
      starterGoods: [104, 105, 20], // 棕榈油、香料原料、化学品
      outputGoods: [106, 107, 108, 109, 110, 111, 112, 113, 114, 115], // 表面活性剂(106)到口腔护理用品(115)
    },
    {
      name: '蓝月亮',
      cash: 30000000,
      buildings: [
        { typeId: 61 },  // 洗涤用品厂
        { typeId: 61 },  // 洗涤用品厂
      ],
      starterGoods: [106, 20], // 表面活性剂、化学品
      outputGoods: [110, 111, 112, 113, 114, 115], // 清洁剂原液(110)到口腔护理用品(115)
    },
    
    // 交通运输设备 (建筑62-66, 商品116-127)
    {
      name: '正新轮胎',
      cash: 35000000,
      buildings: [
        { typeId: 62 },  // 轮胎厂
        { typeId: 62 },  // 轮胎厂
      ],
      starterGoods: [19, 23], // 橡胶制品、纺织品
      outputGoods: [116, 117], // 轮胎(116)、汽车座椅(117)
    },
    {
      name: '捷安特',
      cash: 20000000,
      buildings: [
        { typeId: 63 },  // 自行车厂
        { typeId: 63 },  // 自行车厂
      ],
      starterGoods: [14, 16, 19], // 钢材、铝材、橡胶制品
      outputGoods: [121, 122, 123], // 自行车(121)、摩托车(122)、电动滑板车(123)
    },
    {
      name: '中远船舶',
      cash: 200000000,
      buildings: [
        { typeId: 64 },  // 造船厂
      ],
      starterGoods: [14, 29, 26], // 钢材、电机、电子元件
      outputGoods: [118, 124], // 船舶部件(118)、船舶(124)
    },
    {
      name: '中车集团',
      cash: 150000000,
      buildings: [
        { typeId: 65 },  // 铁路车辆厂
      ],
      starterGoods: [14, 29, 26, 16], // 钢材、电机、电子元件、铝材
      outputGoods: [119, 125], // 铁路车辆部件(119)、铁路车辆(125)
    },
    {
      name: '中国商飞',
      cash: 250000000,
      buildings: [
        { typeId: 66 },  // 民用航空厂
      ],
      starterGoods: [33, 16, 26, 29], // 航空部件、铝材、电子元件、电机
      outputGoods: [120, 126, 127], // 航空发动机(120)、民用飞机(126)、公交车(127)
    },
    
    // 矿业扩展 (建筑67-69, 商品128-139)
    {
      name: '多金属矿业',
      cash: 40000000,
      buildings: [
        { typeId: 67 },  // 多金属矿场
        { typeId: 67 },  // 多金属矿场
        { typeId: 68 },  // 战略金属矿场
      ],
      starterGoods: [],
      outputGoods: [128, 129, 130, 131, 132, 133], // 锌矿石(128)到钨矿石(133)
    },
    {
      name: '有色冶炼',
      cash: 55000000,
      buildings: [
        { typeId: 69 },  // 有色金属冶炼厂
        { typeId: 69 },  // 有色金属冶炼厂
      ],
      starterGoods: [128, 129, 130, 131, 132, 133], // 各种矿石
      outputGoods: [134, 135, 136, 137, 138, 139], // 锌(134)到钨(139)
    },
    
    // 纺织扩展 (建筑70-72, 商品140-149)
    {
      name: '羊毛纺织',
      cash: 25000000,
      buildings: [
        { typeId: 70 },  // 牧羊场
        { typeId: 70 },  // 牧羊场
      ],
      starterGoods: [8],     // 粮食（饲料）
      outputGoods: [140, 141, 143], // 羊毛(140)、亚麻(141)、羽绒(143)
    },
    {
      name: '皮革制品',
      cash: 35000000,
      buildings: [
        { typeId: 71, recipeId: 232 },  // 制革厂 - 麻布生产 ★确保麻布有生产者
        { typeId: 71 },  // 制革厂 - 智能分配其他配方
        { typeId: 72 },  // 皮具厂
      ],
      starterGoods: [60, 20, 140, 141], // 牲畜（生皮）、化学品、羊毛、亚麻
      outputGoods: [142, 144, 145, 146, 147, 148, 149], // 生皮(142)、毛纱(144)、麻布(145)、皮革(146)、毛织品(147)、皮具(148)、鞋类(149)
    },
    
    // 建材扩展 (建筑73-75, 商品150-159)
    {
      name: '粘土建材',
      cash: 22000000,
      buildings: [
        { typeId: 73 },  // 粘土矿场
        { typeId: 74 },  // 砖瓦厂
      ],
      starterGoods: [],
      outputGoods: [150, 151, 152, 153, 154], // 粘土(150)、大理石(151)、砖(152)、瓷砖(153)、木板(154)
    },
    {
      name: '陶瓷卫浴',
      cash: 40000000,
      buildings: [
        { typeId: 75 },  // 陶瓷厂
        { typeId: 75 },  // 陶瓷厂
      ],
      starterGoods: [150, 151, 17, 20], // 粘土(150)、大理石(151)、玻璃、化学品
      outputGoods: [155, 156, 157, 158, 159], // 涂料(155)、陶瓷制品(156)、卫浴设备(157)、餐具(158)、装饰材料(159)
    },
    
    // 农产品深加工 (建筑76-79, 商品160-175)
    {
      name: '经济作物',
      cash: 28000000,
      buildings: [
        { typeId: 76 },  // 经济作物种植园
        { typeId: 76 },  // 经济作物种植园
      ],
      starterGoods: [],
      outputGoods: [160, 161, 162, 163, 164, 165], // 葡萄(160)、甘蔗(161)、茶叶(162)、咖啡豆(163)、烟叶(164)、油料作物(165)
    },
    {
      name: '金龙鱼',
      cash: 35000000,
      buildings: [
        { typeId: 77 },  // 制糖厂
        { typeId: 77 },  // 制糖厂
      ],
      starterGoods: [161, 165, 8], // 甘蔗(161)、油料作物(165)、粮食
      outputGoods: [166, 167, 168], // 糖(166)、食用油(167)、面粉(168)
    },
    {
      name: '茅台集团',
      cash: 80000000,
      buildings: [
        { typeId: 78 },  // 酿酒厂
        { typeId: 78 },  // 酿酒厂
      ],
      starterGoods: [160, 8, 166], // 葡萄(160)、粮食、糖(166)
      outputGoods: [169, 170, 171], // 啤酒(169)、葡萄酒(170)、烈酒(171)
    },
    {
      name: '星巴克供应',
      cash: 45000000,
      buildings: [
        { typeId: 79 },  // 饮品厂
        { typeId: 79 },  // 饮品厂
      ],
      starterGoods: [162, 163, 164, 166], // 茶叶(162)、咖啡豆(163)、烟叶(164)、糖(166)
      outputGoods: [172, 173, 174, 175], // 茶饮(172)、咖啡(173)、烟草制品(174)、糖果(175)
    },
    
    // 能源扩展 (建筑80-83, 商品176-185)
    {
      name: '中核集团',
      cash: 500000000,
      buildings: [
        { typeId: 80 },  // 铀矿场
        { typeId: 81 },  // 核燃料厂
      ],
      starterGoods: [],
      outputGoods: [176, 177, 178, 179, 180], // 铀矿石(176)、生物质(177)、核燃料(178)、氢气(179)、生物燃料(180)
    },
    {
      name: '国核工程',
      cash: 600000000,
      buildings: [
        { typeId: 82 },  // 核电设备厂
      ],
      starterGoods: [178, 80, 27], // 核燃料(178)、特种钢材、芯片
      outputGoods: [181], // 核反应堆(181)
    },
    {
      name: '特变电工',
      cash: 60000000,
      buildings: [
        { typeId: 83 },  // 电力设备厂
        { typeId: 83 },  // 电力设备厂
      ],
      starterGoods: [15, 14, 18], // 铜材、钢材、塑料
      outputGoods: [182, 183, 184, 185], // 燃料电池(182)、风力发电机(183)、变压器(184)、电力电缆(185)
    },
    
    // 通信产业链 (建筑84-87, 商品186-195)
    {
      name: '长飞光纤',
      cash: 45000000,
      buildings: [
        { typeId: 84 },  // 光纤厂
        { typeId: 84 },  // 光纤厂
      ],
      starterGoods: [9, 17], // 硅石、玻璃
      outputGoods: [186], // 光纤(186)
    },
    {
      name: '华为设备',
      cash: 80000000,
      buildings: [
        { typeId: 85 },  // 通信设备厂
        { typeId: 86 },  // 网络设备厂
      ],
      starterGoods: [27, 26, 186], // 芯片、电子元件、光纤(186)
      outputGoods: [187, 188, 189, 190, 191, 192, 194, 195], // 天线(187)到智能手表(195)
    },
    {
      name: '中国航天',
      cash: 400000000,
      buildings: [
        { typeId: 87 },  // 卫星工厂
      ],
      starterGoods: [33, 27, 26], // 航空部件、芯片、电子元件
      outputGoods: [193], // 卫星(193)
    },
    
    // 服务业 (建筑88-93, 商品196-209)
    {
      name: '新东方',
      cash: 30000000,
      buildings: [
        { typeId: 88 },  // 学校
        { typeId: 88 },  // 学校
      ],
      starterGoods: [],
      outputGoods: [196], // 教育服务(196)
    },
    {
      name: '协和医院',
      cash: 80000000,
      buildings: [
        { typeId: 89 },  // 医院
      ],
      starterGoods: [74, 75, 76], // 仿制药、专利药、非处方药
      outputGoods: [197], // 医疗服务(197)
    },
    {
      name: '招商银行',
      cash: 200000000,
      buildings: [
        { typeId: 90 },  // 银行
      ],
      starterGoods: [],
      outputGoods: [198], // 金融服务(198)
    },
    {
      name: '万豪酒店',
      cash: 100000000,
      buildings: [
        { typeId: 91 },  // 酒店
        { typeId: 91 },  // 酒店
      ],
      starterGoods: [24, 45], // 加工食品、饮料
      outputGoods: [199, 200, 201], // 娱乐服务(199)、餐饮服务(200)、住宿服务(201)
    },
    {
      name: '顺丰速运',
      cash: 50000000,
      buildings: [
        { typeId: 92 },  // 运输公司
        { typeId: 92 },  // 运输公司
      ],
      starterGoods: [25], // 燃油
      outputGoods: [202, 203, 204], // 运输服务(202)、清洁服务(203)、安保服务(204)
    },
    {
      name: '麦肯锡',
      cash: 40000000,
      buildings: [
        { typeId: 93 },  // 咨询公司
        { typeId: 93 },  // 咨询公司
      ],
      starterGoods: [],
      outputGoods: [205, 206, 207, 208, 209], // 广告服务(205)到研发服务(209)
    },
    
    // 文化传媒 (建筑94-97, 商品210-219)
    {
      name: '人民日报',
      cash: 25000000,
      buildings: [
        { typeId: 94 },  // 印刷厂
        { typeId: 94 },  // 印刷厂
      ],
      starterGoods: [22, 20], // 纸张、化学品
      outputGoods: [210, 212, 213], // 印刷油墨(210)、图书(212)、杂志报刊(213)
    },
    {
      name: '华谊兄弟',
      cash: 150000000,
      buildings: [
        { typeId: 95 },  // 影视制作中心
      ],
      starterGoods: [26, 39], // 电子元件、电脑
      outputGoods: [211, 214, 215], // 影视设备(211)、音乐专辑(214)、电影(215)
    },
    {
      name: '米哈游',
      cash: 80000000,
      buildings: [
        { typeId: 96 },  // 游戏工作室
        { typeId: 96 },  // 游戏工作室
      ],
      starterGoods: [39], // 电脑
      outputGoods: [216], // 电子游戏(216)
    },
    {
      name: '乐高玩具',
      cash: 40000000,
      buildings: [
        { typeId: 97 },  // 玩具厂
        { typeId: 97 },  // 玩具厂
      ],
      starterGoods: [18, 6], // 塑料、木材
      outputGoods: [217, 218, 219], // 玩具(217)、运动器材(218)、乐器(219)
    },
    
    // 杂项 (建筑98-100, 商品220-229)
    {
      name: 'YKK拉链',
      cash: 20000000,
      buildings: [
        { typeId: 98 },  // 配件厂
        { typeId: 98 },  // 配件厂
      ],
      starterGoods: [14, 18], // 钢材、塑料
      outputGoods: [220, 221], // 拉链(220)、纽扣(221)
    },
    {
      name: '精细化工',
      cash: 70000000,
      buildings: [
        { typeId: 99 },  // 精细化工厂
        { typeId: 99 },  // 精细化工厂
      ],
      starterGoods: [12, 20, 9], // 化工原料、化学品、硅石
      outputGoods: [222, 223, 224, 225], // 光刻胶(222)、惰性气体(223)、催化剂(224)、胶粘剂(225)
    },
    {
      name: '精密制造',
      cash: 50000000,
      buildings: [
        { typeId: 100 },  // 精密零件厂
        { typeId: 100 },  // 精密零件厂
      ],
      starterGoods: [14, 19, 20], // 钢材、橡胶制品、化学品
      outputGoods: [226, 227, 228, 229], // 轴承(226)、弹簧(227)、密封件(228)、过滤器(229)
    },
  ];
  
  for (let i = 0; i < aiCompanies.length; i++) {
    const ai = aiCompanies[i];
    const companyId = c.count;
    
    c.count++;
    c.cash[companyId] = ai.cash;
    c.totalAssets[companyId] = ai.cash;
    c.totalLiabilities[companyId] = 0;
    c.names.push(ai.name);
    c.isPlayer.push(false);
    c.isAI.push(true);
    
    // AI初始库存 - 清零
    for (let j = 0; j < ALL_GOODS.length; j++) {
      setInventory(world, companyId, j, 0);
    }
    
    // 给AI初始原材料（大幅增加数量，用于生产和市场流动性）
    // 由于已删除做市商，AI公司需要承担更多的市场流动性责任
    for (const goodsId of ai.starterGoods) {
      if (goodsId < GOODS_COUNT) {
        // 根据商品价值调整初始数量（增加2-3倍）
        const basePrice = ALL_GOODS.find(g => g.id === goodsId)?.basePrice || 100;
        let baseAmount: number;
        if (basePrice > 10000) {
          baseAmount = 50 + Math.random() * 80;   // 高价商品
        } else if (basePrice > 1000) {
          baseAmount = 300 + Math.random() * 400;
        } else if (basePrice > 100) {
          baseAmount = 1500 + Math.random() * 1500;
        } else {
          baseAmount = 3000 + Math.random() * 3000;  // 低价商品大量
        }
        setInventory(world, companyId, goodsId, baseAmount);
      }
    }
    
    // 给AI初始成品库存（大幅增加，用于立即销售和市场深度）
    for (const goodsId of ai.outputGoods) {
      if (goodsId < GOODS_COUNT) {
        const basePrice = ALL_GOODS.find(g => g.id === goodsId)?.basePrice || 100;
        let baseAmount: number;
        if (basePrice > 50000) {
          baseAmount = 15 + Math.random() * 25;   // 超高价商品
        } else if (basePrice > 10000) {
          baseAmount = 60 + Math.random() * 90;   // 高价商品
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
    
    // 给AI初始建筑 - 使用智能配方分配系统
    const tracker = getGlobalRecipeTracker();
    
    // 按建筑类型分组
    const buildingsByType = new Map<number, Array<{ typeId: number; recipeId?: number }>>();
    for (const buildingConfig of ai.buildings) {
      const typeId = buildingConfig.typeId;
      if (!buildingsByType.has(typeId)) {
        buildingsByType.set(typeId, []);
      }
      buildingsByType.get(typeId)!.push(buildingConfig);
    }
    
    // 对每种建筑类型智能分配配方
    for (const [buildingTypeId, configs] of buildingsByType) {
      // 检查是否有手动指定配方的配置
      const manualRecipes: (number | undefined)[] = configs.map(c =>
        'recipeId' in c ? c.recipeId : undefined
      );
      
      // 统计需要智能分配的建筑数量
      const needAutoAssign = manualRecipes.filter(r => r === undefined).length;
      
      // 智能分配配方
      const autoAssignedRecipes = needAutoAssign > 0
        ? assignBuildingRecipesIntelligently(buildingTypeId, needAutoAssign, tracker, ai.outputGoods)
        : [];
      
      let autoIndex = 0;
      
      // 创建建筑
      for (let i = 0; i < configs.length; i++) {
        let recipeId = manualRecipes[i];
        
        // 如果没有手动指定，使用智能分配的配方
        if (recipeId === undefined) {
          recipeId = autoAssignedRecipes[autoIndex];
          autoIndex++;
          
          // 如果智能分配也没有找到，使用默认配方
          if (recipeId === undefined) {
            const recipe = RECIPES.find(r => r.buildingTypeId === buildingTypeId);
            recipeId = recipe?.id;
          }
        } else {
          // 手动指定的配方也要记录到追踪器
          recordRecipeAssignment(tracker, recipeId);
        }
        
        if (recipeId !== undefined) {
          try {
            addBuilding(world, companyId, buildingTypeId, recipeId);
          } catch (e) {
            // 建筑数量已达上限时忽略
            console.warn(`[初始化] 无法为 ${ai.name} 添加建筑类型 ${buildingTypeId}:`, e);
          }
        }
      }
    }
  }
  
  console.log(`[初始化] 创建了 ${aiCompanies.length} 家AI公司`);
}

/**
 * 初始化市场状态
 * 设置初始供需和价格
 */
function initializeMarketState(world: GameWorld): void {
  const g = world.goods;
  
  // 为每种商品设置初始供需（模拟市场已有状态）
  for (let i = 0; i < g.count; i++) {
    // 初始供需平衡
    const basePrice = g.baseValues[i];
    g.supplies[i] = basePrice * 100;  // 供给量与价格成正比
    g.demands[i] = basePrice * 100;   // 需求量初始平衡
  }
  
  // 初始化经济指标
  world.economyStats.gdp = 10000000000;  // 100亿初始GDP
  world.economyStats.inflation = 0;
  world.economyStats.unemployment = 0.05;
  world.economyStats.interestRate = 0.03;
  world.economyStats.cyclePhase = 'expansion';
  world.economyStats.cyclePosition = 0.5;
}

/**
 * 生成初始市场订单
 * 在游戏开始时，AI公司会立即挂出一些订单
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
        // 有库存，挂卖单（降低库存门槛从50到30）
        const currentPrice = world.goods.prices[goodsId];
        const goods = ALL_GOODS.find(g => g.id === goodsId);
        const basePrice = goods?.basePrice || currentPrice;
        
        // 修复：价格更激进，在基准价格的 88%-100% 之间（更容易成交）
        const sellPrice = basePrice * (0.88 + Math.random() * 0.12);
        // 卖出库存的 40%-70%（增加市场流动性）
        const sellQuantity = Math.floor(inventory * (0.4 + Math.random() * 0.3));
        
        if (sellQuantity > 5) {
          createSellOrder(world, companyId, goodsId, sellQuantity, sellPrice);
        }
      }
    }
    
    // 为AI需要的原材料挂买单
    // 获取AI的建筑，查找它需要什么原材料
    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      if (world.buildings.owners[buildingId] !== companyId) continue;
      
      const recipeId = world.buildings.recipeIds[buildingId];
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!recipe) continue;
      
      // 为每种输入材料挂买单
      for (const input of recipe.inputs) {
        const currentPrice = world.goods.prices[input.goodsId];
        const goods = ALL_GOODS.find(g => g.id === input.goodsId);
        const basePrice = goods?.basePrice || currentPrice;
        
        // 修复：买入价格更高，愿意支付95%-115%基准价（确保能成交）
        const buyPrice = basePrice * (0.95 + Math.random() * 0.2);
        // 买入量 = 15-40 个生产周期的需求（增加采购量）
        const buyQuantity = Math.floor(input.amount * (15 + Math.random() * 25));
        
        if (buyQuantity > 5 && c.cash[companyId] >= buyQuantity * buyPrice * 1.2) {
          createBuyOrder(world, companyId, input.goodsId, buyQuantity, buyPrice);
        }
      }
    }
  }
  
  // 为所有商品生成市场订单（确保每种商品都有买卖单）
  // 覆盖全部104种商品 (ID 0-103)
  const popularGoods = [
    // ==================== 原材料（层级0）ID 0-13 ====================
    { id: 0, name: '铁矿石' },
    { id: 1, name: '铜矿石' },
    { id: 2, name: '铝土矿' },
    { id: 3, name: '煤炭' },
    { id: 4, name: '原油' },
    { id: 5, name: '天然气' },
    { id: 6, name: '木材' },
    { id: 7, name: '棉花' },
    { id: 8, name: '粮食' },
    { id: 9, name: '硅石' },
    { id: 10, name: '稀土' },
    { id: 11, name: '天然橡胶' },
    { id: 12, name: '化工原料' },
    { id: 13, name: '锂矿' },
    // ==================== 基础材料（层级1）ID 14-25 ====================
    { id: 14, name: '钢材' },
    { id: 15, name: '铜材' },
    { id: 16, name: '铝材' },
    { id: 17, name: '玻璃' },
    { id: 18, name: '塑料' },
    { id: 19, name: '橡胶制品' },
    { id: 20, name: '化学品' },
    { id: 21, name: '水泥' },
    { id: 22, name: '纸张' },
    { id: 23, name: '纺织品' },
    { id: 24, name: '加工食品' },
    { id: 25, name: '燃油' },
    // ==================== 中间产品（层级2）ID 26-37 ====================
    { id: 26, name: '电子元件' },
    { id: 27, name: '芯片' },
    { id: 28, name: '电池' },
    { id: 29, name: '电机' },
    { id: 30, name: '屏幕' },
    { id: 31, name: '机械部件' },
    { id: 32, name: '汽车零部件' },
    { id: 33, name: '航空部件' },
    { id: 34, name: '光伏板' },
    { id: 35, name: '风机叶片' },
    { id: 36, name: '建筑材料' },
    { id: 37, name: '包装材料' },
    // ==================== 最终产品（层级3）ID 38-57 ====================
    { id: 38, name: '智能手机' },
    { id: 39, name: '电脑' },
    { id: 40, name: '家电' },
    { id: 41, name: '汽车' },
    { id: 42, name: '电动汽车' },
    { id: 43, name: '服装' },
    { id: 44, name: '食品' },
    { id: 45, name: '饮料' },
    { id: 46, name: '家具' },
    { id: 47, name: '建材成品' },
    { id: 48, name: '医疗设备' },
    { id: 49, name: '光伏系统' },
    { id: 50, name: '储能系统' },
    { id: 51, name: '工业机器人' },
    { id: 52, name: '无人机' },
    { id: 53, name: '奢侈品' },
    { id: 54, name: '珠宝' },
    { id: 55, name: '高端手机' },
    { id: 56, name: '平价手机' },
    { id: 57, name: '电力' },
    // ==================== 农业产业链扩展（ID 58-69）====================
    { id: 58, name: '蔬菜' },
    { id: 59, name: '水果' },
    { id: 60, name: '牲畜' },
    { id: 61, name: '家禽' },
    { id: 62, name: '水产' },
    { id: 63, name: '肉类' },
    { id: 64, name: '乳制品' },
    { id: 65, name: '冷冻食品' },
    { id: 66, name: '罐头食品' },
    { id: 67, name: '零食' },
    { id: 68, name: '有机食品' },
    { id: 69, name: '宠物食品' },
    // ==================== 医药产业链扩展（ID 70-79）====================
    { id: 70, name: '药材' },
    { id: 71, name: '医药化工品' },
    { id: 72, name: '抗生素' },
    { id: 73, name: '疫苗' },
    { id: 74, name: '仿制药' },
    { id: 75, name: '专利药' },
    { id: 76, name: '非处方药' },
    { id: 77, name: '医用耗材' },
    { id: 78, name: '诊断设备' },
    { id: 79, name: '手术设备' },
    // ==================== 军工产业链扩展（ID 80-87）====================
    { id: 80, name: '特种钢材' },
    { id: 81, name: '炸药' },
    { id: 82, name: '装甲板' },
    { id: 83, name: '军用电子' },
    { id: 84, name: '轻武器' },
    { id: 85, name: '重武器' },
    { id: 86, name: '军用车辆' },
    { id: 87, name: '战斗机' },
    // ==================== 奢侈品产业链扩展（ID 88-95）====================
    { id: 88, name: '金矿石' },
    { id: 89, name: '钻石矿石' },
    { id: 90, name: '黄金' },
    { id: 91, name: '钻石' },
    { id: 92, name: '丝绸' },
    { id: 93, name: '设计师服装' },
    { id: 94, name: '奢侈腕表' },
    { id: 95, name: '豪华汽车' },
    // ==================== 科技产业链扩展（ID 96-103）====================
    { id: 96, name: 'AI芯片' },
    { id: 97, name: '量子组件' },
    { id: 98, name: '生物材料' },
    { id: 99, name: 'AI服务器' },
    { id: 100, name: '量子计算机' },
    { id: 101, name: '生物制品' },
    { id: 102, name: '智能机器人' },
    { id: 103, name: 'VR设备' },
    // ==================== 新增产业链商品（ID 104-229）====================
    // 日化产业链
    { id: 104, name: '棕榈油' },
    { id: 105, name: '香料' },
    { id: 106, name: '表面活性剂' },
    { id: 107, name: '香精' },
    { id: 108, name: '颜料' },
    { id: 109, name: '化妆品基质' },
    { id: 110, name: '清洁剂基料' },
    { id: 111, name: '化妆品' },
    { id: 112, name: '护肤品' },
    { id: 113, name: '洗涤用品' },
    { id: 114, name: '洗发护发' },
    { id: 115, name: '口腔护理' },
    // 交通运输
    { id: 116, name: '轮胎' },
    { id: 117, name: '汽车座椅' },
    { id: 118, name: '自行车' },
    { id: 119, name: '摩托车' },
    { id: 120, name: '电动滑板车' },
    { id: 121, name: '船舶部件' },
    { id: 122, name: '船舶' },
    { id: 123, name: '铁路车辆部件' },
    { id: 124, name: '铁路车辆' },
    { id: 125, name: '航空发动机' },
    { id: 126, name: '民用飞机' },
    { id: 127, name: '公交车' },
    // 矿业扩展
    { id: 128, name: '锌矿石' },
    { id: 129, name: '镍矿石' },
    { id: 130, name: '锡矿石' },
    { id: 131, name: '钴矿石' },
    { id: 132, name: '锰矿石' },
    { id: 133, name: '钨矿石' },
    { id: 134, name: '锌' },
    { id: 135, name: '镍' },
    { id: 136, name: '锡' },
    { id: 137, name: '钴' },
    { id: 138, name: '锰' },
    { id: 139, name: '钨' },
    // 纺织扩展 (ID 140-149)
    { id: 140, name: '羊毛' },
    { id: 141, name: '亚麻' },
    { id: 142, name: '生皮' },
    { id: 143, name: '羽绒' },
    { id: 144, name: '毛纱' },
    { id: 145, name: '麻布' },
    { id: 146, name: '皮革' },
    { id: 147, name: '毛织品' },
    { id: 148, name: '皮具' },
    { id: 149, name: '鞋类' },
    // 建材扩展 (ID 150-159)
    { id: 150, name: '粘土' },
    { id: 151, name: '大理石' },
    { id: 152, name: '砖' },
    { id: 153, name: '瓷砖' },
    { id: 154, name: '木板' },
    { id: 155, name: '涂料' },
    { id: 156, name: '陶瓷制品' },
    { id: 157, name: '卫浴设备' },
    { id: 158, name: '餐具' },
    { id: 159, name: '装饰材料' },
    // 农产品深加工 (ID 160-175)
    { id: 160, name: '葡萄' },
    { id: 161, name: '甘蔗' },
    { id: 162, name: '茶叶' },
    { id: 163, name: '咖啡豆' },
    { id: 164, name: '烟叶' },
    { id: 165, name: '油料作物' },
    { id: 166, name: '糖' },
    { id: 167, name: '食用油' },
    { id: 168, name: '面粉' },
    { id: 169, name: '啤酒' },
    { id: 170, name: '葡萄酒' },
    { id: 171, name: '烈酒' },
    { id: 172, name: '茶饮' },
    { id: 173, name: '咖啡' },
    { id: 174, name: '烟草制品' },
    { id: 175, name: '糖果' },
    // 能源扩展 (ID 176-185)
    { id: 176, name: '铀矿石' },
    { id: 177, name: '生物质' },
    { id: 178, name: '核燃料' },
    { id: 179, name: '氢气' },
    { id: 180, name: '生物燃料' },
    { id: 181, name: '核反应堆' },
    { id: 182, name: '燃料电池' },
    { id: 183, name: '风力发电机' },
    { id: 184, name: '变压器' },
    { id: 185, name: '电力电缆' },
    // 通信产业链 (ID 186-195)
    { id: 186, name: '光纤' },
    { id: 187, name: '天线' },
    { id: 188, name: '传感器' },
    { id: 189, name: '存储芯片' },
    { id: 190, name: '显示面板' },
    { id: 191, name: '路由器' },
    { id: 192, name: '通信基站' },
    { id: 193, name: '卫星' },
    { id: 194, name: '平板电脑' },
    { id: 195, name: '智能手表' },
    // 服务业 (ID 196-209)
    { id: 196, name: '教育服务' },
    { id: 197, name: '医疗服务' },
    { id: 198, name: '金融服务' },
    { id: 199, name: '娱乐服务' },
    { id: 200, name: '餐饮服务' },
    { id: 201, name: '住宿服务' },
    { id: 202, name: '运输服务' },
    { id: 203, name: '清洁服务' },
    { id: 204, name: '安保服务' },
    { id: 205, name: '广告服务' },
    { id: 206, name: '法律服务' },
    { id: 207, name: '咨询服务' },
    { id: 208, name: '软件服务' },
    { id: 209, name: '研发服务' },
    // 文化传媒 (ID 210-219)
    { id: 210, name: '印刷油墨' },
    { id: 211, name: '影视设备' },
    { id: 212, name: '图书' },
    { id: 213, name: '杂志报刊' },
    { id: 214, name: '音乐专辑' },
    { id: 215, name: '电影' },
    { id: 216, name: '电子游戏' },
    { id: 217, name: '玩具' },
    { id: 218, name: '运动器材' },
    { id: 219, name: '乐器' },
    // 杂项 (ID 220-229)
    { id: 220, name: '拉链' },
    { id: 221, name: '纽扣' },
    { id: 222, name: '光刻胶' },
    { id: 223, name: '惰性气体' },
    { id: 224, name: '催化剂' },
    { id: 225, name: '胶粘剂' },
    { id: 226, name: '轴承' },
    { id: 227, name: '弹簧' },
    { id: 228, name: '密封件' },
    { id: 229, name: '过滤器' },
  ];
  
  // 为每个热门商品，由随机AI公司挂单
  // 增加订单数量和规模，弥补做市商缺失后的流动性
  for (const pop of popularGoods) {
    const goodsId = pop.id;
    if (goodsId >= world.goods.count) continue;
    
    const basePrice = ALL_GOODS.find(g => g.id === goodsId)?.basePrice || 100;
    
    // 生成 5-10 个买单（大幅增加市场深度）
    for (let i = 0; i < 5 + Math.floor(Math.random() * 6); i++) {
      const companyId = 1 + Math.floor(Math.random() * (c.count - 1));
      if (companyId >= c.count || !c.isAI[companyId]) continue;
      
      // 买入价格区间 90%-108%，确保能与卖单匹配
      const buyPrice = basePrice * (0.90 + Math.random() * 0.18);
      const buyQuantity = Math.floor(50 + Math.random() * 200);
      
      if (c.cash[companyId] >= buyQuantity * buyPrice * 1.2) {
        createBuyOrder(world, companyId, goodsId, buyQuantity, buyPrice);
      }
    }
    
    // 生成 5-10 个卖单（大幅增加市场深度）
    for (let i = 0; i < 5 + Math.floor(Math.random() * 6); i++) {
      const companyId = 1 + Math.floor(Math.random() * (c.count - 1));
      if (companyId >= c.count || !c.isAI[companyId]) continue;
      
      // 确保有库存可卖
      const inventory = world.companies.inventories[companyId * GOODS_COUNT + goodsId];
      if (inventory < 100) {
        // 给这个公司更多库存
        setInventory(world, companyId, goodsId, 400 + Math.random() * 600);
      }
      
      // 卖出价格区间 88%-103%，更容易与买单匹配
      const sellPrice = basePrice * (0.88 + Math.random() * 0.15);
      const sellQuantity = Math.floor(50 + Math.random() * 200);
      
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
  
  // 初始化生产方式槽位
  const defaultMethods = getDefaultSlotMethods(buildingTypeId);
  const slotOffset = buildingId * MAX_SLOTS;
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (i < defaultMethods.length) {
      b.slotMethods[slotOffset + i] = defaultMethods[i];
    } else {
      b.slotMethods[slotOffset + i] = 0;  // 无方法
    }
  }
  
  // 清空输入输出缓冲区
  for (let i = 0; i < 8; i++) {
    b.inputBuffers[buildingId * 8 + i] = 0;
  }
  for (let i = 0; i < 4; i++) {
    b.outputBuffers[buildingId * 4 + i] = 0;
  }
  
  // 添加到建筑索引
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
  
  console.log(`[getBuildingSlotMethodsArray] buildingId=${buildingId}, typeId=${buildingTypeId}, slotCount=${slotCount}, slotOffset=${slotOffset}`);
  
  const methods: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    const value = b.slotMethods[slotOffset + i];
    methods.push(value);
    console.log(`  slot[${i}] = slotMethods[${slotOffset + i}] = ${value}`);
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
 * 在游戏开始时预置一些零售店，让Pop有地方消费
 */
function initializeRetailStores(world: GameWorld): void {
  // 初始化零售系统数据结构
  initRetailSystem(world);
  
  const c = world.companies;
  
  // 预置零售店配置
  // 由多家AI零售商经营不同类型的店铺
  const retailCompanies = [
    {
      name: '全家便利',
      cash: 5000000,
      stores: [
        { buildingTypeId: 49 },  // 便利店
        { buildingTypeId: 49 },  // 便利店
        { buildingTypeId: 49 },  // 便利店
      ],
    },
    {
      name: '永辉超市',
      cash: 20000000,
      stores: [
        { buildingTypeId: 50 },  // 超市
        { buildingTypeId: 50 },  // 超市
      ],
    },
    {
      name: '沃尔玛',
      cash: 50000000,
      stores: [
        { buildingTypeId: 51 },  // 大卖场
      ],
    },
    {
      name: '苏宁电器',
      cash: 30000000,
      stores: [
        { buildingTypeId: 52 },  // 电子商城
        { buildingTypeId: 52 },  // 电子商城
      ],
    },
    {
      name: '广汽4S',
      cash: 80000000,
      stores: [
        { buildingTypeId: 53 },  // 汽车4S店
      ],
    },
    {
      name: '优衣库',
      cash: 15000000,
      stores: [
        { buildingTypeId: 54 },  // 服装店
        { buildingTypeId: 54 },  // 服装店
      ],
    },
    {
      name: '卡地亚精品',
      cash: 100000000,
      stores: [
        { buildingTypeId: 55 },  // 奢侈品店
      ],
    },
    {
      name: '大参林药房',
      cash: 10000000,
      stores: [
        { buildingTypeId: 56 },  // 药店
        { buildingTypeId: 56 },  // 药店
      ],
    },
    {
      name: '中石化',
      cash: 40000000,
      stores: [
        { buildingTypeId: 57 },  // 加油站
        { buildingTypeId: 57 },  // 加油站
        { buildingTypeId: 57 },  // 加油站
      ],
    },
    {
      name: '宜家家居',
      cash: 60000000,
      stores: [
        { buildingTypeId: 58 },  // 家居商城
      ],
    },
  ];
  
  // 创建零售公司和店铺
  for (const retailCo of retailCompanies) {
    const companyId = c.count;
    
    // 创建公司
    c.count++;
    c.cash[companyId] = retailCo.cash;
    c.totalAssets[companyId] = retailCo.cash;
    c.totalLiabilities[companyId] = 0;
    c.names.push(retailCo.name);
    c.isPlayer.push(false);
    c.isAI.push(true);
    
    // 初始化库存为0
    for (let j = 0; j < ALL_GOODS.length; j++) {
      setInventory(world, companyId, j, 0);
    }
    
    // 为每家店铺创建建筑并注册为零售店
    for (const store of retailCo.stores) {
      const buildingId = addRetailBuilding(world, companyId, store.buildingTypeId);
      if (buildingId >= 0) {
        // 注册到零售系统
        registerRetailStore(world, buildingId);
      }
    }
  }
  
  // 给玩家一个便利店作为起始零售业务
  const playerRetailBuildingId = addRetailBuilding(world, 0, 49);  // 便利店
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
  b.recipeIds[buildingId] = -1;  // 零售建筑没有生产配方
  b.isActive[buildingId] = 1;
  
  // 零售建筑不需要生产方式槽位
  const slotOffset = buildingId * MAX_SLOTS;
  for (let i = 0; i < MAX_SLOTS; i++) {
    b.slotMethods[slotOffset + i] = 0;
  }
  
  // 清空输入输出缓冲区
  for (let i = 0; i < 8; i++) {
    b.inputBuffers[buildingId * 8 + i] = 0;
  }
  for (let i = 0; i < 4; i++) {
    b.outputBuffers[buildingId * 4 + i] = 0;
  }
  
  return buildingId;
}