/**
 * Static default production-method catalog.
 *
 * 每个建筑只暴露一个 `variants` 数组：
 * - variants[0] 是默认配方（同时也是 modeId=0）
 * - 后续每项都是有名字的备选模式（与 unlockLevel 配合解锁）
 *
 * 不再有顶层的 inputs/outputs/labor/energy/ticks 复制份。
 */

import type { WorkforceDemand } from '@/core/labor/LaborSystem';
import { BUILDINGS_BY_ID, isRetailBuilding } from '@/data/buildings';
import { GoodsId } from '@/data/goods';
import { createBuildingConfig, createMethod, createSlot } from './registry';
import { BuildingMethodConfig, RecipeDelta } from './types';
import { getExpandedBuildingMethodConfig } from './expanded';

export interface BuildingProductionIO {
  goodsId: number;
  amount: number;
}

export interface BuildingProductionVariantDefinition {
  modeId: number;
  name: string;
  inputs: BuildingProductionIO[];
  outputs: BuildingProductionIO[];
  ticksRequired: number;
  workforceRequired: WorkforceDemand;
  energyRequired: number;
  unlockLevel?: number;
}

export interface DefaultBuildingProductionDefinition {
  variants: BuildingProductionVariantDefinition[];
}

const EMPTY_RETAIL_PRODUCTION: DefaultBuildingProductionDefinition = {
  variants: [],
};

export function workforceFor(buildingTypeId: number, total: number): WorkforceDemand {
  if (isRetailBuilding(buildingTypeId)) {
    return {
      basic: Math.max(0, Math.round(total * 0.75)),
      technical: Math.max(0, Math.round(total * 0.05)),
      management: Math.max(1, Math.ceil(total * 0.20)),
    };
  }

  if ([28, 34, 35, 36].includes(buildingTypeId)) {
    return {
      basic: Math.max(0, Math.round(total * 0.45)),
      technical: Math.max(0, Math.round(total * 0.45)),
      management: Math.max(1, Math.ceil(total * 0.10)),
    };
  }

  if ([17, 18, 27, 29, 30, 31, 32, 39].includes(buildingTypeId)) {
    return {
      basic: Math.max(0, Math.round(total * 0.60)),
      technical: Math.max(0, Math.round(total * 0.30)),
      management: Math.max(1, Math.ceil(total * 0.10)),
    };
  }

  if ([38].includes(buildingTypeId)) {
    return {
      basic: Math.max(0, Math.round(total * 0.55)),
      technical: Math.max(0, Math.round(total * 0.25)),
      management: Math.max(1, Math.ceil(total * 0.20)),
    };
  }

  return {
    basic: Math.max(0, Math.round(total * 0.82)),
    technical: Math.max(0, Math.round(total * 0.10)),
    management: Math.max(1, Math.ceil(total * 0.08)),
  };
}

