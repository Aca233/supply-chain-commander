/**
 * 股权控制系统
 * 管理持股比例与控制权的映射关系
 */

import { GameWorld } from '@/core/world/GameWorld';
import { getStock, getHoldings, Holding, getMarketState } from './StockMarket';
import { ControlLevel, getShareholderList, getPlayerHoldingDetails } from './CompanyProfile';
import { GOODS_COUNT } from '@/core/constants';

/**
 * 控制权权利类型
 */
export type ControlRight = 
  | 'view_financials'      // 查看财务报表
  | 'board_seat'           // 董事会席位
  | 'veto_major'           // 重大决策否决权
  | 'influence_strategy'   // 影响经营策略
  | 'full_control'         // 完全控制权
  | 'dividend_priority'    // 分红优先权
  | 'asset_transfer';      // 资产转移权

/**
 * 控制权权利配置
 */
export const CONTROL_RIGHTS: Record<ControlLevel, ControlRight[]> = {
  [ControlLevel.None]: [],
  [ControlLevel.Retail]: [],
  [ControlLevel.Significant]: ['view_financials'],
  [ControlLevel.Major]: ['view_financials', 'board_seat'],
  [ControlLevel.Strategic]: ['view_financials', 'board_seat', 'veto_major'],
  [ControlLevel.Relative]: ['view_financials', 'board_seat', 'veto_major', 'influence_strategy', 'dividend_priority'],
  [ControlLevel.Absolute]: ['view_financials', 'board_seat', 'veto_major', 'influence_strategy', 'full_control', 'dividend_priority', 'asset_transfer'],
};

/**
 * 控制权等级描述
 */
export const CONTROL_LEVEL_NAMES: Record<ControlLevel, string> = {
  [ControlLevel.None]: '无持股',
  [ControlLevel.Retail]: '散户',
  [ControlLevel.Significant]: '重要股东',
  [ControlLevel.Major]: '大股东',
  [ControlLevel.Strategic]: '战略投资者',
  [ControlLevel.Relative]: '相对控股',
  [ControlLevel.Absolute]: '绝对控股',
};

/**
 * 控制权等级颜色
 */
export const CONTROL_LEVEL_COLORS: Record<ControlLevel, string> = {
  [ControlLevel.None]: 'text-slate-400',
  [ControlLevel.Retail]: 'text-slate-300',
  [ControlLevel.Significant]: 'text-blue-400',
  [ControlLevel.Major]: 'text-green-400',
  [ControlLevel.Strategic]: 'text-yellow-400',
  [ControlLevel.Relative]: 'text-orange-400',
  [ControlLevel.Absolute]: 'text-purple-400',
};

/**
 * 控股策略类型
 */
export type ControlStrategy = 'aggressive' | 'conservative' | 'balanced';

/**
 * 控股公司策略配置
 */
export interface ControlledCompanyStrategy {
  companyId: number;
  strategy: ControlStrategy;
  dividendRatio: number;       // 分红比例 (0-1)
  reinvestmentRatio: number;   // 再投资比例
  lastDividendTick: number;
  totalDividendPaid: number;
}

/**
 * 控制权变更事件
 */
export interface ControlChangeEvent {
  companyId: number;
  companyName: string;
  previousControllerId: number | null;
  newControllerId: number | null;
  previousControlLevel: ControlLevel;
  newControlLevel: ControlLevel;
  tick: number;
  reason: string;
}

// 控股公司策略存储
const controlledStrategies: Map<number, ControlledCompanyStrategy> = new Map();

// 控制权变更事件队列
const controlChangeEvents: ControlChangeEvent[] = [];

/**
 * 检查是否有特定权利
 */
export function hasControlRight(
  holderId: number,
  companyId: number,
  right: ControlRight
): boolean {
  const holding = getPlayerHoldingDetails(companyId);
  if (holderId !== 0 || !holding) return false;
  
  const stock = getStock(companyId);
  if (!stock) return false;
  
  const percentage = holding.percentage;
  const controlLevel = calculateControlLevelFromPercentage(percentage);
  
  return CONTROL_RIGHTS[controlLevel].includes(right);
}

/**
 * 从百分比计算控制权等级
 */
function calculateControlLevelFromPercentage(percentage: number): ControlLevel {
  if (percentage >= 50) return ControlLevel.Absolute;
  if (percentage >= 33) return ControlLevel.Relative;
  if (percentage >= 20) return ControlLevel.Strategic;
  if (percentage >= 10) return ControlLevel.Major;
  if (percentage >= 5) return ControlLevel.Significant;
  if (percentage > 0) return ControlLevel.Retail;
  return ControlLevel.None;
}

