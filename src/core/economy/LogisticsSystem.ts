/**
 * 物流运输成本系统
 * 模拟商品运输的成本和时间因素
 */

// ==================== 类型定义 ====================

/**
 * 运输方式
 */
export enum TransportMode {
  ROAD = 'road',       // 公路运输
  RAIL = 'rail',       // 铁路运输
  SEA = 'sea',         // 海运
  AIR = 'air',         // 空运
  PIPELINE = 'pipeline', // 管道运输
}

/**
 * 运输方式配置
 */
export interface TransportModeConfig {
  mode: TransportMode;
  name: string;
  description: string;
  
  // 成本参数
  baseCostPerUnit: number;     // 每单位基础运费
  costPerDistance: number;     // 每单位距离成本
  fixedCost: number;           // 固定成本
  
  // 时间参数
  baseTimeHours: number;       // 基础运输时间（小时）
  speedKmPerHour: number;      // 速度
  
  // 容量参数
  minQuantity: number;         // 最小运输量
  maxQuantity: number;         // 最大单次运输量
  
  // 限制
  applicableGoods: number[];   // 适用商品（空表示通用）
  excludedGoods: number[];     // 排除商品
  
  // 可靠性
  reliability: number;         // 可靠性 0-1
  damageRisk: number;          // 损坏风险 0-1
}

/**
 * 运输订单
 */
export interface ShipmentOrder {
  id: number;
  companyId: number;
  goodsId: number;
  quantity: number;
  mode: TransportMode;
  
  // 路径
  sourceType: 'building' | 'market' | 'warehouse';
  sourceId: number;
  destType: 'building' | 'market' | 'warehouse';
  destId: number;
  distance: number;
  
  // 成本
  totalCost: number;
  insuranceCost: number;
  
  // 时间
  createdTick: number;
  estimatedArrivalTick: number;
  actualArrivalTick?: number;
  
  // 状态
  status: ShipmentStatus;
  damagedQuantity: number;
}

/**
 * 运输状态
 */
export enum ShipmentStatus {
  PENDING = 'pending',         // 待发运
  IN_TRANSIT = 'in_transit',   // 运输中
  DELIVERED = 'delivered',     // 已送达
  DAMAGED = 'damaged',         // 有损坏
  LOST = 'lost',               // 丢失
  CANCELLED = 'cancelled',     // 已取消
}

/**
 * 物流成本计算结果
 */
export interface LogisticsCost {
  transportCost: number;       // 运输成本
  handlingCost: number;        // 装卸成本
  insuranceCost: number;       // 保险成本
  storageCost: number;         // 仓储成本
  totalCost: number;
  costPerUnit: number;
  estimatedHours: number;
}

// ==================== 运输方式配置 ====================

export const TRANSPORT_MODES: Record<TransportMode, TransportModeConfig> = {
  [TransportMode.ROAD]: {
    mode: TransportMode.ROAD,
    name: '公路运输',
    description: '灵活快速，适合中短途和小批量',
    baseCostPerUnit: 0.5,
    costPerDistance: 0.02,
    fixedCost: 100,
    baseTimeHours: 2,
    speedKmPerHour: 60,
    minQuantity: 1,
    maxQuantity: 500,
    applicableGoods: [],
    excludedGoods: [],
    reliability: 0.95,
    damageRisk: 0.02,
  },
  [TransportMode.RAIL]: {
    mode: TransportMode.RAIL,
    name: '铁路运输',
    description: '大批量运输，成本效益高',
    baseCostPerUnit: 0.2,
    costPerDistance: 0.008,
    fixedCost: 500,
    baseTimeHours: 6,
    speedKmPerHour: 80,
    minQuantity: 100,
    maxQuantity: 5000,
    applicableGoods: [],
    excludedGoods: [24, 25], // 不适合易腐食品
    reliability: 0.98,
    damageRisk: 0.01,
  },
  [TransportMode.SEA]: {
    mode: TransportMode.SEA,
    name: '海运',
    description: '超大批量，成本最低但速度慢',
    baseCostPerUnit: 0.08,
    costPerDistance: 0.002,
    fixedCost: 2000,
    baseTimeHours: 48,
    speedKmPerHour: 30,
    minQuantity: 500,
    maxQuantity: 50000,
    applicableGoods: [],
    excludedGoods: [24, 25, 37], // 不适合易腐和药品
    reliability: 0.92,
    damageRisk: 0.03,
  },
  [TransportMode.AIR]: {
    mode: TransportMode.AIR,
    name: '空运',
    description: '速度最快，适合高价值和紧急货物',
    baseCostPerUnit: 3.0,
    costPerDistance: 0.05,
    fixedCost: 1000,
    baseTimeHours: 1,
    speedKmPerHour: 500,
    minQuantity: 1,
    maxQuantity: 200,
    applicableGoods: [27, 35, 36, 37, 38], // 电子、珠宝、奢侈品、医药
    excludedGoods: [3, 4, 14], // 不适合大宗商品
    reliability: 0.99,
    damageRisk: 0.005,
  },
  [TransportMode.PIPELINE]: {
    mode: TransportMode.PIPELINE,
    name: '管道运输',
    description: '液体和气体的专用运输',
    baseCostPerUnit: 0.05,
    costPerDistance: 0.001,
    fixedCost: 0,
    baseTimeHours: 0.5,
    speedKmPerHour: 100,
    minQuantity: 100,
    maxQuantity: 100000,
    applicableGoods: [4, 5, 12], // 原油、天然气、化学品
    excludedGoods: [],
    reliability: 0.995,
    damageRisk: 0.001,
  },
};

