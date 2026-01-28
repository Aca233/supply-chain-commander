/**
 * AI竞争情报系统
 * 
 * 分析竞争对手行为并制定对策
 * 
 * 设计目标：
 * 1. 监控竞争对手市场行为
 * 2. 分析竞争态势
 * 3. 预测竞争对手策略
 * 4. 制定反制措施
 */

import { GameWorld } from '@/core/world/GameWorld';
import { getActiveOrderIndices } from '@/core/market/OrderBook';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, MAX_COMPANIES } from '@/core/constants';
import { AIPersonality, AI_COMPANIES } from './AIPersonality';
import { getCompanyProfitMargin, getCompanyMarketShare } from './PrecisionCalculator';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';

// ==================== 类型定义 ====================

/**
 * 竞争对手档案
 */
export interface CompetitorProfile {
  companyId: number;
  companyName: string;
  
  // 规模指标
  estimatedCash: number;
  buildingCount: number;
  totalInventoryValue: number;
  
  // 市场地位
  marketShare: number;
  dominantGoods: number[];        // 主导的商品
  
  // 行为模式
  pricingTendency: 'aggressive' | 'moderate' | 'premium';
  expansionSpeed: 'fast' | 'moderate' | 'slow';
  tradingFrequency: 'high' | 'medium' | 'low';
  
  // 近期活动
  recentActions: CompetitorAction[];
  
  // 威胁等级
  threatLevel: 'high' | 'medium' | 'low';
  
  // 最后更新时间
  lastUpdated: number;
}

/**
 * 竞争对手行动
 */
export interface CompetitorAction {
  tick: number;
  type: 'price_cut' | 'price_raise' | 'expansion' | 'sell_off' | 'buy_up';
  goodsId?: number;
  magnitude: number;              // 行动幅度
  impact: number;                 // 对市场的影响
}

/**
 * 市场竞争分析
 */
export interface MarketCompetitionAnalysis {
  goodsId: number;
  
  // 参与者
  competitorCount: number;
  dominantPlayer: number | null;
  dominantShare: number;
  
  // 竞争强度
  competitionIntensity: number;   // 0-1
  priceWarActive: boolean;
  
  // HHI指数
  hhi: number;
  marketStructure: 'monopoly' | 'oligopoly' | 'competitive';
  
  // 进入壁垒
  entryBarrier: number;           // 0-1
  
  // 市场动态
  marketGrowth: number;           // 增长率
  priceVolatility: number;        // 价格波动
}

/**
 * 竞争响应策略
 */
export interface CompetitiveResponse {
  trigger: string;
  response: 'match_price' | 'undercut' | 'differentiate' | 'retreat' | 'attack' | 'ignore';
  targetCompetitor?: number;
  targetGoods?: number[];
  urgency: 'immediate' | 'short_term' | 'long_term';
  expectedOutcome: string;
  riskLevel: number;              // 0-1
}

/**
 * 竞争情报存储
 */
export interface CompetitiveIntelStore {
  companyId: number;
  
  // 竞争对手档案
  competitors: Map<number, CompetitorProfile>;
  
  // 市场分析缓存
  marketAnalysis: Map<number, MarketCompetitionAnalysis>;
  
  // 待执行响应
  pendingResponses: CompetitiveResponse[];
  
  // 监控配置
  monitorConfig: {
    trackTopCompetitors: number;  // 跟踪前N名竞争者
    alertThresholds: {
      priceChange: number;        // 价格变化触发阈值
      marketShareChange: number;  // 份额变化触发阈值
    };
  };
  
  // 上次分析时间
  lastAnalysisTick: number;
}

// ==================== 存储管理 ====================

const intelStores = new Map<number, CompetitiveIntelStore>();

/**
 * 获取情报存储
 */
export function getIntelStore(companyId: number): CompetitiveIntelStore | null {
  return intelStores.get(companyId) || null;
}

/**
 * 初始化情报存储
 */
export function initializeIntelStore(
  companyId: number,
  personality: AIPersonality
): CompetitiveIntelStore {
  const store: CompetitiveIntelStore = {
    companyId,
    competitors: new Map(),
    marketAnalysis: new Map(),
    pendingResponses: [],
    monitorConfig: {
      trackTopCompetitors: personality.competitiveSensitivity > 0.7 ? 10 : 5,
      alertThresholds: {
        priceChange: 0.1 - personality.competitiveSensitivity * 0.05,
        marketShareChange: 0.05 - personality.competitiveSensitivity * 0.02,
      },
    },
    lastAnalysisTick: 0,
  };
  
  intelStores.set(companyId, store);
  return store;
}

