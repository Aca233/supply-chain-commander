/**
 * 游戏上下文构建器
 * 为 LLM 构建当前游戏状态的上下文信息
 */

import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { formatGameDate } from '@/core/world/GameWorld';

export interface GameContext {
  playerStatus: {
    cash: number;
    assets: number;
    buildingCount: number;
    gameDate: string;
  };
  recentPrices: Array<{ name: string; price: number; trend: string }>;
  playerBuildings: Array<{ id: number; name: string; level: number; status: string }>;
  topInventory: Array<{ name: string; quantity: number; value: number }>;
}

/**
 * 构建游戏上下文
 */
export function buildGameContext(): GameContext {
  const store = useGameStore.getState();
  const world = store.getWorld();
  
  if (!world) {
    return {
      playerStatus: { cash: 0, assets: 0, buildingCount: 0, gameDate: '' },
      recentPrices: [],
      playerBuildings: [],
      topInventory: [],
    };
  }
  
  // 获取玩家状态
  const playerStatus = {
    cash: store.playerCash,
    assets: store.playerAssets,
    buildingCount: store.playerBuildings,
    gameDate: formatGameDate(store.tick),
  };
  
  // 获取主要商品价格（前15个）
  const recentPrices = ALL_GOODS.slice(0, 15).map(g => {
    const trend = store.getPriceTrend(g.id);
    return {
      name: g.name,
      price: world.goods.prices[g.id],
      trend: trend?.direction || 'stable',
    };
  });
  
  // 获取玩家建筑（最多10个）
  const buildings = store.getPlayerBuildings();
  const playerBuildings = buildings.slice(0, 10).map(b => ({
    id: b.id,
    name: b.name,
    level: b.level,
    status: b.isRetail ? '零售店' : (b.status ? '运行中' : '停止'),
  }));
  
  // 获取库存（最多10个）
  const inventory = store.getPlayerInventory();
  const topInventory = inventory.slice(0, 10);
  
  return {
    playerStatus,
    recentPrices,
    playerBuildings,
    topInventory,
  };
}

/**
 * 构建系统提示词
 */
export function buildSystemPrompt(): string {
  return `你是一个供应链模拟游戏的AI助手。你可以帮助玩家查询信息、执行操作和提供策略建议。

【请求类型判断】
1. 数据查询类：用户想知道某个具体数值
   - "市场行情"/"热门价格" → 调用 query_hot_prices
   - "XX价格"（具体商品）→ 调用 query_market_price
   - "库存" → 调用 query_inventory
   - "建筑列表" → 调用 query_buildings
   - "状态"/"资产"/"现金" → 调用 query_player_status

2. 操作执行类：用户想要执行某个动作
   - "建造"/"建设" → 调用 build_building

3. 建议分析类：用户需要你的分析和建议
   - "投资建议"/"策略"/"分析"/"建议"/"应该怎么做"
   → 不要调用任何函数，直接用文字回复你的分析和建议
   → 根据系统消息中提供的游戏状态（现金、库存、建筑）给出具体建议

【回复格式要求】
- 使用中文回复
- 给建议时要具体，例如"建议建造钢铁厂因为钢材价格上涨"
- 不要只返回数据，要给出分析
- 不要写代码

【重要：每次回复末尾都要给出后续选项】
在回复的最后，必须添加"你可以："部分，列出3-5个用户可能想做的后续操作，格式如下：

---
**你可以：**
1. 查看市场行情
2. 建造新建筑
3. 查看库存详情
4. 获取投资建议`;
}

/**
 * 构建上下文消息
 */
export function buildContextMessage(): string {
  const context = buildGameContext();
  
  let message = `当前游戏状态：
- 现金: ¥${context.playerStatus.cash.toLocaleString()}
- 资产: ¥${context.playerStatus.assets.toLocaleString()}
- 建筑数: ${context.playerStatus.buildingCount}
- 游戏时间: ${context.playerStatus.gameDate}`;

  if (context.topInventory.length > 0) {
    message += `\n\n主要库存：`;
    context.topInventory.slice(0, 5).forEach(item => {
      message += `\n- ${item.name}: ${item.quantity.toFixed(0)}单位`;
    });
  }

  if (context.playerBuildings.length > 0) {
    message += `\n\n拥有建筑：`;
    context.playerBuildings.slice(0, 5).forEach(b => {
      message += `\n- ${b.name} (Lv.${b.level}) - ${b.status}`;
    });
  }

  return message;
}