/**
 * 世界状态修改器
 * 实现"上帝模式"的核心干预能力
 *
 * v4.0更新：recipeIds改为outputModeIds
 */

import { GameWorld } from '@/core/world/GameWorld';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, MAX_SLOTS } from '@/core/constants';
import { releaseBuildingWorkforce } from '@/core/labor/LaborSystem';
import { getDefaultSlotMethods } from '@/core/production/ProductionMethods';
import { GOODS_ALIASES, BUILDING_ALIASES } from './GodModePrompt';

/**
 * 干预结果
 */
export interface InterventionResult {
  success: boolean;
  message: string;
  effects: string[];
  data?: unknown;
}

// ==================== 价格干预 ====================

/**
 * 直接设定商品价格
 */
export function setPrice(world: GameWorld, goodsId: number, newPrice: number): InterventionResult {
  if (goodsId < 0 || goodsId >= world.goods.count) {
    return { success: false, message: '无效的商品ID', effects: [] };
  }
  
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const oldPrice = world.goods.prices[goodsId];
  world.goods.prices[goodsId] = Math.max(0.01, newPrice);
  
  const change = ((newPrice - oldPrice) / oldPrice * 100).toFixed(1);
  
  return {
    success: true,
    message: `${goods?.name || '商品'} 价格已设定`,
    effects: [
      `💰 ${goods?.name}: ¥${oldPrice.toFixed(2)} → ¥${newPrice.toFixed(2)} (${change}%)`
    ],
  };
}

/**
 * 按百分比调整价格
 */
export function adjustPrice(world: GameWorld, goodsId: number, percent: number): InterventionResult {
  if (goodsId < 0 || goodsId >= world.goods.count) {
    return { success: false, message: '无效的商品ID', effects: [] };
  }
  
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const oldPrice = world.goods.prices[goodsId];
  const newPrice = oldPrice * (1 + percent / 100);
  world.goods.prices[goodsId] = Math.max(0.01, newPrice);
  
  const icon = percent >= 0 ? '📈' : '📉';
  
  return {
    success: true,
    message: `${goods?.name || '商品'} 价格已调整`,
    effects: [
      `${icon} ${goods?.name}: ¥${oldPrice.toFixed(2)} → ¥${newPrice.toFixed(2)} (${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%)`
    ],
  };
}

/**
 * 调整所有商品价格
 */
export function adjustAllPrices(world: GameWorld, percent: number): InterventionResult {
  const effects: string[] = [];
  
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const oldPrice = world.goods.prices[i];
    const newPrice = oldPrice * (1 + percent / 100);
    world.goods.prices[i] = Math.max(0.01, newPrice);
  }
  
  const icon = percent >= 0 ? '📈' : '📉';
  effects.push(`${icon} 所有商品价格 ${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`);
  
  return {
    success: true,
    message: '全局价格已调整',
    effects,
  };
}

/**
 * 触发价格冲击
 */
export function triggerPriceShock(
  world: GameWorld,
  goodsId: number,
  type: 'surge' | 'crash'
): InterventionResult {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const oldPrice = world.goods.prices[goodsId];
  
  // 冲击幅度：暴涨 +50%~+200%，暴跌 -30%~-70%
  const magnitude = type === 'surge'
    ? 0.5 + Math.random() * 1.5
    : -(0.3 + Math.random() * 0.4);
  
  const newPrice = oldPrice * (1 + magnitude);
  world.goods.prices[goodsId] = Math.max(0.01, newPrice);
  
  // 同时调整供需
  if (type === 'surge') {
    world.goods.demands[goodsId] *= 2;
    world.goods.supplies[goodsId] *= 0.5;
  } else {
    world.goods.demands[goodsId] *= 0.5;
    world.goods.supplies[goodsId] *= 2;
  }
  
  const icon = type === 'surge' ? '🚀' : '💥';
  
  return {
    success: true,
    message: `${goods?.name} ${type === 'surge' ? '暴涨' : '暴跌'}`,
    effects: [
      `${icon} ${goods?.name}: ¥${oldPrice.toFixed(2)} → ¥${newPrice.toFixed(2)}`,
      type === 'surge' ? '📈 需求激增，供给短缺' : '📉 需求萎缩，供给过剩',
    ],
  };
}

