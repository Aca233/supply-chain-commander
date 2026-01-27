/**
 * 加工类建筑专属生产方式
 * 建筑ID: 8-15 (钢铁厂、炼油厂、化工厂、玻璃厂、纺织厂、食品厂、水泥厂、铝冶炼厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 钢铁厂 (ID 8) ====================

const STEEL_MILL_CONFIG: BuildingMethodConfig = createBuildingConfig(
  8,
  [
    createSlot(8, 'steelmaking', '炼钢工艺', '🔥', '钢铁冶炼核心技术', 0),
    createSlot(8, 'heat_treatment', '热处理', '♨️', '钢材热处理工艺', 1),
    createSlot(8, 'quality_control', '质量控制', '✅', '产品质量检测方式', 2),
    createSlot(8, 'environmental', '环保措施', '🌿', '废气废水处理', 3),
  ],
  [
    // 炼钢工艺
    createMethod(8, 0, 'steelmaking', 'steel_bf_bof', '高炉-转炉法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      inputModifiers: [{ goodsId: 0, multiplier: 1.0 }, { goodsId: 3, multiplier: 1.0 }], // 铁矿石、煤炭
      laborMultiplier: 1.0,
      energyMultiplier: 1.0,
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 100000,
      description: '传统高炉炼铁+转炉炼钢工艺',
      effects: ['基础产能', '污染+30%'],
    }),
    createMethod(8, 1, 'steelmaking', 'steel_eaf', '电弧炉法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      inputModifiers: [{ goodsId: 0, multiplier: 0.7 }, { goodsId: 3, multiplier: 0.3 }], // 减少原料
      laborMultiplier: 0.8,
      energyMultiplier: 1.5,
      pollutionMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 500000,
      description: '电弧炉炼钢，可使用废钢',
      effects: ['产量+10%', '原料-30%', '人力-20%', '能耗+50%', '污染-30%'],
    }),
    createMethod(8, 2, 'steelmaking', 'steel_induction', '感应炉法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      inputModifiers: [{ goodsId: 0, multiplier: 0.6 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.9,
      energyMultiplier: 1.3,
      pollutionMultiplier: 0.6,
      requiredLevel: 3,
      switchCost: 800000,
      description: '感应熔炼，适合特种钢生产',
      effects: ['产量-10%', '品质+20%', '原料-40%', '能耗+30%', '污染-40%'],
    }),
    createMethod(8, 3, 'steelmaking', 'steel_hydrogen', '氢冶金(绿钢)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      inputModifiers: [{ goodsId: 3, multiplier: 0.1 }], // 几乎不用煤
      qualityBonus: 0.15,
      laborMultiplier: 0.7,
      energyMultiplier: 1.8,
      pollutionMultiplier: 0.2,
      requiredLevel: 4,
      switchCost: 3000000,
      description: '使用氢气还原铁矿石，近零碳排放',
      effects: ['产量+5%', '品质+15%', '煤耗-90%', '人力-30%', '能耗+80%', '污染-80%'],
    }),
    
    // 热处理
    createMethod(8, 10, 'heat_treatment', 'steel_no_treatment', '无处理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.1,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 10000,
      description: '不进行热处理直接出厂',
      effects: ['产量+5%', '品质-10%', '速度+10%'],
    }),
    createMethod(8, 11, 'heat_treatment', 'steel_normalizing', '正火', {
      qualityBonus: 0.1,
      energyMultiplier: 1.15,
      requiredLevel: 1,
      switchCost: 50000,
      description: '消除内应力，改善机械性能',
      effects: ['品质+10%', '能耗+15%'],
    }),
    createMethod(8, 12, 'heat_treatment', 'steel_quench_temper', '淬火回火', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      energyMultiplier: 1.3,
      laborMultiplier: 1.15,
      requiredLevel: 2,
      switchCost: 150000,
      description: '提高硬度和强度',
      effects: ['产量-5%', '品质+25%', '能耗+30%', '人力+15%'],
    }),
    createMethod(8, 13, 'heat_treatment', 'steel_full_treatment', '热处理全流程', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.4,
      energyMultiplier: 1.5,
      laborMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 400000,
      description: '完整的热处理工艺流程',
      effects: ['产量-10%', '品质+40%', '能耗+50%', '人力+30%'],
    }),
    
    // 质量控制
    createMethod(8, 20, 'quality_control', 'steel_sampling', '抽检', {
      qualityBonus: 0.05,
      laborMultiplier: 1.05,
      productionSpeedMultiplier: 1.05,
      requiredLevel: 1,
      switchCost: 20000,
      description: '随机抽样检验',
      effects: ['品质+5%', '人力+5%', '速度+5%'],
    }),
    createMethod(8, 21, 'quality_control', 'steel_full_inspection', '全检', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 2,
      switchCost: 80000,
      description: '每批次全量检验',
      effects: ['产量-2%', '品质+15%', '人力+20%', '速度-10%'],
    }),
    createMethod(8, 22, 'quality_control', 'steel_online_detection', '在线检测', {
      qualityBonus: 0.25,
      laborMultiplier: 0.9,
      energyMultiplier: 1.1,
      maintenanceMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 300000,
      description: '自动化在线质量检测系统',
      effects: ['品质+25%', '人力-10%', '能耗+10%', '维护+20%'],
    }),
    
    // 环保措施
    createMethod(8, 30, 'environmental', 'steel_basic_dust', '基础除尘', {
      maintenanceMultiplier: 1.1,
      pollutionMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 50000,
      description: '布袋除尘器',
      effects: ['维护+10%', '污染-20%'],
    }),
    createMethod(8, 31, 'environmental', 'steel_flue_gas', '烟气净化', {
      maintenanceMultiplier: 1.25,
      energyMultiplier: 1.1,
      pollutionMultiplier: 0.5,
      requiredLevel: 2,
      switchCost: 200000,
      description: '脱硫脱硝+除尘系统',
      effects: ['维护+25%', '能耗+10%', '污染-50%'],
    }),
    createMethod(8, 32, 'environmental', 'steel_zero_emission', '零排放系统', {
      maintenanceMultiplier: 1.5,
      energyMultiplier: 1.2,
      laborMultiplier: 1.1,
      pollutionMultiplier: 0.15,
      byproductChance: 0.1,
      byproductGoodsId: 20, // 化学品副产品
      byproductAmount: 5,
      requiredLevel: 4,
      switchCost: 1000000,
      description: '废气废水零排放，副产品回收',
      effects: ['维护+50%', '能耗+20%', '人力+10%', '污染-85%', '副产品几率10%'],
    }),
  ]
);

// ==================== 炼油厂 (ID 9) ====================

const REFINERY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  9,
  [
    createSlot(9, 'refining_process', '炼油工艺', '🛢️', '原油加工核心工艺', 0),
    createSlot(9, 'desulfurization', '脱硫方式', '🧪', '硫化物去除技术', 1),
    createSlot(9, 'blending', '调和方式', '🔀', '产品调和工艺', 2),
  ],
  [
    // 炼油工艺
    createMethod(9, 0, 'refining_process', 'refinery_atmospheric', '常减压蒸馏', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      inputModifiers: [{ goodsId: 4, multiplier: 1.0 }], // 原油
      laborMultiplier: 1.0,
      energyMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 150000,
      description: '基础蒸馏分离工艺',
      effects: ['基础产能'],
    }),
    createMethod(9, 1, 'refining_process', 'refinery_fcc', '催化裂化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      inputModifiers: [{ goodsId: 4, multiplier: 0.95 }],
      laborMultiplier: 1.1,
      energyMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 600000,
      description: '催化裂化提高轻质油收率',
      effects: ['产量+20%', '原料-5%', '人力+10%', '能耗+30%'],
    }),
    createMethod(9, 2, 'refining_process', 'refinery_hydrocracking', '加氢裂化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      inputModifiers: [{ goodsId: 4, multiplier: 0.9 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.15,
      energyMultiplier: 1.5,
      pollutionMultiplier: 0.7,
      requiredLevel: 3,
      switchCost: 1500000,
      description: '加氢处理，产品品质更高',
      effects: ['产量+35%', '品质+20%', '原料-10%', '能耗+50%', '污染-30%'],
    }),
    createMethod(9, 3, 'refining_process', 'refinery_deep', '深度加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      inputModifiers: [{ goodsId: 4, multiplier: 0.85 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.3,
      energyMultiplier: 1.8,
      maintenanceMultiplier: 1.4,
      pollutionMultiplier: 0.6,
      requiredLevel: 4,
      switchCost: 4000000,
      description: '渣油加氢+延迟焦化全流程',
      effects: ['产量+50%', '品质+30%', '原料-15%', '能耗+80%', '维护+40%', '污染-40%'],
    }),
    
    // 脱硫方式
    createMethod(9, 10, 'desulfurization', 'refinery_caustic', '碱洗脱硫', {
      qualityBonus: 0.05,
      laborMultiplier: 1.1,
      pollutionMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 50000,
      description: '碱液洗涤脱硫',
      effects: ['品质+5%', '人力+10%', '污染+10%'],
    }),
    createMethod(9, 11, 'desulfurization', 'refinery_hydro_desulf', '加氢脱硫', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.2,
      pollutionMultiplier: 0.6,
      requiredLevel: 2,
      switchCost: 400000,
      description: '催化加氢脱硫',
      effects: ['产量-2%', '品质+20%', '能耗+20%', '污染-40%'],
    }),
    createMethod(9, 12, 'desulfurization', 'refinery_bio_desulf', '生物脱硫', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.15,
      energyMultiplier: 0.9,
      pollutionMultiplier: 0.4,
      requiredLevel: 3,
      switchCost: 700000,
      description: '微生物辅助脱硫，低能耗环保',
      effects: ['产量-5%', '品质+15%', '能耗-10%', '污染-60%'],
    }),
    
    // 调和方式
    createMethod(9, 20, 'blending', 'refinery_fixed', '固定配方', {
      productionSpeedMultiplier: 1.1,
      qualityBonus: -0.05,
      requiredLevel: 1,
      switchCost: 20000,
      description: '固定比例调和',
      effects: ['速度+10%', '品质-5%'],
    }),
    createMethod(9, 21, 'blending', 'refinery_smart', '智能调和', {
      qualityBonus: 0.1,
      energyMultiplier: 1.05,
      maintenanceMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 150000,
      description: '在线分析+自动调和',
      effects: ['品质+10%', '能耗+5%', '维护+10%'],
    }),
    createMethod(9, 22, 'blending', 'refinery_custom', '定制调和', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 300000,
      description: '按客户需求定制产品规格',
      effects: ['产量-5%', '品质+25%', '人力+20%'],
    }),
  ]
);

// ==================== 化工厂 (ID 10) ====================

const CHEMICAL_PLANT_CONFIG: BuildingMethodConfig = createBuildingConfig(
  10,
  [
    createSlot(10, 'reaction_type', '反应工艺', '⚗️', '化学反应技术', 0),
    createSlot(10, 'catalyst', '催化剂', '💊', '催化剂类型', 1),
    createSlot(10, 'purification', '产品纯化', '✨', '产品分离纯化', 2),
  ],
  [
    // 反应工艺
    createMethod(10, 0, 'reaction_type', 'chem_batch', '间歇反应', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      laborMultiplier: 1.2,
      qualityBonus: 0.1,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 80000,
      description: '批次式反应器，灵活但效率较低',
      effects: ['产量-10%', '品质+10%', '人力+20%', '速度-20%'],
    }),
    createMethod(10, 1, 'reaction_type', 'chem_continuous', '连续反应', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      laborMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 200000,
      description: '连续流反应器，高效稳定',
      effects: ['产量+10%', '人力-20%', '速度+20%'],
    }),
    createMethod(10, 2, 'reaction_type', 'chem_microchannel', '微通道反应', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.7,
      energyMultiplier: 0.8,
      maintenanceMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 800000,
      description: '微反应技术，传质传热效率高',
      effects: ['原料-15%', '品质+25%', '人力-30%', '能耗-20%', '维护+30%'],
    }),
    
    // 催化剂
    createMethod(10, 10, 'catalyst', 'chem_no_catalyst', '无催化', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 10000,
      description: '不使用催化剂，高温高压反应',
      effects: ['原料+10%', '能耗+30%', '速度-30%'],
    }),
    createMethod(10, 11, 'catalyst', 'chem_homogeneous', '均相催化', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      productionSpeedMultiplier: 1.1,
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 100000,
      description: '溶液态催化剂，活性高但分离困难',
      effects: ['原料-10%', '产量+5%', '速度+10%', '污染+20%'],
    }),
    createMethod(10, 12, 'catalyst', 'chem_heterogeneous', '非均相催化', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      productionSpeedMultiplier: 1.15,
      pollutionMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 300000,
      description: '固体催化剂，易分离可回收',
      effects: ['原料-15%', '产量+10%', '速度+15%', '污染-20%'],
    }),
    createMethod(10, 13, 'catalyst', 'chem_enzyme', '酶催化', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.2,
      energyMultiplier: 0.7,
      productionSpeedMultiplier: 0.9,
      pollutionMultiplier: 0.5,
      requiredLevel: 3,
      switchCost: 600000,
      description: '生物酶催化，绿色低能耗',
      effects: ['原料-20%', '品质+20%', '能耗-30%', '速度-10%', '污染-50%'],
    }),
    
    // 产品纯化
    createMethod(10, 20, 'purification', 'chem_simple_sep', '简单分离', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.1,
      energyMultiplier: 0.9,
      requiredLevel: 1,
      switchCost: 30000,
      description: '基础分离，纯度较低',
      effects: ['产量+5%', '品质-10%', '能耗-10%'],
    }),
    createMethod(10, 21, 'purification', 'chem_distillation', '精馏提纯', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.15,
      energyMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 150000,
      description: '多级精馏分离纯化',
      effects: ['产量-5%', '品质+15%', '能耗+30%'],
    }),
    createMethod(10, 22, 'purification', 'chem_membrane', '膜分离', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.92 }],
      qualityBonus: 0.25,
      energyMultiplier: 0.8,
      maintenanceMultiplier: 1.3,
      requiredLevel: 3,
      switchCost: 400000,
      description: '膜技术分离，低能耗高纯度',
      effects: ['产量-8%', '品质+25%', '能耗-20%', '维护+30%'],
    }),
  ]
);

// ==================== 玻璃厂 (ID 11) ====================

const GLASS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  11,
  [
    createSlot(11, 'melting', '熔制工艺', '🔥', '玻璃熔化技术', 0),
    createSlot(11, 'forming', '成型方式', '🏺', '玻璃成型技术', 1),
    createSlot(11, 'finishing', '后处理', '✨', '玻璃后加工', 2),
  ],
  [
    // 熔制工艺
    createMethod(11, 0, 'melting', 'glass_traditional_furnace', '传统熔窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      inputModifiers: [{ goodsId: 9, multiplier: 1.0 }], // 硅石
      energyMultiplier: 1.0,
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 100000,
      description: '燃气/燃油熔窑',
      effects: ['污染+30%'],
    }),
    createMethod(11, 1, 'melting', 'glass_electric_furnace', '全电熔窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      inputModifiers: [{ goodsId: 9, multiplier: 0.95 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.85,
      energyMultiplier: 1.4,
      pollutionMultiplier: 0.5,
      requiredLevel: 2,
      switchCost: 500000,
      description: '电加热熔化，洁净生产',
      effects: ['产量+5%', '原料-5%', '品质+10%', '人力-15%', '能耗+40%', '污染-50%'],
    }),
    createMethod(11, 2, 'melting', 'glass_oxyfuel', '氧燃烧熔窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      inputModifiers: [{ goodsId: 9, multiplier: 0.9 }],
      qualityBonus: 0.15,
      energyMultiplier: 0.85,
      pollutionMultiplier: 0.4,
      requiredLevel: 3,
      switchCost: 900000,
      description: '纯氧助燃，高效节能',
      effects: ['产量+15%', '原料-10%', '品质+15%', '能耗-15%', '污染-60%'],
    }),
    
    // 成型方式
    createMethod(11, 10, 'forming', 'glass_blowing', '吹制', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.4,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 30000,
      description: '人工或机器吹制成型',
      effects: ['产量-15%', '品质+15%', '人力+40%', '速度-30%'],
    }),
    createMethod(11, 11, 'forming', 'glass_float', '浮法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.6,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 400000,
      description: '浮法平板玻璃生产',
      effects: ['产量+20%', '品质+20%', '人力-40%', '速度+30%'],
    }),
    createMethod(11, 12, 'forming', 'glass_pressing', '压制', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      laborMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 150000,
      description: '模具压制成型',
      effects: ['产量+10%', '人力-20%', '速度+20%'],
    }),
    createMethod(11, 13, 'forming', 'glass_drawing', '拉制', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 200000,
      description: '玻璃管棒拉制',
      effects: ['品质+10%', '人力-30%'],
    }),
    
    // 后处理
    createMethod(11, 20, 'finishing', 'glass_no_finish', '无后处理', {
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1,
      switchCost: 5000,
      description: '不做后加工',
      effects: ['速度+10%'],
    }),
    createMethod(11, 21, 'finishing', 'glass_annealing', '退火', {
      qualityBonus: 0.1,
      energyMultiplier: 1.15,
      productionSpeedMultiplier: 0.95,
      requiredLevel: 1,
      switchCost: 50000,
      description: '消除内应力',
      effects: ['品质+10%', '能耗+15%', '速度-5%'],
    }),
    createMethod(11, 22, 'finishing', 'glass_tempering', '钢化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      energyMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 200000,
      description: '强化玻璃强度',
      effects: ['产量-5%', '品质+25%', '能耗+30%'],
    }),
    createMethod(11, 23, 'finishing', 'glass_coating', '镀膜', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.35,
      energyMultiplier: 1.4,
      laborMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 500000,
      description: '功能性镀膜处理',
      effects: ['产量-10%', '品质+35%', '能耗+40%', '人力+20%'],
    }),
  ]
);

// ==================== 纺织厂 (ID 12) ====================

const TEXTILE_MILL_CONFIG: BuildingMethodConfig = createBuildingConfig(
  12,
  [
    createSlot(12, 'spinning', '纺纱工艺', '🧵', '纱线纺制技术', 0),
    createSlot(12, 'weaving', '织造方式', '🪡', '面料织造技术', 1),
    createSlot(12, 'finishing', '后整理', '✨', '面料后加工', 2),
  ],
  [
    // 纺纱工艺
    createMethod(12, 0, 'spinning', 'textile_ring', '环锭纺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 1,
      switchCost: 60000,
      description: '传统环锭纺纱，纱线品质好',
      effects: ['品质+10%', '人力+10%', '速度-10%'],
    }),
    createMethod(12, 1, 'spinning', 'textile_rotor', '气流纺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: -0.05,
      laborMultiplier: 0.7,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 150000,
      description: '高速气流纺，产量高',
      effects: ['产量+20%', '品质-5%', '人力-30%', '速度+30%'],
    }),
    createMethod(12, 2, 'spinning', 'textile_vortex', '涡流纺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      qualityBonus: 0.05,
      laborMultiplier: 0.6,
      energyMultiplier: 1.2,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 2,
      switchCost: 350000,
      description: '喷气涡流纺，高效节能',
      effects: ['产量+30%', '品质+5%', '人力-40%', '能耗+20%', '速度+40%'],
    }),
    createMethod(12, 3, 'spinning', 'textile_compact', '紧密纺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      laborMultiplier: 1.15,
      energyMultiplier: 1.1,
      requiredLevel: 3,
      switchCost: 500000,
      description: '紧密纺纱，高品质纱线',
      effects: ['产量-5%', '品质+25%', '人力+15%', '能耗+10%'],
    }),
    
    // 织造方式
    createMethod(12, 10, 'weaving', 'textile_shuttle', '有梭织机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.05,
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统有梭织机',
      effects: ['产量-20%', '品质+5%', '人力+30%', '速度-30%'],
    }),
    createMethod(12, 11, 'weaving', 'textile_rapier', '剑杆织机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.9,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 180000,
      description: '剑杆无梭织机，通用性强',
      effects: ['产量+10%', '品质+10%', '人力-10%', '速度+10%'],
    }),
    createMethod(12, 12, 'weaving', 'textile_airjet', '喷气织机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      laborMultiplier: 0.6,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 400000,
      description: '喷气高速织机，产量极高',
      effects: ['产量+35%', '人力-40%', '能耗+30%', '速度+50%'],
    }),
    
    // 后整理
    createMethod(12, 20, 'finishing', 'textile_basic', '基础整理', {
      productionSpeedMultiplier: 1.05,
      requiredLevel: 1,
      switchCost: 20000,
      description: '基础定型整理',
      effects: ['速度+5%'],
    }),
    createMethod(12, 21, 'finishing', 'textile_preshrunk', '预缩防皱', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      qualityBonus: 0.15,
      energyMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 100000,
      description: '预缩和防皱处理',
      effects: ['产量-2%', '品质+15%', '能耗+20%'],
    }),
    createMethod(12, 22, 'finishing', 'textile_functional', '功能整理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.3,
      energyMultiplier: 1.4,
      laborMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 300000,
      description: '防水防污抗菌等功能处理',
      effects: ['产量-5%', '品质+30%', '能耗+40%', '人力+20%'],
    }),
  ]
);

// ==================== 食品厂 (ID 13) ====================

const FOOD_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  13,
  [
    createSlot(13, 'processing', '加工工艺', '🍳', '食品加工技术', 0),
    createSlot(13, 'preservation', '保鲜方式', '❄️', '食品保鲜技术', 1),
    createSlot(13, 'quality_grade', '品质等级', '⭐', '产品品质标准', 2),
  ],
  [
    // 加工工艺
    createMethod(13, 0, 'processing', 'food_manual', '手工加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.75 }],
      qualityBonus: 0.15,
      laborMultiplier: 1.6,
      productionSpeedMultiplier: 0.6,
      requiredLevel: 1,
      switchCost: 20000,
      description: '传统手工制作',
      effects: ['产量-25%', '品质+15%', '人力+60%', '速度-40%'],
    }),
    createMethod(13, 1, 'processing', 'food_mechanical', '机械加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 80000,
      description: '机械化生产设备',
      effects: ['基础产能'],
    }),
    createMethod(13, 2, 'processing', 'food_automated', '自动化生产线', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.5,
      energyMultiplier: 1.4,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 2,
      switchCost: 400000,
      description: '全自动化流水线',
      effects: ['产量+30%', '人力-50%', '能耗+40%', '速度+40%'],
    }),
    
    // 保鲜方式
    createMethod(13, 10, 'preservation', 'food_ambient', '常温', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.1,
      energyMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 10000,
      description: '常温存储',
      effects: ['产量+5%', '品质-10%', '能耗-30%'],
    }),
    createMethod(13, 11, 'preservation', 'food_chilled', '冷藏', {
      qualityBonus: 0.1,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.15,
      requiredLevel: 1,
      switchCost: 80000,
      description: '冷藏保鲜',
      effects: ['品质+10%', '能耗+20%', '维护+15%'],
    }),
    createMethod(13, 12, 'preservation', 'food_frozen', '速冻', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.25,
      requiredLevel: 2,
      switchCost: 200000,
      description: '速冻保鲜技术',
      effects: ['产量-2%', '品质+20%', '能耗+50%', '维护+25%'],
    }),
    createMethod(13, 13, 'preservation', 'food_vacuum', '真空包装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.25,
      energyMultiplier: 1.1,
      laborMultiplier: 1.1,
      requiredLevel: 3,
      switchCost: 300000,
      description: '真空/气调包装',
      effects: ['产量-5%', '品质+25%', '能耗+10%', '人力+10%'],
    }),
    
    // 品质等级
    createMethod(13, 20, 'quality_grade', 'food_standard', '普通', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      requiredLevel: 1,
      switchCost: 10000,
      description: '普通消费品级',
      effects: ['产量+10%'],
    }),
    createMethod(13, 21, 'quality_grade', 'food_green', '绿色食品', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.2,
      laborMultiplier: 1.15,
      pollutionMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 150000,
      description: '绿色食品标准',
      effects: ['产量-5%', '品质+20%', '人力+15%', '污染-30%'],
    }),
    createMethod(13, 22, 'quality_grade', 'food_organic', '有机认证', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], // 需要有机原料
      qualityBonus: 0.35,
      laborMultiplier: 1.3,
      pollutionMultiplier: 0.5,
      requiredLevel: 3,
      switchCost: 400000,
      description: '有机产品认证',
      effects: ['产量-15%', '原料+20%', '品质+35%', '人力+30%', '污染-50%'],
    }),
  ]
);

// ==================== 水泥厂 (ID 14) ====================

const CEMENT_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  14,
  [
    createSlot(14, 'kiln_type', '窑型', '🔥', '水泥烧成窑类型', 0),
    createSlot(14, 'grinding', '粉磨方式', '⚙️', '水泥粉磨技术', 1),
    createSlot(14, 'additive', '掺合料', '➕', '水泥添加剂', 2),
  ],
  [
    // 窑型
    createMethod(14, 0, 'kiln_type', 'cement_shaft', '立窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: -0.1,
      laborMultiplier: 1.4,
      energyMultiplier: 1.2,
      pollutionMultiplier: 1.5,
      requiredLevel: 1,
      switchCost: 50000,
      description: '传统立窑，规模小',
      effects: ['产量-20%', '品质-10%', '人力+40%', '能耗+20%', '污染+50%'],
    }),
    createMethod(14, 1, 'kiln_type', 'cement_dry_rotary', '干法回转窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 1.0,
      pollutionMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 300000,
      description: '新型干法回转窑',
      effects: ['基础产能'],
    }),
    createMethod(14, 2, 'kiln_type', 'cement_precalciner', '预分解窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.7,
      energyMultiplier: 0.85,
      pollutionMultiplier: 0.8,
      requiredLevel: 3,
      switchCost: 800000,
      description: '新型干法预分解窑，效率最高',
      effects: ['产量+25%', '品质+10%', '人力-30%', '能耗-15%', '污染-20%'],
    }),
    
    // 粉磨方式
    createMethod(14, 10, 'grinding', 'cement_ball_mill', '球磨机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 80000,
      description: '传统球磨机',
      effects: ['能耗+20%'],
    }),
    createMethod(14, 11, 'grinding', 'cement_vertical_mill', '立磨', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 0.8,
      maintenanceMultiplier: 1.15,
      requiredLevel: 2,
      switchCost: 300000,
      description: '立式辊磨机，节能高效',
      effects: ['产量+10%', '能耗-20%', '维护+15%'],
    }),
    createMethod(14, 12, 'grinding', 'cement_combined', '辊压机联合粉磨', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.1,
      energyMultiplier: 0.7,
      maintenanceMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 500000,
      description: '辊压机+球磨机联合粉磨',
      effects: ['产量+20%', '品质+10%', '能耗-30%', '维护+20%'],
    }),
    
    // 掺合料
    createMethod(14, 20, 'additive', 'cement_pure', '纯水泥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.1,
      requiredLevel: 1,
      switchCost: 10000,
      description: '不添加混合材',
      effects: ['产量-5%', '品质+10%'],
    }),
    createMethod(14, 21, 'additive', 'cement_slag', '�ite添加', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      pollutionMultiplier: 0.85,
      requiredLevel: 1,
      switchCost: 50000,
      description: '添加矿渣等工业废料',
      effects: ['产量+15%', '原料-10%', '污染-15%'],
    }),
    createMethod(14, 22, 'additive', 'cement_flyash', '粉煤灰添加', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: -0.05,
      pollutionMultiplier: 0.75,
      requiredLevel: 2,
      switchCost: 80000,
      description: '大量添加粉煤灰',
      effects: ['产量+20%', '原料-15%', '品质-5%', '污染-25%'],
    }),
  ]
);

// ==================== 铝冶炼厂 (ID 15) ====================

const ALUMINUM_SMELTER_CONFIG: BuildingMethodConfig = createBuildingConfig(
  15,
  [
    createSlot(15, 'electrolysis', '电解工艺', '⚡', '铝电解技术', 0),
    createSlot(15, 'carbon', '炭素工艺', '⬛', '阳极生产方式', 1),
  ],
  [
    // 电解工艺
    createMethod(15, 0, 'electrolysis', 'alu_conventional_cell', '普通电解槽', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      inputModifiers: [{ goodsId: 2, multiplier: 1.0 }], // 铝土矿
      energyMultiplier: 1.2,
      pollutionMultiplier: 1.3,
      requiredLevel: 1,
      switchCost: 200000,
      description: '传统电解槽',
      effects: ['能耗+20%', '污染+30%'],
    }),
    createMethod(15, 1, 'electrolysis', 'alu_large_prebake', '大型预焙槽', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      inputModifiers: [{ goodsId: 2, multiplier: 0.95 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.8,
      energyMultiplier: 0.9,
      pollutionMultiplier: 0.8,
      requiredLevel: 2,
      switchCost: 800000,
      description: '大型预焙阳极电解槽',
      effects: ['产量+20%', '原料-5%', '品质+10%', '人力-20%', '能耗-10%', '污染-20%'],
    }),
    createMethod(15, 2, 'electrolysis', 'alu_inert_anode', '惰性阳极', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      inputModifiers: [{ goodsId: 2, multiplier: 0.9 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.6,
      energyMultiplier: 0.75,
      pollutionMultiplier: 0.3,
      maintenanceMultiplier: 1.4,
      requiredLevel: 4,
      switchCost: 3000000,
      description: '惰性阳极技术，无碳排放',
      effects: ['产量+10%', '原料-10%', '品质+20%', '人力-40%', '能耗-25%', '污染-70%', '维护+40%'],
    }),
    
    // 炭素工艺
    createMethod(15, 10, 'carbon', 'alu_self_bake', '自焙阳极', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: -0.1,
      energyMultiplier: 1.1,
      pollutionMultiplier: 1.4,
      requiredLevel: 1,
      switchCost: 50000,
      description: '连续自焙阳极',
      effects: ['产量-5%', '品质-10%', '能耗+10%', '污染+40%'],
    }),
    createMethod(15, 11, 'carbon', 'alu_prebake', '预焙阳极', {
      qualityBonus: 0.1,
      pollutionMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 200000,
      description: '预先焙烧阳极块',
      effects: ['品质+10%', '污染-30%'],
    }),
    createMethod(15, 12, 'carbon', 'alu_inert', '惰性阳极材料', {
      qualityBonus: 0.2,
      maintenanceMultiplier: 1.5,
      pollutionMultiplier: 0.2,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '金属合金惰性阳极',
      effects: ['品质+20%', '维护+50%', '污染-80%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const PROCESSING_CONFIGS: BuildingMethodConfig[] = [
  STEEL_MILL_CONFIG,
  REFINERY_CONFIG,
  CHEMICAL_PLANT_CONFIG,
  GLASS_FACTORY_CONFIG,
  TEXTILE_MILL_CONFIG,
  FOOD_FACTORY_CONFIG,
  CEMENT_FACTORY_CONFIG,
  ALUMINUM_SMELTER_CONFIG,
];

/**
 * 注册所有加工类建筑的生产方式
 */
export function registerProcessingMethods(): void {
  registerBuildingConfigs(PROCESSING_CONFIGS);
}