/**
 * 游戏平衡性配置管理
 * 支持运行时修改参数，便于数值调优
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  AI_BATCH_SIZE,
  AI_BUY_ORDER_EXPIRY,
  AI_DECISION_INTERVAL,
  AI_SELL_ORDER_EXPIRY,
  BASE_INTEREST_RATE,
  BUILDING_MATERIAL_ORDER_EXPIRY,
  BUSINESS_CYCLE_AMPLITUDE,
  CONSTRUCTION_CANCEL_REFUND_RATE,
  DEMOLITION_CASH_RECOVERY_RATE,
  DEMOLITION_LEVEL_DEPRECIATION,
  DEMOLITION_MATERIAL_RECOVERY_RATE,
  DEMOLITION_YEAR_DEPRECIATION,
  INITIAL_GDP,
  INITIAL_POPULATION,
  MAX_CONCURRENT_CONSTRUCTIONS,
  MAX_CONSTRUCTION_QUEUE,
  MAX_PRICE_RATIO,
  MAX_TICK_PRICE_CHANGE,
  MEAN_REVERSION_RATE,
  MIN_PRICE_RATIO,
  NO_TRADE_REVERSION_MULTIPLIER,
  PLAYER_CREDIT_LIMIT,
  PLAYER_CREDIT_RATE,
  PLAYER_INITIAL_CASH,
  PLAYER_INITIAL_REPUTATION,
  RETAIL_MAX_CUSTOMER_RATE,
  RETAIL_MAX_TURNOVER_DAYS,
  RETAIL_PRICE_ADJUST_INTERVAL,
  RETAIL_RESTOCK_THRESHOLD,
  RETAIL_TARGET_STOCK_LEVEL,
  SUPPLY_DEMAND_SMOOTHING,
  TARGET_INFLATION,
  URGENT_ORDER_EXPIRY,
  VOLATILITY_DAMPENING,
} from '@/core/constants';

// ==================== 类型定义 ====================

/** 价格系统配置 */
export interface PriceConfig {
  maxTickPriceChange: number;      // 每tick最大价格变动 (0-1)
  meanReversionRate: number;       // 均值回归速率 (0-1)
  supplyDemandSmoothing: number;   // 供需平滑系数 (0-1)
  maxPriceRatio: number;           // 最大价格倍数
  minPriceRatio: number;           // 最小价格倍数
  volatilityDampening: number;     // 波动抑制系数
  noTradeReversionMultiplier: number; // 无成交时均值回归增强
}

/** AI配置 */
export interface AIConfig {
  decisionInterval: number;        // AI决策间隔 (tick)
  batchSize: number;               // 每tick处理AI批次大小
  buyOrderExpiry: number;          // 买单过期时间 (tick)
  sellOrderExpiry: number;         // 卖单过期时间 (tick)
  urgentOrderExpiry: number;       // 紧急订单过期时间
  buildingMaterialOrderExpiry: number; // 建造材料订单过期时间
}

/** 玩家初始配置 */
export interface PlayerConfig {
  initialCash: number;             // 初始现金
  creditLimit: number;             // 信用额度
  creditRate: number;              // 贷款利率
  initialReputation: number;       // 初始声望
}

/** 经济周期配置 */
export interface EconomyConfig {
  initialGDP: number;              // 初始GDP
  initialPopulation: number;       // 初始人口
  targetInflation: number;         // 目标通胀率
  baseInterestRate: number;        // 基准利率
  businessCycleAmplitude: number;  // 经济周期振幅
}

/** 零售系统配置 */
export interface RetailConfig {
  restockThreshold: number;        // 进货触发阈值
  targetStockLevel: number;        // 目标库存水平
  maxCustomerRate: number;         // 每tick最大客流比例
  priceAdjustInterval: number;     // 价格调整周期
  maxTurnoverDays: number;         // 最大库存周转天数
}

