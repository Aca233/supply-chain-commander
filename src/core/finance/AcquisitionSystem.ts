/**
 * 企业收购系统
 * 实现公司间的并购、收购和资产交易
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT } from '@/core/constants';
import { getStock, getHoldings, Holding } from './StockMarket';

/**
 * 收购类型
 */
export type AcquisitionType = 
  | 'friendly'      // 友好收购
  | 'hostile'       // 敌意收购
  | 'merger'        // 合并
  | 'asset_purchase'; // 资产收购

/**
 * 收购状态
 */
export type AcquisitionStatus = 
  | 'proposed'      // 已提议
  | 'negotiating'   // 谈判中
  | 'approved'      // 已批准
  | 'rejected'      // 被拒绝
  | 'completed'     // 已完成
  | 'cancelled';    // 已取消

/**
 * 收购要约
 */
export interface AcquisitionOffer {
  id: number;
  type: AcquisitionType;
  acquirerId: number;           // 收购方
  targetId: number;             // 目标方
  
  // 收购条件
  targetSharePercent: number;   // 目标持股比例
  offerPrice: number;           // 每股出价
  cashComponent: number;        // 现金部分
  stockComponent: number;       // 换股部分（股数）
  
  // 交易价值
  totalValue: number;
  premium: number;              // 溢价率
  
  // 时间
  proposedTick: number;
  expiryTick: number;
  
  // 状态
  status: AcquisitionStatus;
  acceptedSharePercent: number; // 已接受的股份比例
  
  // 条件
  conditions: string[];
  antitrustApproval: boolean;
}

/**
 * 资产交易
 */
export interface AssetTransaction {
  id: number;
  sellerId: number;
  buyerId: number;
  
  assetType: 'building' | 'inventory' | 'patent';
  assetIds: number[];
  
  price: number;
  status: 'pending' | 'completed' | 'cancelled';
  
  createdTick: number;
}

/**
 * 收购系统状态
 */
interface AcquisitionState {
  offers: Map<number, AcquisitionOffer>;
  assetTransactions: Map<number, AssetTransaction>;
  nextOfferId: number;
  nextTransactionId: number;
  
  // 历史记录
  completedAcquisitions: AcquisitionOffer[];
}

// 全局收购系统状态
let acquisitionState: AcquisitionState = {
  offers: new Map(),
  assetTransactions: new Map(),
  nextOfferId: 1,
  nextTransactionId: 1,
  completedAcquisitions: [],
};

/**
 * 初始化收购系统
 */
export function initializeAcquisitionSystem(): void {
  acquisitionState = {
    offers: new Map(),
    assetTransactions: new Map(),
    nextOfferId: 1,
    nextTransactionId: 1,
    completedAcquisitions: [],
  };
}

/**
 * 评估公司价值
 */
export function evaluateCompanyValue(world: GameWorld, companyId: number): {
  bookValue: number;
  marketValue: number;
  enterpriseValue: number;
  fairValue: number;
} {
  // 账面价值
  let bookValue = world.companies.cash[companyId];
  
  for (let i = 0; i < GOODS_COUNT; i++) {
    bookValue += world.companies.inventories[companyId * GOODS_COUNT + i] * world.goods.prices[i];
  }
  
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      bookValue += 500000;
    }
  }
  
  // 市场价值（如果上市）
  const stock = getStock(companyId);
  const marketValue = stock ? stock.marketCap : bookValue * 1.5;
  
  // 企业价值 = 市值 + 净债务
  const netDebt = 0; // TODO: 从银行系统获取
  const enterpriseValue = marketValue + netDebt;
  
  // 公允价值 = 账面价值 + 未来盈利折现
  const estimatedEarnings = bookValue * 0.1; // 假设10% ROE
  const fairValue = bookValue + estimatedEarnings * 8; // 8倍PE
  
  return { bookValue, marketValue, enterpriseValue, fairValue };
}

/**
 * 发起收购要约
 */
