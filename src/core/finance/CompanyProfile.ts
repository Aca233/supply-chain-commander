/**
 * 统一公司数据模型
 * 整合基础信息 + 股票信息 + 竞争分析 + 持股关系
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT } from '@/core/constants';
import { PersonalityType, AI_COMPANIES, AI_PERSONALITIES } from '@/core/ai/AIPersonality';
import { getStock, getHoldings, Holding, Stock, StockMarketState, getMarketState } from './StockMarket';

/**
 * 股票信息视图
 */
export interface StockView {
  ticker: string;
  currentPrice: number;
  previousClose: number;
  priceChange: number;
  priceChangePercent: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  marketCap: number;
  volume: number;           // 日成交量
  totalVolume: number;      // 累计成交量
  turnoverRate: number;
  pe: number;           // 市盈率
  pb: number;           // 市净率
  eps: number;          // 每股收益
  dividendYield: number;
  isListed: boolean;
  isTradable: boolean;
  totalShares: number;
  outstandingShares: number;
}

/**
 * 股东信息
 */
export interface ShareholderInfo {
  holderId: number;
  holderName: string;
  shares: number;
  percentage: number;
  isPlayer: boolean;
}

/**
 * 玩家持股详情
 */
export interface PlayerHoldingInfo {
  shares: number;
  percentage: number;
  avgCost: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

/**
 * 股权结构
 */
export interface OwnershipInfo {
  majorShareholders: ShareholderInfo[];
  playerHolding: PlayerHoldingInfo | null;
  controllingShareholderId: number | null;
  controllingShareholderName: string | null;
  controllingPercentage: number;
}

/**
 * 竞争分析
 */
export interface CompetitionInfo {
  trend: 'up' | 'down' | 'stable';
  specialization: string;
  threatLevel: 'low' | 'medium' | 'high';
  relationType: 'competitor' | 'supplier' | 'customer' | 'neutral';
  mainProducts: number[];
}

/**
 * 控制权状态
 */
export interface ControlStatus {
  isPlayerControlled: boolean;      // 玩家是否控股 (>50%)
  isPlayerMajorShareholder: boolean; // 玩家是否大股东 (>10%)
  playerControlLevel: ControlLevel;
  controllingShareholderId: number | null;
  canAcquire: boolean;
}

/**
 * 控制权等级
 */
export enum ControlLevel {
  None = 0,           // 无持股
  Retail = 1,         // 散户 (0-5%)
  Significant = 2,    // 重要股东 (5-10%)
  Major = 3,          // 大股东 (10-20%)
  Strategic = 4,      // 战略投资者 (20-33%)
  Relative = 5,       // 相对控股 (33-50%)
  Absolute = 6,       // 绝对控股 (50%+)
}

/**
 * 统一公司视图
 */
export interface CompanyProfile {
  // 基础信息
  id: number;
  name: string;
  personality: PersonalityType;
  personalityName: string;
  
  // 财务数据
  cash: number;
  totalAssets: number;
  inventoryValue: number;
  buildingValue: number;
  buildingCount: number;
  marketShare: number;
  
  // 股票信息
  stock: StockView | null;
  
  // 持股关系
  ownership: OwnershipInfo;
  
  // 竞争关系
  competition: CompetitionInfo;
  
  // 控制权状态
  controlStatus: ControlStatus;
  
