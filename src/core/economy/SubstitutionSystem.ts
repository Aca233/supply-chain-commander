/**
 * 商品替代系统
 * 实现商品之间的替代关系和交叉弹性
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS, GoodsId } from '@/data/goods';

/**
 * 替代关系类型
 */
export type SubstitutionType = 'substitute' | 'complement' | 'independent';

/**
 * 替代关系定义
 */
export interface SubstitutionRelation {
  goodsA: number;              // 商品A ID
  goodsB: number;              // 商品B ID
  type: SubstitutionType;      // 关系类型
  elasticity: number;          // 交叉价格弹性
  qualityDiff: number;         // 品质差异 (-1到1，正数表示B更高端)
  functionalSimilarity: number; // 功能相似度 (0-1)
}

/**
 * 替代效应结果
 */
export interface SubstitutionEffect {
  originalDemand: number;
  adjustedDemand: number;
  substitutionIn: number;      // 从其他商品转入的需求
  substitutionOut: number;     // 转出到其他商品的需求
  affectedGoods: Array<{
    goodsId: number;
    name: string;
    effect: number;
    reason: string;
  }>;
}

/**
 * 预定义的替代关系矩阵
 */
const SUBSTITUTION_RELATIONS: SubstitutionRelation[] = [
  {
    goodsA: GoodsId.SMARTPHONE,
    goodsB: GoodsId.COMPUTER,
    type: 'substitute',
    elasticity: 0.5,
    qualityDiff: 0.2,
    functionalSimilarity: 0.55,
  },
  {
    goodsA: GoodsId.CAR,
    goodsB: GoodsId.ELECTRIC_CAR,
    type: 'substitute',
    elasticity: 1.3,
    qualityDiff: 0.25,
    functionalSimilarity: 0.95,
  },
  {
    goodsA: GoodsId.CAR,
    goodsB: GoodsId.LUXURY_CAR,
    type: 'substitute',
    elasticity: 0.9,
    qualityDiff: 0.8,
    functionalSimilarity: 0.9,
  },
  {
    goodsA: GoodsId.ELECTRIC_CAR,
    goodsB: GoodsId.LUXURY_CAR,
    type: 'substitute',
    elasticity: 0.8,
    qualityDiff: 0.55,
    functionalSimilarity: 0.8,
  },
  {
    goodsA: GoodsId.COAL,
    goodsB: GoodsId.NATURAL_GAS,
    type: 'substitute',
    elasticity: 0.6,
    qualityDiff: 0.3,
    functionalSimilarity: 0.7,
  },
  {
    goodsA: GoodsId.FUEL,
    goodsB: GoodsId.ELECTRICITY,
    type: 'substitute',
    elasticity: 0.4,
    qualityDiff: 0.35,
    functionalSimilarity: 0.5,
  },
  {
    goodsA: GoodsId.PROCESSED_FOOD,
    goodsB: GoodsId.FOOD,
    type: 'substitute',
    elasticity: 0.7,
    qualityDiff: 0.1,
    functionalSimilarity: 0.8,
  },
  {
    goodsA: GoodsId.FOOD,
    goodsB: GoodsId.ORGANIC_FOOD,
    type: 'substitute',
    elasticity: 1.1,
    qualityDiff: 0.6,
    functionalSimilarity: 0.9,
  },
  {
    goodsA: GoodsId.FROZEN_FOOD,
    goodsB: GoodsId.CANNED_FOOD,
    type: 'substitute',
    elasticity: 0.7,
    qualityDiff: 0.2,
    functionalSimilarity: 0.7,
  },
  {
    goodsA: GoodsId.SEAFOOD,
    goodsB: GoodsId.MEAT,
    type: 'substitute',
    elasticity: 0.8,
    qualityDiff: 0,
    functionalSimilarity: 0.7,
  },
  {
    goodsA: GoodsId.CLOTHING,
    goodsB: GoodsId.DESIGNER_CLOTHING,
    type: 'substitute',
    elasticity: 1.6,
    qualityDiff: 0.75,
    functionalSimilarity: 0.9,
  },
  {
    goodsA: GoodsId.GENERIC_DRUG,
    goodsB: GoodsId.PATENT_DRUG,
    type: 'substitute',
    elasticity: 1.3,
    qualityDiff: 0.55,
    functionalSimilarity: 0.9,
  },
  {
    goodsA: GoodsId.GENERIC_DRUG,
    goodsB: GoodsId.OTC_DRUG,
    type: 'substitute',
    elasticity: 0.7,
    qualityDiff: -0.15,
    functionalSimilarity: 0.7,
  },
  {
    goodsA: GoodsId.SOLAR_SYSTEM,
    goodsB: GoodsId.ENERGY_STORAGE,
    type: 'complement',
    elasticity: -0.5,
    qualityDiff: 0,
    functionalSimilarity: 0,
  },
  {
    goodsA: GoodsId.MEDICAL_DEVICE,
    goodsB: GoodsId.MEDICAL_SUPPLIES,
    type: 'complement',
    elasticity: -0.6,
    qualityDiff: 0,
    functionalSimilarity: 0,
  },
  {
    goodsA: GoodsId.JEWELRY,
    goodsB: GoodsId.GOLD,
    type: 'complement',
    elasticity: -0.6,
    qualityDiff: 0,
    functionalSimilarity: 0,
  },
  {
    goodsA: GoodsId.JEWELRY,
    goodsB: GoodsId.DIAMOND,
    type: 'complement',
    elasticity: -0.7,
    qualityDiff: 0,
    functionalSimilarity: 0,
  },
  {
    goodsA: GoodsId.LUXURY_WATCH,
    goodsB: GoodsId.GOLD,
    type: 'complement',
    elasticity: -0.4,
    qualityDiff: 0,
    functionalSimilarity: 0,
  },
];

