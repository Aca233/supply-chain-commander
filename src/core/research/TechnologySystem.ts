/**
 * 科技研发系统
 * 提供技术研发功能，解锁新的建筑、配方和能力
 */

// ==================== 类型定义 ====================

/**
 * 科技分类
 */
export type TechnologyCategory =
  | 'production'    // 生产技术
  | 'logistics'     // 物流技术
  | 'automation'    // 自动化技术
  | 'quality'       // 品质技术
  | 'efficiency'    // 效率技术
  | 'market'        // 市场技术
  | 'finance';      // 金融技术

/**
 * 科技定义
 */
export interface Technology {
  id: number;
  key: string;
  name: string;
  description: string;
  category: TechnologyCategory;
  
  // 研发需求
  researchCost: number;        // 研发费用
  researchTime: number;        // 研发时间（tick）
  
  // 前置科技
  prerequisites: number[];      // 前置科技ID列表
  
  // 等级需求
  requiredLevel: number;        // 需要的公司等级（暂未使用）
  
  // 解锁内容
  unlocks: TechnologyUnlocks;
  
  // 科技效果
  effects: TechnologyEffects;
  
  // 位置（用于科技树可视化）
  tier: number;                 // 层级（1-5）
  position: number;             // 在层级中的位置
}

/**
 * 科技解锁内容
 */
export interface TechnologyUnlocks {
  buildings?: number[];          // 解锁的建筑ID
  recipes?: number[];            // 解锁的配方ID
  productionMethods?: number[];  // 解锁的生产方式ID
  features?: string[];           // 解锁的功能标识
}

/**
 * 科技效果
 */
export interface TechnologyEffects {
  productionBonus?: number;      // 全局生产加成
  efficiencyBonus?: number;      // 全局效率加成
  qualityBonus?: number;         // 全局品质加成
  costReduction?: number;        // 成本降低
  researchSpeedBonus?: number;   // 研发速度加成
  tradingBonus?: number;         // 交易加成
  storageBonus?: number;         // 存储加成
}

/**
 * 研发状态
 */
export interface ResearchState {
  currentResearchId: number | null;  // 当前研发的科技ID
  progress: number;                   // 研发进度（0-1）
  startTick: number;                  // 开始tick
  researchedTechs: Set<number>;       // 已研发的科技
  researchQueue: number[];            // 研发队列
}

// ==================== 科技定义 ====================

/**
 * 生产技术
 */
const PRODUCTION_TECHNOLOGIES: Technology[] = [
  {
    id: 1,
    key: 'basic_manufacturing',
    name: '基础制造工艺',
    description: '改进基础制造流程，提高生产效率',
    category: 'production',
    researchCost: 100000,
    researchTime: 48,
    prerequisites: [],
    requiredLevel: 1,
    unlocks: {
      features: ['advanced_recipes'],
    },
    effects: {
      productionBonus: 0,
    },
    tier: 1,
    position: 1,
  },
  {
    id: 2,
    key: 'advanced_smelting',
    name: '先进冶炼技术',
    description: '提高金属冶炼效率和产品质量',
    category: 'production',
    researchCost: 250000,
    researchTime: 96,
    prerequisites: [1],
    requiredLevel: 2,
    unlocks: {
      recipes: [78], // 高级钢材
    },
    effects: {
      productionBonus: 0,
      qualityBonus: 0,
    },
    tier: 2,
    position: 1,
  },
  {
    id: 3,
    key: 'precision_machining',
    name: '精密加工',
    description: '高精度加工技术，生产更高品质的零部件',
    category: 'production',
    researchCost: 500000,
    researchTime: 144,
    prerequisites: [2],
    requiredLevel: 3,
    unlocks: {
      productionMethods: [101, 102],
    },
    effects: {
      qualityBonus: 0,
      efficiencyBonus: 0,
    },
    tier: 3,
    position: 1,
  },
  {
    id: 4,
    key: 'mass_production',
    name: '规模化生产',
    description: '大规模标准化生产技术',
    category: 'production',
    researchCost: 1000000,
    researchTime: 240,
    prerequisites: [3],
    requiredLevel: 4,
    unlocks: {
      features: ['mass_production_mode'],
    },
    effects: {
      productionBonus: 0,
      costReduction: 0,
    },
    tier: 4,
    position: 1,
  },
];