  // 辅助信息
  isAI: boolean;
  isPlayer: boolean;
}

// 人格类型名称映射
const personalityLabels: Record<PersonalityType, string> = {
  aggressive: '激进型',
  conservative: '保守型',
  opportunist: '机会型',
  specialist: '专精型',
  diversified: '多元型',
  innovator: '创新型',
  cost_leader: '成本领先',
  premium: '高端型',
};

// 人格类型列表（用于动态分配）
const personalityTypes: PersonalityType[] = [
  'aggressive', 'conservative', 'innovator', 'opportunist',
  'specialist', 'diversified', 'cost_leader', 'premium',
];

/**
 * 获取公司的人格类型
 */
export function getCompanyPersonality(companyId: number): PersonalityType {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  if (config) return config.personality;
  return personalityTypes[(companyId - 1) % personalityTypes.length];
}

/**
 * 计算控制权等级
 */
export function calculateControlLevel(percentage: number): ControlLevel {
  if (percentage >= 50) return ControlLevel.Absolute;
  if (percentage >= 33) return ControlLevel.Relative;
  if (percentage >= 20) return ControlLevel.Strategic;
  if (percentage >= 10) return ControlLevel.Major;
  if (percentage >= 5) return ControlLevel.Significant;
  if (percentage > 0) return ControlLevel.Retail;
  return ControlLevel.None;
}

/**
 * 获取商品名称
 */
function getGoodsName(world: GameWorld, goodsId: number): string {
  if (goodsId >= 0 && goodsId < world.goods.count) {
    return world.goods.names[goodsId];
  }
  return `商品${goodsId}`;
}

/**
 * 获取公司主营业务描述
 */
function getCompanySpecialization(world: GameWorld, companyId: number): string {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  if (config && config.focusGoods.length > 0) {
    return config.focusGoods.slice(0, 2).map(g => getGoodsName(world, g)).join('、');
  }
  
  const personality = getCompanyPersonality(companyId);
  switch (personality) {
    case 'aggressive': return '工业品、建材';
    case 'conservative': return '原材料、能源';
    case 'innovator': return '电子产品、芯片';
    case 'opportunist': return '多元化经营';
    case 'specialist': return '零部件、机械';
    case 'diversified': return '多元化经营';
    case 'cost_leader': return '食品、日用品';
    case 'premium': return '奢侈品、高端产品';
    default: return '多元化经营';
  }
}

/**
 * 获取公司主营商品ID列表
 */
function getMainProducts(companyId: number): number[] {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  if (config) return config.focusGoods;
  return [];
}

/**
 * 转换Stock为StockView
 */
function stockToView(stock: Stock): StockView {
  const priceChange = stock.currentPrice - stock.previousClose;
  const priceChangePercent = stock.previousClose > 0
    ? (priceChange / stock.previousClose) * 100
    : 0;
    
  return {
    ticker: stock.ticker,
    currentPrice: stock.currentPrice,
    previousClose: stock.previousClose,
    priceChange,
    priceChangePercent,
    openPrice: stock.openPrice,
    highPrice: stock.highPrice,
    lowPrice: stock.lowPrice,
    marketCap: stock.marketCap,
    volume: stock.volume,
    totalVolume: stock.totalVolume,
    turnoverRate: stock.turnoverRate,
    pe: stock.priceToEarnings,
    pb: stock.priceToBook,
    eps: stock.earningsPerShare,
    dividendYield: stock.dividendYield,
    isListed: stock.isListed,
    isTradable: stock.isTradable,
    totalShares: stock.totalShares,
    outstandingShares: stock.outstandingShares,
  };
}

/**
 * 获取公司股东列表
 */
export function getShareholderList(world: GameWorld, companyId: number): ShareholderInfo[] {
  const marketState = getMarketState();
  const stock = getStock(companyId);
  if (!stock) return [];
  
  const shareholders: ShareholderInfo[] = [];
  const totalShares = stock.totalShares;
  
  // 遍历所有持股记录
  for (const [key, holding] of marketState.holdings) {
    if (holding.stockCompanyId === companyId && holding.shares > 0) {
      const holderId = holding.ownerCompanyId;
      const holderName = holderId === 0 
        ? '玩家公司' 
        : (world.companies.names[holderId] || `公司#${holderId}`);
      
      shareholders.push({
        holderId,
        holderName,
        shares: holding.shares,
        percentage: (holding.shares / totalShares) * 100,
        isPlayer: holderId === 0,
      });
    }
  }
  
  // 按持股比例排序
  shareholders.sort((a, b) => b.percentage - a.percentage);
  
  return shareholders;
}

/**
 * 获取玩家对某公司的持股详情
 */
export function getPlayerHoldingDetails(companyId: number): PlayerHoldingInfo | null {
  const holdings = getHoldings(0);
  const holding = holdings.find(h => h.stockCompanyId === companyId);
  
  if (!holding || holding.shares <= 0) return null;
  
  const stock = getStock(companyId);
  if (!stock) return null;
  
  const marketValue = holding.shares * stock.currentPrice;
  const costBasis = holding.shares * holding.avgCost;
  const unrealizedGain = marketValue - costBasis;
  const unrealizedGainPercent = costBasis > 0 
    ? (unrealizedGain / costBasis) * 100 
    : 0;
  
  return {
    shares: holding.shares,
    percentage: (holding.shares / stock.totalShares) * 100,
    avgCost: holding.avgCost,
    marketValue,
    unrealizedGain,
    unrealizedGainPercent,
  };
}

/**
 * 获取公司股权结构
 */
function getOwnershipInfo(world: GameWorld, companyId: number): OwnershipInfo {
  const shareholders = getShareholderList(world, companyId);
  const playerHolding = getPlayerHoldingDetails(companyId);
  
  // 找到控股股东
  let controllingShareholderId: number | null = null;
  let controllingShareholderName: string | null = null;
  let controllingPercentage = 0;
  
  if (shareholders.length > 0) {
    const largest = shareholders[0];
    if (largest.percentage >= 20) {
      controllingShareholderId = largest.holderId;
      controllingShareholderName = largest.holderName;
      controllingPercentage = largest.percentage;
    }
  }
  
  return {
    majorShareholders: shareholders.slice(0, 10), // 只返回前10大股东
    playerHolding,
    controllingShareholderId,
    controllingShareholderName,
    controllingPercentage,
  };
}

/**
 * 计算公司威胁等级
 */
function calculateThreatLevel(
  world: GameWorld,
  companyId: number,
  marketShare: number
): 'low' | 'medium' | 'high' {
  const personality = getCompanyPersonality(companyId);
  const personalityData = AI_PERSONALITIES[personality];
  
  // 防止 personalityData 未定义
  if (!personalityData) {
    // 仅基于市场份额判断
    if (marketShare > 15) return 'high';
    if (marketShare > 8) return 'medium';
    return 'low';
  }
  
  // 基于市场份额和扩张倾向计算威胁
  if (marketShare > 15 && personalityData.expansionBias > 0.6) {
    return 'high';
  } else if (marketShare > 8 || personalityData.competitiveSensitivity > 0.7) {
    return 'medium';
  }
  return 'low';
}

/**
 * 判断公司发展趋势
 */
function calculateTrend(world: GameWorld, companyId: number): 'up' | 'down' | 'stable' {
  const config = AI_COMPANIES.find(c => c.id === companyId);
  const initialCash = config?.initialCash || 500000;
  const currentCash = world.companies.cash[companyId];
  
  if (currentCash > initialCash * 1.1) return 'up';
  if (currentCash < initialCash * 0.9) return 'down';
  return 'stable';
}

/**
 * 获取竞争分析信息
 */
function getCompetitionInfo(world: GameWorld, companyId: number, marketShare: number): CompetitionInfo {
  return {
    trend: calculateTrend(world, companyId),
    specialization: getCompanySpecialization(world, companyId),
    threatLevel: calculateThreatLevel(world, companyId, marketShare),
    relationType: 'competitor', // 简化处理，后续可以基于供应链分析
    mainProducts: getMainProducts(companyId),
  };
}

/**
 * 获取控制权状态
 */
function getControlStatus(ownership: OwnershipInfo, companyId: number): ControlStatus {
  const playerPercentage = ownership.playerHolding?.percentage || 0;
  const controlLevel = calculateControlLevel(playerPercentage);
  
  return {
    isPlayerControlled: playerPercentage >= 50,
    isPlayerMajorShareholder: playerPercentage >= 10,
    playerControlLevel: controlLevel,
    controllingShareholderId: ownership.controllingShareholderId,
    canAcquire: companyId !== 0, // 不能收购玩家自己
  };
}

/**
 * 计算市场总现金（用于市场份额计算）
 */
function calculateTotalCash(world: GameWorld): number {
  let total = 0;
  for (let i = 0; i < world.companies.count; i++) {
    total += world.companies.cash[i] || 0;
  }
  return total;
}

/**
 * 获取单个公司的完整资料
 */
export function getCompanyProfile(world: GameWorld, companyId: number): CompanyProfile | null {
  if (companyId >= world.companies.count) return null;
  
  const isPlayer = companyId === 0;
  const isAI = !isPlayer && world.companies.isAI[companyId];
  
  const name = world.companies.names[companyId] || `公司#${companyId}`;
  const personality = isPlayer ? 'diversified' : getCompanyPersonality(companyId);
  
  // 财务数据
  const cash = world.companies.cash[companyId];
  
  let inventoryValue = 0;
  for (let i = 0; i < GOODS_COUNT; i++) {
    inventoryValue += world.companies.inventories[companyId * GOODS_COUNT + i] * world.goods.prices[i];
  }
  
  let buildingValue = 0;
  let buildingCount = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      buildingValue += 500000;
      buildingCount++;
    }
  }
  
  const totalAssets = cash + inventoryValue + buildingValue;
  
  // 市场份额
  const totalCash = calculateTotalCash(world);
  const marketShare = totalCash > 0 ? (cash / totalCash) * 100 : 0;
  
  // 股票信息
  const stockData = getStock(companyId);
  const stock = stockData ? stockToView(stockData) : null;
  
  // 股权结构
  const ownership = getOwnershipInfo(world, companyId);
  
  // 竞争分析
  const competition = getCompetitionInfo(world, companyId, marketShare);
  
  // 控制权状态
  const controlStatus = getControlStatus(ownership, companyId);
  
  return {
    id: companyId,
    name,
    personality,
    personalityName: personalityLabels[personality],
    cash,
    totalAssets,
    inventoryValue,
    buildingValue,
    buildingCount,
    marketShare,
    stock,
    ownership,
    competition,
    controlStatus,
    isAI,
    isPlayer,
  };
}

