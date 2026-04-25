/**
 * 市场情报与竞争策略系统
 * 分析市场状况、竞争对手动态，生成战略建议
 *
 * v4.0更新：使用outputModeIds替代recipeIds
 */

import { GameWorld } from '@/core/world/GameWorld';
import { ALL_GOODS, GoodsDefinition } from '@/data/goods';
import { GOODS_COUNT } from '@/core/constants';
import { AIPersonality, getCompanyPersonality } from './AIPersonality';

/**
 * 市场情报
 */
export interface MarketIntelligence {
  goodsId: number;
  name: string;
  
  // 价格情报
  currentPrice: number;
  priceChange24h: number;       // 24tick价格变化
  priceChange7d: number;        // 168tick价格变化
  priceVolatility: number;      // 价格波动率
  
  // 供需情报
  supply: number;
  demand: number;
  supplyDemandRatio: number;
  supplyTrend: 'increasing' | 'stable' | 'decreasing';
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  
  // 市场集中度
  marketLeader: number | null;  // 市场领导者公司ID
  marketLeaderShare: number;    // 市场领导者份额
  herfindahlIndex: number;      // 赫芬达尔指数（市场集中度）
  
  // 机会评估
  profitPotential: 'high' | 'medium' | 'low';
  entryBarrier: 'high' | 'medium' | 'low';
  riskLevel: 'high' | 'medium' | 'low';
}

/**
 * 竞争对手分析
 */
export interface CompetitorAnalysis {
  companyId: number;
  name: string;
  
  // 规模评估
  estimatedCash: 'very_high' | 'high' | 'medium' | 'low';
  buildingCount: number;
  marketShare: number;
  
  // 行为模式
  pricingStrategy: 'aggressive' | 'competitive' | 'premium';
  expansionRate: 'fast' | 'moderate' | 'slow';
  focusAreas: number[];         // 主营商品ID
  
  // 威胁评估
  threatLevel: 'high' | 'medium' | 'low';
  competitiveAdvantage: string[];
  weaknesses: string[];
  
  // 最近活动
  recentActions: string[];
}

/**
 * 战略建议
 */
export interface StrategicRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'expansion' | 'defense' | 'opportunity' | 'efficiency' | 'risk';
  title: string;
  description: string;
  expectedImpact: string;
  requiredResources: number;
  timeframe: 'immediate' | 'short_term' | 'long_term';
  relatedGoods?: number[];
  relatedCompetitors?: number[];
}

/**
 * 收集商品市场情报
 */
export function collectMarketIntelligence(
  world: GameWorld,
  goodsId: number
): MarketIntelligence {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const currentPrice = world.goods.prices[goodsId];
  const basePrice = goods?.basePrice || currentPrice;
  
  // 价格历史分析（简化版本）
  const priceChange24h = (currentPrice - basePrice * 0.98) / basePrice;
  const priceChange7d = (currentPrice - basePrice * 0.95) / basePrice;
  const priceVolatility = Math.abs(priceChange24h) * 2;
  
  // 供需数据
  const supply = world.goods.supplies[goodsId];
  const demand = world.goods.demands[goodsId];
  const supplyDemandRatio = demand > 0 ? supply / demand : 2;
  
  // 分析供需趋势
  const supplyTrend = supplyDemandRatio > 1.2 ? 'increasing' : 
                      supplyDemandRatio < 0.8 ? 'decreasing' : 'stable';
  const demandTrend = demand > supply * 1.1 ? 'increasing' :
                      demand < supply * 0.9 ? 'decreasing' : 'stable';
  
  // 市场集中度分析
  const { marketLeader, marketLeaderShare, herfindahlIndex } = 
    analyzeMarketConcentration(world, goodsId);
  
  // 机会评估
  const profitPotential = supplyDemandRatio < 0.7 ? 'high' :
                          supplyDemandRatio < 1.0 ? 'medium' : 'low';
  const entryBarrier = herfindahlIndex > 0.25 ? 'high' :
                       herfindahlIndex > 0.15 ? 'medium' : 'low';
  const riskLevel = priceVolatility > 0.2 ? 'high' :
                    priceVolatility > 0.1 ? 'medium' : 'low';
  
  return {
    goodsId,
    name: goods?.name || `商品#${goodsId}`,
    currentPrice,
    priceChange24h,
    priceChange7d,
    priceVolatility,
    supply,
    demand,
    supplyDemandRatio,
    supplyTrend,
    demandTrend,
    marketLeader,
    marketLeaderShare,
    herfindahlIndex,
    profitPotential,
    entryBarrier,
    riskLevel,
  };
}

