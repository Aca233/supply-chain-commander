/**
 * 高性能数据结构
 *
 * v4.0更新：byRecipe索引改为byOutputMode
 *
 * 包含：
 * 1. 建筑索引 - 按所有者、类型快速查找建筑
 * 2. 交易历史环形缓冲区 - 固定大小的交易记录
 * 3. 公司库存索引 - 快速查找非零库存
 */

// ==================== 环形缓冲区 ====================

/**
 * 泛型环形缓冲区
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private _size = 0;
  private readonly capacity: number;
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }
  
  /**
   * 添加元素（如果满了会覆盖最旧的）
   */
  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this._size < this.capacity) {
      this._size++;
    } else {
      // 覆盖最旧的，移动head
      this.head = (this.head + 1) % this.capacity;
    }
  }
  
  /**
   * 批量添加
   */
  pushBatch(items: T[]): void {
    for (const item of items) {
      this.push(item);
    }
  }
  
  /**
   * 获取最新的n个元素
   */
  getLatest(n: number): T[] {
    const count = Math.min(n, this._size);
    const result: T[] = [];
    
    for (let i = 0; i < count; i++) {
      const idx = (this.tail - 1 - i + this.capacity) % this.capacity;
      result.push(this.buffer[idx]!);
    }
    
    return result;
  }
  
  /**
   * 获取所有元素（从旧到新）
   */
  getAll(): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < this._size; i++) {
      const idx = (this.head + i) % this.capacity;
      result.push(this.buffer[idx]!);
    }
    
    return result;
  }
  
  /**
   * 获取指定位置的元素（0是最旧的）
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this._size) return undefined;
    const idx = (this.head + index) % this.capacity;
    return this.buffer[idx];
  }
  
  /**
   * 获取最新的元素
   */
  peek(): T | undefined {
    if (this._size === 0) return undefined;
    const idx = (this.tail - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }
  
  /**
   * 当前大小
   */
  get size(): number {
    return this._size;
  }
  
  /**
   * 是否已满
   */
  get isFull(): boolean {
    return this._size >= this.capacity;
  }
  
  /**
   * 清空
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this._size = 0;
    this.buffer.fill(undefined);
  }
  
  /**
   * 遍历（从旧到新）
   */
  forEach(callback: (item: T, index: number) => void): void {
    for (let i = 0; i < this._size; i++) {
      const idx = (this.head + i) % this.capacity;
      callback(this.buffer[idx]!, i);
    }
  }
  
  /**
   * 过滤
   */
  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < this._size; i++) {
      const idx = (this.head + i) % this.capacity;
      if (predicate(this.buffer[idx]!)) {
        result.push(this.buffer[idx]!);
      }
    }
    
    return result;
  }
  
  /**
   * 聚合
   */
  reduce<U>(
    callback: (acc: U, item: T, index: number) => U,
    initialValue: U
  ): U {
    let acc = initialValue;
    
    for (let i = 0; i < this._size; i++) {
      const idx = (this.head + i) % this.capacity;
      acc = callback(acc, this.buffer[idx]!, i);
    }
    
    return acc;
  }
}

// ==================== TypedArray环形缓冲区 ====================

/**
 * Float32Array环形缓冲区
 * 适用于价格历史等数值数据
 */