// ==================== 商品运输特性 ====================

/**
 * 商品运输特性
 */
export interface GoodsTransportProperties {
  goodsId: number;
  weightPerUnit: number;       // 每单位重量(kg)
  volumePerUnit: number;       // 每单位体积(m³)
  fragility: number;           // 易碎程度 0-1
  perishability: number;       // 易腐程度 0-1
  hazardLevel: number;         // 危险等级 0-3
  valueDensity: number;        // 价值密度（价格/重量）
  preferredModes: TransportMode[];  // 首选运输方式
}

/**
 * 商品运输特性配置
 */
const GOODS_TRANSPORT_PROPERTIES: Map<number, GoodsTransportProperties> = new Map([
  // 矿石类 - 重，不易损
  [0, { goodsId: 0, weightPerUnit: 100, volumePerUnit: 0.1, fragility: 0, perishability: 0, hazardLevel: 0, valueDensity: 0.5, preferredModes: [TransportMode.RAIL, TransportMode.SEA] }],
  [1, { goodsId: 1, weightPerUnit: 80, volumePerUnit: 0.08, fragility: 0, perishability: 0, hazardLevel: 0, valueDensity: 1, preferredModes: [TransportMode.RAIL, TransportMode.SEA] }],
  [3, { goodsId: 3, weightPerUnit: 70, volumePerUnit: 0.15, fragility: 0, perishability: 0, hazardLevel: 1, valueDensity: 0.3, preferredModes: [TransportMode.RAIL, TransportMode.SEA] }],
  
  // 液体/气体 - 管道优先
  [4, { goodsId: 4, weightPerUnit: 50, volumePerUnit: 0.06, fragility: 0, perishability: 0, hazardLevel: 2, valueDensity: 2, preferredModes: [TransportMode.PIPELINE, TransportMode.SEA] }],
  [5, { goodsId: 5, weightPerUnit: 10, volumePerUnit: 0.5, fragility: 0, perishability: 0, hazardLevel: 2, valueDensity: 1.5, preferredModes: [TransportMode.PIPELINE] }],
  
  // 食品 - 易腐，需要快速
  [8, { goodsId: 8, weightPerUnit: 30, volumePerUnit: 0.05, fragility: 0.2, perishability: 0.5, hazardLevel: 0, valueDensity: 0.5, preferredModes: [TransportMode.ROAD, TransportMode.RAIL] }],
  [24, { goodsId: 24, weightPerUnit: 10, volumePerUnit: 0.02, fragility: 0.3, perishability: 0.8, hazardLevel: 0, valueDensity: 2, preferredModes: [TransportMode.ROAD] }],
  [25, { goodsId: 25, weightPerUnit: 8, volumePerUnit: 0.01, fragility: 0.5, perishability: 0.6, hazardLevel: 0, valueDensity: 3, preferredModes: [TransportMode.ROAD] }],
  
  // 电子产品 - 高价值，易碎
  [27, { goodsId: 27, weightPerUnit: 2, volumePerUnit: 0.01, fragility: 0.7, perishability: 0, hazardLevel: 0, valueDensity: 100, preferredModes: [TransportMode.AIR, TransportMode.ROAD] }],
  
  // 汽车 - 大件
  [28, { goodsId: 28, weightPerUnit: 1500, volumePerUnit: 10, fragility: 0.3, perishability: 0, hazardLevel: 0, valueDensity: 20, preferredModes: [TransportMode.ROAD, TransportMode.RAIL] }],
  
  // 奢侈品/珠宝 - 极高价值
  [35, { goodsId: 35, weightPerUnit: 0.1, volumePerUnit: 0.0001, fragility: 0.4, perishability: 0, hazardLevel: 0, valueDensity: 10000, preferredModes: [TransportMode.AIR] }],
  [36, { goodsId: 36, weightPerUnit: 1, volumePerUnit: 0.005, fragility: 0.6, perishability: 0, hazardLevel: 0, valueDensity: 5000, preferredModes: [TransportMode.AIR] }],
  
  // 药品 - 需要温控
  [37, { goodsId: 37, weightPerUnit: 0.5, volumePerUnit: 0.002, fragility: 0.5, perishability: 0.3, hazardLevel: 1, valueDensity: 2000, preferredModes: [TransportMode.AIR, TransportMode.ROAD] }],
]);

