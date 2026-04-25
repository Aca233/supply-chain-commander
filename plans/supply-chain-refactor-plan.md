# 产业链、商品、建筑、公司重构计划

## 一、当前状态总结

### 1.1 已完成的重构

| 模块 | 状态 | 描述 |
|------|------|------|
| `goods.ts` | ✅ 完成 | 80种商品（ID 0-79），4层产业链结构 |
| `buildings.ts` | ✅ 完成 | 40种建筑（ID 0-39），内置`production`属性和`outputModes` |
| `AIPersonality.ts` | ✅ 完成 | 45家AI公司，使用`outputModeId`替代`recipeId` |
| `buildingMaterials.ts` | ✅ 完成 | 建筑材料定义已更新 |
| `ProductionEngine.ts` | ✅ 完成 | 使用`getBuildingProduction()`获取生产配置 |

### 1.2 新架构设计

**核心变更：删除配方机制，将生产配置内置到建筑定义中**

```typescript
// 旧架构（需要删除）
world.buildings.recipeIds[i]  // 配方ID
RECIPES.find(r => r.id === recipeId)  // 配方查找

// 新架构
world.buildings.outputModeIds[i]  // 产品模式ID
getBuildingProduction(buildingTypeId, outputModeId)  // 获取生产配置
```

### 1.3 产业链结构（4层）

| 层级 | 类别 | ID范围 | 商品数量 | 示例 |
|------|------|--------|----------|------|
| Tier 0 | 原材料 | 0-17 | 18种 | 铁矿石、煤炭、粮食 |
| Tier 1 | 基础材料 | 18-35 | 18种 | 钢材、塑料、肉类 |
| Tier 2 | 中间品 | 36-55 | 20种 | 电子元件、芯片、电池 |
| Tier 3 | 最终产品 | 56-79 | 24种 | 智能手机、汽车、珠宝 |

### 1.4 建筑分类（40种）

| 类别 | ID范围 | 数量 | 示例 |
|------|--------|------|------|
| 采掘类 | 0-14 | 15种 | 铁矿场、煤矿、农场 |
| 加工类 | 15-26 | 12种 | 钢铁厂、炼油厂、食品厂 |
| 制造类 | 27-36 | 10种 | 电子厂、汽车工厂、制药厂 |
| 奢侈品 | 37-38 | 2种 | 金矿/黄金精炼、奢侈品工坊 |
| 服务类 | 39 | 1种 | 发电厂 |

### 1.5 AI公司分布（45家）

| 类别 | 数量 | ID范围 | 示例 |
|------|------|--------|------|
| 采掘公司 | 8家 | 1-8 | 中钢矿业、神华煤炭 |
| 农业公司 | 3家 | 9-11 | 中粮集团、新希望牧业 |
| 加工公司 | 10家 | 12-21 | 宝钢集团、中石化 |
| 制造公司 | 12家 | 22-33 | 华为终端、比亚迪 |
| 医药公司 | 3家 | 34-36 | 同仁堂、恒瑞医药 |
| 奢侈品公司 | 2家 | 37-38 | 珠宝集团、奢侈品工坊 |
| 能源公司 | 2家 | 39-40 | 华能集团、绿色电力 |
| 产业链开拓者 | 5家 | 41-45 | 产业链投资、基础材料 |

---

## 二、待完成的重构任务

### 2.1 Phase B：核心系统更新

#### B.1 更新 GameWorld.ts
- [ ] 将 `recipeIds: Int32Array` 改为 `outputModeIds: Int32Array`
- [ ] 更新相关注释和类型定义

#### B.2 更新 WorldInitializer.ts
- [ ] `addBuilding()` 函数：参数从 `recipeId` 改为 `outputModeId`
- [ ] 初始化逻辑适配新的数据结构

#### B.3 更新 SaveManager.ts
- [ ] 保存时使用 `outputModeIds` 而非 `recipeIds`
- [ ] 加载时兼容处理（旧存档迁移）

