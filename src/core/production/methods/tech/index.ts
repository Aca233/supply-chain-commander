/**
 * 科技产业链建筑专属生产方式
 * 建筑ID: 47-51 (软件公司、数据中心、AI研究所、量子计算中心、光伏厂)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';

// ==================== 软件公司 (ID 47) ====================

const SOFTWARE_COMPANY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  47,
  [
    createSlot(47, 'development', '开发模式', '💻', '软件开发方法', 0),
    createSlot(47, 'testing', '测试方式', '🔍', '软件测试方法', 1),
  ],
  [
    // 开发模式
    createMethod(47, 0, 'development', 'soft_waterfall', '瀑布开发', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.1,
      laborMultiplier: 1.1,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 30000,
      description: '传统瀑布式开发',
      effects: ['产量-10%', '品质+10%', '人力+10%', '速度-20%'],
    }),
    createMethod(47, 1, 'development', 'soft_agile', '敏捷开发', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.05,
      laborMultiplier: 0.9,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 100000,
      description: 'Scrum/敏捷开发',
      effects: ['产量+10%', '品质+5%', '人力-10%', '速度+20%'],
    }),
    createMethod(47, 2, 'development', 'soft_devops', 'DevOps', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: 0.15,
      laborMultiplier: 0.75,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.4,
      requiredLevel: 3,
      switchCost: 400000,
      description: 'CI/CD自动化流程',
      effects: ['产量+25%', '品质+15%', '人力-25%', '能耗+30%', '维护+20%', '速度+40%'],
    }),
    
    // 测试方式
    createMethod(47, 10, 'testing', 'soft_manual_test', '手动测试', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: -0.1,
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.9,
      requiredLevel: 1,
      switchCost: 20000,
      description: '人工测试',
      effects: ['产量+5%', '品质-10%', '人力+30%', '速度-10%'],
    }),
    createMethod(47, 11, 'testing', 'soft_auto_test', '自动化测试', {
      qualityBonus: 0.15,
      laborMultiplier: 0.8,
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.15,
      productionSpeedMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 150000,
      description: '自动化测试框架',
      effects: ['品质+15%', '人力-20%', '能耗+20%', '维护+15%', '速度+10%'],
    }),
    createMethod(47, 12, 'testing', 'soft_ai_test', 'AI测试', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: 0.25,
      laborMultiplier: 0.6,
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 4,
      switchCost: 500000,
      description: 'AI智能测试',
      effects: ['产量+5%', '品质+25%', '人力-40%', '能耗+50%', '维护+30%', '速度+20%'],
    }),
  ]
);

// ==================== 数据中心 (ID 48) ====================

const DATA_CENTER_CONFIG: BuildingMethodConfig = createBuildingConfig(
  48,
  [
    createSlot(48, 'infrastructure', '基础设施', '🖥️', '数据中心架构', 0),
    createSlot(48, 'cooling', '散热方式', '❄️', '散热冷却技术', 1),
  ],
  [
    // 基础设施
    createMethod(48, 0, 'infrastructure', 'dc_traditional', '传统架构', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      energyMultiplier: 1.3,
      laborMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 200000,
      description: '传统服务器机房',
      effects: ['能耗+30%', '人力+20%'],
    }),
    createMethod(48, 1, 'infrastructure', 'dc_virtualized', '虚拟化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      energyMultiplier: 1.0,
      laborMultiplier: 0.8,
      maintenanceMultiplier: 1.1,
      requiredLevel: 2,
      switchCost: 500000,
      description: '虚拟化数据中心',
      effects: ['产量+20%', '人力-20%', '维护+10%'],
    }),
    createMethod(48, 2, 'infrastructure', 'dc_cloud', '云原生', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.4 }],
      energyMultiplier: 0.85,
      laborMultiplier: 0.5,
      maintenanceMultiplier: 1.25,
      requiredLevel: 3,
      switchCost: 1500000,
      description: '容器+微服务架构',
      effects: ['产量+40%', '能耗-15%', '人力-50%', '维护+25%'],
    }),
    
    // 散热方式
    createMethod(48, 10, 'cooling', 'dc_air_cooling', '风冷', {
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.0,
      requiredLevel: 1,
      switchCost: 100000,
      description: '精密空调风冷',
      effects: ['能耗+20%'],
    }),
    createMethod(48, 11, 'cooling', 'dc_water_cooling', '水冷', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 0.9,
      maintenanceMultiplier: 1.2,
      requiredLevel: 2,
      switchCost: 400000,
      description: '冷却水循环系统',
      effects: ['产量+10%', '能耗-10%', '维护+20%'],
    }),
    createMethod(48, 12, 'cooling', 'dc_immersion', '浸没式', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      energyMultiplier: 0.7,
      maintenanceMultiplier: 1.4,
      requiredLevel: 4,
      switchCost: 1000000,
      description: '液体浸没冷却',
      effects: ['产量+20%', '能耗-30%', '维护+40%'],
    }),
  ]
);

// ==================== AI研究所 (ID 49) ====================

const AI_INSTITUTE_CONFIG: BuildingMethodConfig = createBuildingConfig(
  49,
  [
    createSlot(49, 'computing', '算力配置', '🧠', 'AI计算能力', 0),
    createSlot(49, 'research', '研究方向', '🔬', 'AI研究领域', 1),
  ],
  [
    // 算力配置
    createMethod(49, 0, 'computing', 'ai_cpu', 'CPU集群', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      energyMultiplier: 1.0,
      laborMultiplier: 1.2,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 1,
      switchCost: 150000,
      description: 'CPU计算集群',
      effects: ['产量-20%', '人力+20%', '速度-30%'],
    }),
    createMethod(49, 1, 'computing', 'ai_gpu', 'GPU集群', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.2 }],
      energyMultiplier: 1.5,
      laborMultiplier: 0.9,
      maintenanceMultiplier: 1.3,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 800000,
      description: 'GPU深度学习集群',
      effects: ['产量+20%', '能耗+50%', '人力-10%', '维护+30%', '速度+30%'],
    }),
    createMethod(49, 2, 'computing', 'ai_tpu', 'TPU/专用芯片', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.5 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.3,
      laborMultiplier: 0.7,
      maintenanceMultiplier: 1.5,
      productionSpeedMultiplier: 1.6,
      requiredLevel: 4,
      switchCost: 3000000,
      description: '定制AI加速芯片',
      effects: ['产量+50%', '品质+20%', '能耗+30%', '人力-30%', '维护+50%', '速度+60%'],
    }),
    
    // 研究方向
    createMethod(49, 10, 'research', 'ai_applied', '应用研究', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.0,
      productionSpeedMultiplier: 1.2,
      requiredLevel: 1,
      switchCost: 50000,
      description: '应用AI产品研发',
      effects: ['产量+10%', '速度+20%'],
    }),
    createMethod(49, 11, 'research', 'ai_fundamental', '基础研究', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.8 }],
      qualityBonus: 0.3,
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.7,
      requiredLevel: 2,
      switchCost: 300000,
      description: '前沿AI理论研究',
      effects: ['产量-20%', '品质+30%', '人力+30%', '速度-30%'],
    }),
    createMethod(49, 12, 'research', 'ai_agi', 'AGI研究', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.6 }],
      qualityBonus: 0.5,
      laborMultiplier: 1.8,
      energyMultiplier: 1.5,
      productionSpeedMultiplier: 0.5,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '通用人工智能研究',
      effects: ['产量-40%', '品质+50%', '人力+80%', '能耗+50%', '速度-50%'],
    }),
  ]
);

// ==================== 量子计算中心 (ID 50) ====================

const QUANTUM_CENTER_CONFIG: BuildingMethodConfig = createBuildingConfig(
  50,
  [
    createSlot(50, 'qubits', '量子比特', '⚛️', '量子计算技术', 0),
    createSlot(50, 'cryogenics', '低温系统', '🧊', '超低温技术', 1),
  ],
  [
    // 量子比特
    createMethod(50, 0, 'qubits', 'qc_superconducting', '超导量子比特', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      qualityBonus: 0.1,
      energyMultiplier: 1.8,
      maintenanceMultiplier: 1.5,
      requiredLevel: 1,
      switchCost: 500000,
      description: '超导量子处理器',
      effects: ['品质+10%', '能耗+80%', '维护+50%'],
    }),
    createMethod(50, 1, 'qubits', 'qc_trapped_ion', '离子阱', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      qualityBonus: 0.25,
      energyMultiplier: 1.5,
      laborMultiplier: 1.2,
      maintenanceMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 1200000,
      description: '离子阱量子计算',
      effects: ['产量-10%', '品质+25%', '能耗+50%', '人力+20%', '维护+30%'],
    }),
    createMethod(50, 2, 'qubits', 'qc_photonic', '光量子', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.2,
      laborMultiplier: 0.9,
      maintenanceMultiplier: 1.4,
      requiredLevel: 3,
      switchCost: 2000000,
      description: '光子量子计算',
      effects: ['产量+10%', '品质+20%', '能耗+20%', '人力-10%', '维护+40%'],
    }),
    
    // 低温系统
    createMethod(50, 10, 'cryogenics', 'qc_helium', '液氦冷却', {
      energyMultiplier: 1.5,
      maintenanceMultiplier: 1.4,
      requiredLevel: 1,
      switchCost: 300000,
      description: '液氦稀释制冷',
      effects: ['能耗+50%', '维护+40%'],
    }),
    createMethod(50, 11, 'cryogenics', 'qc_advanced_cryo', '先进制冷', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      energyMultiplier: 1.2,
      maintenanceMultiplier: 1.6,
      requiredLevel: 3,
      switchCost: 800000,
      description: '高效率稀释制冷机',
      effects: ['产量+10%', '能耗+20%', '维护+60%'],
    }),
  ]
);

// ==================== 光伏厂 (ID 51) ====================

const SOLAR_FACTORY_CONFIG: BuildingMethodConfig = createBuildingConfig(
  51,
  [
    createSlot(51, 'cell_type', '电池类型', '☀️', '光伏电池技术', 0),
    createSlot(51, 'manufacturing', '制造工艺', '🏭', '电池制造技术', 1),
  ],
  [
    // 电池类型
    createMethod(51, 0, 'cell_type', 'pv_poly', '多晶硅', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.15 }],
      qualityBonus: -0.1,
      inputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      requiredLevel: 1,
      switchCost: 100000,
      description: '多晶硅电池',
      effects: ['产量+15%', '品质-10%', '原料-10%'],
    }),
    createMethod(51, 1, 'cell_type', 'pv_mono', '单晶硅', {
      qualityBonus: 0.1,
      inputModifiers: [{ goodsId: 'all', multiplier: 1.0 }],
      requiredLevel: 2,
      switchCost: 300000,
      description: '单晶硅电池',
      effects: ['品质+10%'],
    }),
    createMethod(51, 2, 'cell_type', 'pv_perc', 'PERC电池', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.05 }],
      qualityBonus: 0.2,
      energyMultiplier: 1.15,
      requiredLevel: 3,
      switchCost: 600000,
      description: '钝化发射极电池',
      effects: ['产量+5%', '品质+20%', '能耗+15%'],
    }),
    createMethod(51, 3, 'cell_type', 'pv_hjt', 'HJT异质结', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.95 }],
      qualityBonus: 0.35,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.3,
      requiredLevel: 4,
      switchCost: 1500000,
      description: '异质结电池',
      effects: ['产量-5%', '品质+35%', '能耗+30%', '维护+30%'],
    }),
    
    // 制造工艺
    createMethod(51, 10, 'manufacturing', 'pv_manual', '半自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 0.9 }],
      laborMultiplier: 1.3,
      productionSpeedMultiplier: 0.8,
      requiredLevel: 1,
      switchCost: 50000,
      description: '半自动生产线',
      effects: ['产量-10%', '人力+30%', '速度-20%'],
    }),
    createMethod(51, 11, 'manufacturing', 'pv_automated', '全自动化', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      qualityBonus: 0.1,
      laborMultiplier: 0.6,
      energyMultiplier: 1.3,
      maintenanceMultiplier: 1.2,
      productionSpeedMultiplier: 1.3,
      requiredLevel: 2,
      switchCost: 400000,
      description: '全自动生产线',
      effects: ['产量+10%', '品质+10%', '人力-40%', '能耗+30%', '维护+20%', '速度+30%'],
    }),
    createMethod(51, 12, 'manufacturing', 'pv_smart', '智能制造', {
      outputModifiers: [{ goodsId: 'all', multiplier: 1.25 }],
      qualityBonus: 0.2,
      laborMultiplier: 0.4,
      energyMultiplier: 1.4,
      maintenanceMultiplier: 1.4,
      productionSpeedMultiplier: 1.5,
      requiredLevel: 4,
      switchCost: 1200000,
      description: 'AI智能工厂',
      effects: ['产量+25%', '品质+20%', '人力-60%', '能耗+40%', '维护+40%', '速度+50%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const TECH_CONFIGS: BuildingMethodConfig[] = [
  SOFTWARE_COMPANY_CONFIG,
  DATA_CENTER_CONFIG,
  AI_INSTITUTE_CONFIG,
  QUANTUM_CENTER_CONFIG,
  SOLAR_FACTORY_CONFIG,
];

/**
 * 注册所有科技产业链建筑的生产方式
 */
export function registerTechMethods(): void {
  registerBuildingConfigs(TECH_CONFIGS);
}