/** 建造系统配置 */
export interface ConstructionConfig {
  maxQueue: number;                // 最大建造队列
  maxConcurrent: number;           // 最大同时建造数
  cancelRefundRate: number;        // 取消退款比例
  levelDepreciation: number;       // 等级折旧率
  yearDepreciation: number;        // 年折旧率
  materialRecoveryRate: number;    // 材料回收率
  cashRecoveryRate: number;        // 现金回收率
}

/** 完整配置 */
export interface BalanceConfiguration {
  price: PriceConfig;
  ai: AIConfig;
  player: PlayerConfig;
  economy: EconomyConfig;
  retail: RetailConfig;
  construction: ConstructionConfig;
}

/** 预设配置 */
export type PresetName = 'default' | 'stable' | 'volatile' | 'easy' | 'hard';

// ==================== 默认配置 ====================

const DEFAULT_PRICE_CONFIG: PriceConfig = {
  maxTickPriceChange: MAX_TICK_PRICE_CHANGE,
  meanReversionRate: MEAN_REVERSION_RATE,
  supplyDemandSmoothing: SUPPLY_DEMAND_SMOOTHING,
  maxPriceRatio: MAX_PRICE_RATIO,
  minPriceRatio: MIN_PRICE_RATIO,
  volatilityDampening: VOLATILITY_DAMPENING,
  noTradeReversionMultiplier: NO_TRADE_REVERSION_MULTIPLIER,
};

const DEFAULT_AI_CONFIG: AIConfig = {
  decisionInterval: AI_DECISION_INTERVAL,
  batchSize: AI_BATCH_SIZE,
  buyOrderExpiry: AI_BUY_ORDER_EXPIRY,
  sellOrderExpiry: AI_SELL_ORDER_EXPIRY,
  urgentOrderExpiry: URGENT_ORDER_EXPIRY,
  buildingMaterialOrderExpiry: BUILDING_MATERIAL_ORDER_EXPIRY,
};

const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  initialCash: PLAYER_INITIAL_CASH,
  creditLimit: PLAYER_CREDIT_LIMIT,
  creditRate: PLAYER_CREDIT_RATE,
  initialReputation: PLAYER_INITIAL_REPUTATION,
};

const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  initialGDP: INITIAL_GDP,
  initialPopulation: INITIAL_POPULATION,
  targetInflation: TARGET_INFLATION,
  baseInterestRate: BASE_INTEREST_RATE,
  businessCycleAmplitude: BUSINESS_CYCLE_AMPLITUDE,
};

const DEFAULT_RETAIL_CONFIG: RetailConfig = {
  restockThreshold: RETAIL_RESTOCK_THRESHOLD,
  targetStockLevel: RETAIL_TARGET_STOCK_LEVEL,
  maxCustomerRate: RETAIL_MAX_CUSTOMER_RATE,
  priceAdjustInterval: RETAIL_PRICE_ADJUST_INTERVAL,
  maxTurnoverDays: RETAIL_MAX_TURNOVER_DAYS,
};

const DEFAULT_CONSTRUCTION_CONFIG: ConstructionConfig = {
  maxQueue: MAX_CONSTRUCTION_QUEUE,
  maxConcurrent: MAX_CONCURRENT_CONSTRUCTIONS,
  cancelRefundRate: CONSTRUCTION_CANCEL_REFUND_RATE,
  levelDepreciation: DEMOLITION_LEVEL_DEPRECIATION,
  yearDepreciation: DEMOLITION_YEAR_DEPRECIATION,
  materialRecoveryRate: DEMOLITION_MATERIAL_RECOVERY_RATE,
  cashRecoveryRate: DEMOLITION_CASH_RECOVERY_RATE,
};

const DEFAULT_CONFIG: BalanceConfiguration = {
  price: DEFAULT_PRICE_CONFIG,
  ai: DEFAULT_AI_CONFIG,
  player: DEFAULT_PLAYER_CONFIG,
  economy: DEFAULT_ECONOMY_CONFIG,
  retail: DEFAULT_RETAIL_CONFIG,
  construction: DEFAULT_CONSTRUCTION_CONFIG,
};

