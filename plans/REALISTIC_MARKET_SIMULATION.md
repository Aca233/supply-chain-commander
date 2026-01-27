# 现实市场模拟设计方案

> **目标**: 构建一个基于真实经济学原理的市场模拟系统，而非简化的游戏机制

---

## 一、经济学基础模型

### 1.1 核心经济学原理

| 原理 | 现实意义 | 游戏实现 |
|------|---------|---------|
| 边际效用递减 | 消费越多，每单位满足感递减 | 影响需求曲线形状 |
| 边际成本递增 | 产量越高，额外成本越大 | 影响供给曲线形状 |
| 价格弹性 | 价格变化对需求/供给的影响程度 | 不同商品不同弹性 |
| 信息不对称 | 买卖双方信息不完全 | 价格发现延迟、套利机会 |
| 预期自我实现 | 预期影响实际行为 | 投机行为、价格泡沫 |
| 外部性 | 行为影响第三方 | 污染、网络效应 |

### 1.2 与简化游戏模型的区别

| 维度 | 简化游戏 | 现实模拟 |
|------|---------|---------|
| 需求 | 固定数量 | 连续需求曲线，受多因素影响 |
| 供给 | 产能=产出 | 成本曲线决定最优产量 |
| 价格 | 供需比例调整 | 多种价格发现机制并存 |
| 参与者 | 同质化理性人 | 异质偏好、有限理性 |
| 时间 | 即时均衡 | 动态调整、滞后效应 |
| 货币 | 无限流动性 | 货币供应、利率、信贷 |

---

## 二、供给侧模型

### 2.1 生产成本曲线

```typescript
interface ProductionCostModel {
  // 固定成本（不随产量变化）
  fixedCosts: {
    depreciation: number;      // 设备折旧
    rent: number;              // 厂房租金
    insurance: number;         // 保险费用
    management: number;        // 管理人员
  };
  
  // 可变成本（随产量变化）
  variableCosts: {
    rawMaterials: number;      // 原材料单价
    labor: number;             // 人工单价
    energy: number;            // 能源单价
    logistics: number;         // 物流单价
  };
  
  // 边际成本递增因子
  // 产量超过最优规模后成本加速上升
  marginalCostCurve: {
    optimalCapacity: number;   // 最优产能（边际成本最低点）
    curveFactor: number;       // 成本上升速度
  };
}

// 计算不同产量下的成本
function calculateCosts(model: ProductionCostModel, quantity: number) {
  const fixed = Object.values(model.fixedCosts).reduce((a, b) => a + b, 0);
  
  // 可变成本
  const variable = Object.values(model.variableCosts).reduce((a, b) => a + b, 0);
  let totalVariable = variable * quantity;
  
  // 边际成本递增（超过最优产能后）
  const { optimalCapacity, curveFactor } = model.marginalCostCurve;
  if (quantity > optimalCapacity) {
    const excess = quantity - optimalCapacity;
    totalVariable += variable * excess * curveFactor * (excess / optimalCapacity);
  }
  
  const totalCost = fixed + totalVariable;
  const averageCost = totalCost / quantity;
  const marginalCost = variable * (1 + Math.max(0, (quantity - optimalCapacity) / optimalCapacity) * curveFactor * 2);
  
  return { totalCost, averageCost, marginalCost };
}
```

### 2.2 利润最大化决策

```typescript
// 企业根据边际成本=边际收益确定最优产量
function determineOptimalQuantity(
  company: Company,
  goodsId: string,
  marketPrice: number,
  costModel: ProductionCostModel
): number {
  // 在利润最大化点：边际成本 = 边际收益（市场价格）
  // 二分查找最优产量
  
  let low = 0;
  let high = company.maxCapacity;
  
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const { marginalCost } = calculateCosts(costModel, mid);
    
    if (marginalCost < marketPrice) {
      low = mid;  // 还可以增产
    } else {
      high = mid; // 产量过高
    }
  }
  
  // 检查是否应该生产（价格是否覆盖平均可变成本）
  const { averageCost } = calculateCosts(costModel, low);
  if (marketPrice < averageCost * 0.8) {
    // 价格过低，短期亏损运营或停产
    return company.shutdownThreshold ? 0 : low * 0.5;
  }
  
  return low;
}
```

### 2.3 产能投资决策

```typescript
interface CapacityInvestmentModel {
  // 投资决策基于预期回报率
  expectedPrice: number;          // 预期未来价格
  expectedDemand: number;         // 预期市场需求
  investmentCost: number;         // 扩产投资成本
  paybackPeriod: number;          // 预期回收周期
  requiredROI: number;            // 要求的投资回报率
  
  // 风险因素
  priceVolatility: number;        // 价格波动率
  competitorCount: number;        // 竞争者数量
  entryBarrier: number;           // 进入壁垒
}

function shouldExpandCapacity(model: CapacityInvestmentModel): boolean {
  // 预期利润
  const expectedMargin = model.expectedPrice * 0.15; // 假设15%利润率
  const expectedAnnualProfit = model.expectedDemand * expectedMargin;
  
  // 风险调整
  const riskFactor = 1 - model.priceVolatility * 0.5 - 0.02 * model.competitorCount;
  const adjustedProfit = expectedAnnualProfit * riskFactor;
  
  // ROI计算
  const actualROI = adjustedProfit / model.investmentCost;
  
  return actualROI > model.requiredROI;
}
```

