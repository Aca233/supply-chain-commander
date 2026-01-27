/**
 * 医药产业链建筑专属生产方式
 * 建筑ID: 29-31 (药材种植园、制药厂、医疗器械厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 药材种植园 (ID 29) ====================

const HERB_FARM_CONFIG: BuildingMethodConfig = createBuildingConfig(
  29,
  [
    createSlot(29, 'cultivation', '种植方式', '🌿', '药材种植技术', 0),
    createSlot(29, 'harvesting', '采收方式', '🌾', '药材采收技术', 1),
  ],
  [
    // 种植方式
    createMethod(29, 0, 'cultivation', 'herb_traditional', '传统种植', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.5,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 20000,
      description: '传统人工种植',
      effects: ['产量-10%', '品质+15%', '人力+50%', '速度-20%'],
    }),
    createMethod(29, 1, 'cultivation', 'herb_greenhouse', '温室种植', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.8,
      energyMultiplier: 1.4,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 150000,
      description: '现代化温室种植',
      effects: ['产量+20%', '品质+10%', '人力-20%', '能耗+40%', '速度+20%'],
    }),
    createMethod(29, 2, 'cultivation', 'herb_gmp', 'GAP规范种植', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.2,
      energyMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 300000,
      description: '中药材GAP规范化种植',
      effects: ['品质+30%', '人力+20%', '能耗+20%'],
    }),
    
    // 采收方式
    createMethod(29, 10, 'harvesting', 'herb_manual_harvest', '人工采收', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.6,
      productionSpeedMultiplier: 0.6,
      requiredLevel: 1,
      switchCost: 10000,
      description: '人工采摘',
      effects: ['产量-15%', '品质+10%', '人力+60%', '速度-40%'],
    }),
    createMethod(29, 11, 'harvesting', 'herb_semi_mech', '半机械化采收', {
      qualityBonus: 0.05,
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 80000,
      description: '机械辅助采收',
      effects: ['品质+5%', '能耗+20%'],
    }),
    createMethod(29, 12, 'harvesting', 'herb_optimized', '最佳时机采收', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 150000,
      description: '科学监测最佳采收期',
      effects: ['产量-5%', '品质+25%', '人力+30%'],
    }),
  ]
);

// ==================== 制药厂 (ID 30) ====================

const PHARMACEUTICAL_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  30,
  [
    createSlot(30, 'production', '生产工艺', '💊', '药品生产技术', 0),
    createSlot(30, 'quality', '质量标准', '✅', '药品质量控制', 1),
    createSlot(30, 'packaging', '包装方式', '📦', '药品包装技术', 2),
  ],
  [
    // 生产工艺
    createMethod(30, 0, 'production', 'pharma_manual', '手工生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      qualityBonus: -0.1,
      laborMultiplier: 2.0,
      productionSpeedMultiplier: 0.4,
      requiredLevel: 1,
      switchCost: 30000,
      description: '人工配制生产',
      effects: ['产量-40%', '品质-10%', '人力+100%', '速度-60%'],
    }),
    createMethod(30, 1, 'production', 'pharma_semi_auto', '半自动化', {
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
    createMethod(30, 2, 'production', 'pharma_automated', '全自动化', {
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
    createMethod(30, 3, 'production', 'pharma_continuous', '连续制造', {
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
    createMethod(30, 10, 'quality', 'pharma_basic_qa', '基础GMP', {
      qualityBonus: 0.0,
      laborMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 50000,
      description: '基础GMP规范',
      effects: ['人力+10%'],
    }),
    createMethod(30, 11, 'quality', 'pharma_strict_gmp', '严格GMP', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 2,
      switchCost: 200000,
      description: '严格GMP执行',
      effects: ['产量-5%', '品质+20%', '人力+30%', '速度-10%'],
    }),
    createMethod(30, 12, 'quality', 'pharma_fda', 'FDA标准', {
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
    createMethod(30, 20, 'packaging', 'pharma_bulk', '散装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: -0.1,
      laborMultiplier: 0.8,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 20000,
      description: '大包装出货',
      effects: ['产量+15%', '品质-10%', '人力-20%', '速度+30%'],
    }),
    createMethod(30, 21, 'packaging', 'pharma_blister', '铝塑包装', {
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      energyMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 100000,
      description: '铝塑泡罩包装',
      effects: ['品质+10%', '能耗+10%'],
    }),
    createMethod(30, 22, 'packaging', 'pharma_smart_pack', '智能包装', {
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

// ==================== 医疗器械厂 (ID 31) ====================

const MEDICAL_DEVICE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  31,
  [
    createSlot(31, 'manufacturing', '制造工艺', '🔧', '器械制造技术', 0),
    createSlot(31, 'sterilization', '灭菌方式', '🧫', '医疗灭菌技术', 1),
    createSlot(31, 'certification', '认证等级', '📋', '质量认证体系', 2),
  ],
  [
    // 制造工艺
    createMethod(31, 0, 'manufacturing', 'med_manual_assembly', '手工组装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.05,
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 50000,
      description: '人工组装检验',
      effects: ['产量-30%', '品质+5%', '人力+80%', '速度-50%'],
    }),
    createMethod(31, 1, 'manufacturing', 'med_precision', '精密制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 300000,
      description: '精密加工工艺',
      effects: ['品质+15%', '能耗+20%'],
    }),
    createMethod(31, 2, 'manufacturing', 'med_cleanroom', '洁净室生产', {
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
    createMethod(31, 10, 'sterilization', 'med_no_sterile', '非无菌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.2,
      energyMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 10000,
      description: '非植入类产品',
      effects: ['产量+10%', '品质-20%', '能耗-20%', '速度+20%'],
    }),
    createMethod(31, 11, 'sterilization', 'med_eo', 'EO灭菌', {
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      pollutionMultiplier: 1.3,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 2,
      switchCost: 150000,
      description: '环氧乙烷灭菌',
      effects: ['品质+10%', '能耗+20%', '污染+30%', '速度-10%'],
    }),
    createMethod(31, 12, 'sterilization', 'med_radiation', '辐照灭菌', {
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
    createMethod(31, 20, 'certification', 'med_basic_cert', '基础认证', {
      qualityBonus: 0.0,
      laborMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 30000,
      description: '国内基础认证',
      effects: ['人力+10%'],
    }),
    createMethod(31, 21, 'certification', 'med_iso13485', 'ISO13485', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.25,
      productionSpeedMultiplier: 0.95,
      requiredLevel: 2,
      switchCost: 250000,
      description: '医疗器械质量体系',
      effects: ['产量-5%', '品质+20%', '人力+25%', '速度-5%'],
    }),
    createMethod(31, 22, 'certification', 'med_fda_ce', 'FDA/CE认证', {
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

// ==================== 导出和注册 ====================

export const PHARMA_CONFIGS: BuildingMethodConfig[] = [
  HERB_FARM_CONFIG,
  PHARMACEUTICAL_FACTORY_CONFIG,
  MEDICAL_DEVICE_FACTORY_CONFIG,
];

/**
 * 注册所有医药产业链建筑的生产方式
 */
export function registerPharmaMethods(): void {
  registerBuildingConfigs(PHARMA_CONFIGS);
}