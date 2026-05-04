import { BuildingId } from '@/data/buildings';
import { GoodsId } from '@/data/goods';
import type { BuildingMethodConfig } from '../types';
import type { DefaultBuildingProductionDefinition } from '../defaultConfigs';
import {
  createExpandedConfig,
  type ExtraMethodDefinition,
  type ExtraSlotDefinition,
} from './common';

type ExpandedFactory = (production: DefaultBuildingProductionDefinition) => BuildingMethodConfig;

const SECONDARY_SLOT: ExtraSlotDefinition = {
  id: 'secondary',
  name: '次级生产方式',
  icon: '＋',
  description: '副产物、辅助工序或生产强化方式',
};

const REFINING_SLOT: ExtraSlotDefinition = {
  id: 'refining',
  name: '精炼与专精',
  icon: '◇',
  description: '更专门化的工业路线与高价值工艺',
};

const AUTOMATION_SLOT: ExtraSlotDefinition = {
  id: 'automation',
  name: '自动化',
  icon: '⚡',
  description: '使用机械、电力和技术岗位改变生产效率',
};

const UTILITY_SLOT: ExtraSlotDefinition = {
  id: 'utility',
  name: '动力与运输',
  icon: '↔',
  description: '动力、运输、管网或并网方式',
};

function noOp(slotId: ExtraSlotDefinition['id'], localId: number, name: string): ExtraMethodDefinition {
  return {
    slotId,
    localId,
    key: 'standard',
    name,
    description: name,
  };
}

function createConfig(
  buildingTypeId: number,
  production: DefaultBuildingProductionDefinition,
  slots: ExtraSlotDefinition[],
  methods: ExtraMethodDefinition[],
): BuildingMethodConfig {
  return createExpandedConfig(buildingTypeId, production, slots, methods);
}

