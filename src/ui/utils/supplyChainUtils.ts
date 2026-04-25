/**
 * 产业链工具函数
 * 用于构建和分析商品之间的生产关系
 *
 * v4.0更新：使用建筑production配置替代RECIPES
 */

import { ALL_GOODS, GoodsDefinition, GOODS_BY_ID, GOODS_BY_INDUSTRY } from '@/data/goods';
import { ALL_BUILDINGS, BuildingTypeDefinition, BUILDINGS_BY_ID, getBuildingProduction, BuildingProductionConfig } from '@/data/buildings';

// ==================== 类型定义 ====================

export interface GraphNode {
  id: number;
  key: string;
  name: string;
  tier: number;
  category: string;
  basePrice: number;
  isConsumerGood: boolean;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: number;
  target: number;
  buildingTypeId: number;  // v4.0: 替代 recipeId
  outputModeId: number;    // v4.0: 产品模式ID
  inputAmount: number;
  outputAmount: number;
}

export interface DependencyGraph {
  nodes: Map<number, GraphNode>;
  edges: GraphEdge[];
  /** goodsId -> 生产该商品所需的原料goodsId列表 */
  adjacencyList: Map<number, number[]>;
  /** goodsId -> 使用该商品作为原料的产品goodsId列表 */
  reverseAdjacencyList: Map<number, number[]>;
}

export interface UpstreamMaterial {
  goods: GoodsDefinition;
  depth: number;
  path: number[];
  amount: number;
  production?: ProductionInfo;  // v4.0: 替代 recipe
}

// v4.0: 生产信息（替代 RecipeDefinition）
export interface ProductionInfo {
  buildingTypeId: number;
  buildingName: string;
  outputModeId: number;
  outputModeName?: string;
  inputs: Array<{ goodsId: number; amount: number }>;
  outputs: Array<{ goodsId: number; amount: number }>;
}

export interface DownstreamProduct {
  goods: GoodsDefinition;
  depth: number;
  path: number[];
}

export interface ProductionPlanItem {
  goods: GoodsDefinition;
  amount: number;
  production?: ProductionInfo;  // v4.0: 替代 recipe
  building?: BuildingTypeDefinition;
}

export interface ProductionPlan {
  targetGoods: GoodsDefinition;
  targetAmount: number;
  rawMaterials: ProductionPlanItem[];
  intermediates: ProductionPlanItem[];
  buildings: Array<{
    building: BuildingTypeDefinition;
    count: number;
    totalCost: number;
  }>;
  totalMaterialCost: number;
  totalBuildingCost: number;
  dailyOperatingCost: number;
  estimatedDailyRevenue: number;
  estimatedDailyProfit: number;
  paybackDays: number;
}

export interface FilterState {
  tiers: number[];
  categories: string[];
  industries: string[];
  isConsumerGood: boolean | null;
  priceRange: [number, number];
  searchQuery: string;
}

// ==================== 产业分类映射 ====================

export const INDUSTRY_INFO: Record<string, { name: string; icon: string; color: string }> = {
  core: { name: '核心产业', icon: '🏭', color: '#3B82F6' },
  agriculture: { name: '农业', icon: '🌾', color: '#22C55E' },
  pharma: { name: '医药', icon: '💊', color: '#EC4899' },
  military: { name: '军工', icon: '⚔️', color: '#EF4444' },
  luxury: { name: '奢侈品', icon: '💎', color: '#F59E0B' },
  tech: { name: '科技', icon: '🔬', color: '#8B5CF6' },
  dailyChemical: { name: '日化', icon: '🧴', color: '#06B6D4' },
  transport: { name: '交通运输', icon: '🚗', color: '#6366F1' },
  miningExtended: { name: '矿业扩展', icon: '⛏️', color: '#78716C' },
  textileExtended: { name: '纺织扩展', icon: '🧵', color: '#D946EF' },
  buildingExtended: { name: '建材扩展', icon: '🏗️', color: '#84CC16' },
  agriDeepProcess: { name: '农产品深加工', icon: '🍷', color: '#A855F7' },
  energyExtended: { name: '能源扩展', icon: '⚡', color: '#FBBF24' },
  telecom: { name: '通信', icon: '📡', color: '#14B8A6' },
  service: { name: '服务业', icon: '🏨', color: '#F97316' },
  cultural: { name: '文化传媒', icon: '🎬', color: '#E879F9' },
  misc: { name: '杂项', icon: '📦', color: '#71717A' },
};

