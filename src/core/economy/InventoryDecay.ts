/**
 * 库存保质期和损耗系统
 * 模拟商品随时间的自然损耗和保质期管理
 */

import { TICKS_PER_DAY, TICKS_PER_MONTH } from '@/core/constants';

// ==================== 类型定义 ====================

/**
 * 商品保质期类型
 */
export enum ShelfLifeType {
  PERMANENT = 'permanent',       // 永久保存
  LONG_TERM = 'long_term',       // 长期保存（1年+）
  MEDIUM_TERM = 'medium_term',   // 中期保存（1-12月）
  SHORT_TERM = 'short_term',     // 短期保存（1周-1月）
  PERISHABLE = 'perishable',     // 易腐烂（1-7天）
  VOLATILE = 'volatile',         // 极易变质（<1天）
}

/**
 * 商品保质期配置
 */
export interface ShelfLifeConfig {
  goodsId: number;
  type: ShelfLifeType;
  shelfLifeDays: number;          // 保质期（天）
  decayRate: number;              // 每日损耗率（0-1）
  storageCondition: StorageCondition;
  optimalTemperature?: number;    // 最佳储存温度
  humidityRequirement?: number;   // 湿度要求
}

/**
 * 存储条件
 */
export enum StorageCondition {
  NORMAL = 'normal',             // 常温
  COOL = 'cool',                 // 阴凉
  REFRIGERATED = 'refrigerated', // 冷藏
  FROZEN = 'frozen',             // 冷冻
  DRY = 'dry',                   // 干燥
  CLIMATE_CONTROLLED = 'climate_controlled', // 恒温恒湿
}

/**
 * 库存批次
 */
export interface InventoryBatch {
  id: number;
  companyId: number;
  goodsId: number;
  quantity: number;
  originalQuantity: number;
  
  // 时间
  createdTick: number;
  expiryTick: number;
  
  // 质量
  qualityGrade: number;          // 品质等级 0-4
  currentCondition: number;      // 当前状态 0-1
  
  // 存储
  storageCondition: StorageCondition;
  isProperlyStored: boolean;
  
  // 成本
  unitCost: number;              // 单位成本
  totalValue: number;            // 总价值
}

/**
 * 损耗事件
 */
export interface DecayEvent {
  batchId: number;
  goodsId: number;
  companyId: number;
  decayType: 'natural' | 'expired' | 'damaged' | 'storage_failure';
  quantityLost: number;
  valueLost: number;
  tick: number;
}

// ==================== 配置数据 ====================

/**
 * 商品保质期配置表
 */