/**
 * 获取玩家对公司的控制权等级
 */
export function getPlayerControlLevel(companyId: number): ControlLevel {
  const holding = getPlayerHoldingDetails(companyId);
  if (!holding) return ControlLevel.None;
  return calculateControlLevelFromPercentage(holding.percentage);
}

/**
 * 获取玩家控股的公司ID列表
 */
export function getPlayerControlledCompanyIds(): number[] {
  const controlledIds: number[] = [];
  const marketState = getMarketState();
  
  for (const [_, stock] of marketState.stocks) {
    const holding = getPlayerHoldingDetails(stock.companyId);
    if (holding && holding.percentage >= 50) {
      controlledIds.push(stock.companyId);
    }
  }
  
  return controlledIds;
}

/**
 * 检查控制权变更
 */
export function checkControlChange(
  world: GameWorld,
  companyId: number
): ControlChangeEvent | null {
  const shareholders = getShareholderList(world, companyId);
  if (shareholders.length === 0) return null;
  
  const stock = getStock(companyId);
  if (!stock) return null;
  
  // 找到当前最大股东
  const largestShareholder = shareholders[0];
  const newControllerId = largestShareholder.percentage >= 20 
    ? largestShareholder.holderId 
    : null;
  const newControlLevel = calculateControlLevelFromPercentage(largestShareholder.percentage);
  
  // 获取历史控制者（简化处理）
  const previousControllerId = null;
  const previousControlLevel = ControlLevel.None;
  
  // 判断是否有变更
  if (newControllerId !== previousControllerId || newControlLevel !== previousControlLevel) {
    const event: ControlChangeEvent = {
      companyId,
      companyName: stock.name,
      previousControllerId,
      newControllerId,
      previousControlLevel,
      newControlLevel,
      tick: world.tick,
      reason: newControlLevel === ControlLevel.Absolute 
        ? '获得绝对控股权' 
        : newControlLevel >= ControlLevel.Major 
          ? '成为大股东' 
          : '持股变更',
    };
    
    controlChangeEvents.push(event);
    return event;
  }
  
  return null;
}

/**
 * 获取并清除待处理的控制权变更事件
 */
export function getAndClearControlChangeEvents(): ControlChangeEvent[] {
  const events = [...controlChangeEvents];
  controlChangeEvents.length = 0;
  return events;
}

/**
 * 设置控股公司策略
 */
export function setControlledCompanyStrategy(
  world: GameWorld,
  companyId: number,
  strategy: ControlStrategy
): boolean {
  // 检查是否有控制权
  if (!hasControlRight(0, companyId, 'influence_strategy')) {
    return false;
  }
  
  let config = controlledStrategies.get(companyId);
  if (!config) {
    config = {
      companyId,
      strategy: 'balanced',
      dividendRatio: 0.3,
      reinvestmentRatio: 0.7,
      lastDividendTick: 0,
      totalDividendPaid: 0,
    };
    controlledStrategies.set(companyId, config);
  }
  
  config.strategy = strategy;
  
  // 根据策略调整比例
  switch (strategy) {
    case 'aggressive':
      config.dividendRatio = 0.1;
      config.reinvestmentRatio = 0.9;
      break;
    case 'conservative':
      config.dividendRatio = 0.5;
      config.reinvestmentRatio = 0.5;
      break;
    case 'balanced':
    default:
      config.dividendRatio = 0.3;
      config.reinvestmentRatio = 0.7;
      break;
  }
  
  return true;
}

/**
 * 获取控股公司策略
 */
export function getControlledCompanyStrategy(companyId: number): ControlledCompanyStrategy | null {
  return controlledStrategies.get(companyId) || null;
}

/**
 * 申请分红
 */
export function requestDividend(
  world: GameWorld,
  companyId: number,
  amount: number
): { success: boolean; playerReceived?: number; reason?: string } {
  // 检查是否有分红权
  if (!hasControlRight(0, companyId, 'dividend_priority')) {
    return { success: false, reason: '没有分红权利' };
  }
  
  // 检查目标公司现金
  const companyCash = world.companies.cash[companyId];
  if (companyCash < amount) {
    return { success: false, reason: '目标公司现金不足' };
  }
  
  // 获取玩家持股比例
  const holding = getPlayerHoldingDetails(companyId);
  if (!holding) {
    return { success: false, reason: '未持有该公司股票' };
  }
  
  // 计算玩家应获得的分红
  const playerShare = amount * (holding.percentage / 100);
  
  // 执行分红
  world.companies.cash[companyId] -= amount;
  world.companies.cash[0] += playerShare;
  
  // 更新策略记录
  let config = controlledStrategies.get(companyId);
  if (config) {
    config.lastDividendTick = world.tick;
    config.totalDividendPaid += amount;
  }
  
  return { success: true, playerReceived: playerShare };
}

