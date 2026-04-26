# China 2019 Economy Data Recalibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recalibrate the existing data-driven economy so the current enterprise-management gameplay behaves like a compressed China 2019 national economy without changing any core simulation logic.

**Architecture:** Keep the current SoA `GameWorld` structure, the existing `goods -> buildings -> demand -> macro -> bootstrap` data flow, and every runtime system module intact. Implement the change as a regression-first data pass: lock in China-2019-specific assertions, then update constants, catalogue values, consumer tiers, banking defaults, macro events, and startup inventories until the new tests and existing smoke tests all agree on the same baseline.

**Tech Stack:** TypeScript, Vite, Vitest, Zustand, data-driven `GameWorld` bootstrap

---

## File Map

- `src/data/goods.ts`: first-wave China 2019 base prices, price elasticities, and income elasticities for energy, construction, manufacturing, mass consumption, and luxury goods.
- `src/data/buildings.ts`: heavy-industry, manufacturing, power, food, and retail throughput; operating-cost profiles; build costs; build times; and output-mode adjustments.
- `src/data/buildingMaterials.ts`: construction material requirements and build-time mirrors for heavy industry, semiconductor fabs, power plants, and convenience stores.
- `src/core/constants.ts`: economy-wide China 2019 constants for GDP, population, money supply, inflation, interest rate, and player bootstrap finance.
- `src/core/balance/BalanceConfig.ts`: runtime balance defaults plus slider metadata ranges that must stay aligned with `constants.ts`.
- `src/core/economy/DemandCurve.ts`: `CONSUMER_TIERS` population/income/savings structure and per-capita consumption baselines for essential, discretionary, and luxury demand.
- `src/core/economy/BusinessCycle.ts`: macro event names, probabilities, durations, and goods multipliers that should emphasize infrastructure, external demand, and credit tightening in a China 2019 profile.
- `src/core/finance/BankingSystem.ts`: reserve ratio, deposit pool, credit multipliers, loan spreads, and loan-option floor rate.
- `src/core/world/WorldInitializer.ts`: player starter inventory and AI building-material bootstrap inventory that must match the heavier construction baseline.
- `src/data/__tests__/china2019Calibration.test.ts`: catalogue-level regression checks for price ladders, throughput ratios, and construction heaviness.
- `src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts`: consumer-tier population and demand-shape regression checks.
- `src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts`: baseline macro constants, balance-store defaults, and loan-option rate regression checks.

### Task 1: Add Calibration Regression Tests

**Files:**
- Create: `src/data/__tests__/china2019Calibration.test.ts`
- Create: `src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts`
- Create: `src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts`

- [ ] **Step 1: Write the catalogue calibration regression**

```ts
import { describe, expect, it } from 'vitest';

import { ALL_BUILDINGS, BuildingId } from '@/data/buildings';
import { getConstructionConfig } from '@/data/buildingMaterials';
import { ALL_GOODS, GoodsId } from '@/data/goods';

function goods(goodsId: number) {
  const value = ALL_GOODS.find(entry => entry.id === goodsId);
  if (!value) {
    throw new Error(`Missing goods ${goodsId}`);
  }
  return value;
}

function building(buildingId: number) {
  const value = ALL_BUILDINGS.find(entry => entry.id === buildingId);
  if (!value) {
    throw new Error(`Missing building ${buildingId}`);
  }
  return value;
}

describe('China 2019 catalogue calibration', () => {
  it('preserves the intended price and elasticity ladder', () => {
    expect(goods(GoodsId.COAL).basePrice).toBeLessThan(goods(GoodsId.STEEL).basePrice);
    expect(goods(GoodsId.CEMENT).basePrice).toBeLessThan(goods(GoodsId.STEEL).basePrice);
    expect(goods(GoodsId.ELECTRICITY).basePrice).toBeLessThan(goods(GoodsId.FOOD).basePrice);
    expect(goods(GoodsId.STEEL).basePrice).toBeLessThan(goods(GoodsId.SMARTPHONE).basePrice);
    expect(goods(GoodsId.CAR).basePrice).toBeLessThan(goods(GoodsId.ELECTRIC_CAR).basePrice);
    expect(goods(GoodsId.FOOD).incomeElasticity).toBeLessThan(goods(GoodsId.JEWELRY).incomeElasticity);
  });

  it('keeps heavy industry bulk throughput above advanced manufacturing', () => {
    const steelMill = building(BuildingId.STEEL_MILL);
    const semiconductorFab = building(BuildingId.SEMICONDUCTOR_FAB);

    const steelPerDay = steelMill.production.outputs[0].amount / steelMill.production.ticksRequired;
    const chipPerDay = semiconductorFab.production.outputs[0].amount / semiconductorFab.production.ticksRequired;

    expect(steelPerDay).toBeGreaterThan(chipPerDay * 20);
    expect(semiconductorFab.buildCost).toBeGreaterThan(steelMill.buildCost);
  });

  it('keeps capital-heavy infrastructure meaningfully heavier than retail rollout', () => {
    const powerPlant = building(BuildingId.POWER_PLANT);
    const convenienceStore = building(BuildingId.CONVENIENCE_STORE);

    expect(powerPlant.buildTime).toBeGreaterThan(convenienceStore.buildTime);

    const powerPlantMaterials = getConstructionConfig(BuildingId.POWER_PLANT);
    const convenienceStoreMaterials = getConstructionConfig(BuildingId.CONVENIENCE_STORE);

    expect(powerPlantMaterials?.baseMaterials.length ?? 0).toBeGreaterThan(
      convenienceStoreMaterials?.baseMaterials.length ?? 0
    );
  });
});
```

- [ ] **Step 2: Run the new catalogue regression and verify it fails**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts`
Expected: FAIL because the current catalogue still prices coal at `600`, steel at `800`, food at `60`, and keeps construction/manufacturing values closer to the old generic sandbox balance.

- [ ] **Step 3: Write the demand and macro baseline regressions**

```ts
import { describe, expect, it } from 'vitest';

import { calculateMarketDemand, CONSUMER_TIERS } from '../DemandCurve';
import { GoodsId } from '@/data/goods';
import { initializeWorld } from '@/core/world/WorldInitializer';

