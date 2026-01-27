## 第十一部分：UI/UX设计

### 11.1 视觉风格定位

**21世纪现代科技风格**：
- 简洁、干净、专业
- 参考：Bloomberg Terminal、Figma、Linear、Notion
- 摒弃复古像素风和赛博朋克霓虹

### 11.2 色彩系统

```typescript
const COLOR_PALETTE = {
  // 基础色
  background: {
    primary: '#FFFFFF',      // 主背景-纯白
    secondary: '#F8FAFC',    // 次背景-极浅灰
    tertiary: '#F1F5F9',     // 三级背景
    elevated: '#FFFFFF',     // 卡片/弹窗
  },
  
  // 文字色
  text: {
    primary: '#0F172A',      // 主文字-深蓝黑
    secondary: '#475569',    // 次文字-灰
    tertiary: '#94A3B8',     // 辅助文字
    inverse: '#FFFFFF',      // 反色文字
  },
  
  // 品牌色
  brand: {
    primary: '#3B82F6',      // 主色-蓝
    primaryHover: '#2563EB',
    secondary: '#8B5CF6',    // 辅色-紫
  },
  
  // 语义色
  semantic: {
    success: '#22C55E',      // 成功/上涨-绿
    warning: '#F59E0B',      // 警告-橙
    error: '#EF4444',        // 错误/下跌-红
    info: '#3B82F6',         // 信息-蓝
  },
  
  // 图表专用色
  chart: {
    up: '#22C55E',           // 上涨
    down: '#EF4444',         // 下跌
    neutral: '#94A3B8',      // 持平
    line: '#3B82F6',         // 折线
    area: 'rgba(59, 130, 246, 0.1)', // 面积填充
    grid: '#E2E8F0',         // 网格线
  },
  
  // 边框色
  border: {
    default: '#E2E8F0',
    hover: '#CBD5E1',
    focus: '#3B82F6',
  },
};
```

### 11.3 字体系统

```typescript
const TYPOGRAPHY = {
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    chinese: '"PingFang SC", "Microsoft YaHei", sans-serif',
  },
  
  fontSize: {
    xs: '12px',     // 辅助信息
    sm: '13px',     // 次要文本
    base: '14px',   // 正文
    lg: '16px',     // 小标题
    xl: '18px',     // 标题
    '2xl': '24px',  // 页面标题
    '3xl': '30px',  // 大数字
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};
```

### 11.4 间距系统

```typescript
const SPACING = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};

const BORDER_RADIUS = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};
```

### 11.5 组件设计规范

#### 按钮

```typescript
interface ButtonStyle {
  variants: {
    primary: {
      bg: COLOR_PALETTE.brand.primary,
      text: COLOR_PALETTE.text.inverse,
      hover: COLOR_PALETTE.brand.primaryHover,
    },
    secondary: {
      bg: 'transparent',
      text: COLOR_PALETTE.text.primary,
      border: COLOR_PALETTE.border.default,
      hover: COLOR_PALETTE.background.tertiary,
    },
    ghost: {
      bg: 'transparent',
      text: COLOR_PALETTE.text.secondary,
      hover: COLOR_PALETTE.background.secondary,
    },
    danger: {
      bg: COLOR_PALETTE.semantic.error,
      text: COLOR_PALETTE.text.inverse,
    },
  },
  
  sizes: {
    sm: { height: '32px', padding: '0 12px', fontSize: '13px' },
    md: { height: '40px', padding: '0 16px', fontSize: '14px' },
    lg: { height: '48px', padding: '0 24px', fontSize: '16px' },
  },
};
```

#### 卡片

```typescript
interface CardStyle {
  base: {
    background: COLOR_PALETTE.background.elevated,
    borderRadius: BORDER_RADIUS.lg,
    border: `1px solid ${COLOR_PALETTE.border.default}`,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  
  hover: {
    borderColor: COLOR_PALETTE.border.hover,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  
  padding: {
    sm: SPACING[3],
    md: SPACING[4],
    lg: SPACING[6],
  },
};
```

#### 输入框