export const DEFAULT_BUILDING_PRODUCTION_BY_ID: Record<number, DefaultBuildingProductionDefinition> = {

  // ======== 采掘类 ID 0-14 ========
  // 设计原则：basePrice 口径下覆盖维护、能耗、投入和工资，并保留基础利润空间；ticksRequired=1（日产=amount）
  // 固定成本/天：0=8k 1=8.9k 2=8.4k 3=13k 4=46k 5=36.5k 6=8.4k 7=12k 8=16k 9=4.5k 10=5.1k 11=5.8k 12=10.7k 13=7.8k 14=6.4k

    0: {
  variants: [
    {
      modeId: 0,
      name: '铁矿开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.IRON_ORE, amount: 215 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(0, 50),
      energyRequired: 200,
    },
  ],
  },

    1: {
  variants: [
    {
      modeId: 0,
      name: '铜矿开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.COPPER_ORE, amount: 150 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(1, 50),
      energyRequired: 220,
    },
  ],
  },

    2: {
  variants: [
    {
      modeId: 0,
      name: '铝矿开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.BAUXITE, amount: 250 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(2, 50),
      energyRequired: 200,
    },
  ],
  },

    3: {
  variants: [
    {
      modeId: 0,
      name: '煤炭开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.COAL, amount: 102 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(3, 55),
      energyRequired: 220,
    },
  ],
  },

    4: {
  variants: [
    {
      modeId: 0,
      name: '原油开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.CRUDE_OIL, amount: 260 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(4, 45),
      energyRequired: 480,
    },
  ],
  },

    5: {
  variants: [
    {
      modeId: 0,
      name: '天然气开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.NATURAL_GAS, amount: 280 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(5, 38),
      energyRequired: 420,
    },
  ],
  },

    6: {
  variants: [
    {
      modeId: 0,
      name: '硅矿开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.SILICON, amount: 310 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(6, 45),
      energyRequired: 180,
    },
  ],
  },

    7: {
  variants: [
    {
      modeId: 0,
      name: '锂矿开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.LITHIUM, amount: 117 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(7, 55),
      energyRequired: 280,
    },
  ],
  },

    8: {
  variants: [
    {
      modeId: 0,
      name: '稀土开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.RARE_EARTH, amount: 102 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(8, 60),
      energyRequired: 250,
    },
  ],
  },

    9: {
  variants: [
    {
      modeId: 0,
      name: '木材采伐',
      inputs: [],
      outputs: [{ goodsId: GoodsId.TIMBER, amount: 500 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(9, 60),
      energyRequired: 100,
    },
  ],
  },

    10: {
  variants: [
    {
      modeId: 0,
      name: '粮食种植',
      inputs: [],
      outputs: [{ goodsId: GoodsId.GRAIN, amount: 1100 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(10, 80),
      energyRequired: 50,
    },
    {
      modeId: 1,
      name: '棉花种植',
      inputs: [],
      outputs: [{ goodsId: GoodsId.COTTON, amount: 700 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(10, 70),
      energyRequired: 40,
      unlockLevel: 2,
    },
  ],
  },

    11: {
  variants: [
    {
      modeId: 0,
      name: '橡胶种植',
      inputs: [],
      outputs: [{ goodsId: GoodsId.RUBBER_RAW, amount: 250 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(11, 60),
      energyRequired: 50,
    },
  ],
  },

    12: {
  variants: [
    {
      modeId: 0,
      name: '畜牧养殖',
      inputs: [{ goodsId: GoodsId.GRAIN, amount: 80 }],
      outputs: [{ goodsId: GoodsId.LIVESTOCK, amount: 55 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(12, 100),
      energyRequired: 80,
    },
  ],
  },

    13: {
  variants: [
    {
      modeId: 0,
      name: '渔获捕捞',
      inputs: [],
      outputs: [{ goodsId: GoodsId.SEAFOOD, amount: 340 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(13, 50),
      energyRequired: 60,
    },
  ],
  },

    14: {
  variants: [
    {
      modeId: 0,
      name: '药材种植',
      inputs: [],
      outputs: [{ goodsId: GoodsId.HERBS, amount: 86 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(14, 40),
      energyRequired: 30,
    },
  ],
  },

  // ======== 加工类 ID 15-26 ========
  // 固定成本/天：15=108k 16=45.5k 17=122k 18=77k 19=39k 20=48.5k 21=10.2k 22=12.5k 23=20.5k 24=19k 25=16.3k 26=35k

    15: {
  variants: [
    {
      modeId: 0,
      name: '炼钢',
      inputs: [
          { goodsId: GoodsId.IRON_ORE, amount: 200 },
          { goodsId: GoodsId.COAL, amount: 80 },
        ],
      outputs: [{ goodsId: GoodsId.STEEL, amount: 280 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(15, 160),
      energyRequired: 960,
    },
  ],
  },

    16: {
  variants: [
    {
      modeId: 0,
      name: '铜冶炼',
      inputs: [{ goodsId: GoodsId.COPPER_ORE, amount: 200 }],
      outputs: [{ goodsId: GoodsId.COPPER, amount: 350 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(16, 60),
      energyRequired: 400,
    },
    {
      modeId: 1,
      name: '铝冶炼',
      inputs: [{ goodsId: GoodsId.BAUXITE, amount: 400 }],
      outputs: [{ goodsId: GoodsId.ALUMINUM, amount: 620 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(16, 45),
      energyRequired: 600,
      unlockLevel: 2,
    },
  ],
  },

    17: {
  variants: [
    {
      modeId: 0,
      name: '炼油',
      inputs: [{ goodsId: GoodsId.CRUDE_OIL, amount: 300 }],
      outputs: [
          { goodsId: GoodsId.FUEL, amount: 500 },
          { goodsId: GoodsId.PLASTIC, amount: 500 },
        ],
      ticksRequired: 1,
      workforceRequired: workforceFor(17, 95),
      energyRequired: 980,
    },
  ],
  },

    18: {
  variants: [
    {
      modeId: 0,
      name: '化学品生产',
      inputs: [
          { goodsId: GoodsId.CRUDE_OIL, amount: 100 },
          { goodsId: GoodsId.NATURAL_GAS, amount: 80 },
        ],
      outputs: [{ goodsId: GoodsId.CHEMICALS, amount: 480 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(18, 75),
      energyRequired: 650,
    },
    {
      modeId: 1,
      name: '橡胶制品生产',
      inputs: [
          { goodsId: GoodsId.RUBBER_RAW, amount: 200 },
          { goodsId: GoodsId.CHEMICALS, amount: 50 },
        ],
      outputs: [{ goodsId: GoodsId.RUBBER, amount: 1180 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(18, 55),
      energyRequired: 220,
      unlockLevel: 2,
    },
  ],
  },

    19: {
  variants: [
    {
      modeId: 0,
      name: '玻璃熔制',
      inputs: [{ goodsId: GoodsId.SILICON, amount: 200 }],
      outputs: [{ goodsId: GoodsId.GLASS, amount: 300 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(19, 55),
      energyRequired: 560,
    },
  ],
  },

    20: {
  variants: [
    {
      modeId: 0,
      name: '水泥烧制',
      inputs: [
          { goodsId: GoodsId.SILICON, amount: 150 },
          { goodsId: GoodsId.COAL, amount: 80 },
        ],
      outputs: [{ goodsId: GoodsId.CEMENT, amount: 800 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(20, 75),
      energyRequired: 720,
    },
  ],
  },

    21: {
  variants: [
    {
      modeId: 0,
      name: '纸张抄造',
      inputs: [{ goodsId: GoodsId.TIMBER, amount: 150 }],
      outputs: [{ goodsId: GoodsId.PAPER, amount: 512 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(21, 40),
      energyRequired: 200,
    },
  ],
  },

    22: {
  variants: [
    {
      modeId: 0,
      name: '纺织品生产',
      inputs: [{ goodsId: GoodsId.COTTON, amount: 200 }],
      outputs: [{ goodsId: GoodsId.TEXTILES, amount: 400 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(22, 60),
      energyRequired: 150,
    },
    {
      modeId: 1,
      name: '丝绸生产',
      inputs: [{ goodsId: GoodsId.COTTON, amount: 100 }],
      outputs: [{ goodsId: GoodsId.SILK, amount: 115 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(22, 80),
      energyRequired: 120,
      unlockLevel: 2,
    },
  ],
  },

    23: {
  variants: [
    {
      modeId: 0,
      name: '食品加工',
      inputs: [{ goodsId: GoodsId.GRAIN, amount: 200 }],
      outputs: [{ goodsId: GoodsId.PROCESSED_FOOD, amount: 1400 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(23, 50),
      energyRequired: 120,
    },
    {
      modeId: 1,
      name: '饮料生产',
      inputs: [{ goodsId: GoodsId.GRAIN, amount: 120 }],
      outputs: [{ goodsId: GoodsId.BEVERAGES, amount: 3500 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(23, 40),
      energyRequired: 90,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '零食生产',
      inputs: [
          { goodsId: GoodsId.GRAIN, amount: 160 },
          { goodsId: GoodsId.PACKAGING, amount: 40 },
        ],
      outputs: [{ goodsId: GoodsId.SNACKS, amount: 2300 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(23, 30),
      energyRequired: 80,
      unlockLevel: 2,
    },
    {
      modeId: 3,
      name: '食品成品生产',
      inputs: [{ goodsId: GoodsId.PROCESSED_FOOD, amount: 600 }],
      outputs: [{ goodsId: GoodsId.FOOD, amount: 2500 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(23, 40),
      energyRequired: 80,
      unlockLevel: 2,
    },
    {
      modeId: 4,
      name: '宠物食品生产',
      inputs: [
          { goodsId: GoodsId.MEAT, amount: 40 },
          { goodsId: GoodsId.GRAIN, amount: 60 },
        ],
      outputs: [{ goodsId: GoodsId.PET_FOOD, amount: 660 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(23, 35),
      energyRequired: 90,
      unlockLevel: 3,
    },
    {
      modeId: 5,
      name: '有机食品生产',
      inputs: [
          { goodsId: GoodsId.GRAIN, amount: 80 },
          { goodsId: GoodsId.DAIRY, amount: 30 },
        ],
      outputs: [{ goodsId: GoodsId.ORGANIC_FOOD, amount: 360 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(23, 50),
      energyRequired: 100,
      unlockLevel: 2,
    },
  ],
  },

  // ======== 加工类续 ID 24-26 ========

    24: {
  variants: [
    {
      modeId: 0,
      name: '肉类加工',
      inputs: [{ goodsId: GoodsId.LIVESTOCK, amount: 20 }],
      outputs: [{ goodsId: GoodsId.MEAT, amount: 750 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(24, 60),
      energyRequired: 150,
    },
    {
      modeId: 1,
      name: '冷冻食品生产',
      inputs: [
          { goodsId: GoodsId.MEAT, amount: 80 },
          { goodsId: GoodsId.SEAFOOD, amount: 40 },
        ],
      outputs: [{ goodsId: GoodsId.FROZEN_FOOD, amount: 700 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(24, 50),
      energyRequired: 200,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '罐头食品生产',
      inputs: [
          { goodsId: GoodsId.MEAT, amount: 60 },
          { goodsId: GoodsId.PROCESSED_FOOD, amount: 20 },
        ],
      outputs: [{ goodsId: GoodsId.CANNED_FOOD, amount: 850 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(24, 45),
      energyRequired: 120,
    },
  ],
  },

    25: {
  variants: [
    {
      modeId: 0,
      name: '乳品加工',
      inputs: [{ goodsId: GoodsId.LIVESTOCK, amount: 14 }],
      outputs: [{ goodsId: GoodsId.DAIRY, amount: 1120 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(25, 30),
      energyRequired: 100,
    },
  ],
  },

    26: {
  variants: [
    {
      modeId: 0,
      name: '建筑材料生产',
      inputs: [
          { goodsId: GoodsId.CEMENT, amount: 300 },
          { goodsId: GoodsId.STEEL, amount: 100 },
          { goodsId: GoodsId.GLASS, amount: 50 },
        ],
      outputs: [{ goodsId: GoodsId.BUILDING_MATERIALS, amount: 1000 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(26, 80),
      energyRequired: 380,
    },
    {
      modeId: 1,
      name: '包装材料生产',
      inputs: [
          { goodsId: GoodsId.PAPER, amount: 120 },
          { goodsId: GoodsId.PLASTIC, amount: 40 },
        ],
      outputs: [{ goodsId: GoodsId.PACKAGING, amount: 900 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(26, 45),
      energyRequired: 140,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '建材成品生产',
      inputs: [
          { goodsId: GoodsId.BUILDING_MATERIALS, amount: 500 },
          { goodsId: GoodsId.GLASS, amount: 80 },
        ],
      outputs: [{ goodsId: GoodsId.BUILDING_PRODUCTS, amount: 780 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(26, 60),
      energyRequired: 220,
      unlockLevel: 2,
    },
  ],
  },

  // ======== 制造类 ID 27-36 ========
  // 固定成本/天：27=88k 28=375k 29=95k 30=70k 31=174k 32=79k 33=24k 34=78k 35=136k 36=145k

    27: {
  variants: [
    {
      modeId: 0,
      name: '电子元件生产',
      inputs: [
          { goodsId: GoodsId.COPPER, amount: 200 },
          { goodsId: GoodsId.PLASTIC, amount: 150 },
        ],
      outputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 230 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(27, 75),
      energyRequired: 300,
    },
    {
      modeId: 1,
      name: '智能手机组装',
      inputs: [
          { goodsId: GoodsId.ELECTRONICS, amount: 60 },
          { goodsId: GoodsId.CHIPS, amount: 12 },
          { goodsId: GoodsId.BATTERY, amount: 10 },
          { goodsId: GoodsId.SCREEN, amount: 20 },
        ],
      outputs: [{ goodsId: GoodsId.SMARTPHONE, amount: 65 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(27, 95),
      energyRequired: 180,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '电脑组装',
      inputs: [
          { goodsId: GoodsId.ELECTRONICS, amount: 50 },
          { goodsId: GoodsId.CHIPS, amount: 18 },
          { goodsId: GoodsId.SCREEN, amount: 8 },
          { goodsId: GoodsId.PLASTIC, amount: 30 },
        ],
      outputs: [{ goodsId: GoodsId.COMPUTER, amount: 45 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(27, 120),
      energyRequired: 240,
      unlockLevel: 2,
    },
    {
      modeId: 3,
      name: '无人机生产',
      inputs: [
          { goodsId: GoodsId.ELECTRONICS, amount: 60 },
          { goodsId: GoodsId.CHIPS, amount: 10 },
          { goodsId: GoodsId.BATTERY, amount: 8 },
          { goodsId: GoodsId.PLASTIC, amount: 30 },
          { goodsId: GoodsId.MOTOR, amount: 12 },
        ],
      outputs: [{ goodsId: GoodsId.DRONE, amount: 107 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(27, 90),
      energyRequired: 180,
      unlockLevel: 3,
    },
  ],
  },

    28: {
  variants: [
    {
      modeId: 0,
      name: '芯片制造',
      inputs: [
          { goodsId: GoodsId.SILICON, amount: 300 },
          { goodsId: GoodsId.RARE_EARTH, amount: 30 },
          { goodsId: GoodsId.CHEMICALS, amount: 200 },
        ],
      outputs: [{ goodsId: GoodsId.CHIPS, amount: 265 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(28, 180),
      energyRequired: 900,
    },
  ],
  },

    29: {
  variants: [
    {
      modeId: 0,
      name: '电池生产',
      inputs: [
          { goodsId: GoodsId.LITHIUM, amount: 150 },
          { goodsId: GoodsId.COPPER, amount: 100 },
          { goodsId: GoodsId.CHEMICALS, amount: 150 },
        ],
      outputs: [{ goodsId: GoodsId.BATTERY, amount: 500 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(29, 50),
      energyRequired: 350,
    },
    {
      modeId: 1,
      name: '储能系统生产',
      inputs: [
          { goodsId: GoodsId.BATTERY, amount: 100 },
          { goodsId: GoodsId.ELECTRONICS, amount: 60 },
        ],
      outputs: [{ goodsId: GoodsId.ENERGY_STORAGE, amount: 21 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(29, 80),
      energyRequired: 300,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '光伏系统组装',
      inputs: [
          { goodsId: GoodsId.SOLAR_PANEL, amount: 100 },
          { goodsId: GoodsId.ELECTRONICS, amount: 60 },
          { goodsId: GoodsId.BATTERY, amount: 20 },
        ],
      outputs: [{ goodsId: GoodsId.SOLAR_SYSTEM, amount: 26 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(29, 120),
      energyRequired: 250,
      unlockLevel: 3,
    },
  ],
  },

    30: {
  variants: [
    {
      modeId: 0,
      name: '电机生产',
      inputs: [
          { goodsId: GoodsId.COPPER, amount: 200 },
          { goodsId: GoodsId.STEEL, amount: 150 },
          { goodsId: GoodsId.RARE_EARTH, amount: 20 },
        ],
      outputs: [{ goodsId: GoodsId.MOTOR, amount: 600 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(30, 90),
      energyRequired: 320,
    },
    {
      modeId: 1,
      name: '屏幕生产',
      inputs: [
          { goodsId: GoodsId.GLASS, amount: 120 },
          { goodsId: GoodsId.ELECTRONICS, amount: 60 },
          { goodsId: GoodsId.RARE_EARTH, amount: 8 },
        ],
      outputs: [{ goodsId: GoodsId.SCREEN, amount: 650 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(30, 70),
      energyRequired: 250,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '汽车零部件生产',
      inputs: [
          { goodsId: GoodsId.STEEL, amount: 300 },
          { goodsId: GoodsId.PLASTIC, amount: 100 },
        ],
      outputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 590 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(30, 140),
      energyRequired: 420,
    },
    {
      modeId: 3,
      name: '机械部件生产',
      inputs: [
          { goodsId: GoodsId.STEEL, amount: 200 },
          { goodsId: GoodsId.ALUMINUM, amount: 100 },
        ],
      outputs: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 1050 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(30, 70),
      energyRequired: 220,
    },
    {
      modeId: 4,
      name: '航空部件生产',
      inputs: [
          { goodsId: GoodsId.ALUMINUM, amount: 200 },
          { goodsId: GoodsId.STEEL, amount: 100 },
          { goodsId: GoodsId.RARE_EARTH, amount: 20 },
        ],
      outputs: [{ goodsId: GoodsId.AIRCRAFT_PARTS, amount: 216 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(30, 120),
      energyRequired: 350,
      unlockLevel: 3,
    },
    {
      modeId: 5,
      name: '服装面料生产',
      inputs: [{ goodsId: GoodsId.TEXTILES, amount: 200 }],
      outputs: [{ goodsId: GoodsId.CLOTHING_FABRIC, amount: 1330 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(30, 50),
      energyRequired: 100,
    },
  ],
  },

    31: {
  variants: [
    {
      modeId: 0,
      name: '燃油汽车组装',
      inputs: [
          { goodsId: GoodsId.CAR_PARTS, amount: 100 },
          { goodsId: GoodsId.ELECTRONICS, amount: 60 },
          { goodsId: GoodsId.RUBBER, amount: 50 },
          { goodsId: GoodsId.GLASS, amount: 40 },
        ],
      outputs: [{ goodsId: GoodsId.CAR, amount: 4 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(31, 240),
      energyRequired: 520,
    },
    {
      modeId: 1,
      name: '电动汽车组装',
      inputs: [
          { goodsId: GoodsId.CAR_PARTS, amount: 80 },
          { goodsId: GoodsId.BATTERY, amount: 60 },
          { goodsId: GoodsId.MOTOR, amount: 15 },
          { goodsId: GoodsId.ELECTRONICS, amount: 80 },
        ],
      outputs: [{ goodsId: GoodsId.ELECTRIC_CAR, amount: 3 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(31, 260),
      energyRequired: 560,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '豪华汽车组装',
      inputs: [
          { goodsId: GoodsId.CAR_PARTS, amount: 80 },
          { goodsId: GoodsId.ELECTRONICS, amount: 80 },
          { goodsId: GoodsId.GOLD, amount: 1 },
          { goodsId: GoodsId.GLASS, amount: 60 },
        ],
      outputs: [{ goodsId: GoodsId.LUXURY_CAR, amount: 1 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(31, 300),
      energyRequired: 500,
      unlockLevel: 3,
    },
  ],
  },

    32: {
  variants: [
    {
      modeId: 0,
      name: '家电组装',
      inputs: [
          { goodsId: GoodsId.STEEL, amount: 50 },
          { goodsId: GoodsId.ELECTRONICS, amount: 40 },
          { goodsId: GoodsId.PLASTIC, amount: 60 },
          { goodsId: GoodsId.MOTOR, amount: 8 },
        ],
      outputs: [{ goodsId: GoodsId.APPLIANCES, amount: 70 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(32, 180),
      energyRequired: 420,
    },
  ],
  },

    33: {
  variants: [
    {
      modeId: 0,
      name: '家具生产',
      inputs: [
          { goodsId: GoodsId.TIMBER, amount: 100 },
          { goodsId: GoodsId.STEEL, amount: 20 },
        ],
      outputs: [{ goodsId: GoodsId.FURNITURE, amount: 83 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(33, 100),
      energyRequired: 150,
    },
    {
      modeId: 1,
      name: '服装生产',
      inputs: [{ goodsId: GoodsId.CLOTHING_FABRIC, amount: 240 }],
      outputs: [{ goodsId: GoodsId.CLOTHING, amount: 390 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(33, 95),
      energyRequired: 110,
      unlockLevel: 2,
    },
  ],
  },

    34: {
  variants: [
    {
      modeId: 0,
      name: '光伏板生产',
      inputs: [
          { goodsId: GoodsId.SILICON, amount: 200 },
          { goodsId: GoodsId.GLASS, amount: 150 },
          { goodsId: GoodsId.ALUMINUM, amount: 100 },
        ],
      outputs: [{ goodsId: GoodsId.SOLAR_PANEL, amount: 500 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(34, 80),
      energyRequired: 300,
    },
    {
      modeId: 1,
      name: '风机叶片生产',
      inputs: [
          { goodsId: GoodsId.ALUMINUM, amount: 200 },
          { goodsId: GoodsId.PLASTIC, amount: 100 },
        ],
      outputs: [{ goodsId: GoodsId.WIND_BLADE, amount: 250 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(34, 100),
      energyRequired: 350,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '工业机器人生产',
      inputs: [
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 60 },
          { goodsId: GoodsId.ELECTRONICS, amount: 80 },
          { goodsId: GoodsId.CHIPS, amount: 20 },
          { goodsId: GoodsId.MOTOR, amount: 30 },
        ],
      outputs: [{ goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 16 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(34, 150),
      energyRequired: 400,
      unlockLevel: 3,
    },
  ],
  },

    35: {
  variants: [
    {
      modeId: 0,
      name: '医药原料生产',
      inputs: [
          { goodsId: GoodsId.HERBS, amount: 100 },
          { goodsId: GoodsId.CHEMICALS, amount: 100 },
        ],
      outputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 600 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(35, 95),
      energyRequired: 360,
    },
    {
      modeId: 1,
      name: '抗生素生产',
      inputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 200 }],
      outputs: [{ goodsId: GoodsId.ANTIBIOTICS, amount: 350 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(35, 100),
      energyRequired: 280,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '疫苗生产',
      inputs: [
          { goodsId: GoodsId.PHARMA_BASE, amount: 300 },
          { goodsId: GoodsId.CHEMICALS, amount: 60 },
        ],
      outputs: [{ goodsId: GoodsId.VACCINE, amount: 145 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(35, 150),
      energyRequired: 400,
      unlockLevel: 3,
    },
    {
      modeId: 3,
      name: '仿制药生产',
      inputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 200 }],
      outputs: [{ goodsId: GoodsId.GENERIC_DRUG, amount: 6800 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(35, 110),
      energyRequired: 260,
    },
    {
      modeId: 4,
      name: '专利药生产',
      inputs: [
          { goodsId: GoodsId.PHARMA_BASE, amount: 250 },
          { goodsId: GoodsId.CHEMICALS, amount: 50 },
        ],
      outputs: [{ goodsId: GoodsId.PATENT_DRUG, amount: 545 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(35, 120),
      energyRequired: 300,
      unlockLevel: 2,
    },
    {
      modeId: 5,
      name: '非处方药生产',
      inputs: [{ goodsId: GoodsId.PHARMA_BASE, amount: 120 }],
      outputs: [{ goodsId: GoodsId.OTC_DRUG, amount: 7500 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(35, 90),
      energyRequired: 220,
    },
  ],
  },

    36: {
  variants: [
    {
      modeId: 0,
      name: '医用耗材生产',
      inputs: [
          { goodsId: GoodsId.PLASTIC, amount: 200 },
          { goodsId: GoodsId.TEXTILES, amount: 200 },
        ],
      outputs: [{ goodsId: GoodsId.MEDICAL_SUPPLIES, amount: 2000 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(36, 60),
      energyRequired: 150,
    },
    {
      modeId: 1,
      name: '医疗设备生产',
      inputs: [
          { goodsId: GoodsId.ELECTRONICS, amount: 80 },
          { goodsId: GoodsId.CHIPS, amount: 20 },
          { goodsId: GoodsId.STEEL, amount: 40 },
        ],
      outputs: [{ goodsId: GoodsId.MEDICAL_DEVICE, amount: 41 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(36, 100),
      energyRequired: 300,
      unlockLevel: 2,
    },
  ],
  },

  // ======== 奢侈品 ID 37-38 ========
  // fixed：37=85k 38=155k

    37: {
  variants: [
    {
      modeId: 0,
      name: '金矿开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.GOLD_ORE, amount: 40 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(37, 60),
      energyRequired: 300,
    },
    {
      modeId: 1,
      name: '钻石矿开采',
      inputs: [],
      outputs: [{ goodsId: GoodsId.DIAMOND_ORE, amount: 12 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(37, 70),
      energyRequired: 350,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '黄金精炼',
      inputs: [{ goodsId: GoodsId.GOLD_ORE, amount: 30 }],
      outputs: [{ goodsId: GoodsId.GOLD, amount: 10 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(37, 40),
      energyRequired: 400,
      unlockLevel: 2,
    },
    {
      modeId: 3,
      name: '钻石切割',
      inputs: [{ goodsId: GoodsId.DIAMOND_ORE, amount: 10 }],
      outputs: [{ goodsId: GoodsId.DIAMOND, amount: 14 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(37, 50),
      energyRequired: 200,
      unlockLevel: 2,
    },
  ],
  },

    38: {
  variants: [
    {
      modeId: 0,
      name: '珠宝制作',
      inputs: [
          { goodsId: GoodsId.GOLD, amount: 4 },
          { goodsId: GoodsId.DIAMOND, amount: 2 },
        ],
      outputs: [{ goodsId: GoodsId.JEWELRY, amount: 20 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(38, 80),
      energyRequired: 100,
    },
    {
      modeId: 1,
      name: '奢侈腕表生产',
      inputs: [
          { goodsId: GoodsId.GOLD, amount: 6 },
          { goodsId: GoodsId.ELECTRONICS, amount: 15 },
          { goodsId: GoodsId.GLASS, amount: 10 },
        ],
      outputs: [{ goodsId: GoodsId.LUXURY_WATCH, amount: 10 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(38, 100),
      energyRequired: 80,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '设计师服装生产',
      inputs: [
          { goodsId: GoodsId.SILK, amount: 200 },
          { goodsId: GoodsId.TEXTILES, amount: 300 },
        ],
      outputs: [{ goodsId: GoodsId.DESIGNER_CLOTHING, amount: 103 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(38, 120),
      energyRequired: 80,
      unlockLevel: 2,
    },
  ],
  },

  // ======== 服务类 ID 39 ========
  // fixed：39=78k(maintenance28k+labor50k, energy=0)
  // 煤100(16k)→电力250000×0.68=170k total=94k net=76k ✓

    39: {
  variants: [
    {
      modeId: 0,
      name: '燃煤发电',
      inputs: [{ goodsId: GoodsId.COAL, amount: 100 }],
      outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 175000 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(39, 70),
      energyRequired: 0,
    },
    {
      modeId: 1,
      name: '燃气发电',
      inputs: [{ goodsId: GoodsId.NATURAL_GAS, amount: 150 }],
      outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 185000 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(39, 55),
      energyRequired: 0,
      unlockLevel: 2,
    },
    {
      modeId: 2,
      name: '光伏发电',
      inputs: [],
      outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 143000 }],
      ticksRequired: 1,
      workforceRequired: workforceFor(39, 18),
      energyRequired: 0,
      unlockLevel: 3,
    },
  ],
  },


  // ======== 零售建筑不参与生产配方 ========

  40: EMPTY_RETAIL_PRODUCTION,

  41: EMPTY_RETAIL_PRODUCTION,

  42: EMPTY_RETAIL_PRODUCTION,

  43: EMPTY_RETAIL_PRODUCTION,

  44: EMPTY_RETAIL_PRODUCTION,

  45: EMPTY_RETAIL_PRODUCTION,

  46: EMPTY_RETAIL_PRODUCTION,

  47: EMPTY_RETAIL_PRODUCTION,

  48: EMPTY_RETAIL_PRODUCTION,

  49: EMPTY_RETAIL_PRODUCTION,
};


function toDelta(io: BuildingProductionIO[]): RecipeDelta[] {
  return io.map((entry) => ({ goodsId: entry.goodsId, amount: entry.amount }));
}

function createEmptyDefaultConfig(buildingTypeId: number): BuildingMethodConfig {
  const slot = createSlot(buildingTypeId, 'production', '生产方式', '⚙️', '建筑无可用配方', 0);
  return createBuildingConfig(buildingTypeId, [slot], []);
}

export function getDefaultBuildingMethodConfig(buildingTypeId: number): BuildingMethodConfig {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  const production = DEFAULT_BUILDING_PRODUCTION_BY_ID[buildingTypeId];

  if (!building || !production || production.variants.length === 0) {
    return createEmptyDefaultConfig(buildingTypeId);
  }

  const expandedConfig = getExpandedBuildingMethodConfig(buildingTypeId, production);
  if (expandedConfig) {
    return expandedConfig;
  }

  const slot = createSlot(buildingTypeId, 'production', '生产方式', '⚙️', '可选生产方式', 0);
  const methods = production.variants.map((variant) =>
    createMethod(
      buildingTypeId,
      variant.modeId,
      'production',
      `mode_${buildingTypeId}_${variant.modeId}`,
      variant.name,
      {
        inputDelta: toDelta(variant.inputs),
        outputDelta: toDelta(variant.outputs),
        workforceDelta: variant.workforceRequired,
        energyDelta: variant.energyRequired ?? 0,
        ticksRequired: variant.ticksRequired,
        requiredLevel: variant.unlockLevel ?? 1,
        description: `${building.name} ${variant.name}`,
      },
    ),
  );

  const defaultMethods: Record<string, number> = {
    [slot.id]: methods[0].id,
  };

  return createBuildingConfig(buildingTypeId, [slot], methods, defaultMethods);
}
