/**
 * 性能优化模块统一导出
 */

// 对象池
export {
  ObjectPool,
  TypedArrayPool,
  PooledOrder,
  PooledEvent,
  PooledTrade,
  PooledPricePoint,
  orderPool,
  eventPool,
  tradePool,
  pricePointPool,
  typedArrayPool,
  getAllPoolStats,
  tickAllPools,
  onGlobalMemoryPressure,
} from './ObjectPool';

export type { Poolable, PoolConfig } from './ObjectPool';

// 数组工具
export {
  getTempFloat32,
  getTempUint32,
  getTempIndices,
  sortFloat32Indices,
  sumFloat32,
  avgFloat32,
  maxFloat32,
  minFloat32,
  mulScalarInPlace,
  addScalarInPlace,
  clampInPlace,
  dotProduct,
  lowerBound,
  upperBound,
  movingSum,
  exponentialMovingAverage,
  fillSequence,
  copyTo,
  setIfTrue,
  histogram,
  compress,
  decompress,
  diff,
  cumsum,
} from './ArrayUtils';

// 内存管理
export {
  MemoryManager,
  memoryManager,
  trackMemory,
  batchProcess,
} from './MemoryManager';

export type { MemoryStats, MemoryPressureLevel } from './MemoryManager';

// 性能监控
export {
  PerformanceMonitor,
  perfMonitor,
  measurePerformance,
  trackPerformance,
} from './PerformanceMonitor';

export type {
  PerformanceMetric,
  FPSData,
  MemoryData,
  TickBreakdown,
  PoolStatsData,
  PerformanceSnapshot,
  TickPerformanceReport,
} from './PerformanceMonitor';

// 性能导出
export {
  PerformanceExporter,
  downloadPerformanceJSON,
  downloadPerformanceCSV,
} from './PerformanceExporter';

export type { ExportOptions } from './PerformanceExporter';

// 数据结构
export {
  RingBuffer,
  Float32RingBuffer,
  BuildingIndex,
  SparseInventoryIndex,
  TradeHistory,
  buildingIndex,
  inventoryIndex,
  tradeHistory,
  resetAllIndices,
} from './DataStructures';

export type { TradeRecord } from './DataStructures';