describe('China 2019 consumer profile', () => {
  it('keeps population concentrated in lower and middle income tiers', () => {
    const totalPopulation = CONSUMER_TIERS.reduce((sum, tier) => sum + tier.population, 0);
    const lowerMiddlePopulation = CONSUMER_TIERS
      .slice(0, 5)
      .reduce((sum, tier) => sum + tier.population, 0);

    expect(totalPopulation).toBe(1_400_000_000);
    expect(lowerMiddlePopulation / totalPopulation).toBeGreaterThan(0.85);
    expect(CONSUMER_TIERS[0].baseIncome).toBeLessThan(CONSUMER_TIERS[7].baseIncome);
    expect(CONSUMER_TIERS[0].savingsRate).toBeLessThan(CONSUMER_TIERS[7].savingsRate);
  });

  it('makes essentials larger and less elastic than luxury demand', () => {
    const world = initializeWorld();

    const foodDemand = calculateMarketDemand(world, GoodsId.FOOD);
    const jewelryDemand = calculateMarketDemand(world, GoodsId.JEWELRY);

    expect(foodDemand.quantity).toBeGreaterThan(jewelryDemand.quantity * 50);
    expect(foodDemand.priceElasticity).toBeGreaterThan(jewelryDemand.priceElasticity);
  });
});
```

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import {
  BASE_INTEREST_RATE,
  INITIAL_GDP,
  INITIAL_MONEY_SUPPLY,
  INITIAL_POPULATION,
  PLAYER_CREDIT_RATE,
} from '@/core/constants';
import { useBalanceStore } from '../BalanceConfig';
import { getAvailableLoanOptions, initializeBankingSystem } from '@/core/finance/BankingSystem';
import { initializeWorld } from '@/core/world/WorldInitializer';

describe('China 2019 macro baseline', () => {
  beforeEach(() => {
    useBalanceStore.getState().resetToDefault();
  });

  it('aligns the runtime balance defaults with China 2019 constants', () => {
    const config = useBalanceStore.getState().getConfig();

    expect(INITIAL_GDP).toBe(99_100_000_000_000);
    expect(INITIAL_POPULATION).toBe(1_400_000_000);
    expect(INITIAL_MONEY_SUPPLY).toBe(1_800_000_000_000);
    expect(BASE_INTEREST_RATE).toBe(0.043);
    expect(PLAYER_CREDIT_RATE).toBe(0.058);

    expect(config.economy.initialGDP).toBe(INITIAL_GDP);
    expect(config.economy.initialPopulation).toBe(INITIAL_POPULATION);
    expect(config.economy.baseInterestRate).toBe(BASE_INTEREST_RATE);
    expect(config.player.creditRate).toBe(PLAYER_CREDIT_RATE);
  });

  it('offers starter credit in the intended post-2019 rate band', () => {
    const world = initializeWorld();
    initializeBankingSystem(world);

    const options = getAvailableLoanOptions(world, 0);

    expect(options.length).toBeGreaterThan(0);
    expect(options[0].interestRate).toBeGreaterThanOrEqual(0.045);
    expect(options[0].interestRate).toBeLessThan(0.08);
  });
});
```

- [ ] **Step 4: Run the full calibration suite and capture the red baseline**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts`
Expected: FAIL because the current baseline still uses `210_000_000` population, `10_000_000_000` GDP defaults, much higher food/electricity pricing, and lower-capex heavy industry.

- [ ] **Step 5: Commit the intentional red regression suite**

```bash
git add src/data/__tests__/china2019Calibration.test.ts src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts
git commit -m "test: lock china 2019 economy calibration regressions"
```

### Task 2: Reprice Core Goods And Align Bootstrap Constants

**Files:**
- Modify: `src/core/constants.ts`
- Modify: `src/data/goods.ts`
- Test: `src/data/__tests__/china2019Calibration.test.ts`

- [ ] **Step 1: Re-run the price and macro baseline regressions**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts -t "preserves the intended price and elasticity ladder"`
Expected: FAIL because the old goods catalogue still represents the generic sandbox profile.

- [ ] **Step 2: Update the economy-wide China 2019 constants**

```ts
// src/core/constants.ts
export const INITIAL_GDP = 99_100_000_000_000;
export const INITIAL_POPULATION = 1_400_000_000;
export const INITIAL_MONEY_SUPPLY = 1_800_000_000_000;
export const TARGET_INFLATION = 0.028;
export const BASE_INTEREST_RATE = 0.043;

export const PLAYER_INITIAL_CASH = 18_000_000;
export const PLAYER_CREDIT_LIMIT = 22_000_000;
export const PLAYER_CREDIT_RATE = 0.058;
```

- [ ] **Step 3: Reprice the first-wave goods catalogue to the China 2019 ladder**

```ts
// src/data/goods.ts
{ id: 3, key: 'coal', name: '煤炭', category: 'raw', tier: 0, basePrice: 160, priceElasticity: -0.18, incomeElasticity: 0.25, isConsumerGood: false, unit: '吨', description: '用于炼钢和发电的煤炭' },
{ id: 4, key: 'crude_oil', name: '原油', category: 'raw', tier: 0, basePrice: 210, priceElasticity: -0.22, incomeElasticity: 0.35, isConsumerGood: false, unit: '桶', description: '石油化工的基础原料' },
{ id: 5, key: 'natural_gas', name: '天然气', category: 'raw', tier: 0, basePrice: 150, priceElasticity: -0.20, incomeElasticity: 0.30, isConsumerGood: false, unit: '立方米', description: '清洁能源和化工原料' },

{ id: 18, key: 'steel', name: '钢材', category: 'basic', tier: 1, basePrice: 520, priceElasticity: -0.35, incomeElasticity: 0.55, isConsumerGood: false, unit: '吨', description: '工业生产的核心材料' },
{ id: 21, key: 'fuel', name: '燃油', category: 'basic', tier: 1, basePrice: 320, priceElasticity: -0.35, incomeElasticity: 0.45, isConsumerGood: true, unit: '升', description: '汽车和机械用燃料' },
{ id: 22, key: 'plastic', name: '塑料', category: 'basic', tier: 1, basePrice: 260, priceElasticity: -0.45, incomeElasticity: 0.55, isConsumerGood: false, unit: '吨', description: '广泛使用的合成材料' },
{ id: 23, key: 'chemicals', name: '化学品', category: 'basic', tier: 1, basePrice: 300, priceElasticity: -0.35, incomeElasticity: 0.55, isConsumerGood: false, unit: '吨', description: '工业用化学品' },
{ id: 24, key: 'glass', name: '玻璃', category: 'basic', tier: 1, basePrice: 180, priceElasticity: -0.28, incomeElasticity: 0.40, isConsumerGood: false, unit: '平方米', description: '建筑和电子产品用玻璃' },
{ id: 25, key: 'cement', name: '水泥', category: 'basic', tier: 1, basePrice: 95, priceElasticity: -0.22, incomeElasticity: 0.25, isConsumerGood: false, unit: '吨', description: '建筑业的基础材料' },

{ id: 36, key: 'electronics', name: '电子元件', category: 'intermediate', tier: 2, basePrice: 900, priceElasticity: -0.55, incomeElasticity: 0.90, isConsumerGood: false, unit: '件', description: '电子产品的核心组件' },
{ id: 37, key: 'chips', name: '芯片', category: 'intermediate', tier: 2, basePrice: 2200, priceElasticity: -0.35, incomeElasticity: 1.10, isConsumerGood: false, unit: '片', description: '高科技产品的大脑' },
{ id: 46, key: 'building_materials', name: '建筑材料', category: 'intermediate', tier: 2, basePrice: 160, priceElasticity: -0.35, incomeElasticity: 0.40, isConsumerGood: false, unit: '吨', description: '建筑施工用材料包' },
{ id: 47, key: 'packaging', name: '包装材料', category: 'intermediate', tier: 2, basePrice: 60, priceElasticity: -0.45, incomeElasticity: 0.35, isConsumerGood: false, unit: '套', description: '产品包装用材料' },
{ id: 53, key: 'beverages', name: '饮料', category: 'intermediate', tier: 2, basePrice: 8, priceElasticity: -0.35, incomeElasticity: 0.30, isConsumerGood: true, unit: '瓶', description: '各类饮品' },

{ id: 56, key: 'smartphone', name: '智能手机', category: 'final', tier: 3, basePrice: 3600, priceElasticity: -1.20, incomeElasticity: 1.50, isConsumerGood: true, unit: '台', description: '智能手机' },
{ id: 57, key: 'computer', name: '电脑', category: 'final', tier: 3, basePrice: 5200, priceElasticity: -1.00, incomeElasticity: 1.30, isConsumerGood: true, unit: '台', description: '个人和办公计算设备' },
{ id: 58, key: 'appliances', name: '家电', category: 'final', tier: 3, basePrice: 2600, priceElasticity: -0.85, incomeElasticity: 1.15, isConsumerGood: true, unit: '台', description: '家用电器' },
{ id: 60, key: 'car', name: '燃油汽车', category: 'final', tier: 3, basePrice: 98_000, priceElasticity: -1.10, incomeElasticity: 1.70, isConsumerGood: true, unit: '辆', description: '传统燃油汽车' },
{ id: 61, key: 'electric_car', name: '电动汽车', category: 'final', tier: 3, basePrice: 128_000, priceElasticity: -1.20, incomeElasticity: 1.90, isConsumerGood: true, unit: '辆', description: '新能源电动汽车' },
{ id: 63, key: 'clothing', name: '服装', category: 'final', tier: 3, basePrice: 140, priceElasticity: -0.75, incomeElasticity: 0.85, isConsumerGood: true, unit: '件', description: '日常穿着的服装' },
{ id: 64, key: 'food', name: '食品', category: 'final', tier: 3, basePrice: 18, priceElasticity: -0.18, incomeElasticity: 0.22, isConsumerGood: true, unit: '份', description: '日常消费食品' },
{ id: 66, key: 'electricity', name: '电力', category: 'final', tier: 3, basePrice: 0.68, priceElasticity: -0.10, incomeElasticity: 0.12, isConsumerGood: true, isService: true, unit: '度', description: '工业和民用电力' },
{ id: 71, key: 'generic_drug', name: '仿制药', category: 'final', tier: 3, basePrice: 36, priceElasticity: -0.16, incomeElasticity: 0.18, isConsumerGood: true, unit: '盒', description: '普通仿制药品' },
{ id: 73, key: 'otc_drug', name: '非处方药', category: 'final', tier: 3, basePrice: 28, priceElasticity: -0.20, incomeElasticity: 0.20, isConsumerGood: true, unit: '盒', description: 'OTC药品' },
{ id: 75, key: 'jewelry', name: '珠宝', category: 'final', tier: 3, basePrice: 28_000, priceElasticity: -2.40, incomeElasticity: 3.20, isConsumerGood: true, unit: '件', description: '贵金属和宝石饰品' },
```