export function getAllSubstitutionRelations(): readonly SubstitutionRelation[] {
  return SUBSTITUTION_RELATIONS;
}

// 建立查询索引
const relationsByGoods = new Map<number, SubstitutionRelation[]>();

function buildRelationIndex(): void {
  for (const relation of SUBSTITUTION_RELATIONS) {
    // 为A建立索引
    if (!relationsByGoods.has(relation.goodsA)) {
      relationsByGoods.set(relation.goodsA, []);
    }
    relationsByGoods.get(relation.goodsA)!.push(relation);
    
    // 为B建立索引（反向关系）
    if (!relationsByGoods.has(relation.goodsB)) {
      relationsByGoods.set(relation.goodsB, []);
    }
    relationsByGoods.get(relation.goodsB)!.push({
      ...relation,
      goodsA: relation.goodsB,
      goodsB: relation.goodsA,
      qualityDiff: -relation.qualityDiff,
    });
  }
}

// 初始化索引
buildRelationIndex();

/**
 * 获取商品的所有替代/互补关系
 */
export function getRelations(goodsId: number): SubstitutionRelation[] {
  return relationsByGoods.get(goodsId) || [];
}

/**
 * 获取两个商品之间的关系
 */
export function getRelationBetween(goodsA: number, goodsB: number): SubstitutionRelation | null {
  const relations = getRelations(goodsA);
  return relations.find(r => r.goodsB === goodsB) || null;
}

/**
 * 计算交叉价格弹性影响
 * 当商品B价格变化时对商品A需求的影响
 */
export function calculateCrossElasticityEffect(
  world: GameWorld,
  targetGoodsId: number,
  otherGoodsId: number,
  priceChangeRatio: number // 例如 1.1 表示涨价10%
): number {
  const relation = getRelationBetween(targetGoodsId, otherGoodsId);
  if (!relation) return 0;
  
  // 交叉弹性效应 = 弹性 × 价格变化百分比
  const priceChange = priceChangeRatio - 1;
  const effect = relation.elasticity * priceChange;
  
  return effect;
}

/**
 * 计算商品的替代效应
 */
export function calculateSubstitutionEffect(
  world: GameWorld,
  goodsId: number,
  baseDemand: number
): SubstitutionEffect {
  const relations = getRelations(goodsId);
  const goodsDef = ALL_GOODS.find(g => g.id === goodsId);
  
  if (!goodsDef || relations.length === 0) {
    return {
      originalDemand: baseDemand,
      adjustedDemand: baseDemand,
      substitutionIn: 0,
      substitutionOut: 0,
      affectedGoods: [],
    };
  }
  
  let substitutionIn = 0;
  let substitutionOut = 0;
  const affectedGoods: SubstitutionEffect['affectedGoods'] = [];
  
  const currentPrice = world.goods.prices[goodsId];
  const basePrice = goodsDef.basePrice;
  const priceRatio = currentPrice / basePrice;
  
  for (const relation of relations) {
    const otherGoodsDef = ALL_GOODS.find(g => g.id === relation.goodsB);
    if (!otherGoodsDef) continue;
    
    const otherPrice = world.goods.prices[relation.goodsB];
    const otherBasePrice = otherGoodsDef.basePrice;
    const otherPriceRatio = otherPrice / otherBasePrice;
    
    // 相对价格变化
    const relativePriceChange = priceRatio / otherPriceRatio - 1;
    
    if (relation.type === 'substitute') {
      // 替代品：如果本商品相对变贵，需求流向替代品
      if (relativePriceChange > 0.05) {
        // 本商品相对变贵，需求外流
        const outflow = baseDemand * relativePriceChange * relation.elasticity * relation.functionalSimilarity;
        substitutionOut += outflow;
        affectedGoods.push({
          goodsId: relation.goodsB,
          name: otherGoodsDef.name,
          effect: -outflow,
          reason: `价格上涨导致需求转向 ${otherGoodsDef.name}`,
        });
      } else if (relativePriceChange < -0.05) {
        // 本商品相对变便宜，需求流入
        const inflow = Math.abs(relativePriceChange) * relation.elasticity * relation.functionalSimilarity * world.goods.demands[relation.goodsB];
        substitutionIn += inflow;
        affectedGoods.push({
          goodsId: relation.goodsB,
          name: otherGoodsDef.name,
          effect: inflow,
          reason: `从 ${otherGoodsDef.name} 转入需求（价格优势）`,
        });
      }
    } else if (relation.type === 'complement') {
      // 互补品：互补品价格上涨会减少本商品需求
      if (otherPriceRatio > 1.1) {
        const reduction = baseDemand * (otherPriceRatio - 1) * Math.abs(relation.elasticity);
        substitutionOut += reduction;
        affectedGoods.push({
          goodsId: relation.goodsB,
          name: otherGoodsDef.name,
          effect: -reduction,
          reason: `互补品 ${otherGoodsDef.name} 涨价导致需求下降`,
        });
      }
    }
  }
  
  const adjustedDemand = Math.max(0, baseDemand + substitutionIn - substitutionOut);
  
  return {
    originalDemand: baseDemand,
    adjustedDemand,
    substitutionIn,
    substitutionOut,
    affectedGoods,
  };
}

