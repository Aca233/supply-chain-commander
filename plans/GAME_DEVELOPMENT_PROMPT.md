# 《供应链指挥官》完整游戏开发规范

> **文档性质**: 可直接用于AI辅助开发的完整游戏设计与技术规范
> **版本**: 1.0
> **目标**: 构建一个基于真实经济学原理的高性能商业模拟游戏

---

## 第一部分：游戏愿景

### 核心定位
这是一款**经济模拟/商业策略**游戏，玩家扮演企业CEO，在一个遵循真实经济学原理运行的虚拟城市中，通过生产、交易、竞争来建立商业帝国。

### 设计哲学
1. **宏观视角** - 玩家做战略决策，不做微操
2. **经济真实** - 价格由供需曲线决定，不靠随机数
3. **涌现复杂** - 简单规则产生复杂行为，而非硬编码剧情
4. **高性能** - 10ms/tick，支持大规模模拟

### 核心体验
```
建造建筑 → 配置生产 → 市场交易 → 应对竞争 → 扩张规模
```

---

## 第二部分：经济系统（核心）

### 2.1 价格形成机制

**原则**: 价格是供需均衡的结果，不是随机波动。

```typescript
// 均衡价格搜索（瓦尔拉斯调整）
function findEquilibriumPrice(
  supplyFn: (price: number) => number,
  demandFn: (price: number) => number,
  initialPrice: number
): number {
  let price = initialPrice;
  
  for (let i = 0; i < 50; i++) {
    const supply = supplyFn(price);
    const demand = demandFn(price);
    const excess = demand - supply;
    
    if (Math.abs(excess) < supply * 0.01) break;
    
    // 超额需求则涨价，超额供给则跌价
    price *= 1 + excess / (supply + demand) * 0.1;
  }
  
  return price;
}
```

### 2.2 供给曲线（企业行为）

**原则**: 企业根据边际成本=边际收益确定产量。

```typescript
interface CostModel {
  fixedCost: number;        // 固定成本（折旧、租金）
  variableCost: number;     // 单位可变成本
  optimalCapacity: number;  // 最优产能（边际成本最低点）
  curveFactor: number;      // 边际成本递增系数
}

// 计算边际成本
function marginalCost(model: CostModel, quantity: number): number {
  if (quantity <= model.optimalCapacity) {
    return model.variableCost;
  }
  const excess = quantity - model.optimalCapacity;
  return model.variableCost * (1 + model.curveFactor * excess / model.optimalCapacity);
}

// 利润最大化产量（MC = MR = Price）
function optimalQuantity(model: CostModel, price: number): number {
  let low = 0, high = model.optimalCapacity * 3;
  while (high - low > 1) {
    const mid = (low + high) / 2;
    if (marginalCost(model, mid) < price) low = mid;
    else high = mid;
  }
  return Math.floor(low);
}
```

### 2.3 需求曲线（消费者行为）

**原则**: 需求由效用函数和预算约束决定，不同商品有不同弹性。

```typescript
interface DemandModel {
  type: 'necessity' | 'normal' | 'luxury';
  baseQuantity: number;     // 基准需求量
  priceElasticity: number;  // 价格弹性（必需品-0.3, 奢侈品-2.5）
  incomeElasticity: number; // 收入弹性
}

// 计算需求量
function calculateDemand(
  model: DemandModel,
  price: number,
  basePrice: number,
  income: number,
  baseIncome: number
): number {
  const priceEffect = Math.pow(price / basePrice, model.priceElasticity);
  const incomeEffect = Math.pow(income / baseIncome, model.incomeElasticity);
  return model.baseQuantity * priceEffect * incomeEffect;
}

// 预设弹性参数
const ELASTICITY_PRESETS = {
  food:     { priceElasticity: -0.3, incomeElasticity: 0.5 },   // 刚需
  clothing: { priceElasticity: -1.0, incomeElasticity: 1.0 },   // 一般
  car:      { priceElasticity: -1.5, incomeElasticity: 2.0 },   // 耐用品
  luxury:   { priceElasticity: -2.5, incomeElasticity: 3.0 },   // 奢侈品
};
```