// ==================== 竞争对手分析 ====================

/**
 * 更新竞争对手档案
 */
export function updateCompetitorProfiles(
  world: GameWorld,
  companyId: number
): void {
  let store = intelStores.get(companyId);
  if (!store) {
    store = initializeIntelStore(companyId, {
      type: 'diversified',
      name: '',
      description: '',
      riskTolerance: 0.5,
      expansionBias: 0.5,
      pricingBias: 0,
      targetInventoryDays: 20,
      targetCashRatio: 0.3,
      marketAwareness: 0.5,
      competitiveSensitivity: 0.5,
      longTermFocus: 0.5,
      specializationDegree: 0.5,
      innovationInvestment: 0.05,
      decisionFrequency: 1,
      preferredCategories: [],
      avoidedCategories: [],
    });
  }
  
  // 收集所有竞争对手信息
  for (let otherId = 0; otherId < world.companies.count; otherId++) {
    if (otherId === companyId) continue;
    if (!world.companies.isAI[otherId] && otherId !== 0) continue; // 只跟踪玩家和AI
    
    const profile = analyzeCompetitor(world, companyId, otherId);
    
    // 检测行动变化
    const existingProfile = store.competitors.get(otherId);
    if (existingProfile) {
      const actions = detectCompetitorActions(world, existingProfile, profile);
      profile.recentActions = [
        ...actions,
        ...existingProfile.recentActions.slice(0, 20), // 保留最近20条
      ];
    }
    
    store.competitors.set(otherId, profile);
  }
  
  store.lastAnalysisTick = world.tick;
}

/**
 * 分析单个竞争对手
 */
function analyzeCompetitor(
  world: GameWorld,
  selfId: number,
  competitorId: number
): CompetitorProfile {
  const companyName = world.companies.names[competitorId] || `公司${competitorId}`;
  
  // 估算现金（对于AI可以直接读取，对于玩家需要估算）
  const estimatedCash = world.companies.cash[competitorId];
  
  // 统计建筑
  let buildingCount = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === competitorId) {
      buildingCount++;
    }
  }
  
  // 计算库存价值
  let totalInventoryValue = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    const qty = world.companies.inventories[competitorId * GOODS_COUNT + i];
    totalInventoryValue += qty * world.goods.prices[i];
  }
  
  // 市场份额
  const marketShare = getCompanyMarketShare(world, competitorId);
  
  // 找主导商品
  const dominantGoods = findDominantGoods(world, competitorId);
  
  // 分析行为模式
  const pricingTendency = analyzePricingTendency(world, competitorId);
  const expansionSpeed = analyzeExpansionSpeed(buildingCount);
  const tradingFrequency = analyzeTradingFrequency(world, competitorId);
  
  // 评估威胁等级
  const threatLevel = assessThreatLevel(world, selfId, competitorId, marketShare);
  
  return {
    companyId: competitorId,
    companyName,
    estimatedCash,
    buildingCount,
    totalInventoryValue,
    marketShare,
    dominantGoods,
    pricingTendency,
    expansionSpeed,
    tradingFrequency,
    recentActions: [],
    threatLevel,
    lastUpdated: world.tick,
  };
}

/**
 * 找出竞争对手主导的商品
 */
function findDominantGoods(world: GameWorld, companyId: number): number[] {
  const dominant: { goodsId: number; share: number }[] = [];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    // 计算该商品市场的总销量
    let totalSales = 0;
    for (let cId = 0; cId < world.companies.count; cId++) {
      totalSales += world.trades.cumulativeSalesQuantity[cId * GOODS_COUNT + goodsId];
    }
    
    if (totalSales > 0) {
      const companySales = world.trades.cumulativeSalesQuantity[companyId * GOODS_COUNT + goodsId];
      const share = companySales / totalSales;
      
      if (share > 0.2) { // 份额超过20%视为主导
        dominant.push({ goodsId, share });
      }
    }
  }
  
  dominant.sort((a, b) => b.share - a.share);
  return dominant.slice(0, 5).map(d => d.goodsId);
}

/**
 * 分析定价倾向
 */
