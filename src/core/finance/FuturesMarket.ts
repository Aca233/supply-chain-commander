/**
 * 期货合约基础系统
 * 允许玩家对未来商品价格进行对冲和投机
 */

import { TICKS_PER_DAY, TICKS_PER_MONTH } from '@/core/constants';

// ==================== 类型定义 ====================

/**
 * 合约类型
 */
export enum ContractType {
  FUTURES = 'futures',   // 期货合约
  FORWARD = 'forward',   // 远期合约
  OPTION = 'option',     // 期权合约
}

/**
 * 合约方向
 */
export enum ContractPosition {
  LONG = 'long',         // 多头（买入）
  SHORT = 'short',       // 空头（卖出）
}

/**
 * 期货合约定义
 */
export interface FuturesContract {
  id: number;
  goodsId: number;
  contractType: ContractType;
  
  // 合约规格
  contractSize: number;        // 每手数量
  tickSize: number;            // 最小变动单位
  tickValue: number;           // 每tick价值
  
  // 到期
  expiryTick: number;          // 到期时间
  lastTradingTick: number;     // 最后交易时间
  
  // 交割
  isPhysicalDelivery: boolean; // 是否实物交割
  deliveryMonth: number;       // 交割月份
  
  // 价格
  settlementPrice: number;     // 结算价
  openInterest: number;        // 持仓量
  
  // 保证金
  initialMargin: number;       // 初始保证金
  maintenanceMargin: number;   // 维持保证金
}

/**
 * 持仓记录
 */
export interface FuturesPosition {
  id: number;
  companyId: number;
  contractId: number;
  position: ContractPosition;
  
  // 数量
  contracts: number;           // 持有合约数量
  
  // 成本
  entryPrice: number;          // 开仓价格
  entryTick: number;           // 开仓时间
  
  // 盈亏
  unrealizedPnL: number;       // 未实现盈亏
  realizedPnL: number;         // 已实现盈亏
  
  // 保证金
  marginUsed: number;          // 已用保证金
  
  // 状态
  isOpen: boolean;
  closedTick?: number;
  closePrice?: number;
}

/**
 * 期货订单
 */
export interface FuturesOrder {
  id: number;
  companyId: number;
  contractId: number;
  position: ContractPosition;
  
  contracts: number;
  price: number;
  orderType: 'limit' | 'market';
  
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  filledContracts: number;
  avgFillPrice: number;
  
  createdTick: number;
  expiryTick?: number;
}

// ==================== 期货市场配置 ====================

/**
 * 商品的期货合约配置
 */
interface GoodsFuturesConfig {
  goodsId: number;
  name: string;
  contractSize: number;
  tickSize: number;
  initialMarginPct: number;    // 初始保证金比例
  maintenanceMarginPct: number; // 维持保证金比例
  maxPositionLimit: number;    // 最大持仓限制
  isPhysicalDelivery: boolean;
}

const FUTURES_CONFIGS: GoodsFuturesConfig[] = [
  // 大宗商品期货
  { goodsId: 0, name: '铁矿石期货', contractSize: 100, tickSize: 0.5, initialMarginPct: 0.1, maintenanceMarginPct: 0.07, maxPositionLimit: 1000, isPhysicalDelivery: true },
  { goodsId: 1, name: '铜期货', contractSize: 50, tickSize: 1, initialMarginPct: 0.1, maintenanceMarginPct: 0.07, maxPositionLimit: 500, isPhysicalDelivery: true },
  { goodsId: 3, name: '煤炭期货', contractSize: 100, tickSize: 0.5, initialMarginPct: 0.08, maintenanceMarginPct: 0.05, maxPositionLimit: 2000, isPhysicalDelivery: true },
  { goodsId: 4, name: '原油期货', contractSize: 1000, tickSize: 0.01, initialMarginPct: 0.12, maintenanceMarginPct: 0.08, maxPositionLimit: 500, isPhysicalDelivery: false },
  { goodsId: 5, name: '天然气期货', contractSize: 500, tickSize: 0.001, initialMarginPct: 0.15, maintenanceMarginPct: 0.1, maxPositionLimit: 300, isPhysicalDelivery: false },
  
  // 农产品期货
  { goodsId: 8, name: '粮食期货', contractSize: 50, tickSize: 0.25, initialMarginPct: 0.08, maintenanceMarginPct: 0.05, maxPositionLimit: 1000, isPhysicalDelivery: true },
  { goodsId: 7, name: '棉花期货', contractSize: 20, tickSize: 0.5, initialMarginPct: 0.08, maintenanceMarginPct: 0.05, maxPositionLimit: 500, isPhysicalDelivery: true },
  
  // 金属期货
  { goodsId: 14, name: '钢材期货', contractSize: 10, tickSize: 1, initialMarginPct: 0.1, maintenanceMarginPct: 0.07, maxPositionLimit: 800, isPhysicalDelivery: true },
  { goodsId: 15, name: '铜材期货', contractSize: 5, tickSize: 5, initialMarginPct: 0.1, maintenanceMarginPct: 0.07, maxPositionLimit: 400, isPhysicalDelivery: true },
];

