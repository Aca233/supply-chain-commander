/**
 * 军工产业链建筑专属生产方式
 * 建筑ID: 37-41 (军工厂、弹药厂、航空厂、军舰厂、导弹厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 军工厂 (ID 37) ====================

const DEFENSE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  37,
  [
    createSlot(37, 'manufacturing', '制造工艺', '🔧', '武器制造技术', 0),
    createSlot(37, 'precision', '精度等级', '🎯', '加工精度标准', 1),
    createSlot(37, 'security', '安全等级', '🔒', '生产安全管理', 2),
  ],
  [
    // 制造工艺
    createMethod(37, 0, 'manufacturing', 'def_conventional', '常规制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.0,
      laborMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 100000,
      description: '传统机加工制造',
      effects: ['基础产能'],
    }),
    createMethod(37, 1, 'manufacturing', 'def_cnc', 'CNC精密制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.7,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 500000,
      description: '数控精密加工',
      effects: ['产量+15%', '品质+15%', '人力-30%', '能耗+30%', '维护+20%', '速度+20%'],
    }),
    createMethod(37, 2, 'manufacturing', 'def_additive', '增材制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.5,
      energyMultiplier: 1.6,
      maintenanceMultiplier: 1.5,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 3,
      switchCost: 1500000,
      description: '3D打印+后处理',
      effects: ['产量-10%', '原料-20%', '品质+25%', '人力-50%', '能耗+60%', '维护+50%', '速度-20%'],
    }),
    
    // 精度等级
    createMethod(37, 10, 'precision', 'def_standard', '军标精度', {
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 50000,
      description: '军用标准精度',
      effects: ['品质+10%', '人力+10%'],
    }),
    createMethod(37, 11, 'precision', 'def_high', '高精度', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 300000,
      description: '高精度加工',
      effects: ['产量-10%', '品质+25%', '人力+30%', '速度-20%'],
    }),
    createMethod(37, 12, 'precision', 'def_ultra', '超高精度', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.75 }],
      qualityBonus: 0.45,
      laborMultiplier: 1.6,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 0.6,
      requiredLevel: 4,
      switchCost: 1000000,
      description: '纳米级精度',
      effects: ['产量-25%', '品质+45%', '人力+60%', '能耗+30%', '速度-40%'],
    }),
    
    // 安全等级
    createMethod(37, 20, 'security', 'def_basic_sec', '基础安保', {
      laborMultiplier: 1.05,
      requiredLevel: 1,
      switchCost: 20000,
      description: '基础安全管理',
      effects: ['人力+5%'],
    }),
    createMethod(37, 21, 'security', 'def_strict_sec', '严格安保', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 0.95,
      requiredLevel: 2,
      switchCost: 150000,
      description: '严格保密制度',
      effects: ['产量-5%', '品质+10%', '人力+20%', '速度-5%'],
    }),
    createMethod(37, 22, 'security', 'def_top_sec', '最高安保', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.4,
      energyMultiplier: 1.1,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 4,
      switchCost: 500000,
      description: '绝密级安保',
      effects: ['产量-10%', '品质+20%', '人力+40%', '能耗+10%', '速度-10%'],
    }),
  ]
);

// ==================== 弹药厂 (ID 38) ====================

const AMMUNITION_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  38,
  [
    createSlot(38, 'production', '生产方式', '💥', '弹药生产技术', 0),
    createSlot(38, 'loading', '装药工艺', '⚗️', '装药技术', 1),
  ],
  [
    // 生产方式
    createMethod(38, 0, 'production', 'ammo_manual', '手工生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      qualityBonus: 0.05,
      laborMultiplier: 2.0,
      productionSpeedMultiplier: 0.4,
      requiredLevel: 1,
      switchCost: 50000,
      description: '人工组装',
      effects: ['产量-40%', '品质+5%', '人力+100%', '速度-60%'],
    }),
    createMethod(38, 1, 'production', 'ammo_semi_auto', '半自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 300000,
      description: '机械辅助生产',
      effects: ['能耗+20%'],
    }),
    createMethod(38, 2, 'production', 'ammo_automated', '全自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.4,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.6,
      requiredLevel: 3,
      switchCost: 1000000,
      description: '全自动生产线',
      effects: ['产量+40%', '品质+15%', '人力-60%', '能耗+50%', '维护+40%', '速度+60%'],
    }),
    
    // 装药工艺
    createMethod(38, 10, 'loading', 'ammo_standard', '标准装药', {
      qualityBonus: 0.0,
      requiredLevel: 1,
      switchCost: 30000,
      description: '标准发射药',
      effects: ['基础产能'],
    }),
    createMethod(38, 11, 'loading', 'ammo_precision', '精密装药', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.85,
      requiredLevel: 2,
      switchCost: 200000,
      description: '高精度称量装药',
      effects: ['产量-10%', '品质+20%', '人力+30%', '速度-15%'],
    }),
    createMethod(38, 12, 'loading', 'ammo_advanced', '先进装药', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.35,
      laborMultiplier: 1.5,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 0.75,
      requiredLevel: 4,
      switchCost: 600000,
      description: '新型高能发射药',
      effects: ['产量-15%', '品质+35%', '人力+50%', '能耗+20%', '速度-25%'],
    }),
  ]
);

// ==================== 航空厂 (ID 39) ====================

const AIRCRAFT_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  39,
  [
    createSlot(39, 'assembly', '总装方式', '✈️', '飞机总装技术', 0),
    createSlot(39, 'composite', '复材工艺', '🛠️', '复合材料技术', 1),
    createSlot(39, 'testing', '测试方式', '🔬', '航空测试技术', 2),
  ],
  [
    // 总装方式
    createMethod(39, 0, 'assembly', 'air_fixed', '固定站位', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.4,
      requiredLevel: 1,
      switchCost: 200000,
      description: '固定站位总装',
      effects: ['产量-40%', '人力+80%', '速度-60%'],
    }),
    createMethod(39, 1, 'assembly', 'air_moving_line', '移动脉动线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 1000000,
      description: '脉动式装配线',
      effects: ['品质+10%', '能耗+20%'],
    }),
    createMethod(39, 2, 'assembly', 'air_digital_twin', '数字孪生装配', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.6,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 5000000,
      description: '数字化智能总装',
      effects: ['产量+20%', '品质+25%', '人力-40%', '能耗+40%', '维护+40%', '速度+30%'],
    }),
    
    // 复材工艺
    createMethod(39, 10, 'composite', 'air_metal', '金属结构', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.05,
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      requiredLevel: 1,
      switchCost: 100000,
      description: '传统金属蒙皮',
      effects: ['产量+10%', '品质-5%', '原料+10%'],
    }),
    createMethod(39, 11, 'composite', 'air_hybrid', '混合结构', {
      qualityBonus: 0.15,
      inputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 600000,
      description: '金属+复材混合',
      effects: ['品质+15%', '人力+10%'],
    }),
    createMethod(39, 12, 'composite', 'air_full_composite', '全复材', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.35,
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      laborMultiplier: 1.3,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 2000000,
      description: '碳纤维复合材料',
      effects: ['产量-10%', '品质+35%', '原料-15%', '人力+30%', '能耗+40%', '维护+30%'],
    }),
    
    // 测试方式
    createMethod(39, 20, 'testing', 'air_basic_test', '基础测试', {
      qualityBonus: 0.0,
      laborMultiplier: 1.1,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 50000,
      description: '基础地面测试',
      effects: ['人力+10%', '速度+10%'],
    }),
    createMethod(39, 21, 'testing', 'air_full_test', '全面测试', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.3,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 0.85,
      requiredLevel: 2,
      switchCost: 400000,
      description: '全系统地面+飞行测试',
      effects: ['产量-5%', '品质+20%', '人力+30%', '能耗+20%', '速度-15%'],
    }),
    createMethod(39, 22, 'testing', 'air_digital_test', '数字化测试', {
      qualityBonus: 0.3,
      laborMultiplier: 0.9,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 3,
      switchCost: 1200000,
      description: '数字仿真+实物测试',
      effects: ['品质+30%', '人力-10%', '能耗+40%', '维护+30%'],
    }),
  ]
);

// ==================== 军舰厂 (ID 40) ====================

const WARSHIP_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  40,
  [
    createSlot(40, 'construction', '建造方式', '🚢', '军舰建造技术', 0),
    createSlot(40, 'systems', '系统集成', '📡', '舰载系统集成', 1),
  ],
  [
    // 建造方式
    createMethod(40, 0, 'construction', 'ship_traditional', '传统建造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 300000,
      description: '传统船台建造',
      effects: ['产量-30%', '人力+80%', '速度-50%'],
    }),
    createMethod(40, 1, 'construction', 'ship_modular', '模块化建造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 1500000,
      description: '分段模块化总组',
      effects: ['品质+10%'],
    }),
    createMethod(40, 2, 'construction', 'ship_integrated', '总段集成', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.7,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 4,
      switchCost: 5000000,
      description: '超级总段建造法',
      effects: ['产量+25%', '品质+20%', '人力-30%', '能耗+30%', '维护+30%', '速度+40%'],
    }),
    
    // 系统集成
    createMethod(40, 10, 'systems', 'ship_basic_sys', '基础系统', {
      qualityBonus: -0.1,
      laborMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 200000,
      description: '基础作战系统',
      effects: ['品质-10%', '人力+20%'],
    }),
    createMethod(40, 11, 'systems', 'ship_integrated_sys', '综合系统', {
      qualityBonus: 0.15,
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 1000000,
      description: '综合作战系统',
      effects: ['品质+15%', '能耗+20%'],
    }),
    createMethod(40, 12, 'systems', 'ship_network_sys', '网络化系统', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.35,
      laborMultiplier: 0.8,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.4,
      requiredLevel: 4,
      switchCost: 3000000,
      description: '全舰网络化作战系统',
      effects: ['产量-5%', '品质+35%', '人力-20%', '能耗+40%', '维护+40%'],
    }),
  ]
);

// ==================== 导弹厂 (ID 41) ====================

const MISSILE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  41,
  [
    createSlot(41, 'assembly', '总装工艺', '🚀', '导弹总装技术', 0),
    createSlot(41, 'guidance', '制导系统', '🎯', '制导技术等级', 1),
  ],
  [
    // 总装工艺
    createMethod(41, 0, 'assembly', 'mis_manual', '手工总装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.05,
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 200000,
      description: '人工精密组装',
      effects: ['产量-30%', '品质+5%', '人力+80%', '速度-50%'],
    }),
    createMethod(41, 1, 'assembly', 'mis_semi_auto', '半自动总装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 800000,
      description: '机械辅助总装',
      effects: ['品质+10%', '能耗+20%'],
    }),
    createMethod(41, 2, 'assembly', 'mis_automated', '智能总装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.5,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 3000000,
      description: '智能化总装线',
      effects: ['产量+20%', '品质+25%', '人力-50%', '能耗+50%', '维护+40%', '速度+30%'],
    }),
    
    // 制导系统
    createMethod(41, 10, 'guidance', 'mis_inertial', '惯性制导', {
      qualityBonus: 0.0,
      laborMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 100000,
      description: '惯性导航系统',
      effects: ['基础产能'],
    }),
    createMethod(41, 11, 'guidance', 'mis_terminal', '末制导', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.2,
      energyMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 500000,
      description: '雷达/红外末制导',
      effects: ['产量-5%', '品质+20%', '人力+20%', '能耗+10%'],
    }),
    createMethod(41, 12, 'guidance', 'mis_composite', '复合制导', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.4,
      laborMultiplier: 1.4,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 0.85,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '多模复合制导',
      effects: ['产量-10%', '品质+40%', '人力+40%', '能耗+30%', '维护+30%', '速度-15%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const DEFENSE_CONFIGS: BuildingMethodConfig[] = [
  DEFENSE_FACTORY_CONFIG,
  AMMUNITION_FACTORY_CONFIG,
  AIRCRAFT_FACTORY_CONFIG,
  WARSHIP_FACTORY_CONFIG,
  MISSILE_FACTORY_CONFIG,
];

/**
 * 注册所有军工产业链建筑的生产方式
 */
export function registerDefenseMethods(): void {
  registerBuildingConfigs(DEFENSE_CONFIGS);
}