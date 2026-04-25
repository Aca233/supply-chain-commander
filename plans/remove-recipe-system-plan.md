# 删除配方机制重构计划

## 概述

本计划将完成删除配方机制（recipes.ts）的重构工作，将其替换为建筑内置的生产配置（outputModes）系统。

## 当前进度

### 已完成
- ✅ **buildings.ts**: 添加了 `production` 属性和 `outputModes` 数组
- ✅ **ProductionEngine.ts**: 使用 `outputModeIds` 替代 `recipeIds`
- ✅ **GameWorld.ts**: 将 `recipeIds` 替换为 `outputModeIds`

### 待完成
发现了 **125处配方引用** 需要更新

## 映射关系

### recipeId → outputModeId 映射
新系统中，产品模式由 `buildingTypeId` + `outputModeId` 唯一确定：
- 每个建筑类型有自己的 outputModes 数组
- modeId 从 0 开始，0 通常是默认模式
- 不再需要全局唯一的 recipeId

### 主要接口变更
```typescript
// 旧接口
{ recipeId: number }

// 新接口
{ outputModeId: number }  // 或直接使用 modeId
```

## 分阶段实施计划

### Phase B: 核心系统更新（进行中）

#### B.2 WorldInitializer.ts
**变更要点**:
- 移除 `RecipeSupplyTracker` 相关代码
- 将 `recipeId` 参数改为 `outputModeId`
- 更新 `addBuildingToCompany()` 函数签名
- 更新玩家初始建筑配置

#### B.3 SaveManager.ts
**变更要点**:
- 将保存数据中的 `recipeIds` 改为 `outputModeIds`
- 添加旧存档兼容性（可选）
- 更新数据验证逻辑

### Phase C: AI系统更新

#### C.1 AIPersonality.ts（~80处引用）
**变更要点**:
- 将 `initialBuildings` 数组中的 `recipeId` 改为 `outputModeId`
- 移除 `RecipeId` 导入
- 建立 RecipeId → outputModeId 映射表

**映射示例**:
```typescript
// 旧配置
{ typeId: BuildingId.FARM, recipeId: RecipeId.GRAIN_FARMING, count: 15 }

// 新配置
{ typeId: BuildingId.FARM, outputModeId: 0, count: 15 }  // 粮食种植 = modeId 0
{ typeId: BuildingId.FARM, outputModeId: 1, count: 10 }  // 棉花种植 = modeId 1
```

#### C.2 AIDecisionEngine.ts（~30处引用）
**变更要点**:
- 移除所有 `RECIPES.find()` 调用
- 使用 `getBuildingProduction()` 和 `getBuildingOutputMode()` 替代
- 更新投资决策逻辑使用 `outputModeId`
- 更新 `BuildingOpportunity` 接口

#### C.3 其他AI文件
- **PlayerAutoTrader.ts**: 更新配方查询逻辑
- **AIProductionOptimizer.ts**: 使用新的生产配置API
- **MarketIntelligence.ts**: 更新市场分析逻辑
- **PrecisionCalculator.ts**: 更新精确计算逻辑

### Phase D: 建造系统更新

#### D.1 ConstructionManager.ts
**变更要点**:
- 接口中 `recipeId` → `outputModeId`
- 更新队列数据结构
- 更新任务创建逻辑

#### D.2 ConstructionTick.ts
**变更要点**:
- 建筑完成时设置 `outputModeId` 而非 `recipeId`
- 更新 `queueBuildingConstruction()` 函数

### Phase E: 其他系统更新

#### E.1 gameStore.ts
**变更要点**:
- `buildBuilding()`: 参数从 `recipeId` 改为 `outputModeId`
- `setBuildingRecipe()` → `setBuildingOutputMode()`
- 更新状态管理逻辑

#### E.2 PlayerAutoTrader.ts
**变更要点**:
- 移除 `RECIPES.find()` 调用
- 使用建筑生产配置 API