// ==================== 公司干预 ====================

/**
 * 设定公司现金
 */
export function setCompanyCash(world: GameWorld, companyId: number, amount: number): InterventionResult {
  if (companyId < 0 || companyId >= world.companies.count) {
    return { success: false, message: '无效的公司ID', effects: [] };
  }
  
  const oldCash = world.companies.cash[companyId];
  world.companies.cash[companyId] = Math.max(0, amount);
  
  const companyName = companyId === 0 ? '玩家公司' : `公司 #${companyId}`;
  const change = amount - oldCash;
  const icon = change >= 0 ? '💰' : '💸';
  
  return {
    success: true,
    message: `${companyName} 资金已调整`,
    effects: [
      `${icon} ${companyName}: ¥${oldCash.toLocaleString()} → ¥${amount.toLocaleString()} (${change >= 0 ? '+' : ''}¥${change.toLocaleString()})`
    ],
  };
}

/**
 * 调整公司现金
 */
export function adjustCompanyCash(world: GameWorld, companyId: number, amount: number): InterventionResult {
  if (companyId < 0 || companyId >= world.companies.count) {
    return { success: false, message: '无效的公司ID', effects: [] };
  }
  
  const oldCash = world.companies.cash[companyId];
  const newCash = Math.max(0, oldCash + amount);
  world.companies.cash[companyId] = newCash;
  
  const companyName = companyId === 0 ? '玩家公司' : `公司 #${companyId}`;
  const icon = amount >= 0 ? '✨' : '💸';
  const action = amount >= 0 ? '获得' : '失去';
  
  return {
    success: true,
    message: `${companyName} ${action} ¥${Math.abs(amount).toLocaleString()}`,
    effects: [
      `${icon} ${companyName} ${action} ¥${Math.abs(amount).toLocaleString()}`,
      `💰 当前资金: ¥${newCash.toLocaleString()}`
    ],
  };
}

/**
 * 破产公司
 */
export function bankruptCompany(world: GameWorld, companyId: number): InterventionResult {
  // 验证 companyId 是否有效
  const numCompanyId = Number(companyId);
  if (isNaN(numCompanyId) || numCompanyId < 0 || numCompanyId >= world.companies.count) {
    return { success: false, message: `无效的公司ID: ${companyId}`, effects: [] };
  }
  
  if (numCompanyId === 0) {
    return { success: false, message: '不能破产玩家公司（游戏结束条件）', effects: [] };
  }
  
  const effects: string[] = [];
  
  // 清空现金
  world.companies.cash[numCompanyId] = 0;
  effects.push('💸 资金清零');
  
  // 清空库存
  for (let i = 0; i < GOODS_COUNT; i++) {
    world.companies.inventories[numCompanyId * GOODS_COUNT + i] = 0;
  }
  effects.push('📦 库存清空');
  
  // 摧毁所有建筑并释放劳动力
  let destroyedCount = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === numCompanyId) {
      world.buildings.isActive[i] = 0;
      releaseBuildingWorkforce(world, i);
      destroyedCount++;
    }
  }
  if (destroyedCount > 0) {
    effects.push(`🏭 ${destroyedCount} 座建筑停止运营`);
  }
  
  return {
    success: true,
    message: `公司 #${numCompanyId} 已破产`,
    effects: ['💀 公司破产', ...effects],
  };
}

/**
 * 破产所有AI公司
 */
export function bankruptAllCompanies(world: GameWorld): InterventionResult {
  const effects: string[] = [];
  let bankruptCount = 0;
  let totalBuildingsDestroyed = 0;
  
  // 遍历所有AI公司（跳过玩家公司 id=0）
  for (let companyId = 1; companyId < world.companies.count; companyId++) {
    // 清空现金
    world.companies.cash[companyId] = 0;
    
    // 清空库存
    for (let i = 0; i < GOODS_COUNT; i++) {
      world.companies.inventories[companyId * GOODS_COUNT + i] = 0;
    }
    
    // 摧毁所有建筑并释放劳动力
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
        world.buildings.isActive[i] = 0;
        releaseBuildingWorkforce(world, i);
        totalBuildingsDestroyed++;
      }
    }
    
    bankruptCount++;
  }
  
  effects.push(`💀 ${bankruptCount} 家AI公司破产`);
  effects.push(`💸 所有竞争对手资金清零`);
  effects.push(`📦 所有竞争对手库存清空`);
  if (totalBuildingsDestroyed > 0) {
    effects.push(`🏭 ${totalBuildingsDestroyed} 座建筑被摧毁`);
  }
  effects.push(`👑 玩家成为唯一幸存者！`);
  
  return {
    success: true,
    message: `所有AI公司已破产`,
    effects: ['🌪️ 商业大清洗', ...effects],
  };
}

