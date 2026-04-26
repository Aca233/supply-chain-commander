/**
 * 长期供应合同系统
 * 允许公司签订长期供货/采购协议
 */

import { TICKS_PER_DAY } from '@/core/constants';

// ==================== 类型定义 ====================

/**
 * 合同类型
 */
export enum ContractRole {
  SUPPLIER = 'supplier',     // 作为供应商
  BUYER = 'buyer',           // 作为采购方
}

/**
 * 合同状态
 */
export enum ContractStatus {
  NEGOTIATING = 'negotiating',   // 谈判中
  ACTIVE = 'active',             // 生效中
  COMPLETED = 'completed',       // 已完成
  BREACHED = 'breached',         // 违约
  CANCELLED = 'cancelled',       // 取消
  EXPIRED = 'expired',           // 过期
}

/**
 * 价格模式
 */
export enum PricingMode {
  FIXED = 'fixed',               // 固定价格
  MARKET_LINKED = 'market',      // 市场联动
  COST_PLUS = 'cost_plus',       // 成本加成
  INDEXED = 'indexed',           // 指数联动
}

/**
 * 供应合同
 */
export interface SupplyContract {
  id: number;
  
  // 合同双方
  supplierId: number;
  buyerId: number;
  myRole: ContractRole;
  counterpartyName: string;
  
  // 商品
  goodsId: number;
  
  // 数量条款
  quantityPerPeriod: number;     // 每期数量
  periodDays: number;            // 周期天数
  totalPeriods: number;          // 总周期数
  minQuantity: number;           // 最小采购量
  maxQuantity: number;           // 最大采购量
  
  // 价格条款
  pricingMode: PricingMode;
  agreedPrice: number;           // 约定价格
  priceFloor?: number;           // 价格下限
  priceCeiling?: number;         // 价格上限
  priceAdjustmentRate?: number;  // 价格调整系数
  
  // 时间
  startTick: number;
  endTick: number;
  negotiationDeadline?: number;
  
  // 状态
  status: ContractStatus;
  currentPeriod: number;
  
  // 履行记录
  totalDelivered: number;
  totalValue: number;
  missedDeliveries: number;
  
  // 违约条款
  penaltyRate: number;           // 违约金比例
  gracePeriodDays: number;       // 宽限期
  
  // 保证金
  depositAmount: number;
  depositPaid: boolean;
  
  // 评价
  performanceRating: number;     // 履约评分 0-100
}

/**
 * 交付记录
 */
export interface DeliveryRecord {
  contractId: number;
  period: number;
  scheduledTick: number;
  actualTick?: number;
  quantity: number;
  actualQuantity: number;
  price: number;
  value: number;
  status: 'scheduled' | 'delivered' | 'missed' | 'partial';
  penalty?: number;
}

/**
 * 合同执行结果
 */
export interface ContractExecution {
  contractId: number;
  period: number;
  supplierId: number;
  buyerId: number;
  goodsId: number;
  quantity: number;
  value: number;
  penalty: number;
  success: boolean;
}

/**
 * 合同提案
 */
export interface ContractProposal {
  id: number;
  proposerId: number;
  targetId: number;
  role: ContractRole;
  goodsId: number;
  
  // 条款
  quantityPerPeriod: number;
  periodDays: number;
  totalPeriods: number;
  pricingMode: PricingMode;
  proposedPrice: number;
  penaltyRate: number;
  depositAmount: number;
  
  // 状态
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  createdTick: number;
  expiryTick: number;
  
  // 谈判
  counterProposal?: Partial<ContractProposal>;
  negotiationRound: number;
}

// ==================== 合同管理器 ====================

export class SupplyContractManager {
  private contracts: Map<number, SupplyContract> = new Map();
  private proposals: Map<number, ContractProposal> = new Map();
  private deliveries: Map<number, DeliveryRecord[]> = new Map();
  
  private nextContractId: number = 1;
  private nextProposalId: number = 1;
  
  private contractsByCompany: Map<number, Set<number>> = new Map();
  
