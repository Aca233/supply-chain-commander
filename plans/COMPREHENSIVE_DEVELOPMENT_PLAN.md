# 《供应链指挥官》完整开发计划 V2.0

> **整合自**: GAME_DEVELOPMENT_PROMPT.md, HIGH_PERFORMANCE_ARCHITECTURE.md, REALISTIC_MARKET_SIMULATION.md, ui.md
> **当前状态**: 基础框架已完成，需要完善核心经济机制和游戏深度
> **目标**: 构建一个基于真实经济学原理的高性能商业模拟游戏

---

## 一、当前完成状态

### ✅ 已完成的核心系统

| 系统 | 完成度 | 说明 |
|------|--------|------|
| 数据结构 (SoA) | 90% | TypedArray存储，高性能架构 |
| 商品系统 | 95% | 104种商品，5大产业链 |
| 配方系统 | 95% | 62个生产配方 |
| 生产引擎 | 85% | 批量处理，效率计算 |
| 订单簿系统 | 80% | 买卖订单创建、撮合 |
| 价格引擎 | 70% | 基础均衡，需优化 |
| AI决策引擎 | 60% | 框架完成，策略需优化 |
| UI界面 | 75% | 6个主页面，需完善 |
| 存档系统 | 80% | 基础功能完成 |

### ❌ 待实现的关键功能

| 功能 | 优先级 | 影响 |
|------|--------|------|
| AI投资实际执行 | P0 | 核心玩法 |
| 经济周期影响 | P0 | 市场真实性 |
| 劳动力/能源消耗 | P1 | 成本真实性 |
| 贷款系统 | P1 | 财务深度 |
| 建筑升级UI | P1 | 玩家体验 |
| 研发科技树 | P2 | 长期目标 |
| 国际贸易 | P3 | 内容扩展 |

---

## 二、经济系统完善计划

### 2.1 价格机制增强

**当前问题**: 供需数据每tick重置，价格波动不连续

**解决方案**:
```typescript
// 添加滑动窗口供需累计
interface EnhancedGoodsData {
  // 现有字段...
  
  // 新增: 滑动窗口供需
  supplyHistory: Float32Array;  // [GOODS_COUNT × WINDOW_SIZE]
  demandHistory: Float32Array;  // [GOODS_COUNT × WINDOW_SIZE]
  historyPtr: number;
  
  // 价格预期
  priceExpectations: Float32Array;  // 市场对未来价格的预期
  priceVelocity: Float32Array;      // 价格变化速度
  
  // 交易量加权价格 (VWAP)
  vwap24h: Float32Array;
  volume24h: Float32Array;
}

// 增强的价格更新
function updatePriceWithHistory(world: GameWorld, goodsId: number): number {
  const g = world.goods;
  const windowSize = 24;  // 24 tick窗口
  
  // 记录本tick供需
  const ptr = g.historyPtr;
  g.supplyHistory[goodsId * windowSize + ptr] = g.supplies[goodsId];
  g.demandHistory[goodsId * windowSize + ptr] = g.demands[goodsId];
  
  // 计算加权平均（近期权重更高）
  let weightedSupply = 0, weightedDemand = 0, totalWeight = 0;
  for (let i = 0; i < windowSize; i++) {
    const age = (windowSize + ptr - i) % windowSize;
    const weight = Math.exp(-age * 0.1);  // 指数衰减
    const idx = goodsId * windowSize + i;
    weightedSupply += g.supplyHistory[idx] * weight;
    weightedDemand += g.demandHistory[idx] * weight;
    totalWeight += weight;
  }
  
  const avgSupply = weightedSupply / totalWeight;
  const avgDemand = weightedDemand / totalWeight;
  
  // 价格调整考虑预期
  const ratio = avgDemand / (avgSupply + 0.001);
  const expectedChange = g.priceExpectations[goodsId];
  
  // 综合供需和预期
  let targetChange = 0;
  if (ratio > 1.1) {
    targetChange = Math.min(0.03, (ratio - 1) * 0.015);
  } else if (ratio < 0.9) {
    targetChange = Math.max(-0.03, (ratio - 1) * 0.015);
  }
  
  // 添加价格动量
  const momentum = g.priceVelocity[goodsId] * 0.3;
  targetChange = targetChange * 0.7 + momentum + expectedChange * 0.1;
  
  // 更新价格
  const newPrice = g.prices[goodsId] * (1 + targetChange);
  
  // 记录价格速度
  g.priceVelocity[goodsId] = (newPrice - g.prices[goodsId]) / g.prices[goodsId];
  
  return newPrice;
}
```

### 2.2 消费者分层扩展

**当前问题**: 只有4个人口层级，需求模型过于简化

