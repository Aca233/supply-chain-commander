/**
 * 上帝模式系统提示词
 * 增强版：包含商品列表、Few-shot示例、天马行空理解
 */

import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { ACTUAL_GOODS_COUNT } from '@/core/constants';

/**
 * 商品名称别名映射
 */
export const GOODS_ALIASES: Record<string, string[]> = {
  '铁矿石': ['铁矿', '铁'],
  '铜矿石': ['铜矿'],
  '铝土矿': ['铝矿'],
  '煤炭': ['煤'],
  '原油': ['石油', '油'],
  '天然气': ['燃气', '气'],
  '木材': ['木头', '木'],
  '棉花': ['棉'],
  '粮食': ['粮', '谷物', '麦子'],
  '硅石': ['硅', '沙子'],
  '稀土': ['稀有金属'],
  '天然橡胶': ['生胶'],
  '化工原料': ['化学原料'],
  '锂矿': ['锂'],
  '钢材': ['钢铁', '钢', '铁'],
  '铜材': ['铜'],
  '铝材': ['铝'],
  '玻璃': ['玻璃板'],
  '塑料': ['塑胶'],
  '橡胶制品': ['橡胶'],
  '化学品': ['化工品', '化学制品'],
  '水泥': ['混凝土'],
  '纸张': ['纸'],
  '纺织品': ['布', '布料', '织物'],
  '燃油': ['汽油', '柴油', '燃料'],
  '电子元件': ['电子', '元器件', '零件'],
  '芯片': ['半导体', '处理器', 'CPU', '集成电路'],
  '电池': ['蓄电池', '锂电池'],
  '电机': ['马达', '发动机'],
  '屏幕': ['显示屏', '屏', '面板'],
  '机械部件': ['机械零件', '机械'],
  '汽车零部件': ['汽车配件', '车零件'],
  '航空部件': ['飞机零件', '航空配件'],
  '光伏板': ['太阳能板', '太阳板'],
  '风机叶片': ['风叶', '风机'],
  '建筑材料': ['建材'],
  '包装材料': ['包装'],
  '电脑': ['计算机', '电脑'],
  '家电': ['电器', '家用电器'],
  '汽车': ['车', '轿车', '小汽车'],
  '电动汽车': ['电车', '新能源车', '电动车'],
  '服装': ['衣服', '衣物', '服饰'],
  '食品': ['食物', '吃的'],
  '饮料': ['喝的', '水', '饮品'],
  '家具': ['桌椅', '沙发'],
  '高端手机': ['旗舰机', 'iPhone', '苹果手机'],
  '平价手机': ['千元机', '便宜手机'],
  '电力': ['电', '供电'],
  '蔬菜': ['菜', '青菜'],
  '水果': ['果子', '鲜果'],
  '牲畜': ['牛羊', '牛', '羊', '猪'],
  '家禽': ['鸡鸭', '鸡', '鸭'],
  '水产': ['鱼虾', '鱼', '虾', '海鲜'],
  '肉类': ['肉', '猪肉', '牛肉'],
  '乳制品': ['奶', '牛奶', '奶制品'],
  '冷冻食品': ['冻品', '速冻'],
  '罐头食品': ['罐头'],
  '零食': ['小吃', '薯片'],
  '有机食品': ['有机', '绿色食品'],
  '宠物食品': ['猫粮', '狗粮', '宠物粮'],
  '药材': ['中药', '草药'],
  '抗生素': ['消炎药'],
  '疫苗': ['预防针'],
  '仿制药': ['普通药'],
  '专利药': ['进口药', '原研药'],
  '非处方药': ['OTC', '常用药'],
  '诊断设备': ['检测设备', 'CT', '核磁'],
  '手术设备': ['手术台', '手术器械'],
  '金矿石': ['金矿'],
  '钻石矿石': ['钻矿'],
  '黄金': ['金子', '金'],
  '钻石': ['钻', '宝石'],
  '丝绸': ['绸缎', '蚕丝'],
  '设计师服装': ['名牌衣服', '奢侈服装', '大牌'],
  '奢侈腕表': ['名表', '手表', '劳力士'],
  '豪华汽车': ['豪车', '跑车', '超跑', '法拉利', '保时捷'],
  '珠宝': ['首饰', '项链', '戒指'],
  '工业机器人': ['机器人', '机械臂'],
  '无人机': ['飞行器', '航拍机'],
};

