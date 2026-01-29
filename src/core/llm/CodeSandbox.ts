/**
 * 代码沙盒执行器
 * 安全地执行LLM生成的代码来操作游戏世界
 *
 * 扩展版本：支持所有游戏操作
 */

import { GameWorld } from '@/core/world/GameWorld';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS, GOODS_BY_KEY } from '@/data/goods';
import { ALL_BUILDINGS, BUILDINGS_BY_ID } from '@/data/buildings';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT, MAX_BUILDINGS } from '@/core/constants';
import { createBuyOrder, createSellOrder, cancelOrder } from '@/core/market/OrderBook';
import {
  applyForLoan,
  makePayment,
  prepayLoan,
  getCompanyLoans,
  getCreditProfile,
  getAvailableLoanOptions,
  LoanType
} from '@/core/finance/BankingSystem';
import {
  buyStock,
  sellStock,
  getStock,
  getHoldings,
  initiateIPO,
  payDividend,
  getMarketState
} from '@/core/finance/StockMarket';

/**
 * 代码执行结果
 */
export interface CodeExecutionResult {
  success: boolean;
  message: string;
  logs: string[];
  error?: string;
}

/**
 * 禁止的关键字列表
 */
const FORBIDDEN_KEYWORDS = [
  'eval',
  'Function',
  'require',
  'import',
  'window',
  'document',
  'global',
  'process',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  '__proto__',
  'prototype',
  'constructor',
];

/**
 * 检查代码安全性
 */
export function validateCode(code: string): { valid: boolean; reason?: string } {
  // 检查禁止的关键字
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // 使用单词边界匹配
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    if (regex.test(code)) {
      return { valid: false, reason: `禁止使用 "${keyword}"` };
    }
  }
  
  // 检查 while(true) 无限循环
  if (/while\s*\(\s*true\s*\)/.test(code)) {
    return { valid: false, reason: '禁止使用 while(true) 无限循环' };
  }
  
  return { valid: true };
}

/**
 * 创建沙盒API
 * 这些是LLM生成的代码可以访问的变量和函数
 */
