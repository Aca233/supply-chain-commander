/**
 * 市场锚定引擎 — 电力本位（kWh Standard）
 *
 * 以锚定电价为基准，沿产业链自底向上推导每种商品的理论成本价（TCP）。
 * TCP 写入 world.goods.baseValues[]，驱动 PriceEngine 的均值回归与价格边界。
 *
 * 推导公式：
 *   TCP(商品) = (Σ输入量×输入TCP + 电力消耗×锚定电价 + 固定成本×权重) / 产出量 × tierMarkup × goodsOverride
 *
 * 联产品（如炼油→燃油+塑料）按 basePrice 权重分摊建筑固定成本。
 *
 * 设计目标：
 *   1. 只暴露 3 个主旋钮 + 4 个 tier 系数 + 品类覆盖表
 *   2. 自动拓扑排序，无需手动管理计算顺序
 *   3. 与现有 PriceEngine 零耦合 —— 仅写 baseValues，不干预价格计算
 */

import { ACTUAL_GOODS_COUNT } from '@/core/constants';
import { ALL_GOODS, GoodsId } from '@/data/goods';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import type { GameWorld } from '@/core/world/GameWorld';
import { DEFAULT_BUILDING_PRODUCTION_BY_ID } from '@/core/production/methods/defaultConfigs';

// --------------- 锚定配置 ---------------

/** 锚定系统配置 */
export interface AnchorConfig {
  /** 锚定电价（元/kWh），主旋钮 */
  electricityPrice: number;
  /** 固定成本在 TCP 中的权重（0-2），调低可压缩固定成本占比 */
  fixedCostWeight: number;
  /** 工资缩放因子（0-3），模拟劳动力成本变化 */
  wageMultiplier: number;
  /** 各 Tier 利润加成系数 [tier0, tier1, tier2, tier3] */
  tierMarkup: [number, number, number, number];
  /**
   * 商品级别覆盖系数表。
   * key 为 goodsId，value 为额外乘数（在 tierMarkup 之上再乘）。
   * 用于修正特殊品类（奢侈品溢价、农产品隐性成本、联产品等）。
   */
  goodsOverrides: Record<number, number>;
}

/**
 * 默认商品覆盖系数（由 autoCalibrate 测试自动校准）。
 *
 * 校准基于 workforce × 市场工资的真实成本模型。
 * override = basePrice / rawTCP（无覆盖时的理论成本价）。
 * >1 表示 basePrice 高于纯成本推导值（隐性成本/稀缺溢价）；
 * <1 表示 basePrice 低于纯成本推导值（规模效应/竞争压价）。
 */