/**
 * 建筑类型别名映射
 */
export const BUILDING_ALIASES: Record<string, string[]> = {
  '铁矿场': ['铁矿', '采铁场'],
  '铜矿场': ['铜矿', '采铜场'],
  '煤矿场': ['煤矿', '采煤场'],
  '油田': ['油井', '采油场'],
  '天然气田': ['气田', '采气场'],
  '伐木场': ['林场', '木材厂'],
  '农场': ['农庄', '种植园'],
  '牧场': ['养殖场', '畜牧场'],
  '渔场': ['渔港', '养殖塘'],
  '钢铁厂': ['炼钢厂', '钢厂'],
  '炼油厂': ['石油厂', '油厂'],
  '化工厂': ['化学厂'],
  '水泥厂': ['混凝土厂'],
  '纺织厂': ['织布厂', '布厂'],
  '造纸厂': ['纸厂'],
  '电子厂': ['电子元件厂', '元器件厂'],
  '芯片厂': ['晶圆厂', '半导体厂'],
  '电池厂': ['蓄电池厂'],
  '汽车厂': ['车厂', '整车厂'],
  '食品厂': ['食品加工厂'],
  '药厂': ['制药厂', '医药厂'],
  '家具厂': ['木器厂'],
  '服装厂': ['制衣厂', '成衣厂'],
  '发电厂': ['电厂', '电站'],
  '太阳能电站': ['光伏电站', '太阳能厂'],
  '风力电站': ['风电场', '风力发电'],
};

/**
 * 构建商品列表字符串
 */
function buildGoodsListString(): string {
  const categories = {
    '原材料': ALL_GOODS.filter(g => g.category === 'raw'),
    '基础材料': ALL_GOODS.filter(g => g.category === 'basic'),
    '中间产品': ALL_GOODS.filter(g => g.category === 'intermediate'),
    '最终产品': ALL_GOODS.filter(g => g.category === 'final'),
  };
  
  const lines: string[] = [];
  for (const [catName, goods] of Object.entries(categories)) {
    const names = goods.map(g => g.name).join('、');
    lines.push(`- ${catName}：${names}`);
  }
  return lines.join('\n');
}

/**
 * 构建上帝模式系统提示词
 */
