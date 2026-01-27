/**
 * 交通运输设备建筑专属生产方式
 * 建筑ID: 57-61 (铁路机车厂、摩托车厂、自行车厂、轮胎厂、零部件厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 铁路机车厂 (ID 57) ====================

const LOCOMOTIVE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  57,
  [
    createSlot(57, 'assembly', '总装方式', '🚂', '机车总装技术', 0),
    createSlot(57, 'traction', '牵引系统', '⚡', '牵引技术类型', 1),
  ],
  [
    // 总装方式
    createMethod(57, 0, 'assembly', 'loco_fixed', '固定工位', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      laborMultiplier: 1.6,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 200000,
      description: '固定位置总装',
      effects: ['产量-30%', '人力+60%', '速度-50%'],
    }),
    createMethod(57, 1, 'assembly', 'loco_line', '流水线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 800000,
      description: '总装流水线',
      effects: ['品质+10%'],
    }),
    createMethod(57, 2, 'assembly', 'loco_modular', '模块化装配', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.7,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 2000000,
      description: '模块化预装+总组',
      effects: ['产量+20%', '品质+20%', '人力-30%', '能耗+20%', '维护+20%', '速度+30%'],
    }),
    
    // 牵引系统
    createMethod(57, 10, 'traction', 'loco_diesel', '内燃机车', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.05,
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 150000,
      description: '柴油内燃机车',
      effects: ['产量+10%', '品质-5%', '污染+30%'],
    }),
    createMethod(57, 11, 'traction', 'loco_electric', '电力机车', {
      qualityBonus: 0.15,
      energyMultiplier: 1.2,
      pollutionMultiplier: 0.5,
      requiredLevel: 2,
      switchCost: 500000,
      description: '交流电力机车',
      effects: ['品质+15%', '能耗+20%', '污染-50%'],
    }),
    createMethod(57, 12, 'traction', 'loco_emu', '动车组', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.3,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.3,
      pollutionMultiplier: 0.4,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '高速动车组',
      effects: ['产量-15%', '品质+30%', '人力+30%', '能耗+30%', '维护+30%', '污染-60%'],
    }),
  ]
);

// ==================== 摩托车厂 (ID 58) ====================

const MOTORCYCLE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  58,
  [
    createSlot(58, 'assembly', '装配方式', '🏍️', '摩托车装配技术', 0),
    createSlot(58, 'engine', '发动机', '🔧', '发动机类型', 1),
  ],
  [
    // 装配方式
    createMethod(58, 0, 'assembly', 'moto_manual', '手工装配', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.05,
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 30000,
      description: '人工组装',
      effects: ['产量-30%', '品质+5%', '人力+80%', '速度-50%'],
    }),
    createMethod(58, 1, 'assembly', 'moto_line', '流水线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      laborMultiplier: 0.8,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 200000,
      description: '装配流水线',
      effects: ['产量+10%', '人力-20%', '能耗+20%', '速度+20%'],
    }),
    createMethod(58, 2, 'assembly', 'moto_automated', '自动化产线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.5,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 600000,
      description: '机器人自动化装配',
      effects: ['产量+30%', '品质+15%', '人力-50%', '能耗+40%', '维护+30%', '速度+50%'],
    }),
    
    // 发动机
    createMethod(58, 10, 'engine', 'moto_carb', '化油器发动机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: -0.1,
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      pollutionMultiplier: 1.4,
      requiredLevel: 1,
      switchCost: 50000,
      description: '化油器供油系统',
      effects: ['产量+15%', '品质-10%', '原料-10%', '污染+40%'],
    }),
    createMethod(58, 11, 'engine', 'moto_efi', '电喷发动机', {
      qualityBonus: 0.15,
      pollutionMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 150000,
      description: '电子燃油喷射',
      effects: ['品质+15%', '污染-20%'],
    }),
    createMethod(58, 12, 'engine', 'moto_electric', '电动摩托', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.1,
      pollutionMultiplier: 0.2,
      requiredLevel: 3,
      switchCost: 400000,
      description: '纯电动系统',
      effects: ['产量-10%', '品质+20%', '能耗+10%', '污染-80%'],
    }),
  ]
);

// ==================== 自行车厂 (ID 59) ====================

const BICYCLE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  59,
  [
    createSlot(59, 'production', '生产方式', '🚲', '自行车生产技术', 0),
    createSlot(59, 'frame', '车架工艺', '🔩', '车架制造技术', 1),
  ],
  [
    // 生产方式
    createMethod(59, 0, 'production', 'bike_manual', '手工组装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      qualityBonus: 0.1,
      laborMultiplier: 2.0,
      productionSpeedMultiplier: 0.4,
      requiredLevel: 1,
      switchCost: 15000,
      description: '人工组装',
      effects: ['产量-40%', '品质+10%', '人力+100%', '速度-60%'],
    }),
    createMethod(59, 1, 'production', 'bike_line', '流水线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 0.7,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 100000,
      description: '装配流水线',
      effects: ['产量+20%', '人力-30%', '能耗+20%', '速度+30%'],
    }),
    createMethod(59, 2, 'production', 'bike_automated', '全自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.4,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.6,
      requiredLevel: 3,
      switchCost: 350000,
      description: '全自动生产线',
      effects: ['产量+50%', '品质+10%', '人力-60%', '能耗+40%', '维护+30%', '速度+60%'],
    }),
    
    // 车架工艺
    createMethod(59, 10, 'frame', 'bike_steel', '钢制车架', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: -0.05,
      requiredLevel: 1,
      switchCost: 20000,
      description: '普通钢管车架',
      effects: ['原料-10%', '品质-5%'],
    }),
    createMethod(59, 11, 'frame', 'bike_alloy', '铝合金车架', {
      qualityBonus: 0.15,
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      requiredLevel: 2,
      switchCost: 80000,
      description: '铝合金轻量车架',
      effects: ['原料+10%', '品质+15%'],
    }),
    createMethod(59, 12, 'frame', 'bike_carbon', '碳纤维车架', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.35,
      inputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      laborMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 300000,
      description: '碳纤维复材车架',
      effects: ['产量-20%', '品质+35%', '原料+40%', '人力+30%'],
    }),
  ]
);

// ==================== 轮胎厂 (ID 60) ====================

const TIRE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  60,
  [
    createSlot(60, 'vulcanization', '硫化工艺', '🔥', '轮胎硫化技术', 0),
    createSlot(60, 'construction', '结构类型', '⚙️', '轮胎结构技术', 1),
  ],
  [
    // 硫化工艺
    createMethod(60, 0, 'vulcanization', 'tire_conventional', '常规硫化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 1,
      switchCost: 80000,
      description: '传统蒸汽硫化',
      effects: ['能耗+20%', '速度-10%'],
    }),
    createMethod(60, 1, 'vulcanization', 'tire_nitrogen', '氮气硫化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: 0.1,
      energyMultiplier: 1.0,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 250000,
      description: '氮气填充硫化',
      effects: ['产量+5%', '品质+10%', '速度+10%'],
    }),
    createMethod(60, 2, 'vulcanization', 'tire_induction', '感应硫化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: 0.15,
      energyMultiplier: 0.85,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 500000,
      description: '电磁感应加热硫化',
      effects: ['产量+15%', '品质+15%', '能耗-15%', '维护+30%', '速度+20%'],
    }),
    
    // 结构类型
    createMethod(60, 10, 'construction', 'tire_bias', '斜交胎', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.15,
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 50000,
      description: '斜交帘布层结构',
      effects: ['产量+20%', '品质-15%', '原料-15%', '速度+20%'],
    }),
    createMethod(60, 11, 'construction', 'tire_radial', '子午胎', {
      qualityBonus: 0.15,
      requiredLevel: 2,
      switchCost: 150000,
      description: '子午线结构',
      effects: ['品质+15%'],
    }),
    createMethod(60, 12, 'construction', 'tire_runflat', '缺气保用', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.3,
      inputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 1.2,
      requiredLevel: 4,
      switchCost: 400000,
      description: '防爆缺气保用轮胎',
      effects: ['产量-15%', '品质+30%', '原料+20%', '人力+20%'],
    }),
  ]
);

// ==================== 零部件厂 (ID 61) ====================

const PARTS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  61,
  [
    createSlot(61, 'machining', '加工方式', '🔧', '零部件加工技术', 0),
    createSlot(61, 'quality_level', '质量等级', '✅', '零部件质量标准', 1),
  ],
  [
    // 加工方式
    createMethod(61, 0, 'machining', 'parts_conventional', '普通机加', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: -0.05,
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 40000,
      description: '普通机床加工',
      effects: ['产量-10%', '品质-5%', '人力+30%', '速度-20%'],
    }),
    createMethod(61, 1, 'machining', 'parts_cnc', 'CNC加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.7,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 250000,
      description: '数控加工中心',
      effects: ['产量+10%', '品质+15%', '人力-30%', '能耗+20%', '速度+20%'],
    }),
    createMethod(61, 2, 'machining', 'parts_flexible', '柔性制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.5,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 3,
      switchCost: 700000,
      description: 'FMS柔性制造系统',
      effects: ['产量+25%', '品质+25%', '人力-50%', '能耗+40%', '维护+40%', '速度+40%'],
    }),
    
    // 质量等级
    createMethod(61, 10, 'quality_level', 'parts_aftermarket', '副厂件', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.2,
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      requiredLevel: 1,
      switchCost: 20000,
      description: '非原厂配件',
      effects: ['产量+20%', '品质-20%', '原料-15%'],
    }),
    createMethod(61, 11, 'quality_level', 'parts_oem', 'OEM标准', {
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 100000,
      description: '原厂配套标准',
      effects: ['品质+10%', '人力+10%'],
    }),
    createMethod(61, 12, 'quality_level', 'parts_premium', '高性能件', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.35,
      inputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 4,
      switchCost: 350000,
      description: '赛事级高性能零件',
      effects: ['产量-20%', '品质+35%', '原料+20%', '人力+30%', '速度-20%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const TRANSPORT_CONFIGS: BuildingMethodConfig[] = [
  LOCOMOTIVE_FACTORY_CONFIG,
  MOTORCYCLE_FACTORY_CONFIG,
  BICYCLE_FACTORY_CONFIG,
  TIRE_FACTORY_CONFIG,
  PARTS_FACTORY_CONFIG,
];

/**
 * 注册所有交通运输设备建筑的生产方式
 */
export function registerTransportMethods(): void {
  registerBuildingConfigs(TRANSPORT_CONFIGS);
}