### 2.4 消费者分层

**原则**: 收入分布影响需求结构。

```typescript
interface PopulationLayer {
  name: string;
  share: number;          // 人口占比
  avgIncome: number;      // 平均收入
  consumptionPriority: string[]; // 消费优先级
}

const POPULATION_LAYERS: PopulationLayer[] = [
  { name: '高收入', share: 0.10, avgIncome: 50000, consumptionPriority: ['luxury', 'car', 'electronics'] },
  { name: '中产',   share: 0.40, avgIncome: 15000, consumptionPriority: ['appliances', 'car', 'clothing'] },
  { name: '工薪',   share: 0.35, avgIncome: 6000,  consumptionPriority: ['food', 'clothing', 'electronics'] },
  { name: '低收入', share: 0.15, avgIncome: 2500,  consumptionPriority: ['food', 'daily-necessities'] },
];

// 替代品机制
interface SubstitutionRule {
  primary: string;
  substitute: string;
  priceRatioThreshold: number;  // 首选价格超过替代品多少倍时触换
  utilityRatio: number;         // 替代品效用比例
}

const SUBSTITUTION_RULES: SubstitutionRule[] = [
  { primary: 'beef', substitute: 'pork', priceRatioThreshold: 1.5, utilityRatio: 0.85 },
  { primary: 'premium-phone', substitute: 'budget-phone', priceRatioThreshold: 2.0, utilityRatio: 0.7 },
];
```

---

## 第三部分：生产系统

### 3.1 生产方式配置（Victoria 3风格）

**原则**: 每个建筑有多个槽位，每个槽位可选择不同方式，组合产生效果。

```typescript
interface ProductionSlot {
  type: 'process' | 'automation' | 'energy' | 'logistics' | 'quality';
  selectedMethod: string;
  availableMethods: ProductionMethod[];
}

interface ProductionMethod {
  id: string;
  name: string;
  
  // 配方修正
  inputMultiplier: number;   // 投入倍数
  outputMultiplier: number;  // 产出倍数
  
  // 成本修正
  laborMultiplier: number;   // 人力需求
  energyMultiplier: number;  // 能源需求
  
  // 前置条件
  requiredLevel?: number;    // 需要建筑等级
  
  // 切换冷却
  switchCooldown: number;    // tick数
}

// 示例：钢铁厂配置
const STEEL_MILL_SLOTS: ProductionSlot[] = [
  {
    type: 'process',
    availableMethods: [
      { id: 'blast_furnace', name: '高炉炼钢', inputMultiplier: 1.0, outputMultiplier: 1.0, laborMultiplier: 1.0, energyMultiplier: 1.0, switchCooldown: 48 },
      { id: 'electric_arc', name: '电弧炉炼钢', inputMultiplier: 0.8, outputMultiplier: 1.2, laborMultiplier: 0.7, energyMultiplier: 1.5, switchCooldown: 24 },
    ]
  },
  {
    type: 'automation',
    availableMethods: [
      { id: 'manual', name: '人工', outputMultiplier: 0.8, laborMultiplier: 1.5 },
      { id: 'semi_auto', name: '半自动', outputMultiplier: 1.0, laborMultiplier: 1.0 },
      { id: 'full_auto', name: '全自动', outputMultiplier: 1.2, laborMultiplier: 0.4, requiredLevel: 3 },
    ]
  },
];
```

### 3.2 配方与产业链

