# 产业链建筑重新分配方案

## 一、问题诊断

### 1.1 当前产业链层级结构

根据 `goods.ts` 的定义，商品分为4个层级：

| 层级 | 类别 | 商品ID范围 | 商品数量 | 说明 |
|------|------|-----------|----------|------|
| Tier 0 | raw (原材料) | 0-13 + 扩展 | ~50种 | 矿石、农产品、能源 |
| Tier 1 | basic (基础材料) | 14-25 + 扩展 | ~30种 | 钢材、塑料、化学品 |
| Tier 2 | intermediate (中间产品) | 26-37 + 扩展 | ~40种 | 电子元件、零部件 |
| Tier 3 | final (最终产品) | 38-57 + 扩展 | ~110种 | 消费品、设备 |

### 1.2 关键瓶颈分析

通过分析配方依赖关系，发现以下常见瓶颈：

#### 1.2.1 核心原材料供应不足
```
铁矿石(0) → 钢材(14) → 所有金属制品
铜矿石(1) → 铜材(15) → 电子元件(26) → 所有电子产品
硅石(9) → 玻璃(17) + 芯片(27)
稀土(10) → 芯片(27) + 电机(29) + 特殊设备
化工原料(12) → 塑料(18) + 化学品(20) → 几乎所有产品
```

#### 1.2.2 中间产品产能不足
```
电子元件(26) - 被30+种最终产品依赖
芯片(27) - 被20+种高科技产品依赖
电池(28) - 电动车、手机、储能系统依赖
机械部件(31) - 机器人、工业设备依赖
汽车零部件(32) - 所有车辆依赖
```

#### 1.2.3 消费品供应缺口
```
食品(44) + 饮料(45) - 人口基础消费
服装(43) - 日常消费
药品(74,75,76) - 医疗消费
日化用品(111-115) - 日常消费
```

## 二、产能需求计算

### 2.1 供需平衡原则

**关键公式**：上游产能 ≥ 下游消耗总量 × 1.5（安全余量）

### 2.2 各层级建筑需求估算

| 产业类别 | 建筑类型ID | 建议数量 | 当前数量 | 差距 |
|----------|-----------|---------|---------|------|
| **原材料采掘** |
| 铁矿场 | 0 | 6-8 | 4 | +3 |
| 铜矿场 | 1 | 4-6 | 2 | +3 |
| 煤矿 | 2 | 4-5 | 2 | +2 |
| 油田 | 3 | 3-4 | 1 | +2 |
| 气田 | 4 | 3-4 | 2 | +1 |
| 伐木场 | 5 | 4-6 | 3 | +2 |
| 农场 | 6 | 6-8 | 4 | +3 |
| 硅石矿场 | 7 | 4-5 | 2 | +2 |
| **基础加工** |
| 钢铁厂 | 8 | 8-10 | 6 | +3 |
| 炼油厂 | 9 | 4-5 | 2 | +2 |
| 化工厂 | 10 | 6-8 | 4 | +3 |
| 玻璃厂 | 11 | 4-5 | 2 | +2 |
| 纺织厂 | 12 | 4-5 | 2 | +2 |
| 食品厂 | 13 | 6-8 | 4 | +3 |
| 水泥厂 | 14 | 4-6 | 4 | +1 |
| 铝冶炼厂 | 15 | 4-5 | 2 | +2 |
| **中间制造** |
| 电子厂 | 16 | 6-8 | 3 | +4 |
| 半导体厂 | 17 | 4-5 | 2 | +2 |
| 电池厂 | 20 | 4-5 | 2 | +2 |
| 零部件厂 | 21 | 6-8 | 4 | +3 |
| **最终制造** |
| 汽车工厂 | 18 | 3-4 | 2 | +1 |
| 家电厂 | 19 | 3-4 | 2 | +1 |
| 服装厂 | 44 | 4-5 | 3 | +1 |

## 三、重新设计的公司配置

### 3.1 设计原则

