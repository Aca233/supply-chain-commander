/**
 * 通用对象池
 * 用于复用频繁创建/销毁的对象，减少GC压力
 *
 * 增强功能：
 * - 自动扩缩容
 * - 延迟重用（防止对象过早重用导致的问题）
 * - 批量预热
 * - 内存压力响应
 */

export interface Poolable {
  reset(): void;
}

export interface PoolConfig {
  initialSize?: number;
  maxSize?: number;
  minSize?: number;
  shrinkThreshold?: number; // 空闲比例超过此值时缩容
  growthFactor?: number;    // 扩容因子
  delayedReuse?: boolean;   // 延迟重用
  delayTicks?: number;      // 延迟tick数
}

const DEFAULT_CONFIG: Required<PoolConfig> = {
  initialSize: 100,
  maxSize: 1000,
  minSize: 10,
  shrinkThreshold: 0.8,
  growthFactor: 1.5,
  delayedReuse: false,
  delayTicks: 2,
};

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private delayedPool: Array<{ obj: T; availableTick: number }> = [];
  private activeCount = 0;
  private currentTick = 0;
  private createFn: () => T;
  private config: Required<PoolConfig>;
  
  // 统计信息
  private stats = {
    created: 0,
    acquired: 0,
    released: 0,
    hitRate: 0,
    peakActive: 0,
    shrinkCount: 0,
    growCount: 0,
  };
  
  constructor(createFn: () => T, config: PoolConfig = {}) {
    this.createFn = createFn;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 预分配对象
    this.warmup(this.config.initialSize);
  }
  
  /**
   * 预热池
   */
  warmup(count: number): void {
    const toCreate = Math.min(count, this.config.maxSize - this.pool.length);
    for (let i = 0; i < toCreate; i++) {
      this.pool.push(this.createNew());
    }
  }
  
  private createNew(): T {
    this.stats.created++;
    return this.createFn();
  }
  
  /**
   * 更新tick（用于延迟重用）
   */
  tick(): void {
    this.currentTick++;
    
    // 处理延迟池
    if (this.config.delayedReuse) {
      const ready: T[] = [];
      const stillDelayed: typeof this.delayedPool = [];
      
      for (const item of this.delayedPool) {
        if (this.currentTick >= item.availableTick) {
          ready.push(item.obj);
        } else {
          stillDelayed.push(item);
        }
      }
      
      this.delayedPool = stillDelayed;
      this.pool.push(...ready);
    }
    
    // 自动缩容检查
    this.autoShrink();
  }
  
  /**
   * 获取对象
   */
  acquire(): T {
    this.stats.acquired++;
    this.activeCount++;
    this.stats.peakActive = Math.max(this.stats.peakActive, this.activeCount);
    
    if (this.pool.length > 0) {
      this.stats.hitRate = (this.stats.acquired - this.stats.created) / this.stats.acquired;
      return this.pool.pop()!;
    }
    
    // 自动扩容
    if (this.stats.created < this.config.maxSize) {
      this.autoGrow();
    }
    
    return this.createNew();
  }
  
  /**
   * 释放对象回池
   */
  release(obj: T): void {
    this.stats.released++;
    this.activeCount = Math.max(0, this.activeCount - 1);
    
    if (this.pool.length + this.delayedPool.length >= this.config.maxSize) {
      return; // 超过maxSize的对象直接丢弃
    }
    
    obj.reset();
    
    if (this.config.delayedReuse) {
      this.delayedPool.push({
        obj,
        availableTick: this.currentTick + this.config.delayTicks,
      });
    } else {
      this.pool.push(obj);
    }
  }
  
  /**
   * 批量获取（优化版本）
   */
  acquireBatch(count: number): T[] {
    // 确保池中有足够对象
    if (this.pool.length < count) {
      const needed = count - this.pool.length;
      this.warmup(needed);
    }
    
    this.stats.acquired += count;
    this.activeCount += count;
    this.stats.peakActive = Math.max(this.stats.peakActive, this.activeCount);
    
    // 直接从池尾部切出
    if (this.pool.length >= count) {
      this.stats.hitRate = (this.stats.acquired - this.stats.created) / this.stats.acquired;
      return this.pool.splice(-count, count);
    }
    
    // 池不够，需要创建新的
    const result = this.pool.splice(0, this.pool.length);
    const remaining = count - result.length;
    for (let i = 0; i < remaining; i++) {
      result.push(this.createNew());
    }
    return result;
  }
  
  /**
   * 批量释放（优化版本）
   */
  releaseBatch(objects: T[]): void {
    this.stats.released += objects.length;
    this.activeCount = Math.max(0, this.activeCount - objects.length);
    
    const available = this.config.maxSize - this.pool.length - this.delayedPool.length;
    const toReturn = Math.min(objects.length, available);
    
    for (let i = 0; i < toReturn; i++) {
      objects[i].reset();
    }
    
    if (this.config.delayedReuse) {
      for (let i = 0; i < toReturn; i++) {
        this.delayedPool.push({
          obj: objects[i],
          availableTick: this.currentTick + this.config.delayTicks,
        });
      }
    } else {
      this.pool.push(...objects.slice(0, toReturn));
    }
  }
  
  /**
   * 自动扩容
   */
  private autoGrow(): void {
    const currentTotal = this.pool.length + this.activeCount;
    const growBy = Math.min(
      Math.floor(currentTotal * (this.config.growthFactor - 1)),
      this.config.maxSize - this.stats.created
    );
    
    if (growBy > 0) {
      this.stats.growCount++;
      for (let i = 0; i < growBy; i++) {
        this.pool.push(this.createNew());
      }
    }
  }
  
  /**
   * 自动缩容
   */
  private autoShrink(): void {
    const totalInPool = this.pool.length + this.delayedPool.length;
    const total = totalInPool + this.activeCount;
    
    if (total === 0) return;
    
    const idleRatio = totalInPool / total;
    
    if (idleRatio > this.config.shrinkThreshold && totalInPool > this.config.minSize) {
      const shrinkTo = Math.max(
        this.config.minSize,
        Math.floor(totalInPool * 0.7)
      );
      const toRemove = totalInPool - shrinkTo;
      
      if (toRemove > 0) {
        this.stats.shrinkCount++;
        this.pool.splice(0, Math.min(toRemove, this.pool.length));
      }
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      delayedSize: this.delayedPool.length,
      activeCount: this.activeCount,
      totalCapacity: this.pool.length + this.delayedPool.length + this.activeCount,
    };
  }
  
  /**
   * 清空池
   */
  clear(): void {
    this.pool = [];
    this.delayedPool = [];
    this.activeCount = 0;
  }
  
  /**
   * 响应内存压力
   */
  onMemoryPressure(): void {
    // 强制缩容到最小
    this.pool.splice(this.config.minSize);
    this.delayedPool = [];
  }
}