```typescript
interface Recipe {
  inputs: { goodsId: string; amount: number }[];
  outputs: { goodsId: string; amount: number }[];
  ticksRequired: number;
  laborRequired: number;
  energyRequired: number;
}

// 4层产业链示例
const RECIPES = {
  // 层级0: 采掘
  'iron-ore': { inputs: [], outputs: [{ goodsId: 'iron-ore', amount: 100 }], ticksRequired: 1, laborRequired: 50, energyRequired: 200 },
  'coal': { inputs: [], outputs: [{ goodsId: 'coal', amount: 150 }], ticksRequired: 1, laborRequired: 40, energyRequired: 150 },
  
  // 层级1: 基础材料
  'steel': {
    inputs: [{ goodsId: 'iron-ore', amount: 100 }, { goodsId: 'coal', amount: 50 }],
    outputs: [{ goodsId: 'steel', amount: 80 }],
    ticksRequired: 2, laborRequired: 80, energyRequired: 500
  },
  
  // 层级2: 中间品
  'car-parts': {
    inputs: [{ goodsId: 'steel', amount: 50 }, { goodsId: 'plastic', amount: 20 }],
    outputs: [{ goodsId: 'car-parts', amount: 30 }],
    ticksRequired: 3, laborRequired: 100, energyRequired: 300
  },
  
  // 层级3: 最终产品
  'car': {
    inputs: [{ goodsId: 'car-parts', amount: 20 }, { goodsId: 'electronics', amount: 10 }, { goodsId: 'battery', amount: 5 }],
    outputs: [{ goodsId: 'car', amount: 1 }],
    ticksRequired: 5, laborRequired: 200, energyRequired: 400
  },
};
```

---

## 第四部分：市场交易系统

### 4.1 订单簿机制

```typescript
interface Order {
  id: number;
  companyId: number;
  goodsId: number;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  remaining: number;
  createdTick: number;
  expiryTick: number;
}

interface OrderBook {
  goodsId: number;
  buyOrders: Order[];   // 按价格降序
  sellOrders: Order[];  // 按价格升序
  
  bestBid(): number | null;  // 最高买价
  bestAsk(): number | null;  // 最低卖价
  spread(): number | null;   // 买卖价差
}
```

### 4.2 撮合引擎

```typescript
function matchOrders(book: OrderBook): Trade[] {
  const trades: Trade[] = [];
  
  while (book.buyOrders.length > 0 && book.sellOrders.length > 0) {
    const buy = book.buyOrders[0];
    const sell = book.sellOrders[0];
    
    // 价格不匹配则停止
    if (buy.price < sell.price) break;
    
    // 成交
    const quantity = Math.min(buy.remaining, sell.remaining);
    const price = sell.price;  // 使用卖价
    
    trades.push({
      buyOrderId: buy.id,
      sellOrderId: sell.id,
      quantity,
      price,
      value: quantity * price,
    });
    
    buy.remaining -= quantity;
    sell.remaining -= quantity;
    
    if (buy.remaining === 0) book.buyOrders.shift();
    if (sell.remaining === 0) book.sellOrders.shift();
  }
  
  return trades;
}
```

### 4.3 定价策略

**卖家定价（基于成本）:**
```typescript
function sellerPricing(company: Company, goodsId: string): number {
  const cost = company.getAverageCost(goodsId);
  const inventoryDays = company.getInventoryDays(goodsId);
  
  let profitMargin: number;
  if (inventoryDays > 60) profitMargin = -0.1;       // 亏损出清
  else if (inventoryDays > 30) profitMargin = 0.05; // 微利
  else if (inventoryDays > 7) profitMargin = 0.15;  // 正常
  else profitMargin = 0.35;                          // 惜售
  
  return cost * (1 + profitMargin);
}
```

**买家定价（基于价值）:**
```typescript
function buyerPricing(company: Company, goodsId: string): number {
  const valueToMe = company.estimateValue(goodsId);  // 用于生产的价值
  const urgency = company.getUrgency(goodsId);       // 紧迫程度
  
  // urgency: 1.0=正常, 1.3=停产急需, 0.85=库存充足
  return valueToMe * urgency;
}
```

---

## 第五部分：AI竞争对手

### 5.1 人格系统

