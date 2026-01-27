# 仪表盘重构方案

## 一、设计理念

### 核心目标
创建一个**混合型全功能管理控制台**，集成：
- 🎯 **指挥中心**：全局概览所有业务
- 📊 **决策支持**：关键指标变化、预警信息、机会提示
- 📈 **数据可视化**：丰富的图表展示趋势、对比、分布

### 设计原则
1. **信息密度适中**：重要信息突出，次要信息可折叠
2. **视觉层次清晰**：使用卡片、颜色、图标区分不同模块
3. **交互便捷**：支持快速跳转、快捷操作
4. **实时更新**：关键数据实时刷新，趋势数据定期更新
5. **响应式布局**：适应不同屏幕尺寸

---

## 二、布局设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          顶部 KPI 指标区                                  │
│  [净资产] [现金] [日利润] [建筑数] [市值] [信用评级]                        │
└─────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────┬────────────────────────────────────────┐
│                                │                                        │
│      财务趋势图表               │         生产概览面板                    │
│   (现金/收入/利润走势)          │    (建筑状态、效率、产能利用率)          │
│                                │                                        │
├────────────────────────────────┼────────────────────────────────────────┤
│                                │                                        │
│      市场动态面板               │         投资组合面板                    │
│  (价格涨跌、热门商品、机会)      │   (持仓、控股公司、收益)                │
│                                │                                        │
├────────────────────────────────┴────────────────────────────────────────┤
│                                                                         │
│                           预警与通知中心                                  │
│              (库存预警、建筑停产、贷款到期、价格异动)                       │
│                                                                         │
├────────────────────────────────┬────────────────────────────────────────┤
│                                │                                        │
│       库存概览                  │        快捷操作 & 最近活动               │
│   (按类别/价值分布)             │   (常用功能入口、最近交易)               │
│                                │                                        │
└────────────────────────────────┴────────────────────────────────────────┘
```

---

## 三、模块详细设计

### 1. 顶部 KPI 指标区

**组件**: `KPIBar.tsx`

| 指标 | 数据来源 | 显示格式 | 变化指示 |
|------|---------|---------|---------|
| 净资产 | `playerAssets + playerCash - playerLiabilities` | ¥1.2M | ▲+2.3% |
| 现金 | `playerCash` | ¥500K | ▲+1.5% |
| 日利润 | `financialHistory` 最近24tick统计 | ¥12.5K | ▼-0.8% |
| 建筑数 | `playerBuildings` | 15座 | 运行中12 |
| 投资市值 | `getPlayerPortfolio().totalValue` | ¥300K | ▲+5.2% |
| 信用评级 | `getPlayerCreditProfile().rating` | AA | 分数850 |

**交互**：
- 点击任意指标可展开详情弹窗
- 指标卡片显示与上一时段对比的变化百分比

---

### 2. 财务趋势图表

**组件**: `FinancialTrends.tsx`

**功能**：
- 主图表：现金余额走势（面积图）
- 副图表：收入/支出柱状图对比
- 切换视图：日/周/月
- 显示关键节点（如最高点、最低点）

**数据源**：
```typescript
interface FinancialChartData {
  time: string;
  cash: number;
  revenue: number;
  cost: number;
  profit: number;
}
// 来源: financialHistory
```

**图表配置**：
- 使用现有的 `PriceChart` 组件适配
- 支持时间范围选择器
- 显示利润率趋势线

---

### 3. 生产概览面板

**组件**: `ProductionOverviewPanel.tsx`

**三个子区域**：

#### 3.1 建筑状态概览
```
┌─────────────────────────────────┐
│  🏭 建筑状态                     │
│  ━━━━━━━━━━━━━━━━━━━━━━         │
│  运行中: 12  暂停: 2  缺料: 3    │
│                                 │
│  产能利用率: ████████░░ 78%     │
└─────────────────────────────────┘
```

#### 3.2 产量排行（Top 5）
| 商品 | 日产量 | 趋势 |
|------|-------|-----|
| 钢材 | 1,200 | ▲ |
| 塑料 | 800 | ▼ |
| 电子元件 | 500 | → |

#### 3.3 问题建筑快速入口
- 显示缺料/停产的建筑
- 点击直接跳转到生产页面

**交互**：
- 点击"查看全部"跳转到生产管理页面
- 悬停建筑显示详细状态

---

### 4. 市场动态面板

**组件**: `MarketDynamicsPanel.tsx`

**四个子区域**：

#### 4.1 价格变动摘要
```
上涨: 25种  下跌: 18种  持平: 12种
```

#### 4.2 涨幅/跌幅榜（各Top 3）
| 商品 | 当前价 | 变化 |
|------|-------|-----|
| 🔼 石油 | ¥85.2 | +12.5% |
| 🔼 铜矿 | ¥42.1 | +8.3% |
| 🔽 小麦 | ¥15.8 | -6.2% |

#### 4.3 交易机会提示
- 低买机会：价格低于均价20%的商品
- 高卖机会：价格高于均价15%且有库存的商品

#### 4.4 活跃订单统计
- 我的买单: 5笔
- 我的卖单: 8笔
- 待成交金额: ¥125,000

**交互**：
- 点击商品名称跳转到市场页面并选中该商品
- 点击"查看市场"按钮跳转到市场页面

---

### 5. 投资组合面板

**组件**: `InvestmentPanel.tsx`

**三个子区域**：

#### 5.1 持仓概览
```
总市值: ¥1,250,000
总成本: ¥1,100,000
盈亏: +¥150,000 (+13.6%)
```

#### 5.2 持仓列表（按市值排序）
| 公司 | 持股比例 | 市值 | 盈亏 |
|------|---------|-----|-----|
| 钢铁集团 | 25% | ¥500K | +15% |
| 电子科技 | 10% | ¥200K | +8% |
| 农业控股 | 5% | ¥100K | -3% |

#### 5.3 控股公司快速操作
- 显示控股公司列表
- 快速操作：分红、资产转移

**交互**：
- 点击公司跳转到投资页面
- 点击"管理投资"按钮跳转到投资页面

---

### 6. 预警与通知中心

**组件**: `AlertCenter.tsx`

**预警类型**：

| 类型 | 图标 | 触发条件 | 优先级 |
|------|-----|---------|-------|
| 库存预警 | ⚠️ | 生产原料库存<1天消耗量 | 高 |
| 建筑停产 | 🛑 | 建筑因缺料停产超过1小时 | 高 |
| 贷款到期 | 💰 | 贷款到期时间<7天 | 中 |
| 价格异动 | 📈 | 持有商品价格变动>10% | 中 |
| 现金警告 | 💸 | 现金<月支出的2倍 | 高 |
| 投资机会 | 💡 | 检测到套利/低买机会 | 低 |

**显示格式**：
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ 库存预警                                              12:30 │
│ 铁矿石库存仅剩 50 单位，预计 2 小时后耗尽                        │
│ [查看详情] [快速采购]                                           │
├─────────────────────────────────────────────────────────────────┤
│ 🛑 建筑停产                                              12:15 │
│ 钢铁厂 #3 因缺少铁矿石已停产 45 分钟                            │
│ [查看建筑] [采购原料]                                           │
└─────────────────────────────────────────────────────────────────┘
```