---

## 三、需求侧模型

### 3.1 效用函数与需求曲线

```typescript
interface ConsumerUtilityModel {
  // 边际效用函数参数
  // U(q) = α × ln(q + 1) 对于必需品
  // U(q) = α × q^β (β < 1) 对于一般商品
  // U(q) = α × q × e^(-γq) 对于奢侈品（满足后边际效用下降更快）
  
  utilityType: 'necessity' | 'normal' | 'luxury';
  alpha: number;           // 效用系数
  beta?: number;           // 弹性参数
  gamma?: number;          // 衰减参数
  
  // 预算约束
  budget: number;
  
  // 替代品和互补品关系
  substitutes: { goodsId: string; ratio: number }[];
  complements: { goodsId: string; ratio: number }[];
}

// 计算在给定价格下的最优消费量
function calculateOptimalDemand(
  utility: ConsumerUtilityModel,
  prices: Map<string, number>,
  goodsId: string
): number {
  const price = prices.get(goodsId) || 1;
  
  // 基于效用最大化：MU/P = λ（拉格朗日乘数）
  // 对于 U(q) = α × q^β: MU = α × β × q^(β-1)
  // 令 MU = λP, 解出 q
  
  let demand: number;
  
  switch (utility.utilityType) {
    case 'necessity':
      // 必需品：需求弹性低，即使涨价也要买
      const necessityFactor = utility.alpha / price;
      demand = Math.log(1 + utility.budget / price) * necessityFactor;
      break;
      
    case 'normal':
      // 一般商品：标准需求曲线
      const beta = utility.beta || 0.7;
      demand = Math.pow(utility.alpha * beta / price, 1 / (1 - beta));
      break;
      
    case 'luxury':
      // 奢侈品：高收入弹性
      const gamma = utility.gamma || 0.1;
      const affordability = utility.budget / price;
      demand = affordability * Math.exp(-gamma * price / utility.budget);
      break;
  }
  
  // 预算约束
  const maxAffordable = utility.budget / price;
  demand = Math.min(demand, maxAffordable);
  
  // 替代品效应
  for (const sub of utility.substitutes) {
    const subPrice = prices.get(sub.goodsId) || price;
    if (subPrice < price * sub.ratio) {
      // 替代品更便宜，减少本品需求
      demand *= (subPrice / price / sub.ratio);
    }
  }
  
  return Math.max(0, demand);
}
```

### 3.2 价格弹性建模

```typescript
interface ElasticityModel {
  // 价格弹性 = (需求变化率) / (价格变化率)
  // |E| < 1: 刚性需求（必需品）
  // |E| = 1: 单位弹性
  // |E| > 1: 弹性需求（奢侈品）
  
  priceElasticity: number;      // 自身价格弹性
  incomeElasticity: number;     // 收入弹性（正常品>0, 劣等品<0）
  crossElasticities: Map<string, number>; // 交叉弹性（替代品>0, 互补品<0）
}

// 预设不同商品的弹性
const ELASTICITY_PRESETS: Record<string, ElasticityModel> = {
  // 必需品：刚性需求
  'food': { priceElasticity: -0.3, incomeElasticity: 0.5, crossElasticities: new Map() },
  'electricity': { priceElasticity: -0.2, incomeElasticity: 0.3, crossElasticities: new Map() },
  'fuel': { priceElasticity: -0.4, incomeElasticity: 0.4, crossElasticities: new Map() },
  
  // 一般消费品：中等弹性
  'clothing': { priceElasticity: -1.0, incomeElasticity: 1.0, crossElasticities: new Map() },
  'appliances': { priceElasticity: -1.2, incomeElasticity: 1.5, crossElasticities: new Map() },
  
  // 奢侈品：高弹性
  'luxury-car': { priceElasticity: -2.5, incomeElasticity: 3.0, crossElasticities: new Map() },
  'jewelry': { priceElasticity: -3.0, incomeElasticity: 4.0, crossElasticities: new Map() },
  
  // 工业品：派生需求
  'steel': { priceElasticity: -0.5, incomeElasticity: 0.8, crossElasticities: new Map([['aluminum', 0.3]]) },
  'copper': { priceElasticity: -0.4, incomeElasticity: 0.7, crossElasticities: new Map([['fiber-optic', 0.2]]) },
};

// 计算价格变化对需求的影响
function calculateDemandChange(
  elasticity: ElasticityModel,
  priceChange: number,        // 价格变化百分比
  incomeChange: number,       // 收入变化百分比
  otherPriceChanges: Map<string, number>  // 其他商品价格变化
): number {
  let demandChange = 0;
  
  // 自身价格效应
  demandChange += elasticity.priceElasticity * priceChange;
  
  // 收入效应
  demandChange += elasticity.incomeElasticity * incomeChange;
  
  // 交叉价格效应
  for (const [goodsId, crossE] of elasticity.crossElasticities) {
    const otherChange = otherPriceChanges.get(goodsId) || 0;
    demandChange += crossE * otherChange;
  }
  
  return demandChange;
}
```

