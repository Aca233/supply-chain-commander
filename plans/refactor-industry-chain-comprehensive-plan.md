# 产业链、商品、建筑、公司 综合重构计划

## 📋 项目概述

本计划旨在重构供应链指挥官游戏的核心系统架构，建立统一的产业链分类体系，优化商品、建筑和公司的组织结构。

---

## ✅ 已完成工作

### 1. 产业链分类体系

已建立13个产业链分类，覆盖完整的工业生产链条：

| ID | 产业链 | 英文标识 | 图标 | 颜色 |
|----|--------|----------|------|------|
| 1 | 矿业 | mining | ⛏️ | 蓝色 |
| 2 | 能源 | energy | ⚡ | 黄色 |
| 3 | 农林牧渔 | agriculture | 🌾 | 绿色 |
| 4 | 食品加工 | food | 🍞 | 橙色 |
| 5 | 化工 | chemical | 🧪 | 紫色 |
| 6 | 冶金 | metallurgy | 🔧 | 灰色 |
| 7 | 纺织服装 | textile | 🧵 | 粉色 |
| 8 | 电子通信 | electronics | 📱 | 青色 |
| 9 | 汽车交通 | automotive | 🚗 | 红色 |
| 10 | 家电家居 | appliance | 🏠 | 靛蓝 |
| 11 | 新能源 | newEnergy | 🔋 | 翠绿 |
| 12 | 医药健康 | pharma | 💊 | 玫红 |
| 13 | 奢侈品 | luxury | 💎 | 金色 |

### 2. 商品系统重构 (`src/data/goods.ts`)

**总计：80种商品 (ID 0-79)**

#### 按产业链分类：

```typescript
export const GOODS_BY_INDUSTRY = {
  mining: [0, 1, 2, 3, 4, 5],           // 铁矿石、煤�ite、铜矿、铝土矿、稀土、锂矿
  energy: [6, 7, 8, 9],                  // 原油、天然气、电力、氢气
  agriculture: [10, 11, 12, 13, 14, 15, 16, 17], // 小麦、玉米、大豆、棉花、木材、橡胶、羊毛、皮革
  food: [18, 19, 20, 21, 22, 23],        // 面粉、食用油、肉类、乳制品、饮料、加工食品
  chemical: [24, 25, 26, 27, 28, 29],    // 塑料、化肥、农药、涂料、粘合剂、溶剂
  metallurgy: [30, 31, 32, 33, 34, 35],  // 钢铁、铝材、铜材、合金钢、不锈钢、铸件
  textile: [36, 37, 38, 39, 40],         // 棉纱、布料、成衣、皮具、时装
  electronics: [41, 42, 43, 44, 45, 46, 47, 48, 49], // 芯片、PCB、电池、显示屏、传感器、手机、电脑、服务器、通信设备
  automotive: [50, 51, 52, 53, 54, 55],  // 发动机、变速箱、轮胎、汽车零部件、乘用车、商用车
  appliance: [56, 57, 58, 59, 60, 61],   // 压缩机、电机、家用电器、厨房电器、空调、照明设备
  newEnergy: [62, 63, 64, 65, 66, 67],   // 锂电池、太阳能板、风力发电机、储能系统、电动汽车、充电设备
  pharma: [68, 69, 70, 71, 72, 73],      // 原料药、中间体、成品药、医疗器械、疫苗、保健品
  luxury: [74, 75, 76, 77, 78, 79],      // 珠宝、手表、香水、高档服饰、艺术品、奢侈皮具
};
```

### 3. 建筑系统重构 (`src/data/buildings.ts`)

**总计：40种建筑 (ID 0-39)**

#### 按产业链分类：

```typescript
export const BUILDINGS_BY_INDUSTRY = {
  mining: [0, 1, 2],        // 铁矿场、煤矿、铜矿场
  energy: [3, 4, 5],        // 油田、天然气田、发电厂
  agriculture: [6, 7, 8],   // 农场、林场、牧场
  food: [9, 10],            // 食品加工厂、饮料厂
  chemical: [11, 12],       // 化工厂、塑料厂
  metallurgy: [13, 14, 15], // 炼钢厂、铝冶炼厂、铸造厂
  textile: [16, 17],        // 纺织厂、服装厂
  electronics: [18, 19, 20, 21], // 芯片工厂、电子组装厂、手机工厂、电脑工厂
  automotive: [22, 23, 24], // 发动机厂、汽车组装厂、轮胎厂
  appliance: [25, 26],      // 家电工厂、照明工厂
  newEnergy: [27, 28, 29],  // 锂电池工厂、太阳能工厂、风电设备厂
  pharma: [30, 31],         // 制药厂、医疗器械厂
  luxury: [32, 33],         // 珠宝工坊、奢侈品工厂
  retail: [34, 35, 36],     // 零售店、超市、专卖店
  logistics: [37, 38, 39],  // 仓库、物流中心、配送站
};
```

#### 建筑结构特性：

- **内嵌生产配置**：每个建筑定义包含完整的 `production` 配置
- **多产品模式**：支持 `outputModes` 定义多种产品线
- **等级系统**：每级提供效率加成
- **维护成本**：包含运营和人工成本