const SHELF_LIFE_CONFIGS: ShelfLifeConfig[] = [
  // 永久保存 - 矿石、金属
  { goodsId: 0, type: ShelfLifeType.PERMANENT, shelfLifeDays: -1, decayRate: 0, storageCondition: StorageCondition.NORMAL },
  { goodsId: 1, type: ShelfLifeType.PERMANENT, shelfLifeDays: -1, decayRate: 0, storageCondition: StorageCondition.NORMAL },
  { goodsId: 2, type: ShelfLifeType.PERMANENT, shelfLifeDays: -1, decayRate: 0, storageCondition: StorageCondition.NORMAL },
  { goodsId: 3, type: ShelfLifeType.PERMANENT, shelfLifeDays: -1, decayRate: 0, storageCondition: StorageCondition.DRY },
  { goodsId: 14, type: ShelfLifeType.PERMANENT, shelfLifeDays: -1, decayRate: 0.0001, storageCondition: StorageCondition.DRY }, // 钢材可能生锈
  { goodsId: 15, type: ShelfLifeType.PERMANENT, shelfLifeDays: -1, decayRate: 0.0005, storageCondition: StorageCondition.DRY },
  
  // 长期保存 - 能源、化学品
  { goodsId: 4, type: ShelfLifeType.LONG_TERM, shelfLifeDays: 365, decayRate: 0.0002, storageCondition: StorageCondition.NORMAL },
  { goodsId: 5, type: ShelfLifeType.LONG_TERM, shelfLifeDays: 365, decayRate: 0.0001, storageCondition: StorageCondition.NORMAL },
  { goodsId: 17, type: ShelfLifeType.LONG_TERM, shelfLifeDays: 720, decayRate: 0.0001, storageCondition: StorageCondition.COOL },
  { goodsId: 19, type: ShelfLifeType.LONG_TERM, shelfLifeDays: 365, decayRate: 0.0002, storageCondition: StorageCondition.DRY },
  
  // 中期保存 - 工业品、消费品
  { goodsId: 6, type: ShelfLifeType.MEDIUM_TERM, shelfLifeDays: 180, decayRate: 0.001, storageCondition: StorageCondition.DRY }, // 木材
  { goodsId: 7, type: ShelfLifeType.MEDIUM_TERM, shelfLifeDays: 365, decayRate: 0.0005, storageCondition: StorageCondition.DRY }, // 棉花
  { goodsId: 20, type: ShelfLifeType.MEDIUM_TERM, shelfLifeDays: 180, decayRate: 0.001, storageCondition: StorageCondition.DRY }, // 化肥
  { goodsId: 26, type: ShelfLifeType.LONG_TERM, shelfLifeDays: 720, decayRate: 0.0001, storageCondition: StorageCondition.NORMAL }, // 家电
  { goodsId: 27, type: ShelfLifeType.LONG_TERM, shelfLifeDays: 540, decayRate: 0.0002, storageCondition: StorageCondition.CLIMATE_CONTROLLED }, // 电子产品
  { goodsId: 29, type: ShelfLifeType.MEDIUM_TERM, shelfLifeDays: 365, decayRate: 0.0003, storageCondition: StorageCondition.DRY }, // 服装
  
  // 短期保存 - 部分食品
  { goodsId: 8, type: ShelfLifeType.SHORT_TERM, shelfLifeDays: 90, decayRate: 0.005, storageCondition: StorageCondition.COOL }, // 粮食
  { goodsId: 45, type: ShelfLifeType.MEDIUM_TERM, shelfLifeDays: 180, decayRate: 0.002, storageCondition: StorageCondition.COOL }, // 饮料
  
  // 易腐烂 - 生鲜食品
  { goodsId: 44, type: ShelfLifeType.PERISHABLE, shelfLifeDays: 14, decayRate: 0.03, storageCondition: StorageCondition.REFRIGERATED }, // 食品
  
  // 药品 - 需要严格存储
  { goodsId: 37, type: ShelfLifeType.MEDIUM_TERM, shelfLifeDays: 365, decayRate: 0.001, storageCondition: StorageCondition.CLIMATE_CONTROLLED },
];

const SHELF_LIFE_CONFIG_MAP: Map<number, ShelfLifeConfig> = new Map(
  SHELF_LIFE_CONFIGS.map(c => [c.goodsId, c])
);

/**
 * 存储条件要求和成本
 */
export const STORAGE_CONDITIONS: Record<StorageCondition, {
  name: string;
  costMultiplier: number;
  decayReduction: number;
  description: string;
}> = {
  [StorageCondition.NORMAL]: {
    name: '常温存储',
    costMultiplier: 1.0,
    decayReduction: 0,
    description: '普通仓库存储',
  },
  [StorageCondition.COOL]: {
    name: '阴凉存储',
    costMultiplier: 1.3,
    decayReduction: 0.3,
    description: '通风阴凉环境',
  },
  [StorageCondition.REFRIGERATED]: {
    name: '冷藏存储',
    costMultiplier: 2.0,
    decayReduction: 0.7,
    description: '0-10°C冷藏',
  },
  [StorageCondition.FROZEN]: {
    name: '冷冻存储',
    costMultiplier: 3.0,
    decayReduction: 0.95,
    description: '-18°C以下冷冻',
  },
  [StorageCondition.DRY]: {
    name: '干燥存储',
    costMultiplier: 1.2,
    decayReduction: 0.2,
    description: '低湿度环境',
  },
  [StorageCondition.CLIMATE_CONTROLLED]: {
    name: '恒温恒湿',
    costMultiplier: 2.5,
    decayReduction: 0.8,
    description: '精确温湿度控制',
  },
};