- [ ] **Step 4: Run the targeted regressions and verify the new baseline passes**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts -t "preserves the intended price and elasticity ladder"`
Expected: PASS for the price ladder assertions. The macro-default and starter-credit checks remain intentionally red until Task 5 updates `BalanceConfig.ts` and `BankingSystem.ts`.

- [ ] **Step 5: Commit the constant and goods recalibration**

```bash
git add src/core/constants.ts src/data/goods.ts
git commit -m "feat: recalibrate china 2019 goods and constants"
```

### Task 3: Rebalance Heavy Industry Throughput And Operating Costs

**Files:**
- Modify: `src/data/buildings.ts`
- Test: `src/data/__tests__/china2019Calibration.test.ts`
- Test: `src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`

- [ ] **Step 1: Re-run the heavy-industry regressions**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts -t "keeps heavy industry bulk throughput above advanced manufacturing" src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`
Expected: FAIL because steel throughput and heavy-industry operating-cost profiles are still tuned to the old lighter sandbox.

- [ ] **Step 2: Update extraction and upstream utility buildings to China 2019 scale**

```ts
// src/data/buildings.ts
{
  id: 3,
  key: 'coal_mine',
  name: '煤矿',
  category: 'extraction',
  buildCost: 1_500_000,
  buildTime: 45,
  maintenanceCost: 3_500,
  laborCost: 12_000,
  energyCost: 5_000,
  powerConsumption: 24,
  maxLevel: 5,
  upgradeCosts: [0, 600_000, 1_200_000, 2_400_000, 4_800_000],
  capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.2],
  efficiencyMultipliers: [1.0, 1.08, 1.16, 1.24, 1.32],
  production: {
    inputs: [],
    outputs: [{ goodsId: GoodsId.COAL, amount: 260 }],
    ticksRequired: 1,
    laborRequired: 75,
    energyRequired: 420,
  },
  description: '开采煤炭的矿场',
},
{
  id: 4,
  key: 'oil_field',
  name: '油田',
  category: 'extraction',
  buildCost: 8_500_000,
  buildTime: 120,
  maintenanceCost: 28_000,
  laborCost: 42_000,
  energyCost: 24_000,
  powerConsumption: 85,
  maxLevel: 5,
  upgradeCosts: [0, 3_400_000, 6_800_000, 13_600_000, 27_200_000],
  capacityMultipliers: [1.0, 1.2, 1.45, 1.75, 2.1],
  efficiencyMultipliers: [1.0, 1.07, 1.14, 1.21, 1.28],
  production: {
    inputs: [],
    outputs: [{ goodsId: GoodsId.CRUDE_OIL, amount: 180 }],
    ticksRequired: 1,
    laborRequired: 70,
    energyRequired: 650,
  },
  description: '开采原油的油田',
},
{
  id: 5,
  key: 'gas_field',
  name: '气田',
  category: 'extraction',
  buildCost: 7_200_000,
  buildTime: 105,
  maintenanceCost: 22_000,
  laborCost: 36_000,
  energyCost: 18_000,
  powerConsumption: 72,
  maxLevel: 5,
  upgradeCosts: [0, 2_880_000, 5_760_000, 11_520_000, 23_040_000],
  capacityMultipliers: [1.0, 1.2, 1.45, 1.75, 2.1],
  efficiencyMultipliers: [1.0, 1.07, 1.14, 1.21, 1.28],
  production: {
    inputs: [],
    outputs: [{ goodsId: GoodsId.NATURAL_GAS, amount: 210 }],
    ticksRequired: 1,
    laborRequired: 60,
    energyRequired: 540,
  },
  description: '开采天然气的气田',
},
{
  id: 39,
  key: 'power_plant',
  name: '发电厂',
  category: 'service',
  buildCost: 36_000_000,
  buildTime: 210,
  maintenanceCost: 110_000,
  laborCost: 90_000,
  energyCost: 0,
  powerConsumption: 0,
  maxLevel: 5,
  upgradeCosts: [0, 14_400_000, 28_800_000, 57_600_000, 115_200_000],
  capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
  efficiencyMultipliers: [1.0, 1.05, 1.1, 1.18, 1.26],
  production: {
    inputs: [{ goodsId: GoodsId.COAL, amount: 320 }],
    outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 40_000 }],
    ticksRequired: 1,
    laborRequired: 110,
    energyRequired: 0,
    outputModes: [
      {
        modeId: 0,
        name: '燃煤发电',
        inputs: [{ goodsId: GoodsId.COAL, amount: 320 }],
        outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 40_000 }],
        ticksRequired: 1,
        laborRequired: 110,
        energyRequired: 0,
      },
      {
        modeId: 1,
        name: '燃气发电',
        inputs: [{ goodsId: GoodsId.NATURAL_GAS, amount: 260 }],
        outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 32_000 }],
        ticksRequired: 1,
        laborRequired: 95,
        energyRequired: 0,
      },
      {
        modeId: 2,
        name: '光伏并网',
        inputs: [{ goodsId: GoodsId.SOLAR_SYSTEM, amount: 1 }, { goodsId: GoodsId.ENERGY_STORAGE, amount: 1 }],
        outputs: [{ goodsId: GoodsId.ELECTRICITY, amount: 9_000 }],
        ticksRequired: 1,
        laborRequired: 45,
        energyRequired: 0,
      },
    ],
  },
  description: '提供大规模基础电力的发电厂',
},
```