**解决方案**:
```typescript
// 扩展到8个收入层级
const POPULATION_LAYERS = [
  { name: '超高收入', share: 0.01, avgIncome: 200000, priority: ['luxury', 'premium', 'final'], priceMultiplier: 0.5 },
  { name: '高收入',   share: 0.09, avgIncome: 80000,  priority: ['final', 'premium'], priceMultiplier: 0.7 },
  { name: '中高收入', share: 0.15, avgIncome: 40000,  priority: ['final', 'intermediate'], priceMultiplier: 0.85 },
  { name: '中产',     share: 0.25, avgIncome: 20000,  priority: ['final', 'basic'], priceMultiplier: 1.0 },
  { name: '中低收入', share: 0.20, avgIncome: 12000,  priority: ['basic', 'final'], priceMultiplier: 1.1 },
  { name: '工薪',     share: 0.15, avgIncome: 7000,   priority: ['basic', 'raw'], priceMultiplier: 1.2 },
  { name: '低收入',   share: 0.10, avgIncome: 4000,   priority: ['raw', 'basic'], priceMultiplier: 1.3 },
  { name: '贫困',     share: 0.05, avgIncome: 2000,   priority: ['raw'], priceMultiplier: 1.5 },
];

// 增强需求计算
function calculateEnhancedDemand(world: GameWorld): void {
  const g = world.goods;
  const cycle = world.economyStats;
  
  // 经济周期对消费的影响
  const cycleMultiplier = 1 + (cycle.cyclePosition - 0.5) * 0.3;
  
  // 消费者信心指数 (基于近期价格走势)
  const consumerConfidence = calculateConsumerConfidence(world);
  
  for (let i = 0; i < g.count; i++) {
    const goods = ALL_GOODS[i];
    const price = g.prices[i];
    const baseValue = g.baseValues[i];
    
    let totalDemand = 0;
    
    for (const layer of POPULATION_LAYERS) {
      // 检查该层是否消费此类商品
      if (!layer.priority.includes(goods.category)) continue;
      
      const layerPop = world.population * layer.share;
      const effectiveIncome = layer.avgIncome * cycleMultiplier * consumerConfidence;
      
      // 价格弹性效应
      const priceRatio = price / baseValue;
      const priceEffect = Math.pow(priceRatio, goods.priceElasticity);
      
      // 收入弹性效应
      const incomeRatio = effectiveIncome / 20000;  // 基准收入
      const incomeEffect = Math.pow(incomeRatio, goods.incomeElasticity);
      
      // 可负担性
      const affordability = effectiveIncome / (price * layer.priceMultiplier);
      
      // 计算需求
      const baseDemand = goods.isConsumerGood ? 10 : 1;
      const perCapitaDemand = baseDemand * priceEffect * incomeEffect * Math.min(1, affordability * 0.1);
      
      totalDemand += layerPop * perCapitaDemand;
    }
    
    g.demands[i] += totalDemand;
  }
}

function calculateConsumerConfidence(world: GameWorld): number {
  // 基于CPI和就业率
  let confidence = 1.0;
  
  // 价格稳定性影响
  const avgPriceChange = calculateAveragePriceChange(world);
  confidence -= avgPriceChange * 2;  // 通胀降低信心
  
  // 经济周期影响
  confidence += (world.economyStats.cyclePosition - 0.5) * 0.2;
  
  return Math.max(0.5, Math.min(1.5, confidence));
}
```

### 2.3 经济周期实际影响

**当前问题**: cyclePhase已定义但未影响游戏

**解决方案**:
```typescript
// 经济周期影响配置
const CYCLE_EFFECTS = {
  expansion: {
    demandMultiplier: 1.15,
    investmentMultiplier: 1.3,
    creditMultiplier: 1.2,
    wageGrowth: 0.02,
    interestRate: 0.05,
  },
  peak: {
    demandMultiplier: 1.2,
    investmentMultiplier: 1.1,
    creditMultiplier: 1.0,
    wageGrowth: 0.03,
    interestRate: 0.06,
  },
  contraction: {
    demandMultiplier: 0.9,
    investmentMultiplier: 0.6,
    creditMultiplier: 0.7,
    wageGrowth: -0.01,
    interestRate: 0.04,
  },
  trough: {
    demandMultiplier: 0.85,
    investmentMultiplier: 0.5,
    creditMultiplier: 0.5,
    wageGrowth: 0,
    interestRate: 0.02,
  },
};

// 在GameLoop中应用周期效应
function applyCycleEffects(world: GameWorld): void {
  const phase = world.economyStats.cyclePhase;
  const effects = CYCLE_EFFECTS[phase];
  
  // 更新全局经济参数
  world.economyStats.demandMultiplier = effects.demandMultiplier;
  world.economyStats.investmentMultiplier = effects.investmentMultiplier;
  world.economyStats.creditMultiplier = effects.creditMultiplier;
  world.economyStats.currentInterestRate = effects.interestRate;
  
  // 触发周期相关事件
  if (phase === 'contraction' && world.tick % 24 === 0) {
    triggerRecessionEvent(world);
  } else if (phase === 'expansion' && world.tick % 24 === 0) {
    triggerBoomEvent(world);
  }
}
```