// ==================== 库存管理器 ====================

export class InventoryDecayManager {
  private batches: Map<number, InventoryBatch> = new Map();
  private nextBatchId: number = 1;
  private batchesByCompany: Map<number, Set<number>> = new Map();
  private batchesByGoods: Map<number, Set<number>> = new Map();
  
  private decayHistory: DecayEvent[] = [];
  
  /**
   * 添加新的库存批次
   */
  addBatch(
    companyId: number,
    goodsId: number,
    quantity: number,
    qualityGrade: number,
    unitCost: number,
    storageCondition: StorageCondition,
    currentTick: number
  ): InventoryBatch {
    const config = SHELF_LIFE_CONFIG_MAP.get(goodsId);
    const shelfLifeTicks = config ? config.shelfLifeDays * TICKS_PER_DAY : -1;
    
    const batch: InventoryBatch = {
      id: this.nextBatchId++,
      companyId,
      goodsId,
      quantity,
      originalQuantity: quantity,
      createdTick: currentTick,
      expiryTick: shelfLifeTicks > 0 ? currentTick + shelfLifeTicks : -1,
      qualityGrade,
      currentCondition: 1.0,
      storageCondition,
      isProperlyStored: this.checkStorageCondition(goodsId, storageCondition),
      unitCost,
      totalValue: quantity * unitCost,
    };
    
    this.batches.set(batch.id, batch);
    
    // 添加索引
    if (!this.batchesByCompany.has(companyId)) {
      this.batchesByCompany.set(companyId, new Set());
    }
    this.batchesByCompany.get(companyId)!.add(batch.id);
    
    if (!this.batchesByGoods.has(goodsId)) {
      this.batchesByGoods.set(goodsId, new Set());
    }
    this.batchesByGoods.get(goodsId)!.add(batch.id);
    
    return batch;
  }
  
  /**
   * 检查存储条件是否满足
   */
  private checkStorageCondition(goodsId: number, actualCondition: StorageCondition): boolean {
    const config = SHELF_LIFE_CONFIG_MAP.get(goodsId);
    if (!config) return true;
    
    // 检查存储条件是否符合要求
    const requiredCondition = config.storageCondition;
    
    // 更高级的存储条件可以满足较低要求
    const conditionLevel: Record<StorageCondition, number> = {
      [StorageCondition.NORMAL]: 0,
      [StorageCondition.COOL]: 1,
      [StorageCondition.DRY]: 1,
      [StorageCondition.REFRIGERATED]: 2,
      [StorageCondition.CLIMATE_CONTROLLED]: 3,
      [StorageCondition.FROZEN]: 4,
    };
    
    return conditionLevel[actualCondition] >= conditionLevel[requiredCondition];
  }
  