  /**
   * 创建合同提案
   */
  createProposal(
    proposerId: number,
    targetId: number,
    role: ContractRole,
    goodsId: number,
    quantityPerPeriod: number,
    periodDays: number,
    totalPeriods: number,
    proposedPrice: number,
    currentTick: number
  ): ContractProposal {
    const proposalId = this.nextProposalId++;
    
    const proposal: ContractProposal = {
      id: proposalId,
      proposerId,
      targetId,
      role,
      goodsId,
      quantityPerPeriod,
      periodDays,
      totalPeriods,
      pricingMode: PricingMode.FIXED,
      proposedPrice,
      penaltyRate: 0.1,
      depositAmount: proposedPrice * quantityPerPeriod * 0.1,
      status: 'pending',
      createdTick: currentTick,
      expiryTick: currentTick + 7 * TICKS_PER_DAY,
      negotiationRound: 1,
    };
    
    this.proposals.set(proposalId, proposal);
    return proposal;
  }
  
  /**
   * 接受提案，创建合同
   */
  acceptProposal(proposalId: number, currentTick: number): SupplyContract | null {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') return null;
    
    const contractId = this.nextContractId++;
    
    // 确定供应商和采购方
    const supplierId = proposal.role === ContractRole.SUPPLIER ? proposal.proposerId : proposal.targetId;
    const buyerId = proposal.role === ContractRole.BUYER ? proposal.proposerId : proposal.targetId;
    
    const contract: SupplyContract = {
      id: contractId,
      supplierId,
      buyerId,
      myRole: proposal.role,
      counterpartyName: `公司#${proposal.role === ContractRole.SUPPLIER ? proposal.targetId : proposal.proposerId}`,
      goodsId: proposal.goodsId,
      quantityPerPeriod: proposal.quantityPerPeriod,
      periodDays: proposal.periodDays,
      totalPeriods: proposal.totalPeriods,
      minQuantity: proposal.quantityPerPeriod * 0.8,
      maxQuantity: proposal.quantityPerPeriod * 1.2,
      pricingMode: proposal.pricingMode,
      agreedPrice: proposal.proposedPrice,
      startTick: currentTick,
      endTick: currentTick + proposal.periodDays * proposal.totalPeriods * TICKS_PER_DAY,
      status: ContractStatus.ACTIVE,
      currentPeriod: 0,
      totalDelivered: 0,
      totalValue: 0,
      missedDeliveries: 0,
      penaltyRate: proposal.penaltyRate,
      gracePeriodDays: 3,
      depositAmount: proposal.depositAmount,
      depositPaid: false,
      performanceRating: 100,
    };
    
    this.contracts.set(contractId, contract);
    
    // 添加到公司索引
    this.addToCompanyIndex(supplierId, contractId);
    this.addToCompanyIndex(buyerId, contractId);
    
    // 初始化交付记录
    this.initializeDeliveries(contract);
    
    // 更新提案状态
    proposal.status = 'accepted';
    
    return contract;
  }
  
  /**
   * 初始化交付计划
   */
  private initializeDeliveries(contract: SupplyContract): void {
    const records: DeliveryRecord[] = [];
    
    for (let period = 0; period < contract.totalPeriods; period++) {
      const scheduledTick = contract.startTick + (period + 1) * contract.periodDays * TICKS_PER_DAY;
      
      records.push({
        contractId: contract.id,
        period,
        scheduledTick,
        quantity: contract.quantityPerPeriod,
        actualQuantity: 0,
        price: contract.agreedPrice,
        value: contract.quantityPerPeriod * contract.agreedPrice,
        status: 'scheduled',
      });
    }
    
    this.deliveries.set(contract.id, records);
  }
  
  /**
   * 添加到公司索引
   */
  private addToCompanyIndex(companyId: number, contractId: number): void {
    if (!this.contractsByCompany.has(companyId)) {
      this.contractsByCompany.set(companyId, new Set());
    }
    this.contractsByCompany.get(companyId)!.add(contractId);
  }
  
  /**
   * 执行交付
   */
  executeDelivery(
    contractId: number,
    quantity: number,
    currentTick: number,
    currentMarketPrice: number
  ): { success: boolean; value: number; penalty: number; reason?: string } {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.status !== ContractStatus.ACTIVE) {
      return { success: false, value: 0, penalty: 0, reason: '合同不存在或未生效' };
    }
    
    const records = this.deliveries.get(contractId);
    if (!records) {
      return { success: false, value: 0, penalty: 0, reason: '无交付记录' };
    }
    
    // 找到当前期次
    const currentRecord = records.find(r => 
      r.status === 'scheduled' && currentTick >= r.scheduledTick - contract.gracePeriodDays * TICKS_PER_DAY
    );
    
    if (!currentRecord) {
      return { success: false, value: 0, penalty: 0, reason: '无待交付期次' };
    }
    