/**
 * 分析市场集中度
 */
function analyzeMarketConcentration(world: GameWorld, goodsId: number): {
  marketLeader: number | null;
  marketLeaderShare: number;
  herfindahlIndex: number;
} {
  const companyShares: Map<number, number> = new Map();
  let totalProduction = 0;
  
  // 统计各公司产量
  for (let i = 0; i < world.buildings.count; i++) {
    const owner = world.buildings.owners[i];
    const efficiency = world.buildings.efficiencies[i];
    
    // 简化：假设建筑产出等于效率*10
    const production = efficiency * 10;
    
    companyShares.set(owner, (companyShares.get(owner) || 0) + production);
    totalProduction += production;
  }
  
  if (totalProduction === 0) {
    return { marketLeader: null, marketLeaderShare: 0, herfindahlIndex: 0 };
  }
  
  // 计算市场份额和HHI
  let marketLeader: number | null = null;
  let marketLeaderShare = 0;
  let herfindahlIndex = 0;
  
  for (const [companyId, production] of companyShares) {
    const share = production / totalProduction;
    herfindahlIndex += share * share;
    
    if (share > marketLeaderShare) {
      marketLeaderShare = share;
      marketLeader = companyId;
    }
  }
  
  return { marketLeader, marketLeaderShare, herfindahlIndex };
}

/**
 * 分析竞争对手
 */
export function analyzeCompetitor(
  world: GameWorld,
  companyId: number,
  observerCompanyId: number
): CompetitorAnalysis {
  const name = world.companies.names[companyId] || `公司#${companyId}`;
  
  // 估算现金水平
  const cash = world.companies.cash[companyId];
  const estimatedCash = cash > 10000000 ? 'very_high' :
                        cash > 5000000 ? 'high' :
                        cash > 1000000 ? 'medium' : 'low';
  
  // 统计建筑和主营业务
  let buildingCount = 0;
  const buildingTypeProduction: Map<number, number> = new Map();
  
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      buildingCount++;
      const buildingTypeId = world.buildings.types[i];
      // 记录建筑类型作为主营业务指标（替代原来的recipeId）
      buildingTypeProduction.set(buildingTypeId, (buildingTypeProduction.get(buildingTypeId) || 0) + 1);
    }
  }
  
  // 确定专注领域（使用建筑类型ID）
  const focusAreas: number[] = [];
  for (const [buildingTypeId, count] of buildingTypeProduction) {
    if (count >= 2) {
      focusAreas.push(buildingTypeId);
    }
  }
  
  // 市场份额估算
  const totalBuildings = world.buildings.count;
  const marketShare = totalBuildings > 0 ? buildingCount / totalBuildings : 0;
  
  // 获取人格信息（如果可用）
  const personality = getCompanyPersonality(world, companyId);
  
  // 推断定价策略
  let pricingStrategy: 'aggressive' | 'competitive' | 'premium' = 'competitive';
  if (personality) {
    if (personality.pricingBias < -0.2) pricingStrategy = 'aggressive';
    else if (personality.pricingBias > 0.2) pricingStrategy = 'premium';
  }
  
  // 推断扩张速度
  let expansionRate: 'fast' | 'moderate' | 'slow' = 'moderate';
  if (personality) {
    if (personality.expansionBias > 0.7) expansionRate = 'fast';
    else if (personality.expansionBias < 0.3) expansionRate = 'slow';
  }
  
  // 威胁评估
  const threatLevel = marketShare > 0.2 ? 'high' :
                      marketShare > 0.1 ? 'medium' : 'low';
  
  // 竞争优势分析
  const competitiveAdvantage: string[] = [];
  const weaknesses: string[] = [];
  
  if (estimatedCash === 'very_high' || estimatedCash === 'high') {
    competitiveAdvantage.push('资金雄厚');
  } else if (estimatedCash === 'low') {
    weaknesses.push('现金紧张');
  }
  
  if (buildingCount > 10) {
    competitiveAdvantage.push('规模优势');
  } else if (buildingCount < 3) {
    weaknesses.push('规模较小');
  }
  
  if (focusAreas.length === 1) {
    competitiveAdvantage.push('专业化优势');
  } else if (focusAreas.length > 4) {
    weaknesses.push('业务分散');
  }
  
  // 最近活动（简化）
  const recentActions: string[] = [];
  
  return {
    companyId,
    name,
    estimatedCash,
    buildingCount,
    marketShare,
    pricingStrategy,
    expansionRate,
    focusAreas,
    threatLevel,
    competitiveAdvantage,
    weaknesses,
    recentActions,
  };
}