  /**
   * 处理库存损耗（每tick调用）
   */
  processDailyDecay(currentTick: number): DecayEvent[] {
    const events: DecayEvent[] = [];
    
    // 只在每天结算一次损耗
    if (currentTick % TICKS_PER_DAY !== 0) return events;
    
    for (const [batchId, batch] of this.batches) {
      if (batch.quantity <= 0) continue;
      
      const config = SHELF_LIFE_CONFIG_MAP.get(batch.goodsId);
      if (!config) continue;
      
      // 检查是否过期
      if (batch.expiryTick > 0 && currentTick >= batch.expiryTick) {
        // 过期处理 - 全部损失
        const event: DecayEvent = {
          batchId,
          goodsId: batch.goodsId,
          companyId: batch.companyId,
          decayType: 'expired',
          quantityLost: batch.quantity,
          valueLost: batch.quantity * batch.unitCost,
          tick: currentTick,
        };
        
        batch.quantity = 0;
        batch.currentCondition = 0;
        
        events.push(event);
        this.decayHistory.push(event);
        continue;
      }
      
      // 计算日常损耗
      let decayRate = config.decayRate;
      
      // 存储条件不当会加速损耗
      if (!batch.isProperlyStored) {
        decayRate *= 3;  // 存储不当，损耗率x3
      }
      
      // 应用存储条件的损耗降低
      const storageInfo = STORAGE_CONDITIONS[batch.storageCondition];
      decayRate *= (1 - storageInfo.decayReduction);
      
      // 计算损耗量
      const decayAmount = batch.quantity * decayRate;
      
      if (decayAmount >= 0.01) {  // 最小损耗阈值
        batch.quantity -= decayAmount;
        batch.currentCondition -= decayRate;
        batch.currentCondition = Math.max(0, batch.currentCondition);
        
        const event: DecayEvent = {
          batchId,
          goodsId: batch.goodsId,
          companyId: batch.companyId,
          decayType: 'natural',
          quantityLost: decayAmount,
          valueLost: decayAmount * batch.unitCost,
          tick: currentTick,
        };
        
        events.push(event);
        this.decayHistory.push(event);
      }
    }
    
    // 清理空批次
    this.cleanupEmptyBatches();
    
    return events;
  }
  
  /**
   * 清理空批次
   */
  private cleanupEmptyBatches(): void {
    for (const [batchId, batch] of this.batches) {
      if (batch.quantity <= 0) {
        this.batchesByCompany.get(batch.companyId)?.delete(batchId);
        this.batchesByGoods.get(batch.goodsId)?.delete(batchId);
        this.batches.delete(batchId);
      }
    }
  }
  
  /**
   * 从库存中消耗（FIFO先进先出）
   */
  consumeFromInventory(
    companyId: number,
    goodsId: number,
    quantity: number
  ): { consumed: number; batches: Array<{ batchId: number; quantity: number }> } {
    const companyBatches = this.getCompanyGoodsBatches(companyId, goodsId);
    
    // 按创建时间排序（FIFO）
    companyBatches.sort((a, b) => a.createdTick - b.createdTick);
    
    let remaining = quantity;
    const consumedBatches: Array<{ batchId: number; quantity: number }> = [];
    
    for (const batch of companyBatches) {
      if (remaining <= 0) break;
      
      const toConsume = Math.min(batch.quantity, remaining);
      batch.quantity -= toConsume;
      remaining -= toConsume;
      
      consumedBatches.push({ batchId: batch.id, quantity: toConsume });
    }
    
    return {
      consumed: quantity - remaining,
      batches: consumedBatches,
    };
  }
  
  /**
   * 获取公司某商品的所有批次
   */
  getCompanyGoodsBatches(companyId: number, goodsId: number): InventoryBatch[] {
    const companyBatchIds = this.batchesByCompany.get(companyId);
    if (!companyBatchIds) return [];
    
    return Array.from(companyBatchIds)
      .map(id => this.batches.get(id))
      .filter((b): b is InventoryBatch => b !== undefined && b.goodsId === goodsId && b.quantity > 0);
  }
  
  /**
   * 获取公司总库存
   */
  getCompanyInventory(companyId: number): Map<number, { quantity: number; value: number; avgCondition: number }> {
    const inventory = new Map<number, { quantity: number; value: number; avgCondition: number }>();
    
    const batchIds = this.batchesByCompany.get(companyId);
    if (!batchIds) return inventory;
    
    for (const batchId of batchIds) {
      const batch = this.batches.get(batchId);
      if (!batch || batch.quantity <= 0) continue;
      
      const existing = inventory.get(batch.goodsId) ?? { quantity: 0, value: 0, avgCondition: 0 };
      const totalQty = existing.quantity + batch.quantity;
      existing.avgCondition = (existing.avgCondition * existing.quantity + batch.currentCondition * batch.quantity) / totalQty;
      existing.quantity = totalQty;
      existing.value += batch.quantity * batch.unitCost;
      
      inventory.set(batch.goodsId, existing);
    }
    
    return inventory;
  }
  
