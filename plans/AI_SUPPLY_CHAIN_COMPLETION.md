# AI公司供应链完善计划 V2

## 一、产能配比分析

### 1.1 关键产能比例（每tick产出）

| 配方 | 输入 | 输出 | 周期 | 有效产能/tick |
|------|------|------|------|--------------|
| 铁矿开采 | - | 100铁矿 | 1 | 100 |
| 铜矿开采 | - | 80铜矿 | 1 | 80 |
| 煤炭开采 | - | 150煤 | 1 | 150 |
| 钢铁冶炼 | 100铁+50煤 | 80钢 | 2 | 40 |
| 铜冶炼 | 80铜矿 | 60铜材 | 2 | 30 |
| 电子元件 | 20铜材+15塑料 | 25元件 | 2 | 12.5 |
| 芯片生产 | 30硅+5稀土+10化学 | 20芯片 | 4 | 5 |
| 电池生产 | 30锂+15铜材+20化学 | 20电池 | 3 | 6.67 |
| 汽车零部件 | 50钢+20塑料 | 30零件 | 3 | 10 |
| 电动汽车 | 15零件+15电子+10电池+... | 1车 | 6 | 0.167 |

### 1.2 供应链配比计算

**钢铁产业链（宝钢为例）：**
- 1个钢铁厂需要：100铁矿/tick × 2周期 = 200铁矿/周期
- 1个铁矿产出：100铁矿/tick → 1:1配比
- 但钢铁厂还需要50煤/tick → 需要0.33个煤矿配套
- **结论：宝钢可以垂直整合，建10个钢厂+10个铁矿+4个煤矿 = 24个建筑**

**电子产业链（立讯为例）：**
- 1个电子厂需要：20铜材/tick × 2周期 = 40铜材
- 铜冶炼产出30铜材/tick，需要约1.3个铜冶炼厂配套
- 铜冶炼需要80铜矿/周期，需要1个铜矿配套
- **结论：垂直整合需要 电子厂+铜冶炼+铜矿 = 按比例配置**

## 二、公司分类设计原则

### 2.1 设计原则

1. **每家公司至少10个建筑**
2. **大型公司可以有20-30个建筑**（如中石油、宝钢等行业巨头）
3. **根据产能配比设计上下游整合**
4. **零售公司按门店数量和市场规模配置**

### 2.2 公司规模分级

| 级别 | 建筑数量 | 适用公司类型 |
|------|---------|-------------|
| 小型 | 10-12 | 专精型公司、新兴公司 |
| 中型 | 13-18 | 行业中坚力量 |
| 大型 | 19-25 | 行业龙头、多元化集团 |
| 超大型 | 26-35 | 国企巨头、产业链完整的集团 |

## 三、详细配置方案

### A. 原材料采掘公司 (7家)

#### 1. 中钢矿业 (4→15个)
专注铁矿开采，为钢铁行业提供原料
```javascript
initialBuildings: [
  { typeId: 0, recipeId: 0, count: 15 },  // 铁矿×15
]
// 产能：1500铁矿/tick，可供应约15个钢铁厂
```

#### 2. 神华煤炭 (10→25个)
中国最大煤炭企业
```javascript
initialBuildings: [
  { typeId: 2, recipeId: 2, count: 25 },  // 煤矿×25
]
// 产能：3750煤/tick，同时供应发电和钢铁行业
```

#### 3. 国投煤业 (5→12个)
煤炭行业第二梯队
```javascript
initialBuildings: [
  { typeId: 2, recipeId: 2, count: 12 },  // 煤矿×12
]
// 产能：1800煤/tick
```

#### 4. 五矿铜业 (3→14个)
专注铜矿开采
```javascript
initialBuildings: [
  { typeId: 1, recipeId: 1, count: 14 },  // 铜矿×14
]
// 产能：1120铜矿/tick，可供应约14个铜冶炼厂
```

#### 5. 中石油 (5→22个)
油气开采巨头，需要布局多元能源
```javascript
initialBuildings: [
  { typeId: 3, recipeId: 3, count: 12 },  // 油田×12
  { typeId: 4, recipeId: 4, count: 10 },  // 气田×10
]
// 产能：960原油 + 1000天然气/tick
```