// ==================== 具体的可池化对象 ====================

/**
 * 订单对象
 */
export class PooledOrder implements Poolable {
  id = 0;
  companyId = 0;
  goodsId = 0;
  type: 'buy' | 'sell' = 'buy';
  price = 0;
  quantity = 0;
  filledQuantity = 0;
  timestamp = 0;
  status: 'open' | 'partial' | 'filled' | 'cancelled' = 'open';
  
  reset(): void {
    this.id = 0;
    this.companyId = 0;
    this.goodsId = 0;
    this.type = 'buy';
    this.price = 0;
    this.quantity = 0;
    this.filledQuantity = 0;
    this.timestamp = 0;
    this.status = 'open';
  }
  
  init(
    id: number,
    companyId: number,
    goodsId: number,
    type: 'buy' | 'sell',
    price: number,
    quantity: number,
    timestamp: number
  ): this {
    this.id = id;
    this.companyId = companyId;
    this.goodsId = goodsId;
    this.type = type;
    this.price = price;
    this.quantity = quantity;
    this.filledQuantity = 0;
    this.timestamp = timestamp;
    this.status = 'open';
    return this;
  }
}

/**
 * 事件对象
 */
export class PooledEvent implements Poolable {
  type = '';
  data: any = null;
  timestamp = 0;
  handled = false;
  