### 2.2 Phase C：AI系统更新

#### C.1 更新 AIDecisionEngine.ts（核心，约20+处修改）

需要修改的代码位置：

| 行号范围 | 引用类型 | 修改说明 |
|----------|----------|----------|
| L27 | Import | 删除 `import { RECIPES }` |
| L205 | Interface | `BuildingIntent.recipeId` → `outputModeId` |
| L232-248 | Function | `addBuildingIntent` 使用 `outputModeId` |
| L245-250 | Function | `removeBuildingIntent` 使用 `outputModeId` |
| L382-383 | Execution | `tryExecuteBuild` 使用 `outputModeId` |
| L434 | Call | `addBuilding()` 传递 `outputModeId` |
| L634-638 | Decision | 获取生产信息改用 `getBuildingProduction()` |
| L770-780 | Trading | 原材料需求计算改用新方式 |
| L1059-1064 | Trading | 买入决策改用新方式 |
| L1181-1250 | Investment | 投资决策全部改用 `getBuildingProduction()` |
| L1417-1529 | Helpers | 辅助函数改用新API |
| L1769-1810 | Helpers | 供应链计算改用新API |
| L2254-2258 | Execution | 验证逻辑移除配方检查 |
| L3401-3424 | Output | `estimateDailyOutput` 改用新API |
| L3455-3565 | AutoBuy | 自动采购改用新API |
| L3720-3830 | Subsidiary | 附属建筑评估改用新API |
| L4074-4110 | Strategic | 战略建材检查改用新API |
| L4215-4290 | ZeroSupply | 零供应检测改用新API |
| L4438-4580 | ColdGoods | 冷门商品检测改用新API |

**替换模式：**
```typescript
// 旧代码
const recipeId = world.buildings.recipeIds[i];
const recipe = RECIPES.find(r => r.id === recipeId);
const outputs = recipe.outputs;
const inputs = recipe.inputs;

// 新代码
const buildingTypeId = world.buildings.types[i];
const outputModeId = world.buildings.outputModeIds[i];
const production = getBuildingProduction(buildingTypeId, outputModeId);
const outputs = production?.outputs || [];
const inputs = production?.inputs || [];
```

#### C.2 更新其他AI文件
- [ ] `AIProductionOptimizer.ts` - 生产优化使用新API
- [ ] `PlayerAutoTrader.ts` - 玩家自动交易使用新API
- [ ] `CompetitiveIntelligence.ts` - 竞争情报（如有引用）
- [ ] `StrategicPlanner.ts` - 战略规划（如有引用）

### 2.3 Phase D：建造系统更新

#### D.1 更新 ConstructionManager.ts
- [ ] `startConstruction()` 参数改用 `outputModeId`
- [ ] 建造项目存储改用 `outputModeId`

#### D.2 更新 ConstructionTick.ts
- [ ] 建造完成时传递 `outputModeId`

### 2.4 Phase E：其他系统更新

#### E.1 更新 gameStore.ts
- [ ] UI状态管理中的配方引用
- [ ] 建筑面板相关状态

#### E.2 更新 UI组件
- [ ] 建筑信息面板
- [ ] 生产方式选择器
- [ ] 建筑建造对话框

### 2.5 Phase F：清理

#### F.1 删除 recipes.ts
- [ ] 删除 `src/data/recipes.ts` 文件
- [ ] 删除所有 `import { RECIPES }` 语句
- [ ] 删除 `RecipeDefinition` 类型引用

#### F.2 类型清理
- [ ] 移除 `recipeId` 相关类型定义
- [ ] 更新 TypeScript 接口

---

## 三、数据结构对比

### 3.1 BuildingIntent 接口

```typescript
// 旧版本
interface BuildingIntent {
  companyId: number;
  buildingTypeId: number;
  recipeId: number;  // ❌ 删除
  cost: number;
  createdTick: number;
  attempts: number;
  materialsOrdered: boolean;
}

// 新版本
interface BuildingIntent {
  companyId: number;
  buildingTypeId: number;
  outputModeId: number;  // ✅ 替换
  cost: number;
  createdTick: number;
  attempts: number;
  materialsOrdered: boolean;
}
```