### 3.3 收入分布与消费分层

```typescript
interface IncomeDistribution {
  // 收入分布通常服从对数正态分布
  // 或用分位数表示
  
  percentiles: {
    p10: number;   // 底层10%收入上限
    p25: number;   // 底层25%
    p50: number;   // 中位数
    p75: number;   // 高75%
    p90: number;   // 高90%
    p99: number;   // 顶层1%
  };
  
  // 基尼系数（0=完全平等, 1=完全不平等）
  giniCoefficient: number;
  
  // 平均收入
  meanIncome: number;
  
  // 总人口
  population: number;
}

// 计算不同收入层对某商品的总需求
function calculateTotalDemand(
  income: IncomeDistribution,
  goodsId: string,
  price: number,
  elasticity: ElasticityModel
): number {
  // 将人口分成多个收入层，分别计算需求
  const layers = [
    { share: 0.10, incomeRatio: income.percentiles.p10 / income.meanIncome },
    { share: 0.15, incomeRatio: (income.percentiles.p25 - income.percentiles.p10) / income.meanIncome / 0.15 },
    { share: 0.25, incomeRatio: (income.percentiles.p50 - income.percentiles.p25) / income.meanIncome / 0.25 },
    { share: 0.25, incomeRatio: (income.percentiles.p75 - income.percentiles.p50) / income.meanIncome / 0.25 },
    { share: 0.15, incomeRatio: (income.percentiles.p90 - income.percentiles.p75) / income.meanIncome / 0.15 },
    { share: 0.09, incomeRatio: (income.percentiles.p99 - income.percentiles.p90) / income.meanIncome / 0.09 },
    { share: 0.01, incomeRatio: income.percentiles.p99 * 3 / income.meanIncome },
  ];
  
  let totalDemand = 0;
  
  for (const layer of layers) {
    const layerPop = income.population * layer.share;
    const layerIncome = income.meanIncome * layer.incomeRatio;
    
    // 该收入层能负担的数量
    const affordability = layerIncome / price;
    
    // 考虑收入弹性
    const incomeEffect = Math.pow(layer.incomeRatio, elasticity.incomeElasticity);
    
    // 该层人均需求
    const perCapitaDemand = affordability * incomeEffect * 0.1; // 假设10%收入用于该品类
    
    totalDemand += layerPop * perCapitaDemand;
  }
  
  return totalDemand;
}
```

---

## 四、价格发现机制

### 4.1 多种价格形成机制

```typescript
enum PriceFormationMechanism {
  // 完全竞争：价格由供需均衡决定
  COMPETITIVE_EQUILIBRIUM = 'competitive',
  
  // 拍卖：连续双边拍卖
  CONTINUOUS_DOUBLE_AUCTION = 'auction',
  
  // 做市商：做市商报价
  MARKET_MAKER = 'market_maker',
  
  // 协商：双边议价
  NEGOTIATION = 'negotiation',
  
  // 管制：政府定价
  REGULATED = 'regulated',
  
  // 垄断：生产者定价
  MONOPOLY_PRICING = 'monopoly',
}

interface PriceFormationConfig {
  mechanism: PriceFormationMechanism;
  
  // 拍卖参数
  auctionParams?: {
    tickSize: number;           // 最小价格变动
    maxSpread: number;          // 最大买卖价差
    clearingFrequency: number;  // 撮合频率
  };
  
  // 做市商参数
  marketMakerParams?: {
    spreadPercent: number;      // 报价价差百分比
    inventoryLimit: number;     // 库存限制
    riskAversion: number;       // 风险厌恶系数
  };
  
  // 管制参数
  regulatedParams?: {
    priceFloor?: number;        // 最低价
    priceCeiling?: number;      // 最高价
    targetPrice?: number;       // 目标价格
  };
}
```

### 4.2 均衡价格搜索

```typescript
// 瓦尔拉斯调整机制（tatonnement）
function findEquilibriumPrice(
  supplyFunction: (price: number) => number,
  demandFunction: (price: number) => number,
  initialPrice: number,
  tolerance: number = 0.01
): number {
  let price = initialPrice;
  const maxIterations = 100;
  const adjustmentSpeed = 0.1;
  
  for (let i = 0; i < maxIterations; i++) {
    const supply = supplyFunction(price);
    const demand = demandFunction(price);
    const excessDemand = demand - supply;
    
    // 超额需求为正则涨价，为负则跌价
    if (Math.abs(excessDemand) < tolerance * demand) {
      return price;  // 找到均衡
    }
    
    // 价格调整幅度与超额需求成比例
    const priceAdjustment = adjustmentSpeed * excessDemand / demand;
    price *= (1 + priceAdjustment);
    
    // 防止负价格
    price = Math.max(price, 0.01);
  }
  
  return price;  // 返回最后一次迭代的价格
}
```

