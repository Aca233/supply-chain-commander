/**
 * Worker池管理器
 * 管理多个Worker实例，支持并行任务分发
 */

import type { WorkerMessage, WorkerResponse } from './economyWorker';

/**
 * 任务状态
 */
interface PendingTask {
  id: number;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
  startTime: number;
}

/**
 * Worker状态
 */
interface WorkerState {
  worker: Worker;
  busy: boolean;
  taskCount: number;
  totalTime: number;
  errors: number;
}

/**
 * 批量任务结果
 */
export interface BatchTaskResult<T> {
  results: T[];
  totalTime: number;
  errors: string[];
}

/**
 * Worker池配置
 */
export interface WorkerPoolConfig {
  workerCount?: number;
  taskTimeout?: number;
  maxRetries?: number;
}

/**
 * Worker池类
 */
export class WorkerPool {
  private workers: WorkerState[] = [];
  private pendingTasks: Map<number, PendingTask> = new Map();
  private taskQueue: Array<{
    message: WorkerMessage;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];
  private nextTaskId = 0;
  private isInitialized = false;
  
  private config: Required<WorkerPoolConfig>;
  
  // 性能统计
  private stats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalTime: 0,
    avgTime: 0,
  };
  
  constructor(config: WorkerPoolConfig = {}) {
    const defaultWorkerCount = typeof navigator !== 'undefined'
      ? Math.max(1, navigator.hardwareConcurrency - 1)
      : 2;
    
    this.config = {
      workerCount: config.workerCount ?? defaultWorkerCount,
      taskTimeout: config.taskTimeout ?? 5000,
      maxRetries: config.maxRetries ?? 2,
    };
  }
  
  /**
   * 初始化Worker池
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported');
      return false;
    }
    
    try {
      for (let i = 0; i < this.config.workerCount; i++) {
        const worker = new Worker(
          new URL('./economyWorker.ts', import.meta.url),
          { type: 'module' }
        );
        
        const state: WorkerState = {
          worker,
          busy: false,
          taskCount: 0,
          totalTime: 0,
          errors: 0,
        };
        
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(i, e.data);
        };
        
        worker.onerror = (error: ErrorEvent) => {
          this.handleWorkerError(i, error);
        };
        
        this.workers.push(state);
      }
      
      this.isInitialized = true;
      console.log(`WorkerPool initialized with ${this.config.workerCount} workers`);
      return true;
    } catch (error) {
      console.error('Failed to initialize WorkerPool:', error);
      return false;
    }
  }
  
  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(workerIndex: number, response: WorkerResponse): void {
    const { id, result, duration } = response;
    
    const pending = this.pendingTasks.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingTasks.delete(id);
      
      // 更新统计
      this.stats.completedTasks++;
      this.stats.totalTime += duration;
      this.stats.avgTime = this.stats.totalTime / this.stats.completedTasks;
      
      // 更新Worker状态
      const workerState = this.workers[workerIndex];
      workerState.busy = false;
      workerState.taskCount++;
      workerState.totalTime += duration;
      
      // 完成任务
      pending.resolve(result);
      
      // 处理队列中的下一个任务
      this.processQueue();
    }
  }
  
  /**
   * 处理Worker错误
   */
  private handleWorkerError(workerIndex: number, error: ErrorEvent): void {
    console.error(`Worker ${workerIndex} error:`, error);
    
    const workerState = this.workers[workerIndex];
    workerState.busy = false;
    workerState.errors++;
    
    this.stats.failedTasks++;
    
    // 尝试重启Worker
    try {
      workerState.worker.terminate();
      workerState.worker = new Worker(
        new URL('./economyWorker.ts', import.meta.url),
        { type: 'module' }
      );
      workerState.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(workerIndex, e.data);
      };
      workerState.worker.onerror = (err: ErrorEvent) => {
        this.handleWorkerError(workerIndex, err);
      };
    } catch (e) {
      console.error(`Failed to restart Worker ${workerIndex}:`, e);
    }
    
    this.processQueue();
  }
  
  /**
   * 获取空闲的Worker
   */
  private getIdleWorker(): number {
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workers[i].busy) {
        return i;
      }
    }
    return -1;
  }
  
  /**
   * 处理任务队列
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const workerIndex = this.getIdleWorker();
      if (workerIndex === -1) break;
      
      const task = this.taskQueue.shift()!;
      this.executeOnWorker(workerIndex, task.message, task.resolve, task.reject);
    }
  }
  
  /**
   * 在指定Worker上执行任务
   */
  private executeOnWorker(
    workerIndex: number,
    message: WorkerMessage,
    resolve: (value: unknown) => void,
    reject: (reason: unknown) => void
  ): void {
    const workerState = this.workers[workerIndex];
    workerState.busy = true;
    
    const taskId = message.id;
    const startTime = performance.now();
    
    const timeout = setTimeout(() => {
      this.pendingTasks.delete(taskId);
      workerState.busy = false;
      this.stats.failedTasks++;
      reject(new Error(`Task ${taskId} timed out`));
      this.processQueue();
    }, this.config.taskTimeout);
    
    this.pendingTasks.set(taskId, {
      id: taskId,
      resolve,
      reject,
      timeout,
      startTime,
    });
    
    // 发送消息到Worker
    const transferables: Transferable[] = [];
    const payload = message.payload;
    
    // 检测TypedArray并添加到transferables
    if (payload) {
      for (const key of Object.keys(payload)) {
        const value = payload[key];
        if (value instanceof ArrayBuffer) {
          transferables.push(value);
        } else if (ArrayBuffer.isView(value) && value.buffer) {
          transferables.push(value.buffer);
        }
      }
    }
    
    if (transferables.length > 0) {
      workerState.worker.postMessage(message, transferables);
    } else {
      workerState.worker.postMessage(message);
    }
  }
  
  /**
   * 发送任务到Worker池
   */
  sendTask<T>(type: WorkerMessage['type'], payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error('WorkerPool not initialized'));
        return;
      }
      
      const taskId = ++this.nextTaskId;
      this.stats.totalTasks++;
      
      const message: WorkerMessage = {
        type,
        payload,
        id: taskId,
      };
      
      const workerIndex = this.getIdleWorker();
      
      if (workerIndex >= 0) {
        this.executeOnWorker(workerIndex, message, resolve as (value: unknown) => void, reject);
      } else {
        // 添加到队列
        this.taskQueue.push({ message, resolve: resolve as (value: unknown) => void, reject });
      }
    });
  }
  
  /**
   * 并行执行多个任务
   */
  async executeBatch<T>(
    type: WorkerMessage['type'],
    payloads: unknown[]
  ): Promise<BatchTaskResult<T>> {
    const startTime = performance.now();
    const errors: string[] = [];
    
    const promises = payloads.map((payload, index) =>
      this.sendTask<T>(type, payload).catch((error: Error) => {
        errors.push(`Task ${index}: ${error.message}`);
        return null as T | null;
      })
    );
    
    const results = await Promise.all(promises);
    const validResults: T[] = [];
    for (const r of results) {
      if (r !== null) {
        validResults.push(r);
      }
    }
    
    return {
      results: validResults,
      totalTime: performance.now() - startTime,
      errors,
    };
  }
  
  /**
   * 按范围分割并行任务
   */
  async executeRanged<T>(
    type: WorkerMessage['type'],
    totalItems: number,
    createPayload: (start: number, end: number) => unknown
  ): Promise<BatchTaskResult<T>> {
    const workerCount = this.workers.length;
    const itemsPerWorker = Math.ceil(totalItems / workerCount);
    const payloads: unknown[] = [];
    
    for (let i = 0; i < workerCount; i++) {
      const start = i * itemsPerWorker;
      const end = Math.min((i + 1) * itemsPerWorker, totalItems);
      
      if (start < end) {
        payloads.push(createPayload(start, end));
      }
    }
    
    return this.executeBatch<T>(type, payloads);
  }
  
  /**
   * 获取Worker池状态
   */
  getStatus(): {
    initialized: boolean;
    workerCount: number;
    busyWorkers: number;
    queueLength: number;
    stats: {
      totalTasks: number;
      completedTasks: number;
      failedTasks: number;
      totalTime: number;
      avgTime: number;
    };
  } {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    
    return {
      initialized: this.isInitialized,
      workerCount: this.workers.length,
      busyWorkers,
      queueLength: this.taskQueue.length,
      stats: { ...this.stats },
    };
  }
  
  /**
   * 获取每个Worker的状态
   */
  getWorkerStats(): Array<{
    index: number;
    busy: boolean;
    taskCount: number;
    avgTime: number;
    errors: number;
  }> {
    return this.workers.map((w, index) => ({
      index,
      busy: w.busy,
      taskCount: w.taskCount,
      avgTime: w.taskCount > 0 ? w.totalTime / w.taskCount : 0,
      errors: w.errors,
    }));
  }
  
  /**
   * 检查是否可用
   */
  isAvailable(): boolean {
    return this.isInitialized && this.workers.length > 0;
  }
  
  /**
   * 获取空闲Worker数量
   */
  getIdleCount(): number {
    return this.workers.filter(w => !w.busy).length;
  }
  
  /**
   * 销毁Worker池
   */
  destroy(): void {
    // 清除所有待处理任务
    for (const [id, pending] of this.pendingTasks) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('WorkerPool destroyed'));
    }
    this.pendingTasks.clear();
    
    // 清空队列
    for (const task of this.taskQueue) {
      task.reject(new Error('WorkerPool destroyed'));
    }
    this.taskQueue = [];
    
    // 终止所有Worker
    for (const workerState of this.workers) {
      workerState.worker.terminate();
    }
    this.workers = [];
    
    this.isInitialized = false;
    console.log('WorkerPool destroyed');
  }
}

// 全局Worker池实例
let globalWorkerPool: WorkerPool | null = null;

/**
 * 获取全局Worker池
 */
export function getWorkerPool(): WorkerPool {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPool();
  }
  return globalWorkerPool;
}

/**
 * 初始化全局Worker池
 */
export async function initializeWorkerPool(): Promise<boolean> {
  const pool = getWorkerPool();
  return pool.initialize();
}

/**
 * 销毁全局Worker池
 */
export function destroyWorkerPool(): void {
  if (globalWorkerPool) {
    globalWorkerPool.destroy();
    globalWorkerPool = null;
  }
}