1. **垂直整合**：部分公司覆盖上下游，减少市场依赖
2. **产能冗余**：关键节点产能提升50%
3. **消费品优先**：确保人口消费需求
4. **建材充足**：支撑AI建造系统

### 3.2 重新设计的公司列表

#### A. 原材料采掘公司 (10家)

```typescript
// 1. 中钢矿业 - 铁矿+煤矿综合
{
  name: '中钢矿业',
  buildings: [
    { typeId: 0 },  // 铁矿场 x3
    { typeId: 0 },
    { typeId: 0 },
    { typeId: 2 },  // 煤矿 x2
    { typeId: 2 },
  ],
  outputGoods: [0, 3],  // 铁矿石、煤炭
}

// 2. 五矿铜业 - 铜矿专业
{
  name: '五矿铜业',
  buildings: [
    { typeId: 1 },  // 铜矿场 x4
    { typeId: 1 },
    { typeId: 1 },
    { typeId: 1 },
  ],
  outputGoods: [1],  // 铜矿石
}

// 3. 中石油 - 油气开采
{
  name: '中石油',
  buildings: [
    { typeId: 3 },  // 油田 x2
    { typeId: 3 },
    { typeId: 4 },  // 气田 x2
    { typeId: 4 },
  ],
  outputGoods: [4, 5],  // 原油、天然气
}

// 4. 林业集团 - 木材
{
  name: '林业集团',
  buildings: [
    { typeId: 5 },  // 伐木场 x5
    { typeId: 5 },
    { typeId: 5 },
    { typeId: 5 },
    { typeId: 5 },
  ],
  outputGoods: [6],  // 木材
}

// 5. 中粮集团 - 农业综合
{
  name: '中粮集团',
  buildings: [
    { typeId: 6 },  // 农场 x4
    { typeId: 6 },
    { typeId: 6 },
    { typeId: 6 },
    { typeId: 25 }, // 蔬菜农场 x2
    { typeId: 25 },
  ],
  outputGoods: [7, 8, 58, 59],  // 棉花、粮食、蔬菜、水果
}

// 6. 硅海矿业 - 硅石+稀土
{
  name: '硅海矿业',
  buildings: [
    { typeId: 7 },  // 硅石矿场 x4
    { typeId: 7 },
    { typeId: 7 },
    { typeId: 7 },
  ],
  outputGoods: [9, 10],  // 硅石、稀土
}

// 7. 新希望牧业 - 畜牧+水产
{
  name: '新希望牧业',
  buildings: [
    { typeId: 26 }, // 畜牧场 x3
    { typeId: 26 },
    { typeId: 26 },
    { typeId: 27 }, // 渔场 x2
    { typeId: 27 },
  ],
  outputGoods: [60, 61, 62],  // 牲畜、家禽、水产
}

// 8. 橡胶产业 - 橡胶+锂矿
{
  name: '橡胶产业',
  buildings: [
    { typeId: 40 }, // 橡胶园 x3
    { typeId: 40 },
    { typeId: 40 },
    { typeId: 41 }, // 锂矿场 x2
    { typeId: 41 },
  ],
  outputGoods: [11, 13],  // 天然橡胶、锂矿
}

// 9. 多金属矿业
{
  name: '多金属矿业',
  buildings: [
    { typeId: 67 }, // 多金属矿场 x3
    { typeId: 67 },
    { typeId: 67 },
    { typeId: 68 }, // 战略金属矿场 x2
    { typeId: 68 },
  ],
  outputGoods: [128, 129, 130, 131, 132, 133],
}

// 10. 经济作物种植
{
  name: '经济作物种植',
  buildings: [
    { typeId: 76 }, // 经济作物种植园 x4
    { typeId: 76 },
    { typeId: 76 },
    { typeId: 76 },
  ],
  outputGoods: [160, 161, 162, 163, 164, 165],
}
```

#### B. 基础加工公司 (12家)