**功能**：
- 最多显示5条最重要的预警
- 支持标记为已读/忽略
- 可展开查看所有预警

---

### 7. 库存概览

**组件**: `InventoryOverview.tsx`

**两个子视图**：

#### 7.1 按类别分布（饼图）
使用 `MarketShareChart` 显示：
- 原材料: 30%
- 基础加工品: 25%
- 中间产品: 20%
- 最终产品: 25%

#### 7.2 高价值库存列表（Top 10）
| 商品 | 数量 | 单价 | 总价值 | 品质 |
|------|-----|-----|-------|-----|
| 汽车 | 50 | ¥50,000 | ¥2.5M | 优质 |
| 电子产品 | 200 | ¥5,000 | ¥1M | 良好 |

**交互**：
- 点击商品跳转到市场页面
- 显示库存周转率提示

---

### 8. 快捷操作 & 最近活动

**组件**: `QuickActionsPanel.tsx`

#### 8.1 快捷操作按钮
```
[新建建筑] [市场交易] [申请贷款] [管理投资]
```

#### 8.2 最近活动时间线
```
• 12:30 - 卖出 钢材 x100 @ ¥85.5
• 12:25 - 建造完成 炼钢厂 Lv.2
• 12:20 - 贷款审批通过 ¥500,000
• 12:15 - 买入 铁矿石 x500 @ ¥32.1
```

---

## 四、组件架构

```
src/ui/components/Dashboard/
├── index.ts                    # 导出入口
├── KPIBar.tsx                  # 顶部KPI指标条
├── FinancialTrends.tsx         # 财务趋势图表
├── ProductionOverviewPanel.tsx # 生产概览面板
├── MarketDynamicsPanel.tsx     # 市场动态面板
├── InvestmentPanel.tsx         # 投资组合面板
├── AlertCenter.tsx             # 预警与通知中心
├── InventoryOverview.tsx       # 库存概览
├── QuickActionsPanel.tsx       # 快捷操作面板
├── StatCard.tsx               # 统计卡片（已有，优化）
└── hooks/
    ├── useDashboardData.ts     # 仪表盘数据聚合Hook
    ├── useAlerts.ts            # 预警检测Hook
    └── useMarketOpportunities.ts # 市场机会检测Hook

src/ui/pages/
└── Dashboard.tsx               # 主仪表盘页面（重写）
```

---

## 五、新增 Hooks 设计

