# 劳动力系统设计

日期: 2026-05-02

## 背景

当前游戏已经有若干与劳动力相关的概念:

- 建筑定义中有 `laborCost`
- 生产方式计算结果中有 `laborRequired`
- 生产引擎会按公司估算可用劳动力，并在劳动力不足时降低产出
- 运营成本会把工资流入 `households`，形成消费者收入与消费循环
- 附属设施中已有员工餐厅、培训中心、宿舍等员工类设施

这些概念还没有形成统一的经营系统。玩家不能按建筑招聘、不能按岗位调工资，也看不到不同生产方式对劳动力结构的差异。需求是建立一个轻量但真实的建筑级劳动力系统，让劳动力成为生产方式、成本、产能和市场竞争的一部分。

## 目标

- 每座运营建筑拥有自己的岗位雇佣人数与岗位工资倍率
- 每个生产方式 method 定义普通工人、技术工人、管理人员三类岗位需求
- 三类岗位需求取代旧的总 `laborRequired`
- 实际工资成本取代旧的 `laborCost`
- 世界层有总劳动力池与岗位劳动力池，支持失业、就业、市场工资和缓慢增长
- 建筑按岗位工资自动招聘，低于市场工资会缓慢流失
- 玩家和 AI 公司都受劳动力系统影响
- 缺人只影响产量/效率，不引入质量、事故、士气等新属性
- 工资按日计提，按月发放给 `households`
- 第一版只作用于已运营建筑，不影响建造、升级、拆除流程
- UI 第一版只放在建筑详情面板

## 非目标

- 不做独立劳动力管理页面
- 不做建造工人、拆除工人或临时施工队
- 不做员工个体、履历、培训、年龄、迁移等人口模拟
- 不做跨公司挖人或瞬时跳槽
- 不做质量、事故率、士气、罢工等扩展属性
- 不在第一版删除建筑定义里的 `laborCost` 字段；字段可保留兼容，但不再参与工资成本

## 方案比较

### 方案 A: 轻量替换版

每个 method 写三类岗位需求，建筑按岗位招聘，缺人时降低产量。市场工资与 AI 行为使用简单固定规则。

优点:

- 实现最快
- 对现有经济冲击较小

缺点:

- 岗位稀缺、全局抢人、动态工资的策略价值弱
- AI 与玩家竞争感不足

### 方案 B: 经营模拟版

每个 method 写岗位需求；世界有总劳动力池和岗位池；每座建筑按岗位工资倍率自动招聘；低薪会缓慢流失；玩家和 AI 都受影响；工资完全取代旧 `laborCost`。

优点:

- 贴合当前经营玩法和生产方式系统
- 能体现普通工人、技术工人、管理人员的供给差异
- 不引入质量、事故、士气、建造用工等额外复杂度

缺点:

- 需要修改核心循环、生产方式数据、存档、AI、UI 和测试

### 方案 C: 完整劳动力经济版

在方案 B 上增加劳动力专页、建造用工、培训、质量、事故、士气、跨公司跳槽。

优点:

- 真实度最高

缺点:

- 第一版范围过大，容易牵动经济平衡和 UI 复杂度

### 结论

采用方案 B。

## 核心架构

新增一个 `LaborSystem` 挂在 `GameWorld` 上，保存三类岗位的总供给、已就业、失业、市场工资和增长速度。每个建筑保存三类岗位的已雇佣人数、岗位工资倍率和本月已计提工资。

生产方式 method 新增岗位需求字段。由于现有生产方式是多个 slot 的 method 叠加，字段采用与 `inputDelta`、`outputDelta`、`energyDelta` 一致的 delta 风格:

```ts
workforceDelta: {
  basic: number;
  technical: number;
  management: number;
}
```

建筑实际岗位需求 = 当前选中所有 method 的 `workforceDelta` 求和，并按主动产能利用率缩放。

生产循环根据岗位覆盖率计算实际产量。运营成本根据实际雇佣人数与岗位工资按日计提，到月末统一发放给 `households`。

## 数据模型

### 岗位类型

第一版固定三类岗位:

- `basic`: 普通工人
- `technical`: 技术工人
- `management`: 管理人员

这些岗位覆盖当前建筑和生产方式的主要差异。后续若要增加销售员、工程师、科研人员，可以在同一结构上扩展。

### 世界劳动力池

在 `GameWorld` 中新增 `labor`:

```ts
interface LaborSystem {
  totalSupply: Float32Array;
  employed: Float32Array;
  unemployed: Float32Array;
  marketWages: Float32Array;
  monthlyGrowth: Float32Array;
  demandOpenings: Float32Array;
  lastPayrollTick: number;
}
```

