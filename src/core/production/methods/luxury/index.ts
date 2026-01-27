/**
 * 奢侈品产业链建筑专属生产方式
 * 建筑ID: 42-46 (珠宝厂、名表厂、香水厂、高档服装厂、艺术品工坊)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 珠宝厂 (ID 42) ====================

const JEWELRY_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  42,
  [
    createSlot(42, 'crafting', '工艺方式', '💎', '珠宝制作技术', 0),
    createSlot(42, 'design', '设计风格', '✨', '珠宝设计理念', 1),
  ],
  [
    // 工艺方式
    createMethod(42, 0, 'crafting', 'jew_handmade', '手工制作', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.5 }],
      qualityBonus: 0.3,
      laborMultiplier: 2.5,
      productionSpeedMultiplier: 0.3,
      requiredLevel: 1,
      switchCost: 50000,
      description: '大师手工打造',
      effects: ['产量-50%', '品质+30%', '人力+150%', '速度-70%'],
    }),
    createMethod(42, 1, 'crafting', 'jew_semi_machine', '半机械化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.2,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 200000,
      description: '机械辅助手工',
      effects: ['产量-10%', '品质+15%', '人力+20%', '能耗+20%', '速度-20%'],
    }),
    createMethod(42, 2, 'crafting', 'jew_precision', '精密制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.7,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 600000,
      description: '激光切割+CNC',
      effects: ['产量+10%', '品质+10%', '人力-30%', '能耗+40%', '维护+30%', '速度+20%'],
    }),
    
    // 设计风格
    createMethod(42, 10, 'design', 'jew_classic', '经典风格', {
      qualityBonus: 0.1,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 20000,
      description: '传统经典设计',
      effects: ['品质+10%', '速度+10%'],
    }),
    createMethod(42, 11, 'design', 'jew_contemporary', '当代设计', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.15,
      requiredLevel: 2,
      switchCost: 100000,
      description: '现代艺术设计',
      effects: ['产量-5%', '品质+20%', '人力+15%'],
    }),
    createMethod(42, 12, 'design', 'jew_haute', '高级定制', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.45,
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 4,
      switchCost: 400000,
      description: '顶级高定珠宝',
      effects: ['产量-30%', '品质+45%', '人力+80%', '速度-50%'],
    }),
  ]
);

// ==================== 名表厂 (ID 43) ====================

const WATCH_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  43,
  [
    createSlot(43, 'movement', '机芯工艺', '⚙️', '机芯制造技术', 0),
    createSlot(43, 'finishing', '装饰工艺', '✨', '表壳装饰技术', 1),
  ],
  [
    // 机芯工艺
    createMethod(43, 0, 'movement', 'watch_quartz', '石英机芯', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      qualityBonus: -0.15,
      laborMultiplier: 0.6,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 1,
      switchCost: 80000,
      description: '电子石英机芯',
      effects: ['产量+40%', '品质-15%', '人力-40%', '速度+50%'],
    }),
    createMethod(43, 1, 'movement', 'watch_auto', '自动机械', {
      qualityBonus: 0.15,
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 300000,
      description: '自动上链机械机芯',
      effects: ['品质+15%', '人力+20%', '速度-20%'],
    }),
    createMethod(43, 2, 'movement', 'watch_tourbillon', '陀飞轮', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.5 }],
      qualityBonus: 0.45,
      laborMultiplier: 2.5,
      productionSpeedMultiplier: 0.3,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '顶级陀飞轮机芯',
      effects: ['产量-50%', '品质+45%', '人力+150%', '速度-70%'],
    }),
    
    // 装饰工艺
    createMethod(43, 10, 'finishing', 'watch_basic', '基础打磨', {
      qualityBonus: 0.0,
      laborMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 30000,
      description: '机器打磨抛光',
      effects: ['基础产能'],
    }),
    createMethod(43, 11, 'finishing', 'watch_geneva', '日内瓦纹', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.4,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 200000,
      description: '日内瓦波纹打磨',
      effects: ['产量-10%', '品质+20%', '人力+40%', '速度-20%'],
    }),
    createMethod(43, 12, 'finishing', 'watch_haute', '高级装饰', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.4,
      laborMultiplier: 2.0,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 4,
      switchCost: 800000,
      description: '手工雕刻+珐琅',
      effects: ['产量-30%', '品质+40%', '人力+100%', '速度-50%'],
    }),
  ]
);

// ==================== 香水厂 (ID 44) ====================

const PERFUME_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  44,
  [
    createSlot(44, 'extraction', '萃取工艺', '🌸', '香料萃取技术', 0),
    createSlot(44, 'blending', '调香方式', '⚗️', '香水调配技术', 1),
  ],
  [
    // 萃取工艺
    createMethod(44, 0, 'extraction', 'perf_distillation', '蒸馏法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.0,
      energyMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 60000,
      description: '水蒸气蒸馏',
      effects: ['能耗+20%'],
    }),
    createMethod(44, 1, 'extraction', 'perf_enfleurage', '脂吸法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 2,
      switchCost: 200000,
      description: '传统脂吸萃取',
      effects: ['产量-30%', '品质+25%', '人力+80%', '速度-50%'],
    }),
    createMethod(44, 2, 'extraction', 'perf_co2', 'CO2萃取', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.35,
      laborMultiplier: 0.8,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      requiredLevel: 3,
      switchCost: 600000,
      description: '超临界CO2萃取',
      effects: ['产量-10%', '品质+35%', '人力-20%', '能耗+50%', '维护+40%'],
    }),
    
    // 调香方式
    createMethod(44, 10, 'blending', 'perf_formula', '配方调香', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.05,
      laborMultiplier: 0.9,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 30000,
      description: '固定配方生产',
      effects: ['产量+10%', '品质-5%', '人力-10%', '速度+20%'],
    }),
    createMethod(44, 11, 'blending', 'perf_perfumer', '调香师调配', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.4,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 150000,
      description: '专业调香师调配',
      effects: ['产量-10%', '品质+20%', '人力+40%', '速度-20%'],
    }),
    createMethod(44, 12, 'blending', 'perf_master', '大师调香', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      qualityBonus: 0.5,
      laborMultiplier: 2.5,
      productionSpeedMultiplier: 0.4,
      requiredLevel: 4,
      switchCost: 500000,
      description: '顶级调香大师创作',
      effects: ['产量-40%', '品质+50%', '人力+150%', '速度-60%'],
    }),
  ]
);

// ==================== 高档服装厂 (ID 45) ====================

const FASHION_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  45,
  [
    createSlot(45, 'tailoring', '裁剪工艺', '✂️', '服装裁剪技术', 0),
    createSlot(45, 'materials', '面料选用', '🧵', '面料选择标准', 1),
  ],
  [
    // 裁剪工艺
    createMethod(45, 0, 'tailoring', 'fash_machine', '机器裁剪', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.1,
      laborMultiplier: 0.6,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 1,
      switchCost: 80000,
      description: '自动裁剪设备',
      effects: ['产量+20%', '品质-10%', '人力-40%', '能耗+30%', '速度+40%'],
    }),
    createMethod(45, 1, 'tailoring', 'fash_semi_bespoke', '半定制', {
      qualityBonus: 0.15,
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 2,
      switchCost: 200000,
      description: '标准版型+个性调整',
      effects: ['品质+15%', '人力+20%', '速度-10%'],
    }),
    createMethod(45, 2, 'tailoring', 'fash_bespoke', '高级定制', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.5 }],
      qualityBonus: 0.45,
      laborMultiplier: 3.0,
      productionSpeedMultiplier: 0.3,
      requiredLevel: 4,
      switchCost: 800000,
      description: '全手工量身定制',
      effects: ['产量-50%', '品质+45%', '人力+200%', '速度-70%'],
    }),
    
    // 面料选用
    createMethod(45, 10, 'materials', 'fash_standard', '标准面料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.0,
      requiredLevel: 1,
      switchCost: 20000,
      description: '常规高档面料',
      effects: ['基础产能'],
    }),
    createMethod(45, 11, 'materials', 'fash_premium', '顶级面料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      qualityBonus: 0.2,
      requiredLevel: 2,
      switchCost: 150000,
      description: '进口顶级面料',
      effects: ['原料+30%', '品质+20%'],
    }),
    createMethod(45, 12, 'materials', 'fash_exclusive', '独家面料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.6 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.4,
      laborMultiplier: 1.2,
      requiredLevel: 4,
      switchCost: 500000,
      description: '独家定制面料',
      effects: ['原料+60%', '产量-10%', '品质+40%', '人力+20%'],
    }),
  ]
);

// ==================== 艺术品工坊 (ID 46) ====================

const ART_STUDIO_CONFIG: BuildingMethodConfig = createBuildingConfig(
  46,
  [
    createSlot(46, 'creation', '创作方式', '🎨', '艺术创作方式', 0),
    createSlot(46, 'materials', '材料选用', '🖼️', '创作材料标准', 1),
  ],
  [
    // 创作方式
    createMethod(46, 0, 'creation', 'art_reproduction', '复制品', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      qualityBonus: -0.2,
      laborMultiplier: 0.5,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 1,
      switchCost: 30000,
      description: '授权复制品生产',
      effects: ['产量+50%', '品质-20%', '人力-50%', '速度+50%'],
    }),
    createMethod(46, 1, 'creation', 'art_limited', '限量创作', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.5,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 150000,
      description: '限量版艺术品',
      effects: ['产量-20%', '品质+20%', '人力+50%', '速度-30%'],
    }),
    createMethod(46, 2, 'creation', 'art_original', '原创孤品', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.3 }],
      qualityBonus: 0.6,
      laborMultiplier: 4.0,
      productionSpeedMultiplier: 0.2,
      requiredLevel: 4,
      switchCost: 600000,
      description: '艺术家原创作品',
      effects: ['产量-70%', '品质+60%', '人力+300%', '速度-80%'],
    }),
    
    // 材料选用
    createMethod(46, 10, 'materials', 'art_standard_mat', '标准材料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.0,
      requiredLevel: 1,
      switchCost: 10000,
      description: '常规艺术材料',
      effects: ['基础产能'],
    }),
    createMethod(46, 11, 'materials', 'art_premium_mat', '高档材料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      qualityBonus: 0.2,
      requiredLevel: 2,
      switchCost: 100000,
      description: '专业级艺术材料',
      effects: ['原料+40%', '品质+20%'],
    }),
    createMethod(46, 12, 'materials', 'art_rare_mat', '稀有材料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 2.0 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.45,
      laborMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 400000,
      description: '珍稀艺术材料',
      effects: ['原料+100%', '产量-15%', '品质+45%', '人力+30%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const LUXURY_CONFIGS: BuildingMethodConfig[] = [
  JEWELRY_FACTORY_CONFIG,
  WATCH_FACTORY_CONFIG,
  PERFUME_FACTORY_CONFIG,
  FASHION_FACTORY_CONFIG,
  ART_STUDIO_CONFIG,
];

/**
 * 注册所有奢侈品产业链建筑的生产方式
 */
export function registerLuxuryMethods(): void {
  registerBuildingConfigs(LUXURY_CONFIGS);
}