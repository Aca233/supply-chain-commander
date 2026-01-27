/**
 * Web Worker管理器
 * 管理Worker实例和消息通信
 */

import type { WorkerMessage, WorkerResponse } from './economyWorker';

export class WorkerManager {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages: Map<number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  
  private isSupported: boolean;
  private readonly TIMEOUT_MS = 5000;
  
  constructor() {
    this.isSupported = typeof Worker !== 'undefined';
  }
  
  /**
   * 初始化Worker
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Web Workers not supported, using main thread');
      return false;
    }
    
    try {
      // 使用Vite的Worker导入方式
      this.worker = new Worker(
        new URL('./economyWorker.ts', import.meta.url),
        { type: 'module' }
      );
      
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
      
      console.log('Worker initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Worker:', error);
      this.worker = null;
      return false;
    }
  }
  
  /**
   * 处理Worker响应
   */
  private handleMessage(e: MessageEvent<WorkerResponse>): void {
    const { id, result, duration } = e.data;
    
    const pending = this.pendingMessages.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(id);
      pending.resolve(result);
      
      // 性能监控
      if (duration > 10) {
        console.debug(`Worker task ${id} took ${duration.toFixed(2)}ms`);
      }
    }
  }
  
  /**
   * 处理Worker错误
   */
  private handleError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    // 拒绝所有待处理的请求
    for (const [id, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pendingMessages.delete(id);
    }
  }
  
  /**
   * 发送消息到Worker
   */
  private sendMessage<T>(type: WorkerMessage['type'], payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      const id = ++this.messageId;
      
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        reject(new Error(`Worker timeout for message ${id}`));
      }, this.TIMEOUT_MS);
      
      this.pendingMessages.set(id, { resolve, reject, timeout });
      
      const message: WorkerMessage = { type, payload, id };
      
      // 使用Transferable对象优化大数组传输
      const transferables: Transferable[] = [];
      if (payload.supplies instanceof Float32Array) transferables.push(payload.supplies.buffer);
      if (payload.demands instanceof Float32Array) transferables.push(payload.demands.buffer);
      if (payload.currentPrices instanceof Float32Array) transferables.push(payload.currentPrices.buffer);
      
      this.worker.postMessage(message, transferables);
    });
  }
  
  /**
   * 计算价格均衡（Worker线程）
   */
  async calculatePrices(
    supplies: Float32Array,
    demands: Float32Array,
    currentPrices: Float32Array,
    basePrices: Float32Array,
    count: number
  ): Promise<Float32Array> {
    if (!this.worker) {
      // 回退到主线程计算
      return this.calculatePricesFallback(supplies, demands, currentPrices, basePrices, count);
    }
    
    // 复制数据（因为Transferable会转移所有权）
    const suppliesCopy = new Float32Array(supplies);
    const demandsCopy = new Float32Array(demands);
    const pricesCopy = new Float32Array(currentPrices);
    const basePricesCopy = new Float32Array(basePrices);
    
    return this.sendMessage('CALCULATE_PRICES', {
      supplies: suppliesCopy,
      demands: demandsCopy,
      currentPrices: pricesCopy,
      basePrices: basePricesCopy,
      count,
    });
  }
  
  /**
   * 主线程计算回退
   */
  private calculatePricesFallback(
    supplies: Float32Array,
    demands: Float32Array,
    currentPrices: Float32Array,
    basePrices: Float32Array,
    count: number
  ): Float32Array {
    const newPrices = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const supply = supplies[i] || 1;
      const demand = demands[i] || 1;
      const basePrice = basePrices[i] || 100;
      const currentPrice = currentPrices[i] || basePrice;
      
      const ratio = demand / supply;
      let adjustment = 0;
      
      if (ratio > 1.05) {
        adjustment = Math.min(0.05, (ratio - 1) * 0.1);
      } else if (ratio < 0.95) {
        adjustment = Math.max(-0.05, (ratio - 1) * 0.1);
      }
      
      const priceRatio = currentPrice / basePrice;
      const meanReversion = (1 - priceRatio) * 0.002;
      
      let newPrice = currentPrice * (1 + adjustment + meanReversion);
      newPrice = Math.max(basePrice * 0.2, Math.min(basePrice * 5, newPrice));
      
      newPrices[i] = newPrice;
    }
    
    return newPrices;
  }
  
  /**
   * 批量更新（价格+生产）
   */
  async batchUpdate(params: {
    supplies: Float32Array;
    demands: Float32Array;
    currentPrices: Float32Array;
    basePrices: Float32Array;
    goodsCount: number;
    buildingCount: number;
    efficiencies: Float32Array;
    recipeOutputs: Uint8Array;
    recipeAmounts: Float32Array;
  }): Promise<{ prices: Float32Array; production: Float32Array }> {
    if (!this.worker) {
      // 回退处理
      const prices = this.calculatePricesFallback(
        params.supplies,
        params.demands,
        params.currentPrices,
        params.basePrices,
        params.goodsCount
      );
      return { prices, production: new Float32Array(params.goodsCount) };
    }
    
    return this.sendMessage('BATCH_UPDATE', {
      supplies: new Float32Array(params.supplies),
      demands: new Float32Array(params.demands),
      currentPrices: new Float32Array(params.currentPrices),
      basePrices: new Float32Array(params.basePrices),
      goodsCount: params.goodsCount,
      buildingCount: params.buildingCount,
      efficiencies: new Float32Array(params.efficiencies),
      recipeOutputs: new Uint8Array(params.recipeOutputs),
      recipeAmounts: new Float32Array(params.recipeAmounts),
    });
  }
  
  /**
   * 检查Worker是否可用
   */
  isAvailable(): boolean {
    return this.worker !== null;
  }
  
  /**
   * 销毁Worker
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    for (const [id, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker destroyed'));
    }
    this.pendingMessages.clear();
  }
}

// 单例导出
export const workerManager = new WorkerManager();