---

## 三、生产系统完善计划

### 3.1 劳动力系统

**当前问题**: laborRequired字段定义但未使用

**解决方案**:
```typescript
// 劳动力市场数据结构
interface LaborMarket {
  totalLabor: number;           // 总劳动力
  employed: number;             // 就业人数
  unemploymentRate: number;     // 失业率
  averageWage: number;          // 平均工资
  minimumWage: number;          // 最低工资
  
  // 按技能分层
  skillLevels: {
    unskilled: { supply: number; demand: number; wage: number };
    skilled: { supply: number; demand: number; wage: number };
    professional: { supply: number; demand: number; wage: number };
  };
}

// 建筑劳动力需求
function calculateBuildingLaborCost(world: GameWorld, buildingId: number): number {
  const b = world.buildings;
  const recipeId = b.recipeIds[buildingId];
  const recipe = RECIPES_BY_ID.get(recipeId);
  if (!recipe) return 0;
  
  const efficiency = b.efficiencies[buildingId];
  const laborNeeded = recipe.laborRequired * efficiency;
  
  // 根据失业率调整工资
  const unemploymentEffect = 1 - (world.laborMarket.unemploymentRate - 0.05) * 2;
  const effectiveWage = world.laborMarket.averageWage * unemploymentEffect;
  
  return laborNeeded * effectiveWage / 720;  // 每tick的劳动成本 (月工资/720tick)
}

// 生产时扣除劳动成本
function processBuildingWithLabor(world: GameWorld, buildingId: number): boolean {
  const owner = world.buildings.owners[buildingId];
  const laborCost = calculateBuildingLaborCost(world, buildingId);
  
  // 检查公司是否能支付工资
  if (world.companies.cash[owner] < laborCost) {
    // 无法支付工资，效率下降
    world.buildings.efficiencies[buildingId] *= 0.95;
    return false;
  }
  
  // 扣除劳动成本
  world.companies.cash[owner] -= laborCost;
  world.laborMarket.employed += calculateLaborDemand(world, buildingId);
  
  return true;
}
```

### 3.2 能源系统

**当前问题**: energyRequired字段定义但未使用

**解决方案**:
```typescript
// 能源市场
interface EnergyMarket {
  electricityPrice: number;     // 电价
  totalCapacity: number;        // 总发电量
  totalDemand: number;          // 总需求
  gridStatus: 'normal' | 'strained' | 'blackout';
}

// 建筑能源成本
function calculateBuildingEnergyCost(world: GameWorld, buildingId: number): number {
  const b = world.buildings;
  const recipeId = b.recipeIds[buildingId];
  const recipe = RECIPES_BY_ID.get(recipeId);
  if (!recipe) return 0;
  
  const efficiency = b.efficiencies[buildingId];
  const energyNeeded = recipe.energyRequired * efficiency;
  
  return energyNeeded * world.energyMarket.electricityPrice;
}

// 检查能源供应
function checkEnergySupply(world: GameWorld): void {
  const em = world.energyMarket;
  
  if (em.totalDemand > em.totalCapacity * 1.1) {
    em.gridStatus = 'blackout';
    // 随机停电影响部分建筑
    for (let i = 0; i < world.buildings.count; i++) {
      if (Math.random() < 0.3) {
        world.buildings.isActive[i] = 0;
      }
    }
  } else if (em.totalDemand > em.totalCapacity * 0.9) {
    em.gridStatus = 'strained';
    em.electricityPrice *= 1.1;  // 电价上涨
  } else {
    em.gridStatus = 'normal';
  }
}
```

### 3.3 建筑升级系统

**当前问题**: 升级成本定义但UI入口缺失

**解决方案**: 在Production.tsx中添加升级功能
```typescript
// 升级按钮组件
function BuildingUpgradePanel({ buildingId }: { buildingId: number }) {
  const { getWorld, playerCash, addNotification } = useGameStore();
  const world = getWorld();
  if (!world) return null;
  
  const level = world.buildings.levels[buildingId];
  const typeId = world.buildings.types[buildingId];
  const building = ALL_BUILDINGS.find(b => b.id === typeId);
  if (!building || level >= building.maxLevel) return null;
  
  const upgradeCost = building.upgradeCosts[level] || building.buildCost * 0.5;
  const canUpgrade = playerCash >= upgradeCost;
  
  const handleUpgrade = () => {
    if (!canUpgrade) {
      addNotification('error', '资金不足');
      return;
    }
    
    // 执行升级
    world.companies.cash[0] -= upgradeCost;
    world.buildings.levels[buildingId]++;
    world.buildings.efficiencies[buildingId] *= 1.1;  // 效率+10%
    
    addNotification('success', `建筑升级到 ${level + 1} 级`);
  };
  
  return (
    <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-400">当前等级: {level} / {building.maxLevel}</p>
          <p className="text-sm text-slate-400">升级后效率: +10%</p>
        </div>
        <button
          onClick={handleUpgrade}
          disabled={!canUpgrade}
          className={`px-4 py-2 rounded-lg ${
            canUpgrade
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }`}
        >
          升级 ¥{upgradeCost.toLocaleString()}
        </button>
      </div>
    </div>
  );
}
```