/**
 * 物流技术
 */
const LOGISTICS_TECHNOLOGIES: Technology[] = [
  {
    id: 10,
    key: 'basic_logistics',
    name: '基础物流管理',
    description: '改善仓储和运输效率',
    category: 'logistics',
    researchCost: 80000,
    researchTime: 36,
    prerequisites: [],
    requiredLevel: 1,
    unlocks: {},
    effects: {
      storageBonus: 0,
    },
    tier: 1,
    position: 2,
  },
  {
    id: 11,
    key: 'inventory_optimization',
    name: '库存优化',
    description: '智能库存管理系统',
    category: 'logistics',
    researchCost: 200000,
    researchTime: 72,
    prerequisites: [10],
    requiredLevel: 2,
    unlocks: {},
    effects: {
      storageBonus: 0,
      costReduction: 0,
    },
    tier: 2,
    position: 2,
  },
  {
    id: 12,
    key: 'supply_chain_integration',
    name: '供应链整合',
    description: '端到端供应链管理',
    category: 'logistics',
    researchCost: 400000,
    researchTime: 120,
    prerequisites: [11],
    requiredLevel: 3,
    unlocks: {
      features: ['supply_contracts'],
    },
    effects: {
      tradingBonus: 0,
      costReduction: 0,
    },
    tier: 3,
    position: 2,
  },
];

/**
 * 自动化技术
 */
const AUTOMATION_TECHNOLOGIES: Technology[] = [
  {
    id: 20,
    key: 'basic_automation',
    name: '基础自动化',
    description: '引入基础自动化设备',
    category: 'automation',
    researchCost: 150000,
    researchTime: 60,
    prerequisites: [1],
    requiredLevel: 2,
    unlocks: {
      productionMethods: [103],
    },
    effects: {
      efficiencyBonus: 0,
    },
    tier: 2,
    position: 3,
  },
  {
    id: 21,
    key: 'robotic_assembly',
    name: '机器人装配',
    description: '机器人自动装配线',
    category: 'automation',
    researchCost: 500000,
    researchTime: 144,
    prerequisites: [20],
    requiredLevel: 3,
    unlocks: {},
    effects: {
      efficiencyBonus: 0,
      productionBonus: 0,
    },
    tier: 3,
    position: 3,
  },
  {
    id: 22,
    key: 'smart_factory',
    name: '智能工厂',
    description: '全面智能化生产系统',
    category: 'automation',
    researchCost: 2000000,
    researchTime: 360,
    prerequisites: [21, 4],
    requiredLevel: 5,
    unlocks: {
      features: ['smart_production'],
    },
    effects: {
      efficiencyBonus: 0,
      productionBonus: 0,
      costReduction: 0,
    },
    tier: 5,
    position: 2,
  },
];

/**
 * 品质技术
 */
const QUALITY_TECHNOLOGIES: Technology[] = [
  {
    id: 30,
    key: 'quality_control',
    name: '质量控制',
    description: '建立质量管理体系',
    category: 'quality',
    researchCost: 120000,
    researchTime: 48,
    prerequisites: [],
    requiredLevel: 1,
    unlocks: {},
    effects: {
      qualityBonus: 0,
    },
    tier: 1,
    position: 3,
  },
  {
    id: 31,
    key: 'premium_materials',
    name: '优质材料工艺',
    description: '使用更高品质的原材料',
    category: 'quality',
    researchCost: 300000,
    researchTime: 96,
    prerequisites: [30],
    requiredLevel: 2,
    unlocks: {
      recipes: [100], // 高品质产品配方
    },
    effects: {
      qualityBonus: 0,
    },
    tier: 2,
    position: 4,
  },
  {
    id: 32,
    key: 'luxury_craftsmanship',
    name: '奢华工艺',
    description: '顶级奢侈品制造工艺',
    category: 'quality',
    researchCost: 800000,
    researchTime: 192,
    prerequisites: [31],
    requiredLevel: 4,
    unlocks: {
      buildings: [36], // 奢侈品工坊
    },
    effects: {
      qualityBonus: 0,
    },
    tier: 4,
    position: 4,
  },
];

/**
 * 市场技术
 */
