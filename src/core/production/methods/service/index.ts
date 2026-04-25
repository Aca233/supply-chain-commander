/**
 * 服务类建筑专属生产方式
 * 重构版本：适配新的1种服务建筑（ID 39）
 * 
 * 建筑列表：
 * 39: 发电厂 (POWER_PLANT)
 */

import { BuildingMethodConfig } from '../types';
import { createSlot, createMethod, createBuildingConfig, registerBuildingConfigs } from '../registry';
import { GoodsId } from '../../../../data/goods';
import { BuildingId } from '../../../../data/buildings';

// ==================== 发电厂 (ID 39) ====================
const POWER_PLANT_CONFIG: BuildingMethodConfig = createBuildingConfig(
  BuildingId.POWER_PLANT,
  [
    createSlot(39, 'fuel_type', '燃料类型', '⚡', '发电燃料来源', 0),
    createSlot(39, 'efficiency', '效率等级', '📊', '发电效率技术', 1),
    createSlot(39, 'emission', '排放控制', '🌿', '污染排放控制', 2),
  ],
  [
    // 槽位0: 燃料类型
    createMethod(39, 0, 'fuel_type', 'power_coal', '燃煤发电', {
      inputModifiers: [{ goodsId: GoodsId.COAL, multiplier: 1.0 }],
      outputModifiers: [{ goodsId: GoodsId.ELECTRICITY, multiplier: 1.0 }],
      pollutionMultiplier: 1.5,
      requiredLevel: 1, switchCost: 500000,
      description: '传统燃煤发电',
      effects: ['基础产能', '污染+50%'],
    }),
    createMethod(39, 1, 'fuel_type', 'power_gas', '燃气发电', {
      inputModifiers: [{ goodsId: GoodsId.NATURAL_GAS, multiplier: 1.0 }],
      outputModifiers: [{ goodsId: GoodsId.ELECTRICITY, multiplier: 1.1 }],
      pollutionMultiplier: 0.7, maintenanceMultiplier: 1.1,
      requiredLevel: 2, switchCost: 1500000,
      description: '清洁天然气发电',
      effects: ['产量+10%', '污染-30%', '维护+10%'],
    }),
    createMethod(39, 2, 'fuel_type', 'power_combined', '联合循环', {
      inputModifiers: [{ goodsId: GoodsId.NATURAL_GAS, multiplier: 0.85 }],
      outputModifiers: [{ goodsId: GoodsId.ELECTRICITY, multiplier: 1.25 }],
      pollutionMultiplier: 0.5, maintenanceMultiplier: 1.3, laborMultiplier: 1.2,
      requiredLevel: 3, switchCost: 5000000,
      description: '燃气蒸汽联合循环',
      effects: ['产量+25%', '燃料-15%', '污染-50%', '维护+30%', '人力+20%'],
    }),

    // 槽位1: 效率等级
    createMethod(39, 10, 'efficiency', 'power_subcritical', '亚临界', {
      outputModifiers: [{ goodsId: GoodsId.ELECTRICITY, multiplier: 0.95 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 1.1 }],
      maintenanceMultiplier: 0.9,
      requiredLevel: 1, switchCost: 200000,
      description: '亚临界机组',
      effects: ['产量-5%', '燃料+10%', '维护-10%'],
    }),
    createMethod(39, 11, 'efficiency', 'power_supercritical', '超临界', {
      outputModifiers: [{ goodsId: GoodsId.ELECTRICITY, multiplier: 1.1 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.92 }],
      maintenanceMultiplier: 1.1,
      requiredLevel: 2, switchCost: 800000,
      description: '超临界机组',
      effects: ['产量+10%', '燃料-8%', '维护+10%'],
    }),
    createMethod(39, 12, 'efficiency', 'power_ultra_supercritical', '超超临界', {
      outputModifiers: [{ goodsId: GoodsId.ELECTRICITY, multiplier: 1.25 }],
      inputModifiers: [{ goodsId: 'all', multiplier: 0.82 }],
      maintenanceMultiplier: 1.25, laborMultiplier: 1.15,
      requiredLevel: 3, switchCost: 3000000,
      description: '超超临界机组',
      effects: ['产量+25%', '燃料-18%', '维护+25%', '人力+15%'],
    }),

    // 槽位2: 排放控制
    createMethod(39, 20, 'emission', 'power_basic_filter', '基础过滤', {
      pollutionMultiplier: 0.9, maintenanceMultiplier: 1.05,
      requiredLevel: 1, switchCost: 100000,
      description: '基础烟气过滤',
      effects: ['污染-10%', '维护+5%'],
    }),
    createMethod(39, 21, 'emission', 'power_scrubber', '脱硫脱硝', {
      pollutionMultiplier: 0.5, maintenanceMultiplier: 1.2, energyMultiplier: 1.05,
      requiredLevel: 2, switchCost: 600000,
      description: '脱硫脱硝系统',
      effects: ['污染-50%', '维护+20%', '自耗电+5%'],
    }),
    createMethod(39, 22, 'emission', 'power_carbon_capture', '碳捕获', {
      pollutionMultiplier: 0.15, maintenanceMultiplier: 1.5, energyMultiplier: 1.15, laborMultiplier: 1.2,
      requiredLevel: 3, switchCost: 2000000,
      description: 'CCS碳捕获与封存',
      effects: ['污染-85%', '维护+50%', '自耗电+15%', '人力+20%'],
    }),
  ]
);

// ==================== 导出和注册 ====================

export const SERVICE_CONFIGS: BuildingMethodConfig[] = [
  POWER_PLANT_CONFIG, // ID 39
];

/**
 * 注册所有服务类建筑的生产方式
 * 共1种建筑（ID 39），每种3个槽位
 */
export function registerServiceMethods(): void {
  registerBuildingConfigs(SERVICE_CONFIGS);
}