#### 6. 林业集团 (4→14个)
木材采伐，供应造纸和家具
```javascript
initialBuildings: [
  { typeId: 5, recipeId: 5, count: 14 },  // 伐木场×14
]
// 产能：1680木材/tick
```

#### 7. 硅海矿业 (4→16个)
硅石和稀土开采，支撑电子产业
```javascript
initialBuildings: [
  { typeId: 7, recipeId: 8, count: 10 },   // 硅石矿×10
  { typeId: 7, recipeId: 9, count: 4 },    // 稀土矿×4
  { typeId: 7, recipeId: 102, count: 2 },  // 铝土矿×2
]
// 产能：900硅石 + 40稀土 + 240铝土/tick
```

### B. 农业公司 (2家)

#### 8. 中粮集团 (5→18个)
综合农业巨头
```javascript
initialBuildings: [
  { typeId: 6, recipeId: 6, count: 8 },   // 粮食种植×8
  { typeId: 6, recipeId: 7, count: 4 },   // 棉花种植×4
  { typeId: 25, recipeId: 35, count: 3 }, // 蔬菜农场×3
  { typeId: 25, recipeId: 36, count: 3 }, // 水果农场×3
]
// 产能：粮食1600(24周期) + 棉花320(24周期) + 蔬菜450(12周期) + 水果300(24周期)
```

#### 9. 新希望牧业 (4→15个)
畜牧水产龙头
```javascript
initialBuildings: [
  { typeId: 26, recipeId: 37, count: 4 }, // 牲畜养殖×4
  { typeId: 26, recipeId: 38, count: 5 }, // 家禽养殖×5
  { typeId: 27, recipeId: 39, count: 6 }, // 水产养殖×6
]
// 产能：牲畜40头(48周期) + 家禽500只(12周期) + 水产480(24周期)
```

### C. 基础加工公司 (8家)

#### 10. 宝钢集团 (4→24个)
钢铁龙头，垂直整合
```javascript
initialBuildings: [
  { typeId: 0, recipeId: 0, count: 8 },   // 自有铁矿×8
  { typeId: 2, recipeId: 2, count: 4 },   // 自有煤矿×4
  { typeId: 8, recipeId: 10, count: 8 },  // 高炉炼钢×8
  { typeId: 8, recipeId: 11, count: 4 },  // 电弧炉炼钢×4
]
// 产能：铁矿800 + 煤600 → 钢材480/tick
```

#### 11. 江铜冶炼 (3→16个)
专业铜冶炼
```javascript
initialBuildings: [
  { typeId: 1, recipeId: 1, count: 6 },   // 自有铜矿×6
  { typeId: 8, recipeId: 78, count: 10 }, // 铜冶炼×10
]
// 产能：铜矿480 → 铜材300/tick
```

#### 12. 中石化 (4→20个)
炼化一体化巨头
```javascript
initialBuildings: [
  { typeId: 3, recipeId: 3, count: 6 },   // 自有油田×6
  { typeId: 9, recipeId: 12, count: 14 }, // 石油精炼×14
]
// 产能：原油480 → 燃油420 + 化工原料210/tick
```

#### 13. 塑料化工 (4→18个)
化工产品专业生产
```javascript
initialBuildings: [
  { typeId: 10, recipeId: 13, count: 8 },  // 塑料生产×8
  { typeId: 10, recipeId: 14, count: 6 },  // 化学品生产×6
  { typeId: 10, recipeId: 68, count: 4 },  // 橡胶制品×4
]
// 产能：塑料320 + 化学品150 + 橡胶制品100/tick
```

#### 14. 福耀玻璃 (3→12个)
玻璃专业制造商
```javascript
initialBuildings: [
  { typeId: 7, recipeId: 8, count: 4 },   // 自有硅矿×4
  { typeId: 11, recipeId: 15, count: 8 }, // 玻璃生产×8
]
// 产能：硅石360 → 玻璃480/tick
```

#### 15. 魏桥纺织 (3→16个)
纺织行业龙头
```javascript
initialBuildings: [
  { typeId: 6, recipeId: 7, count: 4 },   // 自有棉花×4
  { typeId: 12, recipeId: 16, count: 6 }, // 纺织品生产×6
  { typeId: 12, recipeId: 99, count: 2 }, // 丝绸生产×2
  { typeId: 12, recipeId: 69, count: 4 }, // 服装生产×4
]
// 产能：棉花320(24周期) → 纺织品240 + 丝绸15 → 服装80/tick
```

