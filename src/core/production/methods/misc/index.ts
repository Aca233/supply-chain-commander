/**
 * 其他产业链建筑专属生产方式
 * 涵盖: 矿业扩展、纺织扩展、建材扩展、农产品深加工、能源扩展、通信、服务业扩展、文化传媒、杂项、零售
 * 建筑ID: 62-106
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 矿业扩展 (ID 62-66) ====================

// 稀土矿 (ID 62)
const RARE_EARTH_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(62, [
  createSlot(62, 'extraction', '开采方式', '⛏️', '稀土开采技术', 0),
  createSlot(62, 'separation', '分离工艺', '⚗️', '稀土分离技术', 1),
], [
  createMethod(62, 0, 'extraction', 're_pool', '池浸开采', { outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], pollutionMultiplier: 1.5, requiredLevel: 1, switchCost: 100000, description: '传统池浸法', effects: ['污染+50%'] }),
  createMethod(62, 1, 'extraction', 're_heap', '堆浸开采', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], pollutionMultiplier: 1.2, laborMultiplier: 0.9, requiredLevel: 2, switchCost: 300000, description: '堆浸法开采', effects: ['产量+10%', '污染+20%', '人力-10%'] }),
  createMethod(62, 2, 'extraction', 're_insitu', '原地浸矿', { outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], pollutionMultiplier: 0.7, laborMultiplier: 0.7, requiredLevel: 3, switchCost: 600000, description: '原地浸矿技术', effects: ['产量-5%', '污染-30%', '人力-30%'] }),
  createMethod(62, 10, 'separation', 're_solvent', '溶剂萃取', { qualityBonus: 0.1, energyMultiplier: 1.3, requiredLevel: 1, switchCost: 150000, description: '有机溶剂萃取', effects: ['品质+10%', '能耗+30%'] }),
  createMethod(62, 11, 'separation', 're_membrane', '膜分离', { qualityBonus: 0.25, energyMultiplier: 1.1, maintenanceMultiplier: 1.3, requiredLevel: 3, switchCost: 500000, description: '膜技术分离', effects: ['品质+25%', '能耗+10%', '维护+30%'] }),
]);

// 锂矿 (ID 63)
const LITHIUM_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(63, [
  createSlot(63, 'source', '矿源类型', '🔋', '锂资源类型', 0),
], [
  createMethod(63, 0, 'source', 'li_spodumene', '锂辉石矿', { outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], energyMultiplier: 1.3, requiredLevel: 1, switchCost: 200000, description: '硬岩锂矿', effects: ['能耗+30%'] }),
  createMethod(63, 1, 'source', 'li_brine', '盐湖卤水', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], energyMultiplier: 0.7, productionSpeedMultiplier: 0.6, requiredLevel: 2, switchCost: 500000, description: '盐湖提锂', effects: ['产量+30%', '能耗-30%', '速度-40%'] }),
  createMethod(63, 2, 'source', 'li_clay', '锂黏土', { outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.15, energyMultiplier: 1.1, requiredLevel: 3, switchCost: 800000, description: '黏土提锂', effects: ['产量-10%', '品质+15%', '能耗+10%'] }),
]);

// 钴矿 (ID 64)
const COBALT_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(64, [
  createSlot(64, 'mining', '采矿方式', '⛏️', '钴矿开采', 0),
], [
  createMethod(64, 0, 'mining', 'co_openpit', '露天开采', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], laborMultiplier: 0.8, pollutionMultiplier: 1.3, requiredLevel: 1, switchCost: 150000, description: '露天矿开采', effects: ['产量+20%', '人力-20%', '污染+30%'] }),
  createMethod(64, 1, 'mining', 'co_underground', '地下开采', { qualityBonus: 0.1, laborMultiplier: 1.2, pollutionMultiplier: 0.7, requiredLevel: 2, switchCost: 400000, description: '地下矿井开采', effects: ['品质+10%', '人力+20%', '污染-30%'] }),
]);

// 镍矿 (ID 65)
const NICKEL_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(65, [
  createSlot(65, 'processing', '处理工艺', '🔥', '镍矿处理', 0),
], [
  createMethod(65, 0, 'processing', 'ni_pyrometallurgy', '火法冶炼', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], energyMultiplier: 1.4, pollutionMultiplier: 1.3, requiredLevel: 1, switchCost: 200000, description: '高温冶炼', effects: ['产量+10%', '能耗+40%', '污染+30%'] }),
  createMethod(65, 1, 'processing', 'ni_hydrometallurgy', '湿法冶炼', { qualityBonus: 0.15, energyMultiplier: 1.1, pollutionMultiplier: 0.8, requiredLevel: 2, switchCost: 500000, description: '湿法冶金', effects: ['品质+15%', '能耗+10%', '污染-20%'] }),
]);

// 钨矿 (ID 66)
const TUNGSTEN_MINE_CONFIG: BuildingMethodConfig = createBuildingConfig(66, [
  createSlot(66, 'beneficiation', '选矿方式', '⚙️', '钨矿选矿', 0),
], [
  createMethod(66, 0, 'beneficiation', 'w_gravity', '重选', { outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], laborMultiplier: 1.1, requiredLevel: 1, switchCost: 80000, description: '重力选矿', effects: ['人力+10%'] }),
  createMethod(66, 1, 'beneficiation', 'w_flotation', '浮选', { outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.1, energyMultiplier: 1.2, requiredLevel: 2, switchCost: 200000, description: '泡沫浮选', effects: ['产量+15%', '品质+10%', '能耗+20%'] }),
]);

// ==================== 纺织扩展 (ID 67-70) ====================

// 印染厂 (ID 67)
const DYEING_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(67, [
  createSlot(67, 'dyeing', '染色工艺', '🎨', '染色技术', 0),
], [
  createMethod(67, 0, 'dyeing', 'dye_conventional', '常规染色', { pollutionMultiplier: 1.4, energyMultiplier: 1.2, requiredLevel: 1, switchCost: 60000, description: '传统染色', effects: ['污染+40%', '能耗+20%'] }),
  createMethod(67, 1, 'dyeing', 'dye_eco', '环保染色', { outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.1, pollutionMultiplier: 0.5, energyMultiplier: 0.9, requiredLevel: 2, switchCost: 250000, description: '低污染染色', effects: ['产量-5%', '品质+10%', '污染-50%', '能耗-10%'] }),
  createMethod(67, 2, 'dyeing', 'dye_digital', '数码印染', { outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.25, pollutionMultiplier: 0.3, laborMultiplier: 0.6, requiredLevel: 3, switchCost: 500000, description: '喷墨数码印花', effects: ['产量-10%', '品质+25%', '污染-70%', '人力-40%'] }),
]);

// 针织厂 (ID 68)
const KNITTING_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(68, [
  createSlot(68, 'knitting', '针织方式', '🧶', '针织技术', 0),
], [
  createMethod(68, 0, 'knitting', 'knit_circular', '圆机针织', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], laborMultiplier: 0.7, productionSpeedMultiplier: 1.3, requiredLevel: 1, switchCost: 100000, description: '圆形针织机', effects: ['产量+20%', '人力-30%', '速度+30%'] }),
  createMethod(68, 1, 'knitting', 'knit_flat', '横机针织', { qualityBonus: 0.15, laborMultiplier: 1.0, productionSpeedMultiplier: 0.9, requiredLevel: 2, switchCost: 200000, description: '横编机针织', effects: ['品质+15%', '速度-10%'] }),
  createMethod(68, 2, 'knitting', 'knit_seamless', '无缝针织', { outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.3, laborMultiplier: 0.6, requiredLevel: 3, switchCost: 400000, description: '一体成型针织', effects: ['产量-10%', '品质+30%', '人力-40%'] }),
]);

// 服装厂 (ID 69)
const GARMENT_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(69, [
  createSlot(69, 'production', '生产模式', '👔', '服装生产', 0),
], [
  createMethod(69, 0, 'production', 'gar_batch', '批量生产', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: -0.1, laborMultiplier: 0.8, productionSpeedMultiplier: 1.4, requiredLevel: 1, switchCost: 80000, description: '大批量标准化', effects: ['产量+30%', '品质-10%', '人力-20%', '速度+40%'] }),
  createMethod(69, 1, 'production', 'gar_quick', '快时尚', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.05, productionSpeedMultiplier: 1.5, requiredLevel: 2, switchCost: 200000, description: '快速反应模式', effects: ['产量+10%', '品质+5%', '速度+50%'] }),
  createMethod(69, 2, 'production', 'gar_custom', '小批量定制', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.25, laborMultiplier: 1.5, productionSpeedMultiplier: 0.6, requiredLevel: 3, switchCost: 350000, description: '柔性定制生产', effects: ['产量-30%', '品质+25%', '人力+50%', '速度-40%'] }),
]);

// 皮革厂 (ID 70)
const LEATHER_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(70, [
  createSlot(70, 'tanning', '制革工艺', '🧥', '制革技术', 0),
], [
  createMethod(70, 0, 'tanning', 'tan_chrome', '铬鞣', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], productionSpeedMultiplier: 1.2, pollutionMultiplier: 1.5, requiredLevel: 1, switchCost: 100000, description: '铬盐鞣制', effects: ['产量+10%', '速度+20%', '污染+50%'] }),
  createMethod(70, 1, 'tanning', 'tan_vegetable', '植鞣', { outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.2, productionSpeedMultiplier: 0.6, pollutionMultiplier: 0.6, requiredLevel: 2, switchCost: 200000, description: '植物鞣剂', effects: ['产量-20%', '品质+20%', '速度-40%', '污染-40%'] }),
  createMethod(70, 2, 'tanning', 'tan_eco', '环保鞣', { qualityBonus: 0.15, pollutionMultiplier: 0.4, energyMultiplier: 1.1, requiredLevel: 3, switchCost: 400000, description: '无铬环保工艺', effects: ['品质+15%', '污染-60%', '能耗+10%'] }),
]);

// ==================== 建材扩展 (ID 71-75) ====================

// 陶瓷厂 (ID 71)
const CERAMICS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(71, [
  createSlot(71, 'firing', '烧制工艺', '🔥', '陶瓷烧制', 0),
], [
  createMethod(71, 0, 'firing', 'cer_tunnel', '隧道窑', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], energyMultiplier: 1.1, productionSpeedMultiplier: 1.3, requiredLevel: 1, switchCost: 150000, description: '连续隧道窑', effects: ['产量+20%', '能耗+10%', '速度+30%'] }),
  createMethod(71, 1, 'firing', 'cer_roller', '辊道窑', { outputModifiers: [{ goodsId: 'all', multiplier: 1.35 }], qualityBonus: 0.1, energyMultiplier: 0.9, productionSpeedMultiplier: 1.4, requiredLevel: 2, switchCost: 400000, description: '快速辊道窑', effects: ['产量+35%', '品质+10%', '能耗-10%', '速度+40%'] }),
]);

// 砖瓦厂 (ID 72)
const BRICK_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(72, [
  createSlot(72, 'material', '原料类型', '🧱', '砖瓦原料', 0),
], [
  createMethod(72, 0, 'material', 'brick_clay', '黏土砖', { outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], energyMultiplier: 1.2, pollutionMultiplier: 1.2, requiredLevel: 1, switchCost: 50000, description: '传统黏土烧结', effects: ['能耗+20%', '污染+20%'] }),
  createMethod(72, 1, 'material', 'brick_flyash', '粉煤灰砖', { outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], inputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], pollutionMultiplier: 0.7, requiredLevel: 2, switchCost: 150000, description: '废料利用', effects: ['产量+15%', '原料-20%', '污染-30%'] }),
  createMethod(72, 2, 'material', 'brick_autoclaved', '蒸压砖', { qualityBonus: 0.2, energyMultiplier: 1.1, pollutionMultiplier: 0.5, requiredLevel: 3, switchCost: 300000, description: '蒸压加气混凝土', effects: ['品质+20%', '能耗+10%', '污染-50%'] }),
]);

// 石材加工厂 (ID 73)
const STONE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(73, [
  createSlot(73, 'cutting', '切割工艺', '🪨', '石材加工', 0),
], [
  createMethod(73, 0, 'cutting', 'stone_manual', '手工切割', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.1, laborMultiplier: 2.0, productionSpeedMultiplier: 0.4, requiredLevel: 1, switchCost: 30000, description: '人工切割', effects: ['产量-30%', '品质+10%', '人力+100%', '速度-60%'] }),
  createMethod(73, 1, 'cutting', 'stone_gang_saw', '排锯切割', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], laborMultiplier: 0.7, energyMultiplier: 1.3, productionSpeedMultiplier: 1.2, requiredLevel: 2, switchCost: 200000, description: '多片排锯', effects: ['产量+10%', '人力-30%', '能耗+30%', '速度+20%'] }),
  createMethod(73, 2, 'cutting', 'stone_cnc', 'CNC雕刻', { outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.3, laborMultiplier: 0.5, energyMultiplier: 1.4, requiredLevel: 3, switchCost: 500000, description: '数控雕刻', effects: ['产量-10%', '品质+30%', '人力-50%', '能耗+40%'] }),
]);

// 预制构件厂 (ID 74)
const PRECAST_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(74, [
  createSlot(74, 'production', '生产方式', '🏗️', '预制构件', 0),
], [
  createMethod(74, 0, 'production', 'pre_fixed', '固定模具', { outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], laborMultiplier: 1.1, requiredLevel: 1, switchCost: 100000, description: '固定模台生产', effects: ['人力+10%'] }),
  createMethod(74, 1, 'production', 'pre_flow', '流水线', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: 0.1, laborMultiplier: 0.7, energyMultiplier: 1.2, productionSpeedMultiplier: 1.4, requiredLevel: 2, switchCost: 400000, description: '自动流水线', effects: ['产量+30%', '品质+10%', '人力-30%', '能耗+20%', '速度+40%'] }),
]);

// 装饰材料厂 (ID 75)
const DECORATION_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(75, [
  createSlot(75, 'finish', '表面处理', '✨', '装饰工艺', 0),
], [
  createMethod(75, 0, 'finish', 'dec_basic', '基础处理', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: -0.1, productionSpeedMultiplier: 1.2, requiredLevel: 1, switchCost: 40000, description: '简单表面处理', effects: ['产量+10%', '品质-10%', '速度+20%'] }),
  createMethod(75, 1, 'finish', 'dec_premium', '精装处理', { qualityBonus: 0.2, laborMultiplier: 1.2, productionSpeedMultiplier: 0.9, requiredLevel: 2, switchCost: 150000, description: '精细装饰处理', effects: ['品质+20%', '人力+20%', '速度-10%'] }),
]);

// ==================== 能源扩展 (ID 76-80) ====================

// 风电设备厂 (ID 76)
const WIND_POWER_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(76, [
  createSlot(76, 'turbine', '风机类型', '💨', '风力发电机', 0),
], [
  createMethod(76, 0, 'turbine', 'wind_onshore', '陆上风机', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], laborMultiplier: 1.0, requiredLevel: 1, switchCost: 200000, description: '陆上风力发电', effects: ['产量+10%'] }),
  createMethod(76, 1, 'turbine', 'wind_offshore', '海上风机', { outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }], qualityBonus: 0.25, laborMultiplier: 1.3, maintenanceMultiplier: 1.4, requiredLevel: 3, switchCost: 800000, description: '海上风力发电', effects: ['产量-15%', '品质+25%', '人力+30%', '维护+40%'] }),
]);

// 储能电池厂 (ID 77)
const BATTERY_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(77, [
  createSlot(77, 'chemistry', '电池类型', '🔋', '电池化学体系', 0),
], [
  createMethod(77, 0, 'chemistry', 'bat_lfp', '磷酸铁锂', { outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.0, requiredLevel: 1, switchCost: 300000, description: 'LFP电池', effects: ['产量+15%'] }),
  createMethod(77, 1, 'chemistry', 'bat_ncm', '三元锂', { qualityBonus: 0.2, inputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], requiredLevel: 2, switchCost: 600000, description: 'NCM电池', effects: ['品质+20%', '原料+15%'] }),
  createMethod(77, 2, 'chemistry', 'bat_solid', '固态电池', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.4, laborMultiplier: 1.4, maintenanceMultiplier: 1.5, requiredLevel: 4, switchCost: 2000000, description: '全固态电池', effects: ['产量-30%', '品质+40%', '人力+40%', '维护+50%'] }),
]);

// 氢能设备厂 (ID 78)
const HYDROGEN_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(78, [
  createSlot(78, 'production', '制氢方式', '💧', '氢气生产', 0),
], [
  createMethod(78, 0, 'production', 'h2_grey', '灰氢', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], pollutionMultiplier: 1.5, energyMultiplier: 1.0, requiredLevel: 1, switchCost: 200000, description: '天然气制氢', effects: ['产量+20%', '污染+50%'] }),
  createMethod(78, 1, 'production', 'h2_blue', '蓝氢', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], pollutionMultiplier: 0.5, energyMultiplier: 1.15, requiredLevel: 2, switchCost: 500000, description: '碳捕集制氢', effects: ['产量+10%', '污染-50%', '能耗+15%'] }),
  createMethod(78, 2, 'production', 'h2_green', '绿氢', { outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.25, pollutionMultiplier: 0.1, energyMultiplier: 1.5, requiredLevel: 4, switchCost: 1500000, description: '电解水制氢', effects: ['产量-20%', '品质+25%', '污染-90%', '能耗+50%'] }),
]);

// 核电设备厂 (ID 79)
const NUCLEAR_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(79, [
  createSlot(79, 'reactor', '反应堆类型', '☢️', '核反应堆', 0),
], [
  createMethod(79, 0, 'reactor', 'nuc_pwr', '压水堆', { qualityBonus: 0.1, laborMultiplier: 1.2, maintenanceMultiplier: 1.3, requiredLevel: 2, switchCost: 500000, description: 'PWR压水堆', effects: ['品质+10%', '人力+20%', '维护+30%'] }),
  createMethod(79, 1, 'reactor', 'nuc_htr', '高温气冷堆', { outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], qualityBonus: 0.3, laborMultiplier: 1.4, maintenanceMultiplier: 1.5, requiredLevel: 4, switchCost: 2000000, description: 'HTGR高温气冷堆', effects: ['产量-10%', '品质+30%', '人力+40%', '维护+50%'] }),
]);

// 天然气加工厂 (ID 80)
const GAS_PROCESSING_CONFIG: BuildingMethodConfig = createBuildingConfig(80, [
  createSlot(80, 'processing', '加工方式', '⛽', '天然气加工', 0),
], [
  createMethod(80, 0, 'processing', 'gas_dew', '露点控制', { outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], energyMultiplier: 1.1, requiredLevel: 1, switchCost: 100000, description: '露点控制法', effects: ['能耗+10%'] }),
  createMethod(80, 1, 'processing', 'gas_cryo', '深冷分离', { outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }], qualityBonus: 0.15, energyMultiplier: 1.4, requiredLevel: 2, switchCost: 400000, description: '低温分离', effects: ['产量+15%', '品质+15%', '能耗+40%'] }),
  createMethod(80, 2, 'processing', 'gas_lng', 'LNG液化', { outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], qualityBonus: 0.25, energyMultiplier: 1.6, maintenanceMultiplier: 1.3, requiredLevel: 3, switchCost: 800000, description: '液化天然气', effects: ['品质+25%', '能耗+60%', '维护+30%'] }),
]);

// ==================== 通信产业链 (ID 81-85) ====================

// 通信设备厂 (ID 81)
const TELECOM_EQUIPMENT_CONFIG: BuildingMethodConfig = createBuildingConfig(81, [
  createSlot(81, 'technology', '技术标准', '📡', '通信技术', 0),
], [
  createMethod(81, 0, 'technology', 'tel_4g', '4G设备', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: -0.1, laborMultiplier: 0.9, requiredLevel: 1, switchCost: 150000, description: '4G LTE设备', effects: ['产量+20%', '品质-10%', '人力-10%'] }),
  createMethod(81, 1, 'technology', 'tel_5g', '5G设备', { qualityBonus: 0.2, laborMultiplier: 1.1, energyMultiplier: 1.2, requiredLevel: 2, switchCost: 500000, description: '5G NR设备', effects: ['品质+20%', '人力+10%', '能耗+20%'] }),
  createMethod(81, 2, 'technology', 'tel_6g', '6G研发', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.4, laborMultiplier: 1.5, energyMultiplier: 1.4, requiredLevel: 4, switchCost: 2000000, description: '6G前沿技术', effects: ['产量-30%', '品质+40%', '人力+50%', '能耗+40%'] }),
]);

// 光纤厂 (ID 82)
const FIBER_OPTIC_CONFIG: BuildingMethodConfig = createBuildingConfig(82, [
  createSlot(82, 'fiber_type', '光纤类型', '💡', '光纤制造', 0),
], [
  createMethod(82, 0, 'fiber_type', 'fiber_mm', '多模光纤', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: -0.1, requiredLevel: 1, switchCost: 80000, description: '多模光纤', effects: ['产量+20%', '品质-10%'] }),
  createMethod(82, 1, 'fiber_type', 'fiber_sm', '单模光纤', { qualityBonus: 0.15, requiredLevel: 2, switchCost: 200000, description: '单模光纤', effects: ['品质+15%'] }),
  createMethod(82, 2, 'fiber_type', 'fiber_special', '特种光纤', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.35, laborMultiplier: 1.4, requiredLevel: 4, switchCost: 600000, description: '特种光纤', effects: ['产量-30%', '品质+35%', '人力+40%'] }),
]);

// 卫星制造厂 (ID 83)
const SATELLITE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(83, [
  createSlot(83, 'satellite', '卫星类型', '🛰️', '卫星制造', 0),
], [
  createMethod(83, 0, 'satellite', 'sat_small', '小卫星', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: 0.0, laborMultiplier: 0.8, productionSpeedMultiplier: 1.4, requiredLevel: 2, switchCost: 500000, description: '小型卫星', effects: ['产量+30%', '人力-20%', '速度+40%'] }),
  createMethod(83, 1, 'satellite', 'sat_geo', '地球同步卫星', { outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }], qualityBonus: 0.3, laborMultiplier: 1.5, productionSpeedMultiplier: 0.5, requiredLevel: 3, switchCost: 1500000, description: 'GEO卫星', effects: ['产量-40%', '品质+30%', '人力+50%', '速度-50%'] }),
]);

// 手机厂 (ID 84)
const SMARTPHONE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(84, [
  createSlot(84, 'assembly', '组装方式', '📱', '手机组装', 0),
], [
  createMethod(84, 0, 'assembly', 'phone_manual', '人工组装', { outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], laborMultiplier: 1.8, productionSpeedMultiplier: 0.6, requiredLevel: 1, switchCost: 50000, description: '人工组装', effects: ['产量-20%', '人力+80%', '速度-40%'] }),
  createMethod(84, 1, 'assembly', 'phone_auto', '自动化产线', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.1, laborMultiplier: 0.5, energyMultiplier: 1.3, productionSpeedMultiplier: 1.4, requiredLevel: 2, switchCost: 400000, description: '自动组装线', effects: ['产量+20%', '品质+10%', '人力-50%', '能耗+30%', '速度+40%'] }),
  createMethod(84, 2, 'assembly', 'phone_smart', '智能工厂', { outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.2, laborMultiplier: 0.3, energyMultiplier: 1.5, maintenanceMultiplier: 1.4, productionSpeedMultiplier: 1.6, requiredLevel: 3, switchCost: 1000000, description: 'AI智能工厂', effects: ['产量+40%', '品质+20%', '人力-70%', '能耗+50%', '维护+40%', '速度+60%'] }),
]);

// 芯片封测厂 (ID 85)
const CHIP_TESTING_CONFIG: BuildingMethodConfig = createBuildingConfig(85, [
  createSlot(85, 'testing', '测试方式', '🔬', '芯片测试', 0),
], [
  createMethod(85, 0, 'testing', 'chip_wafer', '晶圆测试', { qualityBonus: 0.1, laborMultiplier: 1.1, energyMultiplier: 1.2, requiredLevel: 1, switchCost: 200000, description: 'CP测试', effects: ['品质+10%', '人力+10%', '能耗+20%'] }),
  createMethod(85, 1, 'testing', 'chip_final', '成品测试', { qualityBonus: 0.2, laborMultiplier: 1.0, energyMultiplier: 1.3, requiredLevel: 2, switchCost: 400000, description: 'FT测试', effects: ['品质+20%', '能耗+30%'] }),
  createMethod(85, 2, 'testing', 'chip_system', '系统级测试', { outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }], qualityBonus: 0.35, laborMultiplier: 1.2, energyMultiplier: 1.5, requiredLevel: 3, switchCost: 800000, description: 'SLT系统级测试', effects: ['产量-5%', '品质+35%', '人力+20%', '能耗+50%'] }),
]);

// ==================== 服务业扩展 (ID 86-90) ====================

// 酒店 (ID 86)
const HOTEL_CONFIG: BuildingMethodConfig = createBuildingConfig(86, [
  createSlot(86, 'service', '服务等级', '🏨', '酒店服务', 0),
], [
  createMethod(86, 0, 'service', 'hotel_economy', '经济型', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: -0.15, laborMultiplier: 0.7, requiredLevel: 1, switchCost: 50000, description: '经济型服务', effects: ['产量+30%', '品质-15%', '人力-30%'] }),
  createMethod(86, 1, 'service', 'hotel_business', '商务型', { qualityBonus: 0.1, laborMultiplier: 1.0, requiredLevel: 2, switchCost: 150000, description: '商务型服务', effects: ['品质+10%'] }),
  createMethod(86, 2, 'service', 'hotel_luxury', '奢华型', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.35, laborMultiplier: 1.6, requiredLevel: 4, switchCost: 500000, description: '奢华型服务', effects: ['产量-30%', '品质+35%', '人力+60%'] }),
]);

// 餐饮公司 (ID 87)
const RESTAURANT_CONFIG: BuildingMethodConfig = createBuildingConfig(87, [
  createSlot(87, 'operation', '运营模式', '🍽️', '餐饮运营', 0),
], [
  createMethod(87, 0, 'operation', 'rest_fast', '快餐模式', { outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: -0.1, laborMultiplier: 0.6, productionSpeedMultiplier: 1.5, requiredLevel: 1, switchCost: 30000, description: '快餐连锁', effects: ['产量+40%', '品质-10%', '人力-40%', '速度+50%'] }),
  createMethod(87, 1, 'operation', 'rest_casual', '休闲餐饮', { qualityBonus: 0.1, laborMultiplier: 1.0, requiredLevel: 2, switchCost: 100000, description: '休闲餐饮', effects: ['品质+10%'] }),
  createMethod(87, 2, 'operation', 'rest_fine', '高端餐饮', { outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }], qualityBonus: 0.4, laborMultiplier: 2.0, productionSpeedMultiplier: 0.5, requiredLevel: 4, switchCost: 400000, description: '米其林级别', effects: ['产量-40%', '品质+40%', '人力+100%', '速度-50%'] }),
]);

// 教育机构 (ID 88)
const EDUCATION_CONFIG: BuildingMethodConfig = createBuildingConfig(88, [
  createSlot(88, 'teaching', '教学模式', '🎓', '教学方式', 0),
], [
  createMethod(88, 0, 'teaching', 'edu_traditional', '传统教学', { outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }], laborMultiplier: 1.2, requiredLevel: 1, switchCost: 30000, description: '面授教学', effects: ['人力+20%'] }),
  createMethod(88, 1, 'teaching', 'edu_hybrid', '混合教学', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.1, laborMultiplier: 0.9, energyMultiplier: 1.2, requiredLevel: 2, switchCost: 150000, description: '线上+线下', effects: ['产量+20%', '品质+10%', '人力-10%', '能耗+20%'] }),
  createMethod(88, 2, 'teaching', 'edu_online', '在线教育', { outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }], qualityBonus: -0.05, laborMultiplier: 0.5, energyMultiplier: 1.4, requiredLevel: 3, switchCost: 400000, description: '纯在线教育', effects: ['产量+50%', '品质-5%', '人力-50%', '能耗+40%'] }),
]);

// 医院 (ID 89)
const HOSPITAL_CONFIG: BuildingMethodConfig = createBuildingConfig(89, [
  createSlot(89, 'care', '医疗模式', '🏥', '医疗服务', 0),
], [
  createMethod(89, 0, 'care', 'hos_basic', '基础医疗', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: -0.1, laborMultiplier: 0.9, requiredLevel: 1, switchCost: 50000, description: '基本诊疗', effects: ['产量+10%', '品质-10%', '人力-10%'] }),
  createMethod(89, 1, 'care', 'hos_specialized', '专科医疗', { qualityBonus: 0.2, laborMultiplier: 1.2, energyMultiplier: 1.2, requiredLevel: 2, switchCost: 300000, description: '专科诊疗', effects: ['品质+20%', '人力+20%', '能耗+20%'] }),
  createMethod(89, 2, 'care', 'hos_advanced', '高端医疗', { outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.4, laborMultiplier: 1.5, energyMultiplier: 1.4, maintenanceMultiplier: 1.4, requiredLevel: 4, switchCost: 1000000, description: '高端综合医疗', effects: ['产量-20%', '品质+40%', '人力+50%', '能耗+40%', '维护+40%'] }),
]);

// 银行 (ID 90)
const BANK_CONFIG: BuildingMethodConfig = createBuildingConfig(90, [
  createSlot(90, 'service', '服务模式', '🏦', '银行服务', 0),
], [
  createMethod(90, 0, 'service', 'bank_traditional', '传统网点', { laborMultiplier: 1.3, requiredLevel: 1, switchCost: 40000, description: '柜台服务', effects: ['人力+30%'] }),
  createMethod(90, 1, 'service', 'bank_digital', '数字银行', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: 0.1, laborMultiplier: 0.6, energyMultiplier: 1.3, requiredLevel: 2, switchCost: 300000, description: '线上银行', effects: ['产量+30%', '品质+10%', '人力-40%', '能耗+30%'] }),
]);

// ==================== 文化传媒 (ID 91-95) ====================

// 影视制作公司 (ID 91)
const FILM_STUDIO_CONFIG: BuildingMethodConfig = createBuildingConfig(91, [
  createSlot(91, 'production', '制作方式', '🎬', '影视制作', 0),
], [
  createMethod(91, 0, 'production', 'film_indie', '独立制作', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.15, laborMultiplier: 1.5, productionSpeedMultiplier: 0.6, requiredLevel: 1, switchCost: 50000, description: '小成本制作', effects: ['产量-30%', '品质+15%', '人力+50%', '速度-40%'] }),
  createMethod(91, 1, 'production', 'film_studio', '工作室', { qualityBonus: 0.1, laborMultiplier: 1.0, requiredLevel: 2, switchCost: 200000, description: '中等规模', effects: ['品质+10%'] }),
  createMethod(91, 2, 'production', 'film_blockbuster', '大片制作', { outputModifiers: [{ goodsId: 'all', multiplier: 0.5 }], qualityBonus: 0.4, laborMultiplier: 2.0, energyMultiplier: 1.5, productionSpeedMultiplier: 0.4, requiredLevel: 4, switchCost: 1000000, description: '大制作', effects: ['产量-50%', '品质+40%', '人力+100%', '能耗+50%', '速度-60%'] }),
]);

// 游戏公司 (ID 92)
const GAME_STUDIO_CONFIG: BuildingMethodConfig = createBuildingConfig(92, [
  createSlot(92, 'development', '开发模式', '🎮', '游戏开发', 0),
], [
  createMethod(92, 0, 'development', 'game_indie', '独立开发', { outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.1, laborMultiplier: 1.3, requiredLevel: 1, switchCost: 30000, description: '小团队开发', effects: ['产量-20%', '品质+10%', '人力+30%'] }),
  createMethod(92, 1, 'development', 'game_mid', '中型工作室', { qualityBonus: 0.15, laborMultiplier: 1.0, requiredLevel: 2, switchCost: 150000, description: '中等规模', effects: ['品质+15%'] }),
  createMethod(92, 2, 'development', 'game_aaa', '3A大作', { outputModifiers: [{ goodsId: 'all', multiplier: 0.5 }], qualityBonus: 0.45, laborMultiplier: 2.5, energyMultiplier: 1.4, productionSpeedMultiplier: 0.3, requiredLevel: 4, switchCost: 800000, description: '顶级大作', effects: ['产量-50%', '品质+45%', '人力+150%', '能耗+40%', '速度-70%'] }),
]);

// 出版社 (ID 93)
const PUBLISHER_CONFIG: BuildingMethodConfig = createBuildingConfig(93, [
  createSlot(93, 'format', '出版形式', '📚', '出版方式', 0),
], [
  createMethod(93, 0, 'format', 'pub_print', '纸质出版', { qualityBonus: 0.1, laborMultiplier: 1.2, productionSpeedMultiplier: 0.8, requiredLevel: 1, switchCost: 40000, description: '传统印刷', effects: ['品质+10%', '人力+20%', '速度-20%'] }),
  createMethod(93, 1, 'format', 'pub_digital', '数字出版', { outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], laborMultiplier: 0.6, energyMultiplier: 1.2, productionSpeedMultiplier: 1.5, requiredLevel: 2, switchCost: 200000, description: '电子出版', effects: ['产量+40%', '人力-40%', '能耗+20%', '速度+50%'] }),
  createMethod(93, 2, 'format', 'pub_hybrid', '融合出版', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.15, laborMultiplier: 0.9, requiredLevel: 3, switchCost: 350000, description: '全媒体出版', effects: ['产量+10%', '品质+15%', '人力-10%'] }),
]);

// 广告公司 (ID 94)
const AD_AGENCY_CONFIG: BuildingMethodConfig = createBuildingConfig(94, [
  createSlot(94, 'media', '媒体类型', '📺', '广告媒介', 0),
], [
  createMethod(94, 0, 'media', 'ad_traditional', '传统媒体', { qualityBonus: 0.05, laborMultiplier: 1.1, requiredLevel: 1, switchCost: 30000, description: '报刊电视', effects: ['品质+5%', '人力+10%'] }),
  createMethod(94, 1, 'media', 'ad_digital', '数字营销', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: 0.15, laborMultiplier: 0.8, energyMultiplier: 1.2, requiredLevel: 2, switchCost: 150000, description: '互联网广告', effects: ['产量+30%', '品质+15%', '人力-20%', '能耗+20%'] }),
  createMethod(94, 2, 'media', 'ad_integrated', '整合营销', { qualityBonus: 0.25, laborMultiplier: 1.2, requiredLevel: 3, switchCost: 300000, description: '全渠道营销', effects: ['品质+25%', '人力+20%'] }),
]);

// 演艺公司 (ID 95)
const ENTERTAINMENT_CONFIG: BuildingMethodConfig = createBuildingConfig(95, [
  createSlot(95, 'scale', '演出规模', '🎤', '演艺活动', 0),
], [
  createMethod(95, 0, 'scale', 'ent_small', '小型演出', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: -0.05, laborMultiplier: 0.8, requiredLevel: 1, switchCost: 20000, description: '小型活动', effects: ['产量+20%', '品质-5%', '人力-20%'] }),
  createMethod(95, 1, 'scale', 'ent_concert', '演唱会', { qualityBonus: 0.2, laborMultiplier: 1.3, energyMultiplier: 1.3, requiredLevel: 2, switchCost: 200000, description: '大型演唱会', effects: ['品质+20%', '人力+30%', '能耗+30%'] }),
  createMethod(95, 2, 'scale', 'ent_festival', '音乐节', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.35, laborMultiplier: 2.0, energyMultiplier: 1.5, requiredLevel: 4, switchCost: 600000, description: '大型音乐节', effects: ['产量-30%', '品质+35%', '人力+100%', '能耗+50%'] }),
]);

// ==================== 杂项建筑 (ID 96-100) ====================

// 家具厂 (ID 96)
const FURNITURE_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(96, [
  createSlot(96, 'production', '生产方式', '🪑', '家具制造', 0),
], [
  createMethod(96, 0, 'production', 'fur_handcraft', '手工制作', { outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }], qualityBonus: 0.25, laborMultiplier: 2.0, productionSpeedMultiplier: 0.4, requiredLevel: 1, switchCost: 30000, description: '匠人手工', effects: ['产量-40%', '品质+25%', '人力+100%', '速度-60%'] }),
  createMethod(96, 1, 'production', 'fur_mass', '批量生产', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: -0.1, laborMultiplier: 0.6, productionSpeedMultiplier: 1.4, requiredLevel: 2, switchCost: 150000, description: '工业化生产', effects: ['产量+30%', '品质-10%', '人力-40%', '速度+40%'] }),
  createMethod(96, 2, 'production', 'fur_custom', '定制生产', { outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], qualityBonus: 0.2, laborMultiplier: 1.3, requiredLevel: 3, switchCost: 300000, description: '柔性定制', effects: ['产量-20%', '品质+20%', '人力+30%'] }),
]);

// 玩具厂 (ID 97)
const TOY_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(97, [
  createSlot(97, 'production', '生产模式', '🧸', '玩具生产', 0),
], [
  createMethod(97, 0, 'production', 'toy_manual', '人工组装', { outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }], laborMultiplier: 1.5, productionSpeedMultiplier: 0.7, requiredLevel: 1, switchCost: 20000, description: '手工组装', effects: ['产量-20%', '人力+50%', '速度-30%'] }),
  createMethod(97, 1, 'production', 'toy_auto', '自动化', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: 0.1, laborMultiplier: 0.5, energyMultiplier: 1.3, productionSpeedMultiplier: 1.4, requiredLevel: 2, switchCost: 200000, description: '自动生产线', effects: ['产量+30%', '品质+10%', '人力-50%', '能耗+30%', '速度+40%'] }),
]);

// 体育用品厂 (ID 98)
const SPORTS_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(98, [
  createSlot(98, 'quality', '品质定位', '⚽', '体育用品', 0),
], [
  createMethod(98, 0, 'quality', 'sport_mass', '大众产品', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: -0.1, laborMultiplier: 0.7, requiredLevel: 1, switchCost: 50000, description: '大众市场', effects: ['产量+30%', '品质-10%', '人力-30%'] }),
  createMethod(98, 1, 'quality', 'sport_pro', '专业装备', { qualityBonus: 0.2, laborMultiplier: 1.1, requiredLevel: 2, switchCost: 200000, description: '专业级产品', effects: ['品质+20%', '人力+10%'] }),
  createMethod(98, 2, 'quality', 'sport_elite', '顶级装备', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.4, laborMultiplier: 1.5, requiredLevel: 4, switchCost: 500000, description: '职业级产品', effects: ['产量-30%', '品质+40%', '人力+50%'] }),
]);

// 烟草厂 (ID 99)
const TOBACCO_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(99, [
  createSlot(99, 'production', '生产工艺', '🚬', '烟草加工', 0),
], [
  createMethod(99, 0, 'production', 'tob_traditional', '传统工艺', { qualityBonus: 0.1, laborMultiplier: 1.2, productionSpeedMultiplier: 0.9, requiredLevel: 1, switchCost: 80000, description: '传统制烟', effects: ['品质+10%', '人力+20%', '速度-10%'] }),
  createMethod(99, 1, 'production', 'tob_modern', '现代工艺', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], laborMultiplier: 0.7, energyMultiplier: 1.2, productionSpeedMultiplier: 1.3, requiredLevel: 2, switchCost: 300000, description: '现代化生产', effects: ['产量+20%', '人力-30%', '能耗+20%', '速度+30%'] }),
]);

// 酿酒厂 (ID 100)
const BREWERY_CONFIG: BuildingMethodConfig = createBuildingConfig(100, [
  createSlot(100, 'brewing', '酿造方式', '🍺', '酿酒工艺', 0),
], [
  createMethod(100, 0, 'brewing', 'brew_craft', '精酿', { outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }], qualityBonus: 0.3, laborMultiplier: 1.8, productionSpeedMultiplier: 0.5, requiredLevel: 1, switchCost: 50000, description: '小批量精酿', effects: ['产量-40%', '品质+30%', '人力+80%', '速度-50%'] }),
  createMethod(100, 1, 'brewing', 'brew_industrial', '工业酿造', { outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: -0.1, laborMultiplier: 0.5, energyMultiplier: 1.3, productionSpeedMultiplier: 1.5, requiredLevel: 2, switchCost: 250000, description: '大规模酿造', effects: ['产量+40%', '品质-10%', '人力-50%', '能耗+30%', '速度+50%'] }),
]);

// ==================== 零售类建筑 (ID 101-106) ====================

// 超市 (ID 101)
const SUPERMARKET_CONFIG: BuildingMethodConfig = createBuildingConfig(101, [
  createSlot(101, 'operation', '运营模式', '🛒', '零售运营', 0),
], [
  createMethod(101, 0, 'operation', 'super_traditional', '传统超市', { laborMultiplier: 1.2, requiredLevel: 1, switchCost: 30000, description: '传统零售', effects: ['人力+20%'] }),
  createMethod(101, 1, 'operation', 'super_smart', '智慧零售', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: 0.1, laborMultiplier: 0.7, energyMultiplier: 1.3, requiredLevel: 2, switchCost: 200000, description: '自助结账+智能货架', effects: ['产量+20%', '品质+10%', '人力-30%', '能耗+30%'] }),
  createMethod(101, 2, 'operation', 'super_unmanned', '无人超市', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.15, laborMultiplier: 0.3, energyMultiplier: 1.5, maintenanceMultiplier: 1.4, requiredLevel: 3, switchCost: 500000, description: '全自动无人店', effects: ['产量+10%', '品质+15%', '人力-70%', '能耗+50%', '维护+40%'] }),
]);

// 便利店 (ID 102)
const CONVENIENCE_STORE_CONFIG: BuildingMethodConfig = createBuildingConfig(102, [
  createSlot(102, 'service', '服务模式', '🏪', '便利店服务', 0),
], [
  createMethod(102, 0, 'service', 'conv_basic', '基础服务', { laborMultiplier: 1.0, requiredLevel: 1, switchCost: 15000, description: '标准便利店', effects: ['基础产能'] }),
  createMethod(102, 1, 'service', 'conv_premium', '增值服务', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.15, laborMultiplier: 1.2, requiredLevel: 2, switchCost: 80000, description: '餐饮+快递', effects: ['产量+10%', '品质+15%', '人力+20%'] }),
]);

// 百货商场 (ID 103)
const DEPARTMENT_STORE_CONFIG: BuildingMethodConfig = createBuildingConfig(103, [
  createSlot(103, 'positioning', '定位策略', '🏬', '商场定位', 0),
], [
  createMethod(103, 0, 'positioning', 'dept_mass', '大众百货', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], qualityBonus: -0.1, laborMultiplier: 0.9, requiredLevel: 1, switchCost: 50000, description: '大众消费', effects: ['产量+20%', '品质-10%', '人力-10%'] }),
  createMethod(103, 1, 'positioning', 'dept_premium', '中高端', { qualityBonus: 0.15, laborMultiplier: 1.1, requiredLevel: 2, switchCost: 200000, description: '中高端定位', effects: ['品质+15%', '人力+10%'] }),
  createMethod(103, 2, 'positioning', 'dept_luxury', '奢侈品', { outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }], qualityBonus: 0.35, laborMultiplier: 1.5, requiredLevel: 4, switchCost: 600000, description: '顶级奢侈品', effects: ['产量-30%', '品质+35%', '人力+50%'] }),
]);

// 专卖店 (ID 104)
const SPECIALTY_STORE_CONFIG: BuildingMethodConfig = createBuildingConfig(104, [
  createSlot(104, 'focus', '专业程度', '🏪', '专卖店类型', 0),
], [
  createMethod(104, 0, 'focus', 'spec_general', '综合专卖', { outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }], qualityBonus: 0.05, requiredLevel: 1, switchCost: 30000, description: '品类专卖', effects: ['产量+10%', '品质+5%'] }),
  createMethod(104, 1, 'focus', 'spec_brand', '品牌旗舰', { qualityBonus: 0.2, laborMultiplier: 1.2, requiredLevel: 2, switchCost: 150000, description: '品牌旗舰店', effects: ['品质+20%', '人力+20%'] }),
]);

// 电商平台 (ID 105)
const ECOMMERCE_CONFIG: BuildingMethodConfig = createBuildingConfig(105, [
  createSlot(105, 'platform', '平台模式', '💻', '电商运营', 0),
], [
  createMethod(105, 0, 'platform', 'ec_basic', '基础电商', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], laborMultiplier: 0.8, energyMultiplier: 1.2, requiredLevel: 1, switchCost: 50000, description: '标准电商', effects: ['产量+20%', '人力-20%', '能耗+20%'] }),
  createMethod(105, 1, 'platform', 'ec_omni', '全渠道', { outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }], qualityBonus: 0.15, laborMultiplier: 1.0, energyMultiplier: 1.3, requiredLevel: 2, switchCost: 300000, description: '线上线下融合', effects: ['产量+30%', '品质+15%', '能耗+30%'] }),
  createMethod(105, 2, 'platform', 'ec_ai', 'AI驱动', { outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }], qualityBonus: 0.2, laborMultiplier: 0.5, energyMultiplier: 1.6, maintenanceMultiplier: 1.4, requiredLevel: 3, switchCost: 800000, description: 'AI智能电商', effects: ['产量+50%', '品质+20%', '人力-50%', '能耗+60%', '维护+40%'] }),
]);

// 批发市场 (ID 106)
const WHOLESALE_MARKET_CONFIG: BuildingMethodConfig = createBuildingConfig(106, [
  createSlot(106, 'scale', '经营规模', '📦', '批发规模', 0),
], [
  createMethod(106, 0, 'scale', 'whole_small', '小型批发', { outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }], laborMultiplier: 1.2, requiredLevel: 1, switchCost: 20000, description: '小规模批发', effects: ['产量-10%', '人力+20%'] }),
  createMethod(106, 1, 'scale', 'whole_large', '大型批发', { outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }], laborMultiplier: 0.8, energyMultiplier: 1.2, requiredLevel: 2, switchCost: 150000, description: '规模化批发', effects: ['产量+20%', '人力-20%', '能耗+20%'] }),
  createMethod(106, 2, 'scale', 'whole_smart', '智慧物流', { outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }], qualityBonus: 0.1, laborMultiplier: 0.5, energyMultiplier: 1.4, maintenanceMultiplier: 1.3, requiredLevel: 3, switchCost: 400000, description: '智能仓配', effects: ['产量+40%', '品质+10%', '人力-50%', '能耗+40%', '维护+30%'] }),
]);

// ==================== 导出和注册 ====================

export const MISC_CONFIGS: BuildingMethodConfig[] = [
  // 矿业扩展
  RARE_EARTH_MINE_CONFIG, LITHIUM_MINE_CONFIG, COBALT_MINE_CONFIG, NICKEL_MINE_CONFIG, TUNGSTEN_MINE_CONFIG,
  // 纺织扩展
  DYEING_FACTORY_CONFIG, KNITTING_FACTORY_CONFIG, GARMENT_FACTORY_CONFIG, LEATHER_FACTORY_CONFIG,
  // 建材扩展
  CERAMICS_FACTORY_CONFIG, BRICK_FACTORY_CONFIG, STONE_FACTORY_CONFIG, PRECAST_FACTORY_CONFIG, DECORATION_FACTORY_CONFIG,
  // 能源扩展
  WIND_POWER_FACTORY_CONFIG, BATTERY_FACTORY_CONFIG, HYDROGEN_FACTORY_CONFIG, NUCLEAR_FACTORY_CONFIG, GAS_PROCESSING_CONFIG,
  // 通信产业链
  TELECOM_EQUIPMENT_CONFIG, FIBER_OPTIC_CONFIG, SATELLITE_FACTORY_CONFIG, SMARTPHONE_FACTORY_CONFIG, CHIP_TESTING_CONFIG,
  // 服务业扩展
  HOTEL_CONFIG, RESTAURANT_CONFIG, EDUCATION_CONFIG, HOSPITAL_CONFIG, BANK_CONFIG,
  // 文化传媒
  FILM_STUDIO_CONFIG, GAME_STUDIO_CONFIG, PUBLISHER_CONFIG, AD_AGENCY_CONFIG, ENTERTAINMENT_CONFIG,
  // 杂项
  FURNITURE_FACTORY_CONFIG, TOY_FACTORY_CONFIG, SPORTS_FACTORY_CONFIG, TOBACCO_FACTORY_CONFIG, BREWERY_CONFIG,
  // 零售类
  SUPERMARKET_CONFIG, CONVENIENCE_STORE_CONFIG, DEPARTMENT_STORE_CONFIG, SPECIALTY_STORE_CONFIG, ECOMMERCE_CONFIG, WHOLESALE_MARKET_CONFIG,
];

/**
 * 注册所有其他产业链建筑的生产方式
 */
export function registerMiscMethods(): void {
  registerBuildingConfigs(MISC_CONFIGS);
}