# 生产方式系统重构计划

> 状态：草案 v1（待用户确认映射表与策略后进入实施）
> 触发任务：将「原来的配方」（即 `src/core/production/methods/` 下 7 个未注册的孤立目录）迁移到当前 5 行业注册体系，并彻底删除老 `BUILDING_SLOT_CONFIGS` 体系。

---

## 0. 关键调查结论

### 0.1 当前状态（已确认）

| 体系 | 入口 | 覆盖建筑 | 注册位置 |
| --- | --- | --- | --- |
| **新已注册** | `methods/index.ts → initializeProductionMethods()` | **0–39 全部 40 个建筑** | `extraction / processing / manufacturing / luxury / service` |
| **孤立目录（未注册）** | 仅文件存在，无 import | 7 个目录使用 25-28、29-31、37-41、47-51、52-56、57-61、62-106 等**已废弃 ID** | `agriculture / pharma / defense / tech / consumer / transport / misc` |
| **老硬编码** | `ProductionMethods.ts` 中 `BUILDING_SLOT_CONFIGS` | 0-31 + retail（已废弃） | 同文件 502-663 行 |

### 0.2 重大发现

**孤立目录大部分内容已在已注册的 5 行业目录中重新实现**：

- `agriculture/VEGETABLE_FARM_CONFIG (旧 25)` ⟶ 已被 `extraction/FARM_CONFIG (id 10)` 取代且**更精细**
- `agriculture/LIVESTOCK_FARM_CONFIG (旧 26)` ⟶ 已被 `extraction/LIVESTOCK_FARM_CONFIG (id 12)` 取代
- `agriculture/FISHERY_CONFIG (旧 27)` ⟶ 已被 `extraction/FISHERY_CONFIG (id 13)` 取代
- `agriculture/MEAT_PROCESSING_CONFIG (旧 28)` ⟶ 已被 `processing/MEAT_PROCESSING_CONFIG (id 24)` 取代
- `pharma/HERB_FARM_CONFIG (旧 29)` ⟶ 已被 `extraction/HERB_FARM_CONFIG (id 14)` 取代
- `pharma/PHARMACEUTICAL_FACTORY_CONFIG (旧 30)` ⟶ 已被 `manufacturing/PHARMA_FACTORY_CONFIG (id 35)` 取代
- `pharma/MEDICAL_DEVICE_FACTORY_CONFIG (旧 31)` ⟶ 已被 `manufacturing/MEDICAL_DEVICE_FACTORY_CONFIG (id 36)` 取代
- `consumer/PAPER_MILL_CONFIG (旧 54)` ⟶ 已被 `processing/PAPER_MILL_CONFIG (id 21)` 取代
- `transport/PARTS_FACTORY_CONFIG (旧 61)` ⟶ 已被 `manufacturing/PARTS_FACTORY_CONFIG (id 30)` 取代
- `manufacturing/BATTERY_FACTORY_CONFIG (id 29)` 与 `misc/BATTERY_FACTORY_CONFIG (旧 77)` 重复

**结论**：迁移工作**不是**「把孤立目录原样搬过来」，而是 ——

1. 抽取孤立目录中**当前未实现**的 slot/method 设计补充到已注册配置中；
2. 整体删除 7 个孤立目录；
3. 删除老硬编码 `BUILDING_SLOT_CONFIGS` 体系及其分发分支；
4. 不存在「新建筑 ID」的需要（40 建筑系统已稳定）。

---

## 1. 旧建筑名 ↔ 当前 ID 映射表

### 1.1 agriculture/ （4 个 config）

| 旧名（旧 ID） | 当前对应 | 处置 |
| --- | --- | --- |
| 蔬菜农场 (25) | 农场 (10) | 合并：抽取「精准农业」「智能施肥」等差异化方法补到 `FARM_CONFIG` |
| 畜牧场 (26) | 畜牧场 (12) | 合并：抽取 breeding/feeding/health 三槽设计补到 `LIVESTOCK_FARM_CONFIG` |
| 渔场 (27) | 渔场 (13) | 合并：抽取 aquaculture/water_mgmt 设计补到 `FISHERY_CONFIG` |
| 肉类加工厂 (28) | 肉类加工厂 (24) | 合并：抽取 slaughter/preservation/product_type 设计补到 `MEAT_PROCESSING_CONFIG` |

### 1.2 pharma/ （3 个 config）