const DEFAULT_GOODS_OVERRIDES: Record<number, number> = {
  // ---- 原材料 (raw) ----
  [GoodsId.IRON_ORE]: 0.876,       // 铁矿标准品
  [GoodsId.COPPER_ORE]: 0.957,     // 铜矿标准品
  [GoodsId.BAUXITE]: 0.907,        // 铝土矿标准品
  [GoodsId.COAL]: 1.12,            // 煤炭运输成本
  [GoodsId.CRUDE_OIL]: 2.449,      // 高固定投资+地质勘探
  [GoodsId.NATURAL_GAS]: 2.209,    // 管网基建+勘探
  [GoodsId.SILICON]: 1.055,        // 硅矿提纯
  [GoodsId.LITHIUM]: 1.149,        // 锂矿稀缺
  [GoodsId.RARE_EARTH]: 1.188,     // 稀土环保成本
  [GoodsId.TIMBER]: 0.906,         // 林地管理
  [GoodsId.COTTON]: 0.868,         // 棉花种植
  [GoodsId.GRAIN]: 0.889,          // 粮食规模种植
  [GoodsId.RUBBER_RAW]: 0.892,     // 橡胶种植
  [GoodsId.LIVESTOCK]: 0.874,      // 畜牧规模养殖
  [GoodsId.SEAFOOD]: 0.84,         // 渔业捕捞
  [GoodsId.HERBS]: 0.837,          // 药材种植
  [GoodsId.GOLD_ORE]: 2.619,       // 金矿品位+勘探
  [GoodsId.DIAMOND_ORE]: 1.995,    // 钻石矿勘探

  // ---- 基础加工品 (basic) ----
  [GoodsId.STEEL]: 1.711,          // 钢铁高固定成本
  [GoodsId.COPPER]: 1.817,         // 铜冶炼能耗
  [GoodsId.ALUMINUM]: 2.099,       // 铝冶炼高能耗
  [GoodsId.FUEL]: 2.205,           // 炼油高固定投资+联产
  [GoodsId.PLASTIC]: 2.205,        // 炼油联产分摊
  [GoodsId.CHEMICALS]: 1.801,      // 化工安全+环保
  [GoodsId.GLASS]: 1.883,          // 玻璃窑炉能耗
  [GoodsId.CEMENT]: 1.587,         // 水泥窑炉能耗
  [GoodsId.PAPER]: 1.179,          // 造纸水处理
  [GoodsId.TEXTILES]: 1.125,       // 纺织品质
  [GoodsId.RUBBER]: 2.011,         // 橡胶深加工
  [GoodsId.MEAT]: 1.341,           // 冷链+屠宰
  [GoodsId.DAIRY]: 1.749,          // 乳品冷链+灭菌
  [GoodsId.PROCESSED_FOOD]: 1.775, // 食品加工规模
  [GoodsId.GOLD]: 3.269,           // 黄金精炼+金融属性
  [GoodsId.DIAMOND]: 7.898,        // 钻石切割+稀缺溢价
  [GoodsId.PHARMA_BASE]: 1.914,    // 医药原料研发
  [GoodsId.SILK]: 0.962,           // 丝绸加工

  // ---- 中间品 (intermediate) ----
  [GoodsId.ELECTRONICS]: 1.385,    // 电子洁净室
  [GoodsId.CHIPS]: 2.119,          // 半导体超洁净室
  [GoodsId.BATTERY]: 1.32,         // 电池材料+安全
  [GoodsId.MOTOR]: 1.108,          // 电机精密制造
  [GoodsId.SCREEN]: 1.418,         // 面板洁净室
  [GoodsId.CAR_PARTS]: 0.942,      // 汽车零部件竞争
  [GoodsId.MECHANICAL_PARTS]: 1.194, // 机械精密加工
  [GoodsId.AIRCRAFT_PARTS]: 1.215, // 航空质检
  [GoodsId.SOLAR_PANEL]: 1.554,    // 光伏精密制造
  [GoodsId.WIND_BLADE]: 1.344,     // 风机叶片复合材料
  [GoodsId.BUILDING_MATERIALS]: 1.093, // 建材生产
  [GoodsId.PACKAGING]: 1.454,      // 包装标准化
  [GoodsId.FROZEN_FOOD]: 1.871,    // 冷链物流
  [GoodsId.CANNED_FOOD]: 1.93,     // 罐装工艺
  [GoodsId.ANTIBIOTICS]: 2.01,     // 抗生素GMP
  [GoodsId.VACCINE]: 1.393,        // 疫苗冷链+GMP
  [GoodsId.MEDICAL_SUPPLIES]: 1.669, // 医疗耗材无菌
  [GoodsId.BEVERAGES]: 1.813,      // 饮料量产
  [GoodsId.SNACKS]: 2.495,         // 零食品牌溢价
  [GoodsId.CLOTHING_FABRIC]: 2.228, // 面料精加工

  // ---- 终端产品 (final) ----
  [GoodsId.SMARTPHONE]: 1.396,     // 智能手机研发+品牌
  [GoodsId.COMPUTER]: 1.271,       // 电脑组装+品牌
  [GoodsId.APPLIANCES]: 0.958,     // 家电竞争
  [GoodsId.DRONE]: 1.368,          // 无人机研发
  [GoodsId.CAR]: 1.408,            // 汽车品牌+渠道
  [GoodsId.ELECTRIC_CAR]: 1.211,   // 电动车补贴+竞争
  [GoodsId.LUXURY_CAR]: 1.188,     // 豪车品牌
  [GoodsId.CLOTHING]: 0.947,       // 服装分销
  [GoodsId.FOOD]: 1.314,           // 食品渠道
  [GoodsId.FURNITURE]: 0.906,      // 家具竞争
  [GoodsId.SOLAR_SYSTEM]: 1.188,   // 光伏系统集成
  [GoodsId.ENERGY_STORAGE]: 1.302, // 储能系统
  [GoodsId.INDUSTRIAL_ROBOT]: 0.983, // 工业机器人
  [GoodsId.BUILDING_PRODUCTS]: 1.054, // 建材成品
  [GoodsId.GENERIC_DRUG]: 1.456,   // 仿制药GMP
  [GoodsId.PATENT_DRUG]: 1.384,    // 专利药研发
  [GoodsId.OTC_DRUG]: 1.685,       // 非处方药渠道
  [GoodsId.MEDICAL_DEVICE]: 1.42,  // 医疗设备认证
  [GoodsId.JEWELRY]: 0.891,        // 珠宝渠道
  [GoodsId.LUXURY_WATCH]: 0.973,   // 腕表工艺
  [GoodsId.DESIGNER_CLOTHING]: 1.421, // 设计师品牌
  [GoodsId.PET_FOOD]: 1.939,       // 宠物食品品牌
  [GoodsId.ORGANIC_FOOD]: 1.591,   // 有机食品认证
};

