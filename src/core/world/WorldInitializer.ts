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
import { initializeSubsidiaries } from '../production/subsidiaries';

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
 */
function calculateRecipeSupplyScore(
  tracker: RecipeSupplyTracker,
  recipe: RecipeDefinition
): number {
  let score = 0;
  
  for (const output of recipe.outputs) {
    const producerCount = tracker.goodsProducerCount.get(output.goodsId) || 0;
    const goods = ALL_GOODS.find(g => g.id === output.goodsId);
    
    let outputScore = producerCount * 100;
    
    if (goods?.isConsumerGood) {
      outputScore -= 50;
    }
    
    if (goods?.tier && goods.tier >= 3) {
      outputScore -= 20;
    }
    
    outputScore -= Math.min(output.amount / 10, 10);
    
    score += outputScore;
  }
  
  return score;
}

/**
 * 智能选择配方
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
  
  const candidateRecipes: Array<{ recipe: RecipeDefinition; score: number }> = [];
  
  for (const recipeId of availableRecipes) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) continue;
    
    let score = calculateRecipeSupplyScore(tracker, recipe);
    
    for (const output of recipe.outputs) {
      if (preferredOutputGoods.includes(output.goodsId)) {
        score -= 200;
      }
    }
    
    candidateRecipes.push({ recipe, score });
  }
  
  if (candidateRecipes.length === 0) return building.defaultRecipeId;
  
  candidateRecipes.sort((a, b) => a.score - b.score);
  
  return candidateRecipes[0].recipe.id;
}

/**
 * 智能分配建筑配方
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
  
  const recipesToDistribute = Math.min(availableRecipes.length, buildingCount);
  
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
  
  for (let i = recipesToDistribute; i < buildingCount; i++) {
    const optimalRecipe = selectOptimalRecipe(buildingTypeId, tracker, preferredOutputGoods);
    assignedRecipes.push(optimalRecipe);
    if (optimalRecipe >= 0) {
      recordRecipeAssignment(tracker, optimalRecipe);
    }
  }
  
  return assignedRecipes;
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
    { id: 0, amount: 1000 },
    { id: 3, amount: 500 },
    { id: 1, amount: 300 },
    { id: 6, amount: 200 },
    { id: 8, amount: 500 },
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
    { buildingTypeId: 0, recipeId: 0 },
    { buildingTypeId: 8, recipeId: 10 },
    { buildingTypeId: 6, recipeId: 6 },
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
 * 初始化AI公司 - 产业链平衡优化版
 * 
 * 设计原则：
 * 1. 上游产能 ≥ 下游消耗 × 1.5（安全余量）
 * 2. 每个建筑明确指定配方（recipeId）
 * 3. 关键消费品优先保障
 * 4. 建材产能充足支撑AI建造
 */