/**
 * 应用替代效应到整个市场
 */
export function applyMarketSubstitution(world: GameWorld): void {
  // 保存原始需求
  const originalDemands = new Float32Array(world.goods.demands);
  
  // 对每个商品应用替代效应
  for (let i = 0; i < world.goods.count; i++) {
    const effect = calculateSubstitutionEffect(world, i, originalDemands[i]);
    world.goods.demands[i] = effect.adjustedDemand;
  }
}

/**
 * 计算商品的替代弹性矩阵（用于显示）
 */
export function getSubstitutionMatrix(goodsIds: number[]): number[][] {
  const size = goodsIds.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        const relation = getRelationBetween(goodsIds[i], goodsIds[j]);
        matrix[i][j] = relation?.elasticity || 0;
      }
    }
  }
  
  return matrix;
}

/**
 * 找出最强的替代品
 */
export function findBestSubstitutes(
  goodsId: number,
  limit: number = 5
): Array<{ goodsId: number; name: string; elasticity: number; similarity: number }> {
  const relations = getRelations(goodsId);
  
  return relations
    .filter(r => r.type === 'substitute')
    .sort((a, b) => (b.elasticity * b.functionalSimilarity) - (a.elasticity * a.functionalSimilarity))
    .slice(0, limit)
    .map(r => {
      const goods = ALL_GOODS.find(g => g.id === r.goodsB);
      return {
        goodsId: r.goodsB,
        name: goods?.name || `商品#${r.goodsB}`,
        elasticity: r.elasticity,
        similarity: r.functionalSimilarity,
      };
    });
}

/**
 * 找出最强的互补品
 */
export function findBestComplements(
  goodsId: number,
  limit: number = 5
): Array<{ goodsId: number; name: string; elasticity: number }> {
  const relations = getRelations(goodsId);
  
  return relations
    .filter(r => r.type === 'complement')
    .sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity))
    .slice(0, limit)
    .map(r => {
      const goods = ALL_GOODS.find(g => g.id === r.goodsB);
      return {
        goodsId: r.goodsB,
        name: goods?.name || `商品#${r.goodsB}`,
        elasticity: r.elasticity,
      };
    });
}

/**
 * 预测价格变化对相关商品的影响
 */
export function predictPriceChangeImpact(
  world: GameWorld,
  goodsId: number,
  newPrice: number
): Array<{
  goodsId: number;
  name: string;
  currentDemand: number;
  predictedDemandChange: number;
  changePercent: number;
}> {
  const results: Array<{
    goodsId: number;
    name: string;
    currentDemand: number;
    predictedDemandChange: number;
    changePercent: number;
  }> = [];
  
  const currentPrice = world.goods.prices[goodsId];
  const priceChangeRatio = newPrice / currentPrice;
  
  const relations = getRelations(goodsId);
  
  for (const relation of relations) {
    const otherGoods = ALL_GOODS.find(g => g.id === relation.goodsB);
    if (!otherGoods) continue;
    
    const currentDemand = world.goods.demands[relation.goodsB];
    let demandChange = 0;
    
    if (relation.type === 'substitute') {
      // 本商品涨价 → 替代品需求增加
      demandChange = currentDemand * (priceChangeRatio - 1) * relation.elasticity;
    } else if (relation.type === 'complement') {
      // 本商品涨价 → 互补品需求减少
      demandChange = currentDemand * (priceChangeRatio - 1) * relation.elasticity;
    }
    
    if (Math.abs(demandChange) > 0.01) {
      results.push({
        goodsId: relation.goodsB,
        name: otherGoods.name,
        currentDemand,
        predictedDemandChange: demandChange,
        changePercent: (demandChange / currentDemand) * 100,
      });
    }
  }
  
  return results.sort((a, b) => Math.abs(b.predictedDemandChange) - Math.abs(a.predictedDemandChange));
}
