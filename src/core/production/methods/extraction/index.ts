/**
 * 采掘类建筑专属生产方式
 * 建筑ID: 0-7 (铁矿场、铜矿场、煤矿、油田、气田、伐木场、农场、硅石矿场)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 铁矿场 (ID 0) ====================

const IRON_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  0,
  // 槽位定义
  [
    createSlot(0, 'mining_method', '开采方式', '⛏️', '选择矿石开采的技术方法', 0),
    createSlot(0, 'ore_processing', '矿石处理', '🔩', '开采后的矿石处理方式', 1),
    createSlot(0, 'safety', '安全标准', '🦺', '矿场安全防护等级', 2),
  ],
  // 方式定义
  [
    // 开采方式槽位
    createMethod(0, 0, 'mining_method', 'iron_open_pit', '露天开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 0.8,
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 50000,
      description: '表层露天开采，成本低但污染较高',
      effects: ['能耗-20%', '污染+20%'],
    }),
    createMethod(0, 1, 'mining_method', 'iron_underground', '地下开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      laborMultiplier: 1.2,
      energyMultiplier: 1.1,
      pollutionMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 200000,
      description: '深层矿脉开采，产量更高，可获取高品位矿石',
      effects: ['产量+15%', '人力+20%', '能耗+10%', '污染-20%'],
    }),
    createMethod(0, 2, 'mining_method', 'iron_mechanized', '机械化采矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.6,
      energyMultiplier: 1.4,
      pollutionMultiplier: 1.0,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 500000,
      description: '全机械化开采，效率大幅提升',
      effects: ['产量+30%', '人力-40%', '能耗+40%', '速度+20%'],
    }),
    createMethod(0, 3, 'mining_method', 'iron_smart_mining', '智能采矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      laborMultiplier: 0.3,
      energyMultiplier: 1.6,
      pollutionMultiplier: 0.7,
      productionSpeedMultiplier: 1.4,
      qualityBonus: 0.1,
      requiredLevel: 4,
      switchCost: 1500000,
      description: 'AI优化的智能采矿系统，自动选择最佳开采路径',
      effects: ['产量+50%', '人力-70%', '能耗+60%', '速度+40%', '品质+10%', '污染-30%'],
    }),
    
    // 矿石处理槽位
    createMethod(0, 10, 'ore_processing', 'iron_raw_output', '原矿直出', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 0.9,
      energyMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 20000,
      description: '原矿不经处理直接输出',
      effects: ['人力-10%', '能耗-20%'],
    }),
    createMethod(0, 11, 'ore_processing', 'iron_primary_beneficiation', '初级选矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      energyMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 80000,
      description: '简单筛选分级，提升矿石品位',
      effects: ['产量-5%', '品质+10%', '人力+10%', '能耗+20%'],
    }),
    createMethod(0, 12, 'ore_processing', 'iron_concentrate', '精选矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.3,
      energyMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 200000,
      description: '深度选矿，获得高品位精矿',
      effects: ['产量-15%', '品质+25%', '人力+30%', '能耗+50%'],
    }),
    
    // 安全标准槽位
    createMethod(0, 20, 'safety', 'iron_basic_safety', '基础防护', {
      laborMultiplier: 1.0,
      maintenanceMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 10000,
      description: '满足最低安全要求',
      effects: ['无特殊效果'],
    }),
    createMethod(0, 21, 'safety', 'iron_standard_safety', '标准安保', {
      laborMultiplier: 1.05,
      maintenanceMultiplier: 1.15,
      productionSpeedMultiplier: 1.05,
      requiredLevel: 2,
      switchCost: 50000,
      description: '完善的安全管理体系',
      effects: ['人力+5%', '维护+15%', '速度+5%'],
    }),
    createMethod(0, 22, 'safety', 'iron_advanced_safety', '高级防护', {
      laborMultiplier: 1.1,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.1,
      qualityBonus: 0.05,
      requiredLevel: 3,
      switchCost: 150000,
      description: '智能化安全监控，事故率极低',
      effects: ['人力+10%', '维护+30%', '速度+10%', '品质+5%'],
    }),
  ]
);

// ==================== 铜矿场 (ID 1) ====================

const COPPER_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  1,
  [
    createSlot(1, 'mining_method', '开采方式', '⛏️', '选择铜矿开采技术', 0),
    createSlot(1, 'ore_grade', '品位控制', '💎', '矿石品位分选策略', 1),
  ],
  [
    // 开采方式
    createMethod(1, 0, 'mining_method', 'copper_traditional', '传统采矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 50000,
      description: '传统机械采矿方式',
      effects: ['基础产能'],
    }),
    createMethod(1, 1, 'mining_method', 'copper_flotation', '浮选开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.15,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 150000,
      description: '采用浮选工艺，提高铜矿回收率',
      effects: ['产量+10%', '品质+15%', '人力+15%', '能耗+20%'],
    }),
    createMethod(1, 2, 'mining_method', 'copper_bioleaching', '生物浸出', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.8,
      energyMultiplier: 0.6,
      pollutionMultiplier: 0.5,
      requiredLevel: 3,
      switchCost: 300000,
      description: '微生物辅助浸出，低能耗环保工艺',
      effects: ['产量-10%', '品质+10%', '人力-20%', '能耗-40%', '污染-50%'],
    }),
    createMethod(1, 3, 'mining_method', 'copper_automated', '自动化开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      laborMultiplier: 0.4,
      energyMultiplier: 1.5,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 800000,
      description: '全自动化无人采矿系统',
      effects: ['产量+35%', '人力-60%', '能耗+50%', '速度+30%'],
    }),
    
    // 品位控制
    createMethod(1, 10, 'ore_grade', 'copper_mixed', '混合出矿', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.05,
      requiredLevel: 1,
      switchCost: 20000,
      description: '不分品位混合开采',
      effects: ['产量+10%', '品质-5%'],
    }),
    createMethod(1, 11, 'ore_grade', 'copper_sorted', '品位分选', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 60000,
      description: '按品位分级开采和存储',
      effects: ['品质+10%', '人力+10%'],
    }),
    createMethod(1, 12, 'ore_grade', 'copper_high_grade_priority', '高品位优先', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 120000,
      description: '优先开采高品位矿脉',
      effects: ['产量-15%', '品质+25%', '人力+20%'],
    }),
  ]
);

// ==================== 煤矿 (ID 2) ====================

const COAL_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  2,
  [
    createSlot(2, 'mining_method', '采煤方式', '⛏️', '煤炭开采技术', 0),
    createSlot(2, 'ventilation', '通风方式', '💨', '矿井通风系统', 1),
    createSlot(2, 'coal_wash', '洗煤工艺', '💧', '煤炭洗选处理', 2),
  ],
  [
    // 采煤方式
    createMethod(2, 0, 'mining_method', 'coal_blasting', '炮采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      laborMultiplier: 1.3,
      energyMultiplier: 0.7,
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统爆破采煤，劳动密集型',
      effects: ['产量-10%', '人力+30%', '能耗-30%', '污染+30%'],
    }),
    createMethod(2, 1, 'mining_method', 'coal_conventional', '普采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 80000,
      description: '机械化普通采煤',
      effects: ['基础产能'],
    }),
    createMethod(2, 2, 'mining_method', 'coal_longwall', '综采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      laborMultiplier: 0.6,
      energyMultiplier: 1.4,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 400000,
      description: '综合机械化采煤，高效率',
      effects: ['产量+40%', '人力-40%', '能耗+40%', '速度+30%'],
    }),
    createMethod(2, 3, 'mining_method', 'coal_continuous', '连续采煤机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.6 }],
      laborMultiplier: 0.4,
      energyMultiplier: 1.7,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 4,
      switchCost: 1000000,
      description: '连续采煤系统，24小时不间断作业',
      effects: ['产量+60%', '人力-60%', '能耗+70%', '速度+50%'],
    }),
    
    // 通风方式
    createMethod(2, 10, 'ventilation', 'coal_natural_vent', '自然通风', {
      maintenanceMultiplier: 0.8,
      laborMultiplier: 1.1,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 1,
      switchCost: 10000,
      description: '依靠自然压差通风',
      effects: ['维护-20%', '人力+10%', '速度-10%'],
    }),
    createMethod(2, 11, 'ventilation', 'coal_mechanical_vent', '机械通风', {
      energyMultiplier: 1.1,
      maintenanceMultiplier: 1.1,
      productionSpeedMultiplier: 1.05,
      requiredLevel: 1,
      switchCost: 60000,
      description: '风机强制通风系统',
      effects: ['能耗+10%', '维护+10%', '速度+5%'],
    }),
    createMethod(2, 12, 'ventilation', 'coal_smart_vent', '智能通风系统', {
      energyMultiplier: 1.0,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.15,
      laborMultiplier: 0.95,
      requiredLevel: 3,
      switchCost: 200000,
      description: 'AI控制的智能通风，按需调节',
      effects: ['维护+20%', '速度+15%', '人力-5%'],
    }),
    
    // 洗煤工艺
    createMethod(2, 20, 'coal_wash', 'coal_raw_sale', '原煤直销', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.1,
      laborMultiplier: 0.9,
      requiredLevel: 1,
      switchCost: 10000,
      description: '不经洗选直接销售',
      effects: ['产量+5%', '品质-10%', '人力-10%'],
    }),
    createMethod(2, 21, 'coal_wash', 'coal_simple_wash', '简单洗选', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      energyMultiplier: 1.15,
      requiredLevel: 2,
      switchCost: 80000,
      description: '基础洗煤处理',
      effects: ['产量-5%', '品质+10%', '人力+10%', '能耗+15%'],
    }),
    createMethod(2, 22, 'coal_wash', 'coal_deep_wash', '精洗低硫煤', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.3,
      energyMultiplier: 1.4,
      pollutionMultiplier: 0.7,
      requiredLevel: 3,
      switchCost: 250000,
      description: '深度洗选，产出低硫优质煤',
      effects: ['产量-15%', '品质+30%', '人力+30%', '能耗+40%', '污染-30%'],
    }),
  ]
);

// ==================== 油田 (ID 3) ====================

const OIL_FIELD_CONFIG: BuildingMethodConfig = createBuildingConfig(
  3,
  [
    createSlot(3, 'extraction_method', '采油方式', '🛢️', '原油开采技术', 0),
    createSlot(3, 'wellhead_control', '井口控制', '🎛️', '井口控制系统', 1),
  ],
  [
    // 采油方式
    createMethod(3, 0, 'extraction_method', 'oil_natural_flow', '自喷采油', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 0.8,
      energyMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 50000,
      description: '利用地层压力自喷采油，仅适用于新油井',
      effects: ['产量+20%', '人力-20%', '能耗-50%'],
    }),
    createMethod(3, 1, 'extraction_method', 'oil_pumping', '机械采油', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 100000,
      description: '抽油机机械采油',
      effects: ['基础产能'],
    }),
    createMethod(3, 2, 'extraction_method', 'oil_water_injection', '注水驱油', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      laborMultiplier: 1.1,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 500000,
      description: '注水增压提高采收率',
      effects: ['产量+25%', '人力+10%', '能耗+30%', '维护+20%'],
    }),
    createMethod(3, 3, 'extraction_method', 'oil_eor', '三次采油(EOR)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      laborMultiplier: 1.3,
      energyMultiplier: 1.6,
      maintenanceMultiplier: 1.5,
      pollutionMultiplier: 1.2,
      requiredLevel: 4,
      switchCost: 2000000,
      description: '化学驱、气驱等强化采油技术',
      effects: ['产量+50%', '人力+30%', '能耗+60%', '维护+50%', '污染+20%'],
    }),
    
    // 井口控制
    createMethod(3, 10, 'wellhead_control', 'oil_manual', '手动控制', {
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 0.95,
      maintenanceMultiplier: 0.9,
      requiredLevel: 1,
      switchCost: 20000,
      description: '人工操作井口设备',
      effects: ['人力+20%', '速度-5%', '维护-10%'],
    }),
    createMethod(3, 11, 'wellhead_control', 'oil_semi_auto', '半自动控制', {
      laborMultiplier: 0.9,
      energyMultiplier: 1.1,
      productionSpeedMultiplier: 1.05,
      requiredLevel: 2,
      switchCost: 150000,
      description: '部分自动化控制系统',
      effects: ['人力-10%', '能耗+10%', '速度+5%'],
    }),
    createMethod(3, 12, 'wellhead_control', 'oil_scada', '全自动SCADA', {
      laborMultiplier: 0.5,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.15,
      maintenanceMultiplier: 1.3,
      qualityBonus: 0.05,
      requiredLevel: 3,
      switchCost: 600000,
      description: '远程监控与数据采集系统',
      effects: ['人力-50%', '能耗+20%', '速度+15%', '维护+30%', '品质+5%'],
    }),
  ]
);

// ==================== 气田 (ID 4) ====================

const GAS_FIELD_CONFIG: BuildingMethodConfig = createBuildingConfig(
  4,
  [
    createSlot(4, 'extraction_method', '采气方式', '💨', '天然气开采技术', 0),
    createSlot(4, 'gas_treatment', '气体处理', '🧪', '天然气净化处理', 1),
  ],
  [
    // 采气方式
    createMethod(4, 0, 'extraction_method', 'gas_conventional', '常规采气', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 80000,
      description: '自然压力驱动采气',
      effects: ['基础产能'],
    }),
    createMethod(4, 1, 'extraction_method', 'gas_compression', '增压采气', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 1.1,
      energyMultiplier: 1.4,
      requiredLevel: 2,
      switchCost: 300000,
      description: '使用增压设备提高产量',
      effects: ['产量+20%', '人力+10%', '能耗+40%'],
    }),
    createMethod(4, 2, 'extraction_method', 'gas_dewatering', '排水采气', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      laborMultiplier: 1.2,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 700000,
      description: '排除地层水提高气井产能',
      effects: ['产量+35%', '人力+20%', '能耗+50%', '维护+30%'],
    }),
    
    // 气体处理
    createMethod(4, 10, 'gas_treatment', 'gas_dehydration', '简单脱水', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      qualityBonus: 0.05,
      energyMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 50000,
      description: '基础脱水处理',
      effects: ['产量-2%', '品质+5%', '能耗+10%'],
    }),
    createMethod(4, 11, 'gas_treatment', 'gas_sweetening', '脱硫脱碳', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.92 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.3,
      pollutionMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 200000,
      description: '脱除硫化氢和二氧化碳',
      effects: ['产量-8%', '品质+20%', '能耗+30%', '污染-30%'],
    }),
    createMethod(4, 12, 'gas_treatment', 'gas_deep_purification', '深度净化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.35,
      energyMultiplier: 1.5,
      laborMultiplier: 1.2,
      pollutionMultiplier: 0.5,
      requiredLevel: 3,
      switchCost: 500000,
      description: '生产高纯度管输气',
      effects: ['产量-15%', '品质+35%', '能耗+50%', '人力+20%', '污染-50%'],
    }),
  ]
);

// ==================== 伐木场 (ID 5) ====================

const LOGGING_CAMP_CONFIG: BuildingMethodConfig = createBuildingConfig(
  5,
  [
    createSlot(5, 'logging_method', '采伐方式', '🪓', '木材采伐技术', 0),
    createSlot(5, 'forest_management', '林业管理', '🌲', '森林可持续管理', 1),
  ],
  [
    // 采伐方式
    createMethod(5, 0, 'logging_method', 'log_manual', '人工采伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      laborMultiplier: 1.5,
      energyMultiplier: 0.5,
      qualityBonus: 0.1,
      requiredLevel: 1,
      switchCost: 20000,
      description: '传统人工伐木',
      effects: ['产量-20%', '人力+50%', '能耗-50%', '品质+10%'],
    }),
    createMethod(5, 1, 'logging_method', 'log_chainsaw', '链锯采伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 50000,
      description: '电动/油动链锯采伐',
      effects: ['基础产能'],
    }),
    createMethod(5, 2, 'logging_method', 'log_harvester', '伐木机采伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      laborMultiplier: 0.5,
      energyMultiplier: 1.5,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 300000,
      description: '专业伐木机作业',
      effects: ['产量+40%', '人力-50%', '能耗+50%', '速度+30%'],
    }),
    createMethod(5, 3, 'logging_method', 'log_combined', '联合采伐机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.7 }],
      laborMultiplier: 0.3,
      energyMultiplier: 1.8,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 4,
      switchCost: 800000,
      description: '集伐木、打枝、截断于一体',
      effects: ['产量+70%', '人力-70%', '能耗+80%', '速度+50%'],
    }),
    
    // 林业管理
    createMethod(5, 10, 'forest_management', 'log_clearcut', '皆伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      pollutionMultiplier: 1.5,
      requiredLevel: 1,
      switchCost: 10000,
      description: '整片砍伐，产量高但不可持续',
      effects: ['产量+20%', '污染+50%'],
    }),
    createMethod(5, 11, 'forest_management', 'log_selective', '择伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.15,
      pollutionMultiplier: 0.7,
      laborMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 80000,
      description: '选择性采伐成熟树木，可持续经营',
      effects: ['产量-10%', '品质+15%', '污染-30%', '人力+20%'],
    }),
    createMethod(5, 12, 'forest_management', 'log_rotation', '轮伐', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      pollutionMultiplier: 0.8,
      requiredLevel: 3,
      switchCost: 150000,
      description: '分区轮流采伐，兼顾产量与可持续',
      effects: ['产量+10%', '品质+10%', '污染-20%'],
    }),
  ]
);

// ==================== 农场 (ID 6) ====================

const FARM_CONFIG: BuildingMethodConfig = createBuildingConfig(
  6,
  [
    createSlot(6, 'farming_method', '耕作方式', '🌾', '农业生产技术', 0),
    createSlot(6, 'irrigation', '灌溉方式', '💧', '农田灌溉系统', 1),
    createSlot(6, 'fertilization', '施肥方式', '🧪', '肥料施用技术', 2),
  ],
  [
    // 耕作方式
    createMethod(6, 0, 'farming_method', 'farm_traditional', '传统耕作', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      laborMultiplier: 1.4,
      energyMultiplier: 0.6,
      qualityBonus: 0.1,
      requiredLevel: 1,
      switchCost: 20000,
      description: '传统人力畜力耕作',
      effects: ['产量-10%', '人力+40%', '能耗-40%', '品质+10%'],
    }),
    createMethod(6, 1, 'farming_method', 'farm_mechanized', '机械化农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 0.7,
      energyMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 100000,
      description: '拖拉机等农机作业',
      effects: ['人力-30%', '能耗+30%'],
    }),
    createMethod(6, 2, 'farming_method', 'farm_precision', '精准农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      laborMultiplier: 0.5,
      energyMultiplier: 1.4,
      qualityBonus: 0.15,
      pollutionMultiplier: 0.8,
      requiredLevel: 3,
      switchCost: 400000,
      description: 'GPS导航、无人机、传感器精准作业',
      effects: ['产量+25%', '人力-50%', '能耗+40%', '品质+15%', '污染-20%'],
    }),
    createMethod(6, 3, 'farming_method', 'farm_vertical', '垂直农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.6 }],
      laborMultiplier: 0.4,
      energyMultiplier: 2.0,
      maintenanceMultiplier: 1.5,
      qualityBonus: 0.25,
      pollutionMultiplier: 0.4,
      requiredLevel: 4,
      switchCost: 2000000,
      description: '室内多层种植系统，不受天气影响',
      effects: ['产量+60%', '人力-60%', '能耗+100%', '维护+50%', '品质+25%', '污染-60%'],
    }),
    
    // 灌溉方式
    createMethod(6, 10, 'irrigation', 'farm_rainfed', '雨养农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      energyMultiplier: 0.5,
      maintenanceMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 5000,
      description: '完全依赖自然降水',
      effects: ['产量-15%', '能耗-50%', '维护-20%'],
    }),
    createMethod(6, 11, 'irrigation', 'farm_flood', '漫灌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 1.0,
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统漫灌，水资源利用率低',
      effects: ['污染+20%'],
    }),
    createMethod(6, 12, 'irrigation', 'farm_sprinkler', '喷灌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 1.2,
      pollutionMultiplier: 0.9,
      requiredLevel: 2,
      switchCost: 100000,
      description: '喷灌系统，节水效果好',
      effects: ['产量+10%', '能耗+20%', '污染-10%'],
    }),
    createMethod(6, 13, 'irrigation', 'farm_drip', '滴灌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      energyMultiplier: 1.1,
      qualityBonus: 0.1,
      pollutionMultiplier: 0.7,
      requiredLevel: 3,
      switchCost: 200000,
      description: '精准滴灌，高效节水',
      effects: ['产量+15%', '能耗+10%', '品质+10%', '污染-30%'],
    }),
    
    // 施肥方式
    createMethod(6, 20, 'fertilization', 'farm_organic', '有机肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.2,
      pollutionMultiplier: 0.6,
      requiredLevel: 1,
      switchCost: 30000,
      description: '使用农家肥、堆肥等有机肥料',
      effects: ['产量-10%', '品质+20%', '人力+20%', '污染-40%'],
    }),
    createMethod(6, 21, 'fertilization', 'farm_chemical', '化肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: -0.05,
      pollutionMultiplier: 1.4,
      requiredLevel: 1,
      switchCost: 20000,
      description: '化学肥料，增产效果明显',
      effects: ['产量+15%', '品质-5%', '污染+40%'],
    }),
    createMethod(6, 22, 'fertilization', 'farm_formula', '配方施肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.1,
      pollutionMultiplier: 1.0,
      laborMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 80000,
      description: '根据土壤检测配方施肥',
      effects: ['产量+20%', '品质+10%', '人力+10%'],
    }),
    createMethod(6, 23, 'fertilization', 'farm_smart', '智能施肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.8,
      pollutionMultiplier: 0.8,
      energyMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 250000,
      description: '传感器监测+自动精准施肥',
      effects: ['产量+25%', '品质+15%', '人力-20%', '污染-20%', '能耗+20%'],
    }),
  ]
);

// ==================== 硅石矿场 (ID 7) ====================

const SILICON_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  7,
  [
    createSlot(7, 'mining_method', '开采方式', '⛏️', '硅石开采技术', 0),
    createSlot(7, 'purification', '纯度控制', '✨', '硅石纯度等级', 1),
  ],
  [
    // 开采方式
    createMethod(7, 0, 'mining_method', 'silicon_opencast', '露天开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      energyMultiplier: 0.9,
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 60000,
      description: '露天矿场开采',
      effects: ['能耗-10%', '污染+20%'],
    }),
    createMethod(7, 1, 'mining_method', 'silicon_selective', '选择性开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.2,
      energyMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 180000,
      description: '选择高品位矿脉开采',
      effects: ['产量-10%', '品质+15%', '人力+20%', '能耗+10%'],
    }),
    createMethod(7, 2, 'mining_method', 'silicon_precision', '精密开采', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.4,
      energyMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 400000,
      description: '精密开采高纯硅石，用于半导体',
      effects: ['产量-15%', '品质+30%', '人力+40%', '能耗+30%'],
    }),
    
    // 纯度控制
    createMethod(7, 10, 'purification', 'silicon_raw', '原矿石', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.1,
      requiredLevel: 1,
      switchCost: 10000,
      description: '不经提纯直接输出',
      effects: ['产量+10%', '品质-10%'],
    }),
    createMethod(7, 11, 'purification', 'silicon_primary', '初级提纯', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 100000,
      description: '基础提纯处理',
      effects: ['产量-5%', '品质+10%', '能耗+20%'],
    }),
    createMethod(7, 12, 'purification', 'silicon_semiconductor', '半导体级', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.4,
      laborMultiplier: 1.5,
      energyMultiplier: 1.8,
      maintenanceMultiplier: 1.4,
      requiredLevel: 4,
      switchCost: 800000,
      description: '生产高纯度半导体级硅石',
      effects: ['产量-30%', '品质+40%', '人力+50%', '能耗+80%', '维护+40%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const EXTRACTION_CONFIGS: BuildingMethodConfig[] = [
  IRON_MINE_CONFIG,
  COPPER_MINE_CONFIG,
  COAL_MINE_CONFIG,
  OIL_FIELD_CONFIG,
  GAS_FIELD_CONFIG,
  LOGGING_CAMP_CONFIG,
  FARM_CONFIG,
  SILICON_MINE_CONFIG,
];

/**
 * 注册所有采掘类建筑的生产方式
 */
export function registerExtractionMethods(): void {
  registerBuildingConfigs(EXTRACTION_CONFIGS);
}