export function initiateAcquisition(
  world: GameWorld,
  acquirerId: number,
  targetId: number,
  type: AcquisitionType,
  targetSharePercent: number,
  offerPrice: number,
  cashRatio: number = 1 // 1=全现金, 0=全换股
): { success: boolean; offerId?: number; reason?: string } {
  // 不能收购自己
  if (acquirerId === targetId) {
    return { success: false, reason: '不能收购自己' };
  }
  
  // 检查目标是否存在
  if (targetId >= world.companies.count) {
    return { success: false, reason: '目标公司不存在' };
  }
  
  // 评估目标价值
  const targetValue = evaluateCompanyValue(world, targetId);
  const stock = getStock(targetId);
  const totalShares = stock?.totalShares || 1000000;
  
  // 计算总交易价值
  const sharesToAcquire = totalShares * targetSharePercent;
  const totalValue = offerPrice * sharesToAcquire;
  const cashComponent = totalValue * cashRatio;
  const stockComponent = 0; // 简化：暂不支持换股
  
  // 检查收购方资金
  if (world.companies.cash[acquirerId] < cashComponent) {
    return { success: false, reason: '资金不足' };
  }
  
  // 计算溢价
  const currentPrice = stock?.currentPrice || (targetValue.bookValue / totalShares);
  const premium = (offerPrice - currentPrice) / currentPrice;
  
  // 检查溢价合理性
  if (premium < 0) {
    return { success: false, reason: '出价低于市价' };
  }
  
  // 反垄断检查
  const antitrustApproval = checkAntitrust(world, acquirerId, targetId);
  
  // 创建收购要约
  const offer: AcquisitionOffer = {
    id: acquisitionState.nextOfferId++,
    type,
    acquirerId,
    targetId,
    targetSharePercent,
    offerPrice,
    cashComponent,
    stockComponent,
    totalValue,
    premium,
    proposedTick: world.tick,
    expiryTick: world.tick + 2160, // 90天有效期
    status: 'proposed',
    acceptedSharePercent: 0,
    conditions: [],
    antitrustApproval,
  };
  
  acquisitionState.offers.set(offer.id, offer);
  
  // 预留资金
  world.companies.cash[acquirerId] -= cashComponent;
  
  return { success: true, offerId: offer.id };
}

/**
 * 反垄断检查
 */
function checkAntitrust(world: GameWorld, acquirerId: number, targetId: number): boolean {
  // 简化：如果合并后市场份额超过30%则需要审批
  let acquirerBuildings = 0;
  let targetBuildings = 0;
  const totalBuildings = world.buildings.count;
  
  for (let i = 0; i < totalBuildings; i++) {
    if (world.buildings.owners[i] === acquirerId) acquirerBuildings++;
    if (world.buildings.owners[i] === targetId) targetBuildings++;
  }
  
  const combinedShare = (acquirerBuildings + targetBuildings) / totalBuildings;
  
  // 超过30%需要审批（这里简化为随机通过）
  if (combinedShare > 0.3) {
    return Math.random() > 0.3; // 70%通过率
  }
  
  return true;
}

/**
 * 响应收购要约
 */
export function respondToOffer(
  world: GameWorld,
  offerId: number,
  response: 'accept' | 'reject' | 'counter',
  counterPrice?: number
): { success: boolean; reason?: string } {
  const offer = acquisitionState.offers.get(offerId);
  if (!offer) {
    return { success: false, reason: '要约不存在' };
  }
  
  if (offer.status !== 'proposed' && offer.status !== 'negotiating') {
    return { success: false, reason: '要约已结束' };
  }
  
  switch (response) {
    case 'accept':
      offer.status = 'approved';
      // 执行收购
      executeAcquisition(world, offer);
      return { success: true };
      
    case 'reject':
      offer.status = 'rejected';
      // 退还资金
      world.companies.cash[offer.acquirerId] += offer.cashComponent;
      return { success: true };
      
    case 'counter':
      if (counterPrice && counterPrice > offer.offerPrice) {
        offer.status = 'negotiating';
        // 可以触发新一轮谈判
        return { success: true };
      }
      return { success: false, reason: '还价必须高于当前出价' };
      
    default:
      return { success: false, reason: '无效响应' };
  }
}