/** 默认锚定配置 */
export const DEFAULT_ANCHOR_CONFIG: AnchorConfig = {
  electricityPrice: 0.68,
  fixedCostWeight: 1.0,
  wageMultiplier: 1.0,
  tierMarkup: [1.3, 1.25, 1.35, 1.5],
  goodsOverrides: DEFAULT_GOODS_OVERRIDES,
};

// --------------- 配方节点 ---------------

/** 一条用于 TCP 推导的静态配方记录 */
interface AnchorRecipe {
  outputGoodsId: number;
  outputAmount: number;
  inputs: Array<{ goodsId: number; amount: number }>;
  /** 同一配方的所有产出（用于联产品成本分摊） */
  allOutputs: Array<{ goodsId: number; amount: number }>;
  energyPerDay: number;
  fixedCostPerDay: number;
  laborCostPerDay: number;
  tier: 0 | 1 | 2 | 3;
  buildingTypeId: number;
}

// --------------- 配方数据（静态构建）---------------

/** 默认市场日工资 [basic, technical, management]（元/天） */
const DEFAULT_MARKET_WAGES = [120, 260, 520] as const;

/** 计算 variant 的实际日工资成本 */
function calcWageCost(wf: { basic: number; technical: number; management: number }): number {
  return wf.basic * DEFAULT_MARKET_WAGES[0]
       + wf.technical * DEFAULT_MARKET_WAGES[1]
       + wf.management * DEFAULT_MARKET_WAGES[2];
}

function buildRecipeMap(): Map<number, AnchorRecipe[]> {
  const map = new Map<number, AnchorRecipe[]>();

  const entries = Object.entries(DEFAULT_BUILDING_PRODUCTION_BY_ID);
  for (const [buildingIdStr, def] of entries) {
    const buildingTypeId = Number(buildingIdStr);
    if (!def || def.variants.length === 0) continue;

    const buildingDef = BUILDINGS_BY_ID.get(buildingTypeId);
    if (!buildingDef) continue;

    for (const variant of def.variants) {
      // 使用实际 workforce × 市场工资，而非 building.laborCost
      const wageCost = calcWageCost(variant.workforceRequired);
      const fixedCostPerDay = buildingDef.maintenanceCost + wageCost;
      const laborCostPerDay = wageCost;
      const allOutputs = variant.outputs.map((o) => ({
        goodsId: o.goodsId,
        amount: o.amount,
      }));

      for (const output of variant.outputs) {
        if (output.goodsId === GoodsId.ELECTRICITY) continue;

        const goodsDef = ALL_GOODS.find((g) => g.id === output.goodsId);
        if (!goodsDef) continue;

        const recipe: AnchorRecipe = {
          outputGoodsId: output.goodsId,
          outputAmount: output.amount,
          inputs: variant.inputs.map((inp) => ({
            goodsId: inp.goodsId,
            amount: inp.amount,
          })),
          allOutputs,
          energyPerDay: variant.energyRequired || 0,
          fixedCostPerDay,
          laborCostPerDay,
          tier: goodsDef.tier as 0 | 1 | 2 | 3,
          buildingTypeId,
        };

        const existing = map.get(output.goodsId) || [];
        existing.push(recipe);
        map.set(output.goodsId, existing);
      }
    }
  }

  return map;
}