```typescript
// 1. 宝钢集团 - 钢铁
{
  name: '宝钢集团',
  buildings: [
    { typeId: 8, recipeId: 10 },  // 钢铁厂-炼钢 x4
    { typeId: 8, recipeId: 10 },
    { typeId: 8, recipeId: 10 },
    { typeId: 8, recipeId: 10 },
  ],
  outputGoods: [14],  // 钢材
}

// 2. 江铜冶炼 - 铜材
{
  name: '江铜冶炼',
  buildings: [
    { typeId: 8, recipeId: 78 },  // 钢铁厂-铜冶炼 x3
    { typeId: 8, recipeId: 78 },
    { typeId: 8, recipeId: 78 },
  ],
  outputGoods: [15],  // 铜材
}

// 3. 中石化 - 炼油+化工
{
  name: '中石化',
  buildings: [
    { typeId: 9 },  // 炼油厂 x3
    { typeId: 9 },
    { typeId: 9 },
    { typeId: 10, recipeId: 13 }, // 化工厂-塑料 x2
    { typeId: 10, recipeId: 13 },
  ],
  outputGoods: [25, 12, 18],  // 燃油、化工原料、塑料
}

// 4. 万华化学 - 化学品
{
  name: '万华化学',
  buildings: [
    { typeId: 10, recipeId: 14 }, // 化工厂-化学品 x4
    { typeId: 10, recipeId: 14 },
    { typeId: 10, recipeId: 14 },
    { typeId: 10, recipeId: 14 },
  ],
  outputGoods: [20],  // 化学品
}

// 5. 福耀玻璃
{
  name: '福耀玻璃',
  buildings: [
    { typeId: 11 }, // 玻璃厂 x4
    { typeId: 11 },
    { typeId: 11 },
    { typeId: 11 },
  ],
  outputGoods: [17],  // 玻璃
}

// 6. 魏桥纺织
{
  name: '魏桥纺织',
  buildings: [
    { typeId: 12, recipeId: 16 }, // 纺织厂-纺织品 x3
    { typeId: 12, recipeId: 16 },
    { typeId: 12, recipeId: 16 },
    { typeId: 12, recipeId: 99 }, // 纺织厂-丝绸 x1
  ],
  outputGoods: [23, 92],  // 纺织品、丝绸
}

// 7. 海螺水泥
{
  name: '海螺水泥',
  buildings: [
    { typeId: 14 }, // 水泥厂 x5
    { typeId: 14 },
    { typeId: 14 },
    { typeId: 14 },
    { typeId: 14 },
  ],
  outputGoods: [21],  // 水泥
}

// 8. 中铝集团
{
  name: '中铝集团',
  buildings: [
    { typeId: 15, recipeId: 20 }, // 铝冶炼厂 x3
    { typeId: 15, recipeId: 20 },
    { typeId: 15, recipeId: 20 },
    { typeId: 15, recipeId: 102 }, // 铝土矿开采 x1
  ],
  outputGoods: [2, 16],  // 铝土矿、铝材
}

// 9. 双汇食品
{
  name: '双汇食品',
  buildings: [
    { typeId: 28 }, // 肉类加工厂 x4
    { typeId: 28 },
    { typeId: 28 },
    { typeId: 28 },
  ],
  outputGoods: [63, 64],  // 肉类、乳制品
}

// 10. 造纸集团
{
  name: '造纸集团',
  buildings: [
    { typeId: 42, recipeId: 66 }, // 造纸厂-纸张 x2
    { typeId: 42, recipeId: 66 },
    { typeId: 42, recipeId: 67 }, // 造纸厂-包装 x2
    { typeId: 42, recipeId: 67 },
  ],
  outputGoods: [22, 37],  // 纸张、包装材料
}

// 11. 橡胶工业
{
  name: '橡胶工业',
  buildings: [
    { typeId: 43 }, // 橡胶厂 x4
    { typeId: 43 },
    { typeId: 43 },
    { typeId: 43 },
  ],
  outputGoods: [19],  // 橡胶制品
}

// 12. 有色冶炼
{
  name: '有色冶炼',
  buildings: [
    { typeId: 69 }, // 有色金属冶炼厂 x4
    { typeId: 69 },
    { typeId: 69 },
    { typeId: 69 },
  ],
  outputGoods: [134, 135, 136, 137, 138, 139],
}
```

