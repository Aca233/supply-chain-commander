/**
 * 制造类建筑专属生产方式
 * 建筑ID: 16-21 (电子工厂、半导体厂、汽车厂、机械厂、家电厂、造船厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 电子工厂 (ID 16) ====================

const ELECTRONICS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  16,
  [
    createSlot(16, 'assembly', '组装工艺', '🔧', '电子产品组装技术', 0),
    createSlot(16, 'testing', '测试方式', '🔬', '产品测试方法', 1),
    createSlot(16, 'cleanroom', '洁净等级', '💨', '生产环境洁净度', 2),
  ],
  [
    // 组装工艺
    createMethod(16, 0, 'assembly', 'elec_manual', '手工组装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.05,
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 30000,
      description: '人工焊接和组装',
      effects: ['产量-30%', '品质+5%', '人力+80%', '速度-50%'],
    }),
    createMethod(16, 1, 'assembly', 'elec_smt', 'SMT贴片', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.6,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 2,
      switchCost: 400000,
      description: '表面贴装技术',
      effects: ['产量+20%', '品质+15%', '人力-40%', '能耗+20%', '速度+40%'],
    }),
    createMethod(16, 2, 'assembly', 'elec_full_auto', '全自动产线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.3,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.8,
      requiredLevel: 3,
      switchCost: 1500000,
      description: '全自动智能组装线',
      effects: ['产量+50%', '品质+25%', '人力-70%', '能耗+50%', '维护+40%', '速度+80%'],
    }),
    
    // 测试方式
    createMethod(16, 10, 'testing', 'elec_sampling_test', '抽样测试', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.05,
      laborMultiplier: 1.1,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 20000,
      description: '随机抽检',
      effects: ['产量+5%', '品质-5%', '速度+10%'],
    }),
    createMethod(16, 11, 'testing', 'elec_ict', 'ICT测试', {
      qualityBonus: 0.15,
      laborMultiplier: 1.0,
      energyMultiplier: 1.1,
      productionSpeedMultiplier: 0.95,
      requiredLevel: 2,
      switchCost: 150000,
      description: '在线电路测试',
      effects: ['品质+15%', '能耗+10%', '速度-5%'],
    }),
    createMethod(16, 12, 'testing', 'elec_fct', '功能测试+老化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.2,
      energyMultiplier: 1.25,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 3,
      switchCost: 300000,
      description: '全功能测试+高温老化',
      effects: ['产量-5%', '品质+30%', '人力+20%', '能耗+25%', '速度-20%'],
    }),
    
    // 洁净等级
    createMethod(16, 20, 'cleanroom', 'elec_normal', '普通车间', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.1,
      energyMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 10000,
      description: '无特殊洁净要求',
      effects: ['产量+5%', '品质-10%', '能耗-20%'],
    }),
    createMethod(16, 21, 'cleanroom', 'elec_class10k', '万级净化', {
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.15,
      requiredLevel: 2,
      switchCost: 200000,
      description: 'Class 10000洁净室',
      effects: ['品质+10%', '能耗+20%', '维护+15%'],
    }),
    createMethod(16, 22, 'cleanroom', 'elec_class1k', '千级净化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 500000,
      description: 'Class 1000洁净室',
      effects: ['产量-2%', '品质+20%', '能耗+40%', '维护+30%'],
    }),
  ]
);

// ==================== 半导体厂 (ID 17) ====================

const SEMICONDUCTOR_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  17,
  [
    createSlot(17, 'lithography', '光刻技术', '🔦', '芯片光刻工艺', 0),
    createSlot(17, 'process_node', '制程节点', '📐', '晶体管尺寸', 1),
    createSlot(17, 'packaging', '封装方式', '📦', '芯片封装技术', 2),
  ],
  [
    // 光刻技术
    createMethod(17, 0, 'lithography', 'semi_duv', 'DUV光刻', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.0,
      energyMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 500000,
      description: '深紫外光刻技术',
      effects: ['基础产能'],
    }),
    createMethod(17, 1, 'lithography', 'semi_immersion', '浸没式光刻', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: 0.15,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.25,
      requiredLevel: 2,
      switchCost: 2000000,
      description: '浸没式光刻，提高分辨率',
      effects: ['产量+15%', '品质+15%', '能耗+30%', '维护+25%'],
    }),
    createMethod(17, 2, 'lithography', 'semi_euv', 'EUV光刻', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      qualityBonus: 0.35,
      laborMultiplier: 0.8,
      energyMultiplier: 1.8,
      maintenanceMultiplier: 1.6,
      requiredLevel: 4,
      switchCost: 10000000,
      description: '极紫外光刻，最先进工艺',
      effects: ['产量+30%', '品质+35%', '人力-20%', '能耗+80%', '维护+60%'],
    }),
    
    // 制程节点
    createMethod(17, 10, 'process_node', 'semi_28nm', '28nm', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.1,
      energyMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 300000,
      description: '成熟28nm工艺',
      effects: ['产量+20%', '品质-10%', '能耗-20%'],
    }),
    createMethod(17, 11, 'process_node', 'semi_7nm', '7nm', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 3000000,
      description: '先进7nm工艺',
      effects: ['品质+20%', '能耗+20%', '维护+30%'],
    }),
    createMethod(17, 12, 'process_node', 'semi_3nm', '3nm', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.4,
      laborMultiplier: 1.3,
      energyMultiplier: 1.6,
      maintenanceMultiplier: 1.8,
      requiredLevel: 4,
      switchCost: 8000000,
      description: '最尖端3nm工艺',
      effects: ['产量-20%', '品质+40%', '人力+30%', '能耗+60%', '维护+80%'],
    }),
    
    // 封装方式
    createMethod(17, 20, 'packaging', 'semi_dip', 'DIP封装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.05,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 50000,
      description: '双列直插封装',
      effects: ['产量+10%', '品质-5%', '速度+20%'],
    }),
    createMethod(17, 21, 'packaging', 'semi_bga', 'BGA封装', {
      qualityBonus: 0.15,
      laborMultiplier: 1.1,
      productionSpeedMultiplier: 0.95,
      requiredLevel: 2,
      switchCost: 250000,
      description: '球栅阵列封装',
      effects: ['品质+15%', '人力+10%', '速度-5%'],
    }),
    createMethod(17, 22, 'packaging', 'semi_chiplet', 'Chiplet封装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.3,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.4,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '先进多芯片封装',
      effects: ['产量-10%', '品质+30%', '人力+30%', '能耗+30%', '维护+40%'],
    }),
  ]
);

// ==================== 汽车厂 (ID 18) ====================

const CAR_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  18,
  [
    createSlot(18, 'body_process', '车身工艺', '🚗', '车身制造技术', 0),
    createSlot(18, 'paint_shop', '涂装工艺', '🎨', '车身涂装技术', 1),
    createSlot(18, 'assembly_line', '总装方式', '🔧', '整车装配技术', 2),
    createSlot(18, 'quality_system', '质量体系', '✅', '质量管理方式', 3),
  ],
  [
    // 车身工艺
    createMethod(18, 0, 'body_process', 'car_welding_manual', '手工焊接', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: -0.1,
      laborMultiplier: 2.0,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 50000,
      description: '人工焊接车身',
      effects: ['产量-30%', '品质-10%', '人力+100%', '速度-50%'],
    }),
    createMethod(18, 1, 'body_process', 'car_robot_welding', '机器人焊接', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.5,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 1000000,
      description: '工业机器人自动焊接',
      effects: ['产量+10%', '品质+15%', '人力-50%', '能耗+30%', '维护+20%', '速度+30%'],
    }),
    createMethod(18, 2, 'body_process', 'car_aluminum_body', '全铝车身', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.2,
      energyMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 2500000,
      description: '铝合金车身技术',
      effects: ['产量-10%', '原料+20%', '品质+30%', '人力+20%', '能耗+20%'],
    }),
    
    // 涂装工艺
    createMethod(18, 10, 'paint_shop', 'car_manual_paint', '人工喷涂', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: -0.05,
      laborMultiplier: 1.5,
      pollutionMultiplier: 1.5,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 50000,
      description: '人工喷漆',
      effects: ['产量-15%', '品质-5%', '人力+50%', '污染+50%', '速度-30%'],
    }),
    createMethod(18, 11, 'paint_shop', 'car_robot_paint', '机器人喷涂', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.6,
      energyMultiplier: 1.2,
      pollutionMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 600000,
      description: '机器人自动喷涂',
      effects: ['品质+10%', '人力-40%', '能耗+20%', '污染-20%', '速度+20%'],
    }),
    createMethod(18, 12, 'paint_shop', 'car_electrophoretic', '电泳涂装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.5,
      energyMultiplier: 1.4,
      pollutionMultiplier: 0.4,
      requiredLevel: 3,
      switchCost: 1500000,
      description: '阴极电泳底漆',
      effects: ['产量-5%', '品质+25%', '人力-50%', '能耗+40%', '污染-60%'],
    }),
    
    // 总装方式
    createMethod(18, 20, 'assembly_line', 'car_fixed_station', '固定工位', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.4,
      requiredLevel: 1,
      switchCost: 30000,
      description: '固定位置组装',
      effects: ['产量-40%', '人力+80%', '速度-60%'],
    }),
    createMethod(18, 21, 'assembly_line', 'car_moving_line', '流水线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 500000,
      description: '传统流水装配线',
      effects: ['基础产能'],
    }),
    createMethod(18, 22, 'assembly_line', 'car_flexible_line', '柔性产线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.7,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 2000000,
      description: '柔性智能装配线',
      effects: ['产量+20%', '品质+10%', '人力-30%', '能耗+20%', '维护+30%', '速度+30%'],
    }),
    
    // 质量体系
    createMethod(18, 30, 'quality_system', 'car_basic_qa', '基础质检', {
      qualityBonus: 0.0,
      laborMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 20000,
      description: '基础质量检验',
      effects: ['人力+10%'],
    }),
    createMethod(18, 31, 'quality_system', 'car_iso_ts', 'IATF16949', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 300000,
      description: '汽车行业质量标准',
      effects: ['产量-2%', '品质+20%', '人力+20%'],
    }),
    createMethod(18, 32, 'quality_system', 'car_zero_defect', '零缺陷体系', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.35,
      laborMultiplier: 1.4,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 3,
      switchCost: 800000,
      description: '全面质量管理+防错',
      effects: ['产量-5%', '品质+35%', '人力+40%', '速度-10%'],
    }),
  ]
);

// ==================== 机械厂 (ID 19) ====================

const MACHINERY_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  19,
  [
    createSlot(19, 'machining', '加工方式', '⚙️', '机械加工技术', 0),
    createSlot(19, 'precision', '精度等级', '🎯', '加工精度标准', 1),
    createSlot(19, 'heat_treatment', '热处理', '🔥', '零件热处理', 2),
  ],
  [
    // 加工方式
    createMethod(19, 0, 'machining', 'mech_conventional', '普通机床', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: -0.05,
      laborMultiplier: 1.4,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 40000,
      description: '传统手动机床加工',
      effects: ['产量-15%', '品质-5%', '人力+40%', '速度-30%'],
    }),
    createMethod(19, 1, 'machining', 'mech_cnc', 'CNC加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.7,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 300000,
      description: '数控机床加工',
      effects: ['产量+10%', '品质+15%', '人力-30%', '能耗+20%', '速度+30%'],
    }),
    createMethod(19, 2, 'machining', 'mech_5axis', '五轴加工中心', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.3,
      laborMultiplier: 0.5,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 3,
      switchCost: 1200000,
      description: '高精度五轴联动',
      effects: ['品质+30%', '人力-50%', '能耗+40%', '维护+40%', '速度+10%'],
    }),
    
    // 精度等级
    createMethod(19, 10, 'precision', 'mech_rough', '粗加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: -0.15,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 10000,
      description: '粗加工精度',
      effects: ['产量+25%', '品质-15%', '速度+30%'],
    }),
    createMethod(19, 11, 'precision', 'mech_standard', '标准精度', {
      qualityBonus: 0.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 30000,
      description: '一般工业精度',
      effects: ['基础产能'],
    }),
    createMethod(19, 12, 'precision', 'mech_precision', '精密加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 200000,
      description: '高精度加工',
      effects: ['产量-15%', '品质+25%', '人力+20%', '速度-30%'],
    }),
    createMethod(19, 13, 'precision', 'mech_ultra_precision', '超精密加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      qualityBonus: 0.45,
      laborMultiplier: 1.5,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.5,
      productionSpeedMultiplier: 0.4,
      requiredLevel: 4,
      switchCost: 800000,
      description: '纳米级精度',
      effects: ['产量-40%', '品质+45%', '人力+50%', '能耗+30%', '维护+50%', '速度-60%'],
    }),
    
    // 热处理
    createMethod(19, 20, 'heat_treatment', 'mech_no_heat', '无热处理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.1,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 5000,
      description: '不做热处理',
      effects: ['产量+5%', '品质-10%', '速度+10%'],
    }),
    createMethod(19, 21, 'heat_treatment', 'mech_basic_heat', '常规热处理', {
      qualityBonus: 0.1,
      energyMultiplier: 1.15,
      requiredLevel: 1,
      switchCost: 50000,
      description: '淬火+回火',
      effects: ['品质+10%', '能耗+15%'],
    }),
    createMethod(19, 22, 'heat_treatment', 'mech_vacuum_heat', '真空热处理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 400000,
      description: '真空炉热处理',
      effects: ['产量-5%', '品质+25%', '能耗+40%', '维护+20%'],
    }),
  ]
);

// ==================== 家电厂 (ID 20) ====================

const APPLIANCE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  20,
  [
    createSlot(20, 'production_mode', '生产模式', '🏭', '生产组织方式', 0),
    createSlot(20, 'testing', '测试标准', '🔬', '产品检测方式', 1),
    createSlot(20, 'energy_grade', '能效等级', '⚡', '产品能效标准', 2),
  ],
  [
    // 生产模式
    createMethod(20, 0, 'production_mode', 'app_batch', '批量生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: -0.05,
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 80000,
      description: '大批量标准化生产',
      effects: ['产量+15%', '品质-5%', '速度+10%'],
    }),
    createMethod(20, 1, 'production_mode', 'app_modular', '模块化生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.85,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 200000,
      description: '模块化组装',
      effects: ['品质+10%', '人力-15%'],
    }),
    createMethod(20, 2, 'production_mode', 'app_flexible', '柔性制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.7,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.25,
      requiredLevel: 3,
      switchCost: 600000,
      description: '柔性生产系统',
      effects: ['产量-5%', '品质+20%', '人力-30%', '能耗+20%', '维护+25%'],
    }),
    
    // 测试标准
    createMethod(20, 10, 'testing', 'app_sample_test', '抽样检验', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.05,
      productionSpeedMultiplier: 1.05,
      requiredLevel: 1,
      switchCost: 15000,
      description: '比例抽检',
      effects: ['产量+5%', '品质-5%', '速度+5%'],
    }),
    createMethod(20, 11, 'testing', 'app_full_test', '全检', {
      qualityBonus: 0.15,
      laborMultiplier: 1.15,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 2,
      switchCost: 100000,
      description: '100%全项检验',
      effects: ['品质+15%', '人力+15%', '速度-10%'],
    }),
    createMethod(20, 12, 'testing', 'app_auto_test', '自动化测试', {
      qualityBonus: 0.2,
      laborMultiplier: 0.8,
      energyMultiplier: 1.15,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 3,
      switchCost: 350000,
      description: 'ATE自动测试设备',
      effects: ['品质+20%', '人力-20%', '能耗+15%', '维护+20%'],
    }),
    
    // 能效等级
    createMethod(20, 20, 'energy_grade', 'app_grade3', '三级能效', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: -0.1,
      requiredLevel: 1,
      switchCost: 20000,
      description: '最低能效标准',
      effects: ['产量+10%', '原料-5%', '品质-10%'],
    }),
    createMethod(20, 21, 'energy_grade', 'app_grade1', '一级能效', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      requiredLevel: 2,
      switchCost: 150000,
      description: '高能效产品',
      effects: ['原料+10%', '品质+15%'],
    }),
    createMethod(20, 22, 'energy_grade', 'app_energy_star', '超一级能效', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.1,
      requiredLevel: 3,
      switchCost: 400000,
      description: '最高能效标准',
      effects: ['产量-10%', '原料+20%', '品质+30%', '人力+10%'],
    }),
  ]
);

// ==================== 造船厂 (ID 21) ====================

const SHIPYARD_CONFIG: BuildingMethodConfig = createBuildingConfig(
  21,
  [
    createSlot(21, 'construction', '建造方式', '🚢', '船舶建造技术', 0),
    createSlot(21, 'welding', '焊接工艺', '🔥', '船体焊接技术', 1),
    createSlot(21, 'outfitting', '舾装方式', '🔧', '船舶舾装技术', 2),
  ],
  [
    // 建造方式
    createMethod(21, 0, 'construction', 'ship_traditional', '传统建造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 100000,
      description: '传统船台建造',
      effects: ['产量-30%', '人力+80%', '速度-50%'],
    }),
    createMethod(21, 1, 'construction', 'ship_block', '分段建造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 500000,
      description: '分段预制+总组',
      effects: ['基础产能'],
    }),
    createMethod(21, 2, 'construction', 'ship_mega_block', '巨型总段', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.7,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 3,
      switchCost: 2000000,
      description: '巨型总段建造法',
      effects: ['产量+25%', '品质+10%', '人力-30%', '能耗+30%', '维护+30%', '速度+40%'],
    }),
    
    // 焊接工艺
    createMethod(21, 10, 'welding', 'ship_manual_weld', '手工焊接', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: -0.05,
      laborMultiplier: 1.6,
      productionSpeedMultiplier: 0.6,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统手工电弧焊',
      effects: ['产量-15%', '品质-5%', '人力+60%', '速度-40%'],
    }),
    createMethod(21, 11, 'welding', 'ship_semi_auto', '半自动焊', {
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 150000,
      description: 'CO2气体保护焊',
      effects: ['品质+10%', '人力+10%'],
    }),
    createMethod(21, 12, 'welding', 'ship_robot_weld', '机器人焊接', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.5,
      energyMultiplier: 1.25,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 800000,
      description: '焊接机器人工作站',
      effects: ['产量+10%', '品质+20%', '人力-50%', '能耗+25%', '维护+30%', '速度+30%'],
    }),
    
    // 舾装方式
    createMethod(21, 20, 'outfitting', 'ship_dock_outfit', '坞内舾装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 50000,
      description: '船坞内完成舾装',
      effects: ['产量-15%', '人力+30%', '速度-30%'],
    }),
    createMethod(21, 21, 'outfitting', 'ship_pre_outfit', '预舾装', {
      qualityBonus: 0.1,
      laborMultiplier: 0.9,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 300000,
      description: '分段预舾装',
      effects: ['品质+10%', '人力-10%', '速度+20%'],
    }),
    createMethod(21, 22, 'outfitting', 'ship_zone_outfit', '区域舾装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.75,
      energyMultiplier: 1.1,
      productionSpeedMultiplier: 1.35,
      requiredLevel: 3,
      switchCost: 600000,
      description: '区域一体化舾装',
      effects: ['产量+10%', '品质+15%', '人力-25%', '能耗+10%', '速度+35%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const MANUFACTURING_CONFIGS: BuildingMethodConfig[] = [
  ELECTRONICS_FACTORY_CONFIG,
  SEMICONDUCTOR_FACTORY_CONFIG,
  CAR_FACTORY_CONFIG,
  MACHINERY_FACTORY_CONFIG,
  APPLIANCE_FACTORY_CONFIG,
  SHIPYARD_CONFIG,
];

/**
 * 注册所有制造类建筑的生产方式
 */
export function registerManufacturingMethods(): void {
  registerBuildingConfigs(MANUFACTURING_CONFIGS);
}