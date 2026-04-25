/**
 * 银行信贷系统
 * 实现贷款、信用评级、债务管理
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '@/core/constants';

/**
 * 贷款类型
 */
export type LoanType = 'short_term' | 'medium_term' | 'long_term' | 'credit_line';

/**
 * 贷款状态
 */
export type LoanStatus = 'active' | 'paid' | 'defaulted' | 'restructured';

/**
 * 信用评级
 */
export type CreditRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';

/**
 * 贷款记录
 */
export interface Loan {
  id: number;
  borrowerId: number;            // 借款公司ID
  type: LoanType;
  
  // 金额
  principal: number;             // 本金
  remainingPrincipal: number;    // 剩余本金
  interestRate: number;          // 年利率
  
  // 期限
  termTicks: number;             // 贷款期限（tick）
  startTick: number;             // 起始时间
  maturityTick: number;          // 到期时间
  
  // 还款
  repaymentSchedule: 'bullet' | 'amortizing' | 'interest_only';
  nextPaymentTick: number;
  monthlyPayment: number;
  
  // 担保
  collateral: number;            // 抵押物价值
  collateralType: 'inventory' | 'building' | 'stock' | 'none';
  
  // 状态
  status: LoanStatus;
  missedPayments: number;
  totalInterestPaid: number;
}

/**
 * 信用档案
 */
export interface CreditProfile {
  companyId: number;
  rating: CreditRating;
  score: number;                 // 0-1000
  
  // 历史记录
  totalLoansHistory: number;
  totalRepaidOnTime: number;
  totalDefaulted: number;
  
  // 当前债务
  currentLoans: number[];        // 活跃贷款ID
  totalDebt: number;
  debtToEquityRatio: number;
  interestCoverageRatio: number;
  
  // 信用额度
  availableCredit: number;
  maxCreditLine: number;
  
  // 最近评估
  lastAssessmentTick: number;
}

/**
 * 银行系统状态
 */
interface BankingState {
  loans: Map<number, Loan>;
  creditProfiles: Map<number, CreditProfile>;
  nextLoanId: number;
  
  // 银行配置
  baseInterestRate: number;      // 基准利率
  reserveRate: number;           // 存款准备金率
  totalDeposits: number;         // 总存款
  totalLoansOutstanding: number; // 未偿贷款总额
}

// 全局银行状态
let bankingState: BankingState = {
  loans: new Map(),
  creditProfiles: new Map(),
  nextLoanId: 1,
  baseInterestRate: 0.05,        // 5%基准利率
  reserveRate: 0.1,
  totalDeposits: 100000000,      // 1亿初始存款
  totalLoansOutstanding: 0,
};

/**
 * 初始化银行系统
 */
export function initializeBankingSystem(world: GameWorld): void {
  bankingState = {
    loans: new Map(),
    creditProfiles: new Map(),
    nextLoanId: 1,
    baseInterestRate: world.economyStats.interestRate,
    reserveRate: 0.1,
    totalDeposits: 100000000,
    totalLoansOutstanding: 0,
  };
  
  // 为每个公司创建信用档案
  for (let i = 0; i < world.companies.count; i++) {
    const profile = createCreditProfile(world, i);
    bankingState.creditProfiles.set(i, profile);
  }
}

/**
 * 创建信用档案
 */
function createCreditProfile(world: GameWorld, companyId: number): CreditProfile {
  const { score, rating } = assessCreditworthiness(world, companyId);
  
  // 计算信用额度（基于资产）
  const cash = world.companies.cash[companyId];
  let assets = cash;
  for (let i = 0; i < GOODS_COUNT; i++) {
    assets += world.companies.inventories[companyId * GOODS_COUNT + i] * world.goods.prices[i];
  }
  
  const maxCreditLine = assets * getCreditMultiplier(rating);
  
  return {
    companyId,
    rating,
    score,
    totalLoansHistory: 0,
    totalRepaidOnTime: 0,
    totalDefaulted: 0,
    currentLoans: [],
    totalDebt: 0,
    debtToEquityRatio: 0,
    interestCoverageRatio: 10,
    availableCredit: maxCreditLine,
    maxCreditLine,
    lastAssessmentTick: world.tick,
  };
}