// 层级颜色
export const TIER_COLORS: Record<number, string> = {
  0: '#22C55E',  // 原材料 - 绿色
  1: '#3B82F6',  // 基础材料 - 蓝色
  2: '#A855F7',  // 中间产品 - 紫色
  3: '#F59E0B',  // 最终产品 - 橙色
};

export const TIER_NAMES: Record<number, string> = {
  0: '原材料',
  1: '基础材料',
  2: '中间产品',
  3: '最终产品',
};

// ==================== 缓存变量 ====================

let cachedDependencyGraph: DependencyGraph | null = null;
let cachedGoodsByIndustry: Map<string, GoodsDefinition[]> | null = null;
let cachedGoodsByTier: Map<number, GoodsDefinition[]> | null = null;

// ==================== 核心函数 ====================

/**
 * 构建商品依赖图
 * v4.0: 使用建筑production配置替代RECIPES
 */
export function buildDependencyGraph(): DependencyGraph {
  if (cachedDependencyGraph) {
    return cachedDependencyGraph;
  }

  const nodes = new Map<number, GraphNode>();
  const edges: GraphEdge[] = [];
  const adjacencyList = new Map<number, number[]>();
  const reverseAdjacencyList = new Map<number, number[]>();

  // 初始化所有商品节点
  for (const goods of ALL_GOODS) {
    nodes.set(goods.id, {
      id: goods.id,
      key: goods.key,
      name: goods.name,
      tier: goods.tier,
      category: goods.category,
      basePrice: goods.basePrice,
      isConsumerGood: goods.isConsumerGood,
    });
    adjacencyList.set(goods.id, []);
    reverseAdjacencyList.set(goods.id, []);
  }

  // v4.0: 从建筑production配置中构建边
  for (const building of ALL_BUILDINGS) {
    if (!building.production) continue;
    
    const production = building.production;
    const inputs = production.inputs || [];
    const outputs = production.outputs || [];
    
    // 处理默认产出
    for (const output of outputs) {
      for (const input of inputs) {
        // 添加边：input -> output
        edges.push({
          source: input.goodsId,
          target: output.goodsId,
          buildingTypeId: building.id,
          outputModeId: 0,  // 默认模式
          inputAmount: input.amount,
          outputAmount: output.amount,
        });

        // 更新邻接表
        const adj = adjacencyList.get(output.goodsId) || [];
        if (!adj.includes(input.goodsId)) {
          adj.push(input.goodsId);
          adjacencyList.set(output.goodsId, adj);
        }

        // 更新反向邻接表
        const revAdj = reverseAdjacencyList.get(input.goodsId) || [];
        if (!revAdj.includes(output.goodsId)) {
          revAdj.push(output.goodsId);
          reverseAdjacencyList.set(input.goodsId, revAdj);
        }
      }
    }
    
    // 处理可选产品模式
    if (production.outputModes) {
      for (const mode of production.outputModes) {
        const modeOutputs = mode.outputs || [];
        for (const output of modeOutputs) {
          for (const input of inputs) {
            // 添加边：input -> output
            edges.push({
              source: input.goodsId,
              target: output.goodsId,
              buildingTypeId: building.id,
              outputModeId: mode.modeId,
              inputAmount: input.amount,
              outputAmount: output.amount,
            });

            // 更新邻接表
            const adj = adjacencyList.get(output.goodsId) || [];
            if (!adj.includes(input.goodsId)) {
              adj.push(input.goodsId);
              adjacencyList.set(output.goodsId, adj);
            }

            // 更新反向邻接表
            const revAdj = reverseAdjacencyList.get(input.goodsId) || [];
            if (!revAdj.includes(output.goodsId)) {
              revAdj.push(output.goodsId);
              reverseAdjacencyList.set(input.goodsId, revAdj);
            }
          }
        }
      }
    }
  }

  cachedDependencyGraph = { nodes, edges, adjacencyList, reverseAdjacencyList };
  return cachedDependencyGraph;
}