const FUTURES_CONFIG_MAP: Map<number, GoodsFuturesConfig> = new Map(
  FUTURES_CONFIGS.map(c => [c.goodsId, c])
);

// ==================== 期货市场管理 ====================

export class FuturesMarket {
  private contracts: Map<number, FuturesContract> = new Map();
  private positions: Map<number, FuturesPosition> = new Map();
  private orders: Map<number, FuturesOrder> = new Map();
  
  private nextContractId: number = 1;
  private nextPositionId: number = 1;
  private nextOrderId: number = 1;
  
  private positionsByCompany: Map<number, Set<number>> = new Map();
  private contractsByGoods: Map<number, Set<number>> = new Map();
  
  /**
   * 创建新的期货合约（每月到期）
   */
  createMonthlyContracts(currentTick: number, spotPrices: Map<number, number>): FuturesContract[] {
    const created: FuturesContract[] = [];
    
    for (const config of FUTURES_CONFIGS) {
      const spotPrice = spotPrices.get(config.goodsId) ?? 100;
      
      // 创建未来3个月的合约
      for (let monthsAhead = 1; monthsAhead <= 3; monthsAhead++) {
        const ticksPerMonth = TICKS_PER_MONTH;
        const expiryTick = currentTick + ticksPerMonth * monthsAhead;
        
        // 检查是否已存在该月份合约
        const existingContract = this.findContractByExpiry(config.goodsId, expiryTick);
        if (existingContract) continue;
        
        const contractId = this.nextContractId++;
        
        // 期货价格基于现货价格加持有成本
        const carryingCost = spotPrice * 0.02 * monthsAhead;  // 2%月利率
        const futuresPrice = spotPrice + carryingCost;
        
        const contract: FuturesContract = {
          id: contractId,
          goodsId: config.goodsId,
          contractType: ContractType.FUTURES,
          contractSize: config.contractSize,
          tickSize: config.tickSize,
          tickValue: config.tickSize * config.contractSize,
          expiryTick,
          lastTradingTick: expiryTick - TICKS_PER_DAY,
          isPhysicalDelivery: config.isPhysicalDelivery,
          deliveryMonth: monthsAhead,
          settlementPrice: futuresPrice,
          openInterest: 0,
          initialMargin: futuresPrice * config.contractSize * config.initialMarginPct,
          maintenanceMargin: futuresPrice * config.contractSize * config.maintenanceMarginPct,
        };
        
        this.contracts.set(contractId, contract);
        
        if (!this.contractsByGoods.has(config.goodsId)) {
          this.contractsByGoods.set(config.goodsId, new Set());
        }
        this.contractsByGoods.get(config.goodsId)!.add(contractId);
        
        created.push(contract);
      }
    }
    
    return created;
  }
  
  /**
   * 查找指定到期的合约
   */
  private findContractByExpiry(goodsId: number, expiryTick: number): FuturesContract | null {
    const contractIds = this.contractsByGoods.get(goodsId);
    if (!contractIds) return null;
    
    for (const id of contractIds) {
      const contract = this.contracts.get(id);
      if (contract && Math.abs(contract.expiryTick - expiryTick) < 7 * TICKS_PER_DAY) {
        return contract;
      }
    }
    return null;
  }
  
  /**
   * 下期货订单
   */
  placeOrder(
    companyId: number,
    contractId: number,
    position: ContractPosition,
    contracts: number,
    price: number,
    orderType: 'limit' | 'market',
    currentTick: number
  ): FuturesOrder | null {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;
    
    // 检查持仓限制
    const config = FUTURES_CONFIG_MAP.get(contract.goodsId);
    if (config) {
      const currentPosition = this.getCompanyPosition(companyId, contractId);
      const totalContracts = (currentPosition?.contracts ?? 0) + contracts;
      if (totalContracts > config.maxPositionLimit) {
        return null;  // 超过持仓限制
      }
    }
    
    const orderId = this.nextOrderId++;
    
    const order: FuturesOrder = {
      id: orderId,
      companyId,
      contractId,
      position,
      contracts,
      price,
      orderType,
      status: 'pending',
      filledContracts: 0,
      avgFillPrice: 0,
      createdTick: currentTick,
    };
    
    this.orders.set(orderId, order);
    
    // 市价单立即成交（简化处理）
    if (orderType === 'market') {
      this.fillOrder(orderId, contract.settlementPrice, currentTick);
    }
    
    return order;
  }
  
