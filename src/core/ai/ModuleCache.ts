/**
 * 重型AI模块缓存系统
 * 
 * 竞争情报、风险评估等模块不需要每tick更新
 * 通过缓存结果实现节流，大幅减少计算量
 * 
 * 节流策略：
 * - 竞争情报：每120tick更新（游戏5天）
 * - 风险评估：每60tick更新
 * - 战略规划：每240tick更新（游戏10天）
 * - 历史学习：每100tick更新
 */

import { GameWorld } from '@/core/world/GameWorld';
import { MAX_COMPANIES, GOODS_COUNT, ACTUAL_GOODS_COUNT } from '@/core/constants';

// ==================== 节流配置 ====================

export const MODULE_THROTTLE = {
  competitiveIntelligence: 120,
  riskManagement: 60,
  strategicPlanning: 240,
  historicalLearning: 100,
  profitAnalysis: 30,
  marketShareAnalysis: 60,
} as const;

type ModuleType = keyof typeof MODULE_THROTTLE;

// ==================== 缓存结构定义 ====================

/**
 * 竞争情报缓存
 */
export interface CachedCompetitiveIntelligence {
  companyId: number;
  tick: number;
  marketShares: Map<number, number>;  // goodsId -> share
  competitors: number[];               // 主要竞争对手ID
  competitorStrength: Map<number, number>; // competitorId -> strength
  threats: string[];
  opportunities: string[];
}

/**
 * 风险评估缓存
 */
export interface CachedRiskAssessment {
  companyId: number;
  tick: number;
  overallRisk: number;        // 0-1
  liquidityRisk: number;       // 流动性风险
  concentrationRisk: number;   // 集中度风险
  marketRisk: number;          // 市场风险
  operationalRisk: number;     // 运营风险
  recommendations: string[];
}

/**
 * 战略规划缓存
 */
export interface CachedStrategicPlan {
  companyId: number;
  tick: number;
  currentPhase: 'growth' | 'consolidation' | 'expansion' | 'defensive';
  targetMarkets: number[];     // 目标商品ID
  investmentPriority: 'production' | 'trading' | 'retail' | 'balanced';
  expansionReadiness: number;  // 0-1
  shortTermGoals: string[];
  longTermGoals: string[];
}

/**
 * 利润分析缓存
 */
export interface CachedProfitAnalysis {
  companyId: number;
  tick: number;
  overallMargin: number;
  topProfitGoods: Array<{ goodsId: number; margin: number; volume: number }>;
  lossGoods: Array<{ goodsId: number; margin: number; volume: number }>;
  recommendations: string[];
}

// ==================== 缓存管理器 ====================

class ModuleCacheManager {
  // 各模块缓存存储
  private competitiveIntelligence: Map<number, CachedCompetitiveIntelligence> = new Map();
  private riskAssessment: Map<number, CachedRiskAssessment> = new Map();
  private strategicPlan: Map<number, CachedStrategicPlan> = new Map();
  private profitAnalysis: Map<number, CachedProfitAnalysis> = new Map();
  
  /**
   * 检查缓存是否过期
   */
  private isExpired(cachedTick: number, currentTick: number, module: ModuleType): boolean {
    return currentTick - cachedTick >= MODULE_THROTTLE[module];
  }
  
  /**
   * 获取或计算竞争情报
   */
  getCompetitiveIntelligence(
    world: GameWorld,
    companyId: number,
    forceRecalc: boolean = false
  ): CachedCompetitiveIntelligence {
    const cached = this.competitiveIntelligence.get(companyId);
    
    if (!forceRecalc && cached && !this.isExpired(cached.tick, world.tick, 'competitiveIntelligence')) {
      return cached;
    }
    
    // 计算新数据
    const result = this.calculateCompetitiveIntelligence(world, companyId);
    this.competitiveIntelligence.set(companyId, result);
    return result;
  }
  