function analyzePricingTendency(
  world: GameWorld,
  companyId: number
): 'aggressive' | 'moderate' | 'premium' {
  // 简化分析：检查活跃卖单的价格相对于市场价的位置
  let totalRatio = 0;
  let orderCount = 0;
  
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (world.orders.companyIds[i] !== companyId) continue;
    if (world.orders.types[i] !== 1) continue; // 只看卖单
    
    const goodsId = world.orders.goodsIds[i];
    const orderPrice = world.orders.prices[i];
    const marketPrice = world.goods.prices[goodsId];
    
    if (marketPrice > 0) {
      totalRatio += orderPrice / marketPrice;
      orderCount++;
    }
  }
  
  if (orderCount === 0) return 'moderate';
  
  const avgRatio = totalRatio / orderCount;
  
  if (avgRatio < 0.95) return 'aggressive';
  if (avgRatio > 1.1) return 'premium';
  return 'moderate';
}

/**
 * 分析扩张速度
 */
function analyzeExpansionSpeed(buildingCount: number): 'fast' | 'moderate' | 'slow' {
  // 简化：基于建筑数量判断
  if (buildingCount > 15) return 'fast';
  if (buildingCount > 8) return 'moderate';
  return 'slow';
}

/**
 * 分析交易频率
 */
function analyzeTradingFrequency(
  world: GameWorld,
  companyId: number
): 'high' | 'medium' | 'low' {
  // 统计活跃订单数
  let orderCount = 0;
  
  const activeIndices = getActiveOrderIndices();
  for (const i of activeIndices) {
    if (world.orders.companyIds[i] === companyId) {
      orderCount++;
    }
  }
  
  if (orderCount > 100) return 'high';
  if (orderCount > 30) return 'medium';
  return 'low';
}

/**
 * 评估威胁等级
 */