### 4.3 信息不对称与价格发现延迟

```typescript
interface InformationAsymmetry {
  // 买方信息
  buyerInfo: {
    knownSupply: number;        // 已知的供给量（可能不完整）
    priceExpectation: number;   // 价格预期
    confidenceLevel: number;    // 信息置信度
  };
  
  // 卖方信息
  sellerInfo: {
    knownDemand: number;        // 已知的需求量
    costInformation: number;    // 成本信息透明度
    competitorPrices: number[]; // 已知的竞争对手价格
  };
  
  // 信息传播速度
  informationSpread: number;    // 0-1，信息每tick传播的比例
}

// 模拟信息不对称下的定价行为
function priceWithAsymmetricInfo(
  seller: Company,
  goodsId: string,
  info: InformationAsymmetry
): number {
  // 卖方基于不完整信息估计需求
  const estimatedDemand = info.sellerInfo.knownDemand * (1 + (Math.random() - 0.5) * (1 - info.informationSpread));
  
  // 参考竞争对手价格
  const avgCompetitorPrice = info.sellerInfo.competitorPrices.length > 0
    ? info.sellerInfo.competitorPrices.reduce((a, b) => a + b, 0) / info.sellerInfo.competitorPrices.length
    : seller.lastPrice;
  
  // 成本加成
  const costPlus = seller.productionCost * 1.2;
  
  // 最终定价权衡
  return costPlus * 0.4 + avgCompetitorPrice * 0.4 + seller.lastPrice * 0.2;
}
```

---

## 五、市场结构模型

### 5.1 市场集中度与竞争行为

```typescript
enum MarketStructure {
  PERFECT_COMPETITION = 'perfect',    // 完全竞争：大量小卖家
  MONOPOLISTIC_COMPETITION = 'monopolistic', // 垄断竞争：差异化产品
  OLIGOPOLY = 'oligopoly',            // 寡头：少数大玩家
  MONOPOLY = 'monopoly',              // 垄断：单一卖家
  MONOPSONY = 'monopsony',            // 买方垄断：单一买家
}

interface MarketStructureAnalysis {
  // 赫芬达尔-赫希曼指数 (HHI)
  // HHI = Σ(市场份额%)²
  // HHI < 1500: 竞争性市场
  // 1500 < HHI < 2500: 中度集中
  // HHI > 2500: 高度集中
  hhi: number;
  
  // CR4: 前4大公司市场份额之和
  cr4: number;
  
  // 推断的市场结构
  structure: MarketStructure;
  
  // 勒纳指数（价格-边际成本差距）
  lernerIndex: number;
}

function analyzeMarketStructure(
  marketShares: Map<string, number>
): MarketStructureAnalysis {
  const shares = Array.from(marketShares.values()).sort((a, b) => b - a);
  
  // 计算HHI
  const hhi = shares.reduce((sum, share) => sum + share * share * 10000, 0);
  
  // 计算CR4
  const cr4 = shares.slice(0, 4).reduce((sum, share) => sum + share, 0);
  
  // 判断市场结构
  let structure: MarketStructure;
  if (shares.length === 1 || shares[0] > 0.9) {
    structure = MarketStructure.MONOPOLY;
  } else if (hhi > 2500) {
    structure = MarketStructure.OLIGOPOLY;
  } else if (hhi > 1500) {
    structure = MarketStructure.MONOPOLISTIC_COMPETITION;
  } else {
    structure = MarketStructure.PERFECT_COMPETITION;
  }
  
  return { hhi, cr4, structure, lernerIndex: 0 };
}
```

### 5.2 寡头博弈模型

```typescript
// 古诺模型（产量竞争）
function cournotEquilibrium(
  firms: Company[],
  demandIntercept: number,     // 需求曲线截距 (a)
  demandSlope: number,         // 需求曲线斜率 (b)
  marginalCosts: number[]      // 各公司边际成本
): number[] {
  // 市场需求：P = a - b*Q
  // 公司i利润：πi = (a - b*Σqj - ci) * qi
  // 一阶条件：a - b*Σqj - 2*b*qi - ci = 0
  
  const n = firms.length;
  const quantities = new Array(n).fill(0);
  
  // 迭代求解纳什均衡
  for (let iter = 0; iter < 100; iter++) {
    let changed = false;
    
    for (let i = 0; i < n; i++) {
      const othersTotal = quantities.reduce((sum, q, j) => j === i ? sum : sum + q, 0);
      const bestResponse = (demandIntercept - marginalCosts[i] - demandSlope * othersTotal) / (2 * demandSlope);
      
      if (Math.abs(quantities[i] - bestResponse) > 0.01) {
        quantities[i] = Math.max(0, bestResponse);
        changed = true;
      }
    }
    
    if (!changed) break;
  }
  
  return quantities;
}

// 伯特兰模型（价格竞争）
function bertrandEquilibrium(
  firms: Company[],
  marginalCosts: number[]
): number[] {
  // 伯特兰悖论：价格趋向边际成本
  // 差异化产品时有所缓和
  
  const minCost = Math.min(...marginalCosts);
  const secondMinCost = marginalCosts.filter(c => c > minCost).sort()[0] || minCost * 1.1;
  
  return marginalCosts.map(cost => {
    if (cost === minCost) {
      // 最低成本公司可以略低于第二低的成本定价
      return secondMinCost * 0.99;
    } else {
      // 高成本公司被挤出市场或只能保本
      return cost * 1.01;
    }
  });
}
```