function initializeAICompanies(world: GameWorld): void {
  const c = world.companies;
  
  const aiCompanies = [
    // ==================== A. 原材料采掘公司 (10家) ====================
    
    // 1. 中钢矿业 - 铁矿专业
    {
      name: '中钢矿业',
      cash: 50000000,
      buildings: [
        { typeId: 0, recipeId: 0 },   // 铁矿场-铁矿开采
        { typeId: 0, recipeId: 0 },
        { typeId: 0, recipeId: 0 },
        { typeId: 0, recipeId: 0 },
        { typeId: 0, recipeId: 0 },
      ],
      starterGoods: [0],
      outputGoods: [0],
    },
    
    // 1.5 神华煤炭 - 煤炭专业 ★关键：煤炭是钢铁、水泥、发电的核心原料
    {
      name: '神华煤炭',
      cash: 80000000,
      buildings: [
        { typeId: 2, recipeId: 2 },   // 煤矿-煤炭开采
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
      ],
      starterGoods: [3],
      outputGoods: [3],
    },
    
    // 1.6 兖矿集团 - 煤炭补充
    {
      name: '兖矿集团',
      cash: 60000000,
      buildings: [
        { typeId: 2, recipeId: 2 },   // 煤矿-煤炭开采
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
        { typeId: 2, recipeId: 2 },
      ],
      starterGoods: [3],
      outputGoods: [3],
    },
    
    // 2. 五矿铜业 - 铜矿专业
    {
      name: '五矿铜业',
      cash: 40000000,
      buildings: [
        { typeId: 1, recipeId: 1 },   // 铜矿场-铜矿开采
        { typeId: 1, recipeId: 1 },
        { typeId: 1, recipeId: 1 },
        { typeId: 1, recipeId: 1 },
      ],
      starterGoods: [1],
      outputGoods: [1],
    },
    
    // 3. 中石油 - 油气开采 ★关键：原油是化工原料的来源
    {
      name: '中石油',
      cash: 200000000,
      buildings: [
        { typeId: 3, recipeId: 3 },   // 油田-原油开采
        { typeId: 3, recipeId: 3 },
        { typeId: 3, recipeId: 3 },
        { typeId: 3, recipeId: 3 },
        { typeId: 3, recipeId: 3 },
        { typeId: 4, recipeId: 4 },   // 气田-天然气开采
        { typeId: 4, recipeId: 4 },
        { typeId: 4, recipeId: 4 },
      ],
      starterGoods: [4, 5],
      outputGoods: [4, 5],
    },
    
    // 3.5 延长石油 - 原油补充
    {
      name: '延长石油',
      cash: 100000000,
      buildings: [
        { typeId: 3, recipeId: 3 },   // 油田-原油开采
        { typeId: 3, recipeId: 3 },
        { typeId: 3, recipeId: 3 },
        { typeId: 3, recipeId: 3 },
        { typeId: 3, recipeId: 3 },
      ],
      starterGoods: [4],
      outputGoods: [4],
    },
    
    // 4. 林业集团 - 木材
    {
      name: '林业集团',
      cash: 25000000,
      buildings: [
        { typeId: 5, recipeId: 5 },   // 伐木场-木材采伐
        { typeId: 5, recipeId: 5 },
        { typeId: 5, recipeId: 5 },
        { typeId: 5, recipeId: 5 },
        { typeId: 5, recipeId: 5 },
      ],
      starterGoods: [6],
      outputGoods: [6],
    },
    
    // 5. 中粮集团 - 农业综合
    {
      name: '中粮集团',
      cash: 35000000,
      buildings: [
        { typeId: 6, recipeId: 6 },   // 农场-粮食种植
        { typeId: 6, recipeId: 6 },
        { typeId: 6, recipeId: 6 },
        { typeId: 6, recipeId: 7 },   // 农场-棉花种植
        { typeId: 25, recipeId: 35 }, // 蔬菜农场-蔬菜种植
        { typeId: 25, recipeId: 36 }, // 蔬菜农场-水果种植
      ],
      starterGoods: [7, 8],
      outputGoods: [7, 8, 58, 59],
    },
    
    // 6. 硅海矿业 - 硅石专业 ★关键：硅石是玻璃、水泥、芯片的核心原料
    {
      name: '硅海矿业',
      cash: 60000000,
      buildings: [
        { typeId: 7, recipeId: 8 },   // 硅石矿场-硅石开采
        { typeId: 7, recipeId: 8 },
        { typeId: 7, recipeId: 8 },
        { typeId: 7, recipeId: 8 },
        { typeId: 7, recipeId: 8 },
        { typeId: 7, recipeId: 8 },
      ],
      starterGoods: [9],
      outputGoods: [9],
    },
    
    // 6.5 稀土集团 - 稀土专业
    {
      name: '稀土集团',
      cash: 50000000,
      buildings: [
        { typeId: 7, recipeId: 9 },   // 硅石矿场-稀土开采
        { typeId: 7, recipeId: 9 },
        { typeId: 7, recipeId: 9 },
        { typeId: 7, recipeId: 9 },
      ],
      starterGoods: [10],
      outputGoods: [10],
    },
    
    // 6.6 硅砂矿业 - 硅石补充
    {
      name: '硅砂矿业',
      cash: 45000000,
      buildings: [
        { typeId: 7, recipeId: 8 },   // 硅石矿场-硅石开采
        { typeId: 7, recipeId: 8 },
        { typeId: 7, recipeId: 8 },
        { typeId: 7, recipeId: 8 },
      ],
      starterGoods: [9],
      outputGoods: [9],
    },
    
    // 7. 新希望牧业 - 畜牧+水产
    {
      name: '新希望牧业',
      cash: 40000000,
      buildings: [
        { typeId: 26, recipeId: 37 }, // 畜牧场-牲畜养殖
        { typeId: 26, recipeId: 37 },
        { typeId: 26, recipeId: 38 }, // 畜牧场-家禽养殖
        { typeId: 27, recipeId: 39 }, // 渔场-水产养殖
        { typeId: 27, recipeId: 39 },
      ],
      starterGoods: [8],
      outputGoods: [60, 61, 62],
    },
    
    // 8. 橡胶锂矿 - 橡胶+锂矿
    {
      name: '橡胶锂矿',
      cash: 30000000,
      buildings: [
        { typeId: 40, recipeId: 64 }, // 橡胶园-天然橡胶
        { typeId: 40, recipeId: 64 },
        { typeId: 40, recipeId: 64 },
        { typeId: 41, recipeId: 65 }, // 锂矿场-锂矿开采
        { typeId: 41, recipeId: 65 },
      ],
      starterGoods: [],
      outputGoods: [11, 13],
    },
    
    // 9. 多金属矿业
    {
      name: '多金属矿业',
      cash: 55000000,
      buildings: [
 { typeId: 67, recipeId: 131 }, // 多金属矿场-锌矿
        { typeId: 67, recipeId: 132 }, // 多金属矿场-镍矿
        { typeId: 67, recipeId: 133 }, // 多金属矿场-锡矿
        { typeId: 68, recipeId: 134 }, // 战略金属矿场-钴矿
        { typeId: 68, recipeId: 135 }, // 战略金属矿场-锰矿
      ],
      starterGoods: [],
      outputGoods: [128, 129, 130, 131, 132, 133],
    },
    
    // 10. 经济作物种植
    {
      name: '经济作物',
      cash: 35000000,
      buildings: [
        { typeId: 76, recipeId: 162 }, // 经济作物种植园-葡萄
        { typeId: 76, recipeId: 163 }, // 甘蔗
        { typeId: 76, recipeId: 164 }, // 茶叶
        { typeId: 76, recipeId: 165 }, // 咖啡豆
        { typeId: 76, recipeId: 167 }, // 油料作物
      ],
      starterGoods: [],
      outputGoods: [160, 161, 162, 163, 164, 165],
    },
    
    // ==================== B. 基础加工公司 (12家) ====================
    
    // 11. 宝钢集团 - 钢铁
    {
      name: '宝钢集团',
      cash: 80000000,
      buildings: [
        { typeId: 8, recipeId: 10 },  // 钢铁厂-钢铁冶炼
        { typeId: 8, recipeId: 10 },
        { typeId: 8, recipeId: 10 },
        { typeId: 8, recipeId: 10 },
        { typeId: 8, recipeId: 11 },  // 钢铁厂-电弧炉炼钢
      ],
      starterGoods: [0, 3],
      outputGoods: [14],
    },
    
    // 12. 江铜冶炼 - 铜材
    {
      name: '江铜冶炼',
      cash: 50000000,
      buildings: [
        { typeId: 8, recipeId: 78 },  // 钢铁厂-铜冶炼
        { typeId: 8, recipeId: 78 },
        { typeId: 8, recipeId: 78 },
        { typeId: 8, recipeId: 78 },
      ],
      starterGoods: [1],
      outputGoods: [15],
    },
    
    // 13. 中石化 - 炼油专业 ★关键：化工原料是塑料、化学品的核心原料
    {
      name: '中石化',
      cash: 200000000,
      buildings: [
        { typeId: 9, recipeId: 12 },  // 炼油厂-石油精炼
        { typeId: 9, recipeId: 12 },
        { typeId: 9, recipeId: 12 },
        { typeId: 9, recipeId: 12 },
        { typeId: 9, recipeId: 12 },
        { typeId: 9, recipeId: 12 },
      ],
      starterGoods: [4],
      outputGoods: [25, 12],
    },
    
    // 13.5 中海油 - 炼油补充
    {
      name: '中海油',
      cash: 150000000,
      buildings: [
        { typeId: 9, recipeId: 12 },  // 炼油厂-石油精炼
        { typeId: 9, recipeId: 12 },
        { typeId: 9, recipeId: 12 },
        { typeId: 9, recipeId: 12 },
      ],
      starterGoods: [4],
      outputGoods: [25, 12],
    },
    
    // 13.6 塑料工业 - 塑料专业
    {
      name: '塑料工业',
      cash: 60000000,
      buildings: [
        { typeId: 10, recipeId: 13 }, // 化工厂-塑料生产
        { typeId: 10, recipeId: 13 },
        { typeId: 10, recipeId: 13 },
        { typeId: 10, recipeId: 13 },
        { typeId: 10, recipeId: 13 },
        { typeId: 10, recipeId: 13 },
      ],
      starterGoods: [12],
      outputGoods: [18],
    },
    
    // 14. 万华化学 - 化学品
    {
      name: '万华化学',
      cash: 60000000,
      buildings: [
        { typeId: 10, recipeId: 14 }, // 化工厂-化学品生产
        { typeId: 10, recipeId: 14 },
        { typeId: 10, recipeId: 14 },
        { typeId: 10, recipeId: 14 },
        { typeId: 10, recipeId: 14 },
      ],
      starterGoods: [12, 5],
      outputGoods: [20],
    },
    
    // 15. 福耀玻璃
    {
      name: '福耀玻璃',
      cash: 40000000,
      buildings: [
        { typeId: 11, recipeId: 15 }, // 玻璃厂-玻璃生产
        { typeId: 11, recipeId: 15 },
        { typeId: 11, recipeId: 15 },
        { typeId: 11, recipeId: 15 },
      ],
      starterGoods: [9],
      outputGoods: [17],
    },
    
    // 16. 魏桥纺织
    {
      name: '魏桥纺织',
      cash: 35000000,
      buildings: [
        { typeId: 12, recipeId: 16 }, // 纺织厂-纺织品生产
        { typeId: 12, recipeId: 16 },
        { typeId: 12, recipeId: 16 },
        { typeId: 12, recipeId: 99 }, // 纺织厂-丝绸生产
      ],
      starterGoods: [7],
      outputGoods: [23, 92],
    },
    
    // 17. 海螺水泥
    {
      name: '海螺水泥',
      cash: 50000000,
      buildings: [
        { typeId: 14, recipeId: 19 }, // 水泥厂-水泥生产
        { typeId: 14, recipeId: 19 },
        { typeId: 14, recipeId: 19 },
        { typeId: 14, recipeId: 19 },
        { typeId: 14, recipeId: 19 },
      ],
      starterGoods: [9, 3],
      outputGoods: [21],
    },
    
    // 18. 中铝集团
    {
      name: '中铝集团',
      cash: 60000000,
      buildings: [
        { typeId: 15, recipeId: 102 }, // 铝冶炼厂-铝土矿开采
        { typeId: 15, recipeId: 20 },  // 铝冶炼厂-铝冶炼
        { typeId: 15, recipeId: 20 },
        { typeId: 15, recipeId: 20 },
      ],
      starterGoods: [2],
      outputGoods: [2, 16],
    },
    
    // 19. 双汇食品
    {
      name: '双汇食品',
      cash: 45000000,
      buildings: [
        { typeId: 28, recipeId: 40 }, // 肉类加工厂-肉类加工
        { typeId: 28, recipeId: 40 },
        { typeId: 28, recipeId: 40 },
        { typeId: 28, recipeId: 41 }, // 肉类加工厂-乳制品生产
      ],
      starterGoods: [60, 61, 62],
      outputGoods: [63, 64],
    },
    
    // 20. 造纸集团
    {
      name: '造纸集团',
      cash: 35000000,
      buildings: [
        { typeId: 42, recipeId: 66 }, // 造纸厂-纸张生产
        { typeId: 42, recipeId: 66 },
        { typeId: 42, recipeId: 67 }, // 造纸厂-包装材料生产
        { typeId: 42, recipeId: 67 },
      ],
      starterGoods: [6],
      outputGoods: [22, 37],
    },
    
    // 21. 橡胶工业
    {
      name: '橡胶工业',
      cash: 40000000,
      buildings: [
        { typeId: 43, recipeId: 68 }, // 橡胶厂-橡胶制品生产
        { typeId: 43, recipeId: 68 },
        { typeId: 43, recipeId: 68 },
        { typeId: 43, recipeId: 68 },
      ],
      starterGoods: [11, 20],
      outputGoods: [19],
    },
    
    // 22. 有色冶炼
    {
      name: '有色冶炼',
      cash: 55000000,
      buildings: [
        { typeId: 69, recipeId: 137 }, // 有色金属冶炼厂-锌冶炼
        { typeId: 69, recipeId: 138 }, // 镍冶炼
        { typeId: 69, recipeId: 139 }, // 锡冶炼
        { typeId: 69, recipeId: 140 }, // 钴冶炼
      ],
      starterGoods: [128, 129, 130, 131],
      outputGoods: [134, 135, 136, 137],
    },
    
    // ==================== C. 电力与能源公司 (3家) ====================
    
    // 23. 华能集团
    {
      name: '华能集团',
      cash: 100000000,
      buildings: [
        { typeId: 24, recipeId: 32 }, // 发电厂-燃煤发电
        { typeId: 24, recipeId: 32 },
        { typeId: 24, recipeId: 33 }, // 发电厂-燃气发电
        { typeId: 24, recipeId: 33 },
        { typeId: 24, recipeId: 34 }, // 发电厂-光伏发电
      ],
      starterGoods: [3, 5],
      outputGoods: [57],
    },
    
    // 24. 中核集团
    {
      name: '中核集团',
      cash: 600000000,
      buildings: [
        { typeId: 80, recipeId: 178 }, // 铀矿场-铀矿开采
        { typeId: 80, recipeId: 179 }, // 铀矿场-生物质采集
        { typeId: 81, recipeId: 180 }, // 核燃料厂-核燃料生产
        { typeId: 81, recipeId: 181 }, // 核燃料厂-氢气生产
      ],
      starterGoods: [176],
      outputGoods: [176, 177, 178, 179],
    },
    
    // 25. 新能源集团
    {
      name: '新能源集团',
      cash: 80000000,
      buildings: [
        { typeId: 48, recipeId: 75 }, // 新能源设备厂-光伏板生产
        { typeId: 48, recipeId: 75 },
        { typeId: 48, recipeId: 76 }, // 新能源设备厂-风机叶片生产
        { typeId: 48, recipeId: 77 }, // 新能源设备厂-光伏系统组装
        { typeId: 83, recipeId: 185 }, // 电力设备厂-风力发电机生产
      ],
      starterGoods: [9, 17, 16],
      outputGoods: [34, 35, 49, 183],
    },
    
    // ==================== D. 电子与半导体公司 (5家) ====================
    
    // 26. 立讯精密 - 电子元件专业
    {
      name: '立讯精密',
      cash: 70000000,
      buildings: [
        { typeId: 16, recipeId: 21 }, // 电子厂-电子元件生产
        { typeId: 16, recipeId: 21 },
        { typeId: 16, recipeId: 21 },
        { typeId: 16, recipeId: 21 },
        { typeId: 16, recipeId: 21 },
        { typeId: 16, recipeId: 21 },
      ],
      starterGoods: [15, 18],
      outputGoods: [26],
    },
    
    // 27. 中芯国际 - 芯片
    {
      name: '中芯国际',
      cash: 100000000,
      buildings: [
        { typeId: 17, recipeId: 24 }, // 半导体厂-芯片生产
        { typeId: 17, recipeId: 24 },
        { typeId: 17, recipeId: 24 },
        { typeId: 17, recipeId: 24 },
      ],
      starterGoods: [9, 10, 20],
      outputGoods: [27],
    },
    
    // 28. 宁德时代 - 电池+储能
    {
      name: '宁德时代',
      cash: 90000000,
      buildings: [
        { typeId: 20, recipeId: 28 }, // 电池厂-电池生产
        { typeId: 20, recipeId: 28 },
        { typeId: 20, recipeId: 28 },
        { typeId: 20, recipeId: 28 },
        { typeId: 20, recipeId: 81 }, // 电池厂-储能系统生产
      ],
      starterGoods: [13, 15, 20],
      outputGoods: [28, 50],
    },
    
    // 29. 零部件集团 - 机械+汽车零部件
    {
      name: '零部件集团',
      cash: 70000000,
      buildings: [
        { typeId: 21, recipeId: 79 }, // 零部件厂-机械部件生产
        { typeId: 21, recipeId: 79 },
        { typeId: 21, recipeId: 79 },
        { typeId: 21, recipeId: 29 }, // 零部件厂-汽车零部件生产
        { typeId: 21, recipeId: 29 },
        { typeId: 21, recipeId: 29 },
      ],
      starterGoods: [14, 16, 18],
      outputGoods: [31, 32],
    },
    
    // 30. 屏幕电机厂 - 电机+屏幕
    {
      name: '屏幕电机厂',
      cash: 60000000,
      buildings: [
        { typeId: 21, recipeId: 30 }, // 零部件厂-电机生产
        { typeId: 21, recipeId: 30 },
        { typeId: 21, recipeId: 30 },
        { typeId: 21, recipeId: 31 }, // 零部件厂-屏幕生产
        { typeId: 21, recipeId: 31 },
        { typeId: 21, recipeId: 31 },
      ],
      starterGoods: [15, 14, 17, 26],
      outputGoods: [29, 30],
    },
    
    // ==================== E. 消费电子与家电公司 (4家) ====================
    
    // 31. 华为终端 - 手机
    {
      name: '华为终端',
      cash: 80000000,
      buildings: [
        { typeId: 16, recipeId: 22 }, // 电子厂-智能手机组装
        { typeId: 16, recipeId: 22 },
        { typeId: 16, recipeId: 83 }, // 电子厂-高端手机生产
        { typeId: 16, recipeId: 84 }, // 电子厂-平价手机生产
      ],
      starterGoods: [26, 27, 28, 17],
      outputGoods: [38, 55, 56],
    },
    
    // 32. 联想集团 - 电脑
    {
      name: '联想集团',
      cash: 70000000,
      buildings: [
        { typeId: 16, recipeId: 23 }, // 电子厂-电脑组装
        { typeId: 16, recipeId: 23 },
        { typeId: 16, recipeId: 23 },
        { typeId: 16, recipeId: 23 },
      ],
      starterGoods: [26, 27, 30, 18],
      outputGoods: [39],
    },
    
    // 33. 海尔家电
    {
      name: '海尔家电',
      cash: 60000000,
      buildings: [
        { typeId: 19, recipeId: 27 }, // 家电厂-家电生产
        { typeId: 19, recipeId: 27 },
        { typeId: 19, recipeId: 27 },
        { typeId: 19, recipeId: 27 },
      ],
      starterGoods: [14, 26, 18],
      outputGoods: [40],
    },
    
    // 34. 大疆科技 - 无人机+VR
    {
      name: '大疆科技',
      cash: 65000000,
      buildings: [
        { typeId: 16, recipeId: 82 }, // 电子厂-无人机生产
        { typeId: 16, recipeId: 82 },
        { typeId: 16, recipeId: 62 }, // 电子厂-VR设备生产
        { typeId: 16, recipeId: 62 },
      ],
      starterGoods: [26, 27, 28, 18],
      outputGoods: [52, 103],
    },
    
    // ==================== F. 食品饮料公司 (6家) ====================
    
    // 35. 统一食品 - 加工食品
    {
      name: '统一食品',
      cash: 40000000,
      buildings: [
        { typeId: 13, recipeId: 17 }, // 食品厂-食品加工
        { typeId: 13, recipeId: 17 },
        { typeId: 13, recipeId: 17 },
        { typeId: 13, recipeId: 103 }, // 食品厂-食品生产
        { typeId: 13, recipeId: 103 },
      ],
      starterGoods: [8, 24, 37],
      outputGoods: [24, 44],
    },
    
    // 36. 可口可乐 - 饮料专业 ★关键：确保饮料供应
    {
      name: '可口可乐',
      cash: 45000000,
      buildings: [
        { typeId: 13, recipeId: 18 }, // 食品厂-饮料生产
        { typeId: 13, recipeId: 18 },
        { typeId: 13, recipeId: 18 },
        { typeId: 13, recipeId: 18 },
        { typeId: 13, recipeId: 18 },
      ],
      starterGoods: [8],
      outputGoods: [45],
    },
    
    // 37. 冷冻零食
    {
      name: '冷冻零食',
      cash: 35000000,
      buildings: [
        { typeId: 13, recipeId: 42 }, // 食品厂-冷冻食品生产
        { typeId: 13, recipeId: 42 },
        { typeId: 13, recipeId: 86 }, // 食品厂-零食生产
        { typeId: 13, recipeId: 86 },
        { typeId: 13, recipeId: 88 }, // 食品厂-宠物食品生产
      ],
      starterGoods: [63, 58, 8],
      outputGoods: [65, 67, 69],
    },
    
    // 38. 金龙鱼 - 粮油
    {
      name: '金龙鱼',
      cash: 45000000,
      buildings: [
        { typeId: 77, recipeId: 168 }, // 制糖厂-糖生产
        { typeId: 77, recipeId: 168 },
        { typeId: 77, recipeId: 169 }, // 制糖厂-食用油生产
        { typeId: 77, recipeId: 169 },
        { typeId: 77, recipeId: 170 }, // 制糖厂-面粉生产
        { typeId: 77, recipeId: 170 },
      ],
      starterGoods: [161, 165, 8],
      outputGoods: [166, 167, 168],
    },
    
    // 39. 茅台集团 - 酒类
    {
      name: '茅台集团',
      cash: 80000000,
      buildings: [
        { typeId: 78, recipeId: 171 }, // 酿酒厂-啤酒酿造
        { typeId: 78, recipeId: 171 },
        { typeId: 78, recipeId: 172 }, // 酿酒厂-葡萄酒酿造
        { typeId: 78, recipeId: 173 }, // 酿酒厂-烈酒酿造
      ],
      starterGoods: [160, 8],
      outputGoods: [169, 170, 171],
    },
    
    // 40. 饮品糖果
    {
      name: '饮品糖果',
      cash: 40000000,
      buildings: [
        { typeId: 79, recipeId: 174 }, // 饮品厂-茶饮生产
        { typeId: 79, recipeId: 174 },
        { typeId: 79, recipeId: 175 }, // 饮品厂-咖啡生产
        { typeId: 79, recipeId: 175 },
        { typeId: 79, recipeId: 176 }, // 饮品厂-烟草制品生产
        { typeId: 79, recipeId: 177 }, // 饮品厂-糖果生产
      ],
      starterGoods: [162, 163, 164, 166],
      outputGoods: [172, 173, 174, 175],
    },
    
    // ==================== G. 服装与日用品公司 (5家) ====================
    
    // 41. 波司登 - 服装
    {
      name: '波司登',
      cash: 40000000,
      buildings: [
        { typeId: 44, recipeId: 69 }, // 服装厂-服装生产
        { typeId: 44, recipeId: 69 },
        { typeId: 44, recipeId: 69 },
        { typeId: 44, recipeId: 69 },
        { typeId: 44, recipeId: 69 },
      ],
      starterGoods: [23],
      outputGoods: [43],
    },
    
    // 42. 宜家家居 - 家具
    {
      name: '宜家家居',
      cash: 50000000,
      buildings: [
        { typeId: 45, recipeId: 70 }, // 家具厂-家具生产
        { typeId: 45, recipeId: 70 },
        { typeId: 45, recipeId: 70 },
        { typeId: 45, recipeId: 70 },
      ],
      starterGoods: [6, 14],
      outputGoods: [46],
    },
    
    // 43. 宝洁日化
    {
      name: '宝洁日化',
      cash: 80000000,
      buildings: [
        { typeId: 59, recipeId: 106 }, // 棕榈种植园-棕榈油提取
        { typeId: 59, recipeId: 107 }, // 棕榈种植园-香料提取
        { typeId: 60, recipeId: 108 }, // 日化厂-表面活性剂生产
        { typeId: 60, recipeId: 111 }, // 日化厂-化妆品基质生产
        { typeId: 60, recipeId: 113 }, // 日化厂-化妆品生产
        { typeId: 61, recipeId: 115 }, // 洗涤用品厂-洗涤用品生产
        { typeId: 61, recipeId: 116 }, // 洗涤用品厂-洗发护发用品生产
        { typeId: 61, recipeId: 117 }, // 洗涤用品厂-口腔护理用品生产
      ],
      starterGoods: [104, 105, 20],
      outputGoods: [104, 105, 106, 107, 109, 111, 112, 113, 114, 115],
    },
    
    // 44. 皮革纺织
    {
      name: '皮革纺织',
      cash: 55000000,
      buildings: [
        { typeId: 70, recipeId: 143 }, // 牧羊场-羊毛采集
        { typeId: 70, recipeId: 144 }, // 牧羊场-亚麻收获
        { typeId: 71, recipeId: 232 }, // 制革厂-麻布生产 ★确保麻布有生产者
        { typeId: 71, recipeId: 147 }, // 制革厂-毛纱生产
        { typeId: 71, recipeId: 148 }, // 制革厂-皮革加工
        { typeId: 72, recipeId: 149 }, // 皮具厂-毛织品生产
        { typeId: 72, recipeId: 150 }, // 皮具厂-皮具生产
        { typeId: 72, recipeId: 151 }, // 皮具厂-鞋类生产
      ],
      starterGoods: [8, 60, 140, 141],
      outputGoods: [140, 141, 142, 144, 145, 146, 147, 148, 149],
    },
    
    // 45. 陶瓷卫浴
    {
      name: '陶瓷卫浴',
      cash: 60000000,
      buildings: [
        { typeId: 73, recipeId: 152 }, // 粘土矿场-粘土开采
        { typeId: 73, recipeId: 153 }, // 粘土矿场-大理石开采
        { typeId: 74, recipeId: 154 }, // 砖瓦厂-砖生产
        { typeId: 74, recipeId: 155 }, // 砖瓦厂-瓷砖生产
        { typeId: 74, recipeId: 156 }, // 砖瓦厂-木板生产
        { typeId: 75, recipeId: 157 }, // 陶瓷厂-涂料生产
        { typeId: 75, recipeId: 158 }, // 陶瓷厂-陶瓷制品生产
        { typeId: 75, recipeId: 159 }, // 陶瓷厂-卫浴设备生产
      ],
      starterGoods: [150, 6],
      outputGoods: [150, 151, 152, 153, 154, 155, 156, 157, 158, 159],
    },
    
    // ==================== H. 建材与基建公司 (4家) ====================
    
    // 46. 中建材料
    {
      name: '中建材料',
      cash: 60000000,
      buildings: [
        { typeId: 46, recipeId: 71 }, // 建材厂-建筑材料生产
        { typeId: 46, recipeId: 71 },
        { typeId: 46, recipeId: 71 },
        { typeId: 46, recipeId: 71 },
        { typeId: 46, recipeId: 72 }, // 建材厂-建材成品生产
        { typeId: 46, recipeId: 72 },
      ],
      starterGoods: [21, 14, 17],
      outputGoods: [36, 47],
    },
    
    // 47. 精密零件
    {
      name: '精密零件',
      cash: 55000000,
      buildings: [
        { typeId: 100, recipeId: 228 }, // 精密零件厂-轴承生产
        { typeId: 100, recipeId: 228 },
        { typeId: 100, recipeId: 229 }, // 精密零件厂-弹簧生产
        { typeId: 100, recipeId: 230 }, // 精密零件厂-密封件生产
        { typeId: 100, recipeId: 231 }, // 精密零件厂-过滤器生产
      ],
      starterGoods: [14, 19],
      outputGoods: [226, 227, 228, 229],
    },
    
    // 48. 电力电缆
    {
      name: '电力电缆',
      cash: 60000000,
      buildings: [
        { typeId: 83, recipeId: 186 }, // 电力设备厂-变压器生产
        { typeId: 83, recipeId: 186 },
        { typeId: 83, recipeId: 187 }, // 电力设备厂-电力电缆生产
        { typeId: 83, recipeId: 187 },
        { typeId: 83, recipeId: 187 },
      ],
      starterGoods: [15, 14, 19],
      outputGoods: [184, 185],
    },
    
    // 49. 光纤通信
    {
      name: '光纤通信',
      cash: 50000000,
      buildings: [
        { typeId: 84, recipeId: 188 }, // 光纤厂-光纤生产
        { typeId: 84, recipeId: 188 },
        { typeId: 84, recipeId: 188 },
      ],
      starterGoods: [9, 17],
      outputGoods: [186],
    },
    
    // ==================== I. 医药与医疗公司 (4家) ====================
    
    // 50. 同仁堂 - 药材+仿制药
    {
      name: '同仁堂',
      cash: 80000000,
      buildings: [
        { typeId: 29, recipeId: 43 }, // 药材种植园-药材种植
        { typeId: 29, recipeId: 43 },
        { typeId: 29, recipeId: 43 },
        { typeId: 30, recipeId: 44 }, // 制药厂-仿制药生产
        { typeId: 30, recipeId: 44 },
        { typeId: 30, recipeId: 44 },
      ],
      starterGoods: [70, 71],
      outputGoods: [70, 74],
    },
    
    // 51. 恒瑞医药 - 专利药+疫苗
    {
      name: '恒瑞医药',
      cash: 120000000,
      buildings: [
        { typeId: 10, recipeId: 89 }, // 化工厂-医药化工品生产
        { typeId: 10, recipeId: 89 },
        { typeId: 30, recipeId: 90 }, // 制药厂-抗生素生产
        { typeId: 30, recipeId: 45 }, // 制药厂-专利药生产
        { typeId: 30, recipeId: 45 },
        { typeId: 30, recipeId: 46 }, // 制药厂-疫苗生产
      ],
      starterGoods: [12, 70, 71, 20],
      outputGoods: [71, 72, 73, 75],
    },
    
    // 52. 华润医药 - 非处方药
    {
      name: '华润医药',
      cash: 60000000,
      buildings: [
        { typeId: 30, recipeId: 91 }, // 制药厂-非处方药生产
        { typeId: 30, recipeId: 91 },
        { typeId: 30, recipeId: 91 },
        { typeId: 30, recipeId: 91 },
      ],
      starterGoods: [71, 37],
      outputGoods: [76],
    },
    
    // 53. 迈瑞医疗 - 医疗器械
    {
      name: '迈瑞医疗',
      cash: 100000000,
      buildings: [
        { typeId: 31, recipeId: 47 }, // 医疗器械厂-医用耗材生产
        { typeId: 31, recipeId: 47 },
        { typeId: 31, recipeId: 48 }, // 医疗器械厂-诊断设备生产
        { typeId: 31, recipeId: 48 },
        { typeId: 31, recipeId: 104 }, // 医疗器械厂-医疗设备生产
        { typeId: 31, recipeId: 92 }, // 医疗器械厂-手术设备生产
      ],
      starterGoods: [18, 23, 26, 27, 14],
      outputGoods: [48, 77, 78, 79],
    },
    
    // ==================== J. 汽车与交通公司 (5家) ====================
    
    // 54. 比亚迪 - 电动车
    {
      name: '比亚迪',
      cash: 100000000,
      buildings: [
        { typeId: 18, recipeId: 26 }, // 汽车工厂-电动汽车组装
        { typeId: 18, recipeId: 26 },
        { typeId: 18, recipeId: 26 },
      ],
      starterGoods: [32, 26, 28, 29, 17],
      outputGoods: [42],
    },
    
    // 55. 吉利汽车 - 燃油车+豪华车
    {
      name: '吉利汽车',
      cash: 120000000,
      buildings: [
        { typeId: 18, recipeId: 25 }, // 汽车工厂-燃油汽车组装
        { typeId: 18, recipeId: 25 },
        { typeId: 18, recipeId: 25 },
        { typeId: 18, recipeId: 101 }, // 汽车工厂-豪华汽车生产
      ],
      starterGoods: [32, 26, 19, 17, 90],
      outputGoods: [41, 95],
    },
    
    // 56. 正新轮胎
    {
      name: '正新轮胎',
      cash: 50000000,
      buildings: [
        { typeId: 62, recipeId: 119 }, // 轮胎厂-轮胎生产
        { typeId: 62, recipeId: 119 },
        { typeId: 62, recipeId: 119 },
        { typeId: 62, recipeId: 120 }, // 轮胎厂-汽车座椅生产
      ],
      starterGoods: [19, 14, 23],
      outputGoods: [116, 117],
    },
    
    // 57. 捷安特 - 两轮车
    {
      name: '捷安特',
      cash: 35000000,
      buildings: [
        { typeId: 63, recipeId: 121 }, // 自行车厂-自行车生产
        { typeId: 63, recipeId: 121 },
        { typeId: 63, recipeId: 122 }, // 自行车厂-摩托车生产
        { typeId: 63, recipeId: 123 }, // 自行车厂-电动滑板车生产
      ],
      starterGoods: [14, 16, 19, 29, 28],
      outputGoods: [121, 122, 123],
    },
    
    // 58. 航空部件
    {
      name: '航空部件',
      cash: 80000000,
      buildings: [
        { typeId: 21, recipeId: 80 }, // 零部件厂-航空部件生产
        { typeId: 21, recipeId: 80 },
        { typeId: 21, recipeId: 80 },
        { typeId: 66, recipeId: 128 }, // 民用航空厂-航空发动机生产
      ],
      starterGoods: [16, 80, 10],
      outputGoods: [33, 120],
    },
    
    // ==================== K. 高科技与军工公司 (6家) ====================
    
    // 59. 特钢集团
    {
      name: '特钢集团',
      cash: 70000000,
      buildings: [
        { typeId: 32, recipeId: 49 }, // 特钢厂-特种钢生产
        { typeId: 32, recipeId: 49 },
        { typeId: 32, recipeId: 49 },
        { typeId: 32, recipeId: 50 }, // 特钢厂-装甲板生产
        { typeId: 32, recipeId: 50 },
      ],
      starterGoods: [14, 10],
      outputGoods: [80, 82],
    },
    
    // 60. 寒武纪AI
    {
      name: '寒武纪AI',
      cash: 150000000,
      buildings: [
        { typeId: 37, recipeId: 58 }, // AI芯片厂-AI芯片生产
        { typeId: 37, recipeId: 58 },
        { typeId: 37, recipeId: 58 },
        { typeId: 37, recipeId: 60 }, // AI芯片厂-AI服务器组装
      ],
      starterGoods: [27, 10],
      outputGoods: [96, 99],
    },
    
    // 61. 机器人科技
    {
      name: '机器人科技',
      cash: 100000000,
      buildings: [
        { typeId: 47, recipeId: 73 }, // 机器人厂-工业机器人生产
        { typeId: 47, recipeId: 73 },
        { typeId: 47, recipeId: 74 }, // 机器人厂-智能机器人生产
      ],
      starterGoods: [31, 26, 27, 96],
      outputGoods: [51, 102],
    },
    
    // 62. 生命科学
    {
      name: '生命科学',
      cash: 80000000,
      buildings: [
        { typeId: 39, recipeId: 95 }, // 生物实验室-生物材料培育
        { typeId: 39, recipeId: 95 },
        { typeId: 39, recipeId: 63 }, // 生物实验室-生物制品生产
      ],
      starterGoods: [20],
      outputGoods: [98, 101],
    },
    
    // 63. 珠宝奢侈
    {
      name: '珠宝奢侈',
      cash: 120000000,
      buildings: [
        { typeId: 35, recipeId: 54 }, // 金矿-金矿开采
        { typeId: 35, recipeId: 55 }, // 金矿-黄金精炼
        { typeId: 35, recipeId: 97 }, // 金矿-钻石矿开采
        { typeId: 36, recipeId: 98 }, // 奢侈品工坊-钻石切割
        { typeId: 36, recipeId: 56 }, // 奢侈品工坊-珠宝制作
        { typeId: 36, recipeId: 57 }, // 奢侈品工坊-奢侈腕表生产
        { typeId: 36, recipeId: 100 }, // 奢侈品工坊-设计师服装生产
      ],
      starterGoods: [88, 89, 92, 23],
      outputGoods: [88, 89, 90, 91, 53, 54, 93, 94],
    },
    
    // 64. 精细化工
    {
      name: '精细化工',
      cash: 80000000,
      buildings: [
        { typeId: 99, recipeId: 224 }, // 精细化工厂-光刻胶生产
        { typeId: 99, recipeId: 225 }, // 精细化工厂-惰性气体生产
        { typeId: 99, recipeId: 226 }, // 精细化工厂-催化剂生产
        { typeId: 99, recipeId: 227 }, // 精细化工厂-胶粘剂生产
      ],
      starterGoods: [20, 10, 12, 11],
      outputGoods: [222, 223, 224, 225],
    },
    
    // ==================== L. 通信与网络公司 (3家) ====================
    
    // 65. 华为设备
    {
      name: '华为设备',
      cash: 100000000,
      buildings: [
        { typeId: 85, recipeId: 189 }, // 通信设备厂-天线生产
        { typeId: 85, recipeId: 190 }, // 通信设备厂-传感器生产
        { typeId: 85, recipeId: 191 }, // 通信设备厂-存储芯片生产
        { typeId: 86, recipeId: 193 }, // 网络设备厂-路由器生产
        { typeId: 86, recipeId: 194 }, // 网络设备厂-通信基站生产
      ],
      starterGoods: [16, 26, 27, 186],
      outputGoods: [187, 188, 189, 191, 192],
    },
    
    // 66. 显示面板
    {
      name: '显示面板',
      cash: 70000000,
      buildings: [
        { typeId: 85, recipeId: 192 }, // 通信设备厂-显示面板生产
        { typeId: 85, recipeId: 192 },
        { typeId: 85, recipeId: 192 },
        { typeId: 86, recipeId: 196 }, // 网络设备厂-平板电脑生产
        { typeId: 86, recipeId: 197 }, // 网络设备厂-智能手表生产
      ],
      starterGoods: [17, 26, 10],
      outputGoods: [190, 194, 195],
    },
    
    // 67. 中国航天
    {
      name: '中国航天',
      cash: 500000000,
      buildings: [
        { typeId: 87, recipeId: 195 }, // 卫星工厂-卫星生产
      ],
      starterGoods: [33, 27, 26, 187],
      outputGoods: [193],
    },
    
    // ==================== M. 服务业公司 (4家) ====================
    
    // 68. 新东方
    {
      name: '新东方',
      cash: 40000000,
      buildings: [
        { typeId: 88, recipeId: 198 }, // 学校-教育服务提供
        { typeId: 88, recipeId: 198 },
      ],
      starterGoods: [212],
      outputGoods: [196],
    },
    
    // 69. 万豪酒店
    {
      name: '万豪酒店',
      cash: 120000000,
      buildings: [
        { typeId: 91, recipeId: 201 }, // 酒店-娱乐服务提供
        { typeId: 91, recipeId: 202 }, // 酒店-餐饮服务提供
        { typeId: 91, recipeId: 203 }, // 酒店-住宿服务提供
      ],
      starterGoods: [44, 45],
      outputGoods: [199, 200, 201],
    },
    
    // 70. 顺丰速运
    {
      name: '顺丰速运',
      cash: 60000000,
      buildings: [
        { typeId: 92, recipeId: 204 }, // 运输公司-运输服务提供
        { typeId: 92, recipeId: 204 },
        { typeId: 92, recipeId: 205 }, // 运输公司-清洁服务提供
      ],
      starterGoods: [25, 113],
      outputGoods: [202, 203],
    },
    
    // 71. 麦肯锡
    {
      name: '麦肯锡',
      cash: 50000000,
      buildings: [
        { typeId: 93, recipeId: 207 }, // 咨询公司-广告服务提供
        { typeId: 93, recipeId: 208 }, // 咨询公司-法律服务提供
        { typeId: 93, recipeId: 209 }, // 咨询公司-咨询服务提供
        { typeId: 93, recipeId: 210 }, // 咨询公司-软件服务提供
      ],
      starterGoods: [],
      outputGoods: [205, 206, 207, 208],
    },
    
    // ==================== N. 文化传媒公司 (4家) ====================
    
    // 72. 人民日报
    {
      name: '人民日报',
      cash: 35000000,
      buildings: [
        { typeId: 94, recipeId: 212 }, // 印刷厂-印刷油墨生产
        { typeId: 94, recipeId: 213 }, // 印刷厂-图书印刷
        { typeId: 94, recipeId: 214 }, // 印刷厂-杂志报刊印刷
      ],
      starterGoods: [22, 20],
      outputGoods: [210, 212, 213],
    },
    
    // 73. 华谊兄弟
    {
      name: '华谊兄弟',
      cash: 180000000,
      buildings: [
        { typeId: 95, recipeId: 215 }, // 影视制作中心-影视设备生产
        { typeId: 95, recipeId: 216 }, // 影视制作中心-音乐专辑制作
        { typeId: 95, recipeId: 217 }, // 影视制作中心-电影制作
      ],
      starterGoods: [26, 39],
      outputGoods: [211, 214, 215],
    },
    
    // 74. 米哈游
    {
      name: '米哈游',
      cash: 100000000,
      buildings: [
        { typeId: 96, recipeId: 218 }, // 游戏工作室-电子游戏开发
        { typeId: 96, recipeId: 218 },
      ],
      starterGoods: [39],
      outputGoods: [216],
    },
    
    // 75. 乐高玩具
    {
      name: '乐高玩具',
      cash: 50000000,
      buildings: [
        { typeId: 97, recipeId: 219 }, // 玩具厂-玩具生产
        { typeId: 97, recipeId: 219 },
        { typeId: 97, recipeId: 220 }, // 玩具厂-运动器材生产
        { typeId: 97, recipeId: 221 }, // 玩具厂-乐器生产
      ],
      starterGoods: [18, 6, 14],
      outputGoods: [217, 218, 219],
    },
    
    // ==================== O. 杂项配件公司 (2家) ====================
    
    // 76. YKK配件
    {
      name: 'YKK配件',
      cash: 25000000,
      buildings: [
        { typeId: 98, recipeId: 222 }, // 配件厂-拉链生产
        { typeId: 98, recipeId: 222 },
        { typeId: 98, recipeId: 223 }, // 配件厂-纽扣生产
      ],
      starterGoods: [14, 18],
      outputGoods: [220, 221],
    },
    
    // 77. 北方军工
    {
      name: '北方军工',
      cash: 200000000,
      buildings: [
        { typeId: 10, recipeId: 93 }, // 化工厂-炸药生产
        { typeId: 16, recipeId: 94 }, // 电子厂-军用电子生产
        { typeId: 33, recipeId: 51 }, // 武器工厂-轻武器生产
        { typeId: 33, recipeId: 52 }, // 武器工厂-军用车辆生产
      ],
      starterGoods: [80, 81, 83, 82],
      outputGoods: [81, 83, 84, 86],
    },
  ];
  
  // 创建所有AI公司
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
    
    // 给AI初始原材料（根据商品价值调整数量）
    for (const goodsId of ai.starterGoods) {
      if (goodsId < GOODS_COUNT) {
        const basePrice = ALL_GOODS.find(g => g.id === goodsId)?.basePrice || 100;
        let baseAmount: number;
        if (basePrice > 10000) {
          baseAmount = 50 + Math.random() * 80;
        } else if (basePrice > 1000) {
          baseAmount = 300 + Math.random() * 400;
        } else if (basePrice > 100) {
          baseAmount = 1500 + Math.random() * 1500;
        } else {
          baseAmount = 3000 + Math.random() * 3000;
        }
        setInventory(world, companyId, goodsId, baseAmount);
      }
    }
    
    // 给AI初始成品库存
    for (const goodsId of ai.outputGoods) {
      if (goodsId < GOODS_COUNT) {
        const basePrice = ALL_GOODS.find(g => g.id === goodsId)?.basePrice || 100;
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
    
    // 给AI初始建筑材料库存
    const buildingMaterialsInit: Array<{ goodsId: number; amount: number }> = [
      { goodsId: 14, amount: 500 + Math.random() * 1000 },
      { goodsId: 21, amount: 400 + Math.random() * 600 },
      { goodsId: 6, amount: 300 + Math.random() * 500 },
      { goodsId: 152, amount: 300 + Math.random() * 400 },
      { goodsId: 17, amount: 200 + Math.random() * 300 },
      { goodsId: 36, amount: 200 + Math.random() * 300 },
      { goodsId: 47, amount: 80 + Math.random() * 120 },
      { goodsId: 185, amount: 10 + Math.random() * 20 },
      { goodsId: 184, amount: 5 + Math.random() * 10 },
      { goodsId: 29, amount: 20 + Math.random() * 30 },
      { goodsId: 31, amount: 100 + Math.random() * 150 },
      { goodsId: 25, amount: 300 + Math.random() * 500 },
      { goodsId: 18, amount: 200 + Math.random() * 300 },
      { goodsId: 19, amount: 100 + Math.random() * 150 },
    ];
    
    for (const mat of buildingMaterialsInit) {
      if (mat.goodsId < GOODS_COUNT) {
        const currentInv = world.companies.inventories[companyId * GOODS_COUNT + mat.goodsId] || 0;
        setInventory(world, companyId, mat.goodsId, currentInv + Math.floor(mat.amount));
      }
    }
    
    // 创建建筑 - 使用指定的配方
    const tracker = getGlobalRecipeTracker();
    
    for (const buildingConfig of ai.buildings) {
      const recipeId = buildingConfig.recipeId;
      
      if (recipeId !== undefined) {
        try {
          addBuilding(world, companyId, buildingConfig.typeId, recipeId);
          recordRecipeAssignment(tracker, recipeId);
        } catch (e) {
          console.warn(`[初始化] 无法为 ${ai.name} 添加建筑类型 ${buildingConfig.typeId}:`, e);
        }
      }
    }
  }
  
  console.log(`[初始化] 创建了 ${aiCompanies.length} 家AI公司，共 ${world.buildings.count} 个建筑`);
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
        const basePrice = goods?.basePrice || currentPrice;
        
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
        const basePrice = goods?.basePrice || currentPrice;
        
        const buyPrice = basePrice * (0.95 + Math.random() * 0.2);
        const buyQuantity = Math.floor(input.amount * (15 + Math.random() * 25));
        
        if (buyQuantity > 5 && c.cash[companyId] >= buyQuantity * buyPrice * 1.2) {
          createBuyOrder(world, companyId, input.goodsId, buyQuantity, buyPrice);
        }
      }
    }
  }
  
  // 为所有商品生成市场订单（覆盖全部230种商品）
  for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    if (!goods) continue;
    
    const basePrice = goods.basePrice;
    
    // 生成 3-6 个买单
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
      const companyId = 1 + Math.floor(Math.random() * (c.count - 1));
      if (companyId >= c.count || !c.isAI[companyId]) continue;
      
      const buyPrice = basePrice * (0.90 + Math.random() * 0.18);
      const buyQuantity = Math.floor(30 + Math.random() * 150);
      
      if (c.cash[companyId] >= buyQuantity * buyPrice * 1.2) {
        createBuyOrder(world, companyId, goodsId, buyQuantity, buyPrice);
      }
    }
    
    // 生成 3-6 个卖单
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
 * 初始化零售店
 */