### 3.2 GameWorld.buildings 结构

```typescript
// 旧版本
buildings: {
  types: Int32Array;
  recipeIds: Int32Array;  // ❌ 删除
  owners: Int32Array;
  levels: Int32Array;
  // ...
}

// 新版本
buildings: {
  types: Int32Array;
  outputModeIds: Int32Array;  // ✅ 替换
  owners: Int32Array;
  levels: Int32Array;
  // ...
}
```

### 3.3 addBuilding 函数签名

```typescript
// 旧版本
function addBuilding(world: GameWorld, companyId: number, buildingTypeId: number, recipeId: number): number

// 新版本
function addBuilding(world: GameWorld, companyId: number, buildingTypeId: number, outputModeId: number): number
```

---

## 四、实施顺序

### 第一阶段：核心数据结构（预计2小时）
1. 更新 `GameWorld.ts` - `recipeIds` → `outputModeIds`
2. 更新 `WorldInitializer.ts` - `addBuilding()` 函数
3. 更新 `SaveManager.ts` - 保存/加载兼容

### 第二阶段：AI决策引擎（预计4小时）
1. 更新 `AIDecisionEngine.ts` 中所有配方引用
2. 更新辅助函数使用新API
3. 更新建造意向队列系统

### 第三阶段：建造系统（预计1小时）
1. 更新 `ConstructionManager.ts`
2. 更新 `ConstructionTick.ts`

### 第四阶段：其他系统（预计2小时）
1. 更新 `gameStore.ts`
2. 更新相关UI组件
3. 更新其他AI辅助模块

### 第五阶段：清理和测试（预计1小时）
1. 删除 `recipes.ts`
2. 清理所有import语句
3. 编译测试
4. 运行时测试

---

## 五、风险评估

### 5.1 高风险点
- **AIDecisionEngine.ts** - 代码量大（4600+行），修改点多
- **存档兼容性** - 旧存档使用 `recipeIds`，需要迁移处理

### 5.2 中风险点
- **生产效率变化** - 新API可能有性能差异
- **边界情况** - 单产品建筑的 `outputModeId` 固定为0

### 5.3 缓解措施
- 分阶段提交，每阶段编译验证
- 保留旧存档加载兼容（字段映射）
- 充分的日志记录便于调试

---

## 六、OutputModeId 参考表

### 6.1 单产品建筑（outputModeId = 0）

| 建筑ID | 建筑名称 | 默认产出 |
|--------|----------|----------|
| 0 | 铁矿场 | 铁矿石 |
| 1 | 铜矿场 | 铜矿石 |
| 2 | 铝矿场 | 铝土矿 |
| 3 | 煤矿 | 煤炭 |
| 4 | 油田 | 原油 |
| 5 | 气田 | 天然气 |
| 6 | 硅矿场 | 硅石 |
| 7 | 锂矿场 | 锂矿 |
| 8 | 稀土矿 | 稀土 |
| 9 | 伐木场 | 木材 |
| 11 | 橡胶园 | 天然橡胶 |
| 12 | 畜牧场 | 牲畜 |
| 13 | 渔场 | 水产 |
| 14 | 药材园 | 药材 |
| 15 | 钢铁厂 | 钢材 |
| 17 | 炼油厂 | 燃油+塑料 |
| 19 | 玻璃厂 | 玻璃 |
| 20 | 水泥厂 | 水泥 |
| 21 | 造纸厂 | 纸张 |
| 25 | 乳品厂 | 乳制品 |
| 28 | 半导体厂 | 芯片 |
| 32 | 家电厂 | 家电 |

### 6.2 多产品建筑（按modeId）

#### 农场 (BuildingId = 10)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 粮食种植 | 粮食 |
| 1 | 棉花种植 | 棉花 |