// ==================== 预设配置 ====================

const PRESETS: Record<PresetName, Partial<BalanceConfiguration>> = {
  default: {},
  
  // 稳定市场 - 降低波动性
  stable: {
    price: {
      ...DEFAULT_PRICE_CONFIG,
      maxTickPriceChange: 0.03,
      meanReversionRate: 0.01,
      supplyDemandSmoothing: 0.5,
      maxPriceRatio: 2.0,
      minPriceRatio: 0.5,
    },
  },
  
  // 波动市场 - 增加不确定性
  volatile: {
    price: {
      ...DEFAULT_PRICE_CONFIG,
      maxTickPriceChange: 0.15,
      meanReversionRate: 0.001,
      supplyDemandSmoothing: 0.2,
      maxPriceRatio: 8.0,
      minPriceRatio: 0.1,
    },
  },
  
  // 简单模式 - 更多资金，更慢的AI
  easy: {
    player: {
      ...DEFAULT_PLAYER_CONFIG,
      initialCash: 10_000_000,
      creditLimit: 2_000_000,
    },
    ai: {
      ...DEFAULT_AI_CONFIG,
      decisionInterval: 12,
      batchSize: 5,
    },
    price: {
      ...DEFAULT_PRICE_CONFIG,
      maxTickPriceChange: 0.05,
      meanReversionRate: 0.005,
    },
  },
  
  // 困难模式 - 更少资金，更快的AI
  hard: {
    player: {
      ...DEFAULT_PLAYER_CONFIG,
      initialCash: 2_000_000,
      creditLimit: 200_000,
    },
    ai: {
      ...DEFAULT_AI_CONFIG,
      decisionInterval: 4,
      batchSize: 15,
    },
    price: {
      ...DEFAULT_PRICE_CONFIG,
      maxTickPriceChange: 0.12,
      volatilityDampening: 0.05,
    },
  },
};

// ==================== Store 定义 ====================

interface BalanceState {
  config: BalanceConfiguration;
  activePreset: PresetName;
  isDirty: boolean;  // 配置是否被修改
  history: BalanceConfiguration[];  // 配置历史（用于撤销）
}

interface BalanceActions {
  // 配置管理
  setConfig: <K extends keyof BalanceConfiguration>(
    category: K,
    key: keyof BalanceConfiguration[K],
    value: number
  ) => void;
  
  setCategoryConfig: <K extends keyof BalanceConfiguration>(
    category: K,
    config: Partial<BalanceConfiguration[K]>
  ) => void;
  
  // 预设管理
  applyPreset: (preset: PresetName) => void;
  
  // 重置
  resetToDefault: () => void;
  resetCategory: <K extends keyof BalanceConfiguration>(category: K) => void;
  
  // 持久化
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  
  // 撤销
  undo: () => boolean;
  
  // 导入导出
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
  
  // 获取配置
  getConfig: () => BalanceConfiguration;
  getPresetConfig: (preset: PresetName) => BalanceConfiguration;
}

const STORAGE_KEY = 'game_balance_config';
const MAX_HISTORY = 20;