- [ ] **Step 3: Update heavy processing plants so materials stay cheap, bulky, and power-hungry**

```ts
// src/data/buildings.ts
{
  id: 16,
  key: 'steel_mill',
  name: '钢铁厂',
  category: 'processing',
  buildCost: 18_000_000,
  buildTime: 150,
  maintenanceCost: 45_000,
  laborCost: 85_000,
  energyCost: 110_000,
  powerConsumption: 220,
  maxLevel: 5,
  upgradeCosts: [0, 7_200_000, 14_400_000, 28_800_000, 57_600_000],
  capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
  efficiencyMultipliers: [1.0, 1.06, 1.12, 1.18, 1.24],
  production: {
    inputs: [{ goodsId: GoodsId.IRON_ORE, amount: 180 }, { goodsId: GoodsId.COAL, amount: 120 }],
    outputs: [{ goodsId: GoodsId.STEEL, amount: 280 }],
    ticksRequired: 2,
    laborRequired: 160,
    energyRequired: 2_200,
  },
  description: '将铁矿石加工成钢材',
},
{
  id: 19,
  key: 'chemical_plant',
  name: '化工厂',
  category: 'processing',
  buildCost: 16_000_000,
  buildTime: 132,
  maintenanceCost: 38_000,
  laborCost: 52_000,
  energyCost: 96_000,
  powerConsumption: 180,
  maxLevel: 5,
  upgradeCosts: [0, 6_400_000, 12_800_000, 25_600_000, 51_200_000],
  capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
  efficiencyMultipliers: [1.0, 1.06, 1.12, 1.18, 1.24],
  production: {
    inputs: [{ goodsId: GoodsId.CRUDE_OIL, amount: 120 }, { goodsId: GoodsId.NATURAL_GAS, amount: 60 }],
    outputs: [{ goodsId: GoodsId.CHEMICALS, amount: 180 }],
    ticksRequired: 2,
    laborRequired: 110,
    energyRequired: 1_800,
  },
  description: '生产基础化工品',
},
{
  id: 20,
  key: 'glass_factory',
  name: '玻璃厂',
  category: 'processing',
  buildCost: 9_000_000,
  buildTime: 96,
  maintenanceCost: 18_000,
  laborCost: 28_000,
  energyCost: 54_000,
  powerConsumption: 120,
  maxLevel: 5,
  upgradeCosts: [0, 3_600_000, 7_200_000, 14_400_000, 28_800_000],
  capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.1],
  efficiencyMultipliers: [1.0, 1.07, 1.14, 1.21, 1.28],
  production: {
    inputs: [{ goodsId: GoodsId.SILICON, amount: 180 }],
    outputs: [{ goodsId: GoodsId.GLASS, amount: 240 }],
    ticksRequired: 2,
    laborRequired: 80,
    energyRequired: 1_200,
  },
  description: '生产建筑和工业玻璃',
},
{
  id: 21,
  key: 'cement_factory',
  name: '水泥厂',
  category: 'processing',
  buildCost: 10_500_000,
  buildTime: 108,
  maintenanceCost: 21_000,
  laborCost: 34_000,
  energyCost: 70_000,
  powerConsumption: 140,
  maxLevel: 5,
  upgradeCosts: [0, 4_200_000, 8_400_000, 16_800_000, 33_600_000],
  capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.1],
  efficiencyMultipliers: [1.0, 1.07, 1.14, 1.21, 1.28],
  production: {
    inputs: [{ goodsId: GoodsId.SILICON, amount: 140 }, { goodsId: GoodsId.COAL, amount: 90 }],
    outputs: [{ goodsId: GoodsId.CEMENT, amount: 420 }],
    ticksRequired: 2,
    laborRequired: 95,
    energyRequired: 1_500,
  },
  description: '生产水泥',
},
```

- [ ] **Step 4: Run the heavy-industry suites and verify they pass**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts -t "keeps heavy industry bulk throughput above advanced manufacturing" src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`
Expected: PASS for the throughput and production-shape assertions covering steel versus chips. The infrastructure-versus-retail construction check is completed in Task 4.

- [ ] **Step 5: Commit the heavy-industry rebalance**

```bash
git add src/data/buildings.ts
git commit -m "feat: rebalance china 2019 heavy industry data"
```

### Task 4: Rebalance Manufacturing, Retail Capex, And Construction Materials

**Files:**
- Modify: `src/data/buildings.ts`
- Modify: `src/data/buildingMaterials.ts`
- Test: `src/data/__tests__/china2019Calibration.test.ts`
- Test: `src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`

- [ ] **Step 1: Re-run the manufacturing and construction regressions**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`
Expected: FAIL because the semiconductor fab, electronics factory, car factory, and convenience store still sit too close together on capex and build-material depth.

- [ ] **Step 2: Reprice manufacturing and retail building definitions**

