/**
 * AI Worker 类型定义
 *
 * v4.0更新：recipeId字段改为outputModeId（但保持字段名以兼容Worker接口）
 *
 * 定义Worker与主线程之间传递的数据类型
 */

// ==================== 数据传输对象 (DTO) ====================

/**
 * 公司状态DTO
 * 将GameWorld中的公司数据序列化为可传输的格式
 */
export interface CompanyStateDTO {
  id: number;
  name: string;
  cash: number;
  totalAssets: number;
  totalLiabilities: number;
  
  // 库存信息 (goodsId -> quantity)
  inventories: Map<number, number>;
  
  // 建筑信息
  buildings: {
    id: number;
    typeId: number;
    recipeId: number;  // v4.0: 实际存储outputModeId，保持字段名以兼容
    isActive: boolean;
    efficiency: number;
    level: number;
  }[];
  
  // 订单信息
  activeOrders: {
    id: number;
    goodsId: number;
    isBuy: boolean;
    price: number;
    quantity: number;
    remainingQuantity: number;
  }[];
}

/**
 * 市场状态DTO
 */
export interface MarketStateDTO {
  tick: number;
  
  // 商品价格和需求
  goods: {
    id: number;
    name: string;
    price: number;
    basePrice: number;
    supply: number;
    demand: number;
    volatility: number;
  }[];
  
  // 经济状态
  economy: {
    gdp: number;
    inflation: number;
    interestRate: number;
    cyclePhase: string;
    cyclePosition: number;
  };
  
  // 价格趋势 (最近N个tick的价格)
  priceTrends: Map<number, number[]>;
}

/**
 * AI决策请求
 */
export interface AIDecisionRequest {
  requestId: number;
  companyId: number;
  tier: 'fast' | 'standard' | 'deep';
  company: CompanyStateDTO;
  market: MarketStateDTO;
  timestamp: number;
}

/**
 * AI决策DTO
 */
export interface AIDecisionDTO {
  type: 'buy' | 'sell' | 'build' | 'demolish' | 'upgrade' | 'adjust_price' | 'cancel_order';
  
  // 交易决策
  goodsId?: number;
  quantity?: number;
  price?: number;
  
  // 建造决策
  buildingTypeId?: number;
  recipeId?: number;  // v4.0: 实际存储outputModeId，保持字段名以兼容
  
  // 订单调整
  orderId?: number;
  newPrice?: number;
  
  // 优先级和置信度
  priority: number;
  confidence: number;
  reason: string;
}

/**
 * AI决策结果
 */
export interface AIDecisionResult {
  requestId: number;
  companyId: number;
  tier: 'fast' | 'standard' | 'deep';
  decisions: AIDecisionDTO[];
  computeTimeMs: number;
  success: boolean;
  error?: string;
}

// ==================== Worker消息类型 ====================

export type AIWorkerMessageType = 
  | 'AI_INIT'
  | 'AI_FAST_DECISION'
  | 'AI_STANDARD_DECISION'
  | 'AI_DEEP_DECISION'
  | 'AI_BATCH'
  | 'AI_UPDATE_MARKET'
  | 'AI_PING';

export interface AIWorkerMessage {
  type: AIWorkerMessageType;
  payload: any;
  id: number;
}

export interface AIWorkerResponse {
  type: AIWorkerMessageType;
  id: number;
  result: AIDecisionResult | AIDecisionResult[] | boolean | string | null;
  duration: number;
  success: boolean;
  error?: string;
}

// ==================== 批量处理类型 ====================

export interface AIBatchRequest {
  requests: AIDecisionRequest[];
  market: MarketStateDTO;
}

export interface AIBatchResponse {
  results: AIDecisionResult[];
  totalComputeTimeMs: number;
}

// ==================== 辅助类型 ====================

/**
 * 价格趋势分析结果
 */
export interface PriceTrendAnalysis {
  goodsId: number;
  trend: 'rising' | 'falling' | 'stable';
  momentum: number; // -1 to 1
  volatility: number;
  predictedPrice: number;
  confidence: number;
}

/**
 * 交易信号
 */
export interface TradeSignal {
  goodsId: number;
  action: 'buy' | 'sell' | 'hold';
  strength: number; // 0 to 1
  targetPrice: number;
  stopLoss?: number;
  takeProfit?: number;
}

/**
 * 公司财务分析
 */
export interface FinancialAnalysis {
  healthScore: number; // 0 to 1
  liquidityRatio: number;
  debtRatio: number;
  profitMargin: number;
  growthPotential: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 投资机会
 */
export interface InvestmentOpportunity {
  type: 'build' | 'expand' | 'diversify';
  buildingTypeId: number;
  recipeId: number;  // v4.0: 实际存储outputModeId，保持字段名以兼容
  expectedROI: number;
  paybackPeriod: number;
  riskScore: number;
  capitalRequired: number;
}