/**
 * 获取商品的所有上游原材料（递归）
 * v4.0: 使用 production 配置替代 RECIPES
 */
export function getUpstreamMaterials(
  goodsId: number,
  targetAmount: number = 1,
  maxDepth: number = 10
): UpstreamMaterial[] {
  const graph = buildDependencyGraph();
  const result: UpstreamMaterial[] = [];
  const visited = new Set<number>();

  function dfs(currentId: number, depth: number, path: number[], amountNeeded: number) {
    if (depth > maxDepth || visited.has(currentId)) return;

    const goods = GOODS_BY_ID.get(currentId);
    if (!goods) return;

    // 获取生产该商品的生产配置
    const productions = getProductionsProducingGoods(currentId);
    
    if (productions.length === 0 || goods.tier === 0) {
      // 这是原材料，没有上游
      result.push({
        goods,
        depth,
        path: [...path],
        amount: amountNeeded,
      });
      return;
    }

    // 使用第一个生产配置（通常是最基础的）
    const production = productions[0];
    const outputAmount = production.outputs.find(o => o.goodsId === currentId)?.amount || 1;
    const multiplier = amountNeeded / outputAmount;

    for (const input of production.inputs) {
      const inputGoods = GOODS_BY_ID.get(input.goodsId);
      if (!inputGoods) continue;

      const inputAmount = input.amount * multiplier;
      const newPath = [...path, input.goodsId];

      result.push({
        goods: inputGoods,
        depth: depth + 1,
        path: newPath,
        amount: inputAmount,
        production,
      });

      // 继续递归
      if (inputGoods.tier > 0) {
        visited.add(input.goodsId);
        dfs(input.goodsId, depth + 1, newPath, inputAmount);
        visited.delete(input.goodsId);
      }
    }
  }

  dfs(goodsId, 0, [goodsId], targetAmount);
  return result;
}

/**
 * 获取商品的所有下游产品（递归）
 */
export function getDownstreamProducts(
  goodsId: number,
  maxDepth: number = 10
): DownstreamProduct[] {
  const graph = buildDependencyGraph();
  const result: DownstreamProduct[] = [];
  const visited = new Set<number>();

  function dfs(currentId: number, depth: number, path: number[]) {
    if (depth > maxDepth) return;

    const downstream = graph.reverseAdjacencyList.get(currentId) || [];

    for (const downstreamId of downstream) {
      if (visited.has(downstreamId)) continue;

      const goods = GOODS_BY_ID.get(downstreamId);
      if (!goods) continue;

      const newPath = [...path, downstreamId];
      result.push({
        goods,
        depth,
        path: newPath,
      });

      visited.add(downstreamId);
      dfs(downstreamId, depth + 1, newPath);
    }
  }

  visited.add(goodsId);
  dfs(goodsId, 1, [goodsId]);
  return result;
}

/**
 * 获取生产某商品的所有生产配置
 * v4.0: 替代原来的 getRecipesProducingGoods
 */
export function getProductionsProducingGoods(goodsId: number): ProductionInfo[] {
  const result: ProductionInfo[] = [];
  
  for (const building of ALL_BUILDINGS) {
    if (!building.production) continue;
    
    const production = building.production;
    
    // 检查默认产出
    if (production.outputs?.some(o => o.goodsId === goodsId)) {
      result.push({
        buildingTypeId: building.id,
        buildingName: building.name,
        outputModeId: 0,
        inputs: production.inputs || [],
        outputs: production.outputs || [],
      });
    }
    
    // 检查可选产品模式
    if (production.outputModes) {
      for (const mode of production.outputModes) {
        if (mode.outputs?.some(o => o.goodsId === goodsId)) {
          result.push({
            buildingTypeId: building.id,
            buildingName: building.name,
            outputModeId: mode.modeId,
            outputModeName: mode.name,
            inputs: production.inputs || [],
            outputs: mode.outputs || [],
          });
        }
      }
    }
  }
  
  return result;
}

/**
 * 获取使用某商品作为原料的所有生产配置
 * v4.0: 替代原来的 getRecipesUsingGoods
 */