  /**
   * 获取即将过期的库存警告
   */
  getExpiryWarnings(companyId: number, currentTick: number, warningDays: number = 7): InventoryBatch[] {
    const warningTicks = warningDays * TICKS_PER_DAY;
    const batches = Array.from(this.batchesByCompany.get(companyId) ?? [])
      .map(id => this.batches.get(id))
      .filter((b): b is InventoryBatch => 
        b !== undefined && 
        b.quantity > 0 && 
        b.expiryTick > 0 && 
        b.expiryTick - currentTick <= warningTicks
      );
    
    return batches.sort((a, b) => a.expiryTick - b.expiryTick);
  }
  
  /**
   * 计算公司的日损耗成本
   */
  calculateDailyDecayCost(companyId: number): number {
    let totalCost = 0;
    
    const batchIds = this.batchesByCompany.get(companyId);
    if (!batchIds) return 0;
    
    for (const batchId of batchIds) {
      const batch = this.batches.get(batchId);
      if (!batch || batch.quantity <= 0) continue;
      
      const config = SHELF_LIFE_CONFIG_MAP.get(batch.goodsId);
      if (!config) continue;
      
      let decayRate = config.decayRate;
      if (!batch.isProperlyStored) {
        decayRate *= 3;
      }
      
      const storageInfo = STORAGE_CONDITIONS[batch.storageCondition];
      decayRate *= (1 - storageInfo.decayReduction);
      
      totalCost += batch.quantity * batch.unitCost * decayRate;
    }
    
    return totalCost;
  }
  
  /**
   * 获取损耗历史
   */
  getDecayHistory(companyId: number, ticksBack: number = TICKS_PER_DAY * 7): DecayEvent[] {
    const minTick = Math.max(0, this.decayHistory.length > 0 
      ? this.decayHistory[this.decayHistory.length - 1].tick - ticksBack 
      : 0);
    
    return this.decayHistory.filter(e => 
      e.companyId === companyId && e.tick >= minTick
    );
  }
}

// ==================== 单例实例 ====================

export const inventoryDecayManager = new InventoryDecayManager();

// ==================== 工具函数 ====================

/**
 * 获取商品的保质期配置
 */
export function getShelfLifeConfig(goodsId: number): ShelfLifeConfig | null {
  return SHELF_LIFE_CONFIG_MAP.get(goodsId) ?? null;
}

/**
 * 获取保质期类型名称
 */
export function getShelfLifeTypeName(type: ShelfLifeType): string {
  const names: Record<ShelfLifeType, string> = {
    [ShelfLifeType.PERMANENT]: '永久保存',
    [ShelfLifeType.LONG_TERM]: '长期保存',
    [ShelfLifeType.MEDIUM_TERM]: '中期保存',
    [ShelfLifeType.SHORT_TERM]: '短期保存',
    [ShelfLifeType.PERISHABLE]: '易腐烂',
    [ShelfLifeType.VOLATILE]: '极易变质',
  };
  return names[type];
}

/**
 * 格式化剩余保质期
 */
export function formatRemainingShelfLife(expiryTick: number, currentTick: number): string {
  if (expiryTick < 0) return '永久';
  
  const remainingTicks = expiryTick - currentTick;
  if (remainingTicks <= 0) return '已过期';
  
  const days = Math.floor(remainingTicks / TICKS_PER_DAY);
  
  if (days >= TICKS_PER_MONTH) {
    return `${Math.floor(days / TICKS_PER_MONTH)}个月`;
  }

  return `${days}天`;
}

/**
 * 获取存储条件信息
 */
export function getStorageConditionInfo(condition: StorageCondition) {
  return STORAGE_CONDITIONS[condition];
}