### 5.3 价格领导与跟随

```typescript
interface PriceLeadershipModel {
  leader: string;              // 领导者公司ID
  followers: string[];         // 跟随者公司ID列表
  
  // 领导者策略
  leaderStrategy: {
    targetMargin: number;      // 目标利润率
    marketShareGoal: number;   // 市场份额目标
    priceSensitivity: number;  // 对市场反应的敏感度
  };
  
  // 跟随者策略
  followerStrategy: {
    priceGap: number;          // 与领导者的价差
    responseDelay: number;     // 响应延迟（tick数）
    undercutThreshold: number; // 降价阈值
  };
}

function simulatePriceLeadership(
  model: PriceLeadershipModel,
  marketConditions: MarketConditions
): Map<string, number> {
  const prices = new Map<string, number>();
  
  // 领导者先定价
  const leaderCost = getCompanyCost(model.leader);
  const leaderPrice = leaderCost * (1 + model.leaderStrategy.targetMargin);
  prices.set(model.leader, leaderPrice);
  
  // 跟随者调整
  for (const followerId of model.followers) {
    const followerCost = getCompanyCost(followerId);
    const gapPrice = leaderPrice * (1 - model.followerStrategy.priceGap);
    
    // 不能低于成本
    const followerPrice = Math.max(followerCost * 1.05, gapPrice);
    prices.set(followerId, followerPrice);
  }
  
  return prices;
}
```

---

## 六、货币与金融系统

### 6.1 货币供应与通胀

```typescript
interface MonetarySystem {
  // 货币供应量
  m0: number;                  // 基础货币
  m1: number;                  // 狭义货币（现金+活期存款）
  m2: number;                  // 广义货币（M1+定期存款）
  
  // 货币乘数
  moneyMultiplier: number;     // M2/M0
  
  // 货币流通速度
  velocityOfMoney: number;     // GDP/M2
  
  // 通胀指标
  cpi: number;                 // 消费者价格指数
  ppi: number;                 // 生产者价格指数
  inflationRate: number;       // 年化通胀率
}

// 货币数量论：MV = PQ
function calculateInflationPressure(
  monetary: MonetarySystem,
  realGDP: number,
  previousPrice: number
): number {
  // P = MV/Q
  const impliedPrice = monetary.m2 * monetary.velocityOfMoney / realGDP;
  const inflationPressure = (impliedPrice - previousPrice) / previousPrice;
  
  return inflationPressure;
}

// 菲利普斯曲线：失业率与通胀的权衡
function phillipsCurve(
  unemploymentRate: number,
  naturalRate: number,
  expectedInflation: number
): number {
  // π = πe - β(u - u*)
  const beta = 0.5;  // 敏感系数
  const actualInflation = expectedInflation - beta * (unemploymentRate - naturalRate);
  return actualInflation;
}
```

### 6.2 利率与投资决策

```typescript
interface InterestRateModel {
  // 基准利率
  policyRate: number;          // 央行政策利率
  
  // 市场利率
  depositRate: number;         // 存款利率
  lendingRate: number;         // 贷款利率
  bondYield: number;           // 债券收益率
  
  // 风险溢价
  creditSpread: number;        // 信用利差
  termPremium: number;         // 期限溢价
}

// 泰勒规则：央行利率决策
function taylorRule(
  inflationRate: number,
  targetInflation: number,
  outputGap: number,
  neutralRate: number
): number {
  // i = r* + π + 0.5(π - π*) + 0.5(y - y*)
  const rate = neutralRate 
    + inflationRate 
    + 0.5 * (inflationRate - targetInflation) 
    + 0.5 * outputGap;
  
  return Math.max(0, rate);  // 零利率下限
}

// 投资决策：NPV计算
function netPresentValue(
  cashFlows: number[],
  discountRate: number
): number {
  return cashFlows.reduce((npv, cf, t) => {
    return npv + cf / Math.pow(1 + discountRate, t);
  }, 0);
}

// 企业根据利率决定投资
function investmentDecision(
  project: InvestmentProject,
  interestRate: number
): boolean {
  const requiredReturn = interestRate + project.riskPremium;
  const npv = netPresentValue(project.expectedCashFlows, requiredReturn);
  return npv > 0;
}
```

### 6.3 信贷市场