// ==================== 物流管理类 ====================

export class LogisticsManager {
  private shipments: Map<number, ShipmentOrder> = new Map();
  private nextShipmentId: number = 1;
  private activeShipments: Set<number> = new Set();
  
  /**
   * 计算运输成本
   */
  calculateCost(
    goodsId: number,
    quantity: number,
    distance: number,
    mode: TransportMode
  ): LogisticsCost {
    const modeConfig = TRANSPORT_MODES[mode];
    const goodsProps = GOODS_TRANSPORT_PROPERTIES.get(goodsId);
    
    // 基础运输成本
    let transportCost = modeConfig.fixedCost;
    transportCost += quantity * modeConfig.baseCostPerUnit;
    transportCost += quantity * distance * modeConfig.costPerDistance;
    
    // 重量因素
    if (goodsProps) {
      const weight = quantity * goodsProps.weightPerUnit;
      transportCost *= 1 + (weight / 10000) * 0.1;
    }
    
    // 装卸成本
    let handlingCost = quantity * 0.1;
    if (goodsProps && goodsProps.fragility > 0.5) {
      handlingCost *= 1.5;  // 易碎品额外小心
    }
    
    // 保险成本（基于价值和风险）
    const baseValue = quantity * (goodsProps?.valueDensity ?? 10);
    const riskFactor = modeConfig.damageRisk + (goodsProps?.fragility ?? 0) * 0.1;
    const insuranceCost = baseValue * riskFactor * 0.05;
    
    // 危险品附加费
    if (goodsProps && goodsProps.hazardLevel > 0) {
      transportCost *= 1 + goodsProps.hazardLevel * 0.2;
    }
    
    // 易腐品急运附加费
    if (goodsProps && goodsProps.perishability > 0.5) {
      transportCost *= 1.3;
    }
    
    const totalCost = transportCost + handlingCost + insuranceCost;
    
    // 计算预计时间
    const estimatedHours = modeConfig.baseTimeHours + distance / modeConfig.speedKmPerHour;
    
    return {
      transportCost,
      handlingCost,
      insuranceCost,
      storageCost: 0,
      totalCost,
      costPerUnit: totalCost / quantity,
      estimatedHours,
    };
  }
  
  /**
   * 获取最优运输方式
   */
  getOptimalMode(
    goodsId: number,
    quantity: number,
    distance: number,
    priority: 'cost' | 'speed' | 'safety' = 'cost'
  ): { mode: TransportMode; cost: LogisticsCost } {
    const goodsProps = GOODS_TRANSPORT_PROPERTIES.get(goodsId);
    const availableModes = this.getAvailableModes(goodsId, quantity);
    
    let bestMode = TransportMode.ROAD;
    let bestCost = this.calculateCost(goodsId, quantity, distance, TransportMode.ROAD);
    let bestScore = Infinity;
    
    for (const mode of availableModes) {
      const cost = this.calculateCost(goodsId, quantity, distance, mode);
      let score: number;
      
      switch (priority) {
        case 'cost':
          score = cost.totalCost;
          break;
        case 'speed':
          score = cost.estimatedHours * 1000 + cost.totalCost;
          break;
        case 'safety':
          const modeConfig = TRANSPORT_MODES[mode];
          score = (1 - modeConfig.reliability) * 10000 + modeConfig.damageRisk * 10000 + cost.totalCost;
          break;
      }
      
      if (score < bestScore) {
        bestScore = score;
        bestMode = mode;
        bestCost = cost;
      }
    }
    
    return { mode: bestMode, cost: bestCost };
  }
  
