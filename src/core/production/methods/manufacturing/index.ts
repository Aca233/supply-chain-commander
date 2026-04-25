/**
 * 制造类建筑专属生产方式
 * 重构版本：适配新的10种制造建筑（ID 27-36）
 * 
 * 建筑列表：
 * 27: 电子厂         28: 半导体厂        29: 电池厂      30: 零部件厂
 * 31: 汽车工厂       32: 家电厂          33: 家具厂      34: 新能源厂
 * 35: 制药厂         36: 医疗器械厂
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';
import { GoodsId } from '../../../../data/goods';
import { BuildingId } from '../../../../data/buildings';

// ==================== 电子厂 (ID 27) ====================
const ELECTRONICS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.ELECTRONICS_FACTORY,
  [
    createSlot(27, 'assembly_method', '组装方式', '🔧', '电子产品组装技术', 0),
    createSlot(27, 'testing', '测试方式', '🔬', '产品测试技术', 1),
    createSlot(27, 'automation', '自动化程度', '🤖', '生产自动化水平', 2),
  ],
  [
    createMethod(27, 0, 'assembly_method', 'elec_manual', '人工组装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.1,
      laborMultiplier: 1.5, productionSpeedMultiplier: 0.7,
      requiredLevel: 1, switchCost: 50000,
      description: '人工精细组装',
      effects: ['产量-15%', '品质+10%', '人力+50%', '速度-30%'],
    }),
    createMethod(27, 1, 'assembly_method', 'elec_smt', 'SMT贴片', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 0.6, energyMultiplier: 1.3, productionSpeedMultiplier: 1.4,
      requiredLevel: 2, switchCost: 400000,
      description: '表面贴装技术',
      effects: ['产量+20%', '人力-40%', '能耗+30%', '速度+40%'],
    }),
    createMethod(27, 2, 'assembly_method', 'elec_advanced_smt', '高级SMT', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.15,
      laborMultiplier: 0.4, energyMultiplier: 1.5, maintenanceMultiplier: 1.3, productionSpeedMultiplier: 1.6,
      requiredLevel: 3, switchCost: 1000000,
      description: '高精度多层SMT',
      effects: ['产量+40%', '品质+15%', '人力-60%', '能耗+50%', '维护+30%', '速度+60%'],
    }),
    createMethod(27, 10, 'testing', 'elec_sampling', '抽样测试', {
      qualityBonus: 0.05, productionSpeedMultiplier: 1.1,
      requiredLevel: 1, switchCost: 20000,
      description: '随机抽样检测',
      effects: ['品质+5%', '速度+10%'],
    }),
    createMethod(27, 11, 'testing', 'elec_full_test', '全检', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      laborMultiplier: 1.3, productionSpeedMultiplier: 0.85,
      requiredLevel: 2, switchCost: 100000,
      description: '每件产品全功能测试',
      effects: ['产量-5%', '品质+20%', '人力+30%', '速度-15%'],
    }),
    createMethod(27, 12, 'testing', 'elec_aoi', 'AOI自动检测', {
      qualityBonus: 0.25, laborMultiplier: 0.8, energyMultiplier: 1.15, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 350000,
      description: '自动光学检测系统',
      effects: ['品质+25%', '人力-20%', '能耗+15%', '维护+20%'],
    }),
    createMethod(27, 20, 'automation', 'elec_semi_auto', '半自动化', {
      laborMultiplier: 0.9, productionSpeedMultiplier: 1.05,
      requiredLevel: 1, switchCost: 50000,
      description: '半自动化生产线',
      effects: ['人力-10%', '速度+5%'],
    }),
    createMethod(27, 21, 'automation', 'elec_full_auto', '全自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      laborMultiplier: 0.5, energyMultiplier: 1.3, maintenanceMultiplier: 1.2, productionSpeedMultiplier: 1.3,
      requiredLevel: 2, switchCost: 500000,
      description: '全自动化生产',
      effects: ['产量+15%', '人力-50%', '能耗+30%', '维护+20%', '速度+30%'],
    }),
    createMethod(27, 22, 'automation', 'elec_smart', '智能制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: 0.1,
      laborMultiplier: 0.3, energyMultiplier: 1.4, maintenanceMultiplier: 1.4, productionSpeedMultiplier: 1.5,
      requiredLevel: 3, switchCost: 1500000,
      description: 'AI驱动智能生产',
      effects: ['产量+30%', '品质+10%', '人力-70%', '能耗+40%', '维护+40%', '速度+50%'],
    }),
  ]
);

// ==================== 半导体厂 (ID 28) ====================
const SEMICONDUCTOR_FAB_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.SEMICONDUCTOR_FAB,
  [
    createSlot(28, 'process_node', '制程节点', '📏', '芯片制程技术', 0),
    createSlot(28, 'lithography', '光刻技术', '💡', '光刻机类型', 1),
    createSlot(28, 'cleanroom', '洁净室等级', '🧹', '洁净室标准', 2),
  ],
  [
    createMethod(28, 0, 'process_node', 'semi_mature', '成熟制程(28nm+)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      energyMultiplier: 0.8, maintenanceMultiplier: 0.9,
      requiredLevel: 1, switchCost: 500000,
      description: '成熟制程工艺',
      effects: ['产量+20%', '能耗-20%', '维护-10%'],
    }),
    createMethod(28, 1, 'process_node', 'semi_advanced', '先进制程(7-14nm)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.25,
      energyMultiplier: 1.3, maintenanceMultiplier: 1.3, laborMultiplier: 1.2,
      requiredLevel: 2, switchCost: 3000000,
      description: '先进制程工艺',
      effects: ['产量-20%', '品质+25%', '能耗+30%', '维护+30%', '人力+20%'],
    }),
    createMethod(28, 2, 'process_node', 'semi_cutting_edge', '前沿制程(5nm以下)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }], qualityBonus: 0.45,
      energyMultiplier: 1.8, maintenanceMultiplier: 1.6, laborMultiplier: 1.5,
      requiredLevel: 3, switchCost: 10000000,
      description: '最先进制程工艺',
      effects: ['产量-40%', '品质+45%', '能耗+80%', '维护+60%', '人力+50%'],
    }),
    createMethod(28, 10, 'lithography', 'semi_duv', 'DUV光刻', {
      requiredLevel: 1, switchCost: 200000,
      description: '深紫外光刻技术',
      effects: ['基础光刻'],
    }),
    createMethod(28, 11, 'lithography', 'semi_immersion', '浸没式DUV', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.15,
      energyMultiplier: 1.2, maintenanceMultiplier: 1.2,
      requiredLevel: 2, switchCost: 1000000,
      description: '浸没式光刻技术',
      effects: ['产量-5%', '品质+15%', '能耗+20%', '维护+20%'],
    }),
    createMethod(28, 12, 'lithography', 'semi_euv', 'EUV光刻', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.35,
      energyMultiplier: 1.6, maintenanceMultiplier: 1.5, laborMultiplier: 1.3,
      requiredLevel: 3, switchCost: 5000000,
      description: '极紫外光刻技术',
      effects: ['产量-15%', '品质+35%', '能耗+60%', '维护+50%', '人力+30%'],
    }),
    createMethod(28, 20, 'cleanroom', 'semi_class100', 'Class 100', {
      maintenanceMultiplier: 1.0, energyMultiplier: 1.0,
      requiredLevel: 1, switchCost: 100000,
      description: '基础洁净室',
      effects: ['基础洁净'],
    }),
    createMethod(28, 21, 'cleanroom', 'semi_class10', 'Class 10', {
      qualityBonus: 0.1, maintenanceMultiplier: 1.2, energyMultiplier: 1.15,
      requiredLevel: 2, switchCost: 500000,
      description: '高级洁净室',
      effects: ['品质+10%', '维护+20%', '能耗+15%'],
    }),
    createMethod(28, 22, 'cleanroom', 'semi_class1', 'Class 1', {
      qualityBonus: 0.2, maintenanceMultiplier: 1.5, energyMultiplier: 1.4,
      requiredLevel: 3, switchCost: 2000000,
      description: '超净室',
      effects: ['品质+20%', '维护+50%', '能耗+40%'],
    }),
  ]
);

// ==================== 电池厂 (ID 29) ====================
const BATTERY_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.BATTERY_FACTORY,
  [
    createSlot(29, 'cell_type', '电芯类型', '🔋', '电池电芯技术', 0),
    createSlot(29, 'manufacturing', '制造工艺', '⚙️', '电池生产工艺', 1),
    createSlot(29, 'safety', '安全系统', '🛡️', '电池安全测试', 2),
  ],
  [
    createMethod(29, 0, 'cell_type', 'battery_lfp', '磷酸铁锂(LFP)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      inputModifiers: [{ goodsId: GoodsId.LITHIUM, multiplier: 0.9 }],
      energyMultiplier: 0.9, pollutionMultiplier: 0.8,
      requiredLevel: 1, switchCost: 200000,
      description: '磷酸铁锂电池',
      effects: ['产量+10%', '锂用量-10%', '能耗-10%', '污染-20%'],
    }),
    createMethod(29, 1, 'cell_type', 'battery_nmc', '三元锂(NMC)', {
      qualityBonus: 0.15,
      inputModifiers: [{ goodsId: GoodsId.LITHIUM, multiplier: 1.1 }],
      energyMultiplier: 1.1,
      requiredLevel: 2, switchCost: 400000,
      description: '镍钴锰三元电池',
      effects: ['品质+15%', '锂用量+10%', '能耗+10%'],
    }),
    createMethod(29, 2, 'cell_type', 'battery_solid', '固态电池', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.35,
      energyMultiplier: 1.4, maintenanceMultiplier: 1.4, laborMultiplier: 1.3,
      requiredLevel: 3, switchCost: 2000000,
      description: '全固态电池',
      effects: ['产量-30%', '品质+35%', '能耗+40%', '维护+40%', '人力+30%'],
    }),
    createMethod(29, 10, 'manufacturing', 'battery_conventional', '传统卷绕', {
      requiredLevel: 1, switchCost: 100000,
      description: '传统卷绕工艺',
      effects: ['基础工艺'],
    }),
    createMethod(29, 11, 'manufacturing', 'battery_stacking', '叠片工艺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.15,
      laborMultiplier: 1.1, productionSpeedMultiplier: 0.9,
      requiredLevel: 2, switchCost: 400000,
      description: '叠片电芯工艺',
      effects: ['产量-5%', '品质+15%', '人力+10%', '速度-10%'],
    }),
    createMethod(29, 12, 'manufacturing', 'battery_ctc', 'CTC集成', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.2,
      laborMultiplier: 0.7, energyMultiplier: 1.2, maintenanceMultiplier: 1.25,
      requiredLevel: 3, switchCost: 1000000,
      description: '电芯底盘一体化',
      effects: ['产量+15%', '品质+20%', '人力-30%', '能耗+20%', '维护+25%'],
    }),
    createMethod(29, 20, 'safety', 'battery_basic_test', '基础测试', {
      requiredLevel: 1, switchCost: 30000,
      description: '基本安全测试',
      effects: ['基础测试'],
    }),
    createMethod(29, 21, 'safety', 'battery_full_test', '全项测试', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.97 }], qualityBonus: 0.15,
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.9,
      requiredLevel: 2, switchCost: 150000,
      description: '全项安全测试',
      effects: ['产量-3%', '品质+15%', '人力+20%', '速度-10%'],
    }),
    createMethod(29, 22, 'safety', 'battery_abuse_test', '极限测试', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.93 }], qualityBonus: 0.3,
      laborMultiplier: 1.4, energyMultiplier: 1.15,
      requiredLevel: 3, switchCost: 400000,
      description: '极限条件测试',
      effects: ['产量-7%', '品质+30%', '人力+40%', '能耗+15%'],
    }),
  ]
);

// ==================== 零部件厂 (ID 30) ====================
const PARTS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.PARTS_FACTORY,
  [
    createSlot(30, 'machining', '加工方式', '⚙️', '机械加工技术', 0),
    createSlot(30, 'precision', '精度等级', '📏', '加工精度标准', 1),
    createSlot(30, 'material', '材料处理', '🔩', '材料加工方式', 2),
  ],
  [
    createMethod(30, 0, 'machining', 'parts_conventional', '传统加工', {
      requiredLevel: 1, switchCost: 80000,
      description: '传统机床加工',
      effects: ['基础加工'],
    }),
    createMethod(30, 1, 'machining', 'parts_cnc', 'CNC数控', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.15,
      laborMultiplier: 0.7, energyMultiplier: 1.2, productionSpeedMultiplier: 1.3,
      requiredLevel: 2, switchCost: 300000,
      description: '数控机床加工',
      effects: ['产量+20%', '品质+15%', '人力-30%', '能耗+20%', '速度+30%'],
    }),
    createMethod(30, 2, 'machining', 'parts_5axis', '五轴加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.3,
      laborMultiplier: 0.5, energyMultiplier: 1.4, maintenanceMultiplier: 1.3, productionSpeedMultiplier: 1.2,
      requiredLevel: 3, switchCost: 800000,
      description: '五轴联动加工中心',
      effects: ['产量+10%', '品质+30%', '人力-50%', '能耗+40%', '维护+30%', '速度+20%'],
    }),
    createMethod(30, 10, 'precision', 'parts_standard', '标准精度', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      requiredLevel: 1, switchCost: 20000,
      description: '标准精度加工',
      effects: ['产量+10%'],
    }),
    createMethod(30, 11, 'precision', 'parts_high', '高精度', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      laborMultiplier: 1.15, energyMultiplier: 1.1,
      requiredLevel: 2, switchCost: 150000,
      description: '高精度加工',
      effects: ['产量-5%', '品质+20%', '人力+15%', '能耗+10%'],
    }),
    createMethod(30, 12, 'precision', 'parts_ultra', '超精密', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.4,
      laborMultiplier: 1.4, energyMultiplier: 1.3, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 500000,
      description: '超精密加工',
      effects: ['产量-20%', '品质+40%', '人力+40%', '能耗+30%', '维护+30%'],
    }),
    createMethod(30, 20, 'material', 'parts_steel', '钢铁为主', {
      inputModifiers: [{ goodsId: GoodsId.STEEL, multiplier: 1.1 }],
      requiredLevel: 1, switchCost: 30000,
      description: '以钢铁材料为主',
      effects: ['钢材+10%'],
    }),
    createMethod(30, 21, 'material', 'parts_aluminum', '铝合金为主', {
      inputModifiers: [{ goodsId: GoodsId.ALUMINUM, multiplier: 1.1 }, { goodsId: GoodsId.STEEL, multiplier: 0.7 }],
      qualityBonus: 0.05,
      requiredLevel: 2, switchCost: 100000,
      description: '轻量化铝合金',
      effects: ['铝材+10%', '钢材-30%', '品质+5%'],
    }),
    createMethod(30, 22, 'material', 'parts_composite', '复合材料', {
      inputModifiers: [{ goodsId: GoodsId.STEEL, multiplier: 0.5 }, { goodsId: GoodsId.PLASTIC, multiplier: 1.3 }],
      qualityBonus: 0.15, energyMultiplier: 1.2, laborMultiplier: 1.2,
      requiredLevel: 3, switchCost: 300000,
      description: '碳纤维复合材料',
      effects: ['钢材-50%', '塑料+30%', '品质+15%', '能耗+20%', '人力+20%'],
    }),
  ]
);

// ==================== 汽车工厂 (ID 31) ====================
const CAR_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.CAR_FACTORY,
  [
    createSlot(31, 'assembly_line', '总装线', '🚗', '汽车总装技术', 0),
    createSlot(31, 'welding', '焊装技术', '⚡', '车身焊装技术', 1),
    createSlot(31, 'painting', '涂装工艺', '🎨', '车身涂装技术', 2),
  ],
  [
    createMethod(31, 0, 'assembly_line', 'car_traditional', '传统流水线', {
      requiredLevel: 1, switchCost: 200000,
      description: '传统汽车流水线',
      effects: ['基础产能'],
    }),
    createMethod(31, 1, 'assembly_line', 'car_modular', '模块化装配', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.1,
      laborMultiplier: 0.8, productionSpeedMultiplier: 1.25,
      requiredLevel: 2, switchCost: 800000,
      description: '模块化柔性装配',
      effects: ['产量+20%', '品质+10%', '人力-20%', '速度+25%'],
    }),
    createMethod(31, 2, 'assembly_line', 'car_smart', '智能产线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.2,
      laborMultiplier: 0.4, energyMultiplier: 1.4, maintenanceMultiplier: 1.4, productionSpeedMultiplier: 1.5,
      requiredLevel: 3, switchCost: 3000000,
      description: '智能化柔性产线',
      effects: ['产量+40%', '品质+20%', '人力-60%', '能耗+40%', '维护+40%', '速度+50%'],
    }),
    createMethod(31, 10, 'welding', 'car_manual_weld', '半自动焊接', {
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.9,
      requiredLevel: 1, switchCost: 80000,
      description: '半自动焊接工位',
      effects: ['人力+20%', '速度-10%'],
    }),
    createMethod(31, 11, 'welding', 'car_robot_weld', '机器人焊接', {
      qualityBonus: 0.15, laborMultiplier: 0.6, energyMultiplier: 1.2, productionSpeedMultiplier: 1.2,
      requiredLevel: 2, switchCost: 500000,
      description: '焊接机器人',
      effects: ['品质+15%', '人力-40%', '能耗+20%', '速度+20%'],
    }),
    createMethod(31, 12, 'welding', 'car_laser_weld', '激光焊接', {
      qualityBonus: 0.25, laborMultiplier: 0.4, energyMultiplier: 1.4, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 1500000,
      description: '激光焊接技术',
      effects: ['品质+25%', '人力-60%', '能耗+40%', '维护+30%'],
    }),
    createMethod(31, 20, 'painting', 'car_basic_paint', '基础涂装', {
      pollutionMultiplier: 1.3,
      requiredLevel: 1, switchCost: 100000,
      description: '传统喷涂',
      effects: ['污染+30%'],
    }),
    createMethod(31, 21, 'painting', 'car_water_paint', '水性涂装', {
      qualityBonus: 0.1, pollutionMultiplier: 0.6, energyMultiplier: 1.1,
      requiredLevel: 2, switchCost: 400000,
      description: '环保水性漆',
      effects: ['品质+10%', '污染-40%', '能耗+10%'],
    }),
    createMethod(31, 22, 'painting', 'car_powder_coat', '粉末涂装', {
      qualityBonus: 0.2, pollutionMultiplier: 0.3, energyMultiplier: 1.2, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 800000,
      description: '静电粉末涂装',
      effects: ['品质+20%', '污染-70%', '能耗+20%', '维护+20%'],
    }),
  ]
);

// ==================== 家电厂 (ID 32) ====================
const APPLIANCE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.APPLIANCE_FACTORY,
  [
    createSlot(32, 'production_type', '生产模式', '🏭', '生产组织方式', 0),
    createSlot(32, 'assembly', '组装方式', '🔧', '产品组装技术', 1),
    createSlot(32, 'testing', '检测方式', '🔬', '产品质检方式', 2),
  ],
  [
    createMethod(32, 0, 'production_type', 'app_batch', '批量生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      productionSpeedMultiplier: 1.15,
      requiredLevel: 1, switchCost: 80000,
      description: '大批量标准化生产',
      effects: ['产量+10%', '速度+15%'],
    }),
    createMethod(32, 1, 'production_type', 'app_flexible', '柔性生产', {
      qualityBonus: 0.1, laborMultiplier: 0.85, productionSpeedMultiplier: 1.0,
      requiredLevel: 2, switchCost: 250000,
      description: '多品种柔性生产',
      effects: ['品质+10%', '人力-15%'],
    }),
    createMethod(32, 2, 'production_type', 'app_customized', '定制化生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.25,
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.8,
      requiredLevel: 3, switchCost: 500000,
      description: '按需定制生产',
      effects: ['产量-15%', '品质+25%', '人力+20%', '速度-20%'],
    }),
    createMethod(32, 10, 'assembly', 'app_manual', '人工组装', {
      laborMultiplier: 1.3, productionSpeedMultiplier: 0.85,
      requiredLevel: 1, switchCost: 30000,
      description: '人工组装线',
      effects: ['人力+30%', '速度-15%'],
    }),
    createMethod(32, 11, 'assembly', 'app_semi_auto', '半自动组装', {
      laborMultiplier: 0.8, energyMultiplier: 1.1, productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 150000,
      description: '半自动化组装',
      effects: ['人力-20%', '能耗+10%', '速度+10%'],
    }),
    createMethod(32, 12, 'assembly', 'app_full_auto', '全自动组装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 0.4, energyMultiplier: 1.3, maintenanceMultiplier: 1.2, productionSpeedMultiplier: 1.4,
      requiredLevel: 3, switchCost: 500000,
      description: '全自动化产线',
      effects: ['产量+20%', '人力-60%', '能耗+30%', '维护+20%', '速度+40%'],
    }),
    createMethod(32, 20, 'testing', 'app_sampling', '抽检', {
      qualityBonus: 0.05, productionSpeedMultiplier: 1.1,
      requiredLevel: 1, switchCost: 20000,
      description: '抽样检测',
      effects: ['品质+5%', '速度+10%'],
    }),
    createMethod(32, 21, 'testing', 'app_full_test', '全检', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.97 }], qualityBonus: 0.2,
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.9,
      requiredLevel: 2, switchCost: 100000,
      description: '全量检测',
      effects: ['产量-3%', '品质+20%', '人力+20%', '速度-10%'],
    }),
    createMethod(32, 22, 'testing', 'app_smart_test', '智能检测', {
      qualityBonus: 0.25, laborMultiplier: 0.8, energyMultiplier: 1.1, maintenanceMultiplier: 1.15,
      requiredLevel: 3, switchCost: 300000,
      description: 'AI视觉检测',
      effects: ['品质+25%', '人力-20%', '能耗+10%', '维护+15%'],
    }),
  ]
);

// ==================== 家具厂 (ID 33) ====================
const FURNITURE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.FURNITURE_FACTORY,
  [
    createSlot(33, 'crafting', '制作工艺', '🪑', '家具制作技术', 0),
    createSlot(33, 'material', '用材方式', '🪵', '材料使用方式', 1),
    createSlot(33, 'finishing', '表面处理', '✨', '表面涂装工艺', 2),
  ],
  [
    createMethod(33, 0, 'crafting', 'furn_handcraft', '手工制作', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.25,
      laborMultiplier: 1.6, productionSpeedMultiplier: 0.5,
      requiredLevel: 1, switchCost: 30000,
      description: '传统手工家具',
      effects: ['产量-30%', '品质+25%', '人力+60%', '速度-50%'],
    }),
    createMethod(33, 1, 'crafting', 'furn_semi_auto', '半机械化', {
      laborMultiplier: 0.9, productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 100000,
      description: '机械辅助加工',
      effects: ['人力-10%', '速度+10%'],
    }),
    createMethod(33, 2, 'crafting', 'furn_automated', '自动化生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      laborMultiplier: 0.5, energyMultiplier: 1.3, productionSpeedMultiplier: 1.5,
      requiredLevel: 3, switchCost: 400000,
      description: '数控自动化生产',
      effects: ['产量+40%', '人力-50%', '能耗+30%', '速度+50%'],
    }),
    createMethod(33, 10, 'material', 'furn_solid_wood', '实木', {
      inputModifiers: [{ goodsId: GoodsId.TIMBER, multiplier: 1.2 }],
      qualityBonus: 0.2,
      requiredLevel: 1, switchCost: 50000,
      description: '实木家具',
      effects: ['木材+20%', '品质+20%'],
    }),
    createMethod(33, 11, 'material', 'furn_panel', '板材', {
      inputModifiers: [{ goodsId: GoodsId.TIMBER, multiplier: 0.7 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: -0.05,
      requiredLevel: 2, switchCost: 80000,
      description: '人造板材家具',
      effects: ['木材-30%', '产量+20%', '品质-5%'],
    }),
    createMethod(33, 12, 'material', 'furn_mixed', '混合材料', {
      inputModifiers: [{ goodsId: GoodsId.TIMBER, multiplier: 0.8 }, { goodsId: GoodsId.STEEL, multiplier: 1.2 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.1,
      requiredLevel: 2, switchCost: 120000,
      description: '木钢混合结构',
      effects: ['木材-20%', '钢材+20%', '产量+10%', '品质+10%'],
    }),
    createMethod(33, 20, 'finishing', 'furn_natural', '自然原木', {
      qualityBonus: 0.1, pollutionMultiplier: 0.5,
      requiredLevel: 1, switchCost: 20000,
      description: '保持原木纹理',
      effects: ['品质+10%', '污染-50%'],
    }),
    createMethod(33, 21, 'finishing', 'furn_lacquer', '油漆涂装', {
      qualityBonus: 0.15, pollutionMultiplier: 1.3, energyMultiplier: 1.1,
      requiredLevel: 2, switchCost: 80000,
      description: '油漆喷涂',
      effects: ['品质+15%', '污染+30%', '能耗+10%'],
    }),
    createMethod(33, 22, 'finishing', 'furn_water_based', '水性漆', {
      qualityBonus: 0.2, pollutionMultiplier: 0.6, energyMultiplier: 1.15,
      requiredLevel: 3, switchCost: 200000,
      description: '环保水性漆涂装',
      effects: ['品质+20%', '污染-40%', '能耗+15%'],
    }),
  ]
);

// ==================== 新能源厂 (ID 34) ====================
const NEW_ENERGY_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.NEW_ENERGY_FACTORY,
  [
    createSlot(34, 'product_focus', '产品重心', '☀️', '主要产品方向', 0),
    createSlot(34, 'manufacturing', '制造技术', '⚙️', '生产制造技术', 1),
    createSlot(34, 'quality', '品质标准', '📊', '产品品质标准', 2),
  ],
  [
    createMethod(34, 0, 'product_focus', 'ne_solar', '光伏产品', {
      outputModifiers: [{ goodsId: GoodsId.SOLAR_PANEL, multiplier: 1.3 }, { goodsId: GoodsId.WIND_BLADE, multiplier: 0.7 }],
      requiredLevel: 1, switchCost: 100000,
      description: '侧重光伏产品',
      effects: ['光伏+30%', '风电-30%'],
    }),
    createMethod(34, 1, 'product_focus', 'ne_wind', '风电产品', {
      outputModifiers: [{ goodsId: GoodsId.WIND_BLADE, multiplier: 1.3 }, { goodsId: GoodsId.SOLAR_PANEL, multiplier: 0.7 }],
      requiredLevel: 1, switchCost: 100000,
      description: '侧重风电产品',
      effects: ['风电+30%', '光伏-30%'],
    }),
    createMethod(34, 2, 'product_focus', 'ne_balanced', '均衡生产', {
      qualityBonus: 0.1,
      requiredLevel: 2, switchCost: 150000,
      description: '均衡发展',
      effects: ['品质+10%'],
    }),
    createMethod(34, 10, 'manufacturing', 'ne_standard', '标准制造', {
      requiredLevel: 1, switchCost: 80000,
      description: '标准制造工艺',
      effects: ['基础产能'],
    }),
    createMethod(34, 11, 'manufacturing', 'ne_advanced', '先进制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.15,
      laborMultiplier: 0.7, energyMultiplier: 1.2, productionSpeedMultiplier: 1.2,
      requiredLevel: 2, switchCost: 400000,
      description: '先进制造工艺',
      effects: ['产量+20%', '品质+15%', '人力-30%', '能耗+20%', '速度+20%'],
    }),
    createMethod(34, 12, 'manufacturing', 'ne_smart', '智能制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.25,
      laborMultiplier: 0.4, energyMultiplier: 1.4, maintenanceMultiplier: 1.3, productionSpeedMultiplier: 1.4,
      requiredLevel: 3, switchCost: 1000000,
      description: '智能化生产',
      effects: ['产量+40%', '品质+25%', '人力-60%', '能耗+40%', '维护+30%', '速度+40%'],
    }),
    createMethod(34, 20, 'quality', 'ne_standard_quality', '标准品质', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      requiredLevel: 1, switchCost: 30000,
      description: '标准品质产品',
      effects: ['产量+10%'],
    }),
    createMethod(34, 21, 'quality', 'ne_high_quality', '高品质', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      laborMultiplier: 1.1,
      requiredLevel: 2, switchCost: 150000,
      description: '高品质产品',
      effects: ['产量-5%', '品质+20%', '人力+10%'],
    }),
    createMethod(34, 22, 'quality', 'ne_premium', '顶级品质', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.35,
      laborMultiplier: 1.3, energyMultiplier: 1.15,
      requiredLevel: 3, switchCost: 400000,
      description: '顶级品质产品',
      effects: ['产量-15%', '品质+35%', '人力+30%', '能耗+15%'],
    }),
  ]
);

// ==================== 制药厂 (ID 35) ====================
const PHARMA_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.PHARMA_FACTORY,
  [
    createSlot(35, 'production_type', '生产类型', '💊', '药品生产类型', 0),
    createSlot(35, 'gmp_level', 'GMP等级', '📋', '生产规范等级', 1),
    createSlot(35, 'packaging', '包装方式', '📦', '药品包装技术', 2),
  ],
  [
    createMethod(35, 0, 'production_type', 'pharma_chemical', '化学合成', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      pollutionMultiplier: 1.3,
      requiredLevel: 1, switchCost: 150000,
      description: '化学合成药物',
      effects: ['产量+10%', '污染+30%'],
    }),
    createMethod(35, 1, 'production_type', 'pharma_bio', '生物制药', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.25,
      energyMultiplier: 1.3, maintenanceMultiplier: 1.3, laborMultiplier: 1.2, pollutionMultiplier: 0.7,
      requiredLevel: 2, switchCost: 600000,
      description: '生物技术制药',
      effects: ['产量-20%', '品质+25%', '能耗+30%', '维护+30%', '人力+20%', '污染-30%'],
    }),
    createMethod(35, 2, 'production_type', 'pharma_continuous', '连续制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }], qualityBonus: 0.15,
      laborMultiplier: 0.6, energyMultiplier: 1.2, maintenanceMultiplier: 1.2, productionSpeedMultiplier: 1.4,
      requiredLevel: 3, switchCost: 1500000,
      description: '连续化制药',
      effects: ['产量+25%', '品质+15%', '人力-40%', '能耗+20%', '维护+20%', '速度+40%'],
    }),
    createMethod(35, 10, 'gmp_level', 'pharma_gmp_basic', '基础GMP', {
      requiredLevel: 1, switchCost: 50000,
      description: '基本GMP规范',
      effects: ['基础规范'],
    }),
    createMethod(35, 11, 'gmp_level', 'pharma_gmp_advanced', '高级GMP', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      laborMultiplier: 1.15, maintenanceMultiplier: 1.2,
      requiredLevel: 2, switchCost: 300000,
      description: '高级GMP规范',
      effects: ['产量-5%', '品质+20%', '人力+15%', '维护+20%'],
    }),
    createMethod(35, 12, 'gmp_level', 'pharma_fda', 'FDA认证', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.35,
      laborMultiplier: 1.3, maintenanceMultiplier: 1.4,
      requiredLevel: 3, switchCost: 800000,
      description: 'FDA认证标准',
      effects: ['产量-10%', '品质+35%', '人力+30%', '维护+40%'],
    }),
    createMethod(35, 20, 'packaging', 'pharma_bulk', '散装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: -0.1,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1, switchCost: 20000,
      description: '散装原料药',
      effects: ['产量+15%', '品质-10%', '速度+20%'],
    }),
    createMethod(35, 21, 'packaging', 'pharma_standard', '标准包装', {
      qualityBonus: 0.1,
      requiredLevel: 2, switchCost: 80000,
      description: '标准药品包装',
      effects: ['品质+10%'],
    }),
    createMethod(35, 22, 'packaging', 'pharma_blister', '铝塑包装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      energyMultiplier: 1.1, laborMultiplier: 1.1,
      requiredLevel: 3, switchCost: 200000,
      description: '铝塑泡罩包装',
      effects: ['产量-5%', '品质+20%', '能耗+10%', '人力+10%'],
    }),
  ]
);

// ==================== 医疗器械厂 (ID 36) ====================
const MEDICAL_DEVICE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.MEDICAL_DEVICE_FACTORY,
  [
    createSlot(36, 'product_class', '产品等级', '🏥', '医疗器械分类', 0),
    createSlot(36, 'manufacturing', '制造方式', '⚙️', '生产制造技术', 1),
    createSlot(36, 'sterilization', '灭菌方式', '🧼', '产品灭菌技术', 2),
  ],
  [
    createMethod(36, 0, 'product_class', 'med_class1', '一类器械', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.8, productionSpeedMultiplier: 1.3,
      requiredLevel: 1, switchCost: 80000,
      description: '低风险医疗器械',
      effects: ['产量+30%', '人力-20%', '速度+30%'],
    }),
    createMethod(36, 1, 'product_class', 'med_class2', '二类器械', {
      qualityBonus: 0.15, laborMultiplier: 1.1,
      requiredLevel: 2, switchCost: 300000,
      description: '中风险医疗器械',
      effects: ['品质+15%', '人力+10%'],
    }),
    createMethod(36, 2, 'product_class', 'med_class3', '三类器械', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.35,
      laborMultiplier: 1.4, maintenanceMultiplier: 1.4, productionSpeedMultiplier: 0.7,
      requiredLevel: 3, switchCost: 1000000,
      description: '高风险植入器械',
      effects: ['产量-30%', '品质+35%', '人力+40%', '维护+40%', '速度-30%'],
    }),
    createMethod(36, 10, 'manufacturing', 'med_conventional', '传统制造', {
      requiredLevel: 1, switchCost: 80000,
      description: '传统制造工艺',
      effects: ['基础制造'],
    }),
    createMethod(36, 11, 'manufacturing', 'med_cleanroom', '洁净室生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      energyMultiplier: 1.3, maintenanceMultiplier: 1.25,
      requiredLevel: 2, switchCost: 400000,
      description: '洁净室生产环境',
      effects: ['产量-5%', '品质+20%', '能耗+30%', '维护+25%'],
    }),
    createMethod(36, 12, 'manufacturing', 'med_3d_print', '3D打印', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.3,
      laborMultiplier: 0.6, energyMultiplier: 1.4, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 800000,
      description: '增材制造技术',
      effects: ['产量-20%', '品质+30%', '人力-40%', '能耗+40%', '维护+30%'],
    }),
    createMethod(36, 20, 'sterilization', 'med_eo', '环氧乙烷灭菌', {
      qualityBonus: 0.1, energyMultiplier: 1.1, pollutionMultiplier: 1.2,
      requiredLevel: 1, switchCost: 50000,
      description: 'EO气体灭菌',
      effects: ['品质+10%', '能耗+10%', '污染+20%'],
    }),
    createMethod(36, 21, 'sterilization', 'med_gamma', 'γ射线灭菌', {
      qualityBonus: 0.15, energyMultiplier: 1.2, productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 200000,
      description: '伽马射线灭菌',
      effects: ['品质+15%', '能耗+20%', '速度+10%'],
    }),
    createMethod(36, 22, 'sterilization', 'med_electron', '电子束灭菌', {
      qualityBonus: 0.2, energyMultiplier: 1.3, productionSpeedMultiplier: 1.2, pollutionMultiplier: 0.8,
      requiredLevel: 3, switchCost: 500000,
      description: '电子束快速灭菌',
      effects: ['品质+20%', '能耗+30%', '速度+20%', '污染-20%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const MANUFACTURING_CONFIGS: BuildingMethodConfig[] = [
  ELECTRONICS_FACTORY_CONFIG,    // ID 27
  SEMICONDUCTOR_FAB_CONFIG,      // ID 28
  BATTERY_FACTORY_CONFIG,        // ID 29
  PARTS_FACTORY_CONFIG,          // ID 30
  CAR_FACTORY_CONFIG,            // ID 31
  APPLIANCE_FACTORY_CONFIG,      // ID 32
  FURNITURE_FACTORY_CONFIG,      // ID 33
  NEW_ENERGY_FACTORY_CONFIG,     // ID 34
  PHARMA_FACTORY_CONFIG,         // ID 35
  MEDICAL_DEVICE_FACTORY_CONFIG, // ID 36
];

/**
 * 注册所有制造类建筑的生产方式
 * 共10种建筑（ID 27-36），每种3个槽位
 */
export function registerManufacturingMethods(): void {
  registerBuildingConfigs(MANUFACTURING_CONFIGS);
}