/** 选择标准配方：最低单位固定成本 */
function pickBestRecipe(recipes: AnchorRecipe[]): AnchorRecipe {
  if (recipes.length === 1) return recipes[0];
  return recipes.reduce((best, r) => {
    const costA = best.fixedCostPerDay / best.outputAmount;
    const costB = r.fixedCostPerDay / r.outputAmount;
    return costB < costA ? r : best;
  });
}

// --------------- 拓扑排序 ---------------

function topologicalSort(recipeMap: Map<number, AnchorRecipe[]>): number[] {
  const deps = new Map<number, Set<number>>();
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    deps.set(i, new Set());
  }

  for (const [goodsId, recipes] of recipeMap) {
    const best = pickBestRecipe(recipes);
    for (const inp of best.inputs) {
      deps.get(goodsId)!.add(inp.goodsId);
    }
  }

  // Kahn
  const inDegree = new Map<number, number>();
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    inDegree.set(i, deps.get(i)!.size);
  }

  const queue: number[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: number[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const [goodsId, depSet] of deps) {
      if (depSet.has(id)) {
        depSet.delete(id);
        const newDeg = inDegree.get(goodsId)! - 1;
        inDegree.set(goodsId, newDeg);
        if (newDeg === 0) queue.push(goodsId);
      }
    }
  }

  if (sorted.length < ACTUAL_GOODS_COUNT) {
    for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
      if (!sorted.includes(i)) sorted.push(i);
    }
  }

  return sorted;
}

// --------------- TCP 推导引擎 ---------------

export interface AnchorResult {
  tcp: Float64Array;
  ratio: Float64Array;
  config: AnchorConfig;
}

/**
 * 联产品成本分摊：按 basePrice × amount 权重分配固定成本和能源成本。
 * 返回当前产出商品应承担的固定成本份额 [0,1]。
 */
function getJointProductShare(
  recipe: AnchorRecipe,
  targetGoodsId: number,
): number {
  if (recipe.allOutputs.length <= 1) return 1;

  let totalValue = 0;
  let targetValue = 0;
  for (const out of recipe.allOutputs) {
    const bp = ALL_GOODS[out.goodsId]?.basePrice || 1;
    const value = bp * out.amount;
    totalValue += value;
    if (out.goodsId === targetGoodsId) {
      targetValue = value;
    }
  }

  return totalValue > 0 ? targetValue / totalValue : 1 / recipe.allOutputs.length;
}

export function calculateAnchorPrices(
  config: AnchorConfig = DEFAULT_ANCHOR_CONFIG,
): AnchorResult {
  const recipeMap = buildRecipeMap();
  const sortedIds = topologicalSort(recipeMap);

  const tcp = new Float64Array(ACTUAL_GOODS_COUNT);

  // 电力 = 锚定电价
  tcp[GoodsId.ELECTRICITY] = config.electricityPrice;

  // fallback: 无配方的商品保持 basePrice
  for (const goods of ALL_GOODS) {
    if (goods.id !== GoodsId.ELECTRICITY) {
      tcp[goods.id] = goods.basePrice;
    }
  }

  // 按拓扑顺序推导
  for (const goodsId of sortedIds) {
    if (goodsId === GoodsId.ELECTRICITY) continue;

    const recipes = recipeMap.get(goodsId);
    if (!recipes || recipes.length === 0) continue;

    const recipe = pickBestRecipe(recipes);
    const tierIdx = Math.min(3, Math.max(0, recipe.tier));
    const markup = config.tierMarkup[tierIdx];
    const goodsOverride = config.goodsOverrides[goodsId] ?? 1;

    // 联产品份额
    const share = getJointProductShare(recipe, goodsId);

    // 输入成本（按份额分摊，因为同一批原料产出多种商品）
    let inputCost = 0;
    for (const inp of recipe.inputs) {
      inputCost += inp.amount * tcp[inp.goodsId];
    }
    inputCost *= share;

    // 电力成本（按份额分摊）
    const energyCost = recipe.energyPerDay * config.electricityPrice * share;

    // 固定成本（按份额分摊，工资可独立调节）
    const nonLaborFixed = recipe.fixedCostPerDay - recipe.laborCostPerDay;
    const adjustedLabor = recipe.laborCostPerDay * config.wageMultiplier;
    const fixedCost = (nonLaborFixed + adjustedLabor) * config.fixedCostWeight * share;

    // 单位 TCP
    const totalCost = inputCost + energyCost + fixedCost;
    const unitCost = totalCost / Math.max(1, recipe.outputAmount);

    tcp[goodsId] = unitCost * markup * goodsOverride;
  }

  // 计算偏差比
  const ratio = new Float64Array(ACTUAL_GOODS_COUNT);
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const bp = ALL_GOODS[i]?.basePrice || 1;
    ratio[i] = tcp[i] / bp;
  }

  return { tcp, ratio, config };
}