  /**
   * 成交订单
   */
  fillOrder(orderId: number, fillPrice: number, currentTick: number): boolean {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'pending') return false;
    
    const contract = this.contracts.get(order.contractId);
    if (!contract) return false;
    
    order.status = 'filled';
    order.filledContracts = order.contracts;
    order.avgFillPrice = fillPrice;
    
    // 更新或创建持仓
    let position = this.getCompanyPosition(order.companyId, order.contractId);
    
    if (position) {
      if (position.position === order.position) {
        // 加仓
        const totalCost = position.entryPrice * position.contracts + fillPrice * order.contracts;
        position.contracts += order.contracts;
        position.entryPrice = totalCost / position.contracts;
        position.marginUsed = position.contracts * contract.initialMargin;
      } else {
        // 平仓或反向
        if (order.contracts >= position.contracts) {
          // 完全平仓或反向
          const closedContracts = position.contracts;
          const pnl = this.calculatePnL(position.position, position.entryPrice, fillPrice, closedContracts, contract);
          position.realizedPnL += pnl;
          
          const remainingContracts = order.contracts - closedContracts;
          if (remainingContracts > 0) {
            // 反向开仓
            position.position = order.position;
            position.contracts = remainingContracts;
            position.entryPrice = fillPrice;
            position.marginUsed = remainingContracts * contract.initialMargin;
          } else {
            // 完全平仓
            position.contracts = 0;
            position.isOpen = false;
            position.closedTick = currentTick;
            position.closePrice = fillPrice;
          }
        } else {
          // 部分平仓
          const pnl = this.calculatePnL(position.position, position.entryPrice, fillPrice, order.contracts, contract);
          position.realizedPnL += pnl;
          position.contracts -= order.contracts;
          position.marginUsed = position.contracts * contract.initialMargin;
        }
      }
    } else {
      // 新开仓
      const positionId = this.nextPositionId++;
      position = {
        id: positionId,
        companyId: order.companyId,
        contractId: order.contractId,
        position: order.position,
        contracts: order.contracts,
        entryPrice: fillPrice,
        entryTick: currentTick,
        unrealizedPnL: 0,
        realizedPnL: 0,
        marginUsed: order.contracts * contract.initialMargin,
        isOpen: true,
      };
      
      this.positions.set(positionId, position);
      
      if (!this.positionsByCompany.has(order.companyId)) {
        this.positionsByCompany.set(order.companyId, new Set());
      }
      this.positionsByCompany.get(order.companyId)!.add(positionId);
    }
    
    // 更新未平仓量
    if (order.position === ContractPosition.LONG) {
      contract.openInterest += order.contracts;
    } else {
      contract.openInterest += order.contracts;
    }
    