数组索引与岗位常量一致。

字段含义:

- `totalSupply`: 当前可就业劳动力总供给
- `employed`: 当前已就业人数
- `unemployed`: 当前未就业人数
- `marketWages`: 每个岗位的日薪市场价
- `monthlyGrowth`: 每月新增劳动力
- `demandOpenings`: 最近一次招聘计算中的岗位缺口，用于市场工资调整
- `lastPayrollTick`: 最近一次发薪 tick，避免重复发薪

### 建筑劳动力状态

在 `BuildingsSystem` 中新增:

```ts
workforceHired: Float32Array;
wageMultipliers: Float32Array;
accruedPayroll: Float64Array;
```

索引规则:

- `workforceHired[buildingId * 3 + roleIndex]`
- `wageMultipliers[buildingId * 3 + roleIndex]`
- `accruedPayroll[buildingId]`

默认值:

- `workforceHired` 为 `0`
- `wageMultipliers` 为 `1.0`
- `accruedPayroll` 为 `0`

### 生产方式字段

`BuildingProductionMethod` 新增:

```ts
workforceDelta: {
  basic: number;
  technical: number;
  management: number;
}
```

`ComputedRecipe` 将 `laborRequired` 替换为:

```ts
workforceRequired: {
  basic: number;
  technical: number;
  management: number;
}
```

旧的 `laborDelta` 与 `laborRequired` 不再参与生产判断。实现阶段可短期保留类型字段或迁移辅助函数，但最终运行逻辑只读 `workforceRequired`。

## 工资模型

### 市场工资

每个岗位有一个日薪市场价。第一版使用稳定的初始值，并允许每日小幅调整:

- 普通工人: `120 / 人 / 天`
- 技术工人: `260 / 人 / 天`
- 管理人员: `520 / 人 / 天`

市场工资根据岗位失业率和岗位缺口调整:

```ts
targetPressure = openings / max(totalSupply, 1)
unemploymentRate = unemployed / max(totalSupply, 1)
wageDelta = targetPressure * 0.015 - unemploymentRate * 0.008
dailyChange = clamp(wageDelta, -0.01, 0.01)
marketWage *= 1 + dailyChange
```

每日变化限制在 `-1%` 到 `+1%`，避免工资震荡过大。

### 建筑实际工资

每座建筑、每个岗位保存一个工资倍率:

```ts
actualDailyWage = marketWage[role] * wageMultiplier[buildingId, role]
```

玩家在 UI 中调整倍率，而不是直接输入工资数值。倍率范围第一版为 `0.5x - 2.0x`。

### 工资计提与发放

现实中工资不是每天实际发放，因此第一版采用按日计提、按月发放:

```ts
dailyAccruedWage =
  hiredBasic * actualBasicDailyWage +
  hiredTechnical * actualTechnicalDailyWage +
  hiredManagement * actualManagementDailyWage
```

每天把 `dailyAccruedWage` 加到 `buildings.accruedPayroll[buildingId]`。到每月最后一天或固定发薪日:

```ts
company.cash -= companyAccruedPayroll
households.cash[0] += companyAccruedPayroll
households.totalWagesReceived += companyAccruedPayroll
building.accruedPayroll = 0
```

工资支出从公司现金中扣除，进入 `households`，继续支撑消费者市场。

### 旧 `laborCost`

旧 `laborCost` 全部被新工资系统取代。`calculateCompanyOperatingCostPerTick` 不再使用建筑定义里的 `laborCost`。字段可暂时保留在建筑定义中，避免一次性大范围数据删除，但不应再影响运营成本。

## 招聘与离职

### 招聘

每天每座运营建筑按岗位检查目标需求与当前已雇佣人数。工资倍率越高，招聘越快；招聘不能超过对应岗位失业池。

```ts
target = activeWorkforceDemand[role]
hired = workforceHired[buildingId, role]
gap = target - hired
hireRate = baseHireRate[role] * wageMultiplier
dailyHire = min(gap, unemployed[role], ceil(gap * hireRate))
```

基础招聘速度:

- 普通工人: `0.12`
- 技术工人: `0.07`
- 管理人员: `0.04`

这些数字表示在 `1.0x` 市场工资下，每天可以补齐缺口的一部分。技术工人和管理人员更难快速招满。

### 离职

第一版不做高薪公司直接挖人。低于市场工资时，员工会缓慢流失并回到对应岗位失业池:

```ts
if wageMultiplier < 1:
  quitRate = baseQuitRate[role] * (1 - wageMultiplier)
  dailyQuit = floor(hired * quitRate)
```

基础离职速度:

- 普通工人: `0.025`
- 技术工人: `0.018`
- 管理人员: `0.012`

工资高于或等于市场工资时，不发生工资原因导致的自然流失。

## 主动减产与缺人减产

主动减产不应通过缺人模拟。主动减产是经营策略，缺人减产是劳动力约束。

现有系统已有建筑级生产控制概念:

- `productionControlModes`
- `manualEfficiencyTargets`

劳动力系统应接入这套产能利用率逻辑:

```ts
fullWorkforceDemand = recipe.workforceRequired
targetUtilization = currentBuildingUtilization
activeWorkforceDemand = fullWorkforceDemand * targetUtilization
```

其中 `currentBuildingUtilization` 来自当前实际效率或手动效率目标，按既有生产控制语义归一化到生产用比例。

例子:

- 某钢铁厂满产需要普通工人 `100`、技术工人 `20`、管理人员 `5`
- 玩家主动减产到 `50%`
- 当天有效岗位需求为普通工人 `50`、技术工人 `10`、管理人员 `3`
- 若已雇佣人数能覆盖有效需求，则建筑按 `50%` 稳定生产
- 若技术工人只有 `5`，则产量继续被技术岗位覆盖率压低

已经雇佣但未被当天有效需求使用的员工仍然计提工资，代表待岗和固定班组成本。若玩家长期减产，可以通过降低工资倍率让员工缓慢自然流失；第一版不做复杂裁员按钮。

## 生产影响规则

每座建筑先根据选中的 method 汇总满产岗位需求，再根据主动产能利用率得到当天有效岗位需求。

每类岗位覆盖率:

```ts
coverage[role] = demand[role] === 0 ? 1 : hired[role] / demand[role]
```

建筑劳动力覆盖率取三类岗位覆盖率的最小值:

```ts
laborCoverage = min(basicCoverage, technicalCoverage, managementCoverage)
```

生产时:

```ts
actualOutput = baseOutput * targetUtilization * laborCoverage
```

第一版只影响产量/效率，不改变质量、事故率、士气或其他系统。

特殊情况:

- 岗位需求全为 `0` 时，覆盖率为 `1`
- `laborCoverage <= 0` 时，建筑当天不生产，但不自动关闭
- 覆盖率和瓶颈岗位应显示在建筑详情中

## AI 行为

AI 公司和玩家公司都使用同一套招聘、离职、工资计提、生产覆盖率逻辑。

AI 每天根据岗位缺口和现金压力自动调整岗位工资倍率:

- 缺口严重时，提高对应岗位倍率
- 人员招满且现金压力较大时，降低倍率
- 调整幅度必须小，避免工资市场震荡

AI 性格影响调薪速度和上限:

- 激进型 AI: 更快加薪，上限更高，更重视快速恢复产能
- 保守型 AI: 加薪较慢，更重视现金压力
- 均衡型 AI: 使用默认参数

第一版不做直接挖人。AI 提高工资只会加快从失业池招聘。

## UI 设计

第一版 UI 放在建筑详情面板。

显示内容:

- 三类岗位的满产需求
- 当前主动产能利用率下的有效需求
- 已雇佣人数
- 岗位缺口
- 岗位覆盖率
- 市场日薪
- 当前工资倍率
- 实际日薪
- 预计月工资支出
- 本月已计提工资
- 当前瓶颈岗位

交互:

- 每个岗位一个倍率滑杆
- 范围 `0.5x - 2.0x`
- 滑杆旁显示倍率和换算后的实际工资
- 无需单独保存按钮，调整后立即写入世界状态

第一版不增加独立劳动力页面。全局岗位池、市场工资和失业率可以在建筑详情中以简短摘要展示。

## 存档兼容

旧存档没有 `labor` 字段时，加载时初始化:

- 默认岗位池
- 默认市场工资
- 默认岗位增长速度
- 所有建筑 `wageMultipliers = 1.0`
- 所有建筑 `workforceHired = 0`
- 所有建筑 `accruedPayroll = 0`

旧档加载后，已激活建筑按当前岗位需求补入 `60%` 初始覆盖率，并同步从对应岗位失业池扣除；未激活建筑保持 `0` 员工。这样旧档不会大面积瞬间停产，同时仍会暴露劳动力缺口，让自动招聘继续补齐。

新建建筑默认工资倍率为 `1.0x`，员工数为 `0`，靠自动招聘逐步补齐。