```ts
// src/data/buildings.ts
{
  id: 24,
  key: 'food_factory',
  name: '食品厂',
  category: 'processing',
  buildCost: 3_500_000,
  buildTime: 60,
  maintenanceCost: 7_000,
  laborCost: 22_000,
  energyCost: 8_000,
  powerConsumption: 28,
  maxLevel: 5,
  upgradeCosts: [0, 1_400_000, 2_800_000, 5_600_000, 11_200_000],
  capacityMultipliers: [1.0, 1.25, 1.5, 1.8, 2.1],
  efficiencyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
  production: {
    inputs: [{ goodsId: GoodsId.GRAIN, amount: 260 }],
    outputs: [{ goodsId: GoodsId.PROCESSED_FOOD, amount: 220 }],
    ticksRequired: 1,
    laborRequired: 75,
    energyRequired: 420,
    outputModes: [
      {
        modeId: 0,
        name: '加工食品',
        inputs: [{ goodsId: GoodsId.GRAIN, amount: 260 }],
        outputs: [{ goodsId: GoodsId.PROCESSED_FOOD, amount: 220 }],
        ticksRequired: 1,
        laborRequired: 75,
        energyRequired: 420,
      },
      {
        modeId: 1,
        name: '饮料灌装',
        inputs: [{ goodsId: GoodsId.GRAIN, amount: 80 }, { goodsId: GoodsId.PACKAGING, amount: 120 }],
        outputs: [{ goodsId: GoodsId.BEVERAGES, amount: 240 }],
        ticksRequired: 1,
        laborRequired: 70,
        energyRequired: 360,
      },
      {
        modeId: 2,
        name: '零食加工',
        inputs: [{ goodsId: GoodsId.PROCESSED_FOOD, amount: 140 }, { goodsId: GoodsId.PACKAGING, amount: 90 }],
        outputs: [{ goodsId: GoodsId.SNACKS, amount: 180 }],
        ticksRequired: 1,
        laborRequired: 65,
        energyRequired: 320,
      },
    ],
  },
  description: '生产大众消费食品',
},
{
  id: 27,
  key: 'electronics_factory',
  name: '电子厂',
  category: 'manufacturing',
  buildCost: 12_000_000,
  buildTime: 180,
  maintenanceCost: 28_000,
  laborCost: 95_000,
  energyCost: 45_000,
  powerConsumption: 110,
  maxLevel: 5,
  upgradeCosts: [0, 4_800_000, 9_600_000, 19_200_000, 38_400_000],
  capacityMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0],
  efficiencyMultipliers: [1.0, 1.08, 1.16, 1.24, 1.32],
  production: {
    inputs: [{ goodsId: GoodsId.COPPER, amount: 60 }, { goodsId: GoodsId.PLASTIC, amount: 45 }, { goodsId: GoodsId.CHIPS, amount: 6 }],
    outputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 60 }],
    ticksRequired: 2,
    laborRequired: 150,
    energyRequired: 900,
    outputModes: [
      {
        modeId: 0,
        name: '电子元件',
        inputs: [{ goodsId: GoodsId.COPPER, amount: 60 }, { goodsId: GoodsId.PLASTIC, amount: 45 }, { goodsId: GoodsId.CHIPS, amount: 6 }],
        outputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 60 }],
        ticksRequired: 2,
        laborRequired: 150,
        energyRequired: 900,
      },
      {
        modeId: 1,
        name: '智能手机',
        inputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 36 }, { goodsId: GoodsId.CHIPS, amount: 18 }, { goodsId: GoodsId.SCREEN, amount: 18 }, { goodsId: GoodsId.PACKAGING, amount: 18 }],
        outputs: [{ goodsId: GoodsId.SMARTPHONE, amount: 18 }],
        ticksRequired: 2,
        laborRequired: 130,
        energyRequired: 760,
      },
      {
        modeId: 2,
        name: '电脑整机',
        inputs: [{ goodsId: GoodsId.ELECTRONICS, amount: 48 }, { goodsId: GoodsId.CHIPS, amount: 12 }, { goodsId: GoodsId.SCREEN, amount: 10 }, { goodsId: GoodsId.PLASTIC, amount: 14 }],
        outputs: [{ goodsId: GoodsId.COMPUTER, amount: 8 }],
        ticksRequired: 3,
        laborRequired: 140,
        energyRequired: 820,
      },
    ],
  },
  description: '生产电子元件与整机产品',
},
{
  id: 28,
  key: 'semiconductor_fab',
  name: '半导体厂',
  category: 'manufacturing',
  buildCost: 65_000_000,
  buildTime: 300,
  maintenanceCost: 150_000,
  laborCost: 180_000,
  energyCost: 140_000,
  powerConsumption: 260,
  maxLevel: 5,
  upgradeCosts: [0, 26_000_000, 52_000_000, 104_000_000, 208_000_000],
  capacityMultipliers: [1.0, 1.12, 1.25, 1.4, 1.6],
  efficiencyMultipliers: [1.0, 1.05, 1.1, 1.16, 1.22],
  production: {
    inputs: [{ goodsId: GoodsId.SILICON, amount: 60 }, { goodsId: GoodsId.RARE_EARTH, amount: 12 }, { goodsId: GoodsId.CHEMICALS, amount: 30 }],
    outputs: [{ goodsId: GoodsId.CHIPS, amount: 18 }],
    ticksRequired: 6,
    laborRequired: 220,
    energyRequired: 2_600,
  },
  description: '生产芯片的高资本密度工厂',
},
{
  id: 34,
  key: 'car_factory',
  name: '汽车工厂',
  category: 'manufacturing',
  buildCost: 28_000_000,
  buildTime: 210,
  maintenanceCost: 62_000,
  laborCost: 130_000,
  energyCost: 58_000,
  powerConsumption: 150,
  maxLevel: 5,
  upgradeCosts: [0, 11_200_000, 22_400_000, 44_800_000, 89_600_000],
  capacityMultipliers: [1.0, 1.15, 1.3, 1.5, 1.75],
  efficiencyMultipliers: [1.0, 1.06, 1.12, 1.18, 1.24],
  production: {
    inputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 36 }, { goodsId: GoodsId.ELECTRONICS, amount: 18 }, { goodsId: GoodsId.RUBBER, amount: 12 }, { goodsId: GoodsId.GLASS, amount: 14 }],
    outputs: [{ goodsId: GoodsId.CAR, amount: 2 }],
    ticksRequired: 5,
    laborRequired: 260,
    energyRequired: 1_400,
    outputModes: [
      {
        modeId: 0,
        name: '燃油汽车',
        inputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 36 }, { goodsId: GoodsId.ELECTRONICS, amount: 18 }, { goodsId: GoodsId.RUBBER, amount: 12 }, { goodsId: GoodsId.GLASS, amount: 14 }],
        outputs: [{ goodsId: GoodsId.CAR, amount: 2 }],
        ticksRequired: 5,
        laborRequired: 260,
        energyRequired: 1_400,
      },
      {
        modeId: 1,
        name: '电动汽车',
        inputs: [{ goodsId: GoodsId.CAR_PARTS, amount: 28 }, { goodsId: GoodsId.ELECTRONICS, amount: 22 }, { goodsId: GoodsId.BATTERY, amount: 10 }, { goodsId: GoodsId.CHIPS, amount: 8 }],
        outputs: [{ goodsId: GoodsId.ELECTRIC_CAR, amount: 1 }],
        ticksRequired: 6,
        laborRequired: 250,
        energyRequired: 1_350,
      },
    ],
  },
  description: '生产整车产品的总装工厂',
},
{
  id: 40,
  key: 'convenience_store',
  name: '便利店',
  category: 'retail',
  buildCost: 1_800_000,
  buildTime: 30,
  maintenanceCost: 4_500,
  laborCost: 16_000,
  energyCost: 3_800,
  powerConsumption: 16,
  maxLevel: 5,
  upgradeCosts: [0, 720_000, 1_440_000, 2_880_000, 5_760_000],
  capacityMultipliers: [1.0, 1.15, 1.3, 1.5, 1.75],
  efficiencyMultipliers: [1.0, 1.06, 1.12, 1.18, 1.24],
  production: {
    inputs: [],
    outputs: [],
    ticksRequired: 1,
    laborRequired: 0,
    energyRequired: 0,
  },
  retailConfig: {
    maxInventorySlots: 12,
    inventoryCapacity: 400,
    customerCapacity: 220,
    markupRange: [0.08, 0.22],
    allowedGoodsIds: [
      GoodsId.FOOD,
      GoodsId.BEVERAGES,
      GoodsId.SNACKS,
      GoodsId.PROCESSED_FOOD,
      GoodsId.CANNED_FOOD,
      GoodsId.FROZEN_FOOD,
      GoodsId.GENERIC_DRUG,
      GoodsId.OTC_DRUG,
      GoodsId.CLOTHING,
      GoodsId.PET_FOOD,
      GoodsId.ORGANIC_FOOD,
      GoodsId.APPLIANCES,
    ],
  },
  description: '面向居民日常消费的零售网点',
},
```

- [ ] **Step 3: Increase construction depth for fabs, power plants, and retail**