/**
 * 获取所有公司资料
 */
export function getAllCompanyProfiles(world: GameWorld): CompanyProfile[] {
  const profiles: CompanyProfile[] = [];
  
  for (let i = 0; i < world.companies.count; i++) {
    const profile = getCompanyProfile(world, i);
    if (profile) {
      profiles.push(profile);
    }
  }
  
  return profiles;
}

/**
 * 获取所有AI公司资料（排除玩家）
 */
export function getAICompanyProfiles(world: GameWorld): CompanyProfile[] {
  return getAllCompanyProfiles(world).filter(p => p.isAI);
}

/**
 * 获取玩家持股的公司
 */
export function getPlayerHoldingProfiles(world: GameWorld): CompanyProfile[] {
  return getAllCompanyProfiles(world).filter(p => 
    p.ownership.playerHolding && p.ownership.playerHolding.shares > 0
  );
}

/**
 * 获取玩家控股的公司
 */
export function getPlayerControlledProfiles(world: GameWorld): CompanyProfile[] {
  return getAllCompanyProfiles(world).filter(p => p.controlStatus.isPlayerControlled);
}

/**
 * 按涨幅排序获取公司
 */
export function getGainersProfiles(world: GameWorld, limit: number = 10): CompanyProfile[] {
  return getAllCompanyProfiles(world)
    .filter(p => p.stock && p.stock.isListed)
    .sort((a, b) => (b.stock?.priceChangePercent || 0) - (a.stock?.priceChangePercent || 0))
    .slice(0, limit);
}