const EXPANDED_BUILDINGS: Partial<Record<number, ExpandedFactory>> = {
  [BuildingId.IRON_MINE]: (production) =>
    createConfig(BuildingId.IRON_MINE, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '传统采矿'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'open_pit_blasting',
        name: '露天爆破开采',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 12 }],
        outputDelta: [{ goodsId: GoodsId.IRON_ORE, amount: 55 }],
        workforceDelta: { technical: 3 },
        energyDelta: 80,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工装载'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'electric_drills',
        name: '电动钻机',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 2 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 },
        ],
        outputDelta: [{ goodsId: GoodsId.IRON_ORE, amount: 45 }],
        workforceDelta: { basic: -12, technical: 5 },
        energyDelta: 140,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.COPPER_MINE]: (production) =>
    createConfig(BuildingId.COPPER_MINE, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '传统硫化矿采选'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'flotation_concentration',
        name: '浮选富集',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 8 }],
        outputDelta: [{ goodsId: GoodsId.COPPER_ORE, amount: 35 }],
        workforceDelta: { technical: 3 },
        energyDelta: 70,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工装车'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'electric_haulage',
        name: '电动矿车运输',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 1 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 },
        ],
        outputDelta: [{ goodsId: GoodsId.COPPER_ORE, amount: 28 }],
        workforceDelta: { basic: -8, technical: 4 },
        energyDelta: 90,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.ALUMINUM_MINE]: (production) =>
    createConfig(BuildingId.ALUMINUM_MINE, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '露天铝土矿开采'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'hydraulic_stripping',
        name: '液压剥离采矿',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 }],
        outputDelta: [{ goodsId: GoodsId.BAUXITE, amount: 50 }],
        workforceDelta: { technical: 2 },
        energyDelta: 60,
        requiredLevel: 2,
      },
      noOp('automation', 30, '卡车外运'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'belt_conveyors',
        name: '皮带输送系统',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 1 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 10 },
        ],
        outputDelta: [{ goodsId: GoodsId.BAUXITE, amount: 42 }],
        workforceDelta: { basic: -10, technical: 4 },
        energyDelta: 80,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.COAL_MINE]: (production) =>
    createConfig(BuildingId.COAL_MINE, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '房柱式采煤'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'longwall_mining',
        name: '长壁采煤',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 }],
        outputDelta: [{ goodsId: GoodsId.COAL, amount: 28 }],
        workforceDelta: { basic: -5, technical: 4 },
        energyDelta: 90,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工掘进'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'continuous_miner',
        name: '连续采煤机',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 2 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 14 },
        ],
        outputDelta: [{ goodsId: GoodsId.COAL, amount: 24 }],
        workforceDelta: { basic: -10, technical: 6 },
        energyDelta: 120,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.OIL_FIELD]: (production) =>
    createConfig(BuildingId.OIL_FIELD, production, [UTILITY_SLOT, AUTOMATION_SLOT], [
      noOp('utility', 20, '常规抽油机'),
      {
        slotId: 'utility',
        localId: 21,
        key: 'water_flooding',
        name: '注水驱油',
        inputDelta: [
          { goodsId: GoodsId.NATURAL_GAS, amount: 20 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 },
        ],
        outputDelta: [{ goodsId: GoodsId.CRUDE_OIL, amount: 45 }],
        workforceDelta: { technical: 4 },
        energyDelta: 100,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工巡井'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'electric_submersible_pumps',
        name: '电潜泵采油',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 2 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 },
        ],
        outputDelta: [{ goodsId: GoodsId.CRUDE_OIL, amount: 38 }],
        workforceDelta: { basic: -8, technical: 5 },
        energyDelta: 140,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.GAS_FIELD]: (production) =>
    createConfig(BuildingId.GAS_FIELD, production, [UTILITY_SLOT, REFINING_SLOT], [
      noOp('utility', 20, '常规井口采气'),
      {
        slotId: 'utility',
        localId: 21,
        key: 'gas_compression_station',
        name: '集气压缩站',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 10 }],
        outputDelta: [{ goodsId: GoodsId.NATURAL_GAS, amount: 42 }],
        workforceDelta: { technical: 4 },
        energyDelta: 110,
        requiredLevel: 2,
      },
      noOp('refining', 30, '常规脱水'),
      {
        slotId: 'refining',
        localId: 31,
        key: 'sweetening_units',
        name: '脱硫净化装置',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 12 }],
        outputDelta: [{ goodsId: GoodsId.NATURAL_GAS, amount: 28 }],
        workforceDelta: { technical: 5 },
        energyDelta: 80,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.SILICON_MINE]: (production) =>
    createConfig(BuildingId.SILICON_MINE, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '石英矿采掘'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'optical_sorting',
        name: '光选分级',
        inputDelta: [{ goodsId: GoodsId.ELECTRONICS, amount: 2 }],
        outputDelta: [{ goodsId: GoodsId.SILICON, amount: 45 }],
        workforceDelta: { basic: -4, technical: 5 },
        energyDelta: 80,
        requiredLevel: 2,
      },
      noOp('automation', 30, '颚式破碎'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'electric_crushers',
        name: '电动破碎机',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 1 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 10 },
        ],
        outputDelta: [{ goodsId: GoodsId.SILICON, amount: 40 }],
        workforceDelta: { basic: -8, technical: 5 },
        energyDelta: 110,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.LITHIUM_MINE]: (production) =>
    createConfig(BuildingId.LITHIUM_MINE, production, [SECONDARY_SLOT], [
      noOp('secondary', 20, '传统硬岩开采'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'brine_pumping',
        name: '盐湖卤水抽采',
        inputDelta: [{ goodsId: GoodsId.MOTOR, amount: 1 }],
        outputDelta: [{ goodsId: GoodsId.LITHIUM, amount: 26 }],
        workforceDelta: { technical: 4 },
        energyDelta: 90,
        requiredLevel: 2,
      },
    ]),

  [BuildingId.RARE_EARTH_MINE]: (production) =>
    createConfig(BuildingId.RARE_EARTH_MINE, production, [SECONDARY_SLOT], [
      noOp('secondary', 20, '原矿分选'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'solvent_extraction',
        name: '溶剂萃取',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 20 }],
        outputDelta: [{ goodsId: GoodsId.RARE_EARTH, amount: 18 }],
        workforceDelta: { technical: 6 },
        energyDelta: 110,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.LOGGING_CAMP]: (production) =>
    createConfig(BuildingId.LOGGING_CAMP, production, [SECONDARY_SLOT, UTILITY_SLOT], [
      noOp('secondary', 20, '人工择伐'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'mechanized_harvesters',
        name: '机械伐木机',
        inputDelta: [
          { goodsId: GoodsId.FUEL, amount: 20 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 },
        ],
        outputDelta: [{ goodsId: GoodsId.TIMBER, amount: 90 }],
        workforceDelta: { basic: -12, technical: 4 },
        energyDelta: 40,
        requiredLevel: 2,
      },
      noOp('utility', 30, '原木堆场'),
      {
        slotId: 'utility',
        localId: 31,
        key: 'sawmill_sorting_yard',
        name: '锯木分拣场',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 6 }],
        outputDelta: [{ goodsId: GoodsId.TIMBER, amount: 55 }],
        workforceDelta: { technical: 2 },
        energyDelta: 30,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.FARM]: (production) =>
    createConfig(BuildingId.FARM, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '传统耕作'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'mechanized_cultivation',
        name: '机械化耕作',
        inputDelta: [
          { goodsId: GoodsId.FUEL, amount: 30 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 6 },
        ],
        workforceDelta: { basic: -25, technical: 4 },
        energyDelta: 70,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工仓储'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'silo_packing',
        name: '筒仓与分级包装',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 30 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 4 },
        ],
        workforceDelta: { basic: -10, technical: 3 },
        energyDelta: 80,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.RUBBER_PLANTATION]: (production) =>
    createConfig(BuildingId.RUBBER_PLANTATION, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '手工割胶'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'stimulant_tapping',
        name: '增产割胶制度',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 5 }],
        outputDelta: [{ goodsId: GoodsId.RUBBER_RAW, amount: 45 }],
        workforceDelta: { technical: 2 },
        energyDelta: 15,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工收胶'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'motorized_collection',
        name: '机动收胶车',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 1 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 6 },
        ],
        outputDelta: [{ goodsId: GoodsId.RUBBER_RAW, amount: 32 }],
        workforceDelta: { basic: -6, technical: 3 },
        energyDelta: 35,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.LIVESTOCK_FARM]: (production) =>
    createConfig(BuildingId.LIVESTOCK_FARM, production, [SECONDARY_SLOT], [
      noOp('secondary', 20, '放牧养殖'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'concentrated_feed',
        name: '精饲料育肥',
        inputDelta: [{ goodsId: GoodsId.GRAIN, amount: 60 }],
        outputDelta: [{ goodsId: GoodsId.LIVESTOCK, amount: 16 }],
        workforceDelta: { technical: 3 },
        energyDelta: 40,
        requiredLevel: 2,
      },
    ]),

  [BuildingId.FISHERY]: (production) =>
    createConfig(BuildingId.FISHERY, production, [SECONDARY_SLOT], [
      noOp('secondary', 20, '近海捕捞'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'aquaculture_pens',
        name: '海水网箱养殖',
        inputDelta: [
          { goodsId: GoodsId.GRAIN, amount: 30 },
          { goodsId: GoodsId.PLASTIC, amount: 12 },
        ],
        outputDelta: [{ goodsId: GoodsId.SEAFOOD, amount: 80 }],
        workforceDelta: { technical: 3 },
        energyDelta: 60,
        requiredLevel: 2,
      },
    ]),

  [BuildingId.HERB_FARM]: (production) =>
    createConfig(BuildingId.HERB_FARM, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '露地药材种植'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'greenhouse_cultivation',
        name: '温室药材栽培',
        inputDelta: [
          { goodsId: GoodsId.GLASS, amount: 8 },
          { goodsId: GoodsId.CHEMICALS, amount: 4 },
        ],
        outputDelta: [{ goodsId: GoodsId.HERBS, amount: 24 }],
        workforceDelta: { technical: 3 },
        energyDelta: 55,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工灌溉'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'controlled_irrigation',
        name: '控制灌溉系统',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 1 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 5 },
        ],
        outputDelta: [{ goodsId: GoodsId.HERBS, amount: 18 }],
        workforceDelta: { basic: -4, technical: 3 },
        energyDelta: 45,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.STEEL_MILL]: (production) =>
    createConfig(BuildingId.STEEL_MILL, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '高炉-转炉流程'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'oxygen_furnace',
        name: '富氧转炉',
        inputDelta: [
          { goodsId: GoodsId.COAL, amount: 20 },
          { goodsId: GoodsId.CHEMICALS, amount: 10 },
        ],
        outputDelta: [{ goodsId: GoodsId.STEEL, amount: 80 }],
        workforceDelta: { technical: 8 },
        energyDelta: 220,
        requiredLevel: 2,
      },
      {
        slotId: 'refining',
        localId: 22,
        key: 'alloy_steel',
        name: '合金钢专精',
        inputDelta: [
          { goodsId: GoodsId.COAL, amount: 45 },
          { goodsId: GoodsId.RARE_EARTH, amount: 5 },
        ],
        outputDelta: [{ goodsId: GoodsId.STEEL, amount: 125 }],
        workforceDelta: { technical: 12, management: 1 },
        energyDelta: 320,
        requiredLevel: 3,
      },
      noOp('automation', 30, '人工吊装'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'continuous_casting',
        name: '连铸连轧',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 18 }],
        workforceDelta: { basic: -30, technical: 10 },
        energyDelta: 180,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.NON_FERROUS_SMELTER]: (production) =>
    createConfig(BuildingId.NON_FERROUS_SMELTER, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '转炉与电解槽'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'electrolytic_refining',
        name: '电解精炼',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 20 }],
        workforceDelta: { basic: -4, technical: 8 },
        energyDelta: 140,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工浇铸'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'automated_casting',
        name: '自动铸锭线',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 2 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 },
        ],
        workforceDelta: { basic: -10, technical: 6 },
        energyDelta: 100,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.REFINERY]: (production) =>
    createConfig(BuildingId.REFINERY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '常压蒸馏'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'hydrocracking_unit',
        name: '加氢裂化装置',
        inputDelta: [
          { goodsId: GoodsId.NATURAL_GAS, amount: 40 },
          { goodsId: GoodsId.CHEMICALS, amount: 18 },
        ],
        outputDelta: [
          { goodsId: GoodsId.FUEL, amount: 80 },
          { goodsId: GoodsId.PLASTIC, amount: 50 },
        ],
        workforceDelta: { technical: 8 },
        energyDelta: 180,
        requiredLevel: 2,
      },
      noOp('automation', 30, '现场仪表巡检'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'process_control_room',
        name: '集中控制室',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 8 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 },
        ],
        workforceDelta: { basic: -8, technical: 8, management: 1 },
        energyDelta: 80,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.CHEMICAL_PLANT]: (production) =>
    createConfig(BuildingId.CHEMICAL_PLANT, production, [SECONDARY_SLOT, REFINING_SLOT], [
      noOp('secondary', 20, '间歇反应釜'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'catalytic_cracking',
        name: '催化裂解',
        inputDelta: [
          { goodsId: GoodsId.NATURAL_GAS, amount: 20 },
          { goodsId: GoodsId.CHEMICALS, amount: 12 },
        ],
        workforceDelta: { basic: -6, technical: 8 },
        energyDelta: 150,
        requiredLevel: 2,
      },
      noOp('refining', 30, '通用化工品'),
      {
        slotId: 'refining',
        localId: 31,
        key: 'polymerization',
        name: '聚合物路线',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 80 }],
        outputDelta: [{ goodsId: GoodsId.PLASTIC, amount: 150 }],
        workforceDelta: { technical: 10 },
        energyDelta: 100,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.GLASS_FACTORY]: (production) =>
    createConfig(BuildingId.GLASS_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '坩埚熔制'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'float_glass_line',
        name: '浮法玻璃线',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 10 }],
        outputDelta: [{ goodsId: GoodsId.GLASS, amount: 55 }],
        workforceDelta: { basic: -4, technical: 4 },
        energyDelta: 120,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工退火'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'electric_lehr_control',
        name: '电控退火窑',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 4 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 },
        ],
        workforceDelta: { basic: -8, technical: 5 },
        energyDelta: 90,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.CEMENT_FACTORY]: (production) =>
    createConfig(BuildingId.CEMENT_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '立窑烧制'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'rotary_kiln',
        name: '回转窑熟料线',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 }],
        outputDelta: [{ goodsId: GoodsId.CEMENT, amount: 120 }],
        workforceDelta: { technical: 4 },
        energyDelta: 160,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工配料'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'precalciner_control',
        name: '预分解窑控制',
        inputDelta: [
          { goodsId: GoodsId.CHEMICALS, amount: 10 },
          { goodsId: GoodsId.ELECTRONICS, amount: 4 },
        ],
        workforceDelta: { basic: -8, technical: 5 },
        energyDelta: 110,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.PAPER_MILL]: (production) =>
    createConfig(BuildingId.PAPER_MILL, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '机械制浆'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'chemical_pulping',
        name: '化学制浆',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 15 }],
        outputDelta: [{ goodsId: GoodsId.PAPER, amount: 80 }],
        workforceDelta: { technical: 4 },
        energyDelta: 90,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工复卷'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'continuous_paper_machine',
        name: '连续造纸机',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 1 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 10 },
        ],
        workforceDelta: { basic: -8, technical: 5 },
        energyDelta: 100,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.TEXTILE_MILL]: (production) =>
    createConfig(BuildingId.TEXTILE_MILL, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '梭织织机'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'ring_spinning_frames',
        name: '环锭纺纱机',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 }],
        workforceDelta: { basic: -6, technical: 4 },
        energyDelta: 70,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工换梭'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'automatic_looms',
        name: '自动织机',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 2 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 },
        ],
        workforceDelta: { basic: -12, technical: 5 },
        energyDelta: 100,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.FOOD_FACTORY]: (production) =>
    createConfig(BuildingId.FOOD_FACTORY, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '标准加工'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'cold_chain_processing',
        name: '温控仓储与冷链',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 80 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 6 },
        ],
        workforceDelta: { basic: -8, technical: 4 },
        energyDelta: 140,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工包装'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'automatic_packaging',
        name: '自动包装线',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 100 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 5 },
          { goodsId: GoodsId.ELECTRONICS, amount: 3 },
        ],
        workforceDelta: { basic: -12, technical: 5 },
        energyDelta: 120,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.MEAT_PROCESSING]: (production) =>
    createConfig(BuildingId.MEAT_PROCESSING, production, [SECONDARY_SLOT], [
      noOp('secondary', 20, '传统屠宰分割'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'refrigerated_cutting',
        name: '冷链分割线',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 40 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 5 },
        ],
        workforceDelta: { basic: -12, technical: 4 },
        energyDelta: 120,
        requiredLevel: 2,
      },
    ]),

  [BuildingId.DAIRY_FACTORY]: (production) =>
    createConfig(BuildingId.DAIRY_FACTORY, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '巴氏杀菌车间'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'pasteurization_line',
        name: '连续巴氏杀菌线',
        inputDelta: [{ goodsId: GoodsId.PACKAGING, amount: 40 }],
        outputDelta: [{ goodsId: GoodsId.DAIRY, amount: 220 }],
        workforceDelta: { technical: 3 },
        energyDelta: 70,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工灌装'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'aseptic_filling',
        name: '无菌灌装线',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 80 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 6 },
        ],
        workforceDelta: { basic: -6, technical: 4 },
        energyDelta: 80,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.BUILDING_MATERIALS_FACTORY]: (production) =>
    createConfig(BuildingId.BUILDING_MATERIALS_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '普通混配'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'precast_concrete_line',
        name: '预制构件线',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 }],
        workforceDelta: { basic: -6, technical: 5 },
        energyDelta: 90,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工投料'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'automated_batching',
        name: '自动配料站',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 4 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 10 },
        ],
        workforceDelta: { basic: -8, technical: 5 },
        energyDelta: 70,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.ELECTRONICS_FACTORY]: (production) =>
    createConfig(BuildingId.ELECTRONICS_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '标准装配'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'precision_smt',
        name: '精密 SMT 贴装',
        inputDelta: [{ goodsId: GoodsId.CHIPS, amount: 8 }],
        workforceDelta: { basic: -12, technical: 10 },
        energyDelta: 130,
        requiredLevel: 2,
      },
      {
        slotId: 'refining',
        localId: 22,
        key: 'clean_room_assembly',
        name: '洁净室精密装配',
        inputDelta: [
          { goodsId: GoodsId.CHIPS, amount: 12 },
          { goodsId: GoodsId.CHEMICALS, amount: 30 },
        ],
        workforceDelta: { basic: -16, technical: 14, management: 1 },
        energyDelta: 220,
        requiredLevel: 3,
      },
      noOp('automation', 30, '人工流水线'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'robotic_assembly',
        name: '机器人装配线',
        inputDelta: [
          { goodsId: GoodsId.MOTOR, amount: 2 },
          { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 1 },
        ],
        workforceDelta: { basic: -20, technical: 8 },
        energyDelta: 160,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.SEMICONDUCTOR_FAB]: (production) =>
    createConfig(BuildingId.SEMICONDUCTOR_FAB, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '标准晶圆制程'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'photolithography_steppers',
        name: '光刻步进机',
        inputDelta: [
          { goodsId: GoodsId.RARE_EARTH, amount: 10 },
          { goodsId: GoodsId.CHEMICALS, amount: 80 },
        ],
        outputDelta: [{ goodsId: GoodsId.CHIPS, amount: 120 }],
        workforceDelta: { basic: -10, technical: 18 },
        energyDelta: 220,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工搬片'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'cleanroom_robotics',
        name: '洁净室自动搬运',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 20 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 },
        ],
        workforceDelta: { basic: -15, technical: 12 },
        energyDelta: 180,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.BATTERY_FACTORY]: (production) =>
    createConfig(BuildingId.BATTERY_FACTORY, production, [REFINING_SLOT], [
      noOp('refining', 20, '标准电池路线'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'lfp_route',
        name: '磷酸铁锂路线',
        inputDelta: [
          { goodsId: GoodsId.IRON_ORE, amount: 20 },
          { goodsId: GoodsId.CHEMICALS, amount: 40 },
          { goodsId: GoodsId.COPPER, amount: -20 },
        ],
        workforceDelta: { basic: -8, technical: 8 },
        energyDelta: 130,
        requiredLevel: 2,
      },
      {
        slotId: 'refining',
        localId: 22,
        key: 'energy_storage_pack',
        name: '电池模组封装',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 50 },
          { goodsId: GoodsId.ELECTRONICS, amount: 30 },
          { goodsId: GoodsId.BATTERY, amount: -10 },
        ],
        workforceDelta: { basic: -10, technical: 10, management: 1 },
        energyDelta: 180,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.PARTS_FACTORY]: (production) =>
    createConfig(BuildingId.PARTS_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '通用零部件加工'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'cnc_precision',
        name: '数控工艺控制',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 8 },
          { goodsId: GoodsId.MOTOR, amount: 2 },
        ],
        workforceDelta: { basic: -12, technical: 10 },
        energyDelta: 170,
        requiredLevel: 2,
      },
      {
        slotId: 'refining',
        localId: 22,
        key: 'stamping_casting',
        name: '专用工装线',
        inputDelta: [
          { goodsId: GoodsId.CHEMICALS, amount: 20 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 10 },
        ],
        workforceDelta: { basic: -10, technical: 8 },
        energyDelta: 180,
        requiredLevel: 2,
      },
      noOp('automation', 30, '单机工位'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'flexible_cell',
        name: '柔性制造单元',
        inputDelta: [{ goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 1 }],
        workforceDelta: { basic: -18, technical: 8, management: 1 },
        energyDelta: 210,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.CAR_FACTORY]: (production) =>
    createConfig(BuildingId.CAR_FACTORY, production, [AUTOMATION_SLOT, UTILITY_SLOT], [
      noOp('automation', 20, '人工总装'),
      {
        slotId: 'automation',
        localId: 21,
        key: 'robotic_body_shop',
        name: '机器人焊装车间',
        inputDelta: [
          { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 2 },
          { goodsId: GoodsId.ELECTRONICS, amount: 20 },
        ],
        workforceDelta: { basic: -60, technical: 12, management: 1 },
        energyDelta: 320,
        requiredLevel: 3,
      },
      noOp('utility', 30, '厂内叉车物流'),
      {
        slotId: 'utility',
        localId: 31,
        key: 'just_in_time_logistics',
        name: '准时制物流',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 80 },
          { goodsId: GoodsId.CAR_PARTS, amount: -10 },
        ],
        workforceDelta: { basic: -8, management: 2 },
        energyDelta: 120,
        requiredLevel: 2,
      },
    ]),

  [BuildingId.APPLIANCE_FACTORY]: (production) =>
    createConfig(BuildingId.APPLIANCE_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '标准耐用品装配'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'durable_goods_line',
        name: '耐用品装配线',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 20 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 6 },
        ],
        outputDelta: [{ goodsId: GoodsId.APPLIANCES, amount: 18 }],
        workforceDelta: { basic: -8, technical: 4 },
        energyDelta: 60,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工锁附'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'robotic_screwdriving',
        name: '机器人锁附工位',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 8 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 12 },
        ],
        workforceDelta: { basic: -18, technical: 8 },
        energyDelta: 110,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.FURNITURE_FACTORY]: (production) =>
    createConfig(BuildingId.FURNITURE_FACTORY, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '普通木工与缝纫'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'kiln_dried_joinery',
        name: '窑干榫卯工艺',
        inputDelta: [
          { goodsId: GoodsId.CHEMICALS, amount: 6 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 6 },
        ],
        workforceDelta: { basic: -4, technical: 4 },
        energyDelta: 55,
        requiredLevel: 2,
      },
      noOp('automation', 30, '手工裁切'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'computerized_cutting',
        name: '电脑裁切设备',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 4 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 10 },
        ],
        workforceDelta: { basic: -10, technical: 5 },
        energyDelta: 70,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.NEW_ENERGY_FACTORY]: (production) =>
    createConfig(BuildingId.NEW_ENERGY_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '标准新能源装配'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'precision_composites',
        name: '精密复合材料工艺',
        inputDelta: [
          { goodsId: GoodsId.CHEMICALS, amount: 20 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 },
        ],
        workforceDelta: { basic: -8, technical: 8 },
        energyDelta: 90,
        requiredLevel: 2,
      },
      noOp('automation', 30, '半自动装配'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'robotic_cell_assembly',
        name: '机器人电池片装配',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 10 },
          { goodsId: GoodsId.MOTOR, amount: 2 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 10 },
        ],
        workforceDelta: { basic: -14, technical: 10 },
        energyDelta: 120,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.PHARMA_FACTORY]: (production) =>
    createConfig(BuildingId.PHARMA_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '通用制药'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'fermentation_api',
        name: '生物发酵工艺',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 20 }],
        workforceDelta: { basic: -10, technical: 10 },
        energyDelta: 140,
        requiredLevel: 2,
      },
      {
        slotId: 'refining',
        localId: 22,
        key: 'sterile_fill_finish',
        name: '无菌灌装',
        inputDelta: [
          { goodsId: GoodsId.PACKAGING, amount: 60 },
          { goodsId: GoodsId.CHEMICALS, amount: 20 },
        ],
        workforceDelta: { basic: -14, technical: 14, management: 1 },
        energyDelta: 230,
        requiredLevel: 3,
      },
      noOp('automation', 30, '人工质检'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'automated_qa',
        name: '自动化质检',
        inputDelta: [{ goodsId: GoodsId.ELECTRONICS, amount: 20 }],
        workforceDelta: { basic: -12, technical: 8 },
        energyDelta: 160,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.MEDICAL_DEVICE_FACTORY]: (production) =>
    createConfig(BuildingId.MEDICAL_DEVICE_FACTORY, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '普通洁净装配'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'sterile_cleanroom_line',
        name: '无菌洁净产线',
        inputDelta: [
          { goodsId: GoodsId.CHEMICALS, amount: 12 },
          { goodsId: GoodsId.PACKAGING, amount: 40 },
        ],
        workforceDelta: { basic: -8, technical: 8 },
        energyDelta: 90,
        requiredLevel: 2,
      },
      noOp('automation', 30, '人工校准'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'precision_diagnostics_assembly',
        name: '精密诊断设备装配',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 10 },
          { goodsId: GoodsId.CHIPS, amount: 4 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 },
        ],
        workforceDelta: { basic: -10, technical: 10 },
        energyDelta: 120,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.GOLD_REFINERY]: (production) =>
    createConfig(BuildingId.GOLD_REFINERY, production, [SECONDARY_SLOT, AUTOMATION_SLOT], [
      noOp('secondary', 20, '传统贵金属作业'),
      {
        slotId: 'secondary',
        localId: 21,
        key: 'cyanide_leaching',
        name: '氰化浸出',
        inputDelta: [{ goodsId: GoodsId.CHEMICALS, amount: 6 }],
        workforceDelta: { basic: -4, technical: 4 },
        energyDelta: 60,
        requiredLevel: 2,
      },
      noOp('automation', 30, '手工分拣'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'laser_sorting',
        name: '激光分选',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 4 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 6 },
        ],
        workforceDelta: { basic: -6, technical: 5 },
        energyDelta: 50,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.LUXURY_WORKSHOP]: (production) =>
    createConfig(BuildingId.LUXURY_WORKSHOP, production, [REFINING_SLOT, AUTOMATION_SLOT], [
      noOp('refining', 20, '手工定制'),
      {
        slotId: 'refining',
        localId: 21,
        key: 'precision_goldsmithing',
        name: '精密金工',
        inputDelta: [{ goodsId: GoodsId.MECHANICAL_PARTS, amount: 4 }],
        workforceDelta: { basic: -4, technical: 5, management: 1 },
        energyDelta: 30,
        requiredLevel: 2,
      },
      noOp('automation', 30, '手工品控'),
      {
        slotId: 'automation',
        localId: 31,
        key: 'atelier_quality_control',
        name: '工坊级质量追踪',
        inputDelta: [{ goodsId: GoodsId.ELECTRONICS, amount: 4 }],
        workforceDelta: { basic: -6, technical: 4, management: 2 },
        energyDelta: 20,
        requiredLevel: 3,
      },
    ]),

  [BuildingId.POWER_PLANT]: (production) =>
    createConfig(BuildingId.POWER_PLANT, production, [UTILITY_SLOT], [
      noOp('utility', 20, '基础并网'),
      {
        slotId: 'utility',
        localId: 21,
        key: 'peak_load_dispatch',
        name: '调峰调度',
        inputDelta: [{ goodsId: GoodsId.NATURAL_GAS, amount: 50 }],
        outputDelta: [{ goodsId: GoodsId.ELECTRICITY, amount: 40000 }],
        workforceDelta: { technical: 5 },
        requiredLevel: 2,
      },
      {
        slotId: 'utility',
        localId: 22,
        key: 'smart_grid',
        name: '智能电网并网',
        inputDelta: [
          { goodsId: GoodsId.ELECTRONICS, amount: 20 },
          { goodsId: GoodsId.MECHANICAL_PARTS, amount: 8 },
        ],
        workforceDelta: { basic: -5, technical: 8, management: 1 },
        requiredLevel: 3,
      },
    ]),
};

export function getExpandedBuildingMethodConfig(
  buildingTypeId: number,
  production: DefaultBuildingProductionDefinition,
): BuildingMethodConfig | null {
  const factory = EXPANDED_BUILDINGS[buildingTypeId];
  return factory ? factory(production) : null;
}