#### E.3 其他杂项文件
- **SupplyCurve.ts**: 更新供给曲线计算
- **ConsumerMarket.ts**: 更新消费市场逻辑
- **CodeSandbox.ts**: 更新代码沙箱 API
- **WorldModifier.ts**: 更新世界修改器
- **DataStructures.ts**: 更新数据结构索引
- **aiWorker.ts/aiWorkerTypes.ts**: 更新 Worker 接口
- **supplyChainUtils.ts**: 更新供应链工具

### Phase F: 清理工作

1. **删除 recipes.ts** 文件
2. **移除所有 recipes 导入** 语句
3. **删除 RecipeId 枚举** 引用
4. **更新类型定义**

### Phase G: 测试验证

1. 运行 TypeScript 编译检查
2. 启动游戏测试生产流程
3. 验证AI公司正常运作
4. 验证建造系统正常
5. 验证存档加载兼容性

## RecipeId → OutputModeId 对照表

### 采掘类建筑（单一输出，modeId=0）
| 建筑 | 原RecipeId | 新OutputModeId |
|------|-----------|----------------|
| 铁矿场 | IRON_MINING (0) | 0 |
| 铜矿场 | COPPER_MINING (1) | 0 |
| 铝矿场 | ALUMINUM_MINING (2) | 0 |
| 煤矿 | COAL_MINING (3) | 0 |
| 油田 | OIL_EXTRACTION (4) | 0 |
| 气田 | GAS_EXTRACTION (5) | 0 |
| 硅矿场 | SILICON_MINING (6) | 0 |
| 锂矿场 | LITHIUM_MINING (7) | 0 |
| 稀土矿 | RARE_EARTH_MINING (8) | 0 |
| 伐木场 | LOGGING (9) | 0 |
| 橡胶园 | RUBBER_HARVESTING (10) | 0 |
| 渔场 | FISH_FARMING (14) | 0 |
| 药材园 | HERB_CULTIVATION (15) | 0 |

### 农场（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| GRAIN_FARMING (11) | 0 | 粮食种植 |
| COTTON_FARMING (12) | 1 | 棉花种植 |

### 畜牧场
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| LIVESTOCK_BREEDING (13) | 0 | 牲畜养殖 |

### 有色金属冶炼厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| COPPER_SMELTING (17) | 0 | 铜冶炼 |
| ALUMINUM_SMELTING (18) | 1 | 铝冶炼 |

### 化工厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| CHEMICALS_PRODUCTION (20) | 0 | 化学品生产 |
| RUBBER_PRODUCTS (21) | 1 | 橡胶制品生产 |

### 纺织厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| TEXTILES_PRODUCTION (24) | 0 | 纺织品生产 |
| SILK_PRODUCTION (25) | 1 | 丝绸生产 |

### 食品厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| FOOD_PROCESSING (26) | 0 | 食品加工 |
| BEVERAGE_PRODUCTION (27) | 1 | 饮料生产 |
| SNACKS_PRODUCTION (28) | 2 | 零食生产 |
| FOOD_PRODUCTION (29) | 3 | 食品成品生产 |
| PET_FOOD_PRODUCTION (30) | 4 | 宠物食品生产 |

### 肉类加工厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| MEAT_PROCESSING (31) | 0 | 肉类加工 |
| FROZEN_FOOD_PRODUCTION (32) | 1 | 冷冻食品生产 |

### 建材厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| BUILDING_MATERIALS_PRODUCTION (35) | 0 | 建筑材料生产 |
| PACKAGING_PRODUCTION (36) | 1 | 包装材料生产 |

### 电子厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| ELECTRONICS_PRODUCTION (37) | 0 | 电子元件生产 |
| SMARTPHONE_ASSEMBLY (38) | 1 | 智能手机组装 |
| COMPUTER_ASSEMBLY (39) | 2 | 电脑组装 |
| DRONE_PRODUCTION (40) | 3 | 无人机生产 |