export const useBalanceStore = create<BalanceState & BalanceActions>()(
  immer((set, get) => ({
    config: { ...DEFAULT_CONFIG },
    activePreset: 'default',
    isDirty: false,
    history: [],
    
    setConfig: (category, key, value) => {
      set((state) => {
        // 保存历史
        state.history.push(JSON.parse(JSON.stringify(state.config)));
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        }
        
        // 更新配置
        (state.config[category] as any)[key] = value;
        state.isDirty = true;
        state.activePreset = 'default';  // 修改后不再是预设
      });
    },
    
    setCategoryConfig: (category, config) => {
      set((state) => {
        state.history.push(JSON.parse(JSON.stringify(state.config)));
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        }
        
        Object.assign(state.config[category], config);
        state.isDirty = true;
        state.activePreset = 'default';
      });
    },
    
    applyPreset: (preset) => {
      set((state) => {
        state.history.push(JSON.parse(JSON.stringify(state.config)));
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        }
        
        const presetConfig = PRESETS[preset];
        state.config = {
          price: { ...DEFAULT_PRICE_CONFIG, ...presetConfig.price },
          ai: { ...DEFAULT_AI_CONFIG, ...presetConfig.ai },
          player: { ...DEFAULT_PLAYER_CONFIG, ...presetConfig.player },
          economy: { ...DEFAULT_ECONOMY_CONFIG, ...presetConfig.economy },
          retail: { ...DEFAULT_RETAIL_CONFIG, ...presetConfig.retail },
          construction: { ...DEFAULT_CONSTRUCTION_CONFIG, ...presetConfig.construction },
        };
        state.activePreset = preset;
        state.isDirty = preset !== 'default';
      });
    },
    
    resetToDefault: () => {
      set((state) => {
        state.history.push(JSON.parse(JSON.stringify(state.config)));
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        }
        
        state.config = { ...DEFAULT_CONFIG };
        state.activePreset = 'default';
        state.isDirty = false;
      });
    },
    
    resetCategory: (category) => {
      set((state) => {
        state.history.push(JSON.parse(JSON.stringify(state.config)));
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        }
        
        switch (category) {
          case 'price':
            state.config.price = { ...DEFAULT_PRICE_CONFIG };
            break;
          case 'ai':
            state.config.ai = { ...DEFAULT_AI_CONFIG };
            break;
          case 'player':
            state.config.player = { ...DEFAULT_PLAYER_CONFIG };
            break;
          case 'economy':
            state.config.economy = { ...DEFAULT_ECONOMY_CONFIG };
            break;
          case 'retail':
            state.config.retail = { ...DEFAULT_RETAIL_CONFIG };
            break;
          case 'construction':
            state.config.construction = { ...DEFAULT_CONSTRUCTION_CONFIG };
            break;
        }
        state.isDirty = true;
        state.activePreset = 'default';
      });
    },
    
    saveToStorage: () => {
      const { config, activePreset } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, activePreset }));
    },
    
    loadFromStorage: () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { config, activePreset } = JSON.parse(saved);
          set((state) => {
            state.config = { ...DEFAULT_CONFIG, ...config };
            state.activePreset = activePreset || 'default';
            state.isDirty = false;
          });
          return true;
        }
      } catch (e) {
        console.error('Failed to load balance config:', e);
      }
      return false;
    },
    
    undo: () => {
      const { history } = get();
      if (history.length === 0) return false;
      
      set((state) => {
        const prevConfig = state.history.pop();
        if (prevConfig) {
          state.config = prevConfig;
          state.isDirty = true;
        }
      });
      return true;
    },
    
    exportConfig: () => {
      const { config, activePreset } = get();
      return JSON.stringify({ config, activePreset, exportedAt: Date.now() }, null, 2);
    },
    
    importConfig: (json) => {
      try {
        const data = JSON.parse(json);
        if (data.config) {
          set((state) => {
            state.history.push(JSON.parse(JSON.stringify(state.config)));
            if (state.history.length > MAX_HISTORY) {
              state.history.shift();
            }
            
            state.config = { ...DEFAULT_CONFIG, ...data.config };
            state.activePreset = data.activePreset || 'default';
            state.isDirty = true;
          });
          return true;
        }
      } catch (e) {
        console.error('Failed to import config:', e);
      }
      return false;
    },
    
    getConfig: () => get().config,
    
    getPresetConfig: (preset) => {
      const presetConfig = PRESETS[preset];
      return {
        price: { ...DEFAULT_PRICE_CONFIG, ...presetConfig.price },
        ai: { ...DEFAULT_AI_CONFIG, ...presetConfig.ai },
        player: { ...DEFAULT_PLAYER_CONFIG, ...presetConfig.player },
        economy: { ...DEFAULT_ECONOMY_CONFIG, ...presetConfig.economy },
        retail: { ...DEFAULT_RETAIL_CONFIG, ...presetConfig.retail },
        construction: { ...DEFAULT_CONSTRUCTION_CONFIG, ...presetConfig.construction },
      };
    },
  }))
);