  /**
   * 获取可用运输方式
   */
  getAvailableModes(goodsId: number, quantity: number): TransportMode[] {
    const available: TransportMode[] = [];
    
    for (const [mode, config] of Object.entries(TRANSPORT_MODES)) {
      // 检查数量限制
      if (quantity < config.minQuantity || quantity > config.maxQuantity) {
        continue;
      }
      
      // 检查商品限制
      if (config.excludedGoods.includes(goodsId)) {
        continue;
      }
      
      if (config.applicableGoods.length > 0 && !config.applicableGoods.includes(goodsId)) {
        continue;
      }
      
      available.push(mode as TransportMode);
    }
    
    return available;
  }
  
  /**
   * 创建运输订单
   */
  createShipment(
    companyId: number,
    goodsId: number,
    quantity: number,
    mode: TransportMode,
    distance: number,
    currentTick: number
  ): ShipmentOrder {
    const cost = this.calculateCost(goodsId, quantity, distance, mode);
    const shipmentId = this.nextShipmentId++;
    
    const shipment: ShipmentOrder = {
      id: shipmentId,
      companyId,
      goodsId,
      quantity,
      mode,
      sourceType: 'warehouse',
      sourceId: 0,
      destType: 'warehouse',
      destId: 0,
      distance,
      totalCost: cost.totalCost,
      insuranceCost: cost.insuranceCost,
      createdTick: currentTick,
      estimatedArrivalTick: currentTick + Math.ceil(cost.estimatedHours),
      status: ShipmentStatus.PENDING,
      damagedQuantity: 0,
    };
    
    this.shipments.set(shipmentId, shipment);
    this.activeShipments.add(shipmentId);
    
    return shipment;
  }
  
  /**
   * 更新运输状态
   */
  updateShipments(currentTick: number): ShipmentOrder[] {
    const arrivals: ShipmentOrder[] = [];
    
    for (const shipmentId of this.activeShipments) {
      const shipment = this.shipments.get(shipmentId);
      if (!shipment) continue;
      
      if (shipment.status === ShipmentStatus.PENDING) {
        shipment.status = ShipmentStatus.IN_TRANSIT;
      }
      
      if (shipment.status === ShipmentStatus.IN_TRANSIT) {
        if (currentTick >= shipment.estimatedArrivalTick) {
          // 模拟损坏
          const modeConfig = TRANSPORT_MODES[shipment.mode];
          const goodsProps = GOODS_TRANSPORT_PROPERTIES.get(shipment.goodsId);
          
          const damageChance = modeConfig.damageRisk + (goodsProps?.fragility ?? 0) * 0.05;
          if (Math.random() < damageChance) {
            const damageRatio = Math.random() * 0.1;
            shipment.damagedQuantity = shipment.quantity * damageRatio;
            shipment.status = ShipmentStatus.DAMAGED;
          } else {
            shipment.status = ShipmentStatus.DELIVERED;
          }
          
          shipment.actualArrivalTick = currentTick;
          this.activeShipments.delete(shipmentId);
          arrivals.push(shipment);
        }
      }
    }
    
    return arrivals;
  }
  
  /**
   * 获取公司的活跃运输
   */
  getCompanyShipments(companyId: number): ShipmentOrder[] {
    return Array.from(this.shipments.values())
      .filter(s => s.companyId === companyId && this.activeShipments.has(s.id));
  }
}

// ==================== 单例实例 ====================

export const logisticsManager = new LogisticsManager();

// ==================== 工具函数 ====================

/**
 * 获取运输方式名称
 */
export function getTransportModeName(mode: TransportMode): string {
  return TRANSPORT_MODES[mode].name;
}

/**
 * 获取商品的运输特性
 */
export function getGoodsTransportProperties(goodsId: number): GoodsTransportProperties | null {
  return GOODS_TRANSPORT_PROPERTIES.get(goodsId) ?? null;
}

/**
 * 格式化物流成本
 */
export function formatLogisticsCost(cost: LogisticsCost): string {
  return `运费: ¥${cost.transportCost.toFixed(0)} + 装卸: ¥${cost.handlingCost.toFixed(0)} + 保险: ¥${cost.insuranceCost.toFixed(0)} = ¥${cost.totalCost.toFixed(0)} (${cost.estimatedHours.toFixed(1)}小时)`;
}