function createSandboxAPI(world: GameWorld, logs: string[]) {
  // 创建沙盒对象，注意所有方法需要使用箭头函数或直接引用 sandbox
  const sandbox = {
    // ========== 游戏数据 ==========
    world,
    
    // 商品数据
    goods: {
      count: ACTUAL_GOODS_COUNT,
      prices: world.goods.prices,
      demands: world.goods.demands,
      supplies: world.goods.supplies,
      baseValues: world.goods.baseValues,
    },
    
    // 公司数据
    companies: {
      count: world.companies.count,
      cash: world.companies.cash,
      inventories: world.companies.inventories,
      totalAssets: world.companies.totalAssets,
    },
    
    // 建筑数据
    buildings: {
      count: world.buildings.count,
      types: world.buildings.types,
      owners: world.buildings.owners,
      levels: world.buildings.levels,
      isActive: world.buildings.isActive,
    },
    
    // 经济状态
    economy: world.economyStats,
    
    // ========== 辅助函数 ==========
    
    /**
     * 查找商品ID（模糊匹配）
     */
    findGoodsId(name: string): number | null {
      // 精确匹配
      let goods = ALL_GOODS.find(g => g.name === name);
      if (goods) return goods.id;
      
      // 包含匹配
      goods = ALL_GOODS.find(g =>
        g.name.includes(name) ||
        name.includes(g.name) ||
        g.key.toLowerCase().includes(name.toLowerCase())
      );
      return goods?.id ?? null;
    },
    
    /**
     * 获取商品名称
     */
    getGoodsName(id: number): string {
      return ALL_GOODS.find(g => g.id === id)?.name ?? `商品#${id}`;
    },
    
    /**
     * 获取所有商品列表
     */
    getAllGoods(): Array<{ id: number; name: string; price: number }> {
      return ALL_GOODS.slice(0, ACTUAL_GOODS_COUNT).map(g => ({
        id: g.id,
        name: g.name,
        price: world.goods.prices[g.id],
      }));
    },
    
    /**
     * 查找建筑类型ID（模糊匹配）
     */
    findBuildingId(name: string): number | null {
      // 精确匹配
      let building = ALL_BUILDINGS.find(b => b.name === name);
      if (building) return building.id;
      
      // 包含匹配
      building = ALL_BUILDINGS.find(b =>
        b.name.includes(name) ||
        name.includes(b.name) ||
        b.key.toLowerCase().includes(name.toLowerCase())
      );
      return building?.id ?? null;
    },
    
    /**
     * 获取建筑名称
     */
    getBuildingName(id: number): string {
      return ALL_BUILDINGS.find(b => b.id === id)?.name ?? `建筑#${id}`;
    },
    
    /**
     * 获取所有建筑类型列表
     */
    getAllBuildingTypes(): Array<{ id: number; name: string; category: string; cost: number }> {
      return ALL_BUILDINGS.map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        cost: b.buildCost,
      }));
    },
    
    /**
     * 查找公司ID（模糊匹配）
     * 支持按公司名称的部分匹配
     */
    findCompanyId(name: string): number | null {
      const names = world.companies.names;
      
      // 调试：输出公司列表
      console.log(`[findCompanyId] 搜索 "${name}", 公司总数: ${world.companies.count}, names数组长度: ${names?.length || 0}`);
      
      if (!names || names.length === 0) {
        logs.push(`⚠️ 公司名称列表为空，共有 ${world.companies.count} 家公司`);
        return null;
      }
      
      // 精确匹配
      for (let i = 0; i < world.companies.count; i++) {
        if (names[i] === name) {
          console.log(`[findCompanyId] 精确匹配: "${name}" -> ID ${i}`);
          return i;
        }
      }
      
      // 包含匹配（公司名包含搜索词，或搜索词包含公司名）
      for (let i = 0; i < world.companies.count; i++) {
        const companyName = names[i] || '';
        if (companyName.includes(name) || name.includes(companyName)) {
          console.log(`[findCompanyId] 包含匹配: "${name}" -> "${companyName}" (ID ${i})`);
          return i;
        }
      }
      
      // 关键字匹配（分词后匹配）
      const keywords = name.split(/[\s,，、]+/).filter(k => k.length > 0);
      for (let i = 0; i < world.companies.count; i++) {
        const companyName = names[i] || '';
        for (const keyword of keywords) {
          if (companyName.includes(keyword) && keyword.length >= 2) {
            console.log(`[findCompanyId] 关键字匹配: "${keyword}" -> "${companyName}" (ID ${i})`);
            return i;
          }
        }
      }
      
      // 未找到，输出所有公司名称帮助调试
      logs.push(`⚠️ 找不到公司 "${name}"，可用公司: ${names.slice(0, 10).join(', ')}${names.length > 10 ? '...' : ''}`);
      console.log(`[findCompanyId] 未找到 "${name}", 可用公司:`, names.slice(0, 20));
      return null;
    },
    
    /**
     * 获取公司名称
     */
    getCompanyName(id: number): string {
      if (id < 0 || id >= world.companies.count) return `公司#${id}`;
      return world.companies.names?.[id] || `公司#${id}`;
    },
    
    /**
     * 设置商品价格
     */
    setPrice(goodsId: number, price: number): void {
      if (goodsId >= 0 && goodsId < ACTUAL_GOODS_COUNT) {
        world.goods.prices[goodsId] = Math.max(0.01, price);
      }
    },
    
    /**
     * 调整商品价格
     */
    adjustPrice(goodsId: number, percent: number): void {
      if (goodsId >= 0 && goodsId < ACTUAL_GOODS_COUNT) {
        world.goods.prices[goodsId] *= (1 + percent / 100);
        world.goods.prices[goodsId] = Math.max(0.01, world.goods.prices[goodsId]);
      }
    },
    
    /**
     * 设置公司资金
     */
    setCash(companyId: number, amount: number): void {
      if (companyId >= 0 && companyId < world.companies.count) {
        world.companies.cash[companyId] = Math.max(0, amount);
      }
    },
    
    /**
     * 调整公司资金
     */
    adjustCash(companyId: number, amount: number): void {
      if (companyId >= 0 && companyId < world.companies.count) {
        world.companies.cash[companyId] = Math.max(0, world.companies.cash[companyId] + amount);
      }
    },
    
    /**
     * 给公司添加库存
     */
    addInventory(companyId: number, goodsId: number, amount: number): void {
      if (companyId >= 0 && companyId < world.companies.count && goodsId >= 0 && goodsId < GOODS_COUNT) {
        const idx = companyId * GOODS_COUNT + goodsId;
        world.companies.inventories[idx] = (world.companies.inventories[idx] || 0) + amount;
      }
    },
    
    /**
     * 获取公司库存
     */
    getInventory(companyId: number, goodsId: number): number {
      if (companyId >= 0 && companyId < world.companies.count && goodsId >= 0 && goodsId < GOODS_COUNT) {
        return world.companies.inventories[companyId * GOODS_COUNT + goodsId] || 0;
      }
      return 0;
    },
    
    /**
     * 激活/停用建筑
     */
    setBuildingActive(buildingId: number, active: boolean): void {
      if (buildingId >= 0 && buildingId < world.buildings.count) {
        world.buildings.isActive[buildingId] = active ? 1 : 0;
      }
    },
    
    /**
     * 快进时间
     */
    fastForward(ticks: number): void {
      const store = useGameStore.getState();
      const actualTicks = Math.min(ticks, 100); // 限制单次快进
      for (let i = 0; i < actualTicks; i++) {
        store.manualTick();
      }
    },
    
    // ========== 建筑系统 ==========
    
    /**
     * 建造新建筑（即时完成，免费模式）
     * @param buildingTypeId 建筑类型ID
     * @param companyId 所属公司ID（默认玩家）
     * @param free 是否免费建造（上帝模式默认免费）
     * @returns 新建筑的ID，失败返回null
     */
    buildBuilding: (buildingTypeId: number, companyId: number = 0, free: boolean = true): number | null => {
      const buildingDef = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
      if (!buildingDef) {
        logs.push(`❌ 未知的建筑类型: ${buildingTypeId}`);
        return null;
      }
      
      // 检查容量（使用正确的常量）
      if (world.buildings.count >= MAX_BUILDINGS) {
        logs.push(`❌ 建筑数量已达上限(${MAX_BUILDINGS})`);
        return null;
      }
      
      // 检查公司ID有效性
      if (companyId < 0 || companyId >= world.companies.count) {
        logs.push(`❌ 无效的公司ID: ${companyId}`);
        return null;
      }
      
      // 检查现金（免费模式跳过）
      if (!free) {
        const cost = buildingDef.buildCost || 0;
        if (world.companies.cash[companyId] < cost) {
          logs.push(`❌ 资金不足: 需要 ¥${cost.toLocaleString()}`);
          return null;
        }
        // 扣除资金
        world.companies.cash[companyId] -= cost;
      }
      
      // 创建建筑
      const buildingId = world.buildings.count;
      world.buildings.count++;
      
      world.buildings.types[buildingId] = buildingTypeId;
      world.buildings.owners[buildingId] = companyId;
      world.buildings.levels[buildingId] = 1;
      world.buildings.isActive[buildingId] = 1;
      world.buildings.efficiencies[buildingId] = 1.0;
      world.buildings.recipeIds[buildingId] = buildingDef.availableRecipes?.[0] || buildingDef.defaultRecipeId || 0;
      world.buildings.progress[buildingId] = 0;
      
      // 更新公司的建筑计数
      world.companies.buildingCounts[companyId]++;
      
      return buildingId;
    },
    
    /**
     * 按名称建造建筑（免费）
     */
    buildByName: (name: string, companyId: number = 0): number | null => {
      const building = ALL_BUILDINGS.find(b =>
        b.name === name ||
        b.name.includes(name) ||
        name.includes(b.name)
      );
      if (!building) {
        logs.push(`❌ 找不到建筑: ${name}`);
        return null;
      }
      return sandbox.buildBuilding(building.id, companyId, true);
    },
    
    /**
     * 批量建造建筑（免费）
     */
    buildMultiple: (buildingTypeId: number, count: number, companyId: number = 0): number[] => {
      console.log(`[buildMultiple] 建造类型=${buildingTypeId}, 数量=${count}, 公司ID=${companyId}`);
      
      const buildingDef = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
      if (!buildingDef) {
        logs.push(`❌ 未知的建筑类型: ${buildingTypeId}，可用类型ID: 0-${ALL_BUILDINGS.length - 1}`);
        return [];
      }
      
      // 验证公司ID
      if (companyId < 0 || companyId >= world.companies.count) {
        logs.push(`❌ 无效的公司ID: ${companyId}，公司总数: ${world.companies.count}`);
        return [];
      }
      
      const companyName = world.companies.names?.[companyId] || `公司#${companyId}`;
      console.log(`[buildMultiple] 为 "${companyName}" 建造 ${count} 座 ${buildingDef.name}`);
      
      const results: number[] = [];
      const actualCount = Math.min(count, MAX_BUILDINGS - world.buildings.count); // 使用正确的常量
      
      if (actualCount < count) {
        logs.push(`⚠️ 请求建造 ${count} 座，但只能建造 ${actualCount} 座（接近上限 ${MAX_BUILDINGS}）`);
      }
      
      for (let i = 0; i < actualCount; i++) {
        const id = sandbox.buildBuilding(buildingTypeId, companyId, true); // 免费建造
        if (id !== null) {
          results.push(id);
        } else {
          logs.push(`⚠️ 建造第 ${i + 1} 座时失败`);
          break;
        }
      }
      
      if (results.length > 0) {
        logs.push(`🏗️ 为 ${companyName} 建造完成: ${results.length} 座${buildingDef.name}（当前总建筑数: ${world.buildings.count}）`);
      } else {
        logs.push(`❌ 建造失败：没有成功建造任何建筑`);
      }
      
      return results;
    },
    
    /**
     * 拆除建筑
     */
    demolishBuilding: (buildingId: number): boolean => {
      if (buildingId < 0 || buildingId >= world.buildings.count) {
        logs.push(`❌ 无效的建筑ID: ${buildingId}`);
        return false;
      }
      
      if (!world.buildings.isActive[buildingId]) {
        logs.push(`❌ 建筑已被拆除`);
        return false;
      }
      
      const typeId = world.buildings.types[buildingId];
      const building = ALL_BUILDINGS.find(b => b.id === typeId);
      
      world.buildings.isActive[buildingId] = 0;
      logs.push(`🔥 已拆除: ${building?.name || '建筑'} (ID=${buildingId})`);
      return true;
    },
    
    /**
     * 拆除公司的所有建筑
     */
    demolishAllBuildings: (companyId: number): number => {
      let count = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
          world.buildings.isActive[i] = 0;
          count++;
        }
      }
      logs.push(`🔥 已拆除 ${count} 座建筑`);
      return count;
    },
    
    /**
     * 升级建筑
     */
    upgradeBuilding: (buildingId: number): boolean => {
      if (buildingId < 0 || buildingId >= world.buildings.count) {
        return false;
      }
      
      const typeId = world.buildings.types[buildingId];
      const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
      if (!buildingDef) return false;
      
      const currentLevel = world.buildings.levels[buildingId];
      if (currentLevel >= buildingDef.maxLevel) {
        logs.push(`❌ 建筑已达最高等级`);
        return false;
      }
      
      world.buildings.levels[buildingId] = currentLevel + 1;
      logs.push(`⬆️ 已升级: ${buildingDef.name} Lv${currentLevel + 1}`);
      return true;
    },
    
    /**
     * 获取公司拥有的建筑列表
     */
    getCompanyBuildings: (companyId: number): Array<{ id: number; type: string; level: number; active: boolean }> => {
      const buildings: Array<{ id: number; type: string; level: number; active: boolean }> = [];
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === companyId) {
          const typeId = world.buildings.types[i];
          const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
          buildings.push({
            id: i,
            type: buildingDef?.name || `类型#${typeId}`,
            level: world.buildings.levels[i],
            active: world.buildings.isActive[i] === 1,
          });
        }
      }
      return buildings;
    },
    
    /**
     * 获取公司拥有的建筑ID列表（简化版，只返回ID数组）
     */
    getCompanyBuildingIds: (companyId: number): number[] => {
      const ids: number[] = [];
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
          ids.push(i);
        }
      }
      return ids;
    },
    
    /**
     * 将建筑升到满级
     */
    maxUpgradeBuilding: (buildingId: number): boolean => {
      if (buildingId < 0 || buildingId >= world.buildings.count) {
        return false;
      }
      
      const typeId = world.buildings.types[buildingId];
      const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
      if (!buildingDef) return false;
      
      const currentLevel = world.buildings.levels[buildingId];
      const maxLevel = buildingDef.maxLevel || 5;
      
      if (currentLevel >= maxLevel) {
        return true; // 已经满级
      }
      
      world.buildings.levels[buildingId] = maxLevel;
      logs.push(`⬆️ 已升满级: ${buildingDef.name} Lv${maxLevel}`);
      return true;
    },
    
    /**
     * 将所有玩家建筑升到满级
     */
    maxUpgradeAllBuildings: (companyId: number = 0): number => {
      let count = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
          const typeId = world.buildings.types[i];
          const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
          if (buildingDef) {
            const maxLevel = buildingDef.maxLevel || 5;
            if (world.buildings.levels[i] < maxLevel) {
              world.buildings.levels[i] = maxLevel;
              count++;
            }
          }
        }
      }
      logs.push(`🏗️ 已将 ${count} 座建筑升至满级`);
      return count;
    },
    
    // ========== 经济事件 ==========
    
    /**
     * 触发经济繁荣
     */
    triggerBoom(): void {
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.demands[i] *= 1.5;
        world.goods.prices[i] *= 1.1 + Math.random() * 0.2;
      }
      world.economyStats.cyclePhase = 'expansion';
      logs.push(`🎉 经济繁荣！需求+50%，价格上涨`);
    },
    
    /**
     * 触发经济衰退
     */
    triggerRecession(): void {
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.demands[i] *= 0.7;
        world.goods.prices[i] *= 0.8 + Math.random() * 0.1;
      }
      for (let i = 1; i < world.companies.count; i++) {
        world.companies.cash[i] *= 0.8;
      }
      world.economyStats.cyclePhase = 'contraction';
      logs.push(`📉 经济衰退！需求-30%，价格下跌`);
    },
    
    /**
     * 触发通货膨胀
     */
    triggerInflation(): void {
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.prices[i] *= 1.5 + Math.random() * 0.5;
      }
      logs.push(`💸 恶性通胀！所有价格上涨50-100%`);
    },
    
    /**
     * 触发通货紧缩
     */
    triggerDeflation(): void {
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.prices[i] *= 0.5 + Math.random() * 0.2;
        world.goods.demands[i] *= 0.6;
      }
      logs.push(`🥶 通货紧缩！价格暴跌，需求萎缩`);
    },
    
    /**
     * 触发灾难
     */
    triggerDisaster(type: 'earthquake' | 'flood' | 'fire' | 'plague', severity: number = 0.3): void {
      let destroyedCount = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.isActive[i] && Math.random() < severity) {
          world.buildings.isActive[i] = 0;
          destroyedCount++;
        }
      }
      
      // 价格冲击
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.prices[i] *= 1 + severity;
      }
      
      const names: Record<string, string> = {
        earthquake: '地震',
        flood: '洪水',
        fire: '大火',
        plague: '瘟疫',
      };
      logs.push(`⚠️ ${names[type]}！${destroyedCount}座建筑被摧毁，价格上涨${(severity * 100).toFixed(0)}%`);
    },
    
    /**
     * 设置全局需求乘数
     */
    setGlobalDemand(multiplier: number): void {
      const m = Math.max(0.1, Math.min(10, multiplier));
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.demands[i] *= m;
      }
      logs.push(`📊 全局需求 x${m.toFixed(1)}`);
    },
    
    /**
     * 特定商品价格冲击
     */
    priceShock(goodsId: number, type: 'surge' | 'crash'): void {
      if (goodsId < 0 || goodsId >= ACTUAL_GOODS_COUNT) return;
      
      const magnitude = type === 'surge'
        ? 0.5 + Math.random() * 1.5
        : -(0.3 + Math.random() * 0.4);
      
      const oldPrice = world.goods.prices[goodsId];
      world.goods.prices[goodsId] = Math.max(0.01, oldPrice * (1 + magnitude));
      
      if (type === 'surge') {
        world.goods.demands[goodsId] *= 2;
        world.goods.supplies[goodsId] *= 0.5;
      } else {
        world.goods.demands[goodsId] *= 0.5;
        world.goods.supplies[goodsId] *= 2;
      }
      
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      logs.push(`${type === 'surge' ? '🚀' : '💥'} ${goods?.name || '商品'} ${type === 'surge' ? '暴涨' : '暴跌'}`);
    },
    
    // ========== 银行贷款系统 ==========
    
    /**
     * 申请贷款
     * @param amount 贷款金额
     * @param loanType 贷款类型: 'short_term', 'medium_term', 'long_term', 'credit_line'
     * @param companyId 公司ID（默认玩家）
     */
    applyLoan(amount: number, loanType: string = 'medium_term', companyId: number = 0): boolean {
      const result = applyForLoan(
        world,
        companyId,
        amount,
        loanType as LoanType
      );
      if (result.approved) {
        logs.push(`💳 贷款批准: ¥${amount.toLocaleString()}，贷款ID=${result.loanId}`);
        return true;
      } else {
        logs.push(`❌ 贷款被拒: ${result.reason}`);
        return false;
      }
    },
    
    /**
     * 偿还贷款
     */
    repayLoan(loanId: number, amount?: number): boolean {
      const result = makePayment(world, loanId, amount);
      if (result.success) {
        logs.push(`✅ 还款成功`);
        return true;
      } else {
        logs.push(`❌ 还款失败: ${result.reason}`);
        return false;
      }
    },
    
    /**
     * 提前还清贷款
     */
    payoffLoan(loanId: number): boolean {
      const result = prepayLoan(world, loanId);
      if (result.success) {
        logs.push(`✅ 贷款已还清，提前还款罚金: ¥${result.penalty?.toFixed(0) || 0}`);
        return true;
      } else {
        logs.push(`❌ 还款失败: ${result.reason}`);
        return false;
      }
    },
    
    /**
     * 获取公司所有贷款
     */
    getLoans(companyId: number = 0): Array<{ id: number; principal: number; remaining: number; rate: number; status: string }> {
      const loans = getCompanyLoans(companyId);
      return loans.map(l => ({
        id: l.id,
        principal: l.principal,
        remaining: l.remainingPrincipal,
        rate: l.interestRate,
        status: l.status,
      }));
    },
    
    /**
     * 获取可用贷款选项
     */
    getLoanOptions(companyId: number = 0): Array<{ type: string; maxAmount: number; rate: number }> {
      const options = getAvailableLoanOptions(world, companyId);
      return options.map(o => ({
        type: o.name,
        maxAmount: o.maxAmount,
        rate: o.interestRate,
      }));
    },
    
    /**
     * 获取信用评级
     */
    getCreditRating(companyId: number = 0): { rating: string; score: number; availableCredit: number } | null {
      const profile = getCreditProfile(companyId);
      if (!profile) return null;
      return {
        rating: profile.rating,
        score: profile.score,
        availableCredit: profile.availableCredit,
      };
    },
    
    // ========== 股票市场系统 ==========
    
    /**
     * 买入股票
     * @param stockCompanyId 目标公司ID（要买哪家公司的股票）
     * @param quantity 股数
     * @param orderType 订单类型: 'market' 或 'limit'
     * @param limitPrice 限价（仅限价单需要）
     * @param buyerCompanyId 买方公司ID（默认玩家）
     */
    buyStockShares(stockCompanyId: number, quantity: number, orderType: string = 'market', limitPrice?: number, buyerCompanyId: number = 0): boolean {
      const orderId = buyStock(world, buyerCompanyId, stockCompanyId, quantity, orderType as 'market' | 'limit', limitPrice);
      if (orderId !== null) {
        const stock = getStock(stockCompanyId);
        logs.push(`📈 买入股票: ${stock?.name || `公司#${stockCompanyId}`} ${quantity}股 @ ¥${(limitPrice || stock?.currentPrice || 0).toFixed(2)}`);
        return true;
      }
      logs.push(`❌ 买入失败，可能资金不足或股票不存在`);
      return false;
    },
    
    /**
     * 卖出股票
     */
    sellStockShares(stockCompanyId: number, quantity: number, orderType: string = 'market', limitPrice?: number, sellerCompanyId: number = 0): boolean {
      const orderId = sellStock(world, sellerCompanyId, stockCompanyId, quantity, orderType as 'market' | 'limit', limitPrice);
      if (orderId !== null) {
        const stock = getStock(stockCompanyId);
        logs.push(`📉 卖出股票: ${stock?.name || `公司#${stockCompanyId}`} ${quantity}股`);
        return true;
      }
      logs.push(`❌ 卖出失败，可能持股不足`);
      return false;
    },
    
    /**
     * 获取股票信息
     */
    getStockInfo(companyId: number): { price: number; change: number; pe: number; marketCap: number } | null {
      const stock = getStock(companyId);
      if (!stock) return null;
      return {
        price: stock.currentPrice,
        change: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100,
        pe: stock.priceToEarnings,
        marketCap: stock.marketCap,
      };
    },
    
    /**
     * 获取持股列表
     */
    getMyHoldings(companyId: number = 0): Array<{ stockCompanyId: number; shares: number; avgCost: number; currentValue: number }> {
      const holdings = getHoldings(companyId);
      return holdings.map(h => {
        const stock = getStock(h.stockCompanyId);
        return {
          stockCompanyId: h.stockCompanyId,
          shares: h.shares,
          avgCost: h.avgCost,
          currentValue: h.shares * (stock?.currentPrice || 0),
        };
      });
    },
    
    /**
     * 发起IPO（玩家公司上市）
     */
    doIPO(offeringShares: number, offeringPrice: number, companyId: number = 0): boolean {
      const result = initiateIPO(world, companyId, offeringShares, offeringPrice);
      if (result) {
        logs.push(`🎊 IPO成功！发行${offeringShares}股 @ ¥${offeringPrice}`);
        return true;
      }
      logs.push(`❌ IPO失败，公司可能已上市`);
      return false;
    },
    
    /**
     * 支付股息
     */
    payStockDividend(dividendPerShare: number, companyId: number = 0): boolean {
      const result = payDividend(world, companyId, dividendPerShare);
      if (result) {
        logs.push(`💵 已支付股息: 每股 ¥${dividendPerShare}`);
        return true;
      }
      logs.push(`❌ 股息支付失败`);
      return false;
    },
    
    /**
     * 获取市场指数
     */
    getMarketIndex(): { index: number; change: number; totalMarketCap: number } {
      const state = getMarketState();
      return {
        index: state.marketIndex,
        change: state.marketIndexChange * 100,
        totalMarketCap: state.totalMarketCap,
      };
    },
    
    // ========== 公司管理 ==========
    
    /**
     * 破产指定公司
     */
    bankruptCompany(companyId: number): void {
      if (companyId === 0) {
        logs.push(`❌ 不能破产玩家公司`);
        return;
      }
      if (companyId < 0 || companyId >= world.companies.count) {
        logs.push(`❌ 无效的公司ID`);
        return;
      }
      
      // 清空现金
      world.companies.cash[companyId] = 0;
      
      // 清空库存
      for (let i = 0; i < GOODS_COUNT; i++) {
        world.companies.inventories[companyId * GOODS_COUNT + i] = 0;
      }
      
      // 停用建筑
      let destroyedCount = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
          world.buildings.isActive[i] = 0;
          destroyedCount++;
        }
      }
      
      logs.push(`💀 公司#${companyId} 已破产，${destroyedCount}座建筑停止运营`);
    },
    
    /**
     * 破产所有AI公司
     */
    bankruptAllAI(): void {
      let count = 0;
      for (let companyId = 1; companyId < world.companies.count; companyId++) {
        world.companies.cash[companyId] = 0;
        for (let i = 0; i < GOODS_COUNT; i++) {
          world.companies.inventories[companyId * GOODS_COUNT + i] = 0;
        }
        for (let i = 0; i < world.buildings.count; i++) {
          if (world.buildings.owners[i] === companyId) {
            world.buildings.isActive[i] = 0;
          }
        }
        count++;
      }
      logs.push(`💀 ${count}家AI公司已破产`);
    },
    
    /**
     * 获取公司信息
     */
    getCompanyInfo(companyId: number): { cash: number; buildings: number; totalAssets: number; name: string } | null {
      if (companyId < 0 || companyId >= world.companies.count) return null;
      
      let buildingCount = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
          buildingCount++;
        }
      }
      
      return {
        cash: world.companies.cash[companyId],
        buildings: buildingCount,
        totalAssets: world.companies.totalAssets[companyId],
        name: world.companies.names?.[companyId] || `公司#${companyId}`,
      };
    },
    
    /**
     * 获取所有公司列表
     */
    getAllCompanies(): Array<{ id: number; name: string; cash: number; isAI: boolean }> {
      const companies: Array<{ id: number; name: string; cash: number; isAI: boolean }> = [];
      for (let i = 0; i < world.companies.count; i++) {
        companies.push({
          id: i,
          name: world.companies.names?.[i] || `公司#${i}`,
          cash: world.companies.cash[i],
          isAI: i !== 0,
        });
      }
      return companies;
    },
    
    // ========== 游戏控制 ==========
    
    /**
     * 设置游戏速度
     * @param speed 1, 2, 4, 8 (有效值)
     */
    setGameSpeed(speed: number): void {
      const store = useGameStore.getState();
      // 游戏只支持 1, 2, 4, 8 的速度
      const validSpeeds = [1, 2, 4, 8] as const;
      const closest = validSpeeds.reduce((prev, curr) =>
        Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev
      );
      store.setSpeed(closest);
      logs.push(`⏱️ 游戏速度设为 ${closest}x`);
    },
    
    /**
     * 暂停游戏
     */
    pauseGame(): void {
      const store = useGameStore.getState();
      store.pauseGame();
      logs.push(`⏸️ 游戏已暂停`);
    },
    
    /**
     * 恢复游戏
     */
    resumeGame(): void {
      const store = useGameStore.getState();
      store.resumeGame();
      logs.push(`▶️ 游戏已恢复`);
    },
    
    /**
     * 获取当前游戏时间
     */
    getGameTime(): { tick: number; day: number; hour: number } {
      return {
        tick: world.tick,
        day: Math.floor(world.tick / 24),
        hour: world.tick % 24,
      };
    },
    
    // ========== 市场交易 ==========
    
    /**
     * 创建买单
     * @param goodsId 商品ID
     * @param quantity 数量
     * @param price 价格
     * @returns 订单ID或null
     */
    placeBuyOrder(goodsId: number, quantity: number, price: number): number | null {
      return createBuyOrder(world, 0, goodsId, quantity, price);  // 0 = 玩家公司ID
    },
    
    /**
     * 创建卖单
     * @param goodsId 商品ID
     * @param quantity 数量
     * @param price 价格
     * @returns 订单ID或null
     */
    placeSellOrder(goodsId: number, quantity: number, price: number): number | null {
      return createSellOrder(world, 0, goodsId, quantity, price);  // 0 = 玩家公司ID
    },
    
    /**
     * 按名称创建买单
     */
    buyGoods(name: string, quantity: number, price: number): boolean {
      const goods = ALL_GOODS.find(g =>
        g.name === name ||
        g.name.includes(name) ||
        name.includes(g.name)
      );
      if (!goods) {
        logs.push(`❌ 找不到商品: ${name}`);
        return false;
      }
      const orderId = createBuyOrder(world, 0, goods.id, quantity, price);
      if (orderId !== null) {
        logs.push(`📥 已挂买单: ${quantity}个 ${goods.name} @ ¥${price}`);
        return true;
      }
      logs.push(`❌ 买单创建失败，可能资金不足`);
      return false;
    },
    
    /**
     * 按名称创建卖单
     */
    sellGoods(name: string, quantity: number, price: number): boolean {
      const goods = ALL_GOODS.find(g =>
        g.name === name ||
        g.name.includes(name) ||
        name.includes(g.name)
      );
      if (!goods) {
        logs.push(`❌ 找不到商品: ${name}`);
        return false;
      }
      const orderId = createSellOrder(world, 0, goods.id, quantity, price);
      if (orderId !== null) {
        logs.push(`📤 已挂卖单: ${quantity}个 ${goods.name} @ ¥${price}`);
        return true;
      }
      logs.push(`❌ 卖单创建失败，可能库存不足`);
      return false;
    },
    
    /**
     * 取消订单
     */
    cancelMarketOrder(orderId: number): boolean {
      const result = cancelOrder(world, orderId);
      if (result) {
        logs.push(`❎ 已取消订单 #${orderId}`);
        return true;
      }
      logs.push(`❌ 取消订单失败`);
      return false;
    },
    
    /**
     * 获取商品市场数据
     */
    getMarketData(goodsId: number): { price: number; demand: number; supply: number; ratio: number } | null {
      if (goodsId < 0 || goodsId >= ACTUAL_GOODS_COUNT) return null;
      const demand = world.goods.demands[goodsId];
      const supply = world.goods.supplies[goodsId];
      return {
        price: world.goods.prices[goodsId],
        demand,
        supply,
        ratio: supply > 0 ? demand / supply : 999,
      };
    },
    
    // ========== 批量操作函数 ==========
    
    /**
     * 给所有公司增加资金
     * @param amount 增加的金额
     * @param includePlayer 是否包括玩家（默认true）
     */
    giveAllCompaniesCash: (amount: number, includePlayer: boolean = true): void => {
      const startIdx = includePlayer ? 0 : 1;
      for (let i = startIdx; i < world.companies.count; i++) {
        world.companies.cash[i] += amount;
      }
      logs.push(`💰 给${includePlayer ? '所有' : 'AI'}公司增加 ¥${amount.toLocaleString()}`);
    },
    
    /**
     * 设置所有公司的资金
     */
    setAllCompaniesCash: (amount: number, includePlayer: boolean = true): void => {
      const startIdx = includePlayer ? 0 : 1;
      for (let i = startIdx; i < world.companies.count; i++) {
        world.companies.cash[i] = Math.max(0, amount);
      }
      logs.push(`💰 设置${includePlayer ? '所有' : 'AI'}公司资金为 ¥${amount.toLocaleString()}`);
    },
    
    /**
     * 给所有公司添加库存
     */
    giveAllCompaniesInventory: (goodsId: number, amount: number, includePlayer: boolean = true): void => {
      if (goodsId < 0 || goodsId >= ACTUAL_GOODS_COUNT) {
        logs.push(`❌ 无效的商品ID: ${goodsId}`);
        return;
      }
      const startIdx = includePlayer ? 0 : 1;
      for (let i = startIdx; i < world.companies.count; i++) {
        const idx = i * GOODS_COUNT + goodsId;
        world.companies.inventories[idx] = (world.companies.inventories[idx] || 0) + amount;
      }
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      logs.push(`📦 给${includePlayer ? '所有' : 'AI'}公司添加 ${amount} 个 ${goods?.name || '商品'}`);
    },
    
    /**
     * 清空所有公司的库存
     */
    clearAllInventories: (includePlayer: boolean = false): void => {
      const startIdx = includePlayer ? 0 : 1;
      for (let i = startIdx; i < world.companies.count; i++) {
        for (let g = 0; g < GOODS_COUNT; g++) {
          world.companies.inventories[i * GOODS_COUNT + g] = 0;
        }
      }
      logs.push(`🗑️ 清空${includePlayer ? '所有' : 'AI'}公司库存`);
    },
    
    /**
     * 停用所有建筑（除了玩家的）
     */
    deactivateAllBuildings: (includePlayer: boolean = false): number => {
      let count = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.isActive[i]) {
          const owner = world.buildings.owners[i];
          if (owner !== 0 || includePlayer) {
            world.buildings.isActive[i] = 0;
            count++;
          }
        }
      }
      logs.push(`🔴 停用了 ${count} 座建筑`);
      return count;
    },
    
    /**
     * 激活所有建筑
     */
    activateAllBuildings: (): number => {
      let count = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (!world.buildings.isActive[i]) {
          world.buildings.isActive[i] = 1;
          count++;
        }
      }
      logs.push(`🟢 激活了 ${count} 座建筑`);
      return count;
    },
    
    /**
     * 批量设置所有商品价格（乘数）
     */
    setAllPrices: (multiplier: number): void => {
      const m = Math.max(0.1, Math.min(100, multiplier));
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.prices[i] *= m;
        world.goods.prices[i] = Math.max(0.01, world.goods.prices[i]);
      }
      logs.push(`💱 所有商品价格 x${m.toFixed(2)}`);
    },
    
    /**
     * 重置所有商品价格到基准值
     */
    resetAllPrices: (): void => {
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.prices[i] = world.goods.baseValues[i] || 1;
      }
      logs.push(`🔄 所有商品价格已重置到基准值`);
    },
    
    /**
     * 批量设置所有商品需求（乘数）
     */
    setAllDemands: (multiplier: number): void => {
      const m = Math.max(0.1, Math.min(100, multiplier));
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.demands[i] *= m;
      }
      logs.push(`📊 所有商品需求 x${m.toFixed(2)}`);
    },
    
    /**
     * 批量设置所有商品供给（乘数）
     */
    setAllSupplies: (multiplier: number): void => {
      const m = Math.max(0.1, Math.min(100, multiplier));
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.supplies[i] *= m;
      }
      logs.push(`📊 所有商品供给 x${m.toFixed(2)}`);
    },
    
    // ========== 统计查询函数 ==========
    
    /**
     * 获取总建筑数量统计
     */
    getBuildingStats: (): { total: number; active: number; byType: Record<string, number>; byOwner: Record<string, number> } => {
      let total = 0;
      let active = 0;
      const byType: Record<string, number> = {};
      const byOwner: Record<string, number> = {};
      
      for (let i = 0; i < world.buildings.count; i++) {
        total++;
        if (world.buildings.isActive[i]) active++;
        
        const typeId = world.buildings.types[i];
        const building = ALL_BUILDINGS.find(b => b.id === typeId);
        const typeName = building?.name || `类型#${typeId}`;
        byType[typeName] = (byType[typeName] || 0) + 1;
        
        const ownerId = world.buildings.owners[i];
        const ownerName = world.companies.names?.[ownerId] || `公司#${ownerId}`;
        byOwner[ownerName] = (byOwner[ownerName] || 0) + 1;
      }
      
      return { total, active, byType, byOwner };
    },
    
    /**
     * 获取市场统计
     */
    getMarketStats: (): { avgPrice: number; totalDemand: number; totalSupply: number; hotGoods: string[]; coldGoods: string[] } => {
      let totalPrice = 0;
      let totalDemand = 0;
      let totalSupply = 0;
      const ratios: Array<{ name: string; ratio: number }> = [];
      
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        totalPrice += world.goods.prices[i];
        totalDemand += world.goods.demands[i];
        totalSupply += world.goods.supplies[i];
        
        const goods = ALL_GOODS.find(g => g.id === i);
        const ratio = world.goods.supplies[i] > 0
          ? world.goods.demands[i] / world.goods.supplies[i]
          : 999;
        ratios.push({ name: goods?.name || `商品#${i}`, ratio });
      }
      
      ratios.sort((a, b) => b.ratio - a.ratio);
      const hotGoods = ratios.slice(0, 5).map(r => r.name);
      const coldGoods = ratios.slice(-5).reverse().map(r => r.name);
      
      return {
        avgPrice: totalPrice / ACTUAL_GOODS_COUNT,
        totalDemand,
        totalSupply,
        hotGoods,
        coldGoods,
      };
    },
    
    /**
     * 获取公司排行榜
     */
    getCompanyRanking: (by: 'cash' | 'assets' | 'buildings' = 'cash'): Array<{ id: number; name: string; value: number }> => {
      const companies: Array<{ id: number; name: string; value: number }> = [];
      
      for (let i = 0; i < world.companies.count; i++) {
        let value = 0;
        if (by === 'cash') {
          value = world.companies.cash[i];
        } else if (by === 'assets') {
          value = world.companies.totalAssets[i];
        } else {
          // 计算建筑数量
          for (let j = 0; j < world.buildings.count; j++) {
            if (world.buildings.owners[j] === i && world.buildings.isActive[j]) {
              value++;
            }
          }
        }
        
        companies.push({
          id: i,
          name: world.companies.names?.[i] || `公司#${i}`,
          value,
        });
      }
      
      companies.sort((a, b) => b.value - a.value);
      return companies;
    },
    
    /**
     * 获取公司库存总值
     */
    getCompanyInventoryValue: (companyId: number): number => {
      if (companyId < 0 || companyId >= world.companies.count) return 0;
      
      let totalValue = 0;
      for (let g = 0; g < ACTUAL_GOODS_COUNT; g++) {
        const qty = world.companies.inventories[companyId * GOODS_COUNT + g] || 0;
        const price = world.goods.prices[g];
        totalValue += qty * price;
      }
      return totalValue;
    },
    
    /**
     * 获取公司所有库存详情
     */
    getCompanyAllInventory: (companyId: number): Array<{ id: number; name: string; quantity: number; value: number }> => {
      if (companyId < 0 || companyId >= world.companies.count) return [];
      
      const items: Array<{ id: number; name: string; quantity: number; value: number }> = [];
      for (let g = 0; g < ACTUAL_GOODS_COUNT; g++) {
        const qty = world.companies.inventories[companyId * GOODS_COUNT + g] || 0;
        if (qty > 0) {
          const goods = ALL_GOODS.find(gd => gd.id === g);
          const price = world.goods.prices[g];
          items.push({
            id: g,
            name: goods?.name || `商品#${g}`,
            quantity: qty,
            value: qty * price,
          });
        }
      }
      items.sort((a, b) => b.value - a.value);
      return items;
    },
    
    /**
     * 获取经济周期状态
     */
    getEconomyState: (): { phase: string; gdp: number; inflation: number; unemployment: number } => {
      return {
        phase: world.economyStats.cyclePhase || 'normal',
        gdp: world.economyStats.gdp || 0,
        inflation: world.economyStats.inflation || 0,
        unemployment: world.economyStats.unemployment || 0,
      };
    },
    
    // ========== 筛选函数 ==========
    
    /**
     * 按类型获取建筑列表
     */
    getBuildingsByType: (typeName: string): number[] => {
      const typeId = sandbox.findBuildingId(typeName);
      if (typeId === null) return [];
      
      const ids: number[] = [];
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.types[i] === typeId && world.buildings.isActive[i]) {
          ids.push(i);
        }
      }
      return ids;
    },
    
    /**
     * 按类别获取商品列表
     */
    getGoodsByCategory: (category: string): Array<{ id: number; name: string; price: number }> => {
      return ALL_GOODS
        .filter(g => g.category?.toLowerCase().includes(category.toLowerCase()))
        .map(g => ({
          id: g.id,
          name: g.name,
          price: world.goods.prices[g.id],
        }));
    },
    
    /**
     * 获取高价值商品（价格前N）
     */
    getTopPricedGoods: (n: number = 10): Array<{ id: number; name: string; price: number }> => {
      const goods = ALL_GOODS.slice(0, ACTUAL_GOODS_COUNT).map(g => ({
        id: g.id,
        name: g.name,
        price: world.goods.prices[g.id],
      }));
      goods.sort((a, b) => b.price - a.price);
      return goods.slice(0, n);
    },
    
    /**
     * 获取高需求商品
     */
    getHighDemandGoods: (n: number = 10): Array<{ id: number; name: string; demand: number; supply: number; ratio: number }> => {
      const goods = ALL_GOODS.slice(0, ACTUAL_GOODS_COUNT).map(g => {
        const demand = world.goods.demands[g.id];
        const supply = world.goods.supplies[g.id];
        return {
          id: g.id,
          name: g.name,
          demand,
          supply,
          ratio: supply > 0 ? demand / supply : 999,
        };
      });
      goods.sort((a, b) => b.ratio - a.ratio);
      return goods.slice(0, n);
    },
    
    /**
     * 获取富有的公司
     */
    getRichCompanies: (n: number = 10): Array<{ id: number; name: string; cash: number }> => {
      const companies: Array<{ id: number; name: string; cash: number }> = [];
      for (let i = 0; i < world.companies.count; i++) {
        companies.push({
          id: i,
          name: world.companies.names?.[i] || `公司#${i}`,
          cash: world.companies.cash[i],
        });
      }
      companies.sort((a, b) => b.cash - a.cash);
      return companies.slice(0, n);
    },
    
    /**
     * 获取贫穷的公司（可能濒临破产）
     */
    getPoorCompanies: (threshold: number = 10000): Array<{ id: number; name: string; cash: number }> => {
      const companies: Array<{ id: number; name: string; cash: number }> = [];
      for (let i = 1; i < world.companies.count; i++) { // 跳过玩家
        if (world.companies.cash[i] < threshold) {
          companies.push({
            id: i,
            name: world.companies.names?.[i] || `公司#${i}`,
            cash: world.companies.cash[i],
          });
        }
      }
      companies.sort((a, b) => a.cash - b.cash);
      return companies;
    },
    
    // ========== 转移函数 ==========
    
    /**
     * 转移资金
     */
    transferCash: (fromId: number, toId: number, amount: number): boolean => {
      if (fromId < 0 || fromId >= world.companies.count) return false;
      if (toId < 0 || toId >= world.companies.count) return false;
      if (world.companies.cash[fromId] < amount) return false;
      
      world.companies.cash[fromId] -= amount;
      world.companies.cash[toId] += amount;
      
      const fromName = world.companies.names?.[fromId] || `公司#${fromId}`;
      const toName = world.companies.names?.[toId] || `公司#${toId}`;
      logs.push(`💸 ${fromName} 转账 ¥${amount.toLocaleString()} 给 ${toName}`);
      return true;
    },
    
    /**
     * 转移库存
     */
    transferInventory: (fromId: number, toId: number, goodsId: number, amount: number): boolean => {
      if (fromId < 0 || fromId >= world.companies.count) return false;
      if (toId < 0 || toId >= world.companies.count) return false;
      if (goodsId < 0 || goodsId >= GOODS_COUNT) return false;
      
      const fromIdx = fromId * GOODS_COUNT + goodsId;
      const toIdx = toId * GOODS_COUNT + goodsId;
      
      const available = world.companies.inventories[fromIdx] || 0;
      if (available < amount) return false;
      
      world.companies.inventories[fromIdx] -= amount;
      world.companies.inventories[toIdx] = (world.companies.inventories[toIdx] || 0) + amount;
      
      const goods = ALL_GOODS.find(g => g.id === goodsId);
      const fromName = world.companies.names?.[fromId] || `公司#${fromId}`;
      const toName = world.companies.names?.[toId] || `公司#${toId}`;
      logs.push(`📦 ${fromName} 转移 ${amount} 个 ${goods?.name || '商品'} 给 ${toName}`);
      return true;
    },
    
    /**
     * 转移建筑所有权
     */
    transferBuilding: (buildingId: number, newOwnerId: number): boolean => {
      if (buildingId < 0 || buildingId >= world.buildings.count) return false;
      if (newOwnerId < 0 || newOwnerId >= world.companies.count) return false;
      
      const oldOwnerId = world.buildings.owners[buildingId];
      world.buildings.owners[buildingId] = newOwnerId;
      
      // 更新建筑计数
      if (world.companies.buildingCounts) {
        world.companies.buildingCounts[oldOwnerId]--;
        world.companies.buildingCounts[newOwnerId]++;
      }
      
      const typeId = world.buildings.types[buildingId];
      const building = ALL_BUILDINGS.find(b => b.id === typeId);
      const oldName = world.companies.names?.[oldOwnerId] || `公司#${oldOwnerId}`;
      const newName = world.companies.names?.[newOwnerId] || `公司#${newOwnerId}`;
      logs.push(`🏠 ${building?.name || '建筑'} 从 ${oldName} 转移给 ${newName}`);
      return true;
    },
    
    /**
     * 收购公司的所有建筑
     */
    acquireAllBuildings: (targetCompanyId: number, acquirerCompanyId: number = 0): number => {
      if (targetCompanyId < 0 || targetCompanyId >= world.companies.count) return 0;
      if (acquirerCompanyId < 0 || acquirerCompanyId >= world.companies.count) return 0;
      
      let count = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === targetCompanyId && world.buildings.isActive[i]) {
          world.buildings.owners[i] = acquirerCompanyId;
          count++;
        }
      }
      
      // 更新建筑计数
      if (world.companies.buildingCounts) {
        world.companies.buildingCounts[targetCompanyId] -= count;
        world.companies.buildingCounts[acquirerCompanyId] += count;
      }
      
      const targetName = world.companies.names?.[targetCompanyId] || `公司#${targetCompanyId}`;
      const acquirerName = world.companies.names?.[acquirerCompanyId] || `公司#${acquirerCompanyId}`;
      logs.push(`🏢 ${acquirerName} 收购了 ${targetName} 的 ${count} 座建筑`);
      return count;
    },
    
    // ========== 便捷按名称操作函数 ==========
    
    /**
     * 按名称给公司资金
     */
    giveCompanyCash: (companyName: string, amount: number): boolean => {
      const id = sandbox.findCompanyId(companyName);
      if (id === null) {
        logs.push(`❌ 找不到公司: ${companyName}`);
        return false;
      }
      sandbox.adjustCash(id, amount);
      logs.push(`💰 给 ${companyName} ¥${amount.toLocaleString()}`);
      return true;
    },
    
    /**
     * 按名称给公司库存
     */
    giveCompanyGoods: (companyName: string, goodsName: string, amount: number): boolean => {
      const companyId = sandbox.findCompanyId(companyName);
      if (companyId === null) {
        logs.push(`❌ 找不到公司: ${companyName}`);
        return false;
      }
      const goodsId = sandbox.findGoodsId(goodsName);
      if (goodsId === null) {
        logs.push(`❌ 找不到商品: ${goodsName}`);
        return false;
      }
      sandbox.addInventory(companyId, goodsId, amount);
      logs.push(`📦 给 ${companyName} ${amount} 个 ${goodsName}`);
      return true;
    },
    
    /**
     * 按名称为公司建造建筑
     */
    buildForCompany: (companyName: string, buildingName: string, count: number = 1): number[] => {
      const companyId = sandbox.findCompanyId(companyName);
      if (companyId === null) {
        logs.push(`❌ 找不到公司: ${companyName}`);
        return [];
      }
      const buildingId = sandbox.findBuildingId(buildingName);
      if (buildingId === null) {
        logs.push(`❌ 找不到建筑类型: ${buildingName}`);
        return [];
      }
      return sandbox.buildMultiple(buildingId, count, companyId);
    },
    
    /**
     * 按名称设置商品价格
     */
    setGoodsPrice: (goodsName: string, price: number): boolean => {
      const id = sandbox.findGoodsId(goodsName);
      if (id === null) {
        logs.push(`❌ 找不到商品: ${goodsName}`);
        return false;
      }
      sandbox.setPrice(id, price);
      logs.push(`💱 设置 ${goodsName} 价格为 ¥${price}`);
      return true;
    },
    
    /**
     * 按名称调整商品价格
     */
    adjustGoodsPrice: (goodsName: string, percent: number): boolean => {
      const id = sandbox.findGoodsId(goodsName);
      if (id === null) {
        logs.push(`❌ 找不到商品: ${goodsName}`);
        return false;
      }
      sandbox.adjustPrice(id, percent);
      logs.push(`💱 ${goodsName} 价格 ${percent > 0 ? '+' : ''}${percent}%`);
      return true;
    },
    
    // ========== 建筑配方相关 ==========
    
    /**
     * 设置建筑的生产配方
     */
    setBuildingRecipe: (buildingId: number, recipeId: number): boolean => {
      if (buildingId < 0 || buildingId >= world.buildings.count) {
        logs.push(`❌ 无效的建筑ID: ${buildingId}`);
        return false;
      }
      
      const typeId = world.buildings.types[buildingId];
      const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
      if (!buildingDef) return false;
      
      // 检查配方是否可用
      if (buildingDef.availableRecipes && !buildingDef.availableRecipes.includes(recipeId)) {
        logs.push(`❌ 该建筑不支持配方 ${recipeId}`);
        return false;
      }
      
      world.buildings.recipeIds[buildingId] = recipeId;
      logs.push(`🔧 设置建筑 #${buildingId} 的配方为 ${recipeId}`);
      return true;
    },
    
    /**
     * 获取建筑的可用配方
     */
    getBuildingAvailableRecipes: (buildingId: number): number[] => {
      if (buildingId < 0 || buildingId >= world.buildings.count) return [];
      
      const typeId = world.buildings.types[buildingId];
      const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
      return buildingDef?.availableRecipes || [];
    },
    
    /**
     * 设置建筑效率
     */
    setBuildingEfficiency: (buildingId: number, efficiency: number): boolean => {
      if (buildingId < 0 || buildingId >= world.buildings.count) return false;
      
      world.buildings.efficiencies[buildingId] = Math.max(0, Math.min(2, efficiency));
      logs.push(`⚙️ 设置建筑 #${buildingId} 效率为 ${(efficiency * 100).toFixed(0)}%`);
      return true;
    },
    
    /**
     * 批量设置公司所有建筑的效率
     */
    setCompanyBuildingsEfficiency: (companyId: number, efficiency: number): number => {
      let count = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
          world.buildings.efficiencies[i] = Math.max(0, Math.min(2, efficiency));
          count++;
        }
      }
      logs.push(`⚙️ 设置公司 ${companyId} 的 ${count} 座建筑效率为 ${(efficiency * 100).toFixed(0)}%`);
      return count;
    },
    
    // ========== 随机事件生成 ==========
    
    /**
     * 随机市场波动
     */
    randomMarketFluctuation: (intensity: number = 0.1): void => {
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        const change = (Math.random() - 0.5) * 2 * intensity;
        world.goods.prices[i] *= (1 + change);
        world.goods.prices[i] = Math.max(0.01, world.goods.prices[i]);
      }
      logs.push(`📈 市场随机波动 (强度 ${(intensity * 100).toFixed(0)}%)`);
    },
    
    /**
     * 随机公司倒闭
     */
    randomBankruptcy: (probability: number = 0.1): number => {
      let count = 0;
      for (let i = 1; i < world.companies.count; i++) {
        if (Math.random() < probability) {
          sandbox.bankruptCompany(i);
          count++;
        }
      }
      logs.push(`💀 ${count} 家公司随机倒闭`);
      return count;
    },
    
    /**
     * 季节性需求变化
     */
    seasonalDemandChange: (season: 'spring' | 'summer' | 'autumn' | 'winter'): void => {
      const multipliers: Record<string, number> = {
        spring: 1.1,
        summer: 1.2,
        autumn: 1.0,
        winter: 0.9,
      };
      const m = multipliers[season] || 1.0;
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        world.goods.demands[i] *= m;
      }
      const seasonNames: Record<string, string> = {
        spring: '春季',
        summer: '夏季',
        autumn: '秋季',
        winter: '冬季',
      };
      logs.push(`🌸 ${seasonNames[season]}需求变化 x${m.toFixed(1)}`);
    },
    
    // ========== 调试辅助 ==========
    
    /**
     * 打印世界状态摘要
     */
    printWorldSummary: (): void => {
      logs.push(`📊 === 世界状态摘要 ===`);
      logs.push(`   公司数量: ${world.companies.count}`);
      logs.push(`   建筑数量: ${world.buildings.count}`);
      logs.push(`   当前Tick: ${world.tick}`);
      logs.push(`   玩家资金: ¥${world.companies.cash[0].toLocaleString()}`);
      
      let playerBuildings = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === 0 && world.buildings.isActive[i]) {
          playerBuildings++;
        }
      }
      logs.push(`   玩家建筑: ${playerBuildings} 座`);
    },
    
    /**
     * 打印公司详情
     */
    printCompanyDetails: (companyId: number): void => {
      if (companyId < 0 || companyId >= world.companies.count) {
        logs.push(`❌ 无效的公司ID: ${companyId}`);
        return;
      }
      
      const name = world.companies.names?.[companyId] || `公司#${companyId}`;
      const cash = world.companies.cash[companyId];
      const assets = world.companies.totalAssets[companyId];
      
      let buildingCount = 0;
      for (let i = 0; i < world.buildings.count; i++) {
        if (world.buildings.owners[i] === companyId && world.buildings.isActive[i]) {
          buildingCount++;
        }
      }
      
      const inventoryValue = sandbox.getCompanyInventoryValue(companyId);
      
      logs.push(`🏢 === ${name} ===`);
      logs.push(`   资金: ¥${cash.toLocaleString()}`);
      logs.push(`   总资产: ¥${assets.toLocaleString()}`);
      logs.push(`   建筑数量: ${buildingCount} 座`);
      logs.push(`   库存价值: ¥${inventoryValue.toLocaleString()}`);
    },
    
    /**
     * 打印市场价格表
     */
    printPriceList: (limit: number = 20): void => {
      logs.push(`💰 === 商品价格表 (前${limit}个) ===`);
      const goods = sandbox.getTopPricedGoods(limit);
      for (const g of goods) {
        logs.push(`   ${g.name}: ¥${g.price.toFixed(2)}`);
      }
    },
    
    // ========== 常量 ==========
    GOODS_COUNT: ACTUAL_GOODS_COUNT,
    PLAYER_ID: 0,
    MAX_BUILDINGS: MAX_BUILDINGS,
    
    // ========== 数学工具 ==========
    Math,
    random: Math.random,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
    
    // ========== 日志 ==========
    log(message: string): void {
      logs.push(message);
      console.log('[Sandbox]', message);
    },
    
    print: (message: string): void => {
      logs.push(String(message));
    },
  };
  
  return sandbox;
}