```ts
// src/data/buildingMaterials.ts
{
  buildingTypeId: BuildingId.SEMICONDUCTOR_FAB,
  baseMaterials: [
    { goodsId: GoodsId.STEEL, amount: 12_000 },
    { goodsId: GoodsId.CEMENT, amount: 8_000 },
    { goodsId: GoodsId.GLASS, amount: 4_500 },
    { goodsId: GoodsId.BUILDING_MATERIALS, amount: 3_600 },
    { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 1_200 },
    { goodsId: GoodsId.ELECTRONICS, amount: 3_600 },
    { goodsId: GoodsId.CHIPS, amount: 1_200 },
    { goodsId: GoodsId.CHEMICALS, amount: 800 },
    { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 90 },
  ],
  upgradeMaterials: [
    [],
    [{ goodsId: GoodsId.STEEL, amount: 3_600 }, { goodsId: GoodsId.ELECTRONICS, amount: 1_200 }],
    [{ goodsId: GoodsId.STEEL, amount: 7_200 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 30 }],
    [{ goodsId: GoodsId.STEEL, amount: 10_800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 60 }],
    [{ goodsId: GoodsId.STEEL, amount: 14_400 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 90 }],
  ],
  buildTime: 300,
  workers: 650,
},
{
  buildingTypeId: BuildingId.POWER_PLANT,
  baseMaterials: [
    { goodsId: GoodsId.STEEL, amount: 14_000 },
    { goodsId: GoodsId.CEMENT, amount: 11_000 },
    { goodsId: GoodsId.BUILDING_MATERIALS, amount: 4_200 },
    { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 1_100 },
    { goodsId: GoodsId.ELECTRONICS, amount: 500 },
    { goodsId: GoodsId.MECHANICAL_PARTS, amount: 1_200 },
    { goodsId: GoodsId.SOLAR_SYSTEM, amount: 12 },
    { goodsId: GoodsId.ENERGY_STORAGE, amount: 10 },
    { goodsId: GoodsId.COMPUTER, amount: 40 },
  ],
  upgradeMaterials: [
    [],
    [{ goodsId: GoodsId.STEEL, amount: 4_200 }, { goodsId: GoodsId.BUILDING_MATERIALS, amount: 1_200 }],
    [{ goodsId: GoodsId.STEEL, amount: 8_400 }, { goodsId: GoodsId.ELECTRONICS, amount: 280 }],
    [{ goodsId: GoodsId.STEEL, amount: 12_600 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 24 }],
    [{ goodsId: GoodsId.STEEL, amount: 16_800 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 48 }],
  ],
  buildTime: 210,
  workers: 260,
  isHazardous: true,
},
{
  buildingTypeId: BuildingId.CONVENIENCE_STORE,
  baseMaterials: [
    { goodsId: GoodsId.STEEL, amount: 180 },
    { goodsId: GoodsId.CEMENT, amount: 320 },
    { goodsId: GoodsId.GLASS, amount: 140 },
    { goodsId: GoodsId.BUILDING_MATERIALS, amount: 100 },
    { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 40 },
    { goodsId: GoodsId.ELECTRONICS, amount: 30 },
    { goodsId: GoodsId.FURNITURE, amount: 60 },
    { goodsId: GoodsId.APPLIANCES, amount: 8 },
  ],
  upgradeMaterials: [
    [],
    [{ goodsId: GoodsId.STEEL, amount: 60 }, { goodsId: GoodsId.BUILDING_MATERIALS, amount: 40 }],
    [{ goodsId: GoodsId.STEEL, amount: 120 }, { goodsId: GoodsId.ELECTRONICS, amount: 20 }],
    [{ goodsId: GoodsId.STEEL, amount: 180 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 1 }],
    [{ goodsId: GoodsId.STEEL, amount: 240 }, { goodsId: GoodsId.INDUSTRIAL_ROBOT, amount: 2 }],
  ],
  buildTime: 30,
  workers: 30,
},
```

- [ ] **Step 4: Run the manufacturing and construction regressions again**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts`
Expected: PASS for the fab-vs-steel capex gap, convenience-store construction weight, and production-mode shape assertions.

- [ ] **Step 5: Commit the downstream manufacturing and build-material rebalance**

```bash
git add src/data/buildings.ts src/data/buildingMaterials.ts
git commit -m "feat: rebalance china 2019 manufacturing and construction data"
```

### Task 5: Rebalance Household Tiers, Banking, Macro Events, And Bootstrap Values

**Files:**
- Modify: `src/core/economy/DemandCurve.ts`
- Modify: `src/core/balance/BalanceConfig.ts`
- Modify: `src/core/finance/BankingSystem.ts`
- Modify: `src/core/economy/BusinessCycle.ts`
- Modify: `src/core/world/WorldInitializer.ts`
- Test: `src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts`
- Test: `src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts`
- Test: `src/core/world/__tests__/WorldInitializer.coverage.test.ts`
- Test: `src/core/loop/__tests__/GameLoop.economyStability.test.ts`

- [ ] **Step 1: Re-run the demand, finance, and bootstrap regressions**

Run: `npx vitest run src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts src/core/world/__tests__/WorldInitializer.coverage.test.ts`
Expected: FAIL because consumer population is still `210_000_000`, balance defaults still use the old sandbox numbers, starter credit is still priced from a looser banking profile, and bootstrap inventories still match the lighter old construction ladder.

- [ ] **Step 2: Rebuild the consumer tiers around a China 2019 lower-middle-income majority**

```ts
// src/core/economy/DemandCurve.ts
export const CONSUMER_TIERS: ConsumerTier[] = [
  {
    id: 0,
    name: '极低收入层',
    population: 220_000_000,
    baseIncome: 1_200,
    incomeVariance: 0.12,
    savingsRate: 0.01,
    pricePreference: 0.96,
    qualityPreference: 0.04,
    budgetShares: new Map([['raw', 0.08], ['basic', 0.34], ['intermediate', 0.03], ['final', 0.55]]),
  },
  {
    id: 1,
    name: '低收入层',
    population: 300_000_000,
    baseIncome: 2_000,
    incomeVariance: 0.15,
    savingsRate: 0.03,
    pricePreference: 0.92,
    qualityPreference: 0.08,
    budgetShares: new Map([['raw', 0.06], ['basic', 0.30], ['intermediate', 0.04], ['final', 0.60]]),
  },
  {
    id: 2,
    name: '中低收入层',
    population: 310_000_000,
    baseIncome: 3_200,
    incomeVariance: 0.18,
    savingsRate: 0.06,
    pricePreference: 0.86,
    qualityPreference: 0.14,
    budgetShares: new Map([['raw', 0.04], ['basic', 0.26], ['intermediate', 0.06], ['final', 0.64]]),
  },
  {
    id: 3,
    name: '中等偏下层',
    population: 250_000_000,
    baseIncome: 4_800,
    incomeVariance: 0.22,
    savingsRate: 0.10,
    pricePreference: 0.72,
    qualityPreference: 0.28,
    budgetShares: new Map([['raw', 0.03], ['basic', 0.22], ['intermediate', 0.08], ['final', 0.67]]),
  },
  {
    id: 4,
    name: '中等收入层',
    population: 180_000_000,
    baseIncome: 7_200,
    incomeVariance: 0.26,
    savingsRate: 0.16,
    pricePreference: 0.58,
    qualityPreference: 0.42,
    budgetShares: new Map([['raw', 0.02], ['basic', 0.18], ['intermediate', 0.10], ['final', 0.70]]),
  },
  {
    id: 5,
    name: '中高收入层',
    population: 90_000_000,
    baseIncome: 11_000,
    incomeVariance: 0.30,
    savingsRate: 0.24,
    pricePreference: 0.42,
    qualityPreference: 0.58,
    budgetShares: new Map([['raw', 0.01], ['basic', 0.14], ['intermediate', 0.13], ['final', 0.72]]),
  },
  {
    id: 6,
    name: '高收入层',
    population: 35_000_000,
    baseIncome: 18_000,
    incomeVariance: 0.36,
    savingsRate: 0.32,
    pricePreference: 0.25,
    qualityPreference: 0.75,
    budgetShares: new Map([['raw', 0.01], ['basic', 0.10], ['intermediate', 0.15], ['final', 0.74]]),
  },
  {
    id: 7,
    name: '富裕阶层',
    population: 15_000_000,
    baseIncome: 35_000,
    incomeVariance: 0.42,
    savingsRate: 0.42,
    pricePreference: 0.10,
    qualityPreference: 0.90,
    budgetShares: new Map([['raw', 0.005], ['basic', 0.08], ['intermediate', 0.17], ['final', 0.745]]),
  },
];