#### C. 电力与能源公司 (3家)

```typescript
// 1. 华能集团
{
  name: '华能集团',
  buildings: [
    { typeId: 24, recipeId: 32 }, // 发电厂-燃煤 x2
    { typeId: 24, recipeId: 32 },
    { typeId: 24, recipeId: 33 }, // 发电厂-燃气 x2
    { typeId: 24, recipeId: 33 },
  ],
  outputGoods: [57],  // 电力
}

// 2. 中核集团
{
  name: '中核集团',
  buildings: [
    { typeId: 80 }, // 铀矿场
    { typeId: 81 }, // 核燃料厂
    { typeId: 81 },
    { typeId: 82 }, // 核电设备厂
  ],
  outputGoods: [176, 177, 178, 179, 180, 181],
}

// 3. 新能源集团
{
  name: '新能源集团',
  buildings: [
    { typeId: 48 }, // 新能源设备厂 x3
    { typeId: 48 },
    { typeId: 48 },
    { typeId: 83 }, // 电力设备厂 x2
    { typeId: 83 },
  ],
  outputGoods: [34, 35, 49, 182, 183, 184, 185],
}
```

#### D. 电子与半导体公司 (5家)

```typescript
// 1. 立讯精密 - 电子元件
{
  name: '立讯精密',
  buildings: [
    { typeId: 16, recipeId: 21 }, // 电子厂-电子元件 x5
    { typeId: 16, recipeId: 21 },
    { typeId: 16, recipeId: 21 },
    { typeId: 16, recipeId: 21 },
    { typeId: 16, recipeId: 21 },
  ],
  outputGoods: [26],  // 电子元件
}

// 2. 中芯国际 - 芯片
{
  name: '中芯国际',
  buildings: [
    { typeId: 17 }, // 半导体厂 x4
    { typeId: 17 },
    { typeId: 17 },
    { typeId: 17 },
  ],
  outputGoods: [27],  // 芯片
}

// 3. 宁德时代 - 电池
{
  name: '宁德时代',
  buildings: [
    { typeId: 20, recipeId: 28 }, // 电池厂-电池 x3
    { typeId: 20, recipeId: 28 },
    { typeId: 20, recipeId: 28 },
    { typeId: 20, recipeId: 81 }, // 电池厂-储能 x2
    { typeId: 20, recipeId: 81 },
  ],
  outputGoods: [28, 50],  // 电池、储能系统
}

// 4. 零部件集团 - 机械+汽车零部件
{
  name: '零部件集团',
  buildings: [
    { typeId: 21, recipeId: 79 }, // 零部件厂-机械部件 x3
    { typeId: 21, recipeId: 79 },
    { typeId: 21, recipeId: 79 },
    { typeId: 21, recipeId: 29 }, // 零部件厂-汽车零部件 x3
    { typeId: 21, recipeId: 29 },
    { typeId: 21, recipeId: 29 },
  ],
  outputGoods: [31, 32],  // 机械部件、汽车零部件
}

// 5. 屏幕电机厂
{
  name: '屏幕电机厂',
  buildings: [
    { typeId: 21, recipeId: 30 }, // 零部件厂-电机 x3
    { typeId: 21, recipeId: 30 },
    { typeId: 21, recipeId: 30 },
    { typeId: 21, recipeId: 31 }, // 零部件厂-屏幕 x3
    { typeId: 21, recipeId: 31 },
    { typeId: 21, recipeId: 31 },
  ],
  outputGoods: [29, 30],  // 电机、屏幕
}
```

#### E. 消费电子与家电公司 (4家)