/**
 * 在沙盒中执行代码
 */
export function executeCode(code: string): CodeExecutionResult {
  const store = useGameStore.getState();
  const world = store.getWorld();
  
  if (!world) {
    return {
      success: false,
      message: '游戏未初始化',
      logs: [],
      error: '无法获取游戏世界',
    };
  }
  
  // 1. 验证代码安全性
  const validation = validateCode(code);
  if (!validation.valid) {
    return {
      success: false,
      message: '代码安全检查失败',
      logs: [],
      error: validation.reason,
    };
  }
  
  // 2. 创建日志收集器
  const logs: string[] = [];
  
  // 3. 创建沙盒API
  const sandbox = createSandboxAPI(world, logs);
  
  // 4. 构建安全执行环境
  const sandboxKeys = Object.keys(sandbox);
  const sandboxValues = Object.values(sandbox);
  
  try {
    // 5. 创建并执行函数
    // 使用 new Function 而不是 eval，并限制作用域
    const wrappedCode = `
      "use strict";
      ${code}
    `;
    
    // 创建函数，参数是沙盒变量
    const executor = new Function(...sandboxKeys, wrappedCode);
    
    // 设置超时（防止无限循环）
    const startTime = Date.now();
    const timeout = 5000; // 5秒超时
    
    // 执行代码
    executor(...sandboxValues);
    
    const elapsed = Date.now() - startTime;
    
    // 6. 触发UI刷新（通过手动tick）
    // 这确保建筑创建等操作能在UI中显示
    try {
      const currentStore = useGameStore.getState();
      // 强制刷新UI状态
      useGameStore.setState({
        tick: currentStore.tick + 0.0001,
        playerBuildings: countPlayerBuildings(world),
        playerCash: world.companies.cash[0],
        playerAssets: world.companies.totalAssets[0],
      });
    } catch (e) {
      console.warn('[CodeSandbox] UI刷新失败:', e);
    }
    
    // 7. 返回结果
    return {
      success: true,
      message: `代码执行成功 (${elapsed}ms)`,
      logs,
    };
    
  } catch (error) {
    return {
      success: false,
      message: '代码执行出错',
      logs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 计算玩家拥有的建筑数量
 */
function countPlayerBuildings(world: GameWorld): number {
  let count = 0;
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === 0 && world.buildings.isActive[i]) {
      count++;
    }
  }
  return count;
}

/**
 * 从LLM响应中提取代码块
 */
export function extractCodeFromResponse(response: string): string | null {
  // 匹配 ```javascript 或 ```js 代码块
  const codeBlockMatch = response.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // 匹配 <code> 标签
  const codeTagMatch = response.match(/<code>([\s\S]*?)<\/code>/);
  if (codeTagMatch) {
    return codeTagMatch[1].trim();
  }
  
  // 如果整个响应看起来像代码，直接返回
  if (response.includes('world.') || response.includes('for (') || response.includes('goods.')) {
    return response.trim();
  }
  
  return null;
}

/**
 * 格式化执行结果
 */
export function formatExecutionResult(result: CodeExecutionResult): string {
  const lines: string[] = [];
  
  if (result.success) {
    lines.push('⚡ **代码执行成功**');
    lines.push('');
    lines.push(`✨ ${result.message}`);
  } else {
    lines.push('❌ **代码执行失败**');
    lines.push('');
    lines.push(`⚠️ ${result.error || result.message}`);
  }
  
  if (result.logs.length > 0) {
    lines.push('');
    lines.push('📋 **执行日志:**');
    for (const log of result.logs) {
      lines.push(`  ${log}`);
    }
  }
  
  return lines.join('\n');
}