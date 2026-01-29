/**
 * 上帝模式操作执行器
 * 执行神圣干预函数
 */

import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';
import { ACTUAL_GOODS_COUNT, GOODS_COUNT } from '@/core/constants';
import {
  InterventionResult,
  setPrice,
  adjustPrice,
  adjustAllPrices,
  triggerPriceShock,
  setCompanyCash,
  adjustCompanyCash,
  bankruptCompany,
  bankruptAllCompanies,
  destroyBuilding,
  destroyCompanyBuildings,
  grantBuilding,
  injectGoods,
  removeGoods,
  setGlobalDemandMultiplier,
  triggerEconomicEvent,
  triggerDisaster,
  fastForward,
  findGoodsIdByName,
  findBuildingTypeByName,
  getWorldSummary,
} from './WorldModifier';

/**
 * 执行上帝模式操作
 */
export function executeGodAction(
  functionName: string,
  args: Record<string, unknown>
): InterventionResult {
  const store = useGameStore.getState();
  const world = store.getWorld();
  
  if (!world) {
    return { success: false, message: '游戏未初始化', effects: [] };
  }
  
  try {
    switch (functionName) {
      // ==================== 价格干预 ====================
      case 'set_price': {
        const goodsName = args.goodsName as string;
        const price = args.price as number;
        const goodsId = findGoodsIdByName(goodsName);
        if (goodsId === null) {
          return { success: false, message: `找不到商品: ${goodsName}`, effects: [] };
        }
        return setPrice(world, goodsId, price);
      }
      
      case 'adjust_price': {
        const goodsName = args.goodsName as string;
        const percent = args.percent as number;
        const goodsId = findGoodsIdByName(goodsName);
        if (goodsId === null) {
          return { success: false, message: `找不到商品: ${goodsName}`, effects: [] };
        }
        return adjustPrice(world, goodsId, percent);
      }
      
      case 'adjust_all_prices': {
        const percent = args.percent as number;
        return adjustAllPrices(world, percent);
      }
      
      case 'trigger_price_shock': {
        const goodsName = args.goodsName as string;
        const type = args.type as 'surge' | 'crash';
        const goodsId = findGoodsIdByName(goodsName);
        if (goodsId === null) {
          return { success: false, message: `找不到商品: ${goodsName}`, effects: [] };
        }
        return triggerPriceShock(world, goodsId, type);
      }
      
      // ==================== 公司干预 ====================
      case 'set_company_cash': {
        const companyId = args.companyId as number;
        const amount = args.amount as number;
        return setCompanyCash(world, companyId, amount);
      }
      
      case 'adjust_company_cash': {
        const companyId = args.companyId as number;
        const amount = args.amount as number;
        return adjustCompanyCash(world, companyId, amount);
      }
      
      case 'bankrupt_company': {
        const companyId = args.companyId as number;
        return bankruptCompany(world, companyId);
      }
      
      case 'bankrupt_all_companies': {
        return bankruptAllCompanies(world);
      }
      
      // ==================== 建筑干预 ====================
      case 'destroy_building': {
        const buildingId = args.buildingId as number;
        return destroyBuilding(world, buildingId);
      }
      
      case 'destroy_company_buildings': {
        const companyId = args.companyId as number;
        return destroyCompanyBuildings(world, companyId);
      }
      
      case 'grant_building': {
        const companyId = args.companyId as number;
        const buildingType = args.buildingType as string;
        const count = (args.count as number) || 1;
        
        const buildingTypeId = findBuildingTypeByName(buildingType);
        if (buildingTypeId === null) {
          return { success: false, message: `找不到建筑类型: ${buildingType}`, effects: [] };
        }
        return grantBuilding(world, companyId, buildingTypeId, count);
      }
      
      // ==================== 库存干预 ====================
      case 'inject_goods': {
        const companyId = args.companyId as number;
        const goodsName = args.goodsName as string;
        const amount = args.amount as number;
        
        const goodsId = findGoodsIdByName(goodsName);
        if (goodsId === null) {
          return { success: false, message: `找不到商品: ${goodsName}`, effects: [] };
        }
        return injectGoods(world, companyId, goodsId, amount);
      }
      
      case 'remove_goods': {
        const companyId = args.companyId as number;
        const goodsName = args.goodsName as string;
        const amount = args.amount as number;
        
        const goodsId = findGoodsIdByName(goodsName);
        if (goodsId === null) {
          return { success: false, message: `找不到商品: ${goodsName}`, effects: [] };
        }
        return removeGoods(world, companyId, goodsId, amount);
      }
      
      // ==================== 全局事件 ====================
      case 'trigger_economic_event': {
        const eventType = args.eventType as 'recession' | 'boom' | 'inflation' | 'deflation';
        return triggerEconomicEvent(world, eventType);
      }
      
      case 'trigger_disaster': {
        const disasterType = args.disasterType as 'earthquake' | 'flood' | 'fire' | 'plague';
        const severity = (args.severity as 'minor' | 'major' | 'catastrophic') || 'major';
        return triggerDisaster(world, disasterType, severity);
      }
      
      case 'set_global_demand': {
        const multiplier = args.multiplier as number;
        return setGlobalDemandMultiplier(world, multiplier);
      }
      
      // ==================== 时间控制 ====================
      case 'fast_forward': {
        const ticks = args.ticks as number;
        return fastForward(ticks);
      }
      
      // ==================== 查询 ====================
      case 'get_world_status': {
        return queryWorldStatus(world);
      }
      
      case 'get_price_list': {
        const category = args.category as string | undefined;
        return queryPriceList(world, category);
      }
      
      case 'get_companies': {
        return queryCompanies(world);
      }
      
      default:
        return { success: false, message: `未知的神圣干预: ${functionName}`, effects: [] };
    }
  } catch (error) {
    console.error('God action error:', error);
    return {
      success: false,
      message: `干预失败: ${error instanceof Error ? error.message : '未知错误'}`,
      effects: [],
    };
  }
}