## 测试方案

先补测试，再实现。

核心逻辑测试:

- method 的 `workforceDelta` 能正确汇总到 `ComputedRecipe.workforceRequired`
- 三类岗位需求取代旧 `laborRequired`
- 主动减产会缩放当天有效岗位需求
- 主动减产下的闲置员工仍然计提工资
- 招聘不会超过岗位缺口
- 招聘不会超过岗位失业池
- 低于市场工资会缓慢流失
- 高于或等于市场工资不会因工资原因流失
- 市场工资每日变化被限制在配置范围内
- 缺岗按最小岗位覆盖率降低产量
- `laborCoverage <= 0` 时建筑不生产

财务测试:

- 工资按日计提到建筑
- 月末工资从公司现金扣除
- 月末工资进入 `households.cash[0]`
- 月末工资增加 `households.totalWagesReceived`
- 旧 `laborCost` 不再进入运营成本
- 维护费和能源费继续按原规则计入运营成本

AI 测试:

- AI 缺岗位时提高对应岗位工资倍率
- AI 人员充足且现金压力高时降低倍率
- 激进型 AI 调薪幅度高于保守型 AI
- AI 调薪不会超过倍率上下限

存档测试:

- 旧世界数据加载后补齐 `labor`
- 旧世界数据加载后补齐建筑劳动力数组
- 新建建筑默认工资倍率为 `1.0`
- 新建建筑默认已雇佣人数为 `0`

UI 验证:

- 建筑详情能显示三类岗位需求、已雇佣、缺口和覆盖率
- 滑杆能修改对应岗位工资倍率
- UI 能显示预计月工资支出和本月已计提工资
- 瓶颈岗位显示与生产覆盖率一致

## 风险与缓解

### 风险 1: 经济成本突变

旧 `laborCost` 被完全替换后，工资支出可能与现有平衡差距较大。

缓解:

- 初始市场工资和 method 岗位需求应以现有 `laborCost` 规模做校准
- 增加专门平衡测试，比较典型建筑的旧日工资成本与新日工资成本
- 市场工资每日变化设置上限，避免短期震荡

### 风险 2: 旧存档产能突然下降

如果旧存档建筑从 `0` 员工开始，加载后可能大面积停产。

缓解:

- 迁移时给已激活建筑补入合理初始覆盖率
- UI 明确显示劳动力缺口，避免玩家误以为生产系统损坏

### 风险 3: 主动减产与缺人减产重复计算

如果主动减产缩放产出，同时劳动力需求没有同步缩放，会过度惩罚玩家。

缓解:

- 明确计算顺序: 先主动产能利用率缩放岗位需求，再计算劳动力覆盖率
- 测试覆盖主动减产到 `50%` 时的岗位需求和实际产出

### 风险 4: AI 调薪造成市场震荡

多个 AI 同时缺人时可能持续抬高工资。

缓解:

- AI 调薪每日小步变化
- 工资倍率设置上下限
- 市场工资每日变化设置上下限

## 实施顺序

1. 新增岗位常量、劳动力系统数据结构和默认初始化
2. 为建筑系统新增已雇佣人数、工资倍率和计提工资字段
3. 为生产方式类型新增 `workforceDelta`，并迁移 method 数据
4. 将配方计算从 `laborRequired` 切换到 `workforceRequired`
5. 新增招聘、离职、市场工资调整、按日计提、月末发薪逻辑
6. 将生产引擎的劳动力约束改为岗位覆盖率
7. 将运营成本中的工资部分从旧 `laborCost` 切换到新工资计提
8. 为 AI 增加岗位工资倍率自动调整
9. 为存档加载增加旧数据迁移
10. 在建筑详情面板加入劳动力 UI
11. 补齐回归测试、运行构建和关键测试

## 验收标准

- 每个生产方式可以定义三类岗位需求
- 建筑实际岗位需求随当前 method 和主动产能利用率变化
- 玩家可以在建筑详情中查看岗位需求、已雇佣人数、缺口、覆盖率和工资倍率
- 玩家可以用滑杆分别调整三类岗位工资倍率
- 建筑按岗位工资自动招聘，且不会超过岗位失业池
- 低于市场工资会导致员工缓慢流失
- 缺人只降低产量/效率，不影响质量、事故、士气
- 工资按日计提、按月发放，并进入 `households`
- 旧 `laborCost` 不再参与工资成本
- AI 公司同样受岗位招聘、工资和缺人减产影响
- 旧存档能加载并补齐劳动力字段
