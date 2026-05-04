import { it } from 'vitest';
import { calculateAnchorPrices, DEFAULT_ANCHOR_CONFIG, type AnchorConfig } from '../MarketAnchor';
import { ALL_GOODS, GoodsId } from '@/data/goods';

it('多轮自动校准 goodsOverrides', () => {
  let overrides: Record<number, number> = {};

  // 多轮迭代逼近：每轮用上一轮的 overrides 计算 TCP，再修正
  const MAX_ITER = 10;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const config: AnchorConfig = { ...DEFAULT_ANCHOR_CONFIG, goodsOverrides: overrides };
    const result = calculateAnchorPrices(config);

    const newOverrides: Record<number, number> = {};
    for (const goods of ALL_GOODS) {
      if (goods.id === GoodsId.ELECTRICITY) continue;
      const tcp = result.tcp[goods.id];
      if (!tcp || tcp <= 0) continue;
      const correction = goods.basePrice / tcp;
      // 累积修正：在已有 override 基础上乘以修正系数
      const currentOverride = overrides[goods.id] ?? 1;
      const newOverride = currentOverride * correction;
      if (Math.abs(newOverride - 1.0) > 0.01) {
        newOverrides[goods.id] = Math.round(newOverride * 1000) / 1000;
      }
    }
    overrides = newOverrides;

    // 检查收敛
    const checkConfig: AnchorConfig = { ...DEFAULT_ANCHOR_CONFIG, goodsOverrides: overrides };
    const checkResult = calculateAnchorPrices(checkConfig);
    const deviations = ALL_GOODS.map(g =>
      Math.abs(checkResult.tcp[g.id] - g.basePrice) / g.basePrice,
    );
    const avgDev = deviations.reduce((s, d) => s + d, 0) / deviations.length;
    const maxDev = Math.max(...deviations);

    if (avgDev < 0.02) {
      console.log(`\n✅ 第 ${iter + 1} 轮收敛: 平均偏差=${(avgDev * 100).toFixed(1)}%, 最大=${(maxDev * 100).toFixed(1)}%`);
      break;
    }

    if (iter === MAX_ITER - 1) {
      console.log(`\n⚠️ 未收敛: 平均偏差=${(avgDev * 100).toFixed(1)}%, 最大=${(maxDev * 100).toFixed(1)}%`);
    }
  }

  // 输出最终 overrides
  const lines: string[] = [];
  for (const goods of ALL_GOODS) {
    if (goods.id === GoodsId.ELECTRICITY) continue;
    const override = overrides[goods.id];
    if (override === undefined) continue;
    lines.push(`  [GoodsId.${goods.key.toUpperCase()}]: ${override},`);
  }
  console.log('\n最终 overrides:\n' + lines.join('\n'));

  // 验证最终偏差
  const finalConfig: AnchorConfig = { ...DEFAULT_ANCHOR_CONFIG, goodsOverrides: overrides };
  const finalResult = calculateAnchorPrices(finalConfig);
  const deviations = ALL_GOODS.map(g =>
    Math.abs(finalResult.tcp[g.id] - g.basePrice) / g.basePrice,
  );
  const avgDev = deviations.reduce((s, d) => s + d, 0) / deviations.length;
  const maxDev = Math.max(...deviations);
  console.log(`\n最终偏差: 平均=${(avgDev * 100).toFixed(1)}%, 最大=${(maxDev * 100).toFixed(1)}%`);
});