function initializeRetailStores(world: GameWorld): void {
  initRetailSystem(world);
  
  const c = world.companies;
  
  const retailCompanies = [
    {
      name: '全家便利',
      cash: 5000000,
      stores: [
        { buildingTypeId: 49 },
        { buildingTypeId: 49 },
        { buildingTypeId: 49 },
      ],
    },
    {
      name: '永辉超市',
      cash: 20000000,
      stores: [
        { buildingTypeId: 50 },
        { buildingTypeId: 50 },
      ],
    },
    {
      name: '沃尔玛',
      cash: 50000000,
      stores: [
        { buildingTypeId: 51 },
      ],
    },
    {
      name: '苏宁电器',
      cash: 30000000,
      stores: [
        { buildingTypeId: 52 },
        { buildingTypeId: 52 },
      ],
    },
    {
      name: '广汽4S',
      cash: 80000000,
      stores: [
        { buildingTypeId: 53 },
      ],
    },
    {
      name: '优衣库',
      cash: 15000000,
      stores: [
        { buildingTypeId: 54 },
        { buildingTypeId: 54 },
      ],
    },
    {
      name: '卡地亚精品',
      cash: 100000000,
      stores: [
        { buildingTypeId: 55 },
      ],
    },
    {
      name: '大参林药房',
      cash: 10000000,
      stores: [
        { buildingTypeId: 56 },
        { buildingTypeId: 56 },
      ],
    },
    {
      name: '中石化加油',
      cash: 40000000,
      stores: [
        { buildingTypeId: 57 },
        { buildingTypeId: 57 },
        { buildingTypeId: 57 },
      ],
    },
    {
      name: '红星美凯龙',
      cash: 60000000,
      stores: [
        { buildingTypeId: 58 },
      ],
    },
    {
      name: '屈臣氏',
      cash: 15000000,
      stores: [
        { buildingTypeId: 101 },
        { buildingTypeId: 101 },
      ],
    },
    {
      name: '新华书店',
      cash: 8000000,
      stores: [
        { buildingTypeId: 102 },
        { buildingTypeId: 102 },
      ],
    },
    {
      name: '酒仙网',
      cash: 12000000,
      stores: [
        { buildingTypeId: 103 },
        { buildingTypeId: 103 },
      ],
    },
    {
      name: '迪卡侬',
      cash: 25000000,
      stores: [
        { buildingTypeId: 104 },
        { buildingTypeId: 104 },
      ],
    },
    {
      name: '玩具反斗城',
      cash: 15000000,
      stores: [
        { buildingTypeId: 105 },
        { buildingTypeId: 105 },
      ],
    },
    {
      name: '海伦钢琴',
      cash: 20000000,
      stores: [
        { buildingTypeId: 106 },
      ],
    },
  ];
  
  for (const retailCo of retailCompanies) {
    const companyId = c.count;
    
    c.count++;
    c.cash[companyId] = retailCo.cash;
    c.totalAssets[companyId] = retailCo.cash;
    c.totalLiabilities[companyId] = 0;
    c.names.push(retailCo.name);
    c.isPlayer.push(false);
    c.isAI.push(true);
    
    for (let j = 0; j < ALL_GOODS.length; j++) {
      setInventory(world, companyId, j, 0);
    }
    
    for (const store of retailCo.stores) {
      const buildingId = addRetailBuilding(world, companyId, store.buildingTypeId);
      if (buildingId >= 0) {
        registerRetailStore(world, buildingId);
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