```typescript
interface InputStyle {
  base: {
    height: '40px',
    padding: '0 12px',
    fontSize: '14px',
    background: COLOR_PALETTE.background.primary,
    border: `1px solid ${COLOR_PALETTE.border.default}`,
    borderRadius: BORDER_RADIUS.md,
  },
  
  focus: {
    borderColor: COLOR_PALETTE.border.focus,
    boxShadow: `0 0 0 3px rgba(59, 130, 246, 0.15)`,
  },
  
  error: {
    borderColor: COLOR_PALETTE.semantic.error,
  },
};
```

### 11.6 页面布局

```
┌─────────────────────────────────────────────────────────────────────────┐
│  顶部导航栏 (56px)                                                        │
│  Logo | 主菜单 | 搜索 | 通知 | 用户                                        │
├───────────────┬─────────────────────────────────────────────────────────┤
│               │                                                         │
│  左侧边栏      │  主内容区                                                │
│  (240px)      │                                                         │
│               │  ┌─────────────────────────────────────────────────┐   │
│  仪表盘        │  │  页面标题 + 操作按钮                              │   │
│  生产管理      │  ├─────────────────────────────────────────────────┤   │
│  市场交易      │  │                                                  │   │
│  财务报表      │  │  内容网格                                         │   │
│  竞争对手      │  │                                                  │   │
│  股票市场      │  │  ┌────────┐ ┌────────┐ ┌────────┐              │   │
│  设置         │  │  │ 卡片1   │ │ 卡片2   │ │ 卡片3   │              │   │
│               │  │  └────────┘ └────────┘ └────────┘              │   │
│               │  │                                                  │   │
│               │  │  ┌─────────────────────────────────────────┐   │   │
│               │  │  │ 主要图表/数据表格                         │   │   │
│               │  │  │                                          │   │   │
│               │  │  └─────────────────────────────────────────┘   │   │
│               │  │                                                  │   │
│               │  └─────────────────────────────────────────────────┘   │
│               │                                                         │
└───────────────┴─────────────────────────────────────────────────────────┘
```

### 11.7 关键页面设计

#### 仪表盘

```
┌─────────────────────────────────────────────────────────────────────────┐
│  仪表盘                                              Day 156 │ ▶️ 运行中  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 💰 现金       │ │ 📦 总库存     │ │ 📈 日营收     │ │ 🏭 建筑数     │   │
│  │ ¥1,234,567   │ │ 45,678 单位  │ │ ¥89,012      │ │ 12 座         │   │
│  │ ▲ +2.3%     │ │ ▼ -1.2%      │ │ ▲ +5.6%     │ │ +2 本月      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │ 资产趋势                         │ │ 市场份额                       │ │
│  │                                 │ │                               │ │
│  │    ╱╲    ╱╲                    │ │  钢材  ████████░░ 45%          │ │
│  │   ╱  ╲  ╱  ╲   ╱              │ │  电子  █████░░░░░ 28%          │ │
│  │  ╱    ╲╱    ╲ ╱               │ │  汽车  ███░░░░░░░ 15%          │ │
│  │ ╱            ╲                 │ │                               │ │
│  │                                 │ │                               │ │
│  └─────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 最近活动                                                          │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │ 🟢 10:23  钢材以 ¥850/吨 成交 1,000 吨                            │   │
│  │ 🔴 10:21  铁拳重工降价 15%，钢材市场竞争加剧                         │   │
│  │ 🟢 10:18  钢铁厂 #3 升级完成，产能提升 20%                          │   │
│  │ 🟡 10:15  铜矿石库存低于警戒线，建议补货                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 市场交易

```
┌─────────────────────────────────────────────────────────────────────────┐
│  市场交易                                     🔍 搜索商品  │ 📊 订单簿   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  商品选择：[钢材 ▾]                    当前价格：¥850.00  ▲ +2.5%       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 价格走势                                    [1D] [1W] [1M] [3M]  │   │
│  │                                                                  │   │
│  │  900 ┤                         ╭─╮                              │   │
│  │  875 ┤              ╭─────╮   │  │  ╭──                         │   │
│  │  850 ┤─────╮   ╭───╯     ╰───╯  ╰──╯                           │   │
│  │  825 ┤     ╰───╯                                                │   │
│  │  800 ┤                                                          │   │
│  │      └──────────────────────────────────────────────────────    │   │
│  │        1月        2月        3月        4月        5月          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐   │
│  │ 订单簿                      │  │ 交易面板                        │   │
│  │ ─────────────────────────  │  │                                │   │
│  │ 卖出                        │  │ 方向:  [买入] [卖出]             │   │
│  │ ¥860  ████████░ 500        │  │                                │   │
│  │ ¥855  █████░░░░ 300        │  │ 数量:  [________] 吨            │   │
│  │ ¥852  ███░░░░░░ 150        │  │                                │   │
│  │ ─────────────────────────  │  │ 价格:  [________] ¥/吨          │   │
│  │ 买入                        │  │        或 [✓] 市价单            │   │
│  │ ¥848  ████████░ 480        │  │                                │   │
│  │ ¥845  ██████░░░ 350        │  │ 预估金额: ¥0                    │   │
│  │ ¥840  ████░░░░░ 200        │  │                                │   │
│  │                            │  │ [提交订单]                      │   │
│  └────────────────────────────┘  └────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 生产管理