```typescript
// 1. 华为终端 - 手机
{
  name: '华为终端',
  buildings: [
    { typeId: 16, recipeId: 22 }, // 电子厂-智能手机 x2
    { typeId: 16, recipeId: 22 },
    { typeId: 16, recipeId: 83 }, // 电子厂-高端手机 x1
    { typeId: 16, recipeId: 84 }, // 电子厂-平价手机 x1
  ],
  outputGoods: [38, 55, 56],  // 智能手机、高端手机、平价手机
}

// 2. 联想集团 - 电脑
{
  name: '联想集团',
  buildings: [
    { typeId: 16, recipeId: 23 }, // 电子厂-电脑 x4
    { typeId: 16, recipeId: 23 },
    { typeId: 16, recipeId: 23 },
    { typeId: 16, recipeId: 23 },
  ],
  outputGoods: [39],  // 电脑
}

// 3. 海尔家电
{
  name: '海尔家电',
  buildings: [
    { typeId: 19 }, // 家电厂 x4
    { typeId: 19 },
    { typeId: 19 },
    { typeId: 19 },
  ],
  outputGoods: [40],  // 家电
}

// 4. 大疆科技 - 无人机+VR
{
  name: '大疆科技',
  buildings: [
    { typeId: 16, recipeId: 82 }, // 电子厂-无人机 x2
    { typeId: 16, recipeId: 82 },
    { typeId: 16, recipeId: 62 }, // 电子厂-VR设备 x2
    { typeId: 16, recipeId: 62 },
  ],
  outputGoods: [52, 103],  // 无人机、VR设备
}
```

#### F. 食品饮料公司 (6家)

```typescript
// 1. 统一食品 - 加工食品
{
  name: '统一食品',
  buildings: [
    { typeId: 13, recipeId: 17 }, // 食品厂-食品加工 x3
    { typeId: 13, recipeId: 17 },
    { typeId: 13, recipeId: 17 },
    { typeId: 13, recipeId: 103 }, // 食品厂-食品生产 x2
    { typeId: 13, recipeId: 103 },
  ],
  outputGoods: [24, 44],  // 加工食品、食品
}

// 2. 可口可乐 - 饮料 ★关键：确保饮料供应
{
  name: '可口可乐',
  buildings: [
    { typeId: 13, recipeId: 18 }, // 食品厂-饮料 x5
    { typeId: 13, recipeId: 18 },
    { typeId: 13, recipeId: 18 },
    { typeId: 13, recipeId: 18 },
    { typeId: 13, recipeId: 18 },
  ],
  outputGoods: [45],  // 饮料
}

// 3. 冷冻零食
{
  name: '冷冻零食',
  buildings: [
    { typeId: 13, recipeId: 42 }, // 食品厂-冷冻食品 x2
    { typeId: 13, recipeId: 42 },
    { typeId: 13, recipeId: 86 }, // 食品厂-零食 x2
    { typeId: 13, recipeId: 86 },
  ],
  outputGoods: [65, 67],  // 冷冻食品、零食
}

// 4. 金龙鱼 - 粮油
{
  name: '金龙鱼',
  buildings: [
    { typeId: 77, recipeId: 168 }, // 制糖厂-糖 x2
    { typeId: 77, recipeId: 168 },
    { typeId: 77, recipeId: 169 }, // 制糖厂-食用油 x2
    { typeId: 77, recipeId: 169 },
    { typeId: 77, recipeId: 170 }, // 制糖厂-面粉 x2
    { typeId: 77, recipeId: 170 },
  ],
  outputGoods: [166, 167, 168],  // 糖、食用油、面粉
}

// 5. 茅台集团 - 酒类
{
  name: '茅台集团',
  buildings: [
    { typeId: 78, recipeId: 171 }, // 酿酒厂-啤酒 x2
    { typeId: 78, recipeId: 171 },
    { typeId: 78, recipeId: 172 }, // 酿酒厂-葡萄酒
    { typeId: 78, recipeId: 173 }, // 酿酒厂-烈酒
  ],
  outputGoods: [169, 170, 171],  // 啤酒、葡萄酒、烈酒
}

// 6. 饮品糖果
{
  name: '饮品糖果',
  buildings: [
    { typeId: 79, recipeId: 174 }, // 饮品厂-茶饮 x2
    { typeId: 79, recipeId: 174 },
    { typeId: 79, recipeId: 175 }, // 饮品厂-咖啡 x2
    { typeId: 79, recipeId: 175 },
    { typeId: 79, recipeId: 177 }, // 饮品厂-糖果 x2
    { typeId: 79, recipeId: 177 },
  ],
  outputGoods: [172, 173, 175],  // 茶饮、咖啡、糖果
}
```