/**
 * 生成战略建议
 */
export function generateStrategicRecommendations(
  world: GameWorld,
  companyId: number
): StrategicRecommendation[] {
  const recommendations: StrategicRecommendation[] = [];
  const cash = world.companies.cash[companyId];
  
  // 收集市场情报
  const marketOpportunities: MarketIntelligence[] = [];
  
  for (let i = 0; i < Math.min(GOODS_COUNT, 30); i++) {
    const intel = collectMarketIntelligence(world, i);
    
    // 识别高潜力市场
    if (intel.profitPotential === 'high' && intel.entryBarrier !== 'high') {
      marketOpportunities.push(intel);
    }
  }
  
  // 机会型建议
  for (const opportunity of marketOpportunities.slice(0, 3)) {
    recommendations.push({
      priority: 'high',
      category: 'opportunity',
      title: `进入${opportunity.name}市场`,
      description: `${opportunity.name}供不应求（供需比${opportunity.supplyDemandRatio.toFixed(2)}），存在较大利润空间`,
      expectedImpact: '预计可获得15-25%利润率',
      requiredResources: 500000,
      timeframe: 'short_term',
      relatedGoods: [opportunity.goodsId],
    });
  }
  
  // 分析竞争对手
  for (let i = 0; i < world.companies.count; i++) {
    if (i === companyId || !world.companies.isAI[i]) continue;
    
    const competitor = analyzeCompetitor(world, i, companyId);
    
    if (competitor.threatLevel === 'high') {
      recommendations.push({
        priority: 'high',
        category: 'defense',
        title: `应对${competitor.name}的竞争`,
        description: `${competitor.name}在市场占有较大份额，采用${
          competitor.pricingStrategy === 'aggressive' ? '激进定价' :
          competitor.pricingStrategy === 'premium' ? '高端定价' : '竞争定价'
        }策略`,
        expectedImpact: '维护市场份额',
        requiredResources: 0,
        timeframe: 'immediate',
        relatedCompetitors: [competitor.companyId],
      });
    }
  }
  
  // 效率优化建议
  if (cash > 1000000) {
    recommendations.push({
      priority: 'medium',
      category: 'efficiency',
      title: '升级生产设施',
      description: '升级现有建筑可提高生产效率，降低单位成本',
      expectedImpact: '生产效率提升20%',
      requiredResources: 300000,
      timeframe: 'short_term',
    });
  }
  
  // 风险管理建议
  const inventoryValue = calculateInventoryValue(world, companyId);
  if (inventoryValue > cash * 2) {
    recommendations.push({
      priority: 'critical',
      category: 'risk',
      title: '降低库存风险',
      description: '当前库存价值过高，存在价格下跌风险',
      expectedImpact: '改善现金流，降低风险敞口',
      requiredResources: 0,
      timeframe: 'immediate',
    });
  }
  
  // 扩张建议
  if (cash > 5000000) {
    recommendations.push({
      priority: 'medium',
      category: 'expansion',
      title: '产能扩张',
      description: '当前现金充裕，可考虑新建生产设施扩大产能',
      expectedImpact: '产能提升50%',
      requiredResources: 2000000,
      timeframe: 'long_term',
    });
  }
  
  // 按优先级排序
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations;
}