### 5.1 useDashboardData
```typescript
interface DashboardData {
  // KPI
  netWorth: number;
  cash: number;
  dailyProfit: number;
  buildingCount: { total: number; active: number; paused: number; starved: number };
  portfolioValue: number;
  creditRating: string;
  
  // 变化率（与上一时段对比）
  changes: {
    netWorth: number;
    cash: number;
    dailyProfit: number;
    portfolioValue: number;
  };
  
  // 财务趋势
  financialTrends: FinancialChartData[];
  
  // 生产统计
  productionStats: {
    capacityUtilization: number;
    topProducers: { goodsId: number; name: string; output: number }[];
    problemBuildings: { id: number; name: string; issue: string }[];
  };
  
  // 市场统计
  marketStats: {
    risingCount: number;
    fallingCount: number;
    stableCount: number;
    topGainers: PriceChangeItem[];
    topLosers: PriceChangeItem[];
    opportunities: Opportunity[];
  };
  
  // 投资统计
  investmentStats: {
    totalValue: number;
    totalCost: number;
    totalGain: number;
    holdings: HoldingInfo[];
    controlledCompanies: CompanyInfo[];
  };
  
  // 库存统计
  inventoryStats: {
    byCategory: CategoryValue[];
    topItems: InventoryItem[];
    totalValue: number;
  };
}
```

### 5.2 useAlerts
```typescript
interface Alert {
  id: string;
  type: 'inventory' | 'building' | 'loan' | 'price' | 'cash' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: number;
  actions: AlertAction[];
  data?: any; // 相关数据（用于跳转）
}

function useAlerts(): {
  alerts: Alert[];
  dismissAlert: (id: string) => void;
  markAsRead: (id: string) => void;
}
```

---

## 六、性能优化策略

### 6.1 数据更新频率
| 模块 | 更新频率 | 策略 |
|------|---------|-----|
| KPI指标 | 每2 tick | 使用 selector 订阅 |
| 财务趋势 | 每10 tick | 批量更新 |
| 生产概览 | 每5 tick | 增量更新 |
| 市场动态 | 每tick | 差异检测 |
| 预警中心 | 每5 tick | 后台计算 |
| 库存概览 | 每10 tick | 懒加载 |

### 6.2 渲染优化
1. **React.memo** 包装所有子组件
2. **useMemo** 缓存复杂计算
3. **虚拟滚动** 用于长列表（如库存列表）
4. **骨架屏** 加载占位符

### 6.3 图表优化
- 禁用动画（游戏场景）
- 使用 `lazyUpdate`
- 限制数据点数量

---

## 七、交互设计

### 7.1 跳转逻辑
| 源组件 | 点击目标 | 跳转到 |
|--------|---------|-------|
| 生产概览 | 建筑项 | 生产页面 + 选中建筑 |
| 市场动态 | 商品项 | 市场页面 + 选中商品 |
| 投资面板 | 公司项 | 投资页面 + 选中公司 |
| 库存概览 | 商品项 | 市场页面 + 选中商品 |
| 预警中心 | 查看详情 | 对应页面 |

### 7.2 快捷键
| 按键 | 功能 |
|------|-----|
| `D` | 切换到仪表盘 |
| `P` | 切换到生产 |
| `M` | 切换到市场 |
| `F` | 切换到财务 |
| `Space` | 暂停/继续游戏 |

---

## 八、实施计划

### Phase 1: 基础架构 (Day 1)
- [ ] 创建新的组件目录结构
- [ ] 实现 `useDashboardData` Hook
- [ ] 创建 `KPIBar` 组件
- [ ] 优化 `StatCard` 组件

### Phase 2: 核心面板 (Day 2)
- [ ] 实现 `FinancialTrends` 组件
- [ ] 实现 `ProductionOverviewPanel` 组件
- [ ] 实现 `MarketDynamicsPanel` 组件

### Phase 3: 辅助面板 (Day 3)
- [ ] 实现 `InvestmentPanel` 组件
- [ ] 实现 `AlertCenter` 组件（含 `useAlerts` Hook）
- [ ] 实现 `InventoryOverview` 组件

### Phase 4: 整合与优化 (Day 4)
- [ ] 实现 `QuickActionsPanel` 组件
- [ ] 重写 `Dashboard.tsx` 主页面
- [ ] 实现页面跳转逻辑
- [ ] 性能优化与测试

### Phase 5: 完善 (Day 5)
- [ ] 添加快捷键支持
- [ ] 响应式布局适配
- [ ] 动画与过渡效果
- [ ] 文档与注释

---

## 九、视觉设计参考

### 配色方案（使用现有Tailwind配置）
- **正增长**: `text-chart-up` (#22c55e)
- **负增长**: `text-chart-down` (#ef4444)
- **中性**: `text-text-secondary`
- **强调**: `bg-accent` (#3b82f6)
- **警告**: `bg-warning` (#f59e0b)
- **危险**: `bg-error` (#ef4444)

### 卡片样式
```css
.dashboard-card {
  @apply bg-background-secondary rounded-lg border border-border p-4;
}

.dashboard-card-header {
  @apply flex items-center justify-between mb-3;
}

.dashboard-card-title {
  @apply text-sm font-medium text-text-primary flex items-center gap-2;
}
```

---

## 十、成功标准

1. ✅ 首屏加载时间 < 200ms
2. ✅ 每tick渲染时间 < 16ms (60fps)
3. ✅ 所有关键业务指标可在仪表盘一览
4. ✅ 点击任意模块可快速跳转到详情页
5. ✅ 预警系统能及时提示关键问题
6. ✅ 支持深色/浅色主题切换