#### G. 服装与日用品公司 (5家)

```typescript
// 1. 波司登 - 服装
{
  name: '波司登',
  buildings: [
    { typeId: 44 }, // 服装厂 x5
    { typeId: 44 },
    { typeId: 44 },
    { typeId: 44 },
    { typeId: 44 },
  ],
  outputGoods: [43],  // 服装
}

// 2. 宜家家居 - 家具
{
  name: '宜家家居',
  buildings: [
    { typeId: 45 }, // 家具厂 x4
    { typeId: 45 },
    { typeId: 45 },
    { typeId: 45 },
  ],
  outputGoods: [46],  // 家具
}

// 3. 宝洁日化
{
  name: '宝洁日化',
  buildings: [
    { typeId: 59 }, // 棕榈种植园 x2
    { typeId: 59 },
    { typeId: 60 }, // 日化厂 x3
    { typeId: 60 },
    { typeId: 60 },
    { typeId: 61 }, // 洗涤用品厂 x3
    { typeId: 61 },
    { typeId: 61 },
  ],
  outputGoods: [104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115],
}

// 4. 皮革纺织
{
  name: '皮革纺织',
  buildings: [
    { typeId: 70 }, // 牧羊场 x2
    { typeId: 70 },
    { typeId: 71, recipeId: 232 }, // 制革厂-麻布
    { typeId: 71, recipeId: 148 }, // 制革厂-皮革 x2
    { typeId: 71, recipeId: 148 },
    { typeId: 72 }, // 皮具厂 x2
    { typeId: 72 },
  ],
  outputGoods: [140, 141, 142, 143, 144, 145, 146, 147, 148, 149],
}

// 5. 陶瓷卫浴
{
  name: '陶瓷卫浴',
  buildings: [
    { typeId: 73 }, // 粘土矿场 x2
    { typeId: 73 },
    { typeId: 74 }, // 砖瓦厂 x3
    { typeId: 74 },
    { typeId: 74 },
    { typeId: 75 }, // 陶瓷厂 x3
    { typeId: 75 },
    { typeId: 75 },
  ],
  outputGoods: [150, 151, 152, 153, 154, 155, 156, 157, 158, 159],
}
```

#### H. 建材与基建公司 (4家)

```typescript
// 1. 中建材料
{
  name: '中建材料',
  buildings: [
    { typeId: 46, recipeId: 71 }, // 建材厂-建筑材料 x4
    { typeId: 46, recipeId: 71 },
    { typeId: 46, recipeId: 71 },
    { typeId: 46, recipeId: 71 },
    { typeId: 46, recipeId: 72 }, // 建材厂-建材成品 x2
    { typeId: 46, recipeId: 72 },
  ],
  outputGoods: [36, 47],  // 建筑材料、建材成品
}

// 2. 精密零件
{
  name: '精密零件',
  buildings: [
    { typeId: 100, recipeId: 228 }, // 精密零件厂-轴承 x2
    { typeId: 100, recipeId: 228 },
    { typeId: 100, recipeId: 229 }, // 精密零件厂-弹簧
    { typeId: 100, recipeId: 230 }, // 精密零件厂-密封件
    { typeId: 100, recipeId: 231 }, // 精密零件厂-过滤器
  ],
  outputGoods: [226, 227, 228, 229],
}

// 3. 电力电缆
{
  name: '电力电缆',
  buildings: [
    { typeId: 83, recipeId: 186 }, // 电力设备厂-变压器 x2
    { typeId: 83, recipeId: 186 },
    { typeId: 83, recipeId: 187 }, // 电力设备厂-电力电缆 x3
    { typeId: 83, recipeId: 187 },
    { typeId: 83, recipeId: 187 },
  ],
  outputGoods: [184, 185],  // 变压器、电力电缆
}

// 4. 光纤通信
{
  name: '光纤通信',
  buildings: [
    { typeId: 84 }, // 光纤厂 x3
    { typeId: 84 },
    { typeId: 84 },
  ],
  outputGoods: [186],  // 光纤
}
```