  /**
   * 获取或计算风险评估
   */
  getRiskAssessment(
    world: GameWorld,
    companyId: number,
    forceRecalc: boolean = false
  ): CachedRiskAssessment {
    const cached = this.riskAssessment.get(companyId);
    
    if (!forceRecalc && cached && !this.isExpired(cached.tick, world.tick, 'riskManagement')) {
      return cached;
    }
    
    const result = this.calculateRiskAssessment(world, companyId);
    this.riskAssessment.set(companyId, result);
    return result;
  }
  
  /**
   * 获取或计算战略规划
   */
  getStrategicPlan(
    world: GameWorld,
    companyId: number,
    forceRecalc: boolean = false
  ): CachedStrategicPlan {
    const cached = this.strategicPlan.get(companyId);
    
    if (!forceRecalc && cached && !this.isExpired(cached.tick, world.tick, 'strategicPlanning')) {
      return cached;
    }
    
    const result = this.calculateStrategicPlan(world, companyId);
    this.strategicPlan.set(companyId, result);
    return result;
  }
  
  /**
   * 获取或计算利润分析
   */
  getProfitAnalysis(
    world: GameWorld,
    companyId: number,
    forceRecalc: boolean = false
  ): CachedProfitAnalysis {
    const cached = this.profitAnalysis.get(companyId);
    
    if (!forceRecalc && cached && !this.isExpired(cached.tick, world.tick, 'profitAnalysis')) {
      return cached;
    }
    
    const result = this.calculateProfitAnalysis(world, companyId);
    this.profitAnalysis.set(companyId, result);
    return result;
  }
  
  // ==================== 计算函数 ====================
  
  /**
   * 计算竞争情报
   */
  private calculateCompetitiveIntelligence(world: GameWorld, companyId: number): CachedCompetitiveIntelligence {
    const marketShares = new Map<number, number>();
    const competitorStrength = new Map<number, number>();
    const competitors: number[] = [];
    const threats: string[] = [];
    const opportunities: string[] = [];
    
    // 计算每个商品的市场份额
    for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
      const myIdx = companyId * GOODS_COUNT + goodsId;
      const mySales = world.trades.cumulativeSalesQuantity[myIdx];
      
      if (mySales > 0) {
        // 计算市场总销售
        let totalSales = 0;
        for (let cId = 0; cId < MAX_COMPANIES; cId++) {
          totalSales += world.trades.cumulativeSalesQuantity[cId * GOODS_COUNT + goodsId];
        }
        
        const share = totalSales > 0 ? mySales / totalSales : 0;
        marketShares.set(goodsId, share);
        
        // 识别主要竞争对手
        if (share < 0.3) {
          threats.push(`商品${goodsId}市场份额低于30%`);
        }
      }
    }
    
    // 识别竞争对手
    for (let cId = 0; cId < MAX_COMPANIES; cId++) {
      if (cId === companyId) continue;
      
      const assets = world.companies.totalAssets[cId];
      if (assets > 0) {
        competitorStrength.set(cId, Math.log10(assets));
        
        // 资产前10大的为主要竞争对手
        if (competitors.length < 10) {
          competitors.push(cId);
        }
      }
    }
    
    // 按资产排序
    competitors.sort((a, b) => 
      (world.companies.totalAssets[b] || 0) - (world.companies.totalAssets[a] || 0)
    );
    