```typescript
enum AIPersonality {
  MONOPOLIST = 'monopolist',    // 垄断者：激进扩张，控制市场
  OLD_MONEY = 'old_money',      // 老钱派：保守稳健，注重品质
  INNOVATOR = 'innovator',      // 创新者：技术领先，高溢价
  TREND_SURFER = 'trend_surfer', // 追潮者：跟随热点，快进快出
  COST_LEADER = 'cost_leader',  // 成本领先：薄利多销，规模效应
}

interface AICompany {
  id: string;
  name: string;
  personality: AIPersonality;
  
  // 行为参数
  riskTolerance: number;       // 风险容忍度 0-1
  expansionSpeed: number;      // 扩张速度 0-1
  priceAggression: number;     // 价格激进度 0-1
  
  // 状态
  cash: number;
  buildings: Building[];
  marketShares: Map<string, number>;
}
```

### 5.2 预设公司

```typescript
const AI_COMPANIES: AICompany[] = [
  { name: '铁拳重工', personality: 'monopolist', riskTolerance: 0.8, expansionSpeed: 0.9, priceAggression: 0.9, industries: ['steel', 'machinery'] },
  { name: '星辰科技', personality: 'innovator', riskTolerance: 0.6, expansionSpeed: 0.7, priceAggression: 0.5, industries: ['electronics', 'chips'] },
  { name: '绿叶能源', personality: 'old_money', riskTolerance: 0.3, expansionSpeed: 0.4, priceAggression: 0.3, industries: ['energy', 'oil'] },
  { name: '东方汽车', personality: 'old_money', riskTolerance: 0.4, expansionSpeed: 0.5, priceAggression: 0.4, industries: ['automotive'] },
  { name: '四海食品', personality: 'trend_surfer', riskTolerance: 0.7, expansionSpeed: 0.8, priceAggression: 0.6, industries: ['food', 'beverages'] },
];
```

### 5.3 决策逻辑

```typescript
function aiDecision(ai: AICompany, marketState: MarketState): AIAction[] {
  const actions: AIAction[] = [];
  
  // 1. 库存管理
  for (const goods of ai.needsToRestock()) {
    actions.push({
      type: 'buy',
      goodsId: goods.id,
      quantity: goods.targetStock - goods.currentStock,
      maxPrice: goods.value * ai.getUrgencyMultiplier(),
    });
  }
  
  // 2. 销售决策
  for (const goods of ai.hasExcess()) {
    actions.push({
      type: 'sell',
      goodsId: goods.id,
      quantity: goods.currentStock - goods.reserveStock,
      minPrice: goods.cost * (1 + ai.getMarginTarget()),
    });
  }
  
  // 3. 扩张决策
  if (ai.shouldExpand(marketState)) {
    const opportunity = ai.findBestOpportunity(marketState);
    if (opportunity && ai.canAfford(opportunity)) {
      actions.push({ type: 'build', buildingType: opportunity.buildingType });
    }
  }
  
  // 4. 竞争响应
  const playerThreat = ai.detectPlayerThreat(marketState);
  if (playerThreat.level > 0.4) {
    actions.push(...ai.planCounterStrategy(playerThreat));
  }
  
  return actions;
}
```

### 5.4 竞争反击

```typescript
function planCounterStrategy(ai: AICompany, threat: ThreatInfo): AIAction[] {
  switch (ai.personality) {
    case 'monopolist':
      // 价格战 + 囤积原料
      return [
        { type: 'price_war', targetGoods: threat.contestedGoods, priceReduction: 0.2 },
        { type: 'stockpile', targetGoods: threat.upstreamGoods },
      ];
      
    case 'old_money':
      // 差异化 + 品质提升
      return [
        { type: 'quality_upgrade', buildings: threat.contestedBuildings },
        { type: 'premium_pricing', margin: 0.3 },
      ];
      
    case 'trend_surfer':
      // 逃离市场
      return [
        { type: 'divest', goodsId: threat.contestedGoods[0] },
        { type: 'enter_market', goodsId: findHotMarket() },
      ];
      
    default:
      return [];
  }
}
```

---

## 第六部分：股票市场

### 6.1 估值模型