---

## 四、AI系统完善计划

### 4.1 AI投资执行

**当前问题**: AI投资决策返回true但未实际建造

**解决方案**:
```typescript
function executeInvestmentDecision(world: GameWorld, decision: AIDecision): boolean {
  const { companyId, action, params } = decision;
  
  if (action === 'build') {
    const buildingTypeId = params.buildingTypeId as number;
    const recipeId = params.recipeId as number;
    const cost = params.cost as number;
    
    // 检查资金
    if (world.companies.cash[companyId] < cost) {
      return false;
    }
    
    // 扣除资金
    world.companies.cash[companyId] -= cost;
    
    // 添加建筑
    const buildingId = world.buildings.count;
    if (buildingId >= MAX_BUILDINGS) {
      world.companies.cash[companyId] += cost;  // 退款
      return false;
    }
    
    world.buildings.types[buildingId] = buildingTypeId;
    world.buildings.owners[buildingId] = companyId;
    world.buildings.levels[buildingId] = 1;
    world.buildings.efficiencies[buildingId] = 1.0;
    world.buildings.recipeIds[buildingId] = recipeId;
    world.buildings.isActive[buildingId] = 1;
    world.buildings.count++;
    
    return true;
  }
  
  if (action === 'upgrade') {
    const buildingId = params.buildingId as number;
    const cost = params.cost as number;
    
    if (world.companies.cash[companyId] < cost) {
      return false;
    }
    
    world.companies.cash[companyId] -= cost;
    world.buildings.levels[buildingId]++;
    world.buildings.efficiencies[buildingId] *= 1.1;
    
    return true;
  }
  
  return false;
}
```

### 4.2 AI策略差异化

**当前问题**: 所有AI使用相同决策逻辑

**解决方案**:
```typescript
// AI人格影响决策参数
const PERSONALITY_MODIFIERS = {
  aggressive: {
    priceMultiplier: 0.9,      // 激进定价
    investThreshold: 0.3,      // 低门槛投资
    expansionSpeed: 1.5,       // 快速扩张
    riskTolerance: 0.8,
  },
  conservative: {
    priceMultiplier: 1.05,
    investThreshold: 0.6,
    expansionSpeed: 0.6,
    riskTolerance: 0.3,
  },
  opportunist: {
    priceMultiplier: 1.0,
    investThreshold: 0.4,
    expansionSpeed: 1.2,
    riskTolerance: 0.6,
    cycleAwareness: 1.5,       // 更敏感于经济周期
  },
  specialist: {
    priceMultiplier: 1.1,      // 品质溢价
    investThreshold: 0.5,
    expansionSpeed: 0.8,
    focusBonus: 1.3,           // 专注领域效率加成
  },
  cost_leader: {
    priceMultiplier: 0.85,
    investThreshold: 0.4,
    expansionSpeed: 1.0,
    efficiencyBonus: 1.2,      // 成本控制加成
  },
};

// 根据人格调整决策
function adjustDecisionByPersonality(
  decision: AIDecision,
  personality: PersonalityType,
  cyclePhase: CyclePhase
): AIDecision {
  const mods = PERSONALITY_MODIFIERS[personality];
  
  if (decision.type === 'trading' && decision.action === 'sell') {
    decision.params.price = (decision.params.price as number) * mods.priceMultiplier;
  }
  
  if (decision.type === 'investment') {
    // 保守型在衰退期不投资
    if (personality === 'conservative' && cyclePhase === 'contraction') {
      decision.confidence *= 0.3;
    }
    // 机会型在低谷期加大投资
    if (personality === 'opportunist' && cyclePhase === 'trough') {
      decision.confidence *= 1.5;
    }
  }
  
  return decision;
}
```

### 4.3 AI破产机制