  reset(): void {
    this.type = '';
    this.data = null;
    this.timestamp = 0;
    this.handled = false;
  }
  
  init(type: string, data: any, timestamp: number): this {
    this.type = type;
    this.data = data;
    this.timestamp = timestamp;
    this.handled = false;
    return this;
  }
}

/**
 * 交易记录对象
 */
export class PooledTrade implements Poolable {
  id = 0;
  buyOrderId = 0;
  sellOrderId = 0;
  goodsId = 0;
  price = 0;
  quantity = 0;
  buyerCompanyId = 0;
  sellerCompanyId = 0;
  timestamp = 0;
  
  reset(): void {
    this.id = 0;
    this.buyOrderId = 0;
    this.sellOrderId = 0;
    this.goodsId = 0;
    this.price = 0;
    this.quantity = 0;
    this.buyerCompanyId = 0;
    this.sellerCompanyId = 0;
    this.timestamp = 0;
  }
  
  init(
    id: number,
    buyOrderId: number,
    sellOrderId: number,
    goodsId: number,
    price: number,
    quantity: number,
    buyerCompanyId: number,
    sellerCompanyId: number,
    timestamp: number
  ): this {
    this.id = id;
    this.buyOrderId = buyOrderId;
    this.sellOrderId = sellOrderId;
    this.goodsId = goodsId;
    this.price = price;
    this.quantity = quantity;
    this.buyerCompanyId = buyerCompanyId;
    this.sellerCompanyId = sellerCompanyId;
    this.timestamp = timestamp;
    return this;
  }
}

/**
 * 价格点对象（用于历史图表）
 */
export class PooledPricePoint implements Poolable {
  tick = 0;
  open = 0;
  high = 0;
  low = 0;
  close = 0;
  volume = 0;
  
  reset(): void {
    this.tick = 0;
    this.open = 0;
    this.high = 0;
    this.low = 0;
    this.close = 0;
    this.volume = 0;
  }
  
  init(tick: number, open: number, high: number, low: number, close: number, volume: number): this {
    this.tick = tick;
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.volume = volume;
    return this;
  }
}

// ==================== TypedArray 池 ====================

type TypedArrayConstructor =
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Uint16ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Int8ArrayConstructor;

type TypedArray =
  | Float32Array
  | Float64Array
  | Int32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int16Array
  | Int8Array;

interface TypedArrayPoolEntry {
  array: TypedArray;
  size: number;
}

/**
 * TypedArray 池
 * 按大小分桶管理，复用 TypedArray
 */
export class TypedArrayPool {
  private pools: Map<string, TypedArrayPoolEntry[]> = new Map();
  private stats = {
    acquired: 0,
    released: 0,
    created: 0,
    hits: 0,
  };
  
  // 大小分桶（使用2的幂次方）
  private bucketSize(size: number): number {
    // 找到大于等于 size 的最小2的幂
    let bucket = 16;
    while (bucket < size) {
      bucket *= 2;
    }
    return bucket;
  }
  
  private getPoolKey(type: string, size: number): string {
    return `${type}_${this.bucketSize(size)}`;
  }
  
  /**
   * 获取 Float32Array
   */
  acquireFloat32(size: number): Float32Array {
    return this.acquire(Float32Array, size) as Float32Array;
  }
  
  /**
   * 获取 Float64Array
   */
  acquireFloat64(size: number): Float64Array {
    return this.acquire(Float64Array, size) as Float64Array;
  }
  
  /**
   * 获取 Uint32Array
   */
  acquireUint32(size: number): Uint32Array {
    return this.acquire(Uint32Array, size) as Uint32Array;
  }
  
  /**
   * 获取 Uint16Array
   */
  acquireUint16(size: number): Uint16Array {
    return this.acquire(Uint16Array, size) as Uint16Array;
  }
  
  /**
   * 获取 Uint8Array
   */
  acquireUint8(size: number): Uint8Array {
    return this.acquire(Uint8Array, size) as Uint8Array;
  }
  