```typescript
interface StockValuation {
  companyId: string;
  
  // 基础估值
  bookValue: number;           // 净资产
  earningsValue: number;       // 盈利能力 = 净利润 × P/E
  
  // 市场因素
  supplyDemand: number;        // 买卖订单比
  sentiment: number;           // 市场情绪 0.8-1.5
  
  // 计算股价
  calculatePrice(): number {
    const baseValue = this.bookValue * 0.3 + this.earningsValue * 0.7;
    const marketMultiplier = 1 + (this.supplyDemand - 1) * 0.1;
    return baseValue * marketMultiplier * this.sentiment;
  }
}
```

### 6.2 收购机制

```typescript
interface TakeoverBid {
  acquirerId: string;
  targetId: string;
  offerPrice: number;
  premium: number;             // 溢价率
  
  // 持股门槛
  currentHolding: number;      // 当前持股
  targetHolding: number;       // 目标持股
  
  // 控制权门槛
  // 30%: 可发起收购
  // 51%: 获得控制权
  // 67%: 绝对控制
}

// 防御措施
enum DefenseMeasure {
  POISON_PILL = 'poison_pill',     // 毒丸：增发稀释
  WHITE_KNIGHT = 'white_knight',   // 白衣骑士：引入友方
  SCORCHED_EARTH = 'scorched_earth', // 焦土：出售核心资产
  PAC_MAN = 'pac_man',             // 反收购
}
```

---

## 第七部分：自动经营

### 7.1 自动交易配置

```typescript
interface AutoTradeConfig {
  enabled: boolean;
  
  // 全局配置
  maxActiveOrders: number;
  orderRefreshInterval: number;  // tick
  
  // 商品级配置
  goodsConfigs: Map<string, GoodsAutoTradeConfig>;
}

interface GoodsAutoTradeConfig {
  goodsId: string;
  
  // 自动采购
  autoBuy: {
    enabled: boolean;
    triggerThreshold: number;    // 库存低于此值触发
    targetStock: number;         // 采购到此值
    maxPriceRatio: number;       // 最高接受价格（相对价值）
  };
  
  // 自动销售
  autoSell: {
    enabled: boolean;
    triggerThreshold: number;    // 库存高于此值触发
    reserveStock: number;        // 保留库存
    minPriceRatio: number;       // 最低接受价格（相对成本）
  };
}
```

### 7.2 智能建议

```typescript
function generateAutoTradeRecommendation(company: Company): AutoTradeConfig {
  const config: AutoTradeConfig = { enabled: false, goodsConfigs: new Map() };
  
  // 分析建筑需求
  for (const building of company.buildings) {
    const recipe = building.getCurrentRecipe();
    
    // 输入品：需要采购
    for (const input of recipe.inputs) {
      const dailyConsumption = input.amount / recipe.ticksRequired;
      config.goodsConfigs.set(input.goodsId, {
        goodsId: input.goodsId,
        autoBuy: {
          enabled: true,
          triggerThreshold: dailyConsumption * 3,   // 3天库存触发
          targetStock: dailyConsumption * 7,        // 补到7天
          maxPriceRatio: 1.2,
        },
        autoSell: { enabled: false },
      });
    }
    
    // 输出品：需要销售
    for (const output of recipe.outputs) {
      const dailyProduction = output.amount / recipe.ticksRequired;
      config.goodsConfigs.set(output.goodsId, {
        goodsId: output.goodsId,
        autoBuy: { enabled: false },
        autoSell: {
          enabled: true,
          triggerThreshold: dailyProduction * 5,
          reserveStock: dailyProduction * 2,
          minPriceRatio: 0.9,
        },
      });
    }
  }
  
  return config;
}
```

---

## 第八部分：高性能架构

### 8.1 数据结构（SoA）