| 旧名（旧 ID） | 当前对应 | 处置 |
| --- | --- | --- |
| 药材种植园 (29) | 药材园 (14) | 合并到 `HERB_FARM_CONFIG` |
| 制药厂 (30) | 制药厂 (35) | 合并到 `PHARMA_FACTORY_CONFIG` |
| 医疗器械厂 (31) | 医疗器械厂 (36) | 合并到 `MEDICAL_DEVICE_FACTORY_CONFIG` |

### 1.3 defense/ （5 个 config）

| 旧名（旧 ID） | 当前对应 | 处置 |
| --- | --- | --- |
| 军工厂 (37) | — | **丢弃**（当前 37 = 金矿，无军工建筑） |
| 弹药厂 (38) | — | **丢弃**（当前 38 = 奢侈品工坊） |
| 航空厂 (39) | — | **丢弃**（当前 39 = 发电厂） |
| 军舰厂 (40) | — | **丢弃**（无对应） |
| 导弹厂 (41) | — | **丢弃**（无对应） |

> 国防产业链当前不在 0-39 范围内 ⇒ 整个 defense/ 目录可整体删除，无内容可合并。

### 1.4 tech/ （5 个 config）

| 旧名（旧 ID） | 当前对应 | 处置 |
| --- | --- | --- |
| 软件公司 (47) | — | **丢弃**（无对应） |
| 数据中心 (48) | — | **丢弃**（无对应） |
| AI 研究所 (49) | — | **丢弃**（无对应） |
| 量子计算中心 (50) | — | **丢弃**（无对应） |
| 光伏厂 (51) | 新能源厂 (34) 的子模式 | **可选合并**：可作为 `NEW_ENERGY_FACTORY_CONFIG` 的「光伏面板生产」method 已存在 ⇒ 直接丢弃 |

### 1.5 consumer/ （5 个 config）

| 旧名（旧 ID） | 当前对应 | 处置 |
| --- | --- | --- |
| 日化厂 (52) | — | **丢弃**（无独立日化建筑） |
| 塑料厂 (53) | 化工厂 (18) 的橡胶/塑料模式 | **可选合并**至 `CHEMICAL_PLANT_CONFIG` |
| 造纸厂 (54) | 造纸厂 (21) | 合并到 `PAPER_MILL_CONFIG`（如有差异化方法） |
| 印刷厂 (55) | — | **丢弃**（无对应） |
| 包装厂 (56) | 建材厂 (26) 的包装材料模式 | **丢弃**（已存在「包装材料生产」method） |

### 1.6 transport/ （5 个 config）

| 旧名（旧 ID） | 当前对应 | 处置 |
| --- | --- | --- |
| 铁路机车厂 (57) | — | **丢弃** |
| 摩托车厂 (58) | — | **丢弃** |
| 自行车厂 (59) | — | **丢弃** |
| 轮胎厂 (60) | 化工厂 (18) 橡胶制品 | **丢弃**（已覆盖） |
| 零部件厂 (61) | 零部件厂 (30) | 合并到 `PARTS_FACTORY_CONFIG`（如有差异化方法） |

### 1.7 misc/ （45 个 config，62-106）

绝大部分**无对应**，仅以下少量可考虑合并：

| 旧名（旧 ID） | 当前对应 | 处置 |
| --- | --- | --- |
| 稀土矿 (62) | 稀土矿 (8) | 合并 |
| 锂矿 (63) | 锂矿场 (7) | 合并 |
| 电池厂 (77) | 电池厂 (29) | 合并 |
| 智能手机厂 (84) | 电子厂 (27) | 合并到电子厂的「智能手机组装」method |
| 家具厂 (96) | 家具厂 (33) | 合并 |
| 超市 (101) | 超市 (41) | 零售类，**忽略**（零售不走 method 系统） |
| 便利店 (102) | 便利店 (40) | 零售类，**忽略** |
| 百货 (103) | 综合百货 (49) | 零售类，**忽略** |

> misc/ 中 ~35 个建筑（钴矿、钨矿、印染厂、酒店、餐厅、教育、医院、银行、电影、游戏、出版、广告、娱乐、玩具、运动、烟草、酿造等）当前 0-39 系统中均无对应 ⇒ **全部丢弃**。

---

## 2. 「破坏性存档升级」的具体范围

| 项 | 现状 | 改动 |
| --- | --- | --- |
| `SerializedWorld.buildings` | **不含** `slotMethods` 字段 | **新增** `slotMethods: number[]`（长度 = `buildings.count * MAX_SLOTS`） |
| `CURRENT_VERSION` | `'1.0.0'` | 升至 `'2.0.0'` |
| 老存档加载 | 当前可加载 1.x | **明确拒绝**：`load()` 检测到旧 version → 返回 null + 提示「不兼容」 |
| `outputModeIds` 兼容分支（`recipeIds` 迁移） | 仍存在 | **删除**（与本任务一并清理遗留兼容代码） |