/**
 * 评估信用等级
 */
function assessCreditworthiness(world: GameWorld, companyId: number): {
  score: number;
  rating: CreditRating;
} {
  let score = 500; // 基础分
  
  const cash = world.companies.cash[companyId];
  const profile = bankingState.creditProfiles.get(companyId);
  
  // 现金充裕度（+/-100分）
  if (cash > 5000000) score += 100;
  else if (cash > 1000000) score += 50;
  else if (cash < 100000) score -= 100;
  
  // 资产规模（+/-100分）
  let totalAssets = cash;
  for (let i = 0; i < GOODS_COUNT; i++) {
    totalAssets += world.companies.inventories[companyId * GOODS_COUNT + i] * world.goods.prices[i];
  }
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      totalAssets += 500000;
    }
  }
  
  if (totalAssets > 10000000) score += 100;
  else if (totalAssets > 5000000) score += 50;
  else if (totalAssets < 500000) score -= 50;
  
  // 历史记录（+/-200分）
  if (profile) {
    if (profile.totalLoansHistory > 0) {
      const repaymentRate = profile.totalRepaidOnTime / profile.totalLoansHistory;
      score += Math.round(repaymentRate * 150);
    }
    if (profile.totalDefaulted > 0) {
      score -= profile.totalDefaulted * 100;
    }
    
    // 债务比率（+/-100分）
    if (profile.debtToEquityRatio < 0.3) score += 50;
    else if (profile.debtToEquityRatio > 1) score -= 50;
    else if (profile.debtToEquityRatio > 2) score -= 100;
  }
  
  // 限制范围
  score = Math.max(100, Math.min(900, score));
  
  // 转换为评级
  let rating: CreditRating;
  if (score >= 800) rating = 'AAA';
  else if (score >= 700) rating = 'AA';
  else if (score >= 600) rating = 'A';
  else if (score >= 500) rating = 'BBB';
  else if (score >= 400) rating = 'BB';
  else if (score >= 300) rating = 'B';
  else if (score >= 200) rating = 'CCC';
  else rating = 'D';
  
  return { score, rating };
}

/**
 * 获取信用倍数
 */
function getCreditMultiplier(rating: CreditRating): number {
  const multipliers: Record<CreditRating, number> = {
    'AAA': 3.0,
    'AA': 2.5,
    'A': 2.0,
    'BBB': 1.5,
    'BB': 1.0,
    'B': 0.7,
    'CCC': 0.4,
    'D': 0,
  };
  return multipliers[rating];
}

/**
 * 获取贷款利率
 */
function getLoanInterestRate(
  rating: CreditRating,
  loanType: LoanType,
  collateralRatio: number
): number {
  const baseRate = bankingState.baseInterestRate;
  
  // 信用评级溢价
  const ratingSpread: Record<CreditRating, number> = {
    'AAA': 0.005,
    'AA': 0.01,
    'A': 0.015,
    'BBB': 0.025,
    'BB': 0.04,
    'B': 0.06,
    'CCC': 0.1,
    'D': 0.2,
  };
  
  // 贷款期限溢价
  const termSpread: Record<LoanType, number> = {
    'credit_line': 0.01,
    'short_term': 0.005,
    'medium_term': 0.015,
    'long_term': 0.025,
  };
  
  // 抵押品折扣
  const collateralDiscount = Math.min(0.02, collateralRatio * 0.03);
  
  const rate = baseRate + ratingSpread[rating] + termSpread[loanType] - collateralDiscount;
  
  return Math.max(0.02, rate); // 最低2%
}

/**
 * 申请贷款
 */