export function getProductionsUsingGoods(goodsId: number): ProductionInfo[] {
  const result: ProductionInfo[] = [];
  
  for (const building of ALL_BUILDINGS) {
    if (!building.production) continue;
    
    const production = building.production;
    
    // 检查是否使用该商品作为输入
    if (production.inputs?.some(i => i.goodsId === goodsId)) {
      // 添加默认产出
      if (production.outputs && production.outputs.length > 0) {
        result.push({
          buildingTypeId: building.id,
          buildingName: building.name,
          outputModeId: 0,
          inputs: production.inputs,
          outputs: production.outputs,
        });
      }
      
      // 添加可选产品模式
      if (production.outputModes) {
        for (const mode of production.outputModes) {
          result.push({
            buildingTypeId: building.id,
            buildingName: building.name,
            outputModeId: mode.modeId,
            outputModeName: mode.name,
            inputs: production.inputs,
            outputs: mode.outputs || [],
          });
        }
      }
    }
  }
  
  return result;
}

// 保留旧函数名作为别名（兼容性）
export const getRecipesProducingGoods = getProductionsProducingGoods;
export const getRecipesUsingGoods = getProductionsUsingGoods;

/**
 * 获取可以生产某商品的建筑
 * v4.0: 使用 production 配置
 */
export function getBuildingsForGoods(goodsId: number): BuildingTypeDefinition[] {
  const productions = getProductionsProducingGoods(goodsId);
  const buildingIds = new Set<number>();

  for (const production of productions) {
    buildingIds.add(production.buildingTypeId);
  }

  return Array.from(buildingIds)
    .map(id => BUILDINGS_BY_ID.get(id))
    .filter((b): b is BuildingTypeDefinition => b !== undefined);
}

/**
 * 计算生产计划
 * v4.0: 使用 production 配置
 */
export function calculateProductionPlan(
  targetGoodsId: number,
  targetAmount: number
): ProductionPlan {
  const targetGoods = GOODS_BY_ID.get(targetGoodsId);
  if (!targetGoods) {
    throw new Error(`Goods with id ${targetGoodsId} not found`);
  }

  const upstream = getUpstreamMaterials(targetGoodsId, targetAmount);
  
  // 分离原材料和中间产品
  const rawMaterials: ProductionPlanItem[] = [];
  const intermediates: ProductionPlanItem[] = [];
  const processedGoods = new Map<number, number>(); // goodsId -> totalAmount

  for (const item of upstream) {
    const existingAmount = processedGoods.get(item.goods.id) || 0;
    processedGoods.set(item.goods.id, existingAmount + item.amount);
  }

  for (const [goodsId, amount] of processedGoods) {
    const goods = GOODS_BY_ID.get(goodsId)!;
    const productions = getProductionsProducingGoods(goodsId);
    const production = productions[0];
    const buildings = getBuildingsForGoods(goodsId);
    const building = buildings[0];

    const planItem: ProductionPlanItem = {
      goods,
      amount,
      production,
      building,
    };

    if (goods.tier === 0) {
      rawMaterials.push(planItem);
    } else {
      intermediates.push(planItem);
    }
  }

  // 计算所需建筑
  const buildingCounts = new Map<number, number>();
  const buildingsList: Array<{
    building: BuildingTypeDefinition;
    count: number;
    totalCost: number;
  }> = [];

  // 添加目标产品的生产建筑
  const targetProductions = getProductionsProducingGoods(targetGoodsId);
  if (targetProductions.length > 0) {
    const production = targetProductions[0];
    const building = BUILDINGS_BY_ID.get(production.buildingTypeId);
    if (building) {
      const outputPerTick = production.outputs.find(o => o.goodsId === targetGoodsId)?.amount || 1;
      const ticksNeeded = Math.ceil(targetAmount / outputPerTick);
      const buildingsNeeded = Math.ceil(ticksNeeded / 24); // 假设每天24 ticks
      buildingCounts.set(building.id, buildingsNeeded);
    }
  }

  // 添加中间产品的生产建筑
  for (const item of intermediates) {
    if (item.building) {
      const existing = buildingCounts.get(item.building.id) || 0;
      buildingCounts.set(item.building.id, existing + 1);
    }
  }

  // 添加原材料的采集建筑
  for (const item of rawMaterials) {
    if (item.building) {
      const existing = buildingCounts.get(item.building.id) || 0;
      buildingCounts.set(item.building.id, existing + 1);
    }
  }

  for (const [buildingId, count] of buildingCounts) {
    const building = BUILDINGS_BY_ID.get(buildingId);
    if (building) {
      buildingsList.push({
        building,
        count,
        totalCost: building.buildCost * count,
      });
    }
  }

  // 计算成本
  const totalMaterialCost = rawMaterials.reduce(
    (sum, item) => sum + item.goods.basePrice * item.amount,
    0
  );

  const totalBuildingCost = buildingsList.reduce(
    (sum, item) => sum + item.totalCost,
    0
  );

  const dailyOperatingCost = buildingsList.reduce(
    (sum, item) => sum + (item.building.maintenanceCost + item.building.laborCost + item.building.energyCost) * item.count,
    0
  );

  const estimatedDailyRevenue = targetGoods.basePrice * targetAmount;
  const estimatedDailyProfit = estimatedDailyRevenue - totalMaterialCost - dailyOperatingCost;
  const paybackDays = estimatedDailyProfit > 0 
    ? Math.ceil(totalBuildingCost / estimatedDailyProfit)
    : Infinity;

  return {
    targetGoods,
    targetAmount,
    rawMaterials,
    intermediates,
    buildings: buildingsList,
    totalMaterialCost,
    totalBuildingCost,
    dailyOperatingCost,
    estimatedDailyRevenue,
    estimatedDailyProfit,
    paybackDays,
  };
}

