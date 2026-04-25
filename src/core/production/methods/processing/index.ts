/**
 * 加工类建筑专属生产方式
 * 重构版本：适配新的12种加工建筑（ID 15-26）
 * 
 * 建筑列表：
 * 15: 钢铁厂         16: 有色金属冶炼厂    17: 炼油厂      18: 化工厂
 * 19: 玻璃厂         20: 水泥厂            21: 造纸厂      22: 纺织厂
 * 23: 食品厂         24: 肉类加工厂        25: 乳品厂      26: 建材厂
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';
import { GoodsId } from '../../../../data/goods';
import { BuildingId } from '../../../../data/buildings';

// ==================== 钢铁厂 (ID 15) ====================
const STEEL_MILL_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.STEEL_MILL,
  [
    createSlot(15, 'steelmaking', '炼钢工艺', '🔥', '钢铁冶炼核心技术', 0),
    createSlot(15, 'heat_treatment', '热处理', '♨️', '钢材热处理工艺', 1),
    createSlot(15, 'environmental', '环保措施', '🌿', '废气废水处理', 2),
  ],
  [
    // 炼钢工艺
    createMethod(15, 0, 'steelmaking', 'steel_bf_bof', '高炉-转炉法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      pollutionMultiplier: 1.3,
      requiredLevel: 1, switchCost: 100000,
      description: '传统高炉炼铁+转炉炼钢',
      effects: ['污染+30%'],
    }),
    createMethod(15, 1, 'steelmaking', 'steel_eaf', '电弧炉法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      inputModifiers: [{ goodsId: GoodsId.IRON_ORE, multiplier: 0.7 }, { goodsId: GoodsId.COAL, multiplier: 0.3 }],
      laborMultiplier: 0.8, energyMultiplier: 1.5, pollutionMultiplier: 0.7,
      requiredLevel: 2, switchCost: 500000,
      description: '电弧炉炼钢，可使用废钢',
      effects: ['产量+10%', '原料-30%', '人力-20%', '能耗+50%', '污染-30%'],
    }),
    createMethod(15, 2, 'steelmaking', 'steel_hydrogen', '氢冶金(绿钢)', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      inputModifiers: [{ goodsId: GoodsId.COAL, multiplier: 0.1 }],
      qualityBonus: 0.15, laborMultiplier: 0.7, energyMultiplier: 1.8, pollutionMultiplier: 0.2,
      requiredLevel: 3, switchCost: 3000000,
      description: '氢气还原，近零碳排放',
      effects: ['产量+5%', '品质+15%', '煤耗-90%', '人力-30%', '能耗+80%', '污染-80%'],
    }),
    // 热处理
    createMethod(15, 10, 'heat_treatment', 'steel_no_treatment', '无处理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }], qualityBonus: -0.1,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1, switchCost: 10000,
      description: '不进行热处理直接出厂',
      effects: ['产量+5%', '品质-10%', '速度+10%'],
    }),
    createMethod(15, 11, 'heat_treatment', 'steel_normalizing', '正火', {
      qualityBonus: 0.1, energyMultiplier: 1.15,
      requiredLevel: 2, switchCost: 50000,
      description: '消除内应力',
      effects: ['品质+10%', '能耗+15%'],
    }),
    createMethod(15, 12, 'heat_treatment', 'steel_quench_temper', '淬火回火', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.25,
      energyMultiplier: 1.3, laborMultiplier: 1.15,
      requiredLevel: 3, switchCost: 150000,
      description: '提高硬度和强度',
      effects: ['产量-5%', '品质+25%', '能耗+30%', '人力+15%'],
    }),
    // 环保措施
    createMethod(15, 20, 'environmental', 'steel_basic_dust', '基础除尘', {
      maintenanceMultiplier: 1.1, pollutionMultiplier: 0.8,
      requiredLevel: 1, switchCost: 50000,
      description: '布袋除尘器',
      effects: ['维护+10%', '污染-20%'],
    }),
    createMethod(15, 21, 'environmental', 'steel_flue_gas', '烟气净化', {
      maintenanceMultiplier: 1.25, energyMultiplier: 1.1, pollutionMultiplier: 0.5,
      requiredLevel: 2, switchCost: 200000,
      description: '脱硫脱硝+除尘系统',
      effects: ['维护+25%', '能耗+10%', '污染-50%'],
    }),
    createMethod(15, 22, 'environmental', 'steel_zero_emission', '零排放系统', {
      maintenanceMultiplier: 1.5, energyMultiplier: 1.2, laborMultiplier: 1.1, pollutionMultiplier: 0.15,
      byproductChance: 0.1, byproductGoodsId: GoodsId.CHEMICALS, byproductAmount: 5,
      requiredLevel: 3, switchCost: 1000000,
      description: '废气废水零排放，副产品回收',
      effects: ['维护+50%', '能耗+20%', '人力+10%', '污染-85%', '副产品几率10%'],
    }),
  ]
);

// ==================== 有色金属冶炼厂 (ID 16) ====================
const NON_FERROUS_SMELTER_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.NON_FERROUS_SMELTER,
  [
    createSlot(16, 'smelting_process', '冶炼工艺', '🔥', '金属冶炼技术', 0),
    createSlot(16, 'refining', '精炼方式', '✨', '金属精炼技术', 1),
    createSlot(16, 'waste_treatment', '废料处理', '♻️', '废料回收处理', 2),
  ],
  [
    createMethod(16, 0, 'smelting_process', 'nf_pyrometallurgy', '火法冶金', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 1.2, pollutionMultiplier: 1.3,
      requiredLevel: 1, switchCost: 150000,
      description: '高温熔炼',
      effects: ['能耗+20%', '污染+30%'],
    }),
    createMethod(16, 1, 'smelting_process', 'nf_hydrometallurgy', '湿法冶金', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.1,
      laborMultiplier: 1.1, energyMultiplier: 0.9, pollutionMultiplier: 0.8,
      requiredLevel: 2, switchCost: 400000,
      description: '溶液浸出提取',
      effects: ['产量+10%', '品质+10%', '人力+10%', '能耗-10%', '污染-20%'],
    }),
    createMethod(16, 2, 'smelting_process', 'nf_electrometallurgy', '电冶金', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.2,
      laborMultiplier: 0.7, energyMultiplier: 1.5, pollutionMultiplier: 0.5,
      requiredLevel: 3, switchCost: 800000,
      description: '电解精炼',
      effects: ['产量+20%', '品质+20%', '人力-30%', '能耗+50%', '污染-50%'],
    }),
    createMethod(16, 10, 'refining', 'nf_crude', '粗炼', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: -0.1,
      productionSpeedMultiplier: 1.15,
      requiredLevel: 1, switchCost: 30000,
      description: '粗炼金属直出',
      effects: ['产量+10%', '品质-10%', '速度+15%'],
    }),
    createMethod(16, 11, 'refining', 'nf_standard', '标准精炼', {
      qualityBonus: 0.1, energyMultiplier: 1.15,
      requiredLevel: 2, switchCost: 100000,
      description: '标准精炼流程',
      effects: ['品质+10%', '能耗+15%'],
    }),
    createMethod(16, 12, 'refining', 'nf_high_purity', '高纯度精炼', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.3,
      energyMultiplier: 1.4, laborMultiplier: 1.2,
      requiredLevel: 3, switchCost: 300000,
      description: '多次精炼获得高纯度产品',
      effects: ['产量-15%', '品质+30%', '能耗+40%', '人力+20%'],
    }),
    createMethod(16, 20, 'waste_treatment', 'nf_basic_waste', '基础处理', {
      pollutionMultiplier: 1.0,
      requiredLevel: 1, switchCost: 20000,
      description: '基本废料处理',
      effects: ['基础处理'],
    }),
    createMethod(16, 21, 'waste_treatment', 'nf_recycling', '废料回收', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      pollutionMultiplier: 0.7, maintenanceMultiplier: 1.15,
      requiredLevel: 2, switchCost: 150000,
      description: '废料再利用',
      effects: ['原料-10%', '污染-30%', '维护+15%'],
    }),
    createMethod(16, 22, 'waste_treatment', 'nf_zero_waste', '零废弃', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      pollutionMultiplier: 0.3, maintenanceMultiplier: 1.4,
      byproductChance: 0.15, byproductGoodsId: GoodsId.CHEMICALS, byproductAmount: 3,
      requiredLevel: 3, switchCost: 500000,
      description: '全流程废料回收',
      effects: ['原料-20%', '污染-70%', '维护+40%', '副产品几率15%'],
    }),
  ]
);

// ==================== 炼油厂 (ID 17) ====================
const REFINERY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.REFINERY,
  [
    createSlot(17, 'refining_process', '炼油工艺', '🛢️', '原油加工核心工艺', 0),
    createSlot(17, 'desulfurization', '脱硫方式', '🧪', '硫化物去除技术', 1),
    createSlot(17, 'product_mix', '产品结构', '📊', '产品产出比例', 2),
  ],
  [
    createMethod(17, 0, 'refining_process', 'refinery_atmospheric', '常减压蒸馏', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1, switchCost: 150000,
      description: '基础蒸馏分离工艺',
      effects: ['基础产能'],
    }),
    createMethod(17, 1, 'refining_process', 'refinery_fcc', '催化裂化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      inputModifiers: [{ goodsId: GoodsId.CRUDE_OIL, multiplier: 0.95 }],
      laborMultiplier: 1.1, energyMultiplier: 1.3,
      requiredLevel: 2, switchCost: 600000,
      description: '催化裂化提高轻质油收率',
      effects: ['产量+20%', '原料-5%', '人力+10%', '能耗+30%'],
    }),
    createMethod(17, 2, 'refining_process', 'refinery_hydrocracking', '加氢裂化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      inputModifiers: [{ goodsId: GoodsId.CRUDE_OIL, multiplier: 0.9 }],
      qualityBonus: 0.2, laborMultiplier: 1.15, energyMultiplier: 1.5, pollutionMultiplier: 0.7,
      requiredLevel: 3, switchCost: 1500000,
      description: '加氢处理，产品品质更高',
      effects: ['产量+35%', '品质+20%', '原料-10%', '能耗+50%', '污染-30%'],
    }),
    createMethod(17, 10, 'desulfurization', 'refinery_caustic', '碱洗脱硫', {
      qualityBonus: 0.05, laborMultiplier: 1.1, pollutionMultiplier: 1.1,
      requiredLevel: 1, switchCost: 50000,
      description: '碱液洗涤脱硫',
      effects: ['品质+5%', '人力+10%', '污染+10%'],
    }),
    createMethod(17, 11, 'desulfurization', 'refinery_hydro_desulf', '加氢脱硫', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }], qualityBonus: 0.2,
      energyMultiplier: 1.2, pollutionMultiplier: 0.6,
      requiredLevel: 2, switchCost: 400000,
      description: '催化加氢脱硫',
      effects: ['产量-2%', '品质+20%', '能耗+20%', '污染-40%'],
    }),
    createMethod(17, 12, 'desulfurization', 'refinery_bio_desulf', '生物脱硫', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.15,
      energyMultiplier: 0.9, pollutionMultiplier: 0.4,
      requiredLevel: 3, switchCost: 700000,
      description: '微生物辅助脱硫',
      effects: ['产量-5%', '品质+15%', '能耗-10%', '污染-60%'],
    }),
    createMethod(17, 20, 'product_mix', 'refinery_fuel_focus', '燃油为主', {
      outputModifiers: [{ goodsId: GoodsId.FUEL, multiplier: 1.3 }, { goodsId: GoodsId.PLASTIC, multiplier: 0.7 }],
      requiredLevel: 1, switchCost: 80000,
      description: '侧重生产燃油',
      effects: ['燃油+30%', '塑料-30%'],
    }),
    createMethod(17, 21, 'product_mix', 'refinery_balanced', '均衡生产', {
      requiredLevel: 1, switchCost: 50000,
      description: '燃油和塑料均衡产出',
      effects: ['均衡产出'],
    }),
    createMethod(17, 22, 'product_mix', 'refinery_plastic_focus', '化工品为主', {
      outputModifiers: [{ goodsId: GoodsId.FUEL, multiplier: 0.7 }, { goodsId: GoodsId.PLASTIC, multiplier: 1.4 }],
      energyMultiplier: 1.1,
      requiredLevel: 2, switchCost: 120000,
      description: '侧重生产塑料等化工品',
      effects: ['燃油-30%', '塑料+40%', '能耗+10%'],
    }),
  ]
);

// ==================== 化工厂 (ID 18) ====================
const CHEMICAL_PLANT_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.CHEMICAL_PLANT,
  [
    createSlot(18, 'reaction_type', '反应工艺', '⚗️', '化学反应技术', 0),
    createSlot(18, 'catalyst', '催化剂', '💊', '催化剂类型', 1),
    createSlot(18, 'safety', '安全等级', '⚠️', '生产安全措施', 2),
  ],
  [
    createMethod(18, 0, 'reaction_type', 'chem_batch', '间歇反应', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.1,
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.8,
      requiredLevel: 1, switchCost: 80000,
      description: '批次式反应器',
      effects: ['产量-10%', '品质+10%', '人力+20%', '速度-20%'],
    }),
    createMethod(18, 1, 'reaction_type', 'chem_continuous', '连续反应', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      laborMultiplier: 0.8, productionSpeedMultiplier: 1.2,
      requiredLevel: 2, switchCost: 200000,
      description: '连续流反应器',
      effects: ['产量+10%', '人力-20%', '速度+20%'],
    }),
    createMethod(18, 2, 'reaction_type', 'chem_microchannel', '微通道反应', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.25,
      laborMultiplier: 0.7, energyMultiplier: 0.8, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 800000,
      description: '微反应技术',
      effects: ['原料-15%', '品质+25%', '人力-30%', '能耗-20%', '维护+30%'],
    }),
    createMethod(18, 10, 'catalyst', 'chem_no_catalyst', '无催化', {
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 1.3, productionSpeedMultiplier: 0.7,
      requiredLevel: 1, switchCost: 10000,
      description: '高温高压反应',
      effects: ['原料+10%', '能耗+30%', '速度-30%'],
    }),
    createMethod(18, 11, 'catalyst', 'chem_heterogeneous', '非均相催化', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      productionSpeedMultiplier: 1.15, pollutionMultiplier: 0.8,
      requiredLevel: 2, switchCost: 300000,
      description: '固体催化剂',
      effects: ['原料-15%', '产量+10%', '速度+15%', '污染-20%'],
    }),
    createMethod(18, 12, 'catalyst', 'chem_enzyme', '酶催化', {
      inputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.2,
      energyMultiplier: 0.7, productionSpeedMultiplier: 0.9, pollutionMultiplier: 0.5,
      requiredLevel: 3, switchCost: 600000,
      description: '生物酶催化',
      effects: ['原料-20%', '品质+20%', '能耗-30%', '速度-10%', '污染-50%'],
    }),
    createMethod(18, 20, 'safety', 'chem_basic_safety', '基础安全', {
      requiredLevel: 1, switchCost: 20000,
      description: '满足基本安全要求',
      effects: ['基础安全'],
    }),
    createMethod(18, 21, 'safety', 'chem_enhanced_safety', '强化安全', {
      laborMultiplier: 1.1, maintenanceMultiplier: 1.2, productionSpeedMultiplier: 1.05,
      requiredLevel: 2, switchCost: 100000,
      description: '强化安全措施',
      effects: ['人力+10%', '维护+20%', '速度+5%'],
    }),
    createMethod(18, 22, 'safety', 'chem_intrinsic_safety', '本质安全', {
      laborMultiplier: 1.05, maintenanceMultiplier: 1.4, productionSpeedMultiplier: 1.1, qualityBonus: 0.05,
      requiredLevel: 3, switchCost: 400000,
      description: '本质安全设计',
      effects: ['人力+5%', '维护+40%', '速度+10%', '品质+5%'],
    }),
  ]
);

// ==================== 玻璃厂 (ID 19) ====================
const GLASS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.GLASS_FACTORY,
  [
    createSlot(19, 'melting', '熔制工艺', '🔥', '玻璃熔化技术', 0),
    createSlot(19, 'forming', '成型方式', '🏺', '玻璃成型技术', 1),
    createSlot(19, 'finishing', '后处理', '✨', '玻璃后加工', 2),
  ],
  [
    createMethod(19, 0, 'melting', 'glass_traditional', '传统熔窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      pollutionMultiplier: 1.3,
      requiredLevel: 1, switchCost: 100000,
      description: '燃气熔窑',
      effects: ['污染+30%'],
    }),
    createMethod(19, 1, 'melting', 'glass_electric', '全电熔窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }], qualityBonus: 0.1,
      laborMultiplier: 0.85, energyMultiplier: 1.4, pollutionMultiplier: 0.5,
      requiredLevel: 2, switchCost: 500000,
      description: '电加热熔化',
      effects: ['产量+5%', '品质+10%', '人力-15%', '能耗+40%', '污染-50%'],
    }),
    createMethod(19, 2, 'melting', 'glass_oxyfuel', '氧燃烧熔窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.15,
      energyMultiplier: 0.85, pollutionMultiplier: 0.4,
      requiredLevel: 3, switchCost: 900000,
      description: '纯氧助燃',
      effects: ['产量+15%', '品质+15%', '能耗-15%', '污染-60%'],
    }),
    createMethod(19, 10, 'forming', 'glass_blowing', '吹制', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.15,
      laborMultiplier: 1.4, productionSpeedMultiplier: 0.7,
      requiredLevel: 1, switchCost: 30000,
      description: '吹制成型',
      effects: ['产量-15%', '品质+15%', '人力+40%', '速度-30%'],
    }),
    createMethod(19, 11, 'forming', 'glass_float', '浮法', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.2,
      laborMultiplier: 0.6, productionSpeedMultiplier: 1.3,
      requiredLevel: 2, switchCost: 400000,
      description: '浮法平板玻璃',
      effects: ['产量+20%', '品质+20%', '人力-40%', '速度+30%'],
    }),
    createMethod(19, 12, 'forming', 'glass_pressing', '压制', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      laborMultiplier: 0.8, productionSpeedMultiplier: 1.2,
      requiredLevel: 2, switchCost: 150000,
      description: '模具压制成型',
      effects: ['产量+10%', '人力-20%', '速度+20%'],
    }),
    createMethod(19, 20, 'finishing', 'glass_no_finish', '无后处理', {
      productionSpeedMultiplier: 1.1,
      requiredLevel: 1, switchCost: 5000,
      description: '不做后加工',
      effects: ['速度+10%'],
    }),
    createMethod(19, 21, 'finishing', 'glass_tempering', '钢化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.25,
      energyMultiplier: 1.3,
      requiredLevel: 2, switchCost: 200000,
      description: '强化玻璃强度',
      effects: ['产量-5%', '品质+25%', '能耗+30%'],
    }),
    createMethod(19, 22, 'finishing', 'glass_coating', '镀膜', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.35,
      energyMultiplier: 1.4, laborMultiplier: 1.2,
      requiredLevel: 3, switchCost: 500000,
      description: '功能性镀膜',
      effects: ['产量-10%', '品质+35%', '能耗+40%', '人力+20%'],
    }),
  ]
);

// ==================== 水泥厂 (ID 20) ====================
const CEMENT_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.CEMENT_FACTORY,
  [
    createSlot(20, 'kiln_type', '窑型', '🔥', '水泥烧成窑类型', 0),
    createSlot(20, 'grinding', '粉磨方式', '⚙️', '水泥粉磨技术', 1),
    createSlot(20, 'additive', '掺合料', '➕', '水泥添加剂', 2),
  ],
  [
    createMethod(20, 0, 'kiln_type', 'cement_dry_rotary', '干法回转窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1, switchCost: 300000,
      description: '新型干法回转窑',
      effects: ['基础产能'],
    }),
    createMethod(20, 1, 'kiln_type', 'cement_precalciner', '预分解窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }], qualityBonus: 0.1,
      laborMultiplier: 0.7, energyMultiplier: 0.85, pollutionMultiplier: 0.8,
      requiredLevel: 2, switchCost: 800000,
      description: '预分解窑',
      effects: ['产量+25%', '品质+10%', '人力-30%', '能耗-15%', '污染-20%'],
    }),
    createMethod(20, 2, 'kiln_type', 'cement_eco_kiln', '低碳窑', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.15,
      laborMultiplier: 0.6, energyMultiplier: 0.7, pollutionMultiplier: 0.4, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 1500000,
      description: '低碳环保窑型',
      effects: ['产量+15%', '品质+15%', '人力-40%', '能耗-30%', '污染-60%', '维护+30%'],
    }),
    createMethod(20, 10, 'grinding', 'cement_ball_mill', '球磨机', {
      energyMultiplier: 1.2,
      requiredLevel: 1, switchCost: 80000,
      description: '传统球磨机',
      effects: ['能耗+20%'],
    }),
    createMethod(20, 11, 'grinding', 'cement_vertical_mill', '立磨', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 0.8, maintenanceMultiplier: 1.15,
      requiredLevel: 2, switchCost: 300000,
      description: '立式辊磨机',
      effects: ['产量+10%', '能耗-20%', '维护+15%'],
    }),
    createMethod(20, 12, 'grinding', 'cement_combined', '联合粉磨', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.1,
      energyMultiplier: 0.7, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 500000,
      description: '辊压机+球磨机联合',
      effects: ['产量+20%', '品质+10%', '能耗-30%', '维护+20%'],
    }),
    createMethod(20, 20, 'additive', 'cement_pure', '纯水泥', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.1,
      requiredLevel: 1, switchCost: 10000,
      description: '不添加混合材',
      effects: ['产量-5%', '品质+10%'],
    }),
    createMethod(20, 21, 'additive', 'cement_slag', '�ite添加', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      pollutionMultiplier: 0.85,
      requiredLevel: 2, switchCost: 50000,
      description: '添加矿渣等工业废料',
      effects: ['产量+15%', '原料-10%', '污染-15%'],
    }),
    createMethod(20, 22, 'additive', 'cement_flyash', '粉煤灰添加', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: -0.05, pollutionMultiplier: 0.75,
      requiredLevel: 2, switchCost: 80000,
      description: '大量添加粉煤灰',
      effects: ['产量+20%', '原料-15%', '品质-5%', '污染-25%'],
    }),
  ]
);

// ==================== 造纸厂 (ID 21) ====================
const PAPER_MILL_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.PAPER_MILL,
  [
    createSlot(21, 'pulping', '制浆工艺', '🌲', '纸浆制作技术', 0),
    createSlot(21, 'papermaking', '造纸方式', '📄', '纸张成型技术', 1),
    createSlot(21, 'bleaching', '漂白工艺', '✨', '纸浆漂白方法', 2),
  ],
  [
    createMethod(21, 0, 'pulping', 'paper_mechanical', '机械制浆', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: -0.1,
      energyMultiplier: 1.3, pollutionMultiplier: 0.8,
      requiredLevel: 1, switchCost: 80000,
      description: '机械研磨制浆',
      effects: ['产量+10%', '品质-10%', '能耗+30%', '污染-20%'],
    }),
    createMethod(21, 1, 'pulping', 'paper_chemical', '化学制浆', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], qualityBonus: 0.15,
      energyMultiplier: 1.0, pollutionMultiplier: 1.3,
      requiredLevel: 1, switchCost: 120000,
      description: '化学蒸煮制浆',
      effects: ['品质+15%', '污染+30%'],
    }),
    createMethod(21, 2, 'pulping', 'paper_recycled', '废纸回收制浆', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: -0.05,
      inputModifiers: [{ goodsId: GoodsId.TIMBER, multiplier: 0.5 }],
      energyMultiplier: 0.9, pollutionMultiplier: 0.6,
      requiredLevel: 2, switchCost: 250000,
      description: '废纸回收再造',
      effects: ['产量+20%', '品质-5%', '木材-50%', '能耗-10%', '污染-40%'],
    }),
    createMethod(21, 10, 'papermaking', 'paper_basic', '基础造纸', {
      requiredLevel: 1, switchCost: 50000,
      description: '基础造纸工艺',
      effects: ['基础产能'],
    }),
    createMethod(21, 11, 'papermaking', 'paper_high_speed', '高速造纸', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.7, energyMultiplier: 1.2, productionSpeedMultiplier: 1.4,
      requiredLevel: 2, switchCost: 400000,
      description: '高速造纸机',
      effects: ['产量+30%', '人力-30%', '能耗+20%', '速度+40%'],
    }),
    createMethod(21, 12, 'papermaking', 'paper_precision', '精密造纸', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.3,
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.8,
      requiredLevel: 3, switchCost: 600000,
      description: '高端特种纸生产',
      effects: ['产量-10%', '品质+30%', '人力+20%', '速度-20%'],
    }),
    createMethod(21, 20, 'bleaching', 'paper_no_bleach', '不漂白', {
      qualityBonus: -0.1, pollutionMultiplier: 0.7,
      requiredLevel: 1, switchCost: 10000,
      description: '本色纸浆不漂白',
      effects: ['品质-10%', '污染-30%'],
    }),
    createMethod(21, 21, 'bleaching', 'paper_chlorine', '氯漂白', {
      qualityBonus: 0.1, pollutionMultiplier: 1.4,
      requiredLevel: 1, switchCost: 50000,
      description: '传统氯漂白',
      effects: ['品质+10%', '污染+40%'],
    }),
    createMethod(21, 22, 'bleaching', 'paper_ecf', 'ECF无氯漂白', {
      qualityBonus: 0.15, energyMultiplier: 1.1, pollutionMultiplier: 0.6,
      requiredLevel: 2, switchCost: 200000,
      description: '二氧化氯漂白',
      effects: ['品质+15%', '能耗+10%', '污染-40%'],
    }),
  ]
);

// ==================== 纺织厂 (ID 22) ====================
const TEXTILE_MILL_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.TEXTILE_MILL,
  [
    createSlot(22, 'spinning', '纺纱工艺', '🧵', '纱线纺制技术', 0),
    createSlot(22, 'weaving', '织造方式', '🪡', '面料织造技术', 1),
    createSlot(22, 'finishing', '后整理', '✨', '面料后加工', 2),
  ],
  [
    createMethod(22, 0, 'spinning', 'textile_ring', '环锭纺', {
      qualityBonus: 0.1, laborMultiplier: 1.1, productionSpeedMultiplier: 0.9,
      requiredLevel: 1, switchCost: 60000,
      description: '传统环锭纺纱',
      effects: ['品质+10%', '人力+10%', '速度-10%'],
    }),
    createMethod(22, 1, 'spinning', 'textile_rotor', '气流纺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: -0.05,
      laborMultiplier: 0.7, productionSpeedMultiplier: 1.3,
      requiredLevel: 2, switchCost: 150000,
      description: '高速气流纺',
      effects: ['产量+20%', '品质-5%', '人力-30%', '速度+30%'],
    }),
    createMethod(22, 2, 'spinning', 'textile_vortex', '涡流纺', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: 0.05,
      laborMultiplier: 0.6, energyMultiplier: 1.2, productionSpeedMultiplier: 1.4,
      requiredLevel: 3, switchCost: 350000,
      description: '喷气涡流纺',
      effects: ['产量+30%', '品质+5%', '人力-40%', '能耗+20%', '速度+40%'],
    }),
    createMethod(22, 10, 'weaving', 'textile_shuttle', '有梭织机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.05,
      laborMultiplier: 1.3, productionSpeedMultiplier: 0.7,
      requiredLevel: 1, switchCost: 30000,
      description: '传统有梭织机',
      effects: ['产量-20%', '品质+5%', '人力+30%', '速度-30%'],
    }),
    createMethod(22, 11, 'weaving', 'textile_rapier', '剑杆织机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.1,
      laborMultiplier: 0.9, productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 180000,
      description: '剑杆无梭织机',
      effects: ['产量+10%', '品质+10%', '人力-10%', '速度+10%'],
    }),
    createMethod(22, 12, 'weaving', 'textile_airjet', '喷气织机', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }],
      laborMultiplier: 0.6, energyMultiplier: 1.3, productionSpeedMultiplier: 1.5,
      requiredLevel: 3, switchCost: 400000,
      description: '喷气高速织机',
      effects: ['产量+35%', '人力-40%', '能耗+30%', '速度+50%'],
    }),
    createMethod(22, 20, 'finishing', 'textile_basic', '基础整理', {
      productionSpeedMultiplier: 1.05,
      requiredLevel: 1, switchCost: 20000,
      description: '基础定型整理',
      effects: ['速度+5%'],
    }),
    createMethod(22, 21, 'finishing', 'textile_preshrunk', '预缩防皱', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }], qualityBonus: 0.15,
      energyMultiplier: 1.2,
      requiredLevel: 2, switchCost: 100000,
      description: '预缩和防皱处理',
      effects: ['产量-2%', '品质+15%', '能耗+20%'],
    }),
    createMethod(22, 22, 'finishing', 'textile_functional', '功能整理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.3,
      energyMultiplier: 1.4, laborMultiplier: 1.2,
      requiredLevel: 3, switchCost: 300000,
      description: '防水防污抗菌等功能处理',
      effects: ['产量-5%', '品质+30%', '能耗+40%', '人力+20%'],
    }),
  ]
);

// ==================== 食品厂 (ID 23) ====================
const FOOD_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.FOOD_FACTORY,
  [
    createSlot(23, 'processing', '加工工艺', '🍳', '食品加工技术', 0),
    createSlot(23, 'preservation', '保鲜方式', '❄️', '食品保鲜技术', 1),
    createSlot(23, 'quality_grade', '品质等级', '⭐', '产品品质标准', 2),
  ],
  [
    createMethod(23, 0, 'processing', 'food_mechanical', '机械加工', {
      requiredLevel: 1, switchCost: 80000,
      description: '机械化生产设备',
      effects: ['基础产能'],
    }),
    createMethod(23, 1, 'processing', 'food_automated', '自动化生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.5, energyMultiplier: 1.4, productionSpeedMultiplier: 1.4,
      requiredLevel: 2, switchCost: 400000,
      description: '全自动化流水线',
      effects: ['产量+30%', '人力-50%', '能耗+40%', '速度+40%'],
    }),
    createMethod(23, 2, 'processing', 'food_intelligent', '智能加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.15,
      laborMultiplier: 0.3, energyMultiplier: 1.5, maintenanceMultiplier: 1.3, productionSpeedMultiplier: 1.5,
      requiredLevel: 3, switchCost: 1000000,
      description: 'AI智能生产系统',
      effects: ['产量+40%', '品质+15%', '人力-70%', '能耗+50%', '维护+30%', '速度+50%'],
    }),
    createMethod(23, 10, 'preservation', 'food_ambient', '常温', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }], qualityBonus: -0.1,
      energyMultiplier: 0.7,
      requiredLevel: 1, switchCost: 10000,
      description: '常温存储',
      effects: ['产量+5%', '品质-10%', '能耗-30%'],
    }),
    createMethod(23, 11, 'preservation', 'food_chilled', '冷藏', {
      qualityBonus: 0.1, energyMultiplier: 1.2, maintenanceMultiplier: 1.15,
      requiredLevel: 2, switchCost: 80000,
      description: '冷藏保鲜',
      effects: ['品质+10%', '能耗+20%', '维护+15%'],
    }),
    createMethod(23, 12, 'preservation', 'food_frozen', '速冻', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }], qualityBonus: 0.2,
      energyMultiplier: 1.5, maintenanceMultiplier: 1.25,
      requiredLevel: 3, switchCost: 200000,
      description: '速冻保鲜技术',
      effects: ['产量-2%', '品质+20%', '能耗+50%', '维护+25%'],
    }),
    createMethod(23, 20, 'quality_grade', 'food_standard', '普通', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      requiredLevel: 1, switchCost: 10000,
      description: '普通消费品级',
      effects: ['产量+10%'],
    }),
    createMethod(23, 21, 'quality_grade', 'food_green', '绿色食品', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.2,
      laborMultiplier: 1.15, pollutionMultiplier: 0.7,
      requiredLevel: 2, switchCost: 150000,
      description: '绿色食品标准',
      effects: ['产量-5%', '品质+20%', '人力+15%', '污染-30%'],
    }),
    createMethod(23, 22, 'quality_grade', 'food_organic', '有机认证', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.35, laborMultiplier: 1.3, pollutionMultiplier: 0.5,
      requiredLevel: 3, switchCost: 400000,
      description: '有机产品认证',
      effects: ['产量-15%', '原料+20%', '品质+35%', '人力+30%', '污染-50%'],
    }),
  ]
);

// ==================== 肉类加工厂 (ID 24) ====================
const MEAT_PROCESSING_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.MEAT_PROCESSING,
  [
    createSlot(24, 'slaughter', '屠宰方式', '🔪', '牲畜屠宰技术', 0),
    createSlot(24, 'processing', '加工方式', '🥩', '肉类加工技术', 1),
    createSlot(24, 'cold_chain', '冷链系统', '❄️', '冷链物流系统', 2),
  ],
  [
    createMethod(24, 0, 'slaughter', 'meat_manual', '半人工屠宰', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.1,
      laborMultiplier: 1.4, productionSpeedMultiplier: 0.8,
      requiredLevel: 1, switchCost: 50000,
      description: '传统半人工屠宰',
      effects: ['产量-10%', '品质+10%', '人力+40%', '速度-20%'],
    }),
    createMethod(24, 1, 'slaughter', 'meat_mechanized', '机械化屠宰', {
      laborMultiplier: 0.8, productionSpeedMultiplier: 1.2,
      requiredLevel: 2, switchCost: 200000,
      description: '机械化屠宰线',
      effects: ['人力-20%', '速度+20%'],
    }),
    createMethod(24, 2, 'slaughter', 'meat_automated', '全自动屠宰', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      laborMultiplier: 0.4, energyMultiplier: 1.4, productionSpeedMultiplier: 1.5, maintenanceMultiplier: 1.3,
      requiredLevel: 3, switchCost: 600000,
      description: '全自动化屠宰系统',
      effects: ['产量+20%', '人力-60%', '能耗+40%', '速度+50%', '维护+30%'],
    }),
    createMethod(24, 10, 'processing', 'meat_fresh', '鲜肉加工', {
      qualityBonus: 0.15, productionSpeedMultiplier: 1.1,
      requiredLevel: 1, switchCost: 30000,
      description: '新鲜肉类直接加工',
      effects: ['品质+15%', '速度+10%'],
    }),
    createMethod(24, 11, 'processing', 'meat_cured', '腌制加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.05,
      requiredLevel: 2, switchCost: 100000,
      description: '腌制肉类加工',
      effects: ['产量+15%', '品质+5%'],
    }),
    createMethod(24, 12, 'processing', 'meat_deep_process', '深加工', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.2,
      laborMultiplier: 1.2, energyMultiplier: 1.2,
      requiredLevel: 3, switchCost: 300000,
      description: '熟食深加工',
      effects: ['产量+10%', '品质+20%', '人力+20%', '能耗+20%'],
    }),
    createMethod(24, 20, 'cold_chain', 'meat_basic_cold', '基础冷链', {
      energyMultiplier: 1.1, maintenanceMultiplier: 1.1,
      requiredLevel: 1, switchCost: 50000,
      description: '基础冷藏设施',
      effects: ['能耗+10%', '维护+10%'],
    }),
    createMethod(24, 21, 'cold_chain', 'meat_full_cold', '全程冷链', {
      qualityBonus: 0.15, energyMultiplier: 1.3, maintenanceMultiplier: 1.25,
      requiredLevel: 2, switchCost: 200000,
      description: '全程温控冷链',
      effects: ['品质+15%', '能耗+30%', '维护+25%'],
    }),
    createMethod(24, 22, 'cold_chain', 'meat_smart_cold', '智能冷链', {
      qualityBonus: 0.25, energyMultiplier: 1.2, maintenanceMultiplier: 1.4,
      requiredLevel: 3, switchCost: 400000,
      description: 'AI温控智能冷链',
      effects: ['品质+25%', '能耗+20%', '维护+40%'],
    }),
  ]
);

// ==================== 乳品厂 (ID 25) ====================
const DAIRY_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.DAIRY_FACTORY,
  [
    createSlot(25, 'pasteurization', '杀菌工艺', '🔥', '乳品杀菌技术', 0),
    createSlot(25, 'product_type', '产品类型', '🥛', '乳制品种类', 1),
    createSlot(25, 'packaging', '包装方式', '📦', '产品包装技术', 2),
  ],
  [
    createMethod(25, 0, 'pasteurization', 'dairy_ltlt', '低温长时杀菌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.15,
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.7,
      requiredLevel: 1, switchCost: 50000,
      description: '巴氏杀菌',
      effects: ['产量-10%', '品质+15%', '人力+20%', '速度-30%'],
    }),
    createMethod(25, 1, 'pasteurization', 'dairy_htst', '高温短时杀菌', {
      qualityBonus: 0.1, productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 150000,
      description: 'HTST杀菌',
      effects: ['品质+10%', '速度+10%'],
    }),
    createMethod(25, 2, 'pasteurization', 'dairy_uht', '超高温瞬时杀菌', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      energyMultiplier: 1.3, productionSpeedMultiplier: 1.3,
      requiredLevel: 3, switchCost: 400000,
      description: 'UHT超高温杀菌',
      effects: ['产量+20%', '能耗+30%', '速度+30%'],
    }),
    createMethod(25, 10, 'product_type', 'dairy_liquid', '液态乳', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1, switchCost: 30000,
      description: '鲜奶和酸奶',
      effects: ['产量+10%', '速度+20%'],
    }),
    createMethod(25, 11, 'product_type', 'dairy_cheese', '奶酪生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.25,
      laborMultiplier: 1.3, productionSpeedMultiplier: 0.7,
      requiredLevel: 2, switchCost: 200000,
      description: '奶酪制作',
      effects: ['产量-15%', '品质+25%', '人力+30%', '速度-30%'],
    }),
    createMethod(25, 12, 'product_type', 'dairy_powder', '奶粉生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.15,
      energyMultiplier: 1.4,
      requiredLevel: 2, switchCost: 300000,
      description: '喷雾干燥奶粉',
      effects: ['产量-10%', '品质+15%', '能耗+40%'],
    }),
    createMethod(25, 20, 'packaging', 'dairy_bottle', '瓶装', {
      laborMultiplier: 1.1, productionSpeedMultiplier: 0.9,
      requiredLevel: 1, switchCost: 20000,
      description: '玻璃瓶包装',
      effects: ['人力+10%', '速度-10%'],
    }),
    createMethod(25, 21, 'packaging', 'dairy_carton', '纸盒装', {
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2, switchCost: 80000,
      description: '纸盒无菌包装',
      effects: ['速度+10%'],
    }),
    createMethod(25, 22, 'packaging', 'dairy_bag', '袋装', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2, switchCost: 60000,
      description: '塑料袋包装',
      effects: ['产量+10%', '速度+20%'],
    }),
  ]
);

// ==================== 建材厂 (ID 26) ====================
const BUILDING_MATERIALS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.BUILDING_MATERIALS_FACTORY,
  [
    createSlot(26, 'production_method', '生产方式', '🏭', '建材生产技术', 0),
    createSlot(26, 'material_mix', '材料配比', '📊', '原材料配比方案', 1),
    createSlot(26, 'quality_control', '质量控制', '✅', '产品质检方式', 2),
  ],
  [
    createMethod(26, 0, 'production_method', 'bm_traditional', '传统生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 1, switchCost: 80000,
      description: '传统建材生产',
      effects: ['基础产能'],
    }),
    createMethod(26, 1, 'production_method', 'bm_prefab', '预制生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }], qualityBonus: 0.1,
      laborMultiplier: 0.7, productionSpeedMultiplier: 1.3,
      requiredLevel: 2, switchCost: 300000,
      description: '工厂预制生产',
      effects: ['产量+25%', '品质+10%', '人力-30%', '速度+30%'],
    }),
    createMethod(26, 2, 'production_method', 'bm_modular', '模块化生产', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.2,
      laborMultiplier: 0.5, energyMultiplier: 1.3, productionSpeedMultiplier: 1.5, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 800000,
      description: '模块化智能生产',
      effects: ['产量+40%', '品质+20%', '人力-50%', '能耗+30%', '速度+50%', '维护+20%'],
    }),
    createMethod(26, 10, 'material_mix', 'bm_standard_mix', '标准配比', {
      requiredLevel: 1, switchCost: 20000,
      description: '标准原材料配比',
      effects: ['基础配比'],
    }),
    createMethod(26, 11, 'material_mix', 'bm_recycled', '再生材料', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: -0.05, pollutionMultiplier: 0.7,
      requiredLevel: 2, switchCost: 100000,
      description: '使用再生材料',
      effects: ['产量+10%', '原料-15%', '品质-5%', '污染-30%'],
    }),
    createMethod(26, 12, 'material_mix', 'bm_high_grade', '高档配比', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: 0.25,
      requiredLevel: 3, switchCost: 200000,
      description: '高档材料配比',
      effects: ['产量-10%', '原料+15%', '品质+25%'],
    }),
    createMethod(26, 20, 'quality_control', 'bm_sampling', '抽检', {
      qualityBonus: 0.05, productionSpeedMultiplier: 1.05,
      requiredLevel: 1, switchCost: 15000,
      description: '随机抽样检验',
      effects: ['品质+5%', '速度+5%'],
    }),
    createMethod(26, 21, 'quality_control', 'bm_full_check', '全检', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }], qualityBonus: 0.15,
      laborMultiplier: 1.2, productionSpeedMultiplier: 0.9,
      requiredLevel: 2, switchCost: 80000,
      description: '每批次全量检验',
      effects: ['产量-2%', '品质+15%', '人力+20%', '速度-10%'],
    }),
    createMethod(26, 22, 'quality_control', 'bm_online', '在线检测', {
      qualityBonus: 0.25, laborMultiplier: 0.9, energyMultiplier: 1.1, maintenanceMultiplier: 1.2,
      requiredLevel: 3, switchCost: 300000,
      description: '自动化在线检测',
      effects: ['品质+25%', '人力-10%', '能耗+10%', '维护+20%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const PROCESSING_CONFIGS: BuildingMethodConfig[] = [
  STEEL_MILL_CONFIG,             // ID 15
  NON_FERROUS_SMELTER_CONFIG,    // ID 16
  REFINERY_CONFIG,               // ID 17
  CHEMICAL_PLANT_CONFIG,         // ID 18
  GLASS_FACTORY_CONFIG,          // ID 19
  CEMENT_FACTORY_CONFIG,         // ID 20
  PAPER_MILL_CONFIG,             // ID 21
  TEXTILE_MILL_CONFIG,           // ID 22
  FOOD_FACTORY_CONFIG,           // ID 23
  MEAT_PROCESSING_CONFIG,        // ID 24
  DAIRY_FACTORY_CONFIG,          // ID 25
  BUILDING_MATERIALS_FACTORY_CONFIG, // ID 26
];

/**
 * 注册所有加工类建筑的生产方式
 * 共12种建筑（ID 15-26），每种3个槽位
 */
export function registerProcessingMethods(): void {
  registerBuildingConfigs(PROCESSING_CONFIGS);
}