// --------------- 写入 GameWorld ---------------

export function applyAnchorToWorld(
  world: GameWorld,
  config: AnchorConfig = DEFAULT_ANCHOR_CONFIG,
): AnchorResult {
  const result = calculateAnchorPrices(config);

  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const newBase = result.tcp[i];
    if (Number.isFinite(newBase) && newBase > 0) {
      world.goods.baseValues[i] = newBase;
      world.goods.prices[i] = newBase;
      for (let h = 0; h < 365; h++) {
        world.goods.priceHistory[i * 365 + h] = newBase;
      }
    }
  }

  return result;
}

export function updateAnchorBaseValues(
  world: GameWorld,
  config: AnchorConfig = DEFAULT_ANCHOR_CONFIG,
): AnchorResult {
  const result = calculateAnchorPrices(config);

  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const newBase = result.tcp[i];
    if (Number.isFinite(newBase) && newBase > 0) {
      world.goods.baseValues[i] = newBase;
    }
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const _buildRecipeMap = buildRecipeMap;
export { _buildRecipeMap as buildRecipeMapForTest };

// --------------- 诊断 / 调试工具 ---------------

export function debugAnchorReport(
  config: AnchorConfig = DEFAULT_ANCHOR_CONFIG,
): string {
  const result = calculateAnchorPrices(config);
  const lines: string[] = [
    `=== 市场锚定诊断报告 ===`,
    `锚定电价: ¥${config.electricityPrice}/kWh`,
    `固定成本权重: ${config.fixedCostWeight}`,
    `工资倍率: ${config.wageMultiplier}`,
    `Tier加成: [${config.tierMarkup.join(', ')}]`,
    `商品覆盖数: ${Object.keys(config.goodsOverrides).length}`,
    ``,
    `${'ID'.padStart(3)} | ${'商品'.padEnd(8)} | ${'Tier'} | ${'basePrice'.padStart(10)} | ${'TCP'.padStart(10)} | ${'偏差'.padStart(7)}`,
    `${'-'.repeat(60)}`,
  ];

  for (const goods of ALL_GOODS) {
    const tcp = result.tcp[goods.id];
    const deviation = ((tcp - goods.basePrice) / goods.basePrice * 100).toFixed(1);
    lines.push(
      `${String(goods.id).padStart(3)} | ${goods.name.padEnd(8)} | T${goods.tier}   | ${String(goods.basePrice).padStart(10)} | ${tcp.toFixed(1).padStart(10)} | ${deviation.padStart(6)}%`,
    );
  }

  const deviations = ALL_GOODS.map((g) => Math.abs(result.tcp[g.id] - g.basePrice) / g.basePrice);
  const avgDev = deviations.reduce((s, d) => s + d, 0) / deviations.length;
  const maxDev = Math.max(...deviations);
  const within20 = deviations.filter((d) => d <= 0.2).length;
  const within30 = deviations.filter((d) => d <= 0.3).length;

  lines.push('');
  lines.push(`平均偏差: ${(avgDev * 100).toFixed(1)}%`);
  lines.push(`最大偏差: ${(maxDev * 100).toFixed(1)}%`);
  lines.push(`偏差≤20%的商品: ${within20}/${ALL_GOODS.length} (${(within20 / ALL_GOODS.length * 100).toFixed(0)}%)`);
  lines.push(`偏差≤30%的商品: ${within30}/${ALL_GOODS.length} (${(within30 / ALL_GOODS.length * 100).toFixed(0)}%)`);

  return lines.join('\n');
}
