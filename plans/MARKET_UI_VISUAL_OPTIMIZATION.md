# 市场交易界面视觉优化方案

## 📋 概述

本文档详细描述了市场交易界面（Market.tsx）的视觉优化方案，旨在提升界面的现代感、可读性和用户体验。

## 🎯 优化目标

1. **提升视觉层次感** - 通过颜色对比度、阴影和间距创建清晰的信息层级
2. **增强现代感** - 采用更精致的卡片样式、渐变效果和微交互
3. **改善可读性** - 优化字体大小、颜色对比度和信息密度
4. **统一设计语言** - 确保所有组件遵循一致的设计规范

---

## 🔍 当前问题分析

### 1. 左侧商品分类树
- ❌ 分类标题与商品项的视觉区分不够明显
- ❌ 选中状态的高亮效果较弱
- ❌ 库存/挂单状态指示点太小，不够醒目
- ❌ 滚动区域缺乏视觉边界提示

### 2. 中间主内容区
- ❌ 商品头部区域缺乏视觉焦点
- ❌ 产业链导航的图标按钮过于紧凑
- ❌ 价格信息卡片缺乏视觉差异化
- ❌ 销售排行榜的进度条颜色单调
- ❌ 相关建筑区域的图标悬停效果不够明显

### 3. 右侧交易面板
- ❌ 市场挂单的买卖方向区分不够直观
- ❌ 成交记录的时间戳可读性差
- ❌ 下单表单的输入框缺乏视觉引导
- ❌ 总价显示区域不够突出

### 4. 整体布局
- ❌ 三栏之间的间距不够一致
- ❌ 卡片之间的垂直间距过于紧凑
- ❌ 缺乏统一的圆角和阴影规范

---

## ✨ 优化方案详解

### 1. 左侧商品分类树优化

#### 1.1 分类标题样式增强
```tsx
// 优化前
<button className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] rounded-lg">

// 优化后
<button className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] rounded-xl transition-all duration-200 group">
  <div className="flex items-center gap-2.5">
    <span className={`w-2.5 h-2.5 rounded-full ${categoryConfig.color} shadow-sm`}></span>
    <span className="group-hover:translate-x-0.5 transition-transform">{categoryConfig.name}</span>
  </div>
```

#### 1.2 商品项选中状态增强
```tsx
// 优化后的选中状态
<button className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all duration-200 ${
  selectedGoodsId === g.id
    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent)]/30 scale-[1.02]'
    : 'hover:bg-[var(--bg-muted)] text-[var(--text-primary)] hover:translate-x-1'
}`}>
```

#### 1.3 状态指示点优化
```tsx
// 优化后的状态指示
<span className={`w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-[var(--bg-surface)] ${
  hasStock ? 'bg-green-400 ring-green-400/30 animate-pulse' : 
  hasOrders ? 'bg-yellow-400 ring-yellow-400/30' : 
  'bg-gray-500 ring-gray-500/20'
}`}></span>
```

#### 1.4 滚动区域视觉边界
```tsx
// 添加渐变遮罩效果
<div className="flex-1 overflow-y-auto scrollbar-thin p-2 relative">
  <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[var(--bg-surface)] to-transparent pointer-events-none z-10"></div>
  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[var(--bg-surface)] to-transparent pointer-events-none z-10"></div>
  {/* 内容 */}
</div>
```

---

### 2. 商品头部区域优化

#### 2.1 增强商品图标展示
```tsx
// 优化后
<div className="flex items-center gap-5 p-4 bg-gradient-to-r from-[var(--bg-elevated)] to-transparent rounded-2xl border border-[var(--border-muted)]">
  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 flex items-center justify-center shadow-lg shadow-[var(--accent)]/10 border border-[var(--accent)]/20">
    <GoodsIcon goodsId={selectedGoodsId} size={40} autoColor />
  </div>
  <div className="flex-1">
    <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{selectedGoods.name}</h2>
    <div className="flex gap-2 mt-2">
      <Badge className={`${CATEGORY_CONFIG[selectedGoods.category].color} shadow-sm`}>
        {CATEGORY_CONFIG[selectedGoods.category].name}
      </Badge>
      <Badge variant="outline" className="border-[var(--border-strong)]">{selectedGoods.unit}</Badge>
    </div>
  </div>