#### 16. 海螺水泥 (7→18个)
建材行业龙头
```javascript
initialBuildings: [
  { typeId: 7, recipeId: 8, count: 4 },   // 自有硅矿×4
  { typeId: 2, recipeId: 2, count: 2 },   // 自有煤矿×2
  { typeId: 14, recipeId: 19, count: 6 }, // 水泥生产×6
  { typeId: 14, recipeId: 71, count: 4 }, // 建筑材料×4
  { typeId: 14, recipeId: 72, count: 2 }, // 建材成品×2
]
// 产能：水泥300 + 建材160 + 成品26.7/tick
```

#### 17. 中铝集团 (3→15个)
铝业龙头，垂直整合
```javascript
initialBuildings: [
  { typeId: 7, recipeId: 102, count: 6 }, // 铝土矿开采×6
  { typeId: 15, recipeId: 20, count: 9 }, // 铝冶炼×9
]
// 产能：铝土矿720 → 铝材180/tick
```

### D. 食品加工公司 (3家)

#### 18. 统一食品 (4→14个)
综合食品饮料
```javascript
initialBuildings: [
  { typeId: 13, recipeId: 17, count: 5 },  // 食品加工×5
  { typeId: 13, recipeId: 18, count: 4 },  // 饮料生产×4
  { typeId: 13, recipeId: 86, count: 3 },  // 零食生产×3
  { typeId: 13, recipeId: 103, count: 2 }, // 包装食品×2
]
// 产能：食品400 + 饮料400 + 零食240 + 包装食品100/tick
```

#### 19. 双汇食品 (3→13个)
肉类加工龙头
```javascript
initialBuildings: [
  { typeId: 26, recipeId: 37, count: 2 }, // 自有牲畜养殖×2
  { typeId: 26, recipeId: 38, count: 2 }, // 自有家禽养殖×2
  { typeId: 28, recipeId: 40, count: 5 }, // 肉类加工×5
  { typeId: 28, recipeId: 41, count: 3 }, // 乳制品生产×3
  { typeId: 13, recipeId: 85, count: 1 }, // 罐头生产×1
]
// 产能：肉类250 + 乳制品450 + 罐头25/tick
```

#### 20. 冷冻零食 (3→12个)
速冻食品专业
```javascript
initialBuildings: [
  { typeId: 13, recipeId: 42, count: 5 },  // 冷冻食品×5
  { typeId: 13, recipeId: 86, count: 4 },  // 零食生产×4
  { typeId: 13, recipeId: 88, count: 3 },  // 宠物食品×3
]
// 产能：冷冻食品150 + 零食320 + 宠物食品180/tick
```

### E. 电子与制造公司 (8家)

#### 21. 立讯精密 (6→20个)
电子元件龙头，垂直整合
```javascript
initialBuildings: [
  { typeId: 1, recipeId: 1, count: 4 },    // 自有铜矿×4
  { typeId: 8, recipeId: 78, count: 4 },   // 自有铜冶炼×4
  { typeId: 16, recipeId: 21, count: 12 }, // 电子元件生产×12
]
// 产能：铜矿320 → 铜材120 → 电子元件150/tick
```

#### 22. 中芯国际 (3→18个)
芯片制造龙头
```javascript
initialBuildings: [
  { typeId: 7, recipeId: 8, count: 6 },   // 自有硅矿×6
  { typeId: 7, recipeId: 9, count: 2 },   // 自有稀土矿×2
  { typeId: 17, recipeId: 24, count: 10 }, // 芯片生产×10
]
// 产能：硅石540 + 稀土20 → 芯片50/tick
```

#### 23. 华为终端 (6→16个)
消费电子品牌
```javascript
initialBuildings: [
  { typeId: 16, recipeId: 21, count: 3 },  // 自有电子元件×3
  { typeId: 16, recipeId: 83, count: 4 },  // 高端手机生产×4
  { typeId: 16, recipeId: 84, count: 4 },  // 平价手机生产×4
  { typeId: 16, recipeId: 23, count: 3 },  // 电脑组装×3
  { typeId: 16, recipeId: 82, count: 2 },  // 无人机生产×2
]
// 产能：高端手机10.67 + 平价手机30 + 电脑5 + 无人机3.33/tick
```