/**
 * 执行收购
 */
function executeAcquisition(world: GameWorld, offer: AcquisitionOffer): void {
  const { acquirerId, targetId, targetSharePercent } = offer;
  
  // 转移股份
  const stock = getStock(targetId);
  if (stock) {
    const sharesToTransfer = stock.totalShares * targetSharePercent;
    
    // 更新股东结构
    // 从现有股东处收购（简化处理）
    const holdings = getHoldings(targetId);
    for (const holding of holdings) {
      if (holding.ownerCompanyId !== acquirerId) {
        // 按比例减少现有股东持股
        // 实际操作需要更复杂的逻辑
      }
    }
  }
  
  // 如果获得控股权（>50%），转移资产
  if (targetSharePercent > 0.5) {
    // 转移建筑所有权
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === targetId) {
        world.buildings.owners[i] = acquirerId;
      }
    }
    
    // 转移库存
    for (let i = 0; i < GOODS_COUNT; i++) {
      const targetInventory = world.companies.inventories[targetId * GOODS_COUNT + i];
      world.companies.inventories[acquirerId * GOODS_COUNT + i] += targetInventory;
      world.companies.inventories[targetId * GOODS_COUNT + i] = 0;
    }
    
    // 转移现金（扣除收购款）
    world.companies.cash[acquirerId] += world.companies.cash[targetId];
    world.companies.cash[targetId] = 0;
  }
  
  offer.status = 'completed';
  acquisitionState.completedAcquisitions.push(offer);
}

/**
 * 发起资产收购
 */
export function initiateAssetPurchase(
  world: GameWorld,
  buyerId: number,
  sellerId: number,
  assetType: 'building' | 'inventory',
  assetIds: number[],
  price: number
): { success: boolean; transactionId?: number; reason?: string } {
  // 验证资产所有权
  if (assetType === 'building') {
    for (const buildingId of assetIds) {
      if (world.buildings.owners[buildingId] !== sellerId) {
        return { success: false, reason: '卖方不拥有该建筑' };
      }
    }
  }
  
  // 验证买方资金
  if (world.companies.cash[buyerId] < price) {
    return { success: false, reason: '资金不足' };
  }
  
  const transaction: AssetTransaction = {
    id: acquisitionState.nextTransactionId++,
    sellerId,
    buyerId,
    assetType,
    assetIds,
    price,
    status: 'pending',
    createdTick: world.tick,
  };
  
  acquisitionState.assetTransactions.set(transaction.id, transaction);
  
  return { success: true, transactionId: transaction.id };
}

/**
 * 确认资产交易
 */
export function confirmAssetTransaction(
  world: GameWorld,
  transactionId: number
): { success: boolean; reason?: string } {
  const transaction = acquisitionState.assetTransactions.get(transactionId);
  if (!transaction) {
    return { success: false, reason: '交易不存在' };
  }
  
  if (transaction.status !== 'pending') {
    return { success: false, reason: '交易已处理' };
  }
  
  // 执行资金转移
  world.companies.cash[transaction.buyerId] -= transaction.price;
  world.companies.cash[transaction.sellerId] += transaction.price;
  
  // 执行资产转移
  if (transaction.assetType === 'building') {
    for (const buildingId of transaction.assetIds) {
      world.buildings.owners[buildingId] = transaction.buyerId;
    }
  } else if (transaction.assetType === 'inventory') {
    // 转移库存
    for (const goodsId of transaction.assetIds) {
      const qty = world.companies.inventories[transaction.sellerId * GOODS_COUNT + goodsId];
      world.companies.inventories[transaction.buyerId * GOODS_COUNT + goodsId] += qty;
      world.companies.inventories[transaction.sellerId * GOODS_COUNT + goodsId] = 0;
    }
  }
  
  transaction.status = 'completed';
  
  return { success: true };
}

/**
 * 取消资产交易
 */
