/**
 * Workers模块统一导出
 * 
 * 提供Web Worker多线程支持
 */

// 统一Worker门面 - 推荐使用
export {
  UnifiedWorkerFacade,
  getUnifiedWorkerFacade,
  initializeUnifiedWorkerFacade,
  destroyUnifiedWorkerFacade,
  type WorkerSystemStatus,
  type TaskPriority,
  type TaskType,
  type TaskResult,
} from './UnifiedWorkerFacade';

// Worker Pool - 并行任务处理
export {
  WorkerPool,
  getWorkerPool,
  initializeWorkerPool,
  destroyWorkerPool,
  type BatchTaskResult,
  type WorkerPoolConfig,
} from './WorkerPool';

// Economy Worker - 经济计算
export {
  WorkerManager,
  workerManager,
} from './WorkerManager';

// AI Worker - AI决策
export {
  AIWorkerManager,
  aiWorkerManager,
} from './AIWorkerManager';

// AI Worker类型
export type {
  AIWorkerMessage,
  AIWorkerResponse,
  AIDecisionRequest,
  AIDecisionResult,
  AIDecisionDTO,
  CompanyStateDTO,
  MarketStateDTO,
  AIBatchRequest,
  PriceTrendAnalysis,
  TradeSignal,
  FinancialAnalysis,
  InvestmentOpportunity,
} from './aiWorkerTypes';