// ==================== 查询函数 ====================

function queryWorldStatus(world: ReturnType<typeof useGameStore.getState>['getWorld'] extends () => infer R ? R : never): InterventionResult {
  if (!world) {
    return { success: false, message: '游戏未初始化', effects: [] };
  }
  
  const summary = getWorldSummary(world);
  
  // 统计价格趋势
  let risingCount = 0;
  let fallingCount = 0;
  
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const price = world.goods.prices[i];
    const base = world.goods.baseValues[i];
    if (price > base * 1.1) risingCount++;
    else if (price < base * 0.9) fallingCount++;
  }
  
  const effects = [
    `🏢 公司数量: ${summary.totalCompanies}`,
    `🏭 活跃建筑: ${summary.activeBuildings} / ${summary.totalBuildings}`,
    `💰 玩家资金: ¥${summary.playerCash.toLocaleString()}`,
    `📈 价格上涨商品: ${risingCount} 种`,
    `📉 价格下跌商品: ${fallingCount} 种`,
    `📊 平均价格指数: ¥${summary.avgPrice.toFixed(2)}`,
  ];
  
  return {
    success: true,
    message: '世界状态概览',
    effects,
    data: summary,
  };
}

function queryPriceList(world: ReturnType<typeof useGameStore.getState>['getWorld'] extends () => infer R ? R : never, category?: string): InterventionResult {
  if (!world) {
    return { success: false, message: '游戏未初始化', effects: [] };
  }
  
  const effects: string[] = [];
  
  // 获取价格信息
  const priceInfo: Array<{ name: string; price: number; base: number; change: number }> = [];
  
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const goods = ALL_GOODS.find(g => g.id === i);
    if (!goods) continue;
    
    // 如果指定了类别，过滤
    if (category) {
      if (!goods.category.includes(category)) continue;
    }
    
    const price = world.goods.prices[i];
    const base = world.goods.baseValues[i];
    const change = ((price - base) / base) * 100;
    
    priceInfo.push({
      name: goods.name,
      price,
      base,
      change,
    });
  }
  
  // 按价格变化排序
  priceInfo.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  // 取前15个
  for (const info of priceInfo.slice(0, 15)) {
    const icon = info.change > 5 ? '📈' : info.change < -5 ? '📉' : '➡️';
    effects.push(`${icon} ${info.name}: ¥${info.price.toFixed(2)} (${info.change >= 0 ? '+' : ''}${info.change.toFixed(1)}%)`);
  }
  
  return {
    success: true,
    message: `商品价格列表${category ? ` (${category})` : ''}`,
    effects,
    data: priceInfo,
  };
}

function queryCompanies(world: ReturnType<typeof useGameStore.getState>['getWorld'] extends () => infer R ? R : never): InterventionResult {
  if (!world) {
    return { success: false, message: '游戏未初始化', effects: [] };
  }
  
  const effects: string[] = [];
  
  for (let i = 0; i < Math.min(world.companies.count, 20); i++) {
    const cash = world.companies.cash[i];
    const assets = world.companies.totalAssets[i];
    
    // 统计建筑数量
    let buildingCount = 0;
    for (let j = 0; j < world.buildings.count; j++) {
      if (world.buildings.owners[j] === i && world.buildings.isActive[j]) {
        buildingCount++;
      }
    }
    
    const name = i === 0 ? '👤 玩家公司' : `🏢 公司 #${i}`;
    const status = cash < 10000 ? '⚠️' : '✅';
    
    effects.push(`${status} ${name}: ¥${(cash / 1000000).toFixed(2)}M | 建筑 ${buildingCount}`);
  }
  
  return {
    success: true,
    message: `公司列表 (共${world.companies.count}家)`,
    effects,
  };
}

/**
 * 格式化干预结果为显示文本
 */
export function formatInterventionResult(result: InterventionResult): string {
  const lines: string[] = [];
  
  // 标题
  if (result.success) {
    lines.push(`⚡ **神谕已发布**`);
    lines.push('');
    lines.push(`✨ ${result.message}`);
  } else {
    lines.push(`❌ **神谕失败**`);
    lines.push('');
    lines.push(`⚠️ ${result.message}`);
  }
  
  // 效果列表
  if (result.effects.length > 0) {
    lines.push('');
    for (const effect of result.effects) {
      lines.push(effect);
    }
  }
  
  return lines.join('\n');
}