export class Float32RingBuffer {
  private buffer: Float32Array;
  private head = 0;
  private tail = 0;
  private _size = 0;
  private readonly capacity: number;
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float32Array(capacity);
  }
  
  push(value: number): void {
    this.buffer[this.tail] = value;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this._size < this.capacity) {
      this._size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }
  
  pushBatch(values: Float32Array | number[]): void {
    for (let i = 0; i < values.length; i++) {
      this.push(values[i]);
    }
  }
  
  getLatest(n: number): Float32Array {
    const count = Math.min(n, this._size);
    const result = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const idx = (this.tail - 1 - i + this.capacity) % this.capacity;
      result[i] = this.buffer[idx];
    }
    
    return result;
  }
  
  getAll(): Float32Array {
    const result = new Float32Array(this._size);
    
    for (let i = 0; i < this._size; i++) {
      const idx = (this.head + i) % this.capacity;
      result[i] = this.buffer[idx];
    }
    
    return result;
  }
  
  get(index: number): number {
    if (index < 0 || index >= this._size) return 0;
    const idx = (this.head + index) % this.capacity;
    return this.buffer[idx];
  }
  
  peek(): number {
    if (this._size === 0) return 0;
    const idx = (this.tail - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }
  
  get size(): number {
    return this._size;
  }
  
  /**
   * 计算统计值
   */
  getStats(): { min: number; max: number; avg: number; sum: number } {
    if (this._size === 0) {
      return { min: 0, max: 0, avg: 0, sum: 0 };
    }
    
    let min = this.buffer[(this.head) % this.capacity];
    let max = min;
    let sum = 0;
    
    for (let i = 0; i < this._size; i++) {
      const idx = (this.head + i) % this.capacity;
      const val = this.buffer[idx];
      sum += val;
      if (val < min) min = val;
      if (val > max) max = val;
    }
    
    return {
      min,
      max,
      avg: sum / this._size,
      sum,
    };
  }
  
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this._size = 0;
    this.buffer.fill(0);
  }
}

// ==================== 建筑索引 ====================

/**
 * 建筑索引
 * 支持按所有者、类型快速查找
 */
export class BuildingIndex {
  // 按所有者索引: ownerId -> Set<buildingId>
  private byOwner: Map<number, Set<number>> = new Map();
  
  // 按类型索引: typeId -> Set<buildingId>
  private byType: Map<number, Set<number>> = new Map();
  
  // 按产品模式索引: outputModeId -> Set<buildingId>（v4.0: 替代原来的byRecipe）
  private byOutputMode: Map<number, Set<number>> = new Map();
  
  // 所有建筑ID
  private allBuildings: Set<number> = new Set();
  
  /**
   * 添加建筑到索引
   * v4.0: recipeId参数实际接收outputModeId
   */
  add(buildingId: number, ownerId: number, typeId: number, recipeId: number): void {
    this.allBuildings.add(buildingId);
    
    // 按所有者索引
    if (!this.byOwner.has(ownerId)) {
      this.byOwner.set(ownerId, new Set());
    }
    this.byOwner.get(ownerId)!.add(buildingId);
    
    // 按类型索引
    if (!this.byType.has(typeId)) {
      this.byType.set(typeId, new Set());
    }
    this.byType.get(typeId)!.add(buildingId);
    
    // 按产品模式索引（v4.0: 替代原来的按配方索引）
    if (recipeId >= 0) {
      if (!this.byOutputMode.has(recipeId)) {
        this.byOutputMode.set(recipeId, new Set());
      }
      this.byOutputMode.get(recipeId)!.add(buildingId);
    }
  }
  
  /**
   * 从索引移除建筑
   * v4.0: recipeId参数实际接收outputModeId
   */
  remove(buildingId: number, ownerId: number, typeId: number, recipeId: number): void {
    this.allBuildings.delete(buildingId);
    this.byOwner.get(ownerId)?.delete(buildingId);
    this.byType.get(typeId)?.delete(buildingId);
    if (recipeId >= 0) {
      this.byOutputMode.get(recipeId)?.delete(buildingId);
    }
  }
  
  /**
   * 更新建筑所有者
   */
  updateOwner(buildingId: number, oldOwnerId: number, newOwnerId: number): void {
    this.byOwner.get(oldOwnerId)?.delete(buildingId);
    
    if (!this.byOwner.has(newOwnerId)) {
      this.byOwner.set(newOwnerId, new Set());
    }
    this.byOwner.get(newOwnerId)!.add(buildingId);
  }
  
  /**
   * 获取某所有者的所有建筑
   */
  getByOwner(ownerId: number): number[] {
    const set = this.byOwner.get(ownerId);
    return set ? Array.from(set) : [];
  }
  
  /**
   * 获取某类型的所有建筑
   */
  getByType(typeId: number): number[] {
    const set = this.byType.get(typeId);
    return set ? Array.from(set) : [];
  }
  