```typescript
interface CreditMarket {
  // 信贷供给
  bankLending: {
    totalCapacity: number;     // 贷款总额度
    availableCapacity: number; // 可用额度
    reserveRatio: number;      // 准备金率
  };
  
  // 信贷需求
  loanApplications: {
    companyId: string;
    amount: number;
    purpose: 'working_capital' | 'expansion' | 'acquisition';
    collateral: number;
    creditScore: number;
  }[];
}

// 信贷配给：信息不对称导致的信贷约束
function creditRationing(
  market: CreditMarket,
  baseRate: number
): Map<string, { approved: boolean; rate: number; amount: number }> {
  const results = new Map();
  
  // 按信用评分排序
  const sortedApps = [...market.loanApplications].sort((a, b) => b.creditScore - a.creditScore);
  
  let remainingCapacity = market.bankLending.availableCapacity;
  
  for (const app of sortedApps) {
    if (remainingCapacity <= 0) {
      results.set(app.companyId, { approved: false, rate: 0, amount: 0 });
      continue;
    }
    
    // 根据信用评分调整利率
    const riskAdjustedRate = baseRate * (2 - app.creditScore / 100);
    
    // 根据抵押品调整额度
    const maxLoan = app.collateral * 0.7;  // LTV 70%
    const approvedAmount = Math.min(app.amount, maxLoan, remainingCapacity);
    
    if (approvedAmount > 0) {
      results.set(app.companyId, {
        approved: true,
        rate: riskAdjustedRate,
        amount: approvedAmount,
      });
      remainingCapacity -= approvedAmount;
    }
  }
  
  return results;
}
```

---

## 七、劳动力市场

### 7.1 工资决定机制

```typescript
interface LaborMarket {
  // 劳动力供给
  laborForce: number;          // 劳动力总人口
  participationRate: number;   // 劳动参与率
  
  // 劳动力需求
  vacancies: number;           // 空缺岗位
  employed: number;            // 就业人数
  
  // 工资水平
  minimumWage: number;         // 最低工资
  averageWage: number;         // 平均工资
  medianWage: number;          // 中位数工资
  
  // 失业
  unemployed: number;          // 失业人数
  unemploymentRate: number;    // 失业率
  naturalUnemployment: number; // 自然失业率
}

// 工资曲线：失业率影响工资
function wageCurve(
  baseWage: number,
  unemploymentRate: number,
  laborProductivity: number
): number {
  // W = W0 × (1 - α × u) × productivity
  const alpha = 0.1;  // 失业率对工资的压制系数
  const wage = baseWage * (1 - alpha * unemploymentRate) * laborProductivity;
  return Math.max(wage, baseWage * 0.8);  // 工资刚性
}

// 贝弗里奇曲线：失业率与职位空缺率的关系
function beveridgeCurve(
  vacancyRate: number
): number {
  // u = f(v)，失业率随职位空缺率上升而下降
  const matchingEfficiency = 0.5;
  const unemploymentRate = 1 / (1 + Math.pow(vacancyRate / matchingEfficiency, 0.5));
  return unemploymentRate;
}
```

### 7.2 劳动力配置

```typescript
interface LaborAllocation {
  // 按技能分层
  skillLevels: {
    unskilled: { supply: number; demand: number; wage: number };
    skilled: { supply: number; demand: number; wage: number };
    professional: { supply: number; demand: number; wage: number };
    executive: { supply: number; demand: number; wage: number };
  };
  
  // 按行业分布
  industryDistribution: Map<string, {
    employment: number;
    averageWage: number;
    laborProductivity: number;
  }>;
}

// 企业劳动力需求
function laborDemand(
  company: Company,
  wage: number,
  outputPrice: number,
  technology: number  // 技术水平（决定边际产出）
): number {
  // MRPL = MPL × P
  // 最优雇佣：MRPL = W
  const marginalProductLabor = technology * Math.pow(company.capital / company.labor, 0.3);
  const optimalLabor = company.capital * Math.pow(outputPrice * marginalProductLabor / wage, 1 / 0.7);
  return Math.max(1, Math.floor(optimalLabor));
}
```

---

## 八、经济周期模拟

### 8.1 景气循环

```typescript
interface BusinessCycle {
  phase: 'expansion' | 'peak' | 'contraction' | 'trough';
  
  // 周期位置（0-1，0为谷底，0.5为峰值）
  cyclePosition: number;
  
  // 周期长度（tick数）
  cycleLength: number;
  
  // 周期振幅
  amplitude: number;
  
  // 领先指标
  leadingIndicators: {
    stockMarketIndex: number;
    newOrders: number;
    buildingPermits: number;
    consumerConfidence: number;
  };
  
  // 滞后指标
  laggingIndicators: {
    unemployment: number;
    inventoryLevel: number;
    laborCost: number;
  };
}

function updateBusinessCycle(cycle: BusinessCycle, tick: number): void {
  // 周期位置更新
  const radians = (tick % cycle.cycleLength) / cycle.cycleLength * 2 * Math.PI;
  cycle.cyclePosition = (Math.sin(radians) + 1) / 2;
  
  // 判断阶段
  if (cycle.cyclePosition > 0.75) {
    cycle.phase = 'peak';
  } else if (cycle.cyclePosition > 0.5) {
    cycle.phase = 'expansion';
  } else if (cycle.cyclePosition > 0.25) {
    cycle.phase = 'trough';
  } else {
    cycle.phase = 'contraction';
  }
}

// 周期对各经济变量的影响
function cyclicalEffect(
  cycle: BusinessCycle,
  variable: 'demand' | 'investment' | 'credit' | 'employment'
): number {
  const baseEffect = cycle.amplitude * (cycle.cyclePosition - 0.5) * 2;
  
  const sensitivity: Record<string, number> = {
    demand: 0.8,
    investment: 1.5,      // 投资对周期最敏感
    credit: 1.2,
    employment: 0.6,      // 就业有滞后性
  };
  
  return 1 + baseEffect * sensitivity[variable];
}
```