**解决方案**:
```typescript
function checkBankruptcy(world: GameWorld): void {
  for (let i = 1; i < world.companies.count; i++) {  // 跳过玩家 (id=0)
    if (!world.companies.isAI[i]) continue;
    
    const cash = world.companies.cash[i];
    const totalAssets = calculateTotalAssets(world, i);
    const liabilities = world.companies.totalLiabilities[i];
    
    // 资不抵债
    if (totalAssets < liabilities && cash < 0) {
      // 标记破产
      world.companies.isBankrupt[i] = 1;
      
      // 出售资产
      auctionAssets(world, i);
      
      // 触发事件
      addGameEvent(world, {
        type: 'bankruptcy',
        companyId: i,
        companyName: AI_COMPANIES[i - 1].name,
        tick: world.tick,
      });
    }
  }
}

function auctionAssets(world: GameWorld, companyId: number): void {
  // 建筑拍卖（折价50%）
  for (let i = 0; i < world.buildings.count; i++) {
    if (world.buildings.owners[i] === companyId) {
      const typeId = world.buildings.types[i];
      const building = ALL_BUILDINGS.find(b => b.id === typeId);
      const auctionPrice = (building?.buildCost || 100000) * 0.5;
      
      // 找到有意向的买家
      const buyer = findInterestedBuyer(world, typeId, auctionPrice);
      if (buyer !== null) {
        world.buildings.owners[i] = buyer;
        world.companies.cash[buyer] -= auctionPrice;
        world.companies.cash[companyId] += auctionPrice;
      } else {
        // 无人购买，建筑关闭
        world.buildings.isActive[i] = 0;
      }
    }
  }
}
```

---

## 五、金融系统计划

### 5.1 贷款系统

```typescript
interface Loan {
  id: number;
  companyId: number;
  principal: number;        // 本金
  remainingPrincipal: number;
  interestRate: number;
  term: number;             // 期限（tick）
  startTick: number;
  monthlyPayment: number;
  status: 'active' | 'defaulted' | 'paid';
}

interface LoanSystem {
  loans: Loan[];
  maxLoanId: number;
  
  // 信贷条件
  baseInterestRate: number;
  creditMultipliers: Map<number, number>;  // 公司信用评分
}

// 贷款申请
function applyForLoan(
  world: GameWorld,
  companyId: number,
  amount: number,
  term: number
): Loan | null {
  const company = world.companies;
  const totalAssets = calculateTotalAssets(world, companyId);
  const existingDebt = company.totalLiabilities[companyId];
  
  // 债务限制：不超过资产的70%
  if (existingDebt + amount > totalAssets * 0.7) {
    return null;
  }
  
  // 计算利率（基于信用评分）
  const creditScore = world.loanSystem.creditMultipliers.get(companyId) || 1.0;
  const interestRate = world.loanSystem.baseInterestRate * creditScore;
  
  // 创建贷款
  const loan: Loan = {
    id: ++world.loanSystem.maxLoanId,
    companyId,
    principal: amount,
    remainingPrincipal: amount,
    interestRate,
    term,
    startTick: world.tick,
    monthlyPayment: calculateMonthlyPayment(amount, interestRate, term),
    status: 'active',
  };
  
  // 发放贷款
  company.cash[companyId] += amount;
  company.totalLiabilities[companyId] += amount;
  world.loanSystem.loans.push(loan);
  
  return loan;
}

// 每tick处理贷款还款
function processLoanPayments(world: GameWorld): void {
  const ticksPerMonth = 720;  // 假设1个月=720tick
  
  for (const loan of world.loanSystem.loans) {
    if (loan.status !== 'active') continue;
    
    // 每月还款
    if ((world.tick - loan.startTick) % ticksPerMonth === 0) {
      const companyId = loan.companyId;
      const payment = loan.monthlyPayment;
      
      if (world.companies.cash[companyId] >= payment) {
        world.companies.cash[companyId] -= payment;
        loan.remainingPrincipal -= (payment - loan.remainingPrincipal * loan.interestRate / 12);
        
        if (loan.remainingPrincipal <= 0) {
          loan.status = 'paid';
          world.companies.totalLiabilities[companyId] -= loan.principal;
        }
      } else {
        // 违约
        loan.status = 'defaulted';
        // 信用评分下降
        const currentScore = world.loanSystem.creditMultipliers.get(companyId) || 1.0;
        world.loanSystem.creditMultipliers.set(companyId, currentScore * 1.2);
      }
    }
  }
}
```

### 5.2 Finance页面贷款UI