</div>
```

---

### 3. 产业链导航优化

#### 3.1 上下游商品卡片增强
```tsx
// 优化后的产业链卡片
<Card variant="game" padding="md" className="relative overflow-hidden">
  {/* 背景装饰 */}
  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full"></div>
  
  <h3 className="text-sm font-semibold mb-3 text-amber-400 flex items-center gap-2">
    <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">⬆</span>
    上一级（原料）
  </h3>
  
  {upstreamGoods.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {upstreamGoods.slice(0, 10).map((item) => (
        <button
          key={item.goodsId}
          className="group relative w-14 h-12 rounded-xl bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-surface)] hover:from-amber-500/20 hover:to-amber-500/10 border border-transparent hover:border-amber-500/40 transition-all duration-300 flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:shadow-amber-500/10 hover:scale-105"
          onClick={() => setSelectedGoodsId(item.goodsId)}
        >
          <GoodsIcon goodsId={item.goodsId} size={20} autoColor />
          <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{item.name}</span>
        </button>
      ))}
    </div>
  ) : (
    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
      <span className="text-lg">🌱</span>
      <span>原始资源，无需原料</span>
    </div>
  )}
</Card>
```

---

### 4. 价格信息区域优化

#### 4.1 StatWidget 样式增强
```tsx
// 使用不同的变体和状态来区分价格类型
<div className="grid grid-cols-4 gap-4">
  <StatWidget
    title="最新成交价"
    value={lastTradePrice !== null ? `¥${lastTradePrice.toFixed(2)}` : '暂无成交'}
    change={lastTradePrice && selectedGoods ? (lastTradePrice / selectedGoods.basePrice - 1) : undefined}
    icon="💰"
    variant="game"
    status={lastTradePrice && lastTradePrice > selectedGoods.basePrice ? 'success' : 'error'}
    glow
  />
  <StatWidget
    title="市场均衡价"
    value={`¥${currentPrice.toFixed(2)}`}
    change={selectedGoods ? (currentPrice / selectedGoods.basePrice - 1) : undefined}
    icon="📊"
    variant="elevated"
  />
  <StatWidget
    title="参考价格"
    value={`¥${selectedGoods.basePrice.toFixed(2)}`}
    icon="📌"
    variant="default"
    className="border-dashed"
  />
  <StatWidget
    title="我的库存"
    value={playerStock.toFixed(0)}
    icon="📦"
    variant="elevated"
    status={playerStock > 0 ? 'success' : 'none'}
    suffix={selectedGoods.unit}
  />
</div>
```

---

### 5. 销售排行榜优化

#### 5.1 进度条渐变效果
```tsx
// 优化后的进度条
<div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
  <div
    className={`h-full rounded-full transition-all duration-500 ${
      r.companyId === 0 
        ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]' 
        : 'bg-gradient-to-r from-[var(--success)] to-emerald-400'
    }`}
    style={{ width: `${r.share}%` }}
  />
</div>
```

#### 5.2 排名徽章增强
```tsx
// 前三名使用特殊样式
<Badge
  variant={idx === 0 ? 'gold' : idx === 1 ? 'outline' : idx === 2 ? 'warning' : 'outline'}
  size="sm"
  glow={idx === 0}
  className={idx === 0 ? 'animate-pulse' : ''}
>
  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
</Badge>
```

---

### 6. 右侧交易面板优化

#### 6.1 市场挂单区域增强
```tsx
// 优化后的挂单列表
<Card variant="game" padding="md" className="relative">
  {/* 顶部装饰线 */}
  <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent"></div>
  
  <div className="flex items-center justify-between mb-4">
    <CardTitle className="text-sm flex items-center gap-2">
      <span className="w-6 h-6 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">📋</span>
      市场挂单
    </CardTitle>
  </div>
  
  {/* 卖方报价 - 红色主题 */}
  <div className="mb-4 p-3 rounded-xl bg-[var(--error)]/5 border border-[var(--error)]/20">
    <p className="text-xs text-[var(--error)] mb-2 font-semibold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)] animate-pulse"></span>
      卖方报价 (点击买入)
    </p>
    {/* 订单列表 */}
  </div>
  
  {/* 买方报价 - 绿色主题 */}
  <div className="p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
    <p className="text-xs text-[var(--success)] mb-2 font-semibold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>
      买方报价 (点击卖出)
    </p>
    {/* 订单列表 */}
  </div>