const MARKET_TECHNOLOGIES: Technology[] = [
  {
    id: 40,
    key: 'market_analysis',
    name: '市场分析',
    description: '深入了解市场需求和趋势',
    category: 'market',
    researchCost: 100000,
    researchTime: 36,
    prerequisites: [],
    requiredLevel: 1,
    unlocks: {
      features: ['market_insights'],
    },
    effects: {
      tradingBonus: 0,
    },
    tier: 1,
    position: 4,
  },
  {
    id: 41,
    key: 'brand_development',
    name: '品牌建设',
    description: '建立和发展企业品牌',
    category: 'market',
    researchCost: 250000,
    researchTime: 72,
    prerequisites: [40],
    requiredLevel: 2,
    unlocks: {
      features: ['brand_system'],
    },
    effects: {
      tradingBonus: 0,
    },
    tier: 2,
    position: 5,
  },
  {
    id: 42,
    key: 'global_distribution',
    name: '全球分销网络',
    description: '建立全球化销售渠道',
    category: 'market',
    researchCost: 600000,
    researchTime: 168,
    prerequisites: [41, 12],
    requiredLevel: 4,
    unlocks: {
      features: ['global_trade'],
    },
    effects: {
      tradingBonus: 0,
      storageBonus: 0,
    },
    tier: 4,
    position: 5,
  },
];

/**
 * 金融技术
 */
const FINANCE_TECHNOLOGIES: Technology[] = [
  {
    id: 50,
    key: 'financial_planning',
    name: '财务规划',
    description: '改善企业财务管理能力',
    category: 'finance',
    researchCost: 80000,
    researchTime: 24,
    prerequisites: [],
    requiredLevel: 1,
    unlocks: {
      features: ['advanced_loans'],
    },
    effects: {
      costReduction: 0,
    },
    tier: 1,
    position: 5,
  },
  {
    id: 51,
    key: 'investment_strategies',
    name: '投资策略',
    description: '优化资本运作和投资决策',
    category: 'finance',
    researchCost: 300000,
    researchTime: 96,
    prerequisites: [50],
    requiredLevel: 2,
    unlocks: {
      features: ['stock_trading'],
    },
    effects: {
      tradingBonus: 0,
    },
    tier: 2,
    position: 6,
  },
  {
    id: 52,
    key: 'merger_acquisition',
    name: '并购整合',
    description: '企业并购和整合能力',
    category: 'finance',
    researchCost: 1000000,
    researchTime: 240,
    prerequisites: [51],
    requiredLevel: 4,
    unlocks: {
      features: ['acquisitions'],
    },
    effects: {
      costReduction: 0,
    },
    tier: 4,
    position: 6,
  },
];

// ==================== 合并所有科技 ====================

export const ALL_TECHNOLOGIES: Technology[] = [
  ...PRODUCTION_TECHNOLOGIES,
  ...LOGISTICS_TECHNOLOGIES,
  ...AUTOMATION_TECHNOLOGIES,
  ...QUALITY_TECHNOLOGIES,
  ...MARKET_TECHNOLOGIES,
  ...FINANCE_TECHNOLOGIES,
];

// ID到科技的映射
export const TECHNOLOGIES_BY_ID: Map<number, Technology> = new Map(
  ALL_TECHNOLOGIES.map((t) => [t.id, t])
);

// Key到科技的映射
export const TECHNOLOGIES_BY_KEY: Map<string, Technology> = new Map(
  ALL_TECHNOLOGIES.map((t) => [t.key, t])
);

// 按类别分组
export const TECHNOLOGIES_BY_CATEGORY: Map<TechnologyCategory, Technology[]> = new Map([
  ['production', PRODUCTION_TECHNOLOGIES],
  ['logistics', LOGISTICS_TECHNOLOGIES],
  ['automation', AUTOMATION_TECHNOLOGIES],
  ['quality', QUALITY_TECHNOLOGIES],
  ['market', MARKET_TECHNOLOGIES],
  ['finance', FINANCE_TECHNOLOGIES],
]);

// ==================== 研发状态管理 ====================

// 每个公司的研发状态
const companyResearchStates: Map<number, ResearchState> = new Map();

/**
 * 获取或创建公司的研发状态
 */
export function getResearchState(companyId: number): ResearchState {
  let state = companyResearchStates.get(companyId);
  if (!state) {
    state = {
      currentResearchId: null,
      progress: 0,
      startTick: 0,
      researchedTechs: new Set([]),
      researchQueue: [],
    };
    companyResearchStates.set(companyId, state);
  }
  return state;
}

