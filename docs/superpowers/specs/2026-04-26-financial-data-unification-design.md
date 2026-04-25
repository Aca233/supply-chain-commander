# 财务数据统一口径设计

日期: 2026-04-26

## 背景

当前玩家能在多个页面看到彼此冲突的财务数据:

- 生产建筑卡片、建筑详情、生产总览显示的是“理论利润”或“预估利润”
- 仪表盘日利润和现金趋势来自 `financialHistory`
- 财务页面同时混用了 `financialHistory`、`world.trades`、`world.companies.totalAssets`
- 统计面板又单独计算了一套净资产和资产价值

结果是:

- 建筑里看起来“日利润很高”，但总览可能显示亏损
- 现金会被真实扣除，但页面上的收入/成本解释不一致
- 总资产、净资产、库存价值在不同页面口径不同

这次需求不是调整文案，而是把玩家可见的财务数据统一到同一套规则上。

## 目标

- 统一玩家可见的现金、资产、负债、净资产、日利润、累计收入、累计成本口径
- 让仪表盘、财务页、统计页在同一时刻展示一致的核心财务值
- 明确区分“真实财务结果”和“建筑预估利润”
- 移除页面内重复、分裂、彼此冲突的临时计算逻辑
- 保持现有模拟主循环与现金扣款逻辑不变

## 非目标

- 本次不重做底层经济系统的总账或复式记账
- 本次不让单栋建筑利润变成“真实到账利润”
- 本次不改变贷款、运营成本、手续费、还款的结算规则
- 本次不做大规模 UI 重设计

## 方案比较

### 方案 A: 建立共享财务快照层

新增一个统一的玩家财务快照计算入口，所有玩家财务页面都读取这一个入口。

优点:

- 口径单一，页面不会各算各的
- 改动范围可控，不需要推翻模拟核心
- 可以保留建筑“预估利润”作为单独概念

缺点:

- 需要迁移多个页面和 selector
- 需要先定义清楚每个字段的业务含义

### 方案 B: 每个页面各自改成相同公式

在 Finance、Dashboard、Statistics 等页面分别改公式，但不抽共享层。

优点:

- 看起来改得快

缺点:

- 后续仍容易再次漂移
- 一旦再改字段定义，必须同时改多处

### 方案 C: 直接重构模拟层为完整账本

让所有收入、成本、资产变化都进入统一 ledger，再由 UI 展示。

优点:

- 理论上最彻底

缺点:

- 范围远超这次需求
- 风险高，容易引入经济回归

### 结论

采用方案 A。

## 设计概览

### 核心原则

玩家可见财务数据以后分成两类:

- 真实财务快照: 用于总览、财务、统计、里程碑等结果型页面
- 建筑经营预估: 用于单栋建筑与生产页，明确标注为“预估”

只有真实财务快照可以驱动“利润”“总资产”“净资产”这类全局指标。建筑预估利润不再参与全局财务汇总解释。

### 统一字段定义

新增共享快照概念 `PlayerFinancialSnapshot`，字段口径如下:

- `cash`: `world.companies.cash[0]`
- `inventoryValue`: 玩家库存数量乘以当前市场价格的总和
- `buildingValue`: 玩家建筑价值总和，使用一个共享建筑估值规则
- `operatingAssets`: `inventoryValue + buildingValue`
- `totalAssets`: `cash + operatingAssets`
- `liabilities`: `world.companies.totalLiabilities[0]`
- `netWorth`: `totalAssets - liabilities`
- `dailyProfit`: 基于 `financialHistory` 最近 24 tick 的利润合计
- `dailyRevenue`: 基于 `financialHistory` 最近 24 tick 的收入合计
- `dailyCost`: 基于 `financialHistory` 最近 24 tick 的成本合计
- `cumulativeRevenue`: 基于 `financialHistory` 的累计收入
- `cumulativeCost`: 基于 `financialHistory` 的累计成本
- `cumulativeProfit`: `cumulativeRevenue - cumulativeCost`

说明:

- `financialHistory` 已经在 store 中按真实现金变化做过对账修正，因此它是玩家真实财务结果的唯一来源
- `world.trades` 仍可用于“最近交易记录”列表，但不能再用来计算页面顶部收入、成本、净利润
- `world.companies.totalAssets` 不再作为玩家 UI 的权威来源

### 共享计算层

在核心财务模块新增共享纯函数，负责根据 `world`、`financialHistory`、`tick` 生成玩家财务快照。

建议拆成两个可复用入口:

- 一个资产拆解函数，统一计算 `inventoryValue`、`buildingValue`、`operatingAssets`、`totalAssets`
- 一个玩家快照函数，统一计算资产、负债、净资产、日度与累计财务结果

这层必须具备以下特性:

- 不依赖 React
- 对空 world、空历史、NaN 输入有稳定兜底
- 所有使用方只拿结果，不再复制公式

### Store 与 Selector 约定

`gameStore` 中现有 `playerCash` 继续保留，`playerAssets` 调整为“非现金资产值”，即 `operatingAssets`，不再直接抄 `world.companies.totalAssets[0]`。

新增统一 selector 或 store 读取入口，向 UI 暴露共享快照。页面以后优先读取快照中的显式字段:

- 需要“总资产”时读 `totalAssets`
- 需要“资产价值”时读 `operatingAssets`
- 需要“净资产”时读 `netWorth`

不允许页面再自行写出 `cash + assets`、`assets - liabilities + cash` 之类的推断式公式。

### 页面迁移范围

以下页面或入口改为统一读取共享快照:

- `src/ui/components/Dashboard/hooks/useDashboardData.ts`
- `src/ui/pages/Finance.tsx`
- `src/ui/components/Statistics/GameStatisticsPanel.tsx`
- `src/stores/selectors.ts`

如同一轮修改中发现其他页面也在展示玩家核心财务值，也应一并切到共享快照，避免只统一一半。

### 建筑利润口径

建筑卡片、建筑详情、生产总览继续使用建筑级预估值，但规则要保持为:

- 明确展示为“预估日利润”或等价文案
- 暂停建筑不能显示误导性的正收益
- 该值只表示当前价格和当前产出条件下的经营估算
- 该值不承诺等于玩家现金变化，也不参与财务总览指标

这样玩家可以同时看到:

- 单栋建筑“如果按当前状态运行，大概赚多少”
- 公司整体“今天实际赚了还是亏了多少”

两者允许不同，但语义必须清楚，不再冒充同一种数据。

### CompanyProfile 对齐

`CompanyProfile` 当前已经在本地重算库存与建筑价值，但它的资产定义需要和共享资产拆解保持一致。

这次应让 `CompanyProfile` 复用同一套资产计算函数，避免公司资料页与玩家财务页再次分叉。

### 错误处理与兼容性

统一财务快照需要保证:

- world 未初始化时返回零值快照，不抛异常
- 历史为空时，日利润、累计收入、累计成本、累计利润返回 0
- 数值非法时做安全归零，避免 UI 出现 `NaN` 或 `Infinity`
- 老逻辑仍可读取 `playerCash` 和 `playerAssets`，但其含义以本设计定义为准

## 数据流

统一后的数据流如下:

1. 模拟主循环继续更新真实现金、负债、交易、运营成本
2. `gameStore` 继续维护已经过现金对账的 `financialHistory`
3. 共享财务快照从 `world + financialHistory + tick` 计算玩家真实财务结果
4. Dashboard、Finance、Statistics、selectors 统一读取该快照
5. 建筑组件单独读取建筑预估利润 helper，不再与真实快照混算

## 测试方案

必须先补测试，再改实现。

核心测试:

- 共享快照对同一组 world/history 输入能稳定算出现金、库存价值、建筑价值、总资产、负债、净资产
- `dailyProfit`、`dailyRevenue`、`dailyCost` 与 `financialHistory` 的 24 tick 窗口一致
- `cumulativeRevenue`、`cumulativeCost`、`cumulativeProfit` 与 `financialHistory` 累计值一致

回归测试:

- Finance 页顶部指标与损益表读取同一套快照，不再使用 trade 扫描结果作为收入/成本来源
- Statistics 面板的净资产与资产价值不再重复加总库存
- Dashboard 的日利润与 Finance 页当日利润一致
- `CompanyProfile` 的资产拆解与共享资产函数一致

兼容测试:

- world 为空时共享快照返回零值
- 历史为空时页面仍能渲染
- 建筑预估利润 UI 仍保持“预估”语义，不受真实财务快照替换影响

## 风险与缓解

### 风险 1: `playerAssets` 旧语义不明确

部分旧代码可能把 `playerAssets` 当成“总资产”，部分地方又把它当成“非现金资产”。

缓解:

- 在共享快照中引入显式字段 `operatingAssets` 与 `totalAssets`
- 页面优先迁移到显式字段
- store 保留 `playerAssets` 仅作兼容值，并统一定义为 `operatingAssets`

### 风险 2: 建筑估值规则再次分叉

如果玩家快照和 `CompanyProfile` 各自维护建筑价值公式，后续仍会出现资产不一致。

缓解:

- 抽出共享资产拆解函数
- `CompanyProfile` 与玩家快照都走同一实现

### 风险 3: 页面还留有 trade 扫描口径

即使快照已经存在，只要 Finance 或其他页面还继续从 `world.trades` 汇总收入和成本，数据仍会打架。

缓解:

- 搜索并替换所有玩家核心财务指标的来源
- 将 `world.trades` 限制为交易明细用途

## 实施顺序

1. 新增共享资产拆解与玩家财务快照计算函数
2. 为快照补齐单元测试，先验证失败
3. 让 `gameStore` 与 selectors 暴露统一财务快照
4. 迁移 Dashboard、Finance、Statistics 到共享快照
5. 让 `CompanyProfile` 复用同一资产拆解逻辑
6. 运行页面相关测试与构建验证

## 验收标准

- 在同一时刻，Dashboard、Finance、Statistics 显示的现金、总资产、净资产、日利润彼此一致
- Finance 页的当日收入、当日成本、净利润来自 `financialHistory`，不再来自页面内 trade 扫描
- Statistics 面板不再重复把库存价值加进净资产
- 玩家现金真实减少时，页面上的成本/利润解释与 `financialHistory` 一致
- 建筑页面仍展示“预估日利润”，且不会被误认为公司实际利润