/**
 * 按产业分组商品
 */
export function groupGoodsByIndustry(): Map<string, GoodsDefinition[]> {
  if (cachedGoodsByIndustry) {
    return cachedGoodsByIndustry;
  }

  const result = new Map<string, GoodsDefinition[]>();

  for (const [industry, goods] of Object.entries(GOODS_BY_INDUSTRY)) {
    result.set(industry, goods);
  }

  cachedGoodsByIndustry = result;
  return result;
}

/**
 * 按层级分组商品
 */
export function groupGoodsByTier(): Map<number, GoodsDefinition[]> {
  if (cachedGoodsByTier) {
    return cachedGoodsByTier;
  }

  const result = new Map<number, GoodsDefinition[]>();

  for (const goods of ALL_GOODS) {
    const tier = goods.tier;
    const existing = result.get(tier) || [];
    existing.push(goods);
    result.set(tier, existing);
  }

  cachedGoodsByTier = result;
  return result;
}

/**
 * 搜索商品
 */
export function searchGoods(query: string, filters: Partial<FilterState> = {}): GoodsDefinition[] {
  let results = [...ALL_GOODS];

  // 搜索查询
  if (query && query.trim()) {
    const lowerQuery = query.toLowerCase().trim();
    results = results.filter(goods => 
      goods.name.toLowerCase().includes(lowerQuery) ||
      goods.key.toLowerCase().includes(lowerQuery) ||
      goods.description.toLowerCase().includes(lowerQuery)
    );
  }

  // 层级筛选
  if (filters.tiers && filters.tiers.length > 0) {
    results = results.filter(goods => filters.tiers!.includes(goods.tier));
  }

  // 类别筛选
  if (filters.categories && filters.categories.length > 0) {
    results = results.filter(goods => filters.categories!.includes(goods.category));
  }

  // 消费品筛选
  if (filters.isConsumerGood !== null && filters.isConsumerGood !== undefined) {
    results = results.filter(goods => goods.isConsumerGood === filters.isConsumerGood);
  }

  // 价格范围筛选
  if (filters.priceRange) {
    const [min, max] = filters.priceRange;
    results = results.filter(goods => 
      goods.basePrice >= min && goods.basePrice <= max
    );
  }

  return results;
}

/**
 * 获取商品所属的产业
 */
export function getGoodsIndustry(goodsId: number): string | null {
  const goodsByIndustry = groupGoodsByIndustry();
  
  for (const [industry, goods] of goodsByIndustry) {
    if (goods.some(g => g.id === goodsId)) {
      return industry;
    }
  }
  
  return null;
}