#### 有色金属冶炼厂 (BuildingId = 16)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 铜冶炼 | 铜材 |
| 1 | 铝冶炼 | 铝材 |

#### 化工厂 (BuildingId = 18)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 化学品生产 | 化学品 |
| 1 | 橡胶制品生产 | 橡胶制品 |

#### 纺织厂 (BuildingId = 22)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 纺织品生产 | 纺织品 |
| 1 | 丝绸生产 | 丝绸 |

#### 食品厂 (BuildingId = 23)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 食品加工 | 加工食品 |
| 1 | 饮料生产 | 饮料 |
| 2 | 零食生产 | 零食 |
| 3 | 食品成品生产 | 食品 |
| 4 | 宠物食品生产 | 宠物食品 |

#### 电子厂 (BuildingId = 27)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 电子元件生产 | 电子元件 |
| 1 | 智能手机组装 | 智能手机 |
| 2 | 电脑组装 | 电脑 |
| 3 | 无人机生产 | 无人机 |

#### 电池厂 (BuildingId = 29)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 电池生产 | 电池 |
| 1 | 储能系统生产 | 储能系统 |
| 2 | 光伏系统组装 | 光伏系统 |

#### 零部件厂 (BuildingId = 30)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 电机生产 | 电机 |
| 1 | 屏幕生产 | 屏幕 |
| 2 | 汽车零部件生产 | 汽车零件 |
| 3 | 机械部件生产 | 机械部件 |
| 4 | 航空部件生产 | 航空部件 |
| 5 | 服装面料生产 | 服装面料 |

#### 汽车工厂 (BuildingId = 31)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 燃油汽车组装 | 燃油汽车 |
| 1 | 电动汽车组装 | 电动汽车 |
| 2 | 豪华汽车组装 | 豪华汽车 |

#### 家具厂 (BuildingId = 33)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 家具生产 | 家具 |
| 1 | 服装生产 | 服装 |

#### 新能源厂 (BuildingId = 34)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 光伏板生产 | 光伏板 |
| 1 | 风机叶片生产 | 风机叶片 |
| 2 | 工业机器人生产 | 工业机器人 |

#### 制药厂 (BuildingId = 35)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 医药原料生产 | 医药原料 |
| 1 | 抗生素生产 | 抗生素 |
| 2 | 疫苗生产 | 疫苗 |
| 3 | 仿制药生产 | 仿制药 |
| 4 | 专利药生产 | 专利药 |

#### 医疗器械厂 (BuildingId = 36)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 医用耗材生产 | 医用耗材 |
| 1 | 医疗设备生产 | 医疗设备 |

#### 金矿/黄金精炼 (BuildingId = 37)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 金矿开采 | 金矿石 |
| 1 | 钻石矿开采 | 钻石原石 |
| 2 | 黄金精炼 | 黄金 |

#### 奢侈品工坊 (BuildingId = 38)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 珠宝制作 | 珠宝 |
| 1 | 奢侈腕表生产 | 奢侈腕表 |
| 2 | 设计师服装生产 | 设计师服装 |

#### 发电厂 (BuildingId = 39)
| modeId | 模式名称 | 产出 |
|--------|----------|------|
| 0 | 燃煤发电 | 电力 |
| 1 | 燃气发电 | 电力 |
| 2 | 光伏发电 | 电力 |

---

## 七、完成标准

### 7.1 功能验证
- [ ] 所有建筑可正常创建
- [ ] 所有生产模式可正常切换
- [ ] AI公司能正确选择生产模式
- [ ] 存档保存/加载正常
- [ ] 无TypeScript编译错误

### 7.2 性能验证
- [ ] 决策引擎响应时间无明显增加
- [ ] 内存使用无明显增加
- [ ] 游戏运行流畅度正常

### 7.3 兼容性验证
- [ ] 旧存档能正确迁移
- [ ] UI正确显示生产信息
- [ ] 市场交易正常运作

---

*计划创建时间: 2026-01-30*
*预计总工时: 10小时*