</Card>
```

#### 6.2 下单表单优化
```tsx
// 优化后的下单区域
<Card variant="glow" padding="md" className="border-[var(--accent)]/30">
  <CardTitle className="text-sm mb-4 flex items-center gap-2">
    <span className="w-6 h-6 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">🛒</span>
    自定义下单
  </CardTitle>
  
  {/* 买卖切换 - 更明显的视觉区分 */}
  <div className="flex gap-2 mb-4 p-1 bg-[var(--bg-muted)] rounded-xl">
    <Button
      variant={tradeType === 'buy' ? 'success' : 'ghost'}
      size="sm"
      className={`flex-1 ${tradeType === 'buy' ? 'shadow-md shadow-[var(--success)]/30' : ''}`}
      onClick={() => setTradeType('buy')}
    >
      <span className="mr-1">📈</span> 买入
    </Button>
    <Button
      variant={tradeType === 'sell' ? 'danger' : 'ghost'}
      size="sm"
      className={`flex-1 ${tradeType === 'sell' ? 'shadow-md shadow-[var(--error)]/30' : ''}`}
      onClick={() => setTradeType('sell')}
    >
      <span className="mr-1">📉</span> 卖出
    </Button>
  </div>
  
  {/* 总价显示 - 更突出 */}
  <div className={`flex justify-between text-sm mb-4 p-3 rounded-xl border-2 ${
    tradeType === 'buy' 
      ? 'bg-[var(--success)]/5 border-[var(--success)]/30' 
      : 'bg-[var(--error)]/5 border-[var(--error)]/30'
  }`}>
    <span className="text-[var(--text-muted)] font-medium">总价</span>
    <span className={`tabular-nums font-bold text-lg ${
      tradeType === 'buy' ? 'text-[var(--success)]' : 'text-[var(--error)]'
    }`}>
      ¥{totalCost.toFixed(2)}
    </span>
  </div>
</Card>
```

---

### 7. 相关建筑区域优化

#### 7.1 建筑图标卡片增强
```tsx
// 优化后的建筑图标
<div
  className={`group relative w-14 h-12 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
    hasBuilding 
      ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 shadow-md shadow-green-500/10' 
      : 'bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-surface)] border border-transparent hover:border-[var(--border-strong)]'
  } hover:scale-110 hover:shadow-lg`}
  onClick={() => hasBuilding ? navigateToBuilding(playerBuildings[0].buildingIndex) : null}
>
  <BuildingIcon buildingId={item.building!.id} size={20} autoColor />
  <span className="text-[10px] truncate w-full text-center px-1 mt-0.5 font-medium">{item.building?.name}</span>
  
  {/* 拥有数量徽章 */}
  {hasBuilding && (
    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-[10px] text-white flex items-center justify-center font-bold shadow-md shadow-green-500/30 ring-2 ring-[var(--bg-surface)]">
      {playerBuildings.length}
    </span>
  )}
</div>
```

---

### 8. 整体布局和间距优化

#### 8.1 统一间距规范
```tsx
// 主容器
<div className="min-h-[calc(100vh-80px)] flex gap-5 p-1">
  {/* 左侧栏 */}
  <div className="w-52 flex-shrink-0 ...">
  
  {/* 主内容区 */}
  <div className="flex-1 space-y-5">
  
  {/* 右侧栏 */}
  <div className="w-80 flex-shrink-0 flex flex-col gap-4">
</div>
```

#### 8.2 卡片圆角统一
- 大卡片：`rounded-2xl`
- 中卡片：`rounded-xl`
- 小元素：`rounded-lg`
- 按钮/徽章：`rounded-md` 或 `rounded-full`

#### 8.3 阴影层级
- 基础卡片：`shadow-card`
- 悬浮卡片：`shadow-card-hover`
- 弹出层：`shadow-modal`
- 发光效果：`shadow-glow-blue`

---

## 📐 设计规范总结

### 颜色使用
| 用途 | 颜色变量 |
|------|----------|
| 主强调色 | `var(--accent)` #3B82F6 |
| 成功/买入 | `var(--success)` #22C55E |
| 错误/卖出 | `var(--error)` #EF4444 |
| 警告 | `var(--warning)` #F59E0B |
| 上游原料 | amber-400/500 |
| 下游产品 | green-400/500 |

### 间距规范
| 层级 | 间距值 |
|------|--------|
| 组件内部 | 8px (p-2) |
| 卡片内边距 | 16px (p-4) |
| 卡片间距 | 16-20px (gap-4/5) |
| 区块间距 | 20-24px (gap-5/6) |

### 字体规范
| 用途 | 大小 | 权重 |
|------|------|------|
| 页面标题 | text-2xl | font-bold |
| 卡片标题 | text-sm | font-semibold |
| 正文 | text-sm | font-normal |
| 辅助文字 | text-xs | font-normal |
| 数值 | text-lg/xl | font-bold + tabular-nums |

---

## 🔄 实施步骤

1. **第一阶段：基础样式更新**
   - 更新左侧分类树样式
   - 优化商品头部区域
   - 统一间距和圆角

2. **第二阶段：卡片组件优化**
   - 增强产业链导航卡片
   - 优化价格信息展示
   - 改进销售排行榜

3. **第三阶段：交易面板优化**
   - 重构市场挂单区域
   - 优化下单表单
   - 增强成交记录展示

4. **第四阶段：细节打磨**
   - 添加微交互动画
   - 优化悬停效果
   - 完善响应式适配

---

## 📊 预期效果

优化后的界面将具有：
- ✅ 更清晰的视觉层次
- ✅ 更现代的卡片样式
- ✅ 更直观的状态指示
- ✅ 更流畅的交互体验
- ✅ 更一致的设计语言