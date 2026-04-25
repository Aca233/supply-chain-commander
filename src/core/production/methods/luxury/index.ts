/**
 * 奢侈品类建筑专属生产方式
 * 重构版本：适配新的2种奢侈品建筑（ID 37-38）
 * 
 * 建筑列表：
 * 37: 金矿/黄金精炼 (GOLD_REFINERY)
 * 38: 奢侈品工坊 (LUXURY_WORKSHOP)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';
import { GoodsId } from '../../../../data/goods';
import { BuildingId } from '../../../../data/buildings';

// ==================== 金矿/黄金精炼 (ID 37) ====================
const GOLD_REFINERY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.GOLD_REFINERY,
  [
    createSlot(37, 'mining_method', '开采方式', '⛏️', '矿石开采技术', 0),
    createSlot(37, 'refining', '精炼工艺', '🔥', '贵金属精炼技术', 1),
    createSlot(37, 'purity', '纯度标准', '💎', '产品纯度等级', 2),
  ],
  [
    // 槽位0: 开采方式
    createMethod(37, 0, 'mining_method', 'gold_open_pit', '露天开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      energyMultiplier: 1.1, pollutionMultiplier: 1.3,
      requiredLevel: 1, switchCost: 200000,
      description: '露天矿坑开采',
      effects: ['产量+20%', '能耗+10%', '污染+30%'],
    }),
    createMethod(37, 1, 'mining_method', 'gold_underground', '地下开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.15,
      laborMultiplier: 1.3, energyMultiplier: 1.2, pollutionMultiplier: 0.7,
      requiredLevel: 2, switchCost: 500000,
      description: '深井矿道开采',
      effects: ['产量-10%', '品质+15%', '人力+30%', '能耗+20%', '污染-30%'],
    }),
    createMethod(37, 2, 'mining_method', 'gold_precision', '精准开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.3,
      laborMultiplier: 1.5, energyMultiplier: 1.3, maintenanceMultiplier: 1.3, pollutionMultiplier: 0.5,
      requiredLevel: 3, switchCost: 1500000,
      description: '高科技精准开采',
      effects: ['产量-20%', '品质+30%', '人力+50%', '能耗+30%', '维护+30%', '污染-50%'],
    }),

    // 槽位1: 精炼工艺
    createMethod(37, 10, 'refining', 'gold_smelting', '火法冶炼', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 1.2, pollutionMultiplier: 1.4,
      requiredLevel: 1, switchCost: 150000,
      description: '传统火法精炼',
      effects: ['产量+10%', '能耗+20%', '污染+40%'],
    }),
    createMethod(37, 11, 'refining', 'gold_electrolysis', '电解精炼', {
      qualityBonus: 0.2, energyMultiplier: 1.4, pollutionMultiplier: 0.8,
      requiredLevel: 2, switchCost: 400000,
      description: '电解法精炼',
      effects: ['品质+20%', '能耗+40%', '污染-20%'],
    }),
    createMethod(37, 12, 'refining', 'gold_zone_refining', '区域熔炼', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.35,
      energyMultiplier: 1.5, maintenanceMultiplier: 1.4, laborMultiplier: 1.3,
      requiredLevel: 3, switchCost: 1000000,
      description: '高纯度区域熔炼',
      effects: ['产量-10%', '品质+35%', '能耗+50%', '维护+40%', '人力+30%'],
    }),

    // 槽位2: 纯度标准
    createMethod(37, 20, 'purity', 'gold_standard', '标准纯度', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      requiredLevel: 1, switchCost: 80000,
      description: '标准商业纯度',
      effects: ['产量+15%'],
    }),
    createMethod(37, 21, 'purity', 'gold_high', '高纯度', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      laborMultiplier: 1.15, energyMultiplier: 1.1,
      requiredLevel: 2, switchCost: 300000,
      description: '99.9%高纯度',
      effects: ['产量-5%', '品质+20%', '人力+15%', '能耗+10%'],
    }),
    createMethod(37, 22, 'purity', 'gold_ultra', '超高纯度', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.4,
      laborMultiplier: 1.4, energyMultiplier: 1.3, maintenanceMultiplier: 1.25,
      requiredLevel: 3, switchCost: 800000,
      description: '99.99%超高纯度',
      effects: ['产量-20%', '品质+40%', '人力+40%', '能耗+30%', '维护+25%'],
    }),
  ]
);

// ==================== 奢侈品工坊 (ID 38) ====================
const LUXURY_WORKSHOP_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.LUXURY_WORKSHOP,
  [
    createSlot(38, 'craftsmanship', '工艺水平', '✨', '制作工艺等级', 0),
    createSlot(38, 'material_grade', '用料等级', '💎', '原材料品质', 1),
    createSlot(38, 'customization', '定制程度', '🎨', '产品定制化程度', 2),
  ],
  [
    // 槽位0: 工艺水平
    createMethod(38, 0, 'craftsmanship', 'lux_standard', '标准工艺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      productionSpeedMultiplier: 1.15,
      requiredLevel: 1, switchCost: 100000,
      description: '标准化生产工艺',
      effects: ['产量+10%', '速度+15%'],
    }),
    createMethod(38, 1, 'craftsmanship', 'lux_artisan', '工匠工艺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.25,
      laborMultiplier: 1.4, productionSpeedMultiplier: 0.7,
      requiredLevel: 2, switchCost: 400000,
      description: '资深工匠手工打造',
      effects: ['产量-15%', '品质+25%', '人力+40%', '速度-30%'],
    }),
    createMethod(38, 2, 'craftsmanship', 'lux_master', '大师工艺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }], qualityBonus: 0.5,
      laborMultiplier: 1.8, productionSpeedMultiplier: 0.4,
      requiredLevel: 3, switchCost: 1500000,
      description: '顶级大师亲手制作',
      effects: ['产量-40%', '品质+50%', '人力+80%', '速度-60%'],
    }),

    // 槽位1: 用料等级
    createMethod(38, 10, 'material_grade', 'lux_economy', '经济用料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: -0.1,
      requiredLevel: 1, switchCost: 50000,
      description: '节约材料成本',
      effects: ['原料-20%', '品质-10%'],
    }),
    createMethod(38, 11, 'material_grade', 'lux_premium', '优质用料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      requiredLevel: 2, switchCost: 200000,
      description: '优质原材料',
      effects: ['原料+10%', '品质+15%'],
    }),
    createMethod(38, 12, 'material_grade', 'lux_finest', '顶级用料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      qualityBonus: 0.35,
      requiredLevel: 3, switchCost: 800000,
      description: '最顶级原材料',
      effects: ['原料+40%', '品质+35%'],
    }),

    // 槽位2: 定制程度
    createMethod(38, 20, 'customization', 'lux_mass', '批量生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      laborMultiplier: 0.8, productionSpeedMultiplier: 1.3,
      requiredLevel: 1, switchCost: 80000,
      description: '批量标准化生产',
      effects: ['产量+25%', '人力-20%', '速度+30%'],
    }),
    createMethod(38, 21, 'customization', 'lux_limited', '限量系列', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.2,
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.85,
      requiredLevel: 2, switchCost: 300000,
      description: '限量版产品系列',
      effects: ['产量-20%', '品质+20%', '人力+20%', '速度-15%'],
    }),
    createMethod(38, 22, 'customization', 'lux_bespoke', '私人定制', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.5 }], qualityBonus: 0.45,
      laborMultiplier: 2.0, productionSpeedMultiplier: 0.4,
      requiredLevel: 3, switchCost: 1000000,
      description: '一对一私人定制',
      effects: ['产量-50%', '品质+45%', '人力+100%', '速度-60%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const LUXURY_CONFIGS: BuildingMethodConfig[] = [
  GOLD_REFINERY_CONFIG,    // ID 37
  LUXURY_WORKSHOP_CONFIG,  // ID 38
];

/**
 * 注册所有奢侈品类建筑的生产方式
 * 共2种建筑（ID 37-38），每种3个槽位
 */
export function registerLuxuryMethods(): void {
  registerBuildingConfigs(LUXURY_CONFIGS);
}