/**
 * 发起资产转移
 */
export function initiateAssetTransfer(
  world: GameWorld,
  fromCompanyId: number,
  toCompanyId: number,
  assetType: 'building' | 'inventory',
  assetIds: number[]
): { success: boolean; reason?: string } {
  // 检查是否有资产转移权
  if (!hasControlRight(0, fromCompanyId, 'asset_transfer')) {
    return { success: false, reason: '没有资产转移权利' };
  }
  
  // 目标公司必须是玩家公司或玩家控股的公司
  const canTransferTo = toCompanyId === 0 || hasControlRight(0, toCompanyId, 'asset_transfer');
  if (!canTransferTo) {
    return { success: false, reason: '目标公司不在控制范围内' };
  }
  
  if (assetType === 'building') {
    for (const buildingId of assetIds) {
      if (world.buildings.owners[buildingId] !== fromCompanyId) {
        return { success: false, reason: `建筑 ${buildingId} 不属于源公司` };
      }
      // 转移建筑
      world.buildings.owners[buildingId] = toCompanyId;
    }
  } else if (assetType === 'inventory') {
    for (const goodsId of assetIds) {
      const qty = world.companies.inventories[fromCompanyId * GOODS_COUNT + goodsId];
      if (qty > 0) {
        world.companies.inventories[toCompanyId * GOODS_COUNT + goodsId] += qty;
        world.companies.inventories[fromCompanyId * GOODS_COUNT + goodsId] = 0;
      }
    }
  }
  
  return { success: true };
}

/**
 * 应用控股方对被控公司的策略影响
 * 在每个tick调用，根据策略调整AI行为
 */
export function applyControllerInfluence(
  world: GameWorld,
  controllerId: number,
  targetId: number
): void {
  if (controllerId !== 0) return; // 目前只处理玩家控股
  
  const strategy = controlledStrategies.get(targetId);
  if (!strategy) return;
  
  // 根据策略影响AI决策（简化处理）
  // 这里主要是设置一些标志，让AI决策引擎读取
  // 实际的AI行为调整需要在AIDecisionEngine中实现
}

/**
 * 获取控制权等级的最低持股比例
 */
export function getMinPercentageForLevel(level: ControlLevel): number {
  switch (level) {
    case ControlLevel.None: return 0;
    case ControlLevel.Retail: return 0.01;
    case ControlLevel.Significant: return 5;
    case ControlLevel.Major: return 10;
    case ControlLevel.Strategic: return 20;
    case ControlLevel.Relative: return 33;
    case ControlLevel.Absolute: return 50;
    default: return 0;
  }
}

/**
 * 计算达到目标控制权等级需要的股数和成本
 */
export function calculateAcquisitionCost(
  companyId: number,
  targetLevel: ControlLevel,
  premiumPercent: number = 0.2
): {
  sharesNeeded: number;
  estimatedCost: number;
  currentShares: number;
  additionalSharesNeeded: number;
} | null {
  const stock = getStock(companyId);
  if (!stock) return null;
  
  const holding = getPlayerHoldingDetails(companyId);
  const currentShares = holding?.shares || 0;
  
  const targetPercentage = getMinPercentageForLevel(targetLevel);
  const targetShares = Math.ceil(stock.totalShares * (targetPercentage / 100));
  const additionalSharesNeeded = Math.max(0, targetShares - currentShares);
  
  const priceWithPremium = stock.currentPrice * (1 + premiumPercent);
  const estimatedCost = additionalSharesNeeded * priceWithPremium;
  
  return {
    sharesNeeded: targetShares,
    estimatedCost,
    currentShares,
    additionalSharesNeeded,
  };
}

/**
 * 初始化控制系统
 */
export function initializeOwnershipControl(): void {
  controlledStrategies.clear();
  controlChangeEvents.length = 0;
}

/**
 * 更新控制系统（每tick调用）
 */
export function updateOwnershipControl(world: GameWorld): ControlChangeEvent[] {
  const events: ControlChangeEvent[] = [];
  
  // 检查玩家控股的公司是否有变化
  const marketState = getMarketState();
  for (const [companyId, stock] of marketState.stocks) {
    const event = checkControlChange(world, companyId);
    if (event && event.newControllerId === 0) {
      events.push(event);
    }
  }
  
  // 应用控股影响
  for (const companyId of getPlayerControlledCompanyIds()) {
    applyControllerInfluence(world, 0, companyId);
  }
  
  return events;
}