// ==================== 建筑干预 ====================

/**
 * 摧毁建筑
 */
export function destroyBuilding(world: GameWorld, buildingId: number): InterventionResult {
  if (buildingId < 0 || buildingId >= world.buildings.count) {
    return { success: false, message: '无效的建筑ID', effects: [] };
  }
  
  const typeId = world.buildings.types[buildingId];
  const building = ALL_BUILDINGS.find(b => b.id === typeId);
  const owner = world.buildings.owners[buildingId];
  
  // 标记为非激活（软删除）并释放劳动力
  world.buildings.isActive[buildingId] = 0;
  releaseBuildingWorkforce(world, buildingId);
  
  const ownerName = owner === 0 ? '玩家' : `公司 #${owner}`;
  
  return {
    success: true,
    message: `${building?.name || '建筑'} 已被摧毁`,
    effects: [
      `🔥 ${building?.name || '建筑'} 被神力摧毁`,
      `👤 所有者: ${ownerName}`,
    ],
  };
}

/**
 * 摧毁公司所有建筑
 */
export function destroyCompanyBuildings(world: GameWorld, companyId: number): InterventionResult {
  if (companyId < 0 || companyId >= world.companies.count) {
    return { success: false, message: '无效的公司ID', effects: [] };
  }
  
  let destroyedCount = 0;
  const destroyedTypes: Map<number, number> = new Map();
  
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
      world.buildings.isActive[i] = 0;
      destroyedCount++;
      
      const typeId = world.buildings.types[i];
      destroyedTypes.set(typeId, (destroyedTypes.get(typeId) || 0) + 1);
    }
  }
  
  const effects: string[] = [];
  destroyedTypes.forEach((count, typeId) => {
    const building = ALL_BUILDINGS.find(b => b.id === typeId);
    effects.push(`🔥 ${building?.name || '建筑'} x${count}`);
  });
  
  const companyName = companyId === 0 ? '玩家' : `公司 #${companyId}`;
  
  return {
    success: true,
    message: `${companyName} 的 ${destroyedCount} 座建筑已被摧毁`,
    effects: [`💥 ${companyName} 遭受天灾`, ...effects],
  };
}

/**
 * 赐予建筑
 */
export function grantBuilding(
  world: GameWorld,
  companyId: number,
  buildingTypeId: number,
  count: number = 1
): InterventionResult {
  const buildingDef = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
  if (!buildingDef) {
    return { success: false, message: '无效的建筑类型', effects: [] };
  }
  
  const effects: string[] = [];
  let grantedCount = 0;
  
  for (let i = 0; i < count; i++) {
    // 寻找空闲建筑槽位
    let slotId = -1;
    for (let j = 0; j < world.buildings.count; j++) {
      if (!world.buildings.isActive[j]) {
        slotId = j;
        break;
      }
    }
    
    if (slotId === -1 && world.buildings.count < 1000) {
      slotId = world.buildings.count;
      world.buildings.count++;
    }
    
    if (slotId === -1) {
      break; // 没有空间了
    }
    
    // 初始化建筑
    world.buildings.types[slotId] = buildingTypeId;
    world.buildings.owners[slotId] = companyId;
    world.buildings.levels[slotId] = 1;
    world.buildings.isActive[slotId] = 1;
    const slotMethods = getDefaultSlotMethods(buildingTypeId);
    const slotOffset = slotId * MAX_SLOTS;
    for (let i = 0; i < MAX_SLOTS; i++) {
      world.buildings.slotMethods[slotOffset + i] = slotMethods[i] ?? 0;
    }
    world.buildings.progress[slotId] = 0;
    
    grantedCount++;
  }
  
  const companyName = companyId === 0 ? '玩家' : `公司 #${companyId}`;
  
  effects.push(`✨ ${companyName} 获得 ${grantedCount} 座 ${buildingDef.name}`);
  
  return {
    success: true,
    message: `赐予 ${buildingDef.name} x${grantedCount}`,
    effects,
  };
}

