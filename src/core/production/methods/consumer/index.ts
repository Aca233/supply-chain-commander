/**
 * 日化产业链建筑专属生产方式
 * 建筑ID: 52-56 (日化厂、塑料厂、造纸厂、印刷厂、包装厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 日化厂 (ID 52) ====================

const DAILY_CHEM_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  52,
  [
    createSlot(52, 'production', '生产工艺', '🧴', '日化品生产技术', 0),
    createSlot(52, 'formulation', '配方等级', '📋', '产品配方技术', 1),
  ],
  [
    // 生产工艺
    createMethod(52, 0, 'production', 'daily_batch', '批次生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.05,
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 50000,
      description: '小批量生产',
      effects: ['产量-10%', '品质+5%', '人力+20%', '速度-20%'],
    }),
    createMethod(52, 1, 'production', 'daily_continuous', '连续生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 0.7,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 250000,
      description: '连续化生产线',
      effects: ['产量+20%', '人力-30%', '能耗+20%', '速度+30%'],
    }),
    createMethod(52, 2, 'production', 'daily_smart', '智能生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.4,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 700000,
      description: '智能化工厂',
      effects: ['产量+35%', '品质+15%', '人力-60%', '能耗+40%', '维护+30%', '速度+50%'],
    }),
    
    // 配方等级
    createMethod(52, 10, 'formulation', 'daily_basic', '基础配方', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: -0.1,
      requiredLevel: 1,
      switchCost: 20000,
      description: '标准配方产品',
      effects: ['品质-10%'],
    }),
    createMethod(52, 11, 'formulation', 'daily_premium', '优质配方', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: 0.15,
      requiredLevel: 2,
      switchCost: 100000,
      description: '优质原料配方',
      effects: ['原料+15%', '品质+15%'],
    }),
    createMethod(52, 12, 'formulation', 'daily_organic', '天然有机', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.3,
      pollutionMultiplier: 0.5,
      requiredLevel: 3,
      switchCost: 350000,
      description: '天然有机配方',
      effects: ['原料+35%', '产量-10%', '品质+30%', '污染-50%'],
    }),
  ]
);

// ==================== 塑料厂 (ID 53) ====================

const PLASTICS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  53,
  [
    createSlot(53, 'molding', '成型工艺', '🔧', '塑料成型技术', 0),
    createSlot(53, 'materials', '材料类型', '♻️', '塑料材料选择', 1),
  ],
  [
    // 成型工艺
    createMethod(53, 0, 'molding', 'plas_injection', '注塑成型', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 0.7,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 100000,
      description: '注塑机批量生产',
      effects: ['产量+20%', '人力-30%', '能耗+30%', '速度+30%'],
    }),
    createMethod(53, 1, 'molding', 'plas_extrusion', '挤出成型', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.6,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 2,
      switchCost: 200000,
      description: '连续挤出生产',
      effects: ['产量+30%', '人力-40%', '能耗+20%', '速度+40%'],
    }),
    createMethod(53, 2, 'molding', 'plas_blow', '吹塑成型', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      laborMultiplier: 0.8,
      energyMultiplier: 1.25,
      requiredLevel: 2,
      switchCost: 180000,
      description: '中空吹塑成型',
      effects: ['产量+10%', '品质+10%', '原料-10%', '人力-20%', '能耗+25%'],
    }),
    
    // 材料类型
    createMethod(53, 10, 'materials', 'plas_virgin', '原生塑料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 30000,
      description: '全新塑料原料',
      effects: ['品质+10%', '污染+20%'],
    }),
    createMethod(53, 11, 'materials', 'plas_recycled', '再生塑料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: -0.1,
      pollutionMultiplier: 0.6,
      requiredLevel: 2,
      switchCost: 80000,
      description: '回收塑料再利用',
      effects: ['原料-30%', '品质-10%', '污染-40%'],
    }),
    createMethod(53, 12, 'materials', 'plas_bio', '生物塑料', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      qualityBonus: 0.15,
      pollutionMultiplier: 0.4,
      requiredLevel: 3,
      switchCost: 300000,
      description: '可降解生物基塑料',
      effects: ['原料+30%', '品质+15%', '污染-60%'],
    }),
  ]
);

// ==================== 造纸厂 (ID 54) ====================

const PAPER_MILL_CONFIG: BuildingMethodConfig = createBuildingConfig(
  54,
  [
    createSlot(54, 'pulping', '制浆工艺', '🌲', '纸浆制造技术', 0),
    createSlot(54, 'papermaking', '造纸方式', '📄', '纸张制造技术', 1),
  ],
  [
    // 制浆工艺
    createMethod(54, 0, 'pulping', 'paper_mechanical', '机械浆', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.15,
      energyMultiplier: 1.4,
      pollutionMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 80000,
      description: '机械制浆',
      effects: ['产量+20%', '品质-15%', '能耗+40%', '污染-20%'],
    }),
    createMethod(54, 1, 'pulping', 'paper_chemical', '化学浆', {
      qualityBonus: 0.15,
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      pollutionMultiplier: 1.4,
      requiredLevel: 2,
      switchCost: 200000,
      description: '化学蒸煮制浆',
      effects: ['品质+15%', '原料+10%', '污染+40%'],
    }),
    createMethod(54, 2, 'pulping', 'paper_recycled', '再生浆', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      qualityBonus: -0.1,
      energyMultiplier: 0.8,
      pollutionMultiplier: 0.5,
      requiredLevel: 2,
      switchCost: 150000,
      description: '废纸回收制浆',
      effects: ['原料-40%', '品质-10%', '能耗-20%', '污染-50%'],
    }),
    
    // 造纸方式
    createMethod(54, 10, 'papermaking', 'paper_fourdrinier', '长网造纸', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 60000,
      description: '传统长网造纸机',
      effects: ['基础产能'],
    }),
    createMethod(54, 11, 'papermaking', 'paper_high_speed', '高速造纸', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.7,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 500000,
      description: '高速宽幅造纸机',
      effects: ['产量+30%', '人力-30%', '能耗+30%', '维护+20%', '速度+50%'],
    }),
  ]
);

// ==================== 印刷厂 (ID 55) ====================

const PRINTING_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  55,
  [
    createSlot(55, 'printing', '印刷方式', '🖨️', '印刷技术', 0),
    createSlot(55, 'finishing', '后加工', '✨', '印后加工', 1),
  ],
  [
    // 印刷方式
    createMethod(55, 0, 'printing', 'print_offset', '胶印', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 80000,
      description: '传统胶版印刷',
      effects: ['产量+10%', '品质+10%'],
    }),
    createMethod(55, 1, 'printing', 'print_digital', '数码印刷', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.7,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 300000,
      description: '数码喷墨印刷',
      effects: ['产量-10%', '品质+15%', '人力-30%', '能耗+20%', '速度+30%'],
    }),
    createMethod(55, 2, 'printing', 'print_flexo', '柔印', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.05,
      laborMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      pollutionMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 200000,
      description: '柔版印刷',
      effects: ['产量+20%', '品质+5%', '人力-20%', '速度+20%', '污染-30%'],
    }),
    
    // 后加工
    createMethod(55, 10, 'finishing', 'print_basic', '基础加工', {
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 20000,
      description: '裁切+折页',
      effects: ['速度+10%'],
    }),
    createMethod(55, 11, 'finishing', 'print_coating', '覆膜上光', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.15,
      energyMultiplier: 1.15,
      requiredLevel: 2,
      switchCost: 100000,
      description: '覆膜+UV上光',
      effects: ['产量-5%', '品质+15%', '能耗+15%'],
    }),
    createMethod(55, 12, 'finishing', 'print_premium', '高级工艺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.3,
      energyMultiplier: 1.25,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 3,
      switchCost: 300000,
      description: '烫金+压凹凸+模切',
      effects: ['产量-15%', '品质+30%', '人力+30%', '能耗+25%', '速度-30%'],
    }),
  ]
);

// ==================== 包装厂 (ID 56) ====================

const PACKAGING_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  56,
  [
    createSlot(56, 'packaging', '包装方式', '📦', '包装技术', 0),
    createSlot(56, 'materials', '材料选择', '♻️', '包装材料', 1),
  ],
  [
    // 包装方式
    createMethod(56, 0, 'packaging', 'pack_manual', '人工包装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      laborMultiplier: 2.0,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 20000,
      description: '人工包装作业',
      effects: ['产量-30%', '人力+100%', '速度-50%'],
    }),
    createMethod(56, 1, 'packaging', 'pack_semi_auto', '半自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 80000,
      description: '半自动包装设备',
      effects: ['能耗+20%'],
    }),
    createMethod(56, 2, 'packaging', 'pack_automated', '全自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.4,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 400000,
      description: '全自动包装生产线',
      effects: ['产量+30%', '品质+10%', '人力-60%', '能耗+40%', '维护+30%', '速度+50%'],
    }),
    
    // 材料选择
    createMethod(56, 10, 'materials', 'pack_plastic', '塑料包装', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.0,
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 30000,
      description: '塑料薄膜包装',
      effects: ['原料-10%', '污染+30%'],
    }),
    createMethod(56, 11, 'materials', 'pack_paper', '纸质包装', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      pollutionMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 80000,
      description: '纸盒纸箱包装',
      effects: ['品质+10%', '污染-30%'],
    }),
    createMethod(56, 12, 'materials', 'pack_eco', '环保包装', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.2,
      pollutionMultiplier: 0.4,
      requiredLevel: 3,
      switchCost: 250000,
      description: '可降解环保材料',
      effects: ['原料+20%', '品质+20%', '污染-60%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const CONSUMER_CONFIGS: BuildingMethodConfig[] = [
  DAILY_CHEM_FACTORY_CONFIG,
  PLASTICS_FACTORY_CONFIG,
  PAPER_MILL_CONFIG,
  PRINTING_FACTORY_CONFIG,
  PACKAGING_FACTORY_CONFIG,
];

/**
 * 注册所有日化产业链建筑的生产方式
 */
export function registerConsumerMethods(): void {
  registerBuildingConfigs(CONSUMER_CONFIGS);
}