// ==================== 配置元数据 ====================

export interface ConfigFieldMeta {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  format: 'percent' | 'number' | 'currency' | 'tick';
  unit?: string;
}

export const PRICE_CONFIG_META: ConfigFieldMeta[] = [
  { key: 'maxTickPriceChange', label: '最大价格变动', description: '每tick价格最大变动幅度', min: 0.01, max: 0.3, step: 0.01, format: 'percent' },
  { key: 'meanReversionRate', label: '均值回归速率', description: '价格向均值回归的速度', min: 0.001, max: 0.05, step: 0.001, format: 'percent' },
  { key: 'supplyDemandSmoothing', label: '供需平滑系数', description: '新数据在供需计算中的权重', min: 0.1, max: 0.9, step: 0.1, format: 'percent' },
  { key: 'maxPriceRatio', label: '最大价格倍数', description: '相对于基准价的最大倍数', min: 1.5, max: 10, step: 0.5, format: 'number', unit: 'x' },
  { key: 'minPriceRatio', label: '最小价格倍数', description: '相对于基准价的最小倍数', min: 0.05, max: 0.5, step: 0.05, format: 'number', unit: 'x' },
  { key: 'volatilityDampening', label: '波动抑制', description: '价格波动的抑制系数', min: 0.01, max: 0.3, step: 0.01, format: 'percent' },
  { key: 'noTradeReversionMultiplier', label: '无成交回归倍数', description: '无成交时均值回归的增强倍数', min: 1, max: 10, step: 0.5, format: 'number', unit: 'x' },
];

export const AI_CONFIG_META: ConfigFieldMeta[] = [
  { key: 'decisionInterval', label: 'AI决策间隔', description: 'AI做出决策的间隔时间', min: 1, max: 24, step: 1, format: 'tick', unit: 'tick' },
  { key: 'batchSize', label: '批处理大小', description: '每tick处理的AI数量', min: 1, max: 50, step: 1, format: 'number' },
  { key: 'buyOrderExpiry', label: '买单过期时间', description: '普通买单的存活时间', min: 1, max: 30, step: 1, format: 'tick', unit: '天' },
  { key: 'sellOrderExpiry', label: '卖单过期时间', description: '普通卖单的存活时间', min: 1, max: 30, step: 1, format: 'tick', unit: '天' },
  { key: 'urgentOrderExpiry', label: '紧急订单过期', description: '紧急订单的存活时间', min: 1, max: 14, step: 1, format: 'tick', unit: '天' },
  { key: 'buildingMaterialOrderExpiry', label: '建材订单过期', description: '建造材料订单的存活时间', min: 1, max: 60, step: 1, format: 'tick', unit: '天' },
];

export const PLAYER_CONFIG_META: ConfigFieldMeta[] = [
  { key: 'initialCash', label: '初始现金', description: '玩家开始游戏时的现金', min: 1_000_000, max: 50_000_000, step: 500_000, format: 'currency' },
  { key: 'creditLimit', label: '信用额度', description: '玩家可获得的最大贷款额度', min: 100_000, max: 50_000_000, step: 100_000, format: 'currency' },
  { key: 'creditRate', label: '贷款利率', description: '玩家贷款的年化利率', min: 0.01, max: 0.2, step: 0.01, format: 'percent' },
  { key: 'initialReputation', label: '初始声望', description: '玩家开始游戏时的声望值', min: 0, max: 100, step: 5, format: 'number' },
];

