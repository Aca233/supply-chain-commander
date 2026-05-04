import type { WorkforceDemand } from '@/core/labor/LaborSystem';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import { createBuildingConfig, createMethod, createSlot } from '../registry';
import type { BuildingMethodConfig, RecipeDelta } from '../types';
import type {
  BuildingProductionIO,
  BuildingProductionVariantDefinition,
  DefaultBuildingProductionDefinition,
} from '../defaultConfigs';

export interface ExtraSlotDefinition {
  id: 'secondary' | 'refining' | 'automation' | 'utility';
  name: string;
  icon: string;
  description: string;
}

export interface ExtraMethodDefinition {
  slotId: ExtraSlotDefinition['id'];
  localId: number;
  key: string;
  name: string;
  inputDelta?: RecipeDelta[];
  outputDelta?: RecipeDelta[];
  workforceDelta?: Partial<WorkforceDemand>;
  energyDelta?: number;
  requiredLevel?: number;
  switchCost?: number;
  description?: string;
}

function toDelta(io: BuildingProductionIO[]): RecipeDelta[] {
  return io.map((entry) => ({ goodsId: entry.goodsId, amount: entry.amount }));
}

function normalizeWorkforce(delta?: Partial<WorkforceDemand>): WorkforceDemand {
  return {
    basic: delta?.basic ?? 0,
    technical: delta?.technical ?? 0,
    management: delta?.management ?? 0,
  };
}

function createProductionMethod(
  buildingTypeId: number,
  variant: BuildingProductionVariantDefinition,
) {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);

  return createMethod(
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
      description: `${building?.name ?? '建筑'} ${variant.name}`,
    },
  );
}

export function createExpandedConfig(
  buildingTypeId: number,
  production: DefaultBuildingProductionDefinition,
  extraSlots: ExtraSlotDefinition[],
  extraMethods: ExtraMethodDefinition[],
): BuildingMethodConfig {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  const slots = [
    createSlot(buildingTypeId, 'production', '基础生产方式', '⚙️', '选择主产品与基础生产路线', 0),
    ...extraSlots.map((slot, index) =>
      createSlot(buildingTypeId, slot.id, slot.name, slot.icon, slot.description, index + 1),
    ),
  ];

  const productionMethods = production.variants.map((variant) =>
    createProductionMethod(buildingTypeId, variant),
  );
  const methods = [
    ...productionMethods,
    ...extraMethods.map((method) =>
      createMethod(
        buildingTypeId,
        method.localId,
        method.slotId,
        `vic3_${buildingTypeId}_${method.slotId}_${method.key}`,
        method.name,
        {
          inputDelta: method.inputDelta ?? [],
          outputDelta: method.outputDelta ?? [],
          workforceDelta: normalizeWorkforce(method.workforceDelta),
          energyDelta: method.energyDelta ?? 0,
          requiredLevel: method.requiredLevel ?? 1,
          switchCost: method.switchCost,
          description: method.description ?? `${building?.name ?? '建筑'} ${method.name}`,
        },
      ),
    ),
  ];
  const defaultMethods: Record<string, number> = {};

  for (const slot of slots) {
    const first = methods.find((method) => method.slotId === slot.id);
    if (first) {
      defaultMethods[slot.id] = first.id;
    }
  }

  return createBuildingConfig(buildingTypeId, slots, methods, defaultMethods);
}