    // 计算实际价格
    let price = contract.agreedPrice;
    if (contract.pricingMode === PricingMode.MARKET_LINKED) {
      price = currentMarketPrice;
      if (contract.priceFloor) price = Math.max(price, contract.priceFloor);
      if (contract.priceCeiling) price = Math.min(price, contract.priceCeiling);
    }
    
    // 计算价值
    const value = quantity * price;
    
    // 检查是否达到最小量
    let penalty = 0;
    if (quantity < contract.minQuantity) {
      const shortfall = contract.minQuantity - quantity;
      penalty = shortfall * price * contract.penaltyRate;
      currentRecord.status = 'partial';
    } else {
      currentRecord.status = 'delivered';
    }
    
    currentRecord.actualTick = currentTick;
    currentRecord.actualQuantity = quantity;
    currentRecord.price = price;
    currentRecord.value = value;
    currentRecord.penalty = penalty;
    
    // 更新合同统计
    contract.totalDelivered += quantity;
    contract.totalValue += value;
    contract.currentPeriod++;
    
    // 更新履约评分
    const fulfillmentRate = quantity / contract.quantityPerPeriod;
    contract.performanceRating = contract.performanceRating * 0.9 + fulfillmentRate * 100 * 0.1;
    
    // 检查合同完成
    if (contract.currentPeriod >= contract.totalPeriods) {
      contract.status = ContractStatus.COMPLETED;
    }
    
    return { success: true, value, penalty };
  }
  
  /**
   * 处理逾期交付
   */
  processOverdueDeliveries(currentTick: number): { contractId: number; penalty: number }[] {
    const penalties: { contractId: number; penalty: number }[] = [];
    
    for (const [contractId, records] of this.deliveries) {
      const contract = this.contracts.get(contractId);
      if (!contract || contract.status !== ContractStatus.ACTIVE) continue;
      
      for (const record of records) {
        if (record.status !== 'scheduled') continue;
        
        const overdueThreshold = record.scheduledTick + contract.gracePeriodDays * TICKS_PER_DAY;
        
        if (currentTick > overdueThreshold) {
          record.status = 'missed';
          record.penalty = record.value * contract.penaltyRate;
          
          contract.missedDeliveries++;
          contract.performanceRating = Math.max(0, contract.performanceRating - 20);
          
          penalties.push({ contractId, penalty: record.penalty });
          
          // 连续3次未交付视为违约
          if (contract.missedDeliveries >= 3) {
            contract.status = ContractStatus.BREACHED;
          }
        }
      }
    }
    
    return penalties;
  }
  
  /**
   * 处理合同执行（每tick调用）
   */
  processContracts(currentTick: number): ContractExecution[] {
    const executions: ContractExecution[] = [];
    
    for (const [contractId, contract] of this.contracts) {
      if (contract.status !== ContractStatus.ACTIVE) continue;
      
      const records = this.deliveries.get(contractId);
      if (!records) continue;
      
      // 检查是否到了交付时间
      for (const record of records) {
        if (record.status !== 'scheduled') continue;
        
        // 如果到达交付时间，自动执行（简化处理）
        if (currentTick >= record.scheduledTick) {
          // 自动执行交付
          const result = this.executeDelivery(contractId, record.quantity, currentTick, record.price);
          
          executions.push({
            contractId,
            period: record.period,
            supplierId: contract.supplierId,
            buyerId: contract.buyerId,
            goodsId: contract.goodsId,
            quantity: result.success ? record.quantity : 0,
            value: result.value,
            penalty: result.penalty,
            success: result.success,
          });
        }
      }
    }
    
    // 处理逾期交付
    this.processOverdueDeliveries(currentTick);
    
    return executions;
  }
  
  /**
   * 更新合同状态
   */
  updateContractStatus(currentTick: number): void {
    for (const [, contract] of this.contracts) {
      if (contract.status !== ContractStatus.ACTIVE) continue;
      
      // 检查是否过期
      if (currentTick >= contract.endTick) {
        if (contract.currentPeriod >= contract.totalPeriods) {
          contract.status = ContractStatus.COMPLETED;
        } else {
          contract.status = ContractStatus.EXPIRED;
        }
      }
    }
  }
  
  /**
   * 获取公司的合同
   */
  getCompanyContracts(companyId: number, activeOnly: boolean = false): SupplyContract[] {
    const contractIds = this.contractsByCompany.get(companyId);
    if (!contractIds) return [];
    
    return Array.from(contractIds)
      .map(id => this.contracts.get(id))
      .filter((c): c is SupplyContract => {
        if (!c) return false;
        if (activeOnly && c.status !== ContractStatus.ACTIVE) return false;
        return true;
      });
  }
  
  /**
   * 获取合同交付记录
   */
  getContractDeliveries(contractId: number): DeliveryRecord[] {
    return this.deliveries.get(contractId) ?? [];
  }
  
  /**
   * 获取即将到期的交付
   */
  getUpcomingDeliveries(companyId: number, daysAhead: number = 7, currentTick: number): DeliveryRecord[] {
    const upcoming: DeliveryRecord[] = [];
    const contracts = this.getCompanyContracts(companyId, true);
    
    for (const contract of contracts) {
      const records = this.deliveries.get(contract.id);
      if (!records) continue;
      
      for (const record of records) {
        if (record.status !== 'scheduled') continue;
        if (record.scheduledTick - currentTick <= daysAhead * TICKS_PER_DAY) {
          upcoming.push(record);
        }
      }
    }
    
    return upcoming.sort((a, b) => a.scheduledTick - b.scheduledTick);
  }
  
  /**
   * 计算合同预期收益/成本
   */
  calculateContractValue(contract: SupplyContract): {
    totalExpectedValue: number;
    remainingValue: number;
    averagePrice: number;
  } {
    const remainingPeriods = contract.totalPeriods - contract.currentPeriod;
    const remainingValue = remainingPeriods * contract.quantityPerPeriod * contract.agreedPrice;
    const totalExpectedValue = contract.totalPeriods * contract.quantityPerPeriod * contract.agreedPrice;
    const averagePrice = contract.currentPeriod > 0 
      ? contract.totalValue / contract.totalDelivered 
      : contract.agreedPrice;
    
    return { totalExpectedValue, remainingValue, averagePrice };
  }
  
  /**
   * 终止合同
   */
  terminateContract(contractId: number, reason: 'mutual' | 'breach' | 'force_majeure', currentTick: number): {
    success: boolean;
    penalty: number;
    depositReturned: number;
  } {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return { success: false, penalty: 0, depositReturned: 0 };
    }
    
    let penalty = 0;
    let depositReturned = 0;
    
    switch (reason) {
      case 'mutual':
        // 协商终止，无违约金，退还保证金
        contract.status = ContractStatus.CANCELLED;
        depositReturned = contract.depositAmount;
        break;
        
      case 'breach':
        // 违约终止，扣除保证金
        contract.status = ContractStatus.BREACHED;
        penalty = contract.depositAmount;
        break;
        
      case 'force_majeure':
        // 不可抗力，退还部分保证金
        contract.status = ContractStatus.CANCELLED;
        depositReturned = contract.depositAmount * 0.5;
        break;
    }
    
    return { success: true, penalty, depositReturned };
  }
}