  /**
   * 获取使用某产品模式的所有建筑
   * v4.0: 替代原来的按配方查找
   */
  getByRecipe(recipeId: number): number[] {
    const set = this.byOutputMode.get(recipeId);
    return set ? Array.from(set) : [];
  }
  
  /**
   * 获取使用某产品模式的所有建筑（新API名称）
   */
  getByOutputMode(outputModeId: number): number[] {
    return this.getByRecipe(outputModeId);
  }
  
  /**
   * 获取某所有者的某类型建筑
   */
  getByOwnerAndType(ownerId: number, typeId: number): number[] {
    const ownerSet = this.byOwner.get(ownerId);
    const typeSet = this.byType.get(typeId);
    
    if (!ownerSet || !typeSet) return [];
    
    // 交集
    const result: number[] = [];
    const smaller = ownerSet.size < typeSet.size ? ownerSet : typeSet;
    const larger = ownerSet.size < typeSet.size ? typeSet : ownerSet;
    
    for (const id of smaller) {
      if (larger.has(id)) {
        result.push(id);
      }
    }
    
    return result;
  }
  
  /**
   * 获取某所有者的建筑数量
   */
  getOwnerBuildingCount(ownerId: number): number {
    return this.byOwner.get(ownerId)?.size || 0;
  }
  
  /**
   * 获取总建筑数
   */
  get totalCount(): number {
    return this.allBuildings.size;
  }
  
  /**
   * 清空索引
   */
  clear(): void {
    this.byOwner.clear();
    this.byType.clear();
    this.byOutputMode.clear();
    this.allBuildings.clear();
  }
}

// ==================== 稀疏库存索引 ====================

/**
 * 稀疏库存索引
 * 只索引非零库存，避免遍历空槽位
 */
export class SparseInventoryIndex {
  // companyId -> Set<goodsId> 非零库存商品
  private nonZeroGoods: Map<number, Set<number>> = new Map();
  
  // goodsId -> Set<companyId> 持有该商品的公司
  private goodsHolders: Map<number, Set<number>> = new Map();
  
  /**
   * 更新库存
   */
  update(companyId: number, goodsId: number, quantity: number): void {
    const hasGoods = quantity > 0;
    
    if (hasGoods) {
      // 添加到索引
      if (!this.nonZeroGoods.has(companyId)) {
        this.nonZeroGoods.set(companyId, new Set());
      }
      this.nonZeroGoods.get(companyId)!.add(goodsId);
      
      if (!this.goodsHolders.has(goodsId)) {
        this.goodsHolders.set(goodsId, new Set());
      }
      this.goodsHolders.get(goodsId)!.add(companyId);
    } else {
      // 从索引移除
      this.nonZeroGoods.get(companyId)?.delete(goodsId);
      this.goodsHolders.get(goodsId)?.delete(companyId);
    }
  }
  
  /**
   * 获取公司拥有的所有非零商品
   */
  getCompanyGoods(companyId: number): number[] {
    const set = this.nonZeroGoods.get(companyId);
    return set ? Array.from(set) : [];
  }
  
  /**
   * 获取持有某商品的所有公司
   */
  getGoodsHolders(goodsId: number): number[] {
    const set = this.goodsHolders.get(goodsId);
    return set ? Array.from(set) : [];
  }
  
  /**
   * 检查公司是否持有某商品
   */
  hasGoods(companyId: number, goodsId: number): boolean {
    return this.nonZeroGoods.get(companyId)?.has(goodsId) || false;
  }
  
  /**
   * 获取公司的非零商品数量
   */
  getCompanyGoodsCount(companyId: number): number {
    return this.nonZeroGoods.get(companyId)?.size || 0;
  }
  
  /**
   * 清空索引
   */
  clear(): void {
    this.nonZeroGoods.clear();
    this.goodsHolders.clear();
  }
}

// ==================== 交易历史 ====================

export interface TradeRecord {
  tick: number;
  goodsId: number;
  buyCompanyId: number;
  sellCompanyId: number;
  quantity: number;
  price: number;
  value: number;
}

/**
 * 交易历史管理器
 * 使用环形缓冲区存储，支持按商品/公司快速查询
 */