#### I. 医药与医疗公司 (4家)

```typescript
// 1. 同仁堂 - 药材+仿制药
{
  name: '同仁堂',
  buildings: [
    { typeId: 29 }, // 药材种植园 x3
    { typeId: 29 },
    { typeId: 29 },
    { typeId: 30, recipeId: 44 }, // 制药厂-仿制药 x3
    { typeId: 30, recipeId: 44 },
    { typeId: 30, recipeId: 44 },
  ],
  outputGoods: [70, 74],  // 药材、仿制药
}

// 2. 恒瑞医药 - 专利药+疫苗
{
  name: '恒瑞医药',
  buildings: [
    { typeId: 10, recipeId: 89 }, // 化工厂-医药化工品 x2
    { typeId: 10, recipeId: 89 },
    { typeId: 30, recipeId: 45 }, // 制药厂-专利药 x2
    { typeId: 30, recipeId: 45 },
    { typeId: 30, recipeId: 46 }, // 制药厂-疫苗 x2
    { typeId: 30, recipeId: 46 },
  ],
  outputGoods: [71, 72, 73, 75],  // 医药化工品、抗生素、疫苗、专利药
}

// 3. 华润医药 - 非处方药
{
  name: '华润医药',
  buildings: [
    { typeId: 30, recipeId: 91 }, // 制药厂-非处方药 x4
    { typeId: 30, recipeId: 91 },
    { typeId: 30, recipeId: 91 },
    { typeId: 30, recipeId: 91 },
  ],
  outputGoods: [76],  // 非处方药
}

// 4. 迈瑞医疗 - 医疗器械
{
  name: '迈瑞医疗',
  buildings: [
    { typeId: 31, recipeId: 47 }, // 医疗器械厂-医用耗材 x2
    { typeId: 31, recipeId: 47 },
    { typeId: 31, recipeId: 48 }, // 医疗器械厂-诊断设备 x2
    { typeId: 31, recipeId: 48 },
    { typeId: 31, recipeId: 104 }, // 医疗器械厂-医疗设备
    { typeId: 31, recipeId: 92 }, // 医疗器械厂-手术设备
  ],
  outputGoods: [48, 77, 78, 79],  // 医疗设备、医用耗材、诊断设备、手术设备
}
```

#### J. 汽车与交通公司 (5家)

```typescript
// 1. 比亚迪 - 电动车
{
  name: '比亚迪',
  buildings: [
    { typeId: 18, recipeId: 26 }, // 汽车工厂-电动汽车 x3
    { typeId: 18, recipeId: 26 },
    { typeId: 18, recipeId: 26 },
  ],
  outputGoods: [42],  // 电动汽车
}

// 2. 吉利汽车 - 燃油车
{
  name: '吉利汽车',
  buildings: [
    { typeId: 18, recipeId: 25 }, // 汽车工厂-燃油汽车 x3
    { typeId: 18, recipeId: 25 },
    { typeId: 18, recipeId: 25 },
  ],
  outputGoods: [41],  // 汽车
}

// 3. 正新轮胎
{
  name: '正新轮胎',
  buildings: [
    { typeId: 62, recipeId: 119 }, // 轮胎厂-轮胎 x3
    { typeId: 62, recipeId: 119 },
    { typeId: 62, recipeId: 119 },
    { typeId: 62, recipeId: 120 }, // 轮胎厂-汽车座椅 x1
  ],
  outputGoods: [116, 117],  // 轮胎、汽车座椅
}

// 4. 捷安特 - 两轮车
{
  name: '捷安特',
  buildings: [
    { typeId: 63, recipeId: 121 }, // 自行车厂-自行车 x2
    { typeId: 63, recipeId: 121 },
    { typeId: 63, recipeId: 122 }, // 自行车厂-摩托车 x1
    { typeId: 63, recipeId: 123 }, // 自行车厂-电动滑板车 x1
  ],
  outputGoods: [121, 122, 123],
}

// 5. 航空部件
{
  name: '航空部件',
  buildings: [
    { typeId: 21, recipeId: 80 }, // 零部件厂-航空部件 x3
    { typeId: 21, recipeId: 80 },
    { typeId: 21, recipeId: 80 },
  ],
  outputGoods: [33],  // 航空部件
}
```