// ==================== 单例实例 ====================

export const supplyContractManager = new SupplyContractManager();

// ==================== 工具函数 ====================

/**
 * 获取合同状态名称
 */
export function getContractStatusName(status: ContractStatus): string {
  const names: Record<ContractStatus, string> = {
    [ContractStatus.NEGOTIATING]: '谈判中',
    [ContractStatus.ACTIVE]: '生效中',
    [ContractStatus.COMPLETED]: '已完成',
    [ContractStatus.BREACHED]: '已违约',
    [ContractStatus.CANCELLED]: '已取消',
    [ContractStatus.EXPIRED]: '已过期',
  };
  return names[status];
}

/**
 * 获取定价模式名称
 */
export function getPricingModeName(mode: PricingMode): string {
  const names: Record<PricingMode, string> = {
    [PricingMode.FIXED]: '固定价格',
    [PricingMode.MARKET_LINKED]: '市场联动',
    [PricingMode.COST_PLUS]: '成本加成',
    [PricingMode.INDEXED]: '指数联动',
  };
  return names[mode];
}

/**
 * 格式化合同摘要
 */
export function formatContractSummary(contract: SupplyContract): string {
  const role = contract.myRole === ContractRole.SUPPLIER ? '供应' : '采购';
  const status = getContractStatusName(contract.status);
  return `${role}合同 #${contract.id} - ${contract.quantityPerPeriod}单位/${contract.periodDays}天 × ${contract.totalPeriods}期 @ ¥${contract.agreedPrice} [${status}]`;
}
