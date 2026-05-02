/**
 * 期货合约基础系统
 * 允许玩家对未来商品价格进行对冲和投机
 */

import { TICKS_PER_DAY, TICKS_PER_MONTH } from '@/core/constants';
import { GoodsId } from '@/data/goods';
import { GameWorld } from '@/core/world/GameWorld';

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
  { goodsId: GoodsId.IRON_ORE, name: '铁矿石期货', contractSize: 100, tickSize: 0.5, initialMarginPct: 0.1, maintenanceMarginPct: 0.07, maxPositionLimit: 1000, isPhysicalDelivery: true },
  { goodsId: GoodsId.COPPER_ORE, name: '铜期货', contractSize: 50, tickSize: 1, initialMarginPct: 0.1, maintenanceMarginPct: 0.07, maxPositionLimit: 500, isPhysicalDelivery: true },
  { goodsId: GoodsId.COAL, name: '煤炭期货', contractSize: 100, tickSize: 0.5, initialMarginPct: 0.08, maintenanceMarginPct: 0.05, maxPositionLimit: 2000, isPhysicalDelivery: true },
  { goodsId: GoodsId.CRUDE_OIL, name: '原油期货', contractSize: 1000, tickSize: 0.01, initialMarginPct: 0.12, maintenanceMarginPct: 0.08, maxPositionLimit: 500, isPhysicalDelivery: false },
  { goodsId: GoodsId.NATURAL_GAS, name: '天然气期货', contractSize: 500, tickSize: 0.001, initialMarginPct: 0.15, maintenanceMarginPct: 0.1, maxPositionLimit: 300, isPhysicalDelivery: false },
  
  // 农产品期货
  { goodsId: GoodsId.GRAIN, name: '粮食期货', contractSize: 50, tickSize: 0.25, initialMarginPct: 0.08, maintenanceMarginPct: 0.05, maxPositionLimit: 1000, isPhysicalDelivery: true },
  { goodsId: GoodsId.COTTON, name: '棉花期货', contractSize: 20, tickSize: 0.5, initialMarginPct: 0.08, maintenanceMarginPct: 0.05, maxPositionLimit: 500, isPhysicalDelivery: true },
  
  // 金属期货
  { goodsId: GoodsId.STEEL, name: '钢材期货', contractSize: 10, tickSize: 1, initialMarginPct: 0.1, maintenanceMarginPct: 0.07, maxPositionLimit: 800, isPhysicalDelivery: true },
  { goodsId: GoodsId.COPPER, name: '铜材期货', contractSize: 5, tickSize: 5, initialMarginPct: 0.1, maintenanceMarginPct: 0.07, maxPositionLimit: 400, isPhysicalDelivery: true },
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

  reset(): void {
    this.contracts.clear();
    this.positions.clear();
    this.orders.clear();
    this.positionsByCompany.clear();
    this.contractsByGoods.clear();
    this.nextContractId = 1;
    this.nextPositionId = 1;
    this.nextOrderId = 1;
  }

  private estimateAdditionalMargin(
    companyId: number,
    contractId: number,
    orderPosition: ContractPosition,
    contracts: number,
  ): number {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return Number.POSITIVE_INFINITY;
    }

    const currentPosition = this.getCompanyPosition(companyId, contractId);
    if (!currentPosition) {
      return contracts * contract.initialMargin;
    }

    if (currentPosition.position === orderPosition) {
      return contracts * contract.initialMargin;
    }

    return Math.max(0, contracts - currentPosition.contracts) * contract.initialMargin;
  }

  private markPositionToPrice(
    world: GameWorld,
    position: FuturesPosition,
    markPrice: number,
    contract: FuturesContract,
  ): void {
    const nextUnrealized = this.calculatePnL(
      position.position,
      position.entryPrice,
      markPrice,
      position.contracts,
      contract,
    );
    const pnlDelta = nextUnrealized - position.unrealizedPnL;

    world.companies.cash[position.companyId] += pnlDelta;
    position.unrealizedPnL = nextUnrealized;
  }

  private closePositionAtPrice(
    world: GameWorld,
    position: FuturesPosition,
    closePrice: number,
    currentTick: number,
  ): void {
    const contract = this.contracts.get(position.contractId);
    if (!contract || !position.isOpen) {
      return;
    }

    this.markPositionToPrice(world, position, closePrice, contract);
    world.companies.cash[position.companyId] += position.marginUsed;

    position.realizedPnL += position.unrealizedPnL;
    position.unrealizedPnL = 0;
    position.marginUsed = 0;
    position.contracts = 0;
    position.isOpen = false;
    position.closedTick = currentTick;
    position.closePrice = closePrice;
  }
  
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
    world: GameWorld,
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
      const totalContracts = currentPosition && currentPosition.position !== position
        ? Math.max(0, contracts - currentPosition.contracts)
        : (currentPosition?.contracts ?? 0) + contracts;
      if (totalContracts > config.maxPositionLimit) {
        return null;  // 超过持仓限制
      }
    }

    if (world.companies.cash[companyId] < this.estimateAdditionalMargin(companyId, contractId, position, contracts)) {
      return null;
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
      this.fillOrder(world, orderId, contract.settlementPrice, currentTick);
    }
    
    return order;
  }
  
  /**
   * 成交订单
   */
  fillOrder(world: GameWorld, orderId: number, fillPrice: number, currentTick: number): boolean {
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
      this.markPositionToPrice(world, position, fillPrice, contract);

      if (position.position === order.position) {
        // 加仓
        const additionalMargin = order.contracts * contract.initialMargin;
        if (world.companies.cash[order.companyId] < additionalMargin) {
          order.status = 'cancelled';
          return false;
        }

        const totalCost = position.entryPrice * position.contracts + fillPrice * order.contracts;
        world.companies.cash[order.companyId] -= additionalMargin;
        position.contracts += order.contracts;
        position.entryPrice = totalCost / position.contracts;
        position.marginUsed = position.contracts * contract.initialMargin;
        position.unrealizedPnL = this.calculatePnL(
          position.position,
          position.entryPrice,
          fillPrice,
          position.contracts,
          contract,
        );
        contract.openInterest += order.contracts;
      } else {
        // 平仓或反向
        const previousContracts = position.contracts;
        const closedContracts = Math.min(order.contracts, previousContracts);
        const releasedMargin = previousContracts > 0
          ? position.marginUsed * (closedContracts / previousContracts)
          : 0;
        const closedPnl = this.calculatePnL(position.position, position.entryPrice, fillPrice, closedContracts, contract);

        position.realizedPnL += closedPnl;
        world.companies.cash[order.companyId] += releasedMargin;
        contract.openInterest = Math.max(0, contract.openInterest - closedContracts);

        if (order.contracts >= position.contracts) {
          // 完全平仓或反向
          const remainingContracts = order.contracts - closedContracts;
          if (remainingContracts > 0) {
            // 反向开仓
            const newMargin = remainingContracts * contract.initialMargin;
            if (world.companies.cash[order.companyId] < newMargin) {
              order.status = 'cancelled';
              position.contracts = 0;
              position.marginUsed = 0;
              position.unrealizedPnL = 0;
              position.isOpen = false;
              position.closedTick = currentTick;
              position.closePrice = fillPrice;
              return false;
            }

            world.companies.cash[order.companyId] -= newMargin;
            position.position = order.position;
            position.contracts = remainingContracts;
            position.entryPrice = fillPrice;
            position.unrealizedPnL = 0;
            position.marginUsed = remainingContracts * contract.initialMargin;
            contract.openInterest += remainingContracts;
          } else {
            // 完全平仓
            position.contracts = 0;
            position.marginUsed = 0;
            position.unrealizedPnL = 0;
            position.isOpen = false;
            position.closedTick = currentTick;
            position.closePrice = fillPrice;
          }
        } else {
          // 部分平仓
          position.contracts -= closedContracts;
          position.marginUsed = position.contracts * contract.initialMargin;
          position.unrealizedPnL = this.calculatePnL(
            position.position,
            position.entryPrice,
            fillPrice,
            position.contracts,
            contract,
          );
        }
      }
    } else {
      // 新开仓
      const requiredMargin = order.contracts * contract.initialMargin;
      if (world.companies.cash[order.companyId] < requiredMargin) {
        order.status = 'cancelled';
        return false;
      }

      world.companies.cash[order.companyId] -= requiredMargin;
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
        marginUsed: requiredMargin,
        isOpen: true,
      };
      
      this.positions.set(positionId, position);
      
      if (!this.positionsByCompany.has(order.companyId)) {
        this.positionsByCompany.set(order.companyId, new Set());
      }
      this.positionsByCompany.get(order.companyId)!.add(positionId);
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
  updatePositionsPnL(world: GameWorld, currentPrices: Map<number, number>): void {
    for (const [, position] of this.positions) {
      if (!position.isOpen) continue;
      
      const contract = this.contracts.get(position.contractId);
      if (!contract) continue;
      
      const currentPrice = currentPrices.get(contract.goodsId) ?? contract.settlementPrice;
      this.markPositionToPrice(world, position, currentPrice, contract);
    }
  }
  
  /**
   * 处理合约到期
   */
  handleExpiry(world: GameWorld, currentTick: number, spotPrices: Map<number, number>): number {
    let expiredContracts = 0;

    for (const [contractId, contract] of this.contracts) {
      if (currentTick >= contract.expiryTick) {
        // 结算所有持仓
        for (const [, position] of this.positions) {
          if (position.contractId === contractId && position.isOpen) {
            const spotPrice = spotPrices.get(contract.goodsId) ?? contract.settlementPrice;
            this.closePositionAtPrice(world, position, spotPrice, currentTick);
          }
        }
        
        // 移除到期合约
        this.contracts.delete(contractId);
        this.contractsByGoods.get(contract.goodsId)?.delete(contractId);
        expiredContracts++;
      }
    }

    return expiredContracts;
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
    let maintenanceRequirement = 0;
    let reservedMargin = 0;
    
    for (const position of positions) {
      const contract = this.contracts.get(position.contractId);
      if (!contract) continue;

      maintenanceRequirement += position.contracts * contract.maintenanceMargin;
      reservedMargin += position.marginUsed;
    }
    
    const equityAvailable = currentCash + reservedMargin;
    const isMarginCall = equityAvailable < maintenanceRequirement;
    const shortfall = Math.max(0, maintenanceRequirement - equityAvailable);
    
    return { isMarginCall, shortfall };
  }

  forceLiquidateCompany(
    world: GameWorld,
    companyId: number,
    currentPrices: Map<number, number>,
    currentTick: number,
  ): number {
    const positions = this.getCompanyPositions(companyId);
    let liquidatedPositions = 0;

    for (const position of positions) {
      const contract = this.contracts.get(position.contractId);
      if (!contract) {
        continue;
      }

      const currentPrice = currentPrices.get(contract.goodsId) ?? contract.settlementPrice;
      const openContracts = position.contracts;
      this.closePositionAtPrice(world, position, currentPrice, currentTick);
      contract.openInterest = Math.max(0, contract.openInterest - openContracts);
      liquidatedPositions++;
    }

    return liquidatedPositions;
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