#### K. 高科技与军工公司 (6家)

```typescript
// 1. 特钢集团
{
  name: '特钢集团',
  buildings: [
    { typeId: 32, recipeId: 49 }, // 特钢厂-特种钢 x3
    { typeId: 32, recipeId: 49 },
    { typeId: 32, recipeId: 49 },
    { typeId: 32, recipeId: 50 }, // 特钢厂-装甲板 x2
    { typeId: 32, recipeId: 50 },
  ],
  outputGoods: [80, 82],  // 特种钢材、装甲板
}

// 2. 寒武纪AI
{
  name: '寒武纪AI',
  buildings: [
    { typeId: 37, recipeId: 58 }, // AI芯片厂-AI芯片 x3
    { typeId: 37, recipeId: 58 },
    { typeId: 37, recipeId: 58 },
    { typeId: 37, recipeId: 60 }, // AI芯片厂-AI服务器 x1
  ],
  outputGoods: [96, 99],  // AI芯片、AI服务器
}

// 3. 机器人科技
{
  name: '机器人科技',
  buildings: [
    { typeId: 47, recipeId: 73 }, // 机器人厂-工业机器人 x2
    { typeId: 47, recipeId: 73 },
    { typeId: 47, recipeId: 74 }, // 机器人厂-智能机器人 x1
  ],
  outputGoods: [51, 102],  // 工业机器人、智能机器人
}

// 4. 生命科学
{
  name: '生命科学',
  buildings: [
    { typeId: 39, recipeId: 95 }, // 生物实验室-生物材料 x2
    { typeId: 39, recipeId: 95 },
    { typeId: 39, recipeId: 63 }, // 生物实验室-生物制品 x1
  ],
  outputGoods: [98, 101],  // 生物材料、生物制品
}

// 5. 珠宝奢侈
{
  name: '珠宝奢侈',
  buildings: [
    { typeId: 35 }, // 金矿 x2
    { typeId: 35 },
    { typeId: 36 }, // 奢侈品工坊 x2
    { typeId: 36 },
  ],
  outputGoods: [88, 89, 90, 91, 53, 54, 93, 94],
}

// 6. 精细化工
{
  name: '精细化工',
  buildings: [
    { typeId: 99, recipeId: 224 }, // 精细化工厂-光刻胶
    { typeId: 99, recipeId: 225 }, // 精细化工厂-惰性气体
    { typeId: 99, recipeId: 226 }, // 精细化工厂-催化剂
    { typeId: 99, recipeId: 227 }, // 精细化工厂-胶粘剂
  ],
  outputGoods: [222, 223, 224, 225],
}
```

## 四、实施步骤

### 4.1 代码修改清单

1. 修改 `src/core/world/WorldInitializer.ts` 中的 `initializeAICompanies` 函数
2. 重新组织 `aiCompanies` 数组
3. 确保每个建筑都指定正确的 `recipeId`
4. 增加原材料和中间产品的初始库存

### 4.2 验证方法

1. 检查每种商品是否有生产者
2. 检查产能是否满足消费需求
3. 运行游戏观察产业链运转情况

### 4.3 预期效果

- 原材料供应充足，不再成为瓶颈
- 中间产品产能提升50%以上
- 消费品供应稳定
- 市场价格波动减小
- AI公司建造能力增强（建材充足）

## 五、确认后实施

请确认此设计方案，我将生成完整的代码修改。