/**
 * 检查科技是否可研发
 */
export function canResearchTech(companyId: number, techId: number): { canResearch: boolean; reason?: string } {
  const state = getResearchState(companyId);
  const tech = TECHNOLOGIES_BY_ID.get(techId);
  
  if (!tech) {
    return { canResearch: false, reason: '科技不存在' };
  }
  
  // 检查是否已研发
  if (state.researchedTechs.has(techId)) {
    return { canResearch: false, reason: '已经研发过该科技' };
  }
  
  // 检查是否正在研发
  if (state.currentResearchId === techId) {
    return { canResearch: false, reason: '正在研发中' };
  }
  
  // 检查前置科技
  for (const prereqId of tech.prerequisites) {
    if (!state.researchedTechs.has(prereqId)) {
      const prereqTech = TECHNOLOGIES_BY_ID.get(prereqId);
      return { canResearch: false, reason: `需要先研发「${prereqTech?.name || '未知科技'}」` };
    }
  }
  
  return { canResearch: true };
}

/**
 * 开始研发科技
 */
export function startResearch(
  companyId: number,
  techId: number,
  currentTick: number,
  companyCash: number
): { success: boolean; reason?: string } {
  const check = canResearchTech(companyId, techId);
  if (!check.canResearch) {
    return { success: false, reason: check.reason };
  }
  
  const tech = TECHNOLOGIES_BY_ID.get(techId)!;
  const state = getResearchState(companyId);
  
  // 检查资金
  if (companyCash < tech.researchCost) {
    return { success: false, reason: `资金不足，需要 ¥${tech.researchCost.toLocaleString()}` };
  }
  
  // 如果已有研发项目，加入队列
  if (state.currentResearchId !== null) {
    if (!state.researchQueue.includes(techId)) {
      state.researchQueue.push(techId);
    }
    return { success: true, reason: '已加入研发队列' };
  }
  
  // 开始研发
  state.currentResearchId = techId;
  state.progress = 0;
  state.startTick = currentTick;
  
  return { success: true };
}

/**
 * 处理研发进度（每tick调用）
 */
export function processResearchTick(companyId: number, currentTick: number): {
  completed: boolean;
  completedTechId?: number;
  unlocks?: TechnologyUnlocks;
} {
  const state = getResearchState(companyId);
  
  if (state.currentResearchId === null) {
    return { completed: false };
  }
  
  const tech = TECHNOLOGIES_BY_ID.get(state.currentResearchId);
  if (!tech) {
    state.currentResearchId = null;
    return { completed: false };
  }
  
  // 计算进度
  const elapsedTicks = currentTick - state.startTick;
  state.progress = Math.min(1, elapsedTicks / tech.researchTime);
  
  // 检查是否完成
  if (state.progress >= 1) {
    const completedTechId = state.currentResearchId;
    state.researchedTechs.add(completedTechId);
    state.currentResearchId = null;
    state.progress = 0;
    
    // 检查队列中的下一个
    if (state.researchQueue.length > 0) {
      const nextTechId = state.researchQueue.shift()!;
      state.currentResearchId = nextTechId;
      state.startTick = currentTick;
    }
    
    return {
      completed: true,
      completedTechId,
      unlocks: tech.unlocks,
    };
  }
  
  return { completed: false };
}

/**
 * 取消研发
 */
export function cancelResearch(companyId: number, techId: number): boolean {
  const state = getResearchState(companyId);
  
  if (state.currentResearchId === techId) {
    state.currentResearchId = null;
    state.progress = 0;
    
    // 从队列开始下一个
    if (state.researchQueue.length > 0) {
      const nextTechId = state.researchQueue.shift()!;
      state.currentResearchId = nextTechId;
    }
    return true;
  }
  
  // 从队列中移除
  const queueIndex = state.researchQueue.indexOf(techId);
  if (queueIndex >= 0) {
    state.researchQueue.splice(queueIndex, 1);
    return true;
  }
  
  return false;
}

/**
 * 检查科技是否已研发
 */
export function isTechResearched(companyId: number, techId: number): boolean {
  const state = getResearchState(companyId);
  return state.researchedTechs.has(techId);
}

/**
 * 获取已研发的科技列表
 */