function assessThreatLevel(
  world: GameWorld,
  selfId: number,
  competitorId: number,
  competitorShare: number
): 'high' | 'medium' | 'low' {
  const selfShare = getCompanyMarketShare(world, selfId);
  
  // 竞争对手份额是自己的2倍以上 = 高威胁
  if (competitorShare > selfShare * 2 && competitorShare > 0.15) {
    return 'high';
  }
  
  // 竞争对手份额相近 = 中等威胁
  if (Math.abs(competitorShare - selfShare) < 0.1) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * 检测竞争对手行动
 */
function detectCompetitorActions(
  world: GameWorld,
  oldProfile: CompetitorProfile,
  newProfile: CompetitorProfile
): CompetitorAction[] {
  const actions: CompetitorAction[] = [];
  
  // 检测建筑扩张
  if (newProfile.buildingCount > oldProfile.buildingCount + 2) {
    actions.push({
      tick: world.tick,
      type: 'expansion',
      magnitude: newProfile.buildingCount - oldProfile.buildingCount,
      impact: 0.3,
    });
  }
  
  // 检测库存变化
  const inventoryChange = newProfile.totalInventoryValue - oldProfile.totalInventoryValue;
  if (inventoryChange > oldProfile.totalInventoryValue * 0.5) {
    actions.push({
      tick: world.tick,
      type: 'buy_up',
      magnitude: inventoryChange,
      impact: 0.2,
    });
  } else if (inventoryChange < -oldProfile.totalInventoryValue * 0.3) {
    actions.push({
      tick: world.tick,
      type: 'sell_off',
      magnitude: -inventoryChange,
      impact: 0.2,
    });
  }
  
  return actions;
}

// ==================== 市场竞争分析 ====================

/**
 * 分析市场竞争状况
 */
export function analyzeMarketCompetition(
  world: GameWorld,
  goodsId: number
): MarketCompetitionAnalysis {
  const shares: { companyId: number; share: number }[] = [];
  let totalSales = 0;
  
  // 收集各公司销量
  for (let companyId = 0; companyId < world.companies.count; companyId++) {
    const sales = world.trades.cumulativeSalesQuantity[companyId * GOODS_COUNT + goodsId];
    if (sales > 0) {
      shares.push({ companyId, share: sales });
      totalSales += sales;
    }
  }
  
  // 计算份额
  if (totalSales > 0) {
    shares.forEach(s => s.share = s.share / totalSales);
  }
  
  shares.sort((a, b) => b.share - a.share);
  
  // HHI指数
  const hhi = shares.reduce((sum, s) => sum + Math.pow(s.share * 100, 2), 0);
  
  // 市场结构
  let marketStructure: 'monopoly' | 'oligopoly' | 'competitive';
  if (hhi > 2500 || (shares[0]?.share || 0) > 0.6) {
    marketStructure = 'monopoly';
  } else if (hhi > 1500) {
    marketStructure = 'oligopoly';
  } else {
    marketStructure = 'competitive';
  }
  
  // 竞争强度
  const competitorCount = shares.length;
  const competitionIntensity = Math.min(1, competitorCount / 10);
  
  // 检测价格战
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const priceWarActive = goods 
    ? world.goods.prices[goodsId] < goods.basePrice * 0.7 
    : false;
  
  // 进入壁垒
  const entryBarrier = calculateEntryBarrier(goodsId);
  
  // 市场增长和波动（简化）
  const marketGrowth = 0.02;
  const priceVolatility = 0.1;
  
  return {
    goodsId,
    competitorCount,
    dominantPlayer: shares[0]?.companyId ?? null,
    dominantShare: shares[0]?.share ?? 0,
    competitionIntensity,
    priceWarActive,
    hhi,
    marketStructure,
    entryBarrier,
    marketGrowth,
    priceVolatility,
  };
}

/**
 * 计算进入壁垒
 */
function calculateEntryBarrier(goodsId: number): number {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (!goods) return 0.5;
  
  // 高层级商品壁垒更高
  return goods.tier * 0.25;
}

// ==================== 竞争响应 ====================

/**
 * 生成竞争响应策略
 */
export function generateCompetitiveResponses(
  world: GameWorld,
  companyId: number,
  personality: AIPersonality
): CompetitiveResponse[] {
  const store = intelStores.get(companyId);
  if (!store) return [];
  
  const responses: CompetitiveResponse[] = [];
  
  // 分析高威胁竞争对手
  for (const [competitorId, profile] of store.competitors) {
    if (profile.threatLevel === 'high') {
      // 检查重叠市场
      const selfDominant = findDominantGoods(world, companyId);
      const overlap = profile.dominantGoods.filter(g => selfDominant.includes(g));
      
      if (overlap.length > 0) {
        // 根据人格决定响应
        if (personality.competitiveSensitivity > 0.7) {
          // 高竞争敏感 - 积极反击
          if (personality.pricingBias < 0) {
            responses.push({
              trigger: `${profile.companyName}在${overlap.length}个市场威胁`,
              response: 'undercut',
              targetCompetitor: competitorId,
              targetGoods: overlap,
              urgency: 'immediate',
              expectedOutcome: '通过价格战夺回市场份额',
              riskLevel: 0.7,
            });
          } else {
            responses.push({
              trigger: `${profile.companyName}在${overlap.length}个市场威胁`,
              response: 'differentiate',
              targetCompetitor: competitorId,
              targetGoods: overlap,
              urgency: 'short_term',
              expectedOutcome: '通过差异化避免正面竞争',
              riskLevel: 0.4,
            });
          }
        } else {
          // 低竞争敏感 - 保守应对
          responses.push({
            trigger: `${profile.companyName}在${overlap.length}个市场威胁`,
            response: 'match_price',
            targetCompetitor: competitorId,
            targetGoods: overlap,
            urgency: 'short_term',
            expectedOutcome: '维持市场地位',
            riskLevel: 0.3,
          });
        }
      }
    }
    
    // 检测价格战
    for (const action of profile.recentActions) {
      if (action.type === 'price_cut' && action.goodsId !== undefined) {
        const shouldRespond = personality.competitiveSensitivity > 0.5;
        
        if (shouldRespond) {
          responses.push({
            trigger: `${profile.companyName}发起价格战`,
            response: personality.pricingBias < 0 ? 'undercut' : 'ignore',
            targetCompetitor: competitorId,
            targetGoods: [action.goodsId],
            urgency: 'immediate',
            expectedOutcome: personality.pricingBias < 0 
              ? '跟进价格战' 
              : '维持定价策略',
            riskLevel: personality.pricingBias < 0 ? 0.6 : 0.2,
          });
        }
      }
    }
  }
  
  // 发现市场机会
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const analysis = analyzeMarketCompetition(world, goodsId);
    
    // 弱势市场攻击机会
    if (analysis.dominantShare < 0.3 && analysis.marketStructure === 'competitive') {
      if (personality.expansionBias > 0.6) {
        responses.push({
          trigger: `${ALL_GOODS.find(g => g.id === goodsId)?.name}市场竞争分散`,
          response: 'attack',
          targetGoods: [goodsId],
          urgency: 'short_term',
          expectedOutcome: '抢占市场份额',
          riskLevel: 0.5,
        });
      }
    }
    
    // 垄断市场回避
    if (analysis.marketStructure === 'monopoly' && analysis.dominantPlayer !== companyId) {
      if (personality.riskTolerance < 0.5) {
        responses.push({
          trigger: `${ALL_GOODS.find(g => g.id === goodsId)?.name}市场被垄断`,
          response: 'retreat',
          targetGoods: [goodsId],
          urgency: 'long_term',
          expectedOutcome: '退出高壁垒市场',
          riskLevel: 0.2,
        });
      }
    }
  }
  
  // 按紧急程度排序
  responses.sort((a, b) => {
    const urgencyOrder = { immediate: 0, short_term: 1, long_term: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
  
  return responses;
}

/**
 * 执行竞争响应
 */
export function executeCompetitiveResponse(
  world: GameWorld,
  companyId: number,
  response: CompetitiveResponse
): boolean {
  // 这里只生成推荐，实际执行由AIDecisionEngine处理
  const store = intelStores.get(companyId);
  if (!store) return false;
  
  // 添加到待执行队列
  store.pendingResponses.push(response);
  
  // 限制队列长度
  if (store.pendingResponses.length > 10) {
    store.pendingResponses = store.pendingResponses.slice(-10);
  }
  
  return true;
}

// ==================== 辅助查询 ====================

/**
 * 获取主要竞争对手
 */
export function getTopCompetitors(
  companyId: number,
  limit: number = 5
): CompetitorProfile[] {
  const store = intelStores.get(companyId);
  if (!store) return [];
  
  return Array.from(store.competitors.values())
    .sort((a, b) => b.marketShare - a.marketShare)
    .slice(0, limit);
}

/**
 * 获取特定商品的竞争分析
 */
export function getGoodsCompetitionAnalysis(
  world: GameWorld,
  companyId: number,
  goodsId: number
): MarketCompetitionAnalysis | null {
  let store = intelStores.get(companyId);
  
  // 检查缓存
  const cached = store?.marketAnalysis.get(goodsId);
  if (cached && store && world.tick - store.lastAnalysisTick < 24) {
    return cached;
  }
  
  // 重新分析
  const analysis = analyzeMarketCompetition(world, goodsId);
  
  if (store) {
    store.marketAnalysis.set(goodsId, analysis);
  }
  
  return analysis;
}

/**
 * 获取待执行的竞争响应
 */
export function getPendingResponses(companyId: number): CompetitiveResponse[] {
  const store = intelStores.get(companyId);
  return store?.pendingResponses || [];
}

/**
 * 清除已执行的响应
 */
export function clearExecutedResponse(companyId: number, index: number): void {
  const store = intelStores.get(companyId);
  if (store) {
    store.pendingResponses.splice(index, 1);
  }
}

/**
 * 获取竞争态势摘要
 */
export function getCompetitiveSummary(
  world: GameWorld,
  companyId: number
): {
  threatCount: { high: number; medium: number; low: number };
  topThreat: CompetitorProfile | null;
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  recommendedFocus: 'defend' | 'attack' | 'expand' | 'consolidate';
} {
  const store = intelStores.get(companyId);
  if (!store) {
    return {
      threatCount: { high: 0, medium: 0, low: 0 },
      topThreat: null,
      marketPosition: 'niche',
      recommendedFocus: 'expand',
    };
  }
  
  // 统计威胁
  const threatCount = { high: 0, medium: 0, low: 0 };
  let topThreat: CompetitorProfile | null = null;
  
  for (const profile of store.competitors.values()) {
    threatCount[profile.threatLevel]++;
    if (profile.threatLevel === 'high' && (!topThreat || profile.marketShare > topThreat.marketShare)) {
      topThreat = profile;
    }
  }
  
  // 判断市场地位
  const selfShare = getCompanyMarketShare(world, companyId);
  let marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  
  if (selfShare > 0.25) {
    marketPosition = 'leader';
  } else if (selfShare > 0.15) {
    marketPosition = 'challenger';
  } else if (selfShare > 0.05) {
    marketPosition = 'follower';
  } else {
    marketPosition = 'niche';
  }
  
  // 推荐策略
  let recommendedFocus: 'defend' | 'attack' | 'expand' | 'consolidate';
  
  if (threatCount.high > 2) {
    recommendedFocus = 'defend';
  } else if (marketPosition === 'leader') {
    recommendedFocus = 'defend';
  } else if (marketPosition === 'challenger') {
    recommendedFocus = 'attack';
  } else if (marketPosition === 'niche') {
    recommendedFocus = 'expand';
  } else {
    recommendedFocus = 'consolidate';
  }
  
  return {
    threatCount,
    topThreat,
    marketPosition,
    recommendedFocus,
  };
}