/**
 * 计算库存价值
 */
function calculateInventoryValue(world: GameWorld, companyId: number): number {
  let value = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    const qty = world.companies.inventories[companyId * GOODS_COUNT + i];
    value += qty * world.goods.prices[i];
  }
  return value;
}

/**
 * 获取市场概览
 */
export function getMarketOverview(world: GameWorld): {
  totalGDP: number;
  activeMarkets: number;
  bullishMarkets: number;
  bearishMarkets: number;
  opportunities: MarketIntelligence[];
  threats: MarketIntelligence[];
} {
  let activeMarkets = 0;
  let bullishMarkets = 0;
  let bearishMarkets = 0;
  const opportunities: MarketIntelligence[] = [];
  const threats: MarketIntelligence[] = [];
  
  for (let i = 0; i < Math.min(GOODS_COUNT, 40); i++) {
    const intel = collectMarketIntelligence(world, i);
    
    if (intel.supply > 0 || intel.demand > 0) {
      activeMarkets++;
      
      if (intel.supplyDemandRatio < 0.8) {
        bullishMarkets++;
        if (intel.profitPotential === 'high') {
          opportunities.push(intel);
        }
      } else if (intel.supplyDemandRatio > 1.3) {
        bearishMarkets++;
        if (intel.riskLevel === 'high') {
          threats.push(intel);
        }
      }
    }
  }
  
  // 排序
  opportunities.sort((a, b) => a.supplyDemandRatio - b.supplyDemandRatio);
  threats.sort((a, b) => b.priceVolatility - a.priceVolatility);
  
  return {
    totalGDP: world.economyStats.gdp,
    activeMarkets,
    bullishMarkets,
    bearishMarkets,
    opportunities: opportunities.slice(0, 5),
    threats: threats.slice(0, 5),
  };
}

/**
 * 监控竞争对手活动
 */
export function monitorCompetitorActivity(
  world: GameWorld,
  observerCompanyId: number
): Map<number, CompetitorAnalysis> {
  const analyses = new Map<number, CompetitorAnalysis>();
  
  for (let i = 0; i < world.companies.count; i++) {
    if (i !== observerCompanyId && world.companies.isAI[i]) {
      const analysis = analyzeCompetitor(world, i, observerCompanyId);
      analyses.set(i, analysis);
    }
  }
  
  return analyses;
}

/**
 * 识别市场趋势
 */
export function identifyMarketTrends(world: GameWorld): {
  risingCategories: string[];
  fallingCategories: string[];
  emergingOpportunities: string[];
} {
  const categoryTrends: Map<string, number> = new Map();
  
  for (const goods of ALL_GOODS) {
    const intel = collectMarketIntelligence(world, goods.id);
    const trend = intel.priceChange24h;
    
    const currentTrend = categoryTrends.get(goods.category) || 0;
    categoryTrends.set(goods.category, currentTrend + trend);
  }
  
  const risingCategories: string[] = [];
  const fallingCategories: string[] = [];
  
  for (const [category, trend] of categoryTrends) {
    if (trend > 0.1) risingCategories.push(category);
    else if (trend < -0.1) fallingCategories.push(category);
  }
  
  // 新兴机会
  const emergingOpportunities: string[] = [];
  if (world.economyStats.cyclePhase === 'expansion') {
    emergingOpportunities.push('高端消费品');
    emergingOpportunities.push('科技产品');
  } else if (world.economyStats.cyclePhase === 'contraction') {
    emergingOpportunities.push('必需消费品');
    emergingOpportunities.push('原材料储备');
  }
  
  return {
    risingCategories,
    fallingCategories,
    emergingOpportunities,
  };
}