export function cancelAssetTransaction(transactionId: number): boolean {
  const transaction = acquisitionState.assetTransactions.get(transactionId);
  if (transaction && transaction.status === 'pending') {
    transaction.status = 'cancelled';
    return true;
  }
  return false;
}

/**
 * 获取收购要约
 */
export function getAcquisitionOffer(offerId: number): AcquisitionOffer | null {
  return acquisitionState.offers.get(offerId) || null;
}

/**
 * 获取公司收到的要约
 */
export function getOffersForCompany(targetId: number): AcquisitionOffer[] {
  const offers: AcquisitionOffer[] = [];
  for (const [_, offer] of acquisitionState.offers) {
    if (offer.targetId === targetId && 
        (offer.status === 'proposed' || offer.status === 'negotiating')) {
      offers.push(offer);
    }
  }
  return offers;
}

/**
 * 获取公司发起的要约
 */
export function getOffersByCompany(acquirerId: number): AcquisitionOffer[] {
  const offers: AcquisitionOffer[] = [];
  for (const [_, offer] of acquisitionState.offers) {
    if (offer.acquirerId === acquirerId) {
      offers.push(offer);
    }
  }
  return offers;
}

/**
 * 分析收购可行性
 */
export function analyzeAcquisitionFeasibility(
  world: GameWorld,
  acquirerId: number,
  targetId: number
): {
  feasible: boolean;
  reason?: string;
  suggestedPremium: number;
  estimatedCost: number;
  synergies: number;
  riskLevel: 'low' | 'medium' | 'high';
} {
  const acquirerCash = world.companies.cash[acquirerId];
  const targetValue = evaluateCompanyValue(world, targetId);
  
  // 计算建议溢价（基于市场状况）
  const cyclePosition = world.economyStats.cyclePosition;
  const basePremium = 0.2; // 20%基础溢价
  const cyclePremium = (cyclePosition - 0.5) * 0.2; // 周期调整
  const suggestedPremium = basePremium + cyclePremium;
  
  // 估算成本
  const estimatedCost = targetValue.marketValue * (1 + suggestedPremium);
  
  // 资金充足性
  if (acquirerCash < estimatedCost * 0.5) {
    return {
      feasible: false,
      reason: '资金不足',
      suggestedPremium,
      estimatedCost,
      synergies: 0,
      riskLevel: 'high',
    };
  }
  
  // 协同效应评估
  let acquirerBuildings = 0;
  let targetBuildings = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === acquirerId) acquirerBuildings++;
    if (world.buildings.owners[i] === targetId) targetBuildings++;
  }
  
  // 规模协同
  const scaleSynergy = targetBuildings * 50000; // 每建筑5万协同效应
  const synergies = scaleSynergy;
  
  // 风险评估
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (estimatedCost > acquirerCash * 0.8) {
    riskLevel = 'high';
  } else if (estimatedCost < acquirerCash * 0.3) {
    riskLevel = 'low';
  }
  
  return {
    feasible: true,
    suggestedPremium,
    estimatedCost,
    synergies,
    riskLevel,
  };
}

/**
 * 更新收购系统
 */
export function updateAcquisitionSystem(world: GameWorld): void {
  // 处理过期要约
  for (const [offerId, offer] of acquisitionState.offers) {
    if (offer.status === 'proposed' || offer.status === 'negotiating') {
      if (world.tick > offer.expiryTick) {
        offer.status = 'cancelled';
        // 退还资金
        world.companies.cash[offer.acquirerId] += offer.cashComponent;
      }
    }
  }
  
  // 清理旧交易记录
  for (const [transactionId, transaction] of acquisitionState.assetTransactions) {
    if (transaction.status !== 'pending' && 
        world.tick - transaction.createdTick > 2880) {
      acquisitionState.assetTransactions.delete(transactionId);
    }
  }
}

/**
 * 获取收购历史
 */
export function getAcquisitionHistory(): AcquisitionOffer[] {
  return [...acquisitionState.completedAcquisitions];
}

/**
 * 获取系统状态
 */
export function getAcquisitionState(): AcquisitionState {
  return acquisitionState;
}