### 8.2 外生冲击

```typescript
interface ExternalShock {
  type: 'supply' | 'demand' | 'financial' | 'policy';
  
  description: string;
  
  // 影响范围
  affectedGoods: string[];
  affectedIndustries: string[];
  
  // 冲击程度
  magnitude: number;          // -1 到 1
  duration: number;           // 持续tick数
  
  // 传导机制
  propagation: {
    directEffect: number;     // 直接影响
    indirectEffect: number;   // 间接影响（通过供应链）
    expectationEffect: number; // 预期影响
  };
}

const SHOCK_TEMPLATES: ExternalShock[] = [
  {
    type: 'supply',
    description: '能源危机',
    affectedGoods: ['oil', 'natural-gas', 'electricity'],
    affectedIndustries: ['energy', 'manufacturing'],
    magnitude: -0.3,
    duration: 180,
    propagation: { directEffect: 0.5, indirectEffect: 0.3, expectationEffect: 0.2 },
  },
  {
    type: 'demand',
    description: '消费信心下滑',
    affectedGoods: ['luxury-goods', 'durables'],
    affectedIndustries: ['retail', 'automotive'],
    magnitude: -0.2,
    duration: 90,
    propagation: { directEffect: 0.6, indirectEffect: 0.2, expectationEffect: 0.2 },
  },
  {
    type: 'financial',
    description: '信贷紧缩',
    affectedGoods: [],
    affectedIndustries: ['all'],
    magnitude: -0.4,
    duration: 120,
    propagation: { directEffect: 0.3, indirectEffect: 0.3, expectationEffect: 0.4 },
  },
];
```

---

## 九、预期与投机

### 9.1 适应性预期

```typescript
interface ExpectationModel {
  // 适应性预期：基于历史
  adaptiveExpectation: {
    weight: number;            // 最近一期权重
    historyLength: number;     // 考虑的历史期数
  };
  
  // 理性预期：基于模型
  rationalExpectation: {
    modelAccuracy: number;     // 模型准确度
    informationSet: string[];  // 可用信息集
  };
  
  // 实际预期（两者加权）
  adaptiveWeight: number;      // 适应性权重
  rationalWeight: number;      // 理性权重
}

function formExpectation(
  model: ExpectationModel,
  history: number[],
  fundamentals: { supplyGrowth: number; demandGrowth: number }
): number {
  // 适应性预期：加权平均历史
  const weights = [];
  let totalWeight = 0;
  for (let i = 0; i < model.adaptiveExpectation.historyLength; i++) {
    const w = Math.pow(model.adaptiveExpectation.weight, i);
    weights.push(w);
    totalWeight += w;
  }
  const adaptiveValue = history.slice(-model.adaptiveExpectation.historyLength)
    .reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
  
  // 理性预期：基于基本面
  const lastValue = history[history.length - 1];
  const expectedGrowth = (fundamentals.demandGrowth - fundamentals.supplyGrowth) * 0.1;
  const rationalValue = lastValue * (1 + expectedGrowth);
  
  // 加权组合
  return adaptiveValue * model.adaptiveWeight + rationalValue * model.rationalWeight;
}
```

### 9.2 投机行为

```typescript
interface SpeculatorBehavior {
  // 投机者类型
  type: 'momentum' | 'contrarian' | 'fundamental' | 'noise';
  
  // 策略参数
  momentum: {
    lookbackPeriod: number;    // 回看周期
    entryThreshold: number;    // 入场阈值（价格变化率）
    exitThreshold: number;     // 出场阈值
  };
  
  contrarian: {
    oversoldThreshold: number; // 超卖阈值
    overboughtThreshold: number; // 超买阈值
    meanReversionSpeed: number; // 均值回归速度假设
  };
  
  // 资金与仓位
  capital: number;
  position: number;            // 正为多头，负为空头
  maxPosition: number;         // 最大仓位
}

function speculatorDecision(
  spec: SpeculatorBehavior,
  priceHistory: number[],
  fundamentalValue: number
): { action: 'buy' | 'sell' | 'hold'; quantity: number } {
  const currentPrice = priceHistory[priceHistory.length - 1];
  
  switch (spec.type) {
    case 'momentum': {
      const oldPrice = priceHistory[priceHistory.length - 1 - spec.momentum.lookbackPeriod];
      const returns = (currentPrice - oldPrice) / oldPrice;
      
      if (returns > spec.momentum.entryThreshold && spec.position < spec.maxPosition) {
        return { action: 'buy', quantity: spec.capital * 0.1 / currentPrice };
      }
      if (returns < -spec.momentum.exitThreshold && spec.position > 0) {
        return { action: 'sell', quantity: spec.position };
      }
      break;
    }
    
    case 'contrarian': {
      const deviation = (currentPrice - fundamentalValue) / fundamentalValue;
      
      if (deviation < -spec.contrarian.oversoldThreshold) {
        return { action: 'buy', quantity: spec.capital * 0.2 / currentPrice };
      }
      if (deviation > spec.contrarian.overboughtThreshold) {
        return { action: 'sell', quantity: spec.position };
      }
      break;
    }
    
    case 'fundamental': {
      if (currentPrice < fundamentalValue * 0.9) {
        return { action: 'buy', quantity: spec.capital * 0.15 / currentPrice };
      }
      if (currentPrice > fundamentalValue * 1.1) {
        return { action: 'sell', quantity: spec.position };
      }
      break;
    }
    
    case 'noise': {
      // 随机交易
      if (Math.random() < 0.1) {
        const action = Math.random() > 0.5 ? 'buy' : 'sell';
        return { action, quantity: spec.capital * 0.05 / currentPrice };
      }
      break;
    }
  }
  
  return { action: 'hold', quantity: 0 };
}
```