```typescript
// 使用TypedArray实现结构体数组
interface GameWorld {
  tick: number;
  
  // 商品系统（连续内存）
  goods: {
    count: number;
    prices: Float32Array;          // 当前价格
    supplies: Float32Array;        // 本tick供给
    demands: Float32Array;         // 本tick需求
    baseValues: Float32Array;      // 基准价值
    elasticities: Float32Array;    // 价格弹性
  };
  
  // 建筑系统
  buildings: {
    count: number;
    types: Uint8Array;             // 建筑类型
    owners: Uint16Array;           // 所属公司
    efficiencies: Float32Array;    // 效率
    progress: Float32Array;        // 生产进度
    inputBuffers: Float32Array;    // [N × MAX_INPUTS]
    outputBuffers: Float32Array;   // [N × MAX_OUTPUTS]
  };
  
  // 公司系统
  companies: {
    count: number;
    cash: Float64Array;
    inventories: Float32Array;     // [COMPANY_COUNT × GOODS_COUNT]
  };
  
  // 订单系统（预分配池）
  orders: {
    maxOrders: number;
    activeCount: number;
    companyIds: Uint16Array;
    goodsIds: Uint8Array;
    types: Uint8Array;
    quantities: Float32Array;
    prices: Float32Array;
    remainings: Float32Array;
    isActive: Uint8Array;
  };
}
```

### 8.2 多线程架构

```typescript
// 主线程：协调调度
// Worker线程：并行计算

// 1. 生产Worker：批量处理所有建筑
// 2. 市场Worker×2：按商品分片并行撮合
// 3. 消费Worker：POPs需求采样计算
// 4. AI Worker：AI公司决策

// 使用SharedArrayBuffer共享数据
const sharedBuffer = new SharedArrayBuffer(TOTAL_SIZE);
const worldView = createWorldView(sharedBuffer);

// Worker可直接读写共享内存
worker.postMessage({ type: 'PROCESS_PRODUCTION', tick: world.tick });
```

### 8.3 批量处理

```typescript
// 批量生产计算
function updateAllProduction(world: GameWorld): void {
  const b = world.buildings;
  
  for (let i = 0; i < b.count; i++) {
    const type = b.types[i];
    const efficiency = b.efficiencies[i];
    const recipe = RECIPE_TABLE[type];
    
    // 检查输入
    let canProduce = true;
    const inputOffset = i * MAX_INPUTS;
    for (let j = 0; j < recipe.inputCount; j++) {
      if (b.inputBuffers[inputOffset + j] < recipe.inputAmounts[j]) {
        canProduce = false;
        break;
      }
    }
    
    if (canProduce) {
      // 消耗输入
      for (let j = 0; j < recipe.inputCount; j++) {
        b.inputBuffers[inputOffset + j] -= recipe.inputAmounts[j];
      }
      
      // 产出
      const outputOffset = i * MAX_OUTPUTS;
      for (let j = 0; j < recipe.outputCount; j++) {
        b.outputBuffers[outputOffset + j] += recipe.outputAmounts[j] * efficiency;
      }
    }
  }
}

// 批量订单撮合（按商品并行）
function matchAllOrders(world: GameWorld): void {
  // 每个商品可独立处理，无锁并行
  for (let goodsId = 0; goodsId < world.goods.count; goodsId++) {
    matchOrdersForGoods(world, goodsId);
  }
}
```

### 8.4 性能目标

| 指标 | 目标 |
|------|------|
| 单Tick时间 | <10ms |
| 生产计算 | <1ms / 100建筑 |
| 订单撮合 | <3ms / 1000订单 |
| 价格更新 | <0.5ms / 60商品 |
| 内存占用 | <100MB |

---

## 第九部分：内容规模

### 9.1 商品体系（60种）

**原材料（14种）:**
铁矿石、铜矿石、铝土矿、煤炭、石油、天然气、木材、棉花、粮食、石英砂、稀土、橡胶、化学原料、水

**基础材料（12种）:**
钢材、铜材、铝材、玻璃、塑料、橡胶制品、化学品、水泥、纸张、纺织品、加工食品、燃油

**中间产品（15种）:**
电子元件、芯片、电池、电机、屏幕、机械部件、汽车部件、航空部件、光伏板、风机叶片、建筑材料、包装材料、工业软件

**最终产品（19种）:**
智能手机、电脑、家电、汽车、电动车、服装、食品、饮料、家具、建材成品、医疗设备、光伏系统、储能系统、工业机器人、无人机