function getPerCapitaConsumption(goods: GoodsDefinition, tier: ConsumerTier): number {
  const baseRates: Record<string, number> = {
    food: 4.5,
    beverages: 6.5,
    clothing: 0.18,
    processed_food: 2.8,
    fuel: 12,
    electricity: 75,
    smartphone: 0.018,
    computer: 0.006,
    appliances: 0.004,
    furniture: 0.0025,
    car: 0.00045,
    electric_car: 0.00012,
    snacks: 0.55,
    meat: 1.2,
    dairy: 0.9,
    frozen_food: 0.35,
    canned_food: 0.25,
    generic_drug: 0.08,
    otc_drug: 0.05,
    pet_food: 0.08,
    organic_food: 0.05,
    jewelry: 0.00005,
  };

  const baseRate = baseRates[goods.key] ?? (goods.isConsumerGood ? 0.02 : 0.002);

  if (goods.incomeElasticity >= 1.5) {
    return Math.max(0.00001, baseRate * Math.pow(Math.max(tier.baseIncome / 7_200, 0.2), 1.1));
  }

  if (goods.incomeElasticity <= 0.3) {
    return baseRate * (0.9 + tier.baseIncome / 60_000);
  }

  return baseRate * (0.75 + tier.baseIncome / 25_000);
}
```

- [ ] **Step 3: Align balance defaults and banking spreads with the new macro baseline**

```ts
// src/core/balance/BalanceConfig.ts
import {
  BASE_INTEREST_RATE,
  INITIAL_GDP,
  INITIAL_POPULATION,
  PLAYER_CREDIT_LIMIT,
  PLAYER_CREDIT_RATE,
  PLAYER_INITIAL_CASH,
  TARGET_INFLATION,
} from '@/core/constants';

const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  initialCash: PLAYER_INITIAL_CASH,
  creditLimit: PLAYER_CREDIT_LIMIT,
  creditRate: PLAYER_CREDIT_RATE,
  initialReputation: 50,
};

const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  initialGDP: INITIAL_GDP,
  initialPopulation: INITIAL_POPULATION,
  targetInflation: TARGET_INFLATION,
  baseInterestRate: BASE_INTEREST_RATE,
  businessCycleAmplitude: 0.08,
};

export const PLAYER_CONFIG_META: ConfigFieldMeta[] = [
  { key: 'initialCash', label: '初始现金', description: '玩家开始游戏时的现金', min: 5_000_000, max: 50_000_000, step: 1_000_000, format: 'currency' },
  { key: 'creditLimit', label: '信用额度', description: '玩家可获得的最大贷款额度', min: 5_000_000, max: 40_000_000, step: 1_000_000, format: 'currency' },
  { key: 'creditRate', label: '贷款利率', description: '玩家贷款的年化利率', min: 0.03, max: 0.09, step: 0.001, format: 'percent' },
  { key: 'initialReputation', label: '初始声望', description: '玩家开始游戏时的声望值', min: 0, max: 100, step: 5, format: 'number' },
];

export const ECONOMY_CONFIG_META: ConfigFieldMeta[] = [
  { key: 'initialGDP', label: '初始GDP', description: '游戏开始时的经济规模', min: 20_000_000_000_000, max: 150_000_000_000_000, step: 5_000_000_000_000, format: 'currency' },
  { key: 'initialPopulation', label: '初始人口', description: '游戏开始时的人口数量', min: 500_000_000, max: 2_000_000_000, step: 50_000_000, format: 'number' },
  { key: 'targetInflation', label: '目标通胀率', description: '央行目标通胀率', min: 0.01, max: 0.06, step: 0.001, format: 'percent' },
  { key: 'baseInterestRate', label: '基准利率', description: '央行基准利率', min: 0.02, max: 0.08, step: 0.001, format: 'percent' },
  { key: 'businessCycleAmplitude', label: '经济周期振幅', description: '经济周期波动的幅度', min: 0.05, max: 0.15, step: 0.01, format: 'percent' },
];
```

```ts
// src/core/finance/BankingSystem.ts
let bankingState: BankingState = {
  loans: new Map(),
  creditProfiles: new Map(),
  nextLoanId: 1,
  baseInterestRate: 0.043,
  reserveRate: 0.13,
  totalDeposits: 2_400_000_000_000,
  totalLoansOutstanding: 0,
};

export function initializeBankingSystem(world: GameWorld): void {
  bankingState = {
    loans: new Map(),
    creditProfiles: new Map(),
    nextLoanId: 1,
    baseInterestRate: world.economyStats.interestRate,
    reserveRate: 0.13,
    totalDeposits: 2_400_000_000_000,
    totalLoansOutstanding: 0,
  };
}

function getCreditMultiplier(rating: CreditRating): number {
  const multipliers: Record<CreditRating, number> = {
    AAA: 2.6,
    AA: 2.2,
    A: 1.8,
    BBB: 1.4,
    BB: 1.0,
    B: 0.6,
    CCC: 0.25,
    D: 0,
  };

  return multipliers[rating];
}

function getLoanInterestRate(rating: CreditRating, loanType: LoanType, collateralRatio: number): number {
  const baseRate = bankingState.baseInterestRate;
  const ratingSpread: Record<CreditRating, number> = {
    AAA: 0.003,
    AA: 0.006,
    A: 0.010,
    BBB: 0.018,
    BB: 0.030,
    B: 0.045,
    CCC: 0.080,
    D: 0.150,
  };
  const termSpread: Record<LoanType, number> = {
    credit_line: 0.008,
    short_term: 0.004,
    medium_term: 0.010,
    long_term: 0.018,
  };

  const collateralDiscount = Math.min(collateralRatio * 0.01, 0.01);
  const rate = baseRate + ratingSpread[rating] + termSpread[loanType] - collateralDiscount;

  return Math.max(0.045, rate);
}
```

- [ ] **Step 4: Reweight macro events and startup bootstrap values, then verify the new profile**

```ts
// src/core/economy/BusinessCycle.ts
import { ALL_GOODS, GoodsId } from '@/data/goods';