#### 24. 海尔家电 (3→14个)
家电龙头
```javascript
initialBuildings: [
  { typeId: 16, recipeId: 21, count: 4 },  // 自有电子元件×4
  { typeId: 19, recipeId: 27, count: 10 }, // 家电生产×10
]
// 产能：电子元件50 → 家电12.5/tick
```

#### 25. 宁德时代 (7→22个)
电池储能龙头
```javascript
initialBuildings: [
  { typeId: 33, recipeId: 107, count: 6 }, // 自有锂矿×6
  { typeId: 8, recipeId: 78, count: 3 },   // 自有铜冶炼×3
  { typeId: 20, recipeId: 28, count: 8 },  // 电池生产×8
  { typeId: 20, recipeId: 77, count: 3 },  // 光伏系统组装×3
  { typeId: 20, recipeId: 81, count: 2 },  // 储能系统生产×2
]
// 产能：锂矿120 + 铜材90 → 电池53.3 + 光伏1.2 + 储能1.5/tick
```

#### 26. 零部件集团 (9→20个)
机械零部件综合
```javascript
initialBuildings: [
  { typeId: 8, recipeId: 10, count: 3 },   // 自有炼钢×3
  { typeId: 21, recipeId: 79, count: 5 },  // 机械部件生产×5
  { typeId: 21, recipeId: 29, count: 4 },  // 汽车零部件×4
  { typeId: 21, recipeId: 30, count: 3 },  // 电机×3
  { typeId: 21, recipeId: 31, count: 2 },  // 屏幕×2
  { typeId: 21, recipeId: 70, count: 2 },  // 家具生产×2
  { typeId: 21, recipeId: 73, count: 1 },  // 工业机器人×1
]
// 产能：机械部件87.5 + 零部件40 + 电机22.5 + 屏幕20 + 家具6.67 + 机器人0.33/tick
```

#### 44. 富士康电子 (5→18个)
电子代工巨头
```javascript
initialBuildings: [
  { typeId: 1, recipeId: 1, count: 4 },    // 自有铜矿×4
  { typeId: 8, recipeId: 78, count: 4 },   // 自有铜冶炼×4
  { typeId: 16, recipeId: 21, count: 10 }, // 电子元件生产×10
]
// 产能：铜矿320 → 铜材120 → 电子元件125/tick
```

#### 45. 歌尔股份 (6→15个)
精密电子元件
```javascript
initialBuildings: [
  { typeId: 1, recipeId: 1, count: 3 },    // 自有铜矿×3
  { typeId: 8, recipeId: 78, count: 3 },   // 自有铜冶炼×3
  { typeId: 16, recipeId: 21, count: 6 },  // 电子元件生产×6
  { typeId: 21, recipeId: 31, count: 3 },  // 屏幕生产×3
]
// 产能：电子元件75 + 屏幕30/tick
```

### F. 汽车公司 (2家)

#### 27. 比亚迪 (2→24个)
新能源汽车龙头，高度垂直整合
```javascript
initialBuildings: [
  { typeId: 33, recipeId: 107, count: 3 }, // 自有锂矿×3
  { typeId: 20, recipeId: 28, count: 4 },  // 自有电池生产×4
  { typeId: 8, recipeId: 10, count: 2 },   // 自有炼钢×2
  { typeId: 21, recipeId: 29, count: 4 },  // 自有汽车零部件×4
  { typeId: 16, recipeId: 21, count: 3 },  // 自有电子元件×3
  { typeId: 18, recipeId: 26, count: 8 },  // 电动汽车组装×8
]
// 产能：锂矿60 → 电池26.67 → 电动车1.33/tick
```

#### 28. 吉利汽车 (2→20个)
传统汽车龙头
```javascript
initialBuildings: [
  { typeId: 8, recipeId: 10, count: 3 },   // 自有炼钢×3
  { typeId: 21, recipeId: 29, count: 5 },  // 自有汽车零部件×5
  { typeId: 16, recipeId: 21, count: 2 },  // 自有电子元件×2
  { typeId: 18, recipeId: 25, count: 6 },  // 燃油汽车组装×6
  { typeId: 18, recipeId: 26, count: 4 },  // 电动汽车组装×4
]
// 产能：燃油车1.2 + 电动车0.67/tick
```

### G. 医药公司 (3家)

