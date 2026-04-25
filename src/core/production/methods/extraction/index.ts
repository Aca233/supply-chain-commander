/**
 * 采掘类建筑专属生产方式
 * 重构版本：适配新的15种采掘建筑（ID 0-14）
 * 
 * 建筑列表：
 * 0: 铁矿场    1: 铜矿场    2: 铝矿场    3: 煤矿      4: 油田
 * 5: 气田      6: 硅矿场    7: 锂矿场    8: 稀土矿    9: 伐木场
 * 10: 农场    11: 橡胶园   12: 畜牧场   13: 渔场    14: 药材园
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';
import { GoodsId } from '../../../../data/goods';
import { BuildingId } from '../../../../data/buildings';

// ==================== 铁矿场 (ID 0) ====================
const IRON_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.IRON_MINE,
  [
    createSlot(0, 'mining_method', '开采方式', '⛏️', '选择矿石开采的技术方法', 0),
    createSlot(0, 'ore_processing', '矿石处理', '🔩', '开采后的矿石处理方式', 1),
    createSlot(0, 'safety', '安全标准', '🦺', '矿场安全防护等级', 2),
  ],
  [
    // 开采方式槽位
    createMethod(0, 0, 'mining_method', 'iron_open_pit', '露天开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0, energyMultiplier: 0.8, pollutionMultiplier: 1.2,
      requiredLevel: 1, switchCost: 50000,
      description: '表层露天开采，成本低但污染较高',
      effects: ['能耗-20%', '污染+20%'],
    }),
    createMethod(0, 1, 'mining_method', 'iron_underground', '地下开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      laborMultiplier: 1.2, energyMultiplier: 1.1, pollutionMultiplier: 0.8,
      requiredLevel: 2, switchCost: 200000,
      description: '深层矿脉开采，产量更高',
      effects: ['产量+15%', '人力+20%', '能耗+10%', '污染-20%'],
    }),
    createMethod(0, 2, 'mining_method', 'iron_mechanized', '机械化采矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.6, energyMultiplier: 1.4, productionSpeedMultiplier: 1.2,
      requiredLevel: 3, switchCost: 500000,
      description: '全机械化开采，效率大幅提升',
      effects: ['产量+30%', '人力-40%', '能耗+40%', '速度+20%'],
    }),
    // 矿石处理槽位
    createMethod(0, 10, 'ore_processing', 'iron_raw_output', '原矿直出', {
      laborMultiplier: 0.9, energyMultiplier: 0.8,
      requiredLevel: 1, switchCost: 20000,
      description: '原矿不经处理直接输出',
      effects: ['人力-10%', '能耗-20%'],
    }),
    createMethod(0, 11, 'ore_processing', 'iron_beneficiation', '选矿处理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.15,
      laborMultiplier: 1.1, energyMultiplier: 1.2,
      requiredLevel: 2, switchCost: 80000,
      description: '筛选分级，提升矿石品位',
      effects: ['产量-5%', '品质+15%', '人力+10%', '能耗+20%'],
    }),
    createMethod(0, 12, 'ore_processing', 'iron_concentrate', '精选矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.25,
      laborMultiplier: 1.3, energyMultiplier: 1.5,
      requiredLevel: 3, switchCost: 200000,
      description: '深度选矿，获得高品位精矿',
      effects: ['产量-15%', '品质+25%', '人力+30%', '能耗+50%'],
    }),
    // 安全标准槽位
    createMethod(0, 20, 'safety', 'iron_basic_safety', '基础防护', {
      requiredLevel: 1, switchCost: 10000,
      description: '满足最低安全要求',
      effects: ['无特殊效果'],
    }),
    createMethod(0, 21, 'safety', 'iron_standard_safety', '标准安保', {
      laborMultiplier: 1.05, maintenanceMultiplier: 1.15, productionSpeedMultiplier: 1.05,
      requiredLevel: 2, switchCost: 50000,
      description: '完善的安全管理体系',
      effects: ['人力+5%', '维护+15%', '速度+5%'],
    }),
    createMethod(0, 22, 'safety', 'iron_advanced_safety', '高级防护', {
      laborMultiplier: 1.1, maintenanceMultiplier: 1.3, productionSpeedMultiplier: 1.1, qualityBonus: 0.05,
      requiredLevel: 3, switchCost: 150000,
      description: '智能化安全监控，事故率极低',
      effects: ['人力+10%', '维护+30%', '速度+10%', '品质+5%'],
    }),
  ]
);

// ==================== 铜矿场 (ID 1) ====================
const COPPER_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.COPPER_MINE,
  [
    createSlot(1, 'mining_method', '开采方式', '⛏️', '铜矿开采技术', 0),
    createSlot(1, 'ore_grade', '品位控制', '💎', '矿石品位分选策略', 1),
    createSlot(1, 'environment', '环保措施', '🌿', '环境保护等级', 2),
  ],
  [
    createMethod(1, 0, 'mining_method', 'copper_traditional', '传统采矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1, switchCost: 50000,
      description: '传统机械采矿方式',
      effects: ['基础产能'],
    }),
    createMethod(1, 1, 'mining_method', 'copper_flotation', '浮选开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.15,
      laborMultiplier: 1.15, energyMultiplier: 1.2,
      requiredLevel: 2, switchCost: 150000,
      description: '浮选工艺，提高回收率',
      effects: ['产量+10%', '品质+15%', '人力+15%', '能耗+20%'],
    }),
    createMethod(1, 2, 'mining_method', 'copper_automated', '自动化开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      laborMultiplier: 0.4, energyMultiplier: 1.5, productionSpeedMultiplier: 1.3,
      requiredLevel: 3, switchCost: 800000,
      description: '全自动化无人采矿系统',
      effects: ['产量+35%', '人力-60%', '能耗+50%', '速度+30%'],
    }),
    createMethod(1, 10, 'ore_grade', 'copper_mixed', '混合出矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: -0.05,
      requiredLevel: 1, switchCost: 20000,
      description: '不分品位混合开采',
      effects: ['产量+10%', '品质-5%'],
    }),
    createMethod(1, 11, 'ore_grade', 'copper_sorted', '品位分选', {
      qualityBonus: 0.1, laborMultiplier: 1.1,
      requiredLevel: 2, switchCost: 60000,
      description: '按品位分级开采和存储',
      effects: ['品质+10%', '人力+10%'],
    }),
    createMethod(1, 12, 'ore_grade', 'copper_high_grade', '高品位优先', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.25,
      laborMultiplier: 1.2,
      requiredLevel: 3, switchCost: 120000,
      description: '优先开采高品位矿脉',
      effects: ['产量-15%', '品质+25%', '人力+20%'],
    }),
    createMethod(1, 20, 'environment', 'copper_basic_env', '基础环保', {
      pollutionMultiplier: 1.0,
      requiredLevel: 1, switchCost: 20000,
      description: '满足基本环保要求',
      effects: ['基础污染'],
    }),
    createMethod(1, 21, 'environment', 'copper_green', '绿色开采', {
      pollutionMultiplier: 0.6, maintenanceMultiplier: 1.2,
      requiredLevel: 2, switchCost: 100000,
      description: '采用环保措施减少污染',
      effects: ['污染-40%', '维护+20%'],
    }),
    createMethod(1, 22, 'environment', 'copper_zero_emission', '零排放', {
      pollutionMultiplier: 0.2, maintenanceMultiplier: 1.5, energyMultiplier: 1.2,
      requiredLevel: 3, switchCost: 300000,
      description: '废水废气零排放系统',
      effects: ['污染-80%', '维护+50%', '能耗+20%'],
    }),
  ]
);

// ==================== 铝矿场 (ID 2) ====================
const ALUMINUM_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.ALUMINUM_MINE,
  [
    createSlot(2, 'mining_method', '开采方式', '⛏️', '铝土矿开采技术', 0),
    createSlot(2, 'processing', '预处理', '⚙️', '矿石预处理方式', 1),
    createSlot(2, 'logistics', '物流方式', '🚚', '矿石运输方式', 2),
  ],
  [
    createMethod(2, 0, 'mining_method', 'alu_strip', '露天条采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 0.9, pollutionMultiplier: 1.2,
      requiredLevel: 1, switchCost: 60000,
      description: '条带式露天开采',
      effects: ['能耗-10%', '污染+20%'],
    }),
    createMethod(2, 1, 'mining_method', 'alu_hydraulic', '水力开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      laborMultiplier: 0.8, energyMultiplier: 1.2, pollutionMultiplier: 0.8,
      requiredLevel: 2, switchCost: 200000,
      description: '高压水枪开采',
      effects: ['产量+15%', '人力-20%', '能耗+20%', '污染-20%'],
    }),
    createMethod(2, 2, 'mining_method', 'alu_continuous', '连续开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.5, energyMultiplier: 1.4, productionSpeedMultiplier: 1.25,
      requiredLevel: 3, switchCost: 500000,
      description: '连续采矿机作业',
      effects: ['产量+30%', '人力-50%', '能耗+40%', '速度+25%'],
    }),
    createMethod(2, 10, 'processing', 'alu_raw', '原矿输出', {
      requiredLevel: 1, switchCost: 10000,
      description: '不经处理直接输出',
      effects: ['基础产能'],
    }),
    createMethod(2, 11, 'processing', 'alu_wash', '洗矿处理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.1,
      energyMultiplier: 1.15,
      requiredLevel: 2, switchCost: 80000,
      description: '水洗去除杂质',
      effects: ['产量-5%', '品质+10%', '能耗+15%'],
    }),
    createMethod(2, 12, 'processing', 'alu_bayer', '拜耳预处理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.2,
      energyMultiplier: 1.4, laborMultiplier: 1.2,
      requiredLevel: 3, switchCost: 250000,
      description: '拜耳法预处理提纯',
      effects: ['产量-15%', '品质+20%', '能耗+40%', '人力+20%'],
    }),
    createMethod(2, 20, 'logistics', 'alu_truck', '卡车运输', {
      laborMultiplier: 1.1, energyMultiplier: 1.0,
      requiredLevel: 1, switchCost: 20000,
      description: '传统卡车运输',
      effects: ['人力+10%'],
    }),
    createMethod(2, 21, 'logistics', 'alu_belt', '皮带运输', {
      laborMultiplier: 0.8, energyMultiplier: 1.1, maintenanceMultiplier: 1.15,
      requiredLevel: 2, switchCost: 150000,
      description: '皮带传输系统',
      effects: ['人力-20%', '能耗+10%', '维护+15%'],
    }),
    createMethod(2, 22, 'logistics', 'alu_pipeline', '管道输送', {
      laborMultiplier: 0.6, energyMultiplier: 1.2, maintenanceMultiplier: 1.25,
      requiredLevel: 3, switchCost: 400000,
      description: '矿浆管道输送',
      effects: ['人力-40%', '能耗+20%', '维护+25%'],
    }),
  ]
);

// ==================== 煤矿 (ID 3) ====================
const COAL_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.COAL_MINE,
  [
    createSlot(3, 'mining_method', '采煤方式', '⛏️', '煤炭开采技术', 0),
    createSlot(3, 'ventilation', '通风方式', '💨', '矿井通风系统', 1),
    createSlot(3, 'coal_wash', '洗煤工艺', '💧', '煤炭洗选处理', 2),
  ],
  [
    createMethod(3, 0, 'mining_method', 'coal_conventional', '普采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1, switchCost: 80000,
      description: '机械化普通采煤',
      effects: ['基础产能'],
    }),
    createMethod(3, 1, 'mining_method', 'coal_longwall', '综采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      laborMultiplier: 0.6, energyMultiplier: 1.4, productionSpeedMultiplier: 1.3,
      requiredLevel: 2, switchCost: 400000,
      description: '综合机械化采煤',
      effects: ['产量+40%', '人力-40%', '能耗+40%', '速度+30%'],
    }),
    createMethod(3, 2, 'mining_method', 'coal_continuous', '连续采煤机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.6 }],
      laborMultiplier: 0.4, energyMultiplier: 1.7, productionSpeedMultiplier: 1.5,
      requiredLevel: 3, switchCost: 1000000,
      description: '连续采煤系统',
      effects: ['产量+60%', '人力-60%', '能耗+70%', '速度+50%'],
    }),
    createMethod(3, 10, 'ventilation', 'coal_natural_vent', '自然通风', {
      maintenanceMultiplier: 0.8, productionSpeedMultiplier: 0.9,
      requiredLevel: 1, switchCost: 10000,
      description: '依靠自然压差通风',
      effects: ['维护-20%', '速度-10%'],
    }),
    createMethod(3, 11, 'ventilation', 'coal_mechanical_vent', '机械通风', {
      energyMultiplier: 1.1, maintenanceMultiplier: 1.1, productionSpeedMultiplier: 1.05,
      requiredLevel: 2, switchCost: 60000,
      description: '风机强制通风系统',
      effects: ['能耗+10%', '维护+10%', '速度+5%'],
    }),
    createMethod(3, 12, 'ventilation', 'coal_smart_vent', '智能通风', {
      maintenanceMultiplier: 1.2, productionSpeedMultiplier: 1.15,
      requiredLevel: 3, switchCost: 200000,
      description: 'AI控制的智能通风',
      effects: ['维护+20%', '速度+15%'],
    }),
    createMethod(3, 20, 'coal_wash', 'coal_raw_sale', '原煤直销', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }], qualityBonus: -0.1,
      requiredLevel: 1, switchCost: 10000,
      description: '不经洗选直接销售',
      effects: ['产量+5%', '品质-10%'],
    }),
    createMethod(3, 21, 'coal_wash', 'coal_simple_wash', '简单洗选', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.1,
      energyMultiplier: 1.15,
      requiredLevel: 2, switchCost: 80000,
      description: '基础洗煤处理',
      effects: ['产量-5%', '品质+10%', '能耗+15%'],
    }),
    createMethod(3, 22, 'coal_wash', 'coal_deep_wash', '精洗低硫煤', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.3,
      energyMultiplier: 1.4, pollutionMultiplier: 0.7,
      requiredLevel: 3, switchCost: 250000,
      description: '深度洗选，产出低硫优质煤',
      effects: ['产量-15%', '品质+30%', '能耗+40%', '污染-30%'],
    }),
  ]
);

// ==================== 油田 (ID 4) ====================
const OIL_FIELD_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.OIL_FIELD,
  [
    createSlot(4, 'extraction_method', '采油方式', '🛢️', '原油开采技术', 0),
    createSlot(4, 'wellhead_control', '井口控制', '🎛️', '井口控制系统', 1),
    createSlot(4, 'oil_treatment', '油气处理', '⚗️', '采出液处理方式', 2),
  ],
  [
    createMethod(4, 0, 'extraction_method', 'oil_pumping', '机械采油', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1, switchCost: 100000,
      description: '抽油机机械采油',
      effects: ['基础产能'],
    }),
    createMethod(4, 1, 'extraction_method', 'oil_water_injection', '注水驱油', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      laborMultiplier: 1.1, energyMultiplier: 1.3, maintenanceMultiplier: 1.2,
      requiredLevel: 2, switchCost: 500000,
      description: '注水增压提高采收率',
      effects: ['产量+25%', '人力+10%', '能耗+30%', '维护+20%'],
    }),
    createMethod(4, 2, 'extraction_method', 'oil_eor', '三次采油(EOR)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      laborMultiplier: 1.3, energyMultiplier: 1.6, maintenanceMultiplier: 1.5, pollutionMultiplier: 1.2,
      requiredLevel: 3, switchCost: 2000000,
      description: '化学驱等强化采油技术',
      effects: ['产量+50%', '人力+30%', '能耗+60%', '维护+50%', '污染+20%'],
    }),
    createMethod(4, 10, 'wellhead_control', 'oil_manual', '手动控制', {
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.95, maintenanceMultiplier: 0.9,
      requiredLevel: 1, switchCost: 20000,
      description: '人工操作井口设备',
      effects: ['人力+20%', '速度-5%', '维护-10%'],
    }),
    createMethod(4, 11, 'wellhead_control', 'oil_semi_auto', '半自动控制', {
      laborMultiplier: 0.9, energyMultiplier: 1.1, productionSpeedMultiplier: 1.05,
      requiredLevel: 2, switchCost: 150000,
      description: '部分自动化控制',
      effects: ['人力-10%', '能耗+10%', '速度+5%'],
    }),
    createMethod(4, 12, 'wellhead_control', 'oil_scada', '全自动SCADA', {
      laborMultiplier: 0.5, energyMultiplier: 1.2, productionSpeedMultiplier: 1.15, maintenanceMultiplier: 1.3, qualityBonus: 0.05,
      requiredLevel: 3, switchCost: 600000,
      description: '远程监控与数据采集系统',
      effects: ['人力-50%', '能耗+20%', '速度+15%', '维护+30%', '品质+5%'],
    }),
    createMethod(4, 20, 'oil_treatment', 'oil_basic_sep', '基础分离', {
      requiredLevel: 1, switchCost: 30000,
      description: '油气水三相分离',
      effects: ['基础处理'],
    }),
    createMethod(4, 21, 'oil_treatment', 'oil_dehydration', '深度脱水', {
      qualityBonus: 0.1, energyMultiplier: 1.15,
      requiredLevel: 2, switchCost: 120000,
      description: '电脱水深度脱水',
      effects: ['品质+10%', '能耗+15%'],
    }),
    createMethod(4, 22, 'oil_treatment', 'oil_stabilization', '原油稳定', {
      qualityBonus: 0.2, energyMultiplier: 1.3, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 350000,
      description: '原油稳定轻烃回收',
      effects: ['品质+20%', '能耗+30%', '维护+20%'],
    }),
  ]
);

// ==================== 气田 (ID 5) ====================
const GAS_FIELD_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.GAS_FIELD,
  [
    createSlot(5, 'extraction_method', '采气方式', '💨', '天然气开采技术', 0),
    createSlot(5, 'gas_treatment', '气体处理', '🧪', '天然气净化处理', 1),
    createSlot(5, 'compression', '增压方式', '⬆️', '天然气增压系统', 2),
  ],
  [
    createMethod(5, 0, 'extraction_method', 'gas_conventional', '常规采气', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1, switchCost: 80000,
      description: '自然压力驱动采气',
      effects: ['基础产能'],
    }),
    createMethod(5, 1, 'extraction_method', 'gas_compression', '增压采气', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 1.1, energyMultiplier: 1.4,
      requiredLevel: 2, switchCost: 300000,
      description: '使用增压设备提高产量',
      effects: ['产量+20%', '人力+10%', '能耗+40%'],
    }),
    createMethod(5, 2, 'extraction_method', 'gas_dewatering', '排水采气', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      laborMultiplier: 1.2, energyMultiplier: 1.5, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 700000,
      description: '排除地层水提高产能',
      effects: ['产量+35%', '人力+20%', '能耗+50%', '维护+30%'],
    }),
    createMethod(5, 10, 'gas_treatment', 'gas_dehydration', '简单脱水', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }], qualityBonus: 0.05,
      energyMultiplier: 1.1,
      requiredLevel: 1, switchCost: 50000,
      description: '基础脱水处理',
      effects: ['产量-2%', '品质+5%', '能耗+10%'],
    }),
    createMethod(5, 11, 'gas_treatment', 'gas_sweetening', '脱硫脱碳', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.92 }], qualityBonus: 0.2,
      energyMultiplier: 1.3, pollutionMultiplier: 0.7,
      requiredLevel: 2, switchCost: 200000,
      description: '脱除硫化氢和二氧化碳',
      effects: ['产量-8%', '品质+20%', '能耗+30%', '污染-30%'],
    }),
    createMethod(5, 12, 'gas_treatment', 'gas_deep_purification', '深度净化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.35,
      energyMultiplier: 1.5, laborMultiplier: 1.2, pollutionMultiplier: 0.5,
      requiredLevel: 3, switchCost: 500000,
      description: '生产高纯度管输气',
      effects: ['产量-15%', '品质+35%', '能耗+50%', '人力+20%', '污染-50%'],
    }),
    createMethod(5, 20, 'compression', 'gas_low_pressure', '低压输送', {
      maintenanceMultiplier: 0.8, productionSpeedMultiplier: 0.9,
      requiredLevel: 1, switchCost: 20000,
      description: '低压管道输送',
      effects: ['维护-20%', '速度-10%'],
    }),
    createMethod(5, 21, 'compression', 'gas_medium_pressure', '中压输送', {
      energyMultiplier: 1.15, productionSpeedMultiplier: 1.05,
      requiredLevel: 2, switchCost: 100000,
      description: '中压压缩输送',
      effects: ['能耗+15%', '速度+5%'],
    }),
    createMethod(5, 22, 'compression', 'gas_high_pressure', '高压输送', {
      energyMultiplier: 1.4, maintenanceMultiplier: 1.25, productionSpeedMultiplier: 1.15,
      requiredLevel: 3, switchCost: 300000,
      description: '高压长输管道',
      effects: ['能耗+40%', '维护+25%', '速度+15%'],
    }),
  ]
);

// ==================== 硅矿场 (ID 6) ====================
const SILICON_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.SILICON_MINE,
  [
    createSlot(6, 'mining_method', '开采方式', '⛏️', '硅石开采技术', 0),
    createSlot(6, 'purification', '纯度控制', '✨', '硅石纯度等级', 1),
    createSlot(6, 'crushing', '破碎方式', '🔨', '矿石破碎工艺', 2),
  ],
  [
    createMethod(6, 0, 'mining_method', 'silicon_opencast', '露天开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 0.9, pollutionMultiplier: 1.2,
      requiredLevel: 1, switchCost: 60000,
      description: '露天矿场开采',
      effects: ['能耗-10%', '污染+20%'],
    }),
    createMethod(6, 1, 'mining_method', 'silicon_selective', '选择性开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.15,
      laborMultiplier: 1.2, energyMultiplier: 1.1,
      requiredLevel: 2, switchCost: 180000,
      description: '选择高品位矿脉开采',
      effects: ['产量-10%', '品质+15%', '人力+20%', '能耗+10%'],
    }),
    createMethod(6, 2, 'mining_method', 'silicon_precision', '精密开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.3,
      laborMultiplier: 1.4, energyMultiplier: 1.3,
      requiredLevel: 3, switchCost: 400000,
      description: '精密开采高纯硅石',
      effects: ['产量-15%', '品质+30%', '人力+40%', '能耗+30%'],
    }),
    createMethod(6, 10, 'purification', 'silicon_raw', '原矿石', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: -0.1,
      requiredLevel: 1, switchCost: 10000,
      description: '不经提纯直接输出',
      effects: ['产量+10%', '品质-10%'],
    }),
    createMethod(6, 11, 'purification', 'silicon_primary', '初级提纯', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.1,
      energyMultiplier: 1.2,
      requiredLevel: 2, switchCost: 100000,
      description: '基础提纯处理',
      effects: ['产量-5%', '品质+10%', '能耗+20%'],
    }),
    createMethod(6, 12, 'purification', 'silicon_semiconductor', '半导体级', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.4,
      laborMultiplier: 1.5, energyMultiplier: 1.8, maintenanceMultiplier: 1.4,
      requiredLevel: 3, switchCost: 800000,
      description: '生产高纯度半导体级硅石',
      effects: ['产量-30%', '品质+40%', '人力+50%', '能耗+80%', '维护+40%'],
    }),
    createMethod(6, 20, 'crushing', 'silicon_jaw', '颚式破碎', {
      requiredLevel: 1, switchCost: 20000,
      description: '颚式破碎机粗碎',
      effects: ['基础破碎'],
    }),
    createMethod(6, 21, 'crushing', 'silicon_cone', '圆锥破碎', {
      qualityBonus: 0.05, energyMultiplier: 1.1,
      requiredLevel: 2, switchCost: 80000,
      description: '圆锥破碎机细碎',
      effects: ['品质+5%', '能耗+10%'],
    }),
    createMethod(6, 22, 'crushing', 'silicon_ball_mill', '球磨细化', {
      qualityBonus: 0.15, energyMultiplier: 1.3, laborMultiplier: 1.1,
      requiredLevel: 3, switchCost: 200000,
      description: '球磨机超细粉碎',
      effects: ['品质+15%', '能耗+30%', '人力+10%'],
    }),
  ]
);

// ==================== 锂矿场 (ID 7) ====================
const LITHIUM_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.LITHIUM_MINE,
  [
    createSlot(7, 'extraction_method', '提取方式', '⛏️', '锂矿提取技术', 0),
    createSlot(7, 'concentration', '浓缩工艺', '🧪', '锂盐浓缩方法', 1),
    createSlot(7, 'drying', '干燥方式', '☀️', '锂盐干燥技术', 2),
  ],
  [
    createMethod(7, 0, 'extraction_method', 'lithium_brine', '盐湖卤水提取', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 0.7, pollutionMultiplier: 0.8,
      requiredLevel: 1, switchCost: 100000,
      description: '从盐湖卤水中提取锂',
      effects: ['能耗-30%', '污染-20%'],
    }),
    createMethod(7, 1, 'extraction_method', 'lithium_spodumene', '锂辉石开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 1.2, energyMultiplier: 1.4,
      requiredLevel: 2, switchCost: 300000,
      description: '硬岩锂辉石矿开采',
      effects: ['产量+20%', '人力+20%', '能耗+40%'],
    }),
    createMethod(7, 2, 'extraction_method', 'lithium_dla', '直接锂提取(DLE)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.2,
      laborMultiplier: 0.7, energyMultiplier: 1.3, maintenanceMultiplier: 1.4,
      requiredLevel: 3, switchCost: 800000,
      description: '新型直接锂提取技术',
      effects: ['产量+40%', '品质+20%', '人力-30%', '能耗+30%', '维护+40%'],
    }),
    createMethod(7, 10, 'concentration', 'lithium_evaporation', '自然蒸发', {
      productionSpeedMultiplier: 0.6, energyMultiplier: 0.5,
      requiredLevel: 1, switchCost: 50000,
      description: '太阳能蒸发浓缩',
      effects: ['速度-40%', '能耗-50%'],
    }),
    createMethod(7, 11, 'concentration', 'lithium_mechanical', '机械蒸发', {
      productionSpeedMultiplier: 1.0, energyMultiplier: 1.2,
      requiredLevel: 2, switchCost: 150000,
      description: '机械蒸发浓缩',
      effects: ['能耗+20%'],
    }),
    createMethod(7, 12, 'concentration', 'lithium_membrane', '膜分离', {
      productionSpeedMultiplier: 1.2, energyMultiplier: 1.0, qualityBonus: 0.1, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 400000,
      description: '膜技术浓缩提纯',
      effects: ['速度+20%', '品质+10%', '维护+30%'],
    }),
    createMethod(7, 20, 'drying', 'lithium_natural_dry', '自然干燥', {
      productionSpeedMultiplier: 0.7, energyMultiplier: 0.5,
      requiredLevel: 1, switchCost: 20000,
      description: '日晒自然干燥',
      effects: ['速度-30%', '能耗-50%'],
    }),
    createMethod(7, 21, 'drying', 'lithium_spray_dry', '喷雾干燥', {
      productionSpeedMultiplier: 1.1, energyMultiplier: 1.3, qualityBonus: 0.05,
      requiredLevel: 2, switchCost: 100000,
      description: '喷雾干燥技术',
      effects: ['速度+10%', '能耗+30%', '品质+5%'],
    }),
    createMethod(7, 22, 'drying', 'lithium_vacuum_dry', '真空干燥', {
      productionSpeedMultiplier: 1.2, energyMultiplier: 1.5, qualityBonus: 0.15,
      requiredLevel: 3, switchCost: 250000,
      description: '真空干燥高纯度产品',
      effects: ['速度+20%', '能耗+50%', '品质+15%'],
    }),
  ]
);

// ==================== 稀土矿 (ID 8) ====================
const RARE_EARTH_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.RARE_EARTH_MINE,
  [
    createSlot(8, 'mining_method', '开采方式', '⛏️', '稀土矿开采技术', 0),
    createSlot(8, 'separation', '分离工艺', '🧪', '稀土元素分离', 1),
    createSlot(8, 'environment', '环保措施', '🌿', '环境保护等级', 2),
  ],
  [
    createMethod(8, 0, 'mining_method', 're_opencast', '露天开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      pollutionMultiplier: 1.5,
      requiredLevel: 1, switchCost: 100000,
      description: '露天矿场开采',
      effects: ['污染+50%'],
    }),
    createMethod(8, 1, 'mining_method', 're_in_situ', '原地浸矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.1,
      laborMultiplier: 0.8, pollutionMultiplier: 0.8,
      requiredLevel: 2, switchCost: 300000,
      description: '原地浸矿技术',
      effects: ['产量-10%', '品质+10%', '人力-20%', '污染-20%'],
    }),
    createMethod(8, 2, 'mining_method', 're_underground', '地下开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.15,
      laborMultiplier: 1.3, energyMultiplier: 1.3, pollutionMultiplier: 0.6,
      requiredLevel: 3, switchCost: 600000,
      description: '深层地下开采',
      effects: ['产量+20%', '品质+15%', '人力+30%', '能耗+30%', '污染-40%'],
    }),
    createMethod(8, 10, 'separation', 're_acid_leach', '酸浸法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      pollutionMultiplier: 1.3,
      requiredLevel: 1, switchCost: 80000,
      description: '酸浸提取稀土',
      effects: ['污染+30%'],
    }),
    createMethod(8, 11, 'separation', 're_solvent', '溶剂萃取', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      energyMultiplier: 1.2, pollutionMultiplier: 0.9,
      requiredLevel: 2, switchCost: 250000,
      description: '溶剂萃取分离',
      effects: ['产量-5%', '品质+20%', '能耗+20%', '污染-10%'],
    }),
    createMethod(8, 12, 'separation', 're_ion_exchange', '离子交换', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.35,
      energyMultiplier: 1.4, laborMultiplier: 1.2, pollutionMultiplier: 0.6,
      requiredLevel: 3, switchCost: 500000,
      description: '离子交换高纯度分离',
      effects: ['产量-15%', '品质+35%', '能耗+40%', '人力+20%', '污染-40%'],
    }),
    createMethod(8, 20, 'environment', 're_basic_env', '基础环保', {
      pollutionMultiplier: 1.0, maintenanceMultiplier: 1.0,
      requiredLevel: 1, switchCost: 30000,
      description: '满足基本环保要求',
      effects: ['基础环保'],
    }),
    createMethod(8, 21, 'environment', 're_enhanced_env', '强化环保', {
      pollutionMultiplier: 0.6, maintenanceMultiplier: 1.3,
      requiredLevel: 2, switchCost: 150000,
      description: '强化污染治理措施',
      effects: ['污染-40%', '维护+30%'],
    }),
    createMethod(8, 22, 'environment', 're_circular', '循环经济', {
      pollutionMultiplier: 0.3, maintenanceMultiplier: 1.5, energyMultiplier: 1.2,
      byproductChance: 0.1, byproductGoodsId: GoodsId.CHEMICALS, byproductAmount: 5,
      requiredLevel: 3, switchCost: 400000,
      description: '废水废渣循环利用',
      effects: ['污染-70%', '维护+50%', '能耗+20%', '副产品几率10%'],
    }),
  ]
);

// ==================== 伐木场 (ID 9) ====================
const LOGGING_CAMP_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.LOGGING_CAMP,
  [
    createSlot(9, 'logging_method', '采伐方式', '🪓', '木材采伐技术', 0),
    createSlot(9, 'forest_management', '林业管理', '🌲', '森林可持续管理', 1),
    createSlot(9, 'transport', '运输方式', '🚚', '木材运输方式', 2),
  ],
  [
    createMethod(9, 0, 'logging_method', 'log_chainsaw', '链锯采伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1, switchCost: 50000,
      description: '电动/油动链锯采伐',
      effects: ['基础产能'],
    }),
    createMethod(9, 1, 'logging_method', 'log_harvester', '伐木机采伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      laborMultiplier: 0.5, energyMultiplier: 1.5, productionSpeedMultiplier: 1.3,
      requiredLevel: 2, switchCost: 300000,
      description: '专业伐木机作业',
      effects: ['产量+40%', '人力-50%', '能耗+50%', '速度+30%'],
    }),
    createMethod(9, 2, 'logging_method', 'log_combined', '联合采伐机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.7 }],
      laborMultiplier: 0.3, energyMultiplier: 1.8, productionSpeedMultiplier: 1.5,
      requiredLevel: 3, switchCost: 800000,
      description: '集伐木、打枝、截断于一体',
      effects: ['产量+70%', '人力-70%', '能耗+80%', '速度+50%'],
    }),
    createMethod(9, 10, 'forest_management', 'log_clearcut', '皆伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      pollutionMultiplier: 1.5,
      requiredLevel: 1, switchCost: 10000,
      description: '整片砍伐',
      effects: ['产量+20%', '污染+50%'],
    }),
    createMethod(9, 11, 'forest_management', 'log_selective', '择伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.15,
      laborMultiplier: 1.2, pollutionMultiplier: 0.7,
      requiredLevel: 2, switchCost: 80000,
      description: '选择性采伐成熟树木',
      effects: ['产量-10%', '品质+15%', '人力+20%', '污染-30%'],
    }),
    createMethod(9, 12, 'forest_management', 'log_rotation', '轮伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.1,
      pollutionMultiplier: 0.8,
      requiredLevel: 3, switchCost: 150000,
      description: '分区轮流采伐',
      effects: ['产量+10%', '品质+10%', '污染-20%'],
    }),
    createMethod(9, 20, 'transport', 'log_truck', '卡车运输', {
      laborMultiplier: 1.0, energyMultiplier: 1.0,
      requiredLevel: 1, switchCost: 20000,
      description: '卡车木材运输',
      effects: ['基础运输'],
    }),
    createMethod(9, 21, 'transport', 'log_forwarder', '集材机', {
      laborMultiplier: 0.7, energyMultiplier: 1.2, productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 120000,
      description: '专用集材机运输',
      effects: ['人力-30%', '能耗+20%', '速度+10%'],
    }),
    createMethod(9, 22, 'transport', 'log_cable', '索道运输', {
      laborMultiplier: 0.5, energyMultiplier: 1.1, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 300000,
      description: '山区索道运输系统',
      effects: ['人力-50%', '能耗+10%', '维护+30%'],
    }),
  ]
);

// ==================== 农场 (ID 10) ====================
const FARM_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.FARM,
  [
    createSlot(10, 'farming_method', '耕作方式', '🌾', '农业生产技术', 0),
    createSlot(10, 'irrigation', '灌溉方式', '💧', '农田灌溉系统', 1),
    createSlot(10, 'fertilization', '施肥方式', '🧪', '肥料施用技术', 2),
  ],
  [
    createMethod(10, 0, 'farming_method', 'farm_mechanized', '机械化农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 0.7, energyMultiplier: 1.3,
      requiredLevel: 1, switchCost: 100000,
      description: '拖拉机等农机作业',
      effects: ['人力-30%', '能耗+30%'],
    }),
    createMethod(10, 1, 'farming_method', 'farm_precision', '精准农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }], qualityBonus: 0.15,
      laborMultiplier: 0.5, energyMultiplier: 1.4, pollutionMultiplier: 0.8,
      requiredLevel: 2, switchCost: 400000,
      description: 'GPS导航、无人机精准作业',
      effects: ['产量+25%', '品质+15%', '人力-50%', '能耗+40%', '污染-20%'],
    }),
    createMethod(10, 2, 'farming_method', 'farm_vertical', '垂直农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.6 }], qualityBonus: 0.25,
      laborMultiplier: 0.4, energyMultiplier: 2.0, maintenanceMultiplier: 1.5, pollutionMultiplier: 0.4,
      requiredLevel: 3, switchCost: 2000000,
      description: '室内多层种植系统',
      effects: ['产量+60%', '品质+25%', '人力-60%', '能耗+100%', '维护+50%', '污染-60%'],
    }),
    createMethod(10, 10, 'irrigation', 'farm_flood', '漫灌', {
      pollutionMultiplier: 1.2,
      requiredLevel: 1, switchCost: 30000,
      description: '传统漫灌',
      effects: ['污染+20%'],
    }),
    createMethod(10, 11, 'irrigation', 'farm_sprinkler', '喷灌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 1.2, pollutionMultiplier: 0.9,
      requiredLevel: 2, switchCost: 100000,
      description: '喷灌系统',
      effects: ['产量+10%', '能耗+20%', '污染-10%'],
    }),
    createMethod(10, 12, 'irrigation', 'farm_drip', '滴灌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.1,
      energyMultiplier: 1.1, pollutionMultiplier: 0.7,
      requiredLevel: 3, switchCost: 200000,
      description: '精准滴灌',
      effects: ['产量+15%', '品质+10%', '能耗+10%', '污染-30%'],
    }),
    createMethod(10, 20, 'fertilization', 'farm_chemical', '化肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: -0.05,
      pollutionMultiplier: 1.4,
      requiredLevel: 1, switchCost: 20000,
      description: '化学肥料',
      effects: ['产量+15%', '品质-5%', '污染+40%'],
    }),
    createMethod(10, 21, 'fertilization', 'farm_organic', '有机肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.2,
      laborMultiplier: 1.2, pollutionMultiplier: 0.6,
      requiredLevel: 2, switchCost: 80000,
      description: '有机肥料',
      effects: ['产量-10%', '品质+20%', '人力+20%', '污染-40%'],
    }),
    createMethod(10, 22, 'fertilization', 'farm_smart', '智能施肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }], qualityBonus: 0.15,
      laborMultiplier: 0.8, energyMultiplier: 1.2, pollutionMultiplier: 0.8,
      requiredLevel: 3, switchCost: 250000,
      description: '传感器监测+自动精准施肥',
      effects: ['产量+25%', '品质+15%', '人力-20%', '能耗+20%', '污染-20%'],
    }),
  ]
);

// ==================== 橡胶园 (ID 11) ====================
const RUBBER_PLANTATION_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.RUBBER_PLANTATION,
  [
    createSlot(11, 'tapping_method', '割胶方式', '🌴', '橡胶采集技术', 0),
    createSlot(11, 'processing', '初加工', '⚙️', '胶乳初加工', 1),
    createSlot(11, 'tree_care', '树木养护', '🌱', '橡胶树养护管理', 2),
  ],
  [
    createMethod(11, 0, 'tapping_method', 'rubber_manual', '人工割胶', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], qualityBonus: 0.1,
      laborMultiplier: 1.3,
      requiredLevel: 1, switchCost: 30000,
      description: '传统人工割胶',
      effects: ['品质+10%', '人力+30%'],
    }),
    createMethod(11, 1, 'tapping_method', 'rubber_gas_stimulation', '气刺激割胶', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.8, energyMultiplier: 1.2,
      requiredLevel: 2, switchCost: 150000,
      description: '乙烯气体刺激增产',
      effects: ['产量+30%', '人力-20%', '能耗+20%'],
    }),
    createMethod(11, 2, 'tapping_method', 'rubber_automated', '自动割胶机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      laborMultiplier: 0.4, energyMultiplier: 1.5, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 400000,
      description: '自动化割胶设备',
      effects: ['产量+40%', '人力-60%', '能耗+50%', '维护+30%'],
    }),
    createMethod(11, 10, 'processing', 'rubber_coagulate', '自然凝固', {
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1, switchCost: 20000,
      description: '自然凝固成块',
      effects: ['速度-20%'],
    }),
    createMethod(11, 11, 'processing', 'rubber_centrifuge', '离心浓缩', {
      qualityBonus: 0.1, energyMultiplier: 1.2, productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 100000,
      description: '离心机浓缩胶乳',
      effects: ['品质+10%', '能耗+20%', '速度+10%'],
    }),
    createMethod(11, 12, 'processing', 'rubber_dry', '烘干颗粒', {
      qualityBonus: 0.15, energyMultiplier: 1.4, productionSpeedMultiplier: 1.2,
      requiredLevel: 3, switchCost: 250000,
      description: '烘干制成标准颗粒胶',
      effects: ['品质+15%', '能耗+40%', '速度+20%'],
    }),
    createMethod(11, 20, 'tree_care', 'rubber_basic_care', '基础养护', {
      requiredLevel: 1, switchCost: 10000,
      description: '基本的树木养护',
      effects: ['基础养护'],
    }),
    createMethod(11, 21, 'tree_care', 'rubber_enhanced_care', '强化养护', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.05,
      laborMultiplier: 1.15, maintenanceMultiplier: 1.1,
      requiredLevel: 2, switchCost: 60000,
      description: '加强施肥和病虫害防治',
      effects: ['产量+10%', '品质+5%', '人力+15%', '维护+10%'],
    }),
    createMethod(11, 22, 'tree_care', 'rubber_scientific', '科学管理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.1,
      laborMultiplier: 0.9, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 150000,
      description: '科学化精细管理',
      effects: ['产量+20%', '品质+10%', '人力-10%', '维护+20%'],
    }),
  ]
);

// ==================== 畜牧场 (ID 12) ====================
const LIVESTOCK_FARM_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.LIVESTOCK_FARM,
  [
    createSlot(12, 'breeding_method', '养殖方式', '🐄', '牲畜养殖技术', 0),
    createSlot(12, 'feeding', '饲养方式', '🌾', '饲料投喂方式', 1),
    createSlot(12, 'health', '健康管理', '💉', '动物健康管理', 2),
  ],
  [
    createMethod(12, 0, 'breeding_method', 'livestock_pasture', '放牧养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.15,
      laborMultiplier: 1.2, energyMultiplier: 0.6, pollutionMultiplier: 0.7,
      requiredLevel: 1, switchCost: 50000,
      description: '草地放牧养殖',
      effects: ['产量-20%', '品质+15%', '人力+20%', '能耗-40%', '污染-30%'],
    }),
    createMethod(12, 1, 'breeding_method', 'livestock_intensive', '集约养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.7, energyMultiplier: 1.3, pollutionMultiplier: 1.4,
      requiredLevel: 2, switchCost: 300000,
      description: '规模化集约养殖',
      effects: ['产量+30%', '人力-30%', '能耗+30%', '污染+40%'],
    }),
    createMethod(12, 2, 'breeding_method', 'livestock_automated', '智能化养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }], qualityBonus: 0.1,
      laborMultiplier: 0.4, energyMultiplier: 1.5, maintenanceMultiplier: 1.4, pollutionMultiplier: 1.0,
      requiredLevel: 3, switchCost: 800000,
      description: '全自动智能养殖系统',
      effects: ['产量+50%', '品质+10%', '人力-60%', '能耗+50%', '维护+40%'],
    }),
    createMethod(12, 10, 'feeding', 'livestock_manual_feed', '人工投喂', {
      laborMultiplier: 1.3, productionSpeedMultiplier: 0.9,
      requiredLevel: 1, switchCost: 20000,
      description: '人工定时投喂',
      effects: ['人力+30%', '速度-10%'],
    }),
    createMethod(12, 11, 'feeding', 'livestock_auto_feed', '自动投喂', {
      laborMultiplier: 0.8, energyMultiplier: 1.2, productionSpeedMultiplier: 1.05,
      requiredLevel: 2, switchCost: 120000,
      description: '自动饲喂系统',
      effects: ['人力-20%', '能耗+20%', '速度+5%'],
    }),
    createMethod(12, 12, 'feeding', 'livestock_precision_feed', '精准饲喂', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.1,
      laborMultiplier: 0.6, energyMultiplier: 1.3, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 300000,
      description: '按需精准配料投喂',
      effects: ['产量+10%', '品质+10%', '人力-40%', '能耗+30%', '维护+20%'],
    }),
    createMethod(12, 20, 'health', 'livestock_basic_health', '基础防疫', {
      requiredLevel: 1, switchCost: 30000,
      description: '基本疫苗接种',
      effects: ['基础防疫'],
    }),
    createMethod(12, 21, 'health', 'livestock_enhanced_health', '强化防疫', {
      qualityBonus: 0.1, maintenanceMultiplier: 1.2,
      requiredLevel: 2, switchCost: 100000,
      description: '定期体检和防疫',
      effects: ['品质+10%', '维护+20%'],
    }),
    createMethod(12, 22, 'health', 'livestock_smart_health', '智能健康监测', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.15,
      maintenanceMultiplier: 1.4, energyMultiplier: 1.1,
      requiredLevel: 3, switchCost: 250000,
      description: '传感器实时健康监测',
      effects: ['产量+10%', '品质+15%', '维护+40%', '能耗+10%'],
    }),
  ]
);

// ==================== 渔场 (ID 13) ====================
const FISHERY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.FISHERY,
  [
    createSlot(13, 'aquaculture_method', '养殖方式', '🐟', '水产养殖技术', 0),
    createSlot(13, 'water_quality', '水质管理', '💧', '水质控制系统', 1),
    createSlot(13, 'feeding', '投喂方式', '🍞', '饲料投喂技术', 2),
  ],
  [
    createMethod(13, 0, 'aquaculture_method', 'fish_pond', '池塘养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      pollutionMultiplier: 1.2,
      requiredLevel: 1, switchCost: 50000,
      description: '传统池塘养殖',
      effects: ['污染+20%'],
    }),
    createMethod(13, 1, 'aquaculture_method', 'fish_cage', '网箱养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      laborMultiplier: 0.8, energyMultiplier: 1.2, pollutionMultiplier: 0.9,
      requiredLevel: 2, switchCost: 200000,
      description: '深水网箱养殖',
      effects: ['产量+25%', '人力-20%', '能耗+20%', '污染-10%'],
    }),
    createMethod(13, 2, 'aquaculture_method', 'fish_ras', '循环水养殖(RAS)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }], qualityBonus: 0.15,
      laborMultiplier: 0.5, energyMultiplier: 1.6, maintenanceMultiplier: 1.4, pollutionMultiplier: 0.4,
      requiredLevel: 3, switchCost: 600000,
      description: '循环水养殖系统',
      effects: ['产量+50%', '品质+15%', '人力-50%', '能耗+60%', '维护+40%', '污染-60%'],
    }),
    createMethod(13, 10, 'water_quality', 'fish_natural_water', '自然水体', {
      maintenanceMultiplier: 0.8,
      requiredLevel: 1, switchCost: 10000,
      description: '依赖自然水质',
      effects: ['维护-20%'],
    }),
    createMethod(13, 11, 'water_quality', 'fish_aeration', '增氧系统', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 1.2, maintenanceMultiplier: 1.1,
      requiredLevel: 2, switchCost: 80000,
      description: '机械增氧设备',
      effects: ['产量+10%', '能耗+20%', '维护+10%'],
    }),
    createMethod(13, 12, 'water_quality', 'fish_biofilter', '生物过滤', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.1,
      energyMultiplier: 1.3, maintenanceMultiplier: 1.25, pollutionMultiplier: 0.6,
      requiredLevel: 3, switchCost: 250000,
      description: '生物过滤水处理',
      effects: ['产量+15%', '品质+10%', '能耗+30%', '维护+25%', '污染-40%'],
    }),
    createMethod(13, 20, 'feeding', 'fish_manual', '人工投喂', {
      laborMultiplier: 1.4, productionSpeedMultiplier: 0.9,
      requiredLevel: 1, switchCost: 20000,
      description: '人工定时投喂',
      effects: ['人力+40%', '速度-10%'],
    }),
    createMethod(13, 21, 'feeding', 'fish_auto_feeder', '自动投饵机', {
      laborMultiplier: 0.7, energyMultiplier: 1.15, productionSpeedMultiplier: 1.05,
      requiredLevel: 2, switchCost: 100000,
      description: '自动定时投饵',
      effects: ['人力-30%', '能耗+15%', '速度+5%'],
    }),
    createMethod(13, 22, 'feeding', 'fish_smart_feed', '智能投喂', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.1,
      laborMultiplier: 0.5, energyMultiplier: 1.25, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 250000,
      description: '传感器监测智能投喂',
      effects: ['产量+10%', '品质+10%', '人力-50%', '能耗+25%', '维护+20%'],
    }),
  ]
);

// ==================== 药材园 (ID 14) ====================
const HERB_FARM_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.HERB_FARM,
  [
    createSlot(14, 'cultivation_method', '种植方式', '🌿', '药材种植技术', 0),
    createSlot(14, 'harvesting', '采收方式', '✂️', '药材采收技术', 1),
    createSlot(14, 'drying', '干燥方式', '☀️', '药材干燥加工', 2),
  ],
  [
    createMethod(14, 0, 'cultivation_method', 'herb_traditional', '传统种植', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.15,
      laborMultiplier: 1.3, energyMultiplier: 0.7,
      requiredLevel: 1, switchCost: 30000,
      description: '传统人工种植',
      effects: ['产量-10%', '品质+15%', '人力+30%', '能耗-30%'],
    }),
    createMethod(14, 1, 'cultivation_method', 'herb_gap', 'GAP标准种植', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.2,
      laborMultiplier: 1.1, maintenanceMultiplier: 1.2,
      requiredLevel: 2, switchCost: 200000,
      description: '良好农业规范种植',
      effects: ['产量+10%', '品质+20%', '人力+10%', '维护+20%'],
    }),
    createMethod(14, 2, 'cultivation_method', 'herb_controlled', '控制环境种植', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.25,
      laborMultiplier: 0.6, energyMultiplier: 1.6, maintenanceMultiplier: 1.4,
      requiredLevel: 3, switchCost: 500000,
      description: '温室控制环境种植',
      effects: ['产量+40%', '品质+25%', '人力-40%', '能耗+60%', '维护+40%'],
    }),
    createMethod(14, 10, 'harvesting', 'herb_manual_harvest', '人工采收', {
      qualityBonus: 0.1, laborMultiplier: 1.4, productionSpeedMultiplier: 0.8,
      requiredLevel: 1, switchCost: 20000,
      description: '人工精细采收',
      effects: ['品质+10%', '人力+40%', '速度-20%'],
    }),
    createMethod(14, 11, 'harvesting', 'herb_semi_auto', '半机械采收', {
      laborMultiplier: 0.9, productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 80000,
      description: '辅助工具采收',
      effects: ['人力-10%', '速度+10%'],
    }),
    createMethod(14, 12, 'harvesting', 'herb_mechanical', '机械化采收', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      laborMultiplier: 0.5, energyMultiplier: 1.3, productionSpeedMultiplier: 1.3,
      requiredLevel: 3, switchCost: 250000,
      description: '专用采收机械',
      effects: ['产量+15%', '人力-50%', '能耗+30%', '速度+30%'],
    }),
    createMethod(14, 20, 'drying', 'herb_sun_dry', '日晒干燥', {
      qualityBonus: 0.05, productionSpeedMultiplier: 0.6, energyMultiplier: 0.3,
      requiredLevel: 1, switchCost: 10000,
      description: '传统日晒干燥',
      effects: ['品质+5%', '速度-40%', '能耗-70%'],
    }),
    createMethod(14, 21, 'drying', 'herb_hot_air', '热风干燥', {
      productionSpeedMultiplier: 1.2, energyMultiplier: 1.3,
      requiredLevel: 2, switchCost: 80000,
      description: '热风烘干设备',
      effects: ['速度+20%', '能耗+30%'],
    }),
    createMethod(14, 22, 'drying', 'herb_freeze_dry', '冻干技术', {
      qualityBonus: 0.25, productionSpeedMultiplier: 0.9, energyMultiplier: 1.6, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 300000,
      description: '真空冻干保留活性',
      effects: ['品质+25%', '速度-10%', '能耗+60%', '维护+30%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const EXTRACTION_CONFIGS: BuildingMethodConfig[] = [
  IRON_MINE_CONFIG,      // ID 0
  COPPER_MINE_CONFIG,    // ID 1
  ALUMINUM_MINE_CONFIG,  // ID 2
  COAL_MINE_CONFIG,      // ID 3
  OIL_FIELD_CONFIG,      // ID 4
  GAS_FIELD_CONFIG,      // ID 5
  SILICON_MINE_CONFIG,   // ID 6
  LITHIUM_MINE_CONFIG,   // ID 7
  RARE_EARTH_MINE_CONFIG,// ID 8
  LOGGING_CAMP_CONFIG,   // ID 9
  FARM_CONFIG,           // ID 10
  RUBBER_PLANTATION_CONFIG, // ID 11
  LIVESTOCK_FARM_CONFIG, // ID 12
  FISHERY_CONFIG,        // ID 13
  HERB_FARM_CONFIG,      // ID 14
];

/**
 * 注册所有采掘类建筑的生产方式
 * 共15种建筑（ID 0-14），每种3个槽位
 */
export function registerExtractionMethods(): void {
  registerBuildingConfigs(EXTRACTION_CONFIGS);
}