export function applyForLoan(
  world: GameWorld,
  borrowerId: number,
  amount: number,
  loanType: LoanType,
  collateralType: 'inventory' | 'building' | 'stock' | 'none' = 'none'
): { approved: boolean; loanId?: number; reason?: string } {
  const profile = bankingState.creditProfiles.get(borrowerId);
  if (!profile) {
    return { approved: false, reason: '无信用记录' };
  }
  
  // 检查信用评级
  if (profile.rating === 'D') {
    return { approved: false, reason: '信用评级过低' };
  }
  
  // 检查可用信用额度
  if (amount > profile.availableCredit) {
    return { approved: false, reason: `超出信用额度（可用：¥${profile.availableCredit.toFixed(0)}）` };
  }
  
  // 检查债务比率
  const equity = calculateEquity(world, borrowerId);
  const newDebtRatio = (profile.totalDebt + amount) / equity;
  if (newDebtRatio > 3) {
    return { approved: false, reason: '债务比率过高' };
  }
  
  // 计算抵押物价值
  let collateralValue = 0;
  if (collateralType === 'inventory') {
    for (let i = 0; i < GOODS_COUNT; i++) {
      collateralValue += world.companies.inventories[borrowerId * GOODS_COUNT + i] * 
                         world.goods.prices[i] * 0.7; // 70%折扣
    }
  } else if (collateralType === 'building') {
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === borrowerId) {
        collateralValue += 350000; // 70%折扣
      }
    }
  }
  
  const collateralRatio = collateralValue / amount;
  
  // 计算利率
  const interestRate = getLoanInterestRate(profile.rating, loanType, collateralRatio);
  
  // 确定期限
  const termTicks = getLoanTerm(loanType);
  
  // 计算月供
  const monthlyPayment = calculateMonthlyPayment(amount, interestRate, termTicks);
  
  // 创建贷款
  const loan: Loan = {
    id: bankingState.nextLoanId++,
    borrowerId,
    type: loanType,
    principal: amount,
    remainingPrincipal: amount,
    interestRate,
    termTicks,
    startTick: world.tick,
    maturityTick: world.tick + termTicks,
    repaymentSchedule: loanType === 'short_term' ? 'bullet' : 'amortizing',
    nextPaymentTick: world.tick + TICKS_PER_MONTH,
    monthlyPayment,
    collateral: collateralValue,
    collateralType,
    status: 'active',
    missedPayments: 0,
    totalInterestPaid: 0,
  };
  
  bankingState.loans.set(loan.id, loan);
  
  // 更新信用档案
  profile.currentLoans.push(loan.id);
  profile.totalDebt += amount;
  profile.availableCredit -= amount;
  profile.totalLoansHistory++;
  
  // 发放贷款
  world.companies.cash[borrowerId] += amount;
  bankingState.totalLoansOutstanding += amount;
  
  return { approved: true, loanId: loan.id };
}

/**
 * 获取贷款期限
 */
function getLoanTerm(loanType: LoanType): number {
  const terms: Record<LoanType, number> = {
    'credit_line': 360 * TICKS_PER_DAY,
    'short_term': 90 * TICKS_PER_DAY,
    'medium_term': 360 * TICKS_PER_DAY,
    'long_term': 3 * TICKS_PER_YEAR,
  };
  return terms[loanType];
}

/**
 * 计算月供（等额本息）
 */
function calculateMonthlyPayment(principal: number, annualRate: number, termTicks: number): number {
  const months = termTicks / TICKS_PER_MONTH;
  const monthlyRate = annualRate / 12;
  
  if (monthlyRate === 0) return principal / months;
  
  const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / 
                  (Math.pow(1 + monthlyRate, months) - 1);
  
  return payment;
}

/**
 * 计算权益
 */
function calculateEquity(world: GameWorld, companyId: number): number {
  let assets = world.companies.cash[companyId];
  
  for (let i = 0; i < GOODS_COUNT; i++) {
    assets += world.companies.inventories[companyId * GOODS_COUNT + i] * world.goods.prices[i];
  }
  
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      assets += 500000;
    }
  }
  
  const profile = bankingState.creditProfiles.get(companyId);
  const liabilities = profile?.totalDebt || 0;
  
  return Math.max(1, assets - liabilities);
}