#### 29. 同仁堂 (4→14个)
中药龙头，种植+制药
```javascript
initialBuildings: [
  { typeId: 29, recipeId: 43, count: 6 },  // 药材种植×6
  { typeId: 30, recipeId: 44, count: 5 },  // 仿制药生产×5
  { typeId: 30, recipeId: 91, count: 3 },  // OTC药品×3
]
// 产能：药材7.5(48周期) → 仿制药166.67 + OTC药120/tick
```

#### 30. 恒瑞医药 (3→16个)
创新药龙头
```javascript
initialBuildings: [
  { typeId: 29, recipeId: 43, count: 4 },  // 自有药材种植×4
  { typeId: 10, recipeId: 89, count: 3 },  // 医药化工品×3
  { typeId: 30, recipeId: 45, count: 4 },  // 专利药生产×4
  { typeId: 30, recipeId: 46, count: 3 },  // 疫苗生产×3
  { typeId: 30, recipeId: 90, count: 2 },  // 抗生素生产×2
]
// 产能：专利药16 + 疫苗3.75 + 抗生素7.5/tick
```

#### 31. 迈瑞医疗 (3→14个)
医疗器械龙头
```javascript
initialBuildings: [
  { typeId: 16, recipeId: 21, count: 3 },  // 自有电子元件×3
  { typeId: 31, recipeId: 47, count: 5 },  // 医用耗材生产×5
  { typeId: 31, recipeId: 48, count: 4 },  // 诊断设备生产×4
  { typeId: 31, recipeId: 92, count: 2 },  // 手术设备生产×2
]
// 产能：电子元件37.5 → 耗材250 + 诊断设备1.33 + 手术设备0.2/tick
```

### H. 奢侈品公司 (1家)

#### 32. 珠宝奢侈 (6→16个)
奢侈品全产业链
```javascript
initialBuildings: [
  { typeId: 35, recipeId: 54, count: 4 },  // 金矿开采×4
  { typeId: 35, recipeId: 97, count: 3 },  // 钻石矿开采×3
  { typeId: 35, recipeId: 55, count: 3 },  // 黄金精炼×3
  { typeId: 36, recipeId: 98, count: 2 },  // 钻石切割×2
  { typeId: 36, recipeId: 56, count: 2 },  // 珠宝制作×2
  { typeId: 36, recipeId: 57, count: 2 },  // 奢侈腕表×2
]
// 产能：金矿10 + 钻石矿2 → 黄金8 + 切割钻石1.5 → 珠宝1.2 + 腕表0.5/tick
```

### I. 发电公司 (1家)

#### 33. 华能集团 (4→18个)
综合发电集团
```javascript
initialBuildings: [
  { typeId: 2, recipeId: 2, count: 4 },   // 自有煤矿×4
  { typeId: 4, recipeId: 4, count: 2 },   // 自有气田×2
  { typeId: 24, recipeId: 32, count: 6 }, // 燃煤发电×6
  { typeId: 24, recipeId: 33, count: 4 }, // 燃气发电×4
  { typeId: 24, recipeId: 34, count: 2 }, // 光伏发电×2
]
// 产能：煤600 + 气200 → 电力5000/tick
```

### J. 零售公司 (10家)

#### 34. 全家便利 (3→12个)
便利店连锁
```javascript
initialBuildings: [
  { typeId: 49, recipeId: -1, count: 12 }, // 便利店×12
]
```

#### 35. 永辉超市 (2→15个)
综合超市
```javascript
initialBuildings: [
  { typeId: 50, recipeId: -1, count: 15 }, // 超市×15
]
```

#### 36. 沃尔玛 (1→10个)
大型卖场
```javascript
initialBuildings: [
  { typeId: 51, recipeId: -1, count: 10 }, // 大卖场×10
]
```

#### 37. 苏宁电器 (2→12个)
电子产品零售
```javascript
initialBuildings: [
  { typeId: 52, recipeId: -1, count: 12 }, // 电子商城×12
]
```

#### 38. 广汽4S (1→10个)
汽车销售
```javascript
initialBuildings: [
  { typeId: 53, recipeId: -1, count: 10 }, // 汽车4S店×10
]
```

#### 39. 优衣库 (2→14个)
服装零售
```javascript
initialBuildings: [
  { typeId: 54, recipeId: -1, count: 14 }, // 服装店×14
]
```