### 电池厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| BATTERY_PRODUCTION (42) | 0 | 电池生产 |
| ENERGY_STORAGE_PRODUCTION (43) | 1 | 储能系统生产 |
| SOLAR_SYSTEM_ASSEMBLY (44) | 2 | 光伏系统组装 |

### 零部件厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| MOTOR_PRODUCTION (45) | 0 | 电机生产 |
| SCREEN_PRODUCTION (46) | 1 | 屏幕生产 |
| CAR_PARTS_PRODUCTION (47) | 2 | 汽车零部件生产 |
| MECHANICAL_PARTS_PRODUCTION (48) | 3 | 机械部件生产 |
| AIRCRAFT_PARTS_PRODUCTION (49) | 4 | 航空部件生产 |
| CLOTHING_FABRIC_PRODUCTION (50) | 5 | 服装面料生产 |

### 汽车工厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| CAR_ASSEMBLY (51) | 0 | 燃油汽车组装 |
| ELECTRIC_CAR_ASSEMBLY (52) | 1 | 电动汽车组装 |
| LUXURY_CAR_ASSEMBLY (53) | 2 | 豪华汽车组装 |

### 家具厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| FURNITURE_PRODUCTION (55) | 0 | 家具生产 |
| CLOTHING_PRODUCTION (56) | 1 | 服装生产 |

### 新能源厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| SOLAR_PANEL_PRODUCTION (57) | 0 | 光伏板生产 |
| WIND_BLADE_PRODUCTION (58) | 1 | 风机叶片生产 |
| INDUSTRIAL_ROBOT_PRODUCTION (59) | 2 | 工业机器人生产 |

### 制药厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| PHARMA_BASE_PRODUCTION (60) | 0 | 医药原料生产 |
| ANTIBIOTIC_PRODUCTION (61) | 1 | 抗生素生产 |
| VACCINE_PRODUCTION (62) | 2 | 疫苗生产 |
| GENERIC_DRUG_PRODUCTION (63) | 3 | 仿制药生产 |
| PATENT_DRUG_PRODUCTION (64) | 4 | 专利药生产 |

### 医疗器械厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| MEDICAL_SUPPLIES_PRODUCTION (65) | 0 | 医用耗材生产 |
| MEDICAL_DEVICE_PRODUCTION (66) | 1 | 医疗设备生产 |

### 金矿/黄金精炼（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| GOLD_MINING (67) | 0 | 金矿开采 |
| DIAMOND_MINING (68) | 1 | 钻石矿开采 |
| GOLD_REFINING (69) | 2 | 黄金精炼 |

### 奢侈品工坊（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| JEWELRY_MAKING (70) | 0 | 珠宝制作 |
| LUXURY_WATCH_PRODUCTION (71) | 1 | 奢侈腕表生产 |
| DESIGNER_CLOTHING_PRODUCTION (72) | 2 | 设计师服装生产 |

### 发电厂（多产品）
| 原RecipeId | 新OutputModeId | 说明 |
|------------|----------------|------|
| COAL_POWER (73) | 0 | 燃煤发电 |
| GAS_POWER (74) | 1 | 燃气发电 |
| SOLAR_POWER (75) | 2 | 光伏发电 |

## 风险评估

### 高风险
- AI公司初始化（45家公司的建筑配置）
- 存档兼容性（旧存档的 recipeIds）

### 中风险
- AI决策逻辑（需要适配新的生产配置查询）
- 建造系统（队列中的配方信息）

### 低风险
- UI显示（只需更新API调用）
- 工具函数（简单的参数替换）

## 回滚计划

如果重构出现严重问题：
1. 保留 recipes.ts 文件备份
2. 在 buildings.ts 中添加向后兼容的 recipeId 属性
3. 可以渐进式迁移而非一次性替换

## 预计工作量

| Phase | 文件数 | 估计变更行数 |
|-------|--------|-------------|
| B | 3 | ~300 |
| C | 5 | ~800 |
| D | 2 | ~200 |
| E | 8 | ~400 |
| F | 1 | 删除 |
| G | - | 测试 |

**总计**: ~1700行代码变更