/**
 * 还款
 */
export function makePayment(
  world: GameWorld,
  loanId: number,
  amount?: number
): { success: boolean; reason?: string } {
  const loan = bankingState.loans.get(loanId);
  if (!loan) {
    return { success: false, reason: '贷款不存在' };
  }
  
  if (loan.status !== 'active') {
    return { success: false, reason: '贷款已结清或违约' };
  }
  
  const paymentAmount = amount || loan.monthlyPayment;
  
  if (world.companies.cash[loan.borrowerId] < paymentAmount) {
    return { success: false, reason: '现金不足' };
  }
  
  // 扣款
  world.companies.cash[loan.borrowerId] -= paymentAmount;
  
  // 分配到本金和利息
  const interestPortion = loan.remainingPrincipal * (loan.interestRate / 12);
  const principalPortion = paymentAmount - interestPortion;
  
  loan.remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPortion);
  loan.totalInterestPaid += interestPortion;
  loan.nextPaymentTick += TICKS_PER_MONTH;
  
  // 更新银行总额
  bankingState.totalLoansOutstanding -= principalPortion;
  
  // 检查是否还清
  if (loan.remainingPrincipal <= 0) {
    loan.status = 'paid';
    loan.remainingPrincipal = 0;
    
    // 更新信用档案
    const profile = bankingState.creditProfiles.get(loan.borrowerId);
    if (profile) {
      profile.currentLoans = profile.currentLoans.filter(id => id !== loanId);
      profile.totalDebt -= loan.principal;
      profile.availableCredit += loan.principal;
      profile.totalRepaidOnTime++;
    }
  }
  
  return { success: true };
}

/**
 * 提前还款
 */
export function prepayLoan(
  world: GameWorld,
  loanId: number
): { success: boolean; penalty?: number; reason?: string } {
  const loan = bankingState.loans.get(loanId);
  if (!loan) {
    return { success: false, reason: '贷款不存在' };
  }
  
  // 提前还款罚金（剩余期限的利息的10%）
  const remainingMonths = (loan.maturityTick - world.tick) / TICKS_PER_MONTH;
  const penaltyRate = 0.1;
  const penalty = loan.remainingPrincipal * (loan.interestRate / 12) * remainingMonths * penaltyRate;
  
  const totalPayment = loan.remainingPrincipal + penalty;
  
  if (world.companies.cash[loan.borrowerId] < totalPayment) {
    return { success: false, reason: '现金不足' };
  }
  
  // 扣款
  world.companies.cash[loan.borrowerId] -= totalPayment;
  
  // 结清贷款
  bankingState.totalLoansOutstanding -= loan.remainingPrincipal;
  loan.remainingPrincipal = 0;
  loan.status = 'paid';
  
  // 更新信用档案
  const profile = bankingState.creditProfiles.get(loan.borrowerId);
  if (profile) {
    profile.currentLoans = profile.currentLoans.filter(id => id !== loanId);
    profile.totalDebt -= loan.principal;
    profile.availableCredit += loan.principal;
    profile.totalRepaidOnTime++;
  }
  
  return { success: true, penalty };
}

/**
 * 处理逾期
 */
function processOverdueLoans(world: GameWorld): void {
  for (const [loanId, loan] of bankingState.loans) {
    if (loan.status !== 'active') continue;
    
    if (world.tick > loan.nextPaymentTick + TICKS_PER_MONTH) {
      loan.missedPayments++;
      
      if (loan.missedPayments >= 3) {
        // 违约
        loan.status = 'defaulted';
        
        // 更新信用档案
        const profile = bankingState.creditProfiles.get(loan.borrowerId);
        if (profile) {
          profile.totalDefaulted++;
          profile.currentLoans = profile.currentLoans.filter(id => id !== loanId);
          profile.availableCredit = 0; // 冻结信用额度
          
          // 重新评估信用
          const { score, rating } = assessCreditworthiness(world, loan.borrowerId);
          profile.score = score;
          profile.rating = rating;
        }
        
        // TODO: 处理抵押物清算
      } else {
        // 加收滞纳金
        loan.remainingPrincipal *= 1.02; // 2%滞纳金
      }
    }
  }
}