{
  id: 2,
  name: '外需订单回暖',
  description: '外部订单回升，沿海制造和出口装配景气改善',
  type: 'positive',
  category: 'trade',
  effects: {
    gdpImpact: 0.012,
    inflationImpact: 0.003,
    unemploymentImpact: -0.004,
    interestRateImpact: 0,
    confidenceImpact: 9,
    duration: 540,
    goodsEffects: [
      { goodsId: GoodsId.ELECTRONICS, demandMultiplier: 1.12, priceMultiplier: 1.05 },
      { goodsId: GoodsId.SMARTPHONE, demandMultiplier: 1.15, priceMultiplier: 1.05 },
      { goodsId: GoodsId.APPLIANCES, demandMultiplier: 1.10, priceMultiplier: 1.04 },
    ],
  },
  probability: 0.00018,
  cooldown: 1_800,
},
{
  id: 4,
  name: '专项基建投资',
  description: '基建投资集中发力，建材和上游工业需求抬升',
  type: 'positive',
  category: 'fiscal',
  effects: {
    gdpImpact: 0.020,
    inflationImpact: 0.008,
    unemploymentImpact: -0.010,
    interestRateImpact: 0.001,
    confidenceImpact: 11,
    duration: 840,
    goodsEffects: [
      { goodsId: GoodsId.STEEL, demandMultiplier: 1.18, priceMultiplier: 1.08 },
      { goodsId: GoodsId.CEMENT, demandMultiplier: 1.22, priceMultiplier: 1.07 },
      { goodsId: GoodsId.BUILDING_MATERIALS, demandMultiplier: 1.16, priceMultiplier: 1.06 },
    ],
  },
  probability: 0.00014,
  cooldown: 2_160,
},
{
  id: 12,
  name: '外需走弱',
  description: '海外订单收缩，出口制造链承压',
  type: 'negative',
  category: 'trade',
  effects: {
    gdpImpact: -0.012,
    inflationImpact: -0.002,
    unemploymentImpact: 0.006,
    interestRateImpact: 0,
    confidenceImpact: -12,
    duration: 420,
    goodsEffects: [
      { goodsId: GoodsId.ELECTRONICS, demandMultiplier: 0.90, priceMultiplier: 0.96 },
      { goodsId: GoodsId.SMARTPHONE, demandMultiplier: 0.88, priceMultiplier: 0.95 },
      { goodsId: GoodsId.APPLIANCES, demandMultiplier: 0.92, priceMultiplier: 0.97 },
    ],
  },
  probability: 0.00016,
  cooldown: 1_080,
},
{
  id: 13,
  name: '信用边际收紧',
  description: '金融条件收紧，融资更贵，耐用品与地产链先降温',
  type: 'negative',
  category: 'monetary',
  effects: {
    gdpImpact: -0.010,
    inflationImpact: -0.003,
    unemploymentImpact: 0.004,
    interestRateImpact: 0.006,
    confidenceImpact: -18,
    duration: 300,
    goodsEffects: [
      { goodsId: GoodsId.CAR, demandMultiplier: 0.90, priceMultiplier: 0.97 },
      { goodsId: GoodsId.ELECTRIC_CAR, demandMultiplier: 0.86, priceMultiplier: 0.96 },
      { goodsId: GoodsId.BUILDING_MATERIALS, demandMultiplier: 0.92, priceMultiplier: 0.98 },
    ],
  },
  probability: 0.00020,
  cooldown: 900,
},
```

```ts
// src/core/world/WorldInitializer.ts
import { ALL_GOODS, GoodsId } from '@/data/goods';

const starterGoods = [
  { id: GoodsId.COAL, amount: 1_800 },
  { id: GoodsId.IRON_ORE, amount: 1_200 },
  { id: GoodsId.STEEL, amount: 300 },
  { id: GoodsId.CEMENT, amount: 600 },
  { id: GoodsId.BUILDING_MATERIALS, amount: 240 },
  { id: GoodsId.GRAIN, amount: 900 },
  { id: GoodsId.FUEL, amount: 600 },
];

const buildingMaterialsInit: Array<{ goodsId: number; amount: number }> = [
  { goodsId: GoodsId.STEEL, amount: 18_000 },
  { goodsId: GoodsId.CEMENT, amount: 12_000 },
  { goodsId: GoodsId.GLASS, amount: 6_000 },
  { goodsId: GoodsId.BUILDING_MATERIALS, amount: 9_000 },
  { goodsId: GoodsId.BUILDING_PRODUCTS, amount: 3_000 },
  { goodsId: GoodsId.MECHANICAL_PARTS, amount: 2_400 },
  { goodsId: GoodsId.FUEL, amount: 4_000 },
  { goodsId: GoodsId.PLASTIC, amount: 2_200 },
  { goodsId: GoodsId.ELECTRONICS, amount: 1_200 },
  { goodsId: GoodsId.SOLAR_SYSTEM, amount: 12 },
  { goodsId: GoodsId.ENERGY_STORAGE, amount: 8 },
  { goodsId: GoodsId.ELECTRIC_CAR, amount: 10 },
];
```

Run: `npx vitest run src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts src/core/world/__tests__/WorldInitializer.coverage.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts`
Expected: PASS, with the new consumer structure, baseline loan band, heavier startup inventories, and macro defaults all coexisting without destabilizing the day-based loop.

- [ ] **Step 5: Commit the demand, finance, and bootstrap recalibration**

```bash
git add src/core/economy/DemandCurve.ts src/core/balance/BalanceConfig.ts src/core/finance/BankingSystem.ts src/core/economy/BusinessCycle.ts src/core/world/WorldInitializer.ts
git commit -m "feat: calibrate china 2019 demand finance and bootstrap"
```

### Task 6: Full Regression And Build Verification

**Files:**
- Verify only: `src/data/goods.ts`
- Verify only: `src/data/buildings.ts`
- Verify only: `src/data/buildingMaterials.ts`
- Verify only: `src/core/constants.ts`
- Verify only: `src/core/balance/BalanceConfig.ts`
- Verify only: `src/core/economy/DemandCurve.ts`
- Verify only: `src/core/economy/BusinessCycle.ts`
- Verify only: `src/core/finance/BankingSystem.ts`
- Verify only: `src/core/world/WorldInitializer.ts`
- Verify only: `src/data/__tests__/china2019Calibration.test.ts`
- Verify only: `src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts`
- Verify only: `src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts`

- [ ] **Step 1: Run the focused China 2019 calibration suite**

Run: `npx vitest run src/data/__tests__/china2019Calibration.test.ts src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts`
Expected: PASS with all China-2019-specific price, demand, and macro baseline assertions green.

- [ ] **Step 2: Run the neighboring smoke tests that protect production and bootstrap behavior**

Run: `npx vitest run src/core/production/__tests__/ProductionMethods.buildingSpecific.test.ts src/core/world/__tests__/WorldInitializer.coverage.test.ts src/core/loop/__tests__/GameLoop.economyStability.test.ts`
Expected: PASS, confirming the data-only rebalance did not break production-mode lookup, startup coverage, or loop stability.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: PASS with TypeScript compilation and Vite bundling succeeding without any new type or import errors.

- [ ] **Step 4: Review the final diff to confirm the scope stayed data-only**

Run: `git diff --stat HEAD~6..HEAD`
Expected: Only the planned data/config/bootstrap files and the three new regression tests appear. No price-engine, order-matching, production-control, or new-system files should be present.

- [ ] **Step 5: Commit the verified calibration pass**

```bash
git add src/core/constants.ts src/data/goods.ts src/data/buildings.ts src/data/buildingMaterials.ts src/core/economy/DemandCurve.ts src/core/balance/BalanceConfig.ts src/core/finance/BankingSystem.ts src/core/economy/BusinessCycle.ts src/core/world/WorldInitializer.ts src/data/__tests__/china2019Calibration.test.ts src/core/economy/__tests__/DemandCurve.china2019Profile.test.ts src/core/balance/__tests__/BalanceConfig.china2019Baseline.test.ts
git commit -m "feat: ship china 2019 economy data recalibration"
```