    return true;
  }
  
  /**
   * 计算盈亏
   */
  private calculatePnL(
    position: ContractPosition,
    entryPrice: number,
    currentPrice: number,
    contracts: number,
    contract: FuturesContract
  ): number {
    const priceChange = currentPrice - entryPrice;
    const direction = position === ContractPosition.LONG ? 1 : -1;
    return priceChange * contracts * contract.contractSize * direction;
  }
  
  /**
   * 更新持仓盈亏
   */
  updatePositionsPnL(currentPrices: Map<number, number>): void {
    for (const [, position] of this.positions) {
      if (!position.isOpen) continue;
      
      const contract = this.contracts.get(position.contractId);
      if (!contract) continue;
      
      const currentPrice = currentPrices.get(contract.goodsId) ?? contract.settlementPrice;
      position.unrealizedPnL = this.calculatePnL(
        position.position,
        position.entryPrice,
        currentPrice,
        position.contracts,
        contract
      );
    }
  }
  
  /**
   * 处理合约到期
   */
  handleExpiry(currentTick: number, spotPrices: Map<number, number>): void {
    for (const [contractId, contract] of this.contracts) {
      if (currentTick >= contract.expiryTick) {
        // 结算所有持仓
        for (const [, position] of this.positions) {
          if (position.contractId === contractId && position.isOpen) {
            const spotPrice = spotPrices.get(contract.goodsId) ?? contract.settlementPrice;
            const pnl = this.calculatePnL(
              position.position,
              position.entryPrice,
              spotPrice,
              position.contracts,
              contract
            );
            position.realizedPnL += pnl;
            position.unrealizedPnL = 0;
            position.isOpen = false;
            position.closedTick = currentTick;
            position.closePrice = spotPrice;
          }
        }
        
        // 移除到期合约
        this.contracts.delete(contractId);
        this.contractsByGoods.get(contract.goodsId)?.delete(contractId);
      }
    }
  }
  
  /**
   * 获取公司在特定合约的持仓
   */
  getCompanyPosition(companyId: number, contractId: number): FuturesPosition | null {
    const positionIds = this.positionsByCompany.get(companyId);
    if (!positionIds) return null;
    
    for (const id of positionIds) {
      const position = this.positions.get(id);
      if (position && position.contractId === contractId && position.isOpen) {
        return position;
      }
    }
    return null;
  }
  
  /**
   * 获取公司的所有持仓
   */
  getCompanyPositions(companyId: number): FuturesPosition[] {
    const positionIds = this.positionsByCompany.get(companyId);
    if (!positionIds) return [];
    
    return Array.from(positionIds)
      .map(id => this.positions.get(id))
      .filter((p): p is FuturesPosition => p !== undefined && p.isOpen);
  }
  
  /**
   * 获取商品的可用合约
   */
  getGoodsContracts(goodsId: number): FuturesContract[] {
    const contractIds = this.contractsByGoods.get(goodsId);
    if (!contractIds) return [];
    
    return Array.from(contractIds)
      .map(id => this.contracts.get(id))
      .filter((c): c is FuturesContract => c !== undefined)
      .sort((a, b) => a.expiryTick - b.expiryTick);
  }
  
  /**
   * 获取公司的总保证金需求
   */
  getCompanyMarginRequirement(companyId: number): number {
    const positions = this.getCompanyPositions(companyId);
    return positions.reduce((sum, p) => sum + p.marginUsed, 0);
  }
  
  /**
   * 检查追加保证金
   */
  checkMarginCall(companyId: number, currentCash: number): { isMarginCall: boolean; shortfall: number } {
    const positions = this.getCompanyPositions(companyId);
    let totalMarginRequired = 0;
    
    for (const position of positions) {
      const contract = this.contracts.get(position.contractId);
      if (!contract) continue;
      
      // 如果亏损超过初始保证金-维持保证金的差额，需要追加保证金
      if (position.unrealizedPnL < 0) {
        const maintenanceMargin = position.contracts * contract.maintenanceMargin;
        const marginDeficit = Math.abs(position.unrealizedPnL) - (position.marginUsed - maintenanceMargin);
        if (marginDeficit > 0) {
          totalMarginRequired += marginDeficit;
        }
      }
    }
    
    const isMarginCall = totalMarginRequired > currentCash;
    const shortfall = Math.max(0, totalMarginRequired - currentCash);
    
    return { isMarginCall, shortfall };
  }
}

// ==================== 单例实例 ====================

export const futuresMarket = new FuturesMarket();

// ==================== 工具函数 ====================

/**
 * 获取期货配置
 */
export function getFuturesConfig(goodsId: number): GoodsFuturesConfig | null {
  return FUTURES_CONFIG_MAP.get(goodsId) ?? null;
}

/**
 * 检查商品是否有期货合约
 */
export function hasFuturesContract(goodsId: number): boolean {
  return FUTURES_CONFIG_MAP.has(goodsId);
}

/**
 * 格式化持仓信息
 */
export function formatPosition(position: FuturesPosition): string {
  const direction = position.position === ContractPosition.LONG ? '多' : '空';
  const pnl = position.unrealizedPnL + position.realizedPnL;
  const pnlStr = pnl >= 0 ? `+¥${pnl.toFixed(0)}` : `-¥${Math.abs(pnl).toFixed(0)}`;
  return `${direction}头 ${position.contracts}手 @ ¥${position.entryPrice.toFixed(2)} ${pnlStr}`;
}

/**
 * 格式化合约名称
 */
export function formatContractName(contract: FuturesContract): string {
  const config = FUTURES_CONFIG_MAP.get(contract.goodsId);
  const name = config?.name ?? '未知期货';
  const month = contract.deliveryMonth;
  return `${name} M+${month}`;
}