// ==================== 库存干预 ====================

/**
 * 注入商品到公司库存
 */
export function injectGoods(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  amount: number
): InterventionResult {
  if (companyId < 0 || companyId >= world.companies.count) {
    return { success: false, message: '无效的公司ID', effects: [] };
  }
  
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const inventoryIdx = companyId * GOODS_COUNT + goodsId;
  const oldAmount = world.companies.inventories[inventoryIdx];
  world.companies.inventories[inventoryIdx] = oldAmount + amount;
  
  const companyName = companyId === 0 ? '玩家' : `公司 #${companyId}`;
  
  return {
    success: true,
    message: `${companyName} 获得 ${goods?.name}`,
    effects: [
      `📦 ${companyName} +${amount} ${goods?.name}`,
      `📊 当前库存: ${(oldAmount + amount).toFixed(0)} 单位`
    ],
  };
}

/**
 * 销毁商品
 */
export function removeGoods(
  world: GameWorld,
  companyId: number,
  goodsId: number,
  amount: number
): InterventionResult {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  const inventoryIdx = companyId * GOODS_COUNT + goodsId;
  const oldAmount = world.companies.inventories[inventoryIdx];
  const actualRemoved = Math.min(oldAmount, amount);
  world.companies.inventories[inventoryIdx] = oldAmount - actualRemoved;
  
  const companyName = companyId === 0 ? '玩家' : `公司 #${companyId}`;
  
  return {
    success: true,
    message: `${companyName} 失去 ${goods?.name}`,
    effects: [
      `💨 ${companyName} -${actualRemoved} ${goods?.name}`,
      `📊 剩余库存: ${(oldAmount - actualRemoved).toFixed(0)} 单位`
    ],
  };
}

// ==================== 全局干预 ====================

/**
 * 设定全局需求乘数
 */
export function setGlobalDemandMultiplier(world: GameWorld, multiplier: number): InterventionResult {
  // 确保 multiplier 是有效数字
  const numMultiplier = Number(multiplier);
  if (isNaN(numMultiplier)) {
    return { success: false, message: '无效的需求乘数', effects: [] };
  }
  
  const clampedMultiplier = Math.max(0.1, Math.min(10, numMultiplier));
  
  // 调整所有商品的需求
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const oldDemand = world.goods.demands[i];
    if (isFinite(oldDemand)) {
      world.goods.demands[i] = oldDemand * clampedMultiplier;
    }
  }
  
  const icon = clampedMultiplier >= 1 ? '📈' : '📉';
  const changePercent = (clampedMultiplier - 1) * 100;
  const changeStr = changePercent >= 0 ? `+${changePercent.toFixed(0)}` : changePercent.toFixed(0);
  
  return {
    success: true,
    message: '全局需求已调整',
    effects: [
      `${icon} 全球消费需求 ${changeStr}%`
    ],
  };
}

/**
 * 触发经济事件
 */
