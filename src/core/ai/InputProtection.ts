/**
 * 投入物保护：防止公司把"自家建筑要消耗的投入物"误挂为卖单。
 *
 * 背景：AI 卖单生成路径多处遍历全部商品按 inventory>0 直接挂卖单，导致
 * 同一家公司既从市场买电力供工厂使用，又把缓冲库存当作过剩重新挂卖单
 * （买进-卖出-再买进的死循环）。
 *
 * 策略：
 * - 计算公司未来 N 天对该商品的总消耗量（来自所有 active 建筑的 input slots）
 * - 投入物商品：库存必须 > 消耗预留 × 1.5 才允许卖出超额部分
 * - 非投入物：常规可售（inventory - reserved）
 */

import type { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT } from '@/core/constants';
import { getBuildingRecipeFromInstance } from '@/core/production/ProductionEngine';

const BUFFER_DAYS = 5;
const SURPLUS_MULTIPLIER = 1.5;

/** 公司未来 days 天对 goodsId 的总消耗量 */
export function getInputReservation(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  days = BUFFER_DAYS,
): number {
  const b = world.buildings;
  let dailyConsumption = 0;
  for (let i = 0; i < b.count; i++) {
    if (b.owners[i] !== companyId || !b.isActive[i]) continue;
    const recipe = getBuildingRecipeFromInstance(world, i);
    if (!recipe || !recipe.inputs) continue;
    const eff = b.efficiencies[i] || 1;
    for (const inp of recipe.inputs) {
      if (inp.goodsId === goodsId) {
        dailyConsumption += inp.amount * eff;
      }
    }
  }
  return dailyConsumption * days;
}

/**
 * 公司挂卖单时的可售库存。
 * 投入物：扣除消耗预留 × 1.5 后才允许卖。
 * 非投入物：仅扣除 inventoryReserved。
 */
export function getSellableInventory(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  days = BUFFER_DAYS,
): number {
  const idx = companyId * GOODS_COUNT + goodsId;
  const inventory = world.companies.inventories[idx];
  const reserved = world.companies.inventoryReserved[idx] || 0;
  const inputReserve = getInputReservation(world, companyId, goodsId, days);

  if (inputReserve > 0) {
    const threshold = inputReserve * SURPLUS_MULTIPLIER;
    if (inventory <= threshold) return 0;
    return Math.max(0, inventory - reserved - threshold);
  }

  return Math.max(0, inventory - reserved);
}

/** 单纯判断 goodsId 是否为公司任何 active 建筑的投入物 */
export function isCompanyInput(world: GameWorld, companyId: number, goodsId: number): boolean {
  return getInputReservation(world, companyId, goodsId, 1) > 0;
}
