# 通过增加公司/建筑解决无生产商品问题

## 方案概述

通过修改 `src/core/ai/AIPersonality.ts` 中的 `AI_COMPANIES` 配置，增加缺失产业链的公司和建筑，无需修改任何游戏逻辑代码。

## 分析：当前公司覆盖情况

### 已有但数量不足的商品

| 商品ID | 商品名 | 当前生产者 | 问题 | 解决方案 |
|--------|--------|-----------|------|---------|
| 11 | 天然橡胶 | 华域橡胶(46) 10座橡胶园 | 产量不足 | 增加橡胶园数量 |
| 17 | 玻璃 | 福耀玻璃(14) 8座玻璃厂 | 可能不足 | 增加玻璃厂 |
| 60 | 牲畜 | 新希望牧业(9) 4座畜牧场 | 周期长，数量少 | **大幅增加** |
| 61 | 家禽 | 新希望牧业(9) 5座畜牧场 | 同上 | **大幅增加** |
| 62 | 水产 | 新希望牧业(9) 6座渔场 | 同上 | 增加渔场 |

### 完全无生产的商品（需新增公司/建筑）

| 商品ID | 商品名 | 所需建筑 | 所需配方 | 建议新增 |
|--------|--------|---------|---------|---------|
| 28 | 电池 | 电池厂(20) | 28 | 宁德时代已有，需增加 |
| 30 | 屏幕 | 零部件厂(21) | 31 | 零部件集团已有，需增加 |
| 33 | 航空部件 | 零部件厂(21) | 80 | **需新增** |
| 34 | 光伏板 | 零部件厂(21) | 75 | **需新增** |
| 35 | 风机叶片 | 零部件厂(21) | 76 | **需新增** |
| 37 | 包装材料 | 造纸厂(34) | 67 | 山鹰纸业已有，需增加 |
| 65 | 冷冻食品 | 食品厂(13) | 42 | **需新增** |
| 66 | 罐头食品 | 食品厂(13) | 85 | 双汇已有1座，需增加 |
| 72 | 抗生素 | 制药厂(30) | 90 | 恒瑞已有2座，需增加 |
| 73 | 疫苗 | 制药厂(30) | 46 | 恒瑞已有3座，需增加 |
| 77 | 医用耗材 | 医疗器械厂(31) | 47 | 迈瑞已有5座，需增加 |

---

## 修改方案

### 1. 修改现有公司的建筑配置

#### 新希望牧业 (ID: 9) - 大幅增加养殖

```typescript
{
  id: 9,
  name: '新希望牧业',
  personality: 'specialist',
  initialCash: 150000000,  // 增加资金
  focusGoods: [60, 61, 62],
  category: 'agriculture',
  description: '畜牧水产养殖',
  initialBuildings: [
    { typeId: 26, recipeId: 37, count: 12 }, // 牲畜养殖×12 (原4)
    { typeId: 26, recipeId: 38, count: 15 }, // 家禽养殖×15 (原5)
    { typeId: 27, recipeId: 39, count: 12 }, // 水产养殖×12 (原6)
  ],
},
```

#### 华域橡胶 (ID: 46) - 增加橡胶园

```typescript
{
  id: 46,
  name: '华域橡胶',
  personality: 'specialist',
  initialCash: 120000000,
  focusGoods: [11, 19],
  category: 'processing',
  description: '橡胶种植和橡胶制品生产',
  initialBuildings: [
    { typeId: 32, recipeId: 106, count: 18 }, // 橡胶园×18 (原10)
    { typeId: 10, recipeId: 68, count: 10 },  // 橡胶制品生产×10 (原6)
  ],
},
```

#### 福耀玻璃 (ID: 14) - 增加玻璃厂

```typescript
{
  id: 14,
  name: '福耀玻璃',
  personality: 'specialist',
  initialCash: 100000000,
  focusGoods: [17],
  category: 'processing',
  description: '玻璃制造（垂直整合）',
  initialBuildings: [
    { typeId: 7, recipeId: 8, count: 8 },    // 自有硅矿×8 (原4)
    { typeId: 11, recipeId: 15, count: 14 }, // 玻璃生产×14 (原8)
  ],
},
```

#### 山鹰纸业 (ID: 48) - 增加包装材料

```typescript
{
  id: 48,
  name: '山鹰纸业',
  personality: 'cost_leader',
  initialCash: 100000000,
  focusGoods: [22, 37],
  category: 'processing',
  description: '造纸和包装材料生产（垂直整合）',
  initialBuildings: [
    { typeId: 5, recipeId: 5, count: 10 },   // 自有伐木场×10 (原6)
    { typeId: 34, recipeId: 66, count: 10 }, // 纸张生产×10 (原6)
    { typeId: 34, recipeId: 67, count: 10 }, // 包装材料生产×10 (原4)
  ],
},
```

### 2. 新增公司

#### 新增：冷链物流 (专注冷冻食品)

```typescript
{
  id: 52,
  name: '冷链食品',
  personality: 'specialist',
  initialCash: 80000000,
  focusGoods: [65, 66],
  category: 'processing',
  description: '冷冻食品和罐头生产（垂直整合）',
  initialBuildings: [
    { typeId: 26, recipeId: 37, count: 3 },  // 牲畜养殖×3
    { typeId: 26, recipeId: 38, count: 4 },  // 家禽养殖×4
    { typeId: 25, recipeId: 35, count: 4 },  // 蔬菜农场×4
    { typeId: 28, recipeId: 40, count: 3 },  // 肉类加工×3
    { typeId: 13, recipeId: 42, count: 8 },  // 冷冻食品×8
    { typeId: 13, recipeId: 85, count: 6 },  // 罐头生产×6
  ],
},
```