### 9.2 建筑体系（25种）

**采掘（8种）:** 铁矿场、铜矿场、铝矿场、煤矿、油田、气田、伐木场、农场

**加工（8种）:** 钢铁厂、炼油厂、化工厂、玻璃厂、塑料厂、纺织厂、食品厂、水泥厂

**制造（6种）:** 电子厂、半导体厂、汽车厂、家电厂、机械厂、电池厂

**服务（3种）:** 物流中心、仓储中心、发电厂

---

## 第十部分：经济平衡

### 10.1 价格稳定

```typescript
const PRICE_STABILITY = {
  MAX_TICK_CHANGE: 0.05,        // 单tick最大变化5%
  MEAN_REVERSION: 0.002,        // 均值回归速率
  VOLATILITY_DAMPENING: 0.1,    // 波动抑制
};

function stabilizePrice(
  currentPrice: number,
  equilibriumPrice: number,
  lastPrice: number
): number {
  // 计算目标变化
  let targetChange = (equilibriumPrice - currentPrice) / currentPrice;
  
  // 限制变化幅度
  targetChange = Math.max(-PRICE_STABILITY.MAX_TICK_CHANGE, 
                          Math.min(PRICE_STABILITY.MAX_TICK_CHANGE, targetChange));
  
  // 均值回归
  const basePrice = getBasePrice(goodsId);
  const reversionPull = (basePrice - currentPrice) / currentPrice * PRICE_STABILITY.MEAN_REVERSION;
  
  return currentPrice * (1 + targetChange + reversionPull);
}
```

### 10.2 破产保护

```typescript
interface BankruptcyProtection {
  gracePeriod: 30;             // 30天缓冲期
  
  levels: [
    { threshold: 0, action: 'emergency_loan', rate: 0.08 },  // 紧急贷款
    { threshold: -0.2, action: 'government_aid' },           // 政府救济
    { threshold: -0.5, action: 'debt_restructure', reduction: 0.5 }, // 债务重组
  ];
}
```

### 10.3 反垄断

```typescript
interface AntitrustRules {
  hhiThreshold: 2500;          // HHI超过此值触发调查
  maxMarketShare: 0.7;         // 单一公司最大份额
  mergersReviewThreshold: 0.3; // 合并审查门槛
}
```

---

## 第十一部分：游戏循环

### 11.1 主循环

```typescript
function gameTick(world: GameWorld): void {
  world.tick++;
  
  // 1. 生产计算
  updateAllProduction(world);
  
  // 2. 消费需求计算
  calculateConsumerDemand(world);
  
  // 3. AI决策
  updateAICompanies(world);
  
  // 4. 订单撮合
  matchAllOrders(world);
  
  // 5. 价格更新（均衡搜索）
  updateAllPrices(world);
  
  // 6. 股市更新
  updateStockMarket(world);
  
  // 7. 自动交易执行
  executeAutoTrade(world);
  
  // 8. 状态同步
  broadcastDelta(world);
}
```

### 11.2 增量同步

```typescript
interface DeltaState {
  tick: number;
  
  // 只发送变化的数据
  changedPrices: { goodsId: number; price: number }[];
  changedInventories: { companyId: number; goodsId: number; quantity: number }[];
  newTrades: Trade[];
  events: GameEvent[];
}
```

---

## 附录：开发优先级

### Phase 1：核心循环
1. 数据结构定义（SoA）
2. 生产计算
3. 订单簿交易
4. 价格均衡

### Phase 2：经济深度
5. 供给曲线（边际成本）
6. 需求曲线（效用函数）
7. 消费者分层
8. 商品替代

### Phase 3：竞争系统
9. AI公司基础决策
10. 人格差异化
11. 玩家威胁响应

### Phase 4：金融系统
12. 股票估值
13. 交易与分红
14. 收购机制

### Phase 5：便利功能
15. 自动交易
16. 智能建议
17. 性能优化

---

*文档结束*