---

## 3. 分阶段交付（每阶段独立可合并）

### Phase A — 映射表确认（本文档）
- 输出物：本计划文档 + 用户确认。
- 用户决策点：是否接受「defense/tech/consumer/transport 目录大部分丢弃」「misc 目录大部分丢弃」。

### Phase B — 存档结构升级（破坏性）
- 改 `SaveManager.SerializedWorld.buildings` 增加 `slotMethods`。
- 改 `serializeWorld` / `deserializeWorld` 处理 `slotMethods`。
- `CURRENT_VERSION = '2.0.0'`，老版本拒绝加载并提示。
- 删除 `migrateRecipeIdsToOutputModeIds` 与 `recipeIds` 兼容分支。
- 同步更新 `__tests__/Save*.test.ts`（如存在）。

### Phase C — 内容合并（按 §1 映射表）
按行业分 5 个独立 PR：
- C1：agriculture → 合并到 extraction（农场/畜牧场/渔场）+ processing（肉类加工）
- C2：pharma → 合并到 extraction（药材园）+ manufacturing（制药厂/医疗器械厂）
- C3：consumer/transport 残留 → 合并到 processing（造纸厂）+ manufacturing（零部件厂）+ processing（化工厂橡胶模式）
- C4：misc 少数有效项 → 合并到 extraction（稀土/锂）+ manufacturing（电池/家具/电子）
- C5：删除 7 个孤立目录文件。

每个 PR 仅触碰当前注册目录中对应建筑的 config，**不增减 slot 类型字符串**，避免破坏 UI tab。

### Phase D — 老体系全量删除
- 删除 `ProductionMethods.ts` 中：
  - `ProductionSlotType` / `ProductionMethod` 类型
  - `PROCESS_METHODS` / `AUTOMATION_METHODS` / `ENERGY_METHODS` / `QUALITY_METHODS` / `ENVIRONMENT_METHODS`
  - `BUILDING_SLOT_CONFIGS` / `SLOT_CONFIGS_BY_BUILDING`
  - `calculateProductionModifiers`（老路径）
  - `convertComputedModifiersToLegacy`（兼容转换器，新统一返回新 shape）
  - `hasBuildingSpecificMethods`（恒为 true，不再需要）
- 删除以下文件中所有 `hasBuildingSpecificMethods(...)` 分发分支（41 处，关键 hub）：
  - `src/stores/gameStore.ts`：行 162 / 1337 / 1375 / 1460
  - `src/core/production/ProductionEngine.ts`：行 35 / 198-222
- `getProductionModifiersForBuilding` 重命名为 `getProductionModifiers`（无需再加 `forBuilding` 后缀）。

### Phase E — 类型与命名收尾
- `BuildingMethodConfig` / `BuildingProductionMethod` 改为默认对象类型；移除 `Production*` 旧前缀。
- 更新 `getDefaultSlotMethods` / `getBuildingSlotCount` 单走 registry。
- 删除 `newSystemInitialized` 标志位（恒为 true）。
- Lint + tsc 全绿；跑 `ProductionEngine` / `ConsumerMarket` / `RetailSystem` / `SaveManager` 测试。

---

## 4. 待用户确认事项

1. **是否接受「defense/tech/consumer-塑料&印刷&日化/transport-机车&摩托&自行车 全部丢弃」**？（这是孤立目录覆盖的「未来扩展产业链」，当前 40 建筑系统无对应。）
2. **misc 中无对应的 ~35 个建筑（酒店、餐厅、医院、银行、文娱产业等）一并丢弃**？
3. **存档版本是否直接跳到 `2.0.0` 并拒绝加载旧版**？（备选：保留警告但允许丢失 slotMethods 加载。）
4. **Phase C 是否需要严格按 5 个 PR 拆分**，还是可以合并为「扩展行业」「misc 残留」两个 PR？

---

## 5. 验证策略

- 每阶段后：`npm run lint && npm run build && npm run test --run`
- Phase B 单独补一组 `SaveManager.slotMethods.test.ts`：序列化往返 + 老版本拒绝。
- Phase D 后：手测 UI「切换生产方式」面板对每类建筑（采矿/加工/制造/奢侈/服务）能正常切换并产生对应修饰。
