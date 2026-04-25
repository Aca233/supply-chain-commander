import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_SLOTS } from '@/core/constants';
import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { addBuilding } from '@/core/world/WorldInitializer';
import { BuildingId } from '@/data/buildings';
import { ALL_GOODS, GoodsId } from '@/data/goods';

import { AI_PERSONALITIES } from '../AIPersonality';
import { clearOptimizationCache, runProductionOptimization } from '../AIProductionOptimizer';

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

function seedStableMarket(world: ReturnType<typeof createGameWorld>): void {
  world.goods.count = ALL_GOODS.length;

  for (const goods of ALL_GOODS) {
    world.goods.baseValues[goods.id] = goods.basePrice;
    world.goods.prices[goods.id] = goods.basePrice;
    world.goods.supplies[goods.id] = 100;
    world.goods.demands[goods.id] = 100;
  }
}

describe('AIProductionOptimizer output mode switching', () => {
  beforeEach(() => {
    initializeBuildingProductionMethods();
    clearOptimizationCache();
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  it('switches an existing multi-mode factory to a stronger output mode', () => {
    const world = createGameWorld();
    seedStableMarket(world);
    world.tick = 48;

    world.companies.count = 2;
    world.companies.cash[1] = 50_000_000;
    world.companies.names[1] = '模式切换测试AI';
    world.companies.isAI[1] = true;
    world.companies.isPlayer[1] = false;

    const buildingId = addBuilding(world, 1, BuildingId.PARTS_FACTORY, 0);

    const slotOffset = buildingId * MAX_SLOTS;
    expect(world.buildings.slotMethods[slotOffset]).toBeGreaterThanOrEqual(0);

    world.goods.prices[GoodsId.MOTOR] = 200;
    world.goods.supplies[GoodsId.MOTOR] = 600;
    world.goods.demands[GoodsId.MOTOR] = 30;

    world.goods.prices[GoodsId.CLOTHING_FABRIC] = 160;
    world.goods.supplies[GoodsId.CLOTHING_FABRIC] = 0;
    world.goods.demands[GoodsId.CLOTHING_FABRIC] = 500;

    world.goods.prices[GoodsId.COPPER] = 360;
    world.goods.supplies[GoodsId.COPPER] = 20;
    world.goods.demands[GoodsId.COPPER] = 300;

    world.goods.prices[GoodsId.STEEL] = 260;
    world.goods.supplies[GoodsId.STEEL] = 30;
    world.goods.demands[GoodsId.STEEL] = 280;

    world.goods.prices[GoodsId.RARE_EARTH] = 360;
    world.goods.supplies[GoodsId.RARE_EARTH] = 10;
    world.goods.demands[GoodsId.RARE_EARTH] = 120;

    world.goods.prices[GoodsId.TEXTILES] = 30;
    world.goods.supplies[GoodsId.TEXTILES] = 500;
    world.goods.demands[GoodsId.TEXTILES] = 40;

    expect(world.buildings.outputModeIds[buildingId]).toBe(0);

    runProductionOptimization(world, 1, AI_PERSONALITIES.pioneer);

    expect(world.buildings.outputModeIds[buildingId]).toBe(5);
  });
});
