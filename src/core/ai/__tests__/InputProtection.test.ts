import { describe, expect, it } from 'vitest';

import { GOODS_COUNT } from '@/core/constants';
import { initProductionCache } from '@/core/production/ProductionEngine';
import { initializeBuildingProductionMethods } from '@/core/production/ProductionMethods';
import { createGameWorld } from '@/core/world/GameWorld';
import { GoodsId, ALL_GOODS } from '@/data/goods';
import { BuildingId } from '@/data/buildings';

import { addBuilding } from '../../world/WorldInitializer';
import {
  getInputReservation,
  getSellableInventory,
  isCompanyInput,
} from '../InputProtection';

/**
 * 投入物保护单元测试
 * Why: 验证 AI/Player 卖单不会把"自家建筑要消耗的投入物"误挂出去（电力是典型例子）
 */
describe('InputProtection', () => {
  function buildSteelMillWorld() {
    initializeBuildingProductionMethods();
    initProductionCache();
    const world = createGameWorld();
    world.goods.count = ALL_GOODS.length;
    world.companies.count = 2;
    const companyId = 1;
    world.companies.isAI[companyId] = true;
    world.companies.cash[companyId] = 10_000_000;
    addBuilding(world, companyId, BuildingId.STEEL_MILL);
    return { world, companyId };
  }

  it('reports nonzero input reservation for electricity when steel mill is owned', () => {
    const { world, companyId } = buildSteelMillWorld();
    const reservation = getInputReservation(world, companyId, GoodsId.ELECTRICITY);
    expect(reservation).toBeGreaterThan(0);
  });

  it('reports zero input reservation for goods the company does not consume', () => {
    const { world, companyId } = buildSteelMillWorld();
    const reservation = getInputReservation(world, companyId, GoodsId.FOOD);
    expect(reservation).toBe(0);
  });

  it('marks consumed goods via isCompanyInput', () => {
    const { world, companyId } = buildSteelMillWorld();
    expect(isCompanyInput(world, companyId, GoodsId.ELECTRICITY)).toBe(true);
    expect(isCompanyInput(world, companyId, GoodsId.FOOD)).toBe(false);
  });

  it('returns 0 sellable when input inventory equals exactly 5-day reservation (below 1.5x threshold)', () => {
    const { world, companyId } = buildSteelMillWorld();
    const reservation = getInputReservation(world, companyId, GoodsId.ELECTRICITY);
    const idx = companyId * GOODS_COUNT + GoodsId.ELECTRICITY;
    world.companies.inventories[idx] = reservation; // 库存 = 5 天预留
    expect(getSellableInventory(world, companyId, GoodsId.ELECTRICITY)).toBe(0);
  });

  it('returns 0 sellable when inventory equals exactly the surplus threshold (1.5x reservation)', () => {
    const { world, companyId } = buildSteelMillWorld();
    const reservation = getInputReservation(world, companyId, GoodsId.ELECTRICITY);
    const idx = companyId * GOODS_COUNT + GoodsId.ELECTRICITY;
    world.companies.inventories[idx] = reservation * 1.5;
    expect(getSellableInventory(world, companyId, GoodsId.ELECTRICITY)).toBe(0);
  });

  it('returns surplus above 1.5x threshold as sellable', () => {
    const { world, companyId } = buildSteelMillWorld();
    const reservation = getInputReservation(world, companyId, GoodsId.ELECTRICITY);
    const idx = companyId * GOODS_COUNT + GoodsId.ELECTRICITY;
    world.companies.inventories[idx] = reservation * 2; // 2x = 显著过剩
    const sellable = getSellableInventory(world, companyId, GoodsId.ELECTRICITY);
    expect(sellable).toBeCloseTo(reservation * 0.5, 5); // 2x - 1.5x = 0.5x
  });

  it('treats non-input goods as fully sellable minus reserved', () => {
    const { world, companyId } = buildSteelMillWorld();
    const idx = companyId * GOODS_COUNT + GoodsId.FOOD;
    world.companies.inventories[idx] = 100;
    world.companies.inventoryReserved[idx] = 30;
    expect(getSellableInventory(world, companyId, GoodsId.FOOD)).toBe(70);
  });

  it('ignores inactive buildings when computing reservation', () => {
    const { world, companyId } = buildSteelMillWorld();
    const reservationActive = getInputReservation(world, companyId, GoodsId.ELECTRICITY);
    expect(reservationActive).toBeGreaterThan(0);

    // 把建筑置为 inactive
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === companyId) {
        world.buildings.isActive[i] = 0;
      }
    }
    const reservationInactive = getInputReservation(world, companyId, GoodsId.ELECTRICITY);
    expect(reservationInactive).toBe(0);
  });

  it('accumulates reservation across multiple buildings consuming the same input', () => {
    const { world, companyId } = buildSteelMillWorld();
    const single = getInputReservation(world, companyId, GoodsId.ELECTRICITY);
    addBuilding(world, companyId, BuildingId.STEEL_MILL);
    const doubled = getInputReservation(world, companyId, GoodsId.ELECTRICITY);
    expect(doubled).toBeCloseTo(single * 2, 5);
  });
});