export function buildGodModeSystemPrompt(): string {
  const goodsList = buildGoodsListString();
  
  return `你是这个供应链模拟游戏世界的**造物主/上帝**。玩家用自然语言描述想要发生的事情，你需要理解其意图并使用"神圣干预"函数来实现。

## 世界中的商品
${goodsList}

## 理解人话的规则

当玩家说话时，你需要理解他们的**真实意图**，即使他们用模糊、口语化或天马行空的方式表达。以下是一些示例：

### 1. 要钱/资源类
- "给我钱" / "让我有钱" / "我要发财" / "来点启动资金" → adjust_company_cash(companyId=0, amount=10000000)
- "我要一亿" / "给我一个亿" → adjust_company_cash(companyId=0, amount=100000000)
- "我穷死了" / "没钱了给点" → adjust_company_cash(companyId=0, amount=50000000)
- "给我钢铁" / "来点钢材" → inject_goods(companyId=0, goodsName="钢材", amount=10000)
- "我要原料" → 给多种原材料

### 2. 价格操控类
- "让钢铁涨价" / "钢价翻倍" → adjust_price(goodsName="钢材", percent=100)
- "石油暴涨" / "油价疯涨" → trigger_price_shock(goodsName="原油", type="surge")
- "粮食跌价" / "粮价崩盘" → trigger_price_shock(goodsName="粮食", type="crash")
- "物价飞涨" / "通货膨胀" → trigger_economic_event(eventType="inflation")
- "东西都便宜点" → adjust_all_prices(percent=-30)
- "让XX变得珍贵/值钱" → 大幅涨价

### 3. 经济事件类
- "经济危机" / "金融海啸" / "股灾" / "大萧条" → trigger_economic_event(eventType="recession")
- "经济繁荣" / "黄金时代" / "经济起飞" → trigger_economic_event(eventType="boom")
- "通货膨胀" / "物价飞涨" → trigger_economic_event(eventType="inflation")
- "通货紧缩" / "消费萎靡" → trigger_economic_event(eventType="deflation")

### 4. 灾难/破坏类
- "地震" / "大地震" / "天崩地裂" → trigger_disaster(disasterType="earthquake", severity="major")
- "洪水" / "发大水" / "洪涝" → trigger_disaster(disasterType="flood", severity="major")
- "火灾" / "大火" / "天火" → trigger_disaster(disasterType="fire", severity="major")
- "瘟疫" / "病毒" / "疫情" → trigger_disaster(disasterType="plague", severity="major")
- "毁掉一切" / "末日" / "天灾" → 连续触发多种灾难
- "毁掉公司X" / "干掉对手" → bankrupt_company 或 destroy_company_buildings
- "全部公司破产" / "消灭所有竞争对手" / "让所有AI破产" → bankrupt_all_companies()
- "清理市场" / "独占市场" → bankrupt_all_companies()

### 5. 天马行空类（复合操作）
- "让天下大乱" → trigger_disaster(多次) + trigger_economic_event(recession)
- "创造商业帝国" / "让我称霸" → grant_building(多个) + adjust_company_cash(大额) + inject_goods(多种)
- "让我赢" / "一键通关" → 给大量资源、建筑、资金
- "开启末日" / "世界毁灭" → 触发所有灾难 + 经济危机
- "重新洗牌" / "格局大变" → 让所有公司资金归零重来
- "让穷人翻身" → 给AI公司发钱同时削弱玩家（或相反）
- "垄断市场" → 给玩家大量库存 + 建筑
- "科技爆发" → 给高科技产品（芯片、电子等）
- "饥荒" → 让粮食、食品暴涨 + 销毁库存
- "能源危机" → 原油、电力、天然气暴涨

### 6. 建筑/设施类
- "给我一座钢铁厂" / "建个钢厂" → grant_building(companyId=0, buildingType="钢铁厂", count=1)
- "给我10座农场" → grant_building(companyId=0, buildingType="农场", count=10)
- "拆掉XX的建筑" / "摧毁XX" → destroy_company_buildings(companyId=X)

### 7. 时间控制类
- "快进一天" → fast_forward(ticks=24)
- "过一个月" / "快进30天" → fast_forward(ticks=720)
- "时光飞逝" / "过一年" → fast_forward(ticks=8760)

## 重要规则

1. **companyId 映射**：
   - 0 = 玩家公司 ("我"、"玩家"、"我的")
   - 1-N = AI公司 ("对手"、"敌人"、"公司1"、"AI")
   
2. **商品名称容错**：
   - 接受别名："钢铁"="钢材"、"石油"="原油"、"芯片"="半导体"
   - 接受简称："钢"="钢材"、"油"="原油"、"电"="电力"
   
3. **数量推断**：
   - "一点" = 1000-10000
   - "一些" = 10000-50000
   - "很多"/"大量" = 100000+
   - "一亿" = 100000000
   
4. **多操作组合**：
   - 对于复杂请求，可以调用多个函数
   - 例如"让我发财"可以：资金+1亿、送10座工厂、给各种原材料

5. **回复风格**：
   - 使用神圣、戏剧性的语气
   - 用emoji增强效果：⚡💰💥🏭📈📉🌪️🔥
   - 简洁描述做了什么

## 当前时间
- 24 tick = 1 天
- 720 tick = 1 月
- 8760 tick = 1 年`;
}

/**
 * 构建世界状态上下文
 */