#### 40. 卡地亚精品 (1→10个)
奢侈品零售
```javascript
initialBuildings: [
  { typeId: 55, recipeId: -1, count: 10 }, // 奢侈品店×10
]
```

#### 41. 大参林药房 (2→15个)
药品零售
```javascript
initialBuildings: [
  { typeId: 56, recipeId: -1, count: 15 }, // 药店×15
]
```

#### 42. 中石化加油 (3→18个)
加油站
```javascript
initialBuildings: [
  { typeId: 57, recipeId: -1, count: 18 }, // 加油站×18
]
```

#### 43. 红星美凯龙 (1→10个)
家居建材
```javascript
initialBuildings: [
  { typeId: 58, recipeId: -1, count: 10 }, // 家居商城×10
]
```

## 四、新增公司配置 (4家)

### 46. 华域橡胶 (新增，16个)
橡胶产业链完整公司
```javascript
{
  id: 46,
  name: '华域橡胶',
  personality: 'specialist',
  initialCash: 80000000,
  focusGoods: [11, 19],  // 天然橡胶、橡胶制品
  category: 'processing',
  description: '橡胶种植和橡胶制品生产',
  initialBuildings: [
    { typeId: 32, recipeId: 106, count: 10 }, // 橡胶园×10
    { typeId: 10, recipeId: 68, count: 6 },   // 橡胶制品生产×6
  ],
}
// 产能：天然橡胶800 → 橡胶制品150/tick
```

### 47. 天齐锂业 (新增，14个)
锂矿开采专业
```javascript
{
  id: 47,
  name: '天齐锂业',
  personality: 'conservative',
  initialCash: 100000000,
  focusGoods: [13],  // 锂矿
  category: 'extraction',
  description: '锂矿开采',
  initialBuildings: [
    { typeId: 33, recipeId: 107, count: 14 }, // 锂矿场×14
  ],
}
// 产能：锂矿280/tick，可供应约9个电池厂
```

### 48. 山鹰纸业 (新增，16个)
造纸包装
```javascript
{
  id: 48,
  name: '山鹰纸业',
  personality: 'cost_leader',
  initialCash: 60000000,
  focusGoods: [22, 37],  // 纸张、包装材料
  category: 'processing',
  description: '造纸和包装材料生产',
  initialBuildings: [
    { typeId: 5, recipeId: 5, count: 6 },    // 自有伐木场×6
    { typeId: 34, recipeId: 66, count: 6 },  // 纸张生产×6
    { typeId: 34, recipeId: 67, count: 4 },  // 包装材料生产×4
  ],
}
// 产能：木材720 → 纸张300 → 包装材料320/tick
```

### 49. 申洲国际 (新增，14个)
服装代工
```javascript
{
  id: 49,
  name: '申洲国际',
  personality: 'cost_leader',
  initialCash: 50000000,
  focusGoods: [43],  // 服装
  category: 'manufacturing',
  description: '服装制造代工',
  initialBuildings: [
    { typeId: 6, recipeId: 7, count: 4 },    // 自有棉花种植×4
    { typeId: 12, recipeId: 16, count: 4 },  // 纺织品生产×4
    { typeId: 12, recipeId: 69, count: 6 },  // 服装生产×6
  ],
}
// 产能：棉花320(24周期) → 纺织品160 → 服装120/tick
```

## 五、建筑总数统计