```typescript
// 贷款申请组件
function LoanApplicationForm() {
  const [amount, setAmount] = useState(100000);
  const [term, setTerm] = useState(720 * 12);  // 1年
  const { getWorld, playerCash, addNotification } = useGameStore();
  
  const world = getWorld();
  const baseRate = world?.loanSystem.baseInterestRate || 0.05;
  const creditScore = world?.loanSystem.creditMultipliers.get(0) || 1.0;
  const effectiveRate = baseRate * creditScore;
  const monthlyPayment = calculateMonthlyPayment(amount, effectiveRate, term);
  
  const handleApply = () => {
    if (!world) return;
    const loan = applyForLoan(world, 0, amount, term);
    if (loan) {
      addNotification('success', `贷款申请成功！月供 ¥${monthlyPayment.toFixed(0)}`);
    } else {
      addNotification('error', '贷款申请被拒绝：超出信用额度');
    }
  };
  
  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">申请贷款</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm text-slate-400">贷款金额</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full mt-1 p-2 bg-slate-700 rounded"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400">期限（月）</label>
          <select
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="w-full mt-1 p-2 bg-slate-700 rounded"
          >
            <option value={720 * 6}>6个月</option>
            <option value={720 * 12}>12个月</option>
            <option value={720 * 24}>24个月</option>
            <option value={720 * 36}>36个月</option>
          </select>
        </div>
      </div>
      
      <div className="bg-slate-700/50 p-4 rounded mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">年利率</span>
          <span className="text-white">{(effectiveRate * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-slate-400">月供</span>
          <span className="text-accent font-medium">¥{monthlyPayment.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-slate-400">总还款</span>
          <span className="text-white">¥{(monthlyPayment * term / 720).toFixed(0)}</span>
        </div>
      </div>
      
      <button
        onClick={handleApply}
        className="w-full py-2 bg-accent text-white rounded hover:bg-accent/90"
      >
        提交申请
      </button>
    </div>
  );
}
```

---

## 六、研发科技树计划 (P2)

### 6.1 科技树结构

```typescript
interface Technology {
  id: number;
  key: string;
  name: string;
  description: string;
  category: 'production' | 'efficiency' | 'market' | 'management';
  
  // 研发成本
  researchCost: number;        // 研发投资
  researchTime: number;        // 研发时间（tick）
  
  // 前置条件
  prerequisites: number[];     // 前置科技ID
  requiredBuildings: number[]; // 需要的建筑类型
  
  // 解锁内容
  unlockRecipes: number[];     // 解锁的配方
  unlockBuildings: number[];   // 解锁的建筑
  efficiencyBonus: number;     // 全局效率加成
  
  // 状态
  status: 'locked' | 'available' | 'researching' | 'completed';
  progress: number;
}

const TECHNOLOGIES: Technology[] = [
  // 基础科技
  {
    id: 1, key: 'advanced-metallurgy', name: '先进冶金',
    description: '解锁电弧炉炼钢，提高钢材产量',
    category: 'production',
    researchCost: 500000, researchTime: 720 * 3,
    prerequisites: [], requiredBuildings: [8],  // 需要冶炼厂
    unlockRecipes: [11], unlockBuildings: [], efficiencyBonus: 0,
    status: 'available', progress: 0,
  },
  {
    id: 2, key: 'automation-1', name: '自动化 I',
    description: '所有建筑效率+5%',
    category: 'efficiency',
    researchCost: 300000, researchTime: 720 * 2,
    prerequisites: [], requiredBuildings: [],
    unlockRecipes: [], unlockBuildings: [], efficiencyBonus: 0.05,
    status: 'available', progress: 0,
  },
  // 高级科技
  {
    id: 3, key: 'ai-manufacturing', name: 'AI制造',
    description: '解锁AI芯片生产，建筑效率+10%',
    category: 'production',
    researchCost: 2000000, researchTime: 720 * 6,
    prerequisites: [2], requiredBuildings: [17],  // 需要半导体厂
    unlockRecipes: [58], unlockBuildings: [37], efficiencyBonus: 0.1,
    status: 'locked', progress: 0,
  },
];
```

### 6.2 研发系统

```typescript
interface ResearchSystem {
  currentResearch: number | null;  // 当前研究的科技ID
  completedTechs: Set<number>;
  researchPoints: number;          // 累积研发点数
  dailyResearchRate: number;       // 每日研发产出
}

function processResearch(world: GameWorld): void {
  const rs = world.researchSystem;
  if (rs.currentResearch === null) return;
  
  const tech = TECHNOLOGIES.find(t => t.id === rs.currentResearch);
  if (!tech) return;
  
  // 增加研发进度
  tech.progress += rs.dailyResearchRate / tech.researchTime;
  
  if (tech.progress >= 1) {
    // 研发完成
    tech.status = 'completed';
    rs.completedTechs.add(tech.id);
    rs.currentResearch = null;
    
    // 应用效果
    world.globalEfficiencyBonus += tech.efficiencyBonus;
    
    // 解锁后续科技
    for (const nextTech of TECHNOLOGIES) {
      if (nextTech.prerequisites.every(p => rs.completedTechs.has(p))) {
        if (nextTech.status === 'locked') {
          nextTech.status = 'available';
        }
      }
    }
    
    addGameEvent(world, {
      type: 'tech_completed',
      techId: tech.id,
      techName: tech.name,
    });
  }
}
```