---

## 十、完整模拟循环

### 10.1 主循环流程

```typescript
function simulationTick(world: EconomyWorld): void {
  const tick = world.tick++;
  
  // 1. 更新经济周期状态
  updateBusinessCycle(world.cycle, tick);
  
  // 2. 处理外生冲击
  processExternalShocks(world);
  
  // 3. 劳动力市场出清
  clearLaborMarket(world);
  
  // 4. 企业生产决策（基于成本曲线）
  for (const company of world.companies) {
    const optimalOutput = determineOptimalQuantity(
      company,
      company.primaryProduct,
      world.prices.get(company.primaryProduct)!,
      company.costModel
    );
    executeProduction(company, optimalOutput);
  }
  
  // 5. 消费者需求计算（基于效用最大化）
  calculateAggregatedDemand(world);
  
  // 6. 市场出清与价格发现
  for (const goodsId of world.goods) {
    const supply = calculateTotalSupply(world, goodsId);
    const demand = calculateTotalDemand(world, goodsId);
    const newPrice = findEquilibriumPrice(
      (p) => calculateSupplyAtPrice(world, goodsId, p),
      (p) => calculateDemandAtPrice(world, goodsId, p),
      world.prices.get(goodsId)!
    );
    world.prices.set(goodsId, newPrice);
  }
  
  // 7. 投机者交易
  for (const spec of world.speculators) {
    const decision = speculatorDecision(spec, world.priceHistory, world.fundamentalValue);
    executeSpeculatorTrade(world, spec, decision);
  }
  
  // 8. 货币与信贷更新
  updateMonetarySystem(world);
  processLoanApplications(world);
  
  // 9. 企业投资决策
  for (const company of world.companies) {
    if (shouldExpandCapacity(company.investmentModel)) {
      executeExpansionInvestment(company);
    }
  }
  
  // 10. 计算宏观指标
  calculateMacroIndicators(world);
  
  // 11. 记录历史数据
  recordHistoricalData(world);
}
```

### 10.2 配置示例

```typescript
const REALISTIC_ECONOMY_CONFIG = {
  // 时间尺度
  ticksPerDay: 1,
  ticksPerYear: 365,
  
  // 市场规模
  initialPopulation: 1_000_000,
  initialGDP: 10_000_000_000,  // 100亿
  
  // 通胀目标
  targetInflation: 0.02,       // 2%
  
  // 经济周期
  businessCycleLength: 365 * 5, // 5年周期
  cycleAmplitude: 0.1,         // ±10%波动
  
  // 货币政策
  initialInterestRate: 0.03,   // 3%
  reserveRatio: 0.1,           // 10%
  
  // 劳动力市场
  naturalUnemployment: 0.05,   // 5%
  minimumWage: 2000,           // 2000/月
  
  // 市场结构
  antitrust: {
    hhiThreshold: 2500,        // 触发调查的HHI阈值
    maxMarketShare: 0.4,       // 最大允许市场份额
  },
};
```

---

## 总结

本方案实现了接近真实经济学教科书水平的市场模拟，核心特性：

1. **供给侧**: 边际成本曲线、利润最大化产量决策
2. **需求侧**: 效用函数、价格弹性、收入分布
3. **价格发现**: 均衡搜索、信息不对称、多种机制
4. **市场结构**: HHI分析、寡头博弈、价格领导
5. **货币金融**: 货币供应、利率、信贷配给
6. **劳动力**: 工资曲线、失业率、技能分层
7. **周期波动**: 景气循环、外生冲击、传导机制
8. **预期投机**: 适应性/理性预期、多类型投机者

这套系统可以产生真实经济中观察到的现象：
- 价格黏性
- 通胀惯性
- 投资周期
- 产能过剩与短缺交替
- 信贷扩张与收缩
- 资产泡沫与崩盘

---

*文档结束*