/**
 * 计算层级视图的节点位置
 */
export function calculateTierLayoutPositions(
  goodsIds?: number[]
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  const goodsByTier = groupGoodsByTier();
  
  const goodsToLayout = goodsIds 
    ? ALL_GOODS.filter(g => goodsIds.includes(g.id))
    : ALL_GOODS;

  // 按层级分组
  const tierGroups = new Map<number, GoodsDefinition[]>();
  for (const goods of goodsToLayout) {
    const tier = goods.tier;
    const existing = tierGroups.get(tier) || [];
    existing.push(goods);
    tierGroups.set(tier, existing);
  }

  // 计算位置
  const tierWidth = 300;
  const nodeHeight = 80;
  const padding = 50;

  for (let tier = 0; tier <= 3; tier++) {
    const goods = tierGroups.get(tier) || [];
    const x = padding + tier * tierWidth;

    goods.forEach((g, index) => {
      const y = padding + index * nodeHeight;
      positions.set(g.id, { x, y });
    });
  }

  return positions;
}

/**
 * 计算追溯视图的节点位置（树形布局）
 */
export function calculateTraceLayoutPositions(
  centerGoodsId: number,
  maxDepth: number = 3
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  
  const centerGoods = GOODS_BY_ID.get(centerGoodsId);
  if (!centerGoods) return positions;

  // 中心位置
  const centerX = 500;
  const centerY = 300;
  positions.set(centerGoodsId, { x: centerX, y: centerY });

  // 上游（左侧）
  const upstream = getUpstreamMaterials(centerGoodsId, 1, maxDepth);
  const upstreamByDepth = new Map<number, UpstreamMaterial[]>();
  
  for (const item of upstream) {
    const depth = item.depth;
    const existing = upstreamByDepth.get(depth) || [];
    existing.push(item);
    upstreamByDepth.set(depth, existing);
  }

  for (const [depth, items] of upstreamByDepth) {
    const x = centerX - depth * 200;
    items.forEach((item, index) => {
      const y = centerY + (index - items.length / 2) * 80;
      if (!positions.has(item.goods.id)) {
        positions.set(item.goods.id, { x, y });
      }
    });
  }

  // 下游（右侧）
  const downstream = getDownstreamProducts(centerGoodsId, maxDepth);
  const downstreamByDepth = new Map<number, DownstreamProduct[]>();
  
  for (const item of downstream) {
    const depth = item.depth;
    const existing = downstreamByDepth.get(depth) || [];
    existing.push(item);
    downstreamByDepth.set(depth, existing);
  }

  for (const [depth, items] of downstreamByDepth) {
    const x = centerX + depth * 200;
    items.forEach((item, index) => {
      const y = centerY + (index - items.length / 2) * 80;
      if (!positions.has(item.goods.id)) {
        positions.set(item.goods.id, { x, y });
      }
    });
  }

  return positions;
}

/**
 * 获取两个商品之间的所有生产路径
 * v4.0: 使用 ProductionInfo 替代 RecipeDefinition
 */
export function getProductionPathBetween(
  sourceGoodsId: number,
  targetGoodsId: number
): ProductionInfo[][] {
  const paths: ProductionInfo[][] = [];
  const visited = new Set<number>();

  function dfs(currentId: number, path: ProductionInfo[]) {
    if (currentId === targetGoodsId) {
      paths.push([...path]);
      return;
    }

    if (visited.has(currentId)) return;
    visited.add(currentId);

    const productions = getProductionsUsingGoods(currentId);
    for (const production of productions) {
      for (const output of production.outputs) {
        dfs(output.goodsId, [...path, production]);
      }
    }

    visited.delete(currentId);
  }

  dfs(sourceGoodsId, []);
  return paths;
}

// 保留旧函数名作为别名（兼容性）
export const getRecipePathBetween = getProductionPathBetween;

/**
 * 清除缓存（如果数据更新需要重新计算）
 */
export function clearCache(): void {
  cachedDependencyGraph = null;
  cachedGoodsByIndustry = null;
  cachedGoodsByTier = null;
}