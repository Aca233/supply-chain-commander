/**
 * 市场锚定引擎测试
 *
 * 验证：
 * 1. 电力 TCP = 锚定电价
 * 2. 采掘品（无输入）TCP 由固定成本推导
 * 3. 加工品 TCP 由输入 TCP + 固定成本推导
 * 4. 全链 TCP 与 basePrice 偏差在合理范围内
 * 5. 调参联动正确（电价↑ → 全链 TCP↑）
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAnchorPrices,
  DEFAULT_ANCHOR_CONFIG,
  type AnchorConfig,
} from '../MarketAnchor';
import { ALL_GOODS, GoodsId } from '@/data/goods';

describe('MarketAnchor', () => {
  describe('calculateAnchorPrices - 默认配置', () => {
    const result = calculateAnchorPrices(DEFAULT_ANCHOR_CONFIG);

    it('电力 TCP 等于锚定电价', () => {
      expect(result.tcp[GoodsId.ELECTRICITY]).toBe(DEFAULT_ANCHOR_CONFIG.electricityPrice);
    });

    it('所有商品 TCP 均为正数', () => {
      for (let i = 0; i < ALL_GOODS.length; i++) {
        expect(result.tcp[i]).toBeGreaterThan(0);
      }
    });

    it('采掘品（铁矿、煤炭等）TCP 与 basePrice 偏差 < 80%', () => {
      const extractionGoods = [
        GoodsId.IRON_ORE, GoodsId.COPPER_ORE, GoodsId.BAUXITE,
        GoodsId.COAL, GoodsId.CRUDE_OIL, GoodsId.NATURAL_GAS,
        GoodsId.SILICON, GoodsId.TIMBER, GoodsId.GRAIN,
      ];

      for (const id of extractionGoods) {
        const goods = ALL_GOODS[id];
        const deviation = Math.abs(result.tcp[id] - goods.basePrice) / goods.basePrice;
        expect(deviation).toBeLessThan(0.8);
      }
    });

    it('加工品（钢材、燃油等）TCP 与 basePrice 同数量级', () => {
      const processingGoods = [
        GoodsId.STEEL, GoodsId.FUEL, GoodsId.PLASTIC,
        GoodsId.CHEMICALS, GoodsId.GLASS, GoodsId.CEMENT,
      ];

      for (const id of processingGoods) {
        const goods = ALL_GOODS[id];
        // TCP 在 0.1× 到 10× basePrice 范围内
        expect(result.tcp[id]).toBeGreaterThan(goods.basePrice * 0.1);
        expect(result.tcp[id]).toBeLessThan(goods.basePrice * 10);
      }
    });

    it('高端制造品（手机、汽车等）TCP 为正且与 basePrice 同数量级', () => {
      const highEndGoods = [
        GoodsId.SMARTPHONE, GoodsId.COMPUTER, GoodsId.CAR,
        GoodsId.ELECTRIC_CAR, GoodsId.APPLIANCES,
      ];

      for (const id of highEndGoods) {
        const goods = ALL_GOODS[id];
        expect(result.tcp[id]).toBeGreaterThan(goods.basePrice * 0.05);
        expect(result.tcp[id]).toBeLessThan(goods.basePrice * 20);
      }
    });

    it('ratio 数组正确反映 TCP/basePrice', () => {
      for (const goods of ALL_GOODS) {
        const expectedRatio = result.tcp[goods.id] / goods.basePrice;
        expect(result.ratio[goods.id]).toBeCloseTo(expectedRatio, 4);
      }
    });
  });

  describe('调参联动', () => {
    it('提高锚定电价 → 全链 TCP 普遍上升', () => {
      const baseResult = calculateAnchorPrices(DEFAULT_ANCHOR_CONFIG);
      const highElecConfig: AnchorConfig = {
        ...DEFAULT_ANCHOR_CONFIG,
        electricityPrice: 1.5, // 从 0.68 提高到 1.5
      };
      const highResult = calculateAnchorPrices(highElecConfig);

      // 电力自身
      expect(highResult.tcp[GoodsId.ELECTRICITY]).toBe(1.5);

      // 高能耗行业应明显上升
      const energyIntensive = [GoodsId.STEEL, GoodsId.ALUMINUM, GoodsId.CHIPS, GoodsId.CEMENT];
      for (const id of energyIntensive) {
        expect(highResult.tcp[id]).toBeGreaterThan(baseResult.tcp[id]);
      }
    });

    it('提高工资倍率 → 劳动密集型产品 TCP 上升', () => {
      const baseResult = calculateAnchorPrices(DEFAULT_ANCHOR_CONFIG);
      const highWageConfig: AnchorConfig = {
        ...DEFAULT_ANCHOR_CONFIG,
        wageMultiplier: 2.0,
      };
      const highResult = calculateAnchorPrices(highWageConfig);

      // 所有有配方的商品 TCP 应 ≥ 基准
      for (let i = 0; i < ALL_GOODS.length; i++) {
        if (i === GoodsId.ELECTRICITY) continue;
        expect(highResult.tcp[i]).toBeGreaterThanOrEqual(baseResult.tcp[i] * 0.99);
      }
    });

    it('提高 Tier3 利润加成 → 终端产品 TCP 上升，原材料不变', () => {
      const baseResult = calculateAnchorPrices(DEFAULT_ANCHOR_CONFIG);
      const highTier3Config: AnchorConfig = {
        ...DEFAULT_ANCHOR_CONFIG,
        tierMarkup: [1.3, 1.25, 1.35, 2.5], // Tier3 从 1.5 提到 2.5
      };
      const highResult = calculateAnchorPrices(highTier3Config);

      // Tier 0 应不变（tier0 markup 没改）
      expect(highResult.tcp[GoodsId.IRON_ORE]).toBeCloseTo(baseResult.tcp[GoodsId.IRON_ORE], 2);
      expect(highResult.tcp[GoodsId.COAL]).toBeCloseTo(baseResult.tcp[GoodsId.COAL], 2);

      // Tier 3 终端产品应上升
      expect(highResult.tcp[GoodsId.SMARTPHONE]).toBeGreaterThan(baseResult.tcp[GoodsId.SMARTPHONE]);
      expect(highResult.tcp[GoodsId.CAR]).toBeGreaterThan(baseResult.tcp[GoodsId.CAR]);
    });

    it('降低固定成本权重 → TCP 下降', () => {
      const baseResult = calculateAnchorPrices(DEFAULT_ANCHOR_CONFIG);
      const lowFixedConfig: AnchorConfig = {
        ...DEFAULT_ANCHOR_CONFIG,
        fixedCostWeight: 0.5,
      };
      const lowResult = calculateAnchorPrices(lowFixedConfig);

      // 采掘品（固定成本占比高）应明显下降
      expect(lowResult.tcp[GoodsId.IRON_ORE]).toBeLessThan(baseResult.tcp[GoodsId.IRON_ORE]);
      expect(lowResult.tcp[GoodsId.GRAIN]).toBeLessThan(baseResult.tcp[GoodsId.GRAIN]);
    });
  });

  describe('边界情况', () => {
    it('极低电价不产生负数或 NaN', () => {
      const config: AnchorConfig = {
        ...DEFAULT_ANCHOR_CONFIG,
        electricityPrice: 0.01,
      };
      const result = calculateAnchorPrices(config);
      for (let i = 0; i < ALL_GOODS.length; i++) {
        expect(Number.isFinite(result.tcp[i])).toBe(true);
        expect(result.tcp[i]).toBeGreaterThan(0);
      }
    });

    it('极高电价不产生 Infinity', () => {
      const config: AnchorConfig = {
        ...DEFAULT_ANCHOR_CONFIG,
        electricityPrice: 100,
      };
      const result = calculateAnchorPrices(config);
      for (let i = 0; i < ALL_GOODS.length; i++) {
        expect(Number.isFinite(result.tcp[i])).toBe(true);
      }
    });
  });
});