  /**
   * 获取 Int32Array
   */
  acquireInt32(size: number): Int32Array {
    return this.acquire(Int32Array, size) as Int32Array;
  }
  
  /**
   * 通用获取方法
   */
  acquire<T extends TypedArray>(
    ArrayType: TypedArrayConstructor,
    size: number
  ): T {
    this.stats.acquired++;
    const key = this.getPoolKey(ArrayType.name, size);
    const pool = this.pools.get(key);
    
    if (pool && pool.length > 0) {
      this.stats.hits++;
      const entry = pool.pop()!;
      // 如果池中的数组足够大，返回一个视图
      if (entry.size >= size) {
        return entry.array.subarray(0, size) as T;
      }
    }
    
    // 创建新数组
    this.stats.created++;
    const bucketedSize = this.bucketSize(size);
    return new ArrayType(bucketedSize).subarray(0, size) as T;
  }
  
  /**
   * 释放 TypedArray
   */
  release(array: TypedArray): void {
    this.stats.released++;
    const type = array.constructor.name;
    const size = array.buffer.byteLength / array.BYTES_PER_ELEMENT;
    const key = this.getPoolKey(type, size);
    
    let pool = this.pools.get(key);
    if (!pool) {
      pool = [];
      this.pools.set(key, pool);
    }
    
    // 限制每个桶的大小
    if (pool.length < 50) {
      // 清零（可选，用于安全性）
      array.fill(0);
      pool.push({ array, size });
    }
  }
  
  /**
   * 批量释放
   */
  releaseBatch(arrays: TypedArray[]): void {
    for (const arr of arrays) {
      this.release(arr);
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    let totalPooled = 0;
    let totalBytes = 0;
    
    this.pools.forEach((pool, key) => {
      totalPooled += pool.length;
      pool.forEach(entry => {
        totalBytes += entry.array.buffer.byteLength;
      });
    });
    
    return {
      ...this.stats,
      hitRate: this.stats.acquired > 0
        ? this.stats.hits / this.stats.acquired
        : 0,
      pooledArrays: totalPooled,
      pooledBytes: totalBytes,
      bucketCount: this.pools.size,
    };
  }
  
  /**
   * 清空所有池
   */
  clear(): void {
    this.pools.clear();
  }
  
  /**
   * 响应内存压力
   */
  onMemoryPressure(): void {
    // 保留每个桶最多5个
    this.pools.forEach((pool, key) => {
      if (pool.length > 5) {
        pool.splice(5);
      }
    });
  }
}

// ==================== 全局对象池实例 ====================

export const orderPool = new ObjectPool<PooledOrder>(
  () => new PooledOrder(),
  { initialSize: 500, maxSize: 5000, delayedReuse: true, delayTicks: 2 }
);

export const eventPool = new ObjectPool<PooledEvent>(
  () => new PooledEvent(),
  { initialSize: 200, maxSize: 1000 }
);

export const tradePool = new ObjectPool<PooledTrade>(
  () => new PooledTrade(),
  { initialSize: 500, maxSize: 5000, delayedReuse: true, delayTicks: 1 }
);

export const pricePointPool = new ObjectPool<PooledPricePoint>(
  () => new PooledPricePoint(),
  { initialSize: 1000, maxSize: 10000 }
);

// TypedArray 全局池
export const typedArrayPool = new TypedArrayPool();

/**
 * 获取所有池的统计信息
 */
export function getAllPoolStats() {
  return {
    orders: orderPool.getStats(),
    events: eventPool.getStats(),
    trades: tradePool.getStats(),
    pricePoints: pricePointPool.getStats(),
    typedArrays: typedArrayPool.getStats(),
  };
}

/**
 * 更新所有池的 tick
 */
export function tickAllPools(): void {
  orderPool.tick();
  eventPool.tick();
  tradePool.tick();
  pricePointPool.tick();
}

/**
 * 响应内存压力
 */
export function onGlobalMemoryPressure(): void {
  orderPool.onMemoryPressure();
  eventPool.onMemoryPressure();
  tradePool.onMemoryPressure();
  pricePointPool.onMemoryPressure();
  typedArrayPool.onMemoryPressure();
}