/**
 * 服务类建筑专属生产方式
 * 建筑ID: 22-24 (发电厂、物流中心、研发中心)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 发电厂 (ID 22) ====================

const POWER_PLANT_CONFIG: BuildingMethodConfig = createBuildingConfig(
  22,
  [
    createSlot(22, 'generation', '发电方式', '⚡', '电力生产技术', 0),
    createSlot(22, 'fuel_type', '燃料类型', '🔥', '发电燃料选择', 1),
    createSlot(22, 'emission_control', '排放控制', '🌿', '污染物排放控制', 2),
  ],
  [
    // 发电方式
    createMethod(22, 0, 'generation', 'power_subcritical', '亚临界机组', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      inputModifiers: [{ goodsId: 3, multiplier: 1.0 }], // 煤炭
      energyMultiplier: 1.0, // 发电厂的能耗实际是燃料消耗
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 200000,
      description: '传统亚临界发电',
      effects: ['污染+20%'],
    }),
    createMethod(22, 1, 'generation', 'power_supercritical', '超临界机组', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      inputModifiers: [{ goodsId: 3, multiplier: 0.9 }],
      laborMultiplier: 0.9,
      pollutionMultiplier: 0.85,
      requiredLevel: 2,
      switchCost: 800000,
      description: '超临界发电，效率更高',
      effects: ['产量+15%', '煤耗-10%', '人力-10%', '污染-15%'],
    }),
    createMethod(22, 2, 'generation', 'power_ultra_supercritical', '超超临界机组', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      inputModifiers: [{ goodsId: 3, multiplier: 0.8 }],
      laborMultiplier: 0.8,
      maintenanceMultiplier: 1.2,
      pollutionMultiplier: 0.7,
      requiredLevel: 3,
      switchCost: 2000000,
      description: '超超临界，最高效率',
      effects: ['产量+30%', '煤耗-20%', '人力-20%', '维护+20%', '污染-30%'],
    }),
    createMethod(22, 3, 'generation', 'power_ccgt', '燃气联合循环', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      inputModifiers: [{ goodsId: 4, multiplier: 0.9 }], // 使用天然气/石油
      laborMultiplier: 0.7,
      maintenanceMultiplier: 1.15,
      pollutionMultiplier: 0.4,
      requiredLevel: 3,
      switchCost: 1500000,
      description: '燃气-蒸汽联合循环',
      effects: ['产量+20%', '燃料-10%', '人力-30%', '维护+15%', '污染-60%'],
    }),
    
    // 燃料类型
    createMethod(22, 10, 'fuel_type', 'power_coal', '动力煤', {
      inputModifiers: [{ goodsId: 3, multiplier: 1.0 }],
      pollutionMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 50000,
      description: '普通动力煤',
      effects: ['基础产能'],
    }),
    createMethod(22, 11, 'fuel_type', 'power_clean_coal', '洁净煤', {
      inputModifiers: [{ goodsId: 3, multiplier: 1.1 }],
      qualityBonus: 0.05,
      pollutionMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 200000,
      description: '洗选后的洁净煤',
      effects: ['煤耗+10%', '品质+5%', '污染-30%'],
    }),
    createMethod(22, 12, 'fuel_type', 'power_biomass', '生物质掺烧', {
      inputModifiers: [{ goodsId: 3, multiplier: 0.85 }],
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      pollutionMultiplier: 0.5,
      requiredLevel: 2,
      switchCost: 300000,
      description: '煤+生物质混烧',
      effects: ['煤耗-15%', '产量-5%', '污染-50%'],
    }),
    
    // 排放控制
    createMethod(22, 20, 'emission_control', 'power_basic_filter', '基础除尘', {
      maintenanceMultiplier: 1.1,
      pollutionMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 100000,
      description: '静电除尘',
      effects: ['维护+10%', '污染-20%'],
    }),
    createMethod(22, 21, 'emission_control', 'power_denitration', '脱硫脱硝', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.98 }],
      maintenanceMultiplier: 1.25,
      energyMultiplier: 1.05,
      pollutionMultiplier: 0.4,
      requiredLevel: 2,
      switchCost: 500000,
      description: 'SCR脱硝+湿法脱硫',
      effects: ['产量-2%', '维护+25%', '能耗+5%', '污染-60%'],
    }),
    createMethod(22, 22, 'emission_control', 'power_near_zero', '近零排放', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      maintenanceMultiplier: 1.5,
      energyMultiplier: 1.1,
      laborMultiplier: 1.1,
      pollutionMultiplier: 0.1,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '超低排放改造',
      effects: ['产量-5%', '维护+50%', '能耗+10%', '人力+10%', '污染-90%'],
    }),
  ]
);

// ==================== 物流中心 (ID 23) ====================

const LOGISTICS_CENTER_CONFIG: BuildingMethodConfig = createBuildingConfig(
  23,
  [
    createSlot(23, 'warehouse', '仓储方式', '📦', '仓库管理技术', 0),
    createSlot(23, 'transport', '运输方式', '🚚', '货物运输技术', 1),
    createSlot(23, 'management', '管理系统', '💻', '物流信息系统', 2),
  ],
  [
    // 仓储方式
    createMethod(23, 0, 'warehouse', 'logi_floor', '平面仓储', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      laborMultiplier: 1.5,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统平面仓库',
      effects: ['吞吐量-20%', '人力+50%', '速度-30%'],
    }),
    createMethod(23, 1, 'warehouse', 'logi_rack', '货架仓储', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      laborMultiplier: 1.1,
      productionSpeedMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 100000,
      description: '多层货架系统',
      effects: ['人力+10%'],
    }),
    createMethod(23, 2, 'warehouse', 'logi_automated', '自动化仓储', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.3 }],
      laborMultiplier: 0.4,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 3,
      switchCost: 800000,
      description: 'AS/RS自动化立体仓库',
      effects: ['吞吐量+30%', '人力-60%', '能耗+50%', '维护+40%', '速度+50%'],
    }),
    createMethod(23, 3, 'warehouse', 'logi_smart', '智能仓储', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      laborMultiplier: 0.25,
      energyMultiplier: 1.8,
      maintenanceMultiplier: 1.6,
      productionSpeedMultiplier: 1.8,
      requiredLevel: 4,
      switchCost: 2000000,
      description: 'AGV+机器人智能仓库',
      effects: ['吞吐量+50%', '人力-75%', '能耗+80%', '维护+60%', '速度+80%'],
    }),
    
    // 运输方式
    createMethod(23, 10, 'transport', 'logi_truck', '公路运输', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      pollutionMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 50000,
      description: '卡车公路运输',
      effects: ['污染+20%'],
    }),
    createMethod(23, 11, 'transport', 'logi_rail', '铁路运输', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      productionSpeedMultiplier: 0.9,
      pollutionMultiplier: 0.6,
      requiredLevel: 2,
      switchCost: 300000,
      description: '铁路货运',
      effects: ['吞吐量+15%', '速度-10%', '污染-40%'],
    }),
    createMethod(23, 12, 'transport', 'logi_multimodal', '多式联运', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      laborMultiplier: 0.85,
      pollutionMultiplier: 0.7,
      requiredLevel: 3,
      switchCost: 600000,
      description: '公铁水多式联运',
      effects: ['吞吐量+25%', '人力-15%', '污染-30%'],
    }),
    
    // 管理系统
    createMethod(23, 20, 'management', 'logi_manual', '人工管理', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.85 }],
      qualityBonus: -0.1,
      laborMultiplier: 1.4,
      requiredLevel: 1,
      switchCost: 10000,
      description: '纸质单据+人工调度',
      effects: ['吞吐量-15%', '品质-10%', '人力+40%'],
    }),
    createMethod(23, 21, 'management', 'logi_wms', 'WMS系统', {
      qualityBonus: 0.1,
      laborMultiplier: 0.9,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 150000,
      description: '仓储管理系统',
      effects: ['品质+10%', '人力-10%', '速度+10%'],
    }),
    createMethod(23, 22, 'management', 'logi_tms', 'TMS+WMS集成', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.75,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 400000,
      description: '运输+仓储管理集成',
      effects: ['吞吐量+10%', '品质+20%', '人力-25%', '维护+20%', '速度+20%'],
    }),
  ]
);

// ==================== 研发中心 (ID 24) ====================

const RND_CENTER_CONFIG: BuildingMethodConfig = createBuildingConfig(
  24,
  [
    createSlot(24, 'research_mode', '研发模式', '🔬', '研发组织方式', 0),
    createSlot(24, 'equipment', '实验设备', '🔧', '研发设备等级', 1),
    createSlot(24, 'collaboration', '合作方式', '🤝', '产学研合作', 2),
  ],
  [
    // 研发模式
    createMethod(24, 0, 'research_mode', 'rnd_basic', '基础研发', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      laborMultiplier: 1.0,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 50000,
      description: '基础产品改进',
      effects: ['产出-20%', '速度-20%'],
    }),
    createMethod(24, 1, 'research_mode', 'rnd_applied', '应用研发', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 200000,
      description: '面向应用的研发',
      effects: ['品质+10%', '人力+10%'],
    }),
    createMethod(24, 2, 'research_mode', 'rnd_frontier', '前沿研发', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.4,
      energyMultiplier: 1.3,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 3,
      switchCost: 600000,
      description: '尖端技术研发',
      effects: ['产出-10%', '品质+30%', '人力+40%', '能耗+30%', '速度-30%'],
    }),
    createMethod(24, 3, 'research_mode', 'rnd_breakthrough', '突破性研发', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.7 }],
      qualityBonus: 0.5,
      laborMultiplier: 1.8,
      energyMultiplier: 1.5,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '颠覆性创新研发',
      effects: ['产出-30%', '品质+50%', '人力+80%', '能耗+50%', '速度-50%'],
    }),
    
    // 实验设备
    createMethod(24, 10, 'equipment', 'rnd_basic_lab', '基础实验室', {
      qualityBonus: -0.1,
      energyMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 30000,
      description: '基本实验设备',
      effects: ['品质-10%', '能耗-20%'],
    }),
    createMethod(24, 11, 'equipment', 'rnd_advanced_lab', '先进实验室', {
      qualityBonus: 0.15,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 300000,
      description: '先进仪器设备',
      effects: ['品质+15%', '能耗+20%', '维护+20%'],
    }),
    createMethod(24, 12, 'equipment', 'rnd_cutting_edge', '尖端设备', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.3,
      laborMultiplier: 0.9,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.5,
      requiredLevel: 4,
      switchCost: 1000000,
      description: '世界级研发设备',
      effects: ['产出+10%', '品质+30%', '人力-10%', '能耗+50%', '维护+50%'],
    }),
    
    // 合作方式
    createMethod(24, 20, 'collaboration', 'rnd_internal', '内部研发', {
      qualityBonus: 0.0,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 1,
      switchCost: 10000,
      description: '独立内部研发',
      effects: ['速度-10%'],
    }),
    createMethod(24, 21, 'collaboration', 'rnd_university', '产学研合作', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.85,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 150000,
      description: '与高校院所合作',
      effects: ['产出+10%', '品质+15%', '人力-15%', '速度+10%'],
    }),
    createMethod(24, 22, 'collaboration', 'rnd_consortium', '联合研发', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.8,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 3,
      switchCost: 500000,
      description: '跨企业联合研发',
      effects: ['产出+20%', '品质+20%', '人力-20%', '速度+20%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const SERVICE_CONFIGS: BuildingMethodConfig[] = [
  POWER_PLANT_CONFIG,
  LOGISTICS_CENTER_CONFIG,
  RND_CENTER_CONFIG,
];

/**
 * 注册所有服务类建筑的生产方式
 */
export function registerServiceMethods(): void {
  registerBuildingConfigs(SERVICE_CONFIGS);
}