export function triggerEconomicEvent(
  world: GameWorld,
  eventType: 'recession' | 'boom' | 'inflation' | 'deflation'
): InterventionResult {
  const effects: string[] = [];
  
  switch (eventType) {
    case 'recession':
      // 经济衰退：需求下降，价格下跌
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.demands[i] *= 0.7;
        world.goods.prices[i] *= 0.8 + Math.random() * 0.1;
      }
      // 公司现金减少
      for (let i = 1; i < world.companies.count; i++) {
        world.companies.cash[i] *= 0.8;
      }
      effects.push('📉 全球需求下降 30%');
      effects.push('💸 商品价格下跌 10-20%');
      effects.push('🏢 企业资金紧张');
      world.economyStats.cyclePhase = 'contraction';
      break;
      
    case 'boom':
      // 经济繁荣：需求上升，价格上涨
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.demands[i] *= 1.5;
        world.goods.prices[i] *= 1.1 + Math.random() * 0.2;
      }
      effects.push('📈 全球需求上涨 50%');
      effects.push('💰 商品价格上涨 10-30%');
      effects.push('🎉 经济繁荣期来临');
      world.economyStats.cyclePhase = 'expansion';
      break;
      
    case 'inflation':
      // 通货膨胀：所有价格上涨
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.prices[i] *= 1.5 + Math.random() * 0.5;
      }
      effects.push('📈 恶性通货膨胀');
      effects.push('💰 所有商品价格上涨 50-100%');
      effects.push('💸 货币购买力下降');
      break;
      
    case 'deflation':
      // 通货紧缩：价格下跌，需求萎缩
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.prices[i] *= 0.5 + Math.random() * 0.2;
        world.goods.demands[i] *= 0.6;
      }
      effects.push('📉 通货紧缩');
      effects.push('💰 商品价格暴跌 30-50%');
      effects.push('🥶 消费需求冻结');
      break;
  }
  
  const eventNames: Record<string, string> = {
    recession: '经济衰退',
    boom: '经济繁荣',
    inflation: '恶性通胀',
    deflation: '通货紧缩',
  };
  
  return {
    success: true,
    message: `${eventNames[eventType]} 已降临`,
    effects: [`🌍 ${eventNames[eventType]}来临`, ...effects],
  };
}

/**
 * 触发灾难
 */
export function triggerDisaster(
  world: GameWorld,
  disasterType: 'earthquake' | 'flood' | 'fire' | 'plague',
  severity: 'minor' | 'major' | 'catastrophic'
): InterventionResult {
  const effects: string[] = [];
  
  // 灾难影响系数
  const severityMultiplier = {
    minor: 0.1,
    major: 0.3,
    catastrophic: 0.6,
  }[severity];
  
  const disasterIcons = {
    earthquake: '🏚️',
    flood: '🌊',
    fire: '🔥',
    plague: '🦠',
  };
  
  const disasterNames = {
    earthquake: '地震',
    flood: '洪水',
    fire: '大火',
    plague: '瘟疫',
  };
  
  // 随机摧毁建筑
  let destroyedCount = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.isActive[i] && Math.random() < severityMultiplier) {
      world.buildings.isActive[i] = 0;
      destroyedCount++;
    }
  }
  
  if (destroyedCount > 0) {
    effects.push(`${disasterIcons[disasterType]} ${destroyedCount} 座建筑被摧毁`);
  }
  
  // 价格冲击
  const priceImpact = {
    earthquake: ['钢材', '水泥', '建材'],
    flood: ['粮食', '农产品'],
    fire: ['木材', '纸张'],
    plague: ['医药', '防护用品'],
  }[disasterType];
  
  for (const goodsName of priceImpact) {
    const goods = ALL_GOODS.find(g => g.name.includes(goodsName));
    if (goods) {
      world.goods.prices[goods.id] *= 1 + severityMultiplier * 2;
      effects.push(`📈 ${goods.name} 价格暴涨`);
    }
  }
  
  // 公司损失
  let totalLoss = 0;
  for (let i = 0; i < world.companies.count; i++) {
    const loss = world.companies.cash[i] * severityMultiplier * 0.5;
    world.companies.cash[i] -= loss;
    totalLoss += loss;
  }
  effects.push(`💸 总经济损失: ¥${(totalLoss / 1000000).toFixed(1)}M`);
  
  const severityNames = {
    minor: '小型',
    major: '大型',
    catastrophic: '灾难性',
  };
  
  return {
    success: true,
    message: `${severityNames[severity]}${disasterNames[disasterType]}降临`,
    effects: [
      `⚠️ ${severityNames[severity]}${disasterNames[disasterType]}！`,
      ...effects,
    ],
  };
}

// ==================== 时间干预 ====================

/**
 * 快进时间
 */