export class TradeHistory {
  // 全局交易历史
  private allTrades: RingBuffer<TradeRecord>;
  
  // 按商品的交易历史
  private byGoods: Map<number, RingBuffer<TradeRecord>> = new Map();
  
  // 按公司的交易历史
  private byCompany: Map<number, RingBuffer<TradeRecord>> = new Map();
  
  private readonly globalCapacity: number;
  private readonly perEntityCapacity: number;
  
  constructor(
    globalCapacity: number = 10000,
    perEntityCapacity: number = 500
  ) {
    this.globalCapacity = globalCapacity;
    this.perEntityCapacity = perEntityCapacity;
    this.allTrades = new RingBuffer<TradeRecord>(globalCapacity);
  }
  
  /**
   * 记录交易
   */
  record(trade: TradeRecord): void {
    this.allTrades.push(trade);
    
    // 按商品记录
    if (!this.byGoods.has(trade.goodsId)) {
      this.byGoods.set(
        trade.goodsId,
        new RingBuffer<TradeRecord>(this.perEntityCapacity)
      );
    }
    this.byGoods.get(trade.goodsId)!.push(trade);
    
    // 按买方记录
    if (!this.byCompany.has(trade.buyCompanyId)) {
      this.byCompany.set(
        trade.buyCompanyId,
        new RingBuffer<TradeRecord>(this.perEntityCapacity)
      );
    }
    this.byCompany.get(trade.buyCompanyId)!.push(trade);
    
    // 按卖方记录（如果不同）
    if (trade.sellCompanyId !== trade.buyCompanyId) {
      if (!this.byCompany.has(trade.sellCompanyId)) {
        this.byCompany.set(
          trade.sellCompanyId,
          new RingBuffer<TradeRecord>(this.perEntityCapacity)
        );
      }
      this.byCompany.get(trade.sellCompanyId)!.push(trade);
    }
  }
  
  /**
   * 批量记录交易
   */
  recordBatch(trades: TradeRecord[]): void {
    for (const trade of trades) {
      this.record(trade);
    }
  }
  
  /**
   * 获取最近的全局交易
   */
  getRecentTrades(count: number): TradeRecord[] {
    return this.allTrades.getLatest(count);
  }
  
  /**
   * 获取某商品的最近交易
   */
  getGoodsTrades(goodsId: number, count: number): TradeRecord[] {
    return this.byGoods.get(goodsId)?.getLatest(count) || [];
  }
  
  /**
   * 获取某公司的最近交易
   */
  getCompanyTrades(companyId: number, count: number): TradeRecord[] {
    return this.byCompany.get(companyId)?.getLatest(count) || [];
  }
  
  /**
   * 获取某商品的交易统计
   */
  getGoodsStats(goodsId: number): {
    tradeCount: number;
    totalVolume: number;
    totalValue: number;
    avgPrice: number;
  } {
    const trades = this.byGoods.get(goodsId);
    if (!trades || trades.size === 0) {
      return { tradeCount: 0, totalVolume: 0, totalValue: 0, avgPrice: 0 };
    }
    
    return trades.reduce(
      (acc, trade) => ({
        tradeCount: acc.tradeCount + 1,
        totalVolume: acc.totalVolume + trade.quantity,
        totalValue: acc.totalValue + trade.value,
        avgPrice: 0, // 后面计算
      }),
      { tradeCount: 0, totalVolume: 0, totalValue: 0, avgPrice: 0 }
    );
  }
  
  /**
   * 获取总交易数
   */
  get totalTradeCount(): number {
    return this.allTrades.size;
  }
  
  /**
   * 清空历史
   */
  clear(): void {
    this.allTrades.clear();
    this.byGoods.clear();
    this.byCompany.clear();
  }
}

// ==================== 全局实例 ====================

export const buildingIndex = new BuildingIndex();
export const inventoryIndex = new SparseInventoryIndex();
export const tradeHistory = new TradeHistory(10000, 500);

/**
 * 重置所有索引
 */
export function resetAllIndices(): void {
  buildingIndex.clear();
  inventoryIndex.clear();
  tradeHistory.clear();
}