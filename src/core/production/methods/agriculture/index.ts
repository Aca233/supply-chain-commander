/**
 * 农业产业链建筑专属生产方式
 * 建筑ID: 25-31 (农场、畜牧场、渔场、饲料厂、肉类加工厂、乳制品厂、粮油加工厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 农场 (ID 25) ====================

const FARM_CONFIG: BuildingMethodConfig = createBuildingConfig(
  25,
  [
    createSlot(25, 'cultivation', '种植方式', '🌾', '农作物种植技术', 0),
    createSlot(25, 'irrigation', '灌溉方式', '💧', '农田灌溉技术', 1),
    createSlot(25, 'fertilization', '施肥方式', '🧪', '肥料使用方式', 2),
  ],
  [
    // 种植方式
    createMethod(25, 0, 'cultivation', 'farm_traditional', '传统耕作', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      laborMultiplier: 1.5,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 10000,
      description: '人工+畜力耕作',
      effects: ['产量-20%', '人力+50%', '速度-20%'],
    }),
    createMethod(25, 1, 'cultivation', 'farm_mechanized', '机械化种植', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 0.6,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 150000,
      description: '农机化作业',
      effects: ['人力-40%', '能耗+30%', '速度+10%'],
    }),
    createMethod(25, 2, 'cultivation', 'farm_precision', '精准农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.4,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 500000,
      description: '卫星定位+变量作业',
      effects: ['产量+20%', '品质+15%', '人力-60%', '能耗+40%', '维护+30%', '速度+20%'],
    }),
    createMethod(25, 3, 'cultivation', 'farm_smart', '智慧农业', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.25,
      energyMultiplier: 1.6,
      maintenanceMultiplier: 1.5,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 1200000,
      description: 'AI+物联网全程监控',
      effects: ['产量+35%', '品质+25%', '人力-75%', '能耗+60%', '维护+50%', '速度+30%'],
    }),
    
    // 灌溉方式
    createMethod(25, 10, 'irrigation', 'farm_rain', '雨水灌溉', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: -0.1,
      energyMultiplier: 0.5,
      requiredLevel: 1,
      switchCost: 5000,
      description: '依靠自然降水',
      effects: ['产量-30%', '品质-10%', '能耗-50%'],
    }),
    createMethod(25, 11, 'irrigation', 'farm_flood', '漫灌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      energyMultiplier: 1.0,
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统灌溉方式',
      effects: ['产量-10%', '污染+20%'],
    }),
    createMethod(25, 12, 'irrigation', 'farm_sprinkler', '喷灌', {
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      pollutionMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 120000,
      description: '喷头喷洒灌溉',
      effects: ['品质+10%', '能耗+20%', '污染-20%'],
    }),
    createMethod(25, 13, 'irrigation', 'farm_drip', '滴灌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      energyMultiplier: 1.0,
      pollutionMultiplier: 0.5,
      requiredLevel: 3,
      switchCost: 300000,
      description: '精准滴灌节水',
      effects: ['产量+10%', '品质+15%', '污染-50%'],
    }),
    
    // 施肥方式
    createMethod(25, 20, 'fertilization', 'farm_organic', '有机肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.3,
      pollutionMultiplier: 0.4,
      requiredLevel: 1,
      switchCost: 20000,
      description: '农家有机肥',
      effects: ['产量-15%', '品质+20%', '人力+30%', '污染-60%'],
    }),
    createMethod(25, 21, 'fertilization', 'farm_chemical', '化学肥料', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: -0.05,
      inputModifiers: [{ goodsId: 20, multiplier: 1.0 }], // 化学品
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 50000,
      description: '化肥提高产量',
      effects: ['产量+15%', '品质-5%', '污染+30%'],
    }),
    createMethod(25, 22, 'fertilization', 'farm_precision_fert', '精准施肥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.1,
      inputModifiers: [{ goodsId: 20, multiplier: 0.7 }],
      pollutionMultiplier: 0.7,
      requiredLevel: 3,
      switchCost: 200000,
      description: '变量施肥技术',
      effects: ['产量+20%', '品质+10%', '肥料-30%', '污染-30%'],
    }),
  ]
);

// ==================== 畜牧场 (ID 26) ====================

const LIVESTOCK_FARM_CONFIG: BuildingMethodConfig = createBuildingConfig(
  26,
  [
    createSlot(26, 'breeding', '养殖方式', '🐄', '畜禽养殖技术', 0),
    createSlot(26, 'feeding', '饲养方式', '🌾', '饲料投喂方式', 1),
    createSlot(26, 'health', '健康管理', '💊', '动物疫病防控', 2),
  ],
  [
    // 养殖方式
    createMethod(26, 0, 'breeding', 'stock_free_range', '散养', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.4,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 20000,
      description: '自然放养',
      effects: ['产量-30%', '品质+20%', '人力+40%', '速度-30%'],
    }),
    createMethod(26, 1, 'breeding', 'stock_intensive', '集约化养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.1,
      laborMultiplier: 0.7,
      energyMultiplier: 1.3,
      pollutionMultiplier: 1.4,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 200000,
      description: '规模化圈养',
      effects: ['产量+20%', '品质-10%', '人力-30%', '能耗+30%', '污染+40%', '速度+20%'],
    }),
    createMethod(26, 2, 'breeding', 'stock_modern', '现代化养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.4,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.3,
      pollutionMultiplier: 0.8,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 3,
      switchCost: 600000,
      description: '环控+自动化设备',
      effects: ['产量+35%', '品质+10%', '人力-60%', '能耗+50%', '维护+30%', '污染-20%', '速度+40%'],
    }),
    
    // 饲养方式
    createMethod(26, 10, 'feeding', 'stock_manual_feed', '人工饲喂', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      laborMultiplier: 1.5,
      productionSpeedMultiplier: 0.85,
      requiredLevel: 1,
      switchCost: 10000,
      description: '人工投料',
      effects: ['产量-10%', '人力+50%', '速度-15%'],
    }),
    createMethod(26, 11, 'feeding', 'stock_semi_auto', '半自动饲喂', {
      laborMultiplier: 1.0,
      energyMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 80000,
      description: '机械辅助投料',
      effects: ['能耗+10%'],
    }),
    createMethod(26, 12, 'feeding', 'stock_auto_feed', '全自动饲喂', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.5,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 350000,
      description: '精准自动投料系统',
      effects: ['产量+10%', '品质+10%', '人力-50%', '能耗+30%', '维护+20%'],
    }),
    
    // 健康管理
    createMethod(26, 20, 'health', 'stock_basic_health', '基础防疫', {
      qualityBonus: -0.05,
      laborMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 15000,
      description: '常规疫苗接种',
      effects: ['品质-5%', '人力+10%'],
    }),
    createMethod(26, 21, 'health', 'stock_standard_health', '标准化防疫', {
      qualityBonus: 0.1,
      laborMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 80000,
      description: '完整防疫程序',
      effects: ['品质+10%', '人力+20%'],
    }),
    createMethod(26, 22, 'health', 'stock_smart_health', '智能健康监测', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.9,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 300000,
      description: '传感器实时监控',
      effects: ['产量+5%', '品质+20%', '人力-10%', '能耗+20%', '维护+30%'],
    }),
  ]
);

// ==================== 渔场 (ID 27) ====================

const FISHERY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  27,
  [
    createSlot(27, 'aquaculture', '养殖模式', '🐟', '水产养殖方式', 0),
    createSlot(27, 'water_mgmt', '水质管理', '💧', '养殖水体管理', 1),
  ],
  [
    // 养殖模式
    createMethod(27, 0, 'aquaculture', 'fish_pond', '池塘养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      laborMultiplier: 1.2,
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统池塘养殖',
      effects: ['产量-10%', '人力+20%', '污染+20%'],
    }),
    createMethod(27, 1, 'aquaculture', 'fish_cage', '网箱养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.0,
      pollutionMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 150000,
      description: '深水网箱养殖',
      effects: ['产量+10%', '品质+10%', '污染+10%'],
    }),
    createMethod(27, 2, 'aquaculture', 'fish_ras', '循环水养殖', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.6,
      energyMultiplier: 1.8,
      maintenanceMultiplier: 1.5,
      pollutionMultiplier: 0.3,
      requiredLevel: 3,
      switchCost: 600000,
      description: 'RAS循环水系统',
      effects: ['产量+25%', '品质+20%', '人力-40%', '能耗+80%', '维护+50%', '污染-70%'],
    }),
    
    // 水质管理
    createMethod(27, 10, 'water_mgmt', 'fish_natural', '自然水质', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: -0.1,
      energyMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 10000,
      description: '依靠自然净化',
      effects: ['产量-15%', '品质-10%', '能耗-30%'],
    }),
    createMethod(27, 11, 'water_mgmt', 'fish_aeration', '增氧管理', {
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 50000,
      description: '机械增氧',
      effects: ['品质+10%', '能耗+20%'],
    }),
    createMethod(27, 12, 'water_mgmt', 'fish_biofilter', '生物过滤', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.3,
      pollutionMultiplier: 0.5,
      requiredLevel: 3,
      switchCost: 250000,
      description: '生物滤池净化',
      effects: ['产量+10%', '品质+20%', '能耗+40%', '维护+30%', '污染-50%'],
    }),
  ]
);

// ==================== 饲料厂 (ID 28) ====================

const FEED_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  28,
  [
    createSlot(28, 'processing', '加工工艺', '⚙️', '饲料加工技术', 0),
    createSlot(28, 'formulation', '配方设计', '📋', '饲料配方技术', 1),
  ],
  [
    // 加工工艺
    createMethod(28, 0, 'processing', 'feed_simple', '简单混合', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: -0.15,
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 30000,
      description: '原料简单混合',
      effects: ['产量+10%', '品质-15%', '人力+20%', '速度+20%'],
    }),
    createMethod(28, 1, 'processing', 'feed_pellet', '制粒加工', {
      qualityBonus: 0.1,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 2,
      switchCost: 150000,
      description: '蒸汽制粒工艺',
      effects: ['品质+10%', '能耗+30%'],
    }),
    createMethod(28, 2, 'processing', 'feed_extrusion', '膨化加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 400000,
      description: '高温膨化处理',
      effects: ['产量-5%', '品质+25%', '能耗+50%', '维护+30%'],
    }),
    
    // 配方设计
    createMethod(28, 10, 'formulation', 'feed_standard', '标准配方', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1,
      switchCost: 10000,
      description: '通用饲料配方',
      effects: ['基础产能'],
    }),
    createMethod(28, 11, 'formulation', 'feed_optimized', '优化配方', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.1,
      requiredLevel: 2,
      switchCost: 80000,
      description: '营养优化配方',
      effects: ['原料-10%', '品质+10%'],
    }),
    createMethod(28, 12, 'formulation', 'feed_precision', '精准配方', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.15,
      requiredLevel: 3,
      switchCost: 250000,
      description: '动态精准营养配方',
      effects: ['原料-20%', '品质+20%', '人力+15%'],
    }),
  ]
);

// ==================== 肉类加工厂 (ID 29) ====================

const MEAT_PROCESSING_CONFIG: BuildingMethodConfig = createBuildingConfig(
  29,
  [
    createSlot(29, 'slaughter', '屠宰方式', '🔪', '屠宰加工技术', 0),
    createSlot(29, 'preservation', '保鲜技术', '❄️', '肉类保鲜方式', 1),
    createSlot(29, 'product_type', '产品类型', '🥩', '肉制品加工', 2),
  ],
  [
    // 屠宰方式
    createMethod(29, 0, 'slaughter', 'meat_manual', '人工屠宰', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.75 }],
      qualityBonus: -0.1,
      laborMultiplier: 1.8,
      productionSpeedMultiplier: 0.5,
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 20000,
      description: '传统人工屠宰',
      effects: ['产量-25%', '品质-10%', '人力+80%', '速度-50%', '污染+30%'],
    }),
    createMethod(29, 1, 'slaughter', 'meat_semi_auto', '半自动化', {
      laborMultiplier: 1.0,
      energyMultiplier: 1.2,
      pollutionMultiplier: 1.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 150000,
      description: '机械辅助屠宰',
      effects: ['能耗+20%'],
    }),
    createMethod(29, 2, 'slaughter', 'meat_automated', '全自动屠宰', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.4,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.3,
      pollutionMultiplier: 0.6,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 600000,
      description: '全自动流水线',
      effects: ['产量+20%', '品质+15%', '人力-60%', '能耗+50%', '维护+30%', '污染-40%', '速度+50%'],
    }),
    
    // 保鲜技术
    createMethod(29, 10, 'preservation', 'meat_fresh', '鲜销', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.1,
      energyMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 10000,
      description: '当日鲜销',
      effects: ['产量+5%', '品质-10%', '能耗-20%', '速度+20%'],
    }),
    createMethod(29, 11, 'preservation', 'meat_cold_chain', '冷链保鲜', {
      qualityBonus: 0.15,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 200000,
      description: '全程冷链',
      effects: ['品质+15%', '能耗+40%', '维护+20%'],
    }),
    createMethod(29, 12, 'preservation', 'meat_quick_freeze', '速冻锁鲜', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      qualityBonus: 0.25,
      energyMultiplier: 1.7,
      maintenanceMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 400000,
      description: '液氮速冻技术',
      effects: ['产量-2%', '品质+25%', '能耗+70%', '维护+30%'],
    }),
    
    // 产品类型
    createMethod(29, 20, 'product_type', 'meat_raw', '生鲜肉', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      laborMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 20000,
      description: '分割生鲜肉',
      effects: ['产量+10%', '人力-20%', '速度+20%'],
    }),
    createMethod(29, 21, 'product_type', 'meat_processed', '深加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.3,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 150000,
      description: '熟食制品加工',
      effects: ['产量-10%', '品质+20%', '人力+30%', '能耗+20%', '速度-20%'],
    }),
  ]
);

// ==================== 乳制品厂 (ID 30) ====================

const DAIRY_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  30,
  [
    createSlot(30, 'processing', '加工工艺', '🥛', '乳品加工技术', 0),
    createSlot(30, 'sterilization', '杀菌方式', '🔥', '杀菌消毒技术', 1),
  ],
  [
    // 加工工艺
    createMethod(30, 0, 'processing', 'dairy_basic', '基础加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 50000,
      description: '基础乳品加工',
      effects: ['人力+10%'],
    }),
    createMethod(30, 1, 'processing', 'dairy_separation', '分离技术', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 200000,
      description: '离心分离+标准化',
      effects: ['产量+15%', '品质+10%', '能耗+20%'],
    }),
    createMethod(30, 2, 'processing', 'dairy_membrane', '膜分离技术', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.8,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.4,
      requiredLevel: 3,
      switchCost: 500000,
      description: '超滤/纳滤膜技术',
      effects: ['产量+10%', '品质+25%', '人力-20%', '能耗+30%', '维护+40%'],
    }),
    
    // 杀菌方式
    createMethod(30, 10, 'sterilization', 'dairy_pasteur', '巴氏杀菌', {
      qualityBonus: 0.15,
      energyMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 80000,
      description: '低温长时杀菌',
      effects: ['品质+15%', '能耗+10%'],
    }),
    createMethod(30, 11, 'sterilization', 'dairy_htst', 'HTST杀菌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 200000,
      description: '高温短时杀菌',
      effects: ['产量+10%', '品质+10%', '能耗+20%', '速度+20%'],
    }),
    createMethod(30, 12, 'sterilization', 'dairy_uht', 'UHT灭菌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.05,
      energyMultiplier: 1.4,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 350000,
      description: '超高温瞬时灭菌',
      effects: ['产量+20%', '品质-5%', '能耗+40%', '速度+30%'],
    }),
  ]
);

// ==================== 粮油加工厂 (ID 31) ====================

const GRAIN_OIL_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  31,
  [
    createSlot(31, 'milling', '加工方式', '🌾', '粮食加工技术', 0),
    createSlot(31, 'oil_extraction', '榨油工艺', '🫒', '油料加工技术', 1),
  ],
  [
    // 加工方式
    createMethod(31, 0, 'milling', 'grain_traditional', '传统碾磨', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.4,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 30000,
      description: '石磨等传统加工',
      effects: ['产量-15%', '品质+10%', '人力+40%', '速度-30%'],
    }),
    createMethod(31, 1, 'milling', 'grain_modern', '现代碾磨', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      laborMultiplier: 0.7,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 200000,
      description: '现代辊式碾磨',
      effects: ['产量+10%', '人力-30%', '能耗+30%', '速度+20%'],
    }),
    createMethod(31, 2, 'milling', 'grain_precision', '精细加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.6,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 400000,
      description: '多道精细加工',
      effects: ['品质+20%', '人力-40%', '能耗+40%', '维护+20%'],
    }),
    
    // 榨油工艺
    createMethod(31, 10, 'oil_extraction', 'oil_pressing', '压榨法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.2,
      energyMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 50000,
      description: '物理压榨出油',
      effects: ['产量-15%', '品质+20%', '人力+20%', '能耗+10%'],
    }),
    createMethod(31, 11, 'oil_extraction', 'oil_solvent', '浸出法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.1,
      laborMultiplier: 0.8,
      energyMultiplier: 1.3,
      pollutionMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 250000,
      description: '溶剂浸出提油',
      effects: ['产量+20%', '品质-10%', '人力-20%', '能耗+30%', '污染+30%'],
    }),
    createMethod(31, 12, 'oil_extraction', 'oil_combined', '预榨浸出', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.7,
      energyMultiplier: 1.4,
      pollutionMultiplier: 1.1,
      requiredLevel: 3,
      switchCost: 450000,
      description: '预榨+浸出组合',
      effects: ['产量+15%', '品质+10%', '人力-30%', '能耗+40%', '污染+10%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const AGRICULTURE_CONFIGS: BuildingMethodConfig[] = [
  FARM_CONFIG,
  LIVESTOCK_FARM_CONFIG,
  FISHERY_CONFIG,
  FEED_FACTORY_CONFIG,
  MEAT_PROCESSING_CONFIG,
  DAIRY_FACTORY_CONFIG,
  GRAIN_OIL_FACTORY_CONFIG,
];

/**
 * 注册所有农业产业链建筑的生产方式
 */
export function registerAgricultureMethods(): void {
  registerBuildingConfigs(AGRICULTURE_CONFIGS);
}