### 4. 公司系统 (`src/core/ai/AIPersonality.ts`)

**总计：45家AI公司**

- 使用 `outputModeId` 替代旧的 `recipeId`
- 每家公司有独立的性格特征和经营策略
- 支持多种建筑类型和产品线

### 5. 旧配方系统清理

- ✅ 删除 `src/data/recipes.ts` 文件
- ✅ 清理所有 `recipeId` 引用
- ✅ 统一使用 `outputModeId` 系统

### 6. UI组件更新

#### BuildingCatalog.tsx
- 使用 `BUILDINGS_BY_INDUSTRY` 进行分类展示
- 配置 `INDUSTRY_CONFIG` 定义每个产业链的显示样式

#### BuildModal.tsx
- 更新 `getBuildingIndustry()` 函数匹配新分类
- 显示产业链标签而非旧分类

#### Market.tsx
- 使用 `GOODS_BY_INDUSTRY` 进行商品分类
- 支持按产业链筛选和搜索

### 7. 系统修复

#### AIWorkerManager.ts
- 添加 `upgrade` 和 `demolish` 决策类型处理器
- 解决控制台警告问题

---

## 🔧 技术架构

### 数据流

```
产业链定义 (INDUSTRY_CONFIG)
    ↓
商品分类 (GOODS_BY_INDUSTRY) ← 建筑分类 (BUILDINGS_BY_INDUSTRY)
    ↓                              ↓
ALL_GOODS (80种)              ALL_BUILDINGS (40种)
    ↓                              ↓
生产系统 (ProductionEngine) ← outputModeId
    ↓
公司系统 (AIPersonality) → 45家AI公司
```

### 核心模块关系

```
GameWorld
├── buildings (建筑数据)
│   ├── types[] (建筑类型ID)
│   ├── owners[] (所有者公司ID)
│   ├── levels[] (建筑等级)
│   └── outputModeIds[] (产品模式)
├── goods (商品数据)
│   ├── prices[] (市场价格)
│   └── volumes[] (交易量)
├── companies (公司数据)
│   ├── cash[] (现金)
│   ├── inventories[] (库存)
│   └── buildingCounts[] (建筑数量)
└── construction (建造队列)
    ├── buildingTypeIds[]
    └── outputModeIds[]
```

---

## 📈 后续改进方向

### Phase 1: 产业链深化

1. **产业关联度系统**
   - 定义上下游产业链关系
   - 实现原材料供应链追踪
   - 添加产业集群效应

2. **区域经济系统**
   - 不同区域的产业优势
   - 运输成本和时间
   - 区域市场差异化

### Phase 2: 商品系统增强

1. **商品品质等级**
   - 实现5级品质系统
   - 品质影响价格和需求
   - 生产工艺影响品质

2. **商品生命周期**
   - 保质期和折旧
   - 库存成本计算
   - 过期处理机制

### Phase 3: 建筑系统扩展

1. **科技树系统**
   - 研发解锁新建筑
   - 建筑升级路线
   - 专利和技术授权

2. **建筑协同效应**
   - 同产业链建筑加成
   - 供应链整合奖励
   - 集群经济效益

### Phase 4: 公司系统优化

1. **公司文化系统**
   - 员工满意度
   - 品牌声誉
   - 社会责任

2. **竞争与合作**
   - 市场份额争夺
   - 联盟与合作
   - 反垄断机制

---

## 📁 关键文件清单

| 文件路径 | 说明 | 状态 |
|----------|------|------|
| `src/data/goods.ts` | 商品定义和分类 | ✅ 已更新 |
| `src/data/buildings.ts` | 建筑定义和分类 | ✅ 已更新 |
| `src/data/buildingMaterials.ts` | 建造材料需求 | ✅ 已更新 |
| `src/core/ai/AIPersonality.ts` | AI公司配置 | ✅ 已更新 |
| `src/core/production/ProductionEngine.ts` | 生产引擎 | ✅ 已更新 |
| `src/ui/components/Production/BuildingCatalog.tsx` | 建筑目录UI | ✅ 已更新 |
| `src/ui/components/Production/BuildModal.tsx` | 建造弹窗UI | ✅ 已更新 |
| `src/ui/pages/Market.tsx` | 市场页面 | ✅ 已更新 |
| `src/core/workers/AIWorkerManager.ts` | AI决策管理 | ✅ 已修复 |

---

## 🎯 验证清单

- [x] 80种商品正确分类到13个产业链
- [x] 40种建筑正确分类到13个产业链
- [x] 45家AI公司使用新的outputModeId系统
- [x] 建筑目录按产业链展示
- [x] 市场页面按产业链分类商品
- [x] 编译无错误 (`npm run build` 成功)
- [x] 游戏正常运行 (1099个建筑初始化)
- [x] 无控制台警告 (upgrade/demolish已处理)

---

## 📝 更新日志

### 2026-01-30
- 完成产业链分类体系设计
- 重构商品系统 (80种商品)
- 重构建筑系统 (40种建筑)
- 更新UI组件匹配新分类
- 修复AIWorkerManager警告
- 删除废弃的recipes.ts文件

---

*文档版本: 1.0*
*最后更新: 2026-01-30*