export function getResearchedTechs(companyId: number): number[] {
  const state = getResearchState(companyId);
  return Array.from(state.researchedTechs);
}

/**
 * 获取当前研发信息
 */
export function getCurrentResearch(companyId: number): {
  techId: number | null;
  progress: number;
  tech: Technology | null;
  remainingTicks: number;
} {
  const state = getResearchState(companyId);
  
  if (state.currentResearchId === null) {
    return { techId: null, progress: 0, tech: null, remainingTicks: 0 };
  }
  
  const tech = TECHNOLOGIES_BY_ID.get(state.currentResearchId) || null;
  const remainingTicks = tech ? Math.ceil(tech.researchTime * (1 - state.progress)) : 0;
  
  return {
    techId: state.currentResearchId,
    progress: state.progress,
    tech,
    remainingTicks,
  };
}

/**
 * 获取研发队列
 */
export function getResearchQueue(companyId: number): Technology[] {
  const state = getResearchState(companyId);
  return state.researchQueue
    .map((id) => TECHNOLOGIES_BY_ID.get(id))
    .filter((t): t is Technology => t !== undefined);
}

/**
 * 计算公司的科技效果加成
 */
export function calculateTechEffects(companyId: number): TechnologyEffects {
  const state = getResearchState(companyId);
  const effects: TechnologyEffects = {};
  
  for (const techId of state.researchedTechs) {
    const tech = TECHNOLOGIES_BY_ID.get(techId);
    if (!tech) continue;
    
    // 累加效果
    if (tech.effects.productionBonus) {
      effects.productionBonus = (effects.productionBonus || 0) + tech.effects.productionBonus;
    }
    if (tech.effects.efficiencyBonus) {
      effects.efficiencyBonus = (effects.efficiencyBonus || 0) + tech.effects.efficiencyBonus;
    }
    if (tech.effects.qualityBonus) {
      effects.qualityBonus = (effects.qualityBonus || 0) + tech.effects.qualityBonus;
    }
    if (tech.effects.costReduction) {
      effects.costReduction = (effects.costReduction || 0) + tech.effects.costReduction;
    }
    if (tech.effects.researchSpeedBonus) {
      effects.researchSpeedBonus = (effects.researchSpeedBonus || 0) + tech.effects.researchSpeedBonus;
    }
    if (tech.effects.tradingBonus) {
      effects.tradingBonus = (effects.tradingBonus || 0) + tech.effects.tradingBonus;
    }
    if (tech.effects.storageBonus) {
      effects.storageBonus = (effects.storageBonus || 0) + tech.effects.storageBonus;
    }
  }
  
  return effects;
}

/**
 * 获取可研发的科技列表
 */
export function getAvailableTechs(companyId: number): Technology[] {
  const state = getResearchState(companyId);
  
  return ALL_TECHNOLOGIES.filter((tech) => {
    // 排除已研发
    if (state.researchedTechs.has(tech.id)) return false;
    
    // 排除正在研发
    if (state.currentResearchId === tech.id) return false;
    
    // 排除队列中
    if (state.researchQueue.includes(tech.id)) return false;
    
    // 检查前置科技
    for (const prereqId of tech.prerequisites) {
      if (!state.researchedTechs.has(prereqId)) return false;
    }
    
    return true;
  });
}

/**
 * 获取科技分类的中文名
 */
export function getCategoryName(category: TechnologyCategory): string {
  const names: Record<TechnologyCategory, string> = {
    production: '生产技术',
    logistics: '物流技术',
    automation: '自动化',
    quality: '品质技术',
    efficiency: '效率技术',
    market: '市场技术',
    finance: '金融技术',
  };
  return names[category];
}

/**
 * 获取科技分类的图标
 */
export function getCategoryIcon(category: TechnologyCategory): string {
  const icons: Record<TechnologyCategory, string> = {
    production: '🏭',
    logistics: '🚚',
    automation: '🤖',
    quality: '⭐',
    efficiency: '⚡',
    market: '📈',
    finance: '💰',
  };
  return icons[category];
}

/**
 * 初始化玩家的默认科技（游戏开始时已拥有的基础科技）
 */
export function initializePlayerTechs(companyId: number): void {
  // 玩家初始不拥有任何科技，需要从头研发
  // 但可以根据需要添加一些基础科技
  getResearchState(companyId); // 确保状态存在
}