/**
 * 按跌幅排序获取公司
 */
export function getLosersProfiles(world: GameWorld, limit: number = 10): CompanyProfile[] {
  return getAllCompanyProfiles(world)
    .filter(p => p.stock && p.stock.isListed)
    .sort((a, b) => (a.stock?.priceChangePercent || 0) - (b.stock?.priceChangePercent || 0))
    .slice(0, limit);
}

/**
 * 计算玩家投资组合价值
 */
export function calculatePlayerPortfolio(world: GameWorld): {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  gainPercent: number;
  holdingCount: number;
} {
  let totalValue = 0;
  let totalCost = 0;
  let holdingCount = 0;
  
  const holdings = getHoldings(0);
  for (const holding of holdings) {
    const stock = getStock(holding.stockCompanyId);
    if (stock && holding.shares > 0) {
      totalValue += holding.shares * stock.currentPrice;
      totalCost += holding.shares * holding.avgCost;
      holdingCount++;
    }
  }
  
  const totalGain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  
  return {
    totalValue,
    totalCost,
    totalGain,
    gainPercent,
    holdingCount,
  };
}

/**
 * 计算市场统计
 */
export function calculateMarketStats(world: GameWorld): {
  rising: number;
  falling: number;
  unchanged: number;
  totalVolume: number;
  totalMarketCap: number;
} {
  const marketState = getMarketState();
  let rising = 0, falling = 0, unchanged = 0, totalVolume = 0;
  
  for (const [_, stock] of marketState.stocks) {
    const change = stock.currentPrice - stock.previousClose;
    if (Math.abs(change) < 0.01) {
      unchanged++;
    } else if (change > 0) {
      rising++;
    } else {
      falling++;
    }
    totalVolume += stock.volume;
  }
  
  return {
    rising,
    falling,
    unchanged,
    totalVolume,
    totalMarketCap: marketState.totalMarketCap,
  };
}