/**
 * 更新银行系统
 */
export function updateBankingSystem(world: GameWorld): void {
  // 更新基准利率
  bankingState.baseInterestRate = world.economyStats.interestRate;
  
  // 处理逾期贷款
  processOverdueLoans(world);
  
  // 定期重新评估信用（每30天）
  if (world.tick % TICKS_PER_MONTH === 0) {
    for (const [companyId, profile] of bankingState.creditProfiles) {
      const { score, rating } = assessCreditworthiness(world, companyId);
      profile.score = score;
      profile.rating = rating;
      profile.lastAssessmentTick = world.tick;
      
      // 重新计算信用额度
      const equity = calculateEquity(world, companyId);
      profile.maxCreditLine = equity * getCreditMultiplier(rating);
      profile.availableCredit = profile.maxCreditLine - profile.totalDebt;
      profile.debtToEquityRatio = profile.totalDebt / equity;
    }
  }
  
  // 自动处理到期贷款的月供
  for (const [loanId, loan] of bankingState.loans) {
    if (loan.status === 'active' && world.tick >= loan.nextPaymentTick) {
      // 尝试自动还款
      makePayment(world, loanId);
    }
  }
}

/**
 * 获取贷款信息
 */
export function getLoan(loanId: number): Loan | null {
  return bankingState.loans.get(loanId) || null;
}

/**
 * 获取公司的所有贷款
 */
export function getCompanyLoans(companyId: number): Loan[] {
  const loans: Loan[] = [];
  for (const [_, loan] of bankingState.loans) {
    if (loan.borrowerId === companyId) {
      loans.push(loan);
    }
  }
  return loans;
}

/**
 * 获取信用档案
 */
export function getCreditProfile(companyId: number): CreditProfile | null {
  return bankingState.creditProfiles.get(companyId) || null;
}

/**
 * 获取银行状态
 */
export function getBankingState(): BankingState {
  return bankingState;
}

/**
 * 获取可用贷款方案
 */
export function getAvailableLoanOptions(
  world: GameWorld,
  companyId: number
): Array<{
  type: LoanType;
  name: string;
  maxAmount: number;
  interestRate: number;
  termDays: number;
  monthlyPayment: number;
}> {
  const profile = bankingState.creditProfiles.get(companyId);
  if (!profile || profile.rating === 'D') {
    return [];
  }
  
  const options: Array<{
    type: LoanType;
    name: string;
    maxAmount: number;
    interestRate: number;
    termDays: number;
    monthlyPayment: number;
  }> = [];
  
  const loanTypes: Array<{ type: LoanType; name: string }> = [
    { type: 'credit_line', name: '循环信用额度' },
    { type: 'short_term', name: '短期贷款' },
    { type: 'medium_term', name: '中期贷款' },
    { type: 'long_term', name: '长期贷款' },
  ];
  
  for (const { type, name } of loanTypes) {
    const interestRate = getLoanInterestRate(profile.rating, type, 0);
    const termTicks = getLoanTerm(type);
    const termDays = termTicks / TICKS_PER_DAY;
    const maxAmount = Math.min(profile.availableCredit, bankingState.totalDeposits * 0.1);
    
    if (maxAmount > 10000) {
      const monthlyPayment = calculateMonthlyPayment(maxAmount, interestRate, termTicks);
      
      options.push({
        type,
        name,
        maxAmount,
        interestRate,
        termDays,
        monthlyPayment,
      });
    }
  }
  
  return options;
}