export function fastForward(ticks: number): InterventionResult {
  const store = useGameStore.getState();
  
  // 限制单次快进
  const actualTicks = Math.min(ticks, 1000);
  
  // 触发多次 tick
  for (let i = 0; i < actualTicks; i++) {
    store.manualTick();
  }
  
  const days = Math.floor(actualTicks / 24);
  const hours = actualTicks % 24;
  
  return {
    success: true,
    message: `时间快进 ${actualTicks} tick`,
    effects: [
      `⏩ 时间流逝 ${days > 0 ? `${days}天` : ''}${hours > 0 ? `${hours}小时` : ''}`
    ],
  };
}

// ==================== 辅助函数 ====================

/**
 * 根据名称查找商品ID（支持模糊匹配和别名）
 */
export function findGoodsIdByName(name: string): number | null {
  if (!name) return null;
  
  const normalizedInput = name.trim().toLowerCase();
  
  // 1. 精确匹配
  const exactMatch = ALL_GOODS.find(g => g.name === name);
  if (exactMatch) return exactMatch.id;
  
  // 2. 别名匹配
  for (const [officialName, aliases] of Object.entries(GOODS_ALIASES)) {
    // 检查输入是否是别名之一
    if (aliases.some(a => a.toLowerCase() === normalizedInput)) {
      const goods = ALL_GOODS.find(g => g.name === officialName);
      if (goods) return goods.id;
    }
    // 检查输入是否包含别名
    for (const alias of aliases) {
      if (normalizedInput.includes(alias.toLowerCase()) || alias.toLowerCase().includes(normalizedInput)) {
        const goods = ALL_GOODS.find(g => g.name === officialName);
        if (goods) return goods.id;
      }
    }
  }
  
  // 3. 部分匹配（包含关系）
  for (const goods of ALL_GOODS) {
    const goodsNameLower = goods.name.toLowerCase();
    if (goodsNameLower.includes(normalizedInput) || normalizedInput.includes(goodsNameLower)) {
      return goods.id;
    }
  }
  
  // 4. key 匹配
  const keyMatch = ALL_GOODS.find(g => g.key.toLowerCase().includes(normalizedInput));
  if (keyMatch) return keyMatch.id;
  
  return null;
}

/**
 * 根据名称查找建筑类型ID（支持模糊匹配和别名）
 */
export function findBuildingTypeByName(name: string): number | null {
  if (!name) return null;
  
  const normalizedInput = name.trim().toLowerCase();
  
  // 1. 精确匹配
  const exactMatch = ALL_BUILDINGS.find(b => b.name === name);
  if (exactMatch) return exactMatch.id;
  
  // 2. 别名匹配
  for (const [officialName, aliases] of Object.entries(BUILDING_ALIASES)) {
    // 检查输入是否是别名之一
    if (aliases.some(a => a.toLowerCase() === normalizedInput)) {
      const building = ALL_BUILDINGS.find(b => b.name === officialName);
      if (building) return building.id;
    }
    // 检查输入是否包含别名
    for (const alias of aliases) {
      if (normalizedInput.includes(alias.toLowerCase()) || alias.toLowerCase().includes(normalizedInput)) {
        const building = ALL_BUILDINGS.find(b => b.name === officialName);
        if (building) return building.id;
      }
    }
  }
  
  // 3. 部分匹配（包含关系）
  for (const building of ALL_BUILDINGS) {
    const buildingNameLower = building.name.toLowerCase();
    if (buildingNameLower.includes(normalizedInput) || normalizedInput.includes(buildingNameLower)) {
      return building.id;
    }
  }
  
  // 4. key 匹配
  const keyMatch = ALL_BUILDINGS.find(b => b.key.toLowerCase().includes(normalizedInput));
  if (keyMatch) return keyMatch.id;
  
  return null;
}

/**
 * 获取世界状态摘要
 */
export function getWorldSummary(world: GameWorld): {
  totalCompanies: number;
  totalBuildings: number;
  activeBuildings: number;
  avgPrice: number;
  playerCash: number;
} {
  let activeBuildings = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.isActive[i]) activeBuildings++;
  }
  
  let totalPrice = 0;
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    totalPrice += world.goods.prices[i];
  }
  
  return {
    totalCompanies: world.companies.count,
    totalBuildings: world.buildings.count,
    activeBuildings,
    avgPrice: totalPrice / ACTUAL_GOODS_COUNT,
    playerCash: world.companies.cash[0],
  };
}