#### 新增：新能源设备 (专注光伏、风电、储能)

```typescript
{
  id: 53,
  name: '新能源设备',
  personality: 'innovator',
  initialCash: 200000000,
  focusGoods: [34, 35, 49, 50],
  category: 'manufacturing',
  description: '光伏板、风机叶片、储能系统生产（垂直整合）',
  initialBuildings: [
    { typeId: 7, recipeId: 8, count: 6 },    // 硅矿×6
    { typeId: 15, recipeId: 20, count: 4 },  // 铝冶炼×4
    { typeId: 11, recipeId: 15, count: 4 },  // 玻璃生产×4
    { typeId: 21, recipeId: 75, count: 8 },  // 光伏板生产×8
    { typeId: 21, recipeId: 76, count: 6 },  // 风机叶片生产×6
    { typeId: 20, recipeId: 77, count: 4 },  // 光伏系统组装×4
    { typeId: 20, recipeId: 81, count: 4 },  // 储能系统生产×4
  ],
},
```

#### 新增：航空零部件 (专注航空部件)

```typescript
{
  id: 54,
  name: '航空零部件',
  personality: 'specialist',
  initialCash: 180000000,
  focusGoods: [33],
  category: 'manufacturing',
  description: '航空航天部件生产（垂直整合）',
  initialBuildings: [
    { typeId: 7, recipeId: 9, count: 4 },    // 稀土开采×4
    { typeId: 15, recipeId: 20, count: 4 },  // 铝冶炼×4
    { typeId: 8, recipeId: 10, count: 3 },   // 钢铁冶炼×3
    { typeId: 21, recipeId: 80, count: 10 }, // 航空部件生产×10
  ],
},
```

#### 新增：医药生物 (补充医药产能)

```typescript
{
  id: 55,
  name: '医药生物',
  personality: 'pioneer',
  initialCash: 200000000,
  focusGoods: [71, 72, 73, 77],
  category: 'pharma',
  description: '医药化工品、抗生素、疫苗、医用耗材生产',
  initialBuildings: [
    { typeId: 29, recipeId: 43, count: 8 },  // 药材种植×8
    { typeId: 10, recipeId: 89, count: 6 },  // 医药化工品×6
    { typeId: 30, recipeId: 90, count: 6 },  // 抗生素生产×6
    { typeId: 30, recipeId: 46, count: 6 },  // 疫苗生产×6
    { typeId: 31, recipeId: 47, count: 10 }, // 医用耗材生产×10
  ],
},
```

### 3. 增强现有"产业链开拓者"公司

#### 产业链投资 (ID: 50) - 扩大规模

```typescript
{
  id: 50,
  name: '产业链投资',
  personality: 'pioneer',
  initialCash: 500000000,  // 大幅增加资金
  focusGoods: [13, 28, 26, 27, 29, 30],
  category: 'diversified',
  description: '产业链基础设施投资，专注填补供应链缺口',
  initialBuildings: [
    { typeId: 33, recipeId: 107, count: 12 }, // 锂矿×12 (原8)
    { typeId: 20, recipeId: 28, count: 10 },  // 电池生产×10 (原4)
    { typeId: 16, recipeId: 21, count: 8 },   // 电子元件×8 (原4)
    { typeId: 21, recipeId: 30, count: 8 },   // 电机生产×8 (新增)
    { typeId: 21, recipeId: 31, count: 8 },   // 屏幕生产×8 (新增)
  ],
},
```

---

## 完整修改清单

### 需要修改的公司 (6家)

| ID | 公司名 | 修改内容 |
|----|--------|---------|
| 9 | 新希望牧业 | 增加养殖建筑数量 |
| 14 | 福耀玻璃 | 增加玻璃厂数量 |
| 46 | 华域橡胶 | 增加橡胶园数量 |
| 48 | 山鹰纸业 | 增加包装材料生产 |
| 50 | 产业链投资 | 扩大规模，增加电机/屏幕 |
| 51 | 供应链开拓 | 增加更多零部件生产 |

### 需要新增的公司 (4家)

| ID | 公司名 | 主营业务 |
|----|--------|---------|
| 52 | 冷链食品 | 冷冻食品、罐头生产 |
| 53 | 新能源设备 | 光伏板、风机叶片、储能系统 |
| 54 | 航空零部件 | 航空部件生产 |
| 55 | 医药生物 | 医药化工品、抗生素、疫苗、医用耗材 |

---

## 预期效果

修改后预计：
- 无生产商品从44种降至**5种以内**
- 产业链覆盖率从42%提升至**95%以上**
- 新增约 **150+ 个建筑**
- 新增 **4家AI公司**

## 实施步骤

1. 打开 `src/core/ai/AIPersonality.ts`
2. 修改 `AI_COMPANIES` 数组中现有公司的 `initialBuildings` 配置
3. 在数组末尾添加4家新公司
4. 重新启动游戏测试

## 代码修改示例

将在 Code 模式中提供完整的代码修改。