---

## 七、数据真实性修复计划

### 7.1 历史数据记录

```typescript
// 添加游戏历史记录器
interface GameHistory {
  // 财务历史（按tick记录）
  cashHistory: Float32Array;        // [HISTORY_LENGTH]
  revenueHistory: Float32Array;
  costHistory: Float32Array;
  profitHistory: Float32Array;
  
  // 市场历史
  tradeHistory: Trade[];            // 最近N条交易
  priceSnapshots: Map<number, number[]>;  // 商品ID -> 价格历史
  
  // 指针
  historyPtr: number;
  maxHistory: number;
}

// 在每个tick结束时记录数据
function recordTickHistory(world: GameWorld): void {
  const h = world.history;
  const ptr = h.historyPtr;
  
  // 记录玩家财务
  h.cashHistory[ptr] = world.companies.cash[0];
  
  // 计算本tick收入/支出
  const tickResult = world.lastTickResult;
  if (tickResult) {
    let revenue = 0, cost = 0;
    for (const trade of tickResult.matching.trades) {
      if (trade.sellCompanyId === 0) revenue += trade.value;
      if (trade.buyCompanyId === 0) cost += trade.value;
    }
    h.revenueHistory[ptr] = revenue;
    h.costHistory[ptr] = cost;
    h.profitHistory[ptr] = revenue - cost;
    
    // 保留最近交易
    h.tradeHistory.push(...tickResult.matching.trades);
    if (h.tradeHistory.length > 1000) {
      h.tradeHistory = h.tradeHistory.slice(-500);
    }
  }
  
  // 记录价格快照
  for (let i = 0; i < world.goods.count; i++) {
    if (!h.priceSnapshots.has(i)) {
      h.priceSnapshots.set(i, []);
    }
    const history = h.priceSnapshots.get(i)!;
    history.push(world.goods.prices[i]);
    if (history.length > 720) {  // 保留30天
      history.shift();
    }
  }
  
  h.historyPtr = (ptr + 1) % h.maxHistory;
}
```

### 7.2 真实图表数据

```typescript
// Finance页面使用真实历史数据
function useRealIncomeData() {
  const { getWorld, tick } = useGameStore();
  const world = getWorld();
  
  return useMemo(() => {
    if (!world) return [];
    
    const h = world.history;
    const data = [];
    
    // 获取最近30个数据点
    for (let i = 0; i < 30; i++) {
      const idx = (h.historyPtr - 30 + i + h.maxHistory) % h.maxHistory;
      data.push({
        time: `T${world.tick - 30 + i}`,
        revenue: h.revenueHistory[idx] || 0,
        cost: h.costHistory[idx] || 0,
        profit: h.profitHistory[idx] || 0,
      });
    }
    
    return data;
  }, [world, tick]);
}

// Competitors页面真实HHI计算
function calculateRealHHI(world: GameWorld): number {
  const marketShares = new Map<number, number>();
  let totalCash = 0;
  
  for (let i = 0; i < world.companies.count; i++) {
    const cash = world.companies.cash[i];
    totalCash += cash;
    marketShares.set(i, cash);
  }
  
  let hhi = 0;
  for (const [_, cash] of marketShares) {
    const share = cash / totalCash;
    hhi += Math.pow(share * 100, 2);
  }
  
  return Math.round(hhi);
}
```

---

## 八、UI/UX改进计划

### 8.1 新手引导