```
┌─────────────────────────────────────────────────────────────────────────┐
│  生产管理                                           [+ 新建建筑]         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 钢铁厂 #1                                        效率: 92% 🟢    │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  生产配置:                                                       │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │   │
│  │  │ 主工艺        │ │ 自动化       │ │ 能源         │             │   │
│  │  │ [电弧炉炼钢▾] │ │ [半自动化 ▾] │ │ [电网供电 ▾] │             │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘             │   │
│  │                                                                  │   │
│  │  输入:                              输出:                        │   │
│  │  铁矿石  800/1000 ████████░░       钢材  产量 80吨/天            │   │
│  │  煤炭    450/500  █████████░       库存  1,200吨                │   │
│  │                                                                  │   │
│  │  ████████████████████████░░░░░░░░░░ 生产进度 68%                │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 钢铁厂 #2                                        效率: 85% 🟡    │   │
│  │ ...                                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.8 图表设计规范

```typescript
const CHART_STYLE = {
  // K线图
  candlestick: {
    upColor: '#22C55E',
    downColor: '#EF4444',
    upBorderColor: '#22C55E',
    downBorderColor: '#EF4444',
    wickUpColor: '#22C55E',
    wickDownColor: '#EF4444',
  },
  
  // 折线图
  line: {
    color: '#3B82F6',
    width: 2,
    smooth: true,
    areaStyle: {
      color: 'rgba(59, 130, 246, 0.1)',
    },
  },
  
  // 坐标轴
  axis: {
    lineColor: '#E2E8F0',
    labelColor: '#64748B',
    fontSize: 12,
    fontFamily: '"Inter", sans-serif',
  },
  
  // 网格
  grid: {
    color: '#F1F5F9',
    show: true,
    horizontal: true,
    vertical: false,
  },
  
  // 工具提示
  tooltip: {
    background: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    shadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    textColor: '#0F172A',
    fontSize: 13,
  },
  
  // 图例
  legend: {
    position: 'top',
    align: 'right',
    itemGap: 24,
    textColor: '#64748B',
    fontSize: 13,
  },
};
```

### 11.9 动效规范

```typescript
const ANIMATION = {
  // 过渡时间
  duration: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
  },
  
  // 缓动函数
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // 使用场景
  scenarios: {
    hover: { duration: 'fast', easing: 'default' },
    modal: { duration: 'normal', easing: 'easeOut' },
    pageTransition: { duration: 'slow', easing: 'default' },
    dataUpdate: { duration: 'normal', easing: 'easeOut' },
  },
};
```

### 11.10 响应式断点

```typescript
const BREAKPOINTS = {
  sm: '640px',   // 手机横屏
  md: '768px',   // 平板竖屏
  lg: '1024px',  // 平板横屏/小笔记本
  xl: '1280px',  // 桌面
  '2xl': '1536px', // 大屏
};

// 主要支持桌面端，最小宽度1024px
// 左侧边栏在小于1280px时可收起
```

---
