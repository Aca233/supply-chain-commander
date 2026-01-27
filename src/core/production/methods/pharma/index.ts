/**
 * 医药产业链建筑专属生产方式
 * 建筑ID: 32-36 (制药厂、原料药厂、医疗器械厂、中药厂、生物制药厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 制药厂 (ID 32) ====================

const PHARMACEUTICAL_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  32,
  [
    createSlot(32, 'production', '生产工艺', '💊', '药品生产技术', 0),
    createSlot(32, 'quality', '质量标准', '✅', '药品质量控制', 1),
    createSlot(32, 'packaging', '包装方式', '📦', '药品包装技术', 2),
  ],
  [
    // 生产工艺
    createMethod(32, 0, 'production', 'pharma_manual', '手工生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      qualityBonus: -0.1,
      laborMultiplier: 2.0,
      productionSpeedMultiplier: 0.4,
      requiredLevel: 1,
      switchCost: 30000,
      description: '人工配制生产',
      effects: ['产量-40%', '品质-10%', '人力+100%', '速度-60%'],
    }),
    createMethod(32, 1, 'production', 'pharma_semi_auto', '半自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 300000,
      description: '机械辅助生产',
      effects: ['品质+10%', '能耗+20%'],
    }),
    createMethod(32, 2, 'production', 'pharma_automated', '全自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.4,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 1000000,
      description: '全自动生产线',
      effects: ['产量+30%', '品质+20%', '人力-60%', '能耗+50%', '维护+40%', '速度+50%'],
    }),
    createMethod(32, 3, 'production', 'pharma_continuous', '连续制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      qualityBonus: 0.3,
      laborMultiplier: 0.3,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.5,
      productionSpeedMultiplier: 1.8,
      requiredLevel: 4,
      switchCost: 3000000,
      description: '连续化制药技术',
      effects: ['产量+40%', '品质+30%', '人力-70%', '能耗+30%', '维护+50%', '速度+80%'],
    }),
    
    // 质量标准
    createMethod(32, 10, 'quality', 'pharma_basic_qa', '基础GMP', {
      qualityBonus: 0.0,
      laborMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 50000,
      description: '基础GMP规范',
      effects: ['人力+10%'],
    }),
    createMethod(32, 11, 'quality', 'pharma_strict_gmp', '严格GMP', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 2,
      switchCost: 200000,
      description: '严格GMP执行',
      effects: ['产量-5%', '品质+20%', '人力+30%', '速度-10%'],
    }),
    createMethod(32, 12, 'quality', 'pharma_fda', 'FDA标准', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.35,
      laborMultiplier: 1.5,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 0.85,
      requiredLevel: 3,
      switchCost: 800000,
      description: '美国FDA认证标准',
      effects: ['产量-10%', '品质+35%', '人力+50%', '维护+30%', '速度-15%'],
    }),
    
    // 包装方式
    createMethod(32, 20, 'packaging', 'pharma_bulk', '散装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: -0.1,
      laborMultiplier: 0.8,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 20000,
      description: '大包装出货',
      effects: ['产量+15%', '品质-10%', '人力-20%', '速度+30%'],
    }),
    createMethod(32, 21, 'packaging', 'pharma_blister', '铝塑包装', {
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      energyMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 100000,
      description: '铝塑泡罩包装',
      effects: ['品质+10%', '能耗+10%'],
    }),
    createMethod(32, 22, 'packaging', 'pharma_smart_pack', '智能包装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.7,
      energyMultiplier: 1.25,
      maintenanceMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 400000,
      description: '追溯码+防伪包装',
      effects: ['产量-5%', '品质+20%', '人力-30%', '能耗+25%', '维护+20%'],
    }),
  ]
);

// ==================== 原料药厂 (ID 33) ====================

const API_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  33,
  [
    createSlot(33, 'synthesis', '合成路线', '⚗️', '化学合成技术', 0),
    createSlot(33, 'purification', '纯化方式', '✨', '原料药纯化', 1),
  ],
  [
    // 合成路线
    createMethod(33, 0, 'synthesis', 'api_classic', '经典合成', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 100000,
      description: '传统化学合成路线',
      effects: ['原料+10%', '污染+30%'],
    }),
    createMethod(33, 1, 'synthesis', 'api_optimized', '优化路线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.1,
      pollutionMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 400000,
      description: '优化后的合成路线',
      effects: ['产量+10%', '原料-10%', '品质+10%'],
    }),
    createMethod(33, 2, 'synthesis', 'api_green', '绿色合成', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.2,
      energyMultiplier: 0.9,
      pollutionMultiplier: 0.4,
      requiredLevel: 3,
      switchCost: 900000,
      description: '绿色化学合成',
      effects: ['原料-20%', '品质+20%', '能耗-10%', '污染-60%'],
    }),
    createMethod(33, 3, 'synthesis', 'api_biocatalysis', '生物催化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.3,
      energyMultiplier: 0.8,
      pollutionMultiplier: 0.3,
      productionSpeedMultiplier: 0.85,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '酶催化/生物转化',
      effects: ['产量-10%', '原料-30%', '品质+30%', '能耗-20%', '污染-70%', '速度-15%'],
    }),
    
    // 纯化方式
    createMethod(33, 10, 'purification', 'api_crystallization', '结晶法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 80000,
      description: '溶剂结晶纯化',
      effects: ['产量-5%', '品质+10%', '能耗+20%'],
    }),
    createMethod(33, 11, 'purification', 'api_chromatography', '色谱纯化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.2,
      energyMultiplier: 1.4,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 350000,
      description: '层析色谱分离',
      effects: ['产量-15%', '品质+25%', '人力+20%', '能耗+40%', '速度-30%'],
    }),
    createMethod(33, 12, 'purification', 'api_membrane_pure', '膜纯化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.92 }],
      qualityBonus: 0.3,
      laborMultiplier: 0.9,
      energyMultiplier: 1.1,
      maintenanceMultiplier: 1.4,
      requiredLevel: 3,
      switchCost: 600000,
      description: '膜分离技术',
      effects: ['产量-8%', '品质+30%', '人力-10%', '能耗+10%', '维护+40%'],
    }),
  ]
);

// ==================== 医疗器械厂 (ID 34) ====================

const MEDICAL_DEVICE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  34,
  [
    createSlot(34, 'manufacturing', '制造工艺', '🔧', '器械制造技术', 0),
    createSlot(34, 'sterilization', '灭菌方式', '🧫', '医疗灭菌技术', 1),
    createSlot(34, 'certification', '认证等级', '📋', '质量认证体系', 2),
  ],
  [
    // 制造工艺
    createMethod(34, 0, 'manufacturing', 'med_manual_assembly', '手工组装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.05,
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 50000,
      description: '人工组装检验',
      effects: ['产量-30%', '品质+5%', '人力+80%', '速度-50%'],
    }),
    createMethod(34, 1, 'manufacturing', 'med_precision', '精密制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 300000,
      description: '精密加工工艺',
      effects: ['品质+15%', '能耗+20%'],
    }),
    createMethod(34, 2, 'manufacturing', 'med_cleanroom', '洁净室生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.7,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 800000,
      description: '万级洁净室自动化',
      effects: ['产量+10%', '品质+25%', '人力-30%', '能耗+50%', '维护+40%', '速度+20%'],
    }),
    
    // 灭菌方式
    createMethod(34, 10, 'sterilization', 'med_no_sterile', '非无菌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.2,
      energyMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 10000,
      description: '非植入类产品',
      effects: ['产量+10%', '品质-20%', '能耗-20%', '速度+20%'],
    }),
    createMethod(34, 11, 'sterilization', 'med_eo', 'EO灭菌', {
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      pollutionMultiplier: 1.3,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 2,
      switchCost: 150000,
      description: '环氧乙烷灭菌',
      effects: ['品质+10%', '能耗+20%', '污染+30%', '速度-10%'],
    }),
    createMethod(34, 12, 'sterilization', 'med_radiation', '辐照灭菌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: 0.15,
      energyMultiplier: 1.4,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 3,
      switchCost: 500000,
      description: '钴60/电子束灭菌',
      effects: ['产量+5%', '品质+15%', '能耗+40%', '速度+10%'],
    }),
    
    // 认证等级
    createMethod(34, 20, 'certification', 'med_basic_cert', '基础认证', {
      qualityBonus: 0.0,
      laborMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 30000,
      description: '国内基础认证',
      effects: ['人力+10%'],
    }),
    createMethod(34, 21, 'certification', 'med_iso13485', 'ISO13485', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.25,
      productionSpeedMultiplier: 0.95,
      requiredLevel: 2,
      switchCost: 250000,
      description: '医疗器械质量体系',
      effects: ['产量-5%', '品质+20%', '人力+25%', '速度-5%'],
    }),
    createMethod(34, 22, 'certification', 'med_fda_ce', 'FDA/CE认证', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.35,
      laborMultiplier: 1.5,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 4,
      switchCost: 1000000,
      description: '国际最高认证',
      effects: ['产量-10%', '品质+35%', '人力+50%', '维护+30%', '速度-10%'],
    }),
  ]
);

// ==================== 中药厂 (ID 35) ====================

const TCM_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  35,
  [
    createSlot(35, 'extraction', '提取工艺', '🌿', '中药提取技术', 0),
    createSlot(35, 'formulation', '制剂方式', '💊', '中药制剂技术', 1),
  ],
  [
    // 提取工艺
    createMethod(35, 0, 'extraction', 'tcm_decoction', '传统煎煮', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.6,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 0.6,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统水煎法',
      effects: ['产量-20%', '品质+10%', '人力+60%', '能耗+30%', '速度-40%'],
    }),
    createMethod(35, 1, 'extraction', 'tcm_modern_extract', '现代提取', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.8,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 250000,
      description: '现代化提取设备',
      effects: ['产量+10%', '品质+10%', '人力-20%', '能耗+20%', '速度+10%'],
    }),
    createMethod(35, 2, 'extraction', 'tcm_supercritical', '超临界萃取', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.3,
      laborMultiplier: 0.6,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 3,
      switchCost: 700000,
      description: 'CO2超临界萃取',
      effects: ['产量-5%', '品质+30%', '人力-40%', '能耗+50%', '维护+40%', '速度-10%'],
    }),
    
    // 制剂方式
    createMethod(35, 10, 'formulation', 'tcm_traditional', '传统剂型', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.05,
      laborMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 40000,
      description: '丸散膏丹传统剂型',
      effects: ['品质+5%', '人力+30%'],
    }),
    createMethod(35, 11, 'formulation', 'tcm_modern_form', '现代剂型', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.9,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 300000,
      description: '颗粒/胶囊/片剂',
      effects: ['产量+15%', '品质+15%', '人力-10%', '能耗+20%', '速度+20%'],
    }),
    createMethod(35, 12, 'formulation', 'tcm_injection', '注射剂型', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.35,
      laborMultiplier: 1.4,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.5,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 4,
      switchCost: 1200000,
      description: '中药注射液',
      effects: ['产量-15%', '品质+35%', '人力+40%', '能耗+50%', '维护+50%', '速度-30%'],
    }),
  ]
);

// ==================== 生物制药厂 (ID 36) ====================

const BIOTECH_PHARMA_CONFIG: BuildingMethodConfig = createBuildingConfig(
  36,
  [
    createSlot(36, 'expression', '表达系统', '🧬', '蛋白表达技术', 0),
    createSlot(36, 'downstream', '下游纯化', '🔬', '生物纯化技术', 1),
  ],
  [
    // 表达系统
    createMethod(36, 0, 'expression', 'bio_ecoli', '大肠杆菌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.1,
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 150000,
      description: '原核表达系统',
      effects: ['产量+20%', '品质-10%', '速度+30%'],
    }),
    createMethod(36, 1, 'expression', 'bio_cho', 'CHO细胞', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.2,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 600000,
      description: '哺乳动物细胞表达',
      effects: ['品质+20%', '人力+20%', '能耗+40%', '维护+30%', '速度-20%'],
    }),
    createMethod(36, 2, 'expression', 'bio_perfusion', '灌流培养', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.8,
      energyMultiplier: 1.6,
      maintenanceMultiplier: 1.6,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 3,
      switchCost: 1500000,
      description: '连续灌流培养',
      effects: ['产量+40%', '品质+25%', '人力-20%', '能耗+60%', '维护+60%'],
    }),
    
    // 下游纯化
    createMethod(36, 10, 'downstream', 'bio_basic_pure', '基础纯化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.0,
      laborMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 100000,
      description: '基础层析纯化',
      effects: ['产量-10%', '人力+20%'],
    }),
    createMethod(36, 11, 'downstream', 'bio_platform', '平台化纯化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.9,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 500000,
      description: 'Protein A亲和层析',
      effects: ['产量-5%', '品质+20%', '人力-10%', '能耗+20%', '速度+10%'],
    }),
    createMethod(36, 12, 'downstream', 'bio_continuous_pure', '连续纯化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: 0.3,
      laborMultiplier: 0.6,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.5,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 2000000,
      description: '多柱连续层析',
      effects: ['产量+5%', '品质+30%', '人力-40%', '能耗+40%', '维护+50%', '速度+30%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const PHARMA_CONFIGS: BuildingMethodConfig[] = [
  PHARMACEUTICAL_FACTORY_CONFIG,
  API_FACTORY_CONFIG,
  MEDICAL_DEVICE_FACTORY_CONFIG,
  TCM_FACTORY_CONFIG,
  BIOTECH_PHARMA_CONFIG,
];

/**
 * 注册所有医药产业链建筑的生产方式
 */
export function registerPharmaMethods(): void {
  registerBuildingConfigs(PHARMA_CONFIGS);
}