```typescript
// 引导系统
interface TutorialSystem {
  currentStep: number;
  completedSteps: Set<string>;
  isActive: boolean;
}

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: '欢迎来到供应链指挥官',
    content: '您将经营一家企业，通过生产和交易建立商业帝国。',
    highlight: null,
    action: 'next',
  },
  {
    id: 'dashboard',
    title: '仪表盘',
    content: '这是您的控制中心，显示公司的关键指标。',
    highlight: 'dashboard-kpi',
    action: 'click_dashboard',
  },
  {
    id: 'production',
    title: '生产管理',
    content: '您的建筑会自动生产商品。点击建筑可以查看详情。',
    highlight: 'production-buildings',
    action: 'click_building',
  },
  {
    id: 'market',
    title: '市场交易',
    content: '在这里买卖商品。试着提交一个卖单吧！',
    highlight: 'market-order-form',
    action: 'submit_order',
  },
  {
    id: 'complete',
    title: '准备就绪！',
    content: '现在您已经掌握了基础操作。祝您经营顺利！',
    highlight: null,
    action: 'finish',
  },
];

// 引导组件
function TutorialOverlay() {
  const { tutorialSystem } = useGameStore();
  if (!tutorialSystem.isActive) return null;
  
  const step = TUTORIAL_STEPS[tutorialSystem.currentStep];
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 高亮遮罩 */}
      {step.highlight && (
        <div className="absolute inset-0 bg-black/50">
          <div id={`tutorial-highlight-${step.highlight}`} className="absolute bg-transparent" />
        </div>
      )}
      
      {/* 提示卡片 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-96 bg-white rounded-lg shadow-xl p-6 pointer-events-auto">
        <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
        <p className="mt-2 text-gray-600">{step.content}</p>
        <div className="mt-4 flex justify-between">
          <button className="text-gray-500">跳过教程</button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded">
            {step.action === 'finish' ? '完成' : '继续'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 8.2 成就系统

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (world: GameWorld) => boolean;
  reward: {
    cash?: number;
    researchPoints?: number;
  };
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_million',
    name: '百万富翁',
    description: '累积现金达到100万',
    icon: '💰',
    condition: (world) => world.companies.cash[0] >= 1000000,
    reward: { cash: 50000 },
  },
  {
    id: 'factory_owner',
    name: '工厂主',
    description: '拥有10座建筑',
    icon: '🏭',
    condition: (world) => countPlayerBuildings(world) >= 10,
    reward: { researchPoints: 1000 },
  },
  {
    id: 'market_leader',
    name: '市场领导者',
    description: '在任一商品市场份额超过30%',
    icon: '📈',
    condition: (world) => hasMarketLeadership(world, 0.3),
    reward: { cash: 200000 },
  },
  {
    id: 'survivor',
    name: '幸存者',
    description: '经历一次经济衰退并保持盈利',
    icon: '💪',
    condition: (world) => survivedRecession(world),
    reward: { researchPoints: 2000 },
  },
];
```

---

## 九、开发优先级与里程碑

### 里程碑 1: 核心经济修复 (P0)
- [ ] AI投资执行实现
- [ ] 经济周期影响实现
- [ ] 真实历史数据记录
- [ ] 市场统计真实计算

### 里程碑 2: 系统深度 (P1)
- [ ] 劳动力成本系统
- [ ] 能源消耗系统
- [ ] 建筑升级UI
- [ ] 贷款系统完整实现
- [ ] AI策略差异化

### 里程碑 3: 内容扩展 (P2)
- [ ] 研发科技树
- [ ] 合同订单系统
- [ ] 消费者分层扩展
- [ ] AI破产机制

### 里程碑 4: 体验优化 (P3)
- [ ] 新手引导
- [ ] 成就系统
- [ ] 国际贸易（可选）
- [ ] 政策干预（可选）

---

## 十、技术架构优化

### 10.1 Web Worker使用

```typescript
// 将计算密集型任务移至Worker
// economyWorker.ts 已定义，需在 GameLoop 中集成

// 修改 GameLoop.ts
class GameLoop {
  private workerManager: WorkerManager;
  
  constructor(world: GameWorld) {
    this.world = world;
    this.workerManager = new WorkerManager();
  }
  
  private async processTick(): Promise<TickResult> {
    // 使用Worker进行并行计算
    const [productionResult, priceResult] = await Promise.all([
      this.workerManager.processProduction(this.world),
      this.workerManager.updatePrices(this.world),
    ]);
    
    // 主线程处理订单撮合（需要原子操作）
    const matchingResult = matchAllOrders(this.world);
    
    return { production: productionResult, prices: priceResult, matching: matchingResult };
  }
}
```

### 10.2 状态管理优化

```typescript
// 避免Zustand immer冻结world对象的问题已解决
// 使用外部引用 worldRef 和 gameLoopRef

// 进一步优化：添加选择器避免不必要的重渲染
const usePlayerCash = () => useGameStore(state => state.playerCash);
const useTickNumber = () => useGameStore(state => state.tick);
const usePaused = () => useGameStore(state => state.paused);

// 组件示例
function CashDisplay() {
  const cash = usePlayerCash();  // 只在cash变化时重渲染
  return <span>¥{cash.toLocaleString()}</span>;
}
```

---

## 总结

本开发计划整合了所有原始设计文档，并针对当前实现的不足提供了具体的解决方案：

### 核心改进：
1. **经济真实性** - 滑动窗口供需、价格预期、经济周期影响
2. **生产深度** - 劳动力成本、能源消耗、建筑升级
3. **AI智能** - 投资执行、策略差异化、破产机制
4. **金融系统** - 贷款申请、还款、违约处理
5. **数据真实** - 历史记录、真实图表、正确统计

### 开发建议：
1. 按优先级(P0→P3)逐步实现
2. 每个里程碑后进行完整测试
3. 保持代码质量，添加类型检查
4. 定期进行性能评估

通过实施此计划，游戏将从"可运行的原型"升级为"真正有深度的市场经济模拟游戏"。