    return {
      companyId,
      tick: world.tick,
      marketShares,
      competitors: competitors.slice(0, 5),
      competitorStrength,
      threats,
      opportunities,
    };
  }
  
  /**
   * 计算风险评估
   */
  private calculateRiskAssessment(world: GameWorld, companyId: number): CachedRiskAssessment {
    const cash = world.companies.cash[companyId];
    const totalAssets = world.companies.totalAssets[companyId];
    const liabilities = world.companies.totalLiabilities[companyId];
    
    // 流动性风险
    const cashRatio = totalAssets > 0 ? cash / totalAssets : 0;
    const liquidityRisk = cashRatio < 0.1 ? 0.8 : cashRatio < 0.2 ? 0.5 : 0.2;
    
    // 集中度风险（检查库存是否过于集中）
    let maxInventoryValue = 0;
    let totalInventoryValue = 0;
    
    for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
      const idx = companyId * GOODS_COUNT + goodsId;
      const inventory = world.companies.inventories[idx];
      const price = world.goods.prices[goodsId];
      const value = inventory * price;
      
      totalInventoryValue += value;
      maxInventoryValue = Math.max(maxInventoryValue, value);
    }
    
    const concentrationRatio = totalInventoryValue > 0 ? maxInventoryValue / totalInventoryValue : 0;
    const concentrationRisk = concentrationRatio > 0.5 ? 0.7 : concentrationRatio > 0.3 ? 0.4 : 0.2;
    
    // 市场风险（基于价格波动）
    const marketRisk = 0.3; // 简化版本
    
    // 运营风险（基于负债率）
    const debtRatio = totalAssets > 0 ? liabilities / totalAssets : 0;
    const operationalRisk = debtRatio > 0.8 ? 0.8 : debtRatio > 0.5 ? 0.5 : 0.2;
    
    // 综合风险
    const overallRisk = (liquidityRisk + concentrationRisk + marketRisk + operationalRisk) / 4;
    
    // 建议
    const recommendations: string[] = [];
    if (liquidityRisk > 0.5) recommendations.push('增加现金储备');
    if (concentrationRisk > 0.5) recommendations.push('分散库存结构');
    if (operationalRisk > 0.5) recommendations.push('降低负债水平');
    
    return {
      companyId,
      tick: world.tick,
      overallRisk,
      liquidityRisk,
      concentrationRisk,
      marketRisk,
      operationalRisk,
      recommendations,
    };
  }
  
  /**
   * 计算战略规划
   */
  private calculateStrategicPlan(world: GameWorld, companyId: number): CachedStrategicPlan {
    const cash = world.companies.cash[companyId];
    const totalAssets = world.companies.totalAssets[companyId];
    const cashRatio = totalAssets > 0 ? cash / totalAssets : 0;
    
    // 确定当前阶段
    let currentPhase: CachedStrategicPlan['currentPhase'];
    if (cashRatio > 0.4 && totalAssets > 1000000) {
      currentPhase = 'expansion';
    } else if (cashRatio > 0.25) {
      currentPhase = 'growth';
    } else if (cashRatio < 0.1) {
      currentPhase = 'defensive';
    } else {
      currentPhase = 'consolidation';
    }
    
    // 确定目标市场（基于当前最赚钱的商品）
    const targetMarkets: number[] = [];
    const profitByGoods: Array<{ goodsId: number; profit: number }> = [];
    
    for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
      const idx = companyId * GOODS_COUNT + goodsId;
      const sales = world.trades.cumulativeSalesQuantity[idx];
      const revenue = world.trades.cumulativeSalesRevenue[idx];
      
      if (sales > 0) {
        // 简化利润计算
        const avgPrice = revenue / sales;
        const basePrice = world.goods.baseValues[goodsId];
        const profit = (avgPrice - basePrice) * sales;
        
        profitByGoods.push({ goodsId, profit });
      }
    }
    
    profitByGoods.sort((a, b) => b.profit - a.profit);
    targetMarkets.push(...profitByGoods.slice(0, 5).map(g => g.goodsId));
    
    // 投资优先级
    let investmentPriority: CachedStrategicPlan['investmentPriority'];
    if (currentPhase === 'expansion') {
      investmentPriority = 'production';
    } else if (currentPhase === 'defensive') {
      investmentPriority = 'trading';
    } else {
      investmentPriority = 'balanced';
    }
    
    // 扩张准备度
    const expansionReadiness = Math.min(1, cashRatio * 2);
    
    return {
      companyId,
      tick: world.tick,
      currentPhase,
      targetMarkets,
      investmentPriority,
      expansionReadiness,
      shortTermGoals: [`保持${currentPhase}策略`],
      longTermGoals: ['扩大市场份额', '提高利润率'],
    };
  }
  
  /**
   * 计算利润分析
   */
  private calculateProfitAnalysis(world: GameWorld, companyId: number): CachedProfitAnalysis {
    const profitByGoods: Array<{ goodsId: number; margin: number; volume: number; revenue: number }> = [];
    let totalRevenue = 0;
    let totalCost = 0;
    
    for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
      const idx = companyId * GOODS_COUNT + goodsId;
      const sales = world.trades.cumulativeSalesQuantity[idx];
      const revenue = world.trades.cumulativeSalesRevenue[idx];
      
      if (sales > 0) {
        const avgPrice = revenue / sales;
        const basePrice = world.goods.baseValues[goodsId];
        const margin = (avgPrice - basePrice) / avgPrice;
        
        profitByGoods.push({ 
          goodsId, 
          margin, 
          volume: sales,
          revenue,
        });
        
        totalRevenue += revenue;
        totalCost += basePrice * sales;
      }
    }
    
    const overallMargin = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;
    
    // 排序
    profitByGoods.sort((a, b) => b.margin - a.margin);
    
    const topProfitGoods = profitByGoods
      .filter(g => g.margin > 0)
      .slice(0, 5)
      .map(g => ({ goodsId: g.goodsId, margin: g.margin, volume: g.volume }));
    
    const lossGoods = profitByGoods
      .filter(g => g.margin < 0)
      .slice(-5)
      .map(g => ({ goodsId: g.goodsId, margin: g.margin, volume: g.volume }));
    
    const recommendations: string[] = [];
    if (overallMargin < 0.05) {
      recommendations.push('整体利润率过低，需调整定价策略');
    }
    if (lossGoods.length > 3) {
      recommendations.push('多个商品处于亏损状态，考虑退出');
    }
    
    return {
      companyId,
      tick: world.tick,
      overallMargin,
      topProfitGoods,
      lossGoods,
      recommendations,
    };
  }
  
  // ==================== 工具函数 ====================
  
  /**
   * 清除指定公司的所有缓存
   */
  clearCompanyCache(companyId: number): void {
    this.competitiveIntelligence.delete(companyId);
    this.riskAssessment.delete(companyId);
    this.strategicPlan.delete(companyId);
    this.profitAnalysis.delete(companyId);
  }
  
  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.competitiveIntelligence.clear();
    this.riskAssessment.clear();
    this.strategicPlan.clear();
    this.profitAnalysis.clear();
  }
  
  /**
   * 获取缓存统计
   */
  getStats(): { 
    competitiveIntelligence: number;
    riskAssessment: number;
    strategicPlan: number;
    profitAnalysis: number;
  } {
    return {
      competitiveIntelligence: this.competitiveIntelligence.size,
      riskAssessment: this.riskAssessment.size,
      strategicPlan: this.strategicPlan.size,
      profitAnalysis: this.profitAnalysis.size,
    };
  }
}

// 导出单例
export const moduleCache = new ModuleCacheManager();

// 导出便捷函数
export function getCachedCompetitiveIntelligence(
  world: GameWorld,
  companyId: number
): CachedCompetitiveIntelligence {
  return moduleCache.getCompetitiveIntelligence(world, companyId);
}

export function getCachedRiskAssessment(
  world: GameWorld,
  companyId: number
): CachedRiskAssessment {
  return moduleCache.getRiskAssessment(world, companyId);
}

export function getCachedStrategicPlan(
  world: GameWorld,
  companyId: number
): CachedStrategicPlan {
  return moduleCache.getStrategicPlan(world, companyId);
}

export function getCachedProfitAnalysis(
  world: GameWorld,
  companyId: number
): CachedProfitAnalysis {
  return moduleCache.getProfitAnalysis(world, companyId);
}

export function clearAllModuleCache(): void {
  moduleCache.clearAll();
}

export function getModuleCacheStats(): ReturnType<typeof moduleCache.getStats> {
  return moduleCache.getStats();
}