export const ECONOMY_CONFIG_META: ConfigFieldMeta[] = [
  { key: 'initialGDP', label: '初始GDP', description: '游戏开始时的经济规模', min: 1_000_000_000, max: 150_000_000_000_000, step: 100_000_000_000, format: 'currency' },
  { key: 'initialPopulation', label: '初始人口', description: '游戏开始时的人口数量', min: 100_000, max: 2_000_000_000, step: 1_000_000, format: 'number' },
  { key: 'targetInflation', label: '目标通胀率', description: '央行目标通胀率', min: 0, max: 0.1, step: 0.005, format: 'percent' },
  { key: 'baseInterestRate', label: '基准利率', description: '央行基准利率', min: 0, max: 0.15, step: 0.005, format: 'percent' },
  { key: 'businessCycleAmplitude', label: '经济周期振幅', description: '经济周期波动的幅度', min: 0.05, max: 0.3, step: 0.01, format: 'percent' },
];

export const RETAIL_CONFIG_META: ConfigFieldMeta[] = [
  { key: 'restockThreshold', label: '进货触发阈值', description: '库存低于此比例时触发进货', min: 0.1, max: 0.5, step: 0.05, format: 'percent' },
  { key: 'targetStockLevel', label: '目标库存水平', description: '进货时的目标库存比例', min: 0.5, max: 1.0, step: 0.05, format: 'percent' },
  { key: 'maxCustomerRate', label: '客流处理率', description: '每tick处理的最大客流比例', min: 0.05, max: 0.5, step: 0.05, format: 'percent' },
  { key: 'priceAdjustInterval', label: '价格调整周期', description: '零售价格调整的间隔', min: 6, max: 48, step: 6, format: 'tick', unit: 'tick' },
  { key: 'maxTurnoverDays', label: '最大周转天数', description: '超过此天数未售出将降价', min: 7, max: 90, step: 7, format: 'number', unit: '天' },
];

export const CONSTRUCTION_CONFIG_META: ConfigFieldMeta[] = [
  { key: 'maxQueue', label: '最大建造队列', description: '每个公司可排队的建筑数', min: 3, max: 20, step: 1, format: 'number' },
  { key: 'maxConcurrent', label: '最大同时建造', description: '可同时进行的建造数', min: 1, max: 5, step: 1, format: 'number' },
  { key: 'cancelRefundRate', label: '取消退款率', description: '取消建造时的退款比例', min: 0.5, max: 1.0, step: 0.05, format: 'percent' },
  { key: 'levelDepreciation', label: '等级折旧率', description: '建筑每升一级的折旧率', min: 0.01, max: 0.1, step: 0.01, format: 'percent' },
  { key: 'yearDepreciation', label: '年折旧率', description: '建筑每年的折旧率', min: 0.01, max: 0.1, step: 0.01, format: 'percent' },
  { key: 'materialRecoveryRate', label: '材料回收率', description: '拆除时材料的回收比例', min: 0.1, max: 0.8, step: 0.05, format: 'percent' },
  { key: 'cashRecoveryRate', label: '现金回收率', description: '拆除时现金的回收比例', min: 0.1, max: 0.5, step: 0.05, format: 'percent' },
];

export const CONFIG_CATEGORIES = [
  { key: 'price' as const, label: '价格系统', icon: '📈', meta: PRICE_CONFIG_META },
  { key: 'ai' as const, label: 'AI行为', icon: '🤖', meta: AI_CONFIG_META },
  { key: 'player' as const, label: '玩家设置', icon: '👤', meta: PLAYER_CONFIG_META },
  { key: 'economy' as const, label: '经济系统', icon: '💰', meta: ECONOMY_CONFIG_META },
  { key: 'retail' as const, label: '零售系统', icon: '🏪', meta: RETAIL_CONFIG_META },
  { key: 'construction' as const, label: '建造系统', icon: '🏗️', meta: CONSTRUCTION_CONFIG_META },
];

export const PRESET_LABELS: Record<PresetName, { label: string; description: string }> = {
  default: { label: '默认', description: '游戏原始设置' },
  stable: { label: '稳定市场', description: '降低价格波动，适合新手' },
  volatile: { label: '波动市场', description: '增加市场不确定性' },
  easy: { label: '简单模式', description: '更多资金，更慢的AI' },
  hard: { label: '困难模式', description: '更少资金，更快的AI' },
};