export function buildWorldContext(): string {
  const store = useGameStore.getState();
  const world = store.getWorld();
  
  if (!world) {
    return '世界尚未创建。';
  }
  
  const lines: string[] = ['## 当前世界状态'];
  
  // 玩家状态
  lines.push(`\n### 玩家公司 (ID: 0)`);
  lines.push(`- 资金: ¥${store.playerCash.toLocaleString()}`);
  lines.push(`- 资产: ¥${store.playerAssets.toLocaleString()}`);
  lines.push(`- 建筑: ${store.playerBuildings} 座`);
  lines.push(`- 游戏时间: ${store.gameDate}`);
  
  // AI公司概况
  lines.push(`\n### AI公司 (共${world.companies.count - 1}家)`);
  for (let i = 1; i < Math.min(world.companies.count, 6); i++) {
    const cash = world.companies.cash[i];
    lines.push(`- 公司 #${i}: ¥${(cash / 1000000).toFixed(1)}M`);
  }
  if (world.companies.count > 6) {
    lines.push(`- ...还有 ${world.companies.count - 6} 家公司`);
  }
  
  // 价格概况（取变化最大的5个）
  lines.push(`\n### 价格概况`);
  const priceChanges: Array<{ name: string; change: number }> = [];
  for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
    const goods = ALL_GOODS.find(g => g.id === i);
    if (!goods) continue;
    const price = world.goods.prices[i];
    const base = world.goods.baseValues[i];
    const change = ((price - base) / base) * 100;
    priceChanges.push({ name: goods.name, change });
  }
  priceChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  for (const p of priceChanges.slice(0, 5)) {
    const icon = p.change > 5 ? '📈' : p.change < -5 ? '📉' : '➡️';
    lines.push(`- ${icon} ${p.name}: ${p.change >= 0 ? '+' : ''}${p.change.toFixed(0)}%`);
  }
  
  // 经济周期
  lines.push(`\n### 经济周期`);
  const phases: Record<string, string> = {
    expansion: '扩张期',
    peak: '顶峰期',
    contraction: '收缩期',
    trough: '低谷期',
  };
  lines.push(`- 当前阶段: ${phases[world.economyStats.cyclePhase] || world.economyStats.cyclePhase}`);
  
  return lines.join('\n');
}

/**
 * 模糊匹配商品名称
 * @param input 用户输入的名称
 * @returns 匹配到的正式商品名称，或null
 */
export function fuzzyMatchGoodsName(input: string): string | null {
  // 1. 精确匹配
  const exactMatch = ALL_GOODS.find(g => g.name === input);
  if (exactMatch) return exactMatch.name;
  
  // 2. 别名匹配
  for (const [officialName, aliases] of Object.entries(GOODS_ALIASES)) {
    if (aliases.includes(input)) {
      return officialName;
    }
    // 也检查正式名是否匹配
    if (officialName === input) {
      return officialName;
    }
  }
  
  // 3. 部分匹配（包含关系）
  for (const goods of ALL_GOODS) {
    if (goods.name.includes(input) || input.includes(goods.name)) {
      return goods.name;
    }
  }
  
  // 4. 别名部分匹配
  for (const [officialName, aliases] of Object.entries(GOODS_ALIASES)) {
    for (const alias of aliases) {
      if (alias.includes(input) || input.includes(alias)) {
        return officialName;
      }
    }
  }
  
  return null;
}

/**
 * 模糊匹配建筑类型
 */
export function fuzzyMatchBuildingType(input: string): string | null {
  // 1. 精确匹配
  if (BUILDING_ALIASES[input]) {
    return input;
  }
  
  // 2. 别名匹配
  for (const [officialName, aliases] of Object.entries(BUILDING_ALIASES)) {
    if (aliases.includes(input)) {
      return officialName;
    }
  }
  
  // 3. 部分匹配
  for (const officialName of Object.keys(BUILDING_ALIASES)) {
    if (officialName.includes(input) || input.includes(officialName)) {
      return officialName;
    }
  }
  
  return null;
}