| 公司ID | 公司名称 | 建筑数 | 级别 |
|--------|----------|--------|------|
| 1 | 中钢矿业 | 15 | 中型 |
| 2 | 神华煤炭 | 25 | 大型 |
| 3 | 国投煤业 | 12 | 中型 |
| 4 | 五矿铜业 | 14 | 中型 |
| 5 | 中石油 | 22 | 大型 |
| 6 | 林业集团 | 14 | 中型 |
| 7 | 硅海矿业 | 16 | 中型 |
| 8 | 中粮集团 | 18 | 中型 |
| 9 | 新希望牧业 | 15 | 中型 |
| 10 | 宝钢集团 | 24 | 大型 |
| 11 | 江铜冶炼 | 16 | 中型 |
| 12 | 中石化 | 20 | 大型 |
| 13 | 塑料化工 | 18 | 中型 |
| 14 | 福耀玻璃 | 12 | 中型 |
| 15 | 魏桥纺织 | 16 | 中型 |
| 16 | 海螺水泥 | 18 | 中型 |
| 17 | 中铝集团 | 15 | 中型 |
| 18 | 统一食品 | 14 | 中型 |
| 19 | 双汇食品 | 13 | 中型 |
| 20 | 冷冻零食 | 12 | 中型 |
| 21 | 立讯精密 | 20 | 大型 |
| 22 | 中芯国际 | 18 | 中型 |
| 23 | 华为终端 | 16 | 中型 |
| 24 | 海尔家电 | 14 | 中型 |
| 25 | 宁德时代 | 22 | 大型 |
| 26 | 零部件集团 | 20 | 大型 |
| 27 | 比亚迪 | 24 | 大型 |
| 28 | 吉利汽车 | 20 | 大型 |
| 29 | 同仁堂 | 14 | 中型 |
| 30 | 恒瑞医药 | 16 | 中型 |
| 31 | 迈瑞医疗 | 14 | 中型 |
| 32 | 珠宝奢侈 | 16 | 中型 |
| 33 | 华能集团 | 18 | 中型 |
| 34 | 全家便利 | 12 | 中型 |
| 35 | 永辉超市 | 15 | 中型 |
| 36 | 沃尔玛 | 10 | 小型 |
| 37 | 苏宁电器 | 12 | 中型 |
| 38 | 广汽4S | 10 | 小型 |
| 39 | 优衣库 | 14 | 中型 |
| 40 | 卡地亚精品 | 10 | 小型 |
| 41 | 大参林药房 | 15 | 中型 |
| 42 | 中石化加油 | 18 | 中型 |
| 43 | 红星美凯龙 | 10 | 小型 |
| 44 | 富士康电子 | 18 | 中型 |
| 45 | 歌尔股份 | 15 | 中型 |
| 46 | 华域橡胶 | 16 | 中型 |
| 47 | 天齐锂业 | 14 | 中型 |
| 48 | 山鹰纸业 | 16 | 中型 |
| 49 | 申洲国际 | 14 | 中型 |
| **总计** | **49家公司** | **773个** | - |

## 六、供应链完整性验证

### 6.1 电池-电动车产业链
```
天齐锂业(锂矿280) + 江铜冶炼(铜材300)
    ↓
宁德时代(电池53.3) + 比亚迪(自产电池26.67)
    ↓
比亚迪(电动车1.33/tick) + 吉利汽车(电动车0.67/tick)
```
✓ 完整

### 6.2 钢铁-汽车产业链
```
中钢矿业(铁矿1500) + 神华煤炭(煤3750)
    ↓
宝钢集团(钢材480)
    ↓
零部件集团(零部件40) + 比亚迪(自产) + 吉利(自产)
    ↓
汽车组装
```
✓ 完整

### 6.3 电子-消费电子产业链
```
五矿铜业(铜矿1120) + 硅海矿业(硅石900+稀土40)
    ↓
江铜冶炼(铜材300) + 中芯国际(芯片50)
    ↓
立讯/富士康/歌尔(电子元件350+)
    ↓
华为(手机40+/电脑5) + 海尔(家电12.5)
```
✓ 完整

### 6.4 农业-食品产业链
```
中粮集团(粮食+蔬果) + 新希望(牲畜+家禽+水产)
    ↓
双汇(肉类250+乳制品450) + 统一(食品400+饮料400)
    ↓
零售商分销
```
✓ 完整

### 6.5 化工-橡胶产业链
```
中石油(原油960) + 华域橡胶(天然橡胶800)
    ↓
中石化(燃油420+化工原料210) + 塑料化工(塑料320+化学品150)
    ↓
华域橡胶(橡胶制品150) → 汽车/其他制造业
```
✓ 完整

## 七、实施步骤

1. **修改 AI_COMPANIES 数组** - 更新所有49家公司的 initialBuildings
2. **验证建筑类型ID** - 确保所有 typeId 在 buildings.ts 中存在
3. **验证配方ID** - 确保所有 recipeId 在 recipes.ts 中存在
4. **调整初始资金** - 根据建筑数量适当调整 initialCash

## 八、资金调整建议

| 公司类型 | 建议资金范围 |
|----------|-------------|
| 小型零售 | 10-30M |
| 中型公司 